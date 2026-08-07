import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function StoreSettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [addressDraft, setAddressDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  function reload() {
    api.getStoreSettings().then((d) => {
      setSettings(d.settings);
      setNameDraft(d.settings.store_name || '');
      setAddressDraft(d.settings.store_address || '');
      setPhoneDraft(d.settings.store_phone || '');
    }).catch((err) => setError(err.message));
  }

  useEffect(reload, []);

  function flash(msg) {
    setInfo(msg);
    setTimeout(() => setInfo(null), 2500);
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
      {error && <div className="error-banner">{error}</div>}
      {info && <div className="success-banner">{info}</div>}

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
