import React from 'react';
import { api, clubLogo, aclRound } from './lib.js';

function Logo({ club, cls }) {
  const src = clubLogo(club);
  if (!src) return <span className={cls + ' bg-slate-200 rounded-md grid place-items-center text-[9px] font-black text-slate-500'}>{(club.short_name || '?').slice(0, 2)}</span>;
  return <img src={src} alt={club.short_name} className={cls} onError={(e) => { e.currentTarget.outerHTML = '<span class="' + cls + ' bg-slate-200 rounded-md grid place-items-center text-[9px] font-black text-slate-500">' + (club.short_name || '?').slice(0, 2) + '</span>'; }} />;
}

export default function Tables() {
  const [rows, setRows] = React.useState([]);
  const [aclRows, setAclRows] = React.useState([]);
  const [md, setMd] = React.useState(null);
  const [fixtures, setFixtures] = React.useState([]);
  const [myClubId, setMyClubId] = React.useState(null);
  React.useEffect(() => {
    api('/api/standings').then(setRows).catch(() => setRows([]));
    api('/api/standings/acl').then(setAclRows).catch(() => setAclRows([]));
    api('/api/state').then((s) => {
      if (s.hasSave) setMyClubId(s.save.club_id);
      const m = s.hasSave ? Math.min(s.save.matchday, 17) : 1;
      setMd(m);
      return api('/api/fixtures?matchday=' + m);
    }).then(setFixtures).catch(() => {});
  }, []);
  const loadMd = async (m) => { setMd(m); setFixtures(await api('/api/fixtures?matchday=' + m)); };
  const aclMd = aclRound(md); // >0 jika pekan ini juga ada laga ACL Two (pekan ganda)
  const userIn = (f) => myClubId != null && (f.home.club_id === myClubId || f.away.club_id === myClubId);

  return (
    <div className="grid gap-3">
      <div className="card overflow-auto">
        <div className="card-title">🏆 Klasemen BRI Super League 2026/27</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pr-2">#</th><th>Klub</th><th className="text-center">M</th><th className="text-center">W</th><th className="text-center">D</th><th className="text-center">L</th><th className="text-center">GD</th><th className="text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.club_id} className={'border-t border-slate-100 ' + (i < 4 ? 'bg-lime-50/70' : i >= rows.length - 3 ? 'bg-red-50/70' : '') + (r.club_id === myClubId ? ' ring-2 ring-lime-400' : '')}>
                <td className="py-1.5 font-black pr-2">
                  <span className={'inline-grid place-items-center w-6 h-6 rounded-lg text-xs ' + (i < 4 ? 'bg-lime-400 text-slate-950' : i >= rows.length - 3 ? 'bg-red-300 text-slate-950' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                </td>
                <td className="font-bold">
                  <span className="flex items-center gap-1.5">
                    <Logo club={r} cls="w-6 h-6 object-contain bg-white border rounded-md p-0.5" />
                    <span className="truncate">{r.short_name}{r.club_id === myClubId ? ' ⭐' : ''}</span>
                  </span>
                </td>
                <td className="text-center text-slate-500">{r.played}</td>
                <td className="text-center">{r.won}</td>
                <td className="text-center text-slate-500">{r.drawn}</td>
                <td className="text-center text-slate-500">{r.lost}</td>
                <td className="text-center">{r.gd > 0 ? '+' + r.gd : r.gd}</td>
                <td className="text-center font-black text-base">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-2">
          <span>🟩 4 besar zona juara</span><span>🟥 3 terbawah zona deg-degan</span><span>⭐ tim kamu</span>
        </div>
      </div>

      {aclRows.length > 0 && (
        <div className="card overflow-auto">
          <div className="card-title">🌏 Klasemen ACL Two Grup E 2026/27 <span className="chip chip-slate ml-auto">{Math.round(aclRows.reduce((a, r) => a + r.played, 0) / 2)}/6 MD</span></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pr-2">#</th><th>Klub</th><th className="text-center">M</th><th className="text-center">W</th><th className="text-center">D</th><th className="text-center">L</th><th className="text-center">GD</th><th className="text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {aclRows.map((r, i) => (
                <tr key={r.club_id} className={'border-t border-slate-100 ' + (i === 0 ? 'bg-lime-50/70' : '') + (r.club_id === myClubId ? ' ring-2 ring-lime-400' : '')}>
                  <td className="py-1.5 font-black pr-2">
                    <span className={'inline-grid place-items-center w-6 h-6 rounded-lg text-xs ' + (i === 0 ? 'bg-lime-400 text-slate-950' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                  </td>
                  <td className="font-bold">
                    <span className="flex items-center gap-1.5">
                      <Logo club={r} cls="w-6 h-6 object-contain bg-white border rounded-md p-0.5" />
                      <span className="truncate">{r.short_name}{r.club_id === myClubId ? ' ⭐' : ''}</span>
                    </span>
                  </td>
                  <td className="text-center text-slate-500">{r.played}</td>
                  <td className="text-center">{r.won}</td>
                  <td className="text-center text-slate-500">{r.drawn}</td>
                  <td className="text-center text-slate-500">{r.lost}</td>
                  <td className="text-center">{r.gd > 0 ? '+' + r.gd : r.gd}</td>
                  <td className="text-center font-black text-base">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-slate-500 mt-2">🟩 Juara grup melaju ke babak gugur • Persib, FC Seoul, Melbourne Victory, Thé Công–Viettel • Digelar di antara pekan liga (pekan ganda)</div>
        </div>
      )}

      <div className="card">
        <div className="card-title">🗓️ Jadwal &amp; Hasil <span className="chip chip-slate ml-auto">Pekan {(md ?? '-')} / 17{aclMd ? ' • ACL MD ' + aclMd : ''}</span></div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => loadMd(Math.max(1, (md || 1) - 1))} disabled={(md || 1) <= 1} className="btn-ghost rounded-full px-4 py-1.5 disabled:opacity-30">◀ Prev</button>
          <span className="font-black">{aclMd ? 'Pekan ' + md + ' • ACL MD ' + aclMd : 'Pekan ' + md}</span>
          <button onClick={() => loadMd(Math.min(17, (md || 1) + 1))} disabled={(md || 1) >= 17} className="btn-ghost rounded-full px-4 py-1.5 disabled:opacity-30">Next ▶</button>
        </div>
        <div className="grid gap-1.5">
          {fixtures.map((f) => {
            const wl = userIn(f) && f.played ? (f.home.club_id === myClubId ? (f.home_goals > f.away_goals ? 'W' : f.home_goals < f.away_goals ? 'L' : 'D') : (f.away_goals > f.home_goals ? 'W' : f.away_goals < f.home_goals ? 'L' : 'D')) : null;
            return (
              <div key={f.id} className={'fixture-row' + (userIn(f) ? ' fixture-user' : '') + (f.competition === 'acl_two' ? ' fixture-acl' : '')}>
                <div className="fixture-home">
                  {wl && <span className={'fixture-wl fixture-wl-' + wl.toLowerCase()}>{wl}</span>}
                  <span className="fixture-team-name">{f.home.short_name}</span>
                  <Logo club={f.home} cls="fixture-logo" />
                </div>
                {f.played ? (
                  <div className="fixture-score">{f.home_goals} - {f.away_goals}</div>
                ) : (
                  <div className="fixture-score fixture-score-vs">VS</div>
                )}
                <div className="fixture-away">
                  <Logo club={f.away} cls="fixture-logo" />
                  <span className="fixture-team-name">{f.away.short_name}</span>
                </div>
              </div>
            );
          })}
          {fixtures.length === 0 && <div className="text-xs text-slate-400 italic text-center py-3">Belum ada jadwal untuk pekan ini.</div>}
        </div>
        <div className="text-[11px] text-slate-500 mt-2 text-center">W = Menang • D = Seri • L = Kalah (hasil tim kamu) • Kotak hijau = laga kamu ⭐ • Baris biru = laga ACL Two 🌏</div>
      </div>
    </div>
  );
}
