import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getValidAccessToken } from '@/lib/gdrive-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RCLONE_HTTP_URL = 'http://127.0.0.1:8088';

function resolveMediaInfo(request: NextRequest): { targetFilename: string; gdriveId: string } {
  const gdriveIdParam = request.nextUrl.searchParams.get('gdriveId') || request.nextUrl.searchParams.get('id');
  const filePathParam = request.nextUrl.searchParams.get('file');
  const slug = request.nextUrl.searchParams.get('slug');
  const ep = request.nextUrl.searchParams.get('ep');

  let targetFilename = filePathParam || '';
  let gdriveId = gdriveIdParam || '';

  if ((!targetFilename || !gdriveId) && (slug || ep || gdriveIdParam)) {
    try {
      const animeJsonPath = path.join(process.cwd(), 'data', 'anime.json');
      if (fs.existsSync(animeJsonPath)) {
        const animeList = JSON.parse(fs.readFileSync(animeJsonPath, 'utf-8'));
        for (const a of animeList) {
          if (slug && a.slug !== slug && a.id !== slug) continue;
          for (const item of a.episodes || []) {
            if (gdriveIdParam && (item.gdriveId === gdriveIdParam || (item.videoUrl && item.videoUrl.includes(gdriveIdParam)))) {
              targetFilename = targetFilename || item.filename || '';
              gdriveId = gdriveId || item.gdriveId || '';
              break;
            }
            const isChitoseEp2Alias = slug === 'chitose-kun-wa-ramune-bin-no-naka' && ep === '2' && item.episodeNumber === 15;
            if (ep && (item.episodeNumber === parseInt(ep, 10) || isChitoseEp2Alias)) {
              targetFilename = targetFilename || item.filename || '';
              gdriveId = gdriveId || item.gdriveId || '';
              break;
            }
          }
          if (targetFilename && gdriveId) break;
        }
      }
    } catch (err) {
      console.warn('Error finding media info from anime.json:', err);
    }
  }

  return { targetFilename, gdriveId };
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
  const { targetFilename, gdriveId } = resolveMediaInfo(request);
  const isVercel = Boolean(process.env.VERCEL);

  // 1. Try rclone first if targetFilename is given (and not running on Vercel)
  if (targetFilename && !isVercel) {
    const cleanName = path.basename(targetFilename);
    const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
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

  // 2. Authenticated Google Drive API v3 probe (for Vercel Cloud or when Rclone is offline)
  if (gdriveId) {
    try {
      const accessToken = await getValidAccessToken();
      if (accessToken) {
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${gdriveId}?alt=media&supportsAllDrives=true`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(driveApiUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Range: 'bytes=0-0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok || res.status === 206) {
          const responseHeaders = new Headers();
          responseHeaders.set('Content-Type', 'video/mp4');
          responseHeaders.set('Accept-Ranges', 'bytes');
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
          responseHeaders.set(
            'Cache-Control',
            'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
          );
          responseHeaders.set('CDN-Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
          responseHeaders.set('Vercel-CDN-Cache-Control', 'public, max-age=31536000, s-maxage=31536000');

          const cr = res.headers.get('content-range');
          if (cr) {
            const total = cr.split('/')[1];
            if (total) responseHeaders.set('Content-Length', total);
          }

          return new NextResponse(null, {
            status: 200,
            headers: responseHeaders,
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback to Google Drive direct
  if (gdriveId) {
    const gdriveDirectUrl = `https://drive.usercontent.google.com/download?id=${gdriveId}&export=download&confirm=t`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(gdriveDirectUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html') && (res.ok || res.status === 206)) {
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'video/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
        const cl = res.headers.get('content-length');
        if (cl) responseHeaders.set('Content-Length', cl);

        return new NextResponse(null, {
          status: 200,
          headers: responseHeaders,
        });
      }
    } catch {
      // ignore
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
  const { targetFilename, gdriveId } = resolveMediaInfo(request);
  const isVercel = Boolean(process.env.VERCEL);

  // 1. Try local authenticated Rclone HTTP server first (Used by Cloudflare Tunnel / Local host only, not Vercel)
  if (targetFilename && !isVercel) {
    const cleanName = path.basename(targetFilename);
    const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
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

        return new NextResponse(res.body, {
          status: res.status,
          headers: responseHeaders,
        });
      }
    } catch (err: any) {
      console.warn('Rclone stream fetch error, falling back:', err.message);
    }
  }

  // 2. Try Authenticated Google Drive API v3 (Used by Vercel Cloud or when local Rclone is offline)
  if (gdriveId) {
    try {
      const accessToken = await getValidAccessToken();
      if (accessToken) {
        const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${gdriveId}?alt=media&supportsAllDrives=true`;
        const range = request.headers.get('range');
        const apiHeaders: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
        };

        // Smart Capped Range Chunking (RFC 7233)
        // If client requests open-ended range (e.g. bytes=0-), cap to 8MB chunk for instant buffering & Edge CDN caching
        const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB optimal chunk
        if (range) {
          const match = range.match(/bytes=(\d+)-(\d*)/);
          if (match) {
            const start = parseInt(match[1], 10);
            if (match[2]) {
              const end = parseInt(match[2], 10);
              apiHeaders['Range'] = `bytes=${start}-${end}`;
            } else {
              apiHeaders['Range'] = `bytes=${start}-${start + CHUNK_SIZE - 1}`;
            }
          } else {
            apiHeaders['Range'] = range;
          }
        } else {
          apiHeaders['Range'] = `bytes=0-${CHUNK_SIZE - 1}`;
        }

        const apiRes = await fetch(driveApiUrl, {
          headers: apiHeaders,
        });

        const contentType = apiRes.headers.get('content-type') || '';
        if ((apiRes.ok || apiRes.status === 206) && !contentType.includes('text/html') && !contentType.includes('json')) {
          const responseHeaders = new Headers();
          const passthroughHeaders = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
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
          if (!responseHeaders.has('Accept-Ranges')) {
            responseHeaders.set('Accept-Ranges', 'bytes');
          }
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');

          // Enable persistent Edge CDN caching across Vercel nodes worldwide
          responseHeaders.set(
            'Cache-Control',
            'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable'
          );
          responseHeaders.set('CDN-Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
          responseHeaders.set('Vercel-CDN-Cache-Control', 'public, max-age=31536000, s-maxage=31536000');

          return new NextResponse(apiRes.body, {
            status: apiRes.status,
            headers: responseHeaders,
          });
        }
      }
    } catch (err: any) {
      console.warn('Google Drive API v3 stream error, falling back to direct download:', err.message);
    }
  }

  // 3. Fallback to unauthenticated Google Drive direct link
  if (gdriveId) {
    const gdriveDirectUrl = `https://drive.usercontent.google.com/download?id=${gdriveId}&export=download&confirm=t`;
    try {
      const range = request.headers.get('range');
      const fetchHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (range) {
        fetchHeaders['Range'] = range;
      }

      const res = await fetch(gdriveDirectUrl, {
        headers: fetchHeaders,
      });

      const contentType = res.headers.get('content-type') || '';
      // Guard against quota exceeded HTML page returned by Google Drive with HTTP 200
      if (contentType.includes('text/html')) {
        console.warn('Google Drive direct download returned HTML (quota exceeded / confirmation page).');
        return new NextResponse(
          'Google Drive direct download quota exceeded. Please use the local Cloudflare tunnel / Rclone stream.',
          {
            status: 429,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      if (res.ok || res.status === 206) {
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'video/mp4');
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');

        const cl = res.headers.get('content-length');
        if (cl) responseHeaders.set('Content-Length', cl);

        const cr = res.headers.get('content-range');
        if (cr) responseHeaders.set('Content-Range', cr);

        const etag = res.headers.get('etag');
        if (etag) responseHeaders.set('ETag', etag);

        const lastMod = res.headers.get('last-modified');
        if (lastMod) responseHeaders.set('Last-Modified', lastMod);

        responseHeaders.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(res.body, {
          status: res.status,
          headers: responseHeaders,
        });
      }
    } catch (err: any) {
      console.warn('Error fetching stream from Google Drive:', err);
    }
  }

  // Local fallback
  const filePathParam = request.nextUrl.searchParams.get('file');
  if (filePathParam) {
    let resolvedPath = filePathParam;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.join(/*turbopackIgnore: true*/ process.cwd(), resolvedPath);
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

  return new NextResponse('Video stream not available', { status: 404 });
}
