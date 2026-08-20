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

export default function PurchaseReturnsScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [error, setError] = useState(null);

  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnDate, setReturnDate] = useState(todayStr());
  const [returnPaymentType, setReturnPaymentType] = useState('cash');
  const [returnReason, setReturnReason] = useState('');
  const [returnCart, setReturnCart] = useState([]);
  const [rPickProductId, setRPickProductId] = useState('');
  const [rPickProductName, setRPickProductName] = useState('');
  const [rPickResetKey, setRPickResetKey] = useState(0);
  const [rPickUnits, setRPickUnits] = useState([]);
  const [rPickUnitId, setRPickUnitId] = useState('');
  const [rPickQuantity, setRPickQuantity] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnResult, setReturnResult] = useState(null);

  function reload() {
    api.listAllSuppliers().then((d) => setSuppliers(d.suppliers.filter((s) => s.is_active))).catch((err) => setError(err.message));
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.listPurchaseReturns().then((d) => setPurchaseReturns(d.purchaseReturns)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  async function onRPickProduct(product) {
    setRPickProductId(product?.id || '');
    setRPickProductName(product?.name || '');
    setRPickUnitId('');
    setRPickUnits([]);
    if (!product) return;
    try {
      const detail = await api.getProduct(product.id);
      setRPickUnits(detail.units);
      const baseUnit = detail.units.find((u) => u.is_base_unit) || detail.units[0];
      if (baseUnit) setRPickUnitId(baseUnit.unit_id);
    } catch (err) {
      setError(err.message);
    }
  }
  function addReturnItem() {
    if (!rPickProductId || !rPickUnitId || !rPickQuantity) return;
    const unit = rPickUnits.find((u) => u.unit_id === rPickUnitId);
    setReturnCart((prev) => [
      ...prev,
      {
        key: ++cartKeyCounter,
        productId: rPickProductId,
        productName: rPickProductName || rPickProductId,
        unitId: rPickUnitId,
        unitName: unit?.unit_name || '',
        quantity: rPickQuantity,
      },
    ]);
    setRPickProductId('');
    setRPickProductName('');
    setRPickResetKey((k) => k + 1);
    setRPickUnits([]);
    setRPickUnitId('');
    setRPickQuantity('');
  }
  function removeReturnItem(key) {
    setReturnCart((prev) => prev.filter((r) => r.key !== key));
  }

  async function submitReturn() {
    if (!returnSupplierId || returnCart.length === 0 || !returnReason.trim()) return;
    setReturnSubmitting(true);
    setError(null);
    setReturnResult(null);
    try {
      const { purchaseReturn } = await api.createPurchaseReturn({
        supplierId: returnSupplierId,
        returnDate,
        paymentType: returnPaymentType,
        reason: returnReason.trim(),
        items: returnCart.map((r) => ({ productId: r.productId, unitId: r.unitId, quantity: Number(r.quantity) })),
      });
      setReturnResult(purchaseReturn);
      setReturnCart([]);
      setReturnSupplierId('');
      setReturnReason('');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setReturnSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Retur Pembelian</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Barang benar-benar dikembalikan ke supplier (transaksi bisnis nyata, bukan koreksi salah input — pakai avg
        cost berjalan saat retur diproses, sama seperti menjual).
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="inline-form">
          <select className="input" value={returnSupplierId} onChange={(e) => setReturnSupplierId(e.target.value)}>
            <option value="">-- Pilih Supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          <select className="input" value={returnPaymentType} onChange={(e) => setReturnPaymentType(e.target.value)}>
            <option value="cash">Tunai (dana kembali ke Kas)</option>
            <option value="credit">Kredit (mengurangi Utang Usaha)</option>
          </select>
        </div>
        <div className="inline-form">
          <input className="input" placeholder="Alasan retur (wajib)" style={{ flex: 1, minWidth: 260 }} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
        </div>

        <div className="inline-form" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ddd' }}>
          <ProductSearchSelect key={rPickResetKey} onSelect={onRPickProduct} style={{ width: 260 }} />
          <select className="input" value={rPickUnitId} onChange={(e) => setRPickUnitId(e.target.value)} disabled={rPickUnits.length === 0}>
            {rPickUnits.length === 0 && <option value="">-- Satuan --</option>}
            {rPickUnits.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}{u.is_base_unit ? ' (dasar)' : ''}</option>)}
          </select>
          <input className="input" type="number" min="0.0001" step="any" placeholder="Qty" style={{ width: 100 }} value={rPickQuantity} onChange={(e) => setRPickQuantity(e.target.value)} />
          <button className="btn-secondary" type="button" onClick={addReturnItem} disabled={!rPickProductId || !rPickUnitId || !rPickQuantity}>
            + Tambah Item
          </button>
        </div>

        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th></th></tr></thead>
          <tbody>
            {returnCart.map((r) => (
              <tr key={r.key}>
                <td>{r.productName}</td>
                <td>{r.unitName}</td>
                <td>{r.quantity}</td>
                <td><button className="btn-danger" onClick={() => removeReturnItem(r.key)}>Hapus</button></td>
              </tr>
            ))}
            {returnCart.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Belum ada item</td></tr>}
          </tbody>
        </table>

        <button
          className="btn-primary" style={{ marginTop: 12 }} onClick={submitReturn}
          disabled={returnSubmitting || !returnSupplierId || returnCart.length === 0 || !returnReason.trim()}
        >
          {returnSubmitting ? 'Menyimpan...' : 'Simpan Retur Pembelian'}
        </button>

        {returnResult && (
          <div style={{ marginTop: 16 }}>
            <div className="success-banner">
              Retur {returnResult.returnNumber} tersimpan — Total {rp(returnResult.grandTotal)} ({returnResult.paymentType === 'cash' ? 'Tunai' : 'Kredit'})
            </div>
            <JournalPreview entry={returnResult.journalEntry} accountLabel={accountLabel} />
            <table style={{ marginTop: 8 }}>
              <thead><tr><th>Produk</th><th>Qty (base)</th><th>Avg Cost Berjalan</th><th>Nilai</th></tr></thead>
              <tbody>
                {returnResult.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.productName || it.productId}</td>
                    <td>{Number(it.quantityBase).toLocaleString('id-ID')}</td>
                    <td>{rp(it.costPerBaseUnit)}</td>
                    <td>{rp(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead><tr><th>No. Retur</th><th>Tanggal</th><th>Supplier</th><th>Total</th><th>Bayar</th><th>Alasan</th></tr></thead>
          <tbody>
            {purchaseReturns.map((r) => (
              <tr key={r.id}>
                <td>{r.return_number}</td>
                <td>{new Date(r.return_date).toLocaleDateString('id-ID')}</td>
                <td>{r.supplier_name}</td>
                <td>{rp(r.grand_total)}</td>
                <td>{r.payment_type === 'cash' ? 'Tunai' : 'Kredit'}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
            {purchaseReturns.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada retur pembelian</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
