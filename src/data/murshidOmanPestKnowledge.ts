/**
 * Murshid AI — Oman-focused agricultural pest and disease knowledge seed.
 * This is a curated knowledge catalogue, NOT a trained image classifier.
 * Never infer a confirmed diagnosis from a catalogue match alone.
 */

export type MurshidEvidenceStatus =
  | 'reported_in_oman'
  | 'oman_research_reference'
  | 'needs_local_confirmation'
  | 'regulated_quarantine';

export type MurshidRecordType = 'insect' | 'mite' | 'disease' | 'other';

export interface MurshidKnowledgeRecord {
  id: string;
  crop: string;
  cropEn: string;
  nameAr: string;
  nameEn: string;
  scientificName?: string;
  type: MurshidRecordType;
  evidenceStatus: MurshidEvidenceStatus;
  affectedParts: string[];
  fieldClues: string[];
  lookalikes: string[];
  severity: 'high' | 'medium' | 'variable';
  omanNotes: string;
  imageTrainingReady: false;
  sources: Array<{ title: string; url: string; year?: number }>;
}

export const MURSHID_KNOWLEDGE_VERSION = '0.1.0';
export const MURSHID_KNOWLEDGE_REGION = 'Sultanate of Oman';

/**
 * Seed records are intentionally conservative. The symptoms below are field
 * clues for triage, not a definitive image-based diagnosis or pesticide advice.
 */
export const MURSHID_OMAN_KNOWLEDGE: MurshidKnowledgeRecord[] = [
  {
    id: 'date-palm-dubas-bug',
    crop: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'حشرة دوباس النخيل',
    nameEn: 'Dubas bug',
    scientificName: 'Ommatissus lybicus',
    type: 'insect',
    evidenceStatus: 'reported_in_oman',
    affectedParts: ['السعف', 'الخوص', 'العذوق بصورة غير مباشرة'],
    fieldClues: ['إفرازات عسلية لزجة', 'ندوة عسلية قد يتبعها نمو فطري أسود', 'وجود حوريات أو حشرات صغيرة على السعف'],
    lookalikes: ['الحشرات القشرية', 'البق الدقيقي'],
    severity: 'high',
    omanNotes: 'من الآفات الاقتصادية المعروفة على نخيل التمر في سلطنة عُمان.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman agricultural research strategy — date palm pests', url: 'https://faolex.fao.org/docs/pdf/oma152793.pdf', year: 2011 },
      { title: 'Dubas bug and fungal leaf spots in Omani date palms', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10053011/', year: 2023 }
    ]
  },
  {
    id: 'date-palm-red-palm-weevil',
    crop: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'سوسة النخيل الحمراء',
    nameEn: 'Red palm weevil',
    scientificName: 'Rhynchophorus ferrugineus',
    type: 'insect',
    evidenceStatus: 'reported_in_oman',
    affectedParts: ['جذع النخلة', 'قواعد الكرب', 'الأنسجة الداخلية'],
    fieldClues: ['ثقوب أو تجاويف في الجذع', 'ألياف ممضوغة أو إفرازات رطبة', 'رائحة تخمر أو اهتراء الأنسجة', 'ميل أو ضعف غير معتاد في قلب النخلة'],
    lookalikes: ['إصابات ميكانيكية بالجذع', 'أعفان الجذع'],
    severity: 'high',
    omanNotes: 'اشتباه الإصابة يستدعي إبلاغ الجهة الزراعية المختصة والفحص الميداني؛ صورة واحدة لا تكفي لنفي الإصابة.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman integrated management of red palm weevil', url: 'https://mcs.org.sa/ViewFile.aspx?fm=%D8%A7%D9%84%D9%85%D8%A4%D8%AA%D9%85%D8%B1+%D8%A7%D9%84%D8%A5%D9%82%D9%84%D9%8A%D9%85%D9%8A+%D8%A7%D9%84%D8%A3%D9%88%D9%84+%D8%AD%D9%88%D9%84+%D8%A5%D8%AF%D8%A7%D8%B1%D8%A9+%D8%A2%D9%81%D8%A7%D8%AA+%D9%86%D8%AE%D9%8A%D9%84+%D8%A7%D9%84%D8%AA%D9%85%D8%B1&fn=50' },
      { title: 'Oman Ministry programme reporting (Shura Council)', url: 'https://www.shura.om/News/%D8%A7%D9%84%D8%A8%D9%8A%D8%A7%D9%86-%D8%A7%D9%84%D8%A7%D8%B9%D9%84%D8%A7%D9%85%D9%8A-%D9%84%D8%AC%D9%84%D8%B3%D8%A9-%D8%A7%D9%84%D8%AB%D8%A7%D9%85%D9%86%D8%A9-%D8%B9%D8%B4%D8%B1%D8%A9-%D9%85%D9%86/?lang=en-GB' }
    ]
  },
  {
    id: 'date-palm-lesser-date-moth',
    crop: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'عثة التمر الصغرى',
    nameEn: 'Lesser date moth',
    scientificName: 'Batrachedra amydraula',
    type: 'insect',
    evidenceStatus: 'reported_in_oman',
    affectedParts: ['الثمار', 'الشماريخ', 'العذوق'],
    fieldClues: ['ثقوب دقيقة في الثمار', 'يرقات داخل الثمرة', 'تلف أو تساقط الثمار الصغيرة'],
    lookalikes: ['أضرار حشرات ثمار أخرى', 'التشقق أو التلف الفسيولوجي'],
    severity: 'high',
    omanNotes: 'آفة ثمار مهمة مذكورة في مراجع إدارة آفات نخيل التمر في عُمان.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman agricultural research strategy — date palm pests', url: 'https://faolex.fao.org/docs/pdf/oma152793.pdf', year: 2011 },
      { title: 'Plant–herbivore networks in date palm agro-ecosystems', url: 'https://link.springer.com/article/10.1007/s10340-023-01730-5', year: 2023 }
    ]
  },
  {
    id: 'date-palm-old-world-date-mite',
    crop: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'حلم الغبار على ثمار النخيل',
    nameEn: 'Old-world date mite',
    scientificName: 'Oligonychus afrasiaticus',
    type: 'mite',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['الثمار', 'العذوق'],
    fieldClues: ['خيوط دقيقة أو غبار متجمع على الثمار', 'خشونة أو تغير لون سطح الثمرة', 'ضعف جودة الثمار'],
    lookalikes: ['الغبار والرمال', 'شبكات العناكب غير الضارة'],
    severity: 'medium',
    omanNotes: 'ورد ضمن الآفات الاقتصادية المرتبطة بنظم نخيل التمر في المنطقة؛ يلزم جمع صور عُمانية محلية موثقة قبل تدريب المصنف.',
    imageTrainingReady: false,
    sources: [
      { title: 'Plant–herbivore networks in date palm agro-ecosystems', url: 'https://link.springer.com/article/10.1007/s10340-023-01730-5', year: 2023 }
    ]
  },
  {
    id: 'lime-witches-broom',
    crop: 'الليمون والحمضيات',
    cropEn: 'Lime and citrus',
    nameAr: 'مرض مكنسة الساحرة في الليمون',
    nameEn: 'Witches’ broom disease of lime',
    scientificName: 'Candidatus Phytoplasma aurantifolia',
    type: 'disease',
    evidenceStatus: 'reported_in_oman',
    affectedParts: ['الأفرع', 'الأوراق', 'المجموع الخضري'],
    fieldClues: ['تجمع أفرع قصيرة كثيرة تشبه المكنسة', 'صغر الأوراق وتشوه النموات', 'تراجع تدريجي في نمو الشجرة'],
    lookalikes: ['التفرع الناتج عن التقليم', 'أضرار مبيدات الأعشاب', 'نقص العناصر'],
    severity: 'high',
    omanNotes: 'مرض موثق في الحمضيات العُمانية؛ يتطلب تأكيداً مختبرياً أو تشخيصاً مختصاً عند الاشتباه.',
    imageTrainingReady: false,
    sources: [
      { title: 'Biotic and abiotic stresses of major fruit crops in Oman', url: 'https://jams.squ.edu.om/home/vol27/iss1/8/', year: 2022 },
      { title: 'Oman major pests and diseases report', url: 'https://assets.ippc.int/static/media/files/publication/ar/2016/10/Oman.pdf', year: 2016 }
    ]
  },
  {
    id: 'mango-decline',
    crop: 'المانجو',
    cropEn: 'Mango',
    nameAr: 'تدهور المانجو المرتبط بفطر',
    nameEn: 'Mango decline',
    scientificName: 'Ceratocystis fimbriata',
    type: 'disease',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['الأفرع', 'الجذع', 'الأوعية الناقلة'],
    fieldClues: ['ذبول أو جفاف أفرع', 'تراجع تدريجي في حيوية الشجرة', 'قد يظهر تغير لون داخلي بالخشب عند الفحص'],
    lookalikes: ['العطش', 'أعفان الجذور', 'أمراض وعائية أخرى'],
    severity: 'high',
    omanNotes: 'ورد في تقرير عُماني عن الآفات والأمراض الرئيسية؛ لا يعتمد التشخيص البصري وحده لتحديد المسبب.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman major pests and diseases report', url: 'https://assets.ippc.int/static/media/files/publication/ar/2016/10/Oman.pdf', year: 2016 }
    ]
  },
  {
    id: 'pomegranate-butterfly',
    crop: 'الرمان',
    cropEn: 'Pomegranate',
    nameAr: 'فراشة الرمان',
    nameEn: 'Pomegranate butterfly',
    scientificName: 'Virachola livia',
    type: 'insect',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['الثمار'],
    fieldClues: ['ثقوب دخول في الثمار', 'يرقات أو فضلات داخل الثمرة', 'تعفن الثمار المصابة أو تساقطها'],
    lookalikes: ['تشقق الثمار', 'أعفان الثمار'],
    severity: 'medium',
    omanNotes: 'مذكورة ضمن تقرير الآفات والأمراض الرئيسية في عُمان؛ نحتاج صوراً محلية موثقة لمراحل الإصابة.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman major pests and diseases report', url: 'https://assets.ippc.int/static/media/files/publication/ar/2016/10/Oman.pdf', year: 2016 }
    ]
  },
  {
    id: 'cucumber-damping-off',
    crop: 'الخيار',
    cropEn: 'Cucumber',
    nameAr: 'موت البادرات',
    nameEn: 'Damping-off',
    scientificName: 'Pythium spp. (among reported causal organisms)',
    type: 'disease',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['البذور', 'الجذور', 'قاعدة الساق للبادرات'],
    fieldClues: ['تعفن البذور أو فشل الإنبات', 'اختناق أو اسوداد قاعدة الساق', 'سقوط البادرات وموتها'],
    lookalikes: ['زيادة الملوحة', 'العطش', 'ضرر التسميد المركز'],
    severity: 'medium',
    omanNotes: 'دراسة عُمانية تناولت موت البادرات والذبول في الخيار؛ يلزم التفريق بين المسببات الفطرية وشبه الفطرية.',
    imageTrainingReady: false,
    sources: [
      { title: 'Management of damping-off and wilt diseases of cucumber in Oman', url: 'https://iraqi-datepalms.net/wp-content/uploads/2024/01/ISHS-ActaHort.pdf' }
    ]
  },
  {
    id: 'cucumber-wilt',
    crop: 'الخيار',
    cropEn: 'Cucumber',
    nameAr: 'ذبول الخيار',
    nameEn: 'Cucumber wilt',
    scientificName: 'Multiple possible pathogens; requires laboratory confirmation',
    type: 'disease',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['الجذور', 'قاعدة الساق', 'الأوعية الناقلة'],
    fieldClues: ['ذبول النبات رغم توفر الرطوبة', 'تدهور الجذور أو قاعدة الساق', 'تفاوت الإصابة بين النباتات'],
    lookalikes: ['العطش', 'ملوحة التربة أو مياه الري', 'اختناق الجذور'],
    severity: 'variable',
    omanNotes: 'الذبول عرض وليس اسماً لمسبب واحد؛ يجب ألا يختار المحرك مسبباً محدداً دون قرائن كافية.',
    imageTrainingReady: false,
    sources: [
      { title: 'Management of damping-off and wilt diseases of cucumber in Oman', url: 'https://iraqi-datepalms.net/wp-content/uploads/2024/01/ISHS-ActaHort.pdf' }
    ]
  },
  {
    id: 'papaya-mealybug',
    crop: 'البابايا (الفيفاي)',
    cropEn: 'Papaya',
    nameAr: 'البق الدقيقي على البابايا',
    nameEn: 'Papaya mealybug',
    scientificName: 'Paracoccus spp.',
    type: 'insect',
    evidenceStatus: 'oman_research_reference',
    affectedParts: ['الأوراق', 'الأفرع', 'الثمار'],
    fieldClues: ['كتل شمعية بيضاء', 'تجمع حشرات صغيرة على النموات', 'إفرازات عسلية قد يصاحبها عفن أسود'],
    lookalikes: ['البق الدقيقي لأنواع أخرى', 'الحشرات القشرية'],
    severity: 'medium',
    omanNotes: 'ورد في تقرير عُماني للآفات الرئيسية؛ يحتاج تحديد النوع الدقيق وتوثيق نطاق انتشاره محلياً.',
    imageTrainingReady: false,
    sources: [
      { title: 'Oman major pests and diseases report', url: 'https://assets.ippc.int/static/media/files/publication/ar/2016/10/Oman.pdf', year: 2016 }
    ]
  }
];

export function getMurshidKnowledgeByCrop(crop: string): MurshidKnowledgeRecord[] {
  const normalized = crop.trim().toLocaleLowerCase();
  return MURSHID_OMAN_KNOWLEDGE.filter((record) =>
    record.crop.toLocaleLowerCase().includes(normalized) ||
    record.cropEn.toLocaleLowerCase().includes(normalized)
  );
}
