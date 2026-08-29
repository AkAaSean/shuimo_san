import React, { useState } from 'react';
import { 
  FORMATIONS, 
  TERRAIN_DETAILS, 
  FORMATION_TERRAIN_MATRIX, 
  FormationTerrainCompatibility 
} from '../engine/formations';
import { FormationTerrainType } from '../types';
import { 
  X, 
  Compass, 
  Sparkles, 
  Shield, 
  Swords, 
  Zap, 
  Info, 
  Check, 
  HelpCircle,
  Layers,
  MapPin
} from 'lucide-react';

interface FormationTerrainMatrixModalProps {
  currentTerrain?: FormationTerrainType;
  currentProvinceName?: string;
  onClose: () => void;
}

const ALL_TERRAINS: FormationTerrainType[] = ['平地', '山嶽', '水上', '密林'];

const PROVINCE_EXAMPLES: Record<FormationTerrainType, string[]> = {
  '平地': ['洛陽', '許昌', '陳留', '鄴城', '平原', '薊縣', '襄平', '宛城', '長沙'],
  '山嶽': ['漢中', '梓潼', '成都', '天水', '晉陽', '安定', '平陽', '武陵', '零陵'],
  '水上': ['建業', '廬江', '吳郡', '會稽', '豫章', '襄陽', '江陵', '江州', '夷州'],
  '密林': ['雲南', '建寧', '永昌', '嶺南', '南海', '交趾'],
  '通用': ['全神州郡縣']
};

export default function FormationTerrainMatrixModal({
  currentTerrain,
  currentProvinceName,
  onClose
}: FormationTerrainMatrixModalProps) {
  const [selectedTerrainTab, setSelectedTerrainTab] = useState<FormationTerrainType>(currentTerrain || '平地');
  const [selectedFormationName, setSelectedFormationName] = useState<string>('魚鱗');

  const selectedFormation = FORMATIONS.find(f => f.name === selectedFormationName) || FORMATIONS[0];
  const selectedTerrainInfo = TERRAIN_DETAILS[selectedTerrainTab];

  const getRatingBadge = (rating: 'S' | 'A' | 'B' | 'C' | 'D') => {
    switch (rating) {
      case 'S':
        return <span className="px-2 py-0.5 rounded font-black text-xs bg-amber-500 text-stone-950 border border-amber-300 shadow-sm animate-pulse">S 級稱霸</span>;
      case 'A':
        return <span className="px-2 py-0.5 rounded font-black text-xs bg-emerald-600 text-white border border-emerald-400">A 級優勢</span>;
      case 'B':
        return <span className="px-2 py-0.5 rounded font-bold text-xs bg-stone-200 text-stone-800 border border-stone-300">B 級平穩</span>;
      case 'C':
        return <span className="px-2 py-0.5 rounded font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">C 級受阻</span>;
      case 'D':
        return <span className="px-2 py-0.5 rounded font-black text-xs bg-rose-700 text-white border border-rose-400">D 級大劣</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-serif select-none overflow-y-auto animate-fadeIn">
      <div className="bg-[#f5f2eb] border-3 border-[#1c1917] rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#1c1917]">
        
        {/* Header */}
        <div className="bg-[#1c1917] text-[#f5f2eb] px-4 py-3 flex items-center justify-between border-b-2 border-amber-600">
          <div className="flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-amber-400 animate-spin-slow" />
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-wider text-amber-200 flex items-center gap-2">
                陣形 ✕ 地形 ‧ 相生相剋全鑑
              </h2>
              <p className="text-xs text-stone-400">
                兵法云：「知地知天，勝乃可全。」陣形順應地形可發揮 130% 奇效，反之則戰力驟折！
              </p>
            </div>
          </div>
          
          {currentTerrain && (
            <div className="hidden sm:flex items-center gap-2 bg-stone-800/80 px-3 py-1 rounded border border-amber-500/40 text-xs">
              <span className="text-stone-400">當前決戰城池：</span>
              <span className="font-bold text-amber-300">{currentProvinceName || '戰場'}</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-900 text-amber-200 font-bold">
                {TERRAIN_DETAILS[currentTerrain]?.symbol} {currentTerrain}
              </span>
            </div>
          )}

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          
          {/* 1. 地形切換卡片欄 */}
          <div>
            <div className="text-xs font-bold text-stone-500 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                四大戰場地形概覽（點選檢視各地形代表郡縣與戰略優劣）：
              </span>
              {currentTerrain && (
                <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  🎯 目前所在地形：{TERRAIN_DETAILS[currentTerrain]?.symbol} {currentTerrain}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_TERRAINS.map(tKey => {
                const detail = TERRAIN_DETAILS[tKey];
                const isSelected = selectedTerrainTab === tKey;
                const isCurrent = currentTerrain === tKey;

                return (
                  <button
                    key={tKey}
                    onClick={() => setSelectedTerrainTab(tKey)}
                    className={`text-left p-2.5 rounded border-2 transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'bg-amber-50/90 border-amber-800 shadow-md ring-2 ring-amber-600/30' 
                        : 'bg-white/80 border-stone-300 hover:border-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-2 -right-1 px-1.5 py-0.2 bg-amber-600 text-white font-black text-[10px] rounded-full shadow">
                        當前戰場
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{detail.symbol}</span>
                      <span className="font-black text-sm text-stone-900">{detail.name}</span>
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                      {detail.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Terrain Deep Dive */}
            <div className="mt-2 p-3 bg-amber-50/80 border border-amber-300/80 rounded-md text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-1.5">
                <span className="font-black text-amber-950 flex items-center gap-1 text-sm">
                  {selectedTerrainInfo.symbol} 【{selectedTerrainInfo.name}】戰場特性分析：
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-stone-500 font-bold">典型郡縣：</span>
                  {PROVINCE_EXAMPLES[selectedTerrainTab].map(city => (
                    <span key={city} className="px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded font-bold text-[11px]">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-stone-700 leading-relaxed">
                <strong className="text-amber-900">兵家心法：</strong>
                {selectedTerrainInfo.advantageSummary}
              </p>
            </div>
          </div>

          {/* 2. 陣形 ✕ 地形 全覽矩陣對照表 */}
          <div>
            <div className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-black text-stone-900">
                <Layers className="w-4 h-4 text-stone-800" />
                八大陣形 ✕ 四大地形 威力與適性全覽表
              </span>
              <span className="text-[11px] text-stone-500">
                （點擊陣形行可檢視武將配置解析）
              </span>
            </div>

            <div className="overflow-x-auto border-2 border-stone-800 rounded bg-white shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-900 text-stone-100 border-b-2 border-amber-600">
                    <th className="p-2.5 font-black text-amber-300 w-28 text-center">陣形名稱</th>
                    <th className="p-2.5 font-bold w-36 text-center">基礎攻防 / 先攻</th>
                    {ALL_TERRAINS.map(tKey => {
                      const isCurrent = currentTerrain === tKey;
                      return (
                        <th 
                          key={tKey} 
                          className={`p-2.5 font-black text-center ${
                            isCurrent ? 'bg-amber-900/90 text-amber-200 border-x-2 border-amber-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{TERRAIN_DETAILS[tKey].symbol}</span>
                            <span>{tKey}</span>
                            {isCurrent && <span className="text-[10px] bg-amber-500 text-black px-1 rounded">本戰</span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {FORMATIONS.map(form => {
                    const isSelected = selectedFormationName === form.name;
                    return (
                      <tr 
                        key={form.name}
                        onClick={() => setSelectedFormationName(form.name)}
                        className={`hover:bg-amber-50/60 transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-100/70 font-bold' : ''
                        }`}
                      >
                        {/* 陣形名與特長 */}
                        <td className="p-2.5 text-center border-r border-stone-200">
                          <div className="font-black text-sm text-stone-900">{form.name}</div>
                          <span className="text-[10px] text-stone-500">
                            適應: {form.terrain}
                          </span>
                        </td>

                        {/* 基礎屬性 */}
                        <td className="p-2 border-r border-stone-200 text-center">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex justify-between px-1">
                              <span className="text-stone-500">攻/防:</span>
                              <span className="font-mono font-bold">
                                {form.atkMod >= 0 ? `+${Math.round(form.atkMod * 100)}%` : `${Math.round(form.atkMod * 100)}%`}
                                {' / '}
                                {form.defMod >= 0 ? `+${Math.round(form.defMod * 100)}%` : `${Math.round(form.defMod * 100)}%`}
                              </span>
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-stone-500">先攻:</span>
                              <span className="font-mono font-bold text-amber-800">
                                {form.initiativeMod >= 0 ? `+${form.initiativeMod}` : form.initiativeMod}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 四大地形適性 */}
                        {ALL_TERRAINS.map(tKey => {
                          const compat = FORMATION_TERRAIN_MATRIX[form.name]?.[tKey] || {
                            rating: 'B',
                            ratingScore: 100,
                            atkBonus: 0,
                            defBonus: 0,
                            initBonus: 0,
                            tag: '普通',
                            tagColor: 'text-stone-600 bg-stone-100 border-stone-300',
                            summary: '標準發揮',
                            detailedEffect: '一般發揮'
                          };
                          const isCurrent = currentTerrain === tKey;

                          return (
                            <td 
                              key={tKey} 
                              className={`p-2 text-center border-r border-stone-200 ${
                                isCurrent ? 'bg-amber-50/80 border-x-2 border-amber-400 font-bold' : ''
                              }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                {getRatingBadge(compat.rating)}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${compat.tagColor} font-bold leading-none`}>
                                  {compat.tag}
                                </span>
                                <span className="text-[10px] text-stone-500 line-clamp-1">
                                  {compat.summary}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. 陣形深度戰術特長解說 (Selected Formation Inspector) */}
          <div className="p-3.5 bg-white border-2 border-stone-400 rounded-lg shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-stone-900">
                  【{selectedFormation.name}陣】戰術特長與地形實戰指南
                </span>
                <span className="text-xs px-2 py-0.5 bg-stone-100 border border-stone-300 rounded font-bold text-stone-700">
                  適應地形：{selectedFormation.terrain}
                </span>
              </div>
              <span className="text-xs text-stone-500 font-bold">
                {selectedFormation.specialDesc}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {ALL_TERRAINS.map(tKey => {
                const compat = FORMATION_TERRAIN_MATRIX[selectedFormation.name]?.[tKey];
                if (!compat) return null;
                const isCurrent = currentTerrain === tKey;

                return (
                  <div 
                    key={tKey}
                    className={`p-2.5 rounded border ${
                      isCurrent 
                        ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/50' 
                        : 'bg-stone-50 border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-stone-800 flex items-center gap-1">
                        {TERRAIN_DETAILS[tKey].symbol} {tKey}
                        {isCurrent && <span className="text-[10px] text-amber-700 font-bold">(當前)</span>}
                      </span>
                      {getRatingBadge(compat.rating)}
                    </div>
                    <div className="text-[11px] font-bold text-stone-900 mb-1">
                      {compat.tag}
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      {compat.detailedEffect}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#e8e4db] px-4 py-2.5 border-t-2 border-stone-400 flex items-center justify-between">
          <div className="text-xs text-stone-600 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>提示：戰場中軍師亦可消耗計謀揮令「即時更變全軍陣形」以適應敵陣與地勢。</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-[#1c1917] hover:bg-stone-800 text-[#f5f2eb] font-bold rounded text-xs shadow hover:scale-102 active:scale-98 transition-all cursor-pointer"
          >
            明白 ‧ 返回佈陣
          </button>
        </div>

      </div>
    </div>
  );
}
