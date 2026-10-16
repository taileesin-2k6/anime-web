'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Plus, Check, X, BookOpen, Sparkles, Tag, ArrowRight, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';
import { SubtitleToken, DefinitionItem, WordInflection, SearchSuggestionItem } from '@/lib/pipelineDict';
import AuthModal from './AuthModal';

export interface DictWordData {
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
  audio_url?: string;
  audio_us_url?: string;
  audio_uk_url?: string;
  source?: string;
  is_ai?: boolean;
  saved_at?: string;
}

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
  vi_text?: string;
}

interface VideoSubtitleOverlayProps {
  currentTime: number;
  animeTitle?: string;
  animeSlug?: string;
  episodeNumber: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isFullscreen?: boolean;
  subtitlesEnabled?: boolean;
  onToggleFullscreen?: () => void;
}

export default function VideoSubtitleOverlay({
  currentTime,
  animeTitle = 'Futsutsuka na Akujo dewa Gozaimasu ga',
  animeSlug = '',
  episodeNumber = 1,
  videoRef,
  isFullscreen = false,
  subtitlesEnabled = true,
  onToggleFullscreen,
}: VideoSubtitleOverlayProps) {
  const [subtitlesEn, setSubtitlesEn] = useState<SubtitleCue[]>([]);
  const [activeCueEn, setActiveCueEn] = useState<SubtitleCue | null>(null);

  // Structured tokens for the active subtitle cue
  const [activeTokens, setActiveTokens] = useState<SubtitleToken[]>([]);
  const [meaningsCache, setMeaningsCache] = useState<Record<string, string>>({});

  // Hover state (0ms instant tooltip for desktop)
  const [hoveredToken, setHoveredToken] = useState<{
    token: SubtitleToken;
    meaning: string;
    x: number;
    y: number;
  } | null>(null);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [popoverData, setPopoverData] = useState<DictWordData | null>(null);
  const [popoverLoading, setPopoverLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedWordsSet, setSavedWordsSet] = useState<Set<string>>(new Set());
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [playingAccent, setPlayingAccent] = useState<'us' | 'uk' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wasPlayingBeforeHoverRef = useRef(false);
  const sentenceTokenCacheRef = useRef<Record<string, { tokens: SubtitleToken[]; meanings: Record<string, string> }>>({});

  // Debounced real-time suggestion fetcher (TFlat style)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/dictionary?suggest=${encodeURIComponent(q)}&limit=8`)
        .then((res) => res.json())
        .then((data) => {
          if (data.suggestions && Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setIsSuggestOpen(data.suggestions.length > 0);
          }
        })
        .catch((err) => console.error('Suggestion fetch error:', err));
    }, 80);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setMounted(true);
    const handleCheck = () => {
      const isMobile = window.innerWidth < 768 || window.innerHeight < 550;
      setIsMobileScreen(isMobile);
    };
    handleCheck();
    window.addEventListener('resize', handleCheck);
    return () => window.removeEventListener('resize', handleCheck);
  }, []);

  // Sync user saved vocabulary list
  const syncSavedWords = () => {
    let user: { email?: string } | null = null;
    try {
      const saved = localStorage.getItem('ani_user');
      if (saved) user = JSON.parse(saved);
    } catch {}

    if (user?.email) {
      fetch(`/api/vocabulary?email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.vocabularies && Array.isArray(data.vocabularies)) {
            const set = new Set<string>(
              data.vocabularies.map((v: any) => (v.word || '').toLowerCase().trim())
            );
            setSavedWordsSet(set);
          }
        })
        .catch((e) => console.error(e));
    } else {
      setSavedWordsSet(new Set());
    }
  };

  useEffect(() => {
    syncSavedWords();
    const handleAuth = () => syncSavedWords();
    window.addEventListener('auth-changed', handleAuth);
    return () => window.removeEventListener('auth-changed', handleAuth);
  }, []);

  // Fetch subtitle cues when episode changes
  useEffect(() => {
    if (!animeSlug) return;
    fetch(`/api/subtitles?slug=${encodeURIComponent(animeSlug)}&ep=${episodeNumber}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.en) setSubtitlesEn(data.en);
      })
      .catch((err) => console.error('Failed to load subtitles:', err));
  }, [animeSlug, episodeNumber]);

  // Sync active cue with video currentTime (shifted 120ms earlier to match frame onset perfectly)
  useEffect(() => {
    if (subtitlesEn.length === 0) return;
    const matchEn = subtitlesEn.find(
      (cue) => currentTime >= (cue.start - 0.12) && currentTime <= (cue.end + 0.12)
    );
    setActiveCueEn(matchEn || null);
  }, [currentTime, subtitlesEn]);

  // Pre-tokenize subtitle sentence & fetch pipeline meanings
  useEffect(() => {
    if (!activeCueEn?.text) {
      setActiveTokens([]);
      setMeaningsCache({});
      setHoveredToken(null);
      return;
    }

    const currentSentence = activeCueEn.text;

    // Check memory cache first (instant response, 0ms, 0 network requests)
    if (sentenceTokenCacheRef.current[currentSentence]) {
      const cached = sentenceTokenCacheRef.current[currentSentence];
      setActiveTokens(cached.tokens);
      setMeaningsCache(cached.meanings);
      return;
    }

    // Fast initial fallback tokens
    const rawWords = currentSentence.split(/\s+/).filter(Boolean);
    const initialTokens: SubtitleToken[] = rawWords.map((w) => ({
      text: w,
      clean: w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''),
      isPhrase: false,
      phraseType: 'single',
      meaning: '',
    }));
    setActiveTokens(initialTokens);

    // Call Pipeline Tokenizer & Dictionary API once per sentence
    fetch(`/api/dictionary?sentence=${encodeURIComponent(currentSentence)}`)
      .then((res) => res.json())
      .then((data) => {
        const tokens = data.tokens && Array.isArray(data.tokens) ? data.tokens : initialTokens;
        const meanings = data.meanings || {};
        sentenceTokenCacheRef.current[currentSentence] = { tokens, meanings };
        setActiveTokens(tokens);
        setMeaningsCache(meanings);
      })
      .catch((err) => console.error('Failed to tokenize cue words:', err));
  }, [activeCueEn?.text]);

  // Hover on token -> Auto-pause video and show instant meaning tooltip
  const handleTokenHover = (
    e: React.MouseEvent<HTMLSpanElement>,
    token: SubtitleToken
  ) => {
    if (token.phraseType === 'punct') return;

    // Auto-pause video when hovering over a subtitle word
    if (videoRef.current && !videoRef.current.paused) {
      wasPlayingBeforeHoverRef.current = true;
      videoRef.current.pause();
    }

    const meaning = token.meaning || meaningsCache[token.clean] || '';
    if (!meaning) return;

    const tokenEl = e.currentTarget;
    const tokenRect = tokenEl.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect();

    if (parentRect) {
      const x = tokenRect.left - parentRect.left + tokenRect.width / 2;
      const y = tokenRect.top - parentRect.top;
      setHoveredToken({
        token,
        meaning,
        x,
        y,
      });
    }
  };

  // Hover leave -> Auto-resume video if it was playing
  const handleTokenLeave = () => {
    setHoveredToken(null);
    if (wasPlayingBeforeHoverRef.current && !selectedWord) {
      videoRef.current?.play().catch(() => {});
      wasPlayingBeforeHoverRef.current = false;
    }
  };

  // Click / Tap on token -> Pause video and open Dictionary Card
  const handleTokenClick = (
    e: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>,
    token: SubtitleToken,
    sentence: string
  ) => {
    e.stopPropagation();

    if (token.phraseType === 'punct') return;

    setHoveredToken(null);

    // Pause video
    if (videoRef.current && !videoRef.current.paused) {
      wasPlayingBeforeHoverRef.current = true;
      videoRef.current.pause();
    }

    const termToSearch = token.clean || token.text.replace(/^[^a-zA-Z0-9\s]+|[^a-zA-Z0-9\s]+$/g, '');
    if (!termToSearch) return;

    setSelectedWord(token.text);

    // Calculate position
    if (containerRef.current) {
      const parentRect = containerRef.current.getBoundingClientRect();
      const wordRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (parentRect) {
        const x = wordRect.left - parentRect.left + wordRect.width / 2;
        const y = wordRect.top - parentRect.top;
        setPopoverPosition({ x, y });
      }
    }

    // Check saved state from savedWordsSet
    const termClean = termToSearch.toLowerCase().trim();
    setIsSaved(savedWordsSet.has(termClean));

    // Pre-populate with cached meaning for 0ms instant display
    const quickMean = token.meaning || meaningsCache[token.clean] || '';
    setPopoverData({
      word: token.text,
      short_mean: quickMean,
      ipa: token.ipa,
      pos: token.pos,
      phrase_type: token.phraseType,
      source: token.isPhrase
        ? token.phraseType === 'collocation'
          ? 'Linguatools Collocations'
          : 'Kaikki / Wiktionary'
        : 'Từ Điển Anh - Việt (Skypedia)',
    });
    setPopoverLoading(false);

    // Fetch full pure MinhQND dictionary entry
    fetch(`/api/dictionary?word=${encodeURIComponent(termToSearch)}&context=${encodeURIComponent(sentence)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPopoverData(data);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setPopoverLoading(false));
  };

  // Jump to lookup any word (e.g. root word or related word) directly in popover
  const handleLookupWord = (term: string) => {
    if (!term) return;
    const cleanTerm = term.trim().replace(/^[^a-zA-Z0-9\s]+|[^a-zA-Z0-9\s]+$/g, '');
    if (!cleanTerm) return;

    setSelectedWord(cleanTerm);
    setPopoverLoading(true);

    // Check saved state from savedWordsSet
    setIsSaved(savedWordsSet.has(cleanTerm.toLowerCase().trim()));

    fetch(`/api/dictionary?word=${encodeURIComponent(cleanTerm)}&context=${encodeURIComponent(activeCueEn?.text || '')}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPopoverData(data);
        }
      })
      .catch((err) => {
        console.error('Failed to lookup word:', err);
      })
      .finally(() => setPopoverLoading(false));
  };

  const handleSaveWord = async () => {
    if (!popoverData && !selectedWord) return;
    const wordToSave = (popoverData?.word || selectedWord || '').trim();
    if (!wordToSave) return;
    const wordKey = wordToSave.toLowerCase();

    // 1. Check if user is logged in
    let user: { id?: string; name: string; email: string } | null = null;
    try {
      const savedUser = localStorage.getItem('ani_user');
      if (savedUser) user = JSON.parse(savedUser);
    } catch {}

    if (!user || !user.email) {
      // Require login: Open Auth Modal
      setAuthModalOpen(true);
      return;
    }

    // 2. If already saved -> UNSAVE (Bỏ lưu khỏi sổ từ)
    if (isSaved) {
      try {
        const res = await fetch(
          `/api/vocabulary?word=${encodeURIComponent(wordToSave)}&email=${encodeURIComponent(user.email)}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (data.success) {
          setIsSaved(false);
          setSavedWordsSet((prev) => {
            const next = new Set(prev);
            next.delete(wordKey);
            return next;
          });
          setSaveToast(`Đã bỏ lưu "${wordToSave}" khỏi Sổ tay từ vựng!`);
          setTimeout(() => setSaveToast(null), 2500);
        }
      } catch (e) {
        console.error('Failed to unsave vocabulary:', e);
      }
      return;
    }

    // 3. Not saved yet -> SAVE (Lưu vào sổ từ)
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          word: wordToSave,
          meaning: popoverData?.short_mean || popoverData?.full_mean || '',
          ipa: popoverData?.ipa || '',
          pos: popoverData?.pos || '',
          phraseType: popoverData?.phrase_type || 'single',
          contextSentence: activeCueEn?.text || '',
          animeTitle: animeTitle || 'Futsutsuka na Akujo dewa Gozaimasu ga',
          animeSlug: animeSlug,
          episodeNumber: episodeNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        setSavedWordsSet((prev) => {
          const next = new Set(prev);
          next.add(wordKey);
          return next;
        });
        setSaveToast(`Đã lưu "${wordToSave}" vào Sổ tay từ vựng!`);
        setTimeout(() => setSaveToast(null), 2500);
      }
    } catch (e) {
      console.error('Failed to save vocabulary:', e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleLookupWord(searchQuery.trim());
      setSearchQuery('');
    }
  };

  // Studio Native Audio Pronunciation (US & UK) with multi-tier fallback
  const playAudio = (accent: 'us' | 'uk' = 'us') => {
    const wordToSpeak = popoverData?.word || selectedWord;
    if (!wordToSpeak || typeof window === 'undefined') return;

    setPlayingAccent(accent);
    setAudioPlaying(true);

    const audioUrl = accent === 'uk'
      ? (popoverData?.audio_uk_url || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordToSpeak)}&type=1`)
      : (popoverData?.audio_us_url || popoverData?.audio_url || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(wordToSpeak)}&type=2`);

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      setPlayingAccent(null);
      setAudioPlaying(false);
    };
    audio.onerror = () => {
      // Fallback: Google TTS
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(wordToSpeak)}`;
      const gAudio = new Audio(googleTtsUrl);
      gAudio.onended = () => {
        setPlayingAccent(null);
        setAudioPlaying(false);
      };
      gAudio.onerror = () => {
        setPlayingAccent(null);
        setAudioPlaying(false);
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(wordToSpeak);
          utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      };
      gAudio.play().catch(() => {
        setPlayingAccent(null);
        setAudioPlaying(false);
      });
    };

    audio.play().catch(() => {
      setPlayingAccent(null);
      setAudioPlaying(false);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(wordToSpeak);
        utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  const closePopover = () => {
    setSelectedWord(null);
    setPopoverData(null);
    setPopoverPosition(null);
    if (wasPlayingBeforeHoverRef.current) {
      videoRef.current?.play().catch(() => {});
      wasPlayingBeforeHoverRef.current = false;
    }
  };

  const currentSentenceEn = activeCueEn?.text || '';

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* 1. Subtitle Pill Overlay at the Bottom of Video */}
      {subtitlesEnabled !== false && currentSentenceEn && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-max max-w-[98%] pointer-events-auto flex flex-col items-center transition-all duration-150 z-40 ${
            isMobileScreen
              ? 'bottom-[2.8%]'
              : isFullscreen
              ? 'bottom-9 sm:bottom-13 md:bottom-17'
              : 'bottom-6 sm:bottom-8.5 md:bottom-11'
          }`}
        >
          <div className={`bg-black/95 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.95)] flex flex-wrap items-baseline justify-center text-center w-full animate-in fade-in zoom-in-95 duration-100 ${
            isMobileScreen
              ? 'px-1.5 py-0 sm:px-2.5 sm:py-0.5 rounded-md gap-x-0.5 sm:gap-x-1 leading-tight'
              : 'px-3.5 py-1 sm:px-5 sm:py-1.5 md:px-6 md:py-2 rounded-xl gap-x-1 sm:gap-x-2 gap-y-0.5 leading-snug'
          }`}>
            {/* Clickable Word & Multi-word Phrase Tokens */}
            {activeTokens.map((tok, idx) => {
              if (tok.phraseType === 'punct') {
                return (
                  <span
                    key={idx}
                    className={`text-gray-200 font-bold select-none -ml-1 sm:-ml-1.5 pointer-events-none ${
                      isMobileScreen
                        ? 'text-[13px] sm:text-[17px] md:text-[20px] lg:text-[21.5px]'
                        : isFullscreen
                        ? 'text-lg sm:text-3xl md:text-4xl lg:text-[44px]'
                        : 'text-sm sm:text-xl md:text-[26px] lg:text-[32px] xl:text-[35px]'
                    }`}
                  >
                    {tok.text}
                  </span>
                );
              }

              const isTargeted = selectedWord?.toLowerCase() === tok.text.toLowerCase();
              const isHovered = hoveredToken?.token.clean === tok.clean;

              // Pure text color styling (no background box)
              let textStyle = 'text-white hover:text-cyan-400 active:text-cyan-300';

              if (tok.phraseType === 'phrasal' || tok.phraseType === 'idiom' || tok.phraseType === 'collocation') {
                // Special phrases: Yellow text by default
                textStyle = 'text-amber-300 font-bold hover:text-amber-200 active:text-amber-100';
              }

              if (isTargeted) {
                textStyle = tok.isPhrase
                  ? 'text-amber-300 font-extrabold underline underline-offset-4 decoration-amber-400 decoration-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]'
                  : 'text-cyan-300 font-extrabold underline underline-offset-4 decoration-cyan-400 decoration-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.95)]';
              } else if (isHovered) {
                textStyle = tok.isPhrase
                  ? 'text-amber-200 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.95)]'
                  : 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.95)]';
              }

              return (
                <span
                  key={idx}
                  onMouseEnter={(e) => handleTokenHover(e, tok)}
                  onMouseLeave={handleTokenLeave}
                  onClick={(e) => handleTokenClick(e, tok, currentSentenceEn)}
                  className={`cursor-pointer transition-colors duration-75 font-bold tracking-normal select-none inline-flex items-center touch-manipulation ${
                    isMobileScreen
                      ? 'text-[13px] sm:text-[17px] md:text-[20px] lg:text-[21.5px]'
                      : isFullscreen
                      ? 'text-lg sm:text-3xl md:text-4xl lg:text-[44px]'
                      : 'text-sm sm:text-xl md:text-[26px] lg:text-[32px] xl:text-[35px]'
                  } ${textStyle}`}
                >
                  {tok.text}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Instant Hover Speech Bubble Tooltip (Desktop Hover only) */}
      {hoveredToken && !selectedWord && (
        <div
          className="hidden sm:block absolute z-50 pointer-events-none -translate-x-1/2 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredToken.x}px`,
            top: `${Math.max(10, hoveredToken.y - 42)}px`,
          }}
        >
          <div className="relative bg-[#181c24]/95 backdrop-blur-md border border-gray-700/80 shadow-2xl rounded-xl px-2.5 py-1 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 whitespace-nowrap shadow-black/80">
            {hoveredToken.token.isPhrase && (
              <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1 py-0.2 rounded">
                {hoveredToken.token.phraseType === 'phrasal' ? 'Phrasal Verb' : hoveredToken.token.phraseType === 'collocation' ? 'Collocation' : 'Idiom'}
              </span>
            )}
            <span>{hoveredToken.meaning}</span>
            {/* Tooltip Downward Pointer Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-[#181c24]" />
          </div>
        </div>
      )}

      {/* 3. Pure MinhQND & Skypedia Dictionary Card on Click (Floating above word on Desktop, Compact bottom card on Mobile) */}
      {selectedWord && (
        <div
          className={`absolute z-50 pointer-events-auto bg-[#131722]/98 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden text-white animate-in zoom-in-95 fade-in duration-150 ${
            isMobileScreen
              ? 'w-[92vw] max-w-[320px]'
              : 'max-w-sm sm:max-w-md w-92'
          }`}
          style={
            isMobileScreen
              ? {
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }
              : {
                  bottom: isFullscreen ? '145px' : '95px',
                  left: popoverPosition
                    ? `${Math.min(
                        Math.max(popoverPosition.x - 184, 16),
                        (containerRef.current?.clientWidth || 380) - 380
                      )}px`
                    : '50%',
                  transform: popoverPosition ? 'none' : 'translateX(-50%)',
                }
          }
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className={`flex items-center justify-between bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold text-xs ${
            isMobileScreen ? 'px-3 py-1.5' : 'px-3.5 py-2'
          }`}>
            <div className="flex items-center gap-1.5 truncate">
              {popoverData?.is_ai ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <BookOpen className="w-3.5 h-3.5" />
              )}
              <span className="truncate">
                {popoverData?.source || 'Từ Điển Anh - Việt (Skypedia)'}
              </span>
            </div>
            <button
              onClick={closePopover}
              className="p-0.5 rounded-md hover:bg-white/20 transition-colors ml-2 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Popover Body */}
          <div className={`space-y-2.5 overflow-y-auto ${
            isMobileScreen ? 'p-2.5 max-h-[50vh]' : 'p-3.5 space-y-3 max-h-96'
          }`}>
            {/* Inline Dictionary Search Bar with TFlat-style Suggestions */}
            <div className="relative z-30">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center"
              >
                <div className="relative w-full flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-cyan-400/70 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setIsSuggestOpen(true);
                    }}
                    placeholder="Tìm từ, cụm từ, thành ngữ (e.g. conci, reaction...)"
                    className="w-full pl-8 pr-16 py-1.5 bg-[#111622] hover:bg-[#141b2b] focus:bg-[#151d30] border border-gray-700/80 focus:border-cyan-500 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setIsSuggestOpen(false);
                      }}
                      className="absolute right-14 text-gray-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="absolute right-1 px-2 py-0.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:hover:from-cyan-600 disabled:hover:to-blue-600 text-white text-[11px] font-bold rounded-md transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    Tra từ
                  </button>
                </div>
              </form>

              {/* TFlat-Style Live Suggestions Dropdown */}
              {isSuggestOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#0d121c]/98 border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md max-h-64 overflow-y-auto divide-y divide-gray-800/80 animate-in fade-in zoom-in-95 duration-150">
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        handleLookupWord(item.word);
                        setSearchQuery('');
                        setIsSuggestOpen(false);
                      }}
                      className="p-2.5 hover:bg-cyan-950/70 active:bg-cyan-900/80 transition-colors cursor-pointer flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Search className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                            {item.word}
                          </span>
                          {item.ipa && (
                            <span className="text-[10px] text-cyan-400/80 font-mono">
                              [{item.ipa.replace(/^\/|\/$/g, '')}]
                            </span>
                          )}
                          {item.pos && (
                            <span className="text-[9px] text-gray-400 bg-gray-800/90 border border-gray-700 px-1 py-0.2 rounded font-medium">
                              {item.pos.split(' / ')[0]}
                            </span>
                          )}
                          {item.phrase_type && item.phrase_type !== 'single' && (
                            <span className="text-[8px] uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1 py-0.2 rounded">
                              {item.phrase_type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 pl-4.5">
                          {item.short_mean}
                        </p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {popoverLoading ? (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-gray-300 font-medium">Đang tra cứu từ điển Skypedia...</span>
              </div>
            ) : popoverData ? (
              <>
                {/* Word Title & Pronunciation */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-800 pb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className={`font-black text-white tracking-tight ${isMobileScreen ? 'text-lg' : 'text-xl'}`}>{popoverData.word}</h4>
                      {popoverData.phrase_type && popoverData.phrase_type !== 'single' && (
                        <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1 py-0.2 rounded">
                          {popoverData.phrase_type === 'phrasal' ? 'Phrasal Verb' : popoverData.phrase_type === 'collocation' ? 'Collocation' : 'Idiom'}
                        </span>
                      )}
                      {popoverData.pos_list && popoverData.pos_list.length > 0 ? (
                        popoverData.pos_list.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1 py-0.2 rounded"
                          >
                            {p}
                          </span>
                        ))
                      ) : popoverData.pos ? (
                        <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1 py-0.2 rounded">
                          {popoverData.pos}
                        </span>
                      ) : null}
                    </div>

                    {/* IPA Pronunciation & Inline Root Inflection */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {popoverData.ipa && (
                        <p className="text-xs text-cyan-300/80 font-mono font-medium">{popoverData.ipa}</p>
                      )}

                      {/* Compact Inline Root Info */}
                      {popoverData.inflection && popoverData.inflection.root && (
                        <div className="inline-flex items-center gap-1 bg-cyan-950/70 border border-cyan-500/30 rounded px-1.5 py-0.2 text-[10px] text-cyan-200">
                          <span className="text-gray-400 font-normal">{popoverData.inflection.label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLookupWord(popoverData.inflection!.root);
                            }}
                            className="font-bold text-cyan-300 hover:text-white hover:underline cursor-pointer transition-colors active:scale-95"
                            title={`Tra từ gốc "${popoverData.inflection.root}"`}
                          >
                            {popoverData.inflection.root}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* US Audio */}
                    <button
                      onClick={() => playAudio('us')}
                      title="Phát âm giọng Mỹ (US Studio)"
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-sm ${
                        playingAccent === 'us'
                          ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse'
                          : 'bg-gray-800 hover:bg-cyan-600 hover:text-white text-cyan-300 border-gray-700'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>US</span>
                    </button>

                    {/* UK Audio */}
                    <button
                      onClick={() => playAudio('uk')}
                      title="Phát âm giọng Anh (UK Studio)"
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-sm ${
                        playingAccent === 'uk'
                          ? 'bg-blue-500/30 border-blue-400 text-blue-300 animate-pulse'
                          : 'bg-gray-800 hover:bg-blue-600 hover:text-white text-blue-300 border-gray-700'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>UK</span>
                    </button>

                    <button
                      onClick={handleSaveWord}
                      title={isSaved ? 'Đã lưu' : 'Thêm vào sổ từ'}
                      className={`p-1.5 rounded-lg border active:scale-95 transition-all flex items-center justify-center cursor-pointer ${
                        isSaved
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/20'
                          : 'bg-gray-800 text-gray-400 hover:text-white border-gray-700'
                      }`}
                    >
                      {isSaved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Structured Skypedia Definitions Grouped by POS */}
                {popoverData.definitions && popoverData.definitions.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Group definitions by part of speech */}
                    {Array.from(
                      popoverData.definitions.reduce((map, item) => {
                        const key = item.pos || 'Từ vựng';
                        if (!map.has(key)) map.set(key, []);
                        map.get(key)!.push(item);
                        return map;
                      }, new Map<string, DefinitionItem[]>())
                    ).map(([posKey, items], gIdx) => (
                      <div key={gIdx} className="space-y-1">
                        {/* POS Category Header */}
                        <div className="flex items-center gap-1 font-bold text-[11px] text-amber-300 border-b border-amber-500/25 pb-0.5 uppercase tracking-wide">
                          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 text-[10px]">
                            {posKey}
                          </span>
                          <span className="text-[9px] text-gray-400 font-normal lowercase">
                            ({items.length} nghĩa)
                          </span>
                        </div>

                        {/* List of Definitions for this POS */}
                        <div className="space-y-1 pl-0.5">
                          {items.map((defItem, dIdx) => (
                            <div
                              key={dIdx}
                              className={`bg-gray-900/90 rounded-xl border border-gray-800/90 hover:border-gray-700 transition-colors space-y-0.5 ${
                                isMobileScreen ? 'p-2' : 'p-2.5'
                              }`}
                            >
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-1 py-0.2 rounded shrink-0 mt-0.5">
                                  {dIdx + 1}
                                </span>
                                <div className="flex-1 space-y-0.5">
                                  <p className={`font-bold text-gray-100 leading-snug ${
                                    isMobileScreen ? 'text-xs' : 'text-sm'
                                  }`}>
                                    {defItem.meaning}
                                  </p>
                                  {defItem.example && (
                                    <div className={`italic bg-black/50 rounded-lg border border-white/5 ${
                                      isMobileScreen ? 'text-[10px] px-1.5 py-0.5 text-amber-200/80' : 'text-xs px-2 py-1 text-amber-200/90 mt-0.5'
                                    }`}>
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
                  /* Fallback single definition block */
                  <div className="bg-gray-900/90 rounded-xl p-2.5 border border-gray-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-amber-400">Định nghĩa:</div>
                    <p className={`font-bold text-gray-100 leading-snug ${isMobileScreen ? 'text-xs' : 'text-sm'}`}>
                      {popoverData.short_mean || popoverData.full_mean}
                    </p>
                    {popoverData.examples && (
                      <div className="mt-1 text-xs text-amber-200/90 italic bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                        <span className="font-semibold text-gray-400 not-italic">Ví dụ: </span>
                        {popoverData.examples}
                      </div>
                    )}
                  </div>
                )}

                {/* Related Words / Synonyms from MinhQND */}
                {popoverData.related_words && popoverData.related_words.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[9px] uppercase font-bold text-gray-400 mb-1 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-cyan-400" />
                      <span>Từ liên quan / Đồng nghĩa:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {popoverData.related_words.map((rw, rwIdx) => (
                        <button
                          key={rwIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLookupWord(rw);
                          }}
                          className="text-[10px] font-medium text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/30 px-1.5 py-0.2 rounded cursor-pointer transition-colors active:scale-95"
                          title={`Tra từ "${rw}"`}
                        >
                          {rw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Popover Footer */}
          <div className="px-3.5 py-1.5 bg-[#0f121a] border-t border-gray-800 text-[10px] text-gray-400 flex items-center justify-between">
            <span className="truncate">{popoverData?.source || 'Từ Điển Anh - Việt (Skypedia)'}</span>
            <button
              onClick={closePopover}
              className="text-cyan-400 hover:underline font-semibold cursor-pointer shrink-0 ml-2"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Save Success Toast */}
      {saveToast && (
        <div className="fixed top-16 sm:top-20 right-4 sm:right-6 z-[9999999] pointer-events-auto bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Auth Modal for Require Login to Save */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        customTitle="Đăng Nhập Để Lưu Từ Vựng"
        customSubtitle="Đăng nhập tài khoản để lưu từ vựng kèm ngữ cảnh câu anime vào Sổ tay cá nhân của bạn."
        onSuccess={() => {
          setAuthModalOpen(false);
          handleSaveWord();
        }}
      />
    </div>
  );
}

