/**
 * IndexedDB Offline Store for "صديق المزارع" Library Books & PDFs
 * Enables true offline reading and cached downloads after first open.
 */
import type { Book } from '../data/agriculturalData.ts';

const DB_NAME = 'farmer_friend_offline_library';
const DB_VERSION = 1;
const STORE_BOOKS = 'books';
const STORE_FILES = 'files';

interface OfflineBookRecord {
  id: string;
  book: Book;
  cachedAt: number;
}

interface OfflineFileRecord {
  id: string;
  pdfUrl?: string;
  blob: Blob;
  fileName: string;
  cachedAt: number;
}

function openLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveBookOffline(book: Book): Promise<void> {
  const record: OfflineBookRecord = {
    id: book.id,
    book,
    cachedAt: Date.now(),
  };
  try {
    const db = await openLibraryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readwrite');
      tx.objectStore(STORE_BOOKS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    try {
      localStorage.setItem(`offline_book_${book.id}`, JSON.stringify(record));
    } catch {
      // ignore storage quota overflow
    }
  }
}

export async function saveBooksListOffline(books: Book[]): Promise<void> {
  for (const b of books) {
    await saveBookOffline(b);
  }
}

export async function getAllOfflineBooks(): Promise<Book[]> {
  try {
    const db = await openLibraryDb();
    const records = await new Promise<OfflineBookRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const req = tx.objectStore(STORE_BOOKS).getAll();
      req.onsuccess = () => resolve((req.result || []) as OfflineBookRecord[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records
      .sort((a, b) => (b.book.featured ? 1 : 0) - (a.book.featured ? 1 : 0))
      .map((r) => r.book);
  } catch {
    return [];
  }
}

export async function getOfflineCachedBookIds(): Promise<string[]> {
  try {
    const db = await openLibraryDb();
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const req = tx.objectStore(STORE_BOOKS).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return keys.map(String);
  } catch {
    return [];
  }
}

export async function cacheBookPdfOffline(
  bookId: string,
  pdfUrl: string,
  fileName: string
): Promise<Blob | null> {
  try {
    const db = await openLibraryDb();
    const existing = await new Promise<OfflineFileRecord | undefined>((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).get(bookId);
      req.onsuccess = () => resolve(req.result as OfflineFileRecord | undefined);
      req.onerror = () => resolve(undefined);
    });
    if (existing?.blob && existing.pdfUrl === pdfUrl) {
      db.close();
      return existing.blob;
    }

    const res = await fetch(pdfUrl);
    if (!res.ok) {
      db.close();
      return null;
    }
    const blob = await res.blob();
    const record: OfflineFileRecord = {
      id: bookId,
      pdfUrl,
      blob,
      fileName,
      cachedAt: Date.now(),
    };
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      tx.objectStore(STORE_FILES).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function getCachedPdfFileIds(): Promise<string[]> {
  try {
    const db = await openLibraryDb();
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return keys.map(String);
  } catch {
    return [];
  }
}
