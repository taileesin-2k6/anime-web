'use client';

import React, { useState } from 'react';
import { Episode } from '@/lib/types';
import { Play, ListFilter } from 'lucide-react';

interface EpisodeSelectorProps {
  episodes: Episode[];
  currentEpNumber: number;
  animeSlug?: string;
  onSelectEpisode: (epNumber: number) => void;
}

export default function EpisodeSelector({
  episodes,
  currentEpNumber,
  animeSlug = '',
  onSelectEpisode,
}: EpisodeSelectorProps) {
  const [filterQuery, setFilterQuery] = useState('');

  if (!episodes || episodes.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center text-gray-400">
        <p className="text-sm">Chưa có tập phim nào được cập nhật cho bộ anime này.</p>
      </div>
    );
  }

  const filteredEpisodes = episodes.filter(
    (ep) =>
      ep.episodeNumber.toString().includes(filterQuery) ||
      (ep.title && ep.title.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-3.5 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Danh Sách Tập Phim <span className="text-xs font-normal text-gray-400">({episodes.length} tập)</span>
          </h2>
        </div>

        {episodes.length > 12 && (
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Tìm tập (vd: 1, 2)..."
              className="px-3 py-1 text-xs bg-gray-950 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-500 w-36"
            />
          </div>
        )}
      </div>

      {/* Episode Grid */}
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {filteredEpisodes.map((ep) => {
          const isActive = ep.episodeNumber === currentEpNumber;
          const hrefUrl = animeSlug ? `/watch/${animeSlug}?ep=${ep.episodeNumber}` : `?ep=${ep.episodeNumber}`;

          return (
            <a
              key={ep.id || ep.episodeNumber}
              href={hrefUrl}
              onClick={(e) => {
                e.preventDefault();
                onSelectEpisode(ep.episodeNumber);
              }}
              title={ep.title || `Tập ${ep.episodeNumber}`}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-150 relative group cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-lg shadow-rose-600/30 scale-105 ring-2 ring-rose-400'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/50 hover:border-gray-600 active:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-1">
                {isActive && <Play className="w-3 h-3 fill-current" />}
                <span>Tập {ep.episodeNumber}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
