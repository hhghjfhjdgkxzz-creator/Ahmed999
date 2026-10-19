import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  Volume2,
  VolumeX,
  Layers,
  CheckCircle2,
  FileArchive,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import lottie, { type AnimationItem } from 'lottie-web';
import {
  type GiftItem,
  FORMAT_CAPABILITIES,
  CATEGORY_LABELS,
  formatBytes,
} from '../utils/catalogLogic';

interface GiftPlayerModalProps {
  gift: GiftItem | null;
  onClose: () => void;
}

export const GiftPlayerModal: React.FC<GiftPlayerModalProps> = ({ gift, onClose }) => {
  const [bgStyle, setBgStyle] = useState<'stage' | 'checkerboard' | 'obsidian'>('stage');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState<boolean>(false);

  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstanceRef = useRef<AnimationItem | null>(null);
  const svgaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!gift) return;
    setPlayerError(null);
    setIsPlaying(true);

    let cancelled = false;
    let svgaPlayerInstance: { stop?: () => void; clear?: () => void; destroy?: () => void } | null = null;

    if (gift.format === 'Lottie') {
      setIsLoadingAsset(true);
      fetch(gift.originalUrl)
        .then((res) => {
          if (!res.ok) throw new Error('تعذر تحميل ملف Lottie JSON');
          return res.json();
        })
        .then((animationData) => {
          if (cancelled || !lottieContainerRef.current) return;
          lottieContainerRef.current.innerHTML = '';
          lottieInstanceRef.current = lottie.loadAnimation({
            container: lottieContainerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData,
          });
          setIsLoadingAsset(false);
        })
        .catch((err) => {
          if (!cancelled) {
            setPlayerError((err as Error).message);
            setIsLoadingAsset(false);
          }
        });
    } else if (gift.format === 'SVGA' && !gift.originalUrl.startsWith('data:image/svg+xml')) {
      setIsLoadingAsset(true);
      import('svga.lite')
        .then(async ({ Downloader, Parser, Player }) => {
          if (cancelled || !svgaCanvasRef.current) return;
          const downloader = new Downloader();
          const parser = new Parser();
          const player = new Player(svgaCanvasRef.current);
          svgaPlayerInstance = player;
          const fileData = await downloader.get(gift.originalUrl);
          const svgaData = await parser.do(fileData);
          (player as any).set({ loop: 0, fillMode: 'forwards' });
          await player.mount(svgaData);
          player.start();
          setIsLoadingAsset(false);
        })
        .catch(() => {
          if (!cancelled) {
            setPlayerError('تعذر فك ترميز ملف SVGA الثنائي، يتم عرض المعاينة البديلة.');
            setIsLoadingAsset(false);
          }
        });
    } else {
      setIsLoadingAsset(false);
    }

    return () => {
      cancelled = true;
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
      if (svgaPlayerInstance) {
        try {
          svgaPlayerInstance.stop?.();
          svgaPlayerInstance.clear?.();
          svgaPlayerInstance.destroy?.();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [gift]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!gift) return null;

  const cap = FORMAT_CAPABILITIES[gift.format];
  const categoryInfo = CATEGORY_LABELS[gift.category];

  const togglePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (lottieInstanceRef.current) {
      if (next) lottieInstanceRef.current.play();
      else lottieInstanceRef.current.pause();
    }
    if (videoRef.current) {
      if (next) void videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const restartPlayback = () => {
    setIsPlaying(true);
    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.goToAndPlay(0, true);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    }
  };

  const isRealVideoFile =
    ['MP4', 'WebM', 'VAP'].includes(gift.format) &&
    !gift.originalUrl.startsWith('data:image/svg+xml');

  const isBinarySvga =
    gift.format === 'SVGA' && !gift.originalUrl.startsWith('data:image/svg+xml');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-gift-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-[#120E1E] border border-white/15 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Right/Top Stage Area (7 cols on desktop) */}
        <div
          className={`lg:col-span-7 relative min-h-[340px] sm:min-h-[440px] flex flex-col items-center justify-center p-6 transition-colors ${
            bgStyle === 'stage'
              ? 'bg-[radial-gradient(circle_at_center,#2B194D_0%,#0B0814_75%)]'
              : bgStyle === 'checkerboard'
              ? 'bg-[#181824] [background-image:linear-gradient(45deg,#232334_25%,transparent_25%),linear-gradient(-45deg,#232334_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#232334_75%),linear-gradient(-45deg,transparent_75%,#232334_75%)] [background-size:24px_24px] [background-position:0_0,0_12px,12px_-12px,-12px_0]'
              : 'bg-[#050408]'
          }`}
        >
          {/* Stage Top Bar Controls */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setBgStyle('stage')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  bgStyle === 'stage'
                    ? 'bg-[#D4AF37] text-[#08060E] font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                مسرح صوتي
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('checkerboard')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  bgStyle === 'checkerboard'
                    ? 'bg-[#D4AF37] text-[#08060E] font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                شبكة الشفافية Alpha
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('obsidian')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  bgStyle === 'obsidian'
                    ? 'bg-[#D4AF37] text-[#08060E] font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                خلفية داكنة
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل المعاينة'}
                className="p-1.5 text-slate-200 hover:text-[#D4AF37] transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={restartPlayback}
                aria-label="إعادة التشغيل من البداية"
                className="p-1.5 text-slate-200 hover:text-[#D4AF37] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {gift.hasAudio && (
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                  className="p-1.5 text-slate-200 hover:text-[#D4AF37] transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Main Active Player Surface */}
          <div className="relative w-full h-72 sm:h-80 flex items-center justify-center my-8">
            {isLoadingAsset && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-xs rounded-xl z-20">
                <div className="w-9 h-9 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-300">جاري تشغيل المشغل الأصلي ({gift.format})...</span>
              </div>
            )}

            {gift.format === 'Lottie' ? (
              <div
                ref={lottieContainerRef}
                data-testid="lottie-player-surface"
                className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center"
              />
            ) : isBinarySvga && !playerError ? (
              <canvas
                ref={svgaCanvasRef}
                width={500}
                height={500}
                data-testid="svga-canvas-surface"
                className="max-w-full max-h-full object-contain"
              />
            ) : isRealVideoFile ? (
              <video
                ref={videoRef}
                src={gift.originalUrl}
                poster={gift.thumbnailUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                controls={false}
                onError={() =>
                  setPlayerError('تعذر تشغيل دفق الفيديو المباشر، يتم عرض المعاينة المرئية.')
                }
                className="max-w-full max-h-72 object-contain rounded-lg"
              />
            ) : gift.format === 'ZIP' ? (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <FileArchive className="w-16 h-16 text-[#D4AF37] mb-3" />
                <p className="text-sm font-semibold text-white mb-1">
                  حزمة تسلسل صور مضغوطة (ZIP Sequence)
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  هذا الملف يحتوي على تسلسل الإطارات الأصلية (PNG/WebP Sequence) جاهز للتنزيل المباشر والربط بمحرك التطبيق.
                </p>
              </div>
            ) : (
              <img
                src={
                  gift.originalUrl.startsWith('data:') ||
                  ['GIF', 'WebP', 'APNG', 'SVG', 'PNG', 'JPG'].includes(gift.format)
                    ? gift.originalUrl
                    : gift.thumbnailUrl
                }
                alt={gift.name}
                referrerPolicy="no-referrer"
                className={`max-w-full max-h-72 object-contain transition-transform duration-300 ${
                  !isPlaying ? 'opacity-75 scale-95' : 'scale-100'
                }`}
              />
            )}
          </div>

          {playerError && (
            <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg px-3 py-1.5 mt-1">
              {playerError}
            </div>
          )}

          {/* Stage Footer Info */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3 mt-auto">
            <span>المشغل النشط: {cap.playerType.toUpperCase()} Engine</span>
            <span className="font-mono tabular-nums">{formatBytes(gift.sizeBytes)}</span>
          </div>
        </div>

        {/* Left/Bottom Metadata & Download Panel (5 cols on desktop) */}
        <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between bg-[#120E1E]">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs text-[#D4AF37] font-medium mb-1">
                  {categoryInfo.labelAr} · صيغة {gift.format}
                </div>
                <h2
                  id="modal-gift-title"
                  className="text-xl sm:text-2xl font-bold text-white leading-snug"
                >
                  {gift.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق نافذة المعاينة"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">{gift.description}</p>

            {/* Technical Specifications List */}
            <div className="border-t border-b border-white/10 py-4 space-y-3 text-sm mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">الصيغة الأصلية</span>
                <span className="font-mono font-semibold text-white">{gift.format}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">حجم الملف الفعلي</span>
                <span className="font-mono tabular-nums text-white">
                  {formatBytes(gift.sizeBytes)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">الدقة والجودة</span>
                <span className="font-mono text-white">{gift.quality || 'Original'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">خصائص الصيغة</span>
                <span className="text-slate-200 text-xs">
                  {gift.isAnimated ? 'متحرك' : 'ثابت'}
                  {' · '}
                  {gift.hasAlpha ? 'شفافية Alpha' : 'خلفية كاملة'}
                  {' · '}
                  {gift.hasAudio ? 'يدعم الصوت' : 'بدون صوت'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">المعرّف المرجعي</span>
                <span className="font-mono text-xs text-slate-400 truncate max-w-[180px]">
                  {gift.id}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed mb-6 flex items-start gap-2">
              <Layers className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>{cap.descriptionAr}</span>
            </div>
          </div>

          <div className="space-y-3">
            {gift.allowDownload ? (
              <a
                href={gift.originalUrl}
                download={`${gift.name}.${gift.format.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-[#08060E] font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#D4AF37]/15 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل الملف الأصلي ({gift.format})</span>
              </a>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs text-center">
                التنزيل المباشر غير مفعل لهذه الهدية من قِبل الإدارة
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>محفوظ في التخزين الدائم بدون تحويل</span>
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>جودة أصلية</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
