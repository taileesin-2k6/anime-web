import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getValidAccessToken } from '@/lib/gdrive-auth';
import { getAllAnime } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RCLONE_HTTP_URL = 'http://127.0.0.1:8088';
const fileSizeCache = new Map<string, string>();

function resolveMediaInfo(request: NextRequest): { targetFilename: string; gdriveId: string; backupId: string } {
  const gdriveIdParam = request.nextUrl.searchParams.get('gdriveId') || request.nextUrl.searchParams.get('id');
  const backupIdParam = request.nextUrl.searchParams.get('backupId');
  const filePathParam = request.nextUrl.searchParams.get('file');

  let targetFilename = filePathParam || '';
  let gdriveId = gdriveIdParam || '';
  let backupId = backupIdParam || '';

  // Fast path: If both IDs are present in query params, return immediately!
  if (gdriveId && backupId) {
    return { targetFilename, gdriveId, backupId };
  }

  const slug = request.nextUrl.searchParams.get('slug');
  const ep = request.nextUrl.searchParams.get('ep');

  if (slug || ep) {
    try {
      const animeList = getAllAnime();
      for (const a of animeList) {
        if (slug && a.slug !== slug && a.id !== slug) continue;
        for (const item of a.episodes || []) {
          const isChitoseEp2Alias = slug === 'chitose-kun-wa-ramune-bin-no-naka' && ep === '2' && item.episodeNumber === 15;
          if (ep && (item.episodeNumber === parseInt(ep, 10) || isChitoseEp2Alias)) {
            targetFilename = targetFilename || item.filename || '';
            gdriveId = gdriveId || item.gdriveId || '';
            backupId = backupId || item.backupId || '';
            break;
          }
        }
        if (gdriveId && backupId) break;
      }
    } catch (err) {
      console.warn('Error resolving media info:', err);
    }
  }

  return { targetFilename, gdriveId, backupId };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function HEAD(request: NextRequest) {
  const { targetFilename, gdriveId, backupId } = resolveMediaInfo(request);
  const isCloud = Boolean(
    process.env.CF_PAGES ||
    process.env.CLOUDFLARE ||
    process.env.VERCEL ||
    process.env.NODE_ENV === 'production'
  );

  // 1. Try local Rclone only when developing on local laptop (never in cloud/production)
  if (targetFilename && !isCloud) {
    const cleanName = path.basename(targetFilename);
    const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(rcloneFileUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const responseHeaders = new Headers();
        ['content-type', 'content-length', 'accept-ranges', 'last-modified', 'etag'].forEach((key) => {
          const v = res.headers.get(key);
          if (v) responseHeaders.set(key, v);
        });
        if (!responseHeaders.has('Content-Type')) responseHeaders.set('Content-Type', 'video/mp4');
        if (!responseHeaders.has('Accept-Ranges')) responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');

        return new NextResponse(null, {
          status: res.status,
          headers: responseHeaders,
        });
      }
    } catch {
      // Fallback
    }
  }

  // 2. Authenticated Google Drive metadata probe (lightweight JSON query)
  const candidateIds = [gdriveId, backupId].filter(Boolean);
  for (const driveId of candidateIds) {
    const cachedSize = fileSizeCache.get(driveId);
    if (cachedSize) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Length': cachedSize,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    try {
      const accessToken = await getValidAccessToken();
      if (accessToken) {
        const metaUrl = `https://www.googleapis.com/drive/v3/files/${driveId}?fields=size,mimeType&supportsAllDrives=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as { size?: string; mimeType?: string };
          if (data.size) {
            fileSizeCache.set(driveId, data.size);
            return new NextResponse(null, {
              status: 200,
              headers: {
                'Content-Type': data.mimeType || 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Content-Length': data.size,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const { targetFilename, gdriveId, backupId } = resolveMediaInfo(request);
  const isCloud = Boolean(
    process.env.CF_PAGES ||
    process.env.CLOUDFLARE ||
    process.env.VERCEL ||
    process.env.NODE_ENV === 'production'
  );

  // 1. Try local authenticated Rclone HTTP server only on local laptop development
  if (targetFilename && !isCloud) {
    const cleanName = path.basename(targetFilename);
    const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const range = request.headers.get('range');
      const fetchHeaders: Record<string, string> = {};
      if (range) {
        fetchHeaders['Range'] = range;
      }

      const res = await fetch(rcloneFileUrl, {
        headers: fetchHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok || res.status === 206) {
        const responseHeaders = new Headers();
        const passthroughHeaders = [
          'content-type',
          'content-length',
          'content-range',
          'accept-ranges',
          'cache-control',
          'last-modified',
          'etag',
        ];

        res.headers.forEach((val, key) => {
          if (passthroughHeaders.includes(key.toLowerCase())) {
            responseHeaders.set(key, val);
          }
        });

        if (!responseHeaders.has('Content-Type')) {
          responseHeaders.set('Content-Type', 'video/mp4');
        }
        if (!responseHeaders.has('Accept-Ranges')) {
          responseHeaders.set('Accept-Ranges', 'bytes');
        }
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');

        return new Response(res.body, {
          status: res.status,
          headers: responseHeaders,
        });
      }
    } catch (err: any) {
      console.warn('Rclone stream fetch error, falling back:', err.message);
    }
  }

  // 2. Google Drive Streaming with Smart 8MB Capped Chunking (RFC 7233)
  // Provides 35s smooth buffer in browser while preventing subrequest timeouts and premature stream cuts
  const candidateIds = [gdriveId, backupId].filter(Boolean);
  if (candidateIds.length > 0) {
    const rawRange = request.headers.get('range');
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB optimal chunk size

    let start = 0;
    let end: number | null = null;

    if (rawRange) {
      const match = rawRange.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          const requestedEnd = parseInt(match[2], 10);
          // If browser requested a huge range (> 12MB), cap to 8MB chunk for safe delivery
          if (requestedEnd - start > 12 * 1024 * 1024) {
            end = start + CHUNK_SIZE - 1;
          } else {
            end = requestedEnd;
          }
        } else {
          // Open-ended range (bytes=start-) -> cap to 8MB chunk
          end = start + CHUNK_SIZE - 1;
        }
      }
    } else {
      end = CHUNK_SIZE - 1;
    }

    const driveRangeHeader = end !== null ? `bytes=${start}-${end}` : `bytes=${start}-`;

    for (const driveId of candidateIds) {
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) continue;

        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media&supportsAllDrives=true`;
        const apiHeaders: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          Range: driveRangeHeader,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const apiRes = await fetch(driveApiUrl, {
          headers: apiHeaders,
          signal: controller.signal,
          // @ts-ignore
          cf: {
            cacheEverything: true,
            cacheTtl: 86400,
          },
        });
        clearTimeout(timeout);

        const contentType = apiRes.headers.get('content-type') || '';
        // If quota exceeded or error, Google returns HTML or JSON
        if (
          (apiRes.ok || apiRes.status === 206) &&
          !contentType.includes('text/html') &&
          !contentType.includes('json')
        ) {
          const responseHeaders = new Headers();
          const passthroughHeaders = [
            'content-type',
            'content-length',
            'content-range',
            'last-modified',
            'etag',
          ];

          apiRes.headers.forEach((val, key) => {
            if (passthroughHeaders.includes(key.toLowerCase())) {
              responseHeaders.set(key, val);
            }
          });

          if (!responseHeaders.has('Content-Type')) {
            responseHeaders.set('Content-Type', 'video/mp4');
          }
          responseHeaders.set('Accept-Ranges', 'bytes');
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');

          // Edge Caching headers
          responseHeaders.set(
            'Cache-Control',
            'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
          );
          responseHeaders.set('CDN-Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
          responseHeaders.set('X-Active-Drive', driveId === gdriveId ? 'primary' : 'backup');

          return new Response(apiRes.body, {
            status: apiRes.status,
            headers: responseHeaders,
          });
        } else {
          console.warn(`Drive ID ${driveId} returned status ${apiRes.status} (${contentType}), trying next candidate...`);
        }
      } catch (driveErr: any) {
        console.warn(`Drive ID ${driveId} fetch error (${driveErr.message}), failing over...`);
      }
    }

    // 3. Fallback to unauthenticated Google Drive direct link
    for (const driveId of candidateIds) {
      const gdriveDirectUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`;
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Range: driveRangeHeader,
        };

        const res = await fetch(gdriveDirectUrl, {
          headers: fetchHeaders,
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('json') && (res.ok || res.status === 206)) {
          const responseHeaders = new Headers();
          responseHeaders.set('Content-Type', 'video/mp4');
          responseHeaders.set('Accept-Ranges', 'bytes');
          const cl = res.headers.get('content-length');
          if (cl) responseHeaders.set('Content-Length', cl);
          const cr = res.headers.get('content-range');
          if (cr) responseHeaders.set('Content-Range', cr);
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
          responseHeaders.set('Cache-Control', 'public, max-age=3600');
          responseHeaders.set('X-Active-Drive', 'direct-download');

          return new Response(res.body, {
            status: res.status,
            headers: responseHeaders,
          });
        }
      } catch (err: any) {
        console.warn('Direct Google Drive stream fetch error:', err.message);
      }
    }
  }

  // 4. Local disk fallback (if on local dev)
  const filePathParam = request.nextUrl.searchParams.get('file') || targetFilename;
  if (filePathParam) {
    try {
      let resolvedPath = filePathParam;
      if (typeof fs !== 'undefined' && fs.existsSync) {
        if (!fs.existsSync(/*turbopackIgnore: true*/ resolvedPath)) {
          const rel = filePathParam.replace(/^\/+/, '');
          const pPublic = path.join(process.cwd(), 'public', rel);
          const pVideos = path.join(process.cwd(), 'public', 'videos', rel);
          if (fs.existsSync(/*turbopackIgnore: true*/ pPublic)) {
            resolvedPath = pPublic;
          } else if (fs.existsSync(/*turbopackIgnore: true*/ pVideos)) {
            resolvedPath = pVideos;
          }
        }
        resolvedPath = path.normalize(resolvedPath);

        if (fs.existsSync(/*turbopackIgnore: true*/ resolvedPath)) {
          const stat = fs.statSync(/*turbopackIgnore: true*/ resolvedPath);
          const fileSize = stat.size;
          const range = request.headers.get('range');

          const ext = path.extname(resolvedPath).toLowerCase();
          let contentType = 'video/mp4';
          if (ext === '.mkv') contentType = 'video/x-matroska';
          else if (ext === '.webm') contentType = 'video/webm';

          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;

            const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ resolvedPath, { start, end });
            const head = {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize.toString(),
              'Content-Type': contentType,
            };

            return new NextResponse(fileStream as any, {
              status: 206,
              headers: head,
            });
          }

          const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ resolvedPath);
          const head = {
            'Accept-Ranges': 'bytes',
            'Content-Length': fileSize.toString(),
            'Content-Type': contentType,
          };

          return new NextResponse(fileStream as any, {
            status: 200,
            headers: head,
          });
        }
      }
    } catch {
      // Local fallback unavailable
    }
  }

  return new NextResponse('Video stream not available', { status: 404 });
}
