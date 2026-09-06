import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPengaturan as getPengaturanAPI } from '../services/api';
import { useAuth } from './AuthContext';

const PengaturanContext = createContext(null);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
