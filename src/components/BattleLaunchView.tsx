import React, { useState, useMemo } from 'react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';

interface BattleLaunchViewProps {
  gameState: GameState;
  onExit: () => void;
  onLaunchBattle: (targetProvinceId: number, attackingGeneralNames: string[], gold: number, food: number) => void;
}

export default function BattleLaunchView({ gameState, onExit, onLaunchBattle }: BattleLaunchViewProps) {
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const currentProvinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);
  const currentProvInfo = provinces.find(p => p.id === currentProvinceId) || null;

  // Connected Enemy Provinces (Targets)
  const connectedEnemyProvinces = useMemo(() => {
    if (!currentProvInfo) return [];
    return currentProvInfo.connections.map(id => ({
      id,
      info: provinces.find(p => p.id === id),
      state: gameState.provincesData[id]
    })).filter(cp => cp.state && cp.state.rulerName !== gameState.rulerName);
  }, [currentProvInfo, gameState.provincesData, gameState.rulerName]);

  const pendingList = useMemo(() => {
    return gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : []);
  }, [gameState.pendingBattles, gameState.pendingBattle]);

  const targetedProvinceIds = useMemo(() => {
    return new Set(pendingList.map(b => b.targetProvinceId));
  }, [pendingList]);

  const [targetProvinceId, setTargetProvinceId] = useState<number | null>(() => {
    // 預設選擇第一座尚未被鎖定進攻的敵方城池
    const list = gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : []);
    const targetedSet = new Set(list.map(b => b.targetProvinceId));
    const available = connectedEnemyProvinces.find(cp => !targetedSet.has(cp.id));
    return available ? available.id : (connectedEnemyProvinces.length > 0 ? connectedEnemyProvinces[0].id : null);
  });

  // General selection mapped by general name: boolean
  const [selectedGenerals, setSelectedGenerals] = useState<Record<string, boolean>>({});
  const [goldToBring, setGoldToBring] = useState<number>(0);
  const [foodToBring, setFoodToBring] = useState<number>(0);

  // Find all owned provinces connected to the target province
  const alliedProvincesConnectedToTarget = useMemo(() => {
    if (!targetProvinceId) return [];
    const targetInfo = provinces.find(p => p.id === targetProvinceId);
    if (!targetInfo) return [];
    
    return targetInfo.connections
      .filter(id => gameState.provincesData[id]?.rulerName === gameState.rulerName)
      .map(id => ({
        id,
        info: provinces.find(p => p.id === id),
        state: gameState.provincesData[id]
      }));
  }, [targetProvinceId, gameState.provincesData, gameState.rulerName]);

  // Current active city tab index (0 to alliedProvincesConnectedToTarget.length - 1)
  const [activeCityIndex, setActiveCityIndex] = useState<number>(0);

  // When target changes, reset selections and active city
  const handleTargetChange = (id: number) => {
    setTargetProvinceId(id);
    setSelectedGenerals({});
    setActiveCityIndex(0);
    setGoldToBring(0);
    setFoodToBring(0);
  };

  // Ensure activeCityIndex is valid when allied provinces change
  const currentCityObj = alliedProvincesConnectedToTarget[activeCityIndex] || alliedProvincesConnectedToTarget[0] || null;

  // Generals of current active city
  const currentCityGenerals = useMemo(() => {
    if (!currentCityObj) return [];
    return Object.values(gameState.generalsData)
      .filter(g => g.provinceId === currentCityObj.id && !g.isWild)
      .sort((a, b) => b.soldiers - a.soldiers);
  }, [currentCityObj, gameState.generalsData]);

  // Count selected generals per city
  const citySelectionStats = useMemo(() => {
    const map: Record<number, { count: number; generals: string[]; troops: number }> = {};
    alliedProvincesConnectedToTarget.forEach(city => {
      map[city.id] = { count: 0, generals: [], troops: 0 };
    });

    Object.keys(selectedGenerals).forEach(gName => {
      if (selectedGenerals[gName]) {
        const gen = gameState.generalsData[gName];
        if (gen && map[gen.provinceId]) {
          map[gen.provinceId].count += 1;
          map[gen.provinceId].generals.push(gName);
          map[gen.provinceId].troops += gen.soldiers;
        }
      }
    });
    return map;
  }, [alliedProvincesConnectedToTarget, selectedGenerals, gameState.generalsData]);

  // Overall selection count
  const allSelectedGeneralNames = useMemo(() => {
    return Object.keys(selectedGenerals).filter(k => selectedGenerals[k]);
  }, [selectedGenerals]);

  const totalSelectedCount = allSelectedGeneralNames.length;

  const toggleSelectGeneral = (name: string, provinceId: number, hasActed: boolean) => {
    if (hasActed) return;
    const currentInThisCity = citySelectionStats[provinceId]?.count || 0;
    const isCurrentlySelected = !!selectedGenerals[name];

    // Limit: Max 5 generals PER CITY
    if (!isCurrentlySelected && currentInThisCity >= 5) {
      alert(`【${provinces.find(p => p.id === provinceId)?.name || '該城市'}】出兵人數已達上限（最多5人）！`);
      return;
    }

    setSelectedGenerals(prev => ({
      ...prev,
      [name]: !isCurrentlySelected
    }));
  };

  // Quick select/clear for current city
  const handleSelectAllCurrentCity = () => {
    if (!currentCityObj) return;
    const available = currentCityGenerals.filter(g => !g.hasActed);
    const toSelect = available.slice(0, 5);
    setSelectedGenerals(prev => {
      const next = { ...prev };
      // First unselect all in this city
      currentCityGenerals.forEach(g => {
        delete next[g.name];
      });
      // Then select up to 5
      toSelect.forEach(g => {
        next[g.name] = true;
      });
      return next;
    });
  };

  const handleClearCurrentCity = () => {
    if (!currentCityObj) return;
    setSelectedGenerals(prev => {
      const next = { ...prev };
      currentCityGenerals.forEach(g => {
        delete next[g.name];
      });
      return next;
    });
  };

  // Calculate resource limits and consumption
  const { maxGold, maxFood, totalTroops, estimatedFoodCost } = useMemo(() => {
    let gold = 0;
    let food = 0;
    let troops = 0;
    
    // Sum resources from provinces that have at least one selected general
    const participatingProvinceIds = new Set<number>();
    allSelectedGeneralNames.forEach(gName => {
      const gen = gameState.generalsData[gName];
      if (gen) {
        participatingProvinceIds.add(gen.provinceId);
        troops += gen.soldiers;
      }
    });

    participatingProvinceIds.forEach(pId => {
      const p = gameState.provincesData[pId];
      if (p) {
        gold += p.gold;
        food += p.food;
      }
    });

    // 10 troops consume 1 food per day. A month is roughly 30 days.
    const estimatedCost = Math.ceil((troops / 10) * 30);

    return { maxGold: gold, maxFood: food, totalTroops: troops, estimatedFoodCost: estimatedCost };
  }, [allSelectedGeneralNames, gameState.generalsData, gameState.provincesData]);

  // Adjust sliders if they exceed max
  React.useEffect(() => {
    if (goldToBring > maxGold) setGoldToBring(maxGold);
    if (foodToBring > maxFood) setFoodToBring(maxFood);
  }, [maxGold, maxFood]);

  const handleLaunch = () => {
    if (targetProvinceId && totalSelectedCount > 0) {
      onLaunchBattle(targetProvinceId, allSelectedGeneralNames, goldToBring, foodToBring);
    }
  };

  const targetProvInfo = provinces.find(p => p.id === targetProvinceId);
  const targetProvState = targetProvinceId ? gameState.provincesData[targetProvinceId] : null;

  if (!currentProvInfo) return null;

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden select-none">
      {/* Header Banner */}
      <div className="p-3 sm:p-4 border-b-2 border-[#1c1917] flex justify-between items-center bg-[#f2efeb] shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-black text-lg sm:text-xl text-[#991b1b]">發動戰役 ‧ 相鄰城市聯合出兵</span>
          <span className="text-xs bg-amber-100 border border-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded">
            一城一頁 ‧ 每城最多5人
          </span>
        </div>
        <button
          onClick={onExit}
          className="px-4 py-1.5 border-2 border-[#1c1917] bg-white font-black hover:bg-[#1c1917] hover:text-white transition-colors shadow-[2px_2px_0_#1c1917] active:scale-95 text-xs rounded cursor-pointer"
        >
          返回大地圖
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-4">
          
          {/* Target Enemy Province Selection */}
          <div className="bg-white border-2 border-[#1c1917] p-3 sm:p-4 shadow-[3px_3px_0_#1c1917] rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-sm text-stone-800">
                1. 選擇進攻目標郡縣：
              </span>
              {targetProvInfo && (
                <span className="text-xs text-stone-600 font-bold">
                  目標防守君主: <strong className="text-[#991b1b]">{targetProvState?.rulerName || '無'}</strong> 
                  （周遭相鄰我方城市共 {alliedProvincesConnectedToTarget.length} 座）
                </span>
              )}
            </div>

            {connectedEnemyProvinces.length === 0 ? (
              <div className="text-sm text-red-600 font-bold p-3 bg-red-50 border border-red-200 rounded">
                本郡周遭沒有可進攻的敵方郡縣。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {connectedEnemyProvinces.map(cp => {
                  const isSelected = targetProvinceId === cp.id;
                  const isAlreadyTargeted = targetedProvinceIds.has(cp.id);
                  return (
                    <button
                      key={cp.id}
                      disabled={isAlreadyTargeted}
                      onClick={() => !isAlreadyTargeted && handleTargetChange(cp.id)}
                      className={`p-2.5 border-2 text-left transition-all rounded ${
                        isAlreadyTargeted
                          ? 'border-stone-300 bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#991b1b] bg-amber-50 shadow-sm ring-2 ring-[#991b1b] cursor-pointer'
                          : 'border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white cursor-pointer'
                      }`}
                    >
                      <div className="font-black text-sm text-stone-900 flex justify-between items-center">
                        <span className={isAlreadyTargeted ? 'text-stone-500' : ''}>{cp.info?.name} ({cp.id}郡)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          isAlreadyTargeted
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isSelected
                            ? 'bg-[#991b1b] text-white border-[#991b1b]'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {isAlreadyTargeted ? '⚔️ 已排定進攻' : isSelected ? '🎯 目標' : '敵城'}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 mt-1 flex justify-between">
                        <span>君主: <strong className="text-[#991b1b]">{cp.state?.rulerName || '無'}</strong></span>
                        <span>兵力: {cp.state?.soldiers || 0}</span>
                      </div>
                      {isAlreadyTargeted && (
                        <div className="text-[10px] text-red-600 font-bold mt-1">
                          ※ 本月已排定進攻，不可重複進攻
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adjacent Cities Dispatching Interface - ONE PAGE PER CITY */}
          {targetProvinceId && alliedProvincesConnectedToTarget.length > 0 && (
            <div className="bg-white border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] rounded overflow-hidden">
              
              {/* City Tabs / Navigation Bar */}
              <div className="bg-[#f5f2eb] border-b-2 border-[#1c1917] p-2 sm:p-3">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-stone-900">2. 相鄰城市出兵配置</span>
                    <span className="text-xs text-stone-500 font-bold">
                      （切換下方城市標籤，每座相鄰城市可獨立推派最多5位武將）
                    </span>
                  </div>

                  {/* Prev / Next City Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={activeCityIndex <= 0}
                      onClick={() => setActiveCityIndex(prev => Math.max(0, prev - 1))}
                      className="px-2.5 py-1 text-xs font-bold border border-[#1c1917] bg-white rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      ‹ 上一座城
                    </button>
                    <span className="text-xs font-black text-stone-700 px-1">
                      {activeCityIndex + 1} / {alliedProvincesConnectedToTarget.length}
                    </span>
                    <button
                      disabled={activeCityIndex >= alliedProvincesConnectedToTarget.length - 1}
                      onClick={() => setActiveCityIndex(prev => Math.min(alliedProvincesConnectedToTarget.length - 1, prev + 1))}
                      className="px-2.5 py-1 text-xs font-bold border border-[#1c1917] bg-white rounded hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      下一座城 ›
                    </button>
                  </div>
                </div>

                {/* City Tabs */}
                <div className="flex flex-wrap gap-2">
                  {alliedProvincesConnectedToTarget.map((city, idx) => {
                    const stats = citySelectionStats[city.id] || { count: 0, generals: [], troops: 0 };
                    const isActive = idx === activeCityIndex;

                    return (
                      <button
                        key={city.id}
                        onClick={() => setActiveCityIndex(idx)}
                        className={`px-3 py-2 border-2 rounded transition-all text-left flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? 'border-[#991b1b] bg-[#991b1b] text-white shadow-sm font-black'
                            : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500 font-bold'
                        }`}
                      >
                        <span className="text-sm">{city.info?.name} ({city.id}郡)</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
                          isActive
                            ? 'bg-amber-300 text-stone-900 border-amber-400'
                            : stats.count > 0
                            ? 'bg-rose-100 text-red-800 border-red-300'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}>
                          已選 {stats.count}/5 人
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active City Dispatch Page Body */}
              {currentCityObj && (
                <div className="p-3 sm:p-4">
                  {/* Current City Stats Header */}
                  <div className="bg-stone-50 border border-stone-300 p-2.5 rounded mb-3 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-stone-900">
                          【{currentCityObj.info?.name}】出兵配置
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-black px-2 py-0.5 rounded">
                          太守: {currentCityObj.state?.governorName || '無'}
                        </span>
                        <span className="text-xs text-stone-600 font-bold">
                          金: <strong className="text-amber-800">{currentCityObj.state?.gold}</strong> ‧ 
                          糧: <strong className="text-emerald-800">{currentCityObj.state?.food}</strong> ‧ 
                          總兵力: <strong className="text-red-800">{currentCityObj.state?.soldiers}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-stone-700">
                        本城已選: <strong className="text-lg text-[#991b1b]">{citySelectionStats[currentCityObj.id]?.count || 0}</strong> / 5 人
                      </span>
                      <button
                        onClick={handleSelectAllCurrentCity}
                        className="text-xs px-2.5 py-1 border border-stone-400 bg-white hover:bg-stone-100 font-bold rounded cursor-pointer"
                      >
                        快速選5人
                      </button>
                      <button
                        onClick={handleClearCurrentCity}
                        className="text-xs px-2.5 py-1 border border-stone-400 bg-white hover:bg-stone-100 font-bold rounded text-stone-600 cursor-pointer"
                      >
                        清空本城
                      </button>
                    </div>
                  </div>

                  {/* Generals Grid for Active City */}
                  {currentCityGenerals.length === 0 ? (
                    <div className="text-center py-8 text-stone-500 font-bold bg-stone-50 border border-dashed border-stone-300 rounded">
                      此城池目前無駐守武將
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {currentCityGenerals.map(g => {
                        const isChecked = !!selectedGenerals[g.name];
                        const thisCityCount = citySelectionStats[currentCityObj.id]?.count || 0;
                        const isDisabled = g.hasActed || (!isChecked && thisCityCount >= 5);
                        const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                        return (
                          <div
                            key={g.name}
                            onClick={() => toggleSelectGeneral(g.name, currentCityObj.id, g.hasActed)}
                            className={`p-3 border-2 transition-all rounded flex items-center justify-between shadow-xs ${
                              isChecked
                                ? 'border-[#991b1b] bg-amber-50/80 ring-1 ring-[#991b1b]'
                                : 'border-stone-300 bg-stone-50'
                            } ${
                              isDisabled && !isChecked
                                ? 'opacity-50 bg-stone-200/80 cursor-not-allowed'
                                : 'cursor-pointer hover:border-stone-600 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                disabled={isDisabled && !isChecked}
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 accent-[#991b1b] cursor-pointer"
                              />
                              <div>
                                <div className="font-black text-base flex items-center gap-2">
                                  <span className="text-stone-900">{g.name}</span>
                                  {g.hasActed && (
                                    <span className="text-[10px] bg-stone-300 text-stone-700 px-1.5 py-0.2 rounded font-bold">
                                      本月已行動
                                    </span>
                                  )}
                                  {isChecked && (
                                    <span className="text-[10px] bg-[#991b1b] text-white px-1.5 py-0.2 rounded font-black">
                                      已參戰
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-stone-600 flex gap-2.5 mt-1">
                                  <span>兵力: <strong className="text-[#991b1b]">{g.soldiers}</strong></span>
                                  <span>武: <strong>{g.str + itemBonus.strBonus}</strong></span>
                                  <span>智: <strong>{g.int + itemBonus.intBonus}</strong></span>
                                  <span>統: <strong>{g.hp}</strong></span>
                                  <span>訓: {g.training || 0}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-xs">
                              {isChecked ? (
                                <span className="text-xs font-black text-[#991b1b]">✓ 已選出戰</span>
                              ) : (
                                <span className="text-[11px] text-stone-400">點選參戰</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* Resource Allocation & Army Overview Footer */}
              <div className="bg-[#f9f8f5] border-t-2 border-[#1c1917] p-3 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Overall Troops & Generals Summary */}
                  <div className="bg-white border border-stone-300 p-3 rounded shadow-xs">
                    <div className="font-black text-sm text-stone-800 mb-2 flex justify-between items-center">
                      <span>聯軍出征編制總覽</span>
                      <span className="text-xs text-[#991b1b] font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        共 {totalSelectedCount} 位將領 ‧ 總兵力 {totalTroops.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1 max-h-[90px] overflow-y-auto pr-1">
                      {alliedProvincesConnectedToTarget.map(city => {
                        const stats = citySelectionStats[city.id];
                        if (!stats || stats.count === 0) return null;
                        return (
                          <div key={city.id} className="flex justify-between items-center bg-stone-50 p-1.5 rounded border border-stone-200">
                            <span className="font-bold text-stone-800">【{city.info?.name}】({stats.count}人):</span>
                            <span className="text-stone-700 font-bold truncate max-w-[200px]">
                              {stats.generals.join('、')}
                            </span>
                            <span className="text-[#991b1b] font-black">{stats.troops} 兵</span>
                          </div>
                        );
                      })}
                      {totalSelectedCount === 0 && (
                        <div className="text-stone-400 py-3 text-center font-bold">
                          請由上方城市中勾選出征將領
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Money and Food Sliders */}
                  <div className="bg-white border border-stone-300 p-3 rounded shadow-xs">
                    <div className="font-black text-sm text-stone-800 mb-1 flex justify-between">
                      <span>隨軍錢糧配給</span>
                      <span className="text-xs text-amber-800 font-bold">
                        預計30日軍糧: {estimatedFoodCost}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between font-bold mb-0.5">
                          <span>軍糧配給</span>
                          <span className="text-emerald-800 font-black">{foodToBring} / {maxFood}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max={maxFood} 
                          value={foodToBring} 
                          onChange={(e) => setFoodToBring(Number(e.target.value))}
                          className="w-full accent-emerald-600"
                        />
                        <div className="flex gap-1.5 mt-0.5">
                          <button 
                            onClick={() => setFoodToBring(Math.min(maxFood, estimatedFoodCost))} 
                            className="text-[10px] px-2 py-0.5 border border-stone-400 bg-stone-100 hover:bg-stone-200 rounded font-bold cursor-pointer"
                          >
                            配備30日糧
                          </button>
                          <button 
                            onClick={() => setFoodToBring(maxFood)} 
                            className="text-[10px] px-2 py-0.5 border border-stone-400 bg-stone-100 hover:bg-stone-200 rounded font-bold cursor-pointer"
                          >
                            全部帶走
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold mb-0.5">
                          <span>軍金配給</span>
                          <span className="text-amber-800 font-black">{goldToBring} / {maxGold}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max={maxGold} 
                          value={goldToBring} 
                          onChange={(e) => setGoldToBring(Number(e.target.value))}
                          className="w-full accent-amber-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 sm:p-4 border-t-2 border-[#1c1917] bg-[#f2efeb] flex flex-col items-center gap-1.5 shadow-md">
        <button
          disabled={totalSelectedCount === 0 || !targetProvinceId}
          onClick={handleLaunch}
          className={`w-full max-w-xl py-3 font-black text-base sm:text-lg border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] transition-all text-white rounded cursor-pointer
            ${totalSelectedCount > 0 && targetProvinceId 
              ? 'bg-[#991b1b] hover:bg-red-800 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none' 
              : 'bg-stone-400 cursor-not-allowed opacity-60'}
          `}
        >
          ⚔️ 排定進軍！於本月『休息』時正式發動進攻 ({totalSelectedCount} 位將領參戰)
        </button>
        <span className="text-xs text-stone-500 font-bold">
          ※ 確定後部隊將整裝待命，在您點擊主畫面或選單的「休息」時立即進入戰役！
        </span>
      </div>
    </div>
  );
}
