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
  { id: 49, name: 'Phnom Penh Crown FC', short_name: 'PPCROWN', city: 'Phnom Penh', logo: 'phnom_penh.png', color_primary: '#0A3D91', color_secondary: '#E31B23', strength: 77, budget: 22000000, reputation: 68 },
  // ===== 31 klub ACL Elite 2026/27 (id 50-80) =====
  // Peserta league phase ACL Elite 2026/27 (16 Zona Barat + 16 Zona Timur) sesuai undian AFC —
  // detail & jadwalnya di backend/src/acl_elite.json (dibuat oleh fetch_acl_elite.mjs).
  // Slot rute juara ACL Two Zona Timur dipegang Persib (id 2) — menggantikan Gamba Osaka.
  // ---- Zona Barat (16) ----
  { id: 50, name: 'Al-Ahli Saudi FC', short_name: 'AL-AHLI', city: 'Jeddah', logo: 'al_ahli.png', color_primary: '#0B6B3A', color_secondary: '#FFFFFF', strength: 88, budget: 80000000, reputation: 90 },
  { id: 51, name: 'Al-Nassr FC', short_name: 'AL-NASSR', city: 'Riyadh', logo: 'al_nassr.png', color_primary: '#F5C518', color_secondary: '#1B3BB3', strength: 89, budget: 85000000, reputation: 92 },
  { id: 52, name: 'Al-Hilal SFC', short_name: 'AL-HILAL', city: 'Riyadh', logo: 'al_hilal.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 92, budget: 95000000, reputation: 95 },
  { id: 53, name: 'Al-Qadsiah FC', short_name: 'AL-QADSIAH', city: 'Khobar', logo: 'al_qadsiah.png', color_primary: '#E4002B', color_secondary: '#111111', strength: 82, budget: 60000000, reputation: 82 },
  { id: 54, name: 'Al Ain FC', short_name: 'AL-AIN', city: 'Al Ain', logo: 'al_ain.png', color_primary: '#6C2EB5', color_secondary: '#FFFFFF', strength: 85, budget: 55000000, reputation: 86 },
  { id: 55, name: 'Shabab Al Ahli Club', short_name: 'SHABAB', city: 'Dubai', logo: 'shabab_al_ahli.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 83, budget: 45000000, reputation: 82 },
  { id: 56, name: 'Al Wasl FC', short_name: 'AL-WASL', city: 'Dubai', logo: 'al_wasl.png', color_primary: '#F5C518', color_secondary: '#111111', strength: 82, budget: 42000000, reputation: 80 },
  { id: 57, name: 'Al Sadd SC', short_name: 'AL-SADD', city: 'Doha', logo: 'al_sadd.png', color_primary: '#111111', color_secondary: '#FFFFFF', strength: 84, budget: 50000000, reputation: 85 },
  { id: 58, name: 'Al-Gharafa SC', short_name: 'AL-GHARAFA', city: 'Doha', logo: 'al_gharafa.png', color_primary: '#0A3D91', color_secondary: '#F5C518', strength: 82, budget: 44000000, reputation: 81 },
  { id: 59, name: 'Al-Shamal SC', short_name: 'AL-SHAMAL', city: 'Madinat ash Shamal', logo: 'al_shamal.png', color_primary: '#0EA5E9', color_secondary: '#FFFFFF', strength: 78, budget: 30000000, reputation: 74 },
  { id: 60, name: 'Esteghlal FC', short_name: 'ESTEGHLAL', city: 'Tehran', logo: 'esteghlal.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 82, budget: 35000000, reputation: 84 },
  { id: 61, name: 'Tractor SC', short_name: 'TRACTOR', city: 'Tabriz', logo: 'tractor.png', color_primary: '#E4002B', color_secondary: '#FFFFFF', strength: 81, budget: 34000000, reputation: 82 },
  { id: 62, name: 'FC Neftchi Fergana', short_name: 'NEFtCHI', city: 'Fergana', logo: 'neftchi_fergana.png', color_primary: '#0B6B3A', color_secondary: '#FFFFFF', strength: 78, budget: 28000000, reputation: 76 },
  { id: 63, name: 'Al-Quwa Al-Jawiya', short_name: 'QUWA', city: 'Baghdad', logo: 'al_quwa_al_jawiya.png', color_primary: '#0A3D91', color_secondary: '#FFFFFF', strength: 80, budget: 30000000, reputation: 79 },
  { id: 64, name: 'Pakhtakor FC', short_name: 'PAKHTAKOR', city: 'Tashkent', logo: 'pakhtakor.png', color_primary: '#1B3BB3', color_secondary: '#FFFFFF', strength: 80, budget: 32000000, reputation: 80 },
  { id: 65, name: 'Al-Ittihad Club', short_name: 'AL-ITTIHAD', city: 'Jeddah', logo: 'al_ittihad.png', color_primary: '#F5C518', color_secondary: '#111111', strength: 87, budget: 75000000, reputation: 89 },
  // ---- Zona Timur (15 klub nyata + Persib id 2) ----
  { id: 66, name: 'Kashima Antlers', short_name: 'KASHIMA', city: 'Kashima', logo: 'kashima_antlers.png', color_primary: '#8B1A1A', color_secondary: '#FFFFFF', strength: 85, budget: 50000000, reputation: 86 },
  { id: 67, name: 'Vissel Kobe', short_name: 'VISSEL', city: 'Kobe', logo: 'vissel_kobe.png', color_primary: '#E4002B', color_secondary: '#111111', strength: 85, budget: 52000000, reputation: 85 },
  { id: 68, name: 'Kashiwa Reysol', short_name: 'REYSOL', city: 'Kashiwa', logo: 'kashiwa_reysol.png', color_primary: '#F5C518', color_secondary: '#111111', strength: 83, budget: 42000000, reputation: 81 },
  { id: 69, name: 'Kyoto Sanga FC', short_name: 'KYOTO', city: 'Kyoto', logo: 'kyoto_sanga.png', color_primary: '#6C2EB5', color_secondary: '#FFFFFF', strength: 80, budget: 35000000, reputation: 77 },
  { id: 70, name: 'Jeonbuk Hyundai Motors', short_name: 'JEONBUK', city: 'Jeonju', logo: 'jeonbuk.png', color_primary: '#0B6B3A', color_secondary: '#FFFFFF', strength: 85, budget: 48000000, reputation: 86 },
  { id: 71, name: 'Daejeon Hana Citizen', short_name: 'DAEJEON', city: 'Daejeon', logo: 'daejeon_hana.png', color_primary: '#6C2EB5', color_secondary: '#FFFFFF', strength: 82, budget: 40000000, reputation: 80 },
  { id: 72, name: 'Pohang Steelers', short_name: 'POHANG', city: 'Pohang', logo: 'pohang_steelers.png', color_primary: '#C8102E', color_secondary: '#111111', strength: 83, budget: 42000000, reputation: 82 },
  { id: 73, name: 'Buriram United FC', short_name: 'BURIRAM', city: 'Buriram', logo: 'buriram_united.png', color_primary: '#0A3D91', color_secondary: '#F5C518', strength: 83, budget: 45000000, reputation: 84 },
  { id: 74, name: 'Port FC', short_name: 'PORT', city: 'Bangkok', logo: 'port_fc.png', color_primary: '#0A3D91', color_secondary: '#F58220', strength: 80, budget: 32000000, reputation: 78 },
  { id: 75, name: 'Ratchaburi FC', short_name: 'RATCHABURI', city: 'Ratchaburi', logo: 'ratchaburi.png', color_primary: '#E4002B', color_secondary: '#FFFFFF', strength: 78, budget: 26000000, reputation: 74 },
  { id: 76, name: 'Shanghai Port FC', short_name: 'SHANGHAI', city: 'Shanghai', logo: 'shanghai_port.png', color_primary: '#C8102E', color_secondary: '#FFFFFF', strength: 84, budget: 55000000, reputation: 85 },
  { id: 77, name: 'Beijing Guoan FC', short_name: 'GUOAN', city: 'Beijing', logo: 'beijing_guoan.png', color_primary: '#0B6B3A', color_secondary: '#FFFFFF', strength: 83, budget: 50000000, reputation: 84 },
  { id: 78, name: 'Newcastle Jets FC', short_name: 'NEWCASTLE', city: 'Newcastle', logo: 'newcastle_jets.png', color_primary: '#C89B3C', color_secondary: '#0A2240', strength: 78, budget: 24000000, reputation: 76 },
  { id: 79, name: "Johor Darul Ta'zim FC", short_name: 'JDT', city: 'Johor Bahru', logo: 'johor_darul_tazim.png', color_primary: '#0A3D91', color_secondary: '#E4002B', strength: 82, budget: 45000000, reputation: 84 },
  { id: 80, name: 'Công An Hà Nội FC', short_name: 'CAHN', city: 'Hanoi', logo: 'cong_an_hanoi.png', color_primary: '#C8102E', color_secondary: '#0A3D91', strength: 79, budget: 28000000, reputation: 76 }
];

// ===== Pool ACL (32 klub): 16 Zona Timur (AFC East) + 16 Zona Barat (AFC West) =====
// ACL Two: 8 grup (A-H) x 4 tim, home & away = 6 laga/klub (aturan AFC).
// Zona dipakai untuk undian babak gugur: tim Zona Timur vs Timur (dan Barat vs Barat)
// sampai Semifinal, baru bertemu lawan zona lain di Final -- persis format AFC.
//   Timur : grup A, B, C, E (+ Persib id 2).  Barat: grup D, F, G, H.
export const ACL_GROUPS = [
  { name: 'A', zone: 'east', ids: [22, 23, 24, 25] },
  { name: 'B', zone: 'east', ids: [26, 27, 28, 29] },
  { name: 'C', zone: 'east', ids: [30, 31, 32, 33] },
  { name: 'D', zone: 'west', ids: [34, 35, 36, 37] },
  { name: 'E', zone: 'east', ids: [2, 19, 20, 21] },
  { name: 'F', zone: 'west', ids: [38, 39, 40, 41] },
  { name: 'G', zone: 'west', ids: [42, 43, 44, 45] },
  { name: 'H', zone: 'west', ids: [46, 47, 48, 49] }
];

// ===== ACL ELITE 2026/27 (aturan AFC): 32 klub = 16 Zona Timur + 16 Zona Barat =====
// League phase 8 laga/klub (4 kandang, 4 tandang) memakai undian & jadwal ASLI AFC 2026/27:
// 16 klub/zona dibagi 4 pot x 4, tiap klub main 2 laga vs tiap pot => 8 laga, 8 lawan berbeda.
// Top 8 tiap zona -> 16 Besar (1 leg, intra-zona) -> Perempat Final (Timur vs Barat) -> SF -> Final.
// Slot "juara ACL Two" Zona Timur dipakai Persib (id 2) — di dunia nyata slot itu milik Gamba Osaka.
// Sumber: backend/src/acl_elite.json (dibuat oleh fetch_acl_elite.mjs dari undian resmi AFC).
export const ACL_ELITE = JSON.parse(fs.readFileSync(path.join(__dirname, 'acl_elite.json'), 'utf8'));
// Urutan tampilan klasemen: Zona Timur dulu (ada Persib) baru Zona Barat.
export const ACL_ELITE_ZONES = ['east', 'west'].map((key) => ({
  name: ACL_ELITE.zones[key].name,
  label: ACL_ELITE.zones[key].label,
  zone: key,
  ids: ACL_ELITE.zones[key].ids
}));
export const ACL_ELITE_CLUB_IDS = ACL_ELITE_ZONES.reduce((a, z) => a.concat(z.ids), []);
// Jadwal league phase per zona & ronde: { east: { '1': [[home,away], ...], ... }, west: {...} }
export const ACL_ELITE_FIXTURES = ACL_ELITE.fixtures;

// 2 zona ACL Elite (Timur & Barat) untuk klasemen & undian babak gugur.
export function aclEliteZones() {
  return ACL_ELITE_ZONES;
}

// Bagian klasemen ACL sesuai tier karier: 8 grup (ACL Two) atau 2 zona (ACL Elite).
export function aclSections(tier) {
  if (tier === 'elite') return aclEliteZones();
  return ACL_GROUPS.map((g) => ({ name: g.name, label: 'Grup ' + g.name, zone: g.zone, ids: g.ids }));
}

// ===== Kalender musim (mengikuti aturan AFC) =====
// Liga Indonesia: 18 klub home & away -> 34 pertandingan/klub (306 laga) = 34 pekan.
export const LEAGUE_MATCHDAYS = 34;
export const LEAGUE_ROUNDS = 17; // 17 ronde x 2 leg (home & away)
// ACL Two: fase grup 6 laga (pekan 4,8,12,16,20,24) + KO 2 leg (Pekan 26-32) + Final Pekan 34.
export const ACL_TWO_GROUP_MD = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };
export const ACL_TWO_KO = [
  { md: 26, stage: 'r16', leg: 1 }, { md: 28, stage: 'r16', leg: 2 },
  { md: 29, stage: 'qf', leg: 1 }, { md: 30, stage: 'qf', leg: 2 },
  { md: 31, stage: 'sf', leg: 1 }, { md: 32, stage: 'sf', leg: 2 },
  { md: 34, stage: 'final', leg: 1 }
];
// ACL Elite: league phase 8 laga (pekan 4,8,12,16,20,24,26,28) + KO 1 leg (Pekan 29,31,32,34).
// Catatan: di ACL Elite 2026/27 asli, 16 Besar Zona Timur dimainkan 2 leg (Zona Barat 1 leg);
// LIFM menyederhanakannya jadi 1 leg untuk semua babak (konsisten dengan format game).
export const ACL_ELITE_GROUP_MD = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 26, 8: 28 };
export const ACL_ELITE_KO = [
  { md: 29, stage: 'r16', leg: 1 },
  { md: 31, stage: 'qf', leg: 1 },
  { md: 32, stage: 'sf', leg: 1 },
  { md: 34, stage: 'final', leg: 1 }
];
export function aclTierKey(save) { return save && save.acl_tier === 'elite' ? 'elite' : 'two'; }
export function aclGroupMdOf(tier) { return tier === 'elite' ? ACL_ELITE_GROUP_MD : ACL_TWO_GROUP_MD; }
export function aclKoListOf(tier) { return tier === 'elite' ? ACL_ELITE_KO : ACL_TWO_KO; }
// Pekan fase grup/league phase (dipakai untuk hitung klasemen ACL & label UI).
export function aclGroupMdsOf(tier) { return Object.values(aclGroupMdOf(tier)); }
// Konfigurasi babak gugur untuk pekan tertentu (null jika bukan pekan KO).
export function aclKoStageOf(tier, md) { const c = aclKoListOf(tier).find((x) => x.md === Number(md)); return c || null; }
// Nama babak untuk UI/log.
export function aclStageLabel(tier, md) {
  const c = aclKoStageOf(tier, md);
  if (!c) return null;
  const base = c.stage === 'r16' ? '16 Besar' : c.stage === 'qf' ? 'Perempat Final' : c.stage === 'sf' ? 'Semifinal' : 'Final';
  return c.leg > 1 ? base + ' • Leg ' + c.leg : base;
}

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

// ===== Klub peserta ACL (non-liga) =====
// ACL Two  : 32 klub (grup A-H, id 2 + 19-49) — fase grup 6 laga/klub (home & away).
// ACL Elite: 32 klub (2 zona, id 50-80) — league phase 8 laga/klub (ACL_ELITE_CLUB_IDS).
// Semua hanya bertanding di ACL, tidak masuk klasemen Liga Indonesia.
export const ACL_CLUB_IDS = Array.from(new Set([
  ...ACL_GROUPS.reduce((a, g) => a.concat(g.ids), []),
  ...ACL_ELITE_CLUB_IDS
]));
export const ACL_CLUB_IDS_SET = new Set(ACL_CLUB_IDS);
export const ACL_TOTAL_MATCHDAYS = 6; // ACL Two: 6 pekan fase grup

// ===== Nama pemain klub ACL =====
// Pemain klub ACL diberi nama sesuai negara klubnya supaya skuad Al-Hilal/JDT/Johor dll. tidak
// ber-nama Indonesia. Klub ACL Elite (id 50-80) ambil negara dari acl_elite.json, ACL Two manual.
// Semua negara peserta ACL (Two + Elite) sudah punya pool nama (lihat ACL_NAME_POOLS di bawah).
export const CLUB_COUNTRY = Object.assign(
  Object.fromEntries((ACL_ELITE.clubs || []).map((c) => [c.id, c.country])),
  {
    19: 'KOR', 20: 'AUS', 21: 'VIE', 22: 'KOR', 23: 'JPN', 24: 'CHN', 25: 'HKG', 26: 'AUS',
    27: 'HKG', 28: 'THA', 29: 'CAM', 30: 'IND', 31: 'MAS', 32: 'SIN', 33: 'SIN', 34: 'UAE',
    35: 'UAE', 36: 'QAT', 37: 'KSA', 38: 'IRQ', 39: 'JOR', 40: 'JOR', 41: 'BHR', 42: 'BHR',
    43: 'KUW', 44: 'OMA', 45: 'OMA', 46: 'TKM', 47: 'UZB', 48: 'IRN', 49: 'CAM'
  }
);

export const ACL_NAME_POOLS = {
  KOR: ['Son Heung-min','Kim Min-jae','Lee Kang-in','Hwang In-beom','Cho Gue-sung','Jung Woo-young','Kim Young-gwon','Oh Hyeon-gyu','Park Yong-woo','Joo Min-kyu','Yoon Jong-gyu','Kang Sang-woo','Lee Seung-woo','Kim Jin-su','Hong Hyun-seok','Seo Min-woo'],
  JPN: ['Takefusa Kubo','Kaoru Mitoma','Wataru Endo','Daichi Kamada','Ritsu Doan','Yuto Nagatomo','Takumi Minamino','Ayase Ueda','Ko Itakura','Junya Ito','Kyogo Furuhashi','Hidemasa Morita','Shogo Taniguchi','Gaku Shibasaki','Keito Nakamura','Zion Suzuki'],
  THA: ['Chanathip Songkrasin','Theerathon Bunmathan','Teerasil Dangda','Supachai Chaided','Ekanit Panya','Bordin Phala','Pathompol Charoenrattanapirom','Anon Amornlerdsak','Kritsada Kaman','Sarach Yooyen','Adisak Kraisorn','Weerathep Pomphan','Sittichok Kannoo','Suphanat Mueanta','Narubadin Weerawatnodom','Chatchai Budprom'],
  CHN: ['Wu Lei','Zhang Yuning','Wei Shihao','Yan Dinghao','Xu Xin','Zhu Chenjie','Jiang Guangtai','Liu Yang','Wang Shangyuan','Gao Zhunyi','Xie Pengfei','Chen Pu','Liu Binbin','Yang Liyu','Wang Ziming','Li Lei'],
  AUS: ['Mathew Ryan','Harry Souttar','Awer Mabil','Mitchell Duke','Jackson Irvine','Riley McGree','Connor Metcalfe','Craig Goodwin','Bruno Fornaroli','Andrew Redmayne','Cameron Devlin','Nathaniel Atkinson','Jamie Maclaren','Marco Tilio','Kusini Yengi','Alessandro Circati'],
  MAS: ['Safiq Rahim','Arif Aiman','Faisal Halim','Dion Cools','Endrick dos Santos','Brendan Gan','Akhyar Rashid','Stuart Wilkin','Matthew Davies','Paulo Josué','Dominic Tan','Syafiq Ahmad','Zhafri Yahya','Feroz Baharudin','Sergio Agüero Jr','Ruventhiran Vengadesan'],
  VIE: ['Nguyễn Quang Hải','Đoàn Văn Đức','Nguyễn Tiến Linh','Nguyễn Công Phượng','Lê Công Vinh','Nguyễn Hồng Sơn','Trần Văn Đạt','Phạm Văn Tài','Đỗ Duy Cường','Nguyễn Hữu Thắng','Vũ Văn Hoành','Trần Bảo Vĩnh','Lê Huỳnh Đức','Nguyễn Bảo Nam','Phùng Sài','Lương Chữ'],
  KSA: ['Salem Al-Dawsari','Saleh Al-Shehri','Firas Al-Buraikan','Mohammed Kanno','Ali Al-Bulaihi','Sultan Al-Ghannam','Yasser Al-Shahrani','Abdullah Otayf','Nawaf Al-Abed','Abdulrahman Ghareeb','Mohammed Al-Owais','Ali Al-Hassan','Hattan Bahebri','Ayman Yahya','Saud Abdulhamid','Hassan Al-Tambakti'],
  UAE: ['Ali Mabkhout','Caio Canedo','Fábio Lima','Sultan Adil','Yahya Al-Ghassani','Khalifa Al-Hammadi','Harib Abdalla','Abdalla Ramadan','Majed Hassan','Walid Abbas','Bandar Al-Ahbabi','Ali Saleh','Mohamed Al-Attas','Abdullah Al-Naqbi','Zayed Al-Hammadi','Suhail Al-Mansoori'],
  QAT: ['Akram Afif','Almoez Ali','Hassan Al-Haydos','Karim Boudiaf','Boualem Khoukhi','Yusuf Abdurisag','Ahmed Alaaeldin','Ismail Mohammad','Tarek Salman','Homam Ahmed','Mostafa Tarek','Khalid Muneer','Jassem Gaber','Ahmed Fadli','Mohammed Waad','Hashim Ali'],
  IRN: ['Mehdi Taremi','Sardar Azmoun','Alireza Jahanbakhsh','Saman Ghoddos','Ali Gholizadeh','Saeid Ezatolahi','Mohammad Mohebi','Hossein Kanani','Milad Mohammadi','Mehdi Ghayedi','Omid Noorafkan','Reza Asadi','Shahriyar Moghanlou','Amir Abedzadeh','Saeid Sadeghi','Ali Karimi'],
  UZB: ['Eldor Shomurodov','Abbosbek Fayzullaev','Jaloliddin Masharipov','Odiljon Hamrobekov','Otabek Shukurov','Rustam Ashurmatov','Igor Sergeev','Azizbek Turgunboev','Khojiakbar Alijonov','Abdukodir Khusanov','Farrukh Sayfiev','Dostonbek Khamdamov','Jasurbek Yakhshiboev','Sardor Rashidov','Javokhir Sidikov','Islom Kobilov'],
  IRQ: ['Aymen Hussein','Ali Al-Hamadi','Zidane Iqbal','Ibrahim Bayesh','Amir Al-Ammari','Rebin Sulaka','Mohanad Ali','Hussein Ali','Bashar Resan','Sherko Kareem','Merchas Doski','Osama Rashid','Ali Jasim','Yaser Kasim','Amjed Attwan','Hasan Abdulkareem'],
  HKG: ['Chan Siu-ki','Wong Wai','Sun Ming Him','Tan Chun Lok','Ngan Cheuk Pan','Yu Wai Lim','Tsui Wang Kit','Law Tsz Chun','Leung Nok Hang','Ho Chun Ting','Fung Hoi Man','Cheng Chin Lung','Lai Kai Cheuk','Yeung Tsz Long','Cheung Kin Fung','Kwok Hoi Chun'],
  CAM: ['Chan Vathanaka','Keo Sokpheng','Soeuy Visal','Reung Bunheing','Sieng Chanthea','Orn Chanpolin','Sos Suhana','Tes Sambath','Lim Pisoth','Yue Safy','Sath Rosib','Kouch Sokumpheak','Choun Chanchav','Hoy Phallin','Nhean Sosidan','Brak Thiva'],
  IND: ['Sunil Chhetri','Manvir Singh','Anirudh Thapa','Brandon Fernandes','Liston Colaco','Sandesh Jhingan','Gurpreet Sandhu','Rahul Bheke','Sahal Samad','Ashique Kuruniyan','Mahesh Singh','Subhasish Bose','Lallianzuala Chhangte','Suresh Wangjam','Jeakson Singh','Pritam Kotal'],
  SIN: ['Hariss Harun','Safuwan Baharudin','Faris Ramli','Iqbal Hussain','Gabriel Quak','Shahdan Sulaiman','Hafiz Nor','Zulfahmi Arifin','Adam Swandi','Song Ui-young','Irfan Fandi','Jacob Mahler','Amy Recha','Hami Syahin','Naufal Azman','Afiq Yunos'],
  JOR: ['Musa Al-Taamari','Yazan Al-Naimat','Ali Olwan','Nour Al-Rawabdeh','Ehsan Haddad','Bara Marei','Abdallah Nasib','Salem Al-Ajalin','Rajaei Ayed','Yazeed Abu Laila','Mahmoud Al-Mardi','Mohannad Abu Taha','Feras Shelbaieh','Ahmad Samir','Mohammad Abu Zrayq','Saleh Ratib'],
  BHR: ['Abdulla Yusuf','Ali Madan','Kamil Al-Aswad','Mohamed Marhoon','Sayed Dhiya','Waleed Al-Hayam','Jassim Al-Shaikh','Ahmed Bughammar','Mahdi Humaidan','Sayyed Jafer','Rashed Al-Hooti','Hussain Al-Eker','Ahmed Nabeel','Ebrahim Khalil','Ali Hassan','Komail Al-Aswad'],
  KUW: ['Yousef Nasser','Fahad Al-Rashidi','Bader Al-Mutawa','Ahmad Zanki','Faisal Zayed','Eid Al-Rashidi','Sami Al-Sanea','Khaled Ebrahim','Abdullah Al-Fadhel','Sultan Al-Enezi','Mohsen Al-Ghareeb','Redha Hani','Ali Al-Kandari','Nasser Al-Dhafiri','Saud Al-Mejmed','Mishari Al-Enezi'],
  OMA: ['Muhsen Al-Ghassani','Zahir Al-Aghbari','Abdulaziz Al-Muqbali','Harib Al-Saadi','Ahmed Al-Khamisi','Salaah Al-Yahyaei','Amjad Al-Harthi','Ahmed Al-Matrooshi','Jameel Al-Yahmadi','Issam Al-Sabhi','Khalid Al-Buraiki','Rabia Al-Alawi','Mohammed Al-Ghafri','Nasser Al-Rawahi','Faisal Al-Balushi','Yousuf Al-Mukhaini'],
  TKM: ['Myrat Annayev','Arslanmyrat Amanow','Altymyrat Annadurdyyew','Ruslan Mingazow','Wahyt Orazsahedow','Elman Tagayew','Serdar Geldiyew','Mekan Ashyrow','Bagtyyar Durdyyew','Begench Akmammedow','Didar Durdyyew','Merdan Atayew','Azat Orazow','Nurmyrat Bayramow','Hojamberdi Aliyew','Yusup Rahmanow']
};

// Pool nama untuk satu klub ACL (null = pakai generator nama Indonesia seperti klub liga).
export function aclNamePool(clubId) {
  return ACL_NAME_POOLS[CLUB_COUNTRY[clubId]] || null;
}

// Urutan nama per negara: 'lf' = keluarga dulu (Korea/Jepang/China/Hong Kong/Kamboja/Vietnam),
// 'fl' = nama depan dulu (Asia Barat/Tengah, Australia, ASEAN sisanya).
export const ACL_NAME_ORDER = {
  KOR: 'lf', JPN: 'lf', CHN: 'lf', VIE: 'lf', HKG: 'lf', CAM: 'lf',
  THA: 'fl', MAS: 'fl', AUS: 'fl', IND: 'fl', SIN: 'fl', KSA: 'fl', UAE: 'fl', QAT: 'fl',
  IRN: 'fl', UZB: 'fl', IRQ: 'fl', JOR: 'fl', BHR: 'fl', KUW: 'fl', OMA: 'fl', TKM: 'fl'
};
export function aclNameOrder(clubId) {
  return ACL_NAME_ORDER[CLUB_COUNTRY[clubId]] || 'fl';
}
// Pisah nama asli jadi nama depan & nama keluarga (dipakai seed.js untuk variasi nama
// saat nama bintang di pool sudah terpakai di dunia karier).
export function aclNameParts(name, order) {
  const t = String(name).split(' ').filter(Boolean);
  if (t.length < 2) return null;
  return order === 'lf' ? { first: t.slice(1).join(' '), last: t[0] } : { first: t[0], last: t.slice(1).join(' ') };
}
