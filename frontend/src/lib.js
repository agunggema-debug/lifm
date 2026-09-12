// Base URL backend. Kosong = same-origin (dev: proxy via Vite, prod Vercel: set VITE_API_URL).
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function api(path, opts) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...(opts || {})
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Request gagal');
  if (data === null) throw new Error('Response bukan JSON dari backend'); // mis. kena rewrite SPA saat env API belum di-set
  return data;
}
export function rp(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }
// Kebutuhan jumlah pemain per posisi untuk tiap formasi (mirror backend game.js).
export function formationNeeds(f) {
  const m = {
    '4-4-2': [1, 4, 4, 2], '4-3-3': [1, 4, 3, 3], '3-5-2': [1, 3, 5, 2],
    '4-2-3-1': [1, 4, 5, 1], '5-3-2': [1, 5, 3, 2], '4-5-1': [1, 4, 5, 1]
  };
  const v = m[f] || m['4-4-2'];
  return { GK: v[0], DF: v[1], MF: v[2], FW: v[3] };
}
// Logo klub dari folder backend: lifm/backend/src/public/img/clubs/*.png (disserve via /img/clubs/)
// Aset gambar (logo klub & background) disajikan dari frontend/public/img (self-contained di Vercel).
// Hanya panggilan /api yang diarahkan ke backend via API_BASE.
export function clubLogo(c) {
  if (!c) return '';
  if (c.logo) return '/img/clubs/' + c.logo;
  return '';
}
// Warna moral: >=80 hijau, 60-79 kuning, <60 merah.
// Asumsi: permintaan "99 merah" kemungkinan typo — 99 tetap hijau karena >80.
export function moraleMeta(m) {
  const v = Number(m || 0);
  if (v >= 80) return { color: 'green', emoji: '😃', label: 'Semangat', ring: '#22c55e', bg: '#dcfce7', text: '#166534' };
  if (v >= 60) return { color: 'yellow', emoji: '😐', label: 'Standar', ring: '#eab308', bg: '#fef9c3', text: '#854d0e' };
  return { color: 'red', emoji: '😞', label: 'Down', ring: '#ef4444', bg: '#fee2e2', text: '#991b1b' };
}
export const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-5-1'];
export const MENTALITIES = [
  { id: 'attacking', label: 'Menyerang', emoji: '🔥' },
  { id: 'balanced', label: 'Seimbang', emoji: '⚖️' },
  { id: 'defensive', label: 'Bertahan', emoji: '🧱' }
];
