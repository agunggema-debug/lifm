import { db, initSchema, stmt, all, get, run, batch, exec } from './db.js';
import { CLUBS, FIRST, LAST, FOREIGN, SQUAD_CORES, ACL_GROUPS, ACL_CLUB_IDS, ACL_FOREIGN_NAMES, ACL_LOCAL_NAMES } from './data.js';

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

// Klub bersifat GLOBAL & statis — hanya di-seed sekali (tidak dihapus saat user mulai karier).
export async function seedClubs() {
  await initSchema();
  const cnt = await get('SELECT COUNT(*) v FROM clubs');
  if (cnt && cnt.v >= 49) return; // sudah ter-seed
  const marker = await get("SELECT id FROM clubs WHERE name='Gangwon FC'");
  if (marker) return;
  await exec('DELETE FROM clubs;');
  const clubStmts = CLUBS.map((c) => stmt('INSERT INTO clubs (id,name,short_name,city,logo,color_primary,color_secondary,strength,budget,reputation) VALUES (?,?,?,?,?,?,?,?,?,?)', [c.id, c.name, c.short_name, c.city, c.logo, c.color_primary, c.color_secondary, c.strength, c.budget, c.reputation]));
  await batch(clubStmts);
}

// Membuat DUNIA PRIBADI untuk satu karier (pemain, jadwal, klasemen, berita).
// Setiap pengunjung punya dunia sendiri sehingga tidak saling mengganggu.
export async function seedWorld(saveId) {
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
        playerStmts.push(playerInsert(saveId, pl));
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
        playerStmts.push(playerInsert(saveId, pl));
      }
    }
    playerStmts.push(stmt('INSERT INTO standings_cache (save_id,club_id) VALUES (?,?)', [saveId, c.id]));
  }
  await batch(playerStmts);
  await batch(makeFixtures(saveId));
  await batch(makeAclFixtures(saveId));
  await run("INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?, 'Pra-musim',?,?, 'INFO')", [saveId, 'Selamat datang di Liga Indonesia FM!', 'Pilih klub favoritmu, atur taktik, dan bawa mereka juara. Gas!']);
}

// Kompatibilitas: seed dunia untuk save lama (id=1 / token kosong)
export async function seedAll() {
  await seedClubs();
  await seedWorld(1);
}

function playerInsert(saveId, p) {
  const cols = 'save_id,club_id,name,pos,age,is_foreign,pac,sho,pas,def,gk,sta,morale,market_value,wage,contract_years';
  const marks = cols.split(',').map(() => '?').join(',');
  return stmt('INSERT INTO players (' + cols + ') VALUES (' + marks + ')',
    [saveId, p.club_id, p.name, p.pos, p.age, p.is_foreign, p.pac, p.sho, p.pas, p.def, p.gk, p.sta, p.morale, p.market_value, p.wage, p.contract_years]);
}

function makeFixtures(saveId) {
  // Hanya klub Indonesia Super League (id 1-18); klub ACL Two (id 19-21) khusus bertanding di ACL Two.
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
  return round.map((f) => stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,1,?,?,?,?)', [saveId, f.md, f.h, f.a, 'league']));
}

// ===== ACL Two 2026/27: 8 grup (A-H) =====
// Fase grup: tiap grup home-away round-robin (6 ronde), digelar DI ANTARA pekan Indonesia Super
// League (pekan ganda) via ACL_MD_LEAGUE. 2 terbaik tiap grup -> babak gugur (16 Besar ->
// Perempat Final -> Semifinal -> Final) yang dibangkitkan dinamis di play.js (Pekan 18-21).
const ACL_MD_LEAGUE = { 1: 3, 2: 5, 3: 8, 4: 10, 5: 13, 6: 16 }; // ACL MD1=pekan 3, MD2=5, MD3=8, MD4=10, MD5=13, MD6=16
function makeAclFixtures(saveId) {
  // Ronde round-robin 4 tim (indeks dalam g.ids): leg 1 ronde 1-3, leg 2 ronde 4-6 (home/away dibalik).
  const ROUNDS = [
    { round: 1, pairs: [[0, 1], [2, 3]] },
    { round: 2, pairs: [[0, 2], [1, 3]] },
    { round: 3, pairs: [[0, 3], [1, 2]] },
    { round: 4, pairs: [[1, 0], [3, 2]] },
    { round: 5, pairs: [[2, 0], [3, 1]] },
    { round: 6, pairs: [[3, 0], [2, 1]] }
  ];
  const stmts = [];
  for (const g of ACL_GROUPS) {
    for (const r of ROUNDS) {
      for (const [h, a] of r.pairs) {
        stmts.push(stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,1,?,?,?,?)', [saveId, ACL_MD_LEAGUE[r.round], g.ids[h], g.ids[a], 'acl_two']));
      }
    }
  }
  return stmts;
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedAll().then(() => console.log('Seed OK: 49 clubs (18 liga + 31 ACL Two, 8 grup), 1176 players, 249 fixtures (153 liga + 96 ACL grup; 15 babak gugur dibangkitkan dinamis)')).catch((e) => { console.error(e); process.exit(1); });
}
