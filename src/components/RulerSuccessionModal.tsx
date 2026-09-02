import React, { useState } from 'react';
import { GeneralState } from '../types';
import { Crown, ShieldAlert, Sparkles, CheckCircle2, UserCheck, HeartHandshake } from 'lucide-react';
import { HISTORICAL_SUCCESSORS } from '../engine/rulerSuccessionLogic';
import { GeneralAvatar } from './GeneralAvatar';

interface RulerSuccessionModalProps {
  executedRuler: string;
  killerRuler: string;
  candidateNames: string[];
  generalsData: Record<string, GeneralState>;
  onSelectSuccessor: (successorName: string) => void;
}

export const RulerSuccessionModal: React.FC<RulerSuccessionModalProps> = ({
  executedRuler,
  killerRuler,
  candidateNames,
  generalsData,
  onSelectSuccessor
}) => {
  const [selectedGenName, setSelectedGenName] = useState<string>(candidateNames[0] || '');

  const historicalList = HISTORICAL_SUCCESSORS[executedRuler] || [];

  const candidates = candidateNames
    .map(name => generalsData[name])
    .filter(Boolean) as GeneralState[];

  // Sort candidates by historical priority first, then overall power
  candidates.sort((a, b) => {
    const idxA = historicalList.indexOf(a.name);
    const idxB = historicalList.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (b.cha * 2 + b.pol * 1.5 + b.str) - (a.cha * 2 + a.pol * 1.5 + a.str);
  });

  const selectedGen = generalsData[selectedGenName];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1b1511] border-2 border-amber-600/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-amber-950 to-stone-900 px-6 py-4 border-b border-amber-600/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Crown className="w-7 h-7 text-amber-400 animate-bounce" />
            <h2 className="text-xl sm:text-2xl font-black text-amber-200 tracking-wider font-serif">
              國不可一日無君 · 選擇新主公
            </h2>
          </div>
          <span className="text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full border border-rose-500/30 font-bold">
            可選大臣: {candidates.length} 人
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          {/* Notice Banner */}
          <div className="bg-rose-950/70 border border-rose-600/70 rounded-xl p-4 flex items-start gap-3 text-rose-100 shadow-md">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs sm:text-sm">
              <span className="font-black text-rose-300 text-sm sm:text-base">
                先主【{executedRuler}】不幸遭仇敵【{killerRuler}】兵敗斬首！
              </span>
              <p className="text-rose-200/90 leading-relaxed">
                國家危急存亡之秋，伏請親自指派一位重臣繼承君主大統！新君主的「魅力」將決定全軍忠誠度凝聚力，且將率全軍討伐仇敵暴政！
              </p>
            </div>
          </div>

          {/* Candidate Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {candidates.map(gen => {
              const isSelected = selectedGenName === gen.name;
              const isHistoricalHeir = historicalList.indexOf(gen.name) !== -1;
              const loyaltyShiftForecast = Math.floor((gen.cha - 70) / 2);

              return (
                <div
                  key={gen.name}
                  onClick={() => setSelectedGenName(gen.name)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                    isSelected
                      ? 'bg-[#2d221a] border-amber-400 shadow-amber-900/40 shadow-xl ring-2 ring-amber-400/30 scale-[1.02]'
                      : 'bg-[#201914] border-stone-800 hover:border-amber-700/60 hover:bg-[#251e18]'
                  }`}
                >
                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-stone-950 p-1 rounded-full shadow-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <GeneralAvatar name={gen.name} size={48} className="border-amber-600/60" />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base text-amber-100 font-serif">
                          {gen.name}
                        </span>
                        {isHistoricalHeir && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            嫡系首選
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-400 font-medium">
                        {gen.role || '大將'}
                      </span>
                    </div>
                  </div>

                  {/* 4 Stats */}
                  <div className="grid grid-cols-4 gap-1 text-center text-xs bg-stone-900/80 p-1.5 rounded-lg border border-stone-800">
                    <div>
                      <span className="text-stone-400 text-[10px] block">武力</span>
                      <span className="font-bold text-rose-400">{gen.str}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">謀略</span>
                      <span className="font-bold text-sky-400">{gen.int}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">政治</span>
                      <span className="font-bold text-emerald-400">{gen.pol}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] block">魅力</span>
                      <span className="font-bold text-amber-400">{gen.cha}</span>
                    </div>
                  </div>

                  {/* Loyalty forecast info */}
                  <div className="flex items-center justify-between text-[11px] px-1 pt-0.5 text-stone-300 border-t border-stone-800/60">
                    <span className="flex items-center gap-1 text-stone-400">
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                      全軍軍心預測:
                    </span>
                    <span className={`font-bold ${loyaltyShiftForecast >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {loyaltyShiftForecast >= 0 ? `+${loyaltyShiftForecast} (人心凝聚)` : `${loyaltyShiftForecast} (軍心動盪)`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirm Button */}
          {selectedGen && (
            <button
              onClick={() => onSelectSuccessor(selectedGenName)}
              className="mt-2 w-full py-4 px-6 rounded-xl font-black text-base bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 border border-amber-200 shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 animate-pulse"
            >
              <UserCheck className="w-5 h-5" />
              <span>擁立【{selectedGenName}】登基為新君主！繼承先主遺志！</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
