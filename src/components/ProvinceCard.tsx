import React from 'react';
import { provinces } from '../data/provinces';
import { GameState } from '../types';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';
import { getEstimatedAnnualGold, getEstimatedAnnualFood, getEstimatedMonthlyFoodConsumption } from '../engine/gameLogic';

interface ProvinceCardProps {
  provinceId: number;
  gameState: GameState;
  onClose: () => void;
}

export default function ProvinceCard({ provinceId, gameState, onClose }: ProvinceCardProps) {
  const province = provinces.find(p => p.id === provinceId);
  const state = gameState.provincesData[provinceId];
  
  if (!province || !state) return null;

  const stationedGenerals = Object.values(gameState.generalsData).filter(
    g => g.provinceId === provinceId && !g.isWild
  );
  const stationedGeneralsCount = stationedGenerals.length;
  const totalGeneralsSoldiers = stationedGenerals.reduce((sum, g) => sum + g.soldiers, 0);
  const totalSoldiers = totalGeneralsSoldiers;

  const rulerInProvince = stationedGenerals.find(g => g.isRuler);
  const appointedPrefect = stationedGenerals.find(g => g.role === '太守');
  const governorDisplay = rulerInProvince 
    ? `${rulerInProvince.name}(君主)`
    : appointedPrefect 
      ? appointedPrefect.name 
      : stationedGeneralsCount > 0 
        ? '未指派' 
        : '無';

  const tierRules = getProvinceTierRules(provinceId);

  const estimatedGold = getEstimatedAnnualGold(state);
  const estimatedFood = getEstimatedAnnualFood(state);
  const monthlyFoodConsumption = getEstimatedMonthlyFoodConsumption(state, Object.values(gameState.generalsData));

  const getCityTypeColor = (tier: string) => {
    switch (tier) {
      case 'METROPOLIS': return 'bg-amber-100 text-amber-900 border-amber-400';
      case 'COMMERCIAL': return 'bg-sky-100 text-sky-900 border-sky-400';
      case 'AGRICULTURAL': return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'MIDSIZED': return 'bg-stone-200 text-stone-800 border-stone-400';
      case 'FRONTIER': return 'bg-purple-100 text-purple-900 border-purple-300';
      default: return 'bg-stone-200 text-stone-800 border-stone-400';
    }
  };

  return (
    <div className="w-[155px] xs:w-[168px] sm:w-[210px] max-w-[calc(50vw-12px)] sm:max-w-none bg-stone-100/95 border-2 border-stone-800 p-1.5 shadow-xl font-serif backdrop-blur-md rounded-sm text-stone-900 box-border overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800 pb-0.5 mb-1 min-w-0">
        <div className="flex items-center gap-1 overflow-hidden leading-tight flex-wrap min-w-0 flex-1 pr-0.5">
          <span className="font-bold text-[11px] sm:text-xs truncate max-w-[75px] sm:max-w-[110px]">[{province.name}]</span>
          <span className={`text-[8.5px] px-0.5 py-0.1 rounded font-bold border shrink-0 ${getCityTypeColor(tierRules.tier)}`}>
            {tierRules.tierName}
          </span>
          {state.isAutonomous && (
            <span className="text-[8.5px] bg-amber-600 text-white px-0.5 py-0.1 rounded font-bold shrink-0">自治</span>
          )}
          {(gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : [])).some(b => b.targetProvinceId === provinceId) && (
            <span className="text-[8.5px] bg-red-700 text-white px-1 py-0.1 rounded font-bold animate-pulse shrink-0">
              ⚔️ 進攻目標
            </span>
          )}
        </div>
        <button 
          onClick={onClose}
          className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center bg-stone-800 text-stone-100 rounded-sm hover:bg-stone-700 active:scale-95 text-[9px] sm:text-[10px] font-bold leading-none cursor-pointer"
          title="關閉"
        >
          ✕
        </button>
      </div>

      {/* Ruler & Governor & Autonomy info */}
      <div className="text-[10px] sm:text-[10.5px] font-bold text-stone-800 flex flex-col gap-0.5 mb-1 bg-stone-200/80 px-1 py-1 rounded border border-stone-300">
        <div className="flex justify-between items-center">
          <span className="text-stone-600 font-normal">君主:</span>
          <span className="text-red-800 font-bold truncate max-w-[95px]">{state.rulerName || '無主'}</span>
        </div>
        <div className="flex justify-between items-center border-t border-stone-300/60 pt-0.5">
          <span className="text-stone-600 font-normal">太守:</span>
          <span className="text-amber-900 font-bold truncate max-w-[95px]">{governorDisplay}</span>
        </div>
        <div className="flex justify-between items-center border-t border-stone-300/60 pt-0.5">
          <span className="text-stone-600 font-normal">治理:</span>
          {state.isAutonomous ? (
            <span className="bg-amber-700 text-white text-[9px] px-1 py-0.2 rounded font-bold shadow-xs">
              自治中
            </span>
          ) : (
            <span className="bg-stone-600 text-stone-100 text-[9px] px-1 py-0.2 rounded font-bold">
              直轄
            </span>
          )}
        </div>
      </div>
      
      {/* Stats Compact Grid */}
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[10px] leading-tight text-stone-800">
        <div className="flex justify-between items-center">
          <span className="text-stone-600">金:</span> 
          <div className="flex items-center gap-0.5 text-right">
            <span className="font-bold text-amber-900">{state.gold}</span>
            <span className="text-[8px] text-amber-700">(+{estimatedGold})</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-stone-600">糧:</span> 
          <div className="flex items-center gap-0.5 text-right">
            <span className="font-bold text-emerald-900">{state.food}</span>
            <span className="text-[8px] text-emerald-700">(+{estimatedFood})</span>
          </div>
        </div>
        <div className="flex justify-between col-span-2 border-b border-stone-300 pb-0.5 mb-0.5 text-[9.5px]">
          <span className="text-stone-600">軍糧消耗:</span>
          <span className="font-bold text-rose-700">-{monthlyFoodConsumption}/月</span>
        </div>
        
        <div className="flex justify-between col-span-2">
          <span className="text-stone-600">土地:</span> 
          <span className="font-bold text-amber-800">{state.value} / {tierRules.maxDev}</span>
        </div>

        <div className="flex justify-between col-span-2">
          <span className="text-stone-600">商業:</span> 
          <span className="font-bold text-sky-800">{state.commerce || 0} / {tierRules.maxCommerce}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-stone-600">防災:</span> 
          <span className="font-bold text-blue-800">{100 - state.flood}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">民忠:</span> 
          <span className="font-bold">{state.loyalty}</span>
        </div>

        <div className="flex justify-between col-span-2">
          <span className="text-stone-600">人口:</span> 
          <span className="font-bold">{state.population.toLocaleString()}</span>
        </div>

        <div className="flex justify-between col-span-2 border-t border-stone-300 pt-0.5 mt-0.5">
          <span className="text-stone-600">兵士:</span> 
          <span className="font-bold text-rose-800 text-xs">{totalSoldiers.toLocaleString()}</span>
        </div>

        <div className="flex justify-between col-span-2 text-[10px] text-stone-600">
          <span>駐留將領:</span>
          <span className="font-bold text-stone-800">{stationedGeneralsCount} 人</span>
        </div>
      </div>
    </div>
  );
}
