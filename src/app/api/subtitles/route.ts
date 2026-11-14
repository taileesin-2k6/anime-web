import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || '';
  const ep = request.nextUrl.searchParams.get('ep') || '1';

  if (!slug) {
    return NextResponse.json({ en: [], vi: [] });
  }

  // 1. Try public/subtitles
  const pubPath = path.join(process.cwd(), 'public', 'subtitles', `${slug}_${ep}.json`);
  if (typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(pubPath)) {
    try {
      const content = fs.readFileSync(pubPath, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    } catch {}
  }

  // 2. Try data/subtitles
  const subPath = path.join(process.cwd(), 'data', 'subtitles', `${slug}_${ep}.json`);
  if (typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(subPath)) {
    try {
      const content = fs.readFileSync(subPath, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    } catch {}
  }

  // 3. Fallback to asset fetch for Cloudflare Edge / Workers
  try {
    const origin = request.nextUrl.origin;
    const assetRes = await fetch(`${origin}/subtitles/${encodeURIComponent(slug)}_${encodeURIComponent(ep)}.json`);
    if (assetRes.ok) {
      const data = await assetRes.json();
      return NextResponse.json(data);
    }
  } catch {}

  // 4. Ultra-resilient GitHub Raw fallback (zero latency fallback even before Cloudflare rebuilds)
  try {
    const ghRawUrl = `https://raw.githubusercontent.com/taileesin-2k6/anime-web/main/public/subtitles/${encodeURIComponent(slug)}_${encodeURIComponent(ep)}.json`;
    const ghRes = await fetch(ghRawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      // @ts-ignore
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    if (ghRes.ok) {
      const data = await ghRes.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
        },
      });
    }
  } catch {}

  return NextResponse.json({ en: [], vi: [] });
}
