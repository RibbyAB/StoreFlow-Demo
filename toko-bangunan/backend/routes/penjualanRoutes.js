const express = require('express');
const router  = express.Router();
const {
  createPenjualan,
  editPenjualan,
  getAllPenjualan,
  getPenjualanById,
  konfirmasiPelunasan,
  cicilPenjualan,
  getCicilanPenjualan,
  hapusCicilanPenjualan,
  batalkanPenjualan,
  hapusPenjualan,
  getHutangPelanggan
} = require('../controllers/penjualanController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/hutang',   getHutangPelanggan);
router.get('/',         getAllPenjualan);
router.get('/:id',      getPenjualanById);
router.post('/',        createPenjualan);
router.put('/:id/lunasi', roleMiddleware('owner'), konfirmasiPelunasan);
router.get('/:id/cicilan', getCicilanPenjualan);
router.post('/:id/cicil',  roleMiddleware('owner'), cicilPenjualan);
router.delete('/:id/cicil/:cicilanId', roleMiddleware('owner'), hapusCicilanPenjualan);
router.put('/:id/batalkan', roleMiddleware('owner'), batalkanPenjualan);
router.delete('/:id', roleMiddleware('owner'), hapusPenjualan);

module.exports = router;