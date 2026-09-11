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
  if (!state || state.error) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Backend belum jalan. Jalankan backend dulu.</div>;
  if (!state.hasSave) return <Setup clubs={state.clubs} onDone={load} />;
  return <Dash save0={state.save} reload={load} />;
}
