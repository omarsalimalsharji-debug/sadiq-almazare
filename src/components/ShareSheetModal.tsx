import React, { useEffect, useState } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  Send,
  Smartphone,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  SharePayload,
  buildSocialShareUrls,
  formatShareMessage,
  getShareKindLabel,
  renderShareCardToPng,
} from '../utils/shareUtils.ts';

interface ShareSheetModalProps {
  isOpen: boolean;
  payload: SharePayload | null;
  onClose: () => void;
}

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  isOpen,
  payload,
  onClose,
}) => {
  const [cardUrl, setCardUrl] = useState<string>('');
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [generatingCard, setGeneratingCard] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [nativeError, setNativeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !payload) {
      setCardUrl('');
      setCardBlob(null);
      setCopyStatus('idle');
      setNativeError(null);
      return;
    }

    let cancelled = false;
    setGeneratingCard(true);
    renderShareCardToPng(payload)
      .then((res) => {
        if (cancelled) return;
        setCardUrl(res.dataUrl);
        setCardBlob(res.blob);
      })
      .catch(() => {
        if (!cancelled) {
          setCardUrl('');
          setCardBlob(null);
        }
      })
      .finally(() => {
        if (!cancelled) setGeneratingCard(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, payload]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payload) return null;

  const links = buildSocialShareUrls(payload);
  const shareText = formatShareMessage(payload, true);
  const supportsNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2200);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (!supportsNativeShare) return;
    setNativeError(null);
    try {
      const shareData: ShareData = {
        title: payload.title,
        text: formatShareMessage(payload, false),
        url: links.url,
      };
      if (
        cardBlob &&
        typeof File !== 'undefined' &&
        typeof navigator.canShare === 'function'
      ) {
        const file = new File([cardBlob], `sadiq-almuzari-${payload.kind}.png`, {
          type: 'image/png',
        });
        if (navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }
      await navigator.share(shareData);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setNativeError('تعذر فتح مشاركة الجهاز؛ يمكنك استخدام الروابط المباشرة أو النسخ أدناه.');
      }
    }
  };

  const handleDownloadCard = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `sadiq-almuzari-${payload.kind}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0e1936] text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-sky-300/20 shadow-2xl">
        {/* Mobile grab handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-sky-300/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                {getShareKindLabel(payload.kind)} · {payload.categoryLabel}
              </div>
              <h2
                id="share-sheet-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate"
              >
                مشاركة المعرفة الزراعية
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المشاركة"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-[#132247] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1a2e5c] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Visual Card Preview */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>بطاقة الملخص المرئية الجاهزة للمشاركة</span>
              </span>
              {cardUrl && (
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#132247] hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>حفظ البطاقة PNG</span>
                </button>
              )}
            </div>

            {generatingCard ? (
              <div className="aspect-[1200/630] rounded-2xl bg-slate-100 dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>جاري تجهيز بطاقة المشاركة المرئية...</span>
              </div>
            ) : cardUrl ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-sky-300/20 shadow-md bg-[#0b1329]">
                <img
                  src={cardUrl}
                  alt={`بطاقة مشاركة: ${payload.title}`}
                  className="w-full h-auto block"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#132247] border border-slate-200 dark:border-sky-300/15 space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {payload.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {payload.summary}
                </p>
              </div>
            )}
          </div>

          {/* Direct Social Platforms */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              مشاركة مباشرة عبر المنصات الاجتماعية:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>واتساب</span>
              </a>

              <a
                href={links.x}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap border border-slate-700"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>منصة X</span>
              </a>

              <a
                href={links.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>تيليجرام</span>
              </a>

              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>فيسبوك</span>
              </a>
            </div>
          </div>

          {nativeError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/60 text-amber-800 dark:text-amber-200 text-xs">
              {nativeError}
            </div>
          )}

          {/* Native Device Share + Clipboard Copy */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
            {supportsNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>مشاركة عبر تطبيقات الجهاز</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyAll}
              className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                copyStatus === 'copied'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#132247] dark:hover:bg-[#1b3063] border-slate-200 dark:border-sky-300/20 text-slate-800 dark:text-slate-100'
              }`}
            >
              {copyStatus === 'copied' ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>تم نسخ الملخص والرابط!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>نسخ النص والرابط</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
