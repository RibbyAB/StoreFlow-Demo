import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SIDEBAR_LOGO } from '../../assets/sidebarLogo';
import { Toaster } from 'react-hot-toast';
import useIsMobile from '../../hooks/useIsMobile';

const menu = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/barang',    icon: '📦', label: 'Barang' },
  { to: '/penjualan', icon: '🛒', label: 'Penjualan' },
  { to: '/pembelian', icon: '📥', label: 'Pembelian' },
  { to: '/supplier',  icon: '🏭', label: 'Supplier' },
  { to: '/laporan',   icon: '📊', label: 'Laporan', ownerOnly: true },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Di HP/tablet sempit, sidebar defaultnya TERTUTUP (biar konten dapet ruang penuh) dan
  // munculnya sebagai overlay di atas konten (bukan makan tempat horizontal terus-terusan).
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Kalau ukuran layar berubah SETELAH halaman kebuka (misal muter HP, atau resize window),
  // ikutin sikap defaultnya lagi -- biar gak nyangkut kebuka/tertutup dari state lama.
  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative' }}>
      <Toaster position="top-right" />

      {/* Overlay gelap di belakang sidebar pas dibuka di HP -- klik di luar buat nutup */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
        />
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: isMobile ? 220 : (sidebarOpen ? 190 : 60),
        background: '#1e293b',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: isMobile ? 'transform 0.2s' : 'width 0.2s',
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0, zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        } : {}),
      }}>
        <div style={{
          padding: (sidebarOpen || isMobile) ? '20px 16px' : '20px 0',
          borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center',
          justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
          gap: 10
        }}>
          <img src={SIDEBAR_LOGO} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
          {(sidebarOpen || isMobile) && <span style={{ fontWeight: 700, fontSize: 15 }}>Pelita Jaya</span>}
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {menu.filter(m => !m.ownerOnly || user?.role === 'owner').map(m => (
            <NavLink key={m.to} to={m.to} onClick={() => { if (isMobile) setSidebarOpen(false); }} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              justifyContent: (sidebarOpen || isMobile) ? 'flex-start' : 'center',
              gap: 12,
              padding: (sidebarOpen || isMobile) ? '10px 16px' : '10px 0',
              textDecoration: 'none',
              color: isActive ? '#38bdf8' : '#94a3b8',
              background: isActive ? '#0f172a' : 'transparent',
              borderLeft: (sidebarOpen || isMobile) ? (isActive ? '3px solid #38bdf8' : '3px solid transparent') : 'none',
              fontSize: 14, transition: 'all 0.15s'
            })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
              {(sidebarOpen || isMobile) && m.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #334155' }}>
          {(sidebarOpen || isMobile) && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              👤 {user?.nama}<br />
              <span style={{ fontSize: 11, background: '#334155', padding: '1px 6px', borderRadius: 4 }}>{user?.role}</span>
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px 0', background: '#dc2626',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13
          }}>
            {(sidebarOpen || isMobile) ? '🚪 Keluar' : '🚪'}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main style={{ flex: 1, background: '#f1f5f9', overflowY: 'scroll', scrollbarGutter: 'stable', height: '100vh', width: '100%', minWidth: 0 }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: isMobile ? '12px 16px' : '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b'
          }}>☰</button>
          <span style={{ color: '#94a3b8', fontSize: isMobile ? 12.5 : 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Selamat datang, {user?.nama}
          </span>
        </div>

        {/* Isi halaman */}
        <div style={{ padding: isMobile ? 10 : 16 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}