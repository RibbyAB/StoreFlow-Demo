const express = require('express');
const router = express.Router();
const { login, register, getMe } = require('../controllers/authController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.post('/login',    login);
router.post('/register', authMiddleware, roleMiddleware('owner'), register);
router.get('/me',        authMiddleware, getMe);

module.exports = router;
