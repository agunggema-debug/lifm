<div align="center">

<img src="frontend/public/img/lifm.png" alt="LIFM" width="120" />

# LIGA INDONESIA FOOTBALL MANAGER (LIFM)

**Indonesia Super League 2026/27** 🇮🇩

_Game manajer sepak bola open source — tanpa install, langsung gas di browser! 🚀_

![License](https://img.shields.io/badge/Lisensi-MIT-lime?style=for-the-badge)
![Node](https://img.shields.io/badge/Node-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/libSQL-SQLite-00C4CC?style=for-the-badge&logo=sqlite&logoColor=white)

</div>

---

> [!IMPORTANT]
> **Setiap pengunjung punya karier sendiri!** 🙌 Multi-user penuh — progres kamu tersimpan aman di browser masing-masing (via token), gak bakal kecampur sama pemain lain.

> 🗣️ Bahasa: Indonesia • Gaya UI: Gen Alpha (playful, emoji, gede, responsif HP & desktop)

## 🎮 Fitur

| Fitur                   | Deskripsi                                                                                                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🧠 **Taktik & Formasi** | 6 formasi (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2, 4-5-1), starting XI klik-pilih, mentalitas **Menyerang ⚔️ / Seimbang ⚖️ / Bertahan 🧱**                                                                                                                                                      |
| 🏟️ **Database Klub**    | 18 klub Indonesia Super League sesuai [ileague.id](https://ileague.id/clubs/index/BRI_SUPER_LEAGUE_2026-27) — Persija, Persib, Persebaya, Arema, Bali Utd, Borneo, PSM, Dewa Utd, Madura Utd, Persita, PSS, Persik, Bhayangkara Presisi, Persijap, PSIM, Isenmulang Kalteng, Garudayaksa, Java Utd |
| 🌍 **Pemain**           | 1.176 pemain (24/klub, nama asli roster ileague.id) • atribut PAC/SHO/PAS/DEF/GK/STA/Morale 1–100 • kuota asing max 8 di XI                                                                                                                                                                  |
| ⚡ **Match Engine**     | Server-authoritative, xG berbasis rating + taktik + moral + home advantage, play-by-play menit-per-menit: gol, peluang, save, kartu, cedera 🎙️                                                                                                                                               |
| 💸 **Transfer**         | Beli bintang / jual buat cuan, market value dinamis, budget klub, batas skuad 18–28                                                                                                                                                                                                          |
| 🏆 **Liga & ACL Two**   | Klasemen otomatis (Poin/GD/GF) • 17 pekan liga + fase grup ACL Two (8 grup) + babak gugur 16 Besar → Final, total **23 pekan**                                                                                                                                                               |
| 👥 **Multi-User**       | Setiap browser = karier sendiri (token di localStorage), dunia privat: pemain, jadwal, klasemen, berita                                                                                                                                                                                      |

## 🕹️ Cara Main

> 💡 Panduan lengkap juga tersedia **di dalam game** — tekan tombol melayang **🕹️ CARA MAIN** di pojok kanan bawah!

1. ✍️ **Isi nama manajer** → pilih klub favoritmu ⭐ → tekan **GAS MULAI KARIR! 🚀**
2. 🧢 **Tab Skuad** → atur formasi + mentalitas → klik 11 pemain untuk starting XI → **SIMPAN TAKTIK 💾**
3. ⚽ **Tab Match** → pilih kecepatan (Santai 🐢 / Normal 🚶 / Turbo 🚀) → **▶️ PLAY MATCH** → nikmati komentar play-by-play babak 1 (menit 1–45)!
4. ⏸️ **Saat HT muncul** → ganti pemain lewat dropdown **Keluar/Masuk** → tekan **▶️ LANJUTKAN BABAK KEDUA ⚔️** → substitusi beneran memengaruhi rating & xG babak 2!
5. 🏆 **Tab Klasemen** → cek posisi + jadwal pekan lain → **Tab Transfer 💸** → beli bintang / jual buat cuan
6. 🔁 **Ulangi sampai pekan 17** → gas juara Liga! 🏆 sambil cuti di ACL Two → taklukkan Asia di **Final Pekan 21** 🌏

> [!TIP]
> 🔥 **Tips Pro Gamer**
>
> - Moral pemain turun setelah kalah → rotasi skuad biar gak ada yang mode 😞
> - Pemain cedera 🚑 gak bisa main → cek dulu sebelum kick-off
> - Sub di HT itu game-changer: bawa pemain segar vs lawan yang capek!

## 🚀 Quick Start (Buat Dev)

Butuh: **Node.js 20.19+ / 22.12+** (cek: `node --version`)

```bash
# 1️⃣ masuk folder proyek
cd lifm

# 2️⃣ install backend + frontend sekaligus
npm run install:all

# 3️⃣ jalankan backend (port 3001) — terminal 1
npm run dev:backend

# 4️⃣ jalankan frontend (port 5173) — terminal 2
npm run dev:frontend

# 5️⃣ buka browser
http://localhost:5173
```

Males buka 2 terminal? Gas 1 perintah:

```bash
npm run dev
```

> [!NOTE]
> Frontend otomatis proxy `/api` → `http://localhost:3001` (lihat `frontend/vite.config.js`). Tanpa env apa pun, backend pakai file SQLite lokal `backend/lifm.db` — langsung jalan tanpa setup database!

### ♻️ Reset Karier

- Tekan **↺ Reset** di header game → **hanya karier kamu sendiri** yang terhapus, pengunjung lain gak terpengaruh 🛡️
- Atau `POST /api/career/reset` (header `X-Lifm-Token`)
- Mau reset total? Hapus file `backend/lifm.db` lalu restart backend — klub di-seed ulang otomatis

## 🔌 API Reference (port 3001)

> 💡 Semua endpoint (kecuali `/api/health`, `/api/meta`, `/api/clubs`, `/api/visitors`) membaca identitas karier dari **header `X-Lifm-Token`**.

| Method | Path                       | Deskripsi                                                                              |
| ------ | -------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/api/health`              | ❤️ cek backend                                                                         |
| GET    | `/api/meta`                | ℹ️ info musim & liga                                                                   |
| GET    | `/api/clubs`               | 🏟️ semua klub + logo                                                                   |
| GET    | `/api/visitors`            | 👥 counter pengunjung                                                                  |
| GET    | `/api/state`               | 💾 karier aktif + klub (atau daftar klub jika belum mulai)                             |
| POST   | `/api/career`              | 🚀 `{managerName, clubId}` mulai karier (buat dunia privat)                            |
| POST   | `/api/career/reset`        | ♻️ hapus **karier sendiri saja**                                                       |
| GET    | `/api/squad`               | 🧢 skuad klubmu                                                                        |
| POST   | `/api/tactics`             | 🧠 `{formation, mentality, lineup:[ids]}`                                              |
| GET    | `/api/next-fixture`        | ⚔️ laga berikutnya                                                                     |
| GET    | `/api/fixtures?matchday=n` | 📅 semua laga 1 pekan                                                                  |
| POST   | `/api/play`                | ▶️ `{phase:'first'}` → simulasi sampai HT; `{phase:'second', halfTimeState}` → babak 2 |
| POST   | `/api/sub`                 | 🔁 `{outId, inId}` ganti pemain (pengaruh ke babak 2)                                  |
| GET    | `/api/standings`           | 🏆 klasemen liga                                                                       |
| GET    | `/api/standings/acl`       | 🌏 klasemen grup ACL Two                                                               |
| GET    | `/api/news`                | 📰 berita/hasil pekanan                                                                |
| GET    | `/api/transfer-list`       | 🎯 60 pemain incaran                                                                   |
| POST   | `/api/transfer/buy`        | 💰 `{playerId}`                                                                        |
| POST   | `/api/transfer/sell`       | 🤑 `{playerId}`                                                                        |

## 🧱 Teknologi

| Layer       | Tech                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| ⚛️ Frontend | [Vite](https://vite.dev/guide/) + React + [Tailwind CSS v4](https://tailwindcss.com/docs/installation/using-vite) |
| 🖥️ Backend  | [Express.js](https://expressjs.com/en/starter/hello-world.html) + @libsql/client                                  |
| 💾 Database | libSQL (Turso-compatible): **file SQLite lokal** saat dev → **Turso remote** di production (cukup set env)        |
| ☁️ Deploy   | Vercel (serverless) — lihat [DEPLOY.md](DEPLOY.md)                                                                |

> [!NOTE]
> **Kenapa SQLite/libSQL?** Biar `git clone → npm install → npm run dev` langsung jalan tanpa install Postgres. Sama satu `db.js`, production tinggal set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` di Vercel — gak perlu ganti kode! ✨

## 📁 Struktur Proyek

```
lifm/
├── backend/
│   └── src/
│       ├── index.js        # 🚪 Express routes + multi-user token
│       ├── db.js           # 💾 libSQL client + skema + migrasi
│       ├── seed.js         # 🌱 seed klub (global) + dunia per-karier
│       ├── data.js         # 📊 data klub, grup ACL, nama pemain
│       ├── game.js         # 🧢 skuad, XI otomatis, klasemen
│       ├── play.js         # ⚽ mesin pekan: babak 1 & 2, ACL knockout
│       ├── sim.js          # 🎙️ simulasi menit-per-menit + komentar
│       ├── matchEngine.js  # 📈 rating tim (xG)
│       └── postmatch.js    # 📉 moral, gol, kartu, cedera
├── frontend/
│   ├── public/img/         # 🖼️ logo game, background stadion, logo klub
│   └── src/
│       ├── App.jsx         # 🎬 router: Setup / Dash
│       ├── Setup.jsx       # ✍️ layar awal (pilih klub) + popup About
│       ├── Dash.jsx        # 🏠 layout tab utama
│       ├── Squad.jsx       # 🧢 taktik + lapangan interaktif
│       ├── Match.jsx       # ⚽ live match + HT subs
│       ├── Tables.jsx      # 🏆 klasemen + jadwal + berita
│       ├── Transfers.jsx   # 💸 bursa transfer
│       └── lib.js          # 🔑 token pengunjung + API client
└── README.md
```

## ⚖️ Lisensi & Kontribusi

<div align="center">

**MIT License** — bebas fork, modif, rilis. Gas! 🔥

[![GitHub](https://img.shields.io/badge/Fork_di_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/agunggema-debug/lifm)

_Open source by_ [Fainaya Services&Art](https://fainaya.netlify.app) 🎨

</div>

Kontribusi: **fork → branch → PR**. Jangan lupa ⭐ repo-nya kalau suka! 🙏
