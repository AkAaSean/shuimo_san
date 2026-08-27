import { Formation } from '../types';

export const FORMATIONS: Formation[] = [
  { name: '魚鱗', atk: 16, def: 4, bowAtk: 6, bowDef: 2, range: 2, mobility: 16, type: '平地', special: '突擊 (攻擊力強，平地突入)' },
  { name: '鋒矢', atk: 16, def: 4, bowAtk: 4, bowDef: 4, range: 2, mobility: 16, type: '山嶽', special: '突擊 (山地突破，攻勢凌厲)' },
  { name: '偃月', atk: 12, def: 10, bowAtk: 6, bowDef: 6, range: 2, mobility: 12, type: '平地', special: '大打擊 (勇將近戰，高暴擊率)' },
  { name: '水陣', atk: 12, def: 10, bowAtk: 6, bowDef: 10, range: 2, mobility: 16, type: '水上', special: '水戰 (江河作戰，水上攻防優勢)' },
  { name: '錐行', atk: 10, def: 6, bowAtk: 2, bowDef: 2, range: 2, mobility: 24, type: '平地', special: '機動 (極速奔襲，長途奔襲與包抄)' },
  { name: '長蛇', atk: 10, def: 6, bowAtk: 4, bowDef: 2, range: 2, mobility: 24, type: '山嶽', special: '機動 (山嶽穿梭，山林高速行軍)' },
  { name: '箕行', atk: 8, def: 8, bowAtk: 10, bowDef: 10, range: 2, mobility: 10, type: '平地', special: '低死亡率 (攻守兼備，減少部隊陣亡)' },
  { name: '鶴翼', atk: 6, def: 10, bowAtk: 14, bowDef: 4, range: 2, mobility: 12, type: '平地', special: '一齊攻擊 (兩翼包夾，合力圍攻)' },
  { name: '鈎行', atk: 4, def: 8, bowAtk: 8, bowDef: 12, range: 2, mobility: 14, type: '山嶽', special: '低死亡率 (山地穩固，弓箭防禦佳)' },
  { name: '衡軛', atk: 4, def: 12, bowAtk: 10, bowDef: 10, range: 2, mobility: 10, type: '山嶽', special: '側面免疫 (首尾呼應，無懼側後夾擊)' },
  { name: '方圓', atk: 2, def: 16, bowAtk: 2, bowDef: 16, range: 3, mobility: 10, type: '平地', special: '全方防禦 (鐵壁陣勢，全方位高抗傷)' },
  { name: '雁行', atk: 2, def: 8, bowAtk: 16, bowDef: 12, range: 3, mobility: 13, type: '平地', special: '弓攻 (遠程勁弩，大射程齊射)' },
  { name: '無陣', atk: 1, def: 1, bowAtk: 1, bowDef: 1, range: 2, mobility: 1, type: '平地', special: '無 (未編列陣形之散兵)' }
];

export const MOUNTAIN_FORMATIONS = ['鋒矢', '長蛇', '鈎行', '衡軛'];
export const WATER_FORMATIONS = ['水陣'];
export const DEFENSE_FORMATIONS = ['方圓', '衡軛', '箕行', '鈎行'];

// 孫吳勢力 / 江東名將判定集合
export const SUN_WU_GENERALS = new Set([
  '孫堅', '孫策', '孫權', '周瑜', '魯肅', '呂蒙', '陸遜', '陸抗', '甘寧', '太史慈',
  '黃蓋', '程普', '韓當', '蔣欽', '周泰', '丁奉', '徐盛', '凌統', '凌操', '潘璋',
  '朱然', '朱桓', '諸葛恪', '諸葛瑾', '諸葛融', '步騭', '步闡', '虞翻', '張昭', '張紘',
  '顧雍', '顧邵', '顧譚', '陸績', '陸凱', '陸胤', '孫翊', '孫靜', '孫瑜', '孫桓',
  '孫韶', '全琮', '駱統', '吾粲', '董襲', '陳武', '賀齊', '留贊', '丁封', '孫休',
  '孫皓', '岑昏', '薛綜', '嚴畯', '闞澤', '華覈', '張溫', '呂岱', '鍾離牧', '吾彥',
  '陶濬', '孫峻', '孫綝', '孫賁', '孫輔', '朱據', '蔡瑁', '張允', '劉繇', '黃祖',
  '太史享', '陳表', '顧承', '留略', '全端', '全懌', '陸瑁', '韓綜', '步協', '孫匡',
  '孫朗', '孫皎', '孫秀', '孫登', '孫震', '孫異', '周循', '周胤', '張休', '張承'
]);

// 劉焉 / 劉璋 / 益州巴蜀名將判定集合
export const LIU_ZHANG_YIZHOU_GENERALS = new Set([
  '劉焉', '劉璋', '張任', '嚴顏', '黃權', '法正', '孟達', '李嚴', '吳懿', '吳班',
  '雷銅', '吳蘭', '鄧賢', '冷苞', '劉璝', '高沛', '楊懷', '費觀', '費禕', '董和',
  '董允', '許靖', '龐羲', '王累', '秦宓', '譙周', '呂義', '王平', '霍峻', '霍弋',
  '羅憲', '卓膺', '張翼', '張嶷', '宗預', '鄧芝', '閻芝', '尹默', '杜瓊', '杜微',
  '孟獲', '祝融', '帶來洞主', '朵思大王', '木鹿大王', '兀突骨', '金環三結', '董荼那',
  '阿會喃', '高定', '雍闓', '朱褒', '劉循', '劉闡', '張衛', '楊昂', '楊任', '閻圃',
  '張魯', '馬忠_蜀', '陳到', '陳祗', '黃崇', '李恢', '馬謖', '呂凱', '關索', '李豐_蜀'
]);

// 歷史著名防禦戰績名將判定集合 (必配防守陣形)
export const DEFENSE_SPECIALIST_GENERALS = new Set([
  '郝昭', '曹仁', '滿寵', '朱然', '陳泰', '徐晃', '王平', '霍峻', '張特', '羅憲',
  '審配', '文聘', '李典', '于禁', '司馬懿', '陸遜', '諸葛亮', '羊祜', '陸抗', '臧霸',
  '田豫', '牽招', '郭淮', '張郃', '孫桓', '朱桓', '王累', '張任', '嚴顏', '逢紀',
  '賈逵', '蒯越', '蒯良', '曹真', '張遼', '高順', '盧植', '皇甫嵩', '朱儁', '賈詡'
]);

/**
 * 依據《三國志》歷史典故與名將戰役風格配置之歷史陣形庫
 * 嚴格遵循：
 * 1. 謀略或統帥 >= 90：至少 3 種陣法 (最高 5 種)
 * 2. 謀略或統帥 >= 80：至少 2 種陣法 (最高 5 種)
 * 3. 孫吳將領必配「水陣」
 * 4. 劉璋/益州將領必配山嶽陣形 (鋒矢、長蛇、鈎行、衡軛)
 * 5. 防禦名將必配防守陣形 (方圓、衡軛、箕行、鈎行)
 */
export const HISTORICAL_GENERAL_FORMATIONS: Record<string, string[]> = {
  // ── 頂級五陣名帥大將 (5種) ──
  '諸葛亮': ['鶴翼', '方圓', '雁行', '箕行', '偃月'],
  '司馬懿': ['方圓', '偃月', '長蛇', '鈎行', '鶴翼'],
  '曹操': ['錐行', '魚鱗', '雁行', '偃月', '方圓'],
  '周瑜': ['水陣', '雁行', '鶴翼', '偃月', '方圓'],
  '陸遜': ['水陣', '方圓', '鶴翼', '箕行', '偃月'],
  '姜維': ['錐行', '方圓', '鶴翼', '鋒矢', '長蛇'],
  '鄧艾': ['長蛇', '鋒矢', '方圓', '錐行', '偃月'],
  '關羽': ['魚鱗', '偃月', '長蛇', '鋒矢', '水陣'],
  '張遼': ['魚鱗', '鋒矢', '偃月', '錐行', '方圓'],
  '趙雲': ['錐行', '雁行', '偃月', '方圓', '長蛇'],
  '孫策': ['水陣', '鋒矢', '偃月', '錐行', '魚鱗'],
  '孫堅': ['魚鱗', '水陣', '鋒矢', '偃月', '方圓'],
  '孫權': ['水陣', '方圓', '鶴翼', '箕行', '雁行'],
  '呂蒙': ['水陣', '魚鱗', '鶴翼', '方圓', '箕行'],
  '陸抗': ['水陣', '方圓', '衡軛', '鶴翼', '雁行'],
  '羊祜': ['方圓', '雁行', '衡軛', '鶴翼', '錐行'],
  '曹仁': ['方圓', '衡軛', '箕行', '魚鱗', '錐行'],
  '郝昭': ['方圓', '衡軛', '箕行', '長蛇', '雁行'],
  '滿寵': ['方圓', '箕行', '衡軛', '鶴翼', '雁行'],
  '朱然': ['水陣', '方圓', '雁行', '鶴翼', '衡軛'],
  '陳泰': ['方圓', '衡軛', '長蛇', '鋒矢', '錐行'],
  '郭淮': ['方圓', '衡軛', '長蛇', '鋒矢', '鶴翼'],
  '王平': ['方圓', '衡軛', '長蛇', '鈎行', '箕行'],
  '張任': ['鋒矢', '長蛇', '方圓', '衡軛', '雁行'],
  '嚴顏': ['長蛇', '鈎行', '方圓', '鋒矢', '衡軛'],
  '法正': ['鶴翼', '偃月', '鈎行', '長蛇', '方圓'],
  '龐統': ['鶴翼', '方圓', '鈎行', '長蛇', '雁行'],
  '郭嘉': ['方圓', '雁行', '鶴翼', '錐行', '魚鱗'],
  '荀彧': ['鶴翼', '方圓', '箕行', '雁行', '衡軛'],
  '荀攸': ['方圓', '鶴翼', '鈎行', '雁行', '錐行'],
  '賈詡': ['鶴翼', '方圓', '鈎行', '錐行', '長蛇'],
  '徐庶': ['鶴翼', '偃月', '方圓', '鋒矢', '長蛇'],
  '魯肅': ['水陣', '鶴翼', '方圓', '箕行', '雁行'],
  '程昱': ['方圓', '衡軛', '鶴翼', '錐行', '雁行'],
  '徐晃': ['偃月', '衡軛', '錐行', '方圓', '長蛇'],
  '張郃': ['魚鱗', '衡軛', '錐行', '方圓', '長蛇'],
  '黃忠': ['雁行', '方圓', '鋒矢', '長蛇', '偃月'],
  '魏延': ['鋒矢', '長蛇', '魚鱗', '偃月', '方圓'],
  '甘寧': ['水陣', '鋒矢', '魚鱗', '偃月', '長蛇'],
  '太史慈': ['水陣', '雁行', '錐行', '偃月', '方圓'],
  '夏侯惇': ['魚鱗', '錐行', '長蛇', '偃月', '方圓'],
  '夏侯淵': ['雁行', '鋒矢', '錐行', '長蛇', '方圓'],

  // ── 優秀名將 (4種) ──
  '呂布': ['錐行', '鋒矢', '偃月', '魚鱗'],
  '張飛': ['錐行', '鋒矢', '魚鱗', '偃月'],
  '馬超': ['錐行', '鋒矢', '長蛇', '魚鱗'],
  '龐德': ['鋒矢', '錐行', '魚鱗', '偃月'],
  '田豐': ['鶴翼', '方圓', '鈎行', '雁行'],
  '沮授': ['鶴翼', '雁行', '方圓', '箕行'],
  '鍾會': ['鶴翼', '方圓', '鈎行', '長蛇'],
  '陳宮': ['鶴翼', '錐行', '方圓', '雁行'],
  '曹丕': ['魚鱗', '鶴翼', '方圓', '錐行'],
  '曹叡': ['鶴翼', '方圓', '箕行', '雁行'],
  '司馬師': ['方圓', '鶴翼', '偃月', '長蛇'],
  '司馬昭': ['方圓', '衡軛', '鶴翼', '長蛇'],
  '諸葛恪': ['水陣', '鶴翼', '鋒矢', '方圓'],
  '皇甫嵩': ['箕行', '魚鱗', '雁行', '方圓'],
  '朱儁': ['箕行', '魚鱗', '雁行', '方圓'],
  '盧植': ['箕行', '鶴翼', '方圓', '衡軛'],
  '劉備': ['箕行', '魚鱗', '錐行', '方圓'],
  '袁紹': ['鶴翼', '箕行', '錐行', '方圓'],
  '董卓': ['錐行', '魚鱗', '鋒矢', '長蛇'],
  '黃權': ['長蛇', '方圓', '鶴翼', '水陣'],
  '李嚴': ['鈎行', '衡軛', '方圓', '長蛇'],
  '霍峻': ['方圓', '衡軛', '長蛇', '箕行'],
  '羅憲': ['方圓', '衡軛', '長蛇', '鈎行'],
  '審配': ['雁行', '方圓', '衡軛', '鶴翼'],
  '文聘': ['方圓', '衡軛', '水陣', '長蛇'],
  '李典': ['方圓', '衡軛', '箕行', '長蛇'],
  '于禁': ['方圓', '箕行', '衡軛', '長蛇'],
  '臧霸': ['方圓', '魚鱗', '鋒矢', '長蛇'],
  '田豫': ['方圓', '雁行', '長蛇', '錐行'],
  '牽招': ['方圓', '長蛇', '鋒矢', '雁行'],
  '張特': ['方圓', '衡軛', '長蛇', '箕行'],
  '朱桓': ['水陣', '方圓', '偃月', '衡軛'],
  '孟達': ['長蛇', '鋒矢', '鶴翼', '錐行'],
  '吳懿': ['長蛇', '方圓', '衡軛', '鋒矢'],
  '張翼': ['長蛇', '鋒矢', '方圓', '衡軛'],
  '張嶷': ['長蛇', '鋒矢', '鈎行', '方圓'],
  '霍弋': ['長蛇', '方圓', '衡軛', '鋒矢'],
  '費禕': ['鶴翼', '方圓', '箕行', '長蛇'],
  '董允': ['鶴翼', '方圓', '箕行', '長蛇'],
  '高順': ['鋒矢', '魚鱗', '方圓', '錐行'],
  '文鴦': ['鋒矢', '錐行', '魚鱗', '偃月'],

  // ── 三陣名將 (3種) ──
  '顏良': ['魚鱗', '偃月', '鋒矢'],
  '文醜': ['魚鱗', '偃月', '鋒矢'],
  '典韋': ['魚鱗', '偃月', '方圓'],
  '許褚': ['魚鱗', '偃月', '方圓'],
  '公孫瓚': ['錐行', '雁行', '鋒矢'],
  '馬騰': ['錐行', '鋒矢', '長蛇'],
  '韓遂': ['錐行', '長蛇', '鋒矢'],
  '黃蓋': ['水陣', '鋒矢', '方圓'],
  '程普': ['水陣', '魚鱗', '方圓'],
  '韓當': ['水陣', '雁行', '鋒矢'],
  '蔣欽': ['水陣', '雁行', '方圓'],
  '周泰': ['水陣', '魚鱗', '方圓'],
  '丁奉': ['水陣', '偃月', '長蛇'],
  '徐盛': ['水陣', '衡軛', '方圓'],
  '凌統': ['水陣', '魚鱗', '偃月'],
  '潘璋': ['水陣', '魚鱗', '鋒矢'],
  '步騭': ['水陣', '鶴翼', '方圓'],
  '虞翻': ['水陣', '方圓', '鶴翼'],
  '諸葛瑾': ['水陣', '鶴翼', '方圓'],
  '張昭': ['方圓', '鶴翼', '水陣'],
  '張紘': ['方圓', '鶴翼', '水陣'],
  '孟獲': ['長蛇', '鋒矢', '魚鱗'],
  '祝融': ['長蛇', '鋒矢', '雁行'],
  '劉焉': ['箕行', '長蛇', '鶴翼'],
  '宗預': ['鶴翼', '長蛇', '方圓'],
  '鄧芝': ['鶴翼', '長蛇', '方圓'],
  '關平': ['魚鱗', '偃月', '水陣'],
  '關興': ['魚鱗', '偃月', '長蛇'],
  '張苞': ['鋒矢', '魚鱗', '長蛇'],
  '樂進': ['魚鱗', '鋒矢', '方圓'],
  '李通': ['方圓', '長蛇', '鋒矢'],
  '華雄': ['魚鱗', '鋒矢', '偃月'],
  '紀靈': ['魚鱗', '鋒矢', '方圓'],
  '逢紀': ['鶴翼', '方圓', '雁行'],
  '蒯越': ['方圓', '水陣', '鶴翼'],
  '蒯良': ['方圓', '水陣', '鶴翼'],
  '曹真': ['方圓', '衡軛', '長蛇'],
  '曹休': ['鋒矢', '錐行', '水陣'],
  '曹彰': ['鋒矢', '魚鱗', '偃月'],

  // ── 二陣將領 (2種) ──
  '帶來洞主': ['長蛇', '鋒矢'],
  '朵思大王': ['長蛇', '鈎行'],
  '木鹿大王': ['長蛇', '鋒矢'],
  '兀突骨': ['長蛇', '方圓'],
  '劉璋': ['箕行', '長蛇'],
  '王累': ['方圓', '長蛇'],
  '雷銅': ['長蛇', '鋒矢'],
  '吳蘭': ['長蛇', '鋒矢'],
  '冷苞': ['長蛇', '鋒矢'],
  '鄧賢': ['長蛇', '鋒矢'],
  '劉璝': ['長蛇', '鋒矢'],
  '高沛': ['長蛇', '鋒矢'],
  '楊懷': ['長蛇', '鋒矢'],
  '費觀': ['長蛇', '方圓'],
  '董和': ['長蛇', '方圓'],
  '許靖': ['鶴翼', '長蛇'],
  '龐羲': ['箕行', '長蛇'],
  '秦宓': ['鶴翼', '長蛇'],
  '譙周': ['鶴翼', '長蛇'],
  '陸績': ['水陣', '鶴翼'],
  '顧雍': ['方圓', '水陣'],
  '劉繇': ['水陣', '鶴翼'],
  '孫休': ['水陣', '鶴翼'],
  '孫皓': ['水陣', '箕行'],
  '岑昏': ['水陣', '箕行'],
  '諸葛瞻': ['鶴翼', '方圓'],
  '蔡瑁': ['水陣', '箕行'],
  '張允': ['水陣', '箕行'],
  '高覽': ['魚鱗', '衡軛'],
  '管亥': ['魚鱗', '鋒矢'],
  '張寶': ['鶴翼', '方圓'],
  '張梁': ['魚鱗', '鋒矢'],
  '張角': ['鶴翼', '方圓'],
  '丁原': ['錐行', '魚鱗'],

  // ── 一陣將領 (1種) ──
  '曹植': ['鶴翼'],
  '何進': ['箕行'],
  '陶謙': ['箕行'],
  '孔融': ['鶴翼'],
  '張魯': ['長蛇'],
  '劉表': ['水陣'],
  '劉度': ['水陣'],
  '趙範': ['水陣'],
  '金旋': ['水陣'],
  '韓玄': ['水陣'],
  '邢道榮': ['魚鱗'],
  '劉禪': ['箕行'],
  '曹髦': ['鶴翼'],
  '曹芳': ['鶴翼'],
  '楊修': ['鶴翼'],
  '禰衡': ['鶴翼'],
  '蔡邕': ['鶴翼'],
  '王允': ['方圓'],
  '司徒王允': ['方圓'],
  '黃皓': ['箕行'],
  '郭圖': ['鶴翼'],
  '辛評': ['方圓'],
  '許攸': ['鶴翼']
};

/**
 * 取得武將可用陣形列表
 * 嚴格執行以下規格：
 * 1. 謀略 (int) 或 統帥 (hp) >= 90：至少習得 3 種以上陣法
 * 2. 謀略 (int) 或 統帥 (hp) >= 80：至少習得 2 種以上陣法
 * 3. 孫吳將領基本上都有水上陣形 (「水陣」)
 * 4. 劉璋及益州將領基本都配置一個以上山嶽陣形 (「鋒矢」、「長蛇」、「鈎行」、「衡軛」)
 * 5. 歷史有防禦戰績的武將必須配置防守陣形 (「方圓」、「衡軛」、「箕行」、「鈎行」)
 * 6. 武將最多可使用 5 種，最少 1 種
 */
export function getGeneralAvailableFormations(general: {
  name: string;
  str: number;
  int: number;
  hp?: number;
  pol?: number;
  cha?: number;
  provinceId?: number | null;
  formations?: string[];
}): string[] {
  let baseList: string[] = [];
  if (general.formations && Array.isArray(general.formations) && general.formations.length > 0) {
    baseList = [...general.formations];
  } else if (HISTORICAL_GENERAL_FORMATIONS[general.name]) {
    baseList = [...HISTORICAL_GENERAL_FORMATIONS[general.name]];
  }

  const str = general.str || 50;
  const int = general.int || 50;
  const hp = general.hp || 50;
  const name = general.name || '';

  // 1. 謀略或統帥 >= 90：至少習得 3 種以上
  // 2. 謀略或統帥 >= 80：至少習得 2 種以上
  let minRequired = 1;
  let targetCap = 3;
  if (int >= 90 || hp >= 90) {
    minRequired = 3;
    targetCap = Math.max(3, Math.min(5, Math.floor((int + hp + str) / 55)));
  } else if (int >= 80 || hp >= 80) {
    minRequired = 2;
    targetCap = Math.max(2, Math.min(5, Math.floor((int + hp + str) / 60)));
  } else {
    minRequired = 1;
    targetCap = (str + int + hp >= 210) ? 3 : (str + int + hp >= 170) ? 2 : 1;
  }
  targetCap = Math.min(5, Math.max(minRequired, targetCap));

  const resultFormations = new Set<string>(baseList);

  // 3. 孫吳將領基本上都有水上陣形 (「水陣」)
  const isSunWu = SUN_WU_GENERALS.has(name) ||
    name.startsWith('孫') ||
    name.includes('吳_') ||
    Boolean(general.provinceId && [21, 22, 23, 24, 25, 26, 29, 31, 33, 34, 41].includes(general.provinceId));
  if (isSunWu) {
    resultFormations.add('水陣');
  }

  // 4. 劉璋將領基本都配置一個以上山嶽陣形 (「鋒矢」、「長蛇」、「鈎行」、「衡軛」)
  const isLiuZhangYizhou = LIU_ZHANG_YIZHOU_GENERALS.has(name) ||
    name.includes('蜀_') ||
    Boolean(general.provinceId && [35, 36, 37, 38, 39, 40, 43].includes(general.provinceId));
  if (isLiuZhangYizhou) {
    const hasMountain = Array.from(resultFormations).some(f => MOUNTAIN_FORMATIONS.includes(f));
    if (!hasMountain) {
      if (str >= 70) resultFormations.add('長蛇');
      else if (hp >= 70) resultFormations.add('衡軛');
      else if (int >= 70) resultFormations.add('鈎行');
      else resultFormations.add('長蛇');
    }
  }

  // 5. 歷史有防禦戰績的武將必須配置防守陣形 (「方圓」、「衡軛」、「箕行」、「鈎行」)
  const isDefenseSpecialist = DEFENSE_SPECIALIST_GENERALS.has(name);
  if (isDefenseSpecialist) {
    const hasDefense = Array.from(resultFormations).some(f => DEFENSE_FORMATIONS.includes(f));
    if (!hasDefense) {
      resultFormations.add('方圓');
    }
  }

  // 若仍不足最少要求數量 (例如 >=90 需 >=3, >=80 需 >=2)，依屬性優勢動態增補
  if (resultFormations.size < minRequired) {
    if (str >= 85 && !resultFormations.has('魚鱗')) resultFormations.add('魚鱗');
    if (str >= 85 && !resultFormations.has('鋒矢')) resultFormations.add('鋒矢');
    if (str >= 80 && !resultFormations.has('偃月')) resultFormations.add('偃月');
    if (int >= 85 && !resultFormations.has('鶴翼')) resultFormations.add('鶴翼');
    if (int >= 80 && !resultFormations.has('雁行')) resultFormations.add('雁行');
    if (hp >= 80 && !resultFormations.has('方圓')) resultFormations.add('方圓');
    if (hp >= 75 && !resultFormations.has('長蛇')) resultFormations.add('長蛇');
    if (hp >= 75 && !resultFormations.has('錐行')) resultFormations.add('錐行');
    if (resultFormations.size < minRequired && !resultFormations.has('箕行')) resultFormations.add('箕行');
    if (resultFormations.size < minRequired && !resultFormations.has('魚鱗')) resultFormations.add('魚鱗');
    if (resultFormations.size < minRequired && !resultFormations.has('錐行')) resultFormations.add('錐行');
  }

  let finalArray = Array.from(resultFormations);

  // 若超過 5 種，修剪至最多 5 種，同時優先保留核心特質（水陣、山嶽、防守陣形）
  if (finalArray.length > 5) {
    const kept = new Set<string>();
    if (isSunWu && finalArray.includes('水陣')) kept.add('水陣');
    if (isDefenseSpecialist) {
      const def = finalArray.find(f => DEFENSE_FORMATIONS.includes(f));
      if (def) kept.add(def);
    }
    if (isLiuZhangYizhou) {
      const mnt = finalArray.find(f => MOUNTAIN_FORMATIONS.includes(f));
      if (mnt) kept.add(mnt);
    }
    for (const f of finalArray) {
      if (kept.size < 5) kept.add(f);
    }
    finalArray = Array.from(kept);
  }

  // 安全保底：至少 1 種
  if (finalArray.length === 0) finalArray = ['魚鱗'];

  return finalArray;
}

export function getFormationInfo(name: string): Formation | undefined {
  return FORMATIONS.find(f => f.name === name);
}

