/**
 * Unified Audio & Arabic Voice Coordinator for «مُرشد» («صديق المزارع»)
 * - Single-channel guard: guarantees no two Murshid voices or narrations overlap anywhere in the app.
 * - Persistent mute/volume preferences via localStorage.
 * - Android-safe Arabic chunking & async voiceschanged resolution for Web Speech API.
 * - Optional studio WAV playback via /api/cartoon/tts with transparent cooldown fallback.
 */

import { prepareArabicTextForTts } from './arabicPronunciation.ts';

export interface MurshidAudioPrefs {
  muted: boolean;
  volume: number; // 0..100
}

const PREFS_STORAGE_KEY = 'sadiq_murshid_audio_prefs_v1';

let sharedAudioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesInitDone = false;

let activePlaybackToken = 0;
let activeSpeechTimer: ReturnType<typeof setTimeout> | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let activeSpeakerSetter: ((speaking: boolean) => void) | null = null;
const externalStoppers = new Set<() => void>();
const prefsListeners = new Set<(prefs: MurshidAudioPrefs) => void>();

const studioAudioSessionCache = new Map<string, string>();
let studioTtsCooldownUntil = 0;

function readStoredPrefs(): MurshidAudioPrefs {
  if (typeof window === 'undefined') return { muted: false, volume: 80 };
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { muted: false, volume: 80 };
    const parsed = JSON.parse(raw);
    return {
      muted: Boolean(parsed?.muted),
      volume:
        typeof parsed?.volume === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.volume)))
          : 80,
    };
  } catch {
    return { muted: false, volume: 80 };
  }
}

let currentPrefs: MurshidAudioPrefs = readStoredPrefs();

function persistAndNotifyPrefs(next: MurshidAudioPrefs) {
  currentPrefs = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  prefsListeners.forEach((cb) => {
    try {
      cb(next);
    } catch {
      // ignore subscriber errors
    }
  });
}

export function getMurshidAudioPrefs(): MurshidAudioPrefs {
  return currentPrefs;
}

export function setMurshidMuted(muted: boolean) {
  const next = { ...currentPrefs, muted };
  persistAndNotifyPrefs(next);
  if (muted) {
    stopAllMurshidAudio();
  }
}

export function setMurshidVolume(volume: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  const next = { ...currentPrefs, volume: clamped, muted: clamped === 0 ? true : currentPrefs.muted };
  persistAndNotifyPrefs(next);
  if (activeHtmlAudio) {
    activeHtmlAudio.volume = Math.max(0, Math.min(1, clamped / 100));
  }
}

export function subscribeMurshidAudioPrefs(
  listener: (prefs: MurshidAudioPrefs) => void
): () => void {
  prefsListeners.add(listener);
  return () => {
    prefsListeners.delete(listener);
  };
}

export function registerExternalMurshidAudioStopper(stopper: () => void): () => void {
  externalStoppers.add(stopper);
  return () => {
    externalStoppers.delete(stopper);
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak: number,
  startOffsetSec = 0,
  volume = 0.75,
  freqEnd?: number
) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0.01) return;

  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd && freqEnd > 0) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + durationSec);
  }

  const scaledGain = Math.max(0.001, Math.min(0.45, gainPeak * volume));
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(scaledGain, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.03);
}

function resolveEffectiveAudio(mutedArg?: boolean, volumeArg?: number) {
  const muted = typeof mutedArg === 'boolean' ? mutedArg : currentPrefs.muted;
  const volume =
    typeof volumeArg === 'number'
      ? Math.max(0, Math.min(1, volumeArg))
      : Math.max(0, Math.min(1, currentPrefs.volume / 100));
  return { muted, volume };
}

export function playTapSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(540, 0.07, 'sine', 0.14, 0, eff.volume, 680);
}

export function playWelcomeChimeSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(493.88, 0.11, 'sine', 0.14, 0, eff.volume);
  playTone(659.25, 0.18, 'triangle', 0.16, 0.08, eff.volume);
}

export function playSuccessSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(523.25, 0.14, 'triangle', 0.22, 0, eff.volume);
  playTone(659.25, 0.14, 'triangle', 0.22, 0.09, eff.volume);
  playTone(783.99, 0.24, 'triangle', 0.26, 0.18, eff.volume);
}

export function playGentleErrorSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(310, 0.13, 'sine', 0.16, 0, eff.volume, 260);
  playTone(255, 0.18, 'sine', 0.14, 0.12, eff.volume, 220);
}

export function playWaterSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(440, 0.12, 'sine', 0.18, 0, eff.volume, 880);
  playTone(587, 0.12, 'sine', 0.16, 0.08, eff.volume, 1046);
  playTone(740, 0.14, 'sine', 0.15, 0.16, eff.volume, 1175);
}

export function playPestPopSfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  playTone(698, 0.09, 'triangle', 0.2, 0, eff.volume, 987);
}

export function playVictorySfx(muted?: boolean, volume?: number) {
  const eff = resolveEffectiveAudio(muted, volume);
  if (eff.muted) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone(n, idx === notes.length - 1 ? 0.38 : 0.15, 'triangle', 0.24, idx * 0.1, eff.volume);
  });
}

export function initArabicVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const refresh = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) cachedVoices = list;
    };
    refresh();
    if (!voicesInitDone) {
      voicesInitDone = true;
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    }
    return cachedVoices;
  } catch {
    return [];
  }
}

function pickBestMurshidVoice(): SpeechSynthesisVoice | null {
  const voices = initArabicVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.toLowerCase() === 'ar-om') ||
    voices.find((v) => v.lang.toLowerCase() === 'ar-sa') ||
    voices.find((v) => v.lang.toLowerCase() === 'ar-ae') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('ar') && v.localService) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('ar')) ||
    null
  );
}

/**
 * Splits long Arabic utterances into <= 135 character chunks along punctuation
 * so Android Chrome Web Speech API never cuts off speech after ~15 seconds.
 */
function chunkArabicSpeech(text: string, maxLen = 135): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const rawParts = normalized.split(/([.!؟،؛:])/g);
  const sentences: string[] = [];
  let buf = '';

  for (const part of rawParts) {
    if (!part) continue;
    if (/^[.!؟،؛:]$/.test(part)) {
      buf += part;
      if (buf.trim()) sentences.push(buf.trim());
      buf = '';
    } else {
      buf += part;
    }
  }
  if (buf.trim()) sentences.push(buf.trim());

  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if (s.length > maxLen) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      const words = s.split(' ');
      let sub = '';
      for (const w of words) {
        if ((sub + ' ' + w).trim().length > maxLen) {
          if (sub.trim()) chunks.push(sub.trim());
          sub = w;
        } else {
          sub = (sub + ' ' + w).trim();
        }
      }
      if (sub.trim()) chunks.push(sub.trim());
    } else if ((current + ' ' + s).trim().length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [normalized];
}

export function stopAllMurshidAudio(onSpeakingChange?: (speaking: boolean) => void) {
  activePlaybackToken += 1;
  if (activeSpeechTimer) {
    clearTimeout(activeSpeechTimer);
    activeSpeechTimer = null;
  }
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause();
      activeHtmlAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeHtmlAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
  externalStoppers.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
  activeSpeakerSetter?.(false);
  activeSpeakerSetter = null;
  onSpeakingChange?.(false);
}

export const stopMurshidSpeech = stopAllMurshidAudio;

export async function speakMurshid(
  text: string,
  options?: {
    muted?: boolean;
    volume?: number;
    rate?: number;
    mood?: 'cheerful' | 'curious' | 'warning' | 'proud';
    preferStudioAudio?: boolean;
    onSpeakingChange?: (speaking: boolean) => void;
    onEnd?: () => void;
  }
) {
  const {
    muted: mutedOpt,
    volume: volumeOpt,
    rate = 0.98,
    mood = 'cheerful',
    preferStudioAudio = false,
    onSpeakingChange,
    onEnd,
  } = options || {};

  const eff = resolveEffectiveAudio(mutedOpt, volumeOpt);
  stopAllMurshidAudio(onSpeakingChange);

  const clean = text.trim();
  if (!clean) {
    onEnd?.();
    return;
  }

  const token = activePlaybackToken;
  activeSpeakerSetter = onSpeakingChange || null;

  // When muted or Web Speech is unavailable, animate subtle speaking beat then settle
  if (eff.muted || eff.volume <= 0.01) {
    onSpeakingChange?.(true);
    const estMs = Math.min(3200, Math.max(1000, clean.length * 40));
    activeSpeechTimer = setTimeout(() => {
      if (activePlaybackToken !== token) return;
      onSpeakingChange?.(false);
      activeSpeakerSetter = null;
      onEnd?.();
    }, estMs);
    return;
  }

  // Optional server studio TTS clip (cached per session, graceful cooldown fallback)
  if (preferStudioAudio && Date.now() >= studioTtsCooldownUntil) {
    try {
      const vocalized = prepareArabicTextForTts(clean);
      const cacheKey = `${mood}:${vocalized}`;
      let base64Audio = studioAudioSessionCache.get(cacheKey);
      if (!base64Audio) {
        const res = await fetch('/api/cartoon/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: vocalized, mood }),
        });
        const data = await res.json();
        if (activePlaybackToken !== token) return;
        if (res.ok && data?.success && typeof data?.audioBase64 === 'string' && data.audioBase64.length > 0) {
          const studioClip: string = data.audioBase64;
          base64Audio = studioClip;
          if (studioAudioSessionCache.size >= 30) {
            const firstKey = studioAudioSessionCache.keys().next().value;
            if (firstKey) studioAudioSessionCache.delete(firstKey);
          }
          studioAudioSessionCache.set(cacheKey, studioClip);
        } else if (data?.fallback === 'browser_tts' || data?.quotaExceeded || res.status === 429) {
          studioTtsCooldownUntil = Date.now() + (Number(data?.retryAfterSec) || 600) * 1000;
        }
      }

      if (base64Audio && typeof Audio !== 'undefined' && activePlaybackToken === token) {
        const el = new Audio(`data:audio/wav;base64,${base64Audio}`);
        el.volume = eff.volume;
        el.playbackRate = rate;
        activeHtmlAudio = el;

        const finishStudio = () => {
          if (activePlaybackToken !== token) return;
          activeHtmlAudio = null;
          onSpeakingChange?.(false);
          activeSpeakerSetter = null;
          onEnd?.();
        };

        el.onended = finishStudio;
        el.onerror = finishStudio;
        onSpeakingChange?.(true);
        await el.play();
        return;
      }
    } catch {
      // Fall back smoothly to Web Speech API
    }
  }

  if (activePlaybackToken !== token) return;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onSpeakingChange?.(true);
    const estMs = Math.min(3400, Math.max(1100, clean.length * 42));
    activeSpeechTimer = setTimeout(() => {
      if (activePlaybackToken !== token) return;
      onSpeakingChange?.(false);
      activeSpeakerSetter = null;
      onEnd?.();
    }, estMs);
    return;
  }

  try {
    const chunks = chunkArabicSpeech(clean, 135);
    const voice = pickBestMurshidVoice();

    const speakChunkAt = (chunkIdx: number) => {
      if (activePlaybackToken !== token) return;
      if (chunkIdx >= chunks.length) {
        onSpeakingChange?.(false);
        activeSpeakerSetter = null;
        onEnd?.();
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunks[chunkIdx]);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = 'ar-OM';
      }
      utter.volume = eff.volume;
      utter.rate = rate;
      utter.pitch = 1.03;

      let settled = false;
      const moveNext = () => {
        if (settled || activePlaybackToken !== token) return;
        settled = true;
        if (activeSpeechTimer) {
          clearTimeout(activeSpeechTimer);
          activeSpeechTimer = null;
        }
        speakChunkAt(chunkIdx + 1);
      };

      utter.onstart = () => {
        if (activePlaybackToken === token) onSpeakingChange?.(true);
      };
      utter.onend = moveNext;
      utter.onerror = moveNext;

      onSpeakingChange?.(true);
      window.speechSynthesis.speak(utter);

      const maxChunkMs = Math.min(9000, Math.max(2200, chunks[chunkIdx].length * 90));
      activeSpeechTimer = setTimeout(moveNext, maxChunkMs);
    };

    speakChunkAt(0);
  } catch {
    if (activePlaybackToken === token) {
      onSpeakingChange?.(false);
      activeSpeakerSetter = null;
      onEnd?.();
    }
  }
}
