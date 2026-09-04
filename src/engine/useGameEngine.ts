import { useState, useCallback } from 'react';
import { GameState, ProvinceState, GeneralState, FormationTerrainType } from '../types';
import { provinces } from '../data/provinces';
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

  const resolveBattle = useCallback((
    winner: 'attacker' | 'defender',
    finalResult?: {
      units?: { generalName: string; troops: number }[];
      attackerFood?: number;
      defenderFood?: number;
      attackerGold?: number;
      defenderGold?: number;
    }
  ) => {
    setGameState(prev => {
      const battle = prev.activeBattle;
      if (!battle || !prev.provincesData[battle.targetProvinceId]) {
        return { ...prev, activeBattle: null, pendingBattles: [], pendingDefenses: [], view: 'map' };
      }

      const baseState = { ...prev, provincesData: { ...prev.provincesData }, generalsData: { ...prev.generalsData } };
      const targetProvRaw = baseState.provincesData[battle.targetProvinceId];
      if (!targetProvRaw) {
        return { ...prev, activeBattle: null, pendingBattles: [], pendingDefenses: [], view: 'map' };
      }
      const targetProv = { ...targetProvRaw };
      const primaryAtkCityId = battle.attackerProvinceId;
      const reinforceAtkCityId = battle.attackerReinforceProvinceId;
      const defReinforceCityId = battle.defenderReinforceProvinceId;
      const isDefense = battle.isDefense;

      // 建立戰場結束時各將領的實際殘餘兵力對照表
      const unitTroopsMap: Record<string, number> = {};
      if (finalResult?.units) {
        finalResult.units.forEach(u => {
          if (u.generalName) {
            unitTroopsMap[u.generalName] = Math.max(0, Math.floor(u.troops));
          }
        });
      }

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
        
        // 金糧戰後處理：接管守方城池 60% 金糧 (40% 戰火損耗)
        const oldGold = targetProv.gold;
        const oldFood = targetProv.food;
        const finalDefFood = finalResult?.defenderFood ?? oldFood;
        targetProv.gold = Math.floor(oldGold * 0.6);
        targetProv.food = Math.floor(finalDefFood * 0.6);

        // 攻方隨軍剩餘未消耗軍糧與軍費全部注入新城池
        const finalAtkFood = finalResult?.attackerFood ?? (battle.resourcesDeducted?.[primaryAtkCityId]?.food ?? 0);
        const finalAtkGold = finalResult?.attackerGold ?? (battle.resourcesDeducted?.[primaryAtkCityId]?.gold ?? 0);
        targetProv.food += finalAtkFood;
        targetProv.gold += finalAtkGold;

        // 若有攻方援軍城池隨軍扣款，剩餘物資返還原援軍城池
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (pId !== primaryAtkCityId && baseState.provincesData[pId]) {
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

        // 攻擊方將領進駐新城池，並精準更新戰後真實殘餘兵力
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            const destCity = (originCity === primaryAtkCityId) ? battle.targetProvinceId : (reinforceAtkCityId || originCity);
            const finalTroops = unitTroopsMap[gName] !== undefined ? unitTroopsMap[gName] : gen.soldiers;
            baseState.generalsData[gName] = {
              ...gen,
              provinceId: destCity,
              hasActed: true,
              soldiers: Math.max(0, finalTroops)
            };
          }
        });

        // 檢查敗方是否滅國 (被攻陷後在全地圖是否已無任何城池)
        const remainingDefCities = (Object.values(baseState.provincesData) as ProvinceState[]).filter(p => p && p.id !== battle.targetProvinceId && p.rulerName === defeatedRuler);
        const isEliminated = remainingDefCities.length === 0;
        isFactionEliminated = isEliminated;
        const isIsolated = isCityIsolated(battle.targetProvinceId, defeatedRuler, baseState.provincesData);

        // 處理敵方守將 (與援軍) 的俘虜、逃脫與戰後兵力
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            const finalTroops = unitTroopsMap[gName] !== undefined ? unitTroopsMap[gName] : Math.floor(gen.soldiers * 0.5);

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
                  const winnerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g && g.name === winnerRuler) || null;
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
                // 逃脫退為在野或逃回殘存城池，更新殘兵
                baseState.generalsData[gName] = {
                  ...gen,
                  isWild: isEliminated,
                  provinceId: isEliminated ? null : (remainingDefCities[0]?.id || battle.targetProvinceId),
                  soldiers: Math.max(0, finalTroops),
                  loyalty: Math.max(0, gen.loyalty - 20)
                };
              }
            } else if (defReinforceCityId && defOrigin === defReinforceCityId) {
              // 敵方援軍退回原城池，保留戰後殘兵
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: defReinforceCityId,
                soldiers: Math.max(0, finalTroops)
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
          : `我軍英勇善戰，成功攻破【${targetProv.name}】！大獲全勝並接管該城資糧（隨軍剩餘糧餉全數收歸新城）！`;

        if (isEliminated) {
          victoryMsg += ` 敵方勢力【${defeatedRuler}】就此滅亡！城內將領悉數被俘！`;
        }

        if (battle.isFieldEncounter) {
          baseState.lastActionResult = {
            action: '野戰勝捷',
            title: '⚔️ 野戰大捷：破陣奪城！',
            message: `我軍在邊境野戰中擊潰敵軍主力，隨即乘勝追擊攻克【${targetProv.name}】！`,
            type: 'success'
          };
        } else {
          baseState.lastActionResult = {
            action: isDefense ? '守城失敗' : '攻城勝利',
            title: isDefense ? '💀 城池陷落' : (isEliminated ? '👑 滅國大捷：天下一統之階！' : '🔥 攻城大捷：破城奪地！'),
            message: victoryMsg,
            type: isDefense ? 'failure' : 'success'
          };
        }

      } else {
        // --- 2. 守方勝利 (擊退攻方) ---
        const finalDefFood = finalResult?.defenderFood ?? targetProv.food;
        const finalAtkFood = finalResult?.attackerFood ?? (battle.resourcesDeducted?.[primaryAtkCityId]?.food ?? 0);
        const finalAtkGold = finalResult?.attackerGold ?? (battle.resourcesDeducted?.[primaryAtkCityId]?.gold ?? 0);

        // 繳獲攻方隨軍剩餘攜帶錢糧之 50% 為戰利品，其餘 50% 攜回原城
        const lootedFood = Math.floor(finalAtkFood * 0.5);
        const lootedGold = Math.floor(finalAtkGold * 0.5);

        targetProv.food = finalDefFood + lootedFood;
        targetProv.gold = targetProv.gold + lootedGold;

        // 剩餘 50% 隨軍物資由敗退攻方攜回原城
        if (baseState.provincesData[primaryAtkCityId]) {
          baseState.provincesData[primaryAtkCityId].food += (finalAtkFood - lootedFood);
          baseState.provincesData[primaryAtkCityId].gold += (finalAtkGold - lootedGold);
        }

        // 攻方援軍城池隨軍扣款返還
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (pId !== primaryAtkCityId && baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        // 敗退攻擊方將領更新殘兵與俘虜判定
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            const finalTroops = unitTroopsMap[gName] !== undefined ? unitTroopsMap[gName] : Math.floor(gen.soldiers * 0.4);
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
                const winnerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g && g.name === winnerRuler) || null;
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
                soldiers: Math.max(0, finalTroops),
                hasActed: true
              };
            }
          }
        });

        // 守方將領歸位並保持戰後殘兵
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            const defCity = (defReinforceCityId && defOrigin === defReinforceCityId) ? defReinforceCityId : battle.targetProvinceId;
            const finalTroops = unitTroopsMap[gName] !== undefined ? unitTroopsMap[gName] : gen.soldiers;
            baseState.generalsData[gName] = {
              ...gen,
              provinceId: defCity,
              soldiers: Math.max(0, finalTroops)
            };
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

        if (battle.isFieldEncounter) {
          const counterCityName = baseState.provincesData[primaryAtkCityId]?.name || '敵城';
          if (winnerRuler === prev.rulerName) {
            baseState.lastActionResult = {
              action: '野戰勝捷',
              title: '⚔️ 野戰反擊大捷：破敵奪城！',
              message: `我軍在邊境野戰中殲滅來犯敵軍主力，並乘勝反攻奪取了【${counterCityName}】！`,
              type: 'success'
            };
          } else {
            baseState.lastActionResult = {
              action: '野戰失利',
              title: '⚔️ 野戰失利：敵軍反擊破城！',
              message: `我軍在邊境野戰中不幸潰敗，敵軍乘勝反攻奪取了我方城池【${counterCityName}】...`,
              type: 'failure'
            };
          }
        } else {
          baseState.lastActionResult = {
            action: isDefense ? '守城勝利' : '攻城失敗',
            title: isDefense ? '🛡️ 防守成功：固若金湯！' : '❌ 攻城失利：鳴金收兵',
            message: isDefense 
               ? `我軍將士用命，成功擊退了敵軍進犯並繳獲敵軍 50% 隨軍糧餉！【${targetProv.name}】安然無恙！` 
               : `敵軍防守嚴密，我軍久攻不下，各路兵馬帶領殘部撤回原城...`,
            type: isDefense ? 'success' : 'failure'
          };
        }
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
      
      // 檢查是否還有後續排定之戰役 (Case 1 車輪戰與戰火蔓延動態更新)
      let remainingBattles = baseState.pendingBattles || [];
      let isNextDefense = false;
      
      if (remainingBattles.length === 0 && baseState.pendingDefenses && baseState.pendingDefenses.length > 0) {
          remainingBattles = baseState.pendingDefenses;
          isNextDefense = true;
      }
      
      if (remainingBattles.length > 0) {
        const [nextBattleRaw, ...rest] = remainingBattles;
        let nextBattle = { ...nextBattleRaw };

        // 🔥 Case 1: 車輪戰與戰火蔓延動態更新
        if (nextBattle.targetProvinceId === battle.targetProvinceId) {
          const currentCityOwner = baseState.provincesData[battle.targetProvinceId]?.rulerName || winnerRuler;
          
          // 收集目前位於該城池且存活、未被俘虜的守備將領 (包含剛贏得第一戰之駐將)
          const currentDefGens = (Object.values(baseState.generalsData) as GeneralState[])
            .filter(g => g && g.provinceId === battle.targetProvinceId && g.soldiers > 0 && !g.isWild && !g.isCaptive)
            .map(g => g.name);

          nextBattle.defenderRuler = currentCityOwner;
          if (currentDefGens.length > 0) {
            nextBattle.defendingGenerals = currentDefGens;
          }
          nextBattle.isSequential = true;
          nextBattle.sequentialTag = "🔥【車輪戰/戰火蔓延】";

          if (currentCityOwner === prev.rulerName) {
            nextBattle.isDefense = true;
            isNextDefense = true;
            nextBattle.encounterTitle = `🔥【車輪戰急報】敵軍【${nextBattle.attackerRuler || '敵勢力'}】趁我軍剛攻克城池立足未穩，急襲而來！殘部需就地禦敵！`;
          } else {
            nextBattle.isDefense = false;
            nextBattle.encounterTitle = `🔥【戰火蔓延】城池連環車輪大戰開打！`;
          }
        }
        
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
            defenderResourcesDeducted: nextBattle.defenderResourcesDeducted,
            isSequential: nextBattle.isSequential,
            sequentialTag: nextBattle.sequentialTag,
            isFieldEncounter: nextBattle.isFieldEncounter,
            encounterTitle: nextBattle.encounterTitle
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
            view: nextMonthState.activeBattle ? 'battle' : 'map'
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

      const playerRulerGen = (Object.values(baseState.generalsData) as GeneralState[]).find(g => g && g.name === prev.rulerName) || null;
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

  const triggerTestScenarioCase1 = useCallback(() => {
    setGameState(prev => {
      const allProvinces = Object.values(prev.provincesData) as ProvinceState[];
      const playerProvinces = allProvinces.filter(p => p.rulerName === prev.rulerName);
      const enemyProvinces = allProvinces.filter(p => p.rulerName && p.rulerName !== prev.rulerName);

      const playerProv = playerProvinces[0] || allProvinces[0];
      const targetProv = enemyProvinces[0] || allProvinces[1] || allProvinces[0];
      const thirdProv = enemyProvinces[1] || playerProvinces[1] || targetProv;

      const playerGens = (Object.values(prev.generalsData) as GeneralState[])
        .filter(g => g.provinceId === playerProv.id && g.soldiers > 0 && !g.isWild && !g.isCaptive)
        .map(g => g.name);
      const targetGens = (Object.values(prev.generalsData) as GeneralState[])
        .filter(g => g.provinceId === targetProv.id && g.soldiers > 0 && !g.isWild && !g.isCaptive)
        .map(g => g.name);
      const thirdGens = (Object.values(prev.generalsData) as GeneralState[])
        .filter(g => g.provinceId === thirdProv.id && g.soldiers > 0 && !g.isWild && !g.isCaptive)
        .map(g => g.name);

      const atkGens1 = playerGens.slice(0, 3).length > 0 ? playerGens.slice(0, 3) : ['關羽', '張飛'];
      const defGens1 = targetGens.slice(0, 3).length > 0 ? targetGens.slice(0, 3) : ['夏侯惇', '曹仁'];
      const atkGens2 = thirdGens.slice(0, 3).length > 0 ? thirdGens.slice(0, 3) : ['周瑜', '陸遜'];

      const targetProvName = provinces.find(p => p.id === targetProv.id)?.name || '城池';

      const battle1 = {
        id: 'test_c1_1_' + Date.now(),
        isDefense: false,
        attackerRuler: prev.rulerName,
        defenderRuler: targetProv.rulerName || '敵勢力',
        targetProvinceId: targetProv.id,
        attackerProvinceId: playerProv.id,
        attackingGenerals: atkGens1,
        defendingGenerals: defGens1,
        attackerGold: 100,
        attackerFood: 500,
        resourcesDeducted: {},
        defenderResourcesDeducted: {},
        attackerGeneralOrigins: {},
        defenderGeneralOrigins: {},
        isSequential: true,
        sequentialTag: '🔥【車輪戰/第一波強攻】',
        encounterTitle: `🔥【車輪戰/第一波】我軍進攻【${targetProvName}】！第二波敵軍正同步逼近！`
      };

      const battle2 = {
        id: 'test_c1_2_' + Date.now(),
        isDefense: false,
        attackerRuler: thirdProv.rulerName || '孫權',
        defenderRuler: targetProv.rulerName || '敵勢力',
        targetProvinceId: targetProv.id,
        attackerProvinceId: thirdProv.id,
        attackingGenerals: atkGens2,
        defendingGenerals: defGens1,
        attackerGold: 100,
        attackerFood: 500,
        resourcesDeducted: {},
        defenderResourcesDeducted: {},
        attackerGeneralOrigins: {},
        defenderGeneralOrigins: {},
        isSequential: true,
        sequentialTag: '🔥【車輪戰/第二波連環強攻】'
      };

      return {
        ...prev,
        activeBattle: battle1,
        pendingBattles: [battle2],
        pendingDefenses: []
      };
    });
  }, []);

  const triggerTestScenarioCase2 = useCallback(() => {
    setGameState(prev => {
      const allProvinces = Object.values(prev.provincesData) as ProvinceState[];
      const playerProvinces = allProvinces.filter(p => p.rulerName === prev.rulerName);
      const enemyProvinces = allProvinces.filter(p => p.rulerName && p.rulerName !== prev.rulerName);

      const playerProv = playerProvinces[0] || allProvinces[0];
      const targetProv = enemyProvinces[0] || allProvinces[1] || allProvinces[0];

      const playerGens = (Object.values(prev.generalsData) as GeneralState[])
        .filter(g => g.provinceId === playerProv.id && g.soldiers > 0 && !g.isWild && !g.isCaptive)
        .map(g => g.name);
      const targetGens = (Object.values(prev.generalsData) as GeneralState[])
        .filter(g => g.provinceId === targetProv.id && g.soldiers > 0 && !g.isWild && !g.isCaptive)
        .map(g => g.name);

      const atkGens = playerGens.slice(0, 3).length > 0 ? playerGens.slice(0, 3) : ['趙雲', '黃忠'];
      const defGens = targetGens.slice(0, 3).length > 0 ? targetGens.slice(0, 3) : ['張遼', '徐晃'];

      const targetProvName = provinces.find(p => p.id === targetProv.id)?.name || '城池';

      const fieldBattle = {
        id: 'test_c2_' + Date.now(),
        isDefense: false,
        attackerRuler: prev.rulerName,
        defenderRuler: targetProv.rulerName || '敵勢力',
        targetProvinceId: targetProv.id,
        attackerProvinceId: playerProv.id,
        attackingGenerals: atkGens,
        defendingGenerals: defGens,
        attackerGold: 100,
        attackerFood: 500,
        resourcesDeducted: {},
        defenderResourcesDeducted: {},
        attackerGeneralOrigins: {},
        defenderGeneralOrigins: {},
        isFieldEncounter: true,
        encounterTitle: `⚔️【野戰遭遇戰】我軍進攻【${targetProvName}】途中，與敵軍大軍在邊境狹路相逢！`
      };

      return {
        ...prev,
        activeBattle: fieldBattle,
        pendingBattles: [],
        pendingDefenses: []
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
      triggerTestScenarioCase1,
      triggerTestScenarioCase2,
      loadGameState,
      resetGame
    }
  };
}
