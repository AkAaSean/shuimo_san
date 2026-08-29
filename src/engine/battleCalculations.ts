import { BattleUnit, GeneralState, TerrainType, GridCell, PassiveSkillDef, PassiveSkillId } from '../types';
import { 
  FORMATIONS, 
  getTerrainEffectiveness, 
  getTerrainMobilityCost,
  calculateFormationTerrainCombatModifier,
  calculateBatchFormationCombatModifiers,
  getBestFormationForProvince,
  FormationTerrainCombatPowerResult,
  TerrainCombatModifierBreakdown
} from './formations';

export {
  calculateFormationTerrainCombatModifier,
  calculateBatchFormationCombatModifiers,
  getBestFormationForProvince
};
export type {
  FormationTerrainCombatPowerResult,
  TerrainCombatModifierBreakdown
};

/**
 * 光榮《三國志V》被動特技定義庫
 */
export const PASSIVE_SKILL_REGISTRY: Record<PassiveSkillId, PassiveSkillDef> = {
  '沉著': {
    id: '沉著',
    name: '沉著',
    category: '防禦被動',
    desc: '下回合自動恢復部隊不良狀態（解除混亂），並大幅降低受到負面計略（如混亂、內鬨、妖術）的機率與傷害。',
    triggerLabel: '【沉著】整軍防患',
    triggerType: 'strategy_targeted',
    iconSymbol: '🛡️'
  },
  '反計': {
    id: '反計',
    name: '反計',
    category: '防禦被動',
    desc: '當敵人對我方使用計略時，有機會識破並自動將計略反彈給敵方部隊反噬。',
    triggerLabel: '【反計】識破反噬',
    triggerType: 'strategy_targeted',
    iconSymbol: '🔄'
  },
  '無雙': {
    id: '無雙',
    name: '無雙',
    category: '戰鬥被動',
    desc: '使敵人的圍攻/聯合攻擊加成無效化，並在敵軍夾擊時激發自身攻擊力（戰意沸騰）。',
    triggerLabel: '【無雙】萬人莫敵',
    triggerType: 'melee_defense',
    iconSymbol: '⚔️'
  },
  '奮發': {
    id: '奮發',
    name: '奮發',
    category: '戰鬥被動',
    desc: '提升部隊在近戰肉搏時的輸出傷害表現（近戰傷害 +30%）。',
    triggerLabel: '【奮發】勇武先登',
    triggerType: 'melee_attack',
    iconSymbol: '💥'
  },
  '回射': {
    id: '回射',
    name: '回射',
    category: '戰鬥被動',
    desc: '當敵方部隊進行弓箭攻擊時，若自身未被消滅，可自動進行弓箭反擊。',
    triggerLabel: '【回射】神速截擊',
    triggerType: 'archery_defense',
    iconSymbol: '🏹'
  },
  '騎射': {
    id: '騎射',
    name: '騎射',
    category: '戰鬥被動',
    desc: '允許騎兵部隊在裝備或地形允許下直接使用弓箭攻擊，並獲得馳射加成。',
    triggerLabel: '【騎射】奔射貫穿',
    triggerType: 'archery_attack',
    iconSymbol: '🐎'
  },
  '藤甲': {
    id: '藤甲',
    name: '藤甲',
    category: '特種被動',
    desc: '弓箭攻擊近乎無效，近戰受損大幅降低，但極怕火攻（受火傷害翻倍）。',
    triggerLabel: '【藤甲】刀槍不入',
    triggerType: 'melee_defense',
    iconSymbol: '🪵'
  }
};

/**
 * 檢查武將/部隊是否擁有指定被動特技 (沉著、反計、無雙、奮發、回射、騎射、藤甲)
 */
export function hasPassiveSkill(
  unit: BattleUnit | null | undefined,
  gen: GeneralState | null | undefined,
  skillId: PassiveSkillId | string
): boolean {
  if (!unit && !gen) return false;
  const unitPassives = (unit?.passives || []) as string[];
  const unitSkills = unit?.skills || [];
  const genPassives = (gen?.passives || []) as string[];
  const genSkills = gen?.skills || [];
  return (
    unitPassives.includes(skillId) ||
    unitSkills.includes(skillId) ||
    genPassives.includes(skillId) ||
    genSkills.includes(skillId)
  );
}

/**
 * 取得六角格鄰近六方向座標 (odd-q vertical layout)
 */
export function getHexNeighbors(col: number, row: number, maxCols: number, maxRows: number): { col: number; row: number }[] {
  const isOdd = (col % 2 !== 0);
  const offsets = isOdd ? [
    { dc: 0, dr: -1 },  // 上
    { dc: 0, dr: 1 },   // 下
    { dc: -1, dr: 0 },  // 左上
    { dc: -1, dr: 1 },  // 左下
    { dc: 1, dr: 0 },   // 右上
    { dc: 1, dr: 1 },   // 右下
  ] : [
    { dc: 0, dr: -1 },  // 上
    { dc: 0, dr: 1 },   // 下
    { dc: -1, dr: -1 }, // 左上
    { dc: -1, dr: 0 },  // 左下
    { dc: 1, dr: -1 },  // 右上
    { dc: 1, dr: 0 },   // 右下
  ];

  const results: { col: number; row: number }[] = [];
  for (let i = 0; i < offsets.length; i++) {
    const nc = col + offsets[i].dc;
    const nr = row + offsets[i].dr;
    if (nc >= 0 && nc < maxCols && nr >= 0 && nr < maxRows) {
      results.push({ col: nc, row: nr });
    }
  }
  return results;
}

/**
 * 計算兩六角格座標間之精確六角戰術距離 (odd-q vertical layout)
 */
export function getHexDistance(c1: number, r1: number, c2: number, r2: number): number {
  const q1 = c1;
  const r1_ax = r1 - Math.floor((c1 - (c1 & 1)) / 2);
  const s1 = -q1 - r1_ax;

  const q2 = c2;
  const r2_ax = r2 - Math.floor((c2 - (c2 & 1)) / 2);
  const s2 = -q2 - r2_ax;

  return Math.max(
    Math.abs(q1 - q2),
    Math.abs(r1_ax - r2_ax),
    Math.abs(s1 - s2)
  );
}

/**
 * 依陣形機動力與地形移動消耗，計算部隊可移動目標格（Dijkstra 最短消耗演算法）
 */
export function calculateValidMovementRange(
  activeUnit: BattleUnit,
  allUnits: BattleUnit[],
  grid: { col: number; row: number; terrain: TerrainType }[],
  maxCols: number,
  maxRows: number
): { col: number; row: number }[] {
  const formationStats = getUnitFormationStats(activeUnit.formation);
  const maxMobility = formationStats.mobility || 16;
  const formationType = formationStats.type || '平地';

  // 地形快速查詢字典
  const terrainMap = new Map<string, TerrainType>();
  for (let i = 0; i < grid.length; i++) {
    terrainMap.set(`${grid[i].col},${grid[i].row}`, grid[i].terrain);
  }

  // 佔位單位快速查詢字典
  const unitMap = new Map<string, BattleUnit>();
  for (let i = 0; i < allUnits.length; i++) {
    const u = allUnits[i];
    if (u.troops > 0) {
      unitMap.set(`${u.col},${u.row}`, u);
    }
  }

  // Dijkstra / Priority Queue
  const minCostMap = new Map<string, number>();
  const queue: { col: number; row: number; cost: number }[] = [];

  const startKey = `${activeUnit.col},${activeUnit.row}`;
  minCostMap.set(startKey, 0);
  queue.push({ col: activeUnit.col, row: activeUnit.row, cost: 0 });

  const validTargets: { col: number; row: number }[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const curr = queue.shift()!;

    if (curr.cost > minCostMap.get(`${curr.col},${curr.row}`)!) {
      continue;
    }

    // 若該格非起點，且沒有任何存活部隊佔位，則可作為合法停駐點
    const occupyingUnit = unitMap.get(`${curr.col},${curr.row}`);
    if ((curr.col !== activeUnit.col || curr.row !== activeUnit.row) && !occupyingUnit) {
      validTargets.push({ col: curr.col, row: curr.row });
    }

    // 展開 6 個方向的相鄰六角格
    const neighbors = getHexNeighbors(curr.col, curr.row, maxCols, maxRows);
    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      const nKey = `${n.col},${n.row}`;
      const terrain = terrainMap.get(nKey) || '平地';
      const moveCost = getTerrainMobilityCost(formationType, terrain);
      const nextCost = curr.cost + moveCost;

      if (nextCost <= maxMobility) {
        // 敵軍阻擋判定：不能穿過敵方部隊
        const obstacleUnit = unitMap.get(nKey);
        if (obstacleUnit && obstacleUnit.isAttacker !== activeUnit.isAttacker) {
          continue; // 敵軍阻斷行軍路線
        }

        if (!minCostMap.has(nKey) || nextCost < minCostMap.get(nKey)!) {
          minCostMap.set(nKey, nextCost);
          queue.push({ col: n.col, row: n.row, cost: nextCost });
        }
      }
    }
  }

  return validTargets;
}

/**
 * 取得部隊陣形詳細屬性
 */
export function getUnitFormationStats(formationName?: string) {
  const form = FORMATIONS.find(f => f.name === formationName) || FORMATIONS.find(f => f.name === '平地') || FORMATIONS[0];
  return form;
}

/**
 * 計算相鄰敵軍數量（用於圍攻判定與【無雙】觸發）
 */
export function countAdjacentEnemies(
  targetUnit: BattleUnit,
  allUnits: BattleUnit[]
): number {
  const enemies = allUnits.filter(u => u.isAttacker !== targetUnit.isAttacker && u.troops > 0);
  let count = 0;
  for (const enemy of enemies) {
    if (getHexDistance(targetUnit.col, targetUnit.row, enemy.col, enemy.row) <= 1) {
      count++;
    }
  }
  return count;
}

export interface MeleeCombatResult {
  attackerDamage: number; // 守方損失
  defenderCounterDamage: number; // 攻方反擊損失
  passivesTriggered: {
    skillId: PassiveSkillId;
    actor: 'attacker' | 'defender';
    message: string;
  }[];
  combatLogs: string[];
  isAttackerEliminated: boolean;
  isDefenderEliminated: boolean;
  targetNewStatus?: 'normal' | 'confused' | 'disarray';
}

/**
 * 1. 近戰肉搏戰鬥計算（包含【奮發】、【無雙】、【藤甲】）
 */
export function calculateMeleeCombat(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerGen: GeneralState,
  defenderGen: GeneralState,
  allUnits: BattleUnit[],
  isDeadlyAssault: boolean = false,
  terrain: TerrainType = '平地'
): MeleeCombatResult {
  const passivesTriggered: MeleeCombatResult['passivesTriggered'] = [];
  const combatLogs: string[] = [];

  const aForm = getUnitFormationStats(attacker.formation);
  const dForm = getUnitFormationStats(defender.formation);

  // 基礎武力與戰術攻防係數
  const aStr = attackerGen.str || 60;
  const dStr = defenderGen.str || 60;
  const aHp = attackerGen.hp || 60;
  const dHp = defenderGen.hp || 60;
  const aTraining = attackerGen.training ?? 70;
  const dTraining = defenderGen.training ?? 70;
  const aWeapons = attackerGen.weapons ?? 60;
  const dWeapons = defenderGen.weapons ?? 60;

  // 訓練度與裝備加成係數 (訓練 100 = 1.15x, 70 = 1.0x, 30 = 0.8x)
  const aTrainMult = 0.65 + (aTraining / 100) * 0.5;
  const dTrainMult = 0.65 + (dTraining / 100) * 0.5;
  const aWeapMult = 0.85 + (aWeapons / 100) * 0.25;
  const dWeapMult = 0.85 + (dWeapons / 100) * 0.25;

  // 1. 攻方基礎傷害計算 (武力 + 體力 + 陣形攻擊力) * 兵力乘數 * 訓練與裝備係數
  let rawAtkPower = (aStr * 0.6 + aHp * 0.4 + aForm.atk * 4) * (attacker.troops / 1000 + 1.2) * aTrainMult * aWeapMult;
  let rawDefArmor = (dStr * 0.3 + dHp * 0.7 + dForm.def * 4) * dTrainMult * dWeapMult;

  // 地形效果加成 (Terrain Effectiveness)
  const attackerTerrainBonus = getTerrainEffectiveness(aForm.type, terrain);
  const defenderTerrainBonus = getTerrainEffectiveness(dForm.type, terrain);
  
  if (attackerTerrainBonus === 16) {
    rawDefArmor += 11; // 城池防禦特殊加成
  } else {
    rawAtkPower *= (1 + attackerTerrainBonus * 0.05); // 每個效果點數增加 5% 傷害
  }

  if (defenderTerrainBonus === 16) {
    rawDefArmor += 11;
  } else {
    rawDefArmor *= (1 + defenderTerrainBonus * 0.05);
  }

  // 偃月陣特殊：武力越高越強
  if (aForm.name === '偃月') {
    rawAtkPower *= (1 + (aStr / 100) * 0.5); 
  }
  if (dForm.name === '偃月') {
    rawDefArmor *= (1 + (dStr / 100) * 0.5);
  }

  // 奮發 (Valiance) 被動判定：近戰傷害提升 +30%
  if (hasPassiveSkill(attacker, attackerGen, '奮發')) {
    rawAtkPower *= 1.30;
    passivesTriggered.push({
      skillId: '奮發',
      actor: 'attacker',
      message: `【奮發】觸發！${attacker.generalName} 勇氣百倍，近戰肉搏傷害提升 30%！`
    });
    combatLogs.push(`💥 ${attacker.generalName} 觸發【奮發】，刀槍凌厲猛攻！`);
  }

  // 攻方若持有無雙且帶有戰意 Buff
  if (attacker.attackBuff && attacker.attackBuff > 0) {
    rawAtkPower *= (1 + attacker.attackBuff);
    combatLogs.push(`⚡ ${attacker.generalName} 帶著無雙戰意發起猛攻！`);
  }

  // 死戰加成
  if (isDeadlyAssault) {
    rawAtkPower *= 1.45;
    combatLogs.push(`⚔️ ${attacker.generalName} 展開【死戰】，全軍殊死搏殺！`);
  }

  // 混亂狀態削弱
  if (attacker.status === 'confused') {
    rawAtkPower *= 0.5;
    combatLogs.push(`🌀 ${attacker.generalName} 處於混亂狀態，攻擊力大減！`);
  }
  if (defender.status === 'confused') {
    rawDefArmor *= 0.5;
    combatLogs.push(`🌀 ${defender.generalName} 部隊混亂，防禦崩潰！`);
  }

  // 2. 圍攻與【無雙】防禦判定
  const surroundingEnemies = countAdjacentEnemies(defender, allUnits);
  const isSurrounded = surroundingEnemies >= 2;
  const defenderHasPeerless = hasPassiveSkill(defender, defenderGen, '無雙');

  if (isSurrounded) {
    if (defenderHasPeerless) {
      // 無雙：使敵人的圍攻/聯合攻擊無效化，並激發自身攻擊力
      passivesTriggered.push({
        skillId: '無雙',
        actor: 'defender',
        message: `【無雙】觸發！${defender.generalName} 萬人莫敵，敵軍圍攻夾擊徹底失效，並激發無雙反擊戰意！`
      });
      combatLogs.push(`🛡️ ${defender.generalName} 觸發【無雙】！無視多方夾擊，戰意激昂！`);
      rawDefArmor *= 1.2; // 防禦更穩固
    } else {
      // 一般部隊被包夾，受到額外 25%~40% 傷害
      const surroundMultiplier = 1 + (surroundingEnemies - 1) * 0.15;
      rawAtkPower *= surroundMultiplier;
      combatLogs.push(`👥 敵軍多方包夾 ${defender.generalName}，形成夾攻！`);
    }
  }

  // 藤甲防禦被動
  if (hasPassiveSkill(defender, defenderGen, '藤甲')) {
    rawAtkPower *= 0.60; // 物理傷害減免 40%
    passivesTriggered.push({
      skillId: '藤甲',
      actor: 'defender',
      message: `【藤甲】觸發！${defender.generalName} 身穿藤甲，近戰刀槍傷害大幅減免 40%！`
    });
    combatLogs.push(`🪵 ${defender.generalName} 身披【藤甲】，刀槍難入！`);
  }

  // 計算最終守方損失
  const randomFactor1 = 0.9 + Math.random() * 0.2;
  let attackerDamage = Math.floor(Math.max(80, (rawAtkPower / Math.max(20, rawDefArmor)) * 120 * randomFactor1));
  
  // 城防地利減傷庇護 (Option A+C)
  if (terrain === '城池' || terrain === '關寨') {
    attackerDamage = Math.floor(attackerDamage * 0.60);
    combatLogs.push(`🛡️ 【城垣避護】${defender.generalName} 駐守城垛關口，掩體使受到的近戰傷害減免 40%！`);
  } else if (terrain === '太守府') {
    attackerDamage = Math.floor(attackerDamage * 0.70);
    combatLogs.push(`🏯 【太守府防衛】${defender.generalName} 駐守大本營核心，獲得 30% 防禦減傷加成！`);
  }

  attackerDamage = Math.min(defender.troops, attackerDamage);

  // 3. 守方反擊計算
  let defenderCounterDamage = 0;
  const remainingDefenderTroops = defender.troops - attackerDamage;

  if (remainingDefenderTroops > 0) {
    let rawCounterPower = (dStr * 0.5 + dHp * 0.4 + dForm.atk * 3) * (remainingDefenderTroops / 1000 + 1.0);
    let rawAttackerArmor = (aStr * 0.3 + aHp * 0.7 + aForm.def * 4);

    // 守方無雙被夾擊後反擊大幅增強
    if (defenderHasPeerless && isSurrounded) {
      rawCounterPower *= 1.45;
      combatLogs.push(`⚡ ${defender.generalName} 【無雙】之威爆發，奮起千鈞神力全力反撲！`);
    } else if (hasPassiveSkill(defender, defenderGen, '奮發')) {
      rawCounterPower *= 1.25;
    }

    if (isDeadlyAssault) {
      rawCounterPower *= 1.35; // 死戰雙方都承受高反擊
    }

    // 攻方藤甲減傷
    if (hasPassiveSkill(attacker, attackerGen, '藤甲')) {
      rawCounterPower *= 0.60;
    }

    const randomFactor2 = 0.85 + Math.random() * 0.3;
    defenderCounterDamage = Math.floor(Math.max(40, (rawCounterPower / Math.max(20, rawAttackerArmor)) * 90 * randomFactor2));
    defenderCounterDamage = Math.min(attacker.troops, defenderCounterDamage);
  }

  combatLogs.push(`⚔️ ${attacker.generalName} 軍重創 ${defender.generalName} 軍，殲敵 ${attackerDamage} 人！`);
  if (defenderCounterDamage > 0) {
    combatLogs.push(`🛡️ ${defender.generalName} 軍奮力反擊，殺傷 ${attacker.generalName} 軍 ${defenderCounterDamage} 人！`);
  }

  return {
    attackerDamage,
    defenderCounterDamage,
    passivesTriggered,
    combatLogs,
    isAttackerEliminated: attacker.troops - defenderCounterDamage <= 0,
    isDefenderEliminated: defender.troops - attackerDamage <= 0
  };
}

export interface ArcheryCombatResult {
  archeryDamage: number; // 守方受傷
  isReturnFireTriggered: boolean;
  returnFireDamage: number; // 回射反擊攻方受傷
  passivesTriggered: {
    skillId: PassiveSkillId;
    actor: 'attacker' | 'defender';
    message: string;
  }[];
  combatLogs: string[];
  isAttackerEliminated: boolean;
  isDefenderEliminated: boolean;
}

/**
 * 2. 遠程弓箭攻擊計算（包含【騎射】、【回射】、【藤甲】）
 */
export function calculateArcheryCombat(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerGen: GeneralState,
  defenderGen: GeneralState,
  isFireArrow: boolean = false,
  _isBarrage: boolean = false,
  weather: string = '晴天',
  terrain: TerrainType = '平地'
): ArcheryCombatResult {
  const passivesTriggered: ArcheryCombatResult['passivesTriggered'] = [];
  const combatLogs: string[] = [];

  const aForm = getUnitFormationStats(attacker.formation);
  const dForm = getUnitFormationStats(defender.formation);

  const aStr = attackerGen.str || 60;
  const dHp = defenderGen.hp || 60;
  const dStr = defenderGen.str || 60;
  const aTraining = attackerGen.training ?? 70;
  const dTraining = defenderGen.training ?? 70;
  const aWeapons = attackerGen.weapons ?? 60;
  const dWeapons = defenderGen.weapons ?? 60;

  // 訓練與裝備乘數
  const aTrainMult = 0.65 + (aTraining / 100) * 0.5;
  const dTrainMult = 0.65 + (dTraining / 100) * 0.5;
  const aWeapMult = 0.85 + (aWeapons / 100) * 0.25;
  const dWeapMult = 0.85 + (dWeapons / 100) * 0.25;

  // 1. 弓箭攻擊力計算
  let bowAtkPower = (aStr * 0.55 + aForm.bowAtk * 5) * (attacker.troops / 1000 + 1.0) * aTrainMult * aWeapMult;
  let bowDefArmor = (dStr * 0.2 + dHp * 0.6 + dForm.bowDef * 4.5) * dTrainMult * dWeapMult;

  // 地形效果加成 (Terrain Effectiveness)
  const attackerTerrainBonus = getTerrainEffectiveness(aForm.type, terrain);
  const defenderTerrainBonus = getTerrainEffectiveness(dForm.type, terrain);
  
  if (attackerTerrainBonus === 16) {
    bowAtkPower *= 1.1; // 城池/關寨內弓兵攻擊也有加成
  } else {
    bowAtkPower *= (1 + attackerTerrainBonus * 0.05);
  }

  if (defenderTerrainBonus === 16) {
    bowDefArmor += 15; // 城池防禦弓箭效果強
  } else {
    bowDefArmor *= (1 + defenderTerrainBonus * 0.05);
  }

  // 騎射 (Mounted Archery) 被動判定
  const attackerHasMountedArchery = hasPassiveSkill(attacker, attackerGen, '騎射');
  const isCavalryFormation = ['錐行', '鋒矢', '長蛇'].includes(attacker.formation || '');

  if (attackerHasMountedArchery) {
    bowAtkPower *= 1.25; // 馳射威力和貫穿力 +25%
    passivesTriggered.push({
      skillId: '騎射',
      actor: 'attacker',
      message: `【騎射】觸發！${attacker.generalName} 精通走馬射箭，遠程馳射威力大增！`
    });
    combatLogs.push(`🐎 ${attacker.generalName} 發動【騎射】，快馬疾馳矢如雨下！`);
  } else if (isCavalryFormation && aForm.bowAtk <= 4) {
    // 沒有騎射被動的純騎兵陣形，弓箭威力較低
    bowAtkPower *= 0.7;
  }

  // 火箭加成
  if (isFireArrow) {
    if (weather === '雨天' || weather === '豪雨' || weather === '雪天') {
      combatLogs.push(`🌧️ 氣候不佳，火箭無法點燃！`);
      bowAtkPower *= 0.9;
    } else {
      bowAtkPower *= 1.25;
      combatLogs.push(`🔥 ${attacker.generalName} 發射【火箭】，烈焰破空！`);
    }
  }

  // 藤甲被動判定
  const defenderHasRattan = hasPassiveSkill(defender, defenderGen, '藤甲');
  if (defenderHasRattan) {
    if (isFireArrow) {
      // 遇火傷害翻倍！
      bowAtkPower *= 2.2;
      passivesTriggered.push({
        skillId: '藤甲',
        actor: 'defender',
        message: `【藤甲大忌】！${defender.generalName} 身著藤甲遭到火箭焚燒，受創慘重！`
      });
      combatLogs.push(`🔥 【藤甲大忌】${defender.generalName} 身著藤甲，遭火箭焚燒受創加倍！`);
    } else {
      // 普通弓箭近乎無效！
      bowAtkPower *= 0.1;
      passivesTriggered.push({
        skillId: '藤甲',
        actor: 'defender',
        message: `【藤甲】觸發！${defender.generalName} 的藤甲彈開了所有普通箭矢，幾乎無傷！`
      });
      combatLogs.push(`🛡️ 【藤甲】箭矢擊中 ${defender.generalName} 之藤甲紛紛墜地，幾無損傷！`);
    }
  }

  const randomFactor = 0.9 + Math.random() * 0.2;
  let archeryDamage = Math.floor(Math.max(50, (bowAtkPower / Math.max(20, bowDefArmor)) * 100 * randomFactor));
  
  // 城防防箭庇護 (Option A+C)
  if (terrain === '城池' || terrain === '關寨') {
    archeryDamage = Math.floor(archeryDamage * 0.60);
    combatLogs.push(`🛡️ 【城垛遮蔽】${defender.generalName} 處於城池關口，掩體使受到的箭矢傷害大幅減免 40%！`);
  } else if (terrain === '太守府') {
    archeryDamage = Math.floor(archeryDamage * 0.70);
    combatLogs.push(`🏯 【太守府防衛】${defender.generalName} 駐守大本營，受到的箭矢傷害減免 30%！`);
  }

  archeryDamage = Math.min(defender.troops, archeryDamage);

  combatLogs.push(`🏹 ${attacker.generalName} 箭陣齊射，射傷 ${defender.generalName} 軍 ${archeryDamage} 人！`);

  // 2. 回射 (Return Fire) 被動判定
  let isReturnFireTriggered = false;
  let returnFireDamage = 0;
  const remainingDefenderTroops = defender.troops - archeryDamage;

  if (remainingDefenderTroops > 0 && hasPassiveSkill(defender, defenderGen, '回射')) {
    isReturnFireTriggered = true;
    passivesTriggered.push({
      skillId: '回射',
      actor: 'defender',
      message: `【回射】觸發！${defender.generalName} 頂住箭雨，立即挽弓發動精準回射反擊！`
    });
    combatLogs.push(`🎯 ${defender.generalName} 觸發【回射】，挽弓如滿月反擊射向 ${attacker.generalName}！`);

    // 計算回射傷害
    let returnBowPower = (dStr * 0.55 + dForm.bowAtk * 4.5) * (remainingDefenderTroops / 1000 + 0.9);
    let returnBowArmor = (aStr * 0.2 + (attackerGen.hp || 60) * 0.6 + aForm.bowDef * 4.5);

    // 攻方藤甲防禦
    if (hasPassiveSkill(attacker, attackerGen, '藤甲')) {
      returnBowPower *= 0.1;
    }

    const returnRandom = 0.9 + Math.random() * 0.2;
    returnFireDamage = Math.floor(Math.max(40, (returnBowPower / Math.max(20, returnBowArmor)) * 90 * returnRandom));
    returnFireDamage = Math.min(attacker.troops, returnFireDamage);

    combatLogs.push(`🏹 回射反擊！${defender.generalName} 射傷 ${attacker.generalName} 軍 ${returnFireDamage} 人！`);
  }

  return {
    archeryDamage,
    isReturnFireTriggered,
    returnFireDamage,
    passivesTriggered,
    combatLogs,
    isAttackerEliminated: attacker.troops - returnFireDamage <= 0,
    isDefenderEliminated: defender.troops - archeryDamage <= 0
  };
}

export interface StrategyCombatResult {
  success: boolean;
  isCounterReflected: boolean; // 是否觸發【反計】彈回
  isCalmResisted: boolean; // 是否觸發【沉著】免疫
  damageToTarget: number;
  damageToCaster: number; // 若反計成功，施計者所受反噬傷害
  targetNewStatus?: 'normal' | 'confused' | 'disarray';
  casterNewStatus?: 'normal' | 'confused' | 'disarray';
  passivesTriggered: {
    skillId: PassiveSkillId;
    actor: 'caster' | 'target';
    message: string;
  }[];
  combatLogs: string[];
}

/**
 * 3. 計略施展計算（包含【沉著】、【反計】、【藤甲】）
 */
export function calculateStrategyExecution(
  caster: BattleUnit,
  target: BattleUnit,
  casterGen: GeneralState,
  targetGen: GeneralState,
  strategyName: string,
  _terrain: TerrainType = '平地'
): StrategyCombatResult {
  const passivesTriggered: StrategyCombatResult['passivesTriggered'] = [];
  const combatLogs: string[] = [];

  const cInt = casterGen.int || 60;
  const tInt = targetGen.int || 60;

  // 1. 【反計】判定（Counter-Strategy）
  const targetHasCounterStrategy = hasPassiveSkill(target, targetGen, '反計');
  const counterChance = Math.max(0.2, Math.min(0.85, 0.45 + (tInt - cInt) * 0.015));

  if (targetHasCounterStrategy && Math.random() < counterChance) {
    // 反計成功！將計略直接彈回給施計者
    passivesTriggered.push({
      skillId: '反計',
      actor: 'target',
      message: `【反計】觸發！${target.generalName} 識破敵計，反戈一擊將【${strategyName}】反彈給 ${caster.generalName}！`
    });
    combatLogs.push(`🔄 ${target.generalName} 觸發【反計】！「雕蟲小技，何足掛齒！」計策反噬 ${caster.generalName}！`);

    let reflectDamage = 0;
    let casterStatus: 'confused' | undefined = undefined;

    if (['混亂', '妖術', '幻術', '伏兵', '內鬨'].includes(strategyName)) {
      casterStatus = 'confused';
      reflectDamage = Math.floor(Math.min(caster.troops * 0.3, 1200 + tInt * 8));
      combatLogs.push(`🌀 ${caster.generalName} 反遭計策反噬，陷入【混亂】狀態，損兵 ${reflectDamage} 人！`);
    } else {
      reflectDamage = Math.floor(Math.min(caster.troops * 0.25, 1500 + tInt * 10));
      combatLogs.push(`💥 ${caster.generalName} 反被計策反擊重創，損兵 ${reflectDamage} 人！`);
    }

    return {
      success: false,
      isCounterReflected: true,
      isCalmResisted: false,
      damageToTarget: 0,
      damageToCaster: reflectDamage,
      casterNewStatus: casterStatus,
      passivesTriggered,
      combatLogs
    };
  }

  // 2. 【沉著】判定（Composure / Calm）
  const targetHasCalm = hasPassiveSkill(target, targetGen, '沉著');
  if (targetHasCalm) {
    // 對混亂100%免疫，對其他負面計略高抵抗
    if (strategyName === '混亂') {
      passivesTriggered.push({
        skillId: '沉著',
        actor: 'target',
        message: `【沉著】觸發！${target.generalName} 治軍嚴謹沉著冷靜，完全免疫【混亂】計略！`
      });
      combatLogs.push(`🛡️ ${target.generalName} 觸發【沉著】，嚴陣以待，混亂計策毫無作用！`);
      return {
        success: false,
        isCounterReflected: false,
        isCalmResisted: true,
        damageToTarget: 0,
        damageToCaster: 0,
        passivesTriggered,
        combatLogs
      };
    } else if (['妖術', '幻術', '內鬨', '伏兵'].includes(strategyName) && Math.random() < 0.75) {
      passivesTriggered.push({
        skillId: '沉著',
        actor: 'target',
        message: `【沉著】觸發！${target.generalName} 鎮定自若，抵禦了【${strategyName}】的負面干擾！`
      });
      combatLogs.push(`🛡️ ${target.generalName} 觸發【沉著】，安定軍心，未中敵軍詭計！`);
      return {
        success: false,
        isCounterReflected: false,
        isCalmResisted: true,
        damageToTarget: 0,
        damageToCaster: 0,
        passivesTriggered,
        combatLogs
      };
    }
  }

  // 3. 正常計略成功率判定
  const baseSuccessRate = 0.50 + (cInt - tInt) * 0.01;
  const rollSuccess = Math.random() < Math.max(0.15, Math.min(0.95, baseSuccessRate));

  if (!rollSuccess) {
    combatLogs.push(`❌ ${caster.generalName} 施展【${strategyName}】失敗，被 ${target.generalName} 軍識破防備！`);
    return {
      success: false,
      isCounterReflected: false,
      isCalmResisted: false,
      damageToTarget: 0,
      damageToCaster: 0,
      passivesTriggered,
      combatLogs
    };
  }

  // 計略成功計算傷害與效果
  let damage = 0;
  let newStatus: 'confused' | undefined = undefined;

  switch (strategyName) {
    case '混亂':
      newStatus = 'confused';
      damage = Math.floor(Math.min(target.troops * 0.15, 600));
      combatLogs.push(`🌀 【混亂】成功！${target.generalName} 軍陣形崩潰，陷入無陣混亂狀態！`);
      break;

    case '火計':
      damage = Math.floor(Math.min(target.troops * 0.35, 1800 + cInt * 10));
      if (hasPassiveSkill(target, targetGen, '藤甲')) {
        damage = Math.min(target.troops, damage * 2);
        combatLogs.push(`🔥 【藤甲大火】火勢蔓延焚燒藤甲，造成毀滅性 ${damage} 人傷亡！`);
      } else {
        combatLogs.push(`🔥 【火計】成功！烈火包圍 ${target.generalName} 軍，造成 ${damage} 人傷亡！`);
      }
      break;

    case '伏兵':
      damage = Math.floor(Math.min(target.troops * 0.30, 2000 + cInt * 8));
      newStatus = 'confused';
      combatLogs.push(`🌲 【伏兵】成功！奇兵四起，${target.generalName} 軍損兵 ${damage} 人並陷入混亂！`);
      break;

    case '水計':
    case '落沙':
    case '落石':
      damage = Math.floor(Math.min(target.troops * 0.32, 2200 + cInt * 10));
      combatLogs.push(`🌊 【${strategyName}】成功！大自然之威重創 ${target.generalName} 軍，損兵 ${damage} 人！`);
      break;

    case '妖術':
    case '幻術':
      damage = Math.floor(Math.min(target.troops * 0.40, 2500 + cInt * 12));
      newStatus = 'confused';
      combatLogs.push(`⚡ 【${strategyName}】撼動全場！${target.generalName} 軍受幻象狂風重創 ${damage} 人且陣勢潰散！`);
      break;

    case '內鬨':
      damage = Math.floor(Math.min(target.troops * 0.25, 1600 + cInt * 8));
      combatLogs.push(`🗡️ 【內鬨】離間成功！敵軍自相殘殺，損兵 ${damage} 人！`);
      break;

    default:
      damage = Math.floor(Math.min(target.troops * 0.20, 1000));
      combatLogs.push(`✨ 【${strategyName}】生效，造成 ${damage} 人損失！`);
      break;
  }

  return {
    success: true,
    isCounterReflected: false,
    isCalmResisted: false,
    damageToTarget: damage,
    damageToCaster: 0,
    targetNewStatus: newStatus,
    passivesTriggered,
    combatLogs
  };
}

/**
 * 4. 回合/日初維護：處理【沉著】自動解除負面狀態
 */
export function processTurnStartPassives(
  units: BattleUnit[],
  generalsData: Record<string, GeneralState>,
  grid?: GridCell[]
): {
  updatedUnits: BattleUnit[];
  notifications: string[];
} {
  const notifications: string[] = [];
  const updatedUnits = units.map(unit => {
    const gen = generalsData[unit.generalName];
    if (!gen) return { ...unit, hasActed: false, hasMovedThisTurn: false };

    let status = unit.status || 'normal';
    // 【沉著】：每回合自動恢復部隊不良狀態（解除混亂、無陣）
    if (status === 'confused' || status === 'disarray') {
      if (hasPassiveSkill(unit, gen, '沉著')) {
        status = 'normal';
        notifications.push(`🛡️ 【沉著】生效：${unit.generalName} 治軍嚴肅，下回合自動整肅軍容，解除混亂重回戰備！`);
      }
    }

    let troops = unit.troops;
    if (grid && troops > 0) {
      const cell = grid.find(c => c.col === unit.col && c.row === unit.row);
      if (cell) {
        if (cell.terrain === '太守府' || (!unit.isAttacker && (cell.terrain === '城池' || cell.terrain === '關寨'))) {
          // 後勤補給與傷兵救治：每回合恢復 5% 兵力 (最多 500 人，最高上限 10,000)
          const healAmount = Math.min(500, Math.floor(troops * 0.05));
          if (healAmount > 0 && troops < 10000) {
            troops = Math.min(10000, troops + healAmount);
            notifications.push(`🏥 【後勤補給】${unit.generalName} 駐紮 ${cell.terrain}，獲得軍醫救治與糧草補充，兵力恢復 +${healAmount} 人！`);
          }
        }
      }
    }

    return {
      ...unit,
      troops,
      status,
      hasActed: false,
      hasMovedThisTurn: false,
      attackBuff: 0 // Reset temporary buff
    };
  });

  return {
    updatedUnits,
    notifications
  };
}
