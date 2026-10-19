import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  Film,
  Layers,
  CheckCircle2,
  Info,
  Sparkles,
  Cpu,
  ChevronDown,
  ChevronUp,
  CopySlash,
  Crop,
  ShieldCheck,
  Flame,
  Scissors,
  Clock,
  Gauge,
  Atom,
  Palette,
  FileImage,
  ImageIcon
} from 'lucide-react';
import type { ConversionConfig, CompressionPreset } from '../types/svga';
import type { VideoMetadata } from '../utils/svgaEncoder';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';

interface SettingsPanelProps {
  config: ConversionConfig;
  videoMetadata: VideoMetadata | null;
  hasFile: boolean;
  isConverting: boolean;
  lang: Language;
  onChangeConfig: (newConfig: Partial<ConversionConfig>) => void;
  onApplyPreset: (preset: CompressionPreset) => void;
  onStartExport: () => void;
  onExtractFramesOnly: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  videoMetadata,
  hasFile,
  isConverting,
  lang,
  onChangeConfig,
  onApplyPreset,
  onStartExport,
  onExtractFramesOnly
}) => {
  const t = translations[lang];
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);

  const rawDuration = videoMetadata?.duration || 1;
  const start = config.enableTrim ? Math.max(0, config.startTime || 0) : 0;
  const end = config.enableTrim ? Math.min(rawDuration, config.endTime || rawDuration) : rawDuration;
  const activeDuration = Math.max(0.1, end - start);
  const estimatedFrames = Math.max(1, Math.round(activeDuration * (config.fps || 12)));

  return (
    <section className="bg-gradient-to-br from-[#0c121d] via-[#090d16] to-[#060910] border border-[#1e2a3c] rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl backdrop-blur-md">
      {/* Header & Compression Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#182334]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2a2110] to-[#141b28] border border-[#d4aa4d]/40 flex items-center justify-center text-[#f4d77e] flex-shrink-0 shadow-md">
            <Atom className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-sm sm:text-base">محرك الضغط الذري للصفر (Atomic Engine)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Zero Byte Tech</span>
              </span>
            </div>
            <span className="text-[11px] text-gray-400 block mt-0.5">اختر وضع الضغط السريع أو اضبط الإعدادات الدقيقة</span>
          </div>
        </div>

        {/* Compression Presets */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-[#060910] p-1 rounded-xl border border-[#1c2738] text-xs">
          <button
            type="button"
            onClick={() => onApplyPreset('atomic_zero')}
            className={`px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1 text-center ${
              config.compression === 'atomic_zero'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 text-black shadow-md shadow-emerald-500/30'
                : 'text-gray-300 hover:text-white hover:bg-[#121926]'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>ذري (&lt; 80 KB)</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('zero_micro')}
            className={`px-3 py-2 rounded-lg font-bold transition-all text-center ${
              config.compression === 'zero_micro'
                ? 'bg-gradient-to-r from-[#d4aa4d] via-[#f0d377] to-[#d4aa4d] text-[#151108] shadow-md shadow-[#d4aa4d]/25'
                : 'text-gray-300 hover:text-white hover:bg-[#121926]'
            }`}
          >
            <span>للصفر (&lt; 150 KB)</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('ultra_mega')}
            className={`px-3 py-2 rounded-lg font-bold transition-all text-center ${
              config.compression === 'ultra_mega'
                ? 'bg-[#1e2a3c] text-[#f4d77e] border border-[#d4aa4d]/40 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-[#121926]'
            }`}
          >
            <span>خارق (&lt; 300 KB)</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyPreset('strong')}
            className={`px-3 py-2 rounded-lg font-bold transition-all text-center ${
              config.compression === 'strong'
                ? 'bg-[#1e2a3c] text-[#f4d77e] border border-[#d4aa4d]/40 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-[#121926]'
            }`}
          >
            <span>تيك توك (&lt; 500 KB)</span>
          </button>
        </div>
      </div>

      {/* Target Max Budget Bar */}
      <div className="bg-[#080d16] border border-[#202d40] rounded-xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <label className="text-gray-200 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>الحد الأقصى لحجم الملف المستهدف (Target Max Budget):</span>
          </label>
          <span className="text-[11px] text-[#f4d77e] font-mono font-semibold">
            {config.targetMaxKb ? `إجبار الحجم تحت ${config.targetMaxKb} KB` : 'تلقائي حسب الجودة'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {[
            { kb: 80, label: '< 80 KB (ذري)' },
            { kb: 150, label: '< 150 KB (للصفر)' },
            { kb: 300, label: '< 300 KB (خارق)' },
            { kb: 500, label: '< 500 KB (تيك توك)' },
            { kb: 800, label: '< 800 KB (بيجو)' },
            { kb: null, label: 'بدون قيد' }
          ].map((item) => (
            <button
              key={String(item.kb)}
              type="button"
              onClick={() => onChangeConfig({ targetMaxKb: item.kb, targetSizeMb: item.kb ? item.kb / 1024 : null })}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                config.targetMaxKb === item.kb
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-sm'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white hover:border-gray-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Duration & Trimming Control Card */}
      <div className="bg-[#080d16] border border-[#202d40] rounded-xl p-3.5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-200 text-xs font-bold flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-[#dfbd61]" />
            <span>تحديد وقص مدة الفيديو للضغط (Video Duration Trim):</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableTrim}
              onChange={(e) => {
                const checked = e.target.checked;
                onChangeConfig({
                  enableTrim: checked,
                  startTime: 0,
                  endTime: rawDuration
                });
              }}
              className="rounded border-[#253347] text-[#dfbd61] focus:ring-0 accent-[#dfbd61]"
            />
            <span className="text-[11px] text-[#f4d77e] font-semibold">تفعيل قص المدة</span>
          </label>
        </div>

        {config.enableTrim ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-[#162130]">
            <div>
              <span className="text-[10px] text-gray-400 block mb-1">وقت البداية (ثانية):</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, (config.endTime || rawDuration) - 0.1)}
                  step={0.1}
                  value={config.startTime || 0}
                  onChange={(e) => onChangeConfig({ startTime: parseFloat(e.target.value) || 0 })}
                  className="flex-1 accent-[#dfbd61] cursor-pointer"
                />
                <span className="text-xs font-mono text-[#f4d77e] bg-[#101724] px-2 py-1 rounded border border-[#253347] min-w-[50px] text-center">
                  {(config.startTime || 0).toFixed(1)}s
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 block mb-1">وقت النهاية (ثانية):</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={Math.min(rawDuration, (config.startTime || 0) + 0.1)}
                  max={rawDuration}
                  step={0.1}
                  value={config.endTime || rawDuration}
                  onChange={(e) => onChangeConfig({ endTime: parseFloat(e.target.value) || rawDuration })}
                  className="flex-1 accent-[#dfbd61] cursor-pointer"
                />
                <span className="text-xs font-mono text-[#f4d77e] bg-[#101724] px-2 py-1 rounded border border-[#253347] min-w-[50px] text-center">
                  {(config.endTime || rawDuration).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">
            يتم ضغط الفيديو بالكامل ({rawDuration.toFixed(1)} ثانية). تفعيل قص المدة يتيح لك استخراج أول ثانيتين لتقليص الحجم للصفر فوراً!
          </p>
        )}

        {config.enableTrim && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] text-gray-400">خيارات سريعة:</span>
            <button
              type="button"
              onClick={() => onChangeConfig({ startTime: 0, endTime: Math.min(rawDuration, 1.5) })}
              className="px-2 py-0.5 rounded text-[10px] bg-[#121927] border border-[#253347] text-gray-300 hover:text-white"
            >
              أول 1.5 ثانية (فائق الصغر)
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ startTime: 0, endTime: Math.min(rawDuration, 2.5) })}
              className="px-2 py-0.5 rounded text-[10px] bg-[#121927] border border-[#253347] text-gray-300 hover:text-white"
            >
              أول 2.5 ثانية (هدايا قياسية)
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ startTime: 0, endTime: rawDuration })}
              className="px-2 py-0.5 rounded text-[10px] bg-[#121927] border border-[#253347] text-gray-300 hover:text-white"
            >
              كامل الفيديو
            </button>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Resolution Selection */}
        <div className="bg-[#080d16] border border-[#1e2a3c] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-xs font-semibold">
              {t.targetResolution}
            </label>
            {videoMetadata && (
              <span className="text-[11px] text-[#f4d77e] font-mono font-semibold">
                الأصل: {videoMetadata.width}×{videoMetadata.height}px
              </span>
            )}
          </div>
          <select
            value={config.sizeMode}
            onChange={(e) => {
              const newMode = e.target.value as any;
              if (newMode === 'custom' && videoMetadata) {
                onChangeConfig({
                  sizeMode: newMode,
                  customWidth: config.customWidth || videoMetadata.width,
                  customHeight: config.customHeight || videoMetadata.height
                });
              } else {
                onChangeConfig({ sizeMode: newMode });
              }
            }}
            className="w-full p-2.5 rounded-lg border border-[#253347] bg-[#101724] text-white text-xs sm:text-sm focus:border-[#dfbd61] outline-none"
          >
            <option value="source">
              {t.original} {videoMetadata ? `(${videoMetadata.width} × ${videoMetadata.height})` : ''}
            </option>
            <option value="750x1334">{t.tiktokGifts}</option>
            <option value="500x500">{t.squareAvatar}</option>
            <option value="1080x1920">{t.hdStory}</option>
            <option value="2000x2000">{t.superHd}</option>
            <option value="custom">{t.custom}</option>
          </select>

          {config.sizeMode === 'custom' && (
            <div className="flex gap-2 mt-2.5">
              <div className="w-1/2">
                <span className="text-[10px] text-gray-400 block mb-1">العرض (Width px):</span>
                <input
                  type="number"
                  min={16}
                  max={4096}
                  placeholder={t.customWidth}
                  value={config.customWidth || videoMetadata?.width || ''}
                  onChange={(e) => onChangeConfig({ customWidth: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-2 rounded-lg border border-[#253347] bg-[#101724] text-white text-xs focus:border-[#dfbd61] outline-none font-mono"
                />
              </div>
              <div className="w-1/2">
                <span className="text-[10px] text-gray-400 block mb-1">الارتفاع (Height px):</span>
                <input
                  type="number"
                  min={16}
                  max={4096}
                  placeholder={t.customHeight}
                  value={config.customHeight || videoMetadata?.height || ''}
                  onChange={(e) => onChangeConfig({ customHeight: parseInt(e.target.value, 10) || 0 })}
                  className="w-full p-2 rounded-lg border border-[#253347] bg-[#101724] text-white text-xs focus:border-[#dfbd61] outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>مقاس العرض الكامل في التطبيق: </span>
            <strong className="font-mono text-white">
              {config.sizeMode === 'source'
                ? (videoMetadata ? `${videoMetadata.width} × ${videoMetadata.height} px` : 'مطابق للأصل')
                : config.sizeMode === 'custom'
                ? `${config.customWidth || videoMetadata?.width || 750} × ${config.customHeight || videoMetadata?.height || 1334} px`
                : `${config.sizeMode.replace('x', ' × ')} px`}
            </strong>
          </div>
        </div>

        {/* IMAGE FORMAT SELECTION - PROMINENT BUTTONS */}
        <div className="bg-[#080d16] border border-[#1e2a3c] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-xs font-semibold flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#dfbd61]" />
              <span>صيغة ضغط الصور الداخلية (Image Format):</span>
            </label>
            <span className="text-xs font-mono font-bold text-[#f4d77e] uppercase bg-[#141c2a] px-2 py-0.5 rounded border border-[#243449]">
              {config.imageFormat}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              type="button"
              onClick={() => onChangeConfig({ imageFormat: 'webp' })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                config.imageFormat === 'webp'
                  ? 'bg-[#2a2110] border-[#d4aa4d] text-[#f4d77e] shadow-lg shadow-[#d4aa4d]/20 ring-1 ring-[#d4aa4d]'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white hover:border-gray-500'
              }`}
            >
              <span className="font-extrabold text-xs sm:text-sm font-mono">WebP</span>
              <span className="text-[10px] text-emerald-400 font-bold">توفير 60% (موصى به)</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ imageFormat: 'jpeg' })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                config.imageFormat === 'jpeg'
                  ? 'bg-[#2a2110] border-[#d4aa4d] text-[#f4d77e] shadow-lg shadow-[#d4aa4d]/20 ring-1 ring-[#d4aa4d]'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white hover:border-gray-500'
              }`}
            >
              <span className="font-extrabold text-xs sm:text-sm font-mono">JPEG</span>
              <span className="text-[10px] text-gray-400">ضغط فائق بدون شفافية</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ imageFormat: 'png' })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                config.imageFormat === 'png'
                  ? 'bg-[#2a2110] border-[#d4aa4d] text-[#f4d77e] shadow-lg shadow-[#d4aa4d]/20 ring-1 ring-[#d4aa4d]'
                  : 'bg-[#101724] border-[#222f42] text-gray-300 hover:text-white hover:border-gray-500'
              }`}
            >
              <span className="font-extrabold text-xs sm:text-sm font-mono">PNG</span>
              <span className="text-[10px] text-gray-400">شفافية كاملة قياسية</span>
            </button>
          </div>
          <p className="text-[#8895a7] text-[11px] mt-2">
            صيغة WebP توفر أصغر بايتات مع دعم الشفافية والنقاء التام.
          </p>
        </div>

        {/* FPS Buttons */}
        <div className="bg-[#080d16] border border-[#1e2a3c] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-xs font-semibold">{t.fpsTitle}</label>
            <span className="text-[#f4d77e] text-xs font-mono font-bold">{config.fps} FPS</span>
          </div>
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5">
            {[8, 10, 12, 15, 18, 20, 24].map((fpsVal) => (
              <button
                key={fpsVal}
                type="button"
                onClick={() => onChangeConfig({ fps: fpsVal })}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                  config.fps === fpsVal
                    ? 'bg-[#2a2110] border-[#d3ad52] text-[#f4d77e] shadow-sm'
                    : 'bg-[#101724] border-[#253347] text-gray-300 hover:border-gray-500'
                }`}
              >
                {fpsVal} FPS
              </button>
            ))}
          </div>
          <p className="text-[#8895a7] text-[11px] mt-2 leading-relaxed">
            اختيار 10 أو 12 FPS يخفض عدد الصور بنسبة 60% ويجعل الحجم تحت 100 KB.
          </p>
        </div>

        {/* Quality Slider */}
        <div className="bg-[#080d16] border border-[#1e2a3c] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-xs font-semibold">{t.qualityTitle}</label>
            <span className="text-[#f4d77e] text-xs font-mono font-bold">{config.quality}%</span>
          </div>

          <div className="grid grid-cols-[1fr_60px] gap-2.5 items-center">
            <input
              type="range"
              min={10}
              max={100}
              value={config.quality}
              onChange={(e) => onChangeConfig({ quality: parseInt(e.target.value, 10) })}
              className="w-full accent-[#dfbd61] cursor-pointer"
            />
            <input
              type="number"
              min={10}
              max={100}
              value={config.quality}
              onChange={(e) => {
                const val = Math.max(10, Math.min(100, parseInt(e.target.value, 10) || 40));
                onChangeConfig({ quality: val });
              }}
              className="p-1.5 text-center rounded-lg border border-[#253347] bg-[#101724] text-white text-xs font-mono"
            />
          </div>
          <p className="text-[#8895a7] text-[11px] mt-2 leading-relaxed">
            نسبة 30% - 45% في WebP توفر ضغطاً ذرياً مع صورة فائقة الوضوح.
          </p>
        </div>
      </div>

      {/* Advanced Ultra Compression Tools */}
      <div className="mt-4 border-t border-[#182334] pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center justify-between w-full text-xs text-gray-300 hover:text-white py-1 transition-all"
        >
          <span className="font-semibold flex items-center gap-1.5 text-[#f4d77e]">
            <Sliders className="w-3.5 h-3.5 text-[#dfbd61]" />
            <span>خيارات الضغط المتقدمة: إزالة السواد، تصفير الشفافية، والتحجيم العتادي (توفير 85%)</span>
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 animate-in fade-in duration-200">
            {/* Auto Black Background Removal */}
            <div className="bg-[#080d16] border border-[#202d40] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <label className="block text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إزالة السواد وتصفير الشفافية</span>
                </label>
                <span className="text-[10px] text-gray-400 block mb-2">
                  تحويل السواد لشفافية تامة وتصفير بايتات الألوان المخفية لمضاعفة الضغط
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={config.removeBlackBg}
                  onChange={(e) => onChangeConfig({ removeBlackBg: e.target.checked })}
                  className="rounded border-[#253347] text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <span className="text-xs text-emerald-300 font-semibold">تفعيل الشفافية الذكية</span>
              </label>
            </div>

            {/* Frame Deduplication */}
            <div className="bg-[#080d16] border border-[#202d40] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1 flex items-center gap-1">
                  <CopySlash className="w-3.5 h-3.5 text-[#dfbd61]" />
                  <span>دمج الفريمات المتطابقة</span>
                </label>
                <span className="text-[10px] text-gray-400 block mb-2">
                  إعادة استخدام الفريمات الساكنة تلقائياً لتوفير 30% إلى 50%
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={config.frameDeduplication}
                  onChange={(e) => onChangeConfig({ frameDeduplication: e.target.checked })}
                  className="rounded border-[#253347] text-[#dfbd61] focus:ring-0 accent-[#dfbd61]"
                />
                <span className="text-xs text-[#f4d77e] font-semibold">تفعيل دمج الفريمات</span>
              </label>
            </div>

            {/* Color Depth Quantization */}
            <div className="bg-[#080d16] border border-[#202d40] rounded-xl p-3 flex flex-col justify-between">
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-[#dfbd61]" />
                  <span>تقليل عمق الألوان المتكيف</span>
                </label>
                <span className="text-[10px] text-gray-400 block mb-2">
                  تقليص عدد الألوان في الصورة لمضاعفة كفاءة حزم Zlib
                </span>
              </div>
              <select
                value={String(config.colorBits)}
                onChange={(e) => onChangeConfig({ colorBits: e.target.value as any })}
                className="w-full p-1.5 rounded-lg border border-[#253347] bg-[#101724] text-white text-xs outline-none"
              >
                <option value="4">4-Bit (أقصى ضغط للصفر - 16 لون)</option>
                <option value="5">5-Bit (توازن مثالي - 32 لون)</option>
                <option value="6">6-Bit (64 لون)</option>
                <option value="original">ألوان أصلية كاملة</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Duration Notice */}
      <div className="mt-4 p-3 bg-[#060910] border border-[#1a2536] rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4 text-[#dfbd61] flex-shrink-0" />
          <span>مدة الاستخراج: {activeDuration.toFixed(1)} ثانية ({config.fps} FPS)</span>
        </div>
        <span className="font-mono text-[#f4d77e] bg-[#121927] px-2.5 py-1 rounded-md border border-[#233144] whitespace-nowrap">
          ~ {estimatedFrames} فريم إجمالي
        </span>
      </div>

      {/* Dual Action Workflow Buttons */}
      <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onExtractFramesOnly}
          disabled={!hasFile || isConverting}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#141e2e] hover:bg-[#1b283d] text-[#f4d77e] border border-[#2b3a50] font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Film className="w-4 h-4 text-[#dfbd61]" />
          <span>رندرة واستخراج الإطارات كصور أولاً</span>
        </button>

        <button
          type="button"
          onClick={onStartExport}
          disabled={!hasFile || isConverting}
          className="w-full sm:flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#d4aa4d] via-[#f0d377] to-[#d4aa4d] text-[#151108] font-extrabold text-xs sm:text-sm shadow-xl shadow-[#d4aa4d]/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>{isConverting ? 'جاري المعالجة...' : 'تحويل وضغط وتجميع فوري (1-Click)'}</span>
        </button>
      </div>
    </section>
  );
};
