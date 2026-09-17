import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 18 klub Indonesia Super League 2026/27 (mapping 1:1 ke file logo di src/public/img/clubs/*.png).
// Catatan: user menulis "2026/2007" — diasumsikan maksudnya musim 2026/2027.
export const CLUBS = [
  { id: 1, name: 'Persija Jakarta', short_name: 'PERSIJA', city: 'Jakarta', logo: 'persija.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 86, budget: 45000000, reputation: 90 },
  { id: 2, name: 'Persib Bandung', short_name: 'PERSIB', city: 'Bandung', logo: 'persib.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 88, budget: 52000000, reputation: 92 },
  { id: 3, name: 'Persebaya Surabaya', short_name: 'PERSEBAYA', city: 'Surabaya', logo: 'persebaya.png', color_primary: '#0B6B3A', color_secondary: '#F5C518', strength: 85, budget: 40000000, reputation: 89 },
  { id: 4, name: 'Arema FC', short_name: 'AREMA', city: 'Malang', logo: 'arema.png', color_primary: '#1E3FAE', color_secondary: '#E11D2E', strength: 84, budget: 38000000, reputation: 87 },
  { id: 5, name: 'Bali United FC', short_name: 'BALI', city: 'Gianyar', logo: 'bali.png', color_primary: '#E11D2E', color_secondary: '#111111', strength: 86, budget: 46000000, reputation: 88 },
  { id: 6, name: 'Borneo FC Samarinda', short_name: 'BORNEO', city: 'Samarinda', logo: 'borneo.png', color_primary: '#E86A17', color_secondary: '#0B3B2E', strength: 87, budget: 48000000, reputation: 87 },
  { id: 7, name: 'PSM Makassar', short_name: 'PSM', city: 'Makassar', logo: 'psm.png', color_primary: '#C8102E', color_secondary: '#111111', strength: 85, budget: 39000000, reputation: 88 },
  { id: 8, name: 'Dewa United Banten FC', short_name: 'DEWA', city: 'Tangerang', logo: 'dewa.png', color_primary: '#111111', color_secondary: '#D4AF37', strength: 83, budget: 42000000, reputation: 78 },
  { id: 9, name: 'Madura United FC', short_name: 'MADURA', city: 'Bangkalan', logo: 'madura.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 82, budget: 30000000, reputation: 80 },
  { id: 10, name: 'Persita', short_name: 'PERSITA', city: 'Tangerang', logo: 'persita.png', color_primary: '#6C2EB5', color_secondary: '#FFFFFF', strength: 78, budget: 22000000, reputation: 74 },
  { id: 11, name: 'PSS Sleman', short_name: 'PSS', city: 'Sleman', logo: 'pss.png', color_primary: '#0B6B3A', color_secondary: '#F5C518', strength: 79, budget: 25000000, reputation: 77 },
  { id: 12, name: 'Persik Kediri', short_name: 'PERSIK', city: 'Kediri', logo: 'persik.png', color_primary: '#6C2EB5', color_secondary: '#F5C518', strength: 80, budget: 26000000, reputation: 78 },
  { id: 13, name: 'Bhayangkara Presisi Lampung FC', short_name: 'BHAYANGKARA', city: 'Lampung', logo: 'bhayangkara.png', color_primary: '#F5C518', color_secondary: '#1B3BB3', strength: 78, budget: 24000000, reputation: 76 },
  { id: 14, name: 'Persijap Jepara', short_name: 'PERSIJAP', city: 'Jepara', logo: 'persijap.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 77, budget: 23000000, reputation: 70 },
  { id: 15, name: 'PSIM Yogyakarta', short_name: 'PSIM', city: 'Yogyakarta', logo: 'psim.png', color_primary: '#0B6B3A', color_secondary: '#FFFFFF', strength: 77, budget: 23000000, reputation: 70 },
  { id: 16, name: 'Isenmulang Kalteng FC', short_name: 'ISENMULANG', city: 'Kalteng', logo: 'isenmulang.png', color_primary: '#0EA5E9', color_secondary: '#111111', strength: 76, budget: 20000000, reputation: 68 },
  { id: 17, name: 'Garudayaksa FC', short_name: 'GARUDA', city: 'Bekasi', logo: 'garudayaksa.png', color_primary: '#C8102E', color_secondary: '#F5C518', strength: 75, budget: 19000000, reputation: 72 },
    { id: 18, name: 'Java United FC', short_name: 'JAVA', city: 'Jawa', logo: 'java.png', color_primary: '#0B6B3A', color_secondary: '#F5C518', strength: 75, budget: 19000000, reputation: 68 },
  // 3 klub tetangga ACL Two Grup E 2026/27 (hanya bertanding di ACL Two, bukan liga)
  // Klub ACL tetangga (logo: seoul.png / melbourne.png / viettel.png di public/img/clubs)
  { id: 19, name: 'FC Seoul', short_name: 'SEoul', city: 'Seoul', logo: 'seoul.png', color_primary: '#C8102E', color_secondary: '#1E3A8A', strength: 85, budget: 45000000, reputation: 82 },
  { id: 20, name: 'Melbourne Victory', short_name: 'MELB', city: 'Melbourne', logo: 'melbourne.png', color_primary: '#1E3A8A', color_secondary: '#FFFFFF', strength: 83, budget: 42000000, reputation: 78 },
  { id: 21, name: 'Thé Công–Viettel', short_name: 'THC', city: 'Hanoi', logo: 'viettel.png', color_primary: '#FF6B00', color_secondary: '#002856', strength: 80, budget: 35000000, reputation: 74 },
  // ===== 28 klub ACL Two lainnya (id 22-49, 8 grup A-H). Logo tidak tersedia -> UI pakai fallback inisial. =====
  { id: 22, name: 'Gangwon FC', short_name: 'GANGWON', city: 'Chuncheon', logo: 'gangwon.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 83, budget: 40000000, reputation: 80 },
  { id: 23, name: 'Machida Zelvia', short_name: 'MACHIDA', city: 'Machida', logo: 'machida_zelvia.png', color_primary: '#00A650', color_secondary: '#111111', strength: 82, budget: 38000000, reputation: 78 },
  { id: 24, name: 'Shanghai Shenhua FC', short_name: 'SHENHUA', city: 'Shanghai', logo: 'shanghai_shenhua.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 84, budget: 44000000, reputation: 81 },
  { id: 25, name: 'Kitchee SC', short_name: 'KITCHEE', city: 'Hong Kong', logo: 'kitchee.png', color_primary: '#E31B23', color_secondary: '#111111', strength: 80, budget: 30000000, reputation: 74 },
  { id: 26, name: 'Adelaide United', short_name: 'ADELAIDE', city: 'Adelaide', logo: 'adelaide.png', color_primary: '#E4002B', color_secondary: '#0A2A66', strength: 82, budget: 36000000, reputation: 78 },
  { id: 27, name: 'Tai Po FC', short_name: 'TAIPO', city: 'Tai Po', logo: 'tai_po.png', color_primary: '#0B6B3A', color_secondary: '#F5C518', strength: 78, budget: 24000000, reputation: 70 },
  { id: 28, name: 'BG Pathum United FC', short_name: 'BGPUM', city: 'Pathum Thani', logo: 'bg-pathum.png', color_primary: '#7A1F3D', color_secondary: '#F5C518', strength: 83, budget: 40000000, reputation: 79 },
  { id: 29, name: 'Svay Rieng FC', short_name: 'SVAYRIENG', city: 'Svay Rieng', logo: 'svay_rieng.png', color_primary: '#0EA5E9', color_secondary: '#111111', strength: 78, budget: 24000000, reputation: 70 },
  { id: 30, name: 'East Bengal FC', short_name: 'EASTBENGAL', city: 'Kolkata', logo: 'east_bengal.png', color_primary: '#E31B23', color_secondary: '#F5C518', strength: 79, budget: 26000000, reputation: 72 },
  { id: 31, name: 'Kuching City FC', short_name: 'KUCHING', city: 'Kuching', logo: 'kuching_city.png', color_primary: '#F58220', color_secondary: '#111111', strength: 77, budget: 22000000, reputation: 69 },
  { id: 32, name: 'Lion City Sailors FC', short_name: 'LIONCITY', city: 'Singapore', logo: 'lion-city.png', color_primary: '#0B5394', color_secondary: '#FFD700', strength: 81, budget: 38000000, reputation: 74 },
  { id: 33, name: 'Tampines Rovers FC', short_name: 'TAMPINES', city: 'Singapore', logo: 'tampines_rovers_.webp', color_primary: '#F58220', color_secondary: '#0A3D91', strength: 78, budget: 24000000, reputation: 71 },
  { id: 34, name: 'Al-Jazira Club', short_name: 'JAZIRA', city: 'Abu Dhabi', logo: 'al-jazira.png', color_primary: '#6C2EB5', color_secondary: '#FFFFFF', strength: 83, budget: 42000000, reputation: 79 },
  { id: 35, name: 'Al-Wahda FC', short_name: 'WAHDA', city: 'Abu Dhabi', logo: 'al-wahda.png', color_primary: '#7A1F1F', color_secondary: '#FFFFFF', strength: 84, budget: 44000000, reputation: 80 },
  { id: 36, name: 'Al-Rayyan SC', short_name: 'RAYYAN', city: 'Al Rayyan', logo: 'al-rayyan.png', color_primary: '#8B0000', color_secondary: '#111111', strength: 83, budget: 42000000, reputation: 79 },
  { id: 37, name: 'Al-Taawoun FC', short_name: 'TAAWOUN', city: 'Buraidah', logo: 'aL_Taawoun.png', color_primary: '#0A6E4F', color_secondary: '#F5C518', strength: 82, budget: 38000000, reputation: 78 },
  { id: 38, name: 'Al-Shorta SC', short_name: 'SHORTA', city: 'Baghdad', logo: 'al-shorta.png', color_primary: '#0B6B3A', color_secondary: '#111111', strength: 84, budget: 40000000, reputation: 80 },
  { id: 39, name: 'Al-Faisaly SC', short_name: 'FAISALY', city: 'Amman', logo: 'al-faisaly.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 82, budget: 36000000, reputation: 78 },
  { id: 40, name: 'Al-Hussein SC', short_name: 'HUSSEIN', city: 'Irbid', logo: 'al-hussein.png', color_primary: '#0EA5E9', color_secondary: '#111111', strength: 80, budget: 30000000, reputation: 74 },
  { id: 41, name: 'Al-Khaldiya SC', short_name: 'KHALDIYA', city: 'Manama', logo: 'al-khaldiya.png', color_primary: '#B01E23', color_secondary: '#111111', strength: 81, budget: 32000000, reputation: 75 },
  { id: 42, name: 'Al-Muharraq SC', short_name: 'MUHARRAQ', city: 'Muharraq', logo: 'al-Muharraq.png', color_primary: '#C8102E', color_secondary: '#111111', strength: 82, budget: 34000000, reputation: 77 },
  { id: 43, name: 'Kuwait SC', short_name: 'KUWAIT', city: 'Kuwait City', logo: 'kuwait.png', color_primary: '#0A3D91', color_secondary: '#FFFFFF', strength: 80, budget: 32000000, reputation: 74 },
  { id: 44, name: 'Al-Nahda SC', short_name: 'NAHDA', city: 'Muscat', logo: 'al-nahda.webp', color_primary: '#B71C1C', color_secondary: '#FFFFFF', strength: 79, budget: 26000000, reputation: 72 },
  { id: 45, name: 'Al-Seeb Club', short_name: 'SEEB', city: 'Seeb', logo: 'al-seeb.png', color_primary: '#E4002B', color_secondary: '#111111', strength: 81, budget: 32000000, reputation: 75 },
  { id: 46, name: 'Arkadag FK', short_name: 'ARKADAG', city: 'Arkadag', logo: 'arkadag.png', color_primary: '#0EA5E9', color_secondary: '#111111', strength: 79, budget: 26000000, reputation: 71 },
  { id: 47, name: 'Nasaf Qarshi FC', short_name: 'NASAF', city: 'Qarshi', logo: 'nasaf-qarshi.png', color_primary: '#F7C600', color_secondary: '#0B3B8C', strength: 80, budget: 30000000, reputation: 74 },
  { id: 48, name: 'Gol Gohar Sirjan FC', short_name: 'GOLGOHAR', city: 'Sirjan', logo: 'golgohar_sirjan_logo.png', color_primary: '#B01E23', color_secondary: '#F5C518', strength: 82, budget: 36000000, reputation: 76 },
  { id: 49, name: 'Phnom Penh Crown FC', short_name: 'PPCROWN', city: 'Phnom Penh', logo: 'phnom_penh.png', color_primary: '#0A3D91', color_secondary: '#E31B23', strength: 77, budget: 22000000, reputation: 68 }
];

// ===== ACL Two 2026/27: 8 grup (A-H), masing-masing 4 tim. Persib (id 2) di Grup E. =====
// 2 terbaik tiap grup melaju ke babak gugur: 16 Besar -> Perempat Final -> Semifinal -> Final.
export const ACL_GROUPS = [
  { name: 'A', ids: [22, 23, 24, 25] },
  { name: 'B', ids: [26, 27, 28, 29] },
  { name: 'C', ids: [30, 31, 32, 33] },
  { name: 'D', ids: [34, 35, 36, 37] },
  { name: 'E', ids: [2, 19, 20, 21] },
  { name: 'F', ids: [38, 39, 40, 41] },
  { name: 'G', ids: [42, 43, 44, 45] },
  { name: 'H', ids: [46, 47, 48, 49] }
];

export function logoMissing() {
  const dir = path.join(__dirname, 'public', 'img', 'clubs');
  return CLUBS.filter((c) => !fs.existsSync(path.join(dir, c.logo))).map((c) => c.logo);
}


export const FIRST = ['Rizky','Andi','Bagus','Dimas','Fajar','Ilham','Yoga','Egi','Raka','Witan','Egy','Marcell','Septian','Alfian','Dedi','Fikri','Galih','Hendra','Irfan','Joko','Kurnia','Lutfi','Made','Nanda','Okta','Pratama','Qori','Rendy','Sandi','Tegar','Umar','Vicky','Wahyu','Yudi','Zulham','Ardi','Bima','Candra','Doni','Eko'];
export const LAST = ['Pratama','Saputra','Wijaya','Santoso','Nugroho','Ramadhan','Kurniawan','Setiawan','Hidayat','Maulana','Fauzi','Rahmat','Syahputra','Gunawan','Firmansyah','Alamsyah','Putra','Siregar','Nasution','Lestaluhu','Kambera','Solossa','Wanggai','Rumakiek','Klok','Arhan','Asnawi','Febriansyah','Sayuri','Pluim','Lilipaly','Spasojevic','Ciro','David','Brass','Moreira','Costa','Silva','Santos','Oliveira'];
export const FOREIGN = ['Carlos Eduardo','Matheus Silva','Lucas Costa','Rafael Oliveira','Diego Santos','Gustavo Almeida','Bruno Moreira','Tiago Alves','Pedro Costa','Anderson Silva','Alex Martins','Joao Pedro','Marcel Silva','Igor Costa','Ramon Bueno','Caio Ruan','David Lopez','Marco Reusanda','Kenji Sato','Moussa Diallo'];

// Skuad inti PERKIRAAN Indonesia Super League 2026/27 (berbasis skuad musim 2025/26).
// f:1 = pemain asing. Bursa transfer berjalan terus — koreksi manual di sini bila ada yang pindah.
// Klub 16-18 (promosi/baru, data skuad minim) + sisa slot tiap klub diisi generator nama lokal.
const SQUAD_CORES_LEGACY = { // (tidak dipakai — digantikan roster asli ileague.id, lihat bawah)
  1: [
    { n: 'Andritany Ardhiyasa', p: 'GK', f: 0 }, { n: 'Rizky Ridho', p: 'DF', f: 0 },
    { n: 'Ondrej Kudela', p: 'DF', f: 1 }, { n: 'Muhammad Ferarri', p: 'DF', f: 0 },
    { n: 'Firza Andika', p: 'DF', f: 0 }, { n: 'Ilham Rio Fahmi', p: 'DF', f: 0 },
    { n: 'Maciej Gajos', p: 'MF', f: 1 }, { n: 'Hanif Sjahbandi', p: 'MF', f: 0 },
    { n: 'Rayhan Hannan', p: 'MF', f: 0 }, { n: 'Witan Sulaeman', p: 'MF', f: 0 },
    { n: 'Ryo Matsumura', p: 'FW', f: 1 }, { n: 'Gustavo Almeida', p: 'FW', f: 1 }
  ],
  2: [
    { n: 'Teja Paku Alam', p: 'GK', f: 0 }, { n: 'Nick Kuipers', p: 'DF', f: 1 },
    { n: 'Gustavo Franca', p: 'DF', f: 1 }, { n: 'Edo Febriansah', p: 'DF', f: 0 },
    { n: 'Henhen Herdiana', p: 'DF', f: 0 }, { n: 'Marc Klok', p: 'MF', f: 0 },
    { n: 'Beckham Putra', p: 'MF', f: 0 }, { n: 'Tyronne del Pino', p: 'MF', f: 1 },
    { n: 'Adam Alis', p: 'MF', f: 0 }, { n: 'David da Silva', p: 'FW', f: 1 },
    { n: 'Dimas Drajad', p: 'FW', f: 0 }, { n: 'Ryan Kurnia', p: 'FW', f: 0 }
  ],
  3: [
    { n: 'Ernando Ari', p: 'GK', f: 0 }, { n: 'Andhika Ramadhani', p: 'GK', f: 0 },
    { n: 'Slavko Damjanovic', p: 'DF', f: 1 }, { n: 'Kadek Raditya', p: 'DF', f: 0 },
    { n: 'Arief Catur', p: 'DF', f: 0 }, { n: 'Mikael Tata', p: 'DF', f: 0 },
    { n: 'Francisco Rivera', p: 'MF', f: 1 }, { n: 'Muhammad Hidayat', p: 'MF', f: 0 },
    { n: 'Toni Firmansyah', p: 'MF', f: 0 }, { n: 'Bruno Moreira', p: 'FW', f: 1 },
    { n: 'Flavio Silva', p: 'FW', f: 1 }, { n: 'Malik Risaldi', p: 'FW', f: 0 }
  ],
  4: [
    { n: 'Lucas Frigeri', p: 'GK', f: 1 }, { n: 'Anwar Rifai', p: 'GK', f: 0 },
    { n: 'Thales Lira', p: 'DF', f: 1 }, { n: 'Johan Alfarizi', p: 'DF', f: 0 },
    { n: 'Achmad Maulana', p: 'DF', f: 0 }, { n: 'Arkhan Fikri', p: 'MF', f: 0 },
    { n: 'Jayus Hariono', p: 'MF', f: 0 }, { n: 'Wiliam Marcilio', p: 'MF', f: 1 },
    { n: 'Dalberto', p: 'FW', f: 1 }, { n: 'Charles Lokolingoy', p: 'FW', f: 1 },
    { n: 'Dedik Setiawan', p: 'FW', f: 0 }
  ],
  5: [
    { n: 'Adilson Maringa', p: 'GK', f: 1 }, { n: 'Kadek Arel', p: 'DF', f: 0 },
    { n: 'Brandon Wilson', p: 'DF', f: 1 }, { n: 'Ricky Fajrin', p: 'DF', f: 0 },
    { n: 'Andhika Wijaya', p: 'DF', f: 0 }, { n: 'Kadek Agung', p: 'MF', f: 0 },
    { n: 'Made Tito', p: 'MF', f: 0 }, { n: 'Rahmat Arjuna', p: 'MF', f: 0 },
    { n: 'Privat Mbarga', p: 'FW', f: 1 }, { n: 'Boris Kopitovic', p: 'FW', f: 1 },
    { n: 'Irfan Jaya', p: 'FW', f: 0 }
  ],
  6: [
    { n: 'Nadeo Argawinata', p: 'GK', f: 0 }, { n: 'Christophe Nduwarugira', p: 'DF', f: 1 },
    { n: 'Leo Lelis', p: 'DF', f: 1 }, { n: 'Fajar Fathurahman', p: 'DF', f: 0 },
    { n: 'Hendro Siswanto', p: 'MF', f: 0 }, { n: 'Stefano Lilipaly', p: 'MF', f: 0 },
    { n: 'Berguinho', p: 'MF', f: 1 }, { n: 'Kei Hirose', p: 'MF', f: 1 },
    { n: 'Matheus Pato', p: 'FW', f: 1 }, { n: 'Mariano Peralta', p: 'FW', f: 1 }
  ],
  7: [
    { n: 'Yoo Jae-hoon', p: 'GK', f: 1 }, { n: 'Adi Satryo', p: 'GK', f: 0 },
    { n: 'Risto Mitrevski', p: 'DF', f: 1 }, { n: 'Wahyu Prasetyo', p: 'DF', f: 0 },
    { n: 'Gilang Angga', p: 'DF', f: 0 }, { n: 'Safrudin Tahar', p: 'DF', f: 0 },
    { n: 'Alta Ballah', p: 'MF', f: 0 }, { n: 'Zein Alhadad', p: 'MF', f: 0 },
    { n: 'Marcos Morais', p: 'MF', f: 1 }, { n: 'Diaz Hendrawan', p: 'MF', f: 0 },
    { n: 'Alex Martins', p: 'FW', f: 1 }, { n: 'Arief Budiyono', p: 'FW', f: 0 }
  ],
  8: [
    { n: 'Wahyu Tri Nugroho', p: 'GK', f: 0 }, { n: 'Egi Sutrisna', p: 'GK', f: 0 },
    { n: 'Angelo Meneses', p: 'DF', f: 1 }, { n: 'Nurhidayat Haji Haris', p: 'DF', f: 0 },
    { n: 'Ferre Murari', p: 'DF', f: 0 }, { n: 'Firman Juliansyah', p: 'MF', f: 0 },
    { n: 'Alexis Messidoro', p: 'MF', f: 1 }, { n: 'Messi Wirayudha', p: 'MF', f: 0 },
    { n: 'Altalariq Ballah', p: 'MF', f: 0 }, { n: 'Egy Maulana Vikri', p: 'FW', f: 0 },
    { n: 'Tae-min Kim', p: 'FW', f: 1 }, { n: 'Jaja', p: 'FW', f: 1 }
  ],
  9: [
    { n: 'Miswar Saputra', p: 'GK', f: 0 }, { n: 'Adhitya Harlan', p: 'GK', f: 0 },
    { n: 'Pedro Monteiro', p: 'DF', f: 1 }, { n: 'Fachruddin Aryanto', p: 'DF', f: 0 },
    { n: 'Ibrahim Sanjaya', p: 'DF', f: 0 }, { n: 'Krisna Bayu Otto', p: 'MF', f: 0 },
    { n: 'Rizky Febriansyah', p: 'MF', f: 0 }, { n: 'Kerim Palic', p: 'MF', f: 1 },
    { n: 'Lulinha', p: 'FW', f: 1 }, { n: 'Maxuel Silva', p: 'FW', f: 1 },
    { n: 'Beto Goncalves', p: 'FW', f: 0 }
  ],
  10: [
    { n: 'Igor Rodrigues', p: 'GK', f: 1 }, { n: 'Rendy Oscario', p: 'GK', f: 0 },
    { n: 'Tamirlan Kozubaev', p: 'DF', f: 1 }, { n: 'Muhammad Toha', p: 'DF', f: 0 },
    { n: 'Javlon Guseynov', p: 'DF', f: 1 }, { n: 'Asep Berlian', p: 'MF', f: 0 },
    { n: 'Bahtiar Bahtiar', p: 'MF', f: 0 }, { n: 'Septian Satria Bagaskara', p: 'MF', f: 0 },
    { n: 'Edo Febriansyah', p: 'MF', f: 0 }, { n: 'Irsyad Maulana', p: 'FW', f: 0 },
    { n: 'Jasmin Mecinovic', p: 'FW', f: 1 }, { n: 'Ahmad Nur Hardianto', p: 'FW', f: 0 }
  ],
  11: [
    { n: 'Eky Taufik', p: 'DF', f: 0 }, { n: 'Abdul Rahman', p: 'DF', f: 0 },
    { n: 'Syaiful Ramadhan', p: 'DF', f: 0 }, { n: 'Fadil Sausu', p: 'MF', f: 0 },
    { n: 'Raven Romero', p: 'MF', f: 1 }, { n: 'Alex Tanque', p: 'FW', f: 1 },
    { n: 'Riyatno Abiyoso', p: 'FW', f: 0 }
  ],
  12: [
    { n: 'Leo Navacchio', p: 'GK', f: 1 }, { n: 'Fasya', p: 'GK', f: 0 },
    { n: 'Anderson Nascimento', p: 'DF', f: 1 }, { n: 'Al Hamra Hehanussa', p: 'DF', f: 0 },
    { n: 'Yusuf Meilana', p: 'DF', f: 0 }, { n: 'Rohit Chand', p: 'MF', f: 1 },
    { n: 'Ousmane Fane', p: 'MF', f: 1 }, { n: 'Rizky Eka Pratama', p: 'MF', f: 0 },
    { n: 'Miftahul Hamdi', p: 'MF', f: 0 }, { n: 'Hugo Samir', p: 'FW', f: 0 },
    { n: 'Aulia Ramadhan', p: 'FW', f: 0 }
  ],
  13: [
    { n: 'Awan Setho', p: 'GK', f: 0 }, { n: 'Putu Gede', p: 'DF', f: 0 },
    { n: 'Luizao', p: 'DF', f: 1 }, { n: 'Arif Satria', p: 'DF', f: 0 },
    { n: 'Sirojiddin Kuziev', p: 'MF', f: 1 }, { n: 'Hargianto', p: 'MF', f: 0 },
    { n: 'Dendi Sulistyawan', p: 'FW', f: 0 }, { n: 'Ilyas Alhafiz', p: 'FW', f: 0 }
  ],
  14: [
    { n: 'Rian Ardiansyah', p: 'GK', f: 0 }, { n: 'Fikri Anma', p: 'DF', f: 0 },
    { n: 'Niko Kristanto', p: 'DF', f: 0 }, { n: 'Faris Adit', p: 'MF', f: 0 },
    { n: 'Rafael Struick', p: 'FW', f: 0 }
  ],
  15: [
    { n: 'Harlan Suardi', p: 'GK', f: 0 }, { n: 'Sunni Hizbullah', p: 'DF', f: 0 },
    { n: 'Raka Cahyana', p: 'DF', f: 0 }, { n: 'Yusuf Aditama', p: 'MF', f: 0 },
    { n: 'Ze Valente', p: 'MF', f: 1 }, { n: 'Rafinha', p: 'FW', f: 1 }
  ],
  16: [
    { n: 'Samuel Christianson', p: 'GK', f: 1 }, { n: 'Panggih Prio', p: 'GK', f: 0 },
    { n: 'Rizky Dwi Febrianto', p: 'DF', f: 0 }, { n: 'Alex Kamuru', p: 'DF', f: 0 },
    { n: 'Mochammad Al Amin', p: 'MF', f: 0 }, { n: 'Evan Soumilena', p: 'FW', f: 0 }
  ],
  17: [
    { n: 'Rido Ramsani', p: 'GK', f: 0 }, { n: 'Dimas Fani', p: 'DF', f: 0 },
    { n: 'Yudha Alkanza', p: 'DF', f: 0 }, { n: 'Andre Oktaviansyah', p: 'MF', f: 0 },
    { n: 'Jack Brown', p: 'FW', f: 0 }
  ],
  18: [
    { n: 'Dimas Maulana', p: 'GK', f: 0 }, { n: 'Bagus Nirwanto', p: 'DF', f: 0 },
    { n: 'Rensy Saputra', p: 'DF', f: 0 }, { n: 'Ahmad Bustomi', p: 'MF', f: 0 },
    { n: 'Hari Habrian', p: 'MF', f: 0 }, { n: 'Dwi Andika', p: 'FW', f: 0 }
  ]
};

// ===== Roster asli 2026/27 dari https://ileague.id/clubs/index/BRI_SUPER_LEAGUE_2026-27 =====
// 432 pemain (24/klub), digenerate oleh gen_rosters.mjs ke backend/src/rosters.json.
// Catatan: situs tidak menampilkan posisi & kewarganegaraan secara publik
// (baris "Posisi"/"Negara" di-comment di HTML) -> posisi dibagi deterministik
// GK2/DF8/MF8/FW6 dan flag asing memakai heuristik pola nama.
export const SQUAD_CORES = JSON.parse(fs.readFileSync(path.join(__dirname, 'rosters.json'), 'utf8'));

// ===== ACL Two 2026/27 Grup E =====
// Grup E (East Region) — 4 tim: Persib, FC Seoul, Melbourne Victory, Thé Công–Viettel
// Setiap tim bertanding 6 kali (3 lawan x home+away) = 12 fixture total.
// Matchday liga: 1-17. Matchday ACL Two: 18-23 (2 laga per pekan).
export const ACL_CLUB_IDS = [2, 19, 20, 21];
export const ACL_CLUB_IDS_SET = new Set(ACL_CLUB_IDS);
export const ACL_TOTAL_MATCHDAYS = 6;

// Nama pemain asing (digenerate secara acak untuk klub ACL Two)
export const ACL_FOREIGN_NAMES = {
  19: ['Son Heung-min','Hwang Inbeom','Cho Sumin','Jung Woo-chan','Kim Min-jae','Lee Kang-in','Kim Young-gwon','Gu Sung-yun','Jung Tae-woong','Kim Hyun-jun','Oh Hyeon-gyu','Lee Keun-ho','Lee Yong','Joo Su-hun','Yoon Jong-gyu','Park Sung-ho','Kim Hyun','Choi Minhwan','Lee Geun-ho','Park Joo-ho'],
    20: ['Bruno Fornaroli','Luca Simeone','Riley McGough','Mitch Nichols','Andrew Redmayne','Scott Gallow','James Donachie','Benny Ibini','Cameron Devlin','Nathaniel Atkinson','Milan Šimčák','Daniel Pinicio','Alessandro Lazov','Valère Germain','Socceroos'],
  21: ['Nguyễn Quang Hải','Đoàn Văn Đức','Phạm Huy Phong','Lê Công Vinh','Nguyễn Hồng Sơn','Trần Văn Đạt','Phùng Sài','Lương Chữ','Nguyễn Công Phượng','Vũ Văn Hoành','Trần Bảo Vĩnh','Lê Huỳnh Đức','Nguyễn Bảo Nam','Phạm Văn Tài','Đỗ Duy Cường','Nguyễn Hữu Thắng']
};

// Daftar nama lokal untuk generasi acak pemain klub ACL Two
export const ACL_LOCAL_NAMES = {
  19: ['Kim','Lee','Park','Choi','Jung','Hwang','Son','Gu','Oh','Yoon','Joo','Na','Kang','Min','Woo','Chan'],
  20: ['Alessandro','Bruno','Mitch','Scott','Andrew','James','Benny','Cameron','Nathaniel','Milan','Daniel','Valère','Luca','Riley'],
    21: ['Nguyễn','Trần','Phạm','Lê','Phùng','Lương','Đoàn','Vũ','Đỗ','Bảo','Huỳnh','Hải','Đức','Sơn','Phong','Tài','Cường','Nam','Hoành','Vĩnh','Sài','Chữ','Khang','Long']
};
