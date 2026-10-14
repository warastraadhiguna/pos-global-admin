import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function StockScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listProductStock()
      .then((d) => setProducts(d.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // Dipakai di kop lembar cetak saja — gagal diam-diam kalau tidak ada izin,
    // bukan krusial (kop tanpa nama toko tetap bisa dipakai).
    api.getStoreSettings().then((d) => setStoreName(d.settings.store_name)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [query, products]);

  return (
    <div>
      {/* Kop cetak — HANYA tampil saat dicetak (lihat .print-header di index.css),
          tidak pernah terlihat di layar. */}
      <div className="print-header">
        <h2 style={{ margin: 0 }}>{storeName || 'Lembar Hitung Stok'}</h2>
        <div style={{ fontSize: 13 }}>
          Lembar Acuan Stock Opname — dicetak {new Date().toLocaleString('id-ID')}
        </div>
      </div>

      <h2 className="no-print">Stok Produk</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 240, maxWidth: 360 }}
            placeholder="Cari nama/SKU produk..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Cetak / Download Lembar Stok
          </button>
        </div>
        <p className="no-print" style={{ color: '#666', fontSize: 13, marginTop: -4 }}>
          Cetak lembar ini (atau simpan sebagai PDF lewat dialog print) untuk dipakai acuan hitung fisik di lapangan —
          kolom "Stok Fisik" & "Catatan" dikosongkan untuk diisi tangan. Hasil hitungnya nanti diinput lewat menu
          Stock Opname.
        </p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>SKU</th>
              <th>Nama</th>
              <th>Satuan Dasar</th>
              <th>Stok Sistem</th>
              <th>Stok Fisik</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Memuat stok...</td></tr>}
            {!loading && filtered.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.sku || '-'}</td>
                <td>{p.name}</td>
                <td>{p.base_unit_name}</td>
                <td style={{ fontWeight: 600 }}>{Number(p.qty_base).toLocaleString('id-ID')} {p.base_unit_name}</td>
                <td></td>
                <td></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada produk yang cocok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
