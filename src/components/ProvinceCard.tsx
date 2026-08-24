import React from 'react';
import { provinces } from '../data/provinces';
import { GameState } from '../types';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';

interface ProvinceCardProps {
  provinceId: number;
  gameState: GameState;
  onClose: () => void;
}

export default function ProvinceCard({ provinceId, gameState, onClose }: ProvinceCardProps) {
  const province = provinces.find(p => p.id === provinceId);
  const state = gameState.provincesData[provinceId];
  
  if (!province || !state) return null;

  const stationedGeneralsCount = Object.values(gameState.generalsData).filter(
    g => g.provinceId === provinceId && !g.isWild
  ).length;

  const maxDev = getProvinceTierRules(provinceId).maxDev;

  return (
    <div className="absolute top-2 left-2 w-[48%] max-w-[210px] bg-stone-100/95 border-2 border-stone-800 p-2 shadow-xl z-20 font-serif backdrop-blur-md rounded-sm text-stone-900">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800 pb-1 mb-1">
        <div className="flex items-center gap-1 overflow-hidden leading-tight">
          <span className="font-bold text-xs truncate">[{province.name}]</span>
          <span className="text-[10px] text-stone-600 font-normal">({province.id})</span>
        </div>
        <button 
          onClick={onClose}
          className="w-5 h-5 shrink-0 flex items-center justify-center bg-stone-800 text-stone-100 rounded-sm hover:bg-stone-700 active:scale-95 text-[10px] font-bold leading-none cursor-pointer"
          title="關閉"
        >
          ✕
        </button>
      </div>

      {/* Ruler info */}
      <div className="text-[11px] font-bold text-stone-800 flex justify-between items-center mb-1 bg-stone-200/80 px-1.5 py-0.5 rounded border border-stone-300">
        <span className="text-stone-600 font-normal">君主:</span>
        <span className="text-red-800 font-bold truncate max-w-[100px]">{state.rulerName || '無'}</span>
      </div>
      
      {/* Stats Compact Grid */}
      <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[11px] leading-tight text-stone-800">
        <div className="flex justify-between">
          <span className="text-stone-600">金:</span> 
          <span className="font-bold text-amber-900">{state.gold}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">糧:</span> 
          <span className="font-bold text-emerald-900">{state.food}</span>
        </div>
        
        <div className="flex justify-between col-span-2">
          <span className="text-stone-600">土地:</span> 
          <span className="font-bold text-amber-800">{state.value} / {maxDev}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-stone-600">洪水:</span> 
          <span className="font-bold text-sky-800">{state.flood}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">忠誠:</span> 
          <span className="font-bold">{state.loyalty}</span>
        </div>

        <div className="flex justify-between col-span-2">
          <span className="text-stone-600">人口:</span> 
          <span className="font-bold">{state.population.toLocaleString()}</span>
        </div>

        <div className="flex justify-between col-span-2 border-t border-stone-300 pt-0.5 mt-0.5">
          <span className="text-stone-600">兵士:</span> 
          <span className="font-bold text-rose-800 text-xs">{state.soldiers.toLocaleString()}</span>
        </div>

        <div className="flex justify-between col-span-2 text-[10px] text-stone-600">
          <span>駐留將領:</span>
          <span className="font-bold text-stone-800">{stationedGeneralsCount} 人</span>
        </div>
      </div>
    </div>
  );
}

