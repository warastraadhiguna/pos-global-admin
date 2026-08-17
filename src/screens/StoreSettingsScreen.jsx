import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Banner from '../components/Banner.jsx';

export default function StoreSettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [addressDraft, setAddressDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [taxModeDraft, setTaxModeDraft] = useState('pkp');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  function reload() {
    api.getStoreSettings().then((d) => {
      setSettings(d.settings);
      setNameDraft(d.settings.store_name || '');
      setAddressDraft(d.settings.store_address || '');
      setPhoneDraft(d.settings.store_phone || '');
      setTaxModeDraft(d.settings.tax_mode || 'pkp');
    }).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
  }

  async function saveIdentity(e) {
    e.preventDefault();
    if (!nameDraft.trim()) {
      setError('Nama toko wajib diisi');
      return;
    }
    try {
      const d = await api.updateStoreSettings({
        storeName: nameDraft.trim(),
        storeAddress: addressDraft.trim() || null,
        storePhone: phoneDraft.trim() || null,
      });
      setSettings(d.settings);
      setError(null);
      flash('Identitas toko disimpan — struk kasir akan pakai data ini mulai transaksi berikutnya');
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTaxMode(e) {
    e.preventDefault();
    try {
      const d = await api.updateStoreSettings({ taxMode: taxModeDraft });
      setSettings(d.settings);
      setError(null);
      flash(`Mode pajak disimpan: ${d.settings.tax_mode === 'pkp' ? 'PKP' : 'Non-PKP'}`);
    } catch (err) {
      setTaxModeDraft(settings.tax_mode); // gagal (mis. terkunci) -> balikin draft ke nilai tersimpan
      setError(err.message);
    }
  }

  async function togglePriceLevelSelector() {
    try {
      const d = await api.updateStoreSettings({ priceLevelSelectorVisible: !settings.price_level_selector_visible });
      setSettings(d.settings);
      setError(null);
      flash(d.settings.price_level_selector_visible ? 'Pilihan Level Harga ditampilkan lagi di kasir' : 'Pilihan Level Harga disembunyikan di kasir');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Pengaturan Toko</h2>
      <p style={{ color: '#666', marginTop: -8 }}>Identitas toko yang tampil di struk, dan pengaturan tampilan layar kasir.</p>
      <Banner type="error" message={error} onClose={() => setError(null)} />
      <Banner type="success" message={info} onClose={() => setInfo(null)} />

      <div className="card" style={{ marginBottom: 16, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Identitas Toko</h3>
        <p style={{ color: '#666', fontSize: 13 }}>Tampil di bagian atas struk kasir (nama toko, alamat, no. HP/telepon).</p>
        <form onSubmit={saveIdentity}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Nama Toko</label>
          <input
            className="input"
            style={{ width: '100%', margin: '6px 0 14px' }}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <label style={{ fontSize: 13, fontWeight: 600 }}>Alamat</label>
          <input
            className="input"
            style={{ width: '100%', margin: '6px 0 14px' }}
            value={addressDraft}
            onChange={(e) => setAddressDraft(e.target.value)}
          />
          <label style={{ fontSize: 13, fontWeight: 600 }}>No. HP/Telepon</label>
          <input
            className="input"
            style={{ width: '100%', margin: '6px 0 18px' }}
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="(opsional)"
          />
          <button className="btn-primary" type="submit">Simpan Identitas Toko</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Mode Pajak</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          <strong>PKP</strong>: PPN Keluaran dikenakan di penjualan (ikut pengaturan tarif/mode di halaman
          Level Harga), PPN Masukan di pembelian dicatat terpisah dari HPP. <strong>Non-PKP</strong>: tidak
          ada PPN di struk penjualan sama sekali, sedangkan PPN yang dibayar ke supplier saat pembelian
          masuk jadi bagian HPP/nilai persediaan. Tidak bisa diubah kalau periode berjalan (bulan ini)
          sudah ada transaksi penjualan/pembelian.
        </p>
        {settings && (
          <form onSubmit={saveTaxMode}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                <input type="radio" name="taxMode" value="pkp" checked={taxModeDraft === 'pkp'} onChange={(e) => setTaxModeDraft(e.target.value)} />
                PKP
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                <input type="radio" name="taxMode" value="non_pkp" checked={taxModeDraft === 'non_pkp'} onChange={(e) => setTaxModeDraft(e.target.value)} />
                Non-PKP
              </label>
            </div>
            <button className="btn-primary" type="submit" disabled={taxModeDraft === settings.tax_mode}>Simpan Mode Pajak</button>
            <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Status saat ini: <strong>{settings.tax_mode === 'pkp' ? 'PKP' : 'Non-PKP'}</strong>
            </p>
          </form>
        )}
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Level Harga di Kasir</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          Kalau disembunyikan, kolom pilihan level harga (mis. ecer/grosir) tidak muncul di layar kasir —
          kasir otomatis pakai level default (ecer). Berguna kalau toko cuma jual satu level harga. Bisa
          ditampilkan lagi kapan saja.
        </p>
        {settings && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={!!settings.price_level_selector_visible} onChange={togglePriceLevelSelector} />
            Tampilkan pilihan Level Harga di kasir: {settings.price_level_selector_visible ? 'YA' : 'TIDAK'}
          </label>
        )}
      </div>
    </div>
  );
}
