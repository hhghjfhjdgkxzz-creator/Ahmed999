import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  Clock,
  Sparkles,
  Users
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

interface ClanChatProps {
  lang: Language;
  currentUser: AuthUser | null;
  currentMember: ClanMember | null;
  clanSettings: ClanSettings;
  messages: ClanMessage[];
  stickers: ClanSticker[];
  isAdmin: boolean;
}

export const ClanChat: React.FC<ClanChatProps> = ({
  lang,
  currentUser,
  currentMember,
  clanSettings,
  messages,
  stickers,
  isAdmin
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [selectedStickerCat, setSelectedStickerCat] = useState<string>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedReadReaders, setSelectedReadReaders] = useState<{ message: ClanMessage } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
      { root: chatContainerRef.current, threshold: 0.6 }
    );

    const messageElements = chatContainerRef.current?.querySelectorAll('[data-message-id]');
    messageElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [messages, currentUser]);

  const canSendMessages = isAdmin || (currentMember && clanSettings.allowMemberMessages);
  const canSendImages = isAdmin || (currentMember && clanSettings.allowMemberImages);
  const canSendStickers = isAdmin || (currentMember && clanSettings.allowMemberStickers);

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
      alert(lang === 'ar' 
        ? `حجم الصورة يتجاوز الحد المسموح به (${(maxSize / (1024 * 1024)).toFixed(1)} ميغابايت)` 
        : `Image exceeds maximum allowed size`);
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/clan/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const imageUrl = data.url;

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
      console.error('Failed to upload image:', err);
      alert(lang === 'ar' ? 'فشل رفع الصورة، يرجى المحاولة مرة أخرى.' : 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Delete this message?')) return;
    await deleteClanMessage(msgId);
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

  const getClanBadge = (role: ClanRole) => {
    switch (role) {
      case 'leader':
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
            👑 {lang === 'ar' ? 'قائد القبيلة' : 'Leader'}
          </span>
        );
      case 'deputy':
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
            ⭐ {lang === 'ar' ? 'نائب القائد' : 'Deputy'}
          </span>
        );
      case 'master':
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
            ✨ {lang === 'ar' ? 'مصمم معتمد' : 'Master Designer'}
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
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

  return (
    <div className="flex flex-col h-[650px] max-h-[80vh] bg-[#0c1017] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      
      {/* Chat Top Banner */}
      <div className="px-4 py-3 bg-[#111722]/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-cyan-500/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
            {clanSettings.icon || '🛡️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">{clanSettings.name}</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {lang === 'ar' ? 'محادثة مشفرة ولحظية' : 'Live Sync'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              {lang === 'ar' ? 'الدردشة الجماعية الحصرية لأعضاء القبيلة المعتمدين' : 'Exclusive Group Chat'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {clanSettings.autoDeleteImagesDays > 0 && (
            <div 
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1"
              title={lang === 'ar' ? `يتم تفريغ الصور تلقائياً بعد ${clanSettings.autoDeleteImagesDays} يوم لتوفير المساحة` : 'Auto-cleanup active'}
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{lang === 'ar' ? `حفظ الصور: ${clanSettings.autoDeleteImagesDays} يوم` : `${clanSettings.autoDeleteImagesDays}d storage`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0d14] to-[#0c1017] scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Sparkles className="w-8 h-8 text-cyan-400/50 animate-bounce" />
            <p className="text-xs font-semibold text-slate-400">
              {lang === 'ar' ? 'لا توجد رسائل سابقة. كن أول من يبدأ المحادثة!' : 'No messages yet. Say hello!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser?.id === msg.senderId;
            const readCount = msg.readBy?.length || 0;
            const otherReaders = (msg.readBy || []).filter(r => r.userId !== msg.senderId);

            return (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 shadow-md">
                  {msg.senderAvatar ? (
                    <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                      {msg.senderName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className={`flex flex-col max-w-[78%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-300">{msg.senderName}</span>
                    {getClanBadge(msg.senderClanRole)}
                    <span className="text-[10px] text-slate-500 font-mono">{formatMessageTime(msg.createdAt)}</span>
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl p-3 shadow-md relative group/bubble ${
                      isMe
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none'
                        : 'bg-[#151c28] border border-slate-800/80 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {/* Message Type 1: Text */}
                    {msg.type === 'text' && (
                      <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}

                    {/* Message Type 2: Image */}
                    {msg.type === 'image' && msg.mediaUrl && (
                      <div className="space-y-1.5">
                        <div 
                          onClick={() => setLightboxImage(msg.mediaUrl || null)}
                          className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 max-w-xs max-h-72 bg-black/40"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Clan media"
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <Maximize2 className="w-5 h-5 drop-shadow-md" />
                            <span className="text-[10px] font-bold">{lang === 'ar' ? 'تكبير' : 'Zoom'}</span>
                          </div>
                        </div>
                        {msg.content && msg.content !== msg.mediaUrl && (
                          <p className="text-[11px] text-slate-300 truncate">{msg.content}</p>
                        )}
                      </div>
                    )}

                    {/* Message Type 3: Sticker */}
                    {msg.type === 'sticker' && msg.mediaUrl && (
                      <div className="flex flex-col items-center">
                        <img
                          src={msg.mediaUrl}
                          alt={msg.content}
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain hover:scale-110 transition-transform filter drop-shadow-lg"
                        />
                        <span className="text-[10px] text-slate-400 mt-1">{msg.content}</span>
                      </div>
                    )}

                    {/* Actions on hover (Delete for admin or sender) */}
                    {(isAdmin || isMe) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover/bubble:opacity-100 transition-opacity hover:bg-red-500 shadow-md cursor-pointer"
                        title={lang === 'ar' ? 'حذف الرسالة' : 'Delete message'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Read Receipts Indicators */}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {/* Seen by indicator */}
                    {otherReaders.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReadReaders({ message: msg })}
                        className="flex items-center gap-1 text-[10px] text-cyan-400/90 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>
                          {lang === 'ar' 
                            ? `شوهدت بواسطة ${otherReaders.length}` 
                            : `Seen by ${otherReaders.length}`}
                        </span>
                      </button>
                    ) : isMe ? (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Check className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'ar' ? 'مرسلة' : 'Sent'}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Warning if Chat Disabled by management */}
      {!canSendMessages && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            {lang === 'ar' 
              ? 'إرسال الرسائل معطل مؤقتاً في إعدادات القبيلة من قبل الإدارة.' 
              : 'Messages sending is temporarily disabled by management.'}
          </span>
        </div>
      )}

      {/* Input & Attachments Controls */}
      <div className="p-3 bg-[#111722] border-t border-slate-800 z-10 relative">
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          
          {/* Sticker Button */}
          <button
            type="button"
            disabled={!canSendStickers}
            onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              isStickerPickerOpen
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            } ${!canSendStickers ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={lang === 'ar' ? 'إرسال استيكر القبيلة' : 'Stickers'}
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Image Upload Button */}
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
            className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer ${
              (!canSendImages || isUploadingImage) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={lang === 'ar' ? 'إرسال صورة (تخزين سحابي معزول)' : 'Send Image'}
          >
            {isUploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!canSendMessages}
            placeholder={
              canSendMessages
                ? (lang === 'ar' ? 'اكتب رسالتك لأعضاء القبيلة...' : 'Type message...')
                : (lang === 'ar' ? 'المحادثة مغلقة مؤقتاً...' : 'Chat disabled')
            }
            className="flex-1 h-10 px-4 rounded-xl bg-[#0a0d14] border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSendMessages || !inputText.trim() || isSending}
            className="px-4 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Sticker Picker Drawer */}
        {isStickerPickerOpen && (
          <div className="absolute bottom-16 right-3 left-3 sm:left-auto sm:w-96 bg-[#131926] border border-slate-700/80 rounded-2xl p-3 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'استيكرات قبيلة المصممين' : 'Clan Stickers'}
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
            <div className="flex items-center gap-1 pb-2 overflow-x-auto text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedStickerCat(cat)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
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
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => handleSendSticker(sticker)}
                  className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 hover:border-amber-500/50 transition-all flex flex-col items-center gap-1 cursor-pointer group"
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
        )}
      </div>

      {/* Lightbox Modal for Full View Images */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white text-sm font-bold flex items-center gap-1 bg-slate-800/80 rounded-full px-3"
            >
              <X className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged media"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Seen by Readers Modal */}
      {selectedReadReaders && (
        <div 
          onClick={() => setSelectedReadReaders(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#111722] border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
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
                      <div className="w-7 h-7 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-xs text-slate-300 font-bold border border-slate-700">
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

    </div>
  );
};
