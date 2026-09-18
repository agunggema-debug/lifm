// Turso/libSQL client — mendukung file lokal (dev) dan remote Turso (prod).
// Dev : tanpa env  -> file:backend/lifm.db (sama seperti dulu)
// Prod: set TURSO_DATABASE_URL=libsql://... & TURSO_AUTH_TOKEN=... di Vercel
import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.LIFM_DB || path.join(__dirname, '..', 'lifm.db');
const url = process.env.TURSO_DATABASE_URL || 'file:' + DB_PATH;
const clientConfig = { url };
if (process.env.TURSO_AUTH_TOKEN) clientConfig.authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(clientConfig);

// Helper async pengganti API sync better-sqlite3
export const stmt = (sql, args) => ({ sql, args: args || [] });
export async function all(sql, args) {
  const r = await db.execute(stmt(sql, args));
  return r.rows;
}
export async function get(sql, args) {
  const r = await db.execute(stmt(sql, args));
  return r.rows[0] ?? null;
}
export async function run(sql, args) {
  await db.execute(stmt(sql, args));
}
export async function batch(statements) {
  const CHUNK = 100;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await db.batch(statements.slice(i, i + CHUNK), 'write');
  }
}
export async function exec(sql) {
  // execute() hanya 1 statement; multi-statement butuh executeMultiple()
  await db.executeMultiple(sql);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    club_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    city TEXT NOT NULL,
    logo TEXT NOT NULL DEFAULT '',
    color_primary TEXT NOT NULL,
    color_secondary TEXT NOT NULL,
    strength INTEGER NOT NULL,
    budget INTEGER NOT NULL,
    reputation INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL DEFAULT 0,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    name TEXT NOT NULL,
    pos TEXT NOT NULL,
    age INTEGER NOT NULL,
    is_foreign INTEGER NOT NULL DEFAULT 0,
    pac INTEGER NOT NULL, sho INTEGER NOT NULL, pas INTEGER NOT NULL,
    def INTEGER NOT NULL, gk INTEGER NOT NULL, sta INTEGER NOT NULL,
    morale INTEGER NOT NULL DEFAULT 75,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    yellow INTEGER NOT NULL DEFAULT 0,
    red INTEGER NOT NULL DEFAULT 0,
    injured_weeks INTEGER NOT NULL DEFAULT 0,
    market_value INTEGER NOT NULL,
    wage INTEGER NOT NULL,
    contract_years INTEGER NOT NULL DEFAULT 2
  );
    CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL DEFAULT 0,
    season INTEGER NOT NULL DEFAULT 1,
    matchday INTEGER NOT NULL,
    home_id INTEGER NOT NULL REFERENCES clubs(id),
    away_id INTEGER NOT NULL REFERENCES clubs(id),
    competition TEXT NOT NULL DEFAULT 'league',
    played INTEGER NOT NULL DEFAULT 0,
    home_goals INTEGER DEFAULT NULL,
    away_goals INTEGER DEFAULT NULL,
    events_json TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS standings_cache (
    save_id INTEGER NOT NULL DEFAULT 0,
    club_id INTEGER REFERENCES clubs(id),
    played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0,
    gd INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
    PRIMARY KEY (save_id, club_id)
  );
  CREATE TABLE IF NOT EXISTS careers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    manager_name TEXT NOT NULL,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    season INTEGER NOT NULL DEFAULT 1,
    matchday INTEGER NOT NULL DEFAULT 1,
    formation TEXT NOT NULL DEFAULT '4-4-2',
    mentality TEXT NOT NULL DEFAULT 'balanced',
    lineup_json TEXT NOT NULL DEFAULT '[]',
    budget INTEGER NOT NULL,
    acl_tier TEXT NOT NULL DEFAULT 'two',
    acl_titles INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL DEFAULT 0,
    day_label TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'INFO'
  );
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL DEFAULT '/',
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

export async function initSchema() {
  await db.executeMultiple(SCHEMA);
  // ==== Migrasi ringan (aman dijalankan berulang, DB lama ikut ke-upgrade) ====
  const safe = (sql) => db.execute(sql).catch(() => {});
  // Migrasi: kolom logo pada clubs
  const cols = await all('PRAGMA table_info(clubs)');
  if (cols.length && !cols.some((c) => c.name === 'logo')) {
    await db.execute("ALTER TABLE clubs ADD COLUMN logo TEXT NOT NULL DEFAULT ''");
  }
  // Migrasi: kolom competition pada fixtures (ACL Two)
  const fxCols = await all('PRAGMA table_info(fixtures)');
  if (fxCols.length && !fxCols.some((c) => c.name === 'competition')) {
    await db.execute("ALTER TABLE fixtures ADD COLUMN competition TEXT NOT NULL DEFAULT 'league'");
  }
  // Migrasi: kolom ACL (acl_tier = 'two'|'elite', acl_titles = jumlah trofi ACL) pada careers
  const crCols = await all('PRAGMA table_info(careers)');
  if (crCols.length && !crCols.some((c) => c.name === 'acl_tier')) {
    await db.execute("ALTER TABLE careers ADD COLUMN acl_tier TEXT NOT NULL DEFAULT 'two'");
  }
  if (crCols.length && !crCols.some((c) => c.name === 'acl_titles')) {
    await db.execute('ALTER TABLE careers ADD COLUMN acl_titles INTEGER NOT NULL DEFAULT 0');
  }
  // ==== Migrasi MULTI-USER: save_id pada players/fixtures/standings_cache/news ====
  const addCol = async (table, ddl) => {
    const t = await all('PRAGMA table_info(' + table + ')');
    if (t.length && !t.some((c) => c.name === 'save_id')) await db.execute('ALTER TABLE ' + table + ' ADD COLUMN ' + ddl);
  };
  await addCol('players', "save_id INTEGER NOT NULL DEFAULT 0");
  await addCol('fixtures', "save_id INTEGER NOT NULL DEFAULT 0");
  await addCol('standings_cache', "save_id INTEGER NOT NULL DEFAULT 0");
  // standings_cache lama punya PRIMARY KEY(club_id) tunggal -> harus dibangun ulang jadi komposit (save_id, club_id)
  const stCols = await all('PRAGMA table_info(standings_cache)');
  if (stCols.length) {
    const pkCount = stCols.filter((c) => c.pk > 0).length;
    const hasComposite = stCols.some((c) => c.name === 'save_id' && c.pk > 0);
    if (pkCount === 1 && !hasComposite) {
      // Salin hanya kolom yang benar-benar ada di tabel lama (DB lama bisa punya skema berbeda)
      const keep = ['save_id', 'club_id', 'played', 'won', 'drawn', 'lost', 'gf', 'ga', 'gd', 'points'];
      const oldNames = stCols.map((c) => c.name);
      const selCols = keep.filter((k) => oldNames.includes(k)).join(', ');
      await db.executeMultiple([
        'DROP TABLE IF EXISTS standings_cache_old', // sisa migrasi yang gagal/terputus
        'ALTER TABLE standings_cache RENAME TO standings_cache_old',
        'CREATE TABLE standings_cache (save_id INTEGER NOT NULL DEFAULT 0, club_id INTEGER REFERENCES clubs(id), played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, gd INTEGER DEFAULT 0, points INTEGER DEFAULT 0, PRIMARY KEY (save_id, club_id))',
        'INSERT OR IGNORE INTO standings_cache (' + selCols + ') SELECT ' + selCols + ' FROM standings_cache_old',
        'DROP TABLE standings_cache_old'
      ].join('; '));
    }
  }
  await addCol('news', "save_id INTEGER NOT NULL DEFAULT 0");
  // Tabel lama `saves` (id=1, shared) -> data dunia lama (save_id=0) milik save lama:
  // pindahkan manager ke tabel baru `careers` dengan token kosong (diambil via migrasi localStorage).
  const savesCols = await all('PRAGMA table_info(saves)');
  if (savesCols.length && savesCols.some((c) => c.name === 'manager_name')) {
    const old = await get('SELECT * FROM saves WHERE id = 1');
    if (old) {
      try {
        const dup = await get('SELECT id FROM careers WHERE id = 1');
        const clubExists = await get('SELECT id FROM clubs WHERE id = ?', [old.club_id]);
        if (!dup && clubExists) {
          await run('INSERT INTO careers (id,token,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (1,?,?,?,?,?,?,?,?,?)',
            ['', old.manager_name, old.club_id, old.season, old.matchday, old.formation, old.mentality, old.lineup_json, old.budget]);
        }
        await db.execute('DROP TABLE saves');
      } catch (e) {
        console.error('Migrasi save lama dilewati:', e && e.message);
      }
    }
  }
  // Pastikan kolom token UNIQUE dan index pencarian per-karier
  await safe('CREATE UNIQUE INDEX IF NOT EXISTS idx_careers_token ON careers(token)');
  await safe('CREATE INDEX IF NOT EXISTS idx_players_save ON players(save_id)');
  await safe('CREATE INDEX IF NOT EXISTS idx_fixtures_save ON fixtures(save_id)');
  await safe('CREATE INDEX IF NOT EXISTS idx_news_save ON news(save_id)');
  await safe('CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors(created_at)');
}
