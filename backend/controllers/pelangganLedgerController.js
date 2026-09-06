const db = require('../config/database');


const getDaftarPelanggan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        LOWER(TRIM(nama_pelanggan)) AS kunci,
        -- Ambil salah satu penulisan nama asli (yang paling sering dipakai) untuk ditampilkan
        SUBSTRING_INDEX(
          GROUP_CONCAT(TRIM(nama_pelanggan) ORDER BY created_at DESC SEPARATOR '|'),
          '|', 1
        ) AS nama_tampil,
        COUNT(*) AS total_transaksi,
        COALESCE(SUM(total), 0) AS total_belanja,
        COALESCE(SUM(CASE WHEN status = 'lunas' THEN total ELSE 0 END), 0) AS total_lunas,
        COALESCE(SUM(CASE WHEN status = 'belum_lunas' THEN total - total_dibayar ELSE 0 END), 0) AS total_hutang,
        MAX(created_at) AS transaksi_terakhir
      FROM penjualan
      WHERE nama_pelanggan IS NOT NULL
        AND TRIM(nama_pelanggan) != ''
        AND LOWER(TRIM(nama_pelanggan)) NOT IN ('umum', 'pelanggan umum')
        AND status != 'dibatalkan'
      GROUP BY LOWER(TRIM(nama_pelanggan))
      ORDER BY total_hutang DESC, transaksi_terakhir DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getDaftarPelanggan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar pelanggan.' });
  }
};


const getDetailPelanggan = async (req, res) => {
  try {
    const nama = (req.params.nama || '').trim();
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama pelanggan wajib diisi.' });
    }

    const [transaksi] = await db.query(`
      SELECT p.id, p.total, p.total_dibayar, p.subtotal, p.diskon, p.metode_bayar, p.status,
             p.created_at, p.tgl_pelunasan, p.nama_pelanggan,
             u.nama AS kasir,
             (
               SELECT COUNT(*) FROM penjualan p2
               WHERE DATE(CONVERT_TZ(p2.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00'))
                 AND p2.status != 'dibatalkan'
                 AND p2.created_at <= p.created_at
             ) AS nomor_transaksi
      FROM penjualan p
      LEFT JOIN users u ON p.kasir_id = u.id
      WHERE LOWER(TRIM(p.nama_pelanggan)) = LOWER(?)
        AND p.status != 'dibatalkan'
      ORDER BY p.created_at ASC
    `, [nama]);

    if (transaksi.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada transaksi untuk pelanggan ini.' });
    }


    let saldoBerjalan = 0;
    const transaksiDenganSaldo = transaksi.map(t => {
      if (t.status === 'belum_lunas') {
        saldoBerjalan += Number(t.total) - Number(t.total_dibayar || 0);
      }
      return { ...t, saldo_berjalan: saldoBerjalan };
    }).reverse();

    const totalBelanja = transaksi.reduce((s, t) => s + Number(t.total), 0);
    const totalHutang   = transaksi
      .filter(t => t.status === 'belum_lunas')
      .reduce((s, t) => s + (Number(t.total) - Number(t.total_dibayar || 0)), 0);
    const totalLunas    = totalBelanja - totalHutang;

    res.json({
      success: true,
      nama_pelanggan: transaksi[transaksi.length - 1].nama_pelanggan,
      ringkasan: {
        total_transaksi: transaksi.length,
        total_belanja:   totalBelanja,
        total_lunas:     totalLunas,
        total_hutang:    totalHutang,
      },
      transaksi: transaksiDenganSaldo,
    });
  } catch (err) {
    console.error('getDetailPelanggan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil detail pelanggan.' });
  }
};

module.exports = { getDaftarPelanggan, getDetailPelanggan };