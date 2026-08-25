import React, { useState } from 'react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';

interface StatusViewProps {
  gameState: GameState;
  initialAction: string;
  onExit: () => void;
}

export default function StatusView({ gameState, initialAction, onExit }: StatusViewProps) {
  const [activeTab, setActiveTab] = useState(initialAction);

  // 取得玩家君主所屬的所有領地
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  
  // 決定預設顯示的郡
  const defaultProvinceId = gameState.selectedProvinceId !== null 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);

  const [currentProvinceId, setCurrentProvinceId] = useState<number>(defaultProvinceId);

  const provinceState = gameState.provincesData[currentProvinceId] || null;
  const provinceData = provinces.find(p => p.id === currentProvinceId);
  const generals = Object.values(gameState.generalsData).filter(g => g.provinceId === currentProvinceId && !g.isWild);
  const totalGeneralsSoldiers = generals.reduce((sum, g) => sum + g.soldiers, 0);
  const totalSoldiers = (provinceState?.soldiers || 0) + totalGeneralsSoldiers;

  if (!provinceState || !provinceData) {
    return (
      <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] p-6 items-center justify-center">
        <div className="bg-white border-2 border-[#1c1917] p-6 text-center max-w-sm shadow-[4px_4px_0_#1c1917]">
          <h3 className="text-lg font-black mb-2">尚未選擇領地</h3>
          <p className="text-sm text-stone-600 mb-4">請先在大地圖上點選我方或目標郡縣。</p>
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

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b-[2px] border-[#1c1917] flex justify-between items-center bg-[#f2efeb]">
        <div className="flex items-center gap-2">
          <div className="font-black text-xl tracking-wider">狀態</div>
          {(ownedProvinces.length > 1 || !ownedProvinces.some(op => op.id === currentProvinceId)) && (
            <select
              value={currentProvinceId}
              onChange={(e) => setCurrentProvinceId(Number(e.target.value))}
              className="bg-white border border-stone-400 text-xs font-bold px-2 py-1 rounded shadow-xs focus:outline-none"
            >
              {!ownedProvinces.some(op => op.id === currentProvinceId) && provinceData && (
                <option value={currentProvinceId}>
                  【{provinceData.name}】({provinceState?.rulerName ? `${provinceState.rulerName}軍` : '空白地'}) {provinceState?.isAutonomous ? '[自治]' : ''}
                </option>
              )}
              {ownedProvinces.map(op => {
                const pInfo = provinces.find(p => p.id === op.id);
                return (
                  <option key={op.id} value={op.id}>
                    【{pInfo?.name || `郡${op.id}`}】(我方) {op.isAutonomous ? '[自治]' : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>
        <button 
          onClick={onExit}
          className="px-4 py-1 border-[2px] border-[#1c1917] font-bold hover:bg-[#1c1917] hover:text-white transition-colors shadow-[2px_2px_0_#1c1917] active:scale-95"
        >
          返回
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b-[2px] border-[#1c1917] bg-white">
        {['查看本郡狀態', '檢視將領', '外交關係'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 font-bold text-center border-r-[2px] border-[#1c1917] last:border-r-0 transition-colors
              ${activeTab === tab ? 'bg-[#991b1b] text-[#f2efeb]' : 'hover:bg-stone-200'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
        {activeTab === '查看本郡狀態' && (
          <div className="w-full max-w-lg bg-white border-2 border-[#1c1917] p-6 shadow-[4px_4px_0_#1c1917]">
            <h2 className="text-2xl font-black mb-2 text-center border-b-2 border-[#1c1917] pb-4 flex items-center justify-center gap-2 flex-wrap">
              <span>{provinceData.name} ({provinceData.region})</span>
              <span className="text-xs bg-stone-800 text-amber-200 px-2 py-0.5 rounded font-bold">
                {getProvinceTierRules(currentProvinceId).tierName}
              </span>
            </h2>
            <div className="text-center text-stone-500 text-xs mb-6 pb-4 border-b-2 border-stone-200 space-y-1">
              <div>{provinceData.desc}</div>
              <div className="text-amber-800 font-bold">【定位】{getProvinceTierRules(currentProvinceId).desc}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-base">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">君主</span>
                <span className="font-black text-[#991b1b]">{provinceState.rulerName || '無主'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">武將數</span>
                <span className="font-black">{generals.length} 人</span>
              </div>

              <div className="col-span-2 border-b border-stone-300 my-1"></div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">金庫</span>
                <span className="font-black text-amber-800">{provinceState.gold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">兵糧</span>
                <span className="font-black text-emerald-800">{provinceState.food.toLocaleString()}</span>
              </div>

              <div className="col-span-2 border-b border-stone-300 my-1"></div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">人口</span>
                <span className="font-black">{provinceState.population.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">兵士</span>
                <span className="font-black text-[#991b1b]">{totalSoldiers.toLocaleString()}</span>
              </div>

              <div className="col-span-2 border-b border-stone-300 my-1"></div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">土地開發</span>
                <span className="font-black text-amber-700">{provinceState.value} / {getProvinceTierRules(currentProvinceId).maxDev}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">商業發展</span>
                <span className="font-black text-sky-700">{provinceState.commerce || 0} / {getProvinceTierRules(currentProvinceId).maxCommerce}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">防災程度</span>
                <span className="font-black text-blue-700">{100 - provinceState.flood}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">民心忠誠</span>
                <span className="font-black text-emerald-700">{provinceState.loyalty}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === '檢視將領' && (
          <div className="w-full max-w-lg flex flex-col gap-4">
            {generals.map(g => {
              const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);

              return (
                <div key={g.name} className="bg-white border-2 border-[#1c1917] p-4 shadow-[4px_4px_0_#1c1917]">
                  <div className="flex justify-between items-end border-b-2 border-[#1c1917] pb-2 mb-2">
                    <div className="text-xl font-black flex items-center gap-2">
                      {g.name}
                      {g.isRuler ? (
                        <span className="text-xs bg-[#991b1b] text-white px-2 py-0.5 rounded-sm font-bold">君主</span>
                      ) : (
                        <span className="text-xs bg-stone-700 text-stone-100 px-2 py-0.5 rounded-sm font-bold">{g.role || '將領'}</span>
                      )}
                      <span className="text-xs text-stone-500 font-semibold">上限:{g.maxTroops || 3000}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-500">
                      {g.hasActed ? (
                        <span className="text-xs bg-stone-300 text-stone-700 px-2 py-0.5 rounded font-bold">本月已行動</span>
                      ) : (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">待命可行動</span>
                      )}
                      <span>忠誠: <strong className={`font-black ${
                        g.loyalty >= 95 ? 'text-emerald-800' :
                        g.loyalty >= 80 ? 'text-[#1c1917]' :
                        g.loyalty >= 70 ? 'text-amber-800' : 'text-red-700'
                      }`}>{g.loyalty}</strong></span>
                    </div>
                  </div>

                  {/* Held Treasure Items Banner */}
                  {itemBonus.items.length > 0 && (
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 bg-amber-50/80 border border-amber-300/80 px-2 py-1 rounded text-xs">
                      <span className="font-bold text-amber-900 text-[11px] shrink-0">佩戴寶物:</span>
                      {itemBonus.items.map(item => (
                        <span
                          key={item.id}
                          className="bg-amber-200/90 text-amber-950 font-black px-1.5 py-0.5 rounded text-[10px] border border-amber-400/80 shadow-2xs"
                        >
                          {item.name} ({item.bonusDesc.split('，')[0]})
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-5 gap-1.5 mb-3 text-center text-sm">
                    <div className="bg-stone-100 p-1 rounded-sm border border-stone-300">
                      <div className="text-stone-500 text-xs mb-1">統帥</div>
                      <div className="font-black flex items-center justify-center gap-0.5">
                        <span>{g.hp}</span>
                        {itemBonus.hpBonus > 0 && (
                          <span className="text-emerald-700 font-black text-xs">+{itemBonus.hpBonus}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-stone-100 p-1 rounded-sm border border-stone-300">
                      <div className="text-stone-500 text-xs mb-1">謀略</div>
                      <div className="font-black flex items-center justify-center gap-0.5">
                        <span className="text-sky-900">{g.int}</span>
                        {itemBonus.intBonus > 0 && (
                          <span className="text-emerald-700 font-black text-xs">+{itemBonus.intBonus}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-stone-100 p-1 rounded-sm border border-stone-300">
                      <div className="text-stone-500 text-xs mb-1">戰力</div>
                      <div className="font-black flex items-center justify-center gap-0.5">
                        <span className="text-red-900">{g.str}</span>
                        {itemBonus.strBonus > 0 && (
                          <span className="text-emerald-700 font-black text-xs">+{itemBonus.strBonus}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-1 rounded-sm border border-amber-300">
                      <div className="text-amber-800 text-xs mb-1 font-bold">政治</div>
                      <div className="font-black text-amber-900 flex items-center justify-center gap-0.5">
                        <span>{g.pol}</span>
                        {itemBonus.polBonus > 0 && (
                          <span className="text-emerald-700 font-black text-xs">+{itemBonus.polBonus}</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-stone-100 p-1 rounded-sm border border-stone-300">
                      <div className="text-stone-500 text-xs mb-1">魅力</div>
                      <div className="font-black flex items-center justify-center gap-0.5">
                        <span>{g.cha}</span>
                        {itemBonus.chaBonus > 0 && (
                          <span className="text-emerald-700 font-black text-xs">+{itemBonus.chaBonus}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-sm bg-stone-800 text-stone-100 p-2">
                    <div>
                      <div className="text-stone-400 text-xs mb-0.5">帶兵數</div>
                      <div className="font-bold text-amber-300">{g.soldiers.toLocaleString()} / {g.maxTroops.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-stone-400 text-xs mb-0.5">訓練度</div>
                      <div className="font-bold text-emerald-300">{g.training}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {generals.length === 0 && (
              <div className="text-center text-stone-500 py-8 font-bold">
                本郡目前無將領
              </div>
            )}
          </div>
        )}

        {activeTab === '外交關係' && (
          <div className="w-full max-w-lg flex flex-col gap-4">
            <div className="bg-white border-2 border-[#1c1917] p-4 shadow-[4px_4px_0_#1c1917]">
              <h3 className="text-lg font-black mb-4 border-b-2 border-[#1c1917] pb-2 text-[#991b1b]">與各勢力之外交</h3>
              <div className="space-y-3">
                {Object.keys(gameState.diplomacyData?.[gameState.rulerName] || {}).length > 0 ? (
                  Object.entries(gameState.diplomacyData![gameState.rulerName]).map(([otherRuler, relation]) => {
                    const allianceExpiry = gameState.alliances?.[gameState.rulerName]?.[otherRuler];
                    let allianceText = '';
                    if (allianceExpiry) {
                      const currentAbsolute = gameState.year * 12 + gameState.month;
                      const monthsLeft = allianceExpiry - currentAbsolute;
                      if (monthsLeft > 0) {
                        allianceText = `(同盟中: 剩餘 ${monthsLeft} 個月)`;
                      }
                    }

                    return (
                      <div key={otherRuler} className="flex justify-between items-center p-2 bg-stone-100 border border-stone-300">
                        <div className="font-bold text-stone-800">
                          {otherRuler}勢力
                        </div>
                        <div className="flex items-center gap-2">
                          {allianceText && (
                            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold border border-sky-300">
                              {allianceText}
                            </span>
                          )}
                          <span className={`font-black ${
                            relation >= 90 ? 'text-emerald-700' :
                            relation >= 60 ? 'text-emerald-600' :
                            relation >= 40 ? 'text-stone-700' :
                            'text-[#991b1b]'
                          }`}>
                            友好: {relation}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-stone-500 py-4 font-bold">
                    目前尚無與其他勢力的外交情報
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
