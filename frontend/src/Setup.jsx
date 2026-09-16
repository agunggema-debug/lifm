import React from "react";
import { api, clubLogo } from "./lib.js";

export default function Setup({ clubs = [], onDone }) {
  const [name, setName] = React.useState("Abah Agung");
  const [clubId, setClubId] = React.useState(clubs[0]?.id || 1);
  const [busy, setBusy] = React.useState(false);
  const [visitors, setVisitors] = React.useState(null);
  React.useEffect(() => {
    api("/api/visitors").then(setVisitors).catch(() => {});
  }, []);
  const start = async () => {
    setBusy(true);
    try {
      await api("/api/career", { method: "POST", body: JSON.stringify({ managerName: name, clubId }) });
      onDone();
    } catch (e) {
      alert(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-lifm text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-8">
          <div className="text-5xl">⚽🔥</div>
          <h1 className="text-3xl sm:text-5xl font-black mt-2">
            LIGA INDONESIA
            <br />
            <span className="text-lime-400">FOOTBALL MANAGER</span>
          </h1>
          <p className="mt-2 text-slate-200">Indonesia Super League 2026/27 • No install. No ribet. Gas jadi manajer GOAT! 💪</p>
          <div className="flex gap-2 justify-center mt-3 text-xs">
            <span className="bg-white/10 rounded-full px-3 py-1">✅ 18 Klub 2026/27</span>
            <span className="bg-white/10 rounded-full px-3 py-1">✅ Match Engine Live</span>
            <span className="bg-white/10 rounded-full px-3 py-1">✅ Transfer Gacha</span>
          </div>
          {visitors ? (
            <div className="flex gap-2 justify-center mt-3 text-xs">
              <span className="bg-white/10 rounded-full px-3 py-1">👥 {Number(visitors.total).toLocaleString("id-ID")} Total Visitor</span>
              <span className="bg-white/10 rounded-full px-3 py-1">📅 {Number(visitors.today).toLocaleString("id-ID")} Hari Ini</span>
            </div>
          ) : null}
        </div>
        <div className="bg-white/95 text-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl">
          <label className="font-bold text-sm">NAMA MANAJER</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 border-2 rounded-2xl px-4 py-3 font-bold" placeholder="Nama panggilanmu..." />
          <label className="font-bold text-sm mt-4 block">PILIH KLUB FAVORITMU ⭐</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-80 overflow-auto scroll-slim pr-1">
            {clubs.map((c) => (
              <button key={c.id} onClick={() => setClubId(c.id)} className={"rounded-2xl p-3 text-left border-2 " + (clubId === c.id ? "border-lime-500 bg-lime-50" : "border-slate-200 bg-white")}>
                <div className="flex items-center gap-2">
                  <img
                    src={clubLogo(c)}
                    alt={c.short_name}
                    className="w-10 h-10 rounded-xl object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div>
                    <div className="font-black text-sm leading-tight">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.city} • ⭐{c.reputation}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button disabled={busy} onClick={start} className="w-full mt-5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-lg rounded-2xl py-4">
            GAS MULAI KARIR! 🚀
          </button>
        </div>
        <p className="text-center text-slate-300 text-xs mt-4">
          Open source by{" "}
          <a href="https://fainaya.netlify.app" className="hover:underline" target="_blank" rel="noopener noreferrer">
            Fainaya Services&Art
          </a>{" "}
          • MIT • LIFM v.1.0
        </p>
      </div>
    </div>
  );
}
