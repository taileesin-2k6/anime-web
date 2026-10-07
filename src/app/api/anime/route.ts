import { NextResponse } from 'next/server';
import { getAllAnime, createAnime } from '@/lib/db';
import { extractGDriveFileId } from '@/lib/gdrive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const genre = searchParams.get('genre')?.toLowerCase() || '';

    let animes = getAllAnime();

    if (query) {
      animes = animes.filter(a =>
        a.title.toLowerCase().includes(query) ||
        (a.originalTitle && a.originalTitle.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
      );
    }

    if (genre) {
      animes = animes.filter(a =>
        a.genres && a.genres.some(g => g.toLowerCase() === genre)
      );
    }

    return NextResponse.json({ success: true, data: animes });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.poster) {
      return NextResponse.json(
        { success: false, message: 'Tên Anime và Link ảnh bìa là bắt buộc' },
        { status: 400 }
      );
    }

    const slug = (body.title || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `anime-${Date.now()}`;

    // Process initial episodes if provided
    const episodes = (body.episodes || []).map((ep: { episodeNumber: number; title?: string; videoUrl: string; duration?: string }, index: number) => ({
      id: (index + 1).toString(),
      episodeNumber: Number(ep.episodeNumber) || (index + 1),
      title: ep.title || `Tập ${index + 1}`,
      videoUrl: ep.videoUrl,
      gdriveId: extractGDriveFileId(ep.videoUrl) || undefined,
      duration: ep.duration || '24:00',
      createdAt: new Date().toISOString(),
    }));

    const newAnime = createAnime({
      title: body.title.trim(),
      originalTitle: body.originalTitle?.trim() || '',
      slug: slug,
      poster: body.poster.trim(),
      banner: body.banner?.trim() || '',
      description: body.description?.trim() || 'Chưa có mô tả.',
      genres: Array.isArray(body.genres) ? body.genres : (body.genres || '').split(',').map((g: string) => g.trim()).filter(Boolean),
      status: body.status || 'Đang chiếu',
      year: Number(body.year) || new Date().getFullYear(),
      totalEpisodes: body.totalEpisodes || '??',
      quality: body.quality || 'FHD 1080p',
      season: body.season || 'Mùa hiện tại',
      episodes: episodes,
    });

    return NextResponse.json({ success: true, data: newAnime }, { status: 201 });
  } catch (error) {
    console.error('API POST Error:', error);
    return NextResponse.json({ success: false, message: 'Không thể thêm anime' }, { status: 500 });
  }
}
