const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    // Cari user di database
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND aktif = 1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const user = rows[0];

    // Cek password.
    // CATATAN KEAMANAN: sebelumnya ada fallback `password === user.password` tanpa syarat,
    // yang berarti siapa pun yang tahu HASH bcrypt seseorang (mis. dari kebocoran DB) bisa
    // login cukup dengan mengetik hash itu sebagai password. Sekarang fallback plaintext
    // hanya dipakai kalau nilai di DB memang BUKAN hash bcrypt (akun lama yang belum di-hash),
    // dan begitu match, langsung di-upgrade ke hash supaya celah ini tertutup permanen.
    const isBcryptHash = /^\$2[aby]\$/.test(user.password || '');
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch {
      isMatch = false;
    }
    if (!isMatch && !isBcryptHash && password === user.password) {
      isMatch = true;
      // Upgrade otomatis ke bcrypt hash supaya login berikutnya sudah aman
      const upgraded = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [upgraded, user.id]);
    }
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    // Buat JWT token
    const token = jwt.sign(
      { id: user.id, nama: user.nama, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: { id: user.id, nama: user.nama, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// POST /api/auth/register (hanya owner yang bisa buat akun baru)
const register = async (req, res) => {
  try {
    const { nama, email, password, role } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi.' });
    }

    // Cek email sudah ada?
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, ?)',
      [nama, email, hashedPassword, role || 'kasir']
    );

    res.status(201).json({ success: true, message: 'Akun berhasil dibuat.' });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

// GET /api/auth/me - cek data user yang sedang login
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nama, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { login, register, getMe };
