USE `test`;

CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('owner', 'kasir') NOT NULL DEFAULT 'kasir',
  aktif       TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barang (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  kode_barang   VARCHAR(50) UNIQUE,
  nama          VARCHAR(200) NOT NULL,
  kategori      VARCHAR(100),
  satuan        VARCHAR(30) NOT NULL DEFAULT 'pcs',
  harga_beli    DECIMAL(15, 2) NOT NULL DEFAULT 0,
  harga_jual    DECIMAL(15, 2) NOT NULL DEFAULT 0,
  stok          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stok_minimum  DECIMAL(10, 2) NOT NULL DEFAULT 5,
  dihapus_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama (nama),
  INDEX idx_kategori (kategori)
);

CREATE TABLE IF NOT EXISTS supplier (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(150) NOT NULL,
  telepon     VARCHAR(20),
  alamat      TEXT,
  keterangan  TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pelanggan (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(150) NOT NULL,
  telepon     VARCHAR(20),
  alamat      TEXT,
  tipe        ENUM('eceran', 'grosir') NOT NULL DEFAULT 'eceran',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS penjualan (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pelanggan_id    INT,
  nama_pelanggan  VARCHAR(150),
  kasir_id        INT NOT NULL,
  metode_bayar    ENUM('tunai', 'transfer', 'qris', 'hutang') NOT NULL DEFAULT 'tunai',
  subtotal        DECIMAL(15, 2) NOT NULL DEFAULT 0,
  diskon          DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total           DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_dibayar   DECIMAL(15, 2) NOT NULL DEFAULT 0,
  catatan         TEXT,
  status          ENUM('lunas', 'belum_lunas', 'dibatalkan') NOT NULL DEFAULT 'lunas',
  tgl_pelunasan   TIMESTAMP NULL,
  dibatalkan_at   TIMESTAMP NULL,
  dibatalkan_oleh INT,
  alasan_batal    VARCHAR(255),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE SET NULL,
  FOREIGN KEY (kasir_id)     REFERENCES users(id),
  FOREIGN KEY (dibatalkan_oleh) REFERENCES users(id),
  INDEX idx_tanggal (created_at)
);

CREATE TABLE IF NOT EXISTS cicilan_penjualan (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  penjualan_id  INT NOT NULL,
  jumlah        DECIMAL(15, 2) NOT NULL,
  metode_bayar  ENUM('tunai', 'transfer', 'qris') NOT NULL DEFAULT 'tunai',
  tanggal       DATE NOT NULL,
  catatan       VARCHAR(255),
  dibuat_oleh   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (penjualan_id) REFERENCES penjualan(id) ON DELETE CASCADE,
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS detail_penjualan (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  penjualan_id  INT NOT NULL,
  barang_id     INT NOT NULL,
  qty           DECIMAL(10, 2) NOT NULL,
  harga_jual    DECIMAL(15, 2) NOT NULL,
  harga_beli    DECIMAL(15, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (penjualan_id) REFERENCES penjualan(id) ON DELETE CASCADE,
  FOREIGN KEY (barang_id)    REFERENCES barang(id)
);

CREATE TABLE IF NOT EXISTS pembelian (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id     INT,
  total           DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_dibayar   DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status          ENUM('lunas', 'hutang', 'dibatalkan') NOT NULL DEFAULT 'lunas',
  catatan         TEXT,
  jatuh_tempo     DATE NULL,
  stok_ditambahkan TINYINT(1) NOT NULL DEFAULT 1,
  dilunasi_at     TIMESTAMP NULL,
  dibuat_oleh     INT,
  dibatalkan_at   TIMESTAMP NULL,
  dibatalkan_oleh INT,
  alasan_batal    VARCHAR(255),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id),
  FOREIGN KEY (dibatalkan_oleh) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cicilan_pembelian (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id  INT NOT NULL,
  jumlah        DECIMAL(15, 2) NOT NULL,
  tanggal       DATE NOT NULL,
  catatan       VARCHAR(255),
  dibuat_oleh   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE,
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS detail_pembelian (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id  INT NOT NULL,
  barang_id     INT NULL,
  nama_manual   VARCHAR(200) NULL,
  satuan_manual VARCHAR(30)  NULL,
  qty           DECIMAL(10, 2) NOT NULL,
  harga_beli    DECIMAL(15, 2) NOT NULL,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE,
  FOREIGN KEY (barang_id)    REFERENCES barang(id)
);

CREATE TABLE IF NOT EXISTS operasional (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  kategori      ENUM('gaji', 'listrik', 'pajak', 'makan', 'lain') NOT NULL DEFAULT 'lain',
  keterangan    VARCHAR(255),
  jumlah        DECIMAL(15, 2) NOT NULL,
  dibuat_oleh   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dibuat_oleh) REFERENCES users(id),
  INDEX idx_tanggal (tanggal)
);

INSERT INTO users (nama, email, password, role) VALUES
('Demo Owner', 'demo@storeflow.app', '$2b$10$bY5KEQa0WLxEQHzt6z0xIucxBXixwa7pgi0DjQlPd8vSS1fElOJ8O', 'owner');

INSERT INTO barang (kode_barang, nama, kategori, satuan, harga_beli, harga_jual, stok, stok_minimum) VALUES
('SMN-001', 'Semen Tiga Roda 50kg', 'Semen', 'sak',    68000,  75000, 100, 10),
('PSR-001', 'Pasir Beton',          'Pasir', 'm3',      200000, 250000, 50,  5),
('BSI-001', 'Besi Beton 10mm 12m',  'Besi',  'batang',  85000,  95000, 200, 20),
('BSI-002', 'Besi Beton 8mm 12m',   'Besi',  'batang',  55000,  65000, 150, 20),
('CPC-001', 'Cat Tembok Dulux 5kg', 'Cat',   'kaleng', 125000, 145000, 30,  5),
('BTA-001', 'Bata Merah',           'Bata',  'buah',      700,    900,  500, 50),
('PLT-001', 'Pipa PVC 4 inch 4m',   'Pipa',  'batang',  45000,  55000, 80,  10),
('PLT-002', 'Pipa PVC 3 inch 4m',   'Pipa',  'batang',  32000,  40000, 60,  10),
('KYU-001', 'Kayu Kaso 5x7 4m',     'Kayu',  'batang',  35000,  45000, 100, 10),
('GEN-001', 'Genteng Beton',         'Atap',  'buah',    4500,    6000, 300, 30);

INSERT INTO supplier (nama, telepon, alamat) VALUES
('PT. Sumber Makmur',     '021-5551234', 'Jl. Industri No. 10, Jakarta'),
('UD. Bahan Bangunan Jaya', '021-5559876', 'Jl. Raya Serpong No. 5, Tangerang');

INSERT INTO pelanggan (nama, telepon, alamat, tipe) VALUES
('Budi Santoso', '0812-3456-7890', 'Jl. Merdeka No. 12, Bandung', 'eceran'),
('CV. Karya Bangun', '022-6667788', 'Jl. Industri Timur No. 3, Bandung', 'grosir');
