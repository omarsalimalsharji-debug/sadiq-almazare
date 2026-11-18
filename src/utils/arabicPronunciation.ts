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
  { term: 'مُرشد', vocalized: 'مُرْشِد', category: 'مصطلح إرشادي', notes: 'الشخصية الإرشادية الرسمية الحديثة' },
  { term: 'مرشد', vocalized: 'مُرْشِد', category: 'مصطلح إرشادي', notes: 'الشخصية الإرشادية الرسمية الحديثة' },
  { term: 'المرشد', vocalized: 'الْمُرْشِد', category: 'مصطلح إرشادي' },
  { term: 'صديق المزارع', vocalized: 'صَدِيقُ الْمُزَارِع', category: 'مصطلح إرشادي' },
  { term: 'زيت النيم', vocalized: 'زَيْتُ النِّيم', category: 'مصطلح إرشادي' },
  { term: 'بيكربونات البوتاسيوم', vocalized: 'بِيكَرْبُونَاتُ الْبُوتَاسْيُوم', category: 'مصطلح إرشادي' },
  { term: 'المصائد الفيرمونية', vocalized: 'الْمَصَائِدُ الْفِيرْمُونِيَّة', category: 'مصطلح إرشادي' },
  { term: 'التكميم', vocalized: 'التَّكْمِيم', category: 'مصطلح إرشادي' },
  { term: 'التلقيح', vocalized: 'التَّلْقِيح', category: 'مصطلح إرشادي' },
  { term: 'التقليم', vocalized: 'التَّقْلِيم', category: 'مصطلح إرشادي' },
  { term: 'السماد العضوي', vocalized: 'السَّمَادُ الْعُضْوِيّ', category: 'مصطلح إرشادي' },
  { term: 'المكافحة الحيوية', vocalized: 'الْمُكَافَحَةُ الْحَيَوِيَّة', category: 'مصطلح إرشادي' },
  { term: 'وادي محرم', vocalized: 'وَادِي مُحْرَم', category: 'محافظة وولاية' },
  { term: 'بركة الموز', vocalized: 'بِرْكَةُ الْمَوْز', category: 'محافظة وولاية' },
  { term: 'الحمراء', vocalized: 'الْحَمْرَاء', category: 'محافظة وولاية' },
  { term: 'منح', vocalized: 'مَنَح', category: 'محافظة وولاية' },
  { term: 'سناو', vocalized: 'سِنَاو', category: 'محافظة وولاية' },
  { term: 'ثمريت', vocalized: 'ثُمْرَيْت', category: 'محافظة وولاية' },
  { term: 'مصيرة', vocalized: 'مَصِيرَة', category: 'محافظة وولاية' },
  { term: 'دماء والطائيين', vocalized: 'دِمَاءُ وَالطَّائِيِّين', category: 'محافظة وولاية' },
  { term: 'وادي بني خالد', vocalized: 'وَادِي بَنِي خَالِد', category: 'محافظة وولاية' },
  { term: 'النارجيل', vocalized: 'النَّارْجِيل', category: 'محصول وري' },
  { term: 'الفافاي', vocalized: 'الْفَافَاي', category: 'محصول وري' },
  { term: 'اللومي العُماني', vocalized: 'اللُّومِي الْعُمَانِيّ', category: 'محصول وري' },
  { term: 'اللومي', vocalized: 'اللُّومِي', category: 'محصول وري' },
  { term: 'الليمون العُماني', vocalized: 'اللَّيْمُونُ الْعُمَانِيّ', category: 'محصول وري' },
  { term: 'الهمبا', vocalized: 'الْهَمْبَا', category: 'محصول وري' },
  { term: 'المانجو', vocalized: 'الْمَانْجُو', category: 'محصول وري' },
  { term: 'الرمان', vocalized: 'الرُّمَّان', category: 'محصول وري' },
  { term: 'التين', vocalized: 'التِّين', category: 'محصول وري' },
  { term: 'البابايا', vocalized: 'الْبَابَايَا', category: 'محصول وري' },
  { term: 'الموز العُماني', vocalized: 'الْمَوْزُ الْعُمَانِيّ', category: 'محصول وري' },
  { term: 'نخيل التمر', vocalized: 'نَخِيلُ التَّمْر', category: 'محصول وري' },
  { term: 'النخلة', vocalized: 'النَّخْلَة', category: 'محصول وري' },
  { term: 'فسيلة', vocalized: 'فَسِيلَة', category: 'محصول وري' },
  { term: 'الشماريخ', vocalized: 'الشَّمَارِيخ', category: 'محصول وري' },
  { term: 'العذوق', vocalized: 'الْعُذُوق', category: 'محصول وري' },
  { term: 'القيظ', vocalized: 'الْقَيْظ', category: 'محصول وري' },
  { term: 'الأثر', vocalized: 'الْأَثَر', category: 'محصول وري' },
  { term: 'الخريف', vocalized: 'الْخَرِيف', category: 'محصول وري' },
  { term: 'الميسياني', vocalized: 'الْمِيسِيَانِيّ', category: 'محصول وري' },
  { term: 'الكوليب', vocalized: 'الْكُولِيب', category: 'محصول وري' },
  { term: 'غبير النخيل', vocalized: 'غُبَيْرُ النَّخِيل', category: 'آفة ومرض' },
  { term: 'العنكبوت الأحمر', vocalized: 'الْعَنْكَبُوتُ الْأَحْمَر', category: 'آفة ومرض' },
  { term: 'الندوة العسلية', vocalized: 'النَّدْوَةُ الْعَسَلِيَّة', category: 'آفة ومرض' },
  { term: 'حلم الغبار', vocalized: 'حَلَمُ الْغُبَار', category: 'آفة ومرض' },
  { term: 'التربس', vocalized: 'التِّرِبْس', category: 'آفة ومرض' },
  { term: 'فترة التحريم', vocalized: 'فَتْرَةُ التَّحْرِيم', category: 'مصطلح إرشادي' },
  { term: 'المرسوم', vocalized: 'الْمَرْسُوم', category: 'مصطلح إرشادي' },
  { term: 'نخل', vocalized: 'نَخْل', category: 'محافظة وولاية' },
  { term: 'السويق', vocalized: 'السُّوَيْق', category: 'محافظة وولاية' },
  { term: 'الخابورة', vocalized: 'الْخَابُورَة', category: 'محافظة وولاية' },
  { term: 'المصنعة', vocalized: 'الْمُصَنَّعَة', category: 'محافظة وولاية' },
  { term: 'شناص', vocalized: 'شِنَاص', category: 'محافظة وولاية' },
  { term: 'ينقل', vocalized: 'يَنْقُل', category: 'محافظة وولاية' },
  { term: 'ضنك', vocalized: 'ضَنْك', category: 'محافظة وولاية' },
  { term: 'أدم', vocalized: 'أَدَم', category: 'محافظة وولاية' },
  { term: 'قريات', vocalized: 'قُرَيَّات', category: 'محافظة وولاية' },
  { term: 'السيب', vocalized: 'السِّيب', category: 'محافظة وولاية' },
  { term: 'جبل شمس', vocalized: 'جَبَلِ شَمْس', category: 'محافظة وولاية' },
];

const SORTED_DICTIONARY = [...OMANI_PRONUNCIATION_DICTIONARY].sort(
  (a, b) => b.term.length - a.term.length
);

export function stripArabicDiacritics(input: string): string {
  return input.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Applies dictionary-guided Omani agricultural vocalization (Tashkeel)
 * and cleans percentages/units/symbols into natural spoken Arabic.
 */
export function prepareArabicTextForTts(rawText: string): string {
  let text = String(rawText || '').trim();
  if (!text) return '';

  // Remove decorative emojis/symbols and markdown markers that break TTS cadence
  text = text
    .replace(/[•▪◦●★✨⚠️🐝🐞🪲🐛🦗🪰🌴💧🌱🛡️✂️🚜🧺🍯]/g, ' ')
    .replace(/[*#_`~]+/g, ' ')
    .replace(/[«»"""]/g, ' ')
    .replace(/\s*—\s*/g, '، ')
    .replace(/\s*·\s*/g, '، ');

  // Normalize spoken percentages, temperatures, and agricultural units cleanly
  text = text
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1 فِي الْمِئَة')
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:°C|°م|مئوية)/gi, '$1 دَرَجَةً مِئَوِيَّةً')
    .replace(/(\d+(?:[.,]\d+)?)\s*كم\/س/g, '$1 كِيلُومِتْراً فِي السَّاعَةِ')
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:ملم|مل)/g, '$1 مِلِّيمِتْراً')
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:كجم|كغم)/g, '$1 كِيلُوغْرَاماً')
    .replace(/160\/2023/g, 'مِئَةٍ وَسِتِّينَ لِسَنَةِ أَلْفَيْنِ وَثَلَاثَةٍ وَعِشْرِينَ');

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
