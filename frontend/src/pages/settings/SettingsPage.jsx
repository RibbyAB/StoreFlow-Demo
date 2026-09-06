import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { usePengaturan } from '../../context/PengaturanContext';
import { updatePengaturan } from '../../services/api';
import useIsMobile from '../../hooks/useIsMobile';

export default function SettingsPage() {
  const { pengaturan, loading, refreshPengaturan } = usePengaturan();
  const isMobile = useIsMobile();
  const [form, setForm] = useState(pengaturan);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(pengaturan); }, [pengaturan]);

  const ubah = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const simpan = async (e) => {
    e.preventDefault();
    if (!form.nama_toko || !form.nama_toko.trim()) {
      toast.error('Nama toko wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await updatePengaturan(form);
      toast.success('Pengaturan berhasil disimpan.');
      refreshPengaturan();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>;

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 5 };
  const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: isMobile ? 16 : 20 };
  const sectionTitleStyle = { fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div>
      <h2 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: 20 }}>⚙️ Pengaturan</h2>
      <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>
        Atur informasi toko dan teks yang muncul di struk cetak.
      </p>

      <form onSubmit={simpan}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, alignItems: 'start' }}>

          {}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>🏪 Informasi Toko</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>NAMA TOKO *</label>
                <input value={form.nama_toko || ''} onChange={e => ubah('nama_toko', e.target.value)}
                  placeholder="Contoh: TB. Sumber Rejeki" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>ALAMAT (opsional)</label>
                <input value={form.alamat || ''} onChange={e => ubah('alamat', e.target.value)}
                  placeholder="Contoh: Jl. Merdeka No. 10, Bandung" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>NOMOR TELEPON / WA (opsional)</label>
                <input value={form.telepon || ''} onChange={e => ubah('telepon', e.target.value)}
                  placeholder="Contoh: 081234567890" style={inputStyle} />
              </div>
            </div>
          </div>

          {}
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>🧾 Teks Footer Struk</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>BARIS 1</label>
                <input value={form.footer_nota1 || ''} onChange={e => ubah('footer_nota1', e.target.value)}
                  placeholder="Contoh: Terima kasih atas kunjungan Anda" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>BARIS 2 (opsional)</label>
                <input value={form.footer_nota2 || ''} onChange={e => ubah('footer_nota2', e.target.value)}
                  placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar/dikembalikan" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          style={{
            marginTop: 14, width: isMobile ? '100%' : 260, padding: '12px 0', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, background: saving ? '#64748b' : '#16a34a', color: '#fff',
          }}>
          {saving ? '⏳ Menyimpan...' : '✅ Simpan Pengaturan'}
        </button>
      </form>
    </div>
  );
}
