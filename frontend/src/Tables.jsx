import React from "react";
import { api, clubLogo, aclRound, aclStage, aclCompName, seasonLabel, LEAGUE_MDS, aclGroupRounds } from "./lib.js";

// Normalisasi response /api/standings/acl agar kompatibel dua arah:
// format baru = [{name, rows:[...]}] (8 grup), format lama (backend lama) = array datar baris klub.
function normalizeAclGroups(d) {
  if (!Array.isArray(d) || d.length === 0) return [];
  if (d[0] && Array.isArray(d[0].rows)) return d;
  return [{ name: 'E', rows: d }];
}

function Logo({ club, cls }) {
  const src = clubLogo(club);
  if (!src) return <span className={cls + " bg-slate-200 rounded-md grid place-items-center text-[9px] font-black text-slate-500"}>{(club.short_name || "?").slice(0, 2)}</span>;
  return (
    <img
      src={src}
      alt={club.short_name}
      className={cls}
      onError={(e) => {
        e.currentTarget.outerHTML = '<span class="' + cls + ' bg-slate-200 rounded-md grid place-items-center text-[9px] font-black text-slate-500">' + (club.short_name || "?").slice(0, 2) + "</span>";
      }}
    />
  );
}

export default function Tables() {
  const [rows, setRows] = React.useState([]);
  const [aclGroups, setAclGroups] = React.useState([]);
  const [md, setMd] = React.useState(null);
  const [fixtures, setFixtures] = React.useState([]);
  const [myClubId, setMyClubId] = React.useState(null);
  const [aclTier, setAclTier] = React.useState("two");
  const [season, setSeason] = React.useState(null);
  React.useEffect(() => {
    api("/api/standings")
      .then(setRows)
      .catch(() => setRows([]));
    api("/api/standings/acl")
      .then((d) => setAclGroups(normalizeAclGroups(d)))
      .catch(() => setAclGroups([]));
    api("/api/state")
      .then((s) => {
        if (s.hasSave) setMyClubId(s.save.club_id);
        if (s.hasSave) setAclTier(s.save.acl_tier || "two");
        if (s.hasSave) setSeason(s.save.season);
        const m = s.hasSave ? Math.min(s.save.matchday, LEAGUE_MDS) : 1;
        setMd(m);
        return api("/api/fixtures?matchday=" + m);
      })
      .then(setFixtures)
      .catch(() => {});
  }, []);
  const loadMd = async (m) => {
    setMd(m);
    setFixtures(await api("/api/fixtures?matchday=" + m));
  };
  const aclMd = aclRound(md, aclTier); // >0 jika fase grup/league phase ACL di pekan ini (pekan ganda)
  const aclStageLabel = aclStage(md, aclTier); // label babak gugur ACL untuk pekan KO
  const aclGroupTotal = Object.keys(aclGroupRounds(aclTier)).length; // 6 (ACL Two) atau 8 (ACL Elite)
  const aclQualify = aclTier === "elite" ? 8 : 2; // ACL Elite: top 8 tiap zona, ACL Two: top 2 tiap grup
  const aclMdDone = aclGroups.length ? Math.min(...aclGroups.map((g) => Math.round((g.rows || []).reduce((a, r) => a + Number(r.played || 0), 0) / 2))) : 0;
  // Bagian/tempat tim user di ACL: Grup A-H (ACL Two) atau Zona Timur/Barat (ACL Elite).
  const mySection = aclGroups.find((g) => (g.rows || []).some((r) => r.club_id === myClubId)) || null;
  const myGroupName = mySection ? (mySection.label || "Grup " + mySection.name) : null;
  const userIn = (f) => myClubId != null && (f.home.club_id === myClubId || f.away.club_id === myClubId);

  return (
    <div className="grid gap-3">
      <div className="card overflow-auto">
        <div className="card-title">🏆 Klasemen Indonesia Super League {seasonLabel(season)}</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pr-2">#</th>
              <th>Klub</th>
              <th className="text-center">M</th>
              <th className="text-center">W</th>
              <th className="text-center">D</th>
              <th className="text-center">L</th>
              <th className="text-center">GD</th>
              <th className="text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.club_id} className={"border-t border-slate-100 " + (i < 4 ? "bg-lime-50/70" : i >= rows.length - 3 ? "bg-red-50/70" : "") + (r.club_id === myClubId ? " ring-2 ring-lime-400" : "")}>
                <td className="py-1.5 font-black pr-2">
                  <span className={"inline-grid place-items-center w-6 h-6 rounded-lg text-xs " + (i < 4 ? "bg-lime-400 text-slate-950" : i >= rows.length - 3 ? "bg-red-300 text-slate-950" : "bg-slate-100 text-slate-600")}>{i + 1}</span>
                </td>
                <td className="font-bold">
                  <span className="flex items-center gap-1.5">
                    <Logo club={r} cls="w-6 h-6 object-contain bg-white border rounded-md p-0.5" />
                    <span className="truncate">
                      {r.short_name}
                      {r.club_id === myClubId ? " ⭐" : ""}
                    </span>
                  </span>
                </td>
                <td className="text-center text-slate-500">{r.played}</td>
                <td className="text-center">{r.won}</td>
                <td className="text-center text-slate-500">{r.drawn}</td>
                <td className="text-center text-slate-500">{r.lost}</td>
                <td className="text-center">{r.gd > 0 ? "+" + r.gd : r.gd}</td>
                <td className="text-center font-black text-base">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-2">
          <span>🟩 4 besar zona juara</span>
          <span>🟥 3 terbawah zona deg-degan</span>
          <span>⭐ tim kamu</span>
        </div>
      </div>

      {aclGroups.length > 0 && (
        <div className="card overflow-auto">
          <div className="card-title">
            🌏 Klasemen {aclTier === "elite" ? "ACL ELITE" : "ACL TWO"} {seasonLabel(season)} — {aclTier === "elite" ? "2 Zona (32 Klub)" : "8 Grup"} <span className="chip chip-slate ml-auto">{aclMdDone}/{aclGroupTotal} MD {aclTier === "elite" ? "League Phase" : "Grup"}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {aclGroups.map((g) => (
              <div key={g.name} className="rounded-2xl border border-slate-100 p-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-1">{g.label || "Grup " + g.name}</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="pr-1">#</th>
                      <th>Klub</th>
                      <th className="text-center">M</th>
                      <th className="text-center">GD</th>
                      <th className="text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(g.rows || []).map((r, i) => (
                      <tr key={r.club_id} className={"border-t border-slate-100 " + (i < aclQualify ? "bg-lime-50/70" : "") + (r.club_id === myClubId ? " ring-2 ring-lime-400" : "")}>
                        <td className="py-1 font-black pr-1">
                          <span className={"inline-grid place-items-center w-5 h-5 rounded-md text-[10px] " + (i < aclQualify ? "bg-lime-400 text-slate-950" : "bg-slate-100 text-slate-600")}>{i + 1}</span>
                        </td>
                        <td className="font-bold">
                          <span className="flex items-center gap-1.5">
                            <Logo club={r} cls="w-5 h-5 object-contain bg-white border rounded p-0.5" />
                            <span className="truncate">
                              {r.short_name}
                              {r.club_id === myClubId ? " ⭐" : ""}
                            </span>
                          </span>
                        </td>
                        <td className="text-center text-slate-500">{r.played}</td>
                        <td className="text-center">{r.gd > 0 ? "+" + r.gd : r.gd}</td>
                        <td className="text-center font-black">{r.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
             {aclTier === "elite"
               ? "Top 8 tiap zona melaju ke babak gugur (16 Besar → Perempat Final → Semifinal → Final, 1 laga, Pekan 29-34)"
               : "2 terbaik tiap grup melaju ke babak gugur (16 Besar → Perempat Final → Semifinal 2 leg + Final 1 laga, Pekan 26-34)"}
             {myGroupName ? " • Tim kamu di " + myGroupName : ""} • Digelar di sela pekan Liga (pekan ganda){aclTier === "elite" ? " • Juara ACL Two promosi ke ACL ELITE musim berikutnya 🌏" : ""}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          🗓️ Jadwal &amp; Hasil{" "}
          <span className="chip chip-slate ml-auto">
            {aclStageLabel ? "ACL " + aclStageLabel : "Pekan " + (md ?? "-") + " / " + LEAGUE_MDS}
            {aclMd ? " • ACL MD " + aclMd : ""}
          </span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => loadMd(Math.max(1, (md || 1) - 1))} disabled={(md || 1) <= 1} className="btn-ghost rounded-full px-4 py-1.5 disabled:opacity-30">
            ◀ Prev
          </button>
          <span className="font-black">{aclStageLabel ? "ACL " + aclStageLabel : "Pekan " + md + (aclMd ? " • ACL MD " + aclMd : "")}</span>
          <button onClick={() => loadMd(Math.min(LEAGUE_MDS, (md || 1) + 1))} disabled={(md || 1) >= LEAGUE_MDS} className="btn-ghost rounded-full px-4 py-1.5 disabled:opacity-30">
            Next ▶
          </button>
        </div>
        <div className="grid gap-1.5">
          {fixtures.map((f) => {
            const wl =
              userIn(f) && f.played ? (f.home.club_id === myClubId ? (f.home_goals > f.away_goals ? "W" : f.home_goals < f.away_goals ? "L" : "D") : f.away_goals > f.home_goals ? "W" : f.away_goals < f.home_goals ? "L" : "D") : null;
            return (
              <div key={f.id} className={"fixture-row" + (userIn(f) ? " fixture-user" : "") + (aclCompName(f.competition) ? " fixture-acl" : "")}>
                <div className="fixture-home">
                  {wl && <span className={"fixture-wl fixture-wl-" + wl.toLowerCase()}>{wl}</span>}
                  <span className="fixture-team-name">{f.home.short_name}</span>
                  <Logo club={f.home} cls="fixture-logo" />
                </div>
                {f.played ? (
                  <div className="fixture-score">
                    {f.home_goals} - {f.away_goals}
                  </div>
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
        <div className="text-[11px] text-slate-500 mt-2 text-center">W = Menang • D = Seri • L = Kalah (hasil tim kamu) • Kotak hijau = laga kamu ⭐ • Baris biru = laga ACL Two / ACL Elite 🌏 • Liga 34 pekan (home & away)</div>
      </div>
    </div>
  );
}
