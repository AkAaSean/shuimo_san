import React from 'react';
import { X, Shield, Swords, ArrowRight, Sparkles, Zap, Crosshair } from 'lucide-react';
import { FORMATIONS, getGeneralAvailableFormations } from '../engine/formations';
import { GeneralState, BattleUnit } from '../types';
import { GeneralAvatar } from './GeneralAvatar';

interface BattleFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUnit: BattleUnit | null;
  activeGeneral: GeneralState | null;
  onSelectFormation: (formationName: string) => void;
}

export default function BattleFormationModal({
  isOpen,
  onClose,
  activeUnit,
  activeGeneral,
  onSelectFormation,
}: BattleFormationModalProps) {
  if (!isOpen || !activeUnit) return null;

  const stamina = activeUnit.stamina ?? 100;
  const currentFormationName = activeUnit.formation || '魚鱗';

  // Get formations learned by this general
  const learnedFormations = activeGeneral?.formations && activeGeneral.formations.length > 0
    ? activeGeneral.formations
    : getGeneralAvailableFormations(activeGeneral || { 
        name: activeUnit.generalName, 
        str: 75, 
        int: 75, 
        hp: 75 
      });

  const availableFormationObjects = FORMATIONS.filter(
    f => f.name !== '無陣' && learnedFormations.includes(f.name)
  );

  const currentFormationObj = FORMATIONS.find(f => f.name === currentFormationName) || FORMATIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-serif select-none animate-fade-in">
      <div className="bg-[#f5f2eb] border-2 border-stone-800 w-full max-w-2xl rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-stone-900 text-stone-100 px-4 py-2.5 flex items-center justify-between border-b-2 border-amber-600">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-lg">🚩 戰場佈陣 ‧ 臨機變陣</span>
            <span className="text-xs bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded border border-amber-700 font-bold">
              佈陣特技專屬
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* General Summary Bar */}
        <div className="bg-stone-200/90 border-b border-stone-400 px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <GeneralAvatar name={activeUnit.generalName} size={40} className="shrink-0 rounded border-2 border-stone-800 shadow-xs" />
            <div>
              <div className="font-black text-sm text-stone-900 flex items-center gap-2">
                {activeUnit.generalName}
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 rounded">
                  ✨ 持有【佈陣】特技
                </span>
              </div>
              <div className="text-stone-600 text-[11px]">
                統率: <span className="font-bold text-stone-900">{activeGeneral?.hp ?? 75}</span> | 
                謀略: <span className="font-bold text-stone-900">{activeGeneral?.int ?? 75}</span> | 
                武力: <span className="font-bold text-stone-900">{activeGeneral?.str ?? 75}</span> | 
                兵力: <span className="font-bold text-rose-800">{activeUnit.troops}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-stone-400 px-2.5 py-1 rounded text-center">
              <div className="text-[10px] text-stone-500 font-bold">當前陣形</div>
              <div className="font-black text-amber-900 text-xs">{currentFormationName}陣</div>
            </div>
            <div className={`border px-2.5 py-1 rounded text-center ${
              stamina >= 15 ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="text-[10px] text-stone-500 font-bold">體力 / 消耗</div>
              <div className="font-black text-xs">{stamina} / -15</div>
            </div>
          </div>
        </div>

        {/* Formations Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">
          <div className="text-xs text-stone-600 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            點選以下已習得之陣形，消耗 15 點體力即時臨機變換作戰陣勢：
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableFormationObjects.map(f => {
              const isCurrent = f.name === currentFormationName;
              const canAfford = stamina >= 15;

              return (
                <div
                  key={f.name}
                  className={`p-3 rounded border-2 transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-amber-50/90 border-amber-600 shadow-sm ring-1 ring-amber-400'
                      : 'bg-white border-stone-300 hover:border-stone-500 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-stone-300 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-base text-stone-900">【{f.name}陣】</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          (f.terrain || f.type) === '水上'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : (f.terrain || f.type) === '山嶽'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : (f.terrain || f.type) === '密林'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : (f.terrain || f.type) === '通用'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-lime-100 text-lime-900 border-lime-300'
                        }`}>
                          {f.terrain || f.type}適性
                        </span>
                      </div>

                      {isCurrent && (
                        <span className="text-xs bg-amber-600 text-white font-black px-2 py-0.5 rounded shadow-2xs">
                          當前陣形
                        </span>
                      )}
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px] flex items-center gap-0.5"><Swords className="w-3 h-3 text-red-600" />近攻</span>
                        <span className="font-bold text-stone-900">{f.atk}</span>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px] flex items-center gap-0.5"><Shield className="w-3 h-3 text-blue-600" />近防</span>
                        <span className="font-bold text-stone-900">{f.def}</span>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px] flex items-center gap-0.5"><Zap className="w-3 h-3 text-amber-600" />先攻</span>
                        <span className="font-bold text-stone-900">{f.initiativeMod > 0 ? `+${f.initiativeMod}` : f.initiativeMod}</span>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px] flex items-center gap-0.5"><Crosshair className="w-3 h-3 text-purple-600" />弓攻</span>
                        <span className="font-bold text-stone-900">{f.bowAtk}</span>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px]">弓防</span>
                        <span className="font-bold text-stone-900">{f.bowDef}</span>
                      </div>
                      <div className="bg-stone-50 border border-stone-200 p-1 rounded flex items-center justify-between">
                        <span className="text-stone-500 text-[11px]">射程</span>
                        <span className="font-bold text-stone-900">{f.range}格</span>
                      </div>
                    </div>

                    {/* Features & Description */}
                    <div className="text-[11px] text-stone-600 mb-2 leading-relaxed bg-stone-100/70 p-1.5 rounded border border-stone-200">
                      {f.special}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-stone-200">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-1.5 text-xs font-bold text-stone-400 bg-stone-200 border border-stone-300 rounded cursor-not-allowed text-center"
                      >
                        已在此陣形中
                      </button>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => onSelectFormation(f.name)}
                        className={`w-full py-1.5 text-xs font-black rounded border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-amber-600 hover:bg-amber-700 active:scale-98 text-white border-amber-800 shadow-xs'
                            : 'bg-stone-300 border-stone-400 text-stone-500 cursor-not-allowed'
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        變更為【{f.name}陣】 (消耗 15 體力)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-300 border-t border-stone-400 px-4 py-2.5 flex items-center justify-between">
          <div className="text-xs text-stone-600">
            💡 提示：根據戰場地形與敵方兵種隨時切換陣勢，可大幅提升部隊作戰效能。
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-stone-800 text-stone-100 text-xs font-bold rounded hover:bg-stone-700 cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
