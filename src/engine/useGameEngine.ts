import { useState, useCallback } from 'react';
import { GameState, ProvinceState, GeneralState, FormationTerrainType } from '../types';
import { initGame, advanceTime, executeCommand } from './gameLogic';
import { calculateFormationTerrainCombatModifier } from './formations';
import { getGeneralItemBonus } from '../data/items';
import { calculateCaptiveRate, isCityIsolated, processAICaptiveDecision, calculateCaptiveRecruitChance } from './postBattleLogic';
import { handleRulerDecapitation, applyPlayerSuccessorChoice } from './rulerSuccessionLogic';

function getBestStrategistForBattle(
  assignedStrategist: string | null | undefined,
  generalsList: string[],
  generalsData: Record<string, any>,
  scenarioIndex: number
): string | null {
  if (assignedStrategist) {
    const g = generalsData[assignedStrategist];
    if (g) {
      const itemBonus = getGeneralItemBonus(g.name, scenarioIndex);
      if (g.int + itemBonus.intBonus >= 80) {
        return assignedStrategist;
      }
    }
  }
  const candidates = generalsList
    .map(name => {
      const g = generalsData[name];
      if (!g) return null;
      const itemBonus = getGeneralItemBonus(g.name, scenarioIndex);
      const totalInt = g.int + itemBonus.intBonus;
      return { name: g.name, totalInt };
    })
    .filter((g): g is { name: string; totalInt: number } => g !== null && g.totalInt >= 80)
    .sort((a, b) => b.totalInt - a.totalInt);

  return candidates.length > 0 ? candidates[0].name : null;
}

export function battleCombatCalculator(
  formationName: string, 
  provinceId: number, 
  general: any,
  terrainRatio?: { 平地: number; 水上: number; 山嶽: number; 密林: number }
) {
  return calculateFormationTerrainCombatModifier({
    formationName,
    provinceId,
    general,
    terrainRatio
  });
}

export function useGameEngine(initialScenario: number, initialRuler: string, initialGameState?: GameState) {
  const [gameState, setGameState] = useState<GameState>(() => initialGameState || initGame(initialScenario, initialRuler));

  const dispatchNextTurn = useCallback(() => {
    setGameState(prev => {
      // 1. 若本月有已排定之戰役，點擊休息後依序進入第一場戰役
      const list = prev.pendingBattles || (prev.pendingBattle ? [prev.pendingBattle] : []);
      if (list.length > 0) {
        const [firstBattle, ...remainingBattles] = list;
        
        // 自動判斷並指定智力 >= 80 最高將領為軍師 (攻守兩端)
        const atkStrategist = getBestStrategistForBattle(
          firstBattle.attackerStrategist,
          firstBattle.attackingGenerals,
          prev.generalsData,
          prev.currentScenario
        );
        const defStrategist = getBestStrategistForBattle(
          firstBattle.defenderStrategist,
          firstBattle.defendingGenerals,
          prev.generalsData,
          prev.currentScenario
        );

        return {
          ...prev,
          activeBattle: {
            targetProvinceId: firstBattle.targetProvinceId,
            attackerProvinceId: firstBattle.attackerProvinceId,
            attackerReinforceProvinceId: firstBattle.attackerReinforceProvinceId,
            attackingGenerals: firstBattle.attackingGenerals,
            defendingGenerals: firstBattle.defendingGenerals,
            attackerStrategist: atkStrategist,
            defenderStrategist: defStrategist,
            attackerGold: firstBattle.attackerGold,
            attackerFood: firstBattle.attackerFood,
            resourcesDeducted: firstBattle.resourcesDeducted,
            attackerGeneralOrigins: firstBattle.attackerGeneralOrigins,
            defenderPrimaryProvinceId: firstBattle.defenderPrimaryProvinceId,
            defenderReinforceProvinceId: firstBattle.defenderReinforceProvinceId,
            defenderGeneralOrigins: firstBattle.defenderGeneralOrigins,
            defenderResourcesDeducted: firstBattle.defenderResourcesDeducted
          },
          pendingBattles: remainingBattles,
          pendingBattle: remainingBattles[0] || null,
          view: 'battle'
        };
      }
      // 2. 無戰役則正常推進時光進入下個月
      const nextMonthState = advanceTime(prev);
      
      // 3. 檢查是否有 AI 發起的攻擊 (玩家防守戰)
      if (nextMonthState.pendingDefenses && nextMonthState.pendingDefenses.length > 0) {
        const list = nextMonthState.pendingDefenses;
        const [firstBattle, ...remainingBattles] = list;
        
        const atkStrategist = getBestStrategistForBattle(
          firstBattle.attackerStrategist,
          firstBattle.attackingGenerals,
          nextMonthState.generalsData,
          nextMonthState.currentScenario
        );
        const defStrategist = getBestStrategistForBattle(
          firstBattle.defenderStrategist,
          firstBattle.defendingGenerals,
          nextMonthState.generalsData,
          nextMonthState.currentScenario
        );
        
        return {
          ...nextMonthState,
          activeBattle: {
            isDefense: true,
            attackerRuler: firstBattle.attackerRuler,
            defenderRuler: firstBattle.defenderRuler,
            targetProvinceId: firstBattle.targetProvinceId,
            attackerProvinceId: firstBattle.attackerProvinceId,
            attackerReinforceProvinceId: firstBattle.attackerReinforceProvinceId,
            attackingGenerals: firstBattle.attackingGenerals,
            defendingGenerals: firstBattle.defendingGenerals,
            attackerStrategist: atkStrategist,
            defenderStrategist: defStrategist,
            attackerGold: firstBattle.attackerGold,
            attackerFood: firstBattle.attackerFood,
            resourcesDeducted: firstBattle.resourcesDeducted,
            attackerGeneralOrigins: firstBattle.attackerGeneralOrigins,
            defenderPrimaryProvinceId: firstBattle.defenderPrimaryProvinceId,
            defenderReinforceProvinceId: firstBattle.defenderReinforceProvinceId,
            defenderGeneralOrigins: firstBattle.defenderGeneralOrigins,
            defenderResourcesDeducted: firstBattle.defenderResourcesDeducted
          },
          pendingDefenses: remainingBattles,
          view: 'battle'
        };
      }
      
      return nextMonthState;
    });
  }, []);

  const dispatchExecuteCommand = useCallback((provinceId: number, category: string, action: string, generalName?: string, payload?: any) => {
    setGameState(prev => executeCommand(prev, provinceId, category, action, generalName, payload));
  }, []);

  const resolveBattle = useCallback((winner: 'attacker' | 'defender') => {
    setGameState(prev => {
      const battle = prev.activeBattle;
      if (!battle) return { ...prev, view: 'map' };

      const baseState = { ...prev, provincesData: { ...prev.provincesData }, generalsData: { ...prev.generalsData } };
      const targetProv = { ...baseState.provincesData[battle.targetProvinceId] };
      const primaryAtkCityId = battle.attackerProvinceId;
      const reinforceAtkCityId = battle.attackerReinforceProvinceId;
      const defReinforceCityId = battle.defenderReinforceProvinceId;
      const isDefense = battle.isDefense;

      const winnerRuler = winner === 'attacker'
        ? (isDefense ? battle.attackerRuler! : prev.rulerName)
        : (isDefense ? prev.rulerName : battle.defenderRuler || targetProv.rulerName!);

      const defeatedRuler = winner === 'attacker'
        ? (isDefense ? prev.rulerName : battle.defenderRuler || targetProv.rulerName!)
        : (isDefense ? battle.attackerRuler! : prev.rulerName);

      const capturedGeneralsForPlayer: string[] = [];
      let isFactionEliminated = false;

      if (winner === 'attacker') {
        // --- 1. 攻方勝利 (破城) ---
        targetProv.rulerName = winnerRuler;
        
        // 金糧戰後處理：接管守方城池 60% 金糧，其餘 40% 戰火損耗
        const oldGold = targetProv.gold;
        const oldFood = targetProv.food;
        targetProv.gold = Math.floor(oldGold * 0.6);
        targetProv.food = Math.floor(oldFood * 0.6);

        // 隨軍攜帶錢糧移入新城池 (主進攻城池)
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (pId === primaryAtkCityId) {
              targetProv.gold += res.gold;
              targetProv.food += res.food;
            } else if (baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        // 城池受創與民心衰退
        targetProv.loyalty = Math.max(0, targetProv.loyalty - 20);
        targetProv.value = Math.max(10, Math.floor(targetProv.value * 0.8));
        targetProv.commerce = Math.max(10, Math.floor((targetProv.commerce || 50) * 0.8));
        targetProv.isAutonomous = false;

        // 攻擊方將領進駐
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            if (originCity === primaryAtkCityId) {
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: battle.targetProvinceId,
                hasActed: true
              };
            } else if (reinforceAtkCityId && originCity === reinforceAtkCityId) {
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: reinforceAtkCityId,
                hasActed: true
              };
            }
          }
        });

        // 檢查敗方是否滅國 (被攻陷後在全地圖是否已無任何城池)
        const remainingDefCities = (Object.values(baseState.provincesData) as ProvinceState[]).filter(p => p.id !== battle.targetProvinceId && p.rulerName === defeatedRuler);
        const isEliminated = remainingDefCities.length === 0;
        isFactionEliminated = isEliminated;
        const isIsolated = isCityIsolated(battle.targetProvinceId, defeatedRuler, baseState.provincesData);

        // 處理敵方守將 (與援軍) 的俘虜與逃脫
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            if (defOrigin === battle.targetProvinceId) {
              // 守城本陣武將判定俘虜
              const rate = calculateCaptiveRate(gen, true, isIsolated, isEliminated);
              const isCaptured = Math.random() < rate;

              if (isCaptured) {
                if (winnerRuler === prev.rulerName) {
                  // 玩家勝，加入 captive 名單
                  capturedGeneralsForPlayer.push(gName);
                  baseState.generalsData[gName] = {
                    ...gen,
                    isCaptive: true,
                    captiveOfRuler: winnerRuler,
                    originalRulerName: defeatedRuler,
                    capturedInProvinceId: battle.targetProvinceId,
                    soldiers: 0
                  };
                } else {
                  // AI 勝，自動決策處置俘虜
                  const winnerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g.name === winnerRuler) || null;
                  const decision = processAICaptiveDecision(gen, winnerRuler, winnerGen, battle.targetProvinceId, isEliminated, gName === defeatedRuler, defeatedRuler);

                  if (decision.action === 'recruit') {
                    baseState.generalsData[gName] = { ...gen, isCaptive: false, captiveOfRuler: null, originalRulerName: null, provinceId: battle.targetProvinceId, loyalty: 70, isWild: false, soldiers: 0 };
                  } else if (decision.action === 'execute') {
                    handleRulerDecapitation(baseState, gName, winnerRuler);
                  } else if (decision.action === 'release') {
                    baseState.generalsData[gName] = { ...gen, isCaptive: false, captiveOfRuler: null, originalRulerName: null, provinceId: battle.targetProvinceId, isWild: true, soldiers: 0 };
                  } else {
                    baseState.generalsData[gName] = { ...gen, isCaptive: true, captiveOfRuler: winnerRuler, originalRulerName: defeatedRuler, capturedInProvinceId: battle.targetProvinceId, soldiers: 0 };
                  }
                }
              } else {
                // 逃脫退為在野或逃回殘存城池
                baseState.generalsData[gName] = {
                  ...gen,
                  isWild: isEliminated,
                  provinceId: isEliminated ? null : (remainingDefCities[0]?.id || battle.targetProvinceId),
                  soldiers: 0,
                  loyalty: Math.max(0, gen.loyalty - 20)
                };
              }
            } else if (defReinforceCityId && defOrigin === defReinforceCityId) {
              // 敵方援軍退回原城池 (折損半數兵馬)
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: defReinforceCityId,
                soldiers: Math.floor(gen.soldiers * 0.5)
              };
            }
          }
        });

        // 返還敵方援軍隨軍物資
        if (battle.defenderResourcesDeducted) {
          Object.entries(battle.defenderResourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        let victoryMsg = isDefense 
          ? `敵軍攻勢太猛，我軍無力回天，【${targetProv.name}】已落入敵方手中...` 
          : `我軍英勇善戰，成功攻破【${targetProv.name}】！大獲全勝並接管該城 60% 資糧（隨軍糧餉完全收歸）！`;

        if (isEliminated) {
          victoryMsg += ` 敵方勢力【${defeatedRuler}】就此滅亡！城內將領悉數被俘！`;
        }

        baseState.lastActionResult = {
          action: isDefense ? '守城失敗' : '攻城勝利',
          title: isDefense ? '💀 城池陷落' : (isEliminated ? '👑 滅國大捷：天下一統之階！' : '🔥 攻城大捷：破城奪地！'),
          message: victoryMsg,
          type: isDefense ? 'failure' : 'success'
        };

      } else {
        // --- 2. 守方勝利 (擊退攻方) ---
        // 繳獲攻方隨軍攜帶錢糧之 60%
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (pId === primaryAtkCityId) {
              const lootedGold = Math.floor(res.gold * 0.6);
              const lootedFood = Math.floor(res.food * 0.6);
              targetProv.gold += lootedGold;
              targetProv.food += lootedFood;

              // 剩餘 40% 攜回原城
              if (baseState.provincesData[pId]) {
                baseState.provincesData[pId].gold += (res.gold - lootedGold);
                baseState.provincesData[pId].food += (res.food - lootedFood);
              }
            } else if (baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        // 敗退攻擊方將領判定俘虜
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            const rate = calculateCaptiveRate(gen, false, false, false);
            const isCaptured = Math.random() < rate;

            if (isCaptured) {
              if (winnerRuler === prev.rulerName) {
                capturedGeneralsForPlayer.push(gName);
                baseState.generalsData[gName] = {
                  ...gen,
                  isCaptive: true,
                  captiveOfRuler: winnerRuler,
                  originalRulerName: defeatedRuler,
                  capturedInProvinceId: battle.targetProvinceId,
                  soldiers: 0
                };
              } else {
                const winnerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g.name === winnerRuler) || null;
                const decision = processAICaptiveDecision(gen, winnerRuler, winnerGen, battle.targetProvinceId, false, gName === defeatedRuler, defeatedRuler);

                if (decision.action === 'recruit') {
                  baseState.generalsData[gName] = { ...gen, isCaptive: false, captiveOfRuler: null, originalRulerName: null, provinceId: battle.targetProvinceId, loyalty: 70, isWild: false, soldiers: 0 };
                } else if (decision.action === 'execute') {
                  handleRulerDecapitation(baseState, gName, winnerRuler);
                } else if (decision.action === 'release') {
                  baseState.generalsData[gName] = { ...gen, isCaptive: false, captiveOfRuler: null, originalRulerName: null, provinceId: originCity, isWild: true, soldiers: 0 };
                } else {
                  baseState.generalsData[gName] = { ...gen, isCaptive: true, captiveOfRuler: winnerRuler, originalRulerName: defeatedRuler, capturedInProvinceId: battle.targetProvinceId, soldiers: 0 };
                }
              }
            } else {
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: originCity,
                soldiers: Math.floor(gen.soldiers * 0.4),
                hasActed: true
              };
            }
          }
        });

        // 守方將領歸位
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            if (defReinforceCityId && defOrigin === defReinforceCityId) {
              baseState.generalsData[gName] = { ...gen, provinceId: defReinforceCityId };
            }
          }
        });

        // 守方援軍物資返還
        if (battle.defenderResourcesDeducted) {
          Object.entries(battle.defenderResourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        baseState.lastActionResult = {
          action: isDefense ? '守城勝利' : '攻城失敗',
          title: isDefense ? '🛡️ 防守成功：固若金湯！' : '❌ 攻城失利：鳴金收兵',
          message: isDefense 
             ? `我軍將士用命，成功擊退了敵軍進犯並繳獲敵軍 60% 隨軍糧餉！【${targetProv.name}】安然無恙！` 
             : `敵軍防守嚴密，我軍久攻不下，各路兵馬只好撤回原城...`,
          type: isDefense ? 'success' : 'failure'
        };
      }

      // 如果玩家勝利且生擒俘虜，存入 pendingCaptives
      if (winnerRuler === prev.rulerName && capturedGeneralsForPlayer.length > 0) {
        baseState.pendingCaptives = capturedGeneralsForPlayer.map(gName => ({
          generalName: gName,
          capturedInProvinceId: battle.targetProvinceId,
          winnerRuler: prev.rulerName,
          defeatedRuler,
          isEliminatedRuler: isFactionEliminated && (gName === defeatedRuler),
          isFactionEliminated: isFactionEliminated,
          isRulerSelf: gName === defeatedRuler
        }));
      }

      baseState.provincesData[targetProv.id] = targetProv;
      
      // 檢查是否還有後續排定之戰役
      let remainingBattles = baseState.pendingBattles || [];
      let isNextDefense = false;
      
      if (remainingBattles.length === 0 && baseState.pendingDefenses && baseState.pendingDefenses.length > 0) {
          remainingBattles = baseState.pendingDefenses;
          isNextDefense = true;
      }
      
      if (remainingBattles.length > 0) {
        const [nextBattle, ...rest] = remainingBattles;
        
        const atkStrategist = getBestStrategistForBattle(
          nextBattle.attackerStrategist,
          nextBattle.attackingGenerals,
          baseState.generalsData,
          baseState.currentScenario
        );
        const defStrategist = getBestStrategistForBattle(
          nextBattle.defenderStrategist,
          nextBattle.defendingGenerals,
          baseState.generalsData,
          baseState.currentScenario
        );

        return {
          ...baseState,
          activeBattle: {
            isDefense: isNextDefense,
            attackerRuler: nextBattle.attackerRuler,
            defenderRuler: nextBattle.defenderRuler,
            targetProvinceId: nextBattle.targetProvinceId,
            attackerProvinceId: nextBattle.attackerProvinceId,
            attackerReinforceProvinceId: nextBattle.attackerReinforceProvinceId,
            attackingGenerals: nextBattle.attackingGenerals,
            defendingGenerals: nextBattle.defendingGenerals,
            attackerStrategist: atkStrategist,
            defenderStrategist: defStrategist,
            attackerGold: nextBattle.attackerGold,
            attackerFood: nextBattle.attackerFood,
            resourcesDeducted: nextBattle.resourcesDeducted,
            attackerGeneralOrigins: nextBattle.attackerGeneralOrigins,
            defenderPrimaryProvinceId: nextBattle.defenderPrimaryProvinceId,
            defenderReinforceProvinceId: nextBattle.defenderReinforceProvinceId,
            defenderGeneralOrigins: nextBattle.defenderGeneralOrigins,
            defenderResourcesDeducted: nextBattle.defenderResourcesDeducted
          },
          pendingBattles: isNextDefense ? [] : rest,
          pendingDefenses: isNextDefense ? rest : baseState.pendingDefenses,
          pendingBattle: isNextDefense ? null : (rest[0] || null),
          view: 'battle'
        };
      }

      // 所有戰役皆已結算完成
      baseState.activeBattle = null;
      baseState.pendingBattles = [];
      baseState.pendingBattle = null;
      baseState.pendingDefenses = [];
      
      if (isDefense) {
          return {
              ...baseState,
              lastActionResult: baseState.lastActionResult,
              view: 'map'
          };
      } else {
          const nextMonthState = advanceTime(baseState);
          return {
            ...nextMonthState,
            lastActionResult: baseState.lastActionResult,
            view: 'map'
          };
      }
    });
  }, []);

  const handleCaptiveAction = useCallback((generalName: string, action: 'recruit' | 'imprison' | 'release' | 'execute') => {
    let result = { success: false, message: '' };

    setGameState(prev => {
      const captives = prev.pendingCaptives || [];
      const currentCaptive = captives.find(c => c.generalName === generalName);
      if (!currentCaptive) return prev;

      const baseState = { ...prev, generalsData: { ...prev.generalsData } };
      const gen = baseState.generalsData[generalName];
      if (!gen) return prev;

      const playerRulerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g.name === prev.rulerName) || null;
      const playerCha = playerRulerGen?.cha || 80;

      if (action === 'recruit') {
        const evalResult = calculateCaptiveRecruitChance(
          gen,
          prev.rulerName,
          playerRulerGen,
          currentCaptive.defeatedRuler,
          !!(currentCaptive.isFactionEliminated || currentCaptive.isEliminatedRuler),
          !!(currentCaptive.isRulerSelf || currentCaptive.generalName === currentCaptive.defeatedRuler)
        );

        if (Math.random() < evalResult.chance) {
          const initLoyalty = (currentCaptive.isFactionEliminated || currentCaptive.isEliminatedRuler) ? 75 : 65;
          baseState.generalsData[generalName] = {
            ...gen,
            isCaptive: false,
            captiveOfRuler: null,
            provinceId: currentCaptive.capturedInProvinceId,
            loyalty: initLoyalty,
            isWild: false,
            soldiers: 0
          };
          result = { success: true, message: `【招降成功】${gen.name}：${evalResult.surrenderQuote}` };
        } else {
          result = { success: false, message: `【招降失敗】${gen.name}：${evalResult.refusalQuote}` };
          return prev;
        }
      } else if (action === 'imprison') {
        baseState.generalsData[generalName] = {
          ...gen,
          isCaptive: true,
          captiveOfRuler: prev.rulerName,
          originalRulerName: currentCaptive.defeatedRuler,
          capturedInProvinceId: currentCaptive.capturedInProvinceId,
          provinceId: currentCaptive.capturedInProvinceId,
          soldiers: 0
        };
        result = { success: true, message: `【收押天牢】已將 ${gen.name} 押入城池天牢下獄！` };
      } else if (action === 'release') {
        baseState.generalsData[generalName] = {
          ...gen,
          isCaptive: false,
          captiveOfRuler: null,
          originalRulerName: null,
          provinceId: currentCaptive.capturedInProvinceId,
          isWild: true,
          soldiers: 0
        };
        baseState.popularity = Math.min(100, baseState.popularity + 2);
        result = { success: true, message: `【釋放】主公展現寬厚仁德，當場釋放 ${gen.name}！名聲民心微升。` };
      } else if (action === 'execute') {
        const decapRes = handleRulerDecapitation(baseState, generalName, prev.rulerName);
        result = { success: true, message: decapRes.eventMsg || `【處決】主公下令將 ${gen.name} 推出斬首示眾！` };
      }

      const remaining = captives.filter(c => c.generalName !== generalName);
      return {
        ...baseState,
        pendingCaptives: remaining
      };
    });

    return result;
  }, []);

  const handleSelectSuccessor = useCallback((successorName: string) => {
    setGameState(prev => applyPlayerSuccessorChoice(prev, successorName));
  }, []);

  const selectProvince = useCallback((provinceId: number) => {
    setGameState(prev => ({
      ...prev,
      selectedProvinceId: provinceId,
      activeMenu: null
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      selectedProvinceId: null,
      activeMenu: null
    }));
  }, []);
  
  const setActiveMenu = useCallback((menuId: number | null) => {
    setGameState(prev => ({
      ...prev,
      activeMenu: menuId
    }));
  }, []);

  const setView = useCallback((view: GameState['view']) => {
    setGameState(prev => ({
      ...prev,
      view
    }));
  }, []);

  const clearActionResult = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      lastActionResult: null
    }));
  }, []);

  const loadGameState = useCallback((savedState: GameState) => {
    setGameState(savedState);
  }, []);

  const resetGame = useCallback((scenarioIndex: number, rulerName: string) => {
    setGameState(initGame(scenarioIndex, rulerName));
  }, []);

  const clearMonthlyEvents = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      monthlyEvents: []
    }));
  }, []);

  const respondDiplomacyOffer = useCallback((accepted: boolean) => {
    setGameState(prev => {
      const offer = prev.pendingDiplomacyOffer;
      if (!offer) return prev;

      const playerRuler = prev.rulerName;
      const otherRuler = offer.fromRuler;
      const currentAbsoluteMonth = prev.year * 12 + prev.month;

      const updatedAlliances = { ...(prev.alliances || {}) };
      if (!updatedAlliances[playerRuler]) updatedAlliances[playerRuler] = {};
      if (!updatedAlliances[otherRuler]) updatedAlliances[otherRuler] = {};

      const updatedDiplomacy = { ...(prev.diplomacyData || {}) };
      if (!updatedDiplomacy[playerRuler]) updatedDiplomacy[playerRuler] = {};
      if (!updatedDiplomacy[otherRuler]) updatedDiplomacy[otherRuler] = {};

      const updatedProvinces = { ...prev.provincesData };
      const playerCapital = (Object.values(updatedProvinces) as ProvinceState[]).find(p => p.rulerName === playerRuler);

      let resultMsg = '';

      if (accepted) {
        // 接受：建立同盟或停火條約
        const expiryAbsolute = currentAbsoluteMonth + offer.durationMonths;
        updatedAlliances[playerRuler][otherRuler] = expiryAbsolute;
        updatedAlliances[otherRuler][playerRuler] = expiryAbsolute;

        // 友好度提升
        const relBoost = offer.type === 'alliance' ? 18 : 25;
        const currentRel = updatedDiplomacy[playerRuler]?.[otherRuler] ?? 50;
        const newRel = Math.min(100, Math.max(0, currentRel + relBoost));
        updatedDiplomacy[playerRuler][otherRuler] = newRel;
        updatedDiplomacy[otherRuler][playerRuler] = newRel;

        // 收受贈金與贈糧
        if (playerCapital) {
          updatedProvinces[playerCapital.id] = {
            ...playerCapital,
            gold: playerCapital.gold + offer.giftGold,
            food: playerCapital.food + offer.giftFood,
          };
        }

        if (offer.type === 'alliance') {
          resultMsg = `🤝 主公接納了【${otherRuler}】之盟約提議！兩國簽署互保盟約（為期 ${offer.durationMonths} 個月），獲贈黃金 ${offer.giftGold} 兩！兩國友好度提升至 ${newRel}。`;
        } else {
          resultMsg = `📜 主公恩准了【${otherRuler}】之稱臣乞和！收納賠款黃金 ${offer.giftGold} 兩、軍糧 ${offer.giftFood} 石，兩國立約停戰 ${offer.durationMonths} 個月！兩國友好度提升至 ${newRel}。`;
        }
      } else {
        // 拒絕：微降友好度
        const currentRel = updatedDiplomacy[playerRuler]?.[otherRuler] ?? 50;
        const newRel = Math.max(10, currentRel - 5);
        updatedDiplomacy[playerRuler][otherRuler] = newRel;
        updatedDiplomacy[otherRuler][playerRuler] = newRel;

        resultMsg = `❌ 主公斷然拒絕了【${otherRuler}】的外交提案，使者倉皇辭別離去。兩國友好度微降至 ${newRel}。`;
      }

      return {
        ...prev,
        pendingDiplomacyOffer: null,
        provincesData: updatedProvinces,
        alliances: updatedAlliances,
        diplomacyData: updatedDiplomacy,
        lastActionResult: {
          action: '外交交涉',
          success: accepted,
          title: accepted ? (offer.type === 'alliance' ? '兩國締盟大吉' : '准予停戰乞和') : '駁回外邦使者',
          message: resultMsg
        }
      };
    });
  }, []);

  const updateActiveBattleDefense = useCallback((params: {
    defendingGenerals: string[];
    defenderReinforceProvinceId?: number | null;
    defenderGeneralOrigins?: Record<string, number>;
    defenderResourcesDeducted?: Record<number, { gold: number; food: number }>;
  }) => {
    setGameState(prev => {
      if (!prev.activeBattle) return prev;

      const updatedProvinces = { ...prev.provincesData };
      if (params.defenderResourcesDeducted) {
        Object.entries(params.defenderResourcesDeducted).forEach(([pIdStr, res]) => {
          const pId = Number(pIdStr);
          if (updatedProvinces[pId]) {
            updatedProvinces[pId] = {
              ...updatedProvinces[pId],
              gold: Math.max(0, updatedProvinces[pId].gold - res.gold),
              food: Math.max(0, updatedProvinces[pId].food - res.food),
            };
          }
        });
      }

      return {
        ...prev,
        provincesData: updatedProvinces,
        activeBattle: {
          ...prev.activeBattle,
          defendingGenerals: params.defendingGenerals,
          defenderReinforceProvinceId: params.defenderReinforceProvinceId,
          defenderGeneralOrigins: params.defenderGeneralOrigins,
          defenderResourcesDeducted: params.defenderResourcesDeducted,
        }
      };
    });
  }, []);

  return {
    gameState,
    actions: {
      nextTurn: dispatchNextTurn,
      executeCommand: dispatchExecuteCommand,
      resolveBattle,
      handleCaptiveAction,
      handleSelectSuccessor,
      updateActiveBattleDefense,
      selectProvince,
      clearSelection,
      setActiveMenu,
      setView,
      clearActionResult,
      clearMonthlyEvents,
      respondDiplomacyOffer,
      loadGameState,
      resetGame
    }
  };
}
