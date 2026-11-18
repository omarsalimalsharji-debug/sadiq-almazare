import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Library as LibraryIcon,
  Search,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  Eye,
  Share2,
  X,
  Plus,
  Trash2,
  Download,
  Check,
  FileText,
  WifiOff,
  List,
  Info,
} from 'lucide-react';
import { LIBRARY_CATEGORIES, INITIAL_BOOKS, Book } from '../data/agriculturalData.ts';
import { CITATION_LEGEND } from '../data/samailBookData.ts';
import { UserProfile } from '../types/index.ts';
import { BookSpeechControls } from './BookSpeechControls.tsx';
import { splitPageIntoParagraphs } from '../utils/arabicSpeech.ts';
import {
  saveBookOffline,
  saveBooksListOffline,
  getAllOfflineBooks,
  getOfflineCachedBookIds,
  cacheBookPdfOffline,
} from '../utils/offlineBooksDb.ts';
import { useShare } from '../context/ShareContext.tsx';

interface LibraryViewProps {
  user: UserProfile;
  onUpdateBookmarks: (bookmarkedIds: string[]) => void;
  initialBookId?: string | null;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  user,
  onUpdateBookmarks,
  initialBookId,
}) => {
  const { openShare } = useShare();
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'bookmarked' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);

  // Reader state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [readerMode, setReaderMode] = useState<'text' | 'pdf'>('text');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showChaptersMenu, setShowChaptersMenu] = useState<boolean>(false);
  const [showLegendBox, setShowLegendBox] = useState<boolean>(false);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  // Offline & feedback status
  const [offlineBookIds, setOfflineBookIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Admin modal state
  const [showAdminAddModal, setShowAdminAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newAuthor, setNewAuthor] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(LIBRARY_CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState<string>('');
  const [newPageContent, setNewPageContent] = useState<string>('');

  const showToast = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Load books from server with IndexedDB offline fallback
  useEffect(() => {
    let active = true;
    const initBooks = async () => {
      const cachedIds = await getOfflineCachedBookIds();
      if (active) setOfflineBookIds(cachedIds);

      try {
        const res = await fetch('/api/library/books');
        const data = await res.json();
        if (data.success && Array.isArray(data.books) && data.books.length > 0) {
          if (active) setBooks(data.books);
          await saveBooksListOffline(data.books);
          const nextIds = await getOfflineCachedBookIds();
          if (active) setOfflineBookIds(nextIds);
          return;
        }
      } catch {
        // Offline or network unreachable — fall back to IndexedDB
      }

      const offlineList = await getAllOfflineBooks();
      if (offlineList.length > 0 && active) {
        setBooks(offlineList);
      } else {
        await saveBooksListOffline(INITIAL_BOOKS);
      }
    };
    initBooks();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialBookId || books.length === 0) return;
    const match = books.find((b) => b.id === initialBookId);
    if (match) {
      setActiveReadingBook(match);
      const savedPage = Number(localStorage.getItem(`read_page_${match.id}`)) || 1;
      setCurrentPage(Math.min(savedPage, match.pages?.length || 1));
    }
  }, [initialBookId, books]);

  const filteredBooks = books.filter((b) => {
    const matchesCat = selectedCategory === 'الكل' || b.category === selectedCategory;
    const matchesCollection =
      collectionFilter === 'all' ||
      (collectionFilter === 'bookmarked' && user.bookmarkedBookIds.includes(b.id)) ||
      (collectionFilter === 'offline' && offlineBookIds.includes(b.id));
    const term = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !term ||
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.description.toLowerCase().includes(term);
    return matchesCat && matchesCollection && matchesSearch;
  });

  const handleOpenBook = async (book: Book) => {
    setActiveReadingBook(book);
    setReaderMode('text');
    setShowChaptersMenu(false);
    setActiveParagraphIndex(null);
    const savedPage = localStorage.getItem(`read_page_${book.id}`);
    const parsedPage = savedPage ? Number(savedPage) : 1;
    setCurrentPage(
      parsedPage >= 1 && parsedPage <= (book.pages?.length || 1) ? parsedPage : 1
    );
    setZoomLevel(100);

    // Always persist in IndexedDB on first open for offline reading
    await saveBookOffline(book);
    setOfflineBookIds((prev) => (prev.includes(book.id) ? prev : [...prev, book.id]));
    if (book.pdfUrl) {
      cacheBookPdfOffline(book.id, book.pdfUrl, book.downloadFileName || `${book.id}.pdf`).catch(
        () => {}
      );
    }

    try {
      await fetch(`/api/library/books/${book.id}/read`, { method: 'POST' });
      setBooks((prev) =>
        prev.map((item) =>
          item.id === book.id ? { ...item, readCount: item.readCount + 1 } : item
        )
      );
    } catch {
      // ignore if offline
    }
  };

  const handleDownloadBook = async (book: Book) => {
    setDownloadingId(book.id);
    try {
      await saveBookOffline(book);
      setOfflineBookIds((prev) => (prev.includes(book.id) ? prev : [...prev, book.id]));

      if (book.pdfUrl) {
        const blob = await cacheBookPdfOffline(
          book.id,
          book.pdfUrl,
          book.downloadFileName || `${book.title}.pdf`
        );
        const downloadUrl = blob ? URL.createObjectURL(blob) : book.pdfUrl;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = book.downloadFileName || `${book.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (blob) {
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
        }
        showToast('ok', `تم تحميل «${book.title}» وحفظه للقراءة دون إنترنت.`);
      } else {
        const fullText = [
          book.title,
          `المؤلف: ${book.author}`,
          `التصنيف: ${book.category}`,
          '',
          ...(book.pages || []).map(
            (p) => `--- ${p.chapter ? p.chapter + ' — ' : ''}${p.title} ---\n${p.content}\n`
          ),
        ].join('\n');
        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${book.title}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        showToast('ok', `تم حفظ وتحميل نسخة نصية من «${book.title}» للقراءة دون إنترنت.`);
      }
    } catch {
      showToast('err', 'تعذر تنزيل الملف حالياً، تم حفظ النص في ذاكرة الجهاز.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (!activeReadingBook) return;
    const maxPage = activeReadingBook.pages.length || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      setCurrentPage(newPage);
      setActiveParagraphIndex(null);
      localStorage.setItem(`read_page_${activeReadingBook.id}`, newPage.toString());
    }
  };

  const toggleBookmark = (bookId: string) => {
    const exists = user.bookmarkedBookIds.includes(bookId);
    const next = exists
      ? user.bookmarkedBookIds.filter((id) => id !== bookId)
      : [...user.bookmarkedBookIds, bookId];
    onUpdateBookmarks(next);
  };

  const handleShare = (book: Book) => {
    openShare({
      kind: 'book',
      title: book.title,
      summary: book.description,
      highlights: [
        `تأليف: ${book.author}`,
        `التصنيف: ${book.category}`,
        `عدد الفصول: ${book.pages?.length || book.pagesCount || 1} فصول`,
      ],
      categoryLabel: book.category,
      page: 'library',
      itemId: book.id,
      authorOrSource: book.author,
    });
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      const token = localStorage.getItem('farmer_admin_token') || '';
      const res = await fetch(`/api/library/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('err', d.error || 'تعذر حذف الكتاب، يرجى التأكد من صلاحية المدير.');
        return;
      }
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      setConfirmDeleteId(null);
      showToast('ok', 'تم حذف الكتاب من المكتبة بنجاح.');
    } catch {
      showToast('err', 'تعذر الاتصال بالخادم لحذف الكتاب.');
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;

    try {
      const token = localStorage.getItem('farmer_admin_token') || '';
      const res = await fetch('/api/library/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({
          title: newTitle,
          author: newAuthor,
          category: newCategory,
          description: newDescription,
          pages: [
            {
              pageNumber: 1,
              title: 'المقدمة والباب الأول',
              content: newPageContent || newDescription,
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBooks((prev) => [data.book, ...prev]);
        setShowAdminAddModal(false);
        setNewTitle('');
        setNewAuthor('');
        setNewDescription('');
        setNewPageContent('');
        showToast('ok', 'تم نشر الكتاب الجديد في المكتبة بنجاح.');
      } else {
        showToast('err', data.error || 'تعذر إضافة الكتاب.');
      }
    } catch {
      showToast('err', 'تعذر الاتصال بالخادم لإضافة الكتاب.');
    }
  };

  const currentPageData = activeReadingBook?.pages?.[currentPage - 1] || null;
  const pageParagraphs = useMemo(
    () => (currentPageData ? splitPageIntoParagraphs(currentPageData.content) : []),
    [currentPageData]
  );

  // Auto-scroll active paragraph into view while speaking
  useEffect(() => {
    if (activeParagraphIndex !== null && paragraphRefs.current[activeParagraphIndex]) {
      paragraphRefs.current[activeParagraphIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeParagraphIndex]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LibraryIcon className="w-4 h-4" />
            <span>المكتبة الزراعية العُمانية</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            المكتبة الزراعية الشاملة
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            مراجع وأدلة زراعية منظمة في أبواب وفصول مع قارئ صوتي عربي وتخزين للعمل دون إنترنت.
          </p>
        </div>

        {user.isAdmin && (
          <button
            onClick={() => setShowAdminAddModal(true)}
            className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-emerald-700 hover:bg-stone-800 text-xs font-semibold shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كتاب جديد للمكتبة</span>
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/70 border-red-300 text-red-900 dark:text-red-200'
          }`}
        >
          <span>{notice.text}</span>
          <Check className="w-4 h-4 shrink-0" />
        </div>
      )}

      {/* Search, Collection Modes and Category Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، المؤلف، أو المحتوى..."
              className="w-full min-h-[44px] pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 w-fit">
            {(
              [
                { id: 'all', label: `الكل (${books.length})` },
                { id: 'bookmarked', label: `المفضلة (${user.bookmarkedBookIds.length})` },
                { id: 'offline', label: `بدون إنترنت (${offlineBookIds.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCollectionFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  collectionFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-600 dark:text-slate-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('الكل')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'الكل'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            جميع الكتب ({books.length})
          </button>
          {LIBRARY_CATEGORIES.map((cat) => {
            const count = books.filter((b) => b.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBooks.map((book) => {
          const isBookmarked = user.bookmarkedBookIds.includes(book.id);
          const isSavedOffline = offlineBookIds.includes(book.id);

          return (
            <div
              key={book.id}
              className="rounded-2xl bg-white dark:bg-[#132247] border border-stone-200 dark:border-sky-300/15 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Cover Image when available (e.g. Samail book page 1) */}
              {book.coverUrl && (
                <div
                  onClick={() => handleOpenBook(book)}
                  className="relative h-56 bg-stone-100 dark:bg-stone-800 cursor-pointer overflow-hidden border-b border-stone-200 dark:border-stone-800"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  {/* Quiet Metadata + Bookmark/Share */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>{book.category}</span>
                      {isSavedOffline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-stone-500 dark:text-stone-400 font-normal">
                            متاح دون إنترنت
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleBookmark(book.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-500 fill-current" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleShare(book)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="مشاركة رابط الكتاب"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {user.isAdmin && (
                        <button
                          onClick={() => setConfirmDeleteId(book.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="حذف الكتاب (إدارة)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Book Title, Author & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors leading-snug">
                      {book.title}
                    </h3>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      تأليف: {book.author}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Meta + Clear Read & Download Buttons */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{book.readCount} قراءة</span>
                    </span>
                    <span>
                      {book.pages?.length || book.pagesCount} أبواب وفصول · {book.publishedYear}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenBook(book)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>اقرأ</span>
                    </button>

                    <button
                      onClick={() => handleDownloadBook(book)}
                      disabled={downloadingId === book.id}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{downloadingId === book.id ? 'جاري التحميل...' : 'تحميل'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Delete Modal (Zero native confirm()) */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-stone-900 dark:text-white">
              تأكيد حذف الكتاب
            </h3>
            <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
              هل أنت متأكد من حذف هذا الكتاب نهائياً من المكتبة؟
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteBook(confirmDeleteId)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Structured Reader Modal (Chapters, Citation Badges, Offline, Arabic TTS Voice) */}
      {activeReadingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-stone-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-stone-900 w-full max-w-5xl h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800">
            {/* Viewer Top Bar */}
            <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-stone-50/80 dark:bg-stone-900">
              <div className="flex items-center justify-between gap-2.5 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                      {activeReadingBook.title}
                    </h3>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {activeReadingBook.author}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveReadingBook(null)}
                  className="sm:hidden min-h-[42px] min-w-[42px] p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors flex items-center justify-center shrink-0"
                  aria-label="إغلاق قارئ الكتاب"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reader Controls */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {activeReadingBook.pdfUrl && (
                  <div className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
                    <button
                      type="button"
                      onClick={() => setReaderMode('text')}
                      className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                        readerMode === 'text'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      قراءة تفاعلية
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderMode('pdf')}
                      className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                        readerMode === 'pdf'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      الكتاب المصوّر PDF
                    </button>
                  </div>
                )}

                {readerMode === 'text' && (
                  <button
                    type="button"
                    onClick={() => setShowChaptersMenu((v) => !v)}
                    className={`min-h-[40px] px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                      showChaptersMenu
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                    title="فهرس الأبواب والفصول"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">الفهرس</span>
                  </button>
                )}

                {readerMode === 'text' && activeReadingBook.hasCitationBadges && (
                  <button
                    type="button"
                    onClick={() => setShowLegendBox((v) => !v)}
                    className={`min-h-[40px] px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                      showLegendBox
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                    title="شرح رموز التوثيق [م] [ج] [ع] [ت]"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">رموز التوثيق</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadBook(activeReadingBook)}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center gap-1"
                  title="تحميل وحفظ دون إنترنت"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">تحميل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare(activeReadingBook)}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  title="مشاركة الكتاب"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">مشاركة</span>
                </button>

                {readerMode === 'text' && (
                  <div className="hidden sm:flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                    <button
                      onClick={() => setZoomLevel((prev) => Math.max(85, prev - 15))}
                      className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                      title="تصغير الخط"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono px-1 font-bold text-stone-700 dark:text-stone-300">
                      {zoomLevel}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((prev) => Math.min(155, prev + 15))}
                      className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                      title="تكبير الخط"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveReadingBook(null)}
                  className="hidden sm:flex min-h-[40px] min-w-[40px] p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors items-center justify-center"
                  aria-label="إغلاق قارئ الكتاب"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Arabic TTS Voice Reader Bar (Text Mode) */}
            {readerMode === 'text' && (
              <BookSpeechControls
                paragraphs={pageParagraphs}
                pageKey={`${activeReadingBook.id}-p${currentPage}`}
                activeParagraphIndex={activeParagraphIndex}
                onActiveParagraphChange={setActiveParagraphIndex}
              />
            )}

            {/* Citation Symbols Legend Drawer ([م] [ج] [ع] [ت]) */}
            {readerMode === 'text' && showLegendBox && (
              <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                {CITATION_LEGEND.map((item) => (
                  <div
                    key={item.code}
                    className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-amber-200/70 dark:border-amber-800/50"
                  >
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono ml-1.5">
                      {item.code}
                    </span>
                    <span className="text-stone-700 dark:text-stone-200">{item.meaning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Main Reader Body: Either Full Illustrated PDF or Structured Interactive Text */}
            {readerMode === 'pdf' && activeReadingBook.pdfUrl ? (
              <div className="flex-1 flex flex-col bg-stone-100 dark:bg-stone-950 overflow-hidden">
                <iframe
                  src={`${activeReadingBook.pdfUrl}#view=FitH`}
                  title={activeReadingBook.title}
                  className="w-full flex-1 border-0"
                />
                <div className="px-4 py-2 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                  <span>عرض النسخة المصوّرة الكاملة بصيغة PDF</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadBook(activeReadingBook)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل نسخة PDF كاملة</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 flex overflow-hidden relative">
                  {showChaptersMenu && (
                    <aside className="w-64 sm:w-72 border-l border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 overflow-y-auto p-3 space-y-1.5 shrink-0">
                      <div className="text-xs font-bold text-stone-500 dark:text-stone-400 px-2 pb-1">
                        فهرس الأبواب والفصول ({activeReadingBook.pages.length})
                      </div>
                      {activeReadingBook.pages.map((pg, idx) => (
                        <button
                          key={pg.pageNumber}
                          onClick={() => {
                            handlePageChange(idx + 1);
                            setShowChaptersMenu(false);
                          }}
                          className={`w-full text-right p-2.5 rounded-xl text-xs transition-colors space-y-0.5 ${
                            currentPage === idx + 1
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'hover:bg-stone-200/70 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <div className="text-[10px] opacity-80">
                            {pg.chapter || `الفصل ${idx + 1}`}
                          </div>
                          <div className="line-clamp-2">{pg.title}</div>
                        </button>
                      ))}
                    </aside>
                  )}

                  <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-stone-50/40 dark:bg-stone-950/40">
                    {currentPageData ? (
                      <div
                        className="max-w-3xl mx-auto space-y-4 text-stone-900 dark:text-stone-100"
                        style={{ fontSize: `${(zoomLevel / 100) * 15}px` }}
                      >
                        <div className="border-b border-stone-200 dark:border-stone-800 pb-3 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                            <span>
                              {currentPageData.chapter || 'محتوى الكتاب'} · {currentPage} من{' '}
                              {activeReadingBook.pages.length}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                              <WifiOff className="w-3 h-3 text-emerald-600" />
                              <span>محفوظ للقراءة دون إنترنت</span>
                            </span>
                          </div>
                          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-snug">
                            {currentPageData.title}
                          </h2>
                        </div>

                        {/* Structured Paragraphs with Active Speech Highlighting */}
                        <div className="space-y-3 leading-loose">
                          {pageParagraphs.map((para, idx) => {
                            const isSpoken = activeParagraphIndex === idx;
                            return (
                              <p
                                key={`${currentPage}-${idx}`}
                                ref={(el) => {
                                  paragraphRefs.current[idx] = el;
                                }}
                                onClick={() => setActiveParagraphIndex(idx)}
                                className={`rounded-xl px-3 py-2 transition-colors cursor-pointer text-justify ${
                                  isSpoken
                                    ? 'bg-emerald-100/90 dark:bg-emerald-900/45 text-stone-950 dark:text-white ring-1 ring-emerald-500/50 font-medium'
                                    : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100/80 dark:hover:bg-stone-800/40'
                                }`}
                              >
                                {para}
                              </p>
                            );
                          })}
                        </div>

                        {activeReadingBook.hasCitationBadges && (
                          <div className="pt-4 mt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                            {CITATION_LEGEND.map((item) => (
                              <div key={item.code}>
                                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                                  {item.code}
                                </strong>{' '}
                                {item.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16 text-stone-400 text-xs">
                        محتوى هذه الصفحة قيد المراجعة الفنية
                      </div>
                    )}
                  </div>
                </div>

                {/* Viewer Bottom Pagination */}
                <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between text-xs">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 flex items-center gap-1.5 font-semibold"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>الفصل السابق</span>
                  </button>

                  <div className="font-mono text-stone-600 dark:text-stone-300 font-bold">
                    {currentPage} / {activeReadingBook.pages.length}
                  </div>

                  <button
                    disabled={currentPage >= activeReadingBook.pages.length}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5 font-bold"
                  >
                    <span>الفصل التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin Add Book Modal */}
      {showAdminAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 w-full max-w-lg border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                إضافة مرجع زراعي جديد إلى المكتبة
              </h3>
              <button
                onClick={() => setShowAdminAddModal(false)}
                className="text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">عنوان الكتاب:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: هندسة البيوت المحمية في عُمان"
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">اسم المؤلف أو الجهة:</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="مثال: م. أحمد بن سعيد الحارثي"
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">التصنيف (من الـ 12 تصنيفاً):</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  {LIBRARY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">نبذة عن الكتاب:</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="وصف مختصر لمحتوى الكتاب وأهدافه..."
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">نص الصفحة الأولى:</label>
                <textarea
                  rows={4}
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  placeholder="محتوى القراءة التفاعلية..."
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminAddModal(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  نشر الكتاب في المكتبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
