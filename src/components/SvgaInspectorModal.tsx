import React, { useRef, useState } from 'react';
import { X, UploadCloud, FileSearch, AlertCircle, CheckCircle } from 'lucide-react';
import { decodeSvgaBuffer, type DecodedSvgaMovie } from '../utils/svgaDecoder';
import { SvgaPlayer } from './SvgaPlayer';
import type { Language } from '../utils/i18n';
import { translations } from '../utils/i18n';

interface SvgaInspectorModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
}

export const SvgaInspectorModal: React.FC<SvgaInspectorModalProps> = ({
  isOpen,
  lang,
  onClose
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [decodedMovie, setDecodedMovie] = useState<DecodedSvgaMovie | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setFileInfo({ name: file.name, size: file.size });

    try {
      const buffer = await file.arrayBuffer();
      const decoded = await decodeSvgaBuffer(buffer);
      setDecodedMovie(decoded);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'فشل فك تشفير وفحص ملف SVGA. تأكد من صحة الملف.');
      setDecodedMovie(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0e1422] border border-[#27364d] rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-[#162030] hover:bg-[#202d42] text-gray-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <FileSearch className="w-5 h-5 text-[#dfbd61]" />
          <h3 className="text-lg font-bold text-white">فحص ومعاينة أي ملف SVGA</h3>
        </div>

        <p className="text-gray-400 text-xs sm:text-sm mb-4 leading-relaxed">
          يمكنك رفع أي ملف بصيغة <code className="text-[#f4d77e]">.svga</code> لفحصه ومعرفة أبعاده، وعدد فريماته، ومعدل الـ FPS، ومعاينته مباشرة داخل المتصفح.
        </p>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2f3f58] hover:border-[#dfbd61] bg-[#090d16] hover:bg-[#121927] rounded-xl p-6 text-center cursor-pointer transition-all mb-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".svga,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <UploadCloud className="w-8 h-8 text-[#dfbd61] mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-200">
            اضغط لاختيار ملف .SVGA أو اسحبه هنا
          </p>
          <span className="text-xs text-gray-500 block mt-1">يدعم ملفات SVGA 2.0 المضغوطة بـ Zlib</span>
        </div>

        {isLoading && (
          <div className="p-4 text-center text-sm text-[#f4d77e] animate-pulse">
            جاري فك ضغط وتحليل ملف SVGA...
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-200 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {decodedMovie && fileInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#121a28] p-2.5 rounded-lg border border-[#233146]">
                <span className="text-gray-400 block text-[11px]">حجم الملف</span>
                <strong className="text-[#f4d77e]">{formatSize(fileInfo.size)}</strong>
              </div>
              <div className="bg-[#121a28] p-2.5 rounded-lg border border-[#233146]">
                <span className="text-gray-400 block text-[11px]">الأبعاد</span>
                <strong className="text-white">{decodedMovie.width} × {decodedMovie.height} px</strong>
              </div>
              <div className="bg-[#121a28] p-2.5 rounded-lg border border-[#233146]">
                <span className="text-gray-400 block text-[11px]">معدل FPS</span>
                <strong className="text-white">{decodedMovie.fps} FPS</strong>
              </div>
              <div className="bg-[#121a28] p-2.5 rounded-lg border border-[#233146]">
                <span className="text-gray-400 block text-[11px]">عدد الفريمات</span>
                <strong className="text-[#f4d77e]">{decodedMovie.totalFrames} فريم</strong>
              </div>
            </div>

            <SvgaPlayer movie={decodedMovie} lang={lang} />
          </div>
        )}
      </div>
    </div>
  );
};
