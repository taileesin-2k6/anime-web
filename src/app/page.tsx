import React from 'react';
import { getAllAnime } from '@/lib/db';
import AnimeCard from '@/components/AnimeCard';
import { Sparkles, PlusCircle, Film, Compass } from 'lucide-react';

interface HomePageProps {
  searchParams: Promise<{ q?: string; genre?: string }>;
}

const ALL_GENRES = [
  'Tất cả',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Romance',
  'Slice of Life',
  'Sci-Fi',
  'Mystery',
  'Horror',
  'Thriller',
  'Supernatural',
  'Psychological',
  'Sports',
  'Isekai',
  'School',
  'Mecha',
  'Music',
  'Historical',
  'Martial Arts',
  'Harem',
  'Ecchi',
];

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q, genre } = await searchParams;
  let animes = getAllAnime();

  if (q) {
    const query = q.toLowerCase();
    animes = animes.filter(
      a =>
        a.title.toLowerCase().includes(query) ||
        (a.originalTitle && a.originalTitle.toLowerCase().includes(query)) ||
        (a.description && a.description.toLowerCase().includes(query))
    );
  }

  if (genre && genre !== 'Tất cả') {
    const targetGenre = genre.toLowerCase();
    animes = animes.filter(a =>
      a.genres && a.genres.some(g => g.toLowerCase() === targetGenre)
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top Banner / Hero */}
      <section className="relative overflow-hidden border-b border-gray-800/60 bg-gradient-to-b from-[#131722] via-[#0f111a] to-[#0b0d13] py-6 sm:py-8">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Web Xem <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">Anime Song Ngữ</span>
              </h1>
            </div>
          </div>

          {/* Genre Filters */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            {ALL_GENRES.map((g) => {
              const isActive = (!genre && g === 'Tất cả') || (genre === g);
              const href = g === 'Tất cả' ? (q ? `/?q=${encodeURIComponent(q)}` : '/') : `/?genre=${encodeURIComponent(g)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

              return (
                <a
                  key={g}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-semibold'
                      : 'bg-gray-900/90 text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-800/80 hover:border-gray-700'
                  }`}
                >
                  {g}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded bg-rose-500" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              {q ? `Kết quả tìm kiếm: "${q}"` : genre && genre !== 'Tất cả' ? `Thể loại: ${genre}` : 'Anime Mới Cập Nhật'}
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {animes.length} bộ phim
          </span>
        </div>

        {animes.length === 0 ? (
          <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/80 flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Film className="w-8 h-8 text-rose-400/80" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              {q || genre ? 'Không tìm thấy anime phù hợp' : 'Chưa có bộ anime nào trong kho'}
            </h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {q || genre
                ? 'Hãy thử tìm kiếm bằng từ khoá khác hoặc chọn lại thể loại.'
                : 'Hiện tại chưa có video nào, vui lòng quay lại sau.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {animes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
