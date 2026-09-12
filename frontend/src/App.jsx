import { api } from './lib.js';
import Setup from './Setup.jsx';
import Dash from './Dash.jsx';
import React from 'react';

export default function App() {
  const [state, setState] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(() => {
    setLoading(true);
    api('/api/state').then(setState).catch(() => setState({ error: true })).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white text-xl">Loading... ⚽</div>;
  // Validasi bentuk response: kalau bukan JSON backend (mis. ter-rewrite ke index.html), anggap error.
  const valid = state && !state.error && Array.isArray(state.clubs);
  if (!valid) return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-white text-center p-6">
      <div>
        <p className="text-xl mb-2">Backend belum terhubung 😅</p>
        <p className="text-sm text-slate-400">Cek env <code className="text-emerald-400">VITE_API_URL</code> di Vercel (arah ke URL backend), lalu redeploy.</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 font-bold">Coba lagi ↻</button>
      </div>
    </div>
  );
  if (!state.hasSave) return <Setup clubs={state.clubs} onDone={load} />;
  return <Dash save0={state.save} reload={load} />;
}
