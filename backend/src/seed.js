import { db, initSchema, stmt, all, get, run, batch } from './db.js';
import { CLUBS, FIRST, LAST, FOREIGN, SQUAD_CORES, ACL_GROUPS, ACL_CLUB_IDS, aclNamePool, aclNameOrder, aclNameParts, ACL_ELITE_FIXTURES, ACL_TWO_GROUP_MD, ACL_ELITE_GROUP_MD, LEAGUE_ROUNDS, LEAGUE_MATCHDAYS } from './data.js';
import { clubMap } from './game.js';
import { koWinner } from './play.js';

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v) { return Math.max(35, Math.min(99, Math.round(v))); }

function overall(p) {
  if (p.pos === 'GK') return Math.round(p.gk * 0.7 + p.def * 0.15 + p.pas * 0.15);
  if (p.pos === 'DF') return Math.round(p.def * 0.55 + p.pac * 0.2 + p.pas * 0.15 + p.sta * 0.1);
  if (p.pos === 'MF') return Math.round(p.pas * 0.45 + p.sta * 0.2 + p.pac * 0.15 + p.sho * 0.2);
  return Math.round(p.sho * 0.5 + p.pac * 0.25 + p.pas * 0.15 + p.sta * 0.1);
}

// Generate nama pemain untuk klub ACL sesuai negara klubnya (pool di data.js).
// Tahap 1: pakai nama asli dari pool. Tahap 2 (kalau sudah terpakai di dunia karier):
// kombinasikan nama depan & nama keluarga dari pool negara yang sama (tetap otentik + unik).
// Klub ACL yang negaranya belum punya pool -> nama Indonesia (perilaku lama).
function aclPlayerName(clubId, used) {
  const pool = aclNamePool(clubId);
  if (!pool || pool.length === 0) return pick(FIRST) + ' ' + pick(LAST);
  const order = aclNameOrder(clubId);
  for (let i = 0; i < 8; i++) {
    const n = pick(pool);
    if (!used.has(n)) return n;
  }
  const parts = pool.map((n) => aclNameParts(n, order)).filter(Boolean);
  for (let i = 0; i < 80 && parts.length; i++) {
    const a = pick(parts);
    const b = pick(parts);
    const n = order === 'lf' ? a.last + ' ' + b.first : b.first + ' ' + a.last;
    if (!used.has(n)) return n;
  }
  return pick(pool);
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
  if (cnt && cnt.v >= CLUBS.length) return; // sudah ter-seed
  // Marker klub ACL Elite 2026/27: kalau belum ada, DB masih seed lama -> sinkronkan daftar klub.
  const marker = await get("SELECT id FROM clubs WHERE name='Kashima Antlers'");
  if (marker) return;
  // UPSERT (bukan DELETE): DB lama sudah punya players/fixtures/careers yang mereferensikan
  // id klub 1-49, jadi menghapus baris akan ditolak FOREIGN KEY. Data karier user tetap utuh.
  const clubStmts = CLUBS.map((c) => stmt(
    'INSERT INTO clubs (id,name,short_name,city,logo,color_primary,color_secondary,strength,budget,reputation) VALUES (?,?,?,?,?,?,?,?,?,?) '
    + 'ON CONFLICT(id) DO UPDATE SET name=excluded.name, short_name=excluded.short_name, city=excluded.city, logo=excluded.logo, '
    + 'color_primary=excluded.color_primary, color_secondary=excluded.color_secondary, strength=excluded.strength, '
    + 'budget=excluded.budget, reputation=excluded.reputation',
    [c.id, c.name, c.short_name, c.city, c.logo, c.color_primary, c.color_secondary, c.strength, c.budget, c.reputation]
  ));
  await batch(clubStmts);
  // Klub yang sudah tidak ada di daftar terbaru dibuang — tapi hanya kalau belum dipakai data karier.
  const keep = CLUBS.map((c) => c.id).join(',');
  await run('DELETE FROM clubs WHERE id NOT IN (' + keep + ')'
    + ' AND id NOT IN (SELECT DISTINCT club_id FROM players)'
    + ' AND id NOT IN (SELECT DISTINCT home_id FROM fixtures)'
    + ' AND id NOT IN (SELECT DISTINCT away_id FROM fixtures)'
    + ' AND id NOT IN (SELECT DISTINCT club_id FROM careers)');
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
        // Klub ACL (Two/Elite): semua pemain dianggap asing (f=1) dan pakai nama sesuai negara klub
        const foreign = isAcl ? true : gi < Math.max(0, FQUOTA[pos] - coreF);
        gi++;
        const nameOverride = isAcl ? { name: aclPlayerName(c.id, used) } : {};
        let pl = mkPlayer(c.id, pos, c.strength, foreign, nameOverride);
        let guard = 0;
        while (used.has(pl.name) && guard++ < 10) pl = mkPlayer(c.id, pos, c.strength, foreign, isAcl ? { name: aclPlayerName(c.id, used) } : {});
        used.add(pl.name);
        playerStmts.push(playerInsert(saveId, pl));
      }
    }
    playerStmts.push(stmt('INSERT INTO standings_cache (save_id,club_id) VALUES (?,?)', [saveId, c.id]));
  }
  await batch(playerStmts);
  await batch(makeFixtures(saveId, 1));
  await batch(makeAclFixtures(saveId, 1, 'two'));
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

// Jadwal LIGA: 18 klub, home & away (double round-robin) = 34 pertandingan/klub, 306 laga.
// Ronde 1-17 di-generate dengan circle method, lalu ronde 18-34 = leg kedua (home/away dibalik)
// supaya tiap klub main 17 kali kandang & 17 kali tandang. Semua klub ACL (id 19+) hanya main di ACL.
function makeFixtures(saveId, season) {
  const ids = CLUBS.filter((c) => c.id <= 18).map((c) => c.id);
  const fixed = ids.slice();
  const stmts = [];
  const ins = (md, home, away) => stmts.push(stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,?,?,?,?,?)', [saveId, season, md, home, away, 'league']));
  for (let md = 1; md <= LEAGUE_ROUNDS; md++) {
    for (let i = 0; i < 9; i++) {
      const a = fixed[i]; const b = fixed[17 - i];
      const flip = md % 2 === 0;
      const h = flip ? b : a; const aw = flip ? a : b;
      ins(md, h, aw);              // leg 1 (putaran pertama)
      ins(md + LEAGUE_ROUNDS, aw, h); // leg 2 (putaran kedua, home & away dibalik)
    }
    fixed.splice(1, 0, fixed.pop()); // rotate
  }
  return stmts;
}

// ===== ACL Two: 8 grup (A-H) x 4 tim, home & away (6 laga/klub) sesuai aturan AFC =====
// Ronde 1-3 = leg pertama, ronde 4-6 = leg kedua (home/away dibalik). Digelar sebagai pekan
// ganda bersama Liga pada ACL_TWO_GROUP_MD. 2 terbaik tiap grup -> babak gugur.
const ACL_TWO_ROUNDS = [
  { round: 1, pairs: [[0, 1], [2, 3]] },
  { round: 2, pairs: [[0, 2], [1, 3]] },
  { round: 3, pairs: [[0, 3], [1, 2]] },
  { round: 4, pairs: [[1, 0], [3, 2]] },
  { round: 5, pairs: [[2, 0], [3, 1]] },
  { round: 6, pairs: [[3, 0], [2, 1]] }
];
function makeAclTwoFixtures(saveId, season) {
  const stmts = [];
  for (const g of ACL_GROUPS) {
    for (const r of ACL_TWO_ROUNDS) {
      for (const [h, a] of r.pairs) {
        stmts.push(stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,?,?,?,?,?)', [saveId, season, ACL_TWO_GROUP_MD[r.round], g.ids[h], g.ids[a], 'acl_two']));
      }
    }
  }
  return stmts;
}

// ===== ACL Elite: league phase 8 laga/klub (4 kandang, 4 tandang) =====
// Jadwal ASLI undian AFC 2026/27 per zona & ronde (128 laga) ada di data.js
// (ACL_ELITE_FIXTURES dari backend/src/acl_elite.json): 16 klub/zona dibagi 4 pot x 4,
// tiap klub main 2 laga vs tiap pot -> 8 lawan berbeda. Ronde 1-8 = pekan ganda 4,8,12,16,20,24,26,28.
function makeAclEliteFixtures(saveId, season) {
  const stmts = [];
  for (const zone of Object.keys(ACL_ELITE_FIXTURES)) {
    for (const round of Object.keys(ACL_ELITE_FIXTURES[zone])) {
      for (const [h, a] of ACL_ELITE_FIXTURES[zone][round]) {
        stmts.push(stmt('INSERT INTO fixtures (save_id,season,matchday,home_id,away_id,competition) VALUES (?,?,?,?,?,?)', [saveId, season, ACL_ELITE_GROUP_MD[round], h, a, 'acl_elite']));
      }
    }
  }
  return stmts;
}

// Jadwal ACL sesuai tier karier: ACL Two (grup) atau ACL Elite (league phase).
function makeAclFixtures(saveId, season, tier) {
  return tier === 'elite' ? makeAclEliteFixtures(saveId, season) : makeAclTwoFixtures(saveId, season);
}

// ===== Mulai musim baru (rollover setelah musim selesai, matchday > 23) =====
// - Juara ACL Two (pemenang Final Pekan 21 musim yg baru berakhir) mendapat tiket ACL Elite
//   musim berikutnya, bersamaan dengan jadwal Liga musim baru.
// - Klub yang tidak juara tetap main ACL Two.
export async function startNextSeason(saveId) {
  const save = await get('SELECT * FROM careers WHERE id=?', [saveId]);
  if (!save) throw new Error('Karier tidak ditemukan');
  const clubs = await clubMap();
  const fin = await get("SELECT * FROM fixtures WHERE save_id=? AND season=? AND competition IN ('acl_two','acl_elite') AND matchday=? AND played=1", [saveId, save.season, LEAGUE_MATCHDAYS]);
  const aclChampId = fin ? koWinner(fin, clubs) : null;
  const wonAcl = aclChampId === save.club_id;
  const newTier = wonAcl ? 'elite' : (save.acl_tier === 'elite' ? 'elite' : 'two');
  const newSeason = save.season + 1;
  // Musim baru: jadwal Liga (34 pekan, home & away) + jadwal ACL (Two/Elite) dibuat bersamaan.
  await batch(makeFixtures(saveId, newSeason));
  await batch(makeAclFixtures(saveId, newSeason, newTier));
  // Reset klasemen liga musim baru
  await run('DELETE FROM standings_cache WHERE save_id=?', [saveId]);
  const st = CLUBS.filter((c) => c.id <= 18).map((c) => stmt('INSERT INTO standings_cache (save_id,club_id) VALUES (?,?)', [saveId, c.id]));
  await batch(st);
  await run('UPDATE careers SET season=?, matchday=1, acl_tier=?, acl_titles=acl_titles+? WHERE id=?', [newSeason, newTier, wonAcl ? 1 : 0, saveId]);
  const champName = aclChampId && clubs[aclChampId] ? clubs[aclChampId].name : null;
  await run('INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?,?,?,?,?)', [
    saveId,
    'Musim Baru',
    wonAcl ? '🏆 JUARA ACL TWO! ' + (champName || 'Tim') + ' Promosi ke ACL ELITE!' : 'Musim ' + (newSeason) + ' dimulai!',
    wonAcl
      ? 'Gila sih! Trofi ACL Two direbut ' + (champName || 'tim kita') + '! Musim ini kita tampil di ACL ELITE melawan klub-klub terkuat Asia — dan tetap gas liga Indonesia. Sejarah, bestie! 🏆🌏'
      : 'Jadwal Liga Indonesia + ' + (newTier === 'elite' ? 'ACL ELITE' : 'ACL Two') + ' musim baru sudah keluar. Gas juara lagi!',
    wonAcl ? 'JUARA' : 'INFO'
  ]);
  const s2 = await get('SELECT * FROM careers WHERE id=?', [saveId]);
  return { season: newSeason, aclTier: newTier, aclTitles: s2.acl_titles, promoted: wonAcl, aclChampion: champName, save: s2 };
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedAll().then(() => console.log('Seed OK: 80 clubs (18 liga + 31 ACL Two + 31 ACL Elite), ' + CLUBS.length * 24 + ' players, 434 fixtures (306 liga 34 pekan home & away + 96 ACL Two fase grup + 128 ACL Elite league phase; babak gugur dibangkitkan dinamis)')).catch((e) => { console.error(e); process.exit(1); });
}
