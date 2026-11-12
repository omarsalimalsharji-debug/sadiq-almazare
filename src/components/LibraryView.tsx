import React, { useState, useEffect } from 'react';
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
  Edit3, 
  Lock, 
  ShieldCheck, 
  Check,
  FileText
} from 'lucide-react';
import { LIBRARY_CATEGORIES, INITIAL_BOOKS, Book } from '../data/agriculturalData.ts';
import { UserProfile } from '../types/index.ts';

interface LibraryViewProps {
  user: UserProfile;
  onUpdateBookmarks: (bookmarkedIds: string[]) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  user,
  onUpdateBookmarks
}) => {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);
  
  // Reader state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // Admin modal state
  const [showAdminAddModal, setShowAdminAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newAuthor, setNewAuthor] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(LIBRARY_CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState<string>('');
  const [newPageContent, setNewPageContent] = useState<string>('');

  // Fetch books from server
  const loadBooks = async () => {
    try {
      const res = await fetch('/api/library/books');
      const data = await res.json();
      if (data.success && Array.isArray(data.books)) {
        setBooks(data.books);
      }
    } catch (e) {
      console.warn('Failed to load books from server:', e);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const filteredBooks = books.filter(b => {
    const matchesCat = selectedCategory === 'الكل' || b.category === selectedCategory;
    const matchesSearch = 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenBook = async (book: Book) => {
    setActiveReadingBook(book);
    // Restore bookmark page
    const savedPage = localStorage.getItem(`read_page_${book.id}`);
    setCurrentPage(savedPage ? Number(savedPage) : 1);
    setZoomLevel(100);

    // Call server to increment read count
    try {
      await fetch(`/api/library/books/${book.id}/read`, { method: 'POST' });
      setBooks(prev => prev.map(item => item.id === book.id ? { ...item, readCount: item.readCount + 1 } : item));
    } catch (e) {
      // ignore
    }
  };

  const handlePageChange = (newPage: number) => {
    if (!activeReadingBook) return;
    const maxPage = activeReadingBook.pages.length || 1;
    if (newPage >= 1 && newPage <= maxPage) {
      setCurrentPage(newPage);
      localStorage.setItem(`read_page_${activeReadingBook.id}`, newPage.toString());
    }
  };

  const toggleBookmark = (bookId: string) => {
    const exists = user.bookmarkedBookIds.includes(bookId);
    let next: string[];
    if (exists) {
      next = user.bookmarkedBookIds.filter(id => id !== bookId);
    } else {
      next = [...user.bookmarkedBookIds, bookId];
    }
    onUpdateBookmarks(next);
  };

  const handleShare = (book: Book) => {
    navigator.clipboard?.writeText(window.location.origin + `?book=${book.id}`);
    setShareNotice(`تم نسخ رابط كتاب "${book.title}" للمشاركة داخل التطبيق`);
    setTimeout(() => setShareNotice(null), 3000);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب من المكتبة؟')) return;
    try {
      await fetch(`/api/library/books/${bookId}`, { method: 'DELETE' });
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch (e) {
      alert('تعذر حذف الكتاب');
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;

    try {
      const res = await fetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          author: newAuthor,
          category: newCategory,
          description: newDescription,
          pages: [
            {
              pageNumber: 1,
              title: 'المقدمة والباب الأول',
              content: newPageContent || newDescription
            }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        setBooks(prev => [data.book, ...prev]);
        setShowAdminAddModal(false);
        setNewTitle('');
        setNewAuthor('');
        setNewDescription('');
        setNewPageContent('');
      }
    } catch (err) {
      alert('تعذر إضافة الكتاب');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <LibraryIcon className="w-4 h-4" />
            <span>المكتبة الزراعية الإلكترونية المحمية</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mt-1">
            المكتبة الزراعية الشاملة
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            قراءة مباشرة وتفاعلية لـ 12 تصنيفاً علمياً مع حماية المحتوى والعلامة المائية دون الحاجة للتحميل.
          </p>
        </div>

        {/* Admin Book Management Trigger */}
        {user.isAdmin && (
          <button
            onClick={() => setShowAdminAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white dark:bg-emerald-700 hover:bg-stone-800 text-xs font-semibold shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كتاب جديد للمكتبة</span>
          </button>
        )}
      </div>

      {shareNotice && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
          <span>{shareNotice}</span>
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالعنوان، المؤلف، أو المحتوى..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        {/* 12 Categories Horizontal Scroll List */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('الكل')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'الكل'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            جميع الكتب ({books.length})
          </button>
          {LIBRARY_CATEGORIES.map((cat) => {
            const count = books.filter(b => b.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBooks.map((book) => {
          const isBookmarked = user.bookmarkedBookIds.includes(book.id);

          return (
            <div
              key={book.id}
              className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
            >
              {/* Category & Bookmark */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50">
                  {book.category}
                </span>

                <div className="flex items-center gap-1.5">
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
                      onClick={() => handleDeleteBook(book.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="حذف الكتاب (إدارة)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Book Info */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors leading-snug">
                  {book.title}
                </h3>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  المؤلف: {book.author}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {book.description}
                </p>
              </div>

              {/* Card Footer: views, pages, read CTA (Strictly no download button) */}
              <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{book.readCount} قراءة</span>
                  </span>
                  <span>·</span>
                  <span>{book.pagesCount} صفحات</span>
                </div>

                <button
                  onClick={() => handleOpenBook(book)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-transform hover:scale-102"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>قراءة الكتاب</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* In-App Reading Modal (Viewer with Zoom, Page turning, Watermark, No download button) */}
      {activeReadingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-stone-900 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-stone-800">
            
            {/* Viewer Top Bar */}
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                    {activeReadingBook.title}
                  </h3>
                  <div className="text-[11px] text-stone-500">
                    {activeReadingBook.author} · {activeReadingBook.category}
                  </div>
                </div>
              </div>

              {/* Controls: Zoom, Close */}
              <div className="flex items-center gap-2">
                
                {/* Protected indicator */}
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400 px-2 py-1 rounded bg-stone-100 dark:bg-stone-800">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>قراءة آمنة مرخصة</span>
                </span>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(80, prev - 15))}
                    className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                    title="تصغير الخط"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1 font-bold text-stone-700 dark:text-stone-300">
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(160, prev + 15))}
                    className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                    title="تكبير الخط"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setActiveReadingBook(null)}
                  className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Content with Dynamic Watermark */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 relative select-none secure-watermark bg-stone-50/40 dark:bg-stone-950/40">
              
              {/* Dynamic Watermark Stamp Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 rotate-[-25deg] text-stone-800 dark:text-stone-100 font-bold text-2xl sm:text-3xl text-center leading-loose">
                صديق المزارع · عمر الشرجي<br />
                نسخة مرخصة للاطلاع الإلكتروني
              </div>

              {/* Book Page Content */}
              {activeReadingBook.pages && activeReadingBook.pages[currentPage - 1] ? (
                <div 
                  className="max-w-2xl mx-auto space-y-5 transition-all text-stone-900 dark:text-stone-100"
                  style={{ fontSize: `${(zoomLevel / 100) * 15}px` }}
                >
                  <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      الصفحة {currentPage} من {activeReadingBook.pages.length}
                    </span>
                    <h2 className="text-xl font-bold mt-1 text-stone-900 dark:text-white">
                      {activeReadingBook.pages[currentPage - 1].title}
                    </h2>
                  </div>

                  <p className="leading-loose whitespace-pre-line text-stone-700 dark:text-stone-200 text-justify">
                    {activeReadingBook.pages[currentPage - 1].content}
                  </p>
                </div>
              ) : (
                <div className="text-center py-16 text-stone-400 text-xs">
                  محتوى هذه الصفحة قيد المراجعة الفنية
                </div>
              )}

            </div>

            {/* Viewer Bottom Pagination Navigation */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 flex items-center gap-1.5 font-semibold"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الصفحة السابقة</span>
              </button>

              <div className="font-mono text-stone-500 font-bold">
                {currentPage} / {activeReadingBook.pages.length}
              </div>

              <button
                disabled={currentPage >= activeReadingBook.pages.length}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5 font-bold"
              >
                <span>الصفحة التالية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

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
              <button onClick={() => setShowAdminAddModal(false)} className="text-stone-400 hover:text-stone-800">
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
                  onChange={e => setNewTitle(e.target.value)}
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
                  onChange={e => setNewAuthor(e.target.value)}
                  placeholder="مثال: م. أحمد بن سعيد الحارثي"
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">التصنيف (من الـ 12 تصنيفاً):</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  {LIBRARY_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">نبذة عن الكتاب:</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="وصف مختصر لمحتوى الكتاب وأهدافه..."
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">نص الصفحة الأولى:</label>
                <textarea
                  rows={4}
                  value={newPageContent}
                  onChange={e => setNewPageContent(e.target.value)}
                  placeholder="محتوى القراءة التفاعلية..."
                  className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
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
