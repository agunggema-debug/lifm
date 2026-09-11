import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initSchema } from './db.js';
import { seedAll } from './seed.js';
import { getSave, clubMap, squad, autoXI, overall } from './game.js';
import { playMatchdayFirstHalf, playMatchdaySecondHalf } from './play.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
// Serve gambar statis: /img/background.jpg, /img/clubs/*.png (per dokumentasi Express: express.static)
app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
initSchema();
const clubCount = db.prepare('SELECT COUNT(*) v FROM clubs').get().v;
if (!clubCount) seedAll();

function saveView() {
  const s = getSave();
  if (!s) return null;
  const clubs = clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const club = withLogo(clubs[s.club_id]);
  return { ...s, club, lineup: JSON.parse(s.lineup_json || '[]') };
}

app.get('/api/health', (req, res) => res.json({ ok: true, game: 'LIFM' }));
app.get('/api/meta', (req, res) => res.json({ season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg' }));
app.get('/api/clubs', (req, res) => {
  const rows = db.prepare('SELECT * FROM clubs ORDER BY reputation DESC').all();
  res.json(rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })));
});
app.get('/api/state', (req, res) => {
  const s = saveView();
  if (!s) {
    const rows = db.prepare('SELECT * FROM clubs ORDER BY name').all();
    return res.json({ hasSave: false, season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg', clubs: rows.map((c) => ({ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' })) });
  }
  res.json({ hasSave: true, save: s, season: '2026/27', league: 'BRI Super League', background: '/img/background.jpg' });
});
app.post('/api/career', (req, res) => {
  const name = String((req.body || {}).managerName || 'Manajer').slice(0, 40);
  const clubId = Number((req.body || {}).clubId);
  const club = db.prepare('SELECT * FROM clubs WHERE id=?').get(clubId);
  if (!club) return res.status(400).json({ error: 'Klub tidak valid' });
  seedAll();
  const auto = autoXI(clubId, '4-4-2', 'balanced');
  db.prepare('INSERT INTO saves (id,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (1,?,?,1,1,?,?,?,?)').run(name, clubId, '4-4-2', 'balanced', JSON.stringify(auto.xi.map((p) => p.id)), club.budget);
  db.prepare("INSERT INTO news (day_label,title,body,tag) VALUES ('MD1',?,?,?)").run('Era ' + name + ' dimulai di ' + club.name + '!', 'Fans full senyum. Buktikan kamu GOAT manajer Indonesia!', 'INFO');
  res.json({ ok: true, save: saveView() });
});
app.post('/api/career/reset', (req, res) => { seedAll(); res.json({ ok: true }); });
app.get('/api/squad', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  res.json(squad(s.club_id));
});
app.get('/api/next-fixture', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const clubs = clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const f = db.prepare('SELECT * FROM fixtures WHERE season=? AND matchday=? AND (home_id=? OR away_id=?)').get(s.season, s.matchday, s.club_id, s.club_id);
  if (!f) return res.json({ finished: true });
  res.json({ matchday: s.matchday, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]), userHome: f.home_id === s.club_id, fixture: f });
});
app.get('/api/fixtures', (req, res) => {
  const s = getSave();
  const md = Number(req.query.matchday || (s ? s.matchday : 1));
  const clubs = clubMap();
  const withLogo = (c) => (c ? { ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' } : c);
  const rows = db.prepare('SELECT * FROM fixtures WHERE season=1 AND matchday=? ORDER BY id').all(md);
  res.json(rows.map((f) => ({ ...f, home: withLogo(clubs[f.home_id]), away: withLogo(clubs[f.away_id]) })));
});
app.post('/api/tactics', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const formation = (req.body || {}).formation || s.formation;
  const mentality = (req.body || {}).mentality || s.mentality;
  let lineup = Array.isArray((req.body || {}).lineup) ? req.body.lineup.map(Number).slice(0, 11) : JSON.parse(s.lineup_json);
  const mine = new Set(squad(s.club_id).map((p) => p.id));
  lineup = lineup.filter((id) => mine.has(id)).slice(0, 11);
  if (lineup.length < 11) {
    const auto = autoXI(s.club_id, formation, mentality).xi.map((p) => p.id);
    for (const id of auto) { if (lineup.length >= 11) break; if (!lineup.includes(id)) lineup.push(id); }
  }
  const byId = {};
  for (const p of squad(s.club_id)) byId[p.id] = p;
  const foreign = lineup.filter((id) => byId[id] && byId[id].is_foreign).length;
  if (foreign > 8) return res.status(400).json({ error: 'Kuota pemain asing max 8 di starting XI!' });
  db.prepare('UPDATE saves SET formation=?, mentality=?, lineup_json=? WHERE id=1').run(formation, mentality, JSON.stringify(lineup));
  res.json({ ok: true, save: saveView() });
});
app.post('/api/play', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  if (s.matchday > 17) return res.json({ finished: true });
  const t0 = Date.now();
  const phase = (req.body || {}).phase || 'first';
  let out;
  if (phase === 'second') {
    // Babak 2: simpan hasil babak 1 dari body, lalu simulate babak 2 dengan XI terkini
    out = playMatchdaySecondHalf(s, req.body || {});
  } else {
    out = playMatchdayFirstHalf(s);
  }
  out.ms = Date.now() - t0;
  out.phase = phase;
  out.save = saveView();
  res.json(out);
});
app.get('/api/standings', (req, res) => {
  const rows = db.prepare('SELECT s.*, c.name, c.short_name, c.color_primary, c.logo FROM standings_cache s JOIN clubs c ON c.id=s.club_id ORDER BY s.points DESC, s.gd DESC, s.gf DESC, c.name').all();
  res.json(rows.map((r) => ({ ...r, logo_url: r.logo ? '/img/clubs/' + r.logo : '' })));
});
app.get('/api/news', (req, res) => res.json(db.prepare('SELECT * FROM news ORDER BY id DESC LIMIT 20').all()));
app.get('/api/transfer-list', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const rows = db.prepare('SELECT p.*, c.short_name club FROM players p JOIN clubs c ON c.id=p.club_id WHERE p.club_id != ? ORDER BY (p.sho+p.pas+p.pac+p.def) DESC LIMIT 60').all(s.club_id);
  res.json(rows.map((p) => ({ ...p, ovr: overall(p) })));
});
app.post('/api/transfer/buy', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = db.prepare('SELECT * FROM players WHERE id=?').get(Number((req.body || {}).playerId));
  if (!p || p.club_id === s.club_id) return res.status(400).json({ error: 'Pemain tidak valid' });
  if (s.budget < p.market_value) return res.status(400).json({ error: 'Budget kurang! Jual pemain dulu.' });
  const count = db.prepare('SELECT COUNT(*) v FROM players WHERE club_id=?').get(s.club_id).v;
  if (count >= 28) return res.status(400).json({ error: 'Skuad penuh (max 28)!' });
  db.prepare('UPDATE players SET club_id=? WHERE id=?').run(s.club_id, p.id);
  db.prepare('UPDATE saves SET budget=budget-? WHERE id=1').run(p.market_value);
  db.prepare('INSERT INTO news (day_label,title,body,tag) VALUES (?,?,?,?)').run('MD' + s.matchday, 'DONE DEAL! ' + p.name + ' merapat!', 'Welcome to the fam!', 'TRANSFER');
  res.json({ ok: true, save: saveView() });
});
app.post('/api/transfer/sell', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const p = db.prepare('SELECT * FROM players WHERE id=? AND club_id=?').get(Number((req.body || {}).playerId), s.club_id);
  if (!p) return res.status(400).json({ error: 'Pemain tidak valid' });
  const cnt = db.prepare('SELECT COUNT(*) v FROM players WHERE club_id=?').get(s.club_id).v;
  if (cnt <= 18) return res.status(400).json({ error: 'Skuad minimal 18 pemain!' });
  const other = db.prepare('SELECT id FROM clubs WHERE id != ? ORDER BY RANDOM() LIMIT 1').get(s.club_id).id;
  db.prepare('UPDATE players SET club_id=? WHERE id=?').run(other, p.id);
  db.prepare('UPDATE saves SET budget=budget+? WHERE id=1').run(p.market_value);
  res.json({ ok: true, save: saveView() });
});
app.post('/api/sub', (req, res) => {
  const s = getSave();
  if (!s) return res.status(400).json({ error: 'Belum ada karier' });
  const outId = Number((req.body || {}).outId);
  const inId = Number((req.body || {}).inId);
  const lineup = JSON.parse(s.lineup_json || '[]');
  if (!lineup.includes(outId)) return res.status(400).json({ error: 'Pemain keluar tidak ada di XI' });
  const inn = db.prepare('SELECT * FROM players WHERE id=? AND club_id=?').get(inId, s.club_id);
  if (!inn) return res.status(400).json({ error: 'Pemain masuk bukan skuadmu' });
  if (inn.injured_weeks > 0) return res.status(400).json({ error: 'Pemain masuk cedera 🚑' });
  if (lineup.includes(inId)) return res.status(400).json({ error: 'Pemain masuk sudah di lapangan' });
  const nl = lineup.map((id) => (id === outId ? inId : id));
  db.prepare('UPDATE saves SET lineup_json=? WHERE id=1').run(JSON.stringify(nl));
  res.json({ ok: true, save: saveView() });
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('LIFM backend on http://localhost:' + PORT));

