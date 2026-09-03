const db = require('../config/database');

// GET /api/pengaturan -- siapapun yang login boleh baca (dibutuhin buat render nota/sidebar)
const getPengaturan = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengaturan WHERE id = 1');
    if (rows.length === 0) {
      // Jaga-jaga kalau migrasinya belum sempet ngisi baris default
      return res.json({
        success: true,
        data: {
          nama_toko: 'Nama Toko', alamat: null, telepon: null,
          footer_nota1: 'Terima kasih atas kunjungan Anda',
          footer_nota2: '',
        }
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan.' });
  }
};

// PUT /api/pengaturan -- cuma owner yang boleh ubah
const updatePengaturan = async (req, res) => {
  try {
    const { nama_toko, alamat, telepon, footer_nota1, footer_nota2 } = req.body;

    if (!nama_toko || !nama_toko.trim()) {
      return res.status(400).json({ success: false, message: 'Nama toko wajib diisi.' });
    }

    await db.query(`
      INSERT INTO pengaturan (id, nama_toko, alamat, telepon, footer_nota1, footer_nota2)
      VALUES (1, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nama_toko = VALUES(nama_toko),
        alamat = VALUES(alamat),
        telepon = VALUES(telepon),
        footer_nota1 = VALUES(footer_nota1),
        footer_nota2 = VALUES(footer_nota2)
    `, [nama_toko.trim(), alamat || null, telepon || null, footer_nota1 || '', footer_nota2 || '']);

    const [rows] = await db.query('SELECT * FROM pengaturan WHERE id = 1');
    res.json({ success: true, message: 'Pengaturan berhasil disimpan.', data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan.' });
  }
};

module.exports = { getPengaturan, updatePengaturan };