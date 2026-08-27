export type FormationType = "平地" | "山嶽" | "水上";

export interface Formation {
  name: string;
  atk: number;
  def: number;
  bowAtk: number;
  bowDef: number;
  range: number;
  mobility: number;
  type: FormationType;
  special: string;
}

export interface Province {
  id: number;
  name: string;
  region: string;
  desc: string;
  connections: number[];
  x: number;
  y: number;
  floodGrowthRate: number;
}

export interface BattleSkill {
  name: string;
  cost: number; // 體力消耗 (0 代表常駐被動)
  category: '主動戰法' | '謀略計策' | '天候奇術' | '輔助回復' | '特種被動' | '防禦被動' | '戰鬥被動';
  desc: string;
  condition?: string;
  target?: '自身' | '相鄰友軍' | '全體友軍' | '目標敵軍' | '範圍敵軍' | '全戰場' | '被動';
}

export type PassiveSkillId = '沉著' | '反計' | '無雙' | '奮發' | '回射' | '騎射' | '藤甲';

export interface PassiveSkillDef {
  id: PassiveSkillId;
  name: string;
  category: '防禦被動' | '戰鬥被動' | '特種被動';
  desc: string;
  triggerLabel: string;
  triggerType: 'turn_start' | 'melee_attack' | 'melee_defense' | 'archery_attack' | 'archery_defense' | 'strategy_targeted';
  iconSymbol: string;
}

export interface General {
  name: string;
  role: string;
  maxTroops: number;
  hp: number;
  int: number; // 謀略
  str: number; // 戰力
  pol: number; // 政治
  cha: number; // 魅力
  ambition?: number; // 野心 (0 ~ 10，不於UI顯示)
  scenarios: (number | '主' | 'Ｘ' | '-')[];
  formations?: string[];
  skills?: string[];
  passives?: PassiveSkillId[]; // 武將被動特技 (沉著、反計、無雙、奮發、回射、騎射、藤甲)
}

export interface ProvinceState {
  id: number;
  rulerName: string | null;
  gold: number;
  food: number;
  population: number;
  soldiers: number;
  value: number; // 土地價值 / 農業開發度
  commerce?: number; // 商業發展度
  flood: number; // 洪水率 / 防災度
  loyalty: number; // 民眾忠誠
  price: number; // 物價
  forts: { x: number, y: number }[]; // 關寨座標
  training?: number; // 訓練度 (0 ~ 100)
  underConstructionFort?: { x: number; y: number; turnsLeft: number; builderName: string } | null;
  isAutonomous?: boolean; // 郡縣自治標記
  hasDraftedThisMonth?: boolean; // 本月是否已執行過徵兵 (每城每月限一次)
}

export interface GeneralState {
  name: string;
  role: string;
  maxTroops: number;
  hp: number;
  int: number; // 謀略
  str: number; // 戰力
  pol: number; // 政治
  cha: number; // 魅力
  ambition?: number; // 野心 (0 ~ 10，不於UI顯示)
  loyalty: number;
  provinceId: number | null;
  isRuler: boolean;
  soldiers: number;
  training: number;
  weapons?: number;
  hasActed: boolean; // 本月是否已執行過任務
  rewardedThisMonth?: boolean; // 本月是否已接受過賞賜 (每人每月限一次)
  isWild?: boolean; // 是否為在野武將 (尚未被任何勢力登用)
  bio?: string;
  activeTask?: { type: string; turnsLeft: number } | null;
  formations?: string[]; // 持續性任務 (如建築關塞)
  skills?: string[]; // 習得戰鬥技能 (最多 8 個)
  passives?: PassiveSkillId[]; // 武將被動特技 (沉著、反計、無雙、奮發、回射、騎射、藤甲)
  stamina?: number; // 當前體力值 (預設 100)
}

export interface PendingBattlePlan {
  id: string;
  targetProvinceId: number;
  attackerProvinceId: number;
  attackingGenerals: string[];
  defendingGenerals: string[];
  attackerGold: number;
  attackerFood: number;
  resourcesDeducted?: Record<number, { gold: number; food: number }>;
}

export interface GameState {
  currentScenario: number;
  year: number;
  month: number;
  season: string;
  rulerName: string; // Player's chosen ruler
  popularity: number;
  gold: number;
  food: number;
  selectedProvinceId: number | null;
  activeMenu: number | null;
  view: 'map' | 'battle' | 'build_fort' | 'troops' | 'status' | 'military_move' | 'battle_launch' | 'inspect';
  
  // Dynamic World Data
  provincesData: Record<number, ProvinceState>;
  generalsData: Record<string, GeneralState>;
  
  // Extra features
  activeBattle?: {
    targetProvinceId: number;
    attackerProvinceId: number;
    attackingGenerals: string[];
    defendingGenerals: string[];
    attackerGold: number;
    attackerFood: number;
  } | null;
  pendingBattles?: PendingBattlePlan[];
  pendingBattle?: PendingBattlePlan | null;
  diplomacyData?: Record<string, Record<string, number>>; // { rulerA: { rulerB: relationScore } }
  alliances?: Record<string, Record<string, number>>; // { rulerA: { rulerB: expiryAbsoluteMonth } }

  // Talent / Discovery logs or extra states
  wildGenerals?: string[]; // Names of discovered wild generals available for hiring
  lastActionResult?: ActionResult | null;
  monthlyEvents?: string[]; // Log of events like disasters happened at the start of the month
}

export interface ActionResult {
  action: string;
  title: string;
  message: string;
  type: 'talent_found' | 'gold_found' | 'nothing' | 'info' | 'success' | 'failure';
  detail?: any;
  actorGeneral?: string;
}

export type TerrainType = '平地' | '山丘' | '山嶽' | '樹林' | '淺水' | '深水' | '城池' | '關寨' | '沙漠' | '沼澤';

export interface GridCell {
  col: number;
  row: number;
  terrain: TerrainType;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'attack' | 'archery' | 'strategy' | 'passive' | 'info' | 'critical' | 'retreat';
  timestamp: number;
}

export interface DamagePopup {
  id: string;
  col: number;
  row: number;
  text: string;
  color: 'red' | 'yellow' | 'blue' | 'purple' | 'green' | 'amber';
}

export interface BattleUnit {
  id: string;
  generalName: string;
  isAttacker: boolean;
  troops: number;
  col: number;
  row: number;
  isCommander: boolean;
  formation?: string;
  skills?: string[];
  passives?: PassiveSkillId[]; // 武將被動特技
  stamina?: number;
  status?: 'normal' | 'confused' | 'disarray'; // 狀態：正常 / 混亂 / 無陣
  hasActed?: boolean; // 本日是否已行動
  attackBuff?: number; // 夾擊激發之攻擊力加成 (如無雙激發)
}

export interface BattleState {
  provinceId: number;
  weather: '晴天' | '下雨' | '刮風' | '陰天';
  windDirection: '東風' | '南風' | '西風' | '北風';
  time: string;
  attacker: {
    commander: string;
    gold: number;
    food: number;
  };
  defender: {
    commander: string;
    gold: number;
    food: number;
  };
  grid: GridCell[];
  units: BattleUnit[];
  activeUnitId: string | null;
  currentDay: number;
  maxDays: number;
  animatingStrategy: { type: string, col: number, row: number } | null;
  battleLogs?: CombatLogEntry[];
  damagePopups?: DamagePopup[];
}
