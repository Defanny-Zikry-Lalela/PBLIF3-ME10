# NutriTrack MBG — Admin

Fondasi administrasi distribusi pangan bergizi untuk SPPG Batam Center. Tahap ini mencakup autentikasi administrator dan dashboard monitoring pengiriman; menu aktor lain ditampilkan sebagai tahap pengembangan berikutnya.

## Teknologi

- Frontend: React, JSX, Vite, dan React Router.
- Backend: Node.js, Express, JWT, bcrypt, Nodemailer, dan antrean email terenkripsi.
- Database: Prisma ORM dengan SQLite. File database dibuat di `backend/prisma/dev.db`.

## Persiapan

Gunakan Node.js 20.19+ atau 22.12+, lalu buka dua terminal di folder proyek.

### 1. Siapkan backend

```powershell
cd backend
Copy-Item .env.example .env
```

Atur `JWT_SECRET` dengan nilai acak minimal 32 karakter serta ganti nilai `ADMIN_USERNAME`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` pada `backend/.env`. Kata sandi admin harus minimal 8 karakter; gunakan kata sandi unik dan lebih panjang untuk lingkungan produksi. Jangan masukkan berkas `.env` atau kata sandi ke Git.

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:seed` membuat atau memperbarui akun admin dan data contoh monitoring program MBG. Jalankan kembali perintah seed setelah mengganti nilai kredensial admin untuk memperbarui akun.

### 2. Jalankan frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite (biasanya `http://localhost:5173`) dan masuk dengan kredensial admin yang telah diatur di backend. Antarmuka dibuat dengan JSX; `frontend/index.html` hanya menjadi shell standar Vite yang memuat aplikasi React.
Jika backend berjalan pada port selain `5000`, set `VITE_BACKEND_URL` (contoh `http://localhost:5001`) pada environment Vite sebelum menjalankan frontend.

## Sekolah penerima dan akun sekolah

Pada menu **Sekolah**, admin dapat mendaftarkan nama sekolah, email resmi, jenjang, alamat, serta target porsi MBG harian. Sistem menyiapkan kredensial login: email sekolah menjadi username dan nama sekolah menjadi password awal. Kredensial dikirim ke email sekolah. Status akun tetap menunggu sampai sekolah berhasil login pertama kali; daftar sekolah admin diperbarui otomatis secara berkala. Setelah login, sekolah dapat mengganti password dari dashboard (password baru minimal 12 karakter).

Untuk benar-benar mengirim undangan Gmail:

1. Aktifkan verifikasi dua langkah pada akun Google pengirim dan buat **App Password** khusus untuk NutriTrack MBG.
2. Atur `SMTP_USER` ke alamat Gmail, `SMTP_PASSWORD` ke App Password (bukan kata sandi akun utama), `EMAIL_FROM` ke `NutriTrack MBG <alamat-Gmail-yang-sama>`, dan `APP_URL` ke alamat frontend yang dapat diakses sekolah. Nilai `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, dan `SMTP_SECURE=false` sudah menjadi contoh bawaan.
3. Simpan App Password hanya di `backend/.env` lokal yang tidak masuk Git, lalu mulai ulang backend.
4. Buka menu **Sekolah** dan tekan **Periksa SMTP**. Hanya setelah verifikasi berhasil status SMTP aktif dan antrean email kredensial dikirim.

Email dan password awal disimpan terenkripsi di antrean sampai SMTP siap; halaman tidak menyebut email terkirim sebelum server email menerimanya. Sekolah yang didaftarkan tanpa SMTP mendapat status belum login dan dapat dikirimi ulang dari daftar sekolah. Password awal yang sama dengan nama sekolah hanya untuk login pertama—segera ganti dari dashboard dan jangan terus digunakan.

## Portal sekolah

Semua aktor menggunakan satu halaman masuk di `/login`; backend mengenali admin atau sekolah dari email/username yang dimasukkan. Akun sekolah menggunakan email dan password awal yang dikirim; login pertama mengubah status akun menjadi aktif. Login kurir akan memakai halaman yang sama setelah akun kurir dan autentikasinya dikembangkan. Dashboard sekolah mengambil jadwal distribusi dan menu aktual dari database. Sekolah dapat mengganti password dari dashboard. Bila admin belum menjadwalkan pengiriman, portal menampilkan kondisi belum ada jadwal (bukan data contoh). Fitur QC, konfirmasi penerimaan, dan pengajuan retur ditandai sebagai tahap berikutnya.

## Menu dan gizi

Pada **Menu & Gizi**, admin menyusun menu per jenjang dan tanggal, memilih sekolah penerima, mengatur komposisi bahan per porsi, melihat estimasi energi/protein/karbohidrat/lemak, dan menyimpan catatan produksi. Penjadwalan membuat satu data pengiriman persiapan per sekolah terpilih; distribusinya kemudian muncul di dashboard admin. Seed memuat contoh bahan dengan kandungan per 100 g.

Perhitungan memakai data ilustrasi bahan dan bukan pengganti data label produk atau konsultasi tenaga gizi. Rentang pembanding SD di layar hanya referensi ilustratif, bukan standar resmi atau satu-satunya ketentuan gizi; periksa kebutuhan dan kebijakan yang berlaku sebelum produksi.

## API administrator

- `POST /api/auth/login` menerima `username` (email atau username) dan `password`, mengenali akun admin atau sekolah otomatis, lalu membalas token sesi selama 8 jam beserta aktor.
- `GET /api/auth/me` memeriksa sesi admin.
- `GET /api/admin/dashboard?page=1&limit=7&status=all&search=` memberikan ringkasan, daftar pengiriman, klaim pending, notifikasi, dan metadata halaman. Endpoint ini hanya dapat diakses admin yang sudah masuk.
- `GET/POST /api/admin/schools` untuk melihat dan mendaftarkan sekolah penerima beserta undangan akun.
- `PATCH/DELETE /api/admin/schools/:schoolId` untuk memperbarui sekolah atau menghapus sekolah beserta data terkaitnya. Penghapusan memerlukan konfirmasi admin dan menghapus jadwal, klaim, keanggotaan menu, serta akun sekolah.
- `POST /api/admin/schools/:schoolId/invite` untuk mengirim ulang kredensial login sekolah yang belum pernah login.
- `POST /api/admin/email/test` untuk memeriksa autentikasi SMTP dan mengirim antrean email kredensial jika koneksi lolos verifikasi.
- `GET /api/admin/nutrition/ingredients`, `GET/POST /api/admin/nutrition/menus` untuk bahan makanan, kalkulasi, dan jadwal menu.
- `POST /api/auth/school/activate` untuk kompatibilitas dengan tautan aktivasi lama; status aktif tetap ditetapkan saat sekolah login.
- `POST /api/auth/school/login`, `GET /api/auth/school/me`, `PATCH /api/school/password`, dan `GET /api/school/dashboard` untuk autentikasi, penggantian password, dan ringkasan distribusi sekolah.

## Data aplikasi

`npm run db:seed` hanya membuat atau memperbarui akun admin; perintah itu tidak lagi menambahkan sekolah, pengiriman, menu, atau bahan contoh. `npm run db:remove-demo-data` menghapus hanya baris demo yang dikenali dari seed lama; akun admin dan data lain dipertahankan. Sekolah contoh yang masih dipakai data operasional tidak dihapus.

Dashboard menyediakan pencarian nama sekolah/kurir, filter status, pagination, pembaruan data, dan detail pengiriman. Data yang ditampilkan berasal dari SQLite lewat Prisma; jalankan `npm run db:studio` di folder `backend` untuk melihat database secara visual.

Pemeriksaan frontend:

```powershell
cd frontend
npm run lint
npm run build
```
