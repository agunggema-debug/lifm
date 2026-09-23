import React from "react";
import { api, clubLogo } from "./lib.js";

const STALE_MS = 25000; // snapshot lebih lama dari ini = tidak lagi akurat

// Fase match user (live / istirahat / selesai / belum dimulai).
function phaseOf(s) {
  if (!s) return "idle";
  if (s.status === "live") return "live";
  if (s.status === "ht" || s.status === "ft") return s.status;
  return "idle";
}
// Cocokkan snapshot (dari tab Match) dengan sebuah laga pada jadwal.
function liveScore(m, snap) {
  if (!snap) return null;
  const same = (a, b) => a && b && a.short_name === b.short_name;
  if (m.mine && snap.hg != null && snap.ag != null) return { hg: snap.hg, ag: snap.ag, status: phaseOf(snap) };
  const fwd = (snap.others || []).find((x) => same(m.home, { short_name: x.home }) && same(m.away, { short_name: x.away }));
  if (fwd) return { hg: fwd.hg, ag: fwd.ag, status: phaseOf(snap) };
  const rev = (snap.others || []).find((x) => same(m.away, { short_name: x.home }) && same(m.home, { short_name: x.away }));
  if (rev) return { hg: rev.ag, ag: rev.hg, status: phaseOf(snap) };
  return null;
}
function StatusChip({ status }) {
  if (status === "live") return <span className="live-badge"><span className="live-dot" />LIVE</span>;
  if (status === "ht") return <span className="chip chip-amber">⏸️ ISTIRAHAT</span>;
  if (status === "ft") return <span className="chip chip-slate">FT</span>;
  return <span className="chip chip-slate">Belum dimulai</span>;
}
function compLabel(c) {
  if (c === "league") return "🇮🇩 Indonesia Super League";
  return "🌏 " + c;
}
function Form({ form }) {
  if (!form || form.length === 0) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {form.map((f, i) => (<span key={i} className={"px-1.5 py-0.5 rounded text-[9px] font-black form-" + f.result}>{f.result}</span>))}
    </div>
  );
}
function Scorers({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">⚽ Top Skor Musim</div>
      <div className="space-y-1">
        {items.map((p) => (
          <div key={p.name + p.club_id} className="row-player">
            <div className="flex items-center gap-2 min-w-0">
              <img src={clubLogo(p)} alt={p.short_name} className="w-5 h-5 object-contain" />
              <div className="min-w-0"><div className="font-black text-sm truncate max-w-[120px]">{p.name}</div><div className="text-[10px] text-slate-500">{p.short_name} • {p.pos}</div></div>
            </div>
            <div className="font-black flex items-center gap-3 text-lime-700"><span>⚽ {p.goals}</span><span className="text-slate-400">🅰️ {p.assists}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Assists({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">🎯 Top Assist</div>
      <div className="space-y-1">
        {items.map((p) => (
          <div key={p.name + p.club_id} className="row-player">
            <div className="flex items-center gap-2 min-w-0">
              <img src={clubLogo(p)} alt={p.short_name} className="w-5 h-5 object-contain" />
              <div className="min-w-0"><div className="font-black text-sm truncate max-w-[120px]">{p.name}</div><div className="text-[10px] text-slate-500">{p.short_name} • {p.pos}</div></div>
            </div>
            <div className="font-black text-amber-700">🅰️ {p.assists}{p.goals ? <span className="text-slate-400 text-xs ml-1">⚽{p.goals}</span> : null}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function ScheduleSection({ d, snap, snapFresh, busy }) {
  const groups = [["league"], ...Array.from(new Set(d.matches.filter((m) => m.competition !== "league").map((m) => m.competition)))];
  return (
    <div className="card">
      <div className="card-title">📅 Jadwal Pekan {d.matchday}</div>
      {groups.map(([comp]) => {
        const ms = d.matches.filter((m) => m.competition === comp);
        if (!ms.length) return null;
        return (
          <div key={comp} className="mt-2">
            <div className="text-[11px] font-extrabold text-slate-600 mb-1">{compLabel(comp)}</div>
            <div className="space-y-1">
              {ms.map((m) => {
                const ls = snapFresh ? liveScore(m, snap) : null;
                const score = m.played ? `${m.home_goals}–${m.away_goals}` : ls ? `${ls.hg}–${ls.ag}` : "—";
                return (
                  <div key={m.id} className={"fixture-row " + (m.mine ? "fixture-user" : "")}>
                    <div className="fixture-home justify-end"><img src={clubLogo(m.home)} alt={m.home.short_name} className="fixture-logo" /><span className="fixture-team-name">{m.home.short_name}</span></div>
                    <div className="fixture-score">
                      {ls && (ls.status === "live" || ls.status === "ht")
                        ? <span className="flex items-center justify-center gap-1"><span className="live-badge"><span className="live-dot" />LIVE</span><span className="live-score">{score}</span></span>
                        : <span className="font-black">{score}</span>}
                    </div>
                    <div className="fixture-away"><span className="fixture-team-name">{m.away.short_name}</span><img src={clubLogo(m.away)} alt={m.away.short_name} className="fixture-logo" /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {busy && <div className="text-[11px] text-slate-400 mt-2">🔄 Menyelaraskan live score…</div>}
    </div>
  );
}
export default function Live({ live: snap, onLive }) {
  const [d, setD] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setBusy(true);
    try { const r = await api("/api/live"); setD(r); setErr(""); }
    catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  React.useEffect(() => { if (onLive) onLive(snap); }, [snap]); // echo hook (tetap siap jika dipakai)

  if (err) return <div className="card"><div className="card-title">📺 Live Score</div><div className="text-red-600 text-sm">Gagal memuat: {err}</div></div>;
  if (!d || !d.hasSave) return <div className="card"><div className="card-title">📺 Live Score</div><div className="text-slate-400">Buat karier dulu dari tab Setup agar jadwal bisa ditampilkan.</div></div>;

  const now = Date.now();
  const snapFresh = snap && snap.matchday === d.matchday && (now - (snap.at || 0)) < STALE_MS;
  const myMatch = d.matches.find((m) => m.mine) || null;
  const mySnap = snapFresh && myMatch ? liveScore(myMatch, snap) : null;
  const showLive = snapFresh && mySnap && (mySnap.status === "live" || mySnap.status === "ht");

  return (
    <div className="space-y-3">
      {/* --- Hero skor laga / tim manajer --- */}
      <div className="live-board">
        <div className="text-[11px] uppercase tracking-widest opacity-60">Pekan {d.matchday}{d.isCurrentMatchday ? " • sedang berlangsung" : ""} • {d.progress.played}/{d.progress.total} selesai • {d.goals} gol</div>
        {showLive ? (
          <div className="mt-2">
            <div className="flex justify-center mb-1"><StatusChip status={mySnap.status} /></div>
            <div className="score-teams">
              <div className={"score-team " + (myMatch.home.short_name === snap.hk ? "score-you" : "")}>
                <img src={clubLogo(myMatch.home)} alt={myMatch.home.short_name} className="score-logo" />
                <div className="score-name">{myMatch.home.short_name}</div>
              </div>
              <div className="score-side">
                <div className="live-score">{mySnap.hg} – {mySnap.ag}</div>
                {mySnap.status === "live" && <div className="live-min">{snap.minute}'</div>}
              </div>
              <div className={"score-team " + (myMatch.away.short_name === snap.ak ? "score-you" : "")}>
                <img src={clubLogo(myMatch.away)} alt={myMatch.away.short_name} className="score-logo" />
                <div className="score-name">{myMatch.away.short_name}</div>
              </div>
            </div>
            <div className="text-center mt-1 text-[11px] opacity-70">Live disinkronkan dari tab Match (update tiap detik).</div>
          </div>
        ) : myMatch ? (
          <div className="mt-2 text-center">
            <div className="score-teams opacity-80">
              <div className="score-team"><img src={clubLogo(myMatch.home)} alt={myMatch.home.short_name} className="score-logo" /><div className="score-name">{myMatch.home.short_name}</div></div>
              <div className="score-side"><div className="live-score">VS</div><div className="live-min">{d.progress.played}/{d.progress.total} selesai</div></div>
              <div className="score-team"><img src={clubLogo(myMatch.away)} alt={myMatch.away.short_name} className="score-logo" /><div className="score-name">{myMatch.away.short_name}</div></div>
            </div>
            <div className="mt-1 text-xs opacity-70">Laga belum dimulai — buka tab Match & tekan “GAS MAIN!”.</div>
          </div>
        ) : (
          <div className="mt-2 text-center text-sm opacity-80">Tidak ada laga Klubmu pada pekan ini.</div>
        )}
      </div>

      {/* --- Ringkasan klub & juara --- */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-tile">
          <div className="stat-num text-lime-700">{d.myLeague ? "#" + d.myLeague.rank + "/" + d.myLeague.of : "—"}</div>
          <div className="stat-lbl">Klasemenmu{d.myLeague ? " · " + d.myLeague.points + "pts · " + d.myLeague.gf + "–" + d.myLeague.ga + " (GD" + d.myLeague.gd + ")" : ""}</div>
          {d.myLeague && <Form form={d.recentForm} />}
        </div>
        <div className="stat-tile">
          <div className="stat-num text-amber-700">👑 {d.leagueLeader?.short_name || "—"}</div>
          <div className="stat-lbl">pemimpin{d.leagueLeader ? " · " + d.leagueLeader.points + "pts" : ""}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gol pekan: {d.goals}</div>
        </div>
      </div>

      <Scorers items={d.scorers} />
      <Assists items={d.assists} />
      <ScheduleSection d={d} snap={snap} snapFresh={snapFresh} busy={busy} />
    </div>
  );
}


