# Warehouse Receiving System - Frontend Application

Antarmuka pengguna berbasis web untuk **Warehouse Receiving System (WRS)**, dibangun menggunakan **React 19**, **Vite**, **TypeScript**, dan **Tailwind CSS v3.4**.

Aplikasi ini berinteraksi langsung dengan REST API backend sesuai kontrak pada [docs/openapi.yaml](file:///d:/laragon/www/warehouse-receiving-system/docs/openapi.yaml).

---

## 1. Fitur Utama

### A. Autentikasi & Navigasi Berbasis Peran
- Halaman login modern dengan proteksi JWT.
- **Tombol Cepat Login Demo**:
  - `Supervisor`: otomatis login sebagai `supervisor` (`password123`).
  - `Operator`: otomatis login sebagai `operator` (`password123`).
- **Role-Based Access Control (RBAC)** di UI:
  - Tombol **"Buat Dokumen Baru"** hanya muncul untuk pengguna dengan peran `SUPERVISOR`. Operator tidak memiliki tombol ini.
  - Halaman **"Log Mutasi Stok"** (Audit Log) hanya dapat diakses oleh `SUPERVISOR`.

### B. Modul Master & Stok
- **Master Data Produk**: Menampilkan daftar seluruh SKU, nama produk, satuan unit, dan saldo fisik on-hand saat ini. Supervisor dapat menambahkan produk baru via modal dialog.
- **Saldo Inventaris Gudang**: Menampilkan saldo stok per produk dengan widget KPI akumulasi total stok dan jaminan ACID.
- **Log Mutasi Stok (Audit Trail)**: Menampilkan kartu stok permanen yang mencatat jenis mutasi (`INBOUND_RECEIVING`), perubahan kuantitas (+N), dokumen rujukan, dan operator pelaksana.

### C. Alur Kerja Penerimaan Barang (Receiving Workflow)
- **Daftar Dokumen Receiving**: Menampilkan seluruh dokumen masuk beserta status badge (`DRAFT`, `IN_PROGRESS`, `COMPLETED`), progres kelengkapan item, dan supervisor penanggung jawab.
- **Detail Dokumen Receiving**: Rincian baris item, target ekspektasi, kuantitas yang telah diterima, dan sisa yang belum tiba.
- **Pencatatan Fisik Aktual (Inbound)**:
  - **Validasi Real-Time**: Input kuantitas divalidasi langsung di browser. Jika angka yang dimasukkan melebihi sisa ekspektasi ($\text{input} > \text{remaining}$), kolom input berubah merah, muncul peringatan *Over-Receiving Forbidden*, dan tombol konfirmasi otomatis di-disable.
  - Mendukung penerimaan bertahap (parsial) atau tombol cepat "Terima Penuh".
- **Penyelesaian Dokumen (Complete)**:
  - Tombol **"Selesaikan Dokumen (Complete)"** otomatis **disabled** selama masih ada setidaknya 1 item yang belum 100% lengkap (status `PARTIAL` atau `PENDING`).
  - Setelah semua item berstatus `COMPLETED`, tombol aktif dan dapat diklik oleh Supervisor untuk mengunci dokumen secara permanen.

---

## 2. Cara Menjalankan Frontend

```bash
# 1. Masuk ke direktori frontend
cd frontend

# 2. Instalasi dependensi (jika belum)
npm install

# 3. Jalankan development server (port 3000 dengan proxy otomatis ke backend http://localhost:5000)
npm run dev

# 4. Build bundle produksi
npm run build
```

---

## 3. Struktur Direktori Frontend

```text
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # Axios instance dengan interceptor token JWT
│   ├── components/
│   │   ├── Modal.tsx            # Komponen dialog modal
│   │   ├── Navbar.tsx           # Header navigasi & status PostgreSQL
│   │   ├── Sidebar.tsx          # Navigasi samping berbasis peran
│   │   ├── StatusBadge.tsx      # Badge status (Draft, In Progress, Completed, dsb.)
│   │   └── Toast.tsx            # Sistem notifikasi alert mengambang
│   ├── context/
│   │   └── AuthContext.tsx      # State management autentikasi & peran pengguna
│   ├── pages/
│   │   ├── InventoryPage.tsx    # Saldo stok fisik gudang
│   │   ├── LoginPage.tsx        # Halaman login dengan tombol demo
│   │   ├── ProductsPage.tsx     # Master katalog produk
│   │   ├── ReceivingDetailPage.tsx # Verifikasi fisik barang & validasi over-receiving
│   │   ├── ReceivingsPage.tsx   # Daftar dokumen receiving & pembuatan dokumen
│   │   └── TransactionsPage.tsx # Audit log mutasi kartu stok
│   ├── types/
│   │   └── index.ts             # Definisi TypeScript model frontend
│   ├── App.tsx                  # Layout utama & routing berbasis tab
│   ├── index.css                # Tailwind base directives & dark theme styling
│   └── main.tsx                 # Root entrypoint
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
