import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Smile, 
  Check, 
  CheckCheck, 
  Eye, 
  X, 
  ShieldAlert, 
  Loader2, 
  Maximize2,
  Minimize2,
  Trash2,
  Clock,
  Sparkles,
  Users,
  Copy,
  Search,
  Camera,
  ShieldCheck,
  ChevronDown,
  Mic,
  Square,
  Play,
  Pause,
  Volume2,
  AlertCircle,
  Smartphone,
  FileAudio,
  RefreshCw,
  Music
} from 'lucide-react';
import { 
  ClanMessage, 
  ClanMember, 
  ClanSettings, 
  ClanSticker, 
  AuthUser, 
  Language, 
  ClanRole 
} from '../../types';
import { 
  sendClanMessage, 
  markClanMessageAsRead, 
  deleteClanMessage 
} from '../../lib/clanService';
import { uploadClanImageUniversal, uploadClanAudioUniversal } from '../../lib/clanStorage';

interface ClanChatProps {
  lang: Language;
  currentUser: AuthUser | null;
  currentMember: ClanMember | null;
  clanSettings: ClanSettings;
  messages: ClanMessage[];
  stickers: ClanSticker[];
  isAdmin: boolean;
  onCloseMobileChat?: () => void;
}

export const ClanChat: React.FC<ClanChatProps> = ({
  lang,
  currentUser,
  currentMember,
  clanSettings,
  messages,
  stickers,
  isAdmin,
  onCloseMobileChat
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [selectedStickerCat, setSelectedStickerCat] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedReadReaders, setSelectedReadReaders] = useState<{ message: ClanMessage } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  // Voice Recording & Playback State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{ [msgId: string]: number }>({});
  const [showVoiceOptionsModal, setShowVoiceOptionsModal] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [chatToast, setChatToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const currentAudioElemRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const nativeVoiceRecordInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto clear notification toast
  useEffect(() => {
    if (chatToast) {
      const timer = setTimeout(() => setChatToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [chatToast]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isSearchOpen]);

  // Handle scroll detection to show/hide "Scroll to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottomBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mark visible messages as read using IntersectionObserver
  useEffect(() => {
    if (!currentUser) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              markClanMessageAsRead(messageId, currentUser);
            }
          }
        });
      },
      { root: chatContainerRef.current, threshold: 0.5 }
    );

    const messageElements = chatContainerRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [messages, currentUser]);

  const canSendMessages = isAdmin || (currentMember && clanSettings.allowMemberMessages);
  const canSendImages = isAdmin || (currentMember && clanSettings.allowMemberImages);
  const canSendAudio = isAdmin || (currentMember && (clanSettings.allowMemberAudio !== false));
  const canSendStickers = isAdmin || (currentMember && clanSettings.allowMemberStickers);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (currentAudioElemRef.current) {
        currentAudioElemRef.current.pause();
        currentAudioElemRef.current = null;
      }
    };
  }, []);

  // Voice Note Recording Methods (Instant Voice Record)
  const startVoiceRecording = async () => {
    if (!currentUser || !canSendAudio || isRecordingVoice || isUploadingVoice) return;
    try {
      if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback instantly to native mobile voice recorder capture
        if (nativeVoiceRecordInputRef.current) {
          nativeVoiceRecordInputRef.current.click();
          return;
        }
        setMicPermissionError(
          lang === 'ar'
            ? 'المتصفح لا يدعم تسجيل الميكروفون المباشر. يمكنك استخدام مسجل الهاتف أو رفع ملف صوتي.'
            : 'Direct microphone recording is not supported. You can use phone voice recorder.'
        );
        setShowVoiceOptionsModal(true);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (constraintErr) {
        // Fallback to basic audio in case advanced constraints aren't supported
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250); // collect in 250ms chunks
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      setMicPermissionError(null);
      setShowVoiceOptionsModal(false);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 120) { // Max 2 minutes voice note limit
            stopAndSendVoiceRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      // If direct browser microphone permission is blocked in preview/iframe, instantly launch native recorder
      console.warn('Microphone direct access restricted, launching instant native recorder:', err?.message || err);
      if (nativeVoiceRecordInputRef.current) {
        nativeVoiceRecordInputRef.current.click();
        return;
      }
      setMicPermissionError(
        lang === 'ar'
          ? 'تم تقييد إذن الميكروفون المباشر. يرجى استخدام زر مسجل الهاتف أدناه.'
          : 'Microphone permission restricted. Please use phone recorder option.'
      );
      setShowVoiceOptionsModal(true);
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recordedDuration = recordingSeconds;
    if (recordedDuration < 1) {
      cancelVoiceRecording();
      return;
    }

    setIsUploadingVoice(true);
    setIsRecordingVoice(false);

    try {
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      
      const finishedBlob = await new Promise<Blob>((resolve) => {
        mediaRecorderRef.current!.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          resolve(blob);
        };
        mediaRecorderRef.current!.stop();
      });

      // Upload audio universally to cloud & local
      const uploadRes = await uploadClanAudioUniversal(finishedBlob, recordedDuration);

      const userClanRole: ClanRole = isAdmin ? 'leader' : (currentMember?.clanRole || 'member');
      const newMsg: ClanMessage = {
        id: `msg_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUser!.id,
        senderName: currentUser!.name,
        senderAvatar: currentUser!.avatar || '',
        senderClanRole: userClanRole,
        content: lang === 'ar' ? `تسجيل صوتي (${recordedDuration} ثانية)` : `Voice note (${recordedDuration}s)`,
        type: 'audio',
        mediaUrl: uploadRes.url,
        mediaSize: uploadRes.size,
        audioDuration: recordedDuration,
        createdAt: new Date().toISOString(),
        readBy: [{
          userId: currentUser!.id,
          userName: currentUser!.name,
          userAvatar: currentUser!.avatar,
          readAt: new Date().toISOString()
        }]
      };

      await sendClanMessage(newMsg);
      setChatToast({
        type: 'success',
        text: lang === 'ar' ? '✓ تم إرسال التسجيل الصوتي بنجاح لجميع الأعضاء!' : 'Voice note sent!'
      });
    } catch (err: any) {
      console.warn('Failed to send voice message:', err?.message || err);
      setChatToast({
        type: 'error',
        text: lang === 'ar' ? 'فشل إرسال التسجيل الصوتي، يرجى المحاولة مرة أخرى.' : 'Voice note upload failed'
      });
    } finally {
      setIsUploadingVoice(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];
    }
  };

  // Upload Audio/Voice from Device or Native Mobile Recorder
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !canSendAudio) return;

    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    if (nativeVoiceRecordInputRef.current) nativeVoiceRecordInputRef.current.value = '';

    if (file.size > 15 * 1024 * 1024) {
      setChatToast({
        type: 'error',
        text: lang === 'ar' ? 'حجم الملف الصوتي يتجاوز الحد المسموح به (15 ميغابايت)' : 'Audio exceeds 15MB limit'
      });
      return;
    }

    setIsUploadingVoice(true);
    try {
      let durationSec = 0;
      try {
        const audioUrl = URL.createObjectURL(file);
        const tempAudio = new Audio(audioUrl);
        await new Promise<void>((resolve) => {
          tempAudio.onloadedmetadata = () => {
            if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
              durationSec = Math.round(tempAudio.duration);
            }
            resolve();
          };
          tempAudio.onerror = () => resolve();
          setTimeout(resolve, 1500);
        });
        URL.revokeObjectURL(audioUrl);
      } catch (durErr) {
        console.warn('Could not read audio duration:', durErr);
      }

      const uploadRes = await uploadClanAudioUniversal(file, durationSec);
      const userClanRole: ClanRole = isAdmin ? 'leader' : (currentMember?.clanRole || 'member');
      const newMsg: ClanMessage = {
        id: `msg_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || '',
        senderClanRole: userClanRole,
        content: durationSec > 0
          ? (lang === 'ar' ? `تسجيل صوتي (${durationSec} ثانية)` : `Voice note (${durationSec}s)`)
          : (lang === 'ar' ? `تسجيل صوتي` : `Voice note`),
        type: 'audio',
        mediaUrl: uploadRes.url,
        mediaSize: uploadRes.size,
        audioDuration: durationSec,
        createdAt: new Date().toISOString(),
        readBy: [{
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          readAt: new Date().toISOString()
        }]
      };

      await sendClanMessage(newMsg);
      setChatToast({
        type: 'success',
        text: lang === 'ar' ? '✓ تم إرسال التسجيل الصوتي بنجاح لجميع الأعضاء!' : 'Voice note sent!'
      });
      setShowVoiceOptionsModal(false);
    } catch (err: any) {
      console.warn('Failed to upload audio:', err?.message || err);
      setChatToast({
        type: 'error',
        text: lang === 'ar' ? 'فشل إرسال التسجيل الصوتي، يرجى المحاولة مرة أخرى.' : 'Failed to send voice note'
      });
    } finally {
      setIsUploadingVoice(false);
    }
  };

  // Audio Playback Controller
  const togglePlayAudio = (msg: ClanMessage) => {
    if (!msg.mediaUrl) return;

    if (playingAudioId === msg.id) {
      // Pause
      if (currentAudioElemRef.current) {
        currentAudioElemRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    // Stop currently playing
    if (currentAudioElemRef.current) {
      currentAudioElemRef.current.pause();
      currentAudioElemRef.current = null;
    }

    const audio = new Audio(msg.mediaUrl);
    currentAudioElemRef.current = audio;
    setPlayingAudioId(msg.id);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setAudioProgress(prev => ({ ...prev, [msg.id]: pct }));
      }
    };

    audio.onended = () => {
      setPlayingAudioId(null);
      setAudioProgress(prev => ({ ...prev, [msg.id]: 0 }));
      currentAudioElemRef.current = null;
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      currentAudioElemRef.current = null;
    };

    audio.play().catch(e => {
      console.warn('Audio play failed:', e);
      setPlayingAudioId(null);
    });
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser || isSending || !canSendMessages) return;

    const userClanRole: ClanRole = isAdmin ? 'leader' : (currentMember?.clanRole || 'member');

    const newMsg: ClanMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || '',
      senderClanRole: userClanRole,
      content: inputText.trim(),
      type: 'text',
      createdAt: new Date().toISOString(),
      readBy: [{
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        readAt: new Date().toISOString()
      }]
    };

    setIsSending(true);
    setInputText('');
    try {
      await sendClanMessage(newMsg);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSticker = async (sticker: ClanSticker) => {
    if (!currentUser || !canSendStickers) return;
    const userClanRole: ClanRole = isAdmin ? 'leader' : (currentMember?.clanRole || 'member');

    const newMsg: ClanMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar || '',
      senderClanRole: userClanRole,
      content: sticker.name,
      type: 'sticker',
      mediaUrl: sticker.url,
      createdAt: new Date().toISOString(),
      readBy: [{
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        readAt: new Date().toISOString()
      }]
    };

    setIsStickerPickerOpen(false);
    await sendClanMessage(newMsg);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !canSendImages) return;

    // Check size limit
    const maxSize = clanSettings.maxImageSizeBytes || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setChatToast({
        type: 'error',
        text: lang === 'ar' 
          ? `حجم الصورة يتجاوز الحد المسموح به (${(maxSize / (1024 * 1024)).toFixed(1)} ميغابايت)` 
          : `Image exceeds maximum allowed size`
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      // Robust hybrid upload: compresses locally and syncs to Firestore & backend storage
      const uploadResult = await uploadClanImageUniversal(file);
      const imageUrl = uploadResult.url;

      const userClanRole: ClanRole = isAdmin ? 'leader' : (currentMember?.clanRole || 'member');
      const newMsg: ClanMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || '',
        senderClanRole: userClanRole,
        content: file.name,
        type: 'image',
        mediaUrl: imageUrl,
        mediaSize: file.size,
        createdAt: new Date().toISOString(),
        readBy: [{
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          readAt: new Date().toISOString()
        }]
      };

      await sendClanMessage(newMsg);
    } catch (err) {
      console.warn('Failed to upload image:', err);
      setChatToast({
        type: 'error',
        text: lang === 'ar' ? 'فشل رفع الصورة، يرجى المحاولة مرة أخرى.' : 'Image upload failed'
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Delete this message?')) return;
    await deleteClanMessage(msgId);
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const formatMessageDateGroup = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return lang === 'ar' ? 'اليوم' : 'Today';
      }
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return lang === 'ar' ? 'أمس' : 'Yesterday';
      }
      return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getClanBadge = (role: ClanRole) => {
    switch (role) {
      case 'leader':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
            👑 {lang === 'ar' ? 'قائد' : 'Leader'}
          </span>
        );
      case 'deputy':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ⭐ {lang === 'ar' ? 'نائب' : 'Deputy'}
          </span>
        );
      case 'master':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
            ✨ {lang === 'ar' ? 'مصمم' : 'Master'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
            {lang === 'ar' ? 'عضو' : 'Member'}
          </span>
        );
    }
  };

  // Sticker categories
  const categories = ['all', ...Array.from(new Set(stickers.map(s => s.category || 'عام')))];
  const filteredStickers = selectedStickerCat === 'all' 
    ? stickers 
    : stickers.filter(s => s.category === selectedStickerCat);

  // Search filtered messages
  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.toLowerCase();
    return messages.filter(m => 
      (m.content && m.content.toLowerCase().includes(q)) ||
      (m.senderName && m.senderName.toLowerCase().includes(q))
    );
  }, [messages, chatSearchQuery]);

  return (
    <div 
      className={`flex flex-col bg-[#090d15] border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 relative ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'rounded-2xl sm:rounded-3xl h-[calc(100dvh-130px)] sm:h-[720px] max-h-[92dvh] sm:max-h-[820px] w-full'
      }`}
    >
      
      {/* 1. Chat Top Header Bar (Ultra Clean, Mobile First) */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-[#101623]/95 border-b border-slate-800/90 flex items-center justify-between backdrop-blur-xl z-20 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back button if inside ClanView */}
          {onCloseMobileChat && (
            <button
              onClick={onCloseMobileChat}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white sm:hidden shrink-0"
              title={lang === 'ar' ? 'رجوع' : 'Back'}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Clan Crest Icon */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-0.5 shadow-md shadow-amber-500/20 shrink-0 flex items-center justify-center text-base sm:text-xl">
            <div className="w-full h-full rounded-xl sm:rounded-2xl bg-slate-950 flex items-center justify-center">
              {clanSettings.icon || '👑'}
            </div>
          </div>

          {/* Title & Live Status */}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[150px] sm:max-w-xs">
                {clanSettings.name}
              </h3>
              <span className="hidden min-[420px]:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{lang === 'ar' ? 'مباشر' : 'Live'}</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {lang === 'ar' 
                ? 'دردشة جماعية حصرية لأعضاء القبيلة' 
                : 'Designers Clan Community'}
            </p>
          </div>
        </div>

        {/* Action Controls (Search / Storage Tag / Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Search Toggle */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setChatSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isSearchOpen
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
            title={lang === 'ar' ? 'بحث في الرسائل' : 'Search messages'}
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Auto-storage retention tag */}
          {clanSettings.autoDeleteImagesDays > 0 && (
            <div 
              className="hidden md:flex items-center gap-1 text-[10px] px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400"
              title={lang === 'ar' ? 'مدة حفظ الصور' : 'Storage retention'}
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{clanSettings.autoDeleteImagesDays}d</span>
            </div>
          )}

          {/* Fullscreen Expand / Minimize */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? (lang === 'ar' ? 'تصغير' : 'Exit fullscreen') : (lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen')}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Optional In-Chat Search Bar */}
      {isSearchOpen && (
        <div className="px-3 sm:px-4 py-2 bg-[#0c111a] border-b border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في محتوى الرسائل أو أسماء الأعضاء...' : 'Search messages or members...'}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {chatSearchQuery && (
            <button
              onClick={() => setChatSearchQuery('')}
              className="text-slate-500 hover:text-white text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3. Messages Stream Scroll Container */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-[#070a10] via-[#090d16] to-[#0a0e18] scroll-smooth overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-300">
                {chatSearchQuery 
                  ? (lang === 'ar' ? 'لم يتم العثور على رسائل تطابق بحثك' : 'No matching messages found')
                  : (lang === 'ar' ? 'مرحباً بك في دردشة قبيلة المصممين!' : 'Welcome to Designers Clan Chat!')}
              </p>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'شارك أفكارك وتصاميمك واستيكراتك الحصرية مع النخبة' : 'Share ideas, VFX and stickers with members'}
              </p>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = currentUser?.id === msg.senderId;
            const otherReaders = (msg.readBy || []).filter(r => r.userId !== msg.senderId);
            const isReadByOthers = otherReaders.length > 0;

            // Date separator check
            const prevMsg = filteredMessages[index - 1];
            const showDateSeparator = !prevMsg || 
              new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

            return (
              <React.Fragment key={msg.id}>
                {/* Date Badge Separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#141b2a] text-slate-400 border border-slate-800/80 shadow-sm">
                      {formatMessageDateGroup(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message Item */}
                <div
                  data-message-id={msg.id}
                  className={`flex gap-2 sm:gap-2.5 group relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 shadow-md self-end mb-1">
                    {msg.senderAvatar ? (
                      <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                        {msg.senderName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble Body */}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[72%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Sender Name & Badge (Only for incoming messages or leaders) */}
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px] sm:max-w-none">
                          {msg.senderName}
                        </span>
                        {getClanBadge(msg.senderClanRole)}
                      </div>
                    )}

                    {/* Bubble Content Box */}
                    <div
                      className={`relative shadow-md group/bubble transition-all ${
                        isMe
                          ? 'bg-gradient-to-br from-cyan-600 via-cyan-600 to-blue-600 text-white rounded-2xl rounded-tr-xs'
                          : 'bg-[#141c2b] border border-slate-800/80 text-slate-100 rounded-2xl rounded-tl-xs'
                      } ${
                        msg.type === 'sticker' 
                          ? 'bg-transparent! border-none! shadow-none! p-0!' 
                          : 'p-2.5 sm:p-3'
                      }`}
                    >
                      {/* TYPE 1: Text Message */}
                      {msg.type === 'text' && (
                        <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words select-text">
                          {msg.content}
                        </p>
                      )}

                      {/* TYPE 2: Image Message */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div className="space-y-1.5">
                          <div 
                            onClick={() => setLightboxImage(msg.mediaUrl || null)}
                            className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 bg-black/40 max-w-[260px] sm:max-w-xs max-h-72"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="Clan media"
                              className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white">
                              <Maximize2 className="w-4 h-4 drop-shadow-md" />
                              <span className="text-[10px] font-bold">{lang === 'ar' ? 'عرض مكبر' : 'Zoom'}</span>
                            </div>
                          </div>
                          {msg.content && msg.content !== msg.mediaUrl && (
                            <p className="text-[11px] text-slate-200/90 truncate">{msg.content}</p>
                          )}
                        </div>
                      )}

                      {/* TYPE: Audio Voice Note Message */}
                      {msg.type === 'audio' && msg.mediaUrl && (
                        <div className="flex items-center gap-2.5 py-1 min-w-[200px] sm:min-w-[250px] max-w-full">
                          {/* Play/Pause Button */}
                          <button
                            type="button"
                            onClick={() => togglePlayAudio(msg)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer ${
                              isMe 
                                ? 'bg-white text-cyan-700 hover:bg-cyan-50' 
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110'
                            }`}
                            title={playingAudioId === msg.id ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'تشغيل الصوت' : 'Play Voice')}
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5 rtl:mr-0.5 rtl:ml-0" />
                            )}
                          </button>

                          {/* Sound Wave Graphic & Duration */}
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className={`flex items-center gap-1 font-bold ${isMe ? 'text-white' : 'text-emerald-400'}`}>
                                <Volume2 className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'تسجيل صوتي' : 'Voice Note'}</span>
                              </span>
                              <span className={`${isMe ? 'text-cyan-100' : 'text-slate-400'}`}>
                                {msg.audioDuration ? `${msg.audioDuration}s` : '0:00'}
                              </span>
                            </div>

                            {/* Progress bar / animated wave bars */}
                            <div className="w-full bg-black/25 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-150 ${isMe ? 'bg-white' : 'bg-emerald-400'}`}
                                style={{ width: `${audioProgress[msg.id] || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TYPE 3: Sticker Message */}
                      {msg.type === 'sticker' && msg.mediaUrl && (
                        <div className="flex flex-col items-center py-1">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.content}
                            className="w-24 h-24 sm:w-28 sm:h-28 object-contain hover:scale-110 active:scale-95 transition-transform filter drop-shadow-xl"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Message Footer: Time + Seen Status inside bubble */}
                      {msg.type !== 'sticker' && (
                        <div className={`flex items-center gap-1.5 mt-1 pt-0.5 text-[9px] font-mono select-none ${
                          isMe ? 'text-cyan-100/80 justify-end' : 'text-slate-400 justify-end'
                        }`}>
                          <span>{formatMessageTime(msg.createdAt)}</span>

                          {/* Seen / Sent Status Checkmarks */}
                          {isMe && (
                            <span className="inline-flex items-center" title={isReadByOthers ? (lang === 'ar' ? 'تمت القراءة' : 'Read') : (lang === 'ar' ? 'تم الإرسال' : 'Sent')}>
                              {isReadByOthers ? (
                                <CheckCheck className="w-3 h-3 text-emerald-300" />
                              ) : (
                                <Check className="w-3 h-3 text-cyan-200/70" />
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hover Actions Menu (Copy, Delete) */}
                      <div className="absolute -top-3.5 end-1 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-lg backdrop-blur-sm z-10">
                        {msg.type === 'text' && (
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                            title={lang === 'ar' ? 'نسخ النص' : 'Copy'}
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {(isAdmin || isMe) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 rounded text-red-400 hover:text-red-300 transition-colors"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Copy toast indicator */}
                    {copiedMsgId === msg.id && (
                      <span className="text-[9px] text-cyan-400 font-bold px-1 animate-in fade-in">
                        {lang === 'ar' ? '✓ تم النسخ' : 'Copied'}
                      </span>
                    )}

                    {/* Below Bubble: "Seen By" Readers Link */}
                    {otherReaders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedReadReaders({ message: msg })}
                        className="flex items-center gap-1 text-[9px] text-cyan-400/90 hover:text-cyan-300 transition-colors px-1 mt-0.5 cursor-pointer font-semibold"
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>
                          {lang === 'ar' 
                            ? `شوهدت من ${otherReaders.length}` 
                            : `Seen by ${otherReaders.length}`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 start-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-cyan-600/95 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 backdrop-blur-sm z-20 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
        >
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          <span>{lang === 'ar' ? 'أحدث الرسائل' : 'Latest'}</span>
        </button>
      )}

      {/* Warning if Chat Disabled by management */}
      {!canSendMessages && (
        <div className="px-3 sm:px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            {lang === 'ar' 
              ? 'إرسال الرسائل معطل مؤقتاً في إعدادات القبيلة من قبل الإدارة.' 
              : 'Messages sending is temporarily disabled by management.'}
          </span>
        </div>
      )}

      {/* 4. Bottom Input Controls (Mobile First, Touch Optimized) */}
      <div className="p-2 sm:p-3 bg-[#101623] border-t border-slate-800/90 z-20 relative shrink-0">
                {/* Voice Recording Live Bar */}
        {isRecordingVoice && (
          <div className="absolute inset-x-2 bottom-2 sm:bottom-3 bg-red-950/90 border border-red-500/50 rounded-2xl p-2.5 flex items-center justify-between z-30 backdrop-blur-md animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-red-400 animate-bounce" />
                <span>{lang === 'ar' ? 'جاري تسجيل الفويس...' : 'Recording Voice...'}</span>
              </span>
              <span className="text-xs font-mono font-bold text-red-300 bg-red-900/60 px-2 py-0.5 rounded-lg border border-red-800">
                {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{lang === 'ar' ? 'إرسال الفويس' : 'Send'}</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendText} className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Sticker Picker Button */}
          <button
            type="button"
            disabled={!canSendStickers}
            onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isStickerPickerOpen
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            } ${!canSendStickers ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={lang === 'ar' ? 'استيكرات القبيلة' : 'Stickers'}
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Photo Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            disabled={!canSendImages || isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${
              (!canSendImages || isUploadingImage) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={lang === 'ar' ? 'إرسال صورة' : 'Send Image'}
          >
            {isUploadingImage ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-cyan-400" />
            ) : (
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Audio / Voice Upload Hidden Inputs */}
          <input
            type="file"
            ref={audioFileInputRef}
            onChange={handleAudioFileUpload}
            accept="audio/*"
            className="hidden"
          />
          <input
            type="file"
            ref={nativeVoiceRecordInputRef}
            onChange={handleAudioFileUpload}
            accept="audio/*"
            capture="microphone"
            className="hidden"
          />

          {/* Voice Note Recording Button & Options (🎙️ الفويس الصوتي) */}
          <div className="relative flex items-center shrink-0">
            <button
              type="button"
              disabled={!canSendAudio || isUploadingVoice}
              onClick={isRecordingVoice ? stopAndSendVoiceRecording : startVoiceRecording}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isRecordingVoice
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              } ${(!canSendAudio || isUploadingVoice) ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={isRecordingVoice ? (lang === 'ar' ? 'إنهاء وإرسال الفويس' : 'Send Voice') : (lang === 'ar' ? 'تسجيل فويس صوتي 🎙️' : 'Record Voice')}
            >
              {isUploadingVoice ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-emerald-400" />
              ) : isRecordingVoice ? (
                <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-red-400" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            {/* Quick voice audio options trigger */}
            {!isRecordingVoice && canSendAudio && (
              <button
                type="button"
                onClick={() => setShowVoiceOptionsModal(true)}
                className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 text-slate-400 flex items-center justify-center text-[9px] shadow-sm transition-all cursor-pointer font-bold"
                title={lang === 'ar' ? 'خيارات الفويس والرفع من الجهاز' : 'Voice options'}
              >
                +
              </button>
            )}
          </div>

          {/* Input Text Field (font-size 16px on mobile to avoid iOS Safari auto-zoom) */}
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!canSendMessages}
            placeholder={
              canSendMessages
                ? (lang === 'ar' ? 'اكتب رسالة لأعضاء القبيلة...' : 'Type message...')
                : (lang === 'ar' ? 'المحادثة مغلقة مؤقتاً...' : 'Chat disabled')
            }
            className="flex-1 h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#070a10] border border-slate-800 text-[15px] sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSendMessages || !inputText.trim() || isSending}
            className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden min-[480px]:inline">{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                <Send className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* 5. Sticker Drawer (Mobile Bottom Sheet / Desktop Popover) */}
        {isStickerPickerOpen && (
          <>
            {/* Backdrop on mobile */}
            <div 
              onClick={() => setIsStickerPickerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 sm:hidden"
            />
            
            <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-16 sm:right-3 sm:left-auto w-full sm:w-96 bg-[#121824] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl z-40 animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'استيكرات قبيلة المصممين' : 'Clan Stickers'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsStickerPickerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sticker Categories Filter */}
              <div className="flex items-center gap-1 pb-2 overflow-x-auto text-[11px] scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedStickerCat(cat)}
                    className={`px-3 py-1 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                      selectedStickerCat === cat
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : cat}
                  </button>
                ))}
              </div>

              {/* Stickers Grid */}
              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                {filteredStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => handleSendSticker(sticker)}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 transition-all flex flex-col items-center gap-1 cursor-pointer group active:scale-95"
                  >
                    <img
                      src={sticker.url}
                      alt={sticker.name}
                      className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                    <span className="text-[10px] text-slate-400 truncate max-w-full">{sticker.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 6. Lightbox Modal for Full View Images */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[95vh] flex flex-col items-center w-full">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white text-xs font-bold flex items-center gap-1 bg-slate-800/90 rounded-full px-3.5 shadow-lg border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged media"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-800 select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* 7. Seen by Readers Modal */}
      {selectedReadReaders && (
        <div 
          onClick={() => setSelectedReadReaders(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#111722] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  {lang === 'ar' ? 'شوهدت الرسالة بواسطة:' : 'Seen by readers:'}
                </h4>
              </div>
              <button
                onClick={() => setSelectedReadReaders(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedReadReaders.message.readBy?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  {lang === 'ar' ? 'لم يشاهد أحد هذه الرسالة بعد' : 'No views yet'}
                </p>
              ) : (
                selectedReadReaders.message.readBy?.map((reader) => (
                  <div key={reader.userId} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs text-slate-300 font-bold border border-slate-700 shrink-0">
                        {reader.userAvatar ? (
                          <img src={reader.userAvatar} alt={reader.userName} className="w-full h-full object-cover" />
                        ) : (
                          reader.userName.charAt(0)
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">{reader.userName}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(reader.readAt).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Voice Note Options & Fallback Modal */}
      {showVoiceOptionsModal && (
        <div 
          onClick={() => setShowVoiceOptionsModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 text-slate-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {lang === 'ar' ? 'إرسال تسجيل صوتي للقبيلة' : 'Send Voice Note to Clan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'خيارات التسجيل والصوت المباشر' : 'Voice recording options'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceOptionsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Permission Notice if mic direct access was restricted */}
            {micPermissionError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[11px]">
                    {lang === 'ar' 
                      ? 'تم حظر أو تقييد إذن الميكروفون المباشر في المتصفح أو داخل هذا الإطار.' 
                      : 'Direct microphone permission was blocked or denied.'}
                  </p>
                  <p className="text-[10px] text-amber-300/80 leading-relaxed">
                    {lang === 'ar'
                      ? 'يمكنك تسجيل صوتك بسهولة عبر مسجل الهاتف أو اختيار أي ملف صوتي جاهز من جهازك أدناه:'
                      : 'You can easily record using your phone voice recorder or choose any audio file below:'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Option 1: Mobile Native Recorder */}
              <button
                type="button"
                onClick={() => {
                  setShowVoiceOptionsModal(false);
                  nativeVoiceRecordInputRef.current?.click();
                }}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-between text-start transition-all shadow-lg shadow-emerald-900/30 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-black">
                      {lang === 'ar' ? 'تسجيل فويس عبر مسجل الهاتف 📱' : 'Record via Phone Voice Recorder'}
                    </div>
                    <div className="text-[10px] text-emerald-100/80">
                      {lang === 'ar' ? 'يعمل على أجهزة الجوال دون أي قيود' : 'Works natively on smartphones'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 rtl:rotate-90 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Upload Audio File from Device */}
              <button
                type="button"
                onClick={() => {
                  setShowVoiceOptionsModal(false);
                  audioFileInputRef.current?.click();
                }}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white flex items-center justify-between text-start transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black">
                      {lang === 'ar' ? 'رفع ملف صوتي مسجل من الجهاز 📁' : 'Attach Recorded Audio File'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {lang === 'ar' ? 'يدعم MP3, WebM, M4A, OGG, WAV (حتى 15 ميغابايت)' : 'MP3, WebM, M4A, OGG, WAV (up to 15MB)'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 rtl:rotate-90 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 3: Retry Direct Browser Mic */}
              <button
                type="button"
                onClick={() => {
                  setShowVoiceOptionsModal(false);
                  setTimeout(startVoiceRecording, 100);
                }}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ar' ? 'إعادة طلب صلاحية الميكروفون المباشر' : 'Retry Direct Browser Mic'}</span>
              </button>
            </div>

            {/* Browser Permission Tip */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/90 text-[10px] text-slate-400 leading-relaxed space-y-1">
              <p className="font-semibold text-slate-300">
                {lang === 'ar' ? '💡 لتفعيل الميكروفون في المتصفح:' : '💡 To allow microphone in browser:'}
              </p>
              <p>
                {lang === 'ar'
                  ? 'انقر على أيقونة القفل أو الضبط بجانب رابط الموقع في شريط العناوين ⬅️ اختر "أذونات الموقع" ⬅️ فعّل "الميكروفون" على السماح (Allow).'
                  : 'Click the lock icon next to the URL ➡️ Site settings ➡️ set Microphone to Allow.'}
              </p>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVoiceOptionsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Floating In-App Toast Notification */}
      {chatToast && (
        <div className={`fixed top-4 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-3 max-w-sm text-center ${
          chatToast.type === 'error'
            ? 'bg-red-950/95 border border-red-500/50 text-red-200 shadow-red-950/50'
            : chatToast.type === 'success'
            ? 'bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 shadow-emerald-950/50'
            : 'bg-slate-900/95 border border-slate-700 text-white'
        }`}>
          {chatToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : chatToast.type === 'success' ? (
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{chatToast.text}</span>
          <button
            type="button"
            onClick={() => setChatToast(null)}
            className="ms-2 p-0.5 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

    </div>
  );
};
