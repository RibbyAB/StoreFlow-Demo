const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);


router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();


    const { supplier_id, items, catatan = '', status = 'lunas', jatuh_tempo = null, skip_stok = false } = req.body;

    if (!items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi.' });
    }
    if (items.some(i => !(Number(i.qty) > 0))) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Qty barang tidak valid.' });
    }

    const total = items.reduce((sum, i) => sum + (i.qty * i.harga_beli), 0);


    const totalDibayarAwal = status === 'lunas' ? total : 0;
    const dilunasiAtAwal   = status === 'lunas' ? new Date() : null;
    const [result] = await conn.query(
      'INSERT INTO pembelian (supplier_id, total, total_dibayar, catatan, status, jatuh_tempo, stok_ditambahkan, dilunasi_at, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [supplier_id || null, total, totalDibayarAwal, catatan, status, status === 'hutang' ? (jatuh_tempo || null) : null, skip_stok ? 0 : 1, dilunasiAtAwal, req.user.id]
    );

    const pembelianId = result.insertId;

    for (const item of items) {
      if (item.barang_id) {

        await conn.query(
          'INSERT INTO detail_pembelian (pembelian_id, barang_id, qty, harga_beli) VALUES (?, ?, ?, ?)',
          [pembelianId, item.barang_id, item.qty, item.harga_beli]
        );
        if (!skip_stok) {


          await conn.query('UPDATE barang SET stok = stok + ? WHERE id = ?',
            [item.qty, item.barang_id]);
        }
      } else {

        if (!item.nama_manual || !item.nama_manual.trim()) {
          throw new Error('Nama item manual harus diisi.');
        }
        await conn.query(
          'INSERT INTO detail_pembelian (pembelian_id, barang_id, nama_manual, satuan_manual, qty, harga_beli) VALUES (?, NULL, ?, ?, ?, ?)',
          [pembelianId, item.nama_manual.trim(), item.satuan_manual || 'pcs', item.qty, item.harga_beli]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Pembelian berhasil dicatat.', id: pembelianId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

router.get('/', async (req, res) => {
  const [rows] = await db.query(`
    SELECT pb.*, s.nama AS supplier
    FROM pembelian pb
    LEFT JOIN supplier s ON pb.supplier_id = s.id
    ORDER BY
      (pb.status = 'hutang' AND pb.jatuh_tempo IS NOT NULL) DESC,
      pb.jatuh_tempo ASC,
      pb.created_at DESC
    LIMIT 100
  `);
  res.json({ success: true, data: rows });
});

router.get('/:id/detail', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dp.*,
             COALESCE(b.nama, dp.nama_manual)     AS nama_barang,
             COALESCE(b.satuan, dp.satuan_manual) AS satuan,
             (dp.barang_id IS NULL)                AS is_manual
      FROM detail_pembelian dp
      LEFT JOIN barang b ON dp.barang_id = b.id
      WHERE dp.pembelian_id = ?
    `, [req.params.id]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/lunasi', async (req, res) => {
  try {
    const [cek] = await db.query('SELECT status FROM pembelian WHERE id = ?', [req.params.id]);
    if (cek.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    if (cek[0].status === 'dibatalkan') {
      return res.status(400).json({ success: false, message: 'Transaksi yang sudah dibatalkan tidak bisa dilunasi.' });
    }
    await db.query(
      'UPDATE pembelian SET status = "lunas", total_dibayar = total, dilunasi_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true, message: 'Pembelian telah dilunasi.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/:id/cicilan', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.nama AS dibuat_oleh_nama
      FROM cicilan_pembelian c
      LEFT JOIN users u ON c.dibuat_oleh = u.id
      WHERE c.pembelian_id = ?
      ORDER BY c.tanggal DESC, c.id DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/:id/cicil/:cicilanId', roleMiddleware('owner'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [cicilRows] = await conn.query(
      'SELECT jumlah FROM cicilan_pembelian WHERE id = ? AND pembelian_id = ?',
      [req.params.cicilanId, req.params.id]
    );
    if (cicilRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Catatan cicilan tidak ditemukan.' });
    }

    const [pbRows] = await conn.query('SELECT total, total_dibayar, status FROM pembelian WHERE id = ? FOR UPDATE', [req.params.id]);
    if (pbRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    const pb = pbRows[0];
    if (pb.status === 'dibatalkan') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah dibatalkan.' });
    }

    await conn.query('DELETE FROM cicilan_pembelian WHERE id = ?', [req.params.cicilanId]);

    const totalDibayarBaru = Math.max(0, Number(pb.total_dibayar) - Number(cicilRows[0].jumlah));
    await conn.query(
      'UPDATE pembelian SET total_dibayar = ?, status = "hutang", dilunasi_at = NULL WHERE id = ?',
      [totalDibayarBaru, req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Cicilan berhasil dihapus.', total_dibayar: totalDibayarBaru });
  } catch (err) {
    await conn.rollback();
    console.error('hapus cicilan pembelian error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus cicilan.' });
  } finally {
    conn.release();
  }
});


router.post('/:id/cicil', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { jumlah, tanggal, catatan } = req.body;
    const jml = Number(jumlah);

    if (!jml || jml <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah cicilan harus lebih dari 0.' });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT total, total_dibayar, status FROM pembelian WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    const pb = rows[0];
    if (pb.status !== 'hutang') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini bukan hutang aktif.' });
    }

    const sisaSaatIni = Number(pb.total) - Number(pb.total_dibayar);
    if (jml > sisaSaatIni + 0.5) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Jumlah cicilan melebihi sisa hutang (${sisaSaatIni}).` });
    }

    await conn.query(
      'INSERT INTO cicilan_pembelian (pembelian_id, jumlah, tanggal, catatan, dibuat_oleh) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, jml, tanggal || new Date().toISOString().slice(0, 10), catatan || null, req.user.id]
    );

    const totalDibayarBaru = Number(pb.total_dibayar) + jml;
    const lunas = totalDibayarBaru >= Number(pb.total) - 0.5;

    await conn.query(
      'UPDATE pembelian SET total_dibayar = ?, status = ?, dilunasi_at = ? WHERE id = ?',
      [totalDibayarBaru, lunas ? 'lunas' : 'hutang', lunas ? new Date() : null, req.params.id]
    );

    await conn.commit();
    res.json({
      success: true,
      message: lunas ? 'Cicilan tercatat, hutang lunas!' : 'Cicilan berhasil dicatat.',
      lunas,
      sisa: Math.max(0, Number(pb.total) - totalDibayarBaru)
    });
  } catch (err) {
    await conn.rollback();
    console.error('cicil pembelian error:', err);
    res.status(500).json({ success: false, message: 'Gagal mencatat cicilan.' });
  } finally {
    conn.release();
  }
});


router.put('/lunasi-batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Pilih minimal 1 transaksi untuk dilunasi.' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(
      `UPDATE pembelian SET status = 'lunas', total_dibayar = total, dilunasi_at = NOW() WHERE id IN (${placeholders}) AND status = 'hutang'`,
      ids
    );
    res.json({ success: true, message: `${result.affectedRows} transaksi berhasil dilunasi.`, total_dilunasi: result.affectedRows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.put('/:id/batalkan', roleMiddleware('owner'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { alasan = '' } = req.body;

    const [cek] = await conn.query(
      'SELECT id, status, stok_ditambahkan FROM pembelian WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (cek.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Pembelian tidak ditemukan.' });
    }
    if (cek[0].status === 'dibatalkan') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Pembelian ini sudah dibatalkan sebelumnya.' });
    }


    if (!cek[0].stok_ditambahkan) {
      await conn.query(
        `UPDATE pembelian
         SET status = 'dibatalkan', dibatalkan_at = NOW(), dibatalkan_oleh = ?, alasan_batal = ?
         WHERE id = ?`,
        [req.user.id, alasan, req.params.id]
      );
      await conn.commit();
      return res.json({
        success: true,
        message: 'Pembelian berhasil dibatalkan. (Stok tidak diubah, karena nota ini dibuat tanpa menambah stok.)',
        status: 'dibatalkan'
      });
    }

    const [items] = await conn.query(
      `SELECT dp.barang_id, dp.qty, b.nama, b.stok
       FROM detail_pembelian dp
       JOIN barang b ON dp.barang_id = b.id
       WHERE dp.pembelian_id = ?
       FOR UPDATE`,
      [req.params.id]
    );


    for (const item of items) {
      if (Number(item.stok) < Number(item.qty)) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Tidak bisa dibatalkan: stok "${item.nama}" sudah berkurang (terjual) di bawah jumlah pembelian ini.`
        });
      }
    }

    for (const item of items) {
      await conn.query('UPDATE barang SET stok = stok - ? WHERE id = ?', [item.qty, item.barang_id]);
    }

    await conn.query(
      `UPDATE pembelian
       SET status = 'dibatalkan', dibatalkan_at = NOW(), dibatalkan_oleh = ?, alasan_batal = ?
       WHERE id = ?`,
      [req.user.id, alasan, req.params.id]
    );

    await conn.commit();
    res.json({
      success: true,
      message: 'Pembelian berhasil dibatalkan. Stok barang telah dikurangi kembali.',
      status: 'dibatalkan'
    });
  } catch (err) {
    await conn.rollback();
    console.error('batalkanPembelian error:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal membatalkan pembelian.' });
  } finally {
    conn.release();
  }
});


router.delete('/:id', roleMiddleware('owner'), async (req, res) => {
  try {
    const [cek] = await db.query('SELECT id, status FROM pembelian WHERE id = ?', [req.params.id]);
    if (cek.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    if (cek[0].status !== 'dibatalkan') {
      return res.status(400).json({ success: false, message: 'Hanya transaksi berstatus "dibatalkan" yang bisa dihapus permanen.' });
    }
    await db.query('DELETE FROM pembelian WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Transaksi berhasil dihapus permanen.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;