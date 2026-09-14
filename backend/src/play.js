import { all, get, run } from './db.js';
import { simulateHalf } from './sim.js';
import { clubMap, squad, autoXI } from './game.js';
import { applyPostMatch as pm2 } from './postmatch.js';

async function xiFor(clubId, lineupIds, formation, mentality) {
  const mySquad = await squad(clubId);
  const byId = {};
  for (const p of mySquad) byId[p.id] = p;
  let mine = (lineupIds || []).map((id) => byId[id]).filter(Boolean).filter((p) => p.injured_weeks === 0);
  if (mine.length < 11) {
    const auto = (await autoXI(clubId, formation, mentality)).xi;
    for (const p of auto) { if (mine.length >= 11) break; if (!mine.find((x) => x.id === p.id)) mine.push(p); }
  }
  return mine.slice(0, 11);
}

async function oppAutoSub(oppXI, oppId, oppSide, oppShort, minute) {
  const oppSquad = await squad(oppId);
  const bench = oppSquad.filter((p) => !oppXI.find((x) => x.id === p.id) && p.injured_weeks === 0);
  if (!bench.length) return null;
  const outPool = oppXI.filter((p) => p.pos !== 'GK');
  const out = outPool[Math.floor(Math.random() * outPool.length)];
  const same = bench.filter((p) => p.pos === out.pos);
  const inn = (same.length ? same : bench)[Math.floor(Math.random() * (same.length ? same.length : bench.length))];
  if (!out || !inn) return null;
  const ni = oppXI.findIndex((p) => p.id === out.id);
  oppXI[ni] = inn;
  return { minute: minute, type: 'sub', team: oppSide, outName: out.name, inName: inn.name, text: minute + "' sub lawan." };
}

export async function playMatchdayFirstHalf(save) {
  const clubs = await clubMap();
  const fixtures = await all('SELECT * FROM fixtures WHERE season=? AND matchday=? ORDER BY id', [save.season, save.matchday]);
  if (!fixtures.length) {
    const champ = await get('SELECT c.* FROM standings_cache s JOIN clubs c ON c.id=s.club_id ORDER BY s.points DESC, s.gd DESC, s.gf DESC');
    return { done: true, champion: champ };
  }
  const lineupIds = JSON.parse(save.lineup_json || '[]');
  let userResult = null;
  const others = [];
  const halfTimeState = [];
  for (const f of fixtures) {
    const isUser = f.home_id === save.club_id || f.away_id === save.club_id;
    let homeXI; let awayXI; let homeT; let awayT;
    if (isUser) {
      const isHome = f.home_id === save.club_id;
      const myT = { formation: save.formation, mentality: save.mentality };
      const mine = await xiFor(save.club_id, lineupIds, save.formation, save.mentality);
      const opp = (await autoXI(isHome ? f.away_id : f.home_id, '4-4-2', 'balanced')).xi;
      homeXI = isHome ? mine : opp;
      awayXI = isHome ? opp : mine;
      homeT = isHome ? myT : { formation: '4-4-2', mentality: 'balanced' };
      awayT = isHome ? { formation: '4-4-2', mentality: 'balanced' } : myT;
    } else {
      homeXI = (await autoXI(f.home_id, '4-4-2', 'balanced')).xi;
      awayXI = (await autoXI(f.away_id, '4-4-2', 'balanced')).xi;
      homeT = { formation: '4-4-2', mentality: 'balanced' };
      awayT = { formation: '4-4-2', mentality: 'balanced' };
    }
    const h1 = simulateHalf({ home: homeXI, away: awayXI, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, homeTactic: homeT, awayTactic: awayT, from: 1, to: 45 });
    halfTimeState.push({ fixtureId: f.id, isUser, homeXIIds: homeXI.map((p) => p.id), awayXIIds: awayXI.map((p) => p.id), h1 });
    if (isUser) {
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
  for (const hs of halfTimeState) {
    const f = await get('SELECT * FROM fixtures WHERE id=?', [hs.fixtureId]);
    if (!f) continue;
    const isUser = hs.isUser;
        const h1 = hs.h1 || { homeGoals: 0, awayGoals: 0, events: [], scorers: { home: {}, away: {} }, xg: { home: 0, away: 0 } };
    const h1s = h1.scorers || { home: {}, away: {} };
    const lineupIds2 = JSON.parse(save.lineup_json || '[]');
    let homeXI2; let awayXI2; let homeT; let awayT;
    if (isUser) {
      const isHome = f.home_id === save.club_id;
      const myT = { formation: save.formation, mentality: save.mentality };
      const mine2 = await xiFor(save.club_id, lineupIds2, save.formation, save.mentality);
      const opp = (await autoXI(isHome ? f.away_id : f.home_id, '4-4-2', 'balanced')).xi;
      homeXI2 = isHome ? mine2 : opp;
      awayXI2 = isHome ? opp : mine2;
      homeT = isHome ? myT : { formation: '4-4-2', mentality: 'balanced' };
      awayT = isHome ? { formation: '4-4-2', mentality: 'balanced' } : myT;
    } else {
      homeXI2 = (await autoXI(f.home_id, '4-4-2', 'balanced')).xi;
      awayXI2 = (await autoXI(f.away_id, '4-4-2', 'balanced')).xi;
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
    if (isUser) {
      const oppSide = f.home_id === save.club_id ? 'away' : 'home';
      const oppShort = f.home_id === save.club_id ? clubs[f.away_id].short_name : clubs[f.home_id].short_name;
      const oppId = f.home_id === save.club_id ? f.away_id : f.home_id;
      const oppArr = f.home_id === save.club_id ? awayXI2 : homeXI2;
      const s1 = await oppAutoSub(oppArr, oppId, oppSide, oppShort, 58 + Math.floor(Math.random() * 5));
      if (s1) res.events.push(s1);
      const s2 = await oppAutoSub(oppArr, oppId, oppSide, oppShort, 71 + Math.floor(Math.random() * 6));
      if (s2) res.events.push(s2);
      res.events.sort(function (a, b) { return a.minute - b.minute; });
    }
        await run('UPDATE fixtures SET played=1, home_goals=?, away_goals=?, events_json=? WHERE id=?',
      [res.homeGoals, res.awayGoals, JSON.stringify(isUser ? res.events : []), f.id]);
    // Hanya update standings_cache untuk liga; ACL Two standings dihitung dari fixtures
    if (f.competition !== 'acl_two') {
      await bump(f.home_id, res.homeGoals, res.awayGoals);
      await bump(f.away_id, res.awayGoals, res.homeGoals);
    }
    await pm2(homeXI2, 'home', res);
    await pm2(awayXI2, 'away', res);
    if (isUser) userResult = { fixture: { ...f, home: clubs[f.home_id], away: clubs[f.away_id] }, userSide: f.home_id === save.club_id ? 'home' : 'away', homeGoals: res.homeGoals, awayGoals: res.awayGoals, homeName: clubs[f.home_id].short_name, awayName: clubs[f.away_id].short_name, userGoals: f.home_id === save.club_id ? res.homeGoals : res.awayGoals, oppGoals: f.home_id === save.club_id ? res.awayGoals : res.homeGoals, oppName: f.home_id === save.club_id ? clubs[f.away_id].short_name : clubs[f.home_id].short_name, events: res.events, xg: res.xg };
    else others.push({ home: clubs[f.home_id].short_name, away: clubs[f.away_id].short_name, hg: res.homeGoals, ag: res.awayGoals });
  }
  await run('UPDATE players SET injured_weeks = injured_weeks - 1 WHERE injured_weeks > 0');
  await run('INSERT INTO news (day_label,title,body,tag) VALUES (?,?,?,?)', [
    'MD' + save.matchday,
    userResult ? ('Pekan ' + save.matchday + ': ' + userResult.fixture.home.short_name + ' ' + userResult.homeGoals + '-' + userResult.awayGoals + ' ' + userResult.fixture.away.short_name) : ('Pekan ' + save.matchday + ' selesai'),
    userResult ? ('xG ' + userResult.xg.home + '-' + userResult.xg.away + '. Gas evaluasi taktik bestie!') : 'Semua laga pekan ini telah dimainkan.',
    'HASIL'
  ]);
  const next = save.matchday + 1;
  await run("UPDATE saves SET matchday=?, updated_at=datetime('now') WHERE id=1", [next]);
  return { userResult: userResult, others: others, nextMatchday: next, finished: next > 23 };
}

async function bump(clubId, gf, ga) {
  const won = gf > ga ? 1 : 0;
  const drawn = gf === ga ? 1 : 0;
  const lost = gf < ga ? 1 : 0;
  const pts = won ? 3 : drawn ? 1 : 0;
  await run('UPDATE standings_cache SET played=played+1, won=won+?, drawn=drawn+?, lost=lost+?, gf=gf+?, ga=ga+?, gd=gd+?, points=points+? WHERE club_id=?',
    [won, drawn, lost, gf, ga, gf - ga, pts, clubId]);
}
