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
  onResolveBattle: (winner: 'attacker' | 'defender') => void;
}

export default function BattleView({ gameState, onExitBattle, onResolveBattle }: BattleViewProps) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);

  useEffect(() => {
    // Initialize battle state from actual activeBattle
    const battle = gameState.activeBattle;
    if (!battle) return;

    const targetProvinceId = battle.targetProvinceId;
    const grid = generateBattleGrid(targetProvinceId);
    
    // Create units from activeBattle data
    const units: any[] = [];
    
    // Attacking Units
    let aRow = 1;
    let aCol = 2;
    battle.attackingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        units.push({
          id: `a_${idx}`,
          generalName: gName,
          isAttacker: true,
          troops: gen.soldiers,
          col: aCol,
          row: aRow,
          isCommander: idx === 0
        });
        aCol += 2;
        if (aCol > 8) { aCol = 2; aRow += 2; }
      }
    });

    // Defending Units
    let dRow = 9;
    let dCol = 2;
    battle.defendingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        units.push({
          id: `d_${idx}`,
          generalName: gName,
          isAttacker: false,
          troops: gen.soldiers,
          col: dCol,
          row: dRow,
          isCommander: idx === 0
        });
        dCol += 2;
        if (dCol > 8) { dCol = 2; dRow -= 2; }
      }
    });

    // If no defenders, add a dummy guard
    if (battle.defendingGenerals.length === 0) {
       units.push({ id: 'd_0', generalName: '守備兵', isAttacker: false, troops: 500, col: 5, row: 9, isCommander: true });
    }

    setBattleState({
      provinceId: targetProvinceId,
      weather: '晴天',
      windDirection: '東風',
      time: `${gameState.year}年${gameState.month}月 ${gameState.season}`,
      attacker: { commander: battle.attackingGenerals[0] || '無名', gold: 0, food: 100 },
      defender: { commander: battle.defendingGenerals[0] || '守備兵', gold: 100, food: 100 },
      grid,
      units,
      activeUnitId: units[0]?.id || null,
      animatingStrategy: null,
    });
  }, [gameState.activeBattle, gameState.year, gameState.month, gameState.season, gameState.generalsData]);

  if (!battleState) return null;

  const handleCommandSelect = (cmdId: number) => {
    if (cmdId === 8) { // Retreat
      onResolveBattle('defender'); // Retiring means defender wins
    } else if (cmdId === 3) { // 快戰 Auto-Battle
      // Auto resolve calculation
      const battle = gameState.activeBattle;
      if (!battle) return;

      let atkScore = 0;
      let defScore = battle.defendingGenerals.length === 0 ? 500 : 0; // base defense if empty

      battle.attackingGenerals.forEach(g => {
        const gen = gameState.generalsData[g];
        if (gen) atkScore += gen.str * 10 + gen.int * 5 + gen.soldiers;
      });

      battle.defendingGenerals.forEach(g => {
        const gen = gameState.generalsData[g];
        if (gen) defScore += gen.str * 10 + gen.int * 5 + gen.soldiers;
      });

      // Give attacker slight advantage for "快戰" or roll dice
      const roll = Math.random() * 0.4 + 0.8; // 0.8 ~ 1.2
      if (atkScore * roll > defScore) {
        onResolveBattle('attacker');
      } else {
        onResolveBattle('defender');
      }
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
