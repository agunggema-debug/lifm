// Generator rosters.json final:
// - NAMA pemain: situs resmi ileague.id (ileague_players.json, hasil fetch_ileague.mjs)
// - POSISI + kewarganegaraan: Transfermarkt (via r.jina.ai reader, karena TM memblokir bot)
//   dengan fallback Wikipedia (templat "Fs player") lalu heuristik.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}
async function jina(url) {
  const t = await fetchText('https://r.jina.ai/' + url);
  if (t.length < 500) throw new Error('konten terlalu pendek');
  return t;
}

// ===== 1. Klub TM: dari halaman kompetisi Liga 1 (IDN1) ambil verein id per klub =====
const SLUG_BY_ID = { 1:'PERSIJA_JAKARTA',2:'PERSIB_BANDUNG',3:'PERSEBAYA_SURABAYA',4:'AREMA_FC',5:'BALI_UNITED_FC',6:'BORNEO_FC_SAMARINDA',7:'PSM_MAKASSAR',8:'DEWA_UNITED_BANTEN_FC',9:'MADURA_UNITED_FC',10:'PERSITA',11:'PSS_SLEMAN_',12:'PERSIK_KEDIRI',13:'BHAYANGKARA_PRESISI_LAMPUNG_FC',14:'PERSIJAP_JEPARA',15:'PSIM_YOGYAKARTA',16:'ISENMULANG_KALTENG_FC',17:'GARUDAYAKSA_FC',18:'JAVA_UNITED_FC' };
// Nama ileague -> alias pencarian di TM
const NAME_BY_ID = { 1:'Persija Jakarta',2:'Persib Bandung',3:'Persebaya Surabaya',4:'Arema FC',5:'Bali United',6:'Borneo FC',7:'PSM Makassar',8:'Dewa United',9:'Madura United',10:'Persita',11:'PSS Sleman',12:'Persik Kediri',13:'Bhayangkara',14:'Persijap',15:'PSIM',16:'Isenmulang',17:'Garudayaksa',18:'Java United' };

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = (s) => norm(s).split(' ').filter(Boolean);

// skor kemiripan nama: token persis + awalan 3 huruf (untuk "JULIAN G." vs "Julián Guevara")
function nameScore(a, b) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return 0;
  let score = 0;
  for (const x of A) {
    if (B.includes(x)) score += 2;
    else if (x.length >= 3 && B.some((y) => y.startsWith(x.slice(0, 3)) && x.slice(0, 3) === y.slice(0, 3))) score += 1;
  }
  return score / Math.max(A.length, B.length);
}

// ===== 2. Parse tabel "## Skuad" dari markdown Transfermarkt =====
const POS_MAP = [
  [/^kiper/i, 'GK'],
  [/^bek/i, 'DF'],
  [/(^| )(gelandang|sayap|midfielder)/i, 'MF'],
  [/(^| )(depan|penyerang|striker|forward)/i, 'FW']
];
function mapPos(words) {
  for (const [re, p] of POS_MAP) if (re.test(words)) return p;
  return null;
}
function parseTmSquad(md) {
  const idx = md.indexOf('## Skuad');
  if (idx === -1) return [];
  const body = md.slice(idx, md.indexOf('##', idx + 5) === -1 ? md.length : md.indexOf('##', idx + 5));
  const rows = body.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*[-#]/.test(l));
  const out = [];
  for (const row of rows) {
    // Nama: link profil pemain pertama (bukan startseite/marktwertverlauf)
    const nm = row.match(/\[(?!\!\[)([^\]]+)\]\(https:\/\/www\.transfermarkt\.co\.id\/[a-z0-9-]+\/profil\/spieler\/\d+\)/);
    if (!nm) continue;
    const name = nm[1].trim();
    // Posisi: kata setelah link nama, sebelum "|"
    const after = row.slice(row.indexOf(nm[0]) + nm[0].length, row.indexOf(nm[0]) + nm[0].length + 60);
    const pw = after.match(/^\s*([^|]*?)\s*\|/);
    const pos = pw ? mapPos(pw[1]) : null;
    // Negara: alt gambar flag pertama di baris
    const flag = row.match(/!\[Image \d+: ([^\]]+)\]\([^)]*transfermarkt\.technology\/flagge/);
    out.push({ name, pos, nat: flag ? flag[1] : null });
  }
  return out;
}

// ===== 3. Parse skuad Wikipedia (templat Fs player) =====
function parseWikiSquad(html) {
  const out = [];
  const re = /"wt":"Fs player2?"[\s\S]{0,200}?"params":\{(.*?)\},"i":\d+\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const get = (k) => { const pm = m[1].match(new RegExp('"' + k + '":\\{"wt":"(.*?)"}')); return pm ? pm[1] : ''; };
    const rawPos = get('pos').toUpperCase();
    const rawNat = get('nat').toUpperCase();
    const raw = get('name');
    if (!raw) continue;
    const name = raw.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, (s, a, b) => (b ? b.slice(1) : a)).replace(/''+/g, '').replace(/\s+/g, ' ').trim();
    let pos = null;
    if (/^(GK|KP|PENJAGA|GOAL|KEEPER)/.test(rawPos)) pos = 'GK';
    else if (/^(DF|BEK|DEF|BACK)/.test(rawPos)) pos = 'DF';
    else if (/^(MF|GB|GELANDANG|MID)/.test(rawPos)) pos = 'MF';
    else if (/^(FW|ST|PENYERANG|DEPAN|FWD|FORWARD|STRIKER|ATT)/.test(rawPos)) pos = 'FW';
    if (pos) out.push({ name, pos, nat: rawNat });
  }
  return out;
}

// ===== 4. Ambil verein id TM per klub dari halaman kompetisi =====
const ileague = JSON.parse(fs.readFileSync(path.join(__dirname, 'ileague_players.json'), 'utf8'));
const TARGET = { GK: 2, DF: 8, MF: 8, FW: 6 };

const compMd = await jina('https://www.transfermarkt.co.id/liga-1-indonesien/startseite/wettbewerb/IDN1/saison_id/2026');
const vereinUrls = [...compMd.matchAll(/https:\/\/www\.transfermarkt\.co\.id\/([a-z0-9-]+)\/startseite\/verein\/(\d+)(?:\/saison_id\/\d+)?/g)];
const clubUrl = {};
for (const [, slug, vid] of vereinUrls) {
  const key = norm(slug.replace(/-/g, ' '));
  for (const [id, nm] of Object.entries(NAME_BY_ID)) {
    const words = norm(nm).split(' ');
    if (!clubUrl[id] && words.every((w) => key.includes(w))) clubUrl[id] = vid;
  }
}
// Normalisasi alias khusus (nama TM berbeda dari ileague)
const ALIAS = { persija: 1, jakarta: 1, persib: 2, bandung: 2, persebaya: 3, surabaya: 3, arema: 4, bali: 5, borneo: 6, samarinda: 6, psm: 7, makassar: 7, dewa: 8, madura: 9, persita: 10, pss: 11, sleman: 11, persik: 12, kediri: 12, bhayangkara: 13, lampung: 13, presisi: 13, persijap: 14, jepara: 14, psim: 15, yogyakarta: 15, garudayaksa: 17, 'java-united': 18 };
for (const [, slug, vid] of vereinUrls) {
  for (const [alias, id] of Object.entries(ALIAS)) {
    if (slug.includes(alias) && !clubUrl[id]) clubUrl[id] = vid;
  }
}
console.log('TM verein ditemukan:', JSON.stringify(clubUrl));

// ===== 5. Bangun roster per klub =====
function titleCase(s) {
  return s.split(' ').map((w) => (w.length <= 2 && w.endsWith('.') ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}
const PLAN = ['GK','GK','DF','DF','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','MF','MF','MF','FW','FW','FW','FW','FW','FW'];
const FOREIGN_ILEAGUE = /(silva|santos|souza|costa|pereira|oliveira|farias|moreira|junior|ferreira|almeida|barbosa|guilherme|mechinovic|kozubaev|kuziev|palic|struick|kouassi|mamadou|abdoulaye|tanque|romero|guevara|munoz|landis)/i;

function buildForClub(id, sources) {
  const pool = [...new Set((ileague[SLUG_BY_ID[id]] || []).map((p) => titleCase(p.name)))]
    .filter((n) => n.length >= 2 && !/^\d+$/.test(n));
  const roster = pool.map((n) => ({ n, p: null, f: null }));
  // Match tiap nama ileague ke sumber posisi (TM/Wikipedia)
  for (const r of roster) {
    let best = null, bestScore = 0;
    for (const s of sources) {
      const sc = nameScore(r.n, s.name);
      if (sc > bestScore && sc >= 0.34) { best = s; bestScore = sc; }
    }
    if (best) { r.p = best.pos; r.f = best.nat ? !/^(indonesia|idn|ina|id)$/i.test(best.nat) : null; }
  }
  // Ambil sesuai kuota GK2/DF8/MF8/FW6; kelebihan kuota dilepas, kurang diisi sisa nama
  const take = { GK: [], DF: [], MF: [], FW: [] };
  const rest = [];
  for (const r of roster) {
    if (r.p && take[r.p].length < TARGET[r.p]) take[r.p].push(r);
    else rest.push(r);
  }
  const final = [];
  for (const pos of ['GK', 'DF', 'MF', 'FW']) {
    final.push(...take[pos]);
    let need = TARGET[pos] - take[pos].length;
    while (need > 0 && rest.length) {
      const r = rest.shift();
      r.p = pos;
      if (r.f === null) r.f = FOREIGN_ILEAGUE.test(r.n) ? 1 : 0;
      final.push(r);
      need--;
    }
  }
  for (const r of final) if (r.f === null) r.f = FOREIGN_ILEAGUE.test(r.n) ? 1 : 0;
  return final.map((r) => ({ n: r.n, p: r.p, f: r.f ? 1 : 0 }));
}

// ===== 6. Eksekusi per klub: TM (utama) -> Wikipedia -> fallback heuristik =====
const WIKI_TITLES = {
  1: ['Persija Jakarta'], 2: ['Persib Bandung'], 3: ['Persebaya Surabaya'], 4: ['Arema FC'],
  5: ['Bali United FC'], 6: ['Borneo FC Samarinda', 'Borneo FC'], 7: ['PSM Makassar'],
  8: ['Dewa United FC', 'Dewa United'], 9: ['Madura United FC', 'Madura United'],
  10: ['Persita Tangerang', 'Persita'], 11: ['PSS Sleman'], 12: ['Persik Kediri'],
  13: ['Bhayangkara Presisi Lampung FC', 'Bhayangkara FC'], 14: ['Persijap Jepara'],
  15: ['PSIM Yogyakarta'], 16: [], 17: ['Garudayaksa FC'], 18: []
};

const rosters = {};
for (let id = 1; id <= 18; id++) {
  let sources = [];
  // a) Transfermarkt via r.jina.ai
  if (clubUrl[id]) {
    try {
      const url = 'https://www.transfermarkt.co.id/liga-1-indonesien/startseite/verein/' + clubUrl[id] + '/saison_id/2026';
      const md = await jina(url);
      const tm = parseTmSquad(md).filter((s) => s.pos);
      if (tm.length >= 10) { sources = tm; console.log('TM OK', id, NAME_BY_ID[id], '->', tm.length, 'pemain TM'); }
    } catch (e) { console.log('TM GAGAL', id, e.message); await new Promise((r) => setTimeout(r, 1200)); }
  }
  // b) Wikipedia fallback
  if (sources.length < 10) {
    for (const t of WIKI_TITLES[id] || []) {
      try {
        const html = await fetchText('https://id.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')));
        const wiki = parseWikiSquad(html);
        if (wiki.length >= 5) { sources = wiki; console.log('WIKI OK', id, t, '->', wiki.length); break; }
      } catch (e) { console.log('WIKI GAGAL', id, t, e.message); }
    }
  }
  rosters[id] = buildForClub(id, sources);
  const c = (p) => rosters[id].filter((r) => r.p === p).length;
  console.log('ROSTER', id, NAME_BY_ID[id], '->', rosters[id].length, '| GK', c('GK'), 'DF', c('DF'), 'MF', c('MF'), 'FW', c('FW'), '| asing', rosters[id].filter((r) => r.f).length);
  await new Promise((r) => setTimeout(r, 900));
}
fs.writeFileSync(path.join(__dirname, 'backend', 'src', 'rosters.json'), JSON.stringify(rosters, null, 1));
console.log('rosters.json (final) ditulis. Total:', Object.values(rosters).reduce((a, b) => a + b.length, 0));
