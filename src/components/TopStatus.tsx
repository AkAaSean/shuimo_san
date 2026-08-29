import React from 'react';
import { GameState } from '../types';

interface TopStatusProps {
  gameState: GameState;
  onRest?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenManual?: () => void;
}

export default function TopStatus({ gameState, onRest, onToggleFullscreen, isFullscreen, onOpenManual }: TopStatusProps) {
  // Calculate ruler total gold and food
  const rulerProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const totalGold = rulerProvinces.reduce((sum, p) => sum + p.gold, 0);
  const totalFood = rulerProvinces.reduce((sum, p) => sum + p.food, 0);

  // Convert year to era string
  const getEraString = (year: number) => {
    if (year === 189) return '中平六年';
    if (year === 190) return '初平元年';
    return `西元${year}年`;
  };

  return (
    <div className="w-full bg-stone-200 border-b-2 border-stone-800 p-2 shadow-md relative z-10 font-serif">
      <div className="absolute top-0 left-0 right-0 h-1 bg-stone-900 opacity-80"></div>
      
      <div className="flex flex-col gap-1 px-1 pt-0.5">
        <div className="flex justify-between items-center text-sm font-bold text-stone-800">
          <span>{`[${getEraString(gameState.year)}${gameState.month}月${gameState.season}]`}</span>
          
          <div className="flex items-center gap-1.5">
            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="bg-[#faf5ea] hover:bg-[#f3ead3] active:scale-95 text-[#78350f] border border-[#a16207] px-2 py-0.5 rounded shadow-xs text-xs font-black cursor-pointer transition-all flex items-center gap-1"
                title="查看水墨三國說明書 v0.2"
              >
                <span>📖</span>
                <span className="hidden sm:inline">說明書</span>
              </button>
            )}

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="bg-stone-300 hover:bg-stone-400 active:scale-95 text-stone-900 border border-stone-600 px-2 py-0.5 rounded shadow-xs text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                title={isFullscreen ? "退出全螢幕" : "切換全螢幕"}
              >
                <span>{isFullscreen ? '✕' : '⛶'}</span>
                <span className="hidden sm:inline">{isFullscreen ? '視窗' : '全螢幕'}</span>
              </button>
            )}

            <span className="text-stone-700 bg-stone-300 px-2 py-0.5 rounded-sm border border-stone-400 text-xs">
              君主: <span className="font-bold text-stone-900">{gameState.rulerName}</span>
            </span>
            {onRest && (() => {
              const pendingCount = (gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : [])).length;
              return (
                <button
                  onClick={onRest}
                  className={`border-2 border-stone-800 px-2.5 py-0.5 rounded shadow text-xs font-bold cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
                    pendingCount > 0
                      ? 'bg-[#991b1b] hover:bg-red-800 text-white ring-2 ring-amber-400 font-black animate-pulse'
                      : 'bg-amber-800 hover:bg-amber-900 text-amber-100'
                  }`}
                  title={pendingCount > 0 ? `結束本月並依序發動 ${pendingCount} 場戰役！` : "結束本月回合"}
                >
                  <span>{pendingCount > 0 ? '⚔️' : '🌙'}</span>
                  <span>{pendingCount > 1 ? `休息 (開戰 ${pendingCount}場)` : (pendingCount === 1 ? '休息 (開戰)' : '休息')}</span>
                </button>
              );
            })()}
          </div>
        </div>

        
        <div className="flex justify-between items-center text-xs text-stone-800">
          <span className="flex items-center gap-1">
            人望: <span className="font-bold text-stone-900">{gameState.popularity}</span>
          </span>
          <span className="flex items-center gap-1">
            總金: <span className="font-bold text-amber-700">{totalGold.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1">
            總糧: <span className="font-bold text-emerald-800">{totalFood.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

