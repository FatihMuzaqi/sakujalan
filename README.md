# SAKULAJAN SaaS - Travel Expense Monitoring System

**SAKULAJAN SaaS** adalah platform B2B multi-tenant untuk manajemen perjalanan dinas perusahaan, penugasan officer, alokasi budget, pelacakan lokasi GPS realtime, pencatatan dan OCR struk otomatis berbasis AI, workflow persetujuan (approval) expense, pembukuan ledger keuangan, serta sistem langganan (subscription) dengan proteksi read-only saat expired.

---

## 🌟 Fitur Utama

1. **Multi-Tenant Architecture**:
   - Isolasi data mutlak per perusahaan (`company_id`).
   - Tenant A tidak dapat mengakses data Tenant B.
2. **Model Subscription & Billing**:
   - Free Trial 30 hari otomatis saat pendaftaran perusahaan.
   - Biaya langganan Rp50.000 / perusahaan / bulan.
   - Status `EXPIRED` beralih ke mode **Read-Only** (data historis tetap dapat dibaca, operasi create/update/delete diblokir hingga pembayaran diverifikasi webhook).
   - Aktivasi langganan **hanya** diproses melalui Webhook Backend terverifikasi, bukan dari respons frontend.
3. **Role-Based Access Control (RBAC)**:
   - `OWNER`: Akses penuh ke seluruh konfigurasi perusahaan, billing, member, dan trip.
   - `ADMIN`: Manajemen anggota, pengguna, dan operasional.
   - `MANAGER`: Pembuatan trip, penugasan officer, alokasi budget, pemantauan live GPS, approval pengeluaran, dan laporan.
   - `OFFICER`: Akses trip yang ditugaskan, mulai trip, streaming GPS realtime, scan struk & input pengeluaran, pantau status approval dan sisa balance.
4. **Realtime GPS Tracking (Socket.IO)**:
   - Streaming koordinat GPS dari aplikasi officer.
   - Live room broadcasting ke dashboard manager.
5. **Smart Receipt OCR & AI Parsing**:
   - Ekstraksi otomatis nominal (Rupiah), tanggal, merchant, dan kategori pengeluaran (*Fuel, Toll, Meals, Hotel, Transport, Supplies*).
6. **Financial Ledger / Wallet**:
   - Pencatatan transaksi disbursement alokasi budget dan pemotongan otomatis saat expense disetujui.

---

## 🏗️ Struktur Arsitektur Backend

```
backend/
├── config/             # Database (Sequelize), Env, Constants
├── route/              # REST API Routes (/api/v1/*)
├── middleware/         # Auth (JWT), Tenant, Role (RBAC), SubscriptionGuard, Multer, ErrorHandler
├── validators/         # Zod Request Schemas
├── controller/         # Thin Controllers
├── services/           # Business Logic, OCR, Payment Webhook, Socket.IO
├── model/              # Sequelize Models & Relations (Company, User, Trip, Expense, etc.)
├── seeders/            # Demo data seeder
├── utils/              # JWT, Hash, Response Formatter, Logger
├── jobs/               # Cron jobs (Subscription Expiration Checker)
├── tests/              # Automated Integration Test Suite
├── app.js              # Express app setup
├── server.js           # Server & Socket.IO initialization
└── package.json
```

---

## 🚀 Panduan Menjalankan Backend

### 1. Masuk ke direktori backend & pasang dependensi
```bash
cd backend
npm install
```

### 2. Jalankan Automated Integration Tests (100% Pass)
```bash
npm test
```

### 3. Jalankan Seeder Demo Data
```bash
node seed.js
```
**Akun Demo:**
- Owner: `owner@nusantara.com` / `password123`
- Manager: `manager@nusantara.com` / `password123`
- Officer: `officer@nusantara.com` / `password123`

### 4. Jalankan Development Server
```bash
npm run dev
# Server aktif di http://localhost:5000
```

---

## 📱 Panduan Menjalankan Frontend Flutter

```bash
cd frontend
flutter pub get
flutter run
```

---

## 🛡️ Ringkasan API Endpoints

| Method | Endpoint | Role / Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register perusahaan baru + Trial 30 hari + Akun OWNER |
| `POST` | `/api/v1/auth/login` | Public | Login pengguna & penerbitan JWT Access & Refresh Token |
| `GET` | `/api/v1/auth/me` | Authenticated | Mendapatkan profil pengguna & perusahaan saat ini |
| `GET` | `/api/v1/company/profile` | Authenticated | Mendapatkan data tenant & masa aktif subscription |
| `GET` | `/api/v1/users` | OWNER, ADMIN, MANAGER | Daftar anggota tim dalam tenant |
| `POST` | `/api/v1/users` | OWNER, ADMIN | Menambahkan user baru dalam tenant |
| `GET` | `/api/v1/trips` | All Roles | Daftar perjalanan dinas (Officer hanya melihat tugasnya) |
| `POST` | `/api/v1/trips` | OWNER, ADMIN, MANAGER | Membuat perjalanan dinas baru & alokasi budget |
| `PATCH` | `/api/v1/trips/:id/status` | All Roles | Update status perjalanan (`IN_PROGRESS`, `COMPLETED`) |
| `POST` | `/api/v1/expenses` | All Roles | Submit pengeluaran dengan upload struk |
| `POST` | `/api/v1/expenses/scan-receipt` | All Roles | OCR preview struk otomatis |
| `PATCH` | `/api/v1/expenses/:id/approval` | OWNER, MANAGER | Persetujuan/Penolakan pengeluaran & potong budget trip |
| `POST` | `/api/v1/locations` | OFFICER | Catat titik koordinat GPS perjalanan |
| `GET` | `/api/v1/wallet/ledger` | OWNER, ADMIN, MANAGER | Buku besar keuangan & mutasi saldo |
| `POST` | `/api/v1/subscriptions/checkout` | OWNER, ADMIN | Checkout tagihan langganan Rp50.000 / bulan |
| `POST` | `/api/v1/webhooks/payment` | Webhook Gateway | Verifikasi pembayaran & perpanjangan otomatis 30 hari |
| `GET` | `/api/v1/reports/dashboard` | OWNER, ADMIN, MANAGER | Ringkasan statistik operasional & budget utilization |
