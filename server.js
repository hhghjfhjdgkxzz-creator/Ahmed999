import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "gifts.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const ASSETS_DIR = path.join(__dirname, "public", "assets");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const DEFAULT_SETTINGS = {
  heroTitle: "كل هدية تروي حكاية من الفخامة",
  heroSubtitle: "مجموعة منتقاة من الهدايا الرقمية المتحركة والإطارات الملكية ومؤثرات الدخول المصممة بعناية لتجربة عرض استثنائية.",
  categories: ["هدايا", "إطارات", "دخوليات", "ملكي"]
};

const SEED_GIFTS = [
  {
    id: "demo-crown",
    title: "التاج الإمبراطوري الذهبي",
    category: "ملكي",
    type: "image",
    description: "تاج ملكي مرصع بالياقوت الأحمر والألماس مع هالة ضوئية ذهبية متحركة.",
    assetUrl: "/assets/royal-crown.svg",
    featured: true,
    published: true,
    order: 1,
    price: 49.99,
    emoji: "👑",
    createdAt: "2026-10-17T08:00:00.000Z"
  },
  {
    id: "demo-rose",
    title: "وردة الذهب والياقوت",
    category: "هدايا",
    type: "image",
    description: "وردة مخملية حمراء بساق من الذهب الخالص داخل قبة بلورية فاخرة.",
    assetUrl: "/assets/golden-rose.svg",
    featured: true,
    published: true,
    order: 2,
    price: 19.99,
    emoji: "🌹",
    createdAt: "2026-10-17T08:01:00.000Z"
  },
  {
    id: "demo-diamond",
    title: "ماسة القصر الملكي",
    category: "هدايا",
    type: "image",
    description: "ماسة مقطوعة بدقة هندسية تنشر انعكاسات ضوئية زرقاء وذهبية ساحرة.",
    assetUrl: "/assets/diamond-chest.svg",
    featured: true,
    published: true,
    order: 3,
    price: 29.99,
    emoji: "💎",
    createdAt: "2026-10-17T08:02:00.000Z"
  },
  {
    id: "demo-car",
    title: "سيارة النخبة الذهبية",
    category: "ملكي",
    type: "image",
    description: "سيارة رياضية فارهة مطلية بالذهب مع إضاءة أمامية ديناميكية.",
    assetUrl: "/assets/luxury-car.svg",
    featured: false,
    published: true,
    order: 4,
    price: 89.99,
    emoji: "🏎️",
    createdAt: "2026-10-17T08:03:00.000Z"
  },
  {
    id: "demo-frame-gold",
    title: "الإطار الفيكتوري الإمبراطوري",
    category: "إطارات",
    type: "image",
    description: "إطار دائري مزخرف بنقوش الذهب الملكي وتاج علوي يمنح الحساب حضوراً متفرداً.",
    assetUrl: "/assets/imperial-frame.svg",
    featured: true,
    published: true,
    order: 5,
    price: 14.99,
    emoji: "▣",
    createdAt: "2026-10-17T08:06:00.000Z"
  },
  {
    id: "demo-frame-stars",
    title: "إطار المدار النجمي",
    category: "إطارات",
    type: "image",
    description: "إطار متوهج محاط بمدار من النجوم الذهبية والفضية الدوارة.",
    assetUrl: "/assets/starlight-frame.svg",
    featured: true,
    published: true,
    order: 6,
    price: 9.99,
    emoji: "✨",
    createdAt: "2026-10-17T08:07:00.000Z"
  },
  {
    id: "demo-entry-royal",
    title: "دخولية البساط الملكي",
    category: "دخوليات",
    type: "image",
    description: "قوس نصر ذهبي مع بساط أحمر ملكي ونجمة متوهجة للإعلان عن حضور كبار الشخصيات.",
    assetUrl: "/assets/royal-procession.svg",
    featured: true,
    published: true,
    order: 7,
    price: 59.99,
    emoji: "✦",
    createdAt: "2026-10-17T08:10:00.000Z"
  },
  {
    id: "demo-entry-phoenix",
    title: "دخولية تحليق الفينيق الذهبي",
    category: "دخوليات",
    type: "image",
    description: "طائر الفينيق الأسطوري يفرد جناحيه من الذهب واللهب في مشهد مهيب.",
    assetUrl: "/assets/phoenix-entry.svg",
    featured: true,
    published: true,
    order: 8,
    price: 79.99,
    emoji: "🦅",
    createdAt: "2026-10-17T08:11:00.000Z"
  }
];

function computeSha(obj) {
  const canonical = JSON.stringify({
    version: obj.version,
    updatedAt: obj.updatedAt,
    gifts: obj.gifts
  });
  return crypto.createHash("sha1").update(canonical).digest("hex");
}

function getLocalCatalog() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (parsed && Array.isArray(parsed.gifts) && parsed.gifts.length > 0) {
        const cat = {
          version: Number(parsed.version) || 1,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          gifts: parsed.gifts.map((g, idx) => ({
            ...g,
            published: g.published !== false,
            order: Number.isFinite(Number(g.order)) ? Number(g.order) : idx + 1
          }))
        };
        cat.sha = parsed.sha || computeSha(cat);
        return cat;
      }
    }
  } catch (err) {
    console.warn("[storage] Error reading data/gifts.json:", err.message);
  }

  const initial = {
    version: 1,
    updatedAt: new Date().toISOString(),
    settings: DEFAULT_SETTINGS,
    gifts: SEED_GIFTS
  };
  initial.sha = computeSha(initial);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  } catch {}
  return initial;
}

function getHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const list = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return [];
}

function recordSnapshot(catalog, summary, actorEmail) {
  try {
    const history = getHistory();
    const entry = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      version: catalog.version,
      sha: catalog.sha,
      timestamp: catalog.updatedAt,
      summary: summary || "تحديث كتالوج الهدايا",
      actor: actorEmail || "admin",
      count: catalog.gifts.length,
      snapshot: {
        version: catalog.version,
        sha: catalog.sha,
        settings: catalog.settings,
        gifts: catalog.gifts
      }
    };
    history.unshift(entry);
    const trimmed = history.slice(0, 30);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf8");
    return entry;
  } catch (err) {
    console.warn("[history] Could not write history snapshot:", err.message);
    return null;
  }
}

function hasGithubConfig() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  return Boolean(
    GITHUB_TOKEN &&
    GITHUB_OWNER &&
    GITHUB_REPO &&
    !GITHUB_TOKEN.includes("REPLACE_ME") &&
    !GITHUB_OWNER.includes("your-github")
  );
}

async function githubRequest(apiPath, options = {}, retries = 2) {
  const { GITHUB_TOKEN } = process.env;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://api.github.com${apiPath}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    if (res.status >= 500 && attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    const err = new Error(data.message || `GitHub API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
}

async function triggerVercelDeployHook() {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) return false;
  try {
    const r = await fetch(hookUrl, { method: "POST" });
    return r.ok;
  } catch {
    return false;
  }
}

async function verifyAdminAuth(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isDemo = req.headers["x-demo-admin"] === "true" || token === "demo-admin-token";

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasRealServiceAccount = rawServiceAccount && !rawServiceAccount.includes("REPLACE_ME");

  if (!hasRealServiceAccount || isDemo) {
    if (!token && !isDemo) {
      const err = new Error("يرجى تسجيل الدخول بحساب المسؤول أولاً.");
      err.status = 401;
      throw err;
    }
    return { email: "owner@giftgallery.local", role: "admin", isDemo: true };
  }

  try {
    const admin = await import("firebase-admin");
    let appInstance = admin.default.apps[0];
    if (!appInstance) {
      const creds = JSON.parse(rawServiceAccount);
      appInstance = admin.default.initializeApp({
        credential: admin.default.credential.cert(creds)
      });
    }
    const decoded = await appInstance.auth().verifyIdToken(token);
    if (!decoded.email || decoded.email_verified !== true) {
      const err = new Error("يتطلب الدخول حساب Google ببريد إلكتروني موثّق.");
      err.status = 403;
      throw err;
    }
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length > 0 && !adminEmails.includes(decoded.email.toLowerCase())) {
      const err = new Error("هذا الحساب غير مدرج ضمن قائمة ADMIN_EMAILS المصرح لها.");
      err.status = 403;
      throw err;
    }
    return decoded;
  } catch (e) {
    const err = new Error(e.message || "غير مصرح بالدخول");
    err.status = e.status || 401;
    throw err;
  }
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  const catalog = getLocalCatalog();
  const history = getHistory();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    name: "Gift Gallery API",
    version: catalog.version,
    sha: catalog.sha,
    giftsCount: catalog.gifts.length,
    historyCount: history.length,
    storage: hasGithubConfig() ? "github+local" : "local",
    auth: (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON.includes("REPLACE_ME"))
      ? "firebase-admin"
      : "local-preview",
    maxUploadMb: Math.max(1, Number(process.env.MAX_UPLOAD_MB || 30)),
    vercelHookConfigured: Boolean(process.env.VERCEL_DEPLOY_HOOK_URL),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/gifts", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (hasGithubConfig()) {
    try {
      const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = "main", GITHUB_DATA_PATH = "data/gifts.json" } = process.env;
      const ghPath = `/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${GITHUB_DATA_PATH.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
      const fileData = await githubRequest(ghPath);
      const decoded = Buffer.from(fileData.content || "", "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      if (parsed && Array.isArray(parsed.gifts)) {
        return res.json({
          version: Number(parsed.version) || 1,
          sha: fileData.sha,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          gifts: parsed.gifts
        });
      }
    } catch (ghErr) {
      console.warn("[github] Fallback to local catalog:", ghErr.message);
    }
  }

  return res.json(getLocalCatalog());
});

app.put("/api/gifts", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await verifyAdminAuth(req);

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    if (!body || !Array.isArray(body.gifts)) {
      return res.status(400).json({ error: "البيانات المرسلة يجب أن تحتوي على مصفوفة gifts." });
    }
    if (body.gifts.length > 2000) {
      return res.status(413).json({ error: "الحد الأقصى للكتالوج هو 2000 هدية." });
    }

    const current = getLocalCatalog();
    const forceWrite = Boolean(body.force);

    // Concurrency conflict detection via expectedSha or expectedVersion
    if (!forceWrite) {
      if (body.expectedSha && body.expectedSha !== current.sha) {
        return res.status(409).json({
          error: "تعارض في التحديث المتزامن (SHA Conflict): تم تعديل الكتالوج من جلسة أخرى قبل حفظ تعديلاتك.",
          code: "SHA_CONFLICT",
          currentVersion: current.version,
          currentSha: current.sha
        });
      }
      if (body.expectedVersion != null && Number(body.expectedVersion) < current.version) {
        return res.status(409).json({
          error: "تعارض في الإصدارات: تم تحديث الكتالوج من جلسة أخرى. يرجى تحديث الصفحة أو تأكيد الكتابة فوق النسخة الحالية.",
          code: "VERSION_CONFLICT",
          currentVersion: current.version,
          currentSha: current.sha
        });
      }
    }

    const seen = new Set();
    const sanitizedGifts = [];
    for (let i = 0; i < body.gifts.length; i++) {
      const g = body.gifts[i];
      if (!g || typeof g.id !== "string" || !g.id.trim() || typeof g.title !== "string" || !g.title.trim()) {
        return res.status(400).json({ error: "كل هدية يجب أن تحتوي على معرّف (id) واسم (title)." });
      }
      const cleanId = g.id.trim();
      if (seen.has(cleanId)) {
        return res.status(400).json({ error: `معرّف مكرر: ${cleanId}` });
      }
      seen.add(cleanId);
      sanitizedGifts.push({
        id: cleanId,
        title: g.title.trim().slice(0, 120),
        category: String(g.category || "هدايا").trim().slice(0, 60),
        type: ["image", "video", "svga", "vap", "other"].includes(g.type) ? g.type : "image",
        description: String(g.description || "").trim().slice(0, 500),
        assetUrl: String(g.assetUrl || "").trim(),
        featured: Boolean(g.featured),
        published: g.published !== false,
        order: Number.isFinite(Number(g.order)) ? Number(g.order) : (i + 1) * 10,
        price: g.price != null && g.price !== "" && Number.isFinite(Number(g.price)) ? Number(g.price) : null,
        emoji: String(g.emoji || "🎁").trim().slice(0, 10),
        createdAt: g.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const nextVersion = current.version + 1;
    const payload = {
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      settings: {
        ...current.settings,
        ...(body.settings || {})
      },
      gifts: sanitizedGifts
    };
    payload.sha = computeSha(payload);

    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
    recordSnapshot(payload, body.summary || `حفظ الكتالوج (${sanitizedGifts.length} عنصر)`, user.email);

    let githubUpdated = false;
    if (hasGithubConfig()) {
      try {
        const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = "main", GITHUB_DATA_PATH = "data/gifts.json" } = process.env;
        const ghPath = `/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${GITHUB_DATA_PATH.split("/").map(encodeURIComponent).join("/")}`;

        let existingSha = body.expectedSha || null;
        if (!existingSha || forceWrite) {
          try {
            const remoteFile = await githubRequest(`${ghPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
            existingSha = remoteFile.sha;
          } catch {}
        }

        const commitToGithub = async (shaToUse) => {
          return await githubRequest(ghPath, {
            method: "PUT",
            body: JSON.stringify({
              message: body.summary || `Update Gift Gallery catalog v${nextVersion}`,
              content: Buffer.from(JSON.stringify(payload, null, 2) + "\n").toString("base64"),
              branch: GITHUB_BRANCH,
              ...(shaToUse ? { sha: shaToUse } : {})
            })
          });
        };

        try {
          const ghRes = await commitToGithub(existingSha);
          if (ghRes?.content?.sha) payload.sha = ghRes.content.sha;
          githubUpdated = true;
        } catch (conflictErr) {
          if ((conflictErr.status === 409 || conflictErr.status === 422) && forceWrite) {
            const latestRemote = await githubRequest(`${ghPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
            const ghRes = await commitToGithub(latestRemote.sha);
            if (ghRes?.content?.sha) payload.sha = ghRes.content.sha;
            githubUpdated = true;
          } else if (conflictErr.status === 409) {
            return res.status(409).json({
              error: "تعارض SHA على GitHub: تم تعديل الملف في المستودع بشكل متزامن.",
              code: "SHA_CONFLICT",
              currentVersion: payload.version,
              currentSha: payload.sha
            });
          } else {
            throw conflictErr;
          }
        }

        await triggerVercelDeployHook();
      } catch (ghErr) {
        console.warn("[github] Failed to commit catalog to GitHub:", ghErr.message);
      }
    }

    return res.json({
      ok: true,
      version: payload.version,
      sha: payload.sha,
      count: payload.gifts.length,
      updatedAt: payload.updatedAt,
      githubUpdated
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "فشل حفظ الكتالوج" });
  }
});

// GET /api/history - List version snapshots for rollback
app.get("/api/history", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const history = getHistory().map(({ snapshot, ...meta }) => meta);
  res.json({ history });
});

// POST /api/rollback - Restore a previous snapshot by ID
app.post("/api/rollback", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await verifyAdminAuth(req);
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "معرّف النسخة مطلوب للرجوع." });

    const history = getHistory();
    const target = history.find(h => h.id === id);
    if (!target || !target.snapshot) {
      return res.status(404).json({ error: "النسخة المطلوبة غير موجودة في السجل." });
    }

    const current = getLocalCatalog();
    const restored = {
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      settings: target.snapshot.settings || current.settings,
      gifts: target.snapshot.gifts || []
    };
    restored.sha = computeSha(restored);

    fs.writeFileSync(DATA_FILE, JSON.stringify(restored, null, 2), "utf8");
    recordSnapshot(restored, `استرجاع النسخة رقم v${target.version}`, user.email);

    return res.json({
      ok: true,
      version: restored.version,
      sha: restored.sha,
      updatedAt: restored.updatedAt,
      catalog: restored
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "فشل استرجاع النسخة" });
  }
});

// POST /api/upload - Upload media asset
app.post("/api/upload", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await verifyAdminAuth(req);

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    const { filename, contentBase64, mimeType } = body || {};
    if (!filename || !contentBase64) {
      return res.status(400).json({ error: "الاسم ومحتوى الملف مطلوبان." });
    }

    const ext = String(filename).split(".").pop().toLowerCase();
    const allowedExts = ["mp4", "webm", "mov", "svga", "vap", "svg", "gif", "webp", "png", "jpg", "jpeg", "json"];
    if (!allowedExts.includes(ext)) {
      return res.status(415).json({ error: `صيغة الملف .${ext} غير مدعومة.` });
    }

    const allowedMime = /^(image\/(png|jpeg|webp|gif|svg\+xml)|video\/(mp4|webm|quicktime)|application\/(octet-stream|json|x-svga)|audio\/(mpeg|wav|ogg))$/i;
    if (mimeType && !allowedMime.test(mimeType)) {
      return res.status(415).json({ error: `نوع الملف (${mimeType}) غير مدعوم.` });
    }

    const cleanName = String(filename || "upload.bin")
      .normalize("NFKD")
      .replace(/[^\w.\-ء-ي]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .slice(-100);

    const safeFilename = `${Date.now()}-${cleanName || "asset.bin"}`;
    const raw = String(contentBase64).replace(/^data:[^,]*;base64,/, "");
    const buffer = Buffer.from(raw, "base64");

    const maxMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 30));
    if (buffer.length <= 0) {
      return res.status(400).json({ error: "بيانات الملف فارغة أو غير صالحة." });
    }
    if (buffer.length > maxMb * 1024 * 1024) {
      return res.status(413).json({ error: `حجم الملف يتجاوز الحد المسموح (${maxMb} MB).` });
    }

    const localFilePath = path.join(ASSETS_DIR, safeFilename);
    fs.writeFileSync(localFilePath, buffer);
    const localUrl = `/assets/${encodeURIComponent(safeFilename)}`;

    let finalUrl = localUrl;
    let githubUploaded = false;

    if (hasGithubConfig()) {
      try {
        const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = "main", GITHUB_ASSETS_PATH = "public/assets" } = process.env;
        const dir = GITHUB_ASSETS_PATH.replace(/^\/+|\/+$/g, "");
        const pathOnRepo = `${dir}/${safeFilename}`;
        const ghPath = `/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${pathOnRepo.split("/").map(encodeURIComponent).join("/")}`;

        let existingAssetSha = null;
        try {
          const existing = await githubRequest(`${ghPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
          existingAssetSha = existing.sha;
        } catch {}

        await githubRequest(ghPath, {
          method: "PUT",
          body: JSON.stringify({
            message: `Upload gift asset ${safeFilename}`,
            content: buffer.toString("base64"),
            branch: GITHUB_BRANCH,
            ...(existingAssetSha ? { sha: existingAssetSha } : {})
          })
        });

        finalUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${encodeURIComponent(GITHUB_BRANCH)}/${pathOnRepo.split("/").map(encodeURIComponent).join("/")}`;
        githubUploaded = true;
      } catch (ghErr) {
        console.warn("[github] Asset upload fallback to local URL:", ghErr.message);
      }
    }

    return res.json({
      ok: true,
      filename: safeFilename,
      url: finalUrl,
      localUrl,
      githubUploaded,
      size: buffer.length,
      mimeType: mimeType || "application/octet-stream"
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || "فشل رفع الملف" });
  }
});

// -------------------------------------------------------------
// Static Assets & SPA Entry
// -------------------------------------------------------------
app.use("/assets", express.static(ASSETS_DIR, { maxAge: "1h" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/style.css", (_req, res) => res.sendFile(path.join(__dirname, "public", "style.css")));
app.get("/app.js", (_req, res) => res.sendFile(path.join(__dirname, "public", "app.js")));
app.get("/config.js", (_req, res) => res.sendFile(path.join(__dirname, "public", "config.js")));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Seed initial snapshot if history is empty
if (getHistory().length === 0) {
  const initCat = getLocalCatalog();
  recordSnapshot(initCat, "النسخة التأسيسية للمعرض", "system");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✨ Gift Gallery Server running on http://0.0.0.0:${PORT}`);
});
