/**
 * Unified Identity, 10 Expressions & Varied Dialogue Bank for «مُرشد»
 * A warm, trustworthy Omani farm companion: practical, encouraging, clear, and safety-first across «صديق المزارع».
 */

export type MurshidExpression =
  | 'welcome'
  | 'smile'
  | 'explain'
  | 'think'
  | 'surprised'
  | 'encourage'
  | 'gentle_sad'
  | 'celebrate'
  | 'speak'
  | 'idle';

export interface MurshidExpressionPreset {
  id: MurshidExpression;
  labelAr: string;
  labelEn: string;
  toneMood: 'cheerful' | 'curious' | 'warning' | 'proud';
  sampleAr: string;
  sampleVocalizedAr: string;
}

export const MURSHID_EXPRESSION_PRESETS: MurshidExpressionPreset[] = [
  {
    id: 'welcome',
    labelAr: 'الترحيب',
    labelEn: 'Welcome',
    toneMood: 'cheerful',
    sampleAr: 'حياكم الله في مزرعتكم الذكية! أنا مرشد، ويسعدني أن أرافقكم في كل خطوة زراعية.',
    sampleVocalizedAr: 'حَيَّاكُمُ اللَّهُ فِي مَزْرَعَتِكُمُ الذَّكِيَّةِ! أَنَا مُرْشِدٌ، وَيُسْعِدُنِي أَنْ أُرَافِقَكُمْ فِي كُلِّ خُطْوَةٍ زِرَاعِيَّةٍ.',
  },
  {
    id: 'smile',
    labelAr: 'الابتسام',
    labelEn: 'Smile',
    toneMood: 'cheerful',
    sampleAr: 'صباح الخير والبركة! العناية اليومية الهادئة تصنع مزرعة خضراء مثمرة.',
    sampleVocalizedAr: 'صَبَاحُ الْخَيْرِ وَالْبَرَكَةِ! الْعِنَايَةُ الْيَوْمِيَّةُ الْهَادِئَةُ تَصْنَعُ مَزْرَعَةً خَضْرَاءَ مُثْمِرَةً.',
  },
  {
    id: 'explain',
    labelAr: 'الشرح والتوضيح',
    labelEn: 'Explain',
    toneMood: 'cheerful',
    sampleAr: 'عند فحص النخيل أو الخضروات، ابدأ دائماً بتفقد السطح السفلي للأوراق صباحاً.',
    sampleVocalizedAr: 'عِنْدَ فَحْصِ النَّخِيلِ أَوِ الْخَضْرَوَاتِ، ابْدَأْ دَائِماً بِتَفَقُّدِ السَّطْحِ السُّفْلِيِّ لِلْأَوْرَاقِ صَبَاحاً.',
  },
  {
    id: 'think',
    labelAr: 'التفكير',
    labelEn: 'Think',
    toneMood: 'curious',
    sampleAr: 'دعنا نفكر معاً بهدوء: هل السبب نقص ري، أم تغذية، أم آفة مبكرة؟',
    sampleVocalizedAr: 'دَعْنَا نُفَكِّرْ مَعاً بِهُدُوءٍ: هَلِ السَّبَبُ نَقْصُ رَيٍّ، أَمْ تَغْذِيَةٌ، أَمْ آفَةٌ مُبَكِّرَةٌ؟',
  },
  {
    id: 'surprised',
    labelAr: 'الدهشة',
    labelEn: 'Surprised',
    toneMood: 'warning',
    sampleAr: 'انظر هنا! وجود قطرات عسلية أو نشارة عند الجذع علامة مهمة تحتاج متابعة فورية.',
    sampleVocalizedAr: 'انْظُرْ هُنَا! وُجُودُ قَطَرَاتٍ عَسَلِيَّةٍ أَوْ نُشَارَةٍ عِنْدَ الْجِذْعِ عَلَامَةٌ مُهِمَّةٌ تَحْتَاجُ مُتَابَعَةً فَوْرِيَّةً.',
  },
  {
    id: 'encourage',
    labelAr: 'التشجيع',
    labelEn: 'Encourage',
    toneMood: 'cheerful',
    sampleAr: 'عمل ممتاز يا بطل! خطوة صغيرة منتظمة في المزرعة تصنع فارقاً كبيراً في الحصاد.',
    sampleVocalizedAr: 'عَمَلٌ مُمْتَازٌ يَا بَطَلُ! خُطْوَةٌ صَغِيرَةٌ مُنْتَظِمَةٌ فِي الْمَزْرَعَةِ تَصْنَعُ فَارِقاً كَبِيراً فِي الْحَصَادِ.',
  },
  {
    id: 'gentle_sad',
    labelAr: 'التعاطف عند الخطأ',
    labelEn: 'Gentle Sadness',
    toneMood: 'warning',
    sampleAr: 'لا بأس يا صديقي، كلنا نتعلم من التجربة! هيا نجرب الإجابة الأدق معاً.',
    sampleVocalizedAr: 'لَا بَأْسَ يَا صَدِيقِي، كُلُّنَا نَتَعَلَّمُ مِنَ التَّجْرِبَةِ! هَيَّا نُجَرِّبِ الْإِجَابَةَ الْأَدَقَّ مَعاً.',
  },
  {
    id: 'celebrate',
    labelAr: 'الاحتفال بالنجاح',
    labelEn: 'Celebrate',
    toneMood: 'proud',
    sampleAr: 'ما شاء الله عليك! إنجاز رائع ومعلومات زراعية دقيقة تستحق كل التقدير!',
    sampleVocalizedAr: 'مَا شَاءَ اللَّهُ عَلَيْكَ! إِنْجَازٌ رَائِعٌ وَمَعْلُومَاتٌ زِرَاعِيَّةٌ دَقِيقَةٌ تَسْتَحِقُّ كُلَّ التَّقْدِيرِ!',
  },
  {
    id: 'speak',
    labelAr: 'التحدث',
    labelEn: 'Speak',
    toneMood: 'cheerful',
    sampleAr: 'أهلاً بك! أنا مرشد، أشاركك النصائح العملية الملائمة لمناخ ولايتك ومواسم سلطنة عُمان.',
    sampleVocalizedAr: 'أَهْلاً بِكَ! أَنَا مُرْشِدٌ، أُشَارِكُكَ النَّصَائِحَ الْعَمَلِيَّةَ الْمُلَائِمَةَ لِمُنَاخِ وِلَايَتِكَ وَمَوَاسِمِ سَلْطَنَةِ عُمَانَ.',
  },
  {
    id: 'idle',
    labelAr: 'الانتظار الهادئ',
    labelEn: 'Idle',
    toneMood: 'curious',
    sampleAr: 'أنا جاهز في أي وقت؛ اختر القسم أو التحدي الذي ترغب في استكشافه.',
    sampleVocalizedAr: 'أَنَا جَاهِزٌ فِي أَيِّ وَقْتٍ؛ اخْتَرِ الْقِسْمَ أَوِ التَّحَدِّيَ الَّذِي تَرْغَبُ فِي اسْتِكْشَافِهِ.',
  },
];

export const MURSHID_PHRASES = {
  homeWelcome: (name: string, wilayat: string) => [
    `حيّاك الله يا ${name}! أنا مُرشد، رفيقك الزراعي من أرض عُمان. لنفحص مزرعتك ونختَر الخطوة الصحيحة لمحاصيل ${wilayat}.`,
    `أهلاً بك يا ${name}! معاً نعتني بمحاصيل ولاية ${wilayat} بمعلومة موثوقة وخطوة عملية في كل مرة.`,
    `مرحباً يا ${name}! أنا مُرشد؛ أساعدك في فهم أعراض النبات والتعرّف على الحشرات والعناية بالمزرعة بأمان.`,
  ],
  correct: [
    'أحسنت يا مزارعنا الذكي! إجابة دقيقة وموفقة.',
    'ما شاء الله عليك! خبرتك الزراعية رائعة جداً.',
    'ممتاز! هكذا نحافظ على جودة المحصول وسلامة الأرض.',
    'إصابة موفقة للمعلومة الصحيحة! واصل التقدم يا بطل.',
  ],
  wrongGentle: [
    'لا عليك يا صديقي، المعلومة الأدق أصبحت واضحة لك الآن!',
    'قريب جداً! التعلّم في المزرعة خطوة بخطوة، هيا نتابع بثقة.',
    'لا تقلق، التجربة تعلّمنا الأفضل دائماً للمرة القادمة.',
  ],
  quizCelebrate: [
    'إنجاز مبهر يا بطل المزرعة! معرفتك الزراعية العُمانية مصدر فخر.',
    'مبارك لك هذا التميز! استمر في تطوير مهاراتك الزراعية.',
  ],
};

const lastPickedByChannel = new Map<string, number>();

export function pickVariedPhrase(list: string[], seedIndex?: number): string {
  if (!list.length) return '';
  const idx =
    typeof seedIndex === 'number'
      ? Math.abs(seedIndex) % list.length
      : Math.floor(Math.random() * list.length);
  return list[idx];
}

export function pickFreshPhrase(channelKey: string, list: string[]): string {
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  const prev = lastPickedByChannel.get(channelKey);
  const candidates = list.map((_, idx) => idx).filter((idx) => idx !== prev);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
  lastPickedByChannel.set(channelKey, chosen);
  return list[chosen];
}
