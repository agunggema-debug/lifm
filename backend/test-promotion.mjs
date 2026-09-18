// Uji jalur PROMOSI: juara ACL Two -> musim berikutnya main ACL ELITE,
// berbarengan dengan jadwal Liga musim baru (pekan ganda). Jalan pakai token unik
// supaya karier asli tidak terganggu. Butuh server dev hidup di port 3001.
const B = 'http://localhost:3001';
import { all, get, run } from './src/db.js';
import { ACL_GROUPS, LEAGUE_MATCHDAYS, aclEliteZones } from './src/data.js';

let failed = 0;
const ok = (label, val) => console.log('✔', label, val);
const must = (label, cond, val) => {
  if (cond) return ok(label, val);
  failed++;
  console.log('✘ GAGAL', label, val);
};
const H = { 'Content-Type': 'application/json', 'X-Lifm-Token': 'test-promo-' + Date.now() };
const post = (p, body) => fetch(B + p, { method: 'POST', headers: H, body: JSON.stringify(body || {}) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });
const httpGet = (p) => fetch(B + p, { headers: H }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });

// 1. Karier baru: Persib (id 2) mulai di ACL Two
const c = await post('/api/career', { managerName: 'Tester Promosi', clubId: 2 });
const saveId = c.save.id;
must('career', c.save.acl_tier === 'two' && c.save.season === 1, `season=${c.save.season} tier=${c.save.acl_tier}`);

// 2. Paksa Persib JUARA ACL Two musim 1 (Final Pekan 34) lalu tandai musim tuntas
const persibInGroup = ACL_GROUPS.find((g) => g.ids.includes(2));
must('acl-two-grup-persib', !!persibInGroup, persibInGroup ? 'Grup ' + persibInGroup.name + ' (Zona ' + persibInGroup.zone + ')' : 'tidak ketemu');
await run("INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition,played,home_goals,away_goals) VALUES (?,1,?,2,35,'acl_two',1,3,0)", [saveId, LEAGUE_MATCHDAYS]);
await run('UPDATE careers SET matchday=? WHERE id=?', [LEAGUE_MATCHDAYS + 1, saveId]);
const ns = await post('/api/next-season', {});
must('promosi', ns.promoted === true && ns.aclTier === 'elite' && ns.aclTitles === 1,
  `season=${ns.season} tier=${ns.aclTier} titles=${ns.aclTitles} promoted=${ns.promoted} juara=${ns.aclChampion}`);

// 3. Musim 2: jadwal Liga (34 pekan home & away = 306 laga) + ACL ELITE dibuat bersamaan
const fx = await all('SELECT competition, COUNT(*) c FROM fixtures WHERE save_id=? AND season=2 GROUP BY competition', [saveId]);
const cnt = {};
for (const r of fx) cnt[r.competition] = Number(r.c);
must('jadwal-musim-2', cnt.league === 306 && cnt.acl_elite === 96 && !cnt.acl_two,
  `league=${cnt.league || 0} (harus 306) acl_elite=${cnt.acl_elite || 0} acl_two=${cnt.acl_two || 0}`);

// 4. Pekan ganda: Pekan 4 musim 2 berisi laga Liga + laga ACL Elite
const md3 = await all('SELECT competition, COUNT(*) c FROM fixtures WHERE save_id=? AND season=2 AND matchday=4 GROUP BY competition', [saveId]);
const c3 = {};
for (const r of md3) c3[r.competition] = Number(r.c);
must('pekan-ganda-md4', c3.league === 9 && c3.acl_elite === 12, `league=${c3.league || 0} (9) acl_elite=${c3.acl_elite || 0} (12 = 2 zona x 6 laga)`);

// 5. Persib masuk Zona Timur ACL Elite dan main 8 laga (aturan AFC league phase)
const zones = aclEliteZones();
const eastZone = zones.find((z) => z.ids.includes(2));
const mine = await all("SELECT matchday,competition FROM fixtures WHERE save_id=? AND season=2 AND competition='acl_elite' AND (home_id=2 OR away_id=2) ORDER BY matchday", [saveId]);
must('persib-di-elite', eastZone && eastZone.ids.includes(2) && mine.length === 8, `zona=${eastZone ? eastZone.label : '-'} lagaPersib=${mine.length} md=[${mine.map((m) => m.matchday).join(',')}]`);

// 6. API klasemen ACL ikut tier karier (Elite = 2 zona, 12 klub/zona)
const tbl = await httpGet('/api/standings/acl');
const east = tbl.find((g) => g.name === 'EAST');
must('api-klasemen-elite', tbl.length === 2 && east && east.rows.length === 12 && east.rows.some((r) => r.club_id === 2) && east.label === 'Zona Timur',
  `zona=${tbl.map((g) => g.name + ':' + g.rows.length).join(' ')} label=${east ? east.label : '-'} (harus 2 zona x 12 klub)`);

// 7. SIMULASI MUSIM PENUH DI ACL ELITE lewat API: league phase (pekan ganda) +
//    babak gugur 16 Besar -> Final. Verifikasi musim benar-benar tuntas (md > 34)
//    dan juara ACL ELITE selalu ditentukan pada Final Pekan 34.
async function playWeek() {
  let last = null;
  for (let i = 0; i < 3; i++) {
    const r = await post('/api/play', { phase: 'first' });
    if (r.finished || r.done) return r;
    if (r.pendingUserFixture) continue; // laga ACL Elite menyusul di pekan yang sama
    const r2 = await post('/api/play', { phase: 'second', halfTimeState: r.halfTimeState });
    last = r2;
    if (r2.pendingUserFixture) continue;
    return r2;
  }
  return last;
}
// Pekan ganda terdeteksi: Pekan 4 musim 2 punya laga user di liga DAN ACL Elite
const md3User = await all('SELECT competition FROM fixtures WHERE save_id=? AND season=2 AND matchday=4 AND played=0 AND (home_id=2 OR away_id=2)', [saveId]);
must('pekan-ganda-user-md4', md3User.length === 2 && md3User.some((x) => x.competition === 'league') && md3User.some((x) => x.competition === 'acl_elite'),
  `lagaUserMd4=${md3User.map((x) => x.competition).join('+')}`);

let guard = 0;
while (guard++ < 60) {
  const nf = await httpGet('/api/next-fixture');
  if (nf.finished) break;
  const r = await playWeek();
  if (r && (r.finished || r.done)) break;
}
const endState2 = await httpGet('/api/state');
must('musim-elite-tuntas', endState2.save.matchday > LEAGUE_MATCHDAYS && endState2.save.acl_tier === 'elite',
  `md=${endState2.save.matchday} (harus > ${LEAGUE_MATCHDAYS}) tier=${endState2.save.acl_tier} season=${endState2.save.season}`);

// Final ACL ELITE Pekan 34 harus sudah dimainkan -> juara ditentukan
const finElite = await get("SELECT * FROM fixtures WHERE save_id=? AND season=2 AND competition='acl_elite' AND matchday=? AND played=1", [saveId, LEAGUE_MATCHDAYS]);
must('final-elite-dimainkan', !!finElite, finElite ? `final Pekan ${LEAGUE_MATCHDAYS}: klub${finElite.home_id} ${finElite.home_goals}-${finElite.away_goals} klub${finElite.away_id}` : 'final tidak ada');
const stageRows = await all("SELECT matchday, COUNT(*) c FROM fixtures WHERE save_id=? AND season=2 AND competition='acl_elite' AND matchday>=29 GROUP BY matchday ORDER BY matchday", [saveId]);
const koCounts = stageRows.map((r) => r.matchday + ':' + r.c).join(' ');
must('babak-gugur-elite-lengkap', stageRows.length === 4 && stageRows.map((r) => Number(r.c)).join(',') === '8,4,2,1', `ko=[${koCounts}] (Pekan 29,31,32,34 -> 8,4,2,1 sesuai aturan AFC)`);

// 8. Musim berikutnya: tier tetap ELITE walau tidak juara (tidak degradasi)
// Catatan: final bisa berakhir imbang -> juara ditentukan adu penalti (koWinner),
// jadi jumlah trofi harus dihitung dari flag `promoted` milik server.
const ns2 = await post('/api/next-season', {});
const userWon = ns2.promoted === true; // juara ACL ELITE musim 2?
must('tetap-elite-musim-3', ns2.aclTier === 'elite' && ns2.season === 3 && ns2.aclTitles === (userWon ? 2 : 1),
  `season=${ns2.season} tier=${ns2.aclTier} titles=${ns2.aclTitles} (harus ${userWon ? 2 : 1}) juaraUser=${userWon}`);

// 9. Musim 3 tetap ACL Elite (tidak turun ke ACL Two) + kalender pekan ganda Persib
const fx3 = await all('SELECT competition, COUNT(*) c FROM fixtures WHERE save_id=? AND season=3 GROUP BY competition', [saveId]);
const cnt3 = {};
for (const r of fx3) cnt3[r.competition] = Number(r.c);
must('musim-3-tetap-elite', cnt3.acl_elite === 96 && !cnt3.acl_two && cnt3.league === 306,
  `league=${cnt3.league || 0} (harus 306) acl_elite=${cnt3.acl_elite || 0} acl_two=${cnt3.acl_two || 0}`);
const mine3 = await all("SELECT matchday FROM fixtures WHERE save_id=? AND season=3 AND competition='acl_elite' AND (home_id=2 OR away_id=2) ORDER BY matchday", [saveId]);
must('kalender-elite-persib', mine3.map((m) => m.matchday).join(',') === '4,8,12,16,20,24,26,28', `md=[${mine3.map((m) => m.matchday).join(',')}] (8 laga league phase)`);

// 10. Juara ACL ELITE -> trofi bertambah & tetap Elite (trofi bukan syarat degradasi)
await run("INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition,played,home_goals,away_goals) VALUES (?,3,?,2,24,'acl_elite',1,2,1)", [saveId, LEAGUE_MATCHDAYS]);
await run('UPDATE careers SET matchday=? WHERE id=?', [LEAGUE_MATCHDAYS + 1, saveId]);
const ns3 = await post('/api/next-season', {});
must('juara-elite-trofi', ns3.aclTier === 'elite' && ns3.aclTitles === (userWon ? 3 : 2) && ns3.season === 4 && ns3.promoted === true,
  `season=${ns3.season} tier=${ns3.aclTier} titles=${ns3.aclTitles} (harus ${userWon ? 3 : 2}) promoted=${ns3.promoted}`);

console.log(failed ? `\n${failed} TES GAGAL ❌` : '\nSEMUA TES PROMOSI LULUS ');
process.exit(failed ? 1 : 0);