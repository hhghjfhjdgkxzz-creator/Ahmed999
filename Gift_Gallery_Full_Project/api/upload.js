const { writeFile, readJson, config } = require("./_github");
const { requireAdmin } = require("./_auth");

function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

function safeName(name) {
  const clean = String(name || "upload.bin")
    .normalize("NFKD")
    .replace(/[^\w.\-ء-ي]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(-120);
  return clean || "upload.bin";
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(res, 405, { error: "Method not allowed" });
    }
    await requireAdmin(req);
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    const { filename, contentBase64, mimeType } = body || {};
    if (!filename || !contentBase64) return send(res, 400, { error: "filename and contentBase64 are required." });

    const ext = String(filename).split(".").pop().toLowerCase();
    const allowedExts = ["mp4", "webm", "mov", "svga", "vap", "svg", "gif", "webp", "png", "jpg", "jpeg", "json"];
    if (!allowedExts.includes(ext)) return send(res, 415, { error: `Unsupported file extension .${ext}` });

    const maxMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 4));
    const raw = String(contentBase64).replace(/^data:[^,]*;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    const size = buffer.length;
    if (!Number.isFinite(size) || size <= 0) return send(res, 400, { error: "Invalid file data." });
    if (size > maxMb * 1024 * 1024) return send(res, 413, { error: `File exceeds ${maxMb} MB limit.` });

    const allowed = /^(image\/(png|jpeg|webp|gif|svg\+xml)|video\/(mp4|webm|quicktime)|application\/(octet-stream|json|x-svga)|audio\/(mpeg|wav|ogg))$/i;
    if (mimeType && !allowed.test(mimeType)) return send(res, 415, { error: "Unsupported file type." });

    const dir = (process.env.GITHUB_ASSETS_PATH || "public/assets").replace(/^\/+|\/+$/g, "");
    const name = `${Date.now()}-${safeName(filename)}`;
    const path = `${dir}/${name}`;
    const { sha } = await readJson(path);
    const c = config();
    const url = `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${encodeURIComponent(c.branch)}/${path.split("/").map(encodeURIComponent).join("/")}`;

    await writeFile(path, buffer, `Upload asset ${name}`, sha, true);
    return send(res, 200, { ok: true, filename: name, url, size, mimeType: mimeType || "application/octet-stream" });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || "Unexpected server error" });
  }
};
