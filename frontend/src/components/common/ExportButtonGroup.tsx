import React from 'react';
import { Printer, FileSpreadsheet, Download } from 'lucide-react';

export interface ExportButtonGroupProps {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  disabled?: boolean;
}

export const ExportButtonGroup: React.FC<ExportButtonGroupProps> = ({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  disabled = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1 sm:gap-1.5 flex-wrap">
      {/* 1. Cetak / Simpan PDF */}
      <button
        type="button"
        onClick={onExportPDF}
        disabled={disabled}
        title="Cetak Laporan atau Simpan sebagai PDF"
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5 text-rose-600" />
        <span>PDF</span>
      </button>

      {/* 2. Unduh Excel */}
      <button
        type="button"
        onClick={onExportExcel}
        disabled={disabled}
        title="Unduh Lembar Kerja Excel (.xls)"
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
        <span>Excel</span>
      </button>

      {/* 3. Unduh CSV */}
      <button
        type="button"
        onClick={onExportCSV}
        disabled={disabled}
        title="Unduh Data Mentah Format CSV"
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" />
        <span>CSV</span>
      </button>
    </div>
  );
};
