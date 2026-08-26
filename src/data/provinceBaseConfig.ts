/**
 * 參考光榮三國志 (Koei Sangokushi) 經典都市規模與戰略定位
 * 
 * 都市類型分類 (5大類型 Archetypes):
 * 1. METROPOLIS (大型都市 / 帝都巨城): 土地與商業價值上限均高 (300/300)，人口眾多 (26萬 ~ 32萬)
 * 2. COMMERCIAL (商業城市 / 通商大邑): 商業高 (260)、土地中 (180)、人口中上 (18萬 ~ 22萬)
 * 3. AGRICULTURAL (農業城市 / 沃野重鎮): 土地高 (260)、商業中 (180)、人口中上 (16萬 ~ 18萬)
 * 4. MIDSIZED (中型城市 / 一般郡縣): 土地中 (160)、商業中 (160)、人口中 (9萬 ~ 16萬)
 * 5. FRONTIER (小型都市或邊境 / 邊陲要塞): 土地低 (100)、商業低 (100)、人口少 (5萬 ~ 8萬)
 */

export type CityType = 'METROPOLIS' | 'COMMERCIAL' | 'AGRICULTURAL' | 'MIDSIZED' | 'FRONTIER';

export interface ProvinceBaseConfig {
  id: number;
  name: string;
  tier: CityType;         // 城市規模類型
  basePopulation: number; // 萬為單位基準 (如 25 = 25萬)
  baseDev: number;        // 土地開發度基準 (農業產能)
  baseCommerce: number;   // 商業發展度基準 (商業產能)
  baseDefense: number;    // 防災 / 防禦度 (20~95)
  baseGold: number;       // 基準金錢
  baseFood: number;       // 基準兵糧
  baseReserveTroops: number; // 都市預備役
}

export const PROVINCE_BASE_CONFIGS: Record<number, ProvinceBaseConfig> = {
  // ── 幽州 ──
  1: { id: 1, name: '遼東', tier: 'FRONTIER', basePopulation: 7, baseDev: 65, baseCommerce: 60, baseDefense: 50, baseGold: 800, baseFood: 10000, baseReserveTroops: 1500 },
  2: { id: 2, name: '北平', tier: 'AGRICULTURAL', basePopulation: 17, baseDev: 195, baseCommerce: 140, baseDefense: 65, baseGold: 1800, baseFood: 26000, baseReserveTroops: 3000 },
  3: { id: 3, name: '薊縣', tier: 'MIDSIZED', basePopulation: 12, baseDev: 120, baseCommerce: 125, baseDefense: 55, baseGold: 1200, baseFood: 15000, baseReserveTroops: 2000 },

  // ── 冀州 ──
  4: { id: 4, name: '鄴城', tier: 'METROPOLIS', basePopulation: 28, baseDev: 240, baseCommerce: 235, baseDefense: 80, baseGold: 3500, baseFood: 45000, baseReserveTroops: 5000 },

  // ── 并州 ──
  5: { id: 5, name: '晉陽', tier: 'MIDSIZED', basePopulation: 11, baseDev: 115, baseCommerce: 110, baseDefense: 60, baseGold: 1100, baseFood: 14000, baseReserveTroops: 2000 },
  6: { id: 6, name: '平陽', tier: 'MIDSIZED', basePopulation: 10, baseDev: 110, baseCommerce: 105, baseDefense: 50, baseGold: 1000, baseFood: 12000, baseReserveTroops: 1500 },

  // ── 青州 ──
  7: { id: 7, name: '北海', tier: 'AGRICULTURAL', basePopulation: 16, baseDev: 190, baseCommerce: 135, baseDefense: 55, baseGold: 1400, baseFood: 25000, baseReserveTroops: 2200 },
  8: { id: 8, name: '平原', tier: 'COMMERCIAL', basePopulation: 18, baseDev: 135, baseCommerce: 200, baseDefense: 60, baseGold: 2300, baseFood: 20000, baseReserveTroops: 2600 },

  // ── 徐州 ──
  9: { id: 9, name: '琅邪', tier: 'MIDSIZED', basePopulation: 11, baseDev: 115, baseCommerce: 115, baseDefense: 52, baseGold: 1100, baseFood: 13000, baseReserveTroops: 1800 },
  10: { id: 10, name: '下邳', tier: 'COMMERCIAL', basePopulation: 19, baseDev: 140, baseCommerce: 210, baseDefense: 65, baseGold: 2500, baseFood: 22000, baseReserveTroops: 3500 },

  // ── 兗州 ──
  11: { id: 11, name: '濮陽', tier: 'AGRICULTURAL', basePopulation: 18, baseDev: 200, baseCommerce: 140, baseDefense: 62, baseGold: 1900, baseFood: 28000, baseReserveTroops: 3000 },
  12: { id: 12, name: '陳留', tier: 'COMMERCIAL', basePopulation: 19, baseDev: 145, baseCommerce: 215, baseDefense: 65, baseGold: 2600, baseFood: 22000, baseReserveTroops: 3500 },

  // ── 豫州 ──
  13: { id: 13, name: '許昌', tier: 'METROPOLIS', basePopulation: 26, baseDev: 230, baseCommerce: 230, baseDefense: 78, baseGold: 3300, baseFood: 42000, baseReserveTroops: 5000 },

  // ── 司隸 ──
  14: { id: 14, name: '河東', tier: 'MIDSIZED', basePopulation: 12, baseDev: 120, baseCommerce: 120, baseDefense: 58, baseGold: 1200, baseFood: 15000, baseReserveTroops: 2000 },
  15: { id: 15, name: '洛陽', tier: 'METROPOLIS', basePopulation: 32, baseDev: 255, baseCommerce: 260, baseDefense: 88, baseGold: 4500, baseFood: 60000, baseReserveTroops: 6000 },
  16: { id: 16, name: '長安', tier: 'METROPOLIS', basePopulation: 30, baseDev: 245, baseCommerce: 250, baseDefense: 86, baseGold: 4000, baseFood: 55000, baseReserveTroops: 6000 },

  // ── 涼州 ──
  17: { id: 17, name: '安定', tier: 'MIDSIZED', basePopulation: 10, baseDev: 100, baseCommerce: 95, baseDefense: 55, baseGold: 950, baseFood: 11000, baseReserveTroops: 1800 },
  18: { id: 18, name: '天水', tier: 'MIDSIZED', basePopulation: 15, baseDev: 130, baseCommerce: 125, baseDefense: 68, baseGold: 1500, baseFood: 18000, baseReserveTroops: 2500 },
  19: { id: 19, name: '武威', tier: 'FRONTIER', basePopulation: 7, baseDev: 68, baseCommerce: 70, baseDefense: 55, baseGold: 850, baseFood: 10000, baseReserveTroops: 2000 },
  20: { id: 20, name: '西平', tier: 'FRONTIER', basePopulation: 6, baseDev: 55, baseCommerce: 50, baseDefense: 45, baseGold: 700, baseFood: 8000, baseReserveTroops: 1500 },

  // ── 揚州 ──
  21: { id: 21, name: '建業', tier: 'METROPOLIS', basePopulation: 27, baseDev: 235, baseCommerce: 240, baseDefense: 75, baseGold: 3400, baseFood: 44000, baseReserveTroops: 5000 },
  22: { id: 22, name: '吳郡', tier: 'COMMERCIAL', basePopulation: 19, baseDev: 140, baseCommerce: 220, baseDefense: 60, baseGold: 2700, baseFood: 21000, baseReserveTroops: 3000 },
  23: { id: 23, name: '會稽', tier: 'MIDSIZED', basePopulation: 13, baseDev: 125, baseCommerce: 130, baseDefense: 55, baseGold: 1400, baseFood: 18000, baseReserveTroops: 2000 },
  24: { id: 24, name: '廬陵', tier: 'MIDSIZED', basePopulation: 11, baseDev: 110, baseCommerce: 105, baseDefense: 50, baseGold: 1100, baseFood: 14000, baseReserveTroops: 1800 },
  25: { id: 25, name: '豫章', tier: 'MIDSIZED', basePopulation: 16, baseDev: 135, baseCommerce: 135, baseDefense: 58, baseGold: 1600, baseFood: 20000, baseReserveTroops: 2500 },
  26: { id: 26, name: '夷州', tier: 'FRONTIER', basePopulation: 5, baseDev: 50, baseCommerce: 45, baseDefense: 30, baseGold: 500, baseFood: 5000, baseReserveTroops: 800 },

  // ── 荊州 ──
  27: { id: 27, name: '宛城', tier: 'COMMERCIAL', basePopulation: 19, baseDev: 145, baseCommerce: 210, baseDefense: 70, baseGold: 2600, baseFood: 24000, baseReserveTroops: 4000 },
  28: { id: 28, name: '襄陽', tier: 'COMMERCIAL', basePopulation: 22, baseDev: 155, baseCommerce: 230, baseDefense: 80, baseGold: 3100, baseFood: 32000, baseReserveTroops: 4500 },
  29: { id: 29, name: '江陵', tier: 'COMMERCIAL', basePopulation: 20, baseDev: 150, baseCommerce: 220, baseDefense: 75, baseGold: 2800, baseFood: 28000, baseReserveTroops: 4000 },
  30: { id: 30, name: '武陵', tier: 'MIDSIZED', basePopulation: 11, baseDev: 115, baseCommerce: 110, baseDefense: 52, baseGold: 1100, baseFood: 14000, baseReserveTroops: 1800 },
  31: { id: 31, name: '長沙', tier: 'AGRICULTURAL', basePopulation: 18, baseDev: 205, baseCommerce: 145, baseDefense: 65, baseGold: 2000, baseFood: 30000, baseReserveTroops: 3000 },
  32: { id: 32, name: '零陵', tier: 'MIDSIZED', basePopulation: 10, baseDev: 105, baseCommerce: 100, baseDefense: 48, baseGold: 950, baseFood: 12000, baseReserveTroops: 1500 },
  33: { id: 33, name: '桂陽', tier: 'MIDSIZED', basePopulation: 10, baseDev: 105, baseCommerce: 100, baseDefense: 48, baseGold: 950, baseFood: 12000, baseReserveTroops: 1500 },

  // ── 交州 ──
  34: { id: 34, name: '嶺南', tier: 'FRONTIER', basePopulation: 7, baseDev: 62, baseCommerce: 60, baseDefense: 40, baseGold: 750, baseFood: 9000, baseReserveTroops: 1200 },

  // ── 益州 ──
  35: { id: 35, name: '漢中', tier: 'AGRICULTURAL', basePopulation: 18, baseDev: 210, baseCommerce: 135, baseDefense: 78, baseGold: 1900, baseFood: 32000, baseReserveTroops: 3500 },
  36: { id: 36, name: '成都', tier: 'METROPOLIS', basePopulation: 30, baseDev: 250, baseCommerce: 245, baseDefense: 82, baseGold: 3800, baseFood: 54000, baseReserveTroops: 5500 },
  37: { id: 37, name: '梓潼', tier: 'AGRICULTURAL', basePopulation: 16, baseDev: 190, baseCommerce: 130, baseDefense: 72, baseGold: 1600, baseFood: 25000, baseReserveTroops: 2500 },
  38: { id: 38, name: '雲南', tier: 'FRONTIER', basePopulation: 8, baseDev: 65, baseCommerce: 65, baseDefense: 50, baseGold: 850, baseFood: 11000, baseReserveTroops: 2000 },
  39: { id: 39, name: '建寧', tier: 'FRONTIER', basePopulation: 7, baseDev: 60, baseCommerce: 58, baseDefense: 46, baseGold: 750, baseFood: 9500, baseReserveTroops: 1500 },
  40: { id: 40, name: '永昌', tier: 'FRONTIER', basePopulation: 6, baseDev: 52, baseCommerce: 50, baseDefense: 42, baseGold: 650, baseFood: 8000, baseReserveTroops: 1200 },
  41: { id: 41, name: '南海', tier: 'FRONTIER', basePopulation: 7, baseDev: 64, baseCommerce: 68, baseDefense: 45, baseGold: 800, baseFood: 10000, baseReserveTroops: 1500 },
  42: { id: 42, name: '交趾', tier: 'FRONTIER', basePopulation: 6, baseDev: 60, baseCommerce: 62, baseDefense: 42, baseGold: 700, baseFood: 9000, baseReserveTroops: 1200 },
  43: { id: 43, name: '江州', tier: 'AGRICULTURAL', basePopulation: 17, baseDev: 195, baseCommerce: 140, baseDefense: 65, baseGold: 2000, baseFood: 27000, baseReserveTroops: 2800 },
};
