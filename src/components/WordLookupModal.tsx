'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Bookmark, Check, Sparkles, X, Loader2, BookOpen } from 'lucide-react';

export interface WordData {
  word: string;
  ipa?: string;
  pos?: string;
  vi_meaning?: string;
  short_mean?: string;
  full_mean?: string;
  context_explanation?: string;
  example_sentence_en?: string;
  example_sentence_vi?: string;
  examples?: string;
  audio_url?: string | null;
  audio_us_url?: string | null;
  audio_uk_url?: string | null;
  saved_at?: string;
}

interface WordLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  contextSentence?: string;
  onPlayAudio?: () => void;
}

export default function WordLookupModal({
  isOpen,
  onClose,
  word,
  contextSentence = '',
}: WordLookupModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WordData | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);

  useEffect(() => {
    if (!isOpen || !word) return;

    // Check if word is already saved in localStorage
    try {
      const savedList: WordData[] = JSON.parse(localStorage.getItem('anistore_saved_words') || '[]');
      const exists = savedList.some((item) => item.word.toLowerCase() === word.toLowerCase().trim());
      setIsSaved(exists);
    } catch {
      setIsSaved(false);
    }

    setLoading(true);
    fetch('/api/dictionary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, sentence: contextSentence }),
    })
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.error) {
          setData(resData);
        } else {
          setData({
            word,
            vi_meaning: 'Không tìm thấy định nghĩa cho từ này.',
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setData({
          word,
          vi_meaning: 'Lỗi khi tra từ, vui lòng thử lại.',
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen, word, contextSentence]);

  const handleToggleSave = () => {
    if (!data) return;
    try {
      const savedList: WordData[] = JSON.parse(localStorage.getItem('anistore_saved_words') || '[]');
      if (isSaved) {
        const updated = savedList.filter((item) => item.word.toLowerCase() !== data.word.toLowerCase());
        localStorage.setItem('anistore_saved_words', JSON.stringify(updated));
        setIsSaved(false);
      } else {
        const newEntry: WordData = {
          ...data,
          saved_at: new Date().toISOString(),
        };
        savedList.unshift(newEntry);
        localStorage.setItem('anistore_saved_words', JSON.stringify(savedList));
        setIsSaved(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const playAudio = (accent: 'us' | 'uk' = 'us') => {
    const wordToPlay = data?.word || word;
    if (!wordToPlay) return;

    setPlayingAccent(accent);
    const audioUrl = accent === 'uk'
      ? (data?.audio_uk_url || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordToPlay)}&type=1`)
      : (data?.audio_us_url || data?.audio_url || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordToPlay)}&type=2`);

    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingAccent(null);
    audio.onerror = () => {
      // Fallback: Google TTS
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(wordToPlay)}`;
      const gAudio = new Audio(googleTtsUrl);
      gAudio.onended = () => setPlayingAccent(null);
      gAudio.onerror = () => {
        setPlayingAccent(null);
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(wordToPlay);
          utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      };
      gAudio.play().catch(() => setPlayingAccent(null));
    };

    audio.play().catch(() => {
      setPlayingAccent(null);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(wordToPlay);
        utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#131722] border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-[#161b28]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Tra từ eJOY Anime (Groq LPU)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-300">Đang tra cứu nghĩa ngữ cảnh bằng AI...</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">Model: openai/gpt-oss-120b</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Word, IPA & Audio buttons */}
              <div className="flex items-start justify-between gap-3 border-b border-gray-800/80 pb-3.5">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-2xl font-black text-white tracking-wide">{data.word}</h3>
                    {data.pos && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                        {data.pos}
                      </span>
                    )}
                  </div>
                  {data.ipa && (
                    <p className="text-sm text-gray-400 font-mono mt-0.5">{data.ipa}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* US Audio button */}
                  <button
                    onClick={() => playAudio('us')}
                    title="Phát âm giọng Mỹ (US Studio)"
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm ${
                      playingAccent === 'us'
                        ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse'
                        : 'bg-gray-800 hover:bg-gray-700 text-rose-400 border-gray-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>US</span>
                  </button>

                  {/* UK Audio button */}
                  <button
                    onClick={() => playAudio('uk')}
                    title="Phát âm giọng Anh (UK Studio)"
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm ${
                      playingAccent === 'uk'
                        ? 'bg-blue-500/30 border-blue-400 text-blue-300 animate-pulse'
                        : 'bg-gray-800 hover:bg-gray-700 text-blue-400 border-gray-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>UK</span>
                  </button>

                  <button
                    onClick={handleToggleSave}
                    title={isSaved ? 'Đã lưu trong Sổ từ' : 'Lưu vào Sổ từ vựng'}
                    className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                      isSaved
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Contextual Meaning */}
              <div className="bg-gray-900/90 rounded-xl p-3.5 border border-gray-800">
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>Nghĩa trong ngữ cảnh Anime:</span>
                </div>
                <p className="text-base font-bold text-gray-100 leading-snug">
                  {data.vi_meaning || data.short_mean || 'Không có định nghĩa'}
                </p>
                {(data.context_explanation || data.full_mean) && (
                  <p className="text-xs text-gray-400 mt-2 italic leading-relaxed border-t border-gray-800/80 pt-2">
                    💡 {data.context_explanation || data.full_mean}
                  </p>
                )}
              </div>

              {/* Example sentence if available */}
              {(data.example_sentence_en || data.examples) && (
                <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/60 text-xs">
                  <div className="font-semibold text-gray-300 flex items-center gap-1 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ví dụ minh họa:</span>
                  </div>
                  <p className="text-gray-200 font-medium">{data.example_sentence_en || data.examples}</p>
                  {data.example_sentence_vi && (
                    <p className="text-gray-400 mt-0.5 italic">{data.example_sentence_vi}</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#11141d] border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
          <span>{isSaved ? '⭐ Đã lưu vào Flashcard' : 'Nhấn dấu trang để lưu từ'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold transition-colors"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
