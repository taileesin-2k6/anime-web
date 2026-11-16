'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AniStore Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0b0d13] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#131620] border border-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Đang nạp lại kết nối Cloudflare Edge...
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Kết nối tới luồng phát bị gián đoạn tạm thời. Vui lòng bấm thử lại để tiếp tục xem phim.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Tải lại trang
          </button>

          <a
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold border border-gray-700/60 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Về Trang Chủ
          </a>
        </div>
      </div>
    </div>
  );
}
