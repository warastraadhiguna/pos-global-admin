import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function PriceLevelsScreen() {
  const [priceLevels, setPriceLevels] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);

  function reload() {
    api.listPriceLevels().then((d) => setPriceLevels(d.priceLevels)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createPriceLevel({ name: newName.trim() });
      setNewName('');
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Level Harga</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Mis. ecer, grosir. Tier harga per produk diatur di halaman Produk.</p>
      {error && <div className="error-banner">{error}</div>}
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama level baru" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th></tr></thead>
          <tbody>
            {priceLevels.map((p) => (
              <tr key={p.id}><td>{p.name}</td></tr>
            ))}
            {priceLevels.length === 0 && <tr><td style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada level harga</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
