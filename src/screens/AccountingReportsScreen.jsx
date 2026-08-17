import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

const TABS = [
  { key: 'trialBalance', label: 'Neraca Saldo' },
  { key: 'incomeStatement', label: 'Laba Rugi' },
  { key: 'balanceSheet', label: 'Neraca' },
  { key: 'cashFlow', label: 'Arus Kas' },
  { key: 'generalLedger', label: 'Buku Besar' },
  { key: 'ppnSetoran', label: 'PPN Setoran' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// SATU-SATUNYA tempat pembulatan boleh terjadi di layar ini — data dari
// server selalu string desimal presisi penuh (DECIMAL(18,4)). Dibulatkan
// cuma di sini, saat dirender, TIDAK PERNAH sebelum dijumlahkan.
function rp(decimalString) {
  const n = Math.round(Number(decimalString));
  return `Rp${n.toLocaleString('id-ID')}`;
}

// Peringatan mencolok kalau tidak balance — dihitung dari nilai MENTAH
// (presisi penuh dari server), bukan setelah dibulatkan, supaya selisih
// sekecil apa pun tetap kelihatan, tidak hilang gara-gara pembulatan.
function BalanceWarning({ isBalanced, leftLabel, leftRaw, rightLabel, rightRaw }) {
  if (isBalanced) return null;
  const diff = (Number(leftRaw) - Number(rightRaw)).toFixed(4);
  return (
    <div className="error-banner" style={{ fontWeight: 700, border: '2px solid #dc2626', fontSize: 14 }}>
      ⚠️ TIDAK BALANCE — {leftLabel}: {leftRaw} vs {rightLabel}: {rightRaw} (selisih {diff}).
      Ada masalah data yang harus ditelusuri — angka di bawah TETAP ditampilkan apa adanya, tidak dipaksa sama.
    </div>
  );
}

// Bukan error sistem — cuma indikasi akun ini bersaldo berlawanan dari
// normal_balance-nya sendiri (mis. akun aset yang malah bersaldo kredit).
// Biasanya artinya ada saldo awal yang belum dijurnal, atau salah posting.
function AbnormalTag() {
  return (
    <span title="Saldo berlawanan dari normal_balance akun ini — biasanya tanda data belum lengkap (mis. saldo awal belum dijurnal) atau salah posting." style={{ marginLeft: 6, color: '#b45309', fontWeight: 700, fontSize: 12 }}>
      ⚠ abnormal
    </span>
  );
}

export default function AccountingReportsScreen() {
  const [tab, setTab] = useState('trialBalance');
  const [accounts, setAccounts] = useState([]);
  const [taxMode, setTaxMode] = useState('pkp');
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.getStoreSettings().then((d) => setTaxMode(d.settings.tax_mode)).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h2>Laporan Keuangan</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <OpeningInventoryBalancePanel onError={setError} />
      <div className="inline-form" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === tab ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'trialBalance' && <TrialBalanceTab onError={setError} />}
      {tab === 'incomeStatement' && <IncomeStatementTab onError={setError} />}
      {tab === 'balanceSheet' && <BalanceSheetTab onError={setError} />}
      {tab === 'cashFlow' && <CashFlowTab onError={setError} />}
      {tab === 'generalLedger' && <GeneralLedgerTab accounts={accounts} onError={setError} />}
      {tab === 'ppnSetoran' && <PpnSetoranTab taxMode={taxMode} onError={setError} />}
    </div>
  );
}

// Setup sekali-jalan: jurnal saldo awal persediaan (Debit Persediaan, Kredit
// Modal Pemilik) dari stock_balances x avg_cost_per_base_unit yang sudah
// ada. Ditaruh di atas layar laporan supaya begitu Neraca Saldo kelihatan
// abnormal (Persediaan di sisi Kredit), solusinya langsung terlihat di
// layar yang sama.
function OpeningInventoryBalancePanel({ onError }) {
  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  function reload() {
    api.previewInventoryOpeningBalance().then(setPreview).catch((err) => onError(err.message));
  }
  useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setRunning(true);
    onError(null);
    setResult(null);
    try {
      const { journalEntry } = await api.runInventoryOpeningBalance({ entryDate: todayStr() });
      setResult(journalEntry);
      reload();
    } catch (err) {
      onError(err.message);
    } finally {
      setRunning(false);
    }
  }

  if (!preview) return null;
  if (preview.alreadyPosted) return null; // sudah beres, tidak perlu menyita ruang layar
  if (Number(preview.totalValue) <= 0) return null; // stok kosong, tidak ada yg perlu dijurnal

  return (
    <div className="card" style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fbbf24' }}>
      <strong>Setup: Saldo Awal Persediaan belum dijurnal</strong>
      <p style={{ fontSize: 13, color: '#666' }}>
        Nilai persediaan saat ini (qty × avg cost, dari {preview.items.length} produk) = <strong>{rp(preview.totalValue)}</strong>,
        belum pernah dicatat sebagai saldo awal. Ini yang membuat akun Persediaan Barang Dagang tampil di sisi Kredit
        (saldo abnormal) di laporan — karena cuma pernah dikurangi HPP penjualan, tidak pernah diisi saldo awalnya.
        Jurnal ini cuma bisa dijalankan SEKALI: Debit Persediaan Barang Dagang, Kredit Modal Pemilik.
      </p>
      <button className="btn-primary" onClick={run} disabled={running}>
        {running ? 'Memproses...' : 'Jalankan Jurnal Saldo Awal Persediaan'}
      </button>
      {result && (
        <div className="success-banner" style={{ marginTop: 12 }}>
          Berhasil: jurnal {result.entryNumber} — Debit Persediaan {rp(result.lines.find((l) => Number(l.debit) > 0)?.debit || 0)},
          Kredit Modal Pemilik {rp(result.lines.find((l) => Number(l.credit) > 0)?.credit || 0)}.
        </div>
      )}
    </div>
  );
}

function TrialBalanceTab({ onError }) {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [data, setData] = useState(null);

  function load() {
    onError(null);
    api.getTrialBalance(asOfDate).then(setData).catch((err) => onError(err.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="inline-form">
        <label style={{ fontSize: 13 }}>Per tanggal</label>
        <input className="input" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        <button className="btn-primary" onClick={load}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <BalanceWarning isBalanced={data.isBalanced} leftLabel="Total Debit" leftRaw={data.totalDebit} rightLabel="Total Kredit" rightRaw={data.totalCredit} />
          <table>
            <thead><tr><th>Kode</th><th>Akun</th><th>Debit</th><th>Kredit</th></tr></thead>
            <tbody>
              {data.accounts.map((a) => (
                <tr key={a.accountId}>
                  <td>{a.code}</td>
                  <td>{a.name}{a.isAbnormal && <AbnormalTag />}</td>
                  <td>{Number(a.debit) > 0 ? rp(a.debit) : ''}</td>
                  <td>{Number(a.credit) > 0 ? rp(a.credit) : ''}</td>
                </tr>
              ))}
              {data.accounts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Belum ada aktivitas</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                <td colSpan={2}>TOTAL</td>
                <td>{rp(data.totalDebit)}</td>
                <td>{rp(data.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function IncomeStatementTab({ onError }) {
  const [startDate, setStartDate] = useState(firstOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [data, setData] = useState(null);

  function load() {
    onError(null);
    api.getIncomeStatement(startDate, endDate).then(setData).catch((err) => onError(err.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="inline-form">
        <label style={{ fontSize: 13 }}>Dari</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ fontSize: 13 }}>Sampai</label>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-primary" onClick={load}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Pendapatan</h3>
          <table>
            <tbody>
              {data.revenue.map((r) => (
                <tr key={r.accountId}><td>{r.code} {r.name}{r.isAbnormal && <AbnormalTag />}</td><td style={{ textAlign: 'right' }}>{rp(r.amount)}</td></tr>
              ))}
              {data.revenue.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999' }}>Tidak ada pendapatan periode ini</td></tr>}
              <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}><td>Total Pendapatan</td><td style={{ textAlign: 'right' }}>{rp(data.totalRevenue)}</td></tr>
            </tbody>
          </table>

          <h3>Beban</h3>
          <table>
            <tbody>
              {data.expense.map((r) => (
                <tr key={r.accountId}><td>{r.code} {r.name}{r.isAbnormal && <AbnormalTag />}</td><td style={{ textAlign: 'right' }}>{rp(r.amount)}</td></tr>
              ))}
              {data.expense.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999' }}>Tidak ada beban periode ini</td></tr>}
              <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}><td>Total Beban</td><td style={{ textAlign: 'right' }}>{rp(data.totalExpense)}</td></tr>
            </tbody>
          </table>

          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 16, paddingTop: 12, borderTop: '2px solid #333' }}>
            {Number(data.netIncome) >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}: {rp(data.netIncome)}
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceSheetTab({ onError }) {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [data, setData] = useState(null);

  function load() {
    onError(null);
    api.getBalanceSheet(asOfDate).then(setData).catch((err) => onError(err.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="inline-form">
        <label style={{ fontSize: 13 }}>Per tanggal</label>
        <input className="input" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        <button className="btn-primary" onClick={load}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <BalanceWarning
            isBalanced={data.isBalanced}
            leftLabel="Total Aset" leftRaw={data.totalAssets}
            rightLabel="Total Kewajiban + Modal" rightRaw={data.totalLiabilitiesAndEquity}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Aset</h3>
              <table>
                <tbody>
                  {data.assets.map((a) => <tr key={a.accountId}><td>{a.code} {a.name}{a.isAbnormal && <AbnormalTag />}</td><td style={{ textAlign: 'right' }}>{rp(a.amount)}</td></tr>)}
                  <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}><td>Total Aset</td><td style={{ textAlign: 'right' }}>{rp(data.totalAssets)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>Kewajiban</h3>
              <table>
                <tbody>
                  {data.liabilities.map((a) => <tr key={a.accountId}><td>{a.code} {a.name}{a.isAbnormal && <AbnormalTag />}</td><td style={{ textAlign: 'right' }}>{rp(a.amount)}</td></tr>)}
                  {data.liabilities.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999' }}>Tidak ada</td></tr>}
                  <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}><td>Total Kewajiban</td><td style={{ textAlign: 'right' }}>{rp(data.totalLiabilities)}</td></tr>
                </tbody>
              </table>

              <h3>Modal</h3>
              <table>
                <tbody>
                  {data.equity.map((a) => <tr key={a.accountId}><td>{a.code} {a.name}{a.isAbnormal && <AbnormalTag />}</td><td style={{ textAlign: 'right' }}>{rp(a.amount)}</td></tr>)}
                  <tr><td>Laba (Rugi) Berjalan</td><td style={{ textAlign: 'right' }}>{rp(data.currentPeriodNetIncome)}</td></tr>
                  <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}><td>Total Modal</td><td style={{ textAlign: 'right' }}>{rp((Number(data.totalEquity) + Number(data.currentPeriodNetIncome)).toFixed(4))}</td></tr>
                </tbody>
              </table>

              <div style={{ fontWeight: 700, marginTop: 12, paddingTop: 8, borderTop: '2px solid #333' }}>
                Total Kewajiban + Modal: {rp(data.totalLiabilitiesAndEquity)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CashFlowTab({ onError }) {
  const [startDate, setStartDate] = useState(firstOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [data, setData] = useState(null);

  function load() {
    onError(null);
    api.getCashFlow(startDate, endDate).then(setData).catch((err) => onError(err.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="inline-form">
        <label style={{ fontSize: 13 }}>Dari</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ fontSize: 13 }}>Sampai</label>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-primary" onClick={load}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
            Metode langsung — mutasi akun Kas & Bank saja (tanpa klasifikasi operasi/investasi/pendanaan).
          </p>
          <div>Saldo Awal: <strong>{rp(data.openingBalance)}</strong></div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Tanggal</th><th>Akun</th><th>Keterangan</th><th>Masuk</th><th>Keluar</th></tr></thead>
            <tbody>
              {data.movements.map((m, i) => (
                <tr key={i}>
                  <td>{new Date(m.entryDate).toLocaleDateString('id-ID')}</td>
                  <td>{m.accountCode}</td>
                  <td>{m.description}{m.status === 'reversed' && <span className="badge inactive" style={{ marginLeft: 6 }}>dibalik</span>}</td>
                  <td>{Number(m.cashIn) > 0 ? rp(m.cashIn) : ''}</td>
                  <td>{Number(m.cashOut) > 0 ? rp(m.cashOut) : ''}</td>
                </tr>
              ))}
              {data.movements.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Tidak ada mutasi kas periode ini</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}>
                <td colSpan={3}>Total</td><td>{rp(data.totalIn)}</td><td>{rp(data.totalOut)}</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ marginTop: 12, fontSize: 15 }}>
            Perubahan bersih: <strong>{rp(data.netChange)}</strong> &nbsp;|&nbsp; Saldo Akhir: <strong>{rp(data.closingBalance)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneralLedgerTab({ accounts, onError }) {
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(firstOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [data, setData] = useState(null);

  const postableAccounts = accounts.filter((a) => a.is_postable);

  function load() {
    if (!accountId) return;
    onError(null);
    api.getGeneralLedger(accountId, startDate, endDate).then(setData).catch((err) => onError(err.message));
  }

  return (
    <div>
      <div className="inline-form">
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">-- Pilih Akun --</option>
          {postableAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
        </select>
        <label style={{ fontSize: 13 }}>Dari</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ fontSize: 13 }}>Sampai</label>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-primary" onClick={load} disabled={!accountId}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>{data.account.code} {data.account.name}</h3>
          <div>Saldo Awal ({startDate}): <strong>{rp(data.openingBalance)}</strong></div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Keterangan</th><th>Debit</th><th>Kredit</th><th>Saldo</th></tr></thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i}>
                  <td>{new Date(l.entryDate).toLocaleDateString('id-ID')}</td>
                  <td>{l.entryNumber}</td>
                  <td>{l.description}{l.status === 'reversed' && <span className="badge inactive" style={{ marginLeft: 6 }}>dibalik</span>}</td>
                  <td>{Number(l.debit) > 0 ? rp(l.debit) : ''}</td>
                  <td>{Number(l.credit) > 0 ? rp(l.credit) : ''}</td>
                  <td>{rp(l.runningBalance)}</td>
                </tr>
              ))}
              {data.lines.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 16 }}>Tidak ada mutasi periode ini</td></tr>}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontWeight: 700 }}>Saldo Akhir: {rp(data.closingBalance)}</div>
        </div>
      )}
    </div>
  );
}

// PPN Setoran — bandingkan PPN Keluaran (akun 2-104) vs PPN Masukan (1-502)
// dalam satu periode. Cuma relevan mode PKP (di non-PKP tidak ada PPN
// Masukan sama sekali, dan penjualan tidak kena PPN Keluaran — laporan ini
// jadi tidak bermakna, bukan cuma "kosong").
function PpnSetoranTab({ taxMode, onError }) {
  const [startDate, setStartDate] = useState(firstOfMonthStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [data, setData] = useState(null);

  function load() {
    onError(null);
    api.getPpnSetoranReport(startDate, endDate).then(setData).catch((err) => onError(err.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (taxMode !== 'pkp') {
    return (
      <div className="card" style={{ marginTop: 12, color: '#666' }}>
        Toko sedang mode <strong>Non-PKP</strong> — tidak ada PPN Keluaran di penjualan maupun PPN Masukan
        terpisah di pembelian (PPN melebur ke HPP), jadi laporan setoran PPN tidak relevan. Ganti mode pajak
        di halaman Pengaturan Toko kalau toko sudah/kembali jadi PKP.
      </div>
    );
  }

  return (
    <div>
      <div className="inline-form">
        <label style={{ fontSize: 13 }}>Dari</label>
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <label style={{ fontSize: 13 }}>Sampai</label>
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn-primary" onClick={load}>Tampilkan</button>
      </div>
      {data && (
        <div className="card" style={{ marginTop: 12, maxWidth: 480 }}>
          <table>
            <tbody>
              <tr><td>PPN Keluaran (2-104)</td><td style={{ textAlign: 'right' }}>{rp(data.ppnKeluaran)}</td></tr>
              <tr><td>PPN Masukan (1-502)</td><td style={{ textAlign: 'right' }}>-{rp(data.ppnMasukan)}</td></tr>
              <tr style={{ fontWeight: 700, borderTop: '1px solid #ccc' }}>
                <td>Selisih</td><td style={{ textAlign: 'right' }}>{rp(data.selisih)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, fontWeight: 700, textAlign: 'center', fontSize: 15, ...(data.status === 'kurang_bayar' ? { background: '#fee2e2', color: '#991b1b' } : data.status === 'lebih_bayar' ? { background: '#dbeafe', color: '#1e40af' } : { background: '#f3f4f6', color: '#374151' }) }}>
            {data.status === 'kurang_bayar' && <>KURANG BAYAR — setor {rp(data.setorAmount)} ke negara</>}
            {data.status === 'lebih_bayar' && <>LEBIH BAYAR — bisa dikompensasi {rp(data.kompensasiAmount)} ke periode berikutnya</>}
            {data.status === 'nihil' && <>NIHIL — PPN Keluaran = PPN Masukan</>}
          </div>
        </div>
      )}
    </div>
  );
}
