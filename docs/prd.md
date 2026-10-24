# Product Requirements Document (PRD)
# Warehouse Receiving System (WRS)

| Metadata | Detail |
| :--- | :--- |
| **Project** | Warehouse Receiving System |
| **Document Version** | 1.0.0 |
| **Status** | Approved for Implementation |
| **Target Architecture** | Specification-Driven Development (SDD) |
| **Author** | Senior Software Architect & Technical Lead |
| **Date** | 2026-10-24 |

---

## 1. Executive Summary & Problem Statement

### 1.1 Latar Belakang & Problem Statement
Operasional gudang saat ini masih bergantung pada pencatatan manual berbasis spreadsheet (Microsoft Excel / Google Sheets) untuk mencatat barang masuk (inbound receiving). Praktik ini menimbulkan berbagai masalah kritis:
1. **Human Error & Over-Receiving**: Tidak ada validasi sistematis saat operator memasukkan kuantitas fisik yang tiba. Sering terjadi penerimaan barang melebihi kuantitas purchase order (PO), yang menimbulkan masalah penagihan vendor dan selisih persediaan fisik vs buku.
2. **Keterlambatan Pembaruan Stok**: Data stok baru diperbarui berjam-jam atau bahkan berhari-hari setelah barang fisik dibongkar, mengakibatkan tim operasional lain menjual atau menjanjikan stok yang belum siap.
3. **Ketiadaan Audit Trail Terpercaya**: Spreadsheet tidak menyediakan jejak audit permanen yang tidak dapat diubah (immutable). Siapa yang menerima barang, kapan diterima, dan dokumen rujukan mana yang digunakan sulit dilacak jika terjadi selisih stok.
4. **Data Race & Konflik Kolaborasi**: Ketika beberapa operator menerima barang dari dokumen yang sama secara paralel, file spreadsheet sering mengalami konflik penyimpanan (file lock atau overwriting data).

### 1.2 Business Objectives
1. **Eliminasi 100% Insiden Over-Receiving**: Menerapkan validasi ketat pada level aplikasi dan basis data agar kuantitas yang diterima tidak pernah melebihi ekspektasi dokumen rujukan.
2. **Sinkronisasi Stok Real-Time & ACID Compliant**: Setiap transaksi penerimaan fisik langsung memperbarui saldo inventaris dan mencatat kartu stok secara atomik dalam satu transaksi basis data.
3. **Pemisahan Peran yang Jelas (Segregation of Duties)**: Memisahkan otoritas antara pembuatan dokumen/validasi akhir (Supervisor) dan eksekusi penerimaan fisik (Operator).
4. **Jejak Audit Digital Menyeluruh**: Setiap pergerakan barang dicatat dengan cap waktu (timestamp) presisi dan identitas pengguna yang melakukan eksekusi.

---

## 2. User Roles & Responsibilities

Sistem menerapkan prinsip *Role-Based Access Control* (RBAC) dengan 2 peran utama:

| Peran | Deskripsi Tanggung Jawab | Batasan Akses |
| :--- | :--- | :--- |
| **Warehouse Supervisor** | 1. Membuat dokumen receiving baru (`receiving_documents`) berdasarkan rujukan eksternal/PO.<br>2. Menetapkan daftar produk dan kuantitas ekspektasi (`expected_quantity`).<br>3. Memantau progres penerimaan real-time.<br>4. Melakukan verifikasi akhir dan menutup dokumen (`COMPLETED`).<br>5. Mengelola katalog produk (`products`). | Dapat mengakses seluruh endpoint manajemen dokumen, verifikasi, katalog produk, dan laporan audit log transaksi inventaris. |
| **Warehouse Operator** | 1. Memeriksa fisik barang yang tiba di *inbound staging area*.<br>2. Mencatat kuantitas barang yang diterima secara bertahap (parsial) atau sekaligus (penuh).<br>3. Memeriksa kesesuaian SKU dan kondisi fisik barang. | Hanya dapat melihat dokumen receiving aktif, mencatat penerimaan item (`POST receive item`), dan melihat sisa ekspektasi. **Tidak dapat** membuat dokumen, menghapus dokumen, mengubah kuantitas ekspektasi, atau mengubah status dokumen menjadi `COMPLETED`. |

### 2.1 Role-Based Permission Matrix

| Fitur / Tindakan | Warehouse Operator | Warehouse Supervisor |
| :--- | :---: | :---: |
| Autentikasi (Login / Refresh / Me) | ✅ | ✅ |
| Melihat Katalog Produk & Stok | ✅ | ✅ |
| Membuat & Mengubah Data Produk | ❌ | ✅ |
| Membuat Dokumen Receiving (`DRAFT`) | ❌ | ✅ |
| Membaca Dokumen Receiving | ✅ | ✅ |
| Mencatat Penerimaan Item (Parsial / Penuh) | ✅ | ✅ |
| Mengubah Status Dokumen ke `COMPLETED` | ❌ | ✅ |
| Melihat Riwayat Transaksi Inventaris (`Audit Log`) | ❌ | ✅ |

---

## 3. Scope Definition

### 3.1 In-Scope
1. **Manajemen Pengguna & Autentikasi**: Login berbasis token JWT dengan masa berlaku terbatas, proteksi password menggunakan bcrypt salt hashing.
2. **Manajemen Master Produk**: Pencatatan SKU unik, nama barang, satuan hitung (unit: PCS, BOX, KG, dsb.), dan deskripsi.
3. **Manajemen Dokumen Inbound Receiving**: Pembuatan dokumen penerimaan dengan nomor dokumen unik (`doc_number`), daftar item barang, dan kuantitas ekspektasi.
4. **Eksekusi Penerimaan Barang (Receiving Execution)**:
   - Penerimaan penuh (kuantitas diterima langsung sama dengan ekspektasi).
   - Penerimaan bertahap/parsial (penerimaan dapat dicicil dalam beberapa kali kedatangan).
5. **Validasi Bisnis Mutlak**:
   - Pengecekan sisa kuantitas untuk mencegah *over-receiving*.
   - Validasi kelengkapan seluruh item sebelum dokumen dapat diubah ke status `COMPLETED`.
6. **Sinkronisasi Saldo Inventaris & Kartu Stok**: Pembaruan tabel `inventories` dan penulisan catatan log yang tidak dapat diubah ke `inventory_transactions`.
7. **Pencegahan Data Race**: Penguncian baris basis data (*row-level locking*) saat proses transaksi penerimaan berlangsung.

### 3.2 Out-of-Scope
1. Manajemen pengeluaran barang gudang (Outbound, Order Picking, Packing, Shipping).
2. Manajemen tata letak lokasi rak spesifik (*Bin / Rack / Aisle location tracking*).
3. Integrasi langsung dengan pemindai barcode perangkat keras (*hardware driver direct integration*); sistem menerima input teks standar dari pemindai yang bertindak sebagai keyboard emulator.
4. Pencocokan tagihan faktur vendor (*Vendor Invoice & 3-Way Matching accounting*).
5. Manajemen multi-gudang (*Multi-warehouse transfer / inter-branch routing*); sistem dirancang untuk operasional satu fasilitas gudang (*Single Warehouse Facility*).

---

## 4. Business Rules & Validations

### BR-001: Strict Prevention of Over-Receiving (Larangan Over-Receiving)
- Pada setiap transaksi penerimaan item, kuantitas yang diserahkan (`increment_quantity`) harus bilangan bulat positif (`> 0`).
- Validasi matematis wajib:
  $$\text{received\_quantity}_{\text{current}} + \text{increment\_quantity} \le \text{expected\_quantity}$$
- Jika penjumlahan melebihi $\text{expected\_quantity}$, sistem **wajib menolak transaksi** secara penuh, me-rollback basis data, dan mengembalikan HTTP status `422 Unprocessable Entity` dengan pesan kesalahan: `Quantity exceeds remaining expected quantity`.

### BR-002: Receiving Document Completion Pre-Condition
- Dokumen receiving hanya dapat diubah statusnya menjadi `COMPLETED` jika dan hanya jika:
  1. Dokumen saat ini berstatus `IN_PROGRESS`.
  2. Seluruh baris item (`receiving_items`) yang terdaftar di dalam dokumen tersebut telah berstatus `COMPLETED` ($\text{received\_quantity} = \text{expected\_quantity}$).
- Jika terdapat setidaknya 1 (satu) baris item dengan status `PENDING` atau `PARTIAL` ($\text{received\_quantity} < \text{expected\_quantity}$), sistem **wajib menolak permintaan penyelesaian** dengan HTTP status `400 Bad Request` dan merinci item yang belum terpenuhi.
- Aksi ini hanya dapat dieksekusi oleh pengguna berstatus role `SUPERVISOR`.

### BR-003: Item Status Progression
Setiap item penerimaan (`receiving_items`) memiliki siklus hidup status:
- **`PENDING`**: Nilai awal saat dokumen dibuat, di mana $\text{received\_quantity} = 0$.
- **`PARTIAL`**: Ketika $0 < \text{received\_quantity} < \text{expected\_quantity}$.
- **`COMPLETED`**: Ketika $\text{received\_quantity} = \text{expected\_quantity}$.
Status item dihitung dan diperbarui secara otomatis oleh sistem saat transaksi penerimaan berhasil dibukukan.

### BR-004: Document Status Progression
Dokumen receiving (`receiving_documents`) memiliki status:
- **`DRAFT`**: Dokumen baru dibuat oleh Supervisor; rincian item masih dapat disunting atau dihapus. Belum ada barang fisik yang diterima.
- **`IN_PROGRESS`**: Dokumen berpindah ke status ini secara otomatis ketika transaksi penerimaan pertama pada salah satu item berhasil dibukukan, atau dibuka secara eksplisit oleh Supervisor untuk penerimaan. Pada status ini, daftar item tidak dapat diubah lagi.
- **`COMPLETED`**: Dokumen ditutup permanen oleh Supervisor setelah seluruh item memenuhi BR-002.

### BR-005: Immutability of Completed Documents
- Dokumen yang telah berstatus `COMPLETED` menjadi **read-only** permanen.
- Tidak ada penambahan kuantitas barang, perubahan status, pembatalan item, atau penghapusan dokumen yang diizinkan setelah status `COMPLETED`.

### BR-006: Atomic Inventory & Transaction Logging (ACID Guarantee)
- Setiap kali penambahan kuantitas fisik diterima:
  1. Baris `receiving_items` diperbarui (`received_quantity` bertambah, status diperbarui).
  2. Status `receiving_documents` bertransisi ke `IN_PROGRESS` jika sebelumnya `DRAFT`.
  3. Baris `inventories` untuk `product_id` terkait diperbarui (kuantitas bertambah) atau dibuat baru jika belum ada baris inventaris.
  4. Baris riwayat baru disisipkan ke `inventory_transactions` dengan tipe `INBOUND_RECEIVING`, mencatat `product_id`, `receiving_document_id`, `quantity`, dan `created_by`.
- Seluruh 4 operasi di atas wajib berada di dalam satu transaksi basis data (*database transaction*). Jika salah satu gagal, seluruh perubahan di-rollback.

### BR-007: Concurrency & Row-Level Locking
- Untuk mencegah kondisi balapan (*race condition*) ketika beberapa operator secara bersamaan mengirimkan kuantitas untuk item atau produk yang sama, sistem wajib menggunakan klausa `SELECT ... FOR UPDATE` pada baris `receiving_items` dan `inventories` sebelum menghitung dan menyimpan data.

---

## 5. Functional Requirements (FR)

### Modul 1: Autentikasi & Akun
- **FR-001**: Sistem harus menyediakan endpoint login dengan kredensial `username` dan `password`.
- **FR-002**: Sistem harus memvalidasi kata sandi terenkripsi menggunakan bcrypt (work factor 12).
- **FR-003**: Sistem harus menerbitkan access token JWT (masa berlaku 1 jam) dan refresh token (masa berlaku 7 hari).
- **FR-004**: Sistem harus menyediakan endpoint `/auth/me` untuk mendapatkan informasi profil dan role pengguna aktif.

### Modul 2: Master Produk
- **FR-005**: Supervisor dapat menambahkan produk baru dengan `sku` (unik), `name`, `description`, dan `unit`.
- **FR-006**: Seluruh pengguna yang terautentikasi dapat melihat daftar produk dan melakukan pencarian berdasarkan SKU atau nama.
- **FR-007**: Supervisor dapat memperbarui data produk (selama SKU tidak duplikat).

### Modul 3: Manajemen Dokumen Receiving
- **FR-008**: Supervisor dapat membuat dokumen receiving baru dengan nomor dokumen unik (`doc_number`) dan sekumpulan item barang beserta `expected_quantity` ($> 0$).
- **FR-009**: Sistem secara otomatis menginisialisasi dokumen dengan status `DRAFT` dan setiap item dengan status `PENDING` dan `received_quantity = 0`.
- **FR-010**: Seluruh pengguna dapat memfilter daftar dokumen receiving berdasarkan status (`DRAFT`, `IN_PROGRESS`, `COMPLETED`) dan tanggal pembuatan.
- **FR-011**: Seluruh pengguna dapat melihat detail dokumen beserta daftar item, kuantitas ekspektasi, kuantitas yang telah diterima, dan sisa yang belum diterima.

### Modul 4: Eksekusi Penerimaan Barang (Item Receiving)
- **FR-012**: Operator dan Supervisor dapat mengirimkan transaksi penerimaan item dengan menyertakan `increment_quantity`.
- **FR-013**: Sistem memvalidasi transaksi sesuai BR-001 (tidak boleh over-receiving).
- **FR-014**: Sistem memperbarui status item menjadi `PARTIAL` atau `COMPLETED` sesuai BR-003.
- **FR-015**: Sistem memperbarui saldo stok di tabel `inventories` dan membuat catatan di `inventory_transactions` secara atomik sesuai BR-006.

### Modul 5: Penyelesaian Dokumen (Document Completion)
- **FR-016**: Supervisor dapat mengirimkan perintah penyelesaian dokumen (`POST /receiving-documents/{id}/complete`).
- **FR-017**: Sistem memverifikasi seluruh item sesuai BR-002. Jika valid, status dokumen diubah menjadi `COMPLETED`. Jika tidak, kembalikan daftar item yang belum lengkap.

### Modul 6: Inventaris & Laporan Audit
- **FR-018**: Pengguna dapat melihat saldo inventaris per produk.
- **FR-019**: Supervisor dapat melihat histori transaksi kartu stok (`inventory_transactions`) lengkap dengan referensi dokumen, tanggal, operator pelaksana, dan kuantitas pergerakan.

---

## 6. Non-Functional Requirements (NFR)

### 6.1 ACID Compliance & Data Integrity
- Seluruh mutasi data stok wajib mematuhi standar ACID (Atomicity, Consistency, Isolation, Durability) dengan basis data PostgreSQL.
- Tingkat isolasi transaksi minimal adalah `READ COMMITTED` yang diperkuat dengan *pessimistic row locking* (`FOR UPDATE`) pada operasi mutasi stok.

### 6.2 Performance & Responsiveness
- Latensi respon endpoint penerimaan item (`POST receive item`) tidak boleh melebihi 200 ms pada persentil 95 (P95) pada beban normal (hingga 50 request konkuren).
- Pemuatan halaman daftar dokumen dan inventaris tidak boleh melebihi 300 ms dengan penerapan pagination (`limit` & `offset` default 20 baris).

### 6.3 Security & Protection
- Komunikasi jaringan wajib menggunakan HTTPS / TLS 1.3 pada produksi.
- Semua kata sandi disimpan dalam bentuk hash menggunakan algoritma bcrypt (cost factor = 12).
- Proteksi terhadap kerentanan OWASP Top 10: SQL Injection (menggunakan parameterized queries / prepared statements), XSS, CSRF, dan validasi input skema ketat menggunakan Zod/Joi.

### 6.4 Auditability & Non-Repudiation
- Tabel `inventory_transactions` bersifat append-only; tidak ada operasi `UPDATE` atau `DELETE` yang diizinkan pada tabel ini.
- Setiap baris transaksi merekam `created_by` (ID pengguna yang mengeksekusi) dan `created_at` (timestamp UTC).

---

## 7. User Stories & Acceptance Criteria

### US-01: Login Pengguna & Penentuan Role
> **Sebagai** Pengguna Sistem (Operator / Supervisor)  
> **Saya ingin** melakukan login dengan username dan password  
> **Agar** saya mendapatkan hak akses yang sesuai dengan peran pekerjaan saya di gudang.

- **Skenario 1.1: Login Berhasil**
  - **Given** pengguna memiliki akun terdaftar dengan username `operator1` dan password valid.
  - **When** pengguna mengirimkan POST ke `/api/v1/auth/login` dengan username dan password tersebut.
  - **Then** sistem merespon status `200 OK` dengan payload JSON berisi `access_token`, `refresh_token`, dan objek `user` berisi `id`, `username`, dan `role`.
- **Skenario 1.2: Login Gagal dengan Kredensial Salah**
  - **Given** pengguna memasukkan password yang salah.
  - **When** pengguna mengirimkan POST ke `/api/v1/auth/login`.
  - **Then** sistem merespon status `401 Unauthorized` dengan pesan error `Invalid username or password`.

---

### US-02: Pembuatan Dokumen Receiving Baru (Supervisor)
> **Sebagai** Warehouse Supervisor  
> **Saya ingin** membuat dokumen receiving baru beserta daftar SKU dan jumlah ekspektasinya  
> **Agar** tim operator gudang memiliki acuan saat membongkar muatan dari vendor.

- **Skenario 2.1: Pembuatan Dokumen Berhasil**
  - **Given** Supervisor terautentikasi dengan token valid.
  - **When** Supervisor mengirimkan POST ke `/api/v1/receiving-documents` dengan nomor dokumen `"RCV-20261024-001"` dan daftar 2 item valid (`expected_quantity` masing-masing $> 0$).
  - **Then** sistem merespon `201 Created`, status dokumen bernilai `"DRAFT"`, seluruh item berstatus `"PENDING"`, dan `received_quantity = 0`.
- **Skenario 2.2: Ditolak jika Dibuat oleh Operator**
  - **Given** Operator terautentikasi dengan token bertipe role `OPERATOR`.
  - **When** Operator mencoba mengirimkan POST ke `/api/v1/receiving-documents`.
  - **Then** sistem menolak dengan status `403 Forbidden` dan pesan `Insufficient permissions`.
- **Skenario 2.3: Duplikasi Nomor Dokumen**
  - **Given** Nomor dokumen `"RCV-20261024-001"` telah ada di basis data.
  - **When** Supervisor membuat dokumen baru dengan nomor yang sama.
  - **Then** sistem mengembalikan status `409 Conflict` dengan pesan `Document number already exists`.

---

### US-03: Penerimaan Barang Parsial (Operator)
> **Sebagai** Warehouse Operator  
> **Saya ingin** mencatat penerimaan sebagian kuantitas dari suatu item  
> **Agar** progres fisik barang yang datang bertahap dapat tercatat dan langsung masuk ke saldo inventaris gudang.

- **Skenario 3.1: Penerimaan Parsial Berhasil**
  - **Given** Item A memiliki `expected_quantity = 100` dan `received_quantity = 0`.
  - **When** Operator mengirimkan kuantitas masuk `increment_quantity = 40` ke `/api/v1/receiving-documents/{id}/items/{itemId}/receive`.
  - **Then** sistem mengembalikan status `200 OK`.
  - **And** `received_quantity` item menjadi `40`.
  - **And** status item berubah menjadi `"PARTIAL"`.
  - **And** status dokumen berubah menjadi `"IN_PROGRESS"`.
  - **And** saldo stok produk di `inventories` bertambah `40`.
  - **And** sebuah baris baru tercatat di `inventory_transactions` dengan `quantity = 40` dan `type = 'INBOUND_RECEIVING'`.

---

### US-04: Penerimaan Barang Penuh (Full Receiving)
> **Sebagai** Warehouse Operator  
> **Saya ingin** menerima sisa kuantitas hingga mencapai jumlah ekspektasi secara penuh  
> **Agar** item tersebut ditandai selesai dan siap diproses ke tahap akhir.

- **Skenario 4.1: Pemenuhan Sisa Kuantitas Item**
  - **Given** Item A memiliki `expected_quantity = 100` dan `received_quantity = 40` (sisa 60).
  - **When** Operator mengirimkan `increment_quantity = 60`.
  - **Then** sistem merespon `200 OK`.
  - **And** `received_quantity` item menjadi `100`.
  - **And** status item berubah menjadi `"COMPLETED"`.
  - **And** saldo stok produk di `inventories` bertambah `60`.

---

### US-05: Penolakan Over-Receiving (Pencegahan Kelebihan Barang)
> **Sebagai** Sistem Warehouse  
> **Saya ingin** menolak penerimaan yang kuantitasnya melebihi ekspektasi  
> **Agar** tidak terjadi selisih stok fisik yang tidak sah dengan purchase order.

- **Skenario 5.1: Kuantitas Masuk Melebihi Sisa Ekspektasi**
  - **Given** Item B memiliki `expected_quantity = 50` dan `received_quantity = 40` (sisa 10).
  - **When** Operator mengirimkan `increment_quantity = 15`.
  - **Then** sistem menolak transaksi dengan respon `422 Unprocessable Entity`.
  - **And** pesan error menyatakan: `"Over-receiving forbidden. Maximum allowed increment is 10, but requested 15."`.
  - **And** saldo inventaris dan status item tidak berubah sama sekali (atomic rollback).

---

### US-06: Penyelesaian Dokumen Receiving Sukses (Supervisor)
> **Sebagai** Warehouse Supervisor  
> **Saya ingin** menutup dokumen receiving yang seluruh itemnya telah diterima lengkap  
> **Agar** dokumen berstatus final dan proses receiving dinyatakan tuntas.

- **Skenario 6.1: Menutup Dokumen yang Semua Itemnya Selesai**
  - **Given** Dokumen berstatus `"IN_PROGRESS"` dan seluruh 3 item di dalamnya telah berstatus `"COMPLETED"`.
  - **When** Supervisor mengirimkan POST ke `/api/v1/receiving-documents/{id}/complete`.
  - **Then** sistem merespon status `200 OK`.
  - **And** status dokumen berubah menjadi `"COMPLETED"`.
  - **And** dokumen terkunci dari seluruh perubahan selanjutnya.

---

### US-07: Percobaan Penyelesaian Dokumen dengan Item Belum Lengkap
> **Sebagai** Warehouse Supervisor  
> **Saya ingin** diperingatkan jika mencoba menutup dokumen yang itemnya belum lengkap  
> **Agar** dokumen tidak ditutup secara prematur sementara barang fisik masih ada yang tertinggal.

- **Skenario 7.1: Menutup Dokumen Saat Ada Item yang Masih PARTIAL / PENDING**
  - **Given** Dokumen memiliki Item 1 (`COMPLETED`) dan Item 2 (`PARTIAL`, diterima 30 dari 50).
  - **When** Supervisor mengirimkan POST ke `/api/v1/receiving-documents/{id}/complete`.
  - **Then** sistem menolak permintaan dengan status `400 Bad Request`.
  - **And** respon JSON mencantumkan daftar item yang belum lengkap:
    ```json
    {
      "success": false,
      "message": "Cannot complete receiving document: one or more items are not fully received.",
      "incomplete_items": [
        {
          "item_id": "uuid-item-2",
          "sku": "SKU-XYZ-01",
          "expected_quantity": 50,
          "received_quantity": 30,
          "remaining_quantity": 20
        }
      ]
    }
    ```
  - **And** status dokumen tetap `"IN_PROGRESS"`.

---

## 8. Asumsi Bisnis & Batasan Sistem

1. **Satuan Unit Minimum**: Kuantitas dinyatakan dalam bilangan bulat (`INTEGER >= 0`). Jika di masa depan memerlukan desimal (misal: kilogram atau meter), skema kolom dapat dimigrasi ke `NUMERIC(12, 3)`.
2. **Ketersediaan Jaringan**: Aplikasi berjalan di lingkungan jaringan lokal (LAN) gudang atau cloud VPN dengan koneksi stabil. Tidak ada fitur *offline-first sync* pada versi 1.0.
3. **Pembatalan Dokumen**: Pada rilis V1.0, dokumen yang telah berstatus `COMPLETED` tidak dapat dibatalkan melalui antarmuka reguler. Pembatalan korektif membutuhkan modul *Return to Vendor* (RTV) atau penyesuaian stok (*Stock Adjustment*) yang berada pada roadmap fase berikutnya.
4. **Keamanan Lingkungan Gudang**: Perangkat pemindai genggam (handheld barcode terminal) mengemulasi keyboard USB/Bluetooth standar dan mengakses aplikasi melalui peramban web modern (Google Chrome / Mozilla Firefox).
