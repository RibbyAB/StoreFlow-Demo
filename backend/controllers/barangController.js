const db = require('../config/database');

const getAllBarang = async (req, res) => {
  try {
    const { search, search_by, kategori, stok_min, supplier_id } = req.query;

    let query = `
      SELECT b.*
      FROM barang b
      ${supplier_id ? 'JOIN barang_supplier bs ON b.id = bs.barang_id AND bs.supplier_id = ?' : ''}
      WHERE 1=1
    `;
    const params = [];
    if (supplier_id) params.push(Number(supplier_id));

    if (search) {
      const kataKata = search.trim().split(/\s+/).filter(Boolean);

      if (search_by === 'kode') {

        kataKata.forEach(kata => {
          query += ' AND b.kode_barang LIKE ?';
          params.push(`${kata}%`);
        });
      } else {

        const kolomMap = {
          nama:     ['b.nama'],
          kategori: ['b.kategori'],
        };
        const kolom = kolomMap[search_by] || ['b.nama', 'b.kode_barang', 'b.kategori'];
        kataKata.forEach(kata => {
          query += ` AND (${kolom.map(k => `${k} LIKE ?`).join(' OR ')})`;
          kolom.forEach(() => params.push(`%${kata}%`));
        });
      }
    }
    if (kategori) {
      query += ' AND b.kategori = ?';
      params.push(kategori);
    }
    if (stok_min !== undefined) {
      query += ' AND b.stok <= ?';
      params.push(Number(stok_min));
    }

    query += ' ORDER BY b.nama ASC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows, total: rows.length });

  } catch (err) {
    console.error('getAllBarang error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang.' });
  }
};

const getBarangById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM barang WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });

    const [suppliers] = await db.query(
      `SELECT s.id, s.nama FROM supplier s
       JOIN barang_supplier bs ON s.id = bs.supplier_id
       WHERE bs.barang_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], suppliers } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang.' });
  }
};

const createBarang = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { kode_barang, nama, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum, supplier_ids = [] } = req.body;

    if (!nama || !nama.trim()) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Nama barang wajib diisi.' });
    }

    if (kode_barang) {
      const [dup] = await conn.query('SELECT id FROM barang WHERE kode_barang = ?', [kode_barang]);
      if (dup.length > 0) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'Kode barang sudah digunakan.' });
      }
    }

    const [result] = await conn.query(
      `INSERT INTO barang (kode_barang, nama, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [kode_barang || null, nama, kategori || null, satuan || 'pcs',
       harga_beli || 0, harga_jual || 0, stok || 0, stok_minimum || 0]
    );

    const barangId = result.insertId;

    for (const sid of supplier_ids) {
      await conn.query(
        'INSERT IGNORE INTO barang_supplier (barang_id, supplier_id) VALUES (?, ?)',
        [barangId, sid]
      );
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Barang berhasil ditambahkan.', id: barangId });

  } catch (err) {
    await conn.rollback();
    console.error('createBarang error:', err);
    res.status(500).json({ success: false, message: 'Gagal menambahkan barang.' });
  } finally {
    conn.release();
  }
};

const updateBarang = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { kode_barang, nama, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum, supplier_ids = [] } = req.body;
    const id = req.params.id;

    if (kode_barang) {
      const [existing] = await conn.query(
        'SELECT id FROM barang WHERE kode_barang = ? AND id != ?', [kode_barang, id]
      );
      if (existing.length > 0) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'Kode barang sudah digunakan oleh item lain.' });
      }
    }

    const [result] = await conn.query(
      `UPDATE barang SET kode_barang=?, nama=?, kategori=?, satuan=?, harga_beli=?, harga_jual=?, stok=?, stok_minimum=?
       WHERE id=?`,
      [kode_barang || null, nama, kategori || null, satuan || 'pcs',
       harga_beli || 0, harga_jual || 0, stok || 0, stok_minimum || 0, id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    }

    await conn.query('DELETE FROM barang_supplier WHERE barang_id = ?', [id]);
    for (const sid of supplier_ids) {
      await conn.query(
        'INSERT IGNORE INTO barang_supplier (barang_id, supplier_id) VALUES (?, ?)',
        [id, sid]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Barang berhasil diupdate.' });

  } catch (err) {
    await conn.rollback();
    console.error('updateBarang error:', err);
    res.status(500).json({ success: false, message: err.sqlMessage || 'Gagal mengupdate barang.' });
  } finally {
    conn.release();
  }
};

const deleteBarang = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM barang WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    res.json({ success: true, message: 'Barang berhasil dihapus.' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ success: false, message: 'Barang tidak bisa dihapus karena sudah ada di riwayat transaksi.' });
    }
    res.status(500).json({ success: false, message: 'Gagal menghapus barang.' });
  }
};

const getBarangSuppliers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.nama FROM supplier s
       JOIN barang_supplier bs ON s.id = bs.supplier_id
       WHERE bs.barang_id = ?
       ORDER BY s.nama ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data.' });
  }
};

const getTrenBulanan = async (req, res) => {
  try {
    const barangId = req.params.id;

    const [barangRows] = await db.query('SELECT id, nama, harga_beli AS harga_beli_sekarang FROM barang WHERE id = ?', [barangId]);
    if (barangRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barang tidak ditemukan.' });
    }

    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const bulanList = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(wib.getFullYear(), wib.getMonth() - i, 1);
      bulanList.push({ tahun: d.getFullYear(), bulan: d.getMonth() + 1, label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) });
    }

    const hasil = [];
    for (const b of bulanList) {

      const [beli] = await db.query(`
        SELECT COALESCE(AVG(dp.harga_beli), 0) AS rata_harga_beli, COALESCE(SUM(dp.qty), 0) AS total_qty_beli
        FROM detail_pembelian dp
        JOIN pembelian pb ON dp.pembelian_id = pb.id
        WHERE dp.barang_id = ? AND pb.status != 'dibatalkan'
          AND YEAR(CONVERT_TZ(pb.created_at, '+00:00', '+07:00')) = ?
          AND MONTH(CONVERT_TZ(pb.created_at, '+00:00', '+07:00')) = ?
      `, [barangId, b.tahun, b.bulan]);

      const [jual] = await db.query(`
        SELECT
          COALESCE(AVG(dj.harga_jual), 0) AS rata_harga_jual,
          COALESCE(SUM(dj.qty), 0) AS total_qty_jual,
          COALESCE(SUM(dj.qty * dj.harga_jual), 0) AS total_pendapatan
        FROM detail_penjualan dj
        JOIN penjualan pj ON dj.penjualan_id = pj.id
        WHERE dj.barang_id = ? AND pj.status = 'lunas'
          AND YEAR(CONVERT_TZ(pj.created_at, '+00:00', '+07:00')) = ?
          AND MONTH(CONVERT_TZ(pj.created_at, '+00:00', '+07:00')) = ?
      `, [barangId, b.tahun, b.bulan]);

      const totalPendapatan = Number(jual[0].total_pendapatan);
      const totalQtyJual    = Number(jual[0].total_qty_jual);

      const hpp        = totalQtyJual * Number(barangRows[0].harga_beli_sekarang);
      const labaBersih = totalPendapatan - hpp;

      hasil.push({
        bulan:           b.label,
        hargaBeli:       Math.round(Number(beli[0].rata_harga_beli)),
        hargaJual:       Math.round(Number(jual[0].rata_harga_jual)),
        totalPendapatan,
        labaBersih:      Math.round(labaBersih),
        qtyBeli:         Number(beli[0].total_qty_beli),
        qtyJual:         totalQtyJual,
      });
    }

    res.json({ success: true, nama_barang: barangRows[0].nama, data: hasil });
  } catch (err) {
    console.error('getTrenBulanan error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil tren bulanan barang.' });
  }
};

module.exports = { getAllBarang, getBarangById, createBarang, updateBarang, deleteBarang, getBarangSuppliers, getTrenBulanan };
