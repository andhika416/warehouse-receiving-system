import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  History,
  PlusCircle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'receivings' | 'products' | 'inventory' | 'transactions';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreateModal?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

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

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'receivings' as NavTab,
      label: 'Dokumen Receiving',
      icon: <Truck className="w-5 h-5" />,
    },
    {
      id: 'products' as NavTab,
      label: 'Master Produk',
      icon: <Boxes className="w-5 h-5" />,
    },
    {
      id: 'inventory' as NavTab,
      label: 'Saldo Inventaris',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'transactions' as NavTab,
      label: 'Log Mutasi Stok',
      icon: <History className="w-5 h-5" />,
      supervisorOnly: true,
    },
  ];

  return (
    <>
      {/* 1. Desktop Sidebar (visible on lg and above only, preserving desktop mode 100%) */}
      <aside
        className={`hidden lg:flex h-full shrink-0 sticky top-0 overflow-y-auto select-none border-r border-slate-800/80 bg-slate-950 flex-col justify-between transition-all duration-300 ease-in-out z-30 ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 p-4'
        }`}
      >
      <div className="space-y-5">
        {/* Header & Toggle Section */}
        <div className="flex items-center justify-between">
          {!isCollapsed ? (
            <>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                Menu Operasional
              </span>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Kecilkan Sidebar (Hanya Ikon)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Buka Sidebar Penuh"
                className="w-full py-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Supervisor Action Button: Buat Dokumen (Hidden for Operator) */}
        {isSupervisor && onOpenCreateModal && (
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Dokumen Baru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenCreateModal}
                title="Terbitkan Dokumen Penerimaan Baru"
                className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer group relative"
              >
                <PlusCircle className="w-5 h-5" />
                {/* Floating tooltip */}
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  Terbitkan Dokumen Baru
                </div>
              </button>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            if (item.supervisorOnly && !isSupervisor) {
              return null;
            }

            const isActive = activeTab === item.id;

            if (isCollapsed) {
              // Collapsed mode: icon only button
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  title={item.label}
                  className={`w-12 h-12 mx-auto flex items-center justify-center rounded-xl transition-all duration-150 group relative cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400 transition'}>
                    {item.icon}
                  </div>

                  {/* Floating Tooltip in collapsed mode */}
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                </button>
              );
            }

            // Expanded mode: full button with icon + label
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition ${
                    isActive
                      ? 'bg-emerald-700/60 text-white shadow-inner'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-sm truncate ${
                    isActive ? 'text-white font-semibold' : 'text-slate-300 font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Section: Database Health Indicator */}
      <div className="pt-3 border-t border-slate-900">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
            <Database className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-slate-400 text-xs">Database:</span>
              <span className="font-medium text-slate-200 text-xs truncate">
                {dbHealthy === true ? 'Terhubung' : dbHealthy === false ? 'Terputus' : 'Memeriksa'}
              </span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbHealthy === true
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : dbHealthy === false
                  ? 'bg-rose-400 shadow-sm shadow-rose-400'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
          </div>
        ) : (
          <div
            title={`Database: ${
              dbHealthy === true ? 'Terhubung' : dbHealthy === false ? 'Terputus' : 'Memeriksa'
            }`}
            className="w-10 h-10 mx-auto rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center group relative cursor-help"
          >
            <div className="relative">
              <Database className="w-4 h-4 text-slate-400" />
              <span
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  dbHealthy === true
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                    : dbHealthy === false
                    ? 'bg-rose-400 shadow-sm shadow-rose-400'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
            </div>
            {/* Tooltip for collapsed mode */}
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Database: {dbHealthy === true ? 'Terhubung' : dbHealthy === false ? 'Terputus' : 'Memeriksa'}
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* 2. Mobile Off-Canvas Drawer (Visible only on mobile / <lg when toggled) */}
    <div
      className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
        isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
      }`}
    >
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col justify-between p-4 z-10 select-none transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Mobile Drawer Header: Brand & Close Button */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                <svg
                  className="w-4 h-4 text-slate-950"
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
                <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>Logi<span className="text-emerald-400">Flow</span></span>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">WMS</span>
                </div>
                <div className="text-[10px] text-slate-400">Menu Operasional Gudang</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Supervisor Action Button: Buat Dokumen Baru */}
          {isSupervisor && onOpenCreateModal && (
            <button
              type="button"
              onClick={() => {
                onOpenCreateModal();
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Dokumen Baru</span>
            </button>
          )}

          {/* Mobile Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              if (item.supervisorOnly && !isSupervisor) {
                return null;
              }

              const isActive = activeTab === item.id;

              return (
                <button
                  key={`mobile-${item.id}`}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition ${
                      isActive
                        ? 'bg-emerald-700/60 text-white shadow-inner'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={`text-sm truncate ${
                      isActive ? 'text-white font-semibold' : 'text-slate-300 font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Footer: Database Status */}
        <div className="pt-3 border-t border-slate-900">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
            <Database className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-slate-400 text-xs">Database:</span>
              <span className="font-medium text-slate-200 text-xs truncate">
                {dbHealthy === true ? 'Terhubung' : dbHealthy === false ? 'Terputus' : 'Memeriksa'}
              </span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                dbHealthy === true
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : dbHealthy === false
                  ? 'bg-rose-400 shadow-sm shadow-rose-400'
                  : 'bg-amber-400 animate-ping'
              }`}
            />
          </div>
        </div>
      </aside>
    </div>
  </>
  );
};
