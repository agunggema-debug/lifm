// Polem: rosters.json dari generator (UPPERCASE ileague) -> Title Case rapi
// Inisial tetap besar (mis. "H. RIZWAN" -> "H. Rizwan", "JULIO C" -> "Julio C").
import fs from 'node:fs';
const p = new URL('./backend/src/rosters.json', import.meta.url);
const rosters = JSON.parse(fs.readFileSync(p, 'utf8'));
const fix = (s) => s.toLowerCase().split(' ').map((w) => (w.length <= 2 && w.endsWith('.') ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
for (const list of Object.values(rosters)) for (const r of list) r.n = fix(r.n);
fs.writeFileSync(p, JSON.stringify(rosters, null, 1));
console.log('rosters.json dirapikan (Title Case)');
