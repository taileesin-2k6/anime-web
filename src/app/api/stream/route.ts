import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const RCLONE_HTTP_URL = 'http://127.0.0.1:8088';

function resolveFilename(request: NextRequest): string {
  const gdriveId = request.nextUrl.searchParams.get('gdriveId') || request.nextUrl.searchParams.get('id');
  const filePathParam = request.nextUrl.searchParams.get('file');
  const slug = request.nextUrl.searchParams.get('slug');
  const ep = request.nextUrl.searchParams.get('ep');

  let targetFilename = filePathParam || '';

  if (!targetFilename && (gdriveId || (slug && ep))) {
    try {
      const animeJsonPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'anime.json');
      if (fs.existsSync(/*turbopackIgnore: true*/ animeJsonPath)) {
        const animeList = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ animeJsonPath, 'utf-8'));
        for (const a of animeList) {
          if (slug && a.slug !== slug && a.id !== slug) continue;
          for (const item of a.episodes || []) {
            if (gdriveId && (item.gdriveId === gdriveId || (item.videoUrl && item.videoUrl.includes(gdriveId)))) {
              targetFilename = item.filename || `${a.slug?.split('-')[0] || 'anime'}_ep${String(item.episodeNumber).padStart(2, '0')}_bilingual.mp4`;
              break;
            }
            if (ep && item.episodeNumber === parseInt(ep, 10)) {
              targetFilename = item.filename || `${a.slug?.split('-')[0] || 'anime'}_ep${String(item.episodeNumber).padStart(2, '0')}_bilingual.mp4`;
              break;
            }
          }
          if (targetFilename) break;
        }
      }
    } catch (err) {
      console.warn('Error finding filename from anime.json:', err);
    }
  }

  return targetFilename;
}

export async function HEAD(request: NextRequest) {
  const targetFilename = resolveFilename(request);
  if (!targetFilename) {
    return new NextResponse(null, { status: 404 });
  }

  const cleanName = path.basename(targetFilename);
  const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;

  try {
    const res = await fetch(rcloneFileUrl, { method: 'HEAD' });
    const responseHeaders = new Headers();
    ['content-type', 'content-length', 'accept-ranges', 'last-modified', 'etag'].forEach((key) => {
      const v = res.headers.get(key);
      if (v) responseHeaders.set(key, v);
    });
    if (!responseHeaders.has('Content-Type')) responseHeaders.set('Content-Type', 'video/mp4');
    if (!responseHeaders.has('Accept-Ranges')) responseHeaders.set('Accept-Ranges', 'bytes');

    return new NextResponse(null, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const targetFilename = resolveFilename(request);

  if (targetFilename) {
    const cleanName = path.basename(targetFilename);
    const rcloneFileUrl = `${RCLONE_HTTP_URL}/${encodeURIComponent(cleanName)}`;
    
    try {
      const range = request.headers.get('range');
      const fetchHeaders: Record<string, string> = {};
      if (range) {
        fetchHeaders['Range'] = range;
      }

      const res = await fetch(rcloneFileUrl, {
        headers: fetchHeaders,
      });

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

        return new NextResponse(res.body, {
          status: res.status,
          headers: responseHeaders,
        });
      }
    } catch (err: any) {
      console.warn('Rclone stream fetch error, falling back:', err.message);
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
