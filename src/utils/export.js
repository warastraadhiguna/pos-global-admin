// Export laporan ke Excel (.xlsx) dan PDF — dipakai ReportsScreen &
// TransactionsReportScreen. Semua di sisi browser (tidak ada endpoint server
// baru) karena datanya sudah ada di state React saat laporan dimuat.
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// columns: [{ header, key, width? }], rows: [{ [key]: value }]
export async function exportToExcel(filename, sheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// columns: [{ header, key }], rows: [{ [key]: value }], summaryLines: string[] (opsional, tampil di atas tabel)
export function exportToPdf(filename, title, subtitle, columns, rows, summaryLines = []) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, 14, 22);

  let startY = 28;
  if (summaryLines.length > 0) {
    doc.setTextColor(0);
    doc.setFontSize(10);
    summaryLines.forEach((line, i) => doc.text(line, 14, startY + i * 5));
    startY += summaryLines.length * 5 + 4;
  }

  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => row[c.key])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(filename);
}

function downloadBlob(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
