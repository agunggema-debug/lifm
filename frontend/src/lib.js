// Base URL backend. Kosong = same-origin (dev: proxy via Vite, prod Vercel: set VITE_API_URL).
export const API_BASE = (import.meta.env.VITE_API_URL || "https://lifm-backend.vercel.app").replace(/\/$/, "");
// ==== Identitas pengunjung (multi-user) ====
// Token unik per browser disimpan di localStorage & dikirim via header X-Lifm-Token,
// sehingga tiap pengunjung punya karier + dunia gamenya sendiri.
function randomToken() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  return "t" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}
export function getToken() {
  try {
    let t = localStorage.getItem("lifm_token");
    if (!t) {
      t = randomToken();
      localStorage.setItem("lifm_token", t);
    }
    return t;
  } catch {
    return randomToken();
  }
}
export function resetToken() {
  try { localStorage.setItem("lifm_token", randomToken()); } catch { /* ignore */ }
}
export async function api(path, opts) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", "X-Lifm-Token": getToken() },
    ...(opts || {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Request gagal");
  if (data === null) throw new Error("Response bukan JSON dari backend"); // mis. kena rewrite SPA saat env API belum di-set
  return data;
}
export function rp(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}
// Kebutuhan jumlah pemain per posisi untuk tiap formasi (mirror backend game.js).
export function formationNeeds(f) {
  const m = {
    "4-4-2": [1, 4, 4, 2],
    "4-3-3": [1, 4, 3, 3],
    "3-5-2": [1, 3, 5, 2],
    "4-2-3-1": [1, 4, 5, 1],
    "5-3-2": [1, 5, 3, 2],
    "4-5-1": [1, 4, 5, 1],
  };
  const v = m[f] || m["4-4-2"];
  return { GK: v[0], DF: v[1], MF: v[2], FW: v[3] };
}
// Logo klub dari folder backend: lifm/backend/src/public/img/clubs/*.png (disserve via /img/clubs/)
// Aset gambar (logo klub & background) disajikan dari frontend/public/img (self-contained di Vercel).
// Hanya panggilan /api yang diarahkan ke backend via API_BASE.
export function clubLogo(c) {
  if (!c) return "";
  if (typeof c === "string") return "/img/clubs/" + c;
  if (typeof c === "object") {
    if (c.logo_url) return c.logo_url; // dari API (Live / Leaderboard / standings)
    if (c.logo) return "/img/clubs/" + c.logo; // dari CLUBS game-data
  }
  return "";
}
// Warna moral: >=80 hijau, 60-79 kuning, <60 merah.
// Asumsi: permintaan "99 merah" kemungkinan typo — 99 tetap hijau karena >80.
export function moraleMeta(m) {
  const v = Number(m || 0);
  if (v >= 80) return { color: "green", emoji: "😃", label: "Semangat", ring: "#22c55e", bg: "#dcfce7", text: "#166534" };
  if (v >= 60) return { color: "yellow", emoji: "😐", label: "Standar", ring: "#eab308", bg: "#fef9c3", text: "#854d0e" };
  return { color: "red", emoji: "😞", label: "Down", ring: "#ef4444", bg: "#fee2e2", text: "#991b1b" };
}
export const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "4-5-1"];
// ===== Kalender musim (sinkron dengan backend/src/data.js) =====
// Liga Indonesia: 18 klub home & away = 34 pertandingan/klub (34 pekan, 306 laga).
export const LEAGUE_MDS = 34;
// Pekan fase grup / league phase ACL per tier (pekan ganda: Liga + ACL di pekan yang sama).
// ACL Two: 6 laga grup (pekan 4,8,12,16,20,24). ACL Elite: 8 laga league phase (pekan 4-28).
// ACL Elite 2026/27 = 32 klub (16/zona, 4 pot x 4) dengan jadwal lawan ASLI undian AFC
// (lihat backend/src/acl_elite.json) — 8 laga/klub, top 8 tiap zona ke babak gugur.
export const ACL_TWO_GROUP_MD = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };
export const ACL_ELITE_GROUP_MD = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 26, 8: 28 };
export function aclGroupRounds(tier) { return tier === "elite" ? ACL_ELITE_GROUP_MD : ACL_TWO_GROUP_MD; }
// Ronde ke-n fase grup/league phase di pekan tertentu (0 = bukan pekan ACL grup).
export function aclRound(md, tier) {
  const m = aclGroupRounds(tier);
  const key = Object.keys(m).find((k) => m[k] === Number(md));
  return key ? Number(key) : 0;
}
// Pekan babak gugur + nama babaknya (aturan AFC):
// ACL Two: 16 Besar/Perempat Final/Semifinal 2 LEG + Final 1 laga.
export const ACL_TWO_KO_MDS = {
  26: "16 Besar • Leg 1", 28: "16 Besar • Leg 2",
  29: "Perempat Final • Leg 1", 30: "Perempat Final • Leg 2",
  31: "Semifinal • Leg 1", 32: "Semifinal • Leg 2", 34: "Final"
};
// ACL Elite: semua babak 1 laga (16 Besar -> Final).
export const ACL_ELITE_KO_MDS = { 29: "16 Besar", 31: "Perempat Final", 32: "Semifinal", 34: "Final" };
export function aclStage(md, tier) { return (tier === "elite" ? ACL_ELITE_KO_MDS : ACL_TWO_KO_MDS)[Number(md)] || null; }
// Nama kompetisi dari field competition fixture ('league' | 'acl_two' | 'acl_elite').
export function aclCompName(comp) { return comp === "acl_elite" ? "ACL ELITE" : comp === "acl_two" ? "ACL TWO" : null; }
// Label musim: season 1 -> 2026/27, season 2 -> 2027/28, dst.
export function seasonLabel(s) { const n = Number(s); return n > 0 ? (2025 + n) + "/" + (2026 + n) : "2026/27"; }
export const MENTALITIES = [
  { id: "attacking", label: "Menyerang", emoji: "🔥" },
  { id: "balanced", label: "Seimbang", emoji: "⚖️" },
  { id: "defensive", label: "Bertahan", emoji: "🧱" },
];
