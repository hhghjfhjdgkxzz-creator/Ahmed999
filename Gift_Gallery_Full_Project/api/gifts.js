const { readJson, writeFile } = require("./_github");
const { requireAdmin } = require("./_auth");

const dataPath = () => process.env.GITHUB_DATA_PATH || "data/gifts.json";
const seed = {
  version: 1,
  updatedAt: new Date().toISOString(),
  gifts: [
    { id: "demo-crown", title: "التاج الإمبراطوري الذهبي", category: "ملكي", description: "تاج ملكي مرصع بالياقوت الأحمر والألماس مع هالة ضوئية ذهبية متحركة.", type: "image", assetUrl: "/assets/royal-crown.svg", featured: true, published: true, order: 1, price: 49.99, emoji: "👑", createdAt: new Date().toISOString() },
    { id: "demo-rose", title: "وردة الذهب والياقوت", category: "هدايا", description: "وردة مخملية حمراء بساق من الذهب الخالص داخل قبة بلورية فاخرة.", type: "image", assetUrl: "/assets/golden-rose.svg", featured: true, published: true, order: 2, price: 19.99, emoji: "🌹", createdAt: new Date().toISOString() },
    { id: "demo-frame-gold", title: "الإطار الفيكتوري الإمبراطوري", category: "إطارات", description: "إطار دائري مزخرف بنقوش الذهب الملكي وتاج علوي يمنح الحساب حضوراً متفرداً.", type: "image", assetUrl: "/assets/imperial-frame.svg", featured: true, published: true, order: 3, price: 14.99, emoji: "▣", createdAt: new Date().toISOString() },
    { id: "demo-entry-royal", title: "دخولية البساط الملكي", category: "دخوليات", description: "قوس نصر ذهبي مع بساط أحمر ملكي ونجمة متوهجة للإعلان عن حضور كبار الشخصيات.", type: "image", assetUrl: "/assets/royal-procession.svg", featured: true, published: true, order: 4, price: 59.99, emoji: "✦", createdAt: new Date().toISOString() }
  ]
};

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { data, sha } = await readJson(dataPath());
      const payload = data || seed;
      return send(res, 200, { ...payload, sha: sha || payload.sha || null });
    }
    if (req.method !== "PUT") {
      res.setHeader("Allow", "GET, PUT");
      return send(res, 405, { error: "Method not allowed" });
    }
    await requireAdmin(req);
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    if (!body || !Array.isArray(body.gifts)) return send(res, 400, { error: "Expected an object with a gifts array." });
    if (body.gifts.length > 2000) return send(res, 413, { error: "Maximum 2000 gifts per catalog." });

    const seen = new Set();
    for (const gift of body.gifts) {
      if (!gift || typeof gift.id !== "string" || !gift.id.trim() || typeof gift.title !== "string" || !gift.title.trim()) {
        return send(res, 400, { error: "Every gift must have an id and a title." });
      }
      if (seen.has(gift.id)) return send(res, 400, { error: `Duplicate gift id: ${gift.id}` });
      seen.add(gift.id);
    }

    const path = dataPath();
    const { data: currentData, sha: remoteSha } = await readJson(path);
    const forceWrite = Boolean(body.force);

    if (!forceWrite && body.expectedSha && remoteSha && body.expectedSha !== remoteSha) {
      return send(res, 409, {
        error: "تعارض في التحديث المتزامن (SHA Conflict): تم تعديل الكتالوج من مسؤول آخر.",
        code: "SHA_CONFLICT",
        currentSha: remoteSha,
        currentVersion: (currentData?.version || 1)
      });
    }

    const nextVersion = (Number(currentData?.version) || 1) + 1;
    const data = { version: nextVersion, updatedAt: new Date().toISOString(), gifts: body.gifts };
    const result = await writeFile(path, JSON.stringify(data, null, 2) + "\n", body.summary || `Update Gift Gallery catalog v${nextVersion}`, remoteSha, forceWrite);
    const newSha = result?.content?.sha || remoteSha;
    return send(res, 200, { ok: true, version: nextVersion, sha: newSha, updatedAt: data.updatedAt, count: data.gifts.length });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || "Unexpected server error", ...(e.status === 409 ? { code: "SHA_CONFLICT" } : {}) });
  }
};
