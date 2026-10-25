import React, { useState, useEffect, useRef } from 'react';
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
  Barcode,
  Clock,
} from 'lucide-react';

interface ReceivingDetailPageProps {
  documentId: string;
  onBack: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
  onUpdated?: () => void;
  isModal?: boolean;
}

export const ReceivingDetailPage: React.FC<ReceivingDetailPageProps> = ({
  documentId,
  onBack,
  onNotify,
  onUpdated,
  isModal = false,
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

  // Quick Barcode / SKU Scan State
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocumentDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/receivings/${documentId}`);
      if (res.data.success) {
        setDocument(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat detail dokumen penerimaan barang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentDetail();
  }, [documentId]);

  const handleOpenReceiveModal = (item: ReceivingItem) => {
    setSelectedItem(item);
    const defaultQty = Math.min(item.remaining_quantity, 10) || 1;
    setIncrementQty(defaultQty);
  };

  // Real-time calculation
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
        `Penerimaan melebihi sisa dilarang! Kuantitas maksimal yang diizinkan adalah ${remainingAllowed} ${selectedItem.unit}.`
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
          `Berhasil menerima ${incrementQty} ${selectedItem.unit} untuk produk ${selectedItem.sku}!`
        );
        setSelectedItem(null);
        setBarcodeQuery('');
        fetchDocumentDetail();
        onUpdated?.();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memproses penerimaan barang fisik.';
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
        'Dokumen belum dapat diselesaikan. Seluruh item barang harus berstatus SELESAI (100%) terlebih dahulu.'
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
        onUpdated?.();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyelesaikan dokumen receiving.';
      onNotify('error', msg);
    } finally {
      setCompletingSubmitting(false);
    }
  };

  // Barcode / SKU Quick Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeQuery.trim().toUpperCase();
    if (!query || !document) return;

    const matchedItem = document.items.find(
      (it) => it.sku.toUpperCase() === query || it.product_name.toUpperCase().includes(query)
    );

    if (!matchedItem) {
      onNotify('warning', `SKU / Barcode "${query}" tidak ditemukan dalam dokumen penerimaan ini.`);
      return;
    }

    if (matchedItem.status === 'COMPLETED') {
      onNotify('warning', `Item SKU "${matchedItem.sku}" telah selesai diterima 100%.`);
      return;
    }

    handleOpenReceiveModal(matchedItem);
  };

  if (loading && !document) {
    return (
      <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium">Memuat rincian dokumen penerimaan...</span>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-12 text-center text-slate-500 font-sans">
        <p className="text-base font-semibold">Dokumen tidak ditemukan.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-900 rounded-lg text-xs text-white hover:bg-slate-800 transition cursor-pointer"
        >
          {isModal ? 'Tutup Modal' : 'Kembali ke Daftar Dokumen'}
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
    <div className={`space-y-5 font-sans text-slate-900 ${isModal ? 'pb-2' : 'pb-12'}`}>
      {/* 1. Header Information & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3">
          {!isModal && (
            <button
              onClick={onBack}
              title="Kembali ke Daftar Dokumen"
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {document.doc_number}
              </span>
              <StatusBadge status={document.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Supervisor: <strong>{document.supervisor_username}</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(document.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocumentDetail}
            title="Muat Ulang Dokumen"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Supervisor Action: Selesaikan Dokumen */}
          {isSupervisor && (
            <div className="relative group">
              <button
                type="button"
                disabled={!allCompleted || isDocumentCompleted || completingSubmitting}
                onClick={handleCompleteDocument}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg font-semibold text-xs transition transform ${
                  isDocumentCompleted
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : allCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-70'
                }`}
              >
                {isDocumentCompleted ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Telah Selesai (Terkunci)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{completingSubmitting ? 'Memproses...' : 'Selesaikan Dokumen'}</span>
                  </>
                )}
              </button>

              {!allCompleted && !isDocumentCompleted && (
                <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-slate-900 text-white rounded-xl text-xs shadow-xl z-30 border border-slate-800">
                  <div className="flex items-start gap-1.5 font-semibold text-amber-300 mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Syarat Penyelesaian Dokumen</span>
                  </div>
                  Dokumen penerimaan hanya dapat diselesaikan jika <strong>seluruh item</strong> telah
                  diterima 100% lengkap (status Selesai).
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Overview & Verification Progress Ribbon */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progres Verifikasi Fisik Barang
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {completedItemsCount} dari {totalItemsCount} item telah tuntas diverifikasi
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/70">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${
              progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isDocumentCompleted ? (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Dokumen ini telah selesai dan dikunci secara permanen. Seluruh stok fisik telah dibukukan
              ke inventaris gudang dan dicatat dalam audit kartu stok.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Pemeriksaan fisik aktif. Operator dapat memasukkan jumlah aktual pada tiap baris item.
            </span>
          </div>
        )}
      </div>

      {/* 3. Barcode Quick Scanner Ribbon */}
      {!isDocumentCompleted && (
        <form
          onSubmit={handleBarcodeSubmit}
          className="bg-emerald-50/70 border border-emerald-200/80 p-3 sm:p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-emerald-900 text-xs font-medium">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold">Pemindai Barcode / SKU Cepat</div>
              <div className="text-[11px] text-emerald-700/90">
                Pindai barcode atau ketik SKU lalu tekan [Enter] untuk langsung mencatat penerimaan
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value.toUpperCase())}
                placeholder="Contoh: SKU-MON-001..."
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono uppercase text-slate-900 placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
            >
              Pindai & Proses
            </button>
          </div>
        </form>
      )}

      {/* 4. Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Rincian Baris Item Inbound</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {document.items.length} Item Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3 px-4">SKU / Nama Barang</th>
                <th className="py-3 px-4">Satuan</th>
                <th className="py-3 px-4 text-center">Status Item</th>
                <th className="py-3 px-4 text-right">Target</th>
                <th className="py-3 px-4 text-right">Diterima</th>
                <th className="py-3 px-4 text-right">Sisa</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {document.items.map((item) => {
                const isItemComplete = item.status === 'COMPLETED';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 align-middle">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {item.sku}
                      </span>
                      <div className="text-slate-900 text-xs mt-0.5 font-semibold">
                        {item.product_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {item.expected_quantity}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right font-mono font-bold text-emerald-600 text-xs sm:text-sm">
                      {item.received_quantity}
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right font-mono font-bold text-xs sm:text-sm">
                      <span
                        className={
                          item.remaining_quantity === 0 ? 'text-slate-400 font-normal' : 'text-amber-600'
                        }
                      >
                        {item.remaining_quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle text-right">
                      {isDocumentCompleted ? (
                        <span className="text-xs text-slate-400 font-mono">Terkunci</span>
                      ) : isItemComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Lengkap</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenReceiveModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
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

      {/* Footer Close Button for Modal Mode */}
      {isModal && (
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Tutup Rincian
          </button>
        </div>
      )}

      {/* 5. Modal Input Penerimaan Barang Fisik (Overlay z-[60]) */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Catat Penerimaan Barang Fisik Masuk"
        maxWidth="md"
        variant="light"
        zIndex="z-[60]"
      >
        {selectedItem && (
          <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs font-sans">
            {/* Item Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">SKU Barang:</span>
                <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                  {selectedItem.sku}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nama Produk:</span>
                <span className="text-slate-900 font-semibold text-right max-w-xs truncate">
                  {selectedItem.product_name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-200 text-center font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Target Masuk</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedItem.expected_quantity} {selectedItem.unit}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Telah Diterima</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">
                    {selectedItem.received_quantity} {selectedItem.unit}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-amber-200 bg-amber-50/40">
                  <div className="text-[10px] text-amber-700 uppercase font-semibold">Sisa Belum Tiba</div>
                  <div className="text-sm font-bold text-amber-700 mt-0.5">
                    {selectedItem.remaining_quantity} {selectedItem.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Input Kuantitas Masuk dengan Real-Time Over-receiving Validation */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 text-xs">
                  Jumlah Fisik Diterima Sekarang ({selectedItem.unit}){' '}
                  <span className="text-emerald-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIncrementQty(selectedItem.remaining_quantity)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Terima Penuh ({selectedItem.remaining_quantity} {selectedItem.unit})
                </button>
              </div>

              <input
                type="number"
                min={1}
                max={selectedItem.remaining_quantity}
                required
                value={incrementQty}
                onChange={(e) => setIncrementQty(parseInt(e.target.value) || 0)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-lg font-mono font-bold text-slate-900 text-center focus:outline-none transition shadow-sm ${
                  isOverReceiving
                    ? 'border-rose-500 focus:border-rose-500 text-rose-700 bg-rose-50/50'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />

              {/* REAL-TIME VALIDATION WARNING ALERTS */}
              {isOverReceiving && (
                <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">Peringatan Over-Receiving!</div>
                    <div className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      Jumlah {incrementQty} melebihi sisa yang diharapkan (
                      <strong>{selectedItem.remaining_quantity} {selectedItem.unit}</strong>). Sistem
                      gudang melarang penerimaan barang melebihi kuantitas manifes.
                    </div>
                  </div>
                </div>
              )}

              {isInvalidQuantity && !isOverReceiving && (
                <p className="text-rose-600 text-xs mt-1.5 font-medium">
                  Kuantitas harus berupa bilangan bulat positif (&gt; 0).
                </p>
              )}

              {!isOverReceiving && !isInvalidQuantity && (
                <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1.5 text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Kuantitas valid. Saldo inventaris akan langsung bertambah +{incrementQty}{' '}
                  {selectedItem.unit}.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isReceiveDisabled}
                className={`px-5 py-2.5 rounded-lg font-semibold text-xs text-white transition cursor-pointer flex items-center gap-1.5 ${
                  isReceiveDisabled
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm'
                }`}
              >
                {receivingSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membukukan ke Stok...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi Masuk Gudang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
