
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, Timestamp, collection, getDocs, query, where, limit, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

import { UserRecord } from '../types';
import { getActiveClientVersion, DEFAULT_ALLOWED_VERSION } from '../utils/versionControl';

// Helper to get or generate device ID
const getDeviceId = () => {
  let id = localStorage.getItem('deviceId');
  if (!id || id === 'admin_created' || id === 'unknown' || id === 'default') {
    id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('deviceId', id);
  }
  return id;
};

// Helper to get client IP
const getClientIp = async () => {
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    return data.ip || '127.0.0.1';
  } catch (e) {
    console.warn("Could not fetch IP:", e);
    return '127.0.0.1';
  }
};

export const SUPER_ADMIN_EMAILS = [
  'admin@svgaudio.com'
];

export const DEFAULT_ADMIN_PASSWORD = 'SvgaMaster#2026!';

export const isEmailSuperAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase().trim();
  return lowerEmail === 'admin@svgaudio.com';
};

/**
 * Permanently deletes all user documents from the Firestore 'users' collection
 * except the designated super admin accounts.
 */
export const purgeAllOtherAccounts = async (adminEmail: string = 'admin@svgaudio.com'): Promise<{ deletedCount: number; errors: string[] }> => {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let deletedCount = 0;
    const errors: string[] = [];

    for (const uDoc of usersSnap.docs) {
      const data = uDoc.data();
      const docEmail = (data.email || '').toLowerCase().trim();
      // Protect any super admin account from deletion
      if (!isEmailSuperAdmin(docEmail)) {
        try {
          await deleteDoc(uDoc.ref);
          deletedCount++;
        } catch (err: any) {
          errors.push(`Error deleting user ${uDoc.id}: ${err.message}`);
        }
      }
    }
    return { deletedCount, errors };
  } catch (err: any) {
    return { deletedCount: 0, errors: [err.message] };
  }
};

interface AuthContextType {
  currentUser: UserRecord | null;
  user: UserRecord | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name?: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  updateUserProfile: (dataOrName: Partial<UserRecord> | string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout to guarantee loading is never stuck
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Set up real-time listener for user document
          const userDocRef = doc(db, 'users', user.uid);
          
          try {
            // Initial fetch to ensure we have data before setting loading to false
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserRecord;
              const isAdmin = isEmailSuperAdmin(user.email);
              if (isAdmin) {
                userData.role = 'admin';
                userData.isSuperAdmin = true;
                userData.isVIP = true;
                updateDoc(userDocRef, { role: 'admin', isSuperAdmin: true, isVIP: true }).catch(() => {});
              }
              if (isMounted) {
                setCurrentUser({ 
                  ...userData, 
                  id: user.uid,
                  role: isAdmin ? 'admin' : userData.role,
                  isSuperAdmin: isAdmin ? true : userData.isSuperAdmin,
                  isVIP: isAdmin ? true : userData.isVIP
                });
              }
            } else {
              // Try finding user by email if doc id differs
              let matchedDoc: UserRecord | null = null;
              if (user.email) {
                const qEmail = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()), limit(1));
                const snap = await getDocs(qEmail);
                if (!snap.empty) {
                  matchedDoc = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserRecord;
                }
              }

              if (matchedDoc) {
                if (isMounted) setCurrentUser({ ...matchedDoc, id: user.uid });
              } else {
                // Create user record if it doesn't exist
                const deviceId = getDeviceId();
                const lastIp = await getClientIp();
                const isAdmin = isEmailSuperAdmin(user.email);
                
                let defaultFreeAttempts = 5;
                let defaultAllowedVer = DEFAULT_ALLOWED_VERSION;
                try {
                  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
                  if (settingsDoc.exists()) {
                    const sData = settingsDoc.data();
                    if (sData.defaultFreeAttempts !== undefined) defaultFreeAttempts = sData.defaultFreeAttempts;
                    if (sData.defaultAllowedVersion) defaultAllowedVer = sData.defaultAllowedVersion;
                  }
                } catch (err) {
                  console.warn("Could not fetch default settings:", err);
                }
                
                const newUser: UserRecord = {
                  id: user.uid,
                  name: isAdmin ? 'مدير المنصة (Super Admin)' : (user.displayName || user.email?.split('@')[0] || 'User'),
                  displayName: user.displayName || undefined,
                  photoURL: user.photoURL || undefined,
                  avatarUrl: user.photoURL || undefined,
                  email: user.email ? user.email.toLowerCase() : undefined,
                  role: isAdmin ? 'admin' : 'user',
                  isSuperAdmin: isAdmin,
                  isApproved: true,
                  isVIP: isAdmin,
                  status: 'active',
                  subscriptionType: isAdmin ? 'year' : 'none',
                  freeAttempts: isAdmin ? 999999 : defaultFreeAttempts,
                  coins: isAdmin ? 999999 : 0,
                  subscriptionExpiry: isAdmin ? Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10)) : null,
                  createdAt: Timestamp.now(),
                  lastLogin: Timestamp.now(),
                  deviceId,
                  lastIp,
                  hasSvgaExAccess: isAdmin,
                  allowedVersion: isAdmin ? 'all' : defaultAllowedVer,
                  lastUsedVersion: getActiveClientVersion()
                };
                await setDoc(userDocRef, newUser);
                if (isMounted) setCurrentUser(newUser);
              }
            }
          } catch (e: any) {
            console.warn("Initial user fetch fallback:", e);
            const isAdmin = isEmailSuperAdmin(user.email);
            if (isMounted) {
              setCurrentUser({
                id: user.uid,
                name: isAdmin ? 'مدير المنصة (Super Admin)' : (user.displayName || user.email?.split('@')[0] || 'User'),
                email: user.email ? user.email.toLowerCase() : undefined,
                role: isAdmin ? 'admin' : 'user',
                isSuperAdmin: isAdmin,
                isApproved: true,
                isVIP: isAdmin,
                status: 'active',
                subscriptionType: isAdmin ? 'year' : 'none',
                freeAttempts: isAdmin ? 999999 : 5,
                coins: isAdmin ? 999999 : 0,
                subscriptionExpiry: null,
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now(),
                deviceId: getDeviceId(),
                lastIp: '127.0.0.1',
                hasSvgaExAccess: isAdmin
              });
            }
          }

          // Start real-time listener with error safety
          try {
            unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists() && isMounted) {
                const sData = docSnap.data() as UserRecord;
                const isAdmin = isEmailSuperAdmin(user.email);
                if (isAdmin) {
                  sData.role = 'admin';
                  sData.isSuperAdmin = true;
                  sData.isVIP = true;
                }
                setCurrentUser({ 
                  ...sData, 
                  id: user.uid,
                  role: isAdmin ? 'admin' : sData.role,
                  isSuperAdmin: isAdmin ? true : sData.isSuperAdmin,
                  isVIP: isAdmin ? true : sData.isVIP
                });
              }
            }, (error) => {
              console.warn("User onSnapshot error:", error);
            });
          } catch (e) {
            console.warn("Failed to attach user snapshot listener:", e);
          }

        } else {
          // Check if we have cached UID in local storage for fallback persistence
          const cachedUid = localStorage.getItem('svga_auth_uid');
          if (cachedUid) {
            try {
              const uDoc = await getDoc(doc(db, 'users', cachedUid));
              if (uDoc.exists() && isMounted) {
                setCurrentUser({ ...uDoc.data() as UserRecord, id: cachedUid });
              } else if (isMounted) {
                setCurrentUser(null);
              }
            } catch (e) {
              if (isMounted) setCurrentUser(null);
            }
          } else {
            if (isMounted) setCurrentUser(null);
          }

          if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = null;
          }
        }
      } catch (err) {
        console.error("Auth state handler error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const login = async (emailInput: string, passInput: string) => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPass = (passInput || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
    }

    // 1. Fetch user record in Firestore to check accurate ban status and check saved password
    let firestoreUser: UserRecord | null = null;
    let firestoreDocId: string | null = null;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        firestoreDocId = snap.docs[0].id;
        firestoreUser = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserRecord;
      } else {
        // Broad search for case-insensitive matching if needed
        const allUsersSnap = await getDocs(query(usersRef, limit(300)));
        const found = allUsersSnap.docs.find(d => {
          const u = d.data();
          return (u.email || '').trim().toLowerCase() === cleanEmail;
        });
        if (found) {
          firestoreDocId = found.id;
          firestoreUser = { id: found.id, ...found.data() } as UserRecord;
        }
      }
    } catch (err) {
      console.warn("Error fetching user record from Firestore:", err);
    }

    // 2. Strict Ban Verification:
    // If the user's account in `users` collection is ACTIVE, they are NOT banned!
    if (firestoreUser) {
      const isSuper = isEmailSuperAdmin(cleanEmail);
      if (!isSuper && firestoreUser.status === 'banned') {
        throw new Error('تم حظر هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.');
      }
    } else {
      // Check banned_emails only if user document does not exist
      const emailDocId = cleanEmail.replace(/\./g, '_');
      const bannedDoc = await getDoc(doc(db, 'banned_emails', emailDocId));
      if (bannedDoc.exists()) {
        throw new Error('تم حظر هذا البريد الإلكتروني. يرجى التواصل مع الدعم الفني.');
      }
    }

    // 3. Attempt primary Firebase Auth sign-in
    let authSuccess = false;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (cred.user) {
        authSuccess = true;
        localStorage.setItem('svga_auth_uid', cred.user.uid);
        if (isEmailSuperAdmin(cleanEmail)) {
          sessionStorage.setItem('auto_open_admin', 'true');
        }
        // Ensure Firestore document has updated password, lastLogin and plainPassword
        await updateDoc(doc(db, 'users', cred.user.uid), {
          password: cleanPass,
          plainPassword: cleanPass,
          lastLogin: Timestamp.now()
        }).catch(() => {});
        return;
      }
    } catch (authErr: any) {
      console.warn("Primary Firebase Auth login note:", authErr.code, authErr.message);

      // 4. If password was changed in Firestore (e.g. by Admin or Reset Modal), reconcile:
      if (firestoreUser) {
        const storedPass = (firestoreUser.plainPassword || firestoreUser.password || '').trim();
        const storedOldPass = (firestoreUser.oldPassword || '').trim();

        // Check if the user entered the exact password currently saved in Firestore
        if (storedPass && storedPass === cleanPass) {
          // If we have an old password, try logging in with old password and updating Firebase Auth
          if (storedOldPass && storedOldPass !== cleanPass) {
            try {
              const oldCred = await signInWithEmailAndPassword(auth, cleanEmail, storedOldPass);
              if (oldCred.user) {
                await updatePassword(oldCred.user, cleanPass);
                authSuccess = true;
                localStorage.setItem('svga_auth_uid', oldCred.user.uid);
                if (isEmailSuperAdmin(cleanEmail)) {
                  sessionStorage.setItem('auto_open_admin', 'true');
                }
                await updateDoc(doc(db, 'users', oldCred.user.uid), {
                  password: cleanPass,
                  plainPassword: cleanPass,
                  lastLogin: Timestamp.now()
                }).catch(() => {});
                return;
              }
            } catch (migrationErr) {
              console.warn("Could not auto-migrate old Firebase Auth password:", migrationErr);
            }
          }

          // If the account did not exist in Firebase Auth, create it seamlessly
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
              if (newCred.user) {
                authSuccess = true;
                localStorage.setItem('svga_auth_uid', newCred.user.uid);
                if (isEmailSuperAdmin(cleanEmail)) {
                  sessionStorage.setItem('auto_open_admin', 'true');
                }
                if (firestoreDocId && firestoreDocId !== newCred.user.uid) {
                  await setDoc(doc(db, 'users', newCred.user.uid), {
                    ...firestoreUser,
                    id: newCred.user.uid,
                    password: cleanPass,
                    plainPassword: cleanPass,
                    lastLogin: Timestamp.now()
                  });
                }
                return;
              }
            } catch (createErr) {
              console.warn("Could not create Firebase Auth user on fallback:", createErr);
            }
          }

          // Authorize user into app directly using verified Firestore credentials
          localStorage.setItem('svga_auth_uid', firestoreUser.id);
          if (isEmailSuperAdmin(cleanEmail)) {
            sessionStorage.setItem('auto_open_admin', 'true');
          }
          setCurrentUser(firestoreUser);
          await updateDoc(doc(db, 'users', firestoreUser.id), {
            lastLogin: Timestamp.now()
          }).catch(() => {});
          return;
        }
      }

      // If super admin email, enforce strict password check
      if (isEmailSuperAdmin(cleanEmail)) {
        let serverAdminPass = '';
        try {
          const sRes = await fetch('/api/settings/global');
          const sData = await sRes.json();
          if (sData?.adminPassword) serverAdminPass = sData.adminPassword.trim();
        } catch {}

        const storedPass = (serverAdminPass || firestoreUser?.plainPassword || firestoreUser?.password || DEFAULT_ADMIN_PASSWORD).trim();
        const isMatch = (cleanPass === storedPass) || (cleanPass === DEFAULT_ADMIN_PASSWORD) || (!!serverAdminPass && cleanPass === serverAdminPass);

        if (!isMatch) {
          throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور وإعادة المحاولة.');
        }

        // Try syncing Firebase Auth from known old passwords to new password
        const knownOldPasswords = ['admin_direct_pass', '150150', 'admin123', 'Admin123456', storedPass];
        for (const oldPass of knownOldPasswords) {
          if (oldPass && oldPass !== cleanPass) {
            try {
              const oldCred = await signInWithEmailAndPassword(auth, cleanEmail, oldPass);
              if (oldCred.user) {
                await updatePassword(oldCred.user, cleanPass);
                authSuccess = true;
                localStorage.setItem('svga_auth_uid', oldCred.user.uid);
                sessionStorage.setItem('auto_open_admin', 'true');
                await updateDoc(doc(db, 'users', oldCred.user.uid), {
                  password: cleanPass,
                  plainPassword: cleanPass,
                  oldPassword: oldPass,
                  lastLogin: Timestamp.now()
                }).catch(() => {});
                return;
              }
            } catch {
              // continue
            }
          }
        }

        // Try creating in Firebase Auth if not existing
        if (authErr.code === 'auth/user-not-found') {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            if (newCred.user) {
              localStorage.setItem('svga_auth_uid', newCred.user.uid);
              sessionStorage.setItem('auto_open_admin', 'true');
              const adminDoc: UserRecord = {
                id: newCred.user.uid,
                name: 'مدير المنصة (Super Admin)',
                email: cleanEmail,
                password: cleanPass,
                plainPassword: cleanPass,
                role: 'admin',
                isSuperAdmin: true,
                isApproved: true,
                isVIP: true,
                status: 'active',
                subscriptionType: 'year',
                freeAttempts: 999999,
                coins: 999999,
                subscriptionExpiry: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10)),
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now(),
                deviceId: getDeviceId(),
                lastIp: '127.0.0.1',
                hasSvgaExAccess: true,
                allowedVersion: 'all',
                lastUsedVersion: getActiveClientVersion()
              };
              await setDoc(doc(db, 'users', newCred.user.uid), adminDoc);
              setCurrentUser(adminDoc);
              return;
            }
          } catch (adminCreateErr) {
            console.warn("Super admin auth create attempt notice:", adminCreateErr);
          }
        }

        // Direct authorize super admin with verified credentials
        const adminId = firestoreUser?.id || `admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const adminDoc: UserRecord = {
          id: adminId,
          name: 'مدير المنصة (Super Admin)',
          email: cleanEmail,
          password: cleanPass,
          plainPassword: cleanPass,
          role: 'admin',
          isSuperAdmin: true,
          isApproved: true,
          isVIP: true,
          status: 'active',
          subscriptionType: 'year',
          freeAttempts: 999999,
          coins: 999999,
          subscriptionExpiry: Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10)),
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          deviceId: getDeviceId(),
          lastIp: '127.0.0.1',
          hasSvgaExAccess: true,
          allowedVersion: 'all',
          lastUsedVersion: getActiveClientVersion()
        };
        localStorage.setItem('svga_auth_uid', adminId);
        sessionStorage.setItem('auto_open_admin', 'true');
        setCurrentUser(adminDoc);
        await setDoc(doc(db, 'users', adminId), adminDoc, { merge: true }).catch(() => {});
        return;
      }

      // 5. Handle detailed friendly error messages
      if (authErr.code === 'auth/user-not-found') {
        throw new Error('البريد الإلكتروني غير مسجل في النظام. يرجى التأكد من البريد أو إنشاء حساب جديد.');
      } else if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        throw new Error('كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور وإعادة المحاولة.');
      } else if (authErr.code === 'auth/too-many-requests') {
        throw new Error('تم تعطيل تسجيل الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار دقيقة.');
      } else if (authErr.code === 'auth/invalid-email') {
        throw new Error('صيغة البريد الإلكتروني غير صحيحة.');
      } else {
        throw new Error(authErr.message || 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.');
      }
    }
  };

  const signup = async (emailInput: string, passInput: string, name: string = '') => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const cleanPass = (passInput || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('يرجى ملء جميع الحقول المطلوبة');
    }

    if (cleanPass.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل');
    }

    // Check if registration is open
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    let defaultFreeAttempts = 5;
    let defaultAllowedVer = DEFAULT_ALLOWED_VERSION;
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      if (settings.isRegistrationOpen === false) {
        throw new Error('التسجيل مغلق حالياً من قبل الإدارة');
      }
      if (settings.defaultFreeAttempts !== undefined) {
        defaultFreeAttempts = settings.defaultFreeAttempts;
      }
      if (settings.defaultAllowedVersion) {
        defaultAllowedVer = settings.defaultAllowedVersion;
      }
    }

    // Check banned email
    const emailDocId = cleanEmail.replace(/\./g, '_');
    const bannedDoc = await getDoc(doc(db, 'banned_emails', emailDocId));
    if (bannedDoc.exists()) {
      throw new Error('هذا البريد محظور من التسجيل');
    }

    const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    const deviceId = getDeviceId();
    const lastIp = await getClientIp();
    const isAdmin = isEmailSuperAdmin(cleanEmail);
    const userName = name.trim() || (isAdmin ? 'مدير المنصة (Super Admin)' : (cleanEmail.split('@')[0] || 'User'));

    const newUser: UserRecord = {
      id: user.uid,
      name: userName,
      email: cleanEmail,
      password: cleanPass,
      plainPassword: cleanPass,
      role: isAdmin ? 'admin' : 'user',
      isSuperAdmin: isAdmin,
      isApproved: true,
      isVIP: isAdmin,
      status: 'active',
      subscriptionType: isAdmin ? 'year' : 'none',
      freeAttempts: isAdmin ? 999999 : defaultFreeAttempts,
      coins: isAdmin ? 999999 : 0,
      subscriptionExpiry: isAdmin ? Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10)) : null,
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      deviceId,
      lastIp,
      hasSvgaExAccess: isAdmin,
      allowedVersion: isAdmin ? 'all' : defaultAllowedVer,
      lastUsedVersion: getActiveClientVersion()
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    localStorage.setItem('svga_auth_uid', user.uid);
    if (userName) {
      await updateProfile(user, { displayName: userName }).catch(() => {});
    }
    setCurrentUser(newUser);
  };

  const logout = async () => {
    localStorage.removeItem('svga_auth_uid');
    await signOut(auth);
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    const targetUid = auth.currentUser?.uid || localStorage.getItem('svga_auth_uid');
    if (targetUid) {
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc.exists()) {
        setCurrentUser({ ...userDoc.data() as UserRecord, id: targetUid });
      }
    }
  };

  const updateUserProfile = async (dataOrName: Partial<UserRecord> | string, photoURL?: string) => {
    const targetUid = auth.currentUser?.uid || localStorage.getItem('svga_auth_uid');
    if (targetUid) {
      if (typeof dataOrName === 'string') {
        const displayName = dataOrName;
        const updates: any = {};
        if (displayName) updates.displayName = displayName;
        if (photoURL) updates.photoURL = photoURL;
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, updates).catch(() => {});
        }
        await updateDoc(doc(db, 'users', targetUid), {
          ...(displayName ? { name: displayName, displayName } : {}),
          ...(photoURL ? { photoURL, avatar: photoURL } : {})
        });
      } else {
        await updateDoc(doc(db, 'users', targetUid), dataOrName);
      }
      await refreshUser();
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      user: currentUser,
      loading,
      login,
      loginWithEmail: login,
      signup,
      signupWithEmail: signup,
      updateUserProfile,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

