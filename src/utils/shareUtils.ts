import { ActivePage } from '../types/index.ts';

export type ShareContentKind =
  | 'diagnosis'
  | 'article'
  | 'book'
  | 'tip'
  | 'episode'
  | 'achievement'
  | 'advice';

export interface SharePayload {
  kind: ShareContentKind;
  title: string;
  subtitle?: string;
  summary: string;
  highlights?: string[];
  categoryLabel: string;
  locationLabel?: string;
  page: ActivePage;
  itemId?: string;
  badgeMetric?: string;
  authorOrSource?: string;
}

export function getShareKindLabel(kind: ShareContentKind): string {
  switch (kind) {
    case 'diagnosis':
      return 'نتيجة تشخيص زراعي';
    case 'article':
      return 'مقال من الموسوعة الزراعية';
    case 'book':
      return 'كتاب من المكتبة الزراعية';
    case 'tip':
      return 'نصيحة إرشادية';
    case 'episode':
      return 'حلقة مُرشد التوعوية';
    case 'achievement':
      return 'إنجاز في التحديات الزراعية';
    case 'advice':
      return 'استشارة زراعية من مُرشد';
    default:
      return 'معرفة زراعية عُمانية';
  }
}

export function buildShareDeepUrl(payload: SharePayload): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const params = new URLSearchParams();
  params.set('page', payload.page);
  if (payload.itemId) {
    params.set('item', payload.itemId);
  }
  return `${baseUrl}?${params.toString()}`;
}

export function formatShareMessage(payload: SharePayload, includeUrl = true): string {
  const url = buildShareDeepUrl(payload);
  const lines: string[] = [];
  lines.push(`🌱 ${payload.title}`);

  const metaParts = [payload.categoryLabel];
  if (payload.badgeMetric) metaParts.push(payload.badgeMetric);
  if (payload.locationLabel) metaParts.push(payload.locationLabel);
  lines.push(metaParts.filter(Boolean).join(' · '));

  lines.push('');
  lines.push(payload.summary.trim());

  if (payload.highlights && payload.highlights.length > 0) {
    lines.push('');
    for (const h of payload.highlights.slice(0, 3)) {
      if (h.trim()) lines.push(`• ${h.trim()}`);
    }
  }

  lines.push('');
  lines.push('— تطبيق «صديق المزارع الذكي» · سلطنة عُمان');
  if (includeUrl && url) {
    lines.push(url);
  }

  return lines.join('\n');
}

export interface SocialShareLinks {
  whatsapp: string;
  x: string;
  telegram: string;
  facebook: string;
  url: string;
}

export function buildSocialShareUrls(payload: SharePayload): SocialShareLinks {
  const url = buildShareDeepUrl(payload);
  const fullMessage = formatShareMessage(payload, true);
  const shortSummary =
    payload.summary.length > 140
      ? `${payload.summary.slice(0, 137)}...`
      : payload.summary;
  const xText = `🌱 ${payload.title}\n${shortSummary}\n\n#صديق_المزارع #عُمان #الزراعة_العمانية`;

  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(fullMessage)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`🌱 ${payload.title}\n${shortSummary}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${payload.title} — ${shortSummary}`)}`,
    url,
  };
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(word);
        current = '';
      }
      if (lines.length >= maxLines) {
        break;
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, lines[maxLines - 1].length - 3))}...`;
  }

  return lines;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCardToPng(
  payload: SharePayload
): Promise<{ dataUrl: string; blob: Blob | null }> {
  if (typeof document === 'undefined') {
    return { dataUrl: '', blob: null };
  }

  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
    }
  } catch {
    // Ignore font readiness check failure
  }

  const width = 1200;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', blob: null };

  // 1. Deep Omani Navy-Emerald Gradient Background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0b1329');
  bg.addColorStop(0.55, '#0f2836');
  bg.addColorStop(1, '#064e3b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative geometry in background
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(170, 520, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(1090, 95, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer Card Frame
  drawRoundedRectPath(ctx, 36, 36, width - 72, height - 72, 28);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top Amber Accent Line
  const accentGrad = ctx.createLinearGradient(80, 0, width - 80, 0);
  accentGrad.addColorStop(0, 'rgba(251, 191, 36, 0.1)');
  accentGrad.addColorStop(0.5, '#fbbf24');
  accentGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(72, 36, width - 144, 5);

  // Draw Compact Murshid Emblem on Left Side (x: 155, y: 245)
  ctx.save();
  ctx.translate(155, 235);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Simplified vector emblem (Hat + Face + Emerald Vest)
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.roundRect(-34, 24, 68, 42, 16);
  ctx.fill();
  ctx.fillStyle = '#e7ad7b';
  ctx.beginPath();
  ctx.arc(0, -2, 30, 0, Math.PI * 2);
  ctx.fill();
  // Hat
  ctx.fillStyle = '#d9b77c';
  ctx.beginPath();
  ctx.ellipse(0, -20, 44, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ead2a4';
  ctx.beginPath();
  ctx.arc(0, -22, 28, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#047857';
  ctx.fillRect(-27, -25, 54, 6);
  // Eyes & smile
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-10, -3, 3.2, 0, Math.PI * 2);
  ctx.arc(10, -3, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 4, 10, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();

  // Brand caption under emblem
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = '700 18px Cairo, Tajawal, sans-serif';
  ctx.fillText('إرشاد مُرشد الزراعي', 155, 348);
  if (payload.badgeMetric) {
    drawRoundedRectPath(ctx, 72, 370, 166, 40, 12);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '700 17px Cairo, Tajawal, sans-serif';
    ctx.fillText(payload.badgeMetric, 155, 396);
  }
  ctx.restore();

  // RTL Content Area (Right Side: x=1120 to x=285 => maxWidth = 820)
  const rightX = 1120;
  const maxTextWidth = 820;

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Header metadata line (Unboxed inline metadata with separator ·)
  ctx.fillStyle = '#34d399';
  ctx.font = '700 22px Cairo, Tajawal, sans-serif';
  const topMeta = [getShareKindLabel(payload.kind), payload.categoryLabel]
    .filter(Boolean)
    .join(' · ');
  ctx.fillText(topMeta, rightX, 104);

  // Title (Wrapped cleanly up to 2 lines)
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px Cairo, Tajawal, sans-serif';
  const titleLines = wrapCanvasLines(ctx, payload.title, maxTextWidth, 2);
  let cursorY = 160;
  for (const line of titleLines) {
    ctx.fillText(line, rightX, cursorY);
    cursorY += 50;
  }

  // Divider line
  cursorY += 4;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.fillRect(rightX - maxTextWidth, cursorY, maxTextWidth, 1.5);
  cursorY += 36;

  // Summary paragraph (up to 3 lines)
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 24px Tajawal, Cairo, sans-serif';
  const summaryLines = wrapCanvasLines(ctx, payload.summary, maxTextWidth, 3);
  for (const line of summaryLines) {
    ctx.fillText(line, rightX, cursorY);
    cursorY += 36;
  }

  // Highlights list (up to 3 items)
  if (payload.highlights && payload.highlights.length > 0) {
    cursorY += 12;
    ctx.font = '600 21px Tajawal, Cairo, sans-serif';
    for (const hl of payload.highlights.slice(0, 3)) {
      const clipped = hl.length > 88 ? `${hl.slice(0, 85)}...` : hl;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('◆', rightX, cursorY);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(clipped, rightX - 24, cursorY);
      cursorY += 34;
    }
  }

  // Footer Attribution Bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  drawRoundedRectPath(ctx, 64, height - 114, width - 128, 56, 16);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 20px Cairo, Tajawal, sans-serif';
  ctx.fillText('منصة صديق المزارع الذكي · سلطنة عُمان', rightX - 10, height - 79);

  const leftFooter =
    payload.locationLabel || payload.authorOrSource || 'تبادل المعرفة الزراعية العُمانية';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px Tajawal, Cairo, sans-serif';
  ctx.fillText(leftFooter.slice(0, 56), 88, height - 79);

  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );

  return { dataUrl, blob };
}
