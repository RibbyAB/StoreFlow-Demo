const db = require('../config/database');

const KATEGORI_VALID = ['gaji', 'listrik', 'pajak', 'makan', 'lain'];
const KATEGORI_LABEL = { gaji: 'Gaji Karyawan', listrik: 'Listrik', pajak: 'Pajak', makan: 'Makan', lain: 'Biaya Lain-lain' };

const getOperasional = async (req, res) => {
  try {
    const bulan = req.query.bulan || (() => {
      const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
      return wib.toISOString().slice(0, 7);
    })();
    const [tahun, bln] = bulan.split('-');

    const [rows] = await db.query(`
      SELECT o.*, u.nama AS dibuat_oleh_nama
      FROM operasional o
      LEFT JOIN users u ON o.dibuat_oleh = u.id
      WHERE YEAR(o.tanggal) = ? AND MONTH(o.tanggal) = ?
      ORDER BY o.tanggal DESC, o.id DESC
    `, [tahun, bln]);

    const total = rows.reduce((s, r) => s + Number(r.jumlah), 0);
    res.json({ success: true, data: rows, total_operasional: total, periode: bulan });
  } catch (err) {
    console.error('getOperasional error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data operasional.' });
  }
};

const createOperasional = async (req, res) => {
  try {
    const { tanggal, kategori, keterangan, jumlah } = req.body;
    if (!tanggal || !jumlah || Number(jumlah) <= 0) {
      return res.status(400).json({ success: false, message: 'Tanggal dan jumlah wajib diisi dengan benar.' });
    }
    if (!KATEGORI_VALID.includes(kategori)) {
      return res.status(400).json({ success: false, message: 'Kategori tidak valid.' });
    }
    const [result] = await db.query(
      'INSERT INTO operasional (tanggal, kategori, keterangan, jumlah, dibuat_oleh) VALUES (?, ?, ?, ?, ?)',
      [tanggal, kategori, keterangan || null, jumlah, req.user.id]
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Operasional berhasil dicatat.' });
  } catch (err) {
    console.error('createOperasional error:', err);
    res.status(500).json({ success: false, message: 'Gagal mencatat operasional.' });
  }
};

const hapusOperasional = async (req, res) => {
  try {
    await db.query('DELETE FROM operasional WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Operasional berhasil dihapus.' });
  } catch (err) {
    console.error('hapusOperasional error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus operasional.' });
  }
};

module.exports = { getOperasional, createOperasional, hapusOperasional, KATEGORI_VALID, KATEGORI_LABEL };