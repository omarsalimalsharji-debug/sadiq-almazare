import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Pause, Square, SkipForward, SkipBack, Volume2, Gauge, Sparkles,
} from 'lucide-react';
import {
  getMurshidAudioPrefs,
  pauseMurshidAudio,
  subscribeMurshidSpeaking,
  resumeMurshidAudio,
  setMurshidVolume,
  speakMurshid,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';

interface BookSpeechControlsProps {
  paragraphs: string[];
  pageKey: string;
  activeParagraphIndex: number | null;
  onActiveParagraphChange: (index: number | null) => void;
}

const SPEED_OPTIONS = [0.85, 1.0, 1.1, 1.2];

export const BookSpeechControls: React.FC<BookSpeechControlsProps> = ({
  paragraphs,
  pageKey,
  activeParagraphIndex,
  onActiveParagraphChange,
}) => {
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [volume, setVolume] = useState(() => getMurshidAudioPrefs().volume);
  const [audioError, setAudioError] = useState(false);
  const runIdRef = useRef(0);
  const currentIndexRef = useRef(0);
  const rateRef = useRef(rate);
  const paragraphsRef = useRef(paragraphs);

  rateRef.current = rate;
  paragraphsRef.current = paragraphs;

  const stopSpeech = useCallback(() => {
    runIdRef.current += 1;
    setStatus('idle');
    onActiveParagraphChange(null);
    stopAllMurshidAudio();
  }, [onActiveParagraphChange]);

  const speakFromParagraph = useCallback((startIndex: number) => {
    const list = paragraphsRef.current;
    if (startIndex < 0 || startIndex >= list.length) {
      stopSpeech();
      return;
    }

    stopAllMurshidAudio();
    const runId = ++runIdRef.current;
    setAudioError(false);
    const playParagraph = (index: number) => {
      if (runIdRef.current !== runId) return;
      if (index >= paragraphsRef.current.length) {
        setStatus('idle');
        onActiveParagraphChange(null);
        return;
      }
      currentIndexRef.current = index;
      onActiveParagraphChange(index);
      setStatus('playing');
      speakMurshid(paragraphsRef.current[index], {
        rate: rateRef.current,
        mood: 'curious',
        preferStudioAudio: true,
        onSpeakingChange: (speaking) => {
          if (runIdRef.current === runId && speaking) setStatus('playing');
        },
        onEnd: () => {
          if (runIdRef.current !== runId) return;
          playParagraph(index + 1);
        },
        onError: () => {
          if (runIdRef.current !== runId) return;
          setAudioError(true);
          setStatus('idle');
          onActiveParagraphChange(index);
        },
      });
    };
    playParagraph(startIndex);
  }, [onActiveParagraphChange, stopSpeech]);

  useEffect(() => {
    stopSpeech();
    currentIndexRef.current = 0;
  }, [pageKey, stopSpeech]);

  useEffect(() => {
    const unsubscribe = subscribeMurshidAudioPrefs((prefs) => {
      setVolume(prefs.volume);
      if (prefs.muted) stopSpeech();
    });
    const unsubscribeSpeaking = subscribeMurshidSpeaking((speaking) => {
      if (!speaking) setStatus('idle');
    });
    return () => {
      unsubscribe();
      unsubscribeSpeaking();
      stopAllMurshidAudio();
    };
  }, [onActiveParagraphChange, stopSpeech]);

  const handlePlay = async () => {
    if (status === 'paused') {
      const resumed = await resumeMurshidAudio();
      if (resumed) {
        setStatus('playing');
        return;
      }
    }
    const start = activeParagraphIndex ?? currentIndexRef.current;
    speakFromParagraph(Math.max(0, Math.min(start, paragraphs.length - 1)));
  };

  const handlePause = () => {
    if (pauseMurshidAudio()) setStatus('paused');
  };

  const handlePrev = () => {
    const next = Math.max(0, (activeParagraphIndex ?? currentIndexRef.current) - 1);
    currentIndexRef.current = next;
    if (status !== 'idle') speakFromParagraph(next);
    else onActiveParagraphChange(next);
  };

  const handleNext = () => {
    const next = Math.min(Math.max(0, paragraphs.length - 1), (activeParagraphIndex ?? currentIndexRef.current) + 1);
    currentIndexRef.current = next;
    if (status !== 'idle') speakFromParagraph(next);
    else onActiveParagraphChange(next);
  };

  const handleCycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(rate);
    const nextRate = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setRate(nextRate);
    rateRef.current = nextRate;
    if (status === 'playing') speakFromParagraph(currentIndexRef.current);
  };

  const handleVolume = (next: number) => {
    setVolume(next);
    setMurshidVolume(next);
  };

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 sm:px-4 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 ml-1">
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>قراءة الكتاب بصوت مرشد الذكي</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-1 text-[10px] text-emerald-800 dark:text-emerald-200">
              <Sparkles className="h-3 w-3" /> صوت عربي طبيعي
            </span>
          </div>
          <button type="button" onClick={handlePrev} disabled={paragraphs.length === 0} className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center disabled:opacity-40" title="الفقرة السابقة"><SkipForward className="w-4 h-4" /></button>
          {status === 'playing' ? (
            <button type="button" onClick={handlePause} className="min-h-[38px] px-3 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"><Pause className="w-3.5 h-3.5" /><span>إيقاف مؤقت</span></button>
          ) : (
            <button type="button" onClick={handlePlay} disabled={paragraphs.length === 0} className="min-h-[38px] px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40"><Play className="w-3.5 h-3.5" /><span>{status === 'paused' ? 'استئناف' : 'تشغيل'}</span></button>
          )}
          <button type="button" onClick={stopSpeech} disabled={status === 'idle' && activeParagraphIndex === null} className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center disabled:opacity-40" title="إيقاف"><Square className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={handleNext} disabled={paragraphs.length === 0} className="min-h-[38px] min-w-[38px] px-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center disabled:opacity-40" title="الفقرة التالية"><SkipBack className="w-4 h-4" /></button>
          <button type="button" onClick={handleCycleSpeed} className="min-h-[38px] px-2.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono font-bold flex items-center gap-1" title="سرعة القراءة"><Gauge className="w-3.5 h-3.5 text-emerald-600" /><span>{rate}x</span></button>
        </div>
        <label className="flex w-full sm:w-44 items-center gap-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
          <Volume2 className="h-4 w-4 shrink-0" />
          <input aria-label="مستوى صوت مرشد" type="range" min="0" max="100" value={volume} onChange={(event) => handleVolume(Number(event.target.value))} className="w-full accent-emerald-600" />
        </label>
      </div>
      <p className="text-[10px] leading-5 text-emerald-800/80 dark:text-emerald-200/80">يستخدم القارئ الصوت العربي الذكي الموحد لمرشد. عند تعذر توليد الصوت، يبقى النص متاحاً دون التحول إلى صوت الجهاز الآلي.</p>
      {audioError && <p role="status" className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">تعذر إنشاء الصوت الذكي حالياً. تحقق من الاتصال وحاول تشغيل الفقرة مرة أخرى.</p>}
    </div>
  );
};
