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
  calculateDraftCost 
} from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';
import { getFactionStrategist } from './strategistAdvice';

const SEASONS = ['春', '夏', '秋', '冬'];

export function initGame(scenarioIndex: number, playerRulerName: string): GameState {
  const provincesData: Record<number, ProvinceState> = {};
  const generalsData: Record<string, GeneralState> = {};
  const scenario = SCENARIOS[scenarioIndex];

  // 1. Initialize Provinces with base stats from PROVINCE_BASE_CONFIGS & Historical presets
  provinces.forEach(p => {
    const baseConfig = PROVINCE_BASE_CONFIGS[p.id] || {
      id: p.id,
      name: p.name,
      tier: 'STANDARD' as const,
      basePopulation: 10,
      baseDev: 110,
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
    const defVariance = Math.floor((Math.random() - 0.5) * 6);

    // 初始開發度降低至基準的 30% 左右，留給玩家內政空間
    const startingDev = Math.round((baseConfig.baseDev * 0.3 + devVariance) * devMult);

    provincesData[p.id] = {
      id: p.id,
      rulerName: null,
      gold: Math.round(baseConfig.baseGold * 0.6), // 空城資源減半
      food: Math.round(baseConfig.baseFood * 0.5),
      population: Math.max(tierRules.minPopulation, Math.round(baseConfig.basePopulation * 10000 * popVariance)),
      soldiers: 0,
      value: Math.max(10, Math.min(tierRules.maxDev, startingDev)),
      flood: Math.max(10, Math.min(99, baseConfig.baseDefense + defVariance)),
      loyalty: loyBase + Math.floor(Math.random() * 10),
      price: 10 + Math.floor(Math.random() * 5),
      forts: initialForts,
      training: historicalMil.training,
      weapons: historicalMil.weapons
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
          pState.flood = Math.min(99, Math.round(baseConfig.baseDefense * (isCapital ? 1.1 : 1.0)));
        }
      });
    });
  }

  // 2.5 空白地額外懲罰
  Object.values(provincesData).forEach(pState => {
    if (pState.rulerName === null) {
      pState.value = Math.max(5, Math.round(pState.value * 0.7)); // 空白地開發度降低
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
        : 'STANDARD';

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
      const startingSoldiers = calculateStartingGeneralTroops(
        effectiveRole,
        effectiveMaxTroops,
        isRuler,
        g.str,
        g.int,
        cityTier
      );

      // 武將訓練度與武裝度依武力/智力與身份給予合適開局值 (50~88)
      const baseTraining = Math.min(90, Math.max(50, Math.round((g.str + g.hp) / 2.3)));
      const baseWeapons = Math.min(90, Math.max(50, Math.round((g.str + (g.pol || 50)) / 2.3)));

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
        weapons: baseWeapons,
        hasActed: false
      };
    }
  });

  // 3.5 自動為無君主駐守之郡縣冊封首任太守（帶兵 4000）
  Object.values(provincesData).forEach(p => {
    const provGens = Object.values(generalsData).filter(g => g.provinceId === p.id && !g.isWild && !g.isRuler);
    const hasRulerInProv = Object.values(generalsData).some(g => g.provinceId === p.id && g.isRuler);
    if (provGens.length > 0 && !hasRulerInProv) {
      const sorted = [...provGens].sort((a, b) => (b.pol + b.cha + b.str) - (a.pol + a.cha + a.str));
      const topGen = sorted[0];
      topGen.role = '太守';
      topGen.maxTroops = 4000;
      topGen.soldiers = 4000;
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
        weapons: 40,
        hasActed: false,
        isWild: true, // Marked as wild in this province
        bio: ht.desc
      };
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
        // 政治能力決定開發成效 (高政治 + 隨機浮動)
        const increase = Math.floor(totalPol / 8) + Math.floor(Math.random() * 5) + 3;
        province.value = Math.min(tierRules.maxDev, province.value + increase);
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    } else if (action === '洪水防治') {
      const floodCost = 100; // 一次 100 金
      if (province.gold >= floodCost) {
        province.gold -= floodCost;
        const decrease = Math.floor(totalPol / 8) + Math.floor(Math.random() * 5) + 4;
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

    if (action === '買入米糧' && payload) {
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
      const amount = payload.amount;
      if (actingGen && !actingGen.hasActed) {
        const itemBonus = getGeneralItemBonus(actingGen.name, state.currentScenario);
        const totalCha = actingGen.cha + itemBonus.chaBonus;
        const goldCost = calculateDraftCost(amount);

        if (province.gold >= goldCost && province.population - amount >= tierRules.minPopulation) {
          province.gold -= goldCost;
          province.population -= amount;

          // 新徵召之新兵進入都市預備兵，動態加權平均計算訓練度與武裝度
          const prevSoldiers = province.soldiers || 0;
          const prevTraining = province.training ?? 50;
          const prevWeapons = province.weapons ?? 50;
          const rookieTraining = 30; // 新兵訓練度 30
          const rookieWeapons = 25;  // 新兵武裝度 25

          const totalSoldiers = prevSoldiers + amount;
          if (totalSoldiers > 0) {
            province.training = Math.round((prevSoldiers * prevTraining + amount * rookieTraining) / totalSoldiers);
            province.weapons = Math.round((prevSoldiers * prevWeapons + amount * rookieWeapons) / totalSoldiers);
          }

          province.soldiers = totalSoldiers;
          actingGen.hasActed = true;
          newState.generalsData[actingGen.name] = actingGen;
        }
      }
    } else if (action === '訓練兵士' && payload) {
      const gen = newState.generalsData[payload.generalName];
      if (gen && gen.provinceId === provinceId && !gen.hasActed) {
        const itemBonus = getGeneralItemBonus(gen.name, state.currentScenario);
        const totalStr = gen.str + itemBonus.strBonus;
        const increase = Math.floor(totalStr / 5) + 6;
        const oldTraining = gen.training;
        gen.training = Math.min(100, gen.training + increase);
        const actualGain = gen.training - oldTraining;
        gen.hasActed = true;
        newState.generalsData[gen.name] = gen;

        newState.lastActionResult = {
          action: '訓練兵士',
          type: 'success',
          title: '⚔️ 訓練士兵成果報告',
          message: `【${gen.name}】（武力 ${totalStr}）親自指揮部隊進行特訓！\n\n軍隊訓練度：${oldTraining}% ➔ ${gen.training}% (+${actualGain}%)`,
          actorGeneral: gen.name,
        };
      }
    } else if (action === '購買武器' && payload) {
      const { generalName: targetGenName, goldSpent } = payload;
      if (!actingGen || actingGen.hasActed) return state;
      
      if (targetGenName === 'RESERVE') {
        // 為預備兵購置武器
        if (province.gold >= goldSpent) {
          province.gold -= goldSpent;
          const weaponsBought = goldSpent * 100;
          const percentIncrease = province.soldiers > 0 ? Math.floor((weaponsBought / province.soldiers) * 100) : 10;
          province.weapons = Math.min(100, (province.weapons ?? 50) + percentIncrease);
          actingGen.hasActed = true;
          newState.generalsData[actingGen.name] = actingGen;
        }
      } else {
        const gen = newState.generalsData[targetGenName];
        if (gen && gen.provinceId === provinceId && province.gold >= goldSpent) {
          province.gold -= goldSpent;
          const weaponsBought = goldSpent * 100;
          const percentIncrease = gen.soldiers > 0 ? Math.floor((weaponsBought / gen.soldiers) * 100) : 10;
          gen.weapons = Math.min(100, gen.weapons + percentIncrease);
          actingGen.hasActed = true;
          newState.generalsData[actingGen.name] = actingGen;
          newState.generalsData[gen.name] = gen; // update target gen's weapons
        }
      }
    } else if (action === '調整兵力' && payload) {
      const { allocations } = payload;
      if (!actingGen || actingGen.hasActed) return state;
      
      // 動態加權配置：武將與預備兵之間兵力、兵器、訓練度雙向流轉
      let curReserveSoldiers = province.soldiers || 0;
      let curReserveTraining = province.training ?? 50;
      let curReserveWeapons = province.weapons ?? 50;

      // 1. 先處理兵力減少的武將（退兵回預備役，提升/平均預備兵訓練與兵器）
      for (const [gName, newAmountRaw] of Object.entries(allocations)) {
        const gen = newState.generalsData[gName];
        const newAmount = Number(newAmountRaw);
        if (gen && gen.provinceId === provinceId) {
          const oldAmount = gen.soldiers || 0;
          if (newAmount < oldAmount) {
            const returnedSoldiers = oldAmount - newAmount;
            const combinedSoldiers = curReserveSoldiers + returnedSoldiers;
            if (combinedSoldiers > 0) {
              curReserveTraining = Math.round(
                (curReserveSoldiers * curReserveTraining + returnedSoldiers * gen.training) / combinedSoldiers
              );
              curReserveWeapons = Math.round(
                (curReserveSoldiers * curReserveWeapons + returnedSoldiers * gen.weapons) / combinedSoldiers
              );
            }
            curReserveSoldiers = combinedSoldiers;
            gen.soldiers = newAmount;
          }
        }
      }

      // 2. 再處理兵力增加的武將（從預備役補兵，將預備兵之訓練度與武裝度動態混編入該將軍隊）
      for (const [gName, newAmountRaw] of Object.entries(allocations)) {
        const gen = newState.generalsData[gName];
        const newAmount = Number(newAmountRaw);
        if (gen && gen.provinceId === provinceId) {
          const oldAmount = gen.soldiers || 0;
          if (newAmount > oldAmount) {
            const addedSoldiers = newAmount - oldAmount;
            if (newAmount > 0) {
              gen.training = Math.round(
                (oldAmount * gen.training + addedSoldiers * curReserveTraining) / newAmount
              );
              gen.weapons = Math.round(
                (oldAmount * gen.weapons + addedSoldiers * curReserveWeapons) / newAmount
              );
            }
            curReserveSoldiers = Math.max(0, curReserveSoldiers - addedSoldiers);
            gen.soldiers = newAmount;
          }
        }
      }

      province.soldiers = curReserveSoldiers;
      province.training = Math.min(100, Math.max(0, curReserveTraining));
      province.weapons = Math.min(100, Math.max(0, curReserveWeapons));

      if (actingGen && !actingGen.hasActed) {
        actingGen.hasActed = true;
        newState.generalsData[actingGen.name] = actingGen;
      }
    }
  } else if (category === '軍事') {
    if ((action === '調動軍隊' || action === '武將調動') && payload) {
      const { generalNames, targetProvinceId } = payload;
      const targetProv = newState.provincesData[targetProvinceId];
      if (targetProv && Array.isArray(generalNames)) {
        generalNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          // 已經執行過任務之武將，不能移動
          if (gen && gen.provinceId === provinceId && !gen.hasActed) {
            gen.provinceId = targetProvinceId;
            gen.hasActed = true; // 移動後本月已行動
            newState.generalsData[gName] = gen;
          }
        });
      }
    } else if (action === '發動戰役' && payload) {
      const { attackingGeneralNames } = payload;
      if (Array.isArray(attackingGeneralNames)) {
        attackingGeneralNames.forEach((gName: string) => {
          const gen = newState.generalsData[gName];
          // 已經執行過任務之武將，不能參與發動戰役
          if (gen && !gen.hasActed) {
            gen.hasActed = true;
            newState.generalsData[gName] = gen;
          }
        });
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

  // 3. Process time-based events (simplified)
  Object.values(newState.provincesData).forEach(p => {
     const updatedP = { ...p };
     // Yearly flood rate increase (happens dynamically over time)
     const pBase = provinces.find(x => x.id === p.id);
     if (pBase && newMonth === 1) {
        updatedP.flood = Math.min(100, updatedP.flood + pBase.floodGrowthRate);
     }
     
     // 10月: 人口增加
     if (newMonth === 10) {
        const growth = Math.floor(updatedP.population * (updatedP.value / 100) * (1 - updatedP.flood / 100) * 0.05);
        updatedP.population += growth;
     }

     // 3.5 玩家『郡縣自治』每月太守自動施政
     if (updatedP.rulerName === state.rulerName && updatedP.isAutonomous) {
        const tierRules = getProvinceTierRules(updatedP.id);
        if (updatedP.flood > 35 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          updatedP.flood = Math.max(0, updatedP.flood - (Math.floor(Math.random() * 6) + 8));
        } else if (updatedP.value < tierRules.maxDev && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          updatedP.value = Math.min(tierRules.maxDev, updatedP.value + (Math.floor(Math.random() * 6) + 6));
        } else if (updatedP.loyalty < 85 && updatedP.food >= 100) {
          updatedP.food -= 100;
          updatedP.loyalty = Math.min(100, updatedP.loyalty + (Math.floor(Math.random() * 4) + 5));
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

  // 5. 新年份在野武將出仕檢測
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
          weapons: 40,
          hasActed: false,
          isWild: true,
          bio: ht.desc
        };
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

  return {
    ...newState,
    generalsData: updatedGenerals,
    month: newMonth,
    year: newYear,
    season: newSeason,
    lastActionResult: monthlyResult,
    activeMenu: null // close menu on next turn
  };
}
