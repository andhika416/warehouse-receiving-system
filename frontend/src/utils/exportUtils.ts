/**
 * Utility functions for exporting table data to PDF (Print Preview), Excel (.xls), and CSV.
 * Zero external dependencies, fast, and fully cross-browser compatible.
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // Approximate width for Excel
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => string | number;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  columns: ExportColumn[];
  data: any[];
  summaryItems?: { label: string; value: string | number }[];
  printedBy?: { name?: string; role?: string };
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * 1. Export data to Microsoft Excel XML Spreadsheet (.xls)
 * Opens cleanly in Microsoft Excel, LibreOffice Calc, and Google Sheets with full cell formatting.
 */
export function exportToExcel(options: ExportOptions): void {
  const { title, subtitle, filename, columns, data, summaryItems, printedBy } = options;
  const currentDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const columnTags = columns
    .map((col) => `<Column ss:Width="${col.width || 120}"/>`)
    .join('\n    ');

  // Summary row if available
  let summaryRows = '';
  if (summaryItems && summaryItems.length > 0) {
    summaryRows = `
    <Row ss:Height="20">
      <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Summary">
        <Data ss:Type="String">Ringkasan: ${summaryItems
          .map((s) => `${s.label}: ${s.value}`)
          .join('  |  ')}</Data>
      </Cell>
    </Row>
    <Row ss:Height="10"/>`;
  }

  // Header row
  const headerCells = columns
    .map(
      (col) =>
        `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`
    )
    .join('\n      ');

  // Data rows
  const dataRows = data
    .map((row, index) => {
      const cells = columns
        .map((col) => {
          let rawVal = row[col.key];
          if (col.format) {
            rawVal = col.format(rawVal, row);
          } else if (col.key === '_index') {
            rawVal = index + 1;
          }

          const isNum = typeof rawVal === 'number' && !isNaN(rawVal);
          const styleId =
            col.align === 'center'
              ? 'CellCenter'
              : col.align === 'right' || isNum
              ? 'CellRight'
              : 'CellLeft';

          const dataType = isNum ? 'Number' : 'String';
          const cellVal = isNum ? rawVal : escapeXml(rawVal ?? '-');

          return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${cellVal}</Data></Cell>`;
        })
        .join('\n      ');

      return `    <Row ss:Height="18">\n      ${cells}\n    </Row>`;
    })
    .join('\n');

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#64748B"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Summary">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
   </Borders>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Laporan Gudang">
  <Table>
    ${columnTags}
    <Row ss:Height="24">
      <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Title">
        <Data ss:Type="String">LOGIFLOW WMS - ${escapeXml(title.toUpperCase())}</Data>
      </Cell>
    </Row>
    <Row ss:Height="16">
      <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="Subtitle">
        <Data ss:Type="String">Dicetak pada: ${currentDate} | Pengguna: ${printedBy?.name || 'Sistem'} (${printedBy?.role || 'Pengguna'}) ${subtitle ? `| ${escapeXml(subtitle)}` : ''}</Data>
      </Cell>
    </Row>
    <Row ss:Height="8"/>
    ${summaryRows}
    <Row ss:Height="22">
      ${headerCells}
    </Row>
${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 2. Print / Save as PDF view
 * Opens a dedicated printable window formatted with LogiFlow WMS official letterhead,
 * clean typography, summary KPIs, bordered table, and signature sign-offs.
 */
export function printToPDF(options: ExportOptions): void {
  const { title, subtitle, columns, data, summaryItems, printedBy } = options;
  const printWindow = window.open('', '_blank', 'width=1050,height=800');

  if (!printWindow) {
    alert('Jendela cetak terblokir oleh browser. Mohon izinkan pop-up untuk situs ini.');
    return;
  }

  const currentDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // Table Headers HTML
  const theadHtml = columns
    .map(
      (col) =>
        `<th style="text-align:${col.align || 'left'}; padding: 8px 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #334155;">${escapeXml(
          col.header
        )}</th>`
    )
    .join('');

  // Table Rows HTML
  const tbodyHtml = data
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = columns
        .map((col) => {
          let val = row[col.key];
          if (col.format) {
            val = col.format(val, row);
          } else if (col.key === '_index') {
            val = idx + 1;
          }
          return `<td style="text-align:${col.align || 'left'}; padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #1e293b;">${escapeXml(
            val ?? '-'
          )}</td>`;
        })
        .join('');
      return `<tr style="background:${bg};">${cells}</tr>`;
    })
    .join('');

  // Summary Badges HTML
  let summaryHtml = '';
  if (summaryItems && summaryItems.length > 0) {
    summaryHtml = `
      <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; padding:10px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
        ${summaryItems
          .map(
            (s) =>
              `<div style="font-size:11px; color:#166534;"><span style="color:#15803d; font-weight:bold;">${escapeXml(
                s.label
              )}:</span> <strong>${escapeXml(s.value)}</strong></div>`
          )
          .join('')}
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan ${escapeXml(title)} - LogiFlow WMS</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
    }
    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .btn-print {
      background: #059669;
      color: #ffffff;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn btn-close" onclick="window.close()">Tutup Jendela</button>
    <button class="btn btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>

  <!-- Header Surat / Letterhead -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
        Logi<span style="color:#059669;">Flow</span> <span style="font-size:12px; font-weight:normal; color:#64748b;">WMS v1.0</span>
      </div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
        Warehouse Receiving &amp; Inventory Management System
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase;">
        ${escapeXml(title)}
      </div>
      <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
        Tanggal: ${currentDate}
      </div>
      ${
        subtitle
          ? `<div style="font-size: 10px; color: #059669; font-weight: 600;">${escapeXml(
              subtitle
            )}</div>`
          : ''
      }
    </div>
  </div>

  ${summaryHtml}

  <!-- Data Table -->
  <table>
    <thead>
      <tr>${theadHtml}</tr>
    </thead>
    <tbody>
      ${tbodyHtml}
    </tbody>
  </table>

  <!-- Tanda Tangan & Verifikasi Gudang -->
  <div style="display:flex; justify-content:space-between; margin-top: 40px; page-break-inside: avoid;">
    <div style="font-size: 10px; color: #94a3b8; max-width: 320px;">
      * Dokumen sah ini dihasilkan otomatis melalui sistem LogiFlow WMS.<br/>
      Operator penanggung jawab: <strong>${escapeXml(
        printedBy?.name || 'Petugas'
      )}</strong> (${escapeXml(printedBy?.role || 'Staff')}).
    </div>

    <div style="display:flex; gap: 40px; text-align: center;">
      <div style="width: 140px;">
        <div style="font-size: 11px; color: #475569;">Petugas Gudang,</div>
        <div style="height: 48px;"></div>
        <div style="border-bottom: 1px dotted #64748b; font-weight: 600; font-size: 11px; padding-bottom: 2px;">
          ( ${escapeXml(printedBy?.name || 'Petugas')} )
        </div>
      </div>
      <div style="width: 140px;">
        <div style="font-size: 11px; color: #475569;">Supervisor Gudang,</div>
        <div style="height: 48px;"></div>
        <div style="border-bottom: 1px dotted #64748b; font-weight: 600; font-size: 11px; padding-bottom: 2px;">
          ( .............................. )
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print dialog after page renders
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * 3. Export data to CSV format with UTF-8 BOM
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename, columns, data } = options;

  const headers = columns.map((col) => escapeCsv(col.header));
  const rows = data.map((row, idx) => {
    return columns.map((col) => {
      let val = row[col.key];
      if (col.format) {
        val = col.format(val, row);
      } else if (col.key === '_index') {
        val = idx + 1;
      }
      return escapeCsv(val ?? '');
    });
  });

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
