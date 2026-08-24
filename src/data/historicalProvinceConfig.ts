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

import { PROVINCE_BASE_CONFIGS } from './provinceBaseConfig';

export interface ProvinceTierConfig {
  tier: 'MEGAPOLIS' | 'MAJOR' | 'STANDARD' | 'FRONTIER';
  tierName: string;        // 規模名稱 (e.g. 帝國巨都, 戰略重鎮, 一般郡縣, 邊陲要塞)
  maxDev: number;          // 土地開發上限 (100 ~ 300)
  maxForts: number;        // 防禦設施上限 (4 ~ 10)
  minPopulation: number;   // 最低人口維持數 (30,000 ~ 100,000)
}

export const TIER_RULES: Record<string, ProvinceTierConfig> = {
  MEGAPOLIS: {
    tier: 'MEGAPOLIS',
    tierName: '帝國巨都',
    maxDev: 300,
    maxForts: 10,
    minPopulation: 100000, // 巨都最少維持 10 萬人口
  },
  MAJOR: {
    tier: 'MAJOR',
    tierName: '戰略重鎮',
    maxDev: 220,
    maxForts: 10,
    minPopulation: 70000,  // 戰略大郡最少維持 7 萬人口
  },
  STANDARD: {
    tier: 'STANDARD',
    tierName: '一般郡縣',
    maxDev: 160,
    maxForts: 6,
    minPopulation: 50000,  // 一般郡縣最少維持 5 萬人口
  },
  FRONTIER: {
    tier: 'FRONTIER',
    tierName: '邊陲要塞',
    maxDev: 100,
    maxForts: 4,
    minPopulation: 30000,  // 邊陲要塞最少維持 3 萬人口
  },
};

export function getProvinceTierRules(provinceId: number): ProvinceTierConfig {
  const base = PROVINCE_BASE_CONFIGS[provinceId];
  if (!base) {
    return TIER_RULES.STANDARD;
  }
  return TIER_RULES[base.tier] || TIER_RULES.STANDARD;
}

/**
 * 6 大時期都市初始預備兵【訓練度】與【武裝度】史實配置
 */
export interface ScenarioProvinceMilitaryConfig {
  training: number;
  weapons: number;
}

export function getHistoricalReserveMilitary(
  scenarioIndex: number,
  provinceId: number
): ScenarioProvinceMilitaryConfig {
  // 基礎預設值 (依都市規模給予 50~65 基準)
  const base = PROVINCE_BASE_CONFIGS[provinceId];
  const tier = base?.tier || 'STANDARD';
  let defaultTraining = tier === 'MEGAPOLIS' ? 65 : tier === 'MAJOR' ? 58 : tier === 'STANDARD' ? 52 : 45;
  let defaultWeapons = tier === 'MEGAPOLIS' ? 65 : tier === 'MAJOR' ? 58 : tier === 'STANDARD' ? 50 : 42;

  // 189 年 董卓專權 (Scenario 0)
  if (scenarioIndex === 0) {
    if (provinceId === 15) return { training: 82, weapons: 86 }; // 洛陽 (西涼精銳、禁衛軍)
    if (provinceId === 16) return { training: 78, weapons: 80 }; // 長安 (西涼軍)
    if (provinceId === 2)  return { training: 80, weapons: 82 }; // 北平 (公孫瓚白馬義從)
    if (provinceId === 18 || provinceId === 19) return { training: 76, weapons: 75 }; // 天水/武威 (涼州騎兵)
    if (provinceId === 4)  return { training: 68, weapons: 70 }; // 鄴城 (韓馥/袁紹冀州軍)
    if (provinceId === 12) return { training: 66, weapons: 68 }; // 陳留 (曹操起兵精騎)
    if (provinceId === 28) return { training: 65, weapons: 68 }; // 襄陽 (劉表水步軍)
  }

  // 195 年 群雄逐鹿 (Scenario 1)
  if (scenarioIndex === 1) {
    if (provinceId === 13 || provinceId === 12) return { training: 84, weapons: 82 }; // 許昌/陳留 (曹操青州軍)
    if (provinceId === 10) return { training: 86, weapons: 84 }; // 下邳 (呂布并州鐵騎、高順陷陣營)
    if (provinceId === 4)  return { training: 78, weapons: 80 }; // 鄴城 (袁紹河北重甲)
    if (provinceId === 22 || provinceId === 23) return { training: 76, weapons: 72 }; // 吳郡/會稽 (孫策江東健兒)
    if (provinceId === 16) return { training: 80, weapons: 78 }; // 長安 (李傕郭汜西涼老兵)
    if (provinceId === 2)  return { training: 80, weapons: 82 }; // 北平 (公孫瓚)
    if (provinceId === 28) return { training: 70, weapons: 74 }; // 襄陽 (荊襄水軍)
  }

  // 201 年 官渡之戰 (Scenario 2)
  if (scenarioIndex === 2) {
    if (provinceId === 13 || provinceId === 11) return { training: 88, weapons: 88 }; // 許昌/濮陽 (曹操官渡決戰主力)
    if (provinceId === 4 || provinceId === 8)   return { training: 84, weapons: 85 }; // 鄴城/齊郡 (袁紹主力)
    if (provinceId === 21 || provinceId === 22) return { training: 80, weapons: 78 }; // 建業/吳郡 (孫權江東舟師)
    if (provinceId === 28 || provinceId === 29) return { training: 74, weapons: 76 }; // 襄陽/江陵 (荊襄甲士)
    if (provinceId === 36) return { training: 64, weapons: 68 }; // 成都 (益州兵)
  }

  // 208 年 赤壁之戰 (Scenario 3)
  if (scenarioIndex === 3) {
    if (provinceId === 13 || provinceId === 15 || provinceId === 28 || provinceId === 29) {
      return { training: 90, weapons: 90 }; // 許昌/洛陽/襄陽/江陵 (曹操八十萬南征精銳)
    }
    if (provinceId === 21 || provinceId === 25 || provinceId === 22) {
      return { training: 88, weapons: 85 }; // 建業/豫章/吳郡 (周瑜江東水軍都督府精兵)
    }
    if (provinceId === 31) return { training: 82, weapons: 78 }; // 長沙 (黃忠、魏延麾下精卒)
    if (provinceId === 35) return { training: 70, weapons: 68 }; // 漢中 (張魯鬼卒道兵)
    if (provinceId === 36) return { training: 66, weapons: 70 }; // 成都 (劉璋東州兵)
  }

  // 215 年 三足鼎立 (Scenario 4)
  if (scenarioIndex === 4) {
    if (provinceId === 13 || provinceId === 15 || provinceId === 4) {
      return { training: 90, weapons: 92 }; // 許昌/洛陽/鄴城 (曹魏虎豹騎與中原勁旅)
    }
    if (provinceId === 36 || provinceId === 35 || provinceId === 37) {
      return { training: 88, weapons: 88 }; // 成都/漢中/梓潼 (劉備入蜀定漢中精銳無當飛軍雛形)
    }
    if (provinceId === 28 || provinceId === 29) {
      return { training: 92, weapons: 90 }; // 襄陽/江陵 (關羽荊州水陸虎旅)
    }
    if (provinceId === 21 || provinceId === 25) {
      return { training: 88, weapons: 86 }; // 建業/豫章 (孫權合肥江東解煩軍)
    }
  }

  // 220 年 夷陵之戰 (Scenario 5)
  if (scenarioIndex === 5) {
    if (provinceId === 15 || provinceId === 16 || provinceId === 13) {
      return { training: 92, weapons: 94 }; // 洛陽/長安/許昌 (曹丕魏國禁軍與關中鐵騎)
    }
    if (provinceId === 36 || provinceId === 35) {
      return { training: 90, weapons: 90 }; // 成都/漢中 (蜀漢丞相治軍嚴明主力)
    }
    if (provinceId === 21 || provinceId === 29) {
      return { training: 90, weapons: 90 }; // 建業/江陵 (陸遜夷陵防線精銳)
    }
  }

  return { training: defaultTraining, weapons: defaultWeapons };
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
 * - 基準成本：每 1 兵 = 1 金 (100 兵 = 100 金)
 * - 魅力 (CHA + 寶物) 越高，折抵率越高
 * - 折抵公式：折抵後金錢比率 = (100 - floor(totalCha * 0.45)) / 100
 * - 舉例：
 *   - 魅力 50：每 100 兵需 78 金 (折抵 22%)
 *   - 魅力 70：每 100 兵需 69 金 (折抵 31%)
 *   - 魅力 90：每 100 兵需 60 金 (折抵 40%)
 *   - 魅力 100 (劉備)：每 100 兵需 55 金 (折抵 45%)
 *   - 魅力 120 (劉備+玉璽)：每 100 兵需 46 金 (折抵 54%)
 */
export function calculateDraftCost(soldierCount: number): number {
  return soldierCount > 0 ? soldierCount : 0;
}

export function calculateMaxDraftAmount(generalCha: number): number {
  if (generalCha <= 0) return 0;
  // 魅力最高可徵 3000 人 (基準魅力100時)
  // 使用指數(二次方)曲線，魅力越高收益增長越明顯 (Exponential accelerating curve)
  // 若 generalCha = 100, ratio = 1 -> 3000
  // 若 generalCha = 80, ratio = 0.64 -> 1920
  // 若 generalCha = 50, ratio = 0.25 -> 750
  const maxTroops = 3000;
  const ratio = Math.pow(generalCha / 100, 2);
  return Math.max(10, Math.floor(maxTroops * ratio));
}
