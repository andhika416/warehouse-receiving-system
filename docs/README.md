# Dokumentasi Teknis Warehouse Receiving System (WRS)

Dokumentasi ini merupakan **Single Source of Truth (SSOT)** arsitektur dan spesifikasi bisnis sistem sebelum penulisan kode implementasi dimulai, mengadopsi metodologi **Specification-Driven Development (SDD)**.

## Indeks Dokumen Spesifikasi

1. **[Product Requirements Document (PRD)](file:///d:/laragon/www/warehouse-receiving-system/docs/prd.md)**
   - Latar belakang transisi dari spreadsheet ke sistem web terpusat.
   - Peran pengguna (*Warehouse Operator* vs *Warehouse Supervisor*) & hak akses matriks.
   - Aturan bisnis validasi (*Strict No Over-Receiving*, syarat kelengkapan penyelesaian dokumen).
   - User stories & kriteria penerimaan format Gherkin (Given-When-Then).
   - Batasan cakupan (In-Scope vs Out-of-Scope) dan batasan sistem.

2. **[Entity Relationship Diagram (ERD)](file:///d:/laragon/www/warehouse-receiving-system/docs/erd.mmd)**
   - Definisi entitas: `users`, `products`, `inventories`, `receiving_documents`, `receiving_items`, dan `inventory_transactions`.
   - Relasi antarentitas, kardinalitas, Primary Key (UUID), Foreign Key, dan Unique Constraints.
   - Format Mermaid native yang siap dirender di IDE atau viewer diagram.

3. **[Technical Specification & Architecture](file:///d:/laragon/www/warehouse-receiving-system/docs/technical-spec.md)**
   - Arsitektur sistem (React Vite TS + Node.js Express TS + PostgreSQL).
   - Skrip PostgreSQL DDL lengkap dengan *Primary Key*, *Foreign Key*, *Check Constraints*, *Indexes*, dan *Triggers*.
   - Diagram transisi status (*State Machine*) untuk dokumen dan item penerimaan.
   - Penanganan *Race Condition* & mitigasi *lost updates* menggunakan *Pessimistic Row Locking* (`SELECT ... FOR UPDATE`).
   - Strategi piramida pengujian (Unit, Integration dengan PostgreSQL riil, E2E).

4. **[OpenAPI 3.0 REST Specification](file:///d:/laragon/www/warehouse-receiving-system/docs/openapi.yaml)**
   - Kontrak REST API lengkap tanpa placeholder untuk seluruh modul:
     - Autentikasi (`/auth/login`, `/auth/refresh`, `/auth/me`).
     - Master Produk (`/products`, `/products/{id}`).
     - Manajemen Dokumen Receiving (`/receiving-documents`, `/receiving-documents/{id}`).
     - Eksekusi Penerimaan Item (`POST .../items/{itemId}/receive`).
     - Penyelesaian Dokumen (`POST .../complete`).
     - Saldo Inventaris (`/inventory`, `/inventory/{productId}`).
     - Log Audit Mutasi Kartu Stok (`/inventory/transactions`).
   - Dilengkapi skema request/response terinci, kode error HTTP standar, dan contoh payload nyata.

5. **[QA & Backend Testing Report (Testing)](file:///d:/laragon/www/warehouse-receiving-system/docs/testing.md)**
   - Laporan eksekusi automated tests (18/18 Passed) mencakup 4 skenario kritis:
     - Skenario 1: Test Over-receiving (HTTP 422 & Atomic Rollback).
     - Skenario 2: Test Document Completion (BR-002, 400 Bad Request jika parsial, 409 Conflict).
     - Skenario 3: Test Data Integrity (ACID transaction, sinkronisasi stok, immutable audit ledger).
     - Skenario 4: Test Validasi Akses & RBAC (Pencegahan akses Operator ke fitur Supervisor).
   - Panduan cara menjalankan tes dan daftar *known limitations* dari sistem.

6. **[AI Workflow & Specification-Driven Development Report](file:///d:/laragon/www/warehouse-receiving-system/docs/ai-workflow.md)**
   - Rangkuman penerapan metodologi Specification-Driven Development (SDD).
   - Analisis & evaluasi 3 prompt terpenting yang memandu implementasi DDL, business logic transaksional, dan automated test suite.
   - Refleksi efektivitas AI dan best practices prompt engineering.
