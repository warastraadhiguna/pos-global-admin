import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

// Ganti pola <select> yang me-load SEMUA produk sekaligus (bisa jadi ribuan
// baris) dengan search-as-you-type + Enter-utk-pilih, sama seperti "Cari
// Nama" di aplikasi kasir — cuma ambil hasil yang cocok (server LIMIT 20),
// bukan seluruh katalog produk. Enter selalu memilih hasil yang SEDANG
// disorot (default hasil teratas), sama seperti F2 di kasir.
export default function ProductSearchSelect({ onSelect, placeholder = 'Cari produk (nama/SKU)...', style, autoFocus = true }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      api.searchProducts(query.trim())
        .then((d) => setResults(d.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => { setHighlightIndex(0); }, [results]);

  function pick(product) {
    setSelected(product);
    setOpen(false);
    setQuery('');
    setResults([]);
    onSelect(product);
  }

  function reset() {
    setSelected(null);
    onSelect(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightIndex]) pick(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (selected) {
    return (
      <div className="input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, ...style }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.sku} — {selected.name}</span>
        <button type="button" onClick={reset} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0 }}>
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        ref={inputRef}
        className="input"
        style={{ width: '100%' }}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: '#fff', border: '1px solid #ddd', borderRadius: 6, marginTop: 2,
            maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {loading && <div style={{ padding: 8, color: '#999', fontSize: 13 }}>Mencari...</div>}
          {!loading && results.length === 0 && <div style={{ padding: 8, color: '#999', fontSize: 13 }}>Tidak ada produk cocok</div>}
          {!loading && results.map((p, idx) => (
            <div
              key={p.id}
              onMouseDown={() => pick(p)}
              style={{
                padding: '8px 10px', cursor: 'pointer', fontSize: 13,
                background: idx === highlightIndex ? '#eef2ff' : '#fff',
              }}
            >
              {p.sku} — {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
