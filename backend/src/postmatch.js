import { stmt, batch } from './db.js';
export async function applyPostMatch(side, teamKey, result) {
  const won = teamKey === 'home'
    ? result.homeGoals > result.awayGoals
    : result.awayGoals > result.homeGoals;
  const drawn = result.homeGoals === result.awayGoals;
  const stmts = [];
  for (const p of side) {
    let morale = p.morale + (won ? 4 : drawn ? 1 : -4);
    morale = Math.max(30, Math.min(99, morale));
    stmts.push(stmt('UPDATE players SET morale = ? WHERE id = ?', [morale, p.id]));
  }
  const sc = teamKey === 'home' ? result.scorers.home : result.scorers.away;
  for (const pid of Object.keys(sc)) {
    stmts.push(stmt('UPDATE players SET goals = goals + ? WHERE id = ?', [sc[pid], pid]));
  }
  for (const e of result.events) {
    if (!e.playerId) continue;
    if (e.team !== teamKey && e.type !== 'injury') continue;
    if (e.type === 'yellow') stmts.push(stmt('UPDATE players SET yellow = yellow + 1 WHERE id = ?', [e.playerId]));
    if (e.type === 'red') stmts.push(stmt('UPDATE players SET red = red + 1 WHERE id = ?', [e.playerId]));
    if (e.type === 'injury') {
      const w = 1 + Math.floor(Math.random() * 3);
      stmts.push(stmt('UPDATE players SET injured_weeks = ? WHERE id = ?', [w, e.playerId]));
    }
  }
  if (stmts.length) await batch(stmts);
}
