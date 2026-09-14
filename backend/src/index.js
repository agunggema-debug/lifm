import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initSchema, all, get, run } from './db.js';
import { seedAll } from './seed.js';
import { getSave, clubMap, squad, autoXI, overall } from './game.js';
import { playMatchdayFirstHalf, playMatchdaySecondHalf } from './play.js';

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
const clubCount = await get('SELECT COUNT(*) v FROM clubs');
if (!clubCount || !clubCount.v) await seedAll();

// wrapper async handler dengan error handling
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  console.error(e);
  if (!res.headersSent) res.status(500).json({ error: 'Server error', detail: String((e && e.message) || e) });
});

async function saveView() {
  const s = await getSave();
  if (!s) return null;
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const club = withLogo(clubs[s.club_id]);
  return { ...s, club, lineup: JSON.parse(s.lineup_json || '[]') };
}

app.get('/api/health', (req, res) => res.json({ ok: true, game: 'LIFM' }));
app.get('/api/meta', (req, res) => res.json({ season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg' }));
app.get('/api/clubs', h(async (req, res) => {
  const rows = await all('SELECT * FROM clubs ORDER BY reputation DESC');
  res.json(rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })));
}));
app.get('/api/state', h(async (req, res) => {
  const s = await saveView();
  if (!s) {
    const rows = await all('SELECT * FROM clubs ORDER BY name');
    return res.json({ hasSave: false, season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg', clubs: rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })) });
  }
  res.json({ hasSave: true, save: s, season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg' });
}));
app.post('/api/career', h(async (req, res) => {
  const name = String((req.body || {}).managerName || 'Manajer').slice(0, 40);
  const clubId = Number((req.body || {}).clubId);
  const club = await get('SELECT * FROM clubs WHERE id=?', [clubId]);
  if (!club) return res.status(400).json({ error: 'Klub tidak valid' });
  await seedAll();
  const auto = await autoXI(clubId, '4-4-2', 'balanced');
  await run('INSERT INTO saves (id,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (1,?,?,1,1,?,?,?,?)', [name, clubId, '4-4-2', 'balanced', JSON.stringify(auto.xi.map((p) => p.id)), club.budget]);
  await run("INSERT INTO news (day_label,title,body,tag) VALUES ('MD1',?,?,?)", ['Era ' + name + ' dimulai di ' + club.name + '!', 'Fans full senyum. Buktikan kamu GOAT manajer Indonesia!', 'INFO']);
  res.json({ ok: true, save: await saveView() });
}));
app.post('/api/career/reset', h(async (req, res) => { await seedAll(); res.json({ ok: true }); }));
app.get('/api/squad', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  res.json(await squad(s.club_id));
}));
app.get('/api/next-fixture', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const f = await get('SELECT * FROM fixtures WHERE season=? AND matchday=? AND (home_id=? OR away_id=?)', [s.season, s.matchday, s.club_id, s.club_id]);
  if (!f) return res.json({ finished: true });
  res.json({ matchday: s.matchday, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]), userHome: f.home_id === s.club_id, fixture: f });
}));
app.get('/api/fixtures', h(async (req, res) => {
  const s = await getSave();
  const md = Number(req.query.matchday || (s ? s.matchday : 1));
  const clubs = await clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const rows = await all('SELECT * FROM fixtures WHERE season=1 AND matchday=? ORDER BY id', [md]);
  res.json(rows.map((f) => ({ ...f, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]) })));
}));
app.post('/api/tactics', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const formation = (req.body || {}).formation || s.formation;
  const mentality = (req.body || {}).mentality || s.mentality;
  let lineup = Array.isArray((req.body || {}).lineup) ? req.body.lineup.map(Number).slice(0, 11) : JSON.parse(s.lineup_json);
  const mine = new Set((await squad(s.club_id)).map((p) => p.id));
  lineup = lineup.filter((id) => mine.has(id)).slice(0, 11);
  if (lineup.length < 11) {
    const auto = (await autoXI(s.club_id, formation, mentality)).xi.map((p) => p.id);
    for (const id of auto) { if (lineup.length >= 11) break; if (!lineup.includes(id)) lineup.push(id); }
  }
  const byId = {};
  for (const p of await squad(s.club_id)) byId[p.id] = p;
  const foreign = lineup.filter((id) => byId[id] && byId[id].is_foreign).length;
  if (foreign > 8) return res.status(400).json({ error: 'Kuota pemain asing max 8 di starting XI!' });
  await run('UPDATE saves SET formation=?, mentality=?, lineup_json=? WHERE id=1', [formation, mentality, JSON.stringify(lineup)]);
  res.json({ ok: true, save: await saveView() });
}));
app.post('/api/play', h(async (req, res) => {
  const s = await getSave();
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
  out.save = await saveView();
  res.json(out);
}));
app.get('/api/standings/acl', h(async (req, res) => {
  // ACL Two Grup E: standings dihitung langsung dari fixtures competition='acl_two'
  const rows = await all("SELECT * FROM fixtures WHERE competition='acl_two'");
  const table = {};
  const ids = [2, 19, 20, 21];
  const clubs = await clubMap();
  for (const id of ids) table[id] = { club_id: id, name: clubs[id].name, short_name: clubs[id].short_name, logo: clubs[id].logo, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  for (const f of rows) {
    if (!f.played) continue;
    for (const side of ['home', 'away']) {
      const isHome = side === 'home';
      const t = table[isHome ? f.home_id : f.away_id];
      if (!t) continue;
      const gf = isHome ? f.home_goals : f.away_goals;
      const ga = isHome ? f.away_goals : f.home_goals;
      t.played++; t.gf += gf; t.ga += ga; t.gd += gf - ga;
      if (gf > ga) { t.won++; t.points += 3; } else if (gf === ga) { t.drawn++; t.points += 1; } else t.lost++;
    }
  }
  res.json(ids.map((id) => table[id]).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf).map((r) => ({ ...r, logo_url: r.logo ? '/img/clubs/' + r.logo : '' })));
}));
app.get('/api/standings', h(async (req, res) => {
  const rows = await all('SELECT s.*, c.name, c.short_name, c.color_primary, c.logo FROM standings_cache s JOIN clubs c ON c.id=s.club_id ORDER BY s.points DESC, s.gd DESC, s.gf DESC, c.name');
  res.json(rows.map((r) => ({ ...r, logo_url: r.logo ? '/img/clubs/' + r.logo : '' })));
}));
app.get('/api/news', h(async (req, res) => res.json(await all('SELECT * FROM news ORDER BY id DESC LIMIT 20'))));
app.get('/api/transfer-list', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const rows = await all('SELECT p.*, c.short_name club FROM players p JOIN clubs c ON c.id=p.club_id WHERE p.club_id != ? ORDER BY (p.sho+p.pas+p.pac+p.def) DESC LIMIT 60', [s.club_id]);
  res.json(rows.map((p) => ({ ...p, ovr: overall(p) })));
}));
app.post('/api/transfer/buy', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = await get('SELECT * FROM players WHERE id=?', [Number((req.body || {}).playerId)]);
  if (!p || p.club_id === s.club_id) return res.status(400).json({ error: 'Pemain tidak valid' });
  if (s.budget < p.market_value) return res.status(400).json({ error: 'Budget kurang! Jual pemain dulu.' });
  const count = await get('SELECT COUNT(*) v FROM players WHERE club_id=?', [s.club_id]);
  if (count && count.v >= 28) return res.status(400).json({ error: 'Skuad penuh (max 28)!' });
  await run('UPDATE players SET club_id=? WHERE id=?', [s.club_id, p.id]);
  await run('UPDATE saves SET budget=budget-? WHERE id=1', [p.market_value]);
  await run('INSERT INTO news (day_label,title,body,tag) VALUES (?,?,?,?)', ['MD' + s.matchday, 'DONE DEAL! ' + p.name + ' merapat!', 'Welcome to the fam!', 'TRANSFER']);
  res.json({ ok: true, save: await saveView() });
}));
app.post('/api/transfer/sell', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = await get('SELECT * FROM players WHERE id=? AND club_id=?', [Number((req.body || {}).playerId), s.club_id]);
  if (!p) return res.status(400).json({ error: 'Pemain tidak valid' });
  const cnt = await get('SELECT COUNT(*) v FROM players WHERE club_id=?', [s.club_id]);
  if (cnt && cnt.v <= 18) return res.status(400).json({ error: 'Skuad minimal 18 pemain!' });
  const other = await get('SELECT id FROM clubs WHERE id != ? ORDER BY RANDOM() LIMIT 1', [s.club_id]);
  await run('UPDATE players SET club_id=? WHERE id=?', [other.id, p.id]);
  await run('UPDATE saves SET budget=budget+? WHERE id=1', [p.market_value]);
  res.json({ ok: true, save: await saveView() });
}));
app.post('/api/sub', h(async (req, res) => {
  const s = await getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const outId = Number((req.body || {}).outId);
  const inId = Number((req.body || {}).inId);
  const lineup = JSON.parse(s.lineup_json || '[]');
  if (!lineup.includes(outId)) return res.status(400).json({ error: 'Pemain keluar tidak ada di XI' });
  const inn = await get('SELECT * FROM players WHERE id=? AND club_id=?', [inId, s.club_id]);
  if (!inn) return res.status(400).json({ error: 'Pemain masuk bukan skuadmu' });
  if (inn.injured_weeks > 0) return res.status(400).json({ error: 'Pemain masuk cedera 🚑' });
  if (lineup.includes(inId)) return res.status(400).json({ error: 'Pemain masuk sudah di lapangan' });
  const nl = lineup.map((id) => (id === outId ? inId : id));
  await run('UPDATE saves SET lineup_json=? WHERE id=1', [JSON.stringify(nl)]);
  res.json({ ok: true, save: await saveView() });
}));

export default app;

// Jalankan server hanya saat dev/lokal. Di Vercel, `app` di-export sebagai serverless handler.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log('LIFM backend on http://localhost:' + PORT));
}

