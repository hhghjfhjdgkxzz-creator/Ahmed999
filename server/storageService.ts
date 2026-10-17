import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  type CatalogIndex,
  type GiftItem,
  type AdminAuditLog,
  type UnindexedFileRecord,
  type StorageStatusInfo,
  sanitizeStorageFileName,
  normalizePasswordString,
} from '../src/utils/catalogLogic.ts';
import { INITIAL_DEMO_GIFTS } from '../src/utils/demoGifts.ts';

const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const ORIGINALS_DIR = path.join(STORAGE_ROOT, 'gifts', 'originals');
const THUMBNAILS_DIR = path.join(STORAGE_ROOT, 'gifts', 'thumbnails');
const PREVIEWS_DIR = path.join(STORAGE_ROOT, 'gifts', 'previews');
const CATALOG_DIR = path.join(STORAGE_ROOT, 'catalog');
const CATALOG_FILE_PATH = path.join(CATALOG_DIR, 'gifts.json');
const ADMIN_AUTH_FILE_PATH = path.join(CATALOG_DIR, 'admin-auth.json');

export class AsyncMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.queue;
    this.queue = this.queue.then(() => next);
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }
}

export const catalogMutex = new AsyncMutex();

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
}

export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');

  if (accountId && accessKeyId && secretAccessKey && bucketName) {
    return { accountId, accessKeyId, secretAccessKey, bucketName, publicBaseUrl };
  }
  return null;
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(config: R2Config): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

export async function ensureStorageDirectories(): Promise<void> {
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  await fs.mkdir(PREVIEWS_DIR, { recursive: true });
  await fs.mkdir(CATALOG_DIR, { recursive: true });
}

async function syncCatalogToGitHubIfConfigured(catalog: CatalogIndex): Promise<void> {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const owner = (process.env.GITHUB_REPO_OWNER || '').trim();
  const repo = (process.env.GITHUB_REPO_NAME || '').trim();
  const filePath = (process.env.GITHUB_CATALOG_PATH || 'catalog/gifts.json').trim();

  if (!token || !owner || !repo) return;

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Gift-Gallery-Server',
    };

    let sha: string | undefined;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const existing = (await getRes.json()) as { sha?: string };
      sha = existing.sha;
    }

    const contentBase64 = Buffer.from(JSON.stringify(catalog, null, 2), 'utf8').toString('base64');
    await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update catalog/gifts.json (v${catalog.version})`,
        content: contentBase64,
        ...(sha ? { sha } : {}),
      }),
    });
  } catch {
    // Non-fatal optional backup sync
  }
}

export async function readCatalogIndex(): Promise<CatalogIndex> {
  await ensureStorageDirectories();
  const r2 = getR2Config();

  if (r2) {
    try {
      const client = getS3Client(r2);
      const res = await client.send(
        new GetObjectCommand({
          Bucket: r2.bucketName,
          Key: 'catalog/gifts.json',
        })
      );
      if (res.Body) {
        const bodyStr = await res.Body.transformToString('utf-8');
        const parsed = JSON.parse(bodyStr) as CatalogIndex;
        // Mirror locally for fast caching
        await fs.writeFile(CATALOG_FILE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
        return parsed;
      }
    } catch {
      // Fallback to local mirror or initialize if not yet created in R2
    }
  }

  try {
    const raw = await fs.readFile(CATALOG_FILE_PATH, 'utf8');
    return JSON.parse(raw) as CatalogIndex;
  } catch {
    const now = new Date().toISOString();
    const initialItems = INITIAL_DEMO_GIFTS;
    const totalBytes = initialItems.reduce((sum, item) => sum + item.sizeBytes, 0);
    const initialCatalog: CatalogIndex = {
      version: 1,
      updatedAt: now,
      totalCount: initialItems.length,
      totalBytes,
      items: initialItems,
      unindexedFiles: [],
      auditLogs: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          action: 'seed',
          fileName: 'catalog/gifts.json',
          status: 'success',
          message: 'تم تهيئة الفهرس المركزي (gifts.json) بالهدايا الافتراضية الجاهزة للمعاينة.',
        },
      ],
    };
    await writeCatalogIndexInternal(initialCatalog);
    return initialCatalog;
  }
}

async function writeCatalogIndexInternal(catalog: CatalogIndex): Promise<void> {
  await ensureStorageDirectories();
  catalog.totalCount = catalog.items.length;
  catalog.totalBytes = catalog.items.reduce((acc, item) => acc + (Number(item.sizeBytes) || 0), 0);
  catalog.updatedAt = new Date().toISOString();

  // Keep audit logs bounded to latest 150 entries
  if (catalog.auditLogs.length > 150) {
    catalog.auditLogs = catalog.auditLogs.slice(0, 150);
  }

  const serialized = JSON.stringify(catalog, null, 2);
  const tempPath = `${CATALOG_FILE_PATH}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, serialized, 'utf8');
  await fs.rename(tempPath, CATALOG_FILE_PATH);

  const r2 = getR2Config();
  if (r2) {
    const client = getS3Client(r2);
    await client.send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: 'catalog/gifts.json',
        Body: serialized,
        ContentType: 'application/json; charset=utf-8',
        CacheControl: 'no-cache, no-store, must-revalidate',
      })
    );
  }

  void syncCatalogToGitHubIfConfigured(catalog);
}

/**
 * Safely mutate catalog/gifts.json inside an exclusive mutex lock so concurrent
 * uploads or edits never overwrite one another.
 */
export async function mutateCatalogSafe<T>(
  mutator: (catalog: CatalogIndex) => Promise<{ result: T; log?: Omit<AdminAuditLog, 'id' | 'timestamp'> }> | { result: T; log?: Omit<AdminAuditLog, 'id' | 'timestamp'> }
): Promise<{ catalog: CatalogIndex; result: T }> {
  return catalogMutex.runExclusive(async () => {
    const catalog = await readCatalogIndex();
    const { result, log } = await mutator(catalog);
    catalog.version = (catalog.version || 1) + 1;
    if (log) {
      catalog.auditLogs.unshift({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...log,
      });
    }
    await writeCatalogIndexInternal(catalog);
    return { catalog, result };
  });
}

export async function recordAuditLogOnly(
  log: Omit<AdminAuditLog, 'id' | 'timestamp'>
): Promise<CatalogIndex> {
  const { catalog } = await mutateCatalogSafe((cat) => ({
    result: null,
    log,
  }));
  return catalog;
}

export interface StoredFileResult {
  storageKey: string;
  publicUrl: string;
  sizeBytes: number;
  checksum: string;
}

export async function storeAssetBuffer(params: {
  folder: 'originals' | 'thumbnails' | 'previews';
  originalFilename: string;
  buffer: Buffer;
  contentType: string;
}): Promise<StoredFileResult> {
  await ensureStorageDirectories();
  const safeName = sanitizeStorageFileName(params.originalFilename);
  const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const fileName = `${uniquePrefix}_${safeName}`;
  const storageKey = `gifts/${params.folder}/${fileName}`;
  const checksum = crypto.createHash('sha256').update(params.buffer).digest('hex').slice(0, 16);

  // Always write to local persistent mirror first
  const localTargetDir =
    params.folder === 'originals'
      ? ORIGINALS_DIR
      : params.folder === 'thumbnails'
      ? THUMBNAILS_DIR
      : PREVIEWS_DIR;

  const localFilePath = path.join(localTargetDir, fileName);
  await fs.writeFile(localFilePath, params.buffer);

  const r2 = getR2Config();
  if (r2) {
    const client = getS3Client(r2);
    await client.send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: storageKey,
        Body: params.buffer,
        ContentType: params.contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const publicUrl = r2.publicBaseUrl
      ? `${r2.publicBaseUrl}/${storageKey}`
      : `/storage/${storageKey}`;

    return {
      storageKey,
      publicUrl,
      sizeBytes: params.buffer.byteLength,
      checksum,
    };
  }

  return {
    storageKey,
    publicUrl: `/storage/${storageKey}`,
    sizeBytes: params.buffer.byteLength,
    checksum,
  };
}

export async function deleteStoredAsset(storageKey?: string): Promise<void> {
  if (!storageKey || !storageKey.startsWith('gifts/')) return;
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const localPath = path.join(STORAGE_ROOT, normalized);
  try {
    await fs.unlink(localPath);
  } catch {
    // Ignore if already removed locally
  }

  const r2 = getR2Config();
  if (r2) {
    try {
      const client = getS3Client(r2);
      await client.send(
        new DeleteObjectCommand({
          Bucket: r2.bucketName,
          Key: normalized,
        })
      );
    } catch {
      // Non-fatal
    }
  }
}

export async function getStorageStatus(): Promise<StorageStatusInfo> {
  const catalog = await readCatalogIndex();
  const r2 = getR2Config();
  const githubConfigured = Boolean(
    process.env.GITHUB_TOKEN && process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME
  );
  const maxUploadMb = Number(process.env.MAX_UPLOAD_FILE_SIZE_MB) || 100;

  return {
    mode: r2 ? 'cloudflare_r2' : 'persistent_local_mirror',
    r2Configured: Boolean(r2),
    githubBackupConfigured: githubConfigured,
    bucketName: r2?.bucketName || 'gift-gallery-r2-bucket (Local R2 Mirror Active)',
    publicBaseUrl: r2?.publicBaseUrl || '/storage',
    freeTierLimits: {
      storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB Cloudflare R2 monthly free tier
      classAOpsMonthly: 1_000_000,
      classBOpsMonthly: 10_000_000,
    },
    currentUsage: {
      totalGifts: catalog.items.length,
      publishedGifts: catalog.items.filter((i) => i.published).length,
      totalBytes: catalog.totalBytes,
      unindexedCount: catalog.unindexedFiles.length,
    },
    maxUploadFileSizeMb: maxUploadMb,
  };
}

// ==========================================
// Admin Password & Session Security
// ==========================================

interface AdminAuthData {
  passwordHash: string;
  salt: string;
  updatedAt: string;
  isDefaultPassword: boolean;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function getAdminAuthData(): Promise<AdminAuthData> {
  await ensureStorageDirectories();
  try {
    const raw = await fs.readFile(ADMIN_AUTH_FILE_PATH, 'utf8');
    return JSON.parse(raw) as AdminAuthData;
  } catch {
    const initialPassword = (process.env.ADMIN_INITIAL_PASSWORD || '150150').trim();
    const salt = crypto.randomBytes(16).toString('hex');
    const data: AdminAuthData = {
      passwordHash: hashPassword(initialPassword, salt),
      salt,
      updatedAt: new Date().toISOString(),
      isDefaultPassword: initialPassword === '150150',
    };
    await fs.writeFile(ADMIN_AUTH_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
}

export async function verifyAdminPassword(candidate: string): Promise<{ valid: boolean; isDefaultPassword: boolean }> {
  const auth = await getAdminAuthData();
  const rawCandidate = (candidate || '').trim();
  const normalizedCandidate = normalizePasswordString(rawCandidate);
  const noSpacesCandidate = normalizedCandidate.replace(/\s+/g, '');
  const rawNoSpaces = rawCandidate.replace(/\s+/g, '');

  const candidatesToTry = Array.from(
    new Set([rawCandidate, normalizedCandidate, noSpacesCandidate, rawNoSpaces])
  ).filter(Boolean);

  for (const c of candidatesToTry) {
    try {
      const candidateHash = hashPassword(c, auth.salt);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(candidateHash, 'hex'),
        Buffer.from(auth.passwordHash, 'hex')
      );
      if (isValid) {
        return { valid: true, isDefaultPassword: auth.isDefaultPassword };
      }
    } catch {
      // Continue trying next candidate
    }
  }

  // Fallback check for initial default password '150150' if auth is marked default password
  if (auth.isDefaultPassword) {
    if (noSpacesCandidate === '150150' || rawNoSpaces === '150150') {
      return { valid: true, isDefaultPassword: true };
    }
  }

  return { valid: false, isDefaultPassword: auth.isDefaultPassword };
}

export async function updateAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const check = await verifyAdminPassword(currentPassword);
  if (!check.valid) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }
  if (!newPassword || newPassword.trim().length < 6) {
    throw new Error('كلمة المرور الجديدة يجب أن تتكون من 6 خانات على الأقل.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const nextData: AdminAuthData = {
    passwordHash: hashPassword(newPassword.trim(), salt),
    salt,
    updatedAt: new Date().toISOString(),
    isDefaultPassword: newPassword.trim() === '150150',
  };
  await fs.writeFile(ADMIN_AUTH_FILE_PATH, JSON.stringify(nextData, null, 2), 'utf8');
}

export async function isUsingDefaultPassword(): Promise<boolean> {
  const auth = await getAdminAuthData();
  return auth.isDefaultPassword;
}
