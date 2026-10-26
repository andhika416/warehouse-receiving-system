import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import type { Product } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { Modal } from '../components/Modal.js';
import { Pagination } from '../components/Pagination.js';
import { exportToExcel, printToPDF, exportToCSV, type ExportColumn } from '../utils/exportUtils.js';
import { ExportButtonGroup } from '../components/common/ExportButtonGroup.js';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Boxes,
  RefreshCw,
  PackageOpen,
  Filter,
  CheckCircle2,
  X,
  Layers,
  ArrowUpDown,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface ProductsPageProps {
  onNotify: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const COMMON_UNITS = [
  { value: 'PCS', label: 'PCS (Pieces / Satuan)' },
  { value: 'BOX', label: 'BOX (Kardus / Karton)' },
  { value: 'PALLET', label: 'PALLET (Palet Kayu / Plastik)' },
  { value: 'UNIT', label: 'UNIT (Perangkat / Item Lengkap)' },
  { value: 'ROLL', label: 'ROLL (Gulungan Kabel / Film)' },
  { value: 'CARTON', label: 'CARTON (Dus Besar Kemasan)' },
  { value: 'KG', label: 'KG (Kilogram Berat Fisik)' },
  { value: 'SET', label: 'SET (Paket / Bundel)' },
];

export const ProductsPage: React.FC<ProductsPageProps> = ({ onNotify }) => {
  const { user, role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Add Product Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Product Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('PCS');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // View Details Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Delete Confirmation Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: { search: search.trim() || undefined, limit: 100 },
      });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch {
      onNotify('error', 'Gagal memuat katalog produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  // Client-side category filtering
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;

    if (selectedCategory === 'IN_STOCK') {
      return products.filter((p) => (p.current_stock ?? 0) > 0);
    }
    if (selectedCategory === 'ZERO_STOCK') {
      return products.filter((p) => (p.current_stock ?? 0) === 0);
    }
    if (selectedCategory === 'BOX_PALLET') {
      return products.filter((p) => ['BOX', 'PALLET', 'CARTON'].includes(p.unit));
    }
    if (selectedCategory === 'HARDWARE') {
      return products.filter((p) =>
        ['MON', 'SSD', 'KBD', 'HARDWARE'].some(
          (k) => p.sku.includes(k) || p.name.toUpperCase().includes(k)
        )
      );
    }
    if (selectedCategory === 'CABLING') {
      return products.filter((p) =>
        ['CAB', 'NET', 'CAT6', 'WIRE'].some(
          (k) => p.sku.includes(k) || p.name.toUpperCase().includes(k)
        )
      );
    }

    return products;
  }, [products, selectedCategory]);

  // Pagination states (5 items per layer / page)
  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search query or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Summary Metrics
  const totalSKUs = products.length;
  const inStockCount = products.filter((p) => (p.current_stock ?? 0) > 0).length;
  const totalPhysicalQuantity = products.reduce((acc, p) => acc + (p.current_stock ?? 0), 0);

  // 1. Create Product Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      onNotify('warning', 'SKU dan Nama Produk wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/products', {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        unit: unit.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      if (res.data.success) {
        onNotify('success', `Produk ${sku.toUpperCase()} berhasil didaftarkan!`);
        setIsAddModalOpen(false);
        setSku('');
        setName('');
        setDescription('');
        setUnit('PCS');
        fetchProducts();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan produk.';
      onNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Open Edit Product Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditUnit(p.unit || 'PCS');
    setEditDescription(p.description || '');
    setIsEditModalOpen(true);
  };

  // 3. Save Edit Product Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setSavingEdit(true);
    try {
      const res = await api.put(`/products/${editingProduct.id}`, {
        name: editName.trim(),
        unit: editUnit.trim().toUpperCase(),
        description: editDescription.trim() || undefined,
      });

      if (res.data.success) {
        onNotify('success', `Produk ${editingProduct.sku} berhasil diperbarui.`);
        setIsEditModalOpen(false);
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui produk.';
      onNotify('error', msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. View Details Handler
  const handleOpenView = (p: Product) => {
    setViewingProduct(p);
    setIsViewModalOpen(true);
  };

  // 5. Open Delete Modal
  const handleOpenDelete = (p: Product) => {
    setDeletingProduct(p);
    setIsDeleteModalOpen(true);
  };

  // 6. Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    setDeleting(true);
    try {
      const res = await api.delete(`/products/${deletingProduct.id}`);
      if (res.data.success) {
        onNotify('success', `Produk ${deletingProduct.sku} berhasil dihapus dari sistem.`);
        setIsDeleteModalOpen(false);
        setDeletingProduct(null);
        fetchProducts();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus produk.';
      onNotify('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: 'No', key: '_index', width: 40, align: 'center' },
    { header: 'SKU Produk', key: 'sku', width: 120 },
    { header: 'Nama Produk', key: 'name', width: 240 },
    { header: 'Satuan', key: 'unit', width: 70, align: 'center' },
    {
      header: 'Total Saldo Stok',
      key: 'current_stock',
      width: 100,
      align: 'right',
      format: (val) => Number(val ?? 0),
    },
    {
      header: 'Deskripsi',
      key: 'description',
      width: 200,
      format: (val) => val || '-',
    },
    {
      header: 'Tanggal Dibuat',
      key: 'created_at',
      width: 120,
      align: 'center',
      format: (val) => (val ? new Date(val).toLocaleDateString('id-ID') : '-'),
    },
  ];

  const getExportOptions = () => ({
    title: 'Katalog Master Produk Gudang',
    subtitle:
      selectedCategory !== 'ALL'
        ? `Kategori / Filter: ${selectedCategory}`
        : search
        ? `Filter Pencarian: "${search}"`
        : 'Seluruh Katalog Master Produk',
    filename: `logiflow_master_produk_${new Date().toISOString().split('T')[0]}`,
    columns: exportColumns,
    data: filteredProducts,
    summaryItems: [
      { label: 'Total Produk', value: filteredProducts.length },
      {
        label: 'Total Akumulasi Stok',
        value: `${filteredProducts
          .reduce((sum, p) => sum + (p.current_stock ?? 0), 0)
          .toLocaleString('id-ID')} unit`,
      },
    ],
    printedBy: { name: user?.username, role: role || 'Pengguna' },
  });

  const handleExportPDF = () => {
    if (filteredProducts.length === 0) {
      onNotify('warning', 'Tidak ada data produk untuk dicetak.');
      return;
    }
    printToPDF(getExportOptions());
    onNotify('success', 'Jendela cetak PDF katalog master produk berhasil disiapkan!');
  };

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      onNotify('warning', 'Tidak ada data produk untuk diekspor.');
      return;
    }
    exportToExcel(getExportOptions());
    onNotify('success', `${filteredProducts.length} produk berhasil diekspor ke Excel (.xls)!`);
  };

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      onNotify('warning', 'Tidak ada data produk untuk diekspor.');
      return;
    }
    exportToCSV(getExportOptions());
    onNotify('success', `${filteredProducts.length} produk berhasil diekspor ke format CSV!`);
  };


  return (
    <div className="font-sans text-slate-900">
      {/* 1. Fixed / Sticky Page Header Bar (Flush with Navbar) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5 mb-4 sm:mb-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>Master Data Produk</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola katalog master SKU, nama barang, dan satuan kemasan fisik gudang
            </p>
          </div>

          {/* Top Right Action: Tombol Tambah Produk */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={fetchProducts}
              title="Muat Ulang Data Produk"
              className="p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={() => {
                if (!isSupervisor) {
                  onNotify('warning', 'Hanya Supervisor yang dapat mendaftarkan SKU baru.');
                  return;
                }
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition transform active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Produk Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Body Content */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pb-12 space-y-4 sm:space-y-6">
        {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total SKU Terdaftar</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900">{totalSKUs} SKU</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total Stok Fisik Aktif</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900">
              {totalPhysicalQuantity.toLocaleString()} Unit Total
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Ketersediaan Stok Gudang</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900">
              {inStockCount} / {totalSKUs} SKU Tersedia
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left side: Wide search bar */}
        <div className="relative flex-1 w-full md:max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan SKU, nama produk..."
            className="w-full pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 sm:top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right side: Category dropdown filter and Export CSV */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:min-w-[180px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer appearance-none shadow-sm"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="HARDWARE">Elektronik & Perangkat Keras</option>
              <option value="CABLING">Kabel & Jaringan</option>
              <option value="BOX_PALLET">Kardus & Palet</option>
              <option value="IN_STOCK">Hanya SKU Tersedia</option>
              <option value="ZERO_STOCK">Stok Kosong (0)</option>
            </select>
            <div className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <ExportButtonGroup
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            disabled={loading || filteredProducts.length === 0}
          />
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-0.5">
          <table className="w-full min-w-[620px] text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-5">SKU</th>
                <th className="py-3.5 px-5">Nama Produk</th>
                <th className="py-3.5 px-5">Satuan</th>
                <th className="py-3.5 px-5 text-right">Total Stok</th>
                <th className="py-3.5 px-5 text-center w-32">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-medium">Memuat katalog master produk...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <PackageOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-semibold text-slate-700">Produk tidak ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || selectedCategory !== 'ALL'
                        ? 'Coba hapus kata kunci pencarian atau sesuaikan filter kategori.'
                        : 'Mulai dengan mengklik "+ Tambah Produk Baru" untuk mendaftarkan SKU pertama.'}
                    </p>
                    {(search || selectedCategory !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setSelectedCategory('ALL');
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Atur Ulang Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const stock = p.current_stock ?? 0;
                  const isStockAvailable = stock > 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenView(p)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* SKU (Monospace font badge) */}
                      <td className="py-4 px-5 align-middle">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200/90 tracking-wide">
                          {p.sku}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-4 px-5 align-middle">
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-xs text-slate-400 truncate max-w-md mt-0.5 font-normal">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Unit (e.g. PCS, BOX, PALLET) */}
                      <td className="py-4 px-5 align-middle">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.unit}
                        </span>
                      </td>

                      {/* Total Stock */}
                      <td className="py-4 px-5 align-middle text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                            isStockAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                              : 'bg-amber-50 text-amber-700 border-amber-200/70'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isStockAvailable ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                          />
                          <span>
                            {stock.toLocaleString()} {p.unit}
                          </span>
                        </span>
                      </td>

                      {/* Tindakan: Tombol Buka detail, edit produk, dan hapus produk */}
                      <td className="py-4 px-5 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Buka detail */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenView(p);
                            }}
                            title="Buka Rincian Produk"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white group-hover:bg-emerald-50 group-hover:border-emerald-200 text-slate-600 group-hover:text-emerald-700 transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit produk */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSupervisor) {
                                onNotify('warning', 'Hanya Supervisor yang dapat mengedit produk.');
                                return;
                              }
                              handleOpenEdit(p);
                            }}
                            title="Ubah Data Produk"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Hapus produk */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSupervisor) {
                                onNotify('warning', 'Hanya Supervisor yang dapat menghapus produk.');
                                return;
                              }
                              handleOpenDelete(p);
                            }}
                            title="Hapus Produk"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
          totalItems={filteredProducts.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemLabel="produk katalog"
        />
      </div>

      {/* 4. Modal Overlay (Tambah Produk) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Produk Baru"
        maxWidth="md"
        variant="light"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs font-sans">
          {/* Kode SKU */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode SKU <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="Contoh: SKU-BOX-100"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs uppercase placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Kode identifikasi unik untuk manajemen persediaan (otomatis diformat huruf kapital).
            </p>
          </div>

          {/* Nama Produk */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Produk <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Industrial Barcode Scanner 2D Wireless"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm"
            />
          </div>

          {/* Satuan Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Satuan Pengukuran (Unit of Measurement) <span className="text-emerald-600">*</span>
            </label>
            <select
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm cursor-pointer"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi & Spesifikasi Produk
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masukkan spesifikasi teknis produk, dimensi kemasan, atau catatan penyimpanan gudang..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm resize-none"
            />
          </div>

          {/* Tombol Aksi Modal */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Produk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        title={`Ubah Produk: ${editingProduct?.sku || ''}`}
        maxWidth="md"
        variant="light"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode SKU
            </label>
            <input
              type="text"
              disabled
              value={editingProduct?.sku || ''}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-xs cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              SKU bersifat tetap (immutable) untuk mempertahankan integritas data log penerimaan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Produk <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Satuan Pengukuran <span className="text-emerald-600">*</span>
            </label>
            <select
              required
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm cursor-pointer"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi & Spesifikasi
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingProduct(null);
              }}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {savingEdit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Perbarui Data Produk</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingProduct(null);
        }}
        title="Spesifikasi & Rincian Produk"
        maxWidth="md"
        variant="light"
      >
        {viewingProduct && (
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold px-3 py-1 rounded-md bg-white text-emerald-800 border border-slate-200 shadow-sm">
                  {viewingProduct.sku}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs">
                  {viewingProduct.current_stock ?? 0} {viewingProduct.unit} Tersedia di Gudang
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-900">{viewingProduct.name}</div>
                <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {viewingProduct.description || 'Tidak ada catatan spesifikasi tambahan.'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium">Satuan Pengukuran</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{viewingProduct.unit}</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="text-slate-400 font-medium">Saldo Fisik Gudang</div>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  {viewingProduct.current_stock ?? 0} {viewingProduct.unit}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 col-span-2">
                <div className="text-slate-400 font-medium">ID Sistem Basis Data (UUID)</div>
                <div className="font-mono text-[11px] text-slate-600 mt-0.5 break-all">
                  {viewingProduct.id}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingProduct(null);
                }}
                className="px-5 py-2.5 rounded-lg font-medium text-xs bg-slate-800 hover:bg-slate-900 text-white transition cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingProduct(null);
        }}
        title="Konfirmasi Hapus Produk"
        maxWidth="sm"
        variant="light"
      >
        {deletingProduct && (
          <div className="space-y-4 text-xs font-sans">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Hapus SKU: {deletingProduct.sku}?</div>
                <div className="text-xs text-rose-700 mt-1">
                  Tindakan ini akan menghapus produk <strong>{deletingProduct.name}</strong> secara permanen.
                </div>
              </div>
            </div>

            <p className="text-slate-600">
              Catatan: Produk yang masih memiliki saldo fisik aktif atau terikat pada dokumen penerimaan barang tidak dapat dihapus (ACID foreign key protection).
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingProduct(null);
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-lg font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Produk</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
};
