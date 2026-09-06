const db = require('../config/database');


const createPenjualan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { nama_pelanggan, metode_bayar, items, diskon = 0, catatan = '', tanggal } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi.' });
    }


    const metodeFinal = metode_bayar || 'tunai';
    const statusFinal = metodeFinal === 'hutang' ? 'belum_lunas' : 'lunas';

    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.harga_jual), 0);
    const total    = subtotal - Number(diskon);


    const totalDibayarAwal = statusFinal === 'lunas' ? total : 0;


    let createdAtFinal = null;
    if (tanggal) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ success: false, message: 'Cuma owner yang boleh mengatur tanggal transaksi manual.' });
      }
      const tglInput = new Date(tanggal);
      if (isNaN(tglInput.getTime())) {
        return res.status(400).json({ success: false, message: 'Format tanggal tidak valid.' });
      }
      if (tglInput.getTime() > Date.now() + 60 * 60 * 1000) {
        return res.status(400).json({ success: false, message: 'Tanggal transaksi tidak boleh di masa depan.' });
      }
      createdAtFinal = tglInput;
    }

    const [result] = await conn.query(
      `INSERT INTO penjualan
        (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, catatan, status${createdAtFinal ? ', created_at' : ''})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${createdAtFinal ? ', ?' : ''})`,
      createdAtFinal
        ? [nama_pelanggan || null, req.user.id, metodeFinal, subtotal, Number(diskon), total, totalDibayarAwal, catatan, statusFinal, createdAtFinal]
        : [nama_pelanggan || null, req.user.id, metodeFinal, subtotal, Number(diskon), total, totalDibayarAwal, catatan, statusFinal]
    );
    const penjualanId = result.insertId;

    for (const item of items) {
      if (item.qty <= 0) throw new Error('Qty barang tidak valid.');

      const [barang] = await conn.query(
        'SELECT stok, nama, harga_beli FROM barang WHERE id = ? FOR UPDATE',
        [item.barang_id]
      );
      if (barang.length === 0) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan.`);
      if (barang[0].stok < item.qty) throw new Error(`Stok ${barang[0].nama} tidak cukup. Tersedia: ${barang[0].stok}`);


      await conn.query(
        'INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES (?, ?, ?, ?, ?)',
        [penjualanId, item.barang_id, item.qty, item.harga_jual, barang[0].harga_beli]
      );
      await conn.query('UPDATE barang SET stok = stok - ? WHERE id = ?', [item.qty, item.barang_id]);
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil.',
      penjualan_id: penjualanId,
      total,
      status: statusFinal
    });

  } catch (err) {
    await conn.rollback();
    console.error('createPenjualan error:', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal menyimpan transaksi.' });
  } finally {
    conn.release();
  }
};


const editPenjualan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { nama_pelanggan, metode_bayar, items, diskon = 0, catatan = '' } = req.body;

    if (!items || items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Minimal 1 item harus diisi.' });
    }

    const [rows] = await conn.query('SELECT * FROM penjualan WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    const lama = rows[0];

    if (lama.status === 'dibatalkan') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi yang sudah dibatalkan tidak bisa diedit.' });
    }

    const [cekCicilan] = await conn.query('SELECT COUNT(*) AS jml FROM cicilan_penjualan WHERE penjualan_id = ?', [req.params.id]);
    if (cekCicilan[0].jml > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah pernah dicicil, tidak bisa diedit. Hapus dulu semua riwayat cicilannya kalau tetap mau edit.' });
    }


    const [itemLama] = await conn.query('SELECT barang_id, qty FROM detail_penjualan WHERE penjualan_id = ?', [req.params.id]);
    for (const it of itemLama) {
      await conn.query('UPDATE barang SET stok = stok + ? WHERE id = ?', [it.qty, it.barang_id]);
    }
    await conn.query('DELETE FROM detail_penjualan WHERE penjualan_id = ?', [req.params.id]);


    for (const item of items) {
      if (item.qty <= 0) throw new Error('Qty barang tidak valid.');

      const [barang] = await conn.query('SELECT stok, nama, harga_beli FROM barang WHERE id = ? FOR UPDATE', [item.barang_id]);
      if (barang.length === 0) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan.`);
      if (barang[0].stok < item.qty) throw new Error(`Stok ${barang[0].nama} tidak cukup. Tersedia: ${barang[0].stok}`);

      await conn.query(
        'INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, item.barang_id, item.qty, item.harga_jual, barang[0].harga_beli]
      );
      await conn.query('UPDATE barang SET stok = stok - ? WHERE id = ?', [item.qty, item.barang_id]);
    }


    const subtotalBaru = items.reduce((sum, item) => sum + (item.qty * item.harga_jual), 0);
    const totalBaru    = subtotalBaru - Number(diskon);
    const metodeFinal  = metode_bayar || lama.metode_bayar;
    const statusFinal  = metodeFinal === 'hutang' ? 'belum_lunas' : 'lunas';


    const totalDibayarBaru = statusFinal === 'lunas' ? totalBaru : 0;

    await conn.query(
      `UPDATE penjualan SET nama_pelanggan = ?, metode_bayar = ?, subtotal = ?, diskon = ?, total = ?, total_dibayar = ?, catatan = ?, status = ? WHERE id = ?`,
      [nama_pelanggan || null, metodeFinal, subtotalBaru, Number(diskon), totalBaru, totalDibayarBaru, catatan, statusFinal, req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Nota berhasil diperbarui.', total: totalBaru, status: statusFinal });
  } catch (err) {
    await conn.rollback();
    console.error('editPenjualan error:', err);
    res.status(400).json({ success: false, message: err.message || 'Gagal mengedit transaksi.' });
  } finally {
    conn.release();
  }
};


const konfirmasiPelunasan = async (req, res) => {
  try {
    const [cek] = await db.query(
      'SELECT id, status, total FROM penjualan WHERE id = ?',
      [req.params.id]
    );
    if (cek.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    if (cek[0].status === 'lunas') {
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah lunas.' });
    }
    if (cek[0].status === 'dibatalkan') {
      return res.status(400).json({ success: false, message: 'Transaksi yang sudah dibatalkan tidak bisa dilunasi.' });
    }


    const { metode_bayar } = req.body;
    const metodeFinal = metode_bayar || 'tunai';


    await db.query(
      "UPDATE penjualan SET status = 'lunas', metode_bayar = ?, total_dibayar = total, tgl_pelunasan = NOW() WHERE id = ?",
      [metodeFinal, req.params.id]
    );

    res.json({
      success: true,
      message: 'Pelunasan berhasil dikonfirmasi.',
      metode_bayar: metodeFinal,
      status: 'lunas'
    });
  } catch (err) {
    console.error('konfirmasiPelunasan error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses pelunasan.' });
  }
};


const getCicilanPenjualan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.nama AS dibuat_oleh_nama
      FROM cicilan_penjualan c
      LEFT JOIN users u ON c.dibuat_oleh = u.id
      WHERE c.penjualan_id = ?
      ORDER BY c.tanggal DESC, c.id DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


const cicilPenjualan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { jumlah, metode_bayar, tanggal, catatan } = req.body;
    const jml = Number(jumlah);

    if (!jml || jml <= 0) {
      return res.status(400).json({ success: false, message: 'Jumlah cicilan harus lebih dari 0.' });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT total, total_dibayar, status FROM penjualan WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    const p = rows[0];
    if (p.status !== 'belum_lunas') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini bukan piutang aktif.' });
    }

    const sisaSaatIni = Number(p.total) - Number(p.total_dibayar);
    if (jml > sisaSaatIni + 0.5) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Jumlah cicilan melebihi sisa piutang (${sisaSaatIni}).` });
    }

    await conn.query(
      'INSERT INTO cicilan_penjualan (penjualan_id, jumlah, metode_bayar, tanggal, catatan, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, jml, metode_bayar || 'tunai', tanggal || new Date().toISOString().slice(0, 10), catatan || null, req.user.id]
    );

    const totalDibayarBaru = Number(p.total_dibayar) + jml;
    const lunas = totalDibayarBaru >= Number(p.total) - 0.5;

    await conn.query(
      lunas
        ? 'UPDATE penjualan SET total_dibayar = ?, status = "lunas", tgl_pelunasan = NOW() WHERE id = ?'
        : 'UPDATE penjualan SET total_dibayar = ? WHERE id = ?',
      [totalDibayarBaru, req.params.id]
    );

    await conn.commit();
    res.json({
      success: true,
      message: lunas ? 'Cicilan tercatat, piutang lunas!' : 'Cicilan berhasil dicatat.',
      lunas,
      sisa: Math.max(0, Number(p.total) - totalDibayarBaru)
    });
  } catch (err) {
    await conn.rollback();
    console.error('cicil penjualan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mencatat cicilan.' });
  } finally {
    conn.release();
  }
};


const hapusCicilanPenjualan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [cicilRows] = await conn.query(
      'SELECT jumlah FROM cicilan_penjualan WHERE id = ? AND penjualan_id = ?',
      [req.params.cicilanId, req.params.id]
    );
    if (cicilRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Catatan cicilan tidak ditemukan.' });
    }

    const [pRows] = await conn.query('SELECT total, total_dibayar, status FROM penjualan WHERE id = ? FOR UPDATE', [req.params.id]);
    if (pRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    const p = pRows[0];
    if (p.status === 'dibatalkan') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah dibatalkan.' });
    }

    await conn.query('DELETE FROM cicilan_penjualan WHERE id = ?', [req.params.cicilanId]);

    const totalDibayarBaru = Math.max(0, Number(p.total_dibayar) - Number(cicilRows[0].jumlah));


    const masihLunas = totalDibayarBaru >= Number(p.total) - 0.5;
    await conn.query(
      masihLunas
        ? 'UPDATE penjualan SET total_dibayar = ? WHERE id = ?'
        : 'UPDATE penjualan SET total_dibayar = ?, status = "belum_lunas", tgl_pelunasan = NULL WHERE id = ?',
      [totalDibayarBaru, req.params.id]
    );

    await conn.commit();
    res.json({ success: true, message: 'Cicilan berhasil dihapus.', total_dibayar: totalDibayarBaru });
  } catch (err) {
    await conn.rollback();
    console.error('hapus cicilan penjualan error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus cicilan.' });
  } finally {
    conn.release();
  }
};


const editNamaPelanggan = async (req, res) => {
  try {
    const { nama_pelanggan } = req.body;
    const namaFinal = (nama_pelanggan && nama_pelanggan.trim()) || 'Pelanggan Umum';

    const [result] = await db.query(
      'UPDATE penjualan SET nama_pelanggan = ? WHERE id = ?',
      [namaFinal, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Nama pelanggan berhasil diperbarui.', nama_pelanggan: namaFinal });
  } catch (err) {
    console.error('editNamaPelanggan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengubah nama pelanggan.' });
  }
};


const batalkanPenjualan = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { alasan = '' } = req.body;

    const [cek] = await conn.query(
      'SELECT id, status FROM penjualan WHERE id = ? FOR UPDATE',
      [req.params.id]
    );
    if (cek.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    if (cek[0].status === 'dibatalkan') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Transaksi ini sudah dibatalkan sebelumnya.' });
    }


    const [items] = await conn.query(
      'SELECT barang_id, qty FROM detail_penjualan WHERE penjualan_id = ?',
      [req.params.id]
    );
    for (const item of items) {
      await conn.query('UPDATE barang SET stok = stok + ? WHERE id = ?', [item.qty, item.barang_id]);
    }

    await conn.query(
      `UPDATE penjualan
       SET status = 'dibatalkan', dibatalkan_at = NOW(), dibatalkan_oleh = ?, alasan_batal = ?
       WHERE id = ?`,
      [req.user.id, alasan, req.params.id]
    );

    await conn.commit();
    res.json({
      success: true,
      message: 'Transaksi berhasil dibatalkan. Stok barang telah dikembalikan.',
      status: 'dibatalkan'
    });
  } catch (err) {
    await conn.rollback();
    console.error('batalkanPenjualan error:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal membatalkan transaksi.' });
  } finally {
    conn.release();
  }
};


const getAllPenjualan = async (req, res) => {
  try {
    const { tanggal_mulai, tanggal_akhir, limit = 100, status } = req.query;

    let query = `
      SELECT p.*, u.nama AS kasir,
             COALESCE(p.nama_pelanggan, 'Umum') AS pelanggan
      FROM penjualan p
      LEFT JOIN users u ON p.kasir_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tanggal_mulai) {
      query += " AND DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) >= ?";
      params.push(tanggal_mulai);
    }
    if (tanggal_akhir) {
      query += " AND DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) <= ?";
      params.push(tanggal_akhir);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAllPenjualan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data penjualan.' });
  }
};


const getHutangPelanggan = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.nama AS kasir,
             COALESCE(p.nama_pelanggan, 'Umum') AS pelanggan
      FROM penjualan p
      LEFT JOIN users u ON p.kasir_id = u.id
      WHERE p.status = 'belum_lunas'
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data hutang.' });
  }
};


const getPenjualanById = async (req, res) => {
  try {
    const [header] = await db.query(
      `SELECT p.*, u.nama AS kasir,
              COALESCE(p.nama_pelanggan, 'Umum') AS pelanggan
       FROM penjualan p
       LEFT JOIN users u ON p.kasir_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (header.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }

    const [items] = await db.query(
      `SELECT dp.*, b.nama AS nama_barang, b.satuan
       FROM detail_penjualan dp
       JOIN barang b ON dp.barang_id = b.id
       WHERE dp.penjualan_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...header[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil detail transaksi.' });
  }
};


const hapusPenjualan = async (req, res) => {
  try {
    const [cek] = await db.query('SELECT id, status FROM penjualan WHERE id = ?', [req.params.id]);
    if (cek.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }
    if (cek[0].status !== 'dibatalkan') {
      return res.status(400).json({ success: false, message: 'Hanya transaksi berstatus "dibatalkan" yang bisa dihapus permanen.' });
    }
    await db.query('DELETE FROM penjualan WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Transaksi berhasil dihapus permanen.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Gagal menghapus transaksi.' });
  }
};

module.exports = {
  createPenjualan,
  editPenjualan,
  editNamaPelanggan,
  getAllPenjualan,
  getPenjualanById,
  konfirmasiPelunasan,
  cicilPenjualan,
  getCicilanPenjualan,
  hapusCicilanPenjualan,
  batalkanPenjualan,
  hapusPenjualan,
  getHutangPelanggan
};