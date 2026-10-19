import React, { useState } from 'react';
import { Download, CheckCircle, Sparkles, RefreshCw, FileCheck, Layers, Film, ArrowDownRight, Eye } from 'lucide-react';
import type { SvgaResultData } from '../types/svga';
import type { DecodedSvgaMovie } from '../utils/svgaDecoder';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';
import { SvgaPlayer } from './SvgaPlayer';
import { formatBytes } from '../utils/fileSizeEstimator';

interface ResultCardProps {
  result: SvgaResultData;
  decodedMovie: DecodedSvgaMovie | null;
  lang: Language;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  decodedMovie,
  lang,
  onReset
}) => {
  const t = translations[lang];
  const [showFramesModal, setShowFramesModal] = useState<boolean>(false);

  const compressionRatio = result.originalSizeBytes > 0
    ? ((result.sizeBytes / result.originalSizeBytes) * 100).toFixed(0)
    : '100';

  const savedPercent = result.originalSizeBytes > 0 && result.sizeBytes < result.originalSizeBytes
    ? Math.round(((result.originalSizeBytes - result.sizeBytes) / result.originalSizeBytes) * 100)
    : null;

  return (
    <section className="bg-gradient-to-br from-[#111824] to-[#0b1019] border border-[#2b3a52] rounded-2xl p-4 sm:p-5 mb-6 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1c2738]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
              <span>{t.successTitle}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                جاهز للتحميل
              </span>
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141d2c] hover:bg-[#1e2a3c] text-gray-300 hover:text-white border border-[#27364d] text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحويل فيديو آخر</span>
        </button>
      </div>

      {/* Multi-Stage Compression Summary Banner */}
      <div className="bg-gradient-to-r from-[#0d1624] via-[#09101b] to-[#0d1624] border border-[#23334a] rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#dfbd61]" />
          <span className="text-gray-300 font-semibold">
            تم استخراج {result.frames} إطار ➔ ضغط كل صورة ➔ تجميع الـ SVGA 2.0
          </span>
        </div>

        {savedPercent !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>توفير {savedPercent}% من الحجم الأصلي</span>
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="bg-[#090e16] border border-[#222d40] p-3 rounded-xl">
          <small className="block text-gray-400 text-xs">{t.outputSize}</small>
          <strong className="block text-base sm:text-lg font-bold text-[#f4d77e] mt-1 font-mono">
            {formatBytes(result.sizeBytes)}
          </strong>
          <span className="text-[10px] text-gray-500 block mt-0.5 font-mono">
            {compressionRatio}% من الحجم الأصلي
          </span>
        </div>

        <div className="bg-[#090e16] border border-[#222d40] p-3 rounded-xl">
          <small className="block text-gray-400 text-xs">{t.dimensions}</small>
          <strong className="block text-base sm:text-lg font-bold text-white mt-1 font-mono">
            {result.width} × {result.height}
          </strong>
          <span className="text-[10px] text-gray-500 block mt-0.5">بكسل مطابق</span>
        </div>

        <div className="bg-[#090e16] border border-[#222d40] p-3 rounded-xl">
          <small className="block text-gray-400 text-xs">{t.fps}</small>
          <strong className="block text-base sm:text-lg font-bold text-white mt-1 font-mono">
            {result.fps} FPS
          </strong>
          <span className="text-[10px] text-gray-500 block mt-0.5">سلاسة الحركة</span>
        </div>

        <div className="bg-[#090e16] border border-[#222d40] p-3 rounded-xl">
          <small className="block text-gray-400 text-xs">{t.totalFrames}</small>
          <strong className="block text-base sm:text-lg font-bold text-[#f4d77e] mt-1 font-mono">
            {result.frames} فريم
          </strong>
          <span className="text-[10px] text-gray-500 block mt-0.5 font-mono">
            {result.durationSeconds.toFixed(1)} ثانية
          </span>
        </div>
      </div>

      {/* Interactive SVGA Player Preview */}
      {decodedMovie && (
        <div className="mb-5">
          <SvgaPlayer movie={decodedMovie} lang={lang} />
        </div>
      )}

      {/* Download Action */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={result.url}
          download={result.filename}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#d4aa4d] via-[#f0d377] to-[#d4aa4d] text-[#151108] font-extrabold text-sm sm:text-base shadow-xl shadow-[#d4aa4d]/25 hover:brightness-110 active:scale-98 transition-all"
        >
          <Download className="w-5 h-5" />
          <span>{t.downloadSvga}</span>
        </a>

        {result.framesList && result.framesList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFramesModal((v) => !v)}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#141e2e] hover:bg-[#1b283d] text-gray-300 hover:text-white border border-[#27374f] text-xs font-semibold transition-all"
          >
            <Film className="w-4 h-4 text-[#dfbd61]" />
            <span>{showFramesModal ? 'إخفاء شريط الإطارات' : `استعراض الـ ${result.framesList.length} صورة`}</span>
          </button>
        )}
      </div>

      {/* Embedded Frames Gallery if opened */}
      {showFramesModal && result.framesList && (
        <div className="mt-4 pt-4 border-t border-[#1d293d] animate-in fade-in duration-200">
          <span className="text-xs font-bold text-gray-300 block mb-2">
            جميع الإطارات الفردية المضغوطة المكونة لملف الـ SVGA:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#253247]">
            {result.framesList.map((f) => (
              <div key={f.index} className="flex-shrink-0 w-20 bg-[#070b12] border border-[#1f2b3e] rounded-lg p-1 text-center">
                <div className="w-full h-14 rounded bg-[repeating-conic-gradient(#141c28_0%_25%,#0b1019_0%_50%)] bg-[length:8px_8px] overflow-hidden flex items-center justify-center">
                  <img src={f.compressedUrl} alt={`Frame ${f.index + 1}`} className="max-w-full max-h-full object-contain" />
                </div>
                <span className="text-[9px] font-mono text-gray-400 block mt-1">#{f.index + 1}</span>
                <span className="text-[9px] font-mono text-emerald-400 block">
                  {f.isDuplicate ? '0 KB' : `${(f.compressedSizeBytes / 1024).toFixed(1)} KB`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
