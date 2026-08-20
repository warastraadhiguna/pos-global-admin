import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';
import ProductSearchSelect from '../components/ProductSearchSelect.jsx';
import SupplierSearchSelect from '../components/SupplierSearchSelect.jsx';
import DiscountInput from '../components/DiscountInput.jsx';
import MoneyInput from '../components/MoneyInput.jsx';

// Hitung nominal diskon dari type+value, sama formula dgn server
// (computeDiscount di PurchaseService.js) — dipakai cuma utk PREVIEW di UI,
// perhitungan final & journal tetap dilakukan server-side.
function discountAmount(type, value, base) {
  if (!type || !value) return 0;
  const v = Number(value);
  if (!v || v <= 0) return 0;
  if (type === 'percent') return (base * Math.min(v, 100)) / 100;
  return Math.min(v, base);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}
function toDateInputValue(d) {
  if (!d) return todayStr();
  return new Date(d).toISOString().slice(0, 10);
}

let cartKeyCounter = 0;

export default function PurchasesScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayStr());
  const [paymentType, setPaymentType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [taxMode, setTaxMode] = useState('pkp');
  const [ppnChecked, setPpnChecked] = useState(false);
  const [ppnMode, setPpnMode] = useState('exclude');
  const [ppnRate, setPpnRate] = useState('11');
  const [totalDiscountType, setTotalDiscountType] = useState(null);
  const [totalDiscountValue, setTotalDiscountValue] = useState('');

  const [pickProductId, setPickProductId] = useState('');
  const [pickProductName, setPickProductName] = useState('');
  // Berubah tiap kali item ditambah ke keranjang -> dipakai sbg `key` di
  // <ProductSearchSelect> supaya komponennya di-remount (reset state
  // internalnya balik ke search box kosong & langsung fokus lagi, bukan
  // nyangkut nampilin produk yg baru saja ditambah).
  const [pickResetKey, setPickResetKey] = useState(0);
  const [pickUnits, setPickUnits] = useState([]);
  const [pickUnitId, setPickUnitId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('');
  const [pickCostPerUnit, setPickCostPerUnit] = useState('');
  const [pickDiscountType, setPickDiscountType] = useState(null);
  const [pickDiscountValue, setPickDiscountValue] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Konfirmasi sebelum benar-benar simpan — 3 pilihan: simpan pembelian
  // (masuk stok+akuntansi), simpan sebagai draft (belum), batal.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Daftar draft pembelian — sama pola dgn "Daftar Draft" nota di kasir.
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  function reload() {
    api.listAllSuppliers().then((d) => setSuppliers(d.suppliers.filter((s) => s.is_active))).catch((err) => setError(err.message));
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.getStoreSettings().then((d) => setTaxMode(d.settings.tax_mode)).catch((err) => setError(err.message));
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
    if (!pickProductId || !pickUnitId || !pickQuantity || !pickCostPerUnit) return;
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
        costPerUnit: pickCostPerUnit,
        discountType: pickDiscountType,
        discountValue: pickDiscountValue,
      },
    ]);
    setPickProductId('');
    setPickProductName('');
    setPickResetKey((k) => k + 1);
    setPickUnits([]);
    setPickUnitId('');
    setPickQuantity('');
    setPickCostPerUnit('');
    setPickDiscountType(null);
    setPickDiscountValue('');
  }

  function removeCartItem(key) {
    setCart((prev) => prev.filter((r) => r.key !== key));
  }

  function resetForm() {
    setSupplierId('');
    setPurchaseDate(todayStr());
    setPaymentType('cash');
    setNotes('');
    setCart([]);
    setPpnChecked(false);
    setPpnMode('exclude');
    setPpnRate('11');
    setTotalDiscountType(null);
    setTotalDiscountValue('');
  }

  const cartSubtotal = cart.reduce((sum, r) => sum + Number(r.quantity || 0) * Number(r.costPerUnit || 0), 0);
  const cartItemDiscountTotal = cart.reduce((sum, r) => {
    const gross = Number(r.quantity || 0) * Number(r.costPerUnit || 0);
    return sum + discountAmount(r.discountType, r.discountValue, gross);
  }, 0);
  const subtotalAfterItemDiscount = cartSubtotal - cartItemDiscountTotal;
  const totalDiscountAmount = discountAmount(totalDiscountType, totalDiscountValue, subtotalAfterItemDiscount);
  const cartTotal = subtotalAfterItemDiscount - totalDiscountAmount;
  const canSave = !submitting && !savingDraft && !!supplierId && cart.length > 0 && !(ppnChecked && (ppnRate === '' || Number(ppnRate) < 0));

  function openConfirm() {
    if (!canSave) return;
    setConfirmOpen(true);
  }
  function closeConfirm() {
    setConfirmOpen(false);
  }

  async function submitPurchase() {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const { purchase } = await api.createPurchase({
        supplierId,
        purchaseDate,
        paymentType,
        notes: notes.trim() || undefined,
        items: cart.map((r) => ({
          productId: r.productId,
          unitId: r.unitId,
          quantity: Number(r.quantity),
          costPerUnit: Number(r.costPerUnit),
          discountType: r.discountType || undefined,
          discountValue: r.discountValue ? Number(r.discountValue) : undefined,
        })),
        ppnMode: ppnChecked ? ppnMode : undefined,
        ppnRate: ppnChecked ? Number(ppnRate) : undefined,
        totalDiscountType: totalDiscountType || undefined,
        totalDiscountValue: totalDiscountValue ? Number(totalDiscountValue) : undefined,
      });
      setResult(purchase);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraftInstead() {
    setConfirmOpen(false);
    setSavingDraft(true);
    setError(null);
    try {
      await api.createPurchaseDraft({
        supplierId: supplierId || null,
        purchaseDate,
        paymentType,
        notes: notes.trim() || null,
        ppn: ppnChecked ? { mode: ppnMode, rate: Number(ppnRate) } : null,
        totalDiscount: totalDiscountType ? { type: totalDiscountType, value: Number(totalDiscountValue) } : null,
        items: cart.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          unitId: r.unitId,
          unitName: r.unitName,
          quantity: Number(r.quantity),
          costPerUnit: Number(r.costPerUnit),
          discountType: r.discountType || null,
          discountValue: r.discountValue ? Number(r.discountValue) : null,
        })),
      });
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingDraft(false);
    }
  }

  function openDraftList() {
    setDraftListOpen(true);
    setDraftsLoading(true);
    api.listPurchaseDrafts()
      .then((d) => setDrafts(d.drafts))
      .catch((err) => setError(err.message))
      .finally(() => setDraftsLoading(false));
  }
  function closeDraftList() {
    setDraftListOpen(false);
  }

  // Panggil draft balik ke form — draft LANGSUNG dihapus dari server begitu
  // dipanggil (bukan menunggu sampai benar2 disimpan), sama persis pola
  // "Panggil" draft nota di kasir — konsisten dgn behavior yang sudah ada.
  async function recallDraft(draft) {
    setError(null);
    try {
      await api.deletePurchaseDraft(draft.id);
    } catch (err) {
      setError(err.message);
      return;
    }
    setSupplierId(draft.supplierId || '');
    setPurchaseDate(toDateInputValue(draft.purchaseDate));
    setPaymentType(draft.paymentType || 'cash');
    setNotes(draft.notes || '');
    if (draft.ppn) {
      setPpnChecked(true);
      setPpnMode(draft.ppn.mode || 'exclude');
      setPpnRate(String(draft.ppn.rate ?? '11'));
    } else {
      setPpnChecked(false);
    }
    if (draft.totalDiscount) {
      setTotalDiscountType(draft.totalDiscount.type || null);
      setTotalDiscountValue(String(draft.totalDiscount.value ?? ''));
    } else {
      setTotalDiscountType(null);
      setTotalDiscountValue('');
    }
    setCart(draft.items.map((it) => ({
      key: ++cartKeyCounter,
      productId: it.productId,
      productName: it.productName || it.productId,
      unitId: it.unitId,
      unitName: it.unitName || '',
      quantity: String(it.quantity),
      costPerUnit: String(it.costPerUnit),
      discountType: it.discountType || null,
      discountValue: it.discountValue != null ? String(it.discountValue) : '',
    })));
    setDraftListOpen(false);
  }

  async function deleteDraftRow(id) {
    setError(null);
    try {
      await api.deletePurchaseDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Pembelian</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="inline-form" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Pembelian Baru</h3>
          <button className="btn-secondary" type="button" onClick={openDraftList}>📋 Daftar Draft</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Supplier</label>
            <SupplierSearchSelect
              suppliers={suppliers}
              value={supplierId}
              onSelect={(s) => setSupplierId(s?.id || '')}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Tanggal</label>
            <input className="input" style={{ width: '100%' }} type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Jenis Pembayaran</label>
            <select className="input" style={{ width: '100%' }} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
              <option value="cash">Tunai (Kas)</option>
              <option value="credit">Kredit (Utang Usaha)</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Catatan (opsional)</label>
            <input className="input" style={{ width: '100%' }} placeholder="Catatan pada nota pembelian..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="inline-form" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={ppnChecked} onChange={(e) => setPpnChecked(e.target.checked)} />
            Ada PPN dari supplier
          </label>
          {ppnChecked && (
            <>
              <select className="input" value={ppnMode} onChange={(e) => setPpnMode(e.target.value)}>
                <option value="exclude">Exclude (belum termasuk PPN)</option>
                <option value="included">Included (harga sudah termasuk PPN)</option>
              </select>
              <input
                className="input" type="number" min="0" step="0.01" style={{ width: 100 }}
                placeholder="Tarif %" value={ppnRate} onChange={(e) => setPpnRate(e.target.value)}
              />
            </>
          )}
        </div>
        {ppnChecked && (
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {taxMode === 'pkp'
              ? 'Mode PKP: PPN dipisah jadi akun PPN Masukan tersendiri (bisa dikreditkan), tidak masuk nilai persediaan/HPP.'
              : 'Mode Non-PKP: PPN tidak bisa dikreditkan — melebur jadi bagian nilai persediaan & avg cost (HPP lebih tinggi).'}
          </p>
        )}

        <div className="inline-form" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ddd', flexWrap: 'wrap' }}>
          <ProductSearchSelect key={pickResetKey} onSelect={onPickProduct} style={{ width: 260 }} />
          <select className="input" value={pickUnitId} onChange={(e) => setPickUnitId(e.target.value)} disabled={pickUnits.length === 0}>
            {pickUnits.length === 0 && <option value="">-- Satuan --</option>}
            {pickUnits.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}{u.is_base_unit ? ' (dasar)' : ''}</option>)}
          </select>
          <input className="input" type="number" min="0.0001" step="any" placeholder="Qty" style={{ width: 100 }} value={pickQuantity} onChange={(e) => setPickQuantity(e.target.value)} />
          <MoneyInput placeholder="Harga beli / satuan (Rp)" value={pickCostPerUnit} onChange={setPickCostPerUnit} style={{ width: 180 }} />
          <DiscountInput type={pickDiscountType} value={pickDiscountValue} onTypeChange={setPickDiscountType} onValueChange={setPickDiscountValue} />
          <button className="btn-secondary" type="button" onClick={addItemToCart} disabled={!pickProductId || !pickUnitId || !pickQuantity || !pickCostPerUnit}>
            + Tambah Item
          </button>
        </div>

        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Produk</th><th>Satuan</th><th>Qty</th><th>Harga/Satuan</th><th>Diskon</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {cart.map((r) => {
              const gross = Number(r.quantity) * Number(r.costPerUnit);
              const disc = discountAmount(r.discountType, r.discountValue, gross);
              return (
                <tr key={r.key}>
                  <td>{r.productName}</td>
                  <td>{r.unitName}</td>
                  <td>{r.quantity}</td>
                  <td>{rp(r.costPerUnit)}</td>
                  <td>{disc > 0 ? `- ${rp(disc)}` : '-'}</td>
                  <td>{rp(gross - disc)}</td>
                  <td><button className="btn-danger" onClick={() => removeCartItem(r.key)}>Hapus</button></td>
                </tr>
              );
            })}
            {cart.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Belum ada item</td></tr>}
          </tbody>
        </table>

        {cart.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Subtotal (setelah diskon item)</span><span>{rp(subtotalAfterItemDiscount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6, gap: 8 }}>
                <span>Diskon Total Nota</span>
                <DiscountInput type={totalDiscountType} value={totalDiscountValue} onTypeChange={setTotalDiscountType} onValueChange={setTotalDiscountValue} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid #ddd', paddingTop: 8 }}>
                <span>Total</span><span>{rp(cartTotal)}</span>
              </div>
            </div>
          </div>
        )}

        <button className="btn-primary" style={{ marginTop: 12 }} onClick={openConfirm} disabled={!canSave}>
          Simpan Pembelian
        </button>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div className="success-banner">
              Pembelian {result.purchaseNumber} tersimpan — Total {rp(result.grandTotal)} ({result.paymentType === 'cash' ? 'Tunai' : 'Kredit'})
              {Number(result.discountTotal) > 0 && (
                <> — Subtotal {rp(result.subtotal)}, Diskon {rp(result.discountTotal)}</>
              )}
              {result.ppnMode && Number(result.ppnAmount) > 0 && (
                <> — DPP {rp(result.dpp)} + PPN Masukan {rp(result.ppnAmount)} ({Number(result.ppnRate)}%, {result.ppnMode === 'exclude' ? 'exclude' : 'included'})</>
              )}
              {result.ppnMode && Number(result.ppnAmount) === 0 && (
                <> — PPN {Number(result.ppnRate)}% ({result.ppnMode === 'exclude' ? 'exclude' : 'included'}) melebur ke nilai persediaan (non-PKP), tidak dipisah</>
              )}
            </div>
            <JournalPreview entry={result.journalEntry} accountLabel={accountLabel} />
            <div className="card" style={{ marginTop: 12 }}>
              <strong>Perubahan Moving Average Cost</strong>
              <table style={{ marginTop: 8 }}>
                <thead><tr><th>Produk</th><th>Qty Diterima (base)</th><th>Stok Sebelum</th><th>Avg Cost Sebelum</th><th>Stok Sesudah</th><th>Avg Cost Sesudah</th></tr></thead>
                <tbody>
                  {result.items.map((it, i) => (
                    <tr key={i}>
                      <td>{it.productName || it.productId}</td>
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

      {confirmOpen && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 440 }}>
            <h3 style={{ marginTop: 0 }}>Konfirmasi Pembelian</h3>
            <div style={{ fontSize: 14, marginBottom: 6 }}>
              Supplier: <strong>{suppliers.find((s) => s.id === supplierId)?.name || '-'}</strong>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{cart.length} item</div>
            {(cartItemDiscountTotal > 0 || totalDiscountAmount > 0) && (
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                Subtotal {rp(cartSubtotal)} — Diskon {rp(cartItemDiscountTotal + totalDiscountAmount)}
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Total: {rp(cartTotal)}</div>
            <button className="btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={submitPurchase} disabled={submitting}>
              {submitting ? 'Menyimpan...' : '✅ Simpan Pembelian (masuk stok & akuntansi)'}
            </button>
            <button className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} onClick={saveDraftInstead} disabled={savingDraft}>
              {savingDraft ? 'Menyimpan draft...' : '📋 Simpan sebagai Draft (belum masuk stok/akuntansi)'}
            </button>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={closeConfirm}>Batal</button>
          </div>
        </div>
      )}

      {draftListOpen && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 560 }}>
            <button type="button" className="modal-close-btn" onClick={closeDraftList} title="Tutup">✕</button>
            <h3 style={{ marginTop: 0 }}>Daftar Draft Pembelian</h3>
            <p style={{ fontSize: 13, color: '#666', marginTop: -8 }}>
              Belum masuk stok/akuntansi. Panggil untuk lanjutkan mengisi form, lalu simpan seperti biasa.
            </p>
            {draftsLoading && <p style={{ color: '#999' }}>Memuat...</p>}
            {!draftsLoading && drafts.length === 0 && <p style={{ color: '#999' }}>Belum ada draft tersimpan.</p>}
            {!draftsLoading && drafts.map((d) => (
              <div key={d.id} className="inline-form" style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.supplierName || '(tanpa supplier)'} — {d.itemCount} item</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    dibuat {new Date(d.createdAt).toLocaleString('id-ID')} oleh {d.createdByName}
                  </div>
                </div>
                <button className="btn-primary" onClick={() => recallDraft(d)}>Panggil</button>
                <button className="btn-danger" onClick={() => deleteDraftRow(d.id)}>Hapus</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
