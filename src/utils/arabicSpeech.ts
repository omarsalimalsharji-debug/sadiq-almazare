/**
 * Arabic Text-to-Speech (Web Speech API) Helper for In-App Book Reader
 * Prioritizes ar-OM, falls back to ar-SA, then any ar-* voice.
 * Splits text into short natural chunks to avoid browser speechSynthesis stalls.
 */

import { prepareArabicTextForTts } from './arabicPronunciation.ts';

export function scoreArabicVoice(voice: SpeechSynthesisVoice): number {
  const lang = (voice.lang || '').toLowerCase();
  const name = (voice.name || '').toLowerCase();
  if (!lang.startsWith('ar')) return -1;

  let score = 20;
  if (lang === 'ar-om' || lang.startsWith('ar-om')) {
    score = 110;
  } else if (lang === 'ar-sa' || lang.startsWith('ar-sa')) {
    score = 92;
  } else if (lang === 'ar-ae' || lang === 'ar-qa' || lang === 'ar-bh' || lang === 'ar-kw') {
    score = 78;
  } else if (lang === 'ar-001' || lang === 'ar' || lang.startsWith('ar-eg') || lang.startsWith('ar-jo')) {
    score = 60;
  }

  // Strongly prefer natural human neural/OS voices over robotic synthesizers
  if (/natural|neural|online|google|hamed|maged|tarik|zeina|salma|laila|shakir|zariyah/.test(name)) {
    score += 24;
  }
  if (/espeak|festival|pico|compact|mbrola/.test(name)) {
    score -= 70;
  }

  // Slight reliability bonus for offline local voices (unless flagged robotic)
  if (voice.localService && !/espeak|compact/.test(name)) {
    score += 6;
  }
  return score;
}

export function getSortedArabicVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => (v.lang || '').toLowerCase().startsWith('ar'))
    .sort((a, b) => scoreArabicVoice(b) - scoreArabicVoice(a));
}

export function pickBestArabicVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const sorted = getSortedArabicVoices(voices);
  return sorted.length > 0 ? sorted[0] : null;
}

export function splitPageIntoParagraphs(content: string): string[] {
  return content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function normalizeTextForArabicSpeech(text: string): string {
  const deTagged = text
    .replace(/\[م\/ت\]/g, '، موثق بسمائل ويحتاج تحققاً ميدانياً، ')
    .replace(/\[ج\/ت\]/g, '، موثق بولاية مجاورة ويحتاج تحققاً، ')
    .replace(/\[ع\/ت\]/g, '، معرفة عامة وتحتاج تحققاً، ')
    .replace(/\[ع\/ج\]/g, '، معرفة عامة وولاية مجاورة، ')
    .replace(/\[ج\/ع\]/g, '، ولاية مجاورة ومعرفة عامة، ')
    .replace(/\[م\]/g, '، موثق في سمائل، ')
    .replace(/\[ج\]/g, '، موثق في ولاية مجاورة، ')
    .replace(/\[ع\]/g, '، معرفة زراعية عامة، ')
    .replace(/\[ت\]/g, '، يحتاج تحققاً ميدانياً، ')
    .replace(/^[•\-–]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return prepareArabicTextForTts(deTagged);
}

/**
 * Splits a single paragraph into <= 160-char segments at punctuation boundaries
 * so Chrome/Android/Safari speechSynthesis does not cut off mid-sentence.
 */
export function chunkParagraphForSpeech(paragraphText: string, maxLen = 160): string[] {
  const clean = normalizeTextForArabicSpeech(paragraphText);
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const rawSentences = clean.split(/(?<=[.!؟؛،:])\s+/);
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    if (!sentence.trim()) continue;
    if ((buffer + ' ' + sentence).trim().length <= maxLen) {
      buffer = (buffer + ' ' + sentence).trim();
    } else {
      if (buffer) chunks.push(buffer);
      if (sentence.length <= maxLen) {
        buffer = sentence;
      } else {
        // Hard word split for exceptionally long sentences
        const words = sentence.split(/\s+/);
        let wordBuf = '';
        for (const w of words) {
          if ((wordBuf + ' ' + w).trim().length <= maxLen) {
            wordBuf = (wordBuf + ' ' + w).trim();
          } else {
            if (wordBuf) chunks.push(wordBuf);
            wordBuf = w;
          }
        }
        buffer = wordBuf;
      }
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}
