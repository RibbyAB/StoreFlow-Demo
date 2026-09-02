import React, { useState, useEffect, useCallback } from 'react';
import { getPenjualanById, cicilPenjualan, getCicilanPenjualan } from '../services/api';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RECEIPT_LOGO } from '../assets/receiptLogo';
import { toast } from 'react-hot-toast';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/* ─── NOTA MODAL ──────────────────────────────────────────────── */
export default function NotaModal({ transaksiId, nomorHarian, onClose, onLunasSuccess, hideCicilHint }) {
  const { user } = useAuth();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [metodeLunas,    setMetodeLunas]    = useState('tunai');
  const [prosesLunas,    setProsesLunas]    = useState(false);
  const [lunasBerhasil,  setLunasBerhasil]  = useState(false);

  const [showBatalkan,   setShowBatalkan]   = useState(false);
  const [alasanBatal,    setAlasanBatal]    = useState('');
  const [prosesBatal,    setProsesBatal]    = useState(false);
  const [batalBerhasil,  setBatalBerhasil]  = useState(false);

  const [prosesHapus,    setProsesHapus]    = useState(false);

  // Cicilan buat pelanggan Umum/tanpa nama -- gak bisa ditrack lewat Piutang Pelanggan
  // (soalnya emang sengaja dikecualikan dari situ), jadi cicil-nya langsung di sini aja.
  const [showCicilPanel, setShowCicilPanel] = useState(false);
  const [jumlahCicil,    setJumlahCicil]    = useState('');
  const [prosesCicil,    setProsesCicil]    = useState(false);
  const [cicilanList,    setCicilanList]    = useState([]);

  // Muat detail transaksi setiap kali transaksiId berubah
  const muatDetail = useCallback(() => {
    if (!transaksiId) return;
    setLoading(true);
    setError('');
    setShowKonfirmasi(false);
    setLunasBerhasil(false);
    setShowBatalkan(false);
    setBatalBerhasil(false);
    setAlasanBatal('');
    setShowCicilPanel(false);
    setJumlahCicil('');
    getPenjualanById(transaksiId)
      .then(r => {
        setData(r.data.data);
        if (r.data.data?.status === 'belum_lunas') {
          getCicilanPenjualan(transaksiId).then(res => setCicilanList(res.data.data || [])).catch(() => {});
        } else {
          setCicilanList([]);
        }
      })
      .catch(() => setError('Gagal memuat detail transaksi.'))
      .finally(() => setLoading(false));
  }, [transaksiId]);

  useEffect(() => { muatDetail(); }, [muatDetail]);

  /* ── Bayar cicilan sebagian (khusus pelanggan Umum/tanpa nama) ── */
  const handleCicilan = async () => {
    const jml = Number(jumlahCicil);
    const sisa = Number(data.total) - Number(data.total_dibayar || 0);
    if (!jml || jml <= 0) {
      setError('Jumlah cicilan harus lebih dari 0.');
      return;
    }
    if (jml > sisa + 0.5) {
      setError(`Jumlah melebihi sisa piutang (${formatRp(sisa)}).`);
      return;
    }
    setProsesCicil(true);
    setError('');
    try {
      const res = await cicilPenjualan(transaksiId, { jumlah: jml, tanggal: new Date().toISOString().slice(0, 10) });

      if (res.data.lunas) {
        setData(prev => ({ ...prev, status: 'lunas', total_dibayar: prev.total }));
        setLunasBerhasil(true);
      } else {
        setData(prev => ({ ...prev, total_dibayar: Number(prev.total_dibayar || 0) + jml }));
        getCicilanPenjualan(transaksiId).then(r => setCicilanList(r.data.data || [])).catch(() => {});
      }
      setShowCicilPanel(false);
      setJumlahCicil('');

      if (typeof onLunasSuccess === 'function') onLunasSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mencatat cicilan. Coba lagi.');
    } finally {
      setProsesCicil(false);
    }
  };

  /* ── Cetak nota ── */
  const cetak = () => {
    if (!data) return;
    // Gunakan metode_bayar terkini dari state data (sudah diupdate setelah lunasi)
    const metodeTampil = data.metode_bayar === 'hutang'
      ? 'Hutang (Belum Lunas)'
      : data.metode_bayar;
    const w = window.open('', '_blank', 'width=260,height=640,left=0,top=0');
    w.document.write(`
      <html><head><title>Nota #${data.id}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        *{margin:0;padding:0;box-sizing:border-box}
        html, body{
          width: 58mm;
          font-family:'Courier New',monospace;
          font-size:13px;
          line-height:1.5;
          color:#000;
          font-weight:700;
        }
        body{padding:2mm 3mm}
        h2{text-align:center;font-size:17px;margin-bottom:2px;letter-spacing:0.5px;font-weight:900}
        .sub{text-align:center;font-size:12px;color:#000;margin-bottom:6px;font-weight:700}
        .divider{border:none;border-top:2px dashed #000;margin:6px 0}
        .row{display:flex;justify-content:space-between;gap:6px;margin-bottom:3px;font-size:12.5px;font-weight:700}
        .row span:first-child{white-space:nowrap}
        .row span:last-child{text-align:right;word-break:break-word}
        .item-name{font-weight:900;margin-bottom:1px;font-size:13px;word-break:break-word}
        .item-line{display:flex;justify-content:space-between;gap:6px;font-size:12.5px;font-weight:700}
        .item-line span:last-child{white-space:nowrap}
        .total-row{display:flex;justify-content:space-between;font-weight:900;font-size:16px;margin-top:3px}
        .footer{text-align:center;margin-top:8px;font-size:12px;color:#000;font-weight:700}
        .notice{text-align:center;margin-top:6px;font-size:11.5px;font-weight:900}
        .lunas-badge{text-align:center;margin:6px 0;font-weight:900;font-size:13px;color:#000;border:2px solid #000;border-radius:4px;padding:4px}
      </style></head><body>
      <img src="${RECEIPT_LOGO}" style="display:block;margin:0 auto 4px auto;width:80px;height:auto;" />
      <h2>TB. PELITA JAYA</h2>
      <p class="sub">Nota Penjualan</p>
      <hr class="divider"/>
      <div class="row"><span>No.</span><span>#${nomorHarian ?? data.id}</span></div>
      <div class="row"><span>Pelanggan</span><span>${data.pelanggan || 'Umum'}</span></div>
      <div class="row"><span>Tgl</span><span>${new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })} ${new Date(data.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</span></div>
      <div class="row"><span>Metode</span><span style="text-transform:capitalize">${metodeTampil}</span></div>
      <div class="row"><span>Status</span><span>${data.status === 'lunas' ? 'LUNAS' : 'HUTANG'}</span></div>
      <hr class="divider"/>
      ${(data.items || []).map(i => `
        <p class="item-name">${i.nama_barang}</p>
        <div class="item-line">
          <span>${i.qty} ${i.satuan} x ${formatRp(i.harga_jual)}</span>
          <span>${formatRp(i.qty * i.harga_jual)}</span>
        </div>
      `).join('')}
      <hr class="divider"/>
      <div class="row"><span>Subtotal</span><span>${formatRp(data.subtotal)}</span></div>
      ${data.diskon > 0 ? `<div class="row"><span>Diskon</span><span>-${formatRp(data.diskon)}</span></div>` : ''}
      <div class="total-row"><span>TOTAL</span><span>${formatRp(data.total)}</span></div>
      ${data.status === 'lunas' ? '<div class="lunas-badge">✓ LUNAS</div>' : ''}
      <hr class="divider"/>
      <p class="footer">CP: 085768520718 (CHAT)</p>
      <p class="footer">Terima kasih kunjungannya.</p>
<p class="notice" style="font-weight:900;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan!!!</p>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  /* ── Proses pelunasan — kirim metode ke backend, lalu refresh parent ── */
  const handleLunasi = async () => {
    setProsesLunas(true);
    try {
      await api.put(`/penjualan/${transaksiId}/lunasi`, { metode_bayar: metodeLunas });

      setData(prev => ({ ...prev, metode_bayar: metodeLunas, status: 'lunas' }));
      setLunasBerhasil(true);
      setShowKonfirmasi(false);

      if (typeof onLunasSuccess === 'function') {
        onLunasSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal melunasi transaksi. Coba lagi.');
    } finally {
      setProsesLunas(false);
    }
  };

  /* ── Batalkan transaksi (salah input) — kembalikan stok & tandai dibatalkan ── */
  const handleBatalkan = async () => {
    setProsesBatal(true);
    setError('');
    try {
      await api.put(`/penjualan/${transaksiId}/batalkan`, { alasan: alasanBatal });

      setData(prev => ({ ...prev, status: 'dibatalkan' }));
      setBatalBerhasil(true);
      setShowBatalkan(false);

      if (typeof onLunasSuccess === 'function') {
        onLunasSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membatalkan transaksi. Coba lagi.');
    } finally {
      setProsesBatal(false);
    }
  };

  /* ── Hapus permanen transaksi yang sudah dibatalkan (beresin riwayat) ── */
  const handleHapus = () => {
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Hapus Permanen Transaksi Ini?</strong>
        <p style={{ marginTop: '5px', marginBottom: '15px' }}>
          Data transaksi yang dihapus tidak bisa dikembalikan lagi.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { jalankanHapus(); toast.dismiss(t.id); }}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
          >
            Ya, Hapus Permanen
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
          >
            Batal
          </button>
        </div>
      </span>
    ), { duration: Infinity, position: 'top-center' });
  };

  const jalankanHapus = async () => {
    setProsesHapus(true);
    setError('');
    try {
      await api.delete(`/penjualan/${transaksiId}`);
      toast.success('Transaksi berhasil dihapus permanen.', { duration: 3000, position: 'top-center' });
      if (typeof onLunasSuccess === 'function') onLunasSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus transaksi. Coba lagi.', { position: 'top-center' });
      setError(err.response?.data?.message || 'Gagal menghapus transaksi. Coba lagi.');
      setProsesHapus(false);
    }
  };

  /* ── Helpers UI ── */
  const isHutang     = data?.metode_bayar === 'hutang' && data?.status !== 'lunas' && data?.status !== 'dibatalkan';
  const isUmum       = !data?.pelanggan || data.pelanggan.trim() === '' || data.pelanggan.trim().toLowerCase().includes('umum');
  const isDibatalkan = data?.status === 'dibatalkan';
  const bisaBatalkan  = user?.role === 'owner' && data && !isDibatalkan;
  const statusBadge = data
    ? data.status === 'dibatalkan'
      ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '✕ Dibatalkan' }
      : data.status === 'lunas'
      ? { bg: '#f0fdf4', color: '#16a34a', border: '#86efac', label: '✓ Lunas' }
      : { bg: '#fef9c3', color: '#92400e', border: '#fde68a', label: '⏳ Hutang' }
    : null;

  const METODE_BAYAR = [
    { key: 'tunai',    icon: '💵', label: 'Tunai' },
    { key: 'transfer', icon: '🏦', label: 'Transfer' },
    { key: 'qris',     icon: '📱', label: 'QRIS' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header modal ── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>Detail Transaksi #{nomorHarian ?? transaksiId}</div>
            {data && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{new Date(data.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} | {new Date(data.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Badge status langsung di header agar selalu terlihat */}
            {statusBadge && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                {statusBadge.label}
              </span>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* ── Banner sukses setelah pembatalan ── */}
        {batalBerhasil && (
          <div style={{ margin: '16px 24px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Transaksi Dibatalkan!</div>
              <div style={{ fontSize: 12, color: '#f87171' }}>Stok barang telah dikembalikan secara otomatis. Data laporan sudah diperbarui.</div>
            </div>
          </div>
        )}

        {/* ── Banner info jika transaksi memang sudah berstatus dibatalkan ── */}
        {isDibatalkan && !batalBerhasil && (
          <div style={{ margin: '16px 24px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#dc2626' }}>
            ❌ Transaksi ini telah dibatalkan{data?.alasan_batal ? `: "${data.alasan_batal}"` : '.'}
          </div>
        )}

        {isDibatalkan && user?.role === 'owner' && (
          <div style={{ margin: '10px 24px 0' }}>
            <button onClick={handleHapus} disabled={prosesHapus} style={{
              width: '100%', padding: 10, background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 8, cursor: prosesHapus ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13.5
            }}>
              {prosesHapus ? 'Menghapus...' : '🗑️ Hapus Permanen dari Riwayat'}
            </button>
          </div>
        )}

        {/* ── Banner sukses setelah pelunasan ── */}
        {lunasBerhasil && (
          <div style={{ margin: '16px 24px 0', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>Pelunasan Berhasil!</div>
              <div style={{ fontSize: 12, color: '#4ade80' }}>Transaksi telah lunas via <strong style={{ textTransform: 'capitalize' }}>{metodeLunas}</strong>. Data laporan sudah diperbarui.</div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>⏳ Memuat nota...</div>}
          {error   && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}

          {data && !loading && (
            <>
              {/* Info grid */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {[
                  { label: 'Kasir',     val: data.kasir     || '—' },
                  { label: 'Pelanggan', val: data.pelanggan || 'Umum' },
                  { label: 'Metode',    val: data.metode_bayar },
                  { label: 'Status',    val: data.status === 'dibatalkan' ? 'Dibatalkan' : data.status === 'lunas' ? 'Lunas' : 'Hutang' },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', textTransform: 'capitalize' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Tabel item */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Barang yang Dibeli</div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      {['Barang', 'Qty', 'Harga Sat.', 'Subtotal'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Barang' ? 'left' : 'right', color: '#64748b', fontWeight: 500, fontSize: 11, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items || []).length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data item.</td></tr>
                    ) : (data.items || []).map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 500 }}>{item.nama_barang}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.satuan}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{item.qty}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>{formatRp(item.harga_jual)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{formatRp(item.qty * item.harga_jual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ringkasan harga */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#64748b' }}>
                  <span>Subtotal</span><span>{formatRp(data.subtotal)}</span>
                </div>
                {data.diskon > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#dc2626' }}>
                    <span>Diskon</span><span>−{formatRp(data.diskon)}</span>
                  </div>
                )}
                {data.catatan && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' }}>
                    Catatan: {data.catatan}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                  <span>TOTAL</span><span style={{ color: '#2563eb' }}>{formatRp(data.total)}</span>
                </div>
              </div>

              {/* ── Panel konfirmasi pelunasan (muncul setelah klik "Lunasi Hutang") ── */}
              {isHutang && showKonfirmasi && (
                <div style={{ marginTop: 16, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>⚠️ Konfirmasi Pelunasan</div>
                  <div style={{ fontSize: 13, color: '#78350f', marginBottom: 14 }}>
                    Pilih metode pembayaran yang digunakan pelanggan untuk melunasi sisa hutang sebesar <strong>{formatRp(Number(data.total) - Number(data.total_dibayar || 0))}</strong>.
                  </div>

                  {/* Pilih metode pelunasan */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Metode Pembayaran</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {METODE_BAYAR.map(m => (
                      <button key={m.key} onClick={() => setMetodeLunas(m.key)}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .12s',
                          background: metodeLunas === m.key ? '#1e293b' : '#fff',
                          color:      metodeLunas === m.key ? '#fff'    : '#64748b',
                          border:     metodeLunas === m.key ? '1.5px solid #1e293b' : '1.5px solid #e2e8f0',
                          boxShadow:  metodeLunas === m.key ? '0 2px 8px rgba(30,41,59,.15)' : 'none',
                        }}
                      >{m.icon} {m.label}</button>
                    ))}
                  </div>

                  {/* Ringkasan konfirmasi */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Sisa yang dilunasi</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatRp(Number(data.total) - Number(data.total_dibayar || 0))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Via</span>
                      <span style={{ fontWeight: 600, color: '#2563eb', textTransform: 'capitalize' }}>{metodeLunas}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowKonfirmasi(false)}
                      style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                      Batal
                    </button>
                    <button onClick={handleLunasi} disabled={prosesLunas}
                      style={{ flex: 2, padding: '10px 0', background: prosesLunas ? '#86efac' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: prosesLunas ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                      {prosesLunas ? '⏳ Memproses...' : `✅ Ya, Lunas via ${metodeLunas.charAt(0).toUpperCase() + metodeLunas.slice(1)}`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Panel konfirmasi pembatalan transaksi (khusus owner) ── */}
              {bisaBatalkan && showBatalkan && (
                <div style={{ marginTop: 16, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', marginBottom: 4 }}>⚠️ Batalkan Transaksi Ini?</div>
                  <div style={{ fontSize: 13, color: '#991b1b', marginBottom: 14 }}>
                    Aksi ini akan mengembalikan stok semua barang di transaksi #{transaksiId} dan menandai transaksi sebagai <strong>dibatalkan</strong>. Gunakan untuk transaksi yang salah input. Aksi ini tidak dapat dibatalkan kembali.
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alasan Pembatalan (opsional)</div>
                  <input
                    type="text"
                    value={alasanBatal}
                    onChange={e => setAlasanBatal(e.target.value)}
                    placeholder="Contoh: salah input jumlah barang"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #fca5a5', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowBatalkan(false)}
                      style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                      Batal
                    </button>
                    <button onClick={handleBatalkan} disabled={prosesBatal}
                      style={{ flex: 2, padding: '10px 0', background: prosesBatal ? '#fca5a5' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: prosesBatal ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                      {prosesBatal ? '⏳ Memproses...' : '🗑️ Ya, Batalkan Transaksi'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {data && !loading && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            {isHutang && Number(data.total_dibayar) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8 }}>
                <span style={{ color: '#166534' }}>Sudah dicicil {formatRp(data.total_dibayar)}</span>
                <span style={{ fontWeight: 700, color: '#b45309' }}>Sisa {formatRp(Number(data.total) - Number(data.total_dibayar))}</span>
              </div>
            )}

            {/* Tombol "Lunasi Hutang" — tampil hanya jika masih hutang & panel konfirmasi belum buka */}
            {isHutang && !showKonfirmasi && (
              <button onClick={() => { setShowKonfirmasi(true); setMetodeLunas('tunai'); setError(''); }}
                style={{ width: '100%', padding: '12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#d97706'}
                onMouseLeave={e => e.currentTarget.style.background = '#f59e0b'}
              >
                💳 Lunasi Hutang
              </button>
            )}

            {/* Pelanggan "Umum"/tanpa nama gak bisa ditrack lewat Piutang Pelanggan (sengaja dikecualikan
                di situ karena gak ada identitas jelas), jadi cicil-nya langsung di sini aja. */}
            {isHutang && isUmum && !showKonfirmasi && !showCicilPanel && (
              <button onClick={() => { setShowCicilPanel(true); setJumlahCicil(''); setError(''); }}
                style={{ width: '100%', padding: '11px', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}
              >
                💰 Bayar Cicilan
              </button>
            )}

            {isHutang && isUmum && showCicilPanel && (
              <div style={{ marginBottom: 10, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12.5, color: '#1e40af', marginBottom: 10 }}>
                  Sisa piutang: <strong>{formatRp(Number(data.total) - Number(data.total_dibayar || 0))}</strong>
                </div>
                <input
                  type="number" min="1" autoFocus
                  value={jumlahCicil}
                  onChange={e => setJumlahCicil(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !prosesCicil) { e.preventDefault(); handleCicilan(); } }}
                  placeholder={`Maks ${Number(data.total) - Number(data.total_dibayar || 0)}`}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 14, marginBottom: 10, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowCicilPanel(false); setError(''); }}
                    style={{ flex: 1, padding: '9px 0', background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
                    Batal
                  </button>
                  <button onClick={handleCicilan} disabled={prosesCicil}
                    style={{ flex: 2, padding: '9px 0', background: prosesCicil ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: prosesCicil ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {prosesCicil ? 'Memproses...' : 'Simpan Cicilan'}
                  </button>
                </div>

                {cicilanList.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Riwayat Cicilan</div>
                    {cicilanList.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#1e3a8a', marginBottom: 3 }}>
                        <span>{new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span style={{ fontWeight: 600 }}>{formatRp(c.jumlah)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isHutang && !isUmum && !showKonfirmasi && !hideCicilHint && (
              <div style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: -4, marginBottom: 10 }}>
                Mau bayar cicilan sebagian? Buka halaman <strong>Piutang Pelanggan</strong>.
              </div>
            )}

            {/* Tombol "Batalkan Transaksi" — khusus owner, jika belum dibatalkan & panel batal belum buka */}
            {bisaBatalkan && !showBatalkan && (
              <button onClick={() => { setShowBatalkan(true); setAlasanBatal(''); setError(''); }}
                style={{ width: '100%', padding: '12px', background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                🗑️ Batalkan Transaksi (Salah Input)
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose}
                style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#64748b' }}>
                Tutup
              </button>
              <button onClick={cetak} disabled={isDibatalkan}
                style={{ flex: 2, padding: '10px 0', background: isDibatalkan ? '#94a3b8' : '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: isDibatalkan ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                🖨️ Cetak Struk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}