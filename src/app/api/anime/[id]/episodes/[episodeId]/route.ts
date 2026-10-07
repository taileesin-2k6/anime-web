import { NextResponse } from 'next/server';
import { getAnimeByIdOrSlug, updateAnime } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; episodeId: string }> }
) {
  try {
    const { id, episodeId } = await params;
    const anime = getAnimeByIdOrSlug(id);

    if (!anime) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy anime' }, { status: 404 });
    }

    const filteredEpisodes = anime.episodes.filter(
      ep => ep.id !== episodeId && ep.episodeNumber.toString() !== episodeId
    );

    const updated = updateAnime(anime.id, { episodes: filteredEpisodes });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('API Delete Episode error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi xoá tập phim' }, { status: 500 });
  }
}
