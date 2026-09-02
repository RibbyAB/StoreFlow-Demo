const express = require('express');
const router = express.Router();

const { getDaftarPelanggan, getDetailPelanggan } = require('../controllers/pelangganLedgerController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', getDaftarPelanggan);
router.get('/:nama', getDetailPelanggan);

module.exports = router;