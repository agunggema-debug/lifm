import React from 'react';
import { api, rp } from './lib.js';

export default function Transfers({ save, onDone }) {
  const [list, setList] = React.useState([]);
  const [mine, setMine] = React.useState([]);
  const [q, setQ] = React.useState('');
  const load = React.useCallback(async () => {
    setList(await api('/api/transfer-list').catch(() => []));
    setMine(await api('/api/squad').catch(() => []));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const buy = async (id) => {
    if (!confirm('Beli pemain ini?')) return;
    try { const r = await api('/api/transfer/buy', { method: 'POST', body: JSON.stringify({ playerId: id }) }); onDone(r.save); load(); }
    catch (e) { alert(e.message); }
  };
  const sell = async (id) => {
    if (!confirm('Jual pemain ini?')) return;
    try { const r = await api('/api/transfer/sell', { method: 'POST', body: JSON.stringify({ playerId: id }) }); onDone(r.save); load(); }
    catch (e) { alert(e.message); }
  };
  const f = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-3">
      <div className="bg-slate-950/95 text-white rounded-3xl p-5 shadow-2xl">
        <div className="font-black text-lg flex items-center gap-2 mb-1">💸 Bursa Transfer</div>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="chip chip-lime">💰 Budget {rp(save.budget)}</span>
          <span className="chip !bg-white/15! !text-white!">🧢 Skuad {mine.length} pemain (18-28)</span>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Cari pemain..." className="mt-3 w-full rounded-2xl px-4 py-2.5 text-slate-900 font-bold bg-white border-0 outline-none focus:ring-2 focus:ring-lime-400" />
      </div>
      <div className="font-black text-sm flex items-center gap-2 mt-1">🎯 Incaran (Top 60) <span className="chip chip-slate ml-auto">{f.length}</span></div>
      <div className="grid gap-2">
        {f.map((p) => (
          <div key={p.id} className="row-player">
            <div className="min-w-0">
              <div className="font-black text-sm truncate">{p.name} {p.is_foreign ? '🌍' : ''}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="chip chip-slate">{p.club}</span>
                <span className="chip chip-slate">{p.pos} • OVR {p.ovr}</span>
                <span className="chip chip-amber">{rp(p.market_value)}</span>
              </div>
            </div>
            <button disabled={save.budget < p.market_value} onClick={() => buy(p.id)} className="btn-primary disabled:opacity-30 text-xs px-4 py-2 shrink-0">BELI 🛒</button>
          </div>
        ))}
        {f.length === 0 && <div className="text-xs text-slate-400 italic text-center py-3">Tidak ada pemain cocok "{q}"</div>}
      </div>
      <div className="font-black text-sm flex items-center gap-2 mt-2">🧢 Skuadku <span className="chip chip-slate ml-auto">{mine.length} pemain</span></div>
      <div className="grid gap-2">
        {mine.map((p) => (
          <div key={p.id} className="row-player">
            <div className="min-w-0">
              <div className="font-black text-sm truncate">{p.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="chip chip-slate">{p.pos} • OVR {p.ovr}</span>
                <span className="chip chip-amber">{rp(p.market_value)}</span>
              </div>
            </div>
            <button onClick={() => sell(p.id)} className="btn-ghost text-xs px-4 py-2 shrink-0">JUAL 💰</button>
          </div>
        ))}
      </div>
    </div>
  );
}
