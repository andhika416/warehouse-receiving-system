import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import type { ReceivingDocumentDetail, ReceivingItem } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ArrowLeft,
  RefreshCw,
  User,
  Calendar,
  CheckCircle,
  AlertTriangle,
  PackagePlus,
  Lock,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ReceivingDetailPageProps {
  documentId: string;
  onBack: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const ReceivingDetailPage: React.FC<ReceivingDetailPageProps> = ({
  documentId,
  onBack,
  onNotify,
}) => {
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const [document, setDocument] = useState<ReceivingDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Receiving Action Modal State
  const [selectedItem, setSelectedItem] = useState<ReceivingItem | null>(null);
  const [incrementQty, setIncrementQty] = useState<number>(1);
  const [receivingSubmitting, setReceivingSubmitting] = useState(false);
  const [completingSubmitting, setCompletingSubmitting] = useState(false);

  const fetchDocumentDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/receivings/${documentId}`);
      if (res.data.success) {
        setDocument(res.data.data);
      }
    } catch (err: any) {
      onNotify('error', 'Gagal memuat detail dokumen receiving.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentDetail();
  }, [documentId]);

  const handleOpenReceiveModal = (item: ReceivingItem) => {
    setSelectedItem(item);
    // Default to remaining quantity or 1
    const defaultQty = Math.min(item.remaining_quantity, 10) || 1;
    setIncrementQty(defaultQty);
  };

  // Real-time validation calculation
  const remainingAllowed = selectedItem ? selectedItem.remaining_quantity : 0;
  const isOverReceiving = incrementQty > remainingAllowed;
  const isInvalidQuantity = incrementQty <= 0 || !Number.isInteger(Number(incrementQty));
  const isReceiveDisabled = isOverReceiving || isInvalidQuantity || receivingSubmitting;

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !document) return;

    if (isOverReceiving) {
      onNotify(
        'error',
        `Over-receiving dilarang! Kuantitas maksimal yang diizinkan adalah ${remainingAllowed}.`
      );
      return;
    }

    setReceivingSubmitting(true);
    try {
      const res = await api.post(`/receivings/${document.id}/receive`, {
        item_id: selectedItem.id,
        increment_quantity: Number(incrementQty),
      });

      if (res.data.success) {
        onNotify(
          'success',
          `Berhasil menerima ${incrementQty} ${selectedItem.unit} untuk ${selectedItem.sku}!`
        );
        setSelectedItem(null);
        fetchDocumentDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses penerimaan barang.';
      onNotify('error', msg);
    } finally {
      setReceivingSubmitting(false);
    }
  };

  const handleCompleteDocument = async () => {
    if (!document) return;
    if (!allCompleted) {
      onNotify(
        'warning',
        'Dokumen belum dapat diselesaikan. Seluruh item harus berstatus COMPLETED terlebih dahulu.'
      );
      return;
    }

    setCompletingSubmitting(true);
    try {
      const res = await api.post(`/receivings/${document.id}/complete`);
      if (res.data.success) {
        onNotify(
          'success',
          `Dokumen ${document.doc_number} telah berhasil diselesaikan & dikunci permanen!`
        );
        fetchDocumentDetail();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyelesaikan dokumen receiving.';
      onNotify('error', msg);
    } finally {
      setCompletingSubmitting(false);
    }
  };

  if (loading && !document) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <span className="text-sm">Memuat rincian dokumen penerimaan...</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p>Dokumen tidak ditemukan.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-800 rounded-xl text-xs text-white hover:bg-slate-700"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const isDocumentCompleted = document.status === 'COMPLETED';
  const allCompleted =
    document.items.length > 0 && document.items.every((it) => it.status === 'COMPLETED');
  const totalItemsCount = document.items.length;
  const completedItemsCount = document.items.filter((it) => it.status === 'COMPLETED').length;
  const progressPercent =
    totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top back navigation & status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white font-mono">{document.doc_number}</h2>
              <StatusBadge status={document.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>SPV: {document.supervisor_username}</span>
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(document.created_at).toLocaleDateString('id-ID')}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocumentDetail}
            title="Refresh Detail"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Supervisor Action: Complete Receiving Document */}
          {isSupervisor && (
            <div className="relative group">
              <button
                type="button"
                disabled={!allCompleted || isDocumentCompleted || completingSubmitting}
                onClick={handleCompleteDocument}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl font-semibold text-xs transition transform ${
                  isDocumentCompleted
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : allCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95'
                    : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                {isDocumentCompleted ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Dokumen Telah Selesai (Locked)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {completingSubmitting ? 'Memproses...' : 'Selesaikan Dokumen (Complete)'}
                    </span>
                  </>
                )}
              </button>

              {!allCompleted && !isDocumentCompleted && (
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-72 p-2.5 bg-slate-900 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 shadow-xl z-20">
                  <div className="flex items-start gap-1.5 font-semibold text-amber-400 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Syarat Penyelesaian Belum Terpenuhi</span>
                  </div>
                  Dokumen hanya dapat ditutup jika <strong>seluruh item</strong> telah diterima 100%
                  penuh (status COMPLETED).
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress & Document Overview Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Progres Verifikasi Fisik Barang
            </div>
            <div className="text-sm font-medium text-slate-200 mt-0.5">
              {completedItemsCount} dari {totalItemsCount} item telah diterima tuntas
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-emerald-400">{progressPercent}%</span>
          </div>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              progressPercent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-500 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isDocumentCompleted && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              Dokumen ini telah selesai dan dikunci secara permanen. Seluruh stok telah dibukukan ke
              inventaris gudang dan kartu stok log.
            </span>
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <div className="font-semibold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Rincian Baris Item Inbound</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {document.items.length} Item Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">SKU / Nama Barang</th>
                <th className="py-3.5 px-4">Satuan</th>
                <th className="py-3.5 px-4 text-center">Status Item</th>
                <th className="py-3.5 px-4 text-right">Target Ekspektasi</th>
                <th className="py-3.5 px-4 text-right">Telah Diterima</th>
                <th className="py-3.5 px-4 text-right">Sisa Belum Tiba</th>
                <th className="py-3.5 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {document.items.map((item) => {
                const isItemComplete = item.status === 'COMPLETED';

                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-4">
                      <div className="font-mono font-semibold text-emerald-400 text-sm">
                        {item.sku}
                      </div>
                      <div className="text-slate-200 text-xs mt-0.5 font-medium">
                        {item.product_name}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-200 text-sm">
                      {item.expected_quantity}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {item.received_quantity}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          item.remaining_quantity === 0 ? 'text-slate-500' : 'text-amber-400'
                        }
                      >
                        {item.remaining_quantity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {isDocumentCompleted ? (
                        <span className="text-[11px] text-slate-500 font-mono">Terkunci</span>
                      ) : isItemComplete ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lengkap</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenReceiveModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition shadow-sm hover:shadow-emerald-500/10"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Catat Masuk</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Penerimaan Barang Aktual (Operator / Supervisor) */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Catat Penerimaan Barang Fisik (Inbound)"
        maxWidth="md"
      >
        {selectedItem && (
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
            {/* Item Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SKU Barang:</span>
                <span className="font-mono font-bold text-emerald-400">{selectedItem.sku}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nama Produk:</span>
                <span className="text-white font-medium text-right max-w-xs truncate">
                  {selectedItem.product_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center font-mono">
                <div className="p-2 rounded-lg bg-slate-900">
                  <div className="text-[10px] text-slate-500 uppercase">Ekspektasi</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {selectedItem.expected_quantity}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900">
                  <div className="text-[10px] text-slate-500 uppercase">Telah Diterima</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {selectedItem.received_quantity}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 uppercase">Sisa Ekspektasi</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">
                    {selectedItem.remaining_quantity}
                  </div>
                </div>
              </div>
            </div>

            {/* Input Kuantitas Masuk dengan Real-Time Validation */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-300">
                  Jumlah Fisik Diterima Sekarang ({selectedItem.unit}){' '}
                  <span className="text-emerald-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIncrementQty(selectedItem.remaining_quantity)}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  Terima Penuh ({selectedItem.remaining_quantity})
                </button>
              </div>

              <input
                type="number"
                min={1}
                max={selectedItem.remaining_quantity}
                required
                value={incrementQty}
                onChange={(e) => setIncrementQty(parseInt(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-lg font-mono font-bold text-white text-center focus:outline-none transition ${
                  isOverReceiving
                    ? 'border-rose-500 focus:border-rose-400 text-rose-300 bg-rose-500/5'
                    : 'border-slate-800 focus:border-emerald-500'
                }`}
              />

              {/* REAL-TIME VALIDATION WARNING ALERTS */}
              {isOverReceiving && (
                <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Peringatan Over-Receiving!</div>
                    <div className="text-[11px] mt-0.5">
                      Jumlah {incrementQty} melebihi sisa ekspektasi (
                      <strong>{selectedItem.remaining_quantity} {selectedItem.unit}</strong>). Sistem
                      menolak penerimaan melebihi pesanan.
                    </div>
                  </div>
                </div>
              )}

              {isInvalidQuantity && !isOverReceiving && (
                <p className="text-rose-400 text-[11px] mt-1">
                  Kuantitas harus berupa bilangan bulat positif (&gt; 0).
                </p>
              )}

              {!isOverReceiving && !isInvalidQuantity && (
                <p className="text-slate-400 text-[11px] mt-1 flex items-center gap-1 text-emerald-400/90">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Kuantitas valid. Saldo inventaris akan otomatis bertambah +{incrementQty}{' '}
                  {selectedItem.unit}.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isReceiveDisabled}
                className={`px-5 py-2 rounded-xl font-semibold transition ${
                  isReceiveDisabled
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95'
                }`}
              >
                {receivingSubmitting ? 'Membukukan...' : 'Konfirmasi Masuk Gudang'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
