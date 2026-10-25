import React, { useState } from 'react';
import type { TopStockProduct, DocumentProgressItem } from '../../types/index.js';

interface StockBarChartProps {
  mode: 'stock';
  data: TopStockProduct[];
  title?: string;
  subtitle?: string;
}

interface ProgressComparisonBarChartProps {
  mode: 'comparison';
  data: DocumentProgressItem[];
  title?: string;
  subtitle?: string;
}

type BarChartProps = StockBarChartProps | ProgressComparisonBarChartProps;

export const BarChart: React.FC<BarChartProps> = (props) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (props.mode === 'stock') {
    const { data, title, subtitle } = props;
    const maxQty = Math.max(...data.map((d) => d.quantity), 1);

    return (
      <div className="flex flex-col h-full w-full">
        {(title || subtitle) && (
          <div className="mb-2">
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        )}

        {data.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs my-auto">
            Belum ada data stok produk
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full w-full pt-1">
            {/* Vertical Chart Stage */}
            <div className="relative h-44 sm:h-48 w-full flex items-end px-1 pt-6 pb-1">
              {/* Subtle Horizontal Gridlines & Y-Axis Scale */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none text-[9px] text-slate-400 font-mono">
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between pb-0.5">
                  <span>{maxQty.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between pb-0.5">
                  <span>{Math.round(maxQty / 2).toLocaleString('id-ID')}</span>
                </div>
                <div className="border-b border-slate-200 flex items-center justify-between pb-0.5">
                  <span>0</span>
                </div>
              </div>

              {/* Vertical Columns Container */}
              <div className="relative z-10 w-full grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 h-full items-end pl-6">
                {data.map((item) => {
                  const percentage = Math.round((item.quantity / maxQty) * 100);
                  const isHovered = hoveredId === item.sku;

                  // Dynamic color gradient based on stock level
                  let barColor = 'from-emerald-600 to-teal-400';
                  let statusLabel = 'Aman';

                  if (item.quantity === 0) {
                    barColor = 'from-rose-600 to-pink-400';
                    statusLabel = 'Kosong';
                  } else if (item.quantity < 20) {
                    barColor = 'from-amber-500 to-orange-400';
                    statusLabel = 'Kritis';
                  } else if (item.quantity < 100) {
                    barColor = 'from-blue-600 to-cyan-400';
                    statusLabel = 'Cukup';
                  }

                  // Minimum height representation so empty or tiny bars remain visible
                  const barHeight = item.quantity === 0 ? 3 : Math.max(percentage, 5);

                  return (
                    <div
                      key={item.sku}
                      onMouseEnter={() => setHoveredId(item.sku)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="group flex flex-col items-center h-full justify-end relative cursor-pointer"
                    >
                      {/* Floating Tooltip on Hover */}
                      {isHovered && (
                        <div className="absolute -top-12 z-30 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none animate-fade-in flex flex-col items-center">
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="text-[10px] text-slate-300 font-mono">
                            {item.quantity.toLocaleString('id-ID')} {item.unit} · {statusLabel}
                          </span>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700 -mb-2 mt-0.5" />
                        </div>
                      )}

                      {/* Bar Value Header */}
                      <div className="mb-1 flex flex-col items-center">
                        <span
                          className={`text-xs font-bold transition-transform ${
                            isHovered ? 'text-emerald-600 scale-110' : 'text-slate-800'
                          }`}
                        >
                          {item.quantity.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 -mt-0.5 font-medium">
                          {item.unit}
                        </span>
                      </div>

                      {/* The Vertical (Upright) Bar */}
                      <div className="w-full max-w-[38px] sm:max-w-[48px] h-full flex items-end justify-center">
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t ${barColor} shadow-sm transition-all duration-500 ease-out ${
                            isHovered
                              ? 'brightness-110 shadow-md ring-2 ring-emerald-400/50 scale-x-105'
                              : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{
                            height: item.quantity === 0 ? '4px' : `${barHeight}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels (SKU & Product Name) */}
            <div className="w-full grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 pt-2.5 border-t border-slate-200/80 pl-6">
              {data.map((item) => {
                const isHovered = hoveredId === item.sku;
                return (
                  <div
                    key={item.sku}
                    onMouseEnter={() => setHoveredId(item.sku)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="flex flex-col items-center text-center min-w-0 cursor-pointer"
                  >
                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border transition-colors truncate max-w-full ${
                        isHovered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title={item.sku}
                    >
                      {item.sku}
                    </span>
                    <span
                      className={`text-[11px] truncate w-full mt-1 font-medium transition-colors ${
                        isHovered ? 'text-slate-900 font-semibold' : 'text-slate-600'
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // mode === 'comparison' (Target vs Fisik)
  const { data, title, subtitle } = props;
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.expected, d.received]),
    1
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend for Target vs Fisik */}
        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-500" />
            <span className="text-[11px] font-medium text-slate-600">Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-600">Fisik</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs my-auto">
          Tidak ada dokumen aktif
        </div>
      ) : (
        <div className="flex flex-col justify-between h-full w-full pt-1">
          {/* Vertical Dual-Bar Comparison Stage */}
          <div className="relative h-44 sm:h-48 w-full flex items-end px-1 pt-6 pb-1">
            {/* Subtle Gridlines & Y-Axis */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none text-[9px] text-slate-400 font-mono">
              <div className="border-b border-dashed border-slate-100 flex items-center justify-between pb-0.5">
                <span>{maxVal.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-b border-dashed border-slate-100 flex items-center justify-between pb-0.5">
                <span>{Math.round(maxVal / 2).toLocaleString('id-ID')}</span>
              </div>
              <div className="border-b border-slate-200 flex items-center justify-between pb-0.5">
                <span>0</span>
              </div>
            </div>

            {/* Vertical Dual Bars per Document */}
            <div className="relative z-10 w-full grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 h-full items-end pl-6">
              {data.map((doc) => {
                const expectedPct = Math.round((doc.expected / maxVal) * 100);
                const receivedPct = Math.round((doc.received / maxVal) * 100);
                const isHovered = hoveredId === doc.id;

                return (
                  <div
                    key={doc.id}
                    onMouseEnter={() => setHoveredId(doc.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group flex flex-col items-center h-full justify-end relative cursor-pointer"
                  >
                    {/* Floating Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-14 z-30 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none animate-fade-in flex flex-col items-center">
                        <span className="font-semibold text-white">{doc.doc_number}</span>
                        <span className="text-[10px] text-slate-300">
                          Target: <strong className="text-blue-300">{doc.expected}</strong> · Fisik: <strong className="text-emerald-300">{doc.received}</strong> ({doc.percentage}%)
                        </span>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700 -mb-2 mt-0.5" />
                      </div>
                    )}

                    {/* Progress percentage pill */}
                    <div className="mb-1">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                        {doc.percentage}%
                      </span>
                    </div>

                    {/* Side-by-side Dual Vertical Bars */}
                    <div className="flex items-end justify-center gap-1 w-full h-full">
                      {/* Expected / Target Bar */}
                      <div className="w-3.5 sm:w-5 h-full flex items-end justify-center">
                        <div
                          className={`w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 shadow-xs transition-all duration-500 ease-out ${
                            isHovered ? 'brightness-110 ring-1 ring-blue-400' : 'opacity-90'
                          }`}
                          style={{
                            height: doc.expected === 0 ? '4px' : `${Math.max(expectedPct, 5)}%`,
                          }}
                          title={`Target: ${doc.expected}`}
                        />
                      </div>

                      {/* Received / Fisik Bar */}
                      <div className="w-3.5 sm:w-5 h-full flex items-end justify-center">
                        <div
                          className={`w-full rounded-t bg-gradient-to-t from-emerald-600 to-teal-400 shadow-xs transition-all duration-500 ease-out ${
                            isHovered ? 'brightness-110 ring-1 ring-emerald-400' : 'opacity-90'
                          }`}
                          style={{
                            height: doc.received === 0 ? '4px' : `${Math.max(receivedPct, doc.received > 0 ? 5 : 0)}%`,
                          }}
                          title={`Fisik: ${doc.received}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Labels (Document Number & Status) */}
          <div className="w-full grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 pt-2.5 border-t border-slate-200/80 pl-6">
            {data.map((doc) => {
              const isHovered = hoveredId === doc.id;
              return (
                <div
                  key={doc.id}
                  onMouseEnter={() => setHoveredId(doc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="flex flex-col items-center text-center min-w-0 cursor-pointer"
                >
                  <span
                    className={`font-mono font-bold text-[10px] truncate max-w-full transition-colors ${
                      isHovered ? 'text-blue-600' : 'text-slate-800'
                    }`}
                    title={doc.doc_number}
                  >
                    {doc.doc_number}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1 py-0.2 rounded mt-0.5 truncate max-w-full ${
                      doc.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : doc.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
