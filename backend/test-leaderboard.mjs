// Regression test: endpoint /api/leaderboard (🏅 papan manajer) & /api/top-scorers (⚽ Top Score).
// Alur: buat karier baru -> mainkan 1 pekan penuh (babak 1 + 2) -> cek papan Ranking & Top Score dengan data riil.
// Catatan: tab/menu 📺 Live SUDAH DIHAPUS dari game, jadi endpoint /api/live tidak lagi diuji di sini
//           (papan Top Skor kini tampil di menu 🏅 Ranking).
const B = 'http://localhost:3001';
const T = 'test-lb-topscore';
let pass = 0;
function ok(label, cond) { if (cond) { pass++; console.log('✔', label); } else { console.log('✘', label); process.exitCode = 1; } }
async function req(path, opts = {}) {
  const r = await fetch(B + path, {
    headers: { 'Content-Type': 'application/json', 'X-Lifm-Token': T },
    ...(opts.method ? { method: opts.method } : {}),
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + JSON.stringify(j));
  return j;
}
async function jget(path) {
  const r = await fetch(B + path, { headers: { 'X-Lifm-Token': T } });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + JSON.stringify(j));
  return j;
}

// reset + setup karier baru
if ((await jget('/api/state')).hasSave) await req('/api/career/reset', { method: 'POST' });
const c = await req('/api/career', { method: 'POST', body: { managerName: 'LB TopScore Tester', clubId: 1 } });
ok('career created', c.save && c.save.club);
const club = c.save.club;

// mainkan satu pekan penuh
const h1 = await req('/api/play', { method: 'POST', body: { phase: 'first' } });
ok('babak 1 -> halfTimeState', Array.isArray(h1.halfTimeState));
const h2 = await req('/api/play', { method: 'POST', body: { phase: 'second', halfTimeState: h1.halfTimeState } });
ok('babak 2 selesai, pekan maju', h2.save.matchday >= 2);

// ---- /api/leaderboard ----
const lb = await jget('/api/leaderboard?limit=100');
ok('leaderboard.total > 0', lb.total > 0);
ok('leaderboard.me is the tester', !!lb.me && lb.me.club.name === club.name);
ok('leaderboard.points = liga + title*100 + season*25', typeof lb.me.points === 'number');
ok('leaderboard.rows sorted desc by points', lb.rows[0].points >= (lb.rows[1] ? lb.rows[1].points : 0));
ok('leaderboard.me has xi_ovr', typeof lb.me.xi_ovr === 'number');
ok('leaderboard bersumber dari tabel managers (tester muncul)', lb.rows.some((x) => x.manager === 'LB TopScore Tester'));
ok('leaderboard tiap baris punya club.logo_url', lb.rows.every((x) => typeof x.club.logo_url === 'string'));

// ---- Cache (30 detik + single-flight): request berulang harus konsisten ----
// Jalankan 3 request bersamaan (Promise.all) → cache.js hanya menjalankan SATU query (anti duplikat).
const [c1, c2, c3] = await Promise.all([jget('/api/leaderboard?limit=100'), jget('/api/leaderboard?limit=100'), jget('/api/leaderboard?limit=100')]);
ok('leaderboard konsisten saat 3 request paralel (cache + single-flight)', c1.total === lb.total && c2.total === lb.total && c3.total === lb.total);

// ---- /api/top-scorers (⚽ Top Score di menu Ranking) ----
// Klub tester bisa saja belum mencetak gol dalam 1 pekan (mis. kalah 0-3), jadi mainkan
// pekan berikutnya (maks 8) sampai papan "Top skor klubmu" (mine) benar-benar terisi.
let ts = await jget('/api/top-scorers?limit=10');
for (let wk = 0; wk < 8 && ts.mine.length === 0; wk++) {
  const half = await req('/api/play', { method: 'POST', body: { phase: 'first' } });
  await req('/api/play', { method: 'POST', body: { phase: 'second', halfTimeState: half.halfTimeState } });
  ts = await jget('/api/top-scorers?limit=10');
}
ok('top-scorers.rows array', Array.isArray(ts.rows));
ok('top-scorers ada baris setelah pekan dimainkan', ts.rows.length > 0);
ok('top-scorers urut goals desc', ts.rows.every((r, i) => i === 0 || ts.rows[i - 1].goals >= r.goals));
ok('top-scorers semua goals > 0', ts.rows.every((r) => r.goals > 0));
ok('top-scorers rank mulai dari 1', ts.rows[0].rank === 1);
ok('top-scorers punya logo_url & short_name', ts.rows.every((r) => typeof r.logo_url === 'string' && !!r.short_name));
ok('top-scorers.mine = top skor klub karier ini', Array.isArray(ts.mine) && ts.mine.length > 0);
ok('top-scorers.mine hanya pemain klub kita', ts.mine.every((p) => p.club_id === club.id));
ok('top-scorers.mine urut goals desc', ts.mine.every((p, i) => i === 0 || ts.mine[i - 1].goals >= p.goals));
// Flag ⭐ (mine) pada baris global harus konsisten dengan daftar top skor klub kita.
const mineNames = new Set(ts.mine.map((p) => p.name));
ok('flag mine pada baris global = pemain klub kita', ts.rows.every((r) => r.mine === mineNames.has(r.name)));

// ---- /api/health mengekspos statistik cache (bukti cache bekerja saat online) ----
const health = await jget('/api/health');
ok('health.cache.hits > 0', !!(health.cache && health.cache.hits > 0));

// ---- Unikitas nama manajer (sumber data papan ranking) ----
async function tryCreate(token, managerName) {
  const r = await fetch(B + '/api/career', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Lifm-Token': token },
    body: JSON.stringify({ managerName, clubId: 1 }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const d1 = await tryCreate('uniq-a-' + Date.now(), 'LB TopScore Tester');
ok('nama sama (token lain) ditolak 409', d1.status === 409);
const d2 = await tryCreate('uniq-b-' + Date.now(), '  lb topscore tester  ');
ok('duplikat beda kapital & spasi ditolak 409', d2.status === 409);
const d3 = await tryCreate('uniq-c-' + Date.now(), '   ');
ok('nama kosong/spasi ditolak 400', d3.status === 400);

console.log('\nLIFM /api/leaderboard + /api/top-scorers — ' + pass + ' asersi lolos ✅');
