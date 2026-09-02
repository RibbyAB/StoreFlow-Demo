const db = require('../config/database');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    // Hitung tanggal hari ini dalam WIB (Railway server = UTC)
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const hariIni = nowWIB.toISOString().split('T')[0]; // format YYYY-MM-DD

    // Penjualan hari ini (dibandingkan tanggal WIB)
    // "total_transaksi": transaksi yang STATUSNYA LUNAS SEKARANG dan dibuat hari itu -- boleh lunas
    // langsung pas dibuat ATAU lunas belakangan lewat cicilan (dua-duanya kehitung). Yang MASIH
    // hutang (belum lunas sama sekali) TIDAK dihitung -- baru kehitung begitu beneran lunas.
    // "total_pendapatan_lunas": HANYA transaksi yang LANGSUNG lunas pas dibuat (gak pernah ada
    // riwayat cicilan) -- transaksi yang awalnya hutang terus dilunasin belakangan lewat cicilan
    // dihitung lewat cicilan di bawah, pas duitnya beneran diterima.
    const [[penjualanHariIni]] = await db.query(`
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
    `, [hariIni]);

    // Cicilan piutang pelanggan yang DITERIMA hari ini juga ikut dihitung ke pendapatan --
    // konsisten sama perhitungan di Laporan > Harian (biar dua-duanya gak beda angka). Gak perlu
    // exclude apapun -- nota yang punya riwayat cicilan udah dikecualikan total dari query di atas.
    const [[cicilanHariIni]] = await db.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total_cicilan
      FROM cicilan_penjualan
      WHERE tanggal = ?
    `, [hariIni]);
    penjualanHariIni.total_pendapatan = Number(penjualanHariIni.total_pendapatan_lunas) + Number(cicilanHariIni.total_cicilan);

    // Total barang
    const [[totalBarang]] = await db.query('SELECT COUNT(*) AS total FROM barang');

    // Stok menipis
    const [[stokMenipis]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM barang
      WHERE stok <= COALESCE(stok_minimum, 5)
    `);

    // Hutang pelanggan yang belum lunas -- pakai SISA (total - total_dibayar), bukan total mentah,
    // biar konsisten sama perhitungan di halaman Piutang Pelanggan (yang udah ngitung sisa setelah cicilan).
    const [[totalHutang]] = await db.query(`
      SELECT COUNT(*) AS total, COALESCE(SUM(total - total_dibayar), 0) AS nilai
      FROM penjualan
      WHERE status = 'belum_lunas'
    `);

    // 7 hari terakhir untuk grafik — dalam WIB
    // "jumlah_transaksi": transaksi yang STATUSNYA LUNAS SEKARANG dan dibuat hari itu -- boleh lunas
    // langsung ATAU lunas belakangan lewat cicilan. Yang masih hutang TIDAK dihitung.
    // "total": HANYA transaksi yang LANGSUNG lunas pas dibuat (gak pernah ada riwayat cicilan).
    // Nama/pelanggan yang sama di hari yang sama digabung jadi 1.
    const [grafikRaw] = await db.query(`
      SELECT
        DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00')) AS tanggal,
        COALESCE(SUM(CASE
          WHEN p.status = 'lunas' AND NOT EXISTS (SELECT 1 FROM cicilan_penjualan cx WHERE cx.penjualan_id = p.id)
          THEN p.total ELSE 0
        END), 0) AS total,
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
        END) AS jumlah_transaksi
      FROM penjualan p
      WHERE CONVERT_TZ(p.created_at, '+00:00', '+07:00') >= DATE_SUB(?, INTERVAL 6 DAY)
        AND p.status != 'dibatalkan'
      GROUP BY DATE(CONVERT_TZ(p.created_at, '+00:00', '+07:00'))
      ORDER BY tanggal ASC
    `, [hariIni]);

    // Cicilan piutang pelanggan per-hari dalam 7 hari terakhir, buat digabung ke grafik juga.
    // Gak perlu exclude apapun -- nota yang punya riwayat cicilan udah dikecualikan total dari
    // query "grafikRaw" di atas, jadi nilainya cuma numpang lewat cicilan ini doang, gak dobel.
    const [cicilanMingguanRaw] = await db.query(`
      SELECT tanggal, COALESCE(SUM(jumlah), 0) AS total_cicilan
      FROM cicilan_penjualan
      WHERE tanggal >= DATE_SUB(?, INTERVAL 6 DAY)
      GROUP BY tanggal
    `, [hariIni]);
    const petaCicilanMingguan = new Map(
      cicilanMingguanRaw.map(row => [
        (row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : row.tanggal),
        Number(row.total_cicilan)
      ])
    );

    // Isi tanggal yang tidak ada transaksinya dengan 0, supaya grafik tetap tampil 7 hari penuh
    // (bukan cuma hari yang ada penjualannya saja) -> lebih jelas polanya.
    const petaGrafik = new Map(
      grafikRaw.map(row => [
        (row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : row.tanggal),
        row
      ])
    );
    const grafikMingguan = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() + 7 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
      const tgl = d.toISOString().split('T')[0];
      const existing = petaGrafik.get(tgl);
      const totalLunasHariItu = existing ? Number(existing.total) : 0;
      const cicilanHariItu    = petaCicilanMingguan.get(tgl) || 0;
      grafikMingguan.push({
        tanggal: tgl,
        total: totalLunasHariItu + cicilanHariItu,
        jumlah_transaksi: existing ? Number(existing.jumlah_transaksi) : 0
      });
    }

    const totalMinggu = grafikMingguan.reduce((s, g) => s + g.total, 0);
    const rataRataMinggu = totalMinggu / 7;

    // 5 transaksi terakhir
    const [transaksiTerakhir] = await db.query(`
      SELECT p.id, p.total, p.metode_bayar, p.created_at,
             u.nama AS kasir,
             COALESCE(p.nama_pelanggan, 'Umum') AS pelanggan,
             COALESCE(p.status, 'lunas') AS status
      FROM penjualan p
      LEFT JOIN users u ON p.kasir_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        penjualan_hari_ini: penjualanHariIni,
        total_barang:       totalBarang.total,
        stok_menipis:       stokMenipis.total,
        hutang_pelanggan:   totalHutang,
        grafik_mingguan:    grafikMingguan,
        total_minggu:       totalMinggu,
        rata_rata_minggu:   rataRataMinggu,
        transaksi_terakhir: transaksiTerakhir,
        tanggal_server:     hariIni  // untuk debug timezone
      }
    });

  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat data dashboard.' });
  }
};

module.exports = { getDashboard };