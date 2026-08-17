import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function UnitsScreen() {
  const [units, setUnits] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);

  function reload() {
    api.listUnits().then((d) => setUnits(d.units)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createUnit({ name: newName.trim() });
      setNewName('');
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Satuan</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Satuan dasar global (pcs, dus, lusin, dst). Konversi per produk diatur di halaman Produk.</p>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama satuan baru (mis. lusin)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th></tr></thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}><td>{u.name}</td></tr>
            ))}
            {units.length === 0 && <tr><td style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada satuan</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
