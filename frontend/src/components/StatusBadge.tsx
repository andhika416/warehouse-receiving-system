import React from 'react';
import type { DocumentStatus, ItemStatus } from '../types/index.js';
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: DocumentStatus | ItemStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  switch (status) {
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm ${sizeClasses}`}
        >
          <CheckCircle2 className={isSm ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} />
          Selesai
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 shadow-sm ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Sedang Berjalan
        </span>
      );

    case 'PARTIAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 shadow-sm ${sizeClasses}`}
        >
          <AlertCircle className={isSm ? 'w-3 h-3 text-orange-600' : 'w-3.5 h-3.5 text-orange-600'} />
          Sebagian (Parsial)
        </span>
      );

    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <Clock className={isSm ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-500'} />
          Menunggu
        </span>
      );

    case 'DRAFT':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
        >
          <FileText className={isSm ? 'w-3 h-3 text-slate-500' : 'w-3.5 h-3.5 text-slate-500'} />
          Draf Baru
        </span>
      );
  }
};
