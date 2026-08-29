import React, { useState, useMemo } from 'react';
import { GameState, BattleState } from '../types';
import { FORMATIONS, getGeneralAvailableFormations } from '../engine/formations';
import { GeneralAvatar } from './GeneralAvatar';

interface FormationSelectionViewProps {
  gameState: GameState;
  battleState: BattleState;
  onComplete: (assignedFormations: Record<string, string>) => void;
}

export default function FormationSelectionView({ gameState, battleState, onComplete }: FormationSelectionViewProps) {
  // Only for attacking units
  const attackingUnits = useMemo(() => {
    return battleState.units.filter(u => u.isAttacker);
  }, [battleState.units]);

  // Pre-calculate available formations for all participating units
  const unitFormationsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    attackingUnits.forEach(u => {
      const gen = gameState.generalsData[u.generalName];
      const forms = gen?.formations && gen.formations.length > 0
        ? gen.formations
        : getGeneralAvailableFormations(gen || { name: u.generalName, str: 70, int: 70 });
      map[u.id] = forms;
    });
    return map;
  }, [attackingUnits, gameState.generalsData]);

  // Initial state: default each unit to its first available formation
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    attackingUnits.forEach(u => {
      const gen = gameState.generalsData[u.generalName];
      const forms = gen?.formations && gen.formations.length > 0
        ? gen.formations
        : getGeneralAvailableFormations(gen || { name: u.generalName, str: 70, int: 70 });
      init[u.id] = forms[0] || '魚鱗';
    });
    return init;
  });

  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);

  const selectedUnit = attackingUnits[selectedUnitIndex] || attackingUnits[0];
  const selectedUnitId = selectedUnit?.id || '';
  const selectedGen = selectedUnit ? gameState.generalsData[selectedUnit.generalName] : null;
  const currentUnitLearnedFormations = selectedUnit ? (unitFormationsMap[selectedUnit.id] || ['魚鱗']) : ['魚鱗'];

  const handleSelectFormation = (unitId: string, formationName: string) => {
    setAssignments(prev => ({
      ...prev,
      [unitId]: formationName
    }));
  };

  const handleNextUnit = () => {
    if (selectedUnitIndex < attackingUnits.length - 1) {
      setSelectedUnitIndex(prev => prev + 1);
    }
  };

  const handlePrevUnit = () => {
    if (selectedUnitIndex > 0) {
      setSelectedUnitIndex(prev => prev - 1);
    }
  };

  const handleConfirm = () => {
    // Ensure all units have a valid learned formation
    const finalAssignments: Record<string, string> = {};
    attackingUnits.forEach(u => {
      const learned = unitFormationsMap[u.id] || ['魚鱗'];
      const chosen = assignments[u.id];
      if (chosen && learned.includes(chosen)) {
        finalAssignments[u.id] = chosen;
      } else {
        finalAssignments[u.id] = learned[0] || '魚鱗';
      }
    });

    onComplete(finalAssignments);
  };

  // Only display formations that this general has actually learned
  const displayedFormations = useMemo(() => {
    return FORMATIONS.filter(f => f.name !== '無陣' && currentUnitLearnedFormations.includes(f.name));
  }, [currentUnitLearnedFormations]);

  return (
    <div className="absolute inset-0 bg-[#e6e2db] z-50 flex flex-col font-serif text-[#1c1917] p-3 sm:p-5 select-none overflow-hidden">
      {/* Header Banner */}
      <div className="py-2 px-3 mb-2 border-b-2 border-[#1c1917] bg-[#f5f2eb] shadow-sm rounded flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black text-[#991b1b]">戰前佈陣 ‧ 選擇陣形</span>
          <span className="text-xs bg-amber-100 border border-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded">
            共 {attackingUnits.length} 支部隊出征
          </span>
        </div>
        <p className="text-xs text-stone-600 font-bold">
          點選武將或使用切換按鈕，為每位出戰武將指派已習得之專屬陣形
        </p>
      </div>

      {/* Top Stepper for Quick Switching between all attacking generals */}
      <div className="bg-white border-2 border-[#1c1917] p-2 mb-3 rounded shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            disabled={selectedUnitIndex <= 0}
            onClick={handlePrevUnit}
            className="px-2.5 py-1 text-xs font-black border border-[#1c1917] bg-stone-100 rounded hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            ‹ 上一位
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {attackingUnits.map((unit, idx) => {
              const isCurrent = idx === selectedUnitIndex;
              const chosen = assignments[unit.id] || '魚鱗';
              return (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitIndex(idx)}
                  className={`px-3 py-1 text-xs rounded border-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'border-[#991b1b] bg-[#991b1b] text-white font-black shadow-xs'
                      : 'border-stone-300 bg-stone-50 hover:border-stone-500 font-bold text-stone-800'
                  }`}
                >
                  <span>{idx + 1}. {unit.generalName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-black border ${
                    isCurrent
                      ? 'bg-amber-300 text-stone-900 border-amber-400'
                      : 'bg-rose-100 text-red-800 border-red-200'
                  }`}>
                    {chosen}陣
                  </span>
                </button>
              );
            })}
          </div>

          <button
            disabled={selectedUnitIndex >= attackingUnits.length - 1}
            onClick={handleNextUnit}
            className="px-2.5 py-1 text-xs font-black border border-[#1c1917] bg-stone-100 rounded hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            下一位 ›
          </button>
        </div>

        <div className="text-xs text-stone-500 font-black shrink-0 hidden md:block">
          當前設定第 {selectedUnitIndex + 1} / {attackingUnits.length} 位
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden gap-3 sm:gap-4 flex-col md:flex-row">
        {/* Left Panel: Units List */}
        <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex justify-between items-center border-b-2 border-[#1c1917] pb-1">
            <h3 className="font-black text-sm text-stone-800">出征部隊名冊 ({attackingUnits.length}隊)</h3>
            <span className="text-[11px] text-stone-500 font-bold">點選可切換設定</span>
          </div>

          <div className="flex flex-col gap-2">
            {attackingUnits.map((unit, idx) => {
              const gen = gameState.generalsData[unit.generalName];
              const isSelected = idx === selectedUnitIndex;
              const currentFormation = assignments[unit.id] || '魚鱗';
              const learned = unitFormationsMap[unit.id] || [];

              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnitIndex(idx)}
                  className={`p-2.5 sm:p-3 border-2 cursor-pointer transition-all rounded shadow-xs ${
                    isSelected
                      ? 'border-[#991b1b] bg-amber-50 shadow-md ring-2 ring-[#991b1b]'
                      : 'border-stone-300 bg-white hover:border-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <GeneralAvatar name={unit.generalName} size={36} className="shrink-0 rounded shadow-xs" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-base text-stone-900">{unit.generalName}</span>
                          {unit.isCommander && (
                            <span className="text-[10px] bg-[#991b1b] text-white px-1.5 py-0.5 rounded font-black">
                              主帥
                            </span>
                          )}
                          <span className="text-[10px] bg-stone-200 text-stone-700 font-bold px-1.5 py-0.5 rounded border border-stone-300">
                            習得 {learned.length} 種
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-1 flex gap-2">
                          <span>兵力: <strong className="text-[#991b1b]">{unit.troops}</strong></span>
                          {gen && (
                            <>
                              <span>武: <strong>{gen.str}</strong></span>
                              <span>智: <strong>{gen.int}</strong></span>
                              <span>統: <strong>{gen.hp}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-bold">出戰陣形</div>
                      <div className="text-sm font-black text-[#991b1b] bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-0.5 inline-block">
                        【{currentFormation}陣】
                      </div>
                    </div>
                  </div>

                  {/* Direct 1-Click Formation Chips on each unit card */}
                  <div className="mt-2 pt-1.5 border-t border-stone-200 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-stone-400 font-bold">快速切換:</span>
                    {learned.map(fname => {
                      const isChosen = fname === currentFormation;
                      return (
                        <button
                          key={fname}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUnitIndex(idx);
                            handleSelectFormation(unit.id, fname);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-[#991b1b] text-white border-[#991b1b] shadow-xs'
                              : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                          }`}
                        >
                          {fname}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Active General's Learned Formations Matrix */}
        <div className="w-full md:w-7/12 lg:w-8/12 flex flex-col h-full bg-white border-2 border-[#1c1917] p-3 sm:p-4 rounded shadow-sm">
          <div className="border-b-2 border-stone-300 pb-2 mb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-stone-900">
                  【{selectedUnit?.generalName}】已習得之專屬陣形
                </h3>
                {selectedUnit?.isCommander && (
                  <span className="text-xs bg-[#991b1b] text-white px-2 py-0.5 rounded font-black">
                    全軍主帥
                  </span>
                )}
                <span className="text-xs text-amber-900 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  可選 {currentUnitLearnedFormations.length} 種
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-bold hidden sm:inline">
                  點選下方陣形即刻套用
                </span>
                {selectedUnitIndex < attackingUnits.length - 1 && (
                  <button
                    onClick={handleNextUnit}
                    className="text-xs px-2.5 py-1 bg-stone-100 border border-stone-400 hover:bg-stone-200 rounded font-bold cursor-pointer"
                  >
                    設定下一位 ➔
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Formations Grid - Only shows learned formations */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedFormations.map(form => {
              const isSelected = (assignments[selectedUnitId] || '魚鱗') === form.name;

              return (
                <div
                  key={form.name}
                  onClick={() => handleSelectFormation(selectedUnitId, form.name)}
                  className={`p-3.5 border-2 rounded-md transition-all flex flex-col justify-between cursor-pointer shadow-xs ${
                    isSelected
                      ? 'border-[#991b1b] bg-rose-800 text-white shadow-md ring-2 ring-red-900 scale-[1.01]'
                      : 'border-stone-400 bg-stone-50/50 hover:border-[#991b1b] hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Formation Title & Badges */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                          {form.name}陣
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 border-amber-300'
                            : 'bg-stone-200 text-stone-700 border-stone-300'
                        }`}>
                          {isSelected ? '✓ 當前選定' : '點選套用'}
                        </span>
                      </div>

                      <span className={`text-xs px-2 py-0.5 border rounded-full font-bold ${
                        isSelected
                          ? 'border-red-200 bg-red-900/60 text-red-100'
                          : (form.terrain || form.type) === '水上'
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : (form.terrain || form.type) === '山嶽'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : (form.terrain || form.type) === '密林'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : (form.terrain || form.type) === '通用'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-lime-100 text-lime-800 border-lime-300'
                      }`}>
                        {form.terrain || form.type}
                      </span>
                    </div>

                    {/* Terrain Adaptability Badge & Stats 6-grid */}
                    <div className={`text-[11px] font-bold py-1 px-2 mb-1.5 rounded flex justify-between items-center ${
                      isSelected ? 'bg-black/25 text-amber-200' : 'bg-stone-200 text-stone-800'
                    }`}>
                      <span>優勢地形: <strong className="underline">{form.terrain || form.type}</strong></span>
                      <span>
                        {(form.terrain || form.type) === '平地' && '平地極速(+20%攻擊) / 山水受制'}
                        {(form.terrain || form.type) === '山嶽' && '山地險阻(+30%暴擊/金湯) / 窄道突擊'}
                        {(form.terrain || form.type) === '水上' && '江河水網(+20%攻防) / 水計減耗'}
                        {(form.terrain || form.type) === '通用' && '奇門神陣 / 全地形適應+計謀增幅'}
                      </span>
                    </div>

                    <div className={`grid grid-cols-3 gap-x-2 gap-y-1 text-xs py-1.5 px-2 rounded ${
                      isSelected ? 'bg-black/15 text-rose-50' : 'bg-stone-100 text-stone-700'
                    }`}>
                      <div>近攻: <span className="font-bold text-sm">{form.atk}</span></div>
                      <div>近防: <span className="font-bold text-sm">{form.def}</span></div>
                      <div>機動: <span className="font-bold text-sm">{form.mobility}</span></div>
                      <div>弓攻: <span className="font-bold text-sm">{form.bowAtk}</span></div>
                      <div>弓防: <span className="font-bold text-sm">{form.bowDef}</span></div>
                      <div>射程: <span className="font-bold text-sm">{form.range}</span></div>
                    </div>
                  </div>

                  {/* Special Feature Footer */}
                  <div className={`mt-2.5 pt-2 border-t text-xs font-bold leading-relaxed ${
                    isSelected
                      ? 'border-red-700 text-amber-200'
                      : 'border-stone-200 text-stone-700'
                  }`}>
                    特長: {form.special}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-2.5 p-2.5 sm:p-3 border-t-2 border-[#1c1917] bg-[#f5f2eb] flex justify-between items-center rounded shadow-xs flex-wrap gap-2">
        <div className="text-xs text-stone-600 font-bold">
          全軍 <strong className="text-[#991b1b]">{attackingUnits.length}</strong> 隊出征將領陣形均已就緒！
        </div>

        <button
          onClick={handleConfirm}
          className="w-full sm:w-auto px-8 py-2.5 bg-[#991b1b] text-white font-black text-base sm:text-lg rounded shadow-[3px_3px_0_#1c1917] hover:bg-red-800 active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all cursor-pointer"
        >
          全軍出擊！進入主戰場
        </button>
      </div>
    </div>
  );
}
