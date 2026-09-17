import React from "react";
import { api, clubLogo, ACL_MDS, aclRound, aclStage } from "./lib.js";
import Squad from "./Squad.jsx";
import Match from "./Match.jsx";
import Tables from "./Tables.jsx";
import Transfers from "./Transfers.jsx";

const TABS = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "squad", label: "Skuad", emoji: "🧢" },
  { id: "match", label: "Match", emoji: "⚽" },
  { id: "table", label: "Klasemen", emoji: "🏆" },
  { id: "transfer", label: "Transfer", emoji: "💸" },
];

export default function Dash({ save0, reload }) {
  const [save, setSave] = React.useState(save0);
  const [tab, setTab] = React.useState("home");
  const [next, setNext] = React.useState(null);
  const [news, setNews] = React.useState([]);
  const [last, setLast] = React.useState(null);
  const [visitors, setVisitors] = React.useState(null);
  const refresh = React.useCallback(async () => {
    const st = await api("/api/state");
    setSave(st.save);
    setNext(await api("/api/next-fixture").catch(() => null));
    setNews(await api("/api/news").catch(() => []));
    setVisitors(await api("/api/visitors").catch(() => null));
  }, []);
  React.useEffect(() => {
    refresh();
  }, [refresh, save0]);
  const reset = async () => {
    if (!confirm("Reset karier dan mulai dari awal?")) return;
    await api("/api/career/reset", { method: "POST" });
    reload();
  };
  const c = save.club || {};
  return (
    <div className="min-h-screen bg-lifm pb-24">
      <header className="text-white p-4 sticky top-0 z-10" style={{ background: (c.color_primary || "#0f172a") + "E6" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {clubLogo(c) ? (
              <img src={clubLogo(c)} alt={c.short_name} className="w-10 h-10 rounded-2xl object-contain" />
            ) : (
              <span className="w-10 h-10 rounded-2xl grid place-items-center font-black bg-white/20">{(c.short_name || "LI").slice(0, 2)}</span>
            )}
            <div>
              <div className="font-black leading-tight">{c.name}</div>
              <div className="text-xs opacity-80">
                Coach {save.manager_name} • Pekan {Math.min(save.matchday, 17)}/17{ACL_MDS.includes(save.matchday) ? ' • ACL MD ' + aclRound(save.matchday) : ''}{aclStage(save.matchday) ? ' • ACL ' + aclStage(save.matchday) : ''} • 💰 Rp{Number(save.budget).toLocaleString("id-ID")}
                {visitors ? <> • 👥 {Number(visitors.total).toLocaleString("id-ID")} visitor</> : null}
              </div>
            </div>
          </div>
          <button onClick={reset} className="text-xs bg-white/20 rounded-full px-3 py-1">
            ↺ Reset
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-3 sm:p-4">
        {tab === "home" && (
          <div className="grid gap-3">
            <div className="anim-pop rounded-3xl p-5 shadow-2xl text-white" style={{ background: "linear-gradient(180deg, #020617, #0f172a)", border: "1px solid rgba(255,255,255,.12)" }}>
              <div className="text-[11px] uppercase tracking-widest opacity-60 text-center">Next Match • Pekan {next ? next.matchday : "-"}{next && next.fixture && next.fixture.competition === 'acl_two' ? (next.matchday >= 18 ? ' • ACL ' + aclStage(next.matchday) : ' • ACL TWO Fase Grup') : ' • Indonesia Super League 2026/27'}</div>
              {next && !next.finished ? (
                <div className="mt-3 flex items-center justify-center gap-3 sm:gap-5">
                  <div className="text-center flex-1 min-w-0">
                    <img src={clubLogo(next.home)} alt={next.home.short_name} className="w-12 h-12 sm:w-14 sm:h-14 object-contain p-1 mx-auto" />
                    <div className="font-black mt-1 truncate">{next.home.short_name}</div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-2xl sm:text-3xl font-black text-lime-400">VS</div>
                    <div className="text-[10px] opacity-70 font-bold">{next.userHome ? "KANDANG 🏟️" : "TANDANG 🚌"}</div>
                  </div>
                  <div className="text-center flex-1 min-w-0">
                    <img src={clubLogo(next.away)} alt={next.away.short_name} className="w-12 h-12 sm:w-14 sm:h-14 object-contain p-1 mx-auto" />
                    <div className="font-black mt-1 truncate">{next.away.short_name}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xl font-black mt-2 text-center">Musim selesai! 🏆</div>
              )}
              <div className="flex gap-2 justify-center mt-4 flex-wrap">
                <button onClick={() => setTab("match")} className="btn-primary px-6 py-2.5">
                  GAS MAIN! ▶️
                </button>
                <button onClick={() => setTab("squad")} className="bg-white/15 text-white font-extrabold rounded-2xl px-6 py-2.5 hover:bg-white/25 transition-colors">
                  Atur Taktik 🧠
                </button>
              </div>
            </div>
            {last && last.userResult && (
              <div className="card anim-pop" style={{ border: "2px solid #bef264" }}>
                <div className="chip chip-lime mb-2">HASIL TERAKHIR ⚡ {last.ms}ms di server</div>
                <div className="font-black text-lg">
                  {last.userResult.fixture.home.short_name} {last.userResult.homeGoals}-{last.userResult.awayGoals} {last.userResult.fixture.away.short_name}
                </div>
                <div className="text-sm text-slate-600">
                  Laga lain:{" "}
                  {last.others
                    .slice(0, 4)
                    .map((o) => o.home + " " + o.hg + "-" + o.ag + " " + o.away)
                    .join(" • ")}
                  {last.others.length > 4 ? "..." : ""}
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-title">
                📥 Inbox &amp; Berita <span className="chip chip-slate ml-auto">{news.length}</span>
              </div>
              <div className="grid gap-2">
                {news.map((n) => (
                  <div key={n.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="chip chip-slate">{n.tag}</span>
                      <span className="text-[11px] text-slate-400">{n.day_label}</span>
                    </div>
                    <div className="font-black text-sm">{n.title}</div>
                    <div className="text-sm text-slate-600 leading-snug">{n.body}</div>
                  </div>
                ))}
                {news.length === 0 && <div className="text-xs text-slate-400 italic">Belum ada berita. Main match dulu! ⚽</div>}
              </div>
            </div>
          </div>
        )}
        {tab === "squad" && (
          <Squad
            save={save}
            onSaved={(s) => {
              setSave(s);
              refresh();
            }}
          />
        )}
        {tab === "match" && (
          <Match
            save={save}
            next={next}
            onPlayed={(r) => {
              setLast(r);
              setSave(r.save);
              refresh();
            }}
          />
        )}
        {tab === "table" && <Tables />}
        {tab === "transfer" && (
          <Transfers
            save={save}
            onDone={(s) => {
              setSave(s);
              refresh();
            }}
          />
        )}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={"py-2 text-center " + (tab === t.id ? "text-slate-950 font-black" : "text-slate-400")}>
              <div className="text-xl">{t.emoji}</div>
              <div className="text-[11px]">{t.label}</div>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
