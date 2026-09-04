import { SCENARIOS } from '../data/scenarios';
import { PROVINCE_BASE_CONFIGS, ProvinceBaseConfig } from '../data/provinceBaseConfig';
import { provinces } from '../data/provinces';
import { CityType } from './provinceBaseConfig';

/**
 * 光榮三國志風格 (Koei Sangokushi) 開局資源與兵力精密調配模型
 */

export interface ScenarioTargetOverrides {
  gold?: number;
  food?: number;
  totalTroops?: number;
}

/**
 * 各劇本歷史指定數值微調 (Target Presets)
 */
export const HISTORICAL_SCENARIO_TARGET_OVERRIDES: Record<number, Record<string, ScenarioTargetOverrides>> = {
  // 第1時代 (189年中平六年: 董卓專政，曹操舉兵)
  0: {
    '袁紹': { gold: 5500 },
    '袁術': { gold: 5000 },
    '曹操': { gold: 1300 },
    '孫堅': { gold: 1300 },
  },
  // 第2時代 (195年興平二年: 呂布弒董卓，李傕敗呂布)
  1: {
    '劉備': { totalTroops: 6500 },
    '楊奉': { gold: 1000 },
  },
  // 第三時代 (201年建安六年: 曹操敗袁紹，劉備投荊州)
  2: {
    '袁紹': { food: 250000 },
    '曹操': { food: 200000 },
  },
  // 第五時代 (215年建安二十年: 劉備收蜀，張魯降曹操)
  4: {
    '劉備': { totalTroops: 75000, food: 400000 },
    '孫權': { totalTroops: 75000, food: 450000 },
  }
};

export interface ScenarioRulerMultiplier {
  goldMult: number;
  foodMult: number;
  reserveTroopMult: number;
  soldierLoyalty: number;
}

export function getScenarioRulerMultiplier(scenarioIndex: number, rulerName: string, isCapital: boolean): ScenarioRulerMultiplier {
  let goldMult = 1.0;
  let foodMult = 1.0;
  let reserveTroopMult = 1.0;
  let soldierLoyalty = 80;

  switch (scenarioIndex) {
    case 0: // 189年 中平六年
      if (rulerName === '董卓') {
        goldMult = 1.8;
        foodMult = 2.0;
        reserveTroopMult = 2.0;
        soldierLoyalty = 75;
      } else if (rulerName === '袁紹' || rulerName === '袁術') {
        goldMult = 1.2;
        foodMult = 1.3;
        reserveTroopMult = 0.8;
      } else if (rulerName === '孔融' || rulerName === '陶謙') {
        // 第一時代：孔融陶謙兵力微增，配與多一點糧食跟金錢
        goldMult = 1.3;
        foodMult = 1.6;
        reserveTroopMult = 0.8;
      } else if (rulerName === '曹操' || rulerName === '劉備' || rulerName === '孫堅') {
        // 前期時代起兵：兵力少、金錢少、糧食少
        goldMult = 0.4;
        foodMult = 0.6;
        reserveTroopMult = 0.2;
      } else {
        goldMult = 0.6;
        foodMult = 0.8;
        reserveTroopMult = 0.4;
      }
      break;

    case 1: // 195年 興平二年
      if (rulerName === '曹操' || rulerName === '劉備') {
        // 第二時代：劉備曹操要減少兵力，配與差不多糧食跟金錢（避免武將過多造成不平衡）
        goldMult = 0.6;
        foodMult = 0.7;
        reserveTroopMult = 0.2;
      } else if (rulerName === '孫策') {
        // 第二時代：孫策剛起兵借兵，兵力調降至約 3500，糧餉金錢維持起家水準
        goldMult = 0.5;
        foodMult = 0.6;
        reserveTroopMult = 0.15;
      } else if (rulerName === '李傕') {
        // 李傕長安霸權，坐擁西涼鐵騎，兵力上調至 11000，儲蓄豐厚
        goldMult = 1.4;
        foodMult = 1.6;
        reserveTroopMult = 1.1;
      } else if (rulerName === '公孫瓚') {
        // 第二時代：公孫瓚兵力上調至 9000 左右，微幅增加金錢糧食避免被袁紹瞬間殲滅
        goldMult = 1.0;
        foodMult = 1.2;
        reserveTroopMult = 0.8;
      } else if (rulerName === '孔融') {
        // 第二時代：孔融兵力上調至 5000-6000 左右，微幅增加金錢糧食避免被袁紹瞬間殲滅
        goldMult = 1.0;
        foodMult = 1.2;
        reserveTroopMult = 0.8;
      } else if (rulerName === '袁紹' || rulerName === '袁術') {
        // 第二時代：袁紹袁術名門軍閥，稍微增加兵力，配與多一點糧食跟金錢
        goldMult = 1.4;
        foodMult = 1.6;
        reserveTroopMult = 1.1;
      } else if (rulerName === '劉表' || rulerName === '劉璋') {
        goldMult = 0.9;
        foodMult = 1.1;
        reserveTroopMult = 0.5;
      } else {
        goldMult = 0.6;
        foodMult = 0.8;
        reserveTroopMult = 0.4;
      }
      break;

    case 2: // 201年 建安六年
      if (rulerName === '袁紹') {
        // 袁紹兵力增加(整體約6.5萬)，金錢糧食增加
        goldMult = 1.55;
        foodMult = 1.8;
        reserveTroopMult = 1.25;
      } else if (rulerName === '曹操') {
        // 曹操兵力減少(整體約6萬)，金錢糧食減少(整體戰力跟袁紹差不多)
        goldMult = 0.95;
        foodMult = 1.1;
        reserveTroopMult = 0.68;
      } else if (rulerName === '劉備') {
        // 劉備兵力減半(整體約1.3萬)
        goldMult = 0.4;
        foodMult = 0.6;
        reserveTroopMult = 0.15;
      } else if (rulerName === '孫權') {
        // 孫權兵力減少1/3(整體約3.5萬左右)
        goldMult = 0.85;
        foodMult = 1.0;
        reserveTroopMult = 0.50;
      } else {
        goldMult = 0.8;
        foodMult = 0.9;
        reserveTroopMult = 0.6;
      }
      break;

    case 3: // 208年 建安十三年 (赤壁之戰)
      if (rulerName === '曹操') {
        // 第四時期曹操：總金錢約 55,000，總糧食約 650,000
        goldMult = 1.58;
        foodMult = 1.50;
        reserveTroopMult = 1.8;
      } else if (rulerName === '孫權') {
        goldMult = 1.6;
        foodMult = 1.8;
        reserveTroopMult = 1.5;
      } else if (rulerName === '劉備') {
        goldMult = 0.8;
        foodMult = 0.9;
        reserveTroopMult = 0.9;
      }
      break;

    case 4: // 215年 建安二十年 (漢中合肥爭奪)
      if (rulerName === '曹操') {
        goldMult = 2.0;
        foodMult = 2.2;
        reserveTroopMult = 2.0;
      } else if (rulerName === '劉備') {
        goldMult = 1.5;
        foodMult = 1.8;
        reserveTroopMult = 1.6;
      } else if (rulerName === '孫權') {
        goldMult = 1.7;
        foodMult = 1.8;
        reserveTroopMult = 1.5;
      }
      break;

    case 5: // 220年 黃初元年 (三國鼎立)
      if (rulerName === '曹丕') {
        goldMult = 2.2;
        foodMult = 2.4;
        reserveTroopMult = 2.2;
      } else if (rulerName === '劉備') {
        goldMult = 1.6;
        foodMult = 1.8;
        reserveTroopMult = 1.6;
      } else if (rulerName === '孫權') {
        goldMult = 1.8;
        foodMult = 1.9;
        reserveTroopMult = 1.6;
      }
      break;
  }

  // 首都 / 主君駐地加成
  if (isCapital) {
    goldMult *= 1.2;
    foodMult *= 1.2;
    reserveTroopMult *= 1.2;
  }

  return { goldMult, foodMult, reserveTroopMult, soldierLoyalty };
}

/**
 * 計算武將開局配備兵力（依職位、歷史勇武、統率與劇本時代調整）
 */
export function calculateStartingGeneralTroops(
  role: string,
  maxTroops: number,
  isRuler: boolean,
  str: number,
  int: number,
  tier: CityType,
  scenarioIndex: number = 0,
  rulerName: string = ''
): number {
  let baseScale = 1.0;

  if (scenarioIndex === 0) {
    if (rulerName === '董卓') {
      baseScale = 0.73; // 董卓專政霸權，兵力約 28000 造成極大威壓感
    } else if (rulerName === '公孫瓚') {
      baseScale = 0.70; // 幽州白馬將軍，精悍騎兵約 7000
    } else if (rulerName === '袁術') {
      baseScale = 0.67; // 豫南宛城大軍閥，兵力約 9500
    } else if (rulerName === '孔融' || rulerName === '陶謙') {
      baseScale = 0.60;
    } else if (['曹操', '劉備', '孫堅'].includes(rulerName)) {
      baseScale = 0.35;
    } else {
      baseScale = 0.45;
    }
  } else if (scenarioIndex === 1) {
    if (['曹操', '劉備'].includes(rulerName)) {
      baseScale = 0.28;
    } else if (rulerName === '孫策') {
      baseScale = 0.15; // 孫策初起兵借兵，兵力調降至約 3500
    } else if (rulerName === '李傕') {
      baseScale = 0.70; // 李傕西涼鐵騎，兵力上調至 11000
    } else if (rulerName === '公孫瓚') {
      baseScale = 0.67; // 公孫瓚上調至約 9000，強化幽州防線避免被袁紹瞬間殲滅
    } else if (rulerName === '孔融') {
      baseScale = 0.65; // 孔融上調至約 5600，強化北海防線避免被袁紹瞬間殲滅
    } else if (['袁紹', '袁術'].includes(rulerName)) {
      baseScale = 0.58;
    } else {
      baseScale = 0.45;
    }
  } else if (scenarioIndex === 2) {
    if (rulerName === '袁紹') {
      baseScale = 0.83;
    } else if (rulerName === '曹操') {
      baseScale = 0.50;
    } else if (rulerName === '劉備') {
      baseScale = 0.38;
    } else if (rulerName === '孫權') {
      baseScale = 0.48;
    } else {
      baseScale = 0.65;
    }
  }

  let baseTroops = 0;
  if (isRuler || role === '君主') {
    baseTroops = Math.round(5000 * baseScale);
  } else {
    let troopRatio = 0.5;
    switch (role) {
      case '大將':
      case '太守':
        troopRatio = str >= 90 ? 0.90 : 0.80;
        break;
      case '軍師':
        troopRatio = int >= 90 ? 0.75 : 0.65;
        break;
      case '副將':
        troopRatio = 0.65;
        break;
      case '參軍':
      case '裨將':
        troopRatio = 0.55;
        break;
      case '牙將':
      case '主簿':
      case '謀士':
      default:
        troopRatio = 0.45;
        break;
    }

    if (tier === 'FRONTIER') troopRatio *= 0.85;
    baseTroops = Math.round((maxTroops * troopRatio * baseScale) / 100) * 100;
  }

  return Math.max(300, Math.min(maxTroops, baseTroops));
}
