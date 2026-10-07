'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Volume2,
  Trash2,
  Search,
  LogIn,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  X,
  Tag,
  ArrowRight,
} from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { DefinitionItem, WordInflection } from '@/lib/pipelineDict';

interface SavedVocabularyItem {
  id: string;
  userEmail: string;
  word: string;
  meaning: string;
  ipa?: string;
  pos?: string;
  phraseType?: string;
  contextSentence: string;
  animeTitle: string;
  animeSlug: string;
  episodeNumber: number;
  createdAt: string;
}

interface DictModalData {
  word: string;
  root_word?: string;
  inflection?: WordInflection;
  short_mean: string;
  full_mean?: string;
  ipa?: string;
  pos?: string;
  pos_list?: string[];
  definitions?: DefinitionItem[];
  related_words?: string[];
  examples?: string;
  phrase_type?: 'single' | 'phrasal' | 'idiom' | 'collocation' | 'slang';
  source?: string;
  contextSentence?: string;
  animeTitle?: string;
  animeSlug?: string;
  episodeNumber?: number;
}

export default function VocabularyPage() {
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; email: string } | null>(null);
  const [vocabularies, setVocabularies] = useState<SavedVocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnime, setSelectedAnime] = useState<string>('all');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick reveal meaning toggle for specific card IDs
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Full Dictionary Modal state
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictModalData, setDictModalData] = useState<DictModalData | null>(null);
  const [dictModalLoading, setDictModalLoading] = useState(false);

  // Sync user state
  const syncUser = () => {
    try {
      const saved = localStorage.getItem('ani_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    syncUser();

    const handleAuthChange = () => {
      syncUser();
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, []);

  // Fetch user vocabularies when currentUser changes
  useEffect(() => {
    if (!currentUser?.email) {
      setVocabularies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/vocabulary?email=${encodeURIComponent(currentUser.email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.vocabularies && Array.isArray(data.vocabularies)) {
          setVocabularies(data.vocabularies);
        }
      })
      .catch((err) => console.error('Failed to load vocabularies:', err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  // Audio Pronunciation
  const playAudio = (word: string) => {
    if (!word || typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      setSpeakingWord(word);
      utterance.onend = () => setSpeakingWord(null);
      utterance.onerror = () => setSpeakingWord(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Open Full Dictionary Modal for a word
  const handleOpenDictionary = (item: SavedVocabularyItem) => {
    setDictModalData({
      word: item.word,
      short_mean: item.meaning,
      ipa: item.ipa,
      pos: item.pos,
      phrase_type: item.phraseType as any,
      source: 'Từ Điển Anh - Việt (Skypedia)',
      contextSentence: item.contextSentence,
      animeTitle: item.animeTitle,
      animeSlug: item.animeSlug,
      episodeNumber: item.episodeNumber,
    });
    setDictModalOpen(true);
    setDictModalLoading(true);

    fetch(
      `/api/dictionary?word=${encodeURIComponent(item.word)}&context=${encodeURIComponent(
        item.contextSentence || ''
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setDictModalData((prev) => ({
            ...prev,
            ...data,
            contextSentence: item.contextSentence,
            animeTitle: item.animeTitle,
            animeSlug: item.animeSlug,
            episodeNumber: item.episodeNumber,
          }));
        }
      })
      .catch((err) => console.error('Dictionary load error:', err))
      .finally(() => setDictModalLoading(false));
  };

  // Tra cứu từ liên quan trực tiếp trong Modal
  const handleLookupRelatedInModal = (word: string) => {
    if (!word) return;
    setDictModalLoading(true);
    setDictModalData((prev) => (prev ? { ...prev, word, short_mean: '' } : null));

    fetch(`/api/dictionary?word=${encodeURIComponent(word)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setDictModalData((prev) => ({
            ...prev,
            ...data,
          }));
        }
      })
      .catch((err) => console.error('Lookup error:', err))
      .finally(() => setDictModalLoading(false));
  };

  // Toggle reveal quick meaning on card
  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Delete word from notebook
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.email) return;
    if (!confirm('Bạn có chắc chắn muốn xoá từ này khỏi sổ tay?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/vocabulary?id=${encodeURIComponent(id)}&email=${encodeURIComponent(currentUser.email)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        setVocabularies((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // List of unique anime titles for filter
  const animeList = useMemo(() => {
    const set = new Set<string>();
    vocabularies.forEach((v) => {
      if (v.animeTitle) set.add(v.animeTitle);
    });
    return Array.from(set);
  }, [vocabularies]);

  // Filtered vocabularies
  const filteredList = useMemo(() => {
    return vocabularies.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.word.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.meaning.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.contextSentence.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchAnime = selectedAnime === 'all' || item.animeTitle === selectedAnime;

      return matchSearch && matchAnime;
    });
  }, [vocabularies, searchTerm, selectedAnime]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header Banner */}
      <div className="border-b border-gray-800/80 bg-gradient-to-b from-[#131722] via-[#0d0f15] to-[#0b0d13]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Sổ Tay Từ Vựng Anime
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Kho từ vựng & ngữ cảnh câu thực tế (Nhấp vào thẻ để mở nguyên từ điển đầy đủ)
                  </p>
                </div>
              </div>
            </div>

            {/* User Stats / Login Action */}
            {currentUser ? (
              <div className="flex items-center gap-3 bg-gray-900/90 border border-gray-800 px-4 py-2.5 rounded-2xl self-start md:self-auto shadow-md">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <div className="font-bold text-gray-200">{currentUser.name}</div>
                  <div className="text-amber-400 font-medium">
                    {vocabularies.length} từ vựng đã lưu
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 shadow-lg shadow-rose-600/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Để Xem Sổ Tay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Not Logged In State */}
        {!currentUser && (
          <div className="text-center py-16 px-4 bg-gray-900/40 border border-gray-800 rounded-3xl max-w-xl mx-auto mt-6 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              Bạn chưa đăng nhập
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
              Mỗi tài khoản Gmail chỉ đăng ký 1 tài khoản trên AniStore. Hãy đăng nhập để lưu từ vựng, tra cứu ngữ cảnh câu và ôn tập mọi lúc mọi nơi!
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 shadow-xl shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập / Đăng Ký Ngay</span>
            </button>
          </div>
        )}

        {/* Logged In Content */}
        {currentUser && (
          <>
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm từ vựng, câu thoại anime..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/90 border border-gray-700/80 rounded-2xl text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Anime Filter */}
              {animeList.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={selectedAnime}
                    onChange={(e) => setSelectedAnime(e.target.value)}
                    className="bg-gray-900 border border-gray-700/80 rounded-2xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Tất cả anime ({vocabularies.length})</option>
                    {animeList.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div className="text-center py-20 text-gray-400 text-sm">
                Đang tải danh sách từ vựng của bạn...
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredList.length === 0 && (
              <div className="text-center py-16 px-4 bg-gray-900/30 border border-gray-800 rounded-3xl max-w-lg mx-auto">
                <Sparkles className="w-12 h-12 text-amber-400/60 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-200 mb-1">
                  {searchTerm ? 'Không tìm thấy từ vựng phù hợp' : 'Sổ tay của bạn đang trống'}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5">
                  {searchTerm
                    ? 'Hãy thử tìm bằng từ khoá khác hoặc xoá bộ lọc.'
                    : 'Khi xem anime, hãy click vào bất kỳ từ vựng nào trên phụ đề Engsub và bấm dấu (+) để lưu từ vào đây nhé!'}
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 transition-colors"
                >
                  <span>Khám phá Anime ngay</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Vocabulary Grid */}
            {!loading && filteredList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map((item) => {
                  const isSpecialPhrase =
                    item.phraseType === 'phrasal' ||
                    item.phraseType === 'idiom' ||
                    item.phraseType === 'collocation';
                  const isRevealed = !!revealedIds[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDictionary(item)}
                      className="group relative bg-[#131722]/90 hover:bg-[#161c28] border border-gray-800 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xl flex flex-col justify-between cursor-pointer hover:shadow-cyan-950/20 hover:scale-[1.01]"
                    >
                      {/* Top Row: Word, Pos, Audio & Actions */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-lg sm:text-xl font-black tracking-tight group-hover:text-cyan-300 transition-colors ${
                                isSpecialPhrase ? 'text-amber-300' : 'text-white'
                              }`}
                            >
                              {item.word}
                            </span>

                            {/* Pronunciation Audio Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playAudio(item.word);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                speakingWord === item.word
                                  ? 'bg-amber-500 text-black border-amber-400 scale-110'
                                  : 'bg-gray-800/80 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border-gray-700'
                              }`}
                              title="Phát âm tiếng Anh chuẩn"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Right action group: Reveal quick meaning & Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle quick meaning reveal */}
                            <button
                              type="button"
                              onClick={(e) => toggleReveal(item.id, e)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title={isRevealed ? 'Ẩn nghĩa tiếng Việt' : 'Xem nhanh nghĩa tiếng Việt'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(item.id, e)}
                              disabled={deletingId === item.id}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                              title="Xoá từ khỏi sổ tay"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* IPA & POS Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-3">
                          {item.ipa && (
                            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md">
                              {item.ipa}
                            </span>
                          )}
                          {item.pos && (
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded">
                              {item.pos}
                            </span>
                          )}
                          {isSpecialPhrase && (
                            <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/60 border border-amber-700/50 px-1.5 py-0.5 rounded">
                              {item.phraseType === 'phrasal'
                                ? 'Phrasal Verb'
                                : item.phraseType === 'collocation'
                                ? 'Collocation'
                                : 'Idiom'}
                            </span>
                          )}
                        </div>

                        {/* Hidden/Revealed Vietnamese Meaning (Không lộ nghĩa mặc định) */}
                        {isRevealed ? (
                          <div className="text-sm font-semibold text-emerald-400 mb-3 leading-snug animate-in fade-in duration-150">
                            {item.meaning}
                          </div>
                        ) : (
                          <div className="mb-3 py-1 px-2.5 rounded-lg bg-gray-900/60 border border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 group-hover:border-cyan-500/30 transition-colors">
                            <span className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-300">
                              <BookOpen className="w-3 h-3 text-cyan-400" />
                              <span>Nhấn để xem từ điển chi tiết</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        )}

                        {/* Context Anime Sentence (Cụm cả câu đã lưu) */}
                        {item.contextSentence && (
                          <div className="p-3 rounded-xl bg-black/40 border border-gray-800/80 mb-3 text-xs text-gray-300 italic leading-relaxed">
                            <span className="text-gray-500 not-italic font-bold block text-[10px] uppercase mb-1">
                              Ngữ cảnh câu thoại:
                            </span>
                            "{item.contextSentence}"
                          </div>
                        )}
                      </div>

                      {/* Source Anime & Episode Link */}
                      <div className="pt-3 border-t border-gray-800/70 flex items-center justify-between text-xs text-gray-400">
                        <a
                          href={`/watch/${item.animeSlug}?ep=${item.episodeNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1.5 font-medium truncate max-w-[220px]"
                          title="Xem tập anime này"
                        >
                          <span className="truncate">{item.animeTitle || 'Anime'}</span>
                          <span className="text-rose-400 flex-shrink-0 font-bold">
                            • Tập {item.episodeNumber}
                          </span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Full Pure MinhQND & Skypedia Dictionary Modal */}
      {dictModalOpen && dictModalData && (
        <div
          className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
          onClick={() => setDictModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#131722] border-t sm:border border-cyan-500/40 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/90 overflow-hidden text-white animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700">
              <div className="w-12 h-1.5 bg-white/40 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold text-sm">
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-4 h-4" />
                <span className="truncate">
                  {dictModalData.source || 'Từ Điển Anh - Việt (Skypedia)'}
                </span>
              </div>
              <button
                onClick={() => setDictModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {dictModalLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-sm text-gray-300">Đang tra cứu từ điển Skypedia...</span>
                </div>
              ) : (
                <>
                  {/* Word Title & Pronunciation Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-2xl font-black text-white">{dictModalData.word}</h3>
                        {dictModalData.phrase_type && dictModalData.phrase_type !== 'single' && (
                          <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
                            {dictModalData.phrase_type === 'phrasal'
                              ? 'Phrasal Verb'
                              : dictModalData.phrase_type === 'collocation'
                              ? 'Collocation'
                              : 'Idiom'}
                          </span>
                        )}
                        {dictModalData.pos_list && dictModalData.pos_list.length > 0 ? (
                          dictModalData.pos_list.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded"
                            >
                              {p}
                            </span>
                          ))
                        ) : dictModalData.pos ? (
                          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                            {dictModalData.pos}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {dictModalData.ipa && (
                          <p className="text-sm text-cyan-300 font-mono font-semibold">
                            {dictModalData.ipa}
                          </p>
                        )}
                        {dictModalData.inflection?.root && (
                          <div className="inline-flex items-center gap-1 bg-cyan-950/70 border border-cyan-500/30 rounded-lg px-2 py-0.5 text-xs text-cyan-200">
                            <span className="text-gray-400 font-normal">
                              {dictModalData.inflection.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleLookupRelatedInModal(dictModalData.inflection!.root)}
                              className="font-bold text-cyan-300 hover:text-white hover:underline cursor-pointer"
                            >
                              {dictModalData.inflection.root}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Audio Speaker */}
                    <button
                      onClick={() => playAudio(dictModalData.word)}
                      className="p-2.5 rounded-xl bg-gray-800 hover:bg-cyan-600 hover:text-white text-cyan-400 transition-all flex items-center justify-center cursor-pointer shrink-0"
                      title="Phát âm chuẩn tiếng Anh"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Context Anime Quote in Modal */}
                  {dictModalData.contextSentence && (
                    <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-gray-200 leading-relaxed">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold uppercase mb-1">
                        <span>Ngữ cảnh câu thoại Anime:</span>
                        {dictModalData.animeTitle && (
                          <span className="text-gray-400">
                            {dictModalData.animeTitle} • Tập {dictModalData.episodeNumber}
                          </span>
                        )}
                      </div>
                      <p className="italic text-gray-200">"{dictModalData.contextSentence}"</p>
                    </div>
                  )}

                  {/* Structured Definitions Categorized by POS */}
                  {dictModalData.definitions && dictModalData.definitions.length > 0 ? (
                    <div className="space-y-4">
                      {Array.from(
                        dictModalData.definitions.reduce((map, item) => {
                          const key = item.pos || 'Từ vựng';
                          if (!map.has(key)) map.set(key, []);
                          map.get(key)!.push(item);
                          return map;
                        }, new Map<string, DefinitionItem[]>())
                      ).map(([posKey, items], gIdx) => (
                        <div key={gIdx} className="space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs text-amber-300 border-b border-amber-500/25 pb-1 uppercase tracking-wide">
                            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                              {posKey}
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal lowercase">
                              ({items.length} nghĩa)
                            </span>
                          </div>

                          <div className="space-y-2 pl-0.5">
                            {items.map((defItem, dIdx) => (
                              <div
                                key={dIdx}
                                className="bg-gray-900/90 rounded-xl p-2.5 border border-gray-800/90 hover:border-gray-700 transition-colors space-y-1"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                                    {dIdx + 1}
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-gray-100 leading-snug">
                                      {defItem.meaning}
                                    </p>
                                    {defItem.example && (
                                      <div className="text-xs text-amber-200/90 italic bg-black/50 px-2 py-1 rounded-lg border border-white/5">
                                        <span className="font-semibold text-gray-400 not-italic">Ví dụ: </span>
                                        {defItem.example}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-emerald-400 leading-snug">
                      {dictModalData.short_mean || 'Đang cập nhật nghĩa chi tiết...'}
                    </div>
                  )}

                  {/* Related Words */}
                  {dictModalData.related_words && dictModalData.related_words.length > 0 && (
                    <div className="pt-2 border-t border-gray-800">
                      <div className="text-[11px] uppercase font-bold text-gray-400 mb-2 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Từ liên quan / Đồng nghĩa:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dictModalData.related_words.map((rw, rwIdx) => (
                          <button
                            key={rwIdx}
                            type="button"
                            onClick={() => handleLookupRelatedInModal(rw)}
                            className="text-xs font-medium text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/30 px-2.5 py-1 rounded-xl cursor-pointer transition-colors active:scale-95"
                          >
                            {rw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#0d1017] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Nguồn: Từ Điển Anh - Việt (Skypedia)</span>
              <button
                onClick={() => setDictModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
