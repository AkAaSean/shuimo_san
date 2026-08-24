export interface TreasureItem {
  id: string;
  name: string;
  category: '武器' | '名馬' | '兵書' | '奇寶' | '醫書';
  bonusDesc: string;
  effect: {
    str?: number;
    int?: number;
    pol?: number;
    cha?: number;
    hp?: number;
    special?: string;
  };
  desc: string;
  // 歷史默認持有者（依劇本 0~5 轉移或出土）
  defaultOwner: Record<number, string | null>; 
  provinceOrigin?: number; // 原出土地區
}

export const TREASURE_ITEMS: TreasureItem[] = [
  // ═══════════════════════════════════════════════
  // ─── 神兵利器 (Weapons) ───
  // ═══════════════════════════════════════════════
  {
    id: 'weapon_1',
    name: '青龍偃月刀',
    category: '武器',
    bonusDesc: '戰力 +9，威震華夏',
    effect: { str: 9 },
    desc: '重八十二斤，又名冷艷鋸。關羽之專屬神兵，斬顏良、誅文醜、水淹七軍。',
    defaultOwner: { 0: '關羽', 1: '關羽', 2: '關羽', 3: '關羽', 4: '關羽', 5: '關羽' },
    provinceOrigin: 11
  },
  {
    id: 'weapon_2',
    name: '丈八蛇矛',
    category: '武器',
    bonusDesc: '戰力 +8，萬夫莫敵',
    effect: { str: 8 },
    desc: '長一丈八寸，矛頭如游蛇，張飛之隨身神兵，長坂橋前退曹操百萬大軍。',
    defaultOwner: { 0: '張飛', 1: '張飛', 2: '張飛', 3: '張飛', 4: '張飛', 5: '張飛' },
    provinceOrigin: 11
  },
  {
    id: 'weapon_3',
    name: '方天畫戟',
    category: '武器',
    bonusDesc: '戰力 +10，天下無雙',
    effect: { str: 10 },
    desc: '頂端作十字形，兩面有月牙刃，三國第一猛將呂布之成名兵器。',
    defaultOwner: { 0: '呂布', 1: '呂布', 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 15
  },
  {
    id: 'weapon_4',
    name: '雌雄雙股劍',
    category: '武器',
    bonusDesc: '戰力 +6，魅力 +5，仁者之風',
    effect: { str: 6, cha: 5 },
    desc: '劉備於涿縣起兵時所鑄之神兵，一鞘雙劍，左雌右雄，配合精妙。',
    defaultOwner: { 0: '劉備', 1: '劉備', 2: '劉備', 3: '劉備', 4: '劉備', 5: '劉備' },
    provinceOrigin: 3
  },
  {
    id: 'weapon_5',
    name: '倚天劍',
    category: '武器',
    bonusDesc: '戰力 +8，鎮國神劍',
    effect: { str: 8 },
    desc: '曹操隨身佩劍，取「拔劍倚天」之意，鋒利無比，能削鐵如泥。',
    defaultOwner: { 0: '曹操', 1: '曹操', 2: '曹操', 3: '曹操', 4: '曹操', 5: '曹丕' },
    provinceOrigin: 12
  },
  {
    id: 'weapon_6',
    name: '青釭劍',
    category: '武器',
    bonusDesc: '戰力 +8，削鐵如泥',
    effect: { str: 8 },
    desc: '曹操之另一柄寶劍，交由夏侯恩保管，長坂坡之役為趙雲所獲。',
    defaultOwner: { 0: '曹操', 1: '曹操', 2: '曹操', 3: '趙雲', 4: '趙雲', 5: '趙雲' },
    provinceOrigin: 13
  },
  {
    id: 'weapon_7',
    name: '古錠刀',
    category: '武器',
    bonusDesc: '戰力 +7，江東猛虎',
    effect: { str: 7 },
    desc: '江東猛虎孫堅所佩之寶刀，百煉精鋼，刃帶花紋，削銅斬鐵。',
    defaultOwner: { 0: '孫堅', 1: '孫策', 2: '孫權', 3: '孫權', 4: '孫權', 5: '孫權' },
    provinceOrigin: 31
  },
  {
    id: 'weapon_8',
    name: '雙鐵戟',
    category: '武器',
    bonusDesc: '戰力 +6，古之惡來',
    effect: { str: 6 },
    desc: '重八十斤，典韋專屬狂兵，宛城力戰捨命護主。',
    defaultOwner: { 0: null, 1: '典韋', 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 12
  },
  {
    id: 'weapon_9',
    name: '涯角槍',
    category: '武器',
    bonusDesc: '戰力 +7，渾身是膽',
    effect: { str: 7 },
    desc: '海角天涯無對手，長山趙子龍之護身銀槍。',
    defaultOwner: { 0: '趙雲', 1: '趙雲', 2: '趙雲', 3: '趙雲', 4: '趙雲', 5: '趙雲' },
    provinceOrigin: 3
  },
  {
    id: 'weapon_10',
    name: '養由基弓',
    category: '武器',
    bonusDesc: '戰力 +6，百步穿楊',
    effect: { str: 6 },
    desc: '春秋神射手養由基所遺神弓，百步之外射楊柳葉百發百中，黃忠所佩。',
    defaultOwner: { 0: '黃忠', 1: '黃忠', 2: '黃忠', 3: '黃忠', 4: '黃忠', 5: '黃忠' },
    provinceOrigin: 30
  },
  {
    id: 'weapon_11',
    name: '大斧',
    category: '武器',
    bonusDesc: '戰力 +5，開山破陣',
    effect: { str: 5 },
    desc: '曹魏五子良將徐晃之隨身巨斧，威震樊城破關羽。',
    defaultOwner: { 0: null, 1: '徐晃', 2: '徐晃', 3: '徐晃', 4: '徐晃', 5: '徐晃' },
    provinceOrigin: 14
  },
  {
    id: 'weapon_12',
    name: '三尖刀',
    category: '武器',
    bonusDesc: '戰力 +5，兩面三刀',
    effect: { str: 5 },
    desc: '重五十斤，袁術麾下第一大將紀靈之兵器。',
    defaultOwner: { 0: '紀靈', 1: '紀靈', 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 13
  },
  {
    id: 'weapon_13',
    name: '七星寶刀',
    category: '武器',
    bonusDesc: '戰力 +4，魅力 +4，刺董名刃',
    effect: { str: 4, cha: 4 },
    desc: '司徒王允家傳寶刀，曹操曾借之刺殺董卓，削鐵如泥。',
    defaultOwner: { 0: '曹操', 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 15
  },
  {
    id: 'weapon_14',
    name: '鐵蒺藜骨朵',
    category: '武器',
    bonusDesc: '戰力 +5，蠻王異兵',
    effect: { str: 5 },
    desc: '五溪蠻王沙摩柯所使之異形重兵器，夷陵之戰射殺甘寧。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: '沙摩柯' },
    provinceOrigin: 32
  },

  // ═══════════════════════════════════════════════
  // ─── 絕世名駒 (Horses) ───
  // ═══════════════════════════════════════════════
  {
    id: 'horse_1',
    name: '赤兔馬',
    category: '名馬',
    bonusDesc: '統帥 +10，戰場撤退成功率 100%',
    effect: { hp: 10, special: '退卻必定成功' },
    desc: '「人中有呂布，馬中有赤兔」，日行千里，夜行八百，渡水登山如履平地。',
    defaultOwner: { 0: '董卓', 1: '呂布', 2: '關羽', 3: '關羽', 4: '關羽', 5: null },
    provinceOrigin: 15
  },
  {
    id: 'horse_2',
    name: '的盧馬',
    category: '名馬',
    bonusDesc: '統帥 +8，避凶化吉',
    effect: { hp: 8, special: '福星高照' },
    desc: '額頭帶白點之名駒，曾於檀溪一躍三丈，救劉備脫離險境。',
    defaultOwner: { 0: null, 1: null, 2: '劉備', 3: '劉備', 4: '龐統', 5: null },
    provinceOrigin: 28
  },
  {
    id: 'horse_3',
    name: '爪黃飛電',
    category: '名馬',
    bonusDesc: '統帥 +7，魅力 +3，貴氣非凡',
    effect: { hp: 7, cha: 3 },
    desc: '曹操愛馬，通體雪白，蹄如包金，神采奕奕，許田打圍時曾乘之。',
    defaultOwner: { 0: null, 1: '曹操', 2: '曹操', 3: '曹操', 4: '曹操', 5: '曹丕' },
    provinceOrigin: 13
  },
  {
    id: 'horse_4',
    name: '絕影',
    category: '名馬',
    bonusDesc: '統帥 +7，迅捷絕倫',
    effect: { hp: 7 },
    desc: '曹操之坐騎，行疾如風，奔馳時身影難辨，宛城之戰救主中箭身亡。',
    defaultOwner: { 0: '曹操', 1: '曹操', 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 12
  },
  {
    id: 'horse_5',
    name: '照夜玉獅子',
    category: '名馬',
    bonusDesc: '統帥 +6，白馬神駿',
    effect: { hp: 6 },
    desc: '趙雲所騎白馬，通體雪白無雜毛，長坂坡陷落枯井一躍而起。',
    defaultOwner: { 0: null, 1: null, 2: '趙雲', 3: '趙雲', 4: '趙雲', 5: '趙雲' },
    provinceOrigin: 3
  },
  {
    id: 'horse_6',
    name: '快航',
    category: '名馬',
    bonusDesc: '統帥 +5，江東青驄',
    effect: { hp: 5 },
    desc: '孫權之座騎，逍遙津被張遼突襲時飛躍小師橋脫險。',
    defaultOwner: { 0: null, 1: null, 2: '孫權', 3: '孫權', 4: '孫權', 5: '孫權' },
    provinceOrigin: 21
  },
  {
    id: 'horse_7',
    name: '汗血馬',
    category: '名馬',
    bonusDesc: '統帥 +5，大宛神駒',
    effect: { hp: 5 },
    desc: '產自西域大宛之名馬，奔馳流汗如血，日行千里。',
    defaultOwner: { 0: '馬騰', 1: '馬騰', 2: '馬騰', 3: '馬超', 4: '馬超', 5: '馬超' },
    provinceOrigin: 17
  },

  // ═══════════════════════════════════════════════
  // ─── 兵法韜略 (Books & Treatises) ───
  // ═══════════════════════════════════════════════
  {
    id: 'book_1',
    name: '孫子兵法',
    category: '兵書',
    bonusDesc: '謀略 +10，政治 +8，兵家聖典',
    effect: { int: 10, pol: 8 },
    desc: '春秋孫武所著兵書十三篇，被譽為兵學聖典、百代談兵之祖。',
    defaultOwner: { 0: '孫堅', 1: '孫策', 2: '孫權', 3: '孫權', 4: '孫權', 5: '孫權' },
    provinceOrigin: 22
  },
  {
    id: 'book_2',
    name: '兵法二十四篇',
    category: '兵書',
    bonusDesc: '謀略 +9，政治 +7，孔明兵書',
    effect: { int: 9, pol: 7 },
    desc: '諸葛孔明畢生用兵治國經驗之總結，臨終前傳於姜維。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: '諸葛亮', 4: '諸葛亮', 5: '諸葛亮' },
    provinceOrigin: 36
  },
  {
    id: 'book_3',
    name: '孟德新書',
    category: '兵書',
    bonusDesc: '謀略 +8，政治 +5，魏武兵略',
    effect: { int: 8, pol: 5 },
    desc: '曹操總結半生征戰經驗所著之兵書十四篇，張松曾過目不忘背誦之。',
    defaultOwner: { 0: null, 1: null, 2: '曹操', 3: '曹操', 4: '曹操', 5: '曹丕' },
    provinceOrigin: 13
  },
  {
    id: 'book_4',
    name: '六韜',
    category: '兵書',
    bonusDesc: '謀略 +8，政治 +6，太公韜略',
    effect: { int: 8, pol: 6 },
    desc: '周朝太公望所著六卷太公兵法：文、武、龍、虎、豹、犬。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: '司馬懿', 4: '司馬懿', 5: '司馬懿' },
    provinceOrigin: 15
  },
  {
    id: 'book_5',
    name: '三略',
    category: '兵書',
    bonusDesc: '謀略 +8，政治 +6，黃石秘傳',
    effect: { int: 8, pol: 6 },
    desc: '黃石公授張良之兵書三卷：上略、中略、下略。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: '徐庶', 4: '龐統', 5: null },
    provinceOrigin: 28
  },
  {
    id: 'book_6',
    name: '太平要術',
    category: '兵書',
    bonusDesc: '謀略 +7，呼風喚雨',
    effect: { int: 7 },
    desc: '南華老仙授與張角之奇書三卷，能呼風喚雨、號令黃巾。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 4
  },
  {
    id: 'book_7',
    name: '遁甲天書',
    category: '兵書',
    bonusDesc: '謀略 +9，神機妙算',
    effect: { int: 9 },
    desc: '峨嵋山左慈所傳三卷仙書：天遁、地遁、人遁，奪天地造化。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 36
  },
  {
    id: 'book_8',
    name: '春秋左氏傳',
    category: '兵書',
    bonusDesc: '謀略 +5，政治 +5，義薄雲天',
    effect: { int: 5, pol: 5 },
    desc: '關羽夜讀之經典春秋傳，修心明義、知興亡治亂。',
    defaultOwner: { 0: '關羽', 1: '關羽', 2: '關羽', 3: '關羽', 4: '關羽', 5: '關羽' },
    provinceOrigin: 11
  },
  {
    id: 'book_9',
    name: '吳子兵法',
    category: '兵書',
    bonusDesc: '謀略 +7，政治 +5，圖國強兵',
    effect: { int: 7, pol: 5 },
    desc: '戰國名將吳起所著兵書六篇，講求內修文德、外治武備。',
    defaultOwner: { 0: null, 1: '周瑜', 2: '周瑜', 3: '周瑜', 4: '陸遜', 5: '陸遜' },
    provinceOrigin: 22
  },

  // ═══════════════════════════════════════════════
  // ─── 傳世重器與奇寶 (Relics & Treasures) ───
  // ═══════════════════════════════════════════════
  {
    id: 'relic_1',
    name: '傳國玉璽',
    category: '奇寶',
    bonusDesc: '魅力 +100，威望極盛，受命於天',
    effect: { cha: 100, special: '號令天下，諸侯敬服' },
    desc: '「受命於天，既壽永昌」。秦始皇以和氏璧所刻之至寶，天下至尊正統之象徵。',
    defaultOwner: { 0: '董卓', 1: '袁術', 2: '曹操', 3: '曹操', 4: '曹操', 5: '曹丕' },
    provinceOrigin: 15
  },
  {
    id: 'relic_2',
    name: '和氏璧',
    category: '奇寶',
    bonusDesc: '魅力 +25，政治 +5，天下無雙玉',
    effect: { cha: 25, pol: 5 },
    desc: '卞和得自荊山之絕世美玉，完璧歸趙千古流傳。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 28
  },
  {
    id: 'relic_3',
    name: '九錫',
    category: '奇寶',
    bonusDesc: '魅力 +20，政治 +10，天子賜禮',
    effect: { cha: 20, pol: 10 },
    desc: '天子賜予元勳重臣之九種最高規格禮器：車馬、衣服、樂懸、硃戶、納陛等。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: '曹操', 5: '曹丕' },
    provinceOrigin: 15
  },
  {
    id: 'relic_4',
    name: '銅雀',
    category: '奇寶',
    bonusDesc: '魅力 +15，祥瑞之兆',
    effect: { cha: 15 },
    desc: '曹操破鄴城掘地所得銅雀，遂築銅雀臺以彰盛世功業。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: '曹操', 4: '曹操', 5: '曹丕' },
    provinceOrigin: 4
  },
  {
    id: 'relic_5',
    name: '夜光珠',
    category: '奇寶',
    bonusDesc: '魅力 +10，暗室生輝',
    effect: { cha: 10 },
    desc: '南海深海所產明珠，黑夜中能照亮百步，價值連城。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 34
  },

  // ═══════════════════════════════════════════════
  // ─── 醫道神書 (Medical Books) ───
  // ═══════════════════════════════════════════════
  {
    id: 'relic_6',
    name: '青囊書',
    category: '醫書',
    bonusDesc: '統帥 +10，醫術通神',
    effect: { hp: 10, special: '妙手回春' },
    desc: '神醫華佗畢生醫道精髓所載之奇書，可解百病、起死回生。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 12
  },
  {
    id: 'relic_7',
    name: '傷寒雜病論',
    category: '醫書',
    bonusDesc: '統帥 +8，政治 +4，醫聖巨著',
    effect: { hp: 8, pol: 4 },
    desc: '長沙太守張仲景所著中醫辨證論治經典，活人無數。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 30
  },
  {
    id: 'relic_8',
    name: '太平清領道',
    category: '醫書',
    bonusDesc: '統帥 +8，祛病延年',
    effect: { hp: 8 },
    desc: '于吉於曲陽泉水上所得之道家神書，能符水治病、度人濟世。',
    defaultOwner: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    provinceOrigin: 23
  }
];

export interface GeneralItemBonus {
  strBonus: number;
  intBonus: number;
  polBonus: number;
  chaBonus: number;
  hpBonus: number;
  items: TreasureItem[];
}

/**
 * 計算指定武將在特定劇本時期所持有的寶物及其屬性加成
 */
export function getGeneralItemBonus(generalName: string, scenarioIndex: number = 0): GeneralItemBonus {
  const heldItems = TREASURE_ITEMS.filter(item => item.defaultOwner[scenarioIndex] === generalName);
  
  let strBonus = 0;
  let intBonus = 0;
  let polBonus = 0;
  let chaBonus = 0;
  let hpBonus = 0;

  heldItems.forEach(item => {
    if (item.effect.str) strBonus += item.effect.str;
    if (item.effect.int) intBonus += item.effect.int;
    if (item.effect.pol) polBonus += item.effect.pol;
    if (item.effect.cha) chaBonus += item.effect.cha;
    if (item.effect.hp) hpBonus += item.effect.hp;
  });

  return {
    strBonus,
    intBonus,
    polBonus,
    chaBonus,
    hpBonus,
    items: heldItems
  };
}
