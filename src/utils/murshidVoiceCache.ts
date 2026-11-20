import { prepareArabicTextForTts } from './arabicPronunciation.ts';

const DB_NAME = 'sadiq-murshid-voice';
const STORE_NAME = 'clips';
const VOICE_VERSION = 'algieba-omani-male-v1';
const MEMORY_CACHE_LIMIT = 24;
const PERSISTENT_CACHE_LIMIT = 120;
const memoryCache = new Map<string, string>();
let cooldownUntil = 0;

type CachedClip = { key: string; audioBase64: string; createdAt: number };

function openVoiceDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function makeCacheKey(text: string, mood: string): Promise<string> {
  const source = `${VOICE_VERSION}:${mood}:${text}`;
  try {
    const bytes = new TextEncoder().encode(source);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${VOICE_VERSION}-${(hash >>> 0).toString(16)}`;
  }
}

async function readPersistentClip(key: string): Promise<string | null> {
  const db = await openVoiceDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const record = request.result as CachedClip | undefined;
      resolve(record?.audioBase64 || null);
      db.close();
    };
    request.onerror = () => {
      resolve(null);
      db.close();
    };
  });
}

async function writePersistentClip(key: string, audioBase64: string): Promise<void> {
  const db = await openVoiceDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ key, audioBase64, createdAt: Date.now() } satisfies CachedClip);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); resolve(); };
    transaction.onabort = () => { db.close(); resolve(); };
  });
  // Keep a bounded local library so repeated use cannot grow storage indefinitely.
  const cleanupDb = await openVoiceDb();
  if (!cleanupDb) return;
  await new Promise<void>((resolve) => {
    const tx = cleanupDb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const records = (request.result as CachedClip[]).sort((a, b) => b.createdAt - a.createdAt);
      for (const oldRecord of records.slice(PERSISTENT_CACHE_LIMIT)) store.delete(oldRecord.key);
    };
    tx.oncomplete = () => { cleanupDb.close(); resolve(); };
    tx.onerror = () => { cleanupDb.close(); resolve(); };
    tx.onabort = () => { cleanupDb.close(); resolve(); };
  });
}

/** Return the same server-rendered Murshid voice across character speech and lesson clips.
 * Audio is cached in memory and IndexedDB on this device; no farmer data is stored.
 */
export async function getMurshidStudioAudio(text: string, mood: string = 'cheerful'): Promise<string | null> {
  const vocalized = prepareArabicTextForTts(text.trim()) || text.trim();
  if (!vocalized) return null;
  const normalizedMood = ['cheerful', 'curious', 'warning', 'proud'].includes(mood) ? mood : 'cheerful';
  const key = await makeCacheKey(vocalized, normalizedMood);

  const memoryHit = memoryCache.get(key);
  if (memoryHit) return memoryHit;

  const persistentHit = await readPersistentClip(key);
  if (persistentHit) {
    memoryCache.set(key, persistentHit);
    return persistentHit;
  }

  if (Date.now() < cooldownUntil) return null;
  try {
    const response = await fetch('/api/cartoon/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: vocalized, mood: normalizedMood }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success || typeof data.audioBase64 !== 'string' || !data.audioBase64) {
      if (data?.quotaExceeded || response.status === 429) {
        cooldownUntil = Date.now() + (Number(data?.retryAfterSec) || 600) * 1000;
      }
      return null;
    }
    if (memoryCache.size >= MEMORY_CACHE_LIMIT) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
    memoryCache.set(key, data.audioBase64);
    // Local persistence is best-effort: a full browser quota must never block playback.
    try {
      await writePersistentClip(key, data.audioBase64);
    } catch {
      // Keep the in-memory clip for the current session.
    }
    return data.audioBase64;
  } catch {
    return null;
  }
}
