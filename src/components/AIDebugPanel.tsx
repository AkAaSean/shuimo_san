import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, FactionAIDebugInfo, AIDecisionLogItem } from '../types';
import { computeFactionAIDebugInfo } from '../engine/gameLogic';
import { 
  Activity, 
  TrendingUp, 
  Coins, 
  Wheat, 
  ShieldAlert, 
  Users, 
  Landmark, 
  History, 
  Search, 
  Filter, 
  Compass, 
  Award,
  ChevronRight,
  Sparkles,
  BookOpen,
  X
} from 'lucide-react';

interface AIDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export default function AIDebugPanel({ isOpen, onClose, gameState }: AIDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'factions' | 'provinces' | 'logs' | 'rules'>('provinces');
  const [selectedRulerFilter, setSelectedRulerFilter] = useState<string>('全部');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fallback if aiTelemetry is missing in legacy save
  const factionsInfo: FactionAIDebugInfo[] = useMemo(() => {
    if (gameState.aiTelemetry && gameState.aiTelemetry.factions && gameState.aiTelemetry.factions.length > 0) {
      return gameState.aiTelemetry.factions;
    }
    return computeFactionAIDebugInfo(gameState, []);
  }, [gameState]);

  const recentLogs: AIDecisionLogItem[] = useMemo(() => {
    return gameState.aiTelemetry?.recentLogs || [];
  }, [gameState.aiTelemetry]);

  // List of all non-player rulers for filtering
  const rulerList = useMemo(() => {
    return Array.from(new Set(factionsInfo.map(f => f.rulerName)));
  }, [factionsInfo]);

  // Filtered provinces across factions
  const allProvinces = useMemo(() => {
    const list = factionsInfo.flatMap(f => f.provinces.map(p => ({ ...p, rulerName: f.rulerName, personality: f.personality })));
    return list.filter(p => {
      // Exclude player province unless viewing all or autonomous
      if (selectedRulerFilter !== '全部' && p.rulerName !== selectedRulerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchRuler = p.rulerName.toLowerCase().includes(q);
        const matchGen = p.generalsNames.some(g => g.toLowerCase().includes(q));
        if (!matchName && !matchRuler && !matchGen) return false;
      }
      return true;
    });
  }, [factionsInfo, selectedRulerFilter, searchQuery]);

  // Filtered decision logs
  const filteredLogs = useMemo(() => {
    return recentLogs.filter(log => {
      if (selectedRulerFilter !== '全部' && log.rulerName !== selectedRulerFilter) return false;
      if (actionTypeFilter !== '全部' && log.actionType !== actionTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchP = log.provinceName.toLowerCase().includes(q);
        const matchR = log.rulerName.toLowerCase().includes(q);
        const matchG = log.generalName ? log.generalName.toLowerCase().includes(q) : false;
        const matchD = log.detail.toLowerCase().includes(q);
        const matchGain = log.gainText.toLowerCase().includes(q);
        if (!matchP && !matchR && !matchG && !matchD && !matchGain) return false;
      }
      return true;
    });
  }, [recentLogs, selectedRulerFilter, actionTypeFilter, searchQuery]);

  // Action type options for chips
  const actionTypes = ['全部', '開墾土地', '繁榮商業', '整軍徵兵', '軍隊操演', '治水防汛', '賑濟百姓', '登用人才', '戰略調度', '軍糧輜重', '外交博弈', '謀略計策', '平糶平糴'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-serif">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#fbf8f2] border-2 border-stone-800 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-stone-900 text-stone-100 px-4 py-3 border-b-2 border-amber-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-700/80 border border-amber-400/40 flex items-center justify-center text-amber-200">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-amber-100">
                  電腦勢力 (AI) 內政與決策即時觀測儀
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-sans font-bold">
                  運行中 (即時遙測)
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {gameState.year} 年 {gameState.month} 月回合數據・即時監控敵對諸侯與自治郡縣之庫銀、屯糧、內政開發與決策軌跡
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer transition-colors"
            title="關閉觀測儀"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-stone-200/90 border-b border-stone-300 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('provinces')}
              className={`px-3 py-1 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'provinces'
                  ? 'bg-amber-800 text-amber-50 shadow-sm'
                  : 'text-stone-700 hover:bg-stone-300/80'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>城池內政進度 ({allProvinces.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-amber-800 text-amber-50 shadow-sm'
                  : 'text-stone-700 hover:bg-stone-300/80'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>實時決策隊列 ({filteredLogs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('factions')}
              className={`px-3 py-1 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'factions'
                  ? 'bg-amber-800 text-amber-50 shadow-sm'
                  : 'text-stone-700 hover:bg-stone-300/80'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>諸侯國策總覽 ({factionsInfo.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1 text-xs sm:text-sm font-bold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'bg-amber-800 text-amber-50 shadow-sm'
                  : 'text-stone-700 hover:bg-stone-300/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>AI決策機制說明</span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="搜尋城池、君主、武將..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded px-2.5 py-1 pl-7 text-xs text-stone-800 w-36 sm:w-48 focus:outline-none focus:border-amber-700 font-sans"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-2" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                清除
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Bar for Ruler & Action Types */}
        {(activeTab === 'provinces' || activeTab === 'logs') && (
          <div className="bg-[#f4efe4] border-b border-stone-200 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 text-stone-600 font-bold shrink-0">
              <Filter className="w-3 h-3" />
              <span>勢力篩選:</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setSelectedRulerFilter('全部')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  selectedRulerFilter === '全部'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                全部諸侯
              </button>
              {rulerList.map(ruler => {
                const isPlayer = ruler === gameState.rulerName;
                return (
                  <button
                    key={ruler}
                    onClick={() => setSelectedRulerFilter(ruler)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                      selectedRulerFilter === ruler
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    <span>{ruler}</span>
                    {isPlayer && <span className="text-[9px] text-amber-500">(自治)</span>}
                  </button>
                );
              })}
            </div>

            {activeTab === 'logs' && (
              <>
                <div className="h-3 w-px bg-stone-300 mx-1 hidden sm:block"></div>
                <div className="flex items-center gap-1 text-stone-600 font-bold shrink-0">
                  <span>行動類型:</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {actionTypes.map(at => (
                    <button
                      key={at}
                      onClick={() => setActionTypeFilter(at)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                        actionTypeFilter === at
                          ? 'bg-amber-900 text-amber-100'
                          : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                      }`}
                    >
                      {at}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#fbf8f2] space-y-4 custom-scrollbar">
          {/* TAB 1: PROVINCES TABLE / CARDS */}
          {activeTab === 'provinces' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                <span>顯示 {allProvinces.length} 座城池之內政發展、庫存資源與防務部署</span>
                <span className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded">
                  💡 提示：AI 具備「平糶平糴」調劑，糧草豐沛時將自動賣糧換金以維持每季土地與商業修築
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allProvinces.map(prov => {
                  const devPercent = Math.min(100, Math.round((prov.value / prov.maxDev) * 100));
                  const commPercent = Math.min(100, Math.round((prov.commerce / prov.maxCommerce) * 100));
                  const floodSafety = Math.max(0, Math.min(100, Math.round((1 - prov.flood / 200) * 100)));
                  const isPlayer = prov.rulerName === gameState.rulerName;

                  return (
                    <div
                      key={prov.id}
                      className="bg-white border border-stone-300 rounded-md p-3 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Top Ribbon */}
                      <div className="flex items-start justify-between border-b border-stone-200 pb-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-stone-900">{prov.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                prov.isFrontier
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                            >
                              {prov.isFrontier ? '前線要衝' : '後方腹地'}
                            </span>
                            <span className="text-xs text-stone-600">
                              君主: <strong className="text-stone-900">{prov.rulerName}</strong>
                              {isPlayer && <span className="text-[10px] text-amber-700 ml-1">(自主委任)</span>}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {prov.personality}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="flex items-center gap-0.5 text-amber-800 font-bold" title="城池庫銀">
                            <Coins className="w-3.5 h-3.5" />
                            <span>{prov.gold.toLocaleString()}</span>
                          </span>
                          <span className="flex items-center gap-0.5 text-emerald-800 font-bold" title="城池存糧">
                            <Wheat className="w-3.5 h-3.5" />
                            <span>{prov.food.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-1.5 text-xs mb-3">
                        {/* 土地開發 */}
                        <div>
                          <div className="flex justify-between items-center text-[11px] mb-0.5">
                            <span className="text-stone-600 font-medium">土地開發 (農桑):</span>
                            <span className="font-mono text-stone-800 font-bold">
                              {prov.value} / {prov.maxDev} ({devPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                              style={{ width: `${devPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* 商業繁榮 */}
                        <div>
                          <div className="flex justify-between items-center text-[11px] mb-0.5">
                            <span className="text-stone-600 font-medium">商業繁榮 (市肆):</span>
                            <span className="font-mono text-stone-800 font-bold">
                              {prov.commerce} / {prov.maxCommerce} ({commPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                            <div
                              className="h-full bg-amber-600 rounded-full transition-all duration-300"
                              style={{ width: `${commPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* 防汛與民心 */}
                        <div className="flex items-center justify-between text-[11px] pt-1 text-stone-600">
                          <span className="flex items-center gap-1">
                            <span>防汛水利安全率:</span>
                            <strong className={prov.flood > 50 ? 'text-red-700' : 'text-stone-800'}>
                              {floodSafety}% (積水 {prov.flood})
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>民心安定:</span>
                            <strong className="text-stone-800">{prov.loyalty} / 100</strong>
                          </span>
                        </div>
                      </div>

                      {/* Generals & Garrison */}
                      <div className="bg-stone-50 border border-stone-200/80 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-stone-600">
                            駐守將領 ({prov.generalsCount} 員):
                          </span>
                          <span className="font-mono font-bold text-stone-800">
                            總守備部隊: {prov.soldiers.toLocaleString()} 人
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prov.generalsNames.length > 0 ? (
                            prov.generalsNames.map(name => (
                              <span
                                key={name}
                                className="px-1.5 py-0.5 bg-stone-200/70 border border-stone-300 rounded text-[11px] text-stone-800 font-bold"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-400 italic text-[11px]">無將領駐守 (由地方基層官吏代管)</span>
                          )}
                        </div>

                        {/* Recent Actions in this city */}
                        {prov.recentActions.length > 0 && (
                          <div className="pt-1 border-t border-stone-200 mt-1">
                            <span className="text-[10px] text-stone-500 block mb-0.5">最近治國舉措:</span>
                            <div className="flex flex-wrap gap-1">
                              {prov.recentActions.map((act, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-900 border border-amber-300/80 rounded"
                                >
                                  {act}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DECISION LOGS / QUEUE */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600 px-1">
                <span>
                  共記錄 {filteredLogs.length} 筆電腦勢力內政與軍略執行日誌 (保留最近 150 筆)
                </span>
                <span className="text-[11px] text-stone-500">
                  按時間倒序排列（最新執行的行動列於最上方）
                </span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="bg-white border border-stone-300 rounded p-8 text-center text-stone-500">
                  <p className="text-sm font-bold text-stone-700">目前尚無符合條件的決策日誌</p>
                  <p className="text-xs mt-1">
                    只要點擊主畫面的「休息」前進至下個月份，電腦諸侯便會大展宏圖、自動執行內政並記錄於此！
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map(log => {
                    const getActionBadgeColor = (action: string) => {
                      if (action.includes('土地') || action.includes('開墾')) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
                      if (action.includes('商業') || action.includes('平糶')) return 'bg-amber-100 text-amber-900 border-amber-300';
                      if (action.includes('徵兵') || action.includes('整軍')) return 'bg-red-100 text-red-900 border-red-300';
                      if (action.includes('操演') || action.includes('訓練')) return 'bg-indigo-100 text-indigo-900 border-indigo-300';
                      if (action.includes('治水')) return 'bg-cyan-100 text-cyan-900 border-cyan-300';
                      if (action.includes('賑濟')) return 'bg-orange-100 text-orange-900 border-orange-300';
                      if (action.includes('人才') || action.includes('登用')) return 'bg-purple-100 text-purple-900 border-purple-300';
                      if (action.includes('調度')) return 'bg-blue-100 text-blue-900 border-blue-300';
                      if (action.includes('輜重') || action.includes('軍糧') || action.includes('輸送')) return 'bg-teal-100 text-teal-900 border-teal-300';
                      if (action.includes('外交')) return 'bg-sky-100 text-sky-900 border-sky-300';
                      if (action.includes('謀略') || action.includes('策反') || action.includes('流言') || action.includes('離間')) return 'bg-rose-100 text-rose-900 border-rose-300';
                      return 'bg-stone-100 text-stone-800 border-stone-300';
                    };

                    return (
                      <div
                        key={log.id}
                        className="bg-white border border-stone-300 rounded-md p-2.5 shadow-2xs hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-900">
                              {log.year}年{log.month}月
                            </span>
                            <span className="font-bold text-xs text-amber-950 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-300/80">
                              {log.rulerName}
                            </span>
                            <span className="text-xs font-semibold text-stone-700">
                              【{log.provinceName}】
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.2 rounded font-bold border ${getActionBadgeColor(log.actionType)}`}
                            >
                              {log.actionType}
                            </span>
                            {log.generalName && (
                              <span className="text-xs text-stone-600">
                                奉命大將: <strong className="text-stone-900">{log.generalName}</strong>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-700 font-serif leading-relaxed">
                            {log.detail}
                          </p>
                        </div>

                        {/* Outcomes / Gains */}
                        <div className="text-right shrink-0 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-stone-200">
                          <div className="text-xs font-bold text-emerald-800">
                            {log.gainText}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            {log.costGold > 0 && <span>金 -{log.costGold} </span>}
                            {log.costFood > 0 && <span>糧 -{log.costFood}</span>}
                            {log.costGold === 0 && log.costFood === 0 && <span>耗費: 官署常規開支</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FACTIONS OVERVIEW */}
          {activeTab === 'factions' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-600 px-1">
                各方勢力之國力存量、核心戰略方針與領土規模分析
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {factionsInfo.map(f => {
                  const isPlayer = f.rulerName === gameState.rulerName;
                  return (
                    <div
                      key={f.rulerName}
                      className="bg-white border border-stone-300 rounded-md p-3.5 shadow-xs hover:shadow-md transition-shadow space-y-2.5"
                    >
                      <div className="flex items-start justify-between border-b border-stone-200 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-stone-900">{f.rulerName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300 font-bold">
                              領地 {f.provincesCount} 郡
                            </span>
                            {isPlayer && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                                玩家大本營
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-900 font-bold mt-0.5">
                            {f.personality}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-stone-500 block">總動員兵力</span>
                          <span className="text-sm font-black font-mono text-stone-900">
                            {f.totalSoldiers.toLocaleString()} 人
                          </span>
                        </div>
                      </div>

                      {/* Strategic Posture */}
                      <div className="bg-stone-50 border border-stone-200/80 rounded p-2 text-xs text-stone-700">
                        <span className="font-bold text-stone-900 block mb-0.5">戰略姿態與軍民調度：</span>
                        <span>{f.posture}</span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded py-1.5">
                          <span className="text-[11px] text-amber-900 block">總國庫黃金</span>
                          <strong className="text-sm font-mono text-amber-800">{f.totalGold.toLocaleString()}</strong>
                        </div>
                        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded py-1.5">
                          <span className="text-[11px] text-emerald-900 block">總儲備米糧</span>
                          <strong className="text-sm font-mono text-emerald-800">{f.totalFood.toLocaleString()}</strong>
                        </div>
                        <div className="bg-stone-100 border border-stone-200 rounded py-1.5">
                          <span className="text-[11px] text-stone-700 block">麾下將領員額</span>
                          <strong className="text-sm font-mono text-stone-900">{f.totalGenerals} 員</strong>
                        </div>
                      </div>

                      {/* Territory Pills */}
                      <div className="text-xs">
                        <span className="text-stone-500 block mb-1">所轄城池明細：</span>
                        <div className="flex flex-wrap gap-1">
                          {f.provinces.map(p => (
                            <span
                              key={p.id}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                p.isFrontier
                                  ? 'bg-red-50 text-red-900 border-red-200'
                                  : 'bg-blue-50 text-blue-900 border-blue-200'
                              }`}
                            >
                              {p.name} ({p.value}/{p.maxDev})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: RULES EXPLANATION */}
          {activeTab === 'rules' && (
            <div className="bg-white border border-stone-300 rounded-md p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
              <div className="border-b border-stone-200 pb-3">
                <h3 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>水墨三國：電腦勢力 (AI) 內政與戰略決策核心機制</span>
                </h3>
                <p className="text-xs text-stone-500">
                  徹底告別「黑盒子」，深入了解電腦如何根據性格、資源、文武將領與前線威脅制定每月的發展計畫。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-700" />
                    <span>1. 財政平糶調劑機制 (平糶平糴)</span>
                  </h4>
                  <p className="text-xs text-stone-600">
                    歷史上諸侯往往糧多而錢少。當城中糧草豐沛（儲糧大於 3,000 石）但庫銀低於 250 兩時，AI 會自動平糶適量糧草以充裕內政預算，確保每個月都有充足資金用於土地拓墾與商業繁榮，不再因為資金短缺而陷入停滯。
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>2. 文官政務與武將整軍分流</span>
                  </h4>
                  <p className="text-xs text-stone-600">
                    AI 每月會先指派政治 (POL) 與智力 (INT) 卓越的謀臣文官優先督辦農桑、商埠與治水；武將則負責整軍徵兵與全城部隊操演。若武將置身後方腹地，亦會協助主持軍屯農荒，實現全郡全將無閒置之效。
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-700" />
                    <span>3. 前線要衝與後方腹地動態調度</span>
                  </h4>
                  <p className="text-xs text-stone-600">
                    AI 戰略調度層會動態檢測城池鄰國威脅。面臨敵軍重兵壓境的前線要衝，AI 會主動從後方富餘城市調動勇將馳援防務；並設定較高的目標兵力上限，將後方城市轉型為屯糧重鎮。
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-md p-3.5 space-y-1.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-700" />
                    <span>4. 個性化歷史特質偏好</span>
                  </h4>
                  <p className="text-xs text-stone-600">
                    曹操深諳許下屯田與通商之術，注重農商均衡與名將招攬；孫氏政權立足江東水利，市集商運格外蓬勃；劉備勤求民心與農桑根本，開倉賑民機率更高；董卓與呂布則更重視募兵帶甲。
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs text-stone-700">
                <strong className="text-amber-950 block mb-1">🔍 偵錯與觀察建議：</strong>
                <span>
                  您可以切換至「實時決策隊列」分頁，點擊右上角「休息」讓遊戲運轉 1~3 個月份。您會看見曹操、袁紹、孫堅等勢力大舉開墾土地、平糶換銀、招兵買馬與調度大將的詳細軌跡！
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-200 border-t border-stone-300 px-4 py-2.5 flex items-center justify-between text-xs text-stone-600 shrink-0">
          <div className="flex items-center gap-2">
            <span>當前視圖: {activeTab === 'provinces' ? '城池內政表' : activeTab === 'logs' ? '決策日誌隊列' : activeTab === 'factions' ? '諸侯國策' : '機制說明'}</span>
            <span className="text-stone-400">|</span>
            <span>遙測資料點: {allProvinces.length} 城 / {recentLogs.length} 條行動</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-stone-800 hover:bg-stone-900 text-stone-100 rounded font-bold cursor-pointer transition-colors shadow-xs"
          >
            關閉檢視器
          </button>
        </div>
      </motion.div>
    </div>
  );
}
