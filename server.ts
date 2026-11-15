/**
 * Full-Stack Production Server for "صديق المزارع" (Farmer's Friend - Oman 2026)
 * Founder & Director: Omar Al-Sharji (عمر الشرجي) – Sultanate of Oman
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
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
  FARM_LIVESTOCK_DEFS,
  FARM_BUILDING_DEFS,
  FARM_QUEST_TEMPLATES,
  VirtualCropDef
} from './src/data/virtualFarmData.ts';
import { DEFAULT_SEASONAL_CONFIG, SeasonalConfig } from './src/utils/islamicCalendar.ts';
import { prepareArabicTextForTts } from './src/utils/arabicPronunciation.ts';
import { INITIAL_CARTOON_EPISODES } from './src/data/cartoonEpisodesData.ts';
import type { EpisodeQaReviewState } from './src/data/voiceEvaluationData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  next();
});

// Body parser
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Lightweight Sliding-Window Rate Limiter (Zero paid external dependencies)
const apiRateBuckets = new Map<string, number[]>();
function createRateLimiter(scope: string, maxRequests: number, windowMs: number, messageAr: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const ip = forwarded || req.ip || 'local';
    const key = `${scope}:${ip}`;
    const now = Date.now();
    const history = (apiRateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      return res.status(429).json({
        error: messageAr,
        retryAfterSec: Math.ceil((windowMs - (now - history[0])) / 1000),
      });
    }
    history.push(now);
    apiRateBuckets.set(key, history);
    next();
  };
}

const aiRateLimit = createRateLimiter(
  'ai',
  15,
  60 * 1000,
  'تم تجاوز الحد المسموح لطلبات الذكاء الاصطناعي حالياً؛ يرجى الانتظار دقيقة ثم المحاولة.'
);
const writeRateLimit = createRateLimiter(
  'write',
  20,
  60 * 1000,
  'تم إرسال طلبات كثيرة خلال وقت قصير؛ يرجى التمهل قليلاً.'
);

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

export interface SupportTicket {
  id: string;
  senderName: string;
  contact: string;
  message: string;
  governorate?: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
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
  supportTickets: SupportTicket[];
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
  cartoonQaReviews: Record<string, EpisodeQaReviewState>;
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
  supportTickets: [],
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
  },
  cartoonQaReviews: {}
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
      supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [],
      visitors: parsed.visitors && typeof parsed.visitors === 'object' ? parsed.visitors : {},
      dailyVisitIds: parsed.dailyVisitIds && typeof parsed.dailyVisitIds === 'object' ? parsed.dailyVisitIds : {},
      seasonalConfig: { ...DEFAULT_SEASONAL_CONFIG, ...(parsed.seasonalConfig || {}) },
      pointRules: { ...defaultStorage.pointRules, ...(parsed.pointRules || {}) },
      virtualCrops: Array.isArray(parsed.virtualCrops) && parsed.virtualCrops.length > 0 ? parsed.virtualCrops : [...VIRTUAL_CROPS],
      virtualFarms: parsed.virtualFarms || {},
      farmFriendships: parsed.farmFriendships || [],
      farmCompetitions: parsed.farmCompetitions || defaultStorage.farmCompetitions,
      farmReports: parsed.farmReports || [],
      bannedUserIds: parsed.bannedUserIds || [],
      cartoonQaReviews: parsed.cartoonQaReviews && typeof parsed.cartoonQaReviews === 'object' ? parsed.cartoonQaReviews : {}
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

// --- 3 & 4. Unified Smart Agricultural Diagnosis Engine (Plant Diseases, Deficiencies, Stress & Beneficial/Harmful Insects) ---
const smartDiagnosisCache = new Map<string, { expiresAt: number; diagnosis: any }>();
const SMART_CACHE_TTL_MS = 5 * 60 * 1000;
const SMART_CACHE_MAX_ITEMS = 80;

function extractAndValidateBase64Image(rawDataUrl: string): { mimeType: string; cleanBase64: string; byteLength: number } | null {
  if (typeof rawDataUrl !== 'string') return null;
  const trimmed = rawDataUrl.trim();
  if (trimmed.length < 64) return null;

  const mimeMatch = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp|heic|heif));base64,/i);
  if (!mimeMatch && trimmed.startsWith('data:')) {
    return null; // Unsupported non-image or SVG/script data URL
  }

  const mimeType = mimeMatch
    ? (mimeMatch[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeMatch[1].toLowerCase())
    : 'image/jpeg';
  const cleanBase64 = trimmed.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(cleanBase64)) {
    return null;
  }

  const byteLength = Math.floor((cleanBase64.length * 3) / 4);
  if (byteLength < 128 || byteLength > 10 * 1024 * 1024) {
    return null;
  }

  return { mimeType, cleanBase64, byteLength };
}

async function runUnifiedAgriVisionDiagnosis(params: {
  images: Array<{ label: string; mimeType: string; cleanBase64: string }>;
  cropName?: string;
  wilayat?: string;
  observations?: string;
  modeHint?: 'auto' | 'plant' | 'insect';
}) {
  const { images, cropName = '', wilayat = '', observations = '', modeHint = 'auto' } = params;

  const hash = crypto.createHash('sha256');
  images.forEach((img) => hash.update(img.cleanBase64));
  hash.update(`|${cropName}|${wilayat}|${observations}|${modeHint}`);
  const cacheKey = hash.digest('hex');

  const now = Date.now();
  const cached = smartDiagnosisCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { diagnosis: cached.diagnosis, fromCache: true };
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('خدمة التحليل الذكي غير مهيأة حالياً على الخادم.');
  }

  const MANDATORY_ADVISORY =
    'التشخيص عبر الصورة تقديري استرشادي ولا يغني عن الفحص الميداني لدى المهندس الزراعي أو دوائر التنمية الزراعية في الحالات الملتبسة أو الشديدة.';

  const systemInstruction = `أنت خبير زراعي دولي ومختص في أمراض النبات والحشرات الزراعية والتشخيص البصري في سلطنة عُمان (تطبيق صديق المزارع الذكي).
مهمتك تحليل صورة واحدة (أو أكثر إن وُجدت) لنبات أو ورقة أو ثمرة أو حشرة، وإخراج JSON دقيق يلتزم بالسلامة العلمية الكاملة والقوانين الزراعية في سلطنة عُمان.

المحاصيل المدعومة في سلطنة عُمان تشمل: أشجار النخيل، الخضروات، أشجار الفاكهة (الليمون العماني، المانجو، الرمان، الموز...)، المحاصيل الحقلية (القمح العماني، الشعير، الذرة...)، الأعلاف (القت/البرسيم)، النباتات الزينة، والمحاصيل الموسمية.

قواعد حاسمة لا تهاون فيها:
1. الفحص الأولي للصورة (الأهم):
   - حدد هل الصورة واضحة ومرتبطة فعلاً بالزراعة (نبات، ورقة، جذع، ثمرة، تربة مع أعراض، أو حشرة/آفة).
   - إذا كانت الصورة غير مرتبطة بالزراعة (مثل سيارة، أثاث، وجه، شاشة، ورقة فارغة) أو ضبابية جداً أو مظلمة بحيث تتعذر الرؤية:
     * اضبط isAgricultureRelated = false (إذا لم تكن زراعية) و needsClearerPhoto = true.
     * اضبط detectedSubject = "unclear" و diagnosisCategory = "غير محدد".
     * اضبط confidenceScore = 0 (للصور غير الزراعية) أو قيمة منخفضة صادقة أقل من 55 (للمشوشة).
     * لا تخترع أي اسم مرض أو حشرة أو مبيد. اكتب في problemName: "تعذر تأكيد التشخيص — يرجى إرسال صورة أوضح" و problemNameEn: "Unable to Confirm Diagnosis — Clearer Photo Required".
     * اذكر في clarificationMessage السبب بصراحة وكيف يلتقط المزارع صورة أفضل.

2. التمييز التلقائي الدقيق (نبات أم حشرة):
   - إذا ظهرت حشرة بوضوح في الصورة: اضبط detectedSubject = "insect" و problemType = "حشرة".
   - لا تصنّف الحشرة على أنها ضارة لمجرد ظهورها! تحقق هل هي حشرة نافعة (مثل خنفساء أبو العيد، أسد المن، نحل العسل، فرس النبي، الذبابة الحوامة، اليعسوب) أم حشرة ضارة (مثل سوسة النخيل، دوباس النخيل، حفار الساق، الذبابة البيضاء، المن، التربس، صانعات الأنفاق، العناكب).
     * إذا كانت نافعة: اضبط insectNature = "beneficial"، diagnosisCategory = "حشرة نافعة"، severity = "منخفضة"، severityLabel = "غير ضارة (حشرة نافعة)"، وأكّد على عدم رش المبيدات وحمايتها.
     * إذا كانت ضارة: اضبط insectNature = "harmful"، diagnosisCategory = "حشرة ضارة"، وحدد درجة الخطورة والمحاصيل والأضرار ودورة الحياة (فقط إذا توفرت معلومات علمية موثوقة، وإلا اكتب ذلك بصراحة).
   - إذا كانت الصورة لنبات أو ورقة أو ثمرة: اضبط detectedSubject = "plant"، وميّز بدقة بين:
     * "مرض فطري" / "مرض بكتيري" / "مرض فيروسي" (problemType = "مرض")
     * "نقص عناصر" (problemType = "نقص عناصر")
     * "إجهاد بيئي" مثل الإجهاد الحراري أو المائي أو الملوحة (problemType = "مرض")
     * "نبات سليم" (problemType = "سليم"، severity = "منخفضة")

3. الأمانة العلمية في نسبة الثقة والتفاصيل:
   - أعطِ confidenceScore رقمية صادقة من 0 إلى 100 تعكس مدى وضوح العلامات المرئية في الصورة فقط، ولا تخترع نسبة مرتفعة مع وجود لبس.
   - صف في conditionSummary ما ظهر فعلياً في الصورة بلغة عربية واضحة ومطمئنة.
   - اكتب visibleSymptoms كقائمة نقاط للملاحظات البصرية الفعلية التي استند عليها التقييم.

4. سلامة المبيدات والالتزام بالقرار الوزاري العُماني رقم 160/2023:
   - لا تقترح أي مبيد أو مادة كيميائية عند الحشرات النافعة أو النبات السليم أو الصور غير الواضحة أو الإجهاد البيئي أو نقص العناصر! اضبط pesticideNeeded = false.
   - عند الحاجة الفعلية لمبيد لحشرة ضارة أو مرض مؤكد، لا تخترع أسماء تجارية أو مبيدات محظورة في سلطنة عُمان. اذكر المادة الفعالة المصرّح بها أو البديل الآمن بالعربية والإنجليزية.
   - لا تكتب أرقام جرعات مخمّنة أو غير موثقة؛ اذكر الجرعة فقط إذا كانت موثقة ومعروفة على ملصق المنتج المعتمد وتناسب المحصول والآفة في سلطنة عُمان، وإلا وجّه المزارع للالتزام بالملصق المعتمد ومراجعة دائرة التنمية الزراعية.
   - نبه دائماً على حماية نحل العسل وفترة التحريم (PHI) وتجنب الرش وقت التزهير واشتداد الحرارة.

5. يجب تحديد متى يتواصل المزارع مع المهندس الزراعي في whenToContactEngineer، والالتزام بأن fieldDisclaimer يوضح أن التشخيص عبر الصورة تقديري ويحتاج فحصاً ميدانياً عند الالتباس.

أرجع JSON فقط مطابقاً للمخطط.`;

  const parts: any[] = [];
  images.forEach((img, idx) => {
    if (images.length > 1) {
      parts.push({ text: `الصورة ${idx + 1} (${img.label})` });
    }
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.cleanBase64,
      },
    });
  });

  const hintText =
    modeHint === 'insect'
      ? 'تلميح سياقي: المستخدم فتح الأداة من قسم الحشرات، لكن اعتمد على ما تراه فعلياً في الصورة (قد تكون نباتاً أو حشرة نافعة أو ضارة).'
      : 'ميّز تلقائياً من الصورة هل هي لنبات/ورقة أم حشرة (نافعة أم ضارة) أم غير واضحة.';

  parts.push({
    text: `معلومات إضافية اختيارية من المزارع:
- المحصول المذكور (إن وجد): ${cropName || 'غير محدد — استنتجه من الصورة إن أمكن'}
- الولاية / المحافظة في سلطنة عُمان: ${wilayat || 'سلطنة عُمان'}
- ملاحظات المزارع: ${observations || 'لا توجد ملاحظات نصية — اعتمد على تحليل الصورة'}
- ${hintText}

حلل الصورة بدقة علمية الآن وأخرج JSON فقط.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isAgricultureRelated: { type: Type.BOOLEAN },
          detectedSubject: { type: Type.STRING, enum: ['plant', 'insect', 'unclear'] },
          diagnosisCategory: {
            type: Type.STRING,
            enum: [
              'مرض فطري',
              'مرض بكتيري',
              'مرض فيروسي',
              'نقص عناصر',
              'إجهاد بيئي',
              'حشرة ضارة',
              'حشرة نافعة',
              'نبات سليم',
              'غير محدد',
            ],
          },
          problemType: { type: Type.STRING, enum: ['مرض', 'حشرة', 'نقص عناصر', 'سليم'] },
          cropName: { type: Type.STRING },
          problemName: { type: Type.STRING },
          problemNameEn: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
          needsClearerPhoto: { type: Type.BOOLEAN },
          clarificationMessage: { type: Type.STRING },
          conditionSummary: { type: Type.STRING },
          visibleSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
          causes: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING, enum: ['منخفضة', 'متوسطة', 'عالية'] },
          severityLabel: { type: Type.STRING },
          treatmentSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          organicRemedy: { type: Type.STRING },
          preventionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          pesticideNeeded: { type: Type.BOOLEAN },
          pesticideProductAr: { type: Type.STRING },
          pesticideProductEn: { type: Type.STRING },
          pesticideDosage: { type: Type.STRING },
          pesticideSafetyNote: { type: Type.STRING },
          whenToContactEngineer: { type: Type.STRING },
          omaniFarmingNote: { type: Type.STRING },
          possibleConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
          insectNature: { type: Type.STRING, enum: ['beneficial', 'harmful', 'neutral', 'none'] },
          insectTargetCrops: { type: Type.ARRAY, items: { type: Type.STRING } },
          insectDamage: { type: Type.STRING },
          insectLifeCycle: { type: Type.STRING },
          insectControlMethod: { type: Type.STRING },
          insectPrevention: { type: Type.STRING },
        },
        required: [
          'isAgricultureRelated',
          'detectedSubject',
          'diagnosisCategory',
          'problemType',
          'cropName',
          'problemName',
          'problemNameEn',
          'scientificName',
          'confidenceScore',
          'needsClearerPhoto',
          'clarificationMessage',
          'conditionSummary',
          'visibleSymptoms',
          'causes',
          'severity',
          'severityLabel',
          'treatmentSteps',
          'organicRemedy',
          'preventionTips',
          'pesticideNeeded',
          'pesticideProductAr',
          'pesticideProductEn',
          'pesticideDosage',
          'pesticideSafetyNote',
          'whenToContactEngineer',
          'omaniFarmingNote',
          'possibleConditions',
          'insectNature',
          'insectTargetCrops',
          'insectDamage',
          'insectLifeCycle',
          'insectControlMethod',
          'insectPrevention',
        ],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  const isAgri = parsed.isAgricultureRelated !== false;
  const rawConfidence = typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0;
  const clampedConfidence = Math.max(0, Math.min(100, Math.round(rawConfidence)));

  const allowedSubjects = ['plant', 'insect', 'unclear'];
  const detectedSubject: 'plant' | 'insect' | 'unclear' = allowedSubjects.includes(parsed.detectedSubject)
    ? parsed.detectedSubject
    : 'unclear';

  const allowedCategories = [
    'مرض فطري',
    'مرض بكتيري',
    'مرض فيروسي',
    'نقص عناصر',
    'إجهاد بيئي',
    'حشرة ضارة',
    'حشرة نافعة',
    'نبات سليم',
    'غير محدد',
  ];
  let diagnosisCategory = allowedCategories.includes(parsed.diagnosisCategory)
    ? parsed.diagnosisCategory
    : 'غير محدد';

  const needsClearerPhoto =
    !isAgri ||
    detectedSubject === 'unclear' ||
    diagnosisCategory === 'غير محدد' ||
    Boolean(parsed.needsClearerPhoto) ||
    clampedConfidence < 55;

  if (needsClearerPhoto) {
    diagnosisCategory = 'غير محدد';
  }

  const allowedProblemTypes = ['مرض', 'حشرة', 'نقص عناصر', 'سليم'];
  let problemType: 'مرض' | 'حشرة' | 'نقص عناصر' | 'سليم' = allowedProblemTypes.includes(parsed.problemType)
    ? parsed.problemType
    : detectedSubject === 'insect'
      ? 'حشرة'
      : 'مرض';
  if (diagnosisCategory === 'نبات سليم') problemType = 'سليم';
  if (diagnosisCategory === 'نقص عناصر') problemType = 'نقص عناصر';
  if (diagnosisCategory === 'حشرة ضارة' || diagnosisCategory === 'حشرة نافعة') problemType = 'حشرة';

  const allowedSeverities = ['منخفضة', 'متوسطة', 'عالية'];
  let severity: 'منخفضة' | 'متوسطة' | 'عالية' = allowedSeverities.includes(parsed.severity)
    ? parsed.severity
    : 'متوسطة';

  const allowedInsectNatures = ['beneficial', 'harmful', 'neutral', 'none'];
  let insectNature: 'beneficial' | 'harmful' | 'neutral' | 'none' =
    detectedSubject === 'insect' && allowedInsectNatures.includes(parsed.insectNature)
      ? parsed.insectNature
      : detectedSubject === 'insect'
        ? (diagnosisCategory === 'حشرة نافعة' ? 'beneficial' : 'harmful')
        : 'none';

  if (diagnosisCategory === 'حشرة نافعة') {
    insectNature = 'beneficial';
    severity = 'منخفضة';
  }

  const visibleSymptomsArr: string[] = Array.isArray(parsed.visibleSymptoms)
    ? parsed.visibleSymptoms.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 8)
    : [];
  const visibleSymptomsText =
    visibleSymptomsArr.join(' • ') ||
    (typeof parsed.conditionSummary === 'string' ? parsed.conditionSummary : '');

  const causesArr: string[] = Array.isArray(parsed.causes)
    ? parsed.causes.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 8)
    : [];

  const treatmentStepsArr: string[] = Array.isArray(parsed.treatmentSteps)
    ? parsed.treatmentSteps.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 8)
    : [];

  const preventionTipsArr: string[] = Array.isArray(parsed.preventionTips)
    ? parsed.preventionTips.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 8)
    : [];

  const possibleConditionsArr: string[] = Array.isArray(parsed.possibleConditions)
    ? parsed.possibleConditions.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 4)
    : [];

  const insectTargetCropsArr: string[] = Array.isArray(parsed.insectTargetCrops)
    ? parsed.insectTargetCrops.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 8)
    : [];

  const allowPesticide =
    !needsClearerPhoto &&
    insectNature !== 'beneficial' &&
    diagnosisCategory !== 'نبات سليم' &&
    diagnosisCategory !== 'إجهاد بيئي' &&
    diagnosisCategory !== 'نقص عناصر' &&
    Boolean(parsed.pesticideNeeded) &&
    Boolean((parsed.pesticideProductAr || '').trim() || (parsed.pesticideProductEn || '').trim());

  const pesticideProductText = allowPesticide
    ? [parsed.pesticideProductAr, parsed.pesticideProductEn].filter((v) => typeof v === 'string' && v.trim()).join(' — ')
    : '';

  const pesticideDosageText = allowPesticide
    ? (parsed.pesticideDosage || '').trim() ||
      'يُتبع التركيز الموثق على ملصق العبوة المعتمد والمناسب للمحصول والآفة في سلطنة عُمان بعد مراجعة المختص.'
    : '';

  const chemicalRemedyCombined = allowPesticide
    ? `${pesticideProductText}${pesticideDosageText ? `\nالجرعة والإرشاد: ${pesticideDosageText}` : ''}${
        parsed.pesticideSafetyNote ? `\nتنبيه السلامة: ${parsed.pesticideSafetyNote}` : ''
      }`
    : insectNature === 'beneficial'
      ? 'لا تستخدم أي مبيد كيميائي؛ هذه الحشرة نافعة وتساعد في حماية المحصول طبيعياً.'
      : 'لا يُنصح باستخدام مبيدات كيميائية لهذه الحالة ما لم يثبت انتشار وبائي بعد الفحص الميداني.';

  const normalizedDiagnosis = {
    isAgricultureRelated: isAgri,
    detectedSubject: needsClearerPhoto ? 'unclear' : detectedSubject,
    diagnosisCategory,
    problemType,
    cropName: (parsed.cropName || cropName || (detectedSubject === 'insect' ? 'محصول زراعي' : 'نبات زراعي')).trim(),
    problemName: needsClearerPhoto
      ? 'تعذر تأكيد التشخيص من هذه الصورة'
      : (parsed.problemName || 'حالة زراعية مشخصة').trim(),
    problemNameEn: needsClearerPhoto
      ? 'Diagnosis Could Not Be Confirmed'
      : (parsed.problemNameEn || '').trim(),
    scientificName: needsClearerPhoto ? '' : (parsed.scientificName || '').trim(),
    confidenceScore: needsClearerPhoto ? (isAgri ? Math.min(clampedConfidence, 54) : 0) : clampedConfidence,
    needsClearerPhoto,
    clarificationMessage: needsClearerPhoto
      ? (parsed.clarificationMessage ||
          'الصورة غير واضحة بما يكفي أو لا تُظهر النسيج النباتي أو الحشرة بدقة. يرجى التقاط صورة واحدة قريبة ومُركّزة في إضاءة نهارية جيدة.')
      : '',
    conditionSummary:
      (parsed.conditionSummary || '').trim() ||
      (needsClearerPhoto
        ? 'لم يتمكن النظام من التحقق من أعراض أو معالم زراعية واضحة في الصورة المقدمة.'
        : 'تم تحليل العلامات المرئية الظاهرة في الصورة.'),
    visibleSymptomsList: visibleSymptomsArr,
    visibleSymptoms: visibleSymptomsText || 'لم تُرصد أعراض واضحة في الصورة.',
    causes: causesArr,
    severity,
    severityLabel:
      insectNature === 'beneficial'
        ? 'غير ضارة — حشرة نافعة'
        : (parsed.severityLabel || severity),
    treatmentSteps: treatmentStepsArr,
    organicRemedy:
      (parsed.organicRemedy || '').trim() ||
      treatmentStepsArr.join(' — ') ||
      'اتباع الإجراءات الوقائية الزراعية الملائمة ومراقبة المحصول.',
    preventionTips: preventionTipsArr,
    pesticideRecommendation: {
      needed: allowPesticide,
      productAr: allowPesticide ? (parsed.pesticideProductAr || '').trim() : '',
      productEn: allowPesticide ? (parsed.pesticideProductEn || '').trim() : '',
      dosage: pesticideDosageText,
      safetyNote: allowPesticide
        ? (parsed.pesticideSafetyNote || '').trim() ||
          'الالتزام بالقرار الوزاري العُماني 160/2023 وحماية نحل العسل وفترة التحريم (PHI).'
        : '',
    },
    chemicalRemedy: chemicalRemedyCombined,
    whenToContactEngineer:
      (parsed.whenToContactEngineer || '').trim() ||
      'تواصل مع المهندس الزراعي أو دائرة التنمية الزراعية عند تزايد الأعراض سريعاً، أو في حال التباس التشخيص، أو قبل اتخاذ قرار الرش العلاجي الواسع.',
    omaniFarmingNote:
      (parsed.omaniFarmingNote || '').trim() ||
      `راعِ ظروف الحرارة والرطوبة في ${wilayat || 'سلطنة عُمان'} ونفّذ عمليات الفحص والرش (إن لزم) في الصباح الباكر أو قبل الغروب.`,
    advisoryNote: MANDATORY_ADVISORY,
    possibleConditions: possibleConditionsArr,
    insectDetails:
      detectedSubject === 'insect' && !needsClearerPhoto
        ? {
            nature: insectNature,
            targetCrops: insectTargetCropsArr,
            damage: (parsed.insectDamage || '').trim(),
            lifeCycle:
              (parsed.insectLifeCycle || '').trim() ||
              'تعتمد دورة الحياة الدقيقة على النوع الميداني ودرجات الحرارة والرطوبة في المنطقة.',
            controlMethod: (parsed.insectControlMethod || '').trim(),
            prevention: (parsed.insectPrevention || '').trim(),
          }
        : null,
    photoParts: images.map((_, i) => (i === 0 ? 'primary' : `extra-${i}`)),
    // Legacy pest alias fields for smooth compatibility
    pestName: parsed.problemName || '',
    severityLevel:
      severity === 'عالية' ? 'شديد الخطورة' : severity === 'متوسطة' ? 'متوسط الخطورة' : 'قليل الضرر',
    affectedParts: insectTargetCropsArr,
    lifeCycleNote: parsed.insectLifeCycle || '',
    organicAndBiologicalControl: parsed.insectControlMethod || parsed.organicRemedy || '',
    safeChemicalOptions: chemicalRemedyCombined,
    immediateAction: treatmentStepsArr[0] || parsed.organicRemedy || '',
    officialDisclaimer: MANDATORY_ADVISORY,
    omaniGuidance: parsed.omaniFarmingNote || '',
  };

  if (smartDiagnosisCache.size >= SMART_CACHE_MAX_ITEMS) {
    const oldestKey = smartDiagnosisCache.keys().next().value;
    if (oldestKey) smartDiagnosisCache.delete(oldestKey);
  }
  smartDiagnosisCache.set(cacheKey, {
    expiresAt: now + SMART_CACHE_TTL_MS,
    diagnosis: normalizedDiagnosis,
  });

  return { diagnosis: normalizedDiagnosis, fromCache: false };
}

async function handleSmartDiagnosisRequest(
  req: express.Request,
  res: express.Response,
  defaultModeHint: 'auto' | 'plant' | 'insect' = 'auto'
) {
  try {
    const { images, imageBase64, cropName, hostCrop, symptoms, pestDescription, observations, wilayat, modeHint } =
      req.body || {};

    const validImages: Array<{ label: string; mimeType: string; cleanBase64: string }> = [];

    if (typeof imageBase64 === 'string' && imageBase64.trim().length > 0) {
      const validated = extractAndValidateBase64Image(imageBase64);
      if (!validated) {
        return res.status(400).json({
          error: 'تنسيق الصورة غير مدعوم أو الملف تالف. يرجى إرسال صورة واضحة بصيغة JPG أو PNG أو WEBP.',
        });
      }
      validImages.push({ label: 'الصورة الرئيسية', mimeType: validated.mimeType, cleanBase64: validated.cleanBase64 });
    } else if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        const item = images[i];
        const raw = typeof item === 'string' ? item : item?.base64;
        if (typeof raw === 'string' && raw.trim().length > 0) {
          const validated = extractAndValidateBase64Image(raw);
          if (!validated) {
            return res.status(400).json({
              error: 'تنسيق إحدى الصور غير مدعوم أو الحجم يتجاوز الحد المسموح (10 ميجابايت).',
            });
          }
          validImages.push({
            label: item?.label || `صورة ${i + 1}`,
            mimeType: validated.mimeType,
            cleanBase64: validated.cleanBase64,
          });
        }
      }
    }

    if (validImages.length === 0) {
      return res.status(400).json({
        error: 'يرجى التقاط أو اختيار صورة واحدة واضحة للنبات أو الحشرة لبدء التشخيص.',
      });
    }

    const cleanCrop = String(cropName || hostCrop || '').trim().slice(0, 80);
    const cleanWilayat = String(wilayat || '').trim().slice(0, 100);
    const cleanObs = String(observations || symptoms || pestDescription || '').trim().slice(0, 1000);
    const effectiveMode: 'auto' | 'plant' | 'insect' =
      modeHint === 'insect' || modeHint === 'plant' || modeHint === 'auto' ? modeHint : defaultModeHint;

    const { diagnosis, fromCache } = await runUnifiedAgriVisionDiagnosis({
      images: validImages,
      cropName: cleanCrop,
      wilayat: cleanWilayat,
      observations: cleanObs,
      modeHint: effectiveMode,
    });

    return res.json({ success: true, cached: fromCache, diagnosis });
  } catch (error: any) {
    console.error('Smart agricultural diagnosis error:', error);
    const message = String(error?.message || '');
    const isRate = message.includes('429') || message.toLowerCase().includes('quota');
    return res.status(isRate ? 503 : 500).json({
      error: isRate
        ? 'خادم التشخيص الذكي مشغول حالياً. يرجى الانتظار بضع لحظات ثم إعادة المحاولة.'
        : 'تعذر إتمام التشخيص الذكي حالياً. يرجى التأكد من وضوح الصورة وتوفر الاتصال بالإنترنت والمحاولة مرة أخرى.',
      details: error?.message,
    });
  }
}

app.post('/api/diagnose/smart', aiRateLimit, (req, res) =>
  handleSmartDiagnosisRequest(req, res, 'auto')
);

app.post('/api/diagnose/plant', aiRateLimit, (req, res) =>
  handleSmartDiagnosisRequest(req, res, 'auto')
);

app.post('/api/diagnose/pest', aiRateLimit, (req, res) =>
  handleSmartDiagnosisRequest(req, res, 'insect')
);

// --- 5. AI Quiz Generator & Server-side Verified Score Submission (Anti-Cheat) ---
const aiQuizBank = new Map<string, Question>();

app.post('/api/games/generate-questions', aiRateLimit, async (req, res) => {
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

app.post('/api/community/posts', writeRateLimit, (req, res) => {
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

// AI Agricultural Chat Assistant inside Community Hub
app.post('/api/community/ai-chat', aiRateLimit, async (req, res) => {
  try {
    const { message, governorate, cropFocus, history } = req.body;
    const cleanMessage = censorText(String(message || '').trim().slice(0, 1200), storage.bannedWords);
    if (!cleanMessage) {
      return res.status(400).json({ error: 'يرجى كتابة سؤالك الزراعي أولاً.' });
    }

    const cleanGov = typeof governorate === 'string' ? governorate.trim().slice(0, 100) : 'سلطنة عُمان';
    const cleanCrop = typeof cropFocus === 'string' ? cropFocus.trim().slice(0, 80) : 'الزراعة العامة';
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .filter((h: any) => h && typeof h.text === 'string' && (h.role === 'user' || h.role === 'assistant'))
          .map((h: any) => `${h.role === 'user' ? 'المزارع' : 'المستشار'}: ${h.text.slice(0, 450)}`)
          .join('\n')
      : '';

    const systemInstruction = `أنت المستشار الزراعي الذكي لتطبيق «صديق المزارع الذكي» في سلطنة عُمان (فكرة عمر بن سالم الشرجي).
مهامك وقواعدك الصارمة:
1. أجب باللغة العربية الواضحة والدافئة بأسلوب عملي مخصص لمناخ محافظات سلطنة عُمان، والأفلاج العُمانية، والنخيل والحمضيات والخضروات والبيوت المحمية.
2. التزم التزاماً مطلقاً بالقرار الوزاري رقم 160/2023 لحظر المبيدات شديدة السمية والمحظورة في سلطنة عُمان؛ لا تذكر أي مبيد محظور، وقدّم الحلول العضوية والحيوية والتنظيمية أولاً.
3. اجعل الإجابة منظمة ومباشرة بصيغة JSON المطابقة للمخطط فقط:
   - reply: إجابة شاملة ومفيدة (3 إلى 6 جمل).
   - practicalSteps: 3 خطوات تطبيقية واضحة ينفذها المزارع في مزرعته.
   - safetyReminder: تنبيه وقائي أو فترة تحريم أو توقيت ري/رش مثالي للمناخ العُماني.
   - suggestedFollowUps: سؤالان مقترحان للمتابعة.`;

    const prompt = `المحافظة: ${cleanGov}
المحصول أو المجال: ${cleanCrop}
${safeHistory ? `سياق المحادثة السابقة:\n${safeHistory}\n` : ''}سؤال المزارع الحالي: ${cleanMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [{ text: prompt }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            practicalSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            safetyReminder: { type: Type.STRING },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['reply', 'practicalSteps', 'safetyReminder', 'suggestedFollowUps'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      source: 'gemini',
      reply: parsed.reply || 'يمكنني مساعدتك في إدارة الري والتسميد ومكافحة الآفات وفق البيئة العُمانية.',
      practicalSteps: Array.isArray(parsed.practicalSteps) ? parsed.practicalSteps.slice(0, 4) : [],
      safetyReminder:
        parsed.safetyReminder ||
        'راعِ تجنب الرش والري وقت الذروة الشمسية والتزم بالملصق الإرشادي المعتمد بسلطنة عُمان (القرار 160/2023).',
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) ? parsed.suggestedFollowUps.slice(0, 3) : [],
    });
  } catch (error: any) {
    console.warn('Community AI chat fallback:', error?.message);
    return res.json({
      success: true,
      source: 'fallback',
      reply:
        'في مناخ سلطنة عُمان يُنصح بجدولة الري في الصباح الباكر أو بعد العصر لتقليل التبخر، والاعتماد على السماد العضوي المتحلل ومستخلص النيم والمصائد الفرمونية قبل اللجوء لأي مبيدات مسجلة.',
      practicalSteps: [
        'افحص رطوبة التربة على عمق 10–15 سم قبل تشغيل شبكة الري أو فتح مسار الفلج.',
        'أزل الأوراق والأفرع الجافة أو المصابة للحفاظ على تهوية التاج ومنع انتشار الآفات.',
        'استشر دائرة التنمية الزراعية في ولايتك عند ملاحظة أعراض غير معتادة أو قبل أي رش كيميائي.',
      ],
      safetyReminder:
        'تنبيه وقائي: تجنب الرش خلال تفتح الأزهار لحماية نحل العسل العُماني والتزم بفترة التحريم (PHI) والقرار الوزاري 160/2023.',
      suggestedFollowUps: [
        'ما أفضل جدول ري للنخيل في فصل الصيف؟',
        'كيف أرفع خصوبة التربة المالحة عضوياً؟',
      ],
    });
  }
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

app.post('/api/notifications/read-all', (_req, res) => {
  storage.notifications = storage.notifications.map((n: any) => ({ ...n, read: true }));
  saveStorage();
  return res.json({ success: true, notifications: storage.notifications });
});

// --- 9B. Farmer Support Tickets & Feedback APIs ---
app.post('/api/support/tickets', writeRateLimit, (req, res) => {
  const senderName = String(req.body?.senderName || '').trim().slice(0, 80);
  const contact = String(req.body?.contact || '').trim().slice(0, 100);
  const rawMessage = String(req.body?.message || '').trim().slice(0, 1200);
  const governorate = String(req.body?.governorate || '').trim().slice(0, 80);

  if (senderName.length < 2 || contact.length < 3 || rawMessage.length < 5) {
    return res.status(400).json({
      error: 'يرجى كتابة الاسم ووسيلة التواصل ونص الاستفسار بشكل واضح (5 أحرف على الأقل).'
    });
  }

  const sanitizedMessage = censorText(rawMessage, storage.bannedWords);
  const now = Date.now();
  const ticket: SupportTicket = {
    id: `tkt-${now}-${Math.random().toString(36).slice(2, 6)}`,
    senderName: censorText(senderName, storage.bannedWords),
    contact,
    message: sanitizedMessage,
    governorate: governorate || undefined,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };

  storage.supportTickets.unshift(ticket);
  storage.supportTickets = storage.supportTickets.slice(0, 200);
  saveStorage();

  return res.status(201).json({
    success: true,
    ticket: { id: ticket.id, status: ticket.status, createdAt: ticket.createdAt },
  });
});

app.get('/api/staff/support-tickets', requireStaff, (_req, res) => {
  return res.json({ success: true, tickets: storage.supportTickets });
});

app.patch('/api/staff/support-tickets/:id', requireStaff, (req: AuthenticatedRequest, res) => {
  const ticket = storage.supportTickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'التذكرة غير موجودة.' });
  }
  const status = req.body?.status;
  if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
    ticket.status = status;
  }
  if (typeof req.body?.adminNote === 'string') {
    ticket.adminNote = req.body.adminNote.trim().slice(0, 500);
  }
  ticket.updatedAt = Date.now();

  storage.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    action: 'تحديث تذكرة دعم مزارع',
    performedBy: req.staffSession?.actorName || 'الطاقم الإداري',
    details: `تحديث حالة الطلب (${ticket.id}) إلى ${ticket.status}`,
    timestamp: Date.now(),
  });
  saveStorage();

  return res.json({ success: true, ticket });
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

function buildDailyQuests(farmDay: number) {
  const offset = Math.max(0, farmDay - 1) % FARM_QUEST_TEMPLATES.length;
  const rotated = [
    FARM_QUEST_TEMPLATES[offset % FARM_QUEST_TEMPLATES.length],
    FARM_QUEST_TEMPLATES[(offset + 1) % FARM_QUEST_TEMPLATES.length],
    FARM_QUEST_TEMPLATES[(offset + 2) % FARM_QUEST_TEMPLATES.length],
  ];
  return rotated.map((q) => ({
    id: `${q.id}_d${farmDay}`,
    templateId: q.id,
    titleAr: q.titleAr,
    actionKey: q.actionKey,
    progress: 0,
    target: q.target,
    rewardCoins: q.rewardCoins,
    rewardPoints: q.rewardPoints,
    rewardWater: q.rewardWater,
    claimed: false,
  }));
}

function advanceQuestProgress(farm: any, actionKey: string, amount = 1) {
  if (!Array.isArray(farm.quests)) return;
  for (const q of farm.quests) {
    if (q.actionKey === actionKey && !q.claimed && q.progress < q.target) {
      q.progress = Math.min(q.target, (q.progress || 0) + amount);
    }
  }
}

function ensurePhase4FarmFields(farm: any) {
  const now = Date.now();
  if (!farm.inventory) farm.inventory = {};
  if (typeof farm.inventory.fert_organic !== 'number') farm.inventory.fert_organic = 2;
  if (typeof farm.inventory.fert_npk !== 'number') farm.inventory.fert_npk = 1;
  if (typeof farm.inventory.pest_neem !== 'number') farm.inventory.pest_neem = 2;
  if (typeof farm.inventory.fodder_pack !== 'number') farm.inventory.fodder_pack = 3;

  if (!farm.livestock) {
    farm.livestock = {
      cows: { fedAt: now - 15000, lastCollectedAt: now - 60000, happiness: 85 },
      goats: { fedAt: now - 15000, lastCollectedAt: now - 60000, happiness: 82 },
      chickens: { fedAt: now - 15000, lastCollectedAt: now - 60000, happiness: 88 },
      bees: { fedAt: now, lastCollectedAt: now - 70000, happiness: 90 },
    };
  } else {
    for (const kind of ['cows', 'goats', 'chickens', 'bees'] as const) {
      if (!farm.livestock[kind]) {
        farm.livestock[kind] = { fedAt: now, lastCollectedAt: now - 60000, happiness: 82 };
      }
    }
  }

  if (!farm.buildings) {
    farm.buildings = {
      wellPump: 1,
      barnStorage: 1,
      beehiveApiary: 1,
      livestockShelter: 1,
    };
  } else {
    if (typeof farm.buildings.wellPump !== 'number') farm.buildings.wellPump = 1;
    if (typeof farm.buildings.barnStorage !== 'number') farm.buildings.barnStorage = 1;
    if (typeof farm.buildings.beehiveApiary !== 'number') farm.buildings.beehiveApiary = 1;
    if (typeof farm.buildings.livestockShelter !== 'number') farm.buildings.livestockShelter = 1;
  }

  farm.maxWaterLiters = 300 + Math.max(0, (farm.buildings.wellPump || 1) - 1) * 100;

  if (!farm.warehouse) {
    farm.warehouse = {
      crops: { omani_cucumber: 1 },
      goods: { milk: 1, goat_cheese: 0, eggs: 1, honey: 0 },
    };
  } else {
    if (!farm.warehouse.crops) farm.warehouse.crops = {};
    if (!farm.warehouse.goods) farm.warehouse.goods = { milk: 0, goat_cheese: 0, eggs: 0, honey: 0 };
  }

  if (!Array.isArray(farm.quests) || farm.quests.length === 0) {
    farm.quests = buildDailyQuests(farm.farmDay || 1);
    farm.questsDay = farm.farmDay || 1;
  }
  if (!farm.marketMultipliers) {
    farm.marketMultipliers = {};
  }
  if (!Array.isArray(farm.hotItems)) {
    farm.hotItems = [];
  }
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
        pest_neem: 2,
        fodder_pack: 3
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
          message: 'ابدأ بحرث الأرض أو متابعة شتلة الخيار العُماني أو رعاية الحظيرة والمنحل.',
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
    ensurePhase4FarmFields(farm);
    storage.virtualFarms[userId] = farm;
    saveStorage();
  } else {
    if (userName && userName !== 'مزارع عُماني') farm.ownerName = userName;
    if (governorate) farm.governorate = governorate;
    if (!farm.farmDay) farm.farmDay = 1;
    if (!farm.lastDayAdvanceAt) farm.lastDayAdvanceAt = Date.now();
    if (typeof farm.falajCollectedDay !== 'number') farm.falajCollectedDay = 0;
    ensurePhase4FarmFields(farm);
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

  // Dynamic deterministic daily market multipliers (0.95x - 1.55x)
  const mults: Record<string, number> = {};
  const allIds = [
    ...storage.virtualCrops.map((c: any) => c.id),
    ...FARM_LIVESTOCK_DEFS.map((l) => l.productId),
  ];
  const hotItems: string[] = [];
  allIds.forEach((id, idx) => {
    const wave = Math.sin(dayNum * 1.37 + idx * 2.13 + seasonIdx * 0.9);
    const val = Math.round((1.15 + wave * 0.35) * 100) / 100;
    const clamped = Math.max(0.95, Math.min(1.55, val));
    mults[id] = clamped;
    if (clamped >= 1.35 && hotItems.length < 3) hotItems.push(id);
  });
  farm.marketMultipliers = mults;
  farm.hotItems = hotItems;
  return seasonDef;
}

function recomputeFarmGrowth(farm: any) {
  ensurePhase4FarmFields(farm);
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
    const pumpBonus = (farm.buildings?.wellPump || 1) * 15 * daysPassed;
    farm.waterLiters = Math.min(farm.maxWaterLiters, (farm.waterLiters || 0) + pumpBonus);
    if (farm.quests.every((q: any) => q.claimed) || farm.farmDay - (farm.questsDay || 1) >= 2) {
      farm.quests = buildDailyQuests(farm.farmDay);
      farm.questsDay = farm.farmDay;
    }
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

    // 2. Real-time Server Stage Advancement with Requirements Gate (+Beehive pollination speedup for fruit trees)
    let safetyLoops = 0;
    const apiaryBonus = (farm.buildings?.beehiveApiary || 1) >= 2 && (crop.id === 'omani_lemon' || crop.id === 'faradh_palm') ? 0.9 : 1;
    while (plot.stageIndex < crop.stages.length - 1 && safetyLoops < 6) {
      safetyLoops++;
      const currentStage = crop.stages[plot.stageIndex];
      const stageMs = Math.round(currentStage.durationSec * 1000 * apiaryBonus);
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
  return res.json({
    success: true,
    crops: storage.virtualCrops,
    shopItems: VIRTUAL_SHOP_ITEMS,
    achievements: FARM_ACHIEVEMENTS,
    livestockDefs: FARM_LIVESTOCK_DEFS,
    buildingDefs: FARM_BUILDING_DEFS,
    questTemplates: FARM_QUEST_TEMPLATES,
  });
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
    } else if (shopItem.id === 'fert_organic' || shopItem.id === 'fert_npk' || shopItem.id === 'pest_neem' || shopItem.id === 'fodder_pack') {
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
  } else if (action === 'feed_livestock') {
    const kind = payload?.kind as 'cows' | 'goats' | 'chickens' | 'bees';
    const def = FARM_LIVESTOCK_DEFS.find((d) => d.id === kind);
    if (!def) return res.status(400).json({ error: 'نوع الحظيرة غير معروف' });

    if (kind !== 'bees') {
      if ((farm.inventory.fodder_pack || 0) <= 0) {
        return res.status(400).json({ error: 'نفد رصيد الأعلاف! اشترِ «أعلاف قت وبرسيم» من متجر المزرعة.' });
      }
      farm.inventory.fodder_pack -= 1;
    }

    const entry = farm.livestock[kind];
    entry.fedAt = now;
    entry.happiness = Math.min(100, (entry.happiness || 75) + 20);
    const pts = awardFarmPoints(farm, 8, `رعاية وإطعام ${def.nameAr}`, 'feed_livestock');
    feedback = kind === 'bees'
      ? `تم فحص خلايا النحل وتنشيط التلقيح بالزهور (+${pts} نقاط)`
      : `تم إطعام ${def.nameAr} بالبرسيم العُماني الطازج وارتفع إنتاجها (+${pts} نقاط)`;
  } else if (action === 'collect_livestock') {
    const kind = payload?.kind as 'cows' | 'goats' | 'chickens' | 'bees';
    const def = FARM_LIVESTOCK_DEFS.find((d) => d.id === kind);
    if (!def) return res.status(400).json({ error: 'نوع الحظيرة غير معروف' });

    const entry = farm.livestock[kind];
    const elapsedSec = Math.floor((now - (entry.lastCollectedAt || 0)) / 1000);
    if (elapsedSec < def.cooldownSec) {
      return res.status(400).json({
        error: `الإنتاج قيد التكوين لـ ${def.nameAr}؛ متبقٍ ${def.cooldownSec - elapsedSec} ثانية.`
      });
    }

    const buildingLv = kind === 'bees' ? (farm.buildings?.beehiveApiary || 1) : (farm.buildings?.livestockShelter || 1);
    const yieldQty = buildingLv >= 3 ? 2 : 1;
    entry.lastCollectedAt = now;
    entry.happiness = Math.max(55, (entry.happiness || 85) - 6);
    farm.warehouse.goods[def.productId] = (farm.warehouse.goods[def.productId] || 0) + yieldQty;

    const pts = awardFarmPoints(farm, def.harvestPoints, `جني ${yieldQty}× ${def.productNameAr} من ${def.nameAr}`, 'collect_livestock');
    advanceQuestProgress(farm, 'livestock_collect', 1);
    if (kind === 'bees') unlockAchievement(farm, 'honey_keeper');
    else unlockAchievement(farm, 'dairy_master');

    feedback = `تم جمع +${yieldQty} ${def.productNameAr} وإيداعها في مخزن المزرعة (+${pts} نقطة)!`;
  } else if (action === 'sell_market') {
    const itemType = payload?.itemType === 'good' ? 'good' : 'crop';
    const itemId = String(payload?.itemId || '');
    const reqQty = Number(payload?.quantity || 1);

    const bucket = itemType === 'good' ? farm.warehouse.goods : farm.warehouse.crops;
    const available = Math.max(0, Number(bucket[itemId] || 0));
    if (available <= 0) {
      return res.status(400).json({ error: 'لا توجد كمية متوفرة من هذا المنتج في المخزن لبيعها.' });
    }
    const sellQty = payload?.quantity === 'all' ? available : Math.max(1, Math.min(available, reqQty));

    let basePrice = 40;
    let itemName = itemId;
    if (itemType === 'good') {
      const def = FARM_LIVESTOCK_DEFS.find((l) => l.productId === itemId);
      if (!def) return res.status(404).json({ error: 'المنتج الحيواني غير معروف' });
      basePrice = def.baseSellPrice;
      itemName = def.productNameAr;
    } else {
      const crop = storage.virtualCrops.find((c) => c.id === itemId);
      if (!crop) return res.status(404).json({ error: 'المحصول غير معروف' });
      basePrice = Math.max(30, Math.round(crop.harvestCoins * 0.72));
      itemName = `صندوق ${crop.nameAr}`;
    }

    const dailyMult = Number(farm.marketMultipliers?.[itemId] || 1.1);
    const barnBonus = 1 + Math.max(0, (farm.buildings?.barnStorage || 1) - 1) * 0.12;
    const unitPrice = Math.max(15, Math.round(basePrice * dailyMult * barnBonus));
    const totalCoins = unitPrice * sellQty;

    bucket[itemId] = available - sellQty;
    const pts = awardFarmPoints(farm, Math.min(25, 10 + sellQty * 4), `بيع ${sellQty}× ${itemName} في سوق المزرعة بسعر ${unitPrice}🪙`, 'sell_market', totalCoins);
    advanceQuestProgress(farm, 'market_sell', sellQty);
    unlockAchievement(farm, 'market_merchant');

    feedback = `تم بيع ${sellQty}× ${itemName} في سوق عُمان مقابل +${totalCoins} 🪙 و+${pts} نقاط!`;
  } else if (action === 'upgrade_building') {
    const buildingId = payload?.buildingId as 'wellPump' | 'barnStorage' | 'beehiveApiary' | 'livestockShelter';
    const bDef = FARM_BUILDING_DEFS.find((b) => b.id === buildingId);
    if (!bDef) return res.status(400).json({ error: 'المنشأة غير معروفة' });

    const currentLv = Number(farm.buildings?.[buildingId] || 1);
    if (currentLv >= bDef.maxLevel) {
      return res.status(400).json({ error: `${bDef.nameAr} وصلت بالفعل إلى أعلى مستوى (${bDef.maxLevel}).` });
    }
    const cost = bDef.baseCostCoins * currentLv;
    if (farm.coins < cost) {
      return res.status(400).json({ error: `تحتاج ${cost} 🪙 لتطوير ${bDef.nameAr}.` });
    }

    farm.coins -= cost;
    farm.buildings[buildingId] = currentLv + 1;
    if (buildingId === 'wellPump') {
      farm.maxWaterLiters = 300 + currentLv * 100;
      farm.waterLiters = Math.min(farm.maxWaterLiters, farm.waterLiters + 100);
    }
    const pts = awardFarmPoints(farm, 22, `تطوير ${bDef.nameAr} إلى المستوى ${currentLv + 1}`, 'upgrade_building');
    feedback = `تم تطوير ${bDef.nameAr} إلى المستوى ${currentLv + 1} بنجاح (+${pts} نقطة)!`;
  } else if (action === 'claim_quest') {
    const questId = String(payload?.questId || '');
    const quest = (farm.quests || []).find((q: any) => q.id === questId);
    if (!quest) return res.status(404).json({ error: 'المهمة غير موجودة' });
    if (quest.claimed) return res.status(409).json({ error: 'تم استلام مكافأة هذه المهمة مسبقاً.' });
    if ((quest.progress || 0) < (quest.target || 1)) {
      return res.status(400).json({ error: 'أكمل خطوات المهمة أولاً قبل استلام المكافأة.' });
    }

    quest.claimed = true;
    farm.waterLiters = Math.min(farm.maxWaterLiters, (farm.waterLiters || 0) + (quest.rewardWater || 0));
    const pts = awardFarmPoints(
      farm,
      quest.rewardPoints || 20,
      `إنجاز مهمة يومية: ${quest.titleAr}`,
      'claim_quest',
      quest.rewardCoins || 50
    );
    feedback = `أحسنت! استلمت +${quest.rewardCoins} 🪙 و+${pts} نقطة و+${quest.rewardWater} لتر ماء!`;
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
        advanceQuestProgress(farm, 'irrigate', 1);
        feedback = `تم الري بنجاح (+${pts} نقاط)`;
      } else {
        advanceQuestProgress(farm, 'irrigate', 1);
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
      const crateQty = plot.health >= 85 ? 2 : 1;
      farm.warehouse.crops[crop.id] = (farm.warehouse.crops[crop.id] || 0) + crateQty;
      const pts = awardFarmPoints(farm, crop.harvestPoints || storage.pointRules.harvest, `حصاد محصول ${crop.nameAr} بجودة ${plot.health}%`, 'harvest', earnedCoins);
      advanceQuestProgress(farm, 'harvest', 1);
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
      feedback = `مبارك الحصاد! كسبت +${earnedCoins} 🪙 و+${pts} نقطة وإيداع ${crateQty} صندوق ${crop.nameAr} في المخزن!`;
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

app.post('/api/virtual-farm/advisor', aiRateLimit, async (req, res) => {
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
      model: 'gemini-4-hydrogen',
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

const MEDIA_STORE_DIR = path.join(__dirname, 'media_store');
app.use('/media', express.static(MEDIA_STORE_DIR, { maxAge: '7d' }));

function createDefaultQaReview(episodeId: string): EpisodeQaReviewState {
  return {
    episodeId,
    checklist: {
      luftsAndDucking: false,
      pronunciationAndTashkeel: false,
      noSceneNumbers: false,
      syncAndTransitions: false,
      phoneSpeakerClarity: false,
      mobileBitrateAnd480p: false,
    },
    reviewers: [
      { slot: 1, roleTitleAr: 'المراجع الأول · مدير البرنامج (عمر الشرجي)', reviewerName: 'عمر الشرجي', approved: false, notes: '' },
      { slot: 2, roleTitleAr: 'المراجع الثاني · مرشد ووقاية النبات', reviewerName: '', approved: false, notes: '' },
      { slot: 3, roleTitleAr: 'المراجع الثالث · جودة الصوت والصورة على الجوال', reviewerName: '', approved: false, notes: '' },
    ],
    updatedAt: Date.now(),
  };
}

app.get('/api/cartoon/reviews', (_req, res) => {
  const manifestPath = path.join(MEDIA_STORE_DIR, 'videos', 'manifest.json');
  const voiceReportPath = path.join(MEDIA_STORE_DIR, 'voice-comparison', 'comparison-report.json');
  let mediaManifest: any = null;
  let voiceReport: any = null;

  try {
    if (fs.existsSync(manifestPath)) mediaManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch { /* ignore */ }
  try {
    if (fs.existsSync(voiceReportPath)) voiceReport = JSON.parse(fs.readFileSync(voiceReportPath, 'utf-8'));
  } catch { /* ignore */ }

  const reviews: Record<string, EpisodeQaReviewState> = {};
  for (const ep of INITIAL_CARTOON_EPISODES) {
    reviews[ep.id] = storage.cartoonQaReviews[ep.id] || createDefaultQaReview(ep.id);
  }
  return res.json({ success: true, reviews, mediaManifest, voiceReport });
});

app.post('/api/cartoon/reviews/:episodeId', writeRateLimit, (req, res) => {
  const { episodeId } = req.params;
  if (!INITIAL_CARTOON_EPISODES.some((ep) => ep.id === episodeId)) {
    return res.status(404).json({ error: 'الحلقة غير موجودة في قائمة المراجعة.' });
  }
  const current = storage.cartoonQaReviews[episodeId] || createDefaultQaReview(episodeId);
  const { checklist, reviewers } = req.body || {};

  if (checklist && typeof checklist === 'object') {
    for (const k of Object.keys(current.checklist) as Array<keyof typeof current.checklist>) {
      if (typeof checklist[k] === 'boolean') {
        current.checklist[k] = checklist[k];
      }
    }
  }
  if (Array.isArray(reviewers)) {
    current.reviewers = current.reviewers.map((slotItem) => {
      const incoming = reviewers.find((r: any) => Number(r?.slot) === slotItem.slot);
      if (!incoming) return slotItem;
      const nextApproved = typeof incoming.approved === 'boolean' ? incoming.approved : slotItem.approved;
      return {
        ...slotItem,
        reviewerName: typeof incoming.reviewerName === 'string' ? incoming.reviewerName.trim().slice(0, 60) : slotItem.reviewerName,
        approved: nextApproved,
        notes: typeof incoming.notes === 'string' ? incoming.notes.trim().slice(0, 300) : slotItem.notes,
        reviewedAt: nextApproved ? (slotItem.reviewedAt || Date.now()) : undefined,
      };
    });
  }
  current.updatedAt = Date.now();
  storage.cartoonQaReviews[episodeId] = current;
  saveStorage();
  return res.json({ success: true, review: current });
});

app.post('/api/cartoon/tts', async (req, res) => {
  try {
    const { text, mood } = req.body;
    const rawClean = typeof text === 'string' ? text.trim().slice(0, 800) : '';
    const cleanText = prepareArabicTextForTts(rawClean);
    if (!cleanText) {
      return res.status(400).json({ error: 'النص المطلوب تحويله إلى صوت غير موجود.' });
    }

    const voiceMood = mood === 'warning' ? 'warning' : mood === 'curious' ? 'curious' : 'cheerful';
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${voiceMood}:${cleanText}`)
      .digest('hex');

    const ttsDiskCacheDir = path.join(DATA_DIR, 'tts-cache');
    if (!fs.existsSync(ttsDiskCacheDir)) fs.mkdirSync(ttsDiskCacheDir, { recursive: true });
    const diskFile = path.join(ttsDiskCacheDir, `${cacheKey}.wav`);

    const cached = cartoonTtsCache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, audioBase64: cached, mimeType: 'audio/wav', cached: true });
    }
    if (fs.existsSync(diskFile)) {
      const diskBase64 = fs.readFileSync(diskFile).toString('base64');
      cartoonTtsCache.set(cacheKey, diskBase64);
      return res.json({ success: true, audioBase64: diskBase64, mimeType: 'audio/wav', cached: true });
    }

    const styleMap: Record<string, string> = {
      cheerful:
        'Warm, authentic, cheerful Omani Arabic agricultural mascot speaking smoothly, clearly, and expressively like a real human guide at a comfortable moderate pace',
      curious:
        'Expressive, natural, crystal-clear Arabic educational narrator with warm curiosity and clear pronunciation for Omani farmers',
      warning:
        'Warm, caring, steady Arabic agricultural advisor speaking clearly with gentle, reassuring emphasis',
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

    let base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'لم يرجع محرك الصوت بيانات صوتية صالحة.' });
    }

    // Master dynamic TTS audio cleanly to -16 LUFS with studio clarity EQ
    try {
      const rawTmp = path.join(ttsDiskCacheDir, `${cacheKey}.raw.wav`);
      fs.writeFileSync(rawTmp, Buffer.from(base64Audio, 'base64'));
      const normRes = spawnSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-y',
          '-i',
          rawTmp,
          '-af',
          'highpass=f=75,equalizer=f=2800:width_type=h:width=1400:g=1.4,loudnorm=I=-16:TP=-1.5:LRA=11',
          '-ar',
          '44100',
          diskFile,
        ],
        { encoding: 'utf-8', timeout: 15000 }
      );
      if (normRes.status === 0 && fs.existsSync(diskFile)) {
        base64Audio = fs.readFileSync(diskFile).toString('base64');
      } else {
        fs.writeFileSync(diskFile, Buffer.from(base64Audio, 'base64'));
      }
      if (fs.existsSync(rawTmp)) fs.unlinkSync(rawTmp);
    } catch {
      try { fs.writeFileSync(diskFile, Buffer.from(base64Audio, 'base64')); } catch { /* ignore */ }
    }

    if (cartoonTtsCache.size >= 40) {
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

app.post('/api/cartoon/generate-episode', aiRateLimit, async (req, res) => {
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

    const beatDefaultTitles = ['مدخل القصة', 'تشخيص المشكلة', 'الخطوات العملية', 'الخلاصة والتطبيق'];
    const episode = {
      id: `ep-custom-${Date.now()}`,
      title: parsed.title || cleanTopic,
      category: parsed.category || 'مكافحة الآفات',
      durationLabel: '1:05 د',
      takeaway: parsed.takeaway || 'المتابعة المستمرة تحمي المحصول وتزيد الإنتاج.',
      isCustom: true,
      scenes: scenes.map((sc: any, idx: number) => ({
        id: `cs-${idx + 1}`,
        sceneHeading: (sc.sceneHeading || beatDefaultTitles[idx] || 'نقطة إرشادية').replace(/^المشهد\s+\S+[:\-]?\s*/, ''),
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
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
      },
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`صديق المزارع (الإصدار الاحترافي 2026) يعمل على المنفذ: http://localhost:${PORT}`);
  });
}

setupVite();
