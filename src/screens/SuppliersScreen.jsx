import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

const emptyForm = { name: '', contactPerson: '', phone: '', address: '' };

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);

  function reload() {
    api.listAllSuppliers().then((d) => setSuppliers(d.suppliers)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  async function submitCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.createSupplier(form);
      setForm(emptyForm);
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(s) {
    try {
      await api.updateSupplier(s.id, { isActive: !s.is_active });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditForm({ name: s.name, contactPerson: s.contact_person || '', phone: s.phone || '', address: s.address || '' });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }
  async function saveEdit(id) {
    if (!editForm.name.trim()) {
      setError('Nama wajib diisi');
      return;
    }
    try {
      await api.updateSupplier(id, editForm);
      setError(null);
      cancelEdit();
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Supplier</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama supplier" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Kontak person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        <input className="input" placeholder="Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" placeholder="Alamat" style={{ flex: 1, minWidth: 200 }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Kontak</th><th>Telepon</th><th>Alamat</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                {editingId === s.id ? (
                  <>
                    <td><input className="input" autoFocus value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                    <td><input className="input" value={editForm.contactPerson} onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })} /></td>
                    <td><input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                    <td><input className="input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></td>
                    <td><span className={`badge ${s.is_active ? 'active' : 'inactive'}`}>{s.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td>
                      <button className="btn-primary" onClick={() => saveEdit(s.id)} style={{ marginRight: 8 }}>Simpan</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Batal</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{s.name}</td>
                    <td>{s.contact_person}</td>
                    <td>{s.phone}</td>
                    <td>{s.address}</td>
                    <td><span className={`badge ${s.is_active ? 'active' : 'inactive'}`}>{s.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td>
                      <button className="btn-secondary" onClick={() => startEdit(s)} style={{ marginRight: 8 }}>Ubah</button>
                      <button className="btn-secondary" onClick={() => toggleActive(s)}>{s.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada supplier</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
