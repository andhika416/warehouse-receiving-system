import React, { useState } from 'react';
import type { StatusBreakdownItem } from '../../types/index.js';

interface PieChartProps {
  data: StatusBreakdownItem[];
  title?: string;
  subtitle?: string;
  centerLabel?: string;
  centerValue?: string | number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  subtitle,
  centerLabel = 'Total',
  centerValue,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // SVG Donut geometry constants
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and stroke-dashoffset for each slice
  let accumulatedPercent = 0;
  const slices = data.map((item, idx) => {
    const percent = total > 0 ? item.count / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulatedPercent * circumference);
    accumulatedPercent += percent;

    return {
      ...item,
      index: idx,
      percent: Math.round(percent * 1000) / 10,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="flex flex-col h-full">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
        {/* SVG Donut */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 filter drop-shadow-sm transition-all"
          >
            {/* Background track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {total === 0 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
              />
            ) : (
              slices.map((slice) => {
                const isHovered = hoveredIndex === slice.index;
                return (
                  <circle
                    key={slice.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                      filter: isHovered ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Central Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeItem ? (
              <>
                <span className="text-2xl font-bold text-slate-900 leading-tight">
                  {activeItem.percent}%
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[110px]">
                  {activeItem.count} item
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {centerValue !== undefined ? centerValue : total}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {centerLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend & Details */}
        <div className="flex-1 w-full space-y-2">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <div
                key={slice.key}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-slate-100 border-slate-300 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {slice.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-right">
                    <span className="text-xs font-bold text-slate-900">{slice.count}</span>
                    <span className="text-[11px] font-medium text-slate-500">
                      ({slice.percent}%)
                    </span>
                  </div>
                </div>
                {slice.description && (
                  <p className="text-[11px] text-slate-500 mt-1 pl-5 line-clamp-1">
                    {slice.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
