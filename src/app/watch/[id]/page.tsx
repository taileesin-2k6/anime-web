import React from 'react';
import { notFound } from 'next/navigation';
import { getAnimeByIdOrSlug, getAllAnime } from '@/lib/db';
import WatchClient from './WatchClient';

export function generateStaticParams() {
  const animes = getAllAnime();
  const paths: { id: string }[] = [];
  for (const a of animes) {
    if (a.slug) paths.push({ id: a.slug });
    if (a.id && a.id !== a.slug) paths.push({ id: a.id });
  }
  return paths;
}

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WatchPageProps) {
  const { id } = await params;
  const anime = getAnimeByIdOrSlug(id);
  if (!anime) return { title: 'Không tìm thấy Anime - AniStore' };

  return {
    title: `Xem Phim ${anime.title} - AniStore`,
    description: anime.description || `Xem anime ${anime.title} full HD vietsub online`,
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  const anime = getAnimeByIdOrSlug(id);

  if (!anime) {
    notFound();
  }

  const initialEpNumber = anime.episodes[0]?.episodeNumber || 1;
  return <WatchClient anime={anime} initialEpNumber={initialEpNumber} />;
}
