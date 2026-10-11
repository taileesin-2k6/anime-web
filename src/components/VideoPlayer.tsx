'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatVideoUrl } from '@/lib/gdrive';
import {
  Maximize2,
  Minimize2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Gauge,
  SkipBack,
  SkipForward,
  ChevronDown,
  X,
  Minus,
  Plus,
  Sparkles,
  Settings,
} from 'lucide-react';
import VideoSubtitleOverlay from './VideoSubtitleOverlay';

interface VideoPlayerProps {
  videoUrl?: string;
  title: string;
  animeTitle?: string;
  episodeNumber: number;
  animeSlug?: string;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

const PRESET_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({
  videoUrl = '',
  title,
  animeTitle,
  episodeNumber,
  animeSlug = '',
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
}: VideoPlayerProps) {
  const [isCinema, setIsCinema] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [playerSpeedMenuOpen, setPlayerSpeedMenuOpen] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);
  const effectiveFullscreen = isFullscreen || isWebFullscreen;

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle Fullscreen: On iPhone/iOS, use CSS Web Fullscreen (fixed full viewport) to preserve custom controls & subtitle overlay.
  // NEVER call video.webkitEnterFullscreen() on iPhone to avoid Apple's native controller stripping custom web UI.
  const toggleFullscreen = useCallback(async () => {
    const isIPhone = typeof navigator !== 'undefined' && /iPhone|iPod/.test(navigator.userAgent || '');

    // 1. If currently in Web Fullscreen -> Exit Web Fullscreen
    if (isWebFullscreen) {
      setIsWebFullscreen(false);
      return;
    }

    // 2. If currently in Native Element Fullscreen -> Exit Native Fullscreen
    const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
    if (fsElement) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (e) {
        console.error('Failed to exit fullscreen:', e);
      }
      return;
    }

    // 3. On iPhone -> Always use CSS Web Fullscreen (keeps 100% web UI, subtitles & dictionary clickable)
    if (isIPhone) {
      setIsWebFullscreen(true);
      return;
    }

    // 4. On Desktop / Android / iPad: Try HTML Element Fullscreen API on container
    if (containerRef.current?.requestFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (e) {
        console.warn('Container requestFullscreen failed, falling back to Web Fullscreen:', e);
        setIsWebFullscreen(true);
      }
    } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
      try {
        await (containerRef.current as any).webkitRequestFullscreen();
      } catch (e) {
        console.warn('Container webkitRequestFullscreen failed, falling back to Web Fullscreen:', e);
        setIsWebFullscreen(true);
      }
    } else {
      // Fallback to CSS Web Fullscreen
      setIsWebFullscreen(true);
    }
  }, [isWebFullscreen]);

  // Lock/unlock body scroll when in Web Fullscreen on mobile
  useEffect(() => {
    if (isWebFullscreen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isWebFullscreen]);

  // Sync isFullscreen state with document fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      const fsElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fsElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Controls Visibility Timer (Auto-hide on idle when playing)
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setSpeedMenuOpen(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    } else {
      showControls();
    }
  }, [isPlaying, showControls]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
    } else {
      videoRef.current.pause();
    }
  }, []);

  // Get effective duration safely
  const getSeekDuration = useCallback(() => {
    if (videoRef.current?.duration && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0 && isFinite(videoRef.current.duration)) {
      return videoRef.current.duration;
    }
    if (duration && !isNaN(duration) && duration > 0 && isFinite(duration)) {
      return duration;
    }
    return 0;
  }, [duration]);

  // Seek by seconds
  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const dur = getSeekDuration();
    const maxDur = dur > 0 ? dur : 999999;
    const nextTime = Math.max(0, Math.min(maxDur, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [getSeekDuration]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setSubtitlesEnabled((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => {
          if (videoRef.current) videoRef.current.muted = !prev;
          return !prev;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume((prev) => {
          const v = Math.min(1.0, prev + 0.1);
          if (videoRef.current) videoRef.current.volume = v;
          return v;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((prev) => {
          const v = Math.max(0.0, prev - 0.1);
          if (videoRef.current) videoRef.current.volume = v;
          return v;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, seekRelative]);

  // Handle Playback Speed
  const applySpeed = (speed: number) => {
    const clamped = Math.round(Math.min(2.0, Math.max(0.1, speed)) * 100) / 100;
    setPlaybackSpeed(clamped);
    if (videoRef.current) {
      videoRef.current.playbackRate = clamped;
    }
  };

  const adjustSpeedStep = (delta: number) => {
    applySpeed(playbackSpeed + delta);
  };

  // Timeline Scrubbing (Mouse & Touch)
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dur = getSeekDuration();
    if (!progressBarRef.current || !videoRef.current || dur <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * dur;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const dur = getSeekDuration();
    if (!progressBarRef.current || dur <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * dur);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dur = getSeekDuration();
    if (!progressBarRef.current || !videoRef.current || dur <= 0) return;
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const target = pos * dur;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    setHoverPos(touch.clientX - rect.left);
    setHoverTime(target);
  };

  const { embedUrl, directUrl, type } = formatVideoUrl(videoUrl);

  const isBackblaze = videoUrl.includes('backblazeb2.com') || videoUrl.includes('.b2.');
  const isPublicVideo = videoUrl.startsWith('/videos/') || videoUrl.startsWith('/posters/');
  const isLocalDiskPath = videoUrl.startsWith('/home/') || videoUrl.startsWith('/tmp/');
  const isApiStream = videoUrl.startsWith('/api/stream');

  let videoSrc: string | null = null;
  if (directUrl) {
    videoSrc = directUrl;
  } else if (isBackblaze || isPublicVideo || isApiStream) {
    videoSrc = videoUrl;
  } else if (isLocalDiskPath) {
    videoSrc = `/api/stream?file=${encodeURIComponent(videoUrl)}`;
  }

  const finalVideoSrc = videoSrc || videoUrl;

  const handleVideoError = () => {
    console.warn('Video load event notification for:', finalVideoSrc);
    setHasError(true);
  };

  return (
    <div className={`w-full transition-all duration-300 ${isCinema ? 'max-w-none' : 'max-w-5xl mx-auto'}`}>
      {/* Video Container (16:9 Aspect Ratio & Fullscreen Container) */}
      <div
        ref={containerRef}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center select-none group ${
          effectiveFullscreen ? '!fixed !inset-0 !w-screen !h-[100dvh] !max-w-none !rounded-none !border-0 z-[999999]' : ''
        }`}
      >
        {!videoUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-gray-950">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-semibold text-white">Chưa có link video cho tập này</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Vui lòng dán link video cho tập {episodeNumber}.
            </p>
          </div>
        ) : useEmbedFallback && embedUrl ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <>
            {/* Raw HTML5 Video Element (without native controls, playsinline for iOS WebKit) */}
            <video
              ref={videoRef}
              key={finalVideoSrc}
              src={finalVideoSrc}
              autoPlay
              playsInline
              webkit-playsinline="true"
              preload="auto"
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const cur = videoRef.current.currentTime;
                  setCurrentTime(cur);
                  const dur = videoRef.current.duration;
                  if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
                    if (duration !== dur) {
                      setDuration(dur);
                    }
                    if (videoRef.current.buffered.length > 0) {
                      setBuffered(
                        (videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / dur) * 100
                      );
                    }
                  }
                }
              }}
              onDurationChange={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.duration;
                  if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
                    setDuration(dur);
                  }
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.duration;
                  if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
                    setDuration(dur);
                  }
                  videoRef.current.playbackRate = playbackSpeed;
                  videoRef.current.volume = volume;
                  videoRef.current.muted = isMuted;
                }
              }}
              onLoadedData={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.duration;
                  if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
                    setDuration(dur);
                  }
                }
              }}
              onCanPlay={() => {
                if (videoRef.current) {
                  const dur = videoRef.current.duration;
                  if (dur && !isNaN(dur) && dur > 0 && isFinite(dur)) {
                    setDuration(dur);
                  }
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleVideoError}
              className="w-full h-full object-contain bg-black cursor-pointer"
            >
              Trình duyệt không hỗ trợ thẻ video HTML5.
            </video>

            {hasError && !useEmbedFallback && (
              <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-400" />
                <div className="space-y-1">
                  <p className="text-white text-base font-semibold">Đang nạp lại luồng video...</p>
                  <p className="text-gray-400 text-xs max-w-sm">
                    Nếu mạng tải chậm hoặc bị nghẽn, bạn có thể tải lại hoặc chuyển sang Server Google Drive Embed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setHasError(false);
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
                  >
                    Tải lại luồng
                  </button>
                  {embedUrl && (
                    <button
                      type="button"
                      onClick={() => setUseEmbedFallback(true)}
                      className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold active:scale-95 transition-all"
                    >
                      Dùng Player GDrive Embed
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* In-Frame eJOY Interactive Subtitle Overlay */}
            <VideoSubtitleOverlay
              currentTime={currentTime}
              animeTitle={animeTitle}
              animeSlug={animeSlug}
              episodeNumber={episodeNumber}
              videoRef={videoRef}
              isFullscreen={effectiveFullscreen}
              subtitlesEnabled={subtitlesEnabled}
              onToggleFullscreen={toggleFullscreen}
            />

            {/* Custom Modern Video Control Bar */}
            <div
              className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 pointer-events-auto bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-8 pb-3 px-3 sm:px-4 ${
                controlsVisible || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Timeline Progress Bar */}
              <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                onMouseMove={handleProgressMouseMove}
                onMouseLeave={() => setHoverTime(null)}
                onTouchStart={handleProgressTouch}
                onTouchMove={handleProgressTouch}
                onTouchEnd={() => setHoverTime(null)}
                className="relative w-full py-2.5 -my-2 cursor-pointer transition-all mb-2 group/bar flex items-center touch-none select-none"
              >
                {/* Track background */}
                <div className="relative w-full h-2 sm:h-2 group-hover/bar:h-2.5 bg-white/20 rounded-full overflow-hidden transition-all pointer-events-none">
                  {/* Buffer Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, buffered))}%` }}
                  />

                  {/* Played Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-500 to-purple-500 rounded-full"
                    style={{ width: `${(duration && duration > 0) ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>

                {/* Thumb Knob (Centered on current playhead position) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-lg shadow-black/70 ring-2 ring-rose-500 pointer-events-none transition-transform duration-75 group-hover/bar:scale-125"
                  style={{ left: `${(duration && duration > 0) ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0}%` }}
                />

                {/* Hover Time Tooltip */}
                {hoverTime !== null && (
                  <div
                    className="absolute -top-7 -translate-x-1/2 bg-gray-900/90 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow border border-gray-700 pointer-events-none"
                    style={{ left: `${hoverPos}px` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>

              {/* 2. Controls Action Row */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-white">
                {/* Left Controls: Play/Pause, Skip 10s, Volume, Time */}
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
                    title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => seekRelative(-10)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                    title="Lùi 10s (Phím ←)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => seekRelative(10)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                    title="Tua 10s (Phím →)"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume Controls (Hidden slider on small mobile to save space for phone hardware keys) */}
                  <div className="flex items-center gap-1.5 group/vol">
                    <button
                      type="button"
                      onClick={() => {
                        const newMuted = !isMuted;
                        setIsMuted(newMuted);
                        if (videoRef.current) videoRef.current.muted = newMuted;
                      }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Âm lượng (Phím M)"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        setIsMuted(false);
                        if (videoRef.current) {
                          videoRef.current.volume = v;
                          videoRef.current.muted = false;
                        }
                      }}
                      style={{
                        background: `linear-gradient(to right, #f43f5e 0%, #f43f5e ${
                          (isMuted ? 0 : volume) * 100
                        }%, #374151 ${(isMuted ? 0 : volume) * 100}%, #374151 100%)`,
                      }}
                      className="hidden sm:block w-14 sm:w-20 h-1.5 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-[11px] sm:text-xs font-mono text-gray-300 select-none ml-0.5 sm:ml-1 whitespace-nowrap">
                    <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                    <span className="text-gray-500">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls: Speed, Prev/Next, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Speed Button inside Player */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayerSpeedMenuOpen((prev) => !prev);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-all active:scale-95 cursor-pointer"
                      title="Tốc độ phát"
                    >
                      <Gauge className="w-3.5 h-3.5 text-rose-400" />
                      <span>{playbackSpeed.toFixed(2)}x</span>
                    </button>

                    {playerSpeedMenuOpen && (
                      <div
                        className="absolute right-0 bottom-full mb-3 w-64 bg-[#131722]/95 backdrop-blur-md border border-gray-700/90 rounded-2xl shadow-2xl p-3.5 text-white z-50 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                            <Gauge className="w-3.5 h-3.5 text-rose-400" />
                            <span>Tốc độ phát</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySpeed(1.0)}
                            className="text-[11px] text-gray-400 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-gray-800"
                            title="Đặt lại 1.0x"
                          >
                            1.0x
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 mb-3">
                          {PRESET_SPEEDS.map((speed) => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => {
                                applySpeed(speed);
                                setPlayerSpeedMenuOpen(false);
                              }}
                              className={`py-1 rounded-lg text-xs font-semibold transition-all ${
                                Math.abs(playbackSpeed - speed) < 0.01
                                  ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white font-bold'
                                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min="0.25"
                          max="2.00"
                          step="0.05"
                          value={playbackSpeed}
                          onChange={(e) => applySpeed(parseFloat(e.target.value))}
                          style={{
                            background: `linear-gradient(to right, #f43f5e 0%, #f43f5e ${
                              ((playbackSpeed - 0.25) / 1.75) * 100
                            }%, #374151 ${((playbackSpeed - 0.25) / 1.75) * 100}%, #374151 100%)`,
                          }}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                          <span>0.25x</span>
                          <span className="text-white font-bold">{playbackSpeed.toFixed(2)}x</span>
                          <span>2.00x</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subtitles CC Toggle Button (YouTube Style) */}
                  <button
                    type="button"
                    onClick={() => setSubtitlesEnabled((prev) => !prev)}
                    className={`relative p-2 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                      subtitlesEnabled
                        ? 'bg-rose-600/30 text-rose-300 border border-rose-500/60 hover:bg-rose-600/40 shadow-sm shadow-rose-500/20'
                        : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 border border-white/10'
                    }`}
                    title={subtitlesEnabled ? 'Tắt phụ đề Engsub (Phím C)' : 'Bật phụ đề Engsub (Phím C)'}
                  >
                    <span className="font-black text-xs px-0.5 tracking-tighter select-none">CC</span>
                    {subtitlesEnabled && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 bg-rose-500 rounded-full" />
                    )}
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
                    title={effectiveFullscreen ? 'Thu nhỏ (Phím F)' : 'Toàn màn hình (Phím F)'}
                  >
                    {effectiveFullscreen ? (
                      <Minimize2 className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Controls Bar */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-gray-900/90 p-3 sm:p-3.5 rounded-2xl border border-gray-800 text-sm shadow-md">
        {/* Episode Badge & Clean Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 font-bold text-xs border border-rose-500/30 flex-shrink-0">
            Tập {episodeNumber}
          </span>
          {(() => {
            const cleanTitle = (title || '')
              .replace(new RegExp(`^(Tập|Episode|Ep)\\s*${episodeNumber}\\s*[:\\-–—]?\\s*`, 'i'), '')
              .replace(new RegExp(`^(Tập|Episode|Ep)\\s*\\d+\\s*[:\\-–—]?\\s*`, 'i'), '')
              .trim();
            return cleanTitle ? (
              <span className="text-gray-200 font-medium text-xs sm:text-sm truncate">
                {cleanTitle}
              </span>
            ) : null;
          })()}
        </div>

        {/* Buttons Control Group (Grid on mobile, flex on desktop) */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60 sm:ml-auto">
          {/* Speed Selector (Analog Slider 0.10x - 2.00x) */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSpeedMenuOpen((prev) => !prev);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700/80 transition-colors shadow-sm"
              title="Tốc độ phát lại"
            >
              <Gauge className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{playbackSpeed.toFixed(2)}x</span>
              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </button>

            {speedMenuOpen && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-3 pb-6 sm:p-0 sm:bg-transparent sm:backdrop-blur-none sm:block sm:inset-auto sm:absolute sm:right-0 sm:bottom-full sm:mb-2 sm:w-72"
                onClick={() => setSpeedMenuOpen(false)}
              >
                <div
                  className="w-full max-w-sm sm:max-w-none bg-[#131722] border border-gray-700/80 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* Header & Reset / Close */}
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-gray-200">Tốc độ phát (Analog)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applySpeed(1.0)}
                        title="Đặt lại 1.00x"
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">1.0x</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeedMenuOpen(false)}
                        className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        title="Đóng"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Big Display & Fine-tune */}
                  <div className="flex items-center justify-between bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-2 mb-3">
                    <button
                      type="button"
                      onClick={() => adjustSpeedStep(-0.05)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 transition-all"
                      title="Giảm 0.05x"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                      <span className="text-xl font-black bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
                        {playbackSpeed.toFixed(2)}x
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => adjustSpeedStep(0.05)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 transition-all"
                      title="Tăng 0.05x"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Analog Slider */}
                  <div className="mb-3 px-1">
                    <input
                      type="range"
                      min="0.10"
                      max="2.00"
                      step="0.01"
                      value={playbackSpeed}
                      onChange={(e) => applySpeed(parseFloat(e.target.value))}
                      style={{
                        background: `linear-gradient(to right, #f43f5e 0%, #f43f5e ${
                          ((playbackSpeed - 0.1) / 1.9) * 100
                        }%, #374151 ${((playbackSpeed - 0.1) / 1.9) * 100}%, #374151 100%)`,
                      }}
                      className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-rose-500 touch-none"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-mono">
                      <span>0.10x</span>
                      <span className="text-gray-400 font-semibold">1.00x (Chuẩn)</span>
                      <span>2.00x</span>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-2.5 border-t border-gray-800/80">
                    <div className="text-[10px] text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                      Mức nhanh:
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_SPEEDS.map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={() => applySpeed(speed)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                            Math.abs(playbackSpeed - speed) < 0.01
                              ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-sm shadow-rose-600/30 font-bold'
                              : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Previous Ep */}
          {hasPrev ? (
            <a
              href={animeSlug ? `/watch/${animeSlug}?ep=${episodeNumber - 1}` : `?ep=${episodeNumber - 1}`}
              onClick={(e) => {
                e.preventDefault();
                if (onPrev) onPrev();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white transition-all active:scale-95 cursor-pointer select-none"
              title="Tập trước"
            >
              <SkipBack className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Tập trước</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-medium bg-gray-800/40 text-gray-600 cursor-not-allowed"
              title="Tập trước"
            >
              <SkipBack className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Tập trước</span>
            </button>
          )}

          {/* Next Ep */}
          {hasNext ? (
            <a
              href={animeSlug ? `/watch/${animeSlug}?ep=${episodeNumber + 1}` : `?ep=${episodeNumber + 1}`}
              onClick={(e) => {
                e.preventDefault();
                if (onNext) onNext();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-600 to-purple-600 text-white hover:from-rose-500 hover:to-purple-500 shadow-sm transition-all active:scale-95 cursor-pointer select-none"
              title="Tập tiếp theo"
            >
              <span>Tập tiếp</span>
              <SkipForward className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-gray-800/40 text-gray-600 cursor-not-allowed"
              title="Tập tiếp theo"
            >
              <span>Tập tiếp</span>
              <SkipForward className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          )}

          {/* Server Switch (Direct HTML5 with Subtitles vs GDrive Embed) */}
          {embedUrl && (
            <button
              type="button"
              onClick={() => {
                setUseEmbedFallback(!useEmbedFallback);
                setHasError(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                useEmbedFallback
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
              title={
                useEmbedFallback
                  ? 'Đang dùng Player GDrive Embed. Nhấn để về Server Trực Tiếp (tra từ, phụ đề)'
                  : 'Đang dùng Server Trực Tiếp. Nhấn nếu muốn chuyển sang Player GDrive Embed dự phòng'
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${useEmbedFallback ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>{useEmbedFallback ? 'GDrive Embed' : 'Server Chính'}</span>
            </button>
          )}

          {/* Cinema mode toggle (Desktop only) */}
          <button
            type="button"
            onClick={() => setIsCinema(!isCinema)}
            className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isCinema
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
            }`}
            title="Rạp chiếu phim (Mở rộng)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isCinema ? 'Thu gọn' : 'Mở rộng'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

