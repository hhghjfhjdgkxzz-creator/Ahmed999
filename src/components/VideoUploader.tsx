import React, { useRef, useState } from 'react';
import { UploadCloud, Video, Trash2, Play, Sparkles, AlertCircle, FileVideo } from 'lucide-react';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';
import type { VideoMetadata } from '../utils/svgaEncoder';

interface VideoUploaderProps {
  selectedFile: File | null;
  videoMetadata: VideoMetadata | null;
  videoPreviewUrl: string | null;
  isGeneratingSample: boolean;
  lang: Language;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  onGenerateSample: () => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  selectedFile,
  videoMetadata,
  videoPreviewUrl,
  isGeneratingSample,
  lang,
  onFileSelect,
  onRemoveFile,
  onGenerateSample
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4')) {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <section className="bg-gradient-to-br from-[#111824] to-[#0b1019] border border-[#253044] rounded-2xl p-5 mb-5 shadow-xl">
      {!selectedFile ? (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-[#dfbd61] bg-[#1a170d]/60 scale-[1.01]'
                : 'border-[#39475c] hover:border-[#e0bd61] hover:bg-[#15150f]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,video/mp4,video/*"
              className="hidden"
              onChange={handleInputChange}
            />

            <div className="w-16 h-16 rounded-2xl bg-[#171e2b] border border-[#344156] flex items-center justify-center text-[#f3d277] mb-3 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{t.uploadTitle}</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-sm mb-4">{t.uploadText}</p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4aa4d] to-[#f4d77e] text-[#151108] text-xs font-bold shadow-md shadow-[#d4aa4d]/20 hover:brightness-110 transition-all pointer-events-none">
                {t.chooseFile}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateSample();
                }}
                disabled={isGeneratingSample}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1b2535] hover:bg-[#253247] text-[#f4d77e] text-xs font-semibold border border-[#a87d2c]/40 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingSample ? t.generatingSample : t.trySample}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0f17] border border-[#263247] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
          {videoPreviewUrl && (
            <div className="relative w-full sm:w-44 h-32 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-white/10 group">
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
                muted
              />
            </div>
          )}

          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 mb-1.5">
              <FileVideo className="w-5 h-5 text-[#dfbd61] flex-shrink-0" />
              <h4 className="font-bold text-white text-sm sm:text-base truncate" title={selectedFile.name}>
                {selectedFile.name}
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
              <div className="bg-[#121a28] p-2 rounded-lg border border-[#1f2b3e]">
                <span className="text-gray-400 block text-[11px]">{t.size}</span>
                <span className="text-[#f4d77e] font-semibold">{formatSize(selectedFile.size)}</span>
              </div>

              <div className="bg-[#121a28] p-2 rounded-lg border border-[#1f2b3e]">
                <span className="text-gray-400 block text-[11px]">{t.duration}</span>
                <span className="text-gray-200 font-semibold">
                  {videoMetadata ? `${videoMetadata.duration.toFixed(1)} ثانية` : '...'}
                </span>
              </div>

              <div className="bg-[#121a28] p-2 rounded-lg border border-[#1f2b3e] col-span-2 sm:col-span-1">
                <span className="text-gray-400 block text-[11px]">{t.resolution}</span>
                <span className="text-gray-200 font-semibold">
                  {videoMetadata ? `${videoMetadata.width} × ${videoMetadata.height} px` : '...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onRemoveFile}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#221315] hover:bg-[#341b1e] text-red-300 hover:text-red-200 border border-red-900/40 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.remove}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
