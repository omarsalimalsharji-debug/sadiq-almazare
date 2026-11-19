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
import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
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
import { OMANI_DATE_PALM_DIAGNOSTIC_GUIDE } from './src/data/omaniDatePalmDiagnosticGuide.ts';
import { OMANI_FIELD_CROP_DIAGNOSTIC_GUIDE } from './src/data/omaniFieldCropDiagnosticGuide.ts';
import { DEFAULT_SEASONAL_CONFIG, SeasonalConfig } from './src/utils/islamicCalendar.ts';
import { prepareArabicTextForTts } from './src/utils/arabicPronunciation.ts';
import { INITIAL_CARTOON_EPISODES } from './src/data/cartoonEpisodesData.ts';
import type { EpisodeQaReviewState } from './src/data/voiceEvaluationData.ts';
import {
  ALL_OMAN_WILAYATS,
  OMAN_ADMINISTRATIVE_DATA,
  findNearestOmanLocation,
  matchOmanLocationByNames,
} from './src/data/omanLocationsData.ts';

dotenv.config();

// Firebase Admin is required to verify farmer identity for private calendar data.
// Configure FIREBASE_SERVICE_ACCOUNT_JSON in the server environment (never commit this secret).
let firebaseAdminAuth: ReturnType<typeof getAdminAuth> | null = null;
try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const adminApp = initializeAdminApp({ credential: cert(serviceAccount) }, 'sadiq-almazare-admin');
    firebaseAdminAuth = getAdminAuth(adminApp);
  }
} catch (error) {
  console.error('Firebase Admin initialization failed; private farmer APIs will remain locked.');
}

interface FarmerAuthenticatedRequest extends express.Request {
  farmerUid?: string;
}

async function requireFarmerAuth(req: FarmerAuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  if (!firebaseAdminAuth) {
    return res.status(503).json({ success: false, error: 'خدمة الحسابات غير مهيأة حالياً. يرجى المحاولة لاحقاً.' });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'يرجى تسجيل الدخول بحساب المزارع لحفظ التذكيرات.' });
  }
  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(token);
    req.farmerUid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'انتهت جلسة الحساب أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول مجدداً.' });
  }
}

function optionalFarmerAuth(req: FarmerAuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return next();
  if (!firebaseAdminAuth) {
    return res.status(503).json({ success: false, error: 'خدمة الحسابات غير مهيأة حالياً.' });
  }
  firebaseAdminAuth.verifyIdToken(token).then((decoded) => {
    req.farmerUid = decoded.uid;
    next();
  }).catch(() => res.status(401).json({ success: false, error: 'رمز الحساب غير صالح.' }));
}

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

export interface CalendarReminder {
  id: string;
  userId: string;
  cropId: string;
  cropName: string;
  monthIndex: number;
  phase: string;
  cadence: 'daily_dawn' | 'every_2_days' | 'weekly' | 'monthly_start';
  governorate: string;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: number;
  lastDispatchedAt?: number;
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
  calendarReminders: CalendarReminder[];
  visitors: Record<string, VisitorRecord>;
  dailyVisitIds: Record<string, string[]>;
  seasonalConfig: SeasonalConfig;
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
  calendarReminders: [],
  visitors: {},
  dailyVisitIds: {},
  seasonalConfig: { ...DEFAULT_SEASONAL_CONFIG },
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
      calendarReminders: Array.isArray(parsed.calendarReminders) ? parsed.calendarReminders : [],
      visitors: parsed.visitors && typeof parsed.visitors === 'object' ? parsed.visitors : {},
      dailyVisitIds: parsed.dailyVisitIds && typeof parsed.dailyVisitIds === 'object' ? parsed.dailyVisitIds : {},
      seasonalConfig: { ...DEFAULT_SEASONAL_CONFIG, ...(parsed.seasonalConfig || {}) },
      cartoonQaReviews: parsed.cartoonQaReviews && typeof parsed.cartoonQaReviews === 'object' ? parsed.cartoonQaReviews : {}
    };
    // Ensure built-in books (especially the Samail book) stay synced
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

// --- 1. Unified Oman Reverse Geocoding & Live Weather API (Open-Meteo + OSM Nominatim) ---
const reverseGeoCache = new Map<string, { resolved: any; source: string; expiry: number }>();

app.get('/api/location/reverse', async (req, res) => {
  const latRaw = Number(req.query.lat);
  const lonRaw = Number(req.query.lon);

  if (!Number.isFinite(latRaw) || !Number.isFinite(lonRaw) || latRaw < -90 || latRaw > 90 || lonRaw < -180 || lonRaw > 180) {
    return res.status(400).json({
      success: false,
      error: 'إحداثيات الموقع غير صالحة. يرجى التأكد من خط العرض وخط الطول.',
    });
  }

  const cacheKey = `${latRaw.toFixed(3)},${lonRaw.toFixed(3)}`;
  const now = Date.now();
  const cached = reverseGeoCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return res.json({ success: true, cached: true, source: cached.source, resolved: cached.resolved });
  }

  const fallback = findNearestOmanLocation(latRaw, lonRaw);
  const withinOmanBounds = latRaw >= 16.4 && latRaw <= 26.6 && lonRaw >= 51.8 && lonRaw <= 60.0;

  let resolved = {
    governorateId: fallback.governorate.id,
    governorate: fallback.governorate.name,
    governorateEn: fallback.governorate.nameEn,
    wilayatId: fallback.wilayat.id,
    wilayat: fallback.wilayat.name,
    wilayatEn: fallback.wilayat.nameEn,
    village: fallback.wilayat.villages[0] || fallback.wilayat.name,
    lat: Number(latRaw.toFixed(5)),
    lon: Number(lonRaw.toFixed(5)),
    agroZone: fallback.wilayat.agroZone,
    withinOman: withinOmanBounds,
    distanceKm: Math.round(fallback.distanceKm * 10) / 10,
  };
  let source = 'oman-administrative-nearest';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latRaw}&lon=${lonRaw}&zoom=14&addressdetails=1&accept-language=ar`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'SadiqAlMuzari/2026 (Oman Agricultural Platform)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData?.address || {};
      const countryCode = String(addr.country_code || '').toLowerCase();
      const isOmanNom = countryCode === 'om' || withinOmanBounds;

      const rawGov = String(addr.state || addr.region || addr.province || '');
      const rawWil = String(addr.county || addr.city || addr.town || addr.state_district || '');
      const rawVillage = String(
        addr.village || addr.hamlet || addr.suburb || addr.neighbourhood || addr.locality || nomData?.name || ''
      ).trim();

      if (isOmanNom) {
        const matched = matchOmanLocationByNames(rawGov, rawWil, rawVillage);
        const distanceToMatched =
          Math.hypot(latRaw - matched.wilayat.lat, lonRaw - matched.wilayat.lon);
        const bestMatch =
          distanceToMatched <= 0.85 ? matched : fallback;

        resolved = {
          governorateId: bestMatch.governorate.id,
          governorate: bestMatch.governorate.name,
          governorateEn: bestMatch.governorate.nameEn,
          wilayatId: bestMatch.wilayat.id,
          wilayat: bestMatch.wilayat.name,
          wilayatEn: bestMatch.wilayat.nameEn,
          village:
            rawVillage && rawVillage.length >= 2 && rawVillage.length <= 60
              ? rawVillage
              : bestMatch.wilayat.villages[0] || bestMatch.wilayat.name,
          lat: Number(latRaw.toFixed(5)),
          lon: Number(lonRaw.toFixed(5)),
          agroZone: bestMatch.wilayat.agroZone,
          withinOman: true,
          distanceKm: 0,
        };
        source = 'nominatim+oman-admin';
      } else {
        resolved.withinOman = false;
        source = 'out-of-oman-fallback';
      }
    }
  } catch {
    // Graceful Haversine fallback on Nominatim timeout/offline
  }

  if (reverseGeoCache.size >= 150) {
    const oldest = reverseGeoCache.keys().next().value;
    if (oldest) reverseGeoCache.delete(oldest);
  }
  reverseGeoCache.set(cacheKey, {
    resolved,
    source,
    expiry: now + 15 * 60 * 1000,
  });

  return res.json({ success: true, cached: false, source, resolved });
});

const weatherCache = new Map<string, { data: any; expiry: number }>();

app.get('/api/weather/live', async (req, res) => {
  const govId = (req.query.govId as string) || 'muscat';
  const wilayatId = typeof req.query.wilayatId === 'string' ? req.query.wilayatId.trim() : '';
  const wilayatNameQuery = typeof req.query.wilayatName === 'string' ? req.query.wilayatName.trim() : '';
  const villageNameQuery = typeof req.query.villageName === 'string' ? req.query.villageName.trim() : '';
  const latQuery = req.query.lat !== undefined ? Number(req.query.lat) : NaN;
  const lonQuery = req.query.lon !== undefined ? Number(req.query.lon) : NaN;

  const adminGov =
    OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === govId) ||
    OMANI_GOVERNORATES.find((g) => g.id === govId) ||
    OMANI_GOVERNORATES[0];
  const matchedWil =
    (wilayatId && ALL_OMAN_WILAYATS.find((w) => w.id === wilayatId)) ||
    (wilayatNameQuery && ALL_OMAN_WILAYATS.find((w) => w.name === wilayatNameQuery)) ||
    null;

  const targetLat = Number.isFinite(latQuery)
    ? latQuery
    : matchedWil
      ? matchedWil.lat
      : adminGov.lat;
  const targetLon = Number.isFinite(lonQuery)
    ? lonQuery
    : matchedWil
      ? matchedWil.lon
      : adminGov.lon;

  const displayGov = matchedWil
    ? OMAN_ADMINISTRATIVE_DATA.find((g) => g.id === matchedWil.governorateId) || adminGov
    : adminGov;
  const legacyGov = OMANI_GOVERNORATES.find((g) => g.id === displayGov.id) || OMANI_GOVERNORATES[0];
  const displayWilayat = wilayatNameQuery || matchedWil?.name || legacyGov.wilayat;
  const displayVillage = villageNameQuery || matchedWil?.villages?.[0] || '';

  const cacheKey = `${displayGov.id}:${displayWilayat}:${targetLat.toFixed(2)},${targetLon.toFixed(2)}`;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return res.json({ success: true, live: { ...cached.data, village: displayVillage || cached.data.village } });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FMuscat`;
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
      generatedAlerts.push(`موجة حرارة مرتفعة (${temp}°م) في ${displayWilayat}: ينصح بزيادة وتيرة الري ليلاً وتظليل المشاتل والبيوت المحمية.`);
    } else if (temp <= 10) {
      generatedAlerts.push(`انخفاض درجات الحرارة (${temp}°م) في ${displayWilayat}: تنبيه لمزارعي المرتفعات والجبل الأخضر لحماية المحاصيل الحساسة من الصقيع.`);
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
      governorateId: displayGov.id,
      governorate: displayGov.name,
      governorateEn: displayGov.nameEn,
      wilayat: displayWilayat,
      village: displayVillage,
      lat: Number(targetLat.toFixed(4)),
      lon: Number(targetLon.toFixed(4)),
      temperature: temp,
      humidity,
      windSpeed,
      rain,
      recordedAt: current.time || new Date().toISOString(),
      alerts: generatedAlerts,
      source: 'بيانات حية مباشرة من محطات الأرصاد (Open-Meteo)',
      climateNote: legacyGov.climateNote,
    };

    // Cache for 10 minutes
    if (weatherCache.size >= 120) {
      const oldest = weatherCache.keys().next().value;
      if (oldest) weatherCache.delete(oldest);
    }
    weatherCache.set(cacheKey, { data: payload, expiry: now + 10 * 60 * 1000 });
    return res.json({ success: true, live: payload });
  } catch (err: any) {
    console.warn('Weather fetch error:', err.message);
    // Graceful fallback with governorate/wilayat standard climate
    return res.json({
      success: true,
      live: {
        governorateId: displayGov.id,
        governorate: displayGov.name,
        governorateEn: displayGov.nameEn,
        wilayat: displayWilayat,
        village: displayVillage,
        lat: Number(targetLat.toFixed(4)),
        lon: Number(targetLon.toFixed(4)),
        temperature: 28,
        humidity: 55,
        windSpeed: 14,
        rain: 0,
        alerts: ['الطقس مستقر ومناسب للخدمات الزراعية المعتادة.'],
        source: 'بيانات تقديرية لمناخ المحافظة',
        climateNote: legacyGov.climateNote,
      },
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
  governorate?: string;
  wilayat?: string;
  village?: string;
  agroZone?: string;
  observations?: string;
  modeHint?: 'auto' | 'plant' | 'insect';
}) {
  const {
    images,
    cropName = '',
    governorate = '',
    wilayat = '',
    village = '',
    agroZone = '',
    observations = '',
    modeHint = 'auto',
  } = params;

  const hash = crypto.createHash('sha256');
  images.forEach((img) => hash.update(img.cleanBase64));
  hash.update(`|${cropName}|${governorate}|${wilayat}|${village}|${agroZone}|${observations}|${modeHint}`);
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

${OMANI_DATE_PALM_DIAGNOSTIC_GUIDE}

${OMANI_FIELD_CROP_DIAGNOSTIC_GUIDE}

إرشادات تفريقية للمحاصيل العُمانية (قرائن للفحص وليست تشخيصاً مؤكداً):
- نخيل التمر: افحص موضع الإصابة ونمط انتشارها. وجود ثقوب أو نشارة ليفية أو إفرازات صمغية أو رائحة تخمر قد يثير الاشتباه في إصابة حفارات الجذع مثل سوسة النخيل، لكنه لا يكفي وحده لتأكيد النوع أو نفي الإصابة عند غياب العلامات. أما الندوة العسلية والطبقة السوداء السطحية على السعف فقد تتوافق مع آفات ماصة مثل دوباس النخيل، ويجب التمييز بينها وبين الغبار أو العفن السطحي وأسباب أخرى. لا تستنتج إصابة داخلية أو تحدد شدة الإصابة من صورة خارجية واحدة.
- الحمضيات: ميّز بين الأنفاق المتعرجة داخل نصل الورقة الحديثة، والبقع المرتفعة أو المتفلنة، والاصفرار المنتظم أو بين العروق. لا تخلط بين ضرر الحشرات أو التبقعات المرضية ونقص العناصر أو الملوحة أو الإجهاد المائي.
- الطماطم والخيار: قارن شكل البقع وموقعها على الورقة ووجود نمو فطري أو هالة أو اصفرار بين العروق. قد تتشابه أعراض البياض الدقيقي والبياض الزغبي والتبقعات ونقص العناصر؛ لا تحدد المسبب من لون البقعة وحده.
- البصل والثوم والمحاصيل الحقلية: قيّم شكل الآفة على الورقة أو الساق أو السنابل، وعمر الجزء المصاب، وانتشار الأعراض في الحقل. لا تنسب اصفرار الأوراق أو جفاف الأطراف تلقائياً إلى مرض معدٍ؛ فقد ينتج عن الري أو الملوحة أو التغذية أو الحرارة.
- السياق العُماني: استخدم الولاية والنطاق المناخي والموسم ونوع الري كقرائن مساعدة فقط، ولا تعتبر وجود محصول أو آفة في منطقة عُمانية دليلاً على أن العينة مصابة بها. إذا لم تظهر علامة فارقة، اعرض احتمالات محدودة أو اطلب صوراً إضافية للوجهين العلوي والسفلي للورقة وقاعدة النبات أو الثمرة، ولا تخترع انتشاراً محلياً أو بيانات إحصائية.


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
   - تقدير جنس الحشرة (ذكر/أنثى) ميزة اختيارية شديدة التحفظ: استخدم insectSex = "male" أو "female" فقط إذا كان النوع معروفاً وتظهر في الصورة علامة تشريحية فارقة موثوقة بوضوح، مثل اختلاف واضح في قرون الاستشعار أو شكل البطن أو آلة وضع البيض أو أعضاء التزاوج. لا تستنتج الجنس من اللون أو الحجم وحدهما، ولا تخمّن من صورة بعيدة أو غير مكتملة. في جميع الحالات غير الحاسمة استخدم insectSex = "undetermined" واكتب في insectSexEvidence سبب عدم إمكان التمييز أو العلامة المرئية التي دعمت التقدير. لا تجعل تحديد الجنس شرطاً لتشخيص نوع الحشرة.
   - إذا كانت الصورة لنبات أو ورقة أو ثمرة: اضبط detectedSubject = "plant"، وميّز بدقة بين:
     * "مرض فطري" / "مرض بكتيري" / "مرض فيروسي" (problemType = "مرض")
     * "نقص عناصر" (problemType = "نقص عناصر")
     * "إجهاد بيئي" مثل الإجهاد الحراري أو المائي أو الملوحة (problemType = "مرض")
     * "نبات سليم" (problemType = "سليم"، severity = "منخفضة")

3. الأمانة العلمية في نسبة الثقة والتفاصيل:
   - أعطِ confidenceScore رقماً من 0 إلى 100 يعبّر عن مدى ترجيح التشخيص المبدئي نفسه، وليس مجرد وضوح الصورة. قيّم نوعية العلامات ومدى تميّزها عن الحالات المشابهة واتساقها مع المحصول والسياق. إذا كانت الأعراض عامة أو تتشابه مع أسباب متعددة، اخفض النسبة بوضوح حتى لو كانت الصورة حادة، ولا ترفعها لمجرد جودة التصوير.
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

  const locationLabel = [governorate, wilayat ? `ولاية ${wilayat}` : '', village]
    .filter(Boolean)
    .join(' · ') || 'سلطنة عُمان';

  parts.push({
    text: `معلومات إضافية اختيارية من المزارع:
- المحصول المذكور (إن وجد): ${cropName || 'غير محدد — استنتجه من الصورة إن أمكن'}
- الموقع الزراعي في سلطنة عُمان: ${locationLabel}
- النطاق المناخي الزراعي: ${agroZone || 'عُمان العام'}
- ملاحظات المزارع: ${observations || 'لا توجد ملاحظات نصية — اعتمد على تحليل الصورة'}
- ${hintText}

راعِ البيئة المناخية للمنطقة المذكورة عند كتابة omaniFarmingNote والنصائح الوقائية، وحلل الصورة بدقة علمية الآن وأخرج JSON فقط.`,
  });

  // Keep Gemini 4 Hydrogen as primary; use stable Gemini 3.8 Flash only when the primary is temporarily unavailable.
  const generateDiagnosis = (model: string) => ai.models.generateContent({
    model,
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
          insectSex: { type: Type.STRING, enum: ['male', 'female', 'undetermined'] },
          insectSexEvidence: { type: Type.STRING },
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
          'insectSex',
          'insectSexEvidence',
          'insectTargetCrops',
          'insectDamage',
          'insectLifeCycle',
          'insectControlMethod',
          'insectPrevention',
        ],
      },
    },
  });

  let response: any = null;
  let lastModelError: any = null;
  const diagnosisModels = ['gemini-4-hydrogen', 'gemini-3.8-flash'];

  for (let modelIndex = 0; modelIndex < diagnosisModels.length; modelIndex++) {
    const model = diagnosisModels[modelIndex];
    const attempts = modelIndex === 0 ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        response = await generateDiagnosis(model);
        break;
      } catch (error: any) {
        lastModelError = error;
        const status = Number(error?.status || error?.code || error?.error?.code);
        const errorText = String(error?.message || error?.error?.message || '');
        const transientFailure =
          status === 429 ||
          [500, 502, 503, 504].includes(status) ||
          /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily unavailable|overloaded/i.test(errorText);

        if (!transientFailure) throw error;
        console.warn(`[AgriVision] ${model} temporarily unavailable (attempt ${attempt + 1}/${attempts}); ${modelIndex === 0 ? 'retrying or switching to fallback' : 'fallback exhausted'}.`);

        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }
    }
    if (response) break;
  }

  if (!response) {
    throw lastModelError || new Error('خدمة التشخيص غير متاحة مؤقتاً.');
  }

  const parsed = JSON.parse(response.text || '{}');

  const isAgri = parsed.isAgricultureRelated === true;
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

  // Never expose model-generated pesticide names or rates as approved in Oman.
  // Enable chemical recommendations only after a verified, current Omani registration
  // catalogue is integrated and the crop/pest/product match can be checked server-side.
  const allowPesticide = false;

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
      : 'لم تُعرض توصية بمبيد أو جرعة؛ إذ يجب التحقق أولاً من تسجيل المنتج واعتماده في سلطنة عُمان وملاءمته للمحصول والآفة. راجع المهندس الزراعي أو دائرة التنمية الزراعية، واتبع ملصق المنتج المعتمد عند وصفه.';

  const normalizedDiagnosis = {
    isAgricultureRelated: isAgri,
    detectedSubject: needsClearerPhoto ? 'unclear' : detectedSubject,
    diagnosisCategory,
    problemType: needsClearerPhoto ? 'غير محدد' : problemType,
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
    conditionSummary: needsClearerPhoto
      ? 'لم يتمكن النظام من التحقق من أعراض أو معالم زراعية واضحة في الصورة المقدمة.'
      : ((parsed.conditionSummary || '').trim() || 'تم تحليل العلامات المرئية الظاهرة في الصورة.'),
    visibleSymptomsList: needsClearerPhoto ? [] : visibleSymptomsArr,
    visibleSymptoms: needsClearerPhoto
      ? 'لم تُرصد علامات كافية تسمح بوصف الأعراض.'
      : (visibleSymptomsText || 'لم تُرصد أعراض واضحة في الصورة.'),
    causes: needsClearerPhoto ? [] : causesArr,
    severity: needsClearerPhoto ? 'غير محددة' : severity,
    severityLabel: needsClearerPhoto
      ? 'غير محددة — لا يمكن تقدير الشدة من الصورة'
      : insectNature === 'beneficial'
        ? 'غير ضارة — حشرة نافعة'
        : (parsed.severityLabel || severity),
    treatmentSteps: needsClearerPhoto ? [] : treatmentStepsArr,
    organicRemedy: needsClearerPhoto
      ? 'يرجى إعادة تصوير الجزء المصاب بوضوح قبل اختيار أي إجراء علاجي.'
      : ((parsed.organicRemedy || '').trim() || treatmentStepsArr.join(' — ') || 'اتباع الإجراءات الوقائية الزراعية الملائمة ومراقبة المحصول.'),
    preventionTips: needsClearerPhoto ? [] : preventionTipsArr,
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
    whenToContactEngineer: needsClearerPhoto
      ? 'أعد التصوير من مسافة قريبة وفي ضوء النهار، واستشر المهندس الزراعي إذا كانت الحالة تتفاقم أو كان الضرر واسعاً.'
      : ((parsed.whenToContactEngineer || '').trim() || 'تواصل مع المهندس الزراعي أو دائرة التنمية الزراعية عند تزايد الأعراض سريعاً، أو في حال التباس التشخيص، أو قبل اتخاذ قرار الرش العلاجي الواسع.'),
    omaniFarmingNote: needsClearerPhoto
      ? ''
      : ((parsed.omaniFarmingNote || '').trim() ||
        `راعِ ظروف الحرارة والرطوبة في ${locationLabel} ونفّذ عمليات الفحص والرش (إن لزم) في الصباح الباكر أو قبل الغروب.`), 
    advisoryNote: MANDATORY_ADVISORY,
    possibleConditions: needsClearerPhoto ? [] : possibleConditionsArr,
    insectDetails:
      detectedSubject === 'insect' && !needsClearerPhoto
        ? {
            nature: insectNature,
            sex: ['male', 'female', 'undetermined'].includes(parsed.insectSex) ? parsed.insectSex : 'undetermined',
            sexEvidence: (parsed.insectSexEvidence || '').trim() || 'لا تظهر في الصورة علامة تشريحية كافية لتحديد الجنس بثقة.',
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
    pestName: needsClearerPhoto ? '' : (parsed.problemName || ''),
    severityLevel: needsClearerPhoto
      ? 'غير محددة — لا يمكن تقدير الشدة من الصورة'
      : severity === 'عالية' ? 'شديد الخطورة' : severity === 'متوسطة' ? 'متوسط الخطورة' : 'قليل الضرر',
    affectedParts: needsClearerPhoto ? [] : insectTargetCropsArr,
    lifeCycleNote: needsClearerPhoto ? '' : (parsed.insectLifeCycle || ''),
    organicAndBiologicalControl: needsClearerPhoto ? '' : (parsed.insectControlMethod || parsed.organicRemedy || ''),
    safeChemicalOptions: needsClearerPhoto ? '' : chemicalRemedyCombined,
    immediateAction: needsClearerPhoto ? 'إعادة التصوير بوضوح قبل اتخاذ إجراء علاجي.' : (treatmentStepsArr[0] || parsed.organicRemedy || ''),
    officialDisclaimer: MANDATORY_ADVISORY,
    omaniGuidance: needsClearerPhoto ? '' : (parsed.omaniFarmingNote || ''),
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
    const {
      images,
      imageBase64,
      cropName,
      hostCrop,
      symptoms,
      pestDescription,
      observations,
      governorate,
      wilayat,
      village,
      agroZone,
      modeHint,
    } = req.body || {};

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
    const cleanGov = String(governorate || '').trim().slice(0, 80);
    const cleanWilayat = String(wilayat || '').trim().slice(0, 100);
    const cleanVillage = String(village || '').trim().slice(0, 100);
    const cleanAgroZone = String(agroZone || '').trim().slice(0, 60);
    const cleanObs = String(observations || symptoms || pestDescription || '').trim().slice(0, 1000);
    const effectiveMode: 'auto' | 'plant' | 'insect' =
      modeHint === 'insect' || modeHint === 'plant' || modeHint === 'auto' ? modeHint : defaultModeHint;

    const { diagnosis, fromCache } = await runUnifiedAgriVisionDiagnosis({
      images: validImages,
      cropName: cleanCrop,
      governorate: cleanGov,
      wilayat: cleanWilayat,
      village: cleanVillage,
      agroZone: cleanAgroZone,
      observations: cleanObs,
      modeHint: effectiveMode,
    });

    return res.json({ success: true, cached: fromCache, diagnosis });
  } catch (error: any) {
    console.error('Smart agricultural diagnosis error:', error);
    const message = String(error?.message || error?.error?.message || '');
    const status = Number(error?.status || error?.code || error?.error?.code);
    const isUnavailable =
      status === 429 ||
      [500, 502, 503, 504].includes(status) ||
      /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily unavailable|overloaded|quota/i.test(message);

    if (isUnavailable) res.setHeader('Retry-After', '5');
    return res.status(isUnavailable ? 503 : 500).json({
      error: isUnavailable
        ? 'خدمة التشخيص مشغولة مؤقتاً حتى بعد تجربة النموذج الاحتياطي. لم نعتمد تشخيصاً لهذه الصورة؛ يرجى إعادة المحاولة بعد قليل.'
        : 'تعذر إتمام التشخيص. لم نعتمد نتيجة غير مكتملة؛ يرجى المحاولة مرة أخرى أو استخدام صورة أوضح.',
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
app.get('/api/notifications', (req, res) => {
  const governorate = String(req.query.governorate || '').replace(/^محافظة\s*/, '').trim();
  const visible = storage.notifications.filter((n: any) => {
    if (n.targetUserId) return false;
    const target = String(n.targetGovernorate || '').replace(/^محافظة\s*/, '').trim();
    const nationwide = !target || /كافة المحافظات|كافة محافظات|جميع المحافظات|جميع محافظات|سلطنة عُمان/i.test(target);
    return nationwide || !governorate || target.includes(governorate) || governorate.includes(target);
  });
  return res.setHeader('Cache-Control', 'no-store').json({ success: true, notifications: visible.map((notification: any) => ({ ...notification, read: false })) });
});

// Read state is device-local; never mark a shared broadcast as read for every farmer.
app.post('/api/notifications/read-all', (_req, res) => {
  return res.json({ success: true });
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

// --- 9C. Farmer-owned Agricultural Calendar Reminders & Notifications ---
app.get('/api/calendar/reminders', requireFarmerAuth, (req: FarmerAuthenticatedRequest, res) => {
  const list = storage.calendarReminders.filter((r) => r.userId === req.farmerUid);
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
  const unreadNotificationsCount = storage.notifications.filter((n: any) => !n.read && (!n.targetUserId || n.targetUserId === req.farmerUid)).length;
  return res.json({ success: true, reminders: sorted, unreadNotificationsCount });
});

app.post('/api/calendar/reminders', requireFarmerAuth, writeRateLimit, (req: FarmerAuthenticatedRequest, res) => {
  const userId = req.farmerUid!;
  const cropId = String(req.body?.cropId || '').trim().slice(0, 60);
  const cropName = String(req.body?.cropName || '').trim().slice(0, 80);
  const monthIndexRaw = Number(req.body?.monthIndex);
  const monthIndex = Number.isInteger(monthIndexRaw) && monthIndexRaw >= 0 && monthIndexRaw <= 11
    ? monthIndexRaw
    : new Date().getMonth();
  const phase = String(req.body?.phase || 'planting').trim().slice(0, 40);
  const cadenceRaw = String(req.body?.cadence || 'weekly');
  const cadence: CalendarReminder['cadence'] = ['daily_dawn', 'every_2_days', 'weekly', 'monthly_start'].includes(cadenceRaw)
    ? (cadenceRaw as CalendarReminder['cadence'])
    : 'weekly';
  const governorate = String(req.body?.governorate || 'سلطنة عُمان').trim().slice(0, 80);
  const title = String(req.body?.title || '').trim().slice(0, 140);
  const message = String(req.body?.message || '').trim().slice(0, 600);
  const pushImmediately = Boolean(req.body?.pushImmediately);

  if (!cropId || !cropName || !title || !message) {
    return res.status(400).json({ error: 'بيانات التنبيه الزراعي غير مكتملة.' });
  }

  const now = Date.now();
  const existingIdx = storage.calendarReminders.findIndex(
    (r) => r.userId === userId && r.cropId === cropId && r.monthIndex === monthIndex
  );

  let reminder: CalendarReminder;
  if (existingIdx !== -1) {
    reminder = {
      ...storage.calendarReminders[existingIdx],
      cropName, phase, cadence, governorate, title, message,
      enabled: true,
      lastDispatchedAt: pushImmediately ? now : storage.calendarReminders[existingIdx].lastDispatchedAt,
    };
    storage.calendarReminders[existingIdx] = reminder;
  } else {
    reminder = {
      id: `calrem-${now}-${crypto.randomBytes(4).toString('hex')}`,
      userId, cropId, cropName, monthIndex, phase, cadence, governorate, title, message,
      enabled: true, createdAt: now,
      lastDispatchedAt: pushImmediately ? now : undefined,
    };
    storage.calendarReminders.unshift(reminder);
    storage.calendarReminders = storage.calendarReminders.slice(0, 200);
  }

  let createdNotification: any = null;
  if (pushImmediately) {
    createdNotification = {
      id: `notif-cal-${now}-${crypto.randomBytes(4).toString('hex')}`,
      title, message, type: 'crop_advice',
      targetGovernorate: governorate, timestamp: now, read: false,
      calendarKey: `manual-${userId}-${cropId}-${monthIndex}`,
      targetUserId: userId,
    };
    storage.notifications.unshift(createdNotification);
    storage.notifications = storage.notifications.slice(0, 150);
  }

  saveStorage();
  const unreadCount = storage.notifications.filter((n: any) => !n.read && (!n.targetUserId || n.targetUserId === userId)).length;
  return res.status(existingIdx !== -1 ? 200 : 201).json({
    success: true, reminder, notification: createdNotification, unreadCount,
  });
});

app.patch('/api/calendar/reminders/:id', requireFarmerAuth, writeRateLimit, (req: FarmerAuthenticatedRequest, res) => {
  const reminder = storage.calendarReminders.find((r) => r.id === req.params.id && r.userId === req.farmerUid);
  if (!reminder) return res.status(404).json({ error: 'التنبيه المجدول غير موجود.' });

  if (typeof req.body?.enabled === 'boolean') {
    reminder.enabled = req.body.enabled;
  }
  if (typeof req.body?.cadence === 'string' &&
    ['daily_dawn', 'every_2_days', 'weekly', 'monthly_start'].includes(req.body.cadence)) {
    reminder.cadence = req.body.cadence as CalendarReminder['cadence'];
  }

  let createdNotification: any = null;
  if (req.body?.dispatchNow === true) {
    const now = Date.now();
    reminder.lastDispatchedAt = now;
    createdNotification = {
      id: `notif-cal-${now}-${crypto.randomBytes(4).toString('hex')}`,
      title: reminder.title, message: reminder.message, type: 'crop_advice',
      targetGovernorate: reminder.governorate, timestamp: now, read: false,
      calendarKey: `dispatch-${req.farmerUid}-${reminder.cropId}-${reminder.monthIndex}`,
      targetUserId: req.farmerUid,
    };
    storage.notifications.unshift(createdNotification);
    storage.notifications = storage.notifications.slice(0, 150);
  }

  saveStorage();
  const unreadCount = storage.notifications.filter((n: any) => !n.read && (!n.targetUserId || n.targetUserId === req.farmerUid)).length;
  return res.json({ success: true, reminder, notification: createdNotification, unreadCount });
});

app.delete('/api/calendar/reminders/:id', requireFarmerAuth, (req: FarmerAuthenticatedRequest, res) => {
  const beforeLen = storage.calendarReminders.length;
  storage.calendarReminders = storage.calendarReminders.filter(
    (r) => !(r.id === req.params.id && r.userId === req.farmerUid)
  );
  if (storage.calendarReminders.length === beforeLen) {
    return res.status(404).json({ error: 'التنبيه المجدول غير موجود.' });
  }
  saveStorage();
  const unreadCount = storage.notifications.filter((n: any) => !n.read && (!n.targetUserId || n.targetUserId === req.farmerUid)).length;
  return res.json({ success: true, unreadCount });
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

// --- 14. Timezone Helper (Asia/Muscat) ---
function getMuscatDayKey(ts = Date.now()): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Muscat' });
}

// --- Stage 2: Educational Cartoon Videos ("مُرشد" - Murshid) ---
const cartoonTtsCache = new Map<string, string>();
let cartoonTtsCooldownUntil = 0;

const MEDIA_STORE_DIR = path.join(__dirname, 'public', 'media');
const LEGACY_MEDIA_STORE_DIR = path.join(__dirname, 'media_store');
app.use('/media', express.static(MEDIA_STORE_DIR, { maxAge: '7d' }));
app.use('/media', express.static(LEGACY_MEDIA_STORE_DIR, { maxAge: '7d' }));

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

function readCartoonMediaManifest(): any | null {
  const manifestPaths = [
    path.join(MEDIA_STORE_DIR, 'videos', 'manifest.json'),
    path.join(LEGACY_MEDIA_STORE_DIR, 'videos', 'manifest.json'),
  ];
  try {
    const manifestPath = manifestPaths.find((candidate) => fs.existsSync(candidate));
    if (manifestPath) return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    // A missing or invalid manifest means no final videos are available yet.
  }
  return null;
}

app.get('/api/cartoon/manifest', (_req, res) => {
  return res.setHeader('Cache-Control', 'no-store').json({
    success: true,
    mediaManifest: readCartoonMediaManifest(),
  });
});

app.get('/api/cartoon/reviews', requireStaff, (_req, res) => {
  const voiceReportPaths = [
    path.join(MEDIA_STORE_DIR, 'voice-comparison', 'comparison-report.json'),
    path.join(LEGACY_MEDIA_STORE_DIR, 'voice-comparison', 'comparison-report.json'),
  ];
  let voiceReport: any = null;
  try {
    const voiceReportPath = voiceReportPaths.find((candidate) => fs.existsSync(candidate));
    if (voiceReportPath) voiceReport = JSON.parse(fs.readFileSync(voiceReportPath, 'utf-8'));
  } catch { /* ignore */ }

  const reviews: Record<string, EpisodeQaReviewState> = {};
  for (const ep of INITIAL_CARTOON_EPISODES) {
    reviews[ep.id] = storage.cartoonQaReviews[ep.id] || createDefaultQaReview(ep.id);
  }
  return res.json({ success: true, reviews, mediaManifest: readCartoonMediaManifest(), voiceReport });
});

app.post('/api/cartoon/reviews/:episodeId', writeRateLimit, requireStaff, (req, res) => {
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

app.post('/api/cartoon/tts', requireStaff, aiRateLimit, async (req, res) => {
  try {
    const { text, mood } = req.body;
    const rawClean = typeof text === 'string' ? text.trim().slice(0, 800) : '';
    const cleanText = prepareArabicTextForTts(rawClean);
    if (!cleanText) {
      return res.status(400).json({ error: 'النص المطلوب تحويله إلى صوت غير موجود.' });
    }

    const voiceMood =
      mood === 'warning'
        ? 'warning'
        : mood === 'curious'
          ? 'curious'
          : mood === 'proud'
            ? 'proud'
            : 'cheerful';
    const cacheKey = crypto
      .createHash('sha256')
      .update(`v6-murshid-gacrux-oman-voice:${voiceMood}:${cleanText}`)
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

    const nowMs = Date.now();
    if (nowMs < cartoonTtsCooldownUntil) {
      return res.json({
        success: false,
        fallback: 'browser_tts',
        quotaExceeded: true,
        retryAfterSec: Math.ceil((cartoonTtsCooldownUntil - nowMs) / 1000),
      });
    }

    const styleMap: Record<string, string> = {
      cheerful:
        'A highly natural, lifelike adult male Arabic voice for an Omani agricultural guide. Warm low-mid register, relaxed Omani/Gulf conversational cadence, authentic human breath and phrasing, varied intonation, gentle smile, natural short pauses, clear but not over-enunciated Arabic. Sound like a real experienced Omani radio presenter speaking directly to one farmer, not an announcer, not a character caricature, never synthetic, metallic, sing-song or robotic. Keep local Omani crop names exactly as written',
      curious:
        'A lifelike adult male Omani/Gulf Arabic agricultural educator, thoughtful and curious but calm. Natural conversational intonation and breathing, precise local crop and pest names, measured human pacing, no artificial emphasis',
      warning:
        'A mature, lifelike male Omani/Gulf Arabic agricultural mentor. Speak as a caring human professional: composed, clear, steady and reassuring, with natural pauses; firm but never alarming',
      proud:
        'A warm, lifelike adult male Omani/Gulf Arabic presenter celebrating a farmer’s success with genuine human joy, relaxed smile, natural vocal variation and clean studio diction',
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
            prebuiltVoiceConfig: { voiceName: 'Gacrux' },
          },
        },
      },
    });

    let base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.json({
        success: false,
        fallback: 'browser_tts',
        quotaExceeded: false,
      });
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
    const msg = String(error?.message || error || '');
    const isQuota =
      error?.status === 429 ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.toLowerCase().includes('quota');
    if (isQuota) {
      const wasActive = Date.now() < cartoonTtsCooldownUntil;
      cartoonTtsCooldownUntil = Date.now() + 10 * 60 * 1000;
      if (!wasActive) {
        console.warn('Cartoon TTS quota limit reached — cooling down 10m and using browser speech fallback.');
      }
      return res.json({
        success: false,
        fallback: 'browser_tts',
        quotaExceeded: true,
        retryAfterSec: 600,
      });
    }
    console.warn('Cartoon TTS temporary fallback:', msg.slice(0, 180));
    return res.json({
      success: false,
      fallback: 'browser_tts',
      quotaExceeded: false,
    });
  }
});

app.post('/api/cartoon/generate-episode', requireStaff, aiRateLimit, async (req, res) => {
  try {
    const { topic } = req.body;
    const cleanTopic = typeof topic === 'string' ? topic.trim().slice(0, 200) : '';
    if (!cleanTopic) {
      return res.status(400).json({ error: 'يرجى كتابة موضوع الحلقة الزراعية المطلوبة.' });
    }

    const systemInstruction = `أنت كاتب سيناريو كرتوني زراعي محترف لبرنامج «مُرشد صديق المزارع» في سلطنة عُمان.
اكتب حلقة توعوية من 4 مشاهد قصيرة ومترابطة باللغة العربية الفصحى المبسطة والروح العُمانية العصرية الدافئة، يشرح فيها «مُرشد» للمزارع العُماني الفكرة بوضوح وبدون تعقيد مع الالتزام بالسلامة الزراعية والمرسوم العُماني 160/2023.
التزم تماماً بإرجاع JSON صالح يطابق المخطط المطلوب فقط:
- كل مشهد له narration (جملتان إلى ثلاث جمل صوتية واضحة ومناسبة للنطق الصوتي السلس).
- subtitle مختصرة ومطابقة لمعنى المشهد للعرض أسفل الشاشة.
- backdrop من: oasis_falaj | palm_grove | greenhouse | sunny_field
- murshidPose من: welcome | wave | explain | inspect | think | surprised | encourage | gentle_sad | celebrate | caution | idle
- murshidMood من: welcome | smile | explain | think | surprised | encourage | gentle_sad | celebrate | speak | idle
- prop من: water_drop | palm_tree | magnifying_glass | bee | sun_shield | fertilizer_bag | dubas_bug`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          text: `أنشئ حلقة كرتونية توعوية من 4 مشاهد للشخصية الكرتونية الحديثة «مُرشد» حول الموضوع التالي: ${cleanTopic}`,
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
                  murshidPose: {
                    type: Type.STRING,
                    enum: [
                      'welcome',
                      'wave',
                      'explain',
                      'inspect',
                      'think',
                      'surprised',
                      'encourage',
                      'gentle_sad',
                      'celebrate',
                      'caution',
                      'idle',
                    ],
                  },
                  murshidMood: {
                    type: Type.STRING,
                    enum: [
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
                    ],
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
                      'dubas_bug',
                    ],
                  },
                },
                required: [
                  'sceneHeading',
                  'narration',
                  'subtitle',
                  'backdrop',
                  'murshidPose',
                  'murshidMood',
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
        murshidPose: sc.murshidPose || 'explain',
        murshidMood: sc.murshidMood || 'explain',
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
