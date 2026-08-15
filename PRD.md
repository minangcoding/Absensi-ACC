# PRD — Sistem Informasi Absensi Karyawan

## Divisi Telemarketing Officer — PT Astra Credit Companies (ACC)

---

## 1. Latar Belakang & Tujuan

Sistem absensi saat ini (asumsi: manual/Excel) rentan human error, sulit direkap, dan tidak real-time. Sistem baru berbasis **Website + PWA** ini bertujuan:

- Mencatat kehadiran karyawan secara digital, real-time, dan tervalidasi lokasi (WFO — full onsite, tidak ada opsi WFA).
- Memberi visibilitas penuh ke Admin atas seluruh aktivitas absensi.
- Mempermudah proses pengajuan & approval izin/sakit/cuti.
- Menghasilkan laporan kehadiran otomatis untuk kebutuhan payroll/HR.

---

## 2. Model Peran (Role) & Akses

Semua user (Admin, HR, Supervisor, Karyawan/TO) **wajib absen** — tidak ada pengecualian. Perbedaan ada di **hak akses**, bukan kewajiban absen.

| Role              | Wajib Absen | Halaman                          | Kewenangan Tambahan                                                                                                                            |
| ----------------- | ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Karyawan (TO)** | ✅          | Standar                          | Absen, riwayat pribadi, ajukan izin                                                                                                            |
| **Supervisor**    | ✅          | Standar                          | + Lihat & approve izin anak buah (tim-nya saja)                                                                                                |
| **HR**            | ✅          | Standar                          | + Lihat semua data absensi, approve izin semua divisi, export laporan                                                                          |
| **Admin**         | ✅          | **Halaman khusus (Admin Panel)** | Full control: lihat semua user real-time, edit/hapus data absensi, kelola akun, kelola lokasi kantor & jam kerja, kelola role, lihat audit log |

**Catatan desain:** satu basis kode UI untuk role Karyawan/Supervisor/HR (dengan komponen yang muncul/hilang sesuai permission), dan satu dashboard terpisah khusus Admin yang lebih kaya fitur (monitoring, kontrol penuh).

---

## 3. Fitur per Modul

### 3.1 Autentikasi

- Login (email/username + password), JWT-based, role-based access control (RBAC)
- Lupa password (reset via email/OTP)

### 3.2 Absensi (Semua Role)

- Absen masuk & pulang
- Validasi **geofencing**: harus dalam radius kantor (karena full WFO)
- Foto selfie saat absen (validasi kehadiran, anti-titip absen)
- Status otomatis: Hadir / Telat (berdasarkan toleransi jam kerja) / Alpha (tidak absen)
- Riwayat absensi pribadi (kalender/list, filter tanggal)

### 3.3 Pengajuan Izin/Sakit/Cuti (Semua Role)

- Form pengajuan: jenis (izin/sakit/cuti), tanggal, alasan, upload lampiran (surat dokter dll)
- Status: Pending → Disetujui/Ditolak
- Riwayat pengajuan pribadi

### 3.4 Approval (Supervisor & HR)

- Supervisor: approve/reject pengajuan izin anggota tim langsungnya
- HR: approve/reject semua pengajuan (final authority), lihat rekap seluruh divisi

### 3.5 Dashboard Monitoring (HR & Admin)

- Rekap kehadiran harian/mingguan/bulanan (siapa yang sudah/belum absen hari ini — real-time)
- Grafik tingkat kehadiran, keterlambatan, izin per periode
- Export laporan (Excel/PDF) untuk payroll

### 3.6 Admin Panel (Khusus Admin)

- Monitoring real-time seluruh user: siapa absen jam berapa, dari lokasi mana, foto absen
- CRUD data user & role (tambah/edit/nonaktifkan karyawan)
- Kelola lokasi kantor (koordinat + radius geofence)
- Kelola jam kerja/shift & toleransi keterlambatan
- Edit/koreksi manual data absensi (misal lupa absen, ada alasan)
- Audit log (siapa mengubah apa, kapan)

### 3.7 Notifikasi

- Reminder absen masuk/pulang (push notification via PWA)
- Notifikasi status approval izin
- Notifikasi ke Supervisor/HR saat ada pengajuan baru

---

## 4. Kenapa PWA (bukan native app)

- Karyawan cukup buka via browser HP, bisa "Add to Home Screen"
- Akses **Geolocation API** untuk validasi lokasi absen
- Push notification via service worker
- Tidak perlu proses rilis ke Play Store/App Store — cocok untuk internal tool

---

## 5. Tech Stack

| Layer          | Tools                                                          |
| -------------- | -------------------------------------------------------------- |
| Frontend       | React + Vite, Tailwind CSS, `vite-plugin-pwa`                  |
| Backend        | Node.js + Express                                              |
| Database       | PostgreSQL (relasional, cocok untuk data absensi & laporan)    |
| Auth           | JWT + RBAC (role: admin, hr, supervisor, karyawan)             |
| Geolocation    | Browser Geolocation API (validasi radius kantor)               |
| Foto absen     | Upload ke storage (lokal dulu → bisa migrasi ke S3/Cloudinary) |
| Export laporan | `exceljs` (Excel), `pdfkit` (PDF)                              |
| Notifikasi     | Web Push API (service worker)                                  |

---

## 6. Struktur Database (Disesuaikan)

### `users`

| Kolom                  | Tipe           | Keterangan                              |
| ---------------------- | -------------- | --------------------------------------- |
| id                     | UUID/INT PK    |                                         |
| nama                   | VARCHAR        |                                         |
| email                  | VARCHAR UNIQUE |                                         |
| password               | VARCHAR        | hashed                                  |
| no_hp                  | VARCHAR        |                                         |
| role                   | ENUM           | `admin`, `hr`, `supervisor`, `karyawan` |
| divisi                 | VARCHAR        | e.g. Telemarketing Officer              |
| jabatan                | VARCHAR        |                                         |
| supervisor_id          | FK → users.id  | untuk relasi tim (nullable)             |
| foto_profile           | VARCHAR        |                                         |
| status_aktif           | BOOLEAN        |                                         |
| created_at, updated_at | TIMESTAMP      |                                         |

### `offices` (lokasi kantor untuk geofencing — full WFO)

| Kolom               | Tipe    | Keterangan             |
| ------------------- | ------- | ---------------------- |
| id                  | PK      |                        |
| nama_kantor         | VARCHAR |                        |
| latitude, longitude | DECIMAL |                        |
| radius_meter        | INT     | radius toleransi absen |

### `work_schedules`

| Kolom                 | Tipe    | Keterangan |
| --------------------- | ------- | ---------- |
| id                    | PK      |            |
| nama_shift            | VARCHAR |            |
| jam_masuk_standar     | TIME    |            |
| jam_pulang_standar    | TIME    |            |
| toleransi_telat_menit | INT     |            |

### `attendances`

| Kolom                    | Tipe            | Keterangan                                         |
| ------------------------ | --------------- | -------------------------------------------------- |
| id                       | PK              |                                                    |
| user_id                  | FK → users.id   |                                                    |
| office_id                | FK → offices.id |                                                    |
| tanggal                  | DATE            |                                                    |
| jam_masuk                | TIMESTAMP       |                                                    |
| jam_pulang               | TIMESTAMP       | nullable                                           |
| lokasi_masuk (lat,long)  | DECIMAL         |                                                    |
| lokasi_pulang (lat,long) | DECIMAL         | nullable                                           |
| foto_masuk               | VARCHAR (path)  |                                                    |
| foto_pulang              | VARCHAR (path)  | nullable                                           |
| status                   | ENUM            | `hadir`, `telat`, `alpha`, `izin`, `sakit`, `cuti` |
| keterangan               | TEXT            | nullable, untuk koreksi manual admin               |
| diedit_oleh              | FK → users.id   | nullable, tercatat kalau admin koreksi manual      |

### `leave_requests`

| Kolom                          | Tipe          | Keterangan                        |
| ------------------------------ | ------------- | --------------------------------- |
| id                             | PK            |                                   |
| user_id                        | FK → users.id |                                   |
| jenis                          | ENUM          | `izin`, `sakit`, `cuti`           |
| tanggal_mulai, tanggal_selesai | DATE          |                                   |
| alasan                         | TEXT          |                                   |
| file_lampiran                  | VARCHAR       | nullable                          |
| status                         | ENUM          | `pending`, `disetujui`, `ditolak` |
| approved_by                    | FK → users.id | nullable                          |
| approved_at                    | TIMESTAMP     | nullable                          |
| catatan_approval               | TEXT          | nullable                          |

### `notifications`

| Kolom        | Tipe          | Keterangan                       |
| ------------ | ------------- | -------------------------------- |
| id           | PK            |                                  |
| user_id      | FK → users.id |                                  |
| judul, pesan | VARCHAR/TEXT  |                                  |
| tipe         | ENUM          | `reminder`, `approval`, `sistem` |
| is_read      | BOOLEAN       |                                  |
| created_at   | TIMESTAMP     |                                  |

### `audit_logs` (khusus untuk aksi Admin)

| Kolom        | Tipe          | Keterangan                      |
| ------------ | ------------- | ------------------------------- |
| id           | PK            |                                 |
| admin_id     | FK → users.id |                                 |
| aksi         | VARCHAR       | e.g. "edit data absensi user X" |
| target_table | VARCHAR       |                                 |
| target_id    | INT           |                                 |
| detail       | JSON/TEXT     |                                 |
| created_at   | TIMESTAMP     |                                 |

---

## 7. Halaman (Page List)

**Shared (Karyawan/Supervisor/HR — beda hak akses tampilan):**

1. Login
2. Dashboard (ringkasan absensi pribadi)
3. Absen (tombol masuk/pulang + kamera + status lokasi)
4. Riwayat Absensi
5. Pengajuan Izin/Cuti (form + riwayat)
6. Approval Izin _(muncul hanya untuk Supervisor & HR)_
7. Rekap Tim/Divisi + Export _(muncul hanya untuk HR)_
8. Profil & Notifikasi

**Khusus Admin:**

1. Admin Dashboard (monitoring real-time semua user)
2. Manajemen User (CRUD + role assignment)
3. Manajemen Lokasi Kantor & Jam Kerja
4. Koreksi Data Absensi
5. Audit Log

---

## 8. Alur Penulisan Skripsi (Bab 3–5)

1. **Analisis sistem berjalan** — proses absensi manual saat ini (jadi latar belakang masalah)
2. **Analisis kebutuhan** — Use Case Diagram (aktor: Admin, HR, Supervisor, Karyawan), Activity Diagram per fitur
3. **Perancangan** — ERD (dari struktur DB di atas), Class Diagram, DFD, mockup UI (wireframe tiap halaman)
4. **Implementasi** — screenshot hasil + potongan kode kunci (geofencing, auth RBAC, dsb)
5. **Pengujian** — Black box testing per fitur (tabel skenario uji + hasil)

---

## 9. Next Steps (Eksekusi)

- [ ] Review & finalisasi PRD ini
- [ ] Buat ERD & Use Case Diagram
- [ ] Setup project (React + Vite PWA, Express + PostgreSQL)
- [ ] Implementasi Auth & RBAC
- [ ] Implementasi modul Absensi + Geofencing
- [ ] Implementasi modul Izin/Approval
- [ ] Implementasi Admin Panel
- [ ] Testing & dokumentasi
