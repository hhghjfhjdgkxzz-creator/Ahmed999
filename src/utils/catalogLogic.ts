export type GiftCategory =
  | 'all'
  | 'gifts'
  | 'frames'
  | 'entrances'
  | 'vip'
  | 'effects';

export type GiftFormat =
  | 'SVGA'
  | 'VAP'
  | 'MP4'
  | 'WebM'
  | 'GIF'
  | 'WebP'
  | 'APNG'
  | 'SVG'
  | 'Lottie'
  | 'PNG'
  | 'JPG'
  | 'ZIP';

export interface GiftItem {
  id: string;
  name: string;
  category: Exclude<GiftCategory, 'all'>;
  description: string;
  originalUrl: string;
  thumbnailUrl: string;
  previewUrl?: string;
  format: GiftFormat;
  sizeBytes: number;
  quality?: 'HD' | 'FHD' | '4K' | 'Vector' | 'Original';
  hasAudio: boolean;
  hasAlpha: boolean;
  isAnimated: boolean;
  displayOrder: number;
  published: boolean;
  allowDownload: boolean;
  uploadedAt: string;
  updatedAt: string;
  storageKey?: string;
  thumbnailKey?: string;
  checksum?: string;
}

export interface UnindexedFileRecord {
  id: string;
  fileName: string;
  storageKey: string;
  originalUrl: string;
  sizeBytes: number;
  format: GiftFormat;
  failedAt: string;
  reason: string;
  metadataDraft: Partial<GiftItem>;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  action: 'upload' | 'update' | 'delete' | 'replace' | 'retry_index' | 'password_change' | 'login' | 'seed';
  fileName: string;
  giftId?: string;
  status: 'success' | 'error';
  message: string;
}

export interface CatalogIndex {
  version: number;
  updatedAt: string;
  totalCount: number;
  totalBytes: number;
  items: GiftItem[];
  unindexedFiles: UnindexedFileRecord[];
  auditLogs: AdminAuditLog[];
}

export interface StorageStatusInfo {
  mode: 'cloudflare_r2' | 'persistent_local_mirror';
  r2Configured: boolean;
  githubBackupConfigured: boolean;
  bucketName: string;
  publicBaseUrl: string;
  freeTierLimits: {
    storageBytes: number; // 10 GB
    classAOpsMonthly: number; // 1,000,000
    classBOpsMonthly: number; // 10,000,000
  };
  currentUsage: {
    totalGifts: number;
    publishedGifts: number;
    totalBytes: number;
    unindexedCount: number;
  };
  maxUploadFileSizeMb: number;
}

export interface FormatCapability {
  format: GiftFormat;
  extensions: string[];
  mimeTypes: string[];
  supportsAnimation: boolean;
  supportsAlpha: boolean;
  supportsAudio: boolean;
  playerType: 'svga' | 'video' | 'vap' | 'lottie' | 'image' | 'archive';
  badgeColor: string;
  descriptionAr: string;
}

export const FORMAT_CAPABILITIES: Record<GiftFormat, FormatCapability> = {
  SVGA: {
    format: 'SVGA',
    extensions: ['.svga'],
    mimeTypes: ['application/octet-stream', 'application/x-svga'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: true,
    playerType: 'svga',
    badgeColor: '#D4AF37',
    descriptionAr: 'صيغة الهدايا الصوتية القياسية (SVGA Player) تدعم الشفافية الكاملة والصوت المدمج.',
  },
  VAP: {
    format: 'VAP',
    extensions: ['.vap'],
    mimeTypes: ['video/mp4', 'application/octet-stream'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: true,
    playerType: 'vap',
    badgeColor: '#A855F7',
    descriptionAr: 'فيديو Alpha Channel متقدم (Video Animation Player) لدخوليات الـ VIP الفاخرة مع الصوت.',
  },
  MP4: {
    format: 'MP4',
    extensions: ['.mp4'],
    mimeTypes: ['video/mp4'],
    supportsAnimation: true,
    supportsAlpha: false,
    supportsAudio: true,
    playerType: 'video',
    badgeColor: '#3B82F6',
    descriptionAr: 'فيديو عالي الدقة MP4 مع دعم كامل للمؤثرات الصوتية وجودة 4K.',
  },
  WebM: {
    format: 'WebM',
    extensions: ['.webm'],
    mimeTypes: ['video/webm'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: true,
    playerType: 'video',
    badgeColor: '#06B6D4',
    descriptionAr: 'فيديو ويب شفاف يدعم قناة ألفا (VP8/VP9 Alpha) مع الصوت.',
  },
  Lottie: {
    format: 'Lottie',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'lottie',
    badgeColor: '#10B981',
    descriptionAr: 'رسوم متجهة متحركة فائقة النقاء (Lottie JSON) قابلة للتكبير بلا فقدان جودة.',
  },
  GIF: {
    format: 'GIF',
    extensions: ['.gif'],
    mimeTypes: ['image/gif'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#EC4899',
    descriptionAr: 'صورة متحركة كلاسيكية سريعة التشغيل في جميع المتصفحات.',
  },
  WebP: {
    format: 'WebP',
    extensions: ['.webp'],
    mimeTypes: ['image/webp'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#8B5CF6',
    descriptionAr: 'صيغة WebP المتحركة عالية الضغط مع شفافية كاملة وحجم خفيف.',
  },
  APNG: {
    format: 'APNG',
    extensions: ['.apng'],
    mimeTypes: ['image/apng', 'image/png'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#F59E0B',
    descriptionAr: 'صورة PNG متحركة بدقة ألوان 24-bit وشفافية ناعمة للإطارات.',
  },
  SVG: {
    format: 'SVG',
    extensions: ['.svg'],
    mimeTypes: ['image/svg+xml'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#F97316',
    descriptionAr: 'رسوم متجهة (Vector SVG) تدعم التحريك عبر CSS/SMIL والشفافية.',
  },
  PNG: {
    format: 'PNG',
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    supportsAnimation: false,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#64748B',
    descriptionAr: 'صورة شفافة عالية الجودة لإطارات الصور الرمزية والشارات.',
  },
  JPG: {
    format: 'JPG',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg'],
    supportsAnimation: false,
    supportsAlpha: false,
    supportsAudio: false,
    playerType: 'image',
    badgeColor: '#475569',
    descriptionAr: 'صورة ثابتة قياسية للمعاينات والخلفيات الصوتية.',
  },
  ZIP: {
    format: 'ZIP',
    extensions: ['.zip'],
    mimeTypes: ['application/zip', 'application/x-zip-compressed'],
    supportsAnimation: true,
    supportsAlpha: true,
    supportsAudio: false,
    playerType: 'archive',
    badgeColor: '#94A3B8',
    descriptionAr: 'حزمة تسلسل صور (Image Sequence Archive) أو موارد هدايا مضغوطة.',
  },
};

export const CATEGORY_LABELS: Record<GiftCategory, { labelAr: string; labelEn: string; descAr: string }> = {
  all: { labelAr: 'الكل', labelEn: 'All Assets', descAr: 'جميع الهدايا والإطارات والدخوليات المنشورة' },
  gifts: { labelAr: 'هدايا الحفلات', labelEn: 'Room Gifts', descAr: 'هدايا تفاعلية متحركة لغرف الدردشة الصوتية' },
  frames: { labelAr: 'إطارات المايك', labelEn: 'Avatar Frames', descAr: 'إطارات مضيئة ومتحركة حول صورة المستخدم' },
  entrances: { labelAr: 'دخوليات ملكية', labelEn: 'Entrance Mounts', descAr: 'سيارات، يخوت، وتنانين دخول الغرف الصوتية' },
  vip: { labelAr: 'شارات ومزايا VIP', labelEn: 'VIP Exclusive', descAr: 'أوسمة وشارات كبار الشخصيات والملوك' },
  effects: { labelAr: 'مؤثرات الغرف', labelEn: 'Room Effects', descAr: 'مؤثرات ملء الشاشة وإضاءات المسرح الصوتي' },
};

export function normalizePasswordString(p: string): string {
  if (!p) return '';
  // Convert Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits to ASCII (0-9)
  const ascii = p
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
  
  return ascii.trim();
}

// Pure helper functions for validation, formatting, and filtering

export function detectGiftFormat(filename: string, explicitFormat?: string): GiftFormat | null {
  if (explicitFormat && explicitFormat in FORMAT_CAPABILITIES) {
    return explicitFormat as GiftFormat;
  }
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith('.svga')) return 'SVGA';
  if (lower.endsWith('.vap')) return 'VAP';
  if (lower.endsWith('.mp4')) return 'MP4';
  if (lower.endsWith('.webm')) return 'WebM';
  if (lower.endsWith('.gif')) return 'GIF';
  if (lower.endsWith('.webp')) return 'WebP';
  if (lower.endsWith('.apng')) return 'APNG';
  if (lower.endsWith('.svg')) return 'SVG';
  if (lower.endsWith('.json')) return 'Lottie';
  if (lower.endsWith('.png')) return 'PNG';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  if (lower.endsWith('.zip')) return 'ZIP';
  return null;
}

export function sanitizeStorageFileName(originalName: string): string {
  // Prevent path traversal and dangerous characters while preserving safe extension
  const base = originalName.replace(/^.*[\\/]/, '');
  const parts = base.split('.');
  const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const namePart = parts
    .join('.')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
  return (namePart || 'gift_asset') + ext;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const val = bytes / Math.pow(k, i);
  return `${val >= 100 || i === 0 ? val.toFixed(0) : val.toFixed(2)} ${sizes[i]}`;
}

export interface FilterOptions {
  searchQuery?: string;
  category?: GiftCategory;
  format?: GiftFormat | 'ALL';
  sortBy?: 'newest' | 'order' | 'name' | 'size_desc' | 'category';
  includeUnpublished?: boolean;
}

export function filterAndSortGifts(items: GiftItem[], options: FilterOptions): GiftItem[] {
  const {
    searchQuery = '',
    category = 'all',
    format = 'ALL',
    sortBy = 'order',
    includeUnpublished = false,
  } = options;

  const q = searchQuery.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (!includeUnpublished && !item.published) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (format !== 'ALL' && item.format !== format) return false;
    if (q) {
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchFormat = item.format.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchFormat && !matchId) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (sortBy === 'order') {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
    if (sortBy === 'newest') {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'ar');
    }
    if (sortBy === 'size_desc') {
      return b.sizeBytes - a.sizeBytes;
    }
    if (sortBy === 'category') {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.displayOrder - b.displayOrder;
    }
    return 0;
  });
}

export function computeCatalogStats(items: GiftItem[]) {
  const totalCount = items.length;
  const publishedCount = items.filter((i) => i.published).length;
  const totalBytes = items.reduce((sum, item) => sum + (Number(item.sizeBytes) || 0), 0);
  const byCategory: Record<string, number> = {
    gifts: 0,
    frames: 0,
    entrances: 0,
    vip: 0,
    effects: 0,
  };
  const byFormat: Record<string, number> = {};

  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byFormat[item.format] = (byFormat[item.format] || 0) + 1;
  }

  return {
    totalCount,
    publishedCount,
    totalBytes,
    byCategory,
    byFormat,
  };
}
