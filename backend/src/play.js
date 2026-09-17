import { all, get, run } from './db.js';
import { simulateHalf } from './sim.js';
import { clubMap, squad, autoXI } from './game.js';
import { applyPostMatch as pm2 } from './postmatch.js';
import { ACL_GROUPS } from './data.js';

// ===== Babak gugur ACL Two (dinamis) =====
// 16 Besar = Pekan 18, Perempat Final = 19, Semifinal = 20, Final = 21.
const ACL_KO_STAGE = { 18: '16 Besar', 19: 'Perempat Final', 20: 'Semifinal', 21: 'Final' };

// Pemenang laga gugur; jika imbang -> "adu penalti" acak berbobot kekuatan klub.
function koWinner(f, clubs) {
  if (f.home_goals > f.away_goals) return f.home_id;
  if (f.away_goals > f.home_goals) return f.away_id;
  const sh = (clubs[f.home_id] && clubs[f.home_id].strength) || 80;
  const sa = (clubs[f.away_id] && clubs[f.away_id].strength) || 80;
  return Math.random() < sh / (sh + sa) ? f.home_id : f.away_id;
}

// Klasemen internal tiap grup dari fixture fase grup (matchday <= 17, sudah dimainkan).
async function aclGroupTables(save) {
  const rows = await all("SELECT * FROM fixtures WHERE save_id=? AND competition='acl_two' AND matchday <= 17 AND played=1", [save.id]);
  const groupOf = {};
  for (const g of ACL_GROUPS) for (const id of g.ids) groupOf[id] = g.name;
  const tables = {};
  for (const g of ACL_GROUPS) tables[g.name] = {};
  for (const f of rows) {
    for (const [id, gf, ga] of [[f.home_id, f.home_goals, f.away_goals], [f.away_id, f.away_goals, f.home_goals]]) {
      if (!tables[groupOf[id]]) continue;
      if (!tables[groupOf[id]][id]) tables[groupOf[id]][id] = { pl: 0, gf: 0, ga: 0, pts: 0 };
      const t = tables[groupOf[id]][id];
      t.pl++; t.gf += gf; t.ga += ga;
      if (gf > ga) t.pts += 3; else if (gf === ga) t.pts += 1;
    }
  }
  const rank = (t) => Object.entries(t).map(([id, v]) => ({ id: Number(id), ...v })).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  return Object.fromEntries(Object.entries(tables).map(([g, t]) => [g, rank(t)]));
}

// Bangkitkan fixture babak gugur utk save.matchday (18-21) jika belum ada.
export async function ensureAclKnockout(save) {
  const stage = ACL_KO_STAGE[save.matchday];
  if (!stage) return;
  const existing = await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=?', [save.id, save.season, save.matchday]);
  if (existing.length) return;
  const clubs = await clubMap();
  let pairs = [];
  if (save.matchday === 18) {
    // 16 besar: juara grup vs runner-up grup bersebelahan (juara jadi tuan rumah).
    const tables = await aclGroupTables(save);
    const W = {}, R = {};
    for (const g of Object.keys(tables)) { W[g] = tables[g][0].id; R[g] = tables[g][1].id; }
    pairs = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H'], ['B', 'A'], ['D', 'C'], ['F', 'E'], ['H', 'G']].map(([w, r]) => [W[w], R[r]]);
  } else {
    const prev = await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND played=1 ORDER BY id', [save.id, save.season, save.matchday - 1]);
    const winners = prev.map((f) => koWinner(f, clubs));
    if (save.matchday === 19) pairs = [[0, 1], [2, 3], [4, 5], [6, 7]];
    else if (save.matchday === 20) pairs = [[0, 1], [2, 3]];
    else pairs = [[0, 1]];
    pairs = pairs.map(([a, b]) => [winners[a], winners[b]]);
  }
  for (const [h, a] of pairs) {
    await run('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,?,?,?,?,?)', [save.id, save.season, save.matchday, h, a, 'acl_two']);
  }
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
  await ensureAclKnockout(save); // babak gugur ACL dibangkitkan otomatis saat Pekan 18-21
  const clubs = await clubMap();
  // PENTING: hanya simulasi fixture yang BELUM dimainkan (penting untuk pekan ganda
  // yang diputar bergantian — laga pertama sudah played dan tidak boleh diulang).
  const fixtures = (await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? ORDER BY id', [save.id, save.season, save.matchday])).filter((f) => !f.played);
  if (!fixtures.length) {
    const champ = await get('SELECT c.* FROM standings_cache s JOIN clubs c ON c.id=s.club_id WHERE s.save_id=? ORDER BY s.points DESC, s.gd DESC, s.gf DESC', [save.id]);
    // Juara ACL Two: pemenang Final (Pekan 21)
    const fin = await get("SELECT * FROM fixtures WHERE save_id=? AND competition='acl_two' AND matchday=21 AND played=1", [save.id]);
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
    // Hanya update standings_cache untuk liga; ACL Two standings dihitung dari fixtures
    if (f.competition !== 'acl_two') {
      await bump(save.id, f.home_id, res.homeGoals, res.awayGoals);
      await bump(save.id, f.away_id, res.awayGoals, res.homeGoals);
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
    return { userResult: null, others: [], nextMatchday: md, pendingUserFixture: false, finished: md > 23, duplicate: true };
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
  return { userResult: userResult, others: others, nextMatchday: next, pendingUserFixture: hasPendingUserFixture, finished: next > 23 };
}

async function bump(saveId, clubId, gf, ga) {
  const won = gf > ga ? 1 : 0;
  const drawn = gf === ga ? 1 : 0;
  const lost = gf < ga ? 1 : 0;
  const pts = won ? 3 : drawn ? 1 : 0;
  await run('UPDATE standings_cache SET played=played+1, won=won+?, drawn=drawn+?, lost=lost+?, gf=gf+?, ga=ga+?, gd=gd+?, points=points+? WHERE save_id=? AND club_id=?',
    [won, drawn, lost, gf, ga, gf - ga, pts, saveId, clubId]);
}
