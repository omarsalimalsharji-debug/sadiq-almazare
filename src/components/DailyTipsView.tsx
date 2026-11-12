import React from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  Sprout, 
  Droplet, 
  ShieldAlert, 
  Sun, 
  Wind,
  CheckCircle2
} from 'lucide-react';

const DAILY_AGRICULTURAL_TIPS = [
  {
    id: 1,
    title: "تنظيم الري في أوقات نشاط الرياح",
    category: "الري الذكي",
    tip: "عند اشتداد سرعة الرياح الشرقية أو الشمالية الجافة، يفضل تحويل ري المحاصيل إلى فترات الفجر الأولى لتفادي تفكك حبات الماء وانجرافها، وتجنب الري بالرش المحوري تماماً.",
    source: "دليل الإرشاد الزراعي العماني"
  },
  {
    id: 2,
    title: "خف عذوق نخيل الخلاص والفرض",
    category: "نخيل التمر",
    tip: "إجراء عملية خف الشماريخ من وسط العذق بمقدار الربع خلال أسبوعين من العقد يمنع تزاحم الثمار ويقلل احتمالية الإصابة بحلم الغبار (الغبير) ويرفع وزن التمرة الواحدة بنسبة 25%.",
    source: "بحوث النخيل - وزارة الثروة الزراعية"
  },
  {
    id: 3,
    title: "التعامل مع ملوحة مياه الآبار الساحلية",
    category: "التربة والمياه",
    tip: "إضافة أحماض الهيوميك والفولفيك مع ماء الري كل 20 يوماً يخفف من أثر شوارد الصوديوم والكلوريد على جذور الخضروات، ويساعد في فتح المسامات التربية في سهل الباطنة.",
    source: "إدارة التربة والمياه"
  },
  {
    id: 4,
    title: "التقليم الأخضر لأشجار المانجو والليمون",
    category: "بساتين الفاكهة",
    tip: "إزالة النموات المائية والسرطانات المتفرعة من أسفل منطقة التطعيم يوجه طاقة الشجرة نحو الأفرع المثمرة ويسمح بدخول أشعة الشمس إلى قلب الشجرة لطرد الحشرات القشرية.",
    source: "وقاية المزروعات"
  },
  {
    id: 5,
    title: "حماية نحل العسل أثناء مكافحة الآفات",
    category: "البيئة والنحل",
    tip: "احرص على إخطار النحالين المجاورين قبل موعد الرش بـ 48 ساعة على الأقل، واستخدم دائماً المبيدات المتخصصة ذات فترة البقاء القصيرة ورش بعد غياب الشمس تماماً.",
    source: "جمعية النحالين العمانية"
  }
];

export const DailyTipsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Lightbulb className="w-4 h-4" />
          <span>الإرشاد والتوجيه الزراعي المستمر</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          النصائح والإرشادات الزراعية اليومية
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          معلومات علمية وعملية متجددة تساعدك على تحسين الإنتاج، وتوفير استهلاك المياه والأسمدة، وحماية صحة التربة.
        </p>
      </div>

      {/* Featured Today Tip Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md border border-emerald-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-emerald-100 backdrop-blur-sm">
            نصيحة اليوم المختارة
          </span>
          <span className="text-xs text-stone-300 font-mono">
            {new Date().toLocaleDateString('ar-OM', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <h2 className="text-xl font-bold text-white">
          {DAILY_AGRICULTURAL_TIPS[0].title}
        </h2>

        <p className="text-sm leading-relaxed text-emerald-50 text-justify">
          {DAILY_AGRICULTURAL_TIPS[0].tip}
        </p>

        <div className="pt-2 text-[11px] text-emerald-200">
          المصدر المعتمد: {DAILY_AGRICULTURAL_TIPS[0].source}
        </div>
      </div>

      {/* Tips Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200">
          أرشيف النصائح الزراعية الميدانية:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAILY_AGRICULTURAL_TIPS.slice(1).map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-sm space-y-2 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white mt-1.5">
                  {item.title}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-1">
                  {item.tip}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400">
                {item.source}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
