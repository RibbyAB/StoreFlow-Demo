import React, { useEffect, useState, useRef } from 'react';
import { getSupplier, createSupplier, getPembelian, getBarang, setBarangSupplier } from '../../services/api';
import api from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const formatTgl = (d) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const formKosong = { nama: '', telepon: '', alamat: '', keterangan: '' };

function FormModal({ supplier, onSave, onClose }) {
  const [form,   setForm]   = useState(supplier || formKosong);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const simpan = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) { setError('Nama supplier wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      if (supplier?.id) {
        await api.put(`/supplier/${supplier.id}`, form);
      } else {
        await api.post('/supplier', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 'min(460px, 94vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>{supplier?.id ? '✏️ Edit Supplier' : '➕ Tambah Supplier'}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}>×</button>
        </div>

        <form onSubmit={simpan} style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              {error}
            </div>
          )}

          {[
            { label: 'Nama Supplier *', key: 'nama',       type: 'text',     placeholder: 'PT. Sumber Makmur' },
            { label: 'No. Telepon',     key: 'telepon',    type: 'tel',      placeholder: '021-5551234 / 0812-xxxx-xxxx' },
            { label: 'Alamat',          key: 'alamat',     type: 'textarea', placeholder: 'Jl. Industri No. 10, Jakarta...' },
            { label: 'Keterangan',      key: 'keterangan', type: 'textarea', placeholder: 'Contoh: Supplier semen & pasir, pengiriman setiap Senin' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  rows={2} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              ) : (
                <input
                  type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#64748b' }}>Batal</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px 0', background: saving ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              {saving ? 'Menyimpan...' : supplier?.id ? 'Simpan Perubahan' : 'Tambah Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignBarangModal({ supplier, onClose, onSaved }) {
  const [semuaBarang, setSemuaBarang] = useState([]);
  const [selected,    setSelected]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');

  useEffect(() => {
    if (!supplier) return;
    setLoading(true);
    Promise.all([
      getBarang(),
      getBarang({ supplier_id: supplier.id })
    ])
      .then(([semua, milikSupplier]) => {
        setSemuaBarang(semua.data.data || []);
        setSelected((milikSupplier.data.data || []).map(b => b.id));
      })
      .catch(() => setError('Gagal memuat data barang.'))
      .finally(() => setLoading(false));
  }, [supplier]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const simpan = async () => {
    setSaving(true);
    setError('');
    try {
      await setBarangSupplier(supplier.id, selected);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  if (!supplier) return null;

  const filtered = semuaBarang
    .filter(b => b.nama.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => selected.includes(b.id) - selected.includes(a.id));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 'min(480px, 94vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>📦 Barang dari {supplier.nama}</h3>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Centang semua barang yang disuplai supplier ini</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}>×</button>
        </div>

        <div style={{ padding: '16px 24px 0' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              {error}
            </div>
          )}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari nama barang..."
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
          />
          <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginBottom: 8 }}>{selected.length} barang dipilih</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Memuat barang...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ada barang yang cocok.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12 }}>
              {filtered.map(b => {
                const checked = selected.includes(b.id);
                return (
                  <label key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', border: `1.5px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: 8, cursor: 'pointer',
                    background: checked ? '#eff6ff' : '#fff',
                  }}>
                    <input
                      type="checkbox" checked={checked}
                      onChange={() => toggle(b.id)}
                      style={{ accentColor: '#2563eb', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? '#1d4ed8' : '#374151' }}>
                      📦 {b.nama} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({b.satuan})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#64748b' }}>Batal</button>
          <button onClick={simpan} disabled={saving} style={{ flex: 2, padding: '10px 0', background: saving ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ supplier, onClose, onEdit }) {
  const isMobile = useIsMobile();
  const [riwayat,  setRiwayat]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [ringkasan, setRingkasan] = useState({ total_transaksi: 0, total_nilai: 0, hutang: 0 });

  useEffect(() => {
    if (!supplier) return;
    setLoading(true);
    getPembelian()
      .then(r => {
        const data = (r.data.data || []).filter(p => p.supplier_id == supplier.id || p.supplier === supplier.nama);
        const totalNilai = data.reduce((s, p) => s + Number(p.total), 0);
        const hutang     = data.filter(p => p.status === 'hutang').reduce((s, p) => s + Number(p.total), 0);
        setRiwayat(data);
        setRingkasan({ total_transaksi: data.length, total_nilai: totalNilai, hutang });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [supplier]);

  if (!supplier) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 'min(520px, 94vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

        {}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#eff6ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏭</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{supplier.nama}</div>
                {supplier.telepon && (
                  <a href={`tel:${supplier.telepon}`} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    📞 {supplier.telepon}
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onEdit(supplier)} style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>✏️ Edit</button>
              <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}>×</button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {}
          {(supplier.alamat || supplier.keterangan) && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              {supplier.alamat && (
                <div style={{ marginBottom: supplier.keterangan ? 8 : 0 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>ALAMAT</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{supplier.alamat}</div>
                </div>
              )}
              {supplier.keterangan && (
                <div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>KETERANGAN</div>
                  <div style={{ fontSize: 13, color: '#374151', fontStyle: 'italic' }}>{supplier.keterangan}</div>
                </div>
              )}
            </div>
          )}

          {}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Transaksi', val: ringkasan.total_transaksi, satuan: 'kali', warna: '#3b82f6', bg: '#eff6ff' },
              { label: 'Total Pembelian', val: formatRp(ringkasan.total_nilai), satuan: '', warna: '#10b981', bg: '#f0fdf4' },
              { label: 'Sisa Hutang',     val: formatRp(ringkasan.hutang),      satuan: '', warna: ringkasan.hutang > 0 ? '#dc2626' : '#10b981', bg: ringkasan.hutang > 0 ? '#fef2f2' : '#f0fdf4' },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: k.warna }}>{k.val}{k.satuan && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>{k.satuan}</span>}</div>
              </div>
            ))}
          </div>

          {}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Riwayat Pembelian
          </div>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>Memuat riwayat...</div>
          ) : riwayat.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              Belum ada riwayat pembelian dari supplier ini.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Tanggal', 'Total', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>{formatTgl(r.created_at)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{formatRp(r.total)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: r.status === 'lunas' ? '#dcfce7' : '#fef9c3',
                          color:      r.status === 'lunas' ? '#166534' : '#854d0e',
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500
                        }}>{r.status === 'lunas' ? '✅ Lunas' : '⏳ Hutang'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupplierPage() {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [assignBarang, setAssignBarang] = useState(null);
  const [hapusId,  setHapusId]  = useState(null);
  const [sukses,   setSukses]   = useState('');

  const muat = () => {
    if (data.length === 0) setLoading(true);
    const scrollEl = document.querySelector('main');
    const posisiScroll = scrollEl ? scrollEl.scrollTop : 0;
    getSupplier()
      .then(r => {
        setData(r.data.data || []);
        requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = posisiScroll; });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { muat(); }, []);

  const handleSave = () => {
    setShowForm(false);
    setEditData(null);
    muat();
    setSukses('Supplier berhasil disimpan!');
    setTimeout(() => setSukses(''), 3000);
  };

  const handleEdit = (s) => {
    setDetail(null);
    setEditData(s);
    setShowForm(true);
  };

  const handleHapus = async (id) => {
    try {
      await api.delete(`/supplier/${id}`);
      setHapusId(null);
      muat();
      setSukses('Supplier berhasil dihapus.');
      setTimeout(() => setSukses(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus supplier.');
    }
  };

  const filtered = data.filter(s =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    (s.telepon || '').includes(search) ||
    (s.alamat  || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: 20 }}>🏭 Data Supplier</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{data.length} supplier terdaftar</p>
        </div>
        <button onClick={() => { setEditData(null); setShowForm(true); }} style={{
          background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14
        }}>+ Tambah Supplier</button>
      </div>

      {}
      {sukses && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ✅ {sukses}
        </div>
      )}

      {}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, telepon, atau alamat supplier..."
          style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
        />
      </div>

      {}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Memuat data supplier...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏭</div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{search ? 'Supplier tidak ditemukan.' : 'Belum ada supplier.'}</div>
          {!search && <div style={{ fontSize: 13, marginTop: 4 }}>Klik "+ Tambah Supplier" untuk menambahkan.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'stretch' }}>
          {filtered.map(s => (
            <div key={s.id} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
              transition: 'box-shadow .15s, transform .15s', cursor: 'pointer',
              display: 'flex', flexDirection: 'column'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏭</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }} title={s.nama}>{s.nama}</div>
                    {s.telepon
                      ? <a href={`tel:${s.telepon}`} onClick={e => e.stopPropagation()}
                           style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>📞 {s.telepon}</a>
                      : <span style={{ fontSize: 12, color: '#94a3b8' }}>Tidak ada telepon</span>
                    }
                  </div>
                </div>
              </div>

              {}
              {s.alamat && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }} title={s.alamat}>
                  <span style={{ flexShrink: 0 }}>📍</span>
                  <span style={{
                    lineHeight: 1.5, display: '-webkit-box',
                    WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>{s.alamat}</span>
                </div>
              )}

              {}
              {s.keterangan && (
                <div style={{
                  fontSize: 12, color: '#94a3b8', marginBottom: 12, fontStyle: 'italic', lineHeight: 1.5,
                  borderLeft: '2px solid #e2e8f0', paddingLeft: 8,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis'
                }} title={s.keterangan}>
                  {s.keterangan}
                </div>
              )}

              {}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                <button onClick={() => setDetail(s)} style={{
                  flex: 1, padding: '7px 0', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#475569', fontWeight: 500, whiteSpace: 'nowrap'
                }}>📋 Riwayat</button>
                <button onClick={() => setAssignBarang(s)} style={{
                  flex: 1, padding: '7px 0', background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#16a34a', fontWeight: 500, whiteSpace: 'nowrap'
                }}>📦 Barang</button>
                <button onClick={() => handleEdit(s)} style={{
                  flex: 1, padding: '7px 0', background: '#eff6ff', border: 'none',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#2563eb', fontWeight: 500, whiteSpace: 'nowrap'
                }}>✏️ Edit</button>
                <button onClick={() => setHapusId(s.id)} style={{
                  padding: '7px 12px', background: '#fef2f2', border: 'none',
                  borderRadius: 7, cursor: 'pointer', fontSize: 12.5, color: '#dc2626', flexShrink: 0
                }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {}
      {hapusId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 'min(360px, 94vw)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>Hapus Supplier?</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              Supplier <strong>{data.find(s => s.id === hapusId)?.nama}</strong> akan dihapus. Riwayat pembelian yang sudah ada tidak akan terhapus.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setHapusId(null)} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Batal</button>
              <button onClick={() => handleHapus(hapusId)} style={{ flex: 1, padding: '10px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {}
      {showForm && (
        <FormModal
          supplier={editData}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditData(null); }}
        />
      )}

      {}
      {detail && (
        <DetailModal
          supplier={detail}
          onClose={() => setDetail(null)}
          onEdit={handleEdit}
        />
      )}

      {}
      {assignBarang && (
        <AssignBarangModal
          supplier={assignBarang}
          onClose={() => setAssignBarang(null)}
          onSaved={() => {
            setAssignBarang(null);
            setSukses(`Barang untuk ${assignBarang.nama} berhasil disimpan.`);
            setTimeout(() => setSukses(''), 3000);
          }}
        />
      )}
    </div>
  );
}
