import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import type { InventoryItem } from '../types/index.js';
import { Search, Layers, RefreshCw, Package, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface InventoryPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onNotify }) => {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: { search: search.trim() || undefined, limit: 100 },
      });
      if (res.data.success) {
        setInventories(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat saldo inventaris.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search]);

  const totalSKUs = inventories.length;
  const totalQuantity = inventories.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Saldo Inventaris Gudang</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Informasi saldo fisik on-hand yang telah diverifikasi secara ACID di level basis data
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU atau nama produk..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <button
            onClick={fetchInventory}
            title="Refresh Data"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total SKU Terdaftar
            </div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{totalSKUs}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Terpantau di sistem
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Stok Fisik On-Hand
            </div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {totalQuantity.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Akumulasi seluruh unit
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Jaminan Integritas
            </div>
            <div className="text-base font-bold text-emerald-400 mt-1">ACID & Zero Over-Receive</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Constraint & Row-Locking Aktif
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">SKU Produk</th>
                <th className="py-3.5 px-4">Nama Produk</th>
                <th className="py-3.5 px-4">Satuan Unit</th>
                <th className="py-3.5 px-4 text-right">Saldo On-Hand</th>
                <th className="py-3.5 px-4 text-right">Pembaruan Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && inventories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Memuat saldo inventaris...
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada stok inventaris ditemukan.
                  </td>
                </tr>
              ) : (
                inventories.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      {inv.sku}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{inv.product_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300">
                        {inv.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {inv.quantity} {inv.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {inv.updated_at ? new Date(inv.updated_at).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
