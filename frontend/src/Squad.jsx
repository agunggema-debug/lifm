import React from 'react';
import { api, FORMATIONS, MENTALITIES, moraleMeta, formationNeeds } from './lib.js';

// Koordinat tiap slot per formasi (x: 0-100 kiri-kanan, y: 0-100 atas=serang lawan ke bawah=gawang sendiri).
const PITCH_SPOTS = {
  '4-4-2': [
    { x: 50, y: 90 }, // GK
    { x: 15, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 70 }, // DF
    { x: 15, y: 45 }, { x: 38, y: 47 }, { x: 62, y: 47 }, { x: 85, y: 45 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 } // FW
  ],
  '4-3-3': [
    { x: 50, y: 90 },
    { x: 15, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 70 },
    { x: 28, y: 47 }, { x: 50, y: 50 }, { x: 72, y: 47 },
    { x: 20, y: 20 }, { x: 50, y: 14 }, { x: 80, y: 20 }
  ],
  '3-5-2': [
    { x: 50, y: 90 },
    { x: 25, y: 71 }, { x: 50, y: 73 }, { x: 75, y: 71 },
    { x: 10, y: 45 }, { x: 32, y: 50 }, { x: 50, y: 43 }, { x: 68, y: 50 }, { x: 90, y: 45 },
    { x: 35, y: 20 }, { x: 65, y: 20 }
  ],
  '4-2-3-1': [
    { x: 50, y: 90 },
    { x: 15, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 70 },
    { x: 38, y: 55 }, { x: 62, y: 55 },
    { x: 20, y: 36 }, { x: 50, y: 33 }, { x: 80, y: 36 },
    { x: 50, y: 15 }
  ],
  '5-3-2': [
    { x: 50, y: 90 },
    { x: 8, y: 62 }, { x: 30, y: 70 }, { x: 50, y: 72 }, { x: 70, y: 70 }, { x: 92, y: 62 },
    { x: 28, y: 45 }, { x: 50, y: 47 }, { x: 72, y: 45 },
    { x: 35, y: 20 }, { x: 65, y: 20 }
  ],
  '4-5-1': [
    { x: 50, y: 90 },
    { x: 15, y: 70 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 70 },
    { x: 10, y: 45 }, { x: 30, y: 48 }, { x: 50, y: 44 }, { x: 70, y: 48 }, { x: 90, y: 45 },
    { x: 50, y: 15 }
  ]
};

// Urutkan XI sesuai peran agar tiap token jatuh ke slot yang benar: GK -> DF -> MF -> FW.
function orderForPitch(xi) {
  const rank = { GK: 0, DF: 1, MF: 2, FW: 3 };
  return [...xi].sort((a, b) => (rank[a.pos] - rank[b.pos]) || (b.ovr - a.ovr));
}

export default function Squad({ save, onSaved }) {
  const [players, setPlayers] = React.useState([]);
  const [formation, setFormation] = React.useState(save.formation);
  const [mentality, setMentality] = React.useState(save.mentality);
  const [lineup, setLineup] = React.useState(save.lineup || []);
  const [msg, setMsg] = React.useState('');
  React.useEffect(() => {
    api('/api/squad').then(setPlayers).catch(() => setPlayers([]));
  }, []);
  const toggle = (id) => {
    if (lineup.includes(id)) setLineup(lineup.filter((x) => x !== id));
    else if (lineup.length < 11) setLineup([...lineup, id]);
  };
  // --- Daftar per posisi: filter, cari, auto-XI, kuota per formasi ---
  const POS_META = {
    GK: { label: 'Kiper', emoji: '🧤', bg: '#fef9c3', text: '#854d0e', border: '#eab308' },
    DF: { label: 'Bek', emoji: '🧱', bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    MF: { label: 'Gelandang', emoji: '🎨', bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    FW: { label: 'Penyerang', emoji: '🎯', bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
  };
  const POS_ORDER = ['GK', 'DF', 'MF', 'FW'];
  const NEED = formationNeeds(formation);
  const [posFilter, setPosFilter] = React.useState('ALL');
  const [q, setQ] = React.useState('');
  const autoPick = () => {
    const fit = players.filter((p) => p.injured_weeks === 0);
    const picked = [];
    for (const pos of POS_ORDER) {
      const pool = fit.filter((p) => p.pos === pos && !picked.find((x) => x.id === p.id)).sort((a, b) => b.ovr - a.ovr);
      for (let i = 0; i < (NEED[pos] || 0) && i < pool.length; i++) picked.push(pool[i]);
    }
    if (picked.length < 11) for (const p of [...fit].sort((a, b) => b.ovr - a.ovr)) {
      if (picked.length >= 11) break;
      if (!picked.find((x) => x.id === p.id)) picked.push(p);
    }
    setLineup(picked.slice(0, 11).map((p) => p.id));
  };
  const xiCount = (pos) => xi.filter((p) => p.pos === pos).length;
  const visibleSections = posFilter === 'ALL' ? POS_ORDER : [posFilter];
  const matchQ = (p) => p.name.toLowerCase().includes(q.toLowerCase());
  const saveTac = async () => {
    setMsg('Menyimpan...');
    try {
      const r = await api('/api/tactics', { method: 'POST', body: JSON.stringify({ formation, mentality, lineup }) });
      onSaved(r.save); setMsg('Taktik tersimpan! Gas! ✅');
    } catch (e) { setMsg('Gagal: ' + e.message); }
  };
  const byId = {};
  for (const p of players) byId[p.id] = p;
  const xi = lineup.map((id) => byId[id]).filter(Boolean);
  return (
    <div className="grid gap-3">
      <div className="card">
        <div className="card-title">🧠 Taktik &amp; Starting XI</div>
        <div className="text-xs text-slate-500">Pilih 11 pemain (klik kartu). Max 8 pemain asing 🇺🇳</div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {FORMATIONS.map((f) => (
            <button key={f} onClick={() => setFormation(f)} className={'rounded-xl px-2 py-2 font-black text-sm border-2 ' + (formation === f ? 'border-lime-500 bg-lime-50' : 'border-slate-200')}>{f}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {MENTALITIES.map((m) => (
            <button key={m.id} onClick={() => setMentality(m.id)} className={'rounded-xl px-2 py-2 font-bold text-sm border-2 ' + (mentality === m.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200')}>{m.emoji} {m.label}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold">
          <span>Dipilih: {lineup.length}/11 • Asing: {xi.filter((p) => p.is_foreign).length}/8</span>
          <span className="text-xs font-normal text-slate-500">Butuh {formation}: 🧤{NEED.GK} 🧱{NEED.DF} 🎨{NEED.MF} 🎯{NEED.FW}</span>
          <button onClick={autoPick} className="ml-auto text-xs font-black bg-lime-400 text-slate-950 rounded-full px-3 py-1.5">✨ AUTO-PILIH XI</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Cari nama..." className="flex-1 min-w-[140px] border-2 rounded-xl px-3 py-1.5 text-sm font-bold" />
          {['ALL', ...POS_ORDER].map((f) => (
            <button key={f} onClick={() => setPosFilter(f)} className={'text-xs font-black rounded-full px-3 py-1.5 border-2 ' + (posFilter === f ? 'bg-slate-950 text-white border-slate-950' : 'border-slate-200')}>
              {f === 'ALL' ? 'Semua' : POS_META[f].emoji + ' ' + f}
            </button>
          ))}
        </div>
        <button onClick={saveTac} className="mt-2 w-full bg-slate-950 text-white font-black rounded-2xl py-3">SIMPAN TAKTIK 💾</button>
        {msg && <div className="text-xs mt-1 text-slate-600">{msg}</div>}
      </div>
      <div className="pitch-wrap rounded-3xl p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="font-black">⚽ Lapangan ({formation} • {mentality})</div>
          <div className="text-[11px] bg-black/40 rounded-full px-3 py-1">🟢 ≥80 Semangat • 🟡 60-79 Standar • 🔴 &lt;60 Down</div>
        </div>
        <div className="pitch mt-2">
          <div className="pitch-line pitch-half" />
          <div className="pitch-line pitch-circle" />
          <div className="pitch-line pitch-box-top" />
          <div className="pitch-line pitch-box-bottom" />
          {orderForPitch(xi).map((p, i) => {
            const spot = (PITCH_SPOTS[formation] || PITCH_SPOTS['4-4-2'])[i];
            if (!spot) return null;
            const mm = moraleMeta(p.morale);
            const short = p.name.split(' ').length > 1 ? p.name.split(' ').slice(-1)[0] : p.name;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                title={p.name + ' • Moral ' + p.morale}
                className="pitch-token anim-pop"
                style={{ left: spot.x + '%', top: spot.y + '%' }}
              >
                <span className="pitch-jersey" style={{ borderColor: mm.ring }}>
                  {p.pos}
                  <span className="pitch-morale" style={{ background: mm.ring }}>{mm.emoji}</span>
                </span>
                <span className="pitch-name">{short} {p.ovr}</span>
                <span className="pitch-morale-num" style={{ background: mm.bg, color: mm.text }}>{p.morale}</span>
              </button>
            );
          })}
          {xi.length === 0 && <div className="pitch-empty">Klik kartu pemain di bawah buat isi 11 slot 👇</div>}
        </div>
        <div className="text-[11px] mt-2 opacity-80">Klik token di lapangan buat lepas pemain. Urutan token = GK → DF → MF → FW sesuai formasi.</div>
      </div>
      <div className="grid gap-3">
        {visibleSections.map((pos) => {
          const meta = POS_META[pos];
          const list = players.filter((p) => p.pos === pos && matchQ(p)).sort((a, b) => b.ovr - a.ovr);
          const full = xiCount(pos) >= (NEED[pos] || 0);
          return (
            <div key={pos} className="card" style={{ borderTop: `4px solid ${meta.border}` }}>
              <div className="card-title">
                <span className="text-lg">{meta.emoji}</span>
                <div>{meta.label} ({pos})</div>
                <span className={'ml-auto text-[11px] font-black rounded-full px-2 py-0.5 ' + (full ? 'bg-lime-200 text-lime-900' : 'bg-slate-100 text-slate-600')}>
                  {xiCount(pos)}/{NEED[pos] || 0} {full ? '✅' : ''}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mb-2">Klik kartu buat masuk/keluar Starting XI. Warna kiri = {meta.label}.</div>
              <div className="grid gap-2">
                {list.map((p) => {
                  const on = lineup.includes(p.id);
                  const mm = moraleMeta(p.morale);
                  return (
                    <button key={p.id} onClick={() => toggle(p.id)} disabled={p.injured_weeks > 0}
                      className={'text-left rounded-2xl p-3 border-2 border-l-8 flex justify-between items-center gap-2 ' + (on ? 'bg-lime-50' : 'bg-slate-50')}
                      style={{ borderLeftColor: meta.border, borderColor: on ? '#84cc16' : undefined }}>
                      <div className="min-w-0">
                        <div className="font-black text-sm truncate">{on ? '✅ ' : ''}{p.name} {p.is_foreign ? '🌍' : ''} {p.injured_weeks > 0 ? '🚑' + p.injured_weeks + 'w' : ''}</div>
                        <div className="text-xs text-slate-500">OVR {p.ovr} • PAC{p.pac} SHO{p.sho} PAS{p.pas} DEF{p.def} {p.pos === 'GK' ? 'GK' + p.gk : ''} • ⚽{p.goals}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-black rounded-full px-2 py-0.5" style={{ background: mm.bg, color: mm.text }}>{mm.emoji} Moral {p.morale}</div>
                      </div>
                      <div className="text-right text-xs text-slate-500 shrink-0">Rp{Number(p.market_value).toLocaleString('id-ID')}</div>
                    </button>
                  );
                })}
                {list.length === 0 && <div className="text-xs text-slate-400 italic">Tidak ada {pos} cocok "{q}"</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
