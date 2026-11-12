import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';

export const PlantDiagnosisView: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropName, setCropName] = useState<string>('طماطم');
  const [wilayat, setWilayat] = useState<string>('محافظة الداخلية - نزوى');
  const [symptoms, setSymptoms] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage && !symptoms.trim()) {
      setError('يرجى التقاط أو رفع صورة للورقة/الثمرة المصابة، أو كتابة وصف دقيق للأعراض.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/diagnose/plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          cropName,
          symptoms: symptoms.trim() || 'فحص الأوراق والثمار المصابة في الصورة',
          wilayat
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في تحليل الحالة المرضية');
      }

      setResult(data.diagnosis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء التواصل مع محرك التشخيص الذكي. يرجى المحاولة ثانية.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSample = (crop: string, sym: string) => {
    setCropName(crop);
    setSymptoms(sym);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Page Title & Mission */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Scan className="w-4 h-4" />
            <span>الذكاء الاصطناعي الزراعي العالي الدقة</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            تشخيص أمراض النباتات والمحاصيل
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            ارفع صورة أو صف أعراض نباتك المصاب للحصول على تشخيص فوري وعلاج عضوي وكيميائي متوافق مع البيئة العمانية.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & Input Form */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Image Input Card */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              صورة النبات أو العرض المرضي:
            </label>

            <div className="relative border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors bg-stone-50/50 dark:bg-stone-800/30">
              {selectedImage ? (
                <div className="space-y-3">
                  <img
                    src={selectedImage}
                    alt="صورة النبات للفحص"
                    className="w-full h-48 object-cover rounded-lg border border-stone-200 dark:border-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    حذف الصورة واختيار أخرى
                  </button>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                      <Scan className="w-6 h-6 mb-1 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold">التقاط بالكاميرا</span>
                      <span className="text-[10px] text-stone-500">مباشرة من الحقل</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors">
                      <Upload className="w-6 h-6 mb-1 text-stone-600 dark:text-stone-400" />
                      <span className="text-xs font-bold">رفع من الاستوديو</span>
                      <span className="text-[10px] text-stone-500">من ملفات الهاتف</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <span className="text-[11px] text-stone-400 block">
                    يدعم صور JPG و PNG حتى 10 ميجابايت مع إمكانية الفحص الحساس
                  </span>
                </div>
              )}
            </div>

            {/* Crop Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                نوع المحصول:
              </label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="طماطم">طماطم (حقلي أو بيوت محمية)</option>
                <option value="نخلة تمر">نخيل التمر (خلاص، فرض، خنيزي...)</option>
                <option value="خيار">خيار (بيوت محمية)</option>
                <option value="ليمون عماني">الليمون العماني والحمضيات</option>
                <option value="مانجو">أشجار المانجو</option>
                <option value="رمان">رمان الجبل الأخضر</option>
                <option value="بطيخ (حبحب)">بطيخ وشمام وقرعيات</option>
                <option value="بصل وثوم">بصل وثوم عماني بلدي</option>
                <option value="محاصيل علفية">أعلاف وبرسيم (قت)</option>
                <option value="قمح عماني">قمح عماني (ميسياني/كوليب)</option>
              </select>
            </div>

            {/* Wilayat / Governorate */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                الموقع في سلطنة عُمان:
              </label>
              <select
                value={wilayat}
                onChange={(e) => setWilayat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              >
                {OMANI_GOVERNORATES.map(gov => (
                  <option key={gov.id} value={`${gov.name} - ${gov.wilayat.split('،')[0]}`}>
                    {gov.name} ({gov.wilayat.split('،').slice(0, 3).join('، ')}...)
                  </option>
                ))}
              </select>
            </div>

            {/* Symptoms Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                وصف الأعراض المشاهدة (اختياري مع الصورة):
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
                placeholder="مثال: ظهور بقع صفراء محاطة بهالة بنية على حواف الأوراق السفلية مع ذبول في النهار..."
                className="w-full p-2.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform hover:scale-101 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>جاري التحليل والتشخيص بالذكاء الاصطناعي...</span>
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
          </div>

          {/* Quick presets for testing */}
          <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
            <span className="font-semibold text-stone-600 dark:text-stone-300 block">
              نماذج سريعة للتجربة:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickSample('طماطم', 'بقع بيضاء دائرية متناثرة على الأوراق تشبه مسحوق الطحين مع اصفرار طفيف')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                طماطم: بياض دقيقي
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample('نخلة تمر', 'جفاف في السعف الأوسط وخروج سائل بني صمغي ذو رائحة مميزة قرب قاعدة الساق')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                نخيل: إفراز صمغي
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample('خيار', 'اصفرار بين عروق الأوراق العليا مع بقاء العروق خضراء داكنة')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                خيار: نقص حديد
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnosis Report */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
              
              {/* Header result */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {result.healthStatus}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      دقة التشخيص: {result.confidenceScore || 90}%
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white mt-1">
                    {result.diseaseName}
                  </h2>
                  <div className="text-xs text-stone-500 mt-0.5">
                    المحصول: {result.cropName} · الموقع: {wilayat}
                  </div>
                </div>

                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              {/* Symptoms summary */}
              <div>
                <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الأعراض المشخصة:</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                  {result.symptomsSummary}
                </p>
              </div>

              {/* Causes */}
              {Array.isArray(result.causes) && result.causes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                    الأسباب والعوامل المهيأة:
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-600 dark:text-stone-300">
                    {result.causes.map((c: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 bg-stone-50 dark:bg-stone-800/40 p-2 rounded-lg border border-stone-200/60 dark:border-stone-700/60">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Remedies comparison: Organic vs Chemical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Organic Remedy */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>العلاج العضوي والمكافحة الحيوية:</span>
                  </h3>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                    {result.organicRemedy}
                  </p>
                </div>

                {/* Chemical Remedy */}
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>العلاج الكيميائي وفترة الأمان (PHI):</span>
                  </h3>
                  <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    {result.chemicalRemedy}
                  </p>
                </div>
              </div>

              {/* Prevention tips */}
              {Array.isArray(result.preventionTips) && (
                <div>
                  <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">
                    خطة الوقاية المستقبلية للمزرعة:
                  </h3>
                  <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
                    {result.preventionTips.map((tip: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Omani farming special note */}
              {result.omaniFarmingNote && (
                <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                    إرشاد خاص بالبيئة العمانية:
                  </div>
                  {result.omaniFarmingNote}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-stone-400">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-4">
                <Scan className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                في انتظار بيانات الفحص
              </h3>
              <p className="text-xs max-w-sm mt-1">
                التقط صورة لورقة أو ثمرة النبات أو اختر أحد النماذج السريعة ثم اضغط «بدء التشخيص الفوري».
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
