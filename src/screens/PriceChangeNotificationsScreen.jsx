import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

const TRIGGER_LABELS = {
  purchase: 'Pembelian',
  purchase_void: 'Void Pembelian',
  opname: 'Stock Opname',
};

export default function PriceChangeNotificationsScreen() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    api.listPriceChangeNotifications()
      .then((d) => setEvents(d.events))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function markRead(id) {
    try {
      await api.markPriceChangeNotificationRead(id);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: 1 } : e)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    try {
      await api.markAllPriceChangeNotificationsRead();
      setEvents((prev) => prev.map((e) => ({ ...e, is_read: 1 })));
    } catch (err) {
      setError(err.message);
    }
  }

  const unreadCount = events.filter((e) => !e.is_read).length;

  return (
    <div>
      <h2>Notifikasi Perubahan Harga</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Riwayat setiap kali markup otomatis menghitung ulang harga jual karena HPP rata-rata berubah.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      {unreadCount > 0 && (
        <button className="btn-secondary" onClick={markAllRead} style={{ marginBottom: 12 }}>
          Tandai semua dibaca ({unreadCount} belum dibaca)
        </button>
      )}

      {loading && <p style={{ color: '#999' }}>Memuat...</p>}
      {!loading && events.length === 0 && (
        <div className="card"><p style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada notifikasi perubahan harga.</p></div>
      )}

      {events.map((e) => (
        <div key={e.id} className="card" style={{ marginBottom: 12, opacity: e.is_read ? 0.75 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{e.product_name}</strong>{e.sku ? ` (${e.sku})` : ''}
              {!e.is_read && <span className="badge active" style={{ marginLeft: 8 }}>Baru</span>}
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {TRIGGER_LABELS[e.trigger_source] || e.trigger_source} · {new Date(e.created_at).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                HPP rata-rata: Rp{Number(e.old_avg_cost).toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                {' → '}
                Rp{Number(e.new_avg_cost).toLocaleString('id-ID', { maximumFractionDigits: 4 })}
              </div>
            </div>
            {!e.is_read && <button className="btn-secondary" onClick={() => markRead(e.id)}>Tandai dibaca</button>}
          </div>
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Satuan</th><th>Level</th><th>Markup%</th><th>Harga Lama</th><th>Harga Baru</th></tr></thead>
            <tbody>
              {e.lines.map((l, idx) => (
                <tr key={idx}>
                  <td>{l.unit_name}</td>
                  <td>{l.price_level_name}</td>
                  <td>{Number(l.markup_percent)}%</td>
                  <td>Rp{Number(l.old_price).toLocaleString('id-ID', { maximumFractionDigits: 4 })}</td>
                  <td>
                    Rp{Number(l.new_price).toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                    {Number(l.new_price) > Number(l.old_price) && <span style={{ color: '#166534' }}> ▲</span>}
                    {Number(l.new_price) < Number(l.old_price) && <span style={{ color: '#dc2626' }}> ▼</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
