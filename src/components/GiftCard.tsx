import React, { useState, useRef, useEffect } from 'react';
import { Play, Video, Volume2, Sparkles, ArrowRight, ArrowLeft, Check, Flame } from 'lucide-react';
import { GiftItem, Language } from '../types';
import { translations } from '../utils/translations';
import { SvgaPlayer } from './SvgaPlayer';
import { resolveMediaUrl, getMediaFromIndexedDb, getProxyMediaUrl } from '../utils/mediaStorage';

interface GiftCardProps {
  gift: GiftItem;
  lang: Language;
  onSelectGift: (gift: GiftItem) => void;
  onQuickBuy?: (gift: GiftItem) => void;
  onAddToCart?: (gift: GiftItem) => void;
  isSelected?: boolean;
  canPin?: boolean;
  onTogglePin?: (gift: GiftItem) => void;
}

export const GiftCard: React.FC<GiftCardProps> = ({
  gift,
  lang,
  onSelectGift,
  isSelected = false,
  canPin = false,
  onTogglePin
}) => {
  const t = translations[lang];
  const [isHovered, setIsHovered] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasPoster = Boolean(gift.posterUrl && gift.posterUrl.trim());
  const isSvga = Boolean(
    gift.videoUrl && (
      gift.videoUrl.toLowerCase().endsWith('.svga') ||
      gift.videoUrl.toLowerCase().endsWith('.svga2') ||
      gift.videoUrl.includes('.svga?') ||
      gift.videoUrl.includes('data:application/octet-stream') ||
      gift.videoUrl.includes('gifts/svga')
    ) && !gift.videoUrl.toLowerCase().includes('.mp4') && !gift.videoUrl.toLowerCase().includes('.webm')
  );

  const isVideo = Boolean(
    gift.videoUrl && (
      gift.videoUrl.toLowerCase().includes('.mp4') ||
      gift.videoUrl.toLowerCase().includes('.webm') ||
      gift.videoUrl.includes('video/')
    )
  );

  const hasAudio = Boolean(
    gift.formats?.some(f => f.name.includes('声音') || f.name.includes('Sound') || f.name.includes('صوت')) ||
    gift.videoUrl ||
    gift.tags?.some(tag => tag.includes('صوت') || tag.includes('音效') || tag.includes('Audio')) ||
    true // Most live streaming gifts have sound effects
  );

  useEffect(() => {
    if (gift.videoUrl) {
      setVideoSrc(resolveMediaUrl(gift.videoUrl));
    }
  }, [gift.videoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && hasPoster) {
      videoRef.current.pause();
    }
  };

  const handleVideoError = async () => {
    try {
      const cached = await getMediaFromIndexedDb(gift.id) || await getMediaFromIndexedDb(gift.videoUrl);
      if (cached) {
        setVideoSrc(URL.createObjectURL(cached));
        return;
      }
      if (gift.videoUrl && (gift.videoUrl.startsWith('http://') || gift.videoUrl.startsWith('https://')) && !videoSrc.includes('/api/proxy-media')) {
        setVideoSrc(getProxyMediaUrl(gift.videoUrl));
      }
    } catch (e) {}
  };

  const displayTitle = lang === 'ar' && gift.titleAr ? gift.titleAr : lang === 'en' && gift.titleEn ? gift.titleEn : gift.title;
  const categoryTag = gift.category === 'frames' 
    ? (lang === 'ar' ? 'إطار' : 'Frame')
    : gift.category === 'luxury'
    ? (lang === 'ar' ? 'فاخر' : 'Luxury')
    : gift.category === 'medals'
    ? (lang === 'ar' ? 'وسام' : 'Medal')
    : gift.category === 'chat_bubbles'
    ? (lang === 'ar' ? 'فقاعة شات' : 'Chat Bubble')
    : (lang === 'ar' ? 'مؤثر' : 'Effect');
  const effectTag = isSvga ? 'SVGA' : isVideo ? 'MP4' : 'VFX';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectGift(gift)}
      className={`group relative flex flex-col rounded-2xl bg-[#0e131d] border transition-all duration-300 overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-950/40 min-w-0 w-full ${
        isSelected 
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/20 shadow-xl scale-[1.01]' 
          : 'border-slate-800/90 hover:border-cyan-500/70'
      }`}
    >
      {/* 1. Preview Container with Badges */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-[#0a0d14] to-[#06080d] flex items-center justify-center p-2 sm:p-3">
        {/* Top-Right: Sound Effect badge if present */}
        {hasAudio && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold shadow-sm">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>{lang === 'ar' ? 'صوت' : 'Audio'}</span>
          </div>
        )}

        {/* Top-Left: Format Badge */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[10px] font-mono font-bold">
          <span>{effectTag}</span>
        </div>

        {/* Media Preview:
            - At rest: Show posterUrl (clean customized cover image)
            - On Hover: If videoUrl exists, play video/animation immediately on hover!
        */}
        {hasPoster ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Background Playable Video / SVGA on Hover */}
            {(isVideo || isSvga || gift.videoUrl) && (
              <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isHovered ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}>
                {isSvga ? (
                  <SvgaPlayer
                    src={videoSrc || gift.videoUrl}
                    autoPlay={isHovered}
                    loop={true}
                    isMuted={true}
                    backdrop="dark"
                    className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc || resolveMediaUrl(gift.videoUrl)}
                    autoPlay={isHovered}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    onError={handleVideoError}
                    className="w-full h-full object-contain pointer-events-none drop-shadow-2xl transform-gpu"
                  />
                )}
              </div>
            )}

            {/* Front Poster Image (Visible when not hovered) */}
            <img
              src={resolveMediaUrl(gift.posterUrl)}
              alt={displayTitle}
              className={`w-full h-full object-contain pointer-events-none transition-all duration-300 drop-shadow-2xl ${
                isHovered && (isVideo || isSvga || gift.videoUrl) ? 'opacity-0 scale-105' : 'opacity-100 group-hover:scale-105'
              }`}
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                const raw = gift.posterUrl || '';
                // If it failed loading a .png, seamlessly try .webp
                if (target.src.includes('.png') && !target.src.includes('_retry_webp')) {
                  target.src = target.src.replace(/\.png(\?.*)?$/, '.webp') + '?_retry_webp=1';
                  return;
                }
                // If it failed loading a .webp, try fallback .png
                if (target.src.includes('.webp') && !target.src.includes('_retry_png')) {
                  target.src = target.src.replace(/\.webp(\?.*)?$/, '.png') + '?_retry_png=1';
                  return;
                }
                if (raw.startsWith('http') && !target.src.includes('/api/proxy-media')) {
                  target.src = `/api/proxy-media?url=${encodeURIComponent(raw)}`;
                }
              }}
            />
          </div>
        ) : isSvga && gift.videoUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <SvgaPlayer
              src={videoSrc || gift.videoUrl}
              autoPlay={true}
              loop={true}
              isMuted={true}
              backdrop="dark"
              className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
            />
          </div>
        ) : (isVideo || gift.videoUrl) && videoSrc && !gift.videoUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ? (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={handleVideoError}
            className="w-full h-full object-contain pointer-events-none drop-shadow-2xl transform-gpu"
          />
        ) : gift.videoUrl ? (
          <img
            src={resolveMediaUrl(gift.videoUrl)}
            alt={displayTitle}
            className="w-full h-full object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105 opacity-100 filter-none drop-shadow-2xl"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              const originalSrc = gift.videoUrl || '';
              if (originalSrc.startsWith('http') && !target.src.includes('/api/proxy-media')) {
                target.src = `/api/proxy-media?url=${encodeURIComponent(originalSrc)}`;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Video className="w-7 sm:w-8 h-7 sm:h-8 opacity-40 mb-1" />
            <span className="text-[10px] font-mono">{effectTag}</span>
          </div>
        )}
      </div>

      {/* 2. Content Info Section */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2 bg-[#0e131d] min-w-0">
        {/* Title & Price Row */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {Boolean(gift.pinnedTop) && (
              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white text-[10px] sm:text-[11px] font-black tracking-wider shadow-[0_2px_8px_rgba(239,68,68,0.5),0_1px_0_rgba(255,255,255,0.6)_inset] border-t border-amber-200/90 border-b border-red-900 border-x border-orange-400 flex items-center gap-1 select-none">
                <Flame className="w-3 h-3 text-amber-200 fill-orange-300 animate-pulse" />
                <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {lang === 'ar' ? 'جديد' : lang === 'zh' ? '新品' : 'NEW'}
                </span>
              </span>
            )}
            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate leading-snug">
              {displayTitle}
            </h3>
          </div>
          <span className="text-emerald-400 font-black text-xs sm:text-sm whitespace-nowrap shrink-0 font-mono">
            ${gift.price}
          </span>
        </div>

        {/* Category & Action Row */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 truncate">
              {categoryTag}
            </span>
            {canPin && onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(gift);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer select-none shrink-0 ${
                  gift.pinnedTop
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 hover:bg-emerald-500/30 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
                title={lang === 'ar' ? (gift.pinnedTop ? 'إلغاء علامة صح / جديد' : 'تفعيل علامة صح / جديد') : '设为最新'}
              >
                <Check className={`w-3 h-3 ${gift.pinnedTop ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{gift.pinnedTop ? '✓ جديد' : '+ جديد'}</span>
              </button>
            )}
          </div>
          <span className="text-[11px] font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-0.5 shrink-0">
            {lang === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
          </span>
        </div>
      </div>
    </div>
  );
};

