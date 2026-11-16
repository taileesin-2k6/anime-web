'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AniStore Global Error]', error);
  }, [error]);

  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#0b0d13] text-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#131620] border border-gray-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Đang khôi phục phiên xem phim...
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Phiên truyền phát trực tuyến vừa được đồng bộ lại. Nhấn vào nút bên dưới để tải lại ngay.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              Tải lại trang ngay
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
