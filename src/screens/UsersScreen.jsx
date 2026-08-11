import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = { role: 'kasir', fullName: '', username: '', password: '', pin: '' };

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [resettingId, setResettingId] = useState(null);
  const [resetValue, setResetValue] = useState('');
  const [changingRoleFor, setChangingRoleFor] = useState(null);

  function reload() {
    api.listUsers().then((d) => setUsers(d.users)).catch((err) => setError(err.message));
    api.listRoles().then((d) => setRoles(d.roles)).catch(() => {}); // gagal senyap — role dropdown cuma tidak muncul kalau bukan superadmin
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

  async function changeRole(u, roleId) {
    if (roleId === u.role_id) { setChangingRoleFor(null); return; }
    try {
      await api.updateUserRole(u.id, roleId);
      setChangingRoleFor(null);
      flash(`Role ${u.full_name} berhasil diubah`);
      reload();
    } catch (err) {
      // Server yang benar-benar menegakkan (mis. tolak pindah superadmin
      // terakhir) — UI cuma menampilkan pesannya, bukan mencegah sendiri.
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
      // has_password (bukan bandingkan nama role) — supaya benar utk role
      // APAPUN yang login pakai password (admin, superadmin, atau role
      // custom lain nanti), bukan cuma role bernama literal 'admin'.
      if (u.has_password) {
        await api.updateUser(u.id, { password: resetValue });
      } else {
        await api.updateUser(u.id, { pin: resetValue });
      }
      setResettingId(null);
      setResetValue('');
      flash(u.has_password ? 'Password berhasil direset' : 'PIN berhasil direset');
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
                <td>
                  {changingRoleFor === u.id ? (
                    <select
                      className="input"
                      autoFocus
                      defaultValue={u.role_id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      onBlur={() => setChangingRoleFor(null)}
                    >
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  ) : (
                    <span
                      onClick={() => roles.length > 0 && setChangingRoleFor(u.id)}
                      style={{ cursor: roles.length > 0 ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title={roles.length > 0 ? 'Klik utk ubah role' : ''}
                    >
                      {u.role}
                      {!!u.is_superadmin && <span className="badge active" style={{ fontSize: 10 }}>SUPERADMIN</span>}
                      {roles.length > 0 && <span style={{ fontSize: 11, color: '#999' }}>✎</span>}
                    </span>
                  )}
                </td>
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
                        placeholder={u.has_password ? 'Password baru' : 'PIN baru (4-6 digit)'}
                        type={u.has_password ? 'password' : 'text'}
                        value={resetValue}
                        onChange={(e) => setResetValue(u.has_password ? e.target.value : e.target.value.replace(/\D/g, ''))}
                        maxLength={u.has_password ? undefined : 6}
                        autoFocus
                      />
                      <button className="btn-primary" onClick={() => saveReset(u)}>Simpan</button>
                      <button className="btn-secondary" onClick={() => setResettingId(null)}>Batal</button>
                    </span>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => startEditName(u)} style={{ marginRight: 8 }}>Ubah Nama</button>
                      <button className="btn-secondary" onClick={() => startReset(u)} style={{ marginRight: 8 }}>
                        {u.has_password ? 'Reset Password' : 'Reset PIN'}
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
