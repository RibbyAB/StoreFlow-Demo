import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { getBarang, createBarang, updateBarang, deleteBarang, getSupplier } from '../../services/api';

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const formKosong = {
  kode_barang: '', nama: '', kategori: '', satuan: 'pcs',
  harga_beli: '', harga_jual: '', stok: '', stok_minimum: '',
  supplier_ids: [],   // ← tambahan
};


export default function BarangPage() {
  const [data,         setData]         = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [searchBy,     setSearchBy]     = useState('semua'); // semua | nama | kode | kategori
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(formKosong);
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');

  const muat = () => {
    if (data.length === 0) setLoading(true); // cuma tampilin loading pas awal, bukan tiap refresh abis save
    const scrollEl = document.querySelector('main');
    const posisiScroll = scrollEl ? scrollEl.scrollTop : 0;
    getBarang({ search, search_by: searchBy }).then(r => {
      setData(r.data.data.map(item => ({
        ...item,
        stok:          Number(item.stok),
        stok_minimum:  Number(item.stok_minimum),
        harga_beli:    Number(item.harga_beli),
        harga_jual:    Number(item.harga_jual),
      })));
      // Balikin posisi scroll setelah render, biar gak lompat ke atas tiap abis save/edit
      requestAnimationFrame(() => { if (scrollEl) scrollEl.scrollTop = posisiScroll; });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { muat(); }, [search, searchBy]);

  useEffect(() => {
    getSupplier().then(r => setSupplierList(r.data.data || [])).catch(() => {});
  }, []);

  const bukaForm = async (item = null) => {
    setError('');
    if (item) {
      // Ambil supplier yg sudah terhubung ke barang ini
      let supplierIds = [];
      try {
        const res = await import('../../services/api').then(m => m.default.get(`/barang/${item.id}/suppliers`));
        supplierIds = (res.data.data || []).map(s => s.id);
      } catch {}

      setForm({
        ...item,
        harga_beli:    Math.round(item.harga_beli),
        harga_jual:    Math.round(item.harga_jual),
        stok:          item.stok,
        stok_minimum:  item.stok_minimum,
        supplier_ids:  supplierIds,
      });
      setEditId(item.id);
    } else {
      setForm(formKosong);
      setEditId(null);
    }
    setShowForm(true);
    setSearchSupplier('');
  };

  const toggleSupplier = (id) => {
    setForm(f => ({
      ...f,
      supplier_ids: f.supplier_ids.includes(id)
        ? f.supplier_ids.filter(s => s !== id)
        : [...f.supplier_ids, id],
    }));
  };

  const simpan = async (e) => {
    e.preventDefault();
    if (saving) return; // proteksi ekstra biar gak kepanggil dobel
    setSaving(true); setError('');
    const dataKirim = {
      ...form,
      stok:         Number(form.stok)         || 0,
      stok_minimum: Number(form.stok_minimum) || 0,
      harga_beli:   Number(form.harga_beli)   || 0,
      harga_jual:   Number(form.harga_jual)   || 0,
    };
    try {
      if (editId) await updateBarang(editId, dataKirim);
      else        await createBarang(dataKirim);
      setShowForm(false); setForm(formKosong); setEditId(null);
      muat();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan barang.');
    } finally {
      setSaving(false);
    }
  };

  const hapus = async (id, nama) => {
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Data barang "${nama}" akan dihapus permanen!`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#dc2626', cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal',
    });
    if (result.isConfirmed) {
      try {
        await deleteBarang(id);
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data barang telah dihapus.', showConfirmButton: false, timer: 1500 });
        muat();
      } catch (err) {
        Swal.fire('Gagal!', err.response?.data?.message || 'Terjadi kesalahan.', 'error');
      }
    }
  };

  const fields = [
    { label: 'Kode Barang (opsional)', key: 'kode_barang', type: 'text' },
    { label: 'Nama Barang *',          key: 'nama',        type: 'text', required: true },
    { label: 'Kategori',               key: 'kategori',    type: 'text' },
    { label: 'Satuan',                 key: 'satuan',      type: 'select' },
    { label: 'Harga Beli (Rp)',        key: 'harga_beli',  type: 'number' },
    { label: 'Harga Jual (Rp)',        key: 'harga_jual',  type: 'number' },
    { label: 'Stok',                   key: 'stok',        type: 'number', step: '0.01' },
    { label: 'Stok Minimum (alert)',   key: 'stok_minimum',type: 'number', step: '0.01' },
  ];

  const satuanOpts = ['pcs','kg','m','sak','batang','kaleng','liter','pasang','gulung'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#1e293b' }}>📦 Data Barang</h2>
        <button onClick={() => bukaForm()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
          + Tambah Barang
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder={
            searchBy === 'kode' ? '🔍 Cari kode barang...' :
            searchBy === 'nama' ? '🔍 Cari nama barang...' :
            searchBy === 'kategori' ? '🔍 Cari kategori...' :
            '🔍 Cari nama, kode, atau kategori barang...'
          }
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
        />
        <select
          value={searchBy} onChange={e => setSearchBy(e.target.value)}
          title="Cari di kolom mana"
          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', color: '#374151' }}
        >
          <option value="semua">Semua kolom</option>
          <option value="nama">Nama</option>
          <option value="kode">Kode</option>
          <option value="kategori">Kategori</option>
        </select>
      </div>

      {!loading && data.some(b => b.harga_beli <= 0 || b.harga_jual <= 0) && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          ⚠️ <strong>{data.filter(b => b.harga_beli <= 0 || b.harga_jual <= 0).length} barang</strong> belum diisi harga beli/jualnya — ditaruh paling atas tabel biar gampang dilengkapi satu-satu.
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Kode','Nama Barang','Kategori','Satuan','Harga Beli','Harga Jual','Stok','Aksi'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 13, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Memuat...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Tidak ada barang ditemukan.</td></tr>
            ) : [...data].sort((a, b) => ((a.harga_beli > 0 && a.harga_jual > 0)) - ((b.harga_beli > 0 && b.harga_jual > 0))).map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: (b.harga_beli <= 0 || b.harga_jual <= 0) ? '#fffbeb' : 'transparent' }}>
                <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{b.kode_barang || '-'}</td>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{b.nama}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.kategori || '-'}</td>
                <td style={{ padding: '10px 14px' }}>{b.satuan}</td>
                <td style={{ padding: '10px 14px' }}>
                  {b.harga_beli > 0
                    ? <span style={{ color: '#64748b' }}>{formatRp(b.harga_beli)}</span>
                    : <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ Belum diisi</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {b.harga_jual > 0
                    ? <span style={{ fontWeight: 600, color: '#15803d' }}>{formatRp(b.harga_jual)}</span>
                    : <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ Belum diisi</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    background: b.stok <= b.stok_minimum ? '#fef2f2' : '#f0fdf4',
                    color:      b.stok <= b.stok_minimum ? '#dc2626' : '#166534',
                    padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 13,
                  }}>{Number(b.stok).toString()} {b.satuan}</span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => bukaForm(b)} style={{ marginRight: 8, background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>Edit</button>
                  <button onClick={() => hapus(b.id, b.nama)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL FORM ─────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 500, maxHeight: '92vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', color: '#1e293b' }}>{editId ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>
            )}

            <form
              onSubmit={simpan}
              onKeyDown={e => {
                // Input teks/angka/tanggal udah otomatis submit form sendiri pas Enter (bawaan browser),
                // jadi di sini cukup tangkep Enter dari checkbox aja (checkbox gak auto-submit).
                // Kalau semua jenis input ditangkep manual di sini, input teks jadi manggil simpan() 2x sekaligus.
                if (e.key === 'Enter' && e.target.type === 'checkbox') {
                  e.preventDefault();
                  simpan(e);
                }
              }}
            >
              {/* Field standar */}
              {fields.map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#374151' }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                      {satuanOpts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} required={f.required} value={form[f.key]} step={f.step} placeholder={f.placeholder}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              ))}

              {/* ── SUPPLIER (multi-select) ── */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                  <span>
                    Supplier yang Menyediakan
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>(bisa pilih lebih dari satu)</span>
                  </span>
                  {form.supplier_ids.length > 0 && (
                    <span style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>{form.supplier_ids.length} dipilih</span>
                  )}
                </label>
                {supplierList.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    Belum ada supplier terdaftar.
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={searchSupplier}
                      onChange={e => setSearchSupplier(e.target.value)}
                      placeholder="🔍 Cari nama supplier..."
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8, padding: 6 }}>
                      {supplierList
                        .filter(s => s.nama.toLowerCase().includes(searchSupplier.toLowerCase()))
                        .sort((a, b) => form.supplier_ids.includes(b.id) - form.supplier_ids.includes(a.id))
                        .map(s => {
                          const checked = form.supplier_ids.includes(s.id);
                          return (
                            <label key={s.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 12px', border: `1.5px solid ${checked ? '#2563eb' : '#e2e8f0'}`,
                              borderRadius: 8, cursor: 'pointer',
                              background: checked ? '#eff6ff' : '#fff',
                              transition: 'all .12s',
                            }}>
                              <input
                                type="checkbox" checked={checked}
                                onChange={() => toggleSupplier(s.id)}
                                style={{ accentColor: '#2563eb', width: 15, height: 15, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? '#1d4ed8' : '#374151' }}>
                                🏭 {s.nama}
                              </span>
                            </label>
                          );
                        })}
                      {supplierList.filter(s => s.nama.toLowerCase().includes(searchSupplier.toLowerCase())).length === 0 && (
                        <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 12px', textAlign: 'center' }}>
                          Tidak ada supplier yang cocok.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Batal</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}