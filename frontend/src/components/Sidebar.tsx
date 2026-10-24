import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Boxes,
  Layers,
  History,
  PlusCircle,
  Truck,
  CheckSquare,
} from 'lucide-react';

export type NavTab = 'receivings' | 'products' | 'inventory' | 'transactions';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreateModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCreateModal,
}) => {
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const navItems = [
    {
      id: 'receivings' as NavTab,
      label: 'Dokumen Receiving',
      description: 'Inbound physical verification',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'products' as NavTab,
      label: 'Master Produk',
      description: 'Katalog SKU & satuan unit',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      id: 'inventory' as NavTab,
      label: 'Saldo Inventaris',
      description: 'Stok fisik saat ini',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'transactions' as NavTab,
      label: 'Log Mutasi Stok',
      description: 'Jejak audit kartu stok',
      icon: <History className="w-4 h-4" />,
      supervisorOnly: true,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950 p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Supervisor Action Button: Buat Dokumen (Hidden for Operator) */}
        {isSupervisor && onOpenCreateModal && (
          <div>
            <button
              onClick={onOpenCreateModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Dokumen Baru</span>
            </button>
          </div>
        )}

        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Menu Operasional
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.supervisorOnly && !isSupervisor) {
                return null;
              }

              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition ${
                    isActive
                      ? 'bg-slate-900 border border-emerald-500/30 text-white shadow-sm shadow-emerald-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        isActive ? 'text-white font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Role Notice Card */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="font-medium text-slate-300 flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Aturan Bisnis Aktif</span>
        </div>
        <p className="text-[11px] text-slate-500">
          {isSupervisor
            ? 'Supervisor dapat membuat dokumen, mengelola produk, dan menutup dokumen 100% lengkap.'
            : 'Operator memindai dan mencatat fisik barang masuk. Over-receiving diblokir otomatis.'}
        </p>
      </div>
    </aside>
  );
};
