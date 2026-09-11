import { BattleSkill } from '../types';
import { GENERAL_SKILLS_DATA } from '../data/generalSkillsData';

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
    desc: '救治部隊傷員，恢復 15%~30% 兵力（受智力加成，嚴格上限為本場出戰兵力），士氣 +10。', 
    target: '單體' 
  },
  '援軍': { 
    name: '援軍', 
    cost: 50, 
    category: '計謀', 
    desc: '呼叫後方輜重隊，我方在場存活全員救治傷兵恢復 20% 兵力（嚴格上限為本場出戰兵力），全體士氣 +10。', 
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

  // ─── 【20大名將專屬終極奧義 (消耗 70 體力)】 ───
  '武聖・單刀赴會': {
    name: '武聖・單刀赴會',
    cost: 70,
    category: '專屬奧義',
    desc: '【關羽專屬奧義】青龍刀破陣（武力 × 7.5，穿透 50% 防禦），若目標兵力 < 35% 觸發絕命斬殺額外 +35% 傷害，敵全軍士氣 -15。',
    target: '單體',
    isUltimate: true,
    exclusiveGeneral: '關羽'
  },
  '當陽怒吼・斷橋': {
    name: '當陽怒吼・斷橋',
    cost: 70,
    category: '專屬奧義',
    desc: '【張飛專屬奧義】當陽橋雷霆暴喝（全體武力 × 3.8），敵全體士氣 -20，前鋒必定【恐慌】，其餘敵軍 50% 機率【恐慌】。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '張飛'
  },
  '七進七出・龍膽': {
    name: '七進七出・龍膽',
    cost: 70,
    category: '專屬奧義',
    desc: '【趙雲專屬奧義】單騎破陣（全體武力 × 5.5），自身獲得 2 回合【龍膽身法】（50% 機率完全閃避，若命中則減傷 50%）。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '趙雲'
  },
  '八陣圖・奇門遁甲': {
    name: '八陣圖・奇門遁甲',
    cost: 70,
    category: '專屬奧義',
    desc: '【諸葛亮專屬奧義】奇門倒轉乾坤，我方全體驅散負面狀態、恢復 15% 兵力且士氣 +25；敵方隨機 1 隊陷入【混亂】，全體士氣 -15。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '諸葛亮'
  },
  '神威・西涼鐵騎': {
    name: '神威・西涼鐵騎',
    cost: 70,
    category: '專屬奧義',
    desc: '【馬超專屬奧義】西涼鐵騎踐踏主目標（武力 × 6.8，破甲 30%）並波及兩翼，敵全軍士氣 -15。',
    target: '相鄰',
    isUltimate: true,
    exclusiveGeneral: '馬超'
  },
  '神射・百步穿楊': {
    name: '神射・百步穿楊',
    cost: 70,
    category: '專屬奧義',
    desc: '【黃忠專屬奧義】定軍山精準狙殺，鎖定敵主帥或最強將領造成破甲重創（武力 × 7.2，暴擊 1.4 倍），敵全軍士氣 -15。',
    target: '單體',
    isUltimate: true,
    exclusiveGeneral: '黃忠'
  },
  '短歌行・天下歸心': {
    name: '短歌行・天下歸心',
    cost: 70,
    category: '專屬奧義',
    desc: '【曹操專屬奧義】周公吐哺天下歸心，我方全員恢復 15% 兵力、士氣 +25，並獲得 2 回合【鼓舞】（傷害提升 20%）。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '曹操'
  },
  '鷹視狼顧・奪魄': {
    name: '鷹視狼顧・奪魄',
    cost: 70,
    category: '專屬奧義',
    desc: '【司馬懿專屬奧義】深沉詭謀（智力 × 4.8），吸取每名存活敵軍 10 點體力反哺自身，敵全體士氣 -15，40% 機率恐慌。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '司馬懿'
  },
  '威震逍遙津・疾風': {
    name: '威震逍遙津・疾風',
    cost: 70,
    category: '專屬奧義',
    desc: '【張遼專屬奧義】八百破十萬之勇突襲主營（武力 × 6.5，對東吳將領增傷 25%），主目標陷入【恐慌】，敵全軍士氣 -15。',
    target: '單體',
    isUltimate: true,
    exclusiveGeneral: '張遼'
  },
  '遺計定遼東・十勝': {
    name: '遺計定遼東・十勝',
    cost: 70,
    category: '專屬奧義',
    desc: '【郭嘉專屬奧義】十勝十敗神謀（智力 × 4.5），令敵全體陷入【脆弱】（受傷增加 25%，持續 2 回合），隨機 1 隊混亂。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '郭嘉'
  },
  '裸衣・虎痴狂怒': {
    name: '裸衣・虎痴狂怒',
    cost: 70,
    category: '專屬奧義',
    desc: '【許褚專屬奧義】卸甲發動狂暴重擊（武力 × 6.8），使目標【混亂】1 回合，自身 1 回合防禦 -15%。',
    target: '單體',
    isUltimate: true,
    exclusiveGeneral: '許褚'
  },
  '拔矢啖睛・剛烈': {
    name: '拔矢啖睛・剛烈',
    cost: 70,
    category: '專屬奧義',
    desc: '【夏侯惇專屬奧義】父精母血不可棄！反噬震擊敵全軍（武力 × 3.8），自身回復已損失兵力之 20% 且士氣 +20。',
    target: '自己',
    isUltimate: true,
    exclusiveGeneral: '夏侯惇'
  },
  '火燒赤壁・連環': {
    name: '火燒赤壁・連環',
    cost: 70,
    category: '專屬奧義',
    desc: '【周瑜專屬奧義】赤壁烈焰（智力 × 4.8，水上 +35%），敵全員附加【著火】2 回合，並燒燬敵方 600 軍糧。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '周瑜'
  },
  '夷陵烈焰・連營': {
    name: '夷陵烈焰・連營',
    cost: 70,
    category: '專屬奧義',
    desc: '【陸遜專屬奧義】連營七百里烈火（智力 × 4.6），敵全體士氣 -15，主目標【混亂】，其餘敵軍陷入【恐慌】。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '陸遜'
  },
  '錦帆夜襲・百騎': {
    name: '錦帆夜襲・百騎',
    cost: 70,
    category: '專屬奧義',
    desc: '【甘寧專屬奧義】銜枚夜襲（武力 × 6.5），強搶敵方 12% 軍糧運回己營，主目標體力 -25，士氣 -15。',
    target: '單體',
    isUltimate: true,
    exclusiveGeneral: '甘寧'
  },
  '神亭連珠・封喉': {
    name: '神亭連珠・封喉',
    cost: 70,
    category: '專屬奧義',
    desc: '【太史慈專屬奧義】兩支破甲神箭重創前鋒部隊（武力 × 5.2），扣除目標體力 25 並施加 1 回合【封戰法】。',
    target: '相鄰',
    isUltimate: true,
    exclusiveGeneral: '太史慈'
  },
  '白衣渡江・奇襲': {
    name: '白衣渡江・奇襲',
    cost: 70,
    category: '專屬奧義',
    desc: '【呂蒙專屬奧義】瞞天過海出其不意（智謀重創），我方全員獲得 1 回合【匿跡突襲】（傷害提升 25% 且暴擊率 +30%）。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '呂蒙'
  },
  '鬼神・天下無雙': {
    name: '鬼神・天下無雙',
    cost: 70,
    category: '專屬奧義',
    desc: '【呂布專屬奧義】神鬼斬擊（全體武力 × 6.2），主目標必定【混亂】，其餘目標 50% 機率【恐慌】，敵士氣 -15。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '呂布'
  },
  '閉月・連環美人計': {
    name: '閉月・連環美人計',
    cost: 70,
    category: '專屬奧義',
    desc: '【貂蟬專屬奧義】傾國傾城離間計，魅惑敵方武力最強與智謀最強者反目互擊（造成武智中度傷害），雙方陷入 1 回合【混亂】。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '貂蟬'
  },
  '毒士亂武・萬劫': {
    name: '毒士亂武・萬劫',
    cost: 70,
    category: '專屬奧義',
    desc: '【賈詡專屬奧義】劇毒瘴氣（智力 × 4.2，每回合損失 4% 兵力持續 2 回合），一名敵將受惑反叛攻擊友軍，士氣 -15。',
    target: '全體',
    isUltimate: true,
    exclusiveGeneral: '賈詡'
  },
};

// 20大名將專屬奧義對照表與其取代之常規技能
export const EXCLUSIVE_ULTIMATE_SKILLS: Record<string, {
  skillName: string;
  replacedSkill: string;
}> = {
  '關羽': { skillName: '武聖・單刀赴會', replacedSkill: '貫通' },
  '張飛': { skillName: '當陽怒吼・斷橋', replacedSkill: '挑釁' },
  '趙雲': { skillName: '七進七出・龍膽', replacedSkill: '奮戰' },
  '諸葛亮': { skillName: '八陣圖・奇門遁甲', replacedSkill: '水龍計' },
  '馬超': { skillName: '神威・西涼鐵騎', replacedSkill: '鐵壁衝撞' },
  '黃忠': { skillName: '神射・百步穿楊', replacedSkill: '亂射' },
  '曹操': { skillName: '短歌行・天下歸心', replacedSkill: '激勵' },
  '司馬懿': { skillName: '鷹視狼顧・奪魄', replacedSkill: '偽報' },
  '張遼': { skillName: '威震逍遙津・疾風', replacedSkill: '橫掃' },
  '郭嘉': { skillName: '遺計定遼東・十勝', replacedSkill: '疑兵' },
  '許褚': { skillName: '裸衣・虎痴狂怒', replacedSkill: '鐵壁衝撞' },
  '夏侯惇': { skillName: '拔矢啖睛・剛烈', replacedSkill: '奮戰' },
  '周瑜': { skillName: '火燒赤壁・連環', replacedSkill: '業火' },
  '陸遜': { skillName: '夷陵烈焰・連營', replacedSkill: '火計' },
  '甘寧': { skillName: '錦帆夜襲・百騎', replacedSkill: '連突' },
  '太史慈': { skillName: '神亭連珠・封喉', replacedSkill: '亂射' },
  '呂蒙': { skillName: '白衣渡江・奇襲', replacedSkill: '偽報' },
  '呂布': { skillName: '鬼神・天下無雙', replacedSkill: '無雙' },
  '貂蟬': { skillName: '閉月・連環美人計', replacedSkill: '挑釁' },
  '賈詡': { skillName: '毒士亂武・萬劫', replacedSkill: '挑釁' },
};

export function getGeneralAvailableSkills(general: {
  name: string;
  str?: number;
  int?: number;
  lead?: number;
  hp?: number;
  training?: number;
  provinceId?: number | null;
  role?: string;
  skills?: string[];
}): string[] {
  // 若該武將已在全三國武將戰法總表 (GENERAL_SKILLS.md / generalSkillsData) 中，優先以總表設定為絕對準則
  if (general?.name && GENERAL_SKILLS_DATA[general.name]) {
    return [...GENERAL_SKILLS_DATA[general.name]];
  }

  const str = general.str || 50;
  const int = general.int || 50;
  const lead = general.lead ?? (general as any).training ?? 70;
  const hp = general.hp || 50;
  
  const isAllRounder = str >= 75 && int >= 75;
  const isFamous = (str >= 90 || int >= 90 || lead >= 90 || (str + int + lead >= 245));
  const maxSkills = isFamous || isAllRounder ? 8 : 6;

  let finalSkills: string[] = [];

  if (general.skills && Array.isArray(general.skills) && general.skills.length > 0) {
    finalSkills = general.skills.filter(s => s !== '伏兵' && s !== '威風').slice(0, maxSkills);
  } else {
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
    finalSkills = Array.from(resultSkills).slice(0, maxSkills);
  }

  // ─── 檢查是否為 20 大傳奇名將，替換為專屬終極奧義 ───
  const exclusiveConfig = EXCLUSIVE_ULTIMATE_SKILLS[general.name];
  if (exclusiveConfig) {
    const { skillName, replacedSkill } = exclusiveConfig;
    if (!finalSkills.includes(skillName)) {
      const replacedIndex = finalSkills.indexOf(replacedSkill);
      if (replacedIndex !== -1) {
        finalSkills[replacedIndex] = skillName;
      } else if (finalSkills.length >= maxSkills) {
        finalSkills[finalSkills.length - 1] = skillName;
      } else {
        finalSkills.unshift(skillName);
      }
    }
  }

  return finalSkills;
}

export function isUltimateSkill(name?: string | null): boolean {
  if (!name) return false;
  return BATTLE_SKILLS[name]?.category === '專屬奧義' || !!BATTLE_SKILLS[name]?.isUltimate;
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
