import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { HAZZA_AL_BALUSHI_SURAHS, QuranSurah } from '../data/agriculturalData.ts';

interface QuranPlayerProps {
  compact?: boolean;
}

export const QuranPlayer: React.FC<QuranPlayerProps> = ({ compact = false }) => {
  const [currentSurahIndex, setCurrentSurahIndex] = useState<number>(() => {
    const saved = localStorage.getItem('farmer_last_surah_idx');
    return saved !== null ? Number(saved) : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surah = HAZZA_AL_BALUSHI_SURAHS[currentSurahIndex] || HAZZA_AL_BALUSHI_SURAHS[0];

  // Save last listened position
  useEffect(() => {
    localStorage.setItem('farmer_last_surah_idx', currentSurahIndex.toString());
  }, [currentSurahIndex]);

  // Handle audio play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setAudioError(null);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Playback error:', err);
        setAudioError('تعذر بدء البث الصوتي حالياً، يرجى المحاولة ثانية');
        setIsPlaying(false);
      });
    }
  };

  const handleNext = () => {
    setCurrentSurahIndex((prev) => (prev + 1) % HAZZA_AL_BALUSHI_SURAHS.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setCurrentSurahIndex((prev) => (prev - 1 + HAZZA_AL_BALUSHI_SURAHS.length) % HAZZA_AL_BALUSHI_SURAHS.length);
    setIsPlaying(true);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white p-4 sm:p-6 shadow-md border border-emerald-800/40 relative overflow-hidden transition-all">
      {/* Subtle Islamic ambient background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none ramadan-pattern" />

      <audio
        ref={audioRef}
        src={surah.audioUrl}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            // Restore last playback position if saved
            const savedTime = localStorage.getItem(`surah_${surah.id}_time`);
            if (savedTime && Number(savedTime) < audioRef.current.duration - 5) {
              audioRef.current.currentTime = Number(savedTime);
            }
            if (isPlaying) {
              audioRef.current.play().catch(() => setIsPlaying(false));
            }
          }
        }}
        onEnded={handleNext}
        onError={() => {
          setAudioError('تعذر تحميل الملف الصوتي، جاري إعادة المحاولة.');
          setIsPlaying(false);
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Reciter & Surah Info */}
        <div className="flex items-center gap-4 w-full md:w-auto text-right">
          <div className="w-12 h-12 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-semibold tracking-wide">
                القرآن الكريم · تلاوة عطرة
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-800/60 text-emerald-200 border border-emerald-700/50">
                القارئ: الشيخ هزاع البلوشي (عُمان)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{surah.name}</span>
              <span className="text-xs text-stone-300 font-normal">({surah.revelationType} · {surah.ayatCount} آية)</span>
            </h3>
          </div>
        </div>

        {/* Surah Dropdown Selector */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <label htmlFor="surah-select" className="text-xs text-stone-300 whitespace-nowrap">السورة:</label>
          <select
            id="surah-select"
            value={currentSurahIndex}
            onChange={(e) => {
              setCurrentSurahIndex(Number(e.target.value));
              setIsPlaying(true);
            }}
            className="w-full md:w-56 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-700/60 text-emerald-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {HAZZA_AL_BALUSHI_SURAHS.map((s, idx) => (
              <option key={s.id} value={idx} className="bg-stone-900 text-white">
                {s.id}. {s.name} ({s.ayatCount} آية)
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-emerald-800/50 transition-colors"
            title="السورة السابقة"
          >
            <SkipBack className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current mr-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-emerald-800/50 transition-colors"
            title="السورة التالية"
          >
            <SkipForward className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Volume & Seek (for non-compact) */}
        <div className="w-full md:w-48 flex items-center gap-2">
          <button 
            onClick={() => {
              if (audioRef.current) {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                audioRef.current.muted = nextMute;
              }
            }} 
            className="text-stone-300 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              setVolume(val);
              setIsMuted(false);
              if (audioRef.current) {
                audioRef.current.volume = val;
                audioRef.current.muted = false;
              }
            }}
            className="w-full accent-emerald-400 h-1 bg-emerald-950 rounded cursor-pointer"
          />
        </div>

      </div>

      {/* Progress slider bar */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-stone-400 font-mono">
        <span>{formatTime(currentTime)}</span>
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) {
                audioRef.current.currentTime = val;
                localStorage.setItem(`surah_${surah.id}_time`, val.toString());
              }
            }}
            className="w-full accent-emerald-400 h-1.5 bg-emerald-950/80 rounded-lg cursor-pointer"
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {audioError && (
        <div className="mt-2 text-xs text-amber-300 text-center">
          {audioError}
        </div>
      )}
    </div>
  );
};
