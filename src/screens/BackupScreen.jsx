import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

function formatBytes(n) {
  if (n === null || n === undefined) return '-';
  const num = Number(n);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDateTime(v) {
  return v ? new Date(v).toLocaleString('id-ID') : '-';
}

export default function BackupScreen() {
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [retentionCount, setRetentionCount] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningNow, setRunningNow] = useState(false);

  function reload() {
    api.getBackups()
      .then((d) => {
        setSettings(d.settings);
        setHistory(d.history);
        setAutoEnabled(!!d.settings.auto_enabled);
        setScheduleTime(d.settings.schedule_time);
        setRetentionCount(d.settings.retention_count);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  async function saveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setError(null);
    setInfo(null);
    try {
      await api.updateBackupSettings({ autoEnabled, scheduleTime, retentionCount: Number(retentionCount) });
      setInfo('Pengaturan jadwal backup disimpan');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function runNow() {
    setRunningNow(true);
    setError(null);
    setInfo(null);
    try {
      const { backup } = await api.runBackupNow();
      setInfo(`Backup berhasil: ${backup.filename} (${formatBytes(backup.fileSize)})`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningNow(false);
    }
  }

  async function download(row) {
    setError(null);
    try {
      await api.downloadBackup(row.id, row.filename);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(row) {
    setError(null);
    try {
      await api.deleteBackup(row.id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Backup Database</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Backup lengkap database (struktur + data) lewat mysqldump. File disimpan di server, bisa diunduh dari sini.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <Banner type="success" message={info} onClose={() => setInfo(null)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Jadwal Backup Otomatis</h3>
          <form onSubmit={saveSettings}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14 }}>
                <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoEnabled(e.target.checked)} /> Aktifkan backup otomatis harian
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Jam (waktu server)</label>
              <input className="input" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} disabled={!autoEnabled} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                Simpan berapa backup terakhir (yang lebih lama otomatis dihapus)
              </label>
              <input
                className="input" type="number" min="1" max="90" style={{ width: 100 }}
                value={retentionCount} onChange={(e) => setRetentionCount(e.target.value)}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={savingSettings}>
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </form>
          {settings && (
            <p style={{ fontSize: 12, color: '#666', marginTop: 12, marginBottom: 0 }}>
              Terakhir jalan: {formatDateTime(settings.last_run_at)}
              {settings.last_run_status === 'failed' && (
                <span style={{ color: '#991b1b' }}> — GAGAL: {settings.last_run_error}</span>
              )}
              {settings.last_run_status === 'success' && <span style={{ color: '#166534' }}> — berhasil</span>}
            </p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Backup Manual</h3>
          <p style={{ fontSize: 13, color: '#666' }}>
            Jalankan backup sekarang juga, kapan pun dibutuhkan (mis. sebelum update aplikasi atau perubahan besar).
          </p>
          <button className="btn-primary" onClick={runNow} disabled={runningNow}>
            {runningNow ? 'Sedang backup...' : '📦 Backup Sekarang'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Riwayat Backup</h3>
        <table>
          <thead><tr><th>Nama File</th><th>Ukuran</th><th>Status</th><th>Dipicu Oleh</th><th>Waktu</th><th></th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{h.filename}</td>
                <td>{formatBytes(h.file_size)}</td>
                <td>
                  {h.status === 'success'
                    ? <span className="badge active">Berhasil</span>
                    : <span className="badge inactive" title={h.error_message}>Gagal</span>}
                </td>
                <td>{h.triggered_by === 'manual' ? `Manual (${h.triggered_by_name || '-'})` : 'Terjadwal'}</td>
                <td>{formatDateTime(h.created_at)}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {h.status === 'success' && (
                    <button className="btn-secondary" onClick={() => download(h)}>Download</button>
                  )}
                  <button className="btn-danger" onClick={() => remove(h)}>Hapus</button>
                </td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada riwayat backup</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
