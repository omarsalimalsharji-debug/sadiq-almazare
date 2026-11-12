import React, { useState } from 'react';
import { 
  HelpCircle, 
  Send, 
  Check, 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const FAQS = [
  {
    q: "من هو صاحب فكرة تطبيق «صديق المزارع» ومديره؟",
    a: "صاحب الفكرة والمدير العام للتطبيق هو الفاضل: عمر الشرجي، وتم تصميم وتطوير التطبيق لخدمة القطاع الزراعي العماني وتوفير حلول ذكية ومتكاملة للمزارعين والمهندسين وأبناء الوطن."
  },
  {
    q: "كيف يعمل نظام تشخيص الأمراض والآفات بالذكاء الاصطناعي؟",
    a: "يعتمد التطبيق على خوارزميات ذكاء اصطناعي متطورة (Gemini 3.8 Flash) مدربة على تشخيص أمراض المزروعات في البيئة العمانية والخليجية، حيث يقوم بتحليل صورة الورقة أو الثمرة وتقديم تقرير مفصل يضم اسم المرض، أسبابه، العلاج العضوي، والعلاج الكيميائي الآمن."
  },
  {
    q: "هل الألعاب والمسابقات مجانية وهل يمكن إضافة جوائز؟",
    a: "نعم، جميع الألعاب والمسابقات مجانية تماماً بنسبة 100% دون أي رسوم أو اشتراكات، وتتضمن نظام تحقق على الخادم لمنع التلاعب وتكريم الفائزين، مع إمكانية إعلان جوائز تشجيعية مستقبلية من إدارة التطبيق."
  },
  {
    q: "كيف تتم حماية الكتب في المكتبة الزراعية الإلكترونية؟",
    a: "تتيح المكتبة القراءة التفاعلية المباشرة داخل التطبيق مع علامة مائية ذكية ديناميكية وتمنع التحميل المباشر للمستخدم العادي لحماية حقوق التأليف والنشر وتشجيع القراءة الواعية."
  },
  {
    q: "كيف يعمل النمط النهاري والليلي التلقائي؟",
    a: "يقوم النظام بقراءة التوقيت المحلي لسلطنة عُمان (مسقط UTC+4)؛ بحيث يتحول تلقائياً إلى الوضع الصباحي الفاتح مع شروق النهار (06:00 صباحاً)، وإلى الوضع الليلي الداكن والمريح للعين مع دخول المساء (18:30 مساءً)، مع إمكانية التثبيت اليدوي من الإعدادات."
  }
];

export const HelpSupportView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [message, setMessage] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setMessage('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <HelpCircle className="w-4 h-4" />
          <span>مركز الدعم والتوجيه الفني</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
          المساعدة والدعم وتوثيق التطبيق
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
          دليل الاستخدام، الأسئلة الشائعة، ومعلومات التواصل مع إدارة منصة «صديق المزارع».
        </p>
      </div>

      {/* Leadership / Founder Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white p-6 sm:p-8 shadow-sm border border-emerald-800/40 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center font-bold text-2xl shadow-inner">
            🌱
          </div>
          <div>
            <span className="text-xs text-emerald-300 font-semibold block">
              صاحب فكرة التطبيق ومديره العام
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
              الفاضل / عمر الشرجي
            </h2>
            <div className="text-xs text-stone-300 mt-0.5">
              سلطنة عُمان · مبادرة وطنية رقمية متكاملة لخدمة المزارع العماني
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-200 leading-relaxed text-justify bg-white/5 p-4 rounded-2xl border border-white/10">
          «يهدف تطبيق صديق المزارع في نسخته المطورة إلى أن يكون المنصة العمانية الأولى والشاملة التي تمزج بين الأصالة الزراعية الميدانية وأحدث تقنيات الذكاء الاصطناعي، والمكتبة الرقمية، والمسابقات التثقيفية، مع الحفاظ على روح الهوية العمانية وروحانيات شهر رمضان المبارك والقرآن الكريم بصوت القارئ العماني الشيخ هزاع البلوشي».
        </p>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-stone-900 dark:text-white">
          الأسئلة الشائعة حول المنصة والخدمات:
        </h3>

        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3.5">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-right flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 hover:text-emerald-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />}
                </button>
                {isOpen && (
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-2.5 pt-2 text-justify">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Inquiry Form */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-7 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-stone-900 dark:text-white">
          إرسال مقترح أو استفسار لإدارة المنصة
        </h3>

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>شكراً لتواصلك! تم استلام رسالتك وسيتم مراجعتها من قبل الإدارة والمشرفين.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">الاسم الكريم:</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">رقم الهاتف أو البريد:</label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  placeholder="للتواصل والمتابعة"
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">المقترح أو الاستفسار:</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="اكتب ملاحظاتك، احتياجاتك في المزرعة، أو مقترحاتك لتطوير الخدمات..."
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>إرسال للإدارة</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
