import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState([]);
  const [newName, setNewName] = useState('');
  const [newIsCash, setNewIsCash] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIsCash, setEditIsCash] = useState(false);

  function reload() {
    api.listAllPaymentMethods().then((d) => setMethods(d.methods)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createPaymentMethod({ name: newName.trim(), isCash: newIsCash, sortOrder: methods.length });
      setNewName('');
      setNewIsCash(false);
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(m) {
    try {
      await api.updatePaymentMethod(m.id, { isActive: !m.is_active });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditIsCash(!!m.is_cash);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditIsCash(false);
  }

  async function saveEdit(id) {
    if (!editName.trim()) {
      setError('Nama wajib diisi');
      return;
    }
    try {
      await api.updatePaymentMethod(id, { name: editName.trim(), isCash: editIsCash });
      setError(null);
      cancelEdit();
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Metode Pembayaran</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Pilihan metode bayar di layar checkout kasir (Tunai, QRIS, Kartu, dst). Tandai "Tunai/kas fisik" hanya untuk
        metode yang uangnya benar-benar masuk laci — dipakai untuk hitung kas seharusnya saat tutup shift.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama metode baru (mis. QRIS)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={newIsCash} onChange={(e) => setNewIsCash(e.target.checked)} />
          Tunai / kas fisik
        </label>
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Tipe</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.id}>
                <td>
                  {editingId === m.id ? (
                    <input className="input" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: 180 }} />
                  ) : (
                    m.name
                  )}
                </td>
                <td>
                  {editingId === m.id ? (
                    <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={editIsCash} onChange={(e) => setEditIsCash(e.target.checked)} />
                      Tunai / kas fisik
                    </label>
                  ) : (
                    <span className={`badge ${m.is_cash ? 'active' : 'inactive'}`}>{m.is_cash ? 'Tunai (kas fisik)' : 'Non-tunai'}</span>
                  )}
                </td>
                <td><span className={`badge ${m.is_active ? 'active' : 'inactive'}`}>{m.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>
                  {editingId === m.id ? (
                    <>
                      <button className="btn-primary" onClick={() => saveEdit(m.id)} style={{ marginRight: 8 }}>Simpan</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Batal</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => startEdit(m)} style={{ marginRight: 8 }}>Ubah</button>
                      <button className="btn-secondary" onClick={() => toggleActive(m)}>{m.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {methods.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada metode pembayaran</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
