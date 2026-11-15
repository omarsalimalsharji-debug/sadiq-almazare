/**
 * Authentic Omani Agricultural Data for «مزرعتي الافتراضية» (My Virtual Farm)
 * Crops, 10-Point Scientific Profiles, Growth Stages, Tools, Fertilizers & Achievements
 */

export interface CropGrowthStage {
  name: string;
  durationSec: number; // Real-time server duration to advance from this stage
  minMoisture: number;
  minNutrients: number;
  minHealth: number;
  visualScale: number;
  description: string;
}

export interface CropGuide10Points {
  '1_landPrep': string;
  '2_soilType': string;
  '3_seedsOrSeedlings': string;
  '4_plantingMethod': string;
  '5_irrigationNeeds': string;
  '6_fertilization': string;
  '7_growthStagesSummary': string;
  '8_diseasesAndPests': string;
  '9_preventionAndControl': string;
  '10_harvestAndYield': string;
}

export interface VirtualCropDef {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'نخيل' | 'حمضيات وفاكهة' | 'خضراوات' | 'محاصيل حقلية';
  greenhouseSuitable: boolean;
  openFieldSuitable: boolean;
  seedCostCoins: number;
  harvestCoins: number;
  harvestPoints: number;
  waterConsumptionRate: number; // Moisture drop per hour
  nutrientConsumptionRate: number; // Nutrient drop per hour
  idealTempRange: [number, number];
  omaniRegions: string;
  preferredSeason: string;
  bookCitationCode?: '[م]' | '[ج]' | '[ع]' | '[ت]' | '[م/ت]' | '[ع/ت]';
  bookPests?: string[];
  safeControlHint?: string;
  dailyTipsByStage?: string[];
  stages: CropGrowthStage[];
  guide: CropGuide10Points;
  colorHex: string;
}

export const VIRTUAL_CROPS: VirtualCropDef[] = [
  {
    id: 'faradh_palm',
    nameAr: 'نخيل الفرض العُماني',
    nameEn: 'Omani Al-Faradh Date Palm',
    category: 'نخيل',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 90,
    harvestCoins: 260,
    harvestPoints: 30,
    waterConsumptionRate: 6,
    nutrientConsumptionRate: 5,
    idealTempRange: [24, 44],
    omaniRegions: 'ولاية سمائل (أكثر من 270 ألف نخلة)، الداخلية، الظاهرة، الباطنة',
    preferredSeason: 'طوال العام (التلقيح فبراير–أبريل والجداد والطناء أغسطس–أكتوبر) [ج/ت]',
    bookCitationCode: '[م]',
    bookPests: ['سوسة النخيل الحمراء', 'حشرة الدوباس', 'حلم الغبار (عنكبوت النخيل)', 'دودة البلح الصغرى'],
    safeControlHint: 'التعفير بالكبريت لحلم الغبار، والزيت المعدني للقشرية، وإبلاغ الدائرة فوراً عند رؤية نشارة السوسة [ع].',
    dailyTipsByStage: [
      'بداية الغرس: ثبّت الفسيلة جيداً وتأكد من عدم تغريق الجمارة بالماء [م].',
      'نمو السعف: نظّف النخلة من السعف الجاف والليف وأزل الحشائش المنافسة [ع].',
      'التلقيح والطلع: لقّح بعد انشقاق الغلاف بأيام بلقاح فحل معروف ودوّن التاريخ [ع].',
      'الحبابوك والجمري: قم بخف العذوق وتدليتها وتكميمها لحمايتها من الطيور وحلم الغبار [ع].',
      'الخلال والرطب: خفّف الري قليلاً قرب النضج لتقليل تشقق الثمار وراقب ملوحة الماء [ع].',
      'الطناء والحصاد: ابدأ بالجني وافرز التمور ونظفها وجففها بمكان مهوّى [م].',
    ],
    colorHex: '#15803d',
    stages: [
      { name: 'بذرة / غرس الفسيلة', durationSec: 45, minMoisture: 45, minNutrients: 35, minHealth: 50, visualScale: 0.35, description: 'تثبيت الفسيلة وسقيها وفق نوبة الفلج لتشجيع التجذير [م].' },
      { name: 'شتلة ونمو السعف', durationSec: 60, minMoisture: 40, minNutrients: 40, minHealth: 55, visualScale: 0.55, description: 'تكون قلب النخلة وظهور السعف الجديد وتكريب اليابس [ع].' },
      { name: 'إزهار (التلقيح والطلع)', durationSec: 60, minMoisture: 45, minNutrients: 50, minHealth: 60, visualScale: 0.72, description: 'انشقاق الغلاف وتلقيح الشماريخ في فبراير–أبريل [ج/ت].' },
      { name: 'إثمار (الحبابوك والجمري)', durationSec: 70, minMoisture: 50, minNutrients: 55, minHealth: 65, visualScale: 0.86, description: 'عقد الثمار وخف العذوق وتدليتها وتكميمها [ع].' },
      { name: 'نضج (الخلال والرطب)', durationSec: 60, minMoisture: 38, minNutrients: 45, minHealth: 70, visualScale: 0.96, description: 'تخفيف الري قليلاً قرب النضج لمنع تشقق التمر [ع].' },
      { name: 'جاهز للحصاد (الطناء)', durationSec: 0, minMoisture: 30, minNutrients: 30, minHealth: 60, visualScale: 1.0, description: 'عذوق ناضجة جاهزة للطناء والفرز والتجفيف [م].' },
    ],
    guide: {
      '1_landPrep': 'حفر جورة بعمق 1م × 1م وتعريضها للشمس ثم خلطها بالسماد العضوي المتحلل (الدمن).',
      '2_soilType': 'التربة الطميية الرملية العميقة جيدة الصرف وذات ملوحة معتدلة.',
      '3_seedsOrSeedlings': 'فسائل منتخبة خالية من سوسة النخيل الحمراء، يتراوح وزنها بين 15–25 كجم.',
      '4_plantingMethod': 'تزرع على مسافة 8×8 أمتار بحيث يرتفع قلب الفسيلة فوق سطح التربة بـ 10 سم لمنع تعفن الجمارة.',
      '5_irrigationNeeds': 'ري يومي خفيف في أول 40 يوماً ثم كل 3–5 أيام صيفاً و7–10 أيام شتاءً بالري الفقاعي أو الأفلاج.',
      '6_fertilization': 'تسميد عضوي شتوي (30–40 كجم/نخلة) مع سماد فوسفاتي وبوتاسي متوازن قبل التلقيح.',
      '7_growthStagesSummary': 'غرس الفسيلة ← النمو الخضري ← الطلع والتلقيح ← الحبابوك والخلال ← البسر والرطب ← التمر.',
      '8_diseasesAndPests': 'سوسة النخيل الحمراء، دوباس النخيل (المتق)، حميرة النخيل، ومرض خياس الطلع.',
      '9_preventionAndControl': 'المصائد الفرمونية، تنظيف السعف اليابس (التكريب)، والرش الوقائي المعتمد عند العتبة الاقتصادية.',
      '10_harvestAndYield': 'ينضج الفرض متأخراً في أغسطس–سبتمبر ويعطي 70–120 كجم تموراً متماسكة عالية الجودة للتخزين.',
    },
  },
  {
    id: 'omani_cucumber',
    nameAr: 'الخيار العُماني',
    nameEn: 'Omani Greenhouse & Field Cucumber',
    category: 'خضراوات',
    greenhouseSuitable: true,
    openFieldSuitable: true,
    seedCostCoins: 35,
    harvestCoins: 115,
    harvestPoints: 30,
    waterConsumptionRate: 11,
    nutrientConsumptionRate: 9,
    idealTempRange: [20, 32],
    omaniRegions: 'سمائل، الباطنة، الداخلية، الشرقية، ظفار',
    preferredSeason: 'الحقل المكشوف سبتمبر–نوفمبر [ت]، وطوال العام بالبيوت المحمية',
    bookCitationCode: '[ت]',
    bookPests: ['الذبابة البيضاء', 'البياض الدقيقي والزغبي', 'حشرة المن', 'العنكبوت الأحمر'],
    safeControlHint: 'استخدم أسيتامبريد للذبابة البيضاء وأزوكسيستروبين للبياض الدقيقي؛ لا تستخدم الكبريت لحساسية القرعيات له [ت].',
    dailyTipsByStage: [
      'البذرة: ازرع في تربة دافئة جيدة الصرف وتجنب الصيف الحار في الحقل المكشوف [ع].',
      'الشتلة: التغطية بالمهاد (الملش) تحفظ الرطوبة وتقلل الحشائش وتنظف الثمار.',
      'النمو: الري بالتنقيط أفضل لتوفير الماء وتقليل الأمراض الورقية [ع].',
      'الإزهار: سمّد بتوازن نيتروجيني وبوتاسي عند بدء الإزهار [ع].',
      'الإثمار: تفقد الذبابة البيضاء والمن أسفل الأوراق كل يوم أو يومين.',
      'الحصاد: اقطف الثمار صباحاً وهي طرية قبل انتفاخ البذور لإطالة الإنتاج [ع].',
    ],
    colorHex: '#22c55e',
    stages: [
      { name: 'بذرة وإنبات', durationSec: 25, minMoisture: 55, minNutrients: 30, minHealth: 50, visualScale: 0.3, description: 'إنبات البذور في تربة دافئة جيدة الصرف [ع].' },
      { name: 'شتلة وتسلق', durationSec: 35, minMoisture: 55, minNutrients: 45, minHealth: 55, visualScale: 0.52, description: 'امتداد الساق والأوراق والتربية على الدعامات.' },
      { name: 'نمو وتزهير', durationSec: 35, minMoisture: 60, minNutrients: 55, minHealth: 60, visualScale: 0.72, description: 'تفتح الأزهار وتلقيحها مع ضبط التهوية.' },
      { name: 'إثمار وعقد', durationSec: 40, minMoisture: 60, minNutrients: 60, minHealth: 65, visualScale: 0.88, description: 'استطالة الثمار والري المنتظم بالتنقيط [ع].' },
      { name: 'نضج غض', durationSec: 30, minMoisture: 55, minNutrients: 50, minHealth: 70, visualScale: 0.96, description: 'اكتمال حجم ثمار الخيار العُماني الغض.' },
      { name: 'جاهز للحصاد (6-8 أسابيع)', durationSec: 0, minMoisture: 45, minNutrients: 40, minHealth: 65, visualScale: 1.0, description: 'يُكرر الجني كل يوم أو يومين في الصباح [ع].' },
    ],
    guide: {
      '1_landPrep': 'حراثة عميقة مرتين وتنعيم التربة وتجهيز مصاطب بعرض 1م مع تعقيمها شمسياً.',
      '2_soilType': 'تربة خفيفة إلى متوسطة خصبة جيدة الصرف بدرجة حموضة pH 6.0–7.0.',
      '3_seedsOrSeedlings': 'بذور هجينة عالية الإنتاجية ومقاومة للبياض الدقيقي أو شتلات سليمة.',
      '4_plantingMethod': 'زراعة على مسافة 40–50 سم بين النباتات و100 سم بين الخطوط بعمق 2 سم.',
      '5_irrigationNeeds': 'ري منتظم بالتنقيط يومياً أو كل يومين دون إغراق لتجنب عفن الجذور.',
      '6_fertilization': 'دفعة عضوية أساسية ثم برنامج تسميد NPK متدرج (عالي الفوسفور بداية، متوازن، ثم عالي البوتاسيوم أثناء الإثمار).',
      '7_growthStagesSummary': 'إنبات (5 أيام) ← نمو خضري ← تزهير (25 يوماً) ← إثمار وقطف متكرر بعد 40–45 يوماً.',
      '8_diseasesAndPests': 'البياض الدقيقي والزغبي، الذبابة البيضاء، العنكبوت الأحمر، والمن.',
      '9_preventionAndControl': 'ضبط التهوية بالبيت المحمي، استخدام المصائد الصفراء، والرش بالكبريت الميكروني أو الزيوت النباتية المعتمدة.',
      '10_harvestAndYield': 'يبدأ الحصاد بعد 40 يوماً ويستمر لعدة قطفات بمعدل 4–8 كجم للمتر المربع بالبيوت المحمية.',
    },
  },
  {
    id: 'omani_wheat',
    nameAr: 'القمح العُماني (ميسياني / كوليب)',
    nameEn: 'Omani Heritage Wheat',
    category: 'محاصيل حقلية',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 25,
    harvestCoins: 95,
    harvestPoints: 30,
    waterConsumptionRate: 5,
    nutrientConsumptionRate: 6,
    idealTempRange: [15, 30],
    omaniRegions: 'الداخلية (الحمراء، بهلاء)، الظاهرة (عبري)، الباطنة',
    preferredSeason: 'نوفمبر – أبريل (الموسم الشتوي)',
    colorHex: '#eab308',
    stages: [
      { name: 'الإنبات', durationSec: 30, minMoisture: 50, minNutrients: 30, minHealth: 50, visualScale: 0.3, description: 'بزوغ البادرات الخضراء الكثيفة في الأحواض.' },
      { name: 'التفريع والنمو الخضري', durationSec: 40, minMoisture: 45, minNutrients: 45, minHealth: 55, visualScale: 0.55, description: 'زيادة الأشطاء والسيقان الخضراء.' },
      { name: 'طرد السنابل والتزهير', durationSec: 45, minMoisture: 50, minNutrients: 55, minHealth: 60, visualScale: 0.78, description: 'ظهور السنابل العمانية وتلقيحها.' },
      { name: 'امتلاء الحبوب', durationSec: 45, minMoisture: 45, minNutrients: 50, minHealth: 65, visualScale: 0.9, description: 'امتلاء السنابل بالحبوب في الطور اللبني والعجيني.' },
      { name: 'الجفاف الذهبي والنضج', durationSec: 30, minMoisture: 25, minNutrients: 30, minHealth: 70, visualScale: 0.98, description: 'تحول لون السنابل للذهبي وإيقاف الري.' },
      { name: 'جاهز للحصاد', durationSec: 0, minMoisture: 15, minNutrients: 20, minHealth: 65, visualScale: 1.0, description: 'سنابل قمح عماني ذهبية جاهزة للحصاد والدراس.' },
    ],
    guide: {
      '1_landPrep': 'حراثة متعامدة وتنعيم التربة وتسويتها بالمسحاة أو الليزر وتقسيمها لأحواض (جلب).',
      '2_soilType': 'تربة طينية رملية متماسكة جيدة الصرف وخالية من الأعشاب.',
      '3_seedsOrSeedlings': 'تقاوي قمح عماني أصيل (ميسياني، كوليب، صاري، وادي قريات 110) بمعدل 40–50 كجم/فدان.',
      '4_plantingMethod': 'نثراً أو بالسطارة في صفوف تبعد 15–20 سم مع تغطية البذور بطبقة تربة رقيقة.',
      '5_irrigationNeeds': 'رية الزراعة ثم رية المحاياة بعد 12 يوماً، ثم كل 10–14 يوماً ويمنع الري عند اصفرار السنابل.',
      '6_fertilization': 'سماد عضوي مع السوبر فوسفات عند التجهيز، ودفعتا يوريا أو سماد آزوتي عند التفريع وطرد السنابل.',
      '7_growthStagesSummary': 'إنبات ← تفريع ← استطالة ← طرد السنابل ← امتلاء الحبوب ← النضج الكامل (120–135 يوماً).',
      '8_diseasesAndPests': 'أصداء القمح، التفحم السائب، المن، والطيور عند النضج.',
      '9_preventionAndControl': 'معاملة البذور قبل الزراعة، انتظام الري دون إفراط، ومكافحة الأعشاب مبكراً.',
      '10_harvestAndYield': 'يحصد في مارس–أبريل عند جفاف الحبوب ويعطي 1.2 إلى 2 طن للفدان مع القش (التبن).',
    },
  },
  {
    id: 'onion',
    nameAr: 'البصل العُماني الأحمر',
    nameEn: 'Omani Red Onion',
    category: 'خضراوات',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 28,
    harvestCoins: 100,
    harvestPoints: 30,
    waterConsumptionRate: 6,
    nutrientConsumptionRate: 6,
    idealTempRange: [18, 32],
    omaniRegions: 'سمائل، الحمراء، الداخلية، الباطنة، الظاهرة',
    preferredSeason: 'إنتاج الشتلات سبتمبر–أكتوبر؛ الشتل نوفمبر–ديسمبر؛ الحصاد مارس–أبريل [ع/ت]',
    bookCitationCode: '[ع/ت]',
    bookPests: ['حشرة الثربس', 'البياض الزغبي', 'اللطخة الأرجوانية', 'عفن الجذور'],
    safeControlHint: 'للثربس: سبينوساد أو أبامكتين؛ وللبياض الزغبي: ميتالاكسيل-إم؛ وتجنب مبيدي الأعشاب المحظورين جلايفوسيت وباراكوات [ت].',
    dailyTipsByStage: [
      'بذرة/شتلة: البصل حساس للملوحة، افحص ملوحة الماء والتربة ولا تدفن القاعدة عميقاً [ع].',
      'شتلة (6-8 أسابيع): أزل الحشائش باستمرار فالبصل ضعيف المنافسة في الشهرين الأولين [ع].',
      'نمو أنبوبي: قسّم النيتروجين على 2-3 دفعات ثم أوقفه عند بدء تكوّن الأبصال [ع].',
      'تكوّن الأبصال: باعد بين الريّات تدريجياً مع إضافة البوتاسيوم والكبريت لتحسين التخزين [ع/ت].',
      'نضج وذبول العنق: أوقف الري قبل الحصاد بـ 10 إلى 14 يوماً لتصلب القشرة [ع].',
      'الحصاد: اقطف عند ذبول العنق وجفّف الأبصال في الظل أسبوعاً إلى أسبوعين [ع].',
    ],
    colorHex: '#a855f7',
    stages: [
      { name: 'بذرة ومشتل (المَضِيّة)', durationSec: 30, minMoisture: 50, minNutrients: 30, minHealth: 50, visualScale: 0.3, description: 'نمو البادرات وشتلات البصل قبل النقل [ع/ت].' },
      { name: 'شتلة في الحقل', durationSec: 40, minMoisture: 50, minNutrients: 45, minHealth: 55, visualScale: 0.55, description: 'الشتل في نوفمبر–ديسمبر وإزالة الحشائش [ع].' },
      { name: 'نمو خضري وتفريع', durationSec: 40, minMoisture: 50, minNutrients: 55, minHealth: 60, visualScale: 0.75, description: 'نمو الأنابيب وإيقاف الآزوت عند بدء التحجيم [ع].' },
      { name: 'تضخم البصلة (إثمار)', durationSec: 40, minMoisture: 45, minNutrients: 55, minHealth: 65, visualScale: 0.9, description: 'انتفاخ الأبصال ومباعدة الريّات [ع].' },
      { name: 'ذبول العنق (توقيف الري)', durationSec: 25, minMoisture: 25, minNutrients: 30, minHealth: 70, visualScale: 0.98, description: 'إيقاف الري 10–14 يوماً قبل الحصاد لتحسين التخزين [ع].' },
      { name: 'جاهز للحصاد (مارس–أبريل)', durationSec: 0, minMoisture: 20, minNutrients: 20, minHealth: 65, visualScale: 1.0, description: 'بصل عُماني جاهز للحصاد والتجفيف بالظل [ع/ج].' },
    ],
    guide: {
      '1_landPrep': 'حراثة جيدة وإضافة السماد البلدي المتحلل وتخطيط التربة إلى مصاطب أو أحواض.',
      '2_soilType': 'تربة رملية طميية مفككة خصبة جيدة التهوية والصرف.',
      '3_seedsOrSeedlings': 'شتلات بعمر 45–60 يوماً بطول 15 سم سليمة من الأمراض.',
      '4_plantingMethod': 'تشتل على جانبي الخط بمسافة 10 سم بين الشتلات وبعمق سطحي (2–3 سم).',
      '5_irrigationNeeds': 'ري منتظم كل 3–5 أيام وتوقف المياه قبل الحصاد بـ 15 يوماً لتصلب القشرة.',
      '6_fertilization': 'فوسفور عند التشتيل، دفعات آزوت متوازنة أول 60 يوماً، وبوتاسيوم عند التحجيم.',
      '7_growthStagesSummary': 'المشتل ← نقل الشتلات ← النمو الخضري ← تكوين البصلة ← رقاد الأعناق والنضج.',
      '8_diseasesAndPests': 'التربس، لطعة البصل الأرجوانية، والبياض الزغبي.',
      '9_preventionAndControl': 'تقليم الأعشاب، تدوير المحاصيل، والرش الوقائي المنضبط لفترة الأمان.',
      '10_harvestAndYield': 'يحصد بعد 120–140 يوماً من التشتيل ويعطي 8–12 طناً للفدان.',
    },
  },
  {
    id: 'garlic',
    nameAr: 'الثوم العُماني البلدي',
    nameEn: 'Omani Local Garlic',
    category: 'خضراوات',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 32,
    harvestCoins: 110,
    harvestPoints: 30,
    waterConsumptionRate: 5,
    nutrientConsumptionRate: 6,
    idealTempRange: [14, 28],
    omaniRegions: 'سمائل، الحمراء، الجبل الأخضر، الداخلية',
    preferredSeason: 'الزراعة بالفصوص أكتوبر–نوفمبر [ع/ت]؛ الحصاد أبريل–مايو [ع/ج]',
    bookCitationCode: '[ع/ت]',
    bookPests: ['صدأ الثوم', 'العفن الأبيض', 'النيماتودا', 'الثربس'],
    safeControlHint: 'للصدأ: تيبوكونازول؛ وللعفن الأبيض والنيماتودا: دورة زراعية وفصوص سليمة وإزالة المصاب فوراً [ت].',
    dailyTipsByStage: [
      'غرس الفصوص: ازرع فصوصاً كبيرة سليمة بالرأس المدبب لأعلى على عمق 3–5 سم [ع].',
      'الإنبات: الثوم لا يتحمل غرق الجذور؛ اسقِ بري منتظم خفيف وتجنب الركود [ع].',
      'النمو: أزل الحشائش مبكراً وسوِّ التربة حول النباتات دون جرح الأبصال.',
      'التفصيص: تجنب النيتروجين المتأخر واستخدم البوتاسيوم والكبريت لجودة الرؤوس [ع/ت].',
      'النضج: أوقف الري قبل الحصاد بنحو أسبوعين عند بدء اصفرار الأوراق السفلية [ع].',
      'الحصاد: احصد عند اصفرار 3–4 أوراق سفلية وجفف الرؤوس في الظل 2–3 أسابيع [ع].',
    ],
    colorHex: '#e2e8f0',
    stages: [
      { name: 'بذرة (غرس الفصوص)', durationSec: 30, minMoisture: 50, minNutrients: 30, minHealth: 50, visualScale: 0.3, description: 'غرس الفصوص السليمة عمودياً بعمق 3–5 سم [ع].' },
      { name: 'شتلة وبوادر خضراء', durationSec: 40, minMoisture: 50, minNutrients: 45, minHealth: 55, visualScale: 0.55, description: 'ري منتظم خفيف وإزالة الأعشاب مبكراً [ع].' },
      { name: 'نمو وتفصيص الرأس', durationSec: 45, minMoisture: 50, minNutrients: 55, minHealth: 60, visualScale: 0.78, description: 'تشكل الفصوص وتجنب التسميد الآزوتي المتأخر [ع/ت].' },
      { name: 'إثمار وتحجيم الرؤوس', durationSec: 40, minMoisture: 45, minNutrients: 55, minHealth: 65, visualScale: 0.9, description: 'اكتمال امتلاء الفصوص في التربة جيدة الصرف.' },
      { name: 'نضج واصفرار الأوراق', durationSec: 25, minMoisture: 25, minNutrients: 30, minHealth: 70, visualScale: 0.98, description: 'إيقاف الري قبل الحصاد بأسبوعين [ع].' },
      { name: 'جاهز للحصاد (أبريل–مايو)', durationSec: 0, minMoisture: 20, minNutrients: 20, minHealth: 65, visualScale: 1.0, description: 'حصاد عند اصفرار 3–4 أوراق سفلية ثم تجفيف بالظل [ع].' },
    ],
    guide: {
      '1_landPrep': 'حراثة عميقة وتفكيك القلاقيل وخلط السماد العضوي المتحلل تماماً.',
      '2_soilType': 'تربة خصبة مفككة جيدة الصرف غير غدقة.',
      '3_seedsOrSeedlings': 'فصوص ثوم عماني منتخبة كبيرة الحجم خالية من النيماتودا والفطريات.',
      '4_plantingMethod': 'غرس الفصوص عمودياً بحيث تكون القمة المدببة للأعلى بمسافة 10 سم وعمق 3–4 سم.',
      '5_irrigationNeeds': 'ري منتظم كل 4–6 أيام ويقطع الري قبل التقليع بـ 15–20 يوماً.',
      '6_fertilization': 'كمبوست عضوي + كبريت زراعي + بوتاسيوم لتقوية الرائحة والصلاحية للتخزين.',
      '7_growthStagesSummary': 'غرس الفصوص ← نمو الأوراق ← التفصيص ← التحجيم ← النضج والتجفيف في الظل.',
      '8_diseasesAndPests': 'الصدأ، العفن الأبيض، حلم الثوم، والتربس.',
      '9_preventionAndControl': 'فرز التقاوي، تجنب الزراعة المتكررة بنفس المكان، واستخدام الكبريت الوقائي.',
      '10_harvestAndYield': 'يحصد بعد 140–150 يوماً بمتوسط 4–6 أطنان للفدان، ويُضفر ويُحفظ بمكان مهوى.',
    },
  },
  {
    id: 'sesame',
    nameAr: 'السمسم العُماني',
    nameEn: 'Omani Sesame',
    category: 'محاصيل حقلية',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 24,
    harvestCoins: 90,
    harvestPoints: 30,
    waterConsumptionRate: 4,
    nutrientConsumptionRate: 5,
    idealTempRange: [24, 38],
    omaniRegions: 'سمائل (تجارب ناجحة)، نزوى، الداخلية، الظاهرة',
    preferredSeason: 'أواخر أغسطس – سبتمبر؛ التزهير سبتمبر–أكتوبر؛ الحصاد ديسمبر–فبراير [ج]',
    bookCitationCode: '[ج]',
    bookPests: ['المن والذبابة البيضاء', 'ثاقبات القرون', 'ذبول فيوزاريوم وعفن الجذور'],
    safeControlHint: 'لثاقبات القرون: إيماميكتين بنزوات؛ وللذبابة والمن: أسيتامبريد؛ وللفيوزاريوم: صرف جيد وتريكوديرما للوقاية [ت].',
    dailyTipsByStage: [
      'البذر: نعم الأرض جيداً واخلط البذور بالرمل وازرع بعمق سطحي 1–2 سم [ع].',
      'الشتلة: كافح الحشائش في الأسابيع الأولى واخفِ البادرات لمسافات مناسبة [ع].',
      'النمو: السمسم يتحمل الجفاف القصير لكنه شديد الحساسية لغرق الجذور وركود الماء [ع].',
      'التزهير: تفتح الأزهار في سبتمبر–أكتوبر؛ اكتفِ بتسميد معتدل [ج/ع].',
      'تكوّن القرون: خفف الري عند النضج وراقب ثاقبات القرون [ع].',
      'الحصاد المبكر: احصد فور اصفرار الأوراق السفلية ولا تؤخر حتى لا تتفتح القرون وتتساقط البذور [ع].',
    ],
    colorHex: '#d97706',
    stages: [
      { name: 'بذرة وإنبات سطحي', durationSec: 25, minMoisture: 45, minNutrients: 25, minHealth: 50, visualScale: 0.3, description: 'زراعة سطحية (1–2 سم) مخلوطة بالرمل [ع].' },
      { name: 'شتلة وخف البادرات', durationSec: 35, minMoisture: 40, minNutrients: 40, minHealth: 55, visualScale: 0.55, description: 'مكافحة الأعشاب مبكراً وتفادي ركود الماء [ع].' },
      { name: 'نمو وتزهير', durationSec: 35, minMoisture: 45, minNutrients: 50, minHealth: 60, visualScale: 0.75, description: 'تفتح الأزهار في سبتمبر–أكتوبر [ج].' },
      { name: 'إثمار (تكوين القرون)', durationSec: 40, minMoisture: 45, minNutrients: 50, minHealth: 65, visualScale: 0.9, description: 'امتلاء القرون بالبذور (صنف أحمر أو أبيض) [ج].' },
      { name: 'نضج وتخفيف الري', durationSec: 30, minMoisture: 30, minNutrients: 30, minHealth: 70, visualScale: 0.98, description: 'اصفرار الأوراق والقرون السفلية [ع].' },
      { name: 'جاهز للحصاد (لا تؤخر)', durationSec: 0, minMoisture: 20, minNutrients: 20, minHealth: 65, visualScale: 1.0, description: 'تُقطع السيقان وتُوقف حزماً لتجف دون تساقط البذور [ع].' },
    ],
    guide: {
      '1_landPrep': 'حراثة وتسوية جيدة وتجهيز خطوط أو أحواض مستوية.',
      '2_soilType': 'تربة خفيفة أو متوسطة جيدة الصرف حساسة للغدق.',
      '3_seedsOrSeedlings': 'بذور نقية (3–4 كجم/فدان) تخلط برمل ناعم لتجانس التوزيع.',
      '4_plantingMethod': 'زراعة في سطور تبعد 50 سم وتخف البادرات إلى نبات واحد كل 15–20 سم.',
      '5_irrigationNeeds': 'يتحمل الجفاف المعتدل؛ يُروى باعتدال كل 7–10 أيام وتجنب تغريق الجذور.',
      '6_fertilization': 'تسميد عضوي خفيف ودفعة متوازنة NPK عند الخف والتزهير.',
      '7_growthStagesSummary': 'إنبات ← خف ونمو ← تزهير ← تكوين الكبسولات ← نضج وحصاد (95–110 أيام).',
      '8_diseasesAndPests': 'ذبول الفيوزاريوم، دودة قرون السمسم، وحشرة المن.',
      '9_preventionAndControl': 'انتظام الصرف، عدم المبالغة في الري، ومكافحة الأعشاب في أول شهر.',
      '10_harvestAndYield': 'يحصد عند اصفرار ثلثي الأوراق وتساقط السفلية وتجمع الحزم رأسياً؛ الإنتاج 400–700 كجم/فدان.',
    },
  },
  {
    id: 'tomato',
    nameAr: 'الطماطم العُمانية',
    nameEn: 'Omani Tomato',
    category: 'خضراوات',
    greenhouseSuitable: true,
    openFieldSuitable: true,
    seedCostCoins: 40,
    harvestCoins: 130,
    harvestPoints: 30,
    waterConsumptionRate: 10,
    nutrientConsumptionRate: 10,
    idealTempRange: [18, 32],
    omaniRegions: 'سمائل، الباطنة، الداخلية، الشرقية',
    preferredSeason: 'الموسم المعتدل حقلياً والبيوت المحمية تمد الموسم [م/ت]',
    bookCitationCode: '[م/ت]',
    bookPests: ['الذبابة البيضاء والحلم', 'حفارة أوراق الطماطم', 'اللفحة المبكرة والمتأخرة'],
    safeControlHint: 'لحفارة أوراق الطماطم: إيماميكتين بنزوات أو سبينوساد؛ وللذبابة: أسيتامبريد؛ وللّفحة: أزوكسيستروبين أو ميتالاكسيل-إم [ت].',
    dailyTipsByStage: [
      'بذرة/شتلة: اختر شتلات قوية خالية من تجعد الأوراق في البيت المحمي.',
      'نمو: قم بتدعيم السيقان وتقليم الأوراق السفلية لتحسين التهوية [م/ت].',
      'إزهار: راقب حشرة الذبابة البيضاء بالمصائد الصفراء لمنع نقل الفيروسات.',
      'إثمار: انتظام الري بالتنقيط مع الكالسيوم يمنع عفن الطرف الزهري.',
      'نضج: لا ترش مبيدات إلا مع مراعاة فترة الأمان قبل القطف [ت].',
      'حصاد: اقطف الثمار المتلونة واحفظها بعيداً عن الشمس المباشرة.',
    ],
    colorHex: '#ef4444',
    stages: [
      { name: 'بذرة وتجذير الشتلة', durationSec: 25, minMoisture: 55, minNutrients: 35, minHealth: 50, visualScale: 0.3, description: 'استقرار شتلة الطماطم وبداية النمو.' },
      { name: 'نمو وتدعيم الساق', durationSec: 35, minMoisture: 55, minNutrients: 50, minHealth: 55, visualScale: 0.52, description: 'تفريع الأوراق وتدعيم النبات وتقليمه [م/ت].' },
      { name: 'إزهار وتلقيح', durationSec: 35, minMoisture: 55, minNutrients: 55, minHealth: 60, visualScale: 0.72, description: 'تفتح العناقيد الزهرية ومراقبة الذبابة البيضاء.' },
      { name: 'إثمار وعقد الثمار', durationSec: 45, minMoisture: 60, minNutrients: 65, minHealth: 65, visualScale: 0.88, description: 'نمو الثمار الخضراء والحاجة للكالسيوم والبوتاسيوم.' },
      { name: 'نضج وتلون أحمر', durationSec: 35, minMoisture: 50, minNutrients: 55, minHealth: 70, visualScale: 0.96, description: 'احمرار الثمار وتفقد حفارة الأوراق.' },
      { name: 'جاهز للحصاد', durationSec: 0, minMoisture: 45, minNutrients: 40, minHealth: 65, visualScale: 1.0, description: 'طماطم عُمانية ناضجة جاهزة للقطف.' },
    ],
    guide: {
      '1_landPrep': 'حراثة عميقة، إضافة السماد العضوي المتحلل (20 طن/هكتار)، وعمل مصاطب مغطاة بالملش.',
      '2_soilType': 'تربة خصبة عميقة متعادلة pH 6.0–6.8 جيدة الصرف.',
      '3_seedsOrSeedlings': 'شتلات محمية قوية خالية من فيروس تجعد الأوراق الأصفر.',
      '4_plantingMethod': 'تزرع على مسافة 45–50 سم على الخط و120 سم بين الخطوط مع وضع دعامات.',
      '5_irrigationNeeds': 'ري منتظم وموزون بالتنقيط؛ التذبذب بالري يسبب تشقق الثمار وعفن الطرف الزهري.',
      '6_fertilization': 'فوسفور عند الشتل، آزوت متوازن خضرياً، وكالسيوم + بوتاسيوم بقوة أثناء الإثمار.',
      '7_growthStagesSummary': 'تشتيل ← نمو خضري ← تزهير وتلقيح ← عقد ونمو الثمار ← تلوين وحصاد (75–90 يوماً).',
      '8_diseasesAndPests': 'الندوة المبكرة والمتأخرة، توتا أبسولوتا (حافرة طماطم)، الذبابة البيضاء، وأكاروس الصدأ.',
      '9_preventionAndControl': 'شبك حشري 50 مش في البيت المحمي، مصائد فرمونية لتوتا أبسولوتا، وتقليم الأوراق السفلية.',
      '10_harvestAndYield': 'قطف عند التلون 75–100%؛ الإنتاج 25–45 طناً/فدان في المحميات و15–20 حقلياً.',
    },
  },
  {
    id: 'pepper',
    nameAr: 'الفلفل الرومي والحار العُماني',
    nameEn: 'Omani Sweet & Chili Pepper',
    category: 'خضراوات',
    greenhouseSuitable: true,
    openFieldSuitable: true,
    seedCostCoins: 38,
    harvestCoins: 125,
    harvestPoints: 30,
    waterConsumptionRate: 9,
    nutrientConsumptionRate: 9,
    idealTempRange: [20, 32],
    omaniRegions: 'الباطنة، الداخلية، الشرقية، ظفار',
    preferredSeason: 'سبتمبر – مارس حقلياً، وطوال العام بالمحميات',
    colorHex: '#16a34a',
    stages: [
      { name: 'تجذير الشتلة', durationSec: 25, minMoisture: 55, minNutrients: 35, minHealth: 50, visualScale: 0.3, description: 'ثبات الشتلة ونمو الجذور الشعرية.' },
      { name: 'النمو الخضري والتفرع', durationSec: 35, minMoisture: 55, minNutrients: 45, minHealth: 55, visualScale: 0.52, description: 'تفرع الساق وإزالة البراعم القاعدية.' },
      { name: 'التزهير', durationSec: 35, minMoisture: 55, minNutrients: 55, minHealth: 60, visualScale: 0.72, description: 'إزهار أبيض وتكوين العقد.' },
      { name: 'الإثمار', durationSec: 40, minMoisture: 55, minNutrients: 60, minHealth: 65, visualScale: 0.88, description: 'نمو قرون الفلفل اللامعة.' },
      { name: 'النضج', durationSec: 30, minMoisture: 50, minNutrients: 50, minHealth: 70, visualScale: 0.96, description: 'اكتمال الحجم وتلون الثمار.' },
      { name: 'جاهز للحصاد', durationSec: 0, minMoisture: 45, minNutrients: 40, minHealth: 65, visualScale: 1.0, description: 'فلفل طازج جاهز للقطف.' },
    ],
    guide: {
      '1_landPrep': 'تجهيز التربة بحراثتين وتنعيم وإضافة السماد العضوي والسوبر فوسفات.',
      '2_soilType': 'تربة طميية رملية غنية بالمادة العضوية وجيدة الصرف.',
      '3_seedsOrSeedlings': 'شتلات قوية بطول 12–15 سم بعمر 35–40 يوماً.',
      '4_plantingMethod': 'مسافة 40 سم بين النباتات و90 سم بين المصاطب.',
      '5_irrigationNeeds': 'حساس جداً للعطش والغدق؛ ري متزن بالتنقيط مع الحفاظ على رطوبة معتدلة.',
      '6_fertilization': 'توازن بين النيتروجين والبوتاسيوم والمغنيسيوم لتفادي تساقط الأزهار.',
      '7_growthStagesSummary': 'شتل ← تفرع خضري ← تزهير مستمر ← عقد وإثمار متتابع.',
      '8_diseasesAndPests': 'التربس، المن، العنكبوت الأحمر، البياض الدقيقي، وعفن الساق.',
      '9_preventionAndControl': 'المصائد الزرقاء للتربس، التظليل 30% في الحر، وتجنب الرطوبة الزائدة.',
      '10_harvestAndYield': 'القطف بعد 65–75 يوماً من الشتل باستخدام مقص نظيف لعدم كسر الأفرع.',
    },
  },
  {
    id: 'potato',
    nameAr: 'البطاطا العُمانية',
    nameEn: 'Omani Potato',
    category: 'خضراوات',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 34,
    harvestCoins: 118,
    harvestPoints: 30,
    waterConsumptionRate: 8,
    nutrientConsumptionRate: 8,
    idealTempRange: [16, 28],
    omaniRegions: 'ظفار (نجد)، الباطنة، الداخلية، الظاهرة',
    preferredSeason: 'أكتوبر – مارس',
    colorHex: '#ca8a04',
    stages: [
      { name: 'إنبات الدرنات', durationSec: 30, minMoisture: 50, minNutrients: 35, minHealth: 50, visualScale: 0.3, description: 'انبثاق السيقان من التقاوي تحت التربة.' },
      { name: 'النمو الخضري والعرش', durationSec: 40, minMoisture: 55, minNutrients: 50, minHealth: 55, visualScale: 0.55, description: 'تغطية الخطوط بالأوراق وتحفيز العزق والتحضين.' },
      { name: 'تشكّل المدادات والتزهير', durationSec: 40, minMoisture: 60, minNutrients: 55, minHealth: 60, visualScale: 0.76, description: 'بداية تكوين الدرنات تحت سطح التربة.' },
      { name: 'صبّ الدرنات وتضخمها', durationSec: 45, minMoisture: 60, minNutrients: 65, minHealth: 65, visualScale: 0.9, description: 'تراكم النشا وتضخم الدرنات مع الحاجة للبوتاسيوم.' },
      { name: 'النضج وتيبس العرش', durationSec: 30, minMoisture: 30, minNutrients: 30, minHealth: 70, visualScale: 0.98, description: 'تصويف العرش لتقوية قشرة الدرنة.' },
      { name: 'جاهز للحصاد', durationSec: 0, minMoisture: 25, minNutrients: 20, minHealth: 65, visualScale: 1.0, description: 'درنات بطاطا متماسكة جاهزة للتقليع.' },
    ],
    guide: {
      '1_landPrep': 'حراثتان متعامدتان عميقتان وتنعيم ممتاز وتخطيط بمسافة 75 سم.',
      '2_soilType': 'تربة رملية خفيفة إلى طميية مفككة لضمان نمو درنات منتظمة الشكل.',
      '3_seedsOrSeedlings': 'درنات تقاوي معتمدة مبرعمة خالية من العفن البني والفيروسات.',
      '4_plantingMethod': 'توضع الدرنات على عمق 10–12 سم بمسافة 25–30 سم ثم التحضين (الترديم) بارتفاع العرش.',
      '5_irrigationNeeds': 'ري منتظم دون جفاف أو تغريق خصوصاً أثناء صب الدرنات؛ يوقف الري قبل القلع بـ 10 أيام.',
      '6_fertilization': 'دفعة عضوية + فوسفور + سلفات بوتاسيوم عالية لزيادة الوزن والصلابة.',
      '7_growthStagesSummary': 'إنبات ← نمو عرش ← تكوين مدادات ← صب وتضخم درنات ← نضج (95–110 أيام).',
      '8_diseasesAndPests': 'الندوة المتأخرة، فراشة درنات البطاطا، المن، والديدان القارضة.',
      '9_preventionAndControl': 'التغطية الجيدة للدرنات بالتربة (الترديم) لمنع فراشة الدرنات واخضرارها.',
      '10_harvestAndYield': 'التقليع بحذر في الجو الجاف ويعطي الفدان 10–15 طناً.',
    },
  },
  {
    id: 'omani_lemon',
    nameAr: 'الليمون العُماني والحمضيات',
    nameEn: 'Omani Lime & Citrus',
    category: 'حمضيات وفاكهة',
    greenhouseSuitable: false,
    openFieldSuitable: true,
    seedCostCoins: 65,
    harvestCoins: 195,
    harvestPoints: 30,
    waterConsumptionRate: 7,
    nutrientConsumptionRate: 7,
    idealTempRange: [20, 38],
    omaniRegions: 'سمائل (وادي السيجاني والقرى)، الباطنة، الداخلية، الشرقية',
    preferredSeason: 'طوال العام (الغرس في الاعتدال الخريفي أو الربيعي) [م/ت]',
    bookCitationCode: '[م/ت]',
    bookPests: ['صانعة أنفاق أوراق الحمضيات', 'الحشرات القشرية', 'العناكب'],
    safeControlHint: 'لصانعة الأنفاق: أبامكتين أو سبينوساد؛ وللحشرات القشرية: زيت معدني أو بوبروفيزين (لا للدايميثويت والملاثيون المحظورين) [ت].',
    dailyTipsByStage: [
      'بذرة/شتلة مطعّمة: احفر جورة جيدة الصرف وغطِّ التربة حول الساق لحفظ الرطوبة [م].',
      'شتلة صغيرة: راقب الأوراق الغضة الجديدة من صانعة الأنفاق التي تسبب التواء الورقة [ت].',
      'نمو الشجرة: قدّم تسميداً متوازناً ومقسماً وتجنب تراكم الماء حول الجذع [م].',
      'تزهير الحمضيات: نظّم الري بدقة أثناء التزهير لمنع تساقط الأزهار العطرية.',
      'إثمار: افحص الأغصان والثمار للكشف المبكر عن الحشرات القشرية [ت].',
      'حصاد الليمون العُماني: اقطف الثمار الصفراء الناضجة واستفد من تجفيف اللومي العُماني [م].',
    ],
    colorHex: '#84cc16',
    stages: [
      { name: 'بذرة وشتلة مطعّمة', durationSec: 40, minMoisture: 50, minNutrients: 35, minHealth: 50, visualScale: 0.35, description: 'تثبيت شتلة الليمون العُماني وتغطية التربة حولها.' },
      { name: 'نمو وتفرع الشجرة', durationSec: 50, minMoisture: 50, minNutrients: 45, minHealth: 55, visualScale: 0.56, description: 'نمو الأوراق الغضة وحمايتها من صانعة الأنفاق.' },
      { name: 'إزهار ربيعي كثيف', durationSec: 50, minMoisture: 55, minNutrients: 55, minHealth: 60, visualScale: 0.75, description: 'تفتح أزهار الليمون البيضاء وانتظام الري.' },
      { name: 'إثمار ونمو الثمار الخضراء', durationSec: 55, minMoisture: 55, minNutrients: 60, minHealth: 65, visualScale: 0.88, description: 'عقد حبات الليمون العُماني والتسميد المتوازن المقسم.' },
      { name: 'نضج وتلوّن ذهبي', durationSec: 45, minMoisture: 45, minNutrients: 45, minHealth: 70, visualScale: 0.96, description: 'تحوّل الثمار إلى اللون الأصفر الليموني العطري.' },
      { name: 'جاهز للحصاد (القطف)', durationSec: 0, minMoisture: 35, minNutrients: 35, minHealth: 65, visualScale: 1.0, description: 'ليمون عُماني وفير جاهز للقطف أو التجفيف.' },
    ],
    guide: {
      '1_landPrep': 'تجهيز جورة بعمق 80 سم مع خلطة سماد عضوي متحلل ورمل لضمان الصرف.',
      '2_soilType': 'تربة طميية رملية خفيفة جيدة الصرف قليلة الملوحة.',
      '3_seedsOrSeedlings': 'شتلات مطعّمة معتمدة خالية من التصمغ وصانعة الأنفاق.',
      '4_plantingMethod': 'تُزرع على مسافة 4×5 أمتار مع إزالة الأفرع السرطانية أسفل منطقة التطعيم.',
      '5_irrigationNeeds': 'ري منتظم معتدل مع تغطية التربة (الملش) لمنع تبخر مياه الفلج وحماية الجذور.',
      '6_fertilization': 'تسميد عضوي شتوي وتسميد متوازن مقسّم مع العناصر الصغرى (الحديد والزنك) [ع].',
      '7_growthStagesSummary': 'غرس الشتلة ← نمو التاج ← التزهير ← العقد والإثمار ← النضج والقطف.',
      '8_diseasesAndPests': 'صانعة أنفاق أوراق الحمضيات، الحشرات القشرية، وذبابة الفاكهة.',
      '9_preventionAndControl': 'الرش بأبامكتين أو سبينوساد لصانعة الأنفاق، وبالزيت المعدني للحشرات القشرية [ت].',
      '10_harvestAndYield': 'تُجنى الثمار طازجة أو تُجفف لإنتاج اللومي العُماني الشهير.',
    },
  },
];

export interface OmanFarmDayWeather {
  seasonIndex: number;
  seasonName: string;
  seasonHint: string;
  tempMin: number;
  tempMax: number;
  evapMultiplier: number;
}

export const OMAN_FARM_SEASONS: OmanFarmDayWeather[] = [
  {
    seasonIndex: 0,
    seasonName: 'الموسم المعتدل (الشتوي)',
    seasonHint: 'مناسب لزراعة البصل والثوم والخيار العُماني والخضراوات المكشوفة [م]',
    tempMin: 21,
    tempMax: 28,
    evapMultiplier: 0.85,
  },
  {
    seasonIndex: 1,
    seasonName: 'موسم التلقيح والربيع',
    seasonHint: 'موسم تفتح طلع النخيل وتزهير الليمون والحمضيات وحصاد البصل [م/ت]',
    tempMin: 26,
    tempMax: 34,
    evapMultiplier: 1.0,
  },
  {
    seasonIndex: 2,
    seasonName: 'القيظ (الصيف الداخلي)',
    seasonHint: 'حرارة عالية في الحقل المكشوف؛ تتحمل النخلة والسمسم ويُفضّل البيت المحمي للخضر [ع]',
    tempMin: 35,
    tempMax: 43,
    evapMultiplier: 1.35,
  },
  {
    seasonIndex: 3,
    seasonName: 'الخريف واستعداد البذر',
    seasonHint: 'بداية زراعة السمسم والخيار العُماني وتجهيز شتلات البصل (المَضِيّة) [ج/ت]',
    tempMin: 27,
    tempMax: 35,
    evapMultiplier: 1.05,
  },
];

export const SAMAIL_DAILY_BOOK_TIPS: string[] = [
  'نظام توزيع مياه الفلج (الأيام والنوبات) هو العامل الأهم في تحديد موعد الري والزراعة بولاية سمائل [م].',
  'راقب قاعدة النخلة أسبوعياً: ظهور إفراز بني أو نشارة يعني الاشتباه بسوسة النخيل الحمراء — أبلغ الدائرة فوراً [ع].',
  'البصل والثوم لا يتحملان الملوحة العالية أو غرق الجذور؛ نظّم الري وأوقفه قبل الحصاد بـ 10–14 يوماً [ع].',
  'لا تستخدم مبيدات محظورة في سلطنة عُمان مثل جلايفوسيت أو مانكوزيب أو ديميثويت (القرار الوزاري 160/2023) [ت].',
  'السمسم يتحمل فترات جفاف قصيرة لكنه شديد الحساسية لركود الماء؛ ولا تؤخر حصاده كي لا تتفتح القرون [ع].',
  'البياض الدقيقي على الخيار العُماني يُعالج بأزوكسيستروبين ولا يُستخدم الكبريت لحساسية القرعيات له [ت].',
  'تُجنى ثمار الخيار العُماني صباحاً كل يوم أو يومين قبل انتفاخ البذور لإطالة فترة الإنتاج [ع].',
  'الليمون والحمضيات في وادي السيجاني تحتاج رياًّ منتظماً وتغطية للتربة ومراقبة صانعة أنفاق الأوراق [م/ت].',
];

export interface VirtualShopItem {
  id: string;
  nameAr: string;
  category: 'water' | 'fertilizer' | 'tool' | 'land' | 'livestock';
  description: string;
  costCoins: number;
  effectValue: number;
}

export const VIRTUAL_SHOP_ITEMS: VirtualShopItem[] = [
  { id: 'water_pack_100', nameAr: 'تعبئة خزان الفلج (+150 لتر مياه)', category: 'water', description: 'تزويد خزان المزرعة بمياه عذبة صالحة للري.', costCoins: 20, effectValue: 150 },
  { id: 'fert_organic', nameAr: 'سماد عضوي عُماني متحلل (×3)', category: 'fertilizer', description: 'يرفع خصوبة التربة تدريجياً ويحسن قوامها بأمان.', costCoins: 30, effectValue: 3 },
  { id: 'fert_npk', nameAr: 'سماد مركب NPK متوازن (×3)', category: 'fertilizer', description: 'تغذية سريعة للعناصر الكبرى (احذر الإفراط!).', costCoins: 45, effectValue: 3 },
  { id: 'pest_neem', nameAr: 'مستخلص النيم والمكافحة الحيوية (×3)', category: 'tool', description: 'مبيد حيوي آمن لمكافحة الآفات دون الإضرار بالنحل.', costCoins: 35, effectValue: 3 },
  { id: 'fodder_pack', nameAr: 'أعلاف قت وبرسيم عُماني طازج (×5)', category: 'livestock', description: 'علف طبيعي للأبقار والأغنام والدواجن لرفع إنتاج الحليب والبيض.', costCoins: 28, effectValue: 5 },
  { id: 'expand_plot', nameAr: 'استصلاح وتوسيع قطعة أرض جديدة', category: 'land', description: 'فتح قطعة أرض إضافية في المزرعة لزراعة المزيد.', costCoins: 120, effectValue: 1 },
  { id: 'upgrade_greenhouse', nameAr: 'تطوير وتحديث البيت المحمي (+1 مستوى)', category: 'land', description: 'توسيع البيت المحمي وتحسين أنظمة التبريد والتظليل الآلية.', costCoins: 180, effectValue: 1 },
];

export interface FarmAchievement {
  id: string;
  titleAr: string;
  description: string;
  rewardPoints: number;
  icon: string;
}

export const FARM_ACHIEVEMENTS: FarmAchievement[] = [
  { id: 'first_plant', titleAr: 'البذرة الأولى', description: 'زراعة أول محصول في مزرعتك الافتراضية', rewardPoints: 15, icon: '🌱' },
  { id: 'green_thumb', titleAr: 'راعي النخيل العُماني', description: 'زراعة نخيل الفرض والاعتناء به بنجاح', rewardPoints: 25, icon: '🌴' },
  { id: 'first_harvest', titleAr: 'بشائر الحصاد', description: 'إتمام أول عملية حصاد ناجحة في المزرعة', rewardPoints: 30, icon: '🌾' },
  { id: 'smart_greenhouse', titleAr: 'رائد البيوت المحمية', description: 'تشغيل وضبط البيت المحمي للخضراوات', rewardPoints: 25, icon: '🏡' },
  { id: 'pest_doctor', titleAr: 'الطبيب الوقائي', description: 'تشخيص ومعالجة آفة زراعية بشكل آمن', rewardPoints: 20, icon: '🛡️' },
  { id: 'dairy_master', titleAr: 'راعي الحظيرة العُمانية', description: 'إطعام وجمع إنتاج الأبقار والأغنام والدواجن', rewardPoints: 25, icon: '🐄' },
  { id: 'honey_keeper', titleAr: 'نحال العسل العُماني', description: 'رعاية المنحل وجني عسل السدر العُماني الطبيعي', rewardPoints: 30, icon: '🍯' },
  { id: 'market_merchant', titleAr: 'تاجر سوق عُمان', description: 'بيع منتجات المزرعة في السوق الموسمي بنجاح', rewardPoints: 25, icon: '🏪' },
  { id: 'oman_competitor', titleAr: 'نجم المزارعين', description: 'تجاوز 200 نقطة معتمدة في المنافسات', rewardPoints: 40, icon: '🏆' },
];

export type LivestockKind = 'cows' | 'goats' | 'chickens' | 'bees';

export interface LivestockDef {
  id: LivestockKind;
  nameAr: string;
  productId: 'milk' | 'goat_cheese' | 'eggs' | 'honey';
  productNameAr: string;
  icon: string;
  baseSellPrice: number;
  harvestPoints: number;
  cooldownSec: number;
  description: string;
}

export const FARM_LIVESTOCK_DEFS: LivestockDef[] = [
  {
    id: 'cows',
    nameAr: 'الأبقار العُمانية الحلوب',
    productId: 'milk',
    productNameAr: 'حليب طازج',
    icon: '🐄',
    baseSellPrice: 55,
    harvestPoints: 18,
    cooldownSec: 45,
    description: 'تنتج الحليب العُماني الطازج عند إطعامها بالبرسيم (القت).',
  },
  {
    id: 'goats',
    nameAr: 'الأغنام والماعز الجبلي',
    productId: 'goat_cheese',
    productNameAr: 'ألبان وجبن عُماني',
    icon: '🐐',
    baseSellPrice: 48,
    harvestPoints: 15,
    cooldownSec: 40,
    description: 'تتغذى على الأعلاف وتنتج ألباناً وأجباناً محلية مطلوبة في السوق.',
  },
  {
    id: 'chickens',
    nameAr: 'الدواجن العُمانية البلدي',
    productId: 'eggs',
    productNameAr: 'سلة بيض بلدي',
    icon: '🐓',
    baseSellPrice: 36,
    harvestPoints: 12,
    cooldownSec: 30,
    description: 'تنتج البيض البلدي الطازج بسرعة مع انتظام التغذية.',
  },
  {
    id: 'bees',
    nameAr: 'منحل العسل العُماني',
    productId: 'honey',
    productNameAr: 'عسل سدر عُماني',
    icon: '🐝',
    baseSellPrice: 85,
    harvestPoints: 24,
    cooldownSec: 55,
    description: 'يساعد في تلقيح أشجار المزرعة وينتج عسل السدر والسمر الفاخر.',
  },
];

export type BuildingKind = 'wellPump' | 'barnStorage' | 'beehiveApiary' | 'livestockShelter';

export interface FarmBuildingDef {
  id: BuildingKind;
  nameAr: string;
  icon: string;
  maxLevel: number;
  baseCostCoins: number;
  benefitText: string;
}

export const FARM_BUILDING_DEFS: FarmBuildingDef[] = [
  {
    id: 'wellPump',
    nameAr: 'مضخة وخزان الفلج',
    icon: '💧',
    maxLevel: 4,
    baseCostCoins: 110,
    benefitText: '+100 لتر سعة خزان وتعبئة تلقائية إضافية مع كل يوم زراعي',
  },
  {
    id: 'barnStorage',
    nameAr: 'مخزن الغلال العُماني',
    icon: '🏚️',
    maxLevel: 4,
    baseCostCoins: 100,
    benefitText: 'يرفع سعة التخزين ويزيد سعر بيع السوق بنسبة +12% لكل مستوى',
  },
  {
    id: 'beehiveApiary',
    nameAr: 'منحل عسل السدر',
    icon: '🍯',
    maxLevel: 4,
    baseCostCoins: 130,
    benefitText: 'يضاعف إنتاج العسل العُماني ويسرّع التلقيح في البستان',
  },
  {
    id: 'livestockShelter',
    nameAr: 'حظيرة الماشية والدواجن',
    icon: '🐄',
    maxLevel: 4,
    baseCostCoins: 120,
    benefitText: 'يرفع صحة القطيع ويزيد كمية الحليب والأجبان والبيض البلدي',
  },
];

export interface FarmQuestTemplate {
  id: string;
  titleAr: string;
  actionKey: 'irrigate' | 'harvest' | 'livestock_collect' | 'market_sell' | 'falaj_or_day';
  target: number;
  rewardCoins: number;
  rewardPoints: number;
  rewardWater: number;
}

export const FARM_QUEST_TEMPLATES: FarmQuestTemplate[] = [
  {
    id: 'q_irrigate',
    titleAr: 'اسقِ المحاصيل بالماء المتوازن (مرتين)',
    actionKey: 'irrigate',
    target: 2,
    rewardCoins: 45,
    rewardPoints: 20,
    rewardWater: 40,
  },
  {
    id: 'q_livestock',
    titleAr: 'اجمع إنتاج الحظيرة والمنحل الطازج',
    actionKey: 'livestock_collect',
    target: 2,
    rewardCoins: 60,
    rewardPoints: 25,
    rewardWater: 30,
  },
  {
    id: 'q_market',
    titleAr: 'بِع منتجاً في سوق المزرعة العُماني',
    actionKey: 'market_sell',
    target: 1,
    rewardCoins: 55,
    rewardPoints: 22,
    rewardWater: 25,
  },
  {
    id: 'q_harvest',
    titleAr: 'احصد محصولاً ناضجاً من الحقل أو البيت المحمي',
    actionKey: 'harvest',
    target: 1,
    rewardCoins: 70,
    rewardPoints: 30,
    rewardWater: 40,
  },
];

