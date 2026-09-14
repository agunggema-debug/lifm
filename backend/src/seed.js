import { db, initSchema, stmt, all, get, run, batch, exec } from './db.js';
import { CLUBS, FIRST, LAST, FOREIGN, SQUAD_CORES, ACL_CLUB_IDS, ACL_FOREIGN_NAMES, ACL_LOCAL_NAMES } from './data.js';

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v) { return Math.max(35, Math.min(99, Math.round(v))); }

function overall(p) {
  if (p.pos === 'GK') return Math.round(p.gk * 0.7 + p.def * 0.15 + p.pas * 0.15);
  if (p.pos === 'DF') return Math.round(p.def * 0.55 + p.pac * 0.2 + p.pas * 0.15 + p.sta * 0.1);
  if (p.pos === 'MF') return Math.round(p.pas * 0.45 + p.sta * 0.2 + p.pac * 0.15 + p.sho * 0.2);
  return Math.round(p.sho * 0.5 + p.pac * 0.25 + p.pas * 0.15 + p.sta * 0.1);
}

// Generate nama pemain untuk klub ACL Two (Korea/Australia/Vietnam)
function aclPlayerName(clubId) {
  const fn = ACL_FOREIGN_NAMES[clubId] || [];
  const ln = ACL_LOCAL_NAMES[clubId] || [];
  if (fn.length === 0) return pick(FIRST) + ' ' + pick(LAST);
  if (Math.random() < 0.6) return pick(fn);
  if (ln.length >= 2) return pick(fn) + ' ' + pick(ln);
  return pick(FIRST) + ' ' + pick(LAST);
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
  const clubStmts = CLUBS.map((c) => stmt('INSERT INTO clubs (id,name,short_name,city,logo,color_primary,color_secondary,strength,budget,reputation) VALUES (?,?,?,?,?,?,?,?,?,?)', [c.id, c.name, c.short_name, c.city, c.logo, c.color_primary, c.color_secondary, c.strength, c.budget, c.reputation]));
  await batch(clubStmts);
  const playerStmts = [];
  const used = new Set();
  const TARGET = { GK: 2, DF: 8, MF: 8, FW: 6 };
    const FQUOTA = { GK: 0, DF: 1, MF: 2, FW: 3 };
  for (const c of CLUBS) {
    const isAcl = ACL_CLUB_IDS.includes(c.id);
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
        // Klub ACL Two: semua pemain dianggap asing (f=1) dan pakai nama ACL
        const foreign = isAcl ? true : gi < Math.max(0, FQUOTA[pos] - coreF);
        gi++;
        const nameOverride = isAcl ? { name: aclPlayerName(c.id) } : {};
        let pl = mkPlayer(c.id, pos, c.strength, foreign, nameOverride);
        let guard = 0;
        while (used.has(pl.name) && guard++ < 10) pl = mkPlayer(c.id, pos, c.strength, foreign, isAcl ? { name: aclPlayerName(c.id) } : {});
        used.add(pl.name);
        playerStmts.push(playerInsert(pl));
      }
    }
    playerStmts.push(stmt('INSERT INTO standings_cache (club_id) VALUES (?)', [c.id]));
  }
  await batch(playerStmts);
  await batch(makeFixtures());
  await batch(makeAclFixtures());
  await run("INSERT INTO news (day_label,title,body,tag) VALUES ('Pra-musim','Selamat datang di Liga Indonesia FM!','Pilih klub favoritmu, atur taktik, dan bawa mereka juara. Gas!','INFO')");
}

function playerInsert(p) {
  return stmt('INSERT INTO players (club_id,name,pos,age,is_foreign,pac,sho,pas,def,gk,sta,morale,market_value,wage,contract_years) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [p.club_id, p.name, p.pos, p.age, p.is_foreign, p.pac, p.sho, p.pas, p.def, p.gk, p.sta, p.morale, p.market_value, p.wage, p.contract_years]);
}

function makeFixtures() {
  // Hanya klub BRI Super League (id 1-18); klub ACL Two (id 19-21) khusus bertanding di ACL Two.
  const ids = CLUBS.filter((c) => c.id <= 18).map((c) => c.id);
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
  return round.map((f) => stmt('INSERT INTO fixtures (season,matchday,home_id,away_id,competition) VALUES (1,?,?,?,?)', [f.md, f.h, f.a, 'league']));
}

// ===== ACL Two 2026/27 Grup E =====
// 4 tim: Persib (2), FC Seoul (19), Melbourne Victory (20), Thé Công–Viettel (21)
// Home-away round-robin: tiap tim bertanding 6 kali vs 3 lawan = 12 fixture total.
// Matchday 18-23 (6 pekan ACL, masing-masing 2 laga).
// competition='acl_two' membedakan dari liga (competition='league', md 1-17).
function makeAclFixtures() {
  const ACL = [2, 19, 20, 21]; // Persib, FC Seoul, Melbourne Victory, Thé Công–Viettel
  const pairings = [
    // ACL MD1 (matchday 18)
    { md: 1, h: ACL[0], a: ACL[1] }, // Persib vs FC Seoul
    { md: 1, h: ACL[2], a: ACL[3] }, // Melbourne Victory vs Thé Công–Viettel
    // ACL MD2 (matchday 19)
    { md: 2, h: ACL[0], a: ACL[2] }, // Persib vs Melbourne Victory
    { md: 2, h: ACL[1], a: ACL[3] }, // FC Seoul vs Thé Công–Viettel
    // ACL MD3 (matchday 20)
    { md: 3, h: ACL[0], a: ACL[3] }, // Persib vs Thé Công–Viettel
    { md: 3, h: ACL[1], a: ACL[2] }, // FC Seoul vs Melbourne Victory
    // ACL MD4 (matchday 21) — leg 2
    { md: 4, h: ACL[1], a: ACL[0] }, // FC Seoul vs Persib
    { md: 4, h: ACL[3], a: ACL[2] }, // Thé Công–Viettel vs Melbourne Victory
    // ACL MD5 (matchday 22)
    { md: 5, h: ACL[2], a: ACL[0] }, // Melbourne Victory vs Persib
    { md: 5, h: ACL[3], a: ACL[1] }, // Thé Công–Viettel vs FC Seoul
    // ACL MD6 (matchday 23)
    { md: 6, h: ACL[3], a: ACL[0] }, // Thé Công–Viettel vs Persib
    { md: 6, h: ACL[2], a: ACL[1] }  // Melbourne Victory vs FC Seoul
  ];
  const START_MD = 18; // matchday dimulai setelah liga (17) selesai
  return pairings.map((f) => stmt(
    'INSERT INTO fixtures (season,matchday,home_id,away_id,competition) VALUES (1,?,?,?,?)',
    [START_MD + f.md - 1, f.h, f.a, 'acl_two']
  ));
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedAll().then(() => console.log('Seed OK: 21 clubs (18 liga + 3 ACL Two), 504 players, 165 fixtures (153 liga + 12 ACL Two)')).catch((e) => { console.error(e); process.exit(1); });
}
