import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);

  function reload() {
    api.listCategories().then((d) => setCategories(d.categories)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createCategory({ name: newName.trim() });
      setNewName('');
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(cat) {
    try {
      await api.updateCategory(cat.id, { isActive: !cat.is_active });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Kategori Produk</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama kategori baru" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><span className={`badge ${c.is_active ? 'active' : 'inactive'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td><button className="btn-secondary" onClick={() => toggleActive(c)}>{c.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada kategori</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
