import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HardDrive,
  Database,
  ShieldCheck,
  FileCode2,
  FolderTree,
} from 'lucide-react';
import {
  FORMAT_CAPABILITIES,
  formatBytes,
  type GiftFormat,
  type StorageStatusInfo,
} from '../utils/catalogLogic';

interface FormatCenterSectionProps {
  storageStatus: StorageStatusInfo | null;
  onSelectFormatFilter: (format: GiftFormat) => void;
}

export const FormatCenterSection: React.FC<FormatCenterSectionProps> = ({
  storageStatus,
  onSelectFormatFilter,
}) => {
  const formats = Object.values(FORMAT_CAPABILITIES);
  const usedBytes = storageStatus?.currentUsage.totalBytes || 0;
  const limitBytes = storageStatus?.freeTierLimits.storageBytes || 10 * 1024 * 1024 * 1024;
  const usagePercent = Math.min(100, Math.max(0.1, (usedBytes / limitBytes) * 100));

  return (
    <section
      id="formats-center"
      className="py-16 border-t border-white/10"
      aria-labelledby="formats-center-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <p className="text-xs font-semibold text-[#D4AF37] mb-2">
            01. مركز ملفات الهدايا متعدد الصيغ والشفافية
          </p>
          <h2
            id="formats-center-heading"
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
          >
            دعم كامل لصيغ الهدايا الصوتية الأصلية بدون ضغط أو تحويل قسري
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            يحتفظ النظام بملفات الهدايا الثنائية والفيديوهات بجودتها الأصلية (Bit-for-Bit) مع توضيح دقيق لدعم القناة الشفافة (Alpha Channel) والمؤثرات الصوتية لكل صيغة قبل التنزيل أو الربط بالتطبيق.
          </p>
        </div>

        {/* Formats Capability Matrix Table */}
        <div className="rounded-2xl bg-[#120E1E] border border-white/10 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">الصيغة</th>
                  <th className="py-3.5 px-4 font-semibold">الامتداد</th>
                  <th className="py-3.5 px-4 font-semibold">المشغل التفاعلي</th>
                  <th className="py-3.5 px-4 font-semibold">الرسوم المتحركة</th>
                  <th className="py-3.5 px-4 font-semibold">الشفافية Alpha</th>
                  <th className="py-3.5 px-4 font-semibold">الصوت المدمج</th>
                  <th className="py-3.5 px-4 font-semibold">الاستخدام في التطبيقات الصوتية</th>
                  <th className="py-3.5 px-4 font-semibold text-left">تصفية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {formats.map((cap) => (
                  <tr
                    key={cap.format}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {cap.format}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {cap.extensions.join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#D4AF37] uppercase">
                      {cap.playerType}
                    </td>
                    <td className="py-3 px-4">
                      {cap.supportsAnimation ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>متحرك</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>ثابت</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cap.supportsAlpha ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>شفاف</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>خلفية</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {cap.supportsAudio ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مدعوم</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>صامت</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300 max-w-xs">
                      {cap.descriptionAr}
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectFormatFilter(cap.format);
                          document.getElementById('gallery-grid')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 hover:bg-[#D4AF37] text-slate-200 hover:text-[#08060E] transition-colors whitespace-nowrap shrink-0"
                      >
                        عرض {cap.format}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Storage Architecture & Cloudflare R2 Quota Transparency */}
        <div
          id="storage-architecture"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* R2 Storage & Quota Panel */}
          <div className="lg:col-span-7 rounded-2xl bg-[#120E1E] border border-white/10 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold text-[#D4AF37] mb-1">
                    02. بنية التخزين الدائم بدون قاعدة بيانات
                  </p>
                  <h3 className="text-xl font-bold text-white">
                    مخزن الكائنات المركزي (Cloudflare R2 + JSON Catalog)
                  </h3>
                </div>
                <HardDrive className="w-6 h-6 text-[#D4AF37] shrink-0" />
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                يعمل الموقع بنظام فصل الكود عن ملفات الهدايا الدائمة. تُحفظ الملفات الثنائية في التخزين المركزي وتُفهرس تلقائيًا في ملف <code className="text-[#FDE68A] font-mono">catalog/gifts.json</code> بقفل تزامن ذري (Mutex Lock) يمنع تضارب التعديلات، وتنعكس التحديثات فورًا لجميع المستخدمين عبر قناة SSE المباشرة.
              </p>

              {/* Storage Quota Metrics */}
              <div className="border-t border-b border-white/10 py-4 mb-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">الاستهلاك الفعلي للمكتبة مقابل الحصة المجانية الشهرية (10 GB)</span>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {formatBytes(usedBytes)} / 10 GB
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-[#D4AF37] to-[#9333EA] rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(2, usagePercent)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">عمليات الكتابة (Class A)</span>
                    <span className="font-mono tabular-nums text-slate-200 font-semibold">
                      1,000,000 / شهر مجانًا
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">عمليات القراءة (Class B)</span>
                    <span className="font-mono tabular-nums text-slate-200 font-semibold">
                      10,000,000 / شهر مجانًا
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">حد الملف الواحد</span>
                    <span className="font-mono tabular-nums text-slate-200 font-semibold">
                      {storageStatus?.maxUploadFileSizeMb || 100} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>المفاتيح السرية معزولة بالكامل على الخادم (Zero Client Secrets)</span>
              </span>
              <span className="font-mono text-slate-300">
                الوضع الحالي: {storageStatus?.r2Configured ? 'Cloudflare R2 Cloud' : 'Persistent R2 Mirror'}
              </span>
            </div>
          </div>

          {/* Logical Directory Structure Panel */}
          <div className="lg:col-span-5 rounded-2xl bg-[#120E1E] border border-white/10 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-white">هيكل التخزين والفهرسة</h3>
                <FolderTree className="w-5 h-5 text-[#D4AF37]" />
              </div>

              <div className="font-mono text-xs bg-[#08060E] border border-white/10 rounded-xl p-4 space-y-2.5 text-slate-300 mb-5" dir="ltr">
                <div className="text-[#D4AF37] font-semibold">r2-bucket://gift-gallery/</div>
                <div className="pl-4 flex items-center justify-between">
                  <span>├── gifts/originals/</span>
                  <span className="text-slate-500">SVGA, VAP, MP4, Lottie...</span>
                </div>
                <div className="pl-4 flex items-center justify-between">
                  <span>├── gifts/thumbnails/</span>
                  <span className="text-slate-500">WebP, PNG, SVG Previews</span>
                </div>
                <div className="pl-4 flex items-center justify-between">
                  <span>├── gifts/previews/</span>
                  <span className="text-slate-500">Lightweight Clips</span>
                </div>
                <div className="pl-4 flex items-center justify-between text-emerald-400">
                  <span>└── catalog/gifts.json</span>
                  <span>Atomic Index (v{storageStatus ? 'Live' : '1'})</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                لا يتم تحويل الهدايا إلى نصوص برمجية داخل مجلد <code className="font-mono text-slate-200">src/</code>، ولا يحتاج الموقع إلى إعادة البناء (Rebuild) عند رفع هدية جديدة.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>بدون SQL / بدون Firestore</span>
              </span>
              <a
                href="/storage/catalog/gifts.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D4AF37] hover:underline flex items-center gap-1 font-mono"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>فحص gifts.json</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
