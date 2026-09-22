import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

export default function InternalStockUsageHistoryScreen() {
  const [usages, setUsages] = useState([]);
  const [error, setError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  function reload() {
    api.listInternalStockUsages().then((d) => setUsages(d.usages)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function openDetail(usageId) {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    api.getInternalStockUsage(usageId)
      .then((d) => setDetail(d.usage))
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }
  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setVoidOpen(false);
    setVoidReason('');
  }

  // Void SENGAJA cuma boleh superadmin (server yang menegakkan via
  // requireRole('superadmin') literal, bukan izin Kelola Role) — tombol di
  // sini tetap ditampilkan ke semua admin (pola sama dgn tombol Hapus User
  // dkk di layar lain), kalau bukan superadmin server akan menolak &
  // pesannya tampil di banner error.
  async function submitVoid() {
    if (!voidReason.trim() || !detail) return;
    setVoiding(true);
    try {
      await api.voidInternalStockUsage(detail.id, voidReason.trim());
      setVoidOpen(false);
      setVoidReason('');
      setError(null);
      openDetail(detail.id);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setVoiding(false);
    }
  }

  return (
    <div>
      <h2>Riwayat Pemakaian Internal</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Semua barang dagangan yang dipakai untuk kebutuhan toko sendiri (bukan dijual). Void hanya bisa dilakukan superadmin.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        <table>
          <thead><tr><th>No. Dokumen</th><th>Tanggal</th><th>Total HPP</th><th>Diproses Oleh</th><th>Alasan</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {usages.map((u) => (
              <tr key={u.id}>
                <td>{u.usage_number}</td>
                <td>{new Date(u.usage_date).toLocaleDateString('id-ID')}</td>
                <td>{rp(u.total_value)}</td>
                <td>{u.processed_by_name}</td>
                <td>{u.reason}</td>
                <td><span className={`badge ${u.status === 'voided' ? 'inactive' : 'active'}`}>{u.status === 'voided' ? 'Voided' : 'Aktif'}</span></td>
                <td><button className="btn-secondary" onClick={() => openDetail(u.id)}>Detail</button></td>
              </tr>
            ))}
            {usages.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada pemakaian internal</td></tr>}
          </tbody>
        </table>
      </div>

      {detailOpen && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 600, maxHeight: '85vh', overflowY: 'auto' }}>
            <button type="button" className="modal-close-btn" onClick={closeDetail} title="Tutup">✕</button>
            {detailLoading && <p style={{ color: '#999' }}>Memuat detail...</p>}
            {!detailLoading && detail && (
              <>
                <h3 style={{ marginTop: 0 }}>Detail Pemakaian Internal {detail.usage_number}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13, marginBottom: 12 }}>
                  <div><span style={{ color: '#666' }}>Tanggal</span><br /><strong>{new Date(detail.usage_date).toLocaleDateString('id-ID')}</strong></div>
                  <div><span style={{ color: '#666' }}>Diproses Oleh</span><br /><strong>{detail.processed_by_name}</strong></div>
                  <div><span style={{ color: '#666' }}>Total HPP</span><br /><strong>{rp(detail.total_value)}</strong></div>
                </div>
                <div style={{ fontSize: 13, marginBottom: 12 }}>
                  <span style={{ color: '#666' }}>Alasan</span><br />{detail.reason}
                </div>

                {detail.status === 'voided' ? (
                  <div style={{ fontSize: 13, marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: 10 }}>
                    <strong style={{ color: '#991b1b' }}>Sudah di-void</strong>
                    <div>Oleh: {detail.voided_by_name} — {new Date(detail.voided_at).toLocaleString('id-ID')}</div>
                    <div>Alasan void: {detail.void_reason}</div>
                  </div>
                ) : voidOpen ? (
                  <div style={{ fontSize: 13, marginBottom: 12, border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
                    <label style={{ fontWeight: 600 }}>Alasan void (wajib)</label>
                    <textarea
                      className="input"
                      style={{ width: '100%', minHeight: 50, marginTop: 4, marginBottom: 8 }}
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      autoFocus
                    />
                    <button className="btn-danger" style={{ marginRight: 8 }} onClick={submitVoid} disabled={voiding || !voidReason.trim()}>
                      {voiding ? 'Memproses...' : 'Ya, Void Dokumen Ini'}
                    </button>
                    <button className="btn-secondary" onClick={() => { setVoidOpen(false); setVoidReason(''); }} disabled={voiding}>Batal</button>
                  </div>
                ) : (
                  <button className="btn-danger" style={{ marginBottom: 12 }} onClick={() => setVoidOpen(true)}>
                    Void Dokumen Ini
                  </button>
                )}

                <table>
                  <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th>Qty (base)</th><th>HPP / unit</th><th>Nilai Beban</th></tr></thead>
                  <tbody>
                    {detail.items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.product_name}</td>
                        <td>{it.unit_name}</td>
                        <td>{Number(it.quantity).toLocaleString('id-ID')}</td>
                        <td>{Number(it.quantity_base).toLocaleString('id-ID')}</td>
                        <td>{rp(it.cost_per_base_unit)}</td>
                        <td>{rp(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
