export type AmbientSfxPreset = 'falaj_water' | 'oasis_birds' | 'wind_palms' | 'bees_buzz';

/**
 * Procedural Web Audio API Environmental Soundscapes for Flijan's Omani Farm Stage.
 * Zero external audio file 404s; supports speaking-voice ducking (-13 dB equivalent) and mute control.
 */
class EnvironmentalSfxEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private timers: number[] = [];
  private activePreset: AmbientSfxPreset | null = null;
  private muted = false;
  private speakingDucked = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.duckGain = this.ctx.createGain();

      this.masterGain.gain.value = this.muted ? 0 : 0.085;
      this.duckGain.gain.value = this.speakingDucked ? 0.25 : 1.0;

      this.masterGain.connect(this.duckGain);
      this.duckGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 2.5): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      data[i] = last * 3.0;
    }
    return buffer;
  }

  private clearActiveNodes() {
    this.timers.forEach((id) => window.clearInterval(id));
    this.timers = [];
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
      } catch {
        // already stopped
      }
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.085, this.ctx.currentTime, 0.08);
    }
  }

  public setSpeakingDuck(speaking: boolean) {
    this.speakingDucked = speaking;
    if (this.ctx && this.duckGain) {
      // Lower ambient bed cleanly when Flijan is speaking (-12 to -13 dB feel)
      this.duckGain.gain.setTargetAtTime(speaking ? 0.24 : 1.0, this.ctx.currentTime, 0.14);
    }
  }

  public start(preset: AmbientSfxPreset) {
    if (this.activePreset === preset && this.activeNodes.length > 0) {
      this.ensureContext();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    this.clearActiveNodes();
    this.activePreset = preset;

    const noiseBuffer = this.createNoiseBuffer(ctx, 3);

    if (preset === 'falaj_water') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 620;
      bandpass.Q.value = 1.4;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.28;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(bandpass.frequency);

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.72;

      src.connect(bandpass).connect(bedGain).connect(this.masterGain);
      src.start();
      lfo.start();
      this.activeNodes.push(src, bandpass, lfo, lfoGain, bedGain);
    } else if (preset === 'wind_palms') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 420;
      lowpass.Q.value = 0.8;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.16;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 210;
      lfo.connect(lfoGain).connect(lowpass.frequency);

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.65;

      src.connect(lowpass).connect(bedGain).connect(this.masterGain);
      src.start();
      lfo.start();
      this.activeNodes.push(src, lowpass, lfo, lfoGain, bedGain);
    } else if (preset === 'bees_buzz') {
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 156;
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 234;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 280;
      filter.Q.value = 2.6;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 3.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.08;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.14;
      lfo.connect(lfoGain).connect(bedGain.gain);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(bedGain).connect(this.masterGain);
      osc1.start();
      osc2.start();
      lfo.start();
      this.activeNodes.push(osc1, osc2, filter, lfo, lfoGain, bedGain);
    } else {
      // oasis_birds: gentle wind bed + soft periodic songbird chirps
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.36;

      src.connect(filter).connect(bedGain).connect(this.masterGain);
      src.start();
      this.activeNodes.push(src, filter, bedGain);

      const chirpTimer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 1950 + Math.random() * 650;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.32, t + 0.09);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, t + 0.17);

        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(0.18, t + 0.03);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);

        osc.connect(env).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.21);
      }, 2800);
      this.timers.push(chirpTimer);
    }
  }

  public stop() {
    this.clearActiveNodes();
    this.activePreset = null;
  }
}

export const environmentalSfx = new EnvironmentalSfxEngine();
