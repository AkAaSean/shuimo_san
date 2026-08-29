import { Formation, FormationTerrainType } from '../types';
import { provinces } from '../data/provinces';

export interface TerrainDetail {
  id: FormationTerrainType;
  name: string;
  symbol: string;
  color: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
  desc: string;
  advantageSummary: string;
}

export const TERRAIN_DETAILS: Record<FormationTerrainType, TerrainDetail> = {
  '平地': {
    id: '平地',
    name: '平原廣野',
    symbol: '🌾',
    color: '#84cc16',
    bgBadge: 'bg-emerald-100',
    borderBadge: 'border-emerald-300',
    textBadge: 'text-emerald-900',
    desc: '平坦開闊的平原與中原沃土。視野極佳，利於大軍列陣、騎兵全速衝刺與雙翼包圍合擊。',
    advantageSummary: '利於【錐行】、【魚鱗】、【鶴翼】、【雁行】大展拳腳；水軍陣形在陸上缺乏威脅。'
  },
  '山嶽': {
    id: '山嶽',
    name: '險峻山嶽',
    symbol: '🏔️',
    color: '#d97706',
    bgBadge: 'bg-amber-100',
    borderBadge: 'border-amber-400',
    textBadge: 'text-amber-900',
    desc: '蜀道山隘、險關峽谷與崇山峻嶺。地形狹隘陡峭，易守難攻，利於窄道突穿或依託險隘死守。',
    advantageSummary: '利於【鋒矢】單點突穿、【方圓】銅牆鐵壁；【錐行】、【鶴翼】易受地形限制或伏擊。'
  },
  '水上': {
    id: '水上',
    name: '江河水網',
    symbol: '🌊',
    color: '#0284c7',
    bgBadge: 'bg-cyan-100',
    borderBadge: 'border-cyan-400',
    textBadge: 'text-cyan-900',
    desc: '長江、漢水、鄱陽湖等水網江域與沿海島嶼。波濤洶湧，非精熟舟師水戰之部隊寸步難行。',
    advantageSummary: '【水陣】具備絕對壓倒性優勢（攻防+25%、水計減耗）；陸戰步騎陣形受嚴重削弱。'
  },
  '密林': {
    id: '密林',
    name: '密林沼澤',
    symbol: '🌲',
    color: '#16a34a',
    bgBadge: 'bg-green-100',
    borderBadge: 'border-green-400',
    textBadge: 'text-green-900',
    desc: '南中密林、煙瘴之地與熱帶沼澤。林木茂密視線受阻，遠程弓箭受限，行軍遲緩且易遭奇襲。',
    advantageSummary: '【方圓】密林金湯（S級防禦+30%）、【八卦】破瘴驅邪（S級全適應）；【雁行】與【鶴翼】弓矢威力受樹木遮蔽。'
  },
  '通用': {
    id: '通用',
    name: '全域通用',
    symbol: '☯️',
    color: '#9333ea',
    bgBadge: 'bg-purple-100',
    borderBadge: 'border-purple-300',
    textBadge: 'text-purple-900',
    desc: '涵蓋八卦陣等奇門遁甲神術，不受世俗地形拘束，全天候全地形皆能發揮完美戰力。',
    advantageSummary: '全天候適應，無任何地形懲罰，計謀成功率與威力大幅提升。'
  }
};

export const FORMATIONS: Formation[] = [
  { 
    name: '錐行', 
    atkMod: 0.25, 
    defMod: -0.10, 
    terrain: '平地', 
    type: '平地',
    initiativeMod: 20, 
    specialDesc: '極速突破: 極高先攻，普通攻擊有20%機率無視防禦，但自身受傷增加',
    special: '極速突破: 極高先攻，普通攻擊有20%機率無視防禦，但自身受傷增加'
  },
  { 
    name: '魚鱗', 
    atkMod: 0.15, 
    defMod: 0.10, 
    terrain: '平地', 
    type: '平地',
    initiativeMod: 5, 
    specialDesc: '正軍突擊: 攻守均衡，特殊攻擊威力 +15%',
    special: '正軍突擊: 攻守均衡，特殊攻擊威力 +15%'
  },
  { 
    name: '鋒矢', 
    atkMod: 0.30, 
    defMod: -0.20, 
    terrain: '山嶽', 
    type: '山嶽',
    initiativeMod: 12, 
    specialDesc: '死戰突穿: 捨棄防禦的全攻陣形，物理暴擊率 +20%',
    special: '死戰突穿: 捨棄防禦的全攻陣形，物理暴擊率 +20%'
  },
  { 
    name: '鶴翼', 
    atkMod: 0.10, 
    defMod: 0.10, 
    terrain: '平地', 
    type: '平地',
    initiativeMod: 0, 
    specialDesc: '兩翼合圍: 弓箭系技能與計謀施放命中率 +20%，且受到圍攻時減傷',
    special: '兩翼合圍: 弓箭系技能與計謀施放命中率 +20%，且受到圍攻時減傷'
  },
  { 
    name: '方圓', 
    atkMod: -0.15, 
    defMod: 0.35, 
    terrain: '山嶽', 
    type: '山嶽',
    initiativeMod: -15, 
    specialDesc: '固若金湯: 防禦指令傷害減免提高至 75%，且體力恢復額外 +10',
    special: '固若金湯: 防禦指令傷害減免提高至 75%，且體力恢復額外 +10'
  },
  { 
    name: '雁行', 
    atkMod: 0.10, 
    defMod: 0.05, 
    terrain: '平地', 
    type: '平地',
    initiativeMod: 10, 
    specialDesc: '遠程齊射: 強化遠程打擊，弓箭與亂射/火矢傷害 +20%，且不易受到反擊',
    special: '遠程齊射: 強化遠程打擊，弓箭與亂射/火矢傷害 +20%，且不易受到反擊'
  },
  { 
    name: '水陣', 
    atkMod: 0.15, 
    defMod: 0.15, 
    terrain: '水上', 
    type: '水上',
    initiativeMod: 15, 
    specialDesc: '江河霸主: 水上地形威力與防禦再 +20%，且水計消耗體力 -30%',
    special: '江河霸主: 水上地形威力與防禦再 +20%，且水計消耗體力 -30%'
  },
  { 
    name: '八卦', 
    atkMod: 0.15, 
    defMod: 0.20, 
    terrain: '通用', 
    type: '通用',
    initiativeMod: 18, 
    specialDesc: '奇門神陣: 計謀威力 +25%、計謀成功率大幅提升，免疫敵方混亂與挑釁',
    special: '奇門神陣: 計謀威力 +25%、計謀成功率大幅提升，免疫敵方混亂與挑釁'
  }
];

export interface FormationTerrainCompatibility {
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  ratingScore: number; // 100 base
  atkBonus: number;   // +0.20 means +20%
  defBonus: number;   // +0.20 means +20%
  initBonus: number;  // +10 means +10 initiative
  tag: string;
  tagColor: string;
  summary: string;
  detailedEffect: string;
}

// 8 大陣形對應 4 大戰場地形之完整矩陣
export const FORMATION_TERRAIN_MATRIX: Record<string, Record<FormationTerrainType, FormationTerrainCompatibility>> = {
  '錐行': {
    '平地': {
      rating: 'S',
      ratingScore: 125,
      atkBonus: 0.20,
      defBonus: 0.00,
      initBonus: 15,
      tag: '平地神速',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '突擊爆發 +20%，先攻極速',
      detailedEffect: '在平原沃野可將騎兵衝刺發揮至極致，攻擊與無視防禦機率顯著提升，先攻搶先出手。'
    },
    '山嶽': {
      rating: 'C',
      ratingScore: 80,
      atkBonus: -0.15,
      defBonus: -0.10,
      initBonus: -10,
      tag: '山道受制',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-300',
      summary: '攻擊 -15%、易遭山伏',
      detailedEffect: '山道狹窄崎嶇，錐行隊伍縱深過長難以折轉，容易遭受落石或兩側伏擊。'
    },
    '水上': {
      rating: 'D',
      ratingScore: 65,
      atkBonus: -0.25,
      defBonus: -0.20,
      initBonus: -15,
      tag: '水戰大劣',
      tagColor: 'text-rose-700 bg-rose-100 border-rose-300',
      summary: '攻防大幅 -25%，步騎難施',
      detailedEffect: '戰船無法組構錐形衝鋒陣列，兵士落水受制，攻防能力受到全面壓制。'
    },
    '密林': {
      rating: 'C',
      ratingScore: 85,
      atkBonus: -0.10,
      defBonus: -0.05,
      initBonus: -5,
      tag: '密林受阻',
      tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
      summary: '衝鋒受阻，戰力微幅衰減',
      detailedEffect: '樹木茂密阻礙馬匹突馳，陣列行進容易脫節。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '魚鱗': {
    '平地': {
      rating: 'A',
      ratingScore: 110,
      atkBonus: 0.10,
      defBonus: 0.05,
      initBonus: 5,
      tag: '平地穩健',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '攻守兼備，戰力穩定 +10%',
      detailedEffect: '經典堂堂之陣，平原排開攻守一體，特技與一般交鋒皆能穩定輸出。'
    },
    '山嶽': {
      rating: 'B',
      ratingScore: 95,
      atkBonus: -0.05,
      defBonus: 0.00,
      initBonus: 0,
      tag: '山地平穩',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-300',
      summary: '維持陣腳，攻防平穩',
      detailedEffect: '梯次重疊的魚鱗構造在山地仍能維持基本陣型，不易被敵軍輕易衝散。'
    },
    '水上': {
      rating: 'C',
      ratingScore: 80,
      atkBonus: -0.15,
      defBonus: -0.10,
      initBonus: -5,
      tag: '水網生疏',
      tagColor: 'text-cyan-800 bg-cyan-100 border-cyan-300',
      summary: '戰力微降 -15%，欠缺舟戰熟練',
      detailedEffect: '非水上特化陣形，在江面浪濤中協同配合度降低。'
    },
    '密林': {
      rating: 'B',
      ratingScore: 95,
      atkBonus: 0.00,
      defBonus: 0.00,
      initBonus: 0,
      tag: '密林穩守',
      tagColor: 'text-green-800 bg-green-100 border-green-300',
      summary: '陣型緊密，不易被分割',
      detailedEffect: '各梯隊互為犄角，即便在瘴氣密林中亦能穩步推進。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '鋒矢': {
    '平地': {
      rating: 'A',
      ratingScore: 105,
      atkBonus: 0.05,
      defBonus: 0.00,
      initBonus: 5,
      tag: '突刺猛攻',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '直刺敵核心，暴擊強悍',
      detailedEffect: '鋒矢之銳直插中軍，平地上突擊力強但防禦單薄。'
    },
    '山嶽': {
      rating: 'S',
      ratingScore: 130,
      atkBonus: 0.25,
      defBonus: 0.10,
      initBonus: 10,
      tag: '山嶽稱霸',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-400',
      summary: '山谷突穿 +25%、暴擊率大增',
      detailedEffect: '益州巴蜀名將最擅之陣！在狹谷中如利刃出鞘，將敵軍陣列一分為二，暴擊傷害極高。'
    },
    '水上': {
      rating: 'D',
      ratingScore: 70,
      atkBonus: -0.20,
      defBonus: -0.20,
      initBonus: -10,
      tag: '水戰難施',
      tagColor: 'text-rose-700 bg-rose-100 border-rose-300',
      summary: '攻防 -20%，船隊難以突刺',
      detailedEffect: '水面迎風逆流，箭矢陣首易遭敵方水師圍射夾攻。'
    },
    '密林': {
      rating: 'A',
      ratingScore: 110,
      atkBonus: 0.15,
      defBonus: 0.00,
      initBonus: 5,
      tag: '密林破敵',
      tagColor: 'text-green-800 bg-green-100 border-green-300',
      summary: '強行鑿穿，突破力 +15%',
      detailedEffect: '以密集鋒銳兵力撕開密林包圍圈，直取敵方首腦。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '鶴翼': {
    '平地': {
      rating: 'S',
      ratingScore: 120,
      atkBonus: 0.15,
      defBonus: 0.10,
      initBonus: 5,
      tag: '合圍制勝',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '兩翼包抄，弓計命中 +20%',
      detailedEffect: '平原地勢開闊，雙翼部隊能充分展開進行大範圍合圍，弓弩與計謀覆蓋敵方全軍。'
    },
    '山嶽': {
      rating: 'C',
      ratingScore: 75,
      atkBonus: -0.15,
      defBonus: -0.15,
      initBonus: -10,
      tag: '雙翼受阻',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-300',
      summary: '展開不易，雙翼協同中斷',
      detailedEffect: '高山峻嶺阻隔視線與通訊，兩翼無法有效包抄，反被敵軍分割逐個擊破。'
    },
    '水上': {
      rating: 'B',
      ratingScore: 95,
      atkBonus: 0.00,
      defBonus: 0.00,
      initBonus: 0,
      tag: '水面雙翼',
      tagColor: 'text-cyan-800 bg-cyan-100 border-cyan-300',
      summary: '戰船左右包圍，尚可發揮',
      detailedEffect: '若在寬闊江面亦可展開水師雙翼，但轉向調動稍顯笨重。'
    },
    '密林': {
      rating: 'C',
      ratingScore: 80,
      atkBonus: -0.10,
      defBonus: -0.10,
      initBonus: -5,
      tag: '林中迷失',
      tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
      summary: '雙翼難以互援，弓箭受阻',
      detailedEffect: '密林遮蔽視線，兩翼部隊容易迷失方位失去火力呼應。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '方圓': {
    '平地': {
      rating: 'A',
      ratingScore: 105,
      atkBonus: -0.05,
      defBonus: 0.20,
      initBonus: -10,
      tag: '鐵壁守禦',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '極高減傷，但機動力偏低',
      detailedEffect: '嚴密圓形防禦方陣，能承受平原騎兵任何猛烈衝擊，但追擊移動緩慢。'
    },
    '山嶽': {
      rating: 'S',
      ratingScore: 135,
      atkBonus: 0.05,
      defBonus: 0.35,
      initBonus: 0,
      tag: '一夫當關',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-400',
      summary: '防禦減傷 75%、快速回體',
      detailedEffect: '依託山險地形固若金湯！敵軍久攻不克士氣大崩，防守減傷極限拉滿。'
    },
    '水上': {
      rating: 'B',
      ratingScore: 90,
      atkBonus: -0.10,
      defBonus: 0.10,
      initBonus: -10,
      tag: '鐵鎖連環',
      tagColor: 'text-cyan-800 bg-cyan-100 border-cyan-300',
      summary: '水上重盾，抗衝擊但懼火',
      detailedEffect: '戰船結成環狀鐵壁，防守穩健但機動力極低，若遭火計需加倍留意。'
    },
    '密林': {
      rating: 'S',
      ratingScore: 130,
      atkBonus: 0.10,
      defBonus: 0.30,
      initBonus: 5,
      tag: '密林金湯',
      tagColor: 'text-green-800 bg-green-100 border-green-400',
      summary: '密林防禦 +30%，抵禦毒瘴伏擊',
      detailedEffect: '圓陣背向相依全方位防禦，完全杜絕密林暗箭與伏擊奇襲，穩如泰山化解叢林混戰。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '雁行': {
    '平地': {
      rating: 'S',
      ratingScore: 120,
      atkBonus: 0.15,
      defBonus: 0.05,
      initBonus: 10,
      tag: '萬箭齊發',
      tagColor: 'text-emerald-700 bg-emerald-100 border-emerald-300',
      summary: '遠程射擊 +25%，不易受反擊',
      detailedEffect: '斜列階梯式排列，弓弩手無死角輪番傾瀉箭雨，平原遠程壓制力極強。'
    },
    '山嶽': {
      rating: 'A',
      ratingScore: 110,
      atkBonus: 0.10,
      defBonus: 0.05,
      initBonus: 5,
      tag: '高地俯射',
      tagColor: 'text-amber-800 bg-amber-100 border-amber-300',
      summary: '占據高地，俯射命中提升',
      detailedEffect: '部隊依山形梯次排開，占領制高點以箭雨封鎖隘口谷道。'
    },
    '水上': {
      rating: 'A',
      ratingScore: 110,
      atkBonus: 0.10,
      defBonus: 0.00,
      initBonus: 5,
      tag: '江面齊射',
      tagColor: 'text-cyan-800 bg-cyan-100 border-cyan-300',
      summary: '戰船排射，遠程火力覆蓋',
      detailedEffect: '戰船交錯排開，火箭齊發焚敵樓船，長江水戰經典戰術。'
    },
    '密林': {
      rating: 'D',
      ratingScore: 70,
      atkBonus: -0.20,
      defBonus: -0.10,
      initBonus: -10,
      tag: '林木阻箭',
      tagColor: 'text-rose-700 bg-rose-100 border-rose-300',
      summary: '箭矢被樹木遮擋，威力 -20%',
      detailedEffect: '茂密枝葉與藤蔓嚴重吸收箭矢動能，遠程傷害與命中率大幅下滑。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '水陣': {
    '平地': {
      rating: 'C',
      ratingScore: 80,
      atkBonus: -0.15,
      defBonus: -0.10,
      initBonus: -5,
      tag: '陸上乏力',
      tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
      summary: '攻防衰減 -15%，缺乏騎步配合',
      detailedEffect: '水軍戰法登陸作戰缺乏騎兵掩護與陸戰工事，戰力打折扣。'
    },
    '山嶽': {
      rating: 'D',
      ratingScore: 65,
      atkBonus: -0.25,
      defBonus: -0.20,
      initBonus: -15,
      tag: '寸步難行',
      tagColor: 'text-rose-700 bg-rose-100 border-rose-300',
      summary: '攻防大跌 -25%，極度不適',
      detailedEffect: '山路險峻陡峭，水陣戰法完全無用武之地，士氣與機動性大受折損。'
    },
    '水上': {
      rating: 'S',
      ratingScore: 145,
      atkBonus: 0.30,
      defBonus: 0.25,
      initBonus: 20,
      tag: '水戰神霸',
      tagColor: 'text-cyan-800 bg-cyan-100 border-cyan-400',
      summary: '攻防 +25~30%、水計體力 -30%',
      detailedEffect: '東吳水師獨步天下！艨艟鬥艦如履平地，水戰先攻大幅超前，水計威力激增且消耗驟降。'
    },
    '密林': {
      rating: 'C',
      ratingScore: 80,
      atkBonus: -0.10,
      defBonus: -0.10,
      initBonus: -5,
      tag: '林澤受限',
      tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
      summary: '沼澤略有作用，密林行動緩慢',
      detailedEffect: '在溪流沼澤略有生機，但在深密叢林中難以展開。'
    },
    '通用': {
      rating: 'A',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '標準適應',
      tagColor: 'text-slate-700 bg-slate-100 border-slate-300',
      summary: '基準發揮',
      detailedEffect: '正常發揮陣形固有攻防與先攻特性。'
    }
  },
  '八卦': {
    '平地': {
      rating: 'S',
      ratingScore: 125,
      atkBonus: 0.15,
      defBonus: 0.20,
      initBonus: 15,
      tag: '神鬼莫測',
      tagColor: 'text-purple-700 bg-purple-100 border-purple-300',
      summary: '全適應，計謀威力 +25%',
      detailedEffect: '孔明鬼斧神工之陣！平原上陰陽八門變幻莫測，計謀必定大獲成功。'
    },
    '山嶽': {
      rating: 'S',
      ratingScore: 125,
      atkBonus: 0.15,
      defBonus: 0.20,
      initBonus: 15,
      tag: '引石成陣',
      tagColor: 'text-purple-700 bg-purple-100 border-purple-300',
      summary: '全適應，免疫山谷混亂奇襲',
      detailedEffect: '化山石地勢為陣門，敵將深入其中如墮五里霧中，全軍免疫混亂與挑釁。'
    },
    '水上': {
      rating: 'S',
      ratingScore: 125,
      atkBonus: 0.15,
      defBonus: 0.20,
      initBonus: 15,
      tag: '風雲變色',
      tagColor: 'text-purple-700 bg-purple-100 border-purple-300',
      summary: '全適應，借東風掌水脈',
      detailedEffect: '巧借天時水脈，全無陸軍涉水之弊，水計火攻皆能出神入化。'
    },
    '密林': {
      rating: 'S',
      ratingScore: 125,
      atkBonus: 0.15,
      defBonus: 0.20,
      initBonus: 15,
      tag: '破瘴驅邪',
      tagColor: 'text-purple-700 bg-purple-100 border-purple-300',
      summary: '全適應，破除煙瘴毒霧',
      detailedEffect: '奇門八卦鎮守中軍，瘴氣毒物不可侵，密林伏擊皆被提前識破。'
    },
    '通用': {
      rating: 'S',
      ratingScore: 130,
      atkBonus: 0.20,
      defBonus: 0.20,
      initBonus: 20,
      tag: '無上神陣',
      tagColor: 'text-purple-800 bg-purple-100 border-purple-400',
      summary: '天地無極，神謀無雙',
      detailedEffect: '三國至高陣形，全地形無任何衰減，全方位統御戰場。'
    }
  }
};

export function getFormationInfo(name: string): Formation | undefined {
  return FORMATIONS.find(f => f.name === name);
}

export function getProvinceTerrain(provinceId: number): FormationTerrainType {
  const p = provinces.find(prov => prov.id === provinceId);
  return p?.terrain || '平地';
}

export function getFormationTerrainEffect(formationName: string, terrain: FormationTerrainType): FormationTerrainCompatibility {
  const formationMatrix = FORMATION_TERRAIN_MATRIX[formationName];
  if (!formationMatrix) {
    return {
      rating: 'B',
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '普通適應',
      tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
      summary: '無額外加成',
      detailedEffect: '一般發揮。'
    };
  }

  return formationMatrix[terrain] || formationMatrix['通用'] || {
    rating: 'B',
    ratingScore: 100,
    atkBonus: 0,
    defBonus: 0,
    initBonus: 0,
    tag: '普通適應',
    tagColor: 'text-stone-700 bg-stone-100 border-stone-300',
    summary: '無額外加成',
    detailedEffect: '一般發揮。'
  };
}

// 八卦陣極少數宗師級持有者（嚴格限定頂級軍師、隱士與傳人）
export const BAGUA_MASTERS = new Set([
  '諸葛亮',
  '司馬懿',
  '龐統',
  '陸遜',
  '姜維',
  '司馬徽',
  '水鏡先生',
  '水鏡',
  '左慈',
  '于吉',
  '南華老仙'
]);

// 益州巴蜀名將判定集合
export const LIU_ZHANG_YIZHOU_GENERALS = new Set([
  '劉焉', '劉璋', '張任', '嚴顏', '黃權', '法正', '孟達', '李嚴', '吳懿', '吳班',
  '雷銅', '吳蘭', '鄧賢', '冷苞', '劉璝', '高沛', '楊懷', '費觀', '費禕', '董和',
  '董允', '許靖', '龐羲', '王累', '秦宓', '譙周', '呂義', '王平', '霍峻', '霍弋',
  '羅憲', '卓膺', '張翼', '張嶷', '宗預', '鄧芝', '閻芝', '尹默', '杜瓊', '杜微',
  '孟獲', '祝融', '帶來洞主', '朵思大王', '木鹿大王', '兀突骨', '金環三結', '董荼那',
  '阿會喃', '高定', '雍闓', '朱褒', '劉循', '劉闡', '張衛', '楊昂', '楊任', '閻圃'
]);

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

// 三國著名武將/名士的歷史考證專屬陣形表 (每位武將精通 2~5 種，絕非全通)
export const HISTORICAL_GENERAL_FORMATIONS: Record<string, string[]> = {
  // === 蜀漢陣營 ===
  '諸葛亮': ['八卦', '鶴翼', '雁行', '方圓', '魚鱗'],
  '劉備': ['魚鱗', '鶴翼', '方圓'],
  '關羽': ['錐行', '鋒矢', '魚鱗', '方圓'],
  '張飛': ['錐行', '鋒矢', '魚鱗'],
  '趙雲': ['錐行', '雁行', '方圓', '魚鱗'],
  '馬超': ['錐行', '鋒矢', '魚鱗'],
  '黃忠': ['雁行', '鋒矢', '魚鱗'],
  '龐統': ['八卦', '鶴翼', '雁行', '魚鱗'],
  '姜維': ['八卦', '鋒矢', '鶴翼', '方圓', '錐行'],
  '魏延': ['鋒矢', '錐行', '方圓', '魚鱗'],
  '法正': ['鶴翼', '鋒矢', '雁行'],
  '徐庶': ['鶴翼', '錐行', '方圓'],
  '馬岱': ['錐行', '鋒矢', '魚鱗'],
  '嚴顏': ['雁行', '方圓', '魚鱗'],
  '王平': ['方圓', '鋒矢', '魚鱗'],
  '廖化': ['方圓', '魚鱗'],
  '關平': ['鋒矢', '魚鱗'],
  '關興': ['錐行', '鋒矢'],
  '張苞': ['錐行', '鋒矢'],
  '趙統': ['錐行', '雁行'],
  '趙廣': ['錐行', '雁行'],
  '霍峻': ['方圓', '雁行'],
  '羅憲': ['方圓', '雁行'],
  '李嚴': ['方圓', '鋒矢', '魚鱗'],
  '黃權': ['鶴翼', '方圓', '魚鱗'],
  '張嶷': ['鋒矢', '方圓'],
  '張翼': ['方圓', '魚鱗'],
  '蔣琬': ['鶴翼', '方圓'],
  '費禕': ['鶴翼', '方圓'],
  '董允': ['方圓', '魚鱗'],
  '馬良': ['鶴翼', '魚鱗'],
  '馬謖': ['鶴翼', '鋒矢'],
  '孟獲': ['鋒矢', '方圓', '錐行'],
  '祝融': ['鋒矢', '雁行', '錐行'],
  '兀突骨': ['方圓', '鋒矢'],

  // === 曹魏陣營 ===
  '曹操': ['錐行', '鶴翼', '魚鱗', '雁行', '方圓'],
  '司馬懿': ['八卦', '鶴翼', '方圓', '雁行', '錐行'],
  '夏侯惇': ['錐行', '鋒矢', '魚鱗'],
  '夏侯淵': ['雁行', '錐行', '鋒矢'],
  '張遼': ['錐行', '鋒矢', '魚鱗', '鶴翼'],
  '典韋': ['鋒矢', '方圓', '魚鱗'],
  '許褚': ['鋒矢', '方圓', '魚鱗'],
  '曹仁': ['方圓', '魚鱗', '鋒矢'],
  '曹洪': ['鋒矢', '魚鱗'],
  '徐晃': ['雁行', '錐行', '方圓', '魚鱗'],
  '張郃': ['錐行', '雁行', '方圓'],
  '于禁': ['方圓', '魚鱗', '鶴翼'],
  '樂進': ['鋒矢', '錐行', '魚鱗'],
  '李典': ['方圓', '鶴翼', '魚鱗'],
  '龐德': ['錐行', '鋒矢', '魚鱗'],
  '郭嘉': ['鶴翼', '雁行', '錐行'],
  '荀彧': ['鶴翼', '方圓', '魚鱗'],
  '荀攸': ['鶴翼', '雁行', '方圓'],
  '賈詡': ['鶴翼', '方圓', '雁行'],
  '程昱': ['鶴翼', '方圓'],
  '鄧艾': ['錐行', '鶴翼', '鋒矢', '雁行', '方圓'],
  '鍾會': ['鶴翼', '鋒矢', '錐行', '雁行'],
  '鐘會': ['鶴翼', '鋒矢', '錐行', '雁行'],
  '司馬師': ['鶴翼', '方圓', '錐行'],
  '司馬昭': ['鶴翼', '方圓', '錐行'],
  '郝昭': ['方圓', '雁行', '魚鱗'],
  '滿寵': ['方圓', '鶴翼'],
  '郭淮': ['方圓', '錐行', '鶴翼'],
  '曹真': ['鶴翼', '方圓', '魚鱗'],
  '曹休': ['錐行', '魚鱗'],
  '曹丕': ['雁行', '鶴翼', '魚鱗'],
  '曹植': ['鶴翼', '方圓'],
  '王雙': ['鋒矢', '錐行'],
  '文聘': ['方圓', '水陣', '魚鱗'],
  '陳群': ['方圓', '鶴翼'],
  '華歆': ['鶴翼', '魚鱗'],
  '鍾繇': ['方圓', '鶴翼'],
  '鐘繇': ['方圓', '鶴翼'],

  // === 東吳陣營 ===
  '周瑜': ['水陣', '鶴翼', '雁行', '魚鱗', '錐行'],
  '陸遜': ['八卦', '水陣', '鶴翼', '雁行', '方圓'],
  '孫堅': ['水陣', '鋒矢', '錐行', '魚鱗'],
  '孫策': ['水陣', '錐行', '鋒矢', '雁行'],
  '孫權': ['水陣', '鶴翼', '魚鱗', '方圓'],
  '呂蒙': ['水陣', '鶴翼', '鋒矢', '方圓'],
  '魯肅': ['水陣', '鶴翼', '雁行', '方圓'],
  '甘寧': ['水陣', '鋒矢', '錐行', '雁行'],
  '太史慈': ['水陣', '雁行', '錐行', '鋒矢'],
  '黃蓋': ['水陣', '鋒矢', '魚鱗'],
  '程普': ['水陣', '魚鱗', '方圓'],
  '韓當': ['水陣', '雁行', '魚鱗'],
  '蔣欽': ['水陣', '雁行', '魚鱗'],
  '周泰': ['水陣', '鋒矢', '方圓', '魚鱗'],
  '丁奉': ['水陣', '雁行', '鋒矢'],
  '徐盛': ['水陣', '方圓', '雁行'],
  '凌統': ['水陣', '鋒矢', '錐行'],
  '凌操': ['水陣', '鋒矢'],
  '陸抗': ['水陣', '鶴翼', '方圓', '雁行'],
  '諸葛恪': ['水陣', '鶴翼', '鋒矢', '雁行'],
  '諸葛瑾': ['水陣', '鶴翼', '方圓'],
  '張昭': ['水陣', '鶴翼'],
  '張紘': ['水陣', '鶴翼'],
  '步騭': ['水陣', '雁行', '方圓'],
  '顧雍': ['水陣', '方圓'],
  '朱然': ['水陣', '鋒矢', '雁行'],
  '朱桓': ['水陣', '方圓', '鋒矢'],
  '潘璋': ['水陣', '鋒矢'],
  '董襲': ['水陣', '鋒矢'],
  '陳武': ['水陣', '鋒矢'],
  '賀齊': ['水陣', '方圓'],
  '留贊': ['水陣', '鋒矢'],
  '虞翻': ['水陣', '方圓'],

  // === 群雄 / 隱士名士 ===
  '呂布': ['錐行', '鋒矢', '雁行', '魚鱗'],
  '貂蟬': ['鶴翼', '方圓'],
  '董卓': ['鋒矢', '方圓', '魚鱗'],
  '華雄': ['鋒矢', '錐行', '魚鱗'],
  '李傕': ['鋒矢', '錐行'],
  '郭汜': ['鋒矢', '錐行'],
  '袁紹': ['鶴翼', '魚鱗', '鋒矢', '方圓'],
  '顏良': ['錐行', '鋒矢', '魚鱗'],
  '文醜': ['錐行', '鋒矢', '魚鱗'],
  '田豐': ['鶴翼', '雁行', '方圓'],
  '沮授': ['鶴翼', '雁行', '方圓'],
  '審配': ['方圓', '雁行'],
  '逢紀': ['鶴翼', '鋒矢'],
  '高覽': ['鋒矢', '魚鱗'],
  '麴義': ['雁行', '鋒矢'],
  '公孫瓚': ['錐行', '雁行', '魚鱗'],
  '公孫度': ['錐行', '方圓'],
  '劉表': ['鶴翼', '魚鱗'],
  '黃祖': ['水陣', '雁行', '魚鱗'],
  '蔡瑁': ['水陣', '鶴翼', '魚鱗'],
  '張允': ['水陣', '魚鱗'],
  '劉焉': ['方圓', '魚鱗'],
  '劉璋': ['方圓', '魚鱗'],
  '張任': ['鋒矢', '雁行', '方圓'],
  '嚴白虎': ['水陣', '鋒矢'],
  '王朗': ['鶴翼', '方圓'],
  '孔融': ['鶴翼', '魚鱗'],
  '陶謙': ['方圓', '魚鱗'],
  '張魯': ['鶴翼', '方圓'],
  '司馬徽': ['八卦', '鶴翼', '方圓', '雁行'],
  '水鏡先生': ['八卦', '鶴翼', '方圓', '雁行'],
  '水鏡': ['八卦', '鶴翼', '方圓', '雁行'],
  '左慈': ['八卦', '鶴翼', '方圓'],
  '于吉': ['八卦', '鶴翼', '方圓'],
  '南華老仙': ['八卦', '鶴翼', '方圓'],
  '華佗': ['方圓', '鶴翼']
};

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
  const validFormations = FORMATIONS.map(f => f.name);

  // 1. 若該武將已有定義專屬的陣形陣列，直接回傳過濾後的有效陣形（絕不擅自添加全部陣形）
  if (general.formations && Array.isArray(general.formations) && general.formations.length > 0) {
    const custom = general.formations.filter(f => validFormations.includes(f));
    if (custom.length > 0) return custom;
  }

  const name = general.name || '';
  const str = general.str || 50;
  const int = general.int || 50;
  const hp = general.hp || 50;

  // 2. 優先查核歷史考證名將專屬陣形表
  if (HISTORICAL_GENERAL_FORMATIONS[name]) {
    const mapped = HISTORICAL_GENERAL_FORMATIONS[name].filter(f => validFormations.includes(f));
    if (mapped.length > 0) return mapped;
  }

  // 3. 通用武將之智能規則陣形配置 (數量控制在 1~3 種，且八卦陣嚴格限定宗師)
  const resultFormations: string[] = [];

  // 八卦陣：僅限 BAGUA_MASTERS 宗師集合，其他通用武將無論智力多高皆不得持有
  if (BAGUA_MASTERS.has(name)) {
    resultFormations.push('八卦');
  }

  // 孫吳勢力 / 水鄉將領必備水陣
  const isSunWu = SUN_WU_GENERALS.has(name) || name.startsWith('孫') || name.includes('吳_');
  if (isSunWu) {
    resultFormations.push('水陣');
  }

  // 巴蜀山地將領
  const isLiuZhangYizhou = LIU_ZHANG_YIZHOU_GENERALS.has(name) || name.includes('蜀_');
  if (isLiuZhangYizhou) {
    if (str >= 75) resultFormations.push('鋒矢');
    else resultFormations.push('方圓');
  }

  // 依武力/智力/體力特性分配常規陣形
  if (str >= 85) {
    resultFormations.push('錐行');
  }
  if (str >= 75 && !resultFormations.includes('錐行')) {
    resultFormations.push('鋒矢');
  }
  if (int >= 80) {
    resultFormations.push('鶴翼');
  }
  if (str >= 72 && int >= 60) {
    resultFormations.push('雁行');
  }
  if (hp >= 80 || (str < 65 && int < 65)) {
    resultFormations.push('方圓');
  }

  // 基礎陣形：若尚未擁有魚鱗且數量未滿 3 種，補入平衡的【魚鱗】
  if (!resultFormations.includes('魚鱗')) {
    resultFormations.push('魚鱗');
  }

  // 依武將資質控制上限：
  // 頂尖名將 (武>=85 或 智>=85)：最多 3~4 種
  // 中堅武將 (武>=70 或 智>=70)：最多 2~3 種
  // 一般庸將：最多 1~2 種
  let maxAllowed = 2;
  if (str >= 85 || int >= 85) maxAllowed = 4;
  else if (str >= 70 || int >= 70) maxAllowed = 3;

  const finalFormations = Array.from(new Set(resultFormations)).slice(0, maxAllowed);
  return finalFormations.length > 0 ? finalFormations : ['魚鱗'];
}

export function getTerrainMobilityCost(formationType: any, terrain: any): number { return 2; }
export function getTerrainEffectiveness(formationType: any, terrain: any): number { return 10; }

/**
 * ══════════════════════════════════════════════════════════════════════
 * 陣型地形戰鬥力修正計算模組 (Formation Terrain Combat Power Calculator)
 * ══════════════════════════════════════════════════════════════════════
 * 核心公式：
 *   戰力修正 = (地形基礎適性 * 地形佔比係數) + 陣型地形技能加成
 * ══════════════════════════════════════════════════════════════════════
 */

export interface TerrainCombatModifierBreakdown {
  terrain: FormationTerrainType;
  baseCompatibility: number;       // 地形基礎適性係數 (如 S級 1.25~1.30, A級 1.10, B級 0.95~1.00, C級 0.80~0.85, D級 0.65)
  terrainRatio: number;            // 地形佔比係數 (0.00 ~ 1.00)
  ratioWeightedBase: number;       // (地形基礎適性 * 地形佔比係數)
  skillBonus: number;              // 陣型地形技能加成
  terrainCombatModifier: number;   // 單一地形之戰力修正 = ratioWeightedBase + skillBonus
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  ratingScore: number;             // 適性得分 (基準 100)
  atkBonus: number;               // 地形攻擊修正
  defBonus: number;               // 地形防禦修正
  initBonus: number;              // 地形先攻修正
  tag: string;
}

export interface FormationTerrainCombatPowerResult {
  formationName: string;
  provinceId: number | null;
  provinceName: string;
  totalCombatModifier: number;     // 綜合總戰力修正係數 (如 1.18 代表 +18% 綜合實戰戰力)
  weightedBaseCompatibility: number; // 綜合基礎適性加權加總
  totalSkillBonus: number;         // 陣型地形技能加成加總
  compositeAtkMod: number;         // 複合攻擊力修正 (包含陣型固有攻防與地形加成)
  compositeDefMod: number;         // 複合防禦力修正
  compositeInitMod: number;        // 複合先攻修正
  compositeScore: number;          // 綜合適性評分 (100 為基準)
  compositeRating: 'S' | 'A' | 'B' | 'C' | 'D'; // 綜合評級 (S/A/B/C/D)
  breakdowns: Record<FormationTerrainType, TerrainCombatModifierBreakdown>;
  summary: string;                 // 戰力修正摘要
}

/**
 * 取得陣型在特定地形上的特化技能加成係數
 */
export function getFormationSpecialTerrainSkillBonus(
  formationName: string, 
  terrain: FormationTerrainType
): number {
  switch (formationName) {
    case '水陣':
      return terrain === '水上' ? 0.08 : 0.00;
    case '方圓':
      return terrain === '密林' ? 0.07 : (terrain === '山嶽' ? 0.05 : 0.00);
    case '八卦':
      return 0.05; // 奇門遁甲全天候適應加成
    case '錐行':
      return terrain === '平地' ? 0.06 : 0.00;
    case '鋒矢':
      return terrain === '山嶽' ? 0.06 : 0.00;
    case '雁行':
      return terrain === '平地' ? 0.04 : 0.00;
    case '鶴翼':
      return terrain === '平地' ? 0.04 : 0.00;
    case '魚鱗':
      return terrain === '平地' ? 0.03 : 0.00;
    default:
      return 0.00;
  }
}

/**
 * 取得武將地緣與能力帶來的陣型地形技能加成
 */
export function getGeneralTerrainAffinityBonus(
  general: { name?: string; str?: number; int?: number; hp?: number } | null | undefined,
  terrain: FormationTerrainType,
  formationName: string
): number {
  if (!general || !general.name) return 0.00;
  const name = general.name;
  let bonus = 0.00;

  // 東吳水師將領水戰加成
  if (terrain === '水上' && (SUN_WU_GENERALS.has(name) || name.startsWith('孫') || name.includes('吳_'))) {
    bonus += 0.04;
    if (formationName === '水陣') bonus += 0.02;
  }

  // 益州巴蜀名將山嶽作戰加成
  if (terrain === '山嶽' && (LIU_ZHANG_YIZHOU_GENERALS.has(name) || name.includes('蜀_'))) {
    bonus += 0.03;
    if (formationName === '鋒矢' || formationName === '方圓') bonus += 0.02;
  }

  // 南蠻蠻勇將領密林作戰加成
  if (terrain === '密林' && (name.includes('獲') || name.includes('融') || name.includes('洞主') || name.includes('大王') || name.includes('骨'))) {
    bonus += 0.04;
    if (formationName === '方圓' || formationName === '八卦') bonus += 0.02;
  }

  // 智謀超卓將領（INT >= 90）施展八卦陣或特定陣法之陣法奧義加成
  if ((general.int || 0) >= 90) {
    if (formationName === '八卦') bonus += 0.03;
    else if (formationName === '鶴翼') bonus += 0.02;
  }

  return bonus;
}

/**
 * 核心計算函式：計算陣型在指定郡縣/地形比例下的戰鬥力修正係數
 * 公式：戰力修正 = (地形基礎適性 * 地形佔比係數) + 陣型地形技能加成
 */
export function calculateFormationTerrainCombatModifier(params: {
  formationName: string;
  provinceId?: number | null;
  terrainRatio?: { 平地: number; 水上: number; 山嶽: number; 密林: number };
  general?: { name?: string; str?: number; int?: number; hp?: number } | null;
}): FormationTerrainCombatPowerResult {
  const { formationName, provinceId, general } = params;

  // 取得目標郡縣資訊與地形比例
  const province = (provinceId !== null && provinceId !== undefined)
    ? provinces.find(p => p.id === provinceId)
    : null;

  const rawRatio = params.terrainRatio || province?.terrainRatio || { 平地: 40, 水上: 20, 山嶽: 20, 密林: 20 };
  const totalRatioVal = (rawRatio.平地 + rawRatio.水上 + rawRatio.山嶽 + rawRatio.密林) || 100;

  // 正規化佔比 (加總為 1.00)
  const normalizedRatio: Record<FormationTerrainType, number> = {
    '平地': (rawRatio.平地 || 0) / totalRatioVal,
    '山嶽': (rawRatio.山嶽 || 0) / totalRatioVal,
    '水上': (rawRatio.水上 || 0) / totalRatioVal,
    '密林': (rawRatio.密林 || 0) / totalRatioVal,
    '通用': 0.00
  };

  const formationInfo = getFormationInfo(formationName);
  const matrix = FORMATION_TERRAIN_MATRIX[formationName];

  const terrainKeys: FormationTerrainType[] = ['平地', '山嶽', '水上', '密林'];
  const breakdowns = {} as Record<FormationTerrainType, TerrainCombatModifierBreakdown>;

  let totalCombatModifier = 0;
  let weightedBaseCompatibility = 0;
  let totalSkillBonus = 0;
  let compositeScore = 0;
  let compositeAtkBonus = 0;
  let compositeDefBonus = 0;
  let compositeInitBonus = 0;

  for (const t of terrainKeys) {
    const ratio = normalizedRatio[t];
    const comp = (matrix && matrix[t]) ? matrix[t] : (matrix ? matrix['通用'] : {
      rating: 'B' as const,
      ratingScore: 100,
      atkBonus: 0,
      defBonus: 0,
      initBonus: 0,
      tag: '普通適應',
      tagColor: '',
      summary: '',
      detailedEffect: ''
    });

    // 1. 地形基礎適性 (Base Compatibility)
    // 以 ratingScore / 100 為基準 (例如 125分 = 1.25)
    const baseCompatibility = Number((comp.ratingScore / 100).toFixed(4));

    // 2. 地形佔比加權基礎 = (地形基礎適性 * 地形佔比係數)
    const ratioWeightedBase = Number((baseCompatibility * ratio).toFixed(4));

    // 3. 陣型地形技能加成 = (陣型專精技能加成 + 武將地緣技能加成) * 地形佔比
    const formationSkillTrait = getFormationSpecialTerrainSkillBonus(formationName, t);
    const generalSkillTrait = getGeneralTerrainAffinityBonus(general, t, formationName);
    const skillBonus = Number(((formationSkillTrait + generalSkillTrait) * ratio).toFixed(4));

    // 4. 單一地形戰力修正 = (地形基礎適性 * 地形佔比係數) + 陣型地形技能加成
    const terrainCombatModifier = Number((ratioWeightedBase + skillBonus).toFixed(4));

    breakdowns[t] = {
      terrain: t,
      baseCompatibility,
      terrainRatio: Number(ratio.toFixed(4)),
      ratioWeightedBase,
      skillBonus,
      terrainCombatModifier,
      rating: comp.rating,
      ratingScore: comp.ratingScore,
      atkBonus: comp.atkBonus,
      defBonus: comp.defBonus,
      initBonus: comp.initBonus,
      tag: comp.tag
    };

    totalCombatModifier += terrainCombatModifier;
    weightedBaseCompatibility += ratioWeightedBase;
    totalSkillBonus += skillBonus;
    compositeScore += comp.ratingScore * ratio;
    compositeAtkBonus += comp.atkBonus * ratio;
    compositeDefBonus += comp.defBonus * ratio;
    compositeInitBonus += comp.initBonus * ratio;
  }

  // 納入陣型固有基礎攻防
  const baseAtkMod = formationInfo?.atkMod || 0;
  const baseDefMod = formationInfo?.defMod || 0;
  const baseInitMod = formationInfo?.initiativeMod || 0;

  const compositeAtkMod = Number((baseAtkMod + compositeAtkBonus).toFixed(4));
  const compositeDefMod = Number((baseDefMod + compositeDefBonus).toFixed(4));
  const compositeInitMod = Math.round(baseInitMod + compositeInitBonus);
  const finalScore = Math.round(compositeScore + (totalSkillBonus * 100));

  let compositeRating: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (finalScore >= 120) compositeRating = 'S';
  else if (finalScore >= 105) compositeRating = 'A';
  else if (finalScore >= 90) compositeRating = 'B';
  else if (finalScore >= 75) compositeRating = 'C';
  else compositeRating = 'D';

  const provinceDisplayName = province ? `${province.name} (${province.id}郡)` : '自訂戰場';
  const combatModPct = Math.round((totalCombatModifier - 1.0) * 100);
  const signStr = combatModPct >= 0 ? `+${combatModPct}%` : `${combatModPct}%`;

  const summary = `【${formationName}陣】在${provinceDisplayName}戰力修正為 ${totalCombatModifier.toFixed(3)} (${signStr})，綜合評級【${compositeRating}級 / ${finalScore}分】。`;

  return {
    formationName,
    provinceId: province?.id || null,
    provinceName: province?.name || '未知',
    totalCombatModifier: Number(totalCombatModifier.toFixed(4)),
    weightedBaseCompatibility: Number(weightedBaseCompatibility.toFixed(4)),
    totalSkillBonus: Number(totalSkillBonus.toFixed(4)),
    compositeAtkMod,
    compositeDefMod,
    compositeInitMod,
    compositeScore: finalScore,
    compositeRating,
    breakdowns,
    summary
  };
}

/**
 * 批次計算多個陣型在同一郡縣之戰力修正
 */
export function calculateBatchFormationCombatModifiers(
  formationNames: string[],
  provinceId: number,
  general?: { name?: string; str?: number; int?: number; hp?: number } | null
): Record<string, FormationTerrainCombatPowerResult> {
  const result: Record<string, FormationTerrainCombatPowerResult> = {};
  for (const f of formationNames) {
    result[f] = calculateFormationTerrainCombatModifier({
      formationName: f,
      provinceId,
      general
    });
  }
  return result;
}

/**
 * 評估最優陣型推薦
 */
export function getBestFormationForProvince(
  availableFormations: string[],
  provinceId: number,
  general?: { name?: string; str?: number; int?: number; hp?: number } | null
): { bestFormation: string; result: FormationTerrainCombatPowerResult } | null {
  if (!availableFormations || availableFormations.length === 0) return null;
  const batch = calculateBatchFormationCombatModifiers(availableFormations, provinceId, general);
  
  let bestName = availableFormations[0];
  let bestScore = -999;

  for (const name of availableFormations) {
    const res = batch[name];
    if (res && res.totalCombatModifier > bestScore) {
      bestScore = res.totalCombatModifier;
      bestName = name;
    }
  }

  return {
    bestFormation: bestName,
    result: batch[bestName]
  };
}
