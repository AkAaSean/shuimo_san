import React, { useState, useEffect, useMemo } from 'react';
import { GameState, BattleState } from '../types';
import { generateBattleGrid } from '../utils/terrainGenerator';
import BattleHeader from './BattleHeader';
import BattleCards from './BattleCards';
import BattleGrid from './BattleGrid';
import BattleCommandMenu from './BattleCommandMenu';
import BattlePromptBanner from './BattlePromptBanner';
import StrategySheet from './StrategySheet';

interface BattleViewProps {
  gameState: GameState;
  onExitBattle: () => void;
}

export default function BattleView({ gameState, onExitBattle }: BattleViewProps) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);

  useEffect(() => {
    // Initialize battle state
    const targetProvinceId = gameState.selectedProvinceId || 1;
    const grid = generateBattleGrid(targetProvinceId);
    
    // Create some dummy units for demonstration
    const units = [
      { id: 'u1', generalName: '王允', isAttacker: true, troops: 300, col: 2, row: 2, isCommander: true },
      { id: 'u2', generalName: '陳紀', isAttacker: true, troops: 150, col: 2, row: 3, isCommander: false },
      { id: 'u3', generalName: '趙雲', isAttacker: false, troops: 800, col: 5, row: 8, isCommander: true },
      { id: 'u4', generalName: '兵士', isAttacker: false, troops: 400, col: 6, row: 7, isCommander: false },
    ];

    setBattleState({
      provinceId: targetProvinceId,
      weather: '晴天',
      windDirection: '東風',
      time: '建安十四年七月秋 6日卯時',
      attacker: { commander: '王允', gold: 0, food: 98 },
      defender: { commander: '趙雲', gold: 61, food: 0 },
      grid,
      units,
      activeUnitId: 'u1',
      animatingStrategy: null,
    });
  }, [gameState.selectedProvinceId]);

  if (!battleState) return null;

  const handleCommandSelect = (cmdId: number) => {
    if (cmdId === 8) { // Retreat
      onExitBattle();
    } else if (cmdId === 6) { // Strategy
      setStrategyOpen(true);
    }
  };

  const handleSelectUnit = (unitId: string) => {
    setBattleState(prev => prev ? { ...prev, activeUnitId: unitId } : null);
  };

  const handleSelectCell = (col: number, row: number) => {
    // Basic move logic for demonstration
    if (battleState.activeUnitId) {
      setBattleState(prev => {
        if (!prev) return prev;
        const newUnits = prev.units.map(u => 
          u.id === prev.activeUnitId ? { ...u, col, row } : u
        );
        return { ...prev, units: newUnits };
      });
    }
  };

  const handleApplyStrategy = (strategy: string) => {
    // Mock strategy animation
    setBattleState(prev => {
      if (!prev) return prev;
      // Animate at the center of the active unit (or random if not selected)
      const activeUnit = prev.units.find(u => u.id === prev.activeUnitId) || prev.units[0];
      return {
        ...prev,
        animatingStrategy: { type: strategy, col: activeUnit.col, row: activeUnit.row }
      };
    });

    // Clear animation after 1s
    setTimeout(() => {
      setBattleState(prev => prev ? { ...prev, animatingStrategy: null } : null);
    }, 1000);
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-stone-200 overflow-hidden">
      <BattleHeader state={battleState} />
      <BattleCards state={battleState} />
      
      <BattleGrid 
        state={battleState} 
        onSelectUnit={handleSelectUnit} 
        onSelectCell={handleSelectCell} 
      />
      
      <BattlePromptBanner state={battleState} />
      
      <BattleCommandMenu onCommandSelect={handleCommandSelect} />
      
      <StrategySheet 
        isOpen={strategyOpen} 
        onClose={() => setStrategyOpen(false)} 
        onSelectStrategy={handleApplyStrategy} 
      />
    </div>
  );
}
