const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GameState, BattleUnit, CombatLogEntry } from '../types';
import { getGeneralAvailableSkills, getGeneralPassives, BATTLE_SKILLS } from '../engine/skills';
import { FORMATIONS } from '../engine/formations';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';

interface BattleViewProps {
  gameState: GameState;
  onResolveBattle: (winner: 'attacker' | 'defender') => void;
  onExit: () => void;
}

export default function BattleView5v5({ gameState, onResolveBattle, onExit }: BattleViewProps) {
  const [battleState, setBattleState] = useState<any>(null);
  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [targetingMode, setTargetingMode] = useState<'melee' | 'skill' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [logs, setLogs] = useState<CombatLogEntry[]>([]);
  const [showFormationModal, setShowFormationModal] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Initialization
  useEffect(() => {
    if (battleState || !gameState.activeBattle) return;
    
    const battle = gameState.activeBattle;
    const newUnits: BattleUnit[] = [];

    // Initialize Defender
    battle.defendingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        newUnits.push({
          id: \`d_\${idx}\`,
          generalName: gName,
          isAttacker: false,
          troops: gen.soldiers,
          col: 1,
          row: idx,
          isCommander: idx === 0,
          formation: gen.formations?.[0] || '方圓',
          skills: gen.skills || getGeneralAvailableSkills(gen),
          passives: gen.passives || getGeneralPassives(gen),
          stamina: 100,
          status: 'normal',
          hasActed: false
        });
      }
    });

    if (battle.defendingGenerals.length === 0) {
      newUnits.push({
        id: 'd_0',
        generalName: '守備兵',
        isAttacker: false,
        troops: 1000,
        col: 1,
        row: 0,
        isCommander: true,
        formation: '方圓',
        skills: [],
        passives: [],
        stamina: 100,
        status: 'normal',
        hasActed: false
      });
    }

    // Initialize Attacker
    battle.attackingGenerals.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        newUnits.push({
          id: \`a_\${idx}\`,
          generalName: gName,
          isAttacker: true,
          troops: gen.soldiers,
          col: 0,
          row: idx,
          isCommander: idx === 0,
          formation: gen.formations?.[0] || '魚鱗',
          skills: gen.skills || getGeneralAvailableSkills(gen),
          passives: gen.passives || getGeneralPassives(gen),
          stamina: 100,
          status: 'normal',
          hasActed: false
        });
      }
    });

    setBattleState({
      attackerStrategist: battle.attackerStrategist,
      defenderStrategist: battle.defenderStrategist,
      units: newUnits,
      day: 1
    });

    const initLogs = [{ id: 'init', text: \`⚔️ 戰鬥開始！\`, type: 'info', timestamp: Date.now() }];
    setLogs(initLogs);
    
    // Initial Turn Queue
    generateTurnQueue(newUnits);
  }, [gameState.activeBattle]);

  const generateTurnQueue = (units: BattleUnit[]) => {
    // Sort by Speed: STR + INT + Initiative
    const queue = units
      .filter(u => u.troops > 0)
      .map(u => {
        const g = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
        const f = FORMATIONS[u.formation || ''] || { initiativeMod: 0 };
        const speed = g.str * 0.3 + g.int * 0.3 + f.initiativeMod;
        return { id: u.id, speed: speed + Math.random() * 10 };
      })
      .sort((a, b) => b.speed - a.speed)
      .map(x => x.id);
    
    setTurnQueue(queue);
    setActiveUnitId(queue[0]);
  };

  const addLog = (text: string, type: 'info'|'attack'|'strategy'|'event' = 'info') => {
    setLogs(prev => [...prev, { id: \`log_\${Date.now()}_\${Math.random()}\`, text, type, timestamp: Date.now() }]);
  };

  const advanceTurn = (currentUnits: BattleUnit[], currentQueue: string[]) => {
    const aliveUnits = currentUnits.filter(u => u.troops > 0);
    const atkCount = aliveUnits.filter(u => u.isAttacker).length;
    const defCount = aliveUnits.filter(u => !u.isAttacker).length;

    if (atkCount === 0) {
      addLog('我方全軍覆沒，戰役失敗！', 'event');
      setTimeout(() => onResolveBattle('defender'), 2000);
      return;
    }
    if (defCount === 0) {
      addLog('敵軍全數殲滅，攻城勝利！', 'event');
      setTimeout(() => onResolveBattle('attacker'), 2000);
      return;
    }

    const nextQueue = currentQueue.slice(1);
    if (nextQueue.length === 0) {
      generateTurnQueue(currentUnits);
    } else {
      setTurnQueue(nextQueue);
      setActiveUnitId(nextQueue[0]);
    }
    setTargetingMode(null);
    setSelectedSkill(null);
  };

  const handleMeleeAttack = (targetId: string) => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find(u => u.id === activeUnitId);
    const targetUnit = battleState.units.find(u => u.id === targetId);
    if (!activeUnit || !targetUnit) return;

    const atkGen = gameState.generalsData[activeUnit.generalName] || { str: 50, int: 50 };
    const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50, int: 50 };

    const atkForm = FORMATIONS[activeUnit.formation || ''] || { atkMod: 1, defMod: 1 };
    const defForm = FORMATIONS[targetUnit.formation || ''] || { atkMod: 1, defMod: 1 };

    const baseDamage = Math.floor((atkGen.str * atkForm.atkMod) * (Math.random() * 0.2 + 0.9) * 10);
    const defense = Math.floor((defGen.str * defForm.defMod) * 5);
    let damage = Math.max(1, baseDamage - defense);
    
    // Critical
    const isCrit = Math.random() < 0.1;
    if (isCrit) damage = Math.floor(damage * 1.5);

    addLog(\`⚔️ \${activeUnit.generalName} 攻擊了 \${targetUnit.generalName} \${isCrit ? '(暴擊!)' : ''}，造成 \${damage} 傷害！\`, 'attack');

    const newUnits = battleState.units.map(u => {
      if (u.id === targetId) {
        return { ...u, troops: Math.max(0, u.troops - damage) };
      }
      return u;
    });

    setBattleState({ ...battleState, units: newUnits });
    advanceTurn(newUnits, turnQueue);
  };

  const handleSkillAttack = (targetId: string) => {
    if (!battleState || !activeUnitId || !selectedSkill) return;
    const activeUnit = battleState.units.find(u => u.id === activeUnitId);
    const targetUnit = battleState.units.find(u => u.id === targetId);
    if (!activeUnit || !targetUnit) return;

    const skillDef = BATTLE_SKILLS[selectedSkill];
    if (activeUnit.stamina < skillDef.cost) {
      addLog(\`⚠️ \${activeUnit.generalName} 體力不足！\`);
      return;
    }

    addLog(\`🔥 \${activeUnit.generalName} 發動了【\${selectedSkill}】！目標：\${targetUnit.generalName}\`, 'strategy');
    
    // Very simplified damage calculation for 5v5
    const atkGen = gameState.generalsData[activeUnit.generalName] || { str: 50, int: 50 };
    let stat = skillDef.category === '計謀' ? atkGen.int : atkGen.str;
    let damage = Math.floor(stat * 15 * (Math.random() * 0.4 + 0.8));

    const newUnits = battleState.units.map(u => {
      if (u.id === targetId) {
        return { ...u, troops: Math.max(0, u.troops - damage) };
      }
      if (u.id === activeUnitId) {
        return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost) };
      }
      return u;
    });

    addLog(\`💥 對 \${targetUnit.generalName} 造成 \${damage} 傷害！\`, 'attack');
    
    setBattleState({ ...battleState, units: newUnits });
    advanceTurn(newUnits, turnQueue);
  };

  const handleDefend = () => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find(u => u.id === activeUnitId);
    if (!activeUnit) return;

    addLog(\`🛡️ \${activeUnit.generalName} 選擇了防禦，並恢復些許體力。\`, 'info');
    const newUnits = battleState.units.map(u => {
      if (u.id === activeUnitId) {
        return { ...u, status: 'defending', stamina: Math.min(100, u.stamina + 20) };
      }
      return u;
    });

    setBattleState({ ...battleState, units: newUnits });
    advanceTurn(newUnits, turnQueue);
  };

  const handleChangeFormation = (newFormation: string) => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find(u => u.id === activeUnitId);
    
    // 扣除軍師體力 (For now, simplified, deduct from active unit instead if strategist)
    addLog(\`🔄 陣形變換為【\${newFormation}】！\`, 'strategy');
    const newUnits = battleState.units.map(u => {
      if (u.isAttacker === activeUnit?.isAttacker) {
        return { ...u, formation: newFormation };
      }
      return u;
    });

    setBattleState({ ...battleState, units: newUnits });
    setShowFormationModal(false);
    advanceTurn(newUnits, turnQueue);
  };

  const activeUnit = battleState?.units.find(u => u.id === activeUnitId);
  const isPlayerTurn = activeUnit?.isAttacker;
  const isStrategistPresent = activeUnit?.isAttacker 
    ? !!battleState?.attackerStrategist 
    : !!battleState?.defenderStrategist;

  // AI Turn (Simplified)
  useEffect(() => {
    if (!isPlayerTurn && activeUnit) {
      setTimeout(() => {
        const target = battleState.units.find(u => u.isAttacker && u.troops > 0);
        if (target) {
          handleMeleeAttack(target.id);
        } else {
          handleDefend();
        }
      }, 1000);
    }
  }, [activeUnitId, isPlayerTurn]);

  if (!battleState) return <div className="p-10 text-white">載入戰場中...</div>;

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-serif select-none" style={{ background: 'linear-gradient(to bottom, #2b3a42, #1c1917)' }}>
      {/* Top Header */}
      <div className="p-3 bg-stone-900/80 border-b border-stone-700 flex justify-between items-center text-white">
        <div className="font-black text-xl">⚔️ 決戰 </div>
        <button onClick={onExit} className="px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-sm font-bold">撤退</button>
      </div>

      {/* Main Battlefield Area */}
      <div className="flex-1 flex px-4 py-6 overflow-hidden gap-4">
        {/* Attacker (Left) */}
        <div className="flex-1 flex flex-col gap-2 justify-center">
          {battleState.units.filter(u => u.isAttacker).map(u => (
            <UnitCard 
              key={u.id} 
              unit={u} 
              gameState={gameState} 
              isActive={activeUnitId === u.id} 
              onSelect={() => targetingMode && !u.isAttacker ? (targetingMode === 'melee' ? handleMeleeAttack(u.id) : handleSkillAttack(u.id)) : null}
              isTargetable={targetingMode !== null && !u.isAttacker && u.troops > 0}
            />
          ))}
        </div>

        {/* Center Space & Logs */}
        <div className="flex-1 max-w-sm flex flex-col relative">
          <div className="flex-1 overflow-y-auto bg-black/40 border border-stone-700 rounded p-3 flex flex-col gap-2 mb-4">
            {logs.map(log => (
              <div key={log.id} className={\`text-sm \${log.type === 'attack' ? 'text-rose-400' : log.type === 'strategy' ? 'text-cyan-400' : 'text-stone-300'}\`}>
                {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {targetingMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none rounded">
              <span className="text-xl font-black text-amber-400 drop-shadow-md">請點選目標...</span>
              <button onClick={() => setTargetingMode(null)} className="absolute bottom-4 px-4 py-2 bg-stone-800 text-white rounded pointer-events-auto">取消</button>
            </div>
          )}
        </div>

        {/* Defender (Right) */}
        <div className="flex-1 flex flex-col gap-2 justify-center items-end">
          {battleState.units.filter(u => !u.isAttacker).map(u => (
            <UnitCard 
              key={u.id} 
              unit={u} 
              gameState={gameState} 
              isActive={activeUnitId === u.id} 
              onSelect={() => targetingMode && u.isAttacker ? null : (targetingMode === 'melee' ? handleMeleeAttack(u.id) : handleSkillAttack(u.id))}
              isTargetable={targetingMode !== null && !u.isAttacker && u.troops > 0}
            />
          ))}
        </div>
      </div>

      {/* Control Panel (Bottom) */}
      <div className="h-40 bg-stone-900 border-t border-stone-700 p-4 flex gap-6 text-white">
        {activeUnit && isPlayerTurn && (
          <>
            <div className="flex-1">
              <div className="font-black text-xl text-amber-500 mb-1">【{activeUnit.generalName}】行動中</div>
              <div className="flex gap-4 text-sm text-stone-300">
                <span>兵力: <strong className="text-white">{activeUnit.troops}</strong></span>
                <span>體力: <strong className="text-sky-400">{activeUnit.stamina}</strong>/100</span>
                <span>陣形: <strong className="text-emerald-400">{activeUnit.formation}</strong></span>
              </div>
              <div className="mt-2 text-xs text-stone-500">
                隨軍軍師: {battleState.attackerStrategist || '無'}
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              <CommandButton onClick={() => setTargetingMode('melee')} label="攻擊" color="bg-rose-900" />
              <div className="relative group">
                <CommandButton onClick={() => {}} label="計謀/特技" color="bg-cyan-900" />
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-stone-800 border border-stone-600 rounded p-2 hidden group-hover:block grid grid-cols-2 gap-1 z-50">
                  {activeUnit.skills.map(s => {
                    const skill = BATTLE_SKILLS[s];
                    if (!skill) return null;
                    return (
                      <button 
                        key={s} 
                        onClick={() => { setSelectedSkill(s); setTargetingMode('skill'); }}
                        className={\`text-xs p-1.5 border rounded text-left \${activeUnit.stamina >= skill.cost ? 'border-stone-500 hover:bg-stone-700' : 'border-stone-700 text-stone-500 cursor-not-allowed'}\`}
                      >
                        <span className="font-bold text-amber-400">{s}</span> ({skill.cost})
                      </button>
                    )
                  })}
                </div>
              </div>
              <CommandButton onClick={handleDefend} label="防禦" color="bg-stone-700" />
              
              <CommandButton 
                onClick={() => setShowFormationModal(true)} 
                label="佈陣" 
                color="bg-emerald-900" 
                disabled={!isStrategistPresent} 
              />
            </div>
          </>
        )}
      </div>

      {showFormationModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-stone-200 text-stone-900 p-6 rounded-lg max-w-md w-full border-4 border-double border-stone-800">
            <h3 className="text-xl font-black mb-4">由軍師 {battleState.attackerStrategist} 發令佈陣</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.keys(FORMATIONS).map(f => (
                <button 
                  key={f} 
                  onClick={() => handleChangeFormation(f)}
                  className="p-3 border-2 border-stone-400 bg-white hover:bg-stone-100 rounded text-left font-bold cursor-pointer"
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFormationModal(false)} className="w-full p-2 bg-stone-800 text-white rounded">取消</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommandButton({ onClick, label, color, disabled = false }: { onClick: () => void, label: string, color: string, disabled?: boolean }) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={\`w-24 h-16 \${color} \${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'} border-2 border-stone-400 rounded-lg font-black text-lg shadow-md transition-all\`}
    >
      {label}
    </button>
  );
}

function UnitCard({ unit, gameState, isActive, onSelect, isTargetable }: any) {
  const isDead = unit.troops <= 0;
  return (
    <div 
      onClick={onSelect}
      className={\`
        w-64 p-3 border-2 rounded transition-all select-none
        \${isDead ? 'opacity-30 grayscale border-stone-800 bg-stone-900' : 'bg-stone-800/90'}
        \${isActive && !isDead ? 'border-amber-400 ring-2 ring-amber-500 scale-105 shadow-lg' : 'border-stone-600'}
        \${isTargetable ? 'cursor-pointer hover:border-rose-500 hover:bg-rose-900/50' : ''}
      \`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className={\`font-black text-lg \${unit.isAttacker ? 'text-sky-400' : 'text-rose-400'}\`}>
          {unit.generalName} {unit.isCommander ? '★' : ''}
        </span>
        <span className="text-xs bg-stone-700 px-2 py-0.5 rounded text-stone-300 font-bold border border-stone-600">
          {unit.formation}
        </span>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="text-sm font-bold text-stone-200">
          兵: <span className={isDead ? 'text-stone-500' : 'text-white'}>{unit.troops}</span>
        </div>
        
        {/* Simple Health Bar */}
        <div className="w-32 h-2 bg-stone-900 rounded overflow-hidden border border-stone-700">
          <div 
            className={\`h-full \${unit.isAttacker ? 'bg-sky-500' : 'bg-rose-500'}\`} 
            style={{ width: \`\${Math.max(0, Math.min(100, (unit.troops / (gameState.generalsData[unit.generalName]?.soldiers || 1)) * 100))}%\` }} 
          />
        </div>
      </div>
    </div>
  );
}
`

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
console.log('BattleView5v5.tsx created successfully');
