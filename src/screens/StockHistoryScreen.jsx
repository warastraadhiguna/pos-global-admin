import { useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';
import ProductSearchSelect from '../components/ProductSearchSelect.jsx';

const MOVEMENT_TYPE_LABELS = {
  purchase: 'Pembelian',
  purchase_void: 'Void Pembelian',
  purchase_return: 'Retur Pembelian',
  sale: 'Penjualan',
  void_reversal: 'Void Penjualan',
  opname: 'Stock Opname',
  opening_balance: 'Saldo Awal',
};

function typeLabel(t) {
  return MOVEMENT_TYPE_LABELS[t] || t;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function StockHistoryScreen() {
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [pickResetKey, setPickResetKey] = useState(0);
  const [movementType, setMovementType] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonthStr());
  const [dateTo, setDateTo] = useState(todayStr());

  const [movements, setMovements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function onPickProduct(product) {
    setProductId(product?.id || '');
    setProductName(product?.name || '');
  }
  function clearProduct() {
    setProductId('');
    setProductName('');
    setPickResetKey((k) => k + 1);
  }

  async function loadMovements(e) {
    e?.preventDefault();
    if (dateTo < dateFrom) {
      setError('Tanggal akhir tidak boleh sebelum tanggal awal');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { movements: rows } = await api.listStockMovements({
        productId: productId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        movementType: movementType || undefined,
      });
      setMovements(rows);
    } catch (err) {
      setError(err.message);
      setMovements(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Riwayat Stok</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Read-only. Semua perubahan stok — pembelian, penjualan, retur, void, dan stock opname.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <form className="inline-form" onSubmit={loadMovements} style={{ flexWrap: 'wrap' }}>
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: '#666' }}>s/d</span>
        <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

        {productName ? (
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{productName}</span>
            <button type="button" onClick={clearProduct} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 12, padding: 0 }}>Ganti</button>
          </div>
        ) : (
          <ProductSearchSelect key={pickResetKey} onSelect={onPickProduct} placeholder="Semua produk (opsional)..." autoFocus={false} style={{ width: 220 }} />
        )}

        <select className="input" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          <option value="">Semua Jenis</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Memuat...' : 'Muat Riwayat'}
        </button>
      </form>

      {movements && (
        <div className="card" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Produk</th><th>Jenis</th><th>No. Dokumen</th>
                <th>Masuk</th><th>Keluar</th><th>Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.movement_date).toLocaleString('id-ID')}</td>
                  <td>{m.product_name}</td>
                  <td>{typeLabel(m.movement_type)}</td>
                  <td>{m.document_number || '-'}</td>
                  <td style={{ color: Number(m.qty_in_base) > 0 ? '#166534' : undefined }}>
                    {Number(m.qty_in_base) > 0 ? `+${Number(m.qty_in_base).toLocaleString('id-ID')} ${m.base_unit_name}` : '-'}
                  </td>
                  <td style={{ color: Number(m.qty_out_base) > 0 ? '#991b1b' : undefined }}>
                    {Number(m.qty_out_base) > 0 ? `-${Number(m.qty_out_base).toLocaleString('id-ID')} ${m.base_unit_name}` : '-'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{Number(m.balance_after_base).toLocaleString('id-ID')} {m.base_unit_name}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada pergerakan stok pada filter ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
