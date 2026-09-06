const mysql = require('mysql2/promise');

const useSSL = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'storeflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  timezone: 'Z',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(useSSL && {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  })
});

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
