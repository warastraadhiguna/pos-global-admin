import { useEffect, useState } from 'react';
import { api } from '../api.js';
import JournalPreview from '../components/JournalPreview.jsx';
import Banner from '../components/Banner.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyExpenseForm = { entryDate: todayStr(), accountId: '', amount: '', description: '', paymentType: 'cash' };
const emptyDrawForm = { entryDate: todayStr(), amount: '', description: '' };

export default function ExpensesScreen() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [expenseResult, setExpenseResult] = useState(null);

  const [drawForm, setDrawForm] = useState(emptyDrawForm);
  const [drawResult, setDrawResult] = useState(null);

  useEffect(() => {
    api.listAccountingAccounts().then((d) => setAccounts(d.accounts)).catch((err) => setError(err.message));
  }, []);

  const expenseAccounts = accounts.filter((a) => a.category === 'expense' && a.is_postable);

  function accountLabel(id) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} ${a.name}` : id;
  }

  async function submitExpense(e) {
    e.preventDefault();
    setError(null);
    setExpenseResult(null);
    try {
      const { journalEntry } = await api.postExpense({
        entryDate: expenseForm.entryDate,
        accountId: expenseForm.accountId,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        paymentType: expenseForm.paymentType,
      });
      setExpenseResult(journalEntry);
      setExpenseForm(emptyExpenseForm);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitDraw(e) {
    e.preventDefault();
    setError(null);
    setDrawResult(null);
    try {
      const { journalEntry } = await api.postOwnerDraw({
        entryDate: drawForm.entryDate,
        amount: Number(drawForm.amount),
        description: drawForm.description,
      });
      setDrawResult(journalEntry);
      setDrawForm(emptyDrawForm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Beban & Prive</h2>
      <Banner type="error" message={error} onClose={() => setError(null)} />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Beban Operasional</h3>
        <p style={{ color: '#666', marginTop: -8, fontSize: 13 }}>
          Setiap beban dijurnal: Debit akun beban yang dipilih, Kredit Kas (kalau dibayar tunai) atau Utang Usaha
          (kalau belum dibayar / kredit).
        </p>
        <form onSubmit={submitExpense}>
          <div className="inline-form">
            <input
              className="input" type="date" value={expenseForm.entryDate}
              onChange={(e) => setExpenseForm({ ...expenseForm, entryDate: e.target.value })} required
            />
            <select
              className="input" value={expenseForm.accountId}
              onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })} required
            >
              <option value="">-- Akun Beban --</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} {a.name}</option>
              ))}
            </select>
            <input
              className="input" type="number" min="1" placeholder="Jumlah (Rp)" value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required
            />
            <select
              className="input" value={expenseForm.paymentType}
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentType: e.target.value })}
            >
              <option value="cash">Tunai (Kas)</option>
              <option value="credit">Kredit (Utang)</option>
            </select>
          </div>
          <div className="inline-form">
            <input
              className="input" placeholder="Deskripsi (mis. Bayar listrik Juli)" style={{ flex: 1, minWidth: 260 }}
              value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required
            />
            <button className="btn-primary" type="submit">Simpan & Jurnal</button>
          </div>
        </form>
        <JournalPreview entry={expenseResult} accountLabel={accountLabel} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Prive Pemilik</h3>
        <p style={{ color: '#666', marginTop: -8, fontSize: 13 }}>
          Pengambilan kas pribadi pemilik dari usaha. Dijurnal: Debit Prive Pemilik, Kredit Kas.
        </p>
        <form onSubmit={submitDraw}>
          <div className="inline-form">
            <input
              className="input" type="date" value={drawForm.entryDate}
              onChange={(e) => setDrawForm({ ...drawForm, entryDate: e.target.value })} required
            />
            <input
              className="input" type="number" min="1" placeholder="Jumlah (Rp)" value={drawForm.amount}
              onChange={(e) => setDrawForm({ ...drawForm, amount: e.target.value })} required
            />
            <input
              className="input" placeholder="Deskripsi (opsional)" style={{ flex: 1, minWidth: 220 }}
              value={drawForm.description} onChange={(e) => setDrawForm({ ...drawForm, description: e.target.value })}
            />
            <button className="btn-primary" type="submit">Simpan & Jurnal</button>
          </div>
        </form>
        <JournalPreview entry={drawResult} accountLabel={accountLabel} />
      </div>
    </div>
  );
}
