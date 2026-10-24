# Warehouse Receiving System (WRS)

Sistem Informasi Manajemen Penerimaan Barang Gudang (*Warehouse Inbound Receiving Management System*) berbasis **Specification-Driven Development (SDD)**, menjamin sifat ACID, mencegah *over-receiving*, dan menyediakan jejak audit permanen.

---

## 1. Struktur Proyek

```text
warehouse-receiving-system/
├── docs/       # Dokumentasi teknis tunggal (SSOT): PRD, ERD, Spec, OpenAPI
├── backend/    # REST API (Node.js Express + TypeScript + PostgreSQL)
└── frontend/   # Web App UI (React 19 + Vite + TypeScript + Tailwind CSS v3.4)
```

---

## 2. Navigasi Direktori & Dokumentasi

1. **[Dokumentasi Spesifikasi (/docs)](file:///d:/laragon/www/warehouse-receiving-system/docs/README.md)**:
   - [docs/prd.md](file:///d:/laragon/www/warehouse-receiving-system/docs/prd.md): Product Requirements Document, business rules, dan user stories.
   - [docs/erd.mmd](file:///d:/laragon/www/warehouse-receiving-system/docs/erd.mmd): Diagram relasi entitas Mermaid.
   - [docs/technical-spec.md](file:///d:/laragon/www/warehouse-receiving-system/docs/technical-spec.md): Arsitektur, PostgreSQL DDL, Row-Level Locking, dan strategi pengujian.
   - [docs/openapi.yaml](file:///d:/laragon/www/warehouse-receiving-system/docs/openapi.yaml): Spesifikasi OpenAPI 3.0.3 lengkap.

2. **[Backend Service (/backend)](file:///d:/laragon/www/warehouse-receiving-system/backend/README.md)**:
   - Node.js Express REST API dengan koneksi PostgreSQL.
   - Migrasi skema database & constraint integritas (`npm run migrate`).
   - Seeder akun default `supervisor` dan `operator` (`npm run seed`).
   - Automated Integration Test Suite 10/10 lulus (`npm test`).

3. **[Frontend Application (/frontend)](file:///d:/laragon/www/warehouse-receiving-system/frontend/README.md)**:
   - React 19 SPA dengan Vite dan Tailwind CSS v3.4.
   - Halaman login dengan tombol cepat demo Supervisor & Operator.
   - Validasi real-time anti over-receiving saat input kuantitas fisik.
   - Tombol penyelesaian dokumen otomatis dinonaktifkan jika item belum 100% diterima.

---

## 3. Menjalankan Proyek Secara Penuh

### Terminal 1: Backend
```bash
cd backend
npm install
npm run db:setup    # Menjalankan migrasi dan seeder awal
npm run dev         # Berjalan di http://localhost:5000 (Health check: http://localhost:5000/health)
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev         # Berjalan di http://localhost:3000 (Proxy otomatis ke backend port 5000)
```

---

## 4. Kredensial Login Default

| Role | Username | Password | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- |
| **Warehouse Supervisor** | `supervisor` | `password123` | Buat dokumen receiving, selesaikan dokumen (`complete`), kelola produk, dan periksa kartu stok. |
| **Warehouse Operator** | `operator` | `password123` | Lihat dokumen aktif dan catat fisik barang masuk (validasi real-time). |
