import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Film,
  Lightbulb,
  Captions,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  SlidersHorizontal,
  BookOpenCheck,
  ClipboardCheck,
  MonitorPlay,
  Search,
  AudioWaveform,
  Share2,
} from 'lucide-react';
import { useShare } from '../context/ShareContext.tsx';
import {
  CartoonEpisode,
  MurshidPose,
  MurshidStageMood,
  INITIAL_CARTOON_EPISODES,
} from '../data/cartoonEpisodesData.ts';
import {
  MURSHID_EXPRESSION_PRESETS,
  MurshidExpression,
} from '../data/murshidDialogue.ts';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import {
  getMurshidAudioPrefs,
  notifyExternalSpeechStarted,
  registerExternalMurshidAudioStopper,
  setExternalSpeechFinished,
  setMurshidMuted,
  setMurshidVolume,
  stopAllMurshidAudio,
  subscribeMurshidAudioPrefs,
} from '../utils/murshidAudio.ts';
import {
  ADDITIONAL_VOICE_LICENSES_AUDIT,
  EpisodeQaReviewState,
  OPEN_SOURCE_VOICE_OPTIONS,
  VIDEO_QA_CHECKLIST,
  VOICE_COMPARISON_TEXT_RAW,
  VOICE_COMPARISON_TEXT_VOCALIZED,
} from '../data/voiceEvaluationData.ts';
import {
  OMANI_PRONUNCIATION_DICTIONARY,
  prepareArabicTextForTts,
} from '../utils/arabicPronunciation.ts';
import { environmentalSfx, AmbientSfxPreset } from '../utils/environmentalSfx.ts';
import { CartoonStageCanvas } from './CartoonStageCanvas.tsx';

const CATEGORIES = [
  'الكل',
  'الري والأفلاج',
  'وقاية النخيل',
  'مكافحة الآفات',
  'التسميد والتربة',
  'البيوت المحمية',
] as const;

const SUGGESTED_TOPICS = [
  'كيف أحمي الليمون العُماني من صانعة الأنفاق؟',
  'الوقت المثالي لتلقيح النخيل في سلطنة عُمان',
  'تقليل ملوحة التربة في المزارع الساحلية بالباطنة',
];

type StudioTab = 'videos' | 'voices' | 'qa';
type VoiceStudioProfile = 'studio' | 'warm' | 'natural';

interface MediaVideoMeta {
  id: string;
  durationSec: number;
  measuredLufs: string;
  measuredTruePeakDb: string;
  size1080pMB: number;
  size480pMB: number;
}

interface VoiceReportEntry {
  voiceId: string;
  mp3Url: string;
  durationSec: number;
  measuredLufs: string;
  measuredTruePeakDb: string;
  cacheHit: boolean;
  sha256Key: string;
}

interface CartoonVideosViewProps {
  initialEpisodeId?: string | null;
}

export const CartoonVideosView: React.FC<CartoonVideosViewProps> = ({ initialEpisodeId }) => {
  const { openShare } = useShare();
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>('videos');

  const [customEpisodes, setCustomEpisodes] = useState<CartoonEpisode[]>(() => {
    try {
      const sanitizeEpisode = (ep: any): CartoonEpisode => ({
        ...ep,
        title: String(ep?.title || '').replace(/فليجان|فلجان/g, 'مُرشد'),
        takeaway: String(ep?.takeaway || '').replace(/فليجان|فلجان/g, 'مُرشد'),
        musicAttribution: ep?.musicAttribution
          ? String(ep.musicAttribution).replace(/فليجان|فلجان/g, 'مُرشد')
          : undefined,
        scenes: Array.isArray(ep?.scenes)
          ? ep.scenes.map((sc: any) => ({
              ...sc,
              narration: String(sc?.narration || '').replace(/فليجان|فلجان/g, 'مُرشد'),
              vocalizedNarration: sc?.vocalizedNarration
                ? String(sc.vocalizedNarration).replace(/فليجان|فلجان/g, 'مُرشد')
                : undefined,
              subtitle: String(sc?.subtitle || '').replace(/فليجان|فلجان/g, 'مُرشد'),
              murshidPose: (sc?.murshidPose || sc?.flijanPose || 'explain') as MurshidPose,
              murshidMood: (sc?.murshidMood || sc?.flijanMood || 'explain') as MurshidStageMood,
            }))
          : [],
      });

      const currentSaved = localStorage.getItem('farmer_murshid_custom_episodes');
      if (currentSaved) {
        const parsed = JSON.parse(currentSaved);
        return Array.isArray(parsed) ? parsed.map(sanitizeEpisode) : [];
      }
      const legacySaved = localStorage.getItem('farmer_flijan_custom_episodes');
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        const migrated = Array.isArray(parsed) ? parsed.map(sanitizeEpisode) : [];
        localStorage.setItem('farmer_murshid_custom_episodes', JSON.stringify(migrated.slice(0, 8)));
        localStorage.removeItem('farmer_flijan_custom_episodes');
        return migrated;
      }
      return [];
    } catch {
      return [];
    }
  });

  const allEpisodes = useMemo(
    () => [...customEpisodes, ...INITIAL_CARTOON_EPISODES],
    [customEpisodes]
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>(() => {
    if (initialEpisodeId && INITIAL_CARTOON_EPISODES.some((ep) => ep.id === initialEpisodeId)) {
      return initialEpisodeId;
    }
    return INITIAL_CARTOON_EPISODES[0].id;
  });

  useEffect(() => {
    if (initialEpisodeId && allEpisodes.some((ep) => ep.id === initialEpisodeId)) {
      setActiveEpisodeId(initialEpisodeId);
      setSceneIndex(0);
    }
  }, [initialEpisodeId, allEpisodes]);

  // Unified Interactive Canvas state (for all 6 Omani Murshid episodes & custom AI episodes)
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => getMurshidAudioPrefs().muted);
  const [volume, setVolume] = useState<number>(() => getMurshidAudioPrefs().volume);
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [voiceProfile, setVoiceProfile] = useState<VoiceStudioProfile>('warm');
  const [audioStatusNote, setAudioStatusNote] = useState<string | null>(null);
  const [ttsFailed, setTtsFailed] = useState<boolean>(false);
  const [previewMoodOverride, setPreviewMoodOverride] = useState<MurshidStageMood | null>(null);
  const [previewPoseOverride, setPreviewPoseOverride] = useState<MurshidPose | null>(null);

  // Custom AI Episode Generator state
  const [topicInput, setTopicInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  // QA Review Persistence server sync state
  const [reviewsMap, setReviewsMap] = useState<Record<string, EpisodeQaReviewState>>({});
  const [mediaManifest, setMediaManifest] = useState<{ episodes: MediaVideoMeta[] } | null>(null);
  const [voiceReport, setVoiceReport] = useState<{ voices: VoiceReportEntry[] } | null>(null);
  const [qaSaveMessage, setQaSaveMessage] = useState<string | null>(null);
  const [isSavingQa, setIsSavingQa] = useState<boolean>(false);

  // Pronunciation dictionary live tester
  const [dictSearch, setDictSearch] = useState<string>('');
  const [tashkeelSampleInput, setTashkeelSampleInput] = useState<string>(
    'دوباس النخيل وسوسة النخيل الحمراء في ولاية سمائل وبساتين الباطنة'
  );

  const activeEpisode = useMemo(
    () => allEpisodes.find((ep) => ep.id === activeEpisodeId) || allEpisodes[0],
    [allEpisodes, activeEpisodeId]
  );

  const activeScene = activeEpisode.scenes[sceneIndex] || activeEpisode.scenes[0];

  const filteredEpisodes = useMemo(() => {
    if (selectedCategory === 'الكل') return allEpisodes;
    return allEpisodes.filter((ep) => ep.category === selectedCategory);
  }, [allEpisodes, selectedCategory]);

  const activeVideoMeta = useMemo(
    () => mediaManifest?.episodes?.find((m) => m.id === activeEpisode.id) || null,
    [mediaManifest, activeEpisode.id]
  );

  const filteredDictionary = useMemo(() => {
    const q = dictSearch.trim();
    if (!q) return OMANI_PRONUNCIATION_DICTIONARY;
    return OMANI_PRONUNCIATION_DICTIONARY.filter(
      (item) =>
        item.term.includes(q) ||
        item.vocalized.includes(q) ||
        item.category.includes(q)
    );
  }, [dictSearch]);

  // Audio refs + Web Audio API Studio Mastering Chain
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const connectedMediaElementsRef = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());
  const masterInputRef = useRef<GainNode | null>(null);
  const highpassFilterRef = useRef<BiquadFilterNode | null>(null);
  const presenceFilterRef = useRef<BiquadFilterNode | null>(null);
  const deEsserFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const makeupGainRef = useRef<GainNode | null>(null);
  const audioLevelRef = useRef<number>(0);
  const ttsCacheRef = useRef<Map<string, string>>(new Map());
  const ttsCooldownUntilRef = useRef<number>(0);
  const playSessionRef = useRef<number>(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch QA reviews + media manifests from server
  const fetchReviewsAndManifest = useCallback(async () => {
    try {
      const res = await fetch('/api/cartoon/reviews');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.reviews) setReviewsMap(data.reviews);
        if (data.mediaManifest) setMediaManifest(data.mediaManifest);
        if (data.voiceReport) setVoiceReport(data.voiceReport);
      }
    } catch {
      // Graceful offline fallback
    }
  }, []);

  useEffect(() => {
    fetchReviewsAndManifest();
  }, [fetchReviewsAndManifest]);

  useEffect(() => {
    const unsubPrefs = subscribeMurshidAudioPrefs((prefs) => {
      setIsMuted(prefs.muted);
      setVolume(prefs.volume);
    });
    return unsubPrefs;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'farmer_murshid_custom_episodes',
        JSON.stringify(customEpisodes.slice(0, 8))
      );
    } catch {
      // ignore quota errors
    }
  }, [customEpisodes]);

  const cleanupLocalAudio = useCallback(() => {
    playSessionRef.current += 1;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    environmentalSfx.setSpeakingDuck(false);
    environmentalSfx.stop();
    setExternalSpeechFinished();
    audioLevelRef.current = 0;
    setIsPlaying(false);
    setIsLoadingAudio(false);
  }, []);

  useEffect(() => {
    const unregister = registerExternalMurshidAudioStopper(cleanupLocalAudio);
    return () => {
      unregister();
      cleanupLocalAudio();
    };
  }, [cleanupLocalAudio]);

  // Sync procedural Web Audio environmental SFX with active scene & speaking state
  useEffect(() => {
    environmentalSfx.setMuted(isMuted || !ambientEnabled);
    environmentalSfx.setSpeakingDuck(isPlaying && !isLoadingAudio);
    if (isPlaying && !isMuted && ambientEnabled && activeStudioTab === 'videos') {
      const preset: AmbientSfxPreset =
        activeScene.ambientFx ||
        (activeScene.backdrop === 'oasis_falaj'
          ? 'falaj_water'
          : activeScene.prop === 'bee'
            ? 'bees_buzz'
            : activeScene.backdrop === 'greenhouse'
              ? 'wind_palms'
              : 'oasis_birds');
      environmentalSfx.start(preset);
    } else if (!isPlaying || !ambientEnabled || activeStudioTab !== 'videos') {
      environmentalSfx.stop();
    }
  }, [isPlaying, isLoadingAudio, isMuted, ambientEnabled, activeScene, activeStudioTab]);

  // Update AudioAnalyser loop for Murshid's lip-sync in interactive canvas mode
  useEffect(() => {
    if (!isPlaying) {
      audioLevelRef.current = 0;
      return;
    }

    let rafId = 0;
    const freqData = new Uint8Array(64);

    const tick = () => {
      if (analyserRef.current && audioRef.current && !audioRef.current.paused) {
        analyserRef.current.getByteTimeDomainData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          const val = (freqData[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / freqData.length);
        audioLevelRef.current = Math.min(1, rms * 4.5);
      } else if (isPlaying && !isLoadingAudio) {
        const t = performance.now() / 1000;
        audioLevelRef.current = 0.25 + Math.abs(Math.sin(t * 9.5)) * 0.45;
      } else {
        audioLevelRef.current = 0;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isLoadingAudio]);

  const applyVoiceMasteringParams = useCallback((profile: VoiceStudioProfile) => {
    const ctx = audioCtxRef.current;
    const hp = highpassFilterRef.current;
    const eq = presenceFilterRef.current;
    const deEss = deEsserFilterRef.current;
    const comp = compressorRef.current;
    const gain = makeupGainRef.current;
    if (!ctx || !hp || !eq || !deEss || !comp || !gain) return;

    const now = ctx.currentTime;
    if (profile === 'studio') {
      hp.frequency.setTargetAtTime(85, now, 0.04);
      eq.frequency.setTargetAtTime(2800, now, 0.04);
      eq.Q.setTargetAtTime(1.15, now, 0.04);
      eq.gain.setTargetAtTime(3.0, now, 0.04);
      deEss.frequency.setTargetAtTime(6400, now, 0.04);
      deEss.Q.setTargetAtTime(2.2, now, 0.04);
      deEss.gain.setTargetAtTime(-2.5, now, 0.04);
      comp.threshold.setTargetAtTime(-20, now, 0.04);
      comp.ratio.setTargetAtTime(3.6, now, 0.04);
      gain.gain.setTargetAtTime(1.12, now, 0.04);
    } else if (profile === 'warm') {
      hp.frequency.setTargetAtTime(70, now, 0.04);
      eq.frequency.setTargetAtTime(1450, now, 0.04);
      eq.Q.setTargetAtTime(0.95, now, 0.04);
      eq.gain.setTargetAtTime(2.2, now, 0.04);
      deEss.frequency.setTargetAtTime(5800, now, 0.04);
      deEss.Q.setTargetAtTime(1.8, now, 0.04);
      deEss.gain.setTargetAtTime(-3.2, now, 0.04);
      comp.threshold.setTargetAtTime(-18, now, 0.04);
      comp.ratio.setTargetAtTime(2.8, now, 0.04);
      gain.gain.setTargetAtTime(1.08, now, 0.04);
    } else {
      hp.frequency.setTargetAtTime(55, now, 0.04);
      eq.gain.setTargetAtTime(0, now, 0.04);
      deEss.gain.setTargetAtTime(0, now, 0.04);
      comp.threshold.setTargetAtTime(-12, now, 0.04);
      comp.ratio.setTargetAtTime(1.5, now, 0.04);
      gain.gain.setTargetAtTime(1.0, now, 0.04);
    }
  }, []);

  useEffect(() => {
    applyVoiceMasteringParams(voiceProfile);
  }, [voiceProfile, applyVoiceMasteringParams]);

  const attachElementToStudioChain = useCallback(
    (mediaEl: HTMLMediaElement | null) => {
      if (!mediaEl) return;
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (!Ctx) return;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        if (!masterInputRef.current) {
          const inputGain = ctx.createGain();
          const highpass = ctx.createBiquadFilter();
          highpass.type = 'highpass';
          highpass.frequency.value = 85;
          highpass.Q.value = 0.7;

          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.value = 2800;
          presence.Q.value = 1.15;
          presence.gain.value = 3.0;

          const deEsser = ctx.createBiquadFilter();
          deEsser.type = 'peaking';
          deEsser.frequency.value = 6400;
          deEsser.Q.value = 2.2;
          deEsser.gain.value = -2.5;

          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.value = -20;
          compressor.knee.value = 12;
          compressor.ratio.value = 3.6;
          compressor.attack.value = 0.008;
          compressor.release.value = 0.18;

          const makeupGain = ctx.createGain();
          makeupGain.gain.value = 1.12;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;

          inputGain
            .connect(highpass)
            .connect(presence)
            .connect(deEsser)
            .connect(compressor)
            .connect(makeupGain)
            .connect(analyser)
            .connect(ctx.destination);

          masterInputRef.current = inputGain;
          highpassFilterRef.current = highpass;
          presenceFilterRef.current = presence;
          deEsserFilterRef.current = deEsser;
          compressorRef.current = compressor;
          makeupGainRef.current = makeupGain;
          analyserRef.current = analyser;
          applyVoiceMasteringParams(voiceProfile);
        }

        if (!connectedMediaElementsRef.current.has(mediaEl) && masterInputRef.current) {
          const src = ctx.createMediaElementSource(mediaEl);
          src.connect(masterInputRef.current);
          connectedMediaElementsRef.current.add(mediaEl);
        }
      } catch {
        // Fallback gracefully if browser blocks MediaElementAudioSourceNode
      }
    },
    [applyVoiceMasteringParams, voiceProfile]
  );

  const ensureAudioAnalyser = useCallback(() => {
    attachElementToStudioChain(audioRef.current);
  }, [attachElementToStudioChain]);

  const fetchSceneTts = useCallback(
    async (narration: string, mood: string): Promise<string | null> => {
      const vocalized = prepareArabicTextForTts(narration);
      const apiMood =
        mood === 'happy' || mood === 'welcome' || mood === 'smile' || mood === 'explain' || mood === 'encourage' || mood === 'speak'
          ? 'cheerful'
          : mood === 'warning' || mood === 'surprised' || mood === 'gentle_sad'
            ? 'warning'
            : mood === 'curious' || mood === 'think' || mood === 'idle'
              ? 'curious'
              : mood === 'proud' || mood === 'celebrate'
                ? 'proud'
                : 'cheerful';
      const key = `v6-murshid-gacrux-oman-voice:${apiMood}:${vocalized}`;
      const cached = ttsCacheRef.current.get(key);
      if (cached) return cached;

      if (Date.now() < ttsCooldownUntilRef.current) {
        return null;
      }

      try {
        const res = await fetch('/api/cartoon/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: vocalized, mood: apiMood }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.audioBase64) {
          ttsCacheRef.current.set(key, data.audioBase64);
          return data.audioBase64;
        }
        if (data?.fallback === 'browser_tts' || data?.quotaExceeded || res.status === 429) {
          const retryMs = (Number(data?.retryAfterSec) || 600) * 1000;
          ttsCooldownUntilRef.current = Date.now() + retryMs;
          return null;
        }
      } catch {
        // Handled by caller
      }
      return null;
    },
    []
  );


  const playSceneAt = useCallback(
    async (episode: CartoonEpisode, idx: number) => {
      stopAllMurshidAudio();
      const session = playSessionRef.current;
      const targetScene = episode.scenes[idx];
      if (!targetScene) {
        setExternalSpeechFinished();
        setIsPlaying(false);
        return;
      }

      notifyExternalSpeechStarted();
      setSceneIndex(idx);
      setIsPlaying(true);
      setIsLoadingAudio(true);
      setAudioStatusNote(null);
      setTtsFailed(false);
      ensureAudioAnalyser();

      const base64Wav = await fetchSceneTts(
        targetScene.vocalizedNarration || targetScene.narration,
        targetScene.murshidMood
      );
      if (playSessionRef.current !== session) return;
      setIsLoadingAudio(false);

      if (!base64Wav || !audioRef.current) {
        setTtsFailed(true);
        setAudioStatusNote('تعذر إنشاء صوت مرشد الذكي حالياً. يمكنك متابعة المشهد بالترجمة النصية أو إعادة المحاولة لاحقاً.');
        setIsPlaying(false);
        setExternalSpeechFinished();
        audioLevelRef.current = 0;
        return;
      }

      const advanceNext = () => {
        if (playSessionRef.current !== session) return;
        if (idx + 1 < episode.scenes.length) {
          playSceneAt(episode, idx + 1);
        } else {
          setIsPlaying(false);
          setExternalSpeechFinished();
          audioLevelRef.current = 0;
        }
      };

      const audioEl = audioRef.current;
      audioEl.src = `data:audio/wav;base64,${base64Wav}`;
      audioEl.playbackRate = playbackSpeed;
      audioEl.muted = isMuted || volume === 0;
      audioEl.volume = Math.max(0, Math.min(1, volume / 100));
      audioEl.onended = advanceNext;
      audioEl.onerror = () => {
        setAudioStatusNote('تعذر تشغيل المقطع الصوتي. أعد المحاولة بعد لحظات.');
        setIsPlaying(false);
        setExternalSpeechFinished();
      };
      try {
        await audioEl.play();
      } catch {
        setAudioStatusNote('تعذر تشغيل المقطع الصوتي. أعد المحاولة بعد لحظات.');
        setIsPlaying(false);
        setExternalSpeechFinished();
      }
    },
    [ensureAudioAnalyser, fetchSceneTts, isMuted, playbackSpeed, volume]
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted || volume === 0;
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [isMuted, volume, playbackSpeed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopAllMurshidAudio();
    } else {
      playSceneAt(activeEpisode, sceneIndex);
    }
  };

  const handleSelectEpisode = (ep: CartoonEpisode, autoPlay = true) => {
    stopAllMurshidAudio();
    setActiveEpisodeId(ep.id);
    setSceneIndex(0);
    setIsPlaying(false);
    setTtsFailed(false);
    setAudioStatusNote(null);
    setPreviewMoodOverride(null);
    setPreviewPoseOverride(null);
    if (autoPlay) {
      setTimeout(() => {
        playSceneAt(ep, 0);
      }, 50);
    }
  };

  const handleTestMurshidExpression = useCallback(
    async (
      mood: MurshidStageMood,
      pose: MurshidPose,
      sampleText: string
    ) => {
      stopAllMurshidAudio();
      const session = playSessionRef.current;
      notifyExternalSpeechStarted();
      setPreviewMoodOverride(mood);
      setPreviewPoseOverride(pose);
      setIsPlaying(true);
      setIsLoadingAudio(true);
      setAudioStatusNote(null);
      ensureAudioAnalyser();

      const base64Wav = await fetchSceneTts(sampleText, mood);
      if (playSessionRef.current !== session) return;
      setIsLoadingAudio(false);

      const finish = () => {
        if (playSessionRef.current !== session) return;
        setIsPlaying(false);
        setExternalSpeechFinished();
        audioLevelRef.current = 0;
      };

      if (!base64Wav || !audioRef.current) {
        setTtsFailed(true);
        setAudioStatusNote('تعذر إنشاء صوت مرشد الذكي حالياً. لا يتم استخدام صوت الجهاز بديلاً عنه.');
        setIsPlaying(false);
        setExternalSpeechFinished();
        return;
      }

      const audioEl = audioRef.current;
      audioEl.src = `data:audio/wav;base64,${base64Wav}`;
      audioEl.playbackRate = playbackSpeed;
      audioEl.muted = isMuted || volume === 0;
      audioEl.volume = Math.max(0, Math.min(1, volume / 100));
      audioEl.onended = finish;
      audioEl.onerror = finish;
      try {
        await audioEl.play();
      } catch {
        setAudioStatusNote('تعذر تشغيل المقطع الصوتي. أعد المحاولة بعد لحظات.');
        finish();
      }
    },
    [ensureAudioAnalyser, fetchSceneTts, isMuted, playbackSpeed, volume]
  );

  const handleGenerateCustomEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = topicInput.trim();
    if (!clean) {
      setGenError('اكتب موضوعاً زراعياً أولاً ليصمم مُرشد حلقته التوعوية.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/cartoon/generate-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.episode) {
        throw new Error(data.error || 'تعذر توليد الحلقة');
      }

      const newEp: CartoonEpisode = data.episode;
      setCustomEpisodes((prev) => [newEp, ...prev]);
      setTopicInput('');
      setSelectedCategory('الكل');
      handleSelectEpisode(newEp, true);
    } catch (err: any) {
      setGenError(err?.message || 'حدث خطأ أثناء إنشاء الحلقة الكرتونية.');
    } finally {
      setIsGenerating(false);
    }
  };

  // QA Review Persistence handlers
  const activeReview: EpisodeQaReviewState = reviewsMap[activeEpisode.id] || {
    episodeId: activeEpisode.id,
    checklist: {
      luftsAndDucking: false,
      pronunciationAndTashkeel: false,
      noSceneNumbers: false,
      syncAndTransitions: false,
      phoneSpeakerClarity: false,
      mobileBitrateAnd480p: false,
    },
    reviewers: [
      { slot: 1, roleTitleAr: 'المراجع الأول · مدير البرنامج (عمر الشرجي)', reviewerName: 'عمر الشرجي', approved: false, notes: '' },
      { slot: 2, roleTitleAr: 'المراجع الثاني · مرشد ووقاية النبات', reviewerName: '', approved: false, notes: '' },
      { slot: 3, roleTitleAr: 'المراجع الثالث · جودة الصوت والصورة على الجوال', reviewerName: '', approved: false, notes: '' },
    ],
    updatedAt: Date.now(),
  };

  const persistReviewUpdate = async (episodeId: string, nextState: EpisodeQaReviewState) => {
    setReviewsMap((prev) => ({ ...prev, [episodeId]: nextState }));
    setIsSavingQa(true);
    setQaSaveMessage(null);
    try {
      const res = await fetch(`/api/cartoon/reviews/${episodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist: nextState.checklist,
          reviewers: nextState.reviewers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReviewsMap((prev) => ({ ...prev, [episodeId]: data.review }));
        setQaSaveMessage('تم حفظ نتيجة الفحص والاعتماد بنجاح.');
      } else {
        setQaSaveMessage(data.error || 'تعذر حفظ المراجعة.');
      }
    } catch {
      setQaSaveMessage('تعذر الاتصال بالخادم لحفظ المراجعة.');
    } finally {
      setIsSavingQa(false);
    }
  };

  const toggleChecklistItem = (key: keyof EpisodeQaReviewState['checklist']) => {
    if (activeEpisode.isCustom) return;
    const next: EpisodeQaReviewState = {
      ...activeReview,
      checklist: {
        ...activeReview.checklist,
        [key]: !activeReview.checklist[key],
      },
      updatedAt: Date.now(),
    };
    persistReviewUpdate(activeEpisode.id, next);
  };

  const updateReviewerSlot = (
    slot: number,
    patch: Partial<EpisodeQaReviewState['reviewers'][number]>
  ) => {
    if (activeEpisode.isCustom) return;
    const next: EpisodeQaReviewState = {
      ...activeReview,
      reviewers: activeReview.reviewers.map((r) =>
        r.slot === slot ? { ...r, ...patch } : r
      ),
      updatedAt: Date.now(),
    };
    setReviewsMap((prev) => ({ ...prev, [activeEpisode.id]: next }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 overflow-x-hidden">
      <audio ref={audioRef} className="hidden" />

      {/* Page Header & Studio Mode Switcher */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Clapperboard className="w-4 h-4" />
            <span>استوديو مُرشد التفاعلي · صوت عُماني متوازن -16 LUFS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white text-balance">
            استوديو مُرشد التعليمي للمزارع العُماني
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-3xl">
            دروس تفاعلية حيّة بشخصية مُرشد العُمانية العصرية مع تحريك الشفاه والكاميرا ومؤثرات الأفلاج والبيئة الطبيعية ونطق مدقق.
          </p>
        </div>

        {/* Clean Segmented Studio Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveStudioTab('videos')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeStudioTab === 'videos'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>الدروس المتصلة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudioTab('voices')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeStudioTab === 'voices'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>مختبر الأصوات والرخص</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStudioTab('qa')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeStudioTab === 'qa'
                ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>فحص الجودة (3 مراجعين)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UNIFIED INTERACTIVE MURSHID CANVAS EPISODES */}
      {activeStudioTab === 'videos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Cinema Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-stone-950 border border-stone-200 dark:border-stone-800 shadow-lg">
                  <CartoonStageCanvas
                    scene={activeScene}
                    isPlaying={isPlaying}
                    audioLevelRef={audioLevelRef}
                    episodeTitle={activeEpisode.title}
                    sceneIndex={sceneIndex}
                    totalScenes={activeEpisode.scenes.length}
                    overridePose={previewPoseOverride}
                    overrideMood={previewMoodOverride}
                  />

                  {isLoadingAudio && (
                    <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-[1px] flex flex-col items-center justify-center text-white gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                      <span className="text-xs font-semibold">مُرشد يستعد للتحدث...</span>
                    </div>
                  )}

                  {!isPlaying && !isLoadingAudio && (
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      aria-label="تشغيل الدرس التوعوي"
                      className="absolute inset-0 bg-stone-950/25 hover:bg-stone-950/35 transition-colors flex items-center justify-center group"
                    >
                      <span className="w-16 h-16 rounded-full bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-2xl flex items-center justify-center transition-transform group-hover:scale-105">
                        <Play className="w-7 h-7 fill-current ml-0.5" />
                      </span>
                    </button>
                  )}

                  {showSubtitles && (
                    <div className="absolute bottom-3 left-4 right-4 pointer-events-none flex justify-center">
                      <div className="bg-stone-950/85 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-center max-w-2xl leading-relaxed border border-white/10 shadow-md">
                        {activeScene.subtitle}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls Bar — Strictly ZERO scene numbers ("المشهد 1") */}
                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeEpisode.scenes.map((sc, idx) => {
                      const isCurrent = idx === sceneIndex;
                      const cleanHeading = sc.sceneHeading.replace(/^المشهد\s+\S+[:\-]?\s*/, '');
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => playSceneAt(activeEpisode, idx)}
                          className={`p-2.5 rounded-xl text-right border transition-all ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                              : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-emerald-400'
                          }`}
                        >
                          <div className="text-[11px] font-semibold truncate">
                            {cleanHeading}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePlayPause}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 transition-colors"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>إيقاف مؤقت</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>تشغيل الدرس</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => playSceneAt(activeEpisode, Math.max(0, sceneIndex - 1))}
                        disabled={sceneIndex === 0}
                        title="الفقرة السابقة"
                        className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          playSceneAt(
                            activeEpisode,
                            Math.min(activeEpisode.scenes.length - 1, sceneIndex + 1)
                          )
                        }
                        disabled={sceneIndex >= activeEpisode.scenes.length - 1}
                        title="الفقرة التالية"
                        className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => playSceneAt(activeEpisode, 0)}
                        title="إعادة من البداية"
                        className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPlaybackSpeed((s) => (s === 1 ? 1.15 : s === 1.15 ? 0.9 : 1))
                        }
                        className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-mono font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                      >
                        {playbackSpeed}x
                      </button>

                      <button
                        type="button"
                        onClick={() => setAmbientEnabled((v) => !v)}
                        className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                          ambientEnabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                            : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                        title="تشغيل/كتم أصوات الطبيعة (الفلج والطيور)"
                      >
                        {ambientEnabled ? 'أصوات الطبيعة ✓' : 'بدون خلفية'}
                      </button>

                      <div className="hidden sm:inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                        <AudioWaveform className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mx-1" />
                        {(
                          [
                            { id: 'studio', label: 'استوديو EQ' },
                            { id: 'warm', label: 'دافئ' },
                            { id: 'natural', label: 'طبيعي' },
                          ] as const
                        ).map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setVoiceProfile(preset.id)}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              voiceProfile === preset.id
                                ? 'bg-emerald-600 text-white'
                                : 'text-stone-600 dark:text-stone-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSubtitles((v) => !v)}
                        className={`min-h-[40px] min-w-[40px] p-2 rounded-lg border text-xs transition-colors flex items-center justify-center ${
                          showSubtitles
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                            : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500'
                        }`}
                        title="إظهار/إخفاء الترجمة النصية"
                      >
                        <Captions className="w-4 h-4" />
                      </button>

                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                        <button
                          type="button"
                          onClick={() => setMurshidMuted(!isMuted)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700"
                          title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                          aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-red-500" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setMurshidVolume(Number(e.target.value))}
                          aria-label="مستوى الصوت"
                          className="w-16 sm:w-20 accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openShare({
                            kind: 'episode',
                            title: activeEpisode.title,
                            summary: activeEpisode.takeaway,
                            highlights: activeEpisode.summaryPoints
                              ? [...activeEpisode.summaryPoints]
                              : activeEpisode.scenes.slice(0, 3).map((s) => s.subtitle),
                            categoryLabel: activeEpisode.category,
                            badgeMetric: activeEpisode.durationLabel,
                            page: 'cartoon_videos',
                            itemId: activeEpisode.id,
                            authorOrSource: 'أستوديو مُرشد التوعوي',
                          })
                        }
                        className="min-h-[44px] px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                        title="مشاركة الحلقة عبر وسائل التواصل"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة الحلقة</span>
                      </button>
                    </div>
                  </div>

                  {(audioStatusNote || ttsFailed) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
                      <span>{audioStatusNote || 'تعذر تحميل صوت الاستوديو لهذه الفقرة.'}</span>
                      {ttsFailed && (
                        <button
                          type="button"
                          onClick={() => playSceneAt(activeEpisode, sceneIndex)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
                        >
                          إعادة تحميل الصوت
                        </button>
                      )}
                    </div>
                  )}

                  {/* Updated Murshid Character Showcase & 10-Expression Live Tester */}
                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <MurshidCharacterSvg
                          expression={(previewMoodOverride as MurshidExpression) || 'welcome'}
                          isSpeaking={isPlaying && !isLoadingAudio}
                          className="w-12 h-14 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900 dark:text-white">
                            معاينة شخصية مُرشد الجديدة (الهوية العُمانية العصرية و١٠ تعابير تفاعلية)
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            اضغط على أي تعبير لاختبار حركات الوجه والرمش والصوت مع مزامنة الشفاه مباشرة
                          </div>
                        </div>
                      </div>
                      {(previewMoodOverride || previewPoseOverride) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewMoodOverride(null);
                            setPreviewPoseOverride(null);
                          }}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[44px] px-2"
                        >
                          العودة لتعابير المشهد التلقائية
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {MURSHID_EXPRESSION_PRESETS.map((preset) => {
                        const targetPose: MurshidPose =
                          preset.id === 'welcome'
                            ? 'welcome'
                            : preset.id === 'celebrate'
                              ? 'celebrate'
                              : preset.id === 'think'
                                ? 'think'
                                : preset.id === 'surprised'
                                  ? 'surprised'
                                  : preset.id === 'gentle_sad'
                                    ? 'gentle_sad'
                                    : preset.id === 'encourage'
                                      ? 'encourage'
                                      : preset.id === 'idle'
                                        ? 'idle'
                                        : 'explain';
                        const isSelected = previewMoodOverride === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              handleTestMurshidExpression(
                                preset.id,
                                targetPose,
                                preset.sampleVocalizedAr
                              )
                            }
                            className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-500'
                            }`}
                          >
                            {preset.labelAr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            {/* Episode Metadata, 3-Point Summary & Attribution */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                    {activeEpisode.title}
                  </h2>
                  <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-2 mt-1 tabular-nums">
                    <span>{activeEpisode.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      المدة: {activeVideoMeta ? `${activeVideoMeta.durationSec} ثانية` : activeEpisode.durationLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>مستوى الصوت الموحّد: -16 LUFS</span>
                    <span aria-hidden="true">·</span>
                    <span>خفض الصوت البيئي أثناء الشرح: -12 dB</span>
                  </div>
                </div>
              </div>

              {/* 3-Point Summary Card */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>ملخص الدرس في ثلاث نقاط عملية</span>
                </div>
                {activeEpisode.summaryPoints ? (
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {activeEpisode.summaryPoints.map((pt, i) => (
                      <li
                        key={i}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-200 leading-relaxed flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {activeEpisode.takeaway}
                  </p>
                )}
              </div>

              {activeEpisode.musicAttribution && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
                  توثيق الصوت والمرئيات: {activeEpisode.musicAttribution} · رسوم أصلية مخصصة للمنصة
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Episode List + Custom AI Generator (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>اطلب درساً تفاعلياً جديداً من مُرشد</span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                اكتب أي استفسار زراعي وسينشئ مُرشد قصة مترابطة مع قاموس النطق العُماني فوراً.
              </p>

              <form onSubmit={handleGenerateCustomEpisode} className="space-y-2.5">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="مثال: كيف نعتني بشتلات المانجو في الصيف؟"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                />

                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TOPICS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTopicInput(s)}
                      className="text-[10px] px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-right"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إعداد الدرس التفاعلي...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>إنشاء وتشغيل الدرس فوراً</span>
                    </>
                  )}
                </button>

                {genError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400">
                    {genError}
                  </p>
                )}
              </form>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                مكتبة دروس مُرشد المرئية ({filteredEpisodes.length})
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-0.5">
                {filteredEpisodes.map((ep) => {
                  const isSelected = ep.id === activeEpisode.id;
                  const meta = mediaManifest?.episodes?.find((m) => m.id === ep.id);
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handleSelectEpisode(ep, true)}
                      className={`w-full text-right p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500'
                          : 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
                      }`}
                    >
                      {ep.heroArtwork ? (
                        <img
                          src={ep.heroArtwork}
                          alt={ep.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-10 rounded-lg object-cover shrink-0 bg-stone-200 dark:bg-stone-700"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-bold text-stone-900 dark:text-white leading-snug">
                          {ep.title}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span>{ep.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{meta ? `${meta.durationSec} ث · تفاعلي` : ep.durationLabel}</span>
                          {ep.isCustom && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                درس مخصص
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 4 OPEN-SOURCE ARABIC VOICE COMPARISON, LICENSES & OMANI PRONUNCIATION DICTIONARY */}
      {activeStudioTab === 'voices' && (
        <div className="space-y-6">
          {/* Standardized Comparison Sentence */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              نص المقارنة الموحّد بين الأصوات العربية مفتوحة المصدر (مع التشكيل والوقفات 0.4–0.7 ث)
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              النص الأصلي: «{VOICE_COMPARISON_TEXT_RAW}»
            </p>
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 text-sm font-semibold text-stone-900 dark:text-stone-100 leading-loose">
              {VOICE_COMPARISON_TEXT_VOCALIZED}
            </div>
          </div>

          {/* 4 Voice Sample Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPEN_SOURCE_VOICE_OPTIONS.map((v) => {
              const liveStats = voiceReport?.voices?.find((r) => r.voiceId === v.id);
              const isNonCommercial = v.commercialAllowed === 'no';
              const isUnclear = v.commercialAllowed === 'unclear';
              return (
                <div
                  key={v.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        {v.nameAr}
                      </h3>
                      <div className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                        {v.engineName}
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {liveStats ? `${liveStats.measuredLufs} LUFS` : v.targetLufs}
                    </div>
                  </div>

                  <audio
                    controls
                    preload="none"
                    src={v.sampleUrl}
                    className="w-full h-10"
                  />

                  <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {v.qualityNoteAr}
                  </div>

                  {/* Honest License Disclosure */}
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isNonCommercial
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                        : isUnclear
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {isNonCommercial || isUnclear ? (
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                      <span>الترخيص: {v.licenseName}</span>
                    </div>
                    <p className="leading-relaxed opacity-90">{v.licenseWarningAr}</p>
                  </div>

                  {liveStats && (
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 flex flex-wrap gap-3 tabular-nums">
                      <span>المدة: {liveStats.durationSec} ث</span>
                      <span>ذروة حقيقية: {liveStats.measuredTruePeakDb} dBTP</span>
                      <span>بصمة الكاش: {liveStats.sha256Key.slice(0, 12)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional Evaluated Models (XTTS-v2 & SILMA TTS) */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>تقييم الصراحة التقنية: نماذج عربية مفتوحة أخرى (Coqui XTTS-v2 و SILMA TTS)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ADDITIONAL_VOICE_LICENSES_AUDIT.map((m) => (
                <div
                  key={m.engineName}
                  className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-1.5 text-xs"
                >
                  <div className="font-bold text-stone-900 dark:text-white">{m.nameAr}</div>
                  <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                    {m.engineName} · {m.licenseName}
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                    {m.reasonNotLocalAr}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Omani & Agricultural Pronunciation Dictionary */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                  <span>قاموس النطق العُماني والزراعي ومُشكِّل النصوص ({OMANI_PRONUNCIATION_DICTIONARY.length} مصطلح)</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  يُطبَّق تلقائياً قبل توليد الصوت لضبط التشكيل وأسماء المحافظات والآفات والأفلاج.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  placeholder="ابحث (دوباس، سمائل، فلج)..."
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            {/* Live Vocalizer Preview */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-200 block">
                اختبر التشكيل الآلي بالقاموس العُماني على أي نص:
              </label>
              <input
                type="text"
                value={tashkeelSampleInput}
                onChange={(e) => setTashkeelSampleInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white"
              />
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                النتيجة المضبوطة للنطق: {prepareArabicTextForTts(tashkeelSampleInput)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto">
              {filteredDictionary.map((entry) => (
                <div
                  key={`${entry.term}-${entry.vocalized}`}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-stone-900 dark:text-white">{entry.vocalized}</div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">الأصل: {entry.term}</div>
                  </div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
                    {entry.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 6-ITEM QUALITY CHECKLIST & 3-REVIEWER SIGN-OFF PER VIDEO */}
      {activeStudioTab === 'qa' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  قائمة التحقق الإنتاجي واعتماد 3 مراجعين لكل درس
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  اختر الدرس لمراجعة بنوده الستة واعتماد المشاهدة على سماعة الهاتف وسماعة الأذن.
                </p>
              </div>
              <select
                value={activeEpisode.id}
                onChange={(e) => setActiveEpisodeId(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white"
              >
                {INITIAL_CARTOON_EPISODES.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title}
                  </option>
                ))}
              </select>
            </div>

            {activeEpisode.isCustom ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                هذه حلقة مخصصة مؤقتة. اختر أحد الدروس الرسمية من القائمة أعلاه لإتمام قائمة الفحص.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {VIDEO_QA_CHECKLIST.map((item) => {
                    const checked = Boolean(activeReview.checklist[item.key]);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleChecklistItem(item.key)}
                        className={`text-right p-3.5 rounded-xl border transition-colors flex items-start gap-3 ${
                          checked
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500'
                            : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="mt-1 accent-emerald-600 w-4 h-4 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-stone-900 dark:text-white">
                            {item.labelAr}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                            {item.detailAr}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 3 Reviewers Sign-off */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      توقيع واعتماد 3 مراجعين
                    </h3>
                    <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                      المعتمدون: {activeReview.reviewers.filter((r) => r.approved).length} من 3
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeReview.reviewers.map((rev) => (
                      <div
                        key={rev.slot}
                        className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2.5"
                      >
                        <div className="text-xs font-bold text-stone-900 dark:text-white">
                          {rev.roleTitleAr}
                        </div>
                        <input
                          type="text"
                          value={rev.reviewerName}
                          onChange={(e) =>
                            updateReviewerSlot(rev.slot, { reviewerName: e.target.value })
                          }
                          placeholder="اسم المراجع..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white"
                        />
                        <textarea
                          rows={2}
                          value={rev.notes}
                          onChange={(e) =>
                            updateReviewerSlot(rev.slot, { notes: e.target.value })
                          }
                          placeholder="ملاحظات سماعة الهاتف وسماعة الأذن..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated: EpisodeQaReviewState = {
                              ...activeReview,
                              reviewers: activeReview.reviewers.map((item) =>
                                item.slot === rev.slot
                                  ? { ...item, approved: !item.approved }
                                  : item
                              ),
                              updatedAt: Date.now(),
                            };
                            persistReviewUpdate(activeEpisode.id, updated);
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                            rev.approved
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {rev.approved ? 'تم الاعتماد ✓' : 'اعتماد هذه النسخة'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={isSavingQa}
                      onClick={() => persistReviewUpdate(activeEpisode.id, activeReview)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {isSavingQa ? 'جاري الحفظ...' : 'حفظ بيانات المراجعة'}
                    </button>

                    {qaSaveMessage && (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {qaSaveMessage}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
