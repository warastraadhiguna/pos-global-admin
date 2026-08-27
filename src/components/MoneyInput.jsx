// Textbox angka rupiah dgn pemisah ribuan (titik, format id-ID) selagi
// diketik — value/onChange tetap string angka mentah TANPA titik (mis.
// "33000"), jadi kompatibel dgn kode yang sudah pakai <input type="number">
// sebelumnya, cuma tampilannya yang berubah.
export default function MoneyInput({ value, onChange, placeholder, style, className = 'input', autoFocus }) {
  const displayValue = value === '' || value === null || value === undefined
    ? ''
    : Number(value).toLocaleString('id-ID');

  function handleChange(e) {
    const raw = e.target.value.replace(/\D/g, ''); // buang semua selain digit (termasuk titik pemisah)
    onChange(raw);
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      style={style}
      autoFocus={autoFocus}
    />
  );
}
