'use client';

import React, { useState } from 'react';
import { Sparkles, Search, Bookmark, Volume2, HelpCircle } from 'lucide-react';
import WordLookupModal from './WordLookupModal';
import SavedWordsDrawer from './SavedWordsDrawer';

interface InteractiveSubtitleProps {
  currentSubtitleEn?: string;
  currentSubtitleVi?: string;
  onWordClick?: (word: string, sentence: string) => void;
  onPauseVideo?: () => void;
}

export default function InteractiveSubtitle({
  currentSubtitleEn = '',
  currentSubtitleVi = '',
  onWordClick,
  onPauseVideo,
}: InteractiveSubtitleProps) {
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [selectedSentence, setSelectedSentence] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customWordInput, setCustomWordInput] = useState('');

  const handleLookup = (word: string, sentence: string) => {
    if (!word || !word.trim()) return;
    if (onPauseVideo) {
      onPauseVideo();
    }
    setSelectedWord(word.trim());
    setSelectedSentence(sentence || currentSubtitleEn);
    setModalOpen(true);
    if (onWordClick) {
      onWordClick(word, sentence);
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customWordInput.trim()) {
      handleLookup(customWordInput.trim(), currentSubtitleEn);
      setCustomWordInput('');
    }
  };

  // Split English subtitle into clickable tokens
  const words = currentSubtitleEn
    ? currentSubtitleEn.split(/\s+/).filter(Boolean)
    : [];

  return (
    <div className="w-full bg-gradient-to-r from-gray-900/95 via-[#121623]/95 to-gray-900/95 border border-gray-800/90 rounded-2xl p-4 shadow-xl text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-800/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
            Phụ Đề Tương Tác • Tra Từ eJOY (Groq AI)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Word Search */}
          <form onSubmit={handleCustomSearchSubmit} className="relative hidden sm:flex items-center">
            <input
              type="text"
              placeholder="Tra từ nhanh..."
              value={customWordInput}
              onChange={(e) => setCustomWordInput(e.target.value)}
              className="bg-gray-800/80 hover:bg-gray-800 focus:bg-gray-900 border border-gray-700/80 focus:border-rose-500 text-xs text-white rounded-xl pl-7 pr-3 py-1.5 outline-none transition-all w-36 focus:w-48 placeholder-gray-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
          </form>

          {/* Sổ từ vựng Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700/80 text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Sổ từ</span>
          </button>
        </div>
      </div>

      {/* Subtitle Display Container */}
      <div className="space-y-2 py-1">
        {/* English Interactive Subtitle Tokens */}
        <div className="flex items-center flex-wrap gap-1.5 min-h-[32px]">
          {words.length > 0 ? (
            words.map((w, idx) => {
              const clean = w.replace(/^[^\w]+|[^\w]+$/g, '');
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLookup(clean || w, currentSubtitleEn)}
                  className="px-2 py-1 rounded-lg text-sm sm:text-base font-semibold bg-gray-800/70 hover:bg-rose-600 hover:text-white active:bg-rose-700 text-gray-100 border border-gray-700/50 hover:border-rose-500 hover:scale-105 transition-all shadow-sm cursor-pointer select-none group"
                  title={`Nhấn để tra từ "${clean}" bằng AI`}
                >
                  <span>{w}</span>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-gray-500 italic flex items-center gap-1.5 py-1">
              <HelpCircle className="w-3.5 h-3.5 text-gray-600" />
              <span>Nhấn vào bất kỳ từ tiếng Anh nào bên dưới để tra nghĩa ngữ cảnh & nghe phát âm chuẩn bản xứ...</span>
            </div>
          )}
        </div>

        {/* Vietnamese Reference Line */}
        {currentSubtitleVi && (
          <div className="text-xs sm:text-sm text-gray-400 font-medium pt-1 border-t border-gray-800/60 flex items-center gap-2">
            <span className="text-rose-400 font-bold text-[10px] uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              Vietsub:
            </span>
            <span className="text-gray-300">{currentSubtitleVi}</span>
          </div>
        )}
      </div>

      {/* Word Lookup Modal */}
      <WordLookupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        word={selectedWord}
        contextSentence={selectedSentence}
      />

      {/* Saved Words Drawer */}
      <SavedWordsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
