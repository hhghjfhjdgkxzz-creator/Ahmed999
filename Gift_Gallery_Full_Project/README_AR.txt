Gift Gallery — مشروع كامل كبداية قابلة للنشر
===========================================

المشروع يحتوي على:
- واجهة عربية RTL متجاوبة.
- بحث وتصنيفات وترتيب ومعاينة.
- لوحة إدارة لإضافة وتعديل وحذف العناصر.
- تسجيل دخول Google عبر Firebase Authentication.
- تحقق من المسؤولين على الخادم باستخدام Firebase Admin.
- حفظ كتالوج العناصر والملفات المرفوعة في مستودع GitHub من خلال GitHub Contents API.
- تصدير واستيراد JSON.
- نشر مناسب لـ Vercel.
- لا توجد قاعدة بيانات تقليدية؛ GitHub هو مخزن الملفات والكتالوج.

مهم جدًا قبل التشغيل:
هذا مشروع كود جاهز للتوصيل وليس حسابات جاهزة. لازم تعمل إعدادات Firebase وGitHub وVercel الخاصة بك. لا تضع GitHub Token أو Firebase Service Account في ملفات الواجهة الأمامية.

1) أنشئ مستودع GitHub للمشروع
- أنشئ Repo جديد مثل gift-gallery.
- ارفع كل ملفات هذا المجلد إلى المستودع.
- أنشئ مستودعًا آخر لبيانات الموقع والملفات مثل gift-gallery-data (يمكنك استخدام نفس المستودع، لكن الأفضل فصل الكود عن ملفات المستخدمين).
- في مستودع البيانات، أنشئ مجلد data وملف gifts.json بداخله، ومجلد public/assets.
- محتوى gifts.json المبدئي:
  {
    "version": 1,
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "gifts": []
  }

2) إعداد GitHub Token
- من GitHub Settings > Developer settings > Fine-grained personal access tokens أنشئ Token.
- امنحه وصولًا إلى مستودع البيانات فقط.
- امنحه صلاحية Contents: Read and write.
- انسخ الرمز مرة واحدة، ولا تشاركه مع أحد.
- أضف في Vercel Environment Variables:
  GITHUB_TOKEN
  GITHUB_OWNER
  GITHUB_REPO
  GITHUB_BRANCH = main
  GITHUB_DATA_PATH = data/gifts.json
  GITHUB_ASSETS_PATH = public/assets
  ADMIN_EMAILS = بريدك الموثق في Google
  MAX_UPLOAD_MB = 4

3) إعداد Firebase Google Login
- افتح Firebase Console وأنشئ مشروعًا.
- من Authentication > Sign-in method فعّل Google.
- من Project settings > Your apps أضف Web App.
- انسخ apiKey وauthDomain وprojectId وappId إلى public/config.js.
- من Authentication > Settings > Authorized domains أضف دومين Vercel الخاص بك.
- من Project settings > Service accounts أنشئ مفتاحًا خاصًا لحساب الخدمة.
- ضع محتوى JSON كاملًا في متغير Vercel اسمه FIREBASE_SERVICE_ACCOUNT_JSON كسطر JSON واحد. لا ترفعه إلى GitHub ولا تضعه في public/config.js.
- أضف بريد المسؤول في ADMIN_EMAILS. يمكن إضافة أكثر من بريد بفصلها بفواصل.

4) النشر على Vercel
- استورد مستودع المشروع في Vercel.
- أضف كل متغيرات البيئة المذكورة في Project Settings > Environment Variables.
- انشر المشروع.
- بعد تعديل المتغيرات، أعد Deploy.
- اختبر الصفحة الرئيسية، ثم دخول الإدارة، ثم إضافة عنصر، ثم افتح GitHub وتأكد أن data/gifts.json والملف الجديد اتحدّثوا.

5) التشغيل المحلي
- ثبّت Node.js 20 أو أحدث.
- من داخل مجلد المشروع:
  npm install
  npx vercel dev
- أضف المتغيرات إلى إعدادات Vercel المحلية أو ملف .env محلي (لا ترفع .env أبدًا).
- افتح العنوان المحلي الذي يظهر في الطرفية.

حدود مهمة:
- الرفع المباشر من اللوحة محدود افتراضيًا بـ 4MB لتفادي حد جسم الطلب في Vercel. يمكن تغيير MAX_UPLOAD_MB، لكن GitHub Contents API ليس تخزين CDN للفيديوهات الضخمة، وقد تواجه حدودًا أو بطئًا مع الملفات الكبيرة.
- رفع ملف جديد يحفظه في GitHub. حذف العنصر من الكتالوج لا يحذف الملف القديم تلقائيًا من المستودع؛ راجع الملفات القديمة يدويًا لتجنب حذف شيء مستخدم.
- SVGA وVAP لا يتم تشغيلهما مباشرة داخل المعرض في هذه النسخة؛ يظهر توضيح أن الملف يحتاج إلى مشغل متخصص. يلزم دمج player متوافق ومرخص مع صيغك المستهدفة.
- إذا لم يتم إعداد GitHub، سيعمل المعرض ببيانات تجريبية وحفظ محلي داخل نفس المتصفح فقط.
- هذه النسخة تستخدم GitHub كـ CMS بسيط بدون قاعدة بيانات. تزامن التعديلات المتزامنة من أكثر من مسؤول قد يحتاج معالجة تعارضات إضافية.
- بيانات Firebase Web App ليست سرًا، لكن GitHub Token وFirebase Service Account أسرار لا تضعها في ملفات الواجهة.
- اختبر أمان إعدادات المسؤول قبل نشر الموقع على نطاق عام.

الملفات الرئيسية:
index.html       هيكل الواجهة
style.css        التصميم
app.js           تفاعل الموقع وتسجيل الدخول
public/config.js بيانات Firebase العامة فقط
api/gifts.js     قراءة/حفظ كتالوج GitHub
api/upload.js    رفع الملفات إلى GitHub
api/_auth.js     تحقق صلاحية المسؤول
api/_github.js   طبقة التعامل مع GitHub API
vercel.json      إعداد النشر
.env.example     أسماء متغيرات البيئة المطلوبة
