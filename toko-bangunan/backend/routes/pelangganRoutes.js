const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pelanggan ORDER BY nama ASC');
  res.json({ success: true, data: rows });
});

router.post('/', async (req, res) => {
  const { nama, telepon, alamat, tipe } = req.body;
  const [result] = await db.query(
    'INSERT INTO pelanggan (nama, telepon, alamat, tipe) VALUES (?, ?, ?, ?)',
    [nama, telepon || null, alamat || null, tipe || 'eceran']
  );
  res.status(201).json({ success: true, id: result.insertId });
});

module.exports = router;
