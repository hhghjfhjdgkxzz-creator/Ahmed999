import React, { useState } from 'react';
import { Play, Download, Sparkles } from 'lucide-react';
import {
  type GiftItem,
  CATEGORY_LABELS,
  formatBytes,
} from '../utils/catalogLogic';

interface GiftCardProps {
  gift: GiftItem;
  onPreview: (gift: GiftItem) => void;
}

export const GiftCard: React.FC<GiftCardProps> = ({ gift, onPreview }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const categoryInfo = CATEGORY_LABELS[gift.category];

  return (
    <article
      className="group relative flex flex-col rounded-2xl bg-[#120E1E]/90 border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Thumbnail Stage (70% height focus) */}
      <div
        onClick={() => onPreview(gift)}
        role="button"
        tabIndex={0}
        aria-label={`معاينة الهدية ${gift.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview(gift);
          }
        }}
        className="relative aspect-square w-full bg-[radial-gradient(circle_at_center,#251642_0%,#0B0813_78%)] flex items-center justify-center p-6 cursor-pointer overflow-hidden"
      >
        {!imgFailed && gift.thumbnailUrl ? (
          <img
            src={gift.thumbnailUrl}
            alt={gift.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-12 h-12 text-[#D4AF37] mb-2" />
            <span className="font-mono text-sm font-bold text-white">{gift.format}</span>
            <span className="text-xs text-slate-400 mt-1">{gift.name}</span>
          </div>
        )}

        {/* Measured subtle scrim & hover quick-play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08060E]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center p-4">
          <span className="text-xs font-semibold text-[#F8FAFC] flex items-center gap-1.5 bg-[#08060E]/85 border border-[#D4AF37]/40 px-3.5 py-1.5 rounded-lg">
            <Play className="w-3.5 h-3.5 text-[#D4AF37] fill-current" />
            <span>معاينة الحركة الأصلية</span>
          </span>
        </div>
      </div>

      {/* Content & Unboxed Metadata */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed quiet metadata with typographic separators (Zero-Pill Discipline) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            <span className="text-[#D4AF37] font-medium">{categoryInfo.labelAr}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-slate-200">{gift.format}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatBytes(gift.sizeBytes)}</span>
          </div>

          <h3 className="text-base font-bold text-white group-hover:text-[#FDE68A] transition-colors line-clamp-1 mb-1">
            {gift.name}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {gift.description}
          </p>
        </div>

        {/* Technical Capabilities & Action Buttons */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400 truncate">
            {gift.hasAudio ? 'صوت مدمج' : 'بدون صوت'}
            {' · '}
            {gift.hasAlpha ? 'شفاف Alpha' : 'كامل'}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPreview(gift)}
              aria-label={`معاينة ${gift.name}`}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37] text-[#FDE68A] hover:text-[#08060E] border border-[#D4AF37]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>

            {gift.allowDownload && (
              <a
                href={gift.originalUrl}
                download={`${gift.name}.${gift.format.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`تنزيل ${gift.name}`}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
