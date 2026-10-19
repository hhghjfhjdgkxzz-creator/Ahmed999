import React, { useState, useEffect } from 'react';
import { Mail, Lock, Mic, Globe, User as UserIcon, Calendar, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'auth' | 'profile'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Settings
  const [settings, setSettings] = useState<any>(null);
  
  const { loginWithEmail, signupWithEmail, login, logout, user, updateUserProfile } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'login_page'));
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    };
    fetchSettings();
  }, []);

  // If user is logged in, it means profile is incomplete (otherwise App.tsx would render MainApp)
  useEffect(() => {
    if (user) {
      setStep('profile');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
        setStep('profile');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError(isLogin ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'البيانات المدخلة غير صالحة.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم بالفعل.');
      } else {
        setError(err.message || 'حدث خطأ أثناء المصادقة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!displayName || !country || !gender || !age || !avatar) {
      return setError('يرجى إكمال جميع البيانات');
    }
    
    setIsLoading(true);
    try {
      await updateUserProfile(displayName, avatar);
      await updateDoc(doc(db, 'users', user!.uid), {
        country,
        gender,
        age: Number(age),
        photoURL: avatar,
        displayName
      });
      // App will re-render and AuthProvider will handle the user state
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const countries = [
    { name: 'مصر', code: 'EG', flag: '🇪🇬' },
    { name: 'السعودية', code: 'SA', flag: '🇸🇦' },
    { name: 'الإمارات', code: 'AE', flag: '🇦🇪' },
    { name: 'الكويت', code: 'KW', flag: '🇰🇼' },
    { name: 'العراق', code: 'IQ', flag: '🇮🇶' },
    { name: 'المغرب', code: 'MA', flag: '🇲🇦' },
    { name: 'الجزائر', code: 'DZ', flag: '🇩🇿' },
    { name: 'تونس', code: 'TN', flag: '🇹🇳' },
    { name: 'الأردن', code: 'JO', flag: '🇯🇴' },
    { name: 'لبنان', code: 'LB', flag: '🇱🇧' },
    { name: 'عمان', code: 'OM', flag: '🇴🇲' },
    { name: 'قطر', code: 'QA', flag: '🇶🇦' },
    { name: 'البحرين', code: 'BH', flag: '🇧🇭' },
    { name: 'اليمن', code: 'YE', flag: '🇾🇪' },
    { name: 'سوريا', code: 'SY', flag: '🇸🇾' },
    { name: 'فلسطين', code: 'PS', flag: '🇵🇸' },
    { name: 'ليبيا', code: 'LY', flag: '🇱🇾' },
    { name: 'السودان', code: 'SD', flag: '🇸🇩' },
  ];

  return (
    <div dir="rtl" className="flex justify-center bg-black h-[100dvh] font-sans text-white overflow-hidden relative">
      {/* Background Media */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {settings?.backgroundUrl ? (
          settings.isBackgroundVideo ? (
            <video src={settings.backgroundUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img src={settings.backgroundUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-black"></div>
        )}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      </div>

      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 h-[100dvh] shadow-2xl flex flex-col relative z-10 overflow-y-auto hide-scrollbar sm:h-auto sm:max-h-[90vh] sm:my-auto sm:rounded-3xl">
        <AnimatePresence mode="wait">
          {step === 'auth' ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 flex flex-col min-h-full"
            >
              <div className="flex flex-col items-center mb-8">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-3xl flex items-center justify-center text-white mb-4 shadow-xl shadow-purple-500/30">
                    <Mic size={40} />
                  </div>
                )}
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isLogin ? 'مرحبًا بعودتك' : 'إنشاء حساب جديد'}
                </h1>
                <p className="text-gray-300 text-center text-sm">
                  {isLogin 
                    ? 'سجّل الدخول للوصول إلى غرف الدردشة الصوتية.'
                    : 'ادخل إلى عالم الدردشة الصوتية وتواصل مع مجتمعك.'}
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 text-red-200 p-3 rounded-xl mb-6 text-sm text-center border border-red-500/30 animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-1.5">البريد الإلكتروني</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/5 text-white placeholder-gray-400 text-sm transition-all outline-none backdrop-blur-md"
                      placeholder="example@email.com"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/5 text-white placeholder-gray-400 text-sm transition-all outline-none backdrop-blur-md"
                      placeholder="••••••••"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                >
                  {isLoading ? 'جاري التحميل...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
                </button>
              </form>



              <p className="mt-auto pt-8 text-center text-sm text-gray-400">
                {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-purple-400 hover:text-purple-300 transition-colors">
                  {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 flex flex-col min-h-full"
            >
              <div className="flex items-center gap-2 mb-6">
                {user ? (
                  <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition text-red-400 hover:text-red-300" title="تسجيل الخروج">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  </button>
                ) : (
                  <button onClick={() => setStep('auth')} className="p-2 hover:bg-white/10 rounded-full transition"><ChevronRight size={24} /></button>
                )}
                <h2 className="text-xl font-bold text-white">إكمال الملف الشخصي</h2>
              </div>

              <div className="space-y-6 flex-1">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-3">اختر صورتك الرمزية</label>
                  <div className="grid grid-cols-4 gap-3">
                    {(settings?.avatars || []).map((url: string, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setAvatar(url)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${avatar === url ? 'border-purple-500 scale-105 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-transparent hover:border-white/20'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {avatar === url && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <div className="bg-white rounded-full p-1 shadow-lg"><Check size={12} className="text-purple-600" /></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-1.5">الاسم المستعار</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-gray-400" /></div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="block w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none bg-white/5 text-white placeholder-gray-400 text-sm backdrop-blur-md"
                      placeholder="ادخل اسمك هنا..."
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-1.5">البلد</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Globe className="h-5 w-5 text-gray-400" /></div>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="block w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none bg-white/5 text-white text-sm appearance-none backdrop-blur-md [&>option]:bg-gray-900"
                    >
                      <option value="">اختر بلدك</option>
                      {countries.map(c => (
                        <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-3">الجنس</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setGender('male')}
                      className={`flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 transition-all ${gender === 'male' ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-white/10 bg-white/5 text-gray-400'}`}
                    >
                      <UserIcon size={20} />
                      <span className="font-bold">ذكر</span>
                    </button>
                    <button 
                      onClick={() => setGender('female')}
                      className={`flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 transition-all ${gender === 'female' ? 'border-pink-500 bg-pink-500/20 text-pink-300' : 'border-white/10 bg-white/5 text-gray-400'}`}
                    >
                      <UserIcon size={20} />
                      <span className="font-bold">أنثى</span>
                    </button>
                  </div>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-1.5">العمر</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-gray-400" /></div>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="block w-full pl-4 pr-12 py-3.5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none bg-white/5 text-white placeholder-gray-400 text-sm backdrop-blur-md"
                      placeholder="ادخل عمرك..."
                      min="12"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 text-red-200 p-3 rounded-xl my-4 text-sm text-center border border-red-500/30">
                  {error}
                </div>
              )}

              <button
                onClick={handleCompleteProfile}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ والدخول للتطبيق'}
                {!isLoading && <ChevronLeft size={20} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

