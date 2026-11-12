import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  X, 
  BookMarked, 
  Radio as RadioIcon,
  Maximize2,
  Signal
} from 'lucide-react';
import { useAudio } from '../context/AudioContext.tsx';
import { ActivePage } from '../types/index.ts';

interface GlobalMiniPlayerProps {
  onNavigate: (page: ActivePage) => void;
}

export const GlobalMiniPlayer: React.FC<GlobalMiniPlayerProps> = ({ onNavigate }) => {
  const { 
    trackType, 
    currentSurah, 
    currentRadio, 
    isPlaying, 
    playbackStatus, 
    currentTime, 
    duration, 
    togglePlay, 
    nextSurah, 
    isMuted, 
    toggleMute, 
    stopAudio,
    errorMessage 
  } = useAudio();

  // If nothing is playing or loaded, don't show the bar
  if (!trackType) return null;

  const isQuran = trackType === 'quran';
  const title = isQuran ? currentSurah?.name : currentRadio?.name;
  const subtitle = isQuran 
    ? `القارئ الشيخ هزاع البلوشي · ${currentSurah?.revelationType}` 
    : currentRadio?.subtitle;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 px-3 pb-2 sm:pb-3 pointer-events-none transition-all duration-300"
      aria-label="مشغل الصوت المصغر المستمر"
    >
      <div className="max-w-4xl mx-auto bg-stone-900/95 dark:bg-stone-900/98 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden pointer-events-auto">
        
        {/* Subtle top progress line for Quran */}
        {isQuran && (
          <div className="w-full h-1 bg-stone-800">
            <div 
              className="h-full bg-emerald-500 transition-all duration-200" 
              style={{ width: `${progressPct}%` }} 
            />
          </div>
        )}

        <div className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
          
          {/* Track Info (Click to jump to full player) */}
          <div 
            onClick={() => onNavigate(isQuran ? 'quran' : 'radio')}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
            title="انقر لفتح المشغل الكامل"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
              isQuran ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white'
            }`}>
              {isQuran ? <BookMarked className="w-5 h-5" /> : <RadioIcon className="w-5 h-5" />}
            </div>

            <div className="min-w-0 text-right">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                  {title}
                </span>
                {playbackStatus === 'playing' && (
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-stone-300 truncate">
                {subtitle}
              </div>
            </div>
          </div>

          {/* Controls: Play/Pause, Next (Quran), Mute, Maximize, Close */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Quran Next Surah */}
            {isQuran && (
              <button
                onClick={nextSurah}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
                title="السورة التالية"
              >
                <SkipForward className="w-4 h-4 rotate-180" />
              </button>
            )}

            {/* Play / Pause Button */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 flex items-center justify-center font-bold shadow-md transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current mr-0.5" />
              )}
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Maximize */}
            <button
              onClick={() => onNavigate(isQuran ? 'quran' : 'radio')}
              className="p-1.5 rounded-lg text-stone-300 hover:text-emerald-400 hover:bg-stone-800 transition-colors"
              title="تكبير المشغل"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close / Stop */}
            <button
              onClick={stopAudio}
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
              title="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>

          </div>

        </div>

        {errorMessage && (
          <div className="px-4 py-1 text-[11px] bg-amber-500/20 text-amber-300 text-center border-t border-amber-500/30">
            {errorMessage}
          </div>
        )}

      </div>
    </div>
  );
};
