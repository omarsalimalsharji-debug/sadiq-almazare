export type FarmSoundKind =
  | 'action'
  | 'water'
  | 'plow'
  | 'level_soil'
  | 'plant'
  | 'fertilize'
  | 'weed'
  | 'pest_control'
  | 'harvest'
  | 'coin'
  | 'upgrade'
  | 'cow'
  | 'stage'
  | 'warn';

// Shared singleton AudioContext so repeated farm actions don't leak browser audio contexts
let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playFilteredNoise(ctx: AudioContext, duration: number, filterType: BiquadFilterType, freq: number, q: number, peakGain: number, delay = 0) {
  const sampleCount = Math.max(256, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  filter.Q.setValueAtTime(q, ctx.currentTime + delay);

  const gain = ctx.createGain();
  const t0 = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(0.04, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  peakGain: number,
  delay = 0
) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), t0 + duration);
  }
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playFarmSound(kind: FarmSoundKind, enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    switch (kind) {
      case 'plow':
        // Deep earth crunch + shovel thud
        playFilteredNoise(ctx, 0.22, 'lowpass', 380, 1.4, 0.16);
        playTone(ctx, 'triangle', 155, 62, 0.2, 0.14);
        break;
      case 'level_soil':
        // Crisp rake sweep
        playFilteredNoise(ctx, 0.24, 'bandpass', 850, 1.8, 0.1);
        playTone(ctx, 'sine', 240, 320, 0.14, 0.06, 0.04);
        break;
      case 'plant':
        // Warm seed drop double plink
        playTone(ctx, 'sine', 420, 520, 0.09, 0.1, 0);
        playTone(ctx, 'sine', 540, 680, 0.11, 0.09, 0.07);
        break;
      case 'water':
        // Flowing falaj splash + shimmering droplets
        playFilteredNoise(ctx, 0.34, 'bandpass', 1200, 1.2, 0.09);
        playTone(ctx, 'sine', 560, 880, 0.11, 0.06, 0.05);
        playTone(ctx, 'sine', 720, 1080, 0.11, 0.05, 0.16);
        break;
      case 'fertilize':
      case 'weed':
        // Botanical rustle + bright sparkle
        playFilteredNoise(ctx, 0.18, 'highpass', 1400, 0.9, 0.06);
        playTone(ctx, 'triangle', 520, 780, 0.16, 0.08, 0.03);
        break;
      case 'pest_control':
        // Gentle bio-mist spray + shield chime
        playFilteredNoise(ctx, 0.25, 'highpass', 2400, 1.0, 0.075);
        playTone(ctx, 'sine', 660, 880, 0.18, 0.07, 0.08);
        break;
      case 'harvest':
        // Joyful 4-note Omani marimba harvest fanfare
        playTone(ctx, 'triangle', 523.25, 523.25, 0.14, 0.12, 0);
        playTone(ctx, 'triangle', 659.25, 659.25, 0.14, 0.12, 0.08);
        playTone(ctx, 'triangle', 783.99, 783.99, 0.14, 0.13, 0.16);
        playTone(ctx, 'triangle', 1046.5, 1046.5, 0.28, 0.14, 0.24);
        break;
      case 'coin':
        // Metallic virtual coin clinks
        playTone(ctx, 'sine', 1320, 1320, 0.1, 0.09, 0);
        playTone(ctx, 'sine', 1760, 1760, 0.2, 0.1, 0.07);
        break;
      case 'upgrade':
        // Workshop chime arpeggio
        playTone(ctx, 'triangle', 440, 440, 0.12, 0.1, 0);
        playTone(ctx, 'triangle', 554.37, 554.37, 0.12, 0.1, 0.08);
        playTone(ctx, 'triangle', 659.25, 659.25, 0.16, 0.1, 0.16);
        playTone(ctx, 'triangle', 880, 880, 0.26, 0.11, 0.24);
        break;
      case 'cow':
        // Gentle warm low moo
        playTone(ctx, 'sawtooth', 148, 125, 0.34, 0.045, 0);
        playTone(ctx, 'sine', 420, 420, 0.12, 0.04, 0.18);
        break;
      case 'stage':
        // Soft plant level-up shimmer
        playTone(ctx, 'sine', 587.33, 880, 0.18, 0.06, 0);
        break;
      case 'warn':
        playTone(ctx, 'sawtooth', 220, 175, 0.18, 0.06, 0);
        break;
      default:
        playTone(ctx, 'sine', 480, 660, 0.12, 0.07, 0);
        break;
    }
  } catch {
    // Ignore browser autoplay restrictions
  }
}
