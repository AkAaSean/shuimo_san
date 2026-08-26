import { useState, useCallback } from 'react';
import { GameState } from '../types';
import { initGame, advanceTime, executeCommand } from './gameLogic';

export function useGameEngine(initialScenario: number, initialRuler: string) {
  const [gameState, setGameState] = useState<GameState>(() => initGame(initialScenario, initialRuler));

  const dispatchNextTurn = useCallback(() => {
    setGameState(prev => advanceTime(prev));
  }, []);

  const dispatchExecuteCommand = useCallback((provinceId: number, category: string, action: string, generalName?: string, payload?: any) => {
    setGameState(prev => executeCommand(prev, provinceId, category, action, generalName, payload));
  }, []);

  const resolveBattle = useCallback((winner: 'attacker' | 'defender') => {
    setGameState(prev => {
      const battle = prev.activeBattle;
      if (!battle) return { ...prev, view: 'map' };

      const newState = { ...prev, provincesData: { ...prev.provincesData }, generalsData: { ...prev.generalsData } };
      const targetProv = { ...newState.provincesData[battle.targetProvinceId] };
      
      if (winner === 'attacker') {
        targetProv.rulerName = prev.rulerName;
        targetProv.loyalty = Math.max(0, targetProv.loyalty - 20); // War drops loyalty
        targetProv.isAutonomous = false;
        
        // Defending generals become wild
        battle.defendingGenerals.forEach(gName => {
          if (newState.generalsData[gName]) {
            newState.generalsData[gName] = { ...newState.generalsData[gName], isWild: true, loyalty: Math.max(0, newState.generalsData[gName].loyalty - 30) };
          }
        });
        
        newState.lastActionResult = {
          action: '攻城勝利',
          title: '🔥 攻城勝利：破城奪地！',
          message: `我軍英勇善戰，成功攻破【${targetProv.name}】！守軍潰散，該城已歸入我軍版圖！`,
          type: 'success'
        };
      } else {
        // Attacking generals suffer troop loss (basic)
        battle.attackingGenerals.forEach(gName => {
          if (newState.generalsData[gName]) {
            newState.generalsData[gName] = { ...newState.generalsData[gName], soldiers: Math.floor(newState.generalsData[gName].soldiers * 0.3) };
          }
        });
        
        newState.lastActionResult = {
          action: '攻城失敗',
          title: '❌ 攻城失敗：鎩羽而歸',
          message: `敵軍防守嚴密，我軍久攻不下，只好鳴金收兵...【${targetProv.name}】攻城失敗。`,
          type: 'failure'
        };
      }

      newState.provincesData[targetProv.id] = targetProv;
      newState.activeBattle = null;
      newState.view = 'map';
      return newState;
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
