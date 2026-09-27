// ==== Cache in-memory + single-flight (anti request/query KEMBAR) ====
// Dipakai HANYA untuk endpoint BACA yang mahal (peringkat manajer, papan Top Score, daftar klub).
// Manfaat saat online (Turso remote): latensi terbesar game ini adalah round-trip ke DB,
// jadi hasil loader disimpan sebentar di memori proses dan request identik yang datang
// bersamaan menunggu SATU loader yang sama (bukan query berulang).
//
// Dokumentasi resmi yang jadi acuan:
// - Express — Performance Best Practices (cache & kurangi kerja per request):
//   https://expressjs.com/en/advanced/best-practice-performance.html
// - Turso/libSQL — client & query (round-trip remote):
//   https://docs.turso.tech/sdk/ts/reference
// - MDN — HTTP caching (kapan data boleh dipakai ulang / divalidasi):
//   https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching

const store = new Map();
const stats = { hits: 0, misses: 0, inflight: 0 };

// cached(key, ttlMs, loader):
// - fresh  -> nilai dari memori (tanpa DB)
// - stale & ada loader berjalan -> ikut menunggu promise itu (single-flight / anti duplikat)
// - error  -> TIDAK di-cache supaya request berikutnya bisa mencoba lagi
export async function cached(key, ttlMs, loader) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.value !== undefined && hit.expires > now) {
    stats.hits += 1;
    return hit.value;
  }
  if (hit && hit.pending) {
    stats.inflight += 1;
    return hit.pending;
  }
  stats.misses += 1;
  const pending = Promise.resolve().then(loader);
  // Nilai lama tetap disimpan sebagai fallback (kalau loader gagal, store dihapus di catch).
  store.set(key, { ...(hit && hit.value !== undefined ? { value: hit.value, expires: hit.expires } : {}), pending });
  try {
    const value = await pending;
    store.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  } catch (e) {
    store.delete(key);
    throw e;
  }
}

// Buang entri cache setelah aksi TULIS supaya data publik tetap segar (bust('lb:') / bust('top:')).
export function bust(prefix = '') {
  for (const k of [...store.keys()]) {
    if (!prefix || k.startsWith(prefix)) store.delete(k);
  }
}

// Info ringkas untuk /api/health (memudahkan cek cache benar-benar bekerja saat online).
export function cacheStats() {
  return { ...stats, keys: store.size };
}
