// Server-authoritative Match Engine (PRD 4.3).
export const MENTALITY_MOD = {
  attacking: { atk: 1.18, mid: 1.05, def: 0.9 },
  balanced: { atk: 1.0, mid: 1.0, def: 1.0 },
  defensive: { atk: 0.86, mid: 0.97, def: 1.16 }
};
export const FORMATION_MOD = {
  '4-4-2': { atk: 1.0, mid: 1.0, def: 1.0 },
  '4-3-3': { atk: 1.1, mid: 0.98, def: 0.95 },
  '3-5-2': { atk: 1.02, mid: 1.12, def: 0.92 }
};

export const FORMATION_MOD2 = {
  '4-2-3-1': { atk: 1.05, mid: 1.05, def: 1.0 },
  '5-3-2': { atk: 0.9, mid: 0.95, def: 1.15 },
  '4-5-1': { atk: 0.92, mid: 1.08, def: 1.05 }
};
Object.assign(FORMATION_MOD, FORMATION_MOD2);

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 50; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

export function rateTeam(xi, mentality, formation, isHome) {
  mentality = mentality || 'balanced';
  formation = formation || '4-4-2';
  const atkP = xi.filter(function (p) { return p.pos === 'FW' || p.pos === 'MF'; });
  const defP = xi.filter(function (p) { return p.pos === 'DF' || p.pos === 'GK'; });
  const atk = avg(atkP.map(function (p) { return (p.sho * 0.55 + p.pas * 0.25 + p.pac * 0.2) * (0.7 + p.morale / 250); }));
  const mid = avg(xi.map(function (p) { return (p.pas * 0.5 + p.sta * 0.3 + p.pac * 0.2) * (0.7 + p.morale / 250); }));
  const gk = xi.find(function (p) { return p.pos === 'GK'; });
  const def = avg(defP.map(function (p) { return (p.def * 0.6 + p.pac * 0.2 + p.sta * 0.2) * (0.7 + p.morale / 250); })) * 0.75
    + ((gk ? gk.gk * 0.9 + gk.morale * 0.1 : 60) * 0.25);
  const m = MENTALITY_MOD[mentality] || MENTALITY_MOD.balanced;
  const f = FORMATION_MOD[formation] || FORMATION_MOD['4-4-2'];
  const hb = isHome ? 4 : 0;
  return { atk: atk * m.atk * f.atk + hb, mid: mid * m.mid * f.mid + hb * 0.5, def: def * m.def * f.def + hb * 0.5 };
}


