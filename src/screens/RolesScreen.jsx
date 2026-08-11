import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

// Urutan kolom aksi di matriks — aksi standar dulu (lihat/tambah/edit/hapus/
// void), baru aksi sensitif/bespoke lain. Kolom yang tidak dipakai modul
// manapun tetap tidak dirender (dihitung dari katalog asli, bukan daftar
// tetap) — supaya matriks otomatis menyesuaikan kalau katalog nanti berubah.
const ACTION_PRIORITY = ['view', 'create', 'edit', 'edit_base_price', 'delete', 'void', 'manage', 'close_period'];
const ACTION_LABELS = {
  view: 'Lihat', create: 'Tambah', edit: 'Edit', delete: 'Hapus', void: 'Void',
  edit_base_price: 'Ubah Harga Baku', manage: 'Kelola', close_period: 'Tutup Periode',
};

function actionSort(a, b) {
  const ia = ACTION_PRIORITY.indexOf(a);
  const ib = ACTION_PRIORITY.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

export default function RolesScreen() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermIds, setSelectedPermIds] = useState(new Set());
  const [originalPermIds, setOriginalPermIds] = useState(new Set());
  const [permsLoading, setPermsLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [confirmSensitive, setConfirmSensitive] = useState(null); // { added: [Permission] } | null

  const [newRoleName, setNewRoleName] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  function reload() {
    api.listRoles().then((d) => setRoles(d.roles)).catch((err) => setError(err.message));
    api.getPermissionsCatalog().then((d) => setCatalog(d.permissions)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const modules = useMemo(() => {
    const byModule = {};
    for (const p of catalog) {
      if (!byModule[p.module]) byModule[p.module] = [];
      byModule[p.module].push(p);
    }
    return Object.keys(byModule).sort().map((module) => ({
      module,
      permissions: byModule[module].sort((a, b) => actionSort(a.action, b.action)),
    }));
  }, [catalog]);

  const columnActions = useMemo(() => {
    const set = new Set(catalog.map((p) => p.action));
    return [...set].sort(actionSort);
  }, [catalog]);

  function selectRole(role) {
    setSelectedRoleId(role.id);
    setRenameDraft(role.name);
    setConfirmSensitive(null);
    if (role.is_superadmin) {
      setSelectedPermIds(new Set());
      setOriginalPermIds(new Set());
      return;
    }
    setPermsLoading(true);
    api.getRolePermissionIds(role.id)
      .then((d) => {
        const set = new Set(d.permissionIds);
        setSelectedPermIds(set);
        setOriginalPermIds(set);
      })
      .catch((err) => setError(err.message))
      .finally(() => setPermsLoading(false));
  }

  function togglePermission(permissionId) {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  async function submitCreateRole(e) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const { role } = await api.createRole({ name: newRoleName.trim() });
      setNewRoleName('');
      setError(null);
      flash(`Role "${role.name}" dibuat`);
      reload();
      selectRole(role);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitRename() {
    if (!selectedRole || !renameDraft.trim()) return;
    setRenaming(true);
    try {
      await api.updateRoleName(selectedRole.id, { name: renameDraft.trim() });
      setError(null);
      flash('Nama role disimpan');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setRenaming(false);
    }
  }

  async function actuallySavePermissions() {
    setSavingPerms(true);
    setConfirmSensitive(null);
    try {
      await api.updateRolePermissions(selectedRole.id, [...selectedPermIds]);
      setOriginalPermIds(new Set(selectedPermIds));
      setError(null);
      flash(`Izin role "${selectedRole.name}" disimpan`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPerms(false);
    }
  }

  function requestSavePermissions() {
    if (!selectedRole) return;
    // Aksi sensitif yang BARU dicentang (belum ada sebelumnya) — minta
    // konfirmasi eksplisit dulu, supaya superadmin sadar sedang memberi
    // wewenang berisiko sebelum benar-benar tersimpan.
    const newlyAdded = catalog.filter((p) => p.is_sensitive && selectedPermIds.has(p.id) && !originalPermIds.has(p.id));
    if (newlyAdded.length > 0) {
      setConfirmSensitive({ added: newlyAdded });
      return;
    }
    actuallySavePermissions();
  }

  async function handleDeleteRole(role) {
    try {
      await api.deleteRole(role.id);
      setError(null);
      flash(`Role "${role.name}" dihapus`);
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const permsDirty = selectedRole && !selectedRole.is_superadmin &&
    (selectedPermIds.size !== originalPermIds.size || [...selectedPermIds].some((id) => !originalPermIds.has(id)));

  return (
    <div>
      <h2>Kelola Role</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Buat role baru & atur wewenangnya per modul. Halaman ini cuma lapisan kenyamanan — penegakan izin yang
        sesungguhnya selalu di server, tiap endpoint memeriksa sendiri.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Role</h3>
          <form className="inline-form" onSubmit={submitCreateRole} style={{ marginBottom: 12 }}>
            <input className="input" placeholder="Nama role baru" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
            <button className="btn-primary" type="submit">+</button>
          </form>
          <div>
            {roles.map((r) => (
              <div
                key={r.id}
                onClick={() => selectRole(r)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  background: selectedRoleId === r.id ? '#eff6ff' : 'transparent',
                  border: selectedRoleId === r.id ? '1px solid #93c5fd' : '1px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.name}
                  {!!r.is_superadmin && <span className="badge active" style={{ fontSize: 10 }}>SUPERADMIN</span>}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {r.is_superadmin ? 'Semua akses (bypass)' : `${r.permission_count} izin`} · {r.user_count} user
                </div>
              </div>
            ))}
            {roles.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>Belum ada role</p>}
          </div>
        </div>

        <div className="card">
          {!selectedRole && <p style={{ color: '#999' }}>Pilih role di sebelah kiri, atau buat role baru.</p>}

          {selectedRole && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                  {selectedRole.is_superadmin ? (
                    <h3 style={{ margin: 0 }}>{selectedRole.name}</h3>
                  ) : (
                    <>
                      <input className="input" value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} style={{ fontWeight: 700, fontSize: 16 }} />
                      <button className="btn-secondary" onClick={submitRename} disabled={renaming || renameDraft.trim() === selectedRole.name}>
                        Simpan Nama
                      </button>
                    </>
                  )}
                </div>
                {!selectedRole.is_superadmin && (
                  <button className="btn-danger" onClick={() => handleDeleteRole(selectedRole)}>Hapus Role</button>
                )}
              </div>

              {selectedRole.is_superadmin ? (
                <div className="card" style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}>
                  Role superadmin otomatis punya SEMUA akses di sistem (bypass total, bukan lewat daftar izin) —
                  tidak bisa & tidak perlu diatur manual. Ini supaya superadmin tidak pernah bisa mengunci
                  wewenangnya sendiri lewat halaman ini.
                </div>
              ) : (
                <>
                  {permsLoading && <p style={{ color: '#999' }}>Memuat izin...</p>}
                  {!permsLoading && (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Modul</th>
                            {columnActions.map((action) => (
                              <th key={action} style={{ textAlign: 'center' }}>{ACTION_LABELS[action] || action}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {modules.map(({ module, permissions }) => (
                            <tr key={module}>
                              <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{module.replace(/_/g, ' ')}</td>
                              {columnActions.map((action) => {
                                const perm = permissions.find((p) => p.action === action);
                                if (!perm) return <td key={action} style={{ textAlign: 'center', color: '#ddd' }}>—</td>;
                                const checked = selectedPermIds.has(perm.id);
                                return (
                                  <td key={action} style={{ textAlign: 'center' }}>
                                    <label
                                      title={perm.description || ''}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                                        background: perm.is_sensitive ? (checked ? '#fee2e2' : '#fff7ed') : 'transparent',
                                        border: perm.is_sensitive ? '1px solid #fca5a5' : 'none',
                                      }}
                                    >
                                      <input type="checkbox" checked={checked} onChange={() => togglePermission(perm.id)} style={{ accentColor: perm.is_sensitive ? '#dc2626' : undefined }} />
                                    </label>
                                    {!!perm.is_sensitive && <div style={{ fontSize: 9, color: '#b91c1c', fontWeight: 700 }}>⚠ sensitif</div>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn-primary" onClick={requestSavePermissions} disabled={savingPerms || !permsDirty}>
                      {savingPerms ? 'Menyimpan...' : 'Simpan Izin'}
                    </button>
                    {permsDirty && <span style={{ fontSize: 12, color: '#b45309' }}>Ada perubahan belum disimpan</span>}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {confirmSensitive && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 480 }}>
            <button type="button" className="modal-close-btn" onClick={() => setConfirmSensitive(null)} title="Batal">✕</button>
            <h3 style={{ marginTop: 0, color: '#b91c1c' }}>⚠ Memberi Wewenang Sensitif</h3>
            <p style={{ fontSize: 14 }}>
              Anda akan memberi role <strong>{selectedRole?.name}</strong> wewenang berikut, yang berisiko tinggi
              (bisa mengubah data keuangan/harga secara permanen):
            </p>
            <ul style={{ fontSize: 14, color: '#b91c1c' }}>
              {confirmSensitive.added.map((p) => (
                <li key={p.id}><strong>{p.module}.{p.action}</strong> — {p.description}</li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: '#666' }}>Pastikan role ini memang seharusnya punya akses ini sebelum melanjutkan.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-danger" style={{ flex: 1 }} onClick={actuallySavePermissions}>Ya, Saya Paham Risikonya — Simpan</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmSensitive(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
