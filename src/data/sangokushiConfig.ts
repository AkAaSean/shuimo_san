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
        goldMult = 1.4;
        foodMult = 1.5;
        reserveTroopMult = 1.3; // 四世三公家底雄厚
      } else if (rulerName === '曹操' || rulerName === '劉備' || rulerName === '孫堅') {
        goldMult = 1.0;
        foodMult = 1.1;
        reserveTroopMult = 1.2; // 剛起兵
      }
      break;

    case 1: // 195年 興平二年
      if (rulerName === '曹操') {
        goldMult = 1.5;
        foodMult = 1.6;
        reserveTroopMult = 1.5;
      } else if (rulerName === '袁紹') {
        goldMult = 1.6;
        foodMult = 1.8;
        reserveTroopMult = 1.5;
      } else if (rulerName === '劉表' || rulerName === '劉璋') {
        goldMult = 1.3;
        foodMult = 1.5;
        reserveTroopMult = 1.1; // 荊益富庶
      }
      break;

    case 2: // 201年 建安六年
      if (rulerName === '曹操') {
        goldMult = 1.8;
        foodMult = 2.0;
        reserveTroopMult = 1.8; // 官渡勝後，中原霸主
      } else if (rulerName === '袁紹') {
        goldMult = 1.3;
        foodMult = 1.5;
        reserveTroopMult = 1.4; // 仍有河北雄厚兵員
      } else if (rulerName === '孫權') {
        goldMult = 1.4;
        foodMult = 1.5;
        reserveTroopMult = 1.3;
      }
      break;

    case 3: // 208年 建安十三年 (赤壁之戰)
      if (rulerName === '曹操') {
        goldMult = 2.2;
        foodMult = 2.5;
        reserveTroopMult = 2.2; // 兼併四州，百萬大軍南下
      } else if (rulerName === '孫權') {
        goldMult = 1.6;
        foodMult = 1.8;
        reserveTroopMult = 1.5; // 江東水鄉儲備充足
      } else if (rulerName === '劉備') {
        goldMult = 0.8;
        foodMult = 0.9;
        reserveTroopMult = 0.9; // 屯兵新野江夏，處境艱難
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
        reserveTroopMult = 1.6; // 兼併西川，府庫充實
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
        reserveTroopMult = 2.2; // 曹魏國力最強
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
    goldMult *= 1.3;
    foodMult *= 1.3;
    reserveTroopMult *= 1.4;
  }

  return { goldMult, foodMult, reserveTroopMult, soldierLoyalty };
}

/**
 * 計算武將開局配備兵力（依職位、歷史勇武、統率與最大兵力計算）
 * 參考光榮三國志：大將 1500~2800、軍師 1000~1800、副將 1000~1500、牙將/主簿 600~1000
 */
export function calculateStartingGeneralTroops(
  role: string,
  maxTroops: number,
  isRuler: boolean,
  str: number,
  int: number,
  tier: 'MEGAPOLIS' | 'MAJOR' | 'STANDARD' | 'FRONTIER'
): number {
  if (isRuler || role === '君主') {
    // 君主兵力為 5000
    return 5000;
  }
  if (role === '太守') {
    // 太守兵力為 4000
    return 4000;
  }

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

  // 邊遠郡略微降低開局配兵
  if (tier === 'FRONTIER') troopRatio *= 0.85;

  const troops = Math.round((maxTroops * troopRatio) / 100) * 100;
  return Math.max(500, Math.min(maxTroops, troops));
}
