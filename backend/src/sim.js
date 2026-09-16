import { rateTeam } from './matchEngine.js';
const GOAL_TXT = [
  'GOOOOL! Bobokoookkk! Stadion sampai kena getarkan!',
  'GOL! Yang bener aja, gawangnya kok bolong ya?',
  'GOLLL MUANTAAAPP! Suporter teriak sampai tetangga ikut kaget!',
  'GOL! Skakmat! Lawan masih buffering!',
  'GOL! Ini bukan impi, ini PENCURIAN TERANG-DAYLIGHT!',
  'GOOOOL! Kiper-nya nonton bola dari kursi, katanya!',
  'GOL SAKTI! Bola-nya kayak punya GPS ke gawang!',
  'GOL! Skuad lawan langsung berdiskusi sambil megang kepala!'
];
const CHANCE_TXT = [
  'HUUY hampir! Bola cium mistar gawang!',
  'Peluang emas! Bek lawan kayak kena lag!',
  'Tendangan keras! Bola melesat gak jelas arah, tapi serem!',
  'Sundulan! Mistar-nya sampai kusut mikir!',
  'Nyaris! Kaki emas tapi kiper-nya mode sultan reflex!',
  'Duel satu lawan satu! Jantung suporter deg-degan! 💓',
  'Peluang! Sayang finishing-nya masih versi beta!',
  'Dribel liar! Bek lawan sampai terpeleset nontonin!',
  'Opsss... bola lewat tipis! Nekatnya level dewa!'
];
const SAVE_TXT = [
  'SAVE SAKTI! Tangan kiper itu kayak ada magnetnya!',
  'Kiper mode CEO! Reflex-nya gila sih!',
  'SAVED! Sampai kucing di tribun ikut teriak kagum!',
  'Kiper-nya nge-cheat? Reflex luar biasa!',
  'Sensasi kiper! Bola dipeluk erat kayak charger!',
  'Ditampis! Kiper-nya langsung pose kek ganteng!'
];
const YEL_TXT = [
  'Kartu kuning! Tackling-nya kayak debat kandidat',
  'Kuning! Wasit-nya gak bisa diajak kompromi sama sekali',
  'Kartu kuning! Main kaki dulu, mikir belakangan',
  'Pelanggaran! Kayak ngambil charger orang tanpa izin',
  'Kuning! Slide-nya kena review VAR sampai ke tetangga sebelah',
  'Kartu kuning! Pelatih di pinggir sampai lepas kacamata'
];
const RED_TXT = [
  'KARTU MERAH! Kakek wasit langsung ngamuk!',
  'MERAAAH! Dikick-out! Malu-maluin bestie!',
  'Kartu merah! Mode speedrun keluar lapangan!',
  'MERAH! Suporter jadi komposer lagu duka seketika!'
];
const INJ_TXT = [
  'Aduh! Keseleo kayak kaki masuk kulkas! Tim medis masuk',
  'Pemain tumbang! Kram alias kehabisan baterai 🔋',
  'Tim medis lari lebih cepet dari pemainnya!',
  'Aduh! Kayak kena tackle dari masa depan! Perawatan dulu'
];

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function scorerOf(list, posWanted) {
  const pool = list.filter(function (p) { return p.pos === posWanted; });
  const src = pool.length ? pool : list;
  return src[Math.floor(Math.random() * src.length)];
}

function xgFor(home, away, homeTactic, awayTactic) {
  const H = rateTeam(home, homeTactic.mentality, homeTactic.formation, true);
  const A = rateTeam(away, awayTactic.mentality, awayTactic.formation, false);
  const midEdgeH = (H.mid - A.mid) / 100;
  let xgH = 1.35 * (H.atk / Math.max(40, A.def)) * (1 + midEdgeH * 0.5);
  let xgA = 1.35 * (A.atk / Math.max(40, H.def)) * (1 - midEdgeH * 0.5);
  xgH = Math.min(4.2, Math.max(0.25, xgH));
  xgA = Math.min(4.2, Math.max(0.25, xgA));
  const homeShare = (H.atk + H.mid) / ((H.atk + H.mid) + (A.atk + A.mid));
  return { H: H, A: A, xgH: xgH, xgA: xgA, homeShare: homeShare };
}

// Simulasi SATU babak (menit from..to). Dipakai 2 tahap: 1-45 lalu 46-90
// sehingga pergantian HT ikut mengubah rating + xG babak 2.
export function simulateHalf(o) {
  const from = o.from || 1;
  const to = o.to || 45;
  const calc = xgFor(o.home, o.away, o.homeTactic, o.awayTactic);
  const H = calc.H; const A = calc.A;
  const xgH = calc.xgH; const xgA = calc.xgA; const homeShare = calc.homeShare;
  let hg = 0; let ag = 0;
  const events = [];
  const scorers = { home: {}, away: {} };
  const attH = o.home.filter(function (p) { return p.pos !== 'GK'; });
  const attA = o.away.filter(function (p) { return p.pos !== 'GK'; });
  for (let min = from; min <= to; min++) {
    if (Math.random() < 0.14) {
      const isHome = Math.random() < homeShare;
      const pG = (isHome ? xgH : xgA) / 90 / 0.14 * 0.9;
      const r = Math.random();
      if (r < pG * 0.55) {
        const rr = Math.random();
        const want = rr < 0.5 ? 'FW' : rr < 0.82 ? 'MF' : 'DF';
        if (isHome) { hg++; const s = scorerOf(attH, want); scorers.home[s.id] = (scorers.home[s.id] || 0) + 1;
          events.push({ minute: min, type: 'goal', team: 'home', playerId: s.id, text: min + "' " + pick(GOAL_TXT) + ' ' + s.name + ' (' + o.homeName + ')!' }); }
        else { ag++; const s = scorerOf(attA, want); scorers.away[s.id] = (scorers.away[s.id] || 0) + 1;
          events.push({ minute: min, type: 'goal', team: 'away', playerId: s.id, text: min + "' " + pick(GOAL_TXT) + ' ' + s.name + ' (' + o.awayName + ')!' }); }
      } else if (r < pG * 0.55 + 0.42) {
        const s = isHome ? attH[Math.floor(Math.random() * attH.length)] : attA[Math.floor(Math.random() * attA.length)];
        events.push({ minute: min, type: 'chance', team: isHome ? 'home' : 'away', text: min + "' " + pick(CHANCE_TXT) + ' - ' + s.name });
      } else if (r < pG * 0.55 + 0.7) {
        events.push({ minute: min, type: 'save', team: isHome ? 'away' : 'home', text: min + "' " + pick(SAVE_TXT) });
      } else if (r < pG * 0.55 + 0.88) {
        const list = isHome ? o.away : o.home;
        const s = list[Math.floor(Math.random() * list.length)];
        events.push({ minute: min, type: 'yellow', team: isHome ? 'away' : 'home', playerId: s.id, text: min + "' " + pick(YEL_TXT) + ' - ' + s.name });
      } else if (r < pG * 0.55 + 0.915) {
        const list = isHome ? o.away : o.home;
        const s = list[Math.floor(Math.random() * list.length)];
        events.push({ minute: min, type: 'red', team: isHome ? 'away' : 'home', playerId: s.id, text: min + "' " + pick(RED_TXT) + ' - ' + s.name });
      } else {
        const isH = Math.random() < 0.5;
        const list = isH ? o.home : o.away;
        const s = list[Math.floor(Math.random() * list.length)];
        events.push({ minute: min, type: 'injury', team: isH ? 'home' : 'away', playerId: s.id, text: min + "' " + pick(INJ_TXT) + ' - ' + s.name });
      }
    }
    if (min === 45 && to <= 45) events.push({ minute: 45, type: 'info', team: 'none', text: "HT: " + o.homeName + ' ' + hg + ' - ' + ag + ' ' + o.awayName });
  }
  events.sort(function (a, b) { return a.minute - b.minute; });
  return { homeGoals: hg, awayGoals: ag, events: events, scorers: scorers, xg: { home: +xgH.toFixed(2), away: +xgA.toFixed(2) }, ratings: { home: H, away: A } };
}

// Kompatibilitas: laga non-user tetap 1 panggilan (babak 1 + babak 2 digabung).
export function simulateMatch(o) {
  const h1 = simulateHalf({ home: o.home, away: o.away, homeName: o.homeName, awayName: o.awayName, homeTactic: o.homeTactic, awayTactic: o.awayTactic, from: 1, to: 45 });
  const h2 = simulateHalf({ home: o.home2 || o.home, away: o.away2 || o.away, homeName: o.homeName, awayName: o.awayName, homeTactic: o.homeTactic2 || o.homeTactic, awayTactic: o.awayTactic2 || o.awayTactic, from: 46, to: 90 });
  const hg = h1.homeGoals + h2.homeGoals;
  const ag = h1.awayGoals + h2.awayGoals;
  const events = h1.events.concat(h2.events);
  const scorers = { home: {}, away: {} };
  for (const k of Object.keys(h1.scorers.home)) scorers.home[k] = (scorers.home[k] || 0) + h1.scorers.home[k];
  for (const k of Object.keys(h2.scorers.home)) scorers.home[k] = (scorers.home[k] || 0) + h2.scorers.home[k];
  for (const k of Object.keys(h1.scorers.away)) scorers.away[k] = (scorers.away[k] || 0) + h1.scorers.away[k];
  for (const k of Object.keys(h2.scorers.away)) scorers.away[k] = (scorers.away[k] || 0) + h2.scorers.away[k];
  let tail = 'Imbang! Dua-duanya sama kuat, sama-sama gak pede bestie! 🤝';
  if (hg > ag) tail = o.homeName + ' menang! Stadion rame kayak konser tiket murah! 🎉';
  if (ag > hg) tail = o.awayName + ' nyolong 3 poin pulang bawa koper! 🧊';
  events.push({ minute: 90, type: 'fulltime', team: 'none', text: 'FT: ' + o.homeName + ' ' + hg + ' - ' + ag + ' ' + o.awayName + '! ' + tail });
  events.sort(function (a, b) { return a.minute - b.minute; });
  return { homeGoals: hg, awayGoals: ag, events: events, scorers: scorers, xg: { home: +((h1.xg.home + h2.xg.home) / 2).toFixed(2), away: +((h1.xg.away + h2.xg.away) / 2).toFixed(2) }, halves: { h1: h1, h2: h2 } };
}
