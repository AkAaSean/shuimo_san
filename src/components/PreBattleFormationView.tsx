import React, { useState } from 'react';
import { GameState, FormationTerrainType } from '../types';
import { GeneralAvatar } from './GeneralAvatar';
import { 
  FORMATIONS, 
  getFormationInfo, 
  getGeneralAvailableFormations, 
  getFormationTerrainEffect, 
  TERRAIN_DETAILS,
  getTerrainBackgroundUrl
} from '../engine/formations';
import FormationTerrainMatrixModal from './FormationTerrainMatrixModal';
import { 
  Flag, 
  MapPin, 
  BookOpen, 
  Compass, 
  DoorOpen, 
  Users, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Swords, 
  Shield 
} from 'lucide-react';

interface PreBattleFormationViewProps {
  gameState: GameState;
  provinceName: string;
  battlefieldTerrain: FormationTerrainType;
  strategistName?: string | null;
  isDefense: boolean;
  playerRoster: string[];
  enemyRoster?: string[];
  enemyRuler?: string;
  onUpdateRoster: (newRoster: string[]) => void;
  generalFormations: Record<string, string>;
  onUpdateFormations: (newFormations: Record<string, string>) => void;
  onConfirmStartBattle: () => void;
  onExit: () => void;
}

export default function PreBattleFormationView({
  gameState,
  provinceName,
  battlefieldTerrain,
  strategistName,
  isDefense,
  playerRoster,
  enemyRoster = [],
  enemyRuler,
  onUpdateRoster,
  generalFormations,
  onUpdateFormations,
  onConfirmStartBattle,
  onExit
}: PreBattleFormationViewProps) {
  const [activeSideTab, setActiveSideTab] = useState<'player' | 'enemy'>('player');
  const [selectedRosterIdx, setSelectedRosterIdx] = useState<number>(0);
  const [selectedEnemyIdx, setSelectedEnemyIdx] = useState<number>(0);
  const [showTerrainMatrixModal, setShowTerrainMatrixModal] = useState(false);

  const terrainInfo = TERRAIN_DETAILS[battlefieldTerrain];
  const currentSelectedGenName = activeSideTab === 'player' 
    ? (playerRoster[selectedRosterIdx] || playerRoster[0])
    : (enemyRoster[selectedEnemyIdx] || enemyRoster[0]);
  const currentGen = currentSelectedGenName ? gameState.generalsData[currentSelectedGenName] : null;

  const learnedFormations = currentGen 
    ? (currentGen.formations && currentGen.formations.length > 0 ? currentGen.formations : getGeneralAvailableFormations(currentGen))
    : ['魚鱗'];

  const currentChosenFormation = generalFormations[currentSelectedGenName] || '魚鱗';

  // 出戰順序調整：上移武將
  const handleMoveRosterUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...playerRoster];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    onUpdateRoster(next);
    setSelectedRosterIdx(idx - 1);
  };

  // 出戰順序調整：下移武將
  const handleMoveRosterDown = (idx: number) => {
    if (idx >= playerRoster.length - 1) return;
    const next = [...playerRoster];
    const temp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = temp;
    onUpdateRoster(next);
    setSelectedRosterIdx(idx + 1);
  };

  // 一鍵全軍陣型預設套用
  const applyArmyPreset = (presetName: string) => {
    const nextMap: Record<string, string> = { ...generalFormations };
    playerRoster.forEach(gName => {
      const gen = gameState.generalsData[gName];
      const learned = gen 
        ? (gen.formations && gen.formations.length > 0 ? gen.formations : getGeneralAvailableFormations(gen))
        : ['魚鱗'];

      if (presetName === '地形') {
        const sRank = learned.find(f => getFormationTerrainEffect(f, battlefieldTerrain).rating === 'S');
        const aRank = learned.find(f => getFormationTerrainEffect(f, battlefieldTerrain).rating === 'A');
        nextMap[gName] = sRank || aRank || learned[0] || '魚鱗';
      } else if (presetName === '突擊') {
        nextMap[gName] = learned.includes('鋒矢') ? '鋒矢' : (learned.includes('魚鱗') ? '魚鱗' : learned[0]);
      } else if (presetName === '防守') {
        nextMap[gName] = learned.includes('方圓') ? '方圓' : (learned.includes('鶴翼') ? '鶴翼' : learned[0]);
      } else if (presetName === '神速') {
        nextMap[gName] = learned.includes('錐行') ? '錐行' : learned[0];
      } else if (presetName === '專精') {
        nextMap[gName] = learned[0] || '魚鱗';
      }
    });
    onUpdateFormations(nextMap);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col font-serif select-none bg-[#191512] text-stone-200 overflow-hidden">
      {/* 戰場即時地形半透明背景底圖 */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-in-out bg-cover bg-center z-0"
        style={{
          backgroundImage: `url(${getTerrainBackgroundUrl(battlefieldTerrain)})`,
          opacity: 0.20,
          filter: 'saturate(0.85) brightness(0.95)'
        }}
      />
      {/* 典雅暗黑漸層與遮罩 */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#191512]/60 via-transparent to-[#191512]/85" />

      {/* 頂部 Header */}
      <div className="h-12 bg-[#251e19]/95 border-b-2 border-[#473b30] px-3 sm:px-4 flex justify-between items-center z-30 shadow-md shrink-0 backdrop-blur-[2px]">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-amber-400" />
          <span className="font-black text-base sm:text-lg text-amber-300 tracking-wider">
            {isDefense ? '防守軍令 ‧ 出戰順序與陣形配置' : '出征軍令 ‧ 出戰順序與陣形配置'}
          </span>
          <span className="text-xs bg-[#3d3126] border border-[#5c4a3b] text-amber-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" />
            決戰【{provinceName}】‧ {terrainInfo?.symbol} {battlefieldTerrain}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTerrainMatrixModal(true)}
            className="h-7 px-2.5 bg-[#2c221a] hover:bg-[#3d3025] border border-amber-500/60 rounded text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>陣地全鑑</span>
          </button>

          {strategistName && (
            <span className="text-xs text-amber-300 font-black bg-amber-950/70 border border-amber-600/50 px-2 py-0.5 rounded hidden sm:flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              軍師: {strategistName}
            </span>
          )}
          <button 
            onClick={onExit}
            className="h-7 px-2.5 bg-[#3a1d1d] hover:bg-[#4d2525] border border-[#6d3030] rounded text-xs font-bold text-rose-200 flex items-center gap-1 cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>撤退</span>
          </button>
        </div>
      </div>

      {/* 戰場地形環境即時情報條 */}
      <div className="bg-[#1f1914] border-b border-[#3b3128] px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-black flex items-center gap-1">
            <span>{terrainInfo?.symbol}</span>
            <span>{battlefieldTerrain}戰場</span>
          </span>
          <span className="text-stone-300 font-bold hidden sm:inline">
            【{terrainInfo?.name}】
          </span>
          <span className="text-stone-400 text-[11px]">
            {terrainInfo?.desc}
          </span>
        </div>
        <div className="text-[11px] text-amber-300/90 font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{terrainInfo?.advantageSummary}</span>
        </div>
      </div>

      {/* 內容區：左列出戰順序名單 (點 2: 前 5 人首發，6 人以上後備援軍) + 右側陣形配置 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden p-2 sm:p-4 gap-3 bg-radial from-[#221c17]/75 to-[#120f0d]/90 relative z-10">
        {/* 左列：武將出戰順序清單 (支援我軍 / 敵軍雙向檢視) */}
        <div className="w-full md:w-5/12 flex flex-col gap-2 shrink-0">
          {/* 敵我切換分頁 */}
          <div className="flex items-center gap-1.5 p-1 bg-[#14100d] border border-[#3d3126] rounded-xl">
            <button
              onClick={() => setActiveSideTab('player')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'player'
                  ? 'bg-amber-600 text-stone-950 shadow-md ring-1 ring-amber-400'
                  : 'bg-[#221b16] text-stone-400 hover:text-stone-200 hover:bg-[#2c231d]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>🔷 我軍出戰名單 ({playerRoster.length}人)</span>
            </button>
            <button
              onClick={() => setActiveSideTab('enemy')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSideTab === 'enemy'
                  ? 'bg-rose-700 text-stone-100 shadow-md ring-1 ring-rose-400'
                  : 'bg-[#221b16] text-stone-400 hover:text-stone-200 hover:bg-[#2c231d]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>🔶 敵軍敵情陣容 ({enemyRoster.length}人)</span>
            </button>
          </div>

          <div className="flex justify-between items-center pb-1 border-b border-[#3b3128]">
            <span className="font-black text-xs text-amber-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              {activeSideTab === 'player'
                ? '我軍出戰順序 (前 5 人首發 5vs5 ‧ 6 人以上後備援軍)'
                : `敵方軍容偵查 (君主: ${enemyRuler || '敵將'}) ‧ 前 5 人首發`}
            </span>
            {activeSideTab === 'player' ? (
              <span className="text-[10px] text-stone-400 font-bold">可透過 ▲▼ 調整先後</span>
            ) : (
              <span className="text-[10px] text-rose-300/80 font-bold">敵軍出陣配置</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-[55vh] md:max-h-none overflow-y-auto pr-1">
            {activeSideTab === 'player' ? (
              playerRoster.map((gName, idx) => {
                const gen = gameState.generalsData[gName];
                const isSelected = idx === selectedRosterIdx;
                const isStartingFive = idx < 5;
                const chosenForm = generalFormations[gName] || '魚鱗';
                const terrainCompat = getFormationTerrainEffect(chosenForm, battlefieldTerrain);

                return (
                  <div
                    key={gName}
                    onClick={() => setSelectedRosterIdx(idx)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-md ${
                      isSelected
                        ? 'border-amber-400 bg-[#382c21] ring-1 ring-amber-400 scale-[1.01]'
                        : 'border-[#3a3026] bg-[#221b16] hover:border-[#524436] hover:bg-[#2c231d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center ${
                          isStartingFive 
                            ? 'bg-amber-500 text-stone-950 border-amber-300' 
                            : 'bg-stone-800 text-stone-300 border-stone-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      <GeneralAvatar name={gName} size={38} className="shrink-0" />
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-stone-100">{gName}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-black border ${
                            isStartingFive
                              ? (isDefense ? 'bg-sky-950 border-sky-700 text-sky-300' : 'bg-red-950 border-red-700 text-red-300')
                              : 'bg-amber-950/80 border-amber-700 text-amber-300'
                          }`}>
                            {isStartingFive ? (idx === 0 ? '首發主帥' : '首發先鋒') : '後備待命'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 flex gap-2 mt-0.5">
                          <span>兵: <strong className="text-sky-300">{gen?.soldiers?.toLocaleString() || 0}</strong></span>
                          <span>武: {gen?.str || 50}</span>
                          <span>智: {gen?.int || 50}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <span className="text-xs font-black px-1.5 py-0.5 rounded border border-amber-500/60 bg-[#16120e] text-amber-300">
                          【{chosenForm}陣】
                        </span>
                        <span className={`text-[9px] px-1 py-0.1 rounded font-black border ${
                          terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                          terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
                          terrainCompat.rating === 'D' ? 'bg-rose-900 text-rose-200 border-rose-600' :
                          'bg-stone-800 text-stone-300 border-stone-600'
                        }`}>
                          {terrainCompat.rating}級
                        </span>
                      </div>

                      {/* 順序上下調整按鈕 */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRosterUp(idx);
                          }}
                          className="p-1 rounded bg-[#2c221a] hover:bg-[#3f3125] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-amber-300"
                          title="往前調整順序"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === playerRoster.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveRosterDown(idx);
                          }}
                          className="p-1 rounded bg-[#2c221a] hover:bg-[#3f3125] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-amber-300"
                          title="往後調整順序"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              enemyRoster.map((gName, idx) => {
                const gen = gameState.generalsData[gName];
                const isSelected = idx === selectedEnemyIdx;
                const isStartingFive = idx < 5;
                const chosenForm = generalFormations[gName] || '魚鱗';
                const terrainCompat = getFormationTerrainEffect(chosenForm, battlefieldTerrain);

                return (
                  <div
                    key={gName}
                    onClick={() => setSelectedEnemyIdx(idx)}
                    className={`p-2 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between shadow-md ${
                      isSelected
                        ? 'border-rose-400 bg-[#351e1e] ring-1 ring-rose-400 scale-[1.01]'
                        : 'border-[#3a2626] bg-[#1e1515] hover:border-[#523434] hover:bg-[#281b1b]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center ${
                          isStartingFive 
                            ? 'bg-rose-600 text-stone-100 border-rose-400' 
                            : 'bg-stone-800 text-stone-400 border-stone-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      <GeneralAvatar name={gName} size={38} className="shrink-0" />
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-stone-100">{gName}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-black border ${
                            isStartingFive
                              ? 'bg-rose-950 border-rose-700 text-rose-300'
                              : 'bg-stone-900 border-stone-700 text-stone-400'
                          }`}>
                            {isStartingFive ? (idx === 0 ? '敵主將' : '敵先鋒') : '敵援軍'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 flex gap-2 mt-0.5">
                          <span>兵: <strong className="text-rose-300">{gen?.soldiers?.toLocaleString() || 0}</strong></span>
                          <span>武: {gen?.str || 50}</span>
                          <span>智: {gen?.int || 50}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <span className="text-xs font-black px-1.5 py-0.5 rounded border border-rose-500/60 bg-[#160f0f] text-rose-300">
                          【{chosenForm}陣】
                        </span>
                        <span className={`text-[9px] px-1 py-0.1 rounded font-black border ${
                          terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                          terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
                          terrainCompat.rating === 'D' ? 'bg-rose-900 text-rose-200 border-rose-600' :
                          'bg-stone-800 text-stone-300 border-stone-600'
                        }`}>
                          {terrainCompat.rating}級
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 一鍵全軍陣形套用快捷按鈕 (僅我軍可操作) */}
          {activeSideTab === 'player' ? (
            <div className="mt-2 p-2.5 bg-[#201914] border border-[#3b3026] rounded-xl">
              <span className="text-[11px] font-black text-stone-300 block mb-1.5">
                ⚡ 我軍一鍵陣形配置方案：
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  onClick={() => applyArmyPreset('地形')}
                  className="px-2 py-1 text-[11px] font-black bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 border border-amber-400 text-white rounded cursor-pointer active:scale-95 shadow"
                  title="依據當前地形自動指派最佳陣形"
                >
                  {terrainInfo?.symbol} 地形最佳
                </button>
                <button
                  onClick={() => applyArmyPreset('突擊')}
                  className="px-2 py-1 text-[11px] font-black bg-[#3b2020] hover:bg-[#522c2c] border border-red-700 text-rose-200 rounded cursor-pointer active:scale-95"
                >
                  ⚔️ 全軍突擊
                </button>
                <button
                  onClick={() => applyArmyPreset('防守')}
                  className="px-2 py-1 text-[11px] font-black bg-[#1f303a] hover:bg-[#2b4452] border border-sky-700 text-sky-200 rounded cursor-pointer active:scale-95"
                >
                  🛡️ 固若金湯
                </button>
                <button
                  onClick={() => applyArmyPreset('神速')}
                  className="px-2 py-1 text-[11px] font-black bg-[#2d3020] hover:bg-[#3f442c] border border-amber-700 text-amber-200 rounded cursor-pointer active:scale-95"
                >
                  🐎 神速突破
                </button>
                <button
                  onClick={() => applyArmyPreset('專精')}
                  className="px-2 py-1 text-[11px] font-black bg-[#2a241f] hover:bg-[#3a322b] border border-stone-500 text-stone-200 rounded cursor-pointer active:scale-95"
                >
                  🎯 名將專精
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-2 bg-[#201515] border border-[#3b2626] rounded-xl text-center text-xs text-rose-300 font-bold">
              👁️ 敵方軍情已完全偵知，知己知彼，百戰不殆！
            </div>
          )}
        </div>

        {/* 右側：選定將領之可選陣形矩陣 / 武將情資 */}
        <div className="flex-1 bg-[#201a15] border-2 border-[#3d3126] rounded-xl p-3 flex flex-col justify-between shadow-inner shrink-0">
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-[#3d3126] mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-amber-300">
                  【{currentSelectedGenName}】{activeSideTab === 'player' ? '陣形調配' : '敵將情報'}
                </h3>
                <span className="text-[10px] text-stone-400 font-bold bg-[#14110e] px-1.5 py-0.5 rounded border border-[#3b3128]">
                  已習得 {learnedFormations.length} 種陣形
                </span>
              </div>
              <div className="flex items-center gap-1">
                {activeSideTab === 'player' ? (
                  <>
                    <button
                      disabled={selectedRosterIdx <= 0}
                      onClick={() => setSelectedRosterIdx(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-stone-300" />
                    </button>
                    <span className="text-xs font-black text-stone-400">
                      {selectedRosterIdx + 1}/{playerRoster.length}
                    </span>
                    <button
                      disabled={selectedRosterIdx >= playerRoster.length - 1}
                      onClick={() => setSelectedRosterIdx(prev => Math.min(playerRoster.length - 1, prev + 1))}
                      className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled={selectedEnemyIdx <= 0}
                      onClick={() => setSelectedEnemyIdx(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4 text-stone-300" />
                    </button>
                    <span className="text-xs font-black text-stone-400">
                      {selectedEnemyIdx + 1}/{enemyRoster.length}
                    </span>
                    <button
                      disabled={selectedEnemyIdx >= enemyRoster.length - 1}
                      onClick={() => setSelectedEnemyIdx(prev => Math.min(enemyRoster.length - 1, prev + 1))}
                      className="p-1 rounded bg-[#2b221b] hover:bg-[#3d3127] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4 text-stone-300" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 陣形卡片網格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 pr-1 overflow-y-auto max-h-[50vh] sm:max-h-none">
              {learnedFormations.map(formName => {
                const formInfo = getFormationInfo(formName);
                if (!formInfo) return null;
                const isChosen = currentChosenFormation === formName;
                const terrainCompat = getFormationTerrainEffect(formName, battlefieldTerrain);

                // 綜合攻防先攻（基礎 + 地形修正）
                const totalAtk = Math.round(((formInfo.atkMod || 0) + (terrainCompat.atkBonus || 0)) * 100);
                const totalDef = Math.round(((formInfo.defMod || 0) + (terrainCompat.defBonus || 0)) * 100);
                const totalInit = (formInfo.initiativeMod || 0) + (terrainCompat.initBonus || 0);

                return (
                  <div
                    key={formName}
                    onClick={() => {
                      if (currentSelectedGenName) {
                        onUpdateFormations({
                          ...generalFormations,
                          [currentSelectedGenName]: formName
                        });
                      }
                    }}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      isChosen
                        ? 'border-amber-400 bg-[#3d2f22] ring-1 ring-amber-400 scale-[1.01]'
                        : 'border-[#382d24] bg-[#181310] hover:border-[#524234] hover:bg-[#241c16]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-stone-100">{formInfo.name}陣</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                            terrainCompat.rating === 'S' ? 'bg-amber-500 text-stone-950 border-amber-300' :
                            terrainCompat.rating === 'A' ? 'bg-emerald-800 text-emerald-100 border-emerald-500' :
                            terrainCompat.rating === 'D' ? 'bg-rose-900 text-rose-200 border-rose-600' :
                            'bg-stone-800 text-stone-300 border-stone-600'
                          }`}>
                            {battlefieldTerrain} {terrainCompat.rating}級 ‧ {terrainCompat.tag}
                          </span>
                        </div>
                        {isChosen && (
                          <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-1.5 py-0.2 rounded">
                            ✓ 選定
                          </span>
                        )}
                      </div>

                      {/* 綜合攻防機動數值加成 */}
                      <div className="grid grid-cols-3 gap-1 text-[11px] py-1 px-1.5 rounded bg-[#100d0a] border border-[#2b221b] mb-1.5 font-bold">
                        <span className={totalAtk >= 0 ? 'text-red-400' : 'text-stone-400'}>
                          攻: {totalAtk >= 0 ? `+${totalAtk}%` : `${totalAtk}%`}
                          {terrainCompat.atkBonus !== 0 && (
                            <span className="text-[9px] text-amber-300 font-normal ml-0.5">
                              ({terrainCompat.atkBonus > 0 ? `+${Math.round(terrainCompat.atkBonus * 100)}%` : `${Math.round(terrainCompat.atkBonus * 100)}%`})
                            </span>
                          )}
                        </span>
                        <span className={totalDef >= 0 ? 'text-sky-400' : 'text-stone-400'}>
                          防: {totalDef >= 0 ? `+${totalDef}%` : `${totalDef}%`}
                          {terrainCompat.defBonus !== 0 && (
                            <span className="text-[9px] text-sky-300 font-normal ml-0.5">
                              ({terrainCompat.defBonus > 0 ? `+${Math.round(terrainCompat.defBonus * 100)}%` : `${Math.round(terrainCompat.defBonus * 100)}%`})
                            </span>
                          )}
                        </span>
                        <span className="text-amber-300">
                          先攻: {totalInit >= 0 ? `+${totalInit}` : totalInit}
                        </span>
                      </div>

                      {/* 地形實戰具體效果 */}
                      <p className="text-[11px] text-stone-300 leading-relaxed font-sans mb-1">
                        <strong className="text-amber-300">【實戰發揮】：</strong>
                        {terrainCompat.detailedEffect}
                      </p>
                      <p className="text-[10px] text-stone-500 leading-tight">
                        ※ 陣形專長：{formInfo.specialDesc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 底部確認按鈕 */}
          <div className="pt-3 border-t border-[#3d3126] flex justify-between items-center shrink-0 mt-2">
            <span className="text-xs text-stone-400 font-bold hidden sm:inline">
              前 5 人首發對峙，6 人以上陣亡時依序登場馳援！
            </span>
            <button
              onClick={onConfirmStartBattle}
              className={`w-full sm:w-auto px-6 py-2.5 border-2 text-white font-black text-sm sm:text-base rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDefense 
                  ? 'bg-gradient-to-r from-sky-800 to-indigo-900 hover:from-sky-700 hover:to-indigo-800 border-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.3)]'
                  : 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 border-red-500'
              }`}
            >
              {isDefense ? <Shield className="w-4 h-4 text-sky-300" /> : <Swords className="w-4 h-4 text-amber-300" />}
              <span>{isDefense ? '鳴鼓迎敵 ‧ 全軍接戰 (5v5)' : '鳴鼓出征 ‧ 進入 5v5 決戰'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 陣形 ✕ 地形全鑑 Modal */}
      {showTerrainMatrixModal && (
        <FormationTerrainMatrixModal
          currentTerrain={battlefieldTerrain}
          currentProvinceName={provinceName}
          onClose={() => setShowTerrainMatrixModal(false)}
        />
      )}
    </div>
  );
}
