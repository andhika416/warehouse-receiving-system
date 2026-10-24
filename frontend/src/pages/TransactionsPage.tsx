import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import type { InventoryTransaction } from '../types/index.js';
import { History, RefreshCw, ArrowDownLeft, ShieldCheck, FileText, User } from 'lucide-react';

interface TransactionsPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ onNotify }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory/transactions', {
        params: { limit: 100 },
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Riwayat Transaksi & Kartu Stok (Audit Log)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log permanen (append-only) setiap mutasi fisik barang masuk yang dicatat oleh sistem
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          title="Refresh Data"
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition text-xs font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Audit Guarantee Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold text-white">Prinsip Audit Trail Mutlak:</span> Seluruh
          transaksi di tabel ini bersifat <span className="text-emerald-400">immutable</span> (tidak
          dapat diubah atau dihapus) dan terikat pada ID operator pelaksana dan dokumen rujukan
          receiving.
        </div>
      </div>

      {/* Table view */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Waktu Transaksi</th>
                <th className="py-3.5 px-4">Tipe Mutasi</th>
                <th className="py-3.5 px-4">Produk / SKU</th>
                <th className="py-3.5 px-4">No. Dokumen Referensi</th>
                <th className="py-3.5 px-4 text-right">Perubahan Kuantitas</th>
                <th className="py-3.5 px-4">Operator Pelaksana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Memuat catatan transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Belum ada riwayat transaksi mutasi barang masuk.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(tx.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        <ArrowDownLeft className="w-3 h-3" />
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-emerald-400 font-semibold">{tx.sku}</div>
                      <div className="text-slate-300 text-[11px]">{tx.product_name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-300 flex items-center gap-1.5 mt-2">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tx.doc_number}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-emerald-300">
                        +{tx.quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-[10px]">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="font-medium">{tx.operator_username}</span>
                      </div>
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
