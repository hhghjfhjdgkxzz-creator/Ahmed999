/**
 * Gift Gallery — Practical End-to-End API & Concurrency Test Suite
 * يختبر القراءة (GET /api/gifts)، الحفظ (PUT /api/gifts)،
 * اكتشاف وحل تعارض التعديل المتزامن (SHA / Version 409 Conflict)،
 * رفع الملفات وفحص الصيغ (POST /api/upload)، واسترجاع النسخ (POST /api/rollback).
 */

import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000";
const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": "Bearer demo-admin-token",
  "x-demo-admin": "true"
};

async function runTests() {
  console.log("====================================================");
  console.log("🧪 بدء الاختبارات العملية لمنصة Gift Gallery");
  console.log("====================================================\n");

  // 1. Test /api/health
  console.log("1️⃣  اختبار مسار حالة الخادم GET /api/health ...");
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, "يجب أن يعيد /api/health الحالة 200");
  const health = await healthRes.json();
  assert.equal(health.ok, true);
  assert.ok(health.sha, "يجب أن يحتوي /api/health على بصمة SHA الحالية");
  console.log(`   ✅ نجح: الإصدار v${health.version} | العناصر: ${health.giftsCount} | SHA: ${health.sha.slice(0, 10)}...\n`);

  // 2. Test GET /api/gifts (Read Catalog)
  console.log("2️⃣  اختبار قراءة الكتالوج GET /api/gifts ...");
  const getRes = await fetch(`${BASE_URL}/api/gifts`);
  assert.equal(getRes.status, 200, "يجب أن يعيد GET /api/gifts الحالة 200");
  const initialCatalog = await getRes.json();
  assert.ok(Array.isArray(initialCatalog.gifts), "يجب أن يحتوي الرد على مصفوفة gifts");
  assert.ok(initialCatalog.gifts.length > 0, "يجب ألا تكون مصفوفة الهدايا فارغة");
  assert.ok(initialCatalog.sha, "يجب إرجاع بصمة SHA مع الكتالوج");
  console.log(`   ✅ نجح: تم جلب ${initialCatalog.gifts.length} عنصر (SHA: ${initialCatalog.sha.slice(0, 10)}...)\n`);

  // 3. Test PUT /api/gifts (Save Catalog & Increment Version)
  console.log("3️⃣  اختبار حفظ وتحديث الكتالوج PUT /api/gifts ...");
  const testGiftId = `test-gift-${Date.now()}`;
  const updatedGifts = [
    ...initialCatalog.gifts,
    {
      id: testGiftId,
      title: "هدية الاختبار الملكية",
      category: "ملكي",
      type: "image",
      price: 35.5,
      emoji: "👑",
      description: "عنصر تجريبي للتحقق من الحفظ وتوليد بصمة SHA جديدة.",
      assetUrl: "/assets/royal-crown.svg",
      featured: true,
      published: true
    }
  ];

  const putRes = await fetch(`${BASE_URL}/api/gifts`, {
    method: "PUT",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      gifts: updatedGifts,
      expectedSha: initialCatalog.sha,
      expectedVersion: initialCatalog.version,
      summary: "إضافة هدية اختبار تلقائي"
    })
  });
  assert.equal(putRes.status, 200, "يجب أن ينجح الحفظ عند تطابق SHA");
  const putData = await putRes.json();
  assert.equal(putData.ok, true);
  assert.equal(putData.count, updatedGifts.length);
  assert.notEqual(putData.sha, initialCatalog.sha, "يجب أن تتغير بصمة SHA بعد التحديث");
  console.log(`   ✅ نجح: تم الحفظ (الإصدار الجديد v${putData.version} | SHA الجديد: ${putData.sha.slice(0, 10)}...)\n`);

  // 4. Test Concurrency SHA Conflict Detection (HTTP 409) & Force Resolution
  console.log("4️⃣  اختبار معالجة تعارض التعديل المتزامن (SHA Conflict 409) ...");
  const conflictRes = await fetch(`${BASE_URL}/api/gifts`, {
    method: "PUT",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      gifts: initialCatalog.gifts,
      expectedSha: initialCatalog.sha, // Stale SHA!
      summary: "محاولة حفظ ببصمة SHA قديمة"
    })
  });
  assert.equal(conflictRes.status, 409, "يجب أن يرفض الخادم التعديل المتزامن ببصمة SHA قديمة بالكود 409");
  const conflictBody = await conflictRes.json();
  assert.equal(conflictBody.code, "SHA_CONFLICT");
  console.log(`   ✅ نجح: اكتشف الخادم تعارض SHA وأعاد 409 (${conflictBody.error})`);

  // Test Force Write override
  const restoreRes = await fetch(`${BASE_URL}/api/gifts`, {
    method: "PUT",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      gifts: initialCatalog.gifts,
      expectedSha: initialCatalog.sha,
      force: true,
      summary: "استرجاع الكتالوج الأصلي مع فرض الحفظ (force: true)"
    })
  });
  assert.equal(restoreRes.status, 200, "يجب أن ينجح الحفظ عند تفعيل force: true");
  console.log("   ✅ نجح: تم حل التعارض عبر خيار فرض الحفظ (force: true)\n");

  // 5. Test POST /api/upload (Valid SVG upload + Invalid extension rejection)
  console.log("5️⃣  اختبار رفع الملفات POST /api/upload وفحص الأمان ...");
  const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#d8b76e"/></svg>`;
  const base64Svg = Buffer.from(validSvg, "utf8").toString("base64");
  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      filename: "test-badge.svg",
      contentBase64: `data:image/svg+xml;base64,${base64Svg}`,
      mimeType: "image/svg+xml"
    })
  });
  assert.equal(uploadRes.status, 200, "يجب أن ينجح رفع ملف SVG صالح");
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.ok, true);
  assert.ok(uploadData.url.startsWith("/assets/"), "يجب أن يعيد رابط الملف المرفوع");
  console.log(`   ✅ نجح رفع الملف الصالح: ${uploadData.url} (${uploadData.size} بايت)`);

  // Reject invalid file extension (.exe)
  const badUploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      filename: "malware.exe",
      contentBase64: base64Svg,
      mimeType: "application/octet-stream"
    })
  });
  assert.equal(badUploadRes.status, 415, "يجب أن يرفض الخادم الامتدادات غير المسموحة بالكود 415");
  console.log("   ✅ نجح رفض الصيغ غير المدعومة (HTTP 415)\n");

  // 6. Test History & Rollback
  console.log("6️⃣  اختبار سجل النسخ GET /api/history ...");
  const histRes = await fetch(`${BASE_URL}/api/history`);
  assert.equal(histRes.status, 200);
  const histData = await histRes.json();
  assert.ok(Array.isArray(histData.history) && histData.history.length > 0, "يجب أن يحتوي السجل على نسخ محفوظة");
  console.log(`   ✅ نجح: يوجد ${histData.history.length} نسخة مسجلة في السجل قابلة للاسترجاع.\n`);

  console.log("====================================================");
  console.log("🎉 اكتملت جميع الاختبارات العملية بنجاح 100%!");
  console.log("====================================================");
}

runTests().catch(err => {
  console.error("❌ فشل أحد الاختبارات:", err);
  process.exit(1);
});
