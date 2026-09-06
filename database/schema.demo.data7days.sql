
USE `test`;


INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'tunai', 225000, 0, 225000, 225000, 'lunas', NOW() - INTERVAL 6 DAY);
SET @p1 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p1, 1, 3, 75000, 68000);

INSERT INTO penjualan (pelanggan_id, nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ((SELECT id FROM pelanggan WHERE nama = 'Budi Santoso' LIMIT 1), 'Budi Santoso', 1, 'transfer', 190000, 0, 190000, 190000, 'lunas', NOW() - INTERVAL 6 DAY + INTERVAL 3 HOUR);
SET @p2 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p2, 4, 2, 65000, 55000),
(@p2, 6, 60, 900, 700);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'qris', 95000, 0, 95000, 95000, 'lunas', NOW() - INTERVAL 5 DAY + INTERVAL 2 HOUR);
SET @p3 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p3, 5, 0.65, 145000, 125000);

INSERT INTO penjualan (pelanggan_id, nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ((SELECT id FROM pelanggan WHERE nama = 'CV. Karya Bangun' LIMIT 1), 'CV. Karya Bangun', 1, 'hutang', 950000, 50000, 900000, 400000, 'belum_lunas', NOW() - INTERVAL 4 DAY + INTERVAL 1 HOUR);
SET @p4 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p4, 3, 10, 95000, 85000);
INSERT INTO cicilan_penjualan (penjualan_id, jumlah, metode_bayar, tanggal, dibuat_oleh, created_at) VALUES
(@p4, 400000, 'transfer', CURDATE() - INTERVAL 4 DAY, 1, NOW() - INTERVAL 4 DAY + INTERVAL 1 HOUR);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'tunai', 55000, 0, 55000, 55000, 'lunas', NOW() - INTERVAL 4 DAY + INTERVAL 5 HOUR);
SET @p5 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p5, 7, 1, 55000, 45000);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'transfer', 130000, 5000, 125000, 125000, 'lunas', NOW() - INTERVAL 3 DAY + INTERVAL 2 HOUR);
SET @p6 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p6, 8, 2, 40000, 32000),
(@p6, 9, 1, 45000, 35000);

INSERT INTO penjualan (pelanggan_id, nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ((SELECT id FROM pelanggan WHERE nama = 'Budi Santoso' LIMIT 1), 'Budi Santoso', 1, 'qris', 300000, 0, 300000, 300000, 'lunas', NOW() - INTERVAL 3 DAY + INTERVAL 6 HOUR);
SET @p7 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p7, 2, 1.2, 250000, 200000);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'tunai', 90000, 0, 90000, 90000, 'lunas', NOW() - INTERVAL 2 DAY + INTERVAL 1 HOUR);
SET @p8 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p8, 10, 15, 6000, 4500);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'transfer', 150000, 0, 150000, 150000, 'lunas', NOW() - INTERVAL 2 DAY + INTERVAL 4 HOUR);
SET @p9 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p9, 1, 2, 75000, 68000);

INSERT INTO penjualan (pelanggan_id, nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ((SELECT id FROM pelanggan WHERE nama = 'CV. Karya Bangun' LIMIT 1), 'CV. Karya Bangun', 1, 'transfer', 570000, 20000, 550000, 550000, 'lunas', NOW() - INTERVAL 1 DAY + INTERVAL 2 HOUR);
SET @p10 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p10, 4, 6, 65000, 55000),
(@p10, 8, 3, 40000, 32000);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'qris', 75000, 0, 75000, 75000, 'lunas', NOW() - INTERVAL 1 DAY + INTERVAL 7 HOUR);
SET @p11 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p11, 7, 1, 55000, 45000),
(@p11, 6, 22, 900, 700);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'tunai', 145000, 0, 145000, 145000, 'lunas', NOW() - INTERVAL 3 HOUR);
SET @p12 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p12, 5, 1, 145000, 125000);

INSERT INTO penjualan (pelanggan_id, nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ((SELECT id FROM pelanggan WHERE nama = 'Budi Santoso' LIMIT 1), 'Budi Santoso', 1, 'transfer', 260000, 10000, 250000, 250000, 'lunas', NOW() - INTERVAL 1 HOUR);
SET @p13 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p13, 3, 2, 95000, 85000),
(@p13, 9, 1.5, 45000, 35000);

INSERT INTO penjualan (nama_pelanggan, kasir_id, metode_bayar, subtotal, diskon, total, total_dibayar, status, created_at)
VALUES ('Umum', 1, 'tunai', 65000, 0, 65000, 65000, 'lunas', NOW() - INTERVAL 20 MINUTE);
SET @p14 = LAST_INSERT_ID();
INSERT INTO detail_penjualan (penjualan_id, barang_id, qty, harga_jual, harga_beli) VALUES
(@p14, 9, 2, 40000, 32000);

INSERT INTO pembelian (supplier_id, total, total_dibayar, status, dibuat_oleh, created_at)
VALUES (1, 3400000, 3400000, 'lunas', 1, NOW() - INTERVAL 5 DAY);
SET @b1 = LAST_INSERT_ID();
INSERT INTO detail_pembelian (pembelian_id, barang_id, qty, harga_beli) VALUES
(@b1, 1, 50, 68000);

INSERT INTO pembelian (supplier_id, total, total_dibayar, status, dibuat_oleh, created_at)
VALUES (2, 5100000, 3000000, 'hutang', 1, NOW() - INTERVAL 3 DAY + INTERVAL 4 HOUR);
SET @b2 = LAST_INSERT_ID();
INSERT INTO detail_pembelian (pembelian_id, barang_id, qty, harga_beli) VALUES
(@b2, 3, 60, 85000);

INSERT INTO pembelian (supplier_id, total, total_dibayar, status, dibuat_oleh, created_at)
VALUES (1, 1250000, 1250000, 'lunas', 1, NOW() - INTERVAL 1 DAY);
SET @b3 = LAST_INSERT_ID();
INSERT INTO detail_pembelian (pembelian_id, barang_id, qty, harga_beli) VALUES
(@b3, 5, 10, 125000);

INSERT INTO pembelian (supplier_id, total, total_dibayar, status, dibuat_oleh, created_at)
VALUES (2, 900000, 900000, 'lunas', 1, NOW() - INTERVAL 6 HOUR);
SET @b4 = LAST_INSERT_ID();
INSERT INTO detail_pembelian (pembelian_id, barang_id, qty, harga_beli) VALUES
(@b4, 9, 20, 35000);

INSERT INTO operasional (tanggal, kategori, keterangan, jumlah, dibuat_oleh, created_at) VALUES
(CURDATE() - INTERVAL 6 DAY, 'listrik',  'Tagihan listrik toko',      350000, 1, NOW() - INTERVAL 6 DAY),
(CURDATE() - INTERVAL 5 DAY, 'gaji',     'Gaji harian karyawan',      150000, 1, NOW() - INTERVAL 5 DAY),
(CURDATE() - INTERVAL 4 DAY, 'makan',    'Konsumsi karyawan',          75000, 1, NOW() - INTERVAL 4 DAY),
(CURDATE() - INTERVAL 3 DAY, 'lain',     'Perbaikan rak barang',      120000, 1, NOW() - INTERVAL 3 DAY),
(CURDATE() - INTERVAL 2 DAY, 'gaji',     'Gaji harian karyawan',      150000, 1, NOW() - INTERVAL 2 DAY),
(CURDATE() - INTERVAL 1 DAY, 'pajak',    'Pajak retribusi bulanan',   200000, 1, NOW() - INTERVAL 1 DAY),
(CURDATE(),                  'makan',    'Konsumsi karyawan',          80000, 1, NOW() - INTERVAL 2 HOUR);
