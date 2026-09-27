import express from 'express';
import cors from 'cors';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initSchema, all, get, run } from './db.js';
import { seedClubs, seedWorld, startNextSeason } from './seed.js';
import { getSaveByToken, clubMapCached, squad, autoXI, overall, bustClubMapCache } from './game.js';
import { playMatchdayFirstHalf, playMatchdaySecondHalf, ensureAclKnockout, fastForwardSeason, aclStandings } from './play.js';
import { LEAGUE_MATCHDAYS, aclSections } from './data.js';
import { cached, bust, cacheStats } from './cache.js';
import { withLogo, withLogos, clubLogoUrl, topScorerRow } from './view.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// CORS: tiap request game membawa header X-Lifm-Token, jadi browser mengirim preflight OPTIONS
// untuk setiap endpoint. maxAge = Access-Control-Max-Age → preflight di-cache 24 jam, sehingga
// panggilan API berikutnya langsung mengirim data (hemat 1 round-trip saat online).
// Referensi resmi paket cors: https://github.com/expressjs/cors#configuration-options
app.use(cors({ maxAge: 86400 }));
app.use(express.json());
// Membaca IP asli di balik proxy Vercel (dipakai visitor counter).
// Referensi: https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);
// Serve gambar statis: /img/background.jpg, /img/clubs/*.png
// Di Vercel, folder public/ di root proyek di-static-serve otomatis oleh platform.
// Di lokal, Express melayani dari backend/public/img (dan fallback ke src/public/img).
// maxAge+immutable → logo/background tidak diminta ulang tiap buka halaman.
// Referensi: https://expressjs.com/en/4x/api.html#express.static
const STATIC_IMG_OPTS = { maxAge: '30d', immutable: true };
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img'), STATIC_IMG_OPTS));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), STATIC_IMG_OPTS));
await initSchema();
// Klub bersifat global — seed sekali saja. Dunia (pemain/fixture/klasemen/berita)
// dibuat per-karier di /api/career sehingga tiap pengunjung punya dunia sendiri.
await seedClubs();
bustClubMapCache(); // peta klub di-cache (clubMapCached) → buang hasil lama setelah seed

// wrapper async handler dengan error handling
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  if (!res.headersSent) res.status(500).json({ error: 'Server error', detail: String((e && e.message) || e) });
});

// ==== Identitas pengunjung (multi-user) ====
// Setiap browser punya token unik (localStorage) yang dikirim via header X-Lifm-Token.
// Semua data game di-scope per karier berdasarkan token ini.
function tokenOf(req) {
  const t = String(req.headers['x-lifm-token'] || (req.query && req.query.token) || (req.body && req.body.token) || '').trim();
  return t.slice(0, 64);
}
async function saveOf(req) {
  const t = tokenOf(req);
  if (!t) return null;
  return await getSaveByToken(t);
}
async function saveView(s) {
  if (!s) return null;
  const clubs = await clubMapCached();
  return { ...s, club: withLogo(clubs[s.club_id]), lineup: JSON.parse(s.lineup_json || '[]') };
}
// Hapus seluruh dunia milik satu karier (dipakai saat reset / mulai ulang)
async function deleteWorld(saveId) {
  const cur = await get('SELECT manager_name FROM careers WHERE id=?', [saveId]);
  await run('DELETE FROM players WHERE save_id=?', [saveId]);
  await run('DELETE FROM fixtures WHERE save_id=?', [saveId]);
  await run('DELETE FROM standings_cache WHERE save_id=?', [saveId]);
  await run('DELETE FROM news WHERE save_id=?', [saveId]);
  await run('DELETE FROM careers WHERE id=?', [saveId]);
  // Bebaskan nama manajer (tabel managers) supaya bisa dipakai lagi oleh pengunjung manapun.
  if (cur && cur.manager_name) await run('DELETE FROM managers WHERE name = ?', [String(cur.manager_name).trim()]);
}

// ==== Visitor counter ====
// Catat setiap kunjungan /api/state (halaman dibuka) ke tabel visitors.
app.use('/api/state', (req, res, next) => {
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  run('INSERT INTO visitors (ip,user_agent,path) VALUES (?,?,?)', [
    String(rawIp).split(',')[0].trim(),
    String(req.headers['user-agent'] || '').slice(0, 300),
    req.originalUrl || '/api/state',
  ]).catch((e) => console.error('visitor log failed', e));
  next();
});

app.get('/api/visitors', h(async (req, res) => {
  // Hitung visitor unik berdasarkan IP (bukan per load halaman)
  const total = await get("SELECT COUNT(DISTINCT CASE WHEN ip != '' THEN ip ELSE user_agent END) v FROM visitors");
  const today = await get("SELECT COUNT(DISTINCT CASE WHEN ip != '' THEN ip ELSE user_agent END) v FROM visitors WHERE created_at >= date('now')");
  res.json({ total: total?.v || 0, today: today?.v || 0 });
}));

// Health + statistik cache proses (hits/misses) — memudahkan cek cache benar-benar bekerja saat online.
app.get('/api/health', (req, res) => res.json({ ok: true, game: 'LIFM', cache: cacheStats() }));

// ==== 🏅 GLOBAL LEADERBOARD ====
// Peringkat seluruh manajer (semua karier di DB — di produksi Turso = semua pemain LIFM).
// Poin Manajer = poin liga musim ini + (gelar Liga + gelar ACL) x 100 + (musim selesai) x 25.
// PRIVASI: token karier tidak pernah dikirim ke client — hanya nama manajer + statistik publik.
const LB_TITLE_BONUS = 100;
const LB_SEASON_BONUS = 25;
// TTL cache baca (ms). Dipilih mengikuti ritme polling client: tab Ranking me-refresh tiap 30 detik,
// jadi data publik cukup di-query ulang 30 detik sekali (dan langsung di-bust saat ada aksi tulis).
const CACHE_RANK_MS = 30_000;
function managerPoints(r) {
  return Number(r.league_points || 0)
    + (Number(r.league_titles || 0) + Number(r.acl_titles || 0)) * LB_TITLE_BONUS
    + Math.max(0, Number(r.season || 1) - 1) * LB_SEASON_BONUS;
}
// Daftar peringkat LENGKAP (semua manajer) dibangun sekali lalu di-cache:
// - Dulu setiap request menjalankan `INSERT OR IGNORE ... SELECT` (WRITE di jalur baca) —
//   operasi paling mahal saat online karena harus round-trip tulis ke Turso. Baris `managers`
//   sekarang hanya diisi saat karier dibuat (POST /api/career) + backfill sekali saat boot (db.js).
// - Query gabungan managers ⟕ careers ⟕ clubs ⟕ standings + subquery OVR XI di-cache 30 detik
//   dengan single-flight (backend/src/cache.js) → tab Ranking yang di-poll tidak membanjiri DB.
async function buildLeaderboard() {
  const rows = await all(
    'SELECT m.id, m.name AS manager_name, COALESCE(c.club_id, m.club_id) AS club_id,'
    + ' c.season, c.matchday, c.acl_tier, c.acl_titles, c.league_titles, c.updated_at,'
    + ' cl.name AS club_name, cl.short_name, cl.logo,'
    + ' COALESCE(s.points, 0) AS league_points, COALESCE(s.played, 0) AS league_played,'
    + ' (SELECT CAST(AVG(v) AS INTEGER) FROM (SELECT (p.sho + p.pas + p.pac + p.def + p.gk + p.sta) AS v'
    + ' FROM players p WHERE p.save_id = c.id AND p.club_id = c.club_id ORDER BY v DESC LIMIT 11)) AS xi_sum'
    + ' FROM managers m'
    + ' LEFT JOIN careers c ON c.manager_name = m.name COLLATE NOCASE'
    + ' LEFT JOIN clubs cl ON cl.id = COALESCE(c.club_id, m.club_id)'
    + ' LEFT JOIN standings_cache s ON s.save_id = c.id AND s.club_id = c.club_id'
  );
  const list = rows.map((r) => ({
    id: r.id,
    manager: r.manager_name,
    club: { id: r.club_id, name: r.club_name, short_name: r.short_name, logo_url: clubLogoUrl(r.logo) },
    season: Number(r.season || 1),
    matchday: Number(r.matchday || 1),
    acl_tier: r.acl_tier || 'two',
    league_titles: Number(r.league_titles || 0),
    acl_titles: Number(r.acl_titles || 0),
    league_points: Number(r.league_points || 0),
    league_played: Number(r.league_played || 0),
    xi_ovr: r.xi_sum ? Math.round(Number(r.xi_sum) / 6) : 0,
    updated_at: r.updated_at
  })).map((r) => ({ ...r, points: managerPoints(r) }))
    .sort((a, b) => b.points - a.points || b.xi_ovr - a.xi_ovr || b.league_points - a.league_points || String(a.manager).localeCompare(String(b.manager)));
  list.forEach((r, i) => { r.rank = i + 1; });
  return list;
}
app.get('/api/leaderboard', h(async (req, res) => {
  const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 50));
  const list = await cached('lb:list', CACHE_RANK_MS, buildLeaderboard);
  // Identifikasi karier pengunjung via namanya (unik) — r.id kini id managers, bukan id careers.
  const sv = await saveOf(req);
  const me = sv ? list.find((r) => r.manager === String(sv.manager_name || '').trim()) || null : null;
  res.json({
    total: list.length,
    bonus: { title: LB_TITLE_BONUS, season: LB_SEASON_BONUS },
    rows: list.slice(0, limit).map((r) => ({ ...r, isMe: !!me && me.id === r.id })),
    me: me ? { ...me, isMe: true } : null
  });
}));

// ==== ⚽ TOP SCORE (papan skor pemain — tampil di menu Ranking) ====
// - `rows` : top skor GABUNGAN seluruh manajer di server (GROUP BY nama pemain + klub).
//            Inilah "Top Score": siapa pemain paling produktif di server ini.
// - `mine` : top skor klub milik pengunjung (per karier, memakai index players(save_id, club_id)).
// - `mine` (boolean per baris) supaya UI bisa menandai pemain di klub kita (⭐).
// Strategi kecepatan: SUM/GROUP BY di-cache 30 detik + single-flight, lalu di-bust tiap ada
// pertandingan selesai (POST /api/play) / musim baru sehingga angkanya tetap akurat.
const TOP_SCORE_SCAN = 25; // ambil lebih banyak daripada limit agar urutan tidak goyang saat limit kecil
async function buildTopScorers() {
  const rows = await all(
    'SELECT p.name, MAX(p.pos) AS pos, p.club_id, c.short_name, c.logo,'
    + ' SUM(p.goals) AS goals, SUM(p.assists) AS assists, COUNT(DISTINCT p.save_id) AS managers'
    + ' FROM players p JOIN clubs c ON c.id = p.club_id'
    + ' WHERE p.goals > 0' // memanfaatkan index idx_players_goals (hindari full scan)
    + ' GROUP BY p.name, p.club_id'
    + ' ORDER BY goals DESC, assists DESC, p.name ASC LIMIT ' + TOP_SCORE_SCAN
  );
  return rows.map(topScorerRow).map((r, i) => ({ ...r, rank: i + 1 }));
}
app.get('/api/top-scorers', h(async (req, res) => {
  const limit = Math.min(TOP_SCORE_SCAN, Math.max(3, Number(req.query.limit) || 10));
  const s = await saveOf(req);
  const global = await cached('top:global', CACHE_RANK_MS, buildTopScorers);
  const mine = s
    ? (await all(
      'SELECT p.name, p.pos, p.club_id, c.short_name, c.logo, p.goals, p.assists, 1 AS managers'
      + ' FROM players p JOIN clubs c ON c.id = p.club_id'
      + ' WHERE p.save_id = ? AND p.club_id = ? AND p.goals > 0'
      + ' ORDER BY p.goals DESC, p.assists DESC, p.name ASC LIMIT 5', [s.id, s.club_id]
    )).map(topScorerRow).map((p, i) => ({ ...p, rank: i + 1 }))
    : [];
  const myNames = new Set(mine.map((p) => p.name));
  res.json({
    total: global.length,
    rows: global.slice(0, limit).map((r) => ({ ...r, mine: myNames.has(r.name) })),
    mine,
  });
}));

app.get('/api/meta', (req, res) => res.json({ season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg' }));
// Daftar klub: datanya statis (seed sekali) → cukup di-query sekali lalu di-cache 5 menit
// lewat clubMapCached()/cache.js. Saingan terberat saat online adalah latensi DB, bukan CPU.
app.get('/api/clubs', h(async (req, res) => {
  res.json(await cached('clubs:list', 5 * 60 * 1000, async () => withLogos(await all('SELECT * FROM clubs ORDER BY reputation DESC'))));
}));
app.get('/api/state', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) {
    // Hanya 18 klub Super League Indonesia yang bisa dipilih di layar awal (klub ACL 19-21 tidak bisa dipilih & tidak ada di klasemen)
    // Daftar ini juga statis → di-cache agar layar awal langsung tampil (1x query per 5 menit).
    const clubs = await cached('clubs:pick', 5 * 60 * 1000, async () => withLogos(await all('SELECT * FROM clubs WHERE id <= 18 ORDER BY name')));
    return res.json({ hasSave: false, season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg', clubs });
  }
  res.json({ hasSave: true, save: await saveView(s), season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg' });
}));
app.post('/api/career', h(async (req, res) => {
  // ==== Nama manajer harus unik di SELURUH server (sumber data Global Leaderboard) ====
  const name = String((req.body || {}).managerName || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!name) return res.status(400).json({ error: 'Nama manajer wajib diisi.' });
  const clubId = Number((req.body || {}).clubId);
  const club = await get('SELECT * FROM clubs WHERE id=?', [clubId]);
  if (!club) return res.status(400).json({ error: 'Klub tidak valid' });
  // Token dari browser; jika tidak ada, generate di server
  let token = tokenOf(req);
  if (!token) token = crypto.randomUUID();
  const old = await getSaveByToken(token);
  // Validasi kebaruan: boleh memakai ulang nama milik karier SENDIRI (re-create), tetapi
  // TIDAK boleh bentrok dengan manajer lain (case-insensitive & abaikan spasi).
  const dup = await get('SELECT id, name FROM managers WHERE name = ? COLLATE NOCASE', [name]);
  const ownName = old ? String(old.manager_name || '').trim().toLowerCase() : '';
  if (dup && String(dup.name).toLowerCase() !== ownName) {
    return res.status(409).json({ error: 'Nama manajer "' + name + '" sudah dipakai pengunjung lain — pakai nama unik ya, bestie! 🙅' });
  }
  // Jika token ini sudah punya karier, buang dunia lama (sekalian bebaskan nama lamanya)
  if (old) await deleteWorld(old.id);
  // Daftarkan manajer ke tabel `managers` (sumber peringkat Global Leaderboard)
  await run('INSERT OR IGNORE INTO managers (name, club_id) VALUES (?,?)', [name, clubId]);
  // Buat karier + dunia pribadi untuk pengunjung ini
  const r = await run('INSERT INTO careers (token,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (?,?,?,1,1,?,?,?,?)',
    [token, name, clubId, '4-4-2', 'balanced', '[]', club.budget]);
  const saveId = (await get('SELECT id FROM careers WHERE token=?', [token])).id;
  await seedWorld(saveId);
  const auto = await autoXI(saveId, clubId, '4-4-2', 'balanced');
  await run('UPDATE careers SET lineup_json=? WHERE id=?', [JSON.stringify(auto.xi.map((p) => p.id)), saveId]);
  await run("INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?, 'MD1',?,?, 'INFO')", [saveId, 'Era ' + name + ' dimulai di ' + club.name + '!', 'Fans full senyum. Buktikan kamu GOAT manajer Indonesia!']);
  const s = await get('SELECT * FROM careers WHERE id=?', [saveId]);
  bust('lb:'); // manajer baru masuk papan peringkat → buang cache lama
  res.json({ ok: true, token, save: await saveView(s) });
}));
app.post('/api/career/reset', h(async (req, res) => {
  const old = await saveOf(req);
  if (old) await deleteWorld(old.id); // hanya karier pengunjung ini yang dihapus
  bust('lb:'); // peringkat berubah setelah karier dihapus
  res.json({ ok: true });
}));
app.post('/api/next-season', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  // Musim baru hanya boleh dimulai setelah musim selesai (Pekan 34 habis)
  if (s.matchday <= LEAGUE_MATCHDAYS) return res.status(400).json({ error: 'Musim belum selesai! Selesaikan dulu sampai Pekan ' + LEAGUE_MATCHDAYS + '.' });
  const r = await startNextSeason(s.id);
  bust('lb:'); // gelar/musim berubah → poin manajer baru
  res.json({ ok: true, ...r, save: await saveView(r.save) });
}));
app.get('/api/squad', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  res.json(await squad(s.id, s.club_id));
}));
app.get('/api/next-fixture', h(async (req, res) => {
  let s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  await ensureAclKnockout(s); // pastikan babak gugur ACL sudah dibangkitkan utk pekan 18-21
  const clubs = await clubMapCached(); // peta klub dari cache (bukan query DB tiap request)
  const f = await get('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND (home_id=? OR away_id=?) ORDER BY played ASC, id ASC', [s.id, s.season, s.matchday, s.club_id, s.club_id]);
  if (!f && s.matchday <= LEAGUE_MATCHDAYS) {
    // User tersingkir dari babak gugur ACL / pekan kosong: fast-forward simulasi klub lain
    // (juara ACL tetap ditentukan) sampai user punya laga lagi atau musim tuntas.
    s = await fastForwardSeason(s);
    await ensureAclKnockout(s);
    const f2 = await get('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND (home_id=? OR away_id=?) ORDER BY played ASC, id ASC', [s.id, s.season, s.matchday, s.club_id, s.club_id]);
    if (f2) return res.json({ matchday: s.matchday, season: s.season, home: withLogo(clubs[f2.home_id]), away: withLogo(clubs[f2.away_id]), userHome: f2.home_id === s.club_id, fixture: f2 });
  }
  if (!f) return res.json({ finished: true, seasonDone: s.matchday > LEAGUE_MATCHDAYS, aclTier: s.acl_tier, aclTitles: s.acl_titles, season: s.season });
  res.json({ matchday: s.matchday, season: s.season, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]), userHome: f.home_id === s.club_id, fixture: f });
}));
app.get('/api/fixtures', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.json([]);
  const md = Number(req.query.matchday || s.matchday);
  await ensureAclKnockout(s); // bangkitkan fixture babak gugur ACL saat dilihat
  const clubs = await clubMapCached();
  const rows = await all('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? ORDER BY id', [s.id, s.season, md]);
  res.json(rows.map((f) => ({ ...f, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]) })));
}));
app.post('/api/tactics', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const formation = (req.body || {}).formation || s.formation;
  const mentality = (req.body || {}).mentality || s.mentality;
  let lineup = Array.isArray((req.body || {}).lineup) ? req.body.lineup.map(Number).slice(0, 11) : JSON.parse(s.lineup_json);
  const mine = new Set((await squad(s.id, s.club_id)).map((p) => p.id));
  lineup = lineup.filter((id) => mine.has(id)).slice(0, 11);
  if (lineup.length < 11) {
    const auto = (await autoXI(s.id, s.club_id, formation, mentality)).xi.map((p) => p.id);
    for (const id of auto) { if (lineup.length >= 11) break; if (!lineup.includes(id)) lineup.push(id); }
  }
  const byId = {};
  for (const p of await squad(s.id, s.club_id)) byId[p.id] = p;
  const foreign = lineup.filter((id) => byId[id] && byId[id].is_foreign).length;
  if (foreign > 8) return res.status(400).json({ error: 'Kuota pemain asing max 8 di starting XI!' });
  await run('UPDATE careers SET formation=?, mentality=?, lineup_json=? WHERE id=?', [formation, mentality, JSON.stringify(lineup), s.id]);
  const s2 = await get('SELECT * FROM careers WHERE id=?', [s.id]);
  res.json({ ok: true, save: await saveView(s2) });
}));
app.post('/api/play', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  if (s.matchday > LEAGUE_MATCHDAYS) return res.json({ finished: true, seasonDone: true, aclTier: s.acl_tier, aclTitles: s.acl_titles });
  const t0 = Date.now();
  const phase = (req.body || {}).phase || 'first';
  let out;
  if (phase === 'second') {
    // Babak 2: simpan hasil babak 1 dari body, lalu simulate babak 2 dengan XI terkini
    out = await playMatchdaySecondHalf(s, req.body || {});
  } else {
    out = await playMatchdayFirstHalf(s);
  }
  out.ms = Date.now() - t0;
  out.phase = phase;
  const s2 = await get('SELECT * FROM careers WHERE id=?', [s.id]);
  out.save = await saveView(s2);
  // Poin liga / gol pemain berubah setelah pertandingan → papan Ranking & Top Score harus segar.
  bust('lb:');
  bust('top:');
  res.json(out);
}));
app.get('/api/standings/acl', h(async (req, res) => {
  // ACL Two: 8 grup (A-H) | ACL Elite: 2 zona (Timur/Barat) — mengikuti tier karier.
  // Klasemen dihitung dari fixture pekan fase grup sesuai aturan AFC.
  const s = await saveOf(req);
  if (!s) {
    const sections = aclSections('two');
    return res.json(sections.map((g) => ({ name: g.name, label: g.label, zone: g.zone, rows: [] })));
  }
  const out = await aclStandings(s);
  res.json(out.map((g) => ({ ...g, rows: withLogos(g.rows) })));
}));

app.get('/api/standings', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.json([]);
  const rows = await all('SELECT st.played, st.won, st.drawn, st.lost, st.gf, st.ga, st.gd, st.points, c.id AS club_id, c.name, c.short_name, c.color_primary, c.logo FROM standings_cache st JOIN clubs c ON c.id=st.club_id WHERE st.save_id=? AND st.club_id <= 18 ORDER BY st.points DESC, st.gd DESC, st.gf DESC, c.name', [s.id]);
  res.json(withLogos(rows));
}));
app.get('/api/news', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.json([]);
  res.json(await all('SELECT * FROM news WHERE save_id=? ORDER BY id DESC LIMIT 20', [s.id]));
}));
app.get('/api/transfer-list', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const rows = await all('SELECT p.*, c.short_name club FROM players p JOIN clubs c ON c.id=p.club_id WHERE p.save_id=? AND p.club_id != ? ORDER BY (p.sho+p.pas+p.pac+p.def) DESC LIMIT 60', [s.id, s.club_id]);
  res.json(rows.map((p) => ({ ...p, ovr: overall(p) })));
}));
app.post('/api/transfer/buy', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = await get('SELECT * FROM players WHERE id=? AND save_id=?', [Number((req.body || {}).playerId), s.id]);
  if (!p || p.club_id === s.club_id) return res.status(400).json({ error: 'Pemain tidak valid' });
  if (s.budget < p.market_value) return res.status(400).json({ error: 'Budget kurang! Jual pemain dulu.' });
  const count = await get('SELECT COUNT(*) v FROM players WHERE save_id=? AND club_id=?', [s.id, s.club_id]);
  if (count && count.v >= 28) return res.status(400).json({ error: 'Skuad penuh (max 28)!' });
  await run('UPDATE players SET club_id=? WHERE id=? AND save_id=?', [s.club_id, p.id, s.id]);
  await run('UPDATE careers SET budget=budget-? WHERE id=?', [p.market_value, s.id]);
  await run('INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?,?,?,?,?)', [s.id, 'MD' + s.matchday, 'DONE DEAL! ' + p.name + ' merapat!', 'Welcome to the fam!', 'TRANSFER']);
  bust('lb:'); // transfer mengubah OVR XI klub (tie-break peringkat) → segarkan cache papan
  const s2 = await get('SELECT * FROM careers WHERE id=?', [s.id]);
  res.json({ ok: true, save: await saveView(s2) });
}));
app.post('/api/transfer/sell', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = await get('SELECT * FROM players WHERE id=? AND save_id=? AND club_id=?', [Number((req.body || {}).playerId), s.id, s.club_id]);
  if (!p) return res.status(400).json({ error: 'Pemain tidak valid' });
  const cnt = await get('SELECT COUNT(*) v FROM players WHERE save_id=? AND club_id=?', [s.id, s.club_id]);
  if (cnt && cnt.v <= 18) return res.status(400).json({ error: 'Skuad minimal 18 pemain!' });
  const other = await get('SELECT id FROM clubs WHERE id != ? ORDER BY RANDOM() LIMIT 1', [s.club_id]);
  await run('UPDATE players SET club_id=? WHERE id=? AND save_id=?', [other.id, p.id, s.id]);
  await run('UPDATE careers SET budget=budget+? WHERE id=?', [p.market_value, s.id]);
  bust('lb:'); // transfer keluar juga mengubah OVR XI → peringkat ikut berubah
  const s2 = await get('SELECT * FROM careers WHERE id=?', [s.id]);
  res.json({ ok: true, save: await saveView(s2) });
}));
app.post('/api/sub', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const outId = Number((req.body || {}).outId);
  const inId = Number((req.body || {}).inId);
  const lineup = JSON.parse(s.lineup_json || '[]');
  if (!lineup.includes(outId)) return res.status(400).json({ error: 'Pemain keluar tidak ada di XI' });
  const inn = await get('SELECT * FROM players WHERE id=? AND save_id=? AND club_id=?', [inId, s.id, s.club_id]);
  if (!inn) return res.status(400).json({ error: 'Pemain masuk bukan skuadmu' });
  if (inn.injured_weeks > 0) return res.status(400).json({ error: 'Pemain masuk cedera 🚑' });
  if (lineup.includes(inId)) return res.status(400).json({ error: 'Pemain masuk sudah di lapangan' });
  const nl = lineup.map((id) => (id === outId ? inId : id));
  await run('UPDATE careers SET lineup_json=? WHERE id=?', [JSON.stringify(nl), s.id]);
  const s2 = await get('SELECT * FROM careers WHERE id=?', [s.id]);
  res.json({ ok: true, save: await saveView(s2) });
}));

export default app;

// Jalankan server hanya saat dev/lokal. Di Vercel, `app` di-export sebagai serverless handler.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log('LIFM backend on http://localhost:' + PORT));
}

