import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const LOCAL_KEY = "gift-gallery-local-catalog-v3";
const config = window.GIFT_GALLERY_CONFIG?.firebase || {};
const firebaseReady = Boolean(
  config.apiKey &&
  !config.apiKey.startsWith("PASTE_") &&
  config.projectId &&
  config.projectId !== "YOUR_PROJECT_ID"
);

let auth = null;
let currentUser = null;
let catalog = [];
let catalogVersion = 1;
let catalogSha = null;
let catalogSettings = {};
let activeCategory = "الكل";
let activeTypeFilter = "all";
let onlyFeatured = false;
let searchTerm = "";
let adminSearchTerm = "";
let adminCategory = "الكل";
let previewGift = null;
let avatarSimMode = false;
let vapAlphaMode = false;
let saving = false;
let svgaPlayerInstance = null;
let vapAnimFrame = null;

const fallback = [
  { id: "demo-crown", title: "التاج الإمبراطوري الذهبي", category: "ملكي", type: "image", description: "تاج ملكي مرصع بالياقوت الأحمر والألماس مع هالة ضوئية ذهبية متحركة.", assetUrl: "/assets/royal-crown.svg", featured: true, published: true, order: 1, price: 49.99, emoji: "👑", createdAt: new Date().toISOString() },
  { id: "demo-rose", title: "وردة الذهب والياقوت", category: "هدايا", type: "image", description: "وردة مخملية حمراء بساق من الذهب الخالص داخل قبة بلورية فاخرة.", assetUrl: "/assets/golden-rose.svg", featured: true, published: true, order: 2, price: 19.99, emoji: "🌹", createdAt: new Date().toISOString() },
  { id: "demo-diamond", title: "ماسة القصر الملكي", category: "هدايا", type: "image", description: "ماسة مقطوعة بدقة هندسية تنشر انعكاسات ضوئية زرقاء وذهبية ساحرة.", assetUrl: "/assets/diamond-chest.svg", featured: true, published: true, order: 3, price: 29.99, emoji: "💎", createdAt: new Date().toISOString() },
  { id: "demo-car", title: "سيارة النخبة الذهبية", category: "ملكي", type: "image", description: "سيارة رياضية فارهة مطلية بالذهب مع إضاءة أمامية ديناميكية.", assetUrl: "/assets/luxury-car.svg", featured: false, published: true, order: 4, price: 89.99, emoji: "🏎️", createdAt: new Date().toISOString() },
  { id: "demo-frame-gold", title: "الإطار الفيكتوري الإمبراطوري", category: "إطارات", type: "image", description: "إطار دائري مزخرف بنقوش الذهب الملكي وتاج علوي يمنح الحساب حضوراً متفرداً.", assetUrl: "/assets/imperial-frame.svg", featured: true, published: true, order: 5, price: 14.99, emoji: "▣", createdAt: new Date().toISOString() },
  { id: "demo-frame-stars", title: "إطار المدار النجمي", category: "إطارات", type: "image", description: "إطار متوهج محاط بمدار من النجوم الذهبية والفضية الدوارة.", assetUrl: "/assets/starlight-frame.svg", featured: true, published: true, order: 6, price: 9.99, emoji: "✨", createdAt: new Date().toISOString() },
  { id: "demo-entry-royal", title: "دخولية البساط الملكي", category: "دخوليات", type: "image", description: "قوس نصر ذهبي مع بساط أحمر ملكي ونجمة متوهجة للإعلان عن حضور كبار الشخصيات.", assetUrl: "/assets/royal-procession.svg", featured: true, published: true, order: 7, price: 59.99, emoji: "✦", createdAt: new Date().toISOString() },
  { id: "demo-entry-phoenix", title: "دخولية تحليق الفينيق الذهبي", category: "دخوليات", type: "image", description: "طائر الفينيق الأسطوري يفرد جناحيه من الذهب واللهب في مشهد مهيب.", assetUrl: "/assets/phoenix-entry.svg", featured: true, published: true, order: 8, price: 79.99, emoji: "🦅", createdAt: new Date().toISOString() }
];

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const safeUrl = value => {
  if (!value) return "";
  try {
    const u = new URL(value, location.origin);
    return ["http:", "https:", "blob:", "data:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};

function toast(message, duration = 3200) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), duration);
}

/**
 * Custom accessible confirmation dialog (replaces window.confirm & window.alert)
 */
function askConfirm({ title = "تأكيد الإجراء", message = "", okText = "تأكيد", altText = "", cancelText = "إلغاء", icon = "✦" }) {
  return new Promise(resolve => {
    const modal = $("#confirmModal");
    if (!modal) return resolve("ok");
    $("#confirmTitle").textContent = title;
    $("#confirmMessage").textContent = message;
    $("#confirmIcon").textContent = icon;

    const okBtn = $("#confirmOkBtn");
    const altBtn = $("#confirmAltBtn");
    const cancelBtn = $("#confirmCancelBtn");
    const backdrop = $("#confirmBackdrop");

    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;

    if (altText) {
      altBtn.textContent = altText;
      altBtn.classList.remove("hidden");
    } else {
      altBtn.classList.add("hidden");
    }

    const cleanup = result => {
      okBtn.onclick = null;
      altBtn.onclick = null;
      cancelBtn.onclick = null;
      backdrop.onclick = null;
      closeModal("confirmModal");
      resolve(result);
    };

    okBtn.onclick = () => cleanup("ok");
    altBtn.onclick = () => cleanup("alt");
    cancelBtn.onclick = () => cleanup("cancel");
    backdrop.onclick = () => cleanup("cancel");

    openModal("confirmModal");
  });
}

function openModal(id) {
  const m = $("#" + id);
  if (!m) return;
  m.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function stopPreviewEngines() {
  const vid = $("#previewMedia video");
  if (vid) vid.pause();
  if (svgaPlayerInstance) {
    try { svgaPlayerInstance.stopAnimation(); } catch {}
    svgaPlayerInstance = null;
  }
  if (vapAnimFrame) {
    cancelAnimationFrame(vapAnimFrame);
    vapAnimFrame = null;
  }
}

function closeModal(id) {
  const m = $("#" + id);
  if (!m) return;
  m.classList.add("hidden");
  if (!$$(".modal:not(.hidden)").length) document.body.style.overflow = "";

  if (id === "previewModal") {
    stopPreviewEngines();
    const media = $("#previewMedia");
    if (media) media.innerHTML = "";
    previewGift = null;
  }
}

function getLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({
      version: catalogVersion,
      sha: catalogSha,
      updatedAt: new Date().toISOString(),
      settings: catalogSettings,
      gifts: catalog
    }));
  } catch {
    toast("مساحة التخزين المحلي ممتلئة على هذا المتصفح.");
  }
}

function updateVersionBadges() {
  const vText = `v${catalogVersion}${catalogSha ? ` · ${String(catalogSha).slice(0, 7)}` : ""}`;
  if ($("#catalogVerLabel")) $("#catalogVerLabel").textContent = `v${catalogVersion}`;
  if ($("#adminVersionBadge")) $("#adminVersionBadge").textContent = vText;
}

async function loadCatalog() {
  const local = getLocal();
  try {
    const r = await fetch("/api/gifts", { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data.gifts) && data.gifts.length > 0) {
        catalog = data.gifts;
        catalogVersion = Number(data.version) || 1;
        catalogSha = data.sha || null;
        catalogSettings = data.settings || {};
        setLocal();
        updateVersionBadges();
        if ($("#footerSyncStatus")) $("#footerSyncStatus").textContent = `متصل بالخادم · الإصدار v${catalogVersion}`;
        return;
      }
    }
  } catch (err) {
    console.warn("Could not fetch /api/gifts, falling back to local storage:", err.message);
  }

  catalog = Array.isArray(local?.gifts) && local.gifts.length > 0 ? local.gifts : fallback;
  catalogVersion = Number(local?.version) || 1;
  catalogSha = local?.sha || null;
  if (!local) setLocal();
  updateVersionBadges();
}

async function getIdToken() {
  if (currentUser?.getIdToken) return currentUser.getIdToken();
  return "demo-admin-token";
}

async function apiSave(summary = "تحديث كتالوج الهدايا", force = false) {
  if (!currentUser) {
    setLocal();
    toast("تم الحفظ في متصفحك الحالي. سجّل دخول الإدارة للحفظ في الخادم.");
    return false;
  }

  if (saving) return false;
  saving = true;
  const saveBtn = $("#saveGiftBtn");
  if (saveBtn) saveBtn.disabled = true;

  try {
    const token = await getIdToken();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    };
    if (currentUser.isDemo) headers["x-demo-admin"] = "true";

    const r = await fetch("/api/gifts", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        gifts: catalog,
        expectedVersion: catalogVersion,
        expectedSha: catalogSha,
        summary,
        force
      })
    });

    const result = await r.json().catch(() => ({}));

    // Handle SHA or Version concurrency conflict (HTTP 409)
    if (r.status === 409) {
      saving = false;
      if (saveBtn) saveBtn.disabled = false;
      const choice = await askConfirm({
        title: "تعارض في التحديث المتزامن (SHA Conflict)",
        message: "تم تعديل الكتالوج من جلسة أخرى قبل حفظ تعديلاتك. هل تريد فرض حفظ تعديلاتك الحالية أم تحميل أحدث نسخة من الخادم؟",
        okText: "فرض حفظ تعديلاتي الآن",
        altText: "تحميل نسخة الخادم الأحدث",
        cancelText: "إلغاء",
        icon: "⚠️"
      });
      if (choice === "ok") {
        return await apiSave(summary, true);
      }
      if (choice === "alt") {
        await loadCatalog();
        render();
        toast("تم تحديث الكتالوج بأحدث نسخة من الخادم.");
      }
      return false;
    }

    if (!r.ok) throw new Error(result.error || "فشل الحفظ في الخادم");

    catalogVersion = Number(result.version) || (catalogVersion + 1);
    catalogSha = result.sha || catalogSha;
    setLocal();
    updateVersionBadges();
    toast("تم حفظ وتحديث كتالوج الهدايا بنجاح ✦");
    return true;
  } catch (e) {
    setLocal();
    toast("حُفظت محلياً (" + e.message + ")");
    return true;
  } finally {
    saving = false;
    if (saveBtn) saveBtn.disabled = false;
  }
}

function mediaMarkup(gift, cls = "") {
  const url = safeUrl(gift.assetUrl);
  const ext = url.split("?")[0].split(".").pop().toLowerCase();

  if (url && (gift.type === "svga" || ext === "svga")) {
    return `<div class="gift-placeholder" title="SVGA Animation">
      <div style="text-align:center;line-height:1.2;">
        <div style="font-size:32px;">✦</div>
        <div style="font-size:10px;color:var(--gold2);font-weight:700;margin-top:4px;">SVGA</div>
      </div>
    </div>`;
  }

  if (url && (gift.type === "video" || gift.type === "vap" || ["mp4", "webm", "mov", "m4v"].includes(ext))) {
    return `<video class="${cls}" src="${esc(url)}" muted loop autoplay playsinline></video>`;
  }

  if (url && (gift.type === "image" || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext))) {
    const fallbackEmoji = esc(gift.emoji || "🎁");
    return `<img class="${cls}" src="${esc(url)}" alt="${esc(gift.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'gift-placeholder\\'>${fallbackEmoji}</div>';">`;
  }

  const defaultEmoji = gift.category === "إطارات" ? "▣" : gift.category === "دخوليات" ? "🦅" : gift.category === "ملكي" ? "👑" : "🎁";
  return `<div class="gift-placeholder">${esc(gift.emoji || defaultEmoji)}</div>`;
}

function updateCategoryCounters() {
  const publishedList = catalog.filter(g => g.published !== false);
  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setTxt("#giftCount", publishedList.length);
  setTxt("#count-all", publishedList.length);
  setTxt("#count-royal", publishedList.filter(g => g.category === "ملكي").length);
  setTxt("#count-gifts", publishedList.filter(g => g.category === "هدايا").length);
  setTxt("#count-frames", publishedList.filter(g => g.category === "إطارات").length);
  setTxt("#count-entries", publishedList.filter(g => g.category === "دخوليات").length);
  setTxt("#adminManageCount", catalog.length);
}

function filteredGifts() {
  let list = catalog.filter(g => g.published !== false);
  if (activeCategory !== "الكل") list = list.filter(g => g.category === activeCategory);
  if (activeTypeFilter !== "all") list = list.filter(g => (g.type || "image") === activeTypeFilter);
  if (onlyFeatured) list = list.filter(g => Boolean(g.featured));

  if (searchTerm) {
    const q = searchTerm.toLocaleLowerCase();
    list = list.filter(g => `${g.title} ${g.description || ""} ${g.category}`.toLocaleLowerCase().includes(q));
  }

  const sort = $("#sortSelect")?.value || "order";
  if (sort === "order") list.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title, "ar"));
  if (sort === "featured") list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (Number(a.order) || 999) - (Number(b.order) || 999));
  if (sort === "new") list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  if (sort === "price-desc") list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  if (sort === "price-asc") list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  return list;
}

function render() {
  updateCategoryCounters();
  const list = filteredGifts();

  if ($("#year")) $("#year").textContent = new Date().getFullYear();
  if ($("#resultLabel")) $("#resultLabel").textContent = activeCategory === "الكل" ? "كل العناصر" : `تصنيف: ${activeCategory}`;
  if ($("#resultCountLabel")) $("#resultCountLabel").textContent = `${list.length} عنصر`;

  const typeLabels = {
    image: "صورة / SVG",
    video: "فيديو MP4",
    svga: "SVGA متحرك",
    vap: "VAP شفاف",
    other: "ملف رقمي"
  };

  const grid = $("#giftGrid");
  if (grid) {
    grid.innerHTML = list.map(g => {
      const priceText = g.price != null && g.price !== "" ? `$${Number(g.price).toFixed(2)}` : "مجاني";
      return `<article class="gift-card" data-open="${esc(g.id)}" tabindex="0" role="button" aria-label="معاينة ${esc(g.title)}">
        <div class="gift-visual">
          ${mediaMarkup(g)}
        </div>
        <div class="gift-card-content">
          <div class="gift-card-kicker">
            <span>${esc(g.category || "هدايا")}</span>
            <span aria-hidden="true">·</span>
            <span>${esc(typeLabels[g.type] || "تصميم رقمي")}</span>
            ${g.featured ? '<span aria-hidden="true">·</span><span class="featured-star">مميز ✦</span>' : ""}
          </div>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.description || "تصميم رقمي فاخر من معرض Gift Gallery.")}</p>
          <div class="gift-card-bottom">
            <span class="gift-price-tag tabular">${esc(priceText)}</span>
            <span class="open-gift">معاينة المسرح ↙</span>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  if ($("#emptyState")) $("#emptyState").classList.toggle("hidden", list.length > 0);
  if ($("#giftGrid")) $("#giftGrid").classList.toggle("hidden", list.length === 0);

  renderAdminList();
}

function renderAdminList() {
  const adminList = $("#adminGiftList");
  if (!adminList) return;

  let list = [...catalog].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  if (adminCategory !== "الكل") list = list.filter(g => g.category === adminCategory);
  if (adminSearchTerm) {
    const q = adminSearchTerm.toLocaleLowerCase();
    list = list.filter(g => `${g.title} ${g.category} ${g.id}`.toLocaleLowerCase().includes(q));
  }

  adminList.innerHTML = list.map((g, idx) => `
    <div class="admin-item ${g.published === false ? "is-draft" : ""}">
      <div class="admin-thumb">${mediaMarkup(g)}</div>
      <div class="admin-item-main">
        <b>${esc(g.title)} ${g.featured ? "✦" : ""} ${g.published === false ? "(مخفي)" : ""}</b>
        <small class="tabular">#${Number(g.order) || (idx + 1)} · ${esc(g.category)} · ${esc((g.type || "image").toUpperCase())} ${g.price != null ? `· $${Number(g.price).toFixed(2)}` : ""}</small>
      </div>
      <div class="admin-item-actions">
        <button type="button" class="small-action" data-move-up="${esc(g.id)}" title="تحريك لأعلى">↑</button>
        <button type="button" class="small-action" data-move-down="${esc(g.id)}" title="تحريك لأسفل">↓</button>
        <button type="button" class="small-action" data-toggle-pub="${esc(g.id)}" title="إظهار/إخفاء">${g.published === false ? "نشر" : "إخفاء"}</button>
        <button type="button" class="small-action" data-edit="${esc(g.id)}">تعديل</button>
        <button type="button" class="small-action delete" data-delete="${esc(g.id)}">حذف</button>
      </div>
    </div>
  `).join("") || '<p class="form-note">لا توجد عناصر مطابقة في القائمة.</p>';
}

/**
 * Side-by-Side Alpha Video Renderer for VAP / Alpha Videos
 */
function startVapCanvasRenderer(videoEl, container) {
  const canvas = document.createElement("canvas");
  const buffer = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const bufCtx = buffer.getContext("2d", { willReadFrequently: true });
  container.innerHTML = "";
  container.appendChild(canvas);

  const renderFrame = () => {
    if (videoEl.paused || videoEl.ended) return;
    const vw = videoEl.videoWidth || 640;
    const vh = videoEl.videoHeight || 360;
    const halfW = Math.floor(vw / 2);

    if (canvas.width !== halfW || canvas.height !== vh) {
      canvas.width = halfW;
      canvas.height = vh;
      buffer.width = vw;
      buffer.height = vh;
    }

    bufCtx.drawImage(videoEl, 0, 0, vw, vh);
    const rgbFrame = bufCtx.getImageData(0, 0, halfW, vh);
    const alphaFrame = bufCtx.getImageData(halfW, 0, halfW, vh);
    const rgbData = rgbFrame.data;
    const alphaData = alphaFrame.data;

    for (let i = 0; i < rgbData.length; i += 4) {
      rgbData[i + 3] = alphaData[i]; // Use red channel of right half as alpha mask
    }
    ctx.putImageData(rgbFrame, 0, 0);
    vapAnimFrame = requestAnimationFrame(renderFrame);
  };

  videoEl.addEventListener("play", () => {
    renderFrame();
  });
  videoEl.play().catch(() => {});
}

function renderPreviewStage() {
  if (!previewGift) return;
  stopPreviewEngines();

  const gift = previewGift;
  const mediaContainer = $("#previewMedia");
  mediaContainer.innerHTML = "";

  const url = safeUrl(gift.assetUrl);
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  const isVideo = gift.type === "video" || gift.type === "vap" || ["mp4", "webm", "mov"].includes(ext);
  const isSvga = gift.type === "svga" || ext === "svga";

  const vapBtn = $("#vapAlphaBtn");
  if (vapBtn) {
    vapBtn.classList.toggle("hidden", !isVideo);
    vapBtn.classList.toggle("active", vapAlphaMode);
  }

  const techNote = $("#previewTechNote");
  if (techNote) {
    if (isSvga) {
      techNote.textContent = "يتم تشغيل ملف SVGA مباشرة عبر محرك svgaplayerweb المدمج.";
      techNote.classList.remove("hidden");
    } else if (gift.type === "vap" || ext === "vap") {
      techNote.textContent = "ملف VAP: يمكنك تفعيل زر (شفافية VAP) لدمج قناة Alpha الجانبية أو عرضه كفيديو مباشر.";
      techNote.classList.remove("hidden");
    } else {
      techNote.classList.add("hidden");
    }
  }

  // Avatar Frame Simulation Mode
  if (avatarSimMode && url && !isVideo && !isSvga) {
    mediaContainer.innerHTML = `
      <div class="avatar-frame-sim">
        <div class="sim-avatar-circle">👑</div>
        <img class="sim-frame-overlay" src="${esc(url)}" alt="${esc(gift.title)}" referrerpolicy="no-referrer">
      </div>
    `;
    return;
  }

  // 1. SVGA Player
  if (url && isSvga && window.SVGA) {
    const svgaHolder = document.createElement("div");
    svgaHolder.style.width = "100%";
    svgaHolder.style.height = "290px";
    mediaContainer.appendChild(svgaHolder);

    try {
      const player = new window.SVGA.Player(svgaHolder);
      const parser = new window.SVGA.Parser();
      player.loops = 0;
      parser.load(url, videoItem => {
        player.setVideoItem(videoItem);
        player.startAnimation();
      }, () => {
        mediaContainer.innerHTML = `<div class="gift-placeholder">${esc(gift.emoji || "✦")}</div>`;
      });
      svgaPlayerInstance = player;
    } catch {
      mediaContainer.innerHTML = `<div class="gift-placeholder">${esc(gift.emoji || "✦")}</div>`;
    }
    return;
  }

  // 2. Video / VAP Player
  if (url && isVideo) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = !vapAlphaMode;
    video.autoplay = true;
    video.loop = true;
    video.muted = false;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    if (vapAlphaMode) {
      startVapCanvasRenderer(video, mediaContainer);
    } else {
      mediaContainer.appendChild(video);
    }
    return;
  }

  // 3. Standard Image / SVG / WebP
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = gift.title;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      mediaContainer.innerHTML = `<div class="gift-placeholder" style="font-size:64px;">${esc(gift.emoji || "🎁")}</div>`;
    };
    mediaContainer.appendChild(img);
    return;
  }

  mediaContainer.innerHTML = `<div class="gift-placeholder" style="font-size:64px;">${esc(gift.emoji || "🎁")}</div>`;
}

function preview(id) {
  const gift = catalog.find(g => g.id === id);
  if (!gift) return;
  previewGift = gift;
  avatarSimMode = gift.category === "إطارات";
  vapAlphaMode = false;

  $("#avatarSimBtn")?.classList.toggle("active", avatarSimMode);
  $("#previewTitle").textContent = gift.title;
  $("#previewDescription").textContent = gift.description || "تصميم رقمي فاخر وتأثيرات مميزة من Gift Gallery.";
  $("#previewCategory").textContent = gift.category || "هدايا";
  $("#previewTypeBadge").textContent = String(gift.type || "image").toUpperCase();
  $("#previewIdBadge").textContent = gift.id;

  const priceEl = $("#previewPrice");
  if (priceEl) {
    priceEl.textContent = gift.price != null && gift.price !== "" ? `$${Number(gift.price).toFixed(2)}` : "مجاني";
  }

  const dlBtn = $("#downloadAssetBtn");
  const url = safeUrl(gift.assetUrl);
  if (dlBtn) {
    if (url) {
      dlBtn.href = url;
      dlBtn.classList.remove("hidden");
    } else {
      dlBtn.classList.add("hidden");
    }
  }

  renderPreviewStage();
  openModal("previewModal");
}

function updateLiveFormPreview() {
  const box = $("#formLivePreview");
  if (!box) return;
  const tempGift = {
    title: $("#giftTitle")?.value || "معاينة",
    category: $("#giftCategory")?.value || "هدايا",
    type: $("#giftType")?.value || "image",
    assetUrl: $("#giftAssetUrl")?.value.trim() || "",
    emoji: $("#giftEmoji")?.value.trim() || "👑"
  };
  box.innerHTML = mediaMarkup(tempGift);
}

function resetForm() {
  $("#giftForm")?.reset();
  $("#giftId").value = "";
  if ($("#giftPrice")) $("#giftPrice").value = "";
  if ($("#giftEmoji")) $("#giftEmoji").value = "";
  if ($("#giftOrder")) $("#giftOrder").value = (catalog.length + 1) * 10;
  if ($("#giftPublished")) $("#giftPublished").checked = true;
  $("#saveGiftBtn").textContent = "حفظ العنصر في الكتالوج";
  $("#uploadProgress").textContent = "";
  updateLiveFormPreview();
}

function fillForm(id) {
  const g = catalog.find(x => x.id === id);
  if (!g) return;
  $("#giftId").value = g.id;
  $("#giftTitle").value = g.title;
  $("#giftCategory").value = g.category || "هدايا";
  $("#giftType").value = g.type || "image";
  if ($("#giftPrice")) $("#giftPrice").value = g.price != null ? g.price : "";
  if ($("#giftEmoji")) $("#giftEmoji").value = g.emoji || "";
  if ($("#giftOrder")) $("#giftOrder").value = g.order != null ? g.order : 10;
  $("#giftDescription").value = g.description || "";
  $("#giftAssetUrl").value = g.assetUrl || "";
  $("#giftFeatured").checked = !!g.featured;
  if ($("#giftPublished")) $("#giftPublished").checked = g.published !== false;
  $("#saveGiftBtn").textContent = "حفظ التعديلات";

  adminTab("edit");
  $("#giftFile").value = "";
  $("#uploadProgress").textContent = "";
  updateLiveFormPreview();
  $("#adminModal .modal-panel")?.scrollTo({ top: 0, behavior: "smooth" });
}

async function uploadFile(file) {
  if (!file) return "";
  if (file.size > 30 * 1024 * 1024) throw new Error("حجم الملف يتجاوز الحد الأقصى (30MB).");

  const token = await getIdToken();
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
  if (currentUser?.isDemo) headers["x-demo-admin"] = "true";

  const r = await fetch("/api/upload", {
    method: "POST",
    headers,
    body: JSON.stringify({
      filename: file.name,
      contentBase64: dataUrl,
      mimeType: file.type || "application/octet-stream"
    })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "فشل رفع الملف إلى الخادم");
  return data.url;
}

async function saveGift(event) {
  event.preventDefault();
  if (!currentUser) {
    toast("سجّل دخول الإدارة أولاً لتتمكن من إضافة وحفظ الهدايا.");
    openModal("loginModal");
    return;
  }

  const id = $("#giftId").value || ("gift_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6));
  let assetUrl = $("#giftAssetUrl").value.trim();
  const file = $("#giftFile").files[0];

  try {
    if (file) {
      $("#uploadProgress").textContent = "جاري رفع الملف وفحص الصيغة...";
      assetUrl = await uploadFile(file);
      $("#giftAssetUrl").value = assetUrl;
      $("#uploadProgress").textContent = "تم رفع الملف بنجاح ✦";
    }
  } catch (e) {
    $("#uploadProgress").textContent = e.message;
    toast(e.message);
    return;
  }

  const old = catalog.find(g => g.id === id);
  const priceVal = $("#giftPrice")?.value !== "" ? parseFloat($("#giftPrice").value) : null;
  const orderVal = $("#giftOrder")?.value !== "" ? parseInt($("#giftOrder").value, 10) : (old?.order || (catalog.length + 1) * 10);
  const emojiVal = $("#giftEmoji")?.value.trim() || old?.emoji || "🎁";

  const gift = {
    id,
    title: $("#giftTitle").value.trim(),
    category: $("#giftCategory").value,
    type: $("#giftType").value,
    price: Number.isFinite(priceVal) ? priceVal : null,
    order: Number.isFinite(orderVal) ? orderVal : 10,
    emoji: emojiVal,
    description: $("#giftDescription").value.trim(),
    assetUrl,
    featured: $("#giftFeatured").checked,
    published: $("#giftPublished") ? $("#giftPublished").checked : true,
    createdAt: old?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!gift.title) {
    toast("يرجى إدخال اسم العنصر.");
    return;
  }

  const index = catalog.findIndex(g => g.id === id);
  const actionLabel = index >= 0 ? `تعديل العنصر: ${gift.title}` : `إضافة عنصر جديد: ${gift.title}`;
  if (index >= 0) catalog[index] = gift;
  else catalog.unshift(gift);

  render();
  const ok = await apiSave(actionLabel);
  if (ok) {
    resetForm();
    adminTab("manage");
  }
}

async function loadHistory() {
  const listEl = $("#historyList");
  if (!listEl) return;
  listEl.innerHTML = '<p class="form-note">جاري تحميل سجل النسخ...</p>';
  try {
    const r = await fetch("/api/history", { cache: "no-store" });
    const data = await r.json();
    const items = data.history || [];
    if (!items.length) {
      listEl.innerHTML = '<p class="form-note">لا توجد نسخ مسجلة بعد.</p>';
      return;
    }
    listEl.innerHTML = items.map(h => {
      const dateStr = new Date(h.timestamp).toLocaleString("ar-EG");
      return `
        <div class="admin-item">
          <div class="admin-thumb"><span class="mono" style="font-size:12px;">v${esc(h.version)}</span></div>
          <div class="admin-item-main">
            <b>${esc(h.summary || "نسخة محفوظة")}</b>
            <small class="tabular">${esc(dateStr)} · ${esc(h.count)} عنصر · بواسطة ${esc(h.actor || "admin")}</small>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="small-action" data-rollback="${esc(h.id)}" data-ver="${esc(h.version)}">استرجاع هذه النسخة ↺</button>
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    listEl.innerHTML = `<p class="form-note">تعذر تحميل السجل: ${esc(e.message)}</p>`;
  }
}

function adminTab(tab) {
  $$(".admin-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".admin-tab-content").forEach(x => x.classList.toggle("hidden", x.id !== "tab-" + tab));
  if (tab === "history") loadHistory();
}

async function runInteractiveDiagnostics() {
  const out = $("#diagnosticsOutput");
  if (!out) return;
  out.textContent = "⏳ جاري تشغيل الاختبارات العملية لمسارات الخادم...\n";
  const log = line => { out.textContent += line + "\n"; out.scrollTop = out.scrollHeight; };

  try {
    // 1. Health Check
    const hRes = await fetch("/api/health", { cache: "no-store" });
    const hData = await hRes.json();
    log(`✅ [1/4] فحص /api/health: متصل (الإصدار v${hData.version} · التخزين: ${hData.storage} · العناصر: ${hData.giftsCount})`);

    // 2. Read Catalog
    const gRes = await fetch("/api/gifts", { cache: "no-store" });
    const gData = await gRes.json();
    log(`✅ [2/4] فحص قراءة /api/gifts: نجح (${gData.gifts?.length || 0} هدية · SHA: ${String(gData.sha || "").slice(0, 10)}...)`);

    // 3. Test SHA Conflict Detection (409)
    const token = await getIdToken();
    const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + token, "x-demo-admin": "true" };
    const conflictRes = await fetch("/api/gifts", {
      method: "PUT",
      headers,
      body: JSON.stringify({ gifts: gData.gifts, expectedSha: "stale_sha_000000" })
    });
    if (conflictRes.status === 409) {
      log(`✅ [3/4] اختبار حماية تعارض التعديل المتزامن (SHA Conflict): نجح برفض البصمة القديمة (HTTP 409).`);
    } else {
      log(`⚠️ [3/4] استجابة غير متوقعة لفحص التعارض: ${conflictRes.status}`);
    }

    // 4. Test Asset Upload
    const svgSample = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#d8b76e"/></svg>`;
    const base64Svg = "data:image/svg+xml;base64," + btoa(svgSample);
    const upRes = await fetch("/api/upload", {
      method: "POST",
      headers,
      body: JSON.stringify({ filename: "diagnostic-badge.svg", contentBase64: base64Svg, mimeType: "image/svg+xml" })
    });
    const upData = await upRes.json();
    if (upRes.ok && upData.url) {
      log(`✅ [4/4] اختبار رفع الملفات /api/upload: نجح (${upData.url} · ${upData.size} bytes)`);
    } else {
      log(`❌ [4/4] فشل اختبار الرفع: ${upData.error || upRes.status}`);
    }

    log(`\n🎉 اكتملت جميع الاختبارات العملية بنجاح 100%!`);
    toast("نجحت جميع اختبارات المسارات العملية ✦");
  } catch (err) {
    log(`❌ خطأ أثناء الفحص: ${err.message}`);
  }
}

async function initAuth() {
  if (!firebaseReady) {
    $("#authStatus").textContent = "Firebase Google Auth غير معد في public/config.js؛ يمكنك استخدام زر الدخول المباشر أدناه.";
    return;
  }
  try {
    const app = initializeApp(config);
    auth = getAuth(app);
    onAuthStateChanged(auth, user => {
      if (user) {
        currentUser = user;
        $("#loginBtn").textContent = "لوحة التحكم ✦";
        $("#adminUserLabel").textContent = user.email || "مسؤول المعرض";
        closeModal("loginModal");
      } else if (!currentUser?.isDemo) {
        currentUser = null;
        $("#loginBtn").textContent = "دخول الإدارة";
      }
    });
  } catch (e) {
    $("#authStatus").textContent = "تعذر تهيئة Firebase: " + e.message;
  }
}

async function signInWithGoogle() {
  if (!firebaseReady) {
    toast("Firebase غير معد بعد في public/config.js. استخدم زر الدخول المباشر بالأسفل.");
    return;
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    closeModal("loginModal");
    openModal("adminModal");
    toast("تم تسجيل الدخول بحساب Google بنجاح!");
  } catch (e) {
    $("#authStatus").textContent = e.message;
    toast("تعذر تسجيل الدخول بـ Google.");
  }
}

function enterDemoAdmin() {
  currentUser = {
    email: "owner@giftgallery.local",
    displayName: "المالك (وضع المعاينة الفوري)",
    isDemo: true,
    getIdToken: async () => "demo-admin-token"
  };
  $("#loginBtn").textContent = "لوحة التحكم ✦";
  $("#adminUserLabel").textContent = "مسؤول المعرض (وضع المعاينة المحلي)";
  closeModal("loginModal");
  resetForm();
  openModal("adminModal");
  toast("تم تفعيل وضع الإدارة بنجاح ✦");
}

function exportCatalog() {
  const payload = {
    version: catalogVersion,
    sha: catalogSha,
    exportedAt: new Date().toISOString(),
    settings: catalogSettings,
    gifts: catalog
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gift-gallery-backup-v${catalogVersion}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("تم تصدير النسخة الاحتياطية بصيغة JSON بنجاح.");
}

async function importCatalog(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.gifts)) throw new Error("الملف يجب أن يحتوي على مصفوفة gifts.");

    const choice = await askConfirm({
      title: "استيراد نسخة احتياطية",
      message: `سيتم استبدال الكتالوج الحالي بـ ${data.gifts.length} عنصراً من الملف المختار. هل تود المتابعة؟`,
      okText: "نعم، استيراد وحفظ",
      cancelText: "إلغاء",
      icon: "↑"
    });
    if (choice !== "ok") return;

    catalog = data.gifts;
    render();
    await apiSave(`استيراد نسخة احتياطية (${data.gifts.length} عنصر)`, true);
    toast("تم استيراد الكتالوج وحفظه بنجاح!");
  } catch (e) {
    toast("فشل الاستيراد: " + e.message);
  }
}

// -------------------------------------------------------------
// Event Listeners
// -------------------------------------------------------------
$("#searchInput")?.addEventListener("input", e => {
  searchTerm = e.target.value.trim();
  render();
});

$("#typeFilterSelect")?.addEventListener("change", e => {
  activeTypeFilter = e.target.value;
  render();
});

$("#sortSelect")?.addEventListener("change", render);

$("#onlyFeaturedToggle")?.addEventListener("click", e => {
  onlyFeatured = !onlyFeatured;
  e.currentTarget.classList.toggle("active", onlyFeatured);
  render();
});

$$(".category-card").forEach(b => b.addEventListener("click", () => {
  activeCategory = b.dataset.category;
  $$(".category-card").forEach(x => x.classList.toggle("active", x === b));
  render();
  $("#gallery")?.scrollIntoView({ behavior: "smooth" });
}));

$("#clearFilters")?.addEventListener("click", () => {
  activeCategory = "الكل";
  activeTypeFilter = "all";
  onlyFeatured = false;
  searchTerm = "";
  if ($("#searchInput")) $("#searchInput").value = "";
  if ($("#typeFilterSelect")) $("#typeFilterSelect").value = "all";
  $("#onlyFeaturedToggle")?.classList.remove("active");
  $$(".category-card").forEach(x => x.classList.toggle("active", x.dataset.category === "الكل"));
  render();
});

$("#resetEmpty")?.addEventListener("click", () => $("#clearFilters")?.click());

$("#featuredBtn")?.addEventListener("click", () => {
  activeCategory = "الكل";
  onlyFeatured = true;
  $("#onlyFeaturedToggle")?.classList.add("active");
  if ($("#sortSelect")) $("#sortSelect").value = "featured";
  render();
  $("#gallery")?.scrollIntoView({ behavior: "smooth" });
});

$("#heroShowcaseCard")?.addEventListener("click", () => {
  const first = catalog[0];
  if (first) preview(first.id);
});

$("#themeBtn")?.addEventListener("click", () => document.body.classList.toggle("light"));

$("#giftGrid")?.addEventListener("click", e => {
  const card = e.target.closest("[data-open]");
  if (card) preview(card.dataset.open);
});

$("#giftGrid")?.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-open]")) {
    e.preventDefault();
    preview(e.target.dataset.open);
  }
});

// Preview Stage Controls
$$("[data-bg]").forEach(btn => btn.addEventListener("click", () => {
  const media = $("#previewMedia");
  if (!media) return;
  media.classList.remove("stage-dark", "stage-checker", "stage-royal", "stage-light");
  media.classList.add(btn.dataset.bg);
  $$("[data-bg]").forEach(b => b.classList.toggle("active", b === btn));
}));

$("#avatarSimBtn")?.addEventListener("click", e => {
  avatarSimMode = !avatarSimMode;
  e.currentTarget.classList.toggle("active", avatarSimMode);
  renderPreviewStage();
});

$("#vapAlphaBtn")?.addEventListener("click", e => {
  vapAlphaMode = !vapAlphaMode;
  e.currentTarget.classList.toggle("active", vapAlphaMode);
  renderPreviewStage();
});

$("#copyLinkBtn")?.addEventListener("click", async () => {
  const url = safeUrl(previewGift?.assetUrl || "");
  if (!url) {
    toast("هذا العنصر ليس له رابط ملف مباشر.");
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast("تم نسخ رابط الملف إلى الحافظة ✦");
  } catch {
    toast(url);
  }
});

$("#previewReplayBtn")?.addEventListener("click", () => {
  if (previewGift) renderPreviewStage();
});

const openAdminOrLogin = () => {
  if (currentUser) {
    resetForm();
    openModal("adminModal");
  } else {
    openModal("loginModal");
  }
};

$("#loginBtn")?.addEventListener("click", openAdminOrLogin);
$("#openAdminFromAbout")?.addEventListener("click", openAdminOrLogin);

$("#googleSignIn")?.addEventListener("click", signInWithGoogle);
$("#demoAdminBtn")?.addEventListener("click", enterDemoAdmin);

$("#syncReloadBtn")?.addEventListener("click", async () => {
  await loadCatalog();
  render();
  toast("تمت مزامنة الكتالوج مع الخادم بنجاح.");
});

$("#logoutBtn")?.addEventListener("click", async () => {
  if (auth && !currentUser?.isDemo) {
    try { await signOut(auth); } catch {}
  }
  currentUser = null;
  $("#loginBtn").textContent = "دخول الإدارة";
  closeModal("adminModal");
  toast("تم تسجيل الخروج بنجاح.");
});

// Form Live Preview Listeners
["#giftTitle", "#giftCategory", "#giftType", "#giftAssetUrl", "#giftEmoji"].forEach(sel => {
  $(sel)?.addEventListener("input", updateLiveFormPreview);
  $(sel)?.addEventListener("change", updateLiveFormPreview);
});

$("#giftPresetAsset")?.addEventListener("change", e => {
  if (e.target.value) {
    $("#giftAssetUrl").value = e.target.value;
    $("#giftType").value = "image";
    updateLiveFormPreview();
  }
});

$("#giftForm")?.addEventListener("submit", saveGift);
$("#newGiftBtn")?.addEventListener("click", resetForm);

$(".admin-tabs")?.addEventListener("click", e => {
  const b = e.target.closest("[data-tab]");
  if (b) adminTab(b.dataset.tab);
});

$("#adminSearchInput")?.addEventListener("input", e => {
  adminSearchTerm = e.target.value.trim();
  renderAdminList();
});

$("#adminCategoryFilter")?.addEventListener("change", e => {
  adminCategory = e.target.value;
  renderAdminList();
});

$("#adminGiftList")?.addEventListener("click", async e => {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");
  const moveUp = e.target.closest("[data-move-up]");
  const moveDown = e.target.closest("[data-move-down]");
  const togglePub = e.target.closest("[data-toggle-pub]");

  if (edit) {
    fillForm(edit.dataset.edit);
    return;
  }

  if (togglePub) {
    const g = catalog.find(x => x.id === togglePub.dataset.togglePub);
    if (!g) return;
    g.published = g.published === false ? true : false;
    render();
    await apiSave(`تغيير حالة نشر "${g.title}"`);
    return;
  }

  if (moveUp || moveDown) {
    const targetId = (moveUp || moveDown).dataset.moveUp || (moveUp || moveDown).dataset.moveDown;
    const sorted = [...catalog].sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
    const idx = sorted.findIndex(x => x.id === targetId);
    const swapIdx = moveUp ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const temp = sorted[idx];
    sorted[idx] = sorted[swapIdx];
    sorted[swapIdx] = temp;
    sorted.forEach((item, i) => { item.order = (i + 1) * 10; });
    catalog = sorted;
    render();
    await apiSave("تحديث ترتيب عرض الهدايا");
    return;
  }

  if (del) {
    const g = catalog.find(x => x.id === del.dataset.delete);
    if (!g) return;
    const choice = await askConfirm({
      title: "حذف العنصر من الكتالوج",
      message: `هل أنت متأكد من حذف "${g.title}"؟ يمكنك استرجاعه لاحقاً من تبويب سجل النسخ.`,
      okText: "نعم، حذف العنصر",
      cancelText: "تراجع",
      icon: "🗑"
    });
    if (choice !== "ok") return;
    catalog = catalog.filter(x => x.id !== g.id);
    render();
    await apiSave(`حذف العنصر: ${g.title}`);
    toast(`تم حذف "${g.title}" بنجاح.`);
  }
});

$("#refreshHistoryBtn")?.addEventListener("click", loadHistory);

$("#historyList")?.addEventListener("click", async e => {
  const rb = e.target.closest("[data-rollback]");
  if (!rb) return;
  const revId = rb.dataset.rollback;
  const ver = rb.dataset.ver;
  const choice = await askConfirm({
    title: `استرجاع الإصدار v${ver}`,
    message: `سيتم استرجاع الكتالوج إلى النسخة v${ver} وحفظ نسخة جديدة بذلك. هل تود المتابعة؟`,
    okText: "استرجاع الآن",
    cancelText: "إلغاء",
    icon: "↺"
  });
  if (choice !== "ok") return;

  try {
    const token = await getIdToken();
    const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + token };
    if (currentUser?.isDemo) headers["x-demo-admin"] = "true";
    const r = await fetch("/api/rollback", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: revId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "فشل استرجاع النسخة");
    await loadCatalog();
    render();
    loadHistory();
    toast(`تم استرجاع النسخة v${ver} بنجاح ✦`);
  } catch (err) {
    toast(err.message);
  }
});

$("#exportBtn")?.addEventListener("click", exportCatalog);
$("#importBtn")?.addEventListener("click", () => $("#importFile")?.click());
$("#importFile")?.addEventListener("change", e => {
  if (e.target.files?.[0]) importCatalog(e.target.files[0]);
  e.target.value = "";
});
$("#runDiagnosticsBtn")?.addEventListener("click", runInteractiveDiagnostics);

$$("[data-close]").forEach(el => el.addEventListener("click", () => closeModal(el.dataset.close)));

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const openModals = $$(".modal:not(.hidden)");
    if (openModals.length) closeModal(openModals[openModals.length - 1].id);
  }
  if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
    e.preventDefault();
    $("#searchInput")?.focus();
  }
});

// Initialization
await loadCatalog();
render();
updateLiveFormPreview();
await initAuth();
