import axios from 'axios';

const hostname = window.location.hostname;
const isLocalNetwork =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

const API_BASE_URL = isLocalNetwork
  ? `http://${hostname}:8080/api`
  : 'https://store-flow-two.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const config = error.config;
    const isNetworkOrServerError = !error.response || error.response.status >= 500;
    const isLogin = config?.url?.includes('/auth/login');
    if (config && isNetworkOrServerError && !isLogin && !config._retried) {
      config._retried = true;
      await new Promise(r => setTimeout(r, 800));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getBarang = (params) => {
  return api.get('/barang', { params });
};

export const getBarangById = (id) =>
  api.get(`/barang/${id}`);

export const getTrenBulananBarang = (id) =>
  api.get(`/barang/${id}/tren-bulanan`);

export const createBarang = (data) =>
  api.post('/barang', data);

export const updateBarang = (id, data) =>
  api.put(`/barang/${id}`, data);

export const deleteBarang = (id) =>
  api.delete(`/barang/${id}`);

export const restoreBarang = (id) =>
  api.put(`/barang/${id}/restore`);

export const getPenjualan = (params = {}) =>
  api.get('/penjualan', { params });

export const getPenjualanById = (id) =>
  api.get(`/penjualan/${id}`);

export const createPenjualan = (data) =>
  api.post('/penjualan', data);

export const batalkanPenjualan = (id, data = {}) =>
  api.put(`/penjualan/${id}/batalkan`, data);

export const editNamaPelanggan = (id, nama_pelanggan) =>
  api.put(`/penjualan/${id}/nama-pelanggan`, { nama_pelanggan });

export const lunasiPenjualan = (id, data = {}) =>
  api.put(`/penjualan/${id}/lunasi`, data);

export const hapusPenjualan = (id) =>
  api.delete(`/penjualan/${id}`);

export const cicilPenjualan = (id, data) =>
  api.post(`/penjualan/${id}/cicil`, data);

export const getCicilanPenjualan = (id) =>
  api.get(`/penjualan/${id}/cicilan`);

export const hapusCicilanPenjualan = (id, cicilanId) =>
  api.delete(`/penjualan/${id}/cicil/${cicilanId}`);

export const getPembelian = () =>
  api.get('/pembelian');

export const createPembelian = (data) =>
  api.post('/pembelian', data);

export const lunasiPembelian = (id, data) =>
  api.put(`/pembelian/${id}/lunasi`, data);

export const cicilPembelian = (id, data) =>
  api.post(`/pembelian/${id}/cicil`, data);

export const getCicilanPembelian = (id) =>
  api.get(`/pembelian/${id}/cicilan`);

export const hapusCicilanPembelian = (id, cicilanId) =>
  api.delete(`/pembelian/${id}/cicil/${cicilanId}`);

export const batalkanPembelian = (id, data = {}) =>
  api.put(`/pembelian/${id}/batalkan`, data);

export const hapusPembelian = (id) =>
  api.delete(`/pembelian/${id}`);

export const getSupplier = () =>
  api.get('/supplier');

export const getOperasional = (bulan) =>
  api.get('/operasional', { params: { bulan } });

export const createOperasional = (data) =>
  api.post('/operasional', data);

export const hapusOperasional = (id) =>
  api.delete(`/operasional/${id}`);

export const setBarangSupplier = (supplierId, barang_ids) =>
  api.put(`/supplier/${supplierId}/barang`, { barang_ids });

export const createSupplier = (data) =>
  api.post('/supplier', data);

export const getPelanggan = () =>
  api.get('/pelanggan');

export const getDashboard = () =>
  api.get('/dashboard');

export const getLaporanHarian = (tanggal) =>
  api.get('/laporan/penjualan-harian', { params: { tanggal } });

export const getDaftarPelangganLedger = () =>
  api.get('/pelanggan-ledger');

export const getDetailPelangganLedger = (nama) =>
  api.get(`/pelanggan-ledger/${encodeURIComponent(nama)}`);

export const gabungkanPelangganLedger = (nama_list, nama_final) =>
  api.post('/pelanggan-ledger/gabung', { nama_list, nama_final });

export const pisahkanPelangganLedger = (namaGabungan) =>
  api.delete(`/pelanggan-ledger/gabung/${encodeURIComponent(namaGabungan)}`);

export const lunasiBatchPembelian = (ids) =>
  api.put('/pembelian/lunasi-batch', { ids });

export const getLaporanLabaRugi = (bulan) =>
  api.get('/laporan/laba-rugi', { params: { bulan } });

export const getStokMenipis = () =>
  api.get('/laporan/stok-menipis');

export const getPengaturan = () =>
  api.get('/pengaturan');

export const updatePengaturan = (data) =>
  api.put('/pengaturan', data);

export default api;
