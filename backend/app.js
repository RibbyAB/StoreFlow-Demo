require('dotenv').config();
const express = require('express');

const app = express();

const cors = require('cors');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }

    // Izinin juga akses dari jaringan lokal (misal testing dari HP yang konek ke WiFi
    // yang sama kayak komputer development, contoh: http://192.168.1.5:3000).
    if (/^https?:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[0-1]))\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Domain Vercel demo -- terima "store-flow" atau "storeflow"
    // (regex-nya fleksibel, gak kepatok harus ada tanda strip atau enggak).
    if (
      /store-?flow/.test(origin.toLowerCase()) &&
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },

  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === ROUTES ===
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/barang',     require('./routes/barangRoutes'));
app.use('/api/supplier',   require('./routes/supplierRoutes'));
app.use('/api/pelanggan',  require('./routes/pelangganRoutes'));
app.use('/api/penjualan',  require('./routes/penjualanRoutes'));
app.use('/api/pembelian',  require('./routes/pembelianRoutes'));
app.use('/api/laporan',    require('./routes/laporanRoutes'));
app.use('/api/dashboard',  require('./routes/dashboardRoutes'));
app.use('/api/pelanggan-ledger', require('./routes/pelangganLedgerRoutes'));
app.use('/api/operasional', require('./routes/operasionalRoutes'));
app.use('/api/pengaturan', require('./routes/pengaturanRoutes'));

// === HEALTH CHECK ===
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server berjalan dengan baik', timestamp: new Date() });
});

// === ERROR HANDLER GLOBAL ===
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server'
  });
});

// === START SERVER (hanya jalan kalau file ini dieksekusi langsung, bukan saat di-import Vercel) ===
// '0.0.0.0' supaya bisa diakses dari perangkat lain di jaringan LAN yang sama
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    console.log(`🌐 LAN: http://<IP-komputer-Anda>:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;