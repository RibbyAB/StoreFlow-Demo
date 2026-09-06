import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PengaturanProvider } from './context/PengaturanContext';


import LoginPage      from './pages/auth/LoginPage';
import DashboardPage  from './pages/dashboard/DashboardPage';
import BarangPage     from './pages/barang/BarangPage';
import PenjualanPage  from './pages/penjualan/PenjualanPage';
import PembelianPage  from './pages/pembelian/PembelianPage';
import LaporanPage    from './pages/laporan/LaporanPage';
import SupplierPage   from './pages/supplier/SupplierPage';
import SettingsPage   from './pages/settings/SettingsPage';


import MainLayout from './components/layout/MainLayout';


const PrivateRoute = ({ children, ownerOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (ownerOnly && user.role !== 'owner') return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="barang"     element={<BarangPage />} />
        <Route path="penjualan"  element={<PenjualanPage />} />
        <Route path="pembelian"  element={<PembelianPage />} />
        <Route path="supplier"   element={<SupplierPage />} />
        <Route path="pelanggan-ledger" element={<Navigate to="/laporan" replace />} />
        <Route path="laporan"    element={<PrivateRoute ownerOnly><LaporanPage /></PrivateRoute>} />
        <Route path="pengaturan" element={<PrivateRoute ownerOnly><SettingsPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PengaturanProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </PengaturanProvider>
    </AuthProvider>
  );
}

export default App;