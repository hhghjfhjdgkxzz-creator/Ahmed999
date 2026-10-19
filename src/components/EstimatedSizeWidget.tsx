import React from 'react';
import { HardDrive, Sparkles, AlertTriangle, CheckCircle2, Zap, ArrowDownRight, ShieldCheck } from 'lucide-react';
import type { FileEstimate, ConversionConfig } from '../types/svga';
import type { VideoMetadata } from '../utils/svgaEncoder';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';

interface EstimatedSizeWidgetProps {
  estimate: FileEstimate;
  videoMetadata: VideoMetadata | null;
  config: ConversionConfig;
  originalSizeBytes: number;
  lang: Language;
  onApplyTargetSize: (targetMb: number) => void;
}

export const EstimatedSizeWidget: React.FC<EstimatedSizeWidgetProps> = ({
  estimate,
  videoMetadata,
  config,
  originalSizeBytes,
  lang,
  onApplyTargetSize
}) => {
  const t = translations[lang];

  const getMeterPercent = () => {
    const mb = estimate.bytes / (1024 * 1024);
    return Math.min(100, Math.max(8, (mb / 2.0) * 100));
  };

  const savedPercent =
    originalSizeBytes > 0 && estimate.bytes < originalSizeBytes
      ? Math.round(((originalSizeBytes - estimate.bytes) / originalSizeBytes) * 100)
      : null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0c131f] via-[#090d16] to-[#060910] border border-[#1e2a3c] rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Main estimated size showcase */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#2a2110] to-[#121927] border border-[#d4aa4d]/40 flex items-center justify-center text-[#f4d77e] shadow-lg shadow-[#d4aa4d]/10 flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1.5">
                <span>الحجم التقديري المتوقع للملف (Live Estimate)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#fce79f] to-[#dfbd61] bg-clip-text text-transparent font-mono">
                ~ {estimate.formatted}
              </span>

              {savedPercent !== null && savedPercent > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>توفير {savedPercent}% من الحجم</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <span>{estimate.statusText}</span>
            </p>
          </div>
        </div>

        {/* Target size presets */}
        <div className="bg-[#060910]/90 border border-[#1b2636] rounded-xl p-3 flex flex-col justify-center">
          <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1 mb-2">
            <Zap className="w-3.5 h-3.5 text-[#dfbd61]" />
            <span>معايير سريعة لقيود هدايا وتطبيقات البث:</span>
          </span>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onApplyTargetSize(0.08)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                config.targetSizeMb === 0.08
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-sm font-bold'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white'
              }`}
            >
              &lt; 80 KB (خارق للصفر)
            </button>

            <button
              type="button"
              onClick={() => onApplyTargetSize(0.15)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                config.targetSizeMb === 0.15
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm font-bold'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white'
              }`}
            >
              &lt; 150 KB (فائق)
            </button>

            <button
              type="button"
              onClick={() => onApplyTargetSize(0.3)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                config.targetSizeMb === 0.3
                  ? 'bg-[#2a2110] border-[#d3ad52] text-[#f4d77e] shadow-sm font-bold'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white'
              }`}
            >
              &lt; 300 KB (تيك توك)
            </button>

            <button
              type="button"
              onClick={() => onApplyTargetSize(0.5)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                config.targetSizeMb === 0.5
                  ? 'bg-[#2a2110] border-[#d3ad52] text-[#f4d77e] shadow-sm font-bold'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white'
              }`}
            >
              &lt; 500 KB (بيجو)
            </button>
          </div>
        </div>
      </div>

      {/* Visual Capacity Bar */}
      <div className="mt-4 pt-3 border-t border-[#162130]">
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400 mb-1.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>&lt; 150 KB (للصفر / فائق الصغر)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>150 - 500 KB (تيك توك قياسي)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>&gt; 1 MB (كبير)</span>
          </span>
        </div>

        <div className="w-full h-2 bg-[#04070d] rounded-full overflow-hidden border border-[#182334] relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              estimate.status === 'safe'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : estimate.status === 'medium'
                ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500'
                : 'bg-gradient-to-r from-amber-500 to-red-500'
            }`}
            style={{ width: `${getMeterPercent()}%` }}
          />
        </div>
      </div>
    </div>
  );
};
