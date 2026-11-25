import React from 'react';
import { Film, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0d13] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#131620] border border-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <Film className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Không tìm thấy trang yêu cầu
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Tập phim hoặc đường dẫn bạn đang tìm kiếm không tồn tại hoặc đã được cập nhật.
          </p>
        </div>

        <div className="flex justify-center">
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Về Trang Chủ
          </a>
        </div>
      </div>
    </div>
  );
}
