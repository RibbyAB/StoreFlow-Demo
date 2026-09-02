const express = require('express');
const router = express.Router();
const { laporanHarian, labaRugi, stokMenipis, barangTerlaris } = require('../controllers/laporanController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/penjualan-harian', laporanHarian);
router.get('/laba-rugi', roleMiddleware('owner'), labaRugi);
router.get('/stok-menipis', stokMenipis);
router.get('/barang-terlaris', barangTerlaris);

module.exports = router;