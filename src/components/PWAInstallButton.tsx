import React, { useState } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const apkUrl = import.meta.env.VITE_ANDROID_APK_URL;
  const isAndroid = /android/i.test(window.navigator.userAgent);

  if (isAndroid) {
    return (
      <a
        href={apkUrl || undefined}
        download={apkUrl ? 'sadiq-almazare.apk' : undefined}
        aria-disabled={!apkUrl}
        className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl font-bold shadow-sm transition-all ${
          apkUrl
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            : 'bg-stone-200 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
        } ${compact ? 'px-3 py-2 text-xs' : 'w-full px-4 py-2.5 text-xs'}`}
        onClick={(event) => { if (!apkUrl) event.preventDefault(); }}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{apkUrl ? 'تحميل تطبيق Android (APK)' : 'ملف APK قيد التجهيز'}</span>
      </a>
    );
  }


  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all active:scale-95 ${
          compact ? 'px-3 py-2 text-xs' : 'w-full px-4 py-2.5 text-xs'
        }`}
        title="تثبيت تطبيق صديق المزارع على الهاتف"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{compact ? 'تثبيت' : 'تثبيت التطبيق على الهاتف'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold transition-all active:scale-95 ${
            compact ? 'px-3 py-2 text-xs' : 'w-full px-4 py-2.5 text-xs'
          }`}
          title="تثبيت التطبيق على الآيفون"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{compact ? 'تثبيت iOS' : 'إضافة التطبيق للشاشة الرئيسية (iOS)'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span>تثبيت تطبيق «صديق المزارع» على الآيفون</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="text-xs text-stone-600 dark:text-stone-300 space-y-2.5 leading-relaxed list-decimal list-inside">
                <li className="flex items-center gap-1.5">
                  <span>1. اضغط على زر <strong>المشاركة</strong></span>
                  <Share className="w-4 h-4 text-emerald-600 inline shrink-0" />
                  <span>في شريط Safari السفلي.</span>
                </li>
                <li>2. مرّر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</li>
                <li>3. اضغط <strong>إضافة</strong> ليظهر التطبيق بأيقونته الكاملة.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="min-h-[44px] w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
