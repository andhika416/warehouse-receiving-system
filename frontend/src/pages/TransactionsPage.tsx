import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import type { InventoryTransaction } from '../types/index.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import {
  History,
  RefreshCw,
  ArrowDownLeft,
  ShieldCheck,
  FileText,
  User,
  Search,
  FileSpreadsheet,
  X,
  PackageOpen,
  Eye,
  Calendar,
} from 'lucide-react';

interface TransactionsPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ onNotify }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail Modal State (Opens as a Modal without navigating away!)
  const [viewingTx, setViewingTx] = useState<InventoryTransaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/transactions', {
        params: { limit: 150 },
      });
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat log transaksi mutasi inventaris.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.trim().toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.sku.toLowerCase().includes(q) ||
        tx.product_name.toLowerCase().includes(q) ||
        tx.doc_number.toLowerCase().includes(q) ||
        tx.operator_username.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  // Pagination states (5 items per layer / page)
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      onNotify('warning', 'Tidak ada riwayat mutasi untuk diekspor.');
      return;
    }

    const headers = [
      'Waktu Transaksi',
      'Tipe Mutasi',
      'SKU',
      'Nama Produk',
      'No. Dokumen',
      'Kuantitas Masuk',
      'Operator',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${new Date(tx.created_at).toLocaleString('id-ID')}"`,
      `"${tx.type}"`,
      `"${tx.sku}"`,
      `"${tx.product_name.replace(/"/g, '""')}"`,
      `"${tx.doc_number}"`,
      tx.quantity,
      `"${tx.operator_username}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logiflow_audit_mutasi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onNotify('success', `${filteredTransactions.length} rekaman transaksi berhasil diekspor ke CSV!`);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <History className="w-5 h-5" />
            </div>
            <span>Riwayat Transaksi & Kartu Stok (Audit Log)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Jejak audit permanen (append-only) setiap mutasi fisik barang masuk yang dicatat oleh sistem
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTransactions}
            title="Muat Ulang Transaksi"
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

      {/* 2. Audit Guarantee Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3 text-xs text-slate-600">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900">Prinsip Audit Trail Mutlak:</span> Seluruh
          transaksi mutasi di tabel ini bersifat <strong className="text-emerald-700">immutable</strong> (tidak
          dapat diubah atau dihapus) dan mengikat identitas operator pelaksana beserta nomor dokumen
          penerimaan (Receiving Document).
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan SKU, nama produk, nomor dokumen, atau operator..."
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
      </div>

      {/* 4. Table View with "Buka Detail" */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-5">Waktu Transaksi</th>
                <th className="py-3.5 px-5">Tipe Mutasi</th>
                <th className="py-3.5 px-5">Produk / SKU</th>
                <th className="py-3.5 px-5">No. Dokumen Referensi</th>
                <th className="py-3.5 px-5 text-right">Perubahan Kuantitas</th>
                <th className="py-3.5 px-5">Operator Pelaksana</th>
                <th className="py-3.5 px-5 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium">Memuat catatan transaksi mutasi...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-semibold text-slate-700">Tidak ada riwayat transaksi yang sesuai</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search
                        ? 'Coba hapus kata kunci pencarian.'
                        : 'Belum ada catatan mutasi barang masuk. Transaksi terbentuk otomatis saat barang diterima.'}
                    </p>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Atur Ulang Pencarian
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setViewingTx(tx)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5 align-middle font-mono text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        <span>MASUK ({tx.type})</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {tx.sku}
                      </span>
                      <div className="text-xs text-slate-700 mt-0.5 font-medium group-hover:text-emerald-700 transition-colors">
                        {tx.product_name}
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle font-mono text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tx.doc_number}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle text-right">
                      <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        +{tx.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-5 align-middle">
                      <div className="flex items-center gap-2 text-slate-700 text-xs">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium">{tx.operator_username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 align-middle text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTx(tx);
                        }}
                        title="Buka Detail Mutasi Transaksi"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white group-hover:bg-emerald-50 group-hover:border-emerald-200 text-slate-600 group-hover:text-emerald-700 transition shadow-sm cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="transaksi audit"
        />
      </div>

      {/* 5. MODAL BUKA DETAIL TRANSAKSI AUDIT (Muncul sebagai Modal, Tidak Pindah Halaman!) */}
      <Modal
        isOpen={!!viewingTx}
        onClose={() => setViewingTx(null)}
        title="Rincian Jejak Audit Mutasi Stok"
        maxWidth="lg"
        variant="light"
      >
        {viewingTx && (
          <div className="space-y-4 text-xs font-sans">
            {/* Header Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold font-mono text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                  <span>MASUK: +{viewingTx.quantity} Unit</span>
                </span>
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-200 shadow-sm">
                  {viewingTx.doc_number}
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900">{viewingTx.product_name}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {viewingTx.sku}</div>
              </div>
            </div>

            {/* Spec Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Operator Pelaksana</span>
                </div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {viewingTx.operator_username}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium text-[11px]">Tipe Mutasi Buku Besar</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">
                  {viewingTx.type} (Inbound Goods Receipt)
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 col-span-2">
                <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Waktu Pencatatan Transaksi</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5 font-mono">
                  {new Date(viewingTx.created_at).toLocaleString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 col-span-2">
                <div className="text-slate-400 font-medium text-[11px]">
                  ID Unik Rekaman Audit (UUID)
                </div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5 break-all">
                  {viewingTx.id}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg col-span-2 flex items-start gap-2.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Jaminan Integritas Audit Trail:</strong> Catatan ini tersimpan secara
                  permanen (append-only) dan diverifikasi tidak dapat diubah maupun dimanipulasi
                  secara hukum audit operasional gudang.
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingTx(null)}
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
