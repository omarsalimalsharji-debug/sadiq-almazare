/**
 * Stage Data & Educational Agricultural Challenges for «مغامرات مرشد الزراعية»
 */

export type AdventureStageId =
  | 'plant_id'
  | 'save_plant'
  | 'pest_hunt'
  | 'order_steps'
  | 'agri_quiz';

export type PlantIllustrationKey =
  | 'date_palm'
  | 'pomegranate'
  | 'omani_lime'
  | 'tomato'
  | 'mango'
  | 'garlic';

export type PlantConditionKey = 'thirsty' | 'nutrient_low' | 'pest_attack' | 'overgrown';
export type CareToolKey = 'water' | 'fertilizer' | 'treatment' | 'pruning';

export interface StageMeta {
  id: AdventureStageId;
  order: number;
  titleAr: string;
  subtitleAr: string;
  durationSec: number;
  maxPoints: number;
  introVoiceAr: string;
  accentGradient: string;
  badgeAr: string;
}

export const ADVENTURE_STAGES: StageMeta[] = [
  {
    id: 'plant_id',
    order: 1,
    titleAr: 'تحدي التعرف على النباتات',
    subtitleAr: 'شاهد صورة النبات وتلميح مرشد واختر اسمه الصحيح بسرعة!',
    durationSec: 50,
    maxPoints: 100,
    introVoiceAr: 'مرحباً يا صديقي! أنا مرشد، هيا نتعرف معاً على أشهر النباتات والمحاصيل العُمانية.',
    accentGradient: 'from-emerald-500 to-teal-600',
    badgeAr: 'مرحلة ١ · ذكاء بصري',
  },
  {
    id: 'save_plant',
    order: 2,
    titleAr: 'أنقذ النبات',
    subtitleAr: 'افحص حالة النبتة وقدّم لها الماء أو السماد أو العلاج الحيوي المناسب!',
    durationSec: 60,
    maxPoints: 120,
    introVoiceAr: 'هذه النباتات تحتاج رعايتك يا بطل! اختر الماء أو السماد أو العلاج المناسب لإنقاذها.',
    accentGradient: 'from-cyan-500 to-emerald-600',
    badgeAr: 'مرحلة ٢ · رعاية الحقل',
  },
  {
    id: 'pest_hunt',
    order: 3,
    titleAr: 'صيد الآفات وحماية النحل',
    subtitleAr: 'اضغط على الحشرات الضارة فقط واترك النحلة والدعسوقة المفيدة بأمان!',
    durationSec: 45,
    maxPoints: 140,
    introVoiceAr: 'أسرع! الآفات تقترب من الحديقة! اصطد الآفات الضارة واحذر من إزعاج النحل المفيد.',
    accentGradient: 'from-amber-500 to-orange-600',
    badgeAr: 'مرحلة ٣ · سرعة وتركيز',
  },
  {
    id: 'order_steps',
    order: 4,
    titleAr: 'رتب مراحل الزراعة',
    subtitleAr: 'رتب خطوات الزراعة من تجهيز الأرض حتى الحصاد باللمس أو السحب!',
    durationSec: 75,
    maxPoints: 120,
    introVoiceAr: 'كل محصول ناجح يبدأ بخطوات منظمة! رتب مراحل الزراعة من البداية حتى الحصاد.',
    accentGradient: 'from-violet-500 to-indigo-600',
    badgeAr: 'مرحلة ٤ · ترتيب وتخطيط',
  },
  {
    id: 'agri_quiz',
    order: 5,
    titleAr: 'اختبر ذكاءك الزراعي',
    subtitleAr: 'أسئلة ذكية وممتعة عن الزراعة العُمانية والأفلاج والمواسم في تحدٍ شيق!',
    durationSec: 80,
    maxPoints: 150,
    introVoiceAr: 'أحسنت بالوصول إلى المرحلة النهائية! أجب بدقة وسرعة لتتوج بطلاً للمزرعة مع مرشد!',
    accentGradient: 'from-rose-500 to-amber-600',
    badgeAr: 'مرحلة ٥ · التحدي الكبير',
  },
];

// Stage 1: Plant Identification Challenges
export interface PlantIdChallenge {
  id: string;
  plantKey: PlantIllustrationKey;
  correctName: string;
  options: string[];
  clueAr: string;
  successFactAr: string;
}

export const PLANT_ID_CHALLENGES: PlantIdChallenge[] = [
  {
    id: 'pid-palm',
    plantKey: 'date_palm',
    correctName: 'نخلة التمر العُمانية',
    options: ['نخلة التمر العُمانية', 'شجرة المانجو', 'شجرة الزيتون', 'نبات القمح'],
    clueAr: 'تشتهر بسلطنة عُمان بعذوقها الذهبية ومقاومتها للحرارة مثل الخلاص والفرض.',
    successFactAr: 'ممتاز! النخلة هي رمز الخير والبركة في سلطنة عُمان.',
  },
  {
    id: 'pid-pomegranate',
    plantKey: 'pomegranate',
    correctName: 'رمان الجبل الأخضر',
    options: ['رمان الجبل الأخضر', 'الليمون العُماني', 'الطماطم', 'الجوافة'],
    clueAr: 'فاكهة جبلية حمراء غنية بالياقوت اللذيذ تنمو في المدرجات الباردة.',
    successFactAr: 'رائع! رمان الجبل الأخضر من أجود الفواكه العُمانية في الصيف.',
  },
  {
    id: 'pid-lime',
    plantKey: 'omani_lime',
    correctName: 'الليمون العُماني',
    options: ['البرتقال', 'الليمون العُماني', 'التفاح', 'الخس'],
    clueAr: 'ثماره صفراء عطرية يُصنع منها الليمون اليابس والبهارات العُمانية.',
    successFactAr: 'أحسنت! الليمون العُماني مطلوب في كل بيت ومطبخ خليجي.',
  },
  {
    id: 'pid-tomato',
    plantKey: 'tomato',
    correctName: 'شتلة الطماطم',
    options: ['البصل الأحمر', 'الباذنجان', 'شتلة الطماطم', 'البرسيم'],
    clueAr: 'خضار صيفي وشتوي محبوب يثمر كرات حمراء لامعة ويحب الري المنتظم.',
    successFactAr: 'عاش البطَل! الطماطم تحتاج تربة متوازنة وتهوية جيدة حول أوراقها.',
  },
  {
    id: 'pid-mango',
    plantKey: 'mango',
    correctName: 'شجرة المانجو (الهمبا)',
    options: ['شجرة المانجو (الهمبا)', 'شجرة التمر', 'نبات الثوم', 'نبات الذرة'],
    clueAr: 'تسمى محلياً في عُمان «الهمبا» وتنمو بكثرة في الباطنة وصلالة.',
    successFactAr: 'أبدعت! شجرة المانجو العُمانية تعطينا ثماراً عطرة ولذيذة.',
  },
  {
    id: 'pid-garlic',
    plantKey: 'garlic',
    correctName: 'الثوم العُماني',
    options: ['الجزر', 'الفراولة', 'الثوم العُماني', 'الرمان'],
    clueAr: 'ينمو تحت التربة على شكل فصوص بيضاء بنكهة قوية ويزرع في البرد.',
    successFactAr: 'مدهش! الثوم العُماني من أشهر المحاصيل الشتوية القوية الفائدة.',
  },
];

// Stage 2: Save the Plant Challenges
export interface SavePlantChallenge {
  id: string;
  plantKey: PlantIllustrationKey;
  plantNameAr: string;
  condition: PlantConditionKey;
  symptomTitleAr: string;
  symptomDescAr: string;
  correctTool: CareToolKey;
  successMsgAr: string;
}

export const CARE_TOOLS: Array<{
  key: CareToolKey;
  labelAr: string;
  emoji: string;
  hintAr: string;
}> = [
  { key: 'water', labelAr: 'سقي بالماء', emoji: '💧', hintAr: 'ينعش التربة الجافة' },
  { key: 'fertilizer', labelAr: 'سماد عضوي', emoji: '🌱', hintAr: 'يغذي الأوراق الصفراء' },
  { key: 'treatment', labelAr: 'علاج النيم الحيوي', emoji: '🛡️', hintAr: 'يطرد الآفات بأمان' },
  { key: 'pruning', labelAr: 'تقليم السعف والأغصان', emoji: '✂️', hintAr: 'يحسّن الشمس والتهوية' },
];

export const SAVE_PLANT_CHALLENGES: SavePlantChallenge[] = [
  {
    id: 'save-1',
    plantKey: 'tomato',
    plantNameAr: 'شتلة الطماطم',
    condition: 'thirsty',
    symptomTitleAr: 'التربة جافة والأوراق ذابلة!',
    symptomDescAr: 'تبدو الشتلة متدلية بسبب قلة الرطوبة تحت شمس الظهيرة.',
    correctTool: 'water',
    successMsgAr: 'أحسنت! استعادت شتلة الطماطم نشاطها بعد الري المتوازن.',
  },
  {
    id: 'save-2',
    plantKey: 'omani_lime',
    plantNameAr: 'شجيرة الليمون العُماني',
    condition: 'nutrient_low',
    symptomTitleAr: 'الأوراق مصفرة والنمو بطيء!',
    symptomDescAr: 'نقص النيتروجين والعناصر المعدنية في التربة يسبب شحوب الأوراق.',
    correctTool: 'fertilizer',
    successMsgAr: 'عمل رائع! السماد العضوي أعاد الخضرة النضرة لأوراق الليمون.',
  },
  {
    id: 'save-3',
    plantKey: 'date_palm',
    plantNameAr: 'فسيلة النخيل',
    condition: 'pest_attack',
    symptomTitleAr: 'حشرات دقيقة تهاجم السعف الغض!',
    symptomDescAr: 'ظهرت حشرات المن والدوباس على الأوراق وتحتاج لمكافحة آمنة.',
    correctTool: 'treatment',
    successMsgAr: 'بارك الله فيك! علاج النيم الطبيعي طرد الآفة دون إيذاء النحل.',
  },
  {
    id: 'save-4',
    plantKey: 'pomegranate',
    plantNameAr: 'شجرة الرمان الجبلي',
    condition: 'overgrown',
    symptomTitleAr: 'أغصان يابسة متشابكة تحجب الشمس!',
    symptomDescAr: 'التشابك الزائد يمنع الهواء وضوء الشمس من الوصول للثمار.',
    correctTool: 'pruning',
    successMsgAr: 'ممتاز! التقليم السليم فتح المجال للشمس وجودة الثمار.',
  },
];

// Stage 3: Pest Hunt Entities
export interface PestEntityDef {
  id: string;
  nameAr: string;
  isHarmful: boolean;
  points: number;
  emoji: string;
  noteAr: string;
}

export const PEST_ENTITIES: PestEntityDef[] = [
  { id: 'weevil', nameAr: 'سوسة النخيل', isHarmful: true, points: 20, emoji: '🪲', noteAr: 'آفة خطيرة على النخيل!' },
  { id: 'aphid', nameAr: 'حشرة المن', isHarmful: true, points: 15, emoji: '🐛', noteAr: 'تمتص عصارة الأوراق!' },
  { id: 'locust', nameAr: 'جرادة جائعة', isHarmful: true, points: 15, emoji: '🦗', noteAr: 'تأكل البراعم الخضراء!' },
  { id: 'fly', nameAr: 'ذبابة الفاكهة', isHarmful: true, points: 18, emoji: '🪰', noteAr: 'تصيب ثمار المانجو والرمان!' },
  { id: 'bee', nameAr: 'نحلة العسل المفيدة', isHarmful: false, points: -10, emoji: '🐝', noteAr: 'النحل صديق المزارع ويلقح الأزهار!' },
  { id: 'ladybug', nameAr: 'دعسوقة مفيدة', isHarmful: false, points: -10, emoji: '🐞', noteAr: 'الدعسوقة تتغذى على المن وتساعدك!' },
];

// Stage 4: Order Farming Steps
export interface OrderStepItem {
  id: string;
  stepNumber: number;
  textAr: string;
  icon: string;
}

export interface OrderStageRound {
  id: string;
  titleAr: string;
  voicePromptAr: string;
  steps: OrderStepItem[];
}

export const ORDER_ROUNDS: OrderStageRound[] = [
  {
    id: 'order-tomato',
    titleAr: 'مراحل زراعة شتلة الخضراوات بنجاح',
    voicePromptAr: 'رتب خطوات زراعة الخضراوات من تجهيز التربة وحتى قطف الثمار!',
    steps: [
      { id: 's1', stepNumber: 1, textAr: 'حرث التربة وتنظيفها وإضافة السماد العضوي', icon: '🚜' },
      { id: 's2', stepNumber: 2, textAr: 'غرس البذور أو الشتلات السليمة في التربة', icon: '🌱' },
      { id: 's3', stepNumber: 3, textAr: 'الري المنتظم والمراقبة الوقائية من الآفات', icon: '💧' },
      { id: 's4', stepNumber: 4, textAr: 'نضج المحصول وجني الثمار الطازجة', icon: '🧺' },
    ],
  },
  {
    id: 'order-palm',
    titleAr: 'مراحل العناية السنوية بنخلة التمر العُمانية',
    voicePromptAr: 'رتب خطوات خدمة نخلة التمر خلال الموسم الزراعي في عُمان!',
    steps: [
      { id: 'p1', stepNumber: 1, textAr: 'تنظيف السعف اليابس وتجهيز أحواض الري', icon: '✂️' },
      { id: 'p2', stepNumber: 2, textAr: 'تلقيح النخلة (التنبيت) في بداية الربيع', icon: '🌴' },
      { id: 'p3', stepNumber: 3, textAr: 'تخفيف العذوق وتكميمها لحماية الرطب', icon: '🛡️' },
      { id: 'p4', stepNumber: 4, textAr: 'جداد التمور وفرزها في موسم القيظ', icon: '🍯' },
    ],
  },
];

// Stage 5: Smart Agricultural Quiz
export interface MurshidQuizQuestion {
  id: string;
  questionAr: string;
  options: string[];
  correctIndex: number;
  explanationAr: string;
}

export const MURSHID_QUIZ_QUESTIONS: MurshidQuizQuestion[] = [
  {
    id: 'mq-1',
    questionAr: 'ما هو الوقت الأفضل لري النباتات في أيام الصيف الحارة بسلطنة عُمان؟',
    options: [
      'في منتصف الظهيرة الحارة',
      'في الصباح الباكر أو قبل الغروب',
      'كل ساعة بدون توقف',
      'لا تحتاج النباتات للماء في الصيف',
    ],
    correctIndex: 1,
    explanationAr: 'الري صباحاً أو قبيل الغروب يقلل تبخر الماء ويحمي الجذور من الصدمة الحرارية.',
  },
  {
    id: 'mq-2',
    questionAr: 'ما هو النظام العُماني التاريخي لتوزيع مياه الري بين المزارعين بالعدالة؟',
    options: ['نظام الأفلاج والأثر', 'السدود الجليدية', 'المياه المالحة', 'رشاشات الهواء'],
    correctIndex: 0,
    explanationAr: 'الأفلاج العُمانية إرث عالمي يدير المياه بين المزارع بدقة حسابية مدهشة.',
  },
  {
    id: 'mq-3',
    questionAr: 'أي حشرة تُعد صديقة للمزارع ويجب الحفاظ عليها في البستان؟',
    options: ['سوسة النخيل', 'حشرة المن', 'نحلة العسل', 'الجرادة'],
    correctIndex: 2,
    explanationAr: 'نحلة العسل تلقح أزهار الأشجار والخضراوات وتزيد وفرة وجودة الثمار.',
  },
  {
    id: 'mq-4',
    questionAr: 'ماذا نستفيد من تدوير بقايا النباتات الجافة وروث الحيوانات المتحلل؟',
    options: [
      'لا فائدة منها أبداً',
      'صناعة سماد عضوي يخصب التربة',
      'جذب الحشرات الضارة فقط',
      'زيادة ملوحة التربة',
    ],
    correctIndex: 1,
    explanationAr: 'السماد العضوي المتحلل (الكمبوست) يحسن بنية التربة ويحفظ رطوبتها.',
  },
  {
    id: 'mq-5',
    questionAr: 'كيف نحمي عذوق نخيل التمر من حشرة غبير النخيل والطيور بأمان؟',
    options: [
      'بالتكميم بأكياس مهواة ونظافة رأس النخلة',
      'بقطع جميع سعف النخلة الأخضر',
      'بتعطيش النخلة شهراً كاملاً',
      'بتسليط أضواء قوية ليلاً',
    ],
    correctIndex: 0,
    explanationAr: 'التكميم الصحيح وتهوية العذوق يحافظان على نظافة الرطب وجودته العالية.',
  },
];
