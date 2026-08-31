import React, { useState, useMemo } from 'react';
import { GameState, ProvinceState, GeneralState } from '../types';
import { provinces } from '../data/provinces';
import { GeneralAvatar } from './GeneralAvatar';
import { 
  Shield, 
  Users, 
  MapPin, 
  Swords, 
  AlertTriangle, 
  Check, 
  Wheat, 
  Coins, 
  Building2, 
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DefenseSetupModalProps {
  gameState: GameState;
  targetProvinceId: number;
  attackerRuler: string;
  attackingGenerals: string[];
  onConfirmDefenseSetup: (setup: {
    defendingGenerals: string[];
    defenderReinforceProvinceId: number | null;
    reinforceGold: number;
    reinforceFood: number;
    defenderGeneralOrigins: Record<string, number>;
    defenderResourcesDeducted: Record<number, { gold: number; food: number }>;
    totalDefendingFood: number;
    totalDefendingGold: number;
  }) => void;
  onRetreat?: () => void;
}

export default function DefenseSetupModal({
  gameState,
  targetProvinceId,
  attackerRuler,
  attackingGenerals,
  onConfirmDefenseSetup,
  onRetreat
}: DefenseSetupModalProps) {
  const targetProvConfig = provinces.find(p => p.id === targetProvinceId);
  const targetProvName = targetProvConfig?.name || '主城';
  const targetProvState = gameState.provincesData[targetProvinceId] || {
    id: targetProvinceId,
    gold: 2000,
    food: 5000,
    rulerName: gameState.rulerName
  };

  // 1. 本城防守武將 (全數參戰 - 需求 2)
  const baseDefendingGenerals = useMemo(() => {
    return Object.values(gameState.generalsData).filter(
      g => g.provinceId === targetProvinceId && !g.isWild
    );
  }, [gameState.generalsData, targetProvinceId]);

  // 2. 尋找與被襲城池相鄰且同屬我方的援軍城池 (需求 1: 最多一個城市援軍)
  const adjacentAlliedProvinces = useMemo(() => {
    if (!targetProvConfig) return [];
    return targetProvConfig.connections
      .map(cId => {
        const pConf = provinces.find(p => p.id === cId);
        const pState = gameState.provincesData[cId];
        const gens = Object.values(gameState.generalsData).filter(
          g => g.provinceId === cId && !g.isWild
        );
        return {
          id: cId,
          name: pConf?.name || `郡${cId}`,
          state: pState,
          generals: gens,
          rulerName: pState?.rulerName
        };
      })
      .filter(p => p.rulerName === gameState.rulerName && p.generals.length > 0);
  }, [targetProvConfig, gameState.provincesData, gameState.generalsData, gameState.rulerName]);

  // 選擇的援軍城池 ID (null 代表不派援軍)
  const [selectedReinforceCityId, setSelectedReinforceCityId] = useState<number | null>(
    adjacentAlliedProvinces.length > 0 ? adjacentAlliedProvinces[0].id : null
  );

  // 選中援軍城池物件
  const activeReinforceCity = useMemo(() => {
    return adjacentAlliedProvinces.find(p => p.id === selectedReinforceCityId) || null;
  }, [adjacentAlliedProvinces, selectedReinforceCityId]);

  // 選擇的援軍武將 (最多 5 將 - 需求 1)
  const [selectedReinforceGenerals, setSelectedReinforceGenerals] = useState<string[]>(() => {
    if (adjacentAlliedProvinces.length > 0) {
      return adjacentAlliedProvinces[0].generals.slice(0, 5).map(g => g.name);
    }
    return [];
  });

  // 援軍攜帶資源配置 (需求 5: 增援前配置)
  const [reinforceGold, setReinforceGold] = useState<number>(0);
  const [reinforceFood, setReinforceFood] = useState<number>(() => {
    if (adjacentAlliedProvinces.length > 0) {
      const cityFood = adjacentAlliedProvinces[0].state?.food || 0;
      return Math.min(cityFood, 3000);
    }
    return 0;
  });

  // 當切換援軍城市時，重設武將與糧草預設
  const handleSelectCity = (cId: number | null) => {
    setSelectedReinforceCityId(cId);
    if (cId === null) {
      setSelectedReinforceGenerals([]);
      setReinforceGold(0);
      setReinforceFood(0);
    } else {
      const cityObj = adjacentAlliedProvinces.find(p => p.id === cId);
      if (cityObj) {
        setSelectedReinforceGenerals(cityObj.generals.slice(0, 5).map(g => g.name));
        const maxF = cityObj.state?.food || 0;
        setReinforceFood(Math.min(maxF, 3000));
        setReinforceGold(0);
      }
    }
  };

  const toggleReinforceGeneral = (genName: string) => {
    if (selectedReinforceGenerals.includes(genName)) {
      setSelectedReinforceGenerals(prev => prev.filter(n => n !== genName));
    } else {
      if (selectedReinforceGenerals.length >= 5) {
        return; // 最多 5 將 (需求 1)
      }
      setSelectedReinforceGenerals(prev => [...prev, genName]);
    }
  };

  // 需求 4: 玩家是防守端，主城軍糧金錢全部攜帶
  const targetCityFood = targetProvState.food ?? 5000;
  const targetCityGold = targetProvState.gold ?? 2000;

  // 總參戰武將與糧草計算
  const totalGeneralsCount = baseDefendingGenerals.length + selectedReinforceGenerals.length;
  const totalBattleFood = targetCityFood + reinforceFood;
  const totalBattleGold = targetCityGold + reinforceGold;

  // 確認佈防
  const handleConfirm = () => {
    const combinedDefendingGenerals = [
      ...baseDefendingGenerals.map(g => g.name),
      ...selectedReinforceGenerals
    ];

    const defenderGeneralOrigins: Record<string, number> = {};
    baseDefendingGenerals.forEach(g => {
      defenderGeneralOrigins[g.name] = targetProvinceId;
    });
    selectedReinforceGenerals.forEach(gName => {
      if (selectedReinforceCityId) {
        defenderGeneralOrigins[gName] = selectedReinforceCityId;
      }
    });

    const defenderResourcesDeducted: Record<number, { gold: number; food: number }> = {};
    if (selectedReinforceCityId && (reinforceGold > 0 || reinforceFood > 0)) {
      defenderResourcesDeducted[selectedReinforceCityId] = {
        gold: reinforceGold,
        food: reinforceFood
      };
    }

    onConfirmDefenseSetup({
      defendingGenerals: combinedDefendingGenerals,
      defenderReinforceProvinceId: selectedReinforceCityId,
      reinforceGold,
      reinforceFood,
      defenderGeneralOrigins,
      defenderResourcesDeducted,
      totalDefendingFood: totalBattleFood,
      totalDefendingGold: totalBattleGold
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-serif select-none bg-[#141210] text-stone-200 overflow-hidden">
      {/* 頂部告急 Banner */}
      <div className="bg-gradient-to-r from-red-950 via-[#3a1a16] to-[#1e1512] border-b-2 border-red-700/80 px-4 py-2.5 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-red-200 tracking-wider">
                🚨【緊急軍情】防守禦敵 ‧ 派遣援軍配置
              </h2>
              <span className="text-[10px] bg-red-900/80 border border-red-600 text-rose-200 px-1.5 py-0.5 rounded font-black">
                敵襲警報
              </span>
            </div>
            <p className="text-xs text-stone-300">
              敵軍勢力【<strong className="text-amber-300">{attackerRuler}</strong>】率領大軍【{attackingGenerals.join('、')}】進犯我方【<strong className="text-amber-300">{targetProvName}</strong>】！
            </p>
          </div>
        </div>

        {onRetreat && (
          <button
            onClick={onRetreat}
            className="px-3 py-1 bg-[#2b1f1a] hover:bg-[#3d2b24] border border-[#5a4336] rounded text-xs font-bold text-stone-300 cursor-pointer"
          >
            放棄抵抗 (撤退)
          </button>
        )}
      </div>

      {/* 主內容區：雙欄排版 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 bg-radial from-[#1e1814] to-[#120f0d]">
        
        {/* 左側欄：防守城池本陣狀況 (佔 5 欄) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* 主城基本情報卡 */}
          <div className="bg-[#1f1914] border-2 border-[#47392d] rounded-xl p-3.5 shadow-md flex flex-col gap-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-[#3b2e23]">
              <span className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                守城本陣：【{targetProvName}】
              </span>
              <span className="text-xs text-stone-400">郡號: {targetProvinceId}</span>
            </div>

            {/* 本城軍糧金錢全額投入說明 (需求 4) */}
            <div className="bg-[#15120f] border border-[#3a2d22] rounded-lg p-2.5 flex flex-col gap-1.5">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                守城物資：全數投入禦敵 (需求 4)
              </span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex items-center gap-2 bg-[#221c17] p-2 rounded border border-[#443528]">
                  <Wheat className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block">守城軍糧 (全帶)</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      {targetCityFood.toLocaleString()} 🌾
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#221c17] p-2 rounded border border-[#443528]">
                  <Coins className="w-5 h-5 text-yellow-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block">守城金錢 (全帶)</span>
                    <span className="text-xs sm:text-sm font-black text-yellow-300">
                      {targetCityGold.toLocaleString()} 💰
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                ※ 守方主城庫存全部金錢與糧草自動攜入戰場，防守成功後剩餘物資將原數保留於本城。
              </p>
            </div>

            {/* 本城駐守將領清單 (需求 2: 超過 5 人全部皆可上陣) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-stone-200 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  本城駐守守將 ({baseDefendingGenerals.length} 員，全體參戰)
                </span>
                <span className="text-[10px] text-amber-400 font-bold">全員出征待命</span>
              </div>

              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {baseDefendingGenerals.length === 0 ? (
                  <div className="p-3 text-center text-xs text-rose-400 bg-rose-950/20 border border-rose-800/40 rounded-lg">
                    ⚠️ 本城無駐守武將！請務必派遣相鄰城池援軍！
                  </div>
                ) : (
                  baseDefendingGenerals.map((g, idx) => (
                    <div
                      key={g.name}
                      className="p-2 rounded-lg bg-[#261f19] border border-[#3e3125] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <GeneralAvatar name={g.name} size={30} className="shrink-0" />
                        <div>
                          <span className="font-black text-xs text-stone-100">{g.name}</span>
                          <div className="text-[10px] text-stone-400 flex gap-2">
                            <span>兵力: <strong className="text-sky-300">{g.soldiers.toLocaleString()}</strong></span>
                            <span>武: {g.str}</span>
                            <span>智: {g.int}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
                        本陣參戰
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右側欄：相鄰援軍城市與增援配置 (佔 7 欄 - 需求 1 & 5) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="bg-[#1f1914] border-2 border-[#47392d] rounded-xl p-3.5 shadow-md flex-1 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#3b2e23]">
              <span className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                派遣相鄰援軍 (最多 1 城，最多 5 將)
              </span>
              <span className="text-xs text-stone-400 font-bold">
                相鄰我方城池: {adjacentAlliedProvinces.length} 座
              </span>
            </div>

            {/* 援軍城市選擇 (單選卡片) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-stone-300">選擇增援出兵城市：</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 選項 0: 不派援軍 */}
                <button
                  type="button"
                  onClick={() => handleSelectCity(null)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedReinforceCityId === null
                      ? 'border-amber-400 bg-[#3a2d20] text-amber-200 ring-1 ring-amber-400'
                      : 'border-[#382d22] bg-[#16120e] text-stone-400 hover:border-[#4d3d2e] hover:bg-[#201a14]'
                  }`}
                >
                  <div>
                    <span className="font-black text-xs block">🛡️ 不派遣援軍</span>
                    <span className="text-[10px] text-stone-500">僅由本城守將浴血應戰</span>
                  </div>
                  {selectedReinforceCityId === null && <Check className="w-4 h-4 text-amber-400" />}
                </button>

                {/* 相鄰城池選項清單 */}
                {adjacentAlliedProvinces.map(city => {
                  const isSelected = selectedReinforceCityId === city.id;
                  const cFood = city.state?.food || 0;
                  const cGold = city.state?.gold || 0;

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectCity(city.id)}
                      className={`p-2.5 rounded-lg border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-[#3a2d20] text-amber-100 ring-1 ring-amber-400'
                          : 'border-[#382d22] bg-[#16120e] text-stone-300 hover:border-[#4d3d2e] hover:bg-[#201a14]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-amber-300">【{city.name}】</span>
                          <span className="text-[10px] bg-[#2a221b] px-1 rounded text-stone-400">
                            {city.generals.length} 將
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 flex gap-2 mt-0.5">
                          <span>糧: {cFood.toLocaleString()}</span>
                          <span>金: {cGold.toLocaleString()}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 若選擇了援軍城池：配置援將 (最多5人) 與攜帶物資 (需求 1 & 5) */}
            {activeReinforceCity && (
              <div className="bg-[#171310] border border-[#3a2e23] rounded-xl p-3 flex flex-col gap-3 mt-1">
                {/* 援將勾選 (最多 5 人) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      挑選【{activeReinforceCity.name}】援軍武將 (已選 {selectedReinforceGenerals.length} / 5 人)
                    </span>
                    <span className="text-[10px] text-stone-400 font-bold">點擊勾選/取消</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {activeReinforceCity.generals.map(g => {
                      const isChecked = selectedReinforceGenerals.includes(g.name);
                      return (
                        <div
                          key={g.name}
                          onClick={() => toggleReinforceGeneral(g.name)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            isChecked
                              ? 'border-amber-400 bg-[#35281d] text-amber-100'
                              : 'border-[#33271d] bg-[#1a1410] text-stone-400 hover:border-[#4d3a2b]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <GeneralAvatar name={g.name} size={28} className="shrink-0" />
                            <div>
                              <span className="font-black text-xs text-stone-100">{g.name}</span>
                              <div className="text-[10px] text-stone-400 flex gap-2">
                                <span>兵: {g.soldiers.toLocaleString()}</span>
                                <span>武: {g.str}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'bg-amber-500 border-amber-300 text-stone-950' : 'border-stone-600 bg-stone-800'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 援軍攜帶金錢與軍糧配置 (需求 5: 增援前配置) */}
                <div className="pt-2 border-t border-[#33271d] flex flex-col gap-2">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                    <Wheat className="w-3.5 h-3.5 text-amber-400" />
                    援軍隨軍攜帶物資配置 (從【{activeReinforceCity.name}】調撥)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 軍糧配置 */}
                    <div className="bg-[#1f1914] p-2 rounded-lg border border-[#3b2e23] flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-300 font-bold">攜帶軍糧：</span>
                        <span className="font-black text-amber-300">{reinforceFood.toLocaleString()} 🌾</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={activeReinforceCity.state?.food || 0}
                        step="100"
                        value={reinforceFood}
                        onChange={(e) => setReinforceFood(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded"
                      />
                      <div className="flex justify-between text-[10px] text-stone-500">
                        <span>0</span>
                        <span>上限: {(activeReinforceCity.state?.food || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 金錢配置 */}
                    <div className="bg-[#1f1914] p-2 rounded-lg border border-[#3b2e23] flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-300 font-bold">攜帶軍金：</span>
                        <span className="font-black text-yellow-300">{reinforceGold.toLocaleString()} 💰</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={activeReinforceCity.state?.gold || 0}
                        step="100"
                        value={reinforceGold}
                        onChange={(e) => setReinforceGold(Number(e.target.value))}
                        className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-stone-800 rounded"
                      />
                      <div className="flex justify-between text-[10px] text-stone-500">
                        <span>0</span>
                        <span>上限: {(activeReinforceCity.state?.gold || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部總計與確認按鈕 */}
      <div className="bg-[#1b1612] border-t-2 border-[#47392d] px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 shadow-2xl">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-stone-300 font-bold">
            ⚔️ 防守總陣容：<strong className="text-amber-300">{totalGeneralsCount}</strong> 員大將
            <span className="text-stone-400 ml-1">
              (本城 {baseDefendingGenerals.length} + 援軍 {selectedReinforceGenerals.length})
            </span>
          </span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-300 font-bold">
            🌾 守城總兵糧：<strong className="text-amber-400">{totalBattleFood.toLocaleString()}</strong> 🌾
          </span>
          <span className="text-stone-400">|</span>
          <span className="text-stone-300 font-bold">
            💰 守城總金錢：<strong className="text-yellow-400">{totalBattleGold.toLocaleString()}</strong> 💰
          </span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={totalGeneralsCount === 0}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-amber-400 text-stone-950 font-black text-sm sm:text-base rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>確認防禦部署 ‧ 安排出戰陣形</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
