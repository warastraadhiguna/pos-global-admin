import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function ProductDetailScreen({ productId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [allUnits, setAllUnits] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [priceLevels, setPriceLevels] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const [editForm, setEditForm] = useState({ name: '', sku: '', categoryId: '', isActive: true });
  const [newUnit, setNewUnit] = useState({ unitId: '', conversionFactor: '' });
  const [newBarcode, setNewBarcode] = useState({ unitId: '', barcode: '' });
  const [newPrice, setNewPrice] = useState({ unitId: '', priceLevelId: '', minQtyBase: '0', price: '' });
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceDraft, setEditPriceDraft] = useState('');

  function reload() {
    api.getProduct(productId).then((d) => {
      setDetail(d);
      setEditForm({ name: d.product.name, sku: d.product.sku || '', categoryId: d.product.category_id || '', isActive: !!d.product.is_active });
    }).catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
    api.listUnits().then((d) => setAllUnits(d.units));
    api.listCategories().then((d) => setAllCategories(d.categories));
    api.listPriceLevels().then((d) => setPriceLevels(d.priceLevels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function flash(msg) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2000);
  }

  async function saveInfo(e) {
    e.preventDefault();
    try {
      await api.updateProduct(productId, editForm);
      flash('Info produk disimpan');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitAddUnit(e) {
    e.preventDefault();
    if (!newUnit.unitId || !newUnit.conversionFactor) return;
    try {
      await api.addProductUnit(productId, newUnit);
      setNewUnit({ unitId: '', conversionFactor: '' });
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeUnit(unitId) {
    try {
      await api.deleteProductUnit(productId, unitId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitAddBarcode(e) {
    e.preventDefault();
    if (!newBarcode.unitId || !newBarcode.barcode.trim()) return;
    try {
      await api.addBarcode(productId, newBarcode);
      setNewBarcode({ unitId: '', barcode: '' });
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeBarcode(barcodeId) {
    try {
      await api.deleteBarcode(productId, barcodeId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitAddPrice(e) {
    e.preventDefault();
    if (!newPrice.unitId || !newPrice.priceLevelId || newPrice.price === '') return;
    try {
      await api.addPrice(productId, newPrice);
      setNewPrice({ unitId: '', priceLevelId: '', minQtyBase: '0', price: '' });
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removePrice(priceId) {
    try {
      await api.deletePrice(productId, priceId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditPrice(p) {
    setEditingPriceId(p.id);
    setEditPriceDraft(String(p.price));
  }

  async function submitEditPrice(priceId) {
    if (editPriceDraft === '' || Number(editPriceDraft) < 0) return;
    try {
      await api.updatePrice(productId, priceId, { price: editPriceDraft });
      setEditingPriceId(null);
      setError(null);
      flash('Harga diubah manual');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  // Kunci = lindungi baris harga ini dari update markup otomatis (Batch 3A).
  // Toggle langsung tanpa form terpisah - aksi kecil, tidak butuh konfirmasi.
  async function toggleLock(p) {
    try {
      await api.updatePrice(productId, p.id, { isLocked: !p.is_locked });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!detail) return <div>Memuat...</div>;

  return (
    <div>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>&larr; Kembali ke daftar produk</button>
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Info Produk</h3>
        <form onSubmit={saveInfo}>
          <div className="inline-form">
            <input className="input" placeholder="Nama" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <input className="input" placeholder="SKU" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
            <select className="input" value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
              <option value="">(tanpa kategori)</option>
              {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label style={{ fontSize: 14 }}>
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} /> Aktif
            </label>
            <button className="btn-primary" type="submit">Simpan</button>
          </div>
        </form>
        <p style={{ color: '#999', fontSize: 13 }}>Satuan dasar: <strong>{detail.product.base_unit_name}</strong> (tidak bisa diubah setelah produk dibuat)</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Satuan & Konversi</h3>
        <table>
          <thead><tr><th>Satuan</th><th>Konversi ke base unit</th><th></th></tr></thead>
          <tbody>
            {detail.units.map((u) => (
              <tr key={u.unit_id}>
                <td>{u.unit_name} {u.is_base_unit ? <span className="badge active">base</span> : null}</td>
                <td>{Number(u.conversion_factor)}</td>
                <td>{!u.is_base_unit && <button className="btn-danger" onClick={() => removeUnit(u.unit_id)}>Hapus</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={submitAddUnit} style={{ marginTop: 12 }}>
          <div className="inline-form">
            <select className="input" value={newUnit.unitId} onChange={(e) => setNewUnit({ ...newUnit, unitId: e.target.value })}>
              <option value="">Pilih satuan</option>
              {allUnits.filter((u) => !detail.units.some((du) => du.unit_id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input className="input" type="number" min="0.0001" step="0.0001" placeholder="Konversi (mis. 12)" value={newUnit.conversionFactor} onChange={(e) => setNewUnit({ ...newUnit, conversionFactor: e.target.value })} style={{ width: 160 }} />
            <button className="btn-primary" type="submit">Tambah Satuan</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Barcode</h3>
        <table>
          <thead><tr><th>Barcode</th><th>Satuan</th><th></th></tr></thead>
          <tbody>
            {detail.barcodes.map((b) => (
              <tr key={b.id}>
                <td>{b.barcode}</td>
                <td>{b.unit_name}</td>
                <td><button className="btn-danger" onClick={() => removeBarcode(b.id)}>Hapus</button></td>
              </tr>
            ))}
            {detail.barcodes.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 12 }}>Belum ada barcode</td></tr>}
          </tbody>
        </table>
        <form onSubmit={submitAddBarcode} style={{ marginTop: 12 }}>
          <div className="inline-form">
            <select className="input" value={newBarcode.unitId} onChange={(e) => setNewBarcode({ ...newBarcode, unitId: e.target.value })}>
              <option value="">Pilih satuan</option>
              {detail.units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
            <input className="input" placeholder="Kode barcode" value={newBarcode.barcode} onChange={(e) => setNewBarcode({ ...newBarcode, barcode: e.target.value })} />
            <button className="btn-primary" type="submit">Tambah Barcode</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Harga</h3>
        <p style={{ color: '#666', fontSize: 13, marginTop: -8 }}>
          Angka bisa berpecahan kalau berasal dari markup otomatis (HPP + markup%) — sengaja tidak dibulatkan.
          Kunci baris supaya tidak ikut ditimpa saat markup otomatis menghitung ulang.
        </p>
        <table>
          <thead><tr><th>Satuan</th><th>Level</th><th>Min Qty (base)</th><th>Harga</th><th>Kunci</th><th></th></tr></thead>
          <tbody>
            {detail.prices.map((p) => (
              <tr key={p.id}>
                <td>{p.unit_name}</td>
                <td>{p.price_level_name}</td>
                <td>{Number(p.min_qty_base)}</td>
                <td>
                  {editingPriceId === p.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={editPriceDraft}
                        onChange={(e) => setEditPriceDraft(e.target.value)}
                        style={{ width: 130 }}
                        autoFocus
                      />
                      <button className="btn-primary" onClick={() => submitEditPrice(p.id)}>Simpan</button>
                      <button className="btn-secondary" onClick={() => setEditingPriceId(null)}>Batal</button>
                    </div>
                  ) : (
                    <span onClick={() => startEditPrice(p)} style={{ cursor: 'pointer' }} title="Klik utk ubah manual">
                      Rp{Number(p.price).toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                    </span>
                  )}
                </td>
                <td>
                  <label style={{ fontSize: 13 }}>
                    <input type="checkbox" checked={!!p.is_locked} onChange={() => toggleLock(p)} /> {p.is_locked ? 'Terkunci' : '-'}
                  </label>
                </td>
                <td><button className="btn-danger" onClick={() => removePrice(p.id)}>Hapus</button></td>
              </tr>
            ))}
            {detail.prices.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 12 }}>Belum ada harga</td></tr>}
          </tbody>
        </table>
        <form onSubmit={submitAddPrice} style={{ marginTop: 12 }}>
          <div className="inline-form">
            <select className="input" value={newPrice.unitId} onChange={(e) => setNewPrice({ ...newPrice, unitId: e.target.value })}>
              <option value="">Satuan</option>
              {detail.units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>)}
            </select>
            <select className="input" value={newPrice.priceLevelId} onChange={(e) => setNewPrice({ ...newPrice, priceLevelId: e.target.value })}>
              <option value="">Level harga</option>
              {priceLevels.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
            </select>
            <input className="input" type="number" min="0" placeholder="Min qty (base unit)" value={newPrice.minQtyBase} onChange={(e) => setNewPrice({ ...newPrice, minQtyBase: e.target.value })} style={{ width: 160 }} />
            <input className="input" type="number" min="0" placeholder="Harga (Rp)" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} style={{ width: 140 }} />
            <button className="btn-primary" type="submit">Tambah Harga</button>
          </div>
        </form>
      </div>
    </div>
  );
}
