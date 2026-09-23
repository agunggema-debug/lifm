import React from "react";
import { api, clubLogo } from "./lib.js";

function medal(n) {
  return n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : "#" + n;
}

function Row({ r, mine }) {
  return (
    <div className={"lb-row " + (mine ? "lb-me" : "")}>
      <div className="lb-rank">{medal(r.rank)}</div>
      <div className="flex items-center gap-2 min-w-0">
        <img src={clubLogo(r.club)} alt={r.club?.short_name || r.club?.name} className="w-7 h-7 object-contain" />
        <div className="min-w-0">
          <div className="font-extrabold text-sm truncate max-w-[140px]">{r.manager}</div>
          <div className="text-[10px] text-slate-500 font-bold">{r.club?.short_name || "—"} • {r.season !== 1 ? ("M" + r.season) : "Musim 1"}</div>
        </div>
      </div>
      <div className="lb-points text-right">
        <div className="font-black text-lg text-lime-700">{r.points}</div>
        <div className="text-[10px] text-slate-400">pts</div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const d = await api("/api/leaderboard?limit=50");
      setData(d);
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }, []);
  React.useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const breakdown = data?.me ? [
    { label: "Poin liga", v: data.me.league_points },
    { label: "🏆 gelar Liga / 🌏 ACL", v: ((data.me.league_titles + data.me.acl_titles) * 100) + " (" + data.me.league_titles + "L/" + data.me.acl_titles + "A)" },
    { label: "Musim selesai", v: (Math.max(0, data.me.season - 1) * 25) }
  ] : [];

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="card-title">🏅 Global Leaderboard</div>
        <div className="text-[11px] text-slate-500">
          Peringkat seluruh manajer LIFM di server ini. Poin = poin liga + (🏆 gelar Liga + 🌏 gelar ACL) × 100 + (musim selesai) × 25.
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5">
          Total manajer: <b>{data ? data.total : "—"}</b> • diurutkan tiap <b>10 menit</b> ({err ? "error: " + err : "aktif"})
        </div>

        {data?.me && (
          <div className={"mt-3 lb-me rounded-2xl p-3 px-4 " + (data.me.rank > 50 ? "opacity-90" : "")}>
            <div className="text-xs uppercase tracking-widest text-lime-800 font-black">Peringkat kamu</div>
            <div className="text-2xl font-black mt-1">#{data.me.rank} dari {data.total}</div>
            <div className="font-black text-3xl text-lime-700 mt-1">{data.me.points} poin</div>
            <div className="mt-2 flex flex-wrap gap-1.5 items-end">
              {breakdown.map((b) => (
                <div key={b.label} className="stat-tile">
                  <div className="stat-num">{b.v}</div>
                  <div className="stat-lbl">{b.label}</div>
                </div>
              ))}
            </div>
            {data.me.rank > 50 && <div className="mt-2 text-[11px] text-slate-600">Kamu di luar Top 50. Kembangkan klub & kumpulkan gelar untuk naik!</div>}
          </div>
        )}

        <div className="mt-1 flex justify-end">
          <button onClick={load} disabled={busy} className="btn-ghost px-4 py-1.5 text-xs">↻ {busy ? "merefresh…" : "Refresh"}</button>
        </div>

        {!err && data && data.rows.length === 0 && <div className="text-center text-slate-400 py-6 text-sm">Belum ada manajer lain. Ajak temanmu bermain LIFM!</div>}

        <div className="mt-2 space-y-1.5">
          {data ? data.rows.map((r) => <Row key={r.id} r={r} mine={!!data.me && data.me.id === r.id} />) : Array.from({ length: 8 }).map((_, i) => <div key={i} className="lb-row h-9 bg-slate-100 animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}
