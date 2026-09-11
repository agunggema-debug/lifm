// Script one-off: update data klub + pemain LIFM dari situs resmi ileague.id
// Sumber: https://ileague.id/clubs/index/BRI_SUPER_LEAGUE_2026-27
import fs from 'node:fs';

const BASE = 'https://ileague.id/clubs/single/BRI_SUPER_LEAGUE_2026-27/';
const CLUB_SLUGS = [
  'AREMA_FC', 'BALI_UNITED_FC', 'BHAYANGKARA_PRESISI_LAMPUNG_FC', 'BORNEO_FC_SAMARINDA',
  'DEWA_UNITED_BANTEN_FC', 'GARUDAYAKSA_FC', 'ISENMULANG_KALTENG_FC', 'JAVA_UNITED_FC',
  'MADURA_UNITED_FC', 'PERSEBAYA_SURABAYA', 'PERSIB_BANDUNG', 'PERSIJA_JAKARTA',
  'PERSIJAP_JEPARA', 'PERSIK_KEDIRI', 'PERSITA', 'PSIM_YOGYAKARTA', 'PSM_MAKASSAR', 'PSS_SLEMAN_'
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return res.text();
}

// Nama tampilan pemain ada di <td ... colspan="2">NAMA</td>.
// Strategi: untuk tiap kejadian nama, slug = marker singleplayer TERAKHIR sebelum td,
// posisi = <td>Posisi</td><td>X</td> pertama SETELAH td nama. Dedup per nama.
function parsePlayers(html, clubSlug) {
  const marker = 'singleplayer/bri_super_league_2026-27/';
  const nameRe = /colspan="2">\s*([^<\r\n]{2,60}?)\s*<\/td>/g;
  const posRe = /<td[^>]*>\s*Posisi\s*<\/td>\s*<td[^>]*>\s*([^<\r\n]{1,40}?)\s*<\/td>/;
  const out = [];
  const seen = new Set();
  let lastMarker = -1;
  let mi = html.indexOf(marker);
  let miList = [];
  while (mi !== -1) { miList.push(mi); mi = html.indexOf(marker, mi + marker.length); }
  let mk = 0;
  let m;
  while ((m = nameRe.exec(html)) !== null) {
    while (mk < miList.length && miList[mk] < m.index) mk++;
    const slugIdx = mk > 0 ? mk - 1 : -1;
    const slug = slugIdx >= 0 ? html.slice(miList[slugIdx] + marker.length).match(/^([a-z0-9_.-]+)\?token=/)?.[1] : null;
    const name = m[1].replace(/\s+/g, ' ').trim();
    const up = name.toUpperCase();
    if (!slug || up === 'PEMAIN' || up === 'POSISI') continue;
    if (seen.has(up)) continue;
    seen.add(up);
    const after = html.slice(m.index, m.index + 1500);
    const pm = after.match(posRe);
    out.push({ club: clubSlug, slug, name, pos: pm ? pm[1].replace(/\s+/g, ' ').trim() : '' });
  }
  return out;
}

const result = {};
for (const slug of CLUB_SLUGS) result[slug] = [];
for (const slug of CLUB_SLUGS) {
  try {
    let html = await fetchText(BASE + slug);
    if (html.indexOf('singleplayer/bri_super_league_2026-27/') === -1) {
      // Retry sekali (kadang server balas versi ringkas/bot-check).
      await new Promise((r) => setTimeout(r, 800));
      html = await fetchText(BASE + slug);
    }
    const players = parsePlayers(html, slug);
    // Dedup: tiap pemain muncul 2x (anchor foto + anchor nama).
    const seen = new Set();
    for (const p of players) {
      const key = p.slug + '|' + p.name.toUpperCase();
      if (!seen.has(key)) { seen.add(key); result[slug].push(p); }
    }
    console.log(slug, '->', result[slug].length, 'pemain (html', html.length, 'bytes)');
  } catch (e) {
    console.error(slug, 'GAGAL:', e.message);
    result[slug] = [];
  }
}
fs.writeFileSync(new URL('./ileague_players.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('Total pemain:', Object.values(result).reduce((a, b) => a + b.length, 0));
