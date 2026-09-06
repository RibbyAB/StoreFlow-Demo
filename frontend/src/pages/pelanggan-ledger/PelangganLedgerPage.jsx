import React, { useEffect, useState } from 'react';
import { getDaftarPelangganLedger, getDetailPelangganLedger, cicilPenjualan, getCicilanPenjualan, hapusCicilanPenjualan } from '../../services/api';
import { RECEIPT_LOGO } from '../../assets/receiptLogo';
import { useAuth } from '../../context/AuthContext';
import { usePengaturan } from '../../context/PengaturanContext';
import { toast } from 'react-hot-toast';
import NotaModal from '../../components/NotaModal';
import useIsMobile from '../../hooks/useIsMobile';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n || 0);


function DetailPelangganModal({ nama, onClose }) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { pengaturan } = usePengaturan();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);

  const [cicilOpenId, setCicilOpenId] = useState(null);


  const [riwayatOpenId, setRiwayatOpenId] = useState(null);
  const [notaId, setNotaId] = useState(null);
  const [notaNomor, setNotaNomor] = useState(null);
  const [jumlahCicil, setJumlahCicil] = useState('');
  const [metodeCicil, setMetodeCicil] = useState('tunai');
  const [savingCicil, setSavingCicil] = useState(false);
  const [cicilanMap, setCicilanMap] = useState({});

  const muat = () => {
    if (!data) setLoading(true);
    getDetailPelangganLedger(nama)
      .then(r => {
        setData(r.data);

        setSelected(r.data.transaksi.filter(t => t.status === 'belum_lunas').map(t => t.id));
      })
      .catch(() => setError('Gagal memuat data pelanggan.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { muat();  }, [nama]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bukaCicil = (transaksiId) => {
    if (cicilOpenId === transaksiId) {
      setCicilOpenId(null);
      return;
    }
    setCicilOpenId(transaksiId);
    setJumlahCicil('');
    setMetodeCicil('tunai');
    muatCicilan(transaksiId);
  };


  const bukaLunasiSemua = (t) => {
    const sisa = Number(t.total) - Number(t.total_dibayar || 0);
    setCicilOpenId(t.id);
    setJumlahCicil(String(sisa));
    setMetodeCicil('tunai');
    muatCicilan(t.id);
  };


  const toggleRiwayat = (transaksiId) => {
    if (riwayatOpenId === transaksiId) {
      setRiwayatOpenId(null);
      return;
    }
    setRiwayatOpenId(transaksiId);
    muatCicilan(transaksiId);
  };


  const muatCicilan = (transaksiId) => {
    getCicilanPenjualan(transaksiId)
      .then(r => setCicilanMap(prev => ({ ...prev, [transaksiId]: r.data.data || [] })))
      .catch(() => {});
  };

  const simpanCicilan = async (t) => {
    const jml = Number(jumlahCicil);
    const sisa = Number(t.total) - Number(t.total_dibayar || 0);
    if (!jml || jml <= 0) {
      toast.error('Jumlah harus lebih dari 0.', { position: 'top-center' });
      return;
    }
    if (jml > sisa + 0.5) {
      toast.error(`Jumlah melebihi sisa piutang (${formatRp(sisa)}).`, { position: 'top-center' });
      return;
    }
    setSavingCicil(true);
    try {
      const res = await cicilPenjualan(t.id, { jumlah: jml, metode_bayar: metodeCicil, tanggal: new Date().toISOString().slice(0, 10) });
      toast.success(res.data.message || 'Cicilan tercatat.', { position: 'top-center' });
      setJumlahCicil('');
      if (res.data.lunas) {
        setCicilOpenId(null);
      } else {
        muatCicilan(t.id);
      }
      muat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mencatat cicilan.', { position: 'top-center' });
    } finally {
      setSavingCicil(false);
    }
  };

  const hapusCicilanHandler = (transaksiId, cicilanId) => {
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Hapus Catatan Cicilan Ini?</strong>
        <p style={{ marginTop: '5px', marginBottom: '15px' }}>Sisa piutang akan bertambah kembali.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { jalankanHapusCicilan(transaksiId, cicilanId); toast.dismiss(t.id); }}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
          >
            Ya, Hapus
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

  const jalankanHapusCicilan = async (transaksiId, cicilanId) => {
    try {
      await hapusCicilanPenjualan(transaksiId, cicilanId);
      toast.success('Cicilan berhasil dihapus.', { position: 'top-center' });
      muatCicilan(transaksiId);
      muat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus cicilan.', { position: 'top-center' });
    }
  };

  const cetak = () => {
    if (!data) return;
    const w = window.open('', '_blank', 'width=760,height=900');
    w.document.write(`
      <html><head><title>Rekap ${data.nama_pelanggan}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 28px; color:#111; }
        h1 { font-size:20px; margin-bottom:2px; }
        .sub { font-size:13px; color:#555; margin-bottom:18px; }
        table { width:100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12.5px; text-align:left; }
        th { background:#f1f5f9; font-weight:700; }
        .right { text-align:right; }
        .ringkasan { display:flex; gap: 24px; margin: 14px 0 20px; font-size: 13px; }
        .ringkasan div b { display:block; font-size:15px; margin-top:2px; }
        .status-lunas { color:#16a34a; font-weight:700; }
        .status-hutang { color:#d97706; font-weight:700; }
      </style></head><body>
      <h1>Rekap Transaksi Pelanggan</h1>
      <div class="sub">${data.nama_pelanggan} — dicetak ${new Date().toLocaleString('id-ID')}</div>
      <div class="ringkasan">
        <div>Total Transaksi<b>${data.ringkasan.total_transaksi}</b></div>
        <div>Total Belanja<b>${formatRp(data.ringkasan.total_belanja)}</b></div>
        <div>Sudah Lunas<b style="color:#16a34a">${formatRp(data.ringkasan.total_lunas)}</b></div>
        <div>Sisa Hutang<b style="color:#d97706">${formatRp(data.ringkasan.total_hutang)}</b></div>
      </div>
      <table>
        <thead><tr>
          <th>No.</th><th>Tanggal</th><th>Metode</th><th>Status</th>
          <th class="right">Jumlah</th><th class="right">Sisa Hutang Berjalan</th>
        </tr></thead>
        <tbody>
          ${data.transaksi.slice().reverse().map(t => `
            <tr>
              <td>#${t.nomor_transaksi ?? t.id}</td>
              <td>${new Date(t.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</td>
              <td style="text-transform:capitalize">${t.metode_bayar}</td>
              <td class="${t.status === 'lunas' ? 'status-lunas' : 'status-hutang'}">${t.status === 'lunas' ? 'Lunas' : 'Hutang'}</td>
              <td class="right">${formatRp(t.total)}</td>
              <td class="right">${formatRp(t.saldo_berjalan)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const cetakStruk = () => {
    if (!data) return;
    const daftar = data.transaksi.filter(t => selected.includes(t.id));
    if (daftar.length === 0) return;
    const sisa = (t) => Number(t.total) - Number(t.total_dibayar || 0);
    const totalDitagih = daftar.reduce((s, t) => s + sisa(t), 0);

    const w = window.open('', '_blank', 'width=260,height=600,left=0,top=0');
    w.document.write(`
      <html><head><title>Struk Piutang ${data.nama_pelanggan}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body {
          width: 58mm;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          color:#000;
          font-weight: 700;
        }
        body { padding: 2mm 3mm; }
        h2 { text-align:center; font-size:17px; margin-bottom:2px; letter-spacing: 0.5px; font-weight: 900; }
        .sub { text-align:center; font-size:12px; color:#000; margin-bottom:6px; font-weight:700; }
        .divider { border:none; border-top:2px dashed #000; margin:6px 0; }
        .row { display:flex; justify-content:space-between; gap: 6px; margin-bottom:3px; font-weight:700; }
        .row span:first-child { white-space: nowrap; }
        .row span:last-child { text-align: right; word-break: break-word; }
        .item-line { display:flex; justify-content:space-between; gap:6px; font-size: 12.5px; font-weight:700; margin-bottom:4px; }
        .item-line span:last-child { white-space: nowrap; }
        .total-row { display:flex; justify-content:space-between; font-weight:900; font-size:16px; margin-top:3px; }
        .footer { text-align:center; margin-top:8px; font-size:12px; color:#000; font-weight:700; }
        .notice { text-align:center; margin-top:6px; font-size:11.5px; font-weight:900; }
      </style></head><body>
      <img src="${RECEIPT_LOGO}" style="display:block;margin:0 auto 4px auto;width:80px;height:auto;" />
      <h2>${pengaturan?.nama_toko || 'Nama Toko'}</h2>
      <p class="sub">Struk Piutang Pelanggan</p>
      <hr class="divider"/>
      <div class="row"><span>Pelanggan</span><span>${data.nama_pelanggan}</span></div>
      <div class="row"><span>Tgl Cetak</span><span>${new Date().toLocaleString('id-ID')}</span></div>
      <hr class="divider"/>
      ${daftar.map(t => `
        <div class="item-line">
          <span>${new Date(t.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}${t.status === 'belum_lunas' ? '' : ' (lunas)'}${Number(t.total_dibayar) > 0 ? ' (sdh dicicil)' : ''}</span>
          <span>${formatRp(sisa(t))}</span>
        </div>
      `).join('')}
      <hr class="divider"/>
      <div class="total-row"><span>TOTAL DITAGIH</span><span>${formatRp(totalDitagih)}</span></div>
      <hr class="divider"/>
      ${pengaturan?.telepon ? `<p class="footer">CP: ${pengaturan.telepon}</p>` : ''}
      <p class="notice">Mohon segera melunasi tagihan. Terima kasih.</p>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: isMobile ? '94vw' : 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: isMobile ? '14px 16px 12px' : '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{data?.nama_pelanggan || nama}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>⏳ Memuat data...</div>}
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}

          {data && !loading && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Total Belanja</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{formatRp(data.ringkasan.total_belanja)}</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#b91c1c' }}>Sisa Hutang</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#dc2626' }}>{formatRp(data.ringkasan.total_hutang)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Riwayat Transaksi ({data.ringkasan.total_transaksi})
                </div>
                <div style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>
                  {selected.length} dipilih untuk ditagih
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                {data.transaksi.map((t, i) => (
                  <React.Fragment key={t.id}>
                    <div
                      onClick={e => {


                        if (t.status !== 'belum_lunas') return;
                        if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
                        toggleSelect(t.id);
                      }}
                      style={{
                        padding: cicilOpenId === t.id ? '10px 14px 0' : '10px 14px',
                        borderBottom: (i < data.transaksi.length - 1 || cicilOpenId === t.id) ? '1px solid #f1f5f9' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: selected.includes(t.id) ? '#eff6ff' : 'transparent',
                        cursor: t.status === 'belum_lunas' ? 'pointer' : 'default'
                      }}>
                      {t.status === 'belum_lunas' ? (
                        <input
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                        />
                      ) : (
                        <div style={{ width: 16, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                              #{t.nomor_transaksi ?? t.id} · {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{t.metode_bayar}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              {formatRp(t.status === 'belum_lunas' ? Number(t.total) - Number(t.total_dibayar || 0) : t.total)}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: t.status === 'lunas' ? '#16a34a' : '#d97706' }}>
                              {t.status === 'lunas' ? '✅ Lunas' : '⏳ Hutang'}
                            </div>
                            {t.status === 'lunas' && t.tgl_pelunasan && (
                              <div style={{ fontSize: 10.5, color: '#16a34a' }}>
                                {new Date(t.tgl_pelunasan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                            {t.status === 'belum_lunas' && Number(t.total_dibayar) > 0 && (
                              <div style={{ fontSize: 10.5, color: '#16a34a' }}>dicicil {formatRp(t.total_dibayar)}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => { setNotaId(t.id); setNotaNomor(t.nomor_transaksi ?? null); }} style={{
                            fontSize: 11, fontWeight: 600, color: '#475569', background: '#f8fafc',
                            border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap'
                          }}>🧾 Nota</button>
                          {Number(t.total_dibayar) > 0 && (
                            <button onClick={() => toggleRiwayat(t.id)} style={{
                              fontSize: 11, fontWeight: 600, color: riwayatOpenId === t.id ? '#fff' : '#7c3aed',
                              background: riwayatOpenId === t.id ? '#7c3aed' : '#f5f3ff',
                              border: '1px solid #ddd6fe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}>📜 Riwayat</button>
                          )}
                          {t.status === 'belum_lunas' && user?.role === 'owner' && (
                            <button onClick={() => bukaCicil(t.id)} style={{
                              fontSize: 11, fontWeight: 600, color: '#2563eb', background: '#eff6ff',
                              border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}>💰 Cicil</button>
                          )}
                          {t.status === 'belum_lunas' && user?.role === 'owner' && (
                            <button onClick={() => bukaLunasiSemua(t)} style={{
                              fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#f0fdf4',
                              border: '1px solid #86efac', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap'
                            }}>✅ Lunasi Semua</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {cicilOpenId === t.id && (
                      <div style={{
                        padding: '2px 14px 12px', background: '#eff6ff',
                        borderBottom: i < data.transaksi.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                          {[
                            { key: 'tunai',    icon: '💵', label: 'Tunai' },
                            { key: 'transfer', icon: '🏦', label: 'Transfer' },
                            { key: 'qris',     icon: '📱', label: 'QRIS' },
                          ].map(m => (
                            <button key={m.key} onClick={() => setMetodeCicil(m.key)}
                              style={{
                                flex: 1, padding: '4px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                                background: metodeCicil === m.key ? '#1e293b' : '#fff',
                                color:      metodeCicil === m.key ? '#fff'    : '#64748b',
                                border:     metodeCicil === m.key ? '1.5px solid #1e293b' : '1.5px solid #bfdbfe',
                              }}
                            >{m.icon} {m.label}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <input
                            type="number" min="1" autoFocus
                            value={jumlahCicil}
                            onChange={e => setJumlahCicil(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !savingCicil) { e.preventDefault(); simpanCicilan(t); } }}
                            placeholder={`Maks ${Number(t.total) - Number(t.total_dibayar || 0)}`}
                            style={{ flex: 1, padding: '8px 10px', border: '1px solid #bfdbfe', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }}
                          />
                          <button onClick={() => simpanCicilan(t)} disabled={savingCicil} style={{
                            padding: '8px 14px', background: savingCicil ? '#93c5fd' : '#2563eb', color: '#fff',
                            border: 'none', borderRadius: 7, cursor: savingCicil ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap'
                          }}>{savingCicil ? '...' : 'Simpan'}</button>
                          <button onClick={() => setCicilOpenId(null)} style={{
                            padding: '8px 12px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#64748b'
                          }}>Batal</button>
                        </div>

                        {(cicilanMap[t.id] || []).length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Riwayat Cicilan</div>
                            {cicilanMap[t.id].map(c => (
                              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#1e3a8a' }}>
                                <span>{new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600 }}>{formatRp(c.jumlah)}</span>
                                  {user?.role === 'owner' && (
                                    <button onClick={() => hapusCicilanHandler(t.id, c.id)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {}
                    {riwayatOpenId === t.id && cicilOpenId !== t.id && (
                      <div style={{
                        padding: '8px 14px 12px', background: '#f5f3ff',
                        borderBottom: i < data.transaksi.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                          Riwayat Cicilan
                        </div>
                        {(cicilanMap[t.id] || []).length === 0 ? (
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>Memuat...</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {cicilanMap[t.id].map(c => (
                              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#5b21b6' }}>
                                <span>
                                  {new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {c.metode_bayar && (
                                    <span style={{ marginLeft: 6, fontSize: 10.5, color: '#94a3b8', textTransform: 'capitalize' }}>
                                      ({c.metode_bayar === 'tunai' ? '💵' : c.metode_bayar === 'transfer' ? '🏦' : '📱'} {c.metode_bayar})
                                    </span>
                                  )}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600 }}>{formatRp(c.jumlah)}</span>
                                  {user?.role === 'owner' && (
                                    <button onClick={() => hapusCicilanHandler(t.id, c.id)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  onClick={cetakStruk}
                  disabled={selected.length === 0}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: selected.length === 0 ? '#f1f5f9' : '#fff',
                    color: selected.length === 0 ? '#94a3b8' : '#1e293b',
                    border: `1px solid ${selected.length === 0 ? '#e2e8f0' : '#1e293b'}`,
                    borderRadius: 8, cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 13.5, fontWeight: 600
                  }}>
                  🧾 Cetak Struk ({selected.length})
                </button>
                <button onClick={cetak} style={{ flex: 1, padding: '10px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                  🖨️ Cetak Rekap
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {notaId && (
      <NotaModal
        transaksiId={notaId}
        nomorHarian={notaNomor}
        onClose={() => { setNotaId(null); setNotaNomor(null); }}
        onLunasSuccess={muat}
        hideCicilHint
      />
    )}
    </>
  );
}


export default function PelangganLedgerPage() {
  const isMobile = useIsMobile();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedNama, setSelectedNama] = useState(null);

  const muatData = () => {
    if (list.length === 0) setLoading(true);
    const scrollEl = document.querySelector('main');
    const posisiScroll = scrollEl ? scrollEl.scrollTop : 0;
    getDaftarPelangganLedger()
      .then(r => {
        setList(r.data.data || []);
        requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = posisiScroll; });
      })
      .catch(() => setError('Gagal memuat daftar pelanggan.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { muatData(); }, []);

  const filtered = list.filter(p =>
    p.nama_tampil.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1e293b', margin: 0 }}>Piutang & Riwayat Pelanggan</h2>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Rekap transaksi digabung otomatis berdasarkan nama pelanggan (kecuali "Umum")</div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama pelanggan..."
          style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: isMobile ? '100%' : 240, boxSizing: 'border-box' }}
        />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>⏳ Memuat...</div>}
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
          <table style={{ width: '100%', minWidth: isMobile ? 560 : undefined, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                {['Nama Pelanggan', 'Jumlah Transaksi', 'Total Belanja', 'Sisa Hutang', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data pelanggan.</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.kunci} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13.5 }}>{p.nama_tampil}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.total_transaksi}x</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{formatRp(p.total_belanja)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: Number(p.total_hutang) > 0 ? '#dc2626' : '#16a34a' }}>
                    {Number(p.total_hutang) > 0 ? formatRp(p.total_hutang) : 'Lunas Semua'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setSelectedNama(p.nama_tampil)} style={{
                      background: '#eff6ff', color: '#2563eb', border: 'none',
                      borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600
                    }}>Lihat Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedNama && (
        <DetailPelangganModal nama={selectedNama} onClose={() => { setSelectedNama(null); muatData(); }} />
      )}
    </div>
  );
}