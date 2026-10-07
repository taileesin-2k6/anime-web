'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Film, Search, Home, LogIn, LogOut, BookOpen } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; email: string } | null>(null);

  const syncUserFromStorage = () => {
    try {
      const saved = localStorage.getItem('ani_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    syncUserFromStorage();

    const handleAuthChange = () => {
      syncUserFromStorage();
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ani_user');
    window.dispatchEvent(new Event('auth-changed'));
    setCurrentUser(null);
  };

  const isHome = pathname === '/';
  const isVocab = pathname === '/vocabulary';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0f1117]/95 backdrop-blur-md border-b border-gray-800/80 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-rose-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                  AniStore
                </span>
                <span className="hidden xs:block text-[9px] text-gray-400 -mt-1 tracking-wider uppercase">Anime Song Ngữ</span>
              </div>
            </a>

            {/* Search (Desktop & Tablet) */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-2 md:mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm anime..."
                  className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-gray-900/90 border border-gray-700/70 rounded-full text-xs sm:text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                />
              </div>
            </form>

            {/* Navigation Buttons */}
            <nav className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
              {/* Trang Chủ */}
              <a
                href="/"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                  isHome
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/10'
                    : 'bg-gray-900/90 hover:bg-gray-800 text-gray-200 border border-gray-800'
                }`}
              >
                <Home className={`w-3.5 h-3.5 ${isHome ? 'text-rose-400' : 'text-gray-400'}`} />
                <span>Trang Chủ</span>
              </a>

              {/* Từ Vựng */}
              <a
                href="/vocabulary"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                  isVocab
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/10'
                    : 'bg-gray-900/90 hover:bg-gray-800 text-gray-200 border border-gray-800'
                }`}
                title="Sổ tay từ vựng anime cá nhân"
              >
                <BookOpen className={`w-3.5 h-3.5 ${isVocab ? 'text-amber-400' : 'text-amber-400/90'}`} />
                <span>Từ Vựng</span>
              </a>

              {/* User / Login */}
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-200">
                    <div className="w-5 h-5 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium max-w-[70px] sm:max-w-[120px] truncate">{currentUser.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-1.5 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-gray-800/80 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Mobile Search Bar (Directly below navbar on small phones) */}
        <div className="sm:hidden px-4 pb-2.5 pt-0.5">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm anime..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </>
  );
}
