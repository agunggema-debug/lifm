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
    season INTEGER NOT NULL DEFAULT 1,
    matchday INTEGER NOT NULL,
    home_id INTEGER NOT NULL REFERENCES clubs(id),
    away_id INTEGER NOT NULL REFERENCES clubs(id),
    played INTEGER NOT NULL DEFAULT 0,
    home_goals INTEGER DEFAULT NULL,
    away_goals INTEGER DEFAULT NULL,
    events_json TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS standings_cache (
    club_id INTEGER PRIMARY KEY REFERENCES clubs(id),
    played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0,
    gd INTEGER DEFAULT 0, points INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS saves (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    manager_name TEXT NOT NULL,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    season INTEGER NOT NULL DEFAULT 1,
    matchday INTEGER NOT NULL DEFAULT 1,
    formation TEXT NOT NULL DEFAULT '4-4-2',
    mentality TEXT NOT NULL DEFAULT 'balanced',
    lineup_json TEXT NOT NULL DEFAULT '[]',
    budget INTEGER NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_label TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'INFO'
  );
`;

export async function initSchema() {
  await db.executeMultiple(SCHEMA);
  // Migrasi ringan untuk DB lama yang belum punya kolom logo
  const cols = await all('PRAGMA table_info(clubs)');
  if (cols.length && !cols.some((c) => c.name === 'logo')) {
    await db.execute("ALTER TABLE clubs ADD COLUMN logo TEXT NOT NULL DEFAULT ''");
  }
}
