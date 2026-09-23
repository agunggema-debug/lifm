import React from "react";
import { api, clubLogo, aclRound, aclStage, aclCompName, seasonLabel } from "./lib.js";

const SPEEDS = [
  { id: 0, label: "Santai 🐢", delay: 1400 },
  { id: 1, label: "Normal ⚡", delay: 650 },
  { id: 2, label: "Turbo 🚀", delay: 60 },
];

function fmtClock(min) {
  return String(min || 0).padStart(2, "0") + "'";
}

function eventEmoji(t) {
  return t === "goal" ? "⚽🔥" : t === "chance" ? "😱" : t === "save" ? "🧤" : t === "yellow" ? "🟨" : t === "red" ? "🟥" : t === "injury" ? "🚑" : t === "sub" ? "🔄" : t === "fulltime" ? "⏹️" : "ℹ️";
}

function eventRowClass(e) {
  return e.type === "goal" ? "mrow-goal" : e.type === "red" ? "mrow-red" : e.type === "sub" ? "mrow-sub2" : e.type === "fulltime" ? "mrow-ft" : e.type === "yellow" ? "mrow-yellow" : "mrow";
}

// Panel akhir musim: tombol mulai musim baru (rollover Liga + ACL Two/Elite).
// Juara ACL Two musim sebelumnya otomatis promosi ke ACL ELITE musim berikutnya.
function SeasonDoneBoard({ seasonDone, next, onSeasonStarted }) {
  const [starting, setStarting] = React.useState(false);
  if (!seasonDone) return <div className="text-xl font-black mt-1">Musim Tamat 🏆</div>;
  const startNextSeason = async () => {
    if (starting) return; // anti dobel-klik: satu POST /api/next-season dalam satu waktu
    setStarting(true);
    try {
      const r = await api("/api/next-season", { method: "POST" });
      onSeasonStarted({
        userResult: null,
        others: [],
        save: r.save,
        nextSeason: r,
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setStarting(false);
    }
  };
  return (
    <div className="text-xl font-black mt-1">
      Musim Tamat 🏆
      <div className="mt-2 text-xs font-bold text-slate-300">
        {next && next.aclTitles ? "🏆 " + next.aclTitles + "x Juara ACL • " : ""}
        Tier ACL musim depan: {next && next.aclTier === "elite" ? "ACL ELITE 🌏" : "ACL TWO 🌏"}
      </div>
      <button onClick={startNextSeason} disabled={starting} className="mt-3 bg-lime-400 text-slate-950 font-extrabold rounded-2xl px-6 py-2.5 hover:bg-lime-300 transition-colors disabled:opacity-60">
        {starting ? "Menyiapkan musim baru…" : "➡️ Mulai Musim Baru"}
      </button>
    </div>
  );
}

export default function Match({ save, next, onPlayed, onLive }) {
  const [events, setEvents] = React.useState([]);
  const [shown, setShown] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [halfTime, setHalfTime] = React.useState(false);
  const [phase, setPhase] = React.useState("first");
  const [result, setResult] = React.useState(null);
  const [speed, setSpeed] = React.useState(1);
  const [bench, setBench] = React.useState([]);
  const [myXI, setMyXI] = React.useState([]);
  const [subPick, setSubPick] = React.useState({ out: "", inn: "" });
  const [subsMade, setSubsMade] = React.useState(0);
  const [liveHG, setLiveHG] = React.useState(0);
  const [liveAG, setLiveAG] = React.useState(0);
  const [halfTimeState, setHalfTimeState] = React.useState(null);
  // ==== Sinkronisasi substitusi → server (live-data safety) ====
  // - subBusy: satu request /api/sub dalam satu waktu (dobel-klik tidak mengirim request paralel
  //   yang bisa saling menimpa lineup di server).
  // - start2Ref: LANJUT BABAK KEDUA menunggu sub selesai tersimpan & tak bisa dobel-fire
  //   (dobel POST /api/play phase=second bisa membuat pekan loncat 2x di server).
  const [subBusy, setSubBusy] = React.useState(false);
  const [subStatus, setSubStatus] = React.useState(""); // "", "ok", "fail"
  const subBusyRef = React.useRef(false);
  const start1Ref = React.useRef(false); // guard dobel-klik PLAY MATCH
  const start2Ref = React.useRef(false); // guard dobel-klik LANJUT BABAK KEDUA
  const boxRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const dataRef = React.useRef({ evs: [], idx: 0, hg: 0, ag: 0, done: null });
  // Ref agar tick (dibekukan di setInterval) selalu membaca nilai terbaru,
  // bukan closure state lama saat startTick dipanggil.
  const phaseRef = React.useRef("first");
  const htsRef = React.useRef(null);

  React.useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [shown, events]);
  React.useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const stopTick = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const startTick = (delay) => {
    stopTick();
    timerRef.current = setInterval(tick, delay);
  };

  const tick = () => {
    const d = dataRef.current;
    if (d.idx >= d.evs.length) {
      if (phaseRef.current === "first" && htsRef.current) {
        stopTick();
        setPlaying(false);
        setHalfTime(true);
        return;
      }
      stopTick();
      setPlaying(false);
      setPaused(false);
      if (d.done) {
        setResult(d.done);
        onPlayed(d.done);
      }
      return;
    }
    d.idx++;
    const e = d.evs[d.idx - 1];
    if (e.type === "goal") {
      if (e.team === "home") {
        d.hg++;
        setLiveHG(d.hg);
      } else {
        d.ag++;
        setLiveAG(d.ag);
      }
    }
    setShown(d.idx);
  };

  const loadSquad = async () => {
    try {
      const sq = await api("/api/squad");
      const lineupIds = (save && save.lineup) || [];
      setMyXI(sq.filter((p) => lineupIds.includes(p.id)));
      setBench(sq.filter((p) => !lineupIds.includes(p.id) && p.injured_weeks === 0));
    } catch (e) {
      void e;
    }
  };

  const playFirstHalf = async () => {
    // Guard: jangan restart babak 1 kalau match sedang live / menunggu lanjutan babak 2.
    if (playing || halfTime || halfTimeState || htsRef.current) return;
    if (start1Ref.current) return; // anti dobel-klik: satu request play dalam satu waktu
    start1Ref.current = true;
    stopTick();
    setPlaying(true);
    setPaused(false);
    setHalfTime(false);
    setPhase("first");
    phaseRef.current = "first";
    setShown(0);
    setResult(null);
    setLiveHG(0);
    setLiveAG(0);
    setSubsMade(0);
    setSubPick({ out: "", inn: "" });
    setSubStatus(""); // reset indikator sinkronisasi sub dari laga sebelumnya
    setHalfTimeState(null);
    htsRef.current = null;
    setEvents([{ minute: 0, type: "info", team: "none", text: "Kick-off! Wasit tiup peluit, popok penonton sampai terbang! 🔥" }]);
    try {
      const r = await api("/api/play", { method: "POST", body: JSON.stringify({ phase: "first" }) });
      if (r.finished || r.done) {
        setEvents([{ minute: 90, type: "info", team: "none", text: "Musim selesai! Trophy-nya simpan di lemari, jangan dilap pake kaos! 🏆" }]);
        setShown(1);
        setPlaying(false);
        onPlayed(r);
        return;
      }
      if (!r.userResult) {
        // Pekan babak gugur tanpa laga timmu (timmu tereliminasi) — hasil tetap tersimulasi di server.
        setEvents([{ minute: 0, type: "info", team: "none", text: "Timmu tidak bertanding pekan ini (babak gugur ACL). Hasil laga lain tersimulasi otomatis. ⏭️" }]);
        setShown(1);
        setPlaying(false);
        onPlayed(r);
        return;
      }
      const evs = r.userResult.events.slice();
      setEvents([{ minute: 0, type: "info", team: "none", text: "Kick-off! Wasit tiup peluit, popok penonton sampai terbang! 🔥" }, ...evs]);
      setShown(0);
      dataRef.current = { evs, idx: 0, hg: 0, ag: 0, done: r };
      setHalfTimeState(r.halfTimeState || null);
      htsRef.current = r.halfTimeState || null;
      await loadSquad();
      const sp = SPEEDS.find((s) => s.id === speed) || SPEEDS[1];
      startTick(sp.delay);
    } catch (e) {
      setEvents((old) => [...old, { minute: 0, type: "info", team: "none", text: "Gagal: " + e.message }]);
      setShown(2);
      setPlaying(false);
    } finally {
      start1Ref.current = false; // request play pertama selesai (sukses/gagal) — buka kunci
    }
  };

  const playSecondHalf = async () => {
    if (!halfTimeState) return;
    if (start2Ref.current) return; // anti dobel-klik: dobel POST /api/play bisa membuat pekan loncat 2x di server
    start2Ref.current = true;
    stopTick();
    setHalfTime(false);
    setPlaying(true);
    setPaused(false);
    setPhase("second");
    phaseRef.current = "second";
    setSubsMade(0);
    setSubPick({ out: "", inn: "" });
    setSubStatus(""); // bersihkan indikator sub HT sebelum babak 2 berjalan
    const d = dataRef.current;
    // Lanjutkan tick dari posisi akhir babak 1 (JANGAN reset idx — feed jangan mengulang dari menit 1).
    d.idx = d.evs.length;
    d.hg = liveHG;
    d.ag = liveAG;
    const kick2 = { minute: 45, type: "info", team: "none", text: "⚔️ Babak kedua dimulai! Pemain lari lagi, penonton gigit kuku lagi!" };
    d.evs = [...d.evs, kick2];
    setEvents((old) => [...old, kick2]);
    try {
      const r = await api("/api/play", { method: "POST", body: JSON.stringify({ phase: "second", halfTimeState }) });
      // Babak 2 selesai diproses server — bersihkan state HT agar tombol PLAY untuk
      // laga berikutnya tidak terblokir guard anti-restart.
      setHalfTime(false);
      setHalfTimeState(null);
      htsRef.current = null;
      if (r.finished || r.done) {
        setEvents([{ minute: 90, type: "info", team: "none", text: "Musim selesai! 🏆" }]);
        setShown(1);
        setPlaying(false);
        onPlayed(r);
        return;
      }
      if (!r.userResult) {
        setEvents((old) => [...old, { minute: 90, type: "info", team: "none", text: "Timmu tidak ada laga di babak gugur ini. ⏭️" }]);
        setShown(events.length);
        setPlaying(false);
        onPlayed(r);
        return;
      }
      const h2 = r.userResult.events.filter((e) => e.minute >= 46);
      d.evs = [...d.evs, ...h2];
      d.done = r;
      setEvents((old) => [...old, ...h2]);
      await loadSquad();
      const sp = SPEEDS.find((s) => s.id === speed) || SPEEDS[1];
      startTick(sp.delay);
    } catch (e) {
      // Gagal di server: kembalikan panel HT agar pemain bisa mencoba LANJUT BABAK KEDUA lagi
      // (jangan sampai dead-end dan tombol PLAY tidak berfungsi).
      setEvents((old) => [...old, { minute: 0, type: "info", team: "none", text: "Gagal babak 2: " + e.message + " — coba tekan LANJUT BABAK KEDUA lagi! 🙏" }]);
      setShown(events.length + 1);
      setPlaying(false);
      setHalfTime(true);
      setPhase("first");
      phaseRef.current = "first";
    } finally {
      start2Ref.current = false; // request babak 2 selesai (sukses/gagal) — buka kunci
    }
  };

  const doSub = async () => {
    if (!subPick.out || !subPick.inn || subsMade >= 3) return;
    if (subBusyRef.current) return; // anti dobel-klik: jangan kirim 2 request sub paralel
    subBusyRef.current = true;
    setSubBusy(true);
    setSubStatus("");
    try {
      await api("/api/sub", { method: "POST", body: JSON.stringify({ outId: Number(subPick.out), inId: Number(subPick.inn) }) });
      const outP = myXI.find((p) => p.id === Number(subPick.out));
      const inP = bench.find((p) => p.id === Number(subPick.inn));
      if (inP) {
        setMyXI((xi) => [...xi.filter((p) => p.id !== Number(subPick.out)), inP]);
        setBench((b) => [...b.filter((p) => p.id !== Number(subPick.inn)), ...(outP ? [outP] : [])]);
      }
      setSubsMade((s) => s + 1);
      setSubPick({ out: "", inn: "" });
      setSubStatus("ok");
    } catch (e) {
      setSubStatus("fail");
      alert(e.message);
    } finally {
      subBusyRef.current = false;
      setSubBusy(false);
      setTimeout(() => setSubStatus(""), 2500); // indikator status memudar sendiri
    }
  };

  const vis = events.slice(0, shown + 1);
  const hg = result ? result.userResult.homeGoals : liveHG;
  const ag = result ? result.userResult.awayGoals : liveAG;
  // Setelah FT, tetap tampilkan laga yang BARUSAN dimainkan (dari result),
  // bukan laga pekan berikutnya.
  const fx = result && result.userResult && result.userResult.fixture ? result.userResult.fixture : next;
  const showBoard = !!fx && (result || !fx.finished);
  const homeShort = (result && result.userResult.homeName) || (fx && !fx.finished ? fx.home.short_name : "HOME");
  const awayShort = (result && result.userResult.awayName) || (fx && !fx.finished ? fx.away.short_name : "AWAY");
  const userSide = (result && result.userResult.userSide) || (next ? (next.userHome ? "home" : "away") : "home");
  const scoreLine = userSide === "home" ? "Kamu " + hg + " - " + ag + " " + awayShort : homeShort + " " + hg + " - " + ag + " Kamu";
  // Kompetisi laga ditentukan dari field competition fixture (ACL Two kini digelar di antara pekan liga).
  const fxIsAcl = !!(fx && fx.fixture && aclCompName(fx.fixture.competition));
  const fxCompName = fx && fx.fixture ? aclCompName(fx.fixture.competition) : null;
  const seasonDone = !!(fx && fx.finished && fx.seasonDone);
  const fxMd = fx && fx.matchday;
  const aclLabel = aclStage(fxMd, save.acl_tier) || (fxIsAcl ? "ACL MD " + aclRound(fxMd, save.acl_tier) : null);

    React.useEffect(() => {
    // Kirim snapshot live skor laga MANAJER ini ke parent (Dash) supaya tab Live
    // menampilkan skor yang sedang berjalan — sebelum server resmi merekam (submit skor baru di akhir).
    if (!onLive || !fx || (fx && fx.finished)) return;
    const active = !!fx && (result || !fx.finished);
    if (!active) return;
    let minute = 0;
    if (result) minute = 90;
    else if (halfTime) minute = 45;
    else if (playing) {
      const v = events.slice(0, shown + 1);
      const last = v[v.length - 1];
      minute = last?.minute || (phase === "first" ? 1 : 46);
    }
    let status = "idle";
    if (result) status = "ft";
    else if (halfTime) status = "ht";
    else if (playing) status = "live";
    onLive({
      matchday: fx.matchday || save.matchday,
      hg: Number(liveHG),
      ag: Number(liveAG),
      hk: homeShort,
      ak: awayShort,
      status,
      minute,
      at: Date.now(),
      others: [], // skor laga lain selalu otomatis dari /api/live (server)
    });
  }, [onLive, playing, halfTime, result, liveHG, liveAG, phase, shown, events.length, fx && fx.matchday, homeShort, awayShort, save && save.matchday]);

  return (
    <div className="grid gap-3">
      <div className="scoreboard anim-pop">

        {showBoard ? (
          <>
            <div className="score-top">
              {fxIsAcl ? fxCompName + " " + seasonLabel(fx.season || (next && next.season) || save.season) : "INDONESIA SUPER LEAGUE " + seasonLabel(save.season)} • {aclLabel ? aclLabel : "PEKAN " + fxMd}
            </div>
            <div className="score-teams">
              <div className="score-side">
                <img src={clubLogo(fx.home)} alt={homeShort} className="score-logo" />
                <div className="score-name">
                  {homeShort}
                  {userSide === "home" ? " (KAMU)" : ""}
                </div>
                <div className="score-tag">HOME</div>
              </div>
              <div className="score-mid">
                <div className="score-num">
                  {hg}-{ag}
                </div>
                <div className="score-min">{result ? "FT" : halfTime ? "HT" : playing ? "LIVE" : "Kick-off"}</div>
              </div>
              <div className="score-side">
                <img src={clubLogo(fx.away)} alt={awayShort} className="score-logo" />
                <div className="score-name">
                  {awayShort}
                  {userSide === "away" ? " (KAMU)" : ""}
                </div>
                <div className="score-tag">AWAY</div>
              </div>
            </div>
          </>
        ) : (
          <SeasonDoneBoard seasonDone={seasonDone} next={next} onSeasonStarted={onPlayed} />
        )}
        {result && (
          <div className="score-xg">
            xG {result.userResult.xg.home}-{result.userResult.xg.away} • sim {result.ms}ms ⚡
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <span className="text-xs">Kecepatan:</span>
          {SPEEDS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSpeed(s.id);
                if (playing && !paused && !halfTime) startTick(s.delay);
              }}
              className={"text-xs rounded-full px-3 py-1 font-bold " + (speed === s.id ? "bg-lime-400 text-slate-950" : "bg-white/15")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] opacity-70 mt-1">Santai ~1,4 dtk/event • Normal ~0,65 dtk/event</div>
        {!playing && !halfTime ? (
          <button disabled={seasonDone} onClick={playFirstHalf} className="mt-3 bg-lime-400 disabled:opacity-40 text-slate-950 font-black rounded-2xl px-8 py-3 text-lg">
            ▶️ PLAY MATCH
          </button>
        ) : (
          <button disabled className="mt-3 bg-slate-500 text-white font-black rounded-2xl px-8 py-3 text-lg cursor-not-allowed">
            {playing ? "LIVE... 🔴" : "⏸️ ISTIRAHAT — LANJUTKAN DI BAWAH ⬇️"}
          </button>
        )}
        {result && next && !next.finished && next.matchday === (result.userResult && result.userResult.fixture ? result.userResult.fixture.matchday : null) && (
          <div className="text-[11px] opacity-80 mt-1">
            🌏 Laga berikutnya di pekan yang sama: {next.home.short_name} vs {next.away.short_name} — tekan PLAY MATCH lagi!
          </div>
        )}
      </div>

      {halfTime && phase === "first" && (
        <div className="bg-white rounded-3xl p-4 border-2 border-amber-300 anim-pop">
          <div className="font-black text-lg">
            ⚔️ HALF-TIME! ({hg} - {ag})
          </div>
          <div className="text-xs text-slate-500">Ganti pemain sebelum babak kedua (max 3). Subsmu memengaruhi peluang babak 2!</div>
          <div className="grid sm:grid-cols-3 gap-2 mt-2">
            <select value={subPick.out} onChange={(e) => setSubPick({ ...subPick, out: e.target.value })} className="border-2 rounded-xl px-2 py-2 text-sm font-bold">
              <option value="">⬅️ Keluar...</option>
              {myXI
                .filter((p) => p.pos !== "GK")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pos} • {p.name}
                  </option>
                ))}
            </select>
            <select value={subPick.inn} onChange={(e) => setSubPick({ ...subPick, inn: e.target.value })} className="border-2 rounded-xl px-2 py-2 text-sm font-bold">
              <option value="">➡️ Masuk...</option>
              {bench.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pos} • {p.name} (OVR {p.ovr})
                </option>
              ))}
            </select>
            <button onClick={doSub} disabled={subBusy || !subPick.out || !subPick.inn || subsMade >= 3} className="bg-amber-400 disabled:opacity-40 font-black rounded-xl px-3 py-2 text-sm">
              {subBusy ? "MENYIMPAN…" : "GANTI! (" + subsMade + "/3) 🔄"}
            </button>
          </div>
          {subBusy ? (
            <div className="text-[11px] font-bold text-amber-600 mt-2">🔄 Menyimpan substitusi ke server — babak 2 menunggu sampai sub tersinkron…</div>
          ) : subStatus === "ok" ? (
            <div className="text-[11px] font-bold text-green-600 mt-2">✅ Sub tersimpan &amp; sinkron dengan server — babak 2 pakai XI barumu!</div>
          ) : subStatus === "fail" ? (
            <div className="text-[11px] font-bold text-red-600 mt-2">⚠️ Sub gagal tersimpan — coba lagi sebelum lanjut babak 2.</div>
          ) : null}
          <button
            onClick={playSecondHalf}
            disabled={!halfTimeState || subBusy}
            title={subBusy ? "Tunggu substitusi tersimpan dulu…" : undefined}
            className="mt-3 w-full bg-slate-950 text-white font-black rounded-xl py-3 text-sm disabled:opacity-40"
          >
            ▶️ LANJUT BABAK KEDUA ⚔️
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4">
        <div className="font-black mb-2 flex items-center gap-2">
          {playing && !paused && !halfTime && <span className="w-2 h-2 rounded-full bg-red-500 anim-live" />}
          {halfTime ? "⏹️ HALF-TIME" : playing ? "LIVE" : "Kick-off"}
          <span className="ml-auto text-xs font-normal text-slate-500">
            {vis.length}/{events.length} kejadian
          </span>
        </div>
        <div ref={boxRef} className="matchfeed scroll-slim">
          {vis.length <= 1 && <div className="text-slate-400 text-sm p-2">Belum ada kejadian. Tekan PLAY MATCH! 👆</div>}
          {vis.slice(1).map((e, i) => (
            <div key={i} className={"anim-pop " + eventRowClass(e)}>
              <span className="mmin">{fmtClock(e.minute)}</span>
              <span className="memo">
                {eventEmoji(e.type)} {e.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
