import React, { useState } from 'react';
import { provinces } from '../data/provinces';
import { GameState } from '../types';

interface RulerTerritoryCardProps {
  gameState: GameState;
  onSelectProvince: (provinceId: number) => void;
}

export default function RulerTerritoryCard({ gameState, onSelectProvince }: RulerTerritoryCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const rulerName = gameState.rulerName;
  const rulerProvinces = provinces.filter(p => {
    const pData = gameState.provincesData[p.id];
    return pData && pData.rulerName === rulerName;
  });

  if (rulerProvinces.length === 0) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="absolute top-2 right-2 bg-stone-100/95 hover:bg-stone-200 border-2 border-stone-800 px-2 py-0.5 shadow-lg z-20 font-serif backdrop-blur-md rounded flex items-center gap-1 text-stone-900 cursor-pointer active:scale-95 transition-all text-xs"
        title="展開我方城池列表"
      >
        <span className="text-[10px] font-bold text-amber-950 flex items-center gap-1">
          <span>👑 我方城池</span>
          <span className="text-[9px] bg-stone-800 text-stone-100 px-1 py-0.2 rounded-full font-sans">
            {rulerProvinces.length}
          </span>
        </span>
        <span className="text-[9px] font-black text-amber-900 ml-0.5">＋ 展開</span>
      </button>
    );
  }

  return (
    <div className="absolute top-2 right-2 w-[45%] max-w-[160px] sm:max-w-[185px] bg-stone-100/95 border-2 border-stone-800 p-1.5 shadow-xl z-20 font-serif backdrop-blur-md rounded-sm text-stone-900 transition-all text-[10px]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-stone-800 pb-0.5 mb-1">
        <h4 className="font-bold text-[10px] sm:text-[11px] text-amber-950 flex items-center gap-1 truncate">
          <span>👑 我方城池</span>
          <span className="text-[9px] bg-stone-800 text-stone-100 px-1 py-0.2 rounded-full font-sans">
            {rulerProvinces.length}
          </span>
        </h4>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-[9px] bg-stone-200 hover:bg-stone-300 border border-stone-600 px-1 py-0.2 rounded font-bold text-stone-800 cursor-pointer active:scale-95 transition-transform shrink-0"
          title="最小化"
        >
          ─ 縮小
        </button>
      </div>

      {/* City List */}
      <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto pr-0.5 scrollbar-thin">
        {rulerProvinces.map(p => {
          const pData = gameState.provincesData[p.id];
          const isSelected = p.id === gameState.selectedProvinceId;
          const provinceGenerals = Object.values(gameState.generalsData).filter(
            g => g.provinceId === p.id && !g.isWild
          );
          const genCount = provinceGenerals.length;
          const totalTroops = provinceGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);

          return (
            <button
              key={p.id}
              onClick={() => onSelectProvince(p.id)}
              className={`w-full text-left px-1 py-0.5 rounded transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-amber-100/90 border-amber-800 shadow-sm ring-1 ring-amber-700/50'
                  : 'bg-white/80 hover:bg-stone-200/90 border-stone-300'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold leading-tight">
                <span className={`truncate max-w-[85px] ${isSelected ? 'text-amber-950 font-black' : 'text-stone-900'}`}>
                  ({p.id}) {p.name}
                </span>
                <span className="text-[9px] font-semibold text-rose-800 shrink-0">
                  {pData ? `${totalTroops}兵` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center text-[8.5px] text-stone-600 mt-0.5 leading-none">
                <span className="truncate">金:{pData?.gold} 糧:{pData?.food}</span>
                <span className="shrink-0 ml-0.5">{genCount}將</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

