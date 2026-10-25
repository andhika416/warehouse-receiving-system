import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  HardHat,
  AlertCircle,
  ArrowRight,
  Shield,
  Loader2,
} from 'lucide-react';

interface LoginPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNotify }) => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'supervisor' | 'operator' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Silakan masukkan nama pengguna dan kata sandi.');
      return;
    }

    setErrorMsg('');
    try {
      await login(username.trim(), password);
      onNotify('success', `Selamat datang kembali, ${username.trim()}!`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Autentikasi gagal. Silakan periksa kembali kredensial atau koneksi server.';
      setErrorMsg(msg);
      onNotify('error', msg);
    }
  };

  // Quick-Role Switcher (Demo Feature)
  const handleSelectRole = (role: 'supervisor' | 'operator') => {
    setSelectedRole(role);
    setErrorMsg('');
    if (role === 'supervisor') {
      setUsername('supervisor');
      setPassword('password123');
    } else {
      setUsername('operator');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decor: Warehouse Isometric Grid Pattern & Soft Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Ambient Glow */}
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[280px] h-[200px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none sm:w-[480px] sm:h-[320px]" />
        <div className="absolute -bottom-[20%] right-[5%] w-[180px] h-[180px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none sm:w-[320px] sm:h-[320px]" />

        {/* Warehouse Isometric Scaffolding & Geometric Grid Pattern */}
        <svg
          className="absolute inset-0 w-full h-full stroke-slate-200/70 [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_60%,transparent_100%)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Base Cartesian Grid with subtle intersection dots */}
            <pattern
              id="geo-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                strokeWidth="0.7"
                stroke="rgba(203, 213, 225, 0.55)"
              />
              <circle cx="0" cy="0" r="1.5" fill="rgba(16, 185, 129, 0.35)" />
            </pattern>

            {/* Warehouse Isometric Pallet & Cube Wireframe Motif */}
            <pattern
              id="warehouse-isometric"
              width="144"
              height="124"
              patternUnits="userSpaceOnUse"
            >
              {/* Isometric Cube Top Face */}
              <path
                d="M72 12 L116 37 L72 62 L28 37 Z"
                fill="none"
                stroke="rgba(148, 163, 184, 0.32)"
                strokeWidth="0.8"
              />
              {/* Left Face */}
              <path
                d="M28 37 L72 62 L72 102 L28 77 Z"
                fill="none"
                stroke="rgba(148, 163, 184, 0.22)"
                strokeWidth="0.8"
              />
              {/* Right Face */}
              <path
                d="M72 62 L116 37 L116 77 L72 102 Z"
                fill="none"
                stroke="rgba(148, 163, 184, 0.28)"
                strokeWidth="0.8"
              />
              {/* Pallet base lines */}
              <path
                d="M36 82 L72 102 L108 82"
                fill="none"
                stroke="rgba(16, 185, 129, 0.3)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo-grid)" />
          <rect width="100%" height="100%" fill="url(#warehouse-isometric)" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[440px] relative z-10">
        {/* Center Card: High-contrast white card (#FFFFFF) with subtle drop-shadow (shadow-xl) and smooth rounded corners (rounded-2xl) */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-100 p-7 sm:p-9 sm:max-w-md mx-auto transition-all">
          
          {/* 1. Header */}
          <div className="mb-6">
            {/* App Logo: An emerald-green geometric box/pallet icon with title "LogiFlow" and subtitle "Warehouse Inbound Management" */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-[#059669] flex items-center justify-center text-white shadow-md shadow-emerald-600/25 ring-4 ring-emerald-50 shrink-0">
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {/* Geometric 3D Box & Pallet Icon */}
                  <path
                    d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                    fill="rgba(255, 255, 255, 0.16)"
                  />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                  {/* Subtle Pallet Base Lines */}
                  <path d="M7 15l-3 1.7" strokeWidth="1.8" />
                  <path d="M17 15l3 1.7" strokeWidth="1.8" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                    Logi<span className="text-[#059669]">Flow</span>
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200/70">
                    WMS
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium tracking-normal mt-0.5">
                  Sistem Manajemen Penerimaan Gudang
                </p>
              </div>
            </div>

            {/* Welcoming Heading & Muted Secondary Text */}
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Masuk ke Ruang Kerja
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Masukkan kredensial Anda untuk melanjutkan ke sistem
            </p>
          </div>

          {/* 3. Quick-Role Switcher (Demo Feature) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pintasan Akun Demo
              </span>
              {selectedRole && (
                <span className="text-[11px] text-[#059669] font-medium animate-fadeIn">
                  Otomatis terisi sebagai {selectedRole === 'supervisor' ? 'Supervisor' : 'Operator'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRole('supervisor')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  selectedRole === 'supervisor'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70 ring-1 ring-emerald-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    selectedRole === 'supervisor' ? 'text-[#059669]' : 'text-slate-400'
                  }`}
                />
                <span>Supervisor</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('operator')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  selectedRole === 'operator'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70 ring-1 ring-emerald-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <HardHat
                  className={`w-3.5 h-3.5 ${
                    selectedRole === 'operator' ? 'text-[#059669]' : 'text-slate-400'
                  }`}
                />
                <span>Operator</span>
              </button>
            </div>
          </div>

          {/* Error Message Feedback */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* 2. Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (selectedRole && e.target.value !== selectedRole) {
                      setSelectedRole(null);
                    }
                  }}
                  placeholder="Contoh: supervisor atau operator"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-sm sm:pr-6"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Kata Sandi (Password)
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full pl-8 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-sm sm:pr-6"
                />
                {/* Eye toggle icon to unmask */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition focus:outline-none cursor-pointer"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 4. Action: Primary full-width button Solid Emerald Green (#059669), text white, bold, rounded-xl */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-150 transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:min-h-[48px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 5. Footer: Small text at bottom */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Dilindungi Kontrol Akses Berbasis Peran (RBAC) • v1.0.0</span>
          </div>

        </div>

        {/* Subtle quick tips under the card */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Sistem Manajemen Penerimaan & Verifikasi Fisik Barang Gudang Terpadu
          </p>
        </div>
      </div>
    </div>
  );
};
