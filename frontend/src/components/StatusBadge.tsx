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
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5 ${sizeClasses}`}
        >
          <CheckCircle2 className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Completed
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/5 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          In Progress
        </span>
      );

    case 'PARTIAL':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-sm shadow-amber-500/5 ${sizeClasses}`}
        >
          <AlertCircle className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Partial
        </span>
      );

    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 ${sizeClasses}`}
        >
          <Clock className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Pending
        </span>
      );

    case 'DRAFT':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}
        >
          <FileText className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          Draft
        </span>
      );
  }
};
