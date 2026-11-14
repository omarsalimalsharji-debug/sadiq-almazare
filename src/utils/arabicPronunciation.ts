/**
 * Omani Agricultural Pronunciation Dictionary & Arabic Tashkeel Processor
 * Used for both offline TTS synthesis (Piper / MMS-TTS / eSpeak) and script authoring.
 */

export interface DictionaryEntry {
  term: string;
  vocalized: string;
  category: 'محافظة وولاية' | 'آفة ومرض' | 'محصول وري' | 'مصطلح إرشادي';
  notes?: string;
}

export const OMANI_PRONUNCIATION_DICTIONARY: DictionaryEntry[] = [
  // Governorates & Wilayats
  { term: 'سلطنة عُمان', vocalized: 'سَلْطَنَةُ عُمَان', category: 'محافظة وولاية' },
  { term: 'سلطنة عمان', vocalized: 'سَلْطَنَةُ عُمَان', category: 'محافظة وولاية' },
  { term: 'عُمان', vocalized: 'عُمَان', category: 'محافظة وولاية' },
  { term: 'عمان', vocalized: 'عُمَان', category: 'محافظة وولاية' },
  { term: 'العُمانية', vocalized: 'الْعُمَانِيَّة', category: 'محافظة وولاية' },
  { term: 'العُماني', vocalized: 'الْعُمَانِيّ', category: 'محافظة وولاية' },
  { term: 'العماني', vocalized: 'الْعُمَانِيّ', category: 'محافظة وولاية' },
  { term: 'العمانية', vocalized: 'الْعُمَانِيَّة', category: 'محافظة وولاية' },
  { term: 'مسقط', vocalized: 'مَسْقَط', category: 'محافظة وولاية' },
  { term: 'الداخلية', vocalized: 'الدَّاخِلِيَّة', category: 'محافظة وولاية' },
  { term: 'سمائل', vocalized: 'سَمَائِل', category: 'محافظة وولاية' },
  { term: 'نزوى', vocalized: 'نَزْوَى', category: 'محافظة وولاية' },
  { term: 'بهلاء', vocalized: 'بَهْلَاء', category: 'محافظة وولاية' },
  { term: 'إزكي', vocalized: 'إِزْكِي', category: 'محافظة وولاية' },
  { term: 'بدبد', vocalized: 'بِدْبِد', category: 'محافظة وولاية' },
  { term: 'الباطنة', vocalized: 'الْبَاطِنَة', category: 'محافظة وولاية' },
  { term: 'صحار', vocalized: 'صُحَار', category: 'محافظة وولاية' },
  { term: 'صحم', vocalized: 'صَحَم', category: 'محافظة وولاية' },
  { term: 'بركاء', vocalized: 'بَرْكَاء', category: 'محافظة وولاية' },
  { term: 'الرستاق', vocalized: 'الرُّسْتَاق', category: 'محافظة وولاية' },
  { term: 'الظاهرة', vocalized: 'الظَّاهِرَة', category: 'محافظة وولاية' },
  { term: 'عبري', vocalized: 'عِبْرِي', category: 'محافظة وولاية' },
  { term: 'الشرقية', vocalized: 'الشَّرْقِيَّة', category: 'محافظة وولاية' },
  { term: 'إبراء', vocalized: 'إِبْرَاء', category: 'محافظة وولاية' },
  { term: 'المضيبي', vocalized: 'الْمُضَيْبِي', category: 'محافظة وولاية' },
  { term: 'صور', vocalized: 'صُور', category: 'محافظة وولاية' },
  { term: 'ظفار', vocalized: 'ظُفَار', category: 'محافظة وولاية' },
  { term: 'صلالة', vocalized: 'صَلَالَة', category: 'محافظة وولاية' },
  { term: 'البريمي', vocalized: 'الْبُرَيْمِي', category: 'محافظة وولاية' },
  { term: 'مسندم', vocalized: 'مُسَنْدَم', category: 'محافظة وولاية' },
  { term: 'الوسطى', vocalized: 'الْوُسْطَى', category: 'محافظة وولاية' },
  { term: 'الجبل الأخضر', vocalized: 'الْجَبَلِ الْأَخْضَر', category: 'محافظة وولاية' },

  // Pests & Diseases
  { term: 'سوسة النخيل الحمراء', vocalized: 'سُوسَةُ النَّخِيلِ الْحَمْرَاء', category: 'آفة ومرض' },
  { term: 'دوباس النخيل', vocalized: 'دُوبَاسُ النَّخِيل', category: 'آفة ومرض' },
  { term: 'الدوباس', vocalized: 'الدُّوبَاس', category: 'آفة ومرض' },
  { term: 'دوباس', vocalized: 'دُوبَاس', category: 'آفة ومرض' },
  { term: 'الحميرة', vocalized: 'الْحُمَيْرَة', category: 'آفة ومرض' },
  { term: 'حلم الغبار', vocalized: 'حَلَمُ الْغُبَار', category: 'آفة ومرض' },
  { term: 'البياض الدقيقي', vocalized: 'الْبَيَاضُ الدَّقِيقِيّ', category: 'آفة ومرض' },
  { term: 'صانعة الأنفاق', vocalized: 'صَانِعَةُ الْأَنْفَاق', category: 'آفة ومرض' },
  { term: 'الذبابة البيضاء', vocalized: 'الذُّبَابَةُ الْبَيْضَاء', category: 'آفة ومرض' },
  { term: 'حشرة المن', vocalized: 'حَشَرَةُ الْمَنّ', category: 'آفة ومرض' },

  // Crops & Falaj Irrigation
  { term: 'الأفلاج', vocalized: 'الْأَفْلَاج', category: 'محصول وري' },
  { term: 'أفلاجنا', vocalized: 'أَفْلَاجِنَا', category: 'محصول وري' },
  { term: 'نوبة الفلج', vocalized: 'نَوْبَةُ الْفَلَج', category: 'محصول وري' },
  { term: 'الفلج', vocalized: 'الْفَلَج', category: 'محصول وري' },
  { term: 'فلج', vocalized: 'فَلَج', category: 'محصول وري' },
  { term: 'الفرض', vocalized: 'الْفَرْض', category: 'محصول وري' },
  { term: 'الخلاص', vocalized: 'الْخَلَاص', category: 'محصول وري' },
  { term: 'الخنيزي', vocalized: 'الْخُنَيْزِي', category: 'محصول وري' },
  { term: 'التنقيط', vocalized: 'التَّنْقِيط', category: 'محصول وري' },
  { term: 'البيوت المحمية', vocalized: 'الْبُيُوتُ الْمَحْمِيَّة', category: 'محصول وري' },
  { term: 'البيت المحمي', vocalized: 'الْبَيْتُ الْمَحْمِيّ', category: 'محصول وري' },
  { term: 'الحبابوك', vocalized: 'الْحَبَابُوك', category: 'محصول وري' },
  { term: 'الجمري', vocalized: 'الْجَمْرِي', category: 'محصول وري' },
  { term: 'الخلال', vocalized: 'الْخَلَال', category: 'محصول وري' },
  { term: 'الرطب', vocalized: 'الرُّطَب', category: 'محصول وري' },
  { term: 'الطناء', vocalized: 'الطَّنَاء', category: 'محصول وري' },
  { term: 'الجداد', vocalized: 'الْجِدَاد', category: 'محصول وري' },

  // Advisory & Mascot Terms
  { term: 'فليجان', vocalized: 'فْلَيْجَان', category: 'مصطلح إرشادي', notes: 'الشخصية الإرشادية الكرتونية' },
  { term: 'فلجان', vocalized: 'فَلْجَان', category: 'مصطلح إرشادي' },
  { term: 'صديق المزارع', vocalized: 'صَدِيقُ الْمُزَارِع', category: 'مصطلح إرشادي' },
  { term: 'زيت النيم', vocalized: 'زَيْتُ النِّيم', category: 'مصطلح إرشادي' },
  { term: 'بيكربونات البوتاسيوم', vocalized: 'بِيكَرْبُونَاتُ الْبُوتَاسْيُوم', category: 'مصطلح إرشادي' },
  { term: 'المصائد الفيرمونية', vocalized: 'الْمَصَائِدُ الْفِيرْمُونِيَّة', category: 'مصطلح إرشادي' },
  { term: 'التكميم', vocalized: 'التَّكْمِيم', category: 'مصطلح إرشادي' },
  { term: 'التلقيح', vocalized: 'التَّلْقِيح', category: 'مصطلح إرشادي' },
  { term: 'التقليم', vocalized: 'التَّقْلِيم', category: 'مصطلح إرشادي' },
  { term: 'السماد العضوي', vocalized: 'السَّمَادُ الْعُضْوِيّ', category: 'مصطلح إرشادي' },
  { term: 'المكافحة الحيوية', vocalized: 'الْمُكَافَحَةُ الْحَيَوِيَّة', category: 'مصطلح إرشادي' },
];

const SORTED_DICTIONARY = [...OMANI_PRONUNCIATION_DICTIONARY].sort(
  (a, b) => b.term.length - a.term.length
);

export function stripArabicDiacritics(input: string): string {
  return input.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Applies dictionary-guided Omani agricultural vocalization (Tashkeel)
 * and cleans percentages/units into natural spoken Arabic.
 */
export function prepareArabicTextForTts(rawText: string): string {
  let text = String(rawText || '').trim();
  if (!text) return '';

  // Normalize spoken percentages cleanly for Arabic TTS
  text = text.replace(/(\d+)\s*%/g, '$1 فِي الْمِئَة');

  // Apply Omani & agricultural pronunciation dictionary (longest match first)
  for (const entry of SORTED_DICTIONARY) {
    if (text.includes(entry.term)) {
      text = text.split(entry.term).join(entry.vocalized);
    } else {
      const plainTerm = stripArabicDiacritics(entry.term);
      if (plainTerm !== entry.term && text.includes(plainTerm)) {
        text = text.split(plainTerm).join(entry.vocalized);
      }
    }
  }

  return text.replace(/\s+/g, ' ').trim();
}

export interface PacedSpeechSegment {
  text: string;
  pauseAfterSec: number; // Always strictly within 0.40s - 0.70s between sentences
}

/**
 * Splits Arabic narration into sentences and assigns natural 0.4s - 0.7s pauses.
 */
export function splitIntoPacedSegments(vocalizedText: string): PacedSpeechSegment[] {
  const normalized = vocalizedText.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const tokens = normalized.split(/([.!؟،؛:])/g);
  const segments: PacedSpeechSegment[] = [];
  let buffer = '';

  for (const tok of tokens) {
    if (!tok) continue;
    if (/^[.!؟]$/.test(tok)) {
      const sentence = (buffer + tok).trim();
      if (sentence) {
        segments.push({ text: sentence, pauseAfterSec: 0.6 });
      }
      buffer = '';
    } else if (/^[،؛:]$/.test(tok)) {
      const clause = (buffer + tok).trim();
      if (clause && clause.length >= 18) {
        segments.push({ text: clause, pauseAfterSec: 0.42 });
        buffer = '';
      } else {
        buffer = clause + ' ';
      }
    } else {
      buffer += tok;
    }
  }

  const tail = buffer.trim();
  if (tail) {
    segments.push({ text: tail, pauseAfterSec: 0.5 });
  }

  return segments;
}
