import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function StockScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listProductStock()
      .then((d) => setProducts(d.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }, [query, products]);

  return (
    <div>
      <h2>Stok Produk</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        <input
          className="input"
          style={{ width: '100%', maxWidth: 360, marginBottom: 12 }}
          placeholder="Cari nama/SKU produk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <table>
          <thead><tr><th>SKU</th><th>Nama</th><th>Satuan Dasar</th><th>Stok</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Memuat stok...</td></tr>}
            {!loading && filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.sku || '-'}</td>
                <td>{p.name}</td>
                <td>{p.base_unit_name}</td>
                <td style={{ fontWeight: 600 }}>{Number(p.qty_base).toLocaleString('id-ID')} {p.base_unit_name}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada produk yang cocok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
