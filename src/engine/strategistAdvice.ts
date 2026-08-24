import { GameState, GeneralState } from '../types';
import { getGeneralItemBonus } from '../data/items';
import { getGeneralAmbition } from '../data/historicalLoyalty';

/**
 * 取得當前勢力的軍師 (必須智力 > 80；優先取得 role === '軍師' 且智力最高者，否則取勢力中智力 > 80 且最高者)
 */
export function getFactionStrategist(gameState: GameState): GeneralState | null {
  const playerProvinces = Object.values(gameState.provincesData)
    .filter(p => p.rulerName === gameState.rulerName)
    .map(p => p.id);

  if (playerProvinces.length === 0) return null;

  const playerGenerals = Object.values(gameState.generalsData)
    .filter(g => g.provinceId !== null && playerProvinces.includes(g.provinceId) && !g.isWild);

  if (playerGenerals.length === 0) return null;

  // 1. 優先尋找職級為 "軍師" 之武將 (智力含寶物需 > 80)
  const strategists = playerGenerals.filter(g => g.role === '軍師');
  if (strategists.length > 0) {
    strategists.sort((a, b) => {
      const aInt = a.int + getGeneralItemBonus(a.name, gameState.currentScenario).intBonus;
      const bInt = b.int + getGeneralItemBonus(b.name, gameState.currentScenario).intBonus;
      return bInt - aInt;
    });
    const bestStrat = strategists[0];
    const totalInt = bestStrat.int + getGeneralItemBonus(bestStrat.name, gameState.currentScenario).intBonus;
    if (totalInt > 80) {
      return bestStrat;
    }
  }

  // 2. 若無專任軍師，尋找麾下智力最高且智力 > 80 者
  const sortedByInt = [...playerGenerals].sort((a, b) => {
    const aInt = a.int + getGeneralItemBonus(a.name, gameState.currentScenario).intBonus;
    const bInt = b.int + getGeneralItemBonus(b.name, gameState.currentScenario).intBonus;
    return bInt - aInt;
  });
  const topGen = sortedByInt[0];
  const topTotalInt = topGen.int + getGeneralItemBonus(topGen.name, gameState.currentScenario).intBonus;
  if (topTotalInt > 80) {
    return topGen;
  }

  return null;
}

/**
 * 軍師對「尋訪人才」與「登用人才」進行成效推算與報告 (智力越高越精準)
 */
export function getStrategistReport(
  gameState: GameState,
  provinceId: number,
  action: string,
  actingGen: GeneralState | null,
  targetGenName?: string | null
): {
  strategist: GeneralState | null;
  quote: string;
  estimatedRate: number | null;
} {
  const strategist = getFactionStrategist(gameState);

  if (!strategist) {
    return {
      strategist: null,
      quote: '「主公，目前麾下尚未指派智謀深遠（智力>80）之軍師。建議前往『7. 君主』->『指定軍師』，指派智力大於 80 之文臣以預判戰局與推演情報。」',
      estimatedRate: null,
    };
  }

  // === 登用他國人才 ===
  if (action === '登用他國人才') {
    if (!targetGenName) {
      return {
        strategist,
        quote: strategist 
          ? `【軍師 ${strategist.name} 曰】：「主公，請先選擇欲密謀策反之敵國州郡與敵將。」`
          : `「主公，當前陣營中尚未指派軍師，無人可分析敵將離間機會。」`,
        estimatedRate: null,
      };
    }

    const targetGen = gameState.generalsData[targetGenName];
    if (!targetGen) {
      return {
        strategist,
        quote: '無此敵將資料。',
        estimatedRate: null,
      };
    }

    if (!strategist) {
      return {
        strategist: null,
        quote: `「主公，當前陣營中尚未指派軍師（需智力>80並任命為軍師）。無法深入剖析敵將【${targetGen.name}】的心志與離間機會，只能靠主公與使者自行估量摸索了！」`,
        estimatedRate: null,
      };
    }

    const targetAmbition = targetGen.ambition !== undefined ? targetGen.ambition : getGeneralAmbition(targetGen.name);
    const envoyPower = actingGen ? (actingGen.cha * 0.5 + actingGen.int * 0.3) : 40;
    const targetDefense = targetGen.loyalty * 0.8;
    const ambitionBonus = (targetAmbition - 3) * 4;
    const trueRate = Math.min(85, Math.max(1, Math.floor(envoyPower - targetDefense + ambitionBonus - 10)));

    let quote = '';
    if (trueRate >= 45) {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣密查敵將【${targetGen.name}】，其於敵陣忠誠動搖且頗有抱負志向！若派使者 ${actingGen ? actingGen.name : '賢士'} 攜厚禮前去遊說，極有良機引其棄暗投明！」`;
    } else if (trueRate >= 20) {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，敵將【${targetGen.name}】對其主尚有些許情誼，然非無隙可乘。派使者 ${actingGen ? actingGen.name : '使者'} 前往說服，成敗存乎一心，值得一試。」`;
    } else {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，敵將【${targetGen.name}】對其主極為忠耿且嚴防離間。此刻派人遊說恐怕徒勞無功，甚至鎩羽而歸。」`;
    }

    return { strategist, quote, estimatedRate: trueRate };
  }

  // === 登用人才 ===
  if (action === '登用人才') {
    if (!targetGenName) {
      return {
        strategist,
        quote: `【軍師 ${strategist.name} 曰】：「主公，本郡尚無已尋訪出仕之名士可供招攬。」`,
        estimatedRate: null,
      };
    }

    const trueRate = actingGen ? Math.min(95, Math.max(15, actingGen.cha - 10)) : 50;
    
    // 軍師智力越高，預測越準確。智力 100 為絕對準確，低智力會產生偏差
    const intFactor = (100 - strategist.int) / 100;
    // 使用固定的偽偏差確保 UI 渲染一致性
    const bias = strategist.int >= 95 ? 0 : (strategist.int < 75 ? -15 : 5);
    const estimatedRate = Math.min(98, Math.max(5, Math.round(trueRate + bias)));

    let quote = '';
    if (estimatedRate >= 75) {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，依臣之見，${actingGen ? actingGen.name : '此員'}風采氣度足可折服 ${targetGenName}，此去登用必能順利招致麾下！（預估成功率約 ${estimatedRate}%）」`;
    } else if (estimatedRate >= 45) {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，${targetGenName} 心志尚有些許猶豫，此去登用成敗各半，不妨一試。（預估成功率約 ${estimatedRate}%）」`;
    } else {
      quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，${targetGenName} 傲骨難屈，或禮數未周，此去說服恐難奏效。（預估成功率約 ${estimatedRate}%）」`;
    }

    return { strategist, quote, estimatedRate };
  }

  // === 尋訪人才 ===
  if (action === '尋訪人才') {
    const wildInProvince = Object.values(gameState.generalsData).filter(
      g => g.isWild && g.provinceId === provinceId
    );
    const undiscovered = wildInProvince.filter(
      g => !(gameState.wildGenerals || []).includes(g.name)
    );

    const trueChance = undiscovered.length > 0 
      ? Math.min(95, Math.max(35, (actingGen ? actingGen.cha : 50) + 15))
      : 0;

    let estimatedRate = 0;
    let quote = '';

    if (strategist.int >= 90) {
      if (undiscovered.length > 0) {
        estimatedRate = Math.min(95, Math.max(50, trueChance));
        quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣密查本郡地形與氣象，山川間必有奇士隱居！派員尋訪定有所獲！（預估成功率約 ${estimatedRate}%）」`;
      } else {
        estimatedRate = 0;
        quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣觀本郡地脈風土，目前此地並無奇士隱居，尋訪恐徒勞無功。（預估成功率 0%）」`;
      }
    } else {
      // 智力較低之軍師可能產生誤判
      if (undiscovered.length > 0) {
        estimatedRate = Math.min(85, Math.max(25, trueChance - 10));
        quote = `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣推算本郡或許有賢士隱於市井，不妨派人深入一探。（預估成功率約 ${estimatedRate}%）」`;
      } else {
        estimatedRate = Math.max(0, Math.round((85 - strategist.int) * 0.3));
        quote = estimatedRate > 0 
          ? `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣推測本郡或許尚有遺珠名士，但機會渺茫。（預估成功率約 ${estimatedRate}%）」`
          : `【軍師 ${strategist.name} (智: ${strategist.int}) 曰】：「主公，臣以為本郡似無奇士隱居。（預估成功率 0%）」`;
      }
    }

    return { strategist, quote, estimatedRate };
  }

  return { strategist: null, quote: '', estimatedRate: null };
}
