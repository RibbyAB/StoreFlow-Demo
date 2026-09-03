const db = require('../config/database');

// Helper timezone WIB — Railway server UTC, toko di WIB (UTC+7)
const WIB = `CONVERT_TZ(created_at, '+00:00', '+07:00')`;
const dateWIB = `DATE(CONVERT_TZ(created_at, '+00:00', '+07:00'))`;

// GET /api/laporan/penjualan-harian?tanggal=2026-05-23
const laporanHarian = async (req, res) => {
  try {
    // Jika tidak ada tanggal, pakai hari ini dalam WIB
    const tanggal = req.query.tanggal || (() => {
      const now = new Date();
      // Konversi ke WIB
      const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      return wib.toISOString().split('T')[0];
    })();

    // "total_transaksi": transaksi yang STATUSNYA LUNAS SEKARANG dan dibuat hari itu -- boleh lunas
    // langsung pas dibuat ATAU lunas belakangan lewat cicilan (dua-duanya kehitung). Yang MASIH
    // hutang (belum lunas sama sekali) TIDAK dihitung -- baru kehitung begitu beneran lunas.
    // Nama/pelanggan yang sama di hari itu digabung jadi 1.
    // "total_pendapatan_lunas": HANYA transaksi yang LANGSUNG lunas pas dibuat (gak pernah ada riwayat
    // cicilan sama sekali) -- transaksi yang awalnya hutang terus dilunasin belakangan lewat cicilan
    // TIDAK dihitung di sini, nilainya baru dihitung lewat cicilan di bawah, pas duitnya beneran
    // diterima (bukan pas notanya dibuat), biar gak dobel/nyasar ke hari yang salah.
    const [ringkasan] = await db.query(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN p.status = 'lunas' AND p.pelanggan_id IS NOT NULL
          THEN CONCAT('id:', p.pelanggan_id)
          WHEN p.status = 'lunas'
           AND p.nama_pelanggan IS NOT NULL
           AND TRIM(p.nama_pelanggan) != ''
           AND LOWER(TRIM(p.nama_pelanggan)) NOT IN ('umum', 'pelanggan umum')
          THEN CONCAT('nm:', LOWER(TRIM(p.nama_pelanggan)))
        END)
        +
        COUNT(CASE
          WHEN p.status = 'lunas'
           AND p.pelanggan_id IS NULL
           AND (p.nama_pelanggan IS NULL
                OR TRIM(p.nama_pelanggan) = ''
                OR LOWER(TRIM(p.nama_pelanggan)) IN ('umum', 'pelanggan umum'))
          THEN 1
        END) AS total_transaksi,
        COALESCE(SUM(CASE
          WHEN p.status = 'lunas' AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cx WHERE cx.penjualan_id = p.id)
          THEN p.total ELSE 0
        END), 0) AS total_pendapatan_lunas
      FROM penjualan p
      WHERE DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status != 'dibatalkan'
    `, [tanggal]);

    // Cicilan piutang pelanggan yang DITERIMA hari ini (bisa dari nota hutang hari sebelumnya juga) --
    // ini duit yang beneran masuk hari ini, jadi ikut dijumlahkan ke Pendapatan hari ini. Gak perlu
    // exclude apapun di sini, soalnya transaksi yang punya riwayat cicilan udah dikecualikan total
    // dari query "ringkasan" di atas -- jadi nilainya cuma numpang lewat cicilan ini doang, gak dobel.
    const [cicilanHariIni] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total_cicilan
      FROM cicilan_penjualan
      WHERE tanggal = ?
    `, [tanggal]);

    ringkasan[0].total_pendapatan = Number(ringkasan[0].total_pendapatan_lunas) + Number(cicilanHariIni[0].total_cicilan);

    // HPP (harga pokok penjualan) hari itu:
    // 1) dari transaksi yang LANGSUNG lunas hari itu, gak pernah ada riwayat cicilan (HPP penuh)
    // 2) + HPP proporsional dari cicilan yang diterima hari ini (biar modal barangnya ikut kepotong
    //    sesuai persentase yang udah dibayar, bukan cicilan-nya masuk full ke laba kotor tanpa modal)
    const [hppHarian] = await db.query(`
      SELECT COALESCE(SUM(dp.qty * dp.harga_beli), 0) AS total_hpp
      FROM detail_penjualan dp
      JOIN barang b ON dp.barang_id = b.id
      JOIN penjualan p ON dp.penjualan_id = p.id
      WHERE DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status = 'lunas'
        AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cp WHERE cp.penjualan_id = p.id)
    `, [tanggal]);

    const [hppCicilanHariIni] = await db.query(`
      SELECT COALESCE(SUM(cp.jumlah * (hpp_tx.total_hpp / p.total)), 0) AS total_hpp_cicilan
      FROM cicilan_penjualan cp
      JOIN penjualan p ON cp.penjualan_id = p.id
      JOIN (
        SELECT dp.penjualan_id, SUM(dp.qty * dp.harga_beli) AS total_hpp
        FROM detail_penjualan dp
        JOIN barang b ON dp.barang_id = b.id
        GROUP BY dp.penjualan_id
      ) hpp_tx ON hpp_tx.penjualan_id = p.id
      WHERE cp.tanggal = ? AND p.total > 0
    `, [tanggal]);

    const totalHppHariIni = Number(hppHarian[0].total_hpp) + Math.round(Number(hppCicilanHariIni[0].total_hpp_cicilan));

    ringkasan[0].pendapatan_bersih = Math.round(Number(ringkasan[0].total_pendapatan) - totalHppHariIni);

    const [transaksi] = await db.query(`
      SELECT p.id, p.total, p.metode_bayar, p.created_at,
             u.nama AS kasir,
             COALESCE(p.status, 'lunas') AS status,
             COALESCE(p.nama_pelanggan, 'Umum') AS nama_pelanggan
      FROM penjualan p
      LEFT JOIN users u ON p.kasir_id = u.id
      WHERE DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
      ORDER BY p.created_at DESC
    `, [tanggal]);

    const [barangTerjual] = await db.query(`
      SELECT b.nama, b.satuan,
             SUM(dp.qty) AS total_qty,
             SUM(dp.qty * dp.harga_jual) AS total_nilai
      FROM detail_penjualan dp
      JOIN barang b ON dp.barang_id = b.id
      JOIN penjualan p ON dp.penjualan_id = p.id
      WHERE DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status != 'dibatalkan'
      GROUP BY b.id, b.nama, b.satuan
      ORDER BY total_qty DESC
    `, [tanggal]);

    res.json({
      success: true,
      tanggal,
      ringkasan: ringkasan[0],
      transaksi,
      barang_terjual: barangTerjual
    });

  } catch (err) {
    console.error('laporanHarian error:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat laporan harian.' });
  }
};

// GET /api/laporan/laba-rugi?bulan=2026-05
const labaRugi = async (req, res) => {
  try {
    const bulan = req.query.bulan || (() => {
      const now = new Date();
      const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      return wib.toISOString().slice(0, 7);
    })();
    const [tahun, bln] = bulan.split('-');

    // "total_penjualan": HANYA transaksi yang LANGSUNG lunas pas dibuat (gak pernah ada riwayat
    // cicilan sama sekali). Transaksi yang awalnya hutang terus dilunasin belakangan lewat cicilan
    // TIDAK dihitung di sini -- nilainya dihitung lewat cicilan di bawah, pas duitnya beneran diterima.
    const [penjualan] = await db.query(`
      SELECT COALESCE(SUM(p.total), 0) AS total_penjualan
      FROM penjualan p
      WHERE YEAR(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND MONTH(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status = 'lunas'
        AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cp WHERE cp.penjualan_id = p.id)
    `, [tahun, bln]);

    const [hpp] = await db.query(`
      SELECT COALESCE(SUM(dp.qty * dp.harga_beli), 0) AS total_hpp
      FROM detail_penjualan dp
      JOIN barang b ON dp.barang_id = b.id
      JOIN penjualan p ON dp.penjualan_id = p.id
      WHERE YEAR(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND MONTH(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status = 'lunas'
        AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cp WHERE cp.penjualan_id = p.id)
    `, [tahun, bln]);

    // Sama polanya buat sisi Pembelian -- HANYA nota yang LANGSUNG lunas pas dibuat, gak pernah dicicil.
    const [pembelian] = await db.query(`
      SELECT COALESCE(SUM(p.total), 0) AS total_pembelian
      FROM pembelian p
      WHERE YEAR(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND MONTH(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status = 'lunas'
        AND NOT EXISTS (SELECT 1 FROM cicilan_pembelian cp WHERE cp.pembelian_id = p.id)
    `, [tahun, bln]);

    // Cicilan hutang ke supplier yang dibayar bulan ini -- gak perlu exclude apapun, soalnya nota
    // yang punya riwayat cicilan udah dikecualikan total dari query "pembelian" di atas, jadi nilainya
    // cuma numpang lewat cicilan ini doang, gak dobel.
    const [cicilanPembelianBulanIni] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total_cicilan
      FROM cicilan_pembelian
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
    `, [tahun, bln]);

    // Cicilan piutang dari pelanggan yang dibayar bulan ini -- sama, gak perlu exclude apapun lagi.
    const [cicilanPenjualanBulanIni] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total_cicilan
      FROM cicilan_penjualan
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
    `, [tahun, bln]);

    // Piutang yang belum dibayar bulan ini
    const [piutang] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total_piutang
      FROM penjualan
      WHERE YEAR(CONVERT_TZ(created_at, '+00:00', '+07:00')) = ?
        AND MONTH(CONVERT_TZ(created_at, '+00:00', '+07:00')) = ?
        AND status = 'belum_lunas'
    `, [tahun, bln]);

    // Operasional bulan ini (gaji, listrik, pajak, makan, biaya lain) -- BUKAN pembelian stok
    const [operasional] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total_operasional
      FROM operasional
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
    `, [tahun, bln]);

    // HPP proporsional dari cicilan piutang yang diterima bulan ini (biar modal barangnya ikut kepotong
    // sesuai persentase yang udah dibayar, bukan cicilan-nya masuk full ke laba kotor tanpa modal).
    // Gak perlu exclude apapun -- nota yang punya riwayat cicilan udah dikecualikan total dari query "hpp" di atas.
    const [hppCicilanBulanIni] = await db.query(`
      SELECT COALESCE(SUM(cp.jumlah * (hpp_tx.total_hpp / p.total)), 0) AS total_hpp_cicilan
      FROM cicilan_penjualan cp
      JOIN penjualan p ON cp.penjualan_id = p.id
      JOIN (
        SELECT dp.penjualan_id, SUM(dp.qty * dp.harga_beli) AS total_hpp
        FROM detail_penjualan dp
        JOIN barang b ON dp.barang_id = b.id
        GROUP BY dp.penjualan_id
      ) hpp_tx ON hpp_tx.penjualan_id = p.id
      WHERE YEAR(cp.tanggal) = ? AND MONTH(cp.tanggal) = ? AND p.total > 0
    `, [tahun, bln]);

    const totalPenjualan   = Number(penjualan[0].total_penjualan) + Number(cicilanPenjualanBulanIni[0].total_cicilan);
    const totalHPP         = Number(hpp[0].total_hpp) + Math.round(Number(hppCicilanBulanIni[0].total_hpp_cicilan));
    const labaKotor        = totalPenjualan - totalHPP;
    const totalPembelian   = Number(pembelian[0].total_pembelian) + Number(cicilanPembelianBulanIni[0].total_cicilan);
    const totalPiutang     = Number(piutang[0].total_piutang);
    const totalOperasional = Number(operasional[0].total_operasional);
    const labaBersih       = labaKotor - totalOperasional;

    res.json({
      success: true,
      periode: bulan,
      total_penjualan:   totalPenjualan,
      total_hpp:         totalHPP,
      laba_kotor:        labaKotor,
      total_pembelian:   totalPembelian,
      total_piutang:     totalPiutang,
      total_operasional: totalOperasional,
      laba_bersih:       labaBersih,
      margin_persen:     totalPenjualan > 0 ? ((labaKotor / totalPenjualan) * 100).toFixed(2) : 0
    });

  } catch (err) {
    console.error('labaRugi error:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat laporan laba rugi.' });
  }
};

// GET /api/laporan/stok-menipis
const stokMenipis = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, kode_barang, nama, stok, stok_minimum, satuan
      FROM barang
      WHERE stok <= stok_minimum
      ORDER BY (stok / NULLIF(stok_minimum, 0)) ASC
    `);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data stok menipis.' });
  }
};

// GET /api/laporan/barang-terlaris?tahun=2026&bulan=5
const barangTerlaris = async (req, res) => {
  try {
    const tahun = req.query.tahun || new Date().getFullYear();
    const bulan = req.query.bulan || (new Date().getMonth() + 1);

    const [rows] = await db.query(`
      SELECT
        b.id, b.nama, b.satuan,
        SUM(dp.qty)                              AS total_qty,
        SUM(dp.qty * dp.harga_jual)              AS total_nilai,
        SUM(dp.qty * dp.harga_beli)               AS total_hpp,
        SUM(dp.qty * (dp.harga_jual - dp.harga_beli)) AS total_laba
      FROM detail_penjualan dp
      JOIN barang b ON dp.barang_id = b.id
      JOIN penjualan p ON dp.penjualan_id = p.id
      WHERE YEAR(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND MONTH(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) = ?
        AND p.status = 'lunas'
        AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cx WHERE cx.penjualan_id = p.id)
      GROUP BY b.id, b.nama, b.satuan
    `, [tahun, bulan]);

    // Kontribusi proporsional dari cicilan yang diterima bulan ini -- biar "Barang Terlaris" konsisten
    // sama "Total Penjualan" di Ringkasan. Gak perlu exclude apapun, nota yang punya riwayat cicilan
    // udah dikecualikan total dari query di atas.
    const [cicilanRows] = await db.query(`
      SELECT
        b.id, b.nama, b.satuan,
        SUM(cp.jumlah * (dp.qty * dp.harga_jual) / p.total)  AS nilai_alloc,
        SUM(cp.jumlah * (dp.qty * dp.harga_beli)  / p.total)  AS hpp_alloc
      FROM cicilan_penjualan cp
      JOIN penjualan p ON cp.penjualan_id = p.id
      JOIN detail_penjualan dp ON dp.penjualan_id = p.id
      JOIN barang b ON dp.barang_id = b.id
      WHERE YEAR(cp.tanggal) = ? AND MONTH(cp.tanggal) = ? AND p.total > 0
      GROUP BY b.id, b.nama, b.satuan
    `, [tahun, bulan]);

    // Gabungkan dua sumber di atas per barang_id
    const gabungan = {};
    for (const r of rows) {
      gabungan[r.id] = {
        id: r.id, nama: r.nama, satuan: r.satuan,
        total_qty:  Number(r.total_qty),
        total_nilai: Number(r.total_nilai),
        total_hpp:   Number(r.total_hpp),
        total_laba:  Number(r.total_laba),
      };
    }
    for (const c of cicilanRows) {
      if (!gabungan[c.id]) {
        gabungan[c.id] = { id: c.id, nama: c.nama, satuan: c.satuan, total_qty: 0, total_nilai: 0, total_hpp: 0, total_laba: 0 };
      }
      const nilaiAlloc = Math.round(Number(c.nilai_alloc));
      const hppAlloc   = Math.round(Number(c.hpp_alloc));
      gabungan[c.id].total_nilai += nilaiAlloc;
      gabungan[c.id].total_hpp   += hppAlloc;
      gabungan[c.id].total_laba  += (nilaiAlloc - hppAlloc);
    }

    const hasil = Object.values(gabungan)
      .sort((a, b) => b.total_qty - a.total_qty || b.total_nilai - a.total_nilai)
      .slice(0, 10);

    res.json({ success: true, data: hasil });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data barang terlaris.' });
  }
};

module.exports = { laporanHarian, labaRugi, stokMenipis, barangTerlaris };