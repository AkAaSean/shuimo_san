import { BattleSkill } from '../types';

export const BATTLE_SKILLS: Record<string, BattleSkill> = {
  // ─── 【特殊攻擊 (物理戰法)】 ───
  '連突': { 
    name: '連突', 
    cost: 20, 
    category: '特殊攻擊', 
    desc: '發動兩段式連續突擊（武力 × 3.2 × 2），高爆擊率單體打擊。', 
    target: '單體' 
  },
  '橫掃': { 
    name: '橫掃', 
    cost: 25, 
    category: '特殊攻擊', 
    desc: '揮動長兵器橫掃，主目標承受 100% 物理傷害，相鄰 1 名敵將承受 60% 濺射傷害。', 
    target: '相鄰' 
  },
  '貫通': { 
    name: '貫通', 
    cost: 30, 
    category: '特殊攻擊', 
    desc: '忽視目標 50% 防禦力的穿甲突刺，針對高防禦陣形有絕佳打擊效果。', 
    target: '單體' 
  },
  '亂射': { 
    name: '亂射', 
    cost: 30, 
    category: '特殊攻擊', 
    desc: '漫天箭雨覆蓋，對敵方在場 1~5 名部隊全體造成遠程物理傷害。', 
    target: '全體' 
  },
  '火矢': { 
    name: '火矢', 
    cost: 20, 
    category: '特殊攻擊', 
    desc: '點燃火箭射擊，造成遠程物理傷害，目標士氣 -12，並有 50% 機率附加【著火】。', 
    target: '單體' 
  },
  '奮戰': { 
    name: '奮戰', 
    cost: 25, 
    category: '特殊攻擊', 
    desc: '殘血背水一戰，自身損失兵力越多傷害倍率越高（1.3 倍 ~ 2.3 倍傷害）。', 
    target: '單體' 
  },
  '鐵壁衝撞': { 
    name: '鐵壁衝撞', 
    cost: 20, 
    category: '特殊攻擊', 
    desc: '以重盾衝撞敵陣，造成 100% 傷害，扣除目標體力 25 點，50% 附加【混亂】。', 
    target: '單體' 
  },
  '無雙': { 
    name: '無雙', 
    cost: 45, 
    category: '特殊攻擊', 
    desc: '霸道絕倫的天下無雙斬，造成極致毀滅性傷害（武力 × 8.5），目標士氣 -20。', 
    target: '單體' 
  },

  // ─── 【計謀 (智略戰法)】 ───
  '治傷': { 
    name: '治傷', 
    cost: 25, 
    category: '計謀', 
    desc: '恢復目標 15%~30% 兵力（受智力加成），士氣 +10。', 
    target: '單體' 
  },
  '援軍': { 
    name: '援軍', 
    cost: 50, 
    category: '計謀', 
    desc: '呼叫後方輜重隊，我方在場存活全員恢復 20% 兵力與大量傷兵，全體士氣 +10。', 
    target: '全體' 
  },
  '解策': { 
    name: '解策', 
    cost: 15, 
    category: '計謀', 
    desc: '識破並驅散目標身上所有的負面狀態（混亂 / 著火 / 恐慌），恢復體力 30。', 
    target: '單體' 
  },
  '激勵': { 
    name: '激勵', 
    cost: 30, 
    category: '計謀', 
    desc: '提振軍心，目標體力 +35、士氣 +15，並賦予【鼓舞】狀態（造成傷害 +25%）。', 
    target: '單體' 
  },
  '火計': { 
    name: '火計', 
    cost: 20, 
    category: '計謀', 
    desc: '施放烈火攻擊（平地 +15%、密林 +35% 傷害），智力高於對手時必定附加【著火】狀態。', 
    target: '單體' 
  },
  '業火': { 
    name: '業火', 
    cost: 45, 
    category: '計謀', 
    desc: '烈火焚營，對敵方全體造成智力傷害（平地 +15%、密林 +35%），每人 55% 機率附加【著火】。', 
    target: '全體' 
  },
  '水攻': { 
    name: '水攻', 
    cost: 20, 
    category: '計謀', 
    desc: '引水灌敵，對敵單體造成智力傷害（水上/沼澤地形傷害 +50%）。', 
    target: '單體' 
  },
  '水龍計': { 
    name: '水龍計', 
    cost: 45, 
    category: '計謀', 
    desc: '召喚滔天巨浪，對敵全體造成大量智力傷害（水上地形 +50%），敵全體士氣 -12。', 
    target: '全體' 
  },
  '落石': { 
    name: '落石', 
    cost: 20, 
    category: '計謀', 
    desc: '滾木礌石打擊（山地/高地 +50% 傷害），扣除目標士氣/體力 15，45% 機率附加【混亂】。', 
    target: '單體' 
  },
  '山崩': { 
    name: '山崩', 
    cost: 45, 
    category: '計謀', 
    desc: '引發山體滑坡巨石陣，對敵全體造成落石傷害（山地 +50%），全體士氣 -15。', 
    target: '全體' 
  },
  '疑兵': { 
    name: '疑兵', 
    cost: 20, 
    category: '計謀', 
    desc: '虛張聲勢迷惑敵軍，不造成兵力傷害，扣除目標士氣 25、體力 25，100% 附加【混亂】。', 
    target: '單體' 
  },
  '偽報': { 
    name: '偽報', 
    cost: 35, 
    category: '計謀', 
    desc: '散佈偽造軍令動搖敵全軍，敵全體士氣 -20、體力 -15，55% 機率附加【恐慌】。', 
    target: '全體' 
  },
  '挑釁': { 
    name: '挑釁', 
    cost: 15, 
    category: '計謀', 
    desc: '激怒敵將，扣除目標士氣 15、體力 30，使其陷入【混亂】（或強制鎖定攻擊施法者）。', 
    target: '單體' 
  },
};

export function getGeneralAvailableSkills(general: {
  name: string;
  str: number;
  int: number;
  lead?: number;
  hp?: number;
  training?: number;
  provinceId?: number | null;
  role?: string;
  skills?: string[];
}): string[] {
  const str = general.str || 50;
  const int = general.int || 50;
  const lead = general.lead ?? (general as any).training ?? 70;
  const hp = general.hp || 50;
  
  const isAllRounder = str >= 75 && int >= 75;
  const isFamous = (str >= 90 || int >= 90 || lead >= 90 || (str + int + lead >= 245));
  const maxSkills = isFamous || isAllRounder ? 8 : 6;

  if (general.skills && Array.isArray(general.skills) && general.skills.length > 0) {
    return general.skills.filter(s => s !== '伏兵' && s !== '威風').slice(0, maxSkills);
  }

  const resultSkills = new Set<string>();
  const isWarrior = str >= 85;
  const isStrategist = int >= 85;

  // --- 頂級特技 (S級) ---
  if (str >= 95) resultSkills.add('無雙');
  if (int >= 95) {
    resultSkills.add('業火');
    resultSkills.add('水龍計');
  }
  if (int >= 92) {
    resultSkills.add('偽報');
    resultSkills.add('援軍');
  }

  // --- 高階戰法 (A級) ---
  if (str >= 85) {
    if (lead >= 80) resultSkills.add('貫通');
    resultSkills.add('連突');
  }
  if (str >= 90 || (str >= 80 && lead >= 85)) {
    resultSkills.add('亂射');
  }
  if (int >= 90) {
    resultSkills.add('山崩');
    resultSkills.add('解策');
  }
  if (int >= 85) {
    resultSkills.add('火計');
    resultSkills.add('疑兵');
  }

  // --- 中階戰法 (B級) ---
  if (str >= 80 && hp >= 85) {
    resultSkills.add('鐵壁衝撞');
  }
  if (str >= 75) {
    if (!isStrategist || isAllRounder) resultSkills.add('奮戰');
    resultSkills.add('連突');
  }
  if (str >= 75 && (!isStrategist || isAllRounder) && !resultSkills.has('亂射')) {
    resultSkills.add('火矢');
  }
  if (int >= 80) {
    resultSkills.add('落石');
    resultSkills.add('激勵');
    resultSkills.add('治傷');
  }
  if (int >= 75 && lead >= 80) {
    resultSkills.add('激勵');
  }

  // --- 基礎戰法 (C級) ---
  if (str >= 70 && (!isStrategist || isAllRounder)) {
    resultSkills.add('橫掃');
  }
  if (int >= 70 && (!isWarrior || isAllRounder)) {
    if (!resultSkills.has('火計')) resultSkills.add('火計');
    resultSkills.add('水攻');
    resultSkills.add('挑釁');
    if (!resultSkills.has('治傷')) resultSkills.add('治傷');
  }

  // 保底
  if (resultSkills.size === 0) {
    if (str >= int) resultSkills.add('連突');
    else resultSkills.add('火計');
  }

  // 依據名將與全才標籤決定最大技能數
  return Array.from(resultSkills).slice(0, maxSkills);
}

export function isPassiveSkill(name?: string): boolean {
  return false;
}

export function getGeneralPassives(general?: any): any[] {
  return [];
}

export function getBattleSkillInfo(skillName: string): BattleSkill | undefined {
  return BATTLE_SKILLS[skillName];
}

export function getAllBattleSkills(): BattleSkill[] {
  return Object.values(BATTLE_SKILLS);
}
