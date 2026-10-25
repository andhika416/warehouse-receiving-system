import type { ReceivingDocumentDetail } from '../types/index.js';

/**
 * Print utility that outputs an exact 1:1 replica of the Goods Receipt Slip
 * formatted for standard A4 paper with crisp borders, exact colors, and proper spacing.
 */
export const printGoodsReceipt = (doc: ReceivingDocumentDetail) => {
  // Remove existing print iframe if any
  const existingIframe = document.getElementById('logiflow-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create an isolated iframe for clean printing
  const iframe = document.createElement('iframe');
  iframe.id = 'logiflow-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const docDate = new Date(doc.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const printDate = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Surat Bukti Penerimaan Barang - ${doc.doc_number}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #ffffff !important;
          color: #0f172a !important;
          margin: 0;
          padding: 10px;
          font-size: 12px;
          line-height: 1.5;
        }
        .receipt-card {
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 24px;
          background: #ffffff;
          max-width: 760px;
          margin: 0 auto;
          box-shadow: none;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .header-left h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #0f172a;
        }
        .header-left p {
          margin: 2px 0 0;
          font-size: 11px;
          color: #64748b;
        }
        .header-right {
          text-align: right;
        }
        .doc-badge {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .doc-date {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 18px;
          font-size: 12px;
        }
        .meta-label {
          color: #64748b;
          font-size: 11px;
        }
        .meta-value {
          font-weight: 700;
          color: #0f172a;
          margin-top: 1px;
        }
        .status-completed {
          color: #047857;
          font-weight: 800;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background-color: #f1f5f9 !important;
          color: #334155;
          font-weight: 700;
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: 11px;
          text-transform: uppercase;
        }
        td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .font-bold {
          font-weight: 700;
        }
        .text-emerald {
          color: #047857;
          font-weight: 700;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-top: 36px;
          padding-top: 8px;
          text-align: center;
        }
        .sig-label {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 48px;
        }
        .sig-line {
          border-top: 1px solid #94a3b8;
          padding-top: 4px;
          font-weight: 700;
          color: #0f172a;
          font-size: 11.5px;
        }
        .footer-note {
          margin-top: 24px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div class="header-left">
            <h1>LOGIFLOW WMS</h1>
            <p>Bukti Verifikasi & Tanda Terima Barang Gudang</p>
          </div>
          <div class="header-right">
            <div class="doc-badge">${doc.doc_number}</div>
            <div class="doc-date">${docDate}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Supervisor Penanggung Jawab:</div>
            <div class="meta-value">${doc.supervisor_username}</div>
          </div>
          <div>
            <div class="meta-label">Status Dokumen:</div>
            <div class="meta-value status-completed">
              ${doc.status === 'COMPLETED' ? 'SELESAI (100% LENGKAP & TERKONFIRMASI)' : doc.status}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 36px;" class="text-center">No.</th>
              <th style="width: 120px;">SKU</th>
              <th>Nama Produk</th>
              <th style="width: 70px;">Satuan</th>
              <th style="width: 70px;" class="text-right">Target</th>
              <th style="width: 70px;" class="text-right">Diterima</th>
              <th style="width: 70px;" class="text-right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            ${doc.items
              .map(
                (item, idx) => `
              <tr>
                <td class="text-center font-mono" style="color: #64748b;">${idx + 1}</td>
                <td class="font-mono font-bold">${item.sku}</td>
                <td>${item.product_name}</td>
                <td>${item.unit}</td>
                <td class="text-right font-mono font-bold">${item.expected_quantity}</td>
                <td class="text-right font-mono text-emerald">${item.received_quantity}</td>
                <td class="text-right font-mono" style="color: #64748b;">${item.remaining_quantity}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-label">Petugas Gudang / Penerima:</div>
            <div class="sig-line">( ${doc.supervisor_username} )</div>
          </div>
          <div>
            <div class="sig-label">Driver / Kurir Pengirim Vendor:</div>
            <div class="sig-line">( ........................................ )</div>
          </div>
        </div>

        <div class="footer-note">
          <span>LogiFlow WMS - Dokumen Sah Verifikasi Masuk Gudang</span>
          <span>Dicetak: ${printDate}</span>
        </div>
      </div>
    </body>
    </html>
  `;

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Give the browser 200ms to render the iframe DOM, then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 200);
};
