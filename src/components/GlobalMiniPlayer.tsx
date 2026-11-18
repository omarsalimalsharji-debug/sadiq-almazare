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
  Maximize2
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

  if (!trackType) return null;

  const isQuran = trackType === 'quran';
  const title = isQuran ? currentSurah?.name : currentRadio?.name;
  const subtitle = isQuran
    ? `القارئ الشيخ هزاع البلوشي · ${currentSurah?.revelationType}`
    : currentRadio?.subtitle;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 px-3 pb-2 md:pb-3 pointer-events-none transition-all duration-300"
      aria-label="مشغل الصوت المصغر المستمر"
    >
      <div className="max-w-4xl mx-auto bg-[#132247]/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-sky-300/20 overflow-hidden pointer-events-auto">
        
        {isQuran && (
          <div className="w-full h-1 bg-[#0b1329]">
            <div
              className="h-full bg-emerald-400 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        <div className="p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
          <div
            onClick={() => onNavigate(isQuran ? 'quran' : 'radio')}
            className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
            title="انقر لفتح المشغل الكامل"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                isQuran ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
              }`}
            >
              {isQuran ? <BookMarked className="w-5 h-5" /> : <RadioIcon className="w-5 h-5" />}
            </div>

            <div className="min-w-0 text-start">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300 transition-colors truncate">
                  {title}
                </span>
                {playbackStatus === 'playing' && (
                  <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                    جاري التشغيل
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {subtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isQuran && (
              <button
                onClick={nextSurah}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="السورة التالية"
              >
                <SkipForward className="w-4 h-4 rotate-180" />
              </button>
            )}

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0b1329] flex items-center justify-center font-bold shadow-md transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current mr-0.5" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="hidden sm:inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onNavigate(isQuran ? 'quran' : 'radio')}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-300 hover:text-emerald-300 hover:bg-white/10 transition-colors"
              title="تكبير المشغل"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={stopAudio}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-400 hover:bg-white/10 transition-colors"
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
