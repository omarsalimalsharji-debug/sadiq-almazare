/**
 * Full-Stack Production Server for "صديق المزارع" (Farmer's Friend - Oman 2026)
 * Founder & Director: Omar Al-Sharji (عمر الشرجي) – Sultanate of Oman
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  INITIAL_BOOKS, 
  GAME_QUESTIONS, 
  RADIO_STATIONS,
  OMANI_GOVERNORATES,
  Book,
  Question,
  RadioStation
} from './src/data/agriculturalData.ts';
import {
  VIRTUAL_CROPS,
  VIRTUAL_SHOP_ITEMS,
  FARM_ACHIEVEMENTS,
  OMAN_FARM_SEASONS,
  SAMAIL_DAILY_BOOK_TIPS,
  VirtualCropDef
} from './src/data/virtualFarmData.ts';
import { DEFAULT_SEASONAL_CONFIG, SeasonalConfig } from './src/utils/islamicCalendar.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Gemini on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Storage Directory for Persistent Database
const DATA_DIR = path.resolve(__dirname, 'data');
const STORAGE_FILE = path.resolve(DATA_DIR, 'storage.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Salted scrypt password hashing (never store plaintext passwords in source or DB)
function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password.normalize('NFC'), salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password: string, record?: { salt: string; hash: string }): boolean {
  if (!record || !record.salt || !record.hash) return false;
  try {
    const candidate = crypto.scryptSync(password.normalize('NFC'), record.salt, 64);
    const expected = Buffer.from(record.hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// One-time initial bootstrap credential (salted scrypt digest; cleared upon first password change)
const BOOTSTRAP_ADMIN_CREDENTIAL = {
  salt: '40ff2fc6b9c21dd12be781cada8d5d8d',
  hash: '04ab1befeb39bbea7d37ffe18aab3db12d5e2eb17e2113630ba4c4340585111f06e2686907d6c8ca98856105a68be781df13f760107101feeb204fd0710169db',
};

export interface ModeratorRecord {
  id: string;
  username: string;
  displayName: string;
  salt: string;
  hash: string;
  isPaused: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StaffSession {
  token: string;
  role: 'admin' | 'moderator';
  actorId: string;
  actorName: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

export interface VisitorRecord {
  anonId: string;
  deviceType: 'هاتف' | 'جهاز لوحي' | 'كمبيوتر';
  browserLabel: string;
  firstVisitAt: number;
  lastSeenAt: number;
  visitCount: number;
  lastPage: string;
}

export interface ModerationLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'moderator';
  actionType: string;
  targetType: string;
  targetId: string;
  targetPreview: string;
  timestamp: number;
}

// Default Seed State
interface StorageSchema {
  books: Book[];
  questions: Question[];
  radioStations: RadioStation[];
  scoreSubmissions: any[];
  communityPosts: any[];
  notifications: any[];
  auditLogs: any[];
  adminAuth: {
    salt: string;
    hash: string;
    mustChangePassword: boolean;
    bootstrapConsumed: boolean;
    updatedAt: number;
  };
  staffSessions: Record<string, StaffSession>;
  moderators: ModeratorRecord[];
  bannedWords: string[];
  moderationLogs: ModerationLog[];
  visitors: Record<string, VisitorRecord>;
  dailyVisitIds: Record<string, string[]>;
  seasonalConfig: SeasonalConfig;
  virtualCrops: VirtualCropDef[];
  virtualFarms: Record<string, any>;
  farmFriendships: any[];
  farmCompetitions: any[];
  farmReports: any[];
  bannedUserIds: string[];
  pointRules: {
    dailyLogin: number;
    farmAction: number;
    timelyFertilizer: number;
    pestCure: number;
    stageComplete: number;
    harvest: number;
    dailyChallenge: number;
    dailyCap: number;
  };
}

const defaultStorage: StorageSchema = {
  books: [...INITIAL_BOOKS],
  questions: [...GAME_QUESTIONS],
  radioStations: [...RADIO_STATIONS],
  scoreSubmissions: [
    {
      id: "sub-1",
      userId: "usr-oman-1",
      userName: "سعيد بن ناصر الهنائي",
      userGovernorate: "محافظة الداخلية (نزوى)",
      gameType: "knowledge",
      score: 840,
      correctCount: 7,
      totalQuestions: 8,
      streakBonus: 140,
      timestamp: Date.now() - 3600000 * 2,
      clientNonce: "seed-1"
    },
    {
      id: "sub-2",
      userId: "usr-oman-2",
      userName: "أحمد بن سالم المعمري",
      userGovernorate: "محافظة شمال الباطنة (صحم)",
      gameType: "guess_crop",
      score: 720,
      correctCount: 6,
      totalQuestions: 6,
      streakBonus: 120,
      timestamp: Date.now() - 3600000 * 5,
      clientNonce: "seed-2"
    },
    {
      id: "sub-3",
      userId: "usr-oman-3",
      userName: "مريم بنت خلفان الحبسية",
      userGovernorate: "محافظة شمال الشرقية (المضيبي)",
      gameType: "cultural",
      score: 650,
      correctCount: 5,
      totalQuestions: 5,
      streakBonus: 150,
      timestamp: Date.now() - 3600000 * 9,
      clientNonce: "seed-3"
    }
  ],
  communityPosts: [
    {
      id: "post-1",
      authorName: "المهندس عمر الشرجي (مدير التطبيق)",
      authorRole: "مدير التطبيق",
      authorGovernorate: "سلطنة عُمان",
      cropCategory: "نخيل التمر والري",
      content: "أهلاً وسهلاً بجميع المزارعين والمهندسين وأبناء الوطن في منصة «صديق المزارع». يسعدنا تقديم هذا الإصدار الاحترافي 2026 لخدمة قطاع الزراعة العماني، ونرحب بمشاركاتكم واستفساراتكم حول إدارة المحاصيل ومكافحة الآفات.",
      timestamp: Date.now() - 86400000 * 2,
      likes: 42,
      likedBy: [],
      comments: [
        {
          id: "comm-1",
          authorName: "سالم الشامسي",
          authorRole: "مزارع",
          comment: "بارك الله في جهودكم يا أخ عمر، المنصة مميزة جداً خصوصاً تشخيص الأمراض والقرآن بصوت هزاع البلوشي.",
          timestamp: Date.now() - 86400000 * 1
        }
      ]
    },
    {
      id: "post-2",
      authorName: "خلفان بن حمد العامري",
      authorRole: "مزارع",
      authorGovernorate: "محافظة الداخلية (سمائل)",
      cropCategory: "زراعة الطماطم المحمية",
      content: "السلام عليكم، مع تقلبات درجات الحرارة بين الليل والنهار في سمائل، ما هي أفضل ممارسات مكافحة البياض الدقيقي دون الإفراط في المبيدات؟",
      timestamp: Date.now() - 3600000 * 6,
      likes: 15,
      likedBy: [],
      comments: [
        {
          id: "comm-2",
          authorName: "م. ناصر المعمري",
          authorRole: "مهندس زراعي",
          comment: "وعليكم السلام يا أبا حمد. الكبريت الميكروني وقائي ممتاز جداً ويفضل استخدامه صباحاً مع تهوية البيوت المحمية جيداً.",
          timestamp: Date.now() - 3600000 * 3
        }
      ]
    }
  ],
  notifications: [
    {
      id: "notif-1",
      title: "تنبيه مناخي: نشاط رياح هابطة وفرص غبار",
      message: "توقع نشاط رياح مثيرة للغبار على محافظات البريمي والظاهرة والوسطى، يرجى إحكام أغطية البيوت المحمية وتأجيل رش المبيدات.",
      type: "weather",
      targetGovernorate: "الظاهرة والبريمي",
      timestamp: Date.now() - 3600000 * 2,
      read: false
    },
    {
      id: "notif-2",
      title: "إرشاد النخيل: مواعيد التكميم الميداني",
      message: "توصية إدارة الإرشاد الزراعي بمتابعة تكميم عذوق نخيل الخلاص والفرض لحمايتها من العناكب وطيور القيظ.",
      type: "crop_advice",
      timestamp: Date.now() - 3600000 * 12,
      read: false
    }
  ],
  auditLogs: [
    {
      id: "aud-1",
      action: "بدء تشغيل النظام الشامل",
      performedBy: "عمر الشرجي (المدير العام)",
      details: "إطلاق الإصدار الاحترافي 2026 مع البث المباشر وقارئ الكتب وتشخيص الذكاء الاصطناعي",
      timestamp: Date.now()
    }
  ],
  adminAuth: {
    salt: BOOTSTRAP_ADMIN_CREDENTIAL.salt,
    hash: BOOTSTRAP_ADMIN_CREDENTIAL.hash,
    mustChangePassword: true,
    bootstrapConsumed: false,
    updatedAt: Date.now()
  },
  staffSessions: {},
  moderators: [],
  bannedWords: ['نصب', 'احتيال', 'سبام'],
  moderationLogs: [],
  visitors: {},
  dailyVisitIds: {},
  seasonalConfig: { ...DEFAULT_SEASONAL_CONFIG },
  virtualCrops: [...VIRTUAL_CROPS],
  virtualFarms: {},
  farmFriendships: [],
  farmCompetitions: [
    {
      id: 'comp-oman-dates-2026',
      title: 'تحدي مزارع النخيل والخضراوات العُمانية',
      description: 'منافسة أسبوعية مفتوحة لجميع مزارعي سلطنة عُمان لرفع الإنتاج وجودة الري والتسميد السليم.',
      prizePoints: 150,
      startDate: Date.now() - 86400000 * 2,
      endDate: Date.now() + 86400000 * 5,
      isActive: true
    }
  ],
  farmReports: [],
  bannedUserIds: [],
  pointRules: {
    dailyLogin: 5,
    farmAction: 10,
    timelyFertilizer: 15,
    pestCure: 20,
    stageComplete: 25,
    harvest: 30,
    dailyChallenge: 40,
    dailyCap: 350
  }
};

// Load or initialize storage
let storage: StorageSchema = { ...defaultStorage };
if (fs.existsSync(STORAGE_FILE)) {
  try {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const hasValidAdminAuth =
      parsed.adminAuth &&
      typeof parsed.adminAuth.salt === 'string' &&
      typeof parsed.adminAuth.hash === 'string';
    storage = {
      ...defaultStorage,
      ...parsed,
      adminAuth: hasValidAdminAuth ? parsed.adminAuth : { ...defaultStorage.adminAuth },
      staffSessions: parsed.staffSessions && typeof parsed.staffSessions === 'object' ? parsed.staffSessions : {},
      moderators: Array.isArray(parsed.moderators) ? parsed.moderators : [],
      bannedWords: Array.isArray(parsed.bannedWords) ? parsed.bannedWords : [...defaultStorage.bannedWords],
      moderationLogs: Array.isArray(parsed.moderationLogs) ? parsed.moderationLogs : [],
      visitors: parsed.visitors && typeof parsed.visitors === 'object' ? parsed.visitors : {},
      dailyVisitIds: parsed.dailyVisitIds && typeof parsed.dailyVisitIds === 'object' ? parsed.dailyVisitIds : {},
      seasonalConfig: { ...DEFAULT_SEASONAL_CONFIG, ...(parsed.seasonalConfig || {}) },
      pointRules: { ...defaultStorage.pointRules, ...(parsed.pointRules || {}) },
      virtualCrops: Array.isArray(parsed.virtualCrops) && parsed.virtualCrops.length > 0 ? parsed.virtualCrops : [...VIRTUAL_CROPS],
      virtualFarms: parsed.virtualFarms || {},
      farmFriendships: parsed.farmFriendships || [],
      farmCompetitions: parsed.farmCompetitions || defaultStorage.farmCompetitions,
      farmReports: parsed.farmReports || [],
      bannedUserIds: parsed.bannedUserIds || []
    };
    // Ensure built-in books (especially the new Samail book) and book crops stay synced
    for (const baseBook of [...INITIAL_BOOKS].reverse()) {
      const existingIdx = storage.books.findIndex((b) => b.id === baseBook.id);
      if (existingIdx === -1) {
        storage.books.unshift(baseBook);
      } else {
        storage.books[existingIdx] = {
          ...baseBook,
          readCount: Math.max(storage.books[existingIdx].readCount || 0, baseBook.readCount || 0),
        };
      }
    }
    for (const baseCrop of VIRTUAL_CROPS) {
      const cIdx = storage.virtualCrops.findIndex((c) => c.id === baseCrop.id);
      if (cIdx === -1) {
        storage.virtualCrops.push(baseCrop);
      } else {
        storage.virtualCrops[cIdx] = { ...storage.virtualCrops[cIdx], ...baseCrop };
      }
    }
    delete (storage as any).adminPinHash;
    delete (storage as any).adminTokens;
  } catch (e) {
    console.warn('Failed to parse storage.json, starting with default seed data.');
  }
}

// Persist storage to disk
function saveStorage() {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save storage.json:', e);
  }
}

// Nonce set to prevent score replaying
const submittedNonces = new Set<string>();

// Brute-force lockout tracker (5 failed attempts -> 5-minute temporary block)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;
const loginAttemptTracker = new Map<string, { failures: number; lockedUntil: number }>();

function getAttemptKey(req: express.Request, scope: string): string {
  const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  const ip = forwarded || req.ip || 'local';
  return `${scope}:${ip}`;
}

function checkRateLimit(key: string): { blocked: boolean; remainingSec: number } {
  const entry = loginAttemptTracker.get(key);
  if (!entry) return { blocked: false, remainingSec: 0 };
  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { blocked: true, remainingSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    loginAttemptTracker.delete(key);
  }
  return { blocked: false, remainingSec: 0 };
}

function recordFailedAttempt(key: string): { locked: boolean; remainingAttempts: number; remainingSec: number } {
  const prev = loginAttemptTracker.get(key) || { failures: 0, lockedUntil: 0 };
  const failures = prev.failures + 1;
  if (failures >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    loginAttemptTracker.set(key, { failures, lockedUntil });
    return { locked: true, remainingAttempts: 0, remainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }
  loginAttemptTracker.set(key, { failures, lockedUntil: 0 });
  return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - failures, remainingSec: 0 };
}

function clearFailedAttempts(key: string) {
  loginAttemptTracker.delete(key);
}

// Text Censoring for Community Posts & Chat
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function censorText(text: string, bannedWords: string[]): string {
  if (!text || !Array.isArray(bannedWords) || bannedWords.length === 0) return text;
  let result = text;
  for (const rawWord of bannedWords) {
    const word = String(rawWord || '').trim();
    if (!word) continue;
    try {
      const regex = new RegExp(escapeRegExp(word), 'gi');
      result = result.replace(regex, '***');
    } catch {
      // ignore invalid pattern
    }
  }
  return result;
}

// Staff Authentication & Role Verification Middleware
interface AuthenticatedRequest extends express.Request {
  staffSession?: StaffSession;
}

function extractStaffToken(req: express.Request): string {
  const headerToken = req.headers['x-admin-token'] as string;
  if (headerToken) return headerToken.trim();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function resolveStaffSession(req: express.Request): { session?: StaffSession; error?: string; status?: number } {
  const token = extractStaffToken(req);
  if (!token) {
    return { status: 403, error: 'صلاحيات وصول مرفوضة: يرجى تسجيل الدخول أولاً.' };
  }
  const session = storage.staffSessions[token];
  if (!session) {
    return { status: 403, error: 'انتهت صلاحية الجلسة أو الرمز غير صالح.' };
  }
  if (session.expiresAt < Date.now()) {
    delete storage.staffSessions[token];
    saveStorage();
    return { status: 401, error: 'انتهت مدة الجلسة، يرجى إعادة تسجيل الدخول.' };
  }
  if (session.role === 'moderator') {
    const mod = storage.moderators.find(m => m.id === session.actorId);
    if (!mod) {
      delete storage.staffSessions[token];
      saveStorage();
      return { status: 403, error: 'تم حذف حساب المشرف ولم يعد يملك صلاحية الوصول.' };
    }
    if (mod.isPaused) {
      return { status: 403, error: 'تم إيقاف حساب المشرف مؤقتاً من قبل مدير التطبيق.' };
    }
  }
  return { session };
}

function requireStaff(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const resolved = resolveStaffSession(req);
  if (!resolved.session) {
    return res.status(resolved.status || 403).json({ error: resolved.error });
  }
  req.staffSession = resolved.session;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const resolved = resolveStaffSession(req);
  if (!resolved.session) {
    return res.status(resolved.status || 403).json({ error: resolved.error });
  }
  if (resolved.session.role !== 'admin') {
    return res.status(403).json({ error: 'صلاحية مرفوضة: هذا الإجراء مخصص لمدير التطبيق فقط.' });
  }
  const allowWhileBootstrap =
    req.path === '/api/admin/change-pin' ||
    req.path === '/api/auth/me' ||
    req.path === '/api/auth/logout';
  if (storage.adminAuth.mustChangePassword && !allowWhileBootstrap) {
    return res.status(403).json({
      error: 'يجب تغيير كلمة سر المدير الافتراضية فوراً عند أول دخول قبل متابعة العمليات الإدارية.',
      requirePasswordChange: true,
    });
  }
  req.staffSession = resolved.session;
  next();
}

// --- 1. Real Weather API (Open-Meteo Integration for Oman) ---
const weatherCache = new Map<string, { data: any; expiry: number }>();

app.get('/api/weather/live', async (req, res) => {
  const govId = (req.query.govId as string) || 'muscat';
  const gov = OMANI_GOVERNORATES.find(g => g.id === govId) || OMANI_GOVERNORATES[0];

  const now = Date.now();
  const cached = weatherCache.get(gov.id);
  if (cached && cached.expiry > now) {
    return res.json({ success: true, live: cached.data });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${gov.lat}&longitude=${gov.lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FMuscat`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Open-Meteo API response not ok');
    const meteoData = await response.json();

    const current = meteoData.current || {};
    const temp = Math.round(current.temperature_2m ?? 28);
    const humidity = Math.round(current.relative_humidity_2m ?? 50);
    const windSpeed = Math.round(current.wind_speed_10m ?? 12);
    const rain = current.precipitation ?? 0;

    // Build intelligent agricultural alerts based on real readings
    const generatedAlerts: string[] = [];
    if (temp >= 36) {
      generatedAlerts.push(`موجة حرارة مرتفعة (${temp}°م): ينصح بزيادة وتيرة الري ليلاً وتظليل المشاتل والبيوت المحمية.`);
    } else if (temp <= 8) {
      generatedAlerts.push(`انخفاض حاد في درجات الحرارة (${temp}°م): تنبيه لمزارعي الجبل الأخضر لحماية المحاصيل الحساسة من الصقيع.`);
    }

    if (humidity >= 65) {
      generatedAlerts.push(`رطوبة نسبية عالية (${humidity}%): ظروف ملائمة لانتشار البياض الدقيقي والفطريات، يوصى بتهوية البيوت المحمية.`);
    }

    if (windSpeed >= 20) {
      generatedAlerts.push(`سرعة رياح نشطة (${windSpeed} كم/س): يجب إيقاف رش المبيدات فوراً لتفادي تطاير الرذاذ وتسمم المزروعات المجاورة.`);
    }

    if (rain > 1) {
      generatedAlerts.push(`فرص هطول أمطار (${rain} ملم): يرجى تفقد قنوات تصريف المياه والأفلاج وتجنب التسميد الأرضي أثناء جريان الأودية.`);
    }

    const payload = {
      governorate: gov.name,
      governorateEn: gov.nameEn,
      wilayat: gov.wilayat,
      temperature: temp,
      humidity,
      windSpeed,
      rain,
      recordedAt: current.time || new Date().toISOString(),
      alerts: generatedAlerts,
      source: "بيانات حية مباشرة من محطات الأرصاد (Open-Meteo)",
      climateNote: gov.climateNote
    };

    // Cache for 10 minutes
    weatherCache.set(gov.id, { data: payload, expiry: now + 10 * 60 * 1000 });
    return res.json({ success: true, live: payload });
  } catch (err: any) {
    console.warn('Weather fetch error:', err.message);
    // Graceful fallback with governorate standard climate
    return res.json({
      success: true,
      live: {
        governorate: gov.name,
        wilayat: gov.wilayat,
        temperature: 28,
        humidity: 55,
        windSpeed: 14,
        rain: 0,
        alerts: ["الطقس مستقر ومناسب للخدمات الزراعية المعتادة."],
        source: "بيانات تقديرية لمناخ المحافظة",
        climateNote: gov.climateNote
      }
    });
  }
});

// --- 2. Secure Salted Auth, Rate Limiting, Password Change, Moderators, Visitors & Banned Words ---
app.post('/api/auth/login', (req, res) => {
  const { mode, username, password, pin } = req.body || {};
  const secretInput = typeof password === 'string' ? password : typeof pin === 'string' ? pin : '';
  const cleanSecret = secretInput.trim();
  const isModeratorLogin = mode === 'moderator' || (typeof username === 'string' && username.trim().length > 0);

  if (!cleanSecret) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة السر للمتابعة.' });
  }

  if (isModeratorLogin) {
    const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!cleanUsername) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم الخاص بالمشرف.' });
    }
    const rateKey = getAttemptKey(req, `mod:${cleanUsername}`);
    const limit = checkRateLimit(rateKey);
    if (limit.blocked) {
      return res.status(429).json({
        error: `تم حظر محاولات الدخول مؤقتاً بعد 5 محاولات خاطئة. حاول مجدداً بعد ${limit.remainingSec} ثانية.`,
        lockedForSec: limit.remainingSec,
      });
    }

    const mod = storage.moderators.find(m => m.username.toLowerCase() === cleanUsername);
    if (!mod || !verifyPassword(cleanSecret, mod)) {
      const attempt = recordFailedAttempt(rateKey);
      if (attempt.locked) {
        return res.status(429).json({
          error: `تم تجاوز 5 محاولات خاطئة. تم حظر الدخول مؤقتاً لمدة 5 دقائق (${attempt.remainingSec} ثانية).`,
          lockedForSec: attempt.remainingSec,
        });
      }
      return res.status(401).json({
        error: `بيانات دخول المشرف غير صحيحة. المحاولات المتبقية: ${attempt.remainingAttempts}`,
      });
    }

    if (mod.isPaused) {
      return res.status(403).json({
        error: 'تم إيقاف حساب المشرف مؤقتاً من قبل مدير التطبيق.',
      });
    }

    clearFailedAttempts(rateKey);
    const token = 'mod_tok_' + crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    storage.staffSessions[token] = {
      token,
      role: 'moderator',
      actorId: mod.id,
      actorName: mod.displayName,
      username: mod.username,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };
    storage.auditLogs.unshift({
      id: `aud-${now}`,
      action: 'تسجيل دخول مشرف',
      performedBy: `${mod.displayName} (@${mod.username})`,
      details: 'دخول موثق بصلاحيات الإشراف على المجتمع والدردشة',
      timestamp: now,
    });
    saveStorage();

    return res.json({
      success: true,
      token,
      role: 'moderator',
      mustChangePassword: false,
      user: {
        id: mod.id,
        name: mod.displayName,
        username: mod.username,
        role: 'مشرف',
        governorate: 'سلطنة عُمان',
        wilayat: 'مسقط',
        isAdmin: false,
        isModerator: true,
      },
    });
  }

  // Admin Login
  const rateKey = getAttemptKey(req, 'admin');
  const limit = checkRateLimit(rateKey);
  if (limit.blocked) {
    return res.status(429).json({
      error: `تم حظر الدخول مؤقتاً بعد 5 محاولات خاطئة. يرجى الانتظار ${limit.remainingSec} ثانية.`,
      lockedForSec: limit.remainingSec,
    });
  }

  const isValid = verifyPassword(cleanSecret, storage.adminAuth);
  if (!isValid) {
    const attempt = recordFailedAttempt(rateKey);
    if (attempt.locked) {
      return res.status(429).json({
        error: `تم حظر محاولات دخول المدير مؤقتاً لمدة 5 دقائق بعد 5 محاولات خاطئة.`,
        lockedForSec: attempt.remainingSec,
      });
    }
    return res.status(401).json({
      error: `كلمة سر المدير غير صحيحة. المحاولات المتبقية قبل الحظر المؤقت: ${attempt.remainingAttempts}`,
    });
  }

  clearFailedAttempts(rateKey);
  const token = 'admin_tok_' + crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  storage.staffSessions[token] = {
    token,
    role: 'admin',
    actorId: 'admin-omar',
    actorName: 'عمر الشرجي',
    username: 'admin',
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  };
  storage.auditLogs.unshift({
    id: `aud-${now}`,
    action: 'تسجيل دخول إداري',
    performedBy: 'عمر الشرجي (المدير العام)',
    details: storage.adminAuth.mustChangePassword
      ? 'دخول أولي بكلمة السر الابتدائية — مطلوب التغيير الفوري'
      : 'جلسة دخول موثقة بصلاحيات كاملة',
    timestamp: now,
  });
  saveStorage();

  return res.json({
    success: true,
    token,
    role: 'admin',
    mustChangePassword: Boolean(storage.adminAuth.mustChangePassword),
    user: {
      id: 'admin-omar',
      name: 'عمر الشرجي',
      role: 'مدير التطبيق',
      governorate: 'محافظة مسقط',
      wilayat: 'مسقط',
      isAdmin: true,
      isModerator: true,
    },
  });
});

app.get('/api/auth/me', requireStaff, (req: AuthenticatedRequest, res) => {
  const s = req.staffSession!;
  return res.json({
    success: true,
    session: {
      role: s.role,
      actorId: s.actorId,
      actorName: s.actorName,
      username: s.username,
      mustChangePassword: s.role === 'admin' ? Boolean(storage.adminAuth.mustChangePassword) : false,
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = extractStaffToken(req);
  if (token && storage.staffSessions[token]) {
    delete storage.staffSessions[token];
    saveStorage();
  }
  return res.json({ success: true });
});

app.post('/api/admin/change-pin', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { currentPin, currentPassword, newPin, newPassword, confirmPassword } = req.body || {};
  const oldSecret = String(currentPassword ?? currentPin ?? '').trim();
  const nextSecret = String(newPassword ?? newPin ?? '').trim();
  const confirmSecret = confirmPassword !== undefined ? String(confirmPassword).trim() : nextSecret;

  if (!oldSecret || !nextSecret) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة السر الحالية وكلمة السر الجديدة.' });
  }
  if (nextSecret.length < 8) {
    return res.status(400).json({ error: 'يجب أن تتكون كلمة السر الجديدة من 8 خانات على الأقل.' });
  }
  if (nextSecret !== confirmSecret) {
    return res.status(400).json({ error: 'كلمة السر الجديدة وتأكيدها غير متطابقين.' });
  }
  if (nextSecret === oldSecret) {
    return res.status(400).json({ error: 'يجب اختيار كلمة سر جديدة مختلفة عن كلمة السر الحالية.' });
  }

  const rateKey = getAttemptKey(req, 'admin-change-pin');
  const limit = checkRateLimit(rateKey);
  if (limit.blocked) {
    return res.status(429).json({
      error: `تم حظر المحاولات مؤقتاً بعد 5 محاولات خاطئة. انتظر ${limit.remainingSec} ثانية.`,
    });
  }

  if (!verifyPassword(oldSecret, storage.adminAuth)) {
    const attempt = recordFailedAttempt(rateKey);
    return res.status(attempt.locked ? 429 : 403).json({
      error: attempt.locked
        ? 'تم حظر المحاولات مؤقتاً بعد 5 إدخالات خاطئة لكلمة السر الحالية.'
        : `كلمة السر الحالية غير صحيحة. المحاولات المتبقية: ${attempt.remainingAttempts}`,
    });
  }

  clearFailedAttempts(rateKey);
  const { salt, hash } = hashPassword(nextSecret);
  storage.adminAuth = {
    salt,
    hash,
    mustChangePassword: false,
    bootstrapConsumed: true,
    updatedAt: Date.now(),
  };

  const callerToken = extractStaffToken(req);
  for (const tok of Object.keys(storage.staffSessions)) {
    if (storage.staffSessions[tok].role === 'admin' && tok !== callerToken) {
      delete storage.staffSessions[tok];
    }
  }

  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: 'تغيير كلمة سر المدير (تشفير scrypt + salt)',
    performedBy: req.staffSession?.actorName || 'عمر الشرجي (المدير العام)',
    details: 'تم تحديث كلمة سر المدير وتفعيل التشفير العشوائي وإلغاء كلمة السر الابتدائية نهائياً',
    timestamp: Date.now(),
  });
  saveStorage();

  return res.json({
    success: true,
    mustChangePassword: false,
    message: 'تم تغيير كلمة سر المدير بنجاح وحفظها مشفّرة، ولن يمكن استخدام كلمة السر الابتدائية مجدداً.',
  });
});

// --- 2B. Visitor Tracking & Analytics APIs ---
function detectDeviceType(ua: string, clientHint?: string): 'هاتف' | 'جهاز لوحي' | 'كمبيوتر' {
  if (clientHint === 'هاتف' || clientHint === 'جهاز لوحي' || clientHint === 'كمبيوتر') {
    return clientHint;
  }
  const lower = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(lower)) return 'جهاز لوحي';
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(lower)) return 'هاتف';
  return 'كمبيوتر';
}

function detectBrowserLabel(ua: string): string {
  const lower = ua.toLowerCase();
  const os = lower.includes('iphone') || lower.includes('ipad')
    ? 'iOS'
    : lower.includes('android')
      ? 'Android'
      : lower.includes('windows')
        ? 'Windows'
        : lower.includes('mac os')
          ? 'macOS'
          : 'Linux/Other';
  const browser = lower.includes('edg/')
    ? 'Edge'
    : lower.includes('chrome') && !lower.includes('edg/')
      ? 'Chrome'
      : lower.includes('safari') && !lower.includes('chrome')
        ? 'Safari'
        : lower.includes('firefox')
          ? 'Firefox'
          : 'متصفح';
  return `${os} · ${browser}`;
}

app.post('/api/visitors/track', (req, res) => {
  try {
    const { anonId, deviceType, currentPage } = req.body || {};
    const ua = String(req.headers['user-agent'] || '');
    const rawId = typeof anonId === 'string' && anonId.trim().length >= 6
      ? anonId.trim().slice(0, 64)
      : crypto.createHash('sha256').update(`${req.ip || 'ip'}:${ua}`).digest('hex').slice(0, 24);

    const safeId = 'v_' + crypto.createHash('sha256').update(rawId).digest('hex').slice(0, 16);
    const now = Date.now();
    const todayKey = getMuscatDayKey(now);
    const resolvedDevice = detectDeviceType(ua, deviceType);
    const browserLabel = detectBrowserLabel(ua);
    const pageStr = typeof currentPage === 'string' ? currentPage.slice(0, 40) : 'home';

    const existing = storage.visitors[safeId];
    if (existing) {
      const prevSeen = existing.lastSeenAt || 0;
      existing.lastSeenAt = now;
      existing.deviceType = resolvedDevice;
      existing.browserLabel = browserLabel;
      existing.lastPage = pageStr;
      if (now - prevSeen > 30 * 60 * 1000) {
        existing.visitCount += 1;
      }
    } else {
      storage.visitors[safeId] = {
        anonId: safeId,
        deviceType: resolvedDevice,
        browserLabel,
        firstVisitAt: now,
        lastSeenAt: now,
        visitCount: 1,
        lastPage: pageStr,
      };
    }

    if (!Array.isArray(storage.dailyVisitIds[todayKey])) {
      storage.dailyVisitIds[todayKey] = [];
    }
    if (!storage.dailyVisitIds[todayKey].includes(safeId)) {
      storage.dailyVisitIds[todayKey].push(safeId);
    }

    const allIds = Object.keys(storage.visitors);
    if (allIds.length > 2000) {
      allIds
        .sort((a, b) => storage.visitors[a].lastSeenAt - storage.visitors[b].lastSeenAt)
        .slice(0, allIds.length - 2000)
        .forEach((oldId) => delete storage.visitors[oldId]);
    }

    saveStorage();
    return res.json({ success: true });
  } catch {
    return res.json({ success: false });
  }
});

app.get('/api/admin/visitors', requireAdmin, (_req, res) => {
  const now = Date.now();
  const activeCutoff = now - 5 * 60 * 1000;
  const allVisitors = Object.values(storage.visitors);

  const last7Days: Array<{ dateKey: string; labelAr: string; count: number }> = [];
  const weekUniqueSet = new Set<string>();

  for (let offset = 6; offset >= 0; offset--) {
    const ts = now - offset * 86400000;
    const key = getMuscatDayKey(ts);
    const ids = storage.dailyVisitIds[key] || [];
    ids.forEach((id) => weekUniqueSet.add(id));
    const labelAr = new Date(ts).toLocaleDateString('ar-OM', {
      timeZone: 'Asia/Muscat',
      weekday: 'short',
      day: 'numeric',
    });
    last7Days.push({
      dateKey: key,
      labelAr,
      count: ids.length,
    });
  }

  const todayKey = getMuscatDayKey(now);
  const todayCount = (storage.dailyVisitIds[todayKey] || []).length;
  const activeNowCount = allVisitors.filter((v) => v.lastSeenAt >= activeCutoff).length;

  const recentVisitors = [...allVisitors]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, 30)
    .map((v) => ({
      anonLabel: `زائر-${v.anonId.slice(2, 8).toUpperCase()}`,
      deviceType: v.deviceType,
      browserLabel: v.browserLabel,
      firstVisitAt: v.firstVisitAt,
      lastSeenAt: v.lastSeenAt,
      visitCount: v.visitCount,
      lastPage: v.lastPage,
      isActiveNow: v.lastSeenAt >= activeCutoff,
    }));

  return res.json({
    success: true,
    analytics: {
      todayCount,
      weekCount: weekUniqueSet.size,
      totalCount: allVisitors.length,
      activeNowCount,
      last7Days,
      recentVisitors,
    },
  });
});

// --- 2C. Moderators CRUD (Admin Only) ---
app.get('/api/admin/moderators', requireAdmin, (_req, res) => {
  const safeList = storage.moderators.map((m) => ({
    id: m.id,
    username: m.username,
    displayName: m.displayName,
    isPaused: m.isPaused,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
  return res.json({ success: true, moderators: safeList });
});

app.post('/api/admin/moderators', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { username, displayName, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanName = String(displayName || '').trim();
  const cleanPass = String(password || '').trim();

  if (cleanUser.length < 3 || !/^[a-z0-9._-]+$/i.test(cleanUser)) {
    return res.status(400).json({ error: 'اسم مستخدم المشرف يجب أن يكون 3 أحرف إنجليزية/أرقام على الأقل.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم الظاهر للمشرف.' });
  }
  if (cleanPass.length < 8) {
    return res.status(400).json({ error: 'كلمة سر المشرف يجب أن لا تقل عن 8 خانات.' });
  }
  if (storage.moderators.some((m) => m.username.toLowerCase() === cleanUser)) {
    return res.status(409).json({ error: 'اسم المستخدم مستخدم مسبقاً لمشرف آخر.' });
  }

  const { salt, hash } = hashPassword(cleanPass);
  const now = Date.now();
  const newMod: ModeratorRecord = {
    id: `mod-${now}-${crypto.randomBytes(3).toString('hex')}`,
    username: cleanUser,
    displayName: cleanName,
    salt,
    hash,
    isPaused: false,
    createdAt: now,
    updatedAt: now,
  };

  storage.moderators.unshift(newMod);
  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: req.staffSession!.actorId,
    actorName: req.staffSession!.actorName,
    actorRole: 'admin',
    actionType: 'إضافة مشرف',
    targetType: 'مشرف',
    targetId: newMod.id,
    targetPreview: `${cleanName} (@${cleanUser})`,
    timestamp: now,
  });
  storage.auditLogs.unshift({
    id: `aud-${now}`,
    action: 'إضافة مشرف جديد',
    performedBy: req.staffSession!.actorName,
    details: `إضافة المشرف: ${cleanName} (@${cleanUser})`,
    timestamp: now,
  });
  saveStorage();

  return res.json({
    success: true,
    moderator: {
      id: newMod.id,
      username: newMod.username,
      displayName: newMod.displayName,
      isPaused: newMod.isPaused,
      createdAt: newMod.createdAt,
      updatedAt: newMod.updatedAt,
    },
  });
});

app.patch('/api/admin/moderators/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const mod = storage.moderators.find((m) => m.id === req.params.id);
  if (!mod) return res.status(404).json({ error: 'المشرف غير موجود.' });

  const { isPaused, newPassword, displayName } = req.body || {};
  const now = Date.now();

  if (typeof isPaused === 'boolean') {
    mod.isPaused = isPaused;
    if (isPaused) {
      for (const tok of Object.keys(storage.staffSessions)) {
        if (storage.staffSessions[tok].actorId === mod.id) {
          delete storage.staffSessions[tok];
        }
      }
    }
  }
  if (typeof displayName === 'string' && displayName.trim()) {
    mod.displayName = displayName.trim().slice(0, 60);
  }
  if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
    if (newPassword.trim().length < 8) {
      return res.status(400).json({ error: 'كلمة السر الجديدة للمشرف يجب أن لا تقل عن 8 خانات.' });
    }
    const { salt, hash } = hashPassword(newPassword.trim());
    mod.salt = salt;
    mod.hash = hash;
  }
  mod.updatedAt = now;

  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: req.staffSession!.actorId,
    actorName: req.staffSession!.actorName,
    actorRole: 'admin',
    actionType: mod.isPaused ? 'إيقاف مشرف مؤقتاً' : 'تفعيل / تحديث مشرف',
    targetType: 'مشرف',
    targetId: mod.id,
    targetPreview: `${mod.displayName} (@${mod.username})`,
    timestamp: now,
  });
  saveStorage();

  return res.json({
    success: true,
    moderator: {
      id: mod.id,
      username: mod.username,
      displayName: mod.displayName,
      isPaused: mod.isPaused,
      createdAt: mod.createdAt,
      updatedAt: mod.updatedAt,
    },
  });
});

app.delete('/api/admin/moderators/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const idx = storage.moderators.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'المشرف غير موجود.' });

  const removed = storage.moderators.splice(idx, 1)[0];
  for (const tok of Object.keys(storage.staffSessions)) {
    if (storage.staffSessions[tok].actorId === removed.id) {
      delete storage.staffSessions[tok];
    }
  }

  const now = Date.now();
  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: req.staffSession!.actorId,
    actorName: req.staffSession!.actorName,
    actorRole: 'admin',
    actionType: 'حذف مشرف',
    targetType: 'مشرف',
    targetId: removed.id,
    targetPreview: `${removed.displayName} (@${removed.username})`,
    timestamp: now,
  });
  storage.auditLogs.unshift({
    id: `aud-${now}`,
    action: 'حذف مشرف من الصلاحيات',
    performedBy: req.staffSession!.actorName,
    details: `حذف المشرف: ${removed.displayName} (@${removed.username})`,
    timestamp: now,
  });
  saveStorage();

  return res.json({ success: true });
});

// --- 2D. Banned Words & Moderation Action Logs ---
app.get('/api/admin/banned-words', requireAdmin, (_req, res) => {
  return res.json({ success: true, words: storage.bannedWords });
});

app.put('/api/admin/banned-words', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { words } = req.body || {};
  if (!Array.isArray(words)) {
    return res.status(400).json({ error: 'يرجى إرسال قائمة الكلمات الممنوعة كمصفوفة نصية.' });
  }
  const normalized = Array.from(
    new Set(
      words
        .map((w) => String(w || '').trim())
        .filter((w) => w.length >= 2 && w.length <= 60)
    )
  ).slice(0, 300);

  storage.bannedWords = normalized;
  const now = Date.now();
  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: req.staffSession!.actorId,
    actorName: req.staffSession!.actorName,
    actorRole: 'admin',
    actionType: 'تحديث قائمة الكلمات الممنوعة',
    targetType: 'الفلتر التلقائي',
    targetId: 'banned-words',
    targetPreview: `عدد الكلمات المعتمدة: ${normalized.length}`,
    timestamp: now,
  });
  saveStorage();

  return res.json({ success: true, words: storage.bannedWords });
});

app.get('/api/staff/moderation-logs', requireStaff, (_req, res) => {
  return res.json({
    success: true,
    moderationLogs: storage.moderationLogs.slice(0, 100),
    auditLogs: storage.auditLogs.slice(0, 100),
  });
});

// --- 3. AI Plant Disease & Pest Diagnosis API ---
app.post('/api/diagnose/plant', async (req, res) => {
  try {
    const { images, imageBase64, cropName, symptoms, wilayat } = req.body;

    const normalizedImages: Array<{ part: string; label: string; base64: string }> = [];
    const partArabicMap: Record<string, string> = {
      leaf: 'الورقة',
      stem: 'الساق / الجذع',
      fruit: 'الثمرة / الزهرة',
    };

    if (Array.isArray(images)) {
      for (const item of images) {
        if (item && typeof item.base64 === 'string' && item.base64.trim().length > 20) {
          const partKey = typeof item.part === 'string' ? item.part : 'leaf';
          normalizedImages.push({
            part: partKey,
            label: partArabicMap[partKey] || item.label || 'جزء النبات',
            base64: item.base64,
          });
        }
      }
    } else if (typeof imageBase64 === 'string' && imageBase64.trim().length > 20) {
      normalizedImages.push({
        part: 'leaf',
        label: 'صورة النبات',
        base64: imageBase64,
      });
    }

    const cleanSymptoms = typeof symptoms === 'string' ? symptoms.trim() : '';

    if (normalizedImages.length === 0 && !cleanSymptoms) {
      return res.status(400).json({
        error: 'يرجى رفع 2 إلى 3 صور للنبات (ورقة، ساق، ثمرة) أو وصف الأعراض بدقة.',
      });
    }

    if (normalizedImages.length === 1 && !cleanSymptoms) {
      return res.status(400).json({
        error: 'لرفع دقة التشخيص، يرجى إضافة صورة ثانية (مثل الساق أو الثمرة) أو كتابة ما تلاحظه من أعراض.',
      });
    }

    const MANDATORY_ADVISORY = 'التشخيص إرشادي، استشر مرشدًا زراعيًا للحالات الشديدة';

    const systemInstruction = `أنت خبير دولي متخصص في أمراض النبات والحشرات الزراعية (Plant Pathology & Agricultural Entomology) مع خبرة ميدانية في المحاصيل المزروعة في سلطنة عُمان والخليج.
مهمتك: فحص الصور المقدمة (الورقة، الساق، الثمرة) مع نوع المحصول ووصف المزارع ("ما الذي تلاحظه؟")، وإخراج نتيجة JSON فقط مطابقة للمخطط المحدد بدقة علمية عالية.

قواعد حاسمة للتشخيص:
1. افحص جودة الصور أولاً (الوضوح، الإضاءة، القرب من الإصابة، الخلفية).
2. صنّف نوع المشكلة حصراً إلى إحدى القيم الأربع: "مرض" أو "حشرة" أو "نقص عناصر" أو "سليم".
3. صنّف درجة الخطورة حصراً إلى إحدى القيم الأربع: "منخفضة" أو "متوسطة" أو "عالية" أو "حرجة".
4. إذا كانت الصور غير واضحة (ضبابية، مظلمة، بعيدة جداً، أو لا تُظهر النسيج النباتي بوضوح) أو إذا كانت نسبة الثقة أقل من 70%:
   - اضبط needsClearerPhoto على true.
   - اضبط confidenceScore على قيمة واقعية أقل من 70 (مثلاً بين 25 و65).
   - لا تعطِ تشخيصاً قاطعاً في problemName، بل اكتب "تشخيص أولي غير حاسم — يرجى إرسال صور أوضح".
   - قدّم في possibleConditions قائمة من 2 إلى 3 احتمالات مرجحة فقط (اسم المشكلة وسبب الترجيح باختصار).
   - اكتب في clarificationMessage إرشادات محددة لتصوير الجزء المطلوب بإضاءة نهارية جيدة وتقريب واضح وخلفية محايدة.
5. إذا كانت نسبة الثقة 70% فأكثر وكانت الصورة واضحة:
   - اضبط needsClearerPhoto على false.
   - حدد problemName بدقة (الاسم الشائع والعلمي).
   - اشرح visibleSymptoms، causes، organicRemedy (بدائل عضوية وحيوية عملية)، chemicalRemedy (مواد فعالة متخصصة مع فترة الأمان PHI والتحذيرات)، وpreventionTips.
6. التزم دائماً بتضمين عبارة "${MANDATORY_ADVISORY}" في حقل advisoryNote.
7. أرجع JSON صالحاً فقط دون أي نص خارجي.`;

    const parts: any[] = [];
    normalizedImages.forEach((img, index) => {
      const mimeMatch = img.base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const cleanBase64 = img.base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

      parts.push({ text: `الصورة رقم ${index + 1} — الجزء المصوّر: ${img.label}` });
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    });

    const userPrompt = `بيانات الحالة الزراعية:
- نوع النبات / المحصول: ${cropName || 'غير محدد'}
- الموقع في سلطنة عُمان: ${wilayat || 'سلطنة عُمان'}
- عدد الصور المرفقة: ${normalizedImages.length} (${normalizedImages.map((i) => i.label).join('، ') || 'بدون صور'})
- ما الذي يلاحظه المزارع؟: ${cleanSymptoms || 'لم يُضف وصف نصي، اعتمد على الصور المرفقة'}

حلل الصور والملاحظات الآن وأرجع JSON فقط وفق المخطط المطلوب.`;

    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cropName: { type: Type.STRING },
            problemName: { type: Type.STRING },
            problemType: {
              type: Type.STRING,
              enum: ['مرض', 'حشرة', 'نقص عناصر', 'سليم'],
            },
            confidenceScore: { type: Type.INTEGER },
            needsClearerPhoto: { type: Type.BOOLEAN },
            clarificationMessage: { type: Type.STRING },
            possibleConditions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            visibleSymptoms: { type: Type.STRING },
            causes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            organicRemedy: { type: Type.STRING },
            chemicalRemedy: { type: Type.STRING },
            preventionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            severity: {
              type: Type.STRING,
              enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
            },
            omaniFarmingNote: { type: Type.STRING },
            advisoryNote: { type: Type.STRING },
          },
          required: [
            'cropName',
            'problemName',
            'problemType',
            'confidenceScore',
            'needsClearerPhoto',
            'clarificationMessage',
            'possibleConditions',
            'visibleSymptoms',
            'causes',
            'organicRemedy',
            'chemicalRemedy',
            'preventionTips',
            'severity',
            'omaniFarmingNote',
            'advisoryNote',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Defense-in-depth normalization for strict UI & Firestore consistency
    const rawConfidence = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 50;
    const confidenceScore = Math.max(0, Math.min(100, Math.round(rawConfidence)));
    const allowedTypes = ['مرض', 'حشرة', 'نقص عناصر', 'سليم'];
    const problemType = allowedTypes.includes(parsed.problemType) ? parsed.problemType : 'مرض';
    const allowedSeverities = ['منخفضة', 'متوسطة', 'عالية', 'حرجة'];
    const severity = allowedSeverities.includes(parsed.severity) ? parsed.severity : 'متوسطة';

    const isLowConfidence = confidenceScore < 70 || Boolean(parsed.needsClearerPhoto);

    let possibleConditions = Array.isArray(parsed.possibleConditions)
      ? parsed.possibleConditions.filter((c: unknown) => typeof c === 'string' && c.trim().length > 0).slice(0, 3)
      : [];

    if (isLowConfidence && possibleConditions.length < 2) {
      possibleConditions = [
        parsed.problemName && !String(parsed.problemName).includes('غير حاسم')
          ? String(parsed.problemName)
          : `إصابة فطرية أو بكتيرية محتملة على ${cropName || 'النبات'}`,
        'نقص عناصر غذائية أو إجهاد مائي/حراري',
        'إصابة حشرية مبكرة أو عناكب دقيقة تحتاج فحصاً أقرب',
      ].slice(0, 3);
    }

    const normalizedDiagnosis = {
      cropName: parsed.cropName || cropName || 'نبات زراعي',
      problemName: isLowConfidence
        ? 'تشخيص أولي غير حاسم — يرجى إرسال صور أوضح'
        : (parsed.problemName || 'حالة زراعية مشخصة'),
      problemType,
      confidenceScore,
      needsClearerPhoto: isLowConfidence,
      clarificationMessage: isLowConfidence
        ? (parsed.clarificationMessage ||
            'نسبة الثقة أقل من 70% أو أن الصورة تحتاج وضوحاً أعلى. التقط صورة قريبة في إضاءة نهارية جيدة مع خلفية واضحة للورقة والساق.')
        : (parsed.clarificationMessage || ''),
      possibleConditions,
      visibleSymptoms: parsed.visibleSymptoms || cleanSymptoms || 'تغيرات ظاهرية مرصودة على الأجزاء المصورة.',
      causes: Array.isArray(parsed.causes) ? parsed.causes.slice(0, 8) : [],
      organicRemedy:
        parsed.organicRemedy ||
        'إزالة الأجزاء شديدة الإصابة، تحسين التهوية وتنظيم الري، واستخدام مستخلص النيم أو الصابون البوتاسي عند اللزوم.',
      chemicalRemedy:
        parsed.chemicalRemedy ||
        'يُرجى عدم الرش الكيميائي قبل تأكيد التشخيص؛ وعند الضرورة يُستخدم المبيد المتخصص المسجل وفق الجرعة وفترة الأمان (PHI).',
      preventionTips: Array.isArray(parsed.preventionTips) ? parsed.preventionTips.slice(0, 8) : [],
      severity,
      omaniFarmingNote:
        parsed.omaniFarmingNote ||
        `راعِ ظروف الحرارة والرطوبة في ${wilayat || 'سلطنة عُمان'} وتجنب الري وقت اشتداد الشمس.`,
      advisoryNote: MANDATORY_ADVISORY,
      photoParts: normalizedImages.map((img) => img.part),
    };

    return res.json({ success: true, diagnosis: normalizedDiagnosis });
  } catch (error: any) {
    console.error('Plant diagnosis error:', error);
    return res.status(500).json({
      error: 'تعذر إتمام التشخيص الذكي حالياً. يرجى التأكد من وضوح الصور وتوافر الاتصال بالإنترنت.',
      details: error.message,
    });
  }
});

// --- 4. AI Pest Diagnosis API ---
app.post('/api/diagnose/pest', async (req, res) => {
  try {
    const { imageBase64, hostCrop, pestDescription, wilayat } = req.body;

    const systemInstruction = `أنت عالم حشرات وخبير مكافحة آفات زراعية معتمد في سلطنة عُمان.
قم بتشخيص الآفة الحشرية وقدم إرشادات المكافحة المتكاملة (IPM) بصيغة JSON التالية حصراً:
{
  "pestName": "اسم الحشرة أو الآفة الشائع",
  "scientificName": "الاسم العلمي اللاتيني",
  "severityLevel": "شديد الخطورة | متوسط الخطورة | قليل الضرر",
  "affectedParts": ["الجذع", "السعف", "الثمار"],
  "confidenceScore": 90,
  "lifeCycleNote": "معلومة هامة عن دورة حياتها وأوقات نشاطها في مناخ عُمان",
  "organicAndBiologicalControl": "طرق المكافحة الحيوية والأعداء الطبيعية (كخنافس أبو العيد والمصائد الفيرمونية)",
  "safeChemicalOptions": "المبيدات المتخصصة المعتمدة مع تحذير إلزامي لحماية نحل العسل وفترة التحريم (PHI)",
  "immediateAction": "الخطوة العاجلة الواجب اتخاذها اليوم لحصار الإصابة",
  "officialDisclaimer": "تنبيه إرشادي: التشخيص الذكي استرشادي احتمالي. يُرجى مراجعة دوائر التنمية الزراعية الميدانية لفحص العينات الحقلية والالتزام بالملصق المعتمد.",
  "omaniGuidance": "توجيهات وزارة الثروة الزراعية ومواعيد الرش المعتمدة"
}`;

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `المحصول العائل: ${hostCrop || 'نخيل / خضار / فاكهة'}
المحافظة في سلطنة عُمان: ${wilayat || 'سلطنة عمان'}
الوصف والأعراض: ${pestDescription || 'شخص نوع الآفة ومستوى خطورتها مع تحديد نسبة الثقة'}`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, diagnosis: parsed });
  } catch (error: any) {
    console.error('Pest diagnosis error:', error);
    return res.status(500).json({ 
      error: 'تعذر تشخيص الآفة الحشرية حالياً.',
      details: error.message 
    });
  }
});

// --- 5. AI Quiz Generator & Server-side Verified Score Submission (Anti-Cheat) ---
const aiQuizBank = new Map<string, Question>();

app.post('/api/games/generate-questions', async (req, res) => {
  try {
    const { gameType, difficulty, topicFocus } = req.body;
    const validType = [
      'knowledge',
      'guess_crop',
      'plant_doctor',
      'true_false',
      'speed',
      'cultural',
    ].includes(gameType)
      ? gameType
      : 'knowledge';
    const validDiff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const cleanFocus = typeof topicFocus === 'string' ? topicFocus.trim().slice(0, 120) : '';

    const gameDescriptions: Record<string, string> = {
      knowledge: 'تحدي المعرفة الزراعية: أسئلة علمية وعملية عن الزراعة العمانية والري والتسميد والمحاصيل',
      guess_crop: 'اكتشف المحصول: تلميحات ووصف لمحاصيل وتمور وفواكه عمانية (الخلاص، الفرض، الخنيزي، الرمان، الليمون العماني...)',
      plant_doctor: 'الطبيب الزراعي: تشخيص أعراض أمراض وآفات النباتات وطرق الوقاية العضوية والآمنة',
      true_false: 'صح أم خطأ: عبارات زراعية وبيئية وتراثية دقيقة يُجاب عنها بـ صح أو خطأ فقط',
      speed: 'تحدي السرعة: أسئلة سريعة وذكية في الزراعة والمياه والأفلاج',
      cultural: 'المسابقة الثقافية العمانية: تاريخ سلطنة عمان، الأفلاج، القلاع، المعالم، والتراث الزراعي العماني',
    };

    const diffLabel: Record<string, string> = {
      easy: 'مبتدئ (مباشر وواضح)',
      medium: 'متوسط (يتطلب معرفة وتفكيراً)',
      hard: 'خبير (معلومات تخصصية دقيقة)',
    };

    const pointsPerQ = validDiff === 'hard' ? 85 : validDiff === 'medium' ? 60 : 40;
    const isTrueFalse = validType === 'true_false';

    const systemInstruction = `أنت معد مسابقات زراعية وثقافية عُمانية محترف في تطبيق «صديق المزارع».
مهمتك: توليد 5 أسئلة جديدة، دقيقة علمياً، غير مكررة، ومناسبة للمزارع والقارئ في سلطنة عُمان.
التزم بالقواعد التالية:
- أرجع JSON فقط مطابقاً للمخطط.
- في نمط true_false يجب أن تكون options تحتوي خيارين فقط هما ["صح", "خطأ"] ويكون correctIndex إما 0 أو 1.
- في باقي الأنماط يجب أن تكون options أربعة خيارات واضحة ومميزة (طول متقارب، بدون إجابة واضحة بشكل ساذج) ويكون correctIndex من 0 إلى 3.
- أضف لكل سؤال تلميحاً (hint) يساعد اللاعب دون أن يكشف الإجابة مباشرة، وشرحاً علمياً مختصراً (explanation).`;

    const prompt = `أنشئ 5 أسئلة جديدة باللغة العربية للنمط التالي:
- نوع اللعبة: ${gameDescriptions[validType]}
- مستوى الصعوبة: ${diffLabel[validDiff]}
${cleanFocus ? `- محور إضافي مطلوب: ${cleanFocus}` : ''}
تنوع في الأفكار واجعل الأسئلة مشوقة وموثوقة علمياً.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [{ text: prompt }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER },
                  hint: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctIndex', 'hint', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const rawList = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : [];

    if (rawList.length === 0) {
      throw new Error('لم تُولد أسئلة كافية');
    }

    const formattedQuestions = rawList.map((item: any, idx: number) => {
      const opts = Array.isArray(item.options) ? item.options.map(String) : [];
      const finalOpts = isTrueFalse
        ? ['صح', 'خطأ']
        : opts.length >= 4
          ? opts.slice(0, 4)
          : [...opts, 'خيار آخر', 'لا ينطبق', 'جميع ما سبق'].slice(0, 4);

      const safeCorrect = isTrueFalse
        ? item.correctIndex === 1
          ? 1
          : 0
        : Math.max(0, Math.min(3, Number(item.correctIndex) || 0));

      const qObj: Question & { hint?: string; difficulty?: string } = {
        id: `aiq-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        gameType: validType,
        question: String(item.question || 'سؤال زراعي'),
        options: finalOpts,
        correctIndex: safeCorrect,
        explanation: String(item.explanation || 'إجابة معتمدة وفق الإرشاد الزراعي العماني.'),
        points: pointsPerQ,
        hint: String(item.hint || 'تذكر أساسيات البيئة الزراعية العُمانية.'),
        difficulty: validDiff,
      };

      if (aiQuizBank.size >= 500) {
        const oldestKey = aiQuizBank.keys().next().value;
        if (oldestKey) aiQuizBank.delete(oldestKey);
      }
      aiQuizBank.set(qObj.id, qObj);

      return qObj;
    });

    return res.json({
      success: true,
      source: 'gemini',
      questions: formattedQuestions,
    });
  } catch (error: any) {
    console.warn('AI Quiz generation fallback:', error?.message);
    const fallback = storage.questions
      .filter((q) => !req.body?.gameType || q.gameType === req.body.gameType)
      .slice(0, 5);
    const finalFallback = fallback.length > 0 ? fallback : storage.questions.slice(0, 5);
    return res.json({
      success: true,
      source: 'bank',
      questions: finalFallback,
    });
  }
});

app.post('/api/scores/submit', (req, res) => {
  try {
    const { 
      userId, 
      userName, 
      userGovernorate, 
      gameType, 
      answers, 
      clientNonce 
    } = req.body;

    if (!userId || !userName || !answers || !Array.isArray(answers) || !clientNonce) {
      return res.status(400).json({ error: 'بيانات المشاركة غير مكتملة' });
    }

    // Anti-cheat replay check
    if (submittedNonces.has(clientNonce)) {
      return res.status(409).json({ error: 'تم تسجيل نتيجة هذه الجلسة مسبقاً لمنع التكرار والتلاعب.' });
    }
    submittedNonces.add(clientNonce);

    let verifiedScore = 0;
    let correctCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let streakBonus = 0;

    for (const ans of answers) {
      const q =
        aiQuizBank.get(ans.questionId) ||
        storage.questions.find(item => item.id === ans.questionId);
      if (!q) continue;

      if (ans.selectedIndex === q.correctIndex) {
        correctCount++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        verifiedScore += q.points;

        if (currentStreak > 1) {
          const bonus = (currentStreak - 1) * 20;
          streakBonus += bonus;
          verifiedScore += bonus;
        }

        if (typeof ans.timeTakenSec === 'number' && ans.timeTakenSec > 0 && ans.timeTakenSec < 8) {
          verifiedScore += 15;
        }
      } else {
        currentStreak = 0;
      }
    }

    // Cap single-round verified score to 1200 to align with Firestore anti-cheat delta cap
    verifiedScore = Math.min(1200, verifiedScore);

    const submission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName: userName.trim() || 'مزارع عُماني',
      userGovernorate: userGovernorate || 'سلطنة عُمان',
      gameType: gameType || 'all',
      score: verifiedScore,
      correctCount,
      totalQuestions: answers.length,
      streakBonus,
      bestStreak: maxStreak,
      timestamp: Date.now(),
      clientNonce
    };

    storage.scoreSubmissions.push(submission);
    saveStorage();

    return res.json({
      success: true,
      verifiedScore,
      correctCount,
      totalQuestions: answers.length,
      streakBonus,
      bestStreak: maxStreak,
      submissionId: submission.id
    });
  } catch (error: any) {
    console.error('Score submit error:', error);
    return res.status(500).json({ error: 'حدث خطأ في الخادم أثناء اعتماد النقاط.' });
  }
});

// --- 6. Leaderboard API ---
app.get('/api/scores/leaderboard', (_req, res) => {
  const now = Date.now();
  const dayMs = 86400000;
  const weekMs = dayMs * 7;
  const monthMs = dayMs * 30;

  const aggregateScores = (filterFn: (s: any) => boolean) => {
    const map = new Map<string, { userId: string; userName: string; governorate: string; totalScore: number; participations: number }>();

    for (const sub of storage.scoreSubmissions) {
      if (filterFn(sub)) {
        const existing = map.get(sub.userId) || {
          userId: sub.userId,
          userName: sub.userName,
          governorate: sub.userGovernorate,
          totalScore: 0,
          participations: 0
        };
        existing.totalScore += sub.score;
        existing.participations += 1;
        map.set(sub.userId, existing);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 25)
      .map((user, idx) => ({
        rank: idx + 1,
        ...user
      }));
  };

  return res.json({
    daily: aggregateScores(s => now - s.timestamp <= dayMs),
    weekly: aggregateScores(s => now - s.timestamp <= weekMs),
    monthly: aggregateScores(s => now - s.timestamp <= monthMs),
    allTime: aggregateScores(() => true),
    totalSubmissions: storage.scoreSubmissions.length
  });
});

// --- 7. Agricultural Library APIs ---
app.get('/api/library/books', (req, res) => {
  const { category, search } = req.query;
  let results = [...storage.books];

  if (category && category !== 'الكل') {
    results = results.filter(b => b.category === category);
  }

  if (search) {
    const term = String(search).toLowerCase();
    results = results.filter(b => 
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.description.toLowerCase().includes(term)
    );
  }

  return res.json({ success: true, books: results });
});

app.post('/api/library/books/:id/read', (req, res) => {
  const book = storage.books.find(b => b.id === req.params.id);
  if (book) {
    book.readCount += 1;
    saveStorage();
    return res.json({ success: true, readCount: book.readCount });
  }
  return res.status(404).json({ error: 'الكتاب غير موجود' });
});

app.post('/api/library/books', requireAdmin, (req, res) => {
  const { title, author, category, description, pages } = req.body;
  if (!title || !author || !category) {
    return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
  }

  const newBook: Book = {
    id: `book-${Date.now()}`,
    title,
    author,
    category,
    description: description || '',
    readCount: 0,
    publishedYear: new Date().getFullYear().toString(),
    pagesCount: Array.isArray(pages) ? pages.length : 1,
    isPublished: true,
    pages: Array.isArray(pages) && pages.length > 0 ? pages : [
      { pageNumber: 1, title: 'المقدمة والباب الأول', content: description || 'محتوى الكتاب تحت الإعداد والمراجعة.' }
    ]
  };

  storage.books.unshift(newBook);
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "إضافة كتاب جديد للمكتبة",
    performedBy: "عمر الشرجي",
    details: `إضافة كتاب: ${title}`,
    timestamp: Date.now()
  });
  saveStorage();

  return res.json({ success: true, book: newBook });
});

app.delete('/api/library/books/:id', requireAdmin, (req, res) => {
  const index = storage.books.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'الكتاب غير موجود' });

  const removed = storage.books.splice(index, 1)[0];
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "حذف كتاب من المكتبة",
    performedBy: "عمر الشرجي",
    details: `حذف كتاب: ${removed.title}`,
    timestamp: Date.now()
  });
  saveStorage();

  return res.json({ success: true, message: 'تم حذف الكتاب بنجاح' });
});

// --- 8. Community Forum & Chat APIs (with Banned-Word Censoring & Staff Moderation) ---
app.get('/api/community/posts', (_req, res) => {
  return res.json({ success: true, posts: storage.communityPosts });
});

app.post('/api/community/posts', (req, res) => {
  const { authorName, authorRole, authorGovernorate, cropCategory, content } = req.body;
  if (!content || !authorName) {
    return res.status(400).json({ error: 'يرجى كتابة محتوى المنشور واسم الكاتب' });
  }

  const censoredContent = censorText(String(content).trim().slice(0, 2500), storage.bannedWords);
  const censoredAuthor = censorText(String(authorName).trim().slice(0, 80), storage.bannedWords);

  const newPost = {
    id: `post-${Date.now()}`,
    authorName: censoredAuthor,
    authorRole: authorRole || 'مزارع',
    authorGovernorate: authorGovernorate || 'سلطنة عُمان',
    cropCategory: cropCategory || 'عام',
    content: censoredContent,
    timestamp: Date.now(),
    likes: 0,
    likedBy: [],
    comments: []
  };

  storage.communityPosts.unshift(newPost);
  saveStorage();

  return res.json({ success: true, post: newPost });
});

app.post('/api/community/posts/:id/like', (req, res) => {
  const { userId } = req.body;
  const post = storage.communityPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'المنشور غير موجود' });

  const alreadyLiked = post.likedBy.includes(userId);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter((id: string) => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }
  saveStorage();

  return res.json({ success: true, likes: post.likes, hasLiked: !alreadyLiked });
});

app.post('/api/community/posts/:id/comment', (req, res) => {
  const { authorName, authorRole, comment } = req.body;
  if (!comment || !String(comment).trim()) return res.status(400).json({ error: 'يرجى كتابة الرد' });

  const post = storage.communityPosts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'المنشور غير موجود' });

  const censoredComment = censorText(String(comment).trim().slice(0, 1200), storage.bannedWords);
  const censoredAuthor = censorText(String(authorName || 'مزارع عماني').trim().slice(0, 80), storage.bannedWords);

  const newComment = {
    id: `comm-${Date.now()}`,
    authorName: censoredAuthor,
    authorRole: authorRole || 'مزارع',
    comment: censoredComment,
    timestamp: Date.now()
  };

  post.comments.push(newComment);
  saveStorage();

  return res.json({ success: true, comment: newComment });
});

// Delete post (Admin or active Moderator)
app.delete('/api/community/posts/:id', requireStaff, (req: AuthenticatedRequest, res) => {
  const idx = storage.communityPosts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'المنشور غير موجود' });

  const removed = storage.communityPosts.splice(idx, 1)[0];
  const now = Date.now();
  const actor = req.staffSession!;
  const preview = `${removed.authorName}: ${String(removed.content || '').slice(0, 90)}`;

  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.role,
    actionType: 'حذف منشور',
    targetType: 'منشور مجتمعي',
    targetId: removed.id,
    targetPreview: preview,
    timestamp: now,
  });
  storage.auditLogs.unshift({
    id: `aud-${now}`,
    action: 'حذف منشور في المجتمع',
    performedBy: `${actor.actorName} (${actor.role === 'admin' ? 'مدير' : 'مشرف'})`,
    details: preview,
    timestamp: now,
  });
  saveStorage();

  return res.json({ success: true, deletedPostId: removed.id });
});

// Delete comment / chat message (Admin or active Moderator)
app.delete('/api/community/posts/:postId/comments/:commentId', requireStaff, (req: AuthenticatedRequest, res) => {
  const post = storage.communityPosts.find((p) => p.id === req.params.postId);
  if (!post) return res.status(404).json({ error: 'المنشور غير موجود' });

  const cIdx = (post.comments || []).findIndex((c: any) => c.id === req.params.commentId);
  if (cIdx === -1) return res.status(404).json({ error: 'التعليق أو رسالة الدردشة غير موجودة' });

  const removed = post.comments.splice(cIdx, 1)[0];
  const now = Date.now();
  const actor = req.staffSession!;
  const preview = `${removed.authorName}: ${String(removed.comment || '').slice(0, 90)}`;

  storage.moderationLogs.unshift({
    id: `mlog-${now}`,
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.role,
    actionType: 'حذف رسالة دردشة / تعليق',
    targetType: 'تعليق / رسالة',
    targetId: removed.id,
    targetPreview: preview,
    timestamp: now,
  });
  storage.auditLogs.unshift({
    id: `aud-${now}`,
    action: 'حذف تعليق / رسالة دردشة',
    performedBy: `${actor.actorName} (${actor.role === 'admin' ? 'مدير' : 'مشرف'})`,
    details: preview,
    timestamp: now,
  });
  saveStorage();

  return res.json({ success: true, deletedCommentId: removed.id });
});

// --- 9. Notifications APIs ---
app.get('/api/notifications', (_req, res) => {
  return res.json({ success: true, notifications: storage.notifications });
});

app.post('/api/admin/broadcast-alert', requireAdmin, (req, res) => {
  const { title, message, type, targetGovernorate, senderName } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'العنوان ومحتوى التنبيه مطلوبان' });
  }

  const alert = {
    id: `notif-${Date.now()}`,
    title,
    message,
    type: type || 'system',
    targetGovernorate: targetGovernorate || 'كافة المحافظات',
    timestamp: Date.now(),
    read: false
  };

  storage.notifications.unshift(alert);
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "بث تنبيه زراعي رسمي",
    performedBy: senderName || "عمر الشرجي (المدير العام)",
    details: `بث تنبيه: ${title} إلى ${alert.targetGovernorate}`,
    timestamp: Date.now()
  });
  saveStorage();

  return res.json({ success: true, notification: alert });
});

// --- 10. Radio Stations Management APIs ---
app.get('/api/radio/stations', (_req, res) => {
  return res.json({ success: true, stations: storage.radioStations });
});

app.put('/api/radio/stations/:id', requireAdmin, (req, res) => {
  const index = storage.radioStations.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'الإذاعة غير موجودة' });

  storage.radioStations[index] = {
    ...storage.radioStations[index],
    ...req.body,
    id: req.params.id
  };
  saveStorage();

  return res.json({ success: true, station: storage.radioStations[index] });
});

// --- 11. Admin Questions APIs ---
app.get('/api/admin/questions', (_req, res) => {
  return res.json({ success: true, questions: storage.questions });
});

app.post('/api/admin/questions', requireAdmin, (req, res) => {
  const { gameType, question, options, correctIndex, explanation, points } = req.body;
  if (!question || !options || options.length < 2 || correctIndex === undefined) {
    return res.status(400).json({ error: 'بيانات السؤال غير مكتملة' });
  }

  const newQuestion: Question = {
    id: `q-${Date.now()}`,
    gameType: gameType || 'knowledge',
    question,
    options,
    correctIndex: Number(correctIndex),
    explanation: explanation || '',
    points: Number(points) || 100
  };

  storage.questions.unshift(newQuestion);
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "إضافة سؤال مسابقة",
    performedBy: "عمر الشرجي",
    details: `إضافة سؤال لنوع: ${gameType}`,
    timestamp: Date.now()
  });
  saveStorage();

  return res.json({ success: true, question: newQuestion });
});

// --- 12. Admin Stats & Audit Logs (Protected by Staff Auth) ---
app.get('/api/admin/audit-logs', requireStaff, (_req, res) => {
  return res.json({ success: true, logs: storage.auditLogs });
});

app.get('/api/admin/stats', requireStaff, (_req, res) => {
  const now = Date.now();
  const activeCutoff = now - 5 * 60 * 1000;
  const allVisitors = Object.values(storage.visitors);
  const todayKey = getMuscatDayKey(now);
  return res.json({
    success: true,
    stats: {
      totalSubmissions: storage.scoreSubmissions.length,
      totalBooks: storage.books.length,
      totalReads: storage.books.reduce((acc, b) => acc + (b.readCount || 0), 0),
      totalPosts: storage.communityPosts.length,
      totalQuestions: storage.questions.length,
      totalVirtualFarms: Object.keys(storage.virtualFarms).length,
      totalVisitors: allVisitors.length,
      todayVisitors: (storage.dailyVisitIds[todayKey] || []).length,
      activeVisitorsNow: allVisitors.filter((v) => v.lastSeenAt >= activeCutoff).length,
      activeModerators: storage.moderators.filter((m) => !m.isPaused).length,
      bannedWordsCount: storage.bannedWords.length,
      founderName: "عمر الشرجي",
      systemStatus: "يعمل بكفاءة عالية (Express Node.js + Firebase Firestore + PWA + Open-Meteo)"
    }
  });
});

// --- 13. Dynamic Islamic Seasonal Config APIs ---
app.get('/api/seasonal/config', (_req, res) => {
  return res.json({ success: true, config: storage.seasonalConfig });
});

app.put('/api/admin/seasonal-config', requireAdmin, (req, res) => {
  const {
    referenceCalendar,
    hijriOffsetDays,
    overrideOccasion,
    ramadanGreeting,
    eidFitrGreeting,
    eidAdhaGreeting,
    enableLanterns,
    enablePatterns,
    simulatedDateIso
  } = req.body;

  storage.seasonalConfig = {
    ...storage.seasonalConfig,
    ...(referenceCalendar ? { referenceCalendar } : {}),
    ...(typeof hijriOffsetDays === 'number' ? { hijriOffsetDays: Math.max(-3, Math.min(3, hijriOffsetDays)) } : {}),
    ...(overrideOccasion ? { overrideOccasion } : {}),
    ...(typeof ramadanGreeting === 'string' ? { ramadanGreeting: ramadanGreeting.slice(0, 200) } : {}),
    ...(typeof eidFitrGreeting === 'string' ? { eidFitrGreeting: eidFitrGreeting.slice(0, 200) } : {}),
    ...(typeof eidAdhaGreeting === 'string' ? { eidAdhaGreeting: eidAdhaGreeting.slice(0, 200) } : {}),
    ...(typeof enableLanterns === 'boolean' ? { enableLanterns } : {}),
    ...(typeof enablePatterns === 'boolean' ? { enablePatterns } : {}),
    simulatedDateIso: simulatedDateIso !== undefined ? simulatedDateIso : storage.seasonalConfig.simulatedDateIso
  };

  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "تحديث إعدادات المناسبات والتقويم الهجري",
    performedBy: "عمر الشرجي (المدير العام)",
    details: `التقويم: ${storage.seasonalConfig.referenceCalendar} | إزاحة الهلال: ${storage.seasonalConfig.hijriOffsetDays} يوم`,
    timestamp: Date.now()
  });
  saveStorage();

  return res.json({ success: true, config: storage.seasonalConfig });
});

// --- 14. «مزرعتي الافتراضية» Server-Authoritative 3D Farm Engine ---
function getMuscatDayKey(ts = Date.now()): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Muscat' });
}

function createInitialPlots(ownerId: string) {
  const plots = [];
  for (let i = 0; i < 9; i++) {
    const isGreenhouse = i >= 6; // Slots 6, 7, 8 are Greenhouse beds
    plots.push({
      id: `plot-${i}`,
      ownerId,
      plotIndex: i,
      isGreenhouse,
      isUnlocked: i < 4 || i === 6, // Start with 4 open plots + 1 greenhouse bed unlocked
      soilPrepared: i === 0 || i === 6,
      soilLeveled: i === 0 || i === 6,
      cropId: i === 0 ? 'omani_cucumber' : null,
      plantedAt: i === 0 ? Date.now() - 15000 : null,
      lastStageAdvanceAt: i === 0 ? Date.now() - 15000 : null,
      stageIndex: 0,
      moisture: 70,
      nutrients: 65,
      health: 95,
      weedsLevel: 0,
      pestType: null as string | null,
      pruned: false,
      blockedReason: null as string | null,
      harvestedCount: 0,
      lastActionTokens: {} as Record<string, number>,
      updatedAt: Date.now()
    });
  }
  return plots;
}

function getOrInitFarm(userId: string, userName?: string, governorate?: string) {
  let farm = storage.virtualFarms[userId];
  if (!farm) {
    const now = Date.now();
    farm = {
      ownerId: userId,
      ownerName: userName || 'مزارع عُماني',
      governorate: governorate || 'محافظة الداخلية',
      farmName: `مزرعة ${userName ? userName.split(' ')[0] : 'عُمان'} الافتراضية`,
      coins: 250,
      points: 50,
      weeklyPoints: 50,
      monthlyPoints: 50,
      xp: 0,
      level: 1,
      waterLiters: 200,
      maxWaterLiters: 300,
      sizeLevel: 1,
      greenhouseLevel: 1,
      greenhouseTemp: 26,
      greenhouseHumidity: 62,
      greenhouseIrrigationAuto: false,
      greenhouseVentilation: true,
      greenhouseShading: 30,
      inventory: {
        fert_organic: 2,
        fert_npk: 1,
        pest_neem: 2
      },
      plots: createInitialPlots(userId),
      achievements: [],
      logs: [
        {
          id: `flog-${now}`,
          actionType: 'init',
          description: 'تأسيس المزرعة الافتراضية ومنح البذور والأدوات الأولية مجاناً',
          pointsDelta: 50,
          coinsDelta: 250,
          timestamp: now
        }
      ],
      notifications: [
        {
          id: `fnotif-${now}`,
          title: 'أهلاً بك في مزرعتك الافتراضية!',
          message: 'ابدأ بحرث الأرض أو متابعة شتلة الخيار العُماني المزروعة في القطعة 1.',
          category: 'system',
          isRead: false,
          timestamp: now
        }
      ],
      notificationsEnabled: true,
      lastDailyLoginKey: '',
      dailyPointsEarned: 0,
      dailyPointsDateKey: getMuscatDayKey(now),
      farmDay: 1,
      lastDayAdvanceAt: now,
      seasonIndex: 0,
      seasonName: OMAN_FARM_SEASONS[0].seasonName,
      seasonHint: OMAN_FARM_SEASONS[0].seasonHint,
      ambientTemp: 25,
      falajTurnActive: true,
      falajCollectedDay: 0,
      dailyBookTip: SAMAIL_DAILY_BOOK_TIPS[0],
      lastSimulatedAt: now,
      createdAt: now,
      updatedAt: now
    };
    storage.virtualFarms[userId] = farm;
    saveStorage();
  } else {
    if (userName && userName !== 'مزارع عُماني') farm.ownerName = userName;
    if (governorate) farm.governorate = governorate;
    if (!farm.farmDay) farm.farmDay = 1;
    if (!farm.lastDayAdvanceAt) farm.lastDayAdvanceAt = Date.now();
    if (typeof farm.falajCollectedDay !== 'number') farm.falajCollectedDay = 0;
  }
  return farm;
}

function awardFarmPoints(farm: any, rawPoints: number, reason: string, actionType: string, coinsDelta = 0): number {
  const todayKey = getMuscatDayKey();
  if (farm.dailyPointsDateKey !== todayKey) {
    farm.dailyPointsDateKey = todayKey;
    farm.dailyPointsEarned = 0;
  }
  const cap = storage.pointRules.dailyCap || 350;
  const remainingCap = Math.max(0, cap - farm.dailyPointsEarned);
  const granted = Math.min(rawPoints, remainingCap);

  if (granted > 0) {
    farm.points += granted;
    farm.weeklyPoints = (farm.weeklyPoints || 0) + granted;
    farm.monthlyPoints = (farm.monthlyPoints || 0) + granted;
    farm.dailyPointsEarned += granted;
    farm.xp += granted * 2;
    farm.level = Math.max(1, Math.floor(farm.xp / 150) + 1);
  }
  if (coinsDelta !== 0) {
    farm.coins = Math.max(0, farm.coins + coinsDelta);
  }

  farm.logs.unshift({
    id: `flog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actionType,
    description: granted < rawPoints ? `${reason} (بلغت الحد اليومي للنقاط)` : reason,
    pointsDelta: granted,
    coinsDelta,
    timestamp: Date.now()
  });
  farm.logs = farm.logs.slice(0, 50);
  return granted;
}

function unlockAchievement(farm: any, achId: string) {
  if (farm.achievements.includes(achId)) return;
  const def = FARM_ACHIEVEMENTS.find(a => a.id === achId);
  if (!def) return;
  farm.achievements.push(achId);
  awardFarmPoints(farm, def.rewardPoints, `فتح إنجاز: ${def.titleAr}`, 'achievement');
  farm.notifications.unshift({
    id: `fnotif-${Date.now()}-${achId}`,
    title: `إنجاز جديد: ${def.icon} ${def.titleAr}`,
    message: `${def.description} (+${def.rewardPoints} نقطة)`,
    category: 'achievement',
    isRead: false,
    timestamp: Date.now()
  });
}

function syncFarmDayEnvironment(farm: any) {
  const dayNum = Math.max(1, Number(farm.farmDay || 1));
  const seasonIdx = Math.floor((dayNum - 1) / 5) % OMAN_FARM_SEASONS.length;
  const seasonDef = OMAN_FARM_SEASONS[seasonIdx];
  const tempSpread = (dayNum * 3) % Math.max(2, seasonDef.tempMax - seasonDef.tempMin);
  farm.seasonIndex = seasonIdx;
  farm.seasonName = seasonDef.seasonName;
  farm.seasonHint = seasonDef.seasonHint;
  farm.ambientTemp = seasonDef.tempMin + tempSpread;
  farm.falajTurnActive = dayNum % 3 === 1;
  farm.dailyBookTip = SAMAIL_DAILY_BOOK_TIPS[(dayNum - 1) % SAMAIL_DAILY_BOOK_TIPS.length];
  return seasonDef;
}

function recomputeFarmGrowth(farm: any) {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - (farm.lastSimulatedAt || now));
  const elapsedHours = elapsedMs / 3600000;

  // Automatic real-time simulated farm days (1 farm day every 60 seconds)
  const DAY_DURATION_MS = 60000;
  const lastDayAt = farm.lastDayAdvanceAt || now;
  const daysPassed = Math.floor(Math.max(0, now - lastDayAt) / DAY_DURATION_MS);
  if (daysPassed > 0) {
    farm.farmDay = (farm.farmDay || 1) + daysPassed;
    farm.lastDayAdvanceAt = lastDayAt + daysPassed * DAY_DURATION_MS;
  }
  const seasonDef = syncFarmDayEnvironment(farm);

  // Greenhouse environment dynamics (protected from harsh summer peaks)
  const shadeCool = (farm.greenhouseShading || 0) * 0.08;
  const ventCool = farm.greenhouseVentilation ? 5 : -6;
  const outdoorBase = farm.ambientTemp || 31;
  farm.greenhouseTemp = Math.round(Math.max(18, Math.min(42, outdoorBase - 2 - shadeCool - ventCool)));
  farm.greenhouseHumidity = Math.round(
    Math.max(30, Math.min(92, 58 + (farm.greenhouseIrrigationAuto ? 10 : 0) - (farm.greenhouseVentilation ? 8 : -14)))
  );

  for (const plot of farm.plots) {
    if (!plot.isUnlocked || !plot.cropId) continue;
    const crop = storage.virtualCrops.find(c => c.id === plot.cropId);
    if (!crop) continue;

    // 1. Deplete moisture & nutrients based on elapsed server time & seasonal evaporation
    if (elapsedHours > 0.002) {
      const ghFactor = plot.isGreenhouse ? 0.65 : seasonDef.evapMultiplier;
      plot.moisture = Math.max(5, Math.round((plot.moisture - crop.waterConsumptionRate * ghFactor * elapsedHours) * 10) / 10);
      plot.nutrients = Math.max(5, Math.round((plot.nutrients - crop.nutrientConsumptionRate * elapsedHours) * 10) / 10);

      // Greenhouse auto-irrigation if enabled and tank has water
      if (plot.isGreenhouse && farm.greenhouseIrrigationAuto && plot.moisture < 50 && farm.waterLiters >= 10) {
        farm.waterLiters -= 10;
        plot.moisture = Math.min(80, plot.moisture + 25);
      }

      // Weeds & pests simulation on elapsed time (using Samail book pest profiles)
      if (elapsedHours > 0.05 && plot.weedsLevel < 70) {
        plot.weedsLevel = Math.min(80, Math.round(plot.weedsLevel + elapsedHours * 12));
      }
      if (!plot.pestType && elapsedHours > 0.08 && (plot.moisture > 88 || plot.weedsLevel > 45 || (!plot.isGreenhouse && Math.random() < 0.15))) {
        if (Array.isArray(crop.bookPests) && crop.bookPests.length > 0) {
          plot.pestType = plot.moisture > 88 && crop.bookPests[1] ? crop.bookPests[1] : crop.bookPests[0];
        } else {
          plot.pestType = crop.id === 'faradh_palm'
            ? 'حشرة دوباس النخيل'
            : plot.moisture > 88
              ? 'البياض الدقيقي (رطوبة مفرطة)'
              : 'الذبابة البيضاء / حشرة المن';
        }
      }

      // Health penalty for extreme moisture/over-fertilization/pests
      let healthDelta = 0;
      if (plot.moisture < 20) healthDelta -= 8 * elapsedHours;
      if (plot.moisture > 92) healthDelta -= 10 * elapsedHours; // Root rot risk!
      if (plot.nutrients > 95) healthDelta -= 9 * elapsedHours; // Fertilizer burn!
      if (plot.pestType) healthDelta -= 6 * elapsedHours;
      if (plot.weedsLevel > 50) healthDelta -= 4 * elapsedHours;
      if (plot.isGreenhouse && farm.greenhouseTemp > 37) healthDelta -= 8 * elapsedHours;
      if (!plot.isGreenhouse && outdoorBase > crop.idealTempRange[1] + 2) healthDelta -= 3 * elapsedHours;
      if (healthDelta === 0 && plot.moisture >= 40 && plot.moisture <= 85 && plot.nutrients >= 35 && plot.nutrients <= 90) {
        healthDelta = 4 * elapsedHours;
      }
      plot.health = Math.max(15, Math.min(100, Math.round(plot.health + healthDelta)));
    }

    // 2. Real-time Server Stage Advancement with Requirements Gate
    let safetyLoops = 0;
    while (plot.stageIndex < crop.stages.length - 1 && safetyLoops < 6) {
      safetyLoops++;
      const currentStage = crop.stages[plot.stageIndex];
      const stageMs = currentStage.durationSec * 1000;
      const sinceStage = now - (plot.lastStageAdvanceAt || plot.plantedAt || now);

      if (sinceStage < stageMs) {
        plot.blockedReason = null;
        break;
      }

      // Check prerequisites before advancing!
      const unmet: string[] = [];
      if (plot.moisture < currentStage.minMoisture) unmet.push(`نقص الرطوبة (مطلوب ${currentStage.minMoisture}%+)`);
      if (plot.nutrients < currentStage.minNutrients) unmet.push(`نقص التغذية (مطلوب ${currentStage.minNutrients}%+)`);
      if (plot.health < currentStage.minHealth) unmet.push(`ضعف صحة النبات (مطلوب ${currentStage.minHealth}%+)`);
      if (plot.pestType) unmet.push(`وجود إصابة: ${plot.pestType}`);
      if (plot.weedsLevel >= 60) unmet.push('تراكم الأعشاب الضارة');

      if (unmet.length > 0) {
        plot.blockedReason = `توقف النمو عن الانتقال للمرحلة التالية بسبب: ${unmet.join('، ')}`;
        break;
      }

      // Advance stage!
      plot.stageIndex += 1;
      plot.lastStageAdvanceAt = (plot.lastStageAdvanceAt || now) + stageMs;
      plot.blockedReason = null;
      awardFarmPoints(farm, storage.pointRules.stageComplete, `اكتمال مرحلة «${crop.stages[plot.stageIndex].name}» لمحصول ${crop.nameAr}`, 'stage_complete');
      farm.notifications.unshift({
        id: `fnotif-${now}-${plot.id}-${plot.stageIndex}`,
        title: `تقدم نمو ${crop.nameAr}`,
        message: `انتقل المحصول في القطعة ${plot.plotIndex + 1} إلى مرحلة: ${crop.stages[plot.stageIndex].name}`,
        category: 'growth',
        isRead: false,
        timestamp: now
      });
    }

    plot.updatedAt = now;
  }

  if (farm.points >= 200) unlockAchievement(farm, 'oman_competitor');
  farm.notifications = farm.notifications.slice(0, 30);
  farm.lastSimulatedAt = now;
  farm.updatedAt = now;
  return farm;
}

app.get('/api/virtual-farm/crops', (_req, res) => {
  return res.json({ success: true, crops: storage.virtualCrops, shopItems: VIRTUAL_SHOP_ITEMS, achievements: FARM_ACHIEVEMENTS });
});

app.get('/api/virtual-farm/state', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  const userName = req.query.userName ? String(req.query.userName) : undefined;
  const governorate = req.query.governorate ? String(req.query.governorate) : undefined;

  if (!userId) return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
  if (storage.bannedUserIds.includes(userId)) {
    return res.status(403).json({ error: 'تم إيقاف هذا الحساب من المنافسات والمزرعة لمخالفة قواعد اللعب النزيه.' });
  }

  const farm = getOrInitFarm(userId, userName, governorate);
  recomputeFarmGrowth(farm);
  saveStorage();

  return res.json({
    success: true,
    serverTime: Date.now(),
    farm,
    crops: storage.virtualCrops,
    pointRules: storage.pointRules
  });
});

app.post('/api/virtual-farm/action', (req, res) => {
  const { userId, userName, governorate, action, plotId, payload } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'بيانات العملية غير مكتملة' });

  if (storage.bannedUserIds.includes(userId)) {
    return res.status(403).json({ error: 'الحساب موقوف إدارياً' });
  }

  // Reject client tampering attempts trying to send raw points or coins directly
  if (req.body.overridePoints !== undefined || req.body.overrideCoins !== undefined) {
    storage.farmReports.unshift({
      id: `rep-${Date.now()}`,
      reporterId: 'system-anticheat',
      targetUserId: userId,
      reason: 'محاولة تلاعب مباشرة بتعديل النقاط/العملات من الواجهة',
      status: 'open',
      timestamp: Date.now()
    });
    saveStorage();
    return res.status(403).json({ error: 'تم رصد محاولة تعديل غير مصرح بها للنقاط وحظرها.' });
  }

  const farm = getOrInitFarm(userId, userName, governorate);
  recomputeFarmGrowth(farm);
  const now = Date.now();
  let feedback = '';
  let warning: string | null = null;

  if (action === 'daily_login') {
    const todayKey = getMuscatDayKey(now);
    if (farm.lastDailyLoginKey === todayKey) {
      return res.status(409).json({ error: 'تم استلام مكافأة الدخول اليومي لهذا اليوم مسبقاً.' });
    }
    farm.lastDailyLoginKey = todayKey;
    const pts = awardFarmPoints(farm, storage.pointRules.dailyLogin, 'مكافأة الدخول اليومي للمزرعة الافتراضية', 'daily_login', 25);
    feedback = `تم منحك +${pts} نقطة و+25 عملة مزرعة لدخولك اليومي!`;
  } else if (action === 'collect_falaj') {
    if (!farm.falajTurnActive) {
      return res.status(400).json({ error: 'ليست نوبة الفلج لهذا اليوم بعد (تحل نوبة الفلج كل 3 أيام زراعية).' });
    }
    if (farm.falajCollectedDay === farm.farmDay) {
      return res.status(409).json({ error: 'تم استلام حصة نوبة الفلج لهذا اليوم مسبقاً.' });
    }
    farm.falajCollectedDay = farm.farmDay;
    farm.waterLiters = Math.min(farm.maxWaterLiters, farm.waterLiters + 120);
    const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `تعبئة حصة نوبة الفلج (+120 لتر) في اليوم ${farm.farmDay}`, 'falaj_turn');
    feedback = `وصلت نوبة الفلج! تمت تعبئة +120 لتر مياه عذبة في خزانك (+${pts} نقاط).`;
  } else if (action === 'advance_day') {
    const lastManualDay = farm.lastManualAdvanceAt || 0;
    if (now - lastManualDay < 4000) {
      return res.status(429).json({ error: 'تمهل قليلاً قبل الانتقال لليوم الزراعي التالي.' });
    }
    farm.lastManualAdvanceAt = now;
    farm.farmDay = (farm.farmDay || 1) + 1;
    farm.lastDayAdvanceAt = now;
    const seasonDef = syncFarmDayEnvironment(farm);
    // Simulate realistic daily soil & weed progression across planted plots
    for (const p of farm.plots) {
      if (!p.isUnlocked || !p.cropId) continue;
      const crop = storage.virtualCrops.find((c) => c.id === p.cropId);
      if (!crop) continue;
      const evap = p.isGreenhouse ? 5 : Math.round(crop.waterConsumptionRate * seasonDef.evapMultiplier * 1.15);
      p.moisture = Math.max(10, Math.round(p.moisture - evap));
      p.nutrients = Math.max(10, Math.round(p.nutrients - Math.max(4, Math.round(crop.nutrientConsumptionRate * 0.85))));
      p.weedsLevel = Math.min(80, Math.round((p.weedsLevel || 0) + 12));
      if (!p.pestType && (p.weedsLevel >= 40 || p.moisture > 88 || Math.random() < 0.22)) {
        p.pestType = Array.isArray(crop.bookPests) && crop.bookPests.length > 0
          ? crop.bookPests[Math.floor(Math.random() * crop.bookPests.length)]
          : 'الذبابة البيضاء / حشرة المن';
      }
      if (p.lastStageAdvanceAt) {
        p.lastStageAdvanceAt -= 18000; // Nudge growth 18s per simulated day while respecting care gates!
      }
    }
    feedback = `أصبحنا في اليوم الزراعي ${farm.farmDay} (${farm.seasonName} · ${farm.ambientTemp}°م)${farm.falajTurnActive ? ' — حان موعد نوبة الفلج!' : ''}`;
  } else if (action === 'toggle_notifications') {
    farm.notificationsEnabled = !farm.notificationsEnabled;
    feedback = farm.notificationsEnabled ? 'تم تفعيل إشعارات المزرعة' : 'تم إيقاف إشعارات المزرعة';
  } else if (action === 'mark_notifications_read') {
    farm.notifications.forEach((n: any) => { n.isRead = true; });
    feedback = 'تم تحديد جميع الإشعارات كمقروءة';
  } else if (action === 'greenhouse_control') {
    if (typeof payload?.ventilation === 'boolean') farm.greenhouseVentilation = payload.ventilation;
    if (typeof payload?.irrigationAuto === 'boolean') farm.greenhouseIrrigationAuto = payload.irrigationAuto;
    if (typeof payload?.shading === 'number') farm.greenhouseShading = Math.max(0, Math.min(80, payload.shading));
    recomputeFarmGrowth(farm);
    unlockAchievement(farm, 'smart_greenhouse');
    feedback = 'تم تحديث إعدادات التحكم المناخي للبيت المحمي بنجاح.';
  } else if (action === 'buy_item') {
    const itemId = payload?.itemId;
    const shopItem = VIRTUAL_SHOP_ITEMS.find(i => i.id === itemId);
    if (!shopItem) return res.status(404).json({ error: 'العنصر غير موجود في متجر المزرعة' });
    if (farm.coins < shopItem.costCoins) return res.status(400).json({ error: `رصيد العملات غير كافٍ (مطلوب ${shopItem.costCoins} عملة)` });

    if (shopItem.id === 'water_pack_100') {
      farm.coins -= shopItem.costCoins;
      farm.waterLiters = Math.min(farm.maxWaterLiters, farm.waterLiters + shopItem.effectValue);
      feedback = `تم تعبئة خزان المياه (+${shopItem.effectValue} لتر)`;
    } else if (shopItem.id === 'fert_organic' || shopItem.id === 'fert_npk' || shopItem.id === 'pest_neem') {
      farm.coins -= shopItem.costCoins;
      farm.inventory[shopItem.id] = (farm.inventory[shopItem.id] || 0) + shopItem.effectValue;
      feedback = `تم شراء ${shopItem.nameAr} وإضافته للمخزن`;
    } else if (shopItem.id === 'expand_plot') {
      const lockedPlot = farm.plots.find((p: any) => !p.isUnlocked && !p.isGreenhouse);
      if (!lockedPlot) return res.status(400).json({ error: 'تم فتح جميع قطع الحقل المكشوفة!' });
      farm.coins -= shopItem.costCoins;
      lockedPlot.isUnlocked = true;
      farm.sizeLevel += 1;
      feedback = `تم استصلاح القطعة رقم ${lockedPlot.plotIndex + 1} وتوسيع مزرعتك!`;
    } else if (shopItem.id === 'upgrade_greenhouse') {
      const lockedGh = farm.plots.find((p: any) => !p.isUnlocked && p.isGreenhouse);
      if (!lockedGh && farm.greenhouseLevel >= 4) return res.status(400).json({ error: 'البيت المحمي في أعلى مستوى تطوير!' });
      farm.coins -= shopItem.costCoins;
      farm.greenhouseLevel += 1;
      if (lockedGh) lockedGh.isUnlocked = true;
      unlockAchievement(farm, 'smart_greenhouse');
      feedback = `تم تطوير البيت المحمي إلى المستوى ${farm.greenhouseLevel} وتوسيعه!`;
    }
  } else {
    // Plot-level 10 Agricultural Operations
    const plot = farm.plots.find((p: any) => p.id === plotId);
    if (!plot) return res.status(404).json({ error: 'قطعة الأرض غير موجودة' });
    if (!plot.isUnlocked) return res.status(403).json({ error: 'هذه القطعة مقفلة، قم بتوسيع المزرعة أولاً.' });

    const lastTokenTime = plot.lastActionTokens?.[action] || 0;

    if (action === 'plow') {
      if (plot.cropId) return res.status(400).json({ error: 'لا يمكن حرث أرض مزروعة حالياً.' });
      if (plot.soilPrepared) return res.status(400).json({ error: 'التربة محروثة مسبقاً!' });
      plot.soilPrepared = true;
      plot.weedsLevel = 0;
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `حرث وتقليب التربة في القطعة ${plot.plotIndex + 1}`, 'plow');
      feedback = `تم حرث الأرض وتهوية التربة (+${pts} نقاط)`;
    } else if (action === 'level_soil') {
      if (plot.cropId) return res.status(400).json({ error: 'الأرض مزروعة حالياً.' });
      if (!plot.soilPrepared) return res.status(400).json({ error: 'يرجى حرث الأرض أولاً قبل التسوية.' });
      if (plot.soilLeveled) return res.status(400).json({ error: 'التربة مسواة وجاهزة للزراعة.' });
      plot.soilLeveled = true;
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `تسوية التربة وتجهيز خطوط الزراعة بالقطعة ${plot.plotIndex + 1}`, 'level_soil');
      feedback = `تمت تسوية التربة بنجاح (+${pts} نقاط)`;
    } else if (action === 'plant') {
      if (plot.cropId) return res.status(400).json({ error: 'يوجد محصول مزروع في هذه القطعة حالياً.' });
      if (!plot.soilPrepared || !plot.soilLeveled) {
        return res.status(400).json({ error: 'يجب حرث الأرض وتسويتها قبل وضع البذور أو الشتلات.' });
      }
      const cropId = payload?.cropId;
      const crop = storage.virtualCrops.find(c => c.id === cropId);
      if (!crop) return res.status(404).json({ error: 'المحصول غير موجود' });
      if (plot.isGreenhouse && !crop.greenhouseSuitable) {
        return res.status(400).json({ error: `محصول ${crop.nameAr} غير مناسب للبيوت المحمية، ازرعه في الحقل المكشوف.` });
      }
      if (farm.coins < crop.seedCostCoins) {
        return res.status(400).json({ error: `تحتاج ${crop.seedCostCoins} عملة لشراء بذور/شتلات ${crop.nameAr}.` });
      }
      farm.coins -= crop.seedCostCoins;
      plot.cropId = crop.id;
      plot.plantedAt = now;
      plot.lastStageAdvanceAt = now;
      plot.stageIndex = 0;
      plot.moisture = 65;
      plot.nutrients = 60;
      plot.health = 95;
      plot.weedsLevel = 0;
      plot.pestType = null;
      plot.pruned = false;
      plot.blockedReason = null;
      unlockAchievement(farm, 'first_plant');
      if (crop.id === 'faradh_palm') unlockAchievement(farm, 'green_thumb');
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `زراعة ${crop.nameAr} في القطعة ${plot.plotIndex + 1}`, 'plant');
      feedback = `تمت زراعة ${crop.nameAr} بنجاح! (+${pts} نقاط)`;
    } else if (action === 'irrigate') {
      if (!plot.cropId) return res.status(400).json({ error: 'ازرع المحصول أولاً قبل الري.' });
      if (farm.waterLiters < 15) return res.status(400).json({ error: 'خزان المياه منخفض، قم بتعبئة المياه من المتجر.' });
      farm.waterLiters -= 15;
      const prevMoisture = plot.moisture;
      plot.moisture = Math.min(100, Math.round(plot.moisture + 28));
      if (plot.moisture > 90) {
        plot.health = Math.max(20, plot.health - 12);
        warning = 'تنبيه تعليمي: الإفراط في الري (تغريق التربة >90%) يسبب اختناق الجذور وتناقص صحة النبات!';
      } else if (prevMoisture < 65 && now - lastTokenTime > 12000) {
        plot.lastActionTokens.irrigate = now;
        const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `ري متوازن للقطعة ${plot.plotIndex + 1}`, 'irrigate');
        feedback = `تم الري بنجاح (+${pts} نقاط)`;
      } else {
        feedback = 'تم الري، تذكر عدم تكرار الري على فترات متقاربة لحفظ صحة الجذور.';
      }
    } else if (action === 'fertilize') {
      if (!plot.cropId) return res.status(400).json({ error: 'لا يوجد محصول لتسميده.' });
      const fertType = payload?.fertType === 'fert_npk' ? 'fert_npk' : 'fert_organic';
      if ((farm.inventory[fertType] || 0) <= 0) {
        return res.status(400).json({ error: 'لا يتوفر هذا السماد في مخزنك، اشتره من المتجر بالعملات الافتراضية.' });
      }
      farm.inventory[fertType] -= 1;
      const prevNutrients = plot.nutrients;
      const boost = fertType === 'fert_npk' ? 35 : 25;
      plot.nutrients = Math.min(100, Math.round(plot.nutrients + boost));
      if (plot.nutrients > 94) {
        plot.health = Math.max(20, plot.health - 15);
        warning = 'تحذير تسميد: الإفراط في التسميد الكيميائي (>94%) أدى لحرق أطراف الجذور وتراجع صحة المحصول!';
      } else if (prevNutrients < 65 && now - lastTokenTime > 12000) {
        plot.lastActionTokens.fertilize = now;
        const pts = awardFarmPoints(farm, storage.pointRules.timelyFertilizer, `تسميد سليم في الموعد المناسب بالقطعة ${plot.plotIndex + 1}`, 'fertilize');
        feedback = `تمت إضافة السماد بنجاح (+${pts} نقطة)`;
      } else {
        feedback = 'تمت إضافة السماد، تجنب الإفراط عندما تكون العناصر كافية.';
      }
    } else if (action === 'weed') {
      if (plot.weedsLevel < 10) return res.status(400).json({ error: 'الأرض نظيفة من الأعشاب الضارة حالياً.' });
      plot.weedsLevel = 0;
      plot.health = Math.min(100, plot.health + 8);
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `إزالة الأعشاب الضارة في القطعة ${plot.plotIndex + 1}`, 'weed');
      feedback = `تم تعشيب الأرض وإزالة المنافسة على الغذاء (+${pts} نقاط)`;
    } else if (action === 'prune') {
      if (!plot.cropId) return res.status(400).json({ error: 'لا يوجد نبات للتقليم.' });
      if (plot.pruned) return res.status(400).json({ error: 'تم تقليم النبات في هذه المرحلة مسبقاً.' });
      plot.pruned = true;
      plot.health = Math.min(100, plot.health + 10);
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `تقليم الأفرع/السعف اليابس في القطعة ${plot.plotIndex + 1}`, 'prune');
      feedback = `تم التقليم لتحسين التهوية والإضاءة (+${pts} نقاط)`;
    } else if (action === 'pest_control') {
      if (!plot.pestType) return res.status(400).json({ error: 'لا توجد إصابة حشرية أو فطرية بهذه القطعة.' });
      if ((farm.inventory.pest_neem || 0) <= 0) {
        return res.status(400).json({ error: 'تحتاج إلى مستخلص النيم والمكافحة الحيوية من متجر المزرعة.' });
      }
      farm.inventory.pest_neem -= 1;
      const curedPest = plot.pestType;
      plot.pestType = null;
      plot.health = Math.min(100, plot.health + 18);
      unlockAchievement(farm, 'pest_doctor');
      const pts = awardFarmPoints(farm, storage.pointRules.pestCure, `تشخيص ومعالجة «${curedPest}» بأمان حيوي`, 'pest_control');
      feedback = `تمت معالجة ${curedPest} بنجاح وحماية النحل (+${pts} نقطة)`;
    } else if (action === 'harvest') {
      if (!plot.cropId) return res.status(400).json({ error: 'لا يوجد محصول للحصاد.' });
      const crop = storage.virtualCrops.find(c => c.id === plot.cropId);
      if (!crop) return res.status(404).json({ error: 'المحصول غير موجود' });
      if (plot.stageIndex < crop.stages.length - 1) {
        return res.status(400).json({ error: 'لم يصل المحصول إلى مرحلة النضج والحصاد بعد!' });
      }
      const qualityBonus = plot.health >= 85 ? 25 : 0;
      const earnedCoins = crop.harvestCoins + qualityBonus;
      const pts = awardFarmPoints(farm, crop.harvestPoints || storage.pointRules.harvest, `حصاد محصول ${crop.nameAr} بجودة ${plot.health}%`, 'harvest', earnedCoins);
      unlockAchievement(farm, 'first_harvest');
      plot.cropId = null;
      plot.plantedAt = null;
      plot.lastStageAdvanceAt = null;
      plot.stageIndex = 0;
      plot.soilPrepared = false;
      plot.soilLeveled = false;
      plot.pruned = false;
      plot.blockedReason = null;
      plot.harvestedCount += 1;
      feedback = `مبارك الحصاد! كسبت +${earnedCoins} عملة و+${pts} نقطة معتمدة!`;
    } else if (action === 'clear_reset') {
      plot.cropId = null;
      plot.plantedAt = null;
      plot.lastStageAdvanceAt = null;
      plot.stageIndex = 0;
      plot.soilPrepared = false;
      plot.soilLeveled = false;
      plot.weedsLevel = 0;
      plot.pestType = null;
      plot.pruned = false;
      plot.moisture = 50;
      plot.nutrients = 50;
      plot.health = 100;
      plot.blockedReason = null;
      const pts = awardFarmPoints(farm, storage.pointRules.farmAction, `تنظيف وتهيئة القطعة ${plot.plotIndex + 1} لدورة زراعية جديدة`, 'clear_reset');
      feedback = `تم تنظيف الأرض وتجهيزها للزراعة الجديدة (+${pts} نقاط)`;
    } else {
      return res.status(400).json({ error: 'عملية زراعية غير معروفة' });
    }
  }

  recomputeFarmGrowth(farm);
  saveStorage();

  return res.json({
    success: true,
    serverTime: now,
    farm,
    feedback,
    warning
  });
});

app.post('/api/virtual-farm/advisor', async (req, res) => {
  try {
    const { cropName, stageName, moisture, nutrients, health, pestType, greenhouseTemp, userQuestion } = req.body;
    const systemInstruction = `أنت المستشار الزراعي الذكي داخل لعبة «مزرعتي الافتراضية» في تطبيق «صديق المزارع» بسلطنة عُمان (بإشراف عمر الشرجي).
قواعد صارمة:
1. قدم إرشادات تعليمية دقيقة وعملية باللغة العربية تتناسب مع مناخ عُمان.
2. لا توصِ أبداً بمبيدات عشوائية أو مواد كيميائية محظورة أو خطيرة؛ ركز على المكافحة الحيوية (مثل مستخلص النيم، المصائد الفرمونية، تهوية البيت المحمي، والري المتزن).
3. اشرح للمزارع ما يحتاجه المحصول في مرحلته الحالية وكيفية معالجة أي خلل في الرطوبة أو التغذية أو الآفة بأسلوب واضح ومشجع.`;

    const prompt = `المحصول: ${cropName || 'أرض قيد التجهيز'}
المرحلة الحالية: ${stageName || 'تجهيز التربة'}
الرطوبة: ${moisture ?? 60}% | التغذية: ${nutrients ?? 60}% | صحة النبات: ${health ?? 95}%
الإصابة الحالية: ${pestType || 'لا توجد'} | حرارة البيت المحمي: ${greenhouseTemp ?? 26}°م
سؤال المزارع: ${userQuestion || 'ما هي أفضل خطوة أعملها الآن لهذا المحصول؟'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
      config: { systemInstruction }
    });

    return res.json({ success: true, advice: response.text });
  } catch (err: any) {
    console.warn('Virtual Farm Advisor fallback:', err.message);
    return res.json({
      success: true,
      advice: 'تأكد من توازن رطوبة التربة بين 50% و75% دون إغراق، واستخدم السماد العضوي المتحلل أولاً، وإذا ظهرت أي آفة عالجها بمستخلص النيم الحيوي والتهوية الجيدة للبيت المحمي.'
    });
  }
});

app.get('/api/virtual-farm/social', (req, res) => {
  const userId = String(req.query.userId || '');
  // Public leaderboard only — NO PII (emails/phones)
  const leaderboard = Object.values(storage.virtualFarms)
    .filter((f: any) => !storage.bannedUserIds.includes(f.ownerId))
    .map((f: any) => ({
      userId: f.ownerId,
      name: f.ownerName,
      governorate: f.governorate,
      level: f.level,
      points: f.points,
      weeklyPoints: f.weeklyPoints || f.points,
      monthlyPoints: f.monthlyPoints || f.points,
      achievementsCount: (f.achievements || []).length
    }))
    .sort((a, b) => b.points - a.points);

  const friendships = storage.farmFriendships.filter(
    f => f.requesterId === userId || f.recipientId === userId
  );

  return res.json({
    success: true,
    leaderboard,
    friendships,
    competitions: storage.farmCompetitions.filter(c => c.isActive)
  });
});

app.post('/api/virtual-farm/social/invite', (req, res) => {
  const { userId, userName, action, targetUserId, friendshipId, reason } = req.body;
  if (!userId) return res.status(400).json({ error: 'معرف المستخدم مطلوب' });

  if (action === 'send_invite') {
    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: 'اختر لاعباً آخر لدعوته للمنافسة' });
    }
    const targetFarm = storage.virtualFarms[targetUserId];
    if (!targetFarm) return res.status(404).json({ error: 'اللاعب غير موجود' });

    const existing = storage.farmFriendships.find(
      f =>
        (f.requesterId === userId && f.recipientId === targetUserId) ||
        (f.requesterId === targetUserId && f.recipientId === userId)
    );
    if (existing) return res.status(409).json({ error: 'يوجد طلب صداقة/منافسة مسبقاً مع هذا اللاعب' });

    const invite = {
      id: `fr-${Date.now()}`,
      requesterId: userId,
      requesterName: userName || 'مزارع عُماني',
      recipientId: targetUserId,
      recipientName: targetFarm.ownerName,
      status: 'pending',
      createdAt: Date.now()
    };
    storage.farmFriendships.push(invite);
    targetFarm.notifications.unshift({
      id: `fnotif-${Date.now()}`,
      title: 'دعوة منافسة زراعية جديدة',
      message: `دعاك ${invite.requesterName} لمنافسة ودية في مزرعتي الافتراضية!`,
      category: 'competition',
      isRead: false,
      timestamp: Date.now()
    });
    saveStorage();
    return res.json({ success: true, invite });
  }

  if (action === 'respond_invite') {
    const fr = storage.farmFriendships.find(f => f.id === friendshipId);
    if (!fr || fr.recipientId !== userId) return res.status(404).json({ error: 'الدعوة غير موجودة' });
    fr.status = req.body.status === 'accepted' ? 'accepted' : 'declined';
    saveStorage();
    return res.json({ success: true, friendship: fr });
  }

  if (action === 'report_player') {
    storage.farmReports.unshift({
      id: `rep-${Date.now()}`,
      reporterId: userId,
      targetUserId: targetUserId || 'unknown',
      reason: String(reason || 'بلاغ مخالفة').slice(0, 200),
      status: 'open',
      timestamp: Date.now()
    });
    saveStorage();
    return res.json({ success: true, message: 'تم رفع البلاغ للإدارة للمراجعة.' });
  }

  return res.status(400).json({ error: 'إجراء غير مدعوم' });
});

// Admin endpoints for Virtual Farm
app.get('/api/admin/virtual-farm/overview', requireAdmin, (_req, res) => {
  const farms = Object.values(storage.virtualFarms).map((f: any) => ({
    ownerId: f.ownerId,
    ownerName: f.ownerName,
    governorate: f.governorate,
    level: f.level,
    points: f.points,
    coins: f.coins,
    isBanned: storage.bannedUserIds.includes(f.ownerId),
    plantedPlots: (f.plots || []).filter((p: any) => p.cropId).length
  }));
  return res.json({
    success: true,
    farms,
    crops: storage.virtualCrops,
    pointRules: storage.pointRules,
    competitions: storage.farmCompetitions,
    reports: storage.farmReports,
    bannedUserIds: storage.bannedUserIds
  });
});

app.post('/api/admin/virtual-farm/crops', requireAdmin, (req, res) => {
  const { nameAr, nameEn, category, seedCostCoins, harvestCoins, stageDurationSec, guideSummary } = req.body;
  if (!nameAr) return res.status(400).json({ error: 'اسم المحصول مطلوب' });

  const dur = Math.max(15, Number(stageDurationSec) || 35);
  const newCrop: VirtualCropDef = {
    id: `crop-${Date.now()}`,
    nameAr,
    nameEn: nameEn || nameAr,
    category: category || 'خضراوات',
    greenhouseSuitable: true,
    openFieldSuitable: true,
    seedCostCoins: Number(seedCostCoins) || 35,
    harvestCoins: Number(harvestCoins) || 120,
    harvestPoints: storage.pointRules.harvest,
    waterConsumptionRate: 7,
    nutrientConsumptionRate: 7,
    idealTempRange: [18, 34],
    omaniRegions: 'كافة محافظات سلطنة عُمان',
    preferredSeason: 'الموسم الزراعي المعتمد',
    colorHex: '#10b981',
    stages: [
      { name: 'الإنبات', durationSec: dur, minMoisture: 50, minNutrients: 30, minHealth: 50, visualScale: 0.32, description: 'بداية نمو البادرة.' },
      { name: 'النمو الخضري', durationSec: dur, minMoisture: 50, minNutrients: 45, minHealth: 55, visualScale: 0.56, description: 'تمدد الأوراق والسيقان.' },
      { name: 'التزهير والإثمار', durationSec: dur, minMoisture: 55, minNutrients: 55, minHealth: 60, visualScale: 0.82, description: 'تكون الأزهار وعقد الثمار.' },
      { name: 'جاهز للحصاد', durationSec: 0, minMoisture: 40, minNutrients: 35, minHealth: 60, visualScale: 1.0, description: 'محصول ناضج جاهز للحصاد.' }
    ],
    guide: {
      '1_landPrep': guideSummary || 'حراثة التربة وتسميدها بالسماد العضوي المتحلل.',
      '2_soilType': 'تربة طميية رملية جيدة الصرف.',
      '3_seedsOrSeedlings': 'بذور أو شتلات سليمة معتمدة.',
      '4_plantingMethod': 'زراعة في خطوط منتظمة مع مسافة تهوية مناسبة.',
      '5_irrigationNeeds': 'ري منتظم بالتنقيط صباحاً أو مساءً.',
      '6_fertilization': 'تسميد عضوي أساسي مع NPK متوازن حسب المرحلة.',
      '7_growthStagesSummary': 'إنبات ← نمو خضري ← تزهير وإثمار ← حصاد.',
      '8_diseasesAndPests': 'مراقبة البياض الدقيقي والحشرات الماصة.',
      '9_preventionAndControl': 'الوقاية الحيوية ومستخلص النيم والمصائد اللونية.',
      '10_harvestAndYield': 'الحصاد عند تمام النضج وفق الإرشادات الزراعية.'
    }
  };
  storage.virtualCrops.push(newCrop);
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: "إضافة محصول جديد في مزرعتي الافتراضية",
    performedBy: "عمر الشرجي (المدير العام)",
    details: `إضافة: ${nameAr}`,
    timestamp: Date.now()
  });
  saveStorage();
  return res.json({ success: true, crop: newCrop });
});

app.put('/api/admin/virtual-farm/crops/:id', requireAdmin, (req, res) => {
  const crop = storage.virtualCrops.find(c => c.id === req.params.id);
  if (!crop) return res.status(404).json({ error: 'المحصول غير موجود' });
  const { stageDurationSec, seedCostCoins, harvestCoins } = req.body;
  if (typeof seedCostCoins === 'number') crop.seedCostCoins = Math.max(5, seedCostCoins);
  if (typeof harvestCoins === 'number') crop.harvestCoins = Math.max(10, harvestCoins);
  if (typeof stageDurationSec === 'number' && stageDurationSec >= 10) {
    crop.stages.forEach((st, idx) => {
      if (idx < crop.stages.length - 1) st.durationSec = stageDurationSec;
    });
  }
  saveStorage();
  return res.json({ success: true, crop });
});

app.put('/api/admin/virtual-farm/point-rules', requireAdmin, (req, res) => {
  storage.pointRules = { ...storage.pointRules, ...req.body };
  saveStorage();
  return res.json({ success: true, pointRules: storage.pointRules });
});

app.post('/api/admin/virtual-farm/competitions', requireAdmin, (req, res) => {
  const { title, description, prizePoints, days } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان المسابقة مطلوب' });
  const comp = {
    id: `comp-${Date.now()}`,
    title,
    description: description || 'مسابقة زراعية معتمدة من إدارة صديق المزارع',
    prizePoints: Number(prizePoints) || 100,
    startDate: Date.now(),
    endDate: Date.now() + 86400000 * (Number(days) || 7),
    isActive: true
  };
  storage.farmCompetitions.unshift(comp);
  saveStorage();
  return res.json({ success: true, competition: comp });
});

app.post('/api/admin/virtual-farm/ban', requireAdmin, (req, res) => {
  const { targetUserId, ban, reportId } = req.body;
  if (targetUserId) {
    if (ban && !storage.bannedUserIds.includes(targetUserId)) {
      storage.bannedUserIds.push(targetUserId);
    } else if (!ban) {
      storage.bannedUserIds = storage.bannedUserIds.filter(id => id !== targetUserId);
    }
  }
  if (reportId) {
    const rep = storage.farmReports.find(r => r.id === reportId);
    if (rep) rep.status = 'resolved';
  }
  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: ban ? "حظر حساب مخالف في اللعبة" : "فك الحظر / إغلاق بلاغ",
    performedBy: "عمر الشرجي (المدير العام)",
    details: `المستخدم: ${targetUserId}`,
    timestamp: Date.now()
  });
  saveStorage();
  return res.json({ success: true, bannedUserIds: storage.bannedUserIds });
});

// --- Stage 2: Educational Cartoon Videos ("فليجان" - Flijan) ---
const cartoonTtsCache = new Map<string, string>();

app.post('/api/cartoon/tts', async (req, res) => {
  try {
    const { text, mood } = req.body;
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 800) : '';
    if (!cleanText) {
      return res.status(400).json({ error: 'النص المطلوب تحويله إلى صوت غير موجود.' });
    }

    const voiceMood = mood === 'warning' ? 'warning' : mood === 'curious' ? 'curious' : 'cheerful';
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${voiceMood}:${cleanText}`)
      .digest('hex');

    const cached = cartoonTtsCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, audioBase64: cached, mimeType: 'audio/wav', cached: true });
    }

    const styleMap: Record<string, string> = {
      cheerful: 'Warm, cheerful, friendly Arabic cartoon agricultural mascot speaking clearly for Omani farmers',
      curious: 'Expressive, engaging, educational Arabic narrator voice with warm curiosity',
      warning: 'Caring, attentive, clear Arabic guide voice emphasizing gentle agricultural caution',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: styleMap[voiceMood],
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'لم يرجع محرك الصوت بيانات صوتية صالحة.' });
    }

    if (cartoonTtsCache.size >= 60) {
      const oldestKey = cartoonTtsCache.keys().next().value;
      if (oldestKey) cartoonTtsCache.delete(oldestKey);
    }
    cartoonTtsCache.set(cacheKey, base64Audio);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      cached: false,
    });
  } catch (error: any) {
    console.error('Cartoon TTS error:', error);
    return res.status(500).json({
      error: 'تعذر توليد الصوت الكرتوني حالياً.',
      details: error.message,
    });
  }
});

app.post('/api/cartoon/generate-episode', async (req, res) => {
  try {
    const { topic } = req.body;
    const cleanTopic = typeof topic === 'string' ? topic.trim().slice(0, 200) : '';
    if (!cleanTopic) {
      return res.status(400).json({ error: 'يرجى كتابة موضوع الحلقة الزراعية المطلوبة.' });
    }

    const systemInstruction = `أنت كاتب سيناريو كرتوني زراعي محترف لبرنامج «فليجان صديق المزارع» في سلطنة عُمان.
اكتب حلقة توعوية من 4 مشاهد قصيرة ومترابطة باللغة العربية الفصحى المبسطة والدافئة، يشرح فيها فليجان للمزارع العُماني الفكرة بوضوح وبدون تعقيد.
التزم تماماً بإرجاع JSON صالح يطابق المخطط المطلوب فقط:
- كل مشهد له narration (جملتان إلى ثلاث جمل صوتية واضحة ومناسبة للنطق الصوتي السلس).
- subtitle مختصرة ومطابقة لمعنى المشهد للعرض أسفل الشاشة.
- backdrop من: oasis_falaj | palm_grove | greenhouse | sunny_field
- flijanPose من: wave | explain | inspect | celebrate | caution
- flijanMood من: happy | curious | warning | proud
- prop من: water_drop | palm_tree | magnifying_glass | bee | sun_shield | fertilizer_bag`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          text: `أنشئ حلقة كرتونية توعوية من 4 مشاهد للشخصية الكرتونية «فليجان» حول الموضوع التالي: ${cleanTopic}`,
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: [
                'الري والأفلاج',
                'وقاية النخيل',
                'مكافحة الآفات',
                'التسميد والتربة',
                'البيوت المحمية',
              ],
            },
            takeaway: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneHeading: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  backdrop: {
                    type: Type.STRING,
                    enum: ['oasis_falaj', 'palm_grove', 'greenhouse', 'sunny_field'],
                  },
                  flijanPose: {
                    type: Type.STRING,
                    enum: ['wave', 'explain', 'inspect', 'celebrate', 'caution'],
                  },
                  flijanMood: {
                    type: Type.STRING,
                    enum: ['happy', 'curious', 'warning', 'proud'],
                  },
                  prop: {
                    type: Type.STRING,
                    enum: [
                      'water_drop',
                      'palm_tree',
                      'magnifying_glass',
                      'bee',
                      'sun_shield',
                      'fertilizer_bag',
                    ],
                  },
                },
                required: [
                  'sceneHeading',
                  'narration',
                  'subtitle',
                  'backdrop',
                  'flijanPose',
                  'flijanMood',
                  'prop',
                ],
              },
            },
          },
          required: ['title', 'category', 'takeaway', 'scenes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 4) : [];
    if (scenes.length === 0) {
      return res.status(502).json({ error: 'تعذر توليد مشاهد الحلقة. حاول صياغة الموضوع بشكل أوضح.' });
    }

    const episode = {
      id: `ep-custom-${Date.now()}`,
      title: parsed.title || cleanTopic,
      category: parsed.category || 'مكافحة الآفات',
      durationLabel: '1:05 د',
      takeaway: parsed.takeaway || 'المتابعة المستمرة تحمي المحصول وتزيد الإنتاج.',
      isCustom: true,
      scenes: scenes.map((sc: any, idx: number) => ({
        id: `cs-${idx + 1}`,
        sceneHeading: sc.sceneHeading || `المشهد ${idx + 1}`,
        narration: sc.narration || cleanTopic,
        subtitle: sc.subtitle || sc.narration || cleanTopic,
        backdrop: sc.backdrop || 'oasis_falaj',
        flijanPose: sc.flijanPose || 'explain',
        flijanMood: sc.flijanMood || 'happy',
        prop: sc.prop || 'palm_tree',
      })),
    };

    return res.json({ success: true, episode });
  } catch (error: any) {
    console.error('Generate cartoon episode error:', error);
    return res.status(500).json({
      error: 'تعذر إنشاء الحلقة الكرتونية حالياً.',
      details: error.message,
    });
  }
});

// Vite Middleware Integration
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`صديق المزارع (الإصدار الاحترافي 2026) يعمل على المنفذ: http://localhost:${PORT}`);
  });
}

setupVite();
