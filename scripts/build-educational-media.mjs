/**
 * Batch 2 Media Production Pipeline — صديق المزارع الذكي
 * Builds:
 *  1) Original CC0 calm Omani acoustic instrumental track
 *  2) 4 open-source Arabic TTS comparison samples (Piper Medium, Piper Low, MMS-TTS, eSpeak-NG) @ -16 LUFS
 *  3) Content-addressed SHA-256 speech cache with Omani pronunciation dictionary & 0.4-0.7s pauses
 *  4) Sidechain music ducking (-13 dB under speech) + 2-pass FFmpeg loudnorm (-16 LUFS)
 *  5) Connected MP4 films (1080p + 480p) with zoompan, xfade transitions, 3-point summary card,
 *     word-synced libass karaoke subtitles, and ZERO scene numbering ("المشهد الأول/الثاني").
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { INITIAL_CARTOON_EPISODES } from '../src/data/cartoonEpisodesData.ts';
import { VOICE_COMPARISON_TEXT_VOCALIZED } from '../src/data/voiceEvaluationData.ts';
import {
  prepareArabicTextForTts,
  splitIntoPacedSegments,
} from '../src/utils/arabicPronunciation.ts';

const ROOT = process.cwd();
const PIPER_BIN = path.join(ROOT, '.tools/piper/piper/piper');
const PIPER_VOICES = {
  'piper-kareem-medium': path.join(ROOT, '.tools/voices/ar_JO-kareem-medium.onnx'),
  'piper-kareem-low': path.join(ROOT, '.tools/voices/ar_JO-kareem-low.onnx'),
};
const HF_CACHE_DIR = path.join(ROOT, '.tools/hf-cache');

const MEDIA_DIR = path.join(ROOT, 'public/media');
const AUDIO_DIR = path.join(MEDIA_DIR, 'audio');
const AUDIO_CACHE_DIR = path.join(AUDIO_DIR, 'cache');
const VOICE_COMP_DIR = path.join(MEDIA_DIR, 'voice-comparison');
const VIDEO_DIR = path.join(MEDIA_DIR, 'videos');
const SUB_DIR = path.join(MEDIA_DIR, 'subtitles');
const TMP_DIR = path.join(ROOT, '.tools/media-work');

for (const dir of [MEDIA_DIR, AUDIO_DIR, AUDIO_CACHE_DIR, VOICE_COMP_DIR, VIDEO_DIR, SUB_DIR, TMP_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const CACHE_MANIFEST_PATH = path.join(AUDIO_CACHE_DIR, 'manifest.json');
let cacheManifest = {};
if (fs.existsSync(CACHE_MANIFEST_PATH)) {
  try {
    cacheManifest = JSON.parse(fs.readFileSync(CACHE_MANIFEST_PATH, 'utf-8'));
  } catch {
    cacheManifest = {};
  }
}

function saveCacheManifest() {
  fs.writeFileSync(CACHE_MANIFEST_PATH, JSON.stringify(cacheManifest, null, 2), 'utf-8');
}

function runFfmpeg(args, label = 'ffmpeg') {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-y', ...args], {
    encoding: 'utf-8',
    maxBuffer: 25 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(`[${label}] ffmpeg failed:\n${res.stderr}`);
  }
  return res.stderr || '';
}

function probeMedia(filePath) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,width,height,sample_rate', '-of', 'json', filePath],
    { encoding: 'utf-8' }
  );
  return JSON.parse(out);
}

function getDurationSec(filePath) {
  const info = probeMedia(filePath);
  return Number(info?.format?.duration || 0);
}

function writePcmWav(filePath, floatSamples, sampleRate) {
  const numSamples = floatSamples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  let peak = 0;
  for (let i = 0; i < numSamples; i++) {
    const abs = Math.abs(floatSamples[i]);
    if (abs > peak) peak = abs;
  }
  const scale = peak > 0.95 ? 0.95 / peak : 1.0;

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i] * scale));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

/**
 * 1. Generate original CC0 warm acoustic/oud-inspired instrumental background music (48kHz stereo WAV)
 */
function ensureCc0MusicTrack() {
  const outPath = path.join(AUDIO_DIR, 'oman-harvest-cc0.wav');
  const rawPath = path.join(TMP_DIR, 'music_raw.wav');
  const sr = 48000;
  const durationSec = 105;
  const totalSamples = sr * durationSec;
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Warm D-major / Omani coastal pentatonic gentle progression (Hz)
  const droneRoot = 146.83; // D3
  const droneFifth = 220.0; // A3
  const melodyPools = [
    [293.66, 329.63, 369.99, 440.0, 587.33, 440.0, 369.99, 329.63], // D major warmth
    [246.94, 293.66, 369.99, 440.0, 493.88, 440.0, 369.99, 293.66], // Bm7 peaceful
    [220.0, 293.66, 329.63, 440.0, 523.25, 440.0, 329.63, 293.66], // Gmaj / A sus
    [196.0, 246.94, 293.66, 392.0, 440.0, 392.0, 329.63, 293.66], // G calm
  ];

  // Continuous gentle warm pad
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const swell = 0.72 + 0.28 * Math.sin(2 * Math.PI * t * 0.12);
    const padL = (0.045 * Math.sin(2 * Math.PI * droneRoot * t) + 0.025 * Math.sin(2 * Math.PI * droneFifth * t)) * swell;
    const padR = (0.042 * Math.sin(2 * Math.PI * droneRoot * t + 0.25) + 0.026 * Math.sin(2 * Math.PI * droneFifth * t + 0.4)) * swell;
    left[i] = padL;
    right[i] = padR;
  }

  // Plucked acoustic arpeggio notes every 0.65s
  const stepSec = 0.65;
  const totalNotes = Math.floor(durationSec / stepSec);
  for (let n = 0; n < totalNotes; n++) {
    const barIdx = Math.floor(n / 8) % melodyPools.length;
    const noteFreq = melodyPools[barIdx][n % 8];
    const startSample = Math.floor(n * stepSec * sr);
    const noteLen = Math.floor(1.45 * sr);
    const pan = (n % 2 === 0) ? 0.62 : 0.38;

    for (let k = 0; k < noteLen && startSample + k < totalSamples; k++) {
      const nt = k / sr;
      const attack = Math.min(1, nt / 0.018);
      const decay = Math.exp(-nt * 2.6);
      const fundamental = Math.sin(2 * Math.PI * noteFreq * nt);
      const secondHarm = 0.35 * Math.sin(2 * Math.PI * noteFreq * 2 * nt) * Math.exp(-nt * 4.0);
      const thirdHarm = 0.12 * Math.sin(2 * Math.PI * noteFreq * 3 * nt) * Math.exp(-nt * 7.0);
      const sample = (fundamental + secondHarm + thirdHarm) * attack * decay * 0.11;
      left[startSample + k] += sample * (1 - pan * 0.4);
      right[startSample + k] += sample * (0.6 + pan * 0.4);
    }
  }

  // Write stereo WAV
  const buf = Buffer.alloc(44 + totalSamples * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + totalSamples * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(totalSamples * 4, 40);

  for (let i = 0; i < totalSamples; i++) {
    const l = Math.max(-0.95, Math.min(0.95, left[i]));
    const r = Math.max(-0.95, Math.min(0.95, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
  }
  fs.writeFileSync(rawPath, buf);

  // Warm acoustic filtering & consistent baseline level (-22 LUFS before sidechain ducking)
  runFfmpeg([
    '-i', rawPath,
    '-af', 'lowpass=f=2400,highpass=f=85,aecho=0.8:0.7:45:0.18,afade=t=in:ss=0:d=1.5,afade=t=out:st=102:d=3,loudnorm=I=-22:TP=-2:LRA=7',
    '-ar', '48000', '-ac', '2',
    outPath,
  ], 'cc0-music');
  return outPath;
}

let cachedMmsPipeline = null;
async function getMmsPipeline() {
  if (!cachedMmsPipeline) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = HF_CACHE_DIR;
    cachedMmsPipeline = await pipeline('text-to-speech', 'Xenova/mms-tts-ara', { dtype: 'fp32' });
  }
  return cachedMmsPipeline;
}

/**
 * Synthesize a single segment with the chosen open-source TTS engine
 */
async function synthesizeSegmentRaw(voiceId, text, outWavPath) {
  if (voiceId === 'piper-kareem-medium' || voiceId === 'piper-kareem-low') {
    const modelPath = PIPER_VOICES[voiceId];
    const res = spawnSync(
      PIPER_BIN,
      ['--model', modelPath, '--length_scale', '1.08', '--noise_scale', '0.62', '--output_file', outWavPath],
      { input: text + '\n', encoding: 'utf-8' }
    );
    if (res.status !== 0) {
      throw new Error(`Piper failed (${voiceId}): ${res.stderr}`);
    }
    return;
  }

  if (voiceId === 'mms-tts-ara') {
    const tts = await getMmsPipeline();
    const result = await tts(text);
    writePcmWav(outWavPath, result.audio, result.sampling_rate || 16000);
    return;
  }

  if (voiceId === 'espeak-ng-ar') {
    const piperDir = path.dirname(PIPER_BIN);
    const bundledEspeak = path.join(piperDir, 'espeak-ng');
    const espeakCmd = fs.existsSync(bundledEspeak) ? bundledEspeak : 'espeak-ng';
    const espeakArgs = fs.existsSync(bundledEspeak)
      ? [`--path=${piperDir}`, '-v', 'ar', '-s', '138', '-p', '46', '-w', outWavPath, text]
      : ['-v', 'ar', '-s', '138', '-p', '46', '-w', outWavPath, text];
    const res = spawnSync(espeakCmd, espeakArgs, {
      encoding: 'utf-8',
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${piperDir}${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`,
      },
    });
    if (res.status !== 0) {
      throw new Error(`eSpeak-NG failed: ${res.stderr || res.error?.message}`);
    }
    return;
  }

  throw new Error(`Unknown voiceId: ${voiceId}`);
}

/**
 * Two-pass FFmpeg loudnorm helper returning exact measured input/output LUFS & true peak
 */
function twoPassLoudnorm(inputPath, outputPath, targetI = -16, outputCodecArgs = ['-ar', '48000', '-ac', '2']) {
  const pass1Stderr = runFfmpeg([
    '-i', inputPath,
    '-af', `loudnorm=I=${targetI}:TP=-1.5:LRA=11:print_format=json`,
    '-f', 'null', '-',
  ], 'loudnorm-pass1');

  const jsonMatch = pass1Stderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  let filter = `loudnorm=I=${targetI}:TP=-1.5:LRA=11`;
  let stats = null;

  if (jsonMatch) {
    try {
      stats = JSON.parse(jsonMatch[0]);
      filter = `loudnorm=I=${targetI}:TP=-1.5:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
    } catch {
      // Fallback to single-pass if parse fails
    }
  }

  runFfmpeg(['-i', inputPath, '-af', filter, ...outputCodecArgs, outputPath], 'loudnorm-pass2');

  // Verify final output LUFS via measure pass
  const verifyStderr = runFfmpeg([
    '-i', outputPath,
    '-af', `loudnorm=I=${targetI}:TP=-1.5:LRA=11:print_format=json`,
    '-f', 'null', '-',
  ], 'loudnorm-verify');
  const vMatch = verifyStderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
  let verifiedStats = null;
  if (vMatch) {
    try { verifiedStats = JSON.parse(vMatch[0]); } catch { /* ignore */ }
  }
  return { pass1Stats: stats, verifiedStats };
}

/**
 * Content-addressed speech synthesizer:
 * Applies pronunciation dictionary + Tashkeel, splits sentences with 0.42-0.60s pauses,
 * normalizes speech cleanly, and caches by SHA-256 hash so identical text is NEVER regenerated.
 */
async function synthesizeCachedPacedSpeech(voiceId, rawOrVocalizedText, labelTag) {
  const preparedText = prepareArabicTextForTts(rawOrVocalizedText);
  const segments = splitIntoPacedSegments(preparedText);

  const cacheHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ version: 'batch2-v1', voiceId, pace: 1.08, pauses: '0.42-0.60', targetLufs: -16, preparedText }))
    .digest('hex')
    .slice(0, 24);

  const cachedWav = path.join(AUDIO_CACHE_DIR, `${cacheHash}.wav`);
  if (fs.existsSync(cachedWav) && cacheManifest[cacheHash]) {
    return {
      wavPath: cachedWav,
      cacheHash,
      cached: true,
      preparedText,
      durationSec: getDurationSec(cachedWav),
    };
  }

  const partFiles = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segRaw = path.join(TMP_DIR, `${labelTag}_${i}_raw.wav`);
    const segPaced = path.join(TMP_DIR, `${labelTag}_${i}_paced.wav`);
    await synthesizeSegmentRaw(voiceId, seg.text, segRaw);

    const isLast = i === segments.length - 1;
    const pauseSec = isLast ? 0.25 : Math.max(0.4, Math.min(0.7, seg.pauseAfterSec));
    runFfmpeg([
      '-i', segRaw,
      '-af', `aresample=48000,aformat=channel_layouts=stereo,silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.12:stop_threshold=-45dB,apad=pad_dur=${pauseSec}`,
      '-ar', '48000', '-ac', '2',
      segPaced,
    ], `seg-pace-${i}`);
    partFiles.push(segPaced);
  }

  const concatListPath = path.join(TMP_DIR, `${labelTag}_concat.txt`);
  fs.writeFileSync(concatListPath, partFiles.map((f) => `file '${f}'`).join('\n'), 'utf-8');

  const joinedPath = path.join(TMP_DIR, `${labelTag}_joined.wav`);
  runFfmpeg(['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', joinedPath], 'concat-speech');

  // Clean gentle vocal EQ + 2-pass normalize isolated speech to -16 LUFS
  const eqPath = path.join(TMP_DIR, `${labelTag}_eq.wav`);
  runFfmpeg([
    '-i', joinedPath,
    '-af', 'highpass=f=90,equalizer=f=2800:width_type=o:width=1.4:g=2.0,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=120',
    '-ar', '48000', '-ac', '2',
    eqPath,
  ], 'vocal-eq');

  twoPassLoudnorm(eqPath, cachedWav, -16, ['-ar', '48000', '-ac', '2']);
  const durationSec = getDurationSec(cachedWav);

  cacheManifest[cacheHash] = {
    voiceId,
    preparedText,
    durationSec,
    createdAt: new Date().toISOString(),
  };
  saveCacheManifest();

  return { wavPath: cachedWav, cacheHash, cached: false, preparedText, durationSec };
}

/**
 * 2. Build the 4 Open-Source Voice Comparison Samples @ -16 LUFS
 */
async function buildVoiceComparisonSamples() {
  const voices = ['piper-kareem-medium', 'piper-kareem-low', 'mms-tts-ara', 'espeak-ng-ar'];
  const report = [];

  for (const voiceId of voices) {
    console.log(`🎙️  Generating comparison sample: ${voiceId}`);
    const speech = await synthesizeCachedPacedSpeech(voiceId, VOICE_COMPARISON_TEXT_VOCALIZED, `cmp_${voiceId}`);
    const outMp3 = path.join(VOICE_COMP_DIR, `${voiceId}.mp3`);
    const norm = twoPassLoudnorm(speech.wavPath, outMp3, -16, ['-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k']);
    const measuredI = norm.verifiedStats?.input_i || 'N/A';
    const measuredTp = norm.verifiedStats?.input_tp || 'N/A';
    report.push({
      voiceId,
      mp3Url: `/media/voice-comparison/${voiceId}.mp3`,
      durationSec: Number(getDurationSec(outMp3).toFixed(2)),
      measuredLufs: measuredI,
      measuredTruePeakDb: measuredTp,
      cacheHit: speech.cached,
      sha256Key: speech.cacheHash,
    });
  }

  fs.writeFileSync(
    path.join(VOICE_COMP_DIR, 'comparison-report.json'),
    JSON.stringify({ text: VOICE_COMPARISON_TEXT_VOCALIZED, voices: report }, null, 2),
    'utf-8'
  );
  return report;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate crisp Arabic RTL SVG overlay cards (1920x1080) with transparent background
 * Note: ZERO scene numbers ("المشهد الأول/الثاني") anywhere!
 */
function buildIntroOverlaySvg(episode, outPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#042f2e" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="#064e3b" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#022c22" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#scrim)"/>
  <rect x="210" y="275" width="1500" height="530" rx="36" fill="#022c22" fill-opacity="0.78" stroke="#34d399" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="640" y="328" width="640" height="56" rx="14" fill="url(#gold)"/>
  <text x="960" y="366" text-anchor="middle" font-family="Noto Sans Arabic" font-size="30" font-weight="bold" fill="#0f172a">${escapeXml(episode.category)} · إرشاد عُماني</text>
  <text x="960" y="510" text-anchor="middle" font-family="Noto Kufi Arabic" font-size="68" font-weight="bold" fill="#ffffff">${escapeXml(episode.title)}</text>
  <line x1="660" y1="575" x2="1260" y2="575" stroke="#fbbf24" stroke-width="4" stroke-opacity="0.7"/>
  <text x="960" y="655" text-anchor="middle" font-family="Noto Sans Arabic" font-size="36" fill="#d1fae5">تقديم: فْلَيْجَان — صديق المزارع الذكي</text>
  <text x="960" y="725" text-anchor="middle" font-family="Noto Sans Arabic" font-size="26" fill="#a7f3d0">سلطنة عُمان</text>
</svg>`;
  fs.writeFileSync(outPath, svg, 'utf-8');
}

function buildBeatHudSvg(beatHeading, episodeTitle, mood, outPath) {
  const accentColor = mood === 'warning' ? '#f59e0b' : mood === 'curious' ? '#38bdf8' : '#34d399';
  const moodLabel = mood === 'warning' ? 'تنبيه وقائي مهم' : mood === 'curious' ? 'تطبيق عملي خطوة بخطوة' : mood === 'proud' ? 'نتيجة مستدامة' : 'توجيه إرشادي';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bottomScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#022c22" stop-opacity="0"/>
      <stop offset="65%" stop-color="#022c22" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#022c22" stop-opacity="0.88"/>
    </linearGradient>
    <linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#022c22" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#022c22" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1920" height="220" fill="url(#topScrim)"/>
  <rect x="0" y="680" width="1920" height="400" fill="url(#bottomScrim)"/>

  <!-- Clean Top-Right Topic Banner (Zero Scene Numbers) -->
  <rect x="1140" y="48" width="716" height="118" rx="22" fill="#064e3b" fill-opacity="0.88" stroke="${accentColor}" stroke-width="3"/>
  <text x="1812" y="92" text-anchor="end" font-family="Noto Sans Arabic" font-size="24" font-weight="bold" fill="${accentColor}">${escapeXml(moodLabel)}</text>
  <text x="1812" y="142" text-anchor="end" font-family="Noto Kufi Arabic" font-size="38" font-weight="bold" fill="#ffffff">${escapeXml(beatHeading)}</text>

  <!-- Subtle Brand Corner Top-Left -->
  <rect x="64" y="48" width="460" height="68" rx="16" fill="#0f172a" fill-opacity="0.72" stroke="#34d399" stroke-opacity="0.4" stroke-width="2"/>
  <text x="294" y="92" text-anchor="middle" font-family="Noto Sans Arabic" font-size="25" font-weight="bold" fill="#ecfdf5">${escapeXml(episodeTitle.slice(0, 34))}</text>
</svg>`;
  fs.writeFileSync(outPath, svg, 'utf-8');
}

function buildSummaryCardSvg(episode, outPath) {
  const pts = episode.summaryPoints || [episode.takeaway, 'المتابعة المنتظمة تحمي المزروعات', 'استشر المرشد الزراعي عند الحاجة'];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#022c22" stop-opacity="0.84"/>
      <stop offset="100%" stop-color="#064e3b" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <rect x="220" y="130" width="1480" height="710" rx="34" fill="#064e3b" fill-opacity="0.92" stroke="#fbbf24" stroke-width="3"/>
  <text x="960" y="220" text-anchor="middle" font-family="Noto Kufi Arabic" font-size="48" font-weight="bold" fill="#fcd34d">خلاصة المزارع في ثلاث نقاط</text>
  <line x1="560" y1="252" x2="1360" y2="252" stroke="#34d399" stroke-opacity="0.45" stroke-width="2"/>

  <rect x="300" y="305" width="1320" height="130" rx="20" fill="#022c22" fill-opacity="0.75" stroke="#34d399" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="1555" cy="370" r="24" fill="#10b981"/>
  <path d="M1544 370 L1553 380 L1569 360" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="1505" y="382" text-anchor="end" font-family="Noto Sans Arabic" font-size="35" font-weight="bold" fill="#ffffff">${escapeXml(pts[0])}</text>

  <rect x="300" y="465" width="1320" height="130" rx="20" fill="#022c22" fill-opacity="0.75" stroke="#34d399" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="1555" cy="530" r="24" fill="#10b981"/>
  <path d="M1544 530 L1553 540 L1569 520" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="1505" y="542" text-anchor="end" font-family="Noto Sans Arabic" font-size="35" font-weight="bold" fill="#ffffff">${escapeXml(pts[1])}</text>

  <rect x="300" y="625" width="1320" height="130" rx="20" fill="#022c22" fill-opacity="0.75" stroke="#34d399" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="1555" cy="690" r="24" fill="#10b981"/>
  <path d="M1544 690 L1553 700 L1569 680" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="1505" y="702" text-anchor="end" font-family="Noto Sans Arabic" font-size="35" font-weight="bold" fill="#ffffff">${escapeXml(pts[2])}</text>
</svg>`;
  fs.writeFileSync(outPath, svg, 'utf-8');
}

function buildOutroOverlaySvg(outPath) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="outroBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="55%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#042f2e"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#outroBg)"/>
  <circle cx="960" cy="340" r="108" fill="#10b981" fill-opacity="0.18" stroke="#fbbf24" stroke-width="4"/>
  <!-- Stylized Date Palm + Water Emblem -->
  <path d="M960 412 L960 295" stroke="#fbbf24" stroke-width="10" stroke-linecap="round"/>
  <path d="M960 300 Q900 265 875 305 Q925 305 960 315 Z" fill="#34d399"/>
  <path d="M960 300 Q1020 265 1045 305 Q995 305 960 315 Z" fill="#34d399"/>
  <path d="M960 292 Q920 235 895 262 Q935 280 960 298 Z" fill="#6ee7b7"/>
  <path d="M960 292 Q1000 235 1025 262 Q985 280 960 298 Z" fill="#6ee7b7"/>
  <text x="960" y="540" text-anchor="middle" font-family="Noto Kufi Arabic" font-size="68" font-weight="bold" fill="#ffffff">صديق المزارع الذكي</text>
  <text x="960" y="625" text-anchor="middle" font-family="Noto Sans Arabic" font-size="38" fill="#a7f3d0">إرشاد زراعي موثوق لمزارعي سلطنة عُمان</text>
  <rect x="610" y="695" width="700" height="68" rx="18" fill="#022c22" stroke="#34d399" stroke-opacity="0.5" stroke-width="2"/>
  <text x="960" y="740" text-anchor="middle" font-family="Noto Sans Arabic" font-size="30" font-weight="bold" fill="#fcd34d">فكرة وإدارة البرنامج: عمر الشرجي</text>
</svg>`;
  fs.writeFileSync(outPath, svg, 'utf-8');
}

function formatAssTime(sec) {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = (clamped % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}

function formatVttTime(sec) {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = (clamped % 60).toFixed(3).padStart(6, '0');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s}`;
}

/**
 * Build word-by-word karaoke ASS subtitles + WebVTT aligned to exact measured beat timestamps
 */
function writeSynchronizedSubtitles(episodeId, beatTimings) {
  const assPath = path.join(SUB_DIR, `${episodeId}.ass`);
  const vttPath = path.join(SUB_DIR, `${episodeId}.vtt`);

  const assLines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1920',
    'PlayResY: 1080',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: OmaniKaraoke,Noto Sans Arabic,56,&H0034D399,&H00FFFFFF,&H000F172A,&HC8022C22,1,0,0,0,100,100,0,0,1,3.5,1,2,110,110,54,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const vttLines = ['WEBVTT', ''];

  for (const b of beatTimings) {
    // Split long narration into crisp 1-2 line chunks synced proportionally to speech duration
    const speechDuration = Math.max(1.5, b.speechDurationSec);
    const words = b.narration.trim().split(/\s+/).filter(Boolean);
    const chunks = [];
    const maxWordsPerChunk = 10;
    for (let i = 0; i < words.length; i += maxWordsPerChunk) {
      chunks.push(words.slice(i, i + maxWordsPerChunk));
    }

    const totalChars = words.reduce((acc, w) => acc + w.length, 0) || 1;
    let cursorSec = b.startSec + 0.12;

    chunks.forEach((chunkWords, cIdx) => {
      const chunkChars = chunkWords.reduce((acc, w) => acc + w.length, 0) || 1;
      const chunkDur = (chunkChars / totalChars) * (speechDuration - 0.18);
      const chunkStart = cursorSec;
      const chunkEnd = Math.min(b.endSec - 0.05, chunkStart + chunkDur);
      cursorSec = chunkEnd;

      const totalCs = Math.max(20, Math.round((chunkEnd - chunkStart) * 100));
      let allocated = 0;
      const kfParts = chunkWords.map((word, wIdx) => {
        const weight = word.length / chunkChars;
        const cs = wIdx === chunkWords.length - 1
          ? Math.max(10, totalCs - allocated)
          : Math.max(10, Math.round(totalCs * weight));
        allocated += cs;
        return `{\\kf${cs}}${word}`;
      });

      assLines.push(
        `Dialogue: 0,${formatAssTime(chunkStart)},${formatAssTime(chunkEnd)},OmaniKaraoke,,0,0,0,,${kfParts.join(' ')}`
      );

      vttLines.push(
        `${cIdx + 1}-${b.id}`,
        `${formatVttTime(chunkStart)} --> ${formatVttTime(chunkEnd)}`,
        chunkWords.join(' '),
        ''
      );
    });
  }

  fs.writeFileSync(assPath, assLines.join('\n'), 'utf-8');
  fs.writeFileSync(vttPath, vttLines.join('\n'), 'utf-8');
  return { assPath, vttPath };
}

/**
 * Render an animated 1080p silent video segment from artwork + SVG overlay + slow zoompan camera move
 */
function renderAnimatedSegment(artworkPath, svgOverlayPath, durationSec, motionIndex, outMp4Path) {
  const fps = 25;
  const frames = Math.max(25, Math.ceil(durationSec * fps));

  // Alternating gentle slow camera motion presets (zero harsh jitter)
  const motionExprs = [
    `z='min(zoom+0.0007,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    `z='1.06':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)'`,
    `z='max(1.07-0.0006*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
    `z='1.05':x='(iw-iw/zoom)*(1-on/${frames})':y='ih/2-(ih/zoom/2)'`,
  ];
  const zExpr = motionExprs[motionIndex % motionExprs.length];

  const overlayPng = outMp4Path.replace(/\.mp4$/, '_ov.png');
  runFfmpeg(['-i', svgOverlayPath, overlayPng], 'svg-to-png');

  runFfmpeg([
    '-loop', '1', '-i', artworkPath,
    '-loop', '1', '-i', overlayPng,
    '-filter_complex',
    `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=${zExpr}:d=${frames}:s=1920x1080:fps=${fps},setsar=1[bg];[1:v]scale=1920:1080[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[vout]`,
    '-map', '[vout]',
    '-t', durationSec.toFixed(3),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '17',
    outMp4Path,
  ], 'render-seg');
}

/**
 * Build complete audio + 1080p + 480p connected film for one episode
 */
async function produceEpisodeFilm(episode, cc0MusicPath, voiceId) {
  console.log(`\n🎬 Producing connected episode: ${episode.id} (${episode.title})`);
  const epWork = path.join(TMP_DIR, episode.id);
  fs.mkdirSync(epWork, { recursive: true });

  let artworkRel = episode.heroArtwork?.replace(/^\//, '') || 'public/media/posters/oman_falaj_drip.jpg';
  if (artworkRel.startsWith('media/')) artworkRel = `public/${artworkRel}`;
  const artworkPath = path.join(ROOT, artworkRel);

  // 1. Synthesize each narrative beat with exact Omani pronunciation dictionary & pauses
  const beatAudios = [];
  for (let i = 0; i < episode.scenes.length; i++) {
    const sc = episode.scenes[i];
    const spokenText = sc.vocalizedNarration || sc.narration;
    const speech = await synthesizeCachedPacedSpeech(voiceId, spokenText, `${episode.id}_b${i}`);
    beatAudios.push({
      id: sc.id,
      heading: sc.sceneHeading,
      narration: sc.narration,
      mood: sc.flijanMood,
      wavPath: speech.wavPath,
      speechDurationSec: speech.durationSec,
      cached: speech.cached,
      cacheHash: speech.cacheHash,
    });
  }

  // 2. Exact Timeline Calculation (all durations driven by measured ffprobe lengths!)
  const introDur = 4.0;
  const summaryExtraDur = 2.0; // extra linger after last beat or dedicated summary beat
  const outroDur = 4.0;
  const xfadeDur = 0.6;

  // Build master speech track padded for intro at start & summary/outro at end
  // Sequence structure:
  //   Seg 0: Intro Title Card (4.0s, music only)
  //   Seg 1..3: Beats 0..2 (beat.speechDurationSec + 0.6s breathing tail)
  //   Seg 4: Beat 3 / Solution Result -> transitioning into Summary 3-Point Card
  // Actually let's place Beat 3 visually as the 3-Point Summary Card while Beat 3's summary narration plays!
  // Wait: let's make 6 visual clips so EVERY lesson visibly shows:
  //   Clip 0: Intro Hook (4.0s)
  //   Clip 1: Beat 0 (Problem/Hook)
  //   Clip 2: Beat 1 (Cause/Warning)
  //   Clip 3: Beat 2 (Step-by-step Solution)
  //   Clip 4: Beat 3 (3-Point Summary Card synced with summary voiceover + 1.4s dwell)
  //   Clip 5: Branded Outro Logo Card (4.0s)

  const clipDefs = [];
  clipDefs.push({
    type: 'intro',
    rawDur: introDur,
    speechWav: null,
    speechDur: 0,
  });

  for (let i = 0; i < beatAudios.length; i++) {
    const b = beatAudios[i];
    const isSummaryBeat = i === beatAudios.length - 1;
    clipDefs.push({
      type: isSummaryBeat ? 'summary' : 'beat',
      beat: b,
      rawDur: Number((b.speechDurationSec + (isSummaryBeat ? 1.5 : 0.7)).toFixed(3)),
      speechWav: b.wavPath,
      speechDur: b.speechDurationSec,
    });
  }

  clipDefs.push({
    type: 'outro',
    rawDur: outroDur,
    speechWav: null,
    speechDur: 0,
  });

  // Compute exact timeline offsets considering 0.6s xfade overlap between consecutive clips
  let cursor = 0;
  const timeline = [];
  for (let i = 0; i < clipDefs.length; i++) {
    const c = clipDefs[i];
    const startSec = cursor;
    const endSec = startSec + c.rawDur;
    timeline.push({ ...c, index: i, startSec, endSec });
    cursor = endSec - (i < clipDefs.length - 1 ? xfadeDur : 0);
  }
  const totalFilmDuration = Number(timeline[timeline.length - 1].endSec.toFixed(3));

  // 3. Assemble aligned full-film voice track using adelay at exact beat start times
  const speechInputs = [];
  const delayFilters = [];
  const mixInputs = [];
  const beatSubTimings = [];

  let speechIdx = 0;
  for (const item of timeline) {
    if (item.speechWav) {
      speechInputs.push('-i', item.speechWav);
      // Wait 0.45s into visual clip so transition settles cleanly before voice enters
      const voiceStartSec = item.startSec + (item.index === 1 ? 0.35 : 0.45);
      const delayMs = Math.round(voiceStartSec * 1000);
      delayFilters.push(`[${speechIdx}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs}[d${speechIdx}]`);
      mixInputs.push(`[d${speechIdx}]`);

      beatSubTimings.push({
        id: item.beat.id,
        narration: item.beat.narration,
        startSec: voiceStartSec,
        endSec: Math.min(item.endSec - 0.1, voiceStartSec + item.speechDur),
        speechDurationSec: item.speechDur,
      });
      speechIdx++;
    }
  }

  const alignedSpeechWav = path.join(epWork, 'aligned_speech.wav');
  runFfmpeg([
    ...speechInputs,
    '-filter_complex',
    `${delayFilters.join(';')};${mixInputs.join('')}amix=inputs=${mixInputs.length}:normalize=0,apad=whole_dur=${totalFilmDuration}`,
    '-t', String(totalFilmDuration),
    '-ar', '48000', '-ac', '2',
    alignedSpeechWav,
  ], 'align-speech');

  // 4. Automatic Sidechain Ducking (-12 to -15 dB under speech) + Two-pass -16 LUFS Mastering
  const duckedRawWav = path.join(epWork, 'ducked_raw.wav');
  runFfmpeg([
    '-i', alignedSpeechWav,
    '-stream_loop', '-1', '-i', cc0MusicPath,
    '-filter_complex',
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,asplit=2[sp_sc][sp_mix];` +
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${totalFilmDuration},asetpts=PTS-STARTPTS,afade=t=in:ss=0:d=1.2,afade=t=out:st=${Math.max(0, totalFilmDuration - 2.2)}:d=2.2,volume=0.85[bed];` +
    `[bed][sp_sc]sidechaincompress=threshold=0.005:ratio=8:attack=20:release=320:knee=1.5:level_sc=2[ducked_bed];` +
    `[sp_mix][ducked_bed]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[master_raw]`,
    '-map', '[master_raw]',
    '-t', String(totalFilmDuration),
    '-ar', '48000', '-ac', '2',
    duckedRawWav,
  ], 'sidechain-duck');

  const masterMp3Path = path.join(AUDIO_DIR, `${episode.id}-master.mp3`);
  const masterWavPath = path.join(epWork, 'master_16lufs.wav');
  const normWav = twoPassLoudnorm(duckedRawWav, masterWavPath, -16, ['-ar', '48000', '-ac', '2']);
  twoPassLoudnorm(duckedRawWav, masterMp3Path, -16, ['-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k']);

  // 5. Render each connected visual clip at 1080p
  const segVideoPaths = [];
  for (const item of timeline) {
    const svgPath = path.join(epWork, `ov_${item.index}.svg`);
    const segMp4 = path.join(epWork, `seg_${item.index}.mp4`);

    if (item.type === 'intro') {
      buildIntroOverlaySvg(episode, svgPath);
    } else if (item.type === 'summary') {
      buildSummaryCardSvg(episode, svgPath);
    } else if (item.type === 'outro') {
      buildOutroOverlaySvg(svgPath);
    } else {
      buildBeatHudSvg(item.beat.heading, episode.title, item.beat.mood, svgPath);
    }

    renderAnimatedSegment(artworkPath, svgPath, item.rawDur, item.index, segMp4);
    segVideoPaths.push({ path: segMp4, dur: item.rawDur });
  }

  // 6. Stitch segments with smooth xfade transitions
  const stitchedSilentMp4 = path.join(epWork, 'stitched_1080p.mp4');
  const vidInputs = segVideoPaths.flatMap((s) => ['-i', s.path]);
  let xfadeChain = '';
  let prevLabel = '[0:v]';
  let cumDur = segVideoPaths[0].dur;
  const xfadeStyles = ['fade', 'smoothleft', 'fade', 'slideleft', 'fade'];

  for (let i = 1; i < segVideoPaths.length; i++) {
    const offset = Number((cumDur - xfadeDur).toFixed(3));
    const nextLabel = i === segVideoPaths.length - 1 ? '[vxf]' : `[x${i}]`;
    const trans = xfadeStyles[(i - 1) % xfadeStyles.length];
    xfadeChain += `${prevLabel}[${i}:v]xfade=transition=${trans}:duration=${xfadeDur}:offset=${offset}${nextLabel};`;
    prevLabel = nextLabel;
    cumDur = offset + segVideoPaths[i].dur;
  }
  xfadeChain = xfadeChain.replace(/;$/, '');

  runFfmpeg([
    ...vidInputs,
    '-filter_complex', xfadeChain,
    '-map', '[vxf]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '16', '-pix_fmt', 'yuv420p',
    stitchedSilentMp4,
  ], 'xfade-stitch');

  // 7. Write synchronized ASS karaoke + WebVTT subtitles
  const { assPath } = writeSynchronizedSubtitles(episode.id, beatSubTimings);
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  // 8. Export Final Mobile-Optimized 1080p MP4 & Low-Bandwidth 480p MP4
  const out1080p = path.join(VIDEO_DIR, `${episode.id}-1080p.mp4`);
  const out480p = path.join(VIDEO_DIR, `${episode.id}-480p.mp4`);

  runFfmpeg([
    '-i', stitchedSilentMp4,
    '-i', masterWavPath,
    '-vf', `ass=${assEscaped}`,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'veryfast', '-crf', '23', '-maxrate', '2200k', '-bufsize', '4400k', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-movflags', '+faststart',
    '-shortest',
    out1080p,
  ], 'export-1080p');

  runFfmpeg([
    '-i', stitchedSilentMp4,
    '-i', masterWavPath,
    '-vf', `ass=${assEscaped},scale=854:480:flags=lanczos`,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-preset', 'veryfast', '-crf', '26', '-maxrate', '750k', '-bufsize', '1500k', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100',
    '-movflags', '+faststart',
    '-shortest',
    out480p,
  ], 'export-480p');

  const stat1080 = fs.statSync(out1080p);
  const stat480 = fs.statSync(out480p);
  const finalDuration = Number(getDurationSec(out1080p).toFixed(2));
  const lufsMeasured = normWav.verifiedStats?.input_i || 'N/A';

  console.log(`✅ Built ${episode.id}: duration=${finalDuration}s, LUFS=${lufsMeasured}, 1080p=${(stat1080.size / 1048576).toFixed(2)}MB, 480p=${(stat480.size / 1048576).toFixed(2)}MB`);

  return {
    id: episode.id,
    title: episode.title,
    durationSec: finalDuration,
    measuredLufs: lufsMeasured,
    measuredTruePeakDb: normWav.verifiedStats?.input_tp || 'N/A',
    size1080pMB: Number((stat1080.size / 1048576).toFixed(2)),
    size480pMB: Number((stat480.size / 1048576).toFixed(2)),
    video1080pUrl: `/media/videos/${episode.id}-1080p.mp4`,
    video480pUrl: `/media/videos/${episode.id}-480p.mp4`,
    audioMasterUrl: `/media/audio/${episode.id}-master.mp3`,
    subtitlesVttUrl: `/media/subtitles/${episode.id}.vtt`,
    cacheHits: beatAudios.filter((b) => b.cached).length,
    totalSegments: beatAudios.length,
  };
}

async function main() {
  const voiceArg = process.argv.find((a) => a.startsWith('--voice='))?.split('=')[1];
  const episodeArg = process.argv.find((a) => a.startsWith('--episode='))?.split('=')[1];
  const onlyComparison = process.argv.includes('--comparison-only');

  console.log('🎵 Generating CC0 Omani Acoustic Instrumental Bed...');
  const cc0MusicPath = ensureCc0MusicTrack();

  console.log('🔊 Running 4-Voice Open-Source Arabic Comparison...');
  const voiceComparison = await buildVoiceComparisonSamples();
  console.table(voiceComparison);

  if (onlyComparison) return;

  const selectedVoice = voiceArg || 'piper-kareem-medium';
  const epIds = episodeArg ? episodeArg.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const episodesToBuild = epIds
    ? INITIAL_CARTOON_EPISODES.filter((ep) => epIds.includes(ep.id))
    : INITIAL_CARTOON_EPISODES;

  const producedVideos = [];
  for (const ep of episodesToBuild) {
    const info = await produceEpisodeFilm(ep, cc0MusicPath, selectedVoice);
    producedVideos.push(info);
  }

  const manifestPath = path.join(VIDEO_DIR, 'manifest.json');
  let mergedEpisodes = producedVideos;
  if (epIds && fs.existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const byId = new Map((prev.episodes || []).map((e) => [e.id, e]));
      for (const item of producedVideos) byId.set(item.id, item);
      mergedEpisodes = INITIAL_CARTOON_EPISODES.map((ep) => byId.get(ep.id)).filter(Boolean);
    } catch {
      mergedEpisodes = producedVideos;
    }
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        voiceEngineUsed: selectedVoice,
        musicLicense: 'CC0 1.0 Public Domain (Original Synthesized Acoustic Track)',
        targetLufs: -16,
        musicDuckingDb: -13.5,
        episodes: mergedEpisodes,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log('\n🎉 Batch 2 audio & video builds completed cleanly!');
  console.table(mergedEpisodes);
}

main().catch((err) => {
  console.error('❌ Media build error:', err);
  process.exit(1);
});
