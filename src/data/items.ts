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
    staminaRecover?: number;
    special?: string;
  };
  desc: string;
  defaultOwner: Record<number, string | null>; 
  provinceOrigin?: number;
}

export const TREASURE_ITEMS: TreasureItem[] = [
  {
    "id": "weapon_1",
    "name": "方天畫戟",
    "category": "武器",
    "bonusDesc": "戰力 +10，天下無雙",
    "effect": {
      "str": 10
    },
    "desc": "頂端作十字形，兩面有月牙刃，三國第一猛將呂布之成名兵器。",
    "defaultOwner": {
      "0": "呂布",
      "1": "呂布",
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_2",
    "name": "青龍偃月刀",
    "category": "武器",
    "bonusDesc": "戰力 +9，威震華夏",
    "effect": {
      "str": 9
    },
    "desc": "重八十二斤，又名冷艷鋸。關羽之專屬神兵，斬顏良、誅文醜、水淹七軍。",
    "defaultOwner": {
      "0": "關羽",
      "1": "關羽",
      "2": "關羽",
      "3": "關羽",
      "4": "關羽",
      "5": "關羽"
    },
    "provinceOrigin": 11
  },
  {
    "id": "weapon_3",
    "name": "丈八蛇矛",
    "category": "武器",
    "bonusDesc": "戰力 +8，萬夫莫敵",
    "effect": {
      "str": 8
    },
    "desc": "長一丈八寸，矛頭如游蛇，張飛之隨身神兵，長坂橋前退曹操百萬大軍。",
    "defaultOwner": {
      "0": "張飛",
      "1": "張飛",
      "2": "張飛",
      "3": "張飛",
      "4": "張飛",
      "5": "張飛"
    },
    "provinceOrigin": 11
  },
  {
    "id": "weapon_4",
    "name": "倚天劍",
    "category": "武器",
    "bonusDesc": "戰力 +8，鎮國神劍",
    "effect": {
      "str": 8
    },
    "desc": "曹操隨身佩劍，取「拔劍倚天」之意，鋒利無比，能削鐵如泥。",
    "defaultOwner": {
      "0": "曹操",
      "1": "曹操",
      "2": "曹操",
      "3": "曹操",
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 12
  },
  {
    "id": "weapon_5",
    "name": "青釭劍",
    "category": "武器",
    "bonusDesc": "戰力 +8，削鐵如泥",
    "effect": {
      "str": 8
    },
    "desc": "曹操之另一柄寶劍，交由夏侯恩保管，長坂坡之役為趙雲所獲。",
    "defaultOwner": {
      "0": "曹操",
      "1": "曹操",
      "2": "曹操",
      "3": "趙雲",
      "4": "趙雲",
      "5": "趙雲"
    },
    "provinceOrigin": 13
  },
  {
    "id": "weapon_6",
    "name": "棗木槊",
    "category": "武器",
    "bonusDesc": "戰力 +6，長槊縱橫",
    "effect": {
      "str": 6
    },
    "desc": "堅硬棗木所製長槊，重騎兵衝鋒之利器。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_7",
    "name": "雌雄雙股劍",
    "category": "武器",
    "bonusDesc": "戰力 +7，仁者之風",
    "effect": {
      "str": 7
    },
    "desc": "劉備於涿縣起兵時所鑄之神兵，一鞘雙劍，左雌右雄，配合精妙。",
    "defaultOwner": {
      "0": "劉備",
      "1": "劉備",
      "2": "劉備",
      "3": "劉備",
      "4": "劉備",
      "5": "劉備"
    },
    "provinceOrigin": 3
  },
  {
    "id": "weapon_8",
    "name": "古錠刀",
    "category": "武器",
    "bonusDesc": "戰力 +7，江東猛虎",
    "effect": {
      "str": 7
    },
    "desc": "江東猛虎孫堅所佩之寶刀，百煉精鋼，刃帶花紋，削銅斬鐵。",
    "defaultOwner": {
      "0": "孫堅",
      "1": "孫策",
      "2": "孫權",
      "3": "孫權",
      "4": "孫權",
      "5": "孫權"
    },
    "provinceOrigin": 31
  },
  {
    "id": "weapon_9",
    "name": "涯角槍",
    "category": "武器",
    "bonusDesc": "戰力 +7，渾身是膽",
    "effect": {
      "str": 7
    },
    "desc": "海角天涯無對手，長山趙子龍之護身銀槍。",
    "defaultOwner": {
      "0": "趙雲",
      "1": "趙雲",
      "2": "趙雲",
      "3": "趙雲",
      "4": "趙雲",
      "5": "趙雲"
    },
    "provinceOrigin": 3
  },
  {
    "id": "weapon_10",
    "name": "雙鐵戟",
    "category": "武器",
    "bonusDesc": "戰力 +6，古之惡來",
    "effect": {
      "str": 6
    },
    "desc": "重八十斤，典韋專屬狂兵，宛城力戰捨命護主。",
    "defaultOwner": {
      "0": null,
      "1": "典韋",
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 12
  },
  {
    "id": "weapon_11",
    "name": "養由基弓",
    "category": "武器",
    "bonusDesc": "戰力 +6，百步穿楊",
    "effect": {
      "str": 6
    },
    "desc": "春秋神射手養由基所遺神弓，百步之外射楊柳葉百發百中，黃忠所佩。",
    "defaultOwner": {
      "0": "黃忠",
      "1": "黃忠",
      "2": "黃忠",
      "3": "黃忠",
      "4": "黃忠",
      "5": "黃忠"
    },
    "provinceOrigin": 30
  },
  {
    "id": "weapon_12",
    "name": "七星寶刀",
    "category": "武器",
    "bonusDesc": "戰力 +6，刺董名刃",
    "effect": {
      "str": 6
    },
    "desc": "司徒王允家傳寶刀，曹操曾借之刺殺董卓，削鐵如泥。",
    "defaultOwner": {
      "0": "曹操",
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_13",
    "name": "大斧",
    "category": "武器",
    "bonusDesc": "戰力 +5，開山破陣",
    "effect": {
      "str": 5
    },
    "desc": "曹魏五子良將徐晃之隨身巨斧，威震樊城破關羽。",
    "defaultOwner": {
      "0": null,
      "1": "徐晃",
      "2": "徐晃",
      "3": "徐晃",
      "4": "徐晃",
      "5": "徐晃"
    },
    "provinceOrigin": 14
  },
  {
    "id": "weapon_14",
    "name": "三尖刀",
    "category": "武器",
    "bonusDesc": "戰力 +5，兩面三刀",
    "effect": {
      "str": 5
    },
    "desc": "重五十斤，袁術麾下第一大將紀靈之兵器。",
    "defaultOwner": {
      "0": "紀靈",
      "1": "紀靈",
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 13
  },
  {
    "id": "weapon_15",
    "name": "鐵蒺藜骨朵",
    "category": "武器",
    "bonusDesc": "戰力 +5，蠻王異兵",
    "effect": {
      "str": 5
    },
    "desc": "五溪蠻王沙摩柯所使之異形重兵器，夷陵之戰射殺甘寧。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": "沙摩柯"
    },
    "provinceOrigin": 32
  },
  {
    "id": "weapon_16",
    "name": "鐵鞭",
    "category": "武器",
    "bonusDesc": "戰力 +5，苦肉忠烈",
    "effect": {
      "str": 5
    },
    "desc": "東吳三朝元老黃蓋之隨身重兵，赤壁之戰獻苦肉計。",
    "defaultOwner": {
      "0": "黃蓋",
      "1": "黃蓋",
      "2": "黃蓋",
      "3": "黃蓋",
      "4": "黃蓋",
      "5": "黃蓋"
    },
    "provinceOrigin": 22
  },
  {
    "id": "weapon_17",
    "name": "李廣弓",
    "category": "武器",
    "bonusDesc": "戰力 +6，飛將射石",
    "effect": {
      "str": 6
    },
    "desc": "漢代飛將軍李廣所傳神弓，射虎入石。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 17
  },
  {
    "id": "weapon_18",
    "name": "鳳嘴刀",
    "category": "武器",
    "bonusDesc": "戰力 +5，鳳鳴九天",
    "effect": {
      "str": 5
    },
    "desc": "刀頭如鳳嘴之利刃，威力強大。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 13
  },
  {
    "id": "weapon_19",
    "name": "眉尖刀",
    "category": "武器",
    "bonusDesc": "戰力 +4，靈動如月",
    "effect": {
      "str": 4
    },
    "desc": "刀刃細長如女子畫眉，輕巧敏捷。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 14
  },
  {
    "id": "weapon_20",
    "name": "三丈矛",
    "category": "武器",
    "bonusDesc": "戰力 +6，一寸長一寸強",
    "effect": {
      "str": 6
    },
    "desc": "長達三丈之特製長矛，破騎殺敵。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 11
  },
  {
    "id": "weapon_21",
    "name": "手戟",
    "category": "武器",
    "bonusDesc": "戰力 +4，百步投擲",
    "effect": {
      "str": 4
    },
    "desc": "太史慈與孫策搏鬥時所用之短戟，亦可用作暗器。",
    "defaultOwner": {
      "0": "太史慈",
      "1": "太史慈",
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 22
  },
  {
    "id": "weapon_22",
    "name": "梅花袖箭",
    "category": "武器",
    "bonusDesc": "戰力 +4，梅花暗藏",
    "effect": {
      "str": 4
    },
    "desc": "機關精巧之袖珍暗器，連續發射。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_23",
    "name": "袖箭",
    "category": "武器",
    "bonusDesc": "戰力 +3，出其不意",
    "effect": {
      "str": 3
    },
    "desc": "藏於袖中之短箭機關。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_24",
    "name": "大桿刀",
    "category": "武器",
    "bonusDesc": "戰力 +5，威猛霸道",
    "effect": {
      "str": 5
    },
    "desc": "長桿重刀，揮砍威力驚人。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 12
  },
  {
    "id": "weapon_25",
    "name": "大刀",
    "category": "武器",
    "bonusDesc": "戰力 +4，戰場百兵",
    "effect": {
      "str": 4
    },
    "desc": "軍中精銳普遍裝備之厚刃大刀。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 12
  },
  {
    "id": "weapon_26",
    "name": "金馬槊",
    "category": "武器",
    "bonusDesc": "戰力 +7，破陣重槊",
    "effect": {
      "str": 7
    },
    "desc": "黃金裝飾之名貴馬槊，破甲無雙。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 13
  },
  {
    "id": "weapon_27",
    "name": "寶雕弓",
    "category": "武器",
    "bonusDesc": "戰力 +5，鵰飾寶弓",
    "effect": {
      "str": 5
    },
    "desc": "精美雕飾之強弓，射程極遠。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "weapon_28",
    "name": "東胡飛弓",
    "category": "武器",
    "bonusDesc": "戰力 +5，塞外勁弩",
    "effect": {
      "str": 5
    },
    "desc": "東胡異族傳入之疾速射弓。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 1
  },
  {
    "id": "horse_1",
    "name": "赤兔馬",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "「人中有呂布，馬中有赤兔」，日行千里，夜行八百，渡水登山如履平地。",
    "defaultOwner": {
      "0": "董卓",
      "1": "呂布",
      "2": "關羽",
      "3": "關羽",
      "4": "關羽",
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "horse_2",
    "name": "的盧馬",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "額頭帶白點之名駒，曾於檀溪一躍三丈，救劉備脫離險境。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": "劉備",
      "3": "劉備",
      "4": "龐統",
      "5": null
    },
    "provinceOrigin": 28
  },
  {
    "id": "horse_3",
    "name": "爪黃飛電",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "曹操愛馬，通體雪白，蹄如包金，神采奕奕，許田打圍時曾乘之。",
    "defaultOwner": {
      "0": null,
      "1": "曹操",
      "2": "曹操",
      "3": "曹操",
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 13
  },
  {
    "id": "horse_4",
    "name": "絕影",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "曹操之坐騎，行疾如風，奔馳時身影難辨，宛城之戰救主中箭身亡。",
    "defaultOwner": {
      "0": "曹操",
      "1": "曹操",
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 12
  },
  {
    "id": "horse_5",
    "name": "照夜玉獅子",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "趙雲所騎白馬，通體雪白無雜毛，長坂坡陷落枯井一躍而起。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": "趙雲",
      "3": "趙雲",
      "4": "趙雲",
      "5": "趙雲"
    },
    "provinceOrigin": 3
  },
  {
    "id": "horse_6",
    "name": "快航",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "孫權之座騎，逍遙津被張遼突襲時飛躍小師橋脫險。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": "孫權",
      "3": "孫權",
      "4": "孫權",
      "5": "孫權"
    },
    "provinceOrigin": 21
  },
  {
    "id": "horse_7",
    "name": "汗血馬",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "產自西域大宛之名馬，奔馳流汗如血，日行千里。",
    "defaultOwner": {
      "0": "馬騰",
      "1": "馬騰",
      "2": "馬騰",
      "3": "馬超",
      "4": "馬超",
      "5": "馬超"
    },
    "provinceOrigin": 17
  },
  {
    "id": "horse_8",
    "name": "涼州馬",
    "category": "名馬",
    "bonusDesc": "確實撤退",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "西涼產之強健戰馬，適應荒漠惡劣環境。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 17
  },
  {
    "id": "horse_9",
    "name": "四輪車",
    "category": "名馬",
    "bonusDesc": "確實撤退，指揮如意",
    "effect": {
      "special": "確實撤退"
    },
    "desc": "諸葛亮出師北伐時所乘之四輪木車，羽扇綸巾，指揮若定。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "諸葛亮",
      "4": "諸葛亮",
      "5": "諸葛亮"
    },
    "provinceOrigin": 36
  },
  {
    "id": "book_1",
    "name": "孫子兵法",
    "category": "兵書",
    "bonusDesc": "統帥 +10，謀略 +10，兵家聖典",
    "effect": {
      "hp": 10,
      "int": 10
    },
    "desc": "春秋孫武所著兵書十三篇，被譽為兵學聖典、百代談兵之祖。",
    "defaultOwner": {
      "0": "孫堅",
      "1": "孫策",
      "2": "孫權",
      "3": "孫權",
      "4": "孫權",
      "5": "孫權"
    },
    "provinceOrigin": 22
  },
  {
    "id": "book_2",
    "name": "兵法二十四篇",
    "category": "兵書",
    "bonusDesc": "統帥 +9，謀略 +9，孔明兵書",
    "effect": {
      "hp": 9,
      "int": 9
    },
    "desc": "諸葛孔明畢生用兵治國經驗之總結，臨終前傳於姜維。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "諸葛亮",
      "4": "諸葛亮",
      "5": "諸葛亮"
    },
    "provinceOrigin": 36
  },
  {
    "id": "book_3",
    "name": "遁甲天書",
    "category": "兵書",
    "bonusDesc": "謀略 +9，神機妙算",
    "effect": {
      "int": 9
    },
    "desc": "峨嵋山左慈所傳三卷仙書：天遁、地遁、人遁，奪天地造化。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 36
  },
  {
    "id": "book_4",
    "name": "孟德新書",
    "category": "兵書",
    "bonusDesc": "統帥 +8，謀略 +8，魏武兵略",
    "effect": {
      "hp": 8,
      "int": 8
    },
    "desc": "曹操總結半生征戰經驗所著之兵書十四篇，張松曾過目不忘背誦之。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": "曹操",
      "3": "曹操",
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 13
  },
  {
    "id": "book_5",
    "name": "六韜",
    "category": "兵書",
    "bonusDesc": "統帥 +7，謀略 +8，太公韜略",
    "effect": {
      "hp": 7,
      "int": 8
    },
    "desc": "周朝太公望所著六卷太公兵法：文、武、龍、虎、豹、犬。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "司馬懿",
      "4": "司馬懿",
      "5": "司馬懿"
    },
    "provinceOrigin": 15
  },
  {
    "id": "book_6",
    "name": "三略",
    "category": "兵書",
    "bonusDesc": "謀略 +8，政治 +6，黃石秘傳",
    "effect": {
      "int": 8,
      "pol": 6
    },
    "desc": "黃石公授張良之兵書三卷：上略、中略、下略。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "徐庶",
      "4": "龐統",
      "5": null
    },
    "provinceOrigin": 28
  },
  {
    "id": "book_7",
    "name": "吳子兵法",
    "category": "兵書",
    "bonusDesc": "統帥 +8，謀略 +7，圖國強兵",
    "effect": {
      "hp": 8,
      "int": 7
    },
    "desc": "戰國名將吳起所著兵書六篇，講求內修文德、外治武備。",
    "defaultOwner": {
      "0": null,
      "1": "周瑜",
      "2": "周瑜",
      "3": "周瑜",
      "4": "陸遜",
      "5": "陸遜"
    },
    "provinceOrigin": 22
  },
  {
    "id": "book_8",
    "name": "司馬法",
    "category": "兵書",
    "bonusDesc": "統帥 +7，政治 +5，齊國兵典",
    "effect": {
      "hp": 7,
      "pol": 5
    },
    "desc": "戰國齊大夫司馬穰苴所整理古兵法。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 11
  },
  {
    "id": "book_9",
    "name": "太公陰符經",
    "category": "兵書",
    "bonusDesc": "謀略 +8，陰陽奇謀",
    "effect": {
      "int": 8
    },
    "desc": "蘇秦刺股夜讀之深奧謀略經典。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "book_10",
    "name": "春秋左氏傳",
    "category": "兵書",
    "bonusDesc": "統帥 +6，政治 +5，義薄雲天",
    "effect": {
      "hp": 6,
      "pol": 5
    },
    "desc": "關羽夜讀之經典春秋傳，修心明義、知興亡治亂。",
    "defaultOwner": {
      "0": "關羽",
      "1": "關羽",
      "2": "關羽",
      "3": "關羽",
      "4": "關羽",
      "5": "關羽"
    },
    "provinceOrigin": 11
  },
  {
    "id": "book_11",
    "name": "太平要術書",
    "category": "兵書",
    "bonusDesc": "統帥 +5，謀略 +5，號令黃巾",
    "effect": {
      "hp": 5,
      "int": 5
    },
    "desc": "南華老仙授與張角之奇書三卷，能呼風喚雨、號令黃巾。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 4
  },
  {
    "id": "relic_1",
    "name": "西蜀地形圖",
    "category": "奇寶",
    "bonusDesc": "政治 +6，地理圖誌",
    "effect": {
      "pol": 6
    },
    "desc": "張松私繪蜀中地理地形、兵備要塞之詳細地圖，後獻劉備。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "張松",
      "4": null,
      "5": null
    },
    "provinceOrigin": 36
  },
  {
    "id": "relic_2",
    "name": "平蠻指掌圖",
    "category": "奇寶",
    "bonusDesc": "政治 +6，平蠻指南",
    "effect": {
      "pol": 6
    },
    "desc": "諸葛亮平定南中時所繪之山川地形圖。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": "諸葛亮",
      "5": "諸葛亮"
    },
    "provinceOrigin": 36
  },
  {
    "id": "relic_3",
    "name": "傳國玉璽",
    "category": "奇寶",
    "bonusDesc": "魅力 +100，受命於天",
    "effect": {
      "cha": 100,
      "special": "號令天下，諸侯敬服"
    },
    "desc": "「受命於天，既壽永昌」。秦始皇以和氏璧所刻之至寶，天下至尊正統之象徵。",
    "defaultOwner": {
      "0": "董卓",
      "1": "袁術",
      "2": "曹操",
      "3": "曹操",
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 15
  },
  {
    "id": "relic_4",
    "name": "和氏璧",
    "category": "奇寶",
    "bonusDesc": "魅力 +25，政治 +5，天下無雙玉",
    "effect": {
      "cha": 25,
      "pol": 5
    },
    "desc": "卞和得自荊山之絕世美玉，完璧歸趙千古流傳。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 28
  },
  {
    "id": "relic_5",
    "name": "九錫",
    "category": "奇寶",
    "bonusDesc": "魅力 +20，政治 +10，天子賜禮",
    "effect": {
      "cha": 20,
      "pol": 10
    },
    "desc": "天子賜予元勳重臣之九種最高規格禮器：車馬、衣服、樂懸、硃戶、納陛等。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 15
  },
  {
    "id": "relic_6",
    "name": "銅雀",
    "category": "奇寶",
    "bonusDesc": "魅力 +15，祥瑞之兆",
    "effect": {
      "cha": 15
    },
    "desc": "曹操破鄴城掘地所得銅雀，遂築銅雀臺以彰盛世功業。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": "曹操",
      "4": "曹操",
      "5": "曹丕"
    },
    "provinceOrigin": 4
  },
  {
    "id": "relic_7",
    "name": "夜光珠",
    "category": "奇寶",
    "bonusDesc": "魅力 +10，暗室生輝",
    "effect": {
      "cha": 10
    },
    "desc": "南海深海所產明珠，黑夜中能照亮百步，價值連城。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 34
  },
  {
    "id": "relic_8",
    "name": "青囊書",
    "category": "醫書",
    "bonusDesc": "戰鬥每回合體力+10，醫術通神",
    "effect": {
      "staminaRecover": 10,
      "special": "每回合體力+10"
    },
    "desc": "神醫華佗畢生醫道精髓所載之奇書，可解百病、起死回生。戰鬥時每回合自動恢復 10 點體力。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 12
  },
  {
    "id": "relic_9",
    "name": "傷寒雜病論",
    "category": "醫書",
    "bonusDesc": "戰鬥每回合體力+10，政治 +4，醫聖巨著",
    "effect": {
      "staminaRecover": 10,
      "pol": 4,
      "special": "每回合體力+10"
    },
    "desc": "長沙太守張仲景所著中醫辨證論治經典，活人無數。戰鬥時每回合自動恢復 10 點體力。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 30
  },
  {
    "id": "relic_10",
    "name": "太平清領道",
    "category": "醫書",
    "bonusDesc": "戰鬥每回合體力+10，符水濟世",
    "effect": {
      "staminaRecover": 10,
      "special": "每回合體力+10"
    },
    "desc": "琅琊道士于吉得自曲陽泉水上之神書，能燒符飲水治百病。戰鬥時每回合自動恢復 10 點體力。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 22
  },
  {
    "id": "relic_11",
    "name": "神農本草經",
    "category": "醫書",
    "bonusDesc": "戰鬥每回合體力+10，本草聖典",
    "effect": {
      "staminaRecover": 10,
      "special": "每回合體力+10"
    },
    "desc": "古神農氏嚐百草所總結之藥學聖典，分上品、中品、下品。戰鬥時每回合自動恢復 10 點體力。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  },
  {
    "id": "relic_12",
    "name": "黃帝內經",
    "category": "醫書",
    "bonusDesc": "戰鬥每回合體力+10，養生聖典",
    "effect": {
      "staminaRecover": 10,
      "special": "每回合體力+10"
    },
    "desc": "黃帝與岐伯問答討論醫理之至尊經典，黃老醫術之源頭。戰鬥時每回合自動恢復 10 點體力。",
    "defaultOwner": {
      "0": null,
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "5": null
    },
    "provinceOrigin": 15
  }
];

export function getItemByOwner(generalName: string, scenarioIndex: number): TreasureItem[] {
  return TREASURE_ITEMS.filter(item => item.defaultOwner[scenarioIndex] === generalName);
}

export function getGeneralItemBonus(generalName: string, scenarioIndex: number) {
  const items = getItemByOwner(generalName, scenarioIndex);
  let strBonus = 0;
  let intBonus = 0;
  let polBonus = 0;
  let chaBonus = 0;
  let hpBonus = 0;
  let staminaRecover = 0;
  const specials: string[] = [];

  items.forEach(item => {
    if (item.effect.str) strBonus += item.effect.str;
    if (item.effect.int) intBonus += item.effect.int;
    if (item.effect.pol) polBonus += item.effect.pol;
    if (item.effect.cha) chaBonus += item.effect.cha;
    if (item.effect.hp) hpBonus += item.effect.hp;
    if (item.effect.staminaRecover) staminaRecover += item.effect.staminaRecover;
    if (item.effect.special) specials.push(item.effect.special);
  });

  return { strBonus, intBonus, polBonus, chaBonus, hpBonus, staminaRecover, staminaRecoverBonus: staminaRecover, specials, items };
}
