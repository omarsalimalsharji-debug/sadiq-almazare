/**
 * Open-Source Arabic TTS Evaluation, Licensing Matrix & 3-Reviewer Video QA Checklist
 * Batch 2 — صديق المزارع الذكي
 */

export interface OpenSourceVoiceOption {
  id: 'piper-kareem-medium' | 'piper-kareem-low' | 'mms-tts-ara' | 'espeak-ng-ar';
  nameAr: string;
  engineName: string;
  sampleUrl: string;
  licenseName: string;
  commercialAllowed: 'yes' | 'no' | 'unclear';
  licenseWarningAr: string;
  qualityNoteAr: string;
  targetLufs: string;
  testedOnThisServer: boolean;
}

export interface UninstalledVoiceReference {
  nameAr: string;
  engineName: string;
  licenseName: string;
  commercialAllowed: 'yes' | 'no';
  reasonNotLocalAr: string;
}

export const VOICE_COMPARISON_TEXT_RAW =
  'أهلاً بكم في صديق المزارع بسلطنة عُمان؛ احموا النخيل من حشرة الدوباس وسوسة النخيل الحمراء بالفحص المبكر والري المنتظم من الأفلاج.';

export const VOICE_COMPARISON_TEXT_VOCALIZED =
  'أَهْلاً بِكُمْ فِي صَدِيقِ الْمُزَارِعِ بِسَلْطَنَةِ عُمَانَ؛ احْمُوا النَّخِيلَ مِنْ حَشَرَةِ الدُّوبَاسِ وَسُوسَةِ النَّخِيلِ الْحَمْرَاءِ بِالْفَحْصِ الْمُبَكِّرِ وَالرَّيِّ الْمُنْتَظِمِ مِنَ الْأَفْلَاجِ.';

export const OPEN_SOURCE_VOICE_OPTIONS: OpenSourceVoiceOption[] = [
  {
    id: 'piper-kareem-medium',
    nameAr: 'بايبر — كريم (جودة متوسطة)',
    engineName: 'Piper ONNX (ar_JO-kareem-medium)',
    sampleUrl: '/media/voice-comparison/piper-kareem-medium.mp3',
    licenseName: 'محرك MIT · بيانات التدريب بدون ملف ترخيص صريح (null)',
    commercialAllowed: 'unclear',
    licenseWarningAr:
      'محرك Piper نفسه مرخص MIT مفتوح، لكن مستودع بيانات التدريب (AliMokhammad/arabicttstrain) لا يحتوي على ملف رخصة صريح، لذا يلزم الحذر قبل الاعتماد التجاري.',
    qualityNoteAr:
      'أفضل توازن محلي مجاني بسرعة توليد عالية، نطق واضح عند وضع التشكيل الكامل وقاموس المصطلحات العُمانية، مع نبرة فصحى تميل قليلاً للحدة الآلية.',
    targetLufs: '-16 LUFS',
    testedOnThisServer: true,
  },
  {
    id: 'mms-tts-ara',
    nameAr: 'ميتا MMS-TTS العربي (محلي ONNX)',
    engineName: 'facebook/mms-tts-ara (Xenova ONNX)',
    sampleUrl: '/media/voice-comparison/mms-tts-ara.mp3',
    licenseName: 'CC-BY-NC 4.0 (غير تجاري فقط)',
    commercialAllowed: 'no',
    licenseWarningAr:
      'تنبيه رخصة غير تجارية (CC-BY-NC 4.0): يُمنع استخدام مخرجات هذا النموذج لأغراض تجارية أو ربحية؛ يصلح فقط للاستخدام الإرشادي/التعليمي غير الربحي.',
    qualityNoteAr:
      'سلس ومستقر في مخارج الحروف مع التشكيل التام، لكن نبرة الصوت رتيبة نسبياً ومكتومة في الترددات العالية على سماعة الهاتف.',
    targetLufs: '-16 LUFS',
    testedOnThisServer: true,
  },
  {
    id: 'piper-kareem-low',
    nameAr: 'بايبر — كريم (خفيف 16 كيلوهرتز)',
    engineName: 'Piper ONNX (ar_JO-kareem-low)',
    sampleUrl: '/media/voice-comparison/piper-kareem-low.mp3',
    licenseName: 'محرك MIT · بيانات التدريب بدون ملف ترخيص صريح (null)',
    commercialAllowed: 'unclear',
    licenseWarningAr:
      'نفس وضع رخصة بيانات التدريب (بدون ملف رخصة منشور في مستودع المصدر)، وهو خفيف ومناسب للأجهزة الضعيفة فقط.',
    qualityNoteAr:
      'معدل أخذ العينات 16kHz يجعله أقل نقاءً من النسخة المتوسطة (22.05kHz)، مع بعض الخشونة في الحروف الساكنة.',
    targetLufs: '-16 LUFS',
    testedOnThisServer: true,
  },
  {
    id: 'espeak-ng-ar',
    nameAr: 'إي سبيك (eSpeak-NG العربي)',
    engineName: 'eSpeak-NG Formant Synthesizer (ar)',
    sampleUrl: '/media/voice-comparison/espeak-ng-ar.mp3',
    licenseName: 'GPL-3.0 (مفتوح المصدر)',
    commercialAllowed: 'yes',
    licenseWarningAr:
      'رخصة GPL-3.0 مفتوحة المصدر بالكامل، لكنه صوت آلي قديم (Formant) غير مريح للأذن في الحلقات التوعوية الطويلة.',
    qualityNoteAr:
      'آلي واضح ويُستخدم كمرجع مقارنة فقط لبيان الفرق في الجودة بين التوليد الفورمانتي والعصبوني.',
    targetLufs: '-16 LUFS',
    testedOnThisServer: true,
  },
];

export const ADDITIONAL_VOICE_LICENSES_AUDIT: UninstalledVoiceReference[] = [
  {
    nameAr: 'Coqui XTTS-v2 (استنساخ/تعدد لغات)',
    engineName: 'coqui/XTTS-v2',
    licenseName: 'CPML 1.0.0 (رخصة كوكي غير التجارية)',
    commercialAllowed: 'no',
    reasonNotLocalAr:
      'مرخص للاستخدام غير التجاري فقط (CPML)، ويتطلب بيئة PyTorch وكرت شاشة GPU أو ذاكرة تتجاوز سعة الخادم الحالي (4 جيجابايت بدون Swap).',
  },
  {
    nameAr: 'SILMA TTS العربي (F5-TTS)',
    engineName: 'silma-ai/silma-tts',
    licenseName: 'Apache-2.0 (مسموح تجارياً)',
    commercialAllowed: 'yes',
    reasonNotLocalAr:
      'أفضل خيار مفتوح المصدر بالكامل برخصة تجارية (Apache-2.0)، لكنه مبني على PyTorch (~150M معامل) ويحتاج بيئة Python + GPU للاستنتاج العملي السريع.',
  },
];

export interface VideoQaChecklistItem {
  key:
    | 'luftsAndDucking'
    | 'pronunciationAndTashkeel'
    | 'noSceneNumbers'
    | 'syncAndTransitions'
    | 'phoneSpeakerClarity'
    | 'mobileBitrateAnd480p';
  labelAr: string;
  detailAr: string;
}

export const VIDEO_QA_CHECKLIST: VideoQaChecklistItem[] = [
  {
    key: 'luftsAndDucking',
    labelAr: 'توازن الصوت (-16 LUFS) وخفض الموسيقى (-13 dB)',
    detailAr: 'مستوى الصوت الموحد دون تشويش، وانخفاض الموسيقى الخلفية تلقائياً أثناء نطق الشرح.',
  },
  {
    key: 'pronunciationAndTashkeel',
    labelAr: 'سلامة التشكيل ونطق الأسماء العُمانية والزراعية',
    detailAr: 'ضبط وقفات 0.4–0.7 ثانية، وصحة نطق سوسة النخيل والدوباس والأفلاج وسمائل.',
  },
  {
    key: 'noSceneNumbers',
    labelAr: 'فيلم متصل بدون «المشهد الأول/الثاني» أو أرقام تقنية',
    detailAr: 'انسياب بصري متصل من الافتتاحية للمشكلة فالحل ثم ملخص 3 نقاط فالخاتمة.',
  },
  {
    key: 'syncAndTransitions',
    labelAr: 'تزامن الترجمة بالكلمة والانتقالات الناعمة',
    detailAr: 'حركة كاميرا هادئة (تقريب بطيء) وتلاشي ناعم مع ترجمة عربية متزامنة مع الصوت.',
  },
  {
    key: 'phoneSpeakerClarity',
    labelAr: 'وضوح السماعات (سماعة الهاتف + سماعة الرأس)',
    detailAr: 'تجربة الاستماع على سماعة الهاتف الخارجية وسماعة الأذن للتأكد من خلوه من الطنين.',
  },
  {
    key: 'mobileBitrateAnd480p',
    labelAr: 'توافق الجوال (1080p خفيف + 480p للاتصال الضعيف)',
    detailAr: 'تشغيل فوري بصيغة MP4 H.264/AAC مع خيار الجودة المنخفضة لمناطق ضعف الشبكة.',
  },
];

export interface EpisodeQaReviewState {
  episodeId: string;
  checklist: Record<VideoQaChecklistItem['key'], boolean>;
  reviewers: Array<{
    slot: number;
    roleTitleAr: string;
    reviewerName: string;
    approved: boolean;
    notes: string;
    reviewedAt?: number;
  }>;
  updatedAt: number;
}
