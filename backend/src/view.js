// ==== Shaper payload API (satu sumber kebenaran / DRY) ====
// Sebelumnya pola `{ ...c, logo_url: c.logo ? '/img/clubs/' + c.logo : '' }` DI-*DUPLIKAT*
// di 7+ tempat di index.js dan mudah beda hasil kalau salah satu lupa diubah.
// Semua route sekarang memakai helper di sini supaya format respons konsisten.
//
// Referensi resmi: Express — Basic routing & response methods (res.json):
// https://expressjs.com/en/starter/basic-routing.html

// URL logo klub (aset statis frontend/backend: public/img/clubs/<file>).
export function clubLogoUrl(logo) {
  return logo ? '/img/clubs/' + logo : '';
}

// Tambahkan `logo_url` ke satu objek klub (aman untuk null/undefined).
export function withLogo(c) {
  return c ? { ...c, logo_url: clubLogoUrl(c.logo) } : c;
}

// Varian untuk array (klasemen, daftar klub, baris ACL).
export function withLogos(rows) {
  return (rows || []).map(withLogo);
}

// Satu baris papan Top Score (pemain): angka dijamin number, logo siap pakai.
export function topScorerRow(r) {
  return {
    name: r.name,
    pos: r.pos,
    club_id: Number(r.club_id),
    short_name: r.short_name,
    logo_url: clubLogoUrl(r.logo),
    goals: Number(r.goals || 0),
    assists: Number(r.assists || 0),
    managers: Number(r.managers || 1),
  };
}
