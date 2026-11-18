import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Square, Play } from 'lucide-react';
import {
  getMurshidAudioPrefs,
  MurshidAudioPrefs,
  setMurshidMuted,
  setMurshidVolume,
  speakMurshid,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
  subscribeMurshidSpeaking,
} from '../utils/murshidAudio.ts';

interface MurshidAudioControlProps {
  lang?: 'ar' | 'en';
}

export const MurshidAudioControl: React.FC<MurshidAudioControlProps> = ({ lang = 'ar' }) => {
  const [prefs, setPrefs] = useState<MurshidAudioPrefs>(() => getMurshidAudioPrefs());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubPrefs = subscribeMurshidAudioPrefs(setPrefs);
    const unsubSpeak = subscribeMurshidSpeaking(setIsSpeaking);
    return () => {
      unsubPrefs();
      unsubSpeak();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const effectiveMuted = prefs.muted || prefs.volume === 0;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative min-h-[44px] min-w-[44px] px-2 rounded-xl border transition-colors flex items-center justify-center gap-1.5 ${
          isSpeaking
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
            : effectiveMuted
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200/80 dark:border-sky-300/15'
        }`}
        aria-label={lang === 'ar' ? 'التحكم بصوت مُرشد ومستوى الصوت' : 'Murshid Voice & Volume Control'}
        aria-expanded={open}
        title={lang === 'ar' ? 'التحكم بصوت مُرشد' : 'Murshid Voice Control'}
      >
        {effectiveMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
        {isSpeaking && !effectiveMuted && (
          <span
            className="w-2 h-2 rounded-full bg-amber-300 animate-ping"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/25 shadow-2xl p-4 space-y-3.5 z-50 text-slate-900 dark:text-white"
          role="dialog"
          aria-label={lang === 'ar' ? 'إعدادات صوت مُرشد' : 'Murshid Audio Controls'}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'التحكم بصوت مُرشد' : 'Murshid Audio'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">
                {isSpeaking
                  ? lang === 'ar'
                    ? 'جاري التحدث الآن'
                    : 'Speaking now'
                  : effectiveMuted
                    ? lang === 'ar'
                      ? 'الصوت مكتوم'
                      : 'Muted'
                    : lang === 'ar'
                      ? 'الصوت العربي الموحّد جاهز'
                      : 'Unified Arabic voice ready'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMurshidMuted(!effectiveMuted)}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                effectiveMuted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                  : 'bg-slate-100 dark:bg-[#0b1329] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-sky-300/20 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              {effectiveMuted
                ? lang === 'ar'
                  ? 'تفعيل الصوت'
                  : 'Unmute'
                : lang === 'ar'
                  ? 'كتم الصوت'
                  : 'Mute'}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {lang === 'ar' ? 'مستوى الصوت' : 'Volume'}
              </span>
              <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {effectiveMuted ? 0 : prefs.volume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={effectiveMuted ? 0 : prefs.volume}
              onChange={(e) => setMurshidVolume(Number(e.target.value))}
              aria-label={lang === 'ar' ? 'مستوى الصوت' : 'Volume'}
              className="w-full accent-emerald-600 cursor-pointer h-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isSpeaking ? (
              <button
                type="button"
                onClick={() => stopAllMurshidAudio()}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{lang === 'ar' ? 'إيقاف النطق الآن' : 'Stop Speaking'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (effectiveMuted) setMurshidMuted(false);
                  speakMurshid(
                    'حياكم الله في صديق المزارع! أنا مرشد، وصوتي جاهز لمرافقتكم في كل أقسام المزرعة.',
                    { muted: false, mood: 'cheerful' }
                  );
                }}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{lang === 'ar' ? 'تجربة صوت مُرشد' : 'Test Murshid Voice'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
