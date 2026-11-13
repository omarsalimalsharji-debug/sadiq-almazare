/**
 * Client-side plant photo compression & clarity enhancement utility.
 * Preserves natural disease/leaf hues while improving exposure & sharpness
 * and shrinking payload size for fast Gemini Vision inference.
 */

export interface ProcessedPlantImage {
  dataUrl: string;
  originalKB: number;
  compressedKB: number;
  width: number;
  height: number;
  enhanced: boolean;
}

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة ملف الصورة. تأكد من سلامة الصورة بصيغة JPG أو PNG.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Applies gentle auto-exposure normalization (only when photo is noticeably dim)
 * plus subtle crispness enhancement without distorting natural chlorosis/lesion colors.
 */
function enhanceCanvasClarity(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const totalPixels = width * height;
    if (totalPixels === 0) return false;

    // Sample average luminance (every 8th pixel for speed)
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
    // Gentle gain only if underexposed (< 105), or mild contrast stretch around midpoint
    const brightnessGain = avgLum < 95 ? Math.min(1.22, 108 / Math.max(avgLum, 45)) : 1.0;
    const contrastFactor = 1.07;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] * brightnessGain;
      let g = data[i + 1] * brightnessGain;
      let b = data[i + 2] * brightnessGain;

      // Subtle contrast pivot around 128 preserving channel ratios
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
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WEBP).');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('حجم الصورة الأصلي كبير جداً (أكثر من 20 ميجابايت).');
  }

  const img = await loadImageFromFile(file);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

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
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const enhanced = enhanceCanvasClarity(ctx, targetWidth, targetHeight);
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  const originalKB = Math.max(1, Math.round(file.size / 1024));
  const base64Body = dataUrl.split(',')[1] || '';
  const compressedKB = Math.max(1, Math.round((base64Body.length * 3) / 4 / 1024));

  return {
    dataUrl,
    originalKB,
    compressedKB,
    width: targetWidth,
    height: targetHeight,
    enhanced,
  };
}
