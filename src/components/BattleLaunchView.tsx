import React, { useState, useEffect, useMemo } from 'react';
import { GameState, ProvinceState, GeneralState, FormationTerrainType } from '../types';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';
import { getGeneralAvailableFormations, getFormationInfo, getFormationTerrainEffect, TERRAIN_DETAILS } from '../engine/formations';
import { battleCombatCalculator } from '../engine/useGameEngine';
import { GeneralAvatar } from './GeneralAvatar';
import { 
  Swords, 
  Target, 
  Users, 
  Wheat, 
  Coins, 
  Compass, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Crown,
  ShieldAlert,
  ArrowRightLeft,
  Sparkles,
  Info
} from 'lucide-react';

interface BattleLaunchViewProps {
  gameState: GameState;
  onExit: () => void;
  onLaunchBattle: (
    targetProvinceId: number, 
    attackingGeneralNames: string[], 
    gold: number, 
    food: number, 
    strategist?: string | null,
    cityProvisions?: Record<number, { gold: number; food: number }>,
    attackerPrimaryProvinceId?: number,
    attackerReinforceProvinceId?: number | null
  ) => void;
}

export default function BattleLaunchView({ gameState, onExit, onLaunchBattle }: BattleLaunchViewProps) {
  const currentProvId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (Object.values(gameState.provincesData).find(p => p.rulerName === gameState.rulerName)?.id ?? 1);

  const currentProvInfo = provinces.find(p => p.id === currentProvId);

  // 取得全地圖所有與我方領地相連之敵方郡縣
  const connectedEnemyProvinces = useMemo(() => {
    const enemyMap = new Map<number, { id: number; info: any; state: ProvinceState }>();
    
    Object.values(gameState.provincesData).forEach(p => {
      if (p.rulerName === gameState.rulerName) {
        const pInfo = provinces.find(x => x.id === p.id);
        if (pInfo) {
          pInfo.connections.forEach(targetId => {
            const targetState = gameState.provincesData[targetId];
            if (targetState && targetState.rulerName !== gameState.rulerName) {
              const targetInfo = provinces.find(x => x.id === targetId);
              if (targetInfo && !enemyMap.has(targetId)) {
                enemyMap.set(targetId, { id: targetId, info: targetInfo, state: targetState });
              }
            }
          });
        }
      }
    });

    return Array.from(enemyMap.values());
  }, [gameState.provincesData, gameState.rulerName]);

  // 本月已排定的進攻目標清單
  const pendingList = gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : []);
  const targetedProvinceIds = useMemo(() => {
    return new Set(pendingList.map(b => b.targetProvinceId));
  }, [pendingList]);

  const [targetProvinceId, setTargetProvinceId] = useState<number | null>(() => {
    const available = connectedEnemyProvinces.find(cp => !targetedProvinceIds.has(cp.id));
    return available ? available.id : (connectedEnemyProvinces.length > 0 ? connectedEnemyProvinces[0].id : null);
  });

  // 武將選取狀態: { [generalName]: boolean }
  const [selectedGenerals, setSelectedGenerals] = useState<Record<string, boolean>>({});
  
  // 各城獨立錢糧配置: { [provinceId]: { gold: number, food: number } }
  const [cityProvisions, setCityProvisions] = useState<Record<number, { gold: number; food: number }>>({});
  const [strategist, setStrategist] = useState<string | null>(null);

  // 尋找所有與目標郡縣相鄰的我方城池
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

  // 當前瀏覽之城池索引
  const [activeCityIndex, setActiveCityIndex] = useState<number>(0);

  // 切換進攻目標時，重置選取狀態
  const handleTargetChange = (id: number) => {
    setTargetProvinceId(id);
    setSelectedGenerals({});
    setCityProvisions({});
    setActiveCityIndex(0);
    setStrategist(null);
  };

  const currentCityObj = alliedProvincesConnectedToTarget[activeCityIndex] || alliedProvincesConnectedToTarget[0] || null;

  // 當前城池之駐守武將
  const currentCityGenerals = useMemo(() => {
    if (!currentCityObj) return [];
    return Object.values(gameState.generalsData)
      .filter(g => g.provinceId === currentCityObj.id && !g.isWild)
      .sort((a, b) => b.soldiers - a.soldiers);
  }, [currentCityObj, gameState.generalsData]);

  // 統計各城池已選取人數與名單
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

  // 目前有派出將領的城池 ID 清單 (最多 2 城)
  const participatingCityIds = useMemo(() => {
    return Object.keys(citySelectionStats)
      .map(Number)
      .filter(pId => (citySelectionStats[pId]?.count || 0) > 0);
  }, [citySelectionStats]);

  // 全部已選取的武將清單
  const allSelectedGeneralNames = useMemo(() => {
    return Object.keys(selectedGenerals).filter(k => selectedGenerals[k]);
  }, [selectedGenerals]);

  const totalSelectedCount = allSelectedGeneralNames.length;

  // 總出征兵力
  const totalTroops = useMemo(() => {
    return allSelectedGeneralNames.reduce((sum, gName) => {
      return sum + (gameState.generalsData[gName]?.soldiers || 0);
    }, 0);
  }, [allSelectedGeneralNames, gameState.generalsData]);

  // 當參與城池變更時，自動初始化各城的隨軍錢糧配置
  useEffect(() => {
    setCityProvisions(prev => {
      const next = { ...prev };
      participatingCityIds.forEach(pId => {
        const pState = gameState.provincesData[pId];
        const cStats = citySelectionStats[pId];
        if (pState && cStats) {
          const defaultFoodCost = Math.ceil((cStats.troops / 10) * 30); // 30日推薦糧
          const defaultGold = Math.min(pState.gold, 500);
          
          if (!next[pId]) {
            next[pId] = {
              gold: defaultGold,
              food: Math.min(pState.food, defaultFoodCost)
            };
          } else {
            // 確保不超過當前城池最大庫存
            next[pId] = {
              gold: Math.min(next[pId].gold, pState.gold),
              food: Math.min(next[pId].food, pState.food)
            };
          }
        }
      });
      // 移除未出兵城池的配置
      Object.keys(next).forEach(idStr => {
        const id = Number(idStr);
        if (!participatingCityIds.includes(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [participatingCityIds, citySelectionStats, gameState.provincesData]);

  // 自動推薦最高謀略(智力 >= 80)武將為軍師
  useEffect(() => {
    if (allSelectedGeneralNames.length > 0) {
      if (!strategist || !selectedGenerals[strategist]) {
        const candidates = allSelectedGeneralNames
          .map(name => {
            const gen = gameState.generalsData[name];
            if (!gen) return null;
            const itemBonus = getGeneralItemBonus(name, gameState.currentScenario);
            const totalInt = gen.int + itemBonus.intBonus;
            return { name, totalInt };
          })
          .filter((item): item is { name: string; totalInt: number } => item !== null && item.totalInt >= 80)
          .sort((a, b) => b.totalInt - a.totalInt);
        
        if (candidates.length > 0) {
          setStrategist(candidates[0].name);
        } else {
          setStrategist(null);
        }
      } else {
        // 若已指派之軍師智力已不足 80，取消指派
        const gen = gameState.generalsData[strategist];
        if (gen) {
          const itemBonus = getGeneralItemBonus(gen.name, gameState.currentScenario);
          if (gen.int + itemBonus.intBonus < 80) {
            setStrategist(null);
          }
        }
      }
    } else {
      setStrategist(null);
    }
  }, [allSelectedGeneralNames, selectedGenerals, gameState.generalsData, gameState.currentScenario, strategist]);

  // 獨立武將點擊切換邏輯 (修復原本反轉 bug + 嚴格限制最多 2 城、每城最多 5 人)
  const toggleSelectGeneral = (name: string, provinceId: number, hasActed: boolean) => {
    if (hasActed) return;
    
    const isChecked = !!selectedGenerals[name];
    const willSelect = !isChecked;

    if (willSelect) {
      const thisCityCount = citySelectionStats[provinceId]?.count || 0;
      
      // 限制 1：每城最多 5 將
      if (thisCityCount >= 5) {
        alert(`【${provinces.find(p => p.id === provinceId)?.name || '該城市'}】出兵人數已達上限（每座城池最多 5 人）！`);
        return;
      }

      // 限制 2：最多 2 座城池聯合出征
      if (thisCityCount === 0 && participatingCityIds.length >= 2 && !participatingCityIds.includes(provinceId)) {
        const city1Name = provinces.find(p => p.id === participatingCityIds[0])?.name || `${participatingCityIds[0]}郡`;
        const city2Name = provinces.find(p => p.id === participatingCityIds[1])?.name || `${participatingCityIds[1]}郡`;
        alert(`一場戰場最多只允許 2 座城池聯合出征（目前已指定【${city1Name}】與【${city2Name}】）！\n\n如欲調派此城池將領，請先清空其中一座城池的已選武將。`);
        return;
      }
    }

    setSelectedGenerals(prev => {
      const next = { ...prev };
      if (willSelect) {
        next[name] = true;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  // 當前城池一鍵全選 (最多 5 人)
  const handleSelectAllCurrentCity = () => {
    if (!currentCityObj) return;
    const thisCityId = currentCityObj.id;
    const thisCityCount = citySelectionStats[thisCityId]?.count || 0;
    
    if (thisCityCount === 0 && participatingCityIds.length >= 2 && !participatingCityIds.includes(thisCityId)) {
      alert(`一場戰場最多只允許 2 座城池聯合出征！請先清空其他城池的已選名額。`);
      return;
    }

    const available = currentCityGenerals.filter(g => !g.hasActed);
    const toSelect = available.slice(0, 5);
    
    setSelectedGenerals(prev => {
      const next = { ...prev };
      currentCityGenerals.forEach(g => {
        delete next[g.name];
      });
      toSelect.forEach(g => {
        next[g.name] = true;
      });
      return next;
    });
  };

  // 當前城池一鍵清空
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

  // 更新單座城池之隨軍錢糧
  const handleUpdateCityProvision = (provinceId: number, field: 'gold' | 'food', value: number) => {
    const provState = gameState.provincesData[provinceId];
    if (!provState) return;
    const maxVal = field === 'gold' ? provState.gold : provState.food;
    const clamped = Math.max(0, Math.min(maxVal, value));

    setCityProvisions(prev => ({
      ...prev,
      [provinceId]: {
        gold: field === 'gold' ? clamped : (prev[provinceId]?.gold || 0),
        food: field === 'food' ? clamped : (prev[provinceId]?.food || 0)
      }
    }));
  };

  // 總隨軍錢糧
  const totalGoldBrought = useMemo(() => {
    return (Object.values(cityProvisions) as { gold: number; food: number }[]).reduce((sum, p) => sum + (p.gold || 0), 0);
  }, [cityProvisions]);

  const totalFoodBrought = useMemo(() => {
    return (Object.values(cityProvisions) as { gold: number; food: number }[]).reduce((sum, p) => sum + (p.food || 0), 0);
  }, [cityProvisions]);

  // 確認發動出征
  const handleLaunch = () => {
    if (!targetProvinceId || totalSelectedCount === 0) return;

    const primaryCityId = participatingCityIds[0] || currentProvId;
    const reinforceCityId = participatingCityIds.length > 1 ? participatingCityIds[1] : null;

    onLaunchBattle(
      targetProvinceId,
      allSelectedGeneralNames,
      totalGoldBrought,
      totalFoodBrought,
      strategist,
      cityProvisions,
      primaryCityId,
      reinforceCityId
    );
  };

  const targetProvInfo = provinces.find(p => p.id === targetProvinceId);
  const targetProvState = targetProvinceId ? gameState.provincesData[targetProvinceId] : null;
  const targetTerrain = (targetProvInfo?.terrain as FormationTerrainType) || '平地';
  const targetTerrainDetail = TERRAIN_DETAILS[targetTerrain];

  if (!currentProvInfo) return null;

  return (
    <div className="absolute inset-0 bg-[#e8e4dc] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden select-none">
      {/* 頂部 Header */}
      <div className="h-12 bg-[#231e1a] border-b-2 border-[#3d3227] px-3 sm:px-4 flex justify-between items-center text-white shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-500" />
          <span className="font-black text-base sm:text-lg text-amber-300 tracking-wider">
            軍事作戰 ‧ 發動戰役出征
          </span>
          <span className="hidden sm:inline-block text-[11px] bg-red-950/80 border border-red-800 text-red-300 px-2 py-0.5 rounded font-bold">
            最多2城聯合出征 (每城最多5將)
          </span>
        </div>

        <button
          onClick={onExit}
          className="h-7 px-3 border border-stone-600 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded transition-all cursor-pointer flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          返回地圖
        </button>
      </div>

      {/* 主內容區：四大出征步驟 */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-3 sm:space-y-4 pb-4">
          
          {/* 步驟一：選擇進攻目標 */}
          <div className="bg-[#f7f5f0] border-2 border-[#3d3227] rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-stone-300">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#8b1818] text-white text-xs font-black flex items-center justify-center">1</span>
                <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1">
                  <Target className="w-4 h-4 text-[#8b1818]" />
                  選擇進攻目標郡縣
                </h3>
              </div>
              {targetProvInfo && (
                <span className="text-xs text-stone-600 font-bold">
                  相鄰我方可出兵城池: <strong className="text-[#8b1818]">{alliedProvincesConnectedToTarget.length}</strong> 座
                </span>
              )}
            </div>

            {connectedEnemyProvinces.length === 0 ? (
              <div className="text-sm text-red-600 font-bold p-3 bg-red-50 border border-red-200 rounded-lg">
                周遭沒有可進攻的相鄰敵方郡縣。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {connectedEnemyProvinces.map(cp => {
                  const isSelected = targetProvinceId === cp.id;
                  const isAlreadyTargeted = targetedProvinceIds.has(cp.id);
                  const cpTerrain = (cp.info?.terrain as FormationTerrainType) || '平地';
                  const cpTerrainDetail = TERRAIN_DETAILS[cpTerrain];

                  const cpGenerals = Object.values(gameState.generalsData).filter(g => g.provinceId === cp.id && !g.isWild);
                  const cpTotalTroops = cpGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
                  return (
                    <button
                      key={cp.id}
                      disabled={isAlreadyTargeted}
                      onClick={() => !isAlreadyTargeted && handleTargetChange(cp.id)}
                      className={`p-2 sm:p-2.5 border-2 text-left transition-all rounded-lg relative overflow-hidden ${
                        isAlreadyTargeted
                          ? 'border-stone-300 bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-[#8b1818] bg-amber-50/90 shadow-md ring-2 ring-[#8b1818] cursor-pointer'
                          : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50 cursor-pointer shadow-xs'
                      }`}
                    >
                      <div className="font-black text-sm text-stone-900 flex justify-between items-center">
                        <span className={isAlreadyTargeted ? 'text-stone-500' : ''}>{cp.info?.name} ({cp.id}郡)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          isAlreadyTargeted
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isSelected
                            ? 'bg-[#8b1818] text-white border-[#8b1818]'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {isAlreadyTargeted ? '已排定' : isSelected ? '🎯 目標' : '敵城'}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 mt-1 flex justify-between items-center">
                        <span>君主: <strong className="text-[#8b1818]">{cp.state?.rulerName || '無'}</strong></span>
                        <span className="text-[11px] bg-stone-100 px-1 py-0.5 rounded border border-stone-300">
                          {cpTerrainDetail?.symbol} {cpTerrain}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        守軍總兵力: <strong className="text-[#8b1818] font-black">{cpTotalTroops.toLocaleString()}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 步驟二：調遣參戰將領 (最多2座城池，每城最多5人) */}
          {targetProvinceId && alliedProvincesConnectedToTarget.length > 0 && (
            <div className="bg-[#f7f5f0] border-2 border-[#3d3227] rounded-xl shadow-sm overflow-hidden">
              <div className="bg-[#eeeae2] border-b-2 border-stone-300 p-2.5 sm:p-3">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#8b1818] text-white text-xs font-black flex items-center justify-center">2</span>
                    <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1">
                      <Users className="w-4 h-4 text-[#8b1818]" />
                      調遣參戰將領 (最多 2 座城池，每城最多 5 人)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-100 border border-amber-300 text-amber-900 px-2 py-0.5 rounded font-black">
                      已選城池: <strong>{participatingCityIds.length}</strong> / 2 ‧ 總出征將領: <strong className="text-[#8b1818] text-sm">{totalSelectedCount}</strong> / 10
                    </span>
                  </div>
                </div>

                {/* 城市分頁標籤 */}
                <div className="flex flex-wrap gap-1.5">
                  {alliedProvincesConnectedToTarget.map((city, idx) => {
                    const stats = citySelectionStats[city.id] || { count: 0, generals: [], troops: 0 };
                    const isActive = idx === activeCityIndex;
                    const isParticipating = stats.count > 0;
                    const roleTag = participatingCityIds[0] === city.id 
                      ? '發起主城' 
                      : participatingCityIds[1] === city.id 
                      ? '援軍城池' 
                      : '';

                    return (
                      <button
                        key={city.id}
                        onClick={() => setActiveCityIndex(idx)}
                        className={`px-2.5 py-1.5 border-2 rounded-lg transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'border-[#8b1818] bg-[#8b1818] text-white shadow-sm font-black'
                            : isParticipating
                            ? 'border-red-600 bg-rose-50 text-red-950 font-bold'
                            : 'border-stone-300 bg-white text-stone-800 hover:border-stone-500 font-bold'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{city.info?.name} ({city.id}郡)</span>
                        {roleTag && (
                          <span className={`text-[10px] px-1 py-0.2 rounded font-black border ${
                            isActive ? 'bg-amber-300 text-stone-900 border-amber-400' : 'bg-red-200 text-red-900 border-red-400'
                          }`}>
                            {roleTag}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                          isActive
                            ? 'bg-amber-300 text-stone-900 border-amber-400'
                            : stats.count > 0
                            ? 'bg-rose-100 text-red-800 border-red-300'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}>
                          {stats.count}/5 人
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 當前選定城市之武將清單 */}
              {currentCityObj && (
                <div className="p-3">
                  <div className="bg-stone-50 border border-stone-300 p-2 rounded-lg mb-2.5 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-stone-900">
                        【{currentCityObj.info?.name}】駐軍名冊
                      </span>
                      <span className="text-xs text-stone-600 font-bold">
                        (城中金: <strong className="text-amber-800">{currentCityObj.state?.gold}</strong> ‧ 
                        糧: <strong className="text-emerald-800">{currentCityObj.state?.food}</strong>)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-stone-700">
                        本城已派出: <strong className="text-sm text-[#8b1818]">{citySelectionStats[currentCityObj.id]?.count || 0}</strong>/5
                      </span>
                      <button
                        onClick={handleSelectAllCurrentCity}
                        className="text-xs px-2 py-0.5 border border-stone-400 bg-white hover:bg-stone-100 font-bold rounded cursor-pointer"
                      >
                        選前5人
                      </button>
                      <button
                        onClick={handleClearCurrentCity}
                        className="text-xs px-2 py-0.5 border border-stone-400 bg-white hover:bg-stone-100 font-bold rounded text-stone-600 cursor-pointer"
                      >
                        清空
                      </button>
                    </div>
                  </div>

                  {currentCityGenerals.length === 0 ? (
                    <div className="text-center py-6 text-stone-500 font-bold bg-stone-50 border border-dashed border-stone-300 rounded-lg">
                      此城池目前無駐守武將
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                      {currentCityGenerals.map(g => {
                        const isChecked = !!selectedGenerals[g.name];
                        const thisCityCount = citySelectionStats[currentCityObj.id]?.count || 0;
                        const isCityLockedOut = !isChecked && thisCityCount === 0 && participatingCityIds.length >= 2 && !participatingCityIds.includes(currentCityObj.id);
                        const isCityFull = !isChecked && thisCityCount >= 5;
                        const isDisabled = g.hasActed || isCityLockedOut || isCityFull;
                        const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                        // 預測戰力修正 (取最高陣型)
                        const availableForms = getGeneralAvailableFormations(g);
                        const bestFormMod = availableForms.reduce((best, f) => {
                          const modResult = battleCombatCalculator(f, targetProvinceId, g);
                          return modResult.totalCombatModifier > best ? modResult.totalCombatModifier : best;
                        }, 0);
                        const expectedModStr = bestFormMod > 0 ? `+${Math.round((bestFormMod - 1) * 100)}%` : '0%';

                        return (
                          <div
                            key={g.name}
                            onClick={() => toggleSelectGeneral(g.name, currentCityObj.id, g.hasActed)}
                            className={`p-2.5 border-2 transition-all rounded-lg flex items-center justify-between shadow-xs ${
                              isChecked
                                ? 'border-[#8b1818] bg-amber-50/90 ring-1 ring-[#8b1818]'
                                : 'border-stone-300 bg-white'
                            } ${
                              isDisabled && !isChecked
                                ? 'opacity-50 bg-stone-200/80 cursor-not-allowed'
                                : 'cursor-pointer hover:border-stone-500 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                disabled={isDisabled && !isChecked}
                                checked={isChecked}
                                onChange={() => toggleSelectGeneral(g.name, currentCityObj.id, g.hasActed)}
                                className="w-4 h-4 accent-[#8b1818] cursor-pointer"
                              />
                              <GeneralAvatar name={g.name} size={36} className="shrink-0 rounded shadow-xs" />
                              <div>
                                <div className="font-black text-sm flex items-center gap-1.5">
                                  <span className="text-stone-900">{g.name}</span>
                                  {g.hasActed && (
                                    <span className="text-[10px] bg-stone-300 text-stone-700 px-1 py-0.2 rounded font-bold">
                                      已行動
                                    </span>
                                  )}
                                  {isChecked && (
                                    <span className="text-[10px] bg-[#8b1818] text-white px-1.5 py-0.2 rounded font-black">
                                      出征
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-600 flex gap-2 mt-0.5">
                                  <span>兵: <strong className="text-[#8b1818]">{g.soldiers}</strong></span>
                                  <span>武: <strong>{g.str + itemBonus.strBonus}</strong></span>
                                  <span>智: <strong>{g.int + itemBonus.intBonus}</strong></span>
                                  <span>適性: <strong className="text-amber-700">{expectedModStr}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right text-xs">
                              {isChecked ? (
                                <span className="text-xs font-black text-[#8b1818]">✓ 參戰</span>
                              ) : isCityLockedOut ? (
                                <span className="text-[10px] text-stone-400">已達2城上限</span>
                              ) : isCityFull ? (
                                <span className="text-[10px] text-stone-400">已滿5人</span>
                              ) : (
                                <span className="text-[11px] text-stone-400">點選出戰</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 步驟三：指派隨軍軍師 (從全部出征武將中選一) */}
          {totalSelectedCount > 0 && (
            <div className="bg-[#f7f5f0] border-2 border-[#3d3227] rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-stone-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8b1818] text-white text-xs font-black flex items-center justify-center">3</span>
                  <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1">
                    <Compass className="w-4 h-4 text-[#8b1818]" />
                    指派全軍隨軍軍師 (從全部出征武將中挑選)
                  </h3>
                </div>
                <span className="text-xs text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                  {strategist ? `已任命【${strategist}】` : '尚未指派軍師'}
                </span>
              </div>

              <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                隨軍軍師只能由<strong>謀略（智力）≥ 80</strong> 之出征將領擔任。隨軍軍師可在戰鬥中即時<strong>號令全軍變換八大陣形</strong>，未指派軍師時戰場將無法變陣！
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {/* 選項：不指派軍師 */}
                <button
                  onClick={() => setStrategist(null)}
                  className={`p-2.5 border-2 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                    strategist === null
                      ? 'border-stone-800 bg-stone-200 text-stone-900 font-black ring-2 ring-stone-800'
                      : 'border-stone-300 bg-white hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs">（無隨軍軍師）</span>
                    <p className="text-[10px] text-stone-500 mt-0.5">戰鬥中將無法在局內變陣</p>
                  </div>
                  {strategist === null && <Check className="w-4 h-4 text-stone-800" />}
                </button>

                {/* 選項：出征將領候選人 */}
                {allSelectedGeneralNames.map(gName => {
                  const gen = gameState.generalsData[gName];
                  if (!gen) return null;
                  const isChosen = strategist === gName;
                  const itemBonus = getGeneralItemBonus(gen.name, gameState.currentScenario);
                  const totalInt = gen.int + itemBonus.intBonus;
                  const canBeStrategist = totalInt >= 80;

                  return (
                    <button
                      key={gName}
                      disabled={!canBeStrategist}
                      onClick={() => {
                        if (canBeStrategist) {
                          setStrategist(gName);
                        }
                      }}
                      className={`p-2.5 border-2 rounded-lg text-left transition-all flex items-center justify-between ${
                        !canBeStrategist
                          ? 'border-stone-200 bg-stone-100 text-stone-400 opacity-60 cursor-not-allowed'
                          : isChosen
                          ? 'border-[#8b1818] bg-amber-50 text-stone-900 font-black ring-2 ring-[#8b1818] shadow-sm cursor-pointer'
                          : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50 text-stone-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <GeneralAvatar name={gName} size={36} className="shrink-0 rounded shadow-xs" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm">{gName}</span>
                            {totalInt >= 90 ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold border border-emerald-300">
                                推薦
                              </span>
                            ) : !canBeStrategist ? (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold border border-red-300">
                                智力不足80
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-stone-600 mt-0.5">
                            智力: <strong className={canBeStrategist ? 'text-[#8b1818]' : 'text-stone-400'}>{totalInt}</strong> ‧ 
                            武力: {gen.str + itemBonus.strBonus}
                          </div>
                        </div>
                      </div>
                      {isChosen && <Crown className="w-4 h-4 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 步驟四：依出城城池配置隨軍軍糧與金錢 (各城獨立配置) */}
          {participatingCityIds.length > 0 && (
            <div className="bg-[#f7f5f0] border-2 border-[#3d3227] rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-stone-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#8b1818] text-white text-xs font-black flex items-center justify-center">4</span>
                  <h3 className="font-black text-sm sm:text-base text-stone-900 flex items-center gap-1">
                    <Wheat className="w-4 h-4 text-emerald-700" />
                    各出征城池獨立配置隨軍錢糧
                  </h3>
                </div>
                <div className="text-xs text-stone-700 font-bold flex items-center gap-2">
                  <span>總軍金: <strong className="text-amber-800 text-sm">{totalGoldBrought.toLocaleString()}</strong></span>
                  <span>|</span>
                  <span>總軍糧: <strong className="text-emerald-800 text-sm">{totalFoodBrought.toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="space-y-3">
                {participatingCityIds.map((pId, idx) => {
                  const pInfo = provinces.find(p => p.id === pId);
                  const pState = gameState.provincesData[pId];
                  const cStats = citySelectionStats[pId];
                  const prov = cityProvisions[pId] || { gold: 0, food: 0 };
                  if (!pInfo || !pState) return null;

                  const roleTitle = idx === 0 ? '🏰 發起主城' : '🚩 援軍城池';
                  const cityTroops = cStats?.troops || 0;
                  const estimatedFood30Days = Math.ceil((cityTroops / 10) * 30);

                  return (
                    <div key={pId} className="bg-white border-2 border-stone-300 rounded-lg p-3 shadow-xs">
                      <div className="flex justify-between items-center mb-2 pb-1 border-b border-stone-200">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-stone-900">
                            {roleTitle}：【{pInfo.name}】
                          </span>
                          <span className="text-xs text-stone-500 font-bold">
                            (出兵 {cStats?.count} 人 ‧ {cityTroops.toLocaleString()} 兵馬)
                          </span>
                        </div>
                        <span className="text-xs text-stone-600 font-bold">
                          城庫現存：金 <strong className="text-amber-800">{pState.gold.toLocaleString()}</strong> ‧ 糧 <strong className="text-emerald-800">{pState.food.toLocaleString()}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* 糧草配置 */}
                        <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                          <div className="flex justify-between items-center text-xs font-bold mb-1">
                            <span className="text-emerald-800 flex items-center gap-1 font-black">
                              <Wheat className="w-3.5 h-3.5" />
                              隨軍糧草配給
                            </span>
                            <span className="text-emerald-900 font-black text-sm">
                              {prov.food.toLocaleString()} / {pState.food.toLocaleString()}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={pState.food}
                            value={prov.food}
                            onChange={(e) => handleUpdateCityProvision(pId, 'food', Number(e.target.value))}
                            className="w-full accent-emerald-600 my-1 cursor-pointer"
                          />

                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'food', Math.min(pState.food, estimatedFood30Days))}
                              className="text-[10px] px-1.5 py-0.5 border border-emerald-600 bg-emerald-50 text-emerald-900 rounded font-black cursor-pointer"
                            >
                              30日推薦 ({estimatedFood30Days})
                            </button>
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'food', Math.min(pState.food, Math.ceil((cityTroops / 10) * 60)))}
                              className="text-[10px] px-1.5 py-0.5 border border-stone-300 bg-white rounded font-bold cursor-pointer"
                            >
                              60日充裕
                            </button>
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'food', pState.food)}
                              className="text-[10px] px-1.5 py-0.5 border border-stone-300 bg-white rounded font-bold cursor-pointer"
                            >
                              全部糧草
                            </button>
                          </div>
                        </div>

                        {/* 軍金配置 */}
                        <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                          <div className="flex justify-between items-center text-xs font-bold mb-1">
                            <span className="text-amber-800 flex items-center gap-1 font-black">
                              <Coins className="w-3.5 h-3.5" />
                              隨軍軍金配給
                            </span>
                            <span className="text-amber-900 font-black text-sm">
                              {prov.gold.toLocaleString()} / {pState.gold.toLocaleString()}
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max={pState.gold}
                            value={prov.gold}
                            onChange={(e) => handleUpdateCityProvision(pId, 'gold', Number(e.target.value))}
                            className="w-full accent-amber-600 my-1 cursor-pointer"
                          />

                          <div className="flex flex-wrap gap-1 mt-1">
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'gold', Math.min(pState.gold, 500))}
                              className="text-[10px] px-1.5 py-0.5 border border-amber-600 bg-amber-50 text-amber-900 rounded font-black cursor-pointer"
                            >
                              500 金
                            </button>
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'gold', Math.min(pState.gold, 1000))}
                              className="text-[10px] px-1.5 py-0.5 border border-stone-300 bg-white rounded font-bold cursor-pointer"
                            >
                              1,000 金
                            </button>
                            <button
                              onClick={() => handleUpdateCityProvision(pId, 'gold', pState.gold)}
                              className="text-[10px] px-1.5 py-0.5 border border-stone-300 bg-white rounded font-bold cursor-pointer"
                            >
                              全部資金
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 底部確認按鈕 */}
      <div className="p-3 border-t-2 border-[#3d3227] bg-[#231e1a] flex flex-col items-center gap-1 shadow-2xl shrink-0">
        <button
          disabled={totalSelectedCount === 0 || !targetProvinceId}
          onClick={handleLaunch}
          className={`w-full max-w-xl py-2.5 sm:py-3 font-black text-sm sm:text-base border-2 rounded-lg transition-all text-white cursor-pointer flex items-center justify-center gap-2 shadow-lg
            ${totalSelectedCount > 0 && targetProvinceId 
              ? 'bg-[#8b1818] border-red-600 hover:bg-red-700 active:scale-98' 
              : 'bg-stone-700 border-stone-600 cursor-not-allowed opacity-50'}
          `}
        >
          <Swords className="w-5 h-5 text-amber-400" />
          <span>
            確認出征！排定進軍方案 ({participatingCityIds.length} 座城池 ‧ {totalSelectedCount} 位將領 ‧ {totalTroops.toLocaleString()} 兵力)
          </span>
        </button>
        <span className="text-[11px] text-stone-400 font-bold">
          ※ 確定後全軍將於本月『休息』時正式發動進攻，進入戰前陣形配置與順序調整！
        </span>
      </div>
    </div>
  );
}
