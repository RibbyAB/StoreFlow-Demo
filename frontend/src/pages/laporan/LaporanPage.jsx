import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getLaporanHarian, getLaporanLabaRugi, getStokMenipis, getOperasional, createOperasional, hapusOperasional } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PelangganLedgerPage from '../pelanggan-ledger/PelangganLedgerPage';
import NotaModal from '../../components/NotaModal';
import { Toaster, toast } from 'react-hot-toast';
import useIsMobile from '../../hooks/useIsMobile';


const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const formatRpShort = (n) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return n;
};

const bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const today    = new Date();

const getTodayLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
  };

const todayStr = getTodayLocal();
const bulanStr = getTodayLocal().slice(0, 7);


const downloadCSV = (rows, filename) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape  = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};


const cetakRekapHarian = (harian, tanggal) => {
  if (!harian) return;
  const r   = harian.ringkasan || {};
  const fmt = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const tglLabel = new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const transaksiRows = (harian.transaksi || []).map((t, i, arr) => {
    const isDibatalkan = t.status === 'dibatalkan';
    const isBelumLunas = t.status === 'belum_lunas';
    const statusLabel = isDibatalkan ? 'Dibatalkan' : isBelumLunas ? 'Belum Lunas' : 'Lunas';
    const statusColor = isDibatalkan ? '#dc2626' : isBelumLunas ? '#ea580c' : '#16a34a';
    const rowStyle = isDibatalkan ? ' style="text-decoration:line-through;color:#94a3b8"' : '';

    return `
      <tr${rowStyle}>
        <td>${arr.length - i}</td>
        <td>#${t.id}</td>
        <td>${new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</td>
        <td style="color: ${statusColor}; font-weight: 600; text-decoration:none;">${statusLabel}</td>
        <td>${t.nama_pelanggan || t.pelanggan || 'Umum'}</td>
        <td style="text-transform:capitalize">${t.metode_bayar}</td>
        <td style="text-align:right;font-weight:600">${fmt(t.total)}</td>
      </tr>`;
  }).join('');

  const barangRows = (harian.barang_terjual || []).map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${b.nama}</td>
      <td style="text-align:right">${Math.floor(b.total_qty)} ${b.satuan}</td>
      <td style="text-align:right">${fmt(b.total_nilai)}</td>
    </tr>`).join('');

  const w = window.open('', '_blank', 'width=860,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Rekap Harian ${tanggal}</title>
  <style>
    *{margin: 0;
    padding: 0;
    box-sizing: border-box}
    body{
    font-family: Arial, sans-serif;
    font-size:12px;
    color:#1e293b;
    padding:28px 32px
    }

    h1{
    font-size: 18px;
    margin-bottom: 2px
    }

    .sub{
    font-size: 12px;
    color: #64748b;
    margin-bottom: 18px
    }

    .grid{
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 14px;
    margin-bottom: 22px
    }

    .card{
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    border-top: 3px solid #3b82f6
    }

    .card-label{
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 4px
    }

    .card-val{
    font-size: 16px;
    font-weight: 700
    }

    h2{
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px
    }

    table{
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 22px
    }

    th{
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0
    }

    td{
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9
    }

    tr:hover td{
    background: #f8fafc
    }

    .footer{
    font-size: 10px;
    color: #94a3b8;
    margin-top: 12px;
    text-align: center
    }

    @media print{body{padding:14px 18px}}
  </style></head><body>

  <h1>Rekap Penjualan Harian</h1>
  <div class="sub">📅 ${tglLabel} &nbsp;|&nbsp; Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</div>
  <div class="grid">
    <div class="card"><div class="card-label">Total Transaksi</div><div class="card-val">${r.total_transaksi || 0}</div></div>
    <div class="card" style="border-top-color:#10b981"><div class="card-label">Total Pendapatan</div><div class="card-val">${fmt(r.total_pendapatan)}</div></div>
    <div class="card" style="border-top-color:#f59e0b"><div class="card-label">Pendapatan Bersih</div><div class="card-val">${fmt(r.pendapatan_bersih)}</div></div>
  </div>
  <h2>Rincian Transaksi</h2>
  <table>
    <thead><tr><th>#</th><th>ID</th><th>Waktu</th><th>Status</th><th>Pelanggan</th><th>Metode</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${transaksiRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">Tidak ada transaksi</td></tr>'}</tbody>
  </table>
  <h2>Barang Terjual</h2>
  <table>
    <thead><tr><th>#</th><th>Nama Barang</th><th style="text-align:right">Qty</th><th style="text-align:right">Total Nilai</th></tr></thead>
    <tbody>${barangRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">Tidak ada data</td></tr>'}</tbody>
  </table>
  <div class="footer">— Sistem Laporan StoreFlow —</div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
};


const cetakLabaRugiBulanan = (labaRugi, bulan, tren12) => {
  if (!labaRugi) return;
  const fmt = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const [tahun, bln] = bulan.split('-');
  const periodeLabel = `${bulanList[parseInt(bln) - 1]} ${tahun}`;
  const labaBersih   = labaRugi.laba_bersih ?? labaRugi.laba_kotor;

  const trenRows = [...tren12].reverse().map((row, i) => {
    const margin = row.penjualan > 0 ? ((row.laba / row.penjualan) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td>${row.bulan}</td>
      <td style="text-align:right">${fmt(row.penjualan)}</td>
      <td style="text-align:right">${fmt(row.hpp)}</td>
      <td style="text-align:right;font-weight:600;color:${row.laba >= 0 ? '#16a34a' : '#dc2626'}">${fmt(row.laba)}</td>
      <td style="text-align:right">${margin}%</td>
    </tr>`;
  }).join('');

  const w = window.open('', '_blank', 'width=860,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Laporan Bulanan ${periodeLabel}</title>
  <style>
    *{margin: 0;
    padding: 0;
    box-sizing: border-box
    }

    body{
    font-family: Arial,sans-serif;
    font-size: 12px;
    color: #1e293b;
    padding: 28px 32px
    }

    h1{
    font-size: 18px;
    margin-bottom:2px
    }

    .sub{
    font-size: 12px;
    color: #64748b;
    margin-bottom: 18px
    }

    .lr-box{
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 18px 24px;
    margin-bottom: 22px;
    max-width: 480px
    }

    .lr-row{
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-size: 13px
    }

    .lr-divider{
    border-top: 1px solid #e2e8f0;
    margin: 6px 0
    }

    .lr-bold{
    font-weight: 700;
    font-size: 15px
    }

    h2{
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px
    }

    table{
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 22px
    }

    th{
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0
    }

    td{padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9
    }

    .footer{
    font-size: 10px;
    color: #94a3b8;
    margin-top: 12px;
    text-align: center
    }

    @media print{body{padding:14px 18px}}

  </style></head><body>
  <h1>Laporan Laba Rugi Bulanan</h1>
  <div class="sub">📅 Periode: ${periodeLabel} &nbsp;|&nbsp; Dicetak: ${new Date().toLocaleString('id-ID')}</div>
  <h2>Ringkasan Laba Rugi — ${periodeLabel}</h2>
  <div class="lr-box">
    <div class="lr-row"><span>Pendapatan Penjualan</span><span>${fmt(labaRugi.total_penjualan)}</span></div>
    <div class="lr-row" style="color:#dc2626"><span>Harga Pokok Penjualan (HPP)</span><span>-${fmt(labaRugi.total_hpp)}</span></div>
    <div class="lr-divider"></div>
    <div class="lr-row lr-bold" style="color:${labaRugi.laba_kotor >= 0 ? '#16a34a' : '#dc2626'}"><span>LABA KOTOR</span><span>${fmt(labaRugi.laba_kotor)}</span></div>
    <div class="lr-row" style="color:#f59e0b"><span>Operasional (gaji, listrik, pajak, dll)</span><span>-${fmt(labaRugi.total_operasional)}</span></div>
    <div class="lr-divider"></div>
    <div class="lr-row lr-bold" style="color:${labaBersih >= 0 ? '#2563eb' : '#dc2626'}"><span>LABA BERSIH</span><span>${fmt(labaBersih)}</span></div>
    <div style="margin-top:10px;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:10px;color:#94a3b8">
      Margin Kotor: ${labaRugi.margin_persen}% &nbsp;|&nbsp; Total Pembelian Stok bulan ini: ${fmt(labaRugi.total_pembelian)} (tidak mengurangi laba, karena itu penambahan stok bukan biaya berjalan)
    </div>
  </div>
  <h2>Rekap Tren 12 Bulan Terakhir</h2>
  <table>
    <thead><tr>
      <th>Bulan</th>
      <th style="text-align:right">Penjualan</th>
      <th style="text-align:right">HPP</th>
      <th style="text-align:right">Laba Kotor</th>
      <th style="text-align:right">Margin</th>
    </tr></thead>
    <tbody>${trenRows}</tbody>
  </table>
  <div class="footer">— Sistem Laporan StoreFlow —</div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 400);
};


const KartuMetrik = ({ label, nilai, sub, icon, warna, trend }) => {
  const isMobile = useIsMobile();
  return (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: isMobile ? '14px 14px' : '20px 22px', borderTop: `3px solid ${warna}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 11 : 12, color: '#64748b', fontWeight: 500, marginBottom: isMobile ? 6 : 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: '#1e293b', lineHeight: 1.2, wordBreak: 'break-word' }}>{nilai}</div>
        {sub && <div style={{ fontSize: isMobile ? 11 : 12, color: '#94a3b8', marginTop: 5 }}>{sub}</div>}
        {trend !== undefined && (
          <div style={{ marginTop: 6, fontSize: isMobile ? 11 : 12, fontWeight: 600, color: trend >= 0 ? '#16a34a' : '#dc2626' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs bulan lalu
          </div>
        )}
      </div>
      <div style={{ fontSize: isMobile ? 20 : 28, opacity: 0.8, flexShrink: 0 }}>{icon}</div>
    </div>
  </div>
  );
};

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
    {children}
  </div>
);

const TooltipRp = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: 'none', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff', fontSize: 13, fontWeight: 600 }}>
          {p.name}: {formatRp(p.value)}
        </div>
      ))}
    </div>
  );
};


const KATEGORI_OPERASIONAL = [
  { value: 'gaji',    label: '👤 Gaji Karyawan' },
  { value: 'listrik', label: '💡 Listrik' },
  { value: 'pajak',   label: '📋 Pajak' },
  { value: 'makan',   label: '🍽️ Makan' },
  { value: 'lain',    label: '📦 Biaya Lain-lain' },
];

function OperasionalSection({ bulan, onChanged }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tanggal: '', kategori: 'lain', keterangan: '', jumlah: '' });

  const muat = () => {
    if (list.length === 0) setLoading(true);
    const scrollEl = document.querySelector('main');
    const posisiScroll = scrollEl ? scrollEl.scrollTop : 0;
    getOperasional(bulan)
      .then(res => {
        setList(res.data.data || []);
        setTotal(res.data.total_operasional || 0);
        requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = posisiScroll; });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { muat();  }, [bulan]);

  const bukaForm = () => {
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
    setForm({ tanggal: wib.toISOString().slice(0, 10), kategori: 'lain', keterangan: '', jumlah: '' });
    setShowForm(true);
  };

  const simpan = async (e) => {
    e.preventDefault();
    if (!form.tanggal || !form.jumlah || Number(form.jumlah) <= 0) return;
    setSaving(true);
    try {
      await createOperasional(form);
      toast.success('Operasional berhasil dicatat.', { position: 'top-center' });
      setShowForm(false);
      muat();
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan.', { position: 'top-center' });
    } finally {
      setSaving(false);
    }
  };

  const hapus = async (id) => {
    try {
      await hapusOperasional(id);
      toast.success('Operasional dihapus.', { position: 'top-center' });
      muat();
      onChanged && onChanged();
    } catch {
      toast.error('Gagal menghapus.', { position: 'top-center' });
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: isMobile ? 16 : 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <SectionTitle>💼 Operasional Bulan Ini</SectionTitle>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Gaji, listrik, pajak, makan, biaya lain — bukan pembelian stok</div>
        </div>
        {user?.role === 'owner' && (
          <button onClick={bukaForm} style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>+ Catat Operasional</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={simpan} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Tanggal</label>
            <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Kategori</label>
            <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, background: '#fff' }}>
              {KATEGORI_OPERASIONAL.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Jumlah (Rp)</label>
            <input type="number" min="1" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
              placeholder="0" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Keterangan (opsional)</label>
            <input value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              placeholder="Contoh: gaji Budi bulan Agustus" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Memuat...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada operasional dicatat bulan ini.</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {list.map(b => {
              const kat = KATEGORI_OPERASIONAL.find(k => k.value === b.kategori);
              return (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                  padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{kat?.label || b.kategori}</span>
                    {b.keterangan && <span style={{ color: '#94a3b8', marginLeft: 8 }}>— {b.keterangan}</span>}
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(b.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>-{formatRp(b.jumlah)}</span>
                    {user?.role === 'owner' && (
                      <button onClick={() => hapus(b.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14 }}>
            <span>Total Operasional</span>
            <span style={{ color: '#dc2626' }}>-{formatRp(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function LaporanPage() {
  const isMobile = useIsMobile();
  const [tab,         setTab]         = useState(() => localStorage.getItem('laporan_active_tab') || 'ringkasan');
  const [bulan,       setBulan]       = useState(bulanStr);
  const [tanggal,     setTanggal]     = useState(todayStr);
  const [loading,     setLoading]     = useState({});
  const [labaRugi,    setLabaRugi]    = useState(null);
  const [harian,      setHarian]      = useState(null);
  const [stokMenipis, setStokMenipis] = useState([]);
  const [tren12,      setTren12]      = useState([]);
  const [trenHarianBulan, setTrenHarianBulan] = useState([]);
  const [notaId,      setNotaId]      = useState(null);
  const [topBarang,   setTopBarang]   = useState([]);
  const [sortBarangTerlaris, setSortBarangTerlaris] = useState('total_qty');
  const [notaNomor,   setNotaNomor]   = useState(null);

  const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  useEffect(() => { localStorage.setItem('laporan_active_tab', tab); }, [tab]);

  const muatLabaRugi = useCallback(async (b) => {
    setLoad('lr', true);
    try   { const res = await getLaporanLabaRugi(b); setLabaRugi(res.data); }
    catch { setLabaRugi(null); }
    finally { setLoad('lr', false); }
  }, []);

  const muatHarian = useCallback(async (tgl) => {
    setLoad('hr', true);
    try {
      const res = await getLaporanHarian(tgl);
      setHarian(res.data);
      setListPenjualan(res.data.transaksi || []);

      } catch (err) {
      console.error("Gagal muat data harian:", err);
      setHarian(null);
      setListPenjualan([]);
    } finally {
      setLoad('hr', false);
    }
  }, []);

  const muatStok = useCallback(async () => {
    try { const res = await getStokMenipis(); setStokMenipis(res.data.data); }
    catch {}
  }, []);

  const muatTren = useCallback(async () => {
    setLoad('tren', true);
    try {
      const bulanIni = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const promises = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
        const b = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return getLaporanLabaRugi(b)
          .then(r => ({
            bulan:      bulanList[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2),
            penjualan:  Number(r.data.total_penjualan) || 0,
            hpp:        Number(r.data.total_hpp)       || 0,
            laba:       Number(r.data.laba_kotor)      || 0,
            margin:     r.data.total_penjualan > 0 ? Number(((r.data.laba_kotor / r.data.total_penjualan) * 100).toFixed(1)) : 0,
            isBulanIni: b === bulanIni,
          }))
          .catch(() => ({
            bulan: bulanList[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2),
            penjualan: 0, hpp: 0, laba: 0, margin: 0, isBulanIni: b === bulanIni,
          }));
      });
      setTren12(await Promise.all(promises));
    } finally { setLoad('tren', false); }
  }, []);


  const muatTrenHarianBulan = useCallback(async (b) => {
    setLoad('trenHarian', true);
    try {
      const [tahun, bln] = b.split('-');
      const jumlahHari = new Date(Number(tahun), Number(bln), 0).getDate();
      const hariIniStr = todayStr;

      const promises = Array.from({ length: jumlahHari }, (_, i) => {
        const hari = i + 1;
        const tgl = `${tahun}-${bln}-${String(hari).padStart(2, '0')}`;
        if (tgl > hariIniStr) {

          return Promise.resolve({ tanggal: hari, pendapatan: 0, labaKotor: 0, transaksi: 0, belumTerjadi: true });
        }
        return getLaporanHarian(tgl)
          .then(r => ({
            tanggal:    hari,
            pendapatan: Number(r.data.ringkasan?.total_pendapatan) || 0,
            labaKotor:  Number(r.data.ringkasan?.pendapatan_bersih) || 0,
            transaksi:  Number(r.data.ringkasan?.total_transaksi)  || 0,
          }))
          .catch(() => ({ tanggal: hari, pendapatan: 0, labaKotor: 0, transaksi: 0 }));
      });
      setTrenHarianBulan(await Promise.all(promises));
    } finally { setLoad('trenHarian', false); }
  }, []);

  const muatTopBarang = useCallback(async (b) => {
    try {
      const [tahun, bln] = b.split('-');
      const res = await api.get('/laporan/barang-terlaris', { params: { tahun, bulan: bln } }).catch(() => null);
      setTopBarang(res?.data?.data || []);
    } catch {}
  }, []);

  useEffect(() => { muatLabaRugi(bulan); muatTopBarang(bulan); muatTrenHarianBulan(bulan); muatTren(); }, [bulan]);
  useEffect(() => { muatHarian(tanggal); }, [tanggal]);
  useEffect(() => { muatStok(); }, []);

  const tabs = [
    { key: 'ringkasan', icon: '📊', label: 'Ringkasan' },
    { key: 'bulanan',   icon: '📅', label: 'Bulanan' },
    { key: 'harian',    icon: '📋', label: 'Harian' },
    { key: 'stok',      icon: '⚠️', label: 'Stok Menipis' },
    { key: 'piutang',   icon: '🧾', label: 'Piutang Pelanggan' },
  ];

  const [listPenjualan, setListPenjualan] = useState([]);

  const loadData = async () => {
    try {
      const res = await api.get(`/laporan/penjualan-harian?tanggal=${todayStr}`);
      console.log("Respon dari Backend:", res.data);

      if (res.data && res.data.transaksi) {
        setListPenjualan(res.data.transaksi);
      } else {
        console.warn("Struktur data tidak ditemukan, cek nama properti!");
      }
    } catch (err) {
      console.error("Gagal memuat:", err);
    }
  };

  return (
    <div>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: 20 }}>📊 Laporan Keuangan</h2>
        <div style={{ fontSize: 13, color: '#64748b' }}>Hanya bisa diakses oleh <strong>Owner</strong></div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4, overflowX: 'auto', maxWidth: '100%' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0,
            background: tab === t.key ? '#fff' : 'transparent',
            color:      tab === t.key ? '#1e293b' : '#64748b',
            boxShadow:  tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {}
      {tab === 'ringkasan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Periode:</span>
            <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} max={bulanStr}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
            />
          </div>

          {loading.lr ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Memuat data...</div>
          ) : labaRugi ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16 }}>
                <KartuMetrik icon="💰" label="Total Penjualan" nilai={formatRp(labaRugi.total_penjualan)} warna="#3b82f6" sub={`Periode ${bulanList[parseInt(bulan.split('-')[1])-1]}`} />
                <KartuMetrik icon="🛒" label="Total HPP"       nilai={formatRp(labaRugi.total_hpp)}       warna="#f59e0b" sub="Harga Pokok Penjualan" />
                <KartuMetrik icon="📈" label="Laba Kotor"      nilai={formatRp(labaRugi.laba_kotor)}      warna="#10b981" sub={`Margin ${labaRugi.margin_persen}%`} />
                <KartuMetrik icon="💼" label="Laba Bersih"     nilai={formatRp(labaRugi.laba_bersih)}     warna="#2563eb" sub="Setelah operasional" />
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: isMobile ? 16 : 24 }}>
                <SectionTitle>📄 Laporan Laba Rugi — {bulanList[parseInt(bulan.split('-')[1])-1]} {bulan.split('-')[0]}</SectionTitle>
                {[
                  { label: 'Pendapatan Penjualan',   nilai: labaRugi.total_penjualan,  bold: false, color: '#1e293b' },
                  { label: 'Harga Pokok Penjualan',  nilai: labaRugi.total_hpp,        bold: false, color: '#dc2626', isNegatif: true },
                  { label: 'LABA KOTOR',             nilai: labaRugi.laba_kotor,       bold: true,  color: labaRugi.laba_kotor >= 0 ? '#16a34a' : '#dc2626', divider: true },
                  { label: 'Operasional',            nilai: labaRugi.total_operasional,      bold: false, color: '#f59e0b', isNegatif: true },
                  { label: 'LABA BERSIH',            nilai: labaRugi.laba_bersih,      bold: true,  color: labaRugi.laba_bersih >= 0 ? '#2563eb' : '#dc2626', divider: true, isNegatif: labaRugi.laba_bersih < 0 },
                ].map((row, i) => (
                  <div key={i}>
                    {row.divider && <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: row.bold ? 600 : 400, color: row.bold ? '#1e293b' : '#64748b' }}>{row.label}</span>
                      <span style={{ fontSize: row.bold ? 16 : 14, fontWeight: row.bold ? 700 : 500, color: row.color }}>
                        {row.isNegatif ? `-${formatRp(Math.abs(row.nilai))}` : formatRp(row.nilai)}
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                  * Total pembelian ke supplier bulan ini: {formatRp(labaRugi.total_pembelian)} (nota lunas + cicilan hutang yang dibayar bulan ini) — ini penambahan stok/pembayaran, bukan biaya, jadi tidak mengurangi laba bersih.
                </div>
              </div>

              <OperasionalSection bulan={bulan} onChanged={() => muatLabaRugi(bulan)} />
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Gagal memuat data laporan.</div>
          )}
        </div>
      )}

      {}
      {tab === 'bulanan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Periode:</span>
            <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} max={bulanStr}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
            />

            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {}
              <button
                onClick={() => {
                  const rows = [...tren12].reverse().map((row) => ({
                    'Bulan'          : row.bulan,
                    'Penjualan (Rp)' : row.penjualan,
                    'HPP (Rp)'       : row.hpp,
                    'Laba Kotor (Rp)': row.laba,
                    'Margin (%)'     : row.penjualan > 0
                      ? ((row.laba / row.penjualan) * 100).toFixed(1)
                      : '0.0',
                  }));
                  downloadCSV(rows, `tren-bulanan-${bulan}.csv`);
                }}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #bfdbfe',background:'#eff6ff',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#2563eb',whiteSpace:'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background='#dbeafe'}
                onMouseLeave={e => e.currentTarget.style.background='#eff6ff'}
              >⬇️ CSV Tren 12 Bulan</button>

              {}
              {labaRugi && (
                <button
                  onClick={() => {
                    const rows = [
                      { 'Keterangan': 'Pendapatan Penjualan',    'Nilai (Rp)': labaRugi.total_penjualan  },
                      { 'Keterangan': 'Harga Pokok Penjualan',   'Nilai (Rp)': -labaRugi.total_hpp       },
                      { 'Keterangan': 'Laba Kotor',              'Nilai (Rp)': labaRugi.laba_kotor       },
                      { 'Keterangan': 'Operasional',             'Nilai (Rp)': -labaRugi.total_operasional     },
                      { 'Keterangan': 'Laba Bersih',             'Nilai (Rp)': labaRugi.laba_bersih      },
                      { 'Keterangan': 'Margin Kotor (%)',        'Nilai (Rp)': labaRugi.margin_persen    },
                      { 'Keterangan': '(Info) Total Pembelian Stok', 'Nilai (Rp)': labaRugi.total_pembelian },
                    ];
                    downloadCSV(rows, `laba-rugi-${bulan}.csv`);
                  }}
                  style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #bbf7d0',background:'#f0fdf4',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#16a34a',whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background='#dcfce7'}
                  onMouseLeave={e => e.currentTarget.style.background='#f0fdf4'}
                >⬇️ CSV Laba Rugi</button>
              )}

              {}
              <button
                onClick={() => cetakLabaRugiBulanan(labaRugi, bulan, tren12)}
                disabled={!labaRugi}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #e2e8f0',background: labaRugi ? '#1e293b' : '#f1f5f9',borderRadius:8,cursor: labaRugi ? 'pointer':'not-allowed',fontSize:13,fontWeight:500,color: labaRugi ? '#fff' : '#94a3b8',whiteSpace:'nowrap' }}
                onMouseEnter={e => { if(labaRugi) e.currentTarget.style.background='#334155'; }}
                onMouseLeave={e => { if(labaRugi) e.currentTarget.style.background='#1e293b'; }}
              >🖨️ Cetak Laporan</button>
            </div>
          </div>

          {}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: isMobile ? 16 : 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <SectionTitle>📆 Pendapatan & Laba Harian — {bulanList[parseInt(bulan.split('-')[1]) - 1]} {bulan.split('-')[0]}</SectionTitle>
              {!loading.trenHarian && trenHarianBulan.length > 0 && (() => {
                const totalPendapatan = trenHarianBulan.reduce((s, r) => s + Number(r.pendapatan), 0);


                const hariSudahLewat = trenHarianBulan.filter(r => !r.belumTerjadi).length || trenHarianBulan.length;
                const rataRata = totalPendapatan / hariSudahLewat;
                return (
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                    <div>Total bulan ini: <b style={{ color: '#1e293b' }}>{formatRp(totalPendapatan)}</b></div>
                    <div>Rata-rata/hari: <b style={{ color: '#1e293b' }}>{formatRp(rataRata)}</b></div>
                  </div>
                );
              })()}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              Rincian tiap tanggal (1–{trenHarianBulan.length || '...'}) di bulan yang dipilih pada Periode. Laba Bersih (setelah operasional) ada di tab Ringkasan, karena operasional sifatnya bulanan bukan harian.
            </div>
            {loading.trenHarian ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Memuat grafik...</div>
            ) : (() => {
              const hariIniNum = bulan === todayStr.slice(0, 7) ? Number(todayStr.split('-')[2]) : -1;
              const tglObj = (hari) => new Date(Number(bulan.split('-')[0]), Number(bulan.split('-')[1]) - 1, hari);
              const TooltipHarian = ({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = tglObj(label);
                const namaHari = d.toLocaleDateString('id-ID', { weekday: 'long' });
                const tanggalLengkap = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                const isToday = label === hariIniNum;
                return (
                  <div style={{ background: '#1e293b', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{namaHari}{isToday ? ' (Hari Ini)' : ''}</div>
                    <div style={{ color: '#94a3b8', marginBottom: 6 }}>{tanggalLengkap}</div>
                    <div>💵 Pendapatan: <b>{formatRp(payload[0]?.payload?.pendapatan)}</b></div>
                    <div>📈 Laba Kotor: <b>{formatRp(payload[0]?.payload?.labaKotor)}</b></div>
                  </div>
                );
              };
              return (
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                  <ComposedChart data={trenHarianBulan} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={formatRpShort}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      width={48}
                      label={{ value: 'Rp / hari', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                    />
                    <Tooltip content={<TooltipHarian />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pendapatan" name="Pendapatan" radius={[3,3,0,0]} maxBarSize={20} fill="#93c5fd">
                      {trenHarianBulan.map((r, i) => <Cell key={i} fill={r.tanggal === hariIniNum ? '#2563eb' : '#93c5fd'} />)}
                    </Bar>
                    <Line type="monotone" dataKey="labaKotor" name="Laba Kotor" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: isMobile ? 16 : 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <SectionTitle>📈 Tren Penjualan & Laba 12 Bulan Terakhir</SectionTitle>
              {!loading.tren && tren12.length > 0 && (() => {
                const totalPenjualan12 = tren12.reduce((s, r) => s + r.penjualan, 0);
                const totalLaba12 = tren12.reduce((s, r) => s + r.laba, 0);
                const terbaik = tren12.reduce((a, b) => (b.laba > a.laba ? b : a), tren12[0]);
                return (
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                    <div>Total Penjualan: <b style={{ color: '#1e293b' }}>{formatRpShort(totalPenjualan12)}</b></div>
                    <div>Total Laba: <b style={{ color: '#1e293b' }}>{formatRpShort(totalLaba12)}</b></div>
                    <div>Bulan Terbaik: <b style={{ color: '#16a34a' }}>{terbaik.bulan}</b></div>
                  </div>
                );
              })()}
            </div>
            {loading.tren ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Memuat grafik...</div>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <BarChart data={tren12} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<TooltipRp />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="penjualan" name="Penjualan" fill="#93c5fd" radius={[4,4,0,0]} maxBarSize={32}>
                    {tren12.map((r, i) => <Cell key={i} fill={r.isBulanIni ? '#2563eb' : '#93c5fd'} />)}
                  </Bar>
                  <Bar dataKey="laba" name="Laba Kotor" fill="#6ee7b7" radius={[4,4,0,0]} maxBarSize={32}>
                    {tren12.map((r, i) => <Cell key={i} fill={r.isBulanIni ? '#10b981' : '#6ee7b7'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <SectionTitle>📋 Tabel Rekap 12 Bulan</SectionTitle>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Bulan','Penjualan','HPP','Laba Kotor','Margin'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Bulan' ? 'left' : 'right', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...tren12].reverse().map((row, i) => {
                  const margin = row.penjualan > 0 ? ((row.laba / row.penjualan) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 500 }}>{row.bulan}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#2563eb', fontWeight: 500 }}>{formatRp(row.penjualan)}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#f59e0b' }}>{formatRp(row.hpp)}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 600, color: row.laba >= 0 ? '#16a34a' : '#dc2626' }}>{formatRp(row.laba)}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <span style={{
                          background: Number(margin) >= 20 ? '#dcfce7' : Number(margin) >= 10 ? '#fef9c3' : '#fef2f2',
                          color:      Number(margin) >= 20 ? '#166534' : Number(margin) >= 10 ? '#854d0e' : '#dc2626',
                          padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        }}>{margin}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <SectionTitle>🏆 Barang Terlaris — {bulanList[parseInt(bulan.split('-')[1]) - 1]} {bulan.split('-')[0]}</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Urutkan:</span>
                {[
                  { key: 'total_qty',   label: 'Qty Terjual' },
                  { key: 'total_nilai', label: 'Pendapatan' },
                  { key: 'total_laba',  label: 'Laba' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setSortBarangTerlaris(opt.key)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      border: sortBarangTerlaris === opt.key ? '1px solid #1e293b' : '1px solid #e2e8f0',
                      background: sortBarangTerlaris === opt.key ? '#1e293b' : '#fff',
                      color: sortBarangTerlaris === opt.key ? '#fff' : '#64748b',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            {topBarang.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada penjualan bulan ini.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Barang','Qty Terjual','Pendapatan','Laba'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Barang' ? 'left' : 'right', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...topBarang].sort((a, b) => Number(b[sortBarangTerlaris]) - Number(a[sortBarangTerlaris])).map((b, i) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 500 }}>{b.nama}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>{b.total_qty} {b.satuan}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', color: '#2563eb', fontWeight: 500 }}>{formatRp(b.total_nilai)}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 600, color: b.total_laba >= 0 ? '#16a34a' : '#dc2626' }}>{formatRp(b.total_laba)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {}
      {tab === 'harian' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Tanggal:</span>
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} max={todayStr}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
            />
            <button type="button" onClick={() => {
              const dateNow = getTodayLocal();
                setTanggal(dateNow);
                muatHarian(dateNow);
              }}

              style={{
                padding: '7px 14px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: '#64748b'
              }}
            >Hari Ini</button>

            {harian && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const rows = (harian.transaksi || []).map((t, i, arr) => ({
                      'No'            : arr.length - i,
                      'ID Transaksi'  : `#${t.id}`,
                      'Waktu'         : new Date(t.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                      'Kasir'         : t.kasir || '-',
                      'Pelanggan'     : t.nama_pelanggan || t.pelanggan || 'Umum',
                      'Metode'        : t.metode_bayar,
                      'Status'        : t.status === 'dibatalkan' ? 'Dibatalkan' : t.status === 'lunas' ? 'Lunas' : 'Belum Lunas',
                      'Total (Rp)'    : t.total,
                    }));
                    downloadCSV(rows, `transaksi-harian-${tanggal}.csv`);
                  }}
                  style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #bfdbfe',background:'#eff6ff',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#2563eb',whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background='#dbeafe'}
                  onMouseLeave={e => e.currentTarget.style.background='#eff6ff'}
                >⬇️ CSV Transaksi</button>

                <button
                  onClick={() => {
                    const rows = (harian.barang_terjual || []).map((b, i) => ({
                      'No'              : i + 1,
                      'Nama Barang'     : b.nama,
                      'Satuan'          : b.satuan,
                      'Qty Terjual'     : Math.floor(b.total_qty),
                      'Total Nilai (Rp)': b.total_nilai,
                    }));
                    downloadCSV(rows, `barang-terjual-${tanggal}.csv`);
                  }}
                  style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #bbf7d0',background:'#f0fdf4',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#16a34a',whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background='#dcfce7'}
                  onMouseLeave={e => e.currentTarget.style.background='#f0fdf4'}
                >⬇️ CSV Barang</button>

                <button
                  onClick={() => cetakRekapHarian(harian, tanggal)}
                  style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1px solid #e2e8f0',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,color:'#fff',whiteSpace:'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background='#334155'}
                  onMouseLeave={e => e.currentTarget.style.background='#1e293b'}
                >🖨️ Cetak Rekap</button>
              </div>
            )}
          </div>

          {loading.hr ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Memuat data harian...</div>
          ) : harian ? (
            <>
              {}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
                <KartuMetrik icon="🛒" label="Total Transaksi"       nilai={harian.ringkasan?.total_transaksi || 0}          sub="transaksi hari ini"   warna="#3b82f6" />
                <KartuMetrik icon="💵" label="Total Pendapatan"      nilai={formatRp(harian.ringkasan?.total_pendapatan)}    sub="dari semua transaksi" warna="#10b981" />
                <KartuMetrik icon="📊" label="Pendapatan Bersih"     nilai={formatRp(harian.ringkasan?.pendapatan_bersih)}  sub="pendapatan - HPP"      warna="#f59e0b" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>

                {}
                 <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto', minWidth: 0 }}>
                  <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <SectionTitle>🧾 Rincian Transaksi</SectionTitle>
                  </div>
                  {harian.transaksi?.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Tidak ada transaksi hari ini.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th style={{ padding: '12px 14px', width: '10%' }}>No.</th>
                          <th style={{ padding: '12px 14px', width: '30%', textAlign: 'left' }}>Pelanggan</th>
                          <th style={{ padding: '12px 14px', width: '20%', textAlign: 'left' }}>Metode</th>
                          <th style={{ padding: '12px 14px', width: '20%', textAlign: 'left' }}>Total</th>
                          <th style={{ padding: '12px 14px', width: '20%', textAlign: 'left' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(harian.transaksi || []).map((t, i) => (
                          <tr key={t.id}
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <td style={{ padding: '12px 32px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{(harian.transaksi || []).length - i}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 500 }}>{t.nama_pelanggan || t.pelanggan || 'Umum'}</td>
                            <td style={{ padding: '12px 12px' }}>
                              {}
                              <span style={{
                                background:
                                  t.metode_bayar === 'tunai'    ? '#f0fdf4' :
                                  t.metode_bayar === 'transfer' ? '#eff6ff' :
                                  t.metode_bayar === 'qris'     ? '#fdf4ff' :
                                  t.metode_bayar === 'hutang'   ? '#fef9c3' : '#f1f5f9',
                                color:
                                  t.metode_bayar === 'tunai'    ? '#166534' :
                                  t.metode_bayar === 'transfer' ? '#1d4ed8' :
                                  t.metode_bayar === 'qris'     ? '#7e22ce' :
                                  t.metode_bayar === 'hutang'   ? '#854d0e' : '#64748b',
                                padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                              }}>{t.metode_bayar}</span>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: t.status === 'dibatalkan' ? '#94a3b8' : '#16a34a', textDecoration: t.status === 'dibatalkan' ? 'line-through' : 'none' }}>{formatRp(t.total)}</td>
                            <td style={{ padding: '12px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <button onClick={() => { setNotaId(t.id); setNotaNomor((harian.transaksi || []).length - i); }} style={{
                                  background: '#eff6ff', color: '#2563eb', border: 'none',
                                  borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                                  fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                                  display: 'flex', alignItems: 'center', gap: 5,
                                }}>
                                  🧾 Lihat Nota
                                </button>
                                {}
                                {t.status === 'dibatalkan' ? (
                                  <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>❌ Dibatalkan</span>
                                ) : t.metode_bayar === 'hutang' ? (
                                  t.status === 'lunas' ? (
                                    <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>✅ Lunas</span>
                                  ) : (
                                    <span style={{ color: '#d97706', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>⏳ Belum Lunas</span>
                                  )
                                ) : (
                                  <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>✅ Lunas</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto', minWidth: 0 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <SectionTitle>📦 Barang Terjual</SectionTitle>
                  </div>
                  {harian.barang_terjual?.length > 0 ? (
                    <>
                      {}
                      <div style={{ width: '100%', height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={harian.barang_terjual.slice(0, 6).map(b => ({
                                ...b,
                                total_qty:   parseFloat(b.total_qty)   || 0,
                                total_nilai: parseFloat(b.total_nilai) || 0,
                              }))}
                              dataKey="total_qty"
                              nameKey="nama"
                              cx="50%"
                              cy="50%"
                              outerRadius={55}
                              label={({ nama, percent }) => {
                                if (!nama || percent < 0.05) return '';
                                return `${nama.split(' ')[0]} ${(percent * 100).toFixed(0)}%`;
                              }}
                              labelLine={false}
                              style={{ fontSize: 12 }}
                            >
                              {harian.barang_terjual.slice(0, 6).map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [`${v} unit`, n]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {harian.barang_terjual.slice(0, 5).map((b, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '6px 12px', borderBottom: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: 13 }}>{b.nama}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{Math.floor(b.total_qty)} {b.satuan}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatRp(b.total_nilai)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                      Tidak ada penjualan.
                    </div>
                  )}
                </div>

              </div>{}
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Tidak ada data untuk tanggal ini.
            </div>
          )}

        </div>
      )}

      {}
      {tab === 'stok' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            <KartuMetrik icon="⚠️" label="Total Item Menipis" nilai={stokMenipis.length}                          warna="#f59e0b" sub="perlu segera restok" />
            <KartuMetrik icon="🚨" label="Stok Habis"         nilai={stokMenipis.filter(b => b.stok <= 0).length} warna="#dc2626" sub="stok = 0" />
            <KartuMetrik icon="📦" label="Stok Aman"          nilai={stokMenipis.filter(b => b.stok > 0).length}  warna="#f59e0b" sub="masih ada tapi hampir habis" />
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <SectionTitle>📋 Daftar Barang Stok Menipis</SectionTitle>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Stok ≤ Stok Minimum</span>
            </div>

            {stokMenipis.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>Semua stok aman!</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Tidak ada barang yang perlu segera direstok.</div>
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#fef2f2' }}>
                    <tr>
                      {['Kode','Nama Barang','Stok Saat Ini','Stok Minimum','Kekurangan','Status'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #fecaca' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stokMenipis.map(b => {
                      const kekurangan = b.stok_minimum - b.stok;
                      const habis      = b.stok <= 0;
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: habis ? '#fff5f5' : '#fff' }}>
                          <td style={{ padding: '11px 16px', color: '#94a3b8', fontSize: 12 }}>{b.kode_barang || '—'}</td>
                          <td style={{ padding: '11px 16px', fontWeight: 500 }}>{b.nama}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span style={{ fontWeight: 700, color: habis ? '#dc2626' : '#f59e0b', fontSize: 15 }}>{b.stok}</span>
                            <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>{b.satuan}</span>
                          </td>
                          <td style={{ padding: '11px 16px', color: '#64748b' }}>{b.stok_minimum} {b.satuan}</td>
                          <td style={{ padding: '11px 16px', fontWeight: 600, color: '#dc2626' }}>+{Math.max(0, kekurangan)} {b.satuan}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span style={{
                              background: habis ? '#fef2f2' : '#fef9c3',
                              color:      habis ? '#dc2626' : '#92400e',
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            }}>{habis ? '🚨 HABIS' : '⚠️ MENIPIS'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>
            💡 <strong>Tips:</strong> Segera lakukan pembelian dari supplier untuk barang-barang di atas. Klik tab <strong>Pembelian</strong> untuk mencatat restok.
          </div>

        </div>
      )}

      {}
      {tab === 'piutang' && <PelangganLedgerPage />}

      {}
      {notaId && (<NotaModal transaksiId={notaId} nomorHarian={notaNomor} onClose={() => { setNotaId(null); setNotaNomor(null); }} onLunasSuccess={() => {
      muatHarian(tanggal);
      muatLabaRugi(bulan);
      muatTren();
    }}
  />
)}
    </div>
  );
}