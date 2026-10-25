import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNotifications, type AppNotification } from '../context/NotificationContext.js';
import {
  LogOut,
  User,
  Shield,
  HardHat,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info,
  X,
  FileCheck2,
  Menu,
} from 'lucide-react';
import { api } from '../api/client.js';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isSidebarCollapsed = false,
}) => {
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, loading: notifLoading, refreshNotifications, navigateToNotification } =
    useNotifications();

  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isNotifOpen]);

  const handleAction = (notif: AppNotification) => {
    setIsNotifOpen(false);
    navigateToNotification(notif);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Buka Menu Sidebar' : 'Tutup Menu Sidebar'}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <svg
            className="w-5 h-5 text-slate-950"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
              fill="rgba(2, 6, 23, 0.2)"
            />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
        <div>
          <div className="font-bold tracking-tight text-white flex items-center gap-2">
            <span>
              Logi<span className="text-emerald-400">Flow</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              WMS v1.0
            </span>
          </div>
          <div className="text-xs text-slate-400">Sistem Manajemen Penerimaan Gudang</div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
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
          <span className="text-slate-400">Database:</span>
          <span className="font-medium text-slate-200">
            {dbHealthy === true ? 'Terhubung' : dbHealthy === false ? 'Terputus' : 'Memeriksa'}
          </span>
        </div>

        {/* NOTIFICATION BELL WITH COUNTER BADGE */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            title="Pemberitahuan & Tindakan Operasional"
            className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isNotifOpen
                ? 'bg-slate-800 text-white border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : unreadCount > 0
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:border-slate-600'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />

            {/* Persistence Action Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold font-mono rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-md shadow-rose-500/60 ring-2 ring-slate-950 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION POPOVER DROPDOWN */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden z-50 animate-fade-in font-sans">
              {/* Dropdown Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Notifikasi & Tindakan Operasional
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Peran:{' '}
                      <strong className="text-emerald-700">
                        {role === 'SUPERVISOR' ? 'Supervisor Gudang' : 'Operator Gudang'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => refreshNotifications()}
                    title="Perbarui status notifikasi"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${notifLoading ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Tidak Ada Tindakan Tertunda</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Seluruh dokumen penerimaan dan saldo stok telah selesai diproses.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUrgent = notif.type === 'urgent';
                    const isWarning = notif.type === 'warning';

                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                          isUrgent
                            ? 'bg-rose-50/60 border-rose-200/90 text-rose-900'
                            : isWarning
                            ? 'bg-amber-50/60 border-amber-200/90 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {isUrgent ? (
                              <FileCheck2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-xs">{notif.title}</div>
                              <div className="text-[11px] mt-0.5 text-slate-600 leading-relaxed">
                                {notif.message}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : isWarning
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {notif.badgeLabel}
                          </span>
                        </div>

                        {/* Quick Action Button */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(notif.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAction(notif)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition cursor-pointer"
                          >
                            <span>{notif.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
                <span>Notifikasi otomatis hilang begitu tindakan operasional telah diselesaikan.</span>
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge & Profile */}
        <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-slate-800">
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
            title="Keluar dari Sistem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
