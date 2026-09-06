const express = require('express');
const router = express.Router();
const { getPengaturan, updatePengaturan } = require('../controllers/pengaturanController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', getPengaturan);
router.put('/', roleMiddleware('owner'), updatePengaturan);

module.exports = router;
