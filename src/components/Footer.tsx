import React from 'react';
import { Film } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800/80 bg-[#0b0d13] text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-white">AniStore • Web Xem Anime Song Ngữ</p>
          </div>
          <p className="text-xs text-gray-500">© 2026 AniStore</p>
        </div>
      </div>
    </footer>
  );
}
