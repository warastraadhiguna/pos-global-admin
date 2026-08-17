import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';

function rp(decimalString) {
  const n = Math.round(Number(decimalString));
  return `Rp${n.toLocaleString('id-ID')}`;
}
function qty(decimalString) {
  return Number(decimalString).toLocaleString('id-ID', { maximumFractionDigits: 4 });
}

function InterveningWarning({ movements }) {
  if (!movements || movements.length === 0) return null;
  const productNames = [...new Set(movements.map((m) => m.product_name))];
  return (
    <div className="error-banner" style={{ fontWeight: 700, border: '2px solid #d97706', background: '#fffbeb', color: '#92400e', fontSize: 14 }}>
      ⚠️ Ada {movements.length} transaksi stok terjadi SELAMA sesi opname ini berlangsung, melibatkan produk:
      {' '}{productNames.join(', ')}. Selisih tetap dihitung terhadap saldo saat sesi dibuat (bukan terpengaruh
      transaksi ini), tapi hasil hitung fisik untuk produk-produk ini sebaiknya diperiksa ulang — mungkin sudah
      berubah sejak dihitung.
      <table style={{ marginTop: 8, background: '#fff' }}>
        <thead><tr><th>Waktu</th><th>Produk</th><th>Jenis</th><th>Qty Masuk</th><th>Qty Keluar</th></tr></thead>
        <tbody>
          {movements.map((m, i) => (
            <tr key={i}>
              <td>{new Date(m.created_at).toLocaleString('id-ID')}</td>
              <td>{m.product_name}</td>
              <td>{m.movement_type}</td>
              <td>{Number(m.qty_in_base) > 0 ? qty(m.qty_in_base) : ''}</td>
              <td>{Number(m.qty_out_base) > 0 ? qty(m.qty_out_base) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StockOpnameScreen() {
  const [opnames, setOpnames] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [physicalInputs, setPhysicalInputs] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState(null);

  function reloadList() {
    api.listStockOpnames().then((d) => setOpnames(d.opnames)).catch((err) => setError(err.message));
  }
  useEffect(() => {
    reloadList();
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
  }, []);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  // Cuma refresh data (detail + input fisik) — TIDAK menyentuh finalizeResult.
  // Dipisah dari loadDetail() supaya panel "Hasil Finalisasi" (jurnal) tidak
  // langsung hilang begitu finalize() memuat ulang detail sesudahnya.
  function refreshDetail(id) {
    return api.getStockOpname(id).then((d) => {
      setDetail(d);
      const inputs = {};
      for (const item of d.items) {
        inputs[item.id] = item.physical_qty_base !== null ? item.physical_qty_base : '';
      }
      setPhysicalInputs(inputs);
    }).catch((err) => setError(err.message));
  }

  function loadDetail(id) {
    setSelectedId(id);
    setFinalizeResult(null);
    refreshDetail(id);
  }

  async function createSession() {
    setError(null);
    try {
      const { opname } = await api.createStockOpname({ notes });
      setNotes('');
      reloadList();
      loadDetail(opname.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePhysicalCount(itemId) {
    const value = physicalInputs[itemId];
    if (value === '' || value === undefined) return;
    setError(null);
    try {
      await api.recordOpnamePhysicalCount(selectedId, itemId, { physicalQtyBase: Number(value) });
      refreshDetail(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function finalize() {
    setFinalizing(true);
    setError(null);
    try {
      const result = await api.finalizeStockOpname(selectedId);
      setFinalizeResult(result);
      reloadList();
      refreshDetail(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  const uncountedCount = detail ? detail.items.filter((i) => i.physical_qty_base === null).length : 0;
  const isInProgress = detail?.opname.status === 'in_progress';

  return (
    <div>
      <h2>Stock Opname</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      {!selectedId && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Buat Sesi Opname Baru</h3>
            <p style={{ color: '#666', fontSize: 13, marginTop: -8 }}>
              Sistem langsung mengambil snapshot stok SEMUA produk aktif saat ini juga — snapshot inilah yang jadi
              acuan selisih nanti, bukan angka yang mungkin berubah selama proses hitung fisik berlangsung.
            </p>
            <div className="inline-form">
              <input className="input" placeholder="Catatan (opsional)" style={{ flex: 1, minWidth: 240 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button className="btn-primary" onClick={createSession}>Buat Sesi Opname</button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Riwayat Opname</h3>
            <table>
              <thead><tr><th>No. Opname</th><th>Dibuat</th><th>Oleh</th><th>Item</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {opnames.map((o) => (
                  <tr key={o.id}>
                    <td>{o.opname_number}</td>
                    <td>{new Date(o.created_at).toLocaleString('id-ID')}</td>
                    <td>{o.created_by_name}</td>
                    <td>{o.item_count} produk{o.uncounted_count > 0 ? ` (${o.uncounted_count} belum dihitung)` : ''}</td>
                    <td><span className={`badge ${o.status === 'finalized' ? 'active' : 'inactive'}`}>{o.status === 'finalized' ? 'Selesai' : 'Berlangsung'}</span></td>
                    <td><button className="btn-secondary" onClick={() => loadDetail(o.id)}>Buka</button></td>
                  </tr>
                ))}
                {opnames.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada sesi opname</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedId && detail && (
        <>
          <button className="btn-secondary" style={{ marginBottom: 12 }} onClick={() => { setSelectedId(null); setDetail(null); }}>&larr; Kembali ke Daftar</button>

          <div className="card" style={{ marginBottom: 16 }}>
            <strong>{detail.opname.opname_number}</strong>
            {' '}<span className={`badge ${detail.opname.status === 'finalized' ? 'active' : 'inactive'}`}>{detail.opname.status === 'finalized' ? 'Selesai' : 'Berlangsung'}</span>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Dibuat {new Date(detail.opname.created_at).toLocaleString('id-ID')} oleh {detail.opname.created_by_name}
              {detail.opname.status === 'finalized' && ` · Difinalisasi ${new Date(detail.opname.finalized_at).toLocaleString('id-ID')} oleh ${detail.opname.finalized_by_name}`}
            </div>
            {detail.opname.notes && <div style={{ fontSize: 13, marginTop: 4 }}>Catatan: {detail.opname.notes}</div>}
          </div>

          <InterveningWarning movements={detail.interveningMovements} />

          {!isInProgress && (
            <div style={{ fontSize: 13, color: '#666', margin: '8px 0 16px' }}>
              Sesi ini sudah difinalisasi — tidak bisa diedit lagi. Kalau ada koreksi, buat sesi opname baru.
            </div>
          )}

          <div className="card" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Produk</th><th>Stok Sistem (snapshot)</th><th>Stok Fisik</th><th>Selisih</th>
                  {detail.opname.status === 'finalized' && <><th>Avg Cost</th><th>Nilai Selisih</th></>}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{qty(item.system_qty_base)}</td>
                    <td>
                      {isInProgress ? (
                        <input
                          className="input" type="number" min="0" step="any" style={{ width: 110 }}
                          value={physicalInputs[item.id] ?? ''}
                          onChange={(e) => setPhysicalInputs({ ...physicalInputs, [item.id]: e.target.value })}
                          onBlur={() => savePhysicalCount(item.id)}
                        />
                      ) : (
                        qty(item.physical_qty_base)
                      )}
                    </td>
                    <td style={item.variance_qty_base && Number(item.variance_qty_base) !== 0 ? { color: Number(item.variance_qty_base) < 0 ? '#dc2626' : '#166534', fontWeight: 600 } : {}}>
                      {item.physical_qty_base !== null
                        ? qty((Number(item.physical_qty_base) - Number(item.system_qty_base)).toFixed(4))
                        : (item.variance_qty_base !== null ? qty(item.variance_qty_base) : '—')}
                    </td>
                    {detail.opname.status === 'finalized' && (
                      <>
                        <td>{item.avg_cost_at_finalization ? rp(item.avg_cost_at_finalization) : ''}</td>
                        <td>{item.variance_value ? rp(item.variance_value) : ''}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isInProgress && (
            <div style={{ marginTop: 16 }}>
              {uncountedCount > 0 && (
                <div style={{ fontSize: 13, color: '#b45309', marginBottom: 8 }}>
                  {uncountedCount} produk belum diinput stok fisiknya — lengkapi dulu sebelum finalisasi.
                </div>
              )}
              <button className="btn-primary" onClick={finalize} disabled={finalizing || uncountedCount > 0}>
                {finalizing ? 'Memproses...' : 'Finalisasi Opname'}
              </button>
            </div>
          )}

          {finalizeResult && (
            <div className="card" style={{ marginTop: 16 }}>
              <strong>Hasil Finalisasi</strong>
              <div style={{ fontSize: 14, marginTop: 8 }}>
                Total Selisih Lebih (keuntungan): <strong style={{ color: '#166534' }}>{rp(finalizeResult.totalGain)}</strong>
                {' '}&nbsp;|&nbsp; Total Selisih Kurang (kerugian): <strong style={{ color: '#dc2626' }}>{rp(finalizeResult.totalLoss)}</strong>
              </div>
              {finalizeResult.interveningProductCount > 0 && (
                <div style={{ fontSize: 13, color: '#b45309', marginTop: 6 }}>
                  ⚠️ {finalizeResult.interveningProductCount} produk sempat mengalami transaksi selama sesi berlangsung (lihat peringatan di atas).
                </div>
              )}
              {finalizeResult.journalEntry ? (
                <JournalPreview entry={finalizeResult.journalEntry} accountLabel={accountLabel} />
              ) : (
                <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>Tidak ada selisih — tidak ada jurnal yang perlu diposting.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
