import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

const PAGE_SIZE = 20;

export default function ProductsScreen({ onSelectProduct }) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', categoryId: '', baseUnitId: '' });

  function reload(targetPage = page) {
    api.listProducts({ q: query, page: targetPage, limit: PAGE_SIZE })
      .then((d) => {
        setProducts(d.products);
        setTotal(d.total);
        setPage(d.page);
      })
      .catch((err) => setError(err.message));
  }

  // Search-as-you-type dgn debounce, sama pola dgn search-select lain di
  // admin panel — reset ke halaman 1 tiap kali kata kuncinya berubah
  // (hasil pencarian baru, halaman lama sudah tidak relevan). Load
  // PERTAMA (mount) sengaja TIDAK ikut nunggu debounce — biar daftar
  // langsung tampil begitu halaman dibuka, tidak delay 300ms utk kosong.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      reload(1);
      return;
    }
    const timer = setTimeout(() => reload(1), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    api.listCategories().then((d) => setCategories(d.categories));
    api.listUnits().then((d) => setUnits(d.units));
  }, []);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  async function submitCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.baseUnitId) {
      setError('Nama dan satuan dasar wajib diisi');
      return;
    }
    try {
      const created = await api.createProduct(form);
      setShowCreate(false);
      setForm({ name: '', sku: '', categoryId: '', baseUnitId: '' });
      setError(null);
      reload();
      onSelectProduct(created.product.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Produk</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Tambah Produk</button>
      </div>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Produk Baru</h3>
          <form onSubmit={submitCreate}>
            <div className="inline-form">
              <input className="input" placeholder="Nama produk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="SKU (opsional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">(tanpa kategori)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input" value={form.baseUnitId} onChange={(e) => setForm({ ...form, baseUnitId: e.target.value })}>
                <option value="">Pilih satuan dasar</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button className="btn-primary" type="submit">Simpan</button>
              <button className="btn-secondary" type="button" onClick={() => setShowCreate(false)}>Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <input
          className="input"
          style={{ width: '100%', maxWidth: 360, marginBottom: 12 }}
          placeholder="Cari nama/SKU produk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <table>
          <thead><tr><th>SKU</th><th>Nama</th><th>Kategori</th><th>Satuan Dasar</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku || '-'}</td>
                <td>{p.name}</td>
                <td>{p.category_name || '-'}</td>
                <td>{p.base_unit_name}</td>
                <td><span className={`badge ${p.is_active ? 'active' : 'inactive'}`}>{p.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td><button className="btn-secondary" onClick={() => onSelectProduct(p.id)}>Kelola</button></td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                {query ? 'Tidak ada produk yang cocok' : 'Belum ada produk'}
              </td></tr>
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} produk
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => reload(page - 1)}>&larr; Sebelumnya</button>
              <span style={{ fontSize: 13, color: '#666' }}>Halaman {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => reload(page + 1)}>Berikutnya &rarr;</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
