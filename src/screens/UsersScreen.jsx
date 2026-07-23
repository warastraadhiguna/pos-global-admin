import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = { role: 'kasir', fullName: '', username: '', password: '', pin: '' };

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [resettingId, setResettingId] = useState(null);
  const [resetValue, setResetValue] = useState('');

  function reload() {
    api.listUsers().then((d) => setUsers(d.users)).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  }

  async function submitCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser(form);
      setForm(emptyForm);
      flash('User baru berhasil dibuat');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditName(u) {
    setEditingId(u.id);
    setEditFullName(u.full_name);
    setResettingId(null);
  }

  async function saveEditName(id) {
    if (!editFullName.trim()) return;
    try {
      await api.updateUser(id, { fullName: editFullName.trim() });
      setEditingId(null);
      flash('Nama berhasil diubah');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(u) {
    try {
      await api.updateUser(u.id, { isActive: !u.is_active });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startReset(u) {
    setResettingId(u.id);
    setResetValue('');
    setEditingId(null);
  }

  async function saveReset(u) {
    if (!resetValue) return;
    try {
      if (u.role === 'admin') {
        await api.updateUser(u.id, { password: resetValue });
      } else {
        await api.updateUser(u.id, { pin: resetValue });
      }
      setResettingId(null);
      setResetValue('');
      flash(u.role === 'admin' ? 'Password berhasil direset' : 'PIN berhasil direset');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Kelola Pengguna</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Kasir login pakai PIN (4-6 digit), admin login pakai username + password.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Tambah Pengguna</h3>
        <form onSubmit={submitCreate}>
          <div className="inline-form">
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
            <input className="input" placeholder="Nama lengkap" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            {form.role === 'admin' ? (
              <>
                <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                <input className="input" type="password" placeholder="Password (min 6 karakter)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </>
            ) : (
              <input className="input" placeholder="PIN (4-6 digit)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} maxLength={6} />
            )}
            <button className="btn-primary" type="submit">Tambah</button>
          </div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Role</th><th>Username</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {editingId === u.id ? (
                    <input className="input" style={{ width: 160 }} autoFocus value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                  ) : (
                    u.full_name
                  )}
                </td>
                <td>{u.role}</td>
                <td>{u.username || '-'}</td>
                <td><span className={`badge ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                <td>
                  {editingId === u.id ? (
                    <>
                      <button className="btn-primary" onClick={() => saveEditName(u.id)} style={{ marginRight: 8 }}>Simpan</button>
                      <button className="btn-secondary" onClick={() => setEditingId(null)}>Batal</button>
                    </>
                  ) : resettingId === u.id ? (
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input"
                        style={{ width: 140 }}
                        placeholder={u.role === 'admin' ? 'Password baru' : 'PIN baru (4-6 digit)'}
                        type={u.role === 'admin' ? 'password' : 'text'}
                        value={resetValue}
                        onChange={(e) => setResetValue(u.role === 'admin' ? e.target.value : e.target.value.replace(/\D/g, ''))}
                        maxLength={u.role === 'admin' ? undefined : 6}
                        autoFocus
                      />
                      <button className="btn-primary" onClick={() => saveReset(u)}>Simpan</button>
                      <button className="btn-secondary" onClick={() => setResettingId(null)}>Batal</button>
                    </span>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => startEditName(u)} style={{ marginRight: 8 }}>Ubah Nama</button>
                      <button className="btn-secondary" onClick={() => startReset(u)} style={{ marginRight: 8 }}>
                        {u.role === 'admin' ? 'Reset Password' : 'Reset PIN'}
                      </button>
                      <button className="btn-secondary" onClick={() => toggleActive(u)}>{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada pengguna</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
