
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM supplier ORDER BY nama ASC');
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  const { nama, telepon, alamat, keterangan } = req.body;
  const [result] = await db.query(
    'INSERT INTO supplier (nama, telepon, alamat, keterangan) VALUES (?, ?, ?, ?)',
    [nama, telepon || null, alamat || null, keterangan || null]
  );
  res.status(201).json({ success: true, message: 'Supplier berhasil ditambahkan.', id: result.insertId });
});

router.put('/:id', async (req, res) => {
  const { nama, telepon, alamat, keterangan } = req.body;
  await db.query(
    'UPDATE supplier SET nama=?, telepon=?, alamat=?, keterangan=? WHERE id=?',
    [nama, telepon, alamat, keterangan, req.params.id]
  );
  res.json({ success: true, message: 'Supplier berhasil diupdate.' });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM supplier WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: 'Supplier berhasil dihapus.' });
});


router.put('/:id/barang', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const supplierId = req.params.id;
    const { barang_ids = [] } = req.body;

    await conn.beginTransaction();
    await conn.query('DELETE FROM barang_supplier WHERE supplier_id = ?', [supplierId]);
    for (const bid of barang_ids) {
      await conn.query(
        'INSERT IGNORE INTO barang_supplier (barang_id, supplier_id) VALUES (?, ?)',
        [bid, supplierId]
      );
    }
    await conn.commit();
    res.json({ success: true, message: `Berhasil menyimpan ${barang_ids.length} barang untuk supplier ini.` });
  } catch (err) {
    await conn.rollback();
    console.error('assign barang ke supplier error:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan relasi barang-supplier.' });
  } finally {
    conn.release();
  }
});

module.exports = router;