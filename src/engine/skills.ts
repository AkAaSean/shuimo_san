import { BattleSkill, PassiveSkillId } from '../types';

export const PASSIVE_SKILL_NAMES: PassiveSkillId[] = [];

export function isPassiveSkill(skillName: string): boolean {
  return PASSIVE_SKILL_NAMES.includes(skillName as PassiveSkillId);
}

export const BATTLE_SKILLS: Record<string, BattleSkill> = {
  // ─── 【特殊攻擊 (物理戰法)】 ───
  '連突': { name: '連突', cost: 20, category: '特殊攻擊', desc: '連續對敵方單體進行2次突刺(150%傷害)，若武力高於目標有25%機率造成混亂', target: '單體' },
  '橫掃': { name: '橫掃', cost: 25, category: '特殊攻擊', desc: '對目標(100%)及相鄰1名敵將(60%)造成物理打擊', target: '相鄰' },
  '貫通': { name: '貫通', cost: 30, category: '特殊攻擊', desc: '強力衝鋒(170%傷害)，無視目標40%防禦與陣形加成', target: '單體' },
  '亂射': { name: '亂射', cost: 30, category: '特殊攻擊', desc: '對敵方全體(1~5人)造成70%遠程物理傷害', target: '全體' },
  '火矢': { name: '火矢', cost: 20, category: '特殊攻擊', desc: '遠程120%傷害，並附加灼傷狀態(持續2回合)', target: '單體' },
  '奮戰': { name: '奮戰', cost: 25, category: '特殊攻擊', desc: '基礎130%傷害，自身兵力越低威力越高(最高220%)', target: '單體' },
  '鐵壁衝撞': { name: '鐵壁衝撞', cost: 20, category: '特殊攻擊', desc: '100%傷害，並擊退目標本回合行動順序(Delay 20%)', target: '單體' },
  '無雙': { name: '無雙', cost: 45, category: '特殊攻擊', desc: '極限單體奧義，240%爆發傷害，必定暴擊', target: '單體' },

  // ─── 【計謀 (智略戰略)】 ───
  '火計': { name: '火計', cost: 20, category: '計謀', desc: '對敵方單體造成火屬性傷害，平地佔比越高威力越強', target: '單體' },
  '業火': { name: '業火', cost: 40, category: '計謀', desc: '對敵方全體造成巨大火屬性傷害，平地佔比越高威力越強', target: '全體' },
  '水攻': { name: '水攻', cost: 20, category: '計謀', desc: '對敵方單體造成水屬性傷害，水佔比越高威力越強', target: '單體' },
  '水龍計': { name: '水龍計', cost: 45, category: '計謀', desc: '對敵方全體造成巨大水屬性傷害，水佔比越高威力越強', target: '全體' },
  '落石': { name: '落石', cost: 20, category: '計謀', desc: '對敵方單體造成落石傷害，山嶽佔比越高威力越強且附帶暈眩', target: '單體' },
  '山崩': { name: '山崩', cost: 45, category: '計謀', desc: '對敵方全體造成落石傷害，山嶽佔比越高威力越強且附帶暈眩', target: '全體' },
  '治傷': { name: '治傷', cost: 25, category: '計謀', desc: '恢復我方單體 15%~30% 兵力', target: '單體' },
  '援軍': { name: '援軍', cost: 50, category: '計謀', desc: '恢復我方全體 15%~30% 兵力', target: '全體' },
  '疑兵': { name: '疑兵', cost: 20, category: '計謀', desc: '使敵將陷入混亂狀態(1回合)', target: '單體' },
  '偽報': { name: '偽報', cost: 35, category: '計謀', desc: '使敵將全體有一定機率陷入混亂狀態', target: '全體' },
  '挑釁': { name: '挑釁', cost: 15, category: '計謀', desc: '強迫敵方只能普通攻擊施法者，無法防禦或放技能', target: '單體' },
  '解策': { name: '解策', cost: 15, category: '計謀', desc: '清除我方單體異常狀態(混亂/灼傷/暈眩等)並恢復10點體力', target: '單體' },
  '激勵': { name: '激勵', cost: 30, category: '計謀', desc: '使指定我方武將立刻恢復35點體力，並提升其本回合先攻', target: '單體' },

  // ─── 【被動】 ───
};

export function getGeneralAvailableSkills(general: {
  name: string;
  str: number;
  int: number;
  hp?: number;
  provinceId?: number | null;
  role?: string;
  skills?: string[];
}): string[] {
  if (general.skills && Array.isArray(general.skills) && general.skills.length > 0) {
    return general.skills.slice(0, 8);
  }

  const str = general.str || 50;
  const int = general.int || 50;
  const hp = general.hp || 50;
  const resultSkills = new Set<string>();

  // 物理特技
  if (str >= 90) resultSkills.add('無雙');
  if (str >= 80) resultSkills.add('連突');
  if (str >= 75) resultSkills.add('奮戰');
  if (str >= 70 && hp >= 70) resultSkills.add('橫掃');
  if (str >= 85 && hp >= 70) resultSkills.add('貫通');
  if (str >= 75 && int >= 60) resultSkills.add('火矢');
  if (str >= 85) resultSkills.add('亂射');
  if (hp >= 80) resultSkills.add('鐵壁衝撞');

  // 計謀
  if (int >= 95) {
    resultSkills.add('業火');
    resultSkills.add('水龍計');
    resultSkills.add('山崩');
  }
  if (int >= 90) {
    resultSkills.add('援軍');
    resultSkills.add('偽報');
  }
  if (int >= 80) {
    resultSkills.add('激勵');
    resultSkills.add('疑兵');
    resultSkills.add('解策');
  }
  if (int >= 70) {
    resultSkills.add('火計');
    resultSkills.add('治傷');
  }
  if (int >= 60) resultSkills.add('挑釁');

  // 保底
  if (resultSkills.size === 0) {
    if (str >= int) resultSkills.add('連突');
    else resultSkills.add('火計');
  }

  return Array.from(resultSkills).slice(0, 8);
}

export function getGeneralPassives(general: {
  skills?: string[];
  provinceId?: number | null;
  role?: string;
}): PassiveSkillId[] {
  const skills = general.skills || [];
  return skills.filter(s => isPassiveSkill(s)) as PassiveSkillId[];
}

export function getBattleSkillInfo(skillName: string): BattleSkill | undefined {
  return BATTLE_SKILLS[skillName];
}

export function getAllBattleSkills(): BattleSkill[] {
  return Object.values(BATTLE_SKILLS);
}
