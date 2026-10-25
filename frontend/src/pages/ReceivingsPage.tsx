import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import type { ReceivingDocumentSummary, ReceivingDocumentDetail, Product } from '../types/index.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import { useAuth } from '../context/AuthContext.js';
import { ReceivingDetailPage } from './ReceivingDetailPage.js';
import { printGoodsReceipt } from '../utils/printReceipt.js';
import { exportToExcel, printToPDF, exportToCSV, type ExportColumn } from '../utils/exportUtils.js';
import { ExportButtonGroup } from '../components/common/ExportButtonGroup.js';
import {
  Truck,
  Plus,
  RefreshCw,
  FileText,
  User,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  X,
  PackageOpen,
  Eye,
  Printer,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface ReceivingsPageProps {
  selectedDocId?: string | null;
  onClearSelectedDocId?: () => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const ReceivingsPage: React.FC<ReceivingsPageProps> = ({
  selectedDocId,
  onClearSelectedDocId,
  isCreateModalOpen,
  setIsCreateModalOpen,
  onNotify,
}) => {
  const { user, role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const [documents, setDocuments] = useState<ReceivingDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Active detail modal state (opens as a popup without route change!)
  const [activeDetailDocId, setActiveDetailDocId] = useState<string | null>(selectedDocId || null);

  // Print Goods Receipt Slip states (hanya untuk dokumen yang sudah konfirmasi / COMPLETED)
  const [printSlipDoc, setPrintSlipDoc] = useState<ReceivingDocumentDetail | null>(null);
  const [isPrintSlipOpen, setIsPrintSlipOpen] = useState(false);
  const [loadingPrintSlip, setLoadingPrintSlip] = useState(false);

  const handleOpenPrintSlip = async (docId: string) => {
    setLoadingPrintSlip(true);
    setIsPrintSlipOpen(true);
    try {
      const res = await api.get(`/receivings/${docId}`);
      if (res.data.success) {
        setPrintSlipDoc(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat rincian bukti penerimaan barang.');
      setIsPrintSlipOpen(false);
    } finally {
      setLoadingPrintSlip(false);
    }
  };

  const slipExportColumns: ExportColumn[] = [
    { header: 'No', key: '_index', width: 40, align: 'center' },
    { header: 'SKU Produk', key: 'sku', width: 120 },
    { header: 'Nama Produk', key: 'product_name', width: 220 },
    { header: 'Satuan', key: 'unit', width: 70, align: 'center' },
    {
      header: 'Target Qty',
      key: 'expected_quantity',
      width: 90,
      align: 'right',
      format: (val) => Number(val || 0),
    },
    {
      header: 'Diterima Fisik',
      key: 'received_quantity',
      width: 90,
      align: 'right',
      format: (val) => Number(val || 0),
    },
    {
      header: 'Sisa Belum Diterima',
      key: 'remaining_quantity',
      width: 90,
      align: 'right',
      format: (val) => Number(val || 0),
    },
    {
      header: 'Status Item',
      key: 'status',
      width: 110,
      align: 'center',
      format: (val) =>
        val === 'COMPLETED' ? 'Selesai' : val === 'PARTIAL' ? 'Sebagian' : 'Belum Diterima',
    },
  ];

  const handleExportSlipExcel = () => {
    if (!printSlipDoc) return;
    exportToExcel({
      title: `Surat Bukti Penerimaan Barang - ${printSlipDoc.doc_number}`,
      subtitle: `Supervisor: ${printSlipDoc.supervisor_username} | Tanggal: ${new Date(
        printSlipDoc.created_at
      ).toLocaleDateString('id-ID')}`,
      filename: `bukti_penerimaan_${printSlipDoc.doc_number}`,
      columns: slipExportColumns,
      data: printSlipDoc.items,
      summaryItems: [
        { label: 'Total Item SKU', value: printSlipDoc.items.length },
        {
          label: 'Total Target',
          value: `${printSlipDoc.items.reduce(
            (s, it) => s + (it.expected_quantity || 0),
            0
          )} unit`,
        },
        {
          label: 'Total Diterima Fisik',
          value: `${printSlipDoc.items.reduce(
            (s, it) => s + (it.received_quantity || 0),
            0
          )} unit`,
        },
        { label: 'Status Dokumen', value: 'SELESAI (100% LENGKAP)' },
      ],
      printedBy: { name: user?.username, role: role || 'Pengguna' },
    });
    onNotify(
      'success',
      `Bukti penerimaan ${printSlipDoc.doc_number} berhasil diekspor ke Excel (.xls)!`
    );
  };

  const handleExportSlipCSV = () => {
    if (!printSlipDoc) return;
    exportToCSV({
      title: `Surat Bukti Penerimaan Barang - ${printSlipDoc.doc_number}`,
      filename: `bukti_penerimaan_${printSlipDoc.doc_number}`,
      columns: slipExportColumns,
      data: printSlipDoc.items,
    });
    onNotify(
      'success',
      `Bukti penerimaan ${printSlipDoc.doc_number} berhasil diekspor ke format CSV!`
    );
  };

  // Sync external selection (e.g. from notification click)
  useEffect(() => {
    if (selectedDocId) {
      setActiveDetailDocId(selectedDocId);
    }
  }, [selectedDocId]);

  // Products for Document Creation modal
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [docNumber, setDocNumber] = useState('');
  const [docItems, setDocItems] = useState<{ productId: string; expectedQuantity: number }[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }
      const res = await api.get('/receivings', { params });
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat daftar dokumen penerimaan barang.');
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

  // Client-side search filtering
  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.trim().toLowerCase();
    return documents.filter(
      (doc) =>
        doc.doc_number.toLowerCase().includes(q) ||
        (doc.supervisor_username && doc.supervisor_username.toLowerCase().includes(q))
    );
  }, [documents, search]);

  // Pagination states (5 items per page / layer)
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search query or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDocuments.slice(start, start + PAGE_SIZE);
  }, [filteredDocuments, currentPage]);

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
      onNotify('warning', 'Dokumen harus memiliki setidaknya satu item barang.');
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
        onNotify('success', `Dokumen ${docNumber} berhasil diterbitkan dengan status DRAF!`);
        setIsCreateModalOpen(false);
        fetchDocuments();
        // Immediately open the detail modal for this newly created document!
        setActiveDetailDocId(res.data.data.id);
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

  const exportColumns: ExportColumn[] = [
    { header: 'No', key: '_index', width: 40, align: 'center' },
    { header: 'No. Dokumen', key: 'doc_number', width: 140 },
    {
      header: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      format: (val) =>
        val === 'COMPLETED' ? 'Selesai' : val === 'IN_PROGRESS' ? 'Sedang Berjalan' : 'Draft',
    },
    {
      header: 'Total Item SKU',
      key: 'total_items',
      width: 90,
      align: 'right',
      format: (val) => Number(val || 0),
    },
    {
      header: 'Item Selesai',
      key: 'completed_items',
      width: 90,
      align: 'right',
      format: (val) => Number(val || 0),
    },
    {
      header: 'Progres (%)',
      key: 'percentage',
      width: 80,
      align: 'center',
      format: (_, doc) => {
        const total = Number(doc.total_items || 0);
        const comp = Number(doc.completed_items || 0);
        return total > 0 ? `${Math.round((comp / total) * 100)}%` : '0%';
      },
    },
    { header: 'Supervisor Penerbit', key: 'supervisor_username', width: 130 },
    {
      header: 'Tanggal Dibuat',
      key: 'created_at',
      width: 140,
      align: 'center',
      format: (val) => (val ? new Date(val).toLocaleString('id-ID') : '-'),
    },
  ];

  const getExportOptions = () => ({
    title: 'Daftar Dokumen Penerimaan Barang (Receiving)',
    subtitle:
      filterStatus !== 'ALL'
        ? `Status: ${filterStatus}`
        : search
        ? `Pencarian: "${search}"`
        : 'Seluruh Manifes Dokumen Receiving',
    filename: `logiflow_dokumen_receiving_${new Date().toISOString().split('T')[0]}`,
    columns: exportColumns,
    data: filteredDocuments,
    summaryItems: [
      { label: 'Total Dokumen', value: filteredDocuments.length },
      { label: 'Selesai', value: filteredDocuments.filter((d) => d.status === 'COMPLETED').length },
      { label: 'Sedang Berjalan', value: filteredDocuments.filter((d) => d.status === 'IN_PROGRESS').length },
      { label: 'Draft', value: filteredDocuments.filter((d) => d.status === 'DRAFT').length },
    ],
    printedBy: { name: user?.username, role: role || 'Pengguna' },
  });

  const handleExportPDF = () => {
    if (filteredDocuments.length === 0) {
      onNotify('warning', 'Tidak ada data dokumen receiving untuk dicetak.');
      return;
    }
    printToPDF(getExportOptions());
    onNotify('success', 'Jendela cetak PDF daftar dokumen receiving berhasil disiapkan!');
  };

  const handleExportExcel = () => {
    if (filteredDocuments.length === 0) {
      onNotify('warning', 'Tidak ada data dokumen receiving untuk diekspor.');
      return;
    }
    exportToExcel(getExportOptions());
    onNotify('success', `${filteredDocuments.length} dokumen receiving berhasil diekspor ke Excel (.xls)!`);
  };

  const handleExportCSV = () => {
    if (filteredDocuments.length === 0) {
      onNotify('warning', 'Tidak ada data dokumen receiving untuk diekspor.');
      return;
    }
    exportToCSV(getExportOptions());
    onNotify('success', `${filteredDocuments.length} dokumen receiving berhasil diekspor ke format CSV!`);
  };

  return (
    <div className="font-sans text-slate-900">
      {/* 1. Fixed / Sticky Page Header Bar (Flush with Navbar) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 py-3.5 mb-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <span>Dokumen Penerimaan Barang (Receiving)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manifes penerimaan fisik barang masuk dari vendor dan pemasok
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={fetchDocuments}
              title="Muat Ulang Dokumen"
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {isSupervisor && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition transform active:scale-[0.99] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Dokumen Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Body Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12 space-y-6">
        {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Dokumen Penerimaan</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 font-mono">{totalCount} Dokumen</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Sedang Berjalan (In Progress)</div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5 font-mono">
              {inProgressCount} Dokumen
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Selesai Diverifikasi (Completed)</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5 font-mono">
              {completedCount} Dokumen
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan No. Dokumen (RCV-...) atau nama supervisor..."
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

        {/* Right side: Status Dropdown Filter and Export Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[170px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer appearance-none shadow-sm"
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">Draf</option>
              <option value="IN_PROGRESS">Sedang Berjalan</option>
              <option value="COMPLETED">Selesai</option>
            </select>
            <div className="absolute right-2.5 top-3 pointer-events-none text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <ExportButtonGroup
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            disabled={loading || filteredDocuments.length === 0}
          />
        </div>
      </div>

      {/* 4. Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-5">No. Dokumen</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Kelengkapan Item</th>
                <th className="py-3.5 px-5">Supervisor</th>
                <th className="py-3.5 px-5">Tanggal Dibuat</th>
                <th className="py-3.5 px-5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium">Memuat data dokumen penerimaan barang...</p>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-semibold text-slate-700">Tidak ada dokumen penerimaan yang sesuai</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || filterStatus !== 'ALL'
                        ? 'Coba hapus kata kunci pencarian atau ganti filter status dokumen.'
                        : 'Belum ada dokumen yang dibuat. Supervisor dapat menerbitkan dokumen baru.'}
                    </p>
                    {(search || filterStatus !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setFilterStatus('ALL');
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Atur Ulang Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((doc) => {
                  const percent =
                    doc.total_items > 0
                      ? Math.round((doc.completed_items / doc.total_items) * 100)
                      : 0;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setActiveDetailDocId(doc.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition group"
                    >
                      <td className="py-4 px-5 align-middle">
                        <div className="font-mono font-semibold text-emerald-700 group-hover:text-emerald-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{doc.doc_number}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <div className="w-44">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono text-slate-700 font-medium">
                              {doc.completed_items} / {doc.total_items} Item Tuntas
                            </span>
                            <span className="font-mono font-semibold text-slate-500">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                percent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-middle">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.supervisor_username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 align-middle font-mono text-xs text-slate-500">
                        {new Date(doc.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-5 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Cetak Bukti Penerimaan (Hanya aktif jika sudah di-ACC / COMPLETED) */}
                          {doc.status === 'COMPLETED' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPrintSlip(doc.id);
                              }}
                              title="Cetak Bukti Penerimaan Barang (Dokumen Telah di-ACC Supervisor)"
                              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-sm cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Bukti</span>
                            </button>
                          ) : (
                            <span
                              title="Menunggu pemeriksaan & ACC dari Supervisor. Bukti penerimaan hanya dapat dicetak setelah di-ACC."
                              className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 cursor-not-allowed"
                            >
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Menunggu ACC</span>
                            </span>
                          )}

                          {/* Buka Detail (Icon Mata Saja) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDetailDocId(doc.id);
                            }}
                            title="Buka Detail Dokumen"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white group-hover:bg-emerald-50 group-hover:border-emerald-200 text-slate-600 group-hover:text-emerald-700 transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
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
          totalItems={filteredDocuments.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="dokumen"
        />
      </div>

      {/* 5. MODAL BUKA DETAIL DOKUMEN RECEIVING (Muncul sebagai Modal, Tidak Pindah Route!) */}
      <Modal
        isOpen={!!activeDetailDocId}
        onClose={() => {
          setActiveDetailDocId(null);
          onClearSelectedDocId?.();
          fetchDocuments();
        }}
        title="Rincian Dokumen Penerimaan Barang"
        maxWidth="5xl"
        variant="light"
      >
        {activeDetailDocId && (
          <ReceivingDetailPage
            documentId={activeDetailDocId}
            onBack={() => {
              setActiveDetailDocId(null);
              onClearSelectedDocId?.();
              fetchDocuments();
            }}
            onNotify={onNotify}
            onUpdated={fetchDocuments}
            isModal={true}
          />
        )}
      </Modal>

      {/* 6. MODAL CETAK BUKTI PENERIMAAN BARANG (Hanya untuk dokumen terkonfirmasi / COMPLETED) */}
      <Modal
        isOpen={isPrintSlipOpen}
        onClose={() => {
          setIsPrintSlipOpen(false);
          setPrintSlipDoc(null);
        }}
        title="Surat Bukti Penerimaan Barang (Goods Receipt Slip)"
        maxWidth="lg"
        variant="light"
      >
        {loadingPrintSlip || !printSlipDoc ? (
          <div className="py-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs font-medium">Memuat data bukti penerimaan...</p>
          </div>
        ) : (
          <div className="space-y-4 font-sans text-xs">
            {/* Printable Container */}
            <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-4" id="printable-receipt">
              {/* Header Slip */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">LOGIFLOW WMS</h3>
                  <p className="text-xs text-slate-500">Bukti Verifikasi & Tanda Terima Barang Gudang</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-900">{printSlipDoc.doc_number}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(printSlipDoc.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Meta Information */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">Supervisor Penanggung Jawab:</div>
                  <div className="font-bold text-slate-800">{printSlipDoc.supervisor_username}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status Dokumen:</div>
                  <div className="font-bold text-emerald-700">
                    SELESAI (100% LENGKAP & TERKONFIRMASI)
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">No.</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3">Nama Produk</th>
                      <th className="py-2 px-3">Satuan</th>
                      <th className="py-2 px-3 text-right">Target</th>
                      <th className="py-2 px-3 text-right">Diterima</th>
                      <th className="py-2 px-3 text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {printSlipDoc.items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.sku}</td>
                        <td className="py-2 px-3 font-sans text-slate-900">{item.product_name}</td>
                        <td className="py-2 px-3">{item.unit}</td>
                        <td className="py-2 px-3 text-right font-bold">{item.expected_quantity}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{item.received_quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{item.remaining_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <div className="text-slate-500 mb-12">Petugas Gudang / Penerima:</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                    ( {printSlipDoc.supervisor_username} )
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-12">Driver / Kurir Pengirim Vendor:</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                    ( ........................................ )
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Cetak PDF, Excel, CSV, Tutup */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsPrintSlipOpen(false);
                  setPrintSlipDoc(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                {/* 1. Cetak PDF */}
                <button
                  type="button"
                  onClick={() => {
                    if (printSlipDoc) {
                      printGoodsReceipt(printSlipDoc);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Cetak Bukti Penerimaan / Simpan sebagai PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cetak PDF</span>
                </button>

                {/* 2. Unduh Excel */}
                <button
                  type="button"
                  onClick={handleExportSlipExcel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Unduh Bukti Penerimaan Format Excel (.xls)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>

                {/* 3. Unduh CSV */}
                <button
                  type="button"
                  onClick={handleExportSlipCSV}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Unduh Data Mentah Format CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Modal Buat Dokumen Baru (Supervisor Only) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Terbitkan Dokumen Penerimaan Baru"
        maxWidth="lg"
        variant="light"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nomor Dokumen Penerimaan <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              required
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
              placeholder="Contoh: RCV-20261024-001"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Nomor unik dokumen yang mengikat surat jalan dari vendor atau Purchase Order (PO).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Daftar Item & Target Kuantitas Masuk <span className="text-emerald-600">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold text-xs cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris Item</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {docItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/90"
                >
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500 text-xs shadow-sm cursor-pointer"
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-36">
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.expectedQuantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'expectedQuantity', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      placeholder="Target Qty"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-right focus:outline-none focus:border-emerald-500 text-xs shadow-sm"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={docItems.length <= 1}
                    onClick={() => handleRemoveItemRow(idx)}
                    title="Hapus baris item"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Terbitkan Dokumen (DRAF)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
};
