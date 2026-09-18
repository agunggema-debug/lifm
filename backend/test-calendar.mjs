// Uji kalender musim aturan AFC (tanpa HTTP): pakai DB terpisah supaya karier asli aman.
//   Liga Indonesia : 18 klub home & away = 34 laga/klub (306 laga, 34 pekan)
//   ACL Two        : fase grup 6 laga/klub + KO 2 leg sampai Semifinal + Final 1 laga = 13 laga
//   ACL Elite      : league phase 8 laga/klub (4 home, 4 away) + KO 1 leg = 12 laga
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
// DB terpisah HANYA untuk tes ini (di-set sebelum src/db.js di-import).
process.env.LIFM_DB = path.join(dir, 'test-calendar.db');
fs.rmSync(process.env.LIFM_DB, { force: true });

const { all, get, run } = await import('./src/db.js');
const { seedClubs, seedWorld, startNextSeason } = await import('./src/seed.js');
const { ensureAclKnockout } = await import('./src/play.js');
const { ACL_TWO_KO, ACL_ELITE_KO, LEAGUE_MATCHDAYS, aclSections, aclEliteZones, aclGroupMdsOf } = await import('./src/data.js');

let failed = 0;
const ok = (label, val) => console.log('✔', label, val);
const must = (label, cond, val) => { if (cond) return ok(label, val); failed++; console.log('✘ GAGAL', label, val); };
const pairKey = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);

await seedClubs();
await run('INSERT INTO careers (token,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (?,?,?,1,1,?,?,?,?)', ['cal-test', 'Tester Kalender', 2, '4-4-2', 'balanced', '[]', 52000000]);
const saveId = (await get("SELECT id FROM careers WHERE token='cal-test'")).id;
await seedWorld(saveId);

// ===== 1. Liga Indonesia: home & away, 34 laga/klub =====
const lg = await all("SELECT home_id, away_id, matchday FROM fixtures WHERE save_id=? AND season=1 AND competition='league'", [saveId]);
must('liga-total-306', lg.length === 306, `${lg.length} laga`);
const mdSet = new Set(lg.map((f) => Number(f.matchday)));
must('liga-34-pekan', mdSet.size === 34 && Math.min(...mdSet) === 1 && Math.max(...mdSet) === LEAGUE_MATCHDAYS, `pekan=${mdSet.size} (1-${Math.max(...mdSet)})`);
const perMd = {};
for (const f of lg) perMd[f.matchday] = (perMd[f.matchday] || 0) + 1;
must('liga-9-laga-per-pekan', Object.values(perMd).every((c) => c === 9), `9 laga x 34 pekan`);
const homeOf = {};
const awayOf = {};
for (const f of lg) { homeOf[f.home_id] = (homeOf[f.home_id] || 0) + 1; awayOf[f.away_id] = (awayOf[f.away_id] || 0) + 1; }
const clubIds = Object.keys(homeOf).map(Number).sort((a, b) => a - b);
must('liga-34-laga-per-klub', clubIds.length === 18 && clubIds.every((id) => homeOf[id] === 17 && awayOf[id] === 17), `klub=${clubIds.length}, tiap klub 17 home + 17 away`);
const pairCount = {};
for (const f of lg) pairCount[pairKey(f.home_id, f.away_id)] = (pairCount[pairKey(f.home_id, f.away_id)] || 0) + 1;
must('liga-home-away-lengkap', Object.keys(pairCount).length === 153 && Object.values(pairCount).every((c) => c === 2), `pasangan=${Object.keys(pairCount).length} (harus 153), tiap pasangan 2x`);
// ===== 2. ACL Two: 6 laga fase grup (home & away) =====
const aclTwo = await all("SELECT * FROM fixtures WHERE save_id=? AND season=1 AND competition='acl_two'", [saveId]);
must('acl-two-96-laga-grup', aclTwo.length === 96, `${aclTwo.length} laga fase grup (8 grup x 12)`);
const groupMds = aclGroupMdsOf('two');
must('acl-two-pekan-grup', aclTwo.every((f) => groupMds.includes(Number(f.matchday))) && groupMds.join(',') === '4,8,12,16,20,24', `pekan=[${groupMds.join(',')}]`);
const aclHome = {};
const aclAway = {};
for (const f of aclTwo) { aclHome[f.home_id] = (aclHome[f.home_id] || 0) + 1; aclAway[f.away_id] = (aclAway[f.away_id] || 0) + 1; }
const aclIds = Object.keys(aclHome).map(Number);
must('acl-two-6-laga-per-klub', aclIds.length === 32 && aclIds.every((id) => aclHome[id] === 3 && aclAway[id] === 3), `klub=${aclIds.length}, 3 home + 3 away`);
const twoPairs = {};
for (const f of aclTwo) twoPairs[pairKey(f.home_id, f.away_id)] = (twoPairs[pairKey(f.home_id, f.away_id)] || 0) + 1;
must('acl-two-home-away-grup', Object.values(twoPairs).every((c) => c === 2), 'tiap pasangan grup bertemu 2x (home & away)');

// ===== 3. Babak gugur ACL Two: 2 leg sampai Semifinal, Final 1 laga =====
const save1 = await get('SELECT * FROM careers WHERE id=?', [saveId]);
const koCount = {};
for (const md of groupMds) await run('UPDATE fixtures SET played=1, home_goals=?, away_goals=? WHERE save_id=? AND season=1 AND matchday=?', [1 + (md % 3), md % 2, saveId, md]);
for (const cfg of ACL_TWO_KO) {
  save1.matchday = cfg.md;
  await ensureAclKnockout(save1);
  const n = await get("SELECT COUNT(*) c FROM fixtures WHERE save_id=? AND season=1 AND matchday=? AND competition='acl_two'", [saveId, cfg.md]);
  koCount[cfg.stage + '-' + cfg.leg] = Number(n.c);
  await run("UPDATE fixtures SET played=1, home_goals=?, away_goals=? WHERE save_id=? AND season=1 AND matchday=? AND competition='acl_two'", [2, 1, saveId, cfg.md]);
}
must('acl-two-ko-2leg', koCount['r16-1'] === 8 && koCount['r16-2'] === 8 && koCount['qf-1'] === 4 && koCount['qf-2'] === 4 && koCount['sf-1'] === 2 && koCount['sf-2'] === 2 && koCount['final-1'] === 1,
  `16B=${koCount['r16-1']}+${koCount['r16-2']} QF=${koCount['qf-1']}+${koCount['qf-2']} SF=${koCount['sf-1']}+${koCount['sf-2']} Final=${koCount['final-1']}`);
const r16 = await all("SELECT * FROM fixtures WHERE save_id=? AND season=1 AND matchday=26 AND competition='acl_two' ORDER BY id", [saveId]);
const r16leg2 = await all("SELECT * FROM fixtures WHERE save_id=? AND season=1 AND matchday=28 AND competition='acl_two' ORDER BY id", [saveId]);
const zones = {};
for (const s of aclSections('two')) for (const id of s.ids) zones[id] = s.zone;
must('acl-two-16besar-intra-zona', r16.length === 8 && r16.every((f) => zones[f.home_id] === zones[f.away_id]), '8 tie semuanya sekawan zona (Timur/Timur, Barat/Barat)');
must('acl-two-leg2-kandang-dibalik', r16.length === r16leg2.length && r16.every((f, i) => f.home_id === r16leg2[i].away_id && f.away_id === r16leg2[i].home_id), 'leg 2 = kebalikan leg 1');
const finTwo = await all("SELECT * FROM fixtures WHERE save_id=? AND season=1 AND matchday=? AND competition='acl_two'", [saveId, LEAGUE_MATCHDAYS]);
must('acl-two-final-1-laga', finTwo.length === 1, `final Pekan ${LEAGUE_MATCHDAYS}: 1 laga`);
ok('acl-two-laga-sampai-juara', '13 laga (grup 6 + 16B/QF/SF 2 leg + Final 1) sesuai aturan AFC');
// ===== 4. ACL Elite: league phase 8 laga (4 home, 4 away) + KO 1 leg =====
// Karier BARU supaya tidak tercampur hasil KO ACL Two di atas.
await run('INSERT INTO careers (token,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (?,?,?,1,1,?,?,?,?)', ['cal-test-elite', 'Tester Elite', 2, '4-4-2', 'balanced', '[]', 52000000]);
const saveId2 = (await get("SELECT id FROM careers WHERE token='cal-test-elite'")).id;
await seedWorld(saveId2);
await run("INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition,played,home_goals,away_goals) VALUES (?,1,?,2,35,'acl_two',1,3,0)", [saveId2, LEAGUE_MATCHDAYS]);
await run('UPDATE careers SET matchday=35 WHERE id=?', [saveId2]);
const ns = await startNextSeason(saveId2);
must('promosi-elite', ns.aclTier === 'elite' && ns.season === 2 && ns.promoted === true, `season=${ns.season} tier=${ns.aclTier} juara=${ns.aclChampion}`);
const elite = await all("SELECT * FROM fixtures WHERE save_id=? AND season=2 AND competition='acl_elite'", [saveId2]);
must('elite-96-laga', elite.length === 96, `${elite.length} laga league phase (2 zona x 12 tim x 8 laga / 2)`);
const eliteMds = aclGroupMdsOf('elite');
must('elite-8-ronde', eliteMds.length === 8 && eliteMds.join(',') === '4,8,12,16,20,24,26,28', `pekan=[${eliteMds.join(',')}]`);
const eHome = {};
const eAway = {};
for (const f of elite) { eHome[f.home_id] = (eHome[f.home_id] || 0) + 1; eAway[f.away_id] = (eAway[f.away_id] || 0) + 1; }
const eIds = Object.keys(eHome).map(Number);
must('elite-24-klub-8-laga', eIds.length === 24 && eIds.every((id) => eHome[id] === 4 && eAway[id] === 4), `klub=${eIds.length}, tiap klub 4 home + 4 away`);
const eliteZones = aclEliteZones();
must('elite-12-per-zona', eliteZones.length === 2 && eliteZones.every((z) => z.ids.length === 12) && eliteZones[0].zone === 'east' && eliteZones[1].zone === 'west', eliteZones.map((z) => z.label + '=' + z.ids.length + ' tim').join(' | '));
must('elite-persib-masuk', eliteZones[0].ids.includes(2), `Persib (2) di ${eliteZones[0].label}`);
const ePairs = {};
for (const f of elite) ePairs[pairKey(f.home_id, f.away_id)] = (ePairs[pairKey(f.home_id, f.away_id)] || 0) + 1;
must('elite-tanpa-ulangan', Object.values(ePairs).every((c) => c === 1), `${Object.keys(ePairs).length} pasangan (48/zona), tidak ada yang dobel`);
const eZone = {};
for (const z of eliteZones) for (const id of z.ids) eZone[id] = z.zone;
must('elite-intra-zona', elite.every((f) => eZone[f.home_id] === eZone[f.away_id]), 'league phase hanya lawan sesama zona (aturan AFC)');

// KO ACL Elite: 1 leg (16 Besar 8 laga -> 4 -> 2 -> Final 1 laga)
await run("UPDATE fixtures SET played=1, home_goals=3, away_goals=1 WHERE save_id=? AND season=2 AND competition='acl_elite'", [saveId2]);
const save2 = await get('SELECT * FROM careers WHERE id=?', [saveId2]);
const koElite = {};
for (const cfg of ACL_ELITE_KO) {
  save2.matchday = cfg.md;
  await ensureAclKnockout(save2);
  const n = await get("SELECT COUNT(*) c FROM fixtures WHERE save_id=? AND season=2 AND matchday=? AND competition='acl_elite'", [saveId2, cfg.md]);
  koElite[cfg.stage] = Number(n.c);
  await run("UPDATE fixtures SET played=1, home_goals=?, away_goals=? WHERE save_id=? AND season=2 AND matchday=? AND competition='acl_elite'", [2, 1, saveId2, cfg.md]);
}
must('elite-ko-1leg', koElite.r16 === 8 && koElite.qf === 4 && koElite.sf === 2 && koElite.final === 1, `16B=${koElite.r16} QF=${koElite.qf} SF=${koElite.sf} Final=${koElite.final}`);
const e16 = await all("SELECT * FROM fixtures WHERE save_id=? AND season=2 AND matchday=29 AND competition='acl_elite' ORDER BY id", [saveId2]);
const e16zoneOk = e16.length === 8 && e16.slice(0, 4).every((f) => eZone[f.home_id] === 'east' && eZone[f.away_id] === 'east') && e16.slice(4).every((f) => eZone[f.home_id] === 'west' && eZone[f.away_id] === 'west');
must('elite-16besar-intra-zona', e16zoneOk, '4 tie Zona Timur + 4 tie Zona Barat');
const eqf = await all("SELECT * FROM fixtures WHERE save_id=? AND season=2 AND matchday=31 AND competition='acl_elite' ORDER BY id", [saveId2]);
must('elite-perempat-timur-vs-barat', eqf.length === 4 && eqf.every((f) => eZone[f.home_id] !== eZone[f.away_id]), 'Timur vs Barat sejak Perempat Final (aturan AFC)');
ok('elite-laga-sampai-juara', '12 laga (league phase 8 + 16B/QF/SF/Final 1 leg) sesuai aturan AFC');

console.log(failed ? `\n${failed} TES KALENDER GAGAL ❌` : '\nSEMUA TES KALENDER LULUS ');
process.exit(failed ? 1 : 0);