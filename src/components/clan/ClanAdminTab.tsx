import React, { useState, useEffect } from 'react';
import { 
  Users,
  Mic,
  Volume2,
  MessageSquareX,
  AlertCircle, 
  UserCheck, 
  UserX, 
  Settings, 
  Image as ImageIcon, 
  Smile, 
  Trash2, 
  ShieldAlert, 
  History, 
  Check, 
  X, 
  Sparkles, 
  HardDrive, 
  Clock, 
  Upload, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  ShieldCheck,
  Award
} from 'lucide-react';
import { 
  ClanSettings, 
  ClanMember, 
  ClanJoinRequest, 
  ClanMessage, 
  ClanSticker, 
  ClanAuditLog, 
  ClanRole, 
  AuthUser, 
  Language 
} from '../../types';
import { 
  updateClanSettings, 
  addClanMember, 
  updateClanMemberRole, 
  removeClanMember, 
  updateClanJoinRequestStatus, 
  addClanSticker, 
  deleteClanSticker, 
  logClanAudit,
  clearAllClanMessages
} from '../../lib/clanService';
import { deleteClanImagesFromCloud, purgeAllClanChatAndMedia } from '../../lib/clanStorage';

interface ClanAdminTabProps {
  lang: Language;
  currentUser: AuthUser;
  clanSettings: ClanSettings;
  setClanSettings: React.Dispatch<React.SetStateAction<ClanSettings>>;
  members: ClanMember[];
  requests: ClanJoinRequest[];
  messages: ClanMessage[];
  stickers: ClanSticker[];
  auditLogs: ClanAuditLog[];
}

export const ClanAdminTab: React.FC<ClanAdminTabProps> = ({
  lang,
  currentUser,
  clanSettings,
  setClanSettings,
  members,
  requests,
  messages,
  stickers,
  auditLogs
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'members' | 'settings' | 'storage' | 'stickers' | 'logs'>('requests');
  
  // Storage stats state
  const [storageStats, setStorageStats] = useState<{
    count: number;
    totalBytes: number;
    formattedSize: string;
    files: Array<{ name: string; url: string; size: number; mtime: string }>;
  }>({
    count: 0,
    totalBytes: 0,
    formattedSize: '0 KB',
    files: []
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Modals state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isDeleteImagesModalOpen, setIsDeleteImagesModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'older_than'>('older_than');
  const [deleteOlderDays, setDeleteOlderDays] = useState(30);
  const [isDeletingImages, setIsDeletingImages] = useState(false);
  const [isPurgingAllChatModalOpen, setIsPurgingAllChatModalOpen] = useState(false);
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  // New Sticker state
  const [isAddStickerOpen, setIsAddStickerOpen] = useState(false);
  const [newStickerName, setNewStickerName] = useState('');
  const [newStickerUrl, setNewStickerUrl] = useState('');
  const [newStickerCategory, setNewStickerCategory] = useState('تفاعل');

  // Load storage stats
  const fetchStorageStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/clan/stats');
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch (e) {
      console.warn('Error fetching clan storage stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  // Stats calculation
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const imageMessages = messages.filter(m => m.type === 'image');

  // Handle Approve Request
  const handleApproveRequest = async (request: ClanJoinRequest) => {
    await updateClanJoinRequestStatus(request.id, 'approved', currentUser.name);

    // Add to members list
    const newMember: ClanMember = {
      id: request.userId,
      userId: request.userId,
      userName: request.userName,
      userAvatar: request.userAvatar,
      userRole: request.userRole,
      clanRole: 'member',
      joinedAt: new Date().toISOString(),
      addedBy: currentUser.name,
      status: 'active',
      title: 'عضو جديد في القبيلة'
    };

    await addClanMember(newMember);
    await logClanAudit(
      'approve_request',
      `تمت الموافقة على طلب انضمام العضو (${request.userName}) إلى القبيلة بواسطة ${currentUser.name}`,
      currentUser
    );
  };

  // Handle Reject Request
  const handleRejectRequestSubmit = async () => {
    if (!rejectingRequestId) return;
    const req = requests.find(r => r.id === rejectingRequestId);
    await updateClanJoinRequestStatus(rejectingRequestId, 'rejected', currentUser.name, rejectionReason.trim());
    await logClanAudit(
      'reject_request',
      `تم رفض طلب انضمام (${req?.userName || rejectingRequestId}) - السبب: ${rejectionReason || 'بدون سبب معلن'}`,
      currentUser
    );
    setRejectingRequestId(null);
    setRejectionReason('');
  };

  // Handle Member Role change
  const handleChangeRole = async (memberId: string, newRole: ClanRole) => {
    const mem = members.find(m => m.id === memberId);
    await updateClanMemberRole(memberId, newRole);
    await logClanAudit(
      'update_member_role',
      `تم تغيير رتبة العضو (${mem?.userName}) إلى (${newRole})`,
      currentUser
    );
  };

  // Handle Member Removal
  const handleRemoveMember = async (member: ClanMember) => {
    if (!confirm(lang === 'ar' ? `هل أنت متأكد من إزالة (${member.userName}) من القبيلة؟` : `Remove ${member.userName}?`)) return;
    await removeClanMember(member.id);
    await logClanAudit(
      'remove_member',
      `تمت إزالة العضو (${member.userName}) من القبيلة`,
      currentUser
    );
  };

  // Handle Clan Settings Submit
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateClanSettings(clanSettings);
    await logClanAudit(
      'update_settings',
      'تم تحديث إعدادات وهوية وصلاحيات قبيلة المصممين',
      currentUser
    );
    setDeleteSuccessToast(lang === 'ar' ? '✓ تم حفظ إعدادات القبيلة بنجاح!' : 'Clan settings saved!');
    setTimeout(() => setDeleteSuccessToast(null), 4000);
  };

  // Delete single image/media
  const handleDeleteSingleImage = async (fileItem: { name: string; url: string }) => {
    if (!confirm(lang === 'ar' ? `هل أنت متأكد من حذف هذه الصورة نهائياً؟` : `Delete this image permanently?`)) return;
    setDeletingImageId(fileItem.name);
    try {
      // 1. Delete matching messages from Firestore & local
      const msgMatch = messages.find(m => m.mediaUrl === fileItem.url || m.content === fileItem.name);
      if (msgMatch) {
        const { deleteClanMessage } = await import('../../lib/clanService');
        await deleteClanMessage(msgMatch.id);
      }
      // 2. Delete from cloud/server
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      try {
        await deleteDoc(doc(db, 'clan_media', fileItem.name));
      } catch (e) {}

      // 3. Call server if exists
      try {
        await fetch('/api/clan/delete-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'single', filename: fileItem.name })
        });
      } catch (e) {}

      setDeleteSuccessToast(lang === 'ar' ? '✓ تم حذف الصورة بنجاح' : 'Image deleted');
      setTimeout(() => setDeleteSuccessToast(null), 3000);
      await logClanAudit('delete_single_image', `تم حذف صورة محددة (${fileItem.name}) بواسطة الإدارة`, currentUser);
      fetchStorageStats();
    } catch (err) {
      console.error('Error deleting single image:', err);
    } finally {
      setDeletingImageId(null);
    }
  };

  // Handle Purge All Chat, Messages, Audio, and Storage
  const handleExecutePurgeAllChat = async () => {
    setIsPurgingAll(true);
    try {
      const res = await purgeAllClanChatAndMedia();
      setDeleteSuccessToast(
        lang === 'ar'
          ? `✓ تم حذف وتصفير جميع محادثات القبيلة (${res.deletedMessages} رسالة) وكافة الصور والتسجيلات الصوتية!`
          : `✓ All chat, images, and voice notes purged successfully!`
      );
      setTimeout(() => setDeleteSuccessToast(null), 5000);
      await logClanAudit(
        'purge_all_chat',
        `تم حذف جميع محادثات الدردشة الكتابية والصور والتسجيلات الصوتية وتفريغ المساحة بالكامل`,
        currentUser
      );
      setIsPurgingAllChatModalOpen(false);
      fetchStorageStats();
    } catch (e) {
      console.warn('Error purging chat:', e);
      setDeleteSuccessToast(lang === 'ar' ? '⚠️ حدث خطأ أثناء حذف الدردشة' : 'Failed to purge chat');
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    } finally {
      setIsPurgingAll(false);
    }
  };

  // Handle Safe Clan Image Deletion
  const handleExecuteDeleteImages = async () => {
    setIsDeletingImages(true);
    try {
      const res = await fetch('/api/clan/delete-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: deleteMode,
          days: deleteOlderDays
        })
      });

      const data = await res.json();
      if (data.success) {
        setDeleteSuccessToast(data.message || `تم حذف الصور وتوفير المساحة`);
        setTimeout(() => setDeleteSuccessToast(null), 4000);
        await logClanAudit(
          'delete_images',
          `تم تنفيذ عملية حذف صور القبيلة (${deleteMode === 'all' ? 'جميع الصور' : `الصور الأقدم من ${deleteOlderDays} يوم`}) - تم حذف ${data.deletedCount} ملف وتوفير ${data.freedSizeFormatted}`,
          currentUser
        );
        fetchStorageStats();
      }
    } catch (e) {
      console.warn('Error deleting clan images:', e);
      setDeleteSuccessToast(lang === 'ar' ? '⚠️ فشل حذف الصور، حاول مرة أخرى' : 'Failed to delete images');
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    } finally {
      setIsDeletingImages(false);
      setIsDeleteImagesModalOpen(false);
    }
  };

  // Handle Add Sticker
  const handleAddStickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickerName.trim() || !newStickerUrl.trim()) return;

    const sticker: ClanSticker = {
      id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newStickerName.trim(),
      url: newStickerUrl.trim(),
      category: newStickerCategory.trim() || 'تفاعل',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    await addClanSticker(sticker);
    await logClanAudit(
      'add_sticker',
      `تمت إضافة استيكر جديد (${sticker.name}) في تصنيف (${sticker.category})`,
      currentUser
    );

    setNewStickerName('');
    setNewStickerUrl('');
    setIsAddStickerOpen(false);
  };

  const handleDeleteSticker = async (sticker: ClanSticker) => {
    if (!confirm(lang === 'ar' ? `حذف الاستيكر (${sticker.name})؟` : `Delete sticker ${sticker.name}?`)) return;
    await deleteClanSticker(sticker.id);
    await logClanAudit(
      'delete_sticker',
      `تم حذف الاستيكر (${sticker.name})`,
      currentUser
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {deleteSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold">{deleteSuccessToast}</span>
          </div>
          <button onClick={() => setDeleteSuccessToast(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Clan Stats Cards */}
      <div className="grid grid-cols-2 min-[640px]:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Members */}
        <div className="p-4 rounded-2xl bg-[#111722] border border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">{lang === 'ar' ? 'أعضاء القبيلة' : 'Members'}</p>
            <h4 className="text-lg font-black text-white">{members.length}</h4>
          </div>
        </div>

        {/* Card 2: Pending Requests */}
        <div className="p-4 rounded-2xl bg-[#111722] border border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">{lang === 'ar' ? 'طلبات الانضمام' : 'Pending'}</p>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black text-white">{pendingRequests.length}</h4>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 animate-pulse">
                  {lang === 'ar' ? 'بانتظارك' : 'New'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Messages & Images */}
        <div className="p-4 rounded-2xl bg-[#111722] border border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">{lang === 'ar' ? 'الرسائل والصور' : 'Chat & Media'}</p>
            <h4 className="text-lg font-black text-white">{messages.length}</h4>
          </div>
        </div>

        {/* Card 4: Clan Storage Used */}
        <div className="p-4 rounded-2xl bg-[#111722] border border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">{lang === 'ar' ? 'تخزين صور القبيلة' : 'Clan Storage'}</p>
            <h4 className="text-lg font-black text-emerald-400">{storageStats.formattedSize}</h4>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-xs sm:text-sm">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'requests'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{lang === 'ar' ? 'طلبات الانضمام' : 'Join Requests'}</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'members'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ar' ? 'قائمة الأعضاء' : 'Members'} ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إعدادات وهوية القبيلة' : 'Clan Settings'}</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('storage');
            fetchStorageStats();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'storage'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إدارة الصور والتخزين' : 'Images & Storage'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stickers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'stickers'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>{lang === 'ar' ? 'مكتبة الاستيكرات' : 'Stickers'} ({stickers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{lang === 'ar' ? 'سجل العمليات الإدارية' : 'Audit Logs'}</span>
        </button>
      </div>

      {/* SUBTAB 1: Join Requests */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" />
              <span>{lang === 'ar' ? 'طلبات الانضمام إلى قبيلة المصممين' : 'Clan Join Requests'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'لا يتمكن أي مستخدم من دخول القبيلة أو الدردشة إلا بعد الموافقة عليه' : 'Approval required'}
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111722] border border-slate-800 text-slate-500 space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">
                {lang === 'ar' ? 'لا توجد طلبات انضمام حالياً.' : 'No pending requests.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-[#111722] border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                      {req.userAvatar ? (
                        <img src={req.userAvatar} alt={req.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                          {req.userName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{req.userName}</span>
                        <span className="text-xs text-slate-500 font-mono">({req.userId})</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {req.status === 'pending' ? '⏳ قيد المراجعة' : req.status === 'approved' ? '✓ مقبول' : '✕ مرفوض'}
                        </span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          "{req.note}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        {req.whatsapp && (
                          <span className="font-mono text-emerald-400">واتساب: {req.whatsapp}</span>
                        )}
                        <span>تاريخ التقديم: {new Date(req.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                        {req.reviewedBy && (
                          <span className="text-slate-500">تمت المراجعة بواسطة: {req.reviewedBy}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for Pending Requests */}
                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveRequest(req)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'قبول العضو' : 'Approve'}</span>
                      </button>

                      <button
                        onClick={() => setRejectingRequestId(req.id)}
                        className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'رفض' : 'Reject'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Members List */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>{lang === 'ar' ? 'أعضاء ورتب قبيلة المصممين' : 'Clan Members & Roles'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'يمكن تعديل الرتب أو إزالة أي عضو في أي وقت' : 'Manage roles & access'}
            </span>
          </div>

          <div className="grid gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-2xl bg-[#111722] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                    {member.userAvatar ? (
                      <img src={member.userAvatar} alt={member.userName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                        {member.userName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{member.userName}</span>
                      <span className="text-xs text-slate-500 font-mono">({member.userId})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>اللقب: {member.title || 'عضو معتمد'}</span>
                      <span>•</span>
                      <span>تاريخ الانضمام: {new Date(member.joinedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Clan Role Selector */}
                  <select
                    value={member.clanRole}
                    onChange={(e) => handleChangeRole(member.id, e.target.value as ClanRole)}
                    className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold cursor-pointer"
                  >
                    <option value="leader">👑 قائد القبيلة (Leader)</option>
                    <option value="deputy">⭐ نائب القائد (Deputy)</option>
                    <option value="master">✨ مصمم معتمد (Master)</option>
                    <option value="member">🛡️ عضو القبيلة (Member)</option>
                  </select>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'إزالة من القبيلة' : 'Remove Member'}
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Clan Settings & Permissions */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-3xl bg-[#111722] border border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'هوية ومعلومات القبيلة' : 'Identity & Brand'}</span>
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'ar' ? 'اسم القبيلة' : 'Clan Name'}
                </label>
                <input
                  type="text"
                  value={clanSettings.name}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'ar' ? 'رمز أو إيموجي الأيقونة' : 'Icon / Emoji'}
                </label>
                <input
                  type="text"
                  value={clanSettings.icon || ''}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="👑 أو 🛡️"
                  className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'الوصف التعريفي للقبيلة' : 'Description'}
              </label>
              <textarea
                value={clanSettings.description}
                onChange={(e) => setClanSettings(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'رابط بنر غلاف صفحة القبيلة (URL)' : 'Cover Banner URL'}
              </label>
              <input
                type="text"
                value={clanSettings.bannerUrl || ''}
                onChange={(e) => setClanSettings(prev => ({ ...prev, bannerUrl: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Permissions & Chat Policy */}
          <div className="p-6 rounded-3xl bg-[#111722] border border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'صلاحيات الدردشة والتفاعل للأعضاء' : 'Chat & Interaction Permissions'}</span>
            </h4>

            <div className="space-y-3">
              {/* Toggle 1: Requests Open */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {lang === 'ar' ? 'فتح استقبال طلبات الانضمام' : 'Open Join Requests'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'إظهار زر طلب الانضمام لجميع الزوار والمستخدمين' : 'Show join button on main clan page'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clanSettings.isOpenForRequests}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, isOpenForRequests: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 rounded"
                />
              </label>

              {/* Toggle 2: Messages */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {lang === 'ar' ? 'السماح للأعضاء بإرسال الرسائل النصية' : 'Allow Member Messages'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'إذا تم التعطيل، يقتصر الإرسال على الإدارة فقط' : 'Only admins if unchecked'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clanSettings.allowMemberMessages}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, allowMemberMessages: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 rounded"
                />
              </label>

              {/* Toggle 3: Images */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {lang === 'ar' ? 'السماح برفع وإرسال الصور في المجموعة' : 'Allow Member Image Uploads'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'التحكم في إمكانية إرفاق ومشاركة الصور' : 'Control media attachments'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clanSettings.allowMemberImages}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, allowMemberImages: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 rounded"
                />
              </label>

              {/* Toggle: Voice Notes / Audio */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {lang === 'ar' ? 'السماح بتسجيل وإرسال الفويس الصوتي في المجموعة 🎙️' : 'Allow Voice Notes / Audio'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'تسجيل رسائل صوتية مباشرة وسماعها من قِبل جميع أعضاء القبيلة' : 'Direct voice messaging'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clanSettings.allowMemberAudio !== false}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, allowMemberAudio: e.target.checked }))}
                  className="w-5 h-5 accent-emerald-500 rounded"
                />
              </label>

              {/* Toggle 4: Stickers */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {lang === 'ar' ? 'السماح بإرسال استيكرات القبيلة' : 'Allow Stickers'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'إرسال الاستيكرات المعتمدة من قبل الإدارة' : 'Send clan approved stickers'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clanSettings.allowMemberStickers}
                  onChange={(e) => setClanSettings(prev => ({ ...prev, allowMemberStickers: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 rounded"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/20 cursor-pointer"
          >
            {lang === 'ar' ? '✓ حفظ كافة الإعدادات والصلاحيات' : 'Save Clan Settings'}
          </button>
        </form>
      )}

      {/* SUBTAB 4: Images & Storage Management */}
      {activeSubTab === 'storage' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#111722] border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                  <span>{lang === 'ar' ? 'نظام تخزين صور القبيلة وتوفير المساحة' : 'Clan Images Storage'}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar' 
                    ? 'يتم حفظ صور القبيلة في مجلد مخصص ومعزول بالكامل عن صور ومؤثرات الهدايا لضمان حماية بيانات المتجر.' 
                    : 'Clan images stored in isolated storage.'}
                </p>
              </div>

              {/* Actions: Clear Images & Purge All Chat */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteImagesModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حذف صور القبيلة' : 'Delete Clan Images'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPurgingAllChatModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer border border-red-500/50 animate-pulse"
                >
                  <MessageSquareX className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حذف جميع تكييفات ومحادثات الدردشة والصور' : 'Purge All Chat & Media'}</span>
                </button>
              </div>
            </div>

            {/* Storage Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'المساحة المستخدمة حالياً' : 'Storage Used'}</span>
                <span className="text-xl font-black text-emerald-400">{storageStats.formattedSize}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'عدد الصور في مساحة القبيلة' : 'Images Count'}</span>
                <span className="text-xl font-black text-white">{storageStats.count} {lang === 'ar' ? 'ملف' : 'files'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{lang === 'ar' ? 'سياسة الحذف التلقائي' : 'Auto Cleanup'}</span>
                <span className="text-sm font-bold text-amber-400">
                  {clanSettings.autoDeleteImagesDays > 0 
                    ? (lang === 'ar' ? `كل ${clanSettings.autoDeleteImagesDays} يوم` : `Every ${clanSettings.autoDeleteImagesDays} days`)
                    : (lang === 'ar' ? 'معطل (يدوي فقط)' : 'Manual only')}
                </span>
              </div>
            </div>

            {/* Auto Delete Interval Setting */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  {lang === 'ar' ? 'مدة الاحتفاظ التلقائي بالصور' : 'Auto Retention Period'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {lang === 'ar' ? 'حذف الصور القديمة تلقائياً لتفادي استهلاك مساحة السيرفر' : 'Auto-purge old photos'}
                </span>
              </div>

              <select
                value={clanSettings.autoDeleteImagesDays}
                onChange={async (e) => {
                  const days = Number(e.target.value);
                  setClanSettings(prev => ({ ...prev, autoDeleteImagesDays: days }));
                  await updateClanSettings({ autoDeleteImagesDays: days });
                }}
                className="h-10 px-4 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={7}>{lang === 'ar' ? 'حذف تلقائي بعد 7 أيام' : 'After 7 days'}</option>
                <option value={15}>{lang === 'ar' ? 'حذف تلقائي بعد 15 يوماً' : 'After 15 days'}</option>
                <option value={30}>{lang === 'ar' ? 'حذف تلقائي بعد 30 يوماً (مستحسن)' : 'After 30 days (Recommended)'}</option>
                <option value={60}>{lang === 'ar' ? 'حذف تلقائي بعد 60 يوماً' : 'After 60 days'}</option>
                <option value={0}>{lang === 'ar' ? 'تعطيل الحذف التلقائي (حفظ دائم)' : 'Disable auto-delete'}</option>
              </select>
            </div>
          </div>

          {/* Uploaded Files Gallery Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'معاينة الصور المرفوعة في القبيلة' : 'Clan Uploaded Images'}</span>
              </h4>
              <button
                onClick={fetchStorageStats}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تحديث المعاينة' : 'Refresh'}</span>
              </button>
            </div>

            {(() => {
                // Combine both server storage stats files AND images sent in messages so ALL uploaded images from any user are 100% visible
                const msgImages = messages
                  .filter(m => m.type === 'image' && m.mediaUrl)
                  .map(m => ({
                    name: m.content || m.id,
                    url: m.mediaUrl as string,
                    size: m.mediaSize || 50000,
                    senderName: m.senderName,
                    msgId: m.id
                  }));

                const allDisplayImages: Array<{ name: string; url: string; size: number; senderName?: string; msgId?: string }> = [
                  ...storageStats.files,
                  ...msgImages.filter(mi => !storageStats.files.some(sf => sf.url === mi.url))
                ];

                if (allDisplayImages.length === 0) {
                  return (
                    <div className="p-10 rounded-2xl bg-[#111722] border border-slate-800 text-center text-slate-500">
                      <p className="text-xs">{lang === 'ar' ? 'لا توجد صور مرفوعة في مساحة القبيلة حالياً.' : 'No images found.'}</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {allDisplayImages.map((file, idx) => (
                      <div key={file.msgId || file.name || idx} className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-square shadow-md">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        {/* Delete button overlay on each image */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleImage(file)}
                          className="absolute top-2 end-2 p-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition-all z-10 opacity-90 hover:opacity-100 hover:scale-110 cursor-pointer"
                          title={lang === 'ar' ? 'حذف هذه الصورة نهائياً' : 'Delete this image'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {/* Info banner */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2.5 flex flex-col justify-end pointer-events-none">
                          <span className="text-[10px] font-bold text-white truncate">{file.name}</span>
                          {file.senderName && (
                            <span className="text-[9px] text-amber-300 truncate">بواسطة: {file.senderName}</span>
                          )}
                          <span className="text-[9px] text-cyan-300 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* SUBTAB 5: Stickers Library */}
      {activeSubTab === 'stickers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Smile className="w-5 h-5 text-purple-400" />
                <span>{lang === 'ar' ? 'مكتبة استيكرات القبيلة' : 'Clan Stickers Library'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? 'الاستيكرات التي ترفعها هنا تظهر فوراً لجميع الأعضاء في شريط الدردشة' : 'Available for all clan members'}
              </p>
            </div>

            <button
              onClick={() => setIsAddStickerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة استيكر جديد' : 'Add Sticker'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {stickers.map((stk) => (
              <div
                key={stk.id}
                className="p-3 rounded-2xl bg-[#111722] border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col items-center gap-2 group relative"
              >
                <div className="w-16 h-16 flex items-center justify-center p-1">
                  <img src={stk.url} alt={stk.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center w-full">
                  <span className="text-xs font-bold text-white block truncate">{stk.name}</span>
                  <span className="text-[10px] text-purple-400 block">{stk.category}</span>
                </div>
                <button
                  onClick={() => handleDeleteSticker(stk)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title="حذف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: Audit Logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              <span>{lang === 'ar' ? 'سجل العمليات الإدارية لقبيلة المصممين' : 'Clan Audit Logs'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'توثيق رسمي لعمليات الحذف والموافقات' : 'Administrative log'}
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#111722] border border-slate-800 text-center text-slate-500">
              <p className="text-xs">{lang === 'ar' ? 'لا توجد سجلات بعد.' : 'No audit records.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#111722] border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                    <div>
                      <p className="font-semibold text-slate-200">{log.details}</p>
                      <span className="text-[10px] text-slate-500">المسؤول: {log.adminName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Reject Request with reason */}
      {rejectingRequestId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#111722] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-400" />
                <span>{lang === 'ar' ? 'تأكيد رفض طلب الانضمام' : 'Reject Join Request'}</span>
              </h4>
              <button onClick={() => setRejectingRequestId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'سبب الرفض (يظهر للمستخدم):' : 'Rejection Reason:'}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: يرجى إرفاق نماذج أعمال أو التواصل على الواتساب أولاً...' : 'Reason...'}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleRejectRequestSubmit}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20"
              >
                {lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Clan Images Confirmation Modal */}
      {isDeleteImagesModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#111722] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-white">
                {lang === 'ar' ? 'تأكيد حذف صور قبيلة المصممين' : 'Delete Clan Images'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'سيتم حذف الصور الفعلية من مساحة تخزين القبيلة وتفريغ المساحة. لن تتأثر صور ومؤثرات الهدايا بأي شكل.'
                  : 'Permanently deletes clan media.'}
              </p>
            </div>

            <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="delmode"
                  checked={deleteMode === 'older_than'}
                  onChange={() => setDeleteMode('older_than')}
                  className="accent-cyan-500"
                />
                <span>{lang === 'ar' ? 'حذف الصور القديمة فقط (المحددة بالأيام)' : 'Delete older images only'}</span>
              </label>

              {deleteMode === 'older_than' && (
                <div className="pr-6 space-y-1">
                  <select
                    value={deleteOlderDays}
                    onChange={(e) => setDeleteOlderDays(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value={7}>{lang === 'ar' ? 'الأقدم من 7 أيام' : 'Older than 7 days'}</option>
                    <option value={15}>{lang === 'ar' ? 'الأقدم من 15 يوماً' : 'Older than 15 days'}</option>
                    <option value={30}>{lang === 'ar' ? 'الأقدم من 30 يوماً' : 'Older than 30 days'}</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-red-300 cursor-pointer pt-2 border-t border-slate-800">
                <input
                  type="radio"
                  name="delmode"
                  checked={deleteMode === 'all'}
                  onChange={() => setDeleteMode('all')}
                  className="accent-red-500"
                />
                <span>{lang === 'ar' ? 'حذف جميع صور القبيلة بدون استثناء (تفريغ كامل)' : 'Delete ALL clan images'}</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteImagesModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingImages}
                onClick={handleExecuteDeleteImages}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isDeletingImages ? 'جاري الحذف...' : (lang === 'ar' ? 'تأكيد الحذف الآن' : 'Execute Deletion')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Sticker Modal */}
      {isAddStickerOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleAddStickerSubmit} className="w-full max-w-md bg-[#111722] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-purple-400" />
                <span>{lang === 'ar' ? 'إضافة استيكر جديد للقبيلة' : 'Add New Clan Sticker'}</span>
              </h4>
              <button type="button" onClick={() => setIsAddStickerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'اسم أو وصف الاستيكر:' : 'Sticker Name:'}
              </label>
              <input
                type="text"
                value={newStickerName}
                onChange={(e) => setNewStickerName(e.target.value)}
                placeholder="مثال: تاج فخم 👑"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'رابط صورة الاستيكر المباشر (PNG شفافة أو WebP):' : 'Sticker Image URL:'}
              </label>
              <input
                type="text"
                value={newStickerUrl}
                onChange={(e) => setNewStickerUrl(e.target.value)}
                placeholder="https://.../sticker.png"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'التصنيف:' : 'Category:'}
              </label>
              <select
                value={newStickerCategory}
                onChange={(e) => setNewStickerCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              >
                <option value="تفاعل">تفاعل (Reactions)</option>
                <option value="VIP">VIP (متميز)</option>
                <option value="تصميم">تصميم (Design)</option>
                <option value="تهنئة">تهنئة (Congratulations)</option>
              </select>
            </div>

            {newStickerUrl && (
              <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-center">
                <img src={newStickerUrl} alt="Preview" className="w-16 h-16 object-contain" onError={() => {}} />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddStickerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20"
              >
                {lang === 'ar' ? 'إضافة الاستيكر' : 'Save Sticker'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
