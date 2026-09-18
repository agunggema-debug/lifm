import { all, get, run, stmt, batch } from './db.js';
import { simulateHalf, simulateMatch } from './sim.js';
import { clubMap, squad, autoXI, bumpStanding } from './game.js';
import { applyPostMatch as pm2 } from './postmatch.js';
import { LEAGUE_MATCHDAYS, aclTierKey, aclKoListOf, aclGroupMdsOf, aclKoStageOf, aclStageLabel, aclSections } from './data.js';

// ===== Babak gugur ACL Two / ACL Elite (dinamis, aturan AFC) =====
// ACL Two   : 16 Besar / Perempat Final / Semifinal 2 LEG + Final 1 laga  = 13 laga sampai juara.
// ACL Elite : 16 Besar / Perempat Final / Semifinal / Final 1 laga        = 12 laga sampai juara.
// Zona AFC  : ACL Two memisahkan Zona Timur & Barat sampai Semifinal (baru bertemu di Final),
//             ACL Elite mempertemukan Timur vs Barat sejak Perempat Final.
// Pekan KO & pekan fase grup ada di data.js (ACL_TWO_KO / ACL_ELITE_KO) - semuanya pekan ganda
// bersama Liga Indonesia supaya musim tetap 34 pekan.
const NEXT_STAGE = { qf: 'r16', sf: 'qf', final: 'sf' };

// Kompetisi ACL sesuai tier karier ('acl_two' / 'acl_elite').
export function aclCompOf(save) { return aclTierKey(save) === 'elite' ? 'acl_elite' : 'acl_two'; }

// Pemenang 1 laga; jika imbang -> "adu penalti" acak berbobot kekuatan klub.
export function penaltyWinner(a, b, clubs) {
  const sa = (clubs[a] && clubs[a].strength) || 80;
  const sb = (clubs[b] && clubs[b].strength) || 80;
  return Math.random() < sa / (sa + sb) ? a : b;
}
export function koWinner(f, clubs) {
  if (f.home_goals > f.away_goals) return f.home_id;
  if (f.away_goals > f.home_goals) return f.away_id;
  return penaltyWinner(f.home_id, f.away_id, clubs);
}
// Pemenang tie 2 leg (aturan AFC): agregat 2 laga; jika agregat imbang -> adu penalti berbobot.
export function tieWinner(legs, clubs) {
  const home = legs[0].home_id; const away = legs[0].away_id;
  let hg = 0; let ag = 0;
  for (const l of legs) {
    if (!l) continue;
    if (l.home_id === home) { hg += l.home_goals; ag += l.away_goals; } else { hg += l.away_goals; ag += l.home_goals; }
  }
  if (hg > ag) return home;
  if (ag > hg) return away;
  return penaltyWinner(home, away, clubs);
}

// Klasemen internal tiap grup/zona dari fixture fase grup (pekan fase grup, sudah dimainkan).
// ACL Two = 8 grup, ACL Elite = 2 zona. Klasemen ini dipakai untuk undian 16 Besar & UI.
export async function aclStandings(save) {
  const tier = aclTierKey(save);
  const sections = aclSections(tier);
  const mds = aclGroupMdsOf(tier);
  const clubs = await clubMap();
  const rows = await all(
    'SELECT * FROM fixtures WHERE save_id=? AND season=? AND competition=? AND matchday IN (' + mds.map(() => '?').join(',') + ')',
    [save.id, save.season, aclCompOf(save), ...mds]
  );
  const tables = {};
  for (const s of sections) {
    tables[s.name] = {};
    for (const id of s.ids) {
      const c = clubs[id];
      tables[s.name][id] = { club_id: id, name: c ? c.name : 'Klub ' + id, short_name: c ? c.short_name : '?', logo: c ? c.logo : '', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
    }
  }
  for (const f of rows) {
    if (!f.played) continue;
    for (const [id, gf, ga] of [[f.home_id, f.home_goals, f.away_goals], [f.away_id, f.away_goals, f.home_goals]]) {
      let t = null;
      for (const s of sections) if (tables[s.name][id]) t = tables[s.name][id];
      if (!t) continue;
      t.played++; t.gf += gf; t.ga += ga; t.gd += gf - ga;
      if (gf > ga) { t.won++; t.points += 3; } else if (gf === ga) { t.drawn++; t.points += 1; } else t.lost++;
    }
  }
  const sortRows = (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.short_name.localeCompare(b.short_name);
  return sections.map((s) => ({ name: s.name, label: s.label, zone: s.zone, rows: Object.values(tables[s.name]).sort(sortRows) }));
}

// Undian 16 Besar sesuai aturan AFC:
// - ACL Two  : juara grup vs runner-up grup sekawan zona (juara grup jadi tuan rumah leg 1).
// - ACL Elite: 1v8, 4v5, 2v7, 3v6 dari klasemen zona (tuan rumah = seed lebih tinggi).
async function aclR16Pairs(save) {
  const tier = aclTierKey(save);
  const tables = await aclStandings(save);
  const by = {};
  for (const s of tables) by[s.name] = s.rows;
  const pairs = [];
  if (tier === 'elite') {
    for (const s of tables) {
      const t = s.rows;
      if (t.length < 8) return [];
      pairs.push([t[0].club_id, t[7].club_id], [t[3].club_id, t[4].club_id], [t[1].club_id, t[6].club_id], [t[2].club_id, t[5].club_id]);
    }
    return pairs;
  }
  const order = [['A', 'B'], ['B', 'A'], ['C', 'E'], ['E', 'C'], ['D', 'F'], ['F', 'D'], ['G', 'H'], ['H', 'G']];
  for (const [w, r] of order) {
    if (!by[w] || !by[r] || !by[w].length || by[r].length < 2) return [];
    pairs.push([by[w][0].club_id, by[r][1].club_id]);
  }
  return pairs;
}

// Fixture tiap leg pada satu babak (2 leg untuk ACL Two sampai Semifinal, 1 leg untuk Final/Elite).
// WAJIB filter competition: pekan KO (26-34) juga berisi laga Liga (pekan ganda).
async function stageFixtures(save, stage) {
  const mds = aclKoListOf(aclTierKey(save)).filter((x) => x.stage === stage).map((x) => x.md);
  const legs = [];
  for (const md of mds) legs.push(await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND competition=? ORDER BY id', [save.id, save.season, md, aclCompOf(save)]));
  return legs;
}

// Pemenang tiap tie pada satu babak (2 leg -> agregat, 1 leg -> pemenang laga).
async function stageWinners(save, stage) {
  const clubs = await clubMap();
  const legs = await stageFixtures(save, stage);
  if (legs.length === 1) return (legs[0] || []).map((f) => koWinner(f, clubs));
  const l1 = legs[0] || []; const l2 = legs[1] || [];
  const winners = [];
  for (let i = 0; i < l1.length; i++) winners.push(tieWinner([l1[i], l2[i]], clubs));
  return winners;
}

// Undian babak berikutnya (tuan rumah = pemenang tie ber-indeks lebih kecil).
function bracketPairs(stage, winners, tier) {
  const idx = stage === 'qf'
    ? (tier === 'elite' ? [[0, 7], [1, 6], [2, 5], [3, 4]] : [[0, 1], [2, 3], [4, 5], [6, 7]])
    : stage === 'sf' ? [[0, 1], [2, 3]] : [[0, 1]];
  return idx.map(([a, b]) => [winners[a], winners[b]]);
}

// Bangkitkan fixture babak gugur ACL untuk pekan ini (hanya jika pekan ini pekan KO & belum ada).
// ACL Two: 16 Besar/Perempat/Semifinal 2 leg (kandang dibalik di leg 2) + Final 1 laga.
// ACL Elite: semua babak 1 laga. Pemenang tie 2 leg dihitung agregat (+ penalti bila imbang).
export async function ensureAclKnockout(save) {
  const tier = aclTierKey(save);
  const cfg = aclKoStageOf(tier, save.matchday);
  if (!cfg) return;
  const comp = aclCompOf(save);
  // PENTING: filter per kompetisi — pekan KO (26-34) juga berisi laga Liga (pekan ganda),
  // jadi "belum ada" harus dihitung dari fixture ACL saja.
  const existing = await all('SELECT id FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND competition=?', [save.id, save.season, save.matchday, comp]);
  if (existing.length) return;
  let pairs = [];
  if (cfg.stage === 'r16') {
    if (cfg.leg === 1) pairs = await aclR16Pairs(save);
    else {
      const legs = await stageFixtures(save, 'r16');
      pairs = (legs[0] || []).map((f) => [f.away_id, f.home_id]); // leg 2: kandang dibalik
    }
  } else {
    const winners = await stageWinners(save, NEXT_STAGE[cfg.stage]);
    pairs = bracketPairs(cfg.stage, winners, tier);
  }
  pairs = pairs.filter(([h, a]) => h && a);
  if (!pairs.length) return; // klasemen fase grup belum lengkap (mis. karier format lama) -> lewati
  await batch(pairs.map(([h, a]) => stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,?,?,?,?,?)', [save.id, save.season, save.matchday, h, a, comp])));
}

// ===== Fast-forward pekan tanpa laga user =====
// Jaring pengaman: kalau user tidak punya laga belum dimainkan di pekan ini (mis. karier
// format lama / pekan KO yang tidak diikuti), semua laga klub lain (termasuk KO ACL) tetap
// disimulasikan sehingga juara ACL selalu ditentukan, lalu matchday dimajukan sampai user
// punya laga lagi atau musim tuntas (matchday > 34). Tanpa ini karier bisa "nyangkut"
// selamanya: next-fixture = finished, tapi next-season menuntut Pekan > 34.
export async function fastForwardSeason(save) {
  const clubs = await clubMap();
  for (let guard = 0; guard < 40 && save.matchday <= LEAGUE_MATCHDAYS; guard++) {
    const mine = await get('SELECT id FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND played=0 AND (home_id=? OR away_id=?) LIMIT 1', [save.id, save.season, save.matchday, save.club_id, save.club_id]);
    if (mine) break; // user punya laga belum dimainkan di pekan ini -> lanjut normal
    await ensureAclKnockout(save); // bangkitkan KO ACL utk pekan ini bila perlu
    const fixtures = (await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? ORDER BY id', [save.id, save.season, save.matchday])).filter((f) => !f.played);
    const scores = [];
    for (const f of fixtures) {
      const homeXI = (await autoXI(save.id, f.home_id, '4-4-2', 'balanced')).xi;
      const awayXI = (await autoXI(save.id, f.away_id, '4-4-2', 'balanced')).xi;
      const t = { formation: '4-4-2', mentality: 'balanced' };
      const res = simulateMatch({ home: homeXI, away: awayXI, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, homeTactic: t, awayTactic: t });
      await run('UPDATE fixtures SET played=1, home_goals=?, away_goals=?, events_json=? WHERE id=?', [res.homeGoals, res.awayGoals, JSON.stringify([]), f.id]);
      if (f.competition === 'league') {
        await bumpStanding(save.id, f.home_id, res.homeGoals, res.awayGoals);
        await bumpStanding(save.id, f.away_id, res.awayGoals, res.homeGoals);
      }
      scores.push(clubs[f.home_id].short_name + ' ' + res.homeGoals + '-' + res.awayGoals + ' ' + clubs[f.away_id].short_name);
    }
    await run('UPDATE players SET injured_weeks = injured_weeks - 1 WHERE injured_weeks > 0 AND save_id = ?', [save.id]);
    if (scores.length) {
      const stage = aclStageLabel(aclTierKey(save), save.matchday);
      await run('INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?,?,?,?,?)', [
        save.id,
        'MD' + save.matchday,
        stage ? (stage + ' ACL (fast-forward)') : ('Pekan ' + save.matchday + ' selesai'),
        scores.join(' • '),
        'HASIL'
      ]);
    }
    save.matchday += 1;
    await run("UPDATE careers SET matchday=?, updated_at=datetime('now') WHERE id=?", [save.matchday, save.id]);
  }
  return save;
}

async function xiFor(save, clubId, lineupIds, formation, mentality) {
  const mySquad = await squad(save.id, clubId);
  const byId = {};
  for (const p of mySquad) byId[p.id] = p;
  let mine = (lineupIds || []).map((id) => byId[id]).filter(Boolean).filter((p) => p.injured_weeks === 0);
  if (mine.length < 11) {
    const auto = (await autoXI(save.id, clubId, formation, mentality)).xi;
    for (const p of auto) { if (mine.length >= 11) break; if (!mine.find((x) => x.id === p.id)) mine.push(p); }
  }
  return mine.slice(0, 11);
}

async function oppAutoSub(saveId, oppXI, oppId, oppSide, oppShort, minute) {
  const oppSquad = await squad(saveId, oppId);
  const bench = oppSquad.filter((p) => !oppXI.find((x) => x.id === p.id) && p.injured_weeks === 0);
  if (!bench.length) return null;
  const outPool = oppXI.filter((p) => p.pos !== 'GK');
  const out = outPool[Math.floor(Math.random() * outPool.length)];
  const same = bench.filter((p) => p.pos === out.pos);
  const inn = (same.length ? same : bench)[Math.floor(Math.random() * (same.length ? same.length : bench.length))];
  if (!out || !inn) return null;
  const ni = oppXI.findIndex((p) => p.id === out.id);
  oppXI[ni] = inn;
  const SUB_TXT = [
    "Pergantian lawan! Yang keluar pasrah, yang masuk sumringah!",
    "Sub lawan! Pemain keluar sambil nge-check baterai - habis!",
    "Lawan ganti pemain! Yang masuk langsung senyum-senyum gak jelas!",
    "Pergantian! Pelatih lawan mutusin pakai otak, katanya!"
  ];
  return { minute: minute, type: 'sub', team: oppSide, outName: out.name, inName: inn.name, text: minute + "' " + SUB_TXT[Math.floor(Math.random() * SUB_TXT.length)] + ' (' + out.name + ' ➡️ ' + inn.name + ')' };
}

export async function playMatchdayFirstHalf(save) {
  await ensureAclKnockout(save); // babak gugur ACL dibangkitkan otomatis di pekan KO (data.js)
  // User tidak punya laga belum dimainkan di pekan ini? Fast-forward pekan-pekan AI dulu
  // supaya turnamen tetap berjalan dan musim benar-benar tuntas (matchday > 34), bukan
  // nyangkut selamanya.
  const mineNow = await get('SELECT id FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND played=0 AND (home_id=? OR away_id=?) LIMIT 1', [save.id, save.season, save.matchday, save.club_id, save.club_id]);
  if (!mineNow && save.matchday <= LEAGUE_MATCHDAYS) {
    save = await fastForwardSeason(save);
    await ensureAclKnockout(save);
  }
  const clubs = await clubMap();
  // PENTING: hanya simulasi fixture yang BELUM dimainkan (penting untuk pekan ganda
  // yang diputar bergantian — laga pertama sudah played dan tidak boleh diulang).
  const fixtures = (await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? ORDER BY id', [save.id, save.season, save.matchday])).filter((f) => !f.played);
  if (!fixtures.length) {
    const champ = await get('SELECT c.* FROM standings_cache s JOIN clubs c ON c.id=s.club_id WHERE s.save_id=? ORDER BY s.points DESC, s.gd DESC, s.gf DESC', [save.id]);
    // Juara ACL Two: pemenang Final (Pekan 21)
    const fin = await get("SELECT * FROM fixtures WHERE save_id=? AND season=? AND competition IN ('acl_two','acl_elite') AND matchday=? AND played=1", [save.id, save.season, LEAGUE_MATCHDAYS]);
    const aclChampion = fin ? clubs[koWinner(fin, clubs)] || null : null;
    return { done: true, champion: champ, aclChampion, aclStage: 'Selesai' };
  }
  // Pekan ganda (liga + ACL di pekan yang sama): laga user dimainkan BERGANTIAN satu per satu
  // agar tidak tumpang tindih — laga liga dulu, laga ACL jadi main berikutnya di pekan yang sama.
  const userFixtures = fixtures.filter((f) => f.home_id === save.club_id || f.away_id === save.club_id);
  const mainFixtureId = userFixtures.length ? (userFixtures.find((f) => f.competition === 'league') || userFixtures[0]).id : null;
  const lineupIds = JSON.parse(save.lineup_json || '[]');
  let userResult = null;
  const others = [];
  const halfTimeState = [];
  for (const f of fixtures) {
    const isUser = f.home_id === save.club_id || f.away_id === save.club_id;
    if (isUser && f.id !== mainFixtureId) continue; // laga user kedua (ACL) ditunda, tidak disimulasikan sekarang
    let homeXI; let awayXI; let homeT; let awayT;
    if (isUser) {
      const isHome = f.home_id === save.club_id;
      const myT = { formation: save.formation, mentality: save.mentality };
      const mine = await xiFor(save, save.club_id, lineupIds, save.formation, save.mentality);
      const opp = (await autoXI(save.id, isHome ? f.away_id : f.home_id, '4-4-2', 'balanced')).xi;
      homeXI = isHome ? mine : opp;
      awayXI = isHome ? opp : mine;
      homeT = isHome ? myT : { formation: '4-4-2', mentality: 'balanced' };
      awayT = isHome ? { formation: '4-4-2', mentality: 'balanced' } : myT;
    } else {
      homeXI = (await autoXI(save.id, f.home_id, '4-4-2', 'balanced')).xi;
      awayXI = (await autoXI(save.id, f.away_id, '4-4-2', 'balanced')).xi;
      homeT = { formation: '4-4-2', mentality: 'balanced' };
      awayT = { formation: '4-4-2', mentality: 'balanced' };
    }
    const h1 = simulateHalf({ home: homeXI, away: awayXI, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, homeTactic: homeT, awayTactic: awayT, from: 1, to: 45 });
    halfTimeState.push({ fixtureId: f.id, isUser, homeXIIds: homeXI.map((p) => p.id), awayXIIds: awayXI.map((p) => p.id), h1 });
    // Pekan ganda (liga + ACL di pekan yang sama): laga LIGA jadi laga interaktif utama user,
    // laga ACL user ikut disimulasikan & tampil di daftar "Laga lain".
    const isUserMain = isUser && (!userResult || f.competition === 'league');
    if (isUserMain) {
      userResult = { fixture: { ...f, home: clubs[f.home_id], away: clubs[f.away_id] }, userSide: f.home_id === save.club_id ? 'home' : 'away', homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, homeGoals: h1.homeGoals, awayGoals: h1.awayGoals, userGoals: f.home_id === save.club_id ? h1.homeGoals : h1.awayGoals, oppGoals: f.home_id === save.club_id ? h1.awayGoals : h1.homeGoals, oppName: f.home_id === save.club_id ? clubs[f.away_id].short_name : clubs[f.home_id].short_name, events: h1.events, xg: h1.xg, halfTime: true };
    } else {
      others.push({ home: clubs[f.home_id].short_name, away: clubs[f.away_id].short_name, hg: h1.homeGoals, ag: h1.awayGoals, halfTime: true });
    }
  }
  return { userResult, others, halfTimeState };
}

export async function playMatchdaySecondHalf(save, body) {
  const clubs = await clubMap();
  const halfTimeState = body.halfTimeState || [];
  if (!halfTimeState.length) return await playMatchdayFirstHalf(save);
  let userResult = null;
  const others = [];
  let simulated = 0; // jumlah fixture yang BENAR-BENAR disimulasikan di panggilan ini
  for (const hs of halfTimeState) {
    const f = await get('SELECT * FROM fixtures WHERE id=? AND save_id=?', [hs.fixtureId, save.id]);
    if (!f) continue;
    if (f.played) continue; // safety retry: fixture yang sudah tersimpan jangan di-simulasi ulang (hindari skor dobel)
    simulated++;
    const isUser = hs.isUser;
        const h1 = hs.h1 || { homeGoals: 0, awayGoals: 0, events: [], scorers: { home: {}, away: {} }, xg: { home: 0, away: 0 } };
    const h1s = h1.scorers || { home: {}, away: {} };
    const lineupIds2 = JSON.parse(save.lineup_json || '[]');
    let homeXI2; let awayXI2; let homeT; let awayT;
    if (isUser) {
      const isHome = f.home_id === save.club_id;
      const myT = { formation: save.formation, mentality: save.mentality };
      const mine2 = await xiFor(save, save.club_id, lineupIds2, save.formation, save.mentality);
      const opp = (await autoXI(save.id, isHome ? f.away_id : f.home_id, '4-4-2', 'balanced')).xi;
      homeXI2 = isHome ? mine2 : opp;
      awayXI2 = isHome ? opp : mine2;
      homeT = isHome ? myT : { formation: '4-4-2', mentality: 'balanced' };
      awayT = isHome ? { formation: '4-4-2', mentality: 'balanced' } : myT;
    } else {
      homeXI2 = (await autoXI(save.id, f.home_id, '4-4-2', 'balanced')).xi;
      awayXI2 = (await autoXI(save.id, f.away_id, '4-4-2', 'balanced')).xi;
      homeT = { formation: '4-4-2', mentality: 'balanced' };
      awayT = { formation: '4-4-2', mentality: 'balanced' };
    }
    const h2 = simulateHalf({ home: homeXI2, away: awayXI2, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, homeTactic: homeT, awayTactic: awayT, from: 46, to: 90 });
    const hg = h1.homeGoals + h2.homeGoals;
    const ag = h1.awayGoals + h2.awayGoals;
    const res = { homeGoals: hg, awayGoals: ag, events: h1.events.concat(h2.events), scorers: { home: {}, away: {} }, xg: { home: +((h1.xg.home + h2.xg.home) / 2).toFixed(2), away: +((h1.xg.away + h2.xg.away) / 2).toFixed(2) }, halves: { h1xg: h1.xg, h2xg: h2.xg } };
        for (const k of Object.keys(h1s.home)) res.scorers.home[k] = (res.scorers.home[k] || 0) + h1s.home[k];
    for (const k of Object.keys(h2.scorers.home)) res.scorers.home[k] = (res.scorers.home[k] || 0) + h2.scorers.home[k];
    for (const k of Object.keys(h1s.away)) res.scorers.away[k] = (res.scorers.away[k] || 0) + h1s.away[k];
    for (const k of Object.keys(h2.scorers.away)) res.scorers.away[k] = (res.scorers.away[k] || 0) + h2.scorers.away[k];
    let tail = 'Imbang bestie!';
    if (hg > ag) tail = clubs[f.home_id].short_name + ' menang! Horeg!';
    if (ag > hg) tail = clubs[f.away_id].short_name + ' mencuri 3 poin! Cold!';
    res.events.push({ minute: 90, type: 'fulltime', team: 'none', text: 'FT: ' + clubs[f.home_id].short_name + ' ' + hg + ' - ' + ag + ' ' + clubs[f.away_id].short_name + '! ' + tail });
    if (isUser && f.competition === 'league') {
      const oppSide = f.home_id === save.club_id ? 'away' : 'home';
      const oppShort = f.home_id === save.club_id ? clubs[f.away_id].short_name : clubs[f.home_id].short_name;
      const oppId = f.home_id === save.club_id ? f.away_id : f.home_id;
      const oppArr = f.home_id === save.club_id ? awayXI2 : homeXI2;
      const s1 = await oppAutoSub(save.id, oppArr, oppId, oppSide, oppShort, 58 + Math.floor(Math.random() * 5));
      if (s1) res.events.push(s1);
      const s2 = await oppAutoSub(save.id, oppArr, oppId, oppSide, oppShort, 71 + Math.floor(Math.random() * 6));
      if (s2) res.events.push(s2);
      res.events.sort(function (a, b) { return a.minute - b.minute; });
    }
        await run('UPDATE fixtures SET played=1, home_goals=?, away_goals=?, events_json=? WHERE id=?',
      [res.homeGoals, res.awayGoals, JSON.stringify(isUser ? res.events : []), f.id]);
    // Hanya update standings_cache untuk liga; ACL Two/Elite standings dihitung dari fixtures
    if (f.competition === 'league') {
      await bumpStanding(save.id, f.home_id, res.homeGoals, res.awayGoals);
      await bumpStanding(save.id, f.away_id, res.awayGoals, res.homeGoals);
    }
    await pm2(homeXI2, 'home', res);
    await pm2(awayXI2, 'away', res);
    if (isUser && (!userResult || f.competition === 'league')) userResult = { fixture: { ...f, home: clubs[f.home_id], away: clubs[f.away_id] }, userSide: f.home_id === save.club_id ? 'home' : 'away', homeGoals: res.homeGoals, awayGoals: res.awayGoals, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, userGoals: f.home_id === save.club_id ? res.homeGoals : res.awayGoals, oppGoals: f.home_id === save.club_id ? res.awayGoals : res.homeGoals, oppName: f.home_id === save.club_id ? clubs[f.away_id].short_name : clubs[f.home_id].short_name, events: res.events, xg: res.xg };
    else others.push({ home: clubs[f.home_id].short_name, away: clubs[f.away_id].short_name, hg: res.homeGoals, ag: res.awayGoals });
  }
  if (!simulated) {
    // SEMUA fixture sudah dimainkan -> ini dobel POST / retry jaringan. JANGAN geser
    // matchday, jangan insert berita dobel, jangan pulihkan cedera 2x (integritas data).
    // Kembalikan state terkini agar client bisa lanjut normal.
    const cur = await get('SELECT * FROM careers WHERE id=?', [save.id]);
    const md = cur ? cur.matchday : save.matchday;
    return { userResult: null, others: [], nextMatchday: md, pendingUserFixture: false, finished: md > LEAGUE_MATCHDAYS, duplicate: true };
  }
  await run('UPDATE players SET injured_weeks = injured_weeks - 1 WHERE injured_weeks > 0 AND save_id = ?', [save.id]);
  await run('INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?,?,?,?,?)', [
    save.id,
    'MD' + save.matchday,
    userResult ? ('Pekan ' + save.matchday + ': ' + userResult.fixture.home.short_name + ' ' + userResult.homeGoals + '-' + userResult.awayGoals + ' ' + userResult.fixture.away.short_name) : ('Pekan ' + save.matchday + ' selesai'),
    userResult ? ('xG ' + userResult.xg.home + '-' + userResult.xg.away + '. Kiper lawan sampai kram kaki, gila serem!') : 'Semua laga pekan ini tuntas. Yang kalah, semangat cuci kaos ya!',
    'HASIL'
  ]);
  // Pekan ganda: jika tim user masih punya laga yang BELUM dimainkan di matchday ini
  // (mis. laga ACL setelah laga liga), jangan naik matchday — laga itu jadi main berikutnya.
  const rem = await get('SELECT COUNT(*) AS c FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND played=0 AND (home_id=? OR away_id=?)', [save.id, save.season, save.matchday, save.club_id, save.club_id]);
  const hasPendingUserFixture = rem && Number(rem.c) > 0;
  const next = hasPendingUserFixture ? save.matchday : save.matchday + 1;
  await run("UPDATE careers SET matchday=?, updated_at=datetime('now') WHERE id=?", [next, save.id]);
  return { userResult: userResult, others: others, nextMatchday: next, pendingUserFixture: hasPendingUserFixture, finished: next > LEAGUE_MATCHDAYS };
}
