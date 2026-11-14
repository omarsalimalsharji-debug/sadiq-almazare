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
}

const WIDTH = 1280;
const HEIGHT = 720;

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

  // Curved trunk with segments
  const topX = sway * 18;
  const topY = -height;
  ctx.strokeStyle = '#7c5333';
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(topX * 0.4 - 12, -height * 0.5, topX, topY);
  ctx.stroke();

  // Trunk texture rings
  ctx.strokeStyle = '#5a3a21';
  ctx.lineWidth = 3;
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const rx = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (topX * 0.4 - 12) + t * t * topX;
    const ry = -height * t;
    ctx.beginPath();
    ctx.moveTo(rx - 9, ry);
    ctx.lineTo(rx + 9, ry + 3);
    ctx.stroke();
  }

  // Date clusters (golden-amber)
  ctx.fillStyle = '#d97706';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(topX + side * 18, topY + 24, 10, 15, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fronds
  const frondAngles = [-2.5, -1.9, -1.2, -0.5, 0.2, 0.8, 1.5, 2.2];
  frondAngles.forEach((ang, idx) => {
    const fSway = Math.sin(sway * 1.4 + idx * 0.7) * 0.08;
    const angle = ang + fSway;
    const len = 82 + (idx % 2) * 14;
    ctx.save();
    ctx.translate(topX, topY);
    ctx.rotate(angle);
    ctx.fillStyle = idx % 2 === 0 ? '#15803d' : '#16a34a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.55, -24, len, 12);
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
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.7);
  if (backdrop === 'sunny_field') {
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(1, '#fef3c7');
  } else if (backdrop === 'greenhouse') {
    skyGrad.addColorStop(0, '#e0f2fe');
    skyGrad.addColorStop(1, '#f0fdf4');
  } else {
    skyGrad.addColorStop(0, '#0ea5e9');
    skyGrad.addColorStop(1, '#bae6fd');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Sun with gentle rays
  const sunX = backdrop === 'sunny_field' ? 210 : 1080;
  const sunY = 115;
  const pulse = 1 + Math.sin(t * 2) * 0.05;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 74 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds
  const cloudOffset = (t * 22) % (WIDTH + 300);
  const drawCloud = (cx: number, cy: number, s: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
    ctx.arc(cx + 26 * s, cy - 10 * s, 32 * s, 0, Math.PI * 2);
    ctx.arc(cx + 56 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCloud(((280 + cloudOffset) % (WIDTH + 220)) - 120, 110, 1);
  drawCloud(((820 + cloudOffset * 0.7) % (WIDTH + 220)) - 120, 155, 0.8);

  // Distant Omani Hajar Mountains
  ctx.fillStyle = backdrop === 'greenhouse' ? '#cbd5e1' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, 440);
  ctx.lineTo(180, 320);
  ctx.lineTo(360, 410);
  ctx.lineTo(590, 290);
  ctx.lineTo(840, 405);
  ctx.lineTo(1060, 315);
  ctx.lineTo(1280, 395);
  ctx.lineTo(1280, 520);
  ctx.lineTo(0, 520);
  ctx.closePath();
  ctx.fill();

  // Omani Fort silhouette on hill
  ctx.fillStyle = '#d6c3a5';
  ctx.fillRect(910, 330, 88, 65);
  ctx.beginPath();
  ctx.arc(935, 330, 18, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(972, 310, 26, 85);

  if (backdrop === 'greenhouse') {
    // Greenhouse arches & glass ribs
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 6;
    for (let x = 80; x < WIDTH; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x, 520);
      ctx.quadraticCurveTo(x + 110, 90, x + 220, 520);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(220, 252, 231, 0.35)';
    ctx.fillRect(0, 180, WIDTH, 340);
  }

  // Rolling agricultural ground
  const groundGrad = ctx.createLinearGradient(0, 460, 0, HEIGHT);
  groundGrad.addColorStop(0, '#4ade80');
  groundGrad.addColorStop(0.35, '#22c55e');
  groundGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 465, WIDTH, HEIGHT - 465);

  // Soil beds or Falaj water channel
  if (backdrop === 'oasis_falaj') {
    // Traditional Omani stone Falaj channel
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(0, 545);
    ctx.lineTo(WIDTH, 515);
    ctx.lineTo(WIDTH, 625);
    ctx.lineTo(0, 665);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 562);
    ctx.lineTo(WIDTH, 530);
    ctx.lineTo(WIDTH, 608);
    ctx.lineTo(0, 646);
    ctx.closePath();
    ctx.fill();

    // Animated water ripples
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const rx = ((i * 150 + t * 140) % (WIDTH + 100)) - 50;
      const progress = rx / WIDTH;
      const ry = 602 - progress * 34;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 46, ry - 2);
      ctx.stroke();
    }
  } else {
    // Rich soil crop rows with drip line
    ctx.fillStyle = '#78350f';
    roundRectPath(ctx, 70, 535, 1140, 48, 20);
    ctx.fill();

    // Drip irrigation black pipe + tiny droplets
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(90, 558);
    ctx.lineTo(1190, 558);
    ctx.stroke();

    // Small tomato / green plants along row
    for (let px = 140; px <= 1140; px += 120) {
      if (Math.abs(px - 420) < 95) continue; // Leave space for Flijan
      const plantBob = Math.sin(t * 2 + px) * 2;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(px, 530 + plantBob, 20, 0, Math.PI * 2);
      ctx.arc(px - 16, 538, 13, 0, Math.PI * 2);
      ctx.arc(px + 16, 538, 13, 0, Math.PI * 2);
      ctx.fill();

      if (backdrop === 'greenhouse') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px - 6, 533 + plantBob, 5, 0, Math.PI * 2);
        ctx.arc(px + 8, 539 + plantBob, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Date palms flanking the scene
  const sway = Math.sin(t * 1.3);
  drawDatePalm(ctx, 135, 485, 225, sway, 1.05);
  drawDatePalm(ctx, 1140, 485, 240, sway * 0.9 + 0.5, 1.1);
  if (backdrop === 'palm_grove') {
    drawDatePalm(ctx, 955, 470, 175, sway * 1.1, 0.85);
  }
}

function drawPropVisual(
  ctx: CanvasRenderingContext2D,
  prop: CartoonProp,
  t: number
) {
  const cx = 870;
  const cy = 340 + Math.sin(t * 2.4) * 10;

  ctx.save();
  // Floating circular showcase badge behind prop
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.shadowColor = 'rgba(0,0,0,0.14)';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.translate(cx, cy);

  if (prop === 'water_drop') {
    // Sparkling water drop + drip emitter
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, -64);
    ctx.bezierCurveTo(46, -10, 52, 46, 0, 58);
    ctx.bezierCurveTo(-52, 46, -46, -10, 0, -64);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-15, 8, 8, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'magnifying_glass') {
    // Leaf under magnifying glass
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 48, 28, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(8, -2, 10, 0, Math.PI * 2);
    ctx.fill();
    // Glass rim + handle
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(-4, -4, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28, 30);
    ctx.lineTo(62, 66);
    ctx.stroke();
  } else if (prop === 'bee') {
    const wingFlutter = Math.sin(t * 28) * 10;
    // Wings
    ctx.fillStyle = 'rgba(186, 230, 253, 0.9)';
    ctx.beginPath();
    ctx.ellipse(-12, -26 + wingFlutter * 0.3, 22, 14, -0.4, 0, Math.PI * 2);
    ctx.ellipse(16, -24 - wingFlutter * 0.3, 20, 13, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Bee body
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
    // Protective green leaf shield
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(52, -36);
    ctx.quadraticCurveTo(50, 34, 0, 64);
    ctx.quadraticCurveTo(-50, 34, -52, -36);
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
    // Palm icon prop
    drawDatePalm(ctx, 0, 55, 85, Math.sin(t * 2) * 0.4, 0.55);
  }

  ctx.restore();
}

function drawFlijanCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  pose: FlijanPose,
  mood: FlijanMood,
  mouthOpen: number
) {
  const bob = Math.sin(t * 3.2) * 4;
  // Natural blink every ~3.4 seconds
  const blinkPhase = t % 3.4;
  const isBlinking = blinkPhase > 3.22;

  ctx.save();
  ctx.translate(x, y + bob);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 148 - bob, 68, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sandals (N'aal Omani)
  ctx.fillStyle = '#78350f';
  roundRectPath(ctx, -38, 130, 30, 14, 6);
  ctx.fill();
  roundRectPath(ctx, 8, 130, 30, 14, 6);
  ctx.fill();

  // Omani Dishdasha (clean white robe)
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-42, -16);
  ctx.lineTo(42, -16);
  ctx.lineTo(58, 132);
  ctx.lineTo(-58, 132);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Collar + Omani Furakha (tassel)
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -14, 18, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 4);
  ctx.lineTo(10, 34);
  ctx.stroke();
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(10, 36, 5, 0, Math.PI * 2);
  ctx.fill();

  // Left & Right Animated Arms
  const waveAngle = pose === 'wave' ? Math.sin(t * 7) * 0.35 - 1.15 : pose === 'celebrate' ? -1.35 + Math.sin(t * 6) * 0.2 : -0.35 + Math.sin(t * 2.5) * 0.12;
  const rightArmAngle = pose === 'explain' ? 0.55 + Math.sin(t * 4) * 0.18 : pose === 'celebrate' ? 1.35 - Math.sin(t * 6) * 0.2 : pose === 'caution' ? 0.85 : 0.3;

  // Left Arm
  ctx.save();
  ctx.translate(-40, -6);
  ctx.rotate(waveAngle);
  ctx.fillStyle = '#f8fafc';
  roundRectPath(ctx, -12, 0, 22, 64, 10);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();
  ctx.fillStyle = '#e7b98a';
  ctx.beginPath();
  ctx.arc(-1, 66, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right Arm
  ctx.save();
  ctx.translate(40, -6);
  ctx.rotate(-rightArmAngle);
  ctx.fillStyle = '#f8fafc';
  roundRectPath(ctx, -10, 0, 22, 64, 10);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();
  ctx.fillStyle = '#e7b98a';
  ctx.beginPath();
  ctx.arc(1, 66, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.fillStyle = '#dfa977';
  roundRectPath(ctx, -13, -32, 26, 22, 8);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#dfa977';
  ctx.beginPath();
  ctx.arc(-44, -68, 9, 0, Math.PI * 2);
  ctx.arc(44, -68, 9, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#ecc298';
  ctx.beginPath();
  ctx.ellipse(0, -72, 44, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rosy friendly cheeks
  ctx.fillStyle = 'rgba(244, 114, 182, 0.24)';
  ctx.beginPath();
  ctx.ellipse(-25, -58, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.ellipse(25, -58, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Omani Kummah (embroidered cap)
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.moveTo(-43, -94);
  ctx.quadraticCurveTo(-40, -134, 0, -136);
  ctx.quadraticCurveTo(40, -134, 43, -94);
  ctx.closePath();
  ctx.fill();
  // Gold & emerald embroidery band on Kummah
  ctx.fillStyle = '#f59e0b';
  roundRectPath(ctx, -43, -102, 86, 11, 5);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  for (let gx = -30; gx <= 30; gx += 15) {
    ctx.beginPath();
    ctx.arc(gx, -114, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (with natural blinking)
  for (const side of [-1, 1]) {
    const ex = side * 16;
    const ey = -75;
    if (isBlinking) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex - 8, ey);
      ctx.lineTo(ex + 8, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(ex + 1, ey + 1, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 3, ey - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expressive eyebrows
    ctx.strokeStyle = '#3f2718';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'warning') {
      ctx.moveTo(ex - 9, ey - 16 + side * 3);
      ctx.lineTo(ex + 9, ey - 16 - side * 3);
    } else if (mood === 'curious') {
      ctx.moveTo(ex - 9, ey - 16 - (side === 1 ? 4 : 0));
      ctx.lineTo(ex + 9, ey - 18 - (side === 1 ? 4 : 0));
    } else {
      ctx.moveTo(ex - 9, ey - 15);
      ctx.quadraticCurveTo(ex, ey - 20, ex + 9, ey - 15);
    }
    ctx.stroke();
  }

  // Nose
  ctx.strokeStyle = '#c68a58';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -64, 4, -0.3, Math.PI + 0.3);
  ctx.stroke();

  // Neat cheerful smile & audio-reactive lip-sync mouth
  const openAmt = Math.max(0, Math.min(1, mouthOpen));
  if (openAmt > 0.06) {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(0, -47, 13, 4 + openAmt * 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // Teeth highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -50, 16, 3);
  } else {
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (mood === 'warning') {
      ctx.arc(0, -43, 9, Math.PI + 0.3, -0.3);
    } else {
      ctx.arc(0, -51, 12, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();
  }

  // Name badge on dishdasha pocket
  ctx.fillStyle = '#065f46';
  roundRectPath(ctx, -28, 32, 24, 14, 4);
  ctx.fill();

  ctx.restore();
}

export const CartoonStageCanvas: React.FC<CartoonStageCanvasProps> = ({
  scene,
  isPlaying,
  audioLevelRef,
  episodeTitle,
  sceneIndex,
  totalScenes,
  canvasRefExternal,
}) => {
  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedMouthRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());

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
    let elapsedSec = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (isPlaying) {
        elapsedSec += dt;
      } else {
        // Gentle idle breathing even when paused
        elapsedSec += dt * 0.25;
      }

      // Smooth audio lip-sync
      const targetMouth = isPlaying ? audioLevelRef.current : 0;
      smoothedMouthRef.current += (targetMouth - smoothedMouthRef.current) * 0.32;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawBackdrop(ctx, scene.backdrop, elapsedSec);
      drawPropVisual(ctx, scene.prop, elapsedSec);
      drawFlijanCharacter(
        ctx,
        390,
        435,
        elapsedSec,
        scene.flijanPose,
        scene.flijanMood,
        smoothedMouthRef.current
      );

      // Clean cartoon scene plaque at top-right (RTL)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      roundRectPath(ctx, 48, 32, 540, 82, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 18px Tahoma, Arial, sans-serif';
      ctx.fillText('فليجان · إرشاد المزارع العُماني', 564, 62);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px Tahoma, Arial, sans-serif';
      ctx.fillText(scene.sceneHeading.replace(/^المشهد\s+\S+[:\-]?\s*/, ''), 564, 96);
      ctx.restore();

      // Episode title subtle watermark top-left
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      roundRectPath(ctx, 920, 32, 320, 44, 12);
      ctx.fill();
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 17px Tahoma, Arial, sans-serif';
      ctx.fillText(
        episodeTitle.length > 34 ? `${episodeTitle.slice(0, 34)}...` : episodeTitle,
        1080,
        60
      );
      ctx.restore();

      animId = requestAnimationFrame(renderFrame);
    };

    startTimeRef.current = performance.now();
    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [scene, isPlaying, episodeTitle, sceneIndex, totalScenes, audioLevelRef, canvasRefExternal]);

  return (
    <canvas
      ref={internalRef}
      width={WIDTH}
      height={HEIGHT}
      className="w-full aspect-video rounded-2xl bg-stone-950 shadow-lg border border-stone-200 dark:border-stone-800 block"
    />
  );
};
