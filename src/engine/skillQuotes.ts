import { GeneralState } from '../types';

// 歷史名將專屬戰法對話喊話庫
const EXCLUSIVE_SKILL_QUOTES: Record<string, Record<string, string[]>> = {
  '呂布': {
    '無雙': ['「神鬼皆驚，看我天下無雙！」', '「普天之下，誰能敵我呂奉先！」'],
    '奮戰': ['「擋我者死！戟下不留無名之鬼！」', '「看吾將爾等砍成兩截！」'],
    '連突': ['「方天畫戟所過，寸草不生！」'],
    '突擊': ['「隨我衝鋒！踏平敵陣！」'],
    '激勵': ['「隨本將軍殺！後退者斬！」']
  },
  '關羽': {
    '單騎': ['「觀爾乃插標賣首爾，切看吾手中青龍刀！」'],
    '奮戰': ['「酒尚溫，切待關某去斬敵將首級！」', '「關某刀利，爾等速速領死！」'],
    '突擊': ['「關雲長在此，爾等受死！」'],
    '貫通': ['「青龍偃月，破陣斬將！」'],
    '鼓舞': ['「漢室匡扶，全憑諸君奮勇殺敵！」']
  },
  '張飛': {
    '激勵': ['「燕人張翼德在此！誰敢與吾決一死戰！」'],
    '奮戰': ['「哇呀呀！丈八蛇矛拿命來！」', '「叫爾等見識見識張爺爺的厲害！」'],
    '衝撞': ['「看我一矛刺你個通透！」'],
    '齊射': ['「小的們，給老子射爆敵軍！」']
  },
  '諸葛亮': {
    '火計': ['「亮有一計，可破敵陣！火來！」', '「風向已變，火勢起矣！」'],
    '業火': ['「火燒連營，此乃天數！」', '「借東風一用，焚盡強敵！」'],
    '偽報': ['「敵已入吾彀中矣，安能逃脫？」', '「虛虛實實，兵不厭詐！」'],
    '水龍計': ['「水火無情，順應天道！」'],
    '解策': ['「形勢洞若觀火，豈能受其蠱惑！」']
  },
  '趙雲': {
    '單騎': ['「血染征袍透甲紅，誰敢擋我常山趙子龍！」'],
    '奮戰': ['「龍膽亮銀槍，刺破蒼穹！」', '「縱有百萬大軍，吾亦往矣！」'],
    '突爆': ['「一身是膽，直取敵首！」'],
    '貫通': ['「槍如長龍，所向披靡！」']
  },
  '周瑜': {
    '業火': ['「談笑間，強虜灰飛煙滅！」', '「遙想公瑾當年，羽扇綸巾，火破強敵！」'],
    '火計': ['「風起之時，即是爾等覆滅之日！」'],
    '水龍計': ['「大江東去，浪淘盡千古風流人物！」'],
    '攻心': ['「兵者，攻心為上，攻城次之！」']
  },
  '曹操': {
    '亂射': ['「寧教我負天下人，休教天下人負我！」'],
    '攻心': ['「天下英雄，唯使君與操耳！」'],
    '激勵': ['「孤帶兵數十年，豈容爾等猖狂！」', '「設使國家無有孤，不知當幾人稱帝！」'],
    '奇謀': ['「兵無常勢，水無常形，破敵就在此時！」']
  },
  '劉備': {
    '援軍': ['「漢室興廢，在此一舉！同心協力！」'],
    '治傷': ['「與君共赴患難，安能見危不救！」'],
    '鼓舞': ['「仁義所在，勝敗何懼！全軍突擊！」']
  },
  '孫權': {
    '鐵壁': ['「孤坐擁江東，兵精糧足，豈懼汝等！」'],
    '齊射': ['「江東子弟，決不後退半步！」']
  },
  '馬超': {
    '突襲': ['「西涼馬超在此，拿命來換！」'],
    '奮戰': ['「殺父之仇，不共戴天！受死吧！」'],
    '衝撞': ['「西涼鐵騎，踏平中原！」']
  },
  '黃忠': {
    '亂射': ['「百步穿楊，老夫寶刀未老！」'],
    '齊射': ['「看老夫萬箭齊發，射穿敵陣！」']
  },
  '司馬懿': {
    '奇謀': ['「智者動於陰陽，爾等已落入算中！」'],
    '偽報': ['「大智若愚，大巧若拙，汝等安知吾意？」'],
    '水龍計': ['「天時地利皆在吾手，破敵只在瞬息！」']
  },
  '陸遜': {
    '業火': ['「火燒連營八百里，勝負已定！」'],
    '連營': ['「以逸待勞，克敵制勝！」']
  },
  '張遼': {
    '突襲': ['「張文遠在此！破敵就在今日！」', '「遼來也！敵軍安敢擋我！」']
  },
  '甘寧': {
    '突襲': ['「錦帆甘寧在此，百騎劫魏營！」']
  },
  '夏侯惇': {
    '奮戰': ['「父精母血，不可棄也！」']
  },
  '魏延': {
    '突攻': ['「誰敢殺我！誰能擋我！」']
  },
  '董卓': {
    '亂射': ['「逆我者死！順我者昌！」'],
    '攻心': ['「天下財寶皆歸吾手，爾等安敢不服！」']
  },
  '姜維': {
    '奮戰': ['「繼丞相遺志，誓還舊都！」']
  }
};

// 通用戰法類別喊話庫
const GENERIC_SKILL_QUOTES: Record<string, {
  highStr?: string[];
  highInt?: string[];
  highCha?: string[];
  default: string[];
}> = {
  // 傷害 / 武技型戰法
  'attack': {
    highStr: ['「看招！敵將納命來！」', '「拿命來換！」', '「全軍聽令，破陣斬將！」', '「血戰到底，寸步不讓！」'],
    highInt: ['「看準敵虛，擊其要害！」', '「陣法已亂，隨我殺入！」'],
    default: ['「全軍衝鋒！討伐逆賊！」', '「看我厲害，破！」', '「接我一招！」']
  },
  // 策略 / 智謀 / 火水計型戰法
  'stratagem': {
    highInt: ['「敵已入吾彀中矣！」', '「運籌帷幄，決勝千里！」', '「此乃天威，爾等安能相抗！」', '「中吾奇謀，納命來吧！」'],
    highStr: ['「妙計已出，看爾等如何抵擋！」'],
    default: ['「兵不厭詐，妙計成矣！」', '「火攻水淹，順天應人！」', '「敵陣破矣！」']
  },
  // 輔助 / 鼓舞 / 治療型戰法
  'support': {
    highCha: ['「將士們切勿驚慌，隨我共抗強敵！」', '「仁義之師，有勝無敗！」', '「同心協力，匡扶社稷！」'],
    highInt: ['「穩定心神，重整旗鼓！」', '「急救傷員，再戰一回合！」'],
    default: ['「全軍振作，重整陣型！」', '「擂鼓助威，全軍出擊！」']
  }
};

// 判定技能類別
function getSkillCategory(skillName: string): 'attack' | 'stratagem' | 'support' {
  if (['治傷', '援軍', '解策', '激勵', '鼓舞', '鐵壁', '守城', '偽報'].includes(skillName)) {
    return 'support';
  }
  if (['火計', '業火', '水龍計', '山崩', '奇謀', '攻心', '連營', '流言'].includes(skillName)) {
    return 'stratagem';
  }
  return 'attack';
}

/**
 * 取得武將發動技能時的動態對白喊話
 */
export function getSkillQuote(generalName: string, skillName: string, genData?: GeneralState): string {
  // 1. 優先匹配名將專屬台詞
  if (EXCLUSIVE_SKILL_QUOTES[generalName] && EXCLUSIVE_SKILL_QUOTES[generalName][skillName]) {
    const quotes = EXCLUSIVE_SKILL_QUOTES[generalName][skillName];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // 2. 匹配通用性格台詞
  const category = getSkillCategory(skillName);
  const catConfig = GENERIC_SKILL_QUOTES[category];

  const str = genData?.str ?? 60;
  const int = genData?.int ?? 60;
  const cha = genData?.cha ?? 60;

  if (category === 'attack' && str >= 80 && catConfig.highStr) {
    return catConfig.highStr[Math.floor(Math.random() * catConfig.highStr.length)];
  }
  if (category === 'stratagem' && int >= 80 && catConfig.highInt) {
    return catConfig.highInt[Math.floor(Math.random() * catConfig.highInt.length)];
  }
  if (category === 'support' && cha >= 80 && catConfig.highCha) {
    return catConfig.highCha[Math.floor(Math.random() * catConfig.highCha.length)];
  }

  // 3. 預設備用喊話
  const defaults = catConfig.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}
