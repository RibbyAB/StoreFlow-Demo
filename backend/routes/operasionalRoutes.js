const express = require('express');
const router = express.Router();
const { getOperasional, createOperasional, hapusOperasional } = require('../controllers/operasionalController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', getOperasional);
router.post('/', roleMiddleware('owner'), createOperasional);
router.delete('/:id', roleMiddleware('owner'), hapusOperasional);

module.exports = router;
