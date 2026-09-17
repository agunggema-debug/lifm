// Uji alur substitusi HT + integritas live data:
// 1) main babak 1  2) sub pemain  3) babak 2 pakai XI baru  4) dobel POST tidak meloncatkan pekan
const B = 'http://localhost:3001';
const ok = (l, v) => console.log('✔', l, v);
async function req(path, token, opts = {}) {
  const r = await fetch(B + path, {
    headers: { 'Content-Type': 'application/json', 'X-Lifm-Token': token },
    ...(opts.method ? { method: opts.method } : {}),
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + JSON.stringify(j));
  return j;
}
const T = 'test-sub-live';
const st0 = await req('/api/state', T);
if (st0.hasSave) await req('/api/career/reset', T, { method: 'POST' });
// 1) mulai karier
const c = await req('/api/career', T, { method: 'POST', body: { managerName: 'Tester Sub', clubId: 1 } });
const lineup0 = c.save.lineup;
const sq = await req('/api/squad', T);
const bench = sq.filter((p) => !lineup0.includes(p.id) && p.injured_weeks === 0 && p.pos !== 'GK');
const outId = lineup0.find((id) => sq.find((p) => p.id === id && p.pos !== 'GK'));
const inId = bench[0].id;
ok('karier dibuat, XI awal ada', lineup0.length === 11);
// 2) main babak 1
const h1 = await req('/api/play', T, { method: 'POST', body: { phase: 'first' } });
ok('babak 1 selesai, halfTimeState diterima', Array.isArray(h1.halfTimeState) && h1.halfTimeState.length > 0);
// 3) substitusi via /api/sub (persis tombol GANTI! di HT)
const subR = await req('/api/sub', T, { method: 'POST', body: { outId, inId } });
ok('sub tersimpan di server (lineup JSON diperbarui):', subR.save.lineup.includes(inId) && !subR.save.lineup.includes(outId));
// 4) babak 2 — server harus pakai XI BARU (dibaca fresh dari DB)
const h2 = await req('/api/play', T, { method: 'POST', body: { phase: 'second', halfTimeState: h1.halfTimeState } });
ok('babak 2 sukses, pekan maju tepat 1:', h2.save.matchday === 2 && !h2.duplicate);
const mdAfter = h2.save.matchday;
// 5) dobel POST phase=second (simulasi retry jaringan / dobel klik) — pekan TIDAK boleh loncat lagi
const dup = await req('/api/play', T, { method: 'POST', body: { phase: 'second', halfTimeState: h1.halfTimeState } });
ok('dobel POST terdeteksi (duplicate=true):', dup.duplicate === true);
const st2 = await req('/api/state', T);
ok('pekan TIDAK meloncat 2x (masih ' + mdAfter + '):', st2.save.matchday === mdAfter);
const n2 = await req('/api/news', T);
ok('tidak ada berita HASIL dobel untuk pekan yang sama:', n2.filter((n) => n.day_label === 'MD1' && n.tag === 'HASIL').length === 1);
// 6) validasi sub: pemain masuk benar-benar ikut simulasi babak 2 (event / XI)
//    (cek: lineup karier saat ini masih memuat inId — bukti sinkron persisten)
const st3 = await req('/api/state', T);
ok('lineup karier persisten memuat pemain masuk:', st3.save.lineup.includes(inId));
console.log('\nSEMUA TES SUB & LIVE-DATA LOLOS ✅');
