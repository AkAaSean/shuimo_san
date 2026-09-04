import React, { useState } from 'react';
import { GameState, PendingBattlePlan } from '../types';
import { provinces } from '../data/provinces';

interface PendingBattlesPanelProps {
  gameState: GameState;
  onCancelBattle: (planId?: string, targetProvinceId?: number) => void;
}

export default function PendingBattlesPanel({ gameState, onCancelBattle }: PendingBattlesPanelProps) {
  // 手機版預設收合為小藥丸，避免遮擋地圖與城池資訊
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const pendingList: PendingBattlePlan[] = gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : []);

  if (pendingList.length === 0) {
    return null;
  }

  return (
    <>
      {/* 緊湊浮動膠囊按鈕：放置於左側城池資訊下方，絕不遮擋右側城池清單 */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#991b1b] hover:bg-red-800 text-white border-2 border-stone-900 px-2.5 py-1 rounded shadow-lg font-serif flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all text-xs select-none max-w-fit"
        title="查看發起中的出征計畫"
      >
        <span className="animate-pulse text-xs">⚔️</span>
        <span className="font-black tracking-wide">出征軍務</span>
        <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-1.5 py-0.2 rounded-full font-sans">
          {pendingList.length}
        </span>
        <span className="text-[10px] text-amber-200">▾</span>
      </button>

      {/* 展開之軍務詳情浮動彈窗（帶輕量背景遮罩） */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-3 font-serif select-none"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-[#f7f4ed] border-2 border-stone-800 rounded shadow-2xl overflow-hidden w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="bg-[#991b1b] text-white px-3 py-2 flex justify-between items-center border-b-2 border-stone-800">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base tracking-wider">
                <span className="animate-pulse">⚔️</span>
                <span>出征軍務名冊</span>
                <span className="bg-amber-400 text-stone-950 text-[11px] px-2 py-0.5 rounded-full font-black font-sans">
                  共 {pendingList.length} 場計畫
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-200 hover:text-white bg-stone-900/40 hover:bg-stone-900/70 border border-stone-700 px-2 py-0.5 rounded text-xs font-bold cursor-pointer transition-colors"
                title="關閉面板"
              >
                ✕ 關閉
              </button>
            </div>

            {/* List Content */}
            <div className="p-3 flex flex-col gap-2.5 overflow-y-auto bg-stone-100/95 text-stone-800 flex-1">
              <div className="text-xs text-stone-600 font-bold border-b border-stone-300 pb-1.5 flex justify-between items-center">
                <span>出征隊列（點擊『休息』後將依序開戰）</span>
                {pendingList.length > 1 && (
                  <button
                    onClick={() => {
                      onCancelBattle();
                      setIsOpen(false);
                    }}
                    className="text-xs text-red-700 hover:text-red-900 font-black cursor-pointer underline bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-200"
                  >
                    全部撤銷出征
                  </button>
                )}
              </div>

              {pendingList.map((plan, idx) => {
                const targetProvInfo = provinces.find(p => p.id === plan.targetProvinceId);
                const targetProvState = gameState.provincesData[plan.targetProvinceId];

                // Count total soldiers
                let totalTroops = 0;
                plan.attackingGenerals.forEach(gName => {
                  const gen = gameState.generalsData[gName];
                  if (gen) totalTroops += gen.soldiers;
                });

                // Count target city total defending troops (defending generals)
                let targetGenTroops = 0;
                plan.defendingGenerals.forEach(gName => {
                  const gen = gameState.generalsData[gName];
                  if (gen) targetGenTroops += gen.soldiers;
                });

                return (
                  <div 
                    key={plan.id || idx}
                    className="p-2.5 border border-stone-400 bg-white rounded shadow-sm text-xs flex flex-col gap-1.5"
                  >
                    {/* Title & Target */}
                    <div className="flex justify-between items-center border-b border-stone-200 pb-1 flex-wrap gap-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-black text-sm text-[#991b1b]">
                          #{idx + 1} 攻打【{targetProvInfo?.name || '未知城池'}】
                        </span>
                        <span className="text-[11px] text-stone-500 font-bold">
                          ({plan.targetProvinceId}郡)
                        </span>
                        {plan.isFieldEncounter && (
                          <span className="bg-rose-700 text-amber-200 text-[10px] px-1.5 py-0.2 rounded font-black border border-rose-400 animate-pulse shadow">
                            ⚔️ 野戰遭遇戰
                          </span>
                        )}
                        {plan.isSequential && (
                          <span className="bg-amber-700 text-amber-100 text-[10px] px-1.5 py-0.2 rounded font-black border border-amber-300 animate-pulse shadow">
                            🔥 車輪戰
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onCancelBattle(plan.id, plan.targetProvinceId);
                          if (pendingList.length <= 1) {
                            setIsOpen(false);
                          }
                        }}
                        className="px-2 py-0.5 bg-rose-100 border border-rose-300 text-red-800 hover:bg-rose-200 active:scale-95 rounded text-[11px] font-black cursor-pointer transition-all"
                        title="取消此場進軍計畫"
                      >
                        撤銷此戰
                      </button>
                    </div>

                    {/* Attacker generals overview */}
                    <div className="text-xs text-stone-700">
                      <div className="font-bold text-stone-900 mb-1 flex items-center justify-between">
                        <span>出征將領 ({plan.attackingGenerals.length}人):</span>
                        <span className="text-[11px] text-stone-500">主帥：★ {plan.attackingGenerals[0]}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {plan.attackingGenerals.map((gName, gIdx) => (
                          <span 
                            key={gName}
                            className={`px-1.5 py-0.5 rounded text-[11px] border ${
                              gIdx === 0 
                                ? 'bg-amber-100 text-stone-900 border-amber-400 font-black ring-1 ring-amber-300' 
                                : 'bg-stone-100 text-stone-700 border-stone-300 font-medium'
                            }`}
                          >
                            {gIdx === 0 ? `★ ${gName}` : gName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Troops & Logistics */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 bg-stone-50 p-1.5 rounded border border-stone-200">
                      <div>總參戰兵力: <strong className="text-red-800 font-black">{totalTroops}</strong></div>
                      <div>目標城池總守軍: <strong className="text-stone-800 font-black">{targetGenTroops.toLocaleString()}</strong></div>
                      <div>隨軍攜帶金: <strong className="text-amber-800 font-bold">{plan.attackerGold}</strong></div>
                      <div>隨軍攜帶糧: <strong className="text-emerald-800 font-bold">{plan.attackerFood}</strong></div>
                    </div>
                  </div>
                );
              })}

              <div className="text-[11px] text-stone-600 font-bold text-center pt-1.5 border-t border-stone-300 flex items-center justify-center gap-1">
                <span>※ 點擊主畫面或狀態列</span>
                <span className="bg-[#991b1b] text-white px-1.5 py-0.2 rounded text-[10px]">休息</span>
                <span>即刻發動戰爭！</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-stone-300 bg-stone-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1 bg-stone-800 hover:bg-stone-900 text-stone-100 font-bold text-xs rounded cursor-pointer"
              >
                確定並返回大地圖
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
