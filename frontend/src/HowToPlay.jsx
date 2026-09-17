import React from "react";

// FAB (Floating Action Button) 🕹️ Cara Main — melayang di kanan bawah,
// saat diklik membuka popup panduan bermain. Dipakai di Setup & Dash.
export default function HowToPlay() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fab-howto" title="Cara Main" aria-label="Cara Main">
        <span className="text-2xl leading-none">🕹️</span>
        <span className="text-[9px] font-black leading-none tracking-wide">CARA MAIN</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/10 anim-pop relative max-h-[85vh] overflow-auto scroll-slim"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-slate-400 hover:text-white text-2xl leading-none"
              aria-label="Tutup"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-center">
              🕹️ Cara <span className="text-lime-400">Main</span>
            </h2>
            <p className="text-center text-xs text-slate-400 mt-1">6 langkah jadi manajer GOAT 🐐</p>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">1</span>
                <span>✍️ Isi <strong>nama manajer</strong> → pilih klub favoritmu ⭐ → <strong>GAS MULAI KARIR! 🚀</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">2</span>
                <span>🧢 Tab <strong>Skuad</strong> → atur formasi + mentalitas → klik 11 pemain untuk starting XI → <strong>SIMPAN TAKTIK 💾</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">3</span>
                <span>⚽ Tab <strong>Match</strong> → pilih kecepatan (Santai 🐢 / Normal 🚶 / Turbo 🚀) → <strong>▶️ PLAY MATCH</strong> → nikmati komentar play-by-play babak 1!</span>
              </li>
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">4</span>
                <span>⏸️ Saat <strong>HT</strong> muncul → ganti pemain (Keluar/Masuk) → <strong>▶️ LANJUTKAN BABAK KEDUA ⚔️</strong> — substitusi beneran memengaruhi rating &amp; xG babak 2!</span>
              </li>
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">5</span>
                <span>🏆 Tab <strong>Klasemen</strong> → cek posisi &amp; jadwal → 💸 Tab <strong>Transfer</strong> → beli bintang / jual buat cuan</span>
              </li>
              <li className="flex gap-3">
                <span className="chip chip-lime shrink-0">6</span>
                <span>🔁 Ulangi tiap pekan → gas juara liga 🏆 sambil taklukkan <strong>ACL Two</strong> sampai Final Pekan 21! 🌏</span>
              </li>
            </ol>
            <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs font-black text-lime-400 mb-1">🔥 TIPS PRO GAMER</div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li>Moral pemain turun saat kalah → rotasi skuad biar gak ada yang 😞</li>
                <li>Pemain cedera 🚑 gak bisa main → cek dulu sebelum kick-off</li>
                <li>Sub di HT itu game-changer: pemain segar vs lawan yang capek!</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-4 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-2xl py-3"
            >
              SIAP, GAS! 🚀
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
