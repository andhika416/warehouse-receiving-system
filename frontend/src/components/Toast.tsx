import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const icon = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
        }[toast.type];

        const borderBg = {
          success: 'border-emerald-500/30 bg-slate-900/95 shadow-emerald-950/20',
          error: 'border-rose-500/30 bg-slate-900/95 shadow-rose-950/20',
          warning: 'border-amber-500/30 bg-slate-900/95 shadow-amber-950/20',
          info: 'border-cyan-500/30 bg-slate-900/95 shadow-cyan-950/20',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md text-slate-100 ${borderBg} transition-all transform animate-slide-up`}
          >
            {icon}
            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold text-white mb-0.5">{toast.title}</div>}
              <div className="text-slate-300 leading-snug">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
