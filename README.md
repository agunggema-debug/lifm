# ⚽🔥 Liga Indonesia Football Manager (LIFM) — BRI Super League 2026/27

Game simulasi manajer sepak bola **open source (MIT)** — ringan, tanpa install, jalan di browser.
Bikin karier, pilih 1 dari **18 klub BRI Super League 2026/27** (logo resmi di `lifm/backend/src/public/img/clubs/`),
main di atas **background stadion** (`lifm/backend/src/public/img/background.jpg`), atur taktik, tekan **PLAY MATCH**! 🏆

> Bahasa: Indonesia • Gaya UI: Gen Alpha (playful, emoji, gede, responsif HP & desktop) 🇮🇩

## ✨ Fitur

- **4.1 Taktik:** 6 formasi (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2, 4-5-1), Starting XI klik-pilih, mentalitas Menyerang/Seimbang/Bertahan 🧠
- **4.2 Database:** 18 klub BRI Super League 2026/27 sesuai situs resmi [ileague.id](https://ileague.id/clubs/index/BRI_SUPER_LEAGUE_2026-27) (Persija, Persib, Persebaya, Arema, Bali Utd, Borneo, PSM, Dewa Utd Banten, Madura Utd, Persita, PSS, Persik, Bhayangkara Presisi Lampung, Persijap, PSIM, Isenmulang Kalteng, Garudayaksa, Java Utd) + 432 pemain (24/klub, **nama asli dari roster ileague.id** — posisi & atribut digenerate karena tidak dipublikasikan situs). Atribut PAC/SHO/PAS/DEF/GK/STA/Morale 1–100. Kuota asing max 8 di XI 🌍. Logo: `backend/src/public/img/clubs/*.png` (18 logo resmi diunduh dari assets ileague.id via `gen_rosters.mjs`) diserve via `/img/clubs/` (Express static + Vite proxy).
- **4.3 Match Engine (server-authoritative):** tick 90 menit, xG berbasis rating+taktik+moral+home advantage, play-by-play teks, gol/peluang/save/kartu/cedera ⚡
- **4.4 Transfer:** beli/jual, market value dinamis sederhana, budget klub, batas skuad 18–28 💸
- **4.5 Liga & Kalender:** klasemen otomatis (Poin/GD/GF), 17 pekan, tombol Play = Continue ⏭️

## 🧱 Teknologi (sesuai dokumentasi resmi)

- **Frontend:** [Vite](https://vite.dev/guide/) + React + [Tailwind CSS v4 via @tailwindcss/vite](https://tailwindcss.com/docs/installation/using-vite)
- **Backend:** [Express.js](https://expressjs.com/en/starter/hello-world.html) + better-sqlite3 (SQLite lokal; skema relasional ≈ PostgreSQL, gampang migrasi ke Postgres via Prisma/Drizzle)
- **Kenapa SQLite lokal?** Biar `git clone → npm install → npm run dev` langsung jalan tanpa install Postgres. Untuk production, pindahkan `DATABASE_URL` ke Postgres (lihat `backend/src/db.js`).

## 🚀 Cara jalanin di lokal (Windows / Mac / Linux)

Butuh: **Node.js 20.19+ / 22.12+** (cek: `node --version`).

```bash
# 1. masuk folder
cd lifm

# 2. install semua (backend + frontend)
npm run install:all
#  = npm --prefix backend install + npm --prefix frontend install
#  (lihat: https://vite.dev/guide/ "Scaffolding Your First Vite Project" &
#   https://tailwindcss.com/docs/installation/using-vite)

# 3. jalanin backend (port 3001) — terminal 1
npm run dev:backend
#  = node --watch src/index.js (lihat: https://expressjs.com/en/starter/hello-world.html)

# 4. jalanin frontend (port 5173) — terminal 2
npm run dev:frontend
#  = vite --port 5173 (proxy /api → http://localhost:3001, lihat frontend/vite.config.js)

# 5. buka browser
http://localhost:5173
```

Alternatif 1 perintah (2 proses sekaligus):

```bash
npm run dev
```

### Reset database

Hapus file `backend/lifm.db` lalu restart backend — auto-seed 18 klub + 432 pemain + 153 fixture. Atau tekan **↺ Reset** di header / `POST /api/career/reset`.

## 🕹️ Cara main

1. Isi **nama manajer** → pilih klub → **GAS MULAI KARIR! 🚀**
2. Tab **Skuad 🧢**: pilih formasi + mentalitas + klik 11 pemain → **SIMPAN TAKTIK 💾** 3. Tab **Match ⚽**: pilih kecepatan (Santai/Normal/Turbo) → **▶️ PLAY MATCH** → simulasi babak 1 (menit 1-45)! 🎙️ 5. Saat **HT (⏸️)** munuh, ganti pemain lewat dropdown **Keluar/Masuk** → tekan **▶️ LANJUTKAN BABAK KEDUA ⚔️** — subs memengaruhi rating + xG babak 2! 6. Setelah **FT**, lihatorat hasil akhir → poin update klasemen.
3. Tab **Klasemen 🏆**: cek posisi + jadwal pekan lain.
4. Tab **Transfer 💸**: beli bintang / jual buat cuan.
5. Ulangi sampai pekan 17 → juara! 🏆

## 🔌 API (backend port 3001)

| Method | Path                       | Deskripsi                                                                                            |
| ------ | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`              | cek backend                                                                                          |
| GET    | `/api/state`               | save + klub                                                                                          |
| POST   | `/api/career`              | `{managerName, clubId}` mulai karier                                                                 |
| GET    | `/api/squad`               | skuad klub user                                                                                      |
| POST   | `/api/tactics`             | `{formation, mentality, lineup:[ids]}`                                                               |
| GET    | `/api/next-fixture`        | laga user pekan ini                                                                                  |
| GET    | `/api/fixtures?matchday=n` | semua laga 1 pekan                                                                                   |
| POST   | `/api/play`                | {phase:'first'} → simulasi HT + halfTimeState; 2nd call {phase:'second',halfTimeState} untuk babak 2 |
| POST   | `/api/sub`                 | {outId,inId} ganti pemain — memengaruhi rating babak 2                                               |
| GET    | `/api/standings`           | klasemen                                                                                             |
| GET    | `/api/news`                | inbox/berita                                                                                         |
| GET    | `/api/transfer-list`       | 60 pemain incaran                                                                                    |
| POST   | `/api/transfer/buy`        | `{playerId}`                                                                                         |
| POST   | `/api/transfer/sell`       | `{playerId}`                                                                                         |

## 📁 Struktur

```
lifm/
├── backend/src/{index.js,db.js,seed.js,data.js,matchEngine.js→sim.js,game.js,postmatch.js,play.js}
├── frontend/src/{App.jsx,Setup.jsx,Dash.jsx,Squad.jsx,Match.jsx,Tables.jsx,Transfers.jsx,lib.js}
├── frontend/{index.html,vite.config.js}
└── README.md (file ini juga dicopy ke lifm/README.md)
```

## ⚖️ Lisensi & kontribusi

MIT — bebas fork, modif, rilis.
Kontribusi: fork → branch → PR. Gas! 🔥
