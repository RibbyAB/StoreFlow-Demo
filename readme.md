# StoreFlow

Aplikasi manajemen toko (kasir, stok, pembelian, laporan) berbasis web —
dibangun untuk operasional toko bangunan sehari-hari, dengan versi demo
publik yang bisa langsung dicoba tanpa perlu setup apa pun.

> 🔒 **Repo ini adalah versi demo.** Data yang ditampilkan seluruhnya
> dummy/fiktif dan terpisah total dari sistem production yang sebenarnya
> dipakai untuk operasional toko.

## Coba Langsung (Demo)

- **Live demo:** `https://<isi-link-frontend-demo-kamu>.vercel.app`
- **Akun demo:**
  - Email: `demo@storeflow.app`
  - Password: `demo1234`

Data di demo ini di-reset/diisi ulang secara berkala dan aman untuk
dieksplorasi bebas — silakan tambah/edit/hapus data sepuasnya.

## Fitur Utama

- 🔐 **Autentikasi berbasis role** — Owner & Kasir dengan hak akses berbeda
- 📦 **Manajemen barang** — stok, kategori, satuan, harga beli/jual, alert stok minimum
- 🛒 **Transaksi penjualan (kasir)** — multi metode bayar (tunai, transfer, QRIS, hutang), cicilan/piutang pelanggan
- 🚚 **Transaksi pembelian** — restock dari supplier, termasuk hutang ke supplier
- 👥 **Manajemen pelanggan & supplier** — riwayat transaksi per pelanggan (ledger)
- 📊 **Dashboard** — ringkasan penjualan, grafik 7 hari terakhir, barang terlaris
- 🧾 **Cetak nota** — nota transaksi siap cetak/PDF
- 📈 **Laporan** — laporan penjualan, pembelian, dan operasional per periode
- ⚙️ **Pengaturan toko** — nama toko, alamat, telepon, footer nota bisa diatur dari UI

## Tech Stack

- **Backend:** Node.js, Express, MySQL (kompatibel [TiDB Serverless](https://www.pingcap.com/tidb-serverless/)), JWT untuk autentikasi, bcrypt untuk hashing password
- **Frontend:** React, React Router, Axios
- **Database:** MySQL / TiDB (schema relasional, lihat `database/schema.sql`)

## Menjalankan Secara Lokal

### 1. Clone & install

```bash
git clone <repo-url>
cd StoreFlow
cd backend && npm install
cd ../frontend && npm install
```

### 2. Siapkan database

Buat database MySQL/TiDB baru, lalu jalankan:

```bash
mysql -u root -p < database/schema.sql
```

Untuk mengisi dengan **data demo** (akun demo + contoh barang/transaksi):

```bash
mysql -u root -p < database/schema.demo.sql
mysql -u root -p < database/schema.demo.data7days.sql
```

> `schema.demo.data7days.sql` mengisi data transaksi 7 hari terakhir
> secara relatif (pakai `NOW()`), jadi grafik dashboard selalu terisi
> kapan pun script dijalankan.

### 3. Konfigurasi environment variable

Buat file `.env` di folder `backend/` (lihat contoh di `GEMINI_SETUP.md`
kalau ada, atau isi manual):

| Variabel | Keterangan |
|---|---|
| `DB_HOST` | Host database |
| `DB_PORT` | Port database (default `3306`, TiDB Serverless `4000`) |
| `DB_USER` | Username database |
| `DB_PASS` | Password database |
| `DB_NAME` | Nama database (`storeflow`) |
| `DB_SSL` | `true` kalau pakai TiDB Serverless / provider yang mewajibkan TLS |
| `JWT_SECRET` | String rahasia bebas untuk menandatangani token login |
| `JWT_EXPIRES_IN` | Masa berlaku token, contoh `8h` (opsional, default `8h`) |
| `PORT` | Port server backend, default `8080` |

> ⚠️ Jangan pernah commit file `.env` — sudah dikecualikan lewat `.gitignore`.

### 4. Jalankan

**Windows:** cukup jalankan `StoreFlow.bat` (otomatis menjalankan backend & frontend).

**Manual:**
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm start
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

## Struktur Project

```
backend/
  app.js              # entry point, setup Express + CORS
  config/database.js  # koneksi pool MySQL/TiDB
  controllers/         # logika bisnis tiap modul
  routes/               # definisi endpoint REST API
  middleware/           # autentikasi & role-based access
frontend/
  src/pages/            # halaman per modul (barang, penjualan, laporan, dst)
  src/components/       # komponen UI yang dipakai berulang
  src/context/           # state global (Auth, Pengaturan)
  src/services/api.js    # konfigurasi axios & base URL backend
database/
  schema.sql              # struktur tabel lengkap
  schema.demo.sql          # akun & data dummy untuk versi demo
  schema.demo.data7days.sql # data transaksi 7 hari terakhir (untuk dashboard)
```

## Catatan Keamanan

- Semua kredensial (database, JWT secret) dikonfigurasi lewat environment
  variable, tidak ada yang di-hardcode di source code.
- Versi demo menggunakan database yang **terpisah total** dari sistem
  production, dengan akun & data yang memang dirancang untuk publik.
- Password akun sistem di-hash menggunakan bcrypt.

## Lisensi

Belum ditentukan.
