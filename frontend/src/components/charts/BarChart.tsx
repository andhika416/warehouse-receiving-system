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
      <div className="flex flex-col h-full">
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        )}

        <div className="space-y-3.5 my-auto py-1">
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada data stok produk tercatat
            </div>
          ) : (
            data.map((item) => {
              const percentage = Math.round((item.quantity / maxQty) * 100);
              const isHovered = hoveredId === item.sku;

              // Color category based on stock level
              let barColor = 'from-emerald-500 to-teal-500';
              let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              let statusLabel = 'Stok Tersedia';

              if (item.quantity === 0) {
                barColor = 'from-rose-500 to-pink-500';
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                statusLabel = 'Kosong';
              } else if (item.quantity < 20) {
                barColor = 'from-amber-500 to-orange-500';
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                statusLabel = 'Terbatas';
              } else if (item.quantity < 100) {
                barColor = 'from-blue-500 to-cyan-500';
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                statusLabel = 'Sedang';
              }

              return (
                <div
                  key={item.sku}
                  onMouseEnter={() => setHoveredId(item.sku)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isHovered
                      ? 'bg-slate-50 border-slate-300 shadow-sm'
                      : 'border-transparent hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] shrink-0 border border-slate-200">
                        {item.sku}
                      </span>
                      <span className="font-medium text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {item.quantity.toLocaleString('id-ID')}{' '}
                        <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500 shadow-xs`}
                      style={{
                        width: item.quantity === 0 ? '4px' : `${Math.max(percentage, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // mode === 'comparison'
  const { data, title, subtitle } = props;
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.expected, d.received]),
    1
  );

  return (
    <div className="flex flex-col h-full">
      {(title || subtitle) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500" />
              <span>Target (Expected)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Fisik Diterima</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 my-auto py-1">
        {data.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada dokumen penerimaan aktif
          </div>
        ) : (
          data.map((doc) => {
            const expectedPct = Math.round((doc.expected / maxVal) * 100);
            const receivedPct = Math.round((doc.received / maxVal) * 100);
            const isHovered = hoveredId === doc.id;

            return (
              <div
                key={doc.id}
                onMouseEnter={() => setHoveredId(doc.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`p-3 rounded-xl border transition-all ${
                  isHovered
                    ? 'bg-slate-50 border-slate-300 shadow-sm'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{doc.doc_number}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Progress: <strong className="text-slate-900">{doc.percentage}%</strong>
                    </span>
                  </div>
                </div>

                {/* Dual Bars */}
                <div className="space-y-1.5">
                  {/* Expected Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-12 text-right shrink-0">
                      Target
                    </span>
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(expectedPct, 3)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-12 text-right shrink-0">
                      {doc.expected}
                    </span>
                  </div>

                  {/* Received Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-12 text-right shrink-0">
                      Fisik
                    </span>
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(receivedPct, doc.received > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 w-12 text-right shrink-0">
                      {doc.received}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
