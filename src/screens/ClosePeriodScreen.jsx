import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function ClosePeriodScreen() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const [closeTarget, setCloseTarget] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState('');

  function reload() {
    setLoading(true);
    api.listAccountingPeriods()
      .then((d) => setPeriods(d.periods))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  function openCloseConfirm(p) {
    setCloseTarget(p);
  }
  function openReopenConfirm(p) {
    setReopenReason('');
    setReopenTarget(p);
  }

  async function confirmClose() {
    const { year, month } = closeTarget;
    const key = `${year}-${month}`;
    setCloseTarget(null);
    setBusyKey(key);
    setError(null);
    try {
      await api.closeAccountingPeriod({ year, month });
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmReopen() {
    const { year, month } = reopenTarget;
    if (!reopenReason.trim()) return;
    const key = `${year}-${month}`;
    setReopenTarget(null);
    setBusyKey(key);
    setError(null);
    try {
      await api.reopenAccountingPeriod({ year, month, reason: reopenReason.trim() });
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <h2>Tutup Buku</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Menutup sebuah periode mencegah jurnal baru (otomatis dari transaksi maupun manual) diposting dengan
        tanggal yang jatuh di bulan itu. Bulan yang belum pernah ditutup dianggap terbuka secara default.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        {loading && <div style={{ padding: 16, color: '#999' }}>Memuat...</div>}
        {!loading && (
          <table>
            <thead>
              <tr>
                <th>Periode</th>
                <th>Status</th>
                <th>Ditutup Pada</th>
                <th>Oleh</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => {
                const key = `${p.year}-${p.month}`;
                const isBusy = busyKey === key;
                return (
                  <tr key={key}>
                    <td>{monthLabel(p.year, p.month)}</td>
                    <td>
                      {p.status === 'closed' ? (
                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>Ditutup</span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 600 }}>Terbuka</span>
                      )}
                    </td>
                    <td>{p.closedAt ? new Date(p.closedAt).toLocaleString('id-ID') : '-'}</td>
                    <td>{p.closedByName || '-'}</td>
                    <td>
                      {p.status === 'closed' ? (
                        <button className="btn-secondary" disabled={isBusy} onClick={() => openReopenConfirm(p)}>
                          {isBusy ? 'Memproses...' : 'Buka Kembali'}
                        </button>
                      ) : (
                        <button className="btn-danger" disabled={isBusy} onClick={() => openCloseConfirm(p)}>
                          {isBusy ? 'Memproses...' : 'Tutup'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {closeTarget && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 460 }}>
            <h3 style={{ marginTop: 0 }}>Tutup Periode {monthLabel(closeTarget.year, closeTarget.month)}?</h3>
            <p style={{ fontSize: 13, color: '#666' }}>
              Setelah ditutup, tidak ada jurnal baru (termasuk dari penjualan, pembelian, pemakaian internal, dll)
              yang bisa diposting dengan tanggal di bulan ini. Bisa dibuka kembali kapan saja kalau perlu.
            </p>
            <button className="btn-danger" style={{ width: '100%', marginBottom: 8 }} onClick={confirmClose}>
              Ya, Tutup Periode Ini
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setCloseTarget(null)}>Batal</button>
          </div>
        </div>
      )}

      {reopenTarget && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 460 }}>
            <h3 style={{ marginTop: 0 }}>Buka Kembali Periode {monthLabel(reopenTarget.year, reopenTarget.month)}?</h3>
            <p style={{ fontSize: 13, color: '#666' }}>
              Alasan wajib diisi — akan tercatat di log aktivitas.
            </p>
            <input
              className="input" style={{ width: '100%', marginBottom: 12 }}
              placeholder="mis. Ada koreksi yang perlu dijurnal ulang ke bulan ini"
              value={reopenReason} onChange={(e) => setReopenReason(e.target.value)}
            />
            <button className="btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={confirmReopen} disabled={!reopenReason.trim()}>
              Ya, Buka Kembali
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setReopenTarget(null)}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
