import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import type { ReceivingDocumentSummary, Product } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Truck,
  Plus,
  RefreshCw,
  ChevronRight,
  FileText,
  User,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface ReceivingsPageProps {
  onSelectDocument: (docId: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const ReceivingsPage: React.FC<ReceivingsPageProps> = ({
  onSelectDocument,
  isCreateModalOpen,
  setIsCreateModalOpen,
  onNotify,
}) => {
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const [documents, setDocuments] = useState<ReceivingDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Products for Document Creation modal
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [docNumber, setDocNumber] = useState('');
  const [docItems, setDocItems] = useState<{ productId: string; expectedQuantity: number }[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }
      const res = await api.get('/receivings', { params });
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat daftar dokumen receiving.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 100 } });
      if (res.data.success) {
        setAvailableProducts(res.data.data);
        if (res.data.data.length > 0 && docItems.length === 0) {
          setDocItems([{ productId: res.data.data[0].id, expectedQuantity: 10 }]);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filterStatus]);

  useEffect(() => {
    if (isCreateModalOpen) {
      const defaultDocNumber = `RCV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      setDocNumber(defaultDocNumber);
      fetchAvailableProducts();
    }
  }, [isCreateModalOpen]);

  const handleAddItemRow = () => {
    if (availableProducts.length > 0) {
      setDocItems([...docItems, { productId: availableProducts[0].id, expectedQuantity: 10 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    if (docItems.length > 1) {
      setDocItems(docItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: 'productId' | 'expectedQuantity', value: any) => {
    const updated = [...docItems];
    updated[index] = { ...updated[index], [field]: value };
    setDocItems(updated);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      onNotify('warning', 'Nomor dokumen wajib diisi.');
      return;
    }
    if (docItems.length === 0) {
      onNotify('warning', 'Dokumen harus memiliki setidaknya satu item.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/receivings', {
        doc_number: docNumber.trim().toUpperCase(),
        items: docItems.map((item) => ({
          product_id: item.productId,
          expected_quantity: Number(item.expectedQuantity),
        })),
      });

      if (res.data.success) {
        onNotify('success', `Dokumen ${docNumber} berhasil dibuat dengan status DRAFT!`);
        setIsCreateModalOpen(false);
        fetchDocuments();
        onSelectDocument(res.data.data.id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal membuat dokumen receiving.';
      onNotify('error', msg);
    } finally {
      setCreating(false);
    }
  };

  // Metrics
  const totalCount = documents.length;
  const inProgressCount = documents.filter((d) => d.status === 'IN_PROGRESS').length;
  const completedCount = documents.filter((d) => d.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Top Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>Dokumen Penerimaan Barang (Receiving)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar pengiriman barang vendor masuk ke area verifikasi fisik gudang
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            title="Refresh Data"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {isSupervisor && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-semibold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Dokumen Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Dokumen
            </div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">{totalCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sedang Berjalan (In Progress)
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
              {inProgressCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Selesai (Completed)
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {completedCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        {['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === status
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            {status === 'ALL'
              ? 'Semua Status'
              : status === 'IN_PROGRESS'
              ? 'In Progress'
              : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">No. Dokumen</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Kelengkapan Item</th>
                <th className="py-3.5 px-4">Supervisor</th>
                <th className="py-3.5 px-4">Tanggal Dibuat</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Memuat dokumen receiving...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    Tidak ada dokumen penerimaan yang cocok.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const percent =
                    doc.total_items > 0
                      ? Math.round((doc.completed_items / doc.total_items) * 100)
                      : 0;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onSelectDocument(doc.id)}
                      className="hover:bg-slate-900/60 cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>{doc.doc_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-mono text-slate-300 font-medium">
                              {doc.completed_items} / {doc.total_items} Item Selesai
                            </span>
                            <span className="font-mono text-slate-400">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                percent === 100 ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{doc.supervisor_username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium group-hover:bg-emerald-500/20 group-hover:text-emerald-300">
                          <span>Buka Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Dokumen (Supervisor Only) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat Dokumen Penerimaan Baru (Supervisor)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nomor Dokumen Receiving <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
              placeholder="Contoh: RCV-20261024-001"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:border-emerald-500 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nomor referensi unik yang menghubungkan manifest vendor atau purchase order.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-300">
                Daftar Item & Kuantitas Ekspektasi Masuk <span className="text-emerald-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {docItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                >
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.expectedQuantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'expectedQuantity', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      placeholder="Target Qty"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-right focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={docItems.length <= 1}
                    onClick={() => handleRemoveItemRow(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {creating ? 'Menerbitkan...' : 'Terbitkan Dokumen (DRAFT)'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
