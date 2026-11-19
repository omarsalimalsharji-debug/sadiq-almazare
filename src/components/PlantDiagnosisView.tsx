import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Scan,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Bug,
  Leaf,
  Droplets,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  PhoneCall,
  ShieldCheck,
  Sprout,
  Info,
  Sun,
  Focus,
  FlaskConical,
  Square,
  Share2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  OMAN_ADMINISTRATIVE_DATA,
} from '../data/omanLocationsData.ts';
import { useLocation } from '../context/LocationContext.tsx';
import {
  compressAndEnhancePlantImage,
  ProcessedPlantImage,
} from '../utils/imageProcessor.ts';
import {
  playCaptureSound,
  playDiagnosisSuccessSound,
  playSoftNoticeSound,
} from '../utils/soundEffects.ts';
import { MurshidCharacterSvg } from './MurshidCharacterSvg.tsx';
import { speakMurshid, stopAllMurshidAudio } from '../utils/murshidAudio.ts';
import { useShare } from '../context/ShareContext.tsx';

type ProblemType = 'مرض' | 'حشرة' | 'نقص عناصر' | 'سليم';
type SeverityLevel = 'منخفضة' | 'متوسطة' | 'عالية';

interface PesticideRecommendation {
  needed: boolean;
  productAr: string;
  productEn: string;
  dosage: string;
  safetyNote: string;
}

interface InsectDetails {
  nature: 'beneficial' | 'harmful' | 'neutral' | 'none';
  sex?: 'male' | 'female' | 'undetermined';
  sexEvidence?: string;
  lifeStage?: string;
  lifeStageLabel?: string;
  lifeStageEvidence?: string;
  instar?: string;
  stageConfidence?: number;
  generation?: string;
  generationEvidence?: string;
  targetCrops: string[];
  damage: string;
  lifeCycle: string;
  controlMethod: string;
  prevention: string;
}

export interface SmartDiagnosisResult {
  isAgricultureRelated?: boolean;
  detectedSubject?: 'plant' | 'insect' | 'unclear';
  diagnosisCategory?: string;
  problemType: ProblemType;
  cropName: string;
  problemName: string;
  problemNameEn?: string;
  scientificName?: string;
  confidenceScore: number;
  needsClearerPhoto: boolean;
  clarificationMessage?: string;
  conditionSummary?: string;
  visibleSymptomsList?: string[];
  visibleSymptoms: string;
  causes: string[];
  severity: SeverityLevel | 'حرجة';
  severityLabel?: string;
  treatmentSteps?: string[];
  organicRemedy: string;
  preventionTips: string[];
  pesticideRecommendation?: PesticideRecommendation;
  chemicalRemedy: string;
  whenToContactEngineer?: string;
  omaniFarmingNote?: string;
  advisoryNote: string;
  possibleConditions: string[];
  insectDetails?: InsectDetails | null;
  photoParts?: string[];
}

interface PlantDiagnosisViewProps {
  initialFocus?: 'auto' | 'insect';
}

const SOUND_PREF_KEY = 'sadiq_diagnosis_sound_enabled';

const MANDATORY_ADVISORY_TEXT =
  'التشخيص عبر الصورة تقديري استرشادي ولا يغني عن الفحص الميداني لدى المهندس الزراعي أو دوائر التنمية الزراعية في الحالات الملتبسة أو الشديدة.';

const ANALYSIS_STAGES = [
  'جاري فحص الصورة والتحقق من الوضوح...',
  'تحليل الأعراض والعلامات الحيوية...',
  'مقارنة العلامات الزراعية وتوصيات سلطنة عُمان...',
];

const OMANI_CROP_GROUPS = [
  'تحديد تلقائي من الصورة',
  'أشجار النخيل',
  'الخضروات (طماطم، خيار، فلفل...)',
  'أشجار الفاكهة (ليمون، مانجو، رمان...)',
  'المحاصيل الحقلية (قمح، شعير، ذرة...)',
  'الأعلاف (القت / البرسيم)',
  'نباتات الزينة',
  'المحاصيل الموسمية',
];

export const PlantDiagnosisView: React.FC<PlantDiagnosisViewProps> = ({
  initialFocus = 'auto',
}) => {
  const { location } = useLocation();
  const { openShare } = useShare();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const additionalGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const lastAnalyzedSignatureRef = useRef<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<ProcessedPlantImage | null>(null);
  const [additionalImages, setAdditionalImages] = useState<ProcessedPlantImage[]>([]);
  const [processingPhoto, setProcessingPhoto] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Optional context (collapsed by default for dead-simple single-photo flow)
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);
  const [cropName, setCropName] = useState<string>('تحديد تلقائي من الصورة');
  const [overrideGovId, setOverrideGovId] = useState<string>('');
  const [overrideWilayatId, setOverrideWilayatId] = useState<string>('');
  const [overrideVillage, setOverrideVillage] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  const overrideGovObj = overrideGovId
    ? OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === overrideGovId) || null
    : null;
  const overrideWilayatObj = overrideGovObj
    ? overrideGovObj.wilayats.find((w) => w.id === overrideWilayatId) || overrideGovObj.wilayats[0]
    : null;

  const effectiveGovernorate = overrideGovObj?.name || location.governorate;
  const effectiveWilayat = overrideWilayatObj?.name || location.wilayat;
  const effectiveVillage =
    (overrideGovObj ? overrideVillage || overrideWilayatObj?.villages[0] : location.village) ||
    effectiveWilayat;
  const effectiveAgroZone = overrideWilayatObj?.agroZone || location.agroZone;
  const effectiveLocationLabel = `${effectiveGovernorate} · ولاية ${effectiveWilayat} · ${effectiveVillage}`;

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Diagnosis state
  const [loading, setLoading] = useState<boolean>(false);
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [result, setResult] = useState<SmartDiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScientificDetails, setShowScientificDetails] = useState<boolean>(false);
  const [murshidSpeaking, setMurshidSpeaking] = useState<boolean>(false);

  useEffect(() => {
    try { localStorage.removeItem('sadiq_diagnosis_history_v1'); } catch { /* storage may be disabled */ }
    return () => stopAllMurshidAudio();
  }, []);

  // Cycle multi-stage analysis messages smoothly while analyzing
  useEffect(() => {
    if (!loading) {
      setStageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStageIndex((prev) => (prev + 1) % ANALYSIS_STAGES.length);
    }, 1700);
    return () => window.clearInterval(timer);
  }, [loading]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREF_KEY, String(next));
      } catch {
        // Ignore storage error
      }
      if (!next) {
        stopAllMurshidAudio(setMurshidSpeaking);
      } else {
        playCaptureSound(true);
      }
      return next;
    });
  };

  const handleSelectedFile = async (file: File | undefined | null) => {
    if (!file) return;
    setProcessingPhoto(true);
    setError(null);

    try {
      const processed = await compressAndEnhancePlantImage(file);
      playCaptureSound(soundEnabled);
      setSelectedImage(processed);
      setAdditionalImages([]);
      setResult(null);
      setShowScientificDetails(false);
      lastAnalyzedSignatureRef.current = null;
    } catch (err: any) {
      playSoftNoticeSound(soundEnabled);
      setError(err?.message || 'تعذر قراءة أو معالجة الصورة المختارة.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleSelectedFile(file);
  };

  const handleAdditionalInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 2 - additionalImages.length));
    e.target.value = '';
    if (!files.length) return;
    setProcessingPhoto(true);
    setError(null);
    try {
      const processed = await Promise.all(files.map((file) => compressAndEnhancePlantImage(file)));
      setAdditionalImages((previous) => [...previous, ...processed].slice(0, 2));
      setResult(null);
      setShowScientificDetails(false);
      lastAnalyzedSignatureRef.current = null;
    } catch (err: any) {
      setError(err?.message || 'تعذر معالجة الصور الإضافية.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleSelectedFile(file);
  };

  const handleResetPhoto = () => {
    stopAllMurshidAudio(setMurshidSpeaking);
    setSelectedImage(null);
    setAdditionalImages([]);
    setResult(null);
    setError(null);

    setShowScientificDetails(false);
    lastAnalyzedSignatureRef.current = null;
  };

  const handleAnalyze = async () => {
    if (loading || processingPhoto) return;
    setError(null);

    if (!selectedImage) {
      setError('يرجى التقاط صورة أو اختيار صورة واحدة واضحة للنبات أو الحشرة أولاً.');
      playSoftNoticeSound(soundEnabled);
      return;
    }

    const effectiveCrop = cropName === 'تحديد تلقائي من الصورة' ? '' : cropName;
    const signature = `${selectedImage.fingerprint}|${additionalImages.map((image) => image.fingerprint).join(',')}|${effectiveCrop}|${effectiveGovernorate}|${effectiveWilayat}|${effectiveVillage}|${observations.trim()}`;

    // Prevent redundant identical submissions if a result is already visible
    if (lastAnalyzedSignatureRef.current === signature && result) {
      return;
    }

    setLoading(true);
    setResult(null);
    setShowScientificDetails(false);

    try {
      const response = await fetch('/api/diagnose/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [
            { label: 'الصورة الأساسية', base64: selectedImage.dataUrl },
            ...additionalImages.map((image, index) => ({ label: `زاوية إضافية ${index + 1}`, base64: image.dataUrl })),
          ],
          cropName: effectiveCrop,
          governorate: effectiveGovernorate,
          wilayat: effectiveWilayat,
          village: effectiveVillage,
          agroZone: effectiveAgroZone,
          observations: observations.trim(),
          modeHint: initialFocus,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.diagnosis) {
        throw new Error(data.error || 'تعذر إتمام التحليل الذكي حالياً.');
      }

      const diag: SmartDiagnosisResult = data.diagnosis;
      lastAnalyzedSignatureRef.current = signature;
      setResult(diag);
      if (diag.needsClearerPhoto) {
        playSoftNoticeSound(soundEnabled);
      } else {
        playDiagnosisSuccessSound(soundEnabled);
      }

    } catch (err: any) {
      playSoftNoticeSound(soundEnabled);
      const message = String(
        err?.message ||
        'حدث خطأ في الاتصال بمحرك التشخيص الذكي. تأكد من استقرار الإنترنت وحاول ثانية.'
      );
      const temporaryServiceIssue = /503|مشغولة|مؤقتاً|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(message);
      setError(
        temporaryServiceIssue
          ? `${message} الصورة ما زالت محددة؛ أعد المحاولة دون الحاجة إلى التقاطها أو رفعها من جديد.`
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTheme = (diag: SmartDiagnosisResult) => {
    const isBeneficial =
      diag.diagnosisCategory === 'حشرة نافعة' || diag.insectDetails?.nature === 'beneficial';
    const isHealthy = diag.diagnosisCategory === 'نبات سليم' || diag.problemType === 'سليم';
    const isInsect =
      diag.detectedSubject === 'insect' || diag.problemType === 'حشرة';
    const isNutrientOrStress =
      diag.diagnosisCategory === 'نقص عناصر' ||
      diag.diagnosisCategory === 'إجهاد بيئي' ||
      diag.problemType === 'نقص عناصر';

    if (isBeneficial) {
      return {
        label: 'حشرة نافعة صديقة للبيئة',
        badgeCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        borderCls: 'border-emerald-500/40',
        icon: <Sprout className="w-4 h-4 text-emerald-500" />,
      };
    }
    if (isHealthy) {
      return {
        label: 'نبات سليم',
        badgeCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        borderCls: 'border-emerald-500/35',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      };
    }
    if (isInsect) {
      return {
        label: diag.diagnosisCategory || 'آفة حشرية',
        badgeCls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        borderCls: 'border-rose-500/35',
        icon: <Bug className="w-4 h-4 text-rose-500" />,
      };
    }
    if (isNutrientOrStress) {
      return {
        label: diag.diagnosisCategory || 'نقص عناصر / إجهاد بيئي',
        badgeCls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        borderCls: 'border-amber-500/35',
        icon: <Droplets className="w-4 h-4 text-amber-500" />,
      };
    }
    return {
      label: diag.diagnosisCategory || 'مرض نباتي',
      badgeCls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      borderCls: 'border-sky-500/35',
      icon: <HeartPulse className="w-4 h-4 text-sky-500" />,
    };
  };

  const getSeverityBadgeCls = (diag: SmartDiagnosisResult) => {
    if (diag.insectDetails?.nature === 'beneficial') {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    }
    switch (diag.severity) {
      case 'منخفضة':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'متوسطة':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'عالية':
      case 'حرجة':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-8 space-y-5">
      {/* Hidden native inputs for Camera (environment) and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputFileChange}
        className="hidden"
        aria-label="تصوير بالكاميرا الآن"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleInputFileChange}
        className="hidden"
        aria-label="اختيار صورة من المعرض"
      />
      <input
        ref={additionalGalleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={handleAdditionalInputFileChange}
        className="hidden"
        aria-label="إضافة صور تفصيلية من زوايا مختلفة"
      />

      {/* Compact, Clean Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <Scan className="w-3.5 h-3.5" />
            <span>
              {initialFocus === 'insect'
                ? 'التشخيص الذكي للحشرات الزراعية'
                : 'مختبر تشخيص أمراض ومشكلات النبات — سلطنة عُمان'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {initialFocus === 'insect'
              ? 'تشخيص الحشرات الزراعية'
              : 'تشخيص أمراض ومشكلات النباتات'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/80">
            {initialFocus === 'insect'
              ? 'ارفع صورة واضحة للحشرة، ويمكنك إضافة صورتين مقرّبتين من الأعلى والجانب لتمييز النوع والمرحلة والجنس عند ظهور العلامات.'
              : 'ارفع صورة واضحة للنبات أو الجزء المصاب، ويمكنك إضافة صور للوجهين العلوي والسفلي أو قاعدة النبات لزيادة دقة المقارنة.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={!selectedImage || additionalImages.length >= 2 || processingPhoto}
            onClick={() => additionalGalleryInputRef.current?.click()}
            className="min-h-[40px] px-3 rounded-xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold disabled:opacity-40"
            title="أضف حتى صورتين من زوايا مختلفة"
          >
            + صور تفصيلية
          </button>
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
            className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-sky-300/20 bg-white/80 dark:bg-[#132247]/80 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'الصوت مفعّل' : 'صامت'}</span>
          </button>


        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-950/35 p-4 flex items-start gap-3 text-rose-800 dark:text-rose-200"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">{error}</div>
          </motion.div>
        )}
      </AnimatePresence>

        {additionalImages.length > 0 && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-800 dark:text-emerald-200">
            تمت إضافة {additionalImages.length} صورة تفصيلية؛ سيحللها النظام مع الصورة الأساسية في طلب واحد.
          </div>
        )}
      {/* Main Capture / Preview Hero Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-3xl overflow-hidden transition-all border ${
          isDragging
            ? 'border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-500/10'
            : 'border-slate-200 dark:border-sky-300/15 bg-white/90 dark:bg-[#132247]/90 shadow-xl shadow-slate-950/5 dark:shadow-black/40'
        }`}
      >
        {!selectedImage ? (
          /* STATE 1: Hero One-Photo Capture Area */
          <div className="p-5 sm:p-8 flex flex-col items-center text-center space-y-6">
            <div className="relative w-full max-w-md py-6 px-4 rounded-2xl border-2 border-dashed border-emerald-500/35 dark:border-emerald-400/30 bg-gradient-to-b from-emerald-500/[0.06] to-transparent flex flex-col items-center justify-center space-y-4">
              {/* Viewfinder corner accents */}
              <span className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-md" />
              <span className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-md" />
              <span className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-md" />
              <span className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-md" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-[#0b1329] shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                {processingPhoto ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : initialFocus === 'insect' ? (
                  <Bug className="w-8 h-8" />
                ) : (
                  <Leaf className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {processingPhoto
                    ? 'جاري تجهيز الصورة وتحسين الإضاءة...'
                    : 'التقط أو ارفع صورة واضحة'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300/80 leading-relaxed">
                  {initialFocus === 'insect'
                    ? 'صوّر الحشرة من قرب مع إظهار جسمها وأجنحتها وأرجلها قدر الإمكان، دون اهتزاز.'
                    : 'صوّر الورقة أو الجزء المصاب من قرب، مع إظهار الأعراض بوضوح ودون اهتزاز.'}
                </p>
              </div>

              {/* Quick unobtrusive visual tips */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[11px] text-slate-500 dark:text-slate-300/70">
                <span className="inline-flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  إضاءة طبيعية
                </span>
                <span className="inline-flex items-center gap-1">
                  <Focus className="w-3.5 h-3.5 text-emerald-500" />
                  صورة مركّزة غير مهزوزة
                </span>
              </div>
            </div>

            {/* Two Primary Tactile Buttons (Mobile-First) */}
            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={processingPhoto}
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[54px] px-5 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-[#0b1329] font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>تصوير الآن</span>
              </button>

              <button
                type="button"
                disabled={processingPhoto}
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[54px] px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-sky-300/25 bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1329]/80 dark:hover:bg-[#0b1329] active:scale-[0.99] text-slate-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <span>اختيار صورة من المعرض</span>
              </button>
            </div>
          </div>
        ) : (
          /* STATE 2 & 3: Image Preview + Animated Multi-Stage Analysis */
          <div className="p-4 sm:p-6 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/60 dark:border-sky-300/20">
              <img
                src={selectedImage.dataUrl}
                alt="معاينة الصورة المحددة للتشخيص"
                className="w-full max-h-[340px] object-contain mx-auto"
              />

              {/* Resolution badge */}
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[11px] font-medium text-slate-200">
                {selectedImage.width}×{selectedImage.height} · {selectedImage.compressedKB} KB
              </div>

              {/* Animated Scanning Overlay during Loading */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0b1329]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4"
                  >
                    {/* Animated scanning beam */}
                    <motion.div
                      animate={{ y: ['-110px', '110px', '-110px'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-4/5 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_16px_rgba(52,211,153,0.9)]"
                    />

                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-emerald-400" />
                    </div>

                    <div className="space-y-2 max-w-xs">
                      <motion.p
                        key={stageIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-sm sm:text-base font-extrabold text-white"
                      >
                        {ANALYSIS_STAGES[stageIndex]}
                      </motion.p>
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        {ANALYSIS_STAGES.map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === stageIndex
                                ? 'w-7 bg-emerald-400'
                                : idx < stageIndex
                                  ? 'w-3 bg-emerald-500/60'
                                  : 'w-3 bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Preview Actions: Start Analysis + Replace Photo */}
            {!loading && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="flex-1 min-h-[52px] px-6 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-[#0b1329] font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{result ? 'إعادة فحص الصورة' : 'بدء التحليل الذكي'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 sm:flex-none min-h-[52px] px-4 py-3 rounded-2xl border border-slate-300 dark:border-sky-300/25 bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1329]/80 dark:hover:bg-[#0b1329] text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>استبدال بكاميرا</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 sm:flex-none min-h-[52px] px-4 py-3 rounded-2xl border border-slate-300 dark:border-sky-300/25 bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1329]/80 dark:hover:bg-[#0b1329] text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    <span>من المعرض</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional Collapsible Context Bar (Unobtrusive & Closed by Default) */}
        <div className="border-t border-slate-200/70 dark:border-sky-300/15 bg-slate-50/70 dark:bg-[#0b1329]/55 px-4 sm:px-6 py-3">
          <button
            type="button"
            onClick={() => setShowOptionalDetails((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-start">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                تفاصيل اختيارية ({effectiveGovernorate} · ولاية {effectiveWilayat})
              </span>
            </span>
            {showOptionalDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {showOptionalDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      نوع المحصول (اختياري)
                    </label>
                    <select
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      {OMANI_CROP_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      المحافظة (افتراضي: موقعك المحدد)
                    </label>
                    <select
                      value={overrideGovId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setOverrideGovId(nextId);
                        const govMatch = OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === nextId);
                        const firstWil = govMatch?.wilayats[0];
                        setOverrideWilayatId(firstWil?.id || '');
                        setOverrideVillage(firstWil?.villages[0] || '');
                      }}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">
                        موقعك الحالي ({location.governorate} ← {location.wilayat})
                      </option>
                      {OMAN_ADMINISTRATIVE_DATA.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {gov.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {overrideGovObj && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          الولاية:
                        </label>
                        <select
                          value={overrideWilayatObj?.id || ''}
                          onChange={(e) => {
                            const wId = e.target.value;
                            setOverrideWilayatId(wId);
                            const w = overrideGovObj.wilayats.find((x) => x.id === wId);
                            setOverrideVillage(w?.villages[0] || '');
                          }}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        >
                          {overrideGovObj.wilayats.map((w) => (
                            <option key={w.id} value={w.id}>
                              ولاية {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          القرية / المنطقة:
                        </label>
                        <select
                          value={overrideVillage}
                          onChange={(e) => setOverrideVillage(e.target.value)}
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        >
                          {(overrideWilayatObj?.villages || []).map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      ملاحظة سريعة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="مثال: اصفرار بدأ منذ أسبوع أو حشرة صغيرة أسفل الورقة..."
                      maxLength={300}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#132247] border border-slate-200 dark:border-sky-300/20 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* STATE 4: Structured Diagnosis Result Card */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.problemName + result.confidenceScore}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {result.needsClearerPhoto ? (
              /* Honest Unclear / Non-Agri Photo Card (Zero Fabricated Diagnosis) */
              <div className="rounded-3xl border border-amber-400/50 bg-amber-50/90 dark:bg-amber-950/30 p-5 sm:p-6 space-y-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <MurshidCharacterSvg expression="surprised" className="w-16 h-18 shrink-0" />
                  <div className="space-y-1">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {result.problemName}
                    </h2>
                    {result.problemNameEn && (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                        {result.problemNameEn}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-amber-100 leading-relaxed">
                  {result.clarificationMessage ||
                    'لم نتمكن من تأكيد الحالة بدقة من هذه الصورة. حرصاً على سلامة محصولك، نرجو التقاط صورة أوضح بدلاً من إعطاء تشخيص غير مؤكد.'}
                </p>

                <div className="rounded-2xl bg-white/75 dark:bg-[#0b1329]/70 border border-amber-300/40 dark:border-amber-500/25 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                  <div className="font-bold text-slate-900 dark:text-white">
                    إرشادات لصورة واضحة:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>اقترب من الورقة المصابة أو الحشرة حتى تملأ الإطار بوضوح.</li>
                    <li>صوّر في ضوء النهار الطبيعي وتجنب الظلال القوية أو الاهتزاز.</li>
                    <li>ضع خلفية بسيطة خلف الورقة إذا أمكن لتسهيل قراءة اللون والبقع.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0b1329] text-xs font-extrabold flex items-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>التقاط صورة أوضح</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPhoto}
                    className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    إلغاء الصورة
                  </button>
                </div>
              </div>
            ) : (
              /* Verified Structured Summary + Collapsible Scientific Card */
              (() => {
                const theme = getCategoryTheme(result);
                const isInsect =
                  result.detectedSubject === 'insect' || result.problemType === 'حشرة';
                const isBeneficialInsect = result.insectDetails?.nature === 'beneficial';

                return (
                  <div
                    className={`rounded-3xl border ${theme.borderCls} bg-white/95 dark:bg-[#132247]/95 p-5 sm:p-6 space-y-5 shadow-xl shadow-slate-950/5 dark:shadow-black/40`}
                  >
                    {/* Murshid Diagnosis Companion Banner */}
                    <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#0b1329]/80 border border-emerald-200/70 dark:border-sky-300/15 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <MurshidCharacterSvg
                          expression={
                            result.problemType === 'سليم' || isBeneficialInsect
                              ? 'celebrate'
                              : result.severity === 'عالية' || result.severity === 'حرجة'
                                ? 'surprised'
                                : 'explain'
                          }
                          className="w-14 h-16 shrink-0"
                        />
                        <div className="min-w-0 text-xs">
                          <div className="font-bold text-emerald-700 dark:text-emerald-300">
                            تعليق مُرشد على الفحص
                          </div>
                          <p className="text-stone-700 dark:text-slate-200 leading-relaxed line-clamp-2">
                            {result.problemName} — {result.conditionSummary || result.visibleSymptoms}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (murshidSpeaking) {
                              stopAllMurshidAudio(setMurshidSpeaking);
                              return;
                            }
                            const firstTreatment =
                              (result.treatmentSteps && result.treatmentSteps[0]) ||
                              result.organicRemedy ||
                              '';
                            const speechSummary = [
                              `${result.problemName}.`,
                              result.conditionSummary || result.visibleSymptoms,
                              firstTreatment ? `خطوة العلاج الموصى بها: ${firstTreatment}` : '',
                            ]
                              .filter(Boolean)
                              .join(' ');
                            speakMurshid(speechSummary, {
                              mood:
                                result.severity === 'عالية' || result.severity === 'حرجة'
                                  ? 'warning'
                                  : 'cheerful',
                              onSpeakingChange: setMurshidSpeaking,
                              onEnd: () => setMurshidSpeaking(false),
                            });
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                        >
                          {murshidSpeaking ? (
                            <>
                              <Square className="w-4 h-4 fill-current" />
                              <span>إيقاف الصوت</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4" />
                              <span>ملخص بصوت مُرشد</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openShare({
                              kind: 'diagnosis',
                              title: `${result.problemName}${result.cropName ? ` — ${result.cropName}` : ''}`,
                              summary:
                                result.conditionSummary ||
                                result.visibleSymptoms ||
                                result.organicRemedy,
                              highlights: (result.treatmentSteps && result.treatmentSteps.length > 0
                                ? result.treatmentSteps
                                : [result.organicRemedy]
                              ).slice(0, 3),
                              categoryLabel: theme.label,
                              locationLabel: effectiveLocationLabel,
                              badgeMetric: `ثقة التقدير: ${result.confidenceScore}%`,
                              page: initialFocus === 'insect' ? 'pest_diagnosis' : 'plant_diagnosis',
                            })
                          }
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#132247] border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>مشاركة التشخيص</span>
                        </button>
                      </div>
                    </div>

                    {/* 1. Primary Header: Category + Arabic & English Names */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200/80 dark:border-sky-300/15 pb-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold ${theme.badgeCls}`}
                          >
                            {theme.icon}
                            <span>{theme.label}</span>
                          </span>
                          {result.cropName && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                              • {result.cropName}
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                          {result.problemName}
                        </h2>

                        {(result.problemNameEn || result.scientificName) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300/90" dir="ltr">
                            {result.problemNameEn && (
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {result.problemNameEn}
                              </span>
                            )}
                            {result.scientificName && (
                              <span className="italic text-slate-500 dark:text-slate-400">
                                ({result.scientificName})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Real Confidence + Severity */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 bg-slate-50 dark:bg-[#0b1329]/70 px-4 py-3 rounded-2xl border border-slate-200/70 dark:border-sky-300/15">
                        <div className="text-right sm:text-left">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                            مستوى الثقة في التشخيص المبدئي
                          </div>
                          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {result.confidenceScore}%
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getSeverityBadgeCls(
                            result
                          )}`}
                        >
                          الخطورة: {result.severityLabel || result.severity}
                        </span>
                      </div>
                    </div>

                    {/* 2. Beneficial Insect Reassurance Banner */}
                    {isBeneficialInsect && (
                      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                            حشرة نافعة — لا تقم بمكافحتها أو رشّها بالمبيدات
                          </div>
                          <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80 leading-relaxed">
                            هذه الحشرة صديقة للمزارع وتساهم طبيعياً في التلقيح أو افتراس الآفات الضارة بالمحصول.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 3. Summary Description (What appeared in the photo) */}
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                        وصف الحالة المرصودة
                      </h3>
                      <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                        {result.conditionSummary || result.visibleSymptoms}
                      </p>
                    </div>

                    {/* 4. Actionable Immediate Treatment / Action Steps */}
                    <div className="rounded-2xl bg-emerald-500/[0.07] dark:bg-[#0b1329]/75 border border-emerald-500/25 p-4 space-y-2.5">
                      <h3 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isBeneficialInsect
                            ? 'كيفية الحفاظ على الحشرة النافعة'
                            : 'العلاج والخطوات العملية المقترحة'}
                        </span>
                      </h3>
                      {result.treatmentSteps && result.treatmentSteps.length > 0 ? (
                        <ol className="space-y-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 list-decimal list-inside leading-relaxed">
                          {result.treatmentSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
                          {result.organicRemedy}
                        </p>
                      )}
                    </div>

                    {/* 5. When to Contact Agricultural Engineer */}
                    <div className="rounded-2xl bg-sky-500/[0.08] border border-sky-400/25 p-4 flex items-start gap-3">
                      <PhoneCall className="w-4 h-4 text-sky-500 shrink-0 mt-1" />
                      <div className="space-y-1">
                        <div className="text-xs font-extrabold text-sky-700 dark:text-sky-300">
                          متى يجب التواصل مع المهندس الزراعي؟
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          {result.whenToContactEngineer ||
                            'عند انتشار الأعراض إلى أكثر من 20% من المحصول، أو تغيّر لون الجذع والأوعية، أو عند الحاجة لاختيار مبيد متخصص.'}
                        </p>
                      </div>
                    </div>

                    {/* 6. Collapsible Scientific & Deep Details Toggle */}
                    <div className="border-t border-slate-200/80 dark:border-sky-300/15 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowScientificDetails((v) => !v)}
                        className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0b1329]/80 dark:hover:bg-[#0b1329] border border-slate-200 dark:border-sky-300/20 flex items-center justify-between text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white transition-colors"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-emerald-500" />
                          <span>
                            {showScientificDetails
                              ? 'إخفاء التفاصيل العلمية والوقاية والمبيدات'
                              : 'عرض التفاصيل العلمية الكاملة (الأعراض، الأسباب، الوقاية، المبيدات)'}
                          </span>
                        </span>
                        {showScientificDetails ? (
                          <ChevronUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>

                      <AnimatePresence>
                        {showScientificDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-4">
                              {/* Symptoms & Causes */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-slate-50 dark:bg-[#0b1329]/65 border border-slate-200/70 dark:border-sky-300/15 p-4 space-y-2">
                                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                                    الأعراض والعلامات الظاهرة
                                  </h4>
                                  {result.visibleSymptomsList && result.visibleSymptomsList.length > 0 ? (
                                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                                      {result.visibleSymptomsList.map((s, i) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                      {result.visibleSymptoms}
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-2xl bg-slate-50 dark:bg-[#0b1329]/65 border border-slate-200/70 dark:border-sky-300/15 p-4 space-y-2">
                                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                                    الأسباب المحتملة
                                  </h4>
                                  {result.causes && result.causes.length > 0 ? (
                                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                                      {result.causes.map((c, i) => (
                                        <li key={i}>{c}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                      عوامل بيئية أو حيوية مرتبطة بالرطوبة والتهوية وحالة المحصول.
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Insect-Specific Profile */}
                              {isInsect && result.insectDetails && (
                                <div className="rounded-2xl bg-slate-50 dark:bg-[#0b1329]/65 border border-slate-200/70 dark:border-sky-300/15 p-4 space-y-3">
                                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Bug className="w-4 h-4 text-emerald-500" />
                                    <span>التشخيص العلمي للحشرة</span>
                                  </h4>

                                  <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-400/20 bg-indigo-50/70 dark:bg-indigo-950/20 p-3 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className="font-extrabold text-slate-900 dark:text-white">تقدير جنس الحشرة:</span>
                                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                        {result.insectDetails.sex === 'male'
                                          ? 'ذكر'
                                          : result.insectDetails.sex === 'female'
                                            ? 'أنثى'
                                            : 'غير محدد من الصورة'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                      {result.insectDetails.sexEvidence ||
                                        'لا تظهر علامة تشريحية واضحة تسمح بتحديد الجنس بثقة.'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                      يُعرض التقدير عند وجود علامات مرئية موثوقة فقط؛ وقد يتعذر تحديد الجنس من صورة واحدة.
                                    </p>
                                  </div>

                                  <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-400/20 bg-emerald-50/70 dark:bg-emerald-950/20 p-3 space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                      <div><span className="font-bold text-slate-900 dark:text-white">مرحلة الحشرة: </span>{result.insectDetails.lifeStageLabel || 'غير محددة'}</div>
                                      <div><span className="font-bold text-slate-900 dark:text-white">عمر الحورية: </span>{result.insectDetails.instar || 'غير محدد'}</div>
                                      <div><span className="font-bold text-slate-900 dark:text-white">الجيل الموسمي: </span>{result.insectDetails.generation || 'غير محدد'}</div>
                                    </div>
                                    {result.insectDetails.lifeStageEvidence && <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{result.insectDetails.lifeStageEvidence}</p>}
                                    {result.insectDetails.generationEvidence && <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{result.insectDetails.generationEvidence}</p>}
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">ثقة تقدير المرحلة: {Number(result.insectDetails.stageConfidence || 0)}%. الجيل الموسمي تقدير مرتبط بتاريخ وموقع الرصد، وليس صفة يمكن إثباتها من صورة منفردة.</p>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                                    <div>
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {isBeneficialInsect ? 'الدور البيئي:' : 'المحاصيل المستهدفة:'}{' '}
                                      </span>
                                      {result.insectDetails.targetCrops.length > 0
                                        ? result.insectDetails.targetCrops.join('، ')
                                        : 'متنوعة حسب البيئة المحيطة'}
                                    </div>
                                    {result.insectDetails.damage && (
                                      <div>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                          الأضرار المسجلة:{' '}
                                        </span>
                                        {result.insectDetails.damage}
                                      </div>
                                    )}
                                  </div>

                                  {result.insectDetails.lifeCycle && (
                                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        دورة الحياة:{' '}
                                      </span>
                                      {result.insectDetails.lifeCycle}
                                    </div>
                                  )}

                                  {result.insectDetails.controlMethod && (
                                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        طريقة المكافحة المناسبة:{' '}
                                      </span>
                                      {result.insectDetails.controlMethod}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Prevention & Omani Climate Guidance */}
                              <div className="rounded-2xl bg-slate-50 dark:bg-[#0b1329]/65 border border-slate-200/70 dark:border-sky-300/15 p-4 space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                                  الوقاية والحد من الانتشار (توصيات سلطنة عُمان)
                                </h4>
                                {result.preventionTips && result.preventionTips.length > 0 && (
                                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                                    {result.preventionTips.map((tip, idx) => (
                                      <li key={idx}>{tip}</li>
                                    ))}
                                  </ul>
                                )}
                                {result.omaniFarmingNote && (
                                  <p className="text-xs text-emerald-700 dark:text-emerald-300 pt-1 leading-relaxed">
                                    ملاحظة مناخية عُمانية: {result.omaniFarmingNote}
                                  </p>
                                )}
                              </div>

                              {/* Pesticides Only When Needed + Oman 160/2023 Safety */}
                              <div className="rounded-2xl bg-slate-50 dark:bg-[#0b1329]/65 border border-slate-200/70 dark:border-sky-300/15 p-4 space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                                  <span>المبيدات المصرّح بها (عند الحاجة فقط)</span>
                                </h4>
                                {result.pesticideRecommendation?.needed ? (
                                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                                    <div>
                                      <span className="font-bold">المادة الفعالة / الخيار المسجل: </span>
                                      {result.pesticideRecommendation.productAr}
                                      {result.pesticideRecommendation.productEn
                                        ? ` (${result.pesticideRecommendation.productEn})`
                                        : ''}
                                    </div>
                                    {result.pesticideRecommendation.dosage && (
                                      <div>
                                        <span className="font-bold">الجرعة والملصق: </span>
                                        {result.pesticideRecommendation.dosage}
                                      </div>
                                    )}
                                    {result.pesticideRecommendation.safetyNote && (
                                      <div className="text-amber-700 dark:text-amber-300">
                                        {result.pesticideRecommendation.safetyNote}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {result.chemicalRemedy ||
                                      'لا يُنصح باستخدام أي مبيدات كيميائية لهذه الحالة.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 7. Mandatory Field Inspection Disclaimer + Cloud Save Status + New Scan */}
                    <div className="rounded-2xl bg-slate-100/80 dark:bg-[#0b1329]/70 border border-slate-200 dark:border-sky-300/15 p-3.5 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{result.advisoryNote || MANDATORY_ADVISORY_TEXT}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResetPhoto}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0b1329] text-xs font-extrabold flex items-center gap-2 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span>فحص صورة جديدة</span>
                      </button>

                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        لا يتم حفظ الصورة أو نتيجة التشخيص؛ تبقى ظاهرة مؤقتاً في هذه الجلسة فقط.
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
