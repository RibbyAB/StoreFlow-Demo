import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPengaturan as getPengaturanAPI } from '../services/api';
import { useAuth } from './AuthContext';

const PengaturanContext = createContext(null);

// Nilai fallback dipakai SEBELUM data dari server kebaca (misal pas awal load halaman),
// atau kalau permintaan ke server gagal -- biar UI tetap ada isinya, gak kosong melompong.
const DEFAULT_PENGATURAN = {
  nama_toko: 'Nama Toko',
  alamat: null,
  telepon: null,
  footer_nota1: 'Terima kasih atas kunjungan Anda',
  footer_nota2: '',
};

export const PengaturanProvider = ({ children }) => {
  const { user } = useAuth();
  const [pengaturan, setPengaturan] = useState(DEFAULT_PENGATURAN);
  const [loading, setLoading] = useState(true);

  const muatPengaturan = useCallback(() => {
    getPengaturanAPI()
      .then(r => setPengaturan({ ...DEFAULT_PENGATURAN, ...r.data.data }))
      .catch(() => {}) // gagal ambil -> tetap pakai fallback di atas, gak bikin app crash
      .finally(() => setLoading(false));
  }, []);

  // Cuma perlu login dulu buat baca pengaturan (endpoint-nya emang gak dibatesin role tertentu)
  useEffect(() => {
    if (user) muatPengaturan();
    else setLoading(false);
  }, [user, muatPengaturan]);

  return (
    <PengaturanContext.Provider value={{ pengaturan, loading, refreshPengaturan: muatPengaturan }}>
      {children}
    </PengaturanContext.Provider>
  );
};

export const usePengaturan = () => useContext(PengaturanContext);