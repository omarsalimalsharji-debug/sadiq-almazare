import React, { useEffect, useState } from 'react';
import {
  Scan,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  ShieldAlert,
  Sparkles,
  Info,
  Clock,
  Camera,
  Sun,
  Focus,
  Image as ImageIcon,
  Trash2,
  History,
  Bug,
  Droplets,
  HeartPulse,
  HelpCircle,
  LogIn,
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogleFarmer,
} from '../firebase.ts';
import {
  compressAndEnhancePlantImage,
  ProcessedPlantImage,
} from '../utils/imageProcessor.ts';

type PhotoSlotKey = 'leaf' | 'stem' | 'fruit';
type ProblemType = 'مرض' | 'حشرة' | 'نقص عناصر' | 'سليم';
type SeverityLevel = 'منخفضة' | 'متوسطة' | 'عالية' | 'حرجة';

interface DiagnosisResult {
  cropName: string;
  problemName: string;
  problemType: ProblemType;
  confidenceScore: number;
  needsClearerPhoto: boolean;
  clarificationMessage: string;
  possibleConditions: string[];
  visibleSymptoms: string;
  causes: string[];
  organicRemedy: string;
  chemicalRemedy: string;
  preventionTips: string[];
  severity: SeverityLevel;
  omaniFarmingNote: string;
  advisoryNote: string;
  photoParts?: string[];
}

interface SavedDiagnosisRecord extends DiagnosisResult {
  id: string;
  userId: string;
  wilayat: string;
  observations: string;
  photoParts: string[];
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

const MANDATORY_ADVISORY_TEXT =
  'التشخيص إرشادي، استشر مرشدًا زراعيًا للحالات الشديدة';

const PLANT_OPTIONS = [
  { id: 'نخيل التمر', label: 'نخيل التمر', hint: 'خلاص، فرض، خنيزي' },
  { id: 'طماطم', label: 'طماطم', hint: 'حقلي / بيوت محمية' },
  { id: 'خيار', label: 'خيار', hint: 'بيوت محمية / حقلي' },
  { id: 'قمح عماني', label: 'قمح', hint: 'ميسياني / كوليب' },
  { id: 'ليمون عماني', label: 'ليمون عُماني', hint: 'وحمضيات' },
  { id: 'مانجو', label: 'مانجو', hint: 'أشجار مثمرة' },
  { id: 'رمان', label: 'رمان', hint: 'الجبل الأخضر' },
  { id: 'بطيخ (حبحب)', label: 'بطيخ وشمام', hint: 'القرعيات' },
  { id: 'بصل وثوم', label: 'بصل وثوم', hint: 'بلدي عُماني' },
  { id: 'أعلاف وبرسيم', label: 'أعلاف (قت)', hint: 'برسيم وحشائش' },
];

const PHOTO_SLOTS: Array<{
  key: PhotoSlotKey;
  title: string;
  subtitle: string;
  badge: string;
}> = [
  {
    key: 'leaf',
    title: '1. صورة الورقة',
    subtitle: 'قرّب الكاميرا على البقع أو التغيرات في سطح الورقة أو أسفلها',
    badge: 'الورقة',
  },
  {
    key: 'stem',
    title: '2. صورة الساق',
    subtitle: 'صوّر الساق أو منطقة الجذع والتفرعات أو أي إفرازات صمغية',
    badge: 'الساق',
  },
  {
    key: 'fruit',
    title: '3. صورة الثمرة',
    subtitle: 'صوّر الثمرة أو الزهرة المصابة (أو صورة ثانية مقربة للإصابة)',
    badge: 'الثمرة',
  },
];

export const PlantDiagnosisView: React.FC = () => {
  const [cropName, setCropName] = useState<string>('طماطم');
  const [wilayat, setWilayat] = useState<string>('محافظة الداخلية - نزوى');
  const [observations, setObservations] = useState<string>('');
  const [slots, setSlots] = useState<Record<PhotoSlotKey, ProcessedPlantImage | null>>({
    leaf: null,
    stem: null,
    fruit: null,
  });
  const [processingSlot, setProcessingSlot] = useState<PhotoSlotKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Firebase Auth & History state
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [historyItems, setHistoryItems] = useState<SavedDiagnosisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [savingToCloud, setSavingToCloud] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<boolean>(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!fbUser || !fbUser.uid) {
      setHistoryItems([]);
      return;
    }

    setHistoryLoading(true);
    const colPath = `users/${fbUser.uid}/diagnoses`;
    const q = query(
      collection(db, 'users', fbUser.uid, 'diagnoses'),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    const unsubSnap = onSnapshot(
      q,
      (snapshot) => {
        const items: SavedDiagnosisRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<SavedDiagnosisRecord, 'id'>;
          items.push({ id: docSnap.id, ...data });
        });
        setHistoryItems(items);
        setHistoryLoading(false);
      },
      (err) => {
        setHistoryLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, colPath);
        } catch {
          // Logged by handleFirestoreError
        }
      }
    );

    return () => unsubSnap();
  }, [fbUser]);

  const uploadedPhotosList = (Object.keys(slots) as PhotoSlotKey[])
    .filter((key) => slots[key] !== null)
    .map((key) => ({
      part: key,
      base64: slots[key]!.dataUrl,
    }));

  const uploadedCount = uploadedPhotosList.length;

  const handleSlotUpload = async (
    slotKey: PhotoSlotKey,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProcessingSlot(slotKey);
    setError(null);
    try {
      const processed = await compressAndEnhancePlantImage(file);
      setSlots((prev) => ({ ...prev, [slotKey]: processed }));
    } catch (err: any) {
      setError(err?.message || 'تعذر معالجة الصورة المرفوعة.');
    } finally {
      setProcessingSlot(null);
    }
  };

  const removeSlotImage = (slotKey: PhotoSlotKey) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  const persistDiagnosisToFirebase = async (
    user: FirebaseUser,
    diag: DiagnosisResult,
    usedWilayat: string,
    usedObservations: string,
    photoParts: string[]
  ) => {
    if (!user.emailVerified) {
      setSaveMessage('يرجى التحقق من البريد الإلكتروني لحفظ التشخيص في السحابة.');
      return;
    }

    setSavingToCloud(true);
    setSaveMessage(null);
    const diagId = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userPath = `users/${user.uid}`;
    const diagPath = `users/${user.uid}/diagnoses/${diagId}`;

    try {
      // Ensure parent /users/{uid} exists before writing subcollection doc (enforced by firestore.rules)
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: (user.displayName || 'مزارع عُماني').slice(0, 80),
          governorate: usedWilayat.slice(0, 60) || 'محافظة الداخلية',
          role: 'farmer',
          level: 1,
          totalPoints: 0,
          isBanned: false,
          updatedAt: serverTimestamp(),
        });
      }

      const payload = {
        userId: user.uid,
        cropName: (diag.cropName || cropName).slice(0, 80),
        wilayat: (usedWilayat || 'سلطنة عُمان').slice(0, 100),
        observations: (usedObservations || '').slice(0, 1000),
        photoParts: photoParts.slice(0, 3),
        problemName: (diag.problemName || 'حالة نباتية').slice(0, 160),
        problemType: (['مرض', 'حشرة', 'نقص عناصر', 'سليم'].includes(diag.problemType)
          ? diag.problemType
          : 'مرض') as ProblemType,
        confidenceScore: Math.max(0, Math.min(100, Math.round(diag.confidenceScore || 50))),
        severity: (['منخفضة', 'متوسطة', 'عالية', 'حرجة'].includes(diag.severity)
          ? diag.severity
          : 'متوسطة') as SeverityLevel,
        needsClearerPhoto: Boolean(diag.needsClearerPhoto),
        visibleSymptoms: (diag.visibleSymptoms || '').slice(0, 1500),
        causes: (Array.isArray(diag.causes) ? diag.causes : [])
          .map((c) => String(c).slice(0, 300))
          .slice(0, 8),
        organicRemedy: (diag.organicRemedy || '').slice(0, 2000),
        chemicalRemedy: (diag.chemicalRemedy || '').slice(0, 2000),
        preventionTips: (Array.isArray(diag.preventionTips) ? diag.preventionTips : [])
          .map((t) => String(t).slice(0, 300))
          .slice(0, 8),
        possibleConditions: (Array.isArray(diag.possibleConditions) ? diag.possibleConditions : [])
          .map((p) => String(p).slice(0, 300))
          .slice(0, 4),
        advisoryNote: (diag.advisoryNote || MANDATORY_ADVISORY_TEXT).slice(0, 500),
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid, 'diagnoses', diagId), payload);
      setSaveMessage('تم حفظ التشخيص تلقائياً في سجل Firebase الخاص بك.');
    } catch (err) {
      setSaveMessage('تعذر الحفظ في السجل السحابي حالياً.');
      try {
        handleFirestoreError(err, OperationType.CREATE, diagPath.includes(user.uid) ? diagPath : userPath);
      } catch {
        // Logged by handleFirestoreError
      }
    } finally {
      setSavingToCloud(false);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setSaveMessage(null);

    if (uploadedCount === 0 && !observations.trim()) {
      setError('يرجى رفع 2 إلى 3 صور للنبات (ورقة، ساق، ثمرة) أو وصف ما تلاحظه من أعراض.');
      return;
    }

    if (uploadedCount === 1) {
      setError(
        'للحصول على تشخيص دقيق، يرجى إضافة صورة ثانية على الأقل (مثلاً صورة الساق أو الثمرة) لتكتمل 2 إلى 3 صور.'
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/diagnose/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedPhotosList,
          cropName,
          symptoms: observations.trim(),
          wilayat,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في تحليل الحالة المرضية');
      }

      const diag: DiagnosisResult = data.diagnosis;
      setResult(diag);

      if (fbUser && fbUser.uid) {
        await persistDiagnosisToFirebase(
          fbUser,
          diag,
          wilayat,
          observations.trim(),
          uploadedPhotosList.map((p) => p.part)
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          'حدث خطأ أثناء التواصل مع محرك التشخيص الذكي. يرجى المحاولة ثانية.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnectAndSave = async () => {
    setAuthBusy(true);
    setError(null);
    try {
      const signedInUser = await signInWithGoogleFarmer();
      if (signedInUser && result) {
        await persistDiagnosisToFirebase(
          signedInUser,
          result,
          wilayat,
          observations.trim(),
          result.photoParts || uploadedPhotosList.map((p) => p.part)
        );
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول بحساب Google.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleDeleteHistoryItem = async (diagId: string) => {
    if (!fbUser?.uid) return;
    const path = `users/${fbUser.uid}/diagnoses/${diagId}`;
    try {
      await deleteDoc(doc(db, 'users', fbUser.uid, 'diagnoses', diagId));
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, path);
      } catch {
        setError('تعذر حذف السجل من Firebase.');
      }
    }
  };

  const handleQuickSample = (crop: string, obs: string) => {
    setCropName(crop);
    setObservations(obs);
    setError(null);
  };

  const getSeverityBadgeStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'منخفضة':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'متوسطة':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'عالية':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800';
      case 'حرجة':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getProblemTypeBadge = (type: ProblemType) => {
    switch (type) {
      case 'حشرة':
        return {
          cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
          icon: <Bug className="w-3.5 h-3.5" />,
        };
      case 'نقص عناصر':
        return {
          cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          icon: <Droplets className="w-3.5 h-3.5" />,
        };
      case 'سليم':
        return {
          cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      default:
        return {
          cls: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
          icon: <HeartPulse className="w-3.5 h-3.5" />,
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Scan className="w-4 h-4" />
            <span>كاميرا الفحص النباتي المتطورة · Gemini Vision</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            تشخيص أمراض النباتات والحشرات بالذكاء الاصطناعي
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            اختر نوع النبات أولاً، ثم التقط 2 إلى 3 صور واضحة (الورقة، الساق، الثمرة) وصف ما تلاحظه للحصول على تشخيص دقيق وسجل محفوظ في Firebase.
          </p>
        </div>
      </div>

      {/* Mandatory Advisory Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-center gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-semibold">{MANDATORY_ADVISORY_TEXT}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3-Step Guided Capture Form */}
        <div className="lg:col-span-6 space-y-5">
          {/* STEP 1: Select Plant Type BEFORE Capture */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>اختر نوع النبات قبل التصوير</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                المحدد: {cropName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PLANT_OPTIONS.map((plant) => {
                const isSelected = cropName === plant.id;
                return (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => setCropName(plant.id)}
                    className={`p-2 rounded-xl border text-right transition-all ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{plant.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        isSelected ? 'text-emerald-100' : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      {plant.hint}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Wilayat Selector */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                المحافظة / الولاية في سلطنة عُمان:
              </label>
              <select
                value={wilayat}
                onChange={(e) => setWilayat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              >
                {OMANI_GOVERNORATES.map((gov) => (
                  <option
                    key={gov.id}
                    value={`${gov.name} - ${gov.wilayat.split('،')[0]}`}
                  >
                    {gov.name} ({gov.wilayat.split('،').slice(0, 3).join('، ')}...)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* STEP 2: 2 to 3 Photos (Leaf, Stem, Fruit) + Photography Guidelines */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>التقط أو ارفع 2 إلى 3 صور للنبات ({cropName})</span>
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                  uploadedCount >= 2
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                }`}
              >
                {uploadedCount} / 3 صور
              </span>
            </div>

            {/* Photography Guidelines Banner */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <span>إضاءة جيدة ونهارية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Focus className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تقريب واضح للإصابة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
                <span>خلفية واضحة ونظيفة</span>
              </div>
            </div>

            {/* 3 Photo Slots */}
            <div className="space-y-3">
              {PHOTO_SLOTS.map((slot) => {
                const imgData = slots[slot.key];
                const isProcessing = processingSlot === slot.key;

                return (
                  <div
                    key={slot.key}
                    className="rounded-xl border border-stone-200 dark:border-stone-700 p-3 bg-stone-50/60 dark:bg-stone-800/40"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-100">
                          {slot.title}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {slot.subtitle}
                        </p>
                      </div>
                      {imgData && (
                        <button
                          type="button"
                          onClick={() => removeSlotImage(slot.key)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>

                    {isProcessing ? (
                      <div className="py-5 flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>جاري ضغط الصورة وتحسين الإضاءة والوضوح...</span>
                      </div>
                    ) : imgData ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={imgData.dataUrl}
                          alt={slot.title}
                          className="w-24 h-20 object-cover rounded-lg border border-stone-200 dark:border-stone-700 shrink-0"
                        />
                        <div className="text-[11px] space-y-1 text-stone-600 dark:text-stone-300">
                          <div className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>جاهزة ومُحسّنة ({imgData.width}×{imgData.height})</span>
                          </div>
                          <div>
                            ضغط الحجم: {imgData.originalKB} KB ←{' '}
                            <strong className="text-stone-900 dark:text-white">
                              {imgData.compressedKB} KB
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="cursor-pointer flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-semibold transition-colors">
                          <Camera className="w-4 h-4" />
                          <span>تصوير بالكاميرا</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleSlotUpload(slot.key, e)}
                            className="hidden"
                          />
                        </label>
                        <label className="cursor-pointer flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>رفع صورة</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSlotUpload(slot.key, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: "ما الذي تلاحظه؟" + Submit */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>ما الذي تلاحظه؟</span>
            </h2>

            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="اكتب ملاحظاتك لرفع دقة التشخيص: مثال (اصفرار بين عروق الأوراق، ثقوب صغيرة في الثمار، حشرات بيضاء أسفل الورقة، أو ذبول عند الظهر...)"
              className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || processingSlot !== null}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-transform active:scale-99 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>جاري فحص الصور والملاحظات عبر Gemini Vision...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>بدء التشخيص الفوري للحالة</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick text presets */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
                نماذج وصف سريعة للتجربة المباشرة:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickSample(
                      'طماطم',
                      'بقع بيضاء دائرية تشبه مسحوق الطحين على الأوراق مع اصفرار طفيف'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
                >
                  طماطم: بياض دقيقي
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickSample(
                      'نخيل التمر',
                      'جفاف في السعف الأوسط وخروج إفرازات بنية صمغية قرب قاعدة الجذع مع نشارة خشب'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
                >
                  نخيل: سوسة / صمغ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickSample(
                      'خيار',
                      'اصفرار بين عروق الأوراق الحديثة العليا مع بقاء العروق خضراء'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
                >
                  خيار: نقص عناصر
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnosis Result + Firebase History */}
        <div className="lg:col-span-6 space-y-6">
          {result ? (
            <div
              className={`bg-white dark:bg-stone-900 rounded-2xl border p-5 sm:p-6 shadow-sm space-y-5 ${
                result.needsClearerPhoto || result.confidenceScore < 70
                  ? 'border-amber-300 dark:border-amber-700'
                  : 'border-emerald-200 dark:border-emerald-800/80'
              }`}
            >
              {/* Low Confidence (< 70%) or Unclear Image Branch */}
              {result.needsClearerPhoto || result.confidenceScore < 70 ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 inline-flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>الصورة غير حاسمة (الثقة {result.confidenceScore}%)</span>
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getSeverityBadgeStyle(
                            result.severity
                          )}`}
                        >
                          الخطورة المحتملة: {result.severity}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                        يرجى التقاط صور أوضح قبل اعتماد التشخيص النهائي
                      </h2>
                      <div className="text-xs text-stone-500">
                        النبات: {result.cropName} · الموقع: {wilayat}
                      </div>
                    </div>
                  </div>

                  {/* Request clearer photo message */}
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 leading-relaxed space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>لماذا نطلب صورة أوضح؟</span>
                    </div>
                    <p>{result.clarificationMessage}</p>
                  </div>

                  {/* 2 to 3 Suggested Possibilities */}
                  <div>
                    <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                      أقرب 2 إلى 3 احتمالات بناءً على المعطيات الحالية:
                    </h3>
                    <div className="space-y-2">
                      {result.possibleConditions.map((cond, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 flex items-start gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{cond}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Provisional safety note */}
                  <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-700 dark:text-stone-300">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      ملاحظة ميدانية:
                    </span>{' '}
                    {result.omaniFarmingNote}
                  </div>
                </div>
              ) : (
                /* Confident (>= 70%) Diagnosis Report */
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const badge = getProblemTypeBadge(result.problemType);
                          return (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${badge.cls}`}
                            >
                              {badge.icon}
                              <span>النوع: {result.problemType}</span>
                            </span>
                          );
                        })()}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getSeverityBadgeStyle(
                            result.severity
                          )}`}
                        >
                          الخطورة: {result.severity}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          نسبة الثقة: {result.confidenceScore}%
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                        {result.problemName}
                      </h2>
                      <div className="text-xs text-stone-500">
                        النبات: {result.cropName} · الموقع: {wilayat}
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Visible Symptoms */}
                  <div>
                    <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الأعراض الظاهرة:</span>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                      {result.visibleSymptoms}
                    </p>
                  </div>

                  {/* Causes */}
                  {Array.isArray(result.causes) && result.causes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                        الأسباب:
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
                        {result.causes.map((c, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-lg border border-stone-200/60 dark:border-stone-700/60"
                          >
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Organic & Chemical Treatments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                        <Leaf className="w-4 h-4 text-emerald-600" />
                        <span>العلاج العضوي والحيوي:</span>
                      </h3>
                      <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                        {result.organicRemedy}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>العلاج الكيميائي وفترة الأمان:</span>
                      </h3>
                      <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                        {result.chemicalRemedy}
                      </p>
                    </div>
                  </div>

                  {/* Prevention */}
                  {Array.isArray(result.preventionTips) && result.preventionTips.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                        الوقاية:
                      </h3>
                      <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
                        {result.preventionTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Omani Farming Note */}
                  {result.omaniFarmingNote && (
                    <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                        إرشاد خاص بالبيئة العُمانية:
                      </div>
                      {result.omaniFarmingNote}
                    </div>
                  )}
                </div>
              )}

              {/* Advisory Notice at Footer of Result + Cloud Save Status */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{result.advisoryNote || MANDATORY_ADVISORY_TEXT}</span>
                </div>
                {savingToCloud && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    جاري حفظ النتيجة في Firebase...
                  </div>
                )}
                {saveMessage && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {saveMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-stone-400">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-4">
                <Scan className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                في انتظار صور النبات وملاحظاتك
              </h3>
              <p className="text-xs max-w-sm mt-1">
                اختر نوع النبات، ثم ارفع 2 إلى 3 صور واضحة (الورقة، الساق، الثمرة) واكتب ما تلاحظه ليبدأ التشخيص العلمي الدقيق.
              </p>
            </div>
          )}

          {/* Firebase Diagnosis History Log */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <span>سجل التشخيصات المحفوظ في Firebase</span>
              </h2>
              {fbUser && (
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {historyItems.length} سجل محفوظ
                </span>
              )}
            </div>

            {!fbUser ? (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3 text-center">
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  سجّل الدخول بحساب Google لحفظ جميع تشخيصات مزرعتك تلقائياً في قاعدة بيانات Firebase والرجوع إليها في أي وقت.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleConnectAndSave}
                  disabled={authBusy}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {authBusy
                      ? 'جاري الاتصال بحساب Google...'
                      : 'ربط حساب Google وحفظ السجل'}
                  </span>
                </button>
              </div>
            ) : historyLoading ? (
              <div className="py-6 text-center text-xs text-stone-400">
                جاري تحميل سجل التشخيصات من Firebase...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                لا توجد تشخيصات محفوظة بعد. سيُحفظ كل تشخيص جديد تلقائياً هنا.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {historyItems.map((item) => {
                  const typeBadge = getProblemTypeBadge(item.problemType);
                  const dateStr = item.createdAt?.seconds
                    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('ar-OM', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'الآن';

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex items-start justify-between gap-3 hover:border-emerald-400 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setResult(item);
                          setWilayat(item.wilayat || wilayat);
                          setCropName(item.cropName || cropName);
                        }}
                        className="text-right flex-1 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${typeBadge.cls}`}
                          >
                            {typeBadge.icon}
                            <span>{item.problemType}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                            {item.cropName}
                          </span>
                          <span className="text-[10px] text-stone-400">· {dateStr}</span>
                        </div>
                        <div className="text-xs font-bold text-stone-900 dark:text-white">
                          {item.problemName}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          الثقة: {item.confidenceScore}% · الخطورة: {item.severity}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        title="حذف من السجل"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
