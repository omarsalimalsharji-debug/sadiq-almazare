import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { 
  HAZZA_AL_BALUSHI_SURAHS, 
  RADIO_STATIONS, 
  QuranSurah, 
  RadioStation 
} from '../data/agriculturalData.ts';

export type TrackType = 'quran' | 'radio' | null;

interface AudioContextType {
  trackType: TrackType;
  currentSurah: QuranSurah | null;
  currentRadio: RadioStation | null;
  isPlaying: boolean;
  playbackStatus: 'idle' | 'buffering' | 'playing' | 'error';
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  errorMessage: string | null;
  
  // Actions
  playQuran: (surahId?: number) => void;
  playRadio: (stationId: string) => void;
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

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackStatus, setPlaybackStatus] = useState<'idle' | 'buffering' | 'playing' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const currentSurah = HAZZA_AL_BALUSHI_SURAHS.find(s => s.id === currentSurahId) || HAZZA_AL_BALUSHI_SURAHS[0];
  const currentRadio = RADIO_STATIONS.find(r => r.id === currentRadioId) || RADIO_STATIONS[0];

  // Initialize single persistent audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (trackType === 'quran') {
        localStorage.setItem(`surah_pos_${currentSurahId}`, audio.currentTime.toString());
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setPlaybackStatus('playing');
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
      setErrorMessage('تعذر الاتصال بمصدر البث الصوتي حالياً. جاري إعادة المحاولة...');
    };

    const onEnded = () => {
      if (trackType === 'quran') {
        // Auto play next surah
        nextSurah();
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
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [trackType, currentSurahId]);

  // Clean HLS controller
  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // Play audio source (Supports MP3 & HLS .m3u8)
  const playSource = async (url: string, isHlsStream: boolean, startTime?: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    destroyHls();
    setErrorMessage(null);
    setPlaybackStatus('buffering');

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
          // Safari native HLS
          audio.src = url;
          await audio.play();
        } else {
          setErrorMessage('متصفحك لا يدعم بث HLS مباشرة');
        }
      } else {
        // Standard MP3 Stream
        audio.src = url;
        if (typeof startTime === 'number' && startTime > 0) {
          audio.currentTime = startTime;
        }
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
    const targetId = surahId !== undefined ? surahId : currentSurahId;
    setCurrentSurahId(targetId);
    setTrackType('quran');
    localStorage.setItem('farmer_track_type', 'quran');
    localStorage.setItem('farmer_last_surah_id', targetId.toString());

    const targetSurah = HAZZA_AL_BALUSHI_SURAHS.find(s => s.id === targetId) || HAZZA_AL_BALUSHI_SURAHS[0];
    const savedPos = localStorage.getItem(`surah_pos_${targetId}`);
    const resumeTime = savedPos ? Number(savedPos) : 0;

    playSource(targetSurah.audioUrl, false, resumeTime);
  };

  // Play Live Radio Station
  const playRadio = (stationId: string) => {
    const targetStation = RADIO_STATIONS.find(r => r.id === stationId) || RADIO_STATIONS[0];
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
      if (trackType === 'quran') {
        playQuran(currentSurahId);
      } else if (trackType === 'radio') {
        playRadio(currentRadioId);
      } else {
        // Default to Quran Al-Fatihah
        playQuran(1);
      }
    }
  };

  const nextSurah = () => {
    const idx = HAZZA_AL_BALUSHI_SURAHS.findIndex(s => s.id === currentSurahId);
    const nextIdx = (idx + 1) % HAZZA_AL_BALUSHI_SURAHS.length;
    playQuran(HAZZA_AL_BALUSHI_SURAHS[nextIdx].id);
  };

  const prevSurah = () => {
    const idx = HAZZA_AL_BALUSHI_SURAHS.findIndex(s => s.id === currentSurahId);
    const prevIdx = (idx - 1 + HAZZA_AL_BALUSHI_SURAHS.length) % HAZZA_AL_BALUSHI_SURAHS.length;
    playQuran(HAZZA_AL_BALUSHI_SURAHS[prevIdx].id);
  };

  const seek = (seconds: number) => {
    if (audioRef.current && trackType === 'quran') {
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
