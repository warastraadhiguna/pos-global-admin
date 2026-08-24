import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';
import ProductSearchSelect from '../components/ProductSearchSelect.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

let cartKeyCounter = 0;

export default function InternalStockUsageScreen() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const [usageDate, setUsageDate] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [cart, setCart] = useState([]);
  const [pickProductId, setPickProductId] = useState('');
  const [pickProductName, setPickProductName] = useState('');
  const [pickResetKey, setPickResetKey] = useState(0);
  const [pickUnits, setPickUnits] = useState([]);
  const [pickUnitId, setPickUnitId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function reload() {
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  async function onPickProduct(product) {
    setPickProductId(product?.id || '');
    setPickProductName(product?.name || '');
    setPickUnitId('');
    setPickUnits([]);
    if (!product) return;
    try {
      const detail = await api.getProduct(product.id);
      setPickUnits(detail.units);
      const baseUnit = detail.units.find((u) => u.is_base_unit) || detail.units[0];
      if (baseUnit) setPickUnitId(baseUnit.unit_id);
    } catch (err) {
      setError(err.message);
    }
  }

  function addItemToCart() {
    if (!pickProductId || !pickUnitId || !pickQuantity) return;
    const unit = pickUnits.find((u) => u.unit_id === pickUnitId);
    setCart((prev) => [
      ...prev,
      {
        key: ++cartKeyCounter,
        productId: pickProductId,
        productName: pickProductName || pickProductId,
        unitId: pickUnitId,
        unitName: unit?.unit_name || '',
        quantity: pickQuantity,
      },
    ]);
    setPickProductId('');
    setPickProductName('');
    setPickResetKey((k) => k + 1);
    setPickUnits([]);
    setPickUnitId('');
    setPickQuantity('');
  }
  function removeCartItem(key) {
    setCart((prev) => prev.filter((r) => r.key !== key));
  }

  const canSubmit = !submitting && !!usageDate && cart.length > 0 && !!reason.trim();

  function openConfirm() {
    if (!canSubmit) return;
    setConfirmOpen(true);
  }
  function closeConfirm() {
    setConfirmOpen(false);
  }

  async function confirmSubmitUsage() {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const { usage } = await api.createInternalStockUsage({
        usageDate,
        reason: reason.trim(),
        items: cart.map((r) => ({ productId: r.productId, unitId: r.unitId, quantity: Number(r.quantity) })),
      });
      setResult(usage);
      setCart([]);
      setReason('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Pemakaian Internal Stok</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Barang dagangan dipakai untuk kebutuhan toko sendiri (bukan dijual) — nilainya dibebankan sebesar HPP
        (harga pembelian rata-rata berjalan), bukan harga jual. Tidak ada pendapatan yang tercatat dari sini.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Tanggal</label>
            <input className="input" style={{ width: '100%' }} type="date" value={usageDate} onChange={(e) => setUsageDate(e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Alasan (wajib)</label>
            <input
              className="input" style={{ width: '100%' }} placeholder="mis. Gelas dipakai minum karyawan, ATK habis dipakai kasir..."
              value={reason} onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="inline-form" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ddd' }}>
          <ProductSearchSelect key={pickResetKey} onSelect={onPickProduct} style={{ width: 260 }} />
          <select className="input" value={pickUnitId} onChange={(e) => setPickUnitId(e.target.value)} disabled={pickUnits.length === 0}>
            {pickUnits.length === 0 && <option value="">-- Satuan --</option>}
            {pickUnits.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}{u.is_base_unit ? ' (dasar)' : ''}</option>)}
          </select>
          <input className="input" type="number" min="0.0001" step="any" placeholder="Qty" style={{ width: 100 }} value={pickQuantity} onChange={(e) => setPickQuantity(e.target.value)} />
          <button className="btn-secondary" type="button" onClick={addItemToCart} disabled={!pickProductId || !pickUnitId || !pickQuantity}>
            + Tambah Item
          </button>
        </div>

        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th></th></tr></thead>
          <tbody>
            {cart.map((r) => (
              <tr key={r.key}>
                <td>{r.productName}</td>
                <td>{r.unitName}</td>
                <td>{r.quantity}</td>
                <td><button className="btn-danger" onClick={() => removeCartItem(r.key)}>Hapus</button></td>
              </tr>
            ))}
            {cart.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Belum ada item</td></tr>}
          </tbody>
        </table>

        <button className="btn-primary" style={{ marginTop: 12 }} onClick={openConfirm} disabled={!canSubmit}>
          {submitting ? 'Menyimpan...' : 'Catat Pemakaian Internal'}
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="success-banner">
              Pemakaian internal {result.usageNumber} tersimpan — Total HPP {rp(result.totalValue)}
            </div>
            <JournalPreview entry={result.journalEntry} accountLabel={accountLabel} />
            <table style={{ marginTop: 8 }}>
              <thead><tr><th>Produk</th><th>Qty (base)</th><th>HPP Berjalan / unit</th><th>Nilai Beban</th></tr></thead>
              <tbody>
                {result.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.productName || it.productId}</td>
                    <td>{Number(it.quantityBase).toLocaleString('id-ID')}</td>
                    <td>{rp(it.costPerBaseUnit)}</td>
                    <td>{rp(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 460 }}>
            <h3 style={{ marginTop: 0 }}>Konfirmasi Pemakaian Internal</h3>
            <p style={{ fontSize: 13, color: '#666', marginTop: -8 }}>
              Stok akan langsung berkurang sebesar HPP berjalan. Belum ada fitur pembalik/void untuk dokumen ini —
              periksa dulu sebelum lanjut.
            </p>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              Tanggal: <strong>{new Date(usageDate).toLocaleDateString('id-ID')}</strong>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              Alasan: <strong>{reason.trim()}</strong>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{cart.length} item:</div>
            <ul style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: 14 }}>
              {cart.map((r) => (
                <li key={r.key}>{r.productName} — {r.quantity} {r.unitName}</li>
              ))}
            </ul>
            <button className="btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={confirmSubmitUsage} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Ya, Catat Pemakaian Internal'}
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={closeConfirm}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}
