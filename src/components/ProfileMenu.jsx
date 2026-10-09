import { useEffect, useRef, useState } from 'react';
import { User, ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { api } from '../api.js';
import Banner from './Banner.jsx';

const ROLE_LABELS = { admin: 'Admin', superadmin: 'Superadmin', kasir: 'Kasir' };

// Dropdown profil di ujung kanan atas — nama user yang sedang login (supaya
// tidak perlu menebak/lihat database), ganti password sendiri, dan logout.
// Keluar di sidebar TETAP ada (tidak dihapus) — ini cuma menambah jalur yang
// lebih umum ditemukan user (pola avatar/nama di pojok kanan atas).
export default function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <div className="profile-menu" ref={rootRef}>
      <button type="button" className="profile-menu-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="profile-menu-avatar"><User size={16} /></span>
        <span className="profile-menu-name">{user.full_name}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="profile-menu-dropdown">
          <div className="profile-menu-header">
            <div className="profile-menu-fullname">{user.full_name}</div>
            <div className="profile-menu-role">{roleLabel}</div>
          </div>
          <button type="button" onClick={() => { setShowChangePassword(true); setOpen(false); }}>
            <KeyRound size={15} /> Profil (Ubah Password)
          </button>
          <button type="button" className="profile-menu-logout" onClick={onLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok');
      return;
    }
    setSaving(true);
    try {
      await api.changeOwnPassword({ currentPassword, newPassword });
      setInfo('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="card" style={{ width: 360 }}>
        <button type="button" className="modal-close-btn" onClick={onClose}>×</button>
        <h3 style={{ marginTop: 0 }}>Ubah Password</h3>
        <Banner type="error" message={error} onClose={() => setError(null)} />
        <Banner type="success" message={info} onClose={() => setInfo(null)} />
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Password Saat Ini</label>
            <input
              className="input" type="password" value={currentPassword} style={{ width: '100%' }}
              onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Password Baru (min 6 karakter)</label>
            <input
              className="input" type="password" value={newPassword} minLength={6} style={{ width: '100%' }}
              onChange={(e) => setNewPassword(e.target.value)} required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Konfirmasi Password Baru</label>
            <input
              className="input" type="password" value={confirmPassword} minLength={6} style={{ width: '100%' }}
              onChange={(e) => setConfirmPassword(e.target.value)} required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  );
}
