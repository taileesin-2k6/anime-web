import React from 'react';
import { notFound } from 'next/navigation';
import { getAnimeByIdOrSlug } from '@/lib/db';
import WatchClient from './WatchClient';

interface WatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const anime = getAnimeByIdOrSlug(id);
  if (!anime) return { title: 'Không tìm thấy Anime - AniStore' };

  return {
    title: `Xem Phim ${anime.title} - AniStore`,
    description: anime.description || `Xem anime ${anime.title} full HD vietsub online`,
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id } = await params;
  const { ep } = await searchParams;
  const anime = getAnimeByIdOrSlug(id);

  if (!anime) {
    notFound();
  }

  let initialEpNumber = ep ? Number(ep) : (anime.episodes[0]?.episodeNumber || 1);
  if (anime.slug === 'chitose-kun-wa-ramune-bin-no-naka' && initialEpNumber === 2 && !anime.episodes.some((e) => e.episodeNumber === 2)) {
    initialEpNumber = 15;
  }

  return <WatchClient anime={anime} initialEpNumber={initialEpNumber} />;
}
