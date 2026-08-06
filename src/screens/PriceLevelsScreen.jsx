import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function PriceLevelsScreen() {
  const [priceLevels, setPriceLevels] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [markupDrafts, setMarkupDrafts] = useState({}); // { [priceLevelId]: string }
  const [ppnDraftEnabled, setPpnDraftEnabled] = useState(false);
  const [ppnDraftRate, setPpnDraftRate] = useState('');
  const [ppnDraftMode, setPpnDraftMode] = useState('exclude');

  function reload() {
    api.listPriceLevels().then((d) => {
      setPriceLevels(d.priceLevels);
      setMarkupDrafts((prev) => {
        const next = { ...prev };
        for (const pl of d.priceLevels) {
          if (next[pl.id] === undefined) {
            next[pl.id] = pl.markup_percent === null ? '' : String(pl.markup_percent);
          }
        }
        return next;
      });
    }).catch((err) => setError(err.message));
    api.getPricingSettings().then((d) => {
      setSettings(d.settings);
      setPpnDraftEnabled(!!d.settings.ppn_enabled);
      setPpnDraftRate(d.settings.ppn_rate === null ? '' : String(d.settings.ppn_rate));
      setPpnDraftMode(d.settings.ppn_mode || 'exclude');
    }).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
  }

  async function submitCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createPriceLevel({ name: newName.trim() });
      setNewName('');
      setError(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleAutoPricing() {
    try {
      const d = await api.updatePricingSettings({ autoPricingEnabled: !settings.auto_pricing_enabled });
      setSettings(d.settings);
      setError(null);
      flash(d.settings.auto_pricing_enabled ? 'Markup otomatis diaktifkan' : 'Markup otomatis dimatikan');
    } catch (err) {
      setError(err.message);
    }
  }

  // PPN (Batch 3C) — disimpan sbg SATU aksi (enabled+rate+mode sekaligus),
  // bukan toggle instan seperti markup otomatis — supaya tidak pernah
  // mencoba menyalakan PPN dgn tarif/mode kosong (server menolak itu).
  async function savePpnSettings(e) {
    e.preventDefault();
    if (ppnDraftEnabled) {
      const rateNum = Number(ppnDraftRate);
      if (ppnDraftRate === '' || !Number.isFinite(rateNum) || rateNum < 0) {
        setError('Tarif PPN wajib diisi (>= 0) sebelum PPN diaktifkan');
        return;
      }
    }
    try {
      const d = await api.updatePricingSettings({
        ppnEnabled: ppnDraftEnabled,
        ppnRate: ppnDraftRate === '' ? null : Number(ppnDraftRate),
        ppnMode: ppnDraftMode,
      });
      setSettings(d.settings);
      setError(null);
      flash(d.settings.ppn_enabled ? `PPN diaktifkan: ${d.settings.ppn_rate}% (${d.settings.ppn_mode === 'exclude' ? 'exclude' : 'included'})` : 'PPN dimatikan');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveMarkup(priceLevelId) {
    const raw = markupDrafts[priceLevelId];
    const markupPercent = raw === '' ? null : Number(raw);
    if (markupPercent !== null && (!Number.isFinite(markupPercent) || markupPercent < 0)) {
      setError('Markup% harus angka >= 0 (kosongkan untuk melewati level ini dari markup otomatis)');
      return;
    }
    try {
      await api.updatePriceLevel(priceLevelId, { markupPercent });
      setError(null);
      flash('Markup% disimpan');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Level Harga</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Mis. ecer, grosir. Tier harga per produk diatur di halaman Produk.</p>
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Markup Harga Otomatis</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          Kalau ON: setiap kali HPP rata-rata produk berubah (pembelian, void pembelian, opname), harga jual
          semua level di bawah dihitung ulang otomatis = HPP baru + markup% level itu. Harga jual tidak pernah
          dibuat di bawah HPP, dan baris harga yang dikunci (di halaman Produk) tidak ikut disentuh.
        </p>
        {settings && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={!!settings.auto_pricing_enabled} onChange={toggleAutoPricing} />
            Markup otomatis: {settings.auto_pricing_enabled ? 'ON' : 'OFF'}
          </label>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>PPN (Pajak Pertambahan Nilai)</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          PPN dihitung SETELAH diskon (dari nilai nota yang sudah dikurangi diskon item & diskon total).
          Mode <strong>exclude</strong>: PPN ditambahkan di atas nilai setelah diskon (total bertambah).
          Mode <strong>included</strong>: harga sudah termasuk PPN, PPN cuma dipisahkan utk ditampilkan &
          dijurnal (total tidak berubah).
        </p>
        {settings && (
          <form onSubmit={savePpnSettings}>
            <div className="inline-form" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={ppnDraftEnabled} onChange={(e) => setPpnDraftEnabled(e.target.checked)} />
                PPN Aktif
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Tarif % (mis. 11)"
                value={ppnDraftRate}
                onChange={(e) => setPpnDraftRate(e.target.value)}
                style={{ width: 140 }}
              />
              <select className="input" value={ppnDraftMode} onChange={(e) => setPpnDraftMode(e.target.value)}>
                <option value="exclude">Exclude (ditambahkan)</option>
                <option value="included">Included (sudah termasuk)</option>
              </select>
              <button className="btn-primary" type="submit">Simpan Pengaturan PPN</button>
            </div>
            {settings.ppn_enabled === 1 && (
              <p style={{ fontSize: 12, color: '#166534', marginTop: 8 }}>
                Status saat ini: AKTIF — {Number(settings.ppn_rate)}% ({settings.ppn_mode === 'exclude' ? 'exclude' : 'included'})
              </p>
            )}
          </form>
        )}
      </div>

      <form className="inline-form" onSubmit={submitCreate}>
        <input className="input" placeholder="Nama level baru" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary" type="submit">Tambah</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama</th><th>Markup% (auto)</th><th></th></tr></thead>
          <tbody>
            {priceLevels.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="(belum diatur)"
                    value={markupDrafts[p.id] ?? ''}
                    onChange={(e) => setMarkupDrafts({ ...markupDrafts, [p.id]: e.target.value })}
                    style={{ width: 140 }}
                  />
                </td>
                <td><button className="btn-secondary" onClick={() => saveMarkup(p.id)}>Simpan</button></td>
              </tr>
            ))}
            {priceLevels.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 20 }}>Belum ada level harga</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
