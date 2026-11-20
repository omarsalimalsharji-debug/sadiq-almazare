/**
 * Murshid AI — citrus nutrition differential triage (v0.1).
 *
 * This is an explainable rule-based screening aid, not a trained image model,
 * laboratory diagnosis, fertilizer prescription, or validated probability.
 * It deliberately returns ranked candidates and an uncertainty band.
 */

export type MurshidPlantAgeClass = 'young' | 'mature' | 'both' | 'unknown';
export type MurshidSymptomPattern =
  | 'uniform_yellowing'
  | 'interveinal_yellowing'
  | 'green_veins_yellow_blade'
  | 'small_narrow_leaves'
  | 'marginal_scorch'
  | 'bronzing'
  | 'rosetting'
  | 'stunted_growth'
  | 'poor_root_growth'
  | 'fruit_drop_or_gumming'
  | 'unknown';

export type MurshidSeverity = 'mild' | 'moderate' | 'severe' | 'undetermined';
export type MurshidLikelihood = 'low' | 'possible' | 'more_likely' | 'needs_confirmation';

export interface MurshidNutritionObservation {
  crop: 'citrus' | 'nursery_seedling' | 'other';
  affectedPlantPercent?: number; // estimated share of plants/trees affected, 0..100
  affectedCanopyPercent?: number; // estimated share of canopy affected, 0..100
  leafAge: MurshidPlantAgeClass;
  patterns: MurshidSymptomPattern[];
  irrigationWaterSalty?: boolean;
  soilKnownCalcareousOrHighPH?: boolean;
  recentWaterlogging?: boolean;
  recentFertilizerChange?: boolean;
  pestsVisible?: boolean;
  rootDamageVisible?: boolean;
}

export interface MurshidNutrientCandidate {
  nutrient: string;
  symbol: string;
  likelihood: MurshidLikelihood;
  score: number;
  matchingClues: string[];
  conflictingOrMissingClues: string[];
  severity: MurshidSeverity;
  confirmation: string[];
  caution: string;
}

interface NutrientRule {
  nutrient: string;
  symbol: string;
  age: MurshidPlantAgeClass[];
  patterns: MurshidSymptomPattern[];
  context?: keyof Pick<MurshidNutritionObservation,
    'irrigationWaterSalty' | 'soilKnownCalcareousOrHighPH' | 'recentWaterlogging'>;
  explanation: string;
  confirmation: string[];
}

const RULES: NutrientRule[] = [
  { nutrient: 'الحديد', symbol: 'Fe', age: ['young', 'both'], patterns: ['interveinal_yellowing', 'green_veins_yellow_blade', 'stunted_growth'], context: 'soilKnownCalcareousOrHighPH', explanation: 'يظهر غالباً على النموات الحديثة؛ تبقى العروق أكثر اخضراراً من النصل، وقد يرتبط ارتفاع pH بانخفاض إتاحته.', confirmation: ['تحليل العناصر في الأوراق الحديثة وفق بروتوكول المختبر', 'قياس pH وEC للتربة ومياه الري', 'فحص الجذور والصرف قبل إضافة الحديد'] },
  { nutrient: 'الزنك', symbol: 'Zn', age: ['young', 'both'], patterns: ['small_narrow_leaves', 'interveinal_yellowing', 'rosetting', 'stunted_growth'], context: 'soilKnownCalcareousOrHighPH', explanation: 'صغر الأوراق وضيقها وقصر السلاميات والتبرعم المتزاحم قرائن مهمة، وقد يتداخل مع نقص المنغنيز والحديد.', confirmation: ['تحليل أوراق للعناصر الصغرى', 'قياس pH وEC', 'مراجعة تاريخ إضافة الفوسفور'] },
  { nutrient: 'المنغنيز', symbol: 'Mn', age: ['young', 'both'], patterns: ['interveinal_yellowing', 'green_veins_yellow_blade', 'bronzing'], context: 'soilKnownCalcareousOrHighPH', explanation: 'قد يظهر كتَبقّع أو اصفرار بين العروق مع بقاء شبكة العروق خضراء؛ يتشابه مع نقص الزنك والحديد.', confirmation: ['تحليل أوراق للعناصر الصغرى', 'قياس pH وEC', 'إعادة فحص النموات الجديدة مع الزمن'] },
  { nutrient: 'النيتروجين', symbol: 'N', age: ['mature', 'both'], patterns: ['uniform_yellowing', 'stunted_growth'], explanation: 'الاصفرار العام الذي يبدأ بالأوراق الأقدم مع ضعف النمو قد يتفق مع نقص النيتروجين، لكنه غير نوعي.', confirmation: ['تحليل أوراق وتربة', 'مراجعة برنامج التسميد وحمل الثمار', 'استبعاد اختناق الجذور والملوحة'] },
  { nutrient: 'المغنيسيوم', symbol: 'Mg', age: ['mature', 'both'], patterns: ['interveinal_yellowing', 'green_veins_yellow_blade', 'bronzing'], explanation: 'يظهر غالباً على الأوراق الأقدم؛ قد يبقى جزء أخضر قرب قاعدة الورقة بشكل مثلث، وقد يتطور إلى اصفرار برونزي.', confirmation: ['تحليل أوراق للمغنيسيوم والبوتاسيوم', 'فحص توازن K:Mg وملوحة مياه الري'] },
  { nutrient: 'الفوسفور', symbol: 'P', age: ['mature', 'both'], patterns: ['bronzing', 'stunted_growth'], explanation: 'ضعف النمو أو اللون الأخضر الداكن/البرونزي قد يظهر في حالات النقص الشديد، لكن النقص البصري أقل وضوحاً في الحمضيات ويحتاج تحليلاً.', confirmation: ['تحليل تربة وأوراق للفوسفور', 'مراجعة pH وتثبيت الفوسفور في التربة الكلسية'] },\n  { nutrient: 'البوتاسيوم', symbol: 'K', age: ['mature', 'both'], patterns: ['marginal_scorch', 'stunted_growth'], explanation: 'احتراق أو اصفرار حواف الأوراق القديمة قد يتفق معه، لكن الملوحة والكلوريد وضرر الحرارة قد تعطي صورة مشابهة.', confirmation: ['تحليل أوراق وتربة للبوتاسيوم', 'تحليل ماء الري للكلوريد والصوديوم وEC'] },
  { nutrient: 'البورون', symbol: 'B', age: ['young', 'both'], patterns: ['small_narrow_leaves', 'stunted_growth', 'poor_root_growth', 'fruit_drop_or_gumming'], explanation: 'قد يرتبط بتشوه النموات وضعف القمم النامية وتساقط الثمار أو التفلّن؛ مجال الفرق بين النقص والسمية ضيق.', confirmation: ['تحليل أوراق وماء الري للبورون', 'عدم إضافة البورون قبل نتيجة تحليل موثوقة'] },
  { nutrient: 'الكالسيوم', symbol: 'Ca', age: ['young', 'both'], patterns: ['poor_root_growth', 'stunted_growth'], explanation: 'قد يتأثر نمو القمم والجذور الحديثة؛ يجب تقييم الرطوبة والملوحة وصحة الجذور قبل ترجيح نقص الكالسيوم.', confirmation: ['تحليل ماء الري والتربة والأوراق', 'فحص الجذور وانتظام الري'] },
  { nutrient: 'الكبريت', symbol: 'S', age: ['young', 'both'], patterns: ['uniform_yellowing', 'stunted_growth'], explanation: 'قد يشبه نقص النيتروجين لكن يظهر على النموات الحديثة أيضاً؛ لا يمكن فصله بصرياً بثقة.', confirmation: ['تحليل أوراق وتربة للكبريت والنيتروجين'] },
  { nutrient: 'النحاس', symbol: 'Cu', age: ['young', 'both'], patterns: ['stunted_growth', 'rosetting'], explanation: 'تشوه النموات وموت أطراف الأفرع أو ظهور جيوب صمغية قد تكون له أسباب متعددة؛ لا يعتمد على الصورة وحدها.', confirmation: ['تحليل أوراق وتربة للنحاس', 'فحص الأفرع واستبعاد الأمراض الوعائية'] }
];

function severityFromExtent(obs: MurshidNutritionObservation): MurshidSeverity {
  const extent = Math.max(obs.affectedPlantPercent ?? 0, obs.affectedCanopyPercent ?? 0);
  if (extent === 0) return 'undetermined';
  if (extent < 15) return 'mild';
  if (extent < 40) return 'moderate';
  return 'severe';
}

function likelihoodFromScore(score: number): MurshidLikelihood {
  if (score >= 5) return 'more_likely';
  if (score >= 3) return 'possible';
  return 'low';
}

/**
 * Scores only agreement with supplied field observations.
 * Score is NOT a probability or model confidence.
 */
export function rankMurshidCitrusNutritionCandidates(
  observation: MurshidNutritionObservation
): MurshidNutrientCandidate[] {
  const severity = severityFromExtent(observation);
  return RULES.map((rule) => {
    let score = 0;
    const matchingClues: string[] = [];
    const conflictingOrMissingClues: string[] = [];

    if (rule.age.includes(observation.leafAge)) {
      score += 2;
      matchingClues.push('عمر الأوراق المصابة يتفق مع النمط المعروف');
    } else if (observation.leafAge !== 'unknown') {
      conflictingOrMissingClues.push('عمر الأوراق لا يطابق النمط المعتاد تماماً');
    }

    for (const pattern of rule.patterns) {
      if (observation.patterns.includes(pattern)) {
        score += 2;
        matchingClues.push('وجود علامة: ' + pattern);
      }
    }

    if (rule.context && observation[rule.context]) {
      score += 1;
      matchingClues.push(rule.context === 'soilKnownCalcareousOrHighPH'
        ? 'التربة كلسية أو مرتفعة pH؛ قد تقل إتاحة بعض العناصر الصغرى'
        : rule.context === 'irrigationWaterSalty'
          ? 'مياه الري مالحة؛ يجب فحص الملوحة والأيونات'
          : 'سبق حدوث تغدق؛ قد تتضرر الجذور وتتغير إتاحة العناصر');
    }

    if (observation.irrigationWaterSalty) {
      conflictingOrMissingClues.push('الملوحة احتمال بديل أو عامل مشارك، وليست دليلاً على نقص عنصر');
    }
    if (observation.recentWaterlogging) {
      conflictingOrMissingClues.push('اختناق الجذور أو سوء الصرف قد يقلد أعراض النقص');
    }
    if (observation.pestsVisible) {
      conflictingOrMissingClues.push('وجود آفات يستلزم تشخيصاً موازياً ولا يثبت نقصاً غذائياً');
    }
    if (observation.rootDamageVisible) {
      conflictingOrMissingClues.push('تلف الجذور قد يمنع الامتصاص حتى مع توفر العناصر');
    }
    if (observation.recentFertilizerChange) {
      conflictingOrMissingClues.push('راجع توقيت وتركيز التسميد واحتمال الملوحة أو السمية');
    }

    return {
      nutrient: rule.nutrient,
      symbol: rule.symbol,
      likelihood: likelihoodFromScore(score),
      score,
      matchingClues,
      conflictingOrMissingClues,
      severity,
      confirmation: rule.confirmation,
      caution: rule.explanation
    };
  }).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
