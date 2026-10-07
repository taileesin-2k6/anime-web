import { NextResponse } from 'next/server';
import { getAnimeByIdOrSlug, updateAnime } from '@/lib/db';
import { extractGDriveFileId } from '@/lib/gdrive';
import { Episode } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const anime = getAnimeByIdOrSlug(id);

    if (!anime) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy anime' }, { status: 404 });
    }

    const body = await request.json();

    // Support single episode or array of episodes
    const rawEpisodes = Array.isArray(body) ? body : [body];
    const newEpisodes: Episode[] = [...anime.episodes];

    for (const ep of rawEpisodes) {
      if (!ep.videoUrl) continue;

      const epNumber = Number(ep.episodeNumber) || (newEpisodes.length + 1);
      const existingIdx = newEpisodes.findIndex(e => e.episodeNumber === epNumber);

      const episodeObj: Episode = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        episodeNumber: epNumber,
        title: ep.title || `Tập ${epNumber}`,
        videoUrl: ep.videoUrl.trim(),
        gdriveId: extractGDriveFileId(ep.videoUrl) || undefined,
        duration: ep.duration || '24:00',
        createdAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        newEpisodes[existingIdx] = episodeObj;
      } else {
        newEpisodes.push(episodeObj);
      }
    }

    // Sort by episode number ascending
    newEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    const updated = updateAnime(anime.id, { episodes: newEpisodes });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('API Add Episode error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi thêm tập phim' }, { status: 500 });
  }
}
