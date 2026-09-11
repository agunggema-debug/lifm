// Generator: unduh logo resmi 18 klub + buat rosters.json (nama pemain asli ileague.id)
// Posisi TIDAK tersedia di situs (baris Posisi di-comment) -> dibagi deterministik GK2/DF8/MF8/FW6.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_URL = 'https://ileague.id/clubs/index/BRI_SUPER_LEAGUE_2026-27';

// slug situs -> {id, file logo, short_name}
const CLUB_MAP = [
  { slug: 'PERSIJA_JAKARTA', id: 1, file: 'persija.png' },
  { slug: 'PERSIB_BANDUNG', id: 2, file: 'persib.png' },
  { slug: 'PERSEBAYA_SURABAYA', id: 3, file: 'persebaya.png' },
  { slug: 'AREMA_FC', id: 4, file: 'arema.png' },
  { slug: 'BALI_UNITED_FC', id: 5, file: 'bali.png' },
  { slug: 'BORNEO_FC_SAMARINDA', id: 6, file: 'borneo.png' },
  { slug: 'PSM_MAKASSAR', id: 7, file: 'psm.png' },
  { slug: 'DEWA_UNITED_BANTEN_FC', id: 8, file: 'dewa.png' },
  { slug: 'MADURA_UNITED_FC', id: 9, file: 'madura.png' },
  { slug: 'PERSITA', id: 10, file: 'persita.png' },
  { slug: 'PSS_SLEMAN_', id: 11, file: 'pss.png' },
  { slug: 'PERSIK_KEDIRI', id: 12, file: 'persik.png' },
  { slug: 'BHAYANGKARA_PRESISI_LAMPUNG_FC', id: 13, file: 'bhayangkara.png' },
  { slug: 'PERSIJAP_JEPARA', id: 14, file: 'persijap.png' },
  { slug: 'PSIM_YOGYAKARTA', id: 15, file: 'psim.png' },
  { slug: 'ISENMULANG_KALTENG_FC', id: 16, file: 'isenmulang.png' },
  { slug: 'GARUDAYAKSA_FC', id: 17, file: 'garudayaksa.png' },
  { slug: 'JAVA_UNITED_FC', id: 18, file: 'java.png' }
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.text();
}

const indexHtml = await fetchText(INDEX_URL);

// --- 1. Ambil URL logo per klub dari index (logo-team di dalam link klub) ---
const logoUrls = {};
const re = /href="https:\/\/ileague\.id\/clubs\/single\/BRI_SUPER_LEAGUE_2026-27\/([A-Z_0-9]+)"[^>]*>\s*<img\s+src="(https:\/\/assets\.ileague\.id\/uploads\/images\/logo\/[^"?]+)/gi;
let m;
while ((m = re.exec(indexHtml)) !== null) {
  const slug = m[1];
  if (!logoUrls[slug]) logoUrls[slug] = m[2];
}

// --- 2. Unduh logo ke backend/src/public/img/clubs/ ---
const logoDir = path.join(__dirname, 'backend', 'src', 'public', 'img', 'clubs');
for (const c of CLUB_MAP) {
  const url = logoUrls[c.slug];
  if (!url) { console.error('LOGO TIDAK DITEMUKAN:', c.slug); continue; }
  const dest = path.join(logoDir, c.file);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log('logo OK:', c.file, Math.round(fs.statSync(dest).size / 1024) + 'KB');
  } catch (e) {
    console.error('logo GAGAL:', c.slug, e.message);
  }
}

// --- 3. Bangun rosters.json dari hasil fetch nama pemain ---
const players = JSON.parse(fs.readFileSync(path.join(__dirname, 'ileague_players.json'), 'utf8'));

// Heuristik pemain asing: pola nama Brazil/Eropa/Afrika/Jepang/Korea umum di Liga 1.
const FOREIGN_RE = /(silva|santos|souza|costa|pereira|oliveira|farias|moreira|junior|ferreira|almeida|barbosa|gustavo|lucas|rafael|ricardo|eduardo|vitor|guilherme|mechinovic|kozubaev|kuziev|palic|struick|chan|fane|kouassi|mamadou|abdoulaye|tanque|romero|guevara|munoz|landis|bahtiar\b.*k)/i;

function titleCase(s) {
  return s.toLowerCase().split(' ').map((w) => (w === 'g.' || w === 'jr.' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

const rosters = {};
const POS_PLAN = ['GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW', 'FW', 'FW', 'FW'];
for (const c of CLUB_MAP) {
  const names = [...new Set((players[c.slug] || []).map((p) => titleCase(p.name)))]
    .filter((n) => n.length >= 2 && !/^\d+$/.test(n));
  const list = names.slice(0, 24);
  const roster = list.map((n, i) => ({ n, p: POS_PLAN[i] || 'FW', f: FOREIGN_RE.test(n) ? 1 : 0 }));
  rosters[c.id] = roster;
  console.log(c.slug, '->', roster.length, 'pemain,', roster.filter((r) => r.f).length, 'asing');
}
fs.writeFileSync(path.join(__dirname, 'backend', 'src', 'rosters.json'), JSON.stringify(rosters, null, 1));
console.log('rosters.json ditulis. Total:', Object.values(rosters).reduce((a, b) => a + b.length, 0));
