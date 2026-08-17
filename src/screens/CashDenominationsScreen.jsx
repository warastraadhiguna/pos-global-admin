import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function CashDenominationsScreen() {
  const [denominations, setDenominations] = useState([]);
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  function reload() {
    api.listAllCashDenominations().then((d) => setDenominations(d.denominations)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    const amount = Number(newAmount);
    if (!amount || amount <= 0) return;
    try {
      await api.createCashDenomination({ amount, sortOrder: denominations.length });
      setNewAmount('');
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(d) {
    try {
      await api.updateCashDenomination(d.id, { isActive: !d.is_active });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(d) {
    setEditingId(d.id);
    setEditAmount(String(d.amount));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount('');
  }

  async function saveEdit(id) {
    const amount = Number(editAmount);
    if (!amount || amount <= 0) {
      setError('Nominal harus > 0');
      return;
    }
    try {
      await api.updateCashDenomination(id, { amount });
      setError(null);
      cancelEdit();
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Pecahan Uang</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Tombol shortcut nominal tunai di layar checkout kasir (mis. 10.000, 20.000, 50.000). Kasir menekan tombol ini untuk menambah nominal uang yang diterima.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" type="number" min="1" placeholder="Nominal baru (Rp)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nominal</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {denominations.map((d) => (
              <tr key={d.id}>
                <td>
                  {editingId === d.id ? (
                    <input
                      className="input"
                      type="number"
                      min="1"
                      autoFocus
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      style={{ width: 140 }}
                    />
                  ) : (
                    `Rp${Number(d.amount).toLocaleString('id-ID')}`
                  )}
                </td>
                <td><span className={`badge ${d.is_active ? 'active' : 'inactive'}`}>{d.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>
                  {editingId === d.id ? (
                    <>
                      <button className="btn-primary" onClick={() => saveEdit(d.id)} style={{ marginRight: 8 }}>Simpan</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Batal</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => startEdit(d)} style={{ marginRight: 8 }}>Ubah</button>
                      <button className="btn-secondary" onClick={() => toggleActive(d)}>{d.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {denominations.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada pecahan uang</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
