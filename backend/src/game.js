import { all, get, run } from './db.js';

export function overall(p) {
  if (p.pos === 'GK') return Math.round(p.gk * 0.7 + p.def * 0.15 + p.pas * 0.15);
  if (p.pos === 'DF') return Math.round(p.def * 0.55 + p.pac * 0.2 + p.pas * 0.15 + p.sta * 0.1);
  if (p.pos === 'MF') return Math.round(p.pas * 0.45 + p.sta * 0.2 + p.pac * 0.15 + p.sho * 0.2);
  return Math.round(p.sho * 0.5 + p.pac * 0.25 + p.pas * 0.15 + p.sta * 0.1);
}

export async function getSave() {
  return (await get('SELECT * FROM saves WHERE id = 1')) || null;
}

export async function clubMap() {
  const m = {};
  for (const c of await all('SELECT * FROM clubs')) m[c.id] = c;
  return m;
}

export async function squad(clubId) {
  const rows = await all('SELECT * FROM players WHERE club_id = ?', [clubId]);
  return rows.map((p) => ({ ...p, ovr: overall(p) })).sort((a, b) => b.ovr - a.ovr);
}

export function formationNeeds(f) {
  const m = {
    '4-4-2': [1, 4, 4, 2], '4-3-3': [1, 4, 3, 3], '3-5-2': [1, 3, 5, 2],
    '4-2-3-1': [1, 4, 5, 1], '5-3-2': [1, 5, 3, 2], '4-5-1': [1, 4, 5, 1]
  };
  const v = m[f] || m['4-4-2'];
  return { GK: v[0], DF: v[1], MF: v[2], FW: v[3] };
}

export async function autoXI(clubId, formation, mentality) {
  const s = (await squad(clubId)).filter((p) => p.injured_weeks === 0);
  const need = formationNeeds(formation);
  const xi = [];
  const order = ['GK', 'DF', 'MF', 'FW'];
  for (const pos of order) {
    const pool = s.filter((p) => p.pos === pos && xi.indexOf(p) === -1);
    for (let i = 0; i < (need[pos] || 0) && i < pool.length; i++) xi.push(pool[i]);
  }
  if (xi.length < 11) for (const p of s) { if (xi.indexOf(p) === -1 && xi.length < 11) xi.push(p); }
  return { xi: xi.slice(0, 11), formation: formation, mentality: mentality };
}

export async function bumpStanding(clubId, gf, ga) {
  const won = gf > ga ? 1 : 0;
  const drawn = gf === ga ? 1 : 0;
  const lost = gf < ga ? 1 : 0;
  const pts = won ? 3 : drawn ? 1 : 0;
  await run('UPDATE standings_cache SET played=played+1, won=won+?, drawn=drawn+?, lost=lost+?, gf=gf+?, ga=ga+?, gd=gd+?, points=points+? WHERE club_id=?',
    [won, drawn, lost, gf, ga, gf - ga, pts, clubId]);
}

