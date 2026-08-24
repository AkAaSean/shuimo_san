/**
 * 參考光榮三國志 (Koei Sangokushi) 經典都市規模與戰略定位
 * 
 * 都市規模分級 (City Tiers):
 * - MEGAPOLIS (帝都 / 巨都): 洛陽、長安、鄴城、成都、建業、許昌
 * - MAJOR (戰略大郡 / 州治重鎮): 襄陽、下邳、陳留、宛城、江陵、漢中、北平、長沙、合肥、壽春、天水等
 * - STANDARD (一般郡縣): 安定、薊縣、北海、梓潼、會稽、豫章、武陵等
 * - FRONTIER (邊陲偏遠 / 蠻荒要塞): 西平、武威、雲南、建寧、嶺南、南海、交趾、夷州、遼東等
 */

export interface ProvinceBaseConfig {
  id: number;
  name: string;
  tier: 'MEGAPOLIS' | 'MAJOR' | 'STANDARD' | 'FRONTIER';
  basePopulation: number; // 萬為單位基準 (如 25 = 25萬)
  baseDev: number;        // 土地開發度基準 (50~240，巨都最高可開發至 300，一般 160，邊陲 100)
  baseDefense: number;    // 防災 / 防禦度 (20~95)
  baseGold: number;       // 基準金錢
  baseFood: number;       // 基準兵糧
  baseReserveTroops: number; // 都市預備役
}

export const PROVINCE_BASE_CONFIGS: Record<number, ProvinceBaseConfig> = {
  1: { id: 1, name: '遼東', tier: 'FRONTIER', basePopulation: 7, baseDev: 65, baseDefense: 50, baseGold: 800, baseFood: 10000, baseReserveTroops: 1500 },
  2: { id: 2, name: '北平', tier: 'MAJOR', basePopulation: 16, baseDev: 145, baseDefense: 65, baseGold: 1800, baseFood: 22000, baseReserveTroops: 3000 },
  3: { id: 3, name: '薊縣', tier: 'STANDARD', basePopulation: 11, baseDev: 110, baseDefense: 55, baseGold: 1200, baseFood: 15000, baseReserveTroops: 2000 },
  4: { id: 4, name: '鄴城', tier: 'MEGAPOLIS', basePopulation: 28, baseDev: 230, baseDefense: 80, baseGold: 3500, baseFood: 45000, baseReserveTroops: 5000 },
  5: { id: 5, name: '晉陽', tier: 'STANDARD', basePopulation: 10, baseDev: 105, baseDefense: 60, baseGold: 1100, baseFood: 14000, baseReserveTroops: 2000 },
  6: { id: 6, name: '平陽', tier: 'STANDARD', basePopulation: 9, baseDev: 100, baseDefense: 50, baseGold: 1000, baseFood: 12000, baseReserveTroops: 1500 },
  7: { id: 7, name: '北海', tier: 'STANDARD', basePopulation: 12, baseDev: 120, baseDefense: 50, baseGold: 1300, baseFood: 16000, baseReserveTroops: 2000 },
  8: { id: 8, name: '齊郡', tier: 'MAJOR', basePopulation: 17, baseDev: 150, baseDefense: 60, baseGold: 1900, baseFood: 24000, baseReserveTroops: 2500 },
  9: { id: 9, name: '琅邪', tier: 'STANDARD', basePopulation: 10, baseDev: 108, baseDefense: 52, baseGold: 1100, baseFood: 13000, baseReserveTroops: 1800 },
  10: { id: 10, name: '下邳', tier: 'MAJOR', basePopulation: 19, baseDev: 160, baseDefense: 65, baseGold: 2200, baseFood: 28000, baseReserveTroops: 3500 },
  11: { id: 11, name: '濮陽', tier: 'MAJOR', basePopulation: 18, baseDev: 155, baseDefense: 62, baseGold: 2000, baseFood: 25000, baseReserveTroops: 3000 },
  12: { id: 12, name: '陳留', tier: 'MAJOR', basePopulation: 19, baseDev: 165, baseDefense: 65, baseGold: 2200, baseFood: 26000, baseReserveTroops: 3500 },
  13: { id: 13, name: '許昌', tier: 'MEGAPOLIS', basePopulation: 26, baseDev: 220, baseDefense: 78, baseGold: 3200, baseFood: 40000, baseReserveTroops: 5000 },
  14: { id: 14, name: '河東', tier: 'STANDARD', basePopulation: 11, baseDev: 115, baseDefense: 58, baseGold: 1200, baseFood: 15000, baseReserveTroops: 2000 },
  15: { id: 15, name: '洛陽', tier: 'MEGAPOLIS', basePopulation: 32, baseDev: 250, baseDefense: 88, baseGold: 4500, baseFood: 60000, baseReserveTroops: 6000 },
  16: { id: 16, name: '長安', tier: 'MEGAPOLIS', basePopulation: 30, baseDev: 240, baseDefense: 86, baseGold: 4000, baseFood: 55000, baseReserveTroops: 6000 },
  17: { id: 17, name: '安定', tier: 'STANDARD', basePopulation: 9, baseDev: 95, baseDefense: 55, baseGold: 950, baseFood: 11000, baseReserveTroops: 1800 },
  18: { id: 18, name: '天水', tier: 'MAJOR', basePopulation: 15, baseDev: 135, baseDefense: 68, baseGold: 1500, baseFood: 18000, baseReserveTroops: 2500 },
  19: { id: 19, name: '武威', tier: 'FRONTIER', basePopulation: 7, baseDev: 68, baseDefense: 55, baseGold: 850, baseFood: 10000, baseReserveTroops: 2000 },
  20: { id: 20, name: '西平', tier: 'FRONTIER', basePopulation: 6, baseDev: 55, baseDefense: 45, baseGold: 700, baseFood: 8000, baseReserveTroops: 1500 },
  21: { id: 21, name: '建業', tier: 'MEGAPOLIS', basePopulation: 27, baseDev: 225, baseDefense: 75, baseGold: 3200, baseFood: 42000, baseReserveTroops: 5000 },
  22: { id: 22, name: '吳郡', tier: 'MAJOR', basePopulation: 18, baseDev: 160, baseDefense: 60, baseGold: 2100, baseFood: 28000, baseReserveTroops: 3000 },
  23: { id: 23, name: '會稽', tier: 'STANDARD', basePopulation: 12, baseDev: 125, baseDefense: 55, baseGold: 1400, baseFood: 18000, baseReserveTroops: 2000 },
  24: { id: 24, name: '廬陵', tier: 'STANDARD', basePopulation: 10, baseDev: 105, baseDefense: 50, baseGold: 1100, baseFood: 14000, baseReserveTroops: 1800 },
  25: { id: 25, name: '豫章', tier: 'MAJOR', basePopulation: 16, baseDev: 140, baseDefense: 58, baseGold: 1600, baseFood: 20000, baseReserveTroops: 2500 },
  26: { id: 26, name: '夷州', tier: 'FRONTIER', basePopulation: 5, baseDev: 50, baseDefense: 30, baseGold: 500, baseFood: 5000, baseReserveTroops: 800 },
  27: { id: 27, name: '宛城', tier: 'MAJOR', basePopulation: 19, baseDev: 165, baseDefense: 70, baseGold: 2400, baseFood: 30000, baseReserveTroops: 4000 },
  28: { id: 28, name: '襄陽', tier: 'MEGAPOLIS', basePopulation: 26, baseDev: 230, baseDefense: 80, baseGold: 3300, baseFood: 45000, baseReserveTroops: 5000 },
  29: { id: 29, name: '江陵', tier: 'MAJOR', basePopulation: 20, baseDev: 175, baseDefense: 75, baseGold: 2600, baseFood: 34000, baseReserveTroops: 4000 },
  30: { id: 30, name: '武陵', tier: 'STANDARD', basePopulation: 10, baseDev: 110, baseDefense: 52, baseGold: 1100, baseFood: 14000, baseReserveTroops: 1800 },
  31: { id: 31, name: '長沙', tier: 'MAJOR', basePopulation: 17, baseDev: 155, baseDefense: 65, baseGold: 2000, baseFood: 26000, baseReserveTroops: 3000 },
  32: { id: 32, name: '零陵', tier: 'STANDARD', basePopulation: 9, baseDev: 98, baseDefense: 48, baseGold: 950, baseFood: 12000, baseReserveTroops: 1500 },
  33: { id: 33, name: '桂陽', tier: 'STANDARD', basePopulation: 9, baseDev: 96, baseDefense: 48, baseGold: 950, baseFood: 12000, baseReserveTroops: 1500 },
  34: { id: 34, name: '嶺南', tier: 'FRONTIER', basePopulation: 7, baseDev: 62, baseDefense: 40, baseGold: 750, baseFood: 9000, baseReserveTroops: 1200 },
  35: { id: 35, name: '漢中', tier: 'MAJOR', basePopulation: 16, baseDev: 150, baseDefense: 78, baseGold: 1900, baseFood: 28000, baseReserveTroops: 3500 },
  36: { id: 36, name: '成都', tier: 'MEGAPOLIS', basePopulation: 30, baseDev: 240, baseDefense: 82, baseGold: 3800, baseFood: 52000, baseReserveTroops: 5500 },
  37: { id: 37, name: '梓潼', tier: 'MAJOR', basePopulation: 15, baseDev: 135, baseDefense: 72, baseGold: 1600, baseFood: 22000, baseReserveTroops: 2500 },
  38: { id: 38, name: '雲南', tier: 'FRONTIER', basePopulation: 8, baseDev: 65, baseDefense: 50, baseGold: 850, baseFood: 11000, baseReserveTroops: 2000 },
  39: { id: 39, name: '建寧', tier: 'FRONTIER', basePopulation: 7, baseDev: 60, baseDefense: 46, baseGold: 750, baseFood: 9500, baseReserveTroops: 1500 },
  40: { id: 40, name: '永昌', tier: 'FRONTIER', basePopulation: 6, baseDev: 52, baseDefense: 42, baseGold: 650, baseFood: 8000, baseReserveTroops: 1200 },
  41: { id: 41, name: '南海', tier: 'FRONTIER', basePopulation: 7, baseDev: 64, baseDefense: 45, baseGold: 800, baseFood: 10000, baseReserveTroops: 1500 },
  42: { id: 42, name: '交趾', tier: 'FRONTIER', basePopulation: 6, baseDev: 60, baseDefense: 42, baseGold: 700, baseFood: 9000, baseReserveTroops: 1200 },
  43: { id: 43, name: '江州', tier: 'MAJOR', basePopulation: 17, baseDev: 150, baseDefense: 65, baseGold: 2000, baseFood: 24000, baseReserveTroops: 2800 },
};
