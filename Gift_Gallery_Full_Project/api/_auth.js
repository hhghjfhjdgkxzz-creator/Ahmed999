const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const err = new Error("Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON.");
    err.status = 503;
    throw err;
  }
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch {
    const err = new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid one-line JSON.");
    err.status = 503;
    throw err;
  }
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function requireAdmin(req) {
  const token = bearer(req);
  if (!token) {
    const err = new Error("Sign in with an authorized admin Google account first.");
    err.status = 401;
    throw err;
  }
  const decoded = await getAdminApp().auth().verifyIdToken(token);
  if (!decoded.email || decoded.email_verified !== true) {
    const err = new Error("A verified Google email is required.");
    err.status = 403;
    throw err;
  }
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(decoded.email.toLowerCase())) {
    const err = new Error("This Google account is not listed in ADMIN_EMAILS.");
    err.status = 403;
    throw err;
  }
  return decoded;
}

module.exports = { requireAdmin };
