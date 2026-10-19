import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { loginWithGoogle } from '../../firebase';

interface LoginProps {
  onToggle: () => void;
}

export const Login: React.FC<LoginProps> = ({ onToggle }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const lower = cleanEmail.toLowerCase();
      if (
        lower === 'ceo@design-svga.com' ||
        lower === 'master@design-svga.com' ||
        lower === 'admin.pro@design-svga.com' ||
        lower === 'sdsdfdfddsfdd@gmail.com'
      ) {
        sessionStorage.setItem('auto_open_admin', 'true');
      }
      await login(cleanEmail, cleanPass);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">تسجيل الدخول</h2>
        <p className="text-slate-400 text-sm">مرحباً بعودتك إلى النظام</p>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-4 rounded-xl mb-6 text-sm text-center leading-relaxed font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
            البريد الإلكتروني
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-4 pr-11 py-3 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
              placeholder="name@example.com"
              autoComplete="email"
              dir="ltr"
              required
            />
            <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
              required
            />
            <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
              title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>جاري التحقق والدخول...</span>
          ) : (
            <>
              <span>دخول إلى المنصة</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </>
          )}
        </button>
      </form>

      {/* زر المتابعة بحساب جوجل */}
      <button 
        onClick={async () => {
          setError('');
          setLoading(true);
          try {
            sessionStorage.setItem('auto_open_admin', 'true');
            await loginWithGoogle();
          } catch (err: any) {
            setError(err.message || 'فشل تسجيل الدخول بواسطة جوجل');
          } finally {
            setLoading(false);
          }
        }}
        type="button"
        disabled={loading}
        className="mt-4 w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-3 backdrop-blur-md text-xs disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>المتابعة باستخدام جوجل</span>
      </button>

      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm">
          ليس لديك حساب؟{' '}
          <button
            onClick={onToggle}
            className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors underline-offset-4 hover:underline"
          >
            إنشاء حساب جديد
          </button>
        </p>
      </div>
    </div>
  );
};

