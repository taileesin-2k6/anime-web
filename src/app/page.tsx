import React, { Suspense } from 'react';
import { getAllAnime } from '@/lib/db';
import HomeClient from './HomeClient';

export const dynamic = 'force-static';
export const revalidate = false;

export default function HomePage() {
  const animes = getAllAnime();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0f15]" />}>
      <HomeClient initialAnimes={animes} />
    </Suspense>
  );
}
