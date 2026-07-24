import { Fragment, useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

let cartKeyCounter = 0;

function InterveningNote({ movements }) {
  if (!movements || movements.length === 0) return null;
  const productNames = [...new Set(movements.map((m) => m.product_name))];
  return (
    <div className="error-banner" style={{ border: '2px solid #d97706', background: '#fffbeb', color: '#92400e', fontSize: 13 }}>
      ⚠️ Ada {movements.length} transaksi lain terjadi SEJAK pembelian ini dibuat, melibatkan: {productNames.join(', ')}.
      Selisih tetap dihitung dgn benar (nilai pembelian ini dikeluarkan persis dari pool saat ini), tapi avg cost hasilnya
      bisa terlihat tidak seperti harga wajar manapun — itu konsekuensi matematis yang tak terhindarkan, bukan kesalahan
      hitung, begitu ada transaksi lain memakai stok yang sama sebelum pembelian ini di-void.
    </div>
  );
}

export default function PurchasesScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [error, setError] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayStr());
  const [paymentType, setPaymentType] = useState('cash');
  const [cart, setCart] = useState([]);

  const [pickProductId, setPickProductId] = useState('');
  const [pickUnits, setPickUnits] = useState([]);
  const [pickUnitId, setPickUnitId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('');
  const [pickCostPerUnit, setPickCostPerUnit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [voidingId, setVoidingId] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidResult, setVoidResult] = useState(null);

  // --- Retur Pembelian ---
  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnDate, setReturnDate] = useState(todayStr());
  const [returnPaymentType, setReturnPaymentType] = useState('cash');
  const [returnReason, setReturnReason] = useState('');
  const [returnCart, setReturnCart] = useState([]);
  const [rPickProductId, setRPickProductId] = useState('');
  const [rPickUnits, setRPickUnits] = useState([]);
  const [rPickUnitId, setRPickUnitId] = useState('');
  const [rPickQuantity, setRPickQuantity] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnResult, setReturnResult] = useState(null);

  function reload() {
    api.listAllSuppliers().then((d) => setSuppliers(d.suppliers.filter((s) => s.is_active))).catch((err) => setError(err.message));
    api.listProducts().then((d) => setProducts(d.products)).catch((err) => setError(err.message));
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.listPurchases().then((d) => setPurchases(d.purchases)).catch((err) => setError(err.message));
    api.listPurchaseReturns().then((d) => setPurchaseReturns(d.purchaseReturns)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }
  function productName(id) {
    return products.find((p) => p.id === id)?.name || id;
  }

  async function onPickProduct(productId) {
    setPickProductId(productId);
    setPickUnitId('');
    setPickUnits([]);
    if (!productId) return;
    try {
      const detail = await api.getProduct(productId);
      setPickUnits(detail.units);
      const baseUnit = detail.units.find((u) => u.is_base_unit) || detail.units[0];
      if (baseUnit) setPickUnitId(baseUnit.unit_id);
    } catch (err) {
      setError(err.message);
    }
  }

  function addItemToCart() {
    if (!pickProductId || !pickUnitId || !pickQuantity || !pickCostPerUnit) return;
    const product = products.find((p) => p.id === pickProductId);
    const unit = pickUnits.find((u) => u.unit_id === pickUnitId);
    setCart((prev) => [
      ...prev,
      {
        key: ++cartKeyCounter,
        productId: pickProductId,
        productName: product?.name || pickProductId,
        unitId: pickUnitId,
        unitName: unit?.unit_name || '',
        quantity: pickQuantity,
        costPerUnit: pickCostPerUnit,
      },
    ]);
    setPickProductId('');
    setPickUnits([]);
    setPickUnitId('');
    setPickQuantity('');
    setPickCostPerUnit('');
  }

  function removeCartItem(key) {
    setCart((prev) => prev.filter((r) => r.key !== key));
  }

  const cartTotal = cart.reduce((sum, r) => sum + Number(r.quantity || 0) * Number(r.costPerUnit || 0), 0);

  async function submitPurchase() {
    if (!supplierId || cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const { purchase } = await api.createPurchase({
        supplierId,
        purchaseDate,
        paymentType,
        items: cart.map((r) => ({
          productId: r.productId,
          unitId: r.unitId,
          quantity: Number(r.quantity),
          costPerUnit: Number(r.costPerUnit),
        })),
      });
      setResult(purchase);
      setCart([]);
      setSupplierId('');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startVoid(purchaseId) {
    setVoidingId(purchaseId);
    setVoidReason('');
    setVoidResult(null);
  }
  function cancelVoid() {
    setVoidingId(null);
    setVoidReason('');
  }
  async function confirmVoid(purchaseId) {
    if (!voidReason.trim()) {
      setError('Alasan void wajib diisi');
      return;
    }
    setError(null);
    try {
      const result = await api.voidPurchase(purchaseId, { reason: voidReason.trim() });
      setVoidResult(result);
      setVoidingId(null);
      setVoidReason('');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Retur Pembelian handlers ---
  async function onRPickProduct(productId) {
    setRPickProductId(productId);
    setRPickUnitId('');
    setRPickUnits([]);
    if (!productId) return;
    try {
      const detail = await api.getProduct(productId);
      setRPickUnits(detail.units);
      const baseUnit = detail.units.find((u) => u.is_base_unit) || detail.units[0];
      if (baseUnit) setRPickUnitId(baseUnit.unit_id);
    } catch (err) {
      setError(err.message);
    }
  }
  function addReturnItem() {
    if (!rPickProductId || !rPickUnitId || !rPickQuantity) return;
    const product = products.find((p) => p.id === rPickProductId);
    const unit = rPickUnits.find((u) => u.unit_id === rPickUnitId);
    setReturnCart((prev) => [
      ...prev,
      {
        key: ++cartKeyCounter,
        productId: rPickProductId,
        productName: product?.name || rPickProductId,
        unitId: rPickUnitId,
        unitName: unit?.unit_name || '',
        quantity: rPickQuantity,
      },
    ]);
    setRPickProductId('');
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
      <h2>Pembelian</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Pembelian Baru</h3>

        <div className="inline-form">
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">-- Pilih Supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          <select className="input" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            <option value="cash">Tunai (Kas)</option>
            <option value="credit">Kredit (Utang Usaha)</option>
          </select>
        </div>

        <div className="inline-form" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ddd' }}>
          <select className="input" value={pickProductId} onChange={(e) => onPickProduct(e.target.value)}>
            <option value="">-- Pilih Produk --</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
          <select className="input" value={pickUnitId} onChange={(e) => setPickUnitId(e.target.value)} disabled={pickUnits.length === 0}>
            {pickUnits.length === 0 && <option value="">-- Satuan --</option>}
            {pickUnits.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}{u.is_base_unit ? ' (dasar)' : ''}</option>)}
          </select>
          <input className="input" type="number" min="0.0001" step="any" placeholder="Qty" style={{ width: 100 }} value={pickQuantity} onChange={(e) => setPickQuantity(e.target.value)} />
          <input className="input" type="number" min="1" placeholder="Harga beli / satuan (Rp)" value={pickCostPerUnit} onChange={(e) => setPickCostPerUnit(e.target.value)} />
          <button className="btn-secondary" type="button" onClick={addItemToCart} disabled={!pickProductId || !pickUnitId || !pickQuantity || !pickCostPerUnit}>
            + Tambah Item
          </button>
        </div>

        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th>Harga/Satuan</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {cart.map((r) => (
              <tr key={r.key}>
                <td>{r.productName}</td>
                <td>{r.unitName}</td>
                <td>{r.quantity}</td>
                <td>{rp(r.costPerUnit)}</td>
                <td>{rp(Number(r.quantity) * Number(r.costPerUnit))}</td>
                <td><button className="btn-danger" onClick={() => removeCartItem(r.key)}>Hapus</button></td>
              </tr>
            ))}
            {cart.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Belum ada item</td></tr>}
          </tbody>
          {cart.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 700 }}><td colSpan={4}>Total</td><td colSpan={2}>{rp(cartTotal)}</td></tr>
            </tfoot>
          )}
        </table>

        <button className="btn-primary" style={{ marginTop: 12 }} onClick={submitPurchase} disabled={submitting || !supplierId || cart.length === 0}>
          {submitting ? 'Menyimpan...' : 'Simpan Pembelian'}
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="success-banner">
              Pembelian {result.purchaseNumber} tersimpan — Total {rp(result.grandTotal)} ({result.paymentType === 'cash' ? 'Tunai' : 'Kredit'})
            </div>
            <JournalPreview entry={result.journalEntry} accountLabel={accountLabel} />
            <div className="card" style={{ marginTop: 12 }}>
              <strong>Perubahan Moving Average Cost</strong>
              <table style={{ marginTop: 8 }}>
                <thead><tr><th>Produk</th><th>Qty Diterima (base)</th><th>Stok Sebelum</th><th>Avg Cost Sebelum</th><th>Stok Sesudah</th><th>Avg Cost Sesudah</th></tr></thead>
                <tbody>
                  {result.items.map((it, i) => (
                    <tr key={i}>
                      <td>{productName(it.productId)}</td>
                      <td>{Number(it.quantityBase).toLocaleString('id-ID')}</td>
                      <td>{Number(it.qtyBaseBefore).toLocaleString('id-ID')}</td>
                      <td>{rp(it.avgCostBefore)}</td>
                      <td>{Number(it.qtyBaseAfter).toLocaleString('id-ID')}</td>
                      <td>{rp(it.avgCostAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {voidResult && (
        <div className="card" style={{ marginBottom: 20 }}>
          <strong>Hasil Void Pembelian {voidResult.purchaseNumber}</strong>
          <InterveningNote movements={voidResult.interveningMovements} />
          {voidResult.journalEntry ? (
            <JournalPreview entry={voidResult.journalEntry} accountLabel={accountLabel} />
          ) : (
            <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>Tidak ada jurnal untuk dibalik.</div>
          )}
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Produk</th><th>Stok Sebelum</th><th>Avg Cost Sebelum</th><th>Stok Sesudah</th><th>Avg Cost Sesudah</th><th></th></tr></thead>
            <tbody>
              {voidResult.items.map((it, i) => (
                <tr key={i}>
                  <td>{productName(it.productId)}</td>
                  <td>{Number(it.qtyBaseBefore).toLocaleString('id-ID')}</td>
                  <td>{rp(it.avgCostBefore)}</td>
                  <td>{Number(it.qtyBaseAfter).toLocaleString('id-ID')}</td>
                  <td>{rp(it.avgCostAfter)}</td>
                  <td>{it.hadInterveningTransaction && <span className="badge inactive">ada transaksi di tengah</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Riwayat Pembelian</h3>
        <table>
          <thead><tr><th>No. Pembelian</th><th>Tanggal</th><th>Supplier</th><th>Total</th><th>Bayar</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {purchases.map((p) => (
              <Fragment key={p.id}>
                <tr>
                  <td>{p.purchase_number}</td>
                  <td>{new Date(p.purchase_date).toLocaleDateString('id-ID')}</td>
                  <td>{p.supplier_name}</td>
                  <td>{rp(p.grand_total)}</td>
                  <td>{p.payment_type === 'cash' ? 'Tunai' : 'Kredit'}</td>
                  <td><span className={`badge ${p.status === 'completed' ? 'active' : 'inactive'}`}>{p.status === 'completed' ? 'Selesai' : 'Void'}</span></td>
                  <td>
                    {p.status === 'completed' && voidingId !== p.id && (
                      <button className="btn-danger" onClick={() => startVoid(p.id)}>Void</button>
                    )}
                  </td>
                </tr>
                {voidingId === p.id && (
                  <tr>
                    <td colSpan={7}>
                      <div className="inline-form" style={{ margin: 0 }}>
                        <input
                          className="input" placeholder="Alasan void (wajib)" style={{ flex: 1, minWidth: 240 }}
                          value={voidReason} onChange={(e) => setVoidReason(e.target.value)} autoFocus
                        />
                        <button className="btn-danger" onClick={() => confirmVoid(p.id)} disabled={!voidReason.trim()}>Konfirmasi Void</button>
                        <button className="btn-secondary" onClick={cancelVoid}>Batal</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {purchases.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada pembelian</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Retur Pembelian</h3>
        <p style={{ color: '#666', fontSize: 13, marginTop: -8 }}>
          Barang benar-benar dikembalikan ke supplier (transaksi bisnis nyata, bukan koreksi salah input — pakai avg
          cost berjalan saat retur diproses, sama seperti menjual).
        </p>

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
          <select className="input" value={rPickProductId} onChange={(e) => onRPickProduct(e.target.value)}>
            <option value="">-- Pilih Produk --</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
          </select>
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
                    <td>{productName(it.productId)}</td>
                    <td>{Number(it.quantityBase).toLocaleString('id-ID')}</td>
                    <td>{rp(it.costPerBaseUnit)}</td>
                    <td>{rp(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <table style={{ marginTop: 16 }}>
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
