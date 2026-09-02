export type FormationTerrainType = '平地' | '山嶽' | '水上' | '密林' | '通用';

export interface TerrainRatio {
  平地: number; // 0 ~ 100%
  水上: number; // 0 ~ 100%
  山嶽: number; // 0 ~ 100%
  密林: number; // 0 ~ 100%
}

export interface Formation {
  name: string;
  atkMod: number;
  defMod: number;
  terrain: string;
  initiativeMod: number;
  type?: string;
  atk?: number;
  def?: number;
  mobility?: number;
  bowAtk?: number;
  bowDef?: number;
  range?: number;
  special?: string;
  specialDesc?: string;
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
  terrain?: FormationTerrainType;
  terrainRatio?: TerrainRatio;
}

export interface BattleSkill {
  name: string;
  cost: number; // 體力消耗
  category: '特殊攻擊' | '計謀';
  desc: string;
  condition?: string;
  target?: '單體' | '相鄰' | '全體' | '自己';
}

export type PassiveSkillId = '沉著' | '反計' | '無雙' | '奮發' | '回射' | '騎射' | '藤甲';

export interface PassiveSkillDef {
  id: PassiveSkillId;
  name: string;
  category: '防禦被動' | '戰鬥被動' | '特種被動' | '被動';
  desc: string;
  triggerLabel?: string;
  triggerType?: string;
  iconSymbol?: string;
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
  passives?: PassiveSkillId[]; // 武將被動特技 (佈陣)
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
  morale?: number;
  weapons?: number;
  hasActed: boolean; // 本月是否已執行過任務
  rewardedThisMonth?: boolean; // 本月是否已接受過賞賜 (每人每月限一次)
  isWild?: boolean; // 是否為在野武將 (尚未被任何勢力登用)
  isCaptive?: boolean; // 是否為俘虜 (被關押在城池天牢)
  captiveOfRuler?: string | null; // 扣押該俘虜之君主
  capturedInProvinceId?: number | null; // 監禁之城池 ID
  hasRedHare?: boolean; // 是否擁有名馬/退路特技
  bio?: string;
  activeTask?: { type: string; turnsLeft: number } | null;
  formations?: string[]; // 持續性任務 (如建築關塞)
  skills?: string[]; // 習得戰鬥技能 (最多 8 個)
  passives?: PassiveSkillId[]; // 武將被動特技 (佈陣)
  stamina?: number; // 當前體力值 (預設 100)
}

export interface PendingBattlePlan {
  id: string;
  isDefense?: boolean;
  attackerRuler?: string;
  defenderRuler?: string;
  targetProvinceId: number;
  attackerProvinceId: number; // 主要發起進攻之城池
  attackerReinforceProvinceId?: number | null; // 攻擊方援軍城池 (最多1座)
  attackingGenerals: string[]; // 全部出征武將 (最多10人，前5人首發，後5人為備援)
  defendingGenerals: string[]; // 全部防守武將 (最多10人，守城5人+援軍最多5人)
  attackerStrategist?: string | null;
  defenderStrategist?: string | null;
  attackerGold: number;
  attackerFood: number;
  resourcesDeducted?: Record<number, { gold: number; food: number }>; // 各城池實際扣除的軍金與軍糧
  attackerGeneralOrigins?: Record<string, number>; // 出征武將歸屬城池 ID
  defenderPrimaryProvinceId?: number; // 守方主要被進攻城池
  defenderReinforceProvinceId?: number | null; // 守方援軍城池
  defenderGeneralOrigins?: Record<string, number>; // 守方武將歸屬城池 ID
  defenderResourcesDeducted?: Record<number, { gold: number; food: number }>; // 守方援軍城池扣除之金糧
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
  view: 'map' | 'battle' | 'troops' | 'status' | 'military_move' | 'battle_launch' | 'inspect';
  
  // Dynamic World Data
  provincesData: Record<number, ProvinceState>;
  generalsData: Record<string, GeneralState>;
  
  // Extra features
  activeBattle?: {
    isDefense?: boolean;
    attackerRuler?: string;
    defenderRuler?: string;
    targetProvinceId: number;
    attackerProvinceId: number;
    attackerReinforceProvinceId?: number | null;
    attackingGenerals: string[];
    defendingGenerals: string[];
    attackerStrategist?: string | null;
    defenderStrategist?: string | null;
    attackerGold: number;
    attackerFood: number;
    resourcesDeducted?: Record<number, { gold: number; food: number }>;
    attackerGeneralOrigins?: Record<string, number>;
    defenderPrimaryProvinceId?: number;
    defenderReinforceProvinceId?: number | null;
    defenderGeneralOrigins?: Record<string, number>;
    defenderResourcesDeducted?: Record<number, { gold: number; food: number }>;
  } | null;
  pendingBattles?: PendingBattlePlan[];
  pendingDefenses?: PendingBattlePlan[];
  pendingBattle?: PendingBattlePlan | null;
  diplomacyData?: Record<string, Record<string, number>>; // { rulerA: { rulerB: relationScore } }
  alliances?: Record<string, Record<string, number>>; // { rulerA: { rulerB: expiryAbsoluteMonth } }

  // Talent / Discovery logs or extra states
  wildGenerals?: string[]; // Names of discovered wild generals available for hiring
  pendingCaptives?: {
    generalName: string;
    capturedInProvinceId: number;
    winnerRuler: string;
    defeatedRuler: string;
    isEliminatedRuler?: boolean;
  }[];
  lastActionResult?: ActionResult | null;
  monthlyEvents?: string[]; // Log of events like disasters happened at the start of the month
  pendingRulerSuccession?: {
    executedRuler: string;
    killerRuler: string;
    candidates: string[];
  } | null;
  isGameOver?: boolean;
  gameOverReason?: string | null;
}

export interface ActionResult {
  action: string;
  title: string;
  message: string;
  type: 'talent_found' | 'gold_found' | 'nothing' | 'info' | 'success' | 'failure';
  detail?: any;
  actorGeneral?: string;
}

export type TerrainType = '平地' | '山丘' | '山嶽' | '樹林' | '淺水' | '深水' | '城池' | '關寨' | '太守府' | '沙漠' | '沼澤';

export interface GridCell {
  col: number;
  row: number;
  terrain: TerrainType;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'attack' | 'archery' | 'strategy' | 'passive' | 'info' | 'critical' | 'retreat' | 'event';
  timestamp: number;
}

export interface DamagePopup {
  id: string;
  col: number;
  row: number;
  text: string;
  color: 'red' | 'yellow' | 'blue' | 'purple' | 'green' | 'amber';
}

export type BattleUnitStatus = 'normal' | 'confused' | 'burning' | 'panicked' | 'moraled' | 'defending' | 'disarray';

export interface BattleUnit {
  id: string;
  generalName: string;
  isAttacker: boolean;
  troops: number;
  maxTroops?: number;
  col: number;
  row: number;
  isCommander: boolean;
  formation?: string;
  skills?: string[];
  passives?: PassiveSkillId[]; // 武將被動特技
  stamina?: number;
  morale?: number; // 士氣 (0 ~ 100)
  training?: number; // 訓練度 (0 ~ 100)
  status?: BattleUnitStatus; // 狀態：正常 / 混亂 / 著火 / 恐慌 / 鼓舞 / 防禦
  hasActed?: boolean; // 本日是否已行動
  hasMovedThisTurn?: boolean; // 本回合是否已移動 (每回合限移動一次)
  attackBuff?: number; // 夾擊激發之攻擊力加成 (如無雙激發)
}

export interface BattleState {
  provinceId: number;
  weather: '晴天' | '下雨' | '刮風' | '陰天';
  windDirection: '東風' | '南風' | '西風' | '北風';
  time: string;
  attacker: {
    commander: string;
    strategist?: string | null;
    gold: number;
    food: number;
  };
  defender: {
    commander: string;
    strategist?: string | null;
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
