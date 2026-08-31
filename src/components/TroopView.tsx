import React, { useState, useEffect, useMemo } from 'react';
import { GameState, GeneralState } from '../types';
import { getGeneralItemBonus } from '../data/items';
import { GeneralAvatar } from './GeneralAvatar';
import { 
  getProvinceTierRules, 
  calculateDraftCost, 
  calculateDraftDiscountRate, 
  calculateMaxProvinceDraft,
  calculateTroopTrainingGain 
} from '../data/historicalProvinceConfig';
import { PROVINCE_BASE_CONFIGS } from '../data/provinceBaseConfig';

interface TroopViewProps {
  gameState: GameState;
  initialAction: string;
  onExit: () => void;
  onExecute: (category: string, action: string, payload?: any, generalName?: string) => void;
}

export default function TroopView({ gameState, initialAction, onExit, onExecute }: TroopViewProps) {
  // Normalize tab names
  const normalizedInitialTab = initialAction === '調整兵力' ? '編制兵力' : (initialAction || '徵兵');
  const [activeTab, setActiveTab] = useState<'徵兵' | '訓練兵士' | '編制兵力'>(
    ['徵兵', '訓練兵士', '編制兵力'].includes(normalizedInitialTab) 
      ? (normalizedInitialTab as any) 
      : '徵兵'
  );

  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const provinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);
    
  const province = gameState.provincesData[provinceId] || null;
  const provinceBase = PROVINCE_BASE_CONFIGS[provinceId] || null;
  const provinceName = provinceBase?.name || `郡縣 ${provinceId}`;
  const tierRules = getProvinceTierRules(provinceId);

  const generals = Object.values(gameState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild);
  const availableGenerals = generals.filter(g => !g.hasActed);

  // Total soldiers currently in this province (reserve + stationed generals)
  const totalGarrison = useMemo(() => {
    return (province?.soldiers || 0) + generals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
  }, [province?.soldiers, generals]);

  // Total capacity available among all generals in this province
  const totalGeneralsCapacity = useMemo(() => {
    return generals.reduce((sum, g) => sum + Math.max(0, g.maxTroops - g.soldiers), 0);
  }, [generals]);

  // ===================== 1. 徵兵 (DRAFT) STATE =====================
  const [draftHostGen, setDraftHostGen] = useState<string | null>(
    availableGenerals.length > 0 ? availableGenerals[0].name : null
  );

  // Allocations of new recruits per general: generalName -> recruits to recruit
  const [draftAllocations, setDraftAllocations] = useState<Record<string, number>>({});

  const hostGenData = draftHostGen ? gameState.generalsData[draftHostGen] : null;
  const hostBonus = hostGenData ? getGeneralItemBonus(hostGenData.name, gameState.currentScenario) : { chaBonus: 0, strBonus: 0, intBonus: 0 };
  const effectiveCha = hostGenData ? hostGenData.cha + hostBonus.chaBonus : 50;
  const draftDiscountRate = calculateDraftDiscountRate(effectiveCha);
  const draftDiscountPct = Math.round(draftDiscountRate * 100);

  // Max recruit limits:
  // 1. Population formula based on available surplus above minPopulation, hard-capped at 5000
  const maxDraftPop = province ? calculateMaxProvinceDraft(province.population, tierRules.minPopulation) : 0;
  // 2. Gold limit (charm discount makes gold go further)
  const maxDraftGold = province ? (draftDiscountRate >= 1 ? 99999 : Math.floor(province.gold / (1 - draftDiscountRate))) : 0;
  // 3. Generals space limit
  const maxDraftLimit = Math.min(5000, maxDraftPop, maxDraftGold, totalGeneralsCapacity);

  // Sum of currently allocated new recruits
  const totalDraftAmount = useMemo(() => {
    return Object.values(draftAllocations).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);
  }, [draftAllocations]);

  const draftGoldCost = useMemo(() => calculateDraftCost(totalDraftAmount, effectiveCha), [totalDraftAmount, effectiveCha]);
  const originalCost = totalDraftAmount;
  const goldSaved = Math.max(0, originalCost - draftGoldCost);

  // Check if this province has already drafted this turn/month
  const hasAlreadyDrafted = Boolean(province?.hasDraftedThisMonth);

  // Helper to safely set recruits for a specific general
  const handleSetGeneralDraft = (gName: string, desiredCount: number) => {
    const targetGen = gameState.generalsData[gName];
    if (!targetGen) return;

    const maxCap = Math.max(0, targetGen.maxTroops - targetGen.soldiers);
    const clampedCount = Math.max(0, Math.min(maxCap, desiredCount));

    // Calculate sum of other generals
    let otherSum = 0;
    Object.entries(draftAllocations).forEach(([k, v]) => {
      if (k !== gName) otherSum += (Number(v) || 0);
    });

    // Don't exceed total allowed draft limit
    const allowedForThisGen = Math.max(0, maxDraftLimit - otherSum);
    const finalCount = Math.min(clampedCount, allowedForThisGen);

    setDraftAllocations(prev => ({
      ...prev,
      [gName]: finalCount
    }));
  };

  // Quick preset distributions for new recruits
  const handleAutoDistributeDraft = (targetTotal: number) => {
    const totalToDistribute = Math.min(maxDraftLimit, Math.max(0, targetTotal));
    if (generals.length === 0 || totalToDistribute <= 0) {
      setDraftAllocations({});
      return;
    }

    let remaining = totalToDistribute;
    const newAlloc: Record<string, number> = {};

    // First initialize all to 0
    generals.forEach(g => { newAlloc[g.name] = 0; });

    // Distribute evenly among generals with capacity
    const eligibleGenerals = generals.filter(g => (g.maxTroops - g.soldiers) > 0);
    if (eligibleGenerals.length === 0) {
      setDraftAllocations({});
      return;
    }

    let changed = true;
    while (remaining > 0 && changed) {
      changed = false;
      const generalsWithRoom = eligibleGenerals.filter(g => {
        const current = newAlloc[g.name] || 0;
        const maxRoom = g.maxTroops - g.soldiers;
        return current < maxRoom;
      });

      if (generalsWithRoom.length === 0) break;

      const perGen = Math.max(1, Math.floor(remaining / generalsWithRoom.length));
      for (const g of generalsWithRoom) {
        if (remaining <= 0) break;
        const current = newAlloc[g.name] || 0;
        const maxRoom = g.maxTroops - g.soldiers;
        const add = Math.min(remaining, Math.min(perGen, maxRoom - current));
        if (add > 0) {
          newAlloc[g.name] = current + add;
          remaining -= add;
          changed = true;
        }
      }
    }

    setDraftAllocations(newAlloc);
  };

  const handleEliteFirstDraft = (targetTotal: number) => {
    const totalToDistribute = Math.min(maxDraftLimit, Math.max(0, targetTotal));
    const sorted = [...generals].sort((a, b) => {
      const aBonus = getGeneralItemBonus(a.name, gameState.currentScenario).strBonus;
      const bBonus = getGeneralItemBonus(b.name, gameState.currentScenario).strBonus;
      return (b.str + bBonus) - (a.str + aBonus);
    });

    let remaining = totalToDistribute;
    const newAlloc: Record<string, number> = {};
    generals.forEach(g => { newAlloc[g.name] = 0; });

    for (const g of sorted) {
      if (remaining <= 0) break;
      const room = Math.max(0, g.maxTroops - g.soldiers);
      const give = Math.min(remaining, room);
      newAlloc[g.name] = give;
      remaining -= give;
    }

    setDraftAllocations(newAlloc);
  };

  // ===================== 2. 訓練 (TRAIN) STATE =====================
  // All training is Whole-Province Garrison Training (全軍整體操練)
  const [trainInstructor, setTrainInstructor] = useState<string | null>(
    availableGenerals.length > 0 ? availableGenerals[0].name : null
  );

  const instructorData = trainInstructor ? gameState.generalsData[trainInstructor] : null;
  const instructorBonus = instructorData ? getGeneralItemBonus(instructorData.name, gameState.currentScenario) : { chaBonus: 0, strBonus: 0, intBonus: 0 };
  const instructorStr = instructorData ? instructorData.str + instructorBonus.strBonus : 50;

  // Calculate training preview for all generals with troops
  const trainingForecastList = useMemo(() => {
    return generals.map(g => {
      const soldiers = g.soldiers || 0;
      const curTraining = g.training || 50;
      const gain = soldiers > 0 ? calculateTroopTrainingGain(instructorStr, soldiers, curTraining) : 0;
      const nextTraining = Math.min(100, curTraining + gain);
      return {
        general: g,
        soldiers,
        curTraining,
        gain,
        nextTraining
      };
    });
  }, [generals, instructorStr]);

  // ===================== 3. 編制兵力 (ALLOCATION) STATE =====================
  const [reassignHostGen, setReassignHostGen] = useState<string | null>(
    availableGenerals.length > 0 ? availableGenerals[0].name : null
  );
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Synchronize defaults on tab change or province change
  useEffect(() => {
    if (availableGenerals.length > 0) {
      if (!draftHostGen || gameState.generalsData[draftHostGen]?.hasActed) {
        setDraftHostGen(availableGenerals[0].name);
      }
      if (!trainInstructor || gameState.generalsData[trainInstructor]?.hasActed) {
        setTrainInstructor(availableGenerals[0].name);
      }
      if (!reassignHostGen || gameState.generalsData[reassignHostGen]?.hasActed) {
        setReassignHostGen(availableGenerals[0].name);
      }
    }
  }, [activeTab, provinceId, availableGenerals.length]);

  useEffect(() => {
    const initAlloc: Record<string, number> = {};
    generals.forEach(g => {
      initAlloc[g.name] = g.soldiers || 0;
    });
    setAllocations(initAlloc);
  }, [provinceId, activeTab]);

  const allocatedTotal = useMemo(() => {
    return Object.values(allocations).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  }, [allocations]);

  const freeTroopPool = totalGarrison - allocatedTotal;

  if (!province) {
    return (
      <div className="w-full h-full bg-[#f2efeb] text-[#1c1917] flex flex-col font-serif absolute inset-0 z-50 p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2 text-[#991b1b]">尚未選擇領地</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選我方所屬之郡縣。</p>
          <button
            onClick={onExit}
            className="px-6 py-2 bg-[#991b1b] hover:bg-red-800 text-white font-bold border border-[#1c1917] shadow active:scale-95"
          >
            返回大地圖
          </button>
        </div>
      </div>
    );
  }

  // Handle Draft Execution
  const handleExecuteDraft = () => {
    if (!draftHostGen || totalDraftAmount <= 0 || hasAlreadyDrafted) return;
    onExecute('兵士', '徵兵', { 
      amount: totalDraftAmount, 
      allocations: draftAllocations 
    }, draftHostGen);
    onExit();
  };

  // Handle Train Execution (Whole Garrison Training)
  const handleExecuteTrain = () => {
    if (!trainInstructor) return;
    onExecute('兵士', '訓練兵士', { generalName: trainInstructor }, trainInstructor);
    onExit();
  };

  // Handle Reassign Execution
  const handleExecuteReassign = () => {
    if (!reassignHostGen) return;
    onExecute('兵士', '編制兵力', { allocations }, reassignHostGen);
    onExit();
  };

  // Quick Preset Allocations for Tab 3 (編制兵力)
  const handleBalanceAllocations = () => {
    if (generals.length === 0) return;
    const perGen = Math.floor(totalGarrison / generals.length);
    const remainder = totalGarrison % generals.length;
    const nextAlloc: Record<string, number> = {};
    generals.forEach((g, idx) => {
      const extra = idx === 0 ? remainder : 0;
      nextAlloc[g.name] = Math.min(g.maxTroops, perGen + extra);
    });
    setAllocations(nextAlloc);
  };

  const handleFocusElite = () => {
    if (generals.length === 0) return;
    const sorted = [...generals].sort((a, b) => {
      const aBonus = getGeneralItemBonus(a.name, gameState.currentScenario).strBonus;
      const bBonus = getGeneralItemBonus(b.name, gameState.currentScenario).strBonus;
      return (b.str + bBonus) - (a.str + aBonus);
    });
    let pool = totalGarrison;
    const nextAlloc: Record<string, number> = {};
    sorted.forEach(g => {
      const give = Math.min(pool, g.maxTroops);
      nextAlloc[g.name] = give;
      pool -= give;
    });
    setAllocations(nextAlloc);
  };

  const handleResetAllocations = () => {
    const initAlloc: Record<string, number> = {};
    generals.forEach(g => {
      initAlloc[g.name] = g.soldiers || 0;
    });
    setAllocations(initAlloc);
  };

  return (
    <div id="troop-view-root" className="w-full h-full bg-[#f2efeb] text-[#1c1917] flex flex-col font-serif absolute inset-0 z-50 overflow-hidden select-none">
      {/* Top Header Bar (Main Game UI Style) */}
      <header className="bg-[#1c1917] text-[#f2efeb] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#991b1b] border border-amber-400/40 flex items-center justify-center font-black text-amber-200 text-lg shadow-sm">
            兵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-amber-100 tracking-wider">
                【{provinceName}】兵備營帳
              </h2>
              <span className="text-xs px-2 py-0.5 bg-stone-800 text-stone-300 border border-stone-700 font-bold">
                {tierRules.tierName}
              </span>
              {hasAlreadyDrafted && (
                <span className="text-[11px] px-2 py-0.5 bg-red-950 text-red-200 border border-red-800 font-bold">
                  本月已徵兵
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-300">
              招募新卒、操演部隊與重編將領兵額，厚植軍事實力
            </p>
          </div>
        </div>

        {/* Province Key Resources Info */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-stone-900 border border-stone-700 px-2.5 py-1 text-[11px] sm:text-xs text-stone-200">
          <div>
            <span className="text-stone-400">人口: </span>
            <span className="font-bold text-amber-200">{province.population.toLocaleString()}</span>
          </div>
          <div className="w-px h-3 bg-stone-700" />
          <div>
            <span className="text-stone-400">金錢: </span>
            <span className="font-bold text-amber-400">{province.gold.toLocaleString()}金</span>
          </div>
          <div className="w-px h-3 bg-stone-700" />
          <div>
            <span className="text-stone-400">兵力: </span>
            <span className="font-bold text-red-400">{totalGarrison.toLocaleString()}人</span>
          </div>
        </div>

        <button
          onClick={onExit}
          className="border border-[#f2efeb] px-2.5 sm:px-3.5 py-1 text-xs uppercase hover:bg-white/10 active:scale-95 font-bold transition shrink-0"
        >
          ✕ 返回
        </button>
      </header>

      {/* Tab Switcher */}
      <nav className="bg-[#e7e3dc] border-b-2 border-[#1c1917] px-2 sm:px-4 py-1 flex gap-1.5 shrink-0 overflow-x-auto">
        {[
          { id: '徵兵', label: '🚩 徵兵募卒' },
          { id: '訓練兵士', label: '⚔️ 訓練操演' },
          { id: '編制兵力', label: '📋 編制兵力' },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 max-w-xs px-2 sm:px-3 py-1.5 border-2 transition text-center sm:text-left shrink-0 ${
                isActive
                  ? 'bg-[#991b1b] text-white border-[#1c1917] shadow-sm'
                  : 'bg-white/80 border-stone-400 text-stone-800 hover:bg-white'
              }`}
            >
              <div className="text-xs sm:text-sm font-black whitespace-nowrap">{tab.label}</div>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-2.5 sm:p-6 bg-[#f4f1ea]">
        {/* ===================== TAB 1: 徵兵募卒 ===================== */}
        {activeTab === '徵兵' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Monthly Limit Notice Banner */}
            {hasAlreadyDrafted ? (
              <div className="bg-red-50 border-2 border-red-400 p-3.5 text-xs text-red-950 flex items-start gap-3 shadow-sm">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-red-900 mb-0.5 break-words">
                    本郡本月已執行過徵兵！
                  </div>
                  <div className="leading-relaxed break-words whitespace-normal">
                    依古代徵兵法度，為保民生農耕，<strong>每座都市每回合（每月）僅限執行一次徵兵</strong>。本郡本月已募得新兵，需待下月（新回合）方可再次開帳募卒。
                  </div>
                </div>
              </div>
            ) : (
              /* Top Explanation & Formula Guide */
              <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-sm">
                <span className="text-base shrink-0">💡</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-amber-900 mb-1 break-words">
                    徵兵法則：民力動員率、單次5000人上限與魅力軍費減免
                  </div>
                  <div className="leading-relaxed break-words whitespace-normal space-y-1">
                    <p>• <strong>人口規模動員率</strong>：人口越多單次可徵量越大（以超出底限人口之 8% 安全動員，單次上限封頂 <strong>5,000 人</strong>），嚴格保護人口不低於規模下限。</p>
                    <p>• <strong>魅力節省軍資</strong>：魅力不限制招募人數，但主持募兵將領魅力越高，所耗金錢越低（例如劉備主持可節省逾 50% 金錢）。</p>
                    <p>• <strong>全郡兵員統籌</strong>：決定徵召總數後，可自由將新兵分配至麾下各位武將部隊。</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: 選擇主持募兵武將 */}
            <div className="bg-white/90 border border-stone-400 p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-2.5">
                <div className="font-black text-sm text-[#1c1917] flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">1</span>
                  選擇主持募兵將領 (魅力越高，徵兵軍資折扣越大)
                </div>
                <span className="text-xs text-stone-500 font-bold">
                  可行動：{availableGenerals.length} 人
                </span>
              </div>

              {availableGenerals.length === 0 ? (
                <div className="py-6 text-center text-stone-400 text-xs">
                  本郡本月已無待命將領可執行募兵
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {availableGenerals.map(g => {
                    const isSelected = draftHostGen === g.name;
                    const bonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                    const totalCha = g.cha + bonus.chaBonus;
                    const discRate = calculateDraftDiscountRate(totalCha);
                    const discPct = Math.round(discRate * 100);

                    return (
                      <button
                        key={g.name}
                        onClick={() => setDraftHostGen(g.name)}
                        disabled={hasAlreadyDrafted}
                        className={`p-2.5 border-2 text-left transition ${
                          isSelected
                            ? 'border-[#991b1b] bg-amber-50/80 ring-1 ring-[#991b1b]'
                            : 'border-stone-300 bg-white hover:border-stone-500'
                        } ${hasAlreadyDrafted ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <GeneralAvatar name={g.name} size={32} className="shrink-0 rounded shadow-xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs text-[#1c1917] truncate">{g.name}</span>
                              {g.isRuler && (
                                <span className="text-[10px] bg-[#991b1b] text-white px-1 py-0.2 font-bold shrink-0">君主</span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-600 mt-0.5 flex justify-between">
                              <span>魅力: <strong className="text-amber-800">{totalCha}</strong></span>
                              <span className="text-emerald-800 font-bold">省 {discPct}%</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: 徵兵總數控制與快速配置 */}
            <div className="bg-white/90 border border-stone-400 p-3.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-300 pb-2">
                <div className="font-black text-sm text-[#1c1917] flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">2</span>
                  全郡徵召新兵總額調配
                </div>
                <div className="text-xs text-stone-600">
                  本月可募上限：<strong className="text-[#991b1b] font-mono text-sm">{maxDraftLimit.toLocaleString()}</strong> 人
                  <span className="text-[11px] text-stone-500 ml-1.5">(單次封頂 5,000人 / 人口盈餘 8% 安全動員)</span>
                </div>
              </div>

              {/* Slider for Total Recruits */}
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={maxDraftLimit}
                  step={50}
                  value={totalDraftAmount}
                  disabled={hasAlreadyDrafted || maxDraftLimit <= 0}
                  onChange={e => handleAutoDistributeDraft(Number(e.target.value))}
                  className="flex-1 accent-[#991b1b] h-2.5 bg-stone-200 rounded cursor-pointer disabled:opacity-40"
                />
                <div className="w-32 text-right font-black text-lg text-[#991b1b] font-mono">
                  {totalDraftAmount.toLocaleString()} <span className="text-xs font-normal text-stone-600">人</span>
                </div>
              </div>

              {/* Preset Distribution Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200">
                <span className="text-xs font-bold text-stone-600">智慧分配：</span>
                <button
                  onClick={() => handleAutoDistributeDraft(maxDraftLimit)}
                  disabled={hasAlreadyDrafted || maxDraftLimit <= 0}
                  className="px-2.5 py-1 text-xs border-2 border-[#991b1b] bg-amber-50 text-[#991b1b] hover:bg-amber-100 font-black disabled:opacity-40"
                >
                  🚀 滿額徵募 ({maxDraftLimit.toLocaleString()}人)
                </button>
                <button
                  onClick={() => handleAutoDistributeDraft(Math.min(maxDraftLimit, 1000))}
                  disabled={hasAlreadyDrafted || maxDraftLimit < 1000}
                  className="px-2 py-1 text-xs border border-stone-300 bg-stone-100 hover:bg-stone-200 font-bold disabled:opacity-30"
                >
                  1,000 人
                </button>
                <button
                  onClick={() => handleAutoDistributeDraft(Math.min(maxDraftLimit, 2000))}
                  disabled={hasAlreadyDrafted || maxDraftLimit < 2000}
                  className="px-2 py-1 text-xs border border-stone-300 bg-stone-100 hover:bg-stone-200 font-bold disabled:opacity-30"
                >
                  2,000 人
                </button>
                <button
                  onClick={() => handleAutoDistributeDraft(Math.min(maxDraftLimit, 3000))}
                  disabled={hasAlreadyDrafted || maxDraftLimit < 3000}
                  className="px-2 py-1 text-xs border border-stone-300 bg-stone-100 hover:bg-stone-200 font-bold disabled:opacity-30"
                >
                  3,000 人
                </button>
                <button
                  onClick={() => handleEliteFirstDraft(totalDraftAmount > 0 ? totalDraftAmount : maxDraftLimit)}
                  disabled={hasAlreadyDrafted || maxDraftLimit <= 0}
                  className="px-2.5 py-1 text-xs border border-stone-400 bg-stone-100 hover:bg-stone-200 font-bold disabled:opacity-40"
                >
                  ⚡ 精銳將領優先
                </button>
                <button
                  onClick={() => setDraftAllocations({})}
                  disabled={hasAlreadyDrafted || totalDraftAmount <= 0}
                  className="px-2 py-1 text-xs border border-stone-400 bg-stone-100 hover:bg-stone-200 font-bold disabled:opacity-40 ml-auto"
                >
                  歸零重設
                </button>
              </div>
            </div>

            {/* Step 3: 各武將部隊新兵分配清單 */}
            <div className="bg-white/90 border border-stone-400 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-300 pb-2">
                <div className="font-black text-sm text-[#1c1917] flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">3</span>
                  各將領部隊新兵入伍分配
                </div>
                <div className="text-xs text-stone-600 font-bold">
                  已分配：<span className="text-[#991b1b] font-black">{totalDraftAmount.toLocaleString()}</span> / {maxDraftLimit.toLocaleString()} 人
                </div>
              </div>

              <div className="space-y-2.5">
                {generals.map(g => {
                  const addCount = draftAllocations[g.name] || 0;
                  const currentTroops = g.soldiers || 0;
                  const room = Math.max(0, g.maxTroops - currentTroops);
                  const isFull = room === 0;
                  const nextTroops = currentTroops + addCount;

                  // Calculate projected training for this general
                  const oldTraining = g.training || 50;
                  const projectedTraining = nextTroops > 0 
                    ? Math.round((currentTroops * oldTraining + addCount * 35) / nextTroops) 
                    : oldTraining;

                  return (
                    <div
                      key={g.name}
                      className={`border p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                        addCount > 0 
                          ? 'bg-amber-50/70 border-[#991b1b]' 
                          : 'bg-[#f9f8f5] border-stone-300'
                      }`}
                    >
                      {/* General Info */}
                      <div className="min-w-[150px] flex items-center gap-2">
                        <GeneralAvatar name={g.name} size={36} className="shrink-0 rounded shadow-xs" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs sm:text-sm text-[#1c1917]">{g.name}</span>
                              <span className="text-[9px] sm:text-[10px] bg-stone-200 text-stone-700 px-1 py-0.2 font-bold">
                                {g.role || '將領'}
                              </span>
                            </div>
                            <div className="text-right font-mono font-black text-xs sm:text-sm text-[#991b1b] sm:hidden">
                              +{addCount.toLocaleString()} 兵
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-stone-600 mt-0.5">
                            現有: <strong className="text-red-800">{currentTroops.toLocaleString()}</strong> / {g.maxTroops.toLocaleString()} 人
                            <span className="text-stone-500 ml-1">(餘 {room.toLocaleString()})</span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-stone-600 mt-0.5">
                            訓練度: {oldTraining}%
                            {addCount > 0 && (
                              <span className="text-stone-700 font-bold ml-1">
                                ➔ <strong className="text-amber-900">{projectedTraining}%</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Distribution Slider & Quick Buttons */}
                      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="range"
                            min={0}
                            max={room}
                            step={50}
                            value={addCount}
                            disabled={hasAlreadyDrafted || isFull}
                            onChange={e => handleSetGeneralDraft(g.name, Number(e.target.value))}
                            className="flex-1 accent-[#991b1b] h-2 bg-stone-200 rounded cursor-pointer disabled:opacity-30"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-start gap-1 shrink-0">
                          <button
                            onClick={() => handleSetGeneralDraft(g.name, addCount - 100)}
                            disabled={hasAlreadyDrafted || addCount <= 0}
                            className="px-1.5 py-0.5 text-[11px] sm:text-xs border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 font-bold"
                          >
                            -100
                          </button>
                          <button
                            onClick={() => handleSetGeneralDraft(g.name, addCount + 100)}
                            disabled={hasAlreadyDrafted || addCount >= room || totalDraftAmount >= maxDraftLimit}
                            className="px-1.5 py-0.5 text-[11px] sm:text-xs border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 font-bold"
                          >
                            +100
                          </button>
                          <button
                            onClick={() => handleSetGeneralDraft(g.name, addCount + 500)}
                            disabled={hasAlreadyDrafted || addCount >= room || totalDraftAmount >= maxDraftLimit}
                            className="px-1.5 py-0.5 text-[11px] sm:text-xs border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-30 font-bold"
                          >
                            +500
                          </button>
                          <button
                            onClick={() => handleSetGeneralDraft(g.name, room)}
                            disabled={hasAlreadyDrafted || isFull}
                            className="px-2 py-0.5 text-[11px] sm:text-xs border border-[#991b1b] bg-amber-50 text-[#991b1b] font-bold disabled:opacity-30"
                          >
                            填滿
                          </button>
                        </div>

                        <div className="w-20 text-right font-mono font-black text-sm text-[#991b1b] shrink-0 hidden sm:block">
                          +{addCount.toLocaleString()} <span className="text-xs font-normal text-stone-600">兵</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resource & Population Impact Summary */}
              <div className="bg-[#f2efeb] border border-stone-300 p-3.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-stone-500 font-bold">軍資支出預估</div>
                  <div className="text-base font-black text-amber-900 mt-0.5">
                    {draftGoldCost.toLocaleString()} 金
                  </div>
                  {goldSaved > 0 ? (
                    <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                      原價 {originalCost.toLocaleString()} 金 (省 {goldSaved.toLocaleString()} 金, -{draftDiscountPct}%)
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500 mt-0.5">原價計收</div>
                  )}
                </div>

                <div>
                  <div className="text-stone-500 font-bold">本郡人口安全變化</div>
                  <div className="text-base font-black text-stone-800 mt-0.5">
                    {province.population.toLocaleString()} ➔ {(province.population - totalDraftAmount).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-bold mt-0.5">
                    安全餘裕: {(province.population - totalDraftAmount - tierRules.minPopulation).toLocaleString()} 人 (底限 {tierRules.minPopulation.toLocaleString()})
                  </div>
                </div>

                <div>
                  <div className="text-stone-500 font-bold">主持募兵將領</div>
                  <div className="text-base font-black text-stone-800 mt-0.5">
                    【{hostGenData?.name || '無'}】(魅力 {effectiveCha})
                  </div>
                  <div className="text-[11px] text-stone-600 mt-0.5">
                    每城每回合僅限徵兵一次
                  </div>
                </div>
              </div>

              {/* Confirm Draft Button */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteDraft}
                  disabled={
                    hasAlreadyDrafted ||
                    !draftHostGen || 
                    totalDraftAmount <= 0 || 
                    availableGenerals.length === 0
                  }
                  className="w-full py-3 bg-[#991b1b] hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base border-2 border-[#1c1917] shadow active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span>🚩</span>
                  {hasAlreadyDrafted 
                    ? '⚠️ 本郡本月已徵過兵 (每城每月限一次)' 
                    : (totalDraftAmount > 0 
                        ? `確認完成全郡 ${totalDraftAmount.toLocaleString()} 名新兵入伍分配` 
                        : '請先調整招募新兵數量')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: 訓練兵士 (全軍操演) ===================== */}
        {activeTab === '訓練兵士' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Top Notice: Whole-garrison training & Soldier count dynamic scaling */}
            <div className="bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-950 shadow-sm flex items-start gap-3">
              <span className="text-xl shrink-0">⚔️</span>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm text-amber-900 mb-1 break-words">
                  全軍操演：全郡駐軍同步特訓，人少部隊成長更迅速！
                </div>
                <div className="leading-relaxed break-words whitespace-normal space-y-1">
                  <p>• <strong>全軍大會操</strong>：由一位教官主持操演，本郡所有駐防武將部隊同步獲得訓練提升。</p>
                  <p>• <strong>精密動態加權</strong>：教官指導部隊時，<strong>人數越少之精銳部隊，訓練度上升越快</strong>（例如 1000 人部隊訓練度上升速度顯著高於 2000 人部隊）。</p>
                </div>
              </div>
            </div>

            {/* Step 1: 選擇主持操演教官 */}
            <div className="bg-white/90 border border-stone-400 p-3.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                <div className="font-black text-sm text-[#1c1917] flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">1</span>
                  選擇主持操演教官 (武力越高，全軍訓練成果越顯著)
                </div>
                <span className="text-xs text-stone-500 font-bold">
                  可行動教官：{availableGenerals.length} 人
                </span>
              </div>

              {availableGenerals.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  本郡本月已無待命武將可擔任操演教官
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {availableGenerals.map(g => {
                    const isSelected = trainInstructor === g.name;
                    const bonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                    const totalStr = g.str + bonus.strBonus;

                    return (
                      <button
                        key={g.name}
                        onClick={() => setTrainInstructor(g.name)}
                        className={`p-2.5 border-2 text-left transition ${
                          isSelected
                            ? 'border-[#991b1b] bg-amber-50/80 ring-1 ring-[#991b1b]'
                            : 'border-stone-300 bg-white hover:border-stone-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GeneralAvatar name={g.name} size={32} className="shrink-0 rounded shadow-xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs text-[#1c1917] truncate">{g.name}</span>
                              {bonus.items.map(it => (
                                <span key={it.id} className="text-[9px] bg-amber-100 border border-amber-300 text-amber-950 px-1 font-bold">
                                  {it.name}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] text-stone-600 mt-0.5 flex justify-between items-center">
                              <span>武力: <strong className="text-red-800 text-xs">{totalStr}</strong></span>
                              <span className={`text-[10px] px-1.5 py-0.2 font-bold ${
                                isSelected ? 'bg-[#991b1b] text-white' : 'bg-stone-200 text-stone-700'
                              }`}>
                                {isSelected ? '總教官' : '選定'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dynamic Training Forecast Table */}
            <div className="bg-white/90 border border-stone-400 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-300 pb-2">
                <div className="font-black text-sm text-[#1c1917] flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-[#1c1917] text-white flex items-center justify-center text-xs font-bold">2</span>
                  全軍部隊操練成果精密預估
                </div>
                <div className="text-xs text-stone-600 font-bold">
                  受訓總兵力：<strong className="text-red-700">{totalGarrison.toLocaleString()}</strong> 人
                </div>
              </div>

              <div className="space-y-2">
                {trainingForecastList.map(item => {
                  const { general: g, soldiers, curTraining, gain, nextTraining } = item;
                  const hasTroops = soldiers > 0;

                  return (
                    <div
                      key={g.name}
                      className="bg-[#f9f8f5] border border-stone-300 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-[160px]">
                        <GeneralAvatar name={g.name} size={30} className="shrink-0 rounded shadow-xs" />
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-[#1c1917]">{g.name}</span>
                          <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 font-bold">
                            {g.role || '將領'}
                          </span>
                          <span className="text-stone-600 font-bold">
                            {soldiers > 0 ? `${soldiers.toLocaleString()} 兵` : '無帶兵'}
                          </span>
                        </div>
                      </div>

                      {hasTroops ? (
                        <div className="flex-1 flex items-center gap-3">
                          {/* Progress Bar */}
                          <div className="flex-1 bg-stone-200 h-3.5 rounded-sm overflow-hidden relative border border-stone-300">
                            {/* Current Base */}
                            <div 
                              className="bg-amber-600 h-full absolute left-0 top-0 transition-all duration-300"
                              style={{ width: `${curTraining}%` }}
                            />
                            {/* Gain Preview */}
                            <div 
                              className="bg-emerald-500 h-full absolute top-0 transition-all duration-300 opacity-80"
                              style={{ left: `${curTraining}%`, width: `${gain}%` }}
                            />
                          </div>

                          {/* Numeric Change */}
                          <div className="w-40 text-right font-mono font-bold shrink-0">
                            <span className="text-stone-600">{curTraining}%</span>
                            <span className="text-stone-400 mx-1">➔</span>
                            <span className="text-emerald-800 font-black">{nextTraining}%</span>
                            <span className="text-emerald-700 text-[11px] ml-1.5">(+{gain}%)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-stone-400 italic">
                          部隊無士兵，無需操演
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Confirm Training Button */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteTrain}
                  disabled={!trainInstructor || availableGenerals.length === 0 || totalGarrison === 0}
                  className="w-full py-3 bg-[#991b1b] hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base border-2 border-[#1c1917] shadow active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span>⚔️</span>
                  由【{trainInstructor || '教官'}】主持全軍大會操
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: 編制兵力 ===================== */}
        {activeTab === '編制兵力' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Top Info Bar */}
            <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-amber-900 mb-1 break-words">
                  兵力調配法則
                </div>
                <div className="leading-relaxed break-words whitespace-normal space-y-1">
                  <p>• 自由分配全郡現有總兵力至各將領部隊，一般將領上限 3,000 人，太守上限 4,000 人。</p>
                  <p>• 可使用快速配置鍵進行平均分配或集中精銳。</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button
                  onClick={handleBalanceAllocations}
                  className="px-2.5 py-1 text-xs border border-stone-400 bg-white hover:bg-stone-100 font-bold"
                >
                  ⚖️ 平均分配
                </button>
                <button
                  onClick={handleFocusElite}
                  className="px-2.5 py-1 text-xs border border-stone-400 bg-white hover:bg-stone-100 font-bold"
                >
                  ⚡ 集中精銳
                </button>
                <button
                  onClick={handleResetAllocations}
                  className="px-2.5 py-1 text-xs border border-stone-400 bg-white hover:bg-stone-100 font-bold"
                >
                  🔄 恢復初始
                </button>
              </div>
            </div>

            {/* Free Troop Pool Counter */}
            <div className="bg-white/90 border border-stone-400 p-3 flex items-center justify-between text-xs shadow-sm">
              <div className="font-bold text-stone-700">
                全郡總兵力：<span className="text-[#991b1b] font-black text-sm">{totalGarrison.toLocaleString()}</span> 人
              </div>
              <div className="font-bold">
                已分配：<span className="text-stone-900 font-black">{allocatedTotal.toLocaleString()}</span> 人 | 
                待分配：
                <span className={`font-black text-sm ml-1 ${
                  freeTroopPool === 0 ? 'text-emerald-700' : (freeTroopPool > 0 ? 'text-amber-800' : 'text-red-700')
                }`}>
                  {freeTroopPool.toLocaleString()} 人
                </span>
              </div>
            </div>

            {/* General Allocation Sliders */}
            <div className="bg-white/90 border border-stone-400 p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {generals.map(g => {
                  const currentVal = allocations[g.name] ?? (g.soldiers || 0);
                  const bonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                  const totalStr = g.str + bonus.strBonus;

                  return (
                    <div key={g.name} className="bg-[#f9f8f5] border border-stone-300 p-2.5 sm:p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <GeneralAvatar name={g.name} size={32} className="shrink-0 rounded shadow-xs" />
                          <span className="font-black text-xs sm:text-sm text-[#1c1917]">{g.name}</span>
                          <span className="text-[9px] sm:text-[10px] bg-stone-200 text-stone-700 px-1 py-0.2 font-bold">
                            {g.role || '將領'}
                          </span>
                          <span className="text-[10px] sm:text-xs text-stone-500 font-bold">
                            武: <span className="text-red-700">{totalStr}</span> | 上限: {g.maxTroops.toLocaleString()}人
                          </span>
                        </div>
                        <div className="font-mono font-black text-sm sm:text-base text-[#991b1b]">
                          {currentVal.toLocaleString()} <span className="text-xs font-normal text-stone-600">人</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={g.maxTroops}
                          step={50}
                          value={currentVal}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setAllocations(prev => ({ ...prev, [g.name]: val }));
                          }}
                          className="flex-1 accent-[#991b1b] h-2 bg-stone-200 rounded cursor-pointer"
                        />
                        <div className="flex items-center justify-between sm:justify-start gap-1 shrink-0">
                          <button
                            onClick={() => setAllocations(prev => ({ ...prev, [g.name]: Math.max(0, currentVal - 500) }))}
                            className="px-1.5 py-0.5 text-[11px] border border-stone-300 bg-white hover:bg-stone-100 font-bold"
                          >
                            -500
                          </button>
                          <button
                            onClick={() => setAllocations(prev => ({ ...prev, [g.name]: Math.max(0, currentVal - 100) }))}
                            className="px-1.5 py-0.5 text-[11px] border border-stone-300 bg-white hover:bg-stone-100 font-bold"
                          >
                            -100
                          </button>
                          <button
                            onClick={() => setAllocations(prev => ({ ...prev, [g.name]: Math.min(g.maxTroops, currentVal + 100) }))}
                            className="px-1.5 py-0.5 text-[11px] border border-stone-300 bg-white hover:bg-stone-100 font-bold"
                          >
                            +100
                          </button>
                          <button
                            onClick={() => setAllocations(prev => ({ ...prev, [g.name]: Math.min(g.maxTroops, currentVal + 500) }))}
                            className="px-1.5 py-0.5 text-[11px] border border-stone-300 bg-white hover:bg-stone-100 font-bold"
                          >
                            +500
                          </button>
                          <button
                            onClick={() => setAllocations(prev => ({ ...prev, [g.name]: g.maxTroops }))}
                            className="px-2 py-0.5 text-[11px] border border-[#991b1b] bg-amber-50 text-[#991b1b] font-bold"
                          >
                            滿額
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Reassign Button */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteReassign}
                  disabled={!reassignHostGen || freeTroopPool !== 0 || availableGenerals.length === 0}
                  className="w-full py-3 bg-[#991b1b] hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base border-2 border-[#1c1917] shadow active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  {freeTroopPool === 0 
                    ? `確認完成全郡將領兵力編制 (${totalGarrison.toLocaleString()}人)` 
                    : (freeTroopPool > 0 ? `尚餘 ${freeTroopPool} 人未分配` : `超出總兵力 ${Math.abs(freeTroopPool)} 人`)}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
