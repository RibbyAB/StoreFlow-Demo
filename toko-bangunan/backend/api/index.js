// Entry point untuk Vercel Serverless Function.
// Vercel otomatis treat semua file di folder /api sebagai function.
// File ini cuma "menyalurkan" request ke Express app asli yang ada di app.js
// (yang isinya semua route: auth, barang, supplier, dll).
module.exports = require('../app');