import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  LogIn, 
  Send,
  Phone,
  Link as LinkIcon,
  X,
  Flame,
  Award
} from 'lucide-react';
import { 
  ClanSettings, 
  ClanMember, 
  ClanJoinRequest, 
  ClanMessage, 
  ClanSticker, 
  AuthUser, 
  Language 
} from '../../types';
import { submitClanJoinRequest } from '../../lib/clanService';
import { ClanChat } from './ClanChat';

interface ClanViewProps {
  lang: Language;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onBackToStore: () => void;
  clanSettings: ClanSettings;
  members: ClanMember[];
  requests: ClanJoinRequest[];
  messages: ClanMessage[];
  stickers: ClanSticker[];
  isAdmin: boolean;
}

export const ClanView: React.FC<ClanViewProps> = ({
  lang,
  currentUser,
  onOpenAuth,
  onBackToStore,
  clanSettings,
  members,
  requests,
  messages,
  stickers,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'members'>('overview');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinNote, setJoinNote] = useState('');
  const [joinWhatsapp, setJoinWhatsapp] = useState('');
  const [joinPortfolio, setJoinPortfolio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);

  // Check current user status in clan
  const currentMember = currentUser ? members.find(m => m.userId === currentUser.id) || null : null;
  const userRequest = currentUser ? requests.find(r => r.userId === currentUser.id) || null : null;
  
  // Can access chat if accepted member or admin
  const isAcceptedMember = Boolean(currentMember && currentMember.status === 'active');
  const canAccessChat = isAdmin || isAcceptedMember;

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const request: ClanJoinRequest = {
        id: `req_${currentUser.id}_${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email || '',
        userAvatar: currentUser.avatar || '',
        userRole: currentUser.role,
        whatsapp: joinWhatsapp.trim() || currentUser.whatsapp || '',
        portfolioUrl: joinPortfolio.trim(),
        note: joinNote.trim() || (lang === 'ar' ? 'أود الانضمام لقبيلة المصممين والمشاركة في إبداعات المتجر' : 'Requesting to join clan'),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await submitClanJoinRequest(request);
      setJoinSuccessMessage(lang === 'ar' 
        ? '✓ تم إرسال طلب الانضمام بنجاح! سيتم مراجعته من قبل إدارة القبيلة قريباً.' 
        : 'Join request submitted successfully!');
      setIsJoinModalOpen(false);
      setJoinNote('');
      setJoinWhatsapp('');
      setJoinPortfolio('');
    } catch (err) {
      console.error('Error submitting join request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStore}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover:translate-x-1" />
          <span>{lang === 'ar' ? 'العودة إلى متجر التصاميم' : 'Back to Store'}</span>
        </button>

        {/* Status Indicator Tag */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md shadow-amber-500/10">
              <Crown className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'صلاحيات قائد وإدارة القبيلة' : 'Clan Leader / Admin'}</span>
            </span>
          ) : isAcceptedMember ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'عضو معتمد في القبيلة' : 'Official Clan Member'}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Success Banner if join request just submitted */}
      {joinSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-between text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{joinSuccessMessage}</span>
          </div>
          <button onClick={() => setJoinSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Banner of the Clan */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0e121b]">
        {/* Background Image / Gradient */}
        <div className="absolute inset-0 z-0">
          <img
            src={clanSettings.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80'}
            alt="Clan Banner"
            className="w-full h-full object-cover opacity-25 filter blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090c13] via-[#090c13]/90 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                  {clanSettings.icon || '👑'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                    {clanSettings.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    VIP CLAN
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-cyan-400 font-semibold mt-0.5">
                  {lang === 'ar' ? 'القبيلة الرسمية لنخبة مصممي ومبدعي مؤثرات البث المباشر' : 'Official Designers Clan'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {clanSettings.description}
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{members.length} {lang === 'ar' ? 'عضو منضم' : 'Members'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{messages.length} {lang === 'ar' ? 'رسالة وصورة بالدردشة' : 'Messages'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{stickers.length} {lang === 'ar' ? 'استيكر حصري' : 'Stickers'}</span>
              </div>
            </div>
          </div>

          {/* User Status Card & Action Button */}
          <div className="bg-[#121724]/90 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-md max-w-sm w-full space-y-4 shrink-0 shadow-2xl">
            {/* Case 1: Accepted Member or Admin */}
            {canAccessChat ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      {lang === 'ar' ? 'أنت عضو معتمد بالقبيلة!' : 'Welcome Member!'}
                    </h4>
                    <p className="text-[11px] text-emerald-400">
                      {isAdmin 
                        ? (lang === 'ar' ? 'كامل صلاحيات الإدارة والتحكم متاحة لك' : 'Full leadership access')
                        : (lang === 'ar' ? 'يمكنك المشاركة وإرسال الصور والاستيكرات' : 'Access granted')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'الدخول إلى الدردشة الجماعية 🔥' : 'Open Clan Chat'}</span>
                </button>
              </div>
            ) : userRequest?.status === 'pending' ? (
              /* Case 2: Request is Pending review */
              <div className="space-y-3 text-center sm:text-right">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-black text-white">
                      {lang === 'ar' ? 'طلب الانضمام قيد المراجعة ⏳' : 'Request Pending'}
                    </h4>
                    <p className="text-[11px] text-amber-300">
                      {lang === 'ar' ? 'طلبك معروض حالياً لدى إدارة القبيلة وسيتم الرد قريباً' : 'Under admin review'}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-right">
                  <span>تاريخ إرسال الطلب: {new Date(userRequest.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>
              </div>
            ) : userRequest?.status === 'rejected' ? (
              /* Case 3: Rejected */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      {lang === 'ar' ? 'تم رفض طلب الانضمام ❌' : 'Request Declined'}
                    </h4>
                    <p className="text-[11px] text-red-300">
                      {userRequest.rejectionReason || (lang === 'ar' ? 'لم يتم استيفاء شروط الانضمام للقبيلة' : 'Requirements not met')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  {lang === 'ar' ? 'إعادة تقديم طلب انضمام جديد' : 'Re-apply'}
                </button>
              </div>
            ) : (
              /* Case 4: Not yet requested / Not logged in */
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-black text-white">
                    {lang === 'ar' ? 'انضم إلى قبيلة المصممين 🛡️' : 'Join the Designers Clan'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {lang === 'ar' 
                      ? 'مساحة مخصصة لمصممي ومبدعي الهدايا. يتطلب الانضمام موافقة إدارة الموقع.' 
                      : 'Exclusive space for designers. Requires approval.'}
                  </p>
                </div>

                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(true)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تقديم طلب الانضمام للقبيلة' : 'Request to Join'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تسجيل الدخول لطلب الانضمام' : 'Login to Join'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (نظرة عامة / الدردشة الجماعية / الأعضاء) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تعريف بالقبيلة والشروط' : 'Overview & Rules'}</span>
        </button>

        <button
          onClick={() => {
            if (!canAccessChat) {
              alert(lang === 'ar' 
                ? '⚠️ عذراً، الدردشة الجماعية متاحة فقط لأعضاء القبيلة المقبولين من قبل الإدارة.' 
                : 'Chat is restricted to approved members.');
              return;
            }
            setActiveTab('chat');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          } ${!canAccessChat ? 'opacity-60' : ''}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{lang === 'ar' ? 'الدردشة الجماعية للقبيلة' : 'Group Chat'}</span>
          {!canAccessChat && (
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
              {lang === 'ar' ? 'خاص بالأعضاء' : 'Members only'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ar' ? 'أعضاء القبيلة' : 'Members'} ({members.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & RULES */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-[#0f1420] border border-slate-800 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'عن قبيلة المصممين ومميزاتها' : 'About Designers Clan'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'ar'
                  ? 'تأسست قبيلة المصممين لتكون الحاضنة الرسمية والمجتمع الحصري لمبدعي ومصممي مؤثرات البث المباشر (SVGA, MP4, VFX). تهدف القبيلة إلى تعزيز التعاون بين المصممين، تبادل الخبرات الفنية، وتنسيق الطلبيات الخاصة، ومشاركة الاستيكرات والملفات ذات الجودة العالية.'
                  : 'Designers Clan is the premier exclusive community for live VFX creators.'}
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    👑 {lang === 'ar' ? 'دردشة حصرية ومشفرة' : 'Private Group Chat'}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' ? 'تواصل لحظي بين أعضاء القبيلة ومسؤولي الموقع دون أي إعلانات أو متطفلين.' : 'Instant encrypted chat.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                    🎨 {lang === 'ar' ? 'مكتبة استيكرات خاصة' : 'Custom Stickers'}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' ? 'استيكرات وتفاعلات فنية مصممة خصيصاً للتعبير داخل دردشة القبيلة.' : 'Expressive visual stickers.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="text-purple-400 font-bold text-xs flex items-center gap-1.5">
                    📸 {lang === 'ar' ? 'مشاركة وتخزين الصور بذكاء' : 'Smart Photo Storage'}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' ? 'رفع صور التصاميم والملفات مع سياسة حذف وتوفير مساحة آلية تضمن الأداء العالي.' : 'Automated high-speed media.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                    🛡️ {lang === 'ar' ? 'رتب وأوسمة فخرية' : 'Honorary Ranks'}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'ar' ? 'شارات مميزة للمصممين المحترفين وقادة القبيلة ونوابهم مع ظهور خاص.' : 'Distinguished badges.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Clan Rules */}
            <div className="p-6 rounded-3xl bg-[#0f1420] border border-slate-800 space-y-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>{lang === 'ar' ? 'شروط وقوانين القبيلة' : 'Clan Rules'}</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span>{lang === 'ar' ? 'يمنع نشر أي محتوى مسيء أو خارج عن اختصاص التصميم ومؤثرات البث المباشر.' : 'Keep content relevant to design & VFX.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span>{lang === 'ar' ? 'الاحترام المتبادل بين جميع الأعضاء ومراعاة سرية مشاريع التصاميم الخاصة.' : 'Respect member privacy and project integrity.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>{lang === 'ar' ? 'عدم رفع ملفات أو صور ضارة أو مخالفة للقوانين.' : 'No malicious media.'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">4.</span>
                  <span>{lang === 'ar' ? 'يحق لإدارة القبيلة إزالة أي عضو يخالف التعليمات بعد تنبيهه.' : 'Management reserves right to suspend violators.'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Leaders & Master Designers Spotlight */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-[#0f1420] border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'قيادة ومؤسسو القبيلة' : 'Clan Leadership'}</span>
              </h3>

              <div className="space-y-3">
                {members.filter(m => m.clanRole === 'leader' || m.clanRole === 'deputy').map((mem) => (
                  <div key={mem.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border-2 border-amber-400/80 shrink-0">
                      {mem.userAvatar ? (
                        <img src={mem.userAvatar} alt={mem.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-amber-400">
                          {mem.userName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">{mem.userName}</h5>
                      <span className="text-[10px] text-amber-400 font-semibold block">
                        {mem.clanRole === 'leader' ? '👑 قائد القبيلة' : '⭐ نائب القائد'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Button */}
            {!canAccessChat && (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-transparent border border-amber-500/30 text-center space-y-3">
                <h4 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'هل أنت مصمم مؤثرات؟' : 'Are you a VFX Designer?'}
                </h4>
                <p className="text-xs text-slate-300">
                  {lang === 'ar' ? 'قدم طلبك الآن وانضم إلى النخبة للمشاركة في الدردشة وتبادل الخبرات.' : 'Apply now to join.'}
                </p>
                <button
                  type="button"
                  onClick={() => currentUser ? setIsJoinModalOpen(true) : onOpenAuth()}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {lang === 'ar' ? 'تقديم طلب الانضمام' : 'Apply Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLAN GROUP CHAT */}
      {activeTab === 'chat' && (
        <div>
          {canAccessChat ? (
            <ClanChat
              lang={lang}
              currentUser={currentUser}
              currentMember={currentMember}
              clanSettings={clanSettings}
              messages={messages}
              stickers={stickers}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="p-16 rounded-3xl bg-[#0f1420] border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Crown className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">
                {lang === 'ar' ? 'الدردشة الجماعية حصرية لأعضاء القبيلة' : 'Clan Members Only'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar' 
                  ? 'يتطلب الدخول إلى الدردشة الجماعية موافقة مسبقة من إدارة الموقع بعد تقديم طلب الانضمام.' 
                  : 'Approval required.'}
              </p>
              <button
                type="button"
                onClick={() => currentUser ? setIsJoinModalOpen(true) : onOpenAuth()}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                {lang === 'ar' ? 'تقديم طلب الانضمام' : 'Request to Join'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span>{lang === 'ar' ? 'دليل أعضاء قبيلة المصممين' : 'Clan Members Directory'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {members.length} {lang === 'ar' ? 'عضو معتمد' : 'Approved Members'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-2xl bg-[#0f1420] border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                  {mem.userAvatar ? (
                    <img src={mem.userAvatar} alt={mem.userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-300">
                      {mem.userName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{mem.userName}</h4>
                  <span className="text-[10px] text-cyan-400 font-semibold block truncate">
                    {mem.clanRole === 'leader' 
                      ? '👑 قائد القبيلة' 
                      : mem.clanRole === 'deputy' 
                      ? '⭐ نائب القائد' 
                      : mem.clanRole === 'master' 
                      ? '✨ مصمم معتمد' 
                      : '🛡️ عضو القبيلة'}
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    انضم {new Date(mem.joinedAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Submit Join Request */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleJoinSubmit} className="w-full max-w-md bg-[#111722] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'طلب الانضمام إلى قبيلة المصممين' : 'Apply to Join Clan'}</span>
              </h4>
              <button type="button" onClick={() => setIsJoinModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'يرجى تقديم بياناتك ونبذة عن خبرتك بالتصميم ومؤثرات البث المباشر لمراجعتها من قبل الإدارة.'
                : 'Please fill out your application for review.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'رسالة أو نبذة للمسؤولين:' : 'Application Note:'}
              </label>
              <textarea
                value={joinNote}
                onChange={(e) => setJoinNote(e.target.value)}
                placeholder={lang === 'ar' ? 'أود الانضمام للقبيلة، لدي خبرة في تصميم مؤثرات SVGA و3D...' : 'Tell us about your experience...'}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'رقم الواتساب للتواصل والتحقق:' : 'WhatsApp Number:'}
              </label>
              <input
                type="text"
                value={joinWhatsapp}
                onChange={(e) => setJoinWhatsapp(e.target.value)}
                placeholder="+966501234567"
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'رابط معرض الأعمال أو نماذج التصاميم (اختياري):' : 'Portfolio Link (Optional):'}
              </label>
              <input
                type="url"
                value={joinPortfolio}
                onChange={(e) => setJoinPortfolio(e.target.value)}
                placeholder="https://behance.net/..."
                className="w-full h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-extrabold shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإرسال...' : (lang === 'ar' ? 'إرسال الطلب' : 'Submit Application')}
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  );
};
