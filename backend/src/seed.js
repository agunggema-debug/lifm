import { db, initSchema, stmt, all, get, run, batch, exec } from './db.js';
import { CLUBS, FIRST, LAST, FOREIGN, SQUAD_CORES } from './data.js';

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v) { return Math.max(35, Math.min(99, Math.round(v))); }

function overall(p) {
  if (p.pos === 'GK') return Math.round(p.gk * 0.7 + p.def * 0.15 + p.pas * 0.15);
  if (p.pos === 'DF') return Math.round(p.def * 0.55 + p.pac * 0.2 + p.pas * 0.15 + p.sta * 0.1);
  if (p.pos === 'MF') return Math.round(p.pas * 0.45 + p.sta * 0.2 + p.pac * 0.15 + p.sho * 0.2);
  return Math.round(p.sho * 0.5 + p.pac * 0.25 + p.pas * 0.15 + p.sta * 0.1);
}

function mkPlayer(clubId, pos, base, foreign, over) {
  over = over || {};
  const name = over.name || (foreign ? pick(FOREIGN) : pick(FIRST) + ' ' + pick(LAST));
  const spread = 12;
  const p = {
    club_id: clubId, name, pos, age: pos === 'GK' ? rnd(20, 36) : rnd(17, 35),
    is_foreign: foreign ? 1 : 0,
    pac: clamp(base + rnd(-spread, spread) + (pos === 'FW' ? 6 : 0)),
    sho: clamp(base + rnd(-spread, spread) + (pos === 'FW' ? 8 : pos === 'MF' ? 2 : -12)),
    pas: clamp(base + rnd(-spread, spread) + (pos === 'MF' ? 6 : 0)),
    def: clamp(base + rnd(-spread, spread) + (pos === 'DF' ? 8 : pos === 'GK' ? 4 : -10)),
    gk: pos === 'GK' ? clamp(base + rnd(-8, 10)) : rnd(25, 45),
    sta: clamp(base + rnd(-10, 8)),
    morale: rnd(65, 90)
  };
  const ovr = overall(p);
  p.market_value = Math.round((ovr ** 3.1) * 22 + rnd(0, 500000));
  p.wage = Math.round(ovr * 320 + rnd(2000, 20000));
  p.contract_years = rnd(1, 3);
  return { ...p, ovr };
}

export async function seedAll() {
  await initSchema();
  await exec('DELETE FROM players; DELETE FROM fixtures; DELETE FROM standings_cache; DELETE FROM news; DELETE FROM saves; DELETE FROM managers; DELETE FROM clubs;');
  const clubStmts = CLUBS.map((c) => stmt('INSERT INTO clubs (id,name,short_name,city,logo,color_primary,color_secondary,strength,budget,reputation) VALUES (@id,@name,@short_name,@city,@logo,@color_primary,@color_secondary,@strength,@budget,@reputation)', c));
  await batch(clubStmts);
  const playerStmts = [];
  const used = new Set();
  const TARGET = { GK: 2, DF: 8, MF: 8, FW: 6 };
  const FQUOTA = { GK: 0, DF: 1, MF: 2, FW: 3 };
  for (const c of CLUBS) {
    const cores = SQUAD_CORES[c.id] || [];
    const byPos = { GK: [], DF: [], MF: [], FW: [] };
    for (const co of cores) { if (byPos[co.p]) byPos[co.p].push(co); }
    for (const pos of Object.keys(TARGET)) {
      const list = byPos[pos].slice(0, TARGET[pos]);
      for (const co of list) {
        const pl = mkPlayer(c.id, pos, c.strength, !!co.f, { name: co.n });
        used.add(pl.name);
        playerStmts.push(playerInsert(pl));
      }
      const need = TARGET[pos] - list.length;
      const coreF = list.filter((x) => x.f).length;
      let gi = 0;
      for (let i = 0; i < need; i++) {
        const foreign = gi < Math.max(0, FQUOTA[pos] - coreF);
        gi++;
        let pl = mkPlayer(c.id, pos, c.strength, foreign, {});
        let guard = 0;
        while (used.has(pl.name) && guard++ < 10) pl = mkPlayer(c.id, pos, c.strength, foreign, {});
        used.add(pl.name);
        playerStmts.push(playerInsert(pl));
      }
    }
    playerStmts.push(stmt('INSERT INTO standings_cache (club_id) VALUES (?)', [c.id]));
  }
  await batch(playerStmts);
  await batch(makeFixtures());
  await run("INSERT INTO news (day_label,title,body,tag) VALUES ('Pra-musim','Selamat datang di Liga Indonesia FM!','Pilih klub favoritmu, atur taktik, dan bawa mereka juara. Gas!','INFO')");
}

function playerInsert(p) {
  return stmt(`INSERT INTO players (club_id,name,pos,age,is_foreign,pac,sho,pas,def,gk,sta,morale,market_value,wage,contract_years)
    VALUES (@club_id,@name,@pos,@age,@is_foreign,@pac,@sho,@pas,@def,@gk,@sta,@morale,@market_value,@wage,@contract_years)`, p);
}

function makeFixtures() {
  const ids = CLUBS.map((c) => c.id);
  const arr = ids.slice(1);
  let round = [];
  const teams = [ids[0], ...arr];
  // circle method single round robin 17 matchdays
  const fixed = teams.slice();
  for (let md = 1; md <= 17; md++) {
    for (let i = 0; i < 9; i++) {
      const a = fixed[i]; const b = fixed[17 - i];
      const flip = md % 2 === 0;
      round.push({ md, h: flip ? b : a, a: flip ? a : b });
    }
    // rotate
    fixed.splice(1, 0, fixed.pop());
  }
  return round.map((f) => stmt('INSERT INTO fixtures (season,matchday,home_id,away_id) VALUES (1,?,?,?)', [f.md, f.h, f.a]));
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedAll().then(() => console.log('Seed OK: 18 clubs, 432 players, 153 fixtures')).catch((e) => { console.error(e); process.exit(1); });
}
