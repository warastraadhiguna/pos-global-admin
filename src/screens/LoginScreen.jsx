import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';

export default function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.loginAdmin(username, password);
      onLoggedIn({ token, user });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen-center">
      <form className="card" style={{ width: 340 }} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>POS Admin</h2>
        {error && <div className="error-banner">{error}</div>}
        <label style={{ fontSize: 13, fontWeight: 600 }}>Username</label>
        <input
          className="input"
          style={{ width: '100%', margin: '6px 0 14px' }}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
        <div style={{ position: 'relative', margin: '6px 0 18px' }}>
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            style={{ width: '100%', paddingRight: 36 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', color: '#666',
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button className="btn-primary" style={{ width: '100%' }} disabled={loading} type="submit">
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
