import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function rp(n) {
  return `Rp${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

export default function SalesReturnsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [error, setError] = useState(null);

  const [saleNumberInput, setSaleNumberInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [sale, setSale] = useState(null); // { id, saleNumber, items: [...] }
  const [returnQty, setReturnQty] = useState({}); // { [saleItemId]: string }

  const [returnDate, setReturnDate] = useState(todayStr());
  const [isCashRefund, setIsCashRefund] = useState(true);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnResult, setReturnResult] = useState(null);

  function reload() {
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.listSalesReturns().then((d) => setSalesReturns(d.salesReturns)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  async function lookupSale() {
    if (!saleNumberInput.trim()) return;
    setLookupLoading(true);
    setError(null);
    setSale(null);
    setReturnQty({});
    setReturnResult(null);
    try {
      const { sale: found } = await api.lookupSaleForReturn(saleNumberInput.trim());
      setSale(found);
    } catch (err) {
      setError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  function setQtyFor(saleItemId, value) {
    setReturnQty((prev) => ({ ...prev, [saleItemId]: value }));
  }

  const itemsToReturn = sale
    ? sale.items
        .map((it) => ({ saleItemId: it.id, quantity: Number(returnQty[it.id] || 0) }))
        .filter((it) => it.quantity > 0)
    : [];

  async function submitReturn() {
    if (!sale || itemsToReturn.length === 0 || !returnReason.trim()) return;
    setReturnSubmitting(true);
    setError(null);
    setReturnResult(null);
    try {
      const { salesReturn } = await api.createSalesReturn({
        saleNumber: sale.saleNumber,
        returnDate,
        isCashRefund,
        reason: returnReason.trim(),
        items: itemsToReturn,
      });
      setReturnResult(salesReturn);
      setSale(null);
      setSaleNumberInput('');
      setReturnQty({});
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
      <h2>Retur Penjualan</h2>
      <p style={{ color: '#666', marginTop: -8 }}>
        Pelanggan mengembalikan barang yang sudah dibeli — cari nota dulu, boleh retur sebagian item/qty saja.
      </p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="inline-form">
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="Nomor nota (mis. S1-20260922-...)"
            value={saleNumberInput}
            onChange={(e) => setSaleNumberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupSale()}
          />
          <button className="btn-secondary" onClick={lookupSale} disabled={lookupLoading || !saleNumberInput.trim()}>
            {lookupLoading ? 'Mencari...' : 'Cari Nota'}
          </button>
        </div>

        {sale && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #ddd' }}>
            <p style={{ fontSize: 13 }}>
              Nota <strong>{sale.saleNumber}</strong> — {new Date(sale.createdAt).toLocaleString('id-ID')}
            </p>

            <table>
              <thead>
                <tr>
                  <th>Produk</th><th>Satuan</th><th>Qty Dibeli</th><th>Sudah Diretur</th><th>Sisa Boleh Retur</th><th>Qty Diretur Sekarang</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_name}</td>
                    <td>{it.unit_name}</td>
                    <td>{Number(it.quantity).toLocaleString('id-ID')}</td>
                    <td>{Number(it.already_returned_qty).toLocaleString('id-ID')}</td>
                    <td>{Number(it.returnable_qty).toLocaleString('id-ID')}</td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max={it.returnable_qty}
                        step="any"
                        style={{ width: 90 }}
                        value={returnQty[it.id] || ''}
                        onChange={(e) => setQtyFor(it.id, e.target.value)}
                        disabled={Number(it.returnable_qty) <= 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="inline-form" style={{ marginTop: 12 }}>
              <input className="input" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              <select className="input" value={isCashRefund ? 'cash' : 'bank'} onChange={(e) => setIsCashRefund(e.target.value === 'cash')}>
                <option value="cash">Tunai (refund dari Kas)</option>
                <option value="bank">Non-tunai (refund dari Bank)</option>
              </select>
            </div>
            <div className="inline-form" style={{ marginTop: 8 }}>
              <input className="input" placeholder="Alasan retur (wajib)" style={{ flex: 1, minWidth: 260 }} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            </div>

            <button
              className="btn-primary" style={{ marginTop: 12 }} onClick={submitReturn}
              disabled={returnSubmitting || itemsToReturn.length === 0 || !returnReason.trim()}
            >
              {returnSubmitting ? 'Menyimpan...' : 'Simpan Retur Penjualan'}
            </button>
          </div>
        )}

        {returnResult && (
          <div style={{ marginTop: 16 }}>
            <div className="success-banner">
              Retur {returnResult.returnNumber} tersimpan — nilai jual dikembalikan {rp(returnResult.grandTotal)}, HPP dibalik {rp(returnResult.totalCost)}
            </div>
            {returnResult.journalEntry && <JournalPreview entry={returnResult.journalEntry} accountLabel={accountLabel} />}
            <table style={{ marginTop: 8 }}>
              <thead><tr><th>Produk</th><th>Qty</th><th>Nilai Jual Dikembalikan</th><th>HPP Dibalik</th></tr></thead>
              <tbody>
                {returnResult.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.productName}</td>
                    <td>{Number(it.quantity).toLocaleString('id-ID')}</td>
                    <td>{rp(it.amount)}</td>
                    <td>{rp(it.costAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead><tr><th>No. Retur</th><th>Tanggal</th><th>No. Nota</th><th>Nilai Jual</th><th>HPP</th><th>Refund</th><th>Alasan</th></tr></thead>
          <tbody>
            {salesReturns.map((r) => (
              <tr key={r.id}>
                <td>{r.return_number}</td>
                <td>{new Date(r.return_date).toLocaleDateString('id-ID')}</td>
                <td>{r.sale_number}</td>
                <td>{rp(r.grand_total)}</td>
                <td>{rp(r.total_cost)}</td>
                <td>{r.is_cash_refund ? 'Tunai' : 'Non-tunai'}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
            {salesReturns.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada retur penjualan</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
