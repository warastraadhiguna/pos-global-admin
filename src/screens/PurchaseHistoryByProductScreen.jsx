import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PAGE_SIZE = 20;

export default function PurchaseHistoryByProductScreen() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [error, setError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function reload(targetPage = page) {
    api.listPurchaseItemsByProduct({ q: query, dateFrom, dateTo, page: targetPage, limit: PAGE_SIZE })
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setPage(d.page);
      })
      .catch((err) => setError(err.message));
  }

  // Filter TIDAK otomatis jalan tiap ketik/ganti tanggal — baru diterapkan
  // begitu tombol "Cari" diklik/form disubmit (diminta eksplisit: auto-
  // filter bikin query berulang2 kalau datanya banyak). Cuma load AWAL
  // (mount) yang otomatis.
  useEffect(() => {
    reload(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submitFilter(e) {
    e?.preventDefault();
    reload(1);
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function openDetail(purchaseId) {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    api.getPurchase(purchaseId)
      .then((d) => setDetail(d.purchase))
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false));
  }
  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
  }

  return (
    <div>
      <h2>Riwayat Pembelian per Produk</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Read-only. Semua kejadian pembelian yang SUDAH TEREALISASI (bukan draft) untuk produk tertentu — lengkap
        harga, diskon, dan jumlahnya. Klik "Lihat Nota" untuk detail nota lengkapnya.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card">
        <form className="inline-form" style={{ marginBottom: 12 }} onSubmit={submitFilter}>
          <input
            className="input"
            style={{ width: '100%', maxWidth: 320 }}
            placeholder="Cari nama/SKU produk..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: '#666' }}>s/d</span>
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn-primary" type="submit">Cari</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th><th>No. Pembelian</th><th>Produk</th><th>Satuan</th><th>Qty</th>
              <th>Harga/Satuan</th><th>Diskon</th><th>Subtotal</th><th>Supplier</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{new Date(it.purchase_date).toLocaleDateString('id-ID')}</td>
                <td>{it.purchase_number}</td>
                <td>{it.product_name}{it.sku ? <div style={{ fontSize: 12, color: '#999' }}>{it.sku}</div> : null}</td>
                <td>{it.unit_name}</td>
                <td>{Number(it.quantity).toLocaleString('id-ID')}</td>
                <td>{rp(it.cost_per_unit)}</td>
                <td>{Number(it.discount_amount) > 0 ? `- ${rp(it.discount_amount)}` : '-'}</td>
                <td>{rp(it.subtotal)}</td>
                <td>{it.supplier_name}</td>
                <td><span className={`badge ${it.status === 'completed' ? 'active' : 'inactive'}`}>{it.status === 'completed' ? 'Selesai' : 'Void'}</span></td>
                <td><button className="btn-secondary" onClick={() => openDetail(it.purchase_id)}>Lihat Nota</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                {query || dateFrom || dateTo ? 'Tidak ada pembelian yang cocok dengan filter ini' : 'Belum ada pembelian'}
              </td></tr>
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} baris pembelian
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => reload(page - 1)}>&larr; Sebelumnya</button>
              <span style={{ fontSize: 13, color: '#666' }}>Halaman {page} / {totalPages}</span>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => reload(page + 1)}>Berikutnya &rarr;</button>
            </div>
          </div>
        )}
      </div>

      {detailOpen && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 700, maxHeight: '85vh', overflowY: 'auto' }}>
            <button type="button" className="modal-close-btn" onClick={closeDetail} title="Tutup">✕</button>
            {detailLoading && <p style={{ color: '#999' }}>Memuat detail...</p>}
            {!detailLoading && detail && (
              <>
                <h3 style={{ marginTop: 0 }}>Detail Pembelian {detail.purchase_number}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13, marginBottom: 12 }}>
                  <div><span style={{ color: '#666' }}>Tanggal</span><br /><strong>{new Date(detail.purchase_date).toLocaleDateString('id-ID')}</strong></div>
                  <div><span style={{ color: '#666' }}>Supplier</span><br /><strong>{detail.supplier_name}</strong></div>
                  <div><span style={{ color: '#666' }}>Jenis Bayar</span><br /><strong>{detail.payment?.payment_type === 'cash' ? 'Tunai' : 'Kredit'}</strong></div>
                  <div>
                    <span style={{ color: '#666' }}>Status</span><br />
                    <span className={`badge ${detail.status === 'completed' ? 'active' : 'inactive'}`}>{detail.status === 'completed' ? 'Selesai' : 'Void'}</span>
                  </div>
                </div>
                {detail.notes && (
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <span style={{ color: '#666' }}>Catatan</span><br />{detail.notes}
                  </div>
                )}
                {detail.status === 'voided' && (
                  <div className="error-banner" style={{ fontSize: 13, marginBottom: 12 }}>
                    Di-void {detail.voided_at ? new Date(detail.voided_at).toLocaleString('id-ID') : ''} — Alasan: {detail.void_reason || '-'}
                  </div>
                )}

                <table style={{ marginBottom: 12 }}>
                  <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th>Harga/Satuan</th><th>Diskon</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {detail.items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.product_name}</td>
                        <td>{it.unit_name}</td>
                        <td>{Number(it.quantity).toLocaleString('id-ID')}</td>
                        <td>{rp(it.cost_per_unit)}</td>
                        <td>{Number(it.discount_amount) > 0 ? `- ${rp(it.discount_amount)}` : '-'}</td>
                        <td>{rp(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ minWidth: 260, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Subtotal</span><span>{rp(detail.subtotal)}</span>
                    </div>
                    {Number(detail.discount_total) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Diskon Total</span><span>- {rp(detail.discount_total)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>DPP</span><span>{rp(detail.dpp)}</span>
                    </div>
                    {detail.ppn_mode && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>PPN Masukan ({Number(detail.ppn_rate)}%, {detail.ppn_mode === 'exclude' ? 'exclude' : 'included'})</span>
                        <span>{rp(detail.ppn_amount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid #ddd', paddingTop: 6, marginTop: 4 }}>
                      <span>Total</span><span>{rp(detail.grand_total)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
