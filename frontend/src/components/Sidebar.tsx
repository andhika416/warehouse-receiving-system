import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  History,
  PlusCircle,
  Truck,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'receivings' | 'products' | 'inventory' | 'transactions';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreateModal?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      description: 'Ringkasan & analitik operasional',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'receivings' as NavTab,
      label: 'Dokumen Receiving',
      description: 'Verifikasi fisik barang masuk',
      icon: <Truck className="w-5 h-5" />,
    },
    {
      id: 'products' as NavTab,
      label: 'Master Produk',
      description: 'Katalog SKU & satuan unit',
      icon: <Boxes className="w-5 h-5" />,
    },
    {
      id: 'inventory' as NavTab,
      label: 'Saldo Inventaris',
      description: 'Stok fisik saat ini',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'transactions' as NavTab,
      label: 'Log Mutasi Stok',
      description: 'Jejak audit kartu stok',
      icon: <History className="w-5 h-5" />,
      supervisorOnly: true,
    },
  ];

  return (
    <aside
      className={`h-full shrink-0 sticky top-0 overflow-y-auto select-none border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between transition-all duration-300 ease-in-out z-30 ${
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
                  title={`${item.label} - ${item.description}`}
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
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    <div className="font-bold text-white">{item.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.description}</div>
                  </div>
                </button>
              );
            }

            // Expanded mode: full button with icon + label + description
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mt-0.5 transition ${
                    isActive
                      ? 'bg-emerald-700/60 text-white shadow-inner'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${
                      isActive ? 'text-white font-bold' : 'text-slate-200 font-medium'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] leading-tight mt-0.5 truncate ${
                      isActive ? 'text-emerald-100/90' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="space-y-3 pt-4 border-t border-slate-900">
        {!isCollapsed ? (
          <>
            {/* Role Notice Card */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-medium text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aturan Bisnis Aktif</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isSupervisor
                  ? 'Supervisor: penerbitan dokumen, master produk, dan verifikasi akhir.'
                  : 'Operator: pencatatan fisik barang masuk dengan proteksi over-receiving.'}
              </p>
            </div>

            {/* Bottom Collapse Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800/80 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kecilkan Menu</span>
              </button>
            )}
          </>
        ) : (
          <>
            {/* Collapsed badge icon with hover tooltip */}
            <div
              title={
                isSupervisor
                  ? 'Role: Supervisor (Hak Akses Penuh)'
                  : 'Role: Operator (Pencatatan Fisik Masuk)'
              }
              className="w-12 h-10 mx-auto rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 cursor-help group relative"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {isSupervisor ? 'Supervisor WMS' : 'Operator Gudang'}
              </div>
            </div>

            {/* Bottom Expand Button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Buka Sidebar Penuh"
                className="w-12 h-10 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/80 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
