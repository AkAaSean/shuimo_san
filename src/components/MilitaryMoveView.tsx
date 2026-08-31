import React, { useState } from 'react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';
import { GeneralAvatar } from './GeneralAvatar';

interface MilitaryMoveViewProps {
  gameState: GameState;
  onExit: () => void;
  onConfirmMove: (generalNames: string[], targetProvinceId: number) => void;
}

export default function MilitaryMoveView({ gameState, onExit, onConfirmMove }: MilitaryMoveViewProps) {
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const currentProvinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);

  const currentProv = gameState.provincesData[currentProvinceId] || null;
  const currentProvInfo = provinces.find(p => p.id === currentProvinceId) || null;

  const generals = Object.values(gameState.generalsData).filter(g => g.provinceId === currentProvinceId && !g.isWild);

  const connectedProvinces = currentProvInfo
    ? currentProvInfo.connections.map(id => ({
        id,
        info: provinces.find(p => p.id === id),
        state: gameState.provincesData[id]
      })).filter(cp => cp.state?.rulerName === gameState.rulerName)
    : [];

  const [targetProvinceId, setTargetProvinceId] = useState<number | null>(
    connectedProvinces.length > 0 ? connectedProvinces[0].id : null
  );

  const [selectedGenerals, setSelectedGenerals] = useState<Record<string, boolean>>({});

  if (!currentProv || !currentProvInfo) {
    return (
      <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2">尚未選擇出發郡縣</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選調動部隊之出發郡縣。</p>
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
    if (hasActed) return; // Cannot select generals who already acted!
    setSelectedGenerals(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const selectedCount = Object.values(selectedGenerals).filter(Boolean).length;
  const selectedNames = Object.keys(selectedGenerals).filter(k => selectedGenerals[k]);

  const handleExecute = () => {
    if (selectedNames.length === 0 || !targetProvinceId) return;
    onConfirmMove(selectedNames, targetProvinceId);
  };

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b-[2px] border-[#1c1917] flex justify-between items-center bg-[#f2efeb]">
        <div>
          <span className="font-black text-lg">武將調動</span>
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
          {/* Target Province Selection */}
          <div className="bg-white border-2 border-[#1c1917] p-4 shadow-[3px_3px_0_#1c1917]">
            <div className="font-bold text-sm mb-2 text-stone-800">選擇移動目標相鄰郡：</div>
            {connectedProvinces.length === 0 ? (
              <div className="text-sm text-red-600 font-bold p-2 bg-red-50 border border-red-200">
                本郡周遭沒有可以調動前往的我方郡縣。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {connectedProvinces.map(cp => {
                  const isSelected = targetProvinceId === cp.id;
                  const cpGenerals = Object.values(gameState.generalsData).filter(g => g.provinceId === cp.id && !g.isWild);
                  const cpTotalTroops = cpGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);
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
                      <div className="font-black text-sm text-stone-900">
                        {cp.info?.name} ({cp.id}郡)
                      </div>
                      <div className="text-xs text-stone-600">
                        君主: <span className="font-bold">{cp.state?.rulerName || '無'}</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        總兵力: <strong className="text-stone-800">{cpTotalTroops.toLocaleString()}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rule Note */}
          <div className="bg-amber-100/70 border border-amber-400 p-2.5 text-xs text-amber-900">
            <span className="font-bold">調動規則：</span>
            本月已經執行過內政/商業/兵士/謀略等任務之武將，<span className="font-black text-red-700">不能移動</span>。調動後武將本月視為已行動。
          </div>

          {/* General List */}
          <div className="bg-white border-2 border-[#1c1917] p-4 shadow-[3px_3px_0_#1c1917]">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm">選擇調動武將：</span>
              <span className="text-xs text-stone-500 font-bold">
                已選: {selectedCount} 位武將
              </span>
            </div>

            {generals.length === 0 ? (
              <div className="text-center py-6 text-stone-500 text-sm font-bold">
                本郡無駐守武將
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
                          onChange={() => {}} // handled by parent div onClick
                          className="w-4 h-4 accent-[#991b1b]"
                        />
                        <GeneralAvatar name={g.name} size={38} className="shrink-0 rounded shadow-xs" />
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
                            <span>帶兵: <strong className="text-[#991b1b]">{g.soldiers}</strong></span>
                            <span>戰力: {g.str}{itemBonus.strBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.strBonus}</strong>}</span>
                            <span>謀略: {g.int}{itemBonus.intBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.intBonus}</strong>}</span>
                            <span>政治: {g.pol}{itemBonus.polBonus > 0 && <strong className="text-emerald-700 font-bold">+{itemBonus.polBonus}</strong>}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {isDisabled ? (
                          <span className="text-xs font-bold text-stone-500 bg-stone-300 px-2 py-1 rounded">
                            本月已行動 (無法移動)
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-1 rounded ${isChecked ? 'bg-[#991b1b] text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isChecked ? '已選擇' : '可調動'}
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
      <div className="p-4 border-t-[2px] border-[#1c1917] bg-[#f2efeb] flex justify-center">
        <button
          disabled={selectedCount === 0 || !targetProvinceId}
          onClick={handleExecute}
          className={`w-full max-w-lg py-3 font-black text-base border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] transition-all text-white
            ${selectedCount > 0 && targetProvinceId ? 'bg-[#991b1b] hover:bg-red-800 active:scale-95 cursor-pointer' : 'bg-stone-400 cursor-not-allowed opacity-60'}
          `}
        >
          確認調動 ({selectedCount} 位武將)
        </button>
      </div>
    </div>
  );
}
