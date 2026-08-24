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

  return {
    gameState,
    actions: {
      nextTurn: dispatchNextTurn,
      executeCommand: dispatchExecuteCommand,
      selectProvince,
      clearSelection,
      setActiveMenu,
      setView,
      clearActionResult,
      loadGameState,
      resetGame
    }
  };
}
