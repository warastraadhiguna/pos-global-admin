import MoneyInput from './MoneyInput.jsx';

// Dipakai utk diskon ITEM maupun diskon TOTAL (Pembelian) — pilih tipe
// (persen/rupiah) + nilainya, sama konsep dgn diskon di Penjualan (kasir).
export default function DiscountInput({ type, value, onTypeChange, onValueChange, style }) {
  return (
    <div style={{ display: 'flex', gap: 6, ...style }}>
      <select className="input" style={{ width: 90 }} value={type || ''} onChange={(e) => onTypeChange(e.target.value || null)}>
        <option value="">Tanpa diskon</option>
        <option value="percent">%</option>
        <option value="rupiah">Rp</option>
      </select>
      {type === 'percent' && (
        <input
          className="input" type="number" min="0" max="100" step="0.01" style={{ width: 90 }}
          placeholder="0-100" value={value} onChange={(e) => onValueChange(e.target.value)}
        />
      )}
      {type === 'rupiah' && (
        <MoneyInput placeholder="Rp" value={value} onChange={onValueChange} style={{ width: 130 }} />
      )}
    </div>
  );
}
