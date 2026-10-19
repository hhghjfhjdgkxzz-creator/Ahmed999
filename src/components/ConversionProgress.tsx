import React from 'react';
import type { ConversionProgressState } from '../types/svga';
import { Film, Zap, PackageCheck, Layers, Sparkles } from 'lucide-react';
import { formatBytes } from '../utils/fileSizeEstimator';

interface ConversionProgressProps {
  progress: ConversionProgressState;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({ progress }) => {
  if (!progress.isConverting) return null;

  const currentStage = progress.stageName || 'extracting';

  const getStepStatus = (step: 'extracting' | 'compressing' | 'assembling') => {
    if (progress.percent >= 100) return 'completed';
    if (step === 'extracting') {
      return currentStage === 'extracting' ? 'active' : 'completed';
    }
    if (step === 'compressing') {
      if (currentStage === 'extracting') return 'pending';
      return currentStage === 'compressing' ? 'active' : 'completed';
    }
    if (step === 'assembling') {
      if (currentStage === 'extracting' || currentStage === 'compressing') return 'pending';
      return currentStage === 'assembling' ? 'active' : 'completed';
    }
    return 'pending';
  };

  return (
    <div className="bg-gradient-to-br from-[#101726] via-[#0d131f] to-[#070b13] border border-[#2b3a52] rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl animate-in fade-in duration-300">
      {/* 3-Step Visual Pipeline Tracker */}
      <div className="grid grid-cols-3 gap-2 mb-4 pb-3 border-b border-[#1c2738]">
        {/* Step 1: Render & Extract */}
        <div className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
          getStepStatus('extracting') === 'active'
            ? 'bg-[#2a2110] border border-[#d4aa4d]/40 text-[#f4d77e]'
            : getStepStatus('extracting') === 'completed'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-[#090d16] text-gray-500 border border-[#1b2636]'
        }`}>
          <div className="flex items-center gap-1 text-[11px] font-bold mb-0.5">
            <Film className="w-3.5 h-3.5" />
            <span>1. رندرة الإطارات</span>
          </div>
          <span className="text-[10px] opacity-80">استخراج كصور</span>
        </div>

        {/* Step 2: Compress Images */}
        <div className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
          getStepStatus('compressing') === 'active'
            ? 'bg-[#2a2110] border border-[#d4aa4d]/40 text-[#f4d77e]'
            : getStepStatus('compressing') === 'completed'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-[#090d16] text-gray-500 border border-[#1b2636]'
        }`}>
          <div className="flex items-center gap-1 text-[11px] font-bold mb-0.5">
            <Zap className="w-3.5 h-3.5" />
            <span>2. ضغط الصور</span>
          </div>
          <span className="text-[10px] opacity-80">تقليص البايتات</span>
        </div>

        {/* Step 3: Assemble SVGA */}
        <div className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
          getStepStatus('assembling') === 'active'
            ? 'bg-[#2a2110] border border-[#d4aa4d]/40 text-[#f4d77e]'
            : getStepStatus('assembling') === 'completed'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-[#090d16] text-gray-500 border border-[#1b2636]'
        }`}>
          <div className="flex items-center gap-1 text-[11px] font-bold mb-0.5">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>3. تجميع SVGA</span>
          </div>
          <span className="text-[10px] opacity-80">حزم Protobuf</span>
        </div>
      </div>

      {/* Progress Header */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#dfbd61] animate-ping" />
          <span className="text-gray-200">{progress.stage}</span>
        </div>
        <strong className="text-[#f4d77e] font-mono text-base">{Math.round(progress.percent)}%</strong>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-3 bg-[#06090f] border border-[#1e2a3c] rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#a87d2c] via-[#f0d377] to-[#dfbd61] transition-all duration-200 shadow-[0_0_12px_rgba(240,211,119,0.5)]"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>

      {/* Status & Live metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 mt-2.5 gap-1.5 font-mono">
        <span className="text-gray-300">{progress.status}</span>
        <div className="flex items-center gap-2">
          {progress.currentFrame && progress.totalFrames && (
            <span className="text-[#dfbd61] bg-[#141d2a] px-2 py-0.5 rounded border border-[#253347]">
              فريم {progress.currentFrame} / {progress.totalFrames}
            </span>
          )}
          {progress.rawImagesSizeTotal && progress.compressedImagesSizeTotal && (
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              {formatBytes(progress.compressedImagesSizeTotal)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
