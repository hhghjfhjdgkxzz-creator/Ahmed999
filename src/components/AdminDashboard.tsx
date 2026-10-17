import React, { useState, useRef, useMemo } from 'react';
import {
  Lock,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  KeyRound,
  LogOut,
  Eye,
  Plus,
  FileUp,
  History,
  HardDrive,
  ArrowRight,
  X,
  Check,
  Sparkles,
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
  detectGiftFormat,
  formatBytes,
  filterAndSortGifts,
} from '../utils/catalogLogic';

interface UploadQueueItem {
  queueId: string;
  file: File;
  thumbnailFile?: File;
  name: string;
  category: Exclude<GiftCategory, 'all'>;
  description: string;
  format: GiftFormat | null;
  quality: 'HD' | 'FHD' | '4K' | 'Vector' | 'Original';
  displayOrder: number;
  published: boolean;
  allowDownload: boolean;
  hasAudio: boolean;
  hasAlpha: boolean;
  progress: number;
  status: 'pending' | 'uploading' | 'saved' | 'failed';
  errorMessage?: string;
  localPreviewUrl: string;
}

interface AdminDashboardProps {
  authenticated: boolean;
  isDefaultPassword: boolean;
  gifts: GiftItem[];
  unindexedFiles: UnindexedFileRecord[];
  auditLogs: AdminAuditLog[];
  storageStatus: StorageStatusInfo | null;
  onLoginSuccess: (isDefaultPwd: boolean) => void;
  onLogout: () => void;
  onCatalogChanged: () => Promise<void>;
  onPreviewGift: (gift: GiftItem) => void;
  onNavigateGallery: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authenticated,
  isDefaultPassword,
  gifts,
  unindexedFiles,
  auditLogs,
  storageStatus,
  onLoginSuccess,
  onLogout,
  onCatalogChanged,
  onPreviewGift,
  onNavigateGallery,
}) => {
  // Login state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'logs' | 'security'>('upload');

  // Upload Queue State
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [uploadBannerMsg, setUploadBannerMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Single Direct Form Upload State
  const [singleName, setSingleName] = useState('');
  const [singleCategory, setSingleCategory] = useState<Exclude<GiftCategory, 'all'>>('gifts');
  const [singleDescription, setSingleDescription] = useState('');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleThumbFile, setSingleThumbFile] = useState<File | null>(null);
  const [singleDisplayOrder, setSingleDisplayOrder] = useState<number>(1);
  const [singlePublished, setSinglePublished] = useState<boolean>(true);
  const [singleAllowDownload, setSingleAllowDownload] = useState<boolean>(true);
  const [isSingleUploading, setIsSingleUploading] = useState<boolean>(false);

  // Manage Gifts State
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<GiftCategory>('all');
  const [adminFormatFilter, setAdminFormatFilter] = useState<GiftFormat | 'ALL'>('ALL');
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [editReplacementFile, setEditReplacementFile] = useState<File | null>(null);
  const [editReplacementThumb, setEditReplacementThumb] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Password Change State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const filteredAdminGifts = useMemo(() => {
    return filterAndSortGifts(gifts, {
      searchQuery: adminSearch,
      category: adminCategoryFilter,
      format: adminFormatFilter,
      sortBy: 'order',
      includeUnpublished: true,
    });
  }, [gifts, adminSearch, adminCategoryFilter, adminFormatFilter]);

  function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('gift_gallery_admin_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  const handleSingleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFile) {
      setUploadBannerMsg({ type: 'error', text: 'يرجى اختيار الملف الأصلي للهدية أولًا.' });
      return;
    }
    const format = detectGiftFormat(singleFile.name);
    if (!format) {
      setUploadBannerMsg({
        type: 'error',
        text: `صيغة الملف "${singleFile.name}" غير مدعومة. الصيغ المدعومة: SVGA, VAP, MP4, WebM, GIF, WebP, APNG, SVG, Lottie JSON, PNG, JPG, ZIP.`,
      });
      return;
    }

    setIsSingleUploading(true);
    setUploadBannerMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', singleFile);
      if (singleThumbFile) {
        formData.append('thumbnail', singleThumbFile);
      }
      formData.append('name', singleName.trim() || singleFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('category', singleCategory);
      formData.append(
        'description',
        singleDescription.trim() || FORMAT_CAPABILITIES[format]?.descriptionAr || ''
      );
      formData.append('format', format);
      formData.append('quality', 'Original');
      formData.append('displayOrder', String(singleDisplayOrder || gifts.length + 1));
      formData.append('published', String(singlePublished));
      formData.append('allowDownload', String(singleAllowDownload));

      const res = await fetch('/api/admin/gifts/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.gift) {
        setUploadBannerMsg({
          type: 'success',
          text: `تم رفع وحفظ الهدية "${data.gift.name}" (${data.gift.format}) ونشرها في الفهرس بنجاح!`,
        });
        setSingleName('');
        setSingleDescription('');
        setSingleFile(null);
        setSingleThumbFile(null);
        setSingleDisplayOrder(gifts.length + 2);
        await onCatalogChanged();
      } else {
        setUploadBannerMsg({
          type: 'error',
          text: data.error || 'حدث خطأ أثناء رفع الملف وتحديث الفهرس.',
        });
      }
    } catch {
      setUploadBannerMsg({
        type: 'error',
        text: 'انقطع الاتصال بالخادم أثناء رفع الملف. يرجى إعادة المحاولة.',
      });
    } finally {
      setIsSingleUploading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!passwordInput.trim()) {
      setLoginError('يرجى إدخال كلمة مرور الإدارة.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'فشل تسجيل الدخول.');
      } else {
        if (data.token) {
          localStorage.setItem('gift_gallery_admin_token', data.token);
        }
        setPasswordInput('');
        onLoginSuccess(Boolean(data.isDefaultPassword));
      }
    } catch {
      setLoginError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const addFilesToQueue = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const nextItems: UploadQueueItem[] = incoming.map((file, idx) => {
      const detected = detectGiftFormat(file.name);
      const cap = detected ? FORMAT_CAPABILITIES[detected] : null;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      const isPreviewableImageOrVideo =
        detected && ['GIF', 'WebP', 'APNG', 'SVG', 'PNG', 'JPG', 'MP4', 'WebM'].includes(detected);

      return {
        queueId: `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: cleanTitle || 'هدية جديدة',
        category: 'gifts',
        description: cap ? cap.descriptionAr : 'صيغة غير مدعومة',
        format: detected,
        quality: 'Original',
        displayOrder: gifts.length + queue.length + idx + 1,
        published: true,
        allowDownload: true,
        hasAudio: cap ? cap.supportsAudio : false,
        hasAlpha: cap ? cap.supportsAlpha : true,
        progress: 0,
        status: detected ? 'pending' : 'failed',
        errorMessage: detected
          ? undefined
          : `الصيغة غير مدعومة (${file.name}). الصيغ المسموحة: SVGA, VAP, MP4, WebM, GIF, WebP, APNG, SVG, Lottie JSON, PNG, JPG, ZIP.`,
        localPreviewUrl: isPreviewableImageOrVideo ? URL.createObjectURL(file) : '',
      };
    });

    setQueue((prev) => [...prev, ...nextItems]);
    setUploadBannerMsg(null);
  };

  // Upload a single queue item using XMLHttpRequest to track real byte progress
  const uploadSingleQueueItem = (item: UploadQueueItem): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!item.format) {
        resolve(false);
        return;
      }

      setQueue((prev) =>
        prev.map((q) =>
          q.queueId === item.queueId
            ? { ...q, status: 'uploading', progress: 5, errorMessage: undefined }
            : q
        )
      );

      const formData = new FormData();
      formData.append('file', item.file);
      if (item.thumbnailFile) {
        formData.append('thumbnail', item.thumbnailFile);
      }
      formData.append('name', item.name);
      formData.append('category', item.category);
      formData.append('description', item.description);
      formData.append('format', item.format);
      formData.append('quality', item.quality);
      formData.append('displayOrder', String(item.displayOrder));
      formData.append('published', String(item.published));
      formData.append('allowDownload', String(item.allowDownload));
      formData.append('hasAudio', String(item.hasAudio));
      formData.append('hasAlpha', String(item.hasAlpha));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/gifts/upload', true);
      const authH = getAuthHeaders();
      if (authH.Authorization) {
        xhr.setRequestHeader('Authorization', authH.Authorization);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
          setQueue((prev) =>
            prev.map((q) => (q.queueId === item.queueId ? { ...q, progress: pct } : q))
          );
        }
      };

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && response.gift) {
            setQueue((prev) =>
              prev.map((q) =>
                q.queueId === item.queueId
                  ? { ...q, status: 'saved', progress: 100, errorMessage: undefined }
                  : q
              )
            );
            resolve(true);
          } else {
            setQueue((prev) =>
              prev.map((q) =>
                q.queueId === item.queueId
                  ? {
                      ...q,
                      status: 'failed',
                      progress: 0,
                      errorMessage: response.error || 'فشل حفظ الملف وتحديث الفهرس.',
                    }
                  : q
              )
            );
            resolve(false);
          }
        } catch {
          setQueue((prev) =>
            prev.map((q) =>
              q.queueId === item.queueId
                ? { ...q, status: 'failed', progress: 0, errorMessage: 'استجابة غير صالحة من الخادم.' }
                : q
            )
          );
          resolve(false);
        }
      };

      xhr.onerror = () => {
        setQueue((prev) =>
          prev.map((q) =>
            q.queueId === item.queueId
              ? {
                  ...q,
                  status: 'failed',
                  progress: 0,
                  errorMessage: 'انقطع الاتصال بالشبكة أثناء الرفع. يمكنك إعادة المحاولة.',
                }
              : q
          )
        );
        resolve(false);
      };

      xhr.send(formData);
    });
  };

  const handleUploadAllPending = async () => {
    const pendingItems = queue.filter((q) => q.status === 'pending' || q.status === 'failed');
    const validTargets = pendingItems.filter((q) => q.format !== null);
    if (validTargets.length === 0) return;

    setIsBatchUploading(true);
    setUploadBannerMsg(null);

    let successCount = 0;
    let failCount = 0;

    for (const item of validTargets) {
      const ok = await uploadSingleQueueItem(item);
      if (ok) successCount++;
      else failCount++;
    }

    await onCatalogChanged();
    setIsBatchUploading(false);

    if (successCount > 0 && failCount === 0) {
      setUploadBannerMsg({
        type: 'success',
        text: `تم رفع وحفظ ${successCount} هدية في التخزين الدائم وتحديث الفهرس المركزي (gifts.json) بنجاح.`,
      });
    } else if (successCount > 0 && failCount > 0) {
      setUploadBannerMsg({
        type: 'error',
        text: `تم حفظ ${successCount} هدية بنجاح، وتعذر رفع ${failCount} ملف. راجع الأخطاء بالأسفل لإعادة المحاولة.`,
      });
    } else {
      setUploadBannerMsg({
        type: 'error',
        text: 'تعذر إكمال رفع الملفات المحددة. يرجى التحقق من الصيغة والمحاولة مجددًا.',
      });
    }
  };

  // Quick Demo Sample Generator in Admin so Admin can test real file upload with 1 click
  const handleAddSampleSvgaFileToQueue = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><circle cx="250" cy="250" r="180" fill="#7C3AED" stroke="#D4AF37" stroke-width="12"/></svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const sampleFile = new File([blob], `royal_wing_${Date.now().toString().slice(-4)}.svg`, {
      type: 'image/svg+xml',
    });
    addFilesToQueue([sampleFile]);
  };

  const handleRetryUnindexed = async (unindexedId: string) => {
    try {
      const res = await fetch(`/api/admin/gifts/retry-index/${unindexedId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await onCatalogChanged();
      }
    } catch {
      // ignore
    }
  };

  const handleSaveEditGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    setIsSavingEdit(true);

    try {
      const formData = new FormData();
      formData.append('name', editingGift.name);
      formData.append('category', editingGift.category);
      formData.append('description', editingGift.description);
      formData.append('displayOrder', String(editingGift.displayOrder));
      formData.append('quality', editingGift.quality || 'Original');
      formData.append('published', String(editingGift.published));
      formData.append('allowDownload', String(editingGift.allowDownload));
      formData.append('hasAudio', String(editingGift.hasAudio));
      formData.append('hasAlpha', String(editingGift.hasAlpha));

      if (editReplacementFile) {
        formData.append('file', editReplacementFile);
      }
      if (editReplacementThumb) {
        formData.append('thumbnail', editReplacementThumb);
      }

      const res = await fetch(`/api/admin/gifts/${editingGift.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setEditingGift(null);
        setEditReplacementFile(null);
        setEditReplacementThumb(null);
        await onCatalogChanged();
      } else {
        setUploadBannerMsg({ type: 'error', text: data.error || 'فشل تحديث الهدية' });
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/admin/gifts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        await onCatalogChanged();
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);
    if (newPwd !== confirmNewPwd) {
      setPwdFeedback({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
      return;
    }
    setIsUpdatingPwd(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdFeedback({ type: 'error', text: data.error || 'تعذر تغيير كلمة المرور.' });
      } else {
        setCurrentPwd('');
        setNewPwd('');
        setConfirmNewPwd('');
        setPwdFeedback({
          type: 'success',
          text: 'تم تحديث كلمة المرور بنجاح وحفظها بشكل مشفر على الخادم.',
        });
        onLoginSuccess(Boolean(data.isDefaultPassword));
      }
    } catch {
      setPwdFeedback({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم.' });
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  // ==========================================
  // Unauthenticated Admin Login View
  // ==========================================
  if (!authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-[#120E1E] border border-white/15 p-7 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Lock className="w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={onNavigateGallery}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>العودة للمعرض</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            تسجيل دخول لوحة التحكم
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            هذه المنطقة مخصصة لمدير منصة Gift Gallery لرفع الهدايا المتحركة وتحديث الفهرس المركزي الدائم (<code className="font-mono text-slate-200">gifts.json</code>).
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-semibold text-slate-300 mb-2"
              >
                كلمة مرور المدير
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="أدخل 150150 أو 150 150..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-[#08060E] border border-white/15 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
              <div className="mt-2.5 p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#D4AF37] flex items-center gap-2 font-bold">
                <KeyRound className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                <span>كلمة المرور الافتراضية للوحة هي: 150150 (أو 150 150)</span>
              </div>
            </div>

            {loginError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-[#08060E] font-extrabold text-sm transition-all shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
            >
              {isLoggingIn ? 'جاري التحقق والدخول...' : 'دخول إلى لوحة الإدارة والرفع (150150)'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
            تتم مصادقة الجلسة عبر الخادم (HttpOnly Signed Session) دون كشف أي مفاتيح تخزين في المتصفح.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Authenticated Admin Workspace
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Top Header & KPI Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
        <div>
          <div className="text-xs text-[#D4AF37] font-semibold mb-1">
            Gift Gallery Admin Console · إدارة التخزين المركزي
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            لوحة إدارة ورفع الهدايا المتحركة
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateGallery}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            معاينة المعرض العام
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Security Notice if still using initial password 150150 */}
      {isDefaultPassword && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              أنت تستخدم كلمة المرور الأولية (<code className="font-mono">150150</code>). لحماية مكتبة الهدايا عند نشر الموقع للعامة، يُنصح بتغييرها من تبويب الأمان.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            تغيير كلمة المرور الآن
          </button>
        </div>
      )}

      {/* 4-Column Admin KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl bg-[#120E1E] border border-white/10 p-4">
          <span className="text-xs text-slate-400 block mb-1">إجمالي الهدايا في الفهرس</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {gifts.length}
          </span>
          <span className="text-[11px] text-emerald-400 block mt-1">
            {gifts.filter((g) => g.published).length} منشورة للجمهور
          </span>
        </div>

        <div className="rounded-xl bg-[#120E1E] border border-white/10 p-4">
          <span className="text-xs text-slate-400 block mb-1">الحجم الفعلي للمكتبة</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-[#D4AF37]">
            {formatBytes(gifts.reduce((acc, g) => acc + (g.sizeBytes || 0), 0))}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            من أصل 10 GB حصة R2 المجانية
          </span>
        </div>

        <div className="rounded-xl bg-[#120E1E] border border-white/10 p-4">
          <span className="text-xs text-slate-400 block mb-1">حالة مخزن الكائنات</span>
          <span className="text-base font-bold text-white block truncate">
            {storageStatus?.r2Configured ? 'Cloudflare R2 Cloud' : 'Persistent R2 Mirror'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            الفهرس: catalog/gifts.json
          </span>
        </div>

        <div className="rounded-xl bg-[#120E1E] border border-white/10 p-4">
          <span className="text-xs text-slate-400 block mb-1">ملفات بانتظار إعادة الفهرسة</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {unindexedFiles.length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">
            حماية ضد فقدان الرفع
          </span>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#120E1E] border border-white/10 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'upload'
              ? 'bg-[#D4AF37] text-[#08060E]'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>رفع الهدايا (فردي / دفعات)</span>
          {queue.length > 0 && (
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/20">
              {queue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'manage'
              ? 'bg-[#D4AF37] text-[#08060E]'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>إدارة وتعديل الهدايا ({gifts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'logs'
              ? 'bg-[#D4AF37] text-[#08060E]'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل العمليات الإدارية ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'security'
              ? 'bg-[#D4AF37] text-[#08060E]'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>الأمان وإعدادات R2</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: UPLOAD & BATCH QUEUE                */}
      {/* ========================================== */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Section 1: Single Direct Gift Upload Form */}
          <div className="rounded-2xl bg-[#120E1E] border border-[#D4AF37]/30 p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#D4AF37]" />
                  <span>رفع وحفظ هدية واحدة مباشر (Single Gift Upload)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  اختر الملف الأصلي، ادخل اسم وتصنيف الهدية، ثم اضغط على زر "رفع وحفظ الهدية الآن" بالنواة الذهبية
                </p>
              </div>
            </div>

            <form onSubmit={handleSingleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    1. اختر الملف الأصلي للهدية *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".svga,.vap,.mp4,.webm,.gif,.webp,.apng,.svg,.json,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSingleFile(file);
                      if (file && !singleName) {
                        setSingleName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-slate-200 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#D4AF37]/20 file:text-[#D4AF37] file:font-semibold cursor-pointer"
                  />
                  {singleFile && (
                    <div className="mt-1 text-[11px] text-emerald-400 font-mono">
                      تم الاختيار: {singleFile.name} ({formatBytes(singleFile.size)})
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    2. اسم الهدية
                  </label>
                  <input
                    type="text"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="مثال: تنين الإمبراطور الذهبي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    3. التصنيف
                  </label>
                  <select
                    value={singleCategory}
                    onChange={(e) =>
                      setSingleCategory(e.target.value as Exclude<GiftCategory, 'all'>)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="gifts">هدايا الحفلات (Room Gifts)</option>
                    <option value="frames">إطارات المايك (Avatar Frames)</option>
                    <option value="entrances">دخوليات ملكية (Entrance Mounts)</option>
                    <option value="vip">شارات VIP (VIP Exclusive)</option>
                    <option value="effects">مؤثرات الغرف (Room Effects)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    وصف الهدية (اختياري)
                  </label>
                  <input
                    type="text"
                    value={singleDescription}
                    onChange={(e) => setSingleDescription(e.target.value)}
                    placeholder="وصف مختصر للهدية والمؤثرات الصوتية والشفافية..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    صورة مصغرة مخصصة Thumbnail (اختياري)
                  </label>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                    onChange={(e) => setSingleThumbFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-slate-200 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              {/* Primary Prominent Action Button: "رفع وحفظ الهدية الآن" */}
              <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-white/10">
                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singlePublished}
                      onChange={(e) => setSinglePublished(e.target.checked)}
                    />
                    <span>نشر فوري في المعرض</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singleAllowDownload}
                      onChange={(e) => setSingleAllowDownload(e.target.checked)}
                    />
                    <span>السماح بالتنزيل المباشر</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSingleUploading || !singleFile}
                  className="px-8 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#08060E] font-extrabold text-sm flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-[#D4AF37]/20 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="w-5 h-5" />
                  <span>
                    {isSingleUploading
                      ? 'جاري الرفع وحفظ الهدية...'
                      : 'رفع وحفظ الهدية الآن (Upload & Save Gift)'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Drag and Drop Batch Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addFilesToQueue(e.dataTransfer.files);
              }
            }}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                : 'border-white/15 bg-[#120E1E]/80 hover:border-[#D4AF37]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".svga,.vap,.mp4,.webm,.gif,.webp,.apng,.svg,.json,.png,.jpg,.jpeg,.zip"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addFilesToQueue(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
              id="gift-file-upload-input"
            />

            <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-3 text-[#D4AF37]">
              <FileUp className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
              سحب وإفلات لرفع عدة ملفات دفعة واحدة (Batch Multi-Upload)
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mx-auto mb-4 leading-relaxed">
              اسحب وأسقط مئات الملفات هنا دفعة واحدة، وستظهر في القائمة أدناه مع زر "رفع وحفظ" مباشر لكل ملف.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                <span>اختر ملفات هدايا متعددة من جهازك</span>
              </button>

              <button
                type="button"
                onClick={handleAddSampleSvgaFileToQueue}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>تجربة إضافة ملف تجريبي للقائمة</span>
              </button>
            </div>
          </div>

          {uploadBannerMsg && (
            <div
              role="status"
              className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                uploadBannerMsg.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {uploadBannerMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{uploadBannerMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadBannerMsg(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload Queue Items List */}
          {queue.length > 0 && (
            <div className="rounded-2xl bg-[#120E1E] border border-white/10 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    قائمة الملفات المجهزة للرفع ({queue.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    يمكنك رفع وحفظ أي ملف بشكل منفصل أو رفع جميع الملفات بضغطة واحدة
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQueue([])}
                    disabled={isBatchUploading}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
                  >
                    مسح القائمة
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadAllPending}
                    disabled={
                      isBatchUploading ||
                      queue.filter((q) => (q.status === 'pending' || q.status === 'failed') && q.format)
                        .length === 0
                    }
                    className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-40 text-[#08060E] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isBatchUploading
                        ? 'جاري رفع وحفظ الجميع...'
                        : 'رفع وحفظ جميع الملفات المحددة'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {queue.map((item) => (
                  <div
                    key={item.queueId}
                    className="rounded-xl bg-[#08060E] border border-white/10 p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
                  >
                    {/* Preview + Basic File Info */}
                    <div className="flex items-center gap-3.5 min-w-[220px]">
                      <div className="w-14 h-14 rounded-lg bg-[#18122B] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {item.localPreviewUrl ? (
                          <img
                            src={item.localPreviewUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="font-mono text-xs font-bold text-[#D4AF37]">
                            {item.format || 'ERR'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-slate-400 truncate max-w-[200px]">
                          {item.file.name}
                        </div>
                        <div className="text-xs text-slate-300 font-mono tabular-nums mt-0.5">
                          {formatBytes(item.file.size)} · {item.format || 'غير مدعوم'}
                        </div>
                        {/* Status Label */}
                        <div className="mt-1 text-[11px] font-semibold">
                          {item.status === 'pending' && (
                            <span className="text-amber-300">جاهز للرفع والحفظ</span>
                          )}
                          {item.status === 'uploading' && (
                            <span className="text-sky-400">
                              جاري الرفع والحفظ ({item.progress}%)...
                            </span>
                          )}
                          {item.status === 'saved' && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              تم الرفع والحفظ بالفهرس
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-rose-400">
                              فشل: {item.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editable Fields before Upload */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          اسم الهدية
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          disabled={item.status === 'saved' || item.status === 'uploading'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQueue((prev) =>
                              prev.map((q) =>
                                q.queueId === item.queueId ? { ...q, name: val } : q
                              )
                            );
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#120E1E] border border-white/10 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          التصنيف
                        </label>
                        <select
                          value={item.category}
                          disabled={item.status === 'saved' || item.status === 'uploading'}
                          onChange={(e) => {
                            const val = e.target.value as Exclude<GiftCategory, 'all'>;
                            setQueue((prev) =>
                              prev.map((q) =>
                                q.queueId === item.queueId ? { ...q, category: val } : q
                              )
                            );
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#120E1E] border border-white/10 text-xs text-white"
                        >
                          <option value="gifts">هدايا الحفلات</option>
                          <option value="frames">إطارات المايك</option>
                          <option value="entrances">دخوليات ملكية</option>
                          <option value="vip">شارات VIP</option>
                          <option value="effects">مؤثرات الغرف</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          ترتيب الظهور / النشر
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.displayOrder}
                            disabled={item.status === 'saved' || item.status === 'uploading'}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              setQueue((prev) =>
                                prev.map((q) =>
                                  q.queueId === item.queueId ? { ...q, displayOrder: val } : q
                                )
                              );
                            }}
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-[#120E1E] border border-white/10 text-xs text-white font-mono"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.published}
                              disabled={item.status === 'saved' || item.status === 'uploading'}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setQueue((prev) =>
                                  prev.map((q) =>
                                    q.queueId === item.queueId ? { ...q, published: checked } : q
                                  )
                                );
                              }}
                            />
                            <span>نشر فوري</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Individual Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      {item.status === 'pending' && item.format && (
                        <button
                          type="button"
                          onClick={() =>
                            void uploadSingleQueueItem(item).then(() => onCatalogChanged())
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#08060E] font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع وحفظ هذا الملف</span>
                        </button>
                      )}

                      {item.status === 'failed' && item.format && (
                        <button
                          type="button"
                          onClick={() => void uploadSingleQueueItem(item).then(() => onCatalogChanged())}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>إعادة المحاولة</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setQueue((prev) => prev.filter((q) => q.queueId !== item.queueId))
                        }
                        aria-label="إزالة من القائمة"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unindexed Files Recovery Section (If any upload succeeded to R2 but failed catalog indexing) */}
          {unindexedFiles.length > 0 && (
            <div className="rounded-2xl bg-amber-950/30 border border-amber-500/30 p-6">
              <h3 className="text-base font-bold text-amber-200 mb-2">
                ملفات مرفوعة بانتظار إعادة الفهرسة ({unindexedFiles.length})
              </h3>
              <p className="text-xs text-amber-300/80 mb-4">
                هذه الملفات تم حفظها فعليًا في التخزين ولكن تعذر تحديث الفهرس لحظة رفعها. يمكنك نشرها فورًا بضغطة واحدة دون إعادة رفعها.
              </p>
              <div className="space-y-2.5">
                {unindexedFiles.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{u.fileName}</span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="font-mono">{u.format}</span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="font-mono">{formatBytes(u.sizeBytes)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRetryUnindexed(u.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#08060E] font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة الفهرسة والنشر</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: MANAGE & EDIT GIFTS                 */}
      {/* ========================================== */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#120E1E] border border-white/10 p-4 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="ابحث في الفهرس بالاسم أو الوصف أو المعرّف..."
                className="w-full pr-10 pl-4 py-2 rounded-xl bg-[#08060E] border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={adminCategoryFilter}
                onChange={(e) => setAdminCategoryFilter(e.target.value as GiftCategory)}
                aria-label="تصفية حسب التصنيف"
                className="px-3 py-2 rounded-xl bg-[#08060E] border border-white/10 text-xs text-slate-200"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.labelAr}
                  </option>
                ))}
              </select>

              <select
                value={adminFormatFilter}
                onChange={(e) => setAdminFormatFilter(e.target.value as GiftFormat | 'ALL')}
                aria-label="تصفية حسب الصيغة"
                className="px-3 py-2 rounded-xl bg-[#08060E] border border-white/10 text-xs text-slate-200 font-mono"
              >
                <option value="ALL">كل الصيغ</option>
                {Object.keys(FORMAT_CAPABILITIES).map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* High-Density Admin Catalog Table */}
          <div className="rounded-2xl bg-[#120E1E] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">الهدية</th>
                    <th className="py-3.5 px-4 font-semibold">التصنيف</th>
                    <th className="py-3.5 px-4 font-semibold">الصيغة</th>
                    <th className="py-3.5 px-4 font-semibold">الحجم</th>
                    <th className="py-3.5 px-4 font-semibold">الترتيب</th>
                    <th className="py-3.5 px-4 font-semibold">الحالة</th>
                    <th className="py-3.5 px-4 font-semibold text-left">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAdminGifts.map((gift) => (
                    <tr key={gift.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={gift.thumbnailUrl}
                            alt={gift.name}
                            className="w-10 h-10 rounded-lg object-contain bg-[#08060E] border border-white/10 p-1 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm">
                              {gift.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                              {gift.storageKey || gift.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {CATEGORY_LABELS[gift.category]?.labelAr}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#D4AF37]">
                        {gift.format}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-300">
                        {formatBytes(gift.sizeBytes)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-300">
                        #{gift.displayOrder}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {gift.published ? (
                          <span className="text-emerald-400 font-semibold">منشور</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">مخفي (مسودة)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onPreviewGift(gift)}
                            aria-label={`معاينة ${gift.name}`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGift({ ...gift });
                              setEditReplacementFile(null);
                              setEditReplacementThumb(null);
                            }}
                            aria-label={`تعديل ${gift.name}`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 text-slate-300 hover:text-[#D4AF37]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === gift.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isDeletingId === gift.id}
                                onClick={() => void handleDeleteGift(gift.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold"
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded bg-white/10 text-slate-300 text-[11px]"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(gift.id)}
                              aria-label={`حذف ${gift.name}`}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit / Replace Modal */}
          {editingGift && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
            >
              <form
                onSubmit={handleSaveEditGift}
                className="w-full max-w-xl rounded-2xl bg-[#120E1E] border border-white/15 p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-lg font-bold text-white">
                    تعديل بيانات الهدية أو استبدال ملفها
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingGift(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">اسم الهدية</label>
                    <input
                      type="text"
                      value={editingGift.name}
                      onChange={(e) =>
                        setEditingGift({ ...editingGift, name: e.target.value })
                      }
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">التصنيف</label>
                    <select
                      value={editingGift.category}
                      onChange={(e) =>
                        setEditingGift({
                          ...editingGift,
                          category: e.target.value as Exclude<GiftCategory, 'all'>,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white"
                    >
                      <option value="gifts">هدايا الحفلات</option>
                      <option value="frames">إطارات المايك</option>
                      <option value="entrances">دخوليات ملكية</option>
                      <option value="vip">شارات VIP</option>
                      <option value="effects">مؤثرات الغرف</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">وصف الهدية</label>
                  <textarea
                    rows={2}
                    value={editingGift.description}
                    onChange={(e) =>
                      setEditingGift({ ...editingGift, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">ترتيب العرض</label>
                    <input
                      type="number"
                      value={editingGift.displayOrder}
                      onChange={(e) =>
                        setEditingGift({
                          ...editingGift,
                          displayOrder: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">الجودة</label>
                    <select
                      value={editingGift.quality || 'Original'}
                      onChange={(e) =>
                        setEditingGift({
                          ...editingGift,
                          quality: e.target.value as GiftItem['quality'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white"
                    >
                      <option value="Original">Original</option>
                      <option value="HD">HD</option>
                      <option value="FHD">FHD</option>
                      <option value="4K">4K</option>
                      <option value="Vector">Vector</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingGift.published}
                        onChange={(e) =>
                          setEditingGift({ ...editingGift, published: e.target.checked })
                        }
                      />
                      <span>منشور في المعرض</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingGift.allowDownload}
                        onChange={(e) =>
                          setEditingGift({ ...editingGift, allowDownload: e.target.checked })
                        }
                      />
                      <span>السماح بالتنزيل</span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      استبدال الملف الأصلي (اختياري)
                    </label>
                    <input
                      type="file"
                      accept=".svga,.vap,.mp4,.webm,.gif,.webp,.apng,.svg,.json,.png,.jpg,.jpeg,.zip"
                      onChange={(e) => setEditReplacementFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      تحديث الصورة المصغرة Thumbnail (اختياري)
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                      onChange={(e) => setEditReplacementThumb(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingGift(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl bg-[#D4AF37] text-[#08060E] font-bold text-xs"
                  >
                    {isSavingEdit ? 'جاري الحفظ...' : 'حفظ التغييرات وتحديث الفهرس'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: AUDIT LOGS                          */}
      {/* ========================================== */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl bg-[#120E1E] border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">سجل العمليات الإدارية (Audit Log)</h3>
              <p className="text-xs text-slate-400">
                توثيق زمني لجميع عمليات الرفع والتعديل والحذف وتحديث الفهرس دون تسجيل أي كلمات مرور أو أسرار
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-400">
                  <th className="py-3 px-4 font-semibold">التوقيت</th>
                  <th className="py-3 px-4 font-semibold">العملية</th>
                  <th className="py-3 px-4 font-semibold">الملف / العنصر</th>
                  <th className="py-3 px-4 font-semibold">النتيجة</th>
                  <th className="py-3 px-4 font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#D4AF37] uppercase">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {log.fileName}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'success' ? (
                        <span className="text-emerald-400 font-semibold">ناجحة</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">فشل</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: SECURITY & R2 CONFIGURATION         */}
      {/* ========================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Password Change Form */}
          <div className="lg:col-span-6 rounded-2xl bg-[#120E1E] border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-2">
              تغيير كلمة مرور لوحة التحكم
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              تُحفظ كلمة المرور الجديدة بتشفير <code className="font-mono text-slate-200">scrypt + salt</code> على الخادم، ولا تظهر أبدًا في كود الواجهة الأمامية.
            </p>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  كلمة المرور الجديدة (6 خانات على الأقل)
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={confirmNewPwd}
                  onChange={(e) => setConfirmNewPwd(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08060E] border border-white/15 text-xs text-white font-mono"
                />
              </div>

              {pwdFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    pwdFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {pwdFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPwd}
                className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-[#08060E] font-bold text-xs"
              >
                {isUpdatingPwd ? 'جاري التحديث...' : 'حفظ كلمة المرور الجديدة'}
              </button>
            </form>
          </div>

          {/* Cloudflare R2 Setup & Environment Instructions */}
          <div className="lg:col-span-6 rounded-2xl bg-[#120E1E] border border-white/10 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              إعداد متغيرات البيئة لـ Cloudflare R2
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              لربط الموقع بحساب Cloudflare R2 الخارجي الخاص بك، أضف المتغيرات السرية التالية في إعدادات الخادم (Server Environment Secrets) كما هو موضح في ملف <code className="font-mono text-[#D4AF37]">.env.example</code>:
            </p>

            <pre
              dir="ltr"
              className="p-4 rounded-xl bg-[#08060E] border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed"
            >
{`R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="gift-gallery-storage"
R2_PUBLIC_BASE_URL="https://pub-xxx.r2.dev"`}
            </pre>

            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                • في حال عدم إدخال مفاتيح R2 السحابية بعد، يقوم الخادم تلقائيًا بتشغيل وضع المرآة المحلية الدائمة (<code className="font-mono text-slate-200">storage/gifts/</code> و <code className="font-mono text-slate-200">storage/catalog/gifts.json</code>) بنفس الهيكل المنطقي وبنفس آلية التحديث الفوري لجميع المستخدمين.
              </p>
              <p>
                • يمكنك أيضًا تفعيل النسخ الاحتياطي التلقائي للفهرس إلى GitHub عبر متغيرات <code className="font-mono text-slate-200">GITHUB_TOKEN</code> و <code className="font-mono text-slate-200">GITHUB_REPO_NAME</code> على الخادم فقط.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
