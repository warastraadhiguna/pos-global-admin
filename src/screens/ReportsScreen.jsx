import { useState } from 'react';
import { api } from '../api.js';

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatRupiah(v) {
  return `Rp${Number(v).toLocaleString('id-ID')}`;
}

export default function ReportsScreen() {
  const [date, setDate] = useState(todayDateString());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadReport(e) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { report: r } = await api.getDailySalesReport(date);
      setReport(r);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Laporan Penjualan Harian</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Read-only. Transaksi yang sudah di-void tidak dihitung.</p>
      {error && <div className="error-banner">{error}</div>}

      <form className="inline-form" onSubmit={loadReport}>
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Memuat...' : 'Muat Laporan'}
        </button>
      </form>

      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Total Omzet</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatRupiah(report.totalOmzet)}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Jumlah Transaksi</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{report.transactionCount}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Total HPP</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatRupiah(report.totalHpp)}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Laba Kotor</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: Number(report.totalGrossProfit) >= 0 ? '#166534' : '#991b1b' }}>
                {formatRupiah(report.totalGrossProfit)}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Rincian per Produk</h3>
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Qty Terjual</th>
                  <th>Subtotal</th>
                  <th>HPP</th>
                  <th>Laba Kotor</th>
                </tr>
              </thead>
              <tbody>
                {report.products.map((p) => (
                  <tr key={p.productId}>
                    <td>{p.productName}</td>
                    <td>{Number(p.qtySoldBase)} {p.baseUnitName}</td>
                    <td>{formatRupiah(p.subtotal)}</td>
                    <td>{formatRupiah(p.totalCost)}</td>
                    <td>{formatRupiah(p.grossProfit)}</td>
                  </tr>
                ))}
                {report.products.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada penjualan pada tanggal ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
