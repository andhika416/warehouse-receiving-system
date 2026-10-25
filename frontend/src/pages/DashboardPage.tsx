import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { DashboardStats } from '../types/index.js';
import type { NavTab } from '../components/Sidebar.js';
import { PieChart } from '../components/charts/PieChart.js';
import { BarChart } from '../components/charts/BarChart.js';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  Truck,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowRight,
  History,
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Barcode,
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.js';

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
  const { role } = useAuth();
  const isSupervisor = role === 'SUPERVISOR';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Chart view toggles
  const [pieChartMode, setPieChartMode] = useState<'document' | 'item'>('document');
  const [barChartMode, setBarChartMode] = useState<'stock' | 'comparison'>('stock');

  // Barcode scanner modal state for operator receiving
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const fetchDashboardStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success && res.data.data) {
        setStats(res.data.data);
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        );
        if (isManualRefresh) {
          onNotify('success', 'Data dashboard berhasil diperbarui.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      onNotify('error', 'Gagal memuat data dashboard.');
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
      <div>
        <div className="border-b border-slate-200/80 bg-slate-50 px-6 lg:px-8 py-3.5 mb-6 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-6 w-52 bg-slate-200 rounded" />
                <div className="h-4 w-72 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-5 animate-pulse pb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-200 rounded-xl" />
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
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
    <div>
      {/* 1. Fixed / Sticky Page Header Bar (Flush with Navbar) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 py-3.5 mb-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span>Dashboard Operasional</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Ringkasan operasional penerimaan barang, saldo stok on-hand, dan antrean verifikasi fisik</span>
              {lastUpdated && (
                <>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Diperbarui {lastUpdated}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchDashboardStats(true)}
              disabled={isRefreshing}
              title="Segarkan Data Dashboard"
              className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {isSupervisor && onOpenCreateModal && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition transform active:scale-[0.99] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Dokumen Baru</span>
              </button>
            )}

            {!isSupervisor && (
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow transition transform active:scale-[0.99] cursor-pointer"
              >
                <Barcode className="w-4 h-4" />
                <span>Scan Barcode Penerimaan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-10 space-y-5">

      {/* 2. Compact 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Dokumen Aktif */}
        <div
          onClick={() => onNavigate('receivings')}
          className="group bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Dokumen Aktif</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.activeDocuments}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{summary.inProgressDocuments} diproses · {summary.draftDocuments} draft</span>
            <ArrowRight className="w-3 h-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 2: Fulfillment Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Akurasi Fisik</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.fulfillmentRate}%
            </span>
          </div>
          <div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.fulfillmentRate)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {summary.completedItems}/{summary.totalItems} item tuntas
            </span>
          </div>
        </div>

        {/* Card 3: Total Saldo Fisik */}
        <div
          onClick={() => onNavigate('inventory')}
          className="group bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Saldo Fisik</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.totalPhysicalStock.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-normal text-slate-400 ml-1">unit</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Stok fisik on-hand</span>
            <ArrowRight className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 4: Master Produk */}
        <div
          onClick={() => onNavigate('products')}
          className="group bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Master SKU</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.totalProducts}
            </span>
            <span className="text-xs font-normal text-slate-400 ml-1">produk</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{summary.completedDocuments} dokumen selesai</span>
            <ArrowRight className="w-3 h-3 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* 3. Visual Charts Grid (Pie & Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: PIE / DONUT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Distribusi Status
              </h2>
            </div>

            {/* Compact Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setPieChartMode('document')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs ${
                  pieChartMode === 'document'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dokumen
              </button>
              <button
                type="button"
                onClick={() => setPieChartMode('item')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs ${
                  pieChartMode === 'item'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Item Fisik
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center">
            {pieChartMode === 'document' ? (
              <PieChart
                data={stats?.documentBreakdown || []}
                centerLabel="Dokumen"
                centerValue={summary.totalDocuments}
              />
            ) : (
              <PieChart
                data={stats?.itemBreakdown || []}
                centerLabel="Item"
                centerValue={summary.totalItems}
              />
            )}
          </div>
        </div>

        {/* CHART 2: BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Kapasitas & Progres
              </h2>
            </div>

            {/* Compact Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setBarChartMode('stock')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs ${
                  barChartMode === 'stock'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stok Rak
              </button>
              <button
                type="button"
                onClick={() => setBarChartMode('comparison')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-xs ${
                  barChartMode === 'comparison'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Target vs Fisik
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center">
            {barChartMode === 'stock' ? (
              <BarChart mode="stock" data={stats?.topStockProducts || []} />
            ) : (
              <BarChart mode="comparison" data={stats?.documentProgress || []} />
            )}
          </div>
        </div>
      </div>

      {/* 4. Lower Operational Row: Antrean Inbound & Log Mutasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Antrean Dokumen In-Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Antrean Penerimaan Aktif
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('receivings')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Semua</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 my-auto">
            {!stats?.activeDocuments || stats.activeDocuments.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Tidak ada antrean penerimaan aktif
              </div>
            ) : (
              stats.activeDocuments.map((doc) => {
                const isDraft = doc.status === 'DRAFT';
                return (
                  <div
                    key={doc.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-1 rounded-lg transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {doc.doc_number}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                            isDraft
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>{doc.completed_items}/{doc.total_items} item ({doc.percentage}%)</span>
                        <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${Math.max(doc.percentage, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate('receivings', doc.id)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition shrink-0 cursor-pointer"
                    >
                      Buka
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Log Penerimaan Fisik Terakhir */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Mutasi Fisik Terkini
              </h2>
            </div>

            {isSupervisor && (
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 my-auto">
            {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Belum ada transaksi penerimaan fisik
              </div>
            ) : (
              stats.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 px-1 rounded-lg transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[11px] text-slate-800">
                        {tx.sku}
                      </span>
                      <span className="text-xs text-slate-600 truncate max-w-[170px]" title={tx.product_name}>
                        {tx.product_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono">{tx.doc_number}</span>
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
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                      +{tx.quantity} {tx.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Barcode Scanner Modal for Operator Receiving */}
    <BarcodeScannerModal
      isOpen={isBarcodeModalOpen}
      onClose={() => setIsBarcodeModalOpen(false)}
      onNotify={onNotify}
      onItemReceived={() => {
        // Refresh dashboard KPIs, charts, and fulfillment rates
        fetchDashboardStats();
      }}
    />
  </div>
  );
};
