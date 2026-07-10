# Instruksi Konteks untuk AI Assistant: Fitur Autentikasi (Verifikasi Email & Lupa Password)

Halo AI,
Tugas kamu adalah membantu saya mengimplementasikan DAN MENG UPGRADE DARI CODE YANG ADA SEKARANG INI UNTUK alur backend untuk dua fitur utama: **Registrasi dengan Verifikasi Email** dan **Forgot Password (Reset Password)**.

Kita sudah memiliki layanan pengiriman email yang menggunakan **Brevo API v3**. Fungsi pengirim emailnya sudah siap (misalnya `sendTransactionalEmail(to, subject, html)`).

Berikut adalah spesifikasi dan alur logika yang harus kamu buatkan kodenya:

---

## 1. Fitur Registrasi & Verifikasi Email

**Konteks Logika:**

1. **Endpoint `POST /register`:**
   - Terima input user (email, password, nama, dll).
   - Validasi input (cek apakah email sudah terdaftar).
   - Hash password user (gunakan `bcrypt` atau argon2).
   - Simpan data user ke database dengan status `is_verified = false`.
   - Generate `verification_token` yang unik (kombinasi random string/UUID) dan tetapkan waktu kedaluwarsa (_expiry time_, misal 24 jam). Simpan token ini di database.
   - Panggil fungsi pengiriman email Brevo untuk mengirimkan email selamat datang sekaligus link verifikasi.
   - _Format Link:_ `https://<url-frontend>/verify-email?token=<verification_token>`

2. **Endpoint `GET /verify-email` (atau POST):**
   - Terima `token` dari query/body.
   - Cari user/token di database.
   - Cek apakah token valid dan belum _expired_.
   - Jika valid, ubah status `is_verified = true` pada user tersebut, lalu hapus atau tandai token sudah terpakai.
   - Kembalikan respon sukses.

---

## 2. Fitur Lupa Password (Forgot Password)

**Konteks Logika:**

1. **Endpoint `POST /forgot-password`:**
   - Terima input `email` dari user.
   - Cek apakah email tersebut ada di database. (Jika tidak ada, tetap kembalikan pesan sukses secara generik agar tidak membocorkan data user).
   - Jika ada, generate `reset_token` unik yang aman dan set _expiry time_ yang lebih singkat (misal 15-60 menit). Simpan ke database.
   - Panggil fungsi pengiriman email Brevo untuk mengirim link reset password.
   - _Format Link:_ `https://<url-frontend>/reset-password?token=<reset_token>`

2. **Endpoint `POST /reset-password`:**
   - Terima `token` dan `new_password` dari request body.
   - Cek validitas `token` di database dan pastikan belum _expired_.
   - Jika valid, hash `new_password` tersebut.
   - Update password user di database dengan hash yang baru.
   - Hapus `reset_token` dari database agar tidak bisa digunakan ulang.
   - Kembalikan respon sukses.

---

## Tugas untuk AI Assistant:

Berdasarkan instruksi di atas, tolong buatkan:

1. Skema/Model Database yang dibutuhkan untuk menyimpan token (baik untuk tabel `users` atau tabel terpisah seperti `tokens`).
2. Kode _Controller/Handler_ untuk ke-4 endpoint di atas (`/register`, `/verify-email`, `/forgot-password`, `/reset-password`).
3. Template HTML sederhana untuk email verifikasi dan email reset password yang akan dikirim via Brevo.
4. Terapkan best practices keamanan (seperti hashing, generic error messages pada forgot password).
