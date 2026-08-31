import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, BattleState, BattleUnit, TerrainType, DamagePopup, CombatLogEntry, GeneralState, GridCell } from '../types';
import { generateBattleGrid } from '../utils/terrainGenerator';
import { getGeneralAvailableSkills, getGeneralPassives } from '../engine/skills';
import { provinces } from '../data/provinces';
import { getTerrainMobilityCost } from '../engine/formations';
import {
  calculateMeleeCombat,
  calculateArcheryCombat,
  calculateStrategyExecution,
  processTurnStartPassives,
  hasPassiveSkill,
  getHexDistance,
  getUnitFormationStats,
  calculateValidMovementRange,
  PASSIVE_SKILL_REGISTRY
} from '../engine/battleCalculations';
import BattleHeader from './BattleHeader';
import BattleCards from './BattleCards';
import BattleGrid from './BattleGrid';
import BattleCommandMenu from './BattleCommandMenu';
import BattlePromptBanner from './BattlePromptBanner';
import StrategySheet from './StrategySheet';
import FormationSelectionView from './FormationSelectionView';
import BattleFormationModal from './BattleFormationModal';
import { Shield, Sparkles, Swords, Zap, X, Info } from 'lucide-react';

interface BattleViewProps {
  gameState: GameState;
  onExitBattle: () => void;
  onResolveBattle: (winner: 'attacker' | 'defender') => void;
}

export default function BattleView({ gameState, onExitBattle, onResolveBattle }: BattleViewProps) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [formationModalOpen, setFormationModalOpen] = useState(false);
  const [formationSelectionComplete, setFormationSelectionComplete] = useState(false);
  const [targetingMode, setTargetingMode] = useState<'move' | 'melee' | 'deadly' | 'archery' | 'strategy' | 'joint' | 'assault' | 'firearrow' | 'duel' | null>(null);
  const [pendingStrategy, setPendingStrategy] = useState<string | null>(null);
  const [inspectUnitModal, setInspectUnitModal] = useState<BattleUnit | null>(null);
  const [customPromptMessage, setCustomPromptMessage] = useState<string | null>(null);

  const isPlayerAttacker = gameState.activeBattle?.attackerRuler === gameState.rulerName;

  // 初始化戰場環境與雙方部隊
  useEffect(() => {
    const battle = gameState.activeBattle;
    if (!battle) return;

    setFormationSelectionComplete(false);

    const targetProvinceId = battle.targetProvinceId;
    const grid = generateBattleGrid(targetProvinceId);
    
    // 計算戰場地圖尺寸
    let cols = 12;
    let rows = 12;
    grid.forEach(c => {
      if (c.col + 1 > cols) cols = c.col + 1;
      if (c.row + 1 > rows) rows = c.row + 1;
    });

    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);

    const occupiedSet = new Set<string>();
    const cellMap = new Map<string, GridCell>();
    grid.forEach(c => cellMap.set(`${c.col},${c.row}`, c));

    // 尋找目標點周圍最佳可用（未佔用且可通行）座標
    const findAvailableCellNear = (idealC: number, idealR: number, isAttacker: boolean): { col: number; row: number } => {
      let bestCell = { col: idealC, row: idealR };
      let minScore = Infinity;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const key = `${c},${r}`;
          if (occupiedSet.has(key)) continue;

          const cell = cellMap.get(key);
          const dist = Math.abs(c - idealC) + Math.abs(r - idealR);

          let terrainPenalty = 0;
          if (cell) {
            if (cell.terrain === '城池' && isAttacker) terrainPenalty += 20; // 攻軍避開城牆內部出生
            if (cell.terrain === '山嶽' || cell.terrain === '深水') terrainPenalty += 8;
          }

          const score = dist * 2 + terrainPenalty;
          if (score < minScore) {
            minScore = score;
            bestCell = { col: c, row: r };
          }
        }
      }

      const chosenKey = `${bestCell.col},${bestCell.row}`;
      const chosenCell = cellMap.get(chosenKey);
      if (chosenCell && (chosenCell.terrain === '山嶽' || chosenCell.terrain === '深水')) {
        chosenCell.terrain = '平地';
      }

      occupiedSet.add(chosenKey);
      return bestCell;
    };

    const units: BattleUnit[] = [];

    // 1. 守方參戰將領部隊：優先配置在城池 (City hexes) 中，若擠滿則依序向周圍擴展
    const cityCells = grid
      .filter(c => c.terrain === '城池')
      .sort((a, b) => (Math.abs(a.col - centerCol) + Math.abs(a.row - centerRow)) - (Math.abs(b.col - centerCol) + Math.abs(b.row - centerRow)));

    const findDefenderCityCell = (): { col: number; row: number } => {
      for (const cCell of cityCells) {
        const key = `${cCell.col},${cCell.row}`;
        if (!occupiedSet.has(key)) {
          occupiedSet.add(key);
          return { col: cCell.col, row: cCell.row };
        }
      }
      return findAvailableCellNear(centerCol, centerRow, false);
    };

    battle.defendingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        const pos = findDefenderCityCell();
        units.push({
          id: `d_${idx}`,
          generalName: gName,
          isAttacker: false,
          troops: gen.soldiers,
          col: pos.col,
          row: pos.row,
          isCommander: idx === 0,
          formation: gen.formations && gen.formations.length > 0 ? gen.formations[0] : '方圓',
          skills: gen.skills || getGeneralAvailableSkills(gen),
          passives: gen.passives || getGeneralPassives(gen),
          stamina: 100,
          status: 'normal',
          hasActed: false
        });
      }
    });

    // 守備備援部隊 (若無守將)
    if (battle.defendingGenerals.length === 0) {
      const pos = findDefenderCityCell();
      units.push({
        id: 'd_0',
        generalName: '守備將軍',
        isAttacker: false,
        troops: 1000,
        col: pos.col,
        row: pos.row,
        isCommander: true,
        formation: '方圓',
        skills: ['沉著', '鼓舞', '收拾'],
        passives: ['沉著'],
        stamina: 100,
        status: 'normal',
        hasActed: false
      });
    }

    // 2. 攻方參戰將領部隊：依據各將領出發地城市相對於目標城市的幾何方向，配置在對應方向的地圖邊界
    const targetProvObj = provinces.find(p => p.id === targetProvinceId);

    battle.attackingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        const originProvId = gen.provinceId !== null ? gen.provinceId : battle.attackerProvinceId;
        const originProvObj = provinces.find(p => p.id === originProvId);

        let dx = -1;
        let dy = 0;
        if (originProvObj && targetProvObj) {
          dx = originProvObj.x - targetProvObj.x;
          dy = originProvObj.y - targetProvObj.y;
        }

        if (dx === 0 && dy === 0) {
          dx = -1;
          dy = 0;
        }

        // 依據相對向量 (dx, dy)，由戰場中心點做邊界投射
        const len = Math.hypot(dx, dy) || 1;
        const ndx = dx / len;
        const ndy = dy / len;

        const tX = ndx > 0 ? (cols - 1 - centerCol) / ndx : (ndx < 0 ? (0 - centerCol) / ndx : Infinity);
        const tY = ndy > 0 ? (rows - 1 - centerRow) / ndy : (ndy < 0 ? (0 - centerRow) / ndy : Infinity);
        const t = Math.min(tX, tY);

        let spawnCol = Math.round(centerCol + t * ndx);
        let spawnRow = Math.round(centerRow + t * ndy);

        spawnCol = Math.max(0, Math.min(cols - 1, spawnCol));
        spawnRow = Math.max(0, Math.min(rows - 1, spawnRow));

        // 尋找邊界 Spawn 入口點附近的最佳空位
        const pos = findAvailableCellNear(spawnCol, spawnRow, true);

        units.push({
          id: `a_${idx}`,
          generalName: gName,
          isAttacker: true,
          troops: gen.soldiers,
          col: pos.col,
          row: pos.row,
          isCommander: idx === 0,
          formation: gen.formations && gen.formations.length > 0 ? gen.formations[0] : '魚鱗',
          skills: gen.skills || getGeneralAvailableSkills(gen),
          passives: gen.passives || getGeneralPassives(gen),
          stamina: 100,
          status: 'normal',
          hasActed: false
        });
      }
    });

    const provObj = provinces.find(p => p.id === targetProvinceId);
    const initialLogs: CombatLogEntry[] = [
      { id: 'log_0', text: `⚔️ 大戰揭幕！${battle.attackingGenerals[0] || '我軍'} 揮師進擊【${provObj?.name || '邊城'}】！`, type: 'info', timestamp: Date.now() }
    ];

    setBattleState({
      provinceId: targetProvinceId,
      weather: '晴天',
      windDirection: '東風',
      time: `${gameState.year}年${gameState.month}月 ${gameState.season}`,
      attacker: { 
        commander: battle.attackingGenerals[0] || '無名', 
        strategist: battle.attackerStrategist,
        gold: battle.attackerGold || 0, 
        food: battle.attackerFood || 0 
      },
      defender: { 
        commander: battle.defendingGenerals[0] || '守備軍', 
        strategist: battle.defenderStrategist,
        gold: 100, 
        food: 100 
      },
      grid,
      units,
      activeUnitId: units[0]?.id || null,
      currentDay: 1,
      maxDays: [1, 3, 5, 7, 8, 10, 12].includes(gameState.month) ? 30 : (gameState.month === 2 ? 28 : 29),
      animatingStrategy: null,
      battleLogs: initialLogs,
      damagePopups: []
    });
  }, [gameState.activeBattle, gameState.year, gameState.month, gameState.season, gameState.generalsData, gameState.provincesData]);

  // 新增戰鬥漂浮文字
  const addDamagePopup = useCallback((col: number, row: number, text: string, color: DamagePopup['color'] = 'red') => {
    const popupId = `popup_${Date.now()}_${Math.random()}`;
    setBattleState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        damagePopups: [...(prev.damagePopups || []), { id: popupId, col, row, text, color }]
      };
    });

    setTimeout(() => {
      setBattleState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          damagePopups: (prev.damagePopups || []).filter(p => p.id !== popupId)
        };
      });
    }, 1400);
  }, []);

  // 新增戰鬥戰報記錄
  const addBattleLogs = useCallback((newLogs: string[], type: CombatLogEntry['type'] = 'attack') => {
    const entries: CombatLogEntry[] = newLogs.map((text, idx) => ({
      id: `log_${Date.now()}_${idx}`,
      text,
      type,
      timestamp: Date.now()
    }));

    setBattleState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        battleLogs: [...(prev.battleLogs || []), ...entries]
      };
    });
  }, []);

  // 取得當前行動中的部隊
  const activeUnit = useMemo(() => {
    if (!battleState) return null;
    return battleState.units.find(u => u.id === battleState.activeUnitId && u.troops > 0) || battleState.units.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0) || null;
  }, [battleState]);

  // 計算有效目標格子 (針對不同戰術命令)
  const validTargetCells = useMemo(() => {
    if (!battleState || !activeUnit || !targetingMode) return [];
    
    if (targetingMode === 'move') {
      const maxCols = Math.max(0, ...battleState.grid.map(c => c.col)) + 1;
      const maxRows = Math.max(0, ...battleState.grid.map(c => c.row)) + 1;
      return calculateValidMovementRange(activeUnit, battleState.units, battleState.grid, maxCols, maxRows);
    }

    if (targetingMode === 'melee' || targetingMode === 'deadly' || targetingMode === 'joint' || targetingMode === 'assault' || targetingMode === 'duel') {
      // 相鄰 1 格內的敵方部隊格子
      return battleState.units
        .filter(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= 1)
        .map(u => ({ col: u.col, row: u.row }));
    }

    if (targetingMode === 'archery' || targetingMode === 'firearrow') {
      const activeGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60, int: 60 };
      const hasMountedArchery = hasPassiveSkill(activeUnit, activeGen as GeneralState, '騎射');
      
      const currentCell = battleState.grid.find(c => c.col === activeUnit.col && c.row === activeUnit.row);
      const isHighGround = currentCell && (currentCell.terrain === '城池' || currentCell.terrain === '關寨' || currentCell.terrain === '太守府');
      const maxRange = (hasMountedArchery ? 1 : 0) + (getUnitFormationStats(activeUnit.formation).range || 2) + (isHighGround ? 1 : 0);

      // 距離 1 ~ maxRange 內的敵軍
      return battleState.units
        .filter(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0)
        .filter(u => {
          const dist = getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row);
          return dist >= 1 && dist <= maxRange;
        })
        .map(u => ({ col: u.col, row: u.row }));
    }

    if (targetingMode === 'strategy') {
      // 策略目標：全場敵軍
      return battleState.units
        .filter(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0)
        .map(u => ({ col: u.col, row: u.row }));
    }

    return [];
  }, [battleState, activeUnit, targetingMode, gameState.generalsData]);

  // 檢查勝負條件
  const checkBattleEnd = useCallback((units: BattleUnit[]) => {
    if (!battleState) return false;

    // 檢查攻方是否成功攻佔守方「太守府」(HQ Core Victory Condition - Option A)
    const palaceCells = battleState.grid.filter(c => c.terrain === '太守府');
    const attackerInPalace = units.find(u => u.isAttacker && u.troops > 0 && palaceCells.some(p => p.col === u.col && p.row === u.row));

    if (attackerInPalace) {
      addBattleLogs([`👑 【太守府陷落】攻方大軍突破重圍，直取並攻佔太守府大本營！守軍全線潰敗，攻方大獲全勝！`], 'critical');
      setTimeout(() => onResolveBattle('attacker'), 1500);
      return true;
    }

    const attackersAlive = units.filter(u => u.isAttacker && u.troops > 0);
    const defendersAlive = units.filter(u => !u.isAttacker && u.troops > 0);

    if (defendersAlive.length === 0) {
      addBattleLogs([isPlayerAttacker ? '🎉 敵軍全線崩潰，我軍大獲全勝，奪取城池！' : '💀 我方守軍全軍覆沒，城池失守！'], 'critical');
      setTimeout(() => onResolveBattle('attacker'), 1500);
      return true;
    }

    if (attackersAlive.length === 0) {
      addBattleLogs([isPlayerAttacker ? '💀 我方攻城部隊全軍覆沒，無功而返！' : '🛡️ 敵軍傷亡慘重，我軍成功守住城池！'], 'critical');
      setTimeout(() => onResolveBattle('defender'), 1500);
      return true;
    }

    return false;
  }, [battleState, addBattleLogs, onResolveBattle]);

  // 執行近戰或死戰
  const executeMeleeAttack = useCallback((targetUnit: BattleUnit, isDeadly: boolean = false) => {
    if (!battleState || !activeUnit) return;

    const attackerGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60, int: 60, pol: 50, cha: 60, name: activeUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: activeUnit.troops, training: 80, hasActed: false };
    const defenderGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60, int: 60, pol: 50, cha: 60, name: targetUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: targetUnit.troops, training: 80, hasActed: false };

    const targetCell = battleState.grid.find(c => c.col === targetUnit.col && c.row === targetUnit.row);
    const terrain = targetCell ? targetCell.terrain : '平地';

    const result = calculateMeleeCombat(
      activeUnit,
      targetUnit,
      attackerGen,
      defenderGen,
      battleState.units,
      isDeadly,
      terrain
    );

    // 漂浮傷害與被動特技觸發展示
    addDamagePopup(targetUnit.col, targetUnit.row, `-${result.attackerDamage}`, 'red');
    if (result.defenderCounterDamage > 0) {
      addDamagePopup(activeUnit.col, activeUnit.row, `-${result.defenderCounterDamage}`, 'yellow');
    }

    result.passivesTriggered.forEach(p => {
      const u = p.actor === 'attacker' ? activeUnit : targetUnit;
      const color: DamagePopup['color'] = p.skillId === '無雙' ? 'amber' : p.skillId === '奮發' ? 'yellow' : 'green';
      addDamagePopup(u.col, u.row, `【${p.skillId}】`, color);
    });

    addBattleLogs(result.combatLogs, isDeadly ? 'critical' : 'attack');

    // 更新部隊兵力與狀態
    const updatedUnits = battleState.units.map(u => {
      if (u.id === activeUnit.id) {
        const newTroops = Math.max(0, u.troops - result.defenderCounterDamage);
        return { ...u, troops: newTroops, hasActed: true };
      }
      if (u.id === targetUnit.id) {
        const newTroops = Math.max(0, u.troops - result.attackerDamage);
        return { ...u, troops: newTroops };
      }
      return u;
    });

    setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(updatedUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 執行遠程弓箭攻擊
  const executeArcheryAttack = useCallback((targetUnit: BattleUnit, isFireArrow: boolean = false, isBarrage: boolean = false) => {
    if (!battleState || !activeUnit) return;

    const attackerGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60, int: 60, pol: 50, cha: 60, name: activeUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: activeUnit.troops, training: 80, hasActed: false };
    const defenderGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60, int: 60, pol: 50, cha: 60, name: targetUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: targetUnit.troops, training: 80, hasActed: false };

    const targetCell = battleState.grid.find(c => c.col === targetUnit.col && c.row === targetUnit.row);
    const terrain = targetCell ? targetCell.terrain : '平地';

    const result = calculateArcheryCombat(
      activeUnit,
      targetUnit,
      attackerGen,
      defenderGen,
      isFireArrow,
      isBarrage,
      battleState.weather,
      terrain
    );

    addDamagePopup(targetUnit.col, targetUnit.row, `-${result.archeryDamage}`, 'red');
    if (result.isReturnFireTriggered && result.returnFireDamage > 0) {
      addDamagePopup(activeUnit.col, activeUnit.row, `-${result.returnFireDamage}`, 'yellow');
    }

    result.passivesTriggered.forEach(p => {
      const u = p.actor === 'attacker' ? activeUnit : targetUnit;
      const color: DamagePopup['color'] = p.skillId === '回射' ? 'blue' : p.skillId === '騎射' ? 'amber' : 'green';
      addDamagePopup(u.col, u.row, `【${p.skillId}】`, color);
    });

    addBattleLogs(result.combatLogs, 'archery');

    const updatedUnits = battleState.units.map(u => {
      if (u.id === activeUnit.id) {
        const newTroops = Math.max(0, u.troops - result.returnFireDamage);
        return { ...u, troops: newTroops, hasActed: !isBarrage || u.hasActed };
      }
      if (u.id === targetUnit.id) {
        const newTroops = Math.max(0, u.troops - result.archeryDamage);
        return { ...u, troops: newTroops };
      }
      return u;
    });

    setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
    if (!isBarrage) {
      setTargetingMode(null);
      checkBattleEnd(updatedUnits);
    }
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 一齊 (Joint Attack)
  const executeJointAttack = useCallback((targetUnit: BattleUnit) => {
    if (!battleState || !activeUnit) return;
    
    // Find all allies adjacent to the target
    const adjacentAllies = battleState.units.filter(u => 
      u.isAttacker === activeUnit.isAttacker && 
      u.troops > 0 && !u.hasActed &&
      getHexDistance(u.col, u.row, targetUnit.col, targetUnit.row) <= 1
    );

    if (adjacentAllies.length < 2) {
      addBattleLogs([`⚠️ 參與【一齊】的部隊不足！(需包含主將在內至少2支部隊相鄰敵軍)`], 'info');
      setTargetingMode(null);
      return;
    }

    addBattleLogs([`⚔️ ${activeUnit.generalName} 發動【一齊】攻擊，協同友軍進行圍剿！`], 'critical');

    let currentUnits = [...battleState.units];
    for (const ally of adjacentAllies) {
      const activeGen = gameState.generalsData[ally.generalName] || { str: 60, hp: 60, int: 60 };
      const defenderGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60, int: 60 };
      const targetCell = battleState.grid.find(c => c.col === targetUnit.col && c.row === targetUnit.row);
      const terrain = targetCell ? targetCell.terrain : '平地';

      const result = calculateMeleeCombat(ally, targetUnit, activeGen as GeneralState, defenderGen as GeneralState, currentUnits, false, terrain);
      
      addDamagePopup(targetUnit.col, targetUnit.row, `-${result.attackerDamage}`, 'red');
      if (result.defenderCounterDamage > 0) {
        addDamagePopup(ally.col, ally.row, `-${result.defenderCounterDamage}`, 'yellow');
      }

      addBattleLogs(result.combatLogs, 'attack');

      currentUnits = currentUnits.map(u => {
        if (u.id === ally.id) return { ...u, troops: Math.max(0, u.troops - result.defenderCounterDamage), hasActed: true };
        if (u.id === targetUnit.id) return { ...u, troops: Math.max(0, u.troops - result.attackerDamage) };
        return u;
      });
      const updatedTarget = currentUnits.find(u => u.id === targetUnit.id);
      if (!updatedTarget || updatedTarget.troops <= 0) break;
    }

    setBattleState(prev => prev ? { ...prev, units: currentUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(currentUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 突擊 (Assault)
  const executeAssault = useCallback((targetUnit: BattleUnit) => {
    if (!battleState || !activeUnit) return;
    addBattleLogs([`🐎 ${activeUnit.generalName} 發動【突擊】！展開連續猛烈衝鋒！`], 'critical');

    let currentUnits = [...battleState.units];
    let rounds = 3;
    for (let i = 0; i < rounds; i++) {
      const attacker = currentUnits.find(u => u.id === activeUnit.id);
      const defender = currentUnits.find(u => u.id === targetUnit.id);
      if (!attacker || !defender || attacker.troops <= 0 || defender.troops <= 0) break;

      const activeGen = gameState.generalsData[attacker.generalName] || { str: 60, hp: 60, int: 60 };
      const defenderGen = gameState.generalsData[defender.generalName] || { str: 60, hp: 60, int: 60 };
      const targetCell = battleState.grid.find(c => c.col === defender.col && c.row === defender.row);
      const terrain = targetCell ? targetCell.terrain : '平地';

      const result = calculateMeleeCombat(attacker, defender, activeGen as GeneralState, defenderGen as GeneralState, currentUnits, true, terrain);
      
      addDamagePopup(defender.col, defender.row, `-${result.attackerDamage}`, 'red');
      if (result.defenderCounterDamage > 0) {
        addDamagePopup(attacker.col, attacker.row, `-${result.defenderCounterDamage}`, 'yellow');
      }

      currentUnits = currentUnits.map(u => {
        if (u.id === attacker.id) return { ...u, troops: Math.max(0, u.troops - result.defenderCounterDamage) };
        if (u.id === defender.id) return { ...u, troops: Math.max(0, u.troops - result.attackerDamage) };
        return u;
      });
    }

    currentUnits = currentUnits.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u);
    setBattleState(prev => prev ? { ...prev, units: currentUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(currentUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 奮迅 (Furious Charge)
  const executeFuriousCharge = useCallback(() => {
    if (!battleState || !activeUnit) return;
    const adjacentEnemies = battleState.units.filter(u => 
      u.isAttacker !== activeUnit.isAttacker && 
      u.troops > 0 && 
      getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= 1
    );

    if (adjacentEnemies.length === 0) {
      addBattleLogs([`⚠️ ${activeUnit.generalName} 相鄰格無敵軍，無法發動奮迅！`], 'info');
      setTargetingMode(null);
      return;
    }

    addBattleLogs([`💥 ${activeUnit.generalName} 發動【奮迅】！對四面八方的敵軍展開無差別猛攻！`], 'critical');

    let currentUnits = [...battleState.units];
    for (const enemy of adjacentEnemies) {
      const attacker = currentUnits.find(u => u.id === activeUnit.id);
      const defender = currentUnits.find(u => u.id === enemy.id);
      if (!attacker || !defender || attacker.troops <= 0 || defender.troops <= 0) continue;

      const activeGen = gameState.generalsData[attacker.generalName] || { str: 60, hp: 60, int: 60 };
      const defenderGen = gameState.generalsData[defender.generalName] || { str: 60, hp: 60, int: 60 };
      const targetCell = battleState.grid.find(c => c.col === defender.col && c.row === defender.row);
      const terrain = targetCell ? targetCell.terrain : '平地';

      const result = calculateMeleeCombat(attacker, defender, activeGen as GeneralState, defenderGen as GeneralState, currentUnits, true, terrain);
      
      addDamagePopup(defender.col, defender.row, `-${result.attackerDamage}`, 'red');
      if (result.defenderCounterDamage > 0) {
        addDamagePopup(attacker.col, attacker.row, `-${result.defenderCounterDamage}`, 'yellow');
      }

      currentUnits = currentUnits.map(u => {
        if (u.id === attacker.id) return { ...u, troops: Math.max(0, u.troops - result.defenderCounterDamage) };
        if (u.id === defender.id) return { ...u, troops: Math.max(0, u.troops - result.attackerDamage) };
        return u;
      });
    }

    currentUnits = currentUnits.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u);
    setBattleState(prev => prev ? { ...prev, units: currentUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(currentUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 一騎 (Duel)
  const executeDuel = useCallback((targetUnit: BattleUnit) => {
    if (!battleState || !activeUnit) return;
    
    const aGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60 };
    const dGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60 };
    
    const aScore = aGen.str * aGen.hp;
    const dScore = dGen.str * dGen.hp;

    const acceptChance = (aScore <= dScore) ? 1.0 : (dScore / aScore) * 0.5;

    if (Math.random() > acceptChance) {
      addBattleLogs([`❌ ${targetUnit.generalName} 拒絕了 ${activeUnit.generalName} 的單挑要求！`], 'info');
      setTargetingMode(null);
      const updatedUnits = battleState.units.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u);
      setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
      return;
    }

    addBattleLogs([`⚔️ ${targetUnit.generalName} 接受了單挑！雙方武將策馬交鋒！`], 'critical');
    
    const aDuelRoll = Math.random() * aGen.str;
    const dDuelRoll = Math.random() * dGen.str;

    let updatedUnits = [...battleState.units];
    if (aDuelRoll >= dDuelRoll) {
      addBattleLogs([`🏆 ${activeUnit.generalName} 斬落敵將！${targetUnit.generalName} 軍部隊潰散！`], 'critical');
      addDamagePopup(targetUnit.col, targetUnit.row, '討死', 'red');
      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) return { ...u, troops: 0 };
        if (u.id === activeUnit.id) return { ...u, hasActed: true };
        return u;
      });
    } else {
      addBattleLogs([`💀 ${activeUnit.generalName} 不敵落馬！${activeUnit.generalName} 軍部隊潰散！`], 'critical');
      addDamagePopup(activeUnit.col, activeUnit.row, '討死', 'red');
      updatedUnits = updatedUnits.map(u => {
        if (u.id === activeUnit.id) return { ...u, troops: 0, hasActed: true };
        return u;
      });
    }

    setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(updatedUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 執行計略
  const executeStrategyOnTarget = useCallback((targetUnit: BattleUnit, strategyName: string) => {
    if (!battleState || !activeUnit) return;

    const casterGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60, int: 80, pol: 50, cha: 60, name: activeUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: activeUnit.troops, training: 80, hasActed: false };
    const targetGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60, int: 60, pol: 50, cha: 60, name: targetUnit.generalName, role: '將領', maxTroops: 10000, loyalty: 80, provinceId: null, isRuler: false, soldiers: targetUnit.troops, training: 80, hasActed: false };

    const targetCell = battleState.grid.find(c => c.col === targetUnit.col && c.row === targetUnit.row);
    const terrain = targetCell ? targetCell.terrain : '平地';

    const result = calculateStrategyExecution(
      activeUnit,
      targetUnit,
      casterGen,
      targetGen,
      strategyName,
      terrain
    );

    // 播放計略動畫
    setBattleState(prev => prev ? {
      ...prev,
      animatingStrategy: { type: strategyName, col: targetUnit.col, row: targetUnit.row }
    } : null);

    setTimeout(() => {
      setBattleState(prev => prev ? { ...prev, animatingStrategy: null } : null);
    }, 900);

    // 漂浮文字
    if (result.damageToTarget > 0) {
      addDamagePopup(targetUnit.col, targetUnit.row, `-${result.damageToTarget}`, 'purple');
    }
    if (result.damageToCaster > 0) {
      addDamagePopup(activeUnit.col, activeUnit.row, `反噬 -${result.damageToCaster}`, 'red');
    }

    result.passivesTriggered.forEach(p => {
      const u = p.actor === 'caster' ? activeUnit : targetUnit;
      const color: DamagePopup['color'] = p.skillId === '反計' ? 'purple' : p.skillId === '沉著' ? 'blue' : 'green';
      addDamagePopup(u.col, u.row, `【${p.skillId}】`, color);
    });

    addBattleLogs(result.combatLogs, 'strategy');

    const updatedUnits = battleState.units.map(u => {
      if (u.id === activeUnit.id) {
        const newTroops = Math.max(0, u.troops - result.damageToCaster);
        return {
          ...u,
          troops: newTroops,
          hasActed: true,
          status: result.casterNewStatus || u.status
        };
      }
      if (u.id === targetUnit.id) {
        const newTroops = Math.max(0, u.troops - result.damageToTarget);
        return {
          ...u,
          troops: newTroops,
          status: result.targetNewStatus || u.status
        };
      }
      return u;
    });

    setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
    setTargetingMode(null);
    setPendingStrategy(null);
    checkBattleEnd(updatedUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 休息並推進至下一部隊或次日（觸發【沉著】自動解除混亂）
  const handleRestUnit = useCallback(() => {
    if (!battleState || !activeUnit) return;

    // 將當前部隊設為已行動
    const units = battleState.units.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u);

    // 尋找下一支尚未行動的己方部隊
    const nextAttacker = units.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0 && !u.hasActed);

    if (nextAttacker) {
      setBattleState(prev => prev ? {
        ...prev,
        units,
        activeUnitId: nextAttacker.id
      } : null);
      setCustomPromptMessage(`輪到將領【${nextAttacker.generalName}】行動`);
    } else {
      // 己方所有部隊皆已行動完畢，進入次日：觸發回合初維護（包含【沉著】自動解除不良狀態、城池/太守府後勤傷兵恢復）
      const { updatedUnits, notifications } = processTurnStartPassives(units, gameState.generalsData, battleState.grid);
      
      const newDay = battleState.currentDay + 1;
      notifications.forEach(note => {
        addBattleLogs([note], 'passive');
      });

      addBattleLogs([`🌅 第 ${newDay} 天來臨，全軍整備完畢，重啟戰端！`], 'info');

      // 選擇第一支存活的己方部隊
      const firstUnit = updatedUnits.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0);

      setBattleState(prev => prev ? {
        ...prev,
        currentDay: newDay,
        units: updatedUnits,
        activeUnitId: firstUnit?.id || null
      } : null);

      setCustomPromptMessage(`第 ${newDay} 天：請指派部隊出擊`);
    }

    setTargetingMode(null);
  }, [battleState, activeUnit, gameState.generalsData, addBattleLogs]);

  // 處理戰術命令選單
  const handleCommandSelect = (cmdId: number) => {
    if (!battleState || !activeUnit) return;
    const activeGen = gameState.generalsData[activeUnit.generalName];

    // 非待命/查看/退兵指令時，若武將本回合已行動過，則阻擋
    if (activeUnit.hasActed && cmdId !== 0 && cmdId !== 12 && cmdId !== 14) {
      addBattleLogs([`⚠️ 部隊【${activeUnit.generalName}】本回合已完成行動（已進行過攻擊或計謀），每回合限攻擊或計謀一次！請指派其他部隊或選擇「待命」推進戰局。`], 'info');
      setCustomPromptMessage(`⚠️【${activeUnit.generalName}】今日已行動完畢，請指派其他部隊`);
      return;
    }

    // 取得鄰近敵軍
    const adjacentEnemies = battleState.units.filter(u => 
      u.isAttacker !== activeUnit.isAttacker && 
      u.troops > 0 && 
      getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= 1
    );

    // 取得射程內敵軍
    const hasMountedArchery = hasPassiveSkill(activeUnit, activeGen, '騎射');
    const maxRange = (hasMountedArchery ? 1 : 0) + (getUnitFormationStats(activeUnit.formation).range || 2);
    const enemiesInRange = battleState.units.filter(u => 
      u.isAttacker !== activeUnit.isAttacker && 
      u.troops > 0 && 
      getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= maxRange
    );

    if (cmdId === 1) { // 1. 移動
      if (activeUnit.hasMovedThisTurn) {
        addBattleLogs([`⚠️ 部隊【${activeUnit.generalName}】本回合已完成移動，每回合只能移動一次！`], 'info');
        setCustomPromptMessage(`⚠️【${activeUnit.generalName}】本回合已完成移動`);
        return;
      }
      setTargetingMode('move');
      setCustomPromptMessage('請點擊戰盤上的高亮格子以進行移動');
    } else if (cmdId === 2) { // 2. 通常 (近戰肉搏)
      if (adjacentEnemies.length === 0) {
        addBattleLogs([`⚠️ ${activeUnit.generalName} 相鄰格無敵軍，請先移動接近敵方！`], 'info');
      } else if (adjacentEnemies.length === 1) {
        executeMeleeAttack(adjacentEnemies[0], false);
      } else {
        setTargetingMode('melee');
        setCustomPromptMessage('請點擊相鄰敵軍部隊發動對戰');
      }
    } else if (cmdId === 3) { // 3. 一齊
      if (activeUnit.formation !== '鶴翼') {
        addBattleLogs([`⚠️ 【一齊】需要編組「鶴翼」陣形才能發動！`], 'info');
        return;
      }
      if (adjacentEnemies.length === 0) {
        addBattleLogs([`⚠️ 相鄰格無敵軍！`], 'info');
        return;
      }
      if (adjacentEnemies.length === 1) {
        executeJointAttack(adjacentEnemies[0]);
      } else {
        setTargetingMode('joint');
        setCustomPromptMessage('請點選目標敵軍發動一齊攻擊');
      }
    } else if (cmdId === 4) { // 4. 突擊
      if (!['魚鱗', '鋒矢', '錐行'].includes(activeUnit.formation || '')) {
        addBattleLogs([`⚠️ 【突擊】需要編組「魚鱗」、「鋒矢」或「錐行」陣形才能發動！`], 'info');
        return;
      }
      if (adjacentEnemies.length === 0) {
        addBattleLogs([`⚠️ 相鄰格無敵軍！`], 'info');
        return;
      }
      if (adjacentEnemies.length === 1) {
        executeAssault(adjacentEnemies[0]);
      } else {
        setTargetingMode('assault');
        setCustomPromptMessage('請點選目標敵軍發動突擊');
      }
    } else if (cmdId === 5) { // 5. 弓矢
      if (enemiesInRange.length === 0) {
        addBattleLogs([`⚠️ 射程範圍內無敵軍！`], 'info');
      } else if (enemiesInRange.length === 1) {
        executeArcheryAttack(enemiesInRange[0], false, false);
      } else {
        setTargetingMode('archery');
        setCustomPromptMessage('請點擊射程範圍內的敵軍進行弓箭射擊');
      }
    } else if (cmdId === 6) { // 6. 火矢
      if (['雨天', '雪天'].includes(battleState.weather)) {
        addBattleLogs([`⚠️ 在雨天或雪天狀態下無法發動【火矢】攻擊！`], 'info');
        setCustomPromptMessage(`⚠️ 雨天或雪天無法發動火矢`);
        return;
      }
      if (enemiesInRange.length === 0) {
        addBattleLogs([`⚠️ 射程範圍內無敵軍！`], 'info');
      } else if (enemiesInRange.length === 1) {
        executeArcheryAttack(enemiesInRange[0], true, false);
      } else {
        setTargetingMode('firearrow');
        setCustomPromptMessage('請點擊射程範圍內的敵軍發射火箭');
      }
    } else if (cmdId === 7) { // 7. 亂射
      const allInRange = battleState.units.filter(u => 
        u.troops > 0 && u.id !== activeUnit.id &&
        getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= maxRange
      );
      if (allInRange.length === 0) {
        addBattleLogs([`⚠️ 射程範圍內無任何部隊！`], 'info');
        return;
      }
      
      executeBarrage();
    } else if (cmdId === 8) { // 8. 奮迅
      executeFuriousCharge();
    } else if (cmdId === 9) { // 9. 一騎
      if (adjacentEnemies.length === 0) {
        addBattleLogs([`⚠️ 相鄰格無敵軍，無法發起單挑！`], 'info');
      } else if (adjacentEnemies.length === 1) {
        executeDuel(adjacentEnemies[0]);
      } else {
        setTargetingMode('duel');
        setCustomPromptMessage('請點選目標敵軍將領發起單挑');
      }
    } else if (cmdId === 10) { // 10. 計略
      setStrategyOpen(true);
    } else if (cmdId === 11) { // 11. 佈陣 (Formation Shift)
      const availableSkills = activeUnit.skills || (activeGen?.skills) || (activeGen ? getGeneralAvailableSkills(activeGen) : []);
      const hasFormationSkill = availableSkills.includes('佈陣');

      if (!hasFormationSkill) {
        addBattleLogs([`⚠️【${activeUnit.generalName}】未持有【佈陣】特技，無法臨機變換陣形！（需統帥或謀略中上且具備「佈陣」特技之名將軍師方可臨機變陣）`], 'info');
        addDamagePopup(activeUnit.col, activeUnit.row, '無佈陣特技', 'purple');
        setCustomPromptMessage(`⚠️【${activeUnit.generalName}】無【佈陣】特技，無法在戰鬥中變更陣形`);
        return;
      }

      const stamina = activeUnit.stamina ?? 100;
      if (stamina < 15) {
        addBattleLogs([`⚠️ 氣力不足（變陣需消耗 15 點體力，當前體力 ${stamina}），無法發動【佈陣】！`], 'info');
        setCustomPromptMessage(`⚠️ 氣力不足，變更陣形需要 15 點體力`);
        return;
      }

      setFormationModalOpen(true);
    } else if (cmdId === 12) { // 12. 查看
      setInspectUnitModal(activeUnit);
    } else if (cmdId === 13) { // 13. 快戰 (Auto-Battle)
      const battle = gameState.activeBattle;
      if (!battle) return;

      let atkScore = 0;
      let defScore = battle.defendingGenerals.length === 0 ? 500 : 0;

      battle.attackingGenerals.forEach(g => {
        const gen = gameState.generalsData[g];
        if (gen) atkScore += gen.str * 10 + gen.int * 5 + gen.soldiers;
      });

      battle.defendingGenerals.forEach(g => {
        const gen = gameState.generalsData[g];
        if (gen) defScore += gen.str * 10 + gen.int * 5 + gen.soldiers;
      });

      const roll = Math.random() * 0.4 + 0.8;
      if (atkScore * roll > defScore) {
        onResolveBattle('attacker');
      } else {
        onResolveBattle('defender');
      }
    } else if (cmdId === 14) { // 14. 退兵
      onResolveBattle('defender');
    } else if (cmdId === 0) { // 0. 待命
      handleRestUnit();
    }
  };

  const executeBarrage = useCallback(() => {
    if (!battleState || !activeUnit) return;
    const activeGen = gameState.generalsData[activeUnit.generalName] || { str: 60, hp: 60, int: 60 };
    const maxRange = (hasPassiveSkill(activeUnit, activeGen as GeneralState, '騎射') ? 1 : 0) + (getUnitFormationStats(activeUnit.formation).range || 2);
    
    const allInRange = battleState.units.filter(u => 
      u.troops > 0 && u.id !== activeUnit.id &&
      getHexDistance(activeUnit.col, activeUnit.row, u.col, u.row) <= maxRange
    );

    addBattleLogs([`🏹 ${activeUnit.generalName} 發動【亂射】！對周遭射程內部隊無差別攻擊！`], 'critical');

    let currentUnits = [...battleState.units];
    for (const target of allInRange) {
      const attackerObj = currentUnits.find(u => u.id === activeUnit.id);
      const targetObj = currentUnits.find(u => u.id === target.id);
      if (!attackerObj || !targetObj || attackerObj.troops <= 0 || targetObj.troops <= 0) continue;

      const targetGen = gameState.generalsData[targetObj.generalName] || { str: 60, hp: 60, int: 60 };
      const targetCell = battleState.grid.find(c => c.col === targetObj.col && c.row === targetObj.row);
      const terrain = targetCell ? targetCell.terrain : '平地';

      const result = calculateArcheryCombat(attackerObj, targetObj, activeGen as GeneralState, targetGen as GeneralState, false, true, battleState.weather, terrain);
      
      addDamagePopup(targetObj.col, targetObj.row, `-${result.archeryDamage}`, targetObj.isAttacker === activeUnit.isAttacker ? 'yellow' : 'red');
      
      currentUnits = currentUnits.map(u => {
        if (u.id === targetObj.id) return { ...u, troops: Math.max(0, u.troops - result.archeryDamage) };
        return u;
      });
    }

    currentUnits = currentUnits.map(u => u.id === activeUnit.id ? { ...u, hasActed: true } : u);
    setBattleState(prev => prev ? { ...prev, units: currentUnits } : null);
    setTargetingMode(null);
    checkBattleEnd(currentUnits);
  }, [battleState, activeUnit, gameState.generalsData, addDamagePopup, addBattleLogs, checkBattleEnd]);

  // 選擇點擊戰盤格子
  const handleSelectCell = (col: number, row: number) => {
    if (!battleState || !activeUnit) return;

    if (targetingMode === 'move') {
      const isValid = validTargetCells.some(c => c.col === col && c.row === row);
      if (isValid) {
        setBattleState(prev => {
          if (!prev) return prev;
          const updatedUnits = prev.units.map(u => u.id === activeUnit.id ? { ...u, col, row } : u);
          return { ...prev, units: updatedUnits };
        });
        addBattleLogs([`🏃 ${activeUnit.generalName} 部隊迅速機動行軍至 (${col}, ${row}) 地塊！`], 'info');
        setTargetingMode(null);
        setCustomPromptMessage(null);
      }
    } else if (targetingMode === 'melee' || targetingMode === 'deadly') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeMeleeAttack(targetUnit, targetingMode === 'deadly');
    } else if (targetingMode === 'joint') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeJointAttack(targetUnit);
    } else if (targetingMode === 'assault') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeAssault(targetUnit);
    } else if (targetingMode === 'archery') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeArcheryAttack(targetUnit, false, false);
    } else if (targetingMode === 'firearrow') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeArcheryAttack(targetUnit, true, false);
    } else if (targetingMode === 'duel') {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeDuel(targetUnit);
    } else if (targetingMode === 'strategy' && pendingStrategy) {
      const targetUnit = battleState.units.find(u => u.isAttacker !== activeUnit.isAttacker && u.troops > 0 && u.col === col && u.row === row);
      if (targetUnit) executeStrategyOnTarget(targetUnit, pendingStrategy);
    }
  };

  // 點選特定部隊
  const handleSelectUnit = (unitId: string) => {
    if (!battleState) return;
    const unit = battleState.units.find(u => u.id === unitId);
    if (!unit) return;

    // 若處於鎖定攻擊模式中，點選敵方部隊則發動對應攻擊
    if (unit.isAttacker !== activeUnit?.isAttacker) {
      if (targetingMode === 'melee' || targetingMode === 'deadly') {
        executeMeleeAttack(unit, targetingMode === 'deadly');
        return;
      } else if (targetingMode === 'joint') {
        executeJointAttack(unit);
        return;
      } else if (targetingMode === 'assault') {
        executeAssault(unit);
        return;
      } else if (targetingMode === 'archery') {
        executeArcheryAttack(unit, false, false);
        return;
      } else if (targetingMode === 'firearrow') {
        executeArcheryAttack(unit, true, false);
        return;
      } else if (targetingMode === 'duel') {
        executeDuel(unit);
        return;
      } else if (targetingMode === 'strategy' && pendingStrategy) {
        executeStrategyOnTarget(unit, pendingStrategy);
        return;
      }
    }

    // 正常切換己方選取部隊
    if (unit.isAttacker === isPlayerAttacker) {
      setBattleState(prev => prev ? { ...prev, activeUnitId: unitId } : null);
      setTargetingMode(null);
      setCustomPromptMessage(`已選取將領【${unit.generalName}】`);
    } else {
      setInspectUnitModal(unit);
    }
  };

  // 選擇策略計策後觸發
  const handleApplyStrategy = (strategy: string) => {
    if (!battleState || !activeUnit) return;
    setStrategyOpen(false);

    if (activeUnit.hasActed) {
      addBattleLogs([`⚠️ 部隊【${activeUnit.generalName}】本回合已完成行動，無法再施展計略！`], 'info');
      setCustomPromptMessage(`⚠️【${activeUnit.generalName}】今日已行動完畢`);
      return;
    }

    // 若為友軍/自身輔助型技能（如鼓舞、治療、收拾、滅火、仙術）
    if (['鼓舞', '激勵', '治療', '收拾', '滅火', '仙術', '天變', '祈雨', '速攻'].includes(strategy)) {
      let logMsg = `✨ ${activeUnit.generalName} 施展計略【${strategy}】！`;
      let popupText = strategy;
      let popupColor: DamagePopup['color'] = 'green';

      if (strategy === '收拾') {
        popupText = '軍容整肅';
        logMsg = `✨ ${activeUnit.generalName} 施展【收拾】，成功解除混亂狀態重回戰陣！`;
      } else if (strategy === '鼓舞' || strategy === '激勵') {
        popupText = '士氣+30';
        popupColor = 'amber';
        logMsg = `🎺 ${activeUnit.generalName} 擊鼓激勵，部隊士氣大幅提振！`;
      } else if (strategy === '治療' || strategy === '仙術') {
        popupText = strategy === '仙術' ? '傷兵盡復' : '療傷救治';
        logMsg = `☯️ ${activeUnit.generalName} 施展【${strategy}】，施救軍醫與道術，部隊傷勢痊癒！`;
      }

      addDamagePopup(activeUnit.col, activeUnit.row, popupText, popupColor);
      addBattleLogs([logMsg], 'passive');

      const updatedUnits = battleState.units.map(u => {
        if (u.id === activeUnit.id) {
          const healedTroops = (strategy === '治療' || strategy === '仙術') ? Math.min(u.troops + 1500, 10000) : u.troops;
          return {
            ...u,
            troops: healedTroops,
            status: strategy === '收拾' ? 'normal' : u.status,
            hasActed: true
          };
        }
        return u;
      });

      setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
      setTargetingMode(null);
      setPendingStrategy(null);
      return;
    }

    // 敵方指向型計略：進入目標選取模式
    setPendingStrategy(strategy);
    setTargetingMode('strategy');
    setCustomPromptMessage(`請點選敵軍部隊施展計略【${strategy}】`);
  };

  // 臨機變換陣形（佈陣特技）
  const handleApplyFormation = useCallback((newFormation: string) => {
    if (!battleState || !activeUnit) return;
    const stamina = activeUnit.stamina ?? 100;
    if (stamina < 15) {
      addBattleLogs([`⚠️ 氣力不足（變陣需消耗 15 點體力），無法發動【佈陣】！`], 'info');
      return;
    }

    const updatedUnits = battleState.units.map(u => {
      if (u.id === activeUnit.id) {
        return {
          ...u,
          formation: newFormation,
          stamina: Math.max(0, stamina - 15)
        };
      }
      return u;
    });

    addBattleLogs([
      `🚩【${activeUnit.generalName}】發動【佈陣】特技！`,
      `🔄 臨機應變，迅速將部隊陣形變更為【${newFormation}陣】！`
    ], 'strategy');

    addDamagePopup(activeUnit.col, activeUnit.row, `變陣【${newFormation}】`, 'amber');
    setBattleState(prev => prev ? { ...prev, units: updatedUnits } : null);
    setFormationModalOpen(false);
    setCustomPromptMessage(`【${activeUnit.generalName}】已成功變更陣形為【${newFormation}陣】`);
  }, [battleState, activeUnit, addBattleLogs, addDamagePopup]);

  if (!battleState) return null;

  const activeGen = activeUnit ? gameState.generalsData[activeUnit.generalName] : null;
  const activeSkills = activeUnit?.skills || activeGen?.skills || (activeGen ? getGeneralAvailableSkills(activeGen) : []);
  const activeStamina = activeUnit?.stamina ?? 100;

  return (
    <div className="w-full h-full flex flex-col relative bg-stone-200 overflow-hidden font-serif">
      {/* 陣形設定 */}
      {!formationSelectionComplete && (
        <FormationSelectionView 
          gameState={gameState} 
          battleState={battleState} 
          onComplete={(assignments) => {
            setBattleState(prev => {
              if (!prev) return prev;
              const newUnits = prev.units.map(u => {
                if (assignments[u.id]) {
                  return { ...u, formation: assignments[u.id] };
                }
                return u;
              });
              return { ...prev, units: newUnits };
            });
            setFormationSelectionComplete(true);
          }}
        />
      )}

      {/* 戰場頂部狀態條 */}
      <BattleHeader state={battleState} />

      {/* 雙方主帥卡牌 */}
      <BattleCards state={battleState} activeUnit={activeUnit} />
      
      {/* 戰場作戰六角戰盤 */}
      <BattleGrid 
        state={battleState} 
        onSelectUnit={handleSelectUnit} 
        onSelectCell={handleSelectCell}
        targetingMode={targetingMode}
        validTargetCells={validTargetCells}
      />
      
      {/* 指令提示與動態戰報橫幅 */}
      <BattlePromptBanner 
        state={battleState} 
        customMessage={customPromptMessage}
      />
      
      {/* 經典水墨戰術命令盤 */}
      <BattleCommandMenu 
        onCommandSelect={handleCommandSelect} 
        onStrategySelect={handleApplyStrategy}
        activeUnit={activeUnit}
        activeSkills={activeSkills}
        activeStamina={activeStamina}
        weather={battleState.weather}
      />
      
      {/* 策略計策選單 */}
      <StrategySheet 
        isOpen={strategyOpen} 
        onClose={() => setStrategyOpen(false)} 
        onSelectStrategy={handleApplyStrategy} 
        activeGeneralName={activeUnit?.generalName}
        skills={activeSkills}
        currentStamina={activeStamina}
      />

      {/* 戰場佈陣 / 變更陣形選單 */}
      <BattleFormationModal
        isOpen={formationModalOpen}
        onClose={() => setFormationModalOpen(false)}
        activeUnit={activeUnit}
        activeGeneral={activeGen}
        onSelectFormation={handleApplyFormation}
      />

      {/* 將領特技與戰況查看彈窗 */}
      {inspectUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-stone-100 border-2 border-stone-800 w-full max-w-md rounded-md shadow-2xl p-4 font-serif relative">
            <button 
              onClick={() => setInspectUnitModal(null)}
              className="absolute top-3 right-3 text-stone-500 hover:text-stone-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-stone-800 pb-3 mb-3">
              <div className={`w-12 h-14 border-2 border-stone-900 flex items-center justify-center font-bold text-lg text-stone-100 ${inspectUnitModal.isAttacker ? 'bg-rose-800' : 'bg-sky-800'}`}>
                {inspectUnitModal.generalName.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  {inspectUnitModal.generalName}
                  <span className={`text-xs px-2 py-0.5 rounded border ${inspectUnitModal.isAttacker ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-sky-100 text-sky-800 border-sky-300'}`}>
                    {inspectUnitModal.isAttacker ? '攻方部隊' : '守方部隊'}
                  </span>
                </h3>
                <p className="text-xs text-stone-600">
                  陣形: <span className="font-bold text-stone-900">{inspectUnitModal.formation || '平地'}</span> | 狀態: <span className="font-bold text-amber-700">{inspectUnitModal.status === 'confused' ? '混亂 🌀' : '正常 ⚔️'}</span>
                </p>
              </div>
            </div>

            {/* 兵員與體力 */}
            <div className="grid grid-cols-3 gap-2 bg-stone-200 p-2 rounded border border-stone-400 mb-3 text-xs">
              <div>兵力: <span className="font-bold text-rose-800">{inspectUnitModal.troops}</span></div>
              <div>體力: <span className="font-bold text-emerald-800">{inspectUnitModal.stamina ?? 100}</span></div>
              <div>將位: <span className="font-bold text-stone-800">{inspectUnitModal.isCommander ? '主帥' : '部將'}</span></div>
            </div>

            {/* 武將特技庫與被動專區 */}
            <div className="mb-2">
              <h4 className="text-xs font-bold text-stone-800 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 武將特技與常時被動：
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(() => {
                  const combined = Array.from(new Set([
                    ...(inspectUnitModal.passives || []),
                    ...(inspectUnitModal.skills || [])
                  ]));

                  if (combined.length === 0) {
                    return <div className="text-xs text-stone-400 italic py-1">無特殊戰鬥技能</div>;
                  }

                  return combined.map((skillName) => {
                    const isPassive = ['沉著', '反計', '無雙', '奮發', '回射', '騎射', '藤甲'].includes(skillName);
                    const passiveDef = isPassive ? PASSIVE_SKILL_REGISTRY[skillName as keyof typeof PASSIVE_SKILL_REGISTRY] : null;

                    return (
                      <div 
                        key={skillName} 
                        className={`p-2 rounded text-xs border flex-1 min-w-[130px] ${
                          isPassive 
                            ? 'bg-amber-50 border-amber-300 text-stone-900 shadow-2xs' 
                            : 'bg-stone-200 border-stone-300 text-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold border-b border-stone-300/60 pb-1 mb-1">
                          <span className="flex items-center gap-1">
                            {passiveDef?.iconSymbol || '📜'} 【{skillName}】
                          </span>
                          <span className={`text-[10px] px-1 rounded font-bold ${isPassive ? 'bg-amber-200 text-amber-900' : 'bg-stone-300 text-stone-700'}`}>
                            {isPassive ? '常時被動' : '主動計略'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-tight">
                          {passiveDef?.desc || '消耗體力發動戰法計策'}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-stone-400 flex justify-end">
              <button
                onClick={() => setInspectUnitModal(null)}
                className="px-4 py-1 bg-stone-800 text-stone-100 text-xs rounded hover:bg-stone-700"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
