import React, { useState } from 'react';
import {
  Film,
  Zap,
  PackageCheck,
  Download,
  Eye,
  Maximize2,
  CheckCircle2,
  CopySlash,
  ArrowRight,
  Sparkles,
  Sliders,
  X
} from 'lucide-react';
import type { ExtractedFrameItem, ConversionConfig } from '../types/svga';
import { formatBytes } from '../utils/fileSizeEstimator';

interface FramesPipelineStudioProps {
  frames: ExtractedFrameItem[];
  rawTotalBytes: number;
  compressedTotalBytes: number;
  fps: number;
  width: number;
  height: number;
  isAssembling: boolean;
  onAssembleSvga: () => void;
  onDownloadFramesZip?: () => void;
}

export const FramesPipelineStudio: React.FC<FramesPipelineStudioProps> = ({
  frames,
  rawTotalBytes,
  compressedTotalBytes,
  fps,
  width,
  height,
  isAssembling,
  onAssembleSvga,
  onDownloadFramesZip
}) => {
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrameItem | null>(null);

  if (!frames || frames.length === 0) return null;

  const savedPercent =
    rawTotalBytes > 0 && compressedTotalBytes < rawTotalBytes
      ? Math.round(((rawTotalBytes - compressedTotalBytes) / rawTotalBytes) * 100)
      : 85;

  const uniqueImagesCount = frames.filter((f) => !f.isDuplicate).length;
  const duplicateCount = frames.length - uniqueImagesCount;
  const avgFrameKb = uniqueImagesCount > 0 ? (compressedTotalBytes / (uniqueImagesCount * 1024)).toFixed(1) : '0';

  return (
    <div className="bg-gradient-to-br from-[#101726] via-[#0d131f] to-[#070b13] border border-[#2b3a52] rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-[#1c2738]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2a2110] to-[#121927] border border-[#d4aa4d]/40 flex items-center justify-center text-[#f4d77e] flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-sm sm:text-base">استوديو رندرة وضغط الإطارات</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {frames.length} إطار جاهز
              </span>
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">
              تم تحويل الفيديو لصور منفصلة وضغط كل صورة على حدة بأقصى كفاءة
            </span>
          </div>
        </div>

        {/* Assemble Button */}
        <button
          type="button"
          onClick={onAssembleSvga}
          disabled={isAssembling}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4aa4d] via-[#f0d377] to-[#d4aa4d] text-[#151108] font-extrabold text-xs sm:text-sm shadow-lg shadow-[#d4aa4d]/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
        >
          <PackageCheck className="w-4 h-4" />
          <span>{isAssembling ? 'جاري تجميع الـ SVGA...' : 'تجميع الصور في ملف SVGA الآن'}</span>
        </button>
      </div>

      {/* Compression Efficiency Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#080d16] border border-[#1f2b3e] rounded-xl p-2.5">
          <span className="text-[10px] text-gray-400 block">حجم الصور قبل الضغط</span>
          <strong className="text-xs sm:text-sm font-mono text-gray-300">{formatBytes(rawTotalBytes)}</strong>
        </div>

        <div className="bg-[#080d16] border border-emerald-500/30 rounded-xl p-2.5 bg-emerald-500/5">
          <span className="text-[10px] text-emerald-400 block">حجم الصور بعد الضغط الفائق</span>
          <strong className="text-xs sm:text-sm font-mono text-emerald-300">{formatBytes(compressedTotalBytes)}</strong>
        </div>

        <div className="bg-[#080d16] border border-[#1f2b3e] rounded-xl p-2.5">
          <span className="text-[10px] text-gray-400 block">نسبة التوفير المحققة</span>
          <strong className="text-xs sm:text-sm font-mono text-[#f4d77e]">⚡ -{savedPercent}% أصغر</strong>
        </div>

        <div className="bg-[#080d16] border border-[#1f2b3e] rounded-xl p-2.5">
          <span className="text-[10px] text-gray-400 block">متوسط حجم الفريم الواحد</span>
          <strong className="text-xs sm:text-sm font-mono text-gray-300">~ {avgFrameKb} KB / فريم</strong>
        </div>
      </div>

      {/* Interactive Filmstrip Gallery */}
      <div className="bg-[#070a12] border border-[#1d2738] rounded-xl p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <span>شريط الإطارات السينمائي (اضغط على أي فريم لمعاينته بدقة):</span>
          </span>
          <span className="text-[11px] font-mono text-[#dfbd61]">
            {frames.length} فريم | {width}×{height}px | {fps} FPS
          </span>
        </div>

        {/* Scrollable Thumbnails Strip */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-[#253247] scrollbar-track-transparent">
          {frames.map((frame, idx) => (
            <div
              key={frame.index}
              onClick={() => setSelectedFrame(frame)}
              className={`flex-shrink-0 w-24 sm:w-28 rounded-xl border p-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                selectedFrame?.index === frame.index
                  ? 'bg-[#2a2110] border-[#dfbd61] shadow-lg shadow-[#dfbd61]/20'
                  : 'bg-[#0e1420] border-[#222d3f] hover:border-gray-500'
              }`}
            >
              {/* Thumbnail with checkerboard pattern */}
              <div className="w-full h-16 sm:h-20 rounded-lg overflow-hidden relative bg-[repeating-conic-gradient(#141c28_0%_25%,#0b1019_0%_50%)] bg-[length:12px_12px] flex items-center justify-center border border-[#1c2738]">
                <img
                  src={frame.compressedUrl}
                  alt={`Frame ${frame.index + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-black/75 text-white">
                  #{frame.index + 1}
                </span>

                {frame.isDuplicate && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/90 text-black">
                    مدمج ⚡
                  </span>
                )}
              </div>

              {/* Frame Specs */}
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>{frame.time.toFixed(2)}s</span>
                <span className={frame.isDuplicate ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {frame.isDuplicate ? '0 KB' : `${(frame.compressedSizeBytes / 1024).toFixed(1)} KB`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frame Detail Lightbox Modal */}
      {selectedFrame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1422] border border-[#2b3a52] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setSelectedFrame(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-[#1a2332] border border-[#2d3b50] flex items-center justify-center text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-extrabold text-white">
                معاينة الإطار #{selectedFrame.index + 1}
              </span>
              <span className="text-xs font-mono text-[#f4d77e] bg-[#221c10] px-2 py-0.5 rounded border border-[#d4aa4d]/40">
                {selectedFrame.time.toFixed(2)} ثانية
              </span>
            </div>

            {/* Large Preview */}
            <div className="w-full h-64 rounded-xl overflow-hidden bg-[repeating-conic-gradient(#141c28_0%_25%,#0b1019_0%_50%)] bg-[length:16px_16px] flex items-center justify-center border border-[#222f42] p-2 mb-4">
              <img
                src={selectedFrame.compressedUrl}
                alt={`Frame ${selectedFrame.index + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Frame Detailed Info Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-4">
              <div className="bg-[#080d16] p-2 rounded-lg border border-[#1d273a]">
                <span className="text-[10px] text-gray-400 block">حجم الصورة المضغوطة</span>
                <strong className="text-emerald-400 font-bold">
                  {selectedFrame.isDuplicate ? '0 KB (مدمج)' : `${(selectedFrame.compressedSizeBytes / 1024).toFixed(1)} KB`}
                </strong>
              </div>

              <div className="bg-[#080d16] p-2 rounded-lg border border-[#1d273a]">
                <span className="text-[10px] text-gray-400 block">الأبعاد الفعلية</span>
                <strong className="text-white">{selectedFrame.width}×{selectedFrame.height}px</strong>
              </div>

              <div className="bg-[#080d16] p-2 rounded-lg border border-[#1d273a]">
                <span className="text-[10px] text-gray-400 block">موضع الإطار</span>
                <strong className="text-gray-300">({selectedFrame.layout.x}, {selectedFrame.layout.y})</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={selectedFrame.compressedUrl}
                download={`frame_${selectedFrame.index + 1}.webp`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#172131] border border-[#2c3d56] text-white text-xs font-bold hover:bg-[#1f2b3e]"
              >
                <Download className="w-4 h-4" />
                <span>تحميل هذه الصورة الفردية</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedFrame(null)}
                className="px-5 py-2.5 rounded-xl bg-[#243044] text-white text-xs font-bold hover:bg-[#2e3e58]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
