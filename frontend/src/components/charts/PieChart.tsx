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

  // SVG Donut geometry constants (compact & balanced)
  const size = 168;
  const strokeWidth = 24;
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
        <div className="mb-3">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-5 my-auto py-1">
        {/* SVG Donut */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 filter drop-shadow-xs transition-all"
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
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                    className="transition-all duration-150 cursor-pointer"
                    style={{
                      opacity: hoveredIndex === null || isHovered ? 1 : 0.45,
                      filter: isHovered ? 'brightness(1.08)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })
            )}
          </svg>

          {/* Central Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            {activeItem ? (
              <>
                <span className="text-xl font-bold text-slate-900 leading-tight">
                  {activeItem.percent}%
                </span>
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[85px]">
                  {activeItem.count} item
                </span>
              </>
            ) : (
              <>
                <span className="text-xl font-extrabold text-slate-900 leading-tight">
                  {centerValue !== undefined ? centerValue : total}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {centerLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend & Details */}
        <div className="flex-1 w-full space-y-1.5">
          {slices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <div
                key={slice.key}
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isHovered
                    ? 'bg-slate-100/90 border-slate-300'
                    : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-xs font-bold text-slate-900">{slice.count}</span>
                  <span className="text-[10px] text-slate-400">
                    ({slice.percent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
