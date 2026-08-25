import { SCENARIOS } from '../data/scenarios';
import { PROVINCE_BASE_CONFIGS, ProvinceBaseConfig } from '../data/provinceBaseConfig';
import { provinces } from '../data/provinces';

/**
 * 光榮三國志風格 (Koei Sangokushi) 開局資源與兵力精密調配模型
 * 
 * 考量維度：
 * 1. 都市基礎體量 (Megapolis > Major > Standard > Frontier)
 * 2. 歷史時期劇本權重 (如赤壁之戰曹操全北方強勢、三國鼎立天下三分)
 * 3. 勢力首都 / 根據地加成 (國都金糧充足、兵員雄厚)
 * 4. 前線都市與後方重鎮的差異化防務儲備
 */

// 勢力特定時期加成係數 (根據歷史地位給予合理資源比例)
import { CityType } from './provinceBaseConfig';

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
        reserveTroopMult = 2.0; // 董卓專政掌控洛陽長安國庫
        soldierLoyalty = 75;
      } else if (rulerName === '袁紹' || rulerName === '袁術') {
        goldMult = 1.2;
        foodMult = 1.3;
        reserveTroopMult = 0.8; // 四世三公家底
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
      if (rulerName === '曹操' || rulerName === '劉備' || rulerName === '孫策') {
        // 早期發展：武將多但兵少金糧少
        goldMult = 0.5;
        foodMult = 0.7;
        reserveTroopMult = 0.3;
      } else if (rulerName === '袁紹') {
        goldMult = 1.2;
        foodMult = 1.3;
        reserveTroopMult = 0.8;
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
      if (rulerName === '曹操') {
        goldMult = 1.3;
        foodMult = 1.5;
        reserveTroopMult = 1.0;
      } else if (rulerName === '袁紹') {
        goldMult = 1.0;
        foodMult = 1.2;
        reserveTroopMult = 0.8;
      } else if (rulerName === '孫權') {
        goldMult = 1.0;
        foodMult = 1.2;
        reserveTroopMult = 0.7;
      } else if (rulerName === '劉備') {
        goldMult = 0.5;
        foodMult = 0.7;
        reserveTroopMult = 0.3;
      } else {
        goldMult = 0.8;
        foodMult = 0.9;
        reserveTroopMult = 0.6;
      }
      break;

    case 3: // 208年 建安十三年 (赤壁之戰)
      if (rulerName === '曹操') {
        goldMult = 2.2;
        foodMult = 2.5;
        reserveTroopMult = 2.2;
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
  const isEarlyDevRuler = (scenarioIndex <= 1) && ['曹操', '劉備', '孫堅', '孫策'].includes(rulerName);

  if (scenarioIndex === 0 || scenarioIndex === 1) {
    // 第 1、2 時代兵力至少減少一半 (約 50% ~ 65%)
    baseScale = isEarlyDevRuler ? 0.35 : 0.45;
  } else if (scenarioIndex === 2) {
    // 第 3 時代兵力至少減少 3 成 (約 30% ~ 35%)
    baseScale = 0.65;
  }

  let baseTroops = 0;
  if (isRuler || role === '君主') {
    baseTroops = Math.round(5000 * baseScale);
  } else if (role === '太守') {
    baseTroops = Math.round(4000 * baseScale);
  } else {
    let troopRatio = 0.5;
    switch (role) {
      case '大將':
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
