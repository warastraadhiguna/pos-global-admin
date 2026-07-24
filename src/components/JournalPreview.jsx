// Menampilkan hasil satu journal entry (baris debit/kredit) langsung setelah
// input beban/prive/aset tetap disimpan — supaya operator langsung lihat
// jurnal apa yang benar-benar terbentuk, bukan cuma "berhasil disimpan".
export default function JournalPreview({ entry, accountLabel }) {
  if (!entry) return null;
  return (
    <div className="card" style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #86efac' }}>
      <div style={{ fontSize: 13, color: '#166534', fontWeight: 600, marginBottom: 4 }}>
        Jurnal tersimpan: {entry.entryNumber}
      </div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{entry.description}</div>
      <table>
        <thead><tr><th>Akun</th><th>Debit</th><th>Kredit</th></tr></thead>
        <tbody>
          {entry.lines.map((l, i) => (
            <tr key={i}>
              <td>{accountLabel(l.accountId)}</td>
              <td>{Number(l.debit) > 0 ? `Rp${Number(l.debit).toLocaleString('id-ID')}` : ''}</td>
              <td>{Number(l.credit) > 0 ? `Rp${Number(l.credit).toLocaleString('id-ID')}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
