import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VirtualCropDef } from '../../data/virtualFarmData.ts';

export type FarmCameraPreset = 'overview' | 'field' | 'greenhouse' | 'falaj';

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
}

interface FarmScene3DProps {
  farm: FarmState3D;
  crops: VirtualCropDef[];
  selectedPlotId: string | null;
  onSelectPlot: (plotId: string) => void;
  cameraPreset: FarmCameraPreset;
  presetTrigger: number;
}

// Pre-allocated scratch helpers for zero-GC inside animation loop
const _tmpVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetCtrlPos = new THREE.Vector3();

const CAMERA_PRESETS: Record<FarmCameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [14.5, 12.5, 16.5], target: [0, 0.5, 0] },
  field: { pos: [-2.5, 8.8, 11.5], target: [-3.2, 0.3, 1.5] },
  greenhouse: { pos: [9.5, 6.2, 8.5], target: [7.2, 1.1, -1.2] },
  falaj: { pos: [-11.5, 6.8, -6.5], target: [-8.2, 1.2, -5.2] },
};

const PLOT_COORDS: Array<{ x: number; z: number }> = [
  // Open field 2x3 grid (Plots 0..5)
  { x: -6.2, z: -1.6 },
  { x: -2.8, z: -1.6 },
  { x: 0.6, z: -1.6 },
  { x: -6.2, z: 2.6 },
  { x: -2.8, z: 2.6 },
  { x: 0.6, z: 2.6 },
  // Greenhouse beds (Plots 6..8)
  { x: 7.2, z: -3.4 },
  { x: 7.2, z: -0.6 },
  { x: 7.2, z: 2.2 },
];

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

function buildCropVisualGroup(cropId: string, crop: VirtualCropDef | undefined, stageIndex: number, scaleFactor: number, health: number): THREE.Group {
  const group = new THREE.Group();
  const isUnhealthy = health < 55;
  const leafColor = isUnhealthy ? 0x9ca341 : 0x2e8b3c;
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.72, metalness: 0.02 });

  if (cropId === 'faradh_palm') {
    // Authentic Omani Date Palm (trunk segments + radial curved fronds + date clusters)
    const trunkHeight = 0.75 + stageIndex * 0.42;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5436, roughness: 0.92, metalness: 0.02 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.23, trunkHeight, 8), trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const frondCount = 6 + stageIndex;
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2;
      const frondGroup = new THREE.Group();
      frondGroup.position.set(0, trunkHeight - 0.05, 0);
      frondGroup.rotation.y = angle;
      const frondLen = 0.7 + stageIndex * 0.16;
      const frondGeo = new THREE.BoxGeometry(0.14, 0.04, frondLen);
      const frond = new THREE.Mesh(frondGeo, leafMat);
      frond.position.set(0, 0.08, frondLen * 0.45);
      frond.rotation.x = 0.25 + (i % 2) * 0.16;
      frond.castShadow = true;
      frondGroup.add(frond);
      group.add(frondGroup);
    }

    // Date bunches (بسر / رطب الفرض) in stages >= 3
    if (stageIndex >= 3) {
      const dateColor = stageIndex >= 4 ? 0x6b2d12 : 0xd97706;
      const dateMat = new THREE.MeshStandardMaterial({ color: dateColor, roughness: 0.55 });
      for (let b = 0; b < 3; b++) {
        const a = (b / 3) * Math.PI * 2 + 0.4;
        const bunch = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), dateMat);
        bunch.scale.set(0.85, 1.35, 0.85);
        bunch.position.set(Math.cos(a) * 0.26, trunkHeight - 0.2, Math.sin(a) * 0.26);
        group.add(bunch);
      }
    }
  } else if (cropId === 'omani_wheat' || cropId === 'sesame') {
    // Field crops: rows of stalks + golden grain ears or white sesame pods
    const rows = 3;
    const cols = 4;
    const stalkH = 0.28 + scaleFactor * 0.65;
    const earColor = cropId === 'omani_wheat'
      ? (stageIndex >= 4 ? 0xeab308 : 0x84cc16)
      : (stageIndex >= 2 && stageIndex <= 3 ? 0xf8fafc : 0xd97706);
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
    // Bulb/Tuber crops: leaf clusters + protruding bulbs at late stage
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
    // Omani Lemon / Citrus Tree: woody trunk + lush rounded canopy + white blossoms + lime/lemon fruits
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
    // Tomato, Cucumber, Pepper, or custom fruiting vegetable rows with trellis stakes
    const fruitHex = crop?.colorHex ? parseInt(crop.colorHex.replace('#', ''), 16) : 0xef4444;
    const fruitColor = stageIndex >= 4 ? fruitHex : 0x4ade80;
    const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColor, roughness: 0.45 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });

    for (let i = -1; i <= 1; i += 2) {
      const px = i * 0.45;
      // Trellis bamboo/wood stake
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
  cameraPreset,
  presetTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectPlotRef = useRef(onSelectPlot);
  onSelectPlotRef.current = onSelectPlot;

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
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
      }
    >;
    waterLevelMesh: THREE.Mesh | null;
    fanGroup: THREE.Group | null;
    shadeNetMesh: THREE.Mesh | null;
    ghExpandGroup: THREE.Group | null;
    soilTexRaw: THREE.CanvasTexture;
    soilTexPlowed: THREE.CanvasTexture;
    soilTexLeveled: THREE.CanvasTexture;
    soilTexWet: THREE.CanvasTexture;
    soilTexLocked: THREE.CanvasTexture;
    isTransitioning: boolean;
    activePreset: FarmCameraPreset;
  } | null>(null);

  // Initialize Three.js WebGL scene once
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
    const height = Math.max(280, container.clientHeight);

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
    scene.background = new THREE.Color(0xdce8f2);
    scene.fog = new THREE.Fog(0xe4dcc8, 36, 98);

    // Mandatory studio environment map via PMREM + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 160);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 7;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI / 2.12;
    controls.minPolarAngle = 0.22;
    controls.update();

    // Warm sun + cool sky/ground HemisphereLight + subtle fill
    const hemiLight = new THREE.HemisphereLight(0xcbe5ff, 0x9c7b4f, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    sunLight.position.set(16, 22, 12);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -18;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xbbe0ff, 0.55);
    rimLight.position.set(-14, 9, -14);
    scene.add(rimLight);

    // Procedural Textures
    const disposableTextures: THREE.Texture[] = [];
    const groundTex = createCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#d4b483';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(180,140,85,0.18)' : 'rgba(235,212,170,0.22)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
        }
      },
      256,
      256,
      14,
      14,
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
    disposableTextures.push(groundTex, soilTexRaw, soilTexPlowed, soilTexLeveled, soilTexWet, soilTexLocked);

    // 1. Extended Desert/Oasis Ground (zero floating island)
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.94, metalness: 0.0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Cultivated Farm Compound Yard
    const yardMat = new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 0.9 });
    const yard = new THREE.Mesh(new THREE.BoxGeometry(23, 0.08, 16), yardMat);
    yard.position.set(1.5, 0.02, -0.5);
    yard.receiveShadow = true;
    scene.add(yard);

    // Stone Walkways (الممرات)
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
    const mainWalk = new THREE.Mesh(new THREE.BoxGeometry(19, 0.06, 1.3), walkMat);
    mainWalk.position.set(1, 0.06, 0.5);
    mainWalk.receiveShadow = true;
    scene.add(mainWalk);

    const crossWalk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 12.5), walkMat);
    crossWalk.position.set(3.4, 0.06, -0.8);
    crossWalk.receiveShadow = true;
    scene.add(crossWalk);

    // 2. Omani Heritage Perimeter Wall & Hajar Mountain Silhouette
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd6c3a5, roughness: 0.88 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x855836, roughness: 0.9 });
    const fencePositions: Array<[number, number, number, number]> = [
      [-10.2, 0.5, -0.5, 0.35],
      [13.2, 0.5, -0.5, 0.35],
    ];
    fencePositions.forEach(([fx, fy, fz]) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 16.5), wallMat);
      sideWall.position.set(fx, fy, fz);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      scene.add(sideWall);
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(23.8, 1.1, 0.4), wallMat);
    backWall.position.set(1.5, 0.55, -8.7);
    backWall.castShadow = true;
    scene.add(backWall);

    // Distant Hajar Mountains + Desert Palm Perimeter
    const mtnMat = new THREE.MeshStandardMaterial({ color: 0x8d7258, roughness: 0.95 });
    for (let i = 0; i < 9; i++) {
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 3) * 2.5, 6 + (i % 4) * 2, 6), mtnMat);
      mtn.position.set(-28 + i * 7.5, 2.5, -26 - (i % 2) * 4);
      scene.add(mtn);
    }

    // Perimeter Oasis Palms (5-part composite each)
    const palmPositions: Array<[number, number]> = [
      [-12.5, -9],
      [-13.5, 2],
      [-11.8, 7.5],
      [14.8, -8],
      [15.2, 4.5],
      [4.5, -10.5],
      [-2.5, -10.8],
    ];
    const oasisTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.92 });
    const oasisFrondMat = new THREE.MeshStandardMaterial({ color: 0x2d6a36, roughness: 0.75 });
    palmPositions.forEach(([px, pz], idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(px, 0, pz);
      const h = 3.6 + (idx % 3) * 0.6;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h, 7), oasisTrunkMat);
      tr.position.y = h / 2;
      tr.castShadow = true;
      pGroup.add(tr);
      for (let f = 0; f < 6; f++) {
        const ang = (f / 6) * Math.PI * 2;
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 1.8), oasisFrondMat);
        fr.position.set(Math.sin(ang) * 0.8, h, Math.cos(ang) * 0.8);
        fr.rotation.y = ang;
        fr.rotation.x = 0.35;
        pGroup.add(fr);
      }
      scene.add(pGroup);
    });

    // 3. Traditional Omani Storage Barn (المخزن الزراعي العُماني - 7-part Group)
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

    // Timber beams protruding from Omani roof (الدعن والجندل)
    for (let b = -1; b <= 1; b++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), postMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, 2.1, b * 0.7);
      barnGroup.add(beam);
    }
    // Clay water/seed jar (الخرس) beside door
    const jar = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 })
    );
    jar.scale.set(0.9, 1.25, 0.9);
    jar.position.set(1.1, 0.35, 1.45);
    barnGroup.add(jar);
    scene.add(barnGroup);

    // 4. Omani Falaj Water Channel & Cistern Tank (خزان المياه والفلج)
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

    // Water Level Bar inside glass sight gauge on front of tank
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.15 });
    const waterLevelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.2, 0.12), waterMat);
    waterLevelMesh.position.set(0, 1.45, 1.12);
    falajGroup.add(waterLevelMesh);

    // Flowing Falaj water channel running along back of field
    const falajStoneChannel = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 0.8), stoneMat);
    falajStoneChannel.position.set(5.4, 0.11, 0);
    falajGroup.add(falajStoneChannel);

    const falajWaterStream = new THREE.Mesh(
      new THREE.BoxGeometry(11.2, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.18, metalness: 0.25 })
    );
    falajWaterStream.position.set(5.4, 0.22, 0);
    falajGroup.add(falajWaterStream);
    scene.add(falajGroup);

    // 5. Upgradable Omani Greenhouse (البيت المحمي) around plots 6, 7, 8 (x=7.2, z=-3.4..2.2)
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

    // Greenhouse floor pad
    const ghFloor = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.04, 9.0),
      new THREE.MeshStandardMaterial({ color: 0xbcb3a2, roughness: 0.85 })
    );
    ghFloor.position.y = 0.02;
    ghGroup.add(ghFloor);

    // Rotating Exhaust Ventilation Fan on back gable
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

    // Translucent Polycarbonate Shell (depthWrite: false + renderOrder = 2 so interior plants stay sharp)
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

    // Adjustable Shade Net (تظليل البيت المحمي)
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

    // Upgrade Solar & Mist Cooling Module (appears at greenhouseLevel >= 2)
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

    // 6. Create 9 Interactive Land Plots + Layer 1 Hitboxes
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
      }
    >();
    const hitMeshes: THREE.Mesh[] = [];
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x855e3c, roughness: 0.88 });

    PLOT_COORDS.forEach((coord, idx) => {
      const plotId = `plot-${idx}`;
      const plotGroup = new THREE.Group();
      plotGroup.position.set(coord.x, 0.06, coord.z);

      // Raised bed wood/stone frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 2.3), borderMat);
      frame.position.y = 0.08;
      frame.castShadow = true;
      frame.receiveShadow = true;
      plotGroup.add(frame);

      // Soil surface (offset on Y to avoid coplanar Z-fighting)
      const soilMat = new THREE.MeshStandardMaterial({ map: soilTexRaw, roughness: 0.92 });
      const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 2.05), soilMat);
      soilMesh.position.y = 0.17;
      soilMesh.receiveShadow = true;
      plotGroup.add(soilMesh);

      // Selection Highlight Ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(1.38, 1.55, 4), ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.rotation.z = Math.PI / 4;
      ringMesh.position.y = 0.22;
      ringMesh.visible = false;
      plotGroup.add(ringMesh);

      // Lock marker for locked expansion plots
      const lockMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.35 })
      );
      lockMesh.position.y = 0.52;
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

      // Simplified invisible hitbox on Layer 1 for instant mobile/desktop picking
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
      });
    });

    sceneRefs.current = {
      scene,
      camera,
      controls,
      plotHandles,
      waterLevelMesh,
      fanGroup,
      shadeNetMesh,
      ghExpandGroup,
      soilTexRaw,
      soilTexPlowed,
      soilTexLeveled,
      soilTexWet,
      soilTexLocked,
      isTransitioning: false,
      activePreset: 'overview',
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on clean tap/click (ignoring camera drag)
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
      if (dist > 8) return; // User orbited/panned camera

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      if (hits.length > 0) {
        const hitPlotId = hits[0].object.userData?.plotId;
        if (hitPlotId) onSelectPlotRef.current(hitPlotId);
      }
    };

    const cancelTransitionOnInteract = () => {
      if (sceneRefs.current) sceneRefs.current.isTransitioning = false;
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    controls.addEventListener('start', cancelTransitionOnInteract);

    // ResizeObserver for crisp layout transitions
    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 10 || rect.height < 10) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    });
    resizeObserver.observe(container);

    // Paced Animation Loop (using afterDraw for Software WebGL, rAF for GPU)
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
        // Spin greenhouse exhaust fan if enabled
        if (refs.fanGroup && refs.fanGroup.userData.active) {
          refs.fanGroup.rotation.z += dt * 7.5;
        }
        // Subtle water ripple & locked icon bobbing
        falajWaterStream.position.y = 0.215 + Math.sin(elapsed * 2.5) * 0.008;
        refs.plotHandles.forEach((h) => {
          if (h.lockMesh.visible) {
            h.lockMesh.rotation.y += dt * 1.1;
          }
          if (h.pestHolder.visible && h.pestHolder.children.length > 0) {
            h.pestHolder.position.y = 0.65 + Math.sin(elapsed * 3.2) * 0.06;
          }
        });

        // Smooth camera preset damping
        if (refs.isTransitioning) {
          const preset = CAMERA_PRESETS[refs.activePreset];
          _targetCamPos.set(...preset.pos);
          _targetCtrlPos.set(...preset.target);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 5.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 5.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 5.5, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetCtrlPos.x, 5.5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetCtrlPos.y, 5.5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetCtrlPos.z, 5.5, dt);

          _tmpVec.copy(camera.position).sub(_targetCamPos);
          if (_tmpVec.lengthSq() < 0.015) {
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
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.removeEventListener('start', cancelTransitionOnInteract);
      controls.dispose();

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

  // Trigger smooth camera transition when user clicks a preset button
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.activePreset = cameraPreset;
    refs.isTransitioning = true;
  }, [cameraPreset, presetTrigger]);

  // Synchronize live server farm state with 3D geometries without recreating the WebGL canvas
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs || !farm) return;

    // 1. Water tank gauge
    if (refs.waterLevelMesh) {
      const ratio = Math.max(0.08, Math.min(1, farm.waterLiters / (farm.maxWaterLiters || 300)));
      refs.waterLevelMesh.scale.y = ratio;
      refs.waterLevelMesh.position.y = 0.85 + ratio * 0.6;
    }

    // 2. Greenhouse ventilation, shading & expansion level
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

    // 3. Plot soils, crops, weeds, pests & selection ring
    farm.plots.forEach((plot) => {
      const handle = refs.plotHandles.get(plot.id);
      if (!handle) return;

      handle.ringMesh.visible = plot.id === selectedPlotId;
      handle.lockMesh.visible = !plot.isUnlocked;

      // Update soil texture
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

      // Rebuild crop/weed/pest meshes only when signature changes
      const sig = `${plot.cropId || 'empty'}|${plot.stageIndex}|${Math.round(plot.health / 20)}|${Math.round(plot.weedsLevel / 20)}|${plot.pestType || ''}|${plot.isUnlocked}`;
      if (handle.lastSig !== sig) {
        handle.lastSig = sig;

        // Clear old crop
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

        // Clear and rebuild weeds
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

        // Clear and rebuild pest indicator
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
      className="w-full h-full min-h-[360px] cursor-grab active:cursor-grabbing select-none touch-none"
      aria-label="المزرعة الافتراضية ثلاثية الأبعاد التفاعلية"
    />
  );
};
