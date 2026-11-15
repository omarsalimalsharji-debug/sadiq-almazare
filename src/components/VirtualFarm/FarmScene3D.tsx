import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VirtualCropDef } from '../../data/virtualFarmData.ts';
import {
  createOmaniSkyDome,
  createSkyClouds,
  createAlHajarMountains,
  createFalajWaterMaterial,
  createOmaniFarmer,
  animateOmaniFarmer,
  triggerFarmerAction,
  clearFarmerTools,
  createRealisticCow,
  animateCow,
  createChicken,
  animateChicken,
  createFarmTractor,
  createWheelbarrowAndProps,
  createButterflySwarm,
  animateButterflies,
  createSkyBirds,
  animateSkyBirds,
  createRealisticDatePalm,
  createRealisticMangoTree,
  createInstancedGrassField,
  createOmaniGoat,
  animateGoat,
  createOmaniBeehiveApiary,
  animateBees,
  createOmaniMarketStall,
  createWellPumpRig,
  GameEffects3D,
  FarmerRig,
  FarmerAnimMode,
  CowRig,
  ChickenRig,
  ButterflyRig,
  SkyBirdRig,
  GoatRig,
  BeeRig,
} from './OmaniModels3D.ts';

export type FarmCameraPreset = 'overview' | 'farmer' | 'pasture' | 'field' | 'greenhouse' | 'falaj' | 'market' | 'apiary';

export interface FarmPlotState {
  id: string;
  plotIndex: number;
  isGreenhouse: boolean;
  isUnlocked: boolean;
  soilPrepared: boolean;
  soilLeveled: boolean;
  cropId: string | null;
  stageIndex: number;
  moisture: number;
  nutrients: number;
  health: number;
  weedsLevel: number;
  pestType: string | null;
  pruned: boolean;
  blockedReason: string | null;
  harvestedCount: number;
  lastStageAdvanceAt?: number | null;
  plantedAt?: number | null;
}

export interface FarmState3D {
  plots: FarmPlotState[];
  waterLiters: number;
  maxWaterLiters: number;
  greenhouseLevel: number;
  greenhouseVentilation: boolean;
  greenhouseIrrigationAuto: boolean;
  greenhouseShading: number;
  buildings?: {
    wellPump?: number;
    barnStorage?: number;
    beehiveApiary?: number;
    livestockShelter?: number;
  };
}

export interface MoveVector2 {
  x: number;
  y: number;
}

export interface NearbyFarmTarget {
  type: 'plot' | 'cows' | 'falaj' | 'greenhouse' | 'tractor' | 'market' | 'apiary' | 'barn';
  plotId?: string;
  label: string;
}

export interface FarmVisualCommand {
  nonce: number;
  plotId?: string;
  action: FarmerAnimMode;
  bannerText?: string;
}

interface FarmScene3DProps {
  farm: FarmState3D;
  crops: VirtualCropDef[];
  selectedPlotId: string | null;
  onSelectPlot: (plotId: string) => void;
  onInspectFeature?: (label: string, kind?: 'cow' | 'tree' | 'tractor' | 'chicken' | 'goat' | 'bees' | 'market' | 'well') => void;
  onNearbyChange?: (target: NearbyFarmTarget | null) => void;
  cameraPreset: FarmCameraPreset;
  presetTrigger: number;
  moveInputRef?: React.MutableRefObject<MoveVector2>;
  visualCommand?: FarmVisualCommand | null;
}

const _tmpVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetCtrlPos = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _prevFarmerPos = new THREE.Vector3();

const CAMERA_PRESETS: Record<FarmCameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [15.0, 12.2, 16.5], target: [-0.4, 0.8, 0.2] },
  farmer: { pos: [1.0, 4.9, 10.2], target: [1.0, 1.25, 4.5] },
  pasture: { pos: [-10.2, 5.8, 8.8], target: [-14.2, 1.0, 0.6] },
  field: { pos: [-2.5, 8.4, 11.2], target: [-3.0, 0.4, 1.2] },
  greenhouse: { pos: [9.5, 5.8, 8.2], target: [7.2, 1.1, -1.0] },
  falaj: { pos: [-11.5, 6.2, -6.2], target: [-8.0, 1.2, -5.2] },
  market: { pos: [4.2, 4.5, 11.6], target: [1.8, 1.0, 7.2] },
  apiary: { pos: [9.4, 4.4, 9.6], target: [12.6, 1.0, 5.0] },
};

const PLOT_COORDS: Array<{ x: number; z: number }> = [
  { x: -6.2, z: -1.6 },
  { x: -2.8, z: -1.6 },
  { x: 0.6, z: -1.6 },
  { x: -6.2, z: 2.6 },
  { x: -2.8, z: 2.6 },
  { x: 0.6, z: 2.6 },
  { x: 7.2, z: -3.4 },
  { x: 7.2, z: -0.6 },
  { x: 7.2, z: 2.2 },
];

const ACTION_BURST_CFG: Record<FarmerAnimMode, { color: number; bannerBg: string; defaultLabel: string }> = {
  idle: { color: 0x34d399, bannerBg: '#065f46', defaultLabel: 'جاهز للعمل' },
  walk: { color: 0x34d399, bannerBg: '#065f46', defaultLabel: 'تجول' },
  plow: { color: 0xb45309, bannerBg: '#78350f', defaultLabel: '⛏️ تم الحرث' },
  level_soil: { color: 0xd97706, bannerBg: '#92400e', defaultLabel: '🪵 تمت التسوية' },
  plant: { color: 0x22c55e, bannerBg: '#166534', defaultLabel: '🌱 تمت الزراعة!' },
  irrigate: { color: 0x38bdf8, bannerBg: '#0369a1', defaultLabel: '💧 تم الري!' },
  fertilize: { color: 0x84cc16, bannerBg: '#3f6212', defaultLabel: '✨ تم التسميد!' },
  weed: { color: 0xfacc15, bannerBg: '#854d0e', defaultLabel: '🌿 أُزيلت الأعشاب' },
  prune: { color: 0x2dd4bf, bannerBg: '#115e59', defaultLabel: '✂️ تم التقليم' },
  pest_control: { color: 0xfb7185, bannerBg: '#9f1239', defaultLabel: '🛡️ مكافحة آمنة!' },
  harvest: { color: 0xf59e0b, bannerBg: '#b45309', defaultLabel: '🌾 مبارك الحصاد!' },
  feed_livestock: { color: 0x84cc16, bannerBg: '#3f6212', defaultLabel: '🌿 تم الإطعام!' },
  collect_livestock: { color: 0xfbbf24, bannerBg: '#92400e', defaultLabel: '🍯 تم جمع الإنتاج!' },
  sell_market: { color: 0x10b981, bannerBg: '#065f46', defaultLabel: '🪙 ربح السوق!' },
  upgrade_building: { color: 0x38bdf8, bannerBg: '#075985', defaultLabel: '🏗️ تطوير منشأة!' },
};

function createCanvasTexture(
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  width = 256,
  height = 256,
  repeatX = 1,
  repeatY = 1,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function buildCropVisualGroup(
  cropId: string,
  crop: VirtualCropDef | undefined,
  stageIndex: number,
  scaleFactor: number,
  health: number
): THREE.Group {
  const group = new THREE.Group();
  const isUnhealthy = health < 55;
  const leafColor = isUnhealthy ? 0x9ca341 : 0x2e8b3c;
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.72, metalness: 0.02 });

  if (cropId === 'faradh_palm') {
    const palmHeight = 0.85 + stageIndex * 0.42;
    const frondCount = 7 + stageIndex * 2;
    const palmModel = createRealisticDatePalm(palmHeight, frondCount, stageIndex >= 3);
    group.add(palmModel);
  } else if (cropId === 'omani_wheat' || cropId === 'sesame') {
    const rows = 3;
    const cols = 4;
    const stalkH = 0.28 + scaleFactor * 0.65;
    const earColor =
      cropId === 'omani_wheat'
        ? stageIndex >= 4
          ? 0xeab308
          : 0x84cc16
        : stageIndex >= 2 && stageIndex <= 3
          ? 0xf8fafc
          : 0xd97706;
    const earMat = new THREE.MeshStandardMaterial({ color: earColor, roughness: 0.65 });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (r - 1) * 0.55;
        const pz = (c - 1.5) * 0.42;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, stalkH, 5), leafMat);
        stalk.position.set(px, stalkH / 2, pz);
        group.add(stalk);

        if (stageIndex >= 2) {
          const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 4, 6), earMat);
          head.position.set(px, stalkH + 0.05, pz);
          group.add(head);
        }
      }
    }
  } else if (cropId === 'onion' || cropId === 'garlic' || cropId === 'potato') {
    const bulbColor = cropId === 'onion' ? 0x9333ea : cropId === 'garlic' ? 0xf1f5f9 : 0xca8a04;
    const bulbMat = new THREE.MeshStandardMaterial({ color: bulbColor, roughness: 0.65 });
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const px = r * 0.55;
        const pz = c * 0.55;
        if (stageIndex >= 2) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scaleFactor + 0.04, 8, 8), bulbMat);
          bulb.position.set(px, 0.06, pz);
          group.add(bulb);
        }
        for (let l = 0; l < 3; l++) {
          const shoot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25 + scaleFactor * 0.32, 5), leafMat);
          shoot.position.set(px + (l - 1) * 0.04, 0.18 + scaleFactor * 0.12, pz);
          shoot.rotation.z = (l - 1) * 0.18;
          group.add(shoot);
        }
      }
    }
  } else if (cropId === 'omani_lemon') {
    const trunkH = 0.45 + scaleFactor * 0.65;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const crownR = 0.34 + scaleFactor * 0.45;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(crownR, 1), leafMat);
    crown.position.y = trunkH + crownR * 0.55;
    crown.castShadow = true;
    group.add(crown);

    if (stageIndex === 2) {
      const blossomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), blossomMat);
        fl.position.set(
          Math.cos(ang) * crownR * 0.78,
          trunkH + crownR * (0.45 + (b % 2) * 0.25),
          Math.sin(ang) * crownR * 0.78
        );
        group.add(fl);
      }
    } else if (stageIndex >= 3) {
      const lemonColor = stageIndex >= 4 ? 0xfacc15 : 0x65a30d;
      const lemonMat = new THREE.MeshStandardMaterial({ color: lemonColor, roughness: 0.42 });
      for (let f = 0; f < 6; f++) {
        const ang = (f / 6) * Math.PI * 2 + 0.3;
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), lemonMat);
        fruit.scale.set(0.9, 1.15, 0.9);
        fruit.position.set(
          Math.cos(ang) * crownR * 0.82,
          trunkH + crownR * (0.35 + (f % 3) * 0.22),
          Math.sin(ang) * crownR * 0.82
        );
        group.add(fruit);
      }
    }
  } else {
    const fruitHex = crop?.colorHex ? parseInt(crop.colorHex.replace('#', ''), 16) : 0xef4444;
    const fruitColor = stageIndex >= 4 ? fruitHex : 0x4ade80;
    const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.45 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    for (let i = -1; i <= 1; i += 2) {
      const px = i * 0.45;
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 6), stakeMat);
      stake.position.set(px, 0.42, 0);
      group.add(stake);

      const bushH = 0.22 + scaleFactor * 0.55;
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * scaleFactor + 0.1, 0), leafMat);
      bush.position.set(px, bushH * 0.6, 0);
      bush.castShadow = true;
      group.add(bush);

      if (stageIndex === 2) {
        for (let f = 0; f < 3; f++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), flowerMat);
          fl.position.set(px + (f - 1) * 0.12, bushH * 0.75, 0.16);
          group.add(fl);
        }
      } else if (stageIndex >= 3) {
        for (let f = 0; f < 3; f++) {
          const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scaleFactor, 8, 8), fruitMat);
          fruit.position.set(px + (f - 1) * 0.13, bushH * 0.55 + (f % 2) * 0.1, 0.18);
          group.add(fruit);
        }
      }
    }
  }

  return group;
}

export const FarmScene3D: React.FC<FarmScene3DProps> = ({
  farm,
  crops,
  selectedPlotId,
  onSelectPlot,
  onInspectFeature,
  onNearbyChange,
  cameraPreset,
  presetTrigger,
  moveInputRef,
  visualCommand,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectPlotRef = useRef(onSelectPlot);
  onSelectPlotRef.current = onSelectPlot;
  const onInspectFeatureRef = useRef(onInspectFeature);
  onInspectFeatureRef.current = onInspectFeature;
  const onNearbyChangeRef = useRef(onNearbyChange);
  onNearbyChangeRef.current = onNearbyChange;

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    farmerRig: FarmerRig;
    cows: CowRig[];
    goats: GoatRig[];
    chickens: ChickenRig[];
    bees: BeeRig[];
    butterflies: ButterflyRig[];
    birds: SkyBirdRig[];
    clouds: THREE.Group[];
    palms: THREE.Group[];
    mangoTrees: THREE.Group[];
    falajWaterMat: THREE.ShaderMaterial;
    beaconMesh: THREE.Mesh;
    effects: GameEffects3D;
    autoWalkTask: {
      targetX: number;
      targetZ: number;
      lookX: number;
      lookZ: number;
      action: FarmerAnimMode;
      bannerText?: string;
    } | null;
    plotHandles: Map<
      string,
      {
        soilMesh: THREE.Mesh;
        ringMesh: THREE.Mesh;
        cropHolder: THREE.Group;
        weedHolder: THREE.Group;
        pestHolder: THREE.Group;
        lockMesh: THREE.Mesh;
        lastSig: string;
        coordX: number;
        coordZ: number;
      }
    >;
    waterLevelMesh: THREE.Mesh | null;
    fanGroup: THREE.Group | null;
    shadeNetMesh: THREE.Mesh | null;
    ghExpandGroup: THREE.Group | null;
    extraHiveGroup: THREE.Group | null;
    wellPumpGroup: THREE.Group | null;
    barnRoofBadge: THREE.Mesh | null;
    soilTexRaw: THREE.CanvasTexture;
    soilTexPlowed: THREE.CanvasTexture;
    soilTexLeveled: THREE.CanvasTexture;
    soilTexWet: THREE.CanvasTexture;
    soilTexLocked: THREE.CanvasTexture;
    isTransitioning: boolean;
    activePreset: FarmCameraPreset;
    lastNearbyKey: string;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(300, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xdfebf2, 0.009);

    // Custom GLSL Atmospheric Sky Dome + Floating Clouds + Birds
    const skyDome = createOmaniSkyDome();
    scene.add(skyDome);
    const clouds = createSkyClouds();
    clouds.forEach((c) => scene.add(c));
    const birds = createSkyBirds(4);
    birds.forEach((b) => scene.add(b.group));

    // Studio PMREM reflection lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 220);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.068;
    controls.minDistance = 4.2;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.minPolarAngle = 0.16;
    controls.update();

    // Warm Golden Sun + Cool Sky Hemisphere + Rim Light
    const hemiLight = new THREE.HemisphereLight(0xdbf2ff, 0x8a6d49, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.35);
    sunLight.position.set(22, 27, 16);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 24;
    sunLight.shadow.camera.bottom = -24;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xaad8ff, 0.62);
    rimLight.position.set(-18, 12, -18);
    scene.add(rimLight);

    const disposableTextures: THREE.Texture[] = [];
    const groundTex = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#c8aa79';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1200; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(155,118,68,0.16)' : 'rgba(228,205,160,0.22)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
        }
      },
      256,
      256,
      22,
      22,
      maxAniso
    );
    const grassMeadowTex = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#4c7e33';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1200; i++) {
          ctx.fillStyle = i % 3 === 0 ? 'rgba(58, 102, 40, 0.36)' : 'rgba(110, 158, 60, 0.32)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 3, 6);
        }
      },
      256,
      256,
      8,
      8,
      maxAniso
    );
    const soilTexRaw = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#9c7853';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 400; i++) {
          ctx.fillStyle = 'rgba(70,48,28,0.25)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 5, 3);
        }
      },
      128,
      128,
      2,
      2,
      maxAniso
    );
    const soilTexPlowed = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#7c5534';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5c3c22';
        for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 7);
      },
      128,
      128,
      1,
      1,
      maxAniso
    );
    const soilTexLeveled = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#704b2d';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(56,36,18,0.35)';
        for (let y = 8; y < h; y += 24) ctx.fillRect(4, y, w - 8, 4);
      },
      128,
      128,
      1,
      1,
      maxAniso
    );
    const soilTexWet = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#4a2f1a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(30,20,10,0.35)';
        for (let y = 8; y < h; y += 24) ctx.fillRect(4, y, w - 8, 5);
      },
      128,
      128,
      1,
      1,
      maxAniso
    );
    const soilTexLocked = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#bfa684';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,90,50,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.stroke();
      },
      128,
      128,
      1,
      1,
      maxAniso
    );
    disposableTextures.push(
      groundTex,
      grassMeadowTex,
      soilTexRaw,
      soilTexPlowed,
      soilTexLeveled,
      soilTexWet,
      soilTexLocked
    );

    // 1. Oasis Desert Floor + Lush Meadows + Walkways + Grass Field
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.94, metalness: 0.0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 190), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const meadowMat = new THREE.MeshStandardMaterial({ map: grassMeadowTex, roughness: 0.88, metalness: 0.0 });
    const cowPastureFloor = new THREE.Mesh(new THREE.CircleGeometry(7.2, 24), meadowMat);
    cowPastureFloor.rotation.x = -Math.PI / 2;
    cowPastureFloor.scale.set(0.85, 1.32, 1);
    cowPastureFloor.position.set(-14.2, 0.015, 0.5);
    cowPastureFloor.receiveShadow = true;
    scene.add(cowPastureFloor);

    const orchardFloor = new THREE.Mesh(new THREE.CircleGeometry(6.8, 24), meadowMat);
    orchardFloor.rotation.x = -Math.PI / 2;
    orchardFloor.scale.set(0.8, 1.4, 1);
    orchardFloor.position.set(16.0, 0.015, -0.5);
    orchardFloor.receiveShadow = true;
    scene.add(orchardFloor);

    const yardMat = new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 0.9 });
    const yard = new THREE.Mesh(new THREE.BoxGeometry(23, 0.08, 16), yardMat);
    yard.position.set(1.5, 0.02, -0.5);
    yard.receiveShadow = true;
    scene.add(yard);

    const walkMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
    const mainWalk = new THREE.Mesh(new THREE.BoxGeometry(22, 0.06, 1.5), walkMat);
    mainWalk.position.set(1.0, 0.06, 0.5);
    mainWalk.receiveShadow = true;
    scene.add(mainWalk);

    const crossWalk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 13.5), walkMat);
    crossWalk.position.set(3.4, 0.06, 0.2);
    crossWalk.receiveShadow = true;
    scene.add(crossWalk);

    const grassField = createInstancedGrassField(760);
    scene.add(grassField);

    // 2. Sculpted Multi-Ridge Al Hajar Mountains + Omani Compound Walls
    const mountainRange = createAlHajarMountains();
    scene.add(mountainRange);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9c6a5, roughness: 0.88 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x7c4e2d, roughness: 0.88 });
    [
      [-10.2, 0.5, -0.5],
      [13.2, 0.5, -0.5],
    ].forEach(([fx, fy, fz]) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 16.5), wallMat);
      sideWall.position.set(fx, fy, fz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      scene.add(sideWall);
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(23.8, 1.05, 0.4), wallMat);
    backWall.position.set(1.5, 0.52, -8.7);
    backWall.castShadow = true;
    scene.add(backWall);

    // Paddock Fence + Trough + Hay Bale
    const paddockPosts: Array<[number, number]> = [
      [-18.0, -4.5], [-18.0, 0.5], [-18.0, 5.5],
      [-14.5, -4.5], [-11.0, -4.5],
      [-14.5, 5.5], [-11.0, 5.5],
    ];
    paddockPosts.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 1.05, 6), postMat);
      post.position.set(px, 0.52, pz);
      post.castShadow = true;
      scene.add(post);
    });
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.08), postMat);
    railBack.position.set(-14.5, 0.85, -4.5);
    scene.add(railBack);
    const railFront = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.08), postMat);
    railFront.position.set(-14.5, 0.85, 5.5);
    scene.add(railFront);
    const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 10.2), postMat);
    railWest.position.set(-18.0, 0.85, 0.5);
    scene.add(railWest);

    const falajWaterMat = createFalajWaterMaterial();

    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.42, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 })
    );
    trough.position.set(-11.8, 0.21, -2.5);
    trough.castShadow = true;
    scene.add(trough);
    const troughWater = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.54), falajWaterMat);
    troughWater.rotation.x = -Math.PI / 2;
    troughWater.position.set(-11.8, 0.43, -2.5);
    scene.add(troughWater);

    const hayBale = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: 0xd9a838, roughness: 0.92 })
    );
    hayBale.rotation.z = Math.PI / 2;
    hayBale.position.set(-16.2, 0.44, -2.6);
    hayBale.castShadow = true;
    scene.add(hayBale);

    // 3. Date Palms & Mango Orchard Trees + Raycast Hit Targets
    const hitMeshes: THREE.Mesh[] = [];
    const palms: THREE.Group[] = [];
    [
      { x: -12.4, z: -9.5, h: 4.5 },
      { x: -12.0, z: 8.6, h: 4.1 },
      { x: 14.8, z: -8.6, h: 4.8 },
      { x: 15.0, z: 7.2, h: 4.3 },
      { x: 4.2, z: -11.0, h: 4.6 },
      { x: -3.2, z: -11.2, h: 4.0 },
    ].forEach((p, idx) => {
      const palm = createRealisticDatePalm(p.h, 16, true);
      palm.position.set(p.x, 0, p.z);
      palm.rotation.y = idx * 1.1;
      scene.add(palm);
      palms.push(palm);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, p.h, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.set(p.x, p.h * 0.5, p.z);
      hit.layers.set(1);
      hit.userData = { featureLabel: 'نخلة التمر العُمانية الأصيلة — عذوق الفرض والخلاص 🌴', featureKind: 'tree' };
      scene.add(hit);
      hitMeshes.push(hit);
    });

    const mangoTrees: THREE.Group[] = [];
    [
      { x: 15.8, z: -4.2, s: 1.05 },
      { x: 16.5, z: 2.2, s: 0.95 },
      { x: -16.8, z: -7.8, s: 1.0 },
      { x: 10.6, z: 8.8, s: 0.9 },
    ].forEach((m, idx) => {
      const tree = createRealisticMangoTree(m.s);
      tree.position.set(m.x, 0, m.z);
      tree.rotation.y = idx * 1.4;
      scene.add(tree);
      mangoTrees.push(tree);

      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4 * m.s, 1.4 * m.s, 3.6 * m.s, 6),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.set(m.x, 1.8 * m.s, m.z);
      hit.layers.set(1);
      hit.userData = { featureLabel: 'شجرة المانجو العُمانية المثمرة 🥭', featureKind: 'tree' };
      scene.add(hit);
      hitMeshes.push(hit);
    });

    // 4. Live Grazing Cows + Barn Chickens + Butterflies
    const cows: CowRig[] = [
      createRealisticCow('black_white', -14.2, -1.2, 2.2),
      createRealisticCow('brown_white', -15.4, 2.6, 2.1),
      createRealisticCow('cream_tan', -12.6, 1.2, 2.0),
    ];
    cows.forEach((cow, i) => {
      scene.add(cow.group);
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.3, 1.8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = 0.7;
      hit.layers.set(1);
      hit.userData = {
        cowIndex: i,
        featureLabel:
          i === 0
            ? 'بقرة حلوب ترعى في حشائش المزرعة الطبيعية 🐄'
            : i === 1
              ? 'بقرة عُمانية بنية تتغذى على الأعلاف الخضراء 🐄'
              : 'بقرة أليفة في حظيرة المزرعة المفتوحة 🐄',
        featureKind: 'cow',
      };
      cow.group.add(hit);
      hitMeshes.push(hit);
    });

    const goats: GoatRig[] = [
      createOmaniGoat(-15.5, 4.0, 1.5),
      createOmaniGoat(-12.9, 3.6, 1.4),
    ];
    goats.forEach((goat, gi) => {
      scene.add(goat.group);
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 1.1),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = 0.48;
      hit.layers.set(1);
      hit.userData = {
        goatIndex: gi,
        featureLabel: 'ماعز الجبل الأخضر العُماني في المرعى 🐐',
        featureKind: 'goat',
      };
      goat.group.add(hit);
      hitMeshes.push(hit);
    });

    const chickens: ChickenRig[] = [
      createChicken(true, -5.4, 6.1),
      createChicken(false, -6.2, 6.8),
      createChicken(false, -4.8, 6.9),
      createChicken(false, -5.8, 5.5),
    ];
    chickens.forEach((ch) => {
      scene.add(ch.group);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.25;
      hit.layers.set(1);
      hit.userData = { featureLabel: 'دواجن المزرعة العُمانية البلدي 🐓', featureKind: 'chicken' };
      ch.group.add(hit);
      hitMeshes.push(hit);
    });

    const butterflies = createButterflySwarm(8);
    butterflies.forEach((b) => scene.add(b.group));

    // Phase 4 World Landmarks: Sidr Beehive Apiary + Souq Market Stall + Well Pump Rig
    const apiary = createOmaniBeehiveApiary(12.6, 5.0);
    scene.add(apiary.group);
    apiary.bees.forEach((b) => scene.add(b.group));
    const apiaryHit = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.2, 2.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    apiaryHit.position.set(12.6, 1.1, 5.0);
    apiaryHit.layers.set(1);
    apiaryHit.userData = {
      featureLabel: 'منحل عسل السدر العُماني — اجمع العسل الطازج ولقّح البستان 🍯',
      featureKind: 'bees',
    };
    scene.add(apiaryHit);
    hitMeshes.push(apiaryHit);

    const marketStall = createOmaniMarketStall();
    marketStall.position.set(1.8, 0.06, 7.2);
    marketStall.rotation.y = Math.PI;
    scene.add(marketStall);
    const marketHit = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 2.4, 2.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    marketHit.position.set(1.8, 1.2, 7.2);
    marketHit.layers.set(1);
    marketHit.userData = {
      featureLabel: 'كشك سوق المزرعة العُماني — بيع المحاصيل ومنتجات الحظيرة يومياً 🏪',
      featureKind: 'market',
    };
    scene.add(marketHit);
    hitMeshes.push(marketHit);

    // 5. Omani Barn + Red Farm Tractor + Wheelbarrow + Falaj Channel
    const barnGroup = new THREE.Group();
    barnGroup.position.set(-8.2, 0.06, 5.2);
    const barnWallMat = new THREE.MeshStandardMaterial({ color: 0xeae0cf, roughness: 0.86 });
    const barnRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.88 });
    const barnBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.6), barnWallMat);
    barnBody.position.y = 1.1;
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;
    barnGroup.add(barnBody);

    const barnParapet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 2.8), barnRoofMat);
    barnParapet.position.y = 2.3;
    barnGroup.add(barnParapet);

    const barnDoor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.45, 0.12), postMat);
    barnDoor.position.set(0, 0.72, 1.32);
    barnGroup.add(barnDoor);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.85 })
    );
    lantern.position.set(0.75, 1.65, 1.36);
    barnGroup.add(lantern);

    for (let b = -1; b <= 1; b++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), postMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, 2.1, b * 0.7);
      barnGroup.add(beam);
    }
    const jar = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 })
    );
    jar.scale.set(0.9, 1.25, 0.9);
    jar.position.set(1.1, 0.35, 1.45);
    barnGroup.add(jar);
    const barnRoofBadge = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.35 })
    );
    barnRoofBadge.position.set(0, 2.55, 1.15);
    barnRoofBadge.visible = false;
    barnGroup.add(barnRoofBadge);
    scene.add(barnGroup);

    const wbProps = createWheelbarrowAndProps();
    wbProps.position.set(-5.7, 0.06, 4.4);
    wbProps.rotation.y = 0.5;
    scene.add(wbProps);

    const tractor = createFarmTractor();
    tractor.position.set(-3.0, 0.06, 6.4);
    tractor.rotation.y = Math.PI * 0.72;
    scene.add(tractor);
    const tractorHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.1, 2.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    tractorHit.position.set(-3.0, 1.05, 6.4);
    tractorHit.layers.set(1);
    tractorHit.userData = { featureLabel: 'جرار الحراثة الزراعي جاهز للعمل 🚜', featureKind: 'tractor' };
    scene.add(tractorHit);
    hitMeshes.push(tractorHit);

    // 6. Flowing Falaj Channel & Water Tank
    const falajGroup = new THREE.Group();
    falajGroup.position.set(-8.2, 0.06, -5.4);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const tankBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 2.4), stoneMat);
    tankBase.position.y = 0.3;
    tankBase.castShadow = true;
    falajGroup.add(tankBase);

    const cisternBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.15, 1.7, 16),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.65, metalness: 0.1 })
    );
    cisternBody.position.y = 1.45;
    cisternBody.castShadow = true;
    falajGroup.add(cisternBody);

    const cisternCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.18, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4, metalness: 0.4 })
    );
    cisternCap.position.y = 2.35;
    falajGroup.add(cisternCap);

    const waterLevelMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.15 })
    );
    waterLevelMesh.position.set(0, 1.45, 1.12);
    falajGroup.add(waterLevelMesh);

    const falajStoneChannel = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 0.84), stoneMat);
    falajStoneChannel.position.set(5.4, 0.11, 0);
    falajGroup.add(falajStoneChannel);

    const falajWaterStream = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 0.54, 24, 1), falajWaterMat);
    falajWaterStream.rotation.x = -Math.PI / 2;
    falajWaterStream.position.set(5.4, 0.23, 0);
    falajGroup.add(falajWaterStream);
    scene.add(falajGroup);

    const wellPumpGroup = createWellPumpRig();
    wellPumpGroup.position.set(-10.4, 0.06, -5.4);
    scene.add(wellPumpGroup);
    const wellHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.9, 1.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    wellHit.position.set(-10.4, 0.95, -5.4);
    wellHit.layers.set(1);
    wellHit.userData = {
      featureLabel: 'بئر ومضخة الفلج — طوّرها لزيادة سعة الخزان وإمداد المياه 💧',
      featureKind: 'well',
    };
    scene.add(wellHit);
    hitMeshes.push(wellHit);

    // 7. Upgradable Omani Greenhouse
    const ghGroup = new THREE.Group();
    ghGroup.position.set(7.2, 0.06, -0.6);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const leftCurb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 9.2), curbMat);
    leftCurb.position.set(-2.2, 0.17, 0);
    ghGroup.add(leftCurb);
    const rightCurb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 9.2), curbMat);
    rightCurb.position.set(2.2, 0.17, 0);
    ghGroup.add(rightCurb);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.78, roughness: 0.28 });
    for (let a = -4; a <= 4; a += 2) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 8, 20, Math.PI), steelMat);
      arch.position.set(0, 0.35, a);
      ghGroup.add(arch);
    }

    const ghFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.04, 9.0),
      new THREE.MeshStandardMaterial({ color: 0xbcb3a2, roughness: 0.85 })
    );
    ghFloor.position.y = 0.02;
    ghGroup.add(ghFloor);

    const fanFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.15), steelMat);
    fanFrame.position.set(0, 1.5, -4.5);
    ghGroup.add(fanFrame);
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 1.5, -4.58);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.3 });
    for (let bl = 0; bl < 4; bl++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.03), bladeMat);
      blade.rotation.z = (bl * Math.PI) / 4;
      fanGroup.add(blade);
    }
    ghGroup.add(fanGroup);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.24,
      roughness: 0.15,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ghShell = new THREE.Mesh(new THREE.CylinderGeometry(2.22, 2.22, 9.0, 20, 1, true, 0, Math.PI), glassMat);
    ghShell.rotation.z = Math.PI / 2;
    ghShell.rotation.y = Math.PI / 2;
    ghShell.position.y = 0.35;
    ghShell.renderOrder = 2;
    ghGroup.add(ghShell);

    const shadeNetMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      transparent: true,
      opacity: 0.45,
      roughness: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shadeNetMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.29, 2.29, 8.8, 16, 1, true, 0.35, Math.PI - 0.7), shadeNetMat);
    shadeNetMesh.rotation.z = Math.PI / 2;
    shadeNetMesh.rotation.y = Math.PI / 2;
    shadeNetMesh.position.y = 0.35;
    shadeNetMesh.renderOrder = 3;
    ghGroup.add(shadeNetMesh);

    const ghExpandGroup = new THREE.Group();
    const solarPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.2 })
    );
    solarPanel.position.set(2.4, 1.4, -3.5);
    solarPanel.rotation.z = -0.35;
    ghExpandGroup.add(solarPanel);
    ghGroup.add(ghExpandGroup);
    scene.add(ghGroup);

    // 8. 9 Interactive Land Plots + Floating Active Beacon
    const plotHandles = new Map<
      string,
      {
        soilMesh: THREE.Mesh;
        ringMesh: THREE.Mesh;
        cropHolder: THREE.Group;
        weedHolder: THREE.Group;
        pestHolder: THREE.Group;
        lockMesh: THREE.Mesh;
        lastSig: string;
        coordX: number;
        coordZ: number;
      }
    >();
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x855e3c, roughness: 0.88 });

    PLOT_COORDS.forEach((coord, idx) => {
      const plotId = `plot-${idx}`;
      const plotGroup = new THREE.Group();
      plotGroup.position.set(coord.x, 0.06, coord.z);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 2.3), borderMat);
      frame.position.y = 0.08;
      frame.castShadow = true;
      frame.receiveShadow = true;
      plotGroup.add(frame);

      const soilMat = new THREE.MeshStandardMaterial({ map: soilTexRaw, roughness: 0.92 });
      const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 2.05), soilMat);
      soilMesh.position.y = 0.17;
      soilMesh.receiveShadow = true;
      plotGroup.add(soilMesh);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.62, 4), ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.rotation.z = Math.PI / 4;
      ringMesh.position.y = 0.23;
      ringMesh.visible = false;
      plotGroup.add(ringMesh);

      const lockMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.55, roughness: 0.3 })
      );
      lockMesh.position.y = 0.56;
      lockMesh.visible = false;
      plotGroup.add(lockMesh);

      const cropHolder = new THREE.Group();
      cropHolder.position.y = 0.21;
      plotGroup.add(cropHolder);

      const weedHolder = new THREE.Group();
      weedHolder.position.y = 0.21;
      plotGroup.add(weedHolder);

      const pestHolder = new THREE.Group();
      pestHolder.position.y = 0.65;
      plotGroup.add(pestHolder);

      const hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 1.4, 2.4),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.y = 0.65;
      hitMesh.layers.set(1);
      hitMesh.userData = { plotId };
      plotGroup.add(hitMesh);
      hitMeshes.push(hitMesh);

      scene.add(plotGroup);
      plotHandles.set(plotId, {
        soilMesh,
        ringMesh,
        cropHolder,
        weedHolder,
        pestHolder,
        lockMesh,
        lastSig: '',
        coordX: coord.x,
        coordZ: coord.z,
      });
    });

    // Floating Golden Beacon Diamond above currently selected plot
    const beaconMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 0.55,
        metalness: 0.2,
        roughness: 0.25,
      })
    );
    beaconMesh.position.set(PLOT_COORDS[0].x, 2.25, PLOT_COORDS[0].z);
    scene.add(beaconMesh);

    // 9. Omani Farmer + 3D Particle/Floating FX Engine
    const farmerRig = createOmaniFarmer();
    farmerRig.group.position.set(1.0, 0.09, 4.8);
    scene.add(farmerRig.group);

    const effects = new GameEffects3D();
    effects.attach(scene);

    sceneRefs.current = {
      scene,
      camera,
      controls,
      farmerRig,
      cows,
      goats,
      chickens,
      bees: apiary.bees,
      butterflies,
      birds,
      clouds,
      palms,
      mangoTrees,
      falajWaterMat,
      beaconMesh,
      effects,
      autoWalkTask: null,
      plotHandles,
      waterLevelMesh,
      fanGroup,
      shadeNetMesh,
      ghExpandGroup,
      extraHiveGroup: apiary.extraHiveGroup,
      wellPumpGroup,
      barnRoofBadge,
      soilTexRaw,
      soilTexPlowed,
      soilTexLeveled,
      soilTexWet,
      soilTexLocked,
      isTransitioning: false,
      activePreset: 'overview',
      lastNearbyKey: '',
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };

    const handlePointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (dist > 8) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const hitData = hitObj.userData;
        if (hitData?.plotId) {
          onSelectPlotRef.current(hitData.plotId);
          const hp = plotHandles.get(hitData.plotId);
          if (hp) effects.spawnBurst(hp.coordX, 0.35, hp.coordZ, 0x34d399, 8, 1.8);
        } else if (hitData?.featureLabel) {
          const wp = new THREE.Vector3();
          hitObj.getWorldPosition(wp);
          if (typeof hitData.cowIndex === 'number' && cows[hitData.cowIndex]) {
            cows[hitData.cowIndex].happyHopTimer = 0.72;
            effects.spawnBurst(wp.x, 1.25, wp.z, 0xfbbf24, 12, 2.5);
            effects.spawnFloatingLabel(wp.x, 1.9, wp.z, '💛 بقرة سعيدة!', '#92400e');
          } else if (typeof hitData.goatIndex === 'number' && goats[hitData.goatIndex]) {
            goats[hitData.goatIndex].happyHopTimer = 0.72;
            effects.spawnBurst(wp.x, 0.95, wp.z, 0xa3e635, 10, 2.3);
            effects.spawnFloatingLabel(wp.x, 1.55, wp.z, '🐐 ماعز الجبل!', '#3f6212');
          } else {
            effects.spawnBurst(wp.x, Math.max(0.8, wp.y), wp.z, 0xfef08a, 10, 2.2);
          }
          onInspectFeatureRef.current?.(hitData.featureLabel, hitData.featureKind);
        }
      }
    };

    const cancelTransitionOnInteract = () => {
      if (sceneRefs.current) sceneRefs.current.isTransitioning = false;
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    controls.addEventListener('start', cancelTransitionOnInteract);

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 10 || rect.height < 10) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(0.1, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const refs = sceneRefs.current;

      if (refs) {
        refs.falajWaterMat.uniforms.uTime.value = elapsed;

        // Cloud drift
        refs.clouds.forEach((c, idx) => {
          c.position.x += dt * (0.28 + idx * 0.05);
          if (c.position.x > 46) c.position.x = -46;
        });

        // Farmer Movement: Manual input (Joystick / WASD) takes immediate priority over Auto-Walk
        let inX = moveInputRef?.current?.x || 0;
        let inY = moveInputRef?.current?.y || 0;
        if (keys['KeyW'] || keys['ArrowUp']) inY += 1;
        if (keys['KeyS'] || keys['ArrowDown']) inY -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inX += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inX -= 1;

        const mag = Math.hypot(inX, inY);
        let movingNorm = 0;

        if (mag > 0.08) {
          refs.autoWalkTask = null;
          clearFarmerTools(refs.farmerRig);
          movingNorm = Math.min(1, mag);

          camera.getWorldDirection(_camForward);
          _camForward.y = 0;
          if (_camForward.lengthSq() < 0.001) _camForward.set(0, 0, -1);
          _camForward.normalize();
          _camRight.crossVectors(_camForward, camera.up).normalize();

          _moveDir
            .set(0, 0, 0)
            .addScaledVector(_camRight, inX / mag)
            .addScaledVector(_camForward, inY / mag)
            .normalize();

          _prevFarmerPos.copy(refs.farmerRig.group.position);
          const walkSpeed = 4.5 * movingNorm;
          let nextX = THREE.MathUtils.clamp(_prevFarmerPos.x + _moveDir.x * walkSpeed * dt, -15.5, 16.5);
          let nextZ = THREE.MathUtils.clamp(_prevFarmerPos.z + _moveDir.z * walkSpeed * dt, -9.5, 11.5);

          if (Math.hypot(nextX + 8.2, nextZ - 5.2) < 2.15 || Math.hypot(nextX + 8.2, nextZ + 5.4) < 1.85) {
            nextX = _prevFarmerPos.x;
            nextZ = _prevFarmerPos.z;
          }

          refs.farmerRig.group.position.set(nextX, 0.09, nextZ);

          const desiredYaw = Math.atan2(_moveDir.x, _moveDir.z);
          let angleDelta = desiredYaw - refs.farmerRig.group.rotation.y;
          while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
          while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
          refs.farmerRig.group.rotation.y += angleDelta * Math.min(1, dt * 11);

          if (refs.activePreset === 'farmer' && !refs.isTransitioning) {
            const dx = nextX - _prevFarmerPos.x;
            const dz = nextZ - _prevFarmerPos.z;
            camera.position.x += dx;
            camera.position.z += dz;
            controls.target.x += dx;
            controls.target.z += dz;
          }
        } else if (refs.autoWalkTask) {
          const task = refs.autoWalkTask;
          const fx = refs.farmerRig.group.position.x;
          const fz = refs.farmerRig.group.position.z;
          const dx = task.targetX - fx;
          const dz = task.targetZ - fz;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.28) {
            movingNorm = 0.95;
            const step = Math.min(dist, 5.4 * dt);
            const nextX = fx + (dx / dist) * step;
            const nextZ = fz + (dz / dist) * step;
            refs.farmerRig.group.position.set(nextX, 0.09, nextZ);

            const yaw = Math.atan2(dx, dz);
            let ad = yaw - refs.farmerRig.group.rotation.y;
            while (ad > Math.PI) ad -= Math.PI * 2;
            while (ad < -Math.PI) ad += Math.PI * 2;
            refs.farmerRig.group.rotation.y += ad * Math.min(1, dt * 12);

            if (refs.activePreset === 'farmer' && !refs.isTransitioning) {
              camera.position.x += nextX - fx;
              camera.position.z += nextZ - fz;
              controls.target.x += nextX - fx;
              controls.target.z += nextZ - fz;
            }
          } else {
            // Arrived at target plot: face plot & execute 3D Tool + Particles + Floating Label!
            refs.farmerRig.group.rotation.y = Math.atan2(task.lookX - fx, task.lookZ - fz);
            triggerFarmerAction(refs.farmerRig, task.action, 1.35);
            const burstCfg = ACTION_BURST_CFG[task.action] || ACTION_BURST_CFG.plant;
            refs.effects.spawnBurst(task.lookX, 0.45, task.lookZ, burstCfg.color, task.action === 'harvest' ? 24 : 16, 3.4);
            refs.effects.spawnFloatingLabel(
              task.lookX,
              2.25,
              task.lookZ,
              task.bannerText || burstCfg.defaultLabel,
              burstCfg.bannerBg
            );
            refs.autoWalkTask = null;
          }
        }

        animateOmaniFarmer(refs.farmerRig, movingNorm, dt, elapsed);

        // Proximity detection around plots & landmarks (fires callback ONLY when target changes)
        if (onNearbyChangeRef.current) {
          const fx = refs.farmerRig.group.position.x;
          const fz = refs.farmerRig.group.position.z;
          let bestKey = '';
          let bestTarget: NearbyFarmTarget | null = null;
          let bestDist = 2.65;

          refs.plotHandles.forEach((h, pId) => {
            const d = Math.hypot(fx - h.coordX, fz - h.coordZ);
            if (d < bestDist) {
              bestDist = d;
              bestKey = pId;
              bestTarget = {
                type: 'plot',
                plotId: pId,
                label: `القطعة #${Number(pId.split('-')[1]) + 1}`,
              };
            }
          });

          if (!bestTarget) {
            if (Math.hypot(fx - 1.8, fz - 7.2) < 2.8) {
              bestKey = 'market';
              bestTarget = { type: 'market', label: 'كشك سوق المزرعة 🏪' };
            } else if (Math.hypot(fx - 12.6, fz - 5.0) < 2.9) {
              bestKey = 'apiary';
              bestTarget = { type: 'apiary', label: 'منحل العسل العُماني 🍯' };
            } else if (Math.hypot(fx + 8.2, fz - 5.2) < 2.8) {
              bestKey = 'barn';
              bestTarget = { type: 'barn', label: 'المخزن والحظيرة 🐄' };
            } else if (Math.hypot(fx + 11.2, fz - 0.5) < 3.4) {
              bestKey = 'cows';
              bestTarget = { type: 'cows', label: 'حظيرة الأبقار والماعز 🐄' };
            } else if (Math.hypot(fx + 7.5, fz + 4.5) < 2.8) {
              bestKey = 'falaj';
              bestTarget = { type: 'falaj', label: 'الفلج والخزان 💧' };
            } else if (Math.hypot(fx - 4.6, fz + 0.5) < 2.6) {
              bestKey = 'greenhouse';
              bestTarget = { type: 'greenhouse', label: 'البيت المحمي 🏡' };
            } else if (Math.hypot(fx + 3.0, fz - 6.4) < 2.4) {
              bestKey = 'tractor';
              bestTarget = { type: 'tractor', label: 'الجرار الزراعي 🚜' };
            }
          }

          if (bestKey !== refs.lastNearbyKey) {
            refs.lastNearbyKey = bestKey;
            onNearbyChangeRef.current(bestTarget);
          }
        }

        // Living Wildlife & Fauna Animations
        refs.cows.forEach((cow) => animateCow(cow, dt, elapsed));
        refs.goats.forEach((goat) => animateGoat(goat, dt, elapsed));
        refs.chickens.forEach((ch) => animateChicken(ch, dt, elapsed));
        animateBees(refs.bees, elapsed);
        animateButterflies(refs.butterflies, elapsed);
        animateSkyBirds(refs.birds, dt, elapsed);

        refs.palms.forEach((palm, idx) => {
          palm.rotation.z = Math.sin(elapsed * 0.9 + idx) * 0.014;
        });
        refs.mangoTrees.forEach((tree, idx) => {
          tree.rotation.z = Math.sin(elapsed * 0.75 + idx * 1.3) * 0.009;
        });

        if (refs.fanGroup && refs.fanGroup.userData.active) {
          refs.fanGroup.rotation.z += dt * 8.0;
        }

        // Animate selection beacon & plot markers
        refs.beaconMesh.rotation.y += dt * 2.1;
        refs.beaconMesh.position.y = 2.15 + Math.sin(elapsed * 3.1) * 0.16;

        refs.plotHandles.forEach((h) => {
          if (h.ringMesh.visible) {
            const pulse = 1 + Math.sin(elapsed * 3.8) * 0.035;
            h.ringMesh.scale.set(pulse, pulse, 1);
          }
          if (h.lockMesh.visible) h.lockMesh.rotation.y += dt * 1.1;
          if (h.pestHolder.visible && h.pestHolder.children.length > 0) {
            h.pestHolder.position.y = 0.65 + Math.sin(elapsed * 3.2) * 0.06;
          }
        });

        refs.effects.update(dt);

        // Camera Presets Transition
        if (refs.isTransitioning) {
          if (refs.activePreset === 'farmer') {
            const fx = refs.farmerRig.group.position.x;
            const fz = refs.farmerRig.group.position.z;
            _targetCamPos.set(fx, 4.7, fz + 6.3);
            _targetCtrlPos.set(fx, 1.25, fz);
          } else {
            const preset = CAMERA_PRESETS[refs.activePreset];
            _targetCamPos.set(...preset.pos);
            _targetCtrlPos.set(...preset.target);
          }
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.5, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetCtrlPos.x, 5.5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetCtrlPos.y, 5.5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetCtrlPos.z, 5.5, dt);

          _tmpVec.copy(camera.position).sub(_targetCamPos);
          if (_tmpVec.lengthSq() < 0.02) {
            refs.isTransitioning = false;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.removeEventListener('start', cancelTransitionOnInteract);
      controls.dispose();
      effects.dispose();

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
      disposableTextures.forEach((t) => t.dispose());
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Trigger camera transitions cleanly
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.activePreset = cameraPreset;
    refs.isTransitioning = true;
  }, [cameraPreset, presetTrigger]);

  // Execute live 3D Farmer Auto-Walk + Tool Action + Burst FX when a player performs a farm operation!
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs || !visualCommand) return;
    const handle = visualCommand.plotId ? refs.plotHandles.get(visualCommand.plotId) : null;
    if (!handle) {
      const fx = refs.farmerRig.group.position.x;
      const fz = refs.farmerRig.group.position.z;
      const cfg = ACTION_BURST_CFG[visualCommand.action] || ACTION_BURST_CFG.plant;
      refs.effects.spawnBurst(fx, 1.0, fz, cfg.color, 14, 2.8);
      if (visualCommand.bannerText) {
        refs.effects.spawnFloatingLabel(fx, 2.3, fz, visualCommand.bannerText, cfg.bannerBg);
      }
      return;
    }

    // Walk cleanly to edge of plot and run action choreography
    const standZ = handle.coordZ + 1.38;
    const standX = handle.coordX;
    refs.autoWalkTask = {
      targetX: standX,
      targetZ: standZ,
      lookX: handle.coordX,
      lookZ: handle.coordZ,
      action: visualCommand.action,
      bannerText: visualCommand.bannerText,
    };
  }, [visualCommand]);

  // Sync farm plots, greenhouse, cistern & beacon with live backend state
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs || !farm) return;

    if (refs.waterLevelMesh) {
      const ratio = Math.max(0.08, Math.min(1, farm.waterLiters / (farm.maxWaterLiters || 300)));
      refs.waterLevelMesh.scale.y = ratio;
      refs.waterLevelMesh.position.y = 0.85 + ratio * 0.6;
    }

    if (refs.fanGroup) {
      refs.fanGroup.userData.active = !!farm.greenhouseVentilation;
    }
    if (refs.shadeNetMesh) {
      const mat = refs.shadeNetMesh.material as THREE.MeshStandardMaterial;
      const shadePct = farm.greenhouseShading || 0;
      refs.shadeNetMesh.visible = shadePct > 0;
      mat.opacity = Math.min(0.75, 0.12 + (shadePct / 80) * 0.55);
    }
    if (refs.ghExpandGroup) {
      refs.ghExpandGroup.visible = (farm.greenhouseLevel || 1) >= 2;
    }
    if (refs.extraHiveGroup) {
      refs.extraHiveGroup.visible = (farm.buildings?.beehiveApiary || 1) >= 2;
    }
    if (refs.wellPumpGroup) {
      const wellLv = farm.buildings?.wellPump || 1;
      const sc = 1 + (wellLv - 1) * 0.08;
      refs.wellPumpGroup.scale.setScalar(sc);
    }
    if (refs.barnRoofBadge) {
      refs.barnRoofBadge.visible = (farm.buildings?.barnStorage || 1) >= 2;
    }

    const activeHandle = selectedPlotId ? refs.plotHandles.get(selectedPlotId) : null;
    if (activeHandle) {
      refs.beaconMesh.visible = true;
      refs.beaconMesh.position.x = activeHandle.coordX;
      refs.beaconMesh.position.z = activeHandle.coordZ;
    } else {
      refs.beaconMesh.visible = false;
    }

    farm.plots.forEach((plot) => {
      const handle = refs.plotHandles.get(plot.id);
      if (!handle) return;

      handle.ringMesh.visible = plot.id === selectedPlotId;
      handle.lockMesh.visible = !plot.isUnlocked;

      const mat = handle.soilMesh.material as THREE.MeshStandardMaterial;
      const nextTex = !plot.isUnlocked
        ? refs.soilTexLocked
        : plot.moisture >= 65
          ? refs.soilTexWet
          : plot.soilLeveled
            ? refs.soilTexLeveled
            : plot.soilPrepared
              ? refs.soilTexPlowed
              : refs.soilTexRaw;
      if (mat.map !== nextTex) {
        mat.map = nextTex;
        mat.needsUpdate = true;
      }

      const sig = `${plot.cropId || 'empty'}|${plot.stageIndex}|${Math.round(plot.health / 20)}|${Math.round(plot.weedsLevel / 20)}|${plot.pestType || ''}|${plot.isUnlocked}`;
      if (handle.lastSig !== sig) {
        handle.lastSig = sig;

        while (handle.cropHolder.children.length > 0) {
          const ch = handle.cropHolder.children.pop()!;
          ch.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material && !Array.isArray(m.material)) m.material.dispose();
          });
        }

        if (plot.isUnlocked && plot.cropId) {
          const cropDef = crops.find((c) => c.id === plot.cropId);
          const stage = cropDef?.stages[plot.stageIndex];
          const visScale = stage?.visualScale ?? 0.5;
          const cropGroup = buildCropVisualGroup(plot.cropId, cropDef, plot.stageIndex, visScale, plot.health);
          handle.cropHolder.add(cropGroup);
        }

        while (handle.weedHolder.children.length > 0) {
          const wh = handle.weedHolder.children.pop()!;
          wh.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material && !Array.isArray(m.material)) m.material.dispose();
          });
        }
        if (plot.isUnlocked && plot.weedsLevel >= 15) {
          const weedCount = Math.min(8, Math.ceil(plot.weedsLevel / 12));
          const weedMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.85 });
          for (let w = 0; w < weedCount; w++) {
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), weedMat);
            const ang = (w / weedCount) * Math.PI * 2;
            tuft.position.set(Math.cos(ang) * 0.85, 0.11, Math.sin(ang) * 0.72);
            handle.weedHolder.add(tuft);
          }
        }

        while (handle.pestHolder.children.length > 0) {
          const ph = handle.pestHolder.children.pop()!;
          ph.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material && !Array.isArray(m.material)) m.material.dispose();
          });
        }
        handle.pestHolder.visible = !!plot.pestType;
        if (plot.pestType) {
          const bugMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, roughness: 0.4 });
          for (let p = 0; p < 3; p++) {
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), bugMat);
            orb.position.set((p - 1) * 0.28, (p % 2) * 0.14, 0.2);
            handle.pestHolder.add(orb);
          }
        }
      }
    });
  }, [farm, crops, selectedPlotId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] cursor-grab active:cursor-grabbing select-none touch-none"
      aria-label="لعبة المزرعة العُمانية الحية ثلاثية الأبعاد"
    />
  );
};
