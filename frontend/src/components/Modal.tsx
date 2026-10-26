import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
  variant?: 'light' | 'dark';
  zIndex?: string;
  backdropClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  variant = 'light',
  zIndex = 'z-50',
  backdropClassName = 'bg-black/20',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
  }[maxWidth] || 'max-w-lg';

  const isLight = variant === 'light';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2 sm:p-4 ${backdropClassName} animate-fade-in overflow-y-auto`}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[94vh] flex flex-col rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden transform transition-all ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-900'
            : 'bg-slate-900 border border-slate-800 text-slate-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between pb-3 sm:pb-4 border-b mb-3 sm:mb-4 shrink-0 gap-2 ${
            isLight ? 'border-slate-100' : 'border-slate-800/80'
          }`}
        >
          <div
            className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 min-w-0 flex-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1">{children}</div>
      </div>
    </div>
  );
};
