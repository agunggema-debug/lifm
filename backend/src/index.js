import express from 'express';
import cors from 'cors';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initSchema, all, get, run } from './db.js';
import { seedClubs, seedWorld } from './seed.js';
import { getSaveByToken, clubMap, squad, autoXI, overall } from './game.js';
import { playMatchdayFirstHalf, playMatchdaySecondHalf, ensureAclKnockout } from './play.js';
import { ACL_GROUPS } from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
// Serve gambar statis: /img/background.jpg, /img/clubs/*.png
// Di Vercel, folder public/ di root proyek di-static-serve otomatis oleh platform.
// Di lokal, Express melayani dari backend/public/img (dan fallback ke src/public/img).
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
await initSchema();
// Klub bersifat global — seed sekali saja. Dunia (pemain/fixture/klasemen/berita)
// dibuat per-karier di /api/career sehingga tiap pengunjung punya dunia sendiri.
await seedClubs();

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
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const club = withLogo(clubs[s.club_id]);
  return { ...s, club, lineup: JSON.parse(s.lineup_json || '[]') };
}
// Hapus seluruh dunia milik satu karier (dipakai saat reset / mulai ulang)
async function deleteWorld(saveId) {
  await run('DELETE FROM players WHERE save_id=?', [saveId]);
  await run('DELETE FROM fixtures WHERE save_id=?', [saveId]);
  await run('DELETE FROM standings_cache WHERE save_id=?', [saveId]);
  await run('DELETE FROM news WHERE save_id=?', [saveId]);
  await run('DELETE FROM careers WHERE id=?', [saveId]);
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

app.get('/api/health', (req, res) => res.json({ ok: true, game: 'LIFM' }));
app.get('/api/meta', (req, res) => res.json({ season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg' }));
app.get('/api/clubs', h(async (req, res) => {
  const rows = await all('SELECT * FROM clubs ORDER BY reputation DESC');
  res.json(rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })));
}));
app.get('/api/state', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) {
    // Hanya 18 klub Super League Indonesia yang bisa dipilih di layar awal (klub ACL 19-21 tidak bisa dipilih & tidak ada di klasemen)
    const rows = await all('SELECT * FROM clubs WHERE id <= 18 ORDER BY name');
    return res.json({ hasSave: false, season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg', clubs: rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })) });
  }
  res.json({ hasSave: true, save: await saveView(s), season: '2026/27', league: 'Indonesia Super League', background: '/img/background.jpg' });
}));
app.post('/api/career', h(async (req, res) => {
  const name = String((req.body || {}).managerName || 'Manajer').slice(0, 40);
  const clubId = Number((req.body || {}).clubId);
  const club = await get('SELECT * FROM clubs WHERE id=?', [clubId]);
  if (!club) return res.status(400).json({ error: 'Klub tidak valid' });
  // Token dari browser; jika tidak ada, generate di server
  let token = tokenOf(req);
  if (!token) token = crypto.randomUUID();
  // Jika token ini sudah punya karier, mulai ulang dari awal (dunia lama dibuang)
  const old = await getSaveByToken(token);
  if (old) await deleteWorld(old.id);
  // Buat karier + dunia pribadi untuk pengunjung ini
  const r = await run('INSERT INTO careers (token,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (?,?,?,1,1,?,?,?,?)',
    [token, name, clubId, '4-4-2', 'balanced', '[]', club.budget]);
  const saveId = (await get('SELECT id FROM careers WHERE token=?', [token])).id;
  await seedWorld(saveId);
  const auto = await autoXI(saveId, clubId, '4-4-2', 'balanced');
  await run('UPDATE careers SET lineup_json=? WHERE id=?', [JSON.stringify(auto.xi.map((p) => p.id)), saveId]);
  await run("INSERT INTO news (save_id,day_label,title,body,tag) VALUES (?, 'MD1',?,?, 'INFO')", [saveId, 'Era ' + name + ' dimulai di ' + club.name + '!', 'Fans full senyum. Buktikan kamu GOAT manajer Indonesia!']);
  const s = await get('SELECT * FROM careers WHERE id=?', [saveId]);
  res.json({ ok: true, token, save: await saveView(s) });
}));
app.post('/api/career/reset', h(async (req, res) => {
  const old = await saveOf(req);
  if (old) await deleteWorld(old.id); // hanya karier pengunjung ini yang dihapus
  res.json({ ok: true });
}));
app.get('/api/squad', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  res.json(await squad(s.id, s.club_id));
}));
app.get('/api/next-fixture', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  await ensureAclKnockout(s); // pastikan babak gugur ACL sudah dibangkitkan utk pekan 18-21
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const f = await get('SELECT * FROM fixtures WHERE save_id=? AND season=? AND matchday=? AND (home_id=? OR away_id=?) ORDER BY played ASC, id ASC', [s.id, s.season, s.matchday, s.club_id, s.club_id]);
  if (!f) return res.json({ finished: true });
  res.json({ matchday: s.matchday, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]), userHome: f.home_id === s.club_id, fixture: f });
}));
app.get('/api/fixtures', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.json([]);
  const md = Number(req.query.matchday || s.matchday);
  await ensureAclKnockout(s); // bangkitkan fixture babak gugur ACL saat dilihat
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
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
  if (s.matchday > 23) return res.json({ finished: true });
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
  res.json(out);
}));
app.get('/api/standings/acl', h(async (req, res) => {
  // ACL Two: klasemen per grup (A-H) dihitung dari fixtures competition='acl_two' fase grup (md <= 17).
  const s = await saveOf(req);
  if (!s) return res.json(ACL_GROUPS.map((g) => ({ name: g.name, rows: [] })));
  const clubs = await clubMap();
  const rows = await all("SELECT * FROM fixtures WHERE save_id=? AND competition='acl_two' AND matchday <= 17", [s.id]);
  const out = ACL_GROUPS.map((g) => {
    const table = {};
    for (const id of g.ids) {
      const c = clubs[id];
      table[id] = { club_id: id, name: c ? c.name : 'Klub ' + id, short_name: c ? c.short_name : '?', logo: c ? c.logo : '', played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
    }
    for (const f of rows) {
      if (!f.played || table[f.home_id] == null || table[f.away_id] == null) continue;
      for (const [id, gf, ga] of [[f.home_id, f.home_goals, f.away_goals], [f.away_id, f.away_goals, f.home_goals]]) {
        const t = table[id];
        t.played++; t.gf += gf; t.ga += ga; t.gd += gf - ga;
        if (gf > ga) { t.won++; t.points += 3; } else if (gf === ga) { t.drawn++; t.points += 1; } else t.lost++;
      }
    }
    return { name: g.name, rows: g.ids.map((id) => table[id]).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf).map((r) => ({ ...r, logo_url: r.logo ? '/img/clubs/' + r.logo : '' })) };
  });
  res.json(out);
}));
app.get('/api/standings', h(async (req, res) => {
  const s = await saveOf(req);
  if (!s) return res.json([]);
  const rows = await all('SELECT st.played, st.won, st.drawn, st.lost, st.gf, st.ga, st.gd, st.points, c.id AS club_id, c.name, c.short_name, c.color_primary, c.logo FROM standings_cache st JOIN clubs c ON c.id=st.club_id WHERE st.save_id=? AND st.club_id <= 18 ORDER BY st.points DESC, st.gd DESC, st.gf DESC, c.name', [s.id]);
  res.json(rows.map((r) => ({ ...r, logo_url: r.logo ? '/img/clubs/' + r.logo : '' })));
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

