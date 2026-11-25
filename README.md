# sewa-barang

**SewaIn+** — Platform penyewaan busana formal & sepatu pesta Indonesia (Kebaya Wisuda, Gaun Pesta, Jas Pria, High Heels, Sepatu Pantofel) berbasis **Nuxt 4**, **TypeScript**, **Tailwind CSS**, dan **TiDB Cloud (MySQL)**.

## Fitur Utama
- Katalog busana & sepatu dengan pilihan varian warna, ukuran, filter kota/harga/tanggal, dan kalender ketersediaan real-time
- Sistem autentikasi **Admin Butik** & **Penyewa**
- Checkout sewa lengkap dengan metode pembayaran (Cash, Transfer Bank, QRIS, GoPay), jaminan identitas (KTP/SIM/KTM/KK), dan struk transaksi
- Alur **Pengembalian Deposit (Deposit Refund)** lengkap untuk penyewa & verifikasi admin butik
- Penyimpanan persisten pada **TiDB Cloud** (`sewain_db`)

## Menjalankan Proyek
1. Salin `.env.example` menjadi `.env` lalu isi kredensial TiDB Cloud Anda.
2. Instal dependensi dan inisialisasi database:
   ```bash
   npm install
   npm run db:init
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
