// Generator rosters.json berbasis Wikipedia (templat "Fs player" pada tabel Skuad).
// Sumber: https://id.wikipedia.org/wiki/<klub> — menyediakan posisi asli (GK/DF/MF/FW)
// dan kewarganegaraan (nat) sehingga flag pemain asing akurat.
// Klub tanpa halaman Wikipedia memakai fallback data ileague.id (posisi heuristik).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// clubId -> daftar kandidat judul halaman Wikipedia (id.wikipedia.org)
const WIKI_TITLES = {
  1: ['Persija Jakarta'],
  2: ['Persib Bandung'],
  3: ['Persebaya Surabaya'],
  4: ['Arema FC'],
  5: ['Bali United FC'],
  6: ['Borneo FC Samarinda', 'Borneo FC'],
  7: ['PSM Makassar'],
  8: ['Dewa United FC', 'Dewa United'],
  9: ['Madura United FC', 'Madura United'],
  10: ['Persita Tangerang', 'Persita'],
  11: ['PSS Sleman'],
  12: ['Persik Kediri'],
  13: ['Bhayangkara Presisi Lampung FC', 'Bhayangkara FC'],
  14: ['Persijap Jepara'],
  15: ['PSIM Yogyakarta'],
  16: [], // Isenmulang Kalteng FC — belum ada halaman Wikipedia
  17: ['Garudayaksa FC'], // kemungkinan belum ada; fallback ileague
  18: []  // Java United FC — belum ada halaman Wikipedia
};

// Klub tanpa Wikipedia: urut id (dipakai untuk fallback dari ileague_players.json)
const SLUG_BY_ID = { 1:'PERSIJA_JAKARTA',2:'PERSIB_BANDUNG',3:'PERSEBAYA_SURABAYA',4:'AREMA_FC',5:'BALI_UNITED_FC',6:'BORNEO_FC_SAMARINDA',7:'PSM_MAKASSAR',8:'DEWA_UNITED_BANTEN_FC',9:'MADURA_UNITED_FC',10:'PERSITA',11:'PSS_SLEMAN_',12:'PERSIK_KEDIRI',13:'BHAYANGKARA_PRESISI_LAMPUNG_FC',14:'PERSIJAP_JEPARA',15:'PSIM_YOGYAKARTA',16:'ISENMULANG_KALTENG_FC',17:'GARUDAYAKSA_FC',18:'JAVA_UNITED_FC' };

const TARGET = { GK: 2, DF: 8, MF: 8, FW: 6 }; // total 24/klub
const ID_NAT = /^(idn?|ina|ind)$/i;

function cleanName(wt) {
  return wt.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, (s, a, b) => (b ? b.slice(1) : a))
    .replace(/''+/g, '').replace(/\s+/g, ' ').trim();
}
function titleCase(s) {
  return s.split(' ').map((w) => (w.length <= 2 && w.endsWith('.') ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'LIFM-updater/1.0 (open source game)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

// Parse semua templat "Fs player" (id.wp) / "Football squad player" & "Infobox football squad
// player" (en.wp) pada halaman Parsoid HTML.
function parseSquad(html) {
  const out = [];
  const re = /"wt":"(?:Fs player2?|Football squad player|Infobox football squad player)"[\s\S]{0,200}?"params":\{(.*?)\},"i":\d+\}/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const params = m[1];
    const get = (k) => { const pm = params.match(new RegExp('"' + k + '":\\{"wt":"(.*?)"}')); return pm ? pm[1] : ''; };
    const pos = (get('pos') || get('position')).toUpperCase();
    const nat = get('nat').toUpperCase();
    const raw = get('name');
    if (!pos || !raw) continue;
    const name = titleCase(cleanName(raw));
    if (!name || name.length < 2) continue;
    out.push({ pos, nat: nat || 'IDN', name, foreign: !ID_NAT.test(nat) ? 1 : 0 });
  }
  return out;
}

const ileague = JSON.parse(fs.readFileSync(path.join(__dirname, 'ileague_players.json'), 'utf8'));
const FOREIGN_ILEAGUE = /(silva|santos|souza|costa|pereira|oliveira|farias|moreira|junior|ferreira|almeida|barbosa|gustavo|lucas|rafael|ricardo|eduardo|vitor|guilherme|mechinovic|kozubaev|kuziev|palic|struick|chan|fane|kouassi|mamadou|abdoulaye|tanque|romero|guevara|munoz|landis)/i;

function fallbackRoster(clubId) {
  const names = [...new Set((ileague[SLUG_BY_ID[clubId]] || []).map((p) => titleCase(p.name)))]
    .filter((n) => n.length >= 2 && !/^\d+$/.test(n)).slice(0, 24);
  const PLAN = ['GK','GK','DF','DF','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','MF','MF','MF','FW','FW','FW','FW','FW','FW'];
  return names.map((n, i) => ({ n, p: PLAN[i] || 'FW', f: FOREIGN_ILEAGUE.test(n) ? 1 : 0 }));
}

function buildRoster(squad) {
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  const seen = new Set();
  for (const s of squad) {
    if (!byPos[s.pos]) continue;
    const key = s.name.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    byPos[s.pos].push({ n: s.name, p: s.pos, f: s.foreign });
  }
  const roster = [];
  for (const pos of ['GK', 'DF', 'MF', 'FW']) roster.push(...byPos[pos].slice(0, TARGET[pos]));
  // Sisa slot (bila skuad Wikipedia kurang) diisi pemain posisi apa pun yang tersisa.
  if (roster.length < 24) {
    const rest = [...byPos.GK, ...byPos.DF, ...byPos.MF, ...byPos.FW].slice(roster.length);
    roster.push(...rest);
  }
  return roster.slice(0, 24).map((r) => ({ n: r.n, p: r.p || 'MF', f: r.f }));
}

const rosters = {};
for (const [idStr, titles] of Object.entries(WIKI_TITLES)) {
  const id = Number(idStr);
  let roster = null;
  for (const t of titles) {
    // Coba en.wikipedia.org dulu (sesuai permintaan), lalu id.wikipedia.org sebagai fallback
    // (skuad sama & selalu mutakhir, ditulis dengan templat Fs player).
    const hosts = ['https://en.wikipedia.org/wiki/', 'https://id.wikipedia.org/wiki/'];
    for (const host of hosts) {
      try {
        const html = await fetchText(host + encodeURIComponent(t.replace(/ /g, '_')));
        const squad = parseSquad(html);
        if (squad.length < 5) throw new Error('skuad tidak ditemukan (' + squad.length + ' templat)');
        roster = buildRoster(squad);
        const cnt = (p) => roster.filter((r) => r.p === p).length;
        console.log('WIKI OK', id, host.includes('/en.') ? '[en]' : '[id]', t, '->', roster.length, 'pemain | GK:', cnt('GK'), 'DF:', cnt('DF'), 'MF:', cnt('MF'), 'FW:', cnt('FW'), '| asing:', roster.filter((r) => r.f).length);
        break;
      } catch (e) { console.log('WIKI GAGAL', id, host.includes('/en.') ? '[en]' : '[id]', t, e.message); }
    }
    if (roster) break;
  }
  if (!roster) { roster = fallbackRoster(id); console.log('FALLBACK ileague', id, '->', roster.length); }
  rosters[id] = roster;
}
fs.writeFileSync(path.join(__dirname, 'backend', 'src', 'rosters.json'), JSON.stringify(rosters, null, 1));
console.log('rosters.json (Wikipedia) ditulis. Total:', Object.values(rosters).reduce((a, b) => a + b.length, 0));