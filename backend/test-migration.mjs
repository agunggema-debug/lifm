// Uji migrasi DB lama: tabel saves (id=1, CHECK) & standings_cache PK tunggal harus di-upgrade otomatis
import { db, initSchema, get, all } from './src/db.js';
import { seedClubs } from './src/seed.js';
// 1) Seed dulu agar schema baru + klub global terbentuk (miror alur server asli)
await seedClubs();
// 2) "Turunkan" ke format DB LAMA: saves (CHECK id=1) + standings_cache PK tunggal
await db.executeMultiple('DROP TABLE IF EXISTS standings_cache; DROP TABLE IF EXISTS careers; DROP TABLE IF EXISTS saves; DROP TABLE IF EXISTS standings_cache_old;');
await db.executeMultiple("CREATE TABLE saves (id INTEGER PRIMARY KEY CHECK (id=1), manager_name TEXT, club_id INTEGER, season INTEGER, matchday INTEGER, formation TEXT, mentality TEXT, lineup_json TEXT, budget INTEGER); CREATE TABLE standings_cache (club_id INTEGER PRIMARY KEY, played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, gd INTEGER DEFAULT 0, points INTEGER DEFAULT 0);");
await db.execute("INSERT INTO saves (id,manager_name,club_id,season,matchday,formation,mentality,lineup_json,budget) VALUES (1,'Abah',1,1,3,'4-4-2','balanced','[]',1000000)");
await db.execute("INSERT INTO standings_cache (club_id) VALUES (1)");
// 3) Jalankan initSchema lagi -> migrasi otomatis harus memperbaiki skema lama
await initSchema();
const c = await get('SELECT * FROM careers');
const sc = await all('SELECT * FROM standings_cache');
console.log('migrasi old-save ->', JSON.stringify({ manager: c.manager_name, budget: c.budget, standingsRows: sc.length }));
if (!c || c.manager_name !== 'Abah' || c.budget !== 1000000 || sc.length !== 1) { console.error('MIGRASI GAGAL ❌'); process.exit(1); }
console.log('MIGRASI LOLOS ✅');
