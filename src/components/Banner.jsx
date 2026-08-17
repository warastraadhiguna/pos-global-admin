import { useEffect, useRef } from 'react';

// Auto-close error lebih lama drpd success — pesan error biasanya lebih
// panjang & penting utk sempat terbaca, success cukup konfirmasi sekilas.
const AUTO_CLOSE_MS = { error: 6000, success: 3500 };

// Banner pesan transient (hasil aksi: create/update/delete/dll) — auto-close
// sendiri + tombol × manual. Timer cuma reset kalau MESSAGE-nya benar-benar
// berubah (bukan tiap re-render parent), lewat ref utk onClose supaya closure
// selalu yang terbaru tanpa perlu masuk dependency array.
export default function Banner({ type = 'error', message, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_MS[type] || 4000);
    return () => clearTimeout(timer);
  }, [message, type]);

  if (!message) return null;

  return (
    <div className={`${type}-banner`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 18, lineHeight: 1, color: 'inherit', opacity: 0.6, flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
