import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from './firebase';
import { 
  ClanSettings, 
  ClanMember, 
  ClanJoinRequest, 
  ClanMessage, 
  ClanSticker, 
  ClanAuditLog, 
  ClanRole,
  AuthUser 
} from '../types';

export const CLAN_ID = 'main_clan';

export const DEFAULT_CLAN_SETTINGS: ClanSettings = {
  id: CLAN_ID,
  name: 'قبيلة المصممين',
  description: 'الملتقى الحصري لنخبة مبدعي ومصممي مؤثرات الهدايا والبث المباشر (SVGA, MP4, VFX). مساحة تعاونية لتبادل الأفكار، الاستيكرات، والملفات، وتطوير المهارات الاحترافية.',
  icon: '👑',
  bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
  isOpenForRequests: true,
  allowMemberImages: true,
  allowMemberStickers: true,
  allowMemberMessages: true,
  autoDeleteImagesDays: 30, // 30 days default cleanup
  maxImageSizeBytes: 5 * 1024 * 1024 // 5MB
};

export const INITIAL_CLAN_STICKERS: ClanSticker[] = [
  {
    id: 'stk_1',
    name: 'تاج الملك 👑',
    url: 'https://cdn-icons-png.flaticon.com/512/6941/6941697.png',
    category: 'VIP',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_2',
    name: 'ريشة الإبداع 🎨',
    url: 'https://cdn-icons-png.flaticon.com/512/2970/2970785.png',
    category: 'تصميم',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_3',
    name: 'نار الشغف 🔥',
    url: 'https://cdn-icons-png.flaticon.com/512/785/785116.png',
    category: 'تفاعل',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_4',
    name: 'صاروخ الإطلاق 🚀',
    url: 'https://cdn-icons-png.flaticon.com/512/1356/1356479.png',
    category: 'تفاعل',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_5',
    name: 'ماسة فاخرة 💎',
    url: 'https://cdn-icons-png.flaticon.com/512/1907/1907722.png',
    category: 'VIP',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_6',
    name: 'موافق تماماً 👍',
    url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png',
    category: 'تفاعل',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_7',
    name: 'قلب ذهبي 💛',
    url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
    category: 'تفاعل',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_8',
    name: 'درع الحماية 🛡️',
    url: 'https://cdn-icons-png.flaticon.com/512/942/942748.png',
    category: 'VIP',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_CLAN_MEMBERS: ClanMember[] = [
  {
    id: 'EMP-001',
    userId: 'EMP-001',
    userName: 'Destroy KING Designer (المدير العام)',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    userRole: 'admin',
    clanRole: 'leader',
    joinedAt: '2025-01-01T00:00:00.000Z',
    addedBy: 'النظام',
    status: 'active',
    title: 'قائد ومؤسس القبيلة'
  },
  {
    id: 'EMP-002',
    userId: 'EMP-002',
    userName: 'JiaWei Lead VFX (كبير المصممين)',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    userRole: 'designer',
    clanRole: 'deputy',
    joinedAt: '2025-01-02T00:00:00.000Z',
    addedBy: 'EMP-001',
    status: 'active',
    title: 'نائب القائد وخبير الـ SVGA'
  }
];

// Helper to safely get cached data
function getCache<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setCache(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// 1. Subscribe to Clan Settings
export function subscribeToClanSettings(callback: (settings: ClanSettings) => void) {
  const cached = getCache<ClanSettings>('clan_settings_cache', DEFAULT_CLAN_SETTINGS);
  callback(cached);

  const settingsDocRef = doc(db, 'clan_settings', CLAN_ID);
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      const data = { ...DEFAULT_CLAN_SETTINGS, ...(snap.data() as ClanSettings) };
      setCache('clan_settings_cache', data);
      callback(data);
    } else {
      // Seed default clan settings
      setDoc(settingsDocRef, DEFAULT_CLAN_SETTINGS, { merge: true }).catch(() => {});
      callback(DEFAULT_CLAN_SETTINGS);
    }
  }, (err) => {
    console.warn('Firestore clan settings snapshot error, using cache:', err);
    callback(cached);
  });
}

export async function updateClanSettings(updates: Partial<ClanSettings>): Promise<void> {
  const settingsDocRef = doc(db, 'clan_settings', CLAN_ID);
  const data = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  try {
    await setDoc(settingsDocRef, data, { merge: true });
  } catch (err) {
    console.warn('Failed to update clan settings in Firestore, saving locally:', err);
  }
  const current = getCache<ClanSettings>('clan_settings_cache', DEFAULT_CLAN_SETTINGS);
  setCache('clan_settings_cache', { ...current, ...data });
}

// 2. Subscribe to Clan Members
export function subscribeToClanMembers(callback: (members: ClanMember[]) => void) {
  const cached = getCache<ClanMember[]>('clan_members_cache', INITIAL_CLAN_MEMBERS);
  callback(cached);

  const colRef = collection(db, 'clan_members');
  return onSnapshot(colRef, (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClanMember));
      setCache('clan_members_cache', list);
      callback(list);
    } else {
      // Seed initial members if empty
      INITIAL_CLAN_MEMBERS.forEach(m => {
        setDoc(doc(db, 'clan_members', m.id), m).catch(() => {});
      });
      callback(INITIAL_CLAN_MEMBERS);
    }
  }, (err) => {
    console.warn('Firestore clan members error, using cache:', err);
    callback(cached);
  });
}

export async function addClanMember(member: ClanMember): Promise<void> {
  const memberDoc = doc(db, 'clan_members', member.id);
  try {
    await setDoc(memberDoc, member);
  } catch (err) {
    console.warn('Error saving clan member to Firestore:', err);
  }
  const cached = getCache<ClanMember[]>('clan_members_cache', INITIAL_CLAN_MEMBERS);
  const updated = [...cached.filter(m => m.id !== member.id), member];
  setCache('clan_members_cache', updated);
}

export async function updateClanMemberRole(memberId: string, clanRole: ClanRole, title?: string): Promise<void> {
  const memberDoc = doc(db, 'clan_members', memberId);
  const payload: any = { clanRole };
  if (title !== undefined) payload.title = title;
  try {
    await updateDoc(memberDoc, payload);
  } catch (err) {
    console.warn('Error updating clan member role in Firestore:', err);
  }
  const cached = getCache<ClanMember[]>('clan_members_cache', INITIAL_CLAN_MEMBERS);
  const updated = cached.map(m => m.id === memberId ? { ...m, ...payload } : m);
  setCache('clan_members_cache', updated);
}

export async function removeClanMember(memberId: string): Promise<void> {
  const memberDoc = doc(db, 'clan_members', memberId);
  try {
    await deleteDoc(memberDoc);
  } catch (err) {
    console.warn('Error deleting clan member in Firestore:', err);
  }
  const cached = getCache<ClanMember[]>('clan_members_cache', INITIAL_CLAN_MEMBERS);
  const updated = cached.filter(m => m.id !== memberId);
  setCache('clan_members_cache', updated);
}

// 3. Subscribe to Join Requests
export function subscribeToClanRequests(callback: (requests: ClanJoinRequest[]) => void) {
  const cached = getCache<ClanJoinRequest[]>('clan_requests_cache', []);
  callback(cached);

  const colRef = collection(db, 'clan_requests');
  return onSnapshot(colRef, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClanJoinRequest));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCache('clan_requests_cache', list);
    callback(list);
  }, (err) => {
    console.warn('Firestore clan requests error:', err);
    callback(cached);
  });
}

export async function submitClanJoinRequest(request: ClanJoinRequest): Promise<void> {
  const requestDoc = doc(db, 'clan_requests', request.id);
  try {
    await setDoc(requestDoc, request);
  } catch (err) {
    console.warn('Error saving clan request in Firestore:', err);
  }
  const cached = getCache<ClanJoinRequest[]>('clan_requests_cache', []);
  const updated = [request, ...cached.filter(r => r.id !== request.id)];
  setCache('clan_requests_cache', updated);
}

export async function updateClanJoinRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected', 
  reviewerName: string, 
  rejectionReason?: string
): Promise<void> {
  const requestDoc = doc(db, 'clan_requests', requestId);
  const payload: any = {
    status,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString()
  };
  if (rejectionReason) payload.rejectionReason = rejectionReason;

  try {
    await updateDoc(requestDoc, payload);
  } catch (err) {
    console.warn('Error updating clan request status in Firestore:', err);
  }
  const cached = getCache<ClanJoinRequest[]>('clan_requests_cache', []);
  const updated = cached.map(r => r.id === requestId ? { ...r, ...payload } : r);
  setCache('clan_requests_cache', updated);
}

// 4. Subscribe to Clan Messages
export function subscribeToClanMessages(callback: (messages: ClanMessage[]) => void) {
  const cached = getCache<ClanMessage[]>('clan_messages_cache', [
    {
      id: 'msg_welcome',
      senderId: 'EMP-001',
      senderName: 'Destroy KING Designer 👑',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      senderClanRole: 'leader',
      content: 'مرحباً بجميع المصممين والمبدعين في قبيلة المصممين! 🌟 هنا مساحتكم للتواصل، الإبداع، وتبادل أحدث المؤثرات والاستيكرات.',
      type: 'text',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      readBy: []
    }
  ]);
  callback(cached);

  const colRef = collection(db, 'clan_messages');
  return onSnapshot(colRef, (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClanMessage));
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setCache('clan_messages_cache', list);
      callback(list);
    } else {
      callback(cached);
    }
  }, (err) => {
    console.warn('Firestore clan messages error:', err);
    callback(cached);
  });
}

export async function sendClanMessage(message: ClanMessage): Promise<void> {
  const msgDoc = doc(db, 'clan_messages', message.id);
  try {
    await setDoc(msgDoc, message);
  } catch (err) {
    console.warn('Error saving clan message to Firestore:', err);
  }
  const cached = getCache<ClanMessage[]>('clan_messages_cache', []);
  const updated = [...cached, message];
  setCache('clan_messages_cache', updated);
}

export async function deleteClanMessage(messageId: string): Promise<void> {
  const msgDoc = doc(db, 'clan_messages', messageId);
  try {
    await deleteDoc(msgDoc);
  } catch (err) {}
  const cached = getCache<ClanMessage[]>('clan_messages_cache', []);
  const updated = cached.filter(m => m.id !== messageId);
  setCache('clan_messages_cache', updated);
}

export async function markClanMessageAsRead(messageId: string, user: AuthUser): Promise<void> {
  if (!user || !user.id) return;
  const cached = getCache<ClanMessage[]>('clan_messages_cache', []);
  const target = cached.find(m => m.id === messageId);
  if (!target) return;

  const alreadyRead = target.readBy?.some(r => r.userId === user.id);
  if (alreadyRead) return;

  const reader = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    readAt: new Date().toISOString()
  };

  const updatedReadBy = [...(target.readBy || []), reader];
  const updated = cached.map(m => m.id === messageId ? { ...m, readBy: updatedReadBy } : m);
  setCache('clan_messages_cache', updated);

  try {
    const msgDoc = doc(db, 'clan_messages', messageId);
    await updateDoc(msgDoc, {
      readBy: arrayUnion(reader)
    });
  } catch (e) {}
}

// 5. Subscribe to Stickers
export function subscribeToClanStickers(callback: (stickers: ClanSticker[]) => void) {
  const cached = getCache<ClanSticker[]>('clan_stickers_cache', INITIAL_CLAN_STICKERS);
  callback(cached);

  const colRef = collection(db, 'clan_stickers');
  return onSnapshot(colRef, (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClanSticker));
      setCache('clan_stickers_cache', list);
      callback(list);
    } else {
      INITIAL_CLAN_STICKERS.forEach(s => {
        setDoc(doc(db, 'clan_stickers', s.id), s).catch(() => {});
      });
      callback(INITIAL_CLAN_STICKERS);
    }
  }, (err) => {
    console.warn('Firestore clan stickers error:', err);
    callback(cached);
  });
}

export async function addClanSticker(sticker: ClanSticker): Promise<void> {
  const stkDoc = doc(db, 'clan_stickers', sticker.id);
  try {
    await setDoc(stkDoc, sticker);
  } catch (err) {}
  const cached = getCache<ClanSticker[]>('clan_stickers_cache', INITIAL_CLAN_STICKERS);
  const updated = [sticker, ...cached.filter(s => s.id !== sticker.id)];
  setCache('clan_stickers_cache', updated);
}

export async function deleteClanSticker(stickerId: string): Promise<void> {
  const stkDoc = doc(db, 'clan_stickers', stickerId);
  try {
    await deleteDoc(stkDoc);
  } catch (err) {}
  const cached = getCache<ClanSticker[]>('clan_stickers_cache', INITIAL_CLAN_STICKERS);
  const updated = cached.filter(s => s.id !== stickerId);
  setCache('clan_stickers_cache', updated);
}

// 6. Audit Logs
export function subscribeToClanAuditLogs(callback: (logs: ClanAuditLog[]) => void) {
  const cached = getCache<ClanAuditLog[]>('clan_audit_logs_cache', []);
  callback(cached);

  const colRef = collection(db, 'clan_audit_logs');
  return onSnapshot(colRef, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClanAuditLog));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setCache('clan_audit_logs_cache', list);
    callback(list);
  }, (err) => {
    callback(cached);
  });
}

export async function logClanAudit(action: string, details: string, admin: AuthUser): Promise<void> {
  const logItem: ClanAuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    details,
    adminId: admin?.id || 'admin',
    adminName: admin?.name || 'الإدارة',
    timestamp: new Date().toISOString()
  };

  const logDoc = doc(db, 'clan_audit_logs', logItem.id);
  try {
    await setDoc(logDoc, logItem);
  } catch (e) {}

  const cached = getCache<ClanAuditLog[]>('clan_audit_logs_cache', []);
  const updated = [logItem, ...cached];
  setCache('clan_audit_logs_cache', updated);
}
