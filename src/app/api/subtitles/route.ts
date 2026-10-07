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

  const subPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'subtitles', `${slug}_${ep}.json`);
  if (fs.existsSync(/*turbopackIgnore: true*/ subPath)) {
    try {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ subPath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json(data);
    } catch (err: any) {
      console.error('Error reading subtitle file:', err);
    }
  }

  return NextResponse.json({ en: [], vi: [] });
}
