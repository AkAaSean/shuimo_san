import { useState, useCallback } from 'react';
import { GameState } from '../types';
import { initGame, advanceTime, executeCommand } from './gameLogic';

export function useGameEngine(initialScenario: number, initialRuler: string) {
  const [gameState, setGameState] = useState<GameState>(() => initGame(initialScenario, initialRuler));

  const dispatchNextTurn = useCallback(() => {
    setGameState(prev => {
      // 1. 若本月有已排定之戰役，點擊休息後依序進入第一場戰役
      const list = prev.pendingBattles || (prev.pendingBattle ? [prev.pendingBattle] : []);
      if (list.length > 0) {
        const [firstBattle, ...remainingBattles] = list;
        return {
          ...prev,
          activeBattle: {
            targetProvinceId: firstBattle.targetProvinceId,
            attackerProvinceId: firstBattle.attackerProvinceId,
            attackingGenerals: firstBattle.attackingGenerals,
            defendingGenerals: firstBattle.defendingGenerals,
            attackerGold: firstBattle.attackerGold,
            attackerFood: firstBattle.attackerFood,
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
      
      if (winner === 'attacker') {
        targetProv.rulerName = prev.rulerName;
        targetProv.loyalty = Math.max(0, targetProv.loyalty - 20); // War drops loyalty
        targetProv.isAutonomous = false;
        
        // Defending generals become wild
        battle.defendingGenerals.forEach(gName => {
          if (baseState.generalsData[gName]) {
            baseState.generalsData[gName] = { ...baseState.generalsData[gName], isWild: true, loyalty: Math.max(0, baseState.generalsData[gName].loyalty - 30) };
          }
        });
        
        baseState.lastActionResult = {
          action: '攻城勝利',
          title: '🔥 攻城勝利：破城奪地！',
          message: `我軍英勇善戰，成功攻破【${targetProv.name}】！守軍潰散，該城已歸入我軍版圖！`,
          type: 'success'
        };
      } else {
        // Attacking generals suffer troop loss (basic)
        battle.attackingGenerals.forEach(gName => {
          if (baseState.generalsData[gName]) {
            baseState.generalsData[gName] = { ...baseState.generalsData[gName], soldiers: Math.floor(baseState.generalsData[gName].soldiers * 0.3) };
          }
        });
        
        baseState.lastActionResult = {
          action: '攻城失敗',
          title: '❌ 攻城失敗：鎩羽而歸',
          message: `敵軍防守嚴密，我軍久攻不下，只好鳴金收兵...【${targetProv.name}】攻城失敗。`,
          type: 'failure'
        };
      }

      baseState.provincesData[targetProv.id] = targetProv;
      
      // 檢查是否還有後續排定之戰役
      const remainingBattles = baseState.pendingBattles || [];
      if (remainingBattles.length > 0) {
        const [nextBattle, ...rest] = remainingBattles;
        return {
          ...baseState,
          activeBattle: {
            targetProvinceId: nextBattle.targetProvinceId,
            attackerProvinceId: nextBattle.attackerProvinceId,
            attackingGenerals: nextBattle.attackingGenerals,
            defendingGenerals: nextBattle.defendingGenerals,
            attackerGold: nextBattle.attackerGold,
            attackerFood: nextBattle.attackerFood,
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
