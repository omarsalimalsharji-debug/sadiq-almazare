/**
 * Murshid regional crop-health reference — v1.
 *
 * This is a reviewed knowledge reference, not an image classifier.
 * A symptom match is not proof of the causal organism.
 * Regional occurrence is deliberately separated from diagnosis facts.
 */

export type MurshidCauseGroup =
  | 'insect'
  | 'mite'
  | 'fungus'
  | 'bacterium'
  | 'phytoplasma'
  | 'virus'
  | 'oomycete'
  | 'physiological';

export type MurshidEvidenceGrade = 'A' | 'B' | 'C' | 'D';

export interface MurshidRegionalOccurrence {
  region: string;
  statement: string;
  evidenceGrade: MurshidEvidenceGrade;
  sourceIds: string[];
}

export interface MurshidCropHealthRecord {
  id: string;
  cropId: 'date-palm' | 'citrus';
  cropAr: string;
  cropEn: string;
  nameAr: string;
  nameEn: string;
  scientificName: string;
  causeGroup: MurshidCauseGroup;
  affectedParts: string[];
  diagnosticClues: string[];
  lookalikes: string[];
  confirmation: string[];
  integratedManagement: string[];
  urgentFlags: string[];
  regionalOccurrences: MurshidRegionalOccurrence[];
  evidenceGrade: MurshidEvidenceGrade;
  imageRequirements: string[];
  diagnosisLimitations: string[];
  sourceIds: string[];
}

export const MURSHID_CORE_REFERENCE_VERSION = '1.0.0';

export const MURSHID_CORE_REFERENCE_SOURCES = [
  {
    id: 'icarda-date-palm-guide',
    title: 'Date Palm Pests and Diseases: Integrated Management Guide',
    publisher: 'ICARDA and regional date-palm specialists',
    year: 2018,
    url: 'https://hdl.handle.net/20.500.11766/8914',
    rights: 'CC-BY-SA-4.0; attribute and share adaptations under the applicable terms',
    role: 'Regional date-palm biology, symptoms and integrated pest management'
  },
  {
    id: 'niphm-citrus-ipm',
    title: 'AESA Based IPM Package — Citrus',
    publisher: 'National Institute of Plant Health Management, India',
    url: 'https://niphm.gov.in/IPMPackages/Citrus.pdf',
    rights: 'Publicly accessible technical guide; verify reuse terms before copying text or images',
    role: 'Citrus pests, diseases, nematodes and IPM framework'
  },
  {
    id: 'uc-ipm-citrus',
    title: 'Integrated Pest Management for Citrus',
    publisher: 'University of California Statewide IPM Program',
    url: 'https://ipm.ucanr.edu/IPMPROJECT/ADS/manual_citrus.html',
    rights: 'Copyrighted extension publication; use citations and factual summaries, not copied figures',
    role: 'Citrus differential diagnosis across roots, trunk, fruit, leaves, insects and mites'
  },
  {
    id: 'uf-ifas-citrus-id',
    title: 'A Guide to Citrus Disease Identification (CH159)',
    publisher: 'University of Florida IFAS Extension',
    url: 'https://ask.ifas.ufl.edu/publication/CH159',
    rights: 'Extension publication; check individual image credits and reuse terms',
    role: 'Photographic symptom identification and citrus disease differential'
  },
  {
    id: 'eppo-global-database',
    title: 'EPPO Global Database',
    publisher: 'European and Mediterranean Plant Protection Organization',
    url: 'https://gd.eppo.int/',
    rights: 'Follow database and individual media asset terms',
    role: 'Scientific names, synonyms, host range and geographic records'
  }
] as const;

export const MURSHID_CORE_CROP_HEALTH: MurshidCropHealthRecord[] = [
  {
    id: 'dp-black-scorch',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'مرض اللفحة السوداء',
    nameEn: 'Black scorch',
    scientificName: 'Thielaviopsis paradoxa (syn. Ceratocystis paradoxa)',
    causeGroup: 'fungus',
    affectedParts: ['قواعد السعف', 'الجريد', 'القلب', 'النورات والعذوق في بعض الحالات'],
    diagnosticClues: ['اسوداد أو تفحم الأنسجة المصابة', 'مناطق نخرية داكنة على قواعد السعف أو أجزاء من التاج', 'قد يصاحب الإصابة تشوه أو تقزم وموت أجزاء من التاج في الحالات الشديدة'],
    lookalikes: ['أضرار ميكانيكية أو حروق', 'أعفان تاج أخرى', 'ضرر البرودة أو الحرارة'],
    confirmation: ['فحص موضع الإصابة والأنسجة المتقدمة', 'عزل المسبب أو فحصه مخبرياً عند الحاجة', 'توثيق موضع الإصابة على التاج وقواعد السعف'],
    integratedManagement: ['تجنب جرح القلب وقواعد السعف أثناء التقليم والخدمة', 'إزالة الأنسجة المصابة وفق إرشاد فني محلي وتعقيم أدوات التقليم', 'عدم نقل فسائل أو مواد إكثار من نخيل مشتبه بإصابته'],
    urgentFlags: ['تلف القلب أو موت القمة النامية', 'انتشار سريع للاسوداد في التاج'],
    regionalOccurrences: [{ region: 'مراجع إقليمية لنخيل التمر', statement: 'موصوف في دليل إدارة آفات وأمراض نخيل التمر؛ لا يحدد هذا السجل مدى انتشاره في بلد المستخدم.', evidenceGrade: 'B', sourceIds: ['icarda-date-palm-guide'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صورة كاملة للتاج', 'لقطة قريبة للجزء الأسود مع مقياس', 'صورة لقواعد السعف أو الجريد المصاب'],
    diagnosisLimitations: ['الاسوداد وحده لا يثبت المسبب الفطري', 'يلزم استبعاد الجروح والحروق وأعفان التاج الأخرى'],
    sourceIds: ['icarda-date-palm-guide']
  },
  {
    id: 'dp-graphiola-leaf-spot',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'تبقع أوراق النخيل الجرافيولا',
    nameEn: 'Graphiola leaf spot / False smut',
    scientificName: 'Graphiola phoenicis',
    causeGroup: 'fungus',
    affectedParts: ['الخوص', 'وريقات السعف'],
    diagnosticClues: ['نقاط أو بثرات صغيرة مرتفعة على سطح الوريقات', 'أجسام ثمرية داكنة أو بنية قد تبدو كحبيبات بارزة', 'قد تظهر خيوط أو كتل بوغية فاتحة عند نضج البثرات'],
    lookalikes: ['تبقعات فطرية أخرى', 'ترسبات الغبار والأملاح', 'أضرار الحشرات'],
    confirmation: ['فحص البثرات بعدسة مكبرة', 'فحص مجهري للأجسام الثمرية والأبواغ عند الالتباس'],
    integratedManagement: ['تحسين التهوية وتقليل البلل المستمر على المجموع الخضري حيث أمكن', 'إزالة السعف شديد الإصابة ضمن برنامج خدمة متوازن', 'تجنب نقل مخلفات مصابة إلى مشاتل أو مزارع سليمة'],
    urgentFlags: ['تدهور واسع للسعف أو ضعف شديد في المجموع الخضري'],
    regionalOccurrences: [{ region: 'مناطق زراعة النخيل الرطبة وشبه الرطبة', statement: 'مرضي موصوف في مراجع النخيل؛ الظروف المحلية تؤثر في شدة ظهوره.', evidenceGrade: 'B', sourceIds: ['icarda-date-palm-guide'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صورة ماكرو للبثرات', 'صورة للسطح العلوي والسفلي للوريقة', 'صورة للسعف كاملاً لتقدير شدة التوزيع'],
    diagnosisLimitations: ['يجب رؤية البثرات نفسها؛ البقع المسطحة وحدها غير كافية'],
    sourceIds: ['icarda-date-palm-guide']
  },
  {
    id: 'dp-fusarium-wilt-bayoud',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'مرض البيوض (ذبول الفيوزاريوم)',
    nameEn: 'Bayoud disease',
    scientificName: 'Fusarium oxysporum f. sp. albedinis',
    causeGroup: 'fungus',
    affectedParts: ['الأوراق', 'الأوعية الناقلة', 'القلب والتاج'],
    diagnosticClues: ['ذبول تدريجي أو جفاف غير متناظر لبعض السعف', 'تغير لون الأنسجة الوعائية عند الفحص', 'تقدم الأعراض وقد ينتهي بموت النخلة'],
    lookalikes: ['عطش أو ملوحة شديدة', 'أعفان جذور أو تاج', 'أمراض وعائية أخرى'],
    confirmation: ['تشخيص مختبري متخصص للمسبب', 'تتبع مصدر الفسائل والمواد النباتية', 'فحص الأشجار المجاورة وسجل انتقال مواد الإكثار'],
    integratedManagement: ['عدم نقل فسائل أو تربة أو مخلفات من بؤرة مشتبه بها', 'إبلاغ الجهة المختصة عند الاشتباه بمرض حجر أو مرض وعائي خطير', 'اتباع تعليمات الحجر والإزالة الرسمية إن صدرت'],
    urgentFlags: ['اشتباه أول ظهور في منطقة أو مزرعة', 'ذبول وعائي متقدم أو نفوق نخيل متتابع'],
    regionalOccurrences: [{ region: 'شمال أفريقيا، خاصة مناطق المغرب والجزائر', statement: 'مرض تاريخي مهم في مناطق من شمال أفريقيا؛ لا يجوز استنتاج وجوده في الخليج من هذا السجل.', evidenceGrade: 'A', sourceIds: ['icarda-date-palm-guide', 'eppo-global-database'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صور متتابعة للتاج من جهات مختلفة', 'صورة مقطع عرضي للأنسجة عند الفحص المختص فقط', 'توثيق مصدر الفسيلة وموقع النخلة'],
    diagnosisLimitations: ['لا يمكن تأكيد البيوض من صورة ورقية فقط', 'يجب عدم الخلط بينه وبين إجهاد الماء والملوحة وأعفان الجذور'],
    sourceIds: ['icarda-date-palm-guide', 'eppo-global-database']
  },
  {
    id: 'dp-dubas-bug',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'حشرة دوباس النخيل',
    nameEn: 'Dubas bug',
    scientificName: 'Ommatissus lybicus',
    causeGroup: 'insect',
    affectedParts: ['الخوص', 'السعف', 'العذوق بصورة غير مباشرة'],
    diagnosticClues: ['وجود حوريات أو حشرات صغيرة على الوريقات', 'إفرازات عسلية لزجة', 'تراكم الندوة العسلية وقد يتبعها نمو العفن الهبابي'],
    lookalikes: ['الحشرات القشرية', 'البق الدقيقي', 'العفن الهبابي الناتج عن حشرات ماصة أخرى'],
    confirmation: ['فحص السطح السفلي للوريقات بحثاً عن الحوريات', 'التفريق بين الحشرة نفسها وآثار الندوة العسلية', 'تسجيل طور الحشرة وكثافتها'],
    integratedManagement: ['المراقبة الموسمية وتحديد طور الحشرة قبل أي تدخل', 'حماية الأعداء الحيوية وتجنب الرش غير المبرر', 'تنفيذ برامج المكافحة الجماعية الرسمية عند إعلانها'],
    urgentFlags: ['كثافة مرتفعة وتدهور واسع في السعف', 'ظهور بؤر جديدة تستدعي المسح الزراعي'],
    regionalOccurrences: [{ region: 'العراق والخليج ومناطق زراعة النخيل المجاورة', statement: 'آفة إقليمية موصوفة في مراجع النخيل؛ يجب توثيق مستوى وجودها محلياً بشكل مستقل.', evidenceGrade: 'A', sourceIds: ['icarda-date-palm-guide'] }],
    evidenceGrade: 'A',
    imageRequirements: ['لقطة قريبة للحوريات على الوريقة', 'صورة للندوة العسلية', 'صورة عامة للسعف لتقدير التوزيع'],
    diagnosisLimitations: ['العفن الهبابي وحده ليس تشخيصاً لدوباس', 'الصور الجوية بعيدة المدى لا تكفي لتحديد الحشرة'],
    sourceIds: ['icarda-date-palm-guide']
  },
  {
    id: 'dp-lesser-date-moth',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'عثة التمر الصغرى',
    nameEn: 'Lesser date moth',
    scientificName: 'Batrachedra amydraula',
    causeGroup: 'insect',
    affectedParts: ['الثمار الصغيرة', 'الشماريخ', 'العذوق'],
    diagnosticClues: ['ثقوب دخول صغيرة في الثمار', 'وجود يرقات أو فضلات داخل الثمرة', 'جفاف أو تلف الثمار الصغيرة وتساقطها'],
    lookalikes: ['تساقط فسيولوجي بعد العقد', 'أضرار حشرات ثمار أخرى', 'تشقق أو تلف ميكانيكي'],
    confirmation: ['فتح عينة من الثمار المصابة والبحث عن اليرقة والفضلات', 'تسجيل عمر الثمرة ومرحلة الإصابة', 'تعريف الحشرة عند الحاجة'],
    integratedManagement: ['جمع الثمار المتساقطة والمصابة والتخلص منها بطريقة سليمة', 'متابعة العذوق مبكراً وتوثيق توقيت الإصابة', 'تنسيق التدخلات مع الإرشاد الزراعي وفق طور الآفة'],
    urgentFlags: ['تلف متزايد في نسبة كبيرة من العقد الحديث'],
    regionalOccurrences: [{ region: 'مناطق زراعة نخيل التمر في الشرق الأوسط وشمال أفريقيا', statement: 'آفة موصوفة إقليمياً؛ تختلف الأجيال ومواعيد النشاط حسب المناخ والصنف.', evidenceGrade: 'B', sourceIds: ['icarda-date-palm-guide'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صورة الثمرة المثقوبة', 'صورة داخل الثمرة بعد فتحها', 'صورة للعذق ومرحلة نمو الثمار'],
    diagnosisLimitations: ['الثقوب وحدها لا تكفي دون قرينة يرقة أو فضلات أو نمط إصابة متوافق'],
    sourceIds: ['icarda-date-palm-guide']
  },
  {
    id: 'dp-old-world-date-mite',
    cropId: 'date-palm',
    cropAr: 'نخيل التمر',
    cropEn: 'Date palm',
    nameAr: 'حلم الغبار على ثمار النخيل',
    nameEn: 'Old-world date mite',
    scientificName: 'Oligonychus afrasiaticus',
    causeGroup: 'mite',
    affectedParts: ['الثمار', 'العذوق'],
    diagnosticClues: ['خيوط دقيقة على الثمار أو الشماريخ', 'تراكم غبار وأنسجة دقيقة على سطح الثمار', 'خشونة أو تغير لون سطح الثمرة وضعف جودتها'],
    lookalikes: ['الغبار والرمال فقط', 'شبكات العناكب', 'أضرار احتكاك الثمار'],
    confirmation: ['فحص الثمار والشماريخ بعدسة مكبرة', 'جمع عينة من الحلم للفحص المجهري', 'ربط وجود الخيوط بوجود أفراد الحلم'],
    integratedManagement: ['المراقبة المبكرة للعذوق', 'تقليل مصادر الغبار حيث يمكن دون الإضرار بالنخلة', 'اتباع الإرشاد المحلي بشأن إدارة الآفة والأعداء الحيوية'],
    urgentFlags: ['انتشار سريع على عدد كبير من العذوق أو انخفاض جودة المحصول'],
    regionalOccurrences: [{ region: 'الشرق الأوسط وشمال أفريقيا', statement: 'حلم اقتصادي معروف في نظم نخيل التمر؛ لا يعني ذلك أن كل غبار على الثمار إصابة به.', evidenceGrade: 'B', sourceIds: ['icarda-date-palm-guide'] }],
    evidenceGrade: 'B',
    imageRequirements: ['لقطة ماكرو للخيوط', 'صورة سطح الثمرة', 'عينة مكبرة أو مجهرية للحلم إن توفرت'],
    diagnosisLimitations: ['لا يُشخّص الحلم من الغبار وحده؛ يلزم رؤية الحلم أو علاماته المميزة'],
    sourceIds: ['icarda-date-palm-guide']
  },
  {
    id: 'citrus-canker',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'تقرح الحمضيات',
    nameEn: 'Citrus canker',
    scientificName: 'Xanthomonas citri subsp. citri',
    causeGroup: 'bacterium',
    affectedParts: ['الأوراق', 'الأفرع', 'الثمار'],
    diagnosticClues: ['آفات فلينية مرتفعة وخشنة على الأوراق والثمار', 'هالة صفراء قد تحيط بالبقع على الأوراق', 'قد تظهر البقع على جانبي الورقة وتسبب تساقطاً عند شدة الإصابة'],
    lookalikes: ['جرب الحمضيات', 'تبقعات فطرية', 'أضرار حشرية أو ميكانيكية'],
    confirmation: ['فحص شكل الآفة وارتفاعها وتوزيعها', 'تأكيد مختبري عند الاشتباه أو عند وجود متطلبات حجر نباتي', 'توثيق مصدر الشتلات وحركة المواد النباتية'],
    integratedManagement: ['استخدام شتلات ومواد إكثار سليمة ومعتمدة', 'تجنب نقل مواد نباتية من بؤر مشتبه بها', 'اتباع تعليمات الحجر والإبلاغ الرسمية عند الاشتباه'],
    urgentFlags: ['اشتباه أول ظهور في منطقة جديدة', 'وجود آفات فلينية نموذجية على أوراق وثمار متعددة'],
    regionalOccurrences: [{ region: 'مناطق حمضيات متعددة عالمياً', statement: 'مرض بكتيري ذو أهمية حجرية في دول عديدة؛ لا يثبت هذا السجل وجوده في بلد المستخدم.', evidenceGrade: 'A', sourceIds: ['niphm-citrus-ipm', 'uf-ifas-citrus-id', 'eppo-global-database'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صورة قريبة للآفة مع وضوح ارتفاعها', 'الوجهين العلوي والسفلي للورقة', 'صورة للثمرة أو الفرع إن ظهرت عليه أعراض'],
    diagnosisLimitations: ['تقرح الأوراق قد يلتبس بالجرب والتبقعات؛ لا تصدر توصية علاجية أو حكم حجر دون تأكيد'],
    sourceIds: ['niphm-citrus-ipm', 'uf-ifas-citrus-id', 'eppo-global-database']
  },
  {
    id: 'citrus-huanglongbing',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'اخضرار الحمضيات (التنّين الأصفر)',
    nameEn: 'Huanglongbing / Citrus greening',
    scientificName: 'Candidatus Liberibacter asiaticus (and other HLB-associated species)',
    causeGroup: 'bacterium',
    affectedParts: ['الأوراق', 'الأفرع', 'الثمار', 'الشجرة كاملة'],
    diagnosticClues: ['اصفرار غير متناظر بين نصفي الورقة أو على جانبي العرق', 'تبقع مرقش غير منتظم لا يتطابق بين جانبي الورقة', 'ثمار غير منتظمة أو صغيرة وقد يظهر انعكاس غير طبيعي في تلوّنها', 'تدهور تدريجي في الشجرة'],
    lookalikes: ['نقص الزنك أو المنغنيز أو الحديد', 'نقص العناصر المتعددة', 'ضرر الجذور والملوحة'],
    confirmation: ['فحص جزيئي معتمد مثل PCR من عينة مناسبة', 'فحص وجود ناقل المرض وفق بروتوكول مختص', 'عدم الاعتماد على لون الورقة وحده'],
    integratedManagement: ['استخدام شتلات موثوقة وخالية من المسببات', 'المراقبة والإبلاغ وفق متطلبات الحجر النباتي', 'إدارة الناقل وفق توصيات الجهة المختصة عند ثبوت وجوده'],
    urgentFlags: ['اشتباه إصابة في منطقة لم يثبت فيها المرض', 'تزامن أعراض ورقية غير متناظرة مع تدهور الشجرة أو أعراض الثمار'],
    regionalOccurrences: [{ region: 'آسيا وأفريقيا والأمريكتان ومناطق أخرى بحسب سجلات EPPO', statement: 'مرض خطير متفاوت التوزيع؛ يجب فحص سجل الدولة الحالي وعدم افتراض وجوده في الخليج أو عُمان.', evidenceGrade: 'A', sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus', 'eppo-global-database'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صورة الورقة كاملة مع العرق الوسطي', 'صور أوراق من جهات مختلفة من الشجرة', 'صور الثمار إن وجدت', 'معلومات الصنف ومصدر الشتلة'],
    diagnosisLimitations: ['نقص العناصر قد يقلد الأعراض؛ التأكيد المخبري ضروري', 'لا يقدم مرشد تشخيصاً نهائياً من صورة منفردة'],
    sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus', 'eppo-global-database']
  },
  {
    id: 'citrus-phytophthora-gummosis',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'تصمغ وتقرح قاعدة جذع الحمضيات',
    nameEn: 'Phytophthora gummosis / foot rot',
    scientificName: 'Phytophthora spp.',
    causeGroup: 'oomycete',
    affectedParts: ['طوق الجذر', 'قاعدة الجذع', 'الجذور', 'قد يمتد للأفرع'],
    diagnosticClues: ['إفراز صمغي من اللحاء المصاب', 'تلف أو تقشر اللحاء قرب سطح التربة', 'ضعف عام واصفرار وتراجع نمو عند تأثر الجذور أو الطوق'],
    lookalikes: ['جروح ميكانيكية', 'تصمغ مرتبط بإجهاد أو مسبب آخر', 'أعفان جذور مختلفة'],
    confirmation: ['فحص حدود النسيج الحي والميت عند مختص', 'عزل أو اختبار المسبب من نسيج حديث عند الحاجة', 'فحص الصرف وتكرار تشبع التربة'],
    integratedManagement: ['تحسين الصرف ومنع تجمع الماء حول الجذع', 'تجنب دفن طوق الجذر أو ملامسة الري المباشر المستمر للجذع', 'استخدام أصول ومواد إكثار سليمة وتجنب جرح قاعدة الجذع'],
    urgentFlags: ['تطويق الإصابة لجزء كبير من محيط الجذع', 'انهيار سريع أو ذبول مع تلف واضح في الطوق'],
    regionalOccurrences: [{ region: 'مناطق إنتاج الحمضيات عالمياً', statement: 'مجموعة أمراض معروفة مرتبطة بتشبع التربة وسوء الصرف؛ نوع Phytophthora يحتاج تحديداً.', evidenceGrade: 'A', sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صورة قاعدة الجذع مع سطح التربة', 'صورة الإفراز الصمغي واللحاء', 'صورة عامة للشجرة وموقع الري والصرف'],
    diagnosisLimitations: ['الصمغ وحده ليس كافياً لتحديد Phytophthora', 'قد توجد إصابة جذرية دون أعراض ورقية نوعية'],
    sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus']
  },
  {
    id: 'citrus-anthracnose',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'أنثراكنوز الحمضيات',
    nameEn: 'Citrus anthracnose',
    scientificName: 'Colletotrichum spp.',
    causeGroup: 'fungus',
    affectedParts: ['الأوراق', 'الأفرع', 'الأزهار', 'الثمار'],
    diagnosticClues: ['بقع نخرية قد تتسع على الأوراق', 'موت أطراف أفرع أو جفاف أزهار في ظروف ملائمة', 'قد تظهر بقع غائرة أو تلف على الثمار'],
    lookalikes: ['Alternaria brown spot', 'تبقعات بكتيرية', 'حروق الشمس أو أضرار الرش'],
    confirmation: ['تقييم شكل الآفة وتوزيعها على أعضاء مختلفة', 'فحص مجهري أو عزل عند الحاجة لتحديد النوع', 'مراجعة الرطوبة وبقايا الأزهار والأفرع المصابة'],
    integratedManagement: ['إزالة الأجزاء الميتة والمصابة بطريقة صحية', 'تحسين تهوية المجموع الخضري وتجنب البلل المطول', 'تجنب الإجهاد الشديد وتحسين إدارة الري'],
    urgentFlags: ['موت أفرع سريع أو إصابة واسعة للأزهار والثمار'],
    regionalOccurrences: [{ region: 'مناطق حمضيات متعددة', statement: 'مرض فطري موصوف ضمن أدلة الحمضيات؛ تحديد النوع والمسبب يتطلب قرائن إضافية.', evidenceGrade: 'B', sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صور البقع مع مقياس', 'صورة للورقة والفرع والثمار إن توفرت', 'لقطة للحد الفاصل بين النسيج السليم والمصاب'],
    diagnosisLimitations: ['اسم Colletotrichum spp. لا يحدد النوع أو السلالة', 'التبقعات متشابهة بصرياً ولا تكفي صورة ورقة واحدة'],
    sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus']
  },
  {
    id: 'citrus-scab',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'جرب الحمضيات',
    nameEn: 'Citrus scab',
    scientificName: 'Elsinoë fawcettii',
    causeGroup: 'fungus',
    affectedParts: ['الأوراق الحديثة', 'الأفرع الغضة', 'الثمار'],
    diagnosticClues: ['نتوءات أو آفات فلينية خشنة بارزة', 'تشوه الأوراق الحديثة أو تجعدها', 'تكون آفات فلينية على قشرة الثمار'],
    lookalikes: ['تقرح الحمضيات البكتيري', 'أضرار الحشرات الماصة', 'ندوب ميكانيكية على الثمار'],
    confirmation: ['فحص شكل الآفات على الأوراق والثمار معاً', 'تأكيد مختبري عند التداخل مع التقرح البكتيري', 'توثيق الصنف والجزء النباتي المصاب'],
    integratedManagement: ['استخدام شتلات سليمة', 'إزالة مصادر العدوى وفق الممارسات الصحية', 'تجنب نقل مواد نباتية مصابة'],
    urgentFlags: ['تداخل أعراض تشبه التقرح البكتيري أو الاشتباه بمرض حجر'],
    regionalOccurrences: [{ region: 'مناطق إنتاج الحمضيات الرطبة وشبه الرطبة', statement: 'مرض معروف في الحمضيات؛ تختلف قابلية الأصناف وشدة المرض حسب البيئة.', evidenceGrade: 'B', sourceIds: ['niphm-citrus-ipm', 'uf-ifas-citrus-id'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صورة مقربة للنتوءات الفلينية', 'السطح العلوي والسفلي للورقة', 'صورة الثمرة المصابة'],
    diagnosisLimitations: ['التقرح البكتيري قد يشبه الجرب؛ لا يحدد المحرك السبب من الشكل وحده عند الشك'],
    sourceIds: ['niphm-citrus-ipm', 'uf-ifas-citrus-id']
  },
  {
    id: 'citrus-leafminer',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'حافرة أوراق الحمضيات',
    nameEn: 'Citrus leafminer',
    scientificName: 'Phyllocnistis citrella',
    causeGroup: 'insect',
    affectedParts: ['الأوراق الحديثة', 'النموات الغضة'],
    diagnosticClues: ['أنفاق متعرجة فضية أو شفافة داخل نصل الورقة', 'خط فضي متعرج مع مسار فضلات دقيق', 'التفاف وتشوه الأوراق الحديثة عند شدة الإصابة'],
    lookalikes: ['أنفاق حشرات أخرى', 'أضرار رش أو احتراق سطحي', 'تجعد بسبب المن'],
    confirmation: ['فحص الورقة مقابل الضوء لتتبع النفق', 'البحث عن اليرقة أو العذراء داخل النفق أو على حافة الورقة الملفوفة'],
    integratedManagement: ['حماية النموات الحديثة من الإجهاد المفرط', 'المراقبة وتجنب المعاملات غير الضرورية التي تضر بالأعداء الحيوية', 'اتباع التوصيات المحلية عند الضرورة'],
    urgentFlags: ['إصابة مشتل أو شتلات حديثة بصورة واسعة'],
    regionalOccurrences: [{ region: 'مناطق الحمضيات في آسيا والشرق الأوسط ومناطق أخرى', statement: 'آفة واسعة العوائل والانتشار؛ لا يحدد هذا السجل كثافتها المحلية.', evidenceGrade: 'A', sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صورة ماكرو للنفق المتعرج', 'صورة الورقة كاملة', 'صورة النموات الحديثة'],
    diagnosisLimitations: ['الأثر الفضي دون وجود نفق واضح لا يكفي للتأكيد'],
    sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus']
  },
  {
    id: 'citrus-psyllid',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'بسيلا الحمضيات الآسيوية',
    nameEn: 'Asian citrus psyllid',
    scientificName: 'Diaphorina citri',
    causeGroup: 'insect',
    affectedParts: ['النموات الحديثة', 'الأوراق', 'الأفرع الغضة'],
    diagnosticClues: ['حشرات صغيرة تميل لوضعية جسم مائلة على النموات', 'حوريات مسطحة على النموات الحديثة مع إفرازات شمعية', 'تجعد أو تشوه النموات؛ الأهمية الكبرى لكونها ناقلاً لمسبب HLB'],
    lookalikes: ['المن', 'نطاطات أوراق صغيرة', 'حشرات ماصة أخرى'],
    confirmation: ['تعريف الحشرة أو الحورية بواسطة مختص', 'استخدام مصائد ومراقبة نموات الحمضيات', 'عدم استنتاج HLB من وجود الحشرة وحدها'],
    integratedManagement: ['فحص الشتلات قبل النقل', 'المراقبة المنظمة للنموات الحديثة', 'التقيد بإجراءات الحجر ومكافحة الناقل الرسمية عند ثبوت وجوده'],
    urgentFlags: ['رصد الحشرة في منطقة خالية أو منطقة حجرية', 'اشتباه اجتماع الناقل مع أعراض اخضرار الحمضيات'],
    regionalOccurrences: [{ region: 'آسيا ومناطق أخرى موثقة عالمياً', statement: 'ناقل مهم لمرض HLB؛ يلزم الرجوع إلى سجل البلد الحالي قبل أي استنتاج محلي.', evidenceGrade: 'A', sourceIds: ['niphm-citrus-ipm', 'eppo-global-database'] }],
    evidenceGrade: 'A',
    imageRequirements: ['صورة جانبية واضحة للحشرة البالغة', 'صورة للحوريات على النموات', 'صورة للنمو الحديث المصاب'],
    diagnosisLimitations: ['الحشرة لا تعني بالضرورة أن الشجرة مصابة بـ HLB', 'لا يمكن تعريف الأنواع الدقيقة من صور بعيدة أو مهزوزة'],
    sourceIds: ['niphm-citrus-ipm', 'eppo-global-database']
  },
  {
    id: 'citrus-sooty-mould',
    cropId: 'citrus',
    cropAr: 'الحمضيات',
    cropEn: 'Citrus',
    nameAr: 'العفن الهبابي على الحمضيات',
    nameEn: 'Sooty mould',
    scientificName: 'Complex of sooty-mould fungi (often Capnodium and related genera)',
    causeGroup: 'fungus',
    affectedParts: ['الأوراق', 'الأفرع', 'الثمار'],
    diagnosticClues: ['طبقة سوداء سطحية تشبه السخام', 'قد يمكن مسح جزء من الطبقة السوداء عن سطح الورقة', 'غالباً توجد إفرازات عسلية أو حشرات ماصة مرتبطة بها'],
    lookalikes: ['غبار أو سخام بيئي', 'تبقعات نخرية داخل نسيج الورقة', 'فطريات سطحية أخرى'],
    confirmation: ['فحص وجود الندوة العسلية والحشرات القشرية أو المن أو البق الدقيقي', 'التأكد من أن السواد سطحي وليس نسيجاً ميتاً داخل الورقة'],
    integratedManagement: ['تحديد الحشرة الماصة ومعالجة سبب الندوة العسلية ضمن IPM', 'حماية الأعداء الحيوية', 'تحسين التهوية وتقليل تراكم الغبار'],
    urgentFlags: ['تغطية شديدة للأوراق والثمار مع ضعف ملحوظ في الشجرة'],
    regionalOccurrences: [{ region: 'مناطق حمضيات متعددة عالمياً', statement: 'ينشأ غالباً بصورة ثانوية على الندوة العسلية؛ ليس تشخيصاً كافياً لنوع الحشرة.', evidenceGrade: 'B', sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus'] }],
    evidenceGrade: 'B',
    imageRequirements: ['صورة للطبقة السوداء قبل المسح', 'صورة بعد مسح مساحة صغيرة', 'لقطات قريبة للحشرات الماصة على الوجه السفلي'],
    diagnosisLimitations: ['العفن الهبابي علامة ثانوية ولا يحدد الحشرة المسببة للندوة العسلية'],
    sourceIds: ['niphm-citrus-ipm', 'uc-ipm-citrus']
  }
];

export function getMurshidCoreReferencesByCrop(crop: 'date-palm' | 'citrus'): MurshidCropHealthRecord[] {
  return MURSHID_CORE_CROP_HEALTH.filter((record) => record.cropId === crop);
}

export function getMurshidCoreReferenceById(id: string): MurshidCropHealthRecord | undefined {
  return MURSHID_CORE_CROP_HEALTH.find((record) => record.id === id);
}
