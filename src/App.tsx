import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Play,
  Shield,
  SlidersHorizontal,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  type GiftItem,
  type GiftCategory,
  type GiftFormat,
  type AdminAuditLog,
  type UnindexedFileRecord,
  type StorageStatusInfo,
  CATEGORY_LABELS,
  FORMAT_CAPABILITIES,
  filterAndSortGifts,
  formatBytes,
  computeCatalogStats,
} from './utils/catalogLogic';
import { GiftCard } from './components/GiftCard';
import { GiftPlayerModal } from './components/GiftPlayerModal';
import { FormatCenterSection } from './components/FormatCenterSection';
import { AdminDashboard } from './components/AdminDashboard';
import { PERSISTED_GIFTS } from './data/persistedGifts';

export default function App() {
  // Route state supporting both pathname (/admin) and clean client transitions
  const [currentRoute, setCurrentRoute] = useState<'gallery' | 'admin'>(() => {
    if (
      window.location.pathname.startsWith('/admin') ||
      window.location.hash === '#/admin'
    ) {
      return 'admin';
    }
    return 'gallery';
  });

  // Central Catalog State - permanently seeded from codebase (PERSISTED_GIFTS)
  const [gifts, setGifts] = useState<GiftItem[]>(() => {
    try {
      const cached = localStorage.getItem('gift_gallery_persisted_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore JSON parse error
    }
    return PERSISTED_GIFTS;
  });
  const [catalogVersion, setCatalogVersion] = useState<number>(1);
  const [unindexedFiles, setUnindexedFiles] = useState<UnindexedFileRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [storageStatus, setStorageStatus] = useState<StorageStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Admin Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState<boolean>(false);

  // Gallery Filtering, Sorting, and Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory>('all');
  const [selectedFormat, setSelectedFormat] = useState<GiftFormat | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'order' | 'newest' | 'name' | 'size_desc' | 'category'>(
    'order'
  );
  const [visibleLimit, setVisibleLimit] = useState<number>(12);

  // Active Preview Modal Gift
  const [activePreviewGift, setActivePreviewGift] = useState<GiftItem | null>(null);

  const navigateTo = useCallback((route: 'gallery' | 'admin') => {
    setCurrentRoute(route);
    const nextUrl = route === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', nextUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#/admin'
      ) {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('gallery');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('gift_gallery_admin_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  const fetchCatalogAndStatus = useCallback(async (showSpinner = false) => {
    if (showSpinner && gifts.length === 0) setIsLoading(true);
    setFetchError(null);
    try {
      const [catResult, statusResult, sessionResult] = await Promise.allSettled([
        fetch('/api/catalog', { cache: 'no-store', headers: getAuthHeaders() }),
        fetch('/api/storage/status', { cache: 'no-store' }),
        fetch('/api/admin/session', { cache: 'no-store', headers: getAuthHeaders() }),
      ]);

      let loadedCatalog = false;

      if (catResult.status === 'fulfilled' && catResult.value.ok) {
        try {
          const catData = await catResult.value.json();
          if (!catData.notModified && Array.isArray(catData.items) && catData.items.length > 0) {
            setGifts(catData.items);
            setCatalogVersion(catData.version || 1);
            try {
              localStorage.setItem('gift_gallery_persisted_cache', JSON.stringify(catData.items));
            } catch {}
            if (Array.isArray(catData.unindexedFiles)) {
              setUnindexedFiles(catData.unindexedFiles);
            }
            if (Array.isArray(catData.auditLogs)) {
              setAuditLogs(catData.auditLogs);
            }
            loadedCatalog = true;
          }
        } catch {}
      }

      // If /api/catalog was unreachable or errored, try static /gifts_catalog.json
      if (!loadedCatalog) {
        try {
          const staticRes = await fetch('/gifts_catalog.json', { cache: 'no-store' });
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            if (Array.isArray(staticData.items) && staticData.items.length > 0) {
              setGifts(staticData.items);
              setCatalogVersion(staticData.version || 1);
              loadedCatalog = true;
            }
          }
        } catch {}
      }

      if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
        try {
          const statusData = (await statusResult.value.json()) as StorageStatusInfo;
          setStorageStatus(statusData);
        } catch {}
      }

      if (sessionResult.status === 'fulfilled' && sessionResult.value.ok) {
        try {
          const sessionData = await sessionResult.value.json();
          setIsAdminAuthenticated(Boolean(sessionData.authenticated));
          setIsDefaultPassword(Boolean(sessionData.isDefaultPassword));
        } catch {}
      }
    } catch (err) {
      if (gifts.length === 0) {
        setFetchError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [gifts.length]);

  // Initial fetch + SSE real-time synchronization + periodic freshness verification
  useEffect(() => {
    void fetchCatalogAndStatus(true);

    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'catalog:updated') {
          void fetchCatalogAndStatus(false);
        }
      } catch {
        // ignore invalid event payload
      }
    };

    // Fallback freshness poll every 20 seconds
    const interval = setInterval(() => {
      void fetchCatalogAndStatus(false);
    }, 20000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [fetchCatalogAndStatus]);

  const handleLogout = async () => {
    localStorage.removeItem('gift_gallery_admin_token');
    await fetch('/api/admin/logout', { method: 'POST', headers: getAuthHeaders() });
    setIsAdminAuthenticated(false);
    await fetchCatalogAndStatus(false);
  };

  // Filtered and Sorted Gifts for the Public Gallery
  const filteredGifts = useMemo(() => {
    return filterAndSortGifts(gifts, {
      searchQuery,
      category: selectedCategory,
      format: selectedFormat,
      sortBy,
      includeUnpublished: false,
    });
  }, [gifts, searchQuery, selectedCategory, selectedFormat, sortBy]);

  const displayedGifts = useMemo(() => {
    return filteredGifts.slice(0, visibleLimit);
  }, [filteredGifts, visibleLimit]);

  const catalogStats = useMemo(() => computeCatalogStats(gifts), [gifts]);

  const featuredGift = useMemo(() => {
    return filteredGifts[0] || gifts.find((g) => g.published) || null;
  }, [filteredGifts, gifts]);

  return (
    <div className="min-h-screen flex flex-col bg-[#08060E] text-[#F8FAFC]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-4 sm:px-8 py-4 bg-[#08060E]/90 backdrop-blur-md border-b border-white/10">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('gallery');
          }}
          className="text-lg sm:text-xl font-extrabold tracking-tight text-white hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
        >
          Gift Gallery
        </a>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <a
            href="#gallery-grid"
            onClick={(e) => {
              e.preventDefault();
              if (currentRoute !== 'gallery') navigateTo('gallery');
              setSelectedCategory('all');
              setTimeout(() => {
                document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
          >
            معرض الهدايا
          </a>
          <a
            href="#entrances"
            onClick={(e) => {
              e.preventDefault();
              if (currentRoute !== 'gallery') navigateTo('gallery');
              setSelectedCategory('entrances');
              setTimeout(() => {
                document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
          >
            الدخوليات الملكية
          </a>
          <a
            href="#frames"
            onClick={(e) => {
              e.preventDefault();
              if (currentRoute !== 'gallery') navigateTo('gallery');
              setSelectedCategory('frames');
              setTimeout(() => {
                document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
          >
            إطارات المايك
          </a>
          <a
            href="#formats-center"
            onClick={(e) => {
              e.preventDefault();
              if (currentRoute !== 'gallery') navigateTo('gallery');
              setTimeout(() => {
                document.getElementById('formats-center')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
          >
            مركز الصيغ
          </a>
          <a
            href="#storage-architecture"
            onClick={(e) => {
              e.preventDefault();
              if (currentRoute !== 'gallery') navigateTo('gallery');
              setTimeout(() => {
                document
                  .getElementById('storage-architecture')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
          >
            التخزين الدائم
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              navigateTo(currentRoute === 'admin' ? 'gallery' : 'admin')
            }
            className="px-4 py-2 text-xs font-bold text-[#08060E] bg-[#D4AF37] hover:bg-[#E5C158] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#D4AF37]/20"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{currentRoute === 'admin' ? 'العودة للمعرض العام' : 'رفع الهدايا واللوحة (150150)'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRoute === 'admin' ? (
          <AdminDashboard
            authenticated={isAdminAuthenticated}
            isDefaultPassword={isDefaultPassword}
            gifts={gifts}
            unindexedFiles={unindexedFiles}
            auditLogs={auditLogs}
            storageStatus={storageStatus}
            onLoginSuccess={(isDefault) => {
              setIsAdminAuthenticated(true);
              setIsDefaultPassword(isDefault);
              void fetchCatalogAndStatus(false);
            }}
            onLogout={() => void handleLogout()}
            onCatalogChanged={async () => {
              await fetchCatalogAndStatus(false);
            }}
            onPreviewGift={(gift) => setActivePreviewGift(gift)}
            onNavigateGallery={() => navigateTo('gallery')}
          />
        ) : (
          <>
            {/* Storefront Hero Section */}
            <section className="relative overflow-hidden pt-10 pb-14 border-b border-white/10 bg-[radial-gradient(ellipse_at_top,#261447_0%,#08060E_70%)]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  {/* Hero Typography & Primary Action (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-center">
                    <div className="text-xs font-semibold text-[#D4AF37] mb-3">
                      منصة الهدايا الصوتية المركزية · Cloudflare R2 & JSON Catalog
                    </div>

                    <h1
                      className="font-extrabold text-white tracking-tight leading-[1.2] mb-5"
                      style={{
                        fontSize: 'clamp(2rem, 3.8vw, 3.35rem)',
                        textWrap: 'balance',
                      }}
                    >
                      مكتبة احترافية لعرض وإدارة هدايا التطبيقات الصوتية بكل الصيغ الأصلية
                    </h1>

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mb-8">
                      استعرض وعاين الهدايا المتحركة، دخوليات الـ VIP، وإطارات المايك بصيغ{' '}
                      <span className="font-mono text-[#FDE68A]">
                        SVGA, VAP, MP4, WebM, Lottie, APNG
                      </span>{' '}
                      بجودتها الأصلية مع الشفافية والصوت. أي هدية يرفعها المدير تُحفظ بشكل دائم وتظهر لجميع المستخدمين تلقائيًا دون قاعدة بيانات تقليدية.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href="#gallery-grid"
                        onClick={(e) => {
                          e.preventDefault();
                          document
                            .getElementById('gallery-grid')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-[#08060E] font-bold text-sm transition-colors whitespace-nowrap shrink-0"
                      >
                        استكشاف مكتبة الهدايا ({catalogStats.publishedCount})
                      </a>

                      <button
                        type="button"
                        onClick={() => navigateTo('admin')}
                        className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-[#D4AF37]" />
                        <span>رفع هدايا جديدة من لوحة التحكم</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive 3D Stage Showcase Card (5 cols) */}
                  <div className="lg:col-span-5 flex">
                    {featuredGift && (
                      <div className="w-full rounded-2xl bg-[#120E1E]/90 border border-[#D4AF37]/30 p-6 flex flex-col justify-between shadow-2xl">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span className="text-[#D4AF37] font-semibold">
                            معاينة المسرح الصوتي المباشر
                          </span>
                          <span className="font-mono">
                            {featuredGift.format} · {featuredGift.quality || '4K'}
                          </span>
                        </div>

                        <div
                          onClick={() => setActivePreviewGift(featuredGift)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActivePreviewGift(featuredGift);
                            }
                          }}
                          className="relative aspect-square max-h-64 mx-auto w-full rounded-xl bg-[radial-gradient(circle_at_center,#321B59_0%,#0B0814_75%)] flex items-center justify-center p-4 cursor-pointer group overflow-hidden"
                        >
                          <img
                            src={featuredGift.thumbnailUrl}
                            alt={featuredGift.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-base font-bold text-white">
                              {featuredGift.name}
                            </h2>
                            <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                              {CATEGORY_LABELS[featuredGift.category]?.labelAr} ·{' '}
                              {formatBytes(featuredGift.sizeBytes)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActivePreviewGift(featuredGift)}
                            className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#08060E] font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>تشغيل العرض</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full-Width 4-Column KPI Strip Below Hero Split */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/10">
                  <div>
                    <span className="text-xs text-slate-400 block">إجمالي الهدايا المنشورة</span>
                    <span className="text-2xl font-bold tabular-nums text-white mt-1 block">
                      {catalogStats.publishedCount} هدية
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">إجمالي حجم المكتبة</span>
                    <span className="text-2xl font-bold tabular-nums text-[#D4AF37] mt-1 block">
                      {formatBytes(catalogStats.totalBytes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">الصيغ المدعومة بالأصل</span>
                    <span className="text-2xl font-bold tabular-nums text-white mt-1 block">
                      12 صيغة
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">إصدار الفهرس المركزي</span>
                    <span className="text-2xl font-bold tabular-nums text-emerald-400 mt-1 block">
                      v{catalogVersion || 1} (مزامنة فورية)
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Main Gift Gallery Section */}
            <section id="gallery-grid" className="py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Category Tabs + Search + Format & Sort Controls */}
                <div className="space-y-4 mb-8">
                  {/* Category Segmented Filter Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div
                      role="tablist"
                      aria-label="تصنيفات الهدايا"
                      className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#120E1E] border border-white/10 overflow-x-auto max-w-full"
                    >
                      {(Object.keys(CATEGORY_LABELS) as GiftCategory[]).map((catKey) => {
                        const active = selectedCategory === catKey;
                        const count =
                          catKey === 'all'
                            ? catalogStats.publishedCount
                            : gifts.filter((g) => g.published && g.category === catKey).length;
                        return (
                          <button
                            key={catKey}
                            role="tab"
                            aria-selected={active}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(catKey);
                              setVisibleLimit(12);
                            }}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-[#D4AF37] text-[#08060E] shadow-xs'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {CATEGORY_LABELS[catKey].labelAr} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <a
                        href="/storage/catalog/gifts.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-[#120E1E] border border-white/10 hover:border-[#D4AF37]/40 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>فهرس JSON المباشر</span>
                      </a>
                    </div>
                  </div>

                  {/* Search Input, Format Filter, and Sort Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#120E1E] border border-white/10 p-3.5 rounded-2xl">
                    <div className="md:col-span-6 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="ابحث عن هدية بالاسم أو الصيغة"
                        placeholder="ابحث باسم الهدية، الدخولية، الإطار، أو الصيغة (SVGA, VAP, Lottie)..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#08060E] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#D4AF37] shrink-0 hidden sm:block" />
                      <select
                        value={selectedFormat}
                        onChange={(e) =>
                          setSelectedFormat(e.target.value as GiftFormat | 'ALL')
                        }
                        aria-label="فلترة حسب الصيغة"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#08060E] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="ALL">جميع الصيغ (All Formats)</option>
                        {Object.keys(FORMAT_CAPABILITIES).map((fmt) => (
                          <option key={fmt} value={fmt}>
                            صيغة {fmt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as
                              | 'order'
                              | 'newest'
                              | 'name'
                              | 'size_desc'
                              | 'category'
                          )
                        }
                        aria-label="ترتيب العرض"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#08060E] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="order">الترتيب المعتمد</option>
                        <option value="newest">الأحدث إضافة</option>
                        <option value="name">الاسم (أبجدي)</option>
                        <option value="category">التصنيف</option>
                        <option value="size_desc">الحجم (من الأكبر)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Loading / Error / Empty / Populated States */}
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-[#120E1E] border border-white/10 h-96 animate-pulse p-5 flex flex-col justify-between"
                      >
                        <div className="w-full h-56 bg-white/5 rounded-xl" />
                        <div className="space-y-2">
                          <div className="w-1/3 h-3 bg-white/10 rounded" />
                          <div className="w-2/3 h-4 bg-white/10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : fetchError ? (
                  <div className="rounded-2xl bg-rose-950/30 border border-rose-500/30 p-8 text-center max-w-lg mx-auto">
                    <p className="text-sm font-bold text-rose-200 mb-2">{fetchError}</p>
                    <button
                      type="button"
                      onClick={() => void fetchCatalogAndStatus(true)}
                      className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#08060E] font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة المحاولة</span>
                    </button>
                  </div>
                ) : filteredGifts.length === 0 ? (
                  <div className="rounded-2xl bg-[#120E1E] border border-white/10 p-12 text-center max-w-xl mx-auto">
                    <h3 className="text-lg font-bold text-white mb-2">
                      لا توجد هدايا مطابقة لمعايير البحث الحالية
                    </h3>
                    <p className="text-xs text-slate-400 mb-6">
                      جرب تغيير التصنيف أو الصيغة المختارة، أو قم برفع هدية جديدة من لوحة التحكم.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSelectedFormat('ALL');
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo('admin')}
                        className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#08060E] text-xs font-bold"
                      >
                        رفع هدية جديدة
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      data-testid="gift-gallery-grid"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {displayedGifts.map((gift) => (
                        <GiftCard
                          key={gift.id}
                          gift={gift}
                          onPreview={(g) => setActivePreviewGift(g)}
                        />
                      ))}
                    </div>

                    {/* Progressive Pagination Load More */}
                    {filteredGifts.length > visibleLimit && (
                      <div className="mt-10 text-center">
                        <button
                          type="button"
                          onClick={() => setVisibleLimit((prev) => prev + 12)}
                          className="px-6 py-3 rounded-xl bg-[#120E1E] hover:bg-white/10 border border-white/15 text-xs font-bold text-[#D4AF37] transition-colors"
                        >
                          عرض المزيد من الهدايا ({filteredGifts.length - visibleLimit} متبقية)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Multi-Format Capabilities & Cloudflare R2 Storage Section */}
            <FormatCenterSection
              storageStatus={storageStatus}
              onSelectFormatFilter={(fmt) => {
                setSelectedFormat(fmt);
                setSelectedCategory('all');
              }}
            />
          </>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-white/10 py-8 bg-[#08060E] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-white">Gift Gallery</span>
            <span className="mx-2">·</span>
            <span>منصة عرض وإدارة هدايا التطبيقات الصوتية المتحركة</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/storage/catalog/gifts.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors font-mono"
            >
              catalog/gifts.json
            </a>
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="hover:text-[#D4AF37] transition-colors"
            >
              لوحة تحكم الإدارة
            </button>
          </div>
        </div>
      </footer>

      {/* Multi-Format Interactive Preview Modal */}
      <GiftPlayerModal
        gift={activePreviewGift}
        onClose={() => setActivePreviewGift(null)}
      />
    </div>
  );
}
