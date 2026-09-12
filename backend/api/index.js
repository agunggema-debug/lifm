// Entry serverless untuk Vercel (@vercel/node)
// Semua route /api/* di-rewrite ke fungsi ini (lihat backend/vercel.json)
import app from '../src/index.js';

export default app;