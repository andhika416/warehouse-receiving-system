import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { DashboardStats } from '../types/index.js';
import type { NavTab } from '../components/Sidebar.js';
import { PieChart } from '../components/charts/PieChart.js';
import { BarChart } from '../components/charts/BarChart.js';
import {
  Boxes,
  Layers,
  Truck,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  History,
  ShieldCheck,
  Clock,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: NavTab, docId?: string) => void;
  onOpenCreateModal?: () => void;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenCreateModal,
  onNotify,
}) => {
  const { user, role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Chart view toggles
  const [pieChartMode, setPieChartMode] = useState<'document' | 'item'>('document');
  const [barChartMode, setBarChartMode] = useState<'stock' | 'comparison'>('stock');

  const fetchDashboardStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success && res.data.data) {
        setStats(res.data.data);
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        if (isManualRefresh) {
          onNotify('success', 'Statistik dashboard berhasil diperbarui.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      onNotify('error', 'Gagal memuat analitik dashboard. Pastikan koneksi ke server normal.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {
    totalProducts: 0,
    totalPhysicalStock: 0,
    activeDocuments: 0,
    inProgressDocuments: 0,
    draftDocuments: 0,
    completedDocuments: 0,
    totalDocuments: 0,
    totalItems: 0,
    completedItems: 0,
    partialItems: 0,
    pendingItems: 0,
    fulfillmentRate: 100,
    totalTransactions: 0,
  };

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Executive Top Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-6 sm:p-8 text-white shadow-xl">
        {/* Subtle decorative glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sistem Operasional Inbound Aktif
              </span>
              {lastUpdated && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Diperbarui {lastUpdated}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Dashboard Operasional Penerimaan Gudang
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Halo, <strong className="text-emerald-400 font-semibold">{user?.username || 'Petugas'}</strong> ({role}). Pantau status verifikasi fisik barang masuk, ketersediaan saldo stok on-hand, dan
              antrean dokumen secara akurat tanpa risiko <em>over-receiving</em>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchDashboardStats(true)}
              disabled={isRefreshing}
              title="Perbarui data statistik"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/80 text-slate-200 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'Menyinkron...' : 'Segarkan Data'}</span>
            </button>

            {isSupervisor && onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Dokumen Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Operational KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dokumen Aktif */}
        <div
          onClick={() => onNavigate('receivings')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Antrean Dock
            </span>
          </div>

          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.activeDocuments}
            </span>
            <span className="text-xs font-medium text-slate-500 ml-1.5">Dokumen</span>
            <p className="text-xs font-semibold text-slate-700 mt-1">Dokumen Inbound Aktif</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.inProgressDocuments} sedang diproses, {summary.draftDocuments} draft
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Dokumen Receiving</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Fulfillment Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              Akurasi Fisik
            </span>
          </div>

          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.fulfillmentRate}%
            </span>
            <p className="text-xs font-semibold text-slate-700 mt-1">Tingkat Pemenuhan Item</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.completedItems} dari {summary.totalItems} item barang selesai 100%
            </p>
          </div>

          {/* Mini Progress Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, summary.fulfillmentRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Total Saldo Fisik */}
        <div
          onClick={() => onNavigate('inventory')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              On-Hand
            </span>
          </div>

          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.totalPhysicalStock.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-medium text-slate-500 ml-1.5">Unit</span>
            <p className="text-xs font-semibold text-slate-700 mt-1">Total Saldo Fisik di Gudang</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Akumulasi fisik tersedia di seluruh rak penyimpanan
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-teal-600 group-hover:translate-x-0.5 transition-transform">
            <span>Periksa Saldo Inventaris</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Dokumen Selesai & Master Produk */}
        <div
          onClick={() => onNavigate('products')}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Katalog SKU
            </span>
          </div>

          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.totalProducts}
            </span>
            <span className="text-xs font-medium text-slate-500 ml-1.5">SKU Terdaftar</span>
            <p className="text-xs font-semibold text-slate-700 mt-1">Master Produk Aktif</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.completedDocuments} dokumen penerimaan selesai diverifikasi
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
            <span>Buka Katalog Master Produk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Grid (Pie Chart & Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: PIE / DONUT CHART */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          {/* Card Header & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {pieChartMode === 'document'
                    ? 'Distribusi Status Dokumen Penerimaan'
                    : 'Distribusi Status Item Barang'}
                </h2>
                <p className="text-xs text-slate-500">
                  {pieChartMode === 'document'
                    ? 'Proporsi dokumen selesai vs sedang diverifikasi di gudang'
                    : 'Rasio item yang diterima penuh, sebagian, atau tertunda'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setPieChartMode('document')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  pieChartMode === 'document'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dokumen
              </button>
              <button
                type="button"
                onClick={() => setPieChartMode('item')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  pieChartMode === 'item'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Item Fisik
              </button>
            </div>
          </div>

          {/* Render Pie Chart Component */}
          <div className="pt-4 flex-1">
            {pieChartMode === 'document' ? (
              <PieChart
                data={stats?.documentBreakdown || []}
                centerLabel="Dokumen"
                centerValue={summary.totalDocuments}
              />
            ) : (
              <PieChart
                data={stats?.itemBreakdown || []}
                centerLabel="Total Item"
                centerValue={summary.totalItems}
              />
            )}
          </div>
        </div>

        {/* CHART 2: BAR CHART */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          {/* Card Header & Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {barChartMode === 'stock'
                    ? 'Top Saldo Stok per Produk'
                    : 'Target Kiriman vs Fisik Diterima'}
                </h2>
                <p className="text-xs text-slate-500">
                  {barChartMode === 'stock'
                    ? 'Peringkat produk dengan kuantitas fisik terbanyak di rak gudang'
                    : 'Komparasi kuantitas target kirim vs fisik masuk pada dokumen aktif'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setBarChartMode('stock')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  barChartMode === 'stock'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stok Rak
              </button>
              <button
                type="button"
                onClick={() => setBarChartMode('comparison')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  barChartMode === 'comparison'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Progres Fisik
              </button>
            </div>
          </div>

          {/* Render Bar Chart Component */}
          <div className="pt-4 flex-1">
            {barChartMode === 'stock' ? (
              <BarChart mode="stock" data={stats?.topStockProducts || []} />
            ) : (
              <BarChart mode="comparison" data={stats?.documentProgress || []} />
            )}
          </div>
        </div>
      </div>

      {/* 4. Lower Operational Row: Antrean Inbound Aktif & Log Mutasi Fisik Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Antrean Dokumen In-Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Antrean Penerimaan Aktif di Dermaga
                </h2>
                <p className="text-xs text-slate-500">
                  Dokumen yang sedang menunggu atau dalam proses verifikasi fisik
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('receivings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Dokumen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 my-auto py-2">
            {!stats?.activeDocuments || stats.activeDocuments.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Tidak ada antrean penerimaan aktif</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seluruh dokumen inbound saat ini telah tuntas diverifikasi 100%.
                </p>
              </div>
            ) : (
              stats.activeDocuments.map((doc) => {
                const isDraft = doc.status === 'DRAFT';
                return (
                  <div
                    key={doc.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {doc.doc_number}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isDraft
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isDraft ? 'DRAFT' : 'IN_PROGRESS'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Spv: {doc.supervisor_username}</span>
                        <span>•</span>
                        <span>
                          Item selesai: {doc.completed_items}/{doc.total_items} ({doc.percentage}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5 max-w-xs">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(doc.percentage, 5)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('receivings', doc.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition shrink-0 cursor-pointer"
                    >
                      Buka & Proses
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Log Penerimaan Fisik Terakhir */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Log Penerimaan Fisik Terakhir (Audit)
                </h2>
                <p className="text-xs text-slate-500">
                  Pencatatan mutasi kuantitas masuk oleh tim operator gudang
                </p>
              </div>
            </div>

            {isSupervisor && (
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Kartu Stok Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 my-auto py-2">
            {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada transaksi penerimaan fisik dicatat
              </div>
            ) : (
              stats.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {tx.sku}
                      </span>
                      <span className="text-xs text-slate-600 truncate max-w-[200px]" title={tx.product_name}>
                        {tx.product_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="font-mono text-slate-600">{tx.doc_number}</span>
                      <span>•</span>
                      <span>Op: {tx.operator_username}</span>
                      <span>•</span>
                      <span>
                        {new Date(tx.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      +{tx.quantity} {tx.unit}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">INBOUND</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Inbound System Guarantees & Operational SOP Footer */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border border-slate-200/90 text-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-900 text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Jaminan Integritas Spesifikasi (SDD) & Anti Over-Receiving
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Setiap pencatatan fisik barang masuk dilindungi Row-Level Locking PostgreSQL ACID.
                Kuantitas yang diinput tidak dapat melebihi batas target PO/kontrak, dan dokumen
                hanya dapat difinalisasi ketika seluruh item telah diverifikasi 100%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              SOP Versi 1.0 (Specification-Driven)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
