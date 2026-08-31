import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GeneralAvatar } from "./GeneralAvatar";
import { GameState, BattleUnit, BattleUnitStatus, CombatLogEntry, FormationTerrainType } from '../types';
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
import DefenseSetupModal from './DefenseSetupModal';
import PreBattleFormationView from './PreBattleFormationView';
import { 
  Swords, 
  Flame, 
  Shield, 
  Flag, 
  ScrollText, 
  DoorOpen, 
  Zap, 
  Target, 
  X, 
  Crown, 
  Sparkles, 
  Wheat, 
  BookOpen,
  Users,
  ListOrdered,
  Info,
  ChevronRight,
  HeartPulse,
  Activity,
  Layers
} from 'lucide-react';

interface BattleViewProps {
  key?: string | number;
  gameState: GameState;
  onResolveBattle: (winner: 'attacker' | 'defender') => void;
  onExit: () => void;
  onUpdateDefenseDeployment?: (params: {
    defendingGenerals: string[];
    defenderReinforceProvinceId?: number | null;
    defenderGeneralOrigins?: Record<string, number>;
    defenderResourcesDeducted?: Record<number, { gold: number; food: number }>;
  }) => void;
}

function rollTerrainForDay(ratioObj?: { 平地: number; 山嶽: number; 水上: number; 密林: number }): FormationTerrainType {
  const ratio = ratioObj || { 平地: 40, 山嶽: 20, 水上: 20, 密林: 20 };
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const [t, p] of Object.entries(ratio)) {
    cumulative += p;
    if (rand <= cumulative) {
      return t as FormationTerrainType;
    }
  }
  return '平地';
}

export default function BattleView5v5({ 
  gameState, 
  onResolveBattle, 
  onExit,
  onUpdateDefenseDeployment 
}: BattleViewProps) {
  const battle = gameState.activeBattle;
  const isDefense = !!battle?.isDefense;

  // 階段 1: 若為防守戰，先進入「城池禦敵 ‧ 派遣援軍配置」 (需求 1 & 5)
  const [isDefenseSetupPhase, setIsDefenseSetupPhase] = useState<boolean>(isDefense);

  // 階段 2: 出戰順序與陣形配置 (需求 2)
  const [isPreBattleFormation, setIsPreBattleFormation] = useState(true);

  // 雙方全軍名冊
  const [attackingRoster, setAttackingRoster] = useState<string[]>([]);
  const [defendingRoster, setDefendingRoster] = useState<string[]>([]);

  // 各武將個別預設陣形 (依武將名稱對應)
  const [generalFormations, setGeneralFormations] = useState<Record<string, string>>({});

  // 戰場當前後備援軍隊列 (進入決戰後使用)
  const [attackerReserves, setAttackerReserves] = useState<string[]>([]);
  const [defenderReserves, setDefenderReserves] = useState<string[]>([]);

  const [battleState, setBattleState] = useState<any>(null);
  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [targetingMode, setTargetingMode] = useState<'melee' | 'skill' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [logs, setLogs] = useState<CombatLogEntry[]>([]);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showSkillDrawer, setShowSkillDrawer] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showTerrainMatrixModal, setShowTerrainMatrixModal] = useState(false);
  const [showBattlefieldInfoModal, setShowBattlefieldInfoModal] = useState(false);
  const [battlefieldInfoTab, setBattlefieldInfoTab] = useState<'queue' | 'generals'>('queue');
  const [damageFloatingText, setDamageFloatingText] = useState<{ id: string; targetId: string; text: string; isCrit?: boolean } | null>(null);
  const processedTurnRef = useRef<string | null>(null);
  const [battleOutcome, setBattleOutcome] = useState<{
    winner: 'attacker' | 'defender';
    title: string;
    message: string;
    isWin: boolean;
  } | null>(null);

  // 技能類型判定輔助函數
  const isAllySkill = (skillName?: string | null) => {
    return skillName === '治傷' || skillName === '解策' || skillName === '激勵' || skillName === '援軍';
  };

  const isAoeSkill = (skillName?: string | null) => {
    return skillName === '亂射' || skillName === '業火' || skillName === '水龍計' || skillName === '山崩' || skillName === '偽報' || skillName === '援軍';
  };

  // 初始化戰場基礎數據
  useEffect(() => {
    if (!battle) return;

    const targetProvObj = provinces.find(p => p.id === battle.targetProvinceId);
    const battlefieldTerrain: FormationTerrainType = rollTerrainForDay(targetProvObj?.terrainRatio);

    // 守方城池庫存糧食 (需求 4: 玩家是防守端，主城軍糧全部攜帶)
    const defenderProvState = gameState.provincesData[battle.targetProvinceId];
    const initialDefenderFood = defenderProvState?.food ?? 5000;

    const initAtkRoster = [...battle.attackingGenerals];
    const initDefRoster = [...battle.defendingGenerals];
    setAttackingRoster(initAtkRoster);
    setDefendingRoster(initDefRoster);

    // 為所有登場武將預設最佳地形陣形
    const initFormMap: Record<string, string> = {};
    [...initAtkRoster, ...initDefRoster].forEach(gName => {
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
      attackerFood: battle.attackerFood ?? 3000,
      defenderFood: initialDefenderFood,
      units: [],
      day: 1
    });

    const initLogs = [{ 
      id: 'init', 
      text: `⚔️ 大軍壓境！決戰【${targetProvObj?.name || '城池'}】（第 1 天，${terrainDetail?.symbol || '🌾'}${battlefieldTerrain}地形：${terrainDetail?.name || ''}）！`, 
      type: 'info', 
      timestamp: Date.now() 
    }];
    setLogs(initLogs as any);
  }, [gameState.activeBattle]);

  // 處理防守援軍配置確認 (需求 1, 4, 5)
  const handleConfirmDefenseSetup = (setup: {
    defendingGenerals: string[];
    defenderReinforceProvinceId: number | null;
    reinforceGold: number;
    reinforceFood: number;
    defenderGeneralOrigins: Record<string, number>;
    defenderResourcesDeducted: Record<number, { gold: number; food: number }>;
    totalDefendingFood: number;
    totalDefendingGold: number;
  }) => {
    setDefendingRoster(setup.defendingGenerals);

    // 為新增的援軍武將預設陣形
    const nextFormMap = { ...generalFormations };
    const battlefieldTerrain: FormationTerrainType = battleState?.terrain || '平地';
    setup.defendingGenerals.forEach(gName => {
      if (!nextFormMap[gName]) {
        const gen = gameState.generalsData[gName];
        if (gen) {
          const forms = gen.formations && gen.formations.length > 0 ? gen.formations : getGeneralAvailableFormations(gen);
          const bestF = forms.find(f => getFormationTerrainEffect(f, battlefieldTerrain).rating === 'S') || forms[0] || '方圓';
          nextFormMap[gName] = bestF;
        }
      }
    });
    setGeneralFormations(nextFormMap);

    // 更新防守方總糧食 (守城全帶 + 援軍攜帶 - 需求 3 & 4)
    setBattleState((prev: any) => ({
      ...prev,
      defenderFood: setup.totalDefendingFood
    }));

    if (onUpdateDefenseDeployment) {
      onUpdateDefenseDeployment({
        defendingGenerals: setup.defendingGenerals,
        defenderReinforceProvinceId: setup.defenderReinforceProvinceId,
        defenderGeneralOrigins: setup.defenderGeneralOrigins,
        defenderResourcesDeducted: setup.defenderResourcesDeducted
      });
    }

    setIsDefenseSetupPhase(false);
    setIsPreBattleFormation(true);
  };

  const addLog = (text: string, type: CombatLogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: `log_${Date.now()}_${Math.random()}`, text, type, timestamp: Date.now() }]);
  };

  const triggerDamagePopup = (targetId: string, text: string, isCrit?: boolean) => {
    setDamageFloatingText({ id: `pop_${Date.now()}`, targetId, text, isCrit });
    setTimeout(() => setDamageFloatingText(null), 1000);
  };

  // 生成先攻佇列
  const generateTurnQueue = (units: BattleUnit[], battlefieldTerrain: FormationTerrainType) => {
    const sorted = [...units]
      .filter(u => u.troops > 0)
      .map(u => {
        const gen = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
        const formInfo = getFormationInfo(u.formation || '') || { initiativeMod: 0 };
        const terrainEffect = getFormationTerrainEffect(u.formation || '', battlefieldTerrain);
        const totalInitiative = gen.str + (formInfo.initiativeMod || 0) + (terrainEffect.initBonus || 0);
        return { ...u, effectiveInitiative: totalInitiative };
      })
      .sort((a, b) => (b.effectiveInitiative || 0) - (a.effectiveInitiative || 0));

    const queueIds = sorted.map(u => u.id);
    setTurnQueue(queueIds);
    setActiveUnitId(queueIds[0] || null);
  };

  // 確認排定陣形與順序，正式啟動 5v5 決戰 (需求 2)
  const handleConfirmPreBattleFormations = () => {
    if (!battleState) return;

    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';

    // 攻擊方：前 5 人首發，6 人以上進入後備名冊
    const startingAttackers = attackingRoster.slice(0, 5);
    const remainingAttackers = attackingRoster.slice(5);
    setAttackerReserves(remainingAttackers);

    // 防守方：前 5 人首發，6 人以上進入後備名冊 (需求 2)
    const startingDefenders = defendingRoster.slice(0, 5);
    const remainingDefenders = defendingRoster.slice(5);
    setDefenderReserves(remainingDefenders);

    const newUnits: BattleUnit[] = [];

    // 建立 5 名攻擊方首發單位
    startingAttackers.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (!gen) return;
      const chosenForm = generalFormations[gName] || '魚鱗';
      newUnits.push({
        id: `atk_${idx}`,
        generalName: gName,
        troops: gen.soldiers,
        maxTroops: gen.soldiers,
        isAttacker: true,
        col: 0,
        row: idx,
        isCommander: idx === 0,
        formation: chosenForm,
        skills: gen.skills || getGeneralAvailableSkills(gen),
        stamina: 100,
        morale: (gen as any).morale ?? 100,
        training: gen.training ?? 80,
        status: 'normal',
        hasActed: false
      });
    });

    // 建立 5 名防守方首發單位
    startingDefenders.forEach((gName, idx) => {
      const gen = gameState.generalsData[gName];
      if (!gen) return;
      const chosenForm = generalFormations[gName] || '方圓';
      newUnits.push({
        id: `def_${idx}`,
        generalName: gName,
        troops: gen.soldiers,
        maxTroops: gen.soldiers,
        isAttacker: false,
        col: 1,
        row: idx,
        isCommander: idx === 0,
        formation: chosenForm,
        skills: gen.skills || getGeneralAvailableSkills(gen),
        stamina: 100,
        morale: (gen as any).morale ?? 100,
        training: gen.training ?? 80,
        status: 'normal',
        hasActed: false
      });
    });

    setBattleState({ ...battleState, units: newUnits });
    setIsPreBattleFormation(false);

    const terrainDetail = TERRAIN_DETAILS[battlefieldTerrain];
    addLog(`🚩 兩軍排定出征順序與陣形（地勢【${terrainDetail?.symbol || ''}${battleState.terrain}】），號角齊鳴，展開 5 vs 5 決戰！`, 'event');
    if (isDefense) {
      if (remainingDefenders.length > 0) {
        addLog(`🛡️ 我軍後備援將：${remainingDefenders.join('、')} 共 ${remainingDefenders.length} 員大將於後方待命馳援！`, 'info');
      }
    } else {
      if (remainingAttackers.length > 0) {
        addLog(`🛡️ 我軍後備援將：${remainingAttackers.join('、')} 共 ${remainingAttackers.length} 員大將於後方待命馳援！`, 'info');
      }
    }

    generateTurnQueue(newUnits, battlefieldTerrain);
  };

  // 自動替補陣亡將領機制 (需求 2: 5vs5 陣亡時依序替補登場)
  const processReplacements = (
    currentUnits: BattleUnit[], 
    currentAtkReserves: string[], 
    currentDefReserves: string[]
  ) => {
    const battlefieldTerrain: FormationTerrainType = battleState?.terrain || '平地';
    let nextAtkReserves = [...currentAtkReserves];
    let nextDefReserves = [...currentDefReserves];
    const newlyAddedUnitIds: string[] = [];

    const updatedUnits = currentUnits.map((u: BattleUnit) => {
      if (u.troops <= 0) {
        // 攻擊方陣亡 -> 帶入攻擊方下一個後備武將
        if (u.isAttacker && nextAtkReserves.length > 0) {
          const nextGenName = nextAtkReserves.shift()!;
          const gen = gameState.generalsData[nextGenName];
          if (gen) {
            const form = generalFormations[nextGenName] || '魚鱗';
            const factionText = isDefense ? '敵方後援' : '我軍援將';
            addLog(`🚩 ${factionText}馳援登場！【${nextGenName}】率領 ${gen.soldiers.toLocaleString()} 兵馬以【${form}陣】火速接替陣線！`, 'event');
            newlyAddedUnitIds.push(u.id);
            
            return {
              ...u,
              generalName: nextGenName,
              troops: gen.soldiers,
              maxTroops: gen.soldiers,
              formation: form,
              skills: gen.skills || getGeneralAvailableSkills(gen),
              stamina: 100,
              morale: (gen as any).morale ?? 100,
              training: gen.training ?? 80,
              status: 'normal' as const,
              hasActed: false
            };
          }
        }
        
        // 防守方陣亡 -> 帶入防守方下一個後備武將 (需求 2)
        if (!u.isAttacker && nextDefReserves.length > 0) {
          const nextGenName = nextDefReserves.shift()!;
          const gen = gameState.generalsData[nextGenName];
          if (gen) {
            const form = generalFormations[nextGenName] || '方圓';
            const factionText = isDefense ? '我軍援將' : '敵方後援';
            addLog(`🚩 ${factionText}馳援登場！【${nextGenName}】率領 ${gen.soldiers.toLocaleString()} 兵馬以【${form}陣】火速接替陣線！`, 'event');
            newlyAddedUnitIds.push(u.id);

            return {
              ...u,
              generalName: nextGenName,
              troops: gen.soldiers,
              maxTroops: gen.soldiers,
              formation: form,
              skills: gen.skills || getGeneralAvailableSkills(gen),
              stamina: 100,
              morale: (gen as any).morale ?? 100,
              training: gen.training ?? 80,
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
      updatedDefReserves: nextDefReserves,
      newlyAddedUnitIds
    };
  };

  // 回合推進與每日糧草消耗結算 (需求 3: 修正戰場兵糧顯示與每日扣除)
  const advanceTurn = (
    currentUnits: BattleUnit[], 
    currentQueue: string[],
    currentAtkRes: string[] = attackerReserves,
    currentDefRes: string[] = defenderReserves
  ) => {
    const repResult = processReplacements(currentUnits, currentAtkRes, currentDefRes);
    const finalUnits = repResult.updatedUnits;

    const aliveAttackers = finalUnits.filter(u => u.isAttacker && u.troops > 0);
    const aliveDefenders = finalUnits.filter(u => !u.isAttacker && u.troops > 0);

    // 勝利條件判定：全軍陣亡且無後備援軍
    if (aliveAttackers.length === 0 && repResult.updatedAtkReserves.length === 0) {
      addLog(isDefense ? '🏆 敵方進攻部隊全數被殲滅，守城大捷！' : '🏴 我方全部將領與後援部隊皆已潰敗，攻城戰役失利！', 'event');
      setTimeout(() => {
        setBattleOutcome({
          winner: 'defender',
          title: isDefense ? '防守成功・固若金湯' : '戰役失利・全軍撤退',
          message: isDefense 
            ? `來犯之敵遭遇我方頑強抵抗，傷亡殆盡！【${battleState?.provinceName || '本城'}】安然無恙！`
            : `我軍進攻【${battleState?.provinceName || '敵城'}】遭遇頑強抵抗，主力與後備將士傷亡慘重，殘部只得撤回原城休整！`,
          isWin: isDefense
        });
      }, 500);
      return;
    }
    if (aliveDefenders.length === 0 && repResult.updatedDefReserves.length === 0) {
      addLog(isDefense ? '💀 我方守城部隊與援軍全數陣亡，城池陷落...' : '🏆 敵軍守城部隊與援軍全數被我軍殲滅，破城大捷！', 'event');
      setTimeout(() => {
        setBattleOutcome({
          winner: 'attacker',
          title: isDefense ? '城池陷落・全軍覆沒' : '戰爭大捷・破城克敵',
          message: isDefense 
            ? `我方守城部隊與援軍已全數陣亡，無力回天...【${battleState?.provinceName || '城池'}】落入敵軍手中！`
            : `我軍英勇善戰，成功全殲【${battleState?.provinceName || '城池'}】守將與援軍！城池已平定，主攻部隊凱旋進駐！`,
          isWin: !isDefense
        });
      }, 500);
      return;
    }

    const nextQueue = currentQueue.slice(1).filter(id => {
      const u = finalUnits.find(x => x.id === id);
      return u && u.troops > 0;
    });

    // 若有新馳援登場的武將且不在後續佇列中，將其加入佇列以在今日參與作戰
    if (repResult.newlyAddedUnitIds && repResult.newlyAddedUnitIds.length > 0) {
      repResult.newlyAddedUnitIds.forEach(id => {
        if (!nextQueue.includes(id)) {
          nextQueue.push(id);
        }
      });
    }

    if (nextQueue.length === 0) {
      // 每日回合結束，推進至下一天
      const nextDay = (battleState.day || 1) + 1;

      // 30 天上限判定
      if (nextDay > 30) {
        addLog(`⌛ 兩軍相持已達 30 天上限！攻城部隊久攻不下退兵回師！`, 'event');
        setTimeout(() => {
          setBattleOutcome({
            winner: 'defender',
            title: '30 天守城大捷・攻方退兵',
            message: `兩軍於【${battleState?.provinceName || '城池'}】堅守苦戰 30 天未分勝負！攻方部隊耗盡時限班師撤退，守城成功！`,
            isWin: isDefense
          });
        }, 500);
        return;
      }

      // 每日糧食消耗與士氣影響 (需求 3)
      const atkTroopsTotal = aliveAttackers.reduce((sum, u) => sum + u.troops, 0);
      const defTroopsTotal = aliveDefenders.reduce((sum, u) => sum + u.troops, 0);

      const atkFoodCons = Math.max(10, Math.ceil(atkTroopsTotal * 0.03));
      const defFoodCons = Math.max(10, Math.ceil(defTroopsTotal * 0.03));

      const newAtkFood = Math.max(0, (battleState.attackerFood ?? 3000) - atkFoodCons);
      const newDefFood = Math.max(0, (battleState.defenderFood ?? 5000) - defFoodCons);

      const atkStarving = newAtkFood <= 0;
      const defStarving = newDefFood <= 0;

      const updatedUnitsWithMorale = finalUnits.map(u => {
        let m = u.morale ?? 100;
        let t = u.troops;
        if (u.isAttacker && atkStarving) {
          m = Math.max(0, m - 15);
          t = Math.max(1, Math.floor(t * 0.95)); // 斷糧逃兵
        }
        if (!u.isAttacker && defStarving) {
          m = Math.max(0, m - 15);
          t = Math.max(1, Math.floor(t * 0.95)); // 斷糧逃兵
        }
        return { ...u, morale: m, troops: t };
      });

      // 每日戰場地形依城池地形比例隨機變更
      const targetProvObj = provinces.find(p => p.id === battleState.provinceId);
      const nextTerrain = rollTerrainForDay(targetProvObj?.terrainRatio);
      const terrainDetail = TERRAIN_DETAILS[nextTerrain];

      addLog(`📅 【第 ${nextDay} 天】開戰！戰場地勢移轉為【${terrainDetail?.symbol || ''}${nextTerrain}】！`, 'event');
      
      if (atkStarving) {
        addLog(isDefense ? `⚠️ 敵方攻軍糧草罄盡！部隊缺糧恐慌，士氣大跌 15 點並出現逃兵！` : `⚠️ 我軍糧草罄盡！部隊缺糧恐慌，全軍士氣大跌 15 點並出現逃兵！`, 'attack');
      }
      if (defStarving) {
        addLog(isDefense ? `⚠️ 我方守軍糧草罄盡！部隊缺糧恐慌，全軍士氣大跌 15 點並出現逃兵！` : `⚠️ 敵方守軍糧草罄盡！部隊缺糧恐慌，敵軍士氣大跌 15 點並出現逃兵！`, 'strategy');
      }

      setBattleState((prev: any) => ({
        ...prev,
        day: nextDay,
        terrain: nextTerrain,
        attackerFood: newAtkFood,
        defenderFood: newDefFood,
        units: updatedUnitsWithMorale
      }));

      generateTurnQueue(updatedUnitsWithMorale, nextTerrain);
    } else {
      setBattleState((prev: any) => ({
        ...prev,
        units: finalUnits
      }));
      setTurnQueue(nextQueue);
      setActiveUnitId(nextQueue[0]);
    }
    setTargetingMode(null);
    setSelectedSkill(null);
    setShowSkillDrawer(false);
  };

  // 常規近戰攻擊
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

    const atkMoraleEff = (activeUnit.morale ?? 100) / 100;
    const atkTrainEff = (50 + (activeUnit.training ?? 100) / 2) / 100;
    const atkEff = atkMoraleEff * atkTrainEff;

    const defMoraleEff = (targetUnit.morale ?? 100) / 100;
    const defTrainEff = (50 + (targetUnit.training ?? 100) / 2) / 100;
    const defEff = defMoraleEff * defTrainEff;

    const atkMultiplier = (1 + (atkForm.atkMod || 0)) * atkTerrainMod.totalCombatModifier * atkEff;
    const defMultiplier = (1 + (defForm.defMod || 0)) * defTerrainMod.totalCombatModifier * defEff;

    const baseDamage = Math.floor((atkGen.str * atkMultiplier) * (Math.random() * 0.2 + 0.9) * 4);
    const defense = Math.floor((defGen.str * defMultiplier) * 2);
    let damage = Math.max(20, baseDamage - defense);
    
    // 狀態修正 (防禦減傷 35%, 混亂增傷 25%, 鼓舞攻擊+25%, 恐慌攻擊-25%)
    let statusMod = 1.0;
    if (activeUnit.status === 'moraled') statusMod *= 1.25;
    if (activeUnit.status === 'panicked') statusMod *= 0.75;
    if (targetUnit.status === 'defending') statusMod *= 0.65;
    if (targetUnit.status === 'confused') statusMod *= 1.25;
    damage = Math.floor(damage * statusMod);

    // 鋒矢 / 暴擊判定
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
      if (u.id === activeUnitId) {
        return { ...u, stamina: Math.max(0, u.stamina - 10), hasActed: true };
      }
      return u;
    });

    advanceTurn(newUnits, turnQueue);
  };

  // 施放戰法特技 (支援單體敵軍、群體敵軍、友軍單體、友軍全體等全 24 種戰法)
  const handleSkillAttack = (targetId?: string) => {
    if (!battleState || !activeUnitId || !selectedSkill) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    const skillDef = BATTLE_SKILLS[selectedSkill];
    if (!activeUnit || !skillDef) return;

    if (activeUnit.stamina < skillDef.cost) {
      addLog(`⚠️ 體力不足！無法發動【${skillDef.name}】（需 ${skillDef.cost} 點體力，當前體力 ${activeUnit.stamina}）`, 'info');
      return;
    }

    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
    const atkGen = gameState.generalsData[activeUnit.generalName] || { str: 50, int: 50, soldiers: 1000 };
    const allyUnits = battleState.units.filter((u: any) => u.isAttacker === activeUnit.isAttacker && u.troops > 0);
    const enemyUnits = battleState.units.filter((u: any) => u.isAttacker !== activeUnit.isAttacker && u.troops > 0);

    // 目標部隊判定
    let targetUnit = targetId ? battleState.units.find((u: any) => u.id === targetId) : null;
    if (!targetUnit && !isAoeSkill(selectedSkill)) {
      // 若單體戰法未帶 targetId，預設第一個有效目標
      targetUnit = isAllySkill(selectedSkill) ? allyUnits[0] : enemyUnits[0];
    }

    let updatedUnits = [...battleState.units];

    // ====== 1. 計謀系：友軍增益與治療 ======
    if (selectedSkill === '治傷') {
      if (!targetUnit) return;
      const genMax = gameState.generalsData[targetUnit.generalName]?.soldiers || targetUnit.maxTroops || 1000;
      const healAmount = Math.floor(genMax * 0.25 + atkGen.int * 3.0);
      const newTroops = Math.min(genMax, targetUnit.troops + healAmount);
      const actualHealed = newTroops - targetUnit.troops;

      addLog(`🌿【妙手回春】${activeUnit.generalName} 施展【治傷】，為 ${targetUnit.generalName} 救治傷員，恢復 ${actualHealed} 兵力，士氣 +10！`, 'passive');
      triggerDamagePopup(targetUnit.id, `+${actualHealed}`, false);

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.id === targetUnit.id && u.id !== activeUnitId) {
          return { ...u, troops: newTroops, morale: Math.min(120, (u.morale ?? 100) + 10) };
        }
        if (u.id === activeUnitId && u.id !== targetUnit.id) {
          return { ...u, stamina: Math.max(0, (u.stamina ?? 100) - skillDef.cost), hasActed: true };
        }
        if (u.id === activeUnitId && u.id === targetUnit.id) {
          return { 
            ...u, 
            troops: newTroops, 
            morale: Math.min(120, (u.morale ?? 100) + 10), 
            stamina: Math.max(0, (u.stamina ?? 100) - skillDef.cost), 
            hasActed: true 
          };
        }
        return u;
      });
    } else if (selectedSkill === '援軍') {
      addLog(`🚩【義勇來援！】${activeUnit.generalName} 呼叫後方輜重隊，我方在場存活全員恢復 20% 兵力與大量傷兵，全體士氣 +10！`, 'passive');
      
      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker === activeUnit.isAttacker && u.troops > 0) {
          const gMax = gameState.generalsData[u.generalName]?.soldiers || u.maxTroops || 1000;
          const healAmt = Math.floor(gMax * 0.20 + atkGen.int * 2.2);
          const newT = Math.min(gMax, u.troops + healAmt);
          triggerDamagePopup(u.id, `+${newT - u.troops}`, false);
          const isCaster = u.id === activeUnitId;
          return { 
            ...u, 
            troops: newT, 
            morale: Math.min(120, (u.morale ?? 100) + 10),
            stamina: isCaster ? Math.max(0, (u.stamina ?? 100) - skillDef.cost) : (u.stamina ?? 100),
            hasActed: isCaster ? true : u.hasActed
          };
        }
        return u;
      });
    } else if (selectedSkill === '解策') {
      if (!targetUnit) return;
      addLog(`✨【神機妙算】${activeUnit.generalName} 施展【解策】，為 ${targetUnit.generalName} 驅散一切混亂、著火與恐慌負面狀態，恢復 30 點體力！`, 'passive');
      triggerDamagePopup(targetUnit.id, `+30體力`, false);

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.id === targetUnit.id && u.id !== activeUnitId) {
          return { ...u, status: 'normal', stamina: Math.min(100, (u.stamina ?? 100) + 30) };
        }
        if (u.id === activeUnitId && u.id !== targetUnit.id) {
          return { ...u, stamina: Math.max(0, (u.stamina ?? 100) - skillDef.cost), hasActed: true };
        }
        if (u.id === activeUnitId && u.id === targetUnit.id) {
          return { 
            ...u, 
            status: 'normal', 
            stamina: Math.min(100, Math.max(0, (u.stamina ?? 100) - skillDef.cost) + 30), 
            hasActed: true 
          };
        }
        return u;
      });
    } else if (selectedSkill === '激勵') {
      const finalTarget = targetUnit || activeUnit;
      addLog(`🎺【全軍激勵！】${activeUnit.generalName} 擂響戰鼓，激勵 ${finalTarget.generalName} 進入【鼓舞】狀態 (+15士氣, +35體力, 攻擊提升 25%)！`, 'passive');
      triggerDamagePopup(finalTarget.id, `+35體力`, false);

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.id === finalTarget.id && u.id !== activeUnitId) {
          return { ...u, status: 'moraled', stamina: Math.min(100, (u.stamina ?? 100) + 35), morale: Math.min(120, (u.morale ?? 100) + 15) };
        }
        if (u.id === activeUnitId && u.id !== finalTarget.id) {
          return { ...u, stamina: Math.max(0, (u.stamina ?? 100) - skillDef.cost), hasActed: true };
        }
        if (u.id === activeUnitId && u.id === finalTarget.id) {
          return { 
            ...u, 
            status: 'moraled', 
            stamina: Math.min(100, Math.max(0, (u.stamina ?? 100) - skillDef.cost) + 35), 
            morale: Math.min(120, (u.morale ?? 100) + 15), 
            hasActed: true 
          };
        }
        return u;
      });
    }

    // ====== 2. 計謀系：敵全體 AoE 戰法 ======
    else if (selectedSkill === '業火') {
      const terrainMult = battlefieldTerrain === '密林' ? 1.35 : battlefieldTerrain === '平地' ? 1.15 : 1.0;
      addLog(`🔥【業火燎原！】${activeUnit.generalName} 祭起滔天大火，火海席捲敵方全軍（平地 +15%/密林 +35%）！`, 'strategy');

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker !== activeUnit.isAttacker && u.troops > 0) {
          const dGen = gameState.generalsData[u.generalName] || { int: 50 };
          let defMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
          let atkMod = activeUnit.status === 'moraled' ? 1.25 : activeUnit.status === 'panicked' ? 0.75 : 1.0;
          const dmg = Math.max(50, Math.floor((atkGen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * defMod + Math.random() * 40));
          triggerDamagePopup(u.id, `-${dmg}`, true);
          const willBurn = Math.random() < 0.55;
          if (willBurn) addLog(`🔥【大火蔓延】${u.generalName} 部隊遭受烈火焚身，陷入【著火】狀態！`, 'strategy');
          return { 
            ...u, 
            troops: Math.max(0, u.troops - dmg), 
            morale: Math.max(0, (u.morale ?? 100) - 10),
            status: willBurn ? 'burning' : u.status
          };
        }
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    } else if (selectedSkill === '水龍計') {
      const terrainMult = battlefieldTerrain === '水上' ? 1.50 : 1.0;
      addLog(`🌊【水龍巨嘯！】${activeUnit.generalName} 引動狂濤怒瀾，巨浪猛烈沖擊敵方全軍（水上地形威力加乘 50%）！`, 'strategy');

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker !== activeUnit.isAttacker && u.troops > 0) {
          const dGen = gameState.generalsData[u.generalName] || { int: 50 };
          let defMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
          let atkMod = activeUnit.status === 'moraled' ? 1.25 : activeUnit.status === 'panicked' ? 0.75 : 1.0;
          const dmg = Math.max(60, Math.floor((atkGen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * defMod + Math.random() * 50));
          triggerDamagePopup(u.id, `-${dmg}`, true);
          return { ...u, troops: Math.max(0, u.troops - dmg), morale: Math.max(0, (u.morale ?? 100) - 12) };
        }
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    } else if (selectedSkill === '山崩') {
      const terrainMult = battlefieldTerrain === '山嶽' ? 1.50 : 1.0;
      addLog(`⛰️【山崩地裂！】${activeUnit.generalName} 撬動山崖萬鈞巨石，滾滾巨石砸向敵方全軍（山嶽地形威力加乘 50%）！`, 'strategy');

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker !== activeUnit.isAttacker && u.troops > 0) {
          const dGen = gameState.generalsData[u.generalName] || { int: 50 };
          let defMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
          let atkMod = activeUnit.status === 'moraled' ? 1.25 : activeUnit.status === 'panicked' ? 0.75 : 1.0;
          const dmg = Math.max(60, Math.floor((atkGen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * defMod + Math.random() * 50));
          triggerDamagePopup(u.id, `-${dmg}`, true);
          return { ...u, troops: Math.max(0, u.troops - dmg), morale: Math.max(0, (u.morale ?? 100) - 15) };
        }
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    } else if (selectedSkill === '偽報') {
      addLog(`📢【偽報四起！】${activeUnit.generalName} 散播假軍情，敵全軍軍心大亂，士氣狂跌！`, 'strategy');

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker !== activeUnit.isAttacker && u.troops > 0) {
          triggerDamagePopup(u.id, `士氣-20`, false);
          const willPanic = Math.random() < 0.55;
          if (willPanic) addLog(`😨【軍心動搖】${u.generalName} 誤信偽報陷入【恐慌】狀態！`, 'strategy');
          return { 
            ...u, 
            morale: Math.max(0, (u.morale ?? 100) - 20), 
            stamina: Math.max(0, (u.stamina ?? 100) - 15),
            status: willPanic ? 'panicked' : u.status
          };
        }
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    }

    // ====== 3. 物理系：敵全體 AoE 戰法 (亂射) ======
    else if (selectedSkill === '亂射') {
      addLog(`🏹【萬箭齊發！】${activeUnit.generalName} 一聲令下，漫天箭雨覆蓋敵方全軍！`, 'archery');

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.isAttacker !== activeUnit.isAttacker && u.troops > 0) {
          const dGen = gameState.generalsData[u.generalName] || { str: 50 };
          let defMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
          let atkMod = activeUnit.status === 'moraled' ? 1.25 : activeUnit.status === 'panicked' ? 0.75 : 1.0;
          const dmg = Math.max(40, Math.floor((atkGen.str * 2.8 - dGen.str * 0.8) * atkMod * defMod + Math.random() * 30));
          triggerDamagePopup(u.id, `-${dmg}`, false);
          return { ...u, troops: Math.max(0, u.troops - dmg) };
        }
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    }

    // ====== 4. 物理系：相鄰橫掃 (橫掃) ======
    else if (selectedSkill === '橫掃') {
      if (!targetUnit) return;
      const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50 };
      let defMod = targetUnit.status === 'defending' ? 0.65 : targetUnit.status === 'confused' ? 1.25 : 1.0;
      let atkMod = activeUnit.status === 'moraled' ? 1.25 : activeUnit.status === 'panicked' ? 0.75 : 1.0;
      const mainDmg = Math.max(80, Math.floor((atkGen.str * 4.5 - defGen.str * 1.5) * atkMod * defMod + Math.random() * 40));
      addLog(`🗡️【橫掃千軍！】${activeUnit.generalName} 揮動長兵器橫掃，重創主目標 ${targetUnit.generalName} (${mainDmg} 傷害)！`, 'critical');
      triggerDamagePopup(targetUnit.id, `-${mainDmg}`, true);

      // 尋找相鄰或另一名存活敵軍給予 60% 濺射傷害
      const otherEnemies = enemyUnits.filter((u: any) => u.id !== targetUnit.id);
      let splashUnit = otherEnemies.length > 0 ? otherEnemies[0] : null;
      let splashDmg = 0;

      if (splashUnit) {
        const sDef = gameState.generalsData[splashUnit.generalName] || { str: 50 };
        splashDmg = Math.max(40, Math.floor((atkGen.str * 4.5 - sDef.str * 1.5) * 0.6 * atkMod));
        addLog(`💥 橫掃波及！相鄰敵將 ${splashUnit.generalName} 承受 60% 濺射傷害 (${splashDmg})！`, 'attack');
        triggerDamagePopup(splashUnit.id, `-${splashDmg}`, false);
      }

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.id === targetUnit.id) return { ...u, troops: Math.max(0, u.troops - mainDmg) };
        if (splashUnit && u.id === splashUnit.id) return { ...u, troops: Math.max(0, u.troops - splashDmg) };
        if (u.id === activeUnitId) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        return u;
      });
    }

    // ====== 5. 單體攻擊 / 戰法 ======
    else {
      if (!targetUnit) return;
      const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50, int: 50 };
      let damage = 0;
      let isCrit = false;
      let moraleLoss = 5;
      let targetStaminaLoss = 0;
      let newTargetStatus = targetUnit.status || 'normal';

      if (selectedSkill === '無雙') {
        damage = Math.floor(atkGen.str * 8.5 - defGen.str * 1.5 + Math.random() * 80);
        isCrit = true;
        moraleLoss = 20;
        addLog(`⚡👑【天下無雙！】${activeUnit.generalName} 爆發真・無雙奧義，萬夫莫敵！重創 ${targetUnit.generalName} ${damage} 兵馬，士氣 -20！`, 'critical');
      } else if (selectedSkill === '貫通') {
        damage = Math.floor(atkGen.str * 6.8 - defGen.str * 0.5 + Math.random() * 50);
        isCrit = true;
        addLog(`🛡️💥【銳不可當！】${activeUnit.generalName} 發動【貫通】無視目標 50% 防禦穿甲突刺，對 ${targetUnit.generalName} 造成 ${damage} 傷害！`, 'attack');
      } else if (selectedSkill === '連突') {
        const hit1 = Math.floor(atkGen.str * 3.2 - defGen.str * 0.8 + 20);
        const hit2 = Math.floor(atkGen.str * 3.2 - defGen.str * 0.8 + 20);
        damage = hit1 + hit2;
        addLog(`⚔️⚡【連突刺擊！】${activeUnit.generalName} 長槍連刺！發動兩段式連續突擊，對 ${targetUnit.generalName} 合計造成 ${damage} 傷害！`, 'attack');
      } else if (selectedSkill === '火矢') {
        damage = Math.floor(atkGen.str * 4.2 + 60);
        moraleLoss = 12;
        if (Math.random() < 0.50) {
          newTargetStatus = 'burning';
          addLog(`🔥🏹【烈焰火矢！】${activeUnit.generalName} 射出燃燒火矢，命中 ${targetUnit.generalName} 造成 ${damage} 傷害，士氣 -12 並附加【著火】！`, 'archery');
        } else {
          addLog(`🔥🏹【烈焰火矢！】${activeUnit.generalName} 射出燃燒火矢，命中 ${targetUnit.generalName} 造成 ${damage} 傷害，士氣 -12！`, 'archery');
        }
      } else if (selectedSkill === '奮戰') {
        const missingHpRate = Math.max(0, 1 - activeUnit.troops / (activeUnit.maxTroops || 1000));
        const bonusMult = 1.3 + missingHpRate * 1.0;
        damage = Math.floor((atkGen.str * 4.5) * bonusMult - defGen.str * 1.2);
        addLog(`🔥💪【絕境奮戰！】${activeUnit.generalName} 浴血奮戰爆發絕境潛能（${bonusMult.toFixed(2)}倍威力），給予 ${targetUnit.generalName} ${damage} 猛烈傷害！`, 'critical');
      } else if (selectedSkill === '鐵壁衝撞') {
        damage = Math.floor(atkGen.str * 4.5 - defGen.str * 1.5 + 40);
        targetStaminaLoss = 25;
        if (Math.random() < 0.50) {
          newTargetStatus = 'confused';
          addLog(`🛡️🐂【鐵壁衝撞！】${activeUnit.generalName} 以重盾猛烈衝撞敵陣，造成 ${damage} 傷害，扣除目標體力 25 點，並附加【混亂】！`, 'attack');
        } else {
          addLog(`🛡️🐂【鐵壁衝撞！】${activeUnit.generalName} 以重盾猛烈衝撞敵陣，造成 ${damage} 傷害，扣除目標體力 25 點！`, 'attack');
        }
      } else if (selectedSkill === '火計') {
        const terrainBoost = battlefieldTerrain === '密林' ? 1.35 : battlefieldTerrain === '平地' ? 1.15 : 1.0;
        const intDiff = atkGen.int - defGen.int;
        if (atkGen.int >= defGen.int || Math.random() < Math.min(0.95, Math.max(0.3, 0.65 + intDiff * 0.01))) {
          damage = Math.floor((atkGen.int * 6.0 + 80) * terrainBoost);
          newTargetStatus = 'burning';
          addLog(`🔥【火計大捷！】${activeUnit.generalName} 引燃烈火攻擊，火燒 ${targetUnit.generalName} 重創 ${damage} 敵軍，必定附加【著火】！`, 'strategy');
        } else {
          damage = Math.floor(atkGen.int * 2.5 * terrainBoost);
          addLog(`💨【火計受阻】${targetUnit.generalName} 及時救火，僅受 ${damage} 輕微灼傷。`, 'info');
        }
      } else if (selectedSkill === '水攻') {
        const terrainBoost = battlefieldTerrain === '水上' ? 1.50 : 1.0;
        damage = Math.floor((atkGen.int * 5.8 + 60) * terrainBoost);
        addLog(`🌊【水攻破敵！】${activeUnit.generalName} 引水灌敵，滔滔巨浪沖垮 ${targetUnit.generalName} 陣地，造成 ${damage} 傷害！`, 'strategy');
      } else if (selectedSkill === '落石') {
        const terrainBoost = battlefieldTerrain === '山嶽' ? 1.50 : 1.0;
        damage = Math.floor((atkGen.int * 5.8 + 60) * terrainBoost);
        moraleLoss = 15;
        targetStaminaLoss = 15;
        if (Math.random() < 0.45) {
          newTargetStatus = 'confused';
          addLog(`⛰️【落石轟擊！】${activeUnit.generalName} 滾下萬鈞巨石砸碎 ${targetUnit.generalName} 陣勢，造成 ${damage} 傷害、士氣體力 -15 並使其【混亂】！`, 'strategy');
        } else {
          addLog(`⛰️【落石轟擊！】${activeUnit.generalName} 滾下萬鈞巨石，砸碎 ${targetUnit.generalName} 陣勢，造成 ${damage} 傷害、士氣體力 -15！`, 'strategy');
        }
      } else if (selectedSkill === '疑兵') {
        damage = 0;
        moraleLoss = 25;
        targetStaminaLoss = 25;
        newTargetStatus = 'confused';
        addLog(`🎭【疑兵困敵】${activeUnit.generalName} 多插旌旗虛張聲勢，不傷兵力而扣除 ${targetUnit.generalName} 士氣體力 25 點，100% 附加【混亂】！`, 'strategy');
        triggerDamagePopup(targetUnit.id, `🌀混亂`, false);
      } else if (selectedSkill === '挑釁') {
        damage = 0;
        moraleLoss = 15;
        targetStaminaLoss = 30;
        newTargetStatus = 'confused';
        addLog(`🗣️【陣前挑釁】${activeUnit.generalName} 破口大罵激怒敵將，扣除 ${targetUnit.generalName} 士氣 15、體力 30，使其失去理智陷入【混亂】！`, 'strategy');
        triggerDamagePopup(targetUnit.id, `🌀混亂`, false);
      }

      // 狀態修正
      let statusMod = 1.0;
      if (activeUnit.status === 'moraled') statusMod *= 1.25;
      if (activeUnit.status === 'panicked') statusMod *= 0.75;
      if (targetUnit.status === 'defending') statusMod *= 0.65;
      if (targetUnit.status === 'confused') statusMod *= 1.25;
      damage = Math.max(0, Math.floor(damage * statusMod));

      if (damage > 0) {
        triggerDamagePopup(targetUnit.id, `-${damage}`, isCrit);
      }

      updatedUnits = updatedUnits.map((u: any) => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            status: newTargetStatus,
            troops: Math.max(0, u.troops - damage),
            morale: Math.max(0, (u.morale ?? 100) - moraleLoss),
            stamina: Math.max(0, (u.stamina ?? 100) - targetStaminaLoss)
          };
        }
        if (u.id === activeUnitId) {
          return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
        }
        return u;
      });
    }

    setTargetingMode(null);
    setSelectedSkill(null);
    advanceTurn(updatedUnits, turnQueue);
  };

  // 防禦行動
  const handleDefend = () => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    if (!activeUnit) return;

    addLog(`🛡️ 【${activeUnit.generalName}】堅守陣地進入【防禦】狀態，體力恢復 25 點，受創降低 35%！`, 'passive');

    const newUnits = battleState.units.map((u: any) => {
      if (u.id === activeUnitId) {
        return {
          ...u,
          status: 'defending',
          stamina: Math.min(100, u.stamina + 25),
          hasActed: true
        };
      }
      return u;
    });

    advanceTurn(newUnits, turnQueue);
  };

  // 變更陣形
  const handleConfirmFormationChange = (formationName: string) => {
    if (!battleState || !activeUnitId) return;
    const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    if (!activeUnit) return;

    addLog(`🚩 【${activeUnit.generalName}】臨陣變陣！部隊轉化為【${formationName}陣】迎敵！`, 'event');

    const newUnits = battleState.units.map((u: any) => {
      if (u.id === activeUnitId) {
        return {
          ...u,
          formation: formationName,
          stamina: Math.max(0, u.stamina - 15),
          hasActed: true
        };
      }
      return u;
    });

    setShowFormationModal(false);
    advanceTurn(newUnits, turnQueue);
  };

  // 敵方 AI 行動執行邏輯 (支援全戰法與普通攻擊)
  const performAiTurn = (actingUnit: BattleUnit) => {
    if (!battleState) return;

    // 尋找敵方有效攻擊目標 (即玩家方在場且存活的部隊)
    const possibleTargets = battleState.units.filter((u: any) => 
      u.isAttacker !== actingUnit.isAttacker && u.troops > 0
    );

    const allyUnits = battleState.units.filter((u: any) =>
      u.isAttacker === actingUnit.isAttacker && u.troops > 0
    );

    if (possibleTargets.length === 0) {
      advanceTurn(battleState.units, turnQueue);
      return;
    }

    // AI 選定目標：優先鎖定殘血部隊 (50%) 或隨機挑選 (50%)
    let targetUnit = possibleTargets[0];
    if (Math.random() < 0.5) {
      targetUnit = [...possibleTargets].sort((a: any, b: any) => a.troops - b.troops)[0];
    } else {
      targetUnit = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    }

    const gen = gameState.generalsData[actingUnit.generalName] || { str: 50, int: 50 };
    const availableSkills = actingUnit.skills || [];
    const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';

    // 決策 1: 體力過低 (< 15) 時有 25% 機率選擇防禦回體
    if (actingUnit.stamina < 15 && Math.random() < 0.25) {
      addLog(`🛡️ 敵將【${actingUnit.generalName}】全軍持盾防守進入【防禦】狀態，體力恢復 25 點！`, 'passive');
      const newUnits = battleState.units.map((u: any) => {
        if (u.id === actingUnit.id) {
          return { ...u, status: 'defending', stamina: Math.min(100, u.stamina + 25), hasActed: true };
        }
        return u;
      });
      advanceTurn(newUnits, turnQueue);
      return;
    }

    // 決策 2: 施放戰法 (40% 機率且具備體力與戰法)
    let skillToUse: string | null = null;
    if (availableSkills.length > 0 && Math.random() < 0.40) {
      const castableSkills = availableSkills.filter((s: string) => {
        const def = BATTLE_SKILLS[s];
        return def && actingUnit.stamina >= def.cost;
      });
      if (castableSkills.length > 0) {
        skillToUse = castableSkills[Math.floor(Math.random() * castableSkills.length)];
      }
    }

    if (skillToUse) {
      const skillDef = BATTLE_SKILLS[skillToUse];
      let defMod = targetUnit.status === 'defending' ? 0.65 : targetUnit.status === 'confused' ? 1.25 : 1.0;
      let atkMod = actingUnit.status === 'moraled' ? 1.25 : actingUnit.status === 'panicked' ? 0.75 : 1.0;

      // 1. 友軍治療與增益類
      if (skillToUse === '治傷') {
        const woundedAlly = [...allyUnits].sort((a: any, b: any) => a.troops - b.troops)[0] || actingUnit;
        const gMax = gameState.generalsData[woundedAlly.generalName]?.soldiers || woundedAlly.maxTroops || 1000;
        const healAmount = Math.floor(gMax * 0.25 + gen.int * 3.0);
        const newTroops = Math.min(gMax, woundedAlly.troops + healAmount);
        const actualHealed = newTroops - woundedAlly.troops;
        addLog(`🌿【治傷】敵將 ${actingUnit.generalName} 救治 ${woundedAlly.generalName}，恢復 ${actualHealed} 兵力，士氣 +10！`, 'passive');
        triggerDamagePopup(woundedAlly.id, `+${actualHealed}`, false);

        const newUnits = battleState.units.map((u: any) => {
          if (u.id === woundedAlly.id && u.id !== actingUnit.id) {
            return { ...u, troops: newTroops, morale: Math.min(120, (u.morale ?? 100) + 10) };
          }
          if (u.id === actingUnit.id && u.id !== woundedAlly.id) {
            return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          }
          if (u.id === actingUnit.id && u.id === woundedAlly.id) {
            return { ...u, troops: newTroops, morale: Math.min(120, (u.morale ?? 100) + 10), stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          }
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '援軍') {
        addLog(`🚩【援軍】敵將 ${actingUnit.generalName} 呼叫輜重隊，敵軍在場存活全員恢復 20% 兵力，士氣 +10！`, 'passive');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker === actingUnit.isAttacker && u.troops > 0) {
            const gMax = gameState.generalsData[u.generalName]?.soldiers || u.maxTroops || 1000;
            const healAmt = Math.floor(gMax * 0.20 + gen.int * 2.2);
            const newT = Math.min(gMax, u.troops + healAmt);
            triggerDamagePopup(u.id, `+${newT - u.troops}`, false);
            const isCaster = u.id === actingUnit.id;
            return {
              ...u,
              troops: newT,
              morale: Math.min(120, (u.morale ?? 100) + 10),
              stamina: isCaster ? Math.max(0, u.stamina - skillDef.cost) : u.stamina,
              hasActed: isCaster ? true : u.hasActed
            };
          }
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '解策') {
        const debuffedAlly = allyUnits.find((u: any) => u.status && u.status !== 'normal' && u.status !== 'moraled') || actingUnit;
        addLog(`✨【解策】敵將 ${actingUnit.generalName} 識破計謀，為 ${debuffedAlly.generalName} 驅散異常狀態並恢復 30 點體力！`, 'passive');
        triggerDamagePopup(debuffedAlly.id, `+30體力`, false);
        const newUnits = battleState.units.map((u: any) => {
          if (u.id === debuffedAlly.id && u.id !== actingUnit.id) {
            return { ...u, status: 'normal', stamina: Math.min(100, (u.stamina ?? 100) + 30) };
          }
          if (u.id === actingUnit.id && u.id !== debuffedAlly.id) {
            return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          }
          if (u.id === actingUnit.id && u.id === debuffedAlly.id) {
            return { ...u, status: 'normal', stamina: Math.min(100, Math.max(0, u.stamina - skillDef.cost) + 30), hasActed: true };
          }
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '激勵') {
        const boostTarget = allyUnits.find((u: any) => u.id !== actingUnit.id) || actingUnit;
        addLog(`🎺【激勵】敵將 ${actingUnit.generalName} 擂鼓助威，使 ${boostTarget.generalName} 進入【鼓舞】狀態！`, 'passive');
        triggerDamagePopup(boostTarget.id, `+35體力`, false);
        const newUnits = battleState.units.map((u: any) => {
          if (u.id === boostTarget.id && u.id !== actingUnit.id) {
            return { ...u, status: 'moraled', stamina: Math.min(100, (u.stamina ?? 100) + 35), morale: Math.min(120, (u.morale ?? 100) + 15) };
          }
          if (u.id === actingUnit.id && u.id !== boostTarget.id) {
            return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          }
          if (u.id === actingUnit.id && u.id === boostTarget.id) {
            return { ...u, status: 'moraled', stamina: Math.min(100, Math.max(0, u.stamina - skillDef.cost) + 35), morale: Math.min(120, (u.morale ?? 100) + 15), hasActed: true };
          }
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      }

      // 2. 敵全體 AoE 戰法 (業火, 水龍計, 山崩, 偽報, 亂射)
      if (skillToUse === '業火') {
        const terrainMult = battlefieldTerrain === '密林' ? 1.35 : battlefieldTerrain === '平地' ? 1.15 : 1.0;
        addLog(`🔥【業火燎原！】敵將 ${actingUnit.generalName} 祭起滔天大火，火海席捲我方全軍！`, 'strategy');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker !== actingUnit.isAttacker && u.troops > 0) {
            const dGen = gameState.generalsData[u.generalName] || { int: 50 };
            let uDefMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
            const dmg = Math.max(50, Math.floor((gen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * uDefMod + Math.random() * 40));
            triggerDamagePopup(u.id, `-${dmg}`, true);
            const willBurn = Math.random() < 0.55;
            if (willBurn) addLog(`🔥【大火蔓延】我方 ${u.generalName} 遭受烈火焚身，陷入【著火】！`, 'strategy');
            return {
              ...u,
              troops: Math.max(0, u.troops - dmg),
              morale: Math.max(0, (u.morale ?? 100) - 10),
              status: willBurn ? 'burning' : u.status
            };
          }
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '水龍計') {
        const terrainMult = battlefieldTerrain === '水上' ? 1.50 : 1.0;
        addLog(`🌊【水龍巨嘯！】敵將 ${actingUnit.generalName} 引動狂濤巨浪，怒濤沖擊我方全軍！`, 'strategy');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker !== actingUnit.isAttacker && u.troops > 0) {
            const dGen = gameState.generalsData[u.generalName] || { int: 50 };
            let uDefMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
            const dmg = Math.max(60, Math.floor((gen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * uDefMod + Math.random() * 50));
            triggerDamagePopup(u.id, `-${dmg}`, true);
            return { ...u, troops: Math.max(0, u.troops - dmg), morale: Math.max(0, (u.morale ?? 100) - 12) };
          }
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '山崩') {
        const terrainMult = battlefieldTerrain === '山嶽' ? 1.50 : 1.0;
        addLog(`⛰️【山崩地裂！】敵將 ${actingUnit.generalName} 撬動山嶽巨石，滾滾砸向我方全軍！`, 'strategy');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker !== actingUnit.isAttacker && u.troops > 0) {
            const dGen = gameState.generalsData[u.generalName] || { int: 50 };
            let uDefMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
            const dmg = Math.max(60, Math.floor((gen.int * 4.5 - dGen.int * 1.5) * terrainMult * atkMod * uDefMod + Math.random() * 50));
            triggerDamagePopup(u.id, `-${dmg}`, true);
            return { ...u, troops: Math.max(0, u.troops - dmg), morale: Math.max(0, (u.morale ?? 100) - 15) };
          }
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '偽報') {
        addLog(`📢【偽報四起！】敵將 ${actingUnit.generalName} 散佈虛假軍令動搖我全軍！`, 'strategy');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker !== actingUnit.isAttacker && u.troops > 0) {
            triggerDamagePopup(u.id, `士氣-20`, false);
            const willPanic = Math.random() < 0.55;
            if (willPanic) addLog(`😨【軍心動搖】我方 ${u.generalName} 誤信偽報陷入【恐慌】！`, 'strategy');
            return {
              ...u,
              morale: Math.max(0, (u.morale ?? 100) - 20),
              stamina: Math.max(0, (u.stamina ?? 100) - 15),
              status: willPanic ? 'panicked' : u.status
            };
          }
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '亂射') {
        addLog(`🏹【萬箭齊發！】敵將 ${actingUnit.generalName} 亂箭齊發，對我方全軍進行遠程打擊！`, 'archery');
        const newUnits = battleState.units.map((u: any) => {
          if (u.isAttacker !== actingUnit.isAttacker && u.troops > 0) {
            const dGen = gameState.generalsData[u.generalName] || { str: 50 };
            let uDefMod = u.status === 'defending' ? 0.65 : u.status === 'confused' ? 1.25 : 1.0;
            const dmg = Math.max(35, Math.floor((gen.str * 2.8 - dGen.str * 0.8) * atkMod * uDefMod));
            triggerDamagePopup(u.id, `-${dmg}`, false);
            return { ...u, troops: Math.max(0, u.troops - dmg) };
          }
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      } else if (skillToUse === '橫掃') {
        const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50 };
        const mainDmg = Math.max(80, Math.floor((gen.str * 4.5 - defGen.str * 1.5) * atkMod * defMod + Math.random() * 40));
        addLog(`🗡️【橫掃千軍！】敵將 ${actingUnit.generalName} 揮動長兵器橫掃，重創我方 ${targetUnit.generalName} (${mainDmg} 傷害)！`, 'critical');
        triggerDamagePopup(targetUnit.id, `-${mainDmg}`, true);

        const otherEnemies = possibleTargets.filter((u: any) => u.id !== targetUnit.id);
        let splashUnit = otherEnemies.length > 0 ? otherEnemies[0] : null;
        let splashDmg = 0;

        if (splashUnit) {
          const sDef = gameState.generalsData[splashUnit.generalName] || { str: 50 };
          splashDmg = Math.max(40, Math.floor((gen.str * 4.5 - sDef.str * 1.5) * 0.6 * atkMod));
          addLog(`💥 橫掃波及！我方相鄰武將 ${splashUnit.generalName} 承受 60% 濺射傷害 (${splashDmg})！`, 'attack');
          triggerDamagePopup(splashUnit.id, `-${splashDmg}`, false);
        }

        const newUnits = battleState.units.map((u: any) => {
          if (u.id === targetUnit.id) return { ...u, troops: Math.max(0, u.troops - mainDmg) };
          if (splashUnit && u.id === splashUnit.id) return { ...u, troops: Math.max(0, u.troops - splashDmg) };
          if (u.id === actingUnit.id) return { ...u, stamina: Math.max(0, u.stamina - skillDef.cost), hasActed: true };
          return u;
        });
        advanceTurn(newUnits, turnQueue);
        return;
      }

      // 3. 單體技能
      const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50, int: 50 };
      let skillDamage = 0;
      let newEnemyTargetStatus = targetUnit.status || 'normal';
      let moraleLoss = 5;
      let staminaLoss = 0;

      if (skillToUse === '無雙') {
        skillDamage = Math.floor((gen.str * 8.5 - defGen.str * 1.5 + Math.random() * 80) * atkMod * defMod);
        moraleLoss = 20;
        addLog(`👑⚡【無雙！】敵將 ${actingUnit.generalName} 爆發真・無雙奧義，重創我方 ${targetUnit.generalName} ${skillDamage} 兵力，士氣 -20！`, 'critical');
      } else if (skillToUse === '貫通') {
        skillDamage = Math.floor((gen.str * 6.8 - defGen.str * 0.5 + Math.random() * 50) * atkMod * defMod);
        addLog(`🛡️💥【貫通！】敵將 ${actingUnit.generalName} 發動穿甲突刺無視 50% 防禦，重創我方 ${targetUnit.generalName} ${skillDamage} 兵力！`, 'attack');
      } else if (skillToUse === '連突') {
        const hit1 = Math.floor(gen.str * 3.2 - defGen.str * 0.8 + 20);
        const hit2 = Math.floor(gen.str * 3.2 - defGen.str * 0.8 + 20);
        skillDamage = Math.floor((hit1 + hit2) * atkMod * defMod);
        addLog(`⚔️⚡【連突！】敵將 ${actingUnit.generalName} 長槍連續突擊，對我方 ${targetUnit.generalName} 造成 ${skillDamage} 傷害！`, 'attack');
      } else if (skillToUse === '火矢') {
        skillDamage = Math.floor((gen.str * 4.2 + 60) * atkMod * defMod);
        moraleLoss = 12;
        if (Math.random() < 0.50) {
          newEnemyTargetStatus = 'burning';
          addLog(`🔥🏹【火矢！】敵將 ${actingUnit.generalName} 射出燃燒火矢命中我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害並引發【著火】！`, 'archery');
        } else {
          addLog(`🔥🏹【火矢！】敵將 ${actingUnit.generalName} 射出火矢命中我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害！`, 'archery');
        }
      } else if (skillToUse === '奮戰') {
        const missingHpRate = Math.max(0, 1 - actingUnit.troops / (actingUnit.maxTroops || 1000));
        const bonusMult = 1.3 + missingHpRate * 1.0;
        skillDamage = Math.floor((gen.str * 4.5 * bonusMult - defGen.str * 1.2) * atkMod * defMod);
        addLog(`🔥💪【奮戰！】敵將 ${actingUnit.generalName} 浴血奮戰爆發潛能，給予我方 ${targetUnit.generalName} ${skillDamage} 猛烈傷害！`, 'critical');
      } else if (skillToUse === '鐵壁衝撞') {
        skillDamage = Math.floor((gen.str * 4.5 - defGen.str * 1.5 + 40) * atkMod * defMod);
        staminaLoss = 25;
        if (Math.random() < 0.50) {
          newEnemyTargetStatus = 'confused';
          addLog(`🛡️🐂【鐵壁衝撞！】敵將 ${actingUnit.generalName} 以重盾猛撞我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害、體力 -25 並陷入【混亂】！`, 'attack');
        } else {
          addLog(`🛡️🐂【鐵壁衝撞！】敵將 ${actingUnit.generalName} 以重盾猛撞我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害、體力 -25！`, 'attack');
        }
      } else if (skillToUse === '火計') {
        const terrainBoost = battlefieldTerrain === '密林' ? 1.35 : battlefieldTerrain === '平地' ? 1.15 : 1.0;
        const intDiff = gen.int - defGen.int;
        if (gen.int >= defGen.int || Math.random() < Math.min(0.95, Math.max(0.3, 0.65 + intDiff * 0.01))) {
          skillDamage = Math.floor((gen.int * 6.0 + 80) * terrainBoost * atkMod * defMod);
          newEnemyTargetStatus = 'burning';
          addLog(`🔥【火計！】敵將 ${actingUnit.generalName} 施展烈火計謀火燒我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害並引發【著火】！`, 'strategy');
        } else {
          skillDamage = Math.floor(gen.int * 2.5 * terrainBoost * atkMod * defMod);
          addLog(`💨 敵將 ${actingUnit.generalName} 發動火計，被我方 ${targetUnit.generalName} 及時撲滅，僅受 ${skillDamage} 輕微傷。`, 'info');
        }
      } else if (skillToUse === '水攻') {
        const terrainBoost = battlefieldTerrain === '水上' ? 1.50 : 1.0;
        skillDamage = Math.floor((gen.int * 5.8 + 60) * terrainBoost * atkMod * defMod);
        addLog(`🌊【水攻！】敵將 ${actingUnit.generalName} 決堤放水沖垮我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害！`, 'strategy');
      } else if (skillToUse === '落石') {
        const terrainBoost = battlefieldTerrain === '山嶽' ? 1.50 : 1.0;
        skillDamage = Math.floor((gen.int * 5.8 + 60) * terrainBoost * atkMod * defMod);
        moraleLoss = 15;
        staminaLoss = 15;
        if (Math.random() < 0.45) {
          newEnemyTargetStatus = 'confused';
          addLog(`⛰️【落石！】敵將 ${actingUnit.generalName} 滾下巨石砸擊我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害並使其【混亂】！`, 'strategy');
        } else {
          addLog(`⛰️【落石！】敵將 ${actingUnit.generalName} 滾下巨石砸擊我方 ${targetUnit.generalName}，造成 ${skillDamage} 傷害！`, 'strategy');
        }
      } else if (skillToUse === '疑兵') {
        skillDamage = 0;
        moraleLoss = 25;
        staminaLoss = 25;
        newEnemyTargetStatus = 'confused';
        addLog(`🎭【疑兵！】敵將 ${actingUnit.generalName} 虛張聲勢迷惑我軍，我方 ${targetUnit.generalName} 士氣體力 -25 並陷入【混亂】！`, 'strategy');
        triggerDamagePopup(targetUnit.id, `🌀混亂`, false);
      } else if (skillToUse === '挑釁') {
        skillDamage = 0;
        moraleLoss = 15;
        staminaLoss = 30;
        newEnemyTargetStatus = 'confused';
        addLog(`🗣️【挑釁！】敵將 ${actingUnit.generalName} 破口大罵激怒我將，我方 ${targetUnit.generalName} 士氣 -15、體力 -30 陷入【混亂】！`, 'strategy');
        triggerDamagePopup(targetUnit.id, `🌀混亂`, false);
      } else {
        skillDamage = Math.floor((gen.str * 4.5 + 40) * atkMod * defMod);
        addLog(`⚔️ 敵將 ${actingUnit.generalName} 發動戰法【${skillToUse}】，重創我方 ${targetUnit.generalName} ${skillDamage} 兵力！`, 'attack');
      }

      if (skillDamage > 0) {
        triggerDamagePopup(targetUnit.id, `-${skillDamage}`, true);
      }

      const newUnits = battleState.units.map((u: any) => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            status: newEnemyTargetStatus,
            troops: Math.max(0, u.troops - skillDamage),
            morale: Math.max(0, (u.morale ?? 100) - moraleLoss),
            stamina: Math.max(0, (u.stamina ?? 100) - staminaLoss)
          };
        }
        if (u.id === actingUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - (skillDef?.cost || 20)), hasActed: true };
        }
        return u;
      });

      advanceTurn(newUnits, turnQueue);
      return;
    }

    // 決策 3: 常規普通攻擊
    const defGen = gameState.generalsData[targetUnit.generalName] || { str: 50, int: 50 };
    const atkForm = getFormationInfo(actingUnit.formation || '') || { atkMod: 0, defMod: 0, initiativeMod: 0 };
    const defForm = getFormationInfo(targetUnit.formation || '') || { atkMod: 0, defMod: 0, initiativeMod: 0 };

    const atkTerrainMod = calculateFormationTerrainCombatModifier({
      formationName: actingUnit.formation || '魚鱗',
      provinceId: battleState.provinceId,
      general: gen
    });
    const defTerrainMod = calculateFormationTerrainCombatModifier({
      formationName: targetUnit.formation || '魚鱗',
      provinceId: battleState.provinceId,
      general: defGen
    });

    const atkMoraleEff = (actingUnit.morale ?? 100) / 100;
    const atkTrainEff = (50 + (actingUnit.training ?? 100) / 2) / 100;
    const atkEff = atkMoraleEff * atkTrainEff;

    const defMoraleEff = (targetUnit.morale ?? 100) / 100;
    const defTrainEff = (50 + (targetUnit.training ?? 100) / 2) / 100;
    const defEff = defMoraleEff * defTrainEff;

    const atkMultiplier = (1 + (atkForm.atkMod || 0)) * atkTerrainMod.totalCombatModifier * atkEff;
    const defMultiplier = (1 + (defForm.defMod || 0)) * defTerrainMod.totalCombatModifier * defEff;

    const baseDamage = Math.floor((gen.str * atkMultiplier) * (Math.random() * 0.2 + 0.9) * 4);
    const defense = Math.floor((defGen.str * defMultiplier) * 2);
    let damage = Math.max(20, baseDamage - defense);

    // 狀態修正
    let statusMod = 1.0;
    if (actingUnit.status === 'moraled') statusMod *= 1.25;
    if (actingUnit.status === 'panicked') statusMod *= 0.75;
    if (targetUnit.status === 'defending') statusMod *= 0.65;
    if (targetUnit.status === 'confused') statusMod *= 1.25;
    damage = Math.floor(damage * statusMod);

    const atkTerrainEffect = getFormationTerrainEffect(actingUnit.formation || '', battlefieldTerrain);
    let critChance = actingUnit.formation === '鋒矢' ? 0.30 : 0.15;
    if (atkTerrainEffect.rating === 'S') critChance += 0.10;
    const isCrit = Math.random() < critChance;
    if (isCrit) damage = Math.floor(damage * 1.5);

    let terrainNote = '';
    if (atkTerrainEffect.rating === 'S') {
      terrainNote = `(${TERRAIN_DETAILS[battlefieldTerrain]?.symbol}${atkTerrainEffect.tag})`;
    } else if (atkTerrainEffect.rating === 'D') {
      terrainNote = `(受阻於${battlefieldTerrain})`;
    }

    addLog(`⚔️ 敵將【${actingUnit.generalName}】(${actingUnit.formation}陣) ${terrainNote} 揮軍猛攻我方 ${targetUnit.generalName} ${isCrit ? '💥(暴擊!)' : ''}，造成 ${damage} 傷害！`, 'attack');
    triggerDamagePopup(targetUnit.id, `-${damage}`, isCrit);

    const newUnits = battleState.units.map((u: any) => {
      if (u.id === targetUnit.id) {
        return { ...u, troops: Math.max(0, u.troops - damage) };
      }
      if (u.id === actingUnit.id) {
        return { ...u, stamina: Math.max(0, u.stamina - 10), hasActed: true };
      }
      return u;
    });

    advanceTurn(newUnits, turnQueue);
  };

  // 異常狀態結算與敵方 AI 自動行動監聽
  useEffect(() => {
    if (!battleState || !activeUnitId || battleOutcome || isDefenseSetupPhase || isPreBattleFormation) {
      return;
    }

    const currentActiveUnit = battleState.units.find((u: any) => u.id === activeUnitId);
    if (!currentActiveUnit) {
      if (turnQueue.length > 0) {
        const nextValid = turnQueue.find(id => {
          const u = battleState.units.find((x: any) => x.id === id);
          return u && u.troops > 0;
        });
        if (nextValid) {
          setActiveUnitId(nextValid);
        } else {
          advanceTurn(battleState.units, turnQueue);
        }
      }
      return;
    }

    // 若該行動部隊已陣亡，自動推進下一個
    if (currentActiveUnit.troops <= 0) {
      advanceTurn(battleState.units, turnQueue);
      return;
    }

    // 回合開始時的狀態結算 (著火扣血/滅火、恐慌扣士氣/體力、混亂跳過回合、防禦解除)
    const turnKey = `${battleState.day || 1}_${activeUnitId}_${turnQueue.length}`;
    if (processedTurnRef.current !== turnKey) {
      processedTurnRef.current = turnKey;

      let nextStatus = currentActiveUnit.status || 'normal';
      let troopsDeducted = 0;
      let moraleDelta = 0;
      let staminaDelta = 0;
      let skipTurn = false;

      // 1. 防禦狀態：輪到自己行動時自然解除防禦姿態
      if (nextStatus === 'defending') {
        nextStatus = 'normal';
      }

      // 2. 著火結算 (燃燒傷害 5% 與撲滅判定)
      if (nextStatus === 'burning') {
        const burnDmg = Math.max(25, Math.floor(currentActiveUnit.troops * 0.05 + Math.random() * 15));
        troopsDeducted += burnDmg;
        triggerDamagePopup(currentActiveUnit.id, `-${burnDmg}🔥`, true);
        addLog(`🔥【烈焰焚身】${currentActiveUnit.generalName} 部隊深陷火海，被烈火灼燒損失 ${burnDmg} 兵力 (5%)！`, 'strategy');

        // 40% 機率撲滅烈火
        if (Math.random() < 0.40) {
          nextStatus = 'normal';
          addLog(`💧【撲滅火勢】${currentActiveUnit.generalName} 部隊及時撲滅了火勢，解除著火狀態！`, 'info');
        }
      }

      // 3. 恐慌結算 (扣除額外體力與士氣)
      if (nextStatus === 'panicked') {
        staminaDelta -= 10;
        moraleDelta -= 6;
        addLog(`😨【軍心恐慌】${currentActiveUnit.generalName} 部隊軍心惶惶，士氣 -6，體力 -10！`, 'strategy');
        triggerDamagePopup(currentActiveUnit.id, `恐慌`, false);

        // 40% 機率平復恐慌
        if (Math.random() < 0.40) {
          nextStatus = 'normal';
          addLog(`🕊️【軍心平復】${currentActiveUnit.generalName} 穩住軍心，脫離恐慌狀態！`, 'info');
        }
      }

      // 4. 混亂結算 (50% 甦醒，50% 無法行動)
      if (nextStatus === 'confused') {
        if (Math.random() < 0.50) {
          nextStatus = 'normal';
          addLog(`✨【重整旗鼓】${currentActiveUnit.generalName} 部隊穩住陣腳，從【混亂】中甦醒復原！`, 'info');
          triggerDamagePopup(currentActiveUnit.id, `清醒`, false);
        } else {
          skipTurn = true;
          addLog(`🌀【全軍混亂】${currentActiveUnit.generalName} 陣勢大亂失控，無法聽從號令，錯失行動回合！`, 'strategy');
          triggerDamagePopup(currentActiveUnit.id, `🌀混亂`, false);
        }
      }

      // 若有狀態變化或扣血，更新 unit 狀態
      const updatedTroops = Math.max(0, currentActiveUnit.troops - troopsDeducted);
      const updatedUnits = battleState.units.map((u: any) => {
        if (u.id === activeUnitId) {
          return {
            ...u,
            status: nextStatus,
            troops: updatedTroops,
            morale: Math.max(0, (u.morale ?? 100) + moraleDelta),
            stamina: Math.max(0, (u.stamina ?? 100) + staminaDelta)
          };
        }
        return u;
      });

      setBattleState((prev: any) => ({
        ...prev,
        units: updatedUnits
      }));

      // 若部隊被燒死或陷入混亂跳過回合
      if (updatedTroops <= 0 || skipTurn) {
        const timer = setTimeout(() => {
          advanceTurn(updatedUnits, turnQueue);
        }, 800);
        return () => clearTimeout(timer);
      }
    }

    // 判斷是否為玩家部隊
    const unitIsPlayer = isDefense ? !currentActiveUnit.isAttacker : currentActiveUnit.isAttacker;
    if (unitIsPlayer) {
      return; // 玩家回合，等待玩家下達軍令
    }

    // 敵方 AI 回合：延遲 700ms 呈現運籌思考感並自動行動
    const timer = setTimeout(() => {
      performAiTurn(currentActiveUnit);
    }, 700);

    return () => clearTimeout(timer);
  }, [activeUnitId, battleOutcome, isDefenseSetupPhase, isPreBattleFormation, isDefense, battleState]);

  // 階段 1: 防守城池援軍調度 (需求 1 & 5)
  if (isDefense && isDefenseSetupPhase && battle) {
    return (
      <DefenseSetupModal
        gameState={gameState}
        targetProvinceId={battle.targetProvinceId}
        attackerRuler={battle.attackerRuler || '敵軍勢力'}
        attackingGenerals={battle.attackingGenerals}
        onConfirmDefenseSetup={handleConfirmDefenseSetup}
        onRetreat={() => {
          setBattleOutcome({
            winner: 'attacker',
            title: '主動撤出・放棄防守',
            message: `我方決定放棄抵抗，部隊有序撤離【${battleState?.provinceName || '戰場'}】...`,
            isWin: false
          });
        }}
      />
    );
  }

  // 階段 2: 戰前順序與陣形配置 (需求 2)
  if (isPreBattleFormation && battleState) {
    const playerRoster = isDefense ? defendingRoster : attackingRoster;
    const enemyRoster = isDefense ? attackingRoster : defendingRoster;
    const strategistName = isDefense ? battleState.defenderStrategist : battleState.attackerStrategist;
    const enemyRuler = isDefense ? battleState.attackerRuler : battleState.defenderRuler;

    return (
      <PreBattleFormationView
        gameState={gameState}
        provinceName={battleState.provinceName}
        battlefieldTerrain={battleState.terrain}
        strategistName={strategistName}
        isDefense={isDefense}
        playerRoster={playerRoster}
        enemyRoster={enemyRoster}
        enemyRuler={enemyRuler}
        onUpdateRoster={(newRoster) => {
          if (isDefense) setDefendingRoster(newRoster);
          else setAttackingRoster(newRoster);
        }}
        generalFormations={generalFormations}
        onUpdateFormations={setGeneralFormations}
        onConfirmStartBattle={handleConfirmPreBattleFormations}
        onExit={onExit}
      />
    );
  }

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

  const activeUnit = battleState.units.find((u: any) => u.id === activeUnitId);
  const isPlayerTurn = activeUnit ? (isDefense ? !activeUnit.isAttacker : activeUnit.isAttacker) : false;

  const attackerUnits = battleState.units.filter((u: any) => u.isAttacker);
  const defenderUnits = battleState.units.filter((u: any) => !u.isAttacker);

  const playerUnits = isDefense ? defenderUnits : attackerUnits;
  const enemyUnits = isDefense ? attackerUnits : defenderUnits;
  const playerReserves = isDefense ? defenderReserves : attackerReserves;
  const enemyReserves = isDefense ? attackerReserves : defenderReserves;
  const latestLog = logs[logs.length - 1];

  const battlefieldTerrain: FormationTerrainType = battleState.terrain || '平地';
  const terrainInfo = TERRAIN_DETAILS[battlefieldTerrain];

  // 計算雙方即時兵糧消耗預估 (需求 3)
  const playerAliveTroops = playerUnits.filter((u: any) => u.troops > 0).reduce((sum: number, u: any) => sum + u.troops, 0);
  const enemyAliveTroops = enemyUnits.filter((u: any) => u.troops > 0).reduce((sum: number, u: any) => sum + u.troops, 0);
  const playerDailyFoodCons = Math.max(10, Math.ceil(playerAliveTroops * 0.03));
  const enemyDailyFoodCons = Math.max(10, Math.ceil(enemyAliveTroops * 0.03));

  const playerFood = isDefense ? battleState.defenderFood : battleState.attackerFood;
  const enemyFood = isDefense ? battleState.attackerFood : battleState.defenderFood;

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-serif select-none bg-[#141210] text-stone-200 overflow-hidden">
      {/* 1. 頂部狀態列 (手機與電腦皆全時顯示：戰場地點、天數、地形、兩軍兵糧、情報按鈕) */}
      <div className="bg-[#1f1a16] border-b border-[#3b3128] px-2.5 py-1.5 z-30 shadow-md flex flex-col gap-1">
        {/* 第一行：主要戰場與操作快捷列 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-black text-amber-400 text-xs sm:text-sm tracking-wider flex items-center gap-1 shrink-0">
              <Swords className="w-3.5 h-3.5 text-amber-500" />
              決戰【{battleState.provinceName}】
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-[10px] sm:text-xs flex items-center gap-1 shrink-0 shadow">
              📅 {battleState.day || 1}/30 天
            </span>
            {/* 地形標籤 - 手機端全時清晰可見且可點擊開啟地勢圖 */}
            <button
              onClick={() => setShowTerrainMatrixModal(true)}
              className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-[11px] font-black text-amber-300 flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all shadow"
              title="點擊檢視地形與陣形相剋全鑑"
            >
              <span>{terrainInfo?.symbol || '🏞️'}</span>
              <span>地形:【{battlefieldTerrain}】</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 戰場情報與順序列隊按鈕 */}
            <button 
              onClick={() => setShowBattlefieldInfoModal(true)}
              className="h-7 px-2 bg-[#2d2218] hover:bg-[#3d3024] border border-amber-500/60 rounded text-xs font-black text-amber-300 flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow"
              title="檢視敵我全武將狀態與先攻行動佇列"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>情報</span>
            </button>

            <button 
              onClick={() => setShowLogsModal(true)}
              className="h-7 px-2 bg-[#2a241f] hover:bg-[#383029] border border-[#524438] rounded text-xs font-bold text-amber-200 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <ScrollText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">戰報</span> ({logs.length})
            </button>

            <button 
              onClick={onExit} 
              className="h-7 px-2 bg-[#3a1d1d] hover:bg-[#4d2525] border border-[#6d3030] rounded text-xs font-bold text-rose-200 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>撤退</span>
            </button>
          </div>
        </div>

        {/* 第二行：即時雙方軍糧與後援狀況 (手機端全時清晰顯示) */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold pt-0.5 border-t border-[#332a22]">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
              playerFood <= 0 
                ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' 
                : 'bg-[#1b1612] text-amber-300 border-amber-600/50'
            }`}>
              <Wheat className="w-3 h-3 text-amber-400" />
              <span>我軍兵糧: <strong>{playerFood?.toLocaleString() ?? 0}</strong></span>
              <span className="text-[9px] text-stone-400 font-normal">(-{playerDailyFoodCons}/日)</span>
            </span>

            <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
              enemyFood <= 0 
                ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' 
                : 'bg-[#181411] text-rose-300 border-[#3b3128]'
            }`}>
              <Wheat className="w-3 h-3 text-rose-400" />
              <span>敵方兵糧: <strong>{enemyFood?.toLocaleString() ?? 0}</strong></span>
              <span className="text-[9px] text-stone-400 font-normal">(-{enemyDailyFoodCons}/日)</span>
            </span>
          </div>

          <div className="hidden xs:flex items-center gap-2 text-[10px] text-stone-400">
            <span>我方後援: <strong className="text-sky-300">{playerReserves.length}</strong></span>
            <span>|</span>
            <span>敵方後援: <strong className="text-rose-300">{enemyReserves.length}</strong></span>
          </div>
        </div>

        {/* 第三行：即時敵我先攻行動序快速欄 (即時直觀顯示敵我出手順序) */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#2e261f] overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black text-amber-400 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            行動順序:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {turnQueue.map((uid, qIdx) => {
              const u = battleState.units.find((unit: BattleUnit) => unit.id === uid);
              if (!u) return null;
              const isPlayer = isDefense ? !u.isAttacker : u.isAttacker;
              const isCurrent = activeUnitId === u.id;

              return (
                <div
                  key={uid}
                  onClick={() => setShowBattlefieldInfoModal(true)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black cursor-pointer transition-all ${
                    isCurrent
                      ? (isPlayer 
                          ? 'bg-sky-500 text-stone-950 border-sky-300 ring-1 ring-sky-300 scale-105 shadow-[0_0_8px_rgba(56,189,248,0.5)]' 
                          : 'bg-rose-500 text-stone-950 border-rose-300 ring-1 ring-rose-300 scale-105 shadow-[0_0_8px_rgba(244,63,94,0.5)]')
                      : (isPlayer 
                          ? 'bg-sky-950/80 text-sky-200 border-sky-800/80 hover:border-sky-600' 
                          : 'bg-rose-950/80 text-rose-200 border-rose-800/80 hover:border-rose-600')
                  }`}
                  title={`${u.generalName} (${isPlayer ? '我軍' : '敵軍'}) - 先攻值: ${u.speed}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                    isCurrent
                      ? 'bg-stone-950 text-amber-300'
                      : (isPlayer ? 'bg-sky-900 text-sky-200' : 'bg-rose-900 text-rose-200')
                  }`}>
                    {qIdx + 1}
                  </span>
                  <span className="truncate max-w-[48px] sm:max-w-[64px]">{u.generalName}</span>
                  <span className="text-[8px] opacity-75">{isPlayer ? '我' : '敵'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. 核心 5 vs 5 戰場區域 */}
      <div className="flex-1 min-h-0 flex flex-col relative px-2 py-1 sm:px-4 sm:py-2" style={{
        background: 'radial-gradient(ellipse at 50% 30%, #261f1a 0%, #141210 100%)'
      }}>
        {/* 對峙陣容區 (5 列並排) */}
        <div className="flex-1 flex gap-2 sm:gap-4 overflow-hidden relative">
          {/* 左列：我軍 (5 人，陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-sky-400 flex items-center justify-between px-1 pb-0.5 border-b border-sky-900/40">
              <span className="flex items-center gap-1">🔷 我軍部隊 ({isDefense ? '守備方' : '攻城方'})</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-sky-300">{playerReserves.length}</strong> 人
              </span>
            </div>
            {playerUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                isEnemy={false}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={targetingMode === 'skill' && isAllySkill(selectedSkill) && u.troops > 0}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {
                  if (targetingMode === 'skill' && isAllySkill(selectedSkill)) {
                    handleSkillAttack(u.id);
                  }
                }}
              />
            ))}
          </div>

          {/* 中央分割線 */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-[#4a3f35] to-transparent flex items-center justify-center relative">
            <div className="absolute top-1/2 -translate-y-1/2 bg-[#1a1613] border border-[#4a3f35] text-[9px] font-black text-amber-500 px-1 py-1 rounded-full shadow">
              VS
            </div>
          </div>

          {/* 右列：敵軍 (5 人，陣亡自動依序遞補 - 隱藏體力以防手機端爆版並營造戰場迷霧) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-rose-400 flex items-center justify-between px-1 pb-0.5 border-b border-rose-900/40">
              <span className="flex items-center gap-1">🔶 敵方部隊 ({isDefense ? '進攻敵軍' : '守敵部隊'})</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-rose-300">{enemyReserves.length}</strong> 人
              </span>
            </div>
            {enemyUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                isEnemy={true}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={(targetingMode === 'melee' || (targetingMode === 'skill' && !isAllySkill(selectedSkill))) && u.troops > 0}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {
                  if (targetingMode === 'melee') handleMeleeAttack(u.id);
                  if (targetingMode === 'skill' && !isAllySkill(selectedSkill)) handleSkillAttack(u.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* 即時最新戰況 Ticker (加大加寬，支援清晰多行與狀態標註 - 需求 4) */}
        <div className="min-h-9 mt-1.5 bg-[#15110e]/95 border-2 border-[#453629] rounded-xl px-3 py-1.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 min-w-0 flex-1 text-stone-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
            <div className="text-xs sm:text-sm font-bold text-amber-200 truncate leading-snug">
              {latestLog?.text || '兩軍對峙，肅殺之氣瀰漫全場，靜待號令！'}
            </div>
          </div>
          {targetingMode && (
            <span className="text-xs font-black text-amber-300 shrink-0 bg-amber-950/90 border border-amber-400 px-2 py-0.5 rounded-lg animate-pulse ml-2 shadow">
              {targetingMode === 'melee' ? '⚔️ 點擊敵將攻擊' : isAllySkill(selectedSkill) ? '🌿 點選友軍目標' : '🎯 點選敵將目標'}
            </span>
          )}
        </div>

        {/* 選定目標時的浮層覆蓋 */}
        {targetingMode && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2 bg-[#1c1917]/95 border border-amber-500/80 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm animate-fade-in">
            <Target className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs font-black text-amber-300">
              {targetingMode === 'melee' 
                ? '請點選敵將發動攻擊' 
                : isAllySkill(selectedSkill) 
                  ? `施展【${selectedSkill}】，點選友軍目標` 
                  : `發動【${selectedSkill}】，點選敵將目標`}
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

      {/* 3. 底部圖形化軍令控制台 (已移除多餘下方將領欄，直接呈現核心 5 大軍令以騰出寬裕戰場空間) */}
      <div className="bg-[#181411] border-t-2 border-[#3d3227] px-2 py-2 sm:px-4 sm:py-2.5 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
        {activeUnit && isPlayerTurn ? (
          <div className="flex flex-col gap-1.5 max-w-2xl mx-auto">
            {/* 五大圖形化指令 */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              <GraphicCommandButton
                icon={<Swords className="w-5 h-5 text-rose-400" />}
                label="攻擊"
                subLabel="常規進攻"
                theme="rose"
                isActive={targetingMode === 'melee'}
                onClick={() => setTargetingMode(targetingMode === 'melee' ? null : 'melee')}
              />

              <GraphicCommandButton
                icon={<Sparkles className="w-5 h-5 text-sky-400" />}
                label="戰法"
                subLabel={activeUnit.skills?.length > 0 ? `${activeUnit.skills.length}種戰技` : '無戰法'}
                theme="sky"
                disabled={!activeUnit.skills || activeUnit.skills.length === 0}
                isActive={showSkillDrawer || targetingMode === 'skill'}
                onClick={() => setShowSkillDrawer(true)}
              />

              <GraphicCommandButton
                icon={<Shield className="w-5 h-5 text-stone-300" />}
                label="防禦"
                subLabel="恢復體力"
                theme="stone"
                onClick={handleDefend}
              />

              <GraphicCommandButton
                icon={<Flag className="w-5 h-5 text-emerald-400" />}
                label="佈陣"
                subLabel="臨機變陣"
                theme="emerald"
                disabled={!activeUnit || (activeUnit.stamina ?? 100) < 15}
                onClick={() => setShowFormationModal(true)}
              />

              <GraphicCommandButton
                icon={<ListOrdered className="w-5 h-5 text-amber-400" />}
                label="情報"
                subLabel="順序列隊"
                theme="amber"
                onClick={() => setShowBattlefieldInfoModal(true)}
              />
            </div>
          </div>
        ) : (
          <div className="h-12 flex items-center justify-between max-w-2xl mx-auto px-2">
            <div className="flex items-center gap-2 text-stone-400 font-bold">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm tracking-wider">敵方將領運籌行動中...</span>
            </div>
            <button
              onClick={() => setShowBattlefieldInfoModal(true)}
              className="px-3 py-1.5 bg-[#251e18] hover:bg-[#352c24] border border-amber-500/50 rounded-lg text-xs font-black text-amber-300 flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>檢視戰場情報</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. 戰法抽取抽屜 */}
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
                const isAoe = isAoeSkill(s);
                const isAlly = isAllySkill(s);

                return (
                  <button
                    key={s}
                    disabled={!canAfford}
                    onClick={() => {
                      setSelectedSkill(s);
                      setShowSkillDrawer(false);
                      if (isAoe) {
                        // 全體戰法立即執行
                        handleSkillAttack();
                      } else {
                        setTargetingMode('skill');
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      canAfford 
                        ? 'border-amber-500/60 bg-[#2b221a] hover:bg-[#3d3025] hover:border-amber-400 text-stone-100 cursor-pointer active:scale-98 shadow-md' 
                        : 'border-[#382e25] bg-[#171310] text-stone-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-amber-300">{skillDef.name}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          isAoe ? 'bg-purple-900 text-purple-200 border border-purple-600' :
                          isAlly ? 'bg-emerald-900 text-emerald-200 border border-emerald-600' :
                          'bg-stone-800 text-stone-300 border border-stone-600'
                        }`}>
                          {isAoe ? '全體' : isAlly ? '友軍' : '敵單體'}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                        canAfford ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-stone-900 border-stone-800 text-stone-600'
                      }`}>
                        消耗 SP: {skillDef.cost}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-snug">{skillDef.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. 戰役結束結算 Modal */}
      {battleOutcome && (
        <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1c1815] border-2 border-amber-500/70 p-6 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
              battleOutcome.isWin ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-red-950/40 border-red-500 text-red-400'
            }`}>
              {battleOutcome.isWin ? <Crown className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
            </div>

            <div className="flex flex-col gap-1">
              <h2 className={`text-2xl font-black ${battleOutcome.isWin ? 'text-amber-300' : 'text-rose-400'}`}>
                {battleOutcome.title}
              </h2>
              <p className="text-sm text-stone-300 leading-relaxed font-sans mt-1">
                {battleOutcome.message}
              </p>
            </div>

            <button
              onClick={() => onResolveBattle(battleOutcome.winner)}
              className="w-full py-3 rounded-xl font-black text-sm sm:text-base border-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 border-amber-300 shadow-lg cursor-pointer active:scale-95 transition-all"
            >
              {battleOutcome.isWin ? '👑 凱旋進駐（確認）' : '🛡️ 收拾殘部・班師回城（確認）'}
            </button>
          </div>
        </div>
      )}

      {/* 6. 陣地全鑑 Modal */}
      {showTerrainMatrixModal && (
        <FormationTerrainMatrixModal
          currentTerrain={battleState.terrain}
          currentProvinceName={battleState.provinceName}
          onClose={() => setShowTerrainMatrixModal(false)}
        />
      )}

      {/* 7. 戰報紀錄 Modal */}
      {showLogsModal && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e1814] border-2 border-[#473b30] p-4 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#3b3026]">
              <span className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-amber-400" />
                戰役即時全紀錄 ({logs.length} 條)
              </span>
              <button onClick={() => setShowLogsModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-1.5 flex-1 pr-1 text-xs">
              {logs.slice().reverse().map(l => (
                <div key={l.id} className="p-2 rounded bg-[#16120e] border border-[#2b221a] text-stone-300">
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. 戰場情報與行動順序列隊 Modal (需求 5) */}
      {showBattlefieldInfoModal && (
        <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-fade-in font-serif">
          <div className="bg-[#1b1713] border-2 border-amber-500/70 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal 標題與分頁切換 */}
            <div className="bg-[#241e18] border-b border-[#47382b] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="font-black text-base text-amber-300">戰場情報與行軍全覽</span>
              </div>
              <button 
                onClick={() => setShowBattlefieldInfoModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab 切換：行動順序列隊 vs 敵我武將狀態 */}
            <div className="grid grid-cols-2 bg-[#171310] border-b border-[#3b2f24] p-1 gap-1">
              <button
                onClick={() => setBattlefieldInfoTab('queue')}
                className={`py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  battlefieldInfoTab === 'queue'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                <span>戰鬥先攻順序列隊 ({turnQueue.length} 員)</span>
              </button>

              <button
                onClick={() => setBattlefieldInfoTab('generals')}
                className={`py-2 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  battlefieldInfoTab === 'generals'
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/60 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>敵我全體武將狀態</span>
              </button>
            </div>

            {/* Tab 內容區 */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3">
              {battlefieldInfoTab === 'queue' ? (
                /* 先攻行動順序列隊 */
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-amber-400/90 font-bold px-1 flex items-center justify-between">
                    <span>⚡ 本回合行動先後順序（依武力 + 陣形先攻 + 地勢加成計算）：</span>
                    <span className="text-stone-400 text-[11px]">當前行動標示為金色</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {turnQueue.map((unitId, index) => {
                      const u = battleState.units.find((x: any) => x.id === unitId);
                      if (!u) return null;
                      const gen = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
                      const isCurrent = activeUnitId === u.id;
                      const isPlayer = isDefense ? !u.isAttacker : u.isAttacker;
                      const terrainEff = getFormationTerrainEffect(u.formation || '', battlefieldTerrain);

                      return (
                        <div
                          key={unitId}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            isCurrent
                              ? 'bg-[#3b2e21] border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
                              : isPlayer
                                ? 'bg-[#15232d] border-sky-800/70'
                                : 'bg-[#2a1717] border-rose-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* 序號標記 */}
                            <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                              isCurrent 
                                ? 'bg-amber-500 text-stone-950 font-black animate-pulse' 
                                : 'bg-stone-800 text-stone-300'
                            }`}>
                              {index + 1}
                            </span>

                            <GeneralAvatar name={u.generalName} size={36} className="rounded-full shrink-0" />

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] px-1 py-0.2 rounded font-black border ${
                                  isPlayer ? 'bg-sky-950 text-sky-300 border-sky-700' : 'bg-rose-950 text-rose-300 border-rose-700'
                                }`}>
                                  {isPlayer ? '我軍' : '敵軍'}
                                </span>
                                <span className="font-black text-sm text-stone-100 truncate">
                                  {u.generalName}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-1.5 py-0.2 rounded">
                                    當前行動
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-stone-300 mt-0.5">
                                <span>陣形: <strong className="text-amber-300">{u.formation}</strong> ({terrainEff.rating}級)</span>
                                <span>|</span>
                                <span>兵力: <strong className="text-sky-300">{u.troops.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* 數值展示：士氣、訓練、體力 */}
                          <div className="flex flex-col items-end gap-1 shrink-0 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-300 font-bold">士:{u.morale ?? 100}</span>
                              <span className="text-emerald-300 font-bold">訓:{u.training ?? 80}</span>
                              <span className="text-sky-300 font-bold">體:{u.stamina ?? 100}</span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-sans">
                              武:{gen.str} 智:{gen.int}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 敵我全體武將狀態 */
                <div className="flex flex-col gap-4">
                  {/* 我軍全體武將 (首發 + 後備) */}
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-black text-sky-400 flex items-center justify-between pb-1 border-b border-sky-900/50">
                      <span>🔷 我方參戰將領名冊（首發 {playerUnits.length} 員 + 待命後備 {playerReserves.length} 員）</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 首發武將 */}
                      {playerUnits.map((u: BattleUnit) => {
                        const gen = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
                        const terrainEff = getFormationTerrainEffect(u.formation || '', battlefieldTerrain);
                        return (
                          <div key={u.id} className="p-2.5 rounded-xl border border-sky-900/70 bg-[#16212b] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <GeneralAvatar name={u.generalName} size={36} className="rounded-full shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-black text-xs sm:text-sm text-stone-100 truncate">{u.generalName}</span>
                                  <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-700 px-1 rounded font-bold">首發</span>
                                  {u.isCommander && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                                <span className="text-[10px] text-stone-300">
                                  兵力: <strong className="text-sky-300">{u.troops.toLocaleString()}</strong> / {u.maxTroops?.toLocaleString()}
                                </span>
                                <div className="flex items-center gap-1.5 text-[9px] text-stone-400 mt-0.5">
                                  <span className="text-amber-300 font-bold">士:{u.morale ?? 100}</span>
                                  <span className="text-emerald-300 font-bold">訓:{u.training ?? 80}</span>
                                  <span className="text-sky-300 font-bold">體:{u.stamina ?? 100}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-[10px] text-stone-300 shrink-0">
                              <span className="font-bold text-amber-300">{u.formation} ({terrainEff.rating})</span>
                              <span>武:{gen.str} 智:{gen.int}</span>
                              <span className="text-[9px] text-stone-400">戰法: {u.skills?.length || 0} 種</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* 後備待命援將 */}
                      {playerReserves.map((gName) => {
                        const gen = gameState.generalsData[gName] || { str: 50, int: 50, soldiers: 1000 };
                        return (
                          <div key={gName} className="p-2.5 rounded-xl border border-dashed border-sky-900/40 bg-[#121921] flex items-center justify-between gap-2 opacity-80">
                            <div className="flex items-center gap-2 min-w-0">
                              <GeneralAvatar name={gName} size={34} className="rounded-full shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-black text-xs text-stone-300 truncate">{gName}</span>
                                  <span className="text-[9px] bg-stone-900 text-stone-400 border border-stone-700 px-1 rounded font-bold">待命後備</span>
                                </div>
                                <span className="text-[10px] text-stone-400">預備兵力: {gen.soldiers.toLocaleString()}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-stone-400">武:{gen.str} 智:{gen.int}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 敵軍全體武將 (首發 + 後備) */}
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-black text-rose-400 flex items-center justify-between pb-1 border-b border-rose-900/50">
                      <span>🔶 敵方參戰將領名冊（首發 {enemyUnits.length} 員 + 待命後備 {enemyReserves.length} 員）</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 首發武將 */}
                      {enemyUnits.map((u: BattleUnit) => {
                        const gen = gameState.generalsData[u.generalName] || { str: 50, int: 50 };
                        const terrainEff = getFormationTerrainEffect(u.formation || '', battlefieldTerrain);
                        return (
                          <div key={u.id} className="p-2.5 rounded-xl border border-rose-900/70 bg-[#261515] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <GeneralAvatar name={u.generalName} size={36} className="rounded-full shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-black text-xs sm:text-sm text-stone-100 truncate">{u.generalName}</span>
                                  <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-700 px-1 rounded font-bold">首發</span>
                                  {u.isCommander && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                                <span className="text-[10px] text-stone-300">
                                  兵力: <strong className="text-rose-300">{u.troops.toLocaleString()}</strong> / {u.maxTroops?.toLocaleString()}
                                </span>
                                <div className="flex items-center gap-1.5 text-[9px] text-stone-400 mt-0.5">
                                  <span className="text-amber-300 font-bold">士:{u.morale ?? 100}</span>
                                  <span className="text-emerald-300 font-bold">訓:{u.training ?? 80}</span>
                                  <span className="text-sky-300 font-bold">體:{u.stamina ?? 100}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-[10px] text-stone-300 shrink-0">
                              <span className="font-bold text-amber-300">{u.formation} ({terrainEff.rating})</span>
                              <span>武:{gen.str} 智:{gen.int}</span>
                              <span className="text-[9px] text-stone-400">戰法: {u.skills?.length || 0} 種</span>
                            </div>
                          </div>
                        );
                      })}

                      {/* 後備待命援將 */}
                      {enemyReserves.map((gName) => {
                        const gen = gameState.generalsData[gName] || { str: 50, int: 50, soldiers: 1000 };
                        return (
                          <div key={gName} className="p-2.5 rounded-xl border border-dashed border-rose-900/40 bg-[#1e1010] flex items-center justify-between gap-2 opacity-80">
                            <div className="flex items-center gap-2 min-w-0">
                              <GeneralAvatar name={gName} size={34} className="rounded-full shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-black text-xs text-stone-300 truncate">{gName}</span>
                                  <span className="text-[9px] bg-stone-900 text-stone-400 border border-stone-700 px-1 rounded font-bold">待命後備</span>
                                </div>
                                <span className="text-[10px] text-stone-400">預備兵力: {gen.soldiers.toLocaleString()}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-stone-400">武:{gen.str} 智:{gen.int}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5v5 單位條狀組件 (包含士氣、訓練度、狀態徽章，並針對敵軍隱藏體力以優化手機端排版 - 需求 2, 3, 4)
function CompactUnitStrip({
  unit,
  isEnemy,
  gameState,
  battlefieldTerrain,
  isActive,
  isTargetable,
  floatingText,
  onSelect
}: {
  key?: React.Key;
  unit: BattleUnit;
  isEnemy?: boolean;
  gameState: GameState;
  battlefieldTerrain: FormationTerrainType;
  isActive: boolean;
  isTargetable: boolean;
  floatingText: any;
  onSelect: () => void;
}) {
  const gen = gameState.generalsData[unit.generalName];
  const isDead = unit.troops <= 0;
  const maxTroops = unit.maxTroops || unit.troops || 1;
  const hpPercent = maxTroops > 0 ? (unit.troops / maxTroops) * 100 : 0;
  const terrainCompat = getFormationTerrainEffect(unit.formation || '', battlefieldTerrain);

  // 特殊狀態徽章定義
  const getStatusBadge = (status?: BattleUnitStatus) => {
    switch (status) {
      case 'burning':
        return (
          <span className="px-1 py-0.2 rounded bg-red-900/90 text-red-200 border border-red-500 text-[9px] font-black flex items-center gap-0.5 animate-pulse shadow">
            🔥 著火
          </span>
        );
      case 'confused':
        return (
          <span className="px-1 py-0.2 rounded bg-purple-900/90 text-purple-200 border border-purple-500 text-[9px] font-black flex items-center gap-0.5 animate-pulse shadow">
            🌀 混亂
          </span>
        );
      case 'panicked':
        return (
          <span className="px-1 py-0.2 rounded bg-amber-900/90 text-amber-200 border border-amber-500 text-[9px] font-black flex items-center gap-0.5 animate-pulse shadow">
            😨 恐慌
          </span>
        );
      case 'defending':
        return (
          <span className="px-1 py-0.2 rounded bg-blue-900/90 text-blue-200 border border-blue-400 text-[9px] font-black flex items-center gap-0.5 shadow">
            🛡️ 防禦
          </span>
        );
      case 'moraled':
        return (
          <span className="px-1 py-0.2 rounded bg-amber-500 text-stone-950 border border-amber-300 text-[9px] font-black flex items-center gap-0.5 shadow">
            🎺 鼓舞
          </span>
        );
      case 'disarray':
        return (
          <span className="px-1 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-600 text-[9px] font-black flex items-center gap-0.5 shadow">
            💨 潰動
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-1.5 sm:p-2 rounded-xl border-2 transition-all flex items-center justify-between
        ${isDead ? 'opacity-30 bg-[#15120f] border-stone-800' : ''}
        ${!isDead && isActive ? 'border-amber-400 bg-[#3a2d21] ring-2 ring-amber-400/80 shadow-lg scale-[1.01]' : ''}
        ${!isDead && !isActive && !isTargetable ? 'border-[#382d23] bg-[#1d1713] hover:border-[#4d3d30]' : ''}
        ${isTargetable ? 'border-rose-500 bg-[#351a1a] hover:bg-[#472222] cursor-pointer ring-2 ring-rose-500 animate-pulse' : ''}
      `}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <div className="relative shrink-0">
          <GeneralAvatar name={unit.generalName} size={32} className="rounded-full" />
          {unit.isCommander && (
            <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1 drop-shadow" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-black text-xs sm:text-sm text-stone-100 truncate max-w-[80px] sm:max-w-none">
              {unit.generalName}
            </span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-black border shrink-0 ${
              terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
              terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
              'bg-stone-800 text-stone-300 border-stone-600'
            }`}>
              {unit.formation}
            </span>
            {/* 特殊異常狀態徽章 */}
            {unit.status && unit.status !== 'normal' && getStatusBadge(unit.status)}
          </div>

          {/* 兵力 HP 條 */}
          <div className="flex items-center gap-1.5">
            <div className="w-14 sm:w-20 h-1.5 bg-[#120f0d] rounded-full overflow-hidden border border-[#3b3128] shrink-0">
              <div 
                className={`h-full transition-all duration-300 ${
                  hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 20 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-sky-300 shrink-0">
              {isDead ? '潰敗' : unit.troops.toLocaleString()}
            </span>
          </div>

          {/* 士氣 & 訓練度 (敵我皆顯示) + 體力 (僅我方顯示，敵方隱藏以確保手機端不溢出且符合戰爭迷霧) */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] leading-tight flex-wrap">
            <span className="flex items-center gap-0.5 font-bold text-amber-300 shrink-0">
              <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              士:{unit.morale ?? 100}
            </span>
            <span className="flex items-center gap-0.5 font-bold text-emerald-300 shrink-0">
              <Target className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              訓:{unit.training ?? 80}
            </span>
            {!isEnemy && (
              <span className="flex items-center gap-0.5 font-bold text-sky-300 shrink-0">
                <Zap className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                體:{unit.stamina ?? 100}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 浮動傷害數字 */}
      {floatingText && (
        <div className="absolute right-2 top-1 text-sm sm:text-base font-black text-rose-400 animate-bounce drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-30 pointer-events-none">
          {floatingText.text}
        </div>
      )}
    </div>
  );
}

// 底部圖形化軍令按鈕
function GraphicCommandButton({
  icon,
  label,
  subLabel,
  theme,
  disabled,
  isActive,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  theme: 'rose' | 'sky' | 'stone' | 'emerald' | 'amber';
  disabled?: boolean;
  isActive?: boolean;
  onClick: () => void;
}) {
  const themeClasses = {
    rose: 'border-rose-700/70 bg-gradient-to-b from-[#381a1a] to-[#201010] hover:from-[#4a2222] hover:to-[#2b1616] text-rose-200',
    sky: 'border-sky-700/70 bg-gradient-to-b from-[#182a38] to-[#0f1922] hover:from-[#21394c] hover:to-[#14232e] text-sky-200',
    stone: 'border-stone-700/70 bg-gradient-to-b from-[#2a241f] to-[#171411] hover:from-[#3a322b] hover:to-[#221c17] text-stone-200',
    emerald: 'border-emerald-700/70 bg-gradient-to-b from-[#183020] to-[#0d1c12] hover:from-[#21422c] hover:to-[#122619] text-emerald-200',
    amber: 'border-amber-700/70 bg-gradient-to-b from-[#332415] to-[#1a1209] hover:from-[#45321f] hover:to-[#24190d] text-amber-200'
  }[theme];

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        p-1.5 sm:p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all cursor-pointer shadow-md
        ${themeClasses}
        ${isActive ? 'ring-2 ring-amber-400 scale-[1.02]' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
      `}
    >
      {icon}
      <span className="font-black text-xs sm:text-sm tracking-wider">{label}</span>
      <span className="text-[9px] sm:text-[10px] text-stone-400 font-bold truncate max-w-full">
        {subLabel}
      </span>
    </button>
  );
}
