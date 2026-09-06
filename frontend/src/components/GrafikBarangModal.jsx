import React, { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTrenBulananBarang } from '../services/api';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const formatRpShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}jt`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}rb`;
  return String(v);
};


export default function GrafikBarangModal({ barangId, onClose }) {
  const [data, setData] = useState([]);
  const [namaBarang, setNamaBarang] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getTrenBulananBarang(barangId)
      .then(r => { setData(r.data.data || []); setNamaBarang(r.data.nama_barang || ''); })
      .catch(() => setError('Gagal memuat grafik.'))
      .finally(() => setLoading(false));
  }, [barangId]);

  const GrafikTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    return (
      <div style={{ background: '#1e293b', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div>💰 Harga Beli: <b>{formatRp(p.hargaBeli)}</b></div>
        <div>🏷️ Harga Jual: <b>{formatRp(p.hargaJual)}</b></div>
        <div>📈 Total Pendapatan: <b>{formatRp(p.totalPendapatan)}</b></div>
        <div>✅ Laba Bersih: <b>{formatRp(p.labaBersih)}</b></div>
        <div style={{ color: '#94a3b8', marginTop: 4 }}>Terjual: {p.qtyJual} | Dibeli: {p.qtyBeli}</div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: 760, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>📊 Tren Bulanan — {namaBarang}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>12 bulan terakhir</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>⏳ Memuat grafik...</div>}
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}

          {!loading && !error && (
            <>
              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#64748b' }}>Total Pendapatan & Laba Bersih (Rp)</div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<GrafikTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="totalPendapatan" name="Pendapatan" fill="#93c5fd" radius={[3,3,0,0]} maxBarSize={26} />
                  <Line type="monotone" dataKey="labaBersih" name="Laba Bersih" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>

              <div style={{ margin: '20px 0 8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Rata-rata Harga Beli vs Harga Jual per Bulan (Rp)</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<GrafikTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="hargaBeli" name="Harga Beli" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="hargaJual" name="Harga Jual" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>

              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                Catatan: bulan tanpa transaksi ditampilkan sebagai 0 pada grafik. Laba Bersih dihitung dari Harga Beli barang <strong>saat ini</strong> (bukan histori harga beli tiap transaksi), konsisten dengan cara hitung Laba Rugi di halaman Laporan.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}