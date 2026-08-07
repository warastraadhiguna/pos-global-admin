import { useState } from 'react';
import { api } from '../api.js';
import { exportToExcel, exportToPdf } from '../utils/export.js';

const PRODUCT_COLUMNS = [
  { header: 'Produk', key: 'productName', width: 30 },
  { header: 'Qty Terjual', key: 'qty', width: 14 },
  { header: 'Subtotal', key: 'subtotal', width: 16 },
  { header: 'HPP', key: 'totalCost', width: 16 },
  { header: 'Laba Kotor', key: 'grossProfit', width: 16 },
];

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatRupiah(v) {
  return `Rp${Number(v).toLocaleString('id-ID')}`;
}

export default function ReportsScreen() {
  const [startDate, setStartDate] = useState(todayDateString());
  const [endDate, setEndDate] = useState(todayDateString());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function buildRows() {
    return report.products.map((p) => ({
      productName: p.productName,
      qty: `${Number(p.qtySoldBase)} ${p.baseUnitName}`,
      subtotal: formatRupiah(p.subtotal),
      totalCost: formatRupiah(p.totalCost),
      grossProfit: formatRupiah(p.grossProfit),
    }));
  }

  function handleExportExcel() {
    exportToExcel(
      `laporan-penjualan_${startDate}_${endDate}.xlsx`,
      'Laporan Penjualan',
      PRODUCT_COLUMNS,
      buildRows()
    );
  }

  function handleExportPdf() {
    exportToPdf(
      `laporan-penjualan_${startDate}_${endDate}.pdf`,
      'Laporan Penjualan',
      `Periode ${startDate} s/d ${endDate}`,
      PRODUCT_COLUMNS,
      buildRows(),
      [
        `Total Omzet: ${formatRupiah(report.totalOmzet)}`,
        `Jumlah Transaksi: ${report.transactionCount}`,
        `Total HPP: ${formatRupiah(report.totalHpp)}`,
        `Laba Kotor: ${formatRupiah(report.totalGrossProfit)}`,
      ]
    );
  }

  async function loadReport(e) {
    e?.preventDefault();
    if (endDate < startDate) {
      setError('Tanggal akhir tidak boleh sebelum tanggal awal');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { report: r } = await api.getDailySalesReport(startDate, endDate);
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
      <h2>Laporan Penjualan</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Read-only. Transaksi yang sudah di-void tidak dihitung.</p>
      {error && <div className="error-banner">{error}</div>}

      <form className="inline-form" onSubmit={loadReport}>
        <input
          className="input"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <span style={{ color: '#666' }}>s/d</span>
        <input
          className="input"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0 }}>Rincian per Produk</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" onClick={handleExportExcel}>Export Excel</button>
                <button type="button" className="btn-secondary" onClick={handleExportPdf}>Export PDF</button>
              </div>
            </div>
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
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada penjualan pada rentang tanggal ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
