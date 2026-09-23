// Regression test: endpoint /api/live & /api/leaderboard (fitur Live Score & Ranking).
// Alur: buat karier baru -> mainkan 1 pekan penuh (babak 1 + 2) -> cek live/leaderboard menggunakan data riil.
const B = 'http://localhost:3001';
const T = 'test-live-lb';
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
const c = await req('/api/career', { method: 'POST', body: { managerName: 'Live LB Tester', clubId: 1 } });
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

// ---- /api/live (pekan yang sudah selesai = md1) ----
const lv = await jget('/api/live?md=1');
ok('live.hasSave', lv.hasSave === true);
ok('live.all 9 matches present', lv.matches.length === 9);
ok('live.all matches played (FT)', lv.matches.every((m) => m.played === true));
ok('live.goals > 0', lv.goals > 0);
ok('live.there is a match for user club', lv.matches.some((m) => m.mine));
ok('live.progress.played === total', lv.progress.played === lv.progress.total);
ok('live.recentForm shows last results', Array.isArray(lv.recentForm) && lv.recentForm.length > 0);
ok('live.scorers populated (players with goals)', Array.isArray(lv.scorers) && lv.scorers.length > 0);
ok('live.scorers have goals>0', lv.scorers.every((p) => p.goals > 0));
ok('live.assists is array', Array.isArray(lv.assists));
ok('live.myLeague rank within 1..18', lv.myLeague && lv.myLeague.rank >= 1 && lv.myLeague.of === 18);
ok('live.leagueLeader defined', !!lv.leagueLeader && typeof lv.leagueLeader.points === 'number');

// ---- /api/live (pekan berikutnya = belum dimainkan) ----
const lvNext = await jget('/api/live');
ok('live-next.hasSave', lvNext.hasSave === true);
ok('live-next.progress.played === 0 (unplayed matchday)', lvNext.progress.played === 0);

console.log('\nLIFM /api/live + /api/leaderboard — ' + pass + ' asersi lolos ✅');

