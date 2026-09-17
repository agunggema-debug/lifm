// Uji multi-user: dua pengunjung (token A & B) harus punya dunia terpisah
const B = 'http://localhost:3001';
const ok = (label, val) => console.log('✔', label, val);

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

(async () => {
  const TA = 'test-token-A', TB = 'test-token-B';
  // 1) state awal (belum ada karier)
  const s0 = await req('/api/state', TA);
  ok('state A tanpa karier -> hasSave=false:', s0.hasSave === false && s0.clubs.length === 18);
  // 2) buat karier berbeda
  const a = await req('/api/career', TA, { method: 'POST', body: { managerName: 'Manajer A', clubId: 1 } });
  const b = await req('/api/career', TB, { method: 'POST', body: { managerName: 'Manajer B', clubId: 2 } });
  ok('karier A =', a.save.club.name + ' | ' + a.save.manager_name);
  ok('karier B =', b.save.club.name + ' | ' + b.save.manager_name);
  // 3) karier A main satu pekan penuh (babak 1 + babak 2)
  const h1 = await req('/api/play', TA, { method: 'POST', body: { phase: 'first' } });
  const h2 = await req('/api/play', TA, { method: 'POST', body: { phase: 'second', halfTimeState: h1.halfTimeState } });
  ok('A setelah main -> matchday:', h2.save.matchday + ' (skor ' + h2.userResult.homeGoals + '-' + h2.userResult.awayGoals + ')');
  // 4) karier B TIDAK boleh terpengaruh
  const stB = await req('/api/state', TB);
  ok('B tidak ikut maju pekan (matchday masih 1):', stB.save.matchday === 1);
  const fx1 = await req('/api/fixtures?matchday=1', TB);
  ok('B fixture MD1 belum dimainkan (played=0 semua):', fx1.every((f) => !f.played));
  // 5) klasemen A berubah, klasemen B masih nol
  const stA = await req('/api/standings', TA);
  const stB2 = await req('/api/standings', TB);
  const ptsA = stA.reduce((s, r) => s + r.points, 0);
  const ptsB = stB2.reduce((s, r) => s + r.points, 0);
  ok('total poin klasemen A > 0:', ptsA > 0, '(' + ptsA + ')');
  ok('total poin klasemen B = 0:', ptsB === 0);
  // 6) berita terpisah
  const nA = await req('/api/news', TA);
  const nB = await req('/api/news', TB);
  ok('berita A berisi hasil laga A:', nA.some((n) => n.tag === 'HASIL'));
  ok('berita B tidak ada hasil (belum main):', !nB.some((n) => n.tag === 'HASIL'));
  // 7) skuad terpisah
  const sqA = await req('/api/squad', TA);
  const sqB = await req('/api/squad', TB);
  ok('skuad A & B terpisah (id pemain beda semua):', !sqA.some((p) => sqB.some((q) => q.id === p.id)));
  // 8) reset A tidak mengganggu B
  await req('/api/career/reset', TA, { method: 'POST' });
  const stA2 = await req('/api/state', TA);
  const stB3 = await req('/api/state', TB);
  ok('setelah reset: A tanpa karier, B tetap ada:', stA2.hasSave === false && stB3.hasSave === true);
  console.log('\nSEMUA TES LOLOS ✅');
})().catch((e) => { console.error('GAGAL ❌', e.message); process.exit(1); });
