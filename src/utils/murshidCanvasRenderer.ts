import { MurshidExpression } from '../data/murshidDialogue.ts';

export type StageCharacterPose =
  | 'welcome'
  | 'wave'
  | 'explain'
  | 'inspect'
  | 'think'
  | 'surprised'
  | 'encourage'
  | 'gentle_sad'
  | 'celebrate'
  | 'caution'
  | 'idle';

export function resolveStageExpression(
  pose: StageCharacterPose,
  mood: MurshidExpression | string
): MurshidExpression {
  const valid: MurshidExpression[] = [
    'welcome',
    'smile',
    'explain',
    'think',
    'surprised',
    'encourage',
    'gentle_sad',
    'celebrate',
    'speak',
    'idle',
  ];
  if (valid.includes(mood as MurshidExpression)) return mood as MurshidExpression;
  if (mood === 'warning') return pose === 'caution' ? 'surprised' : 'gentle_sad';
  if (mood === 'curious') return 'think';
  if (mood === 'proud') return 'celebrate';
  if (mood === 'happy') return 'smile';
  if (pose === 'wave' || pose === 'welcome') return 'welcome';
  if (pose === 'celebrate') return 'celebrate';
  if (pose === 'think' || pose === 'inspect') return 'think';
  return 'explain';
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/**
 * Unified Vector Canvas Renderer for «مُرشد»
 * Matches MurshidCharacterSvg proportions, colors, hat & emerald field vest 1:1 on the 1280x720 stage.
 */
export function drawModernMurshidCharacter(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  groundY: number,
  t: number,
  pose: StageCharacterPose,
  mood: MurshidExpression | string,
  mouthOpen: number,
  isPlaying: boolean
) {
  const expr = resolveStageExpression(pose, mood);
  const openAmt = Math.max(0, Math.min(1, mouthOpen));
  const breathY = Math.sin(t * 2.6) * 3.5 - openAmt * 3.5;

  let bodyTilt = Math.sin(t * 1.5) * 0.015;
  let headTilt = Math.sin(t * 2.1) * 0.025;
  let headNodY = Math.sin(t * 3.0) * 1.8;

  if (pose === 'wave' || expr === 'welcome') {
    bodyTilt = Math.sin(t * 3.6) * 0.025;
    headTilt = -0.04 + Math.sin(t * 3.6) * 0.03;
  } else if (pose === 'inspect' || expr === 'think') {
    bodyTilt = 0.04;
    headTilt = 0.075 + Math.sin(t * 1.8) * 0.02;
    headNodY += 3;
  } else if (expr === 'celebrate' || pose === 'celebrate') {
    bodyTilt = Math.sin(t * 4.8) * 0.03;
    headTilt = Math.sin(t * 4.8) * 0.045;
    headNodY -= Math.abs(Math.sin(t * 4.8)) * 5;
  } else if (expr === 'gentle_sad') {
    bodyTilt = -0.02;
    headTilt = -0.05;
    headNodY += 4;
  } else if (expr === 'surprised' || pose === 'caution') {
    bodyTilt = -0.025;
    headTilt = -0.02 + Math.sin(t * 3.4) * 0.015;
  } else if (isPlaying) {
    bodyTilt = 0.02 + Math.sin(t * 3.2) * 0.02 * (0.4 + openAmt);
    headTilt = 0.03 + Math.sin(t * 4.0) * 0.03;
  }

  ctx.save();
  ctx.translate(anchorX, groundY);

  // Soft realistic stage floor shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, -4, 92, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm voice aura when Murshid is explaining
  if (isPlaying && openAmt > 0.08) {
    const aura = ctx.createRadialGradient(0, -250, 20, 0, -250, 195);
    aura.addColorStop(0, `rgba(16, 185, 129, ${0.14 * openAmt})`);
    aura.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -250, 195, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scale unit coordinate space cleanly (~495px tall figure matching old sprite framing)
  const scaleFactor = 1.9;
  ctx.translate(0, breathY);
  ctx.rotate(bodyTilt);
  ctx.scale(scaleFactor, scaleFactor);
  // Base origin is feet center (0, 0); body stretches upward to y ~ -260

  // Legs & Field Boots
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, -28, -90, 22, 76, 8);
  ctx.fill();
  roundRect(ctx, 6, -90, 22, 76, 8);
  ctx.fill();

  // Field Shoes
  ctx.fillStyle = '#5c3c24';
  roundRect(ctx, -33, -18, 28, 15, 7);
  ctx.fill();
  roundRect(ctx, 5, -18, 28, 15, 7);
  ctx.fill();
  ctx.fillStyle = '#d6b47c';
  roundRect(ctx, -33, -6, 28, 4, 2);
  ctx.fill();
  roundRect(ctx, 5, -6, 28, 4, 2);
  ctx.fill();

  // Shirt Torso
  const shirtGrad = ctx.createLinearGradient(0, -172, 0, -80);
  shirtGrad.addColorStop(0, '#ffffff');
  shirtGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = shirtGrad;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-40, -158);
  ctx.quadraticCurveTo(-40, -174, 0, -174);
  ctx.quadraticCurveTo(40, -174, 40, -158);
  ctx.lineTo(44, -84);
  ctx.quadraticCurveTo(44, -78, 38, -78);
  ctx.lineTo(-38, -78);
  ctx.quadraticCurveTo(-44, -78, -44, -84);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emerald Field Vest Panels
  const vestGrad = ctx.createLinearGradient(0, -174, 0, -78);
  vestGrad.addColorStop(0, '#10b981');
  vestGrad.addColorStop(0.55, '#047857');
  vestGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = vestGrad;
  ctx.strokeStyle = '#064e3b';
  ctx.lineWidth = 1.4;

  // Left vest panel (viewer left)
  ctx.beginPath();
  ctx.moveTo(-36, -166);
  ctx.lineTo(-14, -173);
  ctx.lineTo(-8, -142);
  ctx.lineTo(-8, -78);
  ctx.lineTo(-40, -78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right vest panel (viewer right)
  ctx.beginPath();
  ctx.moveTo(36, -166);
  ctx.lineTo(14, -173);
  ctx.lineTo(8, -142);
  ctx.lineTo(8, -78);
  ctx.lineTo(40, -78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shirt Collar V + Omani Diamond Motif
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-15, -173);
  ctx.lineTo(0, -155);
  ctx.lineTo(15, -173);
  ctx.stroke();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -155);
  ctx.lineTo(0, -84);
  ctx.stroke();

  // Diamond motifs down shirt placket
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(0, -143);
  ctx.lineTo(3.5, -138);
  ctx.lineTo(0, -133);
  ctx.lineTo(-3.5, -138);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.moveTo(0, -124);
  ctx.lineTo(3.5, -119);
  ctx.lineTo(0, -114);
  ctx.lineTo(-3.5, -119);
  ctx.closePath();
  ctx.fill();

  // Vest Pocket + Gold Sprout Badge
  ctx.fillStyle = '#065f46';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1;
  roundRect(ctx, 15, -130, 20, 22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(25, -138, 6, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Articulated Right Arm (viewer left)
  ctx.save();
  if (pose === 'wave' || expr === 'welcome' || expr === 'celebrate' || expr === 'encourage') {
    const waveAng =
      expr === 'encourage' ? -0.15 : Math.sin(t * 5.2) * 0.25;
    ctx.translate(-39, -156);
    ctx.rotate(waveAng);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-20, -6, -28, -36);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-29, -40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'think') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-39, -156);
    ctx.quadraticCurveTo(-52, -144, -22, -179);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-20, -180, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const idleSwing = Math.sin(t * 2) * 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-39, -156);
    ctx.quadraticCurveTo(-54, -142, -52, -114 + idleSwing);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-52, -112 + idleSwing, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Articulated Left Arm (viewer right, pointing to stage prop / celebrating / holding sprout)
  ctx.save();
  if (expr === 'celebrate') {
    const cAng = Math.sin(t * 5.2 + 1) * 0.22;
    ctx.translate(39, -156);
    ctx.rotate(-cAng);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(20, -6, 28, -36);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(29, -40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'explain' || expr === 'speak' || pose === 'explain' || pose === 'caution' || expr === 'surprised') {
    const gestureY = isPlaying ? Math.sin(t * 4.5) * 4 : Math.sin(t * 1.8) * 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(39, -156);
    ctx.quadraticCurveTo(56, -150, 72, -172 + gestureY);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(74, -174 + gestureY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fresh Sprout held in hand
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(74, -178 + gestureY);
    ctx.lineTo(78, -196 + gestureY);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(73, -199 + gestureY, 5.5, 3.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(83, -199 + gestureY, 5.5, 3.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(39, -156);
    ctx.quadraticCurveTo(54, -142, 52, -114);
    ctx.stroke();
    ctx.fillStyle = '#e2a573';
    ctx.strokeStyle = '#b57745';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(52, -112, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Neck
  ctx.fillStyle = '#d99a67';
  roundRect(ctx, -9, -189, 18, 21, 7);
  ctx.fill();

  // --- Articulated Head Group (pivot at base of neck 0, -177) ---
  ctx.save();
  ctx.translate(0, -177 + headNodY);
  ctx.rotate(headTilt);

  // Hat Back Brim
  ctx.fillStyle = '#a97e42';
  ctx.strokeStyle = '#785323';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, -56, 62, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.fillStyle = '#d4915e';
  ctx.strokeStyle = '#b57745';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(-42, -32, 6.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(42, -32, 6.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head Shape
  ctx.fillStyle = '#e7ad7b';
  ctx.strokeStyle = '#b57745';
  ctx.lineWidth = 1.6;
  roundRect(ctx, -40, -72, 80, 69, 34);
  ctx.fill();
  ctx.stroke();

  // Hair Sideburns
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(-39, -46);
  ctx.quadraticCurveTo(-39, -62, -28, -62);
  ctx.lineTo(-34, -44);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(39, -46);
  ctx.quadraticCurveTo(39, -62, 28, -62);
  ctx.lineTo(34, -44);
  ctx.closePath();
  ctx.fill();

  // Cheeks
  ctx.fillStyle = `rgba(244, 63, 94, ${expr === 'gentle_sad' ? 0.1 : 0.24})`;
  ctx.beginPath();
  ctx.ellipse(-27, -25, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(27, -25, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Modern Field Hat Crown + Omani Woven Geometric Band
  const hatGrad = ctx.createLinearGradient(0, -94, 0, -56);
  hatGrad.addColorStop(0, '#ead2a4');
  hatGrad.addColorStop(1, '#c69c5b');
  ctx.fillStyle = hatGrad;
  ctx.strokeStyle = '#926a32';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-38, -59);
  ctx.bezierCurveTo(-37, -85, -21, -93, 0, -93);
  ctx.bezierCurveTo(21, -93, 37, -85, 38, -59);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emerald Ribbon
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.moveTo(-38, -64);
  ctx.quadraticCurveTo(0, -58, 38, -64);
  ctx.lineTo(38, -57);
  ctx.quadraticCurveTo(0, -51, -38, -57);
  ctx.closePath();
  ctx.fill();

  // Gold Omani diamonds on hat band
  ctx.fillStyle = '#fbbf24';
  for (const dx of [-18, 0, 18]) {
    const r = dx === 0 ? 5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(dx, -61 - r);
    ctx.lineTo(dx + r, -61);
    ctx.lineTo(dx, -61 + r);
    ctx.lineTo(dx - r, -61);
    ctx.closePath();
    ctx.fill();
  }

  // Front Curved Brim
  ctx.fillStyle = '#d9b77c';
  ctx.strokeStyle = '#926a32';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-61, -56);
  ctx.quadraticCurveTo(0, -44, 61, -56);
  ctx.quadraticCurveTo(0, -52, -61, -56);
  ctx.fill();
  ctx.stroke();

  // Eyebrows
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (expr === 'surprised') {
    ctx.beginPath();
    ctx.moveTo(-29, -53);
    ctx.quadraticCurveTo(-20, -61, -11, -55);
    ctx.moveTo(11, -55);
    ctx.quadraticCurveTo(20, -61, 29, -53);
    ctx.stroke();
  } else if (expr === 'think') {
    ctx.beginPath();
    ctx.moveTo(-29, -49);
    ctx.quadraticCurveTo(-20, -54, -11, -50);
    ctx.moveTo(11, -48);
    ctx.quadraticCurveTo(20, -49, 29, -47);
    ctx.stroke();
  } else if (expr === 'gentle_sad') {
    ctx.beginPath();
    ctx.moveTo(-29, -47);
    ctx.quadraticCurveTo(-20, -50, -11, -53);
    ctx.moveTo(11, -53);
    ctx.quadraticCurveTo(20, -50, 29, -47);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-29, -50);
    ctx.quadraticCurveTo(-20, -55, -11, -50);
    ctx.moveTo(11, -50);
    ctx.quadraticCurveTo(20, -55, 29, -50);
    ctx.stroke();
  }

  // Natural Blinking Eyes
  const blinkPhase = t % 3.8;
  const blinkFactor =
    blinkPhase > 3.62 ? Math.max(0.12, 1 - Math.sin(((blinkPhase - 3.62) / 0.18) * Math.PI) * 0.92) : 1;
  const eyeRy = (expr === 'surprised' ? 9.5 : 8) * blinkFactor;

  for (const ex of [-20, 20]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, -37, 7.5, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();

    if (blinkFactor > 0.35) {
      const pupilShiftX = ex < 0 ? 1 : -1;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(ex + pupilShiftX, -37, expr === 'surprised' ? 3.8 : 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + pupilShiftX + 1.6, -39, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#331d12';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ex - 7, -37);
      ctx.lineTo(ex + 7, -37);
      ctx.stroke();
    }
  }

  // Nose
  ctx.strokeStyle = '#b57745';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-2, -32);
  ctx.quadraticCurveTo(0, -27, 3, -30);
  ctx.stroke();

  // Audio-Synced Mouth / Facial Expression
  if (openAmt > 0.05) {
    const jawH = 2.6 + openAmt * 6.4;
    const jawW = 8.6 - openAmt * 1.1;
    ctx.fillStyle = '#881337';
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, -16, jawW, jawH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (openAmt > 0.25) {
      ctx.fillStyle = '#fff9f5';
      roundRect(ctx, -jawW * 0.65, -16 - jawH * 0.72, jawW * 1.3, Math.min(3.2, jawH * 0.45), 1.5);
      ctx.fill();
    }
  } else if (expr === 'surprised') {
    ctx.fillStyle = '#881337';
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -16, 5.2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expr === 'gentle_sad') {
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -13);
    ctx.quadraticCurveTo(0, -20, 10, -13);
    ctx.stroke();
  } else if (expr === 'think') {
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.quadraticCurveTo(0, -19, 8, -16);
    ctx.stroke();
  } else if (expr === 'celebrate' || expr === 'welcome' || expr === 'encourage') {
    ctx.fillStyle = '#881337';
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-13, -19);
    ctx.quadraticCurveTo(0, -5, 13, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-11, -18);
    ctx.quadraticCurveTo(0, -11, 11, -18);
    ctx.stroke();
  }

  ctx.restore(); // end head
  ctx.restore(); // end character
}
