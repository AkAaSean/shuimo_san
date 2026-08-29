import React, { useState, useEffect, useMemo } from 'react';
import { GeneralAvatar } from "./GeneralAvatar";
import { GameState, BattleUnit, CombatLogEntry, FormationTerrainType } from '../types';
import { getGeneralAvailableSkills, getGeneralPassives, BATTLE_SKILLS } from '../engine/skills';
import { 
  FORMATIONS, 
  getFormationInfo, 
  getGeneralAvailableFormations,
  getFormationTerrainEffect,
  TERRAIN_DETAILS,
  calculateFormationTerrainCombatModifier
} from '../engine/formations';
import { provinces } from '../data/provinces';
import FormationTerrainMatrixModal from './FormationTerrainMatrixModal';
import { 
  Swords, 
  Flame, 
  Shield, 
  Flag, 
  ScrollText, 
  DoorOpen, 
  Lock, 
  Zap, 
  Target, 
  X, 
  Crown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Compass,
  Check,
  Award,
  Layers,
  MapPin,
  BookOpen,
  ArrowUpDown,
  Users
} from 'lucide-react';

interface BattleViewProps {
  gameState: GameState;
  onResolveBattle: (winner: 'attacker' | 'defender') => void;
  onExit: () => void;
}

export default function BattleView5v5({ gameState, onResolveBattle, onExit }: BattleViewProps) {
  const [battleState, setBattleState] = useState<any>(null);
  const [isPreBattleFormation, setIsPreBattleFormation] = useState(true);
  
  // 出戰順序清單 (攻擊方完整出征名冊，包含首發 5 人與後備援軍)
  const [attackingRoster, setAttackingRoster] = useState<string[]>([]);
  const [selectedRosterIdx, setSelectedRosterIdx] = useState<number>(0);
  
  // 各武將個別預設陣形 (依武將名稱對應)
  const [generalFormations, setGeneralFormations] = useState<Record<string, string>>({});
  
  // 戰場當前後備援軍隊列 (進入決戰後使用)
  const [attackerReserves, setAttackerReserves] = useState<string[]>([]);
  const [defenderReserves, setDefenderReserves] = useState<string[]>([]);

  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [targetingMode, setTargetingMode] = useState<'melee' | 'skill' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [logs, setLogs] = useState<CombatLogEntry[]>([]);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showSkillDrawer, setShowSkillDrawer] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showTerrainMatrixModal, setShowTerrainMatrixModal] = useState(false);
  const [damageFloatingText, setDamageFloatingText] = useState<{ id: string; targetId: string; text: string; isCrit?: boolean } | null>(null);
  const [battleOutcome, setBattleOutcome] = useState<{
    winner: 'attacker' | 'defender';
    title: string;
    message: string;
    isWin: boolean;
  } | null>(null);

  // 初始化戰場與部隊
  useEffect(() => {
    if (battleState || !gameState.activeBattle) return;
    
    const battle = gameState.activeBattle;
    const targetProvObj = provinces.find(p => p.id === battle.targetProvinceId);
    const battlefieldTerrain: FormationTerrainType = (targetProvObj?.terrain as FormationTerrainType) || '平地';

    // 初始化攻擊方全軍名冊
    const initAtkRoster = [...battle.attackingGenerals];
    setAttackingRoster(initAtkRoster);

    // 為每位出征武將預設最佳地形陣形
    const initFormMap: Record<string, string> = {};
    initAtkRoster.forEach(gName => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        const availableForms = gen.formations && gen.formations.length > 0 
          ? gen.formations 
          : getGeneralAvailableFormations(gen);
        
        const bestTerrainForm = availableForms.find(f => {
          const eff = getFormationTerrainEffect(f, battlefieldTerrain);
          return eff.rating === 'S';
        }) || availableForms.find(f => {
          const eff = getFormationTerrainEffect(f, battlefieldTerrain);
          return eff.rating === 'A';
        }) || availableForms[0] || '魚鱗';

        initFormMap[gName] = bestTerrainForm;
      }
    });
    setGeneralFormations(initFormMap);

    const terrainDetail = TERRAIN_DETAILS[battlefieldTerrain];

    setBattleState({
      provinceName: targetProvObj?.name || '邊境要塞',
      provinceId: targetProvObj?.id || 1,
      terrain: battlefieldTerrain,
      attackerStrategist: battle.attackerStrategist,
      defenderStrategist: battle.defenderStrategist,
      defendingGeneralsAll: [...battle.defendingGenerals],
      units: [],
      day: 1
    });

    const initLogs = [{ 
      id: 'init', 
      text: `⚔️ 大軍壓境！決戰【${targetProvObj?.name || '城池'}】（${terrainDetail?.symbol || '🌾'}${battlefieldTerrain}地形：${terrainDetail?.name || ''}）！`, 
      type: 'info', 
      timestamp: Date.now() 
    }];
    setLogs(initLogs as any);
  }, [gameState.activeBattle]);

  // 出戰順序調整：上移武將
  const handleMoveRosterUp = (idx: number) => {
    if (idx <= 0) return;
    setAttackingRoster(prev => {
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
    setSelectedRosterIdx(idx - 1);
  };

  // 出戰順序調整：下移武將
  const handleMoveRosterDown = (idx: number) => {
    if (idx >= attackingRoster.length - 1) return;
    setAttackingRoster(prev => {
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
    setSelectedRosterIdx(idx + 1);
  };

  // 生成先攻序列 (納入陣形與地形先攻加成)
  const generateTurnQueue = (units: BattleUnit[]) => {
    const battlefieldTerrain: FormationTerrainType = battleState?.terrain || '平地';
    const queue = units
      .filter(u => u.troops > 0)
      .map(u => {
        const g = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
        const f = getFormationInfo(u.formation || '') || { initiativeMod: 0 };
        const terrainEffect = getFormationTerrainEffect(u.formation || '', battlefieldTerrain);
        const totalInit = (f.initiativeMod || 0) + (terrainEffect.initBonus || 0);
        const speed = g.str * 0.3 + g.int * 0.3 + totalInit;
        return { id: u.id, speed: speed + Math.random() * 10 };
      })
      .sort((a, b) => b.speed - a.speed)
      .map(x => x.id);
    
    setTurnQueue(queue);
    setActiveUnitId(queue[0] || null);
  };

  const addLog = (text: string, type: 'info'|'attack'|'strategy'|'event' = 'info') => {
    setLogs(prev => [...prev, { id: `log_${Date.now()}_${Math.random()}`, text, type, timestamp: Date.now() }]);
  };

  const triggerDamagePopup = (targetId: string, text: string, isCrit: boolean = false) => {
    const popId = `pop_${Date.now()}`;
    setDamageFloatingText({ id: popId, targetId, text, isCrit });
    setTimeout(() => {
      setDamageFloatingText(prev => (prev?.id === popId ? null : prev));
    }, 1200);
  };

  // 確定戰前順序與陣形，正式鳴鼓交戰 (5 vs 5 正式展開)
  const handleConfirmPreBattleFormations = () => {
    if (!battleState) return;

    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
    const newUnits: BattleUnit[] = [];

    // 1. 攻擊方首發 5 人入場，剩餘進入後備援軍隊列 (點 5)
    const startingAttackers = attackingRoster.slice(0, 5);
    const remainingAttackers = attackingRoster.slice(5);
    setAttackerReserves(remainingAttackers);

    startingAttackers.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        const chosenForm = generalFormations[gName] || '魚鱗';
        newUnits.push({
          id: `a_${idx}`,
          generalName: gName,
          isAttacker: true,
          troops: gen.soldiers,
          col: 0,
          row: idx,
          isCommander: idx === 0,
          formation: chosenForm,
          skills: gen.skills || getGeneralAvailableSkills(gen),
          passives: gen.passives || getGeneralPassives(gen),
          stamina: 100,
          status: 'normal',
          hasActed: false
        });
      }
    });

    // 2. 防守方首發 5 人入場，剩餘進入後備援軍隊列 (點 5 & 7)
    const allDefenders = battleState.defendingGeneralsAll || [];
    const startingDefenders = allDefenders.slice(0, 5);
    const remainingDefenders = allDefenders.slice(5);
    setDefenderReserves(remainingDefenders);

    if (startingDefenders.length > 0) {
      startingDefenders.forEach((gName: string, idx: number) => {
        const gen = gameState.generalsData[gName];
        if (gen) {
          const availableForms = gen.formations && gen.formations.length > 0 
            ? gen.formations 
            : getGeneralAvailableFormations(gen);
          
          let chosenEnemyForm = availableForms[0] || '方圓';
          const bestFormForTerrain = availableForms.find(f => {
            const eff = getFormationTerrainEffect(f, battlefieldTerrain);
            return eff.rating === 'S' || eff.rating === 'A';
          });
          if (bestFormForTerrain) chosenEnemyForm = bestFormForTerrain;

          newUnits.push({
            id: `d_${idx}`,
            generalName: gName,
            isAttacker: false,
            troops: gen.soldiers,
            col: 1,
            row: idx,
            isCommander: idx === 0,
            formation: chosenEnemyForm,
            skills: gen.skills || getGeneralAvailableSkills(gen),
            passives: gen.passives || getGeneralPassives(gen),
            stamina: 100,
            status: 'normal',
            hasActed: false
          });
        }
      });
    } else {
      newUnits.push({
        id: 'd_0',
        generalName: '守備兵',
        isAttacker: false,
        troops: 1000,
        col: 1,
        row: 0,
        isCommander: true,
        formation: battlefieldTerrain === '水上' ? '水陣' : '方圓',
        skills: [],
        passives: [],
        stamina: 100,
        status: 'normal',
        hasActed: false
      });
    }

    setBattleState({ ...battleState, units: newUnits });
    setIsPreBattleFormation(false);

    const terrainDetail = TERRAIN_DETAILS[battlefieldTerrain];
    addLog(`🚩 我軍排定陣形與出征順序（順應【${terrainDetail?.symbol || ''}${battleState.terrain}】地勢），號角齊鳴，全軍展開 5 vs 5 決戰！`, 'event');
    if (remainingAttackers.length > 0) {
      addLog(`🛡️ 我軍後備援軍：${remainingAttackers.join('、')} 共 ${remainingAttackers.length} 員大將於後方待命馳援！`, 'info');
    }
    if (remainingDefenders.length > 0) {
      addLog(`🚩 敵方亦有後備援軍：${remainingDefenders.join('、')} 於陣後策應！`, 'info');
    }

    generateTurnQueue(newUnits);
  };

  // 自動替補陣亡將領機制 (點 6：假設敵我武將有人兵力歸0，自動依序帶入下一個武將)
  const processReplacements = (
    currentUnits: BattleUnit[], 
    currentAtkReserves: string[], 
    currentDefReserves: string[]
  ): { updatedUnits: BattleUnit[]; updatedAtkReserves: string[]; updatedDefReserves: string[] } => {
    const battlefieldTerrain: FormationTerrainType = battleState?.terrain || '平地';
    let nextAtkReserves = [...currentAtkReserves];
    let nextDefReserves = [...currentDefReserves];

    const updatedUnits = currentUnits.map((u: BattleUnit) => {
      if (u.troops <= 0) {
        // 攻擊方將領兵力歸 0 -> 帶入攻擊方下一個後備武將
        if (u.isAttacker && nextAtkReserves.length > 0) {
          const nextGenName = nextAtkReserves.shift()!;
          const gen = gameState.generalsData[nextGenName];
          if (gen) {
            const availableForms = gen.formations && gen.formations.length > 0 
              ? gen.formations 
              : getGeneralAvailableFormations(gen);
            const form = generalFormations[nextGenName] || availableForms[0] || '魚鱗';
            
            addLog(`🚩 我軍援將馳援！【${nextGenName}】率領 ${gen.soldiers.toLocaleString()} 兵馬以【${form}陣】接替陣線，火速登場！`, 'event');
            
            return {
              ...u,
              generalName: nextGenName,
              troops: gen.soldiers,
              formation: form,
              skills: gen.skills || getGeneralAvailableSkills(gen),
              passives: gen.passives || getGeneralPassives(gen),
              stamina: 100,
              status: 'normal' as const,
              hasActed: false
            };
          }
        }
        
        // 防守方將領兵力歸 0 -> 帶入防守方下一個後備武將
        if (!u.isAttacker && nextDefReserves.length > 0) {
          const nextGenName = nextDefReserves.shift()!;
          const gen = gameState.generalsData[nextGenName];
          if (gen) {
            const availableForms = gen.formations && gen.formations.length > 0 
              ? gen.formations 
              : getGeneralAvailableFormations(gen);
            
            let chosenEnemyForm = availableForms[0] || '方圓';
            const bestFormForTerrain = availableForms.find(f => {
              const eff = getFormationTerrainEffect(f, battlefieldTerrain);
              return eff.rating === 'S' || eff.rating === 'A';
            });
            if (bestFormForTerrain) chosenEnemyForm = bestFormForTerrain;

            addLog(`🚩 敵方後援登場！【${nextGenName}】率領 ${gen.soldiers.toLocaleString()} 兵馬接替陣線馳援作戰！`, 'event');

            return {
              ...u,
              generalName: nextGenName,
              troops: gen.soldiers,
              formation: chosenEnemyForm,
              skills: gen.skills || getGeneralAvailableSkills(gen),
              passives: gen.passives || getGeneralPassives(gen),
              stamina: 100,
              status: 'normal' as const,
              hasActed: false
            };
          }
        }
      }
      return u;
    });

    setAttackerReserves(nextAtkReserves);
    setDefenderReserves(nextDefReserves);

    return {
      updatedUnits,
      updatedAtkReserves: nextAtkReserves,
      updatedDefReserves: nextDefReserves
    };
  };

  const advanceTurn = (
    currentUnits: BattleUnit[], 
    currentQueue: string[],
    currentAtkRes: string[] = attackerReserves,
    currentDefRes: string[] = defenderReserves
  ) => {
    // 檢查是否有兵力歸 0 的單位需要自動遞補
    const repResult = processReplacements(currentUnits, currentAtkRes, currentDefRes);
    const finalUnits = repResult.updatedUnits;

    const aliveAttackers = finalUnits.filter(u => u.isAttacker && u.troops > 0);
    const aliveDefenders = finalUnits.filter(u => !u.isAttacker && u.troops > 0);

    // 勝利條件判定：全軍陣亡且無後備援軍
    if (aliveAttackers.length === 0 && repResult.updatedAtkReserves.length === 0) {
      addLog('🏴 我方全部將領與後援部隊皆已潰敗，攻城戰役失利！', 'event');
      setTimeout(() => {
        setBattleOutcome({
          winner: 'defender',
          title: '戰役失利・全軍撤退',
          message: `我軍進攻【${battleState?.provinceName || '敵城'}】遭遇頑強抵抗，主力與後備將士傷亡慘重，殘部只得撤回原城休整！`,
          isWin: false
        });
      }, 500);
      return;
    }
    if (aliveDefenders.length === 0 && repResult.updatedDefReserves.length === 0) {
      addLog('🏆 敵軍守城部隊與援軍全數被我軍殲滅，大獲全勝！', 'event');
      setTimeout(() => {
        setBattleOutcome({
          winner: 'attacker',
          title: '戰爭大捷・破城克敵',
          message: `我軍英勇善戰，成功全殲【${battleState?.provinceName || '城池'}】守將與敵方援軍！城池已平定，主攻部隊凱旋進駐！`,
          isWin: true
        });
      }, 500);
      return;
    }

    const nextQueue = currentQueue.slice(1).filter(id => {
      const u = finalUnits.find(x => x.id === id);
      return u && u.troops > 0;
    });

    if (nextQueue.length === 0) {
      generateTurnQueue(finalUnits);
    } else {
      setTurnQueue(nextQueue);
      setActiveUnitId(nextQueue[0]);
    }
    setTargetingMode(null);
    setSelectedSkill(null);
    setShowSkillDrawer(false);
  };

  const handleMeleeAttack = (targetId: string) => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    const targetUnit = battleState.units.find((u: any) => u.id === targetId);
    if (!activeUnit || !targetUnit) return;

    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';

    const atkGen = gameState.generalsData[activeUnit.generalName] || { str: 50, int: 50 };
    const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50, int: 50 };

    const atkForm = getFormationInfo(activeUnit.formation || '') || { atkMod: 0, defMod: 0, initiativeMod: 0 };
    const defForm = getFormationInfo(targetUnit.formation || '') || { atkMod: 0, defMod: 0, initiativeMod: 0 };

    // 結合陣形基礎加成 + 地形相剋加成 (戰力修正 = (地形基礎適性 * 地形佔比係數) + 陣型地形技能加成)
    const atkTerrainMod = calculateFormationTerrainCombatModifier({
      formationName: activeUnit.formation || '魚鱗',
      provinceId: battleState.provinceId,
      general: atkGen
    });
    const defTerrainMod = calculateFormationTerrainCombatModifier({
      formationName: targetUnit.formation || '魚鱗',
      provinceId: battleState.provinceId,
      general: defGen
    });

    const atkMultiplier = (1 + (atkForm.atkMod || 0)) * atkTerrainMod.totalCombatModifier;
    const defMultiplier = (1 + (defForm.defMod || 0)) * defTerrainMod.totalCombatModifier;

    const baseDamage = Math.floor((atkGen.str * atkMultiplier) * (Math.random() * 0.2 + 0.9) * 10);
    const defense = Math.floor((defGen.str * defMultiplier) * 5);
    let damage = Math.max(20, baseDamage - defense);
    
    // 鋒矢/暴擊判定
    const atkTerrainEffect = getFormationTerrainEffect(activeUnit.formation || '', battlefieldTerrain);
    let critChance = activeUnit.formation === '鋒矢' ? 0.30 : 0.15;
    if (atkTerrainEffect.rating === 'S') critChance += 0.10;
    const isCrit = Math.random() < critChance;
    if (isCrit) damage = Math.floor(damage * 1.5);

    let terrainNote = '';
    if (atkTerrainEffect.rating === 'S') {
      terrainNote = `(${TERRAIN_DETAILS[battlefieldTerrain]?.symbol}${atkTerrainEffect.tag})`;
    } else if (atkTerrainEffect.rating === 'D') {
      terrainNote = `(受阻於${battlefieldTerrain})`;
    }

    addLog(`⚔️ 【${activeUnit.generalName}】(${activeUnit.formation}陣) ${terrainNote} 揮軍猛攻 ${targetUnit.generalName} ${isCrit ? '💥(暴擊!)' : ''}，造成 ${damage} 傷害！`, 'attack');
    triggerDamagePopup(targetId, `-${damage}`, isCrit);

    let newUnits = battleState.units.map((u: any) => {
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
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    const targetUnit = battleState.units.find((u: any) => u.id === targetId);
    if (!activeUnit || !targetUnit) return;

    const skillDef = BATTLE_SKILLS[selectedSkill];
    if (!skillDef) return;

    if (activeUnit.stamina < skillDef.cost) {
      addLog(`⚠️ ${activeUnit.generalName} 體力不足，無法施放【${selectedSkill}】！`);
      return;
    }

    const atkGen = gameState.generalsData[activeUnit.generalName] || { str: 50, int: 50 };
    const atkTerrainMod = calculateFormationTerrainCombatModifier({
      formationName: activeUnit.formation || '魚鱗',
      provinceId: battleState.provinceId,
      general: atkGen
    });

    addLog(`🔥 【${activeUnit.generalName}】依仗【${activeUnit.formation}】之陣，施放【${selectedSkill}】！直取 ${targetUnit.generalName}！`, 'strategy');
    
    const stat = skillDef.category === '計謀' ? atkGen.int : atkGen.str;
    const damage = Math.floor(stat * 14 * atkTerrainMod.totalCombatModifier * (Math.random() * 0.35 + 0.85));

    triggerDamagePopup(targetId, `-${damage} 戰法`, true);

    let newUnits = battleState.units.map((u: any) => {
      if (u.id === targetId) {
        return { ...u, troops: Math.max(0, u.troops - damage) };
      }
      if (u.id === activeUnitId) {
        return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost) };
      }
      return u;
    });

    addLog(`💥 戰法命中！對 ${targetUnit.generalName} 造成 ${damage} 點重創！`, 'attack');
    
    setBattleState({ ...battleState, units: newUnits });
    advanceTurn(newUnits, turnQueue);
  };

  const handleDefend = () => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    if (!activeUnit) return;

    const recovery = activeUnit.formation === '方圓' ? 30 : 20;
    addLog(`🛡️ 【${activeUnit.generalName}】採取守勢，全軍嚴防，體力恢復 ${recovery} 點。`, 'info');
    
    const newUnits = battleState.units.map((u: any) => {
      if (u.id === activeUnitId) {
        return { ...u, status: 'defending', stamina: Math.min(100, u.stamina + recovery) };
      }
      return u;
    });

    setBattleState({ ...battleState, units: newUnits });
    advanceTurn(newUnits, turnQueue);
  };

  const handleChangeFormation = (newFormation: string) => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
    const effect = getFormationTerrainEffect(newFormation, battlefieldTerrain);
    
    const strategistName = activeUnit?.isAttacker ? battleState.attackerStrategist : battleState.defenderStrategist;

    if (strategistName) {
      addLog(`🚩 軍師【${strategistName}】揮旗號令！全軍陣勢變更為【${newFormation}】！(適性評級: ${effect.rating}級 - ${effect.tag})`, 'strategy');
      const newUnits = battleState.units.map((u: any) => {
        if (u.isAttacker === activeUnit?.isAttacker) {
          return { ...u, formation: newFormation };
        }
        return u;
      });

      setBattleState({ ...battleState, units: newUnits });
      setShowFormationModal(false);
      advanceTurn(newUnits, turnQueue);
    } else {
      addLog(`🚩 主將【${activeUnit?.generalName}】臨機變陣！本部陣勢變更為【${newFormation}】！(適性評級: ${effect.rating}級 - ${effect.tag})`, 'strategy');
      const newUnits = battleState.units.map((u: any) => {
        if (u.id === activeUnitId) {
          return { ...u, formation: newFormation, stamina: Math.max(0, (u.stamina ?? 100) - 15) };
        }
        return u;
      });

      setBattleState({ ...battleState, units: newUnits });
      setShowFormationModal(false);
      advanceTurn(newUnits, turnQueue);
    }
  };

  const activeUnit = battleState?.units?.find((u: any) => u.id === activeUnitId);
  const isPlayerTurn = activeUnit?.isAttacker;
  const isStrategistPresent = activeUnit?.isAttacker 
    ? !!battleState?.attackerStrategist 
    : !!battleState?.defenderStrategist;

  // AI 自動行動
  useEffect(() => {
    if (!isPreBattleFormation && !isPlayerTurn && activeUnit) {
      const timer = setTimeout(() => {
        const aliveAttackers = battleState.units.filter((u: any) => u.isAttacker && u.troops > 0);
        if (aliveAttackers.length > 0) {
          const target = aliveAttackers[Math.floor(Math.random() * aliveAttackers.length)];
          handleMeleeAttack(target.id);
        } else {
          handleDefend();
        }
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [activeUnitId, isPlayerTurn, isPreBattleFormation]);

  if (!battleState) {
    return (
      <div className="absolute inset-0 bg-[#141210] z-50 p-6 text-white font-serif flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="tracking-widest font-black text-amber-300">兩軍排開陣勢中...</span>
        </div>
      </div>
    );
  }

  const attackerUnits = battleState.units?.filter((u: any) => u.isAttacker) || [];
  const defenderUnits = battleState.units?.filter((u: any) => !u.isAttacker) || [];
  const latestLog = logs[logs.length - 1];

  // ═════════════════════════════════════════════════════════════════
  // 階段 A：進入戰場前 ‧ 決定出戰順序與陣形配置 (點 5)
  // ═════════════════════════════════════════════════════════════════
  if (isPreBattleFormation) {
    const currentSelectedGenName = attackingRoster[selectedRosterIdx] || attackingRoster[0];
    const currentGen = currentSelectedGenName ? gameState.generalsData[currentSelectedGenName] : null;
    const learnedFormations = currentGen 
      ? (currentGen.formations && currentGen.formations.length > 0 ? currentGen.formations : getGeneralAvailableFormations(currentGen))
      : ['魚鱗'];
    const currentChosenFormation = generalFormations[currentSelectedGenName] || '魚鱗';
    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
    const terrainInfo = TERRAIN_DETAILS[battlefieldTerrain];

    // 一鍵全軍陣型預設套用
    const applyArmyPreset = (presetName: string) => {
      const nextMap: Record<string, string> = { ...generalFormations };
      attackingRoster.forEach(gName => {
        const gen = gameState.generalsData[gName];
        const learned = gen 
          ? (gen.formations && gen.formations.length > 0 ? gen.formations : getGeneralAvailableFormations(gen))
          : ['魚鱗'];

        if (presetName === '地形') {
          const sRank = learned.find(f => getFormationTerrainEffect(f, battlefieldTerrain).rating === 'S');
          const aRank = learned.find(f => getFormationTerrainEffect(f, battlefieldTerrain).rating === 'A');
          nextMap[gName] = sRank || aRank || learned[0] || '魚鱗';
        } else if (presetName === '突擊') {
          nextMap[gName] = learned.includes('鋒矢') ? '鋒矢' : (learned.includes('魚鱗') ? '魚鱗' : learned[0]);
        } else if (presetName === '防守') {
          nextMap[gName] = learned.includes('方圓') ? '方圓' : (learned.includes('鶴翼') ? '鶴翼' : learned[0]);
        } else if (presetName === '神速') {
          nextMap[gName] = learned.includes('錐行') ? '錐行' : learned[0];
        } else if (presetName === '專精') {
          nextMap[gName] = learned[0] || '魚鱗';
        }
      });
      setGeneralFormations(nextMap);
    };

    return (
      <div className="absolute inset-0 z-50 flex flex-col font-serif select-none bg-[#191512] text-stone-200 overflow-hidden">
        {/* 頂部 Header */}
        <div className="h-12 bg-[#251e19] border-b-2 border-[#473b30] px-3 sm:px-4 flex justify-between items-center z-30 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <span className="font-black text-base sm:text-lg text-amber-300 tracking-wider">
              戰前軍令 ‧ 出戰順序與陣形配置
            </span>
            <span className="text-xs bg-[#3d3126] border border-[#5c4a3b] text-amber-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              決戰【{battleState.provinceName}】‧ {terrainInfo?.symbol} {battlefieldTerrain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTerrainMatrixModal(true)}
              className="h-7 px-2.5 bg-[#2c221a] hover:bg-[#3d3025] border border-amber-500/60 rounded text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>陣地全鑑</span>
            </button>

            {battleState.attackerStrategist && (
              <span className="text-xs text-amber-300 font-black bg-amber-950/70 border border-amber-600/50 px-2 py-0.5 rounded hidden sm:flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                軍師: {battleState.attackerStrategist}
              </span>
            )}
            <button 
              onClick={onExit}
              className="h-7 px-2.5 bg-[#3a1d1d] hover:bg-[#4d2525] border border-[#6d3030] rounded text-xs font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>撤退</span>
            </button>
          </div>
        </div>

        {/* 戰場地形環境即時情報條 */}
        <div className="bg-[#1f1914] border-b border-[#3b3128] px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-black flex items-center gap-1">
              <span>{terrainInfo?.symbol}</span>
              <span>{battlefieldTerrain}戰場</span>
            </span>
            <span className="text-stone-300 font-bold hidden sm:inline">
              【{terrainInfo?.name}】
            </span>
            <span className="text-stone-400 text-[11px]">
              {terrainInfo?.desc}
            </span>
          </div>
          <div className="text-[11px] text-amber-300/90 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{terrainInfo?.advantageSummary}</span>
          </div>
        </div>

        {/* 內容區：左列出戰順序名單 (點 5) + 右側陣形配置 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden p-2 sm:p-4 gap-3 bg-radial from-[#221c17] to-[#120f0d]">
          {/* 左列：出征武將出戰順序與首發/後援標籤 */}
          <div className="w-full md:w-5/12 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center pb-1 border-b border-[#3b3128]">
              <span className="font-black text-xs text-amber-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                出征出戰順序 (前 5 人首發 ‧ 6~10 人後備援軍)
              </span>
              <span className="text-[10px] text-stone-400 font-bold">可透過 ▲▼ 調整先後</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {attackingRoster.map((gName, idx) => {
                const gen = gameState.generalsData[gName];
                const isSelected = idx === selectedRosterIdx;
                const isStartingFive = idx < 5;
                const chosenForm = generalFormations[gName] || '魚鱗';
                const terrainCompat = getFormationTerrainEffect(chosenForm, battlefieldTerrain);

                return (
                  <div
                    key={gName}
                    onClick={() => setSelectedRosterIdx(idx)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-md ${
                      isSelected
                        ? 'border-amber-400 bg-[#382c21] ring-1 ring-amber-400 scale-[1.01]'
                        : 'border-[#3a3026] bg-[#221b16] hover:border-[#524436] hover:bg-[#2c231d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center ${
                          isStartingFive 
                            ? 'bg-amber-500 text-stone-950 border-amber-300' 
                            : 'bg-stone-800 text-stone-300 border-stone-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      <GeneralAvatar name={gName} size={40} className="shrink-0" />
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-stone-100">{gName}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-black border ${
                            isStartingFive
                              ? 'bg-red-950 border-red-700 text-red-300'
                              : 'bg-sky-950 border-sky-700 text-sky-300'
                          }`}>
                            {isStartingFive ? (idx === 0 ? '首發主帥' : '首發先鋒') : '後備援將'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 flex gap-2 mt-0.5">
                          <span>兵: <strong className="text-sky-300">{gen?.soldiers || 0}</strong></span>
                          <span>武: {gen?.str || 50}</span>
                          <span>智: {gen?.int || 50}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <span className="text-xs font-black px-1.5 py-0.5 rounded border border-amber-500/60 bg-[#16120e] text-amber-300">
                          【{chosenForm}陣】
                        </span>
                        <span className={`text-[9px] px-1 py-0.1 rounded font-black border ${
                          terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                          terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
                          terrainCompat.rating === 'D' ? 'bg-rose-900 text-rose-200 border-rose-600' :
                          'bg-stone-800 text-stone-300 border-stone-600'
                        }`}>
                          {terrainCompat.rating}級
                        </span>
                      </div>

                      {/* 順序上下調整按鈕 */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRosterUp(idx);
                          }}
                          className="p-1 rounded bg-[#2c221a] hover:bg-[#3f3125] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-amber-300"
                          title="往前調整順序"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === attackingRoster.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRosterDown(idx);
                          }}
                          className="p-1 rounded bg-[#2c221a] hover:bg-[#3f3125] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-amber-300"
                          title="往後調整順序"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 一鍵全軍陣形套用快捷按鈕 */}
            <div className="mt-2 p-2.5 bg-[#201914] border border-[#3b3026] rounded-xl">
              <span className="text-[11px] font-black text-stone-300 block mb-1.5">
                ⚡ 全軍一鍵陣形配置方案：
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  onClick={() => applyArmyPreset('地形')}
                  className="px-2 py-1 text-[11px] font-black bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 border border-amber-400 text-white rounded cursor-pointer active:scale-95 shadow"
                  title="依據當前地形自動指派最佳陣形"
                >
                  {terrainInfo?.symbol} 地形最佳
                </button>
                <button
                  onClick={() => applyArmyPreset('突擊')}
                  className="px-2 py-1 text-[11px] font-black bg-[#3b2020] hover:bg-[#522c2c] border border-red-700 text-rose-200 rounded cursor-pointer active:scale-95"
                >
                  ⚔️ 全軍突擊
                </button>
                <button
                  onClick={() => applyArmyPreset('防守')}
                  className="px-2 py-1 text-[11px] font-black bg-[#1f303a] hover:bg-[#2b4452] border border-sky-700 text-sky-200 rounded cursor-pointer active:scale-95"
                >
                  🛡️ 固若金湯
                </button>
                <button
                  onClick={() => applyArmyPreset('神速')}
                  className="px-2 py-1 text-[11px] font-black bg-[#2d3020] hover:bg-[#3f442c] border border-amber-700 text-amber-200 rounded cursor-pointer active:scale-95"
                >
                  🐎 神速突破
                </button>
                <button
                  onClick={() => applyArmyPreset('專精')}
                  className="px-2 py-1 text-[11px] font-black bg-[#2a241f] hover:bg-[#3a322b] border border-stone-500 text-stone-200 rounded cursor-pointer active:scale-95"
                >
                  🎯 名將專精
                </button>
              </div>
            </div>
          </div>

          {/* 右側：選定將領之可選陣形矩陣 */}
          <div className="flex-1 bg-[#201a15] border-2 border-[#3d3126] rounded-xl p-3 flex flex-col justify-between shadow-inner shrink-0">
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-[#3d3126] mb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base text-amber-300">
                    【{currentSelectedGenName}】陣形調配
                  </h3>
                  <span className="text-[10px] text-stone-400 font-bold bg-[#14110e] px-1.5 py-0.5 rounded border border-[#3b3128]">
                    已習得 {learnedFormations.length} 種
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={selectedRosterIdx <= 0}
                    onClick={() => setSelectedRosterIdx(prev => Math.max(0, prev - 1))}
                    className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-stone-300" />
                  </button>
                  <span className="text-xs font-black text-stone-400">
                    {selectedRosterIdx + 1}/{attackingRoster.length}
                  </span>
                  <button
                    disabled={selectedRosterIdx >= attackingRoster.length - 1}
                    onClick={() => setSelectedRosterIdx(prev => Math.min(attackingRoster.length - 1, prev + 1))}
                    className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-stone-300" />
                  </button>
                </div>
              </div>

              {/* 陣形卡片網格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 pr-1">
                {learnedFormations.map(formName => {
                  const formInfo = getFormationInfo(formName);
                  if (!formInfo) return null;
                  const isChosen = currentChosenFormation === formName;
                  const terrainCompat = getFormationTerrainEffect(formName, battlefieldTerrain);

                  // 綜合攻防先攻（基礎 + 地形修正）
                  const totalAtk = Math.round(((formInfo.atkMod || 0) + (terrainCompat.atkBonus || 0)) * 100);
                  const totalDef = Math.round(((formInfo.defMod || 0) + (terrainCompat.defBonus || 0)) * 100);
                  const totalInit = (formInfo.initiativeMod || 0) + (terrainCompat.initBonus || 0);

                  return (
                    <div
                      key={formName}
                      onClick={() => {
                        if (currentSelectedGenName) {
                          setGeneralFormations(prev => ({
                            ...prev,
                            [currentSelectedGenName]: formName
                          }));
                        }
                      }}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                        isChosen
                          ? 'border-amber-400 bg-[#3d2f22] ring-1 ring-amber-400 scale-[1.01]'
                          : 'border-[#382d24] bg-[#181310] hover:border-[#524234] hover:bg-[#241c16]'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-stone-100">{formInfo.name}陣</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                              terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                              terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
                              terrainCompat.rating === 'D' ? 'bg-rose-900 text-rose-200 border-rose-600' :
                              'bg-stone-800 text-stone-300 border-stone-600'
                            }`}>
                              {battlefieldTerrain} {terrainCompat.rating}級 ‧ {terrainCompat.tag}
                            </span>
                          </div>
                          {isChosen && (
                            <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded">
                              ✓ 選定
                            </span>
                          )}
                        </div>

                        {/* 綜合攻防機動數值加成 */}
                        <div className="grid grid-cols-3 gap-1 text-[11px] py-1 px-1.5 rounded bg-[#100d0a] border border-[#2b221b] mb-1.5 font-bold">
                          <span className={totalAtk >= 0 ? 'text-red-400' : 'text-stone-400'}>
                            攻: {totalAtk >= 0 ? `+${totalAtk}%` : `${totalAtk}%`}
                            {terrainCompat.atkBonus !== 0 && (
                              <span className="text-[9px] text-amber-300 font-normal ml-0.5">
                                ({terrainCompat.atkBonus > 0 ? `+${Math.round(terrainCompat.atkBonus * 100)}%` : `${Math.round(terrainCompat.atkBonus * 100)}%`})
                              </span>
                            )}
                          </span>
                          <span className={totalDef >= 0 ? 'text-sky-400' : 'text-stone-400'}>
                            防: {totalDef >= 0 ? `+${totalDef}%` : `${totalDef}%`}
                            {terrainCompat.defBonus !== 0 && (
                              <span className="text-[9px] text-sky-300 font-normal ml-0.5">
                                ({terrainCompat.defBonus > 0 ? `+${Math.round(terrainCompat.defBonus * 100)}%` : `${Math.round(terrainCompat.defBonus * 100)}%`})
                              </span>
                            )}
                          </span>
                          <span className="text-amber-300">
                            先攻: {totalInit >= 0 ? `+${totalInit}` : totalInit}
                          </span>
                        </div>

                        {/* 地形實戰具體效果 */}
                        <p className="text-[11px] text-stone-300 leading-relaxed font-sans mb-1">
                          <strong className="text-amber-300">【實戰發揮】：</strong>
                          {terrainCompat.detailedEffect}
                        </p>
                        <p className="text-[10px] text-stone-500 leading-tight">
                          ※ 陣形專長：{formInfo.specialDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 底部確認按鈕 */}
            <div className="pt-3 border-t border-[#3d3126] flex justify-between items-center shrink-0 mt-2">
              <span className="text-xs text-stone-400 font-bold hidden sm:inline">
                已指定出戰順序與陣形，即刻展開 5 vs 5 決戰！
              </span>
              <button
                onClick={handleConfirmPreBattleFormations}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 border-2 border-red-500 text-white font-black text-sm sm:text-base rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4 text-amber-300" />
                <span>鳴鼓出征 ‧ 進入 5v5 決戰</span>
              </button>
            </div>
          </div>
        </div>

        {/* 陣形 ✕ 地形全鑑 Modal */}
        {showTerrainMatrixModal && (
          <FormationTerrainMatrixModal
            currentTerrain={battleState.terrain}
            currentProvinceName={battleState.provinceName}
            onClose={() => setShowTerrainMatrixModal(false)}
          />
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // 階段 B：正式 5 vs 5 決戰對峙與後備援軍替補 (Active Combat Arena)
  // ═════════════════════════════════════════════════════════════════
  const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
  const terrainInfo = TERRAIN_DETAILS[battlefieldTerrain];

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-serif select-none bg-[#141210] text-stone-200 overflow-hidden">
      {/* 1. 頂部簡約 Header */}
      <div className="h-10 bg-[#1f1a16] border-b border-[#3b3128] px-3 flex justify-between items-center z-30 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-black text-amber-400 text-sm tracking-wider flex items-center gap-1 shrink-0">
            <Swords className="w-3.5 h-3.5 text-amber-500" />
            決戰【{battleState.provinceName}】
          </span>
          <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-600/60 text-[10px] text-amber-300 font-black flex items-center gap-0.5">
            <span>{terrainInfo?.symbol}</span>
            <span>{battlefieldTerrain}</span>
          </span>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400 truncate">
            <span>我軍軍師: <strong className="text-stone-200">{battleState.attackerStrategist || '無'}</strong></span>
            <span>|</span>
            <span>敵軍軍師: <strong className="text-stone-200">{battleState.defenderStrategist || '無'}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 後備援軍提示條 */}
          {(attackerReserves.length > 0 || defenderReserves.length > 0) && (
            <div className="hidden md:flex items-center gap-2 text-[11px] px-2 py-0.5 bg-stone-900 border border-stone-700 rounded text-stone-300">
              <span>我軍待命援將: <strong className="text-sky-300">{attackerReserves.length}</strong> 員</span>
              <span>|</span>
              <span>敵軍待命援將: <strong className="text-rose-300">{defenderReserves.length}</strong> 員</span>
            </div>
          )}

          <button 
            onClick={() => setShowTerrainMatrixModal(true)}
            className="h-7 px-2.5 bg-[#251e18] hover:bg-[#352c24] border border-amber-500/50 rounded text-xs font-bold text-amber-300 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="檢視陣形與地形相剋對照表"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">陣地全鑑</span>
          </button>

          <button 
            onClick={() => setShowLogsModal(true)}
            className="h-7 px-2.5 bg-[#2a241f] hover:bg-[#383029] border border-[#524438] rounded text-xs font-bold text-amber-200 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">戰報</span> ({logs.length})
          </button>

          <button 
            onClick={onExit} 
            className="h-7 px-2.5 bg-[#3a1d1d] hover:bg-[#4d2525] border border-[#6d3030] rounded text-xs font-bold text-rose-200 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>撤退</span>
          </button>
        </div>
      </div>

      {/* 2. 核心對峙戰場 (5 vs 5 雙列並排) */}
      <div className="flex-1 min-h-0 flex flex-col relative px-2 py-1 sm:px-4 sm:py-2" style={{
        background: 'radial-gradient(ellipse at 50% 30%, #261f1a 0%, #141210 100%)'
      }}>
        {/* 對峙陣容區 (5 列並排) */}
        <div className="flex-1 flex gap-2 sm:gap-4 overflow-hidden relative">
          {/* 左列：我軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-sky-400 flex items-center justify-between px-1 pb-0.5 border-b border-sky-900/40">
              <span className="flex items-center gap-1">🔷 我軍部隊</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-sky-300">{attackerReserves.length}</strong> 人
              </span>
            </div>
            {attackerUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={false}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {}}
              />
            ))}
          </div>

          {/* 中央微型分割線 */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-[#4a3f35] to-transparent flex items-center justify-center relative">
            <div className="absolute top-1/2 -translate-y-1/2 bg-[#1a1613] border border-[#4a3f35] text-[9px] font-black text-amber-500 px-1 py-1 rounded-full shadow">
              VS
            </div>
          </div>

          {/* 右列：敵軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-rose-400 flex items-center justify-between px-1 pb-0.5 border-b border-rose-900/40">
              <span className="flex items-center gap-1">🔶 守敵部隊</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-rose-300">{defenderReserves.length}</strong> 人
              </span>
            </div>
            {defenderUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={targetingMode !== null && u.troops > 0}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {
                  if (targetingMode === 'melee') handleMeleeAttack(u.id);
                  if (targetingMode === 'skill') handleSkillAttack(u.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* 即時最新戰況 Ticker (精巧單行提示) */}
        <div className="h-6 mt-1 bg-[#1a1613]/90 border border-[#3b3128] rounded px-2.5 flex items-center justify-between text-xs overflow-hidden shadow-inner">
          <div className="flex items-center gap-1.5 truncate text-stone-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
            <span className="truncate">{latestLog?.text || '兩軍進入交戰態勢...'}</span>
          </div>
          {targetingMode && (
            <span className="text-[11px] font-black text-amber-400 shrink-0 bg-amber-950/60 border border-amber-500/50 px-1.5 py-0.2 rounded animate-pulse">
              點擊敵將攻擊
            </span>
          )}
        </div>

        {/* 選定目標時的浮層覆蓋 (附帶取消鈕) */}
        {targetingMode && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2 bg-[#1c1917]/95 border border-amber-500/80 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm animate-fade-in">
            <Target className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs font-black text-amber-300">
              {targetingMode === 'melee' ? '請點選目標發動攻擊' : `發動【${selectedSkill}】，點選目標`}
            </span>
            <button 
              onClick={() => { setTargetingMode(null); setSelectedSkill(null); }}
              className="ml-2 text-stone-400 hover:text-white p-0.5 hover:bg-stone-800 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. 底部圖形化軍令控制台 (Graphic Command Console) */}
      <div className="bg-[#181411] border-t-2 border-[#3d3227] px-2 py-2 sm:px-4 sm:py-3 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
        {activeUnit && isPlayerTurn ? (
          <div className="flex flex-col gap-2 max-w-2xl mx-auto">
            {/* 行動武將狀態列 */}
            <div className="flex items-center justify-between bg-[#221c17] border border-[#42362b] px-3 py-1.5 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <GeneralAvatar name={activeUnit.generalName} size={28} className="shrink-0 rounded-full" />
                <span className="font-black text-amber-400 text-sm flex items-center gap-1">
                  【{activeUnit.generalName}】
                  {activeUnit.isCommander && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                </span>
                <span className="text-xs bg-[#2e2620] px-1.5 py-0.5 rounded text-amber-200 border border-[#524438] font-bold">
                  陣形: {activeUnit.formation}
                </span>
              </div>

              {/* 體力 SP 條 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-bold flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-sky-400" />
                  體力:
                </span>
                <div className="w-16 sm:w-24 h-2 bg-[#120f0d] rounded-full overflow-hidden border border-[#3b3128]">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, activeUnit.stamina))}%` }}
                  />
                </div>
                <span className="text-xs font-black text-sky-300 min-w-[32px] text-right">
                  {activeUnit.stamina}
                </span>
              </div>
            </div>

            {/* 四大圖形化按鈕 (Graphic Action Command Grid) */}
            <div className="grid grid-cols-4 gap-2">
              {/* 1. 攻擊 */}
              <GraphicCommandButton
                icon={<Swords className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />}
                label="攻擊"
                subLabel="常規進攻"
                theme="rose"
                isActive={targetingMode === 'melee'}
                onClick={() => setTargetingMode(targetingMode === 'melee' ? null : 'melee')}
              />

              {/* 2. 戰法 / 特技 */}
              <GraphicCommandButton
                icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />}
                label="戰法"
                subLabel={activeUnit.skills?.length > 0 ? `${activeUnit.skills.length}種戰技` : '無戰法'}
                theme="sky"
                disabled={!activeUnit.skills || activeUnit.skills.length === 0}
                isActive={showSkillDrawer || targetingMode === 'skill'}
                onClick={() => setShowSkillDrawer(true)}
              />

              {/* 3. 防禦 */}
              <GraphicCommandButton
                icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6 text-stone-300" />}
                label="防禦"
                subLabel="恢復體力"
                theme="stone"
                onClick={handleDefend}
              />

              {/* 4. 佈陣 */}
              <GraphicCommandButton
                icon={<Flag className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />}
                label="佈陣"
                subLabel={isStrategistPresent ? '軍師變陣' : '臨機變陣'}
                theme="emerald"
                disabled={!activeUnit || (!isStrategistPresent && (activeUnit.stamina ?? 100) < 15)}
                onClick={() => setShowFormationModal(true)}
              />
            </div>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center gap-2 text-stone-400 font-bold">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm tracking-wider">敵方將領運籌行動中...</span>
          </div>
        )}
      </div>

      {/* 4. 戰法 / 特技底部選擇抽屜 (Skill Deck Drawer) */}
      {showSkillDrawer && activeUnit && (
        <div className="absolute inset-0 bg-black/75 z-40 flex flex-col justify-end backdrop-blur-xs animate-fade-in">
          <div className="bg-[#1f1915] border-t-2 border-amber-500/60 p-4 rounded-t-2xl max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#3d3227] mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-black text-base text-amber-300">【{activeUnit.generalName}】可用戰法與計謀</span>
              </div>
              <button 
                onClick={() => setShowSkillDrawer(false)}
                className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {activeUnit.skills.map((s: string) => {
                const skillDef = BATTLE_SKILLS[s];
                if (!skillDef) return null;
                const canAfford = activeUnit.stamina >= skillDef.cost;
                return (
                  <button
                    key={s}
                    disabled={!canAfford}
                    onClick={() => {
                      setSelectedSkill(s);
                      setTargetingMode('skill');
                      setShowSkillDrawer(false);
                    }}
                    className={`
                      p-3 rounded-xl border text-left flex flex-col gap-1 transition-all
                      ${canAfford 
                        ? 'bg-[#2a221b] hover:bg-[#382d24] border-[#524436] hover:border-amber-400 cursor-pointer active:scale-98 shadow' 
                        : 'bg-[#181411] border-[#2e2620] text-stone-600 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-black text-sm ${canAfford ? 'text-amber-200' : 'text-stone-500'}`}>
                        {s}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${canAfford ? 'bg-sky-950 text-sky-400 border border-sky-800' : 'bg-stone-900 text-stone-600'}`}>
                        消耗 {skillDef.cost} SP
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {skillDef.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. 變換陣形 Modal (含地形適性顯示) */}
      {showFormationModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[#f3efe9] text-stone-900 p-5 rounded-2xl max-w-xl w-full border-3 border-[#2a221b] shadow-2xl">
            <div className="flex justify-between items-center mb-3 border-b-2 border-stone-300 pb-2">
              <div>
                <h3 className="text-lg font-black text-[#8b1818] flex items-center gap-1.5">
                  <Flag className="w-5 h-5 text-[#8b1818]" />
                  {isStrategistPresent ? '軍師揮旗 ‧ 號令全軍變陣' : `【${activeUnit?.generalName}】臨機變陣 (消耗 15 SP)`}
                </h3>
                <p className="text-xs text-stone-600 font-bold">
                  {isStrategistPresent ? `隨軍軍師：【${battleState.attackerStrategist}】` : `主帥臨陣`} ‧ 當前地形：【{terrainInfo?.symbol} {battlefieldTerrain}】
                </p>
              </div>
              <button 
                onClick={() => setShowFormationModal(false)}
                className="text-stone-500 hover:text-stone-900 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(() => {
                const currentGen = activeUnit?.generalName ? gameState.generalsData[activeUnit.generalName] : null;
                const learned = currentGen
                  ? (currentGen.formations && currentGen.formations.length > 0 ? currentGen.formations : getGeneralAvailableFormations(currentGen))
                  : ['魚鱗'];
                const availableForms = FORMATIONS.filter(f => f.name !== '無陣' && learned.includes(f.name));

                return availableForms.map(form => {
                  const isCurrent = activeUnit?.formation === form.name;
                  const compat = getFormationTerrainEffect(form.name, battlefieldTerrain);

                  return (
                    <button
                      key={form.name}
                      onClick={() => handleChangeFormation(form.name)}
                      disabled={isCurrent}
                      className={`
                        p-2.5 border-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all
                        ${isCurrent 
                          ? 'border-[#8b1818] bg-amber-100/80 text-[#8b1818] font-black cursor-not-allowed' 
                          : 'border-stone-300 bg-white hover:border-[#8b1818] hover:bg-amber-50 cursor-pointer font-bold active:scale-95 shadow-sm'
                        }
                      `}
                    >
                      <span className="text-sm font-black">{form.name}陣</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                        compat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                        compat.rating === 'A' ? 'bg-emerald-700 text-white border-emerald-500' :
                        compat.rating === 'D' ? 'bg-rose-800 text-white border-rose-600' :
                        'bg-stone-200 text-stone-700 border-stone-300'
                      }`}>
                        {compat.rating}級 ‧ {compat.tag}
                      </span>
                      <span className="text-[9px] text-stone-500">{isCurrent ? '當前陣勢' : '點擊變陣'}</span>
                    </button>
                  );
                });
              })()}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowTerrainMatrixModal(true)}
                className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                檢視地形陣形相剋全鑑
              </button>

              <button 
                onClick={() => setShowFormationModal(false)}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 完整戰報紀錄 Modal */}
      {showLogsModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-[#1b1713] border-2 border-[#473b30] text-stone-200 p-4 rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-[#3b3128] mb-3">
              <h3 className="font-black text-amber-400 text-sm flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-amber-500" />
                戰役歷史戰報
              </h3>
              <button onClick={() => setShowLogsModal(false)} className="text-stone-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {logs.map(log => (
                <div key={log.id} className={`p-2 rounded bg-[#241f1a] border border-[#3b3128] ${
                  log.type === 'attack' ? 'text-rose-300' :
                  log.type === 'strategy' ? 'text-sky-300' :
                  log.type === 'event' ? 'text-amber-300 font-bold' : 'text-stone-300'
                }`}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. 陣形 ✕ 地形全鑑 Modal */}
      {showTerrainMatrixModal && (
        <FormationTerrainMatrixModal
          currentTerrain={battleState.terrain}
          currentProvinceName={battleState.provinceName}
          onClose={() => setShowTerrainMatrixModal(false)}
        />
      )}

      {/* 8. 戰爭勝利 (win.jpg) / 戰爭失敗 (lost.jpg) 結算畫面 */}
      {battleOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className={`
            w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border-4 flex flex-col font-serif
            ${battleOutcome.isWin 
              ? 'bg-[#1c1712] border-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.35)]' 
              : 'bg-[#181212] border-rose-900/80 shadow-[0_0_50px_rgba(225,29,72,0.3)]'
            }
          `}>
            {/* 上部：勝利/失敗全幅主題插畫 */}
            <div className="relative w-full h-44 sm:h-56 bg-black overflow-hidden select-none">
              <img 
                src={battleOutcome.isWin ? './assets/win.jpg' : './assets/lost.jpg'} 
                alt={battleOutcome.title}
                className="w-full h-full object-cover object-center brightness-95 filter"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1712] via-transparent to-black/40" />
              
              {/* 頂部徽章與大字標題 */}
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  <div className={`text-xs sm:text-sm font-bold tracking-wider mb-0.5 ${
                    battleOutcome.isWin ? 'text-amber-300' : 'text-rose-400'
                  }`}>
                    {battleOutcome.isWin ? '⚔️ 決戰勝負已分' : '🏴 戰事塵埃落定'}
                  </div>
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-widest ${
                    battleOutcome.isWin 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-100' 
                      : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-red-400 to-stone-200'
                  }`}>
                    {battleOutcome.title}
                  </h2>
                </div>
                <div className={`text-3xl sm:text-4xl p-2 rounded-full border-2 bg-black/60 backdrop-blur-sm ${
                  battleOutcome.isWin ? 'border-amber-400/80 text-amber-400' : 'border-rose-600/80 text-rose-500'
                }`}>
                  {battleOutcome.isWin ? '🏆' : '⚔️'}
                </div>
              </div>
            </div>

            {/* 下部：戰報內文與總結 */}
            <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-[#1c1712] text-[#f4f1ea]">
              <div className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                battleOutcome.isWin 
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-100' 
                  : 'bg-rose-950/30 border-rose-800/30 text-rose-100'
              }`}>
                {battleOutcome.message}
              </div>

              {/* 參戰部隊結算摘要 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#120f0d] p-2.5 rounded-lg border border-[#3b3128] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                    <span>🔷 我方參戰將領</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {attackingRoster.slice(0, 6).map((gName, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-[#1a1613] px-1.5 py-0.5 rounded border border-stone-700/60">
                        <GeneralAvatar name={gName} size={16} />
                        <span className="text-[10px] text-stone-300">{gName}</span>
                      </div>
                    ))}
                    {attackingRoster.length > 6 && (
                      <span className="text-[10px] text-stone-500 self-center">+{attackingRoster.length - 6}將</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#120f0d] p-2.5 rounded-lg border border-[#3b3128] flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                    <span>🔶 守敵部隊</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {battleState?.defendingGeneralsAll?.slice(0, 6).map((gName: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1 bg-[#1a1613] px-1.5 py-0.5 rounded border border-stone-700/60">
                        <GeneralAvatar name={gName} size={16} />
                        <span className="text-[10px] text-stone-300">{gName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 確定按鈕 */}
              <button
                onClick={() => {
                  onResolveBattle(battleOutcome.winner);
                }}
                className={`
                  w-full py-3 rounded-xl font-black text-sm sm:text-base tracking-widest border-2 shadow-lg transition-all cursor-pointer active:scale-98
                  ${battleOutcome.isWin
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    : 'bg-gradient-to-r from-rose-900 to-stone-800 hover:from-rose-800 hover:to-stone-700 text-white border-rose-700 shadow-[0_0_20px_rgba(225,29,72,0.3)]'
                  }
                `}
              >
                {battleOutcome.isWin ? '👑 凱旋進駐（確認）' : '🛡️ 收拾殘部・班師回城（確認）'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 緊湊型武將條塊 (Compact Battle Unit Strip) ───
interface CompactUnitStripProps {
  key?: string;
  unit: BattleUnit;
  gameState: GameState;
  battlefieldTerrain?: FormationTerrainType;
  isActive: boolean;
  isTargetable: boolean;
  floatingText: { id?: string; targetId?: string; text: string; isCrit?: boolean } | null;
  onSelect: () => void;
}

function CompactUnitStrip({ 
  unit, 
  gameState, 
  battlefieldTerrain = '平地',
  isActive, 
  isTargetable, 
  floatingText, 
  onSelect 
}: CompactUnitStripProps) {
  const isDead = unit.troops <= 0;
  const genData = gameState.generalsData[unit.generalName];
  const maxTroops = genData?.soldiers || 1000;
  const hpPercent = Math.max(0, Math.min(100, (unit.troops / maxTroops) * 100));
  const terrainCompat = getFormationTerrainEffect(unit.formation || '魚鱗', battlefieldTerrain);

  return (
    <div 
      onClick={onSelect}
      className={`
        relative h-11 sm:h-12 px-2 py-1 rounded-lg border transition-all select-none flex flex-col justify-between
        ${isDead 
          ? 'bg-[#120f0d]/60 border-[#26201b] opacity-40 grayscale' 
          : unit.isAttacker 
            ? 'bg-[#1d252c]/90 border-[#2a3c4c]' 
            : 'bg-[#2b1e1d]/90 border-[#4a2e2d]'
        }
        ${isActive && !isDead 
          ? 'ring-2 ring-amber-400 border-amber-400 bg-[#2d251d] shadow-[0_0_12px_rgba(251,191,36,0.35)] scale-[1.02] z-10' 
          : ''
        }
        ${isTargetable && !isDead 
          ? 'cursor-pointer ring-2 ring-rose-500 border-rose-500 bg-rose-950/70 hover:scale-105 hover:bg-rose-900/80 animate-pulse z-10' 
          : ''
        }
      `}
    >
      {/* 傷害漂浮文字動效 */}
      {floatingText && (
        <div className={`absolute -top-3 ${unit.isAttacker ? 'left-2' : 'right-2'} z-30 font-black text-sm px-1.5 py-0.5 rounded shadow-lg animate-bounce ${
          floatingText.isCrit ? 'bg-amber-500 text-stone-950 text-base scale-110 ring-2 ring-red-600' : 'bg-red-600 text-white'
        }`}>
          {floatingText.text}
        </div>
      )}

      {/* 目標鎖定小徽標 */}
      {isTargetable && (
        <div className="absolute right-1 top-1 text-[9px] font-black bg-rose-600 text-white px-1 rounded animate-ping">
          擊
        </div>
      )}

      {/* 上排：武將名、主帥、陣形與地形適性 */}
      <div className="flex items-center justify-between leading-none">
        <div className="flex items-center gap-1 min-w-0">
          <GeneralAvatar name={unit.generalName} size={20} className="shrink-0" />
          <span className={`font-black text-xs sm:text-sm truncate ${
            isDead ? 'text-stone-500' : (unit.isAttacker ? 'text-sky-300' : 'text-rose-300')
          }`}>
            {unit.generalName}
          </span>
          {unit.isCommander && (
            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] sm:text-[10px] font-bold bg-[#141210] px-1 py-0.2 rounded border border-[#3b3128] text-amber-200/80">
            {unit.formation}
          </span>
          <span className={`text-[8px] sm:text-[9px] font-black px-1 py-0.1 rounded border ${
            terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
            terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
            terrainCompat.rating === 'D' ? 'bg-rose-950 text-rose-300 border-rose-700' :
            'bg-stone-800 text-stone-400 border-stone-700'
          }`} title={`${battlefieldTerrain}適性: ${terrainCompat.rating}級 (${terrainCompat.tag})`}>
            {terrainCompat.rating}
          </span>
        </div>
      </div>

      {/* 下排：兵力與迷你血條 */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-[#120f0d] rounded-full overflow-hidden border border-[#332b24]">
          <div 
            className={`h-full transition-all duration-300 ${
              isDead ? 'bg-stone-700' :
              hpPercent > 50 ? (unit.isAttacker ? 'bg-sky-400' : 'bg-rose-500') :
              hpPercent > 20 ? 'bg-amber-400' : 'bg-red-600'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <span className={`text-[10px] font-black min-w-[34px] text-right ${isDead ? 'text-stone-600' : 'text-stone-200'}`}>
          {isDead ? '潰' : unit.troops.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── 底部圖形化軍令按鈕 (Graphic Command Button) ───
function GraphicCommandButton({
  icon,
  label,
  subLabel,
  theme,
  disabled = false,
  isActive = false,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  theme: 'rose' | 'sky' | 'stone' | 'emerald';
  disabled?: boolean;
  isActive?: boolean;
  onClick: () => void;
}) {
  const themeStyles = {
    rose: 'from-[#4a1c1c] to-[#2b1212] border-[#7d2e2e] text-rose-200 hover:from-[#5a2424] hover:to-[#381818]',
    sky: 'from-[#1c334a] to-[#12202f] border-[#2f557d] text-sky-200 hover:from-[#244260] hover:to-[#182b3f]',
    stone: 'from-[#332d27] to-[#1f1a16] border-[#594e43] text-stone-200 hover:from-[#403831] hover:to-[#28221d]',
    emerald: 'from-[#1c422f] to-[#122b1f] border-[#2d6e4e] text-emerald-200 hover:from-[#24543c] hover:to-[#173828]'
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        h-14 sm:h-16 rounded-xl border-2 bg-gradient-to-b flex flex-col items-center justify-center gap-0.5 transition-all relative overflow-hidden shadow-md
        ${themeStyles[theme]}
        ${disabled 
          ? 'opacity-35 grayscale cursor-not-allowed' 
          : 'cursor-pointer hover:shadow-lg active:scale-95'
        }
        ${isActive ? 'ring-2 ring-amber-400 scale-98 brightness-115' : ''}
      `}
    >
      <div className="shrink-0">{icon}</div>
      <span className="font-black text-xs sm:text-sm tracking-wide leading-none">{label}</span>
      <span className="text-[9px] opacity-70 leading-none truncate max-w-full px-1">{subLabel}</span>
    </button>
  );
}
