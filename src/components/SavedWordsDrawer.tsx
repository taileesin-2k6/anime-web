'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Volume2, Trash2, X, Sparkles, BookOpen } from 'lucide-react';
import { WordData } from './WordLookupModal';

interface SavedWordsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavedWordsDrawer({ isOpen, onClose }: SavedWordsDrawerProps) {
  const [words, setWords] = useState<WordData[]>([]);

  const loadWords = () => {
    try {
      const list = JSON.parse(localStorage.getItem('anistore_saved_words') || '[]');
      setWords(list);
    } catch {
      setWords([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWords();
    }
  }, [isOpen]);

  const handleDelete = (wordToDelete: string) => {
    try {
      const updated = words.filter((w) => w.word.toLowerCase() !== wordToDelete.toLowerCase());
      localStorage.setItem('anistore_saved_words', JSON.stringify(updated));
      setWords(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = () => {
    if (confirm('Bạn có chắc chắn muốn xoá toàn bộ sổ từ vựng đã lưu?')) {
      localStorage.removeItem('anistore_saved_words');
      setWords([]);
    }
  };

  const playAudio = (wordData: WordData) => {
    const wordToPlay = wordData.word;
    if (!wordToPlay) return;

    const audioUrl = wordData.audio_url || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordToPlay)}&type=2`;
    const audio = new Audio(audioUrl);
    audio.onerror = () => {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(wordToPlay)}`;
      const gAudio = new Audio(googleTtsUrl);
      gAudio.onerror = () => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(wordToPlay);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      };
      gAudio.play().catch(() => {});
    };
    audio.play().catch(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(wordToPlay);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#131722] border-l border-gray-800 text-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#161b28]">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Sổ Từ Vựng Anime ({words.length})</h3>
          </div>
          <div className="flex items-center gap-1">
            {words.length > 0 && (
              <button
                onClick={handleClearAll}
                title="Xoá tất cả"
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá hết</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Word List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {words.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <BookOpen className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-sm font-semibold text-gray-300">Chưa có từ vựng nào được lưu</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Khi xem anime, hãy bấm vào các từ tiếng Anh trong phụ đề và nhấn biểu tượng dấu trang để lưu lại ôn tập nhé!
              </p>
            </div>
          ) : (
            words.map((item, index) => (
              <div
                key={index}
                className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-white">{item.word}</span>
                      {item.pos && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                          {item.pos}
                        </span>
                      )}
                    </div>
                    {item.ipa && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{item.ipa}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => playAudio(item)}
                      title="Phát âm"
                      className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-rose-400 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.word)}
                      title="Xoá từ này"
                      className="p-2 rounded-xl bg-gray-800 hover:bg-rose-950/60 hover:text-rose-400 text-gray-500 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Meaning */}
                <div className="mt-2.5 pt-2.5 border-t border-gray-800/80">
                  <p className="text-sm font-semibold text-amber-300">{item.vi_meaning}</p>
                  {item.context_explanation && (
                    <p className="text-xs text-gray-400 mt-1 italic">{item.context_explanation}</p>
                  )}
                </div>

                {item.example_sentence_en && (
                  <div className="mt-2 pt-2 border-t border-gray-800/60 text-xs text-gray-400">
                    <p className="text-gray-300 font-medium">"{item.example_sentence_en}"</p>
                    {item.example_sentence_vi && (
                      <p className="text-gray-500 italic mt-0.5">{item.example_sentence_vi}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-[#161b28] text-xs text-gray-400 flex items-center justify-between">
          <span>Học ngắt quãng Spaced Repetition</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
