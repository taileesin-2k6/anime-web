'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  customTitle?: string;
  customSubtitle?: string;
  onSuccess?: (user: { id?: string; name: string; email: string }) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  customTitle,
  customSubtitle,
  onSuccess,
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetAllFields = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setShowPassword(false);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetAllFields();
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleClose = () => {
    resetAllFields();
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Đăng nhập không thành công.');
        setLoading(false);
        return;
      }

      localStorage.setItem('ani_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-changed'));
      setSuccessMsg('Đăng nhập thành công!');
      if (onSuccess) onSuccess(data.user);
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err: any) {
      setError('Lỗi kết nối mạng, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    if (regPassword.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Đăng ký không thành công.');
        setLoading(false);
        return;
      }

      localStorage.setItem('ani_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-changed'));
      setSuccessMsg('Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
      if (onSuccess) onSuccess(data.user);
      setTimeout(() => {
        handleClose();
      }, 600);
    } catch (err: any) {
      setError('Lỗi kết nối mạng, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto select-auto"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-[#131722] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/20 text-white animate-in zoom-in-95 duration-200 pointer-events-auto select-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white hover:bg-gray-800/80 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/25">
            {mode === 'login' ? <LogIn className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {customTitle || (mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Thành Viên')}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {customSubtitle ||
              (mode === 'login'
                ? 'Đăng nhập để lưu từ vựng anime vào sổ tay và đồng bộ bài học'
                : '1 tài khoản Gmail chỉ đăng ký 1 lần duy nhất trên AniStore')}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Content */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 pointer-events-auto">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email hoặc Tên tài khoản
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@gmail.com hoặc username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>

            {/* Switch to Register */}
            <div className="pt-2 text-center text-xs text-gray-400 border-t border-gray-800/80 mt-4">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  resetAllFields();
                  setMode('register');
                }}
                className="font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors cursor-pointer"
              >
                Đăng ký ngay (1 Gmail = 1 Nick)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5 pointer-events-auto">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Tên hiển thị
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ví dụ: Tài Lee"
                  autoComplete="name"
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Địa chỉ Gmail / Email <span className="text-rose-400 text-[10px]">(Chỉ 1 tài khoản duy nhất)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Xác nhận Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/90 border border-gray-700/80 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 pointer-events-auto"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Đang kiểm tra & tạo tài khoản...' : 'Tạo Tài Khoản'}
            </button>

            {/* Switch to Login */}
            <div className="pt-2 text-center text-xs text-gray-400 border-t border-gray-800/80 mt-3">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  resetAllFields();
                  setMode('login');
                }}
                className="font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
