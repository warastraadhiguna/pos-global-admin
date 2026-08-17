import { useState } from 'react';
import { api } from '../api.js';
import { exportToExcel, exportToPdf } from '../utils/export.js';
import Banner from '../components/Banner.jsx';

const TX_COLUMNS = [
  { header: 'No. Nota', key: 'saleNumber', width: 24 },
  { header: 'Tanggal', key: 'createdAt', width: 20 },
  { header: 'Kasir', key: 'cashierName', width: 18 },
  { header: 'Metode', key: 'paymentMethodName', width: 14 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Total', key: 'grandTotal', width: 16 },
];

const DETAIL_COLUMNS = [
  { header: 'Produk', key: 'productName', width: 30 },
  { header: 'Qty', key: 'qty', width: 10 },
  { header: 'Harga', key: 'sellingPrice', width: 16 },
  { header: 'Diskon', key: 'discountAmount', width: 16 },
  { header: 'Subtotal', key: 'subtotal', width: 16 },
];

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatRupiah(v) {
  return `Rp${Number(v).toLocaleString('id-ID')}`;
}

function formatDateTime(v) {
  return new Date(v).toLocaleString('id-ID');
}

export default function TransactionsReportScreen() {
  const [startDate, setStartDate] = useState(todayDateString());
  const [endDate, setEndDate] = useState(todayDateString());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  async function loadReport(e) {
    e?.preventDefault();
    if (endDate < startDate) {
      setError('Tanggal akhir tidak boleh sebelum tanggal awal');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { report: r } = await api.getTransactionsReport(startDate, endDate);
      setReport(r);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function openDetail(saleId) {
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    api.getSaleDetail(saleId)
      .then((data) => setDetail(data.sale))
      .catch((err) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }

  function closeDetail() {
    setDetail(null);
    setDetailError(null);
  }

  function buildTxRows() {
    return report.transactions.map((t) => ({
      saleNumber: t.saleNumber,
      createdAt: formatDateTime(t.createdAt),
      cashierName: t.cashierName,
      paymentMethodName: t.paymentMethodName,
      status: t.status === 'voided' ? 'Void' : 'Selesai',
      grandTotal: formatRupiah(t.grandTotal),
    }));
  }

  function handleExportExcel() {
    exportToExcel(
      `laporan-transaksi_${startDate}_${endDate}.xlsx`,
      'Laporan Transaksi',
      TX_COLUMNS,
      buildTxRows()
    );
  }

  function handleExportPdf() {
    exportToPdf(
      `laporan-transaksi_${startDate}_${endDate}.pdf`,
      'Laporan Transaksi',
      `Periode ${startDate} s/d ${endDate}`,
      TX_COLUMNS,
      buildTxRows(),
      [
        `Jumlah Transaksi: ${report.transactionCount} (${report.voidedCount} void)`,
        `Total Omzet: ${formatRupiah(report.totalOmzet)}`,
      ]
    );
  }

  function buildDetailRows() {
    return detail.items.map((item) => ({
      productName: item.productName,
      qty: Number(item.quantity),
      sellingPrice: formatRupiah(item.sellingPrice),
      discountAmount: formatRupiah(item.discountAmount),
      subtotal: formatRupiah(item.subtotal),
    }));
  }

  function handleExportDetailExcel() {
    exportToExcel(
      `nota-${detail.saleNumber}.xlsx`,
      'Detail Nota',
      DETAIL_COLUMNS,
      buildDetailRows()
    );
  }

  function handleExportDetailPdf() {
    exportToPdf(
      `nota-${detail.saleNumber}.pdf`,
      `Detail Nota ${detail.saleNumber}`,
      `${formatDateTime(detail.createdAt)}${detail.voided ? ' — VOID' : ''}`,
      DETAIL_COLUMNS,
      buildDetailRows(),
      [
        `Subtotal: ${formatRupiah(detail.subtotal)}`,
        `Diskon: ${formatRupiah(detail.discountTotal)}`,
        `Total: ${formatRupiah(detail.grandTotal)}`,
        `Metode: ${detail.paymentMethodName}`,
      ]
    );
  }

  return (
    <div>
      <h2>Laporan Transaksi</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Read-only. Daftar semua nota (termasuk yang di-void) pada rentang tanggal.</p>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <form className="inline-form" onSubmit={loadReport}>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span style={{ color: '#666' }}>s/d</span>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Memuat...' : 'Muat Laporan'}
        </button>
      </form>

      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Jumlah Transaksi</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{report.transactionCount}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Void</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: report.voidedCount > 0 ? '#991b1b' : undefined }}>
                {report.voidedCount}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Total Omzet</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatRupiah(report.totalOmzet)}</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0 }}>Daftar Nota</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" onClick={handleExportExcel}>Export Excel</button>
                <button type="button" className="btn-secondary" onClick={handleExportPdf}>Export PDF</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>No. Nota</th>
                  <th>Tanggal</th>
                  <th>Kasir</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {report.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.saleNumber}</td>
                    <td>{formatDateTime(t.createdAt)}</td>
                    <td>{t.cashierName}</td>
                    <td>{t.paymentMethodName}</td>
                    <td>
                      {t.status === 'voided'
                        ? <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Void</span>
                        : <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>Selesai</span>}
                    </td>
                    <td>{formatRupiah(t.grandTotal)}</td>
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => openDetail(t.id)}>Lihat Detail</button>
                    </td>
                  </tr>
                ))}
                {report.transactions.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Tidak ada transaksi pada rentang tanggal ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(detailLoading || detail || detailError) && (
        <div className="modal-overlay">
          <div className="card" style={{ width: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <button type="button" className="modal-close-btn" onClick={closeDetail} title="Tutup">✕</button>
            <h3 style={{ marginTop: 0 }}>Detail Nota</h3>
            {detailLoading && <p style={{ color: '#999' }}>Memuat detail...</p>}
            <Banner type="error" message={detailError} onClose={() => setDetailError(null)} />
            {!detailLoading && detail && (
              <>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {detail.saleNumber}{detail.voided && <span style={{ color: '#991b1b' }}> (VOID)</span>}
                  </div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{formatDateTime(detail.createdAt)}</div>
                  {detail.voided && detail.voidReason && (
                    <p style={{ fontSize: 12, color: '#991b1b' }}>Alasan void: {detail.voidReason}</p>
                  )}
                  <table>
                    <thead>
                      <tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.productName}</td>
                          <td>{Number(item.quantity)}</td>
                          <td>{formatRupiah(item.sellingPrice)}</td>
                          <td>{formatRupiah(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 12, borderTop: '1px dashed #ccc', paddingTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{formatRupiah(detail.subtotal)}</strong></div>
                    {Number(detail.discountTotal) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Diskon</span><strong>-{formatRupiah(detail.discountTotal)}</strong></div>
                    )}
                    {detail.ppnEnabled && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{detail.ppnMode === 'exclude' ? `PPN (${Number(detail.ppnRate)}%)` : `Termasuk PPN (${Number(detail.ppnRate)}%)`}</span>
                        <strong>{formatRupiah(detail.ppnAmount)}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><strong>{formatRupiah(detail.grandTotal)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Metode</span><strong>{detail.paymentMethodName}</strong></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleExportDetailExcel}>Export Excel</button>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={handleExportDetailPdf}>Export PDF</button>
                </div>
              </>
            )}
            <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={closeDetail}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
