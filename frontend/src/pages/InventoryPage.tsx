import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import type { InventoryItem } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import {
  Search,
  Layers,
  RefreshCw,
  Package,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  X,
  PackageOpen,
  ShieldCheck,
  Eye,
  Calendar,
} from 'lucide-react';

interface InventoryPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ onNotify }) => {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'ZERO_STOCK'>('ALL');

  // Detail Modal State (Opens as a Modal without navigating away!)
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);

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
      onNotify('error', 'Gagal memuat saldo inventaris gudang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search]);

  // Client-side stock filtering
  const filteredInventory = useMemo(() => {
    if (stockFilter === 'ALL') return inventories;
    if (stockFilter === 'IN_STOCK') return inventories.filter((i) => i.quantity > 0);
    if (stockFilter === 'ZERO_STOCK') return inventories.filter((i) => i.quantity === 0);
    return inventories;
  }, [inventories, stockFilter]);

  // Pagination states (5 items per layer / page)
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search query or stock filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, stockFilter]);

  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredInventory.slice(start, start + PAGE_SIZE);
  }, [filteredInventory, currentPage]);

  const totalSKUs = inventories.length;
  const inStockSKUs = inventories.filter((i) => i.quantity > 0).length;
  const totalQuantity = inventories.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInventory.length === 0) {
      onNotify('warning', 'Tidak ada data saldo inventaris untuk diekspor.');
      return;
    }

    const headers = ['SKU Produk', 'Nama Produk', 'Satuan', 'Saldo On-Hand', 'Pembaruan Terakhir'];
    const rows = filteredInventory.map((i) => [
      `"${i.sku}"`,
      `"${i.product_name.replace(/"/g, '""')}"`,
      `"${i.unit}"`,
      i.quantity,
      `"${i.updated_at ? new Date(i.updated_at).toLocaleString('id-ID') : '-'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logiflow_saldo_inventaris_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onNotify('success', `${filteredInventory.length} data inventaris berhasil diekspor ke format CSV!`);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <span>Saldo Inventaris Gudang</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Informasi saldo fisik barang on-hand yang telah diverifikasi secara ACID di basis data
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventory}
            title="Muat Ulang Saldo Inventaris"
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total SKU Terdaftar</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{totalSKUs} SKU</div>
            <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{inStockSKUs} SKU memiliki saldo aktif</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Stok Fisik On-Hand</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">
              {totalQuantity.toLocaleString()} Unit
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Akumulasi saldo fisik seluruh barang</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Jaminan Integritas Data</div>
            <div className="text-base font-bold text-emerald-700 mt-0.5">ACID & Zero Over-Receive</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pessimistic Row-Locking Aktif
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan SKU atau nama produk..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stock status filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'Semua Stok' },
            { id: 'IN_STOCK', label: 'Tersedia (> 0)' },
            { id: 'ZERO_STOCK', label: 'Stok Kosong (0)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStockFilter(item.id as any)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                stockFilter === item.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table View with "Buka Detail" */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-5">SKU Produk</th>
                <th className="py-3.5 px-5">Nama Produk</th>
                <th className="py-3.5 px-5">Satuan Unit</th>
                <th className="py-3.5 px-5 text-right">Saldo On-Hand</th>
                <th className="py-3.5 px-5 text-right">Pembaruan Terakhir</th>
                <th className="py-3.5 px-5 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && inventories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium">Memuat saldo inventaris...</p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-semibold text-slate-700">Tidak ada saldo inventaris yang sesuai</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || stockFilter !== 'ALL'
                        ? 'Coba hapus kata kunci pencarian atau sesuaikan filter stok.'
                        : 'Belum ada saldo fisik yang tercatat. Saldo bertambah saat verifikasi penerimaan barang.'}
                    </p>
                    {(search || stockFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setStockFilter('ALL');
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Atur Ulang Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((inv) => {
                  const isAvailable = inv.quantity > 0;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setViewingItem(inv)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5 align-middle">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200/90 tracking-wide">
                          {inv.sku}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {inv.product_name}
                        </div>
                        {inv.description && (
                          <div className="text-xs text-slate-400 truncate max-w-md mt-0.5 font-normal">
                            {inv.description}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {inv.unit}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                          />
                          <span>
                            {inv.quantity.toLocaleString()} {inv.unit}
                          </span>
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle text-right text-slate-500 font-mono text-xs">
                        {inv.updated_at
                          ? new Date(inv.updated_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="py-4 px-5 align-middle text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingItem(inv);
                          }}
                          title="Buka Detail Saldo Stok"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white group-hover:bg-emerald-50 group-hover:border-emerald-200 text-slate-600 group-hover:text-emerald-700 transition shadow-sm cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredInventory.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="item stok"
        />
      </div>

      {/* 5. MODAL BUKA DETAIL INVENTARIS (Muncul sebagai Modal, Tidak Pindah Halaman!) */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Rincian Saldo Stok Fisik Inventaris"
        maxWidth="lg"
        variant="light"
      >
        {viewingItem && (
          <div className="space-y-4 text-xs font-sans">
            {/* Header Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold px-3 py-1 rounded-md bg-white text-emerald-800 border border-slate-200 shadow-sm">
                  {viewingItem.sku}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                    viewingItem.quantity > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      viewingItem.quantity > 0 ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {viewingItem.quantity > 0 ? 'Stok Tersedia di Gudang' : 'Stok Kosong (0)'}
                  </span>
                </span>
              </div>

              <div>
                <div className="text-base font-bold text-slate-900">{viewingItem.product_name}</div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {viewingItem.description || 'Tidak ada deskripsi tambahan yang tercatat.'}
                </div>
              </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium text-[11px]">Satuan Pengukuran</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{viewingItem.unit}</div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium text-[11px]">Saldo On-Hand Aktual</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {viewingItem.quantity.toLocaleString()} {viewingItem.unit}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 col-span-2">
                <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Waktu Pembaruan Terakhir</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5 font-mono">
                  {viewingItem.updated_at
                    ? new Date(viewingItem.updated_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '-'}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 col-span-2">
                <div className="text-slate-400 font-medium text-[11px]">ID Sistem Basis Data (UUID)</div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5 break-all">
                  {viewingItem.id}
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
