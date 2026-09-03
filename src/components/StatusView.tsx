import React, { useState } from 'react';
import { GameState, FormationTerrainType } from '../types';
import { provinces } from '../data/provinces';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';
import { getGeneralItemBonus } from '../data/items';
import { getGeneralAvailableSkills, getBattleSkillInfo, isPassiveSkill } from '../engine/skills';
import { getGeneralAvailableFormations, getFormationInfo, FORMATION_TERRAIN_MATRIX, TERRAIN_DETAILS } from '../engine/formations';
import { getGeneralDescription } from '../data/generalDescriptions';
import { GeneralAvatar } from './GeneralAvatar';
import { ItemAvatar } from './ItemAvatar';

interface StatusViewProps {
  gameState: GameState;
  initialAction: string;
  onExit: () => void;
}

export default function StatusView({ gameState, initialAction, onExit }: StatusViewProps) {
  const [activeTab, setActiveTab] = useState(initialAction === '戰場地圖' ? '查看本郡狀態' : initialAction);
  const [selectedFormationForDetail, setSelectedFormationForDetail] = useState<string | null>(null);
  const [selectedSkillForDetail, setSelectedSkillForDetail] = useState<string | null>(null);

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
  const totalSoldiers = totalGeneralsSoldiers;

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
            className={`flex-1 py-3 font-bold text-center border-r-[2px] border-[#1c1917] last:border-r-0 transition-colors text-sm
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
            <div className="text-center text-stone-500 text-xs mb-4 pb-3 border-b-2 border-stone-200 space-y-1">
              <div>{provinceData.desc}</div>
              <div className="text-amber-800 font-bold">【定位】{getProvinceTierRules(currentProvinceId).desc}</div>
            </div>

            {/* 地理地形比例 (加總 100%) */}
            {provinceData.terrainRatio && (
              <div className="mb-5 bg-[#faf8f5] border border-stone-300 p-3 rounded-lg">
                <div className="text-xs font-black text-stone-800 mb-2 flex items-center justify-between">
                  <span>🗺️ 郡境地理地形構成 (總合 100%)</span>
                  <span className="text-[10px] text-stone-500 font-bold">依真實地理配置</span>
                </div>
                
                {/* 複合彩條 */}
                <div className="h-3 w-full rounded-full overflow-hidden flex border border-stone-400 mb-2.5">
                  {provinceData.terrainRatio.平地 > 0 && (
                    <div 
                      className="bg-emerald-600 h-full" 
                      style={{ width: `${provinceData.terrainRatio.平地}%` }} 
                      title={`平地: ${provinceData.terrainRatio.平地}%`}
                    />
                  )}
                  {provinceData.terrainRatio.山嶽 > 0 && (
                    <div 
                      className="bg-amber-600 h-full" 
                      style={{ width: `${provinceData.terrainRatio.山嶽}%` }} 
                      title={`山嶽: ${provinceData.terrainRatio.山嶽}%`}
                    />
                  )}
                  {provinceData.terrainRatio.水上 > 0 && (
                    <div 
                      className="bg-sky-600 h-full" 
                      style={{ width: `${provinceData.terrainRatio.水上}%` }} 
                      title={`水上: ${provinceData.terrainRatio.水上}%`}
                    />
                  )}
                  {provinceData.terrainRatio.密林 > 0 && (
                    <div 
                      className="bg-green-700 h-full" 
                      style={{ width: `${provinceData.terrainRatio.密林}%` }} 
                      title={`密林: ${provinceData.terrainRatio.密林}%`}
                    />
                  )}
                </div>

                {/* 4 大地形具體比例標籤 */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-300 py-1 rounded">
                    <div className="text-[10px] text-emerald-800 font-bold">🌾 平地</div>
                    <div className="font-black text-emerald-950">{provinceData.terrainRatio.平地}%</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-300 py-1 rounded">
                    <div className="text-[10px] text-amber-800 font-bold">🏔️ 山嶽</div>
                    <div className="font-black text-amber-950">{provinceData.terrainRatio.山嶽}%</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-300 py-1 rounded">
                    <div className="text-[10px] text-sky-800 font-bold">🌊 水上</div>
                    <div className="font-black text-sky-950">{provinceData.terrainRatio.水上}%</div>
                  </div>
                  <div className="bg-green-50 border border-green-300 py-1 rounded">
                    <div className="text-[10px] text-green-800 font-bold">🌲 密林</div>
                    <div className="font-black text-green-950">{provinceData.terrainRatio.密林}%</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-base">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">君主</span>
                <span className="font-black text-[#991b1b]">{provinceState.rulerName || '無主'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">武將數</span>
                <span className="font-black">{generals.length} 人</span>
              </div>

              {(() => {
                const rulerInProv = generals.find(g => g.isRuler);
                const appointedPrefect = generals.find(g => g.role === '太守');
                const govName = rulerInProv
                  ? `${rulerInProv.name} (君主)`
                  : appointedPrefect
                    ? appointedPrefect.name
                    : generals.length > 0
                      ? '未指派'
                      : '無';

                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-bold">坐鎮太守</span>
                      <span className="font-black text-amber-900">{govName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-bold">治理模式</span>
                      <span className={`font-black ${provinceState.isAutonomous ? 'text-amber-800' : 'text-stone-700'}`}>
                        {provinceState.isAutonomous ? '自治中' : '直轄'}
                      </span>
                    </div>
                  </>
                );
              })()}

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
                  <div className="flex justify-between items-center border-b-2 border-[#1c1917] pb-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <GeneralAvatar name={g.name} size={44} className="shrink-0 rounded shadow-xs border-2 border-stone-800" />
                      <div>
                        <div className="text-lg font-black flex items-center gap-2">
                          {g.name}
                          {g.isRuler ? (
                            <span className="text-xs bg-[#991b1b] text-white px-2 py-0.5 rounded-sm font-bold">君主</span>
                          ) : (
                            <span className="text-xs bg-stone-700 text-stone-100 px-2 py-0.5 rounded-sm font-bold">{g.role || '將領'}</span>
                          )}
                        </div>
                        <span className="text-xs text-stone-500 font-semibold">兵力上限: {g.maxTroops || 3000}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm font-bold text-stone-500">
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
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 bg-amber-50/80 border border-amber-300/80 px-2 py-1.5 rounded text-xs">
                      <span className="font-bold text-amber-900 text-[11px] shrink-0">佩戴寶物:</span>
                      {itemBonus.items.map(item => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 bg-amber-200/90 text-amber-950 font-black px-1.5 py-0.5 rounded text-[10px] border border-amber-400/80 shadow-2xs"
                        >
                          <ItemAvatar name={item.name} size={18} showBorder={false} />
                          <span>{item.name}</span>
                          <span className="text-amber-800 font-bold text-[9px]">({item.bonusDesc.split('，')[0]})</span>
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

                  {/* Formations & Battle Skills Badges */}
                  {(() => {
                    const formations = g.formations && g.formations.length > 0 ? g.formations : getGeneralAvailableFormations(g);
                    const skills = g.skills && g.skills.length > 0 ? g.skills : getGeneralAvailableSkills(g);
                    const activeSkills = skills.filter(s => !isPassiveSkill(s));

                    return (
                      <div className="mt-2.5 flex flex-col gap-1.5 pt-2 border-t border-stone-200 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-stone-500 shrink-0">🚩 陣形:</span>
                          {formations.map(f => (
                            <button
                              key={f}
                              onClick={() => setSelectedFormationForDetail(f)}
                              className="bg-stone-100 hover:bg-amber-100 active:scale-95 border border-stone-300 hover:border-amber-500 px-2 py-0.5 rounded text-[11px] font-bold text-stone-800 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{f}</span>
                              <span className="text-[9px] text-stone-400">🔍</span>
                            </button>
                          ))}
                        </div>

                        {/* Battle Skills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-stone-600 shrink-0">⚔️ 計策戰法:</span>
                          {activeSkills.length === 0 ? (
                            <span className="text-stone-400 text-[11px] italic">無</span>
                          ) : (
                            activeSkills.map(s => {
                              const sInfo = getBattleSkillInfo(s);
                              return (
                                <button
                                  key={s}
                                  onClick={() => setSelectedSkillForDetail(s)}
                                  className="bg-stone-100 hover:bg-sky-100 active:scale-95 border border-stone-300 hover:border-sky-500 px-2 py-0.5 rounded text-[10px] font-bold text-stone-800 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>{s}</span>
                                  <span className="text-[9px] text-amber-700 font-bold">⚡{sInfo?.cost || 10}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Historical Description */}
                  <div className="mt-2.5 pt-2 border-t border-stone-200 text-xs">
                    <div className="bg-[#fcfbf9] border border-amber-200/80 rounded px-2.5 py-1.5 text-stone-700 leading-relaxed flex items-start gap-1.5">
                      <span className="text-amber-800 text-[11px] font-bold shrink-0">📜 典故:</span>
                      <span className="text-[11px] font-medium text-stone-800">{getGeneralDescription(g.name)}</span>
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
                      <div key={otherRuler} className="flex flex-col gap-2 p-3 bg-stone-100 border border-stone-300">
                        <div className="flex justify-between items-center">
                          <div className="font-bold text-stone-800">
                            {otherRuler}勢力
                          </div>
                          <div className="flex items-center gap-2">
                            {allianceText && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm font-black border border-emerald-300">
                                {allianceText}
                              </span>
                            )}
                            <span className={`font-black text-sm ${
                              relation >= 90 ? 'text-emerald-700' :
                              relation >= 70 ? 'text-emerald-600' :
                              relation >= 40 ? 'text-stone-700' :
                              relation >= 20 ? 'text-orange-600' :
                              'text-rose-700'
                            }`}>
                              友好: {relation}
                            </span>
                          </div>
                        </div>
                        {/* 友好度進度條 */}
                        <div className="w-full bg-stone-300 h-2.5 rounded-full overflow-hidden flex border border-stone-400">
                          <div 
                            className={`h-full ${
                              relation >= 90 ? 'bg-emerald-500' :
                              relation >= 70 ? 'bg-emerald-400' :
                              relation >= 40 ? 'bg-stone-500' :
                              relation >= 20 ? 'bg-orange-500' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(0, Math.min(100, relation))}%` }}
                          />
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

        {/* ═══════════════════════════════════════════════════════════════
            FORMATION DETAIL MODAL
           ═══════════════════════════════════════════════════════════════ */}
        {selectedFormationForDetail && (() => {
          const formation = getFormationInfo(selectedFormationForDetail);
          const matrix = FORMATION_TERRAIN_MATRIX[selectedFormationForDetail];
          if (!formation) return null;

          return (
            <div
              className="fixed inset-0 bg-black/75 z-70 flex items-center justify-center p-3 animate-fade-in"
              onClick={() => setSelectedFormationForDetail(null)}
            >
              <div
                className="bg-[#fffdfa] border-3 border-[#991b1b] rounded-lg max-w-md w-full p-4 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b-2 border-stone-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-[#991b1b]">
                      🚩 【{formation.name}陣】
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      (formation.terrain || formation.type) === '水上' ? 'bg-cyan-800 text-cyan-100' :
                      (formation.terrain || formation.type) === '山嶽' ? 'bg-amber-800 text-amber-100' :
                      (formation.terrain || formation.type) === '密林' ? 'bg-emerald-800 text-emerald-100' :
                      (formation.terrain || formation.type) === '通用' ? 'bg-purple-800 text-purple-100' :
                      'bg-stone-800 text-amber-200'
                    }`}>
                      {formation.terrain || formation.type}專精
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedFormationForDetail(null)}
                    className="text-stone-400 hover:text-stone-800 text-xl font-black cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-stone-100 p-2 rounded border border-stone-300">
                    <div className="text-[10px] text-stone-500 font-bold">物理攻擊</div>
                    <div className={`font-black text-sm ${formation.atkMod > 0 ? 'text-red-700' : formation.atkMod < 0 ? 'text-blue-700' : 'text-stone-700'}`}>
                      {formation.atkMod > 0 ? `+${Math.round(formation.atkMod * 100)}%` : formation.atkMod < 0 ? `${Math.round(formation.atkMod * 100)}%` : '±0%'}
                    </div>
                  </div>
                  <div className="bg-stone-100 p-2 rounded border border-stone-300">
                    <div className="text-[10px] text-stone-500 font-bold">物理防禦</div>
                    <div className={`font-black text-sm ${formation.defMod > 0 ? 'text-emerald-700' : formation.defMod < 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                      {formation.defMod > 0 ? `+${Math.round(formation.defMod * 100)}%` : formation.defMod < 0 ? `${Math.round(formation.defMod * 100)}%` : '±0%'}
                    </div>
                  </div>
                  <div className="bg-stone-100 p-2 rounded border border-stone-300">
                    <div className="text-[10px] text-stone-500 font-bold">先攻調整</div>
                    <div className={`font-black text-sm ${formation.initiativeMod > 0 ? 'text-emerald-700' : formation.initiativeMod < 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                      {formation.initiativeMod > 0 ? `+${formation.initiativeMod}` : formation.initiativeMod}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/90 border border-amber-300 p-2.5 rounded text-xs">
                  <div className="font-bold text-amber-950 mb-1 flex items-center gap-1">
                    <span>📜</span> 陣形戰術特色：
                  </div>
                  <div className="text-stone-800 leading-relaxed font-semibold">
                    {formation.specialDesc || formation.special || '各項攻防平衡，無特殊異常加減成。'}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="font-black text-stone-800 flex justify-between items-center">
                    <span>🗺️ 四大歷史地形適性剖析：</span>
                    <span className="text-[10px] text-stone-500">S 卓越 / A 良好 / B 普通 / C 欠佳 / D 受阻</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['平地', '山嶽', '水上', '密林'] as FormationTerrainType[]).map(tKey => {
                      const tMeta = TERRAIN_DETAILS[tKey];
                      const comp = matrix ? matrix[tKey] : null;
                      if (!comp) return null;

                      const ratingBg =
                        comp.rating === 'S' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                        comp.rating === 'A' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        comp.rating === 'B' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        comp.rating === 'C' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-rose-100 text-rose-900 border-rose-300';

                      return (
                        <div key={tKey} className="bg-white border border-stone-300 p-2 rounded shadow-2xs flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-black flex items-center gap-1 text-stone-800">
                              <span>{tMeta.symbol}</span>
                              <span>{tKey}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${ratingBg}`}>
                                {comp.rating} 級 ({comp.ratingScore}分)
                              </span>
                              <span className={`text-[9px] font-bold px-1 rounded border ${comp.tagColor}`}>
                                {comp.tag}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-stone-700">
                            {comp.summary}
                          </div>

                          <div className="text-[10px] text-stone-500 leading-snug">
                            {comp.detailedEffect}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFormationForDetail(null)}
                  className="w-full py-2 bg-stone-800 text-amber-100 text-xs font-black rounded hover:bg-stone-700 active:scale-95 transition-transform cursor-pointer mt-1"
                >
                  關閉詳解
                </button>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════
            SKILL DETAIL MODAL
           ═══════════════════════════════════════════════════════════════ */}
        {selectedSkillForDetail && (() => {
          const skill = getBattleSkillInfo(selectedSkillForDetail);
          if (!skill) return null;

          return (
            <div
              className="fixed inset-0 bg-black/75 z-70 flex items-center justify-center p-3 animate-fade-in"
              onClick={() => setSelectedSkillForDetail(null)}
            >
              <div
                className="bg-[#fffdfa] border-3 border-sky-900 rounded-lg max-w-sm w-full p-4 shadow-2xl flex flex-col gap-3 animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b-2 border-stone-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-sky-950">
                      ⚔️ 【{skill.name}】
                    </span>
                    <span className="text-xs bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 rounded font-bold">
                      {skill.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSkillForDetail(null)}
                    className="text-stone-400 hover:text-stone-800 text-xl font-black cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-amber-50 p-2 rounded border border-amber-300">
                    <div className="text-[10px] text-amber-800 font-bold">體力消耗</div>
                    <div className="font-black text-base text-amber-900">
                      ⚡ {skill.cost} 點
                    </div>
                  </div>
                  <div className="bg-sky-50 p-2 rounded border border-sky-300">
                    <div className="text-[10px] text-sky-800 font-bold">作用範圍</div>
                    <div className="font-black text-base text-sky-950">
                      🎯 {skill.target}
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-300 p-3 rounded text-xs flex flex-col gap-1.5">
                  <span className="font-black text-stone-700 flex items-center gap-1">
                    <span>📜</span> 戰法計謀效果詳解：
                  </span>
                  <p className="text-stone-900 text-xs leading-relaxed font-semibold">
                    {skill.desc}
                  </p>
                </div>

                <div className="text-[10px] text-stone-500 bg-stone-100 p-2 rounded border border-stone-200 leading-snug">
                  💡 <strong>作戰提示：</strong>在戰場戰役中，武將累積足夠體力值時即可在「計策/戰法」指令中即時選取施放。
                </div>

                <button
                  onClick={() => setSelectedSkillForDetail(null)}
                  className="w-full py-2 bg-stone-800 text-amber-100 text-xs font-black rounded hover:bg-stone-700 active:scale-95 transition-transform cursor-pointer"
                >
                  關閉詳解
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
