import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../../server/firebase';
import { doc, setDoc } from 'firebase/firestore';

const router = express.Router();

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'app_settings.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readLocalSettings(): Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[SettingsRouter] Error reading local settings:', err);
  }
  return {
    appName: 'SVGA AHMED STUDIO',
    logoUrl: '',
    backgroundUrl: 'https://h.top4top.io/m_3944yve2o1.mp4',
    whatsappNumber: '',
    isRegistrationOpen: true,
    defaultFreeAttempts: 5,
    isSvgaExEnabled: false,
    isMaintenanceMode: false
  };
}

function writeLocalSettings(data: Record<string, any>) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SettingsRouter] Error writing settings:', err);
  }
}

// Multer storage for background files
const bgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    cb(null, `bg_${Date.now()}_${cleanBase}${ext}`);
  }
});

const uploadBg = multer({
  storage: bgStorage,
  limits: {
    fileSize: 150 * 1024 * 1024 // 150MB for 4K video or large assets
  }
});

/**
 * GET /api/settings/global
 * Returns current global settings with high speed and zero auth restriction
 */
router.get('/global', (_req, res) => {
  const settings = readLocalSettings();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.json(settings);
});

/**
 * POST /api/settings/update
 * Updates global settings (e.g. backgroundUrl, logoUrl, appName)
 */
router.post('/update', async (req, res) => {
  try {
    const current = readLocalSettings();
    const updated = {
      ...current,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    writeLocalSettings(updated);

    // Sync to Firestore in background without blocking
    try {
      await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
    } catch (fsErr) {
      console.warn('[SettingsRouter] Firestore background sync notice:', fsErr);
    }

    return res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      settings: updated
    });
  } catch (err: any) {
    console.error('[SettingsRouter] Update error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update settings' });
  }
});

/**
 * POST /api/settings/upload-background
 * Directly uploads a background file to server and sets it as active background
 */
router.post('/upload-background', uploadBg.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'NO_FILE_PROVIDED', message: 'لم يتم استلام أي ملف' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    const current = readLocalSettings();
    const updated = {
      ...current,
      backgroundUrl: relativeUrl,
      updatedAt: new Date().toISOString()
    };

    writeLocalSettings(updated);

    try {
      await setDoc(doc(db, 'settings', 'global'), { backgroundUrl: relativeUrl }, { merge: true });
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      message: 'تم رفع وتطبيق الخلفية بنجاح',
      backgroundUrl: relativeUrl,
      fileName: req.file.filename,
      size: req.file.size
    });
  } catch (err: any) {
    console.error('[SettingsRouter] Background upload error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to upload background' });
  }
});

/**
 * POST /api/settings/delete-background
 * Clears the active site background
 */
router.post('/delete-background', async (_req, res) => {
  try {
    const current = readLocalSettings();
    const updated = {
      ...current,
      backgroundUrl: '',
      updatedAt: new Date().toISOString()
    };

    writeLocalSettings(updated);

    try {
      await setDoc(doc(db, 'settings', 'global'), { backgroundUrl: '' }, { merge: true });
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      message: 'تم حذف الخلفية بنجاح',
      backgroundUrl: ''
    });
  } catch (err: any) {
    console.error('[SettingsRouter] Background delete error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete background' });
  }
});

/**
 * POST /api/settings/upload-logo
 * Directly uploads a logo file to server and sets it as active logo
 */
router.post('/upload-logo', uploadBg.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'NO_FILE_PROVIDED', message: 'لم يتم استلام أي ملف' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    const current = readLocalSettings();
    const updated = {
      ...current,
      logoUrl: relativeUrl,
      updatedAt: new Date().toISOString()
    };

    writeLocalSettings(updated);

    try {
      await setDoc(doc(db, 'settings', 'global'), { logoUrl: relativeUrl }, { merge: true });
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      message: 'تم رفع وتطبيق الشعار بنجاح',
      logoUrl: relativeUrl,
      fileName: req.file.filename
    });
  } catch (err: any) {
    console.error('[SettingsRouter] Logo upload error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to upload logo' });
  }
});

/**
 * POST /api/settings/delete-logo
 * Clears the active site logo
 */
router.post('/delete-logo', async (_req, res) => {
  try {
    const current = readLocalSettings();
    const updated = {
      ...current,
      logoUrl: '',
      updatedAt: new Date().toISOString()
    };

    writeLocalSettings(updated);

    try {
      await setDoc(doc(db, 'settings', 'global'), { logoUrl: '' }, { merge: true });
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      message: 'تم حذف الشعار بنجاح',
      logoUrl: ''
    });
  } catch (err: any) {
    console.error('[SettingsRouter] Logo delete error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete logo' });
  }
});

export default router;
