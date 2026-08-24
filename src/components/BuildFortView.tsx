import React, { useState } from 'react';
import { GameState } from '../types';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';

interface BuildFortViewProps {
  gameState: GameState;
  onExit: () => void;
  onBuild: (x: number, y: number, generalName: string) => void;
}

export default function BuildFortView({ gameState, onExit, onBuild }: BuildFortViewProps) {
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const provinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);
    
  const province = gameState.provincesData[provinceId] || null;
  const tierRules = getProvinceTierRules(provinceId);
  const [selectedTile, setSelectedTile] = useState<{ x: number, y: number } | null>(null);

  const generals = provinceId ? Object.values(gameState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild) : [];
  const availableGenerals = generals.filter(g => !g.hasActed);

  const [selectedGenName, setSelectedGenName] = useState<string | null>(
    availableGenerals.length > 0 ? availableGenerals[0].name : null
  );

  if (!province) {
    return (
      <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2">尚未選擇領地</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選欲修築關寨之郡縣。</p>
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

  const cost = province.price * 100;
  const canAfford = province.gold >= cost;
  const maxForts = tierRules.maxForts;
  const atMaxForts = province.forts.length >= maxForts;
  const underConstruction = province.underConstructionFort;

  const GRID_SIZE = 10;

  const getTerrain = (x: number, y: number) => {
    if ((x === 4 || x === 5) && (y === 4 || y === 5)) return '城池';
    if (x === 2 || (x === 3 && y > 6)) return '水域';
    if (x > 7 && y < 3) return '山丘';
    if ((x === 0 && y === 5) || (x === 9 && y === 5) || (x === 5 && y === 0) || (x === 5 && y === 9)) return '通路';
    return '平地';
  };

  const getTerrainColor = (t: string) => {
    switch(t) {
      case '城池': return 'bg-stone-800 border-stone-900';
      case '水域': return 'bg-blue-300/50 border-blue-400';
      case '山丘': return 'bg-stone-500/50 border-stone-600';
      case '通路': return 'bg-amber-100/50 border-amber-300 border-dashed';
      case '平地': default: return 'bg-transparent border-stone-300/30';
    }
  };

  const hasFort = (x: number, y: number) => {
    return province.forts.some(f => f.x === x && f.y === y);
  };

  const isUnderConstruction = (x: number, y: number) => {
    return underConstruction && underConstruction.x === x && underConstruction.y === y;
  };

  const isValidBuildSite = (x: number, y: number) => {
    const t = getTerrain(x, y);
    if (t === '城池' || t === '水域' || t === '通路') return false;
    if (hasFort(x, y)) return false;
    if (isUnderConstruction(x, y)) return false;
    return true;
  };

  const handleTileClick = (x: number, y: number) => {
    if (underConstruction) return; // Cannot select tile if already building
    if (isValidBuildSite(x, y)) {
      setSelectedTile({ x, y });
    } else {
      setSelectedTile(null);
    }
  };

  const getConstructionTurns = (pol: number) => {
    if (pol >= 91) return 1;
    if (pol >= 81) return 2;
    if (pol >= 71) return 3;
    if (pol >= 61) return 4;
    return -1;
  };

  // Only allow generals with >= 61 pol
  const canGeneralBuild = (pol: number) => pol > 60;

  return (
    <div className="w-full h-full bg-[#f2efeb] text-[#1c1917] flex flex-col font-serif absolute inset-0 z-50">
      {/* Header */}
      <div className="bg-[#1c1917] text-[#f2efeb] p-4 flex justify-between items-center">
        <button onClick={onExit} className="border border-[#f2efeb] px-4 py-1 text-xs uppercase hover:bg-white/10 active:scale-95">取消返回</button>
        <span className="font-bold tracking-widest text-sm">建築關寨 - {provinceId}郡 ({tierRules.tierName})</span>
        <div className="w-16"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <div className="mb-3 text-center">
          <div className="text-xl font-bold mb-1">選擇關寨建築地點與督造武將</div>
          <div className="text-xs opacity-80 mb-1">
            建造成本: <span className={canAfford ? 'text-green-700 font-bold' : 'text-red-600 font-bold'}>{cost} 金</span> 
            (擁有: {province.gold} 金) | 目前關寨: {province.forts.length} / {maxForts}
          </div>
          <div className="text-[11px] text-stone-600">
            {tierRules.tierName}防禦工事上限為 {maxForts} 座 (本郡同時間僅能進行一項工事)
          </div>
          {atMaxForts && <div className="text-red-600 font-bold text-xs mt-1">已達本郡防禦設施上限！</div>}
          {underConstruction && (
            <div className="text-blue-800 font-bold text-xs mt-1 bg-blue-100 p-1 border border-blue-300">
              興建中：{underConstruction.builderName} 督造 (剩餘 {underConstruction.turnsLeft} 回合)
            </div>
          )}
        </div>

        {/* General Selection */}
        {!underConstruction && (
          <div className="w-full max-w-sm bg-white border border-stone-400 p-2.5 mb-3 shadow-sm">
            <div className="text-xs font-bold mb-1.5 flex justify-between">
              <span>選擇督造武將 (政治 61 以上)：</span>
              <span className="text-stone-500 font-normal">可行動: {availableGenerals.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {generals.map(g => {
                const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                const polTotal = g.pol + itemBonus.polBonus;
                const canBuild = canGeneralBuild(polTotal);
                const turns = getConstructionTurns(polTotal);
                const isDisabled = g.hasActed || !canBuild;
                return (
                  <button
                    key={g.name}
                    disabled={isDisabled}
                    onClick={() => setSelectedGenName(g.name)}
                    className={`px-2.5 py-1.5 border text-xs font-bold whitespace-nowrap transition-all ${
                      selectedGenName === g.name
                        ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]'
                        : 'border-stone-300 bg-stone-50'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-stone-600'}`}
                  >
                    <div>{g.name} (政:{polTotal})</div>
                    <div className="text-[10px] text-stone-500 font-normal">
                      {g.hasActed ? '已行動' : (!canBuild ? '政治不足' : `需 ${turns} 月`)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tactical Map Grid */}
        <div className="border-[4px] border-[#1c1917] bg-[#dcd7d0] p-1 shadow-xl">
          <div 
            className="grid gap-[1px] bg-[#1c1917]/20" 
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: '280px', 
              height: '280px'
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
              const x = idx % GRID_SIZE;
              const y = Math.floor(idx / GRID_SIZE);
              const terrain = getTerrain(x, y);
              const fort = hasFort(x, y);
              const building = isUnderConstruction(x, y);
              const isSelected = selectedTile?.x === x && selectedTile?.y === y;
              const valid = isValidBuildSite(x, y);

              return (
                <div 
                  key={idx}
                  onClick={() => handleTileClick(x, y)}
                  className={`
                    w-full h-full border relative
                    ${getTerrainColor(terrain)}
                    ${valid ? 'cursor-pointer hover:bg-white/30' : 'cursor-not-allowed opacity-80'}
                    ${isSelected ? 'ring-2 ring-[#991b1b] ring-inset bg-amber-200/50' : ''}
                  `}
                >
                  {fort && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[70%] h-[70%] border border-[#1c1917] bg-[#f2efeb] shadow-[1px_1px_0_rgba(28,25,23,1)] font-bold text-[10px] flex items-center justify-center">
                        關
                      </div>
                    </div>
                  )}
                  {building && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[70%] h-[70%] border border-blue-800 bg-blue-100 shadow-[1px_1px_0_rgba(30,64,175,1)] font-bold text-blue-900 text-[10px] flex items-center justify-center">
                        建
                      </div>
                    </div>
                  )}
                  {!fort && !building && terrain === '城池' && (
                    <div className="absolute inset-0 flex items-center justify-center text-[#f2efeb] font-bold text-[10px]">
                      城
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Confirm */}
      <div className="p-4 border-t-[2px] border-[#1c1917] bg-white/50">
        <button 
          onClick={() => selectedTile && selectedGenName && onBuild(selectedTile.x, selectedTile.y, selectedGenName)}
          disabled={!selectedTile || !canAfford || atMaxForts || !selectedGenName || !!underConstruction}
          className={`w-full py-3.5 border-[2px] border-[#1c1917] font-black text-base transition-all shadow-[3px_3px_0_#1c1917]
            ${(!selectedTile || !canAfford || atMaxForts || !selectedGenName || !!underConstruction) 
              ? 'bg-stone-300 text-stone-500 shadow-none border-stone-400 cursor-not-allowed' 
              : 'bg-[#991b1b] text-[#f2efeb] active:scale-[0.98] active:shadow-[1px_1px_0_#1c1917]'
            }
          `}
        >
          {!!underConstruction ? '已有工事進行中' : atMaxForts ? '已達上限' : !canAfford ? '資金不足' : !selectedGenName ? '無可用武將' : selectedTile ? '確認建造關寨' : '請點選地圖建造位置'}
        </button>
      </div>
    </div>
  );
}
