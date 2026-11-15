import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { 
  HAZZA_AL_BALUSHI_SURAHS, 
  RADIO_STATIONS, 
  QuranSurah, 
  RadioStation 
} from '../data/agriculturalData.ts';

export type TrackType = 'quran' | 'radio' | null;

export interface AudioContextType {
  trackType: TrackType;
  currentSurah: QuranSurah | null;
  currentRadio: RadioStation | null;
  radioStations: RadioStation[];
  isPlaying: boolean;
  playbackStatus: 'idle' | 'buffering' | 'playing' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  errorMessage: string | null;
  
  // Actions
  playQuran: (surahId?: number) => void;
  playRadio: (stationId: string, stationOverride?: RadioStation) => void;
  togglePlay: () => void;
  nextSurah: () => void;
  prevSurah: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  stopAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trackType, setTrackType] = useState<TrackType>(() => {
    return (localStorage.getItem('farmer_track_type') as TrackType) || null;
  });

  const [currentSurahId, setCurrentSurahId] = useState<number>(() => {
    const saved = localStorage.getItem('farmer_last_surah_id');
    return saved ? Number(saved) : 1;
  });

  const [currentRadioId, setCurrentRadioId] = useState<string>(() => {
    return localStorage.getItem('farmer_last_radio_id') || 'oman-quran';
  });

  const [radioStations, setRadioStations] = useState<RadioStation[]>(RADIO_STATIONS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackStatus, setPlaybackStatus] = useState<'idle' | 'buffering' | 'playing' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const trackTypeRef = useRef<TrackType>(trackType);
  const currentSurahIdRef = useRef<number>(currentSurahId);
  const pendingResumeTimeRef = useRef<number>(0);
  const stationsRef = useRef<RadioStation[]>(RADIO_STATIONS);
  const playQuranRef = useRef<(surahId?: number) => void>(() => {});

  useEffect(() => {
    trackTypeRef.current = trackType;
  }, [trackType]);

  useEffect(() => {
    currentSurahIdRef.current = currentSurahId;
  }, [currentSurahId]);

  useEffect(() => {
    stationsRef.current = radioStations;
  }, [radioStations]);

  useEffect(() => {
    let active = true;
    fetch('/api/radio/stations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success && Array.isArray(data.stations) && data.stations.length > 0) {
          setRadioStations(data.stations);
        }
      })
      .catch(() => {
        // Keep built-in RADIO_STATIONS offline
      });
    return () => {
      active = false;
    };
  }, []);

  const currentSurah = HAZZA_AL_BALUSHI_SURAHS.find(s => s.id === currentSurahId) || HAZZA_AL_BALUSHI_SURAHS[0];
  const currentRadio = radioStations.find(r => r.id === currentRadioId) || radioStations[0];

  // Clean HLS controller
  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // Initialize a SINGLE persistent Audio instance across the provider lifetime
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (trackTypeRef.current === 'quran' && audio.currentTime > 0) {
        localStorage.setItem(`surah_pos_${currentSurahIdRef.current}`, audio.currentTime.toString());
      }
    };

    const onLoadedMetadata = () => {
      const dur = audio.duration || 0;
      setDuration(dur);
      const resume = pendingResumeTimeRef.current;
      if (resume > 0 && trackTypeRef.current === 'quran' && (dur === 0 || resume < dur - 2)) {
        try {
          audio.currentTime = resume;
          setCurrentTime(resume);
        } catch {
          // ignore if stream is non-seekable
        }
      }
      pendingResumeTimeRef.current = 0;
    };

    const onWaiting = () => {
      setPlaybackStatus('buffering');
    };

    const onPlaying = () => {
      setIsPlaying(true);
      setPlaybackStatus('playing');
      setErrorMessage(null);
    };

    const onPause = () => {
      setIsPlaying(false);
      setPlaybackStatus('idle');
    };

    const onError = () => {
      console.warn('Audio playback error on source:', audio.src);
      setIsPlaying(false);
      setPlaybackStatus('error');
      setErrorMessage('تعذر الاتصال بمصدر البث الصوتي حالياً. يرجى المحاولة مجدداً.');
    };

    const onEnded = () => {
      if (trackTypeRef.current === 'quran') {
        localStorage.removeItem(`surah_pos_${currentSurahIdRef.current}`);
        const idx = HAZZA_AL_BALUSHI_SURAHS.findIndex(s => s.id === currentSurahIdRef.current);
        const nextIdx = (idx + 1) % HAZZA_AL_BALUSHI_SURAHS.length;
        playQuranRef.current(HAZZA_AL_BALUSHI_SURAHS[nextIdx].id);
      } else {
        setIsPlaying(false);
        setPlaybackStatus('idle');
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      destroyHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play audio source (Supports MP3 & HLS .m3u8)
  const playSource = async (url: string, isHlsStream: boolean, startTime?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    destroyHls();
    audio.pause();
    setErrorMessage(null);
    setPlaybackStatus('buffering');
    setCurrentTime(0);
    setDuration(0);
    pendingResumeTimeRef.current = typeof startTime === 'number' && startTime > 0 ? startTime : 0;

    try {
      if (isHlsStream) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(audio);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            audio.play().catch(e => {
              console.warn('HLS play caught:', e);
              setIsPlaying(false);
              setPlaybackStatus('idle');
              setErrorMessage('انقر على زر التشغيل لبدء الاستماع للبث');
            });
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setPlaybackStatus('error');
              setErrorMessage('انقطع الاتصال بالبث المباشر. جاري المحاولة...');
              hls.startLoad();
            }
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = url;
          await audio.play();
        } else {
          setPlaybackStatus('error');
          setErrorMessage('متصفحك لا يدعم بث HLS مباشرة');
        }
      } else {
        audio.src = url;
        await audio.play();
      }
      setIsPlaying(true);
    } catch (err: any) {
      console.warn('Audio play error:', err);
      setIsPlaying(false);
      setPlaybackStatus('error');
      setErrorMessage('تعذر بدء التشغيل الصوتي. يرجى الضغط على زر التشغيل يدوياً');
    }
  };

  // Play Quran Surah
  const playQuran = (surahId?: number) => {
    const targetId = surahId !== undefined ? surahId : currentSurahIdRef.current;
    currentSurahIdRef.current = targetId;
    trackTypeRef.current = 'quran';
    setCurrentSurahId(targetId);
    setTrackType('quran');
    localStorage.setItem('farmer_track_type', 'quran');
    localStorage.setItem('farmer_last_surah_id', targetId.toString());

    const targetSurah = HAZZA_AL_BALUSHI_SURAHS.find(s => s.id === targetId) || HAZZA_AL_BALUSHI_SURAHS[0];
    const savedPos = localStorage.getItem(`surah_pos_${targetId}`);
    const resumeTime = savedPos ? Number(savedPos) : 0;

    playSource(targetSurah.audioUrl, false, resumeTime);
  };

  useEffect(() => {
    playQuranRef.current = playQuran;
  });

  // Play Live Radio Station
  const playRadio = (stationId: string, stationOverride?: RadioStation) => {
    const targetStation =
      stationOverride ||
      stationsRef.current.find(r => r.id === stationId) ||
      RADIO_STATIONS.find(r => r.id === stationId) ||
      stationsRef.current[0];

    trackTypeRef.current = 'radio';
    setCurrentRadioId(targetStation.id);
    setTrackType('radio');
    localStorage.setItem('farmer_track_type', 'radio');
    localStorage.setItem('farmer_last_radio_id', targetStation.id);

    playSource(targetStation.streamUrl, targetStation.isHls);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setPlaybackStatus('idle');
    } else {
      if (trackTypeRef.current === 'quran') {
        playQuran(currentSurahIdRef.current);
      } else if (trackTypeRef.current === 'radio') {
        playRadio(currentRadioId);
      } else {
        playQuran(1);
      }
    }
  };

  const nextSurah = () => {
    const idx = HAZZA_AL_BALUSHI_SURAHS.findIndex(s => s.id === currentSurahIdRef.current);
    const nextIdx = (idx + 1) % HAZZA_AL_BALUSHI_SURAHS.length;
    playQuran(HAZZA_AL_BALUSHI_SURAHS[nextIdx].id);
  };

  const prevSurah = () => {
    const idx = HAZZA_AL_BALUSHI_SURAHS.findIndex(s => s.id === currentSurahIdRef.current);
    const prevIdx = (idx - 1 + HAZZA_AL_BALUSHI_SURAHS.length) % HAZZA_AL_BALUSHI_SURAHS.length;
    playQuran(HAZZA_AL_BALUSHI_SURAHS[prevIdx].id);
  };

  const seek = (seconds: number) => {
    if (audioRef.current && trackTypeRef.current === 'quran') {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.muted = nextMute;
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    destroyHls();
    trackTypeRef.current = null;
    setIsPlaying(false);
    setTrackType(null);
    setPlaybackStatus('idle');
  };

  return (
    <AudioContext.Provider
      value={{
        trackType,
        currentSurah,
        currentRadio,
        radioStations,
        isPlaying,
        playbackStatus,
        currentTime,
        duration,
        volume,
        isMuted,
        errorMessage,
        playQuran,
        playRadio,
        togglePlay,
        nextSurah,
        prevSurah,
        seek,
        setVolume,
        toggleMute,
        stopAudio
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
