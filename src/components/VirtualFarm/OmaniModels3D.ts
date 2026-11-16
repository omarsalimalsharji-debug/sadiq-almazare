import * as THREE from 'three';

/**
 * High-Craft Procedural 3D Models, GLSL Shaders & Particle/Popup FX
 * for the Omani Living Farm Game ("صديق المزارع الذكي").
 * Zero external runtime asset 404s — lightweight, GPU-friendly, and mobile-responsive.
 */

export type FarmerAnimMode =
  | 'idle'
  | 'walk'
  | 'plow'
  | 'level_soil'
  | 'plant'
  | 'irrigate'
  | 'fertilize'
  | 'weed'
  | 'prune'
  | 'pest_control'
  | 'harvest'
  | 'feed_livestock'
  | 'collect_livestock'
  | 'sell_market'
  | 'upgrade_building';

export interface FarmerRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftEye?: THREE.Mesh;
  rightEye?: THREE.Mesh;
  leftEyelid?: THREE.Mesh;
  rightEyelid?: THREE.Mesh;
  leftBrow?: THREE.Mesh;
  rightBrow?: THREE.Mesh;
  mouthGroup?: THREE.Group;
  shadowDisc: THREE.Mesh;
  tools: {
    hoe: THREE.Group;
    waterCan: THREE.Group;
    basket: THREE.Group;
    sprayer: THREE.Group;
  };
  walkPhase: number;
  facingAngle: number;
  actionMode: FarmerAnimMode;
  actionTimer: number;
}

export interface CowRig {
  group: THREE.Group;
  headGroup: THREE.Group;
  tailGroup: THREE.Group;
  legs: THREE.Group[];
  shadowDisc: THREE.Mesh;
  homeX: number;
  homeZ: number;
  wanderRadius: number;
  targetX: number;
  targetZ: number;
  pauseTimer: number;
  grazePhase: number;
  walkPhase: number;
  speed: number;
  happyHopTimer: number;
}

export interface ChickenRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  pauseTimer: number;
  peckPhase: number;
  speed: number;
}

export interface ButterflyRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  baseY: number;
  radius: number;
  phase: number;
  speed: number;
}

export interface SkyBirdRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  orbitRadius: number;
  height: number;
  angle: number;
  speed: number;
}

export interface GoatRig {
  group: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Group[];
  homeX: number;
  homeZ: number;
  wanderRadius: number;
  targetX: number;
  targetZ: number;
  pauseTimer: number;
  walkPhase: number;
  speed: number;
  happyHopTimer: number;
}

export interface BeeRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  baseY: number;
  radius: number;
  phase: number;
  speed: number;
}

function makePatternTexture(
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 128,
  h = 128
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeRadialShadowTexture(): THREE.CanvasTexture {
  return makePatternTexture((ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.5);
    grad.addColorStop(0, 'rgba(10, 15, 10, 0.48)');
    grad.addColorStop(0.6, 'rgba(10, 15, 10, 0.22)');
    grad.addColorStop(1, 'rgba(10, 15, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 128, 128);
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowMaterial(): THREE.MeshBasicMaterial {
  if (!sharedShadowTex) sharedShadowTex = makeRadialShadowTexture();
  return new THREE.MeshBasicMaterial({
    map: sharedShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
}

/**
 * Custom GLSL Atmospheric Sky Dome with Sun Disc & Warm Omani Horizon Haze
 */
export function createOmaniSkyDome(): THREE.Mesh {
  const skyGeo = new THREE.SphereGeometry(95, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.56, 0.68, 0.46).normalize() },
      uTopColor: { value: new THREE.Color(0x2d74c4) },
      uMidColor: { value: new THREE.Color(0x7cc4f0) },
      uHorizonColor: { value: new THREE.Color(0xfaecd2) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
        col = mix(col, uTopColor, smoothstep(0.25, 0.85, h));

        float sunAmt = max(dot(dir, uSunDir), 0.0);
        col += vec3(1.0, 0.88, 0.65) * pow(sunAmt, 14.0) * 0.35;
        col += vec3(1.0, 0.96, 0.86) * smoothstep(0.9965, 0.9992, sunAmt) * 0.95;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(skyGeo, skyMat);
  mesh.renderOrder = -10;
  return mesh;
}

/**
 * Drifting stylized sky clouds
 */
export function createSkyClouds(): THREE.Group[] {
  const clouds: THREE.Group[] = [];
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92,
  });

  const placements: Array<[number, number, number, number]> = [
    [-26, 22, -32, 1.25],
    [-4, 25, -42, 1.5],
    [24, 21, -28, 1.15],
    [-35, 19, 8, 1.1],
    [32, 23, 14, 1.3],
  ];

  placements.forEach(([x, y, z, s]) => {
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    const puffs: Array<[number, number, number, number]> = [
      [0, 0, 0, 2.2],
      [-1.7, -0.35, 0.2, 1.65],
      [1.8, -0.3, -0.1, 1.75],
      [0.6, 0.65, 0.1, 1.55],
    ];
    puffs.forEach(([px, py, pz, r]) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
      m.scale.set(1.25, 0.72, 0.95);
      m.position.set(px, py, pz);
      cg.add(m);
    });
    cg.scale.setScalar(s);
    clouds.push(cg);
  });
  return clouds;
}

/**
 * Layered Sculpted Al Hajar Mountain Range (replaces harsh spikes with natural stratified ridges)
 */
export function createAlHajarMountains(): THREE.Group {
  const group = new THREE.Group();
  const nearRidgeMat = new THREE.MeshStandardMaterial({ color: 0x8a6d53, roughness: 0.96, flatShading: true });
  const midRidgeMat = new THREE.MeshStandardMaterial({ color: 0x9c826b, roughness: 0.96, flatShading: true });
  const farRidgeMat = new THREE.MeshStandardMaterial({ color: 0xb19e8d, roughness: 0.98, flatShading: true });

  const buildRangeRing = (
    radius: number,
    peaks: number,
    baseHeight: number,
    mat: THREE.Material,
    angleStart: number,
    angleSpan: number
  ) => {
    for (let i = 0; i < peaks; i++) {
      const t = i / peaks;
      const ang = angleStart + t * angleSpan;
      const w = 8 + (i % 3) * 3.5;
      const h = baseHeight + Math.sin(i * 1.9) * (baseHeight * 0.32);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
      peak.scale.set(1.35, 1.0, 0.72);
      peak.position.set(Math.cos(ang) * radius, h * 0.42, Math.sin(ang) * radius);
      peak.rotation.y = ang + 0.4;
      group.add(peak);
    }
  };

  buildRangeRing(46, 14, 10.5, nearRidgeMat, -Math.PI * 0.92, Math.PI * 0.85);
  buildRangeRing(58, 16, 15.0, midRidgeMat, -Math.PI * 0.96, Math.PI * 0.95);
  buildRangeRing(72, 18, 19.5, farRidgeMat, -Math.PI * 1.05, Math.PI * 1.15);

  return group;
}

/**
 * Animated GLSL Flowing Falaj Water Shader Material
 */
export function createFalajWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0284c7) },
      uShallowColor: { value: new THREE.Color(0x38bdf8) },
      uFoamColor: { value: new THREE.Color(0xe0f2fe) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 4.5 - uTime * 4.2 + pos.z * 3.0) * 0.015;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
      varying vec2 vUv;

      void main() {
        float flow = vUv.x * 10.0 - uTime * 2.2;
        float ripple1 = sin(flow + vUv.y * 12.0) * 0.5 + 0.5;
        float ripple2 = cos(flow * 1.6 - vUv.y * 9.0 + uTime * 1.4) * 0.5 + 0.5;
        float shimmer = smoothstep(0.68, 0.96, ripple1 * ripple2);

        vec3 base = mix(uDeepColor, uShallowColor, 0.45 + 0.35 * ripple1);
        vec3 col = mix(base, uFoamColor, shimmer * 0.72);
        gl_FragColor = vec4(col, 0.92);
      }
    `,
  });
}

/**
 * Builds an articulated 3D Omani Farmer wearing Dishdasha, Kummah, Farakha,
 * sandals, and holding swap-able agricultural tools during live farm actions!
 */
export function createOmaniFarmer(): FarmerRig {
  const group = new THREE.Group();
  group.name = 'omani_farmer';

  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 1.12), getContactShadowMaterial());
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc98e63, roughness: 0.66, metalness: 0.02 });
  const dishdashaTex = makePatternTexture((ctx, w, h) => {
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(210, 200, 185, 0.26)';
    for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 1);
  });
  const dishdashaMat = new THREE.MeshStandardMaterial({ map: dishdashaTex, roughness: 0.76, metalness: 0.02 });
  const vestBeltMat = new THREE.MeshStandardMaterial({ color: 0x784421, roughness: 0.5, metalness: 0.16 });
  const sandalMat = new THREE.MeshStandardMaterial({ color: 0x4b2e1b, roughness: 0.85 });

  const kummahTex = makePatternTexture((ctx, w, h) => {
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#065f46';
    for (let x = 0; x < w; x += 16) {
      for (let y = 0; y < h; y += 16) {
        ctx.fillRect(x + 2, y + 2, 6, 6);
      }
    }
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, h - 18, w, 10);
  });
  const kummahMat = new THREE.MeshStandardMaterial({ map: kummahTex, roughness: 0.7 });

  // 1. Legs
  const makeLeg = (offsetX: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(offsetX, 0.62, 0);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.54, 10), skinMat);
    shin.position.y = -0.29;
    shin.castShadow = true;
    legPivot.add(shin);

    const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.24), sandalMat);
    sandal.position.set(0, -0.59, 0.04);
    sandal.castShadow = true;
    legPivot.add(sandal);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);
  bodyPivot.add(leftLeg, rightLeg);

  // 2. Dishdasha Skirt & Torso
  const robeSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.29, 0.82, 16), dishdashaMat);
  robeSkirt.position.y = 0.64;
  robeSkirt.castShadow = true;
  robeSkirt.receiveShadow = true;
  bodyPivot.add(robeSkirt);

  const upperTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.21, 0.56, 16), dishdashaMat);
  upperTorso.position.y = 1.24;
  upperTorso.castShadow = true;
  bodyPivot.add(upperTorso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.025, 8, 16), dishdashaMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.51, 0.01);
  bodyPivot.add(collar);

  const farakha = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.028, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.7 })
  );
  farakha.position.set(0.04, 1.38, 0.21);
  farakha.rotation.z = -0.08;
  bodyPivot.add(farakha);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.218, 0.222, 0.075, 16), vestBeltMat);
  belt.position.y = 1.02;
  bodyPivot.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.085, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.74, roughness: 0.26 })
  );
  buckle.position.set(0, 1.02, 0.215);
  bodyPivot.add(buckle);

  // 3. Arms
  const makeArm = (side: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.265, 1.44, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.076, 0.34, 10), dishdashaMat);
    sleeve.position.y = -0.17;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.24, 10), skinMat);
    forearm.position.y = -0.43;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), skinMat);
    hand.position.y = -0.56;
    armPivot.add(hand);

    return armPivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyPivot.add(leftArm, rightArm);

  // Hand-held Agricultural Tools (attached to right hand, toggled during action)
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.28 });

  // Tool 1: Omani Farming Hoe (المحراث اليدوي / المسحاة)
  const hoe = new THREE.Group();
  hoe.position.set(0, -0.56, 0.04);
  const hoeShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.95, 7), woodMat);
  hoeShaft.rotation.x = Math.PI / 2;
  hoeShaft.position.z = 0.28;
  hoe.add(hoeShaft);
  const hoeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.03), steelMat);
  hoeBlade.position.set(0, -0.05, 0.73);
  hoeBlade.rotation.x = 0.35;
  hoe.add(hoeBlade);
  hoe.visible = false;
  rightArm.add(hoe);

  // Tool 2: Emerald Watering Can
  const waterCan = new THREE.Group();
  waterCan.position.set(0, -0.58, 0.05);
  const canMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.45, roughness: 0.3 });
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 12), canMat);
  canBody.position.set(0, -0.08, 0.12);
  canBody.rotation.x = 0.4;
  waterCan.add(canBody);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.28, 8), canMat);
  spout.position.set(0, -0.04, 0.3);
  spout.rotation.x = Math.PI / 3;
  waterCan.add(spout);
  waterCan.visible = false;
  rightArm.add(waterCan);

  // Tool 3: Woven Palm Date Harvest Basket (جفير الحصاد)
  const basket = new THREE.Group();
  basket.position.set(0, -0.56, 0.05);
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xd9a84e, roughness: 0.88 });
  const basketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.2, 12), basketMat);
  basketMesh.position.set(0, -0.06, 0.12);
  basket.add(basketMesh);
  basket.visible = false;
  rightArm.add(basket);

  // Tool 4: Bio Neem Eco Sprayer
  const sprayer = new THREE.Group();
  sprayer.position.set(0, -0.56, 0.05);
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.02, 0.55, 7),
    new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.4, roughness: 0.35 })
  );
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 0.26;
  sprayer.add(nozzle);
  sprayer.visible = false;
  rightArm.add(sprayer);

  // 4. Head + Kummah
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.52, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.1, 10), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 14), skinMat);
  head.scale.set(0.95, 1.06, 0.98);
  head.position.y = 0.21;
  head.castShadow = true;
  headGroup.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.25 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0x261d17, roughness: 0.9 });
  const mouthInteriorMat = new THREE.MeshStandardMaterial({ color: 0x4a1d1f, roughness: 0.85 });
  const lipHighlightMat = new THREE.MeshStandardMaterial({ color: 0xf4ece4, roughness: 0.45 });

  let leftEye: THREE.Mesh | undefined;
  let rightEye: THREE.Mesh | undefined;
  let leftEyelid: THREE.Mesh | undefined;
  let rightEyelid: THREE.Mesh | undefined;
  let leftBrow: THREE.Mesh | undefined;
  let rightBrow: THREE.Mesh | undefined;

  [-0.056, 0.056].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), eyeMat);
    eye.position.set(ex, 0.23, 0.145);
    headGroup.add(eye);

    const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.036, 0.024), skinMat);
    eyelid.position.set(ex, 0.244, 0.149);
    eyelid.scale.set(1, 0.08, 1);
    headGroup.add(eyelid);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.015), beardMat);
    brow.position.set(ex, 0.265, 0.145);
    headGroup.add(brow);

    if (ex < 0) {
      leftEye = eye;
      leftEyelid = eyelid;
      leftBrow = brow;
    } else {
      rightEye = eye;
      rightEyelid = eyelid;
      rightBrow = brow;
    }
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.2, 0.168);
  headGroup.add(nose);

  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, 0.168, 0.151);
  const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.018), mouthInteriorMat);
  mouthGroup.add(mouthCavity);
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.005, 0.019), lipHighlightMat);
  upperLip.position.set(0, 0.005, 0.002);
  mouthGroup.add(upperLip);
  mouthGroup.scale.set(1, 0.25, 1);
  headGroup.add(mouthGroup);

  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
    beardMat
  );
  beard.scale.set(0.95, 1.0, 0.92);
  beard.position.set(0, 0.16, 0.045);
  headGroup.add(beard);

  const kummahSide = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.172, 0.11, 18), kummahMat);
  kummahSide.position.set(0, 0.34, -0.005);
  kummahSide.castShadow = true;
  headGroup.add(kummahSide);

  const kummahTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.168, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    kummahMat
  );
  kummahTop.scale.set(1, 0.42, 1);
  kummahTop.position.set(0, 0.39, -0.005);
  headGroup.add(kummahTop);

  bodyPivot.add(headGroup);

  return {
    group,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftEye,
    rightEye,
    leftEyelid,
    rightEyelid,
    leftBrow,
    rightBrow,
    mouthGroup,
    shadowDisc,
    tools: { hoe, waterCan, basket, sprayer },
    walkPhase: 0,
    facingAngle: 0,
    actionMode: 'idle',
    actionTimer: 0,
  };
}

/**
 * Sets equipped tool visibility & triggers timed tool gesture
 */
export function triggerFarmerAction(rig: FarmerRig, mode: FarmerAnimMode, duration = 1.4) {
  rig.actionMode = mode;
  rig.actionTimer = duration;
  rig.tools.hoe.visible = mode === 'plow' || mode === 'level_soil' || mode === 'weed' || mode === 'upgrade_building';
  rig.tools.waterCan.visible = mode === 'irrigate';
  rig.tools.basket.visible =
    mode === 'harvest' ||
    mode === 'plant' ||
    mode === 'fertilize' ||
    mode === 'feed_livestock' ||
    mode === 'collect_livestock' ||
    mode === 'sell_market';
  rig.tools.sprayer.visible = mode === 'pest_control' || mode === 'prune';
}

export function clearFarmerTools(rig: FarmerRig) {
  rig.actionMode = 'idle';
  rig.actionTimer = 0;
  rig.tools.hoe.visible = false;
  rig.tools.waterCan.visible = false;
  rig.tools.basket.visible = false;
  rig.tools.sprayer.visible = false;
}

/**
 * Animates Omani Farmer walking, idle breathing, facial blinking/lip-sync, OR rich agricultural tool gestures
 */
export function animateOmaniFarmer(
  rig: FarmerRig,
  moveSpeedNorm: number,
  dt: number,
  elapsed: number,
  isSpeaking = false
) {
  // Natural periodic eye blinking & eyebrow expression
  const blinkPhase = elapsed % 3.8;
  const isBlinking = blinkPhase < 0.15;
  const targetLidScale = isBlinking ? 1.15 : 0.08;
  if (rig.leftEyelid && rig.rightEyelid) {
    const nextLid = THREE.MathUtils.damp(rig.leftEyelid.scale.y, targetLidScale, 28, dt);
    rig.leftEyelid.scale.y = nextLid;
    rig.rightEyelid.scale.y = nextLid;
    const lidY = THREE.MathUtils.lerp(0.244, 0.23, THREE.MathUtils.clamp((nextLid - 0.08) / 1.07, 0, 1));
    rig.leftEyelid.position.y = lidY;
    rig.rightEyelid.position.y = lidY;
  }

  if (rig.leftBrow && rig.rightBrow) {
    const browTargetY = 0.265 + (isSpeaking ? 0.008 + Math.sin(elapsed * 5.2) * 0.004 : 0);
    rig.leftBrow.position.y = THREE.MathUtils.damp(rig.leftBrow.position.y, browTargetY, 14, dt);
    rig.rightBrow.position.y = rig.leftBrow.position.y;
  }

  if (rig.mouthGroup) {
    const targetMouthY = isSpeaking
      ? 0.35 + Math.abs(Math.sin(elapsed * 11.2)) * 0.85 + Math.abs(Math.sin(elapsed * 17.5)) * 0.45
      : 0.25;
    rig.mouthGroup.scale.y = THREE.MathUtils.damp(rig.mouthGroup.scale.y, targetMouthY, 22, dt);
  }

  if (rig.actionTimer > 0 && moveSpeedNorm < 0.08) {
    rig.actionTimer -= dt;
    const p = elapsed * 9.5;
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0.14, 8, dt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, -0.14, 8, dt);

    if (rig.actionMode === 'plow' || rig.actionMode === 'level_soil' || rig.actionMode === 'weed' || rig.actionMode === 'upgrade_building') {
      // Energetic hoe / builder swing
      rig.rightArm.rotation.x = -1.15 + Math.sin(p) * 0.72;
      rig.leftArm.rotation.x = -0.65 + Math.sin(p) * 0.35;
      rig.bodyPivot.rotation.x = 0.22 + Math.sin(p) * 0.14;
      rig.bodyPivot.position.y = Math.abs(Math.sin(p)) * 0.03;
    } else if (rig.actionMode === 'irrigate') {
      // Tilt watering can rhythmically
      rig.rightArm.rotation.x = -0.95 + Math.sin(p * 0.6) * 0.22;
      rig.rightArm.rotation.z = -0.2;
      rig.leftArm.rotation.x = -0.25;
      rig.bodyPivot.rotation.x = 0.12;
    } else if (
      rig.actionMode === 'harvest' ||
      rig.actionMode === 'plant' ||
      rig.actionMode === 'fertilize' ||
      rig.actionMode === 'feed_livestock' ||
      rig.actionMode === 'collect_livestock' ||
      rig.actionMode === 'sell_market'
    ) {
      // Crouch & gather / feed / market exchange
      rig.rightArm.rotation.x = -0.8 + Math.sin(p * 1.1) * 0.45;
      rig.leftArm.rotation.x = -0.6 + Math.cos(p * 1.1) * 0.35;
      rig.bodyPivot.rotation.x = 0.24;
    } else {
      // Spray / prune
      rig.rightArm.rotation.x = -0.9 + Math.sin(p * 0.8) * 0.25;
      rig.rightArm.rotation.y = Math.sin(p * 0.5) * 0.32;
      rig.bodyPivot.rotation.x = 0.08;
    }

    if (rig.actionTimer <= 0) {
      clearFarmerTools(rig);
      rig.bodyPivot.rotation.x = 0;
      rig.rightArm.rotation.z = 0;
      rig.rightArm.rotation.y = 0;
    }
    return;
  }

  rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 0, 10, dt);
  rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, 0, 10, dt);
  rig.rightArm.rotation.y = THREE.MathUtils.damp(rig.rightArm.rotation.y, 0, 10, dt);

  if (moveSpeedNorm > 0.05) {
    rig.walkPhase += dt * (7.0 + moveSpeedNorm * 3.8);
    const swing = Math.sin(rig.walkPhase) * 0.66 * Math.min(1, moveSpeedNorm);
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
    rig.leftArm.rotation.x = -swing * 0.74;
    rig.rightArm.rotation.x = swing * 0.74;
    rig.bodyPivot.position.y = Math.abs(Math.cos(rig.walkPhase)) * 0.045;
    rig.headGroup.rotation.y = Math.sin(rig.walkPhase * 0.5) * 0.06;
    rig.headGroup.rotation.x = 0.05;
  } else {
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0, 10, dt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0, 10, dt);
    rig.leftArm.rotation.x = THREE.MathUtils.damp(
      rig.leftArm.rotation.x,
      isSpeaking ? -0.14 + Math.cos(elapsed * 3.6) * 0.08 : 0,
      10,
      dt
    );
    rig.rightArm.rotation.x = THREE.MathUtils.damp(
      rig.rightArm.rotation.x,
      isSpeaking ? -0.38 + Math.sin(elapsed * 4.4) * 0.18 : 0,
      10,
      dt
    );
    rig.bodyPivot.position.y = Math.sin(elapsed * 2.1) * 0.012;
    rig.headGroup.rotation.y = isSpeaking
      ? Math.sin(elapsed * 1.4) * 0.18
      : Math.sin(elapsed * 0.8) * 0.14;
    rig.headGroup.rotation.x = isSpeaking
      ? Math.sin(elapsed * 3.1) * 0.07
      : Math.sin(elapsed * 1.4) * 0.03;
  }
}

/**
 * Builds an anatomical 14-part 3D Cow with spotted coat texture, hooves, horns, udder, tail & happy hop reaction
 */
export function createRealisticCow(
  coatStyle: 'black_white' | 'brown_white' | 'cream_tan',
  homeX: number,
  homeZ: number,
  wanderRadius = 2.4
): CowRig {
  const group = new THREE.Group();
  group.position.set(homeX, 0, homeZ);
  group.name = `cow_${coatStyle}`;

  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.2), getContactShadowMaterial());
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  const coatTex = makePatternTexture((ctx, w, h) => {
    if (coatStyle === 'black_white') {
      ctx.fillStyle = '#f4f2ec';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#222226';
      ctx.beginPath();
      ctx.ellipse(34, 42, 28, 22, 0.3, 0, Math.PI * 2);
      ctx.ellipse(98, 86, 26, 20, -0.4, 0, Math.PI * 2);
      ctx.ellipse(82, 22, 18, 16, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (coatStyle === 'brown_white') {
      ctx.fillStyle = '#8b4523';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f5efe6';
      ctx.beginPath();
      ctx.ellipse(42, 85, 25, 18, 0.2, 0, Math.PI * 2);
      ctx.ellipse(95, 45, 22, 16, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#d9b589';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f5e7d0';
      ctx.beginPath();
      ctx.ellipse(64, 64, 34, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const coatMat = new THREE.MeshStandardMaterial({ map: coatTex, roughness: 0.8, metalness: 0.02 });
  const solidCoatColor = coatStyle === 'black_white' ? 0x26262a : coatStyle === 'brown_white' ? 0x7c3d1e : 0xd3a876;
  const headCoatMat = new THREE.MeshStandardMaterial({ color: solidCoatColor, roughness: 0.78 });
  const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xebb2ae, roughness: 0.65 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7dfc8, roughness: 0.48 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x26201c, roughness: 0.85 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.76, 8, 14), coatMat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(0.95, 1.0, 1.08);
  torso.position.set(0, 0.84, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), muzzleMat);
  udder.scale.set(0.95, 0.75, 1.1);
  udder.position.set(0, 0.53, -0.26);
  group.add(udder);

  const legOffsets: Array<[number, number]> = [
    [-0.2, 0.34],
    [0.2, 0.34],
    [-0.2, -0.34],
    [0.2, -0.34],
  ];
  const legs = legOffsets.map(([lx, lz]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.62, lz);

    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.54, 8), coatMat);
    upperLeg.position.y = -0.27;
    upperLeg.castShadow = true;
    legPivot.add(upperLeg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.068, 0.09, 8), hoofMat);
    hoof.position.y = -0.575;
    hoof.castShadow = true;
    legPivot.add(hoof);

    group.add(legPivot);
    return legPivot;
  });

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.96, 0.48);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.38, 10), headCoatMat);
  neck.rotation.x = 0.65;
  neck.position.set(0, 0.08, 0.14);
  neck.castShadow = true;
  headGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.36), headCoatMat);
  skull.position.set(0, 0.16, 0.34);
  skull.castShadow = true;
  headGroup.add(skull);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.18), muzzleMat);
  snout.position.set(0, 0.09, 0.54);
  headGroup.add(snout);

  // Brass cowbell collar accent
  const bellCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.025, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 })
  );
  bellCollar.position.set(0, 0.02, 0.06);
  bellCollar.rotation.x = 0.7;
  headGroup.add(bellCollar);
  const cowbell = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.09, 6),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.22 })
  );
  cowbell.position.set(0, -0.14, 0.14);
  headGroup.add(cowbell);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
    eye.position.set(s * 0.148, 0.21, 0.39);
    headGroup.add(eye);

    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.08), headCoatMat);
    ear.position.set(s * 0.2, 0.25, 0.26);
    ear.rotation.z = -s * 0.32;
    headGroup.add(ear);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 7), hornMat);
    horn.position.set(s * 0.12, 0.34, 0.25);
    horn.rotation.z = -s * 0.55;
    horn.rotation.x = 0.25;
    headGroup.add(horn);
  });
  group.add(headGroup);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.96, -0.54);
  const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.015, 0.52, 6), headCoatMat);
  tailShaft.position.set(0, -0.24, -0.05);
  tailShaft.rotation.x = -0.18;
  tailGroup.add(tailShaft);
  const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.042, 7, 7), hoofMat);
  tailTuft.position.set(0, -0.5, -0.1);
  tailGroup.add(tailTuft);
  group.add(tailGroup);

  return {
    group,
    headGroup,
    tailGroup,
    legs,
    shadowDisc,
    homeX,
    homeZ,
    wanderRadius,
    targetX: homeX + 0.6,
    targetZ: homeZ + 0.4,
    pauseTimer: 1.5,
    grazePhase: Math.random() * Math.PI * 2,
    walkPhase: Math.random() * Math.PI * 2,
    speed: 0.58 + Math.random() * 0.25,
    happyHopTimer: 0,
  };
}

export function animateCow(cow: CowRig, dt: number, elapsed: number) {
  cow.tailGroup.rotation.z = Math.sin(elapsed * 3.8 + cow.grazePhase) * 0.24;

  if (cow.happyHopTimer > 0) {
    cow.happyHopTimer -= dt;
    cow.group.position.y = Math.abs(Math.sin(cow.happyHopTimer * 10)) * 0.22;
    cow.headGroup.rotation.x = -0.18;
  } else {
    cow.group.position.y = 0;
  }

  if (cow.pauseTimer > 0) {
    cow.pauseTimer -= dt;
    const grazeTilt = 0.42 + Math.sin(elapsed * 2.2 + cow.grazePhase) * 0.12;
    if (cow.happyHopTimer <= 0) {
      cow.headGroup.rotation.x = THREE.MathUtils.damp(cow.headGroup.rotation.x, grazeTilt, 4.5, dt);
    }
    cow.legs.forEach((l) => {
      l.rotation.x = THREE.MathUtils.damp(l.rotation.x, 0, 8, dt);
    });
    if (cow.pauseTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * (cow.wanderRadius - 0.5);
      cow.targetX = cow.homeX + Math.cos(ang) * dist;
      cow.targetZ = cow.homeZ + Math.sin(ang) * dist;
    }
    return;
  }

  const dx = cow.targetX - cow.group.position.x;
  const dz = cow.targetZ - cow.group.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.15) {
    cow.pauseTimer = 3.2 + Math.random() * 4.0;
    return;
  }

  const desiredYaw = Math.atan2(dx, dz);
  let diff = desiredYaw - cow.group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cow.group.rotation.y += diff * Math.min(1, dt * 3.5);

  const step = Math.min(dist, cow.speed * dt);
  cow.group.position.x += (dx / dist) * step;
  cow.group.position.z += (dz / dist) * step;

  cow.walkPhase += dt * 4.5;
  if (cow.happyHopTimer <= 0) {
    cow.headGroup.rotation.x = THREE.MathUtils.damp(cow.headGroup.rotation.x, 0.05 + Math.sin(cow.walkPhase) * 0.04, 6, dt);
  }

  const stride = Math.sin(cow.walkPhase) * 0.34;
  cow.legs[0].rotation.x = stride;
  cow.legs[1].rotation.x = -stride;
  cow.legs[2].rotation.x = -stride;
  cow.legs[3].rotation.x = stride;
}

/**
 * Animated Farm Chicken / Rooster near Barn
 */
export function createChicken(isRooster: boolean, homeX: number, homeZ: number): ChickenRig {
  const group = new THREE.Group();
  group.position.set(homeX, 0, homeZ);

  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const featherMat = new THREE.MeshStandardMaterial({
    color: isRooster ? 0xb45309 : 0xfaf7f0,
    roughness: 0.78,
  });
  const combMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), featherMat);
  body.scale.set(0.85, 0.9, 1.25);
  body.position.y = 0.22;
  body.castShadow = true;
  bodyGroup.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), isRooster ? new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.7 }) : featherMat);
  tail.position.set(0, 0.3, -0.15);
  tail.rotation.x = -0.6;
  bodyGroup.add(tail);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.32, 0.13);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), featherMat);
  headGroup.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.065, 5), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.z = 0.08;
  headGroup.add(beak);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.055, 0.08), combMat);
  comb.position.set(0, 0.08, 0);
  headGroup.add(comb);
  bodyGroup.add(headGroup);

  [-0.045, 0.045].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), beakMat);
    leg.position.set(lx, 0.07, 0);
    bodyGroup.add(leg);
  });

  return {
    group,
    bodyGroup,
    headGroup,
    homeX,
    homeZ,
    targetX: homeX + 0.5,
    targetZ: homeZ + 0.3,
    pauseTimer: Math.random() * 2,
    peckPhase: Math.random() * Math.PI * 2,
    speed: 0.65 + Math.random() * 0.25,
  };
}

export function animateChicken(ch: ChickenRig, dt: number, elapsed: number) {
  if (ch.pauseTimer > 0) {
    ch.pauseTimer -= dt;
    ch.headGroup.rotation.x = Math.max(0, Math.sin(elapsed * 9.5 + ch.peckPhase)) * 0.65;
    if (ch.pauseTimer <= 0) {
      const a = Math.random() * Math.PI * 2;
      ch.targetX = ch.homeX + Math.cos(a) * 1.4;
      ch.targetZ = ch.homeZ + Math.sin(a) * 1.4;
    }
    return;
  }

  const dx = ch.targetX - ch.group.position.x;
  const dz = ch.targetZ - ch.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.1) {
    ch.pauseTimer = 1.6 + Math.random() * 2.5;
    return;
  }

  ch.group.rotation.y = Math.atan2(dx, dz);
  const step = Math.min(d, ch.speed * dt);
  ch.group.position.x += (dx / d) * step;
  ch.group.position.z += (dz / d) * step;
  ch.bodyGroup.position.y = Math.abs(Math.sin(elapsed * 12 + ch.peckPhase)) * 0.028;
  ch.headGroup.rotation.x = 0.1;
}

/**
 * Detailed Omani Red Mini Farm Tractor parked beside compound
 */
export function createFarmTractor(): THREE.Group {
  const tractor = new THREE.Group();
  const redPaint = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.35, roughness: 0.35 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.32 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.3, roughness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.45, roughness: 0.1 });

  // Chassis & Hood
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 2.2), darkMetal);
  chassis.position.set(0, 0.52, 0);
  chassis.castShadow = true;
  tractor.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.56, 1.15), redPaint);
  hood.position.set(0, 0.94, 0.48);
  hood.castShadow = true;
  tractor.add(hood);

  // Exhaust Pipe
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.75, 8), darkMetal);
  exhaust.position.set(0.32, 1.48, 0.62);
  tractor.add(exhaust);

  // Open Cab Canopy
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.45), darkMetal);
  seat.position.set(0, 0.92, -0.45);
  tractor.add(seat);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.08, 1.15), redPaint);
  roof.position.set(0, 1.98, -0.42);
  roof.castShadow = true;
  tractor.add(roof);

  [
    [-0.48, -0.9],
    [0.48, -0.9],
    [-0.48, 0.05],
    [0.48, 0.05],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.05, 6), darkMetal);
    pillar.position.set(px, 1.44, pz);
    tractor.add(pillar);
  });

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.04), glassMat);
  windshield.position.set(0, 1.56, 0.05);
  tractor.add(windshield);

  // Headlights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.4 });
  [-0.28, 0.28].forEach((lx) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lightMat);
    lamp.position.set(lx, 0.92, 1.08);
    tractor.add(lamp);
  });

  // Wheels (2 large rear, 2 small front)
  const addWheel = (x: number, y: number, z: number, r: number, w: number) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wg.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.56, w + 0.03, 12), rimMat);
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);
    tractor.add(wg);
  };
  addWheel(-0.68, 0.58, -0.58, 0.58, 0.34);
  addWheel(0.68, 0.58, -0.58, 0.58, 0.34);
  addWheel(-0.6, 0.36, 0.72, 0.36, 0.24);
  addWheel(0.6, 0.36, 0.72, 0.36, 0.24);

  return tractor;
}

/**
 * Wooden Farm Wheelbarrow + Stacked Woven Date Baskets near Barn
 */
export function createWheelbarrowAndProps(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x85532c, roughness: 0.85 });
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5, metalness: 0.25 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  const wb = new THREE.Group();
  const tub = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.28, 0.75), trayMat);
  tub.position.set(0, 0.42, 0);
  tub.castShadow = true;
  wb.add(tub);

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 12), tireMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, 0.18, 0.48);
  wb.add(wheel);

  [-0.22, 0.22].forEach((hx) => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6), woodMat);
    handle.rotation.x = Math.PI / 2 - 0.12;
    handle.position.set(hx, 0.35, -0.15);
    wb.add(handle);
  });
  g.add(wb);

  // Woven Jafeer baskets
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xd4a44a, roughness: 0.9 });
  [0, 1].forEach((b) => {
    const bsk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.32, 10), basketMat);
    bsk.position.set(0.85 + b * 0.45, 0.16, 0.18);
    bsk.castShadow = true;
    g.add(bsk);
  });

  return g;
}

/**
 * Fluttering Oasis Butterflies around crops & orchard
 */
export function createButterflySwarm(count = 8): ButterflyRig[] {
  const list: ButterflyRig[] = [];
  const colors = [0xfbbf24, 0x38bdf8, 0xfb7185, 0xa855f7];

  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const wingMat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      side: THREE.DoubleSide,
    });
    const wingGeo = new THREE.PlaneGeometry(0.13, 0.16);
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.x = -0.06;
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.x = 0.06;
    group.add(leftWing, rightWing);

    const cx = -6 + (i % 4) * 5.2;
    const cz = -3 + Math.floor(i / 4) * 5.5;
    list.push({
      group,
      leftWing,
      rightWing,
      centerX: cx,
      centerZ: cz,
      baseY: 1.05 + (i % 3) * 0.35,
      radius: 1.2 + (i % 3) * 0.6,
      phase: i * 1.1,
      speed: 0.9 + (i % 3) * 0.25,
    });
  }
  return list;
}

export function animateButterflies(list: ButterflyRig[], elapsed: number) {
  list.forEach((b) => {
    const t = elapsed * b.speed + b.phase;
    b.group.position.set(
      b.centerX + Math.cos(t) * b.radius,
      b.baseY + Math.sin(t * 2.6) * 0.22,
      b.centerZ + Math.sin(t * 1.3) * b.radius
    );
    b.group.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t * 1.3));
    const flap = Math.sin(elapsed * 18 + b.phase) * 0.95;
    b.leftWing.rotation.y = flap;
    b.rightWing.rotation.y = -flap;
  });
}

/**
 * Soaring Desert Birds circling gently above the farm oasis
 */
export function createSkyBirds(count = 4): SkyBirdRig[] {
  const list: SkyBirdRig[] = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.14), mat);
    lw.position.x = -0.22;
    const rw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.14), mat);
    rw.position.x = 0.22;
    group.add(lw, rw);

    list.push({
      group,
      leftWing: lw,
      rightWing: rw,
      orbitRadius: 16 + i * 4.5,
      height: 11.5 + (i % 2) * 3.0,
      angle: i * 1.6,
      speed: 0.22 + i * 0.04,
    });
  }
  return list;
}

export function animateSkyBirds(birds: SkyBirdRig[], dt: number, elapsed: number) {
  birds.forEach((b, idx) => {
    b.angle += b.speed * dt;
    b.group.position.set(
      Math.cos(b.angle) * b.orbitRadius,
      b.height + Math.sin(elapsed * 1.2 + idx) * 0.6,
      Math.sin(b.angle) * b.orbitRadius
    );
    b.group.rotation.y = -b.angle;
    const flap = Math.sin(elapsed * 6.5 + idx * 1.4) * 0.35;
    b.leftWing.rotation.z = flap;
    b.rightWing.rotation.z = -flap;
  });
}

/**
 * Authentic Organic Omani Date Palm (segmented bark + arched spine fronds + leaflets + date clusters)
 */
export function createRealisticDatePalm(height = 4.2, frondCount = 14, withDates = true): THREE.Group {
  const group = new THREE.Group();

  const barkTex = makePatternTexture((ctx, w, h) => {
    ctx.fillStyle = '#6c492f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4e331f';
    for (let y = 0; y < h; y += 16) {
      for (let x = y % 32 === 0 ? 0 : 8; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x + 11, y);
        ctx.lineTo(x + 22, y + 8);
        ctx.lineTo(x + 11, y + 14);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.92, metalness: 0.02 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x3b6e2d, roughness: 0.78 });
  const leafletMat = new THREE.MeshStandardMaterial({ color: 0x2a7d39, roughness: 0.62, side: THREE.DoubleSide });
  const midribMat = new THREE.MeshStandardMaterial({ color: 0x4b7733, roughness: 0.74 });

  const segments = 6;
  const segH = height / segments;
  for (let s = 0; s < segments; s++) {
    const t0 = s / segments;
    const t1 = (s + 1) / segments;
    const rBot = 0.25 - t0 * 0.08;
    const rTop = 0.23 - t1 * 0.08;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, segH + 0.04, 10), trunkMat);
    seg.position.y = s * segH + segH / 2;
    seg.position.x = Math.sin(t0 * 1.4) * 0.08;
    seg.castShadow = true;
    seg.receiveShadow = true;
    group.add(seg);
  }

  const topX = Math.sin(1.4) * 0.08;
  const crownHub = new THREE.Group();
  crownHub.position.set(topX, height, 0);

  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), crownMat);
  heart.scale.set(1, 0.9, 1);
  crownHub.add(heart);

  for (let i = 0; i < frondCount; i++) {
    const ringTier = i % 2;
    const yaw = (i / frondCount) * Math.PI * 2 + ringTier * 0.15;
    const frondLen = height * (0.44 + ringTier * 0.06);

    const frondGroup = new THREE.Group();
    frondGroup.rotation.y = yaw;
    frondGroup.rotation.x = ringTier === 0 ? -0.18 : 0.08;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.34, frondLen * 0.35),
      new THREE.Vector3(0, 0.12, frondLen * 0.72),
      new THREE.Vector3(0, -0.35, frondLen),
    ]);
    const spineGeo = new THREE.TubeGeometry(curve, 8, 0.022, 5, false);
    const spine = new THREE.Mesh(spineGeo, midribMat);
    spine.castShadow = true;
    frondGroup.add(spine);

    const pairs = 9;
    const leafletGeo = new THREE.ConeGeometry(0.055, 0.48, 3);
    for (let p = 1; p <= pairs; p++) {
      const u = p / (pairs + 0.6);
      const pt = curve.getPoint(u);
      const leafScale = Math.sin(u * Math.PI) * 0.85 + 0.25;
      [-1, 1].forEach((side) => {
        const blade = new THREE.Mesh(leafletGeo, leafletMat);
        blade.position.copy(pt);
        blade.scale.set(0.7, leafScale, 0.28);
        blade.rotation.z = side * (Math.PI * 0.34);
        blade.rotation.x = 0.45 + u * 0.35;
        frondGroup.add(blade);
      });
    }
    crownHub.add(frondGroup);
  }

  if (withDates) {
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    const dateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.42 });
    for (let d = 0; d < 4; d++) {
      const a = (d / 4) * Math.PI * 2 + 0.3;
      const cluster = new THREE.Group();
      cluster.position.set(Math.cos(a) * 0.34, -0.22, Math.sin(a) * 0.34);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.28, 5), stalkMat);
      stem.position.y = 0.1;
      cluster.add(stem);
      for (let berry = 0; berry < 5; berry++) {
        const dtMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 7), dateMat);
        dtMesh.scale.set(0.85, 1.3, 0.85);
        dtMesh.position.set(
          Math.cos(berry * 1.25) * 0.06,
          -0.06 - (berry % 2) * 0.06,
          Math.sin(berry * 1.25) * 0.06
        );
        cluster.add(dtMesh);
      }
      crownHub.add(cluster);
    }
  }

  group.add(crownHub);
  return group;
}

/**
 * Multi-branched Omani Mango Tree with lush foliage canopy & hanging mangoes
 */
export function createRealisticMangoTree(scale = 1.0): THREE.Group {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.92, metalness: 0.02 });
  const canopyPalette = [0x1f6e33, 0x287d3b, 0x2e8b42, 0x1b5e2d];

  const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.45, 9), trunkMat);
  mainTrunk.position.y = 0.72;
  mainTrunk.castShadow = true;
  mainTrunk.receiveShadow = true;
  group.add(mainTrunk);

  const branches: Array<{ yaw: number; tilt: number; len: number; y: number; r: number }> = [
    { yaw: 0.2, tilt: 0.48, len: 1.05, y: 1.35, r: 0.95 },
    { yaw: 1.8, tilt: 0.52, len: 1.0, y: 1.38, r: 0.92 },
    { yaw: 3.5, tilt: 0.45, len: 1.1, y: 1.32, r: 0.98 },
    { yaw: 5.0, tilt: 0.5, len: 0.95, y: 1.4, r: 0.88 },
  ];

  const mangoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.38, metalness: 0.04 });
  const mangoGreenMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.42 });

  branches.forEach((b, idx) => {
    const brPivot = new THREE.Group();
    brPivot.position.set(0, b.y, 0);
    brPivot.rotation.y = b.yaw;

    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, b.len, 7), trunkMat);
    limb.rotation.z = -b.tilt;
    limb.position.set(Math.sin(b.tilt) * b.len * 0.5, Math.cos(b.tilt) * b.len * 0.5, 0);
    limb.castShadow = true;
    brPivot.add(limb);

    const tipX = Math.sin(b.tilt) * b.len;
    const tipY = Math.cos(b.tilt) * b.len;

    const leafMat = new THREE.MeshStandardMaterial({
      color: canopyPalette[idx % canopyPalette.length],
      roughness: 0.76,
    });
    const lobe = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 1), leafMat);
    lobe.scale.set(1.18, 0.84, 1.14);
    lobe.position.set(tipX, tipY + 0.25, 0);
    lobe.castShadow = true;
    lobe.receiveShadow = true;
    brPivot.add(lobe);

    const subLobe = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r * 0.68, 1), leafMat);
    subLobe.position.set(tipX * 1.25, tipY - 0.05, 0.32);
    subLobe.castShadow = true;
    brPivot.add(subLobe);

    for (let m = 0; m < 2; m++) {
      const fruit = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 8, 8),
        m === 0 ? mangoMat : mangoGreenMat
      );
      fruit.scale.set(0.85, 1.32, 0.85);
      fruit.position.set(tipX + (m === 0 ? 0.25 : -0.18), tipY - 0.36, m === 0 ? 0.28 : -0.25);
      fruit.rotation.z = 0.18;
      brPivot.add(fruit);
    }

    group.add(brPivot);
  });

  const crownTop = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.12, 1),
    new THREE.MeshStandardMaterial({ color: 0x267938, roughness: 0.75 })
  );
  crownTop.scale.set(1.15, 0.85, 1.15);
  crownTop.position.set(0, 2.75, 0);
  crownTop.castShadow = true;
  crownTop.receiveShadow = true;
  group.add(crownTop);

  group.scale.setScalar(scale);
  return group;
}

/**
 * Instanced field of multi-blade grass tufts
 */
export function createInstancedGrassField(count = 720): THREE.InstancedMesh {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];

  const bladeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  bladeAngles.forEach((ang, i) => {
    const w = 0.045;
    const h = 0.24 + (i % 2) * 0.07;
    const lean = 0.06;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    positions.push(-w * sin, 0, w * cos, w * sin, 0, -w * cos, lean * cos, h, lean * sin);
    normals.push(0, 0.7, 0.7, 0, 0.7, 0.7, 0, 0.7, 0.7);
  });

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let gx = 0;
    let gz = 0;
    const zone = i % 10;
    if (zone <= 3) {
      gx = -17.5 + Math.random() * 8.2;
      gz = -8.5 + Math.random() * 17;
    } else if (zone <= 6) {
      gx = 12.8 + Math.random() * 7.5;
      gz = -10.5 + Math.random() * 19.5;
    } else if (zone <= 8) {
      gx = -14 + Math.random() * 30;
      gz = i % 2 === 0 ? 7.8 + Math.random() * 4.8 : -13 + Math.random() * 4.2;
    } else {
      gx = -8.5 + Math.random() * 11;
      gz = -7.8 + Math.random() * 3.0;
    }

    dummy.position.set(gx, 0.02, gz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const sc = 0.78 + Math.random() * 0.65;
    dummy.scale.set(sc, sc * (0.85 + Math.random() * 0.5), sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    col.setHSL(0.25 + Math.random() * 0.06, 0.45 + Math.random() * 0.25, 0.28 + Math.random() * 0.14);
    mesh.setColorAt(i, col);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Real-time 3D Particle Burst + Floating Text Sprite FX Engine
 */
interface ActiveParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface FloatingBanner {
  sprite: THREE.Sprite;
  vy: number;
  life: number;
  maxLife: number;
}

export class GameEffects3D {
  private group = new THREE.Group();
  private particles: ActiveParticle[] = [];
  private banners: FloatingBanner[] = [];
  private sharedBox = new THREE.BoxGeometry(0.11, 0.11, 0.11);

  attach(scene: THREE.Scene) {
    scene.add(this.group);
  }

  spawnBurst(x: number, y: number, z: number, colorHex: number, count = 16, upward = 3.2) {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sharedBox, mat);
      m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6);
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 1.9;
      this.group.add(m);
      this.particles.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: upward * (0.6 + Math.random() * 0.7),
        vz: Math.sin(ang) * spd,
        life: 0.85 + Math.random() * 0.45,
        maxLife: 1.25,
      });
    }
  }

  spawnFloatingLabel(x: number, y: number, z: number, text: string, bgHex = '#065f46') {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgHex;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(10, 14, 340, 68, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 26), 180, 49);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(2.8, 0.76, 1);
    sprite.renderOrder = 20;
    this.group.add(sprite);

    this.banners.push({
      sprite,
      vy: 1.15,
      life: 1.65,
      maxLife: 1.65,
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 7.5 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.y += dt * 5;
      p.mesh.scale.setScalar(Math.max(0.1, p.life / p.maxLife));
    }

    for (let i = this.banners.length - 1; i >= 0; i--) {
      const b = this.banners[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.group.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
        this.banners.splice(i, 1);
        continue;
      }
      b.sprite.position.y += b.vy * dt;
      b.sprite.material.opacity = Math.min(1, (b.life / b.maxLife) * 1.4);
    }
  }

  dispose() {
    this.sharedBox.dispose();
    this.particles.forEach((p) => (p.mesh.material as THREE.Material).dispose());
    this.banners.forEach((b) => {
      b.sprite.material.map?.dispose();
      b.sprite.material.dispose();
    });
    this.particles = [];
    this.banners = [];
  }
}

/**
 * Omani Jebel Mountain Goat for Pasture
 */
export function createOmaniGoat(homeX: number, homeZ: number, wanderRadius = 1.6): GoatRig {
  const group = new THREE.Group();
  group.position.set(homeX, 0, homeZ);

  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.72), getContactShadowMaterial());
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  const coatMat = new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.8 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x4b4237, roughness: 0.55 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 10), coatMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.46;
  body.castShadow = true;
  group.add(body);

  const legs: THREE.Group[] = [];
  [
    [-0.1, 0.2],
    [0.1, 0.2],
    [-0.1, -0.2],
    [0.1, -0.2],
  ].forEach(([lx, lz]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.34, lz);
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.026, 0.32, 6), darkMat);
    legMesh.position.y = -0.16;
    legMesh.castShadow = true;
    legPivot.add(legMesh);
    group.add(legPivot);
    legs.push(legPivot);
  });

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.54, 0.3);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 7), darkMat);
  neck.position.set(0, 0.06, 0.04);
  neck.rotation.x = 0.38;
  headGroup.add(neck);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.24), coatMat);
  skull.position.set(0, 0.16, 0.14);
  skull.castShadow = true;
  headGroup.add(skull);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 5), darkMat);
  beard.position.set(0, 0.06, 0.24);
  beard.rotation.x = Math.PI;
  headGroup.add(beard);

  [-1, 1].forEach((side) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.18, 6), hornMat);
    horn.position.set(side * 0.055, 0.27, 0.1);
    horn.rotation.x = -0.45;
    horn.rotation.z = -side * 0.18;
    headGroup.add(horn);
  });
  group.add(headGroup);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.11, 5), darkMat);
  tail.position.set(0, 0.56, -0.26);
  tail.rotation.x = -0.6;
  group.add(tail);

  return {
    group,
    headGroup,
    legs,
    homeX,
    homeZ,
    wanderRadius,
    targetX: homeX + 0.3,
    targetZ: homeZ - 0.3,
    pauseTimer: 1.0 + Math.random() * 2.0,
    walkPhase: Math.random() * Math.PI * 2,
    speed: 0.65 + Math.random() * 0.2,
    happyHopTimer: 0,
  };
}

export function animateGoat(goat: GoatRig, dt: number, elapsed: number) {
  if (goat.happyHopTimer > 0) {
    goat.happyHopTimer -= dt;
    goat.group.position.y = Math.abs(Math.sin(goat.happyHopTimer * 12)) * 0.26;
  } else {
    goat.group.position.y = 0;
  }

  if (goat.pauseTimer > 0) {
    goat.pauseTimer -= dt;
    goat.headGroup.rotation.x = THREE.MathUtils.damp(goat.headGroup.rotation.x, 0.32 + Math.sin(elapsed * 2.5) * 0.1, 5, dt);
    goat.legs.forEach((l) => (l.rotation.x = THREE.MathUtils.damp(l.rotation.x, 0, 8, dt)));
    if (goat.pauseTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 0.4 + Math.random() * goat.wanderRadius;
      goat.targetX = goat.homeX + Math.cos(ang) * dist;
      goat.targetZ = goat.homeZ + Math.sin(ang) * dist;
    }
    return;
  }

  const dx = goat.targetX - goat.group.position.x;
  const dz = goat.targetZ - goat.group.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.14) {
    goat.pauseTimer = 2.5 + Math.random() * 3.0;
    return;
  }

  const yaw = Math.atan2(dx, dz);
  let diff = yaw - goat.group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  goat.group.rotation.y += diff * Math.min(1, dt * 4.2);

  const step = Math.min(dist, goat.speed * dt);
  goat.group.position.x += (dx / dist) * step;
  goat.group.position.z += (dz / dist) * step;
  goat.walkPhase += dt * 7.5;
  const swing = Math.sin(goat.walkPhase) * 0.45;
  goat.legs[0].rotation.x = swing;
  goat.legs[3].rotation.x = swing;
  goat.legs[1].rotation.x = -swing;
  goat.legs[2].rotation.x = -swing;
  goat.headGroup.rotation.x = 0.05;
}

/**
 * Omani Sidr Beehive Apiary (عريش ومناحل العسل) + Animated Bees
 */
export function createOmaniBeehiveApiary(worldX: number, worldZ: number): {
  group: THREE.Group;
  bees: BeeRig[];
  extraHiveGroup: THREE.Group;
} {
  const group = new THREE.Group();
  group.position.set(worldX, 0.06, worldZ);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x714b2c, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc29b61, roughness: 0.88 });
  const hiveWoodMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.72 });
  const hiveLidMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55 });
  const honeyJarMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.12 });

  // Shaded Arish shelter posts
  [
    [-1.4, -0.9],
    [1.4, -0.9],
    [-1.4, 0.9],
    [1.4, 0.9],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.9, 6), postMat);
    post.position.set(px, 0.95, pz);
    post.castShadow = true;
    group.add(post);
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 2.2), roofMat);
  roof.position.set(0, 1.92, 0);
  roof.rotation.x = -0.06;
  roof.castShadow = true;
  group.add(roof);

  // Bench + 3 wooden Langstroth/Omani log hives
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.7), postMat);
  bench.position.set(0, 0.42, 0);
  group.add(bench);

  [-0.78, 0, 0.78].forEach((hx) => {
    const hiveBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.44, 0.48), hiveWoodMat);
    hiveBox.position.set(hx, 0.7, 0);
    hiveBox.castShadow = true;
    group.add(hiveBox);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.08, 0.54), hiveLidMat);
    lid.position.set(hx, 0.96, 0);
    group.add(lid);
  });

  // Extra upgraded log-hive shelf shown at beehiveApiary Lv2+
  const extraHiveGroup = new THREE.Group();
  const logHive = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.85, 10), hiveWoodMat);
  logHive.rotation.z = Math.PI / 2;
  logHive.position.set(0, 1.24, 0);
  extraHiveGroup.add(logHive);
  for (let j = -1; j <= 1; j++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), honeyJarMat);
    jar.position.set(0.45 + j * 0.22, 0.58, 0.55);
    extraHiveGroup.add(jar);
  }
  group.add(extraHiveGroup);

  // Orbiting animated bees
  const bees: BeeRig[] = [];
  const beeBodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  for (let b = 0; b < 7; b++) {
    const bg = new THREE.Group();
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), beeBodyMat);
    thorax.scale.set(0.9, 0.85, 1.35);
    bg.add(thorax);

    const wingGeo = new THREE.PlaneGeometry(0.055, 0.032);
    const lw = new THREE.Mesh(wingGeo, wingMat);
    lw.position.set(-0.04, 0.025, 0);
    lw.rotation.x = Math.PI / 2;
    bg.add(lw);
    const rw = new THREE.Mesh(wingGeo, wingMat);
    rw.position.set(0.04, 0.025, 0);
    rw.rotation.x = Math.PI / 2;
    bg.add(rw);

    bees.push({
      group: bg,
      leftWing: lw,
      rightWing: rw,
      centerX: worldX + (b % 3 - 1) * 0.45,
      centerZ: worldZ + (b % 2 === 0 ? 0.35 : -0.35),
      baseY: 1.05 + (b % 3) * 0.22,
      radius: 0.6 + (b % 3) * 0.28,
      phase: b * 0.9,
      speed: 2.2 + (b % 3) * 0.45,
    });
  }

  return { group, bees, extraHiveGroup };
}

export function animateBees(bees: BeeRig[], elapsed: number) {
  bees.forEach((b) => {
    const t = elapsed * b.speed + b.phase;
    const x = b.centerX + Math.cos(t) * b.radius;
    const z = b.centerZ + Math.sin(t * 1.15) * (b.radius * 0.85);
    const y = b.baseY + Math.sin(t * 2.4) * 0.16;
    b.group.position.set(x, y, z);
    b.group.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t * 1.15));
    const flap = Math.sin(elapsed * 28 + b.phase) * 0.6;
    b.leftWing.rotation.z = flap;
    b.rightWing.rotation.z = -flap;
  });
}

/**
 * Omani Souq Market Stall (متجر وسوق المزرعة الشعبي)
 */
export function createOmaniMarketStall(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xd6b88d, roughness: 0.78 });
  const awningA = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.72 });
  const awningB = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.75 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xc2954e, roughness: 0.88 });

  // 4 corner posts
  [
    [-1.4, -0.8],
    [1.4, -0.8],
    [-1.4, 0.8],
    [1.4, 0.8],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 7), woodMat);
    post.position.set(px, 1.1, pz);
    post.castShadow = true;
    group.add(post);
  });

  // Counter desk
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.85, 0.82), woodMat);
  counter.position.set(0, 0.425, 0.35);
  counter.castShadow = true;
  group.add(counter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 0.94), counterMat);
  counterTop.position.set(0, 0.88, 0.35);
  group.add(counterTop);

  // Striped Omani Souq awning
  for (let s = 0; s < 6; s++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 2.15), s % 2 === 0 ? awningA : awningB);
    strip.position.set(-1.35 + s * 0.54, 2.24, 0);
    strip.rotation.x = 0.14;
    strip.castShadow = true;
    group.add(strip);
  }

  // Produce display baskets & crates on counter
  const produceColors = [0x15803d, 0xf59e0b, 0x9333ea, 0xeab308];
  produceColors.forEach((col, i) => {
    const x = -0.95 + i * 0.62;
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.18, 9), basketMat);
    basket.position.set(x, 1.0, 0.35);
    group.add(basket);

    const goods = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
    );
    goods.scale.set(1.0, 0.62, 1.0);
    goods.position.set(x, 1.1, 0.35);
    group.add(goods);
  });

  // Hanging brass lantern
  const lantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
  );
  lantern.position.set(1.15, 1.85, 0.72);
  group.add(lantern);

  return group;
}

/**
 * Stone Irrigation Well & Mechanical Falaj Pump Rig
 */
export function createWellPumpRig(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.55, roughness: 0.35 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x714b2c, roughness: 0.88 });

  const wellRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.18, 8, 16), stoneMat);
  wellRing.rotation.x = Math.PI / 2;
  wellRing.position.y = 0.36;
  wellRing.castShadow = true;
  group.add(wellRing);

  const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.84, 0.45, 14), stoneMat);
  wellBase.position.y = 0.22;
  group.add(wellBase);

  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 14),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.2 })
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.35;
  group.add(waterSurface);

  [-0.65, 0.65].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.45, 6), woodMat);
    post.position.set(px, 0.95, 0);
    group.add(post);
  });

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 6), woodMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.y = 1.62;
  group.add(crossbar);

  const pumpPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), metalMat);
  pumpPipe.rotation.z = Math.PI / 2;
  pumpPipe.position.set(0.85, 0.92, 0);
  group.add(pumpPipe);

  return group;
}

