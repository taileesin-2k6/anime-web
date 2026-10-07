'use client';

import React, { useState, useEffect } from 'react';
import { Anime, Episode } from '@/lib/types';
import VideoPlayer from '@/components/VideoPlayer';
import EpisodeSelector from '@/components/EpisodeSelector';
import { Calendar, Layers, Sparkles, Tag, Film, Clock, ChevronRight } from 'lucide-react';

interface WatchClientProps {
  anime: Anime;
  initialEpNumber: number;
}

export default function WatchClient({ anime, initialEpNumber }: WatchClientProps) {
  const [currentEpNum, setCurrentEpNum] = useState<number>(initialEpNumber);
  const [posterSrc, setPosterSrc] = useState<string>(anime.poster);
  const [bannerSrc, setBannerSrc] = useState<string | undefined>(anime.banner);
  const [posterError, setPosterError] = useState<boolean>(false);

  // Sync state if initial changes
  useEffect(() => {
    setCurrentEpNum(initialEpNumber);
    setPosterSrc(anime.poster);
    setBannerSrc(anime.banner);
    setPosterError(false);
  }, [initialEpNumber, anime]);

  const currentEpisode: Episode | undefined =
    anime.episodes.find((e) => e.episodeNumber === currentEpNum) || anime.episodes[0];

  const currentIndex = anime.episodes.findIndex((e) => e.episodeNumber === currentEpNum);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < anime.episodes.length - 1;

  const handleSelectEpisode = (epNum: number) => {
    setCurrentEpNum(epNum);
    const newUrl = `/watch/${anime.slug || anime.id}?ep=${epNum}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  };

  const handlePrev = () => {
    if (hasPrev) {
      handleSelectEpisode(anime.episodes[currentIndex - 1].episodeNumber);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      handleSelectEpisode(anime.episodes[currentIndex + 1].episodeNumber);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="border-b border-gray-800/80 bg-[#0d0f15]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-400 overflow-x-auto whitespace-nowrap">
            <a href="/" className="hover:text-rose-400 transition-colors">
              Trang Chủ
            </a>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            <span className="text-gray-300 font-medium truncate max-w-[160px] sm:max-w-none">
              {anime.title}
            </span>
            {currentEpisode && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                <span className="text-rose-400 font-semibold">Tập {currentEpisode.episodeNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Main Video Player */}
        <section>
          <VideoPlayer
            videoUrl={currentEpisode?.videoUrl}
            title={currentEpisode?.title || `Tập ${currentEpNum}`}
            animeTitle={anime.title}
            episodeNumber={currentEpNum}
            animeSlug={anime.slug || anime.id}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </section>

        {/* Episode Selector */}
        <section>
          <EpisodeSelector
            episodes={anime.episodes}
            currentEpNumber={currentEpNum}
            animeSlug={anime.slug || anime.id}
            onSelectEpisode={handleSelectEpisode}
          />
        </section>

        {/* Anime Information Section */}
        <section className="relative bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden p-4 sm:p-7 shadow-xl">
          {bannerSrc && (
            <div className="absolute inset-0 h-48 sm:h-64 w-full overflow-hidden opacity-20 pointer-events-none">
              <img
                src={bannerSrc}
                alt=""
                className="w-full h-full object-cover filter blur-sm scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/80 to-[#0f1117]" />
            </div>
          )}
          <div className="relative z-10 flex flex-col md:flex-row gap-6">
            {/* Poster Thumbnail */}
            <div className="w-36 sm:w-44 flex-shrink-0 mx-auto md:mx-0">
              <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg border border-gray-700/60 bg-gray-950 flex items-center justify-center">
                {!posterError && posterSrc ? (
                  <img
                    src={posterSrc}
                    alt={anime.title}
                    onError={() => {
                      // If local path failed, try to add cache-buster or fallback
                      if (!posterSrc.includes('?')) {
                        setPosterSrc(`${posterSrc}?t=${Date.now()}`);
                      } else {
                        setPosterError(true);
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center text-gray-500">
                    <Film className="w-10 h-10 mb-2 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-400">{anime.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Meta Details */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {anime.title}
                  </h1>
                  {anime.originalTitle && (
                    <p className="text-sm text-gray-400 mt-1 italic">
                      {anime.originalTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  {anime.quality || 'FHD 1080p'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium">
                  <Calendar className="w-3 h-3" />
                  {anime.year}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                  <Layers className="w-3 h-3" />
                  {anime.status}
                </span>
                {anime.totalEpisodes && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700 text-xs font-medium">
                    <Film className="w-3 h-3" />
                    Tổng: {anime.totalEpisodes} tập
                  </span>
                )}
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-gray-500 mr-1" />
                  {anime.genres.map((g) => (
                    <a
                      key={g}
                      href={`/?genre=${encodeURIComponent(g)}`}
                      className="px-2.5 py-0.5 rounded-md bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                    >
                      {g}
                    </a>
                  ))}
                </div>
              )}

              {/* Description */}
              <div className="pt-2 border-t border-gray-800">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Nội Dung Phim
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                  {anime.description || 'Chưa có tóm tắt cho bộ phim này.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
