import React, { useState } from 'react';
import { 
  HelpCircle, 
  Send, 
  Check, 
  Phone, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const FAQS = [
  {
    q: "من هو صاحب فكرة تطبيق «صديق المزارع الذكي» ومديره؟",
    a: "صاحب الفكرة والمدير العام للتطبيق هو الفاضل: عمر بن سالم الشرجي، وتم تصميم وتطوير التطبيق لخدمة القطاع الزراعي العماني وتوفير حلول ذكية ومتكاملة للمزارعين والمهندسين وأبناء الوطن."
  },
  {
    q: "كيف يعمل نظام تشخيص الأمراض والآفات بالذكاء الاصطناعي؟",
    a: "يعتمد التطبيق على منظومة تحليل ذكية متطورة مدربة على تشخيص أمراض المزروعات في البيئة العمانية والخليجية، حيث يقوم بتحليل صورة الورقة أو الثمرة وتقديم تقرير مفصل يضم اسم المرض، أسبابه، العلاج العضوي، والعلاج الآمن الملتزم بالقرار الوزاري 160/2023."
  },
  {
    q: "هل الألعاب والمسابقات مجانية وهل يمكن إضافة جوائز؟",
    a: "نعم، جميع الألعاب والمسابقات مجانية تماماً بنسبة 100% دون أي رسوم أو اشتراكات، وتتضمن نظام تحقق على الخادم لمنع التلاعب وتكريم الفائزين، مع إمكانية إعلان جوائز تشجيعية مستقبلية من إدارة التطبيق."
  },
  {
    q: "كيف تتم حماية الكتب في المكتبة الزراعية الإلكترونية؟",
    a: "تتيح المكتبة القراءة التفاعلية المباشرة داخل التطبيق مع علامة مائية ذكية ديناميكية وإمكانية الحفظ للتصفح السريع مع صيانة حقوق التأليف."
  },
  {
    q: "كيف يعمل النمط النهاري والليلي؟",
    a: "يعرض التطبيق الهوية الليلية الزرقاء الداكنة المريحة للعين بشكل افتراضي، مع إمكانية التبديل بضغطة واحدة إلى الوضع النهاري أو الوضع التلقائي المرتبط بتوقيت سلطنة عُمان (مسقط)."
  }
];

export const HelpSupportView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [message, setMessage] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmittedTicketId(null);

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          contact: senderPhone.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'تعذر إرسال الطلب حالياً؛ يرجى التحقق من البيانات والمحاولة مجدداً.');
        return;
      }
      setSubmittedTicketId(data.ticket?.id || 'تم التسجيل');
      setMessage('');
      setSenderName('');
      setSenderPhone('');
    } catch {
      setSubmitError('تعذر الاتصال بالخادم حالياً؛ يرجى التأكد من اتصال الشبكة وإعادة المحاولة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-sky-300/15 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <HelpCircle className="w-4 h-4" />
          <span>مركز الدعم والتوجيه الفني</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          المساعدة والدعم وتوثيق التطبيق
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          دليل الاستخدام، الأسئلة الشائعة، ومعلومات التواصل مع إدارة منصة «صديق المزارع الذكي».
        </p>
      </div>

      {/* Leadership / Founder Card */}
      <div className="rounded-3xl bg-gradient-to-r from-[#132247] via-[#0e1936] to-emerald-950/90 text-white p-6 sm:p-8 shadow-lg border border-sky-300/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-2xl">
              🌱
            </div>
            <div>
              <span className="text-xs text-emerald-300 font-semibold block">
                صاحب فكرة المشروع ومديره العام
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                الفاضل / عمر بن سالم الشرجي
              </h2>
              <div className="text-xs text-slate-300 mt-0.5">
                سلطنة عُمان · مبادرة وطنية رقمية متكاملة لخدمة المزارع العماني
              </div>
            </div>
          </div>

          <a
            href="tel:94896333"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0b1329] font-extrabold text-xs flex items-center gap-2 shrink-0 self-start sm:self-center tabular-nums"
          >
            <Phone className="w-4 h-4" />
            <span>للتواصل المباشر: 94896333</span>
          </a>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed text-justify bg-white/5 p-4 rounded-2xl border border-white/10">
          «يهدف تطبيق صديق المزارع الذكي في نسخته المطورة إلى أن يكون المنصة العمانية الأولى والشاملة التي تمزج بين الأصالة الزراعية الميدانية وأحدث تقنيات الذكاء الاصطناعي، والمزرعة الافتراضية، والمكتبة الرقمية، والمسابقات التثقيفية، مع الحفاظ على روح الهوية العمانية والقرآن الكريم بصوت القارئ العماني الشيخ هزاع البلوشي».
        </p>
      </div>

      {/* FAQs */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-7 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          الأسئلة الشائعة حول المنصة والخدمات:
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-sky-300/15">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3.5">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="min-h-[44px] w-full text-right flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-emerald-500 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2 pt-2 text-justify">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Inquiry Form */}
      <div className="bg-white dark:bg-[#132247] rounded-3xl border border-slate-200 dark:border-sky-300/15 p-6 sm:p-7 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          إرسال مقترح أو استفسار لإدارة المنصة
        </h3>

        {submittedTicketId && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>تم استلام رسالتك وحفظها في سجل إدارة المنصة للمتابعة.</span>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-[#0e1936] border border-emerald-200 dark:border-emerald-800 shrink-0">
              رقم الطلب: {submittedTicketId}
            </span>
          </div>
        )}

        {submitError && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">الاسم الكريم:</label>
              <input
                type="text"
                required
                minLength={2}
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="اسمك الكامل"
                className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-slate-50 dark:bg-[#0e1936] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">رقم الهاتف أو البريد:</label>
              <input
                type="text"
                required
                minLength={3}
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                placeholder="للتواصل والمتابعة"
                className="w-full min-h-[44px] p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-slate-50 dark:bg-[#0e1936] text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">المقترح أو الاستفسار:</label>
            <textarea
              rows={3}
              required
              minLength={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب ملاحظاتك، احتياجاتك في المزرعة، أو مقترحاتك لتطوير الخدمات..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-sky-300/20 bg-slate-50 dark:bg-[#0e1936] text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'جاري الإرسال...' : 'إرسال للإدارة'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
