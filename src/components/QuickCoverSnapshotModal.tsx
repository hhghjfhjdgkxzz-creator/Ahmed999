import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  UploadCloud, 
  Check, 
  AlertCircle, 
  Film, 
  Image as ImageIcon, 
  Scissors, 
  Play, 
  Pause, 
  Loader2, 
  Sparkles,
  Lock,
  Save,
  RotateCcw
} from 'lucide-react';
import { GiftItem, Language } from '../types';
import { updateGift } from '../lib/firebaseService';
import { uploadMediaToServer, saveMediaToIndexedDb, getProxyMediaUrl, resolveMediaUrl } from '../utils/mediaStorage';

interface QuickCoverSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  gift: GiftItem | null;
  lang: Language;
  onCoverSaved: (updatedGift: GiftItem) => void;
  onOpenShapeEditor?: (imageUrl: string) => void;
}

export const QuickCoverSnapshotModal: React.FC<QuickCoverSnapshotModalProps> = ({
  isOpen,
  onClose,
  gift,
  lang,
  onCoverSaved,
  onOpenShapeEditor
}) => {
  if (!isOpen || !gift) return null;

  const [posterUrl, setPosterUrl] = useState<string>(gift.posterUrl || '');
  const [usePoster, setUsePoster] = useState<boolean>(Boolean(gift.posterUrl));
  const [videoTime, setVideoTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(gift.duration || 14);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setPosterUrl(gift.posterUrl || '');
    setUsePoster(Boolean(gift.posterUrl));
    setVideoTime(0);
    setIsPlaying(false);
    setSaveSuccess(false);
    setImageLoadError(false);
  }, [gift]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVideoTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  // Helper: draw video element to offscreen canvas and return compressed data URL
  const drawVideoToDataUrl = (targetVideo: HTMLVideoElement): string => {
    const maxDim = 480;
    let w = targetVideo.videoWidth || 720;
    let h = targetVideo.videoHeight || 1280;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  // Capture snapshot at current video frame
  const handleCaptureSnapshot = async () => {
    if (!gift.videoUrl) {
      alert(lang === 'ar' ? 'لا يوجد رابط فيديو متاح لهذه الهدية' : 'No video URL available');
      return;
    }

    setIsCapturing(true);
    try {
      const vid = videoRef.current;
      if (vid) {
        vid.pause();
        setIsPlaying(false);
      }
      const targetTime = vid ? vid.currentTime : videoTime;

      let capturedDataUrl = '';
      if (vid && vid.readyState >= 2) {
        try {
          capturedDataUrl = drawVideoToDataUrl(vid);
        } catch (corsErr) {
          console.warn('Direct canvas draw tainted by CORS. Using proxy fallback...', corsErr);
        }
      }

      if (!capturedDataUrl) {
        const rawUrl = gift.videoUrl;
        const fetchTargets = [
          rawUrl,
          getProxyMediaUrl(rawUrl),
          `/api/proxy-media?url=${encodeURIComponent(rawUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`
        ];

        let blob: Blob | null = null;
        for (const target of fetchTargets) {
          try {
            const resp = await fetch(target, { mode: 'cors' });
            if (resp.ok) {
              blob = await resp.blob();
              break;
            }
          } catch (e) {}
        }

        if (!blob) throw new Error('Could not fetch video data for snapshot');

        const blobUrl = URL.createObjectURL(blob);
        const tempVid = document.createElement('video');
        tempVid.muted = true;
        tempVid.playsInline = true;
        tempVid.preload = 'auto';
        tempVid.src = blobUrl;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video frame seek timeout')), 8000);
          tempVid.onloadedmetadata = () => {
            tempVid.currentTime = Math.min(targetTime, tempVid.duration || targetTime);
          };
          tempVid.onseeked = () => {
            clearTimeout(timeout);
            resolve();
          };
          tempVid.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
        });

        capturedDataUrl = drawVideoToDataUrl(tempVid);
        URL.revokeObjectURL(blobUrl);
      }

      if (capturedDataUrl) {
        setPosterUrl(capturedDataUrl);
        setUsePoster(true);
        setImageLoadError(false);
      } else {
        throw new Error('Frame extraction returned empty');
      }
    } catch (err: any) {
      console.error('Snapshot capture error:', err);
      alert(lang === 'ar' ? 'تعذر استخراج اللقطة مباشرة من الرابط، يرجى رفع صورة يدوياً.' : 'Failed to capture frame. Please upload an image.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload local image file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const safeName = `poster_${gift.id.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`;
      const uploadRes = await uploadMediaToServer(file, safeName);
      await saveMediaToIndexedDb(uploadRes.url, file, safeName);
      setPosterUrl(uploadRes.url);
      setUsePoster(true);
      setImageLoadError(false);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPosterUrl(reader.result);
          setUsePoster(true);
          setImageLoadError(false);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  // Confirm and permanently save to codebase, disk, and Firestore
  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const finalPoster = usePoster ? posterUrl.trim() : '';
      const updatedGift: GiftItem = {
        ...gift,
        posterUrl: finalPoster
      };

      // 1. Bake directly into codebase file (initialGifts.ts) and server disk storage
      try {
        const resp = await fetch('/api/gifts/persist-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gift: updatedGift })
        });
        if (resp.ok) {
          const resData = await resp.json();
          if (resData?.savedPosterUrl) {
            updatedGift.posterUrl = resData.savedPosterUrl;
          }
        }
      } catch (codeErr) {
        console.warn('Codebase persist note:', codeErr);
      }

      // 2. Update Firestore
      try {
        await updateGift(updatedGift);
      } catch (fErr) {
        console.warn('Firestore update note:', fErr);
      }

      // 3. Update localStorage
      try {
        const localGifts: GiftItem[] = JSON.parse(localStorage.getItem('jiawei_custom_gifts_v1') || '[]');
        const updatedLocal = localGifts.map(g => g.id === updatedGift.id ? updatedGift : g);
        localStorage.setItem('jiawei_custom_gifts_v1', JSON.stringify(updatedLocal));
      } catch(e) {}

      // 4. Update parent component state
      onCoverSaved(updatedGift);

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (saveErr: any) {
      console.error('Error saving cover image:', saveErr);
      alert(lang === 'ar' ? 'حدث خطأ أثناء حفظ وتثبيت الصورة' : 'Failed to save cover image');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#0b0f17] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0e131e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {lang === 'ar' ? 'التقاط وتثبيت صورة الغلاف للهدية' : 'Capture & Lock Gift Cover Image'}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold">
                  {gift.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                {gift.title} {gift.titleAr ? `· ${gift.titleAr}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns on Desktop */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto max-h-[75vh]">
          
          {/* Left Column (md:col-span-6): Video Player & Frame Scrubber */}
          <div className="md:col-span-6 flex flex-col space-y-3.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Film className="w-4 h-4 text-cyan-400" />
                {lang === 'ar' ? 'فيديو الهدية المباشر' : 'Gift Video Player'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {Math.floor(videoTime)}s / {Math.floor(duration)}s
              </span>
            </div>

            {/* Video Stage */}
            <div className="relative aspect-[9/14] sm:aspect-video md:aspect-[4/5] max-h-[300px] w-full bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group">
              {gift.videoUrl ? (
                <video
                  ref={videoRef}
                  src={resolveMediaUrl(gift.videoUrl)}
                  playsInline
                  muted
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (videoRef.current) setVideoTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current && videoRef.current.duration) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handleTogglePlay}
                />
              ) : (
                <div className="text-center p-4 text-slate-500">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-xs">{lang === 'ar' ? 'لا يوجد فيديو مرفق' : 'No video attached'}</span>
                </div>
              )}

              {/* Pause overlay button */}
              {gift.videoUrl && !isPlaying && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all backdrop-blur-xs cursor-pointer shadow-xl"
                >
                  <Play className="w-6 h-6 ml-0.5 fill-current" />
                </button>
              )}
            </div>

            {/* Timeline Slider */}
            {gift.videoUrl && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max={duration || 14}
                    step="0.1"
                    value={videoTime}
                    onChange={handleSeek}
                    className="flex-1 mx-2.5 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span>{videoTime.toFixed(1)}s</span>
                </div>

                {/* Primary Snapshot Capture Button (Matching Screenshot 5.png) */}
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleCaptureSnapshot}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isCapturing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                  <span>
                    {isCapturing 
                      ? (lang === 'ar' ? 'جارِ التقاط الإطار...' : 'Capturing...') 
                      : (lang === 'ar' ? 'أخذ لقطة من هذا الإطار كصورة غلاف' : 'Capture This Frame as Cover')}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column (md:col-span-6): Cover Image Controls & Preview */}
          <div className="md:col-span-6 flex flex-col space-y-3.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                {lang === 'ar' ? 'معاينة وضبط صورة الغلاف' : 'Cover Image Preview'}
              </span>

              {/* Toggle (Matching 5.png): صح (✓) تفعيل الصورة / إكس (✕) فيديو فقط */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUsePoster(true)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    usePoster 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'صح (✓) تفعيل الصورة' : 'Enable (✓)'}
                </button>
                <button
                  type="button"
                  onClick={() => setUsePoster(false)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    !usePoster 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'إكس (✕) فيديو فقط' : 'Video Only (✕)'}
                </button>
              </div>
            </div>

            {/* Live Cover Preview Stage */}
            <div className="relative aspect-[9/14] sm:aspect-video md:aspect-[4/5] max-h-[220px] w-full bg-slate-900 rounded-xl overflow-hidden border border-emerald-500/40 flex items-center justify-center p-2 shadow-inner">
              {usePoster && posterUrl && !imageLoadError ? (
                <img
                  src={resolveMediaUrl(posterUrl)}
                  alt="Gift Poster"
                  onError={() => setImageLoadError(true)}
                  className="w-full h-full object-contain rounded-lg drop-shadow-xl"
                />
              ) : (
                <div className="text-center p-3 text-slate-500 flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-xs font-semibold">
                    {!usePoster 
                      ? (lang === 'ar' ? 'تم اختيار: فيديو فقط بدون غلاف' : 'Video Only mode') 
                      : (lang === 'ar' ? 'لا توجد صورة غلاف معينة حالياً' : 'No cover set')}
                  </span>
                </div>
              )}
            </div>

            {/* Input URL & Upload Tools (Matching 5.png) */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={posterUrl}
                  onChange={(e) => {
                    setPosterUrl(e.target.value);
                    setUsePoster(true);
                    setImageLoadError(false);
                  }}
                  placeholder="https://... أو /uploads/... أو رابط صورة"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />

                <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'ar' ? 'رفع صورة' : 'Upload'}</span>
                  <input
                    type="file"
                    disabled={isUploading}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                </label>
              </div>

              {/* Optional Shape & Circular Feather Crop button */}
              {posterUrl && onOpenShapeEditor && (
                <button
                  type="button"
                  onClick={() => onOpenShapeEditor(posterUrl)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'ar' ? 'قص وتعديل الشكل (دائري / حواف ناعمة)' : 'Crop Shape (Circle / Feather)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Confirmation Button */}
        <div className="px-5 py-4 border-t border-slate-800 bg-[#0e131e] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            {lang === 'ar'
              ? '💡 سيتم حفظ الصورة ودمجها مباشرة في الكود البرمجي (initialGifts) وقاعدة البيانات لحمايتها للأبد.'
              : 'The image and link will be permanently baked into codebase files and cloud database.'}
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={isSaving || saveSuccess}
              onClick={handleConfirmSave}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-700/30'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{lang === 'ar' ? 'جارِ الدمج والحفظ في الكود...' : 'Saving to Code...'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{lang === 'ar' ? '✓ تم الحفظ والتثبيت بالكود بنجاح!' : '✓ Saved to Codebase!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>{lang === 'ar' ? '✓ تأكيد وحفظ صورة الغلاف نهائياً' : '✓ Confirm & Save Cover Image'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
