import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  name: '', assetAccountId: '', accumulatedDepreciationAccountId: '', depreciationExpenseAccountId: '',
  acquisitionDate: todayStr(), acquisitionCost: '', residualValue: '0', usefulLifeMonths: '', paymentType: 'cash',
};

export default function FixedAssetsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [createResult, setCreateResult] = useState(null);

  const now = new Date();
  const [depForm, setDepForm] = useState({ periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1 });
  const [depResult, setDepResult] = useState(null);
  const [depLoading, setDepLoading] = useState(false);

  function reload() {
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
    api.listFixedAssets().then((d) => setFixedAssets(d.fixedAssets)).catch((err) => setError(err.message));
  }
  useEffect(reload, []);

  const assetAccounts = accounts.filter((a) => a.category === 'asset' && a.is_postable);
  const expenseAccounts = accounts.filter((a) => a.category === 'expense' && a.is_postable);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  async function submitCreate(e) {
    e.preventDefault();
    setError(null);
    setCreateResult(null);
    try {
      const result = await api.createFixedAsset({
        ...form,
        acquisitionCost: Number(form.acquisitionCost),
        residualValue: Number(form.residualValue || 0),
        usefulLifeMonths: Number(form.usefulLifeMonths),
      });
      setCreateResult(result.journalEntry);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitDepreciation(e) {
    e.preventDefault();
    setError(null);
    setDepResult(null);
    setDepLoading(true);
    try {
      const result = await api.runDepreciation({
        periodYear: Number(depForm.periodYear),
        periodMonth: Number(depForm.periodMonth),
      });
      setDepResult(result);
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setDepLoading(false);
    }
  }

  return (
    <div>
      <h2>Aset Tetap & Depresiasi</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Tambah Aset Tetap</h3>
        <p style={{ color: '#666', marginTop: -8, fontSize: 13 }}>
          Menyimpan data aset (tanggal & harga perolehan, nilai residu, masa manfaat) sekaligus jurnal perolehan:
          Debit akun aset, Kredit Kas (tunai) atau Utang Usaha (kredit).
        </p>
        <form onSubmit={submitCreate}>
          <div className="inline-form">
            <input
              className="input" placeholder="Nama aset (mis. Kulkas Display)" style={{ flex: 1, minWidth: 220 }}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
            />
            <input
              className="input" type="date" value={form.acquisitionDate}
              onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} required
            />
            <input
              className="input" type="number" min="1" placeholder="Harga perolehan (Rp)" value={form.acquisitionCost}
              onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} required
            />
            <input
              className="input" type="number" min="0" placeholder="Nilai residu (Rp)" value={form.residualValue}
              onChange={(e) => setForm({ ...form, residualValue: e.target.value })}
            />
            <input
              className="input" type="number" min="1" placeholder="Masa manfaat (bulan)" value={form.usefulLifeMonths}
              onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} required
            />
          </div>
          <div className="inline-form">
            <select
              className="input" value={form.assetAccountId}
              onChange={(e) => setForm({ ...form, assetAccountId: e.target.value })} required
            >
              <option value="">-- Akun Aset --</option>
              {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <select
              className="input" value={form.accumulatedDepreciationAccountId}
              onChange={(e) => setForm({ ...form, accumulatedDepreciationAccountId: e.target.value })} required
            >
              <option value="">-- Akun Akumulasi Penyusutan --</option>
              {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <select
              className="input" value={form.depreciationExpenseAccountId}
              onChange={(e) => setForm({ ...form, depreciationExpenseAccountId: e.target.value })} required
            >
              <option value="">-- Akun Beban Penyusutan --</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
            <select
              className="input" value={form.paymentType}
              onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
            >
              <option value="cash">Tunai</option>
              <option value="credit">Kredit (Utang)</option>
            </select>
            <button className="btn-primary" type="submit">Simpan & Jurnal</button>
          </div>
        </form>
        <JournalPreview entry={createResult} accountLabel={accountLabel} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Jalankan Depresiasi Bulanan</h3>
        <p style={{ color: '#666', marginTop: -8, fontSize: 13 }}>
          Proses manual per periode — TIDAK berjalan otomatis. Aman diklik berkali-kali: aset yang periode ini sudah
          pernah dijurnal otomatis dilewati, tidak akan menghasilkan jurnal kedua.
        </p>
        <form onSubmit={submitDepreciation} className="inline-form">
          <input
            className="input" type="number" style={{ width: 100 }} value={depForm.periodYear}
            onChange={(e) => setDepForm({ ...depForm, periodYear: e.target.value })}
          />
          <select
            className="input" value={depForm.periodMonth}
            onChange={(e) => setDepForm({ ...depForm, periodMonth: e.target.value })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn-primary" type="submit" disabled={depLoading}>
            {depLoading ? 'Memproses...' : 'Jalankan Depresiasi'}
          </button>
        </form>
        {depResult && (
          <div style={{ marginTop: 12 }}>
            <div className="success-banner">
              Periode {depResult.periodMonth}/{depResult.periodYear} — diposting: {depResult.processed.length} aset, dilewati: {depResult.skipped.length} aset.
            </div>
            {depResult.processed.map((p) => (
              <div key={p.id} style={{ fontSize: 13, marginBottom: 4 }}>
                ✅ {p.assetName}: Rp{Number(p.amount).toLocaleString('id-ID')} — jurnal {p.journalEntry.entryNumber}
              </div>
            ))}
            {depResult.skipped.map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: '#999' }}>
                ⏭️ {s.assetName}: dilewati — {s.message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Daftar Aset Tetap</h3>
        <table>
          <thead>
            <tr>
              <th>Nama</th><th>Tgl Perolehan</th><th>Harga Perolehan</th><th>Akum. Penyusutan</th><th>Nilai Buku</th><th>Masa Manfaat</th>
            </tr>
          </thead>
          <tbody>
            {fixedAssets.map((fa) => (
              <tr key={fa.id}>
                <td>{fa.name}</td>
                <td>{new Date(fa.acquisition_date).toLocaleDateString('id-ID')}</td>
                <td>Rp{Number(fa.acquisition_cost).toLocaleString('id-ID')}</td>
                <td>Rp{Number(fa.accumulated_depreciation).toLocaleString('id-ID')}</td>
                <td>Rp{(Number(fa.acquisition_cost) - Number(fa.accumulated_depreciation)).toLocaleString('id-ID')}</td>
                <td>{fa.useful_life_months} bulan</td>
              </tr>
            ))}
            {fixedAssets.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada aset tetap</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
