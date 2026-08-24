import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from '../types';
import { getGeneralItemBonus } from '../data/items';
import { getProvinceTierRules, calculateDraftCost, calculateMaxDraftAmount } from '../data/historicalProvinceConfig';

interface TroopViewProps {
  gameState: GameState;
  initialAction: string;
  onExit: () => void;
  onExecute: (category: string, action: string, payload?: any, generalName?: string) => void;
}

export default function TroopView({ gameState, initialAction, onExit, onExecute }: TroopViewProps) {
  const [activeTab, setActiveTab] = useState(initialAction);
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const provinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);
    
  const province = gameState.provincesData[provinceId] || null;
  const tierRules = getProvinceTierRules(provinceId);

  const generals = Object.values(gameState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild);
  const availableGenerals = generals.filter(g => !g.hasActed);

  // 徵兵 State
  const [selectedDraftGen, setSelectedDraftGen] = useState<string | null>(
    availableGenerals.length > 0 ? availableGenerals[0].name : null
  );

  const selectedGenData = selectedDraftGen ? gameState.generalsData[selectedDraftGen] : null;
  const draftCha = selectedGenData 
    ? (selectedGenData.cha + getGeneralItemBonus(selectedGenData.name, gameState.currentScenario).chaBonus)
    : 50;

  // Max population that can be drafted while preserving tier minPopulation
  const maxDraughtPop = province ? Math.max(0, province.population - tierRules.minPopulation) : 0;
  
  // Calculate max draft possible with current gold given charm rate
  const costPerSoldier = 1;
  const maxDraftGold = province ? Math.floor(province.gold / costPerSoldier) : 0;
  const maxDraftCharm = calculateMaxDraftAmount(draftCha);
  const maxDraft = Math.min(maxDraughtPop, maxDraftGold, maxDraftCharm);

  const [draftAmount, setDraftAmount] = useState(0);
  const draftGoldCost = useMemo(() => calculateDraftCost(draftAmount), [draftAmount]);

  // 購買武器 State (武將 or 預備兵)
  const [selectedBuyGeneral, setSelectedBuyGeneral] = useState<string | null>('RESERVE');
  const [selectedBuyExecGen, setSelectedBuyExecGen] = useState<string | null>(null);
  const [buyGold, setBuyGold] = useState(0);
  
  const isBuyingForReserve = selectedBuyGeneral === 'RESERVE';
  const buyGenData = !isBuyingForReserve && selectedBuyGeneral ? generals.find(g => g.name === selectedBuyGeneral) : null;
  
  const currentWeaponsTarget = isBuyingForReserve ? (province?.weapons ?? 50) : (buyGenData?.weapons ?? 50);
  const currentSoldiersTarget = isBuyingForReserve ? (province?.soldiers ?? 0) : (buyGenData?.soldiers ?? 0);
  const maxUsefulGold = currentSoldiersTarget > 0 
    ? Math.ceil(((100 - currentWeaponsTarget) / 100 * currentSoldiersTarget) / 100)
    : 10;
  const maxBuyGold = province ? Math.min(province.gold, Math.max(10, maxUsefulGold)) : 0;

  // 調整兵力 State
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedReallocateGen, setSelectedReallocateGen] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === '調整兵力' && province) {
      const initialAllocs: Record<string, number> = {};
      generals.forEach(g => { initialAllocs[g.name] = g.soldiers; });
      setAllocations(initialAllocs);
    }
    // Update default draft/reallocate gen if needed
    if (availableGenerals.length > 0) {
      if (!selectedDraftGen || gameState.generalsData[selectedDraftGen]?.hasActed) {
        setSelectedDraftGen(availableGenerals[0].name);
      }
      if (!selectedBuyExecGen || gameState.generalsData[selectedBuyExecGen]?.hasActed) {
        setSelectedBuyExecGen(availableGenerals[0].name);
      }
      if (!selectedReallocateGen || gameState.generalsData[selectedReallocateGen]?.hasActed) {
        setSelectedReallocateGen(availableGenerals[0].name);
      }
    }
  }, [activeTab, provinceId]);

  if (!province) {
    return (
      <div className="w-full h-full bg-[#f2efeb] text-[#1c1917] flex flex-col font-serif absolute inset-0 z-50 p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2">尚未選擇領地</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選我方所屬之郡縣。</p>
          <button
            onClick={onExit}
            className="px-6 py-2 bg-[#991b1b] text-white font-bold rounded shadow active:scale-95"
          >
            返回大地圖
          </button>
        </div>
      </div>
    );
  }

  // Calculate live dynamic military preview for allocation
  const totalTroopsInProvince = useMemo(() => {
    const generalTotal = generals.reduce((sum, g) => sum + g.soldiers, 0);
    return generalTotal + province.soldiers;
  }, [generals, province.soldiers]);

  const allocatedTotal = useMemo(() => {
    return Object.values(allocations).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);
  }, [allocations]);

  const liveReserveSoldiers = Math.max(0, totalTroopsInProvince - allocatedTotal);

  // Calculate live dynamic training & weapons for preview
  const livePreview = useMemo(() => {
    let curResSoldiers = province.soldiers;
    let curResTraining = province.training ?? 50;
    let curResWeapons = province.weapons ?? 50;
    const previewGenStats: Record<string, { training: number; weapons: number }> = {};

    // 1. Soldiers returned to reserve
    generals.forEach(g => {
      const oldAmount = g.soldiers;
      const newAmount = allocations[g.name] ?? oldAmount;
      if (newAmount < oldAmount) {
        const returned = oldAmount - newAmount;
        const comb = curResSoldiers + returned;
        if (comb > 0) {
          curResTraining = Math.round((curResSoldiers * curResTraining + returned * g.training) / comb);
          curResWeapons = Math.round((curResSoldiers * curResWeapons + returned * g.weapons) / comb);
        }
        curResSoldiers = comb;
        previewGenStats[g.name] = { training: g.training, weapons: g.weapons };
      }
    });

    // 2. Soldiers added from reserve
    generals.forEach(g => {
      const oldAmount = g.soldiers;
      const newAmount = allocations[g.name] ?? oldAmount;
      if (newAmount >= oldAmount) {
        const added = newAmount - oldAmount;
        if (newAmount > 0) {
          const t = Math.round((oldAmount * g.training + added * curResTraining) / newAmount);
          const w = Math.round((oldAmount * g.weapons + added * curResWeapons) / newAmount);
          previewGenStats[g.name] = { training: Math.min(100, t), weapons: Math.min(100, w) };
        } else {
          previewGenStats[g.name] = { training: g.training, weapons: g.weapons };
        }
        curResSoldiers = Math.max(0, curResSoldiers - added);
      }
    });

    return {
      reserveTraining: Math.min(100, Math.max(0, curResTraining)),
      reserveWeapons: Math.min(100, Math.max(0, curResWeapons)),
      generals: previewGenStats
    };
  }, [allocations, generals, province]);

  const handleSliderChange = (gName: string, newVal: number) => {
    const oldVal = allocations[gName] || 0;
    const gData = generals.find(g => g.name === gName);
    const maxVal = gName === gameState.rulerName ? 5000 : (gData?.maxTroops || 3000);
    
    let diff = newVal - oldVal;
    
    if (diff > liveReserveSoldiers) {
      diff = liveReserveSoldiers;
      newVal = oldVal + diff;
    }
    
    if (newVal > maxVal) {
      newVal = maxVal;
    }
    if (newVal < 0) {
      newVal = 0;
    }

    setAllocations(prev => ({ ...prev, [gName]: newVal }));
  };

  const executeAction = () => {
    if (activeTab === '徵兵' && selectedDraftGen) {
      onExecute('兵士', '徵兵', { amount: draftAmount }, selectedDraftGen);
    } else if (activeTab === '購買武器') {
      onExecute('兵士', '購買武器', { generalName: selectedBuyGeneral, goldSpent: buyGold }, selectedBuyExecGen || undefined);
    } else if (activeTab === '調整兵力') {
      onExecute('兵士', '調整兵力', { allocations }, selectedReallocateGen || undefined);
    }
  };

  // 魅力不再減免費用的相關變數移除（或保持 0）
  const discountPercent = 0;

  const renderExecGenSelection = (title: string, selectedValue: string | null, onSelect: (val: string) => void) => (
    <div className="w-full bg-white/80 border border-stone-400 p-3 mb-4 shadow-sm">
      <div className="text-xs font-bold mb-2 text-stone-800">
        <span>{title}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {generals.map(g => (
          <button
            key={g.name}
            disabled={g.hasActed}
            onClick={() => onSelect(g.name)}
            className={`px-3 py-1.5 border text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedValue === g.name
                ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]'
                : 'border-stone-300 bg-white hover:border-stone-600'
            } ${g.hasActed ? 'opacity-40 cursor-not-allowed bg-stone-200' : ''}`}
          >
            <div>{g.name}</div>
            <div className="text-[10px] text-stone-500 font-normal mt-0.5">
              {g.hasActed ? '已行動' : '待命'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#f2efeb] text-[#1c1917] flex flex-col font-serif absolute inset-0 z-50">
      {/* Header */}
      <div className="bg-[#1c1917] text-[#f2efeb] p-4 flex justify-between items-center">
        <button onClick={onExit} className="border border-[#f2efeb] px-4 py-1 text-xs uppercase hover:bg-white/10 active:scale-95">取消返回</button>
        <span className="font-bold tracking-widest text-sm">兵士管理 - {provinceId}郡 ({tierRules.tierName})</span>
        <div className="w-16"></div>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-300 border-b-2 border-[#1c1917]">
        {['徵兵', '訓練兵士', '購買武器', '調整兵力'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold border-r border-[#1c1917] last:border-r-0 transition-colors
              ${activeTab === tab ? 'bg-[#1c1917] text-[#f2efeb]' : 'hover:bg-stone-400 text-[#1c1917]'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        {/* Common Stats */}
        <div className="w-full max-w-lg mb-4 bg-white/70 border border-[#1c1917] p-3 text-xs md:text-sm grid grid-cols-4 gap-2 text-center font-bold shadow-sm">
          <div>人口: <span className="text-[#991b1b]">{province.population}</span></div>
          <div>保底人口: <span className="text-stone-700">{tierRules.minPopulation}</span></div>
          <div>金錢: <span className="text-amber-700">{province.gold}</span></div>
          <div>預備兵: <span className="text-blue-800">{activeTab === '調整兵力' ? liveReserveSoldiers : province.soldiers}</span></div>
        </div>

        {/* 徵兵 View */}
        {activeTab === '徵兵' && (
          <div className="w-full max-w-lg flex flex-col items-center space-y-4">
            <h2 className="text-xl font-black text-center">徵召士兵</h2>
            
            <div className="text-xs bg-amber-50 border border-amber-300 p-2.5 rounded text-stone-700 w-full text-center leading-relaxed">
              <span>【都市分級】{tierRules.tierName} 最低維持人口：<strong>{tierRules.minPopulation.toLocaleString()}</strong> 人。</span>
              <br />
              <span>【魅力加成】主持將領魅力越高，單次徵兵上限越高！</span>
            </div>

            {/* General in charge of draft */}
            <div className="w-full bg-white/80 border border-stone-400 p-3">
              <div className="text-xs font-bold mb-2 flex justify-between">
                <span>選擇主持徵兵武將 (待命中)：</span>
                {selectedGenData && (
                  <span className="text-[#991b1b] font-bold">
                    魅力 {draftCha} 點 (單次上限 {calculateMaxDraftAmount(draftCha)} 人)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {generals.map(g => {
                  const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                  const effectiveCha = g.cha + itemBonus.chaBonus;

                  return (
                    <button
                      key={g.name}
                      disabled={g.hasActed}
                      onClick={() => {
                        setSelectedDraftGen(g.name);
                        setDraftAmount(0);
                      }}
                      className={`p-2 border text-left text-xs font-bold transition-all ${
                        selectedDraftGen === g.name
                          ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]'
                          : 'border-stone-300 bg-white'
                      } ${g.hasActed ? 'opacity-40 cursor-not-allowed bg-stone-200' : 'cursor-pointer hover:border-stone-600'}`}
                    >
                      <div className="flex items-center gap-1 flex-wrap">
                        <span>{g.name}</span>
                        <span className="text-[11px] text-stone-600 font-normal">
                          (魅:{effectiveCha})
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 font-normal">
                        {g.hasActed ? '本月已行動' : '待命'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="w-full bg-white/80 border border-stone-400 p-4 flex flex-col items-center">
              <div className="text-3xl font-black text-[#991b1b] mb-1">{draftAmount.toLocaleString()} 人</div>
              <div className="text-sm font-bold text-amber-800 mb-3">
                預計消耗金錢：{draftGoldCost} 金 {discountPercent > 0 && <span className="text-xs text-emerald-700"> (節省 {draftAmount - draftGoldCost} 金)</span>}
              </div>
              
              <div className="flex items-center gap-2 w-full mb-2">
                <input 
                  type="range" 
                  min="0" 
                  max={maxDraft} 
                  step="1"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(Number(e.target.value))}
                  className="flex-1 accent-[#991b1b]"
                />
                <button
                  type="button"
                  onClick={() => setDraftAmount(maxDraft)}
                  className="px-2.5 py-1 bg-[#991b1b] text-white text-xs font-black rounded hover:bg-red-800 active:scale-95 whitespace-nowrap shadow-sm"
                >
                  拉滿
                </button>
              </div>
              
              <div className="flex justify-between w-full text-xs font-bold opacity-70">
                <span>0</span>
                <span>最多可徵召: {maxDraft.toLocaleString()} 人</span>
              </div>
            </div>
          </div>
        )}

        {/* 訓練兵士 View */}
        {activeTab === '訓練兵士' && (
          <div className="w-full max-w-lg flex flex-col">
            <h2 className="text-xl font-black mb-2 text-center">選擇執行訓練的將領</h2>
            <div className="text-xs opacity-80 mb-4 text-center">
              武將的戰力將直接影響訓練效果。每個武將每月限執行一次。
            </div>
            <div className="grid gap-3">
              {generals.map(g => {
                const isDisabled = g.hasActed;
                const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                return (
                  <button
                    key={g.name}
                    disabled={isDisabled}
                    onClick={() => {
                      onExecute('兵士', '訓練兵士', { generalName: g.name }, g.name);
                    }}
                    className={`border p-3 flex justify-between items-center transition-all text-left ${
                      isDisabled
                        ? 'bg-stone-200/80 border-stone-300 opacity-50 cursor-not-allowed'
                        : 'bg-white/90 border-[#1c1917] hover:bg-[#1c1917] hover:text-white cursor-pointer shadow-sm active:scale-95'
                    }`}
                  >
                    <div>
                      <div className="font-black text-lg flex items-center gap-2 flex-wrap">
                        <span>{g.name}</span>
                        {g.isRuler && <span className="text-[10px] bg-[#991b1b] text-white px-1 py-0.2 rounded-sm font-bold">君主</span>}
                        {itemBonus.items.map(it => (
                          <span key={it.id} className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1 rounded border border-amber-300">
                            {it.name}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {isDisabled ? (
                          <span className="text-stone-500 font-bold bg-stone-300 px-1 py-0.2 rounded">本月已行動 (無法訓練)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-1 py-0.2 rounded">待命可訓練</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 text-sm font-bold items-center">
                      <span>兵: {g.soldiers}</span>
                      <span className="flex items-center">
                        戰: {g.str}{itemBonus.strBonus > 0 && <strong className="text-emerald-700 font-black ml-0.5">+{itemBonus.strBonus}</strong>}
                      </span>
                      <span>訓練: <span className="text-[#991b1b] font-black">{g.training}%</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 購買武器 View */}
        {activeTab === '購買武器' && (
          <div className="w-full max-w-lg flex flex-col">
            <h2 className="text-xl font-black mb-2 text-center">選擇配備武器的軍隊</h2>
            <div className="text-xs opacity-80 mb-4 text-center">每 1 金可購買 100 單位武器，可為個別將領或都市預備兵採購。</div>
            
            {renderExecGenSelection('選擇執行購買的武將 (每人每月限一次)：', selectedBuyExecGen, setSelectedBuyExecGen)}

            <div className="grid gap-2 mb-4">
              {/* Option to buy for Reserve */}
              <button
                onClick={() => { setSelectedBuyGeneral('RESERVE'); setBuyGold(0); }}
                className={`border p-3 flex justify-between items-center transition-all text-left ${
                  selectedBuyGeneral === 'RESERVE'
                    ? 'bg-amber-100 border-[#991b1b] ring-2 ring-[#991b1b]'
                    : 'bg-white border-[#1c1917] hover:bg-stone-100'
                }`}
              >
                <div>
                  <div className="font-bold text-base text-blue-900">都市預備兵庫存武器</div>
                  <div className="text-xs text-stone-500">預備兵兵力: {province.soldiers} 人</div>
                </div>
                <div className="text-sm font-bold">
                  當前武裝度: <span className="text-[#991b1b] font-black">{province.weapons ?? 50}%</span>
                </div>
              </button>

              {generals.map(g => {
                const isSelected = selectedBuyGeneral === g.name;
                return (
                  <button
                    key={g.name}
                    onClick={() => {
                      setSelectedBuyGeneral(g.name);
                      setBuyGold(0);
                    }}
                    className={`border p-2.5 flex justify-between items-center transition-all text-left ${
                      isSelected
                        ? 'bg-amber-100 border-[#991b1b] ring-2 ring-[#991b1b]'
                        : 'bg-white border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{g.name}</div>
                      <div className="text-xs text-stone-500">兵力: {g.soldiers} 人</div>
                    </div>
                    <div className="text-xs font-bold">
                      武裝度: <span className="text-[#991b1b] font-black">{g.weapons}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedBuyGeneral && (
              <div className="flex flex-col items-center bg-white/90 border-2 border-[#1c1917] p-4 shadow-md">
                <div className="text-lg font-black mb-1">
                  {isBuyingForReserve ? '為【都市預備兵】採購武器' : `為【${buyGenData?.name}】部隊採購武器`}
                </div>
                
                <div className="text-2xl font-black text-[#991b1b] mb-1">{buyGold} 金</div>
                <div className="text-xs font-bold mb-4 text-stone-600">購買武器：{buyGold * 100} 單位</div>
                
                <input 
                  type="range" 
                  min="0" 
                  max={maxBuyGold} 
                  step="1"
                  value={buyGold}
                  onChange={(e) => setBuyGold(Number(e.target.value))}
                  className="w-full accent-[#991b1b] mb-2"
                />
                
                <div className="flex justify-between w-full text-xs font-bold opacity-70">
                  <span>0</span>
                  <span>最多可投入: {maxBuyGold} 金</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 調整兵力 View */}
        {activeTab === '調整兵力' && (
          <div className="w-full max-w-lg flex flex-col">
            <h2 className="text-xl font-black mb-1 text-center">動態編制兵力與兵器訓練</h2>
            <div className="text-xs text-stone-600 mb-3 text-center">
              兵力調回預備役或派發部隊時，<strong>訓練度與武器度將即時動態加權重組</strong>。
            </div>

            {renderExecGenSelection('選擇主持編制的武將 (每人每月限一次)：', selectedReallocateGen, setSelectedReallocateGen)}

            {/* Live Reserve State */}
            <div className="bg-amber-50 border-2 border-stone-800 p-3 mb-3 flex justify-between items-center text-xs font-bold">
              <div>
                <span className="text-stone-600">預備兵剩餘：</span>
                <span className="text-blue-800 text-sm font-black">{liveReserveSoldiers} 人</span>
              </div>
              <div className="flex gap-3 text-stone-700">
                <span>重編訓練度：<strong className={liveReserveSoldiers > 0 ? "text-emerald-700" : "text-stone-400"}>{liveReserveSoldiers > 0 ? `${livePreview.reserveTraining}%` : '---'}</strong></span>
                <span>重編武裝度：<strong className={liveReserveSoldiers > 0 ? "text-amber-700" : "text-stone-400"}>{liveReserveSoldiers > 0 ? `${livePreview.reserveWeapons}%` : '---'}</strong></span>
              </div>
            </div>
            
            <div className="grid gap-3">
              {generals.map(g => {
                const maxTroop = g.name === gameState.rulerName ? 5000 : (g.maxTroops || 3000);
                const assigned = allocations[g.name] || 0;
                const genLive = livePreview.generals[g.name] || { training: g.training, weapons: g.weapons };

                return (
                  <div key={g.name} className="bg-white/90 border border-[#1c1917] p-3 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm flex items-center gap-2">
                        {g.name} 
                        {g.name === gameState.rulerName ? (
                          <span className="text-[10px] bg-[#991b1b] text-white px-1.5 py-0.5 rounded-sm">君主</span>
                        ) : (
                          <span className="text-[10px] bg-stone-700 text-stone-100 px-1.5 py-0.5 rounded-sm">{g.role || '將領'}</span>
                        )}
                        <span className="text-[11px] text-stone-500 font-normal">上限 {maxTroop}</span>
                      </span>
                      <span className="text-base text-[#991b1b] font-black">{assigned} 人</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold text-stone-600 bg-stone-100 p-1 rounded">
                      <span>動態訓練度: <strong className={assigned > 0 ? "text-emerald-700" : "text-stone-400"}>{assigned > 0 ? `${genLive.training}%` : '---'}</strong></span>
                      <span>動態武裝度: <strong className={assigned > 0 ? "text-amber-700" : "text-stone-400"}>{assigned > 0 ? `${genLive.weapons}%` : '---'}</strong></span>
                    </div>

                    <input 
                      type="range" 
                      min="0" 
                      max={maxTroop} 
                      step="100"
                      value={assigned}
                      onChange={(e) => handleSliderChange(g.name, Number(e.target.value))}
                      className="w-full accent-[#991b1b]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Footer Confirm */}
      {activeTab !== '訓練兵士' && (
        <div className="p-4 border-t-[2px] border-[#1c1917] bg-white/70">
          <button 
            onClick={executeAction}
            disabled={
              (activeTab === '徵兵' && (draftAmount === 0 || !selectedDraftGen || draftGoldCost > province.gold)) ||
              (activeTab === '購買武器' && (buyGold === 0 || !selectedBuyExecGen)) ||
              (activeTab === '調整兵力' && !selectedReallocateGen)
            }
            className={`w-full py-3.5 border-[2px] border-[#1c1917] font-black text-base transition-all shadow-[3px_3px_0_#1c1917]
              ${((activeTab === '徵兵' && (draftAmount === 0 || !selectedDraftGen || draftGoldCost > province.gold)) || 
                 (activeTab === '購買武器' && (buyGold === 0 || !selectedBuyExecGen)) ||
                 (activeTab === '調整兵力' && !selectedReallocateGen)) 
                ? 'bg-stone-300 text-stone-500 shadow-none border-stone-400 cursor-not-allowed' 
                : 'bg-[#991b1b] text-[#f2efeb] active:scale-[0.98] active:shadow-[1px_1px_0_#1c1917]'
              }
            `}
          >
            執行指令
          </button>
        </div>
      )}
    </div>
  );
}
