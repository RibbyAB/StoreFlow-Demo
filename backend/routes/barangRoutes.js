const express = require('express');
const router  = express.Router();
const {
  getAllBarang, getBarangById, createBarang,
  updateBarang, deleteBarang, getBarangSuppliers, getTrenBulanan
} = require('../controllers/barangController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/',              getAllBarang);
router.get('/:id',           getBarangById);
router.get('/:id/suppliers', getBarangSuppliers);
router.get('/:id/tren-bulanan', getTrenBulanan);
router.post('/',             createBarang);
router.put('/:id',           updateBarang);
router.delete('/:id',        roleMiddleware('owner'), deleteBarang);

module.exports = router;