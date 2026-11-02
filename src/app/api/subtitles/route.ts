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

  return NextResponse.json({ en: [], vi: [] });
}
