import { useEffect, useMemo, useRef, useState } from 'react';

// Sama semangat dgn ProductSearchSelect (search-as-you-type + Enter utk
// pilih), TAPI filter di CLIENT dari daftar yang sudah di-fetch sekali
// (bukan query server tiap ketik) — supplier realistis tidak akan sampai
// ribuan baris kayak produk, jadi tidak butuh infrastruktur search server
// terpisah, cukup filter dari `suppliers` yang parent sudah punya.
export default function SupplierSearchSelect({ suppliers, value, onSelect, placeholder = 'Cari supplier...', style, autoFocus }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef(null);

  const selected = suppliers.find((s) => s.id === value) || null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 20);
    return suppliers.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, suppliers]);

  useEffect(() => { setHighlightIndex(0); }, [results]);

  function pick(supplier) {
    setOpen(false);
    setQuery('');
    onSelect(supplier);
  }

  function reset() {
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
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
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: '#fff', border: '1px solid #ddd', borderRadius: 6, marginTop: 2,
            maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {results.length === 0 && <div style={{ padding: 8, color: '#999', fontSize: 13 }}>Tidak ada supplier cocok</div>}
          {results.map((s, idx) => (
            <div
              key={s.id}
              onMouseDown={() => pick(s)}
              style={{
                padding: '8px 10px', cursor: 'pointer', fontSize: 13,
                background: idx === highlightIndex ? '#eef2ff' : '#fff',
              }}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
