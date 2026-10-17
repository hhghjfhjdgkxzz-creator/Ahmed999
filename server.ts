import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  readCatalogIndex,
  mutateCatalogSafe,
  recordAuditLogOnly,
  storeAssetBuffer,
  deleteStoredAsset,
  getStorageStatus,
  verifyAdminPassword,
  updateAdminPassword,
  isUsingDefaultPassword,
  ensureStorageDirectories,
} from './server/storageService.ts';
import {
  detectGiftFormat,
  FORMAT_CAPABILITIES,
  type GiftItem,
  type GiftCategory,
  type GiftFormat,
  type UnindexedFileRecord,
} from './src/utils/catalogLogic.ts';
import { LOTTIE_CROWN_JSON, ROYAL_DRAGON_SVG } from './src/utils/demoGifts.ts';
import { PERSISTED_GIFTS } from './src/data/persistedGifts.ts';

const PORT = 3000;
const SESSION_COOKIE_NAME = 'gift_gallery_admin_session';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex') + '_gift_gallery_secret';

const maxUploadMb = Number(process.env.MAX_UPLOAD_FILE_SIZE_MB) || 100;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadMb * 1024 * 1024,
    files: 20,
  },
});

// Simple rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function signSessionToken(): string {
  const payload = JSON.stringify({
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  });
  const base64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

function verifySessionToken(token?: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [base64Payload, signature] = token.split('.');
  if (!base64Payload || !signature) return false;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');

  try {
    const validSig = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
    if (!validSig) return false;
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return payload.role === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

function isRequestAdmin(req: Request): boolean {
  const cookies = parseCookies(req.headers.cookie);
  if (verifySessionToken(cookies[SESSION_COOKIE_NAME])) return true;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifySessionToken(authHeader.slice(7).trim());
  }
  return false;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isRequestAdmin(req)) {
    res.status(401).json({
      error: 'غير مصرح لك بإجراء هذه العملية. يرجى تسجيل الدخول كمدير النظام أولًا.',
    });
    return;
  }
  next();
}

// Server-Sent Events (SSE) clients for real-time catalog synchronization across all connected browsers
const sseClients = new Set<Response>();

function broadcastCatalogEvent(eventType: string, payload: Record<string, unknown>): void {
  const data = JSON.stringify({
    type: eventType,
    timestamp: new Date().toISOString(),
    ...payload,
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

function createAutoSvgThumbnail(name: string, format: GiftFormat, category: string): string {
  const badgeColor = FORMAT_CAPABILITIES[format]?.badgeColor || '#D4AF37';
  const safeTitle = name.replace(/[<>&"']/g, '').slice(0, 28);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${badgeColor}" stop-opacity="0.4"/>
      <stop offset="65%" stop-color="#4C1D95" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#08060E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#854D0E"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <g transform="translate(300,285)">
    <circle r="175" fill="none" stroke="url(#gold)" stroke-width="3" stroke-dasharray="18 10" opacity="0.75">
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite"/>
    </circle>
    <polygon points="0,-115 35,-35 120,-20 55,40 72,125 0,80 -72,125 -55,40 -120,-20 -35,-35" fill="${badgeColor}" fill-opacity="0.28" stroke="url(#gold)" stroke-width="4">
      <animateTransform attributeName="transform" type="scale" values="0.95;1.05;0.95" dur="2.6s" repeatCount="indefinite"/>
    </polygon>
    <text y="8" text-anchor="middle" fill="#FEF08A" font-family="sans-serif" font-weight="bold" font-size="38">${format}</text>
    <text y="45" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="18">${category.toUpperCase()}</text>
    <text y="220" text-anchor="middle" fill="#F8FAFC" font-family="sans-serif" font-weight="bold" font-size="24">${safeTitle}</text>
  </g>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function startServer() {
  await ensureStorageDirectories();
  // Ensure initial catalog is seeded on startup
  await readCatalogIndex();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Serve gifts from public/gifts and storage/gifts
  const storageRoot = path.resolve(process.cwd(), 'storage');
  const publicRoot = path.resolve(process.cwd(), 'public');

  app.use(
    '/gifts',
    express.static(path.join(publicRoot, 'gifts'), {
      maxAge: '365d',
      immutable: true,
    })
  );
  app.use(
    '/gifts',
    express.static(path.join(storageRoot, 'gifts'), {
      maxAge: '365d',
      immutable: true,
    })
  );
  app.use(
    '/storage/gifts',
    express.static(path.join(publicRoot, 'gifts'), {
      maxAge: '365d',
      immutable: true,
    })
  );
  app.use(
    '/storage/gifts',
    express.static(path.join(storageRoot, 'gifts'), {
      maxAge: '365d',
      immutable: true,
    })
  );

  // Public raw JSON catalog endpoints (no cache so clients always validate freshness)
  app.get(['/storage/catalog/gifts.json', '/gifts_catalog.json'], async (_req, res) => {
    try {
      const catalog = await readCatalogIndex();
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('ETag', `"v${catalog.version}"`);
      res.json(catalog);
    } catch {
      res.json({
        version: 1,
        updatedAt: new Date().toISOString(),
        totalCount: PERSISTED_GIFTS.length,
        items: PERSISTED_GIFTS,
      });
    }
  });

  // Serve Demo Lottie JSON
  app.get('/api/catalog/demo-lottie/:id', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(LOTTIE_CROWN_JSON);
  });

  // SSE stream for real-time catalog synchronization across all open browsers
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Public Catalog API with ETag / version freshness check
  app.get('/api/catalog', async (req, res) => {
    try {
      const catalog = await readCatalogIndex();
      const admin = isRequestAdmin(req);
      const clientVersion = Number(req.query.version || 0);

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('ETag', `"v${catalog.version}"`);

      if (clientVersion && clientVersion === catalog.version && !admin) {
        res.json({
          notModified: true,
          version: catalog.version,
          updatedAt: catalog.updatedAt,
        });
        return;
      }

      const visibleItems = admin
        ? catalog.items
        : catalog.items.filter((item) => item.published);

      res.json({
        version: catalog.version,
        updatedAt: catalog.updatedAt,
        totalCount: visibleItems.length,
        totalBytes: visibleItems.reduce((sum, i) => sum + (Number(i.sizeBytes) || 0), 0),
        items: visibleItems,
        ...(admin
          ? {
              unindexedFiles: catalog.unindexedFiles,
              auditLogs: catalog.auditLogs,
            }
          : {}),
      });
    } catch (_err) {
      const visible = PERSISTED_GIFTS.filter((item) => item.published);
      res.json({
        version: 1,
        updatedAt: new Date().toISOString(),
        totalCount: visible.length,
        totalBytes: visible.reduce((sum, i) => sum + (Number(i.sizeBytes) || 0), 0),
        items: visible,
      });
    }
  });

  // Storage & R2 quota status
  app.get('/api/storage/status', async (_req, res) => {
    try {
      const status = await getStorageStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Health endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      const catalog = await readCatalogIndex();
      const sha = crypto.createHash('sha256').update(JSON.stringify(catalog.items)).digest('hex');
      res.json({
        ok: true,
        version: catalog.version,
        giftsCount: catalog.items.length,
        sha,
      });
    } catch {
      const sha = crypto.createHash('sha256').update(JSON.stringify(PERSISTED_GIFTS)).digest('hex');
      res.json({
        ok: true,
        version: 1,
        giftsCount: PERSISTED_GIFTS.length,
        sha,
      });
    }
  });

  // Compatibility /api/gifts endpoint
  app.get('/api/gifts', async (_req, res) => {
    try {
      const catalog = await readCatalogIndex();
      const sha = crypto.createHash('sha256').update(JSON.stringify(catalog.items)).digest('hex');
      res.json({
        version: catalog.version,
        updatedAt: catalog.updatedAt,
        gifts: catalog.items,
        sha,
      });
    } catch {
      const sha = crypto.createHash('sha256').update(JSON.stringify(PERSISTED_GIFTS)).digest('hex');
      res.json({
        version: 1,
        updatedAt: new Date().toISOString(),
        gifts: PERSISTED_GIFTS,
        sha,
      });
    }
  });

  // ==========================================
  // Admin Authentication Endpoints
  // ==========================================

  app.get('/api/admin/session', async (req, res) => {
    const authenticated = isRequestAdmin(req);
    const isDefault = authenticated ? await isUsingDefaultPassword() : false;
    res.json({ authenticated, isDefaultPassword: isDefault });
  });

  app.post('/api/admin/login', async (req, res) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && record.resetAt > now && record.count >= 10) {
      res.status(429).json({
        error: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. يرجى الانتظار دقيقة والمحاولة مجددًا.',
      });
      return;
    }

    const { password } = req.body as { password?: string };
    if (!password) {
      res.status(400).json({ error: 'يرجى إدخال كلمة المرور.' });
      return;
    }

    const check = await verifyAdminPassword(password);
    if (!check.valid) {
      loginAttempts.set(ip, {
        count: (record && record.resetAt > now ? record.count : 0) + 1,
        resetAt: now + 60_000,
      });
      await recordAuditLogOnly({
        action: 'login',
        fileName: 'Admin Session',
        status: 'error',
        message: 'محاولة تسجيل دخول فاشلة بكلمة مرور غير صحيحة.',
      });
      res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
      return;
    }

    loginAttempts.delete(ip);
    const token = signSessionToken();
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
    );

    await recordAuditLogOnly({
      action: 'login',
      fileName: 'Admin Session',
      status: 'success',
      message: 'تم تسجيل دخول المدير إلى لوحة التحكم بنجاح.',
    });

    res.json({
      authenticated: true,
      token,
      isDefaultPassword: check.isDefaultPassword,
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
    res.json({ authenticated: false });
  });

  app.post('/api/admin/password', requireAdminAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'يرجى إدخال كلمة المرور الحالية والجديدة.' });
        return;
      }
      await updateAdminPassword(currentPassword, newPassword);
      await recordAuditLogOnly({
        action: 'password_change',
        fileName: 'Admin Security',
        status: 'success',
        message: 'تم تغيير كلمة مرور لوحة التحكم بنجاح.',
      });
      res.json({ success: true, isDefaultPassword: newPassword.trim() === '150150' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // Protected Admin Gift Upload & CRUD Endpoints
  // ==========================================

  app.post(
    '/api/admin/gifts/upload',
    requireAdminAuth,
    (req, res, next) => {
      upload.fields([
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ])(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const mainFile = files?.file?.[0];
      const thumbFile = files?.thumbnail?.[0];

      if (!mainFile) {
        res.status(400).json({ error: 'لم يتم إرفاق الملف الأصلي للهدية.' });
        return;
      }

      const detectedFormat = detectGiftFormat(mainFile.originalname, req.body.format);
      if (!detectedFormat) {
        await recordAuditLogOnly({
          action: 'upload',
          fileName: mainFile.originalname,
          status: 'error',
          message: `صيغة الملف غير مدعومة (${mainFile.originalname}).`,
        });
        res.status(400).json({
          error: `صيغة الملف "${mainFile.originalname}" غير مدعومة. الصيغ المدعومة: SVGA, VAP, MP4, WebM, GIF, WebP, APNG, SVG, Lottie JSON, PNG, JPG, ZIP.`,
        });
        return;
      }

      // Validate Lottie JSON syntax if format is Lottie
      if (detectedFormat === 'Lottie') {
        try {
          JSON.parse(mainFile.buffer.toString('utf8'));
        } catch {
          res.status(400).json({
            error: 'ملف Lottie JSON غير صالح (Invalid JSON syntax).',
          });
          return;
        }
      }

      try {
        // Step 1: Store original file in R2 / persistent storage without modifying format
        const storedOriginal = await storeAssetBuffer({
          folder: 'originals',
          originalFilename: mainFile.originalname,
          buffer: mainFile.buffer,
          contentType: mainFile.mimetype,
        });

        // Step 2: Store custom thumbnail if provided, or generate appropriate preview URL
        let thumbnailUrl = '';
        let thumbnailKey: string | undefined;

        if (thumbFile) {
          const storedThumb = await storeAssetBuffer({
            folder: 'thumbnails',
            originalFilename: thumbFile.originalname,
            buffer: thumbFile.buffer,
            contentType: thumbFile.mimetype,
          });
          thumbnailUrl = storedThumb.publicUrl;
          thumbnailKey = storedThumb.storageKey;
        } else if (['GIF', 'WebP', 'APNG', 'SVG', 'PNG', 'JPG'].includes(detectedFormat)) {
          // Image formats can directly serve as their own crisp thumbnail
          thumbnailUrl = storedOriginal.publicUrl;
        } else {
          const rawName =
            (req.body.name || '').trim() ||
            mainFile.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
          const cat = (req.body.category || 'gifts') as string;
          thumbnailUrl = createAutoSvgThumbnail(rawName, detectedFormat, cat);
        }

        const cap = FORMAT_CAPABILITIES[detectedFormat];
        const categoryValue = (
          ['gifts', 'frames', 'entrances', 'vip', 'effects'].includes(req.body.category)
            ? req.body.category
            : 'gifts'
        ) as Exclude<GiftCategory, 'all'>;

        const cleanName =
          (req.body.name || '').trim() ||
          mainFile.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

        const now = new Date().toISOString();
        const giftId = `gift_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

        const newGift: GiftItem = {
          id: giftId,
          name: cleanName,
          category: categoryValue,
          description:
            (req.body.description || '').trim() ||
            cap.descriptionAr,
          originalUrl: storedOriginal.publicUrl,
          thumbnailUrl,
          format: detectedFormat,
          sizeBytes: storedOriginal.sizeBytes,
          quality: (req.body.quality as GiftItem['quality']) || 'Original',
          hasAudio:
            req.body.hasAudio !== undefined
              ? req.body.hasAudio === 'true' || req.body.hasAudio === true
              : cap.supportsAudio,
          hasAlpha:
            req.body.hasAlpha !== undefined
              ? req.body.hasAlpha === 'true' || req.body.hasAlpha === true
              : cap.supportsAlpha,
          isAnimated: cap.supportsAnimation,
          displayOrder: Number(req.body.displayOrder) || 10,
          published:
            req.body.published !== undefined
              ? req.body.published === 'true' || req.body.published === true
              : true,
          allowDownload:
            req.body.allowDownload !== undefined
              ? req.body.allowDownload === 'true' || req.body.allowDownload === true
              : true,
          uploadedAt: now,
          updatedAt: now,
          storageKey: storedOriginal.storageKey,
          thumbnailKey,
          checksum: storedOriginal.checksum,
        };

        // Support simulated index failure test if requested via header/flag, recording unindexed file safely
        if (req.body.simulateIndexFailure === 'true') {
          const unindexedRecord: UnindexedFileRecord = {
            id: `unindexed_${Date.now()}`,
            fileName: mainFile.originalname,
            storageKey: storedOriginal.storageKey,
            originalUrl: storedOriginal.publicUrl,
            sizeBytes: storedOriginal.sizeBytes,
            format: detectedFormat,
            failedAt: now,
            reason: 'تعذر تحديث الفهرس المركزي أثناء الحفظ — الملف محفوظ بأمان وجاهز لإعادة الفهرسة.',
            metadataDraft: newGift,
          };
          await mutateCatalogSafe((catalog) => {
            catalog.unindexedFiles.unshift(unindexedRecord);
            return {
              result: unindexedRecord,
              log: {
                action: 'upload',
                fileName: mainFile.originalname,
                status: 'error',
                message: 'تم رفع الملف إلى التخزين ولكن تعذر نشره في الفهرس — أُضيف لقائمة إعادة المحاولة.',
              },
            };
          });
          res.status(500).json({
            error: 'تم حفظ الملف في التخزين ولكن فشل تحديث الفهرس. يمكنك استعادته فورًا من قسم الملفات غير المفهرسة.',
          });
          return;
        }

        // Step 3: Atomically update catalog/gifts.json
        const { catalog } = await mutateCatalogSafe((cat) => {
          cat.items.unshift(newGift);
          return {
            result: newGift,
            log: {
              action: 'upload',
              fileName: mainFile.originalname,
              giftId: newGift.id,
              status: 'success',
              message: `تم رفع وحفظ الهدية "${newGift.name}" (${newGift.format}) وتحديث الفهرس المركزي بنجاح.`,
            },
          };
        });

        // Step 4: Broadcast real-time update to all connected clients
        broadcastCatalogEvent('catalog:updated', {
          version: catalog.version,
          action: 'upload',
          giftId: newGift.id,
        });

        res.status(201).json({
          gift: newGift,
          catalogVersion: catalog.version,
        });
      } catch (err) {
        await recordAuditLogOnly({
          action: 'upload',
          fileName: mainFile.originalname,
          status: 'error',
          message: `فشل رفع الملف: ${(err as Error).message}`,
        });
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  // Retry indexing an unindexed uploaded file without re-uploading
  app.post('/api/admin/gifts/retry-index/:unindexedId', requireAdminAuth, async (req, res) => {
    try {
      const { unindexedId } = req.params;
      const { catalog, result } = await mutateCatalogSafe((cat) => {
        const idx = cat.unindexedFiles.findIndex((u) => u.id === unindexedId);
        if (idx === -1) {
          throw new Error('لم يتم العثور على الملف في قائمة الملفات غير المفهرسة.');
        }
        const record = cat.unindexedFiles[idx];
        cat.unindexedFiles.splice(idx, 1);

        const now = new Date().toISOString();
        const recoveredGift: GiftItem = {
          id: record.metadataDraft.id || `gift_${Date.now()}`,
          name: record.metadataDraft.name || record.fileName,
          category: (record.metadataDraft.category as Exclude<GiftCategory, 'all'>) || 'gifts',
          description: record.metadataDraft.description || 'تمت استعادة الفهرسة من التخزين الدائم',
          originalUrl: record.originalUrl,
          thumbnailUrl:
            record.metadataDraft.thumbnailUrl ||
            createAutoSvgThumbnail(record.fileName, record.format, 'gifts'),
          format: record.format,
          sizeBytes: record.sizeBytes,
          quality: 'Original',
          hasAudio: FORMAT_CAPABILITIES[record.format].supportsAudio,
          hasAlpha: FORMAT_CAPABILITIES[record.format].supportsAlpha,
          isAnimated: FORMAT_CAPABILITIES[record.format].supportsAnimation,
          displayOrder: 10,
          published: true,
          allowDownload: true,
          uploadedAt: now,
          updatedAt: now,
          storageKey: record.storageKey,
        };

        cat.items.unshift(recoveredGift);
        return {
          result: recoveredGift,
          log: {
            action: 'retry_index',
            fileName: record.fileName,
            giftId: recoveredGift.id,
            status: 'success',
            message: `تمت استعادة وفهرسة الملف "${recoveredGift.name}" بنجاح.`,
          },
        };
      });

      broadcastCatalogEvent('catalog:updated', {
        version: catalog.version,
        action: 'retry_index',
        giftId: result.id,
      });

      res.json({ gift: result, catalogVersion: catalog.version });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Update gift metadata or replace original/thumbnail file
  app.put(
    '/api/admin/gifts/:id',
    requireAdminAuth,
    (req, res, next) => {
      upload.fields([
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ])(req, res, (err) => {
        if (err) {
          res.status(400).json({ error: `خطأ في معالجة الملف المرفق: ${err.message}` });
          return;
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        const giftId = req.params.id;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const replacementFile = files?.file?.[0];
        const replacementThumb = files?.thumbnail?.[0];

        let newStoredOriginal: Awaited<ReturnType<typeof storeAssetBuffer>> | null = null;
        let newFormat: GiftFormat | null = null;

        if (replacementFile) {
          newFormat = detectGiftFormat(replacementFile.originalname, req.body.format);
          if (!newFormat) {
            res.status(400).json({ error: 'صيغة الملف البديل غير مدعومة.' });
            return;
          }
          newStoredOriginal = await storeAssetBuffer({
            folder: 'originals',
            originalFilename: replacementFile.originalname,
            buffer: replacementFile.buffer,
            contentType: replacementFile.mimetype,
          });
        }

        let newStoredThumb: Awaited<ReturnType<typeof storeAssetBuffer>> | null = null;
        if (replacementThumb) {
          newStoredThumb = await storeAssetBuffer({
            folder: 'thumbnails',
            originalFilename: replacementThumb.originalname,
            buffer: replacementThumb.buffer,
            contentType: replacementThumb.mimetype,
          });
        }

        let oldStorageKeyToDelete: string | undefined;
        let oldThumbKeyToDelete: string | undefined;

        const { catalog, result } = await mutateCatalogSafe((cat) => {
          const item = cat.items.find((i) => i.id === giftId);
          if (!item) {
            throw new Error('لم يتم العثور على الهدية المطلوبة في الفهرس.');
          }

          if (req.body.name !== undefined && String(req.body.name).trim()) {
            item.name = String(req.body.name).trim();
          }
          if (
            req.body.category !== undefined &&
            ['gifts', 'frames', 'entrances', 'vip', 'effects'].includes(req.body.category)
          ) {
            item.category = req.body.category as Exclude<GiftCategory, 'all'>;
          }
          if (req.body.description !== undefined) {
            item.description = String(req.body.description).trim();
          }
          if (req.body.displayOrder !== undefined) {
            item.displayOrder = Number(req.body.displayOrder) || 1;
          }
          if (req.body.quality !== undefined) {
            item.quality = req.body.quality as GiftItem['quality'];
          }
          if (req.body.published !== undefined) {
            item.published = req.body.published === 'true' || req.body.published === true;
          }
          if (req.body.allowDownload !== undefined) {
            item.allowDownload =
              req.body.allowDownload === 'true' || req.body.allowDownload === true;
          }
          if (req.body.hasAudio !== undefined) {
            item.hasAudio = req.body.hasAudio === 'true' || req.body.hasAudio === true;
          }
          if (req.body.hasAlpha !== undefined) {
            item.hasAlpha = req.body.hasAlpha === 'true' || req.body.hasAlpha === true;
          }

          if (newStoredOriginal && newFormat) {
            oldStorageKeyToDelete = item.storageKey;
            item.originalUrl = newStoredOriginal.publicUrl;
            item.storageKey = newStoredOriginal.storageKey;
            item.sizeBytes = newStoredOriginal.sizeBytes;
            item.format = newFormat;
            item.checksum = newStoredOriginal.checksum;
            if (['GIF', 'WebP', 'APNG', 'SVG', 'PNG', 'JPG'].includes(newFormat) && !newStoredThumb) {
              item.thumbnailUrl = newStoredOriginal.publicUrl;
            }
          }

          if (newStoredThumb) {
            oldThumbKeyToDelete = item.thumbnailKey;
            item.thumbnailUrl = newStoredThumb.publicUrl;
            item.thumbnailKey = newStoredThumb.storageKey;
          }

          item.updatedAt = new Date().toISOString();

          return {
            result: item,
            log: {
              action: replacementFile ? 'replace' : 'update',
              fileName: replacementFile ? replacementFile.originalname : item.name,
              giftId: item.id,
              status: 'success',
              message: replacementFile
                ? `تم استبدال الملف الأصلي وتحديث بيانات الهدية "${item.name}".`
                : `تم تحديث بيانات وإعدادات الهدية "${item.name}".`,
            },
          };
        });

        if (oldStorageKeyToDelete) {
          void deleteStoredAsset(oldStorageKeyToDelete);
        }
        if (oldThumbKeyToDelete) {
          void deleteStoredAsset(oldThumbKeyToDelete);
        }

        broadcastCatalogEvent('catalog:updated', {
          version: catalog.version,
          action: 'update',
          giftId: result.id,
        });

        res.json({ gift: result, catalogVersion: catalog.version });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  // Delete gift from catalog and permanent storage
  app.delete('/api/admin/gifts/:id', requireAdminAuth, async (req, res) => {
    try {
      const giftId = req.params.id;
      let removedGift: GiftItem | undefined;

      const { catalog } = await mutateCatalogSafe((cat) => {
        const idx = cat.items.findIndex((i) => i.id === giftId);
        if (idx === -1) {
          throw new Error('الهدية غير موجودة أو تم حذفها مسبقًا.');
        }
        removedGift = cat.items[idx];
        cat.items.splice(idx, 1);

        return {
          result: removedGift,
          log: {
            action: 'delete',
            fileName: removedGift.name,
            giftId: removedGift.id,
            status: 'success',
            message: `تم حذف الهدية "${removedGift.name}" وإزالتها من الفهرس المركزي.`,
          },
        };
      });

      if (removedGift?.storageKey) {
        void deleteStoredAsset(removedGift.storageKey);
      }
      if (removedGift?.thumbnailKey) {
        void deleteStoredAsset(removedGift.thumbnailKey);
      }

      broadcastCatalogEvent('catalog:updated', {
        version: catalog.version,
        action: 'delete',
        giftId,
      });

      res.json({ success: true, catalogVersion: catalog.version });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for dev or static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gift Gallery Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Gift Gallery server:', err);
  process.exit(1);
});
