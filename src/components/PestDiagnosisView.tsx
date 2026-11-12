import React, { useState } from 'react';
import { 
  Bug, 
  Upload, 
  AlertOctagon, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Info,
  Clock,
  Compass,
  Scan
} from 'lucide-react';
import { OMANI_GOVERNORATES } from '../data/agriculturalData.ts';

export const PestDiagnosisView: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hostCrop, setHostCrop] = useState<string>('نخيل التمر');
  const [wilayat, setWilayat] = useState<string>('محافظة شمال الباطنة - صحار');
  const [pestDescription, setPestDescription] = useState<string>('');
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
    if (!selectedImage && !pestDescription.trim()) {
      setError('يرجى التقاط صورة للآفة أو كتابة وصف دقيق لشكل الحشرة أو الضرر المشاهد.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/diagnose/pest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          hostCrop,
          pestDescription: pestDescription.trim() || 'فحص الحشرة أو الآفة في الصورة',
          wilayat
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'فشل في تشخيص الآفة الحشرية');
      }

      setResult(data.diagnosis);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بمحرك تشخيص الآفات.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSample = (crop: string, desc: string) => {
    setHostCrop(crop);
    setPestDescription(desc);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Bug className="w-4 h-4" />
          <span>المكافحة المتكاملة للآفات (IPM)</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          تشخيص الحشرات والآفات الزراعية
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          تعرف على نوع الآفة، دورة حياتها، وأسرع خطة محاصرة حيوية وكيميائية معتمدة لحماية محصولك ونحل العسل.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
              صورة الحشرة أو أثر الضرر:
            </label>

            <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-4 text-center hover:border-emerald-500 transition-colors bg-stone-50/50 dark:bg-stone-800/30">
              {selectedImage ? (
                <div className="space-y-3">
                  <img
                    src={selectedImage}
                    alt="صورة الآفة للفحص"
                    className="w-full h-48 object-cover rounded-lg border border-stone-200 dark:border-stone-700"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    حذف واختيار صورة أخرى
                  </button>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      <Scan className="w-6 h-6 mb-1 text-red-600 dark:text-red-400" />
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
                    صورة واضحة للحشرة أو النخر أو إفرازات الصمغ البني
                  </span>
                </div>
              )}
            </div>

            {/* Host Crop */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                المحصول المتضرر:
              </label>
              <select
                value={hostCrop}
                onChange={(e) => setHostCrop(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              >
                <option value="نخيل التمر">نخيل التمر (جذع، سعف، ثمار)</option>
                <option value="الحمضيات والليمون">الليمون العماني والبرتقال</option>
                <option value="المانجو والفواكه">المانجو، البابايا، الجوافة</option>
                <option value="الخضار المكشوفة">طماطم، فلفل، باذنجان، بصل</option>
                <option value="البيوت المحمية">خيار، كوسا، فراولة محمية</option>
                <option value="الأعلاف والمراعي">برسيم حيدري، رودس، حشائش</option>
              </select>
            </div>

            {/* Governorate */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                المحافظة:
              </label>
              <select
                value={wilayat}
                onChange={(e) => setWilayat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              >
                {OMANI_GOVERNORATES.map(gov => (
                  <option key={gov.id} value={`${gov.name} - ${gov.wilayat.split('،')[0]}`}>
                    {gov.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pest Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                وصف الحشرة أو النخر والأضرار:
              </label>
              <textarea
                value={pestDescription}
                onChange={(e) => setPestDescription(e.target.value)}
                rows={3}
                placeholder="مثال: حشرة لونها بني محمر لها خرطوم طويل ونشارة خشبية تخرج من فجوات الجذع..."
                className="w-full p-2.5 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform hover:scale-101 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>جاري فحص الآفة الحشرية وتحديد خطة المكافحة...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>بدء تشخيص الآفة الزراعية</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
            <span className="font-semibold text-stone-600 dark:text-stone-300 block">
              نماذج آفات شائعة في عُمان:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickSample('نخيل التمر', 'خنفساء كبيرة حمراء بنية لها خرطوم مقوس ونشارة خشب رطبة متكتلة عند قواعد السعف')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                سوسة النخيل الحمراء
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample('نخيل التمر', 'ندوة عسلية لزجة تغطي عذوق وسعف النخلة مع تراكم غبار أسود وحشرات صغيرة صفراء')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                دوباس النخيل (المتقة)
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample('الحمضيات والليمون', 'خطوط بيضاء متعرجة تشبه الأنفاق الفضية داخل أنسجة أوراق شجرة الليمون العماني')}
                className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:border-emerald-500"
              >
                صانعات أنفاق الحمضيات
              </button>
            </div>
          </div>
        </div>

        {/* Diagnosis Report Column */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
              
              {/* Header result */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300">
                      مستوى الخطورة: {result.severityLevel}
                    </span>
                    <span className="text-xs text-stone-500 italic">
                      {result.scientificName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-white mt-1">
                    {result.pestName}
                  </h2>
                  <div className="text-xs text-stone-500 mt-0.5">
                    المحصول العائل: {hostCrop} · المنطقة: {wilayat}
                  </div>
                </div>

                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 shrink-0">
                  <AlertOctagon className="w-6 h-6" />
                </div>
              </div>

              {/* Immediate Action required */}
              {result.immediateAction && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    <span>التدخل العاجل المطلوب اليوم لحصار الإصابة:</span>
                  </div>
                  <p className="leading-relaxed">{result.immediateAction}</p>
                </div>
              )}

              {/* Life cycle note */}
              {result.lifeCycleNote && (
                <div className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                  <div className="font-bold text-stone-800 dark:text-stone-200 mb-1">
                    دورة الحياة وموسم النشاط في عُمان:
                  </div>
                  <p className="leading-relaxed">{result.lifeCycleNote}</p>
                </div>
              )}

              {/* Biological vs Chemical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>المكافحة الحيوية والأعداء الطبيعية:</span>
                  </h3>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                    {result.organicAndBiologicalControl}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-200 mb-2 flex items-center gap-1.5">
                    <Bug className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                    <span>المبيدات المعتمدة وفترة التحريم:</span>
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {result.safeChemicalOptions}
                  </p>
                </div>
              </div>

              {/* Omani guidance */}
              {result.omaniGuidance && (
                <div className="p-3.5 rounded-xl bg-emerald-900/10 dark:bg-emerald-950/40 border border-emerald-300/40 text-xs text-emerald-900 dark:text-emerald-300">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <span>توجيهات الإرشاد الزراعي في سلطنة عُمان:</span>
                  </div>
                  <p className="leading-relaxed">{result.omaniGuidance}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center text-stone-400">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center mb-4">
                <Bug className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                في انتظار تشخيص الحشرة
              </h3>
              <p className="text-xs max-w-sm mt-1">
                ارفع صورة أو اكتب وصفاً للآفة المشاهدة في المزرعة للتعرف عليها فوراً.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
