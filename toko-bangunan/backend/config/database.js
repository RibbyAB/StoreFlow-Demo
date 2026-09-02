const mysql = require('mysql2/promise');

// TiDB Cloud (Serverless) mewajibkan koneksi TLS.
// Set DB_SSL=true di environment variable saat pindah ke TiDB.
const useSSL = process.env.DB_SSL === 'true';

// Buat pool koneksi (lebih efisien dari single connection)
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'storeflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // PENTING: server DB (Railway/TiDB) menyimpan created_at dalam UTC (lihat komentar
  // di laporanController.js). Set 'Z' (UTC) di sini, BUKAN '+07:00' — kalau di-set '+07:00',
  // mysql2 akan menganggap nilai yang sudah UTC itu sebagai WIB dan menggesernya lagi,
  // sehingga jam yang tampil di frontend (mis. Detail Nota) jadi salah/meleset.
  // Konversi ke WIB dilakukan secara eksplisit: di SQL pakai CONVERT_TZ(...,'+00:00','+07:00'),
  // dan di frontend pakai toLocaleString(..., { timeZone: 'Asia/Jakarta' }).
  timezone: 'Z',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 detik, cegah koneksi kena drop saat idle lama (misal 10+ menit tanpa aktivitas)
  ...(useSSL && {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  })
});

// Test koneksi saat server start
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database MySQL terhubung');
    conn.release();
  } catch (err) {
    console.error('❌ Gagal koneksi ke database:', err.message);
    console.error('   Pastikan XAMPP/MySQL sudah berjalan dan nama database benar.');
  }
})();

module.exports = pool;