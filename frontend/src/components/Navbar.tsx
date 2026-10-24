import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LogOut, User, Warehouse, Shield, HardHat } from 'lucide-react';
import { api } from '../api/client.js';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        setDbHealthy(res.data.database?.status === 'CONNECTED');
      })
      .catch(() => {
        setDbHealthy(false);
      });
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Warehouse className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-white flex items-center gap-2">
            <span>Warehouse Receiving System</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v1.0
            </span>
          </div>
          <div className="text-xs text-slate-400">Specification-Driven Inbound Management</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Database Health Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              dbHealthy === true
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                : dbHealthy === false
                ? 'bg-rose-400 shadow-sm shadow-rose-400'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="text-slate-400">PostgreSQL</span>
          <span className="font-medium text-slate-200">
            {dbHealthy === true ? 'Connected' : dbHealthy === false ? 'Offline' : 'Checking'}
          </span>
        </div>

        {/* User Role Badge & Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-200">{user?.username}</div>
              <div className="flex items-center gap-1 text-[11px]">
                {role === 'SUPERVISOR' ? (
                  <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                    <Shield className="w-3 h-3" /> Supervisor
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                    <HardHat className="w-3 h-3" /> Operator
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Keluar / Logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
