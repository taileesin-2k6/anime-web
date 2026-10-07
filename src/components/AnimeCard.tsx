'use client';

import React, { useState } from 'react';
import { Anime } from '@/lib/types';
import { Play, Film } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const [imgError, setImgError] = useState(false);

  const totalEpText = anime.episodes.length > 0
    ? `Tập ${anime.episodes.length}${anime.totalEpisodes && anime.totalEpisodes !== '??' ? `/${anime.totalEpisodes}` : ''}`
    : `${anime.totalEpisodes || '??'} tập`;

  return (
    <a
      href={`/watch/${anime.slug || anime.id}`}
      className="group block relative bg-gray-900/60 rounded-xl overflow-hidden border border-gray-800/80 hover:border-rose-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/30 hover:-translate-y-1"
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-950">
        {!imgError && anime.poster ? (
          <img
            src={anime.poster}
            alt={anime.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 text-gray-600 p-4 text-center">
            <Film className="w-12 h-12 mb-2 text-gray-700" />
            <span className="text-xs font-medium text-gray-500 line-clamp-2">{anime.title}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600/90 text-white backdrop-blur-sm shadow">
            {anime.quality || 'FHD'}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/60 text-gray-200 backdrop-blur-sm border border-white/10">
            {totalEpText}
          </span>
        </div>

        {/* Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom Year / Status */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-gray-300 font-medium">
          <span className="bg-black/50 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
            {anime.year || new Date().getFullYear()}
          </span>
          <span className="text-emerald-400 font-medium text-[10px]">
            {anime.status || 'Đang chiếu'}
          </span>
        </div>
      </div>

      {/* Info Under Poster */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-100 group-hover:text-rose-400 line-clamp-2 transition-colors duration-200 leading-snug">
          {anime.title}
        </h3>
        {anime.originalTitle && (
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {anime.originalTitle}
          </p>
        )}
      </div>
    </a>
  );
}
