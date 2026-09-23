// Script one-off: update klub + logo + jadwal ACL Elite dari sumber resmi AFC.
// Sumber: halaman Wikipedia "2026–27 AFC Champions League Elite" (+ halaman league stage)
// yang mengutip jadwal & hasil undian AFC resmi. Dipakai karena worldfootball.net
// (https://www.worldfootball.net/competition/co712/afc-afc-champions-league-elite/)
// memblokir permintaan otomatis (Cloudflare HTTP 403) sedangkan datanya identik.
// Hasil: backend/src/acl_elite.json (zona + pot + 128 laga league phase) & logo klub
// di backend/src/public/img/clubs + frontend/public/img/clubs.
// Pakai: node fetch_acl_elite.mjs [--force]   (--force = unduh ulang semua logo)
import fs from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const PAGES = {
  main: 'https://en.wikipedia.org/w/index.php?title=2026%E2%80%9327_AFC_Champions_League_Elite&action=raw',
  league: 'https://en.wikipedia.org/w/index.php?title=2026%E2%80%9327_AFC_Champions_League_Elite_league_stage&action=raw'
};
// ===== Peta klub: nama di sumber -> klub LIFM (id, file logo, negara, judul Wikipedia) =====
// 2026/27: ACL Elite diperluas jadi 32 klub (16 Zona Barat + 16 Zona Timur), 8 laga/klub.
// Juara ACL Two 2025/26 di dunia nyata = Gamba Osaka; di narasi LIFM juara ACL Two = Persib
// (id 2), jadi Persib MENGGANTIKAN jatah Gamba Osaka di Zona Timur (rute juara ACL Two).
const TEAM_MAP = [
  // ---- Zona Barat (16) ----
  { src: 'Al-Ahli', id: 50, file: 'al_ahli.png', country: 'KSA', wiki: 'Al-Ahli Saudi FC' },
  { src: 'Al-Nassr', id: 51, file: 'al_nassr.png', country: 'KSA', wiki: 'Al-Nassr FC' },
  { src: 'Al-Hilal', id: 52, file: 'al_hilal.png', country: 'KSA', wiki: 'Al Hilal SFC' },
  { src: 'Al-Qadsiah', id: 53, file: 'al_qadsiah.png', country: 'KSA', wiki: 'Al-Qadsiah FC' },
  { src: 'Al Ain', id: 54, file: 'al_ain.png', country: 'UAE', wiki: 'Al Ain FC' },
  { src: 'Shabab Al Ahli', id: 55, file: 'shabab_al_ahli.png', country: 'UAE', wiki: 'Shabab Al Ahli Club' },
  { src: 'Al Wasl', id: 56, file: 'al_wasl.png', country: 'UAE', wiki: 'Al Wasl F.C.' },
  { src: 'Al Sadd', id: 57, file: 'al_sadd.png', country: 'QAT', wiki: 'Al Sadd SC' },
  { src: 'Al-Gharafa', id: 58, file: 'al_gharafa.png', country: 'QAT', wiki: 'Al-Gharafa SC' },
  { src: 'Al-Shamal', id: 59, file: 'al_shamal.png', country: 'QAT', wiki: 'Al-Shamal SC' },
  { src: 'Esteghlal', id: 60, file: 'esteghlal.png', country: 'IRN', wiki: 'Esteghlal F.C.' },
  { src: 'Tractor', id: 61, file: 'tractor.png', country: 'IRN', wiki: 'Tractor S.C.' },
  { src: 'Neftchi', id: 62, file: 'neftchi_fergana.png', country: 'UZB', wiki: 'FC Neftchi Fergana' },
  { src: 'Al-Quwa Al-Jawiya', id: 63, file: 'al_quwa_al_jawiya.png', country: 'IRQ', wiki: 'Al-Quwa Al-Jawiya' },
  { src: 'Pakhtakor', id: 64, file: 'pakhtakor.png', country: 'UZB', wiki: 'Pakhtakor FC' },
  { src: 'Al-Ittihad', id: 65, file: 'al_ittihad.png', country: 'KSA', wiki: 'Al-Ittihad Club (Jeddah)' },
  // ---- Zona Timur (15 klub nyata; 1 slot = Persib id 2 / rute juara ACL Two) ----
  { src: 'Kashima Antlers', id: 66, file: 'kashima_antlers.png', country: 'JPN', wiki: 'Kashima Antlers' },
  { src: 'Vissel Kobe', id: 67, file: 'vissel_kobe.png', country: 'JPN', wiki: 'Vissel Kobe' },
  { src: 'Kashiwa Reysol', id: 68, file: 'kashiwa_reysol.png', country: 'JPN', wiki: 'Kashiwa Reysol' },
  { src: 'Kyoto Sanga', id: 69, file: 'kyoto_sanga.png', country: 'JPN', wiki: 'Kyoto Sanga FC' },
  { src: 'Jeonbuk Hyundai Motors', id: 70, file: 'jeonbuk.png', country: 'KOR', wiki: 'Jeonbuk Hyundai Motors' },
  { src: 'Daejeon Hana Citizen', id: 71, file: 'daejeon_hana.png', country: 'KOR', wiki: 'Daejeon Hana Citizen' },
  { src: 'Pohang Steelers', id: 72, file: 'pohang_steelers.png', country: 'KOR', wiki: 'Pohang Steelers' },
  { src: 'Buriram United', id: 73, file: 'buriram_united.png', country: 'THA', wiki: 'Buriram United F.C.' },
  { src: 'Port', id: 74, file: 'port_fc.png', country: 'THA', wiki: 'Port F.C.' },
  { src: 'Ratchaburi', id: 75, file: 'ratchaburi.png', country: 'THA', wiki: 'Ratchaburi F.C.' },
  { src: 'Shanghai Port', id: 76, file: 'shanghai_port.png', country: 'CHN', wiki: 'Shanghai Port F.C.' },
  { src: 'Beijing Guoan', id: 77, file: 'beijing_guoan.png', country: 'CHN', wiki: 'Beijing Guoan F.C.' },
  { src: 'Newcastle Jets', id: 78, file: 'newcastle_jets.png', country: 'AUS', wiki: 'Newcastle Jets FC' },
  { src: "Johor Darul Ta'zim", id: 79, file: 'johor_darul_tazim.png', country: 'MAS', wiki: "Johor Darul Ta'zim F.C." },
  { src: 'Công An Hà Nội', id: 80, file: 'cong_an_hanoi.png', country: 'VIE', wiki: 'Cong An Hanoi FC' }
];
// Nama di sumber yang digantikan klub LIFM (rute juara ACL Two Zona Timur).

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'LIFM-data-bot/1.0 (https://github.com/agunggema-debug/lifm)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.text();
}

// "{{fbaicon|UAE}} [[Al Ain FC|Al Ain]]" -> "Al Ain"
function teamOf(s) {
  const link = s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (link) return (link[2] || link[1]).replace(/\s+/g, ' ').trim();
  return s.replace(/\{\{[^}]*\}\}/g, '').replace(/\s+/g, ' ').trim();
}
// "{{fbaicon|JPN}}" -> "JPN"
function countryOf(s) {
  const m = s.match(/\{\{fba?icon\|([A-Z]{3})\}\}/i);
  return m ? m[1].toUpperCase() : '';
}

// Ambil semua {{Footballbox}} pada satu blok teks (MD1-2 sudah ada skornya, MD3-8 jadwal kosong).
function parseBoxes(chunk) {
  const out = [];
  const re = /\{\{Football ?box\n([\s\S]*?)\n\}\}/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    const body = m[1];
    const f = (name) => {
      const r = new RegExp('\\|\\s*' + name + '\\s*=([^\\n]*)');
      const mm = body.match(r);
      return mm ? mm[1].trim() : '';
    };
    const t1 = f('team1');
    const t2 = f('team2');
    const date = f('date').match(/\{\{Start date\|(\d+)\|(\d+)\|(\d+)/);
    out.push({
      home: teamOf(t1),
      away: teamOf(t2),
      score: f('score').replace(/[−–—]/g, '-'),
      date: date ? date[1] + '-' + String(date[2]).padStart(2, '0') + '-' + String(date[3]).padStart(2, '0') : ''
    });
  }
  return out;
}

// Ambil 8 matchday dari satu blok region ("===West Region===" sampai header level-3 berikutnya).
function parseRegion(text, label) {
  const start = text.indexOf('===' + label + '===');
  if (start === -1) throw new Error('Region tidak ditemukan: ' + label);
  const rest = text.slice(start + 3);
  const next = rest.search(/\n===[^=]/);
  const body = next === -1 ? rest : rest.slice(0, next);
  const mds = {};
  const parts = body.split(/=====Matchday (\d)=====/).slice(1);
  for (let i = 0; i < parts.length; i += 2) mds[parts[i]] = parseBoxes(parts[i + 1]);
  return mds;
}

// Parse tabel pot (Pot 1-4 per region) dari bagian "Seeding" halaman league stage.
function parsePots(text) {
  const start = text.indexOf('===Seeding===');
  const end = text.indexOf('===Grid result===');
  if (start === -1 || end === -1) throw new Error('Tabel Seeding tidak ditemukan');
  const block = text.slice(start, end);
  const out = { west: {}, east: {} };
  for (const [key, label] of [['west', 'West Region'], ['east', 'East Region']]) {
    const i = block.indexOf('!' + label);
    if (i === -1) throw new Error('Pot tidak ditemukan: ' + label);
    const j = block.indexOf('!', i + 2);
    const chunk = block.slice(i, j === -1 ? undefined : j);
    let pot = 0;
    for (const c of chunk.split('\n|').slice(1)) {
      if (!c.trimStart().startsWith('*')) continue;
      pot++;
      out[key]['Pot ' + pot] = c
        .split('\n')
        .filter((l) => l.trim().startsWith('*'))
        .map((l) => ({ team: teamOf(l), country: countryOf(l) }));
    }
  }
  return out;
}

const REPLACED = { 'Gamba Osaka': 2 /* Persib Bandung */ };


// ===== Logo klub (thumbnail PNG, dari infobox artikel klub di Wikipedia) =====
async function wikiApi(params) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(url, { headers: { 'User-Agent': 'LIFM-data-bot/1.0 (https://github.com/agunggema-debug/lifm)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.json();
}

// Cari file logo di infobox artikel klub; fallback ke gambar utama halaman (pageimages).
async function logoFileOf(title) {
  const raw = await fetchText('https://en.wikipedia.org/w/index.php?title=' + encodeURIComponent(title) + '&action=raw');
  for (const key of ['logo', 'image', 'crest', 'badge']) {
    const m = raw.match(new RegExp('\\|\\s*' + key + '\\s*=\\s*(?:\\[\\[)?(?:File:)?([^|\\]\\n\\}]+)', 'i'));
    if (m) return m[1].trim();
  }
  const pi = await wikiApi({ action: 'query', prop: 'pageimages', piprop: 'name', titles: title, redirects: '1' });
  const page = pi.query && pi.query.pages && pi.query.pages[0];
  return (page && page.pageimage) || '';
}

const LOGO_DIRS = [
  path.join('backend', 'src', 'public', 'img', 'clubs'),
  path.join('frontend', 'public', 'img', 'clubs')
];

async function downloadLogo(team) {
  if (!FORCE && LOGO_DIRS.every((d) => fs.existsSync(path.join(d, team.file)))) return 'ada (skip)';
  const fileName = await logoFileOf(team.wiki);
  if (!fileName) return 'GAGAL: file logo tidak ditemukan';
  const info = await wikiApi({ action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '200', titles: 'File:' + fileName });
  const page = info.query && info.query.pages && info.query.pages[0];
  const ii = page && page.imageinfo && page.imageinfo[0];
  const src = ii && (ii.thumburl || ii.url);
  if (!src) return 'GAGAL: url logo kosong (' + fileName + ')';
  const res = await fetch(src, { headers: { 'User-Agent': 'LIFM-data-bot/1.0' } });
  if (!res.ok) return 'GAGAL: unduh HTTP ' + res.status;
  const buf = Buffer.from(await res.arrayBuffer());
  for (const d of LOGO_DIRS) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, team.file), buf);
  }
  return 'OK ' + Math.round(buf.length / 1024) + 'KB (' + fileName + ')';
}

// ===== Main: ambil sumber -> resolve id klub -> tulis backend/src/acl_elite.json =====
const [mainWiki, leagueWiki] = await Promise.all([fetchText(PAGES.main), fetchText(PAGES.league)]);

const bySrc = {};
for (const t of TEAM_MAP) bySrc[t.src] = t.id;
const idOf = (name) => {
  if (bySrc[name]) return bySrc[name];
  if (REPLACED[name]) return REPLACED[name];
  throw new Error('Klub tidak dikenal di TEAM_MAP: ' + name);
};

const rawPots = parsePots(leagueWiki);
const rawFix = { west: parseRegion(leagueWiki, 'West Region'), east: parseRegion(leagueWiki, 'East Region') };
const zones = {};
const fixtures = {};
for (const zone of ['west', 'east']) {
  const potIds = Object.keys(rawPots[zone]).sort().map((k) => rawPots[zone][k].map((x) => idOf(x.team)));
  const ids = potIds.reduce((a, p) => a.concat(p), []);
  if (ids.length !== 16) throw new Error('Zona ' + zone + ': jumlah klub ' + ids.length + ' (harus 16)');
  zones[zone] = { label: zone === 'east' ? 'Zona Timur' : 'Zona Barat', name: zone === 'east' ? 'EAST' : 'WEST', ids, pots: potIds };
  fixtures[zone] = {};
  for (const md of Object.keys(rawFix[zone]).sort((a, b) => a - b)) {
    const list = rawFix[zone][md].map((m) => [idOf(m.home), idOf(m.away)]);
    if (list.length !== 8) throw new Error('Zona ' + zone + ' MD' + md + ': ' + list.length + ' laga (harus 8)');
    fixtures[zone][md] = list;
  }
  // Sanity check: tiap klub 4 kandang + 4 tandang, 8 lawan berbeda.
  const home = {}; const away = {}; const opp = {};
  for (const md of Object.keys(fixtures[zone])) {
    for (const [h, a] of fixtures[zone][md]) {
      home[h] = (home[h] || 0) + 1; away[a] = (away[a] || 0) + 1;
      (opp[h] = opp[h] || new Set()).add(a); (opp[a] = opp[a] || new Set()).add(h);
    }
  }
  for (const id of ids) {
    if (home[id] !== 4 || away[id] !== 4 || opp[id].size !== 8) throw new Error('Zona ' + zone + ' klub ' + id + ': H' + home[id] + ' A' + away[id] + ' lawan ' + opp[id].size);
  }
}

const out = {
  source: '2026-27 AFC Champions League Elite league stage (jadwal/undian resmi AFC)',
  note: 'worldfootball.net/competition/co712 memblokir akses otomatis (HTTP 403) — data di bawah dari undian AFC yang sama.',
  generated: new Date().toISOString().slice(0, 10),
  clubs: TEAM_MAP.map((t) => ({ id: t.id, name: t.src, country: t.country, logo: t.file })),
  replaced: REPLACED,
  zones,
  fixtures
};
fs.writeFileSync(path.join('backend', 'src', 'acl_elite.json'), JSON.stringify(out, null, 2));

console.log('Ringkasan ACL Elite 2026/27 (32 klub, 128 laga league phase):');
for (const zone of ['west', 'east']) {
  const z = zones[zone];
  const games = Object.values(fixtures[zone]).reduce((a, b) => a + b.length, 0);
  console.log('==', z.name, '|', z.label, '|', z.ids.length, 'klub |', games, 'laga');
  z.pots.forEach((p, i) => console.log('    Pot ' + (i + 1) + ':', p.map((id) => (TEAM_MAP.find((t) => t.id === id) || { src: 'Persib' }).src).join(', ')));
}

console.log('\nLogo klub (backend + frontend public/img/clubs):');
for (const t of TEAM_MAP) {
  try {
    console.log('  ', String(t.id).padStart(3), t.src.padEnd(24), await downloadLogo(t));
  } catch (e) {
    console.log('  ', String(t.id).padStart(3), t.src.padEnd(24), 'GAGAL: ' + e.message);
  }
}
console.log('\nSelesai: backend/src/acl_elite.json + ' + TEAM_MAP.length + ' logo klub.');

