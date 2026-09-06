
const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/authMiddleware');
router.use(authMiddleware);
router.get('/', getDashboard);
module.exports = router;
