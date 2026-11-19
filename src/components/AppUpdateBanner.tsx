import React, { useEffect, useState } from 'react';
import { Download, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

type UpdateManifest = {
  available?: boolean;
  version?: string;
  apkUrl?: string;
  releaseNotes?: string[];
  mandatory?: boolean;
};

const APP_VERSION = '1.0.3';
const MANIFEST_URL = '/app-update.json';

function isNewerVersion(candidate: string, current: string) {
  const a = candidate.split('.').map((part) => Number(part) || 0);
  const b = current.split('.').map((part) => Number(part) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

export const AppUpdateBanner: React.FC = () => {
  const [update, setUpdate] = useState<UpdateManifest | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        let installedVersion = APP_VERSION;
        if (Capacitor.isNativePlatform()) {
          // Older APKs may not have the native App plugin yet; let them bootstrap the updater.
          installedVersion = '0.0.0';
          try {
            installedVersion = (await App.getInfo()).version || '0.0.0';
          } catch {
            // Missing native App plugin is expected on older APKs.
          }
        }
        const response = await fetch(`${MANIFEST_URL}?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as UpdateManifest;
        if (cancelled || !data.available || !data.version || !data.apkUrl) return;
        if (!isNewerVersion(data.version, installedVersion)) return;
        setUpdate(data);
      } catch {
        // Update checks must never interrupt normal app use.
      }
    };
    void check();
    const interval = window.setInterval(check, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const dismiss = () => {
    if (update?.version) localStorage.setItem('sadiq_dismissed_update', update.version);
    setDismissed(true);
  };

  useEffect(() => {
    if (update?.version && localStorage.getItem('sadiq_dismissed_update') === update.version && !update.mandatory) {
      setDismissed(true);
    }
  }, [update]);

  const download = async () => {
    if (!update?.apkUrl || busy) return;
    setBusy(true);
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: update.apkUrl, presentationStyle: 'popover' });
      } else {
        window.open(update.apkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.location.href = update.apkUrl;
    } finally {
      setBusy(false);
    }
  };

  if (!update || dismissed) return null;

  return (
    <section
      dir="rtl"
      className="mx-auto mt-2 w-[calc(100%-1.25rem)] max-w-5xl overflow-hidden rounded-2xl border border-emerald-300/70 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-3 text-slate-900 shadow-sm dark:border-emerald-400/25 dark:from-emerald-950/80 dark:via-[#132247] dark:to-slate-900 dark:text-white sm:mt-3 sm:p-4"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold sm:text-base">تحديث جديد لصديق المزارع</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">الإصدار {update.version}</span>
          </div>
          <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">أصبح إصدار أحدث متاحاً. نزّل ملف APK لتثبيت التحسينات والاستمرار بأحدث نسخة.</p>
          {Array.isArray(update.releaseNotes) && update.releaseNotes.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {update.releaseNotes.slice(0, 3).map((note, index) => <li key={index}>{note}</li>)}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={download} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
              <Download className="h-4 w-4" />
              {busy ? 'جارٍ فتح التنزيل…' : 'تنزيل تحديث APK'}
            </button>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> التثبيت يتطلب موافقة Android</span>
          </div>
        </div>
        {!update.mandatory && <button type="button" onClick={dismiss} aria-label="إخفاء إشعار التحديث" className="rounded-lg p-1 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>}
      </div>
    </section>
  );
};
