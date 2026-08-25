import React, { useState, useMemo } from 'react';
import { GameState, GeneralState } from '../types';
import { provinces } from '../data/provinces';
import { SCENARIOS } from '../data/scenarios';
import { PROVINCE_BASE_CONFIGS } from '../data/provinceBaseConfig';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';
import { TREASURE_ITEMS, TreasureItem, getGeneralItemBonus } from '../data/items';
import { getEstimatedAnnualGold, getEstimatedAnnualFood, getEstimatedMonthlyFoodConsumption } from '../engine/gameLogic';

interface InspectViewProps {
  gameState: GameState;
  initialTab?: string;
  onExit: () => void;
  onSelectProvinceOnMap?: (provinceId: number) => void;
}

const TABS = [
  { key: '選擇州郡', label: '選擇州郡' },
  { key: '將軍列表', label: '將軍列表' },
  { key: '領土列表', label: '領土列表' },
  { key: '郡地理誌', label: '郡地理誌' },
  { key: '君主物品', label: '君主物品' },
];

export default function InspectView({
  gameState,
  initialTab = '選擇州郡',
  onExit,
  onSelectProvinceOnMap,
}: InspectViewProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // 1. 選擇州郡 Tab State
  const [inspectProvinceId, setInspectProvinceId] = useState<number>(
    gameState.selectedProvinceId || 15 // 預設洛陽或玩家選取的郡
  );
  const [provinceRegionFilter, setProvinceRegionFilter] = useState<string>('全部');

  // 2. 將軍列表 Tab State
  const [generalSearch, setGeneralSearch] = useState<string>('');
  const [generalRulerFilter, setGeneralRulerFilter] = useState<string>('全部');
  const [generalRoleFilter, setGeneralRoleFilter] = useState<string>('全部');
  const [generalSortKey, setGeneralSortKey] = useState<'str' | 'int' | 'pol' | 'cha' | 'soldiers' | 'loyalty' | 'hp'>('hp');
  const [selectedGeneralDetail, setSelectedGeneralDetail] = useState<GeneralState | null>(null);

  // 3. 領土列表 Tab State
  const [selectedRulerDetail, setSelectedRulerDetail] = useState<string | null>(null);

  // 4. 郡地理誌 Tab State
  const [selectedGeoRegion, setSelectedGeoRegion] = useState<string>('司隸中原');

  // 5. 君主物品 Tab State
  const [treasureCategoryFilter, setTreasureCategoryFilter] = useState<string>('全部');

  // ─── 數據運算 (Memoized Computations) ───

  // 當前選取的州郡實時資訊
  const currentInspectProvince = useMemo(() => {
    const pMeta = provinces.find(p => p.id === inspectProvinceId) || provinces[0];
    const pState = gameState.provincesData[inspectProvinceId] || {
      id: inspectProvinceId,
      rulerName: null,
      gold: 0,
      food: 0,
      population: 0,
      soldiers: 0,
      value: 50,
      flood: 50,
      loyalty: 80,
      price: 10,
      forts: []
    };
    const baseConfig = PROVINCE_BASE_CONFIGS[inspectProvinceId];
    const generalsInProvince = Object.values(gameState.generalsData).filter(
      g => g.provinceId === inspectProvinceId && !g.isWild
    );
    const connectedProvinces = pMeta.connections.map(cid => {
      const cMeta = provinces.find(p => p.id === cid);
      const cState = gameState.provincesData[cid];
      return {
        id: cid,
        name: cMeta?.name || `郡${cid}`,
        rulerName: cState?.rulerName || '空白',
        soldiers: cState?.soldiers || 0
      };
    });

    return {
      meta: pMeta,
      state: pState,
      baseConfig,
      generals: generalsInProvince,
      connections: connectedProvinces
    };
  }, [inspectProvinceId, gameState]);

  // 所有武將清單與過濾排序
  const filteredGenerals = useMemo(() => {
    let list = Object.values(gameState.generalsData);

    if (generalSearch.trim()) {
      const q = generalSearch.trim().toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(q));
    }

    if (generalRulerFilter !== '全部') {
      if (generalRulerFilter === '自軍') {
        list = list.filter(g => {
          if (!g.provinceId) return false;
          const p = gameState.provincesData[g.provinceId];
          return p && p.rulerName === gameState.rulerName;
        });
      } else if (generalRulerFilter === '在野') {
        list = list.filter(g => g.isWild);
      } else {
        list = list.filter(g => {
          if (!g.provinceId) return false;
          const p = gameState.provincesData[g.provinceId];
          return p && p.rulerName === generalRulerFilter;
        });
      }
    }

    if (generalRoleFilter !== '全部') {
      list = list.filter(g => (g.isRuler ? '君主' : g.role) === generalRoleFilter);
    }

    return list.sort((a, b) => {
      return (b[generalSortKey] || 0) - (a[generalSortKey] || 0);
    });
  }, [gameState, generalSearch, generalRulerFilter, generalRoleFilter, generalSortKey]);

  // 全國君主與勢力統計 (Factions Analytics)
  const factionsList = useMemo(() => {
    const scenario = SCENARIOS[gameState.currentScenario];
    if (!scenario) return [];

    return scenario.rulers.map(ruler => {
      const rulerProvinces = Object.values(gameState.provincesData).filter(
        p => p.rulerName === ruler.name
      );
      const rulerGenerals = Object.values(gameState.generalsData).filter(g => {
        if (!g.provinceId) return false;
        const p = gameState.provincesData[g.provinceId];
        return p && p.rulerName === ruler.name;
      });

      const totalGold = rulerProvinces.reduce((sum, p) => sum + p.gold, 0);
      const totalFood = rulerProvinces.reduce((sum, p) => sum + p.food, 0);
      const totalPopulation = rulerProvinces.reduce((sum, p) => sum + p.population, 0);
      const totalReserveTroops = rulerProvinces.reduce((sum, p) => sum + p.soldiers, 0);
      const totalGeneralTroops = rulerGenerals.reduce((sum, g) => sum + g.soldiers, 0);
      const totalMilitary = totalReserveTroops + totalGeneralTroops;

      // 找尋首都/大本營 (君主所在都市)
      const rulerGeneral = rulerGenerals.find(g => g.name === ruler.name && g.isRuler);
      const capitalProvinceId = rulerGeneral?.provinceId || (rulerProvinces[0]?.id ?? null);
      const capitalMeta = provinces.find(p => p.id === capitalProvinceId);

      // 前三大猛將 / 軍師
      const topGenerals = [...rulerGenerals]
        .sort((a, b) => (b.str + b.int) - (a.str + a.int))
        .slice(0, 3);

      // 勢力評級
      let rank = 'C';
      if (totalMilitary > 150000 || rulerProvinces.length >= 12) rank = 'S';
      else if (totalMilitary > 80000 || rulerProvinces.length >= 6) rank = 'A';
      else if (totalMilitary > 30000 || rulerProvinces.length >= 3) rank = 'B';
      else if (totalMilitary > 10000) rank = 'C';
      else rank = 'D';

      return {
        rulerName: ruler.name,
        isPlayer: ruler.name === gameState.rulerName,
        provincesCount: rulerProvinces.length,
        provinces: rulerProvinces.map(p => {
          const meta = provinces.find(item => item.id === p.id);
          return { id: p.id, name: meta?.name || `郡${p.id}`, isAutonomous: !!p.isAutonomous };
        }),
        capitalName: capitalMeta?.name || '未知',
        capitalId: capitalProvinceId,
        generalsCount: rulerGenerals.length,
        totalGold,
        totalFood,
        totalPopulation,
        totalReserveTroops,
        totalGeneralTroops,
        totalMilitary,
        rank,
        topGenerals
      };
    }).sort((a, b) => b.totalMilitary - a.totalMilitary);
  }, [gameState]);

  // 地理誌分區
  const GEO_REGIONS = [
    { name: '司隸中原', desc: '天下腹心，洛陽長安兩京帝都所在，四通八達，爭霸必經之地。', pIds: [14, 15, 16, 11, 12, 13, 6] },
    { name: '河北幽並', desc: '沃野千里，民殷兵強，幽燕鐵騎與冀州糧倉，根基雄厚。', pIds: [1, 2, 3, 4, 5] },
    { name: '青徐海岱', desc: '東臨大海，魚鹽之利，水陸要衝，兵家必爭。', pIds: [7, 8, 9, 10] },
    { name: '江東揚州', desc: '長江天塹，水網縱橫，沃野江南，物產豐饒。', pIds: [21, 22, 23, 24, 25, 26] },
    { name: '荊楚九郡', desc: '九省通衢，北控中原，南通嶺南，漢沔重鎮。', pIds: [27, 28, 29, 30, 31, 32, 33] },
    { name: '巴蜀益州', desc: '天府之國，山川險固，沃野千里，易守難攻。', pIds: [35, 36, 37, 38, 39, 40, 43] },
    { name: '西北涼州', desc: '西陲邊塞，西涼鐵騎，胡漢咽喉，地廣人稀。', pIds: [17, 18, 19, 20] },
    { name: '嶺南交州', desc: '極南邊陲，山林密布，氣候溫熱，偏安之所。', pIds: [34, 41, 42] },
  ];

  // 寶物清單過濾
  const filteredTreasures = useMemo(() => {
    let list = TREASURE_ITEMS;
    if (treasureCategoryFilter !== '全部') {
      list = list.filter(t => t.category === treasureCategoryFilter);
    }
    return list;
  }, [treasureCategoryFilter]);

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden select-none animate-fade-in">
      {/* ── Top App Bar ── */}
      <div className="p-3 bg-[#292524] text-amber-100 border-b-2 border-amber-500/40 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse"></span>
          <span className="font-black text-lg tracking-wider text-amber-200">◆ 天下情報．查看 ◆</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1 bg-stone-800 text-stone-200 border border-stone-600 rounded text-xs font-bold hover:bg-stone-700 active:scale-95 transition-transform"
        >
          返回大地圖
        </button>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="flex bg-[#d6d0c4] border-b-2 border-[#1c1917] overflow-x-auto no-scrollbar shadow-inner">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[72px] py-2.5 text-xs md:text-sm font-black text-center transition-all border-r border-stone-400/50 last:border-r-0 relative
                ${isActive
                  ? 'bg-[#7f1d1d] text-amber-100 shadow-[inset_0_-2px_0_#f59e0b]'
                  : 'text-stone-700 hover:bg-stone-300 active:bg-stone-400'
                }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#f4f1ea]">

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1: 選擇州郡 (Inspect Province Intel)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '選擇州郡' && (
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            {/* Quick Province Picker Bar */}
            <div className="bg-white border-2 border-[#1c1917] p-2.5 rounded shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">快速切換郡縣：</span>
                <div className="flex gap-1 overflow-x-auto max-w-[280px] no-scrollbar">
                  {['全部', '司隸', '幽州', '冀州', '青州', '徐州', '兗州', '豫州', '揚州', '荊州', '益州', '涼州', '交州'].map(r => (
                    <button
                      key={r}
                      onClick={() => setProvinceRegionFilter(r)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition-colors whitespace-nowrap
                        ${provinceRegionFilter === r ? 'bg-stone-800 text-amber-200 border-stone-900' : 'bg-stone-100 text-stone-600 border-stone-300'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Province Select Dropdown */}
              <div className="flex gap-2 items-center">
                <select
                  value={inspectProvinceId}
                  onChange={(e) => setInspectProvinceId(Number(e.target.value))}
                  className="flex-1 p-1.5 text-sm font-black bg-stone-100 border border-stone-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-600"
                >
                  {provinces
                    .filter(p => provinceRegionFilter === '全部' || p.region === provinceRegionFilter)
                    .map(p => {
                      const pState = gameState.provincesData[p.id];
                      const rulerTag = pState?.rulerName ? `[${pState.rulerName}]` : '[空白]';
                      const autoTag = pState?.isAutonomous ? ' [自治]' : '';
                      return (
                        <option key={p.id} value={p.id}>
                          {p.id.toString().padStart(2, '0')}. {p.name} ({p.region}) {rulerTag}{autoTag}
                        </option>
                      );
                    })}
                </select>

                {onSelectProvinceOnMap && (
                  <button
                    onClick={() => {
                      onSelectProvinceOnMap(inspectProvinceId);
                      onExit();
                    }}
                    className="px-2.5 py-1.5 bg-[#991b1b] text-white text-xs font-black rounded shadow active:scale-95 transition-transform shrink-0"
                  >
                    定位此郡
                  </button>
                )}
              </div>
            </div>

            {/* Province Intel Card */}
            <div className="bg-white border-2 border-[#1c1917] rounded shadow-[3px_3px_0_#1c1917] p-4 flex flex-col gap-3">
              {/* Province Title Header */}
              <div className="flex justify-between items-start border-b-2 border-[#1c1917] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-[#1c1917]">
                      {currentInspectProvince.meta.name}
                    </h2>
                    <span className="text-xs bg-stone-800 text-amber-200 px-2 py-0.5 rounded font-bold">
                      {currentInspectProvince.meta.region}
                    </span>
                    {(() => {
                      const tierRules = getProvinceTierRules(inspectProvinceId);
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border
                          ${tierRules.tier === 'METROPOLIS' ? 'bg-amber-100 text-amber-900 border-amber-400' :
                            tierRules.tier === 'COMMERCIAL' ? 'bg-sky-100 text-sky-900 border-sky-400' :
                            tierRules.tier === 'AGRICULTURAL' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' :
                            tierRules.tier === 'MIDSIZED' ? 'bg-stone-200 text-stone-800 border-stone-400' :
                            'bg-purple-100 text-purple-900 border-purple-300'}`}
                        >
                          {tierRules.tierName}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {currentInspectProvince.meta.desc}
                  </div>
                  <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                    【定位】{getProvinceTierRules(inspectProvinceId).desc}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-stone-500 font-bold">統治勢力</div>
                  <div className="text-base font-black text-[#991b1b]">
                    {currentInspectProvince.state.rulerName ? `【${currentInspectProvince.state.rulerName}】` : '無主空城'}
                    {currentInspectProvince.state.isAutonomous && currentInspectProvince.state.rulerName === gameState.rulerName && (
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded ml-1 align-middle">自治</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Core Economy & Population Grid */}
              <div className="grid grid-cols-4 gap-2 bg-[#fbf9f5] border border-stone-300 p-2.5 rounded text-center">
                <div className="border-r border-stone-200">
                  <div className="text-[10px] text-stone-500 font-bold">人口</div>
                  <div className="text-xs font-black text-stone-800">
                    {(currentInspectProvince.state.population / 10000).toFixed(1)}萬
                  </div>
                </div>
                <div className="border-r border-stone-200 flex flex-col justify-center">
                  <div className="text-[10px] text-stone-500 font-bold">國庫金</div>
                  <div className="text-xs font-black text-amber-700">
                    {currentInspectProvince.state.gold.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-amber-600 mt-0.5">
                    +{getEstimatedAnnualGold(currentInspectProvince.state).toLocaleString()}/年
                  </div>
                </div>
                <div className="border-r border-stone-200 flex flex-col justify-center">
                  <div className="text-[10px] text-stone-500 font-bold">兵糧石</div>
                  <div className="text-xs font-black text-emerald-800">
                    {currentInspectProvince.state.food.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-emerald-600 mt-0.5">
                    +{getEstimatedAnnualFood(currentInspectProvince.state).toLocaleString()}/年
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-[10px] text-stone-500 font-bold">軍糧消耗</div>
                  <div className="text-xs font-black text-rose-700">
                    -{getEstimatedMonthlyFoodConsumption(currentInspectProvince.state, Object.values(gameState.generalsData)).toLocaleString()}/月
                  </div>
                  <div className="text-[9px] text-stone-500 mt-0.5 font-bold">全郡總駐軍</div>
                  <div className="text-[9px] font-bold text-stone-800">
                    {((currentInspectProvince.state.soldiers || 0) +
                      currentInspectProvince.generals.reduce((sum, g) => sum + (g.soldiers || 0), 0)
                    ).toLocaleString()}人
                  </div>
                </div>
              </div>

              {/* Public Support & Administration */}
              {(() => {
                const tierRules = getProvinceTierRules(inspectProvinceId);
                return (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-stone-50 p-2 border border-stone-200 rounded flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 font-bold">土地開發度</span>
                        <span className="font-black text-amber-800">{currentInspectProvince.state.value} / {tierRules.maxDev}</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round((currentInspectProvince.state.value / tierRules.maxDev) * 100))}%` }} />
                      </div>
                    </div>

                    <div className="bg-stone-50 p-2 border border-stone-200 rounded flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 font-bold">商業發展度</span>
                        <span className="font-black text-sky-800">{currentInspectProvince.state.commerce || 0} / {tierRules.maxCommerce}</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-sky-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.round(((currentInspectProvince.state.commerce || 0) / tierRules.maxCommerce) * 100))}%` }} />
                      </div>
                    </div>

                    <div className="bg-stone-50 p-2 border border-stone-200 rounded flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 font-bold">防災程度</span>
                        <span className="font-black text-blue-800">{100 - currentInspectProvince.state.flood}%</span>
                      </div>
                      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${100 - currentInspectProvince.state.flood}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-stone-50 p-2 border border-stone-200 rounded">
                      <span className="text-stone-500 font-bold">民眾忠誠度</span>
                      <span className="font-black text-stone-800">{currentInspectProvince.state.loyalty} / 100</span>
                    </div>
                  </div>
                );
              })()}

              {/* Fortifications */}
              <div className="bg-stone-50 border border-stone-200 p-2 rounded flex justify-between items-center text-xs">
                <span className="font-bold text-stone-600">已建築關寨</span>
                <span className="font-black text-[#1c1917]">
                  {currentInspectProvince.state.forts?.length || 0} 座關隘防禦設施
                  {currentInspectProvince.state.underConstructionFort && ' (1 座興建中)'}
                </span>
              </div>

              {/* Generals Stationed in this Province */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-stone-700">
                    駐守將領 ({currentInspectProvince.generals.length} 名)
                  </span>
                  <span className="text-[10px] text-stone-400">點擊查看詳情</span>
                </div>

                {currentInspectProvince.generals.length === 0 ? (
                  <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 border border-dashed border-stone-300 rounded">
                    本郡目前無駐守武將
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {currentInspectProvince.generals.map(g => {
                      const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                      return (
                        <div
                          key={g.name}
                          onClick={() => setSelectedGeneralDetail(g)}
                          className="p-2 bg-stone-100 hover:bg-amber-50 border border-stone-300 rounded flex justify-between items-center cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-1 py-0.5 rounded font-bold
                              ${g.isRuler ? 'bg-[#991b1b] text-white' : 'bg-stone-700 text-stone-100'}`}
                            >
                              {g.isRuler ? '君主' : g.role}
                            </span>
                            <span className="text-xs font-black">{g.name}</span>
                            {itemBonus.items.length > 0 && (
                              <span className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1 rounded">
                                寶
                              </span>
                            )}
                          </div>
                          <div className="text-right text-[10px]">
                            <span className="font-bold text-red-700">{g.soldiers}兵</span>
                            <span className="text-stone-500 ml-1.5">
                              武{g.str}{itemBonus.strBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.strBonus}</strong>} 智{g.int}{itemBonus.intBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.intBonus}</strong>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Connected Adjacent Provinces */}
              <div className="border-t border-stone-200 pt-2 flex flex-col gap-1.5">
                <span className="text-xs font-black text-stone-700">相鄰路線連通都市 (可進軍/調兵/運送)：</span>
                <div className="flex flex-wrap gap-1.5">
                  {currentInspectProvince.connections.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setInspectProvinceId(c.id)}
                      className="px-2 py-1 bg-stone-200 hover:bg-amber-200 border border-stone-400 rounded text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-stone-500 font-normal">
                        ({c.rulerName})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2: 將軍列表 (Nationwide & Faction Generals Roster)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '將軍列表' && (
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            {/* Search & Filter Controls */}
            <div className="bg-white border-2 border-[#1c1917] p-3 rounded shadow-sm flex flex-col gap-2.5 text-xs">
              {/* Search Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="搜尋武將姓名..."
                  value={generalSearch}
                  onChange={(e) => setGeneralSearch(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-stone-100 border border-stone-300 rounded font-bold focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
                {generalSearch && (
                  <button
                    onClick={() => setGeneralSearch('')}
                    className="px-2 py-1 text-stone-400 hover:text-stone-700 font-bold"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* Faction and Role Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-1">所屬勢力：</label>
                  <select
                    value={generalRulerFilter}
                    onChange={(e) => setGeneralRulerFilter(e.target.value)}
                    className="w-full p-1 bg-stone-100 border border-stone-300 rounded font-bold"
                  >
                    <option value="全部">全部勢力</option>
                    <option value="自軍">自軍 (【{gameState.rulerName}】)</option>
                    {SCENARIOS[gameState.currentScenario]?.rulers.map(r => (
                      <option key={r.name} value={r.name}>{r.name} 陣營</option>
                    ))}
                    <option value="在野">在野隱士</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-stone-500 font-bold block mb-1">職級身份：</label>
                  <select
                    value={generalRoleFilter}
                    onChange={(e) => setGeneralRoleFilter(e.target.value)}
                    className="w-full p-1 bg-stone-100 border border-stone-300 rounded font-bold"
                  >
                    <option value="全部">全部職級</option>
                    <option value="君主">君主</option>
                    <option value="大將">大將</option>
                    <option value="軍師">軍師</option>
                    <option value="副將">副將</option>
                    <option value="參軍">參軍</option>
                    <option value="裨將">裨將</option>
                    <option value="牙將">牙將</option>
                    <option value="主簿">主簿</option>
                    <option value="謀士">謀士</option>
                  </select>
                </div>
              </div>

              {/* Sort Bar */}
              <div>
                <label className="text-[10px] text-stone-500 font-bold block mb-1">數值排序：</label>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { key: 'hp', label: '統帥' },
                    { key: 'str', label: '戰力' },
                    { key: 'int', label: '謀略' },
                    { key: 'pol', label: '政治' },
                    { key: 'cha', label: '魅力' },
                    { key: 'soldiers', label: '兵士' },
                    { key: 'loyalty', label: '忠誠' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setGeneralSortKey(s.key as any)}
                      className={`text-xs px-2 py-1 rounded font-bold border transition-colors whitespace-nowrap
                        ${generalSortKey === s.key ? 'bg-[#7f1d1d] text-amber-200 border-[#991b1b]' : 'bg-stone-100 text-stone-700 border-stone-300'}`}
                    >
                      {s.label} ↓
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Count Header */}
            <div className="flex justify-between items-center px-1 text-xs text-stone-500 font-bold">
              <span>共檢視 {filteredGenerals.length} 名將領</span>
              <span>點擊卡片查看列傳與兵法詳情</span>
            </div>

            {/* General List Cards */}
            <div className="flex flex-col gap-2">
              {filteredGenerals.map(g => {
                const provState = g.provinceId ? gameState.provincesData[g.provinceId] : null;
                const provMeta = g.provinceId ? provinces.find(p => p.id === g.provinceId) : null;
                const rulerName = provState?.rulerName || (g.isWild ? '在野' : '未知');
                const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                return (
                  <div
                    key={g.name}
                    onClick={() => setSelectedGeneralDetail(g)}
                    className="bg-white border-2 border-stone-800 p-2.5 rounded shadow-sm hover:border-amber-600 cursor-pointer transition-colors flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-center border-b border-stone-200 pb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-[#1c1917]">{g.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                          ${g.isRuler ? 'bg-[#991b1b] text-white' : 'bg-stone-700 text-stone-100'}`}
                        >
                          {g.isRuler ? '君主' : g.role}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.5 rounded font-bold">
                          {rulerName}
                        </span>
                        {itemBonus.items.map(it => (
                          <span
                            key={it.id}
                            className="text-[9px] bg-amber-200/90 text-amber-950 font-black px-1.5 py-0.5 rounded border border-amber-400"
                          >
                            {it.name}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="font-bold text-stone-600">
                          {provMeta ? `${provMeta.name}` : '未入駐'}
                        </span>
                        <span className={`text-[10px] px-1 rounded font-bold
                          ${g.hasActed ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-800'}`}
                        >
                          {g.hasActed ? '已行動' : '待命'}
                        </span>
                      </div>
                    </div>

                    {/* Stats 7-column grid */}
                    <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">統帥</div>
                        <div className="font-black text-indigo-900 flex items-center justify-center gap-0.5">
                          <span>{g.hp}</span>
                          {itemBonus.hpBonus > 0 && (
                            <span className="text-emerald-700 font-bold text-[10px]">+{itemBonus.hpBonus}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">戰力</div>
                        <div className="font-black text-red-800 flex items-center justify-center gap-0.5">
                          <span>{g.str}</span>
                          {itemBonus.strBonus > 0 && (
                            <span className="text-emerald-700 font-bold text-[10px]">+{itemBonus.strBonus}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">謀略</div>
                        <div className="font-black text-sky-800 flex items-center justify-center gap-0.5">
                          <span>{g.int}</span>
                          {itemBonus.intBonus > 0 && (
                            <span className="text-emerald-700 font-bold text-[10px]">+{itemBonus.intBonus}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">政治</div>
                        <div className="font-black text-amber-800 flex items-center justify-center gap-0.5">
                          <span>{g.pol || 50}</span>
                          {itemBonus.polBonus > 0 && (
                            <span className="text-emerald-700 font-bold text-[10px]">+{itemBonus.polBonus}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">魅力</div>
                        <div className="font-black text-emerald-800 flex items-center justify-center gap-0.5">
                          <span>{g.cha || 50}</span>
                          {itemBonus.chaBonus > 0 && (
                            <span className="text-emerald-700 font-bold text-[10px]">+{itemBonus.chaBonus}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">忠誠</div>
                        <div className={`font-black ${
                          g.loyalty >= 95 ? 'text-emerald-800' :
                          g.loyalty >= 80 ? 'text-stone-800' :
                          g.loyalty >= 70 ? 'text-amber-800' : 'text-red-700'
                        }`}>
                          {g.loyalty}
                        </div>
                      </div>
                      <div className="bg-stone-100 p-1 rounded">
                        <div className="text-[10px] text-stone-500 font-bold">兵力</div>
                        <div className="font-black text-[#991b1b]">{g.soldiers}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3: 領土列表 (Faction Territories & National Power)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '領土列表' && (
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            <div className="bg-[#292524] text-amber-100 p-3 rounded border border-amber-500/30 text-xs flex justify-between items-center shadow">
              <span>歷史劇本：{SCENARIOS[gameState.currentScenario]?.title}</span>
              <span className="font-bold text-amber-300">總勢力數：{factionsList.length} 家</span>
            </div>

            <div className="flex flex-col gap-3">
              {factionsList.map(faction => (
                <div
                  key={faction.rulerName}
                  className={`bg-white border-2 rounded p-3 shadow-sm flex flex-col gap-2.5
                    ${faction.isPlayer ? 'border-amber-600 bg-amber-50/40 shadow-amber-900/10' : 'border-stone-800'}`}
                >
                  {/* Faction Header */}
                  <div className="flex justify-between items-center border-b border-stone-200 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-[#1c1917]">
                        【{faction.rulerName}】
                      </h3>
                      {faction.isPlayer ? (
                        <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-black">
                          玩家君主
                        </span>
                      ) : (
                        (() => {
                          const relation = gameState.diplomacyData?.[gameState.rulerName]?.[faction.rulerName] ?? 50;
                          const allianceExpiry = gameState.alliances?.[gameState.rulerName]?.[faction.rulerName];
                          const isAllied = allianceExpiry && allianceExpiry > (gameState.year * 12 + gameState.month);
                          const monthsLeft = isAllied ? allianceExpiry - (gameState.year * 12 + gameState.month) : 0;
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                relation >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                relation >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                relation >= 40 ? 'bg-stone-100 text-stone-700 border-stone-300' :
                                'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                友好: {relation}
                              </span>
                              {isAllied && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.5 rounded font-black">
                                  🤝 同盟 ({monthsLeft}月)
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}
                      <span className="text-xs bg-stone-800 text-amber-200 px-1.5 py-0.5 rounded font-bold">
                        大本營: {faction.capitalName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-500 font-bold">國力評級:</span>
                      <span className={`text-base font-black px-2 py-0.5 rounded
                        ${faction.rank === 'S' ? 'bg-red-700 text-white' :
                          faction.rank === 'A' ? 'bg-amber-600 text-white' :
                          faction.rank === 'B' ? 'bg-blue-700 text-white' : 'bg-stone-600 text-white'}`}
                      >
                        {faction.rank}
                      </span>
                    </div>
                  </div>

                  {/* Faction Metrics Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs bg-stone-50 p-2 border border-stone-200 rounded">
                    <div>
                      <div className="text-[10px] text-stone-500">領有州郡</div>
                      <div className="font-black text-base text-[#991b1b]">{faction.provincesCount} 郡</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">麾下武將</div>
                      <div className="font-black text-base text-stone-800">{faction.generalsCount} 人</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">全國總兵力</div>
                      <div className="font-black text-base text-red-700">{faction.totalMilitary.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">總儲備糧</div>
                      <div className="font-black text-base text-emerald-800">{(faction.totalFood / 10000).toFixed(1)}萬石</div>
                    </div>
                  </div>

                  {/* Province List Chips */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-stone-600">佔領郡縣名冊：</span>
                    <div className="flex flex-wrap gap-1">
                      {faction.provinces.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setInspectProvinceId(p.id);
                            setActiveTab('選擇州郡');
                          }}
                          className={`px-2 py-0.5 border rounded text-xs font-bold active:scale-95 transition-transform flex items-center gap-1 ${p.isAutonomous ? 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900' : 'bg-stone-100 hover:bg-amber-100 border-stone-300 text-stone-700'}`}
                        >
                          {p.name}
                          {p.isAutonomous && <span className="text-[9px] bg-amber-600 text-white px-1 rounded-sm">自治</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Generals */}
                  {faction.topGenerals.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-stone-200 pt-1.5 text-xs text-stone-600">
                      <span className="font-bold text-[10px] text-stone-500 shrink-0">主要名將：</span>
                      <div className="flex flex-wrap gap-1.5">
                        {faction.topGenerals.map(g => (
                          <span
                            key={g.name}
                            onClick={() => setSelectedGeneralDetail(g)}
                            className="bg-stone-200 hover:bg-stone-300 px-1.5 py-0.5 rounded cursor-pointer font-bold text-[11px]"
                          >
                            {g.name} (武{g.str}/智{g.int})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4: 郡地理誌 (Strategic Almanac of 8 Regions)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '郡地理誌' && (
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            {/* Region Selector Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {GEO_REGIONS.map(reg => (
                <button
                  key={reg.name}
                  onClick={() => setSelectedGeoRegion(reg.name)}
                  className={`px-3 py-1.5 rounded text-xs font-black border whitespace-nowrap transition-colors
                    ${selectedGeoRegion === reg.name
                      ? 'bg-[#7f1d1d] text-amber-100 border-[#991b1b] shadow'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}
                >
                  {reg.name}
                </button>
              ))}
            </div>

            {/* Region Overview Banner */}
            {(() => {
              const curReg = GEO_REGIONS.find(r => r.name === selectedGeoRegion) || GEO_REGIONS[0];
              return (
                <div className="flex flex-col gap-3">
                  <div className="bg-white border-2 border-[#1c1917] p-3 rounded shadow-sm">
                    <h3 className="text-lg font-black text-[#1c1917] mb-1 flex items-center gap-2">
                      <span>◆ {curReg.name} 地理戰略誌 ◆</span>
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {curReg.desc}
                    </p>
                  </div>

                  {/* Province Cards in this Region */}
                  <div className="flex flex-col gap-2">
                    {curReg.pIds.map(pId => {
                      const pMeta = provinces.find(p => p.id === pId);
                      const pState = gameState.provincesData[pId];
                      const baseConf = PROVINCE_BASE_CONFIGS[pId];
                      if (!pMeta) return null;

                      return (
                        <div
                          key={pId}
                          onClick={() => {
                            setInspectProvinceId(pId);
                            setActiveTab('選擇州郡');
                          }}
                          className="bg-white border border-stone-400 p-3 rounded hover:border-amber-600 hover:bg-amber-50/30 cursor-pointer transition-colors flex flex-col gap-1.5"
                        >
                          <div className="flex justify-between items-center border-b border-stone-200 pb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-base">{pMeta.name}</span>
                              <span className="text-[10px] bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded font-bold text-stone-600">
                                郡號: {pId}
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                {pState?.rulerName ? `【${pState.rulerName}】` : '空白'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-stone-500">
                              物價: {pState?.price || 10} 金/石
                            </span>
                          </div>

                          <div className="text-xs text-stone-600">
                            {pMeta.desc}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-stone-500 border-t border-stone-100 pt-1">
                            <span>基準人口: {baseConf?.basePopulation || 7} 萬</span>
                            <span>
                              連通鄰郡: {pMeta.connections.map(cid => provinces.find(p => p.id === cid)?.name).join('、')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 5: 君主物品 (Treasures & Relics Almanac)
           ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '君主物品' && (
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['全部', '武器', '名馬', '兵書', '奇寶', '醫書'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setTreasureCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-black border transition-colors whitespace-nowrap
                    ${treasureCategoryFilter === cat
                      ? 'bg-[#7f1d1d] text-amber-100 border-[#991b1b] shadow'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Treasures Cards */}
            <div className="flex flex-col gap-2.5">
              {filteredTreasures.map(item => {
                const currentOwner = item.defaultOwner[gameState.currentScenario];
                const ownerGeneral = currentOwner ? gameState.generalsData[currentOwner] : null;
                const ownerProvince = ownerGeneral?.provinceId ? provinces.find(p => p.id === ownerGeneral.provinceId) : null;

                return (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-stone-800 p-3 rounded shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start border-b border-stone-200 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-[#1c1917]">{item.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                            ${item.category === '武器' ? 'bg-red-100 text-red-900 border border-red-300' :
                              item.category === '名馬' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              item.category === '兵書' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                              item.category === '奇寶' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                              'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div className="text-xs font-black text-amber-800 mt-0.5">
                          【效果】{item.bonusDesc}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <div className="text-[10px] text-stone-500 font-bold">當前持有人</div>
                        {currentOwner ? (
                          <div className="font-black text-[#991b1b]">
                            {currentOwner}
                            {ownerProvince && (
                              <span className="text-[10px] text-stone-500 block font-normal">
                                ({ownerProvince.name})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-stone-400 font-bold">尚在山林 / 未現世</div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2 rounded border border-stone-200">
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: General Detail Popup ── */}
      {selectedGeneralDetail && (() => {
        const itemBonus = getGeneralItemBonus(selectedGeneralDetail.name, gameState.currentScenario);

        return (
          <div className="absolute inset-0 bg-stone-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
            <div className="bg-white border-2 border-[#1c1917] rounded-lg p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3 font-serif max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b-2 border-[#1c1917] pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-[#1c1917]">{selectedGeneralDetail.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold
                      ${selectedGeneralDetail.isRuler ? 'bg-[#991b1b] text-white' : 'bg-stone-700 text-stone-100'}`}
                    >
                      {selectedGeneralDetail.isRuler ? '君主' : selectedGeneralDetail.role}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500 font-bold">
                    最大統兵上限：{selectedGeneralDetail.maxTroops || 3000} 兵
                  </span>
                </div>
                <button
                  onClick={() => setSelectedGeneralDetail(null)}
                  className="text-stone-400 hover:text-stone-800 text-lg font-black"
                >
                  ✕
                </button>
              </div>

              {/* Held Treasures Section */}
              {itemBonus.items.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 p-2.5 rounded flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-900 flex items-center gap-1">
                      <span>👑</span> 佩戴名物寶物 ({itemBonus.items.length} 件)
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {itemBonus.items.map(it => (
                      <div key={it.id} className="bg-white border border-amber-300 px-2 py-1 rounded flex justify-between items-center text-[11px]">
                        <span className="font-black text-stone-900">{it.name}</span>
                        <span className="font-bold text-amber-800">{it.bonusDesc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Stats Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">統帥</div>
                  <div className="font-black text-sm flex items-center justify-center gap-1">
                    <span>{selectedGeneralDetail.hp}</span>
                    {itemBonus.hpBonus > 0 && (
                      <span className="text-emerald-700 font-bold text-xs">+{itemBonus.hpBonus}</span>
                    )}
                  </div>
                </div>
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">謀略</div>
                  <div className="font-black text-sm text-sky-800 flex items-center justify-center gap-1">
                    <span>{selectedGeneralDetail.int}</span>
                    {itemBonus.intBonus > 0 && (
                      <span className="text-emerald-700 font-bold text-xs">+{itemBonus.intBonus}</span>
                    )}
                  </div>
                </div>
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">戰力</div>
                  <div className="font-black text-sm text-red-800 flex items-center justify-center gap-1">
                    <span>{selectedGeneralDetail.str}</span>
                    {itemBonus.strBonus > 0 && (
                      <span className="text-emerald-700 font-bold text-xs">+{itemBonus.strBonus}</span>
                    )}
                  </div>
                </div>
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">政治</div>
                  <div className="font-black text-sm text-amber-800 flex items-center justify-center gap-1">
                    <span>{selectedGeneralDetail.pol || 50}</span>
                    {itemBonus.polBonus > 0 && (
                      <span className="text-emerald-700 font-bold text-xs">+{itemBonus.polBonus}</span>
                    )}
                  </div>
                </div>
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">魅力</div>
                  <div className="font-black text-sm text-emerald-800 flex items-center justify-center gap-1">
                    <span>{selectedGeneralDetail.cha || 50}</span>
                    {itemBonus.chaBonus > 0 && (
                      <span className="text-emerald-700 font-bold text-xs">+{itemBonus.chaBonus}</span>
                    )}
                  </div>
                </div>
                <div className="bg-stone-100 p-2 rounded border border-stone-300">
                  <div className="text-stone-500 text-[10px]">忠誠</div>
                  <div className={`font-black text-sm ${
                    selectedGeneralDetail.loyalty >= 95 ? 'text-emerald-800' :
                    selectedGeneralDetail.loyalty >= 80 ? 'text-stone-800' :
                    selectedGeneralDetail.loyalty >= 70 ? 'text-amber-800' : 'text-red-700'
                  }`}>
                    {selectedGeneralDetail.loyalty}
                  </div>
                </div>
              </div>

              {/* Military Readiness */}
              <div className="bg-stone-50 p-2.5 rounded border border-stone-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-stone-500 font-bold">麾下兵力：</span>
                  <span className="font-black text-red-700">{selectedGeneralDetail.soldiers?.toLocaleString()} / {selectedGeneralDetail.maxTroops?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold">部隊訓練度：</span>
                  <span className="font-black text-emerald-800">{selectedGeneralDetail.training || 50}%</span>
                </div>
              </div>

              {/* Location & Action */}
              <div className="flex justify-between items-center text-xs border-t border-stone-200 pt-2">
                <span className="font-bold text-stone-600">
                  所在都市：
                  {selectedGeneralDetail.provinceId
                    ? provinces.find(p => p.id === selectedGeneralDetail.provinceId)?.name
                    : '未配置'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold
                  ${selectedGeneralDetail.hasActed ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-800'}`}
                >
                  {selectedGeneralDetail.hasActed ? '本月已行動' : '待命中 (可執行任務)'}
                </span>
              </div>

              <button
                onClick={() => setSelectedGeneralDetail(null)}
                className="w-full py-2 bg-stone-800 text-amber-100 text-xs font-black rounded hover:bg-stone-700 active:scale-95 transition-transform"
              >
                確定
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
