/**
 * 歷史都市進階設定 (Historical Province & Troop Configurations)
 * 涵蓋：
 * 1. 都市規模對應之土地開發上限 (100 ~ 300)
 * 2. 都市規模對應之防禦設施上限 (4 ~ 10)
 * 3. 都市規模對應之最低人口下限 (3萬 ~ 10萬)
 * 4. 6 大時期各都市初始預備兵之訓練度、武裝度史實設定
 * 5. 6 大時期重要巨都/戰略要塞之初始關寨 (1 ~ 3 個)
 * 6. 魅力招募軍費折抵公式
 */

import { PROVINCE_BASE_CONFIGS, CityType } from './provinceBaseConfig';

export interface ProvinceTierConfig {
  tier: CityType;
  tierName: string;        // 規模名稱 (大型都市, 商業城市, 農業城市, 中型城市, 小型邊境)
  maxDev: number;          // 土地開發上限 (100 ~ 300)
  maxCommerce: number;     // 商業發展上限 (100 ~ 300)
  maxForts: number;        // 防禦設施上限 (4 ~ 10)
  minPopulation: number;   // 最低人口維持數 (30,000 ~ 100,000)
  desc: string;            // 城市特性說明
}

export const TIER_RULES: Record<string, ProvinceTierConfig> = {
  METROPOLIS: {
    tier: 'METROPOLIS',
    tierName: '大型都市',
    maxDev: 300,
    maxCommerce: 300,
    maxForts: 10,
    minPopulation: 100000, // 巨都最少維持 10 萬人口
    desc: '土地農桑與商貿流通上限極高，人口稠密，帝國樞紐。',
  },
  COMMERCIAL: {
    tier: 'COMMERCIAL',
    tierName: '商業城市',
    maxDev: 180,
    maxCommerce: 260,
    maxForts: 8,
    minPopulation: 70000,  // 商邑最少維持 7 萬人口
    desc: '水陸交匯通商大邑，商賈雲集，商貿繁盛，金錢稅收豐厚。',
  },
  AGRICULTURAL: {
    tier: 'AGRICULTURAL',
    tierName: '農業城市',
    maxDev: 260,
    maxCommerce: 180,
    maxForts: 8,
    minPopulation: 70000,  // 農邑最少維持 7 萬人口
    desc: '沃野平原糧倉重鎮，屯田沃土，農桑昌盛，秋糧收成極盛。',
  },
  MIDSIZED: {
    tier: 'MIDSIZED',
    tierName: '中型城市',
    maxDev: 160,
    maxCommerce: 160,
    maxForts: 6,
    minPopulation: 50000,  // 一般郡縣最少維持 5 萬人口
    desc: '農商兼備之標準郡治，民風淳厚，發展均衡。',
  },
  FRONTIER: {
    tier: 'FRONTIER',
    tierName: '小型邊境',
    maxDev: 100,
    maxCommerce: 100,
    maxForts: 4,
    minPopulation: 30000,  // 邊陲要塞最少維持 3 萬人口
    desc: '邊陲偏遠塞防要衝，地廣人稀，以軍備邊防為要。',
  },
};

export function getProvinceTierRules(provinceId: number): ProvinceTierConfig {
  const base = PROVINCE_BASE_CONFIGS[provinceId];
  if (!base) {
    return TIER_RULES.MIDSIZED;
  }
  return TIER_RULES[base.tier] || TIER_RULES.MIDSIZED;
}

/**
 * 6 大時期都市初始【訓練度】史實配置
 */
export interface ScenarioProvinceMilitaryConfig {
  training: number;
}

export function getHistoricalReserveMilitary(
  scenarioIndex: number,
  provinceId: number
): ScenarioProvinceMilitaryConfig {
  // 基礎預設值 (依都市規模給予 50~65 基準)
  const base = PROVINCE_BASE_CONFIGS[provinceId];
  const tier = base?.tier || 'MIDSIZED';
  let defaultTraining = tier === 'METROPOLIS' ? 65 : (tier === 'COMMERCIAL' || tier === 'AGRICULTURAL') ? 58 : tier === 'MIDSIZED' ? 52 : 45;

  // 189 年 董卓專權 (Scenario 0)
  if (scenarioIndex === 0) {
    if (provinceId === 15) return { training: 82 }; // 洛陽 (西涼精銳、禁衛軍)
    if (provinceId === 16) return { training: 78 }; // 長安 (西涼軍)
    if (provinceId === 2)  return { training: 80 }; // 北平 (公孫瓚白馬義從)
    if (provinceId === 18 || provinceId === 19) return { training: 76 }; // 天水/武威 (涼州騎兵)
    if (provinceId === 4)  return { training: 68 }; // 鄴城 (韓馥/袁紹冀州軍)
    if (provinceId === 12) return { training: 66 }; // 陳留 (曹操起兵精騎)
    if (provinceId === 28) return { training: 65 }; // 襄陽 (劉表水步軍)
  }

  // 195 年 群雄逐鹿 (Scenario 1)
  if (scenarioIndex === 1) {
    if (provinceId === 13 || provinceId === 12) return { training: 84 }; // 許昌/陳留 (曹操青州軍)
    if (provinceId === 10) return { training: 86 }; // 下邳 (呂布并州鐵騎、高順陷陣營)
    if (provinceId === 4)  return { training: 78 }; // 鄴城 (袁紹河北重甲)
    if (provinceId === 22 || provinceId === 23) return { training: 76 }; // 吳郡/會稽 (孫策江東健兒)
    if (provinceId === 16) return { training: 80 }; // 長安 (李傕郭汜西涼老兵)
    if (provinceId === 2)  return { training: 80 }; // 北平 (公孫瓚)
    if (provinceId === 28) return { training: 70 }; // 襄陽 (荊襄水軍)
  }

  // 201 年 官渡之戰 (Scenario 2)
  if (scenarioIndex === 2) {
    if (provinceId === 13 || provinceId === 11) return { training: 88 }; // 許昌/濮陽 (曹操官渡決戰主力)
    if (provinceId === 4 || provinceId === 8)   return { training: 84 }; // 鄴城/齊郡 (袁紹主力)
    if (provinceId === 21 || provinceId === 22) return { training: 80 }; // 建業/吳郡 (孫權江東舟師)
    if (provinceId === 28 || provinceId === 29) return { training: 74 }; // 襄陽/江陵 (荊襄甲士)
    if (provinceId === 36) return { training: 64 }; // 成都 (益州兵)
  }

  // 208 年 赤壁之戰 (Scenario 3)
  if (scenarioIndex === 3) {
    if (provinceId === 13 || provinceId === 15 || provinceId === 28 || provinceId === 29) {
      return { training: 90 }; // 許昌/洛陽/襄陽/江陵 (曹操八十萬南征精銳)
    }
    if (provinceId === 21 || provinceId === 25 || provinceId === 22) {
      return { training: 88 }; // 建業/豫章/吳郡 (周瑜江東水軍都督府精兵)
    }
    if (provinceId === 31) return { training: 82 }; // 長沙 (黃忠、魏延麾下精卒)
    if (provinceId === 35) return { training: 70 }; // 漢中 (張魯鬼卒道兵)
    if (provinceId === 36) return { training: 66 }; // 成都 (劉璋東州兵)
  }

  // 215 年 三足鼎立 (Scenario 4)
  if (scenarioIndex === 4) {
    if (provinceId === 13 || provinceId === 15 || provinceId === 4) {
      return { training: 90 }; // 許昌/洛陽/鄴城 (曹魏虎豹騎與中原勁旅)
    }
    if (provinceId === 36 || provinceId === 35 || provinceId === 37) {
      return { training: 88 }; // 成都/漢中/梓潼 (劉備入蜀定漢中精銳無當飛軍雛形)
    }
    if (provinceId === 28 || provinceId === 29) {
      return { training: 92 }; // 襄陽/江陵 (關羽荊州水陸虎旅)
    }
    if (provinceId === 21 || provinceId === 25) {
      return { training: 88 }; // 建業/豫章 (孫權合肥江東解煩軍)
    }
  }

  // 220 年 夷陵之戰 (Scenario 5)
  if (scenarioIndex === 5) {
    if (provinceId === 15 || provinceId === 16 || provinceId === 13) {
      return { training: 92 }; // 洛陽/長安/許昌 (曹丕魏國禁軍與關中鐵騎)
    }
    if (provinceId === 36 || provinceId === 35) {
      return { training: 90 }; // 成都/漢中 (蜀漢丞相治軍嚴明主力)
    }
    if (provinceId === 21 || provinceId === 29) {
      return { training: 90 }; // 建業/江陵 (陸遜夷陵防線精銳)
    }
  }

  return { training: defaultTraining };
}

/**
 * 6 大時期重要名城/戰略要塞之初始關寨 (1 ~ 3 個)
 */
export function getHistoricalInitialForts(
  scenarioIndex: number,
  provinceId: number
): { x: number; y: number }[] {
  const forts: { x: number; y: number }[] = [];

  // 洛陽 (15郡) - 虎牢關、函谷關、伊闕
  if (provinceId === 15) {
    forts.push({ x: 1, y: 5 }); // 函谷關 (西)
    forts.push({ x: 8, y: 5 }); // 虎牢關 (東)
    if (scenarioIndex >= 1) {
      forts.push({ x: 5, y: 1 }); // 孟津要塞 (北)
    }
    return forts;
  }

  // 長安 (16郡) - 潼關、散關
  if (provinceId === 16) {
    forts.push({ x: 8, y: 5 }); // 潼關 (東)
    forts.push({ x: 1, y: 5 }); // 散關 (西)
    if (scenarioIndex >= 3) {
      forts.push({ x: 5, y: 8 }); // 子午谷/武關要塞 (南)
    }
    return forts;
  }

  // 許昌 (13郡) - 官渡營壘、外圍衛壘
  if (provinceId === 13) {
    forts.push({ x: 5, y: 1 }); // 官渡前沿堡
    if (scenarioIndex >= 1) {
      forts.push({ x: 8, y: 5 }); // 潁川東壘
    }
    if (scenarioIndex >= 4) {
      forts.push({ x: 1, y: 5 }); // 汝南防線堡
    }
    return forts;
  }

  // 鄴城 (4郡) - 黎陽要塞、漳水大寨
  if (provinceId === 4) {
    forts.push({ x: 5, y: 8 }); // 黎陽營壘
    if (scenarioIndex >= 1) {
      forts.push({ x: 1, y: 5 }); // 太行隘口堡
    }
    return forts;
  }

  // 漢中 (35郡) - 陽平關、定軍山
  if (provinceId === 35) {
    forts.push({ x: 1, y: 5 }); // 陽平關 (西出關隘)
    if (scenarioIndex >= 3) {
      forts.push({ x: 7, y: 6 }); // 定軍山營壘
    }
    if (scenarioIndex >= 4) {
      forts.push({ x: 5, y: 1 }); // 金牛道關隘
    }
    return forts;
  }

  // 梓潼 (37郡) - 劍閣要隘
  if (provinceId === 37) {
    forts.push({ x: 5, y: 2 }); // 劍閣天險
    if (scenarioIndex >= 4) {
      forts.push({ x: 8, y: 5 }); // 涪城衛堡
    }
    return forts;
  }

  // 襄陽 (28郡) - 樊城要塞、鹿門山寨
  if (provinceId === 28) {
    forts.push({ x: 5, y: 2 }); // 樊城外壘 (漢水北)
    if (scenarioIndex >= 3) {
      forts.push({ x: 7, y: 5 }); // 鹿門山寨
    }
    return forts;
  }

  // 江陵 (29郡) - 烏林水寨、南郡大營
  if (provinceId === 29) {
    forts.push({ x: 3, y: 7 }); // 長江水寨
    if (scenarioIndex >= 3) {
      forts.push({ x: 7, y: 3 }); // 華容防線營
    }
    return forts;
  }

  // 建業 (21郡) - 牛渚水寨、濡須口
  if (provinceId === 21) {
    forts.push({ x: 3, y: 5 }); // 牛渚磯要塞
    if (scenarioIndex >= 3) {
      forts.push({ x: 6, y: 2 }); // 濡須塢要塞
    }
    if (scenarioIndex >= 4) {
      forts.push({ x: 7, y: 7 }); // 京口烽燧營
    }
    return forts;
  }

  // 成都 (36郡) - 雒城防線、錦江水寨
  if (provinceId === 36) {
    forts.push({ x: 5, y: 1 }); // 雒城外關
    if (scenarioIndex >= 4) {
      forts.push({ x: 3, y: 7 }); // 錦江水寨
    }
    return forts;
  }

  // 天水 (18郡) - 街亭要塞、祁山堡
  if (provinceId === 18) {
    forts.push({ x: 8, y: 2 }); // 街亭險道堡
    if (scenarioIndex >= 4) {
      forts.push({ x: 1, y: 6 }); // 祁山大營
    }
    return forts;
  }

  // 宛城 (27郡) - 淯水防線
  if (provinceId === 27 && scenarioIndex >= 1) {
    forts.push({ x: 5, y: 1 }); // 宛城北壘
    return forts;
  }

  // 下邳 (10郡) - 淮陰營壘
  if (provinceId === 10 && scenarioIndex >= 1) {
    forts.push({ x: 5, y: 8 }); // 淮水要塞
    return forts;
  }

  return forts;
}

/**
 * 徵兵魅力折抵公式：
 * - 魅力不限制徵兵上限（魅力不影響徵兵效率/人數限制）
 * - 魅力越高，徵募新兵所需的軍資金錢越低 (高魅力省錢)
 * - 基準成本：1 兵 = 1 金
 * - 折扣公式：折扣率 = min(65%, max(0%, (總魅力 - 20) * 0.65%))
 *   - 魅力 30：折扣 6.5% (每 1000 兵需 935 金)
 *   - 魅力 50：折扣 19.5% (每 1000 兵需 805 金)
 *   - 魅力 75：折扣 35.7% (每 1000 兵需 643 金)
 *   - 魅力 99 (劉備)：折扣 51.3% (每 1000 兵需 487 金)
 *   - 魅力 120 (劉備+玉璽)：折扣 65.0% (每 1000 兵需 350 金)
 */
export function calculateDraftDiscountRate(generalCha: number): number {
  if (generalCha <= 20) return 0;
  return Math.min(0.65, Math.max(0, (generalCha - 20) * 0.0065));
}

export function calculateDraftCost(soldierCount: number, generalCha: number = 50): number {
  if (soldierCount <= 0) return 0;
  const discountRate = calculateDraftDiscountRate(generalCha);
  return Math.max(1, Math.ceil(soldierCount * (1 - discountRate)));
}

/**
 * 都市單次徵兵上限精密計算公式：
 * - 嚴格維護人口下限：徵兵後人口不得低於該郡縣規模底限 (minPopulation)
 * - 人口越多，單次可徵募新兵量越大
 * - 安全動員率公式：可用剩餘人口 (population - minPopulation) * 8%
 * - 最多單次封頂 5,000 人 (一次最多5000人)
 */
export function calculateMaxProvinceDraft(provincePopulation: number, minPopulation: number): number {
  const availablePop = Math.max(0, provincePopulation - minPopulation);
  if (availablePop <= 0) return 0;
  
  // 8% 動員率，確保不透支民力
  const popBasedAmount = Math.floor(availablePop * 0.08);
  const safeAmount = Math.min(availablePop, Math.max(100, popBasedAmount));
  return Math.min(5000, safeAmount);
}

/**
 * 部隊操練動態訓練值精密計算：
 * - 訓練為全軍整體操練（所有駐防部隊同時受訓）
 * - 教官武力越高，全軍獲得的基礎練兵點數越多
 * - 根據各部隊士兵人數精密動態加權：
 *   人數越少，將領與教官越能專注指導，訓練度上升越快（例如 1000 兵比 2000 兵成長更顯著）
 *   計算模型：Gain = round(BaseGain(武力) * sqrt(1000 / 人數))，上限 100%
 */
export function calculateTroopTrainingGain(
  instructorStr: number,
  soldierCount: number,
  currentTraining: number
): number {
  if (soldierCount <= 0) return 0;
  
  // 採用指數化公式，武力 100 基準為 20 (搭配 3000 兵)
  const strFactor = Math.pow(instructorStr / 100, 3);
  const baseGain = 20 * strFactor;
  
  // 兵力加權：以 3000 人為基準(1.0倍)，人數越少訓練越快
  const countFactor = Math.sqrt(3000 / Math.max(500, soldierCount));
  
  // 訓練度高時，提升難度增加（高強度訓練更難突破極限）
  const difficultyFactor = currentTraining >= 80 ? 0.6 : (currentTraining >= 60 ? 0.8 : 1.0);
  
  const rawGain = Math.round(baseGain * countFactor * difficultyFactor);
  const maxGain = Math.max(0, 100 - currentTraining);
  return Math.min(maxGain, Math.max(1, rawGain));
}

