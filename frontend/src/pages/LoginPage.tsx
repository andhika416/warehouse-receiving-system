import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Warehouse, Shield, HardHat, LogIn, Lock, User, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNotify }) => {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login(username, password);
      onNotify('success', `Selamat datang kembali, ${username}!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa username dan password.';
      setErrorMsg(msg);
      onNotify('error', msg);
    }
  };

  const handleQuickLogin = async (userRole: 'supervisor' | 'operator') => {
    setErrorMsg('');
    const u = userRole;
    const p = 'password123';
    setUsername(u);
    setPassword(p);
    try {
      await login(u, p);
      onNotify('success', `Berhasil login demo sebagai ${u.toUpperCase()}!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal.';
      setErrorMsg(msg);
      onNotify('error', msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/20 mb-4">
            <Warehouse className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Warehouse Receiving System
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sistem Manajemen Inbound & Verifikasi Fisik Barang
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-500 text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
            </button>
          </form>

          {/* Quick Demo Login Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="text-center text-xs font-medium text-slate-400 mb-3">
              Tombol Cepat Login Demo:
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 transition text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-0.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
                  <span>Supervisor</span>
                </div>
                <span className="text-[10px] text-slate-400">Akses Penuh & Validasi</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator')}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 transition text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-0.5">
                  <HardHat className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                  <span>Operator</span>
                </div>
                <span className="text-[10px] text-slate-400">Pencatatan Fisik</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Dilengkapi proteksi ACID & Row-Level Locking PostgreSQL
        </div>
      </div>
    </div>
  );
};
