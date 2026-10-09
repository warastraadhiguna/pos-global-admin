import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

function formatDateTime(v) {
  return v ? new Date(v).toLocaleString('id-ID') : '-';
}

export default function SyncScreen() {
  const [settings, setSettings] = useState(null);
  const [salesPending, setSalesPending] = useState(0);
  const [salesReturnsPending, setSalesReturnsPending] = useState(0);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [enabled, setEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [batchSize, setBatchSize] = useState(200);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningNow, setRunningNow] = useState(false);

  function reload() {
    api.getSyncStatus()
      .then((d) => {
        setSettings(d.settings);
        setSalesPending(d.salesPending);
        setSalesReturnsPending(d.salesReturnsPending);
        setEnabled(!!d.settings.enabled);
        setIntervalMinutes(d.settings.interval_minutes);
        setBatchSize(d.settings.batch_size);
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
      await api.updateSyncSettings({ enabled, intervalMinutes: Number(intervalMinutes), batchSize: Number(batchSize) });
      setInfo('Pengaturan sinkronisasi disimpan');
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
      const { result } = await api.runSyncNow();
      setInfo(`Sync selesai — ${result.sales} transaksi, ${result.salesReturns} retur terkirim`);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningNow(false);
    }
  }

  return (
    <div>
      <h2>Sinkronisasi ke Pusat</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Kirim data transaksi ke server pusat secara berkala. Ini terpisah dari operasional kasir — mematikan sinkronisasi
        tidak memengaruhi transaksi yang sedang berjalan.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <Banner type="success" message={info} onClose={() => setInfo(null)} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Pengaturan</h3>
          <form onSubmit={saveSettings}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14 }}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Aktifkan sinkronisasi otomatis
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                Interval (menit)
              </label>
              <input
                className="input" type="number" min="1" max="1440" style={{ width: 100 }}
                value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                Ukuran batch (maks baris per tabel tiap kali kirim)
              </label>
              <input
                className="input" type="number" min="1" max="2000" style={{ width: 100 }}
                value={batchSize} onChange={(e) => setBatchSize(e.target.value)}
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
          <h3 style={{ marginTop: 0 }}>Status Antrian</h3>
          <p style={{ fontSize: 13, color: '#666' }}>
            Jumlah baris yang belum terkirim ke pusat (akan terkirim otomatis sesuai interval, atau jalankan sekarang).
          </p>
          <table style={{ marginBottom: 16 }}>
            <tbody>
              <tr><td>Transaksi penjualan</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{salesPending}</td></tr>
              <tr><td>Retur penjualan</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{salesReturnsPending}</td></tr>
            </tbody>
          </table>
          <button className="btn-primary" onClick={runNow} disabled={runningNow}>
            {runningNow ? 'Sedang sync...' : '🔄 Sync Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}
