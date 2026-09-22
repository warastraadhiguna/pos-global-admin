import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

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
  const [totpUser, setTotpUser] = useState(null);
  const [totpStatus, setTotpStatus] = useState(null);
  const [totpSetupResult, setTotpSetupResult] = useState(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState(null);

  function reload() {
    api.listUsers().then((d) => setUsers(d.users)).catch((err) => setError(err.message));
    api.listRoles().then((d) => setRoles(d.roles)).catch(() => {}); // gagal senyap — role dropdown cuma tidak muncul kalau bukan superadmin
  }

  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
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

  async function deleteUser(u) {
    try {
      await api.deleteUser(u.id);
      setError(null);
      flash(`User "${u.full_name}" dihapus permanen`);
      reload();
    } catch (err) {
      // Server yang benar-benar menegakkan (mis. tolak kalau user masih
      // punya riwayat transaksi/login — pesan errornya sudah menyarankan
      // Nonaktifkan sebagai gantinya) — UI cuma menampilkan pesannya.
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

  // Kode Otorisasi (TOTP) — fitur "Jual di Bawah HPP". Cuma berguna utk
  // user yang role-nya punya izin sales.sell_below_cost (server yang
  // menolak kalau tidak, lihat catatan di setupTotp) — dibuka utk SEMUA
  // user di sini (bukan cuma yang eligible) supaya admin bisa lihat
  // pesan error server-nya sendiri kalau salah pilih user.
  async function openTotpModal(u) {
    setTotpUser(u);
    setTotpSetupResult(null);
    setTotpError(null);
    setTotpStatus(null);
    try {
      const status = await api.getTotpStatus(u.id);
      setTotpStatus(status);
    } catch (err) {
      setTotpError(err.message);
    }
  }

  function closeTotpModal() {
    setTotpUser(null);
    setTotpSetupResult(null);
    setTotpError(null);
    setTotpStatus(null);
  }

  async function generateTotp() {
    if (!totpUser) return;
    setTotpLoading(true);
    setTotpError(null);
    try {
      const result = await api.setupTotp(totpUser.id);
      setTotpSetupResult(result);
      setTotpStatus({ enabled: true, enabledAt: new Date().toISOString() });
    } catch (err) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  }

  async function disableTotpFor() {
    if (!totpUser) return;
    setTotpLoading(true);
    setTotpError(null);
    try {
      await api.disableTotp(totpUser.id);
      setTotpStatus({ enabled: false, enabledAt: null });
      setTotpSetupResult(null);
    } catch (err) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
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
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <Banner type="success" message={info} onClose={() => setInfo(null)} />

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
                      <button className="btn-secondary" onClick={() => toggleActive(u)} style={{ marginRight: 8 }}>{u.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                      <button className="btn-secondary" onClick={() => openTotpModal(u)} style={{ marginRight: 8 }}>Kode Otorisasi</button>
                      <button className="btn-danger" onClick={() => deleteUser(u)}>Hapus</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada pengguna</td></tr>}
          </tbody>
        </table>
      </div>

      {totpUser && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 480 }}>
            <h3 style={{ marginTop: 0 }}>Kode Otorisasi — {totpUser.full_name}</h3>
            <p style={{ fontSize: 13, color: '#666' }}>
              Dipakai fitur "Jual di Bawah HPP" di kasir — user ini bisa dijadikan "Owner" pemberi kode kalau
              role-nya punya izin <code>sales.sell_below_cost</code> (atur lewat menu Kelola Role).
            </p>
            <Banner type="error" message={totpError} onClose={() => setTotpError(null)} />

            {totpStatus && (
              <p style={{ fontSize: 13 }}>
                Status: <strong>{totpStatus.enabled ? 'Aktif' : 'Belum diaktifkan'}</strong>
                {totpStatus.enabled && totpStatus.enabledAt && (
                  <> (sejak {new Date(totpStatus.enabledAt).toLocaleString('id-ID')})</>
                )}
              </p>
            )}

            {totpSetupResult ? (
              <div style={{ textAlign: 'center', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 13, marginTop: 0 }}>
                  Scan QR ini SEKARANG pakai app authenticator (Google Authenticator, Microsoft Authenticator, dll)
                  di HP Owner — QR ini <strong>tidak akan ditampilkan lagi</strong> setelah modal ini ditutup.
                </p>
                <img src={totpSetupResult.qrDataUrl} alt="QR Kode Otorisasi" style={{ width: 200, height: 200 }} />
                <p style={{ fontSize: 12, color: '#666' }}>Tidak bisa scan? Masukkan manual kode ini di app-nya:</p>
                <code style={{ fontSize: 14, letterSpacing: 1 }}>{totpSetupResult.secret}</code>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#666' }}>
                {totpStatus?.enabled
                  ? 'Generate ulang kalau HP Owner ganti/hilang — ini akan mengganti kode yang lama (QR lama otomatis tidak berlaku lagi).'
                  : 'Belum ada kode otorisasi utk user ini — klik generate utk membuat QR pertama kali.'}
              </p>
            )}

            <button className="btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={generateTotp} disabled={totpLoading}>
              {totpLoading ? 'Memproses...' : totpStatus?.enabled ? 'Generate Ulang / Reset QR' : 'Generate QR'}
            </button>
            {totpStatus?.enabled && (
              <button className="btn-danger" style={{ width: '100%', marginBottom: 8 }} onClick={disableTotpFor} disabled={totpLoading}>
                Nonaktifkan Kode Otorisasi
              </button>
            )}
            <button className="btn-secondary" style={{ width: '100%' }} onClick={closeTotpModal} disabled={totpLoading}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
