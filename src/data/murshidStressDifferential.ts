/**
 * Murshid AI — explainable field differential engine (v0.2).
 *
 * Oman-oriented triage for citrus and nursery plants. This is a transparent
 * rules engine, not a trained vision model, lab result, or calibrated probability.
 * It must never generate pesticide or fertilizer rates.
 */

export type MurshidStressPattern =
  | 'leaf_tip_burn'
  | 'marginal_burn'
  | 'interveinal_chlorosis'
  | 'uniform_chlorosis'
  | 'sun_facing_patch'
  | 'water_soaked_lesion'
  | 'wilting'
  | 'stunting'
  | 'root_browning'
  | 'root_soft_rot'
  | 'white_salt_crust'
  | 'distorted_new_growth'
  | 'visible_insects'
  | 'fungal_like_growth'
  | 'unknown';

export type MurshidStressSeverity = 'mild' | 'moderate' | 'severe' | 'undetermined';
export type MurshidStressLikelihood = 'low' | 'possible' | 'more_likely';

export interface MurshidStressObservation {
  crop: 'citrus' | 'date_palm' | 'nursery_seedling' | 'other';
  patterns: MurshidStressPattern[];
  leafAge?: 'young' | 'old' | 'both' | 'unknown';
  irrigationWaterSalty?: boolean;
  measuredWaterEcDsM?: number;
  measuredSoilEcDsM?: number;
  measuredBoronMgL?: number;
  measuredChlorideMgL?: number;
  waterEcAboveCropGuideline?: boolean;
  soilEcAboveCropGuideline?: boolean;
  boronAboveCropGuideline?: boolean;
  chlorideAboveCropGuideline?: boolean;
  soilCalcareousOrHighPh?: boolean;
  soilCurrentlyWet?: boolean;
  soilCurrentlyDry?: boolean;
  drainagePoor?: boolean;
  recentFertilizerApplication?: boolean;
  recentHeatOrStrongSun?: boolean;
  pestOrDiseaseSigns?: boolean;
  affectedPlantPercent?: number;
  affectedLeafAreaPercent?: number;
  symptomIntensity?: 1 | 2 | 3;
  growthImpact?: 0 | 1 | 2 | 3;
  progression?: 'stable' | 'worsening' | 'rapid' | 'unknown';
}

export interface MurshidStressCandidate {
  causeId: string;
  nameAr: string;
  likelihood: MurshidStressLikelihood;
  score: number;
  supportingClues: string[];
  alternativeOrMissingEvidence: string[];
  confirmation: string[];
  safeNextSteps: string[];
}

export interface MurshidStressAssessment {
  severity: MurshidStressSeverity;
  severityRationale: string[];
  urgentFieldReview: boolean;
  candidates: MurshidStressCandidate[];
  limitations: string[];
}

interface CauseRule {
  causeId: string;
  nameAr: string;
  evidence: Array<{
    weight: number;
    test: (o: MurshidStressObservation) => boolean;
    clue: string;
  }>;
  confirmation: string[];
  safeNextSteps: string[];
}

const has = (o: MurshidStressObservation, ...p: MurshidStressPattern[]) =>
  p.some((pattern) => o.patterns.includes(pattern));

const RULES: CauseRule[] = [
  {
    causeId: 'salinity',
    nameAr: 'ارتفاع ملوحة التربة أو مياه الري',
    evidence: [
      { weight: 3, test: (o) => o.irrigationWaterSalty === true, clue: 'ذُكرت ملوحة مياه الري' },
      { weight: 4, test: (o) => o.waterEcAboveCropGuideline === true || o.soilEcAboveCropGuideline === true, clue: 'قراءة EC تجاوزت المرجع الإرشادي المناسب لهذا المحصول وطريقة القياس' },
      { weight: 2, test: (o) => has(o, 'leaf_tip_burn', 'marginal_burn'), clue: 'احتراق أطراف أو حواف الأوراق قد يظهر مع تراكم الأملاح' },
      { weight: 1, test: (o) => o.affectedPlantPercent !== undefined && o.affectedPlantPercent > 30, clue: 'انتشار الأعراض على نسبة كبيرة من النباتات' }
    ],
    confirmation: ['قياس EC لمياه الري والتربة بطريقة مخبرية موحدة', 'تحليل الصوديوم والكلوريد ونسبة امتزاز الصوديوم عند الحاجة', 'مراجعة جودة مياه المصدر وتوزيع الري'],
    safeNextSteps: ['لا تضف سماداً إضافياً قبل فهم الملوحة', 'سجّل مصدر المياه وتواتر الري ونتائج التحليل', 'اطلب تقييماً للصرف قبل التفكير في الغسيل الملحي']
  },
  {
    causeId: 'chloride_toxicity',
    nameAr: 'احتمال سمّية الكلوريد',
    evidence: [
      { weight: 4, test: (o) => o.chlorideAboveCropGuideline === true, clue: 'قراءة الكلوريد تجاوزت المرجع الإرشادي المناسب للمحصول' },
      { weight: 2, test: (o) => o.leafAge === 'old' && has(o, 'leaf_tip_burn', 'marginal_burn'), clue: 'احتراق أطراف أو حواف الأوراق الأقدم' },
      { weight: 2, test: (o) => o.irrigationWaterSalty === true, clue: 'مياه الري موصوفة بأنها مالحة' }
    ],
    confirmation: ['تحليل الكلوريد في مياه الري', 'تحليل أنسجة الأوراق عند توفر مختبر مناسب', 'استبعاد الملوحة العامة والجفاف وضرر الحرارة'],
    safeNextSteps: ['لا تعتبر احتراق الحواف دليلاً كافياً على الكلوريد', 'استخدم نتائج تحليل الماء والأوراق معاً']
  },
  {
    causeId: 'boron_toxicity',
    nameAr: 'احتمال سمّية البورون',
    evidence: [
      { weight: 5, test: (o) => o.boronAboveCropGuideline === true, clue: 'قراءة البورون تجاوزت المرجع الإرشادي المناسب للمحصول' },
      { weight: 2, test: (o) => o.leafAge === 'old' && has(o, 'leaf_tip_burn', 'marginal_burn'), clue: 'احتراق أطراف أو حواف الأوراق الأقدم قد يتوافق مع تراكم البورون' }
    ],
    confirmation: ['تحليل البورون في مياه الري', 'تحليل أوراق مع تفسير النتيجة حسب المحصول والعمر الورقي', 'مراجعة الأسمدة ومصادر المياه'],
    safeNextSteps: ['لا تضف البورون ولا تحاول معادلة المشكلة عشوائياً', 'تحقق من مصدر المياه قبل أي تعديل']
  },
  {
    causeId: 'fertilizer_burn',
    nameAr: 'ضرر ملوحة موضعي أو احتراق مرتبط بالتسميد',
    evidence: [
      { weight: 4, test: (o) => o.recentFertilizerApplication === true, clue: 'حدثت إضافة سماد حديثة قبل ظهور الأعراض' },
      { weight: 2, test: (o) => has(o, 'leaf_tip_burn', 'marginal_burn', 'wilting'), clue: 'احتراق حواف أو ذبول بعد معاملة تسميد' }
    ],
    confirmation: ['مراجعة اسم المنتج وتركيزه وتاريخ وطريقة الإضافة', 'قياس EC حول منطقة الجذور ومياه الري', 'فحص توزيع السماد وملامسته للجذور'],
    safeNextSteps: ['أوقف الإضافات غير الضرورية مؤقتاً حتى تتضح الحالة', 'لا تنفذ غسيلاً للتربة إلا بعد تقييم الصرف وجودة الماء']
  },
  {
    causeId: 'waterlogging',
    nameAr: 'تشبع التربة بالماء وضعف تهوية الجذور',
    evidence: [
      { weight: 4, test: (o) => o.soilCurrentlyWet === true, clue: 'التربة ما زالت مشبعة أو شديدة البلل' },
      { weight: 3, test: (o) => o.drainagePoor === true, clue: 'الصرف ضعيف أو توجد مياه راكدة' },
      { weight: 2, test: (o) => has(o, 'wilting', 'stunting', 'root_browning'), clue: 'ذبول أو ضعف نمو أو اسمرار بالجذور رغم البلل' }
    ],
    confirmation: ['فحص رطوبة منطقة الجذور وعمق البلل', 'فحص الجذور للون والرائحة وتماسك الأنسجة', 'مراجعة فتحات الصرف وجدول الري'],
    safeNextSteps: ['تحقق من انسداد المصارف وتجمع الماء', 'لا تزد الري لمجرد رؤية الذبول']
  },
  {
    causeId: 'root_rot',
    nameAr: 'اشتباه عفن أو تلف مرضي بالجذور',
    evidence: [
      { weight: 4, test: (o) => has(o, 'root_soft_rot'), clue: 'الجذور لينة أو متحللة عند الفحص' },
      { weight: 2, test: (o) => has(o, 'root_browning'), clue: 'اسمرار بالجذور؛ يحتاج تمييزاً بين المرض والاختناق' },
      { weight: 2, test: (o) => o.drainagePoor === true || o.soilCurrentlyWet === true, clue: 'بيئة رطبة أو صرف ضعيف قد يزيدان خطر أعفان الجذور' },
      { weight: 1, test: (o) => has(o, 'wilting', 'stunting'), clue: 'ذبول أو توقف نمو' }
    ],
    confirmation: ['فحص جذور وعينة من منطقة الانتقال بين النسيج السليم والمتضرر', 'تشخيص مختبري للمسبب عند الحاجة', 'تقييم الصرف وملوحة الماء بالتوازي'],
    safeNextSteps: ['اعزل الشتلات شديدة الاشتباه عن بقية المشتل عند الإمكان', 'نظّف أدوات الفحص بين النباتات', 'لا تستخدم مبيداً فطرياً قبل تحديد المسبب']
  },
  {
    causeId: 'heat_sun',
    nameAr: 'إجهاد حراري أو لفحة شمس',
    evidence: [
      { weight: 4, test: (o) => o.recentHeatOrStrongSun === true, clue: 'سبقت الأعراض موجة حرارة أو تعرض شمسي قوي' },
      { weight: 3, test: (o) => has(o, 'sun_facing_patch'), clue: 'الضرر يتركز على الجهة المعرضة للشمس' },
      { weight: 1, test: (o) => has(o, 'leaf_tip_burn', 'wilting'), clue: 'احتراق أطراف أو ذبول قد يصاحبان الإجهاد الحراري' }
    ],
    confirmation: ['مقارنة الجهة المعرضة للشمس بالجهة المظللة', 'مراجعة توقيت ظهور الأعراض ودرجات الحرارة', 'فحص انتظام الري دون الإفراط فيه'],
    safeNextSteps: ['وفّر تظليلاً تدريجياً للشتلات الحساسة عند الحاجة', 'حافظ على رطوبة منتظمة دون إغراق الجذور']
  },
  {
    causeId: 'drought',
    nameAr: 'نقص الري أو عدم انتظام وصول الماء',
    evidence: [
      { weight: 4, test: (o) => o.soilCurrentlyDry === true, clue: 'منطقة الجذور جافة وقت الفحص' },
      { weight: 2, test: (o) => has(o, 'wilting', 'leaf_tip_burn'), clue: 'ذبول أو احتراق أطراف قد يظهر مع العطش' },
      { weight: 1, test: (o) => o.progression === 'worsening' || o.progression === 'rapid', clue: 'الأعراض تتقدم مع الوقت' }
    ],
    confirmation: ['فحص رطوبة التربة على عمق الجذور لا على السطح فقط', 'مراجعة انتظام النقاطات وتصريفها', 'مراجعة دورات الري والطقس وحجم الأصيص'],
    safeNextSteps: ['تحقق من وصول الماء إلى كامل منطقة الجذور', 'تجنب الانتقال المفاجئ من الجفاف إلى الإغراق']
  },
  {
    causeId: 'high_ph_lockout',
    nameAr: 'احتمال انخفاض إتاحة العناصر بسبب ارتفاع pH أو التربة الكلسية',
    evidence: [
      { weight: 3, test: (o) => o.soilCalcareousOrHighPh === true, clue: 'التربة كلسية أو مرتفعة pH بحسب المعلومات المدخلة' },
      { weight: 3, test: (o) => o.leafAge === 'young' && has(o, 'interveinal_chlorosis'), clue: 'اصفرار بين العروق في الأوراق الحديثة' },
      { weight: 1, test: (o) => o.crop === 'citrus' || o.crop === 'nursery_seedling', clue: 'المحصول من الحمضيات أو الشتلات الحساسة لتغير إتاحة العناصر' }
    ],
    confirmation: ['قياس pH وEC للتربة ومياه الري', 'تحليل أوراق حديثة للعناصر الصغرى', 'فحص الجذور والصرف قبل تفسير الاصفرار كنقص عنصر'],
    safeNextSteps: ['لا تختَر عنصراً أو جرعة من لون الورقة وحده', 'اجمع عينة تربة وماء وأوراق بطريقة صحيحة للتحليل']
  },
  {
    causeId: 'pest_or_disease',
    nameAr: 'آفة أو مرض نباتي يحتاج فحصاً مستقلاً',
    evidence: [
      { weight: 4, test: (o) => o.pestOrDiseaseSigns === true, clue: 'أُبلغ عن وجود علامات آفة أو مرض' },
      { weight: 3, test: (o) => has(o, 'visible_insects', 'fungal_like_growth', 'water_soaked_lesion'), clue: 'توجد حشرات ظاهرة أو نموات/بقع مرضية محتملة' },
      { weight: 1, test: (o) => o.progression === 'rapid', clue: 'تدهور سريع يستدعي فحصاً ميدانياً' }
    ],
    confirmation: ['تصوير الآفة أو البقعة عن قرب مع صورة كاملة للنبات', 'فحص السطح السفلي للأوراق والساق والجذور', 'تأكيد المسبب لدى مختص أو مختبر عند الحاجة'],
    safeNextSteps: ['اعزل النبات المشتبه به في المشتل إن أمكن', 'لا ترش مبيداً اعتماداً على عرض عام فقط']
  }
];

function validateObservation(o: MurshidStressObservation): void {
  const percentages = [o.affectedPlantPercent, o.affectedLeafAreaPercent].filter((v) => v !== undefined) as number[];
  if (percentages.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
    throw new RangeError('نسب الإصابة يجب أن تكون أرقاماً بين 0 و100');
  }
  for (const [name, value] of [['EC الماء', o.measuredWaterEcDsM], ['EC التربة', o.measuredSoilEcDsM], ['البورون', o.measuredBoronMgL], ['الكلوريد', o.measuredChlorideMgL]] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new RangeError('قيمة ' + name + ' يجب أن تكون رقماً غير سالب');
    }
  }
}

function assessSeverity(o: MurshidStressObservation): { severity: MurshidStressSeverity; rationale: string[] } {
  let points = 0;
  const rationale: string[] = [];
  const extent = Math.max(o.affectedPlantPercent ?? 0, o.affectedLeafAreaPercent ?? 0);
  if (o.affectedPlantPercent !== undefined || o.affectedLeafAreaPercent !== undefined) {
    if (extent >= 50) { points += 3; rationale.push('انتشار واسع للأعراض (50% أو أكثر وفق تقدير المستخدم)'); }
    else if (extent >= 20) { points += 2; rationale.push('انتشار متوسط للأعراض (20–49%)'); }
    else if (extent > 0) { points += 1; rationale.push('انتشار محدود للأعراض (أقل من 20%)'); }
  }
  if (o.symptomIntensity !== undefined) {
    points += o.symptomIntensity;
    rationale.push('شدة العلامات المرئية: ' + o.symptomIntensity + ' من 3');
  }
  if (o.growthImpact !== undefined) {
    points += o.growthImpact;
    if (o.growthImpact >= 2) rationale.push('يوجد تأثير ملحوظ في النمو أو حيوية النبات');
  }
  if (o.progression === 'rapid') { points += 3; rationale.push('تدهور سريع خلال فترة قصيرة'); }
  else if (o.progression === 'worsening') { points += 1; rationale.push('الأعراض تتفاقم'); }
  if (points === 0) return { severity: 'undetermined', rationale: ['المعلومات غير كافية لتقدير الشدة؛ يلزم تحديد الانتشار وشدة العلامات وتأثيرها'] };
  return { severity: points >= 7 ? 'severe' : points >= 4 ? 'moderate' : 'mild', rationale };
}

/**
 * Returns ranked differential causes. Scores are heuristic evidence weights,
 * never percentages, probabilities, or model confidence.
 */
export function assessMurshidPlantStress(o: MurshidStressObservation): MurshidStressAssessment {
  validateObservation(o);
  const severity = assessSeverity(o);
  const candidates = RULES.map((rule): MurshidStressCandidate | null => {
    const supportingClues: string[] = [];
    let score = 0;
    for (const evidence of rule.evidence) {
      if (evidence.test(o)) {
        score += evidence.weight;
        supportingClues.push(evidence.clue);
      }
    }
    if (score === 0) return null;
    const alternativeOrMissingEvidence: string[] = [];
    if (o.irrigationWaterSalty && rule.causeId !== 'salinity' && rule.causeId !== 'chloride_toxicity') {
      alternativeOrMissingEvidence.push('الملوحة قد تكون سبباً مشابهاً أو عاملاً مشاركاً');
    }
    if (o.soilCurrentlyWet && rule.causeId !== 'waterlogging' && rule.causeId !== 'root_rot') {
      alternativeOrMissingEvidence.push('زيادة الرطوبة أو اختناق الجذور احتمال بديل');
    }
    if (o.recentHeatOrStrongSun && rule.causeId !== 'heat_sun') {
      alternativeOrMissingEvidence.push('الحرارة أو اللفحة الشمسية قد تقلدان بعض الأعراض');
    }
    return {
      causeId: rule.causeId,
      nameAr: rule.nameAr,
      likelihood: score >= 6 ? 'more_likely' : score >= 3 ? 'possible' : 'low',
      score,
      supportingClues,
      alternativeOrMissingEvidence,
      confirmation: rule.confirmation,
      safeNextSteps: rule.safeNextSteps
    };
  }).filter((candidate): candidate is MurshidStressCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const urgentFieldReview = severity.severity === 'severe' ||
    o.progression === 'rapid' ||
    has(o, 'root_soft_rot') ||
    (has(o, 'wilting') && o.affectedPlantPercent !== undefined && o.affectedPlantPercent >= 40);

  return {
    severity: severity.severity,
    severityRationale: severity.rationale,
    urgentFieldReview,
    candidates,
    limitations: [
      'هذه نتيجة فرز تفريقي إرشادية وليست تشخيصاً مخبرياً أو نموذج رؤية مدرّباً.',
      'الأوزان ترتيبية وليست نسب ثقة أو احتمالات إحصائية.',
      'تفسير EC والكلوريد والبورون يعتمد على وحدة القياس وطريقة أخذ العينة والمحصول ومرحلة النمو.',
      'لا تُستخدم النتيجة وحدها لاختيار مبيد أو سماد أو تحديد جرعة.'
    ]
  };
}
