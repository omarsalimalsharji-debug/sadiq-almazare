import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Sparkles,
  Music,
  Radio as RadioIcon
} from 'lucide-react';
import { HAZZA_AL_BALUSHI_SURAHS, QuranSurah } from '../data/agriculturalData.ts';
import { useAudio } from '../context/AudioContext.tsx';

interface QuranPlayerProps {
  compact?: boolean;
}

export const QuranPlayer: React.FC<QuranPlayerProps> = ({ compact = false }) => {
  const { 
    trackType,
    currentSurah, 
    isPlaying, 
    playbackStatus,
    playQuran, 
    togglePlay, 
    nextSurah, 
    prevSurah, 
    currentTime, 
    duration, 
    seek, 
    volume, 
    setVolume, 
    isMuted, 
    toggleMute,
    errorMessage
  } = useAudio();

  const activeSurah = currentSurah || HAZZA_AL_BALUSHI_SURAHS[0];
  const isThisQuranPlaying = isPlaying && trackType === 'quran';

  const handleSurahSelect = (surahId: number) => {
    playQuran(surahId);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white p-4 sm:p-6 shadow-md border border-emerald-800/40 relative overflow-hidden transition-all">
      {/* Subtle Islamic ambient background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none ramadan-pattern" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Reciter & Surah Info */}
        <div className="flex items-center gap-4 w-full md:w-auto text-right">
          <div className="w-12 h-12 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-emerald-300 font-semibold tracking-wide">
                القرآن الكريم · تلاوة عطرة
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-800/60 text-emerald-200 border border-emerald-700/50">
                القارئ: الشيخ هزاع البلوشي (سلطنة عُمان)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{activeSurah.name}</span>
              <span className="text-xs text-stone-300 font-normal">({activeSurah.revelationType} · {activeSurah.ayatCount} آية)</span>
            </h3>
          </div>
        </div>

        {/* Surah Dropdown Selector */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <label htmlFor="surah-select" className="text-xs text-stone-300 whitespace-nowrap">السورة:</label>
          <select
            id="surah-select"
            value={activeSurah.id}
            onChange={(e) => handleSurahSelect(Number(e.target.value))}
            className="w-full md:w-56 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-700/60 text-emerald-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            {HAZZA_AL_BALUSHI_SURAHS.map((s) => (
              <option key={s.id} value={s.id} className="bg-stone-900 text-white">
                {s.id}. {s.name} ({s.ayatCount} آية)
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={prevSurah}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-emerald-800/50 transition-colors"
            title="السورة السابقة"
          >
            <SkipBack className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={() => {
              if (trackType === 'quran') {
                togglePlay();
              } else {
                playQuran(activeSurah.id);
              }
            }}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 flex items-center justify-center font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={isThisQuranPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {playbackStatus === 'buffering' && trackType === 'quran' ? (
              <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
            ) : isThisQuranPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current mr-0.5" />
            )}
          </button>

          <button
            onClick={nextSurah}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-emerald-800/50 transition-colors"
            title="السورة التالية"
          >
            <SkipForward className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Volume & Seek (for non-compact) */}
        {!compact && (
          <div className="w-full md:w-44 flex items-center gap-2">
            <button 
              onClick={toggleMute} 
              className="text-stone-300 hover:text-white p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-emerald-400 h-1 bg-emerald-950 rounded cursor-pointer"
            />
          </div>
        )}

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
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-emerald-950/80 rounded-lg cursor-pointer"
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {errorMessage && trackType === 'quran' && (
        <div className="mt-2 text-xs text-amber-300 text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
