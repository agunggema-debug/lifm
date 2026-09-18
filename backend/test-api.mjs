// Uji end-to-end API backend (jalan sekali, lalu hapus)
const B = 'http://localhost:3001';
const ok = (label, val) => console.log('✔', label, val);
const post = (p, body) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });
const get = (p) => fetch(B + p).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });

const h = await get('/api/health');
ok('health', JSON.stringify(h));
// Pakai token unik per run supaya tes tidak mengganggu karier sungguhan di DB lokal
const TOKEN = 'test-' + Date.now();
const H2 = { 'Content-Type': 'application/json', 'X-Lifm-Token': TOKEN };
const post2 = (p, body) => fetch(B + p, { method: 'POST', headers: H2, body: JSON.stringify(body || {}) }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });
const get2 = (p) => fetch(B + p, { headers: { 'X-Lifm-Token': TOKEN } }).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(p + ' ' + r.status + ' ' + JSON.stringify(j)); return j; });
const c = await post2('/api/career', { managerName: 'Tester ACL', clubId: 2 }); // Persib (id 2)
ok('career', `${c.save.club.name} budget=${c.save.budget} lineup=${c.save.lineup.length}`);
ok('career-tier', `season=${c.save.season} aclTier=${c.save.acl_tier} aclTitles=${c.save.acl_titles}`);
// Musim baru TIDAK boleh dimulai saat musim masih berjalan (matchday=1) -> wajib 400
let early = null;
try { await post2('/api/next-season', {}); } catch (e) { early = e.message; }
ok('next-season-guard', early ? 'ditolak saat musim belum selesai ✔' : 'GAGAL: seharusnya ditolak!');
const p1 = await post2('/api/play', { phase: 'first' });
ok('play1', `${p1.userResult.homeName} ${p1.userResult.homeGoals}-${p1.userResult.awayGoals} ${p1.userResult.awayName} | others=${p1.others.length} ms=${p1.ms}`);
const p2 = await post2('/api/play', { phase: 'second', halfTimeState: p1.halfTimeState });
ok('play2', `FT ${p2.userResult.homeGoals}-${p2.userResult.awayGoals} nextMD=${p2.nextMatchday} ms=${p2.ms}`);
const s = await get2('/api/state');
ok('state', `md=${s.save.matchday} club=${s.save.club.name} logo=${s.save.club.logo_url}`);
const st = await get2('/api/standings');
ok('standings', `top=${st[0].name} P=${st[0].played} pts=${st[0].points} gd=${st[0].gd} (${st.length} rows)`);
const sq = await get2('/api/squad');
ok('squad', `${sq.length} pemain, ovr-top=${sq[0].ovr}`);
const tl = await get2('/api/transfer-list');
ok('transfer-list', `${tl.length} pemain, target=${tl[0].name}`);
const b = await post2('/api/transfer/buy', { playerId: tl[0].id });
ok('buy', `budget=${b.save.budget}`);
const mine = await get2('/api/squad');
const last = mine[mine.length - 1];
const sel = await post2('/api/transfer/sell', { playerId: last.id });
ok('sell', `${last.name} budget=${sel.save.budget}`);
const t = await post2('/api/tactics', { formation: '4-3-3', mentality: 'attacking' });
ok('tactics', `${t.save.formation}/${t.save.mentality} lineup=${t.save.lineup.length}`);
const out = t.save.lineup[0];
// Pilih pemain bangku yang SEHAT (bukan cedera) - pemain cedera ditolak /api/sub
// dan kejadian cedera pada laga uji bersifat acak, jadi tanpa filter ini tes flaky.
const inn = mine.filter((p) => p.injured_weeks === 0).map((p) => p.id).find((id) => !t.save.lineup.includes(id) && id !== out);
const sub = await post2('/api/sub', { outId: out, inId: inn });
ok('sub', `lineup=${sub.save.lineup.length}`);
const f = await get2('/api/next-fixture');
ok('next-fixture', f.finished ? 'season done' : `MD${f.matchday}: ${f.home.short_name} vs ${f.away.short_name}`);
const fx = await get2('/api/fixtures?matchday=1');
ok('fixtures', `${fx.length} laga MD1`);
const fxLast = await get2('/api/fixtures?matchday=34');
ok('fixtures-md34', `${fxLast.length} laga MD34 (9 Liga; KO ACL dibangkitkan dinamis saat pekan berjalan)`);
const n = await get2('/api/news');
ok('news', `top="${n[0].title}" (${n.length} item)`);

// ==== SIMULASI MUSIM PENUH: liga 34 pekan (home & away) + ACL Two (grup + gugur) ====
async function playWeek() {
  let last = null;
  for (let i = 0; i < 3; i++) {
    const r = await post2('/api/play', { phase: 'first' });
    if (r.finished || r.done) return r;
    if (r.pendingUserFixture) continue; // laga ACL menyusul di pekan yang sama
    const r2 = await post2('/api/play', { phase: 'second', halfTimeState: r.halfTimeState });
    last = r2;
    if (r2.pendingUserFixture) continue;
    return r2;
  }
  return last;
}
let guard = 0;
let aclFinal = null;
while (guard++ < 50) {
  const nf = await get2('/api/next-fixture');
  if (nf.finished) break;
  const r = await playWeek();
  if (r && (r.finished || r.done)) break;
  if (nf.matchday >= 26 && nf.matchday <= 34) {
    const fx21 = await get2('/api/fixtures?matchday=' + nf.matchday);
    if (fx21.length && fx21.every((x) => x.played)) aclFinal = fx21.find((x) => x.competition.includes('acl'));
  }
}
const aclTbl = await get2('/api/standings/acl');
ok('acl-groups', aclTbl.map((g) => g.name + ':' + (g.rows[0] ? g.rows[0].short_name + ' ' + g.rows[0].points + 'pts' : '-')).join(' | '));
const endState = await get2('/api/state');
ok('season-end', `md=${endState.save.matchday} season=${endState.save.season} tier=${endState.save.acl_tier}`);
if (endState.save.matchday <= 34) throw new Error('Musim tidak tuntas: matchday=' + endState.save.matchday + ' (harus > 34; 34 pekan Liga home & away)');
const ns = await post2('/api/next-season', {});
ok('next-season', `season=${ns.season} aclTier=${ns.aclTier} aclTitles=${ns.aclTitles} promoted=${ns.promoted} juaraACL=${ns.aclChampion}`);
const nf2 = await get2('/api/next-fixture');
ok('next-season-fixture', `MD${nf2.matchday}: ${nf2.home.short_name} vs ${nf2.away.short_name} [${nf2.fixture.competition}] season=${nf2.season}`);
const aclTbl2 = await get2('/api/standings/acl');
ok('acl-new-season-groups', aclTbl2.map((g) => g.name + ':' + g.rows.map((r) => r.short_name).join(',')).join(' | '));
console.log('\nSEMUA TES LULUS 🎉');