import React, { useState } from 'react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';

interface BattleLaunchViewProps {
  gameState: GameState;
  onExit: () => void;
  onLaunchBattle: (targetProvinceId: number, attackingGeneralNames: string[]) => void;
}

export default function BattleLaunchView({ gameState, onExit, onLaunchBattle }: BattleLaunchViewProps) {
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const currentProvinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);

  const currentProv = gameState.provincesData[currentProvinceId] || null;
  const currentProvInfo = provinces.find(p => p.id === currentProvinceId) || null;

  const generals = Object.values(gameState.generalsData).filter(g => g.provinceId === currentProvinceId && !g.isWild);

  // Target connected enemy provinces (or any non-own connected province)
  const connectedProvinces = currentProvInfo
    ? currentProvInfo.connections.map(id => ({
        id,
        info: provinces.find(p => p.id === id),
        state: gameState.provincesData[id]
      })).filter(cp => cp.state?.rulerName !== gameState.rulerName)
    : [];

  const [targetProvinceId, setTargetProvinceId] = useState<number | null>(
    connectedProvinces.length > 0 ? connectedProvinces[0].id : null
  );

  const [selectedGenerals, setSelectedGenerals] = useState<Record<string, boolean>>({});

  if (!currentProv || !currentProvInfo) {
    return (
      <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2">尚未選擇出征郡縣</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選我方出兵之出征郡縣。</p>
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

  const toggleSelectGeneral = (name: string, hasActed: boolean) => {
    if (hasActed) return; // Cannot participate if already acted!
    setSelectedGenerals(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const selectedCount = Object.values(selectedGenerals).filter(Boolean).length;
  const selectedNames = Object.keys(selectedGenerals).filter(k => selectedGenerals[k]);

  const targetProvData = targetProvinceId ? gameState.provincesData[targetProvinceId] : null;
  const targetProvInfo = targetProvinceId ? provinces.find(p => p.id === targetProvinceId) : null;
  const targetRuler = targetProvData?.rulerName;
  const allianceExpiry = targetRuler ? gameState.alliances?.[gameState.rulerName]?.[targetRuler] : undefined;
  const currentAbsolute = gameState.year * 12 + gameState.month;
  const isAllied = allianceExpiry ? allianceExpiry > currentAbsolute : false;

  const handleLaunch = () => {
    if (selectedNames.length === 0 || !targetProvinceId || isAllied) return;
    onLaunchBattle(targetProvinceId, selectedNames);
  };

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-[2px] border-[#1c1917] flex justify-between items-center bg-[#f2efeb]">
        <div>
          <span className="font-black text-lg text-[#991b1b]">發動戰役 (出征編隊)</span>
          <span className="text-xs text-stone-500 ml-2">[{currentProvInfo.name} {currentProvInfo.id}郡]</span>
        </div>
        <button
          onClick={onExit}
          className="px-4 py-1 border-[2px] border-[#1c1917] font-bold hover:bg-[#1c1917] hover:text-white transition-colors shadow-[2px_2px_0_#1c1917] active:scale-95 text-xs"
        >
          返回
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-lg space-y-4">
          {/* Target Enemy Province */}
          <div className="bg-white border-2 border-[#1c1917] p-4 shadow-[3px_3px_0_#1c1917]">
            <div className="font-bold text-sm mb-2 text-stone-800">選擇進攻目標郡：</div>
            {connectedProvinces.length === 0 ? (
              <div className="text-sm text-red-600 font-bold p-2 bg-red-50 border border-red-200">
                本郡周遭沒有可以進攻的敵方郡縣。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {connectedProvinces.map(cp => {
                  const isSelected = targetProvinceId === cp.id;
                  const isEnemy = cp.state?.rulerName !== gameState.rulerName;
                  return (
                    <button
                      key={cp.id}
                      onClick={() => setTargetProvinceId(cp.id)}
                      className={`p-2.5 border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[#991b1b] bg-amber-50 shadow-sm ring-1 ring-[#991b1b]'
                          : 'border-stone-300 bg-stone-50 hover:border-stone-500'
                      }`}
                    >
                      <div className="font-black text-sm text-stone-900 flex justify-between">
                        <span>{cp.info?.name} ({cp.id}郡)</span>
                        {isEnemy && <span className="text-[10px] text-red-700 font-bold bg-red-100 px-1 py-0.2 rounded">目標</span>}
                      </div>
                      <div className="text-xs text-stone-600 mt-1">
                        君主: <span className="font-bold text-[#991b1b]">{cp.state?.rulerName || '無'}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        守軍: {cp.state?.soldiers || 0} 兵
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rule Note */}
          <div className="bg-red-50 border border-red-300 p-2.5 text-xs text-red-900">
            <span className="font-bold">參戰規則：</span>
            本月已執行過任務之武將，<span className="font-black text-red-700">不能參與發動戰役</span>。請挑選待命中的將領組建出征軍團。
          </div>

          {/* Attacking General List */}
          <div className="bg-white border-2 border-[#1c1917] p-4 shadow-[3px_3px_0_#1c1917]">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm">挑選出征將領：</span>
              <span className="text-xs text-stone-500 font-bold">
                已選: {selectedCount} 位將領
              </span>
            </div>

            {generals.length === 0 ? (
              <div className="text-center py-6 text-stone-500 text-sm font-bold">
                本郡無將領可出征
              </div>
            ) : (
              <div className="space-y-2">
                {generals.map(g => {
                  const isChecked = !!selectedGenerals[g.name];
                  const isDisabled = g.hasActed;
                  const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

                  return (
                    <div
                      key={g.name}
                      onClick={() => toggleSelectGeneral(g.name, g.hasActed)}
                      className={`p-3 border-2 transition-all flex items-center justify-between
                        ${isChecked ? 'border-[#991b1b] bg-amber-50' : 'border-stone-300 bg-stone-50'}
                        ${isDisabled ? 'opacity-50 bg-stone-200/90 cursor-not-allowed' : 'cursor-pointer hover:border-stone-600'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={isDisabled}
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[#991b1b]"
                        />
                        <div>
                          <div className="font-black text-base flex items-center gap-2 flex-wrap">
                            <span>{g.name}</span>
                            {g.isRuler ? (
                              <span className="text-xs bg-[#991b1b] text-white px-1.5 py-0.5 rounded-sm">君主</span>
                            ) : (
                              <span className="text-xs bg-stone-700 text-stone-100 px-1.5 py-0.5 rounded-sm">{g.role || '將領'}</span>
                            )}
                            {itemBonus.items.map(it => (
                              <span key={it.id} className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                {it.name}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-stone-600 flex gap-3 mt-0.5 flex-wrap">
                            <span>兵力: <strong className="text-[#991b1b]">{g.soldiers}</strong></span>
                            <span>戰力: {g.str}{itemBonus.strBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.strBonus}</strong>}</span>
                            <span>謀略: {g.int}{itemBonus.intBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.intBonus}</strong>}</span>
                            <span>訓練: {g.training}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isDisabled ? (
                          <span className="text-xs font-bold text-stone-500 bg-stone-300 px-2 py-1 rounded">
                            本月已行動 (無法參戰)
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${isChecked ? 'bg-[#991b1b] text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isChecked ? '已入列' : '可出征'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t-[2px] border-[#1c1917] bg-[#f2efeb] flex justify-center flex-col items-center gap-2">
        {isAllied && (
          <div className="text-sm font-bold text-rose-700 bg-rose-100 px-4 py-1.5 rounded border border-rose-300">
            ⚠️ 兩軍已結為同盟，不可發動戰役！
          </div>
        )}
        <button
          disabled={selectedCount === 0 || !targetProvinceId || isAllied}
          onClick={handleLaunch}
          className={`w-full max-w-lg py-3 font-black text-base border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] transition-all text-white
            ${selectedCount > 0 && targetProvinceId && !isAllied ? 'bg-[#991b1b] hover:bg-red-800 active:scale-95 cursor-pointer' : 'bg-stone-400 cursor-not-allowed opacity-60'}
          `}
        >
          全軍出擊！發動戰役 ({selectedCount} 位將領)
        </button>
      </div>
    </div>
  );
}
