import { GameState, ProvinceState, GeneralState } from '../types';
import { provinces } from '../data/provinces';
import { generals } from '../data/generals';
import { SCENARIOS } from '../data/scenarios';
import { HIDDEN_TALENTS } from '../data/talents';
import { PROVINCE_BASE_CONFIGS } from '../data/provinceBaseConfig';
import { getScenarioRulerMultiplier, calculateStartingGeneralTroops } from '../data/sangokushiConfig';
import { getInitialGeneralLoyalty, getGeneralAmbition } from '../data/historicalLoyalty';
import { 
  getProvinceTierRules, 
  getHistoricalReserveMilitary, 
  getHistoricalInitialForts, 
  calculateDraftCost,
  calculateDraftDiscountRate,
  calculateMaxProvinceDraft,
  calculateTroopTrainingGain
} from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';
import { getFactionStrategist } from './strategistAdvice';

const SEASONS = ['春', '夏', '秋', '冬'];

function initializeDiplomacy(scenarioIndex: number, rulers: { name: string }[]): Record<string, Record<string, number>> {
  const data: Record<string, Record<string, number>> = {};
  const rulerNames = rulers.map(r => r.name);
  
  for (let i = 0; i < rulerNames.length; i++) {
    data[rulerNames[i]] = {};
    for (let j = 0; j < rulerNames.length; j++) {
      if (i === j) continue;
      // Base relation is 50
      let relation = 50;
      const r1 = rulerNames[i];
      const r2 = rulerNames[j];
      
      // ROTK-like relation hints
      if ((r1 === '劉備' && r2 === '孫權') || (r1 === '孫權' && r2 === '劉備')) relation = 65; // Sun-Liu alliance
      if ((r1 === '劉備' && r2 === '曹操') || (r1 === '曹操' && r2 === '劉備')) relation = 25; // Cao-Liu friction
      if ((r1 === '孫權' && r2 === '曹操') || (r1 === '曹操' && r2 === '孫權')) relation = 30; // Sun-Cao friction
      if ((r1 === '袁紹' && r2 === '曹操') || (r1 === '曹操' && r2 === '袁紹')) relation = scenarioIndex <= 1 ? 60 : 15; // Early allies, later enemies
      if ((r1 === '劉表' && r2 === '劉備') || (r1 === '劉備' && r2 === '劉表')) relation = 80;
      if ((r1 === '劉璋' && r2 === '劉備') || (r1 === '劉備' && r2 === '劉璋')) relation = scenarioIndex < 3 ? 75 : 40;
      if (r1 === '董卓' || r2 === '董卓') relation = 10; // Everyone hates Dong Zhuo
      if (r1 === '袁術' || r2 === '袁術') relation -= 20; // Yuan Shu is generally disliked

      // Slight random variation +/- 5
      relation += Math.floor(Math.random() * 11) - 5;
      relation = Math.max(0, Math.min(100, relation));
      
      data[rulerNames[i]][r2] = relation;
    }
  }
  return data;
}

export function initGame(scenarioIndex: number, playerRulerName: string): GameState {
  const provincesData: Record<number, ProvinceState> = {};
  const generalsData: Record<string, GeneralState> = {};
  const scenario = SCENARIOS[scenarioIndex];

  // 1. Initialize Provinces with base stats from PROVINCE_BASE_CONFIGS & Historical presets
  provinces.forEach(p => {
    const baseConfig = PROVINCE_BASE_CONFIGS[p.id] || {
      id: p.id,
      name: p.name,
      tier: 'MIDSIZED' as const,
      basePopulation: 10,
      baseDev: 110,
      baseCommerce: 110,
      baseDefense: 50,
      baseGold: 1000,
      baseFood: 12000,
      baseReserveTroops: 1500
    };

    const tierRules = getProvinceTierRules(p.id);
    const historicalMil = getHistoricalReserveMilitary(scenarioIndex, p.id);
    const initialForts = getHistoricalInitialForts(scenarioIndex, p.id);

    // 時代背景調整 (人口、土地加值、忠誠度)
    let popMult = 1.0;
    let devMult = 1.0;
    let loyBase = 75;

    const isNorth = p.id <= 20;
    const isLuoChang = p.id === 15 || p.id === 16; // 洛陽、長安
    const isJing = p.id >= 27 && p.id <= 34; // 荊州

    switch (scenarioIndex) {
      case 0: // 189 - 黃巾之亂後
        if (isNorth) {
          popMult = 0.5; devMult = 0.6; loyBase = 50;
        } else {
          popMult = 0.4; devMult = 0.4; loyBase = 65; // 南方尚未開發
        }
        break;
      case 1: // 195 - 董卓討伐後
        if (isLuoChang) {
          popMult = 0.4; devMult = 0.4; loyBase = 50; // 洛陽長安殘破
        } else if (isNorth) {
          popMult = 0.7; devMult = 0.8; loyBase = 60;
        } else {
          popMult = 0.5; devMult = 0.5; loyBase = 70; // 南方逐步發展
        }
        break;
      case 2: // 201 - 官渡之戰
        if (isNorth) {
          popMult = 0.8; devMult = 0.9; loyBase = 70; // 北方復甦
        } else {
          popMult = 0.6; devMult = 0.7; loyBase = 75;
        }
        break;
      case 3: // 208 - 赤壁之戰
        if (isNorth) {
          popMult = 0.9; devMult = 1.0; loyBase = 75;
        } else if (isJing) {
          popMult = 1.1; devMult = 1.1; loyBase = 80; // 荊州繁榮避難所
        } else {
          popMult = 0.8; devMult = 0.8; loyBase = 75;
        }
        break;
      case 4: // 215 - 三分天下雛形
        popMult = 1.1;
        devMult = 1.2;
        loyBase = 80;
        break;
      case 5: // 220 - 魏蜀吳鼎立
        popMult = 1.1;
        devMult = 1.3;
        loyBase = 80;
        break;
    }

    // 隨機在基準值上下浮動 5%
    const popVariance = (0.95 + Math.random() * 0.1) * popMult;
    const devVariance = Math.floor((Math.random() - 0.5) * 8);
    const commVariance = Math.floor((Math.random() - 0.5) * 8);
    const defVariance = Math.floor((Math.random() - 0.5) * 6);

    // 初始開發度與商業度降低至基準的 30% 左右，留給玩家內政空間
    const startingDev = Math.round((baseConfig.baseDev * 0.3 + devVariance) * devMult);
    const startingCommerce = Math.round(((baseConfig.baseCommerce || baseConfig.baseDev) * 0.3 + commVariance) * devMult);

    provincesData[p.id] = {
      id: p.id,
      rulerName: null,
      gold: Math.round(baseConfig.baseGold * 0.6), // 空城資源減半
      food: Math.round(baseConfig.baseFood * 0.5),
      population: Math.max(tierRules.minPopulation, Math.round(baseConfig.basePopulation * 10000 * popVariance)),
      soldiers: 0,
      value: Math.max(10, Math.min(tierRules.maxDev, startingDev)),
      commerce: Math.max(10, Math.min(tierRules.maxCommerce, startingCommerce)),
      flood: Math.max(10, Math.min(99, baseConfig.baseDefense + defVariance)),
      loyalty: loyBase + Math.floor(Math.random() * 10),
      price: 10 + Math.floor(Math.random() * 5),
      forts: initialForts,
      training: historicalMil.training,
      hasDraftedThisMonth: false
    };
  });

  // 2. Override for Ruler specific starting provinces with historical multipliers
  if (scenario) {
    scenario.rulers.forEach(ruler => {
      // 第一個都市通常為首都/君主所在大本營
      const capitalProvinceId = ruler.provinces.length > 0 ? ruler.provinces[0] : -1;

      ruler.provinces.forEach(provinceId => {
        const pState = provincesData[provinceId];
        const baseConfig = PROVINCE_BASE_CONFIGS[provinceId];
        const tierRules = getProvinceTierRules(provinceId);

        if (pState && baseConfig) {
          const isCapital = provinceId === capitalProvinceId;
          const mult = getScenarioRulerMultiplier(scenarioIndex, ruler.name, isCapital);

          pState.rulerName = ruler.name;
          pState.gold = Math.round(baseConfig.baseGold * mult.goldMult);
          pState.food = Math.round(baseConfig.baseFood * mult.foodMult);
          pState.soldiers = Math.round(baseConfig.baseReserveTroops * mult.reserveTroopMult);
          pState.loyalty = Math.min(95, mult.soldierLoyalty + (isCapital ? 10 : 5));
          pState.value = Math.min(tierRules.maxDev, Math.round(pState.value * (isCapital ? 1.2 : 1.0)));
          pState.commerce = Math.min(tierRules.maxCommerce, Math.round((pState.commerce || 20) * (isCapital ? 1.2 : 1.0)));
          pState.flood = Math.min(99, Math.round(baseConfig.baseDefense * (isCapital ? 1.1 : 1.0)));
        }
      });
    });
  }

  // 2.5 空白地額外懲罰
  Object.values(provincesData).forEach(pState => {
    if (pState.rulerName === null) {
      pState.value = Math.max(5, Math.round(pState.value * 0.7)); // 空白地開發度降低
      pState.commerce = Math.max(5, Math.round((pState.commerce || 10) * 0.7)); // 空白地商業度降低
      pState.loyalty = Math.max(10, pState.loyalty - 20); // 空白地忠誠度降低
    }
  });

  // 3. Initialize Generals with historical military rank & troops
  generals.forEach(g => {
    const loc = g.scenarios[scenarioIndex];
    let provinceId: number | null = null;
    let isRuler = false;

    if (loc === '主') {
      isRuler = true;
      // Find the province where this ruler is based on scenarios
      const rulerConfig = scenario?.rulers.find(r => r.name === g.name);
      if (rulerConfig && rulerConfig.provinces.length > 0) {
        provinceId = rulerConfig.provinces[0];
      }
    } else if (typeof loc === 'number') {
      provinceId = loc;
    }

    if (loc !== '-' && loc !== 'Ｘ') {
      const cityTier = provinceId && PROVINCE_BASE_CONFIGS[provinceId]
        ? PROVINCE_BASE_CONFIGS[provinceId].tier
        : 'MIDSIZED';

      let effectiveRole = isRuler ? '君主' : g.role;
      let effectiveMaxTroops = g.maxTroops;

      if (isRuler) {
        effectiveMaxTroops = 5000;
      } else if (effectiveRole === '太守') {
        effectiveMaxTroops = 4000;
      } else if (effectiveRole === '大將' || effectiveRole === '軍師') {
        effectiveMaxTroops = 3000;
      } else if (effectiveRole === '副將' || effectiveRole === '參軍') {
        effectiveMaxTroops = 2500;
      } else if (effectiveRole === '裨將' || effectiveRole === '主簿') {
        effectiveMaxTroops = 2000;
      } else if (effectiveRole === '牙將' || effectiveRole === '謀士') {
        effectiveMaxTroops = 1500;
      } else {
        effectiveMaxTroops = g.maxTroops || 2000;
      }

      // 依職級、能力、都市規模計算開局自帶兵力
      const rulerConfig = scenario?.rulers.find(r => r.name === g.name || r.name === (provinceId ? provincesData[provinceId]?.rulerName : ''));
      const startingSoldiers = calculateStartingGeneralTroops(
        effectiveRole,
        effectiveMaxTroops,
        isRuler,
        g.str,
        g.int,
        cityTier,
        scenarioIndex,
        isRuler ? g.name : (rulerConfig?.name || '')
      );

      // 武將訓練度依武力/智力與身份給予合適開局值 (50~88)
      const baseTraining = Math.min(90, Math.max(50, Math.round((g.str + g.hp) / 2.3)));

      generalsData[g.name] = {
        name: g.name,
        role: effectiveRole,
        maxTroops: effectiveMaxTroops,
        hp: g.hp,
        int: g.int,
        str: g.str,
        pol: g.pol,
        cha: g.cha,
        ambition: getGeneralAmbition(g.name),
        loyalty: getInitialGeneralLoyalty(g.name, scenarioIndex, isRuler, effectiveRole, g.cha),
        provinceId: provinceId,
        isRuler: isRuler,
        soldiers: startingSoldiers,
        training: baseTraining,
        hasActed: false
      };
    }
  });

  // 3.5 自動為無君主駐守之郡縣冊封首任太守
  Object.values(provincesData).forEach(p => {
    const provGens = Object.values(generalsData).filter(g => g.provinceId === p.id && !g.isWild && !g.isRuler);
    const hasRulerInProv = Object.values(generalsData).some(g => g.provinceId === p.id && g.isRuler);
    if (provGens.length > 0 && !hasRulerInProv) {
      const sorted = [...provGens].sort((a, b) => (b.pol + b.cha + b.str) - (a.pol + a.cha + a.str));
      const topGen = sorted[0];
      topGen.role = '太守';
      topGen.maxTroops = 4000;
      topGen.soldiers = calculateStartingGeneralTroops(
        '太守',
        4000,
        false,
        topGen.str,
        topGen.int,
        PROVINCE_BASE_CONFIGS[p.id]?.tier || 'MIDSIZED',
        scenarioIndex,
        p.rulerName || ''
      );
    }
  });

  // 4. Initialize Wild Talents in this scenario
  const currentYear = scenario ? scenario.year : 189;
  HIDDEN_TALENTS.forEach(ht => {
    // If not already in generalsData and matches scenario
    if (!generalsData[ht.name] && ht.scenarios.includes(scenarioIndex) && currentYear >= ht.minYear) {
      generalsData[ht.name] = {
        name: ht.name,
        role: ht.role,
        maxTroops: ht.maxTroops,
        hp: ht.hp,
        int: ht.int,
        str: ht.str,
        pol: ht.pol,
        cha: ht.cha,
        ambition: getGeneralAmbition(ht.name),
        loyalty: 50,
        provinceId: ht.provinceId,
        isRuler: false,
        soldiers: 0,
        training: 40,
        hasActed: false,
        isWild: true, // Marked as wild in this province
        bio: ht.desc
      };
    }
  });

  // 4.5 兵力與武將數量平衡校驗 (每個城市至少 2 名武將，前線城市至少 4 名)
  if (scenario) {
    scenario.rulers.forEach(ruler => {
      const rulerProvinces = ruler.provinces;
      if (rulerProvinces.length === 0) return;

      const isFrontline = (pid: number) => {
        const pDef = provinces.find(x => x.id === pid);
        if (!pDef) return false;
        return pDef.connections.some(nid => provincesData[nid]?.rulerName !== ruler.name);
      };

      // 檢查並調配武將，滿足前線 >=4，後方 >=2
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 200) {
        changed = false;
        iterations++;

        // 找到缺人最嚴重的城市
        let minProvId: number | null = null;
        let maxDeficit = 0;

        for (const pid of rulerProvinces) {
          const req = isFrontline(pid) ? 4 : 2;
          const currentCount = Object.values(generalsData).filter(g => g.provinceId === pid && !g.isWild).length;
          const deficit = req - currentCount;
          if (deficit > maxDeficit) {
            maxDeficit = deficit;
            minProvId = pid;
          }
        }

        if (minProvId !== null && maxDeficit > 0) {
          // 尋找富餘武將最多的城市 (餘額 > 0)
          let donorProvId: number | null = null;
          let maxSurplus = 0;

          for (const pid of rulerProvinces) {
            if (pid === minProvId) continue;
            const req = isFrontline(pid) ? 4 : 2;
            const currentCount = Object.values(generalsData).filter(g => g.provinceId === pid && !g.isWild).length;
            const surplus = currentCount - req;
            if (surplus > maxSurplus) {
              maxSurplus = surplus;
              donorProvId = pid;
            }
          }

          if (donorProvId !== null && maxSurplus > 0) {
            // 從 donor 轉移一名非君主、非太守（或能力較次要）武將到 target
            const donorGens = Object.values(generalsData)
              .filter(g => g.provinceId === donorProvId && !g.isWild && !g.isRuler)
              .sort((a, b) => (a.role === '太守' ? 1 : 0) - (b.role === '太守' ? 1 : 0));

            if (donorGens.length > 0) {
              const movedGen = donorGens[donorGens.length - 1]; // 優先移出普通將領
              movedGen.provinceId = minProvId;
              changed = true;
            }
          } else {
            // 若該勢力總武將不足，則將該城市的在野人才直接錄用
            const wildGen = Object.values(generalsData).find(g => g.provinceId === minProvId && g.isWild);
            if (wildGen) {
              wildGen.isWild = false;
              wildGen.loyalty = 80;
              wildGen.soldiers = calculateStartingGeneralTroops(
                wildGen.role,
                wildGen.maxTroops,
                false,
                wildGen.str,
                wildGen.int,
                PROVINCE_BASE_CONFIGS[minProvId]?.tier || 'MIDSIZED',
                scenarioIndex,
                ruler.name
              );
              changed = true;
            } else {
              // 自動為小勢力補足基層偏將，確保守備力量 (符合 PRD 第2條規範：前線>=4, 後方>=2)
              const provName = provinces.find(x => x.id === minProvId)?.name || '城';
              const countExisting = Object.values(generalsData).filter(g => g.provinceId === minProvId && !g.isWild).length;
              const newGenName = `${ruler.name}_${provName}_衛將${countExisting + 1}`;
              if (!generalsData[newGenName]) {
                const newGenTroops = calculateStartingGeneralTroops(
                  '裨將',
                  2000,
                  false,
                  65,
                  55,
                  PROVINCE_BASE_CONFIGS[minProvId]?.tier || 'MIDSIZED',
                  scenarioIndex,
                  ruler.name
                );
                generalsData[newGenName] = {
                  name: newGenName,
                  role: '裨將',
                  maxTroops: 2000,
                  hp: 68 + Math.floor(Math.random() * 8),
                  int: 55 + Math.floor(Math.random() * 10),
                  str: 65 + Math.floor(Math.random() * 10),
                  pol: 50 + Math.floor(Math.random() * 10),
                  cha: 60 + Math.floor(Math.random() * 10),
                  ambition: 40,
                  loyalty: 85,
                  provinceId: minProvId,
                  isRuler: false,
                  soldiers: newGenTroops,
                  training: 60,
                  hasActed: false
                };
                changed = true;
              }
            }
          }
        }
      }
    });
  }

  // 4.6 多領地勢力武將平均分散與上限校驗 (防止十數名武將過度集中於單一城市)
  if (scenario) {
    scenario.rulers.forEach(ruler => {
      const rulerProvinces = ruler.provinces;
      if (rulerProvinces.length <= 1) return; // 單一領土勢力不分散

      const isFrontline = (pid: number) => {
        const pDef = provinces.find(x => x.id === pid);
        if (!pDef) return false;
        return pDef.connections.some(nid => provincesData[nid]?.rulerName !== ruler.name);
      };

      const allRulerGens = Object.values(generalsData).filter(g => !g.isWild && rulerProvinces.includes(g.provinceId!));
      const totalGens = allRulerGens.length;
      const avgGens = totalGens / rulerProvinces.length;
      // 計算該勢力單一城池允許的武將上限 (避免超過平均數，且最小上限不小於 5)
      const maxAllowed = Math.max(5, Math.ceil(avgGens));

      let changed = true;
      let iterations = 0;
      while (changed && iterations < 300) {
        changed = false;
        iterations++;

        // 尋找武將數量超過上限最多的城池
        let maxProvId: number | null = null;
        let maxCount = maxAllowed;

        for (const pid of rulerProvinces) {
          const count = Object.values(generalsData).filter(g => g.provinceId === pid && !g.isWild).length;
          if (count > maxCount) {
            maxCount = count;
            maxProvId = pid;
          }
        }

        if (maxProvId !== null) {
          // 尋找低於上限的目標城池 (優先選擇人數少者、前線者)
          const candidateDests = rulerProvinces.filter(pid => {
            if (pid === maxProvId) return false;
            const count = Object.values(generalsData).filter(g => g.provinceId === pid && !g.isWild).length;
            return count < maxAllowed;
          });

          if (candidateDests.length > 0) {
            candidateDests.sort((a, b) => {
              const countA = Object.values(generalsData).filter(g => g.provinceId === a && !g.isWild).length;
              const countB = Object.values(generalsData).filter(g => g.provinceId === b && !g.isWild).length;
              if (countA !== countB) return countA - countB;
              const frontA = isFrontline(a) ? 1 : 0;
              const frontB = isFrontline(b) ? 1 : 0;
              return frontB - frontA; // 前線優先
            });

            const targetProvId = candidateDests[0];

            // 從超標城池選擇一名非君主武將移往目標城池 (優先移出一般將領，保留太守)
            const candidates = Object.values(generalsData)
              .filter(g => g.provinceId === maxProvId && !g.isWild && !g.isRuler)
              .sort((a, b) => (a.role === '太守' ? 1 : 0) - (b.role === '太守' ? 1 : 0));

            if (candidates.length > 0) {
              const movedGen = candidates[candidates.length - 1];
              movedGen.provinceId = targetProvId;
              changed = true;
            }
          }
        }
      }
    });
  }

  // 4.8 確保所有城池糧食足以供應 18~24 個月消耗 (每 10 人/月 消耗 1 糧)
  Object.values(provincesData).forEach(pState => {
    if (pState.rulerName !== null) {
      const stationedGens = Object.values(generalsData).filter(g => g.provinceId === pState.id && !g.isWild);
      const totalTroops = (pState.soldiers || 0) + stationedGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);
      const monthlyConsumption = Math.floor(totalTroops * 0.1);
      // 確保至少供應 22 個月
      const minFood = Math.max(pState.food, monthlyConsumption * 22, 10000);
      pState.food = minFood;
    }
  });

  // Find player's primary starting province
  const playerRulerConfig = scenario?.rulers.find(r => r.name === playerRulerName);
  const initialPlayerProvinceId = playerRulerConfig && playerRulerConfig.provinces.length > 0
    ? playerRulerConfig.provinces[0]
    : (Object.values(provincesData).find(p => p.rulerName === playerRulerName)?.id ?? 1);

  return {
    currentScenario: scenarioIndex,
    year: scenario ? scenario.year : 189,
    month: 1,
    season: '春',
    rulerName: playerRulerName,
    popularity: 50,
    gold: 0,
    food: 0,
    selectedProvinceId: initialPlayerProvinceId,
    activeMenu: null,
    view: 'map',
    provincesData,
    generalsData,
    diplomacyData: scenario ? initializeDiplomacy(scenarioIndex, scenario.rulers) : {},
    alliances: {},
    wildGenerals: []
  };
}

export function executeCommand(state: GameState, provinceId: number, category: string, action: string, generalName?: string, payload?: any): GameState {
  let newState: GameState = { 
    ...state, 
    provincesData: { ...state.provincesData },
    generalsData: { ...state.generalsData }
  };
  const province = { ...newState.provincesData[provinceId] };
  const tierRules = getProvinceTierRules(provinceId);
  
  // Find executing general if provided
  let actingGen = generalName && newState.generalsData[generalName] ? { ...newState.generalsData[generalName] } : null;

  if (category === '內政') {
    // 嚴格依據所選武將之政治 (pol) 能力計算，不可自動取最高
    if (!actingGen || actingGen.hasActed) {
      return state; // 已行動過或無效武將
    }
    const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
    const totalPol = actingGen.pol + itemBonus.polBonus;
    
    if (action === '土地開發') {
      const devCost = 100; // 一次 100 金
      if (province.gold >= devCost) {
        province.gold -= devCost;
        // 採用更嚴苛的指數公式：政治力極端衰減，政治100最多提升約15
        const polFactor = Math.floor(Math.pow(Math.max(0, totalPol) / 100, 3) * 12);
        const increase = Math.max(1, polFactor) + Math.floor(Math.random() * 4);
        province.value = Math.min(tierRules.maxDev, province.value + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '商業開發' || action === '開發商業') {
      const commCost = 100; // 一次 100 金
      if (province.gold >= commCost) {
        province.gold -= commCost;
        // 採用更嚴苛的指數公式：政治力極端衰減，政治100最多提升約15
        const polFactor = Math.floor(Math.pow(Math.max(0, totalPol) / 100, 3) * 12);
        const increase = Math.max(1, polFactor) + Math.floor(Math.random() * 4);
        province.commerce = Math.min(tierRules.maxCommerce, (province.commerce || 0) + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '洪水防治') {
      const floodCost = 100; // 一次 100 金
      if (province.gold >= floodCost) {
        province.gold -= floodCost;
        const polFactor = Math.floor(Math.pow(Math.max(0, totalPol) / 100, 3) * 12);
        const decrease = Math.max(1, polFactor) + Math.floor(Math.random() * 4) + 1;
        province.flood = Math.max(0, province.flood - decrease);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '建築關寨' && payload) {
      const cost = province.price * 100;
      const totalPol = actingGen.pol + itemBonus.polBonus;
      let turnsRequired = 0;
      if (totalPol >= 91) turnsRequired = 1;
      else if (totalPol >= 81) turnsRequired = 2;
      else if (totalPol >= 71) turnsRequired = 3;
      else if (totalPol >= 61) turnsRequired = 4;

      if (
        turnsRequired > 0 && 
        province.gold >= cost && 
        province.forts.length < tierRules.maxForts &&
        !province.underConstructionFort
      ) {
        province.gold -= cost;
        province.underConstructionFort = {
          x: payload.x,
          y: payload.y,
          turnsLeft: turnsRequired,
          builderName: actingGen.name
        };
        actingGen.hasActed = true;
        actingGen.activeTask = { type: 'BUILD_FORT', turnsLeft: turnsRequired };
        newState.generalsData[actingGen.name] = actingGen;
      }
    }
  } else if (category === '商業') {
    if (!actingGen || actingGen.hasActed) {
      return state;
    }
    const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
    const totalPol = actingGen.pol + itemBonus.polBonus;
    const totalCha = actingGen.cha + itemBonus.chaBonus;

    if (action === '商業開發' || action === '開發商業') {
      const commCost = 100; // 一次 100 金
      if (province.gold >= commCost) {
        province.gold -= commCost;
        const polFactor = Math.floor(Math.pow(Math.max(0, totalPol) / 100, 3) * 12);
        const increase = Math.max(1, polFactor) + Math.floor(Math.random() * 4);
        province.commerce = Math.min(tierRules.maxCommerce, (province.commerce || 0) + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '買入米糧' && payload) {
      const goldSpent = payload.gold || 10;
      if (province.gold >= goldSpent) {
        // 政治能力可談到更好的米價
        const rate = 1 + (totalPol / 200); // 1.0 ~ 1.5 倍
        const foodGained = Math.floor(goldSpent * 10 * rate);
        province.gold -= goldSpent;
        province.food += foodGained;
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '賣出米糧' && payload) {
      const foodSold = payload.food || 100;
      if (province.food >= foodSold) {
        const rate = 0.8 + (totalPol / 250);
        const goldGained = Math.max(1, Math.floor((foodSold / 10) * rate));
        province.food -= foodSold;
        province.gold += goldGained;
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '開倉賑民') {
      const foodCost = payload?.food || 100;
      if (province.food >= foodCost) {
        province.food -= foodCost;
        const loyaltyGain = Math.floor(totalCha / 10) + 2;
        province.loyalty = Math.min(100, province.loyalty + loyaltyGain);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    }
  } else if (category === '兵士') {
    if (action === '徵兵' && payload) {
      const { amount, allocations, targetGeneralName } = payload;
      
      // 每月每城限徵兵一次
      if (province.hasDraftedThisMonth) {
        newState.lastActionResult = {
          action: '徵兵',
          type: 'failure',
          title: '⚠️ 徵兵限制：本月已徵過兵',
          message: `本郡本月已執行過徵兵，不可過度徵發徭役，需待下月方可再次招募新兵！`,
        };
        return newState;
      }

      if (actingGen && !actingGen.hasActed && amount > 0) {
        const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
        const totalCha = actingGen.cha + itemBonus.chaBonus;
        const goldCost = calculateDraftCost(amount, totalCha);
        const discountRate = calculateDraftDiscountRate(totalCha);
        const discountPct = Math.round(discountRate * 100);
        const maxDraftAllowed = calculateMaxProvinceDraft(province.population, tierRules.minPopulation);

        if (amount <= maxDraftAllowed && province.gold >= goldCost && (province.population - amount) >= tierRules.minPopulation) {
          province.gold -= goldCost;
          province.population -= amount;
          province.hasDraftedThisMonth = true;
          actingGen.hasActed = true;
          newState.generalsData[actingGen.name] = actingGen;

          const rookieTraining = 35; // 新兵基礎訓練度 35
          const resultLines: string[] = [];

          // 若有詳細 allocations 字典則逐一分配，否則指派給單一 targetGeneral
          if (allocations && typeof allocations === 'object' && Object.keys(allocations).length > 0) {
            Object.entries(allocations).forEach(([gName, addCount]) => {
              const targetGen = newState.generalsData[gName];
              const count = Number(addCount) || 0;
              if (targetGen && targetGen.provinceId === provinceId && count > 0) {
                const oldSoldiers = targetGen.soldiers || 0;
                const oldTraining = targetGen.training || 50;
                const newSoldiers = Math.min(targetGen.maxTroops, oldSoldiers + count);
                const actualAdded = newSoldiers - oldSoldiers;

                if (newSoldiers > 0) {
                  targetGen.training = Math.round((oldSoldiers * oldTraining + actualAdded * rookieTraining) / newSoldiers);
                }
                targetGen.soldiers = newSoldiers;
                newState.generalsData[gName] = targetGen;
                resultLines.push(`• 【${targetGen.name}】入伍 +${actualAdded.toLocaleString()} 兵（現有 ${targetGen.soldiers.toLocaleString()}/${targetGen.maxTroops.toLocaleString()} 人，訓練度 ${oldTraining}% ➔ ${targetGen.training}%）`);
              }
            });
          } else {
            const targetGen = newState.generalsData[targetGeneralName || actingGen.name];
            if (targetGen && targetGen.provinceId === provinceId) {
              const oldSoldiers = targetGen.soldiers || 0;
              const oldTraining = targetGen.training || 50;
              const newSoldiers = Math.min(targetGen.maxTroops, oldSoldiers + amount);
              const actualAdded = newSoldiers - oldSoldiers;

              if (newSoldiers > 0) {
                targetGen.training = Math.round((oldSoldiers * oldTraining + actualAdded * rookieTraining) / newSoldiers);
              }
              targetGen.soldiers = newSoldiers;
              newState.generalsData[targetGen.name] = targetGen;
              resultLines.push(`• 【${targetGen.name}】入伍 +${actualAdded.toLocaleString()} 兵（現有 ${targetGen.soldiers.toLocaleString()}/${targetGen.maxTroops.toLocaleString()} 人，訓練度 ${oldTraining}% ➔ ${targetGen.training}%）`);
            }
          }

          newState.lastActionResult = {
            action: '徵兵',
            type: 'success',
            title: '🚩 徵召新兵報告',
            message: `主持募兵：【${actingGen.name}】（魅力 ${totalCha}，徵兵開銷節省 ${discountPct}%）\n本月徵募新兵總數：${amount.toLocaleString()} 人（消耗軍資 ${goldCost.toLocaleString()} 金，原價 ${amount.toLocaleString()} 金，省 ${Math.max(0, amount - goldCost).toLocaleString()} 金）\n\n新兵分配詳情：\n` + resultLines.join('\n'),
            actorGeneral: actingGen.name,
          };
        }
      }
    } else if (action === '訓練兵士' && payload) {
      const { generalName: trainerName } = payload;
      const trainer = newState.generalsData[trainerName || actingGen?.name];
      if (trainer && trainer.provinceId === provinceId && !trainer.hasActed) {
        const itemBonus = getGeneralItemBonus(trainer.name, state.currentScenario);
        const totalStr = trainer.str + itemBonus.strBonus;

        // 全軍整體操練：所有駐防武將部隊同時受訓，依據各部隊人數動態精密計算訓練增長（人數少上升快）
        const trainedList: string[] = [];
        let totalSoldiersTrained = 0;

        Object.values(newState.generalsData).forEach(g => {
          if (g.provinceId === provinceId && !g.isWild) {
            if (g.soldiers > 0) {
              const oldT = g.training;
              const gain = calculateTroopTrainingGain(totalStr, g.soldiers, oldT);
              g.training = Math.min(100, oldT + gain);
              totalSoldiersTrained += g.soldiers;
              trainedList.push(`• 【${g.name}】(${g.soldiers.toLocaleString()}人) 訓練度 ${oldT}% ➔ ${g.training}% (+${gain}%)`);
            } else {
              trainedList.push(`• 【${g.name}】(無士兵，未參加操演)`);
            }
          }
        });

        trainer.hasActed = true;
        newState.generalsData[trainer.name] = trainer;

        newState.lastActionResult = {
          action: '訓練兵士',
          type: 'success',
          title: '⚔️ 全軍操演報告',
          message: `總教官【${trainer.name}】（武力 ${totalStr}）親率全郡將領部隊進行全軍大會操！\n（人數少之精銳部隊受訓集中，訓練度上升更迅速）\n\n操練部隊總人數：${totalSoldiersTrained.toLocaleString()} 人\n各部隊訓練成果：\n` + trainedList.join('\n'),
          actorGeneral: trainer.name,
        };
      }
    } else if ((action === '編制兵力' || action === '調整兵力') && payload) {
      const { allocations } = payload;
      if (actingGen && !actingGen.hasActed) {
        for (const [gName, newAmountRaw] of Object.entries(allocations)) {
          const gen = newState.generalsData[gName];
          const newAmount = Math.max(0, Math.min(gen?.maxTroops || 3000, Number(newAmountRaw) || 0));
          if (gen && gen.provinceId === provinceId) {
            gen.soldiers = newAmount;
          }
        }
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;

        newState.lastActionResult = {
          action: '編制兵力',
          type: 'success',
          title: '📋 軍隊編制調整報告',
          message: `【${actingGen.name}】主持全郡兵力重新編制完成！\n各將領部隊兵額已按軍令重新調配就位。`,
          actorGeneral: actingGen.name,
        };
      }
    }
  } else if (category === '軍事') {
    if ((action === '調動軍隊' || action === '武將調動') && payload) {
      const { generalNames, targetProvinceId } = payload;
      const targetProv = newState.provincesData[targetProvinceId];
      if (targetProv && Array.isArray(generalNames)) {
        let rulerMoved = false;
        generalNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          // 已經執行過任務之武將，不能移動
          if (gen && gen.provinceId === provinceId && !gen.hasActed) {
            gen.provinceId = targetProvinceId;
            gen.hasActed = true; // 移動後本月已行動
            newState.generalsData[gName] = gen;
            if (gen.name === state.rulerName) rulerMoved = true;
          }
        });
        
        if (rulerMoved && targetProv.isAutonomous) {
          targetProv.isAutonomous = false;
          newState.provincesData[targetProvinceId] = targetProv;
        }
      }
    } else if (action === '發動戰役' && payload) {
      const { attackingGeneralNames, targetProvinceId } = payload;
      if (Array.isArray(attackingGeneralNames)) {
        attackingGeneralNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          // 已經執行過任務之武將，不能參與發動戰役
          if (gen && !gen.hasActed) {
            gen.hasActed = true;
            newState.generalsData[gName] = gen;
          }
        });
        
        const defendingGenerals = Object.values(newState.generalsData)
          .filter(g => g.provinceId === targetProvinceId && !g.isWild)
          .map(g => g.name);

        newState.activeBattle = {
          targetProvinceId,
          attackerProvinceId: provinceId,
          attackingGenerals: attackingGeneralNames,
          defendingGenerals
        };
      }
    } else if (action === '運送錢糧' && payload) {
      const { targetProvinceId, gold, food } = payload;
      const targetProv = newState.provincesData[targetProvinceId];
      if (actingGen && !actingGen.hasActed && targetProv) {
        const moveGold = Math.min(province.gold, Math.max(0, gold || 0));
        const moveFood = Math.min(province.food, Math.max(0, food || 0));
        province.gold -= moveGold;
        province.food -= moveFood;
        targetProv.gold += moveGold;
        targetProv.food += moveFood;
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
        newState.provincesData[targetProvinceId] = targetProv;
      }
    }
  } else if (category === '謀略') {
    if (!actingGen || actingGen.hasActed) {
      return state;
    }
    const intel = actingGen.int;
    const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
    const atkInt = intel + itemBonus.intBonus;
    const atkCha = actingGen.cha + itemBonus.chaBonus;
    const targetProvId = payload?.targetProvinceId;
    const targetProv = targetProvId ? newState.provincesData[targetProvId] : null;
    const tProvInfo = targetProvId ? provinces.find(p => p.id === targetProvId) : null;
    const targetProvName = tProvInfo ? tProvInfo.name : '敵國領地';

    actingGen.hasActed = true;
    newState.generalsData[actingGen.name] = actingGen;

    if (action === '流言煽動' && targetProv && province.gold >= 300) {
      province.gold -= 300;
      const enemyGens = Object.values(newState.generalsData).filter(g => g.provinceId === targetProvId && !g.isWild);
      let maxDefInt = 30;
      if (enemyGens.length > 0) {
        maxDefInt = Math.max(...enemyGens.map(g => g.int + getGeneralItemBonus(g.name, state.currentScenario).intBonus));
      }
      
      let successRate = Math.floor(50 + (atkInt - maxDefInt) * 1.2);
      successRate = Math.max(10, Math.min(90, successRate));
      
      if (Math.random() * 100 < successRate) {
        const dropPopLoyalty = Math.floor(Math.random() * 11) + 15; // 15~25
        targetProv.loyalty = Math.max(0, targetProv.loyalty - dropPopLoyalty);

        newState.lastActionResult = {
          action: '流言煽動',
          title: '🗣️ 流言煽動：風聲鶴唳！',
          message: `【${actingGen.name}】潛入【${targetProvName}】散布謠言成功！敵軍陣腳大亂，該郡民心下降 ${dropPopLoyalty} 點！`,
          type: 'success'
        };
      } else {
        newState.lastActionResult = {
          action: '流言煽動',
          title: '❌ 計策失敗：流言平息',
          message: `【${actingGen.name}】於【${targetProvName}】散布謠言，被敵軍智將識破並迅速平息，未能造成影響。`,
          type: 'failure'
        };
      }
    } else if (action === '驅虎吞狼' && targetProv && province.gold >= 500) {
      province.gold -= 500;
      const rulerName = targetProv.rulerName;
      const rulerFactionGens = Object.values(newState.generalsData).filter(g => g.provinceId !== null && newState.provincesData[g.provinceId]?.rulerName === rulerName && !g.isWild);
      
      let maxDefInt = 50;
      const keyGens = rulerFactionGens.filter(g => g.isRuler || g.role === '軍師');
      if (keyGens.length > 0) {
        maxDefInt = Math.max(...keyGens.map(g => g.int + getGeneralItemBonus(g.name, state.currentScenario).intBonus));
      }
      
      let successRate = Math.floor(35 + (atkInt - maxDefInt) * 1.0);
      successRate = Math.max(5, Math.min(80, successRate));
      
      if (Math.random() * 100 < successRate) {
        // 模擬兩國交戰，消耗該國部分兵力與資源
        const enemyGens = Object.values(newState.generalsData).filter(g => g.provinceId === targetProvId && !g.isWild);
        enemyGens.forEach(g => {
          g.soldiers = Math.floor(g.soldiers * (0.7 + Math.random() * 0.15));
          newState.generalsData[g.name] = g;
        });
        targetProv.soldiers = Math.floor(targetProv.soldiers * (0.7 + Math.random() * 0.15));
        targetProv.gold = Math.floor(targetProv.gold * (0.7 + Math.random() * 0.1));
        targetProv.food = Math.floor(targetProv.food * (0.7 + Math.random() * 0.1));

        newState.lastActionResult = {
          action: '驅虎吞狼',
          title: '📜 驅虎吞狼：兩虎相爭！',
          message: `【${actingGen.name}】出使挑撥成功！【${rulerName}】受迫對外發起戰端，導致【${targetProvName}】兵力與錢糧皆有折損！`,
          type: 'success'
        };
      } else {
        newState.lastActionResult = {
          action: '驅虎吞狼',
          title: '❌ 計策失敗：挑撥無效',
          message: `【${actingGen.name}】試圖挑撥【${rulerName}】興兵，但被敵方識破其計，無功而返。`,
          type: 'failure'
        };
      }
    } else if (action === '離間君臣' && targetProv && payload?.targetGeneralName && province.gold >= 400) {
      province.gold -= 400;
      const targetGen = newState.generalsData[payload.targetGeneralName];
      if (targetGen) {
        const defInt = targetGen.int + getGeneralItemBonus(targetGen.name, state.currentScenario).intBonus;
        const targetAmbition = targetGen.ambition !== undefined ? targetGen.ambition : getGeneralAmbition(targetGen.name);
        
        let successRate = Math.floor(45 + (atkInt - defInt) * 1.5 + (targetAmbition - 3) * 3 - (targetGen.loyalty * 0.3));
        successRate = Math.max(5, Math.min(85, successRate));
        
        if (Math.random() * 100 < successRate) {
          // 忠誠度下降值 (1~20): 基礎隨機 1~10 + 智力差加成 + 野心加成
          const baseDrop = Math.floor(Math.random() * 10) + 1;
          const intBonus = Math.max(0, Math.floor((atkInt - defInt) / 10));
          const ambitionBonus = Math.floor(targetAmbition / 2);
          
          let drop = baseDrop + intBonus + ambitionBonus;
          drop = Math.max(1, Math.min(20, drop)); // Clamp 1~20
          
          targetGen.loyalty = Math.max(0, targetGen.loyalty - drop);
          
          newState.lastActionResult = {
            action: '離間君臣',
            title: '🎭 離間君臣：敵將生疑！',
            message: `【${actingGen.name}】流言離間奏效！【${targetGen.name}】對其君主心生芥蒂，忠誠度下降 ${drop} 點（當前忠誠降至 ${targetGen.loyalty}）！`,
            type: 'success'
          };
          newState.generalsData[targetGen.name] = targetGen;
        } else {
          newState.lastActionResult = {
            action: '離間君臣',
            title: '❌ 計策失敗：君臣同心',
            message: `【${actingGen.name}】試圖離間【${targetGen.name}】，然其對君主忠心不二，計策未能生效。`,
            type: 'failure'
          };
        }
      }
    } else if (action === '勸降逼降' && targetProv && province.gold >= 1000) {
      province.gold -= 1000;
      const rulerName = targetProv.rulerName;
      const enemyProvs = Object.values(newState.provincesData).filter(p => p.rulerName === rulerName);
      
      let alliedSurroundingTroops = 0;
      if (tProvInfo) {
        tProvInfo.connections.forEach(cid => {
           const cp = newState.provincesData[cid];
           if (cp && cp.rulerName === state.rulerName) {
              let troops = cp.soldiers || 0;
              Object.values(newState.generalsData).filter(g => g.provinceId === cid && !g.isWild).forEach(g => troops += g.soldiers);
              alliedSurroundingTroops += troops;
           }
        });
      }
      
      let enemyTotalTroops = targetProv.soldiers || 0;
      Object.values(newState.generalsData).filter(g => g.provinceId === targetProvId && !g.isWild).forEach(g => enemyTotalTroops += g.soldiers);
      
      const troopRatio = enemyTotalTroops > 0 ? alliedSurroundingTroops / enemyTotalTroops : 10;
      const rulerGen = Object.values(newState.generalsData).find(g => g.name === rulerName);
      const rulerInt = rulerGen ? rulerGen.int + getGeneralItemBonus(rulerGen.name, state.currentScenario).intBonus : 50;
      
      let successRate = Math.floor(25 + (atkInt - rulerInt) * 1.0 + (atkCha * 0.2) + (troopRatio * 5));
      if (enemyProvs.length > 2) successRate -= 50; 
      successRate = Math.max(5, Math.min(85, successRate));
      
      if (Math.random() * 100 < successRate && enemyProvs.length <= 2) {
        enemyProvs.forEach(ep => {
          ep.rulerName = state.rulerName;
          Object.values(newState.generalsData).filter(g => g.provinceId === ep.id && !g.isWild).forEach(g => {
             g.loyalty = Math.max(60, g.loyalty);
             newState.generalsData[g.name] = g;
          });
          newState.provincesData[ep.id] = ep;
        });
        
        newState.lastActionResult = {
          action: '勸降逼降',
          title: '🏳️ 勸降逼降：舉國歸順！',
          message: `【${actingGen.name}】挾我軍大雪崩之勢，以理陳情，威逼利誘！【${rulerName}】見大勢已去，決定帶領麾下全軍舉國投降！`,
          type: 'success'
        };
      } else {
        newState.lastActionResult = {
          action: '勸降逼降',
          title: '❌ 計策失敗：寧死不屈',
          message: `【${actingGen.name}】入城勸降，然【${rulerName}】心存僥倖，寧死不屈，悍然將使者逐出城外！`,
          type: 'failure'
        };
      }
    } else if (action === '進貢金糧' && targetProv && payload) {
      const { resourceType, amount } = payload;
      let relPoints = 0;
      if (resourceType === '金' && province.gold >= amount) {
        province.gold -= amount;
        targetProv.gold += amount;
        relPoints = Math.floor(amount / 1000);
      } else if (resourceType === '糧' && province.food >= amount) {
        province.food -= amount;
        targetProv.food += amount;
        relPoints = Math.floor(amount / 10000);
      }
      
      const rulerName = targetProv.rulerName;
      if (rulerName && relPoints > 0) {
        if (!newState.diplomacyData) newState.diplomacyData = {};
        if (!newState.diplomacyData[state.rulerName]) newState.diplomacyData[state.rulerName] = {};
        
        // Multiplier from POL+CHA (up to 3x)
        const envoyStats = actingGen.pol + actingGen.cha + getGeneralItemBonus(actingGen.name, state.currentScenario).polBonus + getGeneralItemBonus(actingGen.name, state.currentScenario).chaBonus;
        const multiplier = Math.min(3, 1 + Math.max(0, envoyStats - 150) / 25);
        const actualIncrease = Math.floor(relPoints * multiplier);

        const currentRel = newState.diplomacyData[state.rulerName][rulerName] || 50;
        newState.diplomacyData[state.rulerName][rulerName] = Math.min(100, currentRel + actualIncrease);
        
        // mirror relation
        if (!newState.diplomacyData[rulerName]) newState.diplomacyData[rulerName] = {};
        newState.diplomacyData[rulerName][state.rulerName] = newState.diplomacyData[state.rulerName][rulerName];

        newState.lastActionResult = {
          action: '進貢金糧',
          title: '🎁 進貢金糧：結好鄰邦',
          message: `【${actingGen.name}】攜帶 ${amount} ${resourceType} 前往拜會【${rulerName}】。憑藉過人的口才與厚禮，兩國關係提升了 ${actualIncrease} 點！（目前友好度：${newState.diplomacyData[state.rulerName][rulerName]}）`,
          type: 'success'
        };
      }
    } else if (action === '同盟締結' && targetProv && province.gold >= 2000) {
      province.gold -= 2000;
      const rulerName = targetProv.rulerName;
      if (rulerName) {
        if (!newState.diplomacyData) newState.diplomacyData = {};
        if (!newState.diplomacyData[state.rulerName]) newState.diplomacyData[state.rulerName] = {};
        
        const currentRel = newState.diplomacyData[state.rulerName][rulerName] || 50;
        
        // Condition: Requires relationship >= 90
        if (currentRel < 90) {
          newState.lastActionResult = {
            action: '同盟締結',
            title: '❌ 同盟破裂：好感不足',
            message: `【${actingGen.name}】雖奉上厚禮，但兩國當前友好度（${currentRel}）未達 90，【${rulerName}】斷然拒絕了同盟之議！`,
            type: 'failure'
          };
        } else {
          // Success rate based on envoy POL+CHA
          const envoyStats = actingGen.pol + actingGen.cha + getGeneralItemBonus(actingGen.name, state.currentScenario).polBonus + getGeneralItemBonus(actingGen.name, state.currentScenario).chaBonus;
          let successRate = currentRel + (envoyStats - 150); 
          successRate = Math.max(10, Math.min(95, successRate));

          if (Math.random() * 100 < successRate) {
            // duration: 1 to 2 years (12 to 24 months)
            const duration = Math.floor(Math.random() * 13) + 12; 
            const expiryAbsoluteMonth = (state.year * 12 + state.month) + duration;
            
            if (!newState.alliances) newState.alliances = {};
            if (!newState.alliances[state.rulerName]) newState.alliances[state.rulerName] = {};
            newState.alliances[state.rulerName][rulerName] = expiryAbsoluteMonth;

            if (!newState.alliances[rulerName]) newState.alliances[rulerName] = {};
            newState.alliances[rulerName][state.rulerName] = expiryAbsoluteMonth;

            targetProv.gold += 2000; // Only give gold if they accepted, or kept either way? (Usually kept). Let's keep it here.
            
            newState.lastActionResult = {
              action: '同盟締結',
              title: '🤝 同盟締結：兩國交好！',
              message: `【${actingGen.name}】以三寸不爛之舌與厚禮打動了【${rulerName}】！雙方立誓結為同盟，為期 ${duration} 個月！`,
              type: 'success'
            };
          } else {
            newState.lastActionResult = {
              action: '同盟締結',
              title: '❌ 同盟破裂：嚴詞拒絕',
              message: `【${actingGen.name}】奉上厚禮，但【${rulerName}】對我國仍抱持疑慮，拒絕了同盟之議！`,
              type: 'failure'
            };
          }
        }
      }
    }
    
    if (targetProv) newState.provincesData[targetProvId] = targetProv;
  } else if (category === '人事' || category === '君主') {
    if (action === '指定軍師') {
      if (!actingGen || actingGen.isRuler) return state; // 君主不能任命自己為軍師
      const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
      const totalInt = actingGen.int + itemBonus.intBonus;
      if (totalInt <= 80) return state; // 指派軍師至少需智力 > 80

      // 清除同勢力其他武將的專任軍師職稱
      const playerProvinces = Object.values(newState.provincesData).filter(p => p.rulerName === state.rulerName).map(p => p.id);
      Object.values(newState.generalsData).forEach(g => {
        if (g.provinceId !== null && playerProvinces.includes(g.provinceId) && g.role === '軍師' && g.name !== actingGen.name) {
          newState.generalsData[g.name] = { ...g, role: '將領' };
        }
      });

      actingGen.role = '軍師';
      newState.generalsData[actingGen.name] = actingGen;

      newState.lastActionResult = {
        action: '指定軍師',
        title: '📜 授任冊封：任命軍師',
        message: `君主下詔：正式任用【${actingGen.name}】（智力：${totalInt}）為我軍軍師！日後各項軍國政務、月度人事密報與戰略規劃將由其參謀劃策。`,
        type: 'success'
      };
      return newState;
    } else if (action === '指定太守') {
      if (!actingGen || actingGen.isRuler) return state; // 君主本身就是太守，無法指派為太守
      const targetProvId = actingGen.provinceId !== null ? actingGen.provinceId : provinceId;
      const provInfo = provinces.find(p => p.id === targetProvId);
      const provName = provInfo ? provInfo.name : `${targetProvId}郡`;

      // 檢查君主是否在該城市，若君主在該城市則君主即為太守，不能指派太守
      const hasRulerInProv = Object.values(newState.generalsData).some(g => g.provinceId === targetProvId && g.isRuler);
      if (hasRulerInProv) return state;

      // 清除同郡其他武將的太守職稱
      Object.values(newState.generalsData).forEach(g => {
        if (g.provinceId === targetProvId && g.role === '太守' && g.name !== actingGen.name) {
          newState.generalsData[g.name] = { 
            ...g, 
            role: '將領', 
            maxTroops: 2500,
            soldiers: Math.min(g.soldiers, 2500)
          };
        }
      });

      actingGen.role = '太守';
      actingGen.maxTroops = 4000;
      if (actingGen.soldiers < 4000) {
        actingGen.soldiers = 4000;
      }
      newState.generalsData[actingGen.name] = actingGen;

      newState.lastActionResult = {
        action: '指定太守',
        title: '📜 授任冊封：任命太守',
        message: `君主下詔：正式任用【${actingGen.name}】為【${provName}】太守！其帶兵上限提升至 4000 兵馬，坐鎮指揮郡縣軍政。`,
        type: 'success'
      };
      return newState;
    } else if (action === '郡縣自治' && payload) {
      const { targetProvinceId, isAutonomous } = payload;
      const pState = newState.provincesData[targetProvinceId];
      if (pState) {
        const rulerGen = Object.values(newState.generalsData).find(g => g.name === state.rulerName);
        if (isAutonomous && rulerGen?.provinceId === targetProvinceId) {
          newState.lastActionResult = {
            action: '郡縣自治',
            title: '❌ 自治授權失敗',
            message: '君主所在城市不可設定為自治！',
            type: 'failure'
          };
          return newState;
        }

        pState.isAutonomous = !!isAutonomous;
        newState.provincesData[targetProvinceId] = pState;

        const pInfo = provinces.find(p => p.id === targetProvinceId);
        const pName = pInfo ? pInfo.name : `${targetProvinceId}郡`;
        const prefect = Object.values(newState.generalsData).find(g => g.provinceId === targetProvinceId && g.role === '太守');
        const prefectName = prefect ? prefect.name : '無現任太守';

        newState.lastActionResult = {
          action: '郡縣自治',
          title: '🏛️ 郡縣自治：授權委任',
          message: `君主下詔：${isAutonomous ? `正式授權【${pName}】（坐鎮太守：${prefectName}）實施郡縣自治！太守將於每月自動進行發展開墾、水利防洪與治安護民。` : `收回【${pName}】自治授權，恢復由君主親自管理。`}`,
          type: 'info'
        };
      }
      return newState;
    } else if (action === '賞賜物品' && payload) {
      const { targetGeneralName, itemName, goldCost } = payload;
      const targetGen = newState.generalsData[targetGeneralName];
      const cost = goldCost || 20;
      if (targetGen && province.gold >= cost) {
        province.gold -= cost;
        const boost = Math.floor(Math.random() * 11) + 20; // +20 ~ +30 忠誠
        targetGen.loyalty = Math.min(100, targetGen.loyalty + boost);
        targetGen.rewardedThisMonth = true;
        newState.generalsData[targetGeneralName] = targetGen;

        newState.lastActionResult = {
          action: '賞賜物品',
          title: '🎁 頒賞重寶：賜予名物',
          message: `君主下詔：將重寶名物【${itemName || '黃金錦囊'}】頒賜予武將【${targetGeneralName}】！【${targetGeneralName}】感知君主厚恩，誓死效忠（忠誠度 +${boost}，現有忠誠：${targetGen.loyalty}）！`,
          type: 'success'
        };
      }
      return newState;
    } else if (action === '登用他國人才' && payload) {
      const { targetGeneralName, targetProvinceId } = payload;
      const targetGen = newState.generalsData[targetGeneralName];
      if (targetGen && actingGen) {
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;

        const tProvInfo = provinces.find(p => p.id === (targetGen.provinceId || targetProvinceId));
        const tProvName = tProvInfo ? tProvInfo.name : '敵國領地';
        const tRuler = targetGen.provinceId !== null ? (newState.provincesData[targetGen.provinceId]?.rulerName || '敵君') : '敵君';

        const targetAmbition = targetGen.ambition !== undefined ? targetGen.ambition : getGeneralAmbition(targetGen.name);
        const envoyPower = (actingGen.cha * 0.5 + actingGen.int * 0.3);
        const targetDefense = targetGen.loyalty * 0.8;
        const ambitionBonus = (targetAmbition - 3) * 4;
        const basePenalty = -10;
        const successRate = Math.min(85, Math.max(1, Math.floor(envoyPower - targetDefense + ambitionBonus + basePenalty)));

        const roll = Math.random() * 100;
        if (roll < successRate) {
          targetGen.provinceId = actingGen.provinceId || provinceId;
          targetGen.isWild = false;
          targetGen.role = '將領';
          targetGen.loyalty = Math.min(100, Math.max(30, 60 + Math.floor(actingGen.cha / 5) - Math.floor(targetAmbition * 2)));
          targetGen.hasActed = true;
          newState.generalsData[targetGeneralName] = targetGen;

          newState.lastActionResult = {
            action: '登用他國人才',
            title: '🎉 策反登用成功：名將歸順！',
            message: `【${actingGen.name}】親赴【${tProvName}】暗中密會，憑藉三寸不爛之舌與浩蕩皇威，說服敵將【${targetGeneralName}】棄暗投明！【${targetGeneralName}】正式歸順我軍麾下（初始忠誠：${targetGen.loyalty}）！`,
            type: 'success'
          };
        } else {
          newState.lastActionResult = {
            action: '登用他國人才',
            title: '❌ 策反登用失敗：敵將未動',
            message: `【${actingGen.name}】密赴【${tProvName}】試圖遊說【${targetGeneralName}】，然【${targetGeneralName}】感念現君主【${tRuler}】舊恩（忠誠度: ${targetGen.loyalty}），拒絕棄主投效。`,
            type: 'failure'
          };
        }
      }
      return newState;
    } else if (action === '賞賜金帛' && payload) {
      // 賞賜金帛不需扣除執行武將的行動力，且每人每月限賞賜一次
      const { targetGeneralName, gold } = payload;
      const targetGen = newState.generalsData[targetGeneralName];
      const goldCost = gold || 10;
      if (targetGen && !targetGen.rewardedThisMonth && province.gold >= goldCost) {
        province.gold -= goldCost;
        targetGen.loyalty = Math.min(100, targetGen.loyalty + Math.floor(goldCost / 2) + 5);
        targetGen.rewardedThisMonth = true; // 每人每月限賞賜一次
        newState.generalsData[targetGeneralName] = targetGen;
      }
    } else if (action === '控制敵君主 (挪移將糧)' || action === '操控他國將糧' || action === '控制敵君主') {
      if (!payload) return state;
      const { fromProvinceId, toProvinceId, generalNames, foodAmount, goldAmount, soldierAmount } = payload;
      
      const fromProv = newState.provincesData[fromProvinceId];
      const toProv = newState.provincesData[toProvinceId];
      
      if (!fromProv || !toProv) return state;
      
      const fromProvInfo = provinces.find(p => p.id === fromProvinceId);
      const toProvInfo = provinces.find(p => p.id === toProvinceId);
      
      const transferredGeneralsList: string[] = [];
      
      // 1. 挪移武將
      if (Array.isArray(generalNames) && generalNames.length > 0) {
        generalNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          if (gen && gen.provinceId === fromProvinceId) {
            gen.provinceId = toProvinceId;
            if (gen.isRuler) {
              gen.isRuler = false;
              gen.role = '將領';
            }
            gen.loyalty = Math.max(85, gen.loyalty);
            gen.hasActed = false;
            newState.generalsData[gName] = gen;
            transferredGeneralsList.push(gName);
          }
        });
      }
      
      // 2. 挪移糧食
      let actualFoodTransferred = 0;
      if (foodAmount && foodAmount > 0) {
        actualFoodTransferred = Math.min(fromProv.food, Math.floor(foodAmount));
        fromProv.food -= actualFoodTransferred;
        toProv.food += actualFoodTransferred;
      }
      
      // 3. 挪移金錢
      let actualGoldTransferred = 0;
      if (goldAmount && goldAmount > 0) {
        actualGoldTransferred = Math.min(fromProv.gold, Math.floor(goldAmount));
        fromProv.gold -= actualGoldTransferred;
        toProv.gold += actualGoldTransferred;
      }

      // 4. 挪移預備兵力
      let actualSoldiersTransferred = 0;
      if (soldierAmount && soldierAmount > 0) {
        actualSoldiersTransferred = Math.min(fromProv.soldiers, Math.floor(soldierAmount));
        fromProv.soldiers -= actualSoldiersTransferred;
        toProv.soldiers += actualSoldiersTransferred;
      }
      
      newState.provincesData[fromProvinceId] = fromProv;
      newState.provincesData[toProvinceId] = toProv;
      
      const summaryParts: string[] = [];
      if (transferredGeneralsList.length > 0) {
        summaryParts.push(`【武將】${transferredGeneralsList.join('、')} 共 ${transferredGeneralsList.length} 人順利歸入我軍`);
      }
      if (actualFoodTransferred > 0) {
        summaryParts.push(`【糧食】${actualFoodTransferred.toLocaleString()} 石已調入我方`);
      }
      if (actualGoldTransferred > 0) {
        summaryParts.push(`【黃金】${actualGoldTransferred.toLocaleString()} 兩已劃撥至我方`);
      }
      if (actualSoldiersTransferred > 0) {
        summaryParts.push(`【預備兵】${actualSoldiersTransferred.toLocaleString()} 人已加入我軍預備役`);
      }
      
      newState.lastActionResult = {
        action: '控制敵君主',
        title: '👑 掌控敵陣：成功挪移武將糧草！',
        message: `已成功控制敵方【${fromProvInfo?.name || fromProvinceId}】政權，將其大員與物資調撥至我方【${toProvInfo?.name || toProvinceId}】！\n\n` +
          (summaryParts.length > 0 ? summaryParts.join('\n') : '無資源轉移'),
        type: 'success'
      };
      
      return newState;
    } else {
      if (!actingGen || actingGen.hasActed) {
        return state;
      }
      if (action === '尋訪人才') {
        // 尋訪人才只能尋訪該武將所在城市
        const searchProvinceId = actingGen.provinceId !== null ? actingGen.provinceId : provinceId;
        const searchProv = newState.provincesData[searchProvinceId];
        const provInfo = provinces.find(p => p.id === searchProvinceId);
        const provName = provInfo ? provInfo.name : `${searchProvinceId}郡`;

        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;

        // 尋找該武將所在城市中的在野武將 (isWild: true)
        const wildInProvince = Object.values(newState.generalsData).filter(
          g => g.isWild && g.provinceId === searchProvinceId
        );

        const undiscovered = wildInProvince.filter(
          g => !(newState.wildGenerals || []).includes(g.name)
        );

        let talentFoundGen: GeneralState | null = null;

        if (undiscovered.length > 0) {
          // 依據尋訪武將之魅力決定發現機率
          const findChance = Math.min(95, Math.max(30, actingGen.cha + 15));
          if (Math.random() * 100 < findChance) {
            talentFoundGen = undiscovered[0];
            const currentWild = newState.wildGenerals || [];
            newState.wildGenerals = [...currentWild, talentFoundGen.name];
          }
        }

        if (talentFoundGen) {
          newState.lastActionResult = {
            action: '尋訪人才',
            title: '🔍 尋訪人才結果：發現賢士！',
            message: `【${actingGen.name}】於其駐守城市【${provName}】巡查山川市井，成功探得隱世名士【${talentFoundGen.name}】（${talentFoundGen.role || '名士'}，武:${talentFoundGen.str} 智:${talentFoundGen.int} 魅:${talentFoundGen.cha}）出山！現已登錄在野名單，可隨時派遣武將進行『登用人才』。`,
            type: 'talent_found',
            detail: { generalName: talentFoundGen.name, provinceName: provName }
          };
        } else {
          // 找不到人才時，約 20% 機率採集獲得 10-100 金
          if (Math.random() < 0.20 && searchProv) {
            const foundGold = Math.floor(Math.random() * 91) + 10; // 10 到 100 金
            searchProv.gold += foundGold;
            newState.provincesData[searchProvinceId] = searchProv;

            newState.lastActionResult = {
              action: '尋訪人才',
              title: '💰 尋訪人才結果：採集尋獲金帛！',
              message: `【${actingGen.name}】於其駐守城市【${provName}】深入巡視探訪，雖未逢隱世賢士，卻於山野鄉間意外尋獲金帛【${foundGold}】金！已全數納入郡庫（現有黃金：${searchProv.gold} 金）。`,
              type: 'gold_found',
              detail: { gold: foundGold, provinceName: provName }
            };
          } else {
            newState.lastActionResult = {
              action: '尋訪人才',
              title: '🍂 尋訪人才結果：無功而返',
              message: `【${actingGen.name}】踏遍其駐守城市【${provName}】山川市井，未曾探得名士蹤跡，亦無其他獲益。`,
              type: 'nothing',
              detail: { provinceName: provName }
            };
          }
        }
      } else if (action === '登用人才' && payload) {
        const { targetGeneralName } = payload;
        const targetGen = newState.generalsData[targetGeneralName];
        if (targetGen && targetGen.isWild && targetGen.provinceId === provinceId) {
          // 依據執行武將的魅力計算成功率
          const successRate = Math.min(95, Math.max(15, actingGen.cha - 10));
          const roll = Math.random() * 100;
          if (roll < successRate) {
            targetGen.isWild = false;
            targetGen.loyalty = Math.min(100, 60 + Math.floor(actingGen.cha / 4));
            targetGen.hasActed = true;
            newState.generalsData[targetGeneralName] = targetGen;

            newState.lastActionResult = {
              action: '登用人才',
              title: '🎉 登用人才結果：招募成功！',
              message: `【${actingGen.name}】親赴拜訪遊說，真誠感佩，賢士【${targetGeneralName}】正式同意出山，加入我軍麾下！（初始忠誠度：${targetGen.loyalty}）`,
              type: 'success'
            };
          } else {
            newState.lastActionResult = {
              action: '登用人才',
              title: '❌ 登用人才結果：招募失敗',
              message: `【${actingGen.name}】親赴遊說【${targetGeneralName}】，然對方婉言婉拒，未能成功招致麾下。`,
              type: 'failure'
            };
          }
          actingGen.hasActed = true;
          newState.generalsData[actingGen.name] = actingGen;
        }
      } else {
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    }
  }

  newState.provincesData[provinceId] = province;
  return newState;
}

export function processAITurn(state: GameState): GameState {
  let newState = { ...state, provincesData: { ...state.provincesData } };
  
  Object.values(newState.provincesData).forEach(p => {
    // Non-player rulers act automatically
    if (p.rulerName && p.rulerName !== state.rulerName) {
       const updatedP = { ...p };
       const tierRules = getProvinceTierRules(p.id);
       
       // Basic AI Decision Tree
       if (updatedP.flood > 45 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          updatedP.flood = Math.max(0, updatedP.flood - (Math.floor(Math.random() * 8) + 5));
       } else if (updatedP.value < tierRules.maxDev * 0.75 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          updatedP.value = Math.min(tierRules.maxDev, updatedP.value + (Math.floor(Math.random() * 8) + 4));
       } else if ((updatedP.commerce || 0) < tierRules.maxCommerce * 0.75 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 0) + (Math.floor(Math.random() * 8) + 4));
       } else if (updatedP.population >= tierRules.minPopulation + 3000 && updatedP.gold >= 50) {
          updatedP.gold -= 40;
          updatedP.population -= 1000;
          updatedP.soldiers += 1000;
       }
       
       newState.provincesData[p.id] = updatedP;
    }
  });

  return newState;
}

export function getEstimatedAnnualGold(province: ProvinceState): number {
  if (!province.rulerName) return 0;
  const commFactor = (province.commerce || 50) / 100;
  const loyFactor = (province.loyalty || 50) / 100;
  return Math.round((province.population / 1000) * commFactor * loyFactor * 8 + (province.commerce || 50) * 3);
}

export function getEstimatedAnnualFood(province: ProvinceState): number {
  if (!province.rulerName) return 0;
  const devFactor = (province.value || 50) / 100;
  const floodSafety = Math.max(0.2, 1 - (province.flood || 0) / 200);
  const loyFactor = (province.loyalty || 50) / 100;
  return Math.round((province.population / 100) * devFactor * floodSafety * loyFactor * 12 + province.value * 30);
}

export function getEstimatedMonthlyFoodConsumption(province: ProvinceState, generals: GeneralState[]): number {
  if (!province.rulerName) return 0;
  const provinceGenerals = generals.filter(g => g.provinceId === province.id && !g.isWild);
  const totalTroops = (province.soldiers || 0) + provinceGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
  // 每月每 10 人消耗 1 糧
  return Math.floor(totalTroops * 0.1);
}

export function advanceTime(state: GameState): GameState {
  // 1. Process AI turns for non-player provinces
  let newState = processAITurn(state);
  
  // 2. Advance time
  let newMonth = newState.month + 1;
  let newYear = newState.year;
  
  if (newMonth > 12) {
    newMonth = 1;
    newYear += 1;
  }

  const seasonIndex = Math.floor((newMonth - 1) / 3);
  const newSeason = SEASONS[seasonIndex];

  // 3. Process time-based events & seasonal tax/harvest
  Object.values(newState.provincesData).forEach(p => {
     const updatedP = { ...p };
     // 每月重置單城徵兵次數限制
     updatedP.hasDraftedThisMonth = false;
     
     // 1月 (January): 春季金稅徵收 (依商業發展度、人口與民眾忠誠)
     if (newMonth === 1 && updatedP.rulerName) {
        const commFactor = (updatedP.commerce || 50) / 100;
        const loyFactor = (updatedP.loyalty || 50) / 100;
        const goldTax = Math.round((updatedP.population / 1000) * commFactor * loyFactor * 8 + (updatedP.commerce || 50) * 3);
        updatedP.gold = Math.min(999999, updatedP.gold + goldTax);
     }

     // 7月 (July): 秋季糧草豐收 (依土地開發度、防災度、人口與民眾忠誠)
     if (newMonth === 7 && updatedP.rulerName) {
        const devFactor = (updatedP.value || 50) / 100;
        const floodSafety = Math.max(0.2, 1 - (updatedP.flood || 0) / 200);
        const loyFactor = (updatedP.loyalty || 50) / 100;
        const foodHarvest = Math.round((updatedP.population / 100) * devFactor * floodSafety * loyFactor * 12 + updatedP.value * 30);
        updatedP.food = Math.min(999999, updatedP.food + foodHarvest);
     }

     // Yearly flood rate increase (happens dynamically over time)
     const pBase = provinces.find(x => x.id === p.id);
     if (pBase && newMonth === 1) {
        updatedP.flood = Math.min(100, updatedP.flood + pBase.floodGrowthRate);
     }
     
     // 10月: 人口自然增長 (結合土地與商業發展)
     if (newMonth === 10) {
        const avgDev = ((updatedP.value || 50) + (updatedP.commerce || 50)) / 2;
        const growth = Math.floor(updatedP.population * (avgDev / 100) * (1 - updatedP.flood / 100) * 0.05);
        updatedP.population += Math.max(100, growth);
     }

     // 每月兵糧消耗
     if (updatedP.rulerName) {
        const monthlyConsumption = getEstimatedMonthlyFoodConsumption(updatedP, Object.values(newState.generalsData));
        updatedP.food -= monthlyConsumption;
        
        if (updatedP.food < 0) {
           updatedP.food = 0;
           // 缺糧懲罰：士兵逃亡，民心下降
           updatedP.loyalty = Math.max(0, updatedP.loyalty - 5);
           updatedP.soldiers = Math.floor((updatedP.soldiers || 0) * 0.9);
           
           // 武將帶兵與忠誠下降
           Object.values(newState.generalsData).forEach(g => {
              if (g.provinceId === updatedP.id && !g.isWild) {
                 const newGen = { ...g };
                 newGen.soldiers = Math.floor((newGen.soldiers || 0) * 0.9);
                 newGen.loyalty = Math.max(0, newGen.loyalty - 2);
                 newState.generalsData[g.name] = newGen;
              }
           });
        }
     }

     // 3.5 玩家『郡縣自治』每月太守自動施政 (派發未行動武將)
     if (updatedP.rulerName === state.rulerName && updatedP.isAutonomous) {
        const tierRules = getProvinceTierRules(updatedP.id);
        const unactedGenerals = Object.values(newState.generalsData).filter(
          g => g.provinceId === updatedP.id && !g.hasActed && !g.isWild && !g.activeTask
        );

        unactedGenerals.forEach(g => {
          const updatedGen = { ...g };
          let actionTaken = false;
          if (updatedP.flood > 35 && updatedP.gold >= 100) {
            updatedP.gold -= 100;
            const polFactor = Math.floor(Math.pow(Math.max(0, updatedGen.pol) / 100, 3) * 12);
            const decrease = Math.max(1, polFactor) + Math.floor(Math.random() * 4) + 1;
            updatedP.flood = Math.max(0, updatedP.flood - decrease);
            actionTaken = true;
          } else if (updatedP.value < tierRules.maxDev && updatedP.gold >= 100) {
            updatedP.gold -= 100;
            const polFactor = Math.floor(Math.pow(Math.max(0, updatedGen.pol) / 100, 3) * 12);
            const increase = Math.max(1, polFactor) + Math.floor(Math.random() * 4);
            updatedP.value = Math.min(tierRules.maxDev, updatedP.value + increase);
            actionTaken = true;
          } else if ((updatedP.commerce || 0) < tierRules.maxCommerce && updatedP.gold >= 100) {
            updatedP.gold -= 100;
            const polFactor = Math.floor(Math.pow(Math.max(0, updatedGen.pol) / 100, 3) * 12);
            const increase = Math.max(1, polFactor) + Math.floor(Math.random() * 4);
            updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 0) + increase);
            actionTaken = true;
          } else if (updatedP.loyalty < 85 && updatedP.food >= 100) {
            updatedP.food -= 100;
            const chaFactor = Math.floor(updatedGen.cha / 10);
            const increase = Math.max(1, chaFactor) + Math.floor(Math.random() * 3);
            updatedP.loyalty = Math.min(100, updatedP.loyalty + increase);
            actionTaken = true;
          } else if (updatedGen.soldiers > 0 && updatedGen.training < 100) {
            // 自動訓練自己的部隊
            const strFactor = Math.pow(updatedGen.str / 100, 3);
            const baseGain = 20 * strFactor;
            const countFactor = Math.sqrt(3000 / Math.max(500, updatedGen.soldiers));
            const difficultyFactor = updatedGen.training >= 80 ? 0.6 : (updatedGen.training >= 60 ? 0.8 : 1.0);
            const rawGain = Math.round(baseGain * countFactor * difficultyFactor);
            updatedGen.training = Math.min(100, updatedGen.training + Math.max(1, rawGain));
            actionTaken = true;
          }
          
          if (actionTaken) {
            updatedGen.hasActed = true;
            newState.generalsData[updatedGen.name] = updatedGen; // 更新 state
          }
        });
     }

     newState.provincesData[p.id] = updatedP;
  });

  // 4. 處理持續性任務與重置武將本月行動狀態
  const updatedGenerals: Record<string, typeof state.generalsData[string]> = {};
  Object.entries(newState.generalsData).forEach(([gName, gen]) => {
    let newTask = gen.activeTask;
    let newHasActed = false;

    if (newTask) {
      newTask = { ...newTask, turnsLeft: newTask.turnsLeft - 1 };
      if (newTask.turnsLeft <= 0) {
        newTask = null; // 任務完成
      } else {
        newHasActed = true; // 繼續鎖定行動
      }
    }

    updatedGenerals[gName] = {
      ...gen,
      hasActed: newHasActed,
      rewardedThisMonth: false,
      activeTask: newTask
    };
  });
  newState.generalsData = updatedGenerals;

  // 4.5 處理都市建築進度
  Object.values(newState.provincesData).forEach(p => {
    const updatedP = { ...p };
    if (updatedP.underConstructionFort) {
      updatedP.underConstructionFort = { 
        ...updatedP.underConstructionFort, 
        turnsLeft: updatedP.underConstructionFort.turnsLeft - 1 
      };
      if (updatedP.underConstructionFort.turnsLeft <= 0) {
        updatedP.forts.push({ x: updatedP.underConstructionFort.x, y: updatedP.underConstructionFort.y });
        updatedP.underConstructionFort = null;
      }
    }
    newState.provincesData[p.id] = updatedP;
  });

  // 5. 新年份在野武將出仕檢測及自然死亡檢測
  let deathMessages: string[] = [];
  if (newYear > newState.year) {
    HIDDEN_TALENTS.forEach(ht => {
      if (!updatedGenerals[ht.name] && ht.scenarios.includes(newState.currentScenario) && newYear >= ht.minYear) {
        updatedGenerals[ht.name] = {
          name: ht.name,
          role: ht.role,
          maxTroops: ht.maxTroops,
          hp: ht.hp,
          int: ht.int,
          str: ht.str,
          pol: ht.pol,
          cha: ht.cha,
          loyalty: 50,
          provinceId: ht.provinceId,
          isRuler: false,
          soldiers: 0,
          training: 40,
          hasActed: false,
          isWild: true,
          bio: ht.desc
        };
      }
    });

    // 隨機衰老死亡檢測 (君主死亡機率極低，一般武將隨時間增加死亡率)
    // 簡單模擬：若超過特定年份，每年有 1.5% 機率自然老死
    Object.keys(updatedGenerals).forEach(gName => {
      const gen = updatedGenerals[gName];
      // 假設遊戲開始 10 年後開始有機率病死
      if (newYear > 200 && !gen.isRuler && Math.random() < 0.015) {
        if (gen.provinceId && newState.provincesData[gen.provinceId]?.rulerName === state.rulerName) {
          deathMessages.push(`我軍將領【${gen.name}】因年邁病故，星隕秋風，不勝唏噓...`);
        }
        delete updatedGenerals[gName];
      }
    });
  }

  // 6. 生成月度軍師情報奏報 (軍師智力需 > 80)
  newState.generalsData = updatedGenerals;
  const strategist = getFactionStrategist(newState);

  // 尋找全地圖尚未被發現的在野名士 (isWild: true 且未在 wildGenerals 中)
  const undiscoveredWild = Object.values(newState.generalsData).filter(
    g => g.isWild && !(newState.wildGenerals || []).includes(g.name)
  );

  let monthlyResult = null;

  if (strategist) {
    const stratItem = getGeneralItemBonus(strategist.name, newState.currentScenario);
    const stratInt = strategist.int + stratItem.intBonus;

    if (stratInt > 80) {
      if (undiscoveredWild.length > 0) {
        let detectChance = 0.45;
        if (stratInt >= 95) detectChance = 0.90;
        else if (stratInt >= 90) detectChance = 0.75;
        else if (stratInt >= 85) detectChance = 0.60;

        if (Math.random() < detectChance) {
          const provincesWithTalent = Array.from(
            new Set(undiscoveredWild.map(g => g.provinceId))
          ).filter(id => id !== null) as number[];

          const targetProvinces: string[] = [];
          const prov1 = provincesWithTalent[Math.floor(Math.random() * provincesWithTalent.length)];
          const p1Info = provinces.find(p => p.id === prov1);
          if (p1Info) targetProvinces.push(p1Info.name);

          if (stratInt >= 95 && provincesWithTalent.length > 1) {
            const remaining = provincesWithTalent.filter(id => id !== prov1);
            const prov2 = remaining[Math.floor(Math.random() * remaining.length)];
            const p2Info = provinces.find(p => p.id === prov2);
            if (p2Info) targetProvinces.push(p2Info.name);
          }

          monthlyResult = {
            action: '月度情報',
            title: `📜 軍師【${strategist.name}】月度情報奏報`,
            message: `【軍師 ${strategist.name} (智: ${stratInt}) 密報】：「主公，臣密查天象與各州密報，觀【${targetProvinces.join('】與【')}】地脈紫氣昇騰，隱有不凡賢士隱居避世，主公可派員前去該郡『尋訪人才』！」`,
            type: 'talent_found' as const
          };
        } else {
          monthlyResult = {
            action: '月度情報',
            title: `📜 軍師【${strategist.name}】月度情報奏報`,
            message: `【軍師 ${strategist.name} (智: ${stratInt}) 奏報】：「主公，臣本月巡察天下密報，暫未探得賢士蹤跡，建議主公積蓄國力、修政息兵。」`,
            type: 'info' as const
          };
        }
      } else {
        monthlyResult = {
          action: '月度情報',
          title: `📜 軍師【${strategist.name}】月度情報奏報`,
          message: `【軍師 ${strategist.name} (智: ${stratInt}) 奏報】：「主公，天下隱世名士已盡皆出仕或遭探得，目前無新增在野賢士情報。」`,
          type: 'info' as const
        };
      }
    } else {
      monthlyResult = {
        action: '月度情報',
        title: '📜 軍情報告：軍師資質不足',
        message: `【軍情報告】：「軍師【${strategist.name}】智力僅為 ${stratInt}（未達 80 門檻），洞察力不足，無法為主公推估各州郡隱士情報。建議重新任用高智力之士（智力 > 80）為軍師。」`,
        type: 'info' as const
      };
    }
  } else {
    const playerProvinces = Object.values(newState.provincesData)
      .filter(p => p.rulerName === newState.rulerName)
      .map(p => p.id);
    const candidate = Object.values(newState.generalsData).find(
      g => g.provinceId !== null && playerProvinces.includes(g.provinceId) && !g.isWild && (g.int >= 81)
    );

    monthlyResult = {
      action: '月度情報',
      title: '📜 月度政務報告',
      message: candidate
        ? `【政務提示】：「主公目前麾下尚未冊封軍師！麾下【${candidate.name}】智力達 ${candidate.int}，可前往『7. 君主』->『指定軍師』任命其為軍師，以探知天下隱士情報。」`
        : `【政務提示】：「主公目前尚未冊封軍師（且麾下尚無智力 > 80 之高智文臣），無法探知各州郡隱士情報。」`,
      type: 'info' as const
    };
  }

  let finalResult = monthlyResult;
  if (deathMessages.length > 0) {
    finalResult = {
      action: '武將逝世',
      title: '🥀 將星隕落',
      message: deathMessages.join('\n\n'),
      type: 'failure' as const
    };
  }

  // 7. 檢查結局 (Game Over / Victory)
  const currentTotalProvinces = Object.keys(newState.provincesData).length;
  const currentPlayerProvinces = Object.values(newState.provincesData).filter(p => p.rulerName === newState.rulerName).length;

  if (currentPlayerProvinces === 0) {
    finalResult = {
      action: '敗亡',
      title: '💀 勢力覆滅',
      message: '主公，我軍已失去所有領地，無立錐之地！千秋霸業，至此煙消雲散。您已敗亡，遊戲結束。',
      type: 'failure' as const
    };
  } else if (currentPlayerProvinces === currentTotalProvinces) {
    finalResult = {
      action: '統一天下',
      title: '👑 霸業歸一',
      message: '恭喜主公！我軍已平定天下，四海歸心，結束了亂世。青史留名，萬古流芳！您獲得了最終勝利！',
      type: 'success' as const
    };
  }

  return {
    ...newState,
    generalsData: updatedGenerals,
    month: newMonth,
    year: newYear,
    season: newSeason,
    lastActionResult: finalResult,
    activeMenu: null // close menu on next turn
  };
}
