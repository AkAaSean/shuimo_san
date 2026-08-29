import { useState, useCallback } from 'react';
import { GameState, FormationTerrainType } from '../types';
import { initGame, advanceTime, executeCommand } from './gameLogic';
import { calculateFormationTerrainCombatModifier } from './formations';

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

export function useGameEngine(initialScenario: number, initialRuler: string) {
  const [gameState, setGameState] = useState<GameState>(() => initGame(initialScenario, initialRuler));

  const dispatchNextTurn = useCallback(() => {
    setGameState(prev => {
      // 1. 若本月有已排定之戰役，點擊休息後依序進入第一場戰役
      const list = prev.pendingBattles || (prev.pendingBattle ? [prev.pendingBattle] : []);
      if (list.length > 0) {
        const [firstBattle, ...remainingBattles] = list;
        
        // Auto-assign defender strategist if possible (highest INT > 80)
        let defStrategist = firstBattle.defenderStrategist;
        if (!defStrategist && firstBattle.defendingGenerals.length > 0) {
          const possibleStrategists = firstBattle.defendingGenerals
            .map(g => prev.generalsData[g])
            .filter(g => g && g.int >= 80)
            .sort((a, b) => b.int - a.int);
          if (possibleStrategists.length > 0) defStrategist = possibleStrategists[0].name;
        }

        return {
          ...prev,
          activeBattle: {
            targetProvinceId: firstBattle.targetProvinceId,
            attackerProvinceId: firstBattle.attackerProvinceId,
            attackerReinforceProvinceId: firstBattle.attackerReinforceProvinceId,
            attackingGenerals: firstBattle.attackingGenerals,
            defendingGenerals: firstBattle.defendingGenerals,
            attackerStrategist: firstBattle.attackerStrategist,
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
      return advanceTime(prev);
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
      
      if (winner === 'attacker') {
        // --- 攻擊方勝利 (點 8) ---
        targetProv.rulerName = prev.rulerName;
        targetProv.loyalty = Math.max(0, targetProv.loyalty - 15);
        targetProv.isAutonomous = false;

        // 8.1 發起進攻城池的武將自動移入戰勝的城池
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            if (originCity === primaryAtkCityId) {
              // 主城武將移入新佔領城池
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: battle.targetProvinceId,
                hasActed: true
              };
            } else if (reinforceAtkCityId && originCity === reinforceAtkCityId) {
              // 8.2 援軍城池武將回到原城池
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: reinforceAtkCityId,
                hasActed: true
              };
            }
          }
        });

        // 8.3 資源轉移：發起進攻城池攜帶的錢糧移入新城池，援軍城池攜帶的錢糧返還原城池
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (pId === primaryAtkCityId) {
              // 主城隨軍剩餘錢糧注入戰勝之城池
              targetProv.gold += res.gold;
              targetProv.food += res.food;
            } else if (baseState.provincesData[pId]) {
              // 援軍城池隨軍錢糧返還原城
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        // 8.4 敵方防守武將處理：守城武將潰散/在野；敵方援軍武將若有生還則退回原城池
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            if (defOrigin === battle.targetProvinceId) {
              // 守城本陣武將在野
              baseState.generalsData[gName] = {
                ...gen,
                isWild: true,
                loyalty: Math.max(0, gen.loyalty - 30)
              };
            } else if (defReinforceCityId && defOrigin === defReinforceCityId) {
              // 敵方援軍退回其原城池
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: defReinforceCityId,
                soldiers: Math.floor(gen.soldiers * 0.5) // 折損半數兵馬
              };
            }
          }
        });

        // 敵方援軍隨軍剩餘物資退回原城池
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
          action: '攻城勝利',
          title: '🔥 攻城大捷：破城奪地！',
          message: `我軍英勇善戰，成功攻破【${targetProv.name}】！主攻部隊已進駐接管該城，援軍亦已班師回朝！`,
          type: 'success'
        };
      } else {
        // --- 守方勝利 / 攻城失敗 (點 9) ---
        // 9.1 攻擊方各將領返回各自出征的原城池
        battle.attackingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const originCity = battle.attackerGeneralOrigins?.[gName] ?? primaryAtkCityId;
            baseState.generalsData[gName] = {
              ...gen,
              provinceId: originCity,
              soldiers: Math.floor(gen.soldiers * 0.4), // 折損兵力
              hasActed: true
            };
          }
        });

        // 攻擊方各城扣除之隨軍錢糧返還原城池
        if (battle.resourcesDeducted) {
          Object.entries(battle.resourcesDeducted).forEach(([pIdStr, resVal]) => {
            const res = resVal as { gold: number; food: number };
            const pId = Number(pIdStr);
            if (baseState.provincesData[pId]) {
              baseState.provincesData[pId].gold += res.gold;
              baseState.provincesData[pId].food += res.food;
            }
          });
        }

        // 9.2 敵方勝利：敵方援軍回到原城池 (包括攜帶的金錢糧食)
        battle.defendingGenerals.forEach(gName => {
          const gen = baseState.generalsData[gName];
          if (gen) {
            const defOrigin = battle.defenderGeneralOrigins?.[gName] ?? battle.targetProvinceId;
            if (defReinforceCityId && defOrigin === defReinforceCityId) {
              baseState.generalsData[gName] = {
                ...gen,
                provinceId: defReinforceCityId
              };
            }
          }
        });

        // 敵方援軍城池返還隨軍錢糧
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
          action: '攻城失敗',
          title: '❌ 攻城失利：鳴金收兵',
          message: `敵軍防守嚴密，我軍久攻不下，各路兵馬只好撤回原城休整...【${targetProv.name}】攻城失敗。`,
          type: 'failure'
        };
      }

      baseState.provincesData[targetProv.id] = targetProv;
      
      // 檢查是否還有後續排定之戰役
      const remainingBattles = baseState.pendingBattles || [];
      if (remainingBattles.length > 0) {
        const [nextBattle, ...rest] = remainingBattles;
        
        let defStrategist = nextBattle.defenderStrategist;
        if (!defStrategist && nextBattle.defendingGenerals.length > 0) {
          const possibleStrategists = nextBattle.defendingGenerals
            .map(g => baseState.generalsData[g])
            .filter(g => g && g.int >= 80)
            .sort((a, b) => b.int - a.int);
          if (possibleStrategists.length > 0) defStrategist = possibleStrategists[0].name;
        }

        return {
          ...baseState,
          activeBattle: {
            targetProvinceId: nextBattle.targetProvinceId,
            attackerProvinceId: nextBattle.attackerProvinceId,
            attackerReinforceProvinceId: nextBattle.attackerReinforceProvinceId,
            attackingGenerals: nextBattle.attackingGenerals,
            defendingGenerals: nextBattle.defendingGenerals,
            attackerStrategist: nextBattle.attackerStrategist,
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
          pendingBattles: rest,
          pendingBattle: rest[0] || null,
          view: 'battle'
        };
      }

      // 所有戰役皆已結算完成，推進時光至新月份，並恢復將領行動力
      baseState.activeBattle = null;
      baseState.pendingBattles = [];
      baseState.pendingBattle = null;
      
      const nextMonthState = advanceTime(baseState);
      return {
        ...nextMonthState,
        lastActionResult: baseState.lastActionResult, // 保留攻城戰報結果
        view: 'map'
      };
    });
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

  return {
    gameState,
    actions: {
      nextTurn: dispatchNextTurn,
      executeCommand: dispatchExecuteCommand,
      resolveBattle,
      selectProvince,
      clearSelection,
      setActiveMenu,
      setView,
      clearActionResult,
      clearMonthlyEvents,
      loadGameState,
      resetGame
    }
  };
}
