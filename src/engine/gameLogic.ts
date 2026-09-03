import { getGeneralAvailableFormations } from './formations';
import { getGeneralAvailableSkills, getGeneralPassives } from './skills';
import { GameState, ProvinceState, GeneralState, PendingBattlePlan, AIDecisionLogItem, FactionAIDebugInfo, AITelemetry } from '../types';
import { provinces } from '../data/provinces';
import { generals } from '../data/generals';
import { calculateCaptiveRate, isCityIsolated, processAICaptiveDecision } from './postBattleLogic';
import { handleRulerDecapitation } from './rulerSuccessionLogic';
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
  calculateTroopTrainingGain,
  calculateDevGain,
  calculateFloodGain
} from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';
import { getFactionStrategist } from './strategistAdvice';
import { getAutonomyPolicyInfo } from '../utils/autonomyHelper';

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
      
      const setRel = (a: string, b: string, val: number) => {
        if ((r1 === a && r2 === b) || (r1 === b && r2 === a)) relation = val;
      };
      const isOneOf = (a: string) => r1 === a || r2 === a;

      if (isOneOf('董卓')) relation = 10;
      if (isOneOf('袁術')) relation = 25; // 袁術人緣不佳

      switch (scenarioIndex) {
        case 0: // 189 董卓專政
          if (isOneOf('董卓')) relation = 10;
          setRel('袁紹', '曹操', 70); // 關東聯軍
          setRel('袁紹', '公孫瓚', 30); 
          break;
        case 1: // 195 董卓討伐後
          setRel('孫策', '袁術', 85);
          setRel('曹操', '劉備', 60);
          setRel('曹操', '呂布', 15);
          setRel('劉備', '呂布', 30);
          setRel('袁紹', '公孫瓚', 15);
          break;
        case 2: // 201 官渡之戰
          setRel('曹操', '袁紹', 10);
          setRel('曹操', '劉備', 15);
          setRel('劉備', '袁紹', 80); // 劉備投靠袁紹
          setRel('劉備', '劉表', 75);
          break;
        case 3: // 208 赤壁之戰
          setRel('劉備', '孫權', 90); // 孫劉聯盟
          setRel('曹操', '孫權', 15);
          setRel('曹操', '劉備', 10);
          break;
        case 4: // 215 劉備收蜀
          setRel('劉備', '孫權', 70); // 湘水之盟
          setRel('曹操', '孫權', 20);
          setRel('曹操', '劉備', 10);
          setRel('曹操', '張魯', 70);
          break;
        case 5: // 220 曹丕篡漢
          setRel('劉備', '孫權', 10); // 關羽之死
          setRel('曹丕', '劉備', 10);
          setRel('曹丕', '孫權', 50); // 孫權短暫稱臣
          break;
      }
      
      // Some general historical relationships
      if ((r1 === '劉表' && r2 === '劉備') || (r1 === '劉備' && r2 === '劉表')) {
        relation = Math.max(relation, 80);
      }
      if ((r1 === '劉璋' && r2 === '劉備') || (r1 === '劉備' && r2 === '劉璋')) {
        relation = scenarioIndex < 3 ? 75 : 40;
      }

      // Slight random variation +/- 5
      relation += Math.floor(Math.random() * 11) - 5;
      relation = Math.max(0, Math.min(100, relation));
      
      data[rulerNames[i]][r2] = relation;
    }
  }
  return data;
}

export function adjustDiplomacyRelation(state: GameState, rulerA: string, rulerB: string, delta: number): void {
  if (!rulerA || !rulerB || rulerA === rulerB) return;
  if (!state.diplomacyData) state.diplomacyData = {};
  if (!state.diplomacyData[rulerA]) state.diplomacyData[rulerA] = {};
  if (!state.diplomacyData[rulerB]) state.diplomacyData[rulerB] = {};

  const cur = state.diplomacyData[rulerA][rulerB] ?? 50;
  const next = Math.max(0, Math.min(100, cur + delta));
  state.diplomacyData[rulerA][rulerB] = next;
  state.diplomacyData[rulerB][rulerA] = next;
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
          pState.soldiers = 0;
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

      let effectiveRole = isRuler ? '君主' : (g.role === '君主' ? '大將' : g.role);
      let effectiveMaxTroops = g.maxTroops;

      if (isRuler) {
        effectiveMaxTroops = 5000;
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
        hasActed: false,
        formations: getGeneralAvailableFormations({ ...g, provinceId }),
        skills: getGeneralAvailableSkills({ ...g, provinceId, role: effectiveRole }),
        passives: getGeneralPassives({ ...g, provinceId, role: effectiveRole })
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
      topGen.soldiers = calculateStartingGeneralTroops(
        '太守',
        topGen.maxTroops,
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
        bio: ht.desc,
        formations: getGeneralAvailableFormations(ht),
        skills: getGeneralAvailableSkills(ht)
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

  // 4.7 最終太守冊封：確保每個有兵將駐守的城池皆有太守（君主親任大本營太守，其餘城市任命最合適之將領為太守）
  Object.values(provincesData).forEach(p => {
    if (!p.rulerName) return;
    const provGens = Object.values(generalsData).filter(g => g.provinceId === p.id && !g.isWild);
    const hasRulerInProv = provGens.some(g => g.isRuler);

    if (provGens.length > 0) {
      if (hasRulerInProv) {
        // 有君主親自坐鎮之城市，其餘非君主將領若有原本誤封為太守者重置為大將或副將
        provGens.forEach(g => {
          if (!g.isRuler && g.role === '太守') {
            g.role = '大將';
          }
        });
      } else {
        // 無君主坐鎮之城市，必須確保有且僅有一位太守
        const taishouGens = provGens.filter(g => g.role === '太守');
        if (taishouGens.length === 0) {
          // 選出政治、智力、魅力與武力綜合最高的將領冊封為太守
          const sorted = [...provGens].sort((a, b) => (b.pol * 1.5 + b.cha + b.int + b.str) - (a.pol * 1.5 + a.cha + a.int + a.str));
          const topGen = sorted[0];
          topGen.role = '太守';
          topGen.soldiers = Math.max(topGen.soldiers, calculateStartingGeneralTroops(
            '太守',
            topGen.maxTroops,
            false,
            topGen.str,
            topGen.int,
            PROVINCE_BASE_CONFIGS[p.id]?.tier || 'MIDSIZED',
            scenarioIndex,
            p.rulerName || ''
          ));
        } else if (taishouGens.length > 1) {
          // 若因轉移多出太守，保留最高者，其餘降為大將
          taishouGens.sort((a, b) => (b.pol * 1.5 + b.cha + b.int + b.str) - (a.pol * 1.5 + a.cha + a.int + a.str));
          for (let i = 1; i < taishouGens.length; i++) {
            taishouGens[i].role = '大將';
          }
        }
      }
    }
  });

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

  // 5. 初始化歷史同盟
  const initialAlliances: Record<string, Record<string, number>> = {};
  if (scenario) {
    const addAlliance = (r1: string, r2: string, durationMonths: number) => {
      const hasR1 = scenario.rulers.some(r => r.name === r1);
      const hasR2 = scenario.rulers.some(r => r.name === r2);
      if (!hasR1 || !hasR2) return;
      
      const expiryAbsoluteMonth = (scenario.year * 12 + 1) + durationMonths;
      if (!initialAlliances[r1]) initialAlliances[r1] = {};
      if (!initialAlliances[r2]) initialAlliances[r2] = {};
      initialAlliances[r1][r2] = expiryAbsoluteMonth;
      initialAlliances[r2][r1] = expiryAbsoluteMonth;
    };

    switch (scenarioIndex) {
      case 0: // 189 反董卓聯盟
        addAlliance('曹操', '袁紹', 24);
        addAlliance('曹操', '劉備', 24);
        addAlliance('袁紹', '劉備', 24);
        addAlliance('孫堅', '袁術', 24); // 孫堅依附袁術
        break;
      case 1: // 195
        addAlliance('孫策', '袁術', 24);
        break;
      case 2: // 201 官渡
        addAlliance('袁紹', '劉備', 12);
        break;
      case 3: // 208 赤壁之戰 (蜀吳抗曹)
        addAlliance('劉備', '孫權', 60); // 孫劉同盟，設定較長5年
        break;
      case 4: // 215 湘水之盟 (勉強同盟)
        addAlliance('劉備', '孫權', 36); 
        break;
      case 5: // 220 吳魏短暫修好
        addAlliance('孫權', '曹丕', 24);
        break;
    }
  }

  const initialGameState: GameState = {
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
    alliances: initialAlliances,
    wildGenerals: []
  };

  initialGameState.aiTelemetry = {
    lastUpdatedYear: initialGameState.year,
    lastUpdatedMonth: initialGameState.month,
    factions: computeFactionAIDebugInfo(initialGameState, []),
    recentLogs: []
  };

  return initialGameState;
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
        const increase = calculateDevGain(totalPol);
        province.value = Math.min(tierRules.maxDev, province.value + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '商業開發' || action === '開發商業') {
      const commCost = 100; // 一次 100 金
      if (province.gold >= commCost) {
        province.gold -= commCost;
        const increase = calculateDevGain(totalPol);
        province.commerce = Math.min(tierRules.maxCommerce, (province.commerce || 0) + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '洪水防治') {
      const floodCost = 100; // 一次 100 金
      if (province.gold >= floodCost) {
        province.gold -= floodCost;
        const decrease = calculateFloodGain(totalPol);
        province.flood = Math.max(0, province.flood - decrease);
        actingGen.hasActed = true;
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
        const increase = calculateDevGain(totalPol);
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
          let totalAddedToGenerals = 0;

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
                totalAddedToGenerals += actualAdded;

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
              totalAddedToGenerals += actualAdded;

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
      const { allocations, unassignedTroops } = payload;
      if (actingGen && !actingGen.hasActed) {
        for (const [gName, newAmountRaw] of Object.entries(allocations)) {
          const gen = newState.generalsData[gName];
          const newAmount = Math.max(0, Math.min(gen?.maxTroops || 3000, Number(newAmountRaw) || 0));
          if (gen && gen.provinceId === provinceId) {
            gen.soldiers = newAmount;
          }
        }

        if (typeof unassignedTroops === 'number') {
          newState.provincesData[provinceId].soldiers = Math.max(0, unassignedTroops);
        } else {
          newState.provincesData[provinceId].soldiers = 0;
        }

        const provGens = Object.values(newState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild);
        const totalCityTroops = provGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);

        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;

        newState.lastActionResult = {
          action: '編制兵力',
          type: 'success',
          title: '📋 軍隊編制調整報告',
          message: `【${actingGen.name}】主持全郡兵力重新編制完成！\n城池將領總兵力：${totalCityTroops.toLocaleString()} 人，預備兵：${(unassignedTroops || 0).toLocaleString()} 人。`,
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
        
        const wasAutonomous = !!targetProv.isAutonomous;
        if (rulerMoved && targetProv.isAutonomous) {
          targetProv.isAutonomous = false;
          targetProv.autonomyPolicy = undefined;
          newState.provincesData[targetProvinceId] = targetProv;
        }

        const targetPInfo = provinces.find(p => p.id === targetProvinceId);
        const targetPName = targetPInfo ? targetPInfo.name : `${targetProvinceId}郡`;

        if (rulerMoved && wasAutonomous) {
          newState.lastActionResult = {
            action: '武將調動',
            title: '👑 君主移駕·王畿即刻親政',
            message: `君主親臨坐鎮【${targetPName}】！\n• 依國家體制方針：君主駐蹕處為勢力王畿都城，該城自治狀態即刻自動解除。\n• 全城政務由太守手中收回歸君主親政；指令盤中之兵士、內政、商業、謀略已全面解鎖！`,
            type: 'success'
          };
        }
      }
    } else if (action === '發動戰役' && payload) {
      const { 
        attackingGeneralNames, 
        targetProvinceId, 
        gold, 
        food, 
        strategist,
        cityProvisions,
        attackerPrimaryProvinceId,
        attackerReinforceProvinceId
      } = payload;
      const currentList = newState.pendingBattles || (newState.pendingBattle ? [newState.pendingBattle] : []);

      // 已經被攻擊的城市，不能再由其他城市發起二次進攻
      if (currentList.some(b => b.targetProvinceId === targetProvinceId)) {
        return state;
      }

      if (Array.isArray(attackingGeneralNames) && attackingGeneralNames.length > 0) {
        const attackerGeneralOrigins: Record<string, number> = {};
        const participatingProvinces = new Set<number>();

        attackingGeneralNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          if (gen && !gen.hasActed) {
            gen.hasActed = true;
            newState.generalsData[gName] = gen;
            if (gen.provinceId !== null && gen.provinceId !== undefined) {
              participatingProvinces.add(gen.provinceId);
              attackerGeneralOrigins[gName] = gen.provinceId;
            }
          }
        });

        // 依據各城市獨立配置或現存錢糧扣除配給
        const resourcesDeducted: Record<number, { gold: number; food: number }> = {};
        let totalGoldDeducted = 0;
        let totalFoodDeducted = 0;

        if (cityProvisions && typeof cityProvisions === 'object') {
          Object.entries(cityProvisions).forEach(([pIdStr, prov]) => {
            const pId = Number(pIdStr);
            const provState = newState.provincesData[pId];
            if (provState && prov) {
              const deductG = Math.min(provState.gold, Math.max(0, (prov as any).gold || 0));
              const deductF = Math.min(provState.food, Math.max(0, (prov as any).food || 0));
              provState.gold -= deductG;
              provState.food -= deductF;
              resourcesDeducted[pId] = { gold: deductG, food: deductF };
              totalGoldDeducted += deductG;
              totalFoodDeducted += deductF;
            }
          });
        } else {
          let remainingGold = gold || 0;
          let remainingFood = food || 0;

          participatingProvinces.forEach(pId => {
            const prov = newState.provincesData[pId];
            if (prov) {
              const deductG = Math.min(prov.gold, remainingGold);
              const deductF = Math.min(prov.food, remainingFood);
              prov.gold -= deductG;
              prov.food -= deductF;
              remainingGold -= deductG;
              remainingFood -= deductF;
              resourcesDeducted[pId] = { gold: deductG, food: deductF };
              totalGoldDeducted += deductG;
              totalFoodDeducted += deductF;
            }
          });
        }

        // 防守方武將與歸屬城池
        const targetProvState = newState.provincesData[targetProvinceId];
        const targetRuler = targetProvState?.rulerName;
        const defenderGeneralOrigins: Record<string, number> = {};
        const defenderResourcesDeducted: Record<number, { gold: number; food: number }> = {};

        // 1. 目標城池原本駐守的武將 (最多 5 人首發 + 備援)
        const nativeDefendingGens = Object.values(newState.generalsData)
          .filter(g => g.provinceId === targetProvinceId && !g.isWild)
          .sort((a, b) => b.soldiers - a.soldiers);

        nativeDefendingGens.forEach(g => {
          defenderGeneralOrigins[g.name] = targetProvinceId;
        });

        // 2. 敵方被進攻城池：AI 決定是否派出一座相鄰友軍城池馳援 (最多 5 人，自動攜帶糧食金錢)
        let defenderReinforceProvinceId: number | null = null;
        const targetProvInfo = provinces.find(p => p.id === targetProvinceId);
        const reinforceGenerals: string[] = [];

        if (targetRuler && targetProvInfo) {
          // 尋找相鄰同勢力城池
          const candidateReinforceCities = targetProvInfo.connections
            .filter(cid => newState.provincesData[cid]?.rulerName === targetRuler)
            .map(cid => {
              const cState = newState.provincesData[cid];
              const cGens = Object.values(newState.generalsData).filter(g => g.provinceId === cid && !g.isWild && g.soldiers > 0);
              const totalTroops = cGens.reduce((sum, g) => sum + g.soldiers, 0);
              return { id: cid, state: cState, gens: cGens, totalTroops };
            })
            .filter(c => c.gens.length > 0 && c.totalTroops >= 800)
            .sort((a, b) => b.totalTroops - a.totalTroops);

          // 若有足夠兵力的相鄰同勢力城池，派出該城援軍
          if (candidateReinforceCities.length > 0) {
            const bestReinforceCity = candidateReinforceCities[0];
            defenderReinforceProvinceId = bestReinforceCity.id;

            // 挑選該城前 5 名最強武將參戰
            const chosenReinforceGens = bestReinforceCity.gens.slice(0, 5);
            let reinforceTroopsTotal = 0;

            chosenReinforceGens.forEach(rg => {
              reinforceGenerals.push(rg.name);
              defenderGeneralOrigins[rg.name] = bestReinforceCity.id;
              reinforceTroopsTotal += rg.soldiers;
              // 標記該援軍將領本月已出征行動
              rg.hasActed = true;
              newState.generalsData[rg.name] = rg;
            });

            // 援軍城池自動扣除隨軍錢糧 (金 300~500, 30日口糧)
            const rCityState = newState.provincesData[bestReinforceCity.id];
            if (rCityState) {
              const defFoodDeduct = Math.min(rCityState.food, Math.ceil((reinforceTroopsTotal / 10) * 30));
              const defGoldDeduct = Math.min(rCityState.gold, 500);
              rCityState.food -= defFoodDeduct;
              rCityState.gold -= defGoldDeduct;
              defenderResourcesDeducted[bestReinforceCity.id] = { gold: defGoldDeduct, food: defFoodDeduct };
            }
          }
        }

        const allDefendingGeneralNames = [
          ...nativeDefendingGens.map(g => g.name),
          ...reinforceGenerals
        ];

        const primaryAtkCity = attackerPrimaryProvinceId 
          || (Array.from(participatingProvinces)[0] || provinceId);
        const reinforceAtkCity = attackerReinforceProvinceId 
          || (Array.from(participatingProvinces).find(id => id !== primaryAtkCity) || null);

        const newBattlePlan = {
          id: `battle_${targetProvinceId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          targetProvinceId,
          attackerProvinceId: primaryAtkCity,
          attackerReinforceProvinceId: reinforceAtkCity,
          attackingGenerals: attackingGeneralNames,
          defendingGenerals: allDefendingGeneralNames,
          attackerStrategist: strategist || null,
          defenderStrategist: null, // will auto compute in battle
          attackerGold: totalGoldDeducted || gold || 0,
          attackerFood: totalFoodDeducted || food || 0,
          resourcesDeducted,
          attackerGeneralOrigins,
          defenderPrimaryProvinceId: targetProvinceId,
          defenderReinforceProvinceId,
          defenderGeneralOrigins,
          defenderResourcesDeducted
        };

        const updatedList = [...currentList, newBattlePlan];
        newState.pendingBattles = updatedList;
        newState.pendingBattle = updatedList[0] || null;

        // 外交關係衝擊：向他國宣戰
        if (targetRuler && targetRuler !== state.rulerName) {
          const isAllied = newState.alliances?.[state.rulerName]?.[targetRuler];
          if (isAllied) {
            // 背盟出征
            if (newState.alliances?.[state.rulerName]) delete newState.alliances[state.rulerName][targetRuler];
            if (newState.alliances?.[targetRuler]) delete newState.alliances[targetRuler][state.rulerName];
            if (!newState.diplomacyData) newState.diplomacyData = {};
            if (!newState.diplomacyData[state.rulerName]) newState.diplomacyData[state.rulerName] = {};
            if (!newState.diplomacyData[targetRuler]) newState.diplomacyData[targetRuler] = {};
            newState.diplomacyData[state.rulerName][targetRuler] = 0;
            newState.diplomacyData[targetRuler][state.rulerName] = 0;
            
            // 背盟背信，全境民心 -3
            Object.values(newState.provincesData).forEach(p => {
              if (p.rulerName === state.rulerName) {
                p.loyalty = Math.max(0, p.loyalty - 3);
              }
            });
            newState.lastActionResult = {
              action: '發動戰役',
              title: '⚔️ 破盟出征：天下震駭！',
              message: `我軍悍然向同盟國【${targetRuler}】發起戰端！同盟條約徹底瓦解，雙方友好度驟降至 0！百姓感念失信，我方各郡民心微降 3 點！`,
              type: 'info'
            };
          } else {
            // 普通開戰：友好度大幅扣減 35~45 點
            adjustDiplomacyRelation(newState, state.rulerName, targetRuler, -(35 + Math.floor(Math.random() * 11)));
          }
        }
      }
    } else if (action === '撤銷出征' || action === '取消戰役') {
      const currentList = newState.pendingBattles || (newState.pendingBattle ? [newState.pendingBattle] : []);
      const targetPlanId = payload?.planId;
      const targetProvId = payload?.targetProvinceId;

      const battlesToCancel = (targetPlanId || targetProvId)
        ? currentList.filter(b => (targetPlanId && b.id === targetPlanId) || (targetProvId && b.targetProvinceId === targetProvId))
        : currentList;

      const remainingBattles = (targetPlanId || targetProvId)
        ? currentList.filter(b => !((targetPlanId && b.id === targetPlanId) || (targetProvId && b.targetProvinceId === targetProvId)))
        : [];

      battlesToCancel.forEach(battlePlan => {
        // 返還進攻將領行動狀態
        battlePlan.attackingGenerals.forEach(gName => {
          if (newState.generalsData[gName]) {
            newState.generalsData[gName] = { ...newState.generalsData[gName], hasActed: false };
          }
        });
        // 返還各進攻城市扣除的隨軍錢糧
        if (battlePlan.resourcesDeducted) {
          Object.entries(battlePlan.resourcesDeducted).forEach(([pIdStr, res]) => {
            const pId = Number(pIdStr);
            if (newState.provincesData[pId]) {
              newState.provincesData[pId].gold += res.gold;
              newState.provincesData[pId].food += res.food;
            }
          });
        }
        // 返還防守援軍將領行動狀態與資源
        if (battlePlan.defenderReinforceProvinceId && battlePlan.defenderGeneralOrigins) {
          Object.entries(battlePlan.defenderGeneralOrigins).forEach(([gName, pId]) => {
            if (pId === battlePlan.defenderReinforceProvinceId && newState.generalsData[gName]) {
              newState.generalsData[gName] = { ...newState.generalsData[gName], hasActed: false };
            }
          });
        }
        if (battlePlan.defenderResourcesDeducted) {
          Object.entries(battlePlan.defenderResourcesDeducted).forEach(([pIdStr, res]) => {
            const pId = Number(pIdStr);
            if (newState.provincesData[pId]) {
              newState.provincesData[pId].gold += res.gold;
              newState.provincesData[pId].food += res.food;
            }
          });
        }
      });

      newState.pendingBattles = remainingBattles;
      newState.pendingBattle = remainingBattles[0] || null;
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
      
      const rulerName = targetProv.rulerName;
      if (Math.random() * 100 < successRate) {
        const dropPopLoyalty = Math.floor(Math.random() * 11) + 15; // 15~25
        targetProv.loyalty = Math.max(0, targetProv.loyalty - dropPopLoyalty);

        if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -10);

        newState.lastActionResult = {
          action: '流言煽動',
          title: '🗣️ 流言煽動：風聲鶴唳！',
          message: `【${actingGen.name}】潛入【${targetProvName}】散布謠言成功！敵軍陣腳大亂，該郡民心下降 ${dropPopLoyalty} 點！（兩國友好度 -10）`,
          type: 'success'
        };
      } else {
        if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -5);

        newState.lastActionResult = {
          action: '流言煽動',
          title: '❌ 計策失敗：流言平息',
          message: `【${actingGen.name}】於【${targetProvName}】散布謠言，被敵軍智將識破並迅速平息，未能造成影響。（因走漏風聲，兩國友好度 -5）`,
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

        if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -25);

        newState.lastActionResult = {
          action: '驅虎吞狼',
          title: '📜 驅虎吞狼：兩虎相爭！',
          message: `【${actingGen.name}】出使挑撥成功！【${rulerName}】受迫對外發起戰端，導致【${targetProvName}】兵力與錢糧皆有折損！（兩國友好度 -25）`,
          type: 'success'
        };
      } else {
        if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -10);

        newState.lastActionResult = {
          action: '驅虎吞狼',
          title: '❌ 計策失敗：挑撥無效',
          message: `【${actingGen.name}】試圖挑撥【${rulerName}】興兵，但被敵方識破其計，無功而返。（敵方君主極度不悅，友好度 -10）`,
          type: 'failure'
        };
      }
    } else if (action === '離間君臣' && targetProv && payload?.targetGeneralName && province.gold >= 400) {
      province.gold -= 400;
      const targetGen = newState.generalsData[payload.targetGeneralName];
      const rulerName = targetProv.rulerName;
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
          if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -15);
          
          newState.lastActionResult = {
            action: '離間君臣',
            title: '🎭 離間君臣：敵將生疑！',
            message: `【${actingGen.name}】流言離間奏效！【${targetGen.name}】對其君主心生芥蒂，忠誠度下降 ${drop} 點（當前忠誠降至 ${targetGen.loyalty}）！（兩國友好度 -15）`,
            type: 'success'
          };
          newState.generalsData[targetGen.name] = targetGen;
        } else {
          if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -8);

          newState.lastActionResult = {
            action: '離間君臣',
            title: '❌ 計策失敗：君臣同心',
            message: `【${actingGen.name}】試圖離間【${targetGen.name}】，然其對君主忠心不二，計策未能生效。（兩國友好度 -8）`,
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
              let troops = 0;
              Object.values(newState.generalsData).filter(g => g.provinceId === cid && !g.isWild).forEach(g => troops += g.soldiers);
              alliedSurroundingTroops += troops;
           }
        });
      }
      
      let enemyTotalTroops = 0;
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
        if (rulerName) adjustDiplomacyRelation(newState, state.rulerName, rulerName, -15);

        newState.lastActionResult = {
          action: '勸降逼降',
          title: '❌ 計策失敗：寧死不屈',
          message: `【${actingGen.name}】入城勸降，然【${rulerName}】心存僥倖，寧死不屈，悍然將使者逐出城外！（君主震怒，兩國友好度 -15）`,
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
          adjustDiplomacyRelation(newState, state.rulerName, rulerName, -5);
          newState.lastActionResult = {
            action: '同盟締結',
            title: '❌ 同盟破裂：好感不足',
            message: `【${actingGen.name}】雖奉上厚禮，但兩國當前友好度（${currentRel}）未達 90，【${rulerName}】斷然拒絕了同盟之議！（友好度 -5）`,
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

            targetProv.gold += 2000;
            
            newState.lastActionResult = {
              action: '同盟締結',
              title: '🤝 同盟締結：兩國交好！',
              message: `【${actingGen.name}】以三寸不爛之舌與厚禮打動了【${rulerName}】！雙方立誓結為同盟，為期 ${duration} 個月！`,
              type: 'success'
            };
          } else {
            adjustDiplomacyRelation(newState, state.rulerName, rulerName, -5);
            newState.lastActionResult = {
              action: '同盟締結',
              title: '❌ 同盟破裂：嚴詞拒絕',
              message: `【${actingGen.name}】奉上厚禮，但【${rulerName}】對我國仍抱持疑慮，拒絕了同盟之議！（友好度 -5）`,
              type: 'failure'
            };
          }
        }
      }
    } else if (action === '撕毀同盟' && targetProv) {
      const rulerName = targetProv.rulerName;
      if (rulerName && rulerName !== state.rulerName) {
        const isAllied = newState.alliances?.[state.rulerName]?.[rulerName];
        if (isAllied) {
          if (newState.alliances?.[state.rulerName]) delete newState.alliances[state.rulerName][rulerName];
          if (newState.alliances?.[rulerName]) delete newState.alliances[rulerName][state.rulerName];
          
          if (!newState.diplomacyData) newState.diplomacyData = {};
          if (!newState.diplomacyData[state.rulerName]) newState.diplomacyData[state.rulerName] = {};
          if (!newState.diplomacyData[rulerName]) newState.diplomacyData[rulerName] = {};
          newState.diplomacyData[state.rulerName][rulerName] = 15;
          newState.diplomacyData[rulerName][state.rulerName] = 15;
          
          newState.lastActionResult = {
            action: '撕毀同盟',
            title: '📜 廢棄盟約：宣告決裂',
            message: `君主下詔：正式廢黜與【${rulerName}】之同盟條約！兩國互不侵犯盟約宣告終止，關係降至 15（摩擦戒備狀態），今後軍事調度不再受同盟限制。`,
            type: 'info'
          };
        } else {
          newState.lastActionResult = {
            action: '撕毀同盟',
            title: '❌ 無法撕毀：非同盟國',
            message: `我國當前並未與【${rulerName}】締結同盟，毋須撕毀盟約。`,
            type: 'failure'
          };
        }
      }
    } else if (action === '請求援軍' && targetProv) {
      const rulerName = targetProv.rulerName;
      if (rulerName && actingGen) {
        const isAllied = newState.alliances?.[state.rulerName]?.[rulerName];
        const currentRel = newState.diplomacyData?.[state.rulerName]?.[rulerName] ?? 50;
        
        if (!isAllied) {
          newState.lastActionResult = {
            action: '請求援軍',
            title: '❌ 請求失敗：非同盟國',
            message: `【${actingGen.name}】前往交涉，但【${rulerName}】以「兩國非互保同盟」為由，婉拒提供軍資援助！`,
            type: 'failure'
          };
        } else if (currentRel < 70) {
          newState.lastActionResult = {
            action: '請求援軍',
            title: '❌ 請求未果：情誼轉薄',
            message: `【${actingGen.name}】前往求援，然【${rulerName}】認為當前兩國友好度（${currentRel}）尚不足以撥發軍資，拒絕了援助請求。`,
            type: 'failure'
          };
        } else {
          const envoyStats = actingGen.pol + actingGen.cha + getGeneralItemBonus(actingGen.name, state.currentScenario).polBonus + getGeneralItemBonus(actingGen.name, state.currentScenario).chaBonus;
          if (envoyStats < 140) {
            newState.lastActionResult = {
              action: '請求援軍',
              title: '❌ 請求受阻：使節才能不足',
              message: `【${actingGen.name}】（政+魅: ${envoyStats}）才能未達 140 門檻，未能說服【${rulerName}】幕僚，求援無功而返。`,
              type: 'failure'
            };
          } else {
            const aidGold = Math.min(1500, Math.max(500, Math.floor(targetProv.gold * 0.3)));
            const aidFood = Math.min(15000, Math.max(5000, Math.floor(targetProv.food * 0.3)));
            targetProv.gold -= aidGold;
            targetProv.food -= aidFood;
            province.gold += aidGold;
            province.food += aidFood;
            
            // Aid consumes some diplomatic relationship
            adjustDiplomacyRelation(newState, state.rulerName, rulerName, -5);
            
            newState.lastActionResult = {
              action: '請求援軍',
              title: '🤝 盟邦來援：撥付錢糧物資！',
              message: `【${actingGen.name}】憑藉過人口才成功說服盟友【${rulerName}】！【${rulerName}】下令自【${targetProvName}】緊急撥調【${aidGold} 金】與【${aidFood} 糧】馳援我軍！（兩國友好度 -5）`,
              type: 'success'
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

      // 清除同郡其他武將的太守職稱，恢復為大將（不縮減兵力或兵力上限）
      Object.values(newState.generalsData).forEach(g => {
        if (g.provinceId === targetProvId && g.role === '太守' && g.name !== actingGen.name) {
          newState.generalsData[g.name] = { 
            ...g, 
            role: '大將'
          };
        }
      });

      // 指定太守：增加忠誠度 +10（上限 100），允許城市自治，不修改武將兵力上限
      const oldLoyalty = actingGen.loyalty || 80;
      const newLoyalty = Math.min(100, oldLoyalty + 10);
      const loyaltyGain = newLoyalty - oldLoyalty;

      actingGen.role = '太守';
      actingGen.loyalty = newLoyalty;
      newState.generalsData[actingGen.name] = actingGen;

      newState.lastActionResult = {
        action: '指定太守',
        title: '📜 授任冊封：任命太守',
        message: `君主下詔：正式冊封【${actingGen.name}】為【${provName}】太守！\n• 獲得太守殊榮，忠誠度提升至 ${newLoyalty} (+${loyaltyGain})\n• 該郡已具備太守坐鎮，君主可授權「郡縣自治」委託治理。`,
        type: 'success'
      };
      return newState;
    } else if (action === '郡縣自治' && payload) {
      const { targetProvinceIds, isAutonomous, autonomyPolicy } = payload;
      if (Array.isArray(targetProvinceIds) && targetProvinceIds.length > 0) {
        const rulerGen = Object.values(newState.generalsData).find(g => g.name === state.rulerName);
        let successCount = 0;
        let failCount = 0;
        const affectedNames: string[] = [];

        for (const pid of targetProvinceIds) {
          const pState = newState.provincesData[pid];
          if (!pState) continue;

          if (isAutonomous && rulerGen?.provinceId === pid) {
            failCount++;
            continue;
          }

          pState.isAutonomous = !!isAutonomous;
          if (isAutonomous) {
            pState.autonomyPolicy = autonomyPolicy || 'balanced';
          } else {
            pState.autonomyPolicy = undefined;
          }
          newState.provincesData[pid] = pState;

          const pInfo = provinces.find(p => p.id === pid);
          affectedNames.push(pInfo ? pInfo.name : `${pid}郡`);
          successCount++;
        }

        if (successCount > 0) {
          const namesStr = affectedNames.length > 3 
            ? `${affectedNames.slice(0, 3).join('、')}等${affectedNames.length}郡` 
            : affectedNames.join('、');
            
          const policyInfo = getAutonomyPolicyInfo(autonomyPolicy);

          newState.lastActionResult = {
            action: '郡縣自治',
            title: isAutonomous ? '🏛️ 郡縣自治：批量授權委任' : '🏛️ 郡縣自治：批量收回直轄',
            message: isAutonomous
              ? `君主下詔：正式授權【${namesStr}】實施郡縣自治！\n• 奉行方針：【${policyInfo.icon} ${policyInfo.name}】（${policyInfo.desc}）\n• 各城太守將於每月初依照方針自動治水防汛、開墾撫民與操演部隊。\n• 若君主日後移駕自治城池，該城將自動解除自治。${failCount > 0 ? `\n\n⚠️ 備註：君主所在之都城不可自治，已自動略過。` : ''}`
              : `君主下詔：收回【${namesStr}】自治授權，回歸君主親政直轄！政務自太守手中收回，全城指令盤即日起全面解鎖。`,
            type: 'info'
          };
        } else if (failCount > 0) {
          newState.lastActionResult = {
            action: '郡縣自治',
            title: '❌ 自治授權失敗',
            message: '君主所在城市不可設定為自治！君主親在治所，當躬親民政。',
            type: 'failure'
          };
        }
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

          if (tRuler && tRuler !== '敵君') {
            adjustDiplomacyRelation(newState, state.rulerName, tRuler, -12);
          }

          newState.lastActionResult = {
            action: '登用他國人才',
            title: '🎉 策反登用成功：名將歸順！',
            message: `【${actingGen.name}】親赴【${tProvName}】暗中密會，憑藉三寸不爛之舌與浩蕩皇威，說服敵將【${targetGeneralName}】棄暗投明！【${targetGeneralName}】正式歸順我軍麾下（初始忠誠：${targetGen.loyalty}）！（敵君震怒，友好度 -12）`,
            type: 'success'
          };
        } else {
          if (tRuler && tRuler !== '敵君') {
            adjustDiplomacyRelation(newState, state.rulerName, tRuler, -5);
          }

          newState.lastActionResult = {
            action: '登用他國人才',
            title: '❌ 策反登用失敗：敵將未動',
            message: `【${actingGen.name}】密赴【${tProvName}】試圖遊說【${targetGeneralName}】，然【${targetGeneralName}】感念現君主【${tRuler}】舊恩（忠誠度: ${targetGen.loyalty}），拒絕棄主投效。（兩國友好度 -5）`,
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
        if (targetGen) {
          if (targetGen.isCaptive) {
            // 天牢俘虜說服招降
            const origRuler = targetGen.originalRulerName;
            const origFactionActive = origRuler ? (Object.values(newState.provincesData) as ProvinceState[]).some(p => p.rulerName === origRuler) : false;
            const targetLoyalty = targetGen.loyalty || 50;
            
            let successRate: number;
            if (origFactionActive) {
              // 舊主尚在人間且勢力未滅，俘虜感懷故主，勸降難度極高
              if (targetLoyalty >= 90) {
                // 死忠名將在舊主尚存時勸降率極低 (5%)
                successRate = Math.min(10, Math.max(3, (actingGen.cha / 120) * 8));
              } else {
                successRate = Math.min(45, Math.max(8, (actingGen.cha / 110) * (1 - targetLoyalty / 130) * 45));
              }
            } else {
              // 舊主勢力已遭滅絕或無主，國破家亡，更容易感念新主恩德
              successRate = Math.min(95, Math.max(25, (actingGen.cha / 100) * (1 - targetLoyalty / 180) * 100));
            }

            const roll = Math.random() * 100;
            if (roll < successRate) {
              targetGen.isCaptive = false;
              targetGen.captiveOfRuler = null;
              targetGen.provinceId = provinceId;
              targetGen.loyalty = Math.min(100, 65 + Math.floor(actingGen.cha / 5));
              targetGen.hasActed = true;
              newState.generalsData[targetGeneralName] = targetGen;

              newState.lastActionResult = {
                action: '登用人才',
                title: '🎉 勸降天牢俘虜成功：名將歸順！',
                message: origFactionActive
                  ? `【${actingGen.name}】親赴天牢動之以情、曉之以理，【${targetGeneralName}】雖念舊主，終被主公盛意打動，同意棄暗投明！（初始忠誠度：${targetGen.loyalty}）`
                  : `【${actingGen.name}】親赴天牢懇切說服，俘虜【${targetGeneralName}】感佩恩威，開懷應允棄暗投明，正式加入我軍！（初始忠誠度：${targetGen.loyalty}）`,
                type: 'success'
              };
            } else {
              const refusalReason = origFactionActive
                ? `『吾主【${origRuler}】尚在，豈能苟且降敵！何必多言！』`
                : `『忠臣不事二主，何必多言！』`;
              newState.lastActionResult = {
                action: '登用人才',
                title: '❌ 勸降天牢俘虜失敗：寧死不屈',
                message: `【${actingGen.name}】親赴天牢嘗試遊說【${targetGeneralName}】，然對方怒道：${refusalReason}拒絕歸順。`,
                type: 'failure'
              };
            }
            actingGen.hasActed = true;
            newState.generalsData[actingGen.name] = actingGen;
          } else if (targetGen.isWild && targetGen.provinceId === provinceId) {
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

function executeFactionRedeploymentAI(newState: GameState, rulerName: string, decisionLogs?: AIDecisionLogItem[]) {
  const rulerProvinces = Object.values(newState.provincesData).filter(p => p.rulerName === rulerName);
  if (rulerProvinces.length <= 1) return;

  // 1. 標記各城是否為前線，並統計現有駐將與敵鄰威脅
  const cityInfo = rulerProvinces.map(p => {
    const pBase = provinces.find(x => x.id === p.id);
    const activeGens = Object.values(newState.generalsData).filter(
      g => g.provinceId === p.id && !g.isWild && !g.activeTask
    );

    let threatScore = 0;
    let hasEnemyNeighbor = false;

    if (pBase) {
      for (const connId of pBase.connections) {
        const neighbor = newState.provincesData[connId];
        if (!neighbor || neighbor.rulerName !== rulerName) {
          hasEnemyNeighbor = true;
          if (neighbor && neighbor.rulerName) {
            const enemyGens = Object.values(newState.generalsData).filter(
              g => g.provinceId === connId && !g.isWild
            );
            const enemyTroops = (neighbor.soldiers || 0) + enemyGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);
            threatScore += enemyTroops;
            if (neighbor.rulerName === newState.rulerName) {
              threatScore += 3500; // 鄰近玩家勢力加權
            }
          } else {
            threatScore += 500; // 鄰近空城
          }
        }
      }
    }

    return {
      province: p,
      isFrontier: hasEnemyNeighbor,
      threatScore,
      generals: activeGens
    };
  });

  // 2. 尋找急需武將的前線城池 (Target)
  // 優先級：
  // a) 0 名武將的前線城池 (極度危險)
  // b) 1 名武將且面臨威脅的前線城池
  // c) 守備力量薄弱的前線城池 (generals < 3)
  const needyCities = cityInfo
    .filter(c => c.isFrontier && c.generals.length < 3)
    .sort((a, b) => {
      if (a.generals.length !== b.generals.length) {
        return a.generals.length - b.generals.length;
      }
      return b.threatScore - a.threatScore;
    });

  if (needyCities.length === 0) return;
  const targetCity = needyCities[0];

  // 3. 尋找可調出武將的來源城池 (Donor)
  // 優先從後方腹地 (isFrontier === false) 且 generals >= 2 的城池調派
  // 其次從武將富餘 (generals >= 4) 的前線城池調派
  const potentialDonors = cityInfo.filter(c => {
    if (c.province.id === targetCity.province.id) return false;
    if (!c.isFrontier && c.generals.length >= 2) return true;
    if (c.isFrontier && c.generals.length >= 4) return true;
    return false;
  });

  if (potentialDonors.length === 0) return;

  potentialDonors.sort((a, b) => {
    if (a.isFrontier !== b.isFrontier) {
      return a.isFrontier ? 1 : -1; // 後方腹地優先調派
    }
    return b.generals.length - a.generals.length;
  });

  const donorCity = potentialDonors[0];
  const donorGens = donorCity.generals.filter(g => !g.hasActed);
  if (donorGens.length === 0) return;

  // 挑選適合前線作戰的武將 (優先武力高、非唯一主公)
  donorGens.sort((a, b) => {
    if (a.isRuler !== b.isRuler) return a.isRuler ? 1 : -1;
    return b.str - a.str;
  });

  const generalToMove = donorGens[0];
  if (generalToMove.isRuler && donorCity.generals.length <= 2) return;

  // 執行調動
  generalToMove.provinceId = targetCity.province.id;
  generalToMove.hasActed = true;
  newState.generalsData[generalToMove.name] = generalToMove;

  // 消耗糧草行軍
  if (donorCity.province.food >= 200) {
    donorCity.province.food -= 100;
  }

  // 記錄調度訊息
  const donorName = provinces.find(x => x.id === donorCity.province.id)?.name || '城池';
  const targetName = provinces.find(x => x.id === targetCity.province.id)?.name || '城池';

  if (decisionLogs) {
    decisionLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      rulerName,
      provinceId: targetCity.province.id,
      provinceName: targetName,
      generalName: generalToMove.name,
      actionType: '戰略調度',
      detail: `自後方【${donorName}】調遣大將【${generalToMove.name}】馳援前線【${targetName}】防務`,
      costGold: 0,
      costFood: 100,
      gainText: `進駐前線要衝協防`,
      year: newState.year,
      month: newState.month,
      timestamp: Date.now()
    });
  }

  const MAJOR_RULERS = ['曹操', '劉備', '孫策', '孫權', '袁紹', '董卓', '呂布', '馬騰', '劉表'];
  // 戰略調度已完整記入 AI 決策日誌與觀測儀，每月訊息列僅保留重大戰事與城池攻佔
}

// 尋找同勢力城池間之連通補給路徑 (BFS 確保物流走友方領地連通線)
function findFriendlySupplyRoute(
  fromCityId: number, 
  toCityId: number, 
  rulerName: string, 
  provincesData: Record<number, ProvinceState>
): number[] | null {
  if (fromCityId === toCityId) return [fromCityId];
  const queue: { current: number; path: number[] }[] = [{ current: fromCityId, path: [fromCityId] }];
  const visited = new Set<number>([fromCityId]);

  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const { current, path } = head;
    const pBase = provinces.find(x => x.id === current);
    if (!pBase) continue;

    for (const neighborId of pBase.connections) {
      if (neighborId === toCityId) {
        return [...path, neighborId];
      }
      const neighborState = provincesData[neighborId];
      // 必須是該勢力所轄城池才能作為安全連通後勤線
      if (neighborState && neighborState.rulerName === rulerName && !visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ current: neighborId, path: [...path, neighborId] });
      }
    }
  }
  return null;
}

// 戰略物資長途調配 (Logistics & Transport AI)
// 解決後方安全腹地囤積數萬糧草金錢，前線要衝卻缺糧徵不起兵的脫節問題
function executeFactionLogisticsAI(newState: GameState, rulerName: string, decisionLogs?: AIDecisionLogItem[]) {
  const rulerProvinces = Object.values(newState.provincesData).filter(p => p.rulerName === rulerName);
  if (rulerProvinces.length <= 1) return;

  // 1. 盤點各城防務態勢與資源狀況
  const cityInfo = rulerProvinces.map(p => {
    const pBase = provinces.find(x => x.id === p.id);
    const activeGens = Object.values(newState.generalsData).filter(
      g => g.provinceId === p.id && !g.isWild
    );
    const garrisonTroops = (p.soldiers || 0) + activeGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);

    let threatScore = 0;
    let hasEnemyNeighbor = false;

    if (pBase) {
      for (const connId of pBase.connections) {
        const neighbor = newState.provincesData[connId];
        if (!neighbor || neighbor.rulerName !== rulerName) {
          hasEnemyNeighbor = true;
          if (neighbor && neighbor.rulerName) {
            const enemyGens = Object.values(newState.generalsData).filter(
              g => g.provinceId === connId && !g.isWild
            );
            const enemyTroops = (neighbor.soldiers || 0) + enemyGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);
            threatScore += enemyTroops;
            if (neighbor.rulerName === newState.rulerName) {
              threatScore += 3500; // 玩家威脅加權
            }
          } else {
            threatScore += 500;
          }
        }
      }
    }

    return {
      province: p,
      isFrontier: hasEnemyNeighbor,
      threatScore,
      garrisonTroops,
      generals: activeGens
    };
  });

  // 2. 尋找急需物資之前線城池 (Target)
  // 前線城池若糧食 < 4500，或金錢 < 600，或軍糧低於全城部隊需求 (garrisonTroops * 0.8)
  const needyFrontiers = cityInfo.filter(c => {
    if (!c.isFrontier) return false;
    const foodDeficient = c.province.food < 4500 || c.province.food < c.garrisonTroops * 0.8;
    const goldDeficient = c.province.gold < 600;
    return foodDeficient || goldDeficient;
  });

  if (needyFrontiers.length === 0) return;

  // 依威脅程度與糧金匱乏程度排序
  needyFrontiers.sort((a, b) => {
    const aUrgency = (5000 - a.province.food) + (800 - a.province.gold) * 3 + a.threatScore;
    const bUrgency = (5000 - b.province.food) + (800 - b.province.gold) * 3 + b.threatScore;
    return bUrgency - aUrgency;
  });

  const targetCity = needyFrontiers[0];

  // 3. 尋找物資富餘之來源城池 (Donor)
  // 優先後方安全腹地 (!isFrontier)，糧食 > 4000 或金錢 > 800
  // 或是即使是前線，但糧草充盈 (> 9000 糧, > 2000 金)
  const potentialDonors = cityInfo.filter(c => {
    if (c.province.id === targetCity.province.id) return false;
    if (!c.isFrontier && (c.province.food > 3800 || c.province.gold > 700)) return true;
    if (c.isFrontier && (c.province.food > 8500 || c.province.gold > 1800)) return true;
    return false;
  });

  if (potentialDonors.length === 0) return;

  // 優先選擇後方腹地且物資最富足的城池
  potentialDonors.sort((a, b) => {
    if (a.isFrontier !== b.isFrontier) {
      return a.isFrontier ? 1 : -1;
    }
    const aSurplus = a.province.food + a.province.gold * 2;
    const bSurplus = b.province.food + b.province.gold * 2;
    return bSurplus - aSurplus;
  });

  // 4. 尋找具備連通補給線的調配來源
  let donorCity: typeof cityInfo[0] | null = null;
  let supplyRoute: number[] | null = null;

  for (const candidate of potentialDonors) {
    const route = findFriendlySupplyRoute(candidate.province.id, targetCity.province.id, rulerName, newState.provincesData);
    if (route) {
      donorCity = candidate;
      supplyRoute = route;
      break;
    }
  }

  if (!donorCity || !supplyRoute) return;

  const hops = supplyRoute.length - 1; // 運輸經過的城際距離
  const donorProv = donorCity.province;
  const targetProv = targetCity.province;

  // 保留後方安全基準 (至少留 2500 糧、400 金自用)
  const safeRetainFood = donorCity.isFrontier ? 4000 : 2500;
  const safeRetainGold = donorCity.isFrontier ? 600 : 350;

  const maxTransferableFood = Math.max(0, donorProv.food - safeRetainFood);
  const maxTransferableGold = Math.max(0, donorProv.gold - safeRetainGold);

  const neededFood = Math.max(0, 5500 - targetProv.food);
  const neededGold = Math.max(0, 1000 - targetProv.gold);

  const transferFood = Math.min(maxTransferableFood, Math.min(neededFood, 4500));
  const transferGold = Math.min(maxTransferableGold, Math.min(neededGold, 800));

  if (transferFood < 400 && transferGold < 150) return;

  // 輜重隊損耗 (行軍路途每多跨 1 郡損耗 2.5% 隨軍口糧，上限 15%)
  const transitLossPct = Math.min(0.15, Math.max(0, (hops - 1) * 0.025));
  const transitLossFood = Math.floor(transferFood * transitLossPct);
  const arrivedFood = transferFood - transitLossFood;

  // 執行物資轉移
  donorProv.food -= transferFood;
  donorProv.gold -= transferGold;
  targetProv.food += arrivedFood;
  targetProv.gold += transferGold;

  newState.provincesData[donorProv.id] = donorProv;
  newState.provincesData[targetProv.id] = targetProv;

  // 嘗試指派一位尚未行動的武將領銜輜重官（優先統御/智謀或中堅武將）
  const availableGens = donorCity.generals.filter(g => !g.hasActed);
  let convoyLeader: GeneralState | null = null;
  if (availableGens.length > 0) {
    availableGens.sort((a, b) => {
      if (a.isRuler !== b.isRuler) return a.isRuler ? 1 : -1;
      return (b.pol + b.cha) - (a.pol + a.cha);
    });
    convoyLeader = availableGens[0];
    convoyLeader.hasActed = true;
    newState.generalsData[convoyLeader.name] = convoyLeader;
  }

  const donorName = provinces.find(x => x.id === donorProv.id)?.name || '城池';
  const targetName = provinces.find(x => x.id === targetProv.id)?.name || '城池';
  const leaderName = convoyLeader ? convoyLeader.name : '輜重督運營';

  if (decisionLogs) {
    const routeText = hops === 1 ? '相鄰飛馳抵達' : `經由 ${hops} 郡友軍連通線路運達`;
    decisionLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      rulerName,
      provinceId: targetProv.id,
      provinceName: targetName,
      generalName: leaderName,
      actionType: '軍糧輜重',
      detail: `自後方【${donorName}】派遣輜重車隊，調撥黃金 ${transferGold.toLocaleString()}、軍糧 ${transferFood.toLocaleString()} 石押運支援前線【${targetName}】（${routeText}）`,
      costGold: transferGold,
      costFood: transferFood,
      gainText: `前線軍備充盈 (金+${transferGold}, 糧+${arrivedFood})`,
      year: newState.year,
      month: newState.month,
      timestamp: Date.now()
    });
  }
}

/**
 * 外交博弈層 (Diplomacy AI)
 * 1. 主動提議同盟 (Proactive Alliance Offer): 當第三方強權崛起或友好度良好時，派使者提出結盟共禦強敵，彈窗供玩家選擇
 * 2. 劣勢求和與納貢 (Desperation Peace Offer): 弱小勢力瀕臨滅亡時，派使者攜帶金糧前來叩首乞和停戰
 * 3. 背刺與撕毀盟約 (Treachery & Betrayal): 野心極高（呂布、董卓、袁術等）或玩家邊防極度空虛時，低機率突然撕毀盟約突襲
 * ※ 設計原則：發動機率低，不干擾日常內政與軍事節奏
 */
function executeFactionDiplomacyAI(newState: GameState, decisionLogs: AIDecisionLogItem[]) {
  const playerRuler = newState.rulerName;
  const allRulers = Array.from(new Set(Object.values(newState.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
  const aiRulers = allRulers.filter(r => r !== playerRuler);
  const getCityName = (pid: number) => provinces.find(x => x.id === pid)?.name || '城池';

  if (!newState.alliances) newState.alliances = {};
  if (!newState.diplomacyData) newState.diplomacyData = {};

  const playerProvs = Object.values(newState.provincesData).filter(p => p.rulerName === playerRuler);
  if (playerProvs.length === 0) return;

  // 1. 背刺與撕毀盟約 (Treachery Check)
  // 僅限正處於盟約中的野心諸侯，且玩家邊界城池極度空虛
  for (const aiRuler of aiRulers) {
    const isAllied = !!newState.alliances[playerRuler]?.[aiRuler];
    if (!isAllied) continue;

    const rulerGen = Object.values(newState.generalsData).find(g => g.name === aiRuler);
    const ambition = rulerGen ? (rulerGen.ambition ?? getGeneralAmbition(rulerGen.name)) : 3;
    const isTraitorArchetype = ['呂布', '董卓', '袁術', '李傕', '郭汜'].includes(aiRuler) || ambition >= 4;

    if (!isTraitorArchetype) continue;

    // 找出兩國相鄰的玩家邊境城池
    let minPlayerBorderTroops = 999999;
    let maxAiBorderTroops = 0;
    let hasBorder = false;

    playerProvs.forEach(pp => {
      const pDef = provinces.find(x => x.id === pp.id);
      if (!pDef) return;
      const borderWithAi = pDef.connections.some(cid => newState.provincesData[cid]?.rulerName === aiRuler);
      if (borderWithAi) {
        hasBorder = true;
        const pTroops = Object.values(newState.generalsData)
          .filter(g => g.provinceId === pp.id && !g.isWild)
          .reduce((sum, g) => sum + g.soldiers, 0);
        minPlayerBorderTroops = Math.min(minPlayerBorderTroops, pTroops);
      }
    });

    if (!hasBorder) continue;

    const aiBorderProvs = Object.values(newState.provincesData).filter(ap => {
      if (ap.rulerName !== aiRuler) return false;
      const pDef = provinces.find(x => x.id === ap.id);
      return pDef ? pDef.connections.some(cid => newState.provincesData[cid]?.rulerName === playerRuler) : false;
    });

    aiBorderProvs.forEach(ap => {
      const aiTroops = Object.values(newState.generalsData)
        .filter(g => g.provinceId === ap.id && !g.isWild)
        .reduce((sum, g) => sum + g.soldiers, 0);
      maxAiBorderTroops = Math.max(maxAiBorderTroops, aiTroops);
    });

    // 觸發條件：玩家邊防兵力極少 (< 1200)，AI 邊防兵力為其 2.5 倍以上，且每月判定機率低 (約 3.5%)
    if (minPlayerBorderTroops < 1200 && maxAiBorderTroops >= minPlayerBorderTroops * 2.5 && Math.random() < 0.035) {
      // 撕毀盟約
      delete newState.alliances[playerRuler][aiRuler];
      delete newState.alliances[aiRuler][playerRuler];
      adjustDiplomacyRelation(newState, playerRuler, aiRuler, -100);

      const traitorMsg = `🐺【盟約背刺・狼顧反噬】梟雄【${aiRuler}】見我軍邊界城防防備空虛、疏於戒備，竟公然撕毀互不侵犯誓約！兩國友好度歸零，邊境警報大作！`;
      if (!newState.monthlyEvents) newState.monthlyEvents = [];
      newState.monthlyEvents.push(traitorMsg);

      decisionLogs.push({
        id: `diplomacy_betray_${aiRuler}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        rulerName: aiRuler,
        provinceId: aiBorderProvs[0]?.id || 1,
        provinceName: getCityName(aiBorderProvs[0]?.id || 1),
        actionType: '外交博弈',
        detail: `見敵方邊防兵力僅 ${minPlayerBorderTroops} 兵，機不可失，斷然撕毀與【${playerRuler}】之互不侵犯盟約！`,
        costGold: 0,
        costFood: 0,
        gainText: '撕毀盟約・敵對態勢',
        year: newState.year,
        month: newState.month,
        timestamp: Date.now()
      });
      return; // 本月已發生重大背刺，不再發起友好提案
    }
  }

  // 若本月已有未處理之外交提案，則不重複生成
  if (newState.pendingDiplomacyOffer) return;

  // 2. 劣勢求和與納貢 (Desperation Peace Offer)
  // 當與玩家接壤的弱小勢力只剩 1 座城，兵力匱乏面臨滅頂之災，小機率遣使求和
  for (const aiRuler of aiRulers) {
    const isAllied = !!newState.alliances[playerRuler]?.[aiRuler];
    if (isAllied) continue;

    const aiProvs = Object.values(newState.provincesData).filter(p => p.rulerName === aiRuler);
    if (aiProvs.length !== 1) continue; // 僅剩最後 1 城

    const lastProv = aiProvs[0];
    const pDef = provinces.find(x => x.id === lastProv.id);
    if (!pDef) continue;

    const borderWithPlayer = pDef.connections.some(cid => newState.provincesData[cid]?.rulerName === playerRuler);
    if (!borderWithPlayer) continue;

    const aiTroops = Object.values(newState.generalsData)
      .filter(g => g.provinceId === lastProv.id && !g.isWild)
      .reduce((sum, g) => sum + g.soldiers, 0);

    // 玩家在周圍相鄰郡縣的兵力總和
    let surroundingPlayerTroops = 0;
    pDef.connections.forEach(cid => {
      if (newState.provincesData[cid]?.rulerName === playerRuler) {
        Object.values(newState.generalsData)
          .filter(g => g.provinceId === cid && !g.isWild)
          .forEach(g => surroundingPlayerTroops += g.soldiers);
      }
    });

    // 條件：AI 守軍 < 3500，且玩家包圍重兵超過其 1.8 倍，低機率 (7%)
    if (aiTroops < 3500 && surroundingPlayerTroops >= aiTroops * 1.8 && Math.random() < 0.07) {
      const giftGold = Math.min(lastProv.gold, Math.floor(Math.random() * 401) + 600); // 600~1000 金
      const giftFood = Math.min(lastProv.food, Math.floor(Math.random() * 1001) + 1000); // 1000~2000 糧
      lastProv.gold = Math.max(100, lastProv.gold - giftGold);
      lastProv.food = Math.max(500, lastProv.food - giftFood);

      const peaceDuration = Math.floor(Math.random() * 7) + 6; // 6~12 個月
      const peaceMessages = [
        `外臣奉主公【${aiRuler}】之命，冒死叩拜大帥！我軍深知螳臂當車，今特奉上黃金 ${giftGold} 兩、軍糧 ${giftFood} 石，懇請大帥罷兵息戈，許我等休養生息 ${peaceDuration} 個月，自此歲歲納貢！`,
        `外臣謹呈主公【${aiRuler}】降書！大帥天威浩蕩，我城旦夕不保。今願獻出府庫存銀 ${giftGold} 兩、糧草 ${giftFood} 石，乞求兩國停戰休兵 ${peaceDuration} 個月，兩國永結和好！`
      ];

      newState.pendingDiplomacyOffer = {
        type: 'surrender_peace',
        fromRuler: aiRuler,
        targetRuler: playerRuler,
        title: `🏳️【乞和納貢】：${aiRuler} 遣使求和`,
        message: peaceMessages[Math.floor(Math.random() * peaceMessages.length)],
        durationMonths: peaceDuration,
        giftGold,
        giftFood
      };

      decisionLogs.push({
        id: `diplomacy_peace_${aiRuler}_${Date.now()}`,
        rulerName: aiRuler,
        provinceId: lastProv.id,
        provinceName: getCityName(lastProv.id),
        actionType: '外交博弈',
        detail: `孤城難支（守軍 ${aiTroops} 遭 ${surroundingPlayerTroops} 大軍圍困），派遣重臣攜 ${giftGold} 金、${giftFood} 糧前往向【${playerRuler}】叩首乞和。`,
        costGold: giftGold,
        costFood: giftFood,
        gainText: '乞和求生・奉送金糧',
        year: newState.year,
        month: newState.month,
        timestamp: Date.now()
      });
      return;
    }
  }

  // 3. 主動提議同盟 (Proactive Alliance Offer)
  // 友好 >= 55，未同盟，低機率 (5%~7%)
  const dominantRulers = allRulers.filter(r => {
    const pCount = Object.values(newState.provincesData).filter(p => p.rulerName === r).length;
    return pCount >= 3;
  });

  for (const aiRuler of aiRulers) {
    const isAllied = !!newState.alliances[playerRuler]?.[aiRuler];
    if (isAllied) continue;

    const rel = newState.diplomacyData[playerRuler]?.[aiRuler] ?? 50;
    if (rel < 55) continue;

    // 找該勢力的重鎮
    const aiCapital = Object.values(newState.provincesData).find(p => p.rulerName === aiRuler);
    if (!aiCapital || aiCapital.gold < 400) continue;

    // 是否與玩家相鄰
    const isNeighborWithPlayer = Object.values(newState.provincesData).some(ap => {
      if (ap.rulerName !== aiRuler) return false;
      const pDef = provinces.find(x => x.id === ap.id);
      return pDef ? pDef.connections.some(cid => newState.provincesData[cid]?.rulerName === playerRuler) : false;
    });

    const isUnderThreat = dominantRulers.some(dr => dr !== aiRuler && dr !== playerRuler);
    const allianceChance = isUnderThreat ? 0.07 : (isNeighborWithPlayer && rel >= 65 ? 0.05 : 0.025);

    if (Math.random() < allianceChance) {
      const giftGold = Math.floor(Math.random() * 251) + 350; // 350~600 金
      aiCapital.gold = Math.max(100, aiCapital.gold - giftGold);
      const duration = Math.floor(Math.random() * 13) + 12; // 12~24 個月

      let allianceMsg = '';
      if (isUnderThreat) {
        const bigEnemy = dominantRulers.find(dr => dr !== aiRuler && dr !== playerRuler) || '霸強';
        allianceMsg = `今【${bigEnemy}】虎踞中原、跋扈肆虐，天下英雄無不懮心！我家主公【${aiRuler}】敬慕明公高義，特備薄禮黃金 ${giftGold} 兩，願與貴邦結為生死同盟，約期 ${duration} 個月，守望相助，共抗強敵！`;
      } else {
        allianceMsg = `我家主公【${aiRuler}】素仰使君仁義布於四海，兩邦世修敦睦。今奉黃金 ${giftGold} 兩為聘禮，誠邀使君締結 ${duration} 個月之互不侵犯誓約，永敦睦鄰友誼！`;
      }

      newState.pendingDiplomacyOffer = {
        type: 'alliance',
        fromRuler: aiRuler,
        targetRuler: playerRuler,
        title: `🤝【使節拜謁】：${aiRuler} 提議結盟`,
        message: allianceMsg,
        durationMonths: duration,
        giftGold,
        giftFood: 0
      };

      decisionLogs.push({
        id: `diplomacy_offer_${aiRuler}_${Date.now()}`,
        rulerName: aiRuler,
        provinceId: aiCapital.id,
        provinceName: getCityName(aiCapital.id),
        actionType: '外交博弈',
        detail: `有感於天下局勢，備厚禮 ${giftGold} 金，派遣專使前往謁見【${playerRuler}】，正式提議締結為期 ${duration} 個月之互保同盟。`,
        costGold: giftGold,
        costFood: 0,
        gainText: '提議結盟・外交博弈',
        year: newState.year,
        month: newState.month,
        timestamp: Date.now()
      });
      break;
    }
  }
}

/**
 * 謀略與策反計策 AI (Stratagem & Scheme AI)
 * 1. 離間與策反挖角: 敵方高智謀士針對玩家忠誠低下 (< 75) 的武將施策。
 *    ※ 若玩家勤勉賞賜武將 (loyalty >= 80)，則絕對安全免疫！
 * 2. 散布謠言 (流言煽動): 敵方細作對邊境城池散播流言，若城池民心良好或有太守智謀防禦，有高機率當場識破拿辦。
 * ※ 發動機率低，嚴格遵循「搞好基本內政便無虞」原則。
 */
function executeFactionStratagemAI(newState: GameState, decisionLogs: AIDecisionLogItem[]) {
  const playerRuler = newState.rulerName;
  const allRulers = Array.from(new Set(Object.values(newState.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
  const aiRulers = allRulers.filter(r => r !== playerRuler);
  const getCityName = (pid: number) => provinces.find(x => x.id === pid)?.name || '城池';

  if (!newState.monthlyEvents) newState.monthlyEvents = [];

  // A. 離間與策反挖角判定 (每月全圖僅小機率發動 1 次)
  // 觸發條件：玩家有武將 loyalty < 75
  const vulnerablePlayerGens = Object.values(newState.generalsData).filter(g => {
    if (g.isWild || g.isRuler) return false;
    const prov = g.provinceId !== null ? newState.provincesData[g.provinceId] : null;
    return prov && prov.rulerName === playerRuler && g.loyalty < 75;
  });

  if (vulnerablePlayerGens.length > 0 && Math.random() < 0.06) {
    // 尋找敵方最有智謀的軍師 (int >= 82)
    const candidates: { ruler: string; strategist: GeneralState; provId: number }[] = [];
    aiRulers.forEach(ruler => {
      const rulerGens = Object.values(newState.generalsData).filter(g => {
        if (g.isWild) return false;
        const p = g.provinceId !== null ? newState.provincesData[g.provinceId] : null;
        return p && p.rulerName === ruler;
      });
      const smartGen = rulerGens.find(g => g.int >= 82);
      if (smartGen && smartGen.provinceId !== null) {
        candidates.push({ ruler, strategist: smartGen, provId: smartGen.provinceId });
      }
    });

    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      // 挑選忠誠度最低的玩家武將
      vulnerablePlayerGens.sort((a, b) => a.loyalty - b.loyalty);
      const targetGen = vulnerablePlayerGens[0];

      // 玩家防守抗衡判定：軍師或該城武將智力
      const playerStrat = getFactionStrategist(newState);
      const stratInt = playerStrat ? playerStrat.int : 50;
      const targetProvGens = Object.values(newState.generalsData).filter(g => g.provinceId === targetGen.provinceId && !g.isWild);
      const maxCityInt = targetProvGens.length > 0 ? Math.max(...targetProvGens.map(g => g.int)) : 50;
      const defPower = Math.max(stratInt, maxCityInt);

      // 若防守智力足夠，高機率 (70%) 識破並截獲密函
      const isIntercepted = defPower >= chosen.strategist.int - 8 && Math.random() < 0.70;

      if (isIntercepted) {
        const interceptorName = defPower === stratInt && playerStrat ? playerStrat.name : '守城太守';
        newState.monthlyEvents.push(
          `🛡️【智破敵謀】：敵方軍師【${chosen.strategist.name}】（${chosen.ruler}軍）暗中遣細作攜重金密信企圖離間我將【${targetGen.name}】！所幸我方【${interceptorName}】明察秋毫，於城外當場截獲密函，策反陰謀宣告破產！`
        );
        decisionLogs.push({
          id: `stratagem_fail_${Date.now()}`,
          rulerName: chosen.ruler,
          provinceId: chosen.provId,
          provinceName: getCityName(chosen.provId),
          actionType: '謀略計策',
          generalName: chosen.strategist.name,
          detail: `派遣密使試圖策反離間【${targetGen.name}】，遭對方智將識破截獲，計謀落空。`,
          costGold: 200,
          costFood: 0,
          gainText: '計策受挫・細作被截',
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      } else {
        // 計策生效：
        // 若忠誠極低 (< 55) 且野心高 (>= 4)，25% 機率直接投敵；否則離間成功降忠誠
        const targetAmbition = targetGen.ambition !== undefined ? targetGen.ambition : getGeneralAmbition(targetGen.name);
        const willDefect = targetGen.loyalty <= 55 && targetAmbition >= 4 && Math.random() < 0.25;

        if (willDefect) {
          const soldiersTaken = Math.min(targetGen.soldiers, 1200);
          targetGen.soldiers = Math.max(0, targetGen.soldiers - soldiersTaken);
          targetGen.provinceId = chosen.provId;
          targetGen.loyalty = 65;
          targetGen.hasActed = true;
          newState.generalsData[targetGen.name] = targetGen;

          newState.monthlyEvents.push(
            `🚨【叛變投敵】：我將【${targetGen.name}】因久居邊郡、忠誠度過低（${targetGen.loyalty}），暗中接受敵國【${chosen.ruler}】之重金拜將誘惑，竟叛逃投效敵營！（帶走部隊 ${soldiersTaken.toLocaleString()} 人）請主公引以為鑒，善撫軍心！`
          );
          decisionLogs.push({
            id: `stratagem_defect_${Date.now()}`,
            rulerName: chosen.ruler,
            provinceId: chosen.provId,
            provinceName: getCityName(chosen.provId),
            actionType: '謀略計策',
            generalName: chosen.strategist.name,
            detail: `成功策反【${playerRuler}】麾下大將【${targetGen.name}】，引其歸降本邦麾下！`,
            costGold: 500,
            costFood: 0,
            gainText: '策反成功・名將歸降',
            year: newState.year,
            month: newState.month,
            timestamp: Date.now()
          });
        } else {
          const drop = Math.floor(Math.random() * 9) + 8; // 8~16 點
          targetGen.loyalty = Math.max(20, targetGen.loyalty - drop);
          newState.generalsData[targetGen.name] = targetGen;

          newState.monthlyEvents.push(
            `⚠️【離間中計】：敵國軍師【${chosen.strategist.name}】暗施離間之計，我將【${targetGen.name}】聽信讒言心生芥蒂，忠誠度驟降 ${drop} 點（現為 ${targetGen.loyalty}）！請主公儘速召見賞賜金帛安撫！`
          );
          decisionLogs.push({
            id: `stratagem_alienate_${Date.now()}`,
            rulerName: chosen.ruler,
            provinceId: chosen.provId,
            provinceName: getCityName(chosen.provId),
            actionType: '謀略計策',
            generalName: chosen.strategist.name,
            detail: `對【${playerRuler}】麾下【${targetGen.name}】實施離間之計，動搖其君臣信任，削其忠誠 ${drop} 點。`,
            costGold: 300,
            costFood: 0,
            gainText: '離間得手・忠誠削弱',
            year: newState.year,
            month: newState.month,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  // B. 散布流言 (流言煽動) 判定
  // 敵方對玩家相鄰的前線城池煽動流言 (每月僅約 4% 機率)
  if (Math.random() < 0.04) {
    const playerBorderProvs = Object.values(newState.provincesData).filter(p => {
      if (p.rulerName !== playerRuler) return false;
      const pDef = provinces.find(x => x.id === p.id);
      return pDef ? pDef.connections.some(cid => {
        const r = newState.provincesData[cid]?.rulerName;
        return r && r !== playerRuler;
      }) : false;
    });

    if (playerBorderProvs.length > 0) {
      const targetCity = playerBorderProvs[Math.floor(Math.random() * playerBorderProvs.length)];
      const pDef = provinces.find(x => x.id === targetCity.id);
      const neighborEnemyProvId = pDef?.connections.find(cid => {
        const r = newState.provincesData[cid]?.rulerName;
        return r && r !== playerRuler;
      });
      const enemyRuler = neighborEnemyProvId ? newState.provincesData[neighborEnemyProvId]?.rulerName : '敵國';

      const cityName = getCityName(targetCity.id);

      // 治安防禦：若民心治安 >= 80，70% 機率直接巡城抓捕細作
      if (targetCity.loyalty >= 80 && Math.random() < 0.70) {
        newState.monthlyEvents.push(
          `🛡️【捕獲造謠奸細】：【${enemyRuler}】密遣奸細潛入【${cityName}】街頭散布妖言，幸賴城內治安嚴明，巡城校尉迅速將奸細就地拿辦，民心絲毫不亂！`
        );
      } else {
        const drop = Math.floor(Math.random() * 7) + 6; // 6~12 點
        targetCity.loyalty = Math.max(10, targetCity.loyalty - drop);
        newState.provincesData[targetCity.id] = targetCity;

        newState.monthlyEvents.push(
          `🗣️【流言動搖】：敵國細作於【${cityName}】市井暗中散播流言，蠱惑民心，該郡民心下降 ${drop} 點（現為 ${targetCity.loyalty}）！太守已嚴飭城門巡防！`
        );
        decisionLogs.push({
          id: `rumor_${Date.now()}`,
          rulerName: enemyRuler || '敵邦',
          provinceId: neighborEnemyProvId || targetCity.id,
          provinceName: cityName,
          actionType: '謀略計策',
          detail: `潛入【${cityName}】散布不利於【${playerRuler}】之讖緯流言，動搖其民心民望。`,
          costGold: 200,
          costFood: 0,
          gainText: `散布流言・民心-${drop}`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }
    }
  }
}

function executeProvinceAI(
  updatedP: ProvinceState, 
  newState: GameState, 
  rulerName: string, 
  isAutonomousPlayer: boolean,
  decisionLogs?: AIDecisionLogItem[]
) {
  const tierRules = getProvinceTierRules(updatedP.id);
  const pBase = provinces.find(x => x.id === updatedP.id);
  const cityName = pBase?.name || '城池';
  const autonomyPolicy = updatedP.autonomyPolicy || 'balanced';

  // 判定是否面臨敵勢力交界威脅 (非僅鄰近空城)
  const isHostileFrontier = pBase ? pBase.connections.some(connId => {
    const neighbor = newState.provincesData[connId];
    return neighbor && neighbor.rulerName && neighbor.rulerName !== rulerName;
  }) : false;

  // 是否鄰近任何非本國城池 (包含未佔領空城)
  const isBorder = pBase ? pBase.connections.some(connId => {
    const neighbor = newState.provincesData[connId];
    return !neighbor || neighbor.rulerName !== rulerName;
  }) : true;

  // 勢力特質偏好
  const isCaoCao = rulerName === '曹操';
  const isLiuBei = rulerName === '劉備';
  const isSun = rulerName === '孫策' || rulerName === '孫權' || rulerName === '孫堅';
  const isYuanShao = rulerName === '袁紹';
  const isMilitarist = ['呂布', '董卓', '公孫瓚', '馬騰', '袁術'].includes(rulerName);
  const isPeaceful = ['劉表', '劉璋', '陶謙', '孔融', '韓馥'].includes(rulerName);

  // 財政平糶調劑：若城中糧草豐沛 (food >= 3000) 但庫銀緊張 (gold < 250)，平糶少量糧草以充裕內政預算
  if (updatedP.food >= 3000 && updatedP.gold < 250) {
    const surplusFood = updatedP.food - 1800;
    const foodToSell = Math.min(2000, Math.max(500, Math.floor(surplusFood * 0.35)));
    if (foodToSell >= 500) {
      const goldGained = Math.floor(foodToSell / 10);
      updatedP.food -= foodToSell;
      updatedP.gold += goldGained;
      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          actionType: '平糶平糴',
          detail: `糧庫存糧豐盛 (${(updatedP.food + foodToSell).toLocaleString()} 石)，平糶部分糧草換取治所庫銀`,
          costGold: 0,
          costFood: foodToSell,
          gainText: `平糶糧草 ${foodToSell.toLocaleString()} 石，獲得金銀 +${goldGained} 兩`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }
    }
  }

  const aiGenerals = Object.values(newState.generalsData).filter(
    g => g.provinceId === updatedP.id && !g.hasActed && !g.isWild && !g.activeTask
  );

  // 1. 若無常駐將領，郡縣官吏維持基礎治所運作
  const autonomousPlayerActions: string[] = [];

  if (aiGenerals.length === 0) {
     if (updatedP.flood > 55 && updatedP.gold >= 100) {
        updatedP.gold -= 100;
        updatedP.flood = Math.max(0, updatedP.flood - 5);
        if (isAutonomousPlayer) {
          autonomousPlayerActions.push(`郡吏修築堤防疏浚積水 (水患 -5)`);
        }
        if (decisionLogs) {
          decisionLogs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            rulerName,
            provinceId: updatedP.id,
            provinceName: cityName,
            actionType: '治水防汛',
            detail: `城中無將領，留守郡吏自主修築堤防疏浚積水`,
            costGold: 100,
            costFood: 0,
            gainText: `水患 -5 (降至 ${updatedP.flood})`,
            year: newState.year,
            month: newState.month,
            timestamp: Date.now()
          });
        }
     } else if (updatedP.loyalty < 55 && updatedP.food >= 1200) {
        updatedP.food -= 800;
        updatedP.loyalty = Math.min(100, updatedP.loyalty + 5);
        if (isAutonomousPlayer) {
          autonomousPlayerActions.push(`縣丞開倉平抑物價賑民 (民心 +5)`);
        }
        if (decisionLogs) {
          decisionLogs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            rulerName,
            provinceId: updatedP.id,
            provinceName: cityName,
            actionType: '賑濟百姓',
            detail: `城中無將領，縣丞發放官倉公糧安撫黎民`,
            costGold: 0,
            costFood: 800,
            gainText: `民心 +5 (升至 ${updatedP.loyalty})`,
            year: newState.year,
            month: newState.month,
            timestamp: Date.now()
          });
        }
     } else if (updatedP.gold >= 120) {
        // 郡吏常規修築：土地或商業微幅增長
        if (updatedP.value < tierRules.maxDev && Math.random() < 0.5) {
          updatedP.gold -= 40;
          updatedP.value = Math.min(tierRules.maxDev, updatedP.value + 1);
          if (isAutonomousPlayer) {
            autonomousPlayerActions.push(`基層吏員維持官田水利 (土地 +1)`);
          }
          if (decisionLogs) {
            decisionLogs.push({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              rulerName,
              provinceId: updatedP.id,
              provinceName: cityName,
              actionType: '官吏修葺',
              detail: `城中無將領，基層吏員維持官田灌溉修治`,
              costGold: 40,
              costFood: 0,
              gainText: `土地開發 +1 (現有 ${updatedP.value}/${tierRules.maxDev})`,
              year: newState.year,
              month: newState.month,
              timestamp: Date.now()
            });
          }
        } else if ((updatedP.commerce || 50) < tierRules.maxCommerce) {
          updatedP.gold -= 40;
          updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 50) + 1);
          if (isAutonomousPlayer) {
            autonomousPlayerActions.push(`市集衙役整飭街市商埠 (商業 +1)`);
          }
          if (decisionLogs) {
            decisionLogs.push({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              rulerName,
              provinceId: updatedP.id,
              provinceName: cityName,
              actionType: '官吏修葺',
              detail: `城中無將領，市集衙役整飭街市商賈通商`,
              costGold: 40,
              costFood: 0,
              gainText: `商業繁榮 +1 (現有 ${updatedP.commerce || 50}/${tierRules.maxCommerce})`,
              year: newState.year,
              month: newState.month,
              timestamp: Date.now()
            });
          }
        }
     }

     if (isAutonomousPlayer && autonomousPlayerActions.length > 0) {
       const policyInfo = getAutonomyPolicyInfo(autonomyPolicy);
       if (!newState.monthlyEvents) newState.monthlyEvents = [];
       newState.monthlyEvents.push(
         `🏛️【自治奏報】${cityName}（基層縣丞吏員 · ${policyInfo.icon}${policyInfo.name}）代行治所公務：${autonomousPlayerActions.join('、')}。`
       );
     }
     return;
  }

  // 排序將領：太守先行督導全城政務，其餘文官 (政/智) 評估民政與經濟，武將隨後承擔練兵與防務
  aiGenerals.sort((a, b) => {
    if (a.role === '太守' && b.role !== '太守') return -1;
    if (b.role === '太守' && a.role !== '太守') return 1;
    return (b.pol + b.int) - (a.pol + a.int);
  });

  // 動態安全兵力上限計算
  const maxTroopCapacity = aiGenerals.reduce((sum, g) => sum + (g.maxTroops || 10000), 0) + 6000;
  const estHarvest = getEstimatedAnnualFood(updatedP);
  const safeTroopLimitByFood = Math.floor(estHarvest / 1.2);
  const popLimit = Math.floor(updatedP.population * (isHostileFrontier ? 0.20 : 0.12));

  // 前線與後方之目標兵力差別化 (軍備擴張方針提高備兵上限)
  let targetTroops = Math.max(0, Math.min(maxTroopCapacity, safeTroopLimitByFood, popLimit));
  if (isAutonomousPlayer && autonomyPolicy === 'military') {
    targetTroops = Math.max(0, Math.min(maxTroopCapacity, safeTroopLimitByFood, Math.floor(updatedP.population * 0.22)));
  } else if (!isHostileFrontier && !isMilitarist) {
    targetTroops = Math.min(targetTroops, 4000);
  }

  const currentTroops = (updatedP.soldiers || 0) + aiGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
  let provinceLogged = false;

  // 單月城市內政限額防範浪費 (避免全城武將一窩蜂只做同一件事)
  let hasHandledFloodThisMonth = false;
  let hasRelievedThisMonth = false;
  let hasTrainedThisMonth = false;
  let hasSearchedWildThisMonth = false;

  aiGenerals.forEach(g => {
    const gen = { ...g };
    let actionTaken = false;
    const itemBonus = getGeneralItemBonus(gen.name, newState.currentScenario);
    const totalPol = gen.pol + itemBonus.polBonus;
    const totalStr = gen.str + itemBonus.strBonus;

    // 優先級 0: 治水防汛 (單月至多 1 名官員承擔，且水患偏高才觸發；防汛與農墾方針優先疏浚)
    const floodThreshold = (isAutonomousPlayer && (autonomyPolicy === 'disaster' || autonomyPolicy === 'agriculture')) ? 36 : 48;
    if (!actionTaken && !hasHandledFloodThisMonth && updatedP.flood > floodThreshold && updatedP.gold >= 100) {
      updatedP.gold -= 100;
      const decrease = calculateFloodGain(totalPol);
      updatedP.flood = Math.max(0, updatedP.flood - decrease);
      hasHandledFloodThisMonth = true;
      actionTaken = true;

      if (isAutonomousPlayer) {
        autonomousPlayerActions.push(`【${gen.name}】督造河堤水利 (水患 -${decrease})`);
      }

      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          generalName: gen.name,
          actionType: '治水防汛',
          detail: `由【${gen.name}】督造河堤與水利設施，防患未然`,
          costGold: 100,
          costFood: 0,
          gainText: `防汛安全率 +${decrease}% (水患降至 ${updatedP.flood})`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }
    }

    // 優先級 0.5: 安撫民心 (單月至多 1 次，糧食充足且民心低落時發糧)
    let loyaltyThreshold = isLiuBei ? 75 : 60;
    if (isAutonomousPlayer && (autonomyPolicy === 'disaster' || autonomyPolicy === 'agriculture')) {
      loyaltyThreshold = 75;
    }
    if (!actionTaken && !hasRelievedThisMonth && updatedP.loyalty < loyaltyThreshold && updatedP.food >= 1800) {
      updatedP.food -= 800;
      const loyaltyGain = Math.floor(gen.cha / 8) + 3;
      updatedP.loyalty = Math.min(100, updatedP.loyalty + loyaltyGain);
      hasRelievedThisMonth = true;
      actionTaken = true;

      if (isAutonomousPlayer) {
        autonomousPlayerActions.push(`【${gen.name}】開倉發放公糧賑民 (民心 +${loyaltyGain})`);
      }

      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          generalName: gen.name,
          actionType: '賑濟百姓',
          detail: `由【${gen.name}】開倉發放公糧賑濟百姓`,
          costGold: 0,
          costFood: 800,
          gainText: `民心安定 +${loyaltyGain} (升至 ${updatedP.loyalty})`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }
    }

    // 優先級 1: 尋訪與登用在野人才 (單月至多 1 次，需有充足庫銀)
    if (!actionTaken && !hasSearchedWildThisMonth && updatedP.gold >= 250 && Math.random() < 0.4) {
      const wildInProvince = Object.values(newState.generalsData).filter(
        wg => wg.isWild && wg.provinceId === updatedP.id
      );
      const undiscovered = wildInProvince.filter(
        wg => !(newState.wildGenerals || []).includes(wg.name)
      );

      if (undiscovered.length > 0) {
        const target = undiscovered[0];
        const targetGen = { ...target };
        const hireChance = 0.40 + ((gen.cha - targetGen.int) * 0.01) + (isLiuBei ? 0.15 : 0);
        
        if (Math.random() < hireChance) {
          targetGen.isWild = false;
          targetGen.loyalty = isLiuBei ? 90 : 80;
          newState.generalsData[targetGen.name] = targetGen;

          if (isAutonomousPlayer) {
            autonomousPlayerActions.push(`【${gen.name}】禮聘在野名士【${targetGen.name}】出仕`);
          }

          if (decisionLogs) {
            decisionLogs.push({
              id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              rulerName,
              provinceId: updatedP.id,
              provinceName: cityName,
              generalName: gen.name,
              actionType: '登用人才',
              detail: `【${gen.name}】親自造訪在野名士【${targetGen.name}】，禮聘其出仕為官`,
              costGold: 100,
              costFood: 0,
              gainText: `成功登用名將【${targetGen.name}】`,
              year: newState.year,
              month: newState.month,
              timestamp: Date.now()
            });
          }
        } else {
          newState.wildGenerals = [...(newState.wildGenerals || []), targetGen.name];
        }
        hasSearchedWildThisMonth = true;
        actionTaken = true;
      } else {
        const discovered = wildInProvince.filter(
          wg => (newState.wildGenerals || []).includes(wg.name)
        );
        if (discovered.length > 0) {
          const target = discovered[0];
          const targetGen = { ...target };
          const hireChance = 0.45 + ((gen.cha - targetGen.int) * 0.01) + (isLiuBei ? 0.15 : 0);
          if (Math.random() < hireChance) {
            targetGen.isWild = false;
            targetGen.loyalty = 85;
            newState.generalsData[targetGen.name] = targetGen;

            if (isAutonomousPlayer) {
              autonomousPlayerActions.push(`【${gen.name}】禮聘在野名士【${targetGen.name}】出仕`);
            }

            if (decisionLogs) {
              decisionLogs.push({
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                rulerName,
                provinceId: updatedP.id,
                provinceName: cityName,
                generalName: gen.name,
                actionType: '登用人才',
                detail: `【${gen.name}】親自造訪在野名士【${targetGen.name}】，懇請其出仕效力`,
                costGold: 100,
                costFood: 0,
                gainText: `成功登用名將【${targetGen.name}】`,
                year: newState.year,
                month: newState.month,
                timestamp: Date.now()
              });
            }
          }
          hasSearchedWildThisMonth = true;
          actionTaken = true;
        }
      }
    }

    // 優先級 2: 農業與商業內政開發 (核心主軸：文官必修，軍官亦可軍屯)
    const doDomestic = (): boolean => {
      if (updatedP.gold < 80) return false;

      const needsFarming = updatedP.value < tierRules.maxDev;
      const needsCommerce = (updatedP.commerce || 50) < tierRules.maxCommerce;

      if (!needsFarming && !needsCommerce) return false;

      const increase = calculateDevGain(totalPol);
      let devCost = 100;
      if (updatedP.gold < 100) {
        devCost = updatedP.gold; // 彈性投入現有金錢
      }

      let chosenDev: 'farm' | 'commerce' = 'farm';

      if (needsFarming && needsCommerce) {
        // 依自治方針、勢力性格與當前短板發展
        const currentVal = updatedP.value;
        const currentComm = updatedP.commerce || 50;

        if (isAutonomousPlayer && autonomyPolicy === 'agriculture') {
          chosenDev = 'farm';
        } else if (isAutonomousPlayer && autonomyPolicy === 'commerce') {
          chosenDev = 'commerce';
        } else if (isSun) {
          chosenDev = Math.random() < 0.65 ? 'commerce' : 'farm';
        } else if (isLiuBei || isPeaceful) {
          chosenDev = Math.random() < 0.70 ? 'farm' : 'commerce';
        } else if (isCaoCao) {
          // 曹操深諳許下屯田與通商之策，均衡補短板
          chosenDev = currentVal <= currentComm ? 'farm' : 'commerce';
        } else {
          chosenDev = currentVal <= currentComm ? 'farm' : 'commerce';
        }
      } else if (needsFarming) {
        chosenDev = 'farm';
      } else {
        chosenDev = 'commerce';
      }

      updatedP.gold -= devCost;
      if (chosenDev === 'farm') {
        updatedP.value = Math.min(tierRules.maxDev, updatedP.value + increase);
      } else {
        updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 50) + increase);
      }

      if (isAutonomousPlayer) {
        autonomousPlayerActions.push(chosenDev === 'farm' ? `【${gen.name}】屯田開墾 (土地 +${increase})` : `【${gen.name}】整飭街市 (商業 +${increase})`);
      }

      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          generalName: gen.name,
          actionType: chosenDev === 'farm' ? '開墾土地' : '繁榮商業',
          detail: `由【${gen.name}】督辦地方${chosenDev === 'farm' ? '興修水利與屯田開荒' : '繁盛市集與商埠通商'}`,
          costGold: devCost,
          costFood: 0,
          gainText: chosenDev === 'farm' 
            ? `土地開發 +${increase} (現有 ${updatedP.value}/${tierRules.maxDev})` 
            : `商業繁榮 +${increase} (現有 ${updatedP.commerce || 50}/${tierRules.maxCommerce})`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }

      return true;
    };

    // 優先級 3: 徵兵與軍事招募 (需確保預留足夠內政儲備金)
    const doDraft = (): boolean => {
      if (updatedP.hasDraftedThisMonth) return false;
      if (currentTroops >= targetTroops) return false;

      const maxAllowed = calculateMaxProvinceDraft(updatedP.population, tierRules.minPopulation);
      if (maxAllowed < 300) return false;

      const needed = Math.max(0, targetTroops - currentTroops);
      const draftTarget = Math.min(maxAllowed, needed, 2500);

      const draftCost = calculateDraftCost(draftTarget, gen.cha);
      // 保留至少 120 兩作為內政基底儲備，嚴防國庫被徵兵掏空
      if (updatedP.gold < draftCost + 120) return false;

      // 執行徵兵
      updatedP.gold -= draftCost;
      updatedP.population -= draftTarget;
      updatedP.hasDraftedThisMonth = true;

      const loyCost = Math.max(1, Math.floor(draftTarget / 1000));
      updatedP.loyalty = Math.max(0, updatedP.loyalty - loyCost);

      // 分配新兵：優先填補本郡將領帶兵空缺
      let remainingRecruits = draftTarget;
      const rookieTraining = 35;

      for (const targetG of aiGenerals) {
        if (remainingRecruits <= 0) break;
        const currentSoldiers = targetG.soldiers || 0;
        const maxSoldiers = targetG.maxTroops || 10000;
        const space = maxSoldiers - currentSoldiers;

        if (space > 0) {
          const toAdd = Math.min(space, remainingRecruits);
          const oldT = targetG.training || 50;
          const newTotal = currentSoldiers + toAdd;
          targetG.training = Math.round((currentSoldiers * oldT + toAdd * rookieTraining) / newTotal);
          targetG.soldiers = newTotal;
          newState.generalsData[targetG.name] = targetG;
          remainingRecruits -= toAdd;
        }
      }

      // 若將領皆滿編，剩餘新兵編入城池駐防守備軍
      if (remainingRecruits > 0) {
        updatedP.soldiers = (updatedP.soldiers || 0) + remainingRecruits;
      }

      if (isAutonomousPlayer) {
        autonomousPlayerActions.push(`【${gen.name}】招募守備新兵 +${draftTarget.toLocaleString()} 人`);
      }

      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          generalName: gen.name,
          actionType: '整軍徵兵',
          detail: `由【${gen.name}】於治所招募新兵充實軍伍`,
          costGold: draftCost,
          costFood: 0,
          gainText: `招募新兵 +${draftTarget.toLocaleString()} 人`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }

      return true;
    };

    // 優先級 4: 全軍操練 (單月僅需一名教官整軍，提升全軍訓練度)
    const doTrain = (): boolean => {
      if (hasTrainedThisMonth) return false;
      const needsTraining = aiGenerals.some(ag => (ag.soldiers || 0) > 0 && (ag.training || 0) < 80);
      if (!needsTraining) return false;

      aiGenerals.forEach(targetG => {
        if ((targetG.soldiers || 0) > 0 && (targetG.training || 0) < 95) {
          const oldT = targetG.training || 50;
          const gain = calculateTroopTrainingGain(totalStr, targetG.soldiers, oldT);
          targetG.training = Math.min(100, oldT + gain);
          newState.generalsData[targetG.name] = targetG;
        }
      });
      hasTrainedThisMonth = true;

      if (isAutonomousPlayer) {
        autonomousPlayerActions.push(`【${gen.name}】統領全軍操演提升部隊訓練度`);
      }

      if (decisionLogs) {
        decisionLogs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          rulerName,
          provinceId: updatedP.id,
          provinceName: cityName,
          generalName: gen.name,
          actionType: '軍隊操演',
          detail: `由大將【${gen.name}】統領全軍大點兵並操演戰陣`,
          costGold: 0,
          costFood: 0,
          gainText: `全城守備部隊訓練度平均大幅提升`,
          year: newState.year,
          month: newState.month,
          timestamp: Date.now()
        });
      }

      return true;
    };

    // 職責分流與執行決策
    if (!actionTaken) {
      if (isAutonomousPlayer && autonomyPolicy === 'military') {
        // 軍備擴張方針：優先操演三軍與招募守備兵員
        actionTaken = doTrain() || doDraft() || doDomestic();
      } else if (isAutonomousPlayer && (autonomyPolicy === 'agriculture' || autonomyPolicy === 'commerce')) {
        // 農墾/商貿方針：全力投入農商開墾建設
        actionTaken = doDomestic() || doTrain() || doDraft();
      } else if (totalPol >= totalStr) {
        // 文官專精：優先內政開發 (農商) -> 次之兵政補給
        actionTaken = doDomestic() || doDraft() || doTrain();
      } else {
        // 武將防務：若為前線且需備戰則優先操演與徵兵，否則協助軍屯農商
        if (isHostileFrontier) {
          actionTaken = doDraft() || doTrain() || doDomestic();
        } else {
          // 後方或非敵對前線：操演一次後全力投入農商建設
          actionTaken = doTrain() || doDomestic() || doDraft();
        }
      }
    }

    gen.hasActed = true; 
    newState.generalsData[gen.name] = gen;
  });

  if (isAutonomousPlayer) {
    const prefect = aiGenerals.find(g => g.role === '太守');
    const leaderTitle = prefect 
      ? `太守【${prefect.name}】` 
      : (aiGenerals.length > 0 ? `守將【${aiGenerals[0].name}】` : '基層縣丞吏員');

    const policyInfo = getAutonomyPolicyInfo(updatedP.autonomyPolicy);
    const policyTag = ` · ${policyInfo.icon}${policyInfo.name}`;

    if (!newState.monthlyEvents) newState.monthlyEvents = [];

    if (autonomousPlayerActions.length > 0) {
      newState.monthlyEvents.push(
        `🏛️【自治奏報】${cityName}（${leaderTitle}${policyTag}）月度施政：${autonomousPlayerActions.join('、')}。`
      );
    } else if (updatedP.gold < 80) {
      newState.monthlyEvents.push(
        `⚠️【自治告急】${cityName}（${leaderTitle}${policyTag}）呈報：治所庫銀告罄（僅存 ${updatedP.gold} 兩），暫停本月內政開墾，請主公調撥銀兩！`
      );
    }
  }
}

function calculateGeneralCombatPower(g: GeneralState, scenarioIndex: number = 0): number {
  const itemBonus = getGeneralItemBonus(g.name, scenarioIndex);
  const effectiveStr = g.str + itemBonus.strBonus;
  const effectiveInt = g.int + itemBonus.intBonus;
  const effectivePol = g.pol + itemBonus.polBonus;
  
  // 綜合能力權重：武力 40% + 智力 40% + (政治+魅力) 20%
  const statRating = (effectiveStr * 0.4 + effectiveInt * 0.4 + (effectivePol + g.cha) * 0.1) / 70;
  
  // 訓練度權重 (0.5 ~ 1.25 倍)
  const trainingFactor = 0.5 + ((g.training || 50) / 100) * 0.75;
  
  // 帶兵量
  const troops = g.soldiers || 0;
  
  // 戰力總值 = 兵力 * 屬性權重 * 訓練權重 + 武智名將加成
  return (troops * statRating * trainingFactor) + (effectiveStr + effectiveInt) * 15;
}

function calculateProvinceDefensePower(
  pData: ProvinceState, 
  enemyGenerals: GeneralState[], 
  scenarioIndex: number = 0
): number {
  const totalGenPower = enemyGenerals.reduce(
    (sum, g) => sum + calculateGeneralCombatPower(g, scenarioIndex), 
    0
  );
  const reserveTroops = pData.soldiers || 0;
  const reservePower = reserveTroops * 0.75;
  
  // 城池堅固度加成 (1.0 ~ 1.35 倍)
  const cityDefenseMultiplier = 1.0 + Math.min(0.35, (pData.value || 50) / 800);

  return (totalGenPower + reservePower) * cityDefenseMultiplier;
}

function executeRulerStrategicAI(newState: GameState, rulerName: string) {
  const myProvinces = Object.values(newState.provincesData).filter(p => p.rulerName === rulerName);
  if (myProvinces.length === 0) return;

  const AGGRESSIVE_RULERS = ['曹操', '董卓', '袁紹', '孫堅', '孫策', '呂布', '公孫瓚', '馬騰', '袁術'];
  const CAUTIOUS_RULERS = ['劉表', '劉璋', '陶謙', '孔融', '韓馥', '嚴白虎', '王朗', '劉繇'];

  const isAggressive = AGGRESSIVE_RULERS.includes(rulerName);
  const isCautious = CAUTIOUS_RULERS.includes(rulerName);

  const targetMap = new Map<number, number[]>();
  for (const p of myProvinces) {
    const pBase = provinces.find(x => x.id === p.id);
    if (!pBase) continue;
    for (const connId of pBase.connections) {
      if (newState.provincesData[connId]?.rulerName !== rulerName) {
        if (!targetMap.has(connId)) targetMap.set(connId, []);
        if (!targetMap.get(connId)!.includes(p.id)) {
           targetMap.get(connId)!.push(p.id);
        }
      }
    }
  }

  // 1. 空城進駐處理 (Empty Cities Expansion)
  const emptyTargetIds = Array.from(targetMap.keys()).filter(tId => !newState.provincesData[tId]?.rulerName);
  if (emptyTargetIds.length > 0) {
    if (Math.random() < 0.5) {
      for (const targetId of emptyTargetIds) {
        const originIds = targetMap.get(targetId) || [];
        const tState = newState.provincesData[targetId];
        if (!tState) continue;

        const validOrigins = originIds.map(oId => {
          const pState = newState.provincesData[oId];
          const gens = Object.values(newState.generalsData).filter(
            g => g.provinceId === oId && !g.hasActed && !g.isWild && !g.activeTask
          );
          gens.sort((a, b) => (b.str + b.int) - (a.str + a.int));
          return { pState, gens };
        }).filter(f => f.gens.length >= 2 || (myProvinces.length === 1 && f.gens.length >= 2));

        if (validOrigins.length === 0) continue;
        validOrigins.sort((a, b) => b.gens.length - a.gens.length);
        const bestOrigin = validOrigins[0];

        const dispatchGens = bestOrigin.gens.slice(0, Math.min(2, bestOrigin.gens.length - 1));
        if (dispatchGens.length === 0) continue;

        const totalTroops = dispatchGens.reduce((s, g) => s + (g.soldiers || 0), 0);
        const reqFood = Math.floor(totalTroops * 0.1);

        if (bestOrigin.pState.food < reqFood + 500) continue;

        bestOrigin.pState.food -= reqFood;
        tState.rulerName = rulerName;
        tState.isAutonomous = false;
        tState.food = (tState.food || 0) + reqFood;
        dispatchGens.forEach(g => {
          g.provinceId = targetId;
          g.hasActed = true;
          newState.generalsData[g.name] = g;
        });

        if (!newState.monthlyEvents) newState.monthlyEvents = [];
        const tName = provinces.find(p => p.id === targetId)?.name || '城池';
        newState.monthlyEvents.push("【擴張】" + rulerName + " 派遣部隊，兵不血刃進駐了空城 " + tName + "。");
        break;
      }
    }
  }

  // 2. 軍事進攻判定 (Military Invasion) - 大幅調降宣戰頻率
  const baseInvasionChance = isAggressive ? 0.35 : (isCautious ? 0.12 : 0.22);
  if (Math.random() > baseInvasionChance) {
    return;
  }

  const enemyTargets = Array.from(targetMap.entries())
    .map(([targetId, originIds]) => {
      const pData = newState.provincesData[targetId];
      if (!pData || !pData.rulerName) return null;

      const enemyRuler = pData.rulerName;
      const relation = newState.diplomacyData?.[rulerName]?.[enemyRuler] ?? 50;
      const isAllied = !!newState.alliances?.[rulerName]?.[enemyRuler];

      if (isAllied || relation >= 70) return null;

      const enemyGenerals = Object.values(newState.generalsData).filter(
        g => g.provinceId === targetId && !g.isWild
      );
      const enemyTroops = (pData.soldiers || 0) + enemyGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);

      let score = 20000 - enemyTroops + (100 - relation) * 30;
      if (enemyTroops < 1500) score += 8000;
      if (pData.food < 1000) score += 3000;
      if (isAggressive) score += 5000;

      return { targetId, enemyRuler, originIds, score, enemyTroops, enemyGenerals, pData };
    })
    .filter(t => t !== null)
    .sort((a, b) => b!.score - a!.score);

  if (enemyTargets.length === 0) return;

  for (const target of enemyTargets) {
    if (!target) continue;
    const tState = target.pData;
    const enemyRuler = target.enemyRuler;
    const enemyGenerals = target.enemyGenerals;
    const enemyTroops = target.enemyTroops;

    const originForces = target.originIds.map(oId => {
      const pState = newState.provincesData[oId];
      const gens = Object.values(newState.generalsData).filter(
        g => g.provinceId === oId && !g.hasActed && !g.isWild && !g.activeTask
      );
      gens.sort((a, b) => (b.str + b.int) - (a.str + a.int));
      return { pState, gens };
    }).filter(f => f.gens.length >= 2 && f.pState.food >= 1200);

    if (originForces.length === 0) continue;

    let attackGenerals: GeneralState[] = [];
    const attackOrigins = originForces.slice(0, 2);

    for (const o of attackOrigins) {
      if (o.gens.length >= 2) {
        attackGenerals.push(...o.gens.slice(0, o.gens.length - 1));
      }
    }

    attackGenerals.sort((a, b) => (b.str + b.int) - (a.str + a.int));
    attackGenerals = attackGenerals.slice(0, 10);
    if (attackGenerals.length === 0) continue;

    const attackTroops = attackGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
    if (attackTroops < 1000) continue;

    // 精確戰力評估演算法
    const attackPower = attackGenerals.reduce(
      (sum, g) => sum + calculateGeneralCombatPower(g, newState.currentScenario),
      0
    );

    const enemyPower = calculateProvinceDefensePower(
      tState,
      enemyGenerals,
      newState.currentScenario
    );

    const isTargetPlayer = (enemyRuler === newState.rulerName);

    // 勝率門檻：打一般 AI 需 1.25~1.7 倍優勢；打玩家因玩家手控戰術優勢，需 1.8~2.46 倍強大優勢！
    let requiredRatio = isAggressive ? 1.25 : (isCautious ? 1.70 : 1.45);
    if (isTargetPlayer) {
      requiredRatio *= 1.45; // 玩家防守加權倍率
    }

    const relation = newState.diplomacyData?.[rulerName]?.[enemyRuler] ?? 50;
    if (relation >= 50) {
      requiredRatio += (relation - 50) * 0.01;
    }

    if (enemyTroops < 1500 && !isTargetPlayer) {
      requiredRatio = Math.max(1.0, requiredRatio - 0.2);
    }

    if (attackPower < enemyPower * requiredRatio) {
      continue;
    }

    const reqFood = Math.floor(attackTroops * 0.1);
    let totalFoodAvail = attackOrigins.reduce((sum, o) => sum + Math.max(0, o.pState.food - 500), 0);
    if (totalFoodAvail < reqFood) {
      continue;
    }

    let remainingFoodToDeduct = reqFood;
    let attackerResourcesDeducted: Record<number, { gold: number; food: number }> = {};
    for (const o of attackOrigins) {
      if (remainingFoodToDeduct <= 0) break;
      const take = Math.min(Math.max(0, o.pState.food - 50), remainingFoodToDeduct);
      if (take > 0) {
        o.pState.food -= take;
        remainingFoodToDeduct -= take;
        attackerResourcesDeducted[o.pState.id] = { gold: 0, food: take };
      }
    }

    const targetName = provinces.find(p => p.id === target.targetId)?.name || '未知';
    if (!newState.monthlyEvents) newState.monthlyEvents = [];

    // 若被進攻方為玩家主公，所有守城部署與援軍調度全權交由玩家在【緊急軍情】防禦面板中決定
    if (enemyRuler === newState.rulerName) {
      const attackerGeneralOrigins: Record<string, number> = {};
      attackGenerals.forEach(g => attackerGeneralOrigins[g.name] = g.provinceId);

      const defenderGeneralOrigins: Record<string, number> = {};
      enemyGenerals.forEach(g => defenderGeneralOrigins[g.name] = target.targetId);

      const defensePlan: PendingBattlePlan = {
        id: "def_" + Date.now() + "_" + Math.random(),
        isDefense: true,
        attackerRuler: rulerName,
        defenderRuler: enemyRuler,
        targetProvinceId: target.targetId,
        attackerProvinceId: attackOrigins[0].pState.id,
        attackerReinforceProvinceId: attackOrigins.length > 1 ? attackOrigins[1].pState.id : null,
        attackingGenerals: attackGenerals.map(g => g.name),
        defendingGenerals: enemyGenerals.map(g => g.name), // 初始由主城駐將列入，玩家可在防守介面自由調派鄰近援軍
        attackerGold: 0,
        attackerFood: reqFood,
        resourcesDeducted: attackerResourcesDeducted,
        defenderResourcesDeducted: {},
        attackerGeneralOrigins,
        defenderGeneralOrigins
      };

      if (!newState.pendingDefenses) newState.pendingDefenses = [];
      newState.pendingDefenses.push(defensePlan);
      newState.monthlyEvents.push("🚨【緊急軍情】" + rulerName + "軍 向我方 " + targetName + " 發起了猛烈攻勢！請主公定奪！");
      break;
    }

    // 若被進攻方為電腦 AI 勢力，則由 AI 演算判斷是否調動鄰近城池或同盟援軍
    let finalEnemyPower = enemyPower;
    const reinforcementEventMessages: string[] = [];
    const defenderReinforcementGenerals: GeneralState[] = [];
    let defenderResourcesDeducted: Record<number, { gold: number; food: number }> = {};

    const targetProvinceBase = provinces.find(x => x.id === target.targetId);
    if (targetProvinceBase) {
      for (const connId of targetProvinceBase.connections) {
        const neighborState = newState.provincesData[connId];
        if (!neighborState || !neighborState.rulerName) continue;

        const neighborRuler = neighborState.rulerName;
        if (neighborRuler === rulerName) continue;

        const isSelf = neighborRuler === enemyRuler;
        const defRelation = newState.diplomacyData?.[enemyRuler]?.[neighborRuler] || 50;
        const isDefAllied = newState.alliances?.[enemyRuler]?.[neighborRuler];

        let willHelp = false;
        if (isSelf) {
          willHelp = true;
        } else if (isDefAllied) {
          willHelp = Math.random() < 0.8;
        } else if (defRelation > 70) {
          willHelp = Math.random() < 0.5;
        }

        if (willHelp) {
          const neighborGens = Object.values(newState.generalsData).filter(
            g => g.provinceId === connId && !g.hasActed && !g.isWild && !g.activeTask
          );
          neighborGens.sort((a, b) => (b.str + b.int) - (a.str + a.int));

          if (neighborGens.length >= 2 || (isSelf && neighborGens.length >= 1)) {
            const dispatchGens = neighborGens.slice(0, Math.min(2, Math.max(1, neighborGens.length - 1)));
            const dispatchTroops = dispatchGens.reduce((s, g) => s + (g.soldiers || 0), 0);

            if (dispatchTroops >= 800 || isSelf) {
              const reqHelpFood = Math.floor(dispatchTroops * 0.1);
              if (neighborState.food >= reqHelpFood + 50) {
                neighborState.food -= reqHelpFood;
                defenderResourcesDeducted[connId] = { gold: 0, food: reqHelpFood };
                defenderReinforcementGenerals.push(...dispatchGens);

                const addPower = dispatchGens.reduce(
                  (sum, g) => sum + calculateGeneralCombatPower(g, newState.currentScenario), 
                  0
                );
                finalEnemyPower += addPower;

                dispatchGens.forEach(g => {
                  g.hasActed = true;
                  (g as any).originalProvinceId = g.provinceId;
                  newState.generalsData[g.name] = g;
                });

                if (isSelf) {
                  reinforcementEventMessages.push("【馳援】" + neighborRuler + " 從鄰近城池急調 " + dispatchGens.length + " 名將領趕赴戰場！");
                } else {
                  reinforcementEventMessages.push("【同盟出兵】" + neighborRuler + " 顧念情誼，派 " + dispatchGens[0].name + " 等 " + dispatchGens.length + " 名將領支援 " + enemyRuler + "！");
                }
              }
            }
          }
        }
      }
    }

    // 電腦互攻之求援與各俘虜細節已記於決策日誌，月報僅呈報城池攻克結果
    if (attackPower > finalEnemyPower * 1.05) {
      tState.rulerName = rulerName;
      tState.isAutonomous = false;
      // 接管守方城池 60% 金糧，隨軍攜帶錢糧完全移入
      tState.food = Math.floor(tState.food * 0.6) + reqFood;
      tState.gold = Math.floor(tState.gold * 0.6);
      tState.soldiers = Math.floor((tState.soldiers || 0) * 0.2);
      tState.loyalty = Math.max(0, tState.loyalty - 20);

      attackGenerals.forEach(g => {
        g.provinceId = target.targetId;
        g.hasActed = true;
        newState.generalsData[g.name] = g;
      });

      // 檢查敵方是否被滅國 (剩餘城池為0)
      const remainingDefCities = (Object.values(newState.provincesData) as ProvinceState[]).filter(p => p.id !== target.targetId && p.rulerName === enemyRuler);
      const isEliminated = remainingDefCities.length === 0;
      const isIsolated = isCityIsolated(target.targetId, enemyRuler, newState.provincesData);
      const winnerGen = (Object.values(newState.generalsData) as GeneralState[]).find(g => g.name === rulerName) || null;

      const allDefendingGenerals = [...enemyGenerals, ...defenderReinforcementGenerals];

      allDefendingGenerals.forEach(g => {
        const rate = calculateCaptiveRate(g, true, isIsolated, isEliminated);
        const isCaptured = Math.random() < rate;

        if (isCaptured) {
          const decision = processAICaptiveDecision(g, rulerName, winnerGen, target.targetId, isEliminated, g.name === enemyRuler, enemyRuler);
          if (decision.action === 'recruit') {
            g.isCaptive = false; g.captiveOfRuler = null; g.provinceId = target.targetId; g.loyalty = 70; g.isWild = false; g.soldiers = 0;
          } else if (decision.action === 'execute') {
            handleRulerDecapitation(newState, g.name, rulerName);
          } else if (decision.action === 'release') {
            g.isCaptive = false; g.captiveOfRuler = null; g.provinceId = target.targetId; g.isWild = true; g.soldiers = 0;
          } else {
            g.isCaptive = true; g.captiveOfRuler = rulerName; g.capturedInProvinceId = target.targetId; g.soldiers = 0;
          }
        } else {
          g.isWild = isEliminated;
          g.provinceId = isEliminated ? null : (remainingDefCities[0]?.id || target.targetId);
          g.soldiers = 0;
          g.loyalty = Math.max(0, g.loyalty - 20);
        }
        delete (g as any).originalProvinceId;
        newState.generalsData[g.name] = g;
      });

      let msg = `⚔️【戰報】${rulerName}軍 猛攻 ${enemyRuler} 的 ${targetName}！守軍不敵，城池易主！`;
      if (isEliminated) {
        msg += ` 勢力【${enemyRuler}】慘遭滅國，城內將領悉數被俘！`;
      }
      newState.monthlyEvents.push(msg);
    } else {
      attackGenerals.forEach(g => {
        g.soldiers = Math.floor((g.soldiers || 0) * 0.6);
        g.hasActed = true;
        newState.generalsData[g.name] = g;
      });

      const allDefendingGenerals = [...enemyGenerals, ...defenderReinforcementGenerals];
      allDefendingGenerals.forEach(g => {
        g.soldiers = Math.floor((g.soldiers || 0) * 0.7);
        if ((g as any).originalProvinceId) {
          g.provinceId = (g as any).originalProvinceId;
          delete (g as any).originalProvinceId;
        }
        newState.generalsData[g.name] = g;
      });

      tState.soldiers = Math.floor((tState.soldiers || 0) * 0.7);
    }

    if (newState.diplomacyData && newState.diplomacyData[rulerName]) {
      newState.diplomacyData[rulerName][enemyRuler] = 0;
    }
    if (newState.diplomacyData && newState.diplomacyData[enemyRuler]) {
      newState.diplomacyData[enemyRuler][rulerName] = 0;
    }

    break;
  }
}

export function computeFactionAIDebugInfo(state: GameState, recentLogs: AIDecisionLogItem[] = []): FactionAIDebugInfo[] {
  const rulers = Array.from(new Set(Object.values(state.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
  
  const getPersonality = (ruler: string) => {
    if (ruler === '曹操') return '深謀遠慮・許下屯田';
    if (ruler === '劉備') return '仁義布德・勤民勸農';
    if (['孫策', '孫權', '孫堅'].includes(ruler)) return '江東鼎立・通商繁阜';
    if (ruler === '袁紹') return '四世三公・帶甲百萬';
    if (['董卓', '呂布'].includes(ruler)) return '尚武暴烈・強徵重備';
    if (ruler === '馬騰') return '西涼鐵騎・邊地厲兵';
    if (ruler === '公孫瓚') return '白馬義從・前線鏖戰';
    if (['劉表', '劉璋', '陶謙', '孔融', '韓馥'].includes(ruler)) return '保境安民・清談守成';
    return '割據一方・蓄養民力';
  };

  const getPosture = (ruler: string, frontierCount: number, rearCount: number) => {
    if (ruler === '曹操') return `要衝備戰 (${frontierCount}城)，後方屯田大積金糧 (${rearCount}城)`;
    if (['孫策', '孫權', '孫堅'].includes(ruler)) return `沿江防務嚴密，江南水運市肆興隆 (${frontierCount + rearCount}城)`;
    if (ruler === '劉備') return `深結人心，以農桑為根本積蓄實力 (${frontierCount + rearCount}城)`;
    if (frontierCount > rearCount) return `重兵駐防國境交界，嚴防敵襲 (${frontierCount}城)`;
    return `全郡均衡經略，後方屯糧前線屯兵 (${frontierCount + rearCount}城)`;
  };

  return rulers.map(ruler => {
    const provStates = provinces
      .filter(p => state.provincesData[p.id]?.rulerName === ruler)
      .map(p => ({
        meta: p,
        state: state.provincesData[p.id]
      }));

    const totalGold = provStates.reduce((sum, item) => sum + (item.state?.gold || 0), 0);
    const totalFood = provStates.reduce((sum, item) => sum + (item.state?.food || 0), 0);
    
    const rulerGenerals = Object.values(state.generalsData).filter(g => 
      !g.isWild && provStates.some(ps => ps.meta.id === g.provinceId)
    );

    const totalSoldiers = provStates.reduce((sum, item) => sum + (item.state?.soldiers || 0), 0) +
      rulerGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);

    let frontierCount = 0;
    let rearCount = 0;

    const provincesDetail = provStates.map(({ meta, state: pState }) => {
      const isFrontier = meta.connections.some(connId => {
        const neighbor = state.provincesData[connId];
        return neighbor && neighbor.rulerName && neighbor.rulerName !== ruler;
      });

      if (isFrontier) frontierCount++; else rearCount++;

      const tierRules = getProvinceTierRules(meta.id);
      const cityGenerals = rulerGenerals.filter(g => g.provinceId === meta.id);
      
      const cityRecentActions = recentLogs
        .filter(l => l.provinceId === meta.id)
        .slice(0, 4)
        .map(l => `${l.actionType} (${l.gainText})`);

      return {
        id: meta.id,
        name: meta.name,
        isFrontier,
        gold: pState.gold,
        food: pState.food,
        soldiers: (pState.soldiers || 0) + cityGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0),
        value: pState.value,
        maxDev: tierRules.maxDev,
        commerce: pState.commerce || 50,
        maxCommerce: tierRules.maxCommerce,
        flood: pState.flood,
        loyalty: pState.loyalty,
        generalsCount: cityGenerals.length,
        generalsNames: cityGenerals.map(g => g.name),
        recentActions: cityRecentActions
      };
    });

    return {
      rulerName: ruler,
      personality: getPersonality(ruler),
      totalGold,
      totalFood,
      totalSoldiers,
      totalGenerals: rulerGenerals.length,
      provincesCount: provStates.length,
      posture: getPosture(ruler, frontierCount, rearCount),
      provinces: provincesDetail
    };
  }).sort((a, b) => (b.totalSoldiers + b.totalGold) - (a.totalSoldiers + a.totalGold));
}

export function processAITurn(state: GameState): GameState {
  let newState = { 
     ...state, 
     provincesData: { ...state.provincesData }, 
     generalsData: { ...state.generalsData } 
  };
  
  const aiRulers = Array.from(new Set(Object.values(newState.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
  const decisionLogs: AIDecisionLogItem[] = [];

  // 1. 戰略調度與輜重層 (Faction Redeployment & Logistics AI - 前後方武將與物資動態調度)
  for (const ruler of aiRulers) {
    if (ruler !== state.rulerName) {
       executeFactionRedeploymentAI(newState, ruler, decisionLogs);
       executeFactionLogisticsAI(newState, ruler, decisionLogs);
    }
  }

  // 2. 領地各郡自主內政、治水、募兵與操演 (Autonomous Domestic, Drafting & Training)
  Object.values(newState.provincesData).forEach(p => {
    const isEnemyAI = p.rulerName && p.rulerName !== state.rulerName;
    const isPlayerAutonomous = p.rulerName === state.rulerName && p.isAutonomous;
    
    if (isEnemyAI || isPlayerAutonomous) {
       let updatedP = { ...p };
       executeProvinceAI(updatedP, newState, p.rulerName!, isPlayerAutonomous, decisionLogs);
       newState.provincesData[p.id] = updatedP;
    }
  });

  // 3. 戰略擴張與出征 (Expansion & Invasion)
  for (const ruler of aiRulers) {
    if (ruler !== state.rulerName) {
       executeRulerStrategicAI(newState, ruler);
    }
  }

  // 4. 外交博弈與謀略計策層 (Diplomacy & Stratagem AI - 主動同盟提案、劣勢求和納貢、背刺盟約、離間與流言)
  executeFactionDiplomacyAI(newState, decisionLogs);
  executeFactionStratagemAI(newState, decisionLogs);

  // 5. 更新 AI 偵錯遙測日誌 (AI Telemetry)
  const existingLogs = state.aiTelemetry?.recentLogs || [];
  const mergedLogs = [...decisionLogs, ...existingLogs].slice(0, 150);

  newState.aiTelemetry = {
    lastUpdatedYear: newState.year,
    lastUpdatedMonth: newState.month,
    factions: computeFactionAIDebugInfo(newState, mergedLogs),
    recentLogs: mergedLogs
  };

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
  // Clear monthly events log AT THE START so processAITurn can add events
  let newState: GameState = { ...state, monthlyEvents: [] };
  
  // 1. Process AI turns for non-player provinces
  newState = processAITurn(newState);
  
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

        // 隨機事件: 大豐收 (Bumper Harvest)
        // 治水良善 (水患 <= 35) 且農業開發度良好 (>= 30) 時觸發
        const harvestChance = 0.15 + ((updatedP.value || 50) / 200) * 0.1;
        if ((updatedP.flood || 0) <= 35 && (updatedP.value || 0) >= 30 && Math.random() < harvestChance) {
           const cityName = provinces.find(x => x.id === updatedP.id)?.name || '城池';
           const bonusHarvest = Math.floor(foodHarvest * (0.35 + Math.random() * 0.25));
           const bonusLoyalty = 5 + Math.floor(Math.random() * 6);
           const bonusPop = 500 + Math.floor(Math.random() * 1500);

           updatedP.food = Math.min(999999, updatedP.food + bonusHarvest);
           updatedP.loyalty = Math.min(100, updatedP.loyalty + bonusLoyalty);
           updatedP.population += bonusPop;

           const msg = `🌾【大豐收】風調雨順！${cityName} 迎來秋季大豐收！穀倉盈滿，糧草額外增加 ${bonusHarvest}，民心提升 ${bonusLoyalty}，流民前來安居 ${bonusPop} 人！`;
           newState.monthlyEvents?.push(msg);
        }
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

     // 隨機事件: 洪水 (洪澇)
     // 高風險城市清單
     const highRiskProvinces = [4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 21, 22, 25, 28, 29, 30, 31, 32, 33, 36];
     // 夏季 (4~7月) 機率提高
     const isFloodSeason = newMonth >= 4 && newMonth <= 7;
     let floodChance = highRiskProvinces.includes(updatedP.id) ? (isFloodSeason ? 0.08 : 0.02) : (isFloodSeason ? 0.02 : 0.005);
     
     if (Math.random() < floodChance) {
        const cityName = provinces.find(x => x.id === updatedP.id)?.name || '未知城池';
        const floodControl = 100 - updatedP.flood;
        
        if (floodControl >= 70) {
            // 防禦成功，無傷害
            newState.monthlyEvents?.push(`【洪水】${cityName} 發生洪水，但因治水得當，未造成任何損失！`);
        } else {
            // 發生傷害
            const damageRatio = 1 - (floodControl / 70); // 0 ~ 1
            const valueLoss = Math.floor(updatedP.value * (0.15 + Math.random() * 0.15) * damageRatio);
            const commerceLoss = Math.floor((updatedP.commerce || 50) * (0.1 + Math.random() * 0.1) * damageRatio);
            
            updatedP.value = Math.max(0, updatedP.value - valueLoss);
            updatedP.commerce = Math.max(0, (updatedP.commerce || 50) - commerceLoss);
            
            newState.monthlyEvents?.push(`【洪水】${cityName} 遭遇洪水侵襲！堤防潰堤，農業下降 ${valueLoss}，商業下降 ${commerceLoss}！`);
        }
        
        // 無論是否造成傷害，堤防都會受損 (防治率下降 10~20% -> flood 增加 10~20)
        const structureDamage = 10 + Math.floor(Math.random() * 11);
        updatedP.flood = Math.min(100, updatedP.flood + structureDamage);
     }

     // 隨機事件: 颱風
     // 限定 7, 8, 9 月
     if (newMonth >= 7 && newMonth <= 9) {
        // 高風險沿海城市: 7(北海), 9(琅邪), 10(下邳), 21(建業), 23(吳郡), 24(會稽), 26(夷州), 34(嶺南), 41(南海), 42(交趾)
        const typhoonProvinces = [7, 9, 10, 21, 23, 24, 26, 34, 41, 42];
        if (typhoonProvinces.includes(updatedP.id)) {
           // 每月 4% 機率發生
           if (Math.random() < 0.04) {
              const cityName = provinces.find(x => x.id === updatedP.id)?.name || '未知城池';
              
              // 基礎傷害 10% ~ 20%
              let damageMultiplier = 0.1 + Math.random() * 0.1;
              let isMitigated = false;
              
              // 忠誠度 > 80，傷害減半
              if (updatedP.loyalty > 80) {
                 damageMultiplier *= 0.5;
                 isMitigated = true;
              }
              
              const valueLoss = Math.floor(updatedP.value * damageMultiplier);
              const commerceLoss = Math.floor((updatedP.commerce || 50) * damageMultiplier);
              
              updatedP.value = Math.max(0, updatedP.value - valueLoss);
              updatedP.commerce = Math.max(0, (updatedP.commerce || 50) - commerceLoss);
              
              // 忠誠度下降 5~10
              const loyaltyLoss = 5 + Math.floor(Math.random() * 6);
              updatedP.loyalty = Math.max(0, updatedP.loyalty - loyaltyLoss);
              
              let msg = `【颱風】${cityName} 遭遇狂風暴雨侵襲！`;
              if (isMitigated) {
                 msg += `幸得軍民一心，災情得以控制。商業下降 ${commerceLoss}，農業下降 ${valueLoss}，民心微降 ${loyaltyLoss}。`;
              } else {
                 msg += `城鎮設施嚴重損毀。商業下降 ${commerceLoss}，農業下降 ${valueLoss}，民心下降 ${loyaltyLoss}！`;
              }
              newState.monthlyEvents?.push(msg);
           }
        }
     }

     // 隨機事件: 旱災 (Drought)
     // 限定 3, 4, 5, 6 月
     if (newMonth >= 3 && newMonth <= 6) {
        // 高風險內陸/北方城市
        const droughtProvinces = [1, 2, 3, 4, 5, 6, 13, 15, 16, 17, 18, 19, 20, 27, 35];
        const droughtChance = droughtProvinces.includes(updatedP.id) ? 0.04 : 0.01;
        
        if (Math.random() < droughtChance) {
           const cityName = provinces.find(x => x.id === updatedP.id)?.name || '未知城池';
           
           // 基礎傷害
           let valueLoss = Math.floor(updatedP.value * (0.1 + Math.random() * 0.1)); // 10%~20%
           let populationLoss = Math.floor(updatedP.population * (0.02 + Math.random() * 0.03)); // 2%~5%
           const loyaltyLoss = 5 + Math.floor(Math.random() * 6); // 5~10
           
           let isMitigated = false;
           const tierRules = getProvinceTierRules(updatedP.id);
           
           // 農業發展度 > 上限的 1/3，傷害減半
           if (updatedP.value > tierRules.maxDev / 3) {
              valueLoss = Math.floor(valueLoss / 2);
              populationLoss = Math.floor(populationLoss / 2);
              isMitigated = true;
           }
           
           updatedP.value = Math.max(0, updatedP.value - valueLoss);
           updatedP.population = Math.max(0, updatedP.population - populationLoss);
           updatedP.loyalty = Math.max(0, updatedP.loyalty - loyaltyLoss);
           
           let msg = `【旱災】${cityName} 遭遇嚴重旱災！`;
           if (isMitigated) {
              msg += `得益於當地水利設施完善，災情減輕。農業下降 ${valueLoss}，人口流失 ${populationLoss} 人，民心下降 ${loyaltyLoss}。`;
           } else {
              msg += `赤地千里，哀鴻遍野！農業下降 ${valueLoss}，人口流失 ${populationLoss} 人，民心下降 ${loyaltyLoss}。`;
           }
           newState.monthlyEvents?.push(msg);
        }
     }

     // 隨機事件: 地震 (Earthquake)
     // 12個月皆可能發生，調整為極低頻率（高風險區約 0.2%/月，一般區域約 0.03%/月）
     const earthquakeProvinces = [16, 17, 18, 19, 20, 35, 36, 37, 38, 39, 40, 43];
     let earthquakeChance = earthquakeProvinces.includes(updatedP.id) ? 0.002 : 0.0003;
     
     // 若城池治水防災加固（治水度 > 50），地震發生機率可再降低最多 50%
     const floodControl = 100 - (updatedP.flood || 0);
     if (floodControl > 50) {
        earthquakeChance *= (1 - (floodControl - 50) * 0.01);
     }
     
     if (Math.random() < earthquakeChance) {
        const cityName = provinces.find(x => x.id === updatedP.id)?.name || '未知城池';
        
        // 基礎傷害 (農業、商業、治水、人口、士兵、民心)
        let valueLoss = Math.floor(updatedP.value * (0.2 + Math.random() * 0.2)); // 20%~40%
        let commerceLoss = Math.floor((updatedP.commerce || 50) * (0.2 + Math.random() * 0.2)); // 20%~40%
        let popLoss = Math.floor(updatedP.population * (0.05 + Math.random() * 0.05)); // 5%~10%
        let soldierLoss = Math.floor((updatedP.soldiers || 0) * (0.05 + Math.random() * 0.05)); // 5%~10%
        let floodDmg = 20 + Math.floor(Math.random() * 15); // 20~35
        let loyaltyLoss = 10 + Math.floor(Math.random() * 5); // 10~15
        
        // 防災治水良好 (治水度 >= 60)，地震損害減半
        let isMitigated = false;
        if (floodControl >= 60) {
           valueLoss = Math.floor(valueLoss * 0.5);
           commerceLoss = Math.floor(commerceLoss * 0.5);
           popLoss = Math.floor(popLoss * 0.5);
           soldierLoss = Math.floor(soldierLoss * 0.5);
           floodDmg = Math.floor(floodDmg * 0.5);
           loyaltyLoss = Math.floor(loyaltyLoss * 0.5);
           isMitigated = true;
        }
        
        updatedP.value = Math.max(0, updatedP.value - valueLoss);
        updatedP.commerce = Math.max(0, (updatedP.commerce || 50) - commerceLoss);
        updatedP.population = Math.max(0, updatedP.population - popLoss);
        if (updatedP.soldiers) {
            updatedP.soldiers = Math.max(0, updatedP.soldiers - soldierLoss);
        }
        updatedP.flood = Math.min(100, updatedP.flood + floodDmg);
        updatedP.loyalty = Math.max(0, updatedP.loyalty - loyaltyLoss);
        
        let msg = `【地震】天搖地動！${cityName} 發生大地震！`;
        if (isMitigated) {
           msg += `得益於平時治水與設施加固，災情得以減輕。商業下降 ${commerceLoss}，農業下降 ${valueLoss}，軍民傷亡 ${popLoss + soldierLoss} 人。`;
        } else {
           msg += `房屋倒塌，哀鴻遍野！商業下降 ${commerceLoss}，農業下降 ${valueLoss}，軍民死傷 ${popLoss + soldierLoss} 人，民心大幅下降 ${loyaltyLoss}。`;
        }
        
        // 緊急救援補償 (僅玩家勢力且極度缺錢缺糧)
        if (updatedP.rulerName === state.rulerName) {
           if (updatedP.gold < 1000 || updatedP.food < 5000) {
              const aidGold = 500 + Math.floor(Math.random() * 501);
              const aidFood = 2000 + Math.floor(Math.random() * 3001);
              updatedP.gold += aidGold;
              updatedP.food += aidFood;
              updatedP.loyalty = Math.min(100, updatedP.loyalty + 8);
              msg += ` 災情慘重，周邊商賈與百姓自發捐獻，獲得賑災金 ${aidGold}，賑災糧 ${aidFood}！`;
           }
        }
        newState.monthlyEvents?.push(msg);
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

    let newLoyalty = gen.loyalty ?? 50;
    if (gen.isCaptive) {
      // 天牢羈押削弱心志：每月忠誠微降 1 點；若原君主已滅亡，意志消磨更快（每月降 2 點）
      const origRuler = gen.originalRulerName;
      const isLordAlive = origRuler ? (Object.values(newState.provincesData) as ProvinceState[]).some(p => p.rulerName === origRuler) : false;
      const decay = isLordAlive ? 1 : 2;
      newLoyalty = Math.max(30, newLoyalty - decay);
    }

    updatedGenerals[gName] = {
      ...gen,
      hasActed: newHasActed,
      rewardedThisMonth: false,
      activeTask: newTask,
      loyalty: newLoyalty
    };
  });
  newState.generalsData = updatedGenerals;

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

  // 5.5 外交系統月度演進 (同盟期滿檢測、自然衰減漂移、鄰邦主動外交事件)
  const currentAbsoluteMonth = newYear * 12 + newMonth;
  const expiredAllianceMessages: string[] = [];
  const diplomaticEventMessages: string[] = [];

  // 1. 同盟期滿檢測
  if (newState.alliances) {
    Object.entries(newState.alliances).forEach(([r1, map]) => {
      Object.entries(map).forEach(([r2, expiryMonth]) => {
        if (expiryMonth <= currentAbsoluteMonth) {
          delete newState.alliances![r1][r2];
          if (r1 === state.rulerName) {
            expiredAllianceMessages.push(`我國與【${r2}】簽署之互不侵犯同盟已正式屆滿！兩國恢復自由往來關係。`);
          }
        }
      });
    });
  }

  // 2. 外交關係自然漂移 (未結盟者緩步向 50 漂移)
  if (newState.diplomacyData) {
    const playerRel = newState.diplomacyData[state.rulerName] || {};
    Object.keys(playerRel).forEach(otherRuler => {
      const isAllied = newState.alliances?.[state.rulerName]?.[otherRuler];
      const curRel = playerRel[otherRuler];
      if (!isAllied) {
        if (curRel > 50 && Math.random() < 0.25) {
          adjustDiplomacyRelation(newState, state.rulerName, otherRuler, -1);
        } else if (curRel < 50 && Math.random() < 0.20) {
          adjustDiplomacyRelation(newState, state.rulerName, otherRuler, 1);
        }
      }
    });
  }

  // 3. AI 主動外交事件 (高好感主動求盟 / 鄰邦進貢)
  const playerCapitalProv = Object.values(newState.provincesData).find(p => p.rulerName === state.rulerName);
  if (playerCapitalProv && newState.diplomacyData) {
    const allRulers = Array.from(new Set(Object.values(newState.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
    const otherRulers = allRulers.filter(r => r !== state.rulerName);

    for (const aiRuler of otherRulers) {
      const rel = newState.diplomacyData[state.rulerName]?.[aiRuler] ?? 50;

      // 鄰邦進貢修好 (友好 >= 75，且為低機率 4%)
      if (rel >= 75 && Math.random() < 0.04) {
        const giftGold = Math.floor(Math.random() * 301) + 300; // 300~600 金
        playerCapitalProv.gold += giftGold;
        diplomaticEventMessages.push(`🎁【鄰邦進貢】：【${aiRuler}】感念主公仁德，遣使送來睦鄰賀禮 ${giftGold} 金以修好兩邦之誼！`);
        break;
      }
    }
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
  if (diplomaticEventMessages.length > 0) {
    finalResult = {
      action: '外交要聞',
      title: '🕊️ 邦交要聞：諸侯動向',
      message: diplomaticEventMessages.join('\n\n') + (monthlyResult?.message ? `\n\n------------------------\n${monthlyResult.message}` : ''),
      type: 'success' as const
    };
  } else if (expiredAllianceMessages.length > 0) {
    finalResult = {
      action: '同盟期滿',
      title: '📜 外交通報：盟約期滿',
      message: expiredAllianceMessages.join('\n\n') + (monthlyResult?.message ? `\n\n------------------------\n${monthlyResult.message}` : ''),
      type: 'info' as const
    };
  }
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
