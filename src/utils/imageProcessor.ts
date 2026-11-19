/**
 * Client-side agricultural photo validation, compression & clarity enhancement utility.
 * Preserves natural leaf lesion / insect coloration while gently normalizing dim exposure,
 * rejecting unsupported/tiny files, and generating a deterministic image fingerprint
 * to prevent duplicate AI submissions.
 */

export interface ProcessedPlantImage {
  dataUrl: string;
  originalKB: number;
  compressedKB: number;
  width: number;
  height: number;
  enhanced: boolean;
  fingerprint: string;
}

const MAX_DIMENSION = 1400;
const MIN_DIMENSION = 96;
const JPEG_QUALITY = 0.85;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

async function loadImageFromFile(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  // Modern mobile browsers can decode HEIC/HEIF with createImageBitmap even when
  // an HTMLImageElement cannot. Prefer this path and always convert to JPEG below.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
    } catch {
      // Fall through to the native image decoder for formats it supports.
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, cleanup: () => undefined });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر فتح الصورة على هذا الهاتف. إذا كانت بصيغة HEIC فحوّلها إلى JPG، أو اختر صورة JPG أو PNG.'));
    };
    img.src = objectUrl;
  });
}

function computeFastFingerprint(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  const step = Math.max(1, Math.floor(input.length / 2048));
  for (let i = 0; i < input.length; i += step) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16)}-${(h2 >>> 0).toString(16)}-${input.length}`;
}

/**
 * Applies gentle auto-exposure normalization (only when photo is noticeably dim)
 * plus subtle crispness enhancement without distorting natural chlorosis/lesion or insect colors.
 */
function enhanceCanvasClarity(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;
    if (totalPixels === 0) return false;

    let lumSum = 0;
    let sampleCount = 0;
    for (let i = 0; i < data.length; i += 32) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      lumSum += 0.299 * r + 0.587 * g + 0.114 * b;
      sampleCount++;
    }

    const avgLum = sampleCount > 0 ? lumSum / sampleCount : 128;
    const brightnessGain = avgLum < 92 ? Math.min(1.22, 106 / Math.max(avgLum, 45)) : 1.0;
    const contrastFactor = 1.05;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] * brightnessGain;
      let g = data[i + 1] * brightnessGain;
      let b = data[i + 2] * brightnessGain;

      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    ctx.putImageData(imageData, 0, 0);
    return true;
  } catch {
    return false;
  }
}

export async function compressAndEnhancePlantImage(file: File): Promise<ProcessedPlantImage> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const inferredType = fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg'
    : fileExtension === 'png' ? 'image/png'
    : fileExtension === 'webp' ? 'image/webp'
    : fileExtension === 'heic' ? 'image/heic'
    : fileExtension === 'heif' ? 'image/heif' : '';
  const normalizedType = (file.type || inferredType).toLowerCase();
  if ((normalizedType && !ALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) || (!normalizedType && !file.type.startsWith('image/'))) {
    throw new Error('صيغة الملف غير مدعومة. يرجى اختيار صورة JPG أو PNG أو WEBP أو HEIC.');
  }
  if (file.size < 1024) {
    throw new Error('ملف الصورة صغير جداً أو تالف. يرجى التقاط أو اختيار صورة واضحة.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('حجم الصورة الأصلي كبير جداً (أكثر من 20 ميجابايت). يرجى اختيار صورة أصغر.');
  }

  const decoded = await loadImageFromFile(file);
  const srcWidth = decoded.width;
  const srcHeight = decoded.height;

  if (srcWidth < MIN_DIMENSION || srcHeight < MIN_DIMENSION) {
    throw new Error('أبعاد الصورة صغيرة جداً ولا تسمح بفحص الأعراض أو الحشرة بوضوح. التقط صورة أقرب.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('تعذر تهيئة معالج الصور في المتصفح.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);
  } finally {
    decoded.cleanup();
  }

  const enhanced = enhanceCanvasClarity(ctx, targetWidth, targetHeight);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  const originalKB = Math.max(1, Math.round(file.size / 1024));
  const base64Body = dataUrl.split(',')[1] || '';
  const compressedKB = Math.max(1, Math.round((base64Body.length * 3) / 4 / 1024));
  const fingerprint = computeFastFingerprint(base64Body);

  return {
    dataUrl,
    originalKB,
    compressedKB,
    width: targetWidth,
    height: targetHeight,
    enhanced,
    fingerprint,
  };
}
