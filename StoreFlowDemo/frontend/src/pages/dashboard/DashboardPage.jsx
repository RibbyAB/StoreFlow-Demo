import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { getDashboard, getPembelian } from '../../services/api';

const formatWIB = (isoString, formatOptions) => {
  if (!isoString) return '-';
  const tanggalSaja = isoString.split('T')[0]; 
  const [y, m, d] = tanggalSaja.split('-');
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', formatOptions);
};

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const KartuRingkasan = ({ icon, label, nilai, warna, sub }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: 20, borderLeft: `4px solid ${warna}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{label}</p>
        <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{nilai}</p>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 28 }}>{icon}</span>
    </div>
  </div>
);

const formatTanggal = (isoString) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  // Menambahkan 7 jam untuk konversi UTC ke WIB (Opsional, sesuaikan dengan server Anda)
  date.setHours(date.getHours() + 7); 
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const hariIniISO = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

// Hitung urgensi jatuh tempo hutang ke supplier (sama persis logikanya kayak di halaman Pembelian)
const getInfoJatuhTempo = (tanggal) => {
  const hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
  const jt = new Date(tanggal); jt.setHours(0, 0, 0, 0);
  const selisihHari = Math.round((jt - hariIni) / (1000 * 60 * 60 * 24));

  if (selisihHari < 0) return { icon: '🔴', color: '#dc2626', label: `Lewat ${Math.abs(selisihHari)} hari`, urgensi: 3, selisihHari };
  if (selisihHari === 0) return { icon: '🟠', color: '#ea580c', label: 'Jatuh tempo hari ini!', urgensi: 2, selisihHari };
  if (selisihHari <= 7)  return { icon: '🟡', color: '#d97706', label: `${selisihHari} hari lagi`, urgensi: 1, selisihHari };
  return { icon: '⚪', color: '#94a3b8', label: '', urgensi: 0, selisihHari };
};

const GrafikTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = new Date(label);
  const namaHari = d.toLocaleDateString('id-ID', { weekday: 'long' });
  const tanggalLengkap = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = label === hariIniISO();
  return (
    <div style={{ background: '#1e293b', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{namaHari}{isToday ? ' (Hari Ini)' : ''}</div>
      <div style={{ color: '#94a3b8', marginBottom: 6 }}>{tanggalLengkap}</div>
      <div>💵 Pendapatan: <b>{formatRupiah(payload[0]?.payload?.total)}</b></div>
      <div>🛒 Transaksi: <b>{payload[0]?.payload?.jumlah_transaksi}x</b></div>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hutangJatuhTempo, setHutangJatuhTempo] = useState([]);

  const muatDashboard = (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    return getDashboard()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const muatJatuhTempo = () => {
    getPembelian()
      .then(res => {
        const semua = res.data.data || [];
        const list = semua
          .filter(r => r.status === 'hutang' && r.jatuh_tempo)
          .map(r => ({ ...r, info: getInfoJatuhTempo(r.jatuh_tempo) }))
          .filter(r => r.info.urgensi >= 1)
          .sort((a, b) => a.info.selisihHari - b.info.selisihHari);
        setHutangJatuhTempo(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    muatDashboard();
    muatJatuhTempo();

    // Refresh otomatis tiap 30 detik, biar grafik & angka selalu terkini
    // tanpa harus reload halaman manual (mis. saat kasir baru saja transaksi).
    const interval = setInterval(() => muatDashboard(true), 30000);

    // Refresh juga saat tab ini kembali aktif (mis. habis pindah tab buat transaksi lalu balik lagi).
    const onFocus = () => muatDashboard(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') muatDashboard(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (loading) return <p>Memuat dashboard...</p>;
  if (!data)   return <p style={{ color: 'red' }}>Gagal memuat data. Pastikan server berjalan.</p>;

  const { penjualan_hari_ini, total_barang, stok_menipis, grafik_mingguan, total_minggu, rata_rata_minggu, transaksi_terakhir } = data;
  const adaTerlambat = hutangJatuhTempo.some(r => r.info.urgensi === 3);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 20px' }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>Dashboard</h2>
        <button onClick={() => muatDashboard(true)} disabled={refreshing} style={{
          background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '6px 12px', fontSize: 13, color: '#475569',
          cursor: refreshing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>
          {refreshing ? '⏳ Memuat...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Notifikasi hutang ke supplier yang mendekati/lewat jatuh tempo */}
      {hutangJatuhTempo.length > 0 && (() => {
        const sudahLewat = hutangJatuhTempo.filter(r => r.info.urgensi === 3);
        const mendekati  = hutangJatuhTempo.filter(r => r.info.urgensi < 3);

        const renderList = (list) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
            {list.map(r => {
              const sisa = Number(r.total) - Number(r.total_dibayar || 0);
              return (
              <div
                key={r.id}
                onClick={() => { localStorage.setItem('pembelianTab', 'riwayat'); navigate('/pembelian'); }}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 13, color: '#374151', padding: '10px 14px',
                  background: '#fff', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid transparent', transition: 'border-color .12s, box-shadow .12s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = r.info.color; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{r.info.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.supplier || 'Tanpa nama supplier'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Sisa {formatRupiah(sisa)}
                      {Number(r.total_dibayar) > 0 && (
                        <span style={{ color: '#16a34a' }}> (sudah dicicil {formatRupiah(r.total_dibayar)} dari {formatRupiah(r.total)})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: r.info.color, fontWeight: 700, fontSize: 13 }}>{formatTanggal(r.jatuh_tempo)}</div>
                    <div style={{ color: r.info.color, fontSize: 11.5 }}>{r.info.label}</div>
                  </div>
                  <span style={{ color: '#cbd5e1', fontSize: 16 }}>›</span>
                </div>
              </div>
              );
            })}
          </div>
        );

        const totalSisa = (list) => list.reduce((s, r) => s + (Number(r.total) - Number(r.total_dibayar || 0)), 0);
        const totalNota = (list) => list.reduce((s, r) => s + Number(r.total), 0);

        return (
        <div style={{
          background: adaTerlambat ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${adaTerlambat ? '#fecaca' : '#fde68a'}`,
          borderRadius: 12, padding: '16px 18px', marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: adaTerlambat ? '#dc2626' : '#b45309' }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              Perhatian Jatuh Tempo Hutang
              <span style={{
                fontSize: 11.5, fontWeight: 700, background: adaTerlambat ? '#fecaca' : '#fde68a',
                color: adaTerlambat ? '#dc2626' : '#b45309', borderRadius: 12, padding: '2px 8px'
              }}>{hutangJatuhTempo.length}</span>
            </div>
            <button
              onClick={() => { localStorage.setItem('pembelianTab', 'riwayat'); navigate('/pembelian'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600, color: adaTerlambat ? '#dc2626' : '#b45309',
                padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => e.currentTarget.style.background = adaTerlambat ? '#fee2e2' : '#fef3c7'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Lihat Semua di Pembelian →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: sudahLewat.length > 0 && mendekati.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
            {sudahLewat.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>🔴 Sudah Lewat ({sudahLewat.length})</div>
                  <div style={{ fontSize: 11.5, color: '#dc2626' }}>
                    {sudahLewat.length} nota &nbsp;•&nbsp; Total: <strong>{formatRupiah(totalNota(sudahLewat))}</strong> &nbsp;•&nbsp; Sisa: <strong>{formatRupiah(totalSisa(sudahLewat))}</strong>
                  </div>
                </div>
                {renderList(sudahLewat)}
              </div>
            )}
            {mendekati.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b45309' }}>🟡 Mendekati ({mendekati.length})</div>
                  <div style={{ fontSize: 11.5, color: '#b45309' }}>
                    {mendekati.length} nota &nbsp;•&nbsp; Total: <strong>{formatRupiah(totalNota(mendekati))}</strong> &nbsp;•&nbsp; Sisa: <strong>{formatRupiah(totalSisa(mendekati))}</strong>
                  </div>
                </div>
                {renderList(mendekati)}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Kartu Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KartuRingkasan icon="💰" label="Pendapatan Hari Ini" nilai={formatRupiah(penjualan_hari_ini?.total_pendapatan)} warna="#22c55e" />
        <KartuRingkasan icon="🛒" label="Transaksi Hari Ini" nilai={penjualan_hari_ini?.total_transaksi || 0} warna="#3b82f6" sub="transaksi" />
        <KartuRingkasan icon="📦" label="Total Barang" nilai={total_barang || 0} warna="#8b5cf6" sub="jenis barang" />
        <KartuRingkasan icon="⚠️" label="Stok Menipis" nilai={stok_menipis || 0} warna="#f59e0b" sub="item perlu restok" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Grafik 7 Hari Terakhir */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>Penjualan 7 Hari Terakhir</h3>
            {grafik_mingguan?.length > 0 && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <div>Total 7 hari: <b style={{ color: '#1e293b' }}>{formatRupiah(total_minggu)}</b></div>
                <div>Rata-rata/hari: <b style={{ color: '#1e293b' }}>{formatRupiah(rata_rata_minggu)}</b></div>
              </div>
            )}
          </div>
          {grafik_mingguan?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={grafik_mingguan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="tanggal"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => { const d = new Date(v); return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); }}
                />
                <YAxis
                  yAxisId="rp"
                  tick={{ fontSize: 10 }}
                  width={48}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
                  label={{ value: 'Rp / hari', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                />
                <YAxis yAxisId="qty" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip content={<GrafikTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="rp" dataKey="total" name="Pendapatan" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={28}>
                  {grafik_mingguan.map((entry, idx) => (
                    <Cell key={idx} fill={entry.tanggal === hariIniISO() ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
                <Line yAxisId="qty" type="monotone" dataKey="jumlah_transaksi" name="Jumlah Transaksi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#94a3b8', fontSize: 14 }}>Belum ada data penjualan.</p>}
        </div>

         {/* Transaksi Terakhir */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e293b' }}>Transaksi Terakhir</h3>
            {transaksi_terakhir?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500 }}>Pelanggan</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500 }}>Total</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500 }}>Bayar</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi_terakhir.map(t => {
                    const isHutangBelumLunas = t.metode_bayar === 'hutang' && t.status !== 'lunas';
                    const badgeConfig = (() => {
                      if (isHutangBelumLunas) return { bg: '#fef3c7', color: '#92400e', label: 'Hutang' };
                      if (t.metode_bayar === 'tunai')    return { bg: '#dcfce7', color: '#166534', label: 'Tunai' };
                      if (t.metode_bayar === 'transfer') return { bg: '#dbeafe', color: '#1e40af', label: 'Transfer' };
                      if (t.metode_bayar === 'qris')     return { bg: '#ede9fe', color: '#5b21b6', label: 'QRIS' };
                      // hutang yang sudah lunas → tampilkan metode pelunasannya
                      return { bg: '#dcfce7', color: '#166534', label: t.metode_bayar || 'Lunas' };
                    })();
                    const statusConfig =
                      t.status === 'dibatalkan' ? { bg: '#fee2e2', color: '#991b1b', label: '✕ Dibatalkan' } :
                      t.status === 'belum_lunas' ? { bg: '#fef9c3', color: '#854d0e', label: '⏳ Belum Lunas' } :
                                                    { bg: '#dcfce7', color: '#166534', label: '✓ Lunas' };
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', textDecoration: t.status === 'dibatalkan' ? 'line-through' : 'none', color: t.status === 'dibatalkan' ? '#94a3b8' : 'inherit' }}>{t.nama_pelanggan || t.pelanggan || 'Umum'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, textDecoration: t.status === 'dibatalkan' ? 'line-through' : 'none', color: t.status === 'dibatalkan' ? '#94a3b8' : 'inherit' }}>{formatRupiah(t.total)}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            background: badgeConfig.bg,
                            color:      badgeConfig.color,
                            padding: '2px 8px', borderRadius: 12, fontSize: 11, textTransform: 'capitalize'
                          }}>
                            {badgeConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{
                            background: statusConfig.bg,
                            color:      statusConfig.color,
                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
                          }}>
                            {statusConfig.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p style={{ color: '#94a3b8', fontSize: 14 }}>Belum ada transaksi hari ini.</p>}
          </div>
      </div>
    </div>
  );
}