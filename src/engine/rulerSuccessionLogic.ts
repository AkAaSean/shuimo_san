import { GameState, GeneralState } from '../types';

export const HISTORICAL_SUCCESSORS: Record<string, string[]> = {
  '劉備': ['劉禪', '劉封', '諸葛亮', '關羽', '張飛', '趙雲', '龐統'],
  '曹操': ['曹丕', '曹植', '曹彰', '曹仁', '夏侯惇', '夏侯淵', '司馬懿', '荀彧'],
  '孫堅': ['孫策', '孫權', '孫翊', '黃蓋', '程普', '韓當'],
  '孫策': ['孫權', '周瑜', '太史慈', '黃蓋', '程普'],
  '孫權': ['孫登', '孫休', '陸遜', '諸葛瑾', '步騭'],
  '袁紹': ['袁譚', '袁尚', '袁熙', '沮授', '田豐', '顏良', '文醜'],
  '袁術': ['袁耀', '紀靈', '雷薄'],
  '劉表': ['劉琦', '劉琮', '蔡瑁', '蒯越', '黃忠'],
  '劉璋': ['劉循', '張任', '嚴顏', '黃權', '法正'],
  '馬騰': ['馬超', '馬休', '馬鐵', '龐德', '韓遂'],
  '董卓': ['李傕', '郭汜', '華雄', '李儒', '賈詡'],
  '呂布': ['高順', '陳宮', '張遼'],
  '公孫瓚': ['公孫續', '趙雲', '嚴綱'],
  '張角': ['張寶', '張梁', '管亥'],
  '陶謙': ['劉備', '曹豹', '笮融'],
  '孔融': ['太史慈', '宗寶'],
  '韓馥': ['沮授', '張郃', '潘鳳'],
  '劉繇': ['太史慈', '張英', '樊能'],
  '王朗': ['虞翻', '周昕'],
  '嚴白虎': ['嚴輿']
};

/**
 * Evaluates candidates and picks the best AI successor for deadRulerName
 */
export function selectAISuccessor(candidates: GeneralState[], deadRulerName: string): GeneralState {
  const preferredList = HISTORICAL_SUCCESSORS[deadRulerName] || [];

  let bestGen = candidates[0];
  let maxScore = -999999;

  for (const gen of candidates) {
    const prefIndex = preferredList.indexOf(gen.name);
    let score = (gen.cha * 2.0) + (gen.pol * 1.5) + (gen.str * 1.2) + (gen.int * 1.0);
    
    // 歷史順位顯著加分
    if (prefIndex !== -1) {
      score += (2000 - prefIndex * 200);
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestGen = gen;
    }
  }

  return bestGen;
}

/**
 * Process ruler decapitation (斬首).
 * Returns informative result object and mutates baseState draft.
 */
export function handleRulerDecapitation(
  baseState: GameState,
  executedGeneralName: string,
  killerRulerName: string
): { isPlayerRuler: boolean; successorName?: string; isEliminated: boolean; eventMsg: string } {
  const isPlayerRuler = (executedGeneralName === baseState.rulerName);
  const isRulerOfAnyProvince = Object.values(baseState.provincesData).some(p => p.rulerName === executedGeneralName);

  // Mark the executed general as dead/wild
  const deadGen = baseState.generalsData[executedGeneralName];
  if (deadGen) {
    baseState.generalsData[executedGeneralName] = {
      ...deadGen,
      role: '武將',
      isCaptive: false,
      captiveOfRuler: null,
      provinceId: null,
      isWild: true,
      loyalty: 0,
      soldiers: 0
    };
  }

  if (!isPlayerRuler && !isRulerOfAnyProvince) {
    // Regular general execution, not a ruler
    return {
      isPlayerRuler: false,
      isEliminated: false,
      eventMsg: `⚔️【處決】${executedGeneralName} 已被斬首示眾！`
    };
  }

  // Find living candidate generals belonging to executedRulerName's faction
  const candidateGens = (Object.values(baseState.generalsData) as GeneralState[]).filter(g => {
    if (g.name === executedGeneralName || g.isWild || g.isCaptive || !g.provinceId) return false;
    const prov = baseState.provincesData[g.provinceId];
    return prov && prov.rulerName === executedGeneralName;
  });

  if (isPlayerRuler) {
    if (candidateGens.length === 0) {
      // Player eliminated - no generals left to succeed
      baseState.isGameOver = true;
      baseState.gameOverReason = `主公【${executedGeneralName}】陣亡斬首且麾下已無任何武將！全軍覆沒，勢力滅亡！`;
      const msg = `💀【勢力滅亡】主公【${executedGeneralName}】遭敵軍斬首處決！我軍後繼無人，天下霸業就此夢碎！`;
      if (!baseState.monthlyEvents) baseState.monthlyEvents = [];
      baseState.monthlyEvents.push(msg);
      return { isPlayerRuler: true, isEliminated: true, eventMsg: msg };
    } else {
      // Trigger Player Succession Modal
      baseState.pendingRulerSuccession = {
        executedRuler: executedGeneralName,
        killerRuler: killerRulerName,
        candidates: candidateGens.map(g => g.name)
      };
      const msg = `🚨【君主陣亡】主公【${executedGeneralName}】不幸遭斬首！請速於列表中挑選新君主以繼承大業！`;
      if (!baseState.monthlyEvents) baseState.monthlyEvents = [];
      baseState.monthlyEvents.push(msg);
      return { isPlayerRuler: true, isEliminated: false, eventMsg: msg };
    }
  } else {
    // AI Ruler Decapitation
    if (candidateGens.length === 0) {
      // AI Faction eliminated
      Object.values(baseState.provincesData).forEach(p => {
        if (p.rulerName === executedGeneralName) {
          baseState.provincesData[p.id] = { ...p, rulerName: null };
        }
      });
      const msg = `💀【勢力滅亡】敵首【${executedGeneralName}】遭斬首處決！因後繼無人，其麾下城池紛紛瓦解，淪為空城！`;
      if (!baseState.monthlyEvents) baseState.monthlyEvents = [];
      baseState.monthlyEvents.push(msg);
      return { isPlayerRuler: false, isEliminated: true, eventMsg: msg };
    } else {
      // AI Auto Successor Selection
      const successorGen = selectAISuccessor(candidateGens, executedGeneralName);
      const newRulerName = successorGen.name;

      // Update new ruler role
      baseState.generalsData[newRulerName] = {
        ...successorGen,
        role: '君主'
      };

      // Update all AI provinces rulerName
      Object.values(baseState.provincesData).forEach(p => {
        if (p.rulerName === executedGeneralName) {
          baseState.provincesData[p.id] = { ...p, rulerName: newRulerName };
        }
      });

      // Diplomatic Hatred towards Killer
      if (!baseState.diplomacyData) baseState.diplomacyData = {};
      if (!baseState.diplomacyData[newRulerName]) baseState.diplomacyData[newRulerName] = {};
      baseState.diplomacyData[newRulerName][killerRulerName] = 0;

      // Loyalty Shift for AI generals (shaken by succession)
      candidateGens.forEach(g => {
        if (g.name !== newRulerName && baseState.generalsData[g.name]) {
          const oldLoyalty = baseState.generalsData[g.name].loyalty || 50;
          baseState.generalsData[g.name] = {
            ...baseState.generalsData[g.name],
            loyalty: Math.max(20, Math.floor(oldLoyalty * 0.75) - 5)
          };
        }
      });

      const msg = `👑【勢力巨變】敵首【${executedGeneralName}】遭斬首處決！眾臣推舉【${newRulerName}】繼承大統，誓與仇敵決一死戰！`;
      if (!baseState.monthlyEvents) baseState.monthlyEvents = [];
      baseState.monthlyEvents.push(msg);
      return { isPlayerRuler: false, successorName: newRulerName, isEliminated: false, eventMsg: msg };
    }
  }
}

/**
 * Applies player's choice of successor when player ruler was decapitated
 */
export function applyPlayerSuccessorChoice(
  baseState: GameState,
  successorName: string
): GameState {
  const pending = baseState.pendingRulerSuccession;
  if (!pending) return baseState;

  const oldRulerName = pending.executedRuler;
  const killerRuler = pending.killerRuler;

  const nextState = {
    ...baseState,
    rulerName: successorName,
    pendingRulerSuccession: null,
    generalsData: { ...baseState.generalsData },
    provincesData: { ...baseState.provincesData },
    diplomacyData: baseState.diplomacyData ? { ...baseState.diplomacyData } : {}
  };

  // 1. Update successor general role
  const succGen = nextState.generalsData[successorName];
  if (succGen) {
    nextState.generalsData[successorName] = {
      ...succGen,
      role: '君主'
    };
  }

  // 2. Update all player provinces to new ruler
  Object.values(nextState.provincesData).forEach(p => {
    if (p.rulerName === oldRulerName) {
      nextState.provincesData[p.id] = {
        ...p,
        rulerName: successorName
      };
    }
  });

  // 3. Set deep hatred towards killer
  if (!nextState.diplomacyData[successorName]) {
    nextState.diplomacyData[successorName] = {};
  }
  nextState.diplomacyData[successorName][killerRuler] = 0;

  // 4. Loyalty shift for player generals based on new ruler charm (cha)
  const newCha = succGen?.cha || 70;
  const chaBonus = Math.floor((newCha - 70) / 2);

  Object.values(nextState.generalsData).forEach(g => {
    if (g.name !== successorName && !g.isWild && !g.isCaptive && g.provinceId) {
      const prov = nextState.provincesData[g.provinceId];
      if (prov && prov.rulerName === successorName) {
        const curLoyalty = g.loyalty || 70;
        nextState.generalsData[g.name] = {
          ...g,
          loyalty: Math.min(100, Math.max(30, curLoyalty + chaBonus))
        };
      }
    }
  });

  const msg = `👑【立新君】主公【${successorName}】正式登基，繼承大業！三軍歸心，誓為先主【${oldRulerName}】報血海深仇！`;
  if (!nextState.monthlyEvents) nextState.monthlyEvents = [];
  nextState.monthlyEvents.push(msg);

  return nextState;
}
