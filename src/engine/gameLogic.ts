import { getGeneralAvailableFormations } from './formations';
import { getGeneralAvailableSkills, getGeneralPassives } from './skills';
import { GameState, ProvinceState, GeneralState, PendingBattlePlan } from '../types';
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
    alliances: initialAlliances,
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
      const { allocations } = payload;
      if (actingGen && !actingGen.hasActed) {
        for (const [gName, newAmountRaw] of Object.entries(allocations)) {
          const gen = newState.generalsData[gName];
          const newAmount = Math.max(0, Math.min(gen?.maxTroops || 3000, Number(newAmountRaw) || 0));
          if (gen && gen.provinceId === provinceId) {
            gen.soldiers = newAmount;
          }
        }

        const provGens = Object.values(newState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild);
        const totalCityTroops = provGens.reduce((sum, g) => sum + (g.soldiers || 0), 0);

        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;

        newState.lastActionResult = {
          action: '編制兵力',
          type: 'success',
          title: '📋 軍隊編制調整報告',
          message: `【${actingGen.name}】主持全郡兵力重新編制完成！\n城池將領總兵力：${totalCityTroops.toLocaleString()} 人。`,
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
            const targetLoyalty = targetGen.loyalty || 50;
            const successRate = Math.min(95, Math.max(15, (actingGen.cha / 110) * (1 - targetLoyalty / 180) * 100));
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
                message: `【${actingGen.name}】親赴天牢懇切說服，俘虜【${targetGeneralName}】感佩恩威，開懷應允棄暗投明，正式加入我軍！（初始忠誠度：${targetGen.loyalty}）`,
                type: 'success'
              };
            } else {
              newState.lastActionResult = {
                action: '登用人才',
                title: '❌ 勸降天牢俘虜失敗：寧死不屈',
                message: `【${actingGen.name}】親赴天牢嘗試遊說【${targetGeneralName}】，然對方怒道：『忠臣不事二主，何必多言！』拒絕歸順。`,
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

function executeProvinceAI(
  updatedP: ProvinceState, 
  newState: GameState, 
  rulerName: string, 
  isAutonomousPlayer: boolean
) {
  const tierRules = getProvinceTierRules(updatedP.id);
  const aiGenerals = Object.values(newState.generalsData).filter(
    g => g.provinceId === updatedP.id && !g.hasActed && !g.isWild && !g.activeTask
  );

  // 1. 若無將領，極簡保底
  if (aiGenerals.length === 0) {
     if (updatedP.flood > 50 && updatedP.gold >= 100) {
        updatedP.gold -= 100;
        updatedP.flood -= 5;
     } else if (updatedP.loyalty < 50 && updatedP.food >= 1000) {
        updatedP.food -= 1000;
        updatedP.loyalty += 5;
     }
     return;
  }

  // 排序：結合政治與智力 (對於徵兵，武將也有用，後續分流)
  aiGenerals.sort((a, b) => (b.pol + b.int) - (a.pol + a.int));

  // 動態安全兵力上限
  // 1. 武將總帶兵上限
  const maxTroopCapacity = aiGenerals.reduce((sum, g) => sum + (g.maxTroops || 10000), 0) + 10000; // 基礎 1萬預備兵空間
  // 2. 預估秋收量 (除以 1.2 作為絕對安全線)
  const estHarvest = getEstimatedAnnualFood(updatedP);
  const safeTroopLimitByFood = Math.floor(estHarvest / 1.2);
  // 3. 不超過人口的 15%
  const popLimit = Math.floor(updatedP.population * 0.15);

  const targetTroops = Math.max(0, Math.min(maxTroopCapacity, safeTroopLimitByFood, popLimit));
  
  const currentTroops = (updatedP.soldiers || 0) + aiGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);

  // 判定當前階段
  const isPhase1 = currentTroops < targetTroops * 0.5;
  const isPhase2 = !isPhase1 && (updatedP.value < tierRules.maxDev * 0.33 || (updatedP.commerce || 50) < tierRules.maxCommerce * 0.33);
  const isPhase3 = !isPhase1 && !isPhase2 && currentTroops < targetTroops * 0.8;
  const isPhase4 = !isPhase1 && !isPhase2 && !isPhase3;

  aiGenerals.forEach(g => {
      const gen = { ...g };
      const polFactor = Math.floor(Math.pow(Math.max(0, gen.pol) / 100, 3) * 12) || 1;
      const chaFactor = Math.floor(Math.pow(Math.max(0, gen.cha) / 100, 3) * 12) || 1;
      const leaFactor = Math.floor(Math.pow(Math.max(0, gen.str) / 100, 3) * 12) || 1;

      let actionTaken = false;

      // 優先級 0: 災後重建 (賑災與治水，這是生存根基，永遠最高)
      if (!actionTaken && updatedP.loyalty < 65 && updatedP.food >= 1500) {
          updatedP.food -= 1000;
          const loyaltyGain = Math.floor(gen.cha / 10) + 2;
          updatedP.loyalty = Math.min(100, updatedP.loyalty + loyaltyGain);
          actionTaken = true;
      }
      if (!actionTaken && updatedP.flood > 30 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          const decrease = calculateFloodGain(gen.pol);
          updatedP.flood = Math.max(0, updatedP.flood - decrease);
          actionTaken = true;
      }

      // 優先級 1: 尋訪與錄用在野武將 (資金充裕時，擴充人才庫)
      if (!actionTaken && updatedP.gold >= 300 && Math.random() < 0.25) {
         const wildInProvince = Object.values(newState.generalsData).filter(
           wg => wg.isWild && wg.provinceId === updatedP.id
         );
         const undiscovered = wildInProvince.filter(
           wg => !(newState.wildGenerals || []).includes(wg.name)
         );
         if (undiscovered.length > 0) {
            const target = undiscovered[0];
            const targetGen = { ...target };
            const hireChance = 0.35 + ((gen.cha - targetGen.int) * 0.01);
            
            if (Math.random() < hireChance) {
               targetGen.isWild = false;
               targetGen.loyalty = 85; 
               newState.generalsData[targetGen.name] = targetGen;
            } else {
               newState.wildGenerals = [...(newState.wildGenerals || []), targetGen.name];
            }
            actionTaken = true;
         } else {
             const discovered = wildInProvince.filter(
               wg => (newState.wildGenerals || []).includes(wg.name)
             );
             if (discovered.length > 0) {
                const target = discovered[0];
                const targetGen = { ...target };
                const hireChance = 0.4 + ((gen.cha - targetGen.int) * 0.01);
                if (Math.random() < hireChance) {
                   targetGen.isWild = false;
                   targetGen.loyalty = 80; 
                   newState.generalsData[targetGen.name] = targetGen;
                   actionTaken = true;
                }
             }
         }
      }

      // 各階段核心行為分流
      const doDraft = () => {
          if (!updatedP.hasDraftedThisMonth && updatedP.gold >= 200 && updatedP.population >= tierRules.minPopulation + 3000) {
              const maxDraft = Math.min((gen.cha + 50) * 15, 3000); 
              const amount = Math.min(maxDraft, updatedP.population - tierRules.minPopulation, Math.floor(updatedP.gold * 10), Math.max(0, targetTroops - currentTroops));
              
              if (amount >= 500) {
                 const goldCost = Math.floor(amount / 10);
                 updatedP.gold -= goldCost;
                 updatedP.population -= amount;
                 
                 let remainingRecruits = amount;
                 for (const targetG of aiGenerals) {
                   if (remainingRecruits <= 0) break;
                   const space = (targetG.maxTroops || 10000) - (targetG.soldiers || 0);
                   if (space > 0) {
                     const toAdd = Math.min(space, remainingRecruits);
                     targetG.soldiers = (targetG.soldiers || 0) + toAdd;
                     newState.generalsData[targetG.name] = targetG;
                     remainingRecruits -= toAdd;
                   }
                 }

                 updatedP.loyalty = Math.max(0, updatedP.loyalty - 3);
                 updatedP.hasDraftedThisMonth = true;
                 return true;
              }
          }
          return false;
      };

      const doTrain = () => {
          const strFactor = Math.floor(Math.pow(Math.max(0, gen.str) / 100, 2.5) * 5);
          const increase = Math.min(7, Math.max(1, strFactor + Math.floor(Math.random() * 2) + 1));
          if ((gen.soldiers || 0) > 0 && (gen.training || 0) < 80) {
              gen.training = Math.min(100, (gen.training || 0) + increase);
              return true;
          }
          return false;
      };

      const doDomestic = () => {
          if (updatedP.gold >= 100) {
              const needsFarming = updatedP.value < tierRules.maxDev;
              const needsCommerce = (updatedP.commerce || 50) < tierRules.maxCommerce;
              
              const increase = calculateDevGain(gen.pol);

              const doFarming = () => {
                  updatedP.gold -= 100;
                  updatedP.value = Math.min(tierRules.maxDev, updatedP.value + increase);
              };
              const doCommerce = () => {
                  updatedP.gold -= 100;
                  updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 50) + increase);
              };

              if (needsFarming && needsCommerce) {
                  Math.random() < 0.5 ? doFarming() : doCommerce();
                  return true;
              } else if (needsFarming) {
                  doFarming(); return true;
              } else if (needsCommerce) {
                  doCommerce(); return true;
              }
          }
          return false;
      };

      if (!actionTaken) {
          if (isPhase1) {
              // 階段1: 絕對軍事優先 (徵兵 -> 訓練 -> 內政補底)
              actionTaken = doDraft() || doTrain() || doDomestic();
          } else if (isPhase2) {
              // 階段2: 鞏固基底 (停止徵兵，全力內政與訓練)
              if (gen.pol > gen.str) {
                  actionTaken = doDomestic() || doTrain();
              } else {
                  actionTaken = doTrain() || doDomestic();
              }
          } else if (isPhase3) {
              // 階段3: 深度備戰 (重啟徵兵，擴軍為主)
              if (gen.str > gen.pol) {
                  actionTaken = doDraft() || doTrain() || doDomestic();
              } else {
                  actionTaken = doDomestic() || doDraft() || doTrain();
              }
          } else {
              // 階段4: 富國強兵 (軍政雙行)
              if (gen.str > gen.pol) {
                  actionTaken = doDraft() || doTrain() || doDomestic();
              } else {
                  actionTaken = doDomestic() || doTrain() || doDraft();
              }
          }
      }

      gen.hasActed = true; 
      newState.generalsData[gen.name] = gen;
  });
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

    if (reinforcementEventMessages.length > 0) {
      newState.monthlyEvents.push("【求援】" + enemyRuler + " 遭到攻擊，向鄰近城池發出求救信！");
      newState.monthlyEvents.push(...reinforcementEventMessages);
    }

    if (attackPower > finalEnemyPower * 1.05) {
      tState.rulerName = rulerName;
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
          const decision = processAICaptiveDecision(g, rulerName, winnerGen, target.targetId, isEliminated && g.name === enemyRuler);
          if (decision.action === 'recruit') {
            g.isCaptive = false; g.captiveOfRuler = null; g.provinceId = target.targetId; g.loyalty = 70; g.isWild = false; g.soldiers = 0;
          } else if (decision.action === 'execute') {
            handleRulerDecapitation(newState, g.name, rulerName);
          } else if (decision.action === 'release') {
            g.isCaptive = false; g.captiveOfRuler = null; g.provinceId = target.targetId; g.isWild = true; g.soldiers = 0;
          } else {
            g.isCaptive = true; g.captiveOfRuler = rulerName; g.capturedInProvinceId = target.targetId; g.soldiers = 0;
          }
          newState.monthlyEvents.push(decision.log);
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

      if (reinforcementEventMessages.length > 0) {
        newState.monthlyEvents.push("🛡️【戰報】" + rulerName + "軍 進犯 " + targetName + "！因援軍及時抵達，" + rulerName + "軍 腹背受敵，鎩羽而歸！");
      } else {
        newState.monthlyEvents.push("🛡️【戰報】" + rulerName + "軍 進犯 " + targetName + "，遭到 " + enemyRuler + "軍 頑強抵抗，鎩羽而歸！");
      }
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

export function processAITurn(state: GameState): GameState {
  let newState = { 
     ...state, 
     provincesData: { ...state.provincesData }, 
     generalsData: { ...state.generalsData } 
  };
  
  // 1. 戰略層面 (Expansion & Invasion)
  const aiRulers = Array.from(new Set(Object.values(newState.provincesData).map(p => p.rulerName).filter(Boolean))) as string[];
  for (const ruler of aiRulers) {
    if (ruler !== state.rulerName) { // Exclude player
       executeRulerStrategicAI(newState, ruler);
    }
  }

  Object.values(newState.provincesData).forEach(p => {
    const isEnemyAI = p.rulerName && p.rulerName !== state.rulerName;
    const isPlayerAutonomous = p.rulerName === state.rulerName && p.isAutonomous;
    
    if (isEnemyAI || isPlayerAutonomous) {
       let updatedP = { ...p };
       executeProvinceAI(updatedP, newState, p.rulerName!, isPlayerAutonomous);
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
     // 12個月皆可能發生，極低頻率
     const earthquakeProvinces = [16, 17, 18, 19, 20, 35, 36, 37, 38, 39, 40, 43];
     const earthquakeChance = earthquakeProvinces.includes(updatedP.id) ? 0.0167 : 0.004;
     
     if (Math.random() < earthquakeChance) {
        const cityName = provinces.find(x => x.id === updatedP.id)?.name || '未知城池';
        
        // 基礎傷害 (農業、商業、治水、人口、士兵、民心)
        const valueLoss = Math.floor(updatedP.value * (0.2 + Math.random() * 0.2)); // 20%~40%
        const commerceLoss = Math.floor((updatedP.commerce || 50) * (0.2 + Math.random() * 0.2)); // 20%~40%
        const popLoss = Math.floor(updatedP.population * (0.05 + Math.random() * 0.05)); // 5%~10%
        const soldierLoss = Math.floor((updatedP.soldiers || 0) * (0.05 + Math.random() * 0.05)); // 5%~10%
        const floodDmg = 30 + Math.floor(Math.random() * 21); // 30~50
        const loyaltyLoss = 15 + Math.floor(Math.random() * 6); // 15~20
        
        updatedP.value = Math.max(0, updatedP.value - valueLoss);
        updatedP.commerce = Math.max(0, (updatedP.commerce || 50) - commerceLoss);
        updatedP.population = Math.max(0, updatedP.population - popLoss);
        if (updatedP.soldiers) {
            updatedP.soldiers = Math.max(0, updatedP.soldiers - soldierLoss);
        }
        updatedP.flood = Math.min(100, updatedP.flood + floodDmg);
        updatedP.loyalty = Math.max(0, updatedP.loyalty - loyaltyLoss);
        
        let msg = `【地震】天搖地動！${cityName} 發生大地震！房屋倒塌，哀鴻遍野！商業下降 ${commerceLoss}，農業下降 ${valueLoss}，軍民死傷 ${popLoss + soldierLoss} 人，民心大幅下降 ${loyaltyLoss}。`;
        
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

    updatedGenerals[gName] = {
      ...gen,
      hasActed: newHasActed,
      rewardedThisMonth: false,
      activeTask: newTask
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
      const isAllied = newState.alliances?.[state.rulerName]?.[aiRuler];

      // A. 主動求盟 (友好 >= 90，且未同盟，12% 機率)
      if (!isAllied && rel >= 90 && Math.random() < 0.12) {
        const duration = Math.floor(Math.random() * 13) + 12; // 12~24 個月
        const expiryAbsolute = currentAbsoluteMonth + duration;

        if (!newState.alliances) newState.alliances = {};
        if (!newState.alliances[state.rulerName]) newState.alliances[state.rulerName] = {};
        if (!newState.alliances[aiRuler]) newState.alliances[aiRuler] = {};
        newState.alliances[state.rulerName][aiRuler] = expiryAbsolute;
        newState.alliances[aiRuler][state.rulerName] = expiryAbsolute;

        diplomaticEventMessages.push(`🤝【鄰邦求盟】：【${aiRuler}】遣使持金帛盟書拜謁主公，感念兩邦世代敦睦，請求正式締結為期 ${duration} 個月之互保同盟！主公已欣然應允！`);
        break; // 每月最多觸發一次
      }

      // B. 鄰邦進貢 (友好 >= 70，5% 機率)
      if (rel >= 70 && Math.random() < 0.05) {
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
