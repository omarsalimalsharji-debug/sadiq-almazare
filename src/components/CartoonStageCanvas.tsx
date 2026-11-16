import React, { useEffect, useRef } from 'react';
import {
  CartoonBackdrop,
  CartoonProp,
  CartoonScene,
  FlijanMood,
  FlijanPose,
} from '../data/cartoonEpisodesData.ts';

interface CartoonStageCanvasProps {
  scene: CartoonScene;
  isPlaying: boolean;
  audioLevelRef: React.MutableRefObject<number>;
  episodeTitle: string;
  sceneIndex: number;
  totalScenes: number;
  canvasRefExternal?: React.MutableRefObject<HTMLCanvasElement | null>;
  overridePose?: FlijanPose | null;
  overrideMood?: FlijanMood | null;
}

const WIDTH = 1280;
const HEIGHT = 720;
const FLIJAN_SPRITE_SRC = '/assets/aistudio/1794816965473_a524a589.jpg';

interface MattedFlijanSprites {
  bodyCanvas: HTMLCanvasElement;
  headCanvas: HTMLCanvasElement;
  width: number;
  height: number;
}

let cachedFlijanSprites: MattedFlijanSprites | null = null;
let loadingFlijanPromise: Promise<MattedFlijanSprites | null> | null = null;

/**
 * Edge-seeded flood-fill background matting on Flijan's official portrait (800x800).
 * Preserves 100% of his bright white dishdasha, face, eyes, and teeth, while removing
 * the uniform cream studio backdrop cleanly with soft edge alpha feathering.
 */
function loadAndMatteFlijanSprites(): Promise<MattedFlijanSprites | null> {
  if (cachedFlijanSprites) return Promise.resolve(cachedFlijanSprites);
  if (loadingFlijanPromise) return loadingFlijanPromise;

  loadingFlijanPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || 800;
        const h = img.naturalHeight || 800;
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = w;
        fullCanvas.height = h;
        const fctx = fullCanvas.getContext('2d', { willReadFrequently: true });
        if (!fctx) {
          resolve(null);
          return;
        }
        fctx.drawImage(img, 0, 0, w, h);
        const imgData = fctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample corner background color (~231, 225, 215)
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const visited = new Uint8Array(w * h);
        const isBgMask = new Uint8Array(w * h);
        const stack = new Int32Array(w * h);
        let sp = 0;

        const isBackgroundPixel = (idx4: number, yPos: number): boolean => {
          const r = data[idx4];
          const g = data[idx4 + 1];
          const b = data[idx4 + 2];
          // Check distance from warm cream studio backdrop
          const dr = r - bgR;
          const dg = g - bgG;
          const db = b - bgB;
          const dist = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
          // Warm neutral tone check prevents eating darker sandal/shadow outlines
          const chromaSpread = Math.max(r, g, b) - Math.min(r, g, b);
          const lum = (r + g + b) / 3;
          // At the very bottom floor shadow (y > 94% height), allow slightly darker floor shadow to dissolve cleanly
          const maxDist = yPos > h * 0.92 ? 68 : 42;
          return dist <= maxDist && chromaSpread <= 32 && lum >= (yPos > h * 0.92 ? 155 : 190);
        };

        // Seed flood fill from all 4 outer edges
        for (let x = 0; x < w; x++) {
          const topIdx = x;
          if (!visited[topIdx] && isBackgroundPixel(topIdx * 4, 0)) {
            visited[topIdx] = 1;
            stack[sp++] = topIdx;
          }
          const botIdx = (h - 1) * w + x;
          if (!visited[botIdx] && isBackgroundPixel(botIdx * 4, h - 1)) {
            visited[botIdx] = 1;
            stack[sp++] = botIdx;
          }
        }
        for (let y = 0; y < h; y++) {
          const leftIdx = y * w;
          if (!visited[leftIdx] && isBackgroundPixel(leftIdx * 4, y)) {
            visited[leftIdx] = 1;
            stack[sp++] = leftIdx;
          }
          const rightIdx = y * w + (w - 1);
          if (!visited[rightIdx] && isBackgroundPixel(rightIdx * 4, y)) {
            visited[rightIdx] = 1;
            stack[sp++] = rightIdx;
          }
        }

        while (sp > 0) {
          const pos = stack[--sp];
          isBgMask[pos] = 1;
          const px = pos % w;
          const py = (pos - px) / w;

          if (px > 0) {
            const n = pos - 1;
            if (!visited[n] && isBackgroundPixel(n * 4, py)) {
              visited[n] = 1;
              stack[sp++] = n;
            }
          }
          if (px + 1 < w) {
            const n = pos + 1;
            if (!visited[n] && isBackgroundPixel(n * 4, py)) {
              visited[n] = 1;
              stack[sp++] = n;
            }
          }
          if (py > 0) {
            const n = pos - w;
            if (!visited[n] && isBackgroundPixel(n * 4, py - 1)) {
              visited[n] = 1;
              stack[sp++] = n;
            }
          }
          if (py + 1 < h) {
            const n = pos + w;
            if (!visited[n] && isBackgroundPixel(n * 4, py + 1)) {
              visited[n] = 1;
              stack[sp++] = n;
            }
          }
        }

        // Apply transparency + 1-pixel edge feathering
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const pos = y * w + x;
            const i4 = pos * 4;
            if (isBgMask[pos]) {
              data[i4 + 3] = 0;
            } else {
              // Count adjacent background neighbors for anti-aliased edge smoothing
              let bgNeighbors = 0;
              if (x > 0 && isBgMask[pos - 1]) bgNeighbors++;
              if (x + 1 < w && isBgMask[pos + 1]) bgNeighbors++;
              if (y > 0 && isBgMask[pos - w]) bgNeighbors++;
              if (y + 1 < h && isBgMask[pos + w]) bgNeighbors++;
              if (bgNeighbors > 0) {
                const dist =
                  Math.abs(data[i4] - bgR) +
                  Math.abs(data[i4 + 1] - bgG) +
                  Math.abs(data[i4 + 2] - bgB);
                if (dist < 75) {
                  data[i4 + 3] = bgNeighbors >= 2 ? 120 : 200;
                }
              }
            }
          }
        }
        fctx.putImageData(imgData, 0, 0);

        // Split cleanly at collar/neck line (~28.4% of height = y:227 on 800x800)
        const neckSplitY = Math.round(h * 0.285); // ~228

        const headCanvas = document.createElement('canvas');
        headCanvas.width = w;
        headCanvas.height = h;
        const hctx = headCanvas.getContext('2d');
        if (hctx) {
          hctx.drawImage(fullCanvas, 0, 0, w, neckSplitY + 4, 0, 0, w, neckSplitY + 4);
        }

        const bodyCanvas = document.createElement('canvas');
        bodyCanvas.width = w;
        bodyCanvas.height = h;
        const bctx = bodyCanvas.getContext('2d');
        if (bctx) {
          bctx.drawImage(
            fullCanvas,
            0,
            neckSplitY - 2,
            w,
            h - (neckSplitY - 2),
            0,
            neckSplitY - 2,
            w,
            h - (neckSplitY - 2)
          );
        }

        cachedFlijanSprites = { bodyCanvas, headCanvas, width: w, height: h };
        resolve(cachedFlijanSprites);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = FLIJAN_SPRITE_SRC;
  });

  return loadingFlijanPromise;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawDatePalm(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  height: number,
  sway: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(scale, scale);

  const topX = sway * 16;
  const topY = -height;

  // Trunk gradient
  const trunkGrad = ctx.createLinearGradient(-15, 0, 15, topY);
  trunkGrad.addColorStop(0, '#5c3c24');
  trunkGrad.addColorStop(0.5, '#7c5333');
  trunkGrad.addColorStop(1, '#8c623d');
  ctx.strokeStyle = trunkGrad;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(topX * 0.4 - 10, -height * 0.5, topX, topY);
  ctx.stroke();

  // Texture rings
  ctx.strokeStyle = 'rgba(62, 39, 20, 0.72)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const rx = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (topX * 0.4 - 10) + t * t * topX;
    const ry = -height * t;
    ctx.beginPath();
    ctx.moveTo(rx - 9, ry);
    ctx.lineTo(rx + 9, ry + 3);
    ctx.stroke();
  }

  // Date clusters (Omani Khalas / Fardh amber dates)
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.ellipse(topX + side * 19, topY + 24, 11, 16, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(topX + side * 16, topY + 20, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lush layered fronds
  const frondAngles = [-2.55, -2.0, -1.4, -0.75, -0.1, 0.5, 1.15, 1.85, 2.35];
  frondAngles.forEach((ang, idx) => {
    const fSway = Math.sin(sway * 1.4 + idx * 0.65) * 0.07;
    const angle = ang + fSway;
    const len = 84 + (idx % 3) * 12;
    ctx.save();
    ctx.translate(topX, topY);
    ctx.rotate(angle);
    ctx.fillStyle = idx % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.55, -24, len, 14);
    ctx.quadraticCurveTo(len * 0.5, 6, 0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  backdrop: CartoonBackdrop,
  t: number
) {
  // Rich cinematic sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.72);
  if (backdrop === 'sunny_field') {
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.55, '#7dd3fc');
    skyGrad.addColorStop(1, '#fef3c7');
  } else if (backdrop === 'greenhouse') {
    skyGrad.addColorStop(0, '#bae6fd');
    skyGrad.addColorStop(0.5, '#e0f2fe');
    skyGrad.addColorStop(1, '#ecfdf5');
  } else if (backdrop === 'palm_grove') {
    skyGrad.addColorStop(0, '#0369a1');
    skyGrad.addColorStop(0.52, '#38bdf8');
    skyGrad.addColorStop(1, '#fde68a');
  } else {
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.58, '#7dd3fc');
    skyGrad.addColorStop(1, '#e0f2fe');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Soft golden sun glow
  const sunX = backdrop === 'sunny_field' ? 210 : 1070;
  const sunY = 122;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 18, sunX, sunY, 180);
  sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
  sunGlow.addColorStop(0.45, 'rgba(251, 191, 36, 0.35)');
  sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds
  const cloudOffset = (t * 18) % (WIDTH + 320);
  const drawCloud = (cx: number, cy: number, s: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
    ctx.arc(cx + 26 * s, cy - 10 * s, 32 * s, 0, Math.PI * 2);
    ctx.arc(cx + 56 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCloud(((270 + cloudOffset) % (WIDTH + 240)) - 120, 108, 1.05);
  drawCloud(((830 + cloudOffset * 0.7) % (WIDTH + 240)) - 120, 152, 0.85);

  // Distant atmospheric Omani Hajar Mountains (far ridge)
  ctx.fillStyle = backdrop === 'greenhouse' ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.45)';
  ctx.beginPath();
  ctx.moveTo(0, 440);
  ctx.lineTo(190, 295);
  ctx.lineTo(395, 395);
  ctx.lineTo(630, 265);
  ctx.lineTo(865, 385);
  ctx.lineTo(1080, 285);
  ctx.lineTo(1280, 380);
  ctx.lineTo(1280, 520);
  ctx.lineTo(0, 520);
  ctx.closePath();
  ctx.fill();

  // Foreground Hajar foothills
  const mtnGrad = ctx.createLinearGradient(0, 310, 0, 520);
  mtnGrad.addColorStop(0, '#b08968');
  mtnGrad.addColorStop(1, '#7f5539');
  ctx.fillStyle = mtnGrad;
  ctx.beginPath();
  ctx.moveTo(0, 455);
  ctx.lineTo(150, 355);
  ctx.lineTo(340, 430);
  ctx.lineTo(540, 330);
  ctx.lineTo(790, 425);
  ctx.lineTo(1010, 345);
  ctx.lineTo(1280, 425);
  ctx.lineTo(1280, 525);
  ctx.lineTo(0, 525);
  ctx.closePath();
  ctx.fill();

  // Omani historic mud-brick watchtower / fort on hillside
  ctx.fillStyle = '#d6be9b';
  ctx.fillRect(925, 338, 92, 66);
  ctx.fillStyle = '#c2a47d';
  ctx.fillRect(988, 316, 28, 88);
  ctx.fillStyle = '#d6be9b';
  ctx.beginPath();
  ctx.arc(949, 338, 19, Math.PI, 0);
  ctx.fill();

  if (backdrop === 'greenhouse') {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 6;
    for (let x = 80; x < WIDTH; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x, 520);
      ctx.quadraticCurveTo(x + 110, 95, x + 220, 520);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220, 252, 231, 0.32)';
    ctx.fillRect(0, 180, WIDTH, 340);
  }

  // Rolling lush farm terrain
  const groundGrad = ctx.createLinearGradient(0, 460, 0, HEIGHT);
  groundGrad.addColorStop(0, '#4ade80');
  groundGrad.addColorStop(0.32, '#22c55e');
  groundGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 465, WIDTH, HEIGHT - 465);

  if (backdrop === 'oasis_falaj') {
    // Traditional stone Falaj irrigation channel
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(0, 550);
    ctx.lineTo(WIDTH, 515);
    ctx.lineTo(WIDTH, 632);
    ctx.lineTo(0, 672);
    ctx.closePath();
    ctx.fill();

    const waterGrad = ctx.createLinearGradient(0, 535, 0, 645);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.moveTo(0, 566);
    ctx.lineTo(WIDTH, 530);
    ctx.lineTo(WIDTH, 612);
    ctx.lineTo(0, 650);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 11; i++) {
      const rx = ((i * 145 + t * 145) % (WIDTH + 100)) - 50;
      const progress = rx / WIDTH;
      const ry = 605 - progress * 35;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 48, ry - 2);
      ctx.stroke();
    }
  } else {
    // Soil furrow + drip irrigation line
    ctx.fillStyle = '#78350f';
    roundRectPath(ctx, 60, 540, 1160, 48, 22);
    ctx.fill();

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(80, 563);
    ctx.lineTo(1200, 563);
    ctx.stroke();

    for (let px = 140; px <= 1140; px += 120) {
      if (Math.abs(px - 375) < 120) continue; // Keep foreground clear around Flijan
      const plantBob = Math.sin(t * 2 + px) * 2;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(px, 532 + plantBob, 21, 0, Math.PI * 2);
      ctx.arc(px - 17, 540, 14, 0, Math.PI * 2);
      ctx.arc(px + 17, 540, 14, 0, Math.PI * 2);
      ctx.fill();

      if (backdrop === 'greenhouse') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px - 6, 535 + plantBob, 5, 0, Math.PI * 2);
        ctx.arc(px + 8, 541 + plantBob, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Date palms flanking the oasis stage
  const sway = Math.sin(t * 1.3);
  drawDatePalm(ctx, 118, 488, 228, sway, 1.06);
  drawDatePalm(ctx, 1152, 488, 244, sway * 0.9 + 0.5, 1.12);
  if (backdrop === 'palm_grove') {
    drawDatePalm(ctx, 975, 470, 178, sway * 1.1, 0.86);
    drawDatePalm(ctx, 665, 466, 152, sway * 0.8 + 0.8, 0.72);
  }

  // Gentle warm sunlight pollen/dust motes floating softly
  ctx.fillStyle = 'rgba(254, 249, 195, 0.45)';
  for (let i = 0; i < 12; i++) {
    const mx = ((i * 113 + t * (14 + (i % 4) * 5)) % WIDTH);
    const my = 160 + ((i * 67 + Math.sin(t * 1.2 + i) * 30) % 340);
    ctx.beginPath();
    ctx.arc(mx, my, 2 + (i % 2) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPropVisual(
  ctx: CanvasRenderingContext2D,
  prop: CartoonProp,
  t: number
) {
  const cx = 915;
  const cy = 335 + Math.sin(t * 2.2) * 9;

  ctx.save();
  // Showcase circular lens plaque
  const ringGrad = ctx.createRadialGradient(cx, cy - 20, 12, cx, cy, 126);
  ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  ringGrad.addColorStop(1, 'rgba(236, 253, 245, 0.92)');
  ctx.fillStyle = ringGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = prop === 'dubas_bug' ? '#f59e0b' : '#10b981';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.translate(cx, cy);

  if (prop === 'dubas_bug') {
    // Detailed Date Palm Frond with Dubas Nymphs & Honeydew Inspection Ring
    ctx.save();
    ctx.rotate(-0.22);
    // Rachis (central palm frond stem)
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-78, 22);
    ctx.quadraticCurveTo(0, -10, 80, -24);
    ctx.stroke();

    // Palm leaflets (Khoos)
    for (let i = -3; i <= 3; i++) {
      const lx = i * 20;
      const ly = -i * 5;
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#22c55e';
      ctx.beginPath();
      ctx.ellipse(lx, ly - 24, 7, 28, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(lx + 4, ly + 24, 7, 26, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Honeydew glistening drop alert
    const dewPulse = 1 + Math.sin(t * 4) * 0.12;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.78)';
    ctx.beginPath();
    ctx.arc(14, 10, 10 * dewPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(11, 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Stylized Dubas nymph (pale amber/tan oval body with dark dorsal stripes & wax filaments)
    const drawNymph = (nx: number, ny: number, angle: number, s: number) => {
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(angle);
      ctx.scale(s, s);
      // Wax tail threads
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      for (const dy of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(-14, dy);
        ctx.lineTo(-26, dy * 1.6);
        ctx.stroke();
      }
      // Body
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-6, -7, 3, 14);
      ctx.fillRect(2, -7, 3, 14);
      // Eyes
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(12, -4, 2.2, 0, Math.PI * 2);
      ctx.arc(12, 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawNymph(-16, -6, 0.15 + Math.sin(t * 5) * 0.04, 1.15);
    drawNymph(26, -16, -0.25, 0.9);
    ctx.restore();

    // Caption badge inside showcase
    ctx.fillStyle = 'rgba(180, 83, 9, 0.92)';
    roundRectPath(ctx, -64, 52, 128, 28, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('فحص دوباس النخيل', 0, 71);
  } else if (prop === 'water_drop') {
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, -68);
    ctx.bezierCurveTo(48, -10, 54, 48, 0, 60);
    ctx.bezierCurveTo(-54, 48, -48, -10, 0, -68);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.beginPath();
    ctx.ellipse(-16, 8, 9, 19, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'magnifying_glass') {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 50, 29, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(8, -2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(-4, -4, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, 32);
    ctx.lineTo(66, 68);
    ctx.stroke();
  } else if (prop === 'bee') {
    const wingFlutter = Math.sin(t * 28) * 10;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
    ctx.beginPath();
    ctx.ellipse(-12, -26 + wingFlutter * 0.3, 22, 14, -0.4, 0, Math.PI * 2);
    ctx.ellipse(16, -24 - wingFlutter * 0.3, 20, 13, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(0, 6, 38, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-14, -17, 10, 46);
    ctx.fillRect(6, -16, 10, 44);
    ctx.beginPath();
    ctx.arc(-28, 2, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'sun_shield') {
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.lineTo(54, -38);
    ctx.quadraticCurveTo(52, 34, 0, 66);
    ctx.quadraticCurveTo(-52, 34, -54, -38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 2);
    ctx.lineTo(-4, 20);
    ctx.lineTo(24, -16);
    ctx.stroke();
  } else if (prop === 'fertilizer_bag') {
    ctx.fillStyle = '#d97706';
    roundRectPath(ctx, -40, -45, 80, 96, 16);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(0, 5, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(-6, 5, 10, 6, -0.5, 0, Math.PI * 2);
    ctx.ellipse(6, 5, 10, 6, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawDatePalm(ctx, 0, 60, 92, Math.sin(t * 2) * 0.4, 0.6);
  }

  ctx.restore();
}

/**
 * Draws the official 3D-style Omani Flijan mascot sprite with articulated head/body,
 * expressive pose lean, calibrated blinking eyelids, mood eyebrows, and RMS lip-sync mouth.
 */
function drawModernFlijanSprite(
  ctx: CanvasRenderingContext2D,
  sprites: MattedFlijanSprites,
  anchorX: number,
  groundY: number,
  t: number,
  pose: FlijanPose,
  mood: FlijanMood,
  mouthOpen: number,
  isPlaying: boolean
) {
  // Display scale: 800x800 sprite maps onto ~490px tall figure on stage (1280x720)
  const targetSize = 515;
  const s = targetSize / sprites.height; // ~0.64375

  // Natural rhythmic breathing + talking bounce + expressive pose kinematics
  const talkEnergy = isPlaying ? 0.45 + mouthOpen * 0.9 : 0.2;
  const breathY = Math.sin(t * 2.8) * 3.2 - mouthOpen * 4.5;
  let bodyTilt = Math.sin(t * 1.7) * 0.014;
  let headTilt = Math.sin(t * 2.3) * 0.028;
  let headNodY = Math.sin(t * 3.1) * 1.5;

  if (pose === 'wave') {
    bodyTilt = Math.sin(t * 4.2) * 0.028;
    headTilt = -0.04 + Math.sin(t * 4.2) * 0.035;
  } else if (pose === 'explain') {
    bodyTilt = 0.025 + Math.sin(t * 3.6) * 0.02 * talkEnergy;
    headTilt = 0.04 + Math.sin(t * 4.6) * 0.035;
  } else if (pose === 'inspect') {
    bodyTilt = 0.045;
    headTilt = 0.075 + Math.sin(t * 2.2) * 0.02;
    headNodY += 3;
  } else if (pose === 'celebrate') {
    bodyTilt = Math.sin(t * 5.2) * 0.032;
    headTilt = Math.sin(t * 5.2) * 0.05;
    headNodY -= Math.abs(Math.sin(t * 5.2)) * 5;
  } else if (pose === 'caution') {
    bodyTilt = -0.02;
    headTilt = -0.03 + Math.sin(t * 3.8) * 0.02;
  }

  // Exact pivot coordinates in the 800x800 sprite:
  // Feet rest near y=760; Neck collar pivot is at (400, 226)
  const spriteFeetY = 762;
  const spriteCenterX = sprites.width / 2; // 400
  const neckPivotX = 400;
  const neckPivotY = 226;

  ctx.save();
  ctx.translate(anchorX, groundY);

  // Soft realistic ground shadow under Flijan's sandals
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, -4, 88, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle warm speech aura when Flijan is actively explaining
  if (isPlaying && mouthOpen > 0.08) {
    const aura = ctx.createRadialGradient(0, -250, 20, 0, -250, 195);
    aura.addColorStop(0, `rgba(16, 185, 129, ${0.14 * mouthOpen})`);
    aura.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -250, 195, 0, Math.PI * 2);
    ctx.fill();
  }

  // Apply body posture transform relative to feet anchor
  ctx.translate(0, breathY);
  ctx.rotate(bodyTilt);
  ctx.scale(s, s);
  ctx.translate(-spriteCenterX, -spriteFeetY);

  // 1) Draw Body Layer (white Omani dishdasha, furakha, arms, hands, sandals)
  ctx.drawImage(sprites.bodyCanvas, 0, 0);

  // 2) Draw Articulated Head Layer pivoted cleanly at neck collar (400, 226)
  ctx.save();
  ctx.translate(neckPivotX, neckPivotY + headNodY);
  ctx.rotate(headTilt);
  ctx.translate(-neckPivotX, -neckPivotY);

  ctx.drawImage(sprites.headCanvas, 0, 0);

  // 3) Calibrated Facial Rig on 800x800 Head Coordinates:
  //    Left eye center:  (374, 143)
  //    Right eye center: (421, 143)
  //    Mouth center:     (397, 181)
  const blinkPhase = t % 3.6;
  const isBlinking = blinkPhase > 3.44;
  if (isBlinking) {
    const blinkAmt = Math.sin(((blinkPhase - 3.44) / 0.16) * Math.PI);
    ctx.save();
    ctx.globalAlpha = Math.min(1, blinkAmt * 1.15);
    for (const ex of [374, 421]) {
      const ey = 143;
      const lidGrad = ctx.createRadialGradient(ex, ey - 2, 2, ex, ey, 16);
      lidGrad.addColorStop(0, '#dd9468');
      lidGrad.addColorStop(1, '#ba7147');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clean dark closed lash arc
      ctx.strokeStyle = '#331d12';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey - 1, 11, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Expressive eyebrow cues for warning / curious moods
  if (mood === 'warning' || mood === 'curious') {
    ctx.save();
    ctx.strokeStyle = 'rgba(42, 24, 14, 0.65)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    if (mood === 'warning') {
      // Gentle concerned inward brow line
      ctx.beginPath();
      ctx.moveTo(362, 123);
      ctx.lineTo(385, 126);
      ctx.moveTo(432, 123);
      ctx.lineTo(409, 126);
      ctx.stroke();
    } else {
      // Raised curious brow accent above right eye
      ctx.beginPath();
      ctx.moveTo(410, 120);
      ctx.quadraticCurveTo(421, 115, 432, 121);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4) Audio-Reactive Lip Sync Overlay (preserves crisp portrait smile when silent)
  const openAmt = Math.max(0, Math.min(1, mouthOpen));
  if (openAmt > 0.045 || mood === 'warning') {
    const mx = 397;
    const my = 181;
    // Soft feathered skin patch seamlessly covering static portrait mouth
    const patchGrad = ctx.createRadialGradient(mx, my, 4, mx, my, 17);
    patchGrad.addColorStop(0, '#dd946a');
    patchGrad.addColorStop(0.75, 'rgba(218, 142, 98, 0.94)');
    patchGrad.addColorStop(1, 'rgba(218, 142, 98, 0)');
    ctx.fillStyle = patchGrad;
    ctx.beginPath();
    ctx.ellipse(mx, my, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    if (openAmt > 0.045) {
      // Animated speaking mouth driven live by RMS audio amplitude
      const jawOpen = 2.5 + openAmt * 7.5;
      const mouthHalfW = 10.5 - openAmt * 1.4;

      // Inner dark mouth cavity
      ctx.fillStyle = '#5c1412';
      ctx.beginPath();
      ctx.ellipse(mx, my + 0.5, mouthHalfW, jawOpen, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm tongue tint on wide vowels
      if (openAmt > 0.25) {
        ctx.fillStyle = '#c95c5c';
        ctx.beginPath();
        ctx.ellipse(mx, my + jawOpen * 0.45, mouthHalfW * 0.65, jawOpen * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crisp upper teeth highlight
      ctx.fillStyle = '#fff9f5';
      ctx.beginPath();
      ctx.roundRect(mx - mouthHalfW * 0.72, my - jawOpen * 0.72, mouthHalfW * 1.44, Math.min(3.5, jawOpen * 0.55), 1.5);
      ctx.fill();

      // Natural lip outline
      ctx.strokeStyle = '#7c2d20';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(mx, my + 0.5, mouthHalfW, jawOpen, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mood === 'warning') {
      // Focused empathetic O / slight concern curve when paused on a warning beat
      ctx.strokeStyle = '#7c2d20';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(mx, my + 4, 8, Math.PI + 0.35, -0.35);
      ctx.stroke();
    }
  }

  ctx.restore(); // end head
  ctx.restore(); // end character
}

export const CartoonStageCanvas: React.FC<CartoonStageCanvasProps> = ({
  scene,
  isPlaying,
  audioLevelRef,
  episodeTitle,
  sceneIndex,
  totalScenes,
  canvasRefExternal,
  overridePose = null,
  overrideMood = null,
}) => {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedMouthRef = useRef<number>(0);
  const spritesRef = useRef<MattedFlijanSprites | null>(cachedFlijanSprites);
  const camStateRef = useRef<{ scale: number; tx: number; ty: number }>({ scale: 1, tx: 0, ty: 0 });
  const fadeAlphaRef = useRef<number>(0);
  const prevSceneIdRef = useRef<string>('');

  useEffect(() => {
    let mounted = true;
    loadAndMatteFlijanSprites().then((sprites) => {
      if (mounted && sprites) {
        spritesRef.current = sprites;
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const key = `${scene.id}:${sceneIndex}`;
    if (prevSceneIdRef.current && prevSceneIdRef.current !== key) {
      fadeAlphaRef.current = 0.55;
    }
    prevSceneIdRef.current = key;
  }, [scene.id, sceneIndex]);

  useEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    if (canvasRefExternal) {
      canvasRefExternal.current = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let lastDrawAt = 0;
    let elapsedSec = 0;
    let isInViewport = true;
    let isPageVisible = !document.hidden;

    const effectivePose = overridePose || scene.flijanPose;
    const effectiveMood = overrideMood || scene.flijanMood;
    const preset =
      scene.cameraPreset ||
      (effectivePose === 'inspect'
        ? 'prop_focus'
        : effectivePose === 'explain'
          ? 'flijan_close'
          : effectivePose === 'celebrate'
            ? 'pan_oasis'
            : 'wide');

    const renderFrame = (now: number) => {
      animId = 0;
      if (!isInViewport || !isPageVisible) return;
      if (now - lastDrawAt < 1000 / 30) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }
      lastDrawAt = now;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (isPlaying) {
        elapsedSec += dt;
      } else {
        elapsedSec += dt * 0.32;
      }

      const targetMouth = isPlaying ? audioLevelRef.current : 0;
      smoothedMouthRef.current += (targetMouth - smoothedMouthRef.current) * 0.36;

      // Determine smooth camera framing transform for background + character stage
      let targetScale = 1.0;
      let targetTx = 0;
      let targetTy = 0;
      if (preset === 'flijan_close') {
        targetScale = 1.18;
        targetTx = 120;
        targetTy = -26;
      } else if (preset === 'prop_focus') {
        targetScale = 1.16;
        targetTx = -110;
        targetTy = 10;
      } else if (preset === 'pan_oasis') {
        targetScale = 1.06;
        targetTx = Math.sin(elapsedSec * 0.45) * 28;
        targetTy = -8;
      }

      const lerpAlpha = 1 - Math.exp(-dt * 3.8);
      camStateRef.current.scale += (targetScale - camStateRef.current.scale) * lerpAlpha;
      camStateRef.current.tx += (targetTx - camStateRef.current.tx) * lerpAlpha;
      camStateRef.current.ty += (targetTy - camStateRef.current.ty) * lerpAlpha;

      fadeAlphaRef.current = Math.max(0, fadeAlphaRef.current - dt * 1.9);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Apply camera zoom & gentle pan to the world + Flijan stage
      ctx.save();
      ctx.translate(WIDTH / 2 + camStateRef.current.tx, HEIGHT / 2 + camStateRef.current.ty);
      ctx.scale(camStateRef.current.scale, camStateRef.current.scale);
      ctx.translate(-WIDTH / 2, -HEIGHT / 2);

      drawBackdrop(ctx, scene.backdrop, elapsedSec);
      drawPropVisual(ctx, scene.prop, elapsedSec);

      if (spritesRef.current) {
        drawModernFlijanSprite(
          ctx,
          spritesRef.current,
          380,
          632,
          elapsedSec,
          effectivePose,
          effectiveMood,
          smoothedMouthRef.current,
          isPlaying
        );
      }
      ctx.restore();

      // Smooth crossfade aperture veil on scene transitions
      if (fadeAlphaRef.current > 0.01) {
        ctx.save();
        ctx.fillStyle = `rgba(11, 19, 41, ${fadeAlphaRef.current.toFixed(3)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.restore();
      }

      // Clean top-right Flijan scene heading plaque (RTL)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.76)';
      roundRectPath(ctx, 44, 30, 560, 84, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.72)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 17px Tahoma, Arial, sans-serif';
      ctx.fillText('فليجان · الإرشاد الزراعي العُماني', 580, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px Tahoma, Arial, sans-serif';
      ctx.fillText(scene.sceneHeading.replace(/^المشهد\s+\S+[:\-]?\s*/, ''), 580, 96);
      ctx.restore();

      // Top-left episode badge + subtle speaking voice meter
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.64)';
      roundRectPath(ctx, 888, 30, 348, 48, 14);
      ctx.fill();
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Tahoma, Arial, sans-serif';
      ctx.fillText(
        episodeTitle.length > 32 ? `${episodeTitle.slice(0, 32)}...` : episodeTitle,
        1062,
        59
      );

      // Animated voice activity bars when speaking
      if (isPlaying) {
        for (let b = 0; b < 5; b++) {
          const barH = 6 + Math.max(2, smoothedMouthRef.current * 18 * (0.6 + ((b * 37) % 10) / 14));
          ctx.fillStyle = '#34d399';
          roundRectPath(ctx, 904 + b * 7, 54 - barH / 2, 4, barH, 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Step dots indicator top center-right under plaque
      if (totalScenes > 1) {
        ctx.save();
        for (let i = 0; i < totalScenes; i++) {
          const dotX = 564 - i * 20;
          const activeDot = i === sceneIndex;
          ctx.fillStyle = activeDot ? '#34d399' : 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.arc(dotX, 130, activeDot ? 5.5 : 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(renderFrame);
    };

    const scheduleFrame = () => {
      if (isInViewport && isPageVisible && animId === 0) {
        animId = requestAnimationFrame(renderFrame);
      }
    };
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          isInViewport = entries.some((entry) => entry.isIntersecting);
          if (isInViewport) scheduleFrame();
          else if (animId) {
            cancelAnimationFrame(animId);
            animId = 0;
          }
        }, { threshold: 0.05 })
      : null;
    observer?.observe(canvas);

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (!isPageVisible && animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      } else if (isPageVisible) {
        lastTime = performance.now();
        lastDrawAt = lastTime - 1000 / 30;
        scheduleFrame();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleFrame();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    scene,
    isPlaying,
    episodeTitle,
    sceneIndex,
    totalScenes,
    audioLevelRef,
    canvasRefExternal,
    overridePose,
    overrideMood,
  ]);

  return (
    <canvas
      ref={internalRef}
      width={WIDTH}
      height={HEIGHT}
      className="w-full aspect-video rounded-2xl bg-stone-950 shadow-lg border border-stone-200 dark:border-stone-800 block"
    />
  );
};
