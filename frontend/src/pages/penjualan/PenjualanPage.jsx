import React, { useEffect, useState, useRef } from 'react';
import { getBarang, createPenjualan, getLaporanHarian, getDaftarPelangganLedger } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePengaturan } from '../../context/PengaturanContext';
import { RECEIPT_LOGO } from '../../assets/receiptLogo';
import useIsMobile from '../../hooks/useIsMobile';

const getWarnaStok = (stok, min) => {
  const s = Number(stok) || 0;
  const m = (min !== undefined && min !== null) ? Number(min) : 1;
  return s <= m ? '#dc2626' : '#059669';
};

const formatRp = (n) =>
  new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(n || 0);

const METODE = ['tunai', 'transfer', 'qris', 'hutang'];

/* ─── STRUK / NOTA ─────────────────────────────────────────── */
function StrukModal({ transaksi, onClose }) {
  const ref = useRef();
  const { pengaturan } = usePengaturan();

  const cetak = () => {
    const w = window.open('', '_blank', 'width=260,height=600,left=0,top=0');
    w.document.write(`
      <html><head><title>Nota Pembelian</title>
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
        .item-name { font-weight:900; margin-bottom:1px; font-size:13px; word-break: break-word; }
        .item-line { display:flex; justify-content:space-between; gap:6px; font-size: 12.5px; font-weight:700; }
        .item-line span:last-child { white-space: nowrap; }
        .total-row { display:flex; justify-content:space-between; font-weight:900; font-size:16px; margin-top:3px; }
        .footer { text-align:center; margin-top:8px; font-size:12px; color:#000; font-weight:700; }
        .notice { text-align:center; margin-top:6px; font-size:11.5px; font-weight:900; }
      </style></head><body>
      <img src="${RECEIPT_LOGO}" style="display:block;margin:0 auto 4px auto;width:80px;height:auto;" />
      <h2>${pengaturan?.nama_toko || 'Nama Toko'}</h2>
      <p class="sub">Nota Pembelian</p>
      <hr class="divider"/>
      <div class="row"><span>No.</span><span>${transaksi.id}</span></div>
      <div class="row"><span>Pelanggan</span><span>${transaksi.pelanggan || 'Pelanggan Umum'}</span></div>
      <div class="row"><span>Tgl</span><span>${new Date().toLocaleString('id-ID')}</span></div>
      <div class="row"><span>Bayar</span><span>${transaksi.metode}</span></div>
      <hr class="divider"/>
      ${transaksi.items.map(i => `
        <p class="item-name">${i.nama}</p>
        <div class="item-line">
          <span>${i.qty} ${i.satuan} x ${formatRp(i.harga)}</span>
          <span>${formatRp(i.qty * i.harga)}</span>
        </div>
      `).join('')}
      <hr class="divider"/>
      <div class="row"><span>Subtotal</span><span>${formatRp(transaksi.subtotal)}</span></div>
      ${transaksi.diskon > 0 ? `<div class="row"><span>Diskon</span><span>-${formatRp(transaksi.diskon)}</span></div>` : ''}
      <div class="total-row"><span>TOTAL</span><span>${formatRp(transaksi.total)}</span></div>
      ${transaksi.bayar > 0 ? `
        <hr class="divider"/>
        <div class="row"><span>Bayar</span><span>${formatRp(transaksi.bayar)}</span></div>
        <div class="row"><span>Kembali</span><span>${formatRp(transaksi.bayar - transaksi.total)}</span></div>
      ` : ''}
      <hr class="divider"/>
      ${pengaturan?.telepon ? `<p class="footer">CP: ${pengaturan.telepon}</p>` : ''}
      ${pengaturan?.footer_nota1 ? `<p class="footer">${pengaturan.footer_nota1}</p>` : ''}
${pengaturan?.footer_nota2 ? `<p class="notice" style="font-weight:900;">${pengaturan.footer_nota2}</p>` : ''}
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 'min(340px, 94vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Struk Preview */}
        <div ref={ref} style={{ fontFamily: "'Courier New', monospace", fontSize: 13, background: '#fffdf7', border: '1px dashed #d1c89a', borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
          <img src={RECEIPT_LOGO} style={{ display: 'block', margin: '0 auto 6px auto', width: 84 }} />
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{pengaturan?.nama_toko || 'Nama Toko'}</div>
            <div style={{ fontSize: 11, color: '#888' }}>Nota Penjualan</div>
          </div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>No.</span><span style={{ fontWeight: 600 }}>#{transaksi.id}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>Pelanggan</span><span>{transaksi.pelanggan || 'Pelanggan Umum'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>Tgl</span><span>{new Date().toLocaleDateString('id-ID')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span>Bayar</span><span style={{ textTransform: 'capitalize' }}>{transaksi.metode}</span></div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
          {transaksi.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{item.nama}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#555' }}>
                <span>{item.qty} {item.satuan} × {formatRp(item.harga)}</span>
                <span style={{ fontWeight: 600, color: '#222' }}>{formatRp(item.qty * item.harga)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}><span>Subtotal</span><span>{formatRp(transaksi.subtotal)}</span></div>
          {transaksi.diskon > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e53e3e', marginBottom: 2 }}><span>Diskon</span><span>-{formatRp(transaksi.diskon)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 4 }}><span>TOTAL</span><span>{formatRp(transaksi.total)}</span></div>
          {transaksi.bayar > 0 && (
            <>
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span>Tunai</span><span>{formatRp(transaksi.bayar)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#1a7a4a' }}><span>Kembali</span><span>{formatRp(transaksi.bayar - transaksi.total)}</span></div>
            </>
          )}
          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
          <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>{pengaturan?.footer_nota1}</div>
          {pengaturan?.telepon && <div style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>CP: {pengaturan.telepon}</div>}
          {pengaturan?.footer_nota2 && <div style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 900, marginTop: 6, color: '#000' }}>{pengaturan.footer_nota2}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Tutup</button>
          <button onClick={cetak} style={{ flex: 2, padding: '10px 0', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            🖨️ Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN POS PAGE ─────────────────────────────────────────── */
export default function PenjualanPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [waktuSekarang, setWaktuSekarang] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setWaktuSekarang(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data
  const [semuaBarang, setSemuaBarang] = useState([]);
  const [namaPelangganDikenal, setNamaPelangganDikenal] = useState([]);

  // Pencarian barang
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef();

  // Keranjang
  const [keranjang, setKeranjang] = useState(() => {
    const saved = localStorage.getItem('keranjang');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('keranjang', JSON.stringify(keranjang));
  }, [keranjang]);

  // Form transaksi
  const [diskon, setDiskon] = useState(0);
  const [metode, setMetode] = useState('tunai');
  const [namaPelangganManual, setNamaPelangganManual] = useState('');
  const [showSaranPelanggan, setShowSaranPelanggan] = useState(false);
  const pelangganInputRef = useRef();
  const [bayar, setBayar] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggalManual, setTanggalManual] = useState(''); // hanya owner, buat input ulang nota lama/dibatalkan
  const [showTanggalManual, setShowTanggalManual] = useState(false);

  // State UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [struk, setStruk] = useState(null);

  // Load barang & pelanggan
  const muatBarang = () => {
    getBarang().then(r => setSemuaBarang(r.data.data)).catch(() => {});
  };

  useEffect(() => {
    muatBarang();
    // Kumpulkan nama pelanggan yang sudah pernah dipakai (dari riwayat transaksi)
    // supaya kasir tinggal pilih, bukan ketik ulang -> mencegah nama ganda/typo.
    getDaftarPelangganLedger()
      .then(r => setNamaPelangganDikenal((r.data.data || []).map(p => p.nama_tampil)))
      .catch(() => {});
  }, []);

  // Refresh otomatis data barang setiap kali tab/window ini kembali aktif
  // (misal stok baru saja diubah dari halaman Pembelian/Barang di tab lain)
  useEffect(() => {
    const onFocus = () => muatBarang();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Tutup dropdown saran nama pelanggan kalau klik di luar
  useEffect(() => {
    const handler = (e) => { if (pelangganInputRef.current && !pelangganInputRef.current.contains(e.target)) setShowSaranPelanggan(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Hasil filter barang
  const hasilCari = semuaBarang.filter(b => {
    if (search.length === 0) return false;
    const gabungan = `${b.nama || ''} ${b.kode_barang || ''} ${b.kategori || ''}`.toLowerCase();
    const kataKata = search.toLowerCase().trim().split(/\s+/);
    // Semua kata yang diketik harus ketemu (di kolom manapun), gak harus persis 1 frasa utuh
    // di 1 kolom yang sama -- biar "cat blue" bisa nemu "Avian (bright blue)" yang kategorinya "Cat Kayu dan Besi".
    return kataKata.every(kata => gabungan.includes(kata));
  }).slice(0, 30);

  // Tambah ke keranjang (Logika diperbaiki & disinkronkan)
  const tambahBarang = (barang) => {
    setKeranjang(prev => {
      const ada = prev.find(k => k.barang_id === barang.id);
      if (ada) {
        // Jika barang sudah ada, tambah qty nya (jangan melebihi stok)
        return prev.map(k => 
          k.barang_id === barang.id 
            ? { ...k, qty: Math.min(k.stok, k.qty + 1) } 
            : k
        );
      }
      // Jika barang baru, masukkan ke list keranjang
      return [...prev, { 
        barang_id: barang.id, 
        nama: barang.nama, 
        satuan: barang.satuan, 
        harga: Number(barang.harga_jual) || 0, 
        harga_beli: Number(barang.harga_beli) || 0,
        stok: Number(barang.stok) || 0, 
        qty: 1 
      }];
    });
    setSearch('');
    setShowDropdown(false);
    setError('');
  };

  // Parse input qty: dukung pecahan "1/4", "3/4", koma sbg desimal, dan desimal biasa
  const parseQtyInput = (val, stokMax) => {
    const str = String(val).trim();
    let qty;
    if (str.includes('/')) {
      const [pembilang, penyebut] = str.split('/').map(s => parseFloat(s.trim()));
      qty = (!isNaN(pembilang) && !isNaN(penyebut) && penyebut !== 0) ? pembilang / penyebut : NaN;
    } else {
      qty = parseFloat(str.replace(',', '.'));
    }
    if (isNaN(qty) || qty <= 0) qty = 0.01;
    qty = Math.round(qty * 100) / 100;
    if (stokMax != null && qty > stokMax) qty = stokMax;
    return qty;
  };

  // Update qty di keranjang - simpan apa adanya dulu selagi diketik (mendukung "1/4" dsb),
  // parsing final dilakukan di finalisasiQty() saat blur.
  const updateQty = (barang_id, val) => {
    const item = keranjang.find(k => k.barang_id === barang_id);
    if (!item) return;

    // Jika dihapus kosong, biarkan kosong sementara agar kasir bisa mengetik ulang
    if (val === '') {
      setKeranjang(prev => prev.map(k => k.barang_id === barang_id ? { ...k, qty: '' } : k));
      return;
    }

    setKeranjang(prev => prev.map(k => k.barang_id === barang_id ? { ...k, qty: val } : k));
  };

  // Set qty langsung ke angka final (dipakai tombol +/- dan preset ¼ ½ ¾ 1)
  const setQtyLangsung = (barang_id, num) => {
    const item = keranjang.find(k => k.barang_id === barang_id);
    if (!item) return;
    let qty = Math.round(num * 100) / 100;
    if (qty <= 0) qty = 0.01;
    if (qty > item.stok) qty = item.stok;
    setKeranjang(prev => prev.map(k => k.barang_id === barang_id ? { ...k, qty } : k));
  };

  // Dipanggil saat kasir selesai ngetik (blur) - konversi pecahan/koma jadi desimal final & cap ke stok
  const finalisasiQty = (barang_id) => {
    setKeranjang(prev => prev.map(k => {
      if (k.barang_id !== barang_id) return k;
      return { ...k, qty: parseQtyInput(k.qty, k.stok) };
    }));
  };

  // Update harga (kasir bisa override harga jual)
  const updateHarga = (barang_id, val) => {
    setKeranjang(prev => prev.map(k => k.barang_id === barang_id ? { ...k, harga: Number(val) || 0 } : k));
  };

  // Hapus item dari keranjang
  const hapusItem = (barang_id) => setKeranjang(prev => prev.filter(k => k.barang_id !== barang_id));

  // Kalkulasi
  const subtotal = keranjang.reduce((s, k) => s + (Number(k.qty) || 0) * k.harga, 0);
  const totalDiskon = Math.min(subtotal, Number(diskon) || 0);
  const total = subtotal - totalDiskon;
  const kembalian = metode === 'tunai' ? Math.max(0, (Number(bayar) || 0) - total) : 0;
  const kurangBayar = metode === 'tunai' && Number(bayar) > 0 && Number(bayar) < total;

  // Simpan transaksi
  const simpan = async () => {
    if (keranjang.length === 0) { setError('Keranjang masih kosong.'); return; }
    if (metode === 'tunai' && Number(bayar) > 0 && Number(bayar) < total) { 
      setError('Uang bayar kurang dari total.'); return; 
    }

    setSaving(true); 
    setError('');
    
    try {
      const payload = {
        pelanggan_id: null,
        nama_pelanggan: namaPelangganManual || 'Pelanggan Umum',
        metode_bayar: metode, 
        status: metode === 'hutang' ? 'hutang' : 'lunas',
        diskon: Number(totalDiskon),
        catatan,
        ...(tanggalManual ? { tanggal: tanggalManual } : {}),
        items: keranjang.map(k => ({ 
          barang_id: k.barang_id, 
          qty: parseQtyInput(k.qty, k.stok), 
          harga_jual: Number(k.harga) 
        }))
      };

      // 1. Kirim transaksi ke API backend
      const res = await createPenjualan(payload);
      
      if (res.data.success) {
        // 2. Ambil data stok terbaru dari server
        const dataTerbaru = await getBarang(); 
        setSemuaBarang(dataTerbaru.data.data);

        // 2b. Ambil nomor urut transaksi pada TANGGAL TRANSAKSI itu sendiri (biar sama dengan No. di
        // tabel laporan) -- kalau transaksinya di-backdate (tanggal manual), ambil rekap buat tanggal
        // itu, bukan rekap hari ini (soalnya transaksinya emang gak akan muncul di rekap hari ini).
        let nomorHarian = res.data.penjualan_id || res.data.data?.id || 'TRANS-NEW';
        try {
          const tanggalUntukRekap = tanggalManual ? tanggalManual.slice(0, 10) : undefined;
          const harianRes = await getLaporanHarian(tanggalUntukRekap);
          const totalHariIni = harianRes.data?.transaksi?.length;
          if (totalHariIni) nomorHarian = totalHariIni;
        } catch {
          // Kalau gagal ambil rekap harian, tetap pakai ID transaksi sebagai fallback
        }
        
        // 3. Set struk untuk muncul di layar
        setStruk({
          id: nomorHarian,
          kasir: user?.nama || 'Kasir',
          // Ambil nama pelanggan yang sesuai untuk struk
          pelanggan: namaPelangganManual || 'Pelanggan Umum',
          metode,
          items: keranjang,
          subtotal,
          diskon: totalDiskon,
          total,
          bayar: metode === 'tunai' ? (Number(bayar) || total) : total,
        });

        // 4. Reset form setelah sukses -- tanggal manual SENGAJA gak direset, biar gampang input
        // beberapa nota lama sekaligus di tanggal yang sama tanpa perlu buka & ketik ulang tiap kali.
        setKeranjang([]);
        setDiskon(0);
        setBayar('');
        setCatatan('');
        setNamaPelangganManual('');
        setMetode('tunai');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan transaksi.');
    } finally { 
      setSaving(false);
    }
  };

  return (
    <div style={isMobile
      ? { display: 'flex', flexDirection: 'column', gap: 16 }
      : { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, height: 'calc(100vh - 100px)', minHeight: 0 }
    }>

      {/* ── KIRI: Pilih Barang + Keranjang ─────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: isMobile ? undefined : 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: 20 }}>🛒 Transaksi Penjualan</h2>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {waktuSekarang.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} 
            {" | " + waktuSekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Search Barang */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => { setShowDropdown(true); muatBarang(); }}
              placeholder="Cari nama / kode barang dan tambah ke keranjang..."
              style={{ width: '100%', padding: '12px 14px 12px 40px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border-color .2s' }}
            />
          </div>
          {showDropdown && hasilCari.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 360, overflowY: 'auto' }}>
              {hasilCari.map(b => (
                <div key={b.id} onClick={() => tambahBarang(b)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{b.nama}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{b.kode_barang} · {b.kategori}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#059669', fontSize: 14 }}>{formatRp(b.harga_jual)}</div>
                    <div style={{ fontSize: 12, color: getWarnaStok(b.stok, b.stok_minimum) }}>
                      Stok: {Number(b.stok)} {b.satuan}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showDropdown && search.length > 0 && hasilCari.length === 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 14, zIndex: 50 }}>
              Barang tidak ditemukan
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Tabel Keranjang */}
        <div style={{ flex: isMobile ? 'unset' : 1, minHeight: isMobile ? 300 : undefined, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'auto' }}>
          {keranjang.length === 0 ? (
            <div style={{ height: '100%', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>Keranjang kosong</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                <tr>
                  {['Barang', 'Harga Beli', 'Harga Jual', 'Qty', 'Subtotal', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keranjang.map(item => (
                  <tr key={item.barang_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 500 }}>{item.nama}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>Stok: {item.stok} {item.satuan}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 13 }}>
                      {formatRp(item.harga_beli)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <input
                        type="number" value={Number(item.harga)}
                        onChange={e => updateHarga(item.barang_id, e.target.value)}
                        style={{ width: 110, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, textAlign: 'right' }}
                        min={0}
                      />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {(() => {
                        const satuanLower = (item.satuan || '').toLowerCase();
                        const isPecahan = ['kg', 'kilogram', 'meter', 'mtr', 'm', 'liter', 'ltr', 'cm'].includes(satuanLower);
                        const step = isPecahan ? 0.25 : 1;
                        const qtyNum = Number(item.qty) || 0;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button onClick={() => setQtyLangsung(item.barang_id, Math.max(0.01, qtyNum - step))}
                                style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>−</button>
                              <input
                                type="text" inputMode="decimal" value={item.qty}
                                placeholder="1/4"
                                onChange={e => updateQty(item.barang_id, e.target.value)}
                                onBlur={() => finalisasiQty(item.barang_id)}
                                style={{ width: `${Math.max(56, String(item.qty).length * 12 + 25)}px`, padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center' }}
                              />
                              <button onClick={() => setQtyLangsung(item.barang_id, qtyNum + step)}
                                style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+</button>
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
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#059669' }}>
                      {formatRp((Number(item.qty) || 0) * item.harga)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => hapusItem(item.barang_id)}
                        style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── KANAN: Ringkasan & Pembayaran ───────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: isMobile ? undefined : 0, height: isMobile ? 'auto' : '100%' }}>

        {/* Tanggal manual -- khusus owner, buat input ulang nota yang dibatalkan/salah input
            biar tanggalnya balik sesuai tanggal transaksi aslinya, bukan hari ini.
            Ditaruh paling atas biar kalender bawaan browser gak nutupin tombol Simpan di bawah. */}
        {user?.role === 'owner' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: showTanggalManual ? '12px 16px' : '10px 16px' }}>
            {!showTanggalManual ? (
              <button onClick={() => setShowTanggalManual(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: '#64748b', padding: 0 }}
              >
                📅 Atur tanggal transaksi manual (opsional)
              </button>
            ) : (
              <>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                  TANGGAL TRANSAKSI — <span style={{ fontWeight: 400 }}>kosongkan buat pakai waktu sekarang</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    value={tanggalManual}
                    onChange={e => setTanggalManual(e.target.value)}
                    max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                  />
                  <button onClick={() => { setTanggalManual(''); setShowTanggalManual(false); }}
                    style={{ padding: '9px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, color: '#64748b' }}
                  >Batal</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pelanggan */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 4 }}>PELANGGAN</label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Input nama pelanggan, dengan dropdown saran custom dari nama-nama yang sudah pernah dipakai */}
            <div ref={pelangganInputRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={namaPelangganManual}
                onChange={e => { setNamaPelangganManual(e.target.value); setShowSaranPelanggan(true); }}
                onFocus={() => setShowSaranPelanggan(true)}
                placeholder="Ketik nama pelanggan (kosongkan kalau Umum)..."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
              {showSaranPelanggan && (() => {
                const saran = [...new Set(namaPelangganDikenal)]
                  .filter(n => n.toLowerCase().includes(namaPelangganManual.toLowerCase()))
                  .sort((a, b) => a.localeCompare(b))
                  .slice(0, 8);
                if (saran.length === 0) return null;
                return (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)', zIndex: 20,
                    maxHeight: 220, overflowY: 'auto'
                  }}>
                    {saran.map((nama, i) => (
                      <div
                        key={nama}
                        onClick={() => { setNamaPelangganManual(nama); setShowSaranPelanggan(false); }}
                        style={{
                          padding: '9px 12px', fontSize: 13.5, cursor: 'pointer',
                          borderBottom: i < saran.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>👤</span>
                        {nama}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Ringkasan Harga */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
          <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>RINGKASAN TRANSAKSI</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Subtotal ({keranjang.length} item)</span>
            <span style={{ fontWeight: 500 }}>{formatRp(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Diskon (Rp)</span>
            <input
              type="text" inputMode="numeric" value={diskon}
              onChange={e => {
                const angka = e.target.value.replace(/\D/g, ''); // cuma izinin digit
                const num = angka === '' ? '' : Math.min(subtotal, Number(angka));
                setDiskon(num);
              }}
              style={{ width: 120, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, textAlign: 'right' }}
              placeholder="0"
            />
          </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>TOTAL</span>
            <span style={{ fontWeight: 700, fontSize: 19, color: '#1e293b' }}>{formatRp(total)}</span>
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>METODE PEMBAYARAN</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: metode === 'tunai' ? 12 : 0 }}>
            {METODE.map(m => (
              <button key={m} onClick={() => setMetode(m)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                  background: metode === m ? '#1e293b' : '#f8fafc',
                  color: metode === m ? '#fff' : '#64748b',
                  border: metode === m ? '1px solid #1e293b' : '1px solid #e2e8f0'
                }}>{m === 'tunai' ? '💵' : m === 'transfer' ? '🏦' : '📱'} {m}</button>
            ))}
          </div>

          {metode === 'tunai' && (
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 5 }}>Uang Diterima (Rp)</label>
              <input
                type="number" value={bayar}
                onChange={e => setBayar(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !saving && keranjang.length > 0) { e.preventDefault(); simpan(); } }}
                placeholder={total}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${kurangBayar ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontWeight: 500 }}
              />
              {Number(bayar) > 0 && !kurangBayar && (
                <div style={{ marginTop: 7, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span style={{ color: '#166534' }}>Kembalian</span>
                  <span style={{ fontWeight: 700, color: '#166534', fontSize: 15 }}>{formatRp(kembalian)}</span>
                </div>
              )}
              {kurangBayar && (
                <div style={{ marginTop: 7, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, color: '#dc2626' }}>
                  ⚠️ Kurang {formatRp(total - Number(bayar))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Catatan */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', flex: isMobile ? 'unset' : 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 6 }}>CATATAN (opsional)</label>
          <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
            rows={3} placeholder="Catatan untuk transaksi ini..."
            style={{ width: '100%', flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {/* Tombol Simpan -- tetap nempel di bawah */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setKeranjang([]); setDiskon(0); setBayar(''); setError(''); }}
            style={{ flex: 1, padding: '11px 0', background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, color: '#64748b', fontWeight: 500 }}>
            🗑 Batal
          </button>
          <button onClick={simpan} disabled={saving || keranjang.length === 0}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', cursor: keranjang.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700,
              background: keranjang.length === 0 ? '#e2e8f0' : saving ? '#64748b' : '#16a34a',
              color: keranjang.length === 0 ? '#94a3b8' : '#fff',
            }}>
            {saving ? '⏳ Menyimpan...' : '✅ Simpan Transaksi'}
          </button>
        </div>
      </div>

      {/* Modal Struk */}
      {struk && <StrukModal transaksi={struk} onClose={() => setStruk(null)} />}
    </div>
  );
}