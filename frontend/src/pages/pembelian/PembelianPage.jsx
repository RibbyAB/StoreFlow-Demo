import React, { useEffect, useState, useRef } from 'react';
import { getBarang, getSupplier, createPembelian, getPembelian, cicilPembelian, getCicilanPembelian, hapusCicilanPembelian, lunasiBatchPembelian, batalkanPembelian, hapusPembelian, createBarang } from '../../services/api';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const formatTgl = (d) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const getInfoJatuhTempo = (tanggal) => {
  const hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
  const jt = new Date(tanggal); jt.setHours(0, 0, 0, 0);
  const selisihHari = Math.round((jt - hariIni) / (1000 * 60 * 60 * 24));

  if (selisihHari < 0) return { icon: '🔴', color: '#dc2626', label: `Lewat ${Math.abs(selisihHari)} hari`, urgensi: 3, selisihHari };
  if (selisihHari === 0) return { icon: '🟠', color: '#ea580c', label: 'Jatuh tempo hari ini!', urgensi: 2, selisihHari };
  if (selisihHari <= 7)  return { icon: '🟡', color: '#d97706', label: `${selisihHari} hari lagi`, urgensi: 1, selisihHari };
  return { icon: '⚪', color: '#94a3b8', label: '', urgensi: 0, selisihHari };
};

function DetailModal({ pembelian, onClose, onRefresh }) {
  const { user } = useAuth();
  const [cicilanList, setCicilanList] = useState([]);
  const [showCicilForm, setShowCicilForm] = useState(false);
  const [jumlahCicil, setJumlahCicil] = useState('');
  const [prosesCicil, setProsesCicil] = useState(false);
  const [batalBerhasil, setBatalBerhasil] = useState(false);

  const sisaHutang = pembelian ? Number(pembelian.total) - Number(pembelian.total_dibayar || 0) : 0;

  useEffect(() => {
    if (!pembelian || pembelian.status !== 'hutang') return;
    getCicilanPembelian(pembelian.id).then(r => setCicilanList(r.data.data || [])).catch(() => {});
  }, [pembelian?.id]);

  if (!pembelian) return null;

  const handleBatalkan = () => {
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Batalkan Pembelian Ini?</strong>
        <p style={{ marginTop: '5px', marginBottom: '15px' }}>
          Stok barang yang sudah ditambahkan akan dikurangi kembali. Gunakan untuk pembelian yang salah input. Aksi ini tidak dapat dibatalkan kembali.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { prosesPembatalan(); toast.dismiss(t.id); }}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
          >
            Ya, Batalkan
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

  const prosesPembatalan = async () => {
    try {
      const id = pembelian?.id || pembelian?.pembelian_id;
      if (!id) {
        toast.error("ID Pembelian tidak ditemukan!", { position: 'top-center' });
        return;
      }

      const response = await batalkanPembelian(id, {});

      if (response.status === 200 || response.data?.success) {
        toast.success("Pembelian berhasil dibatalkan. Stok dikembalikan.", {
          duration: 3000,
          position: 'top-center',
        });

        pembelian.status = 'dibatalkan';
        setBatalBerhasil(true);

        if (typeof onRefresh === 'function') onRefresh();
      }
    } catch (error) {
      console.error("Error pembatalan pembelian:", error);
      toast.error(error.response?.data?.message || "Gagal membatalkan pembelian. Coba lagi.", { position: 'top-center' });
    }
  };

  const handleHapus = () => {
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Hapus Permanen Transaksi Ini?</strong>
        <p style={{ marginTop: '5px', marginBottom: '15px' }}>
          Data transaksi yang dibatalkan ini akan dihapus selamanya dari riwayat dan tidak bisa dikembalikan lagi.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { prosesHapus(); toast.dismiss(t.id); }}
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

  const prosesHapus = async () => {
    try {
      const id = pembelian?.id || pembelian?.pembelian_id;
      const response = await hapusPembelian(id);
      if (response.status === 200 || response.data?.success) {
        toast.success("Transaksi berhasil dihapus permanen.", { duration: 3000, position: 'top-center' });
        if (typeof onRefresh === 'function') onRefresh();
        if (typeof onClose === 'function') onClose();
      }
    } catch (error) {
      console.error("Error hapus pembelian:", error);
      toast.error(error.response?.data?.message || "Gagal menghapus transaksi. Coba lagi.", { position: 'top-center' });
    }
  };

  const hapusCicilan = (cicilanId) => {
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Hapus Catatan Cicilan Ini?</strong>
        <p style={{ marginTop: '5px', marginBottom: '15px' }}>Sisa hutang akan bertambah kembali.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { jalankanHapusCicilan(cicilanId); toast.dismiss(t.id); }}
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

  const jalankanHapusCicilan = async (cicilanId) => {
    try {
      const id = pembelian?.id || pembelian?.pembelian_id;
      const res = await hapusCicilanPembelian(id, cicilanId);
      toast.success('Cicilan berhasil dihapus.', { position: 'top-center' });
      getCicilanPembelian(id).then(r => setCicilanList(r.data.data || [])).catch(() => {});
      pembelian.status = 'hutang';
      pembelian.total_dibayar = res.data.total_dibayar;
      if (typeof onRefresh === 'function') onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus cicilan.', { position: 'top-center' });
    }
  };

  const bayarCicilan = async (jumlah) => {
    const jml = Number(jumlah);
    if (!jml || jml <= 0) {
      toast.error('Jumlah harus lebih dari 0.', { position: 'top-center' });
      return;
    }
    if (jml > sisaHutang + 0.5) {
      toast.error(`Jumlah melebihi sisa hutang (${formatRp(sisaHutang)}).`, { position: 'top-center' });
      return;
    }
    setProsesCicil(true);
    try {
      const id = pembelian?.id || pembelian?.pembelian_id;
      const res = await cicilPembelian(id, { jumlah: jml, tanggal: new Date().toISOString().slice(0, 10) });
      toast.success(res.data.message || 'Cicilan tercatat.', { duration: 3000, position: 'top-center' });
      setShowCicilForm(false);
      setJumlahCicil('');
      if (res.data.lunas) {
        if (typeof onRefresh === 'function') onRefresh();
        if (typeof onClose === 'function') onClose();
      } else {

        getCicilanPembelian(id).then(r => setCicilanList(r.data.data || [])).catch(() => {});
        pembelian.total_dibayar = Number(pembelian.total_dibayar || 0) + jml;
        if (typeof onRefresh === 'function') onRefresh();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mencatat cicilan.', { position: 'top-center' });
    } finally {
      setProsesCicil(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 'min(440px, 94vw)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Detail Pembelian</h3>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{new Date(pembelian.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} | {new Date(pembelian.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}>×</button>
        </div>

        {batalBerhasil && (
          <div style={{ marginBottom: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Pembelian Dibatalkan!</div>
              <div style={{ fontSize: 12, color: '#f87171' }}>Stok barang telah dikembalikan secara otomatis.</div>
            </div>
          </div>
        )}

        {pembelian.status === 'hutang' && (
          <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#92400e' }}>Sisa Hutang</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#b45309' }}>{formatRp(sisaHutang)}</span>
            </div>

            {!showCicilForm ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setJumlahCicil(String(sisaHutang)); setShowCicilForm(true); }} style={{
                  flex: 1, padding: 9, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13.5
                }}>✅ Lunasi Semua</button>
                <button onClick={() => { setJumlahCicil(''); setShowCicilForm(true); }} style={{
                  flex: 1, padding: 9, background: '#fff', color: '#b45309', border: '1.5px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13.5
                }}>💰 Bayar Cicilan</button>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12, color: '#92400e', display: 'block', marginBottom: 4 }}>Jumlah Dibayar (Rp)</label>
                <input
                  type="number" min="1" max={sisaHutang} value={jumlahCicil}
                  onChange={e => setJumlahCicil(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !prosesCicil) { e.preventDefault(); bayarCicilan(jumlahCicil); } }}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #fde68a', borderRadius: 7, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowCicilForm(false)} disabled={prosesCicil} style={{
                    flex: 1, padding: 9, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13
                  }}>Batal</button>
                  <button onClick={() => bayarCicilan(jumlahCicil)} disabled={prosesCicil} style={{
                    flex: 2, padding: 9, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: prosesCicil ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13.5
                  }}>{prosesCicil ? 'Memproses...' : 'Simpan Pembayaran'}</button>
                </div>
              </div>
            )}

            {cicilanList.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #fde68a' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Riwayat Cicilan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cicilanList.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#78350f' }}>
                      <span>{formatTgl(c.tanggal)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{formatRp(c.jumlah)}</span>
                        {user?.role === 'owner' && (
                          <button onClick={() => hapusCicilan(c.id)} title="Hapus cicilan ini (salah input)"
                            style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: 13, padding: 0 }}>🗑</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {user?.role === 'owner' && pembelian.status !== 'dibatalkan' && (
        <button onClick={handleBatalkan} style={{ width: '100%', marginTop: 10, padding: 10, background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          🗑️ Batalkan Pembelian (Salah Input)
        </button>
        )}

        {pembelian.status === 'dibatalkan' && !batalBerhasil && (
        <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
          ❌ Pembelian ini telah dibatalkan{pembelian.alasan_batal ? `: "${pembelian.alasan_batal}"` : '.'}
        </div>
        )}

        {user?.role === 'owner' && pembelian.status === 'dibatalkan' && (
        <button onClick={handleHapus} style={{ width: '100%', marginTop: 10, padding: 10, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          🗑️ Hapus Permanen dari Riwayat
        </button>
        )}

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: '#64748b' }}>Supplier</span>
            <span style={{ fontWeight: 500 }}>{pembelian.supplier || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ color: '#64748b' }}>Status</span>
            <span style={{
              background: pembelian.status === 'lunas' ? '#dcfce7' : pembelian.status === 'dibatalkan' ? '#fee2e2' : '#fef9c3',
              color: pembelian.status === 'lunas' ? '#166534' : pembelian.status === 'dibatalkan' ? '#991b1b' : '#854d0e',
              padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
              {pembelian.status}
            </span>
          </div>
          {pembelian.status === 'hutang' && pembelian.jatuh_tempo && (() => {
            const info = getInfoJatuhTempo(pembelian.jatuh_tempo);
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: '#64748b' }}>Jatuh Tempo</span>
                <span style={{ fontWeight: 600, color: info.color }}>
                  {info.icon} {formatTgl(pembelian.jatuh_tempo)}{info.label ? ` (${info.label})` : ''}
                </span>
              </div>
            );
          })()}
          {pembelian.status === 'lunas' && pembelian.jatuh_tempo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: '#64748b' }}>Jatuh Tempo (Awal)</span>
              <span style={{ color: '#94a3b8' }}>{formatTgl(pembelian.jatuh_tempo)}</span>
            </div>
          )}
          {pembelian.status === 'lunas' && pembelian.dilunasi_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: '#64748b' }}>Tanggal Pelunasan</span>
              <span style={{ fontWeight: 600, color: '#16a34a' }}>
                ✓ {new Date(pembelian.dilunasi_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
          {pembelian.catatan && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#64748b' }}>Catatan</span>
              <span style={{ maxWidth: '60%', textAlign: 'right' }}>{pembelian.catatan}</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Barang</div>
        {(pembelian.items || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.nama_barang || item.nama}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{Number(item.qty)} {item.satuan} × {formatRp(item.harga_beli)}  </div>
            </div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatRp(item.qty * item.harga_beli)}</div>
          </div>
        ))}

        <div style={{ marginTop: 14, padding: '12px 0', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ color: '#2563eb' }}>{formatRp(pembelian.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PembelianPage() {
  const isMobile = useIsMobile();

  const [semuaBarang, setSemuaBarang]   = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [riwayat, setRiwayat]           = useState([]);
  const [showLunasGroup, setShowLunasGroup] = useState(false);
  const [loadRiwayat, setLoadRiwayat]   = useState(true);

  const [supplierId, setSupplierId]   = useState(() => localStorage.getItem('draftPembelianSupplier') || '');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierInputRef = useRef();
  const [status, setStatus]           = useState(() => localStorage.getItem('draftPembelianStatus') || 'lunas');
  const [skipStok, setSkipStok]       = useState(() => localStorage.getItem('draftPembelianSkipStok') === '1');

  const [catatan, setCatatan]         = useState('');
  const [jatuhTempo, setJatuhTempo]   = useState(() => localStorage.getItem('draftPembelianJatuhTempo') || '');
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('draftPembelian');
    return saved ? JSON.parse(saved) : [];
  });

  const [search, setSearch]           = useState('');
  const [showDrop, setShowDrop]       = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ nama: '', harga_beli: '' });
  const [showQuickBarangForm, setShowQuickBarangForm] = useState(false);
  const [quickBarangForm, setQuickBarangForm] = useState({ kode_barang: '', nama: '', kategori: '', satuan: 'pcs', harga_beli: '', harga_jual: '', stok_minimum: '', supplier_ids: [] });
  const [savingQuickBarang, setSavingQuickBarang] = useState(false);
  const [searchSupplierQuick, setSearchSupplierQuick] = useState('');
  const searchRef                     = useRef();

  const [panelFilter,   setPanelFilter]   = useState('semua');
  const [panelCollapse, setPanelCollapse] = useState(false);

  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [sukses, setSukses]           = useState('');
  const [tab, setTab] = useState(() => localStorage.getItem('pembelianTab') || 'form');
  const [detailItem, setDetailItem]   = useState(null);

  const [selectedRiwayat, setSelectedRiwayat] = useState([]);
  const [melunasiBatch, setMelunasiBatch]     = useState(false);
  const [filterSupplierRiwayat, setFilterSupplierRiwayat] = useState('');
  const [filterBulanRiwayat, setFilterBulanRiwayat] = useState(() => {
    const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [tampilkanSemuaBulan, setTampilkanSemuaBulan] = useState(false);

  const muatData = () => {
    getBarang({ supplier_id: supplierId }).then(r => {
      const dataBarang = r.data.data.map(b => ({
        ...b,
        stok: Number(b.stok),
        stok_minimum: Number(b.stok_minimum)
      }));
      setSemuaBarang(dataBarang);
    });

    getSupplier().then(r => setSupplierList(r.data.data)).catch(() => {});

    if (riwayat.length === 0) setLoadRiwayat(true);
    const scrollEl = document.querySelector('main');
    const posisiScroll = scrollEl ? scrollEl.scrollTop : 0;
    getPembelian()
      .then(r => {
        setRiwayat(r.data.data);
        requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = posisiScroll; });
      })
      .catch(() => {})
      .finally(() => setLoadRiwayat(false));
  };

  const handleBukaDetail = async (pembelian) => {
    try {
      const response = await api.get(`/pembelian/${pembelian.id}/detail`);
      setDetailItem({ ...pembelian, items: response.data.data });
    } catch (err) {
      console.error(err);
      alert("Gagal memuat detail barang.");
    }
  };

  const toggleSelectRiwayat = (id) => {
    setSelectedRiwayat(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const lunasiTerpilih = async () => {
    if (selectedRiwayat.length === 0) return;
    setMelunasiBatch(true);
    try {
      await lunasiBatchPembelian(selectedRiwayat);
      toast.success(`${selectedRiwayat.length} transaksi berhasil dilunasi!`, { position: 'top-center' });
      setSelectedRiwayat([]);
      muatData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal melunasi transaksi terpilih.', { position: 'top-center' });
    } finally {
      setMelunasiBatch(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('pembelianTab', tab);
  }, [tab]);

  useEffect(() => {
    localStorage.setItem('draftPembelian', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (supplierId) localStorage.setItem('draftPembelianSupplier', supplierId);
    else localStorage.removeItem('draftPembelianSupplier');
  }, [supplierId]);

  useEffect(() => {
    localStorage.setItem('draftPembelianStatus', status);
  }, [status]);

  useEffect(() => {
    if (jatuhTempo) localStorage.setItem('draftPembelianJatuhTempo', jatuhTempo);
    else localStorage.removeItem('draftPembelianJatuhTempo');
  }, [jatuhTempo]);

  useEffect(() => {
    localStorage.setItem('draftPembelianSkipStok', skipStok ? '1' : '0');
  }, [skipStok]);

  useEffect(() => { muatData(); }, [supplierId]);

  useEffect(() => {
    if (!supplierId) { setSupplierSearch(''); return; }
    const s = supplierList.find(sp => String(sp.id) === String(supplierId));
    if (s) setSupplierSearch(s.nama);
  }, [supplierId, supplierList]);

  useEffect(() => {
    const handler = (e) => { if (supplierInputRef.current && !supplierInputRef.current.contains(e.target)) setShowSupplierDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const h = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const hasilCari = semuaBarang.filter(b => {
    if (search.length === 0) return false;
    const gabungan = `${b.nama || ''} ${b.kode_barang || ''} ${b.kategori || ''}`.toLowerCase();
    const kataKata = search.toLowerCase().trim().split(/\s+/);
    return kataKata.every(kata => gabungan.includes(kata));
  }).slice(0, 8);

  const tambahItem = (barang) => {
    setItems(prev => {
      const ada = prev.find(i => i.barang_id === barang.id);
      if (ada) return prev.map(i => i.barang_id === barang.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        barang_id:  barang.id,
        nama:       barang.nama,
        satuan:     barang.satuan,
        harga_beli: barang.harga_beli || 0,
        qty:        1,
      }];
    });
    setSearch('');
    setShowDrop(false);
    setError('');
  };

  const tambahItemManual = () => {
    if (!manualForm.nama.trim()) { setError('Nama item manual harus diisi.'); return; }
    setItems(prev => [...prev, {
      barang_id:  -Date.now(),
      isManual:   true,
      nama:       manualForm.nama.trim(),
      satuan:     'pcs',
      harga_beli: Number(manualForm.harga_beli) || 0,
      qty: 1,
    }]);
    setManualForm({ nama: '', harga_beli: '' });
    setShowManualForm(false);
    setError('');
  };

  const simpanQuickBarang = async () => {
    if (!quickBarangForm.nama.trim()) { setError('Nama barang harus diisi.'); return; }
    setError('');
    setSavingQuickBarang(true);
    try {
      const res = await createBarang({
        kode_barang:  quickBarangForm.kode_barang.trim() || null,
        nama:         quickBarangForm.nama.trim(),
        kategori:     quickBarangForm.kategori.trim() || null,
        satuan:       quickBarangForm.satuan || 'pcs',
        harga_beli:   Number(quickBarangForm.harga_beli) || 0,
        harga_jual:   Number(quickBarangForm.harga_jual) || 0,
        stok: 0,
        stok_minimum: Number(quickBarangForm.stok_minimum) || 0,
        supplier_ids: quickBarangForm.supplier_ids,
      });
      const barangBaru = { id: res.data.id, nama: quickBarangForm.nama.trim(), satuan: quickBarangForm.satuan || 'pcs', harga_beli: Number(quickBarangForm.harga_beli) || 0 };
      setSemuaBarang(prev => [...prev, barangBaru]);
      tambahItem(barangBaru);
      toast.success(`Barang "${barangBaru.nama}" berhasil didaftarkan & ditambahkan ke keranjang.`, { position: 'top-center' });
      setQuickBarangForm({ kode_barang: '', nama: '', kategori: '', satuan: 'pcs', harga_beli: '', harga_jual: '', stok_minimum: '', supplier_ids: [] });
      setShowQuickBarangForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan barang baru.', { position: 'top-center' });
    } finally {
      setSavingQuickBarang(false);
    }
  };

  const updateItem = (barang_id, field, val) => {
    setItems(prev => prev.map(i => {
      if (i.barang_id !== barang_id) return i;

      if (val === '') {
        return { ...i, [field]: '' };
      }

      if (field === 'qty') {

        return { ...i, qty: val };
      }

      let harga = parseFloat(val);
      if (isNaN(harga) || harga < 0) {
        harga = 0;
      }
      return { ...i, [field]: harga };
    }));
  };

  const parseQtyInput = (val) => {
    const str = String(val).trim();
    let qty;
    if (str.includes('/')) {

      const [pembilang, penyebut] = str.split('/').map(s => parseFloat(s.trim()));
      qty = (!isNaN(pembilang) && !isNaN(penyebut) && penyebut !== 0) ? pembilang / penyebut : NaN;
    } else {
      qty = parseFloat(str.replace(',', '.'));
    }
    if (isNaN(qty) || qty <= 0) qty = 0.01;
    return Math.round(qty * 100) / 100;
  };

  const finalisasiQty = (barang_id) => {
    setItems(prev => prev.map(i => i.barang_id === barang_id ? { ...i, qty: parseQtyInput(i.qty) } : i));
  };

  const setQtyLangsung = (barang_id, num) => {
    const qty = Math.round(num * 100) / 100;
    setItems(prev => prev.map(i => i.barang_id === barang_id ? { ...i, qty } : i));
  };

  const hapusItem = (barang_id) => setItems(prev => prev.filter(i => i.barang_id !== barang_id));
  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * i.harga_beli, 0);
  const simpan = async () => {
    if (items.length === 0) { setError('Tambahkan minimal 1 barang.'); return; }
    setSaving(true); setError(''); setSukses('');
    try {

      const itemsFinal = items.map(i => {
        const qty = parseQtyInput(i.qty);
        if (i.isManual) {
          return { barang_id: null, nama_manual: i.nama, satuan_manual: i.satuan, qty, harga_beli: i.harga_beli };
        }
        return { ...i, qty };
      });
      await createPembelian({ supplier_id: supplierId || null, items: itemsFinal, catatan, status, jatuh_tempo: jatuhTempo || null, skip_stok: skipStok });
      const jmlManual = items.filter(i => i.isManual).length;
      const jmlNambahStok = items.length - jmlManual;
      setSukses(skipStok
        ? `✅ Nota pembelian berhasil dicatat! Stok TIDAK diubah (sesuai centang "stok sudah ditambahkan").`
        : `✅ Pembelian berhasil dicatat! Stok ${jmlNambahStok} barang otomatis bertambah${jmlManual > 0 ? ` (${jmlManual} item manual gak nyentuh stok)` : ''}.`
      );

      localStorage.removeItem('draftPembelian');

      setItems([]);
      setSupplierId('');
      setCatatan('');
      setStatus('lunas');
      setJatuhTempo('');
      setSkipStok(false);
      muatData();
      setTimeout(() => setSukses(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pembelian.');
    } finally {
      setSaving(false);
    }
  };

  const handleSupplierChange = (e) => {
    const newId = e.target.value;

    if (items.length === 0) {
      setSupplierId(newId);
      return;
    }

    const oldId = supplierId;
    toast((t) => (
      <span style={{ fontSize: '14px', color: '#1e293b' }}>
        <strong>Ganti supplier?</strong> Keranjang belanja akan dikosongkan.
        <div style={{ marginTop: 10, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              setItems([]);
              setSupplierId(newId);
              toast.dismiss(t.id);
              toast.success("Supplier diganti & keranjang dikosongkan", { position: 'top-center' });
            }}

            style={{
              background: '#dc2626', color: '#fff', border: 'none',
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 500
            }}
          >
            Ya, Ganti
          </button>
          <button
            onClick={() => {
              e.target.value = oldId;
              toast.dismiss(t.id);
            }}
            style={{
              background: '#f1f5f9', color: '#64748b', border: 'none',
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer'
            }}
          >
            Batal
          </button>
        </div>
      </span>
    ), {
      duration: Infinity,
      position: 'top-center'
    });
  };

  return (
    <div>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: 20 }}>📥 Pembelian dari Supplier</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['form', 'riwayat'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all .15s',
              background: tab === t ? '#1e293b' : '#f1f5f9',
              color: tab === t ? '#fff' : '#64748b',
              border: 'none'
            }}>
              {t === 'form' ? '📝 Input Pembelian' : `📋 Riwayat (${riwayat.length})`}
            </button>
          ))}
        </div>
      </div>

      {}
      {(() => {
        const perluPerhatian = riwayat
          .filter(r => r.status === 'hutang' && r.jatuh_tempo)
          .map(r => ({ ...r, info: getInfoJatuhTempo(r.jatuh_tempo) }))
          .filter(r => r.info.urgensi >= 1)
          .sort((a, b) => a.info.selisihHari - b.info.selisihHari);

        if (perluPerhatian.length === 0) return null;

        const sudahLewat = perluPerhatian.filter(r => r.info.urgensi === 3);
        const mendekati  = perluPerhatian.filter(r => r.info.urgensi < 3);
        const adaTerlambat = sudahLewat.length > 0;

        const renderList = (list) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
            {list.map(r => {
              const sisa = Number(r.total) - Number(r.total_dibayar || 0);
              return (
              <div
                key={r.id}
                onClick={() => handleBukaDetail(r)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
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
                      Sisa {formatRp(sisa)}
                      {Number(r.total_dibayar) > 0 && (
                        <span style={{ color: '#16a34a' }}> (sudah dicicil {formatRp(r.total_dibayar)} dari {formatRp(r.total)})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: r.info.color, fontWeight: 700, fontSize: 13 }}>{formatTgl(r.jatuh_tempo)}</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: adaTerlambat ? '#dc2626' : '#b45309', marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              Perhatian Jatuh Tempo Hutang
              <span style={{ fontSize: 11.5, fontWeight: 700, background: '#fecaca', color: '#dc2626', borderRadius: 12, padding: '2px 8px' }}>{perluPerhatian.length}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (sudahLewat.length > 0 && mendekati.length > 0 ? '1fr 1fr' : '1fr'), gap: 16 }}>
              {sudahLewat.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#dc2626' }}>🔴 Sudah Lewat ({sudahLewat.length})</div>
                    <div style={{ fontSize: 11.5, color: '#dc2626' }}>
                      {sudahLewat.length} nota &nbsp;•&nbsp; Total: <strong>{formatRp(totalNota(sudahLewat))}</strong> &nbsp;•&nbsp; Sisa: <strong>{formatRp(totalSisa(sudahLewat))}</strong>
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
                      {mendekati.length} nota &nbsp;•&nbsp; Total: <strong>{formatRp(totalNota(mendekati))}</strong> &nbsp;•&nbsp; Sisa: <strong>{formatRp(totalSisa(mendekati))}</strong>
                    </div>
                  </div>
                  {renderList(mendekati)}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {}
      {tab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

            {}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informasi Pembelian</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div ref={supplierInputRef} style={{ position: 'relative' }}>
                  <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>Supplier</label>
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); if (supplierId) setSupplierId(''); }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="🔍 Cari / pilih supplier..."
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                  {showSupplierDropdown && (() => {
                    const hasil = supplierList
                      .filter(s => s.nama.toLowerCase().includes(supplierSearch.toLowerCase()))
                      .slice(0, 8);
                    return (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.08)', zIndex: 20,
                        maxHeight: 240, overflowY: 'auto'
                      }}>
                        <div
                          onClick={() => { handleSupplierChange({ target: { value: '' } }); setSupplierSearch(''); setShowSupplierDropdown(false); }}
                          style={{ padding: '9px 12px', fontSize: 13, color: '#94a3b8', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >— Tanpa Supplier —</div>
                        {hasil.length === 0 && (
                          <div style={{ padding: '9px 12px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Tidak ada supplier yang cocok.</div>
                        )}
                        {hasil.map((s, i) => (
                          <div
                            key={s.id}
                            onClick={() => { handleSupplierChange({ target: { value: s.id } }); setSupplierSearch(s.nama); setShowSupplierDropdown(false); }}
                            style={{
                              padding: '9px 12px', fontSize: 13.5, cursor: 'pointer',
                              borderBottom: i < hasil.length - 1 ? '1px solid #f1f5f9' : 'none',
                              display: 'flex', alignItems: 'center', gap: 8
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>🏭</span>
                            {s.nama}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>Status Pembayaran</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['lunas', 'hutang'].map(s => (
                      <button key={s} onClick={() => { setStatus(s); if (s !== 'hutang') setJatuhTempo(''); }} style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 500, fontSize: 13, textTransform: 'capitalize', transition: 'all .15s',
                        background: status === s ? (s === 'lunas' ? '#dcfce7' : '#fef9c3') : '#f8fafc',
                        color: status === s ? (s === 'lunas' ? '#166534' : '#854d0e') : '#94a3b8',
                      }}>{s === 'lunas' ? '✅' : '⏳'} {s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>Catatan</label>
                  <input value={catatan} onChange={e => setCatatan(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !saving && items.length > 0) { e.preventDefault(); simpan(); } }}
                    placeholder="Contoh: Pengiriman pertama bulan ini..."
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                {status === 'hutang' && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 13, color: '#374151', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tanggal Jatuh Tempo</label>
                    <input type="date" value={jatuhTempo} onChange={e => setJatuhTempo(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer',
                    background: skipStok ? '#fffbeb' : '#f8fafc', border: `1px solid ${skipStok ? '#fde68a' : '#e2e8f0'}`,
                    borderRadius: 8, padding: '10px 12px'
                  }}>
                    <input type="checkbox" checked={skipStok} onChange={e => setSkipStok(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: skipStok ? '#92400e' : '#374151' }}>
                        Stok sudah pernah ditambahkan sebelumnya (jangan tambah stok lagi)
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                        Centang ini kalau cuma mau nyusulin catatan nota (buat riwayat & hutang), tapi barangnya udah kadung ditambahin ke stok duluan — biar gak dobel nambah stok.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {}
            <div ref={searchRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Cari barang untuk ditambahkan ke daftar pembelian..."
                  style={{ width: '100%', padding: '12px 14px 12px 40px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              {showDrop && hasilCari.length > 0 && (
                <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                  {hasilCari.map(b => (
                    <div key={b.id} onClick={() => tambahItem(b)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{b.nama}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{b.kode_barang} · {b.satuan}{b.kategori ? ` · ${b.kategori}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Stok saat ini</div>
                        <div style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: Number(b.stok) <= 0 ? '#dc2626' : (Number(b.stok) <= Number(b.stok_minimum) ? '#f59e0b' : '#16a34a')
                        }}>
                          {b.stok} {b.satuan}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: b.stok <= 0 ? '#dc2626' : b.stok <= b.stok_minimum ? '#f59e0b' : '#16a34a'
                        }}>
                          {b.stok <= 0 ? '🚨 Habis' : b.stok <= b.stok_minimum ? '⚠️ Menipis' : '✅ Aman'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showDrop && search.length > 0 && hasilCari.length === 0 && (
                <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Barang "{search}" gak ketemu di database.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setQuickBarangForm({ kode_barang: '', nama: search, kategori: '', satuan: 'pcs', harga_beli: '', harga_jual: '', stok_minimum: '', supplier_ids: supplierId ? [Number(supplierId)] : [] }); setSearchSupplierQuick(''); setShowQuickBarangForm(true); setShowDrop(false); }}
                      style={{ flex: 1, padding: '9px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
                    >📦 Daftarkan Barang Baru</button>
                    <button
                      onClick={() => { setManualForm({ nama: search, harga_beli: '' }); setShowManualForm(true); setShowDrop(false); }}
                      style={{ flex: 1, padding: '9px 10px', background: '#fefce8', color: '#a16207', border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
                    >📝 Tambah sebagai Item Manual</button>
                  </div>
                </div>
              )}
            </div>

            {}
            {(() => {

              const barangSorted = [...semuaBarang].sort((a, b) => a.stok - b.stok);
              const barangFiltered = barangSorted.filter(b => {
                const cocokCari = search === '' ||
                  b.nama.toLowerCase().includes(search.toLowerCase()) ||
                  (b.kode_barang || '').toLowerCase().includes(search.toLowerCase()) ||
                  (b.kategori  || '').toLowerCase().includes(search.toLowerCase());
                const statusB = b.stok <= 0 ? 'habis' : b.stok <= b.stok_minimum ? 'menipis' : 'aman';
                const cocokFilter = panelFilter === 'semua' || statusB === panelFilter;
                return cocokCari && cocokFilter;
              });

              const countHabis   = semuaBarang.filter(b => b.stok <= 0).length;
              const countMenipis = semuaBarang.filter(b => b.stok > 0 && b.stok <= b.stok_minimum).length;
              const countAman    = semuaBarang.filter(b => b.stok > b.stok_minimum).length;

              return (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  {}
                  <div style={{ padding: '14px 18px', borderBottom: panelCollapse ? 'none' : '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => setPanelCollapse(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: 0, lineHeight: 1 }}
                        title={panelCollapse ? 'Tampilkan' : 'Sembunyikan'}
                      >
                        {panelCollapse ? '▶' : '▼'}
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>📋 Daftar Semua Barang</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>— klik "+ Pesan" untuk tambah ke keranjang</span>
                    </div>
                    {!panelCollapse && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {}
                        {[
                          { key: 'semua',   label: `Semua (${semuaBarang.length})`,  bg: '#f1f5f9', color: '#475569', activeBg: '#1e293b', activeColor: '#fff' },
                          { key: 'habis',   label: `🚨 Habis (${countHabis})`,        bg: '#fef2f2', color: '#dc2626', activeBg: '#dc2626', activeColor: '#fff' },
                          { key: 'menipis', label: `⚠️ Menipis (${countMenipis})`,    bg: '#fef9c3', color: '#92400e', activeBg: '#f59e0b', activeColor: '#fff' },
                          { key: 'aman',    label: `✅ Aman (${countAman})`,           bg: '#f0fdf4', color: '#166534', activeBg: '#16a34a', activeColor: '#fff' },
                        ].map(chip => (
                          <button key={chip.key} onClick={() => setPanelFilter(chip.key)} style={{
                            padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, transition: 'all .12s',
                            background: panelFilter === chip.key ? chip.activeBg : chip.bg,
                            color: panelFilter === chip.key ? chip.activeColor : chip.color,
                          }}>{chip.label}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {}
                  {!panelCollapse && (
                    barangFiltered.length === 0 ? (
                      <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        Tidak ada barang yang sesuai filter.
                      </div>
                    ) : (
                      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                              {['Kode', 'Nama Barang', 'Kategori', 'Harga Beli', 'Stok ↑', 'Min.Stok', 'Status', ''].map(h => (
                                <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {barangFiltered.map(b => {
                              const habis   = b.stok <= 0;
                              const menipis = !habis && b.stok <= b.stok_minimum;
                              const statusLabel = habis ? '🚨 Habis' : menipis ? '⚠️ Menipis' : '✅ Aman';
                              const statusBg    = habis ? '#fef2f2' : menipis ? '#fef9c3' : '#f0fdf4';
                              const statusClr   = habis ? '#dc2626' : menipis ? '#92400e' : '#166534';
                              const rowBg       = habis ? '#fff8f8' : menipis ? '#fffdf0' : '#fff';
                              const sudahDiKeranjang = items.some(i => i.barang_id === b.id);

                              const maxStok = Math.max(...semuaBarang.map(x => x.stok), 1);
                              const barPct  = Math.min((b.stok / maxStok) * 100, 100);
                              const barClr  = habis ? '#fca5a5' : menipis ? '#fde68a' : '#86efac';

                              return (
                                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowBg, transition: 'background .1s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = habis ? '#fff0f0' : menipis ? '#fffce8' : '#f8fafc'}
                                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                                >
                                  <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>{b.kode_barang || '—'}</td>
                                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e293b' }}>{b.nama}</td>
                                  <td style={{ padding: '9px 12px', color: '#64748b' }}>{b.kategori || '—'}</td>
                                  <td style={{ padding: '9px 12px', color: '#475569' }}>{formatRp(b.harga_beli)}</td>
                                  <td style={{ padding: '9px 12px', minWidth: 100 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ width: `${barPct}%`, height: '100%', background: barClr, borderRadius: 99, transition: 'width .4s' }} />
                                      </div>
                                      <span style={{ fontWeight: 700, fontSize: 13, color: habis ? '#dc2626' : menipis ? '#d97706' : '#16a34a', minWidth: 44, textAlign: 'right' }}>
                                        {Number(b.stok)} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11 }}>{b.satuan}</span>
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '9px 12px', color: '#64748b' }}>{Number(b.stok_minimum)} {b.satuan}</td>
                                  <td style={{ padding: '9px 12px' }}>
                                    <span style={{ background: statusBg, color: statusClr, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td style={{ padding: '9px 12px' }}>
                                    <button
                                      onClick={() => tambahItem(b)}
                                      title={sudahDiKeranjang ? 'Tambah qty ke keranjang' : 'Tambah ke keranjang pembelian'}
                                      style={{
                                        padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                                        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all .12s',
                                        background: sudahDiKeranjang ? '#eff6ff' : '#f0fdf4',
                                        color: sudahDiKeranjang ? '#2563eb' : '#16a34a',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = sudahDiKeranjang ? '#dbeafe' : '#dcfce7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = sudahDiKeranjang ? '#eff6ff' : '#f0fdf4'; }}
                                    >
                                      {sudahDiKeranjang ? '＋ Tambah lagi' : '＋ Pesan'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              );
            })()}

            {!showManualForm && (
              <button onClick={() => { setManualForm({ nama: '', harga_beli: '' }); setShowManualForm(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 14,
                  padding: '10px 14px', background: '#fffbeb', border: '1.5px dashed #fde68a', borderRadius: 10,
                  cursor: 'pointer', fontSize: 13, color: '#a16207', fontWeight: 500, textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef9c3'}
                onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}
              >
                <span style={{ fontSize: 16 }}>➕</span>
                <span>
                  <strong>Tambah item manual</strong>
                  <span style={{ color: '#ca8a04', fontWeight: 400 }}> — buat jasa, ongkir, atau item yang gak nyambung ke stok Barang</span>
                </span>
              </button>
            )}

            {}
            {showManualForm && (
              <div style={{ marginTop: 14, background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>Item Manual</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#a16207', marginBottom: 14 }}>
                  Item ini cuma masuk ke nota — gak nambah barang baru & gak ngutak-ngatik stok Barang sama sekali.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#92400e', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nama Item</label>
                    <input placeholder="Contoh: Ongkos kirim" value={manualForm.nama} onChange={e => setManualForm(f => ({ ...f, nama: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} autoFocus />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#92400e', fontWeight: 600, display: 'block', marginBottom: 4 }}>Harga (Rp)</label>
                    <input type="number" placeholder="0" value={manualForm.harga_beli} onChange={e => setManualForm(f => ({ ...f, harga_beli: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowManualForm(false)} style={{ flex: 1, padding: '9px 0', background: '#fff', border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#92400e', fontWeight: 500 }}>Batal</button>
                  <button onClick={tambahItemManual} style={{ flex: 2, padding: '9px 0', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>➕ Tambahkan ke Keranjang</button>
                </div>
              </div>
            )}

            {}
            {showQuickBarangForm && (
              <div style={{ marginTop: 14, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1d4ed8' }}>Daftarkan Barang Baru ke Database</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#2563eb', marginBottom: 14 }}>
                  Lengkapi sekalian di sini biar gak perlu bolak-balik ke halaman Barang lagi nanti. Stok awal 0, otomatis nambah pas pembelian ini disimpan.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Kode Barang (opsional)</label>
                    <input value={quickBarangForm.kode_barang} onChange={e => setQuickBarangForm(f => ({ ...f, kode_barang: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nama Barang *</label>
                    <input placeholder="Contoh: Semen Merah Putih" value={quickBarangForm.nama} onChange={e => setQuickBarangForm(f => ({ ...f, nama: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} autoFocus />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Kategori (opsional)</label>
                    <input value={quickBarangForm.kategori} onChange={e => setQuickBarangForm(f => ({ ...f, kategori: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Satuan</label>
                    <select value={quickBarangForm.satuan} onChange={e => setQuickBarangForm(f => ({ ...f, satuan: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, background: '#fff', boxSizing: 'border-box' }}>
                      {['pcs','kg','m','sak','batang','kaleng','kotak','pasang','gulung'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Harga Beli (Rp)</label>
                    <input type="number" placeholder="0" value={quickBarangForm.harga_beli} onChange={e => setQuickBarangForm(f => ({ ...f, harga_beli: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Harga Jual (Rp)</label>
                    <input type="number" placeholder="0" value={quickBarangForm.harga_jual} onChange={e => setQuickBarangForm(f => ({ ...f, harga_jual: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Stok Minimum</label>
                    <input type="number" placeholder="0" value={quickBarangForm.stok_minimum} onChange={e => setQuickBarangForm(f => ({ ...f, stok_minimum: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', background: '#fff' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11.5, color: '#1d4ed8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Supplier yang Menyediakan (opsional, bisa pilih lebih dari 1)
                  </label>
                  <input
                    value={searchSupplierQuick}
                    onChange={e => setSearchSupplierQuick(e.target.value)}
                    placeholder="🔍 Cari nama supplier..."
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #bfdbfe', borderRadius: 7, fontSize: 12.5, boxSizing: 'border-box', marginBottom: 6, background: '#fff' }}
                  />
                  <div style={{ border: '1px solid #bfdbfe', borderRadius: 8, background: '#fff', maxHeight: 130, overflowY: 'auto', padding: '6px 4px' }}>
                    {supplierList.length === 0 ? (
                      <div style={{ padding: '8px 10px', fontSize: 12.5, color: '#94a3b8' }}>Belum ada supplier.</div>
                    ) : [...supplierList]
                        .filter(s => s.nama.toLowerCase().includes(searchSupplierQuick.toLowerCase()))
                        .sort((a, b) => quickBarangForm.supplier_ids.includes(b.id) - quickBarangForm.supplier_ids.includes(a.id))
                        .map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={quickBarangForm.supplier_ids.includes(s.id)}
                          onChange={e => setQuickBarangForm(f => ({
                            ...f,
                            supplier_ids: e.target.checked ? [...f.supplier_ids, s.id] : f.supplier_ids.filter(id => id !== s.id)
                          }))}
                          style={{ width: 15, height: 15, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13 }}>{s.nama}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowQuickBarangForm(false)} disabled={savingQuickBarang} style={{ flex: 1, padding: '9px 0', background: '#fff', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>Batal</button>
                  <button onClick={simpanQuickBarang} disabled={savingQuickBarang} style={{ flex: 2, padding: '9px 0', background: savingQuickBarang ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: savingQuickBarang ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {savingQuickBarang ? 'Menyimpan...' : '➕ Daftarkan & Tambahkan ke Keranjang'}
                  </button>
                </div>
              </div>
            )}

            {}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
              {items.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>Belum ada barang</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Cari barang di atas untuk menambahkan</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      {['Barang', 'Harga Beli (Rp)', 'Qty', 'Stok Setelah', 'Subtotal', ''].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const barangAsli = semuaBarang.find(b => b.id === item.barang_id);
                      const qtyNum = Number(item.qty) || 0;
                      const stokSetelah = (barangAsli?.stok || 0) + qtyNum;
                      return (
                        <tr key={item.barang_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.nama}
                              {item.isManual && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#a16207', background: '#fef9c3', padding: '1px 6px', borderRadius: 4 }}>MANUAL</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              {item.isManual ? 'Gak nyambung ke stok Barang' : `Stok kini: ${barangAsli?.stok ?? '?'} ${item.satuan}`}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="number"
                              value={Number(item.harga_beli)}
                              min={0}
                              onChange={e => updateItem(item.barang_id, 'harga_beli', e.target.value)}
                              style={{ width: 120, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {(() => {
                              const satuanLower = (item.satuan || '').toLowerCase();
                              const isPecahan = ['kg', 'kilogram', 'meter', 'mtr', 'm', 'liter', 'ltr', 'cm'].includes(satuanLower);
                              const step = isPecahan ? 0.25 : 1;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button onClick={() => setQtyLangsung(item.barang_id, Math.max(0.01, qtyNum - step))}
                                      style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#475569' }}>−</button>
                                    <input
                                      type="text" inputMode="decimal" value={item.qty}
                                      placeholder="1/4"
                                      onChange={e => updateItem(item.barang_id, 'qty', e.target.value)}
                                      onBlur={() => finalisasiQty(item.barang_id)}
                                      style={{ width: `${Math.max(56, String(item.qty).length * 12 + 25)}px`, padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14, textAlign: 'center' }}
                                    />
                                    <button onClick={() => setQtyLangsung(item.barang_id, qtyNum + step)}
                                      style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#475569' }}>+</button>
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.satuan}</span>
                                  </div>
                                  {isPecahan && (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      {[
                                        { label: '¼', val: 0.25 },
                                        { label: '½', val: 0.5 },
                                        { label: '¾', val: 0.75 },
                                        { label: '1', val: 1 },
                                      ].map(opt => (
                                        <button key={opt.label} onClick={() => setQtyLangsung(item.barang_id, opt.val)}
                                          title={`Set ke ${opt.val} ${item.satuan}`}
                                          style={{ padding: '2px 7px', fontSize: 11, background: qtyNum === opt.val ? '#dbeafe' : '#f8fafc', color: qtyNum === opt.val ? '#1d4ed8' : '#64748b', border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer' }}>
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {item.isManual || skipStok ? (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                            ) : (
                              <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                {stokSetelah} {item.satuan}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                            {formatRp(qtyNum * item.harga_beli)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => hapusItem(item.barang_id)}
                              style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>×</button>
              </div>
            )}
            {sukses && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {sukses}
              </div>
            )}
          </div>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ringkasan Pembelian</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Total item</span>
                <span>{items.length} jenis barang</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Total qty</span>
                <span>{items.reduce((s, i) => s + (Number(i.qty) || 0), 0)} unit</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Supplier</span>
                <span>{supplierList.find(s => s.id == supplierId)?.nama || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <span style={{
                  background: status === 'lunas' ? '#dcfce7' : '#fef9c3',
                  color: status === 'lunas' ? '#166534' : '#854d0e',
                  padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500
                }}>{status}</span>
              </div>

              <div style={{ borderTop: '2px solid #e2e8f0', marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>TOTAL</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: '#2563eb' }}>{formatRp(total)}</span>
              </div>
            </div>

            {}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 6 }}>ℹ️ Update Stok Otomatis</div>
              <div style={{ fontSize: 12, color: '#3b82f6', lineHeight: 1.6 }}>
                Saat pembelian disimpan, stok setiap barang akan otomatis bertambah sesuai qty yang diinput. Harga beli barang juga akan diperbarui.
              </div>
            </div>

            <button onClick={simpan} disabled={saving || items.length === 0} style={{
              width: '100%', padding: '14px 0', border: 'none', borderRadius: 10, cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, transition: 'all .2s',
              background: items.length === 0 ? '#e2e8f0' : saving ? '#64748b' : '#2563eb',
              color: items.length === 0 ? '#94a3b8' : '#fff',
            }}>
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Pembelian'}
            </button>

            <button onClick={() => { setItems([]); setSupplierId(''); setCatatan(''); setStatus('lunas'); setJatuhTempo(''); setSkipStok(false); setError(''); }} style={{
              width: '100%', padding: '11px 0', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#64748b'
            }}>
              🗑 Reset Form
            </button>
          </div>
        </div>
      )}

      {}
      {tab === 'riwayat' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
          {loadRiwayat ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Memuat riwayat...</div>
          ) : riwayat.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <div>Belum ada riwayat pembelian.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={filterSupplierRiwayat}
                  onChange={e => { setFilterSupplierRiwayat(e.target.value); setSelectedRiwayat([]); }}
                  placeholder="🔍 Cari nama supplier..."
                  style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 220 }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Bulan:</span>
                  <input
                    type="month"
                    value={filterBulanRiwayat}
                    onChange={e => setFilterBulanRiwayat(e.target.value)}
                    disabled={tampilkanSemuaBulan}
                    style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, opacity: tampilkanSemuaBulan ? 0.5 : 1 }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={tampilkanSemuaBulan}
                    onChange={e => setTampilkanSemuaBulan(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                  Tampilkan semua bulan
                </label>

                {selectedRiwayat.length > 0 && (
                  <button
                    onClick={lunasiTerpilih}
                    disabled={melunasiBatch}
                    style={{
                      background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 16px', cursor: melunasiBatch ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
                    }}>
                    {melunasiBatch ? 'Memproses...' : `✅ Lunasi ${selectedRiwayat.length} Terpilih (${formatRp(
                      riwayat.filter(r => selectedRiwayat.includes(r.id)).reduce((s, r) => s + Number(r.total), 0)
                    )})`}
                  </button>
                )}
              </div>

              {(() => {
                const riwayatFiltered = riwayat.filter(r => !filterSupplierRiwayat || (r.supplier || '').toLowerCase().includes(filterSupplierRiwayat.toLowerCase()));

                const overdue = riwayatFiltered
                  .filter(r => r.status === 'hutang' && r.jatuh_tempo && getInfoJatuhTempo(r.jatuh_tempo).urgensi === 3)
                  .sort((a, b) => new Date(a.jatuh_tempo) - new Date(b.jatuh_tempo));

                const overdueIds = new Set(overdue.map(r => r.id));

                const tanggalInvalid = riwayatFiltered.filter(r => {
                  if (overdueIds.has(r.id)) return false;
                  const d = new Date(r.jatuh_tempo || r.created_at);
                  return isNaN(d.getTime());
                });
                const invalidIds = new Set(tanggalInvalid.map(r => r.id));

                const lunasSemua = riwayatFiltered
                  .filter(r => {
                    if (r.status !== 'lunas' || invalidIds.has(r.id)) return false;

                    const tglAcuan = r.jatuh_tempo || r.created_at;
                    const d = new Date(tglAcuan);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return tampilkanSemuaBulan || key === filterBulanRiwayat;
                  })
                  .sort((a, b) => {
                    if (!a.dilunasi_at && !b.dilunasi_at) return 0;
                    if (!a.dilunasi_at) return 1;
                    if (!b.dilunasi_at) return -1;
                    return new Date(b.dilunasi_at) - new Date(a.dilunasi_at);
                  });
                const lunasIds = new Set(lunasSemua.map(r => r.id));

                const sisanya = riwayatFiltered.filter(r => !overdueIds.has(r.id) && !lunasIds.has(r.id) && !invalidIds.has(r.id));

                const grup = {};
                sisanya.forEach(r => {
                  const d = new Date(r.jatuh_tempo || r.created_at);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  if (!grup[key]) grup[key] = { label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), items: [] };
                  grup[key].items.push(r);
                });
                const bulanKeys = Object.keys(grup)
                  .filter(k => tampilkanSemuaBulan || k === filterBulanRiwayat)
                  .sort((a, b) => a.localeCompare(b));
                bulanKeys.forEach(k => grup[k].items.sort((a, b) => new Date(a.jatuh_tempo || a.created_at) - new Date(b.jatuh_tempo || b.created_at)));

                const renderRow = (r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedRiwayat.includes(r.id) ? '#eff6ff' : 'transparent' }}
                    onMouseEnter={e => { if (!selectedRiwayat.includes(r.id)) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!selectedRiwayat.includes(r.id)) e.currentTarget.style.background = '#fff'; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      {r.status === 'hutang' && (
                        <input
                          type="checkbox"
                          checked={selectedRiwayat.includes(r.id)}
                          onChange={() => toggleSelectRiwayat(r.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatTgl(r.created_at)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.supplier || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: r.status === 'dibatalkan' ? '#94a3b8' : '#2563eb', textDecoration: r.status === 'dibatalkan' ? 'line-through' : 'none' }}>{formatRp(r.total)}</div>
                      {r.status === 'hutang' && Number(r.total_dibayar) > 0 && (
                        <>
                          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Dicicil {formatRp(r.total_dibayar)}</div>
                          <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Sisa {formatRp(Number(r.total) - Number(r.total_dibayar))}</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.status === 'hutang' && r.jatuh_tempo ? (() => {
                        const info = getInfoJatuhTempo(r.jatuh_tempo);
                        return (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: info.color }}>
                            {info.icon} {formatTgl(r.jatuh_tempo)}
                            {info.label && <div style={{ fontSize: 11, fontWeight: 500 }}>{info.label}</div>}
                          </span>
                        );
                      })() : r.status === 'lunas' ? (
                        <span style={{ fontSize: 12.5, color: '#94a3b8' }}>
                          <div>{formatTgl(r.jatuh_tempo || r.created_at)}</div>
                          <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
                            ✓ Lunas{r.dilunasi_at ? `: ${formatTgl(r.dilunasi_at)}` : ''}
                          </div>
                        </span>
                      ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: r.status === 'lunas' ? '#dcfce7' : r.status === 'dibatalkan' ? '#fee2e2' : '#fef9c3',
                        color: r.status === 'lunas' ? '#166534' : r.status === 'dibatalkan' ? '#991b1b' : '#854d0e',
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500
                      }}>{r.status === 'dibatalkan' ? '❌ dibatalkan' : r.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleBukaDetail(r)}
                        style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                );

                const renderGroupHeader = (label, items, warna, collapsible, warnaTeks) => {
                  const notaAktif = items.filter(r => r.status !== 'dibatalkan');
                  const total = notaAktif.reduce((s, r) => s + Number(r.total), 0);
                  const totalSisa = notaAktif.reduce((s, r) => s + (Number(r.total) - Number(r.total_dibayar || 0)), 0);
                  const teks = warnaTeks || (warna ? '#dc2626' : '#1e293b');
                  return (
                    <tr style={{ background: warna || '#f1f5f9', cursor: collapsible ? 'pointer' : 'default' }}
                      onClick={collapsible ? () => setShowLunasGroup(v => !v) : undefined}
                    >
                      <td colSpan={7} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, color: teks }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{collapsible && (showLunasGroup ? '▼ ' : '▶ ')}{label}</span>
                          <span style={{ fontWeight: 500, fontSize: 12.5, color: teks }}>
                            {notaAktif.length} nota &nbsp;•&nbsp; Total: <strong>{formatRp(total)}</strong>
                            {totalSisa > 0 && (
                              <> &nbsp;•&nbsp; Sisa Belum Dibayar: <strong style={{ color: '#dc2626' }}>{formatRp(totalSisa)}</strong></>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                };

                if (riwayatFiltered.length === 0) {
                  return <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Gak ada transaksi yang cocok.</div>;
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        {['', 'Tanggal', 'Supplier', 'Total', 'Jatuh Tempo', 'Status', 'Aksi'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tanggalInvalid.length > 0 && <>
                        {renderGroupHeader('⚠️ Tanggal Tidak Valid (Perlu Dicek Manual)', tanggalInvalid, '#fef9c3', false, '#a16207')}
                        {tanggalInvalid.map(renderRow)}
                      </>}
                      {lunasSemua.length > 0 && <>
                        {renderGroupHeader('✅ Lunas', lunasSemua, '#f0fdf4', true, '#16a34a')}
                        {showLunasGroup && lunasSemua.map(renderRow)}
                      </>}
                      {overdue.length > 0 && <>
                        {renderGroupHeader('🔴 Sudah Lewat Jatuh Tempo (Belum Lunas)', overdue, '#fef2f2')}
                        {overdue.map(renderRow)}
                      </>}
                      {bulanKeys.map(k => <React.Fragment key={k}>
                        {renderGroupHeader(grup[k].label, grup[k].items)}
                        {grup[k].items.map(renderRow)}
                      </React.Fragment>)}
                    </tbody>
                  </table>
                );
              })()}
            </>
          )}
        </div>
      )}

      {}
      {detailItem && <DetailModal pembelian={detailItem} onClose={() => setDetailItem(null)} onRefresh={muatData}/>}
    </div>
  );
}
