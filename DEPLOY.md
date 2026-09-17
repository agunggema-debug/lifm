# Panduan Deploy Full Vercel (Frontend + Backend + Turso)

## 1. Setup Turso (database)

```powershell
# install CLI
winget install Turso.database.Turso
turso auth signup   # atau login

turso db create lifm
turso db show lifm --url           # -> libsql://lifm-xxx.turso.io
turso db tokens create lifm        # -> token rahasia
```

## 2. Deploy Backend ke Vercel (project #1)

```powershell
cd backend
vercel login
vercel link          # Root Directory = backend (kalau via dashboard)
vercel env add TURSO_DATABASE_URL production   # isi URL dari langkah 1
vercel env add TURSO_AUTH_TOKEN production     # isi token dari langkah 1
vercel --prod
```

Atau via dashboard: import repo GitHub, set **Root Directory** = `backend`.
Env wajib:

| Nama | Nilai |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://lifm-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | token dari `turso db tokens create` |

Catatan:
- `backend/vercel.json` sudah meng-rewrite HANYA `/api/*` ke `api/index.js` dengan `maxDuration: 60`.
  Route `/img/*` dan `/` lainnya di-static-serve oleh Vercel (folder `backend/public/`).
- Skema + seed (18 klub, 432 pemain, 153 fixture) **otomatis** dibuat saat request pertama.
- Buka `https://backend-xxx.vercel.app/api/health` dan `https://backend-xxx.vercel.app/img/clubs/persija.png` untuk verifikasi.

## 3. Deploy Frontend ke Vercel (project #2)

```powershell
cd frontend
vercel link
vercel env add VITE_API_URL production   # https://backend-xxx.vercel.app (backend di langkah 2)
vercel --prod
```

Via dashboard: import repo, Root Directory = `frontend`, framework Vite (otomatis terdeteksi).

Catatan:
- Logo klub & background diserve dari `frontend/public/img` (sudah dicopy dari `backend/src/public/img`), jadi tidak lewat serverless.
- Dev lokal tetap jalan tanpa Turso: `npm run dev` memakai file `backend/lifm.db`.

## 4. Sinkron dev DB → Turso (opsional)

```powershell
turso db shell lifm < backend\schema.sql   # jika ingin restore manual
```

Cara paling gampang: biarkan Vercel auto-seed. Untuk reset karier di prod: `POST https://backend-xxx.vercel.app/api/career/reset` (dengan header `X-Lifm-Token` — hanya menghapus karier milik token tersebut, tidak mengganggu pengunjung lain).
