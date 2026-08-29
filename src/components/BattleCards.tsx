import React from 'react';
import { BattleState, BattleUnit, PassiveSkillId } from '../types';
import { PASSIVE_SKILL_REGISTRY } from '../engine/battleCalculations';
import { isPassiveSkill } from '../engine/skills';
import { GeneralAvatar } from './GeneralAvatar';

interface BattleCardsProps {
  state: BattleState;
  activeUnit?: BattleUnit | null;
}

export default function BattleCards({ state, activeUnit }: BattleCardsProps) {
  const attackerTotalTroops = state.units.filter(u => u.isAttacker).reduce((acc, u) => acc + u.troops, 0);
  const defenderTotalTroops = state.units.filter(u => !u.isAttacker).reduce((acc, u) => acc + u.troops, 0);
  const attackerGenerals = state.units.filter(u => u.isAttacker).length;
  const defenderGenerals = state.units.filter(u => !u.isAttacker).length;

  const attackerCommanderUnit = state.units.find(u => u.isAttacker && u.isCommander) || state.units.find(u => u.isAttacker);
  const defenderCommanderUnit = state.units.find(u => !u.isAttacker && u.isCommander) || state.units.find(u => !u.isAttacker);

  // Helper to extract passive skills from a unit
  const getUnitPassives = (unit?: BattleUnit | null): PassiveSkillId[] => {
    if (!unit) return [];
    if (unit.passives && unit.passives.length > 0) return unit.passives;
    const skills = unit.skills || [];
    return skills.filter(s => isPassiveSkill(s)) as PassiveSkillId[];
  };

  const currentUnit = activeUnit || state.units.find(u => u.id === state.activeUnitId) || null;
  const currentPassives = getUnitPassives(currentUnit);

  const getPassiveBadgeStyle = (pid: PassiveSkillId) => {
    switch (pid) {
      case '無雙':
        return 'bg-amber-100 text-amber-900 border-amber-400 font-black';
      case '奮發':
        return 'bg-rose-100 text-rose-900 border-rose-400 font-black';
      case '沉著':
        return 'bg-blue-100 text-blue-900 border-blue-400 font-bold';
      case '反計':
        return 'bg-purple-100 text-purple-900 border-purple-400 font-bold';
      case '回射':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
      case '騎射':
        return 'bg-orange-100 text-orange-900 border-orange-400 font-bold';
      case '藤甲':
        return 'bg-lime-100 text-lime-900 border-lime-500 font-bold';
      default:
        return 'bg-stone-200 text-stone-800 border-stone-400 font-normal';
    }
  };

  return (
    <div className="flex flex-col w-full bg-stone-200 border-b-2 border-stone-800 z-10 font-serif shadow-xs">
      <div className="flex w-full">
        {/* Attacker Section */}
        <div className="flex-1 border-r border-stone-400 p-2 relative bg-rose-50/40">
          <div className="flex justify-between items-center border-b border-stone-400 pb-1 mb-1">
            <div className="flex items-center gap-2">
              <GeneralAvatar name={state.attacker.commander} size={36} className="shrink-0 rounded shadow-xs border-rose-900" />
              <div>
                <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-rose-800 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">主攻</span>
                  <span>{state.attacker.commander}軍</span>
                  <span className="text-xs text-stone-600 font-normal">({attackerGenerals}將)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-700 flex justify-between pr-2 mb-1">
            <span>兵力: <span className="font-bold text-rose-800">{attackerTotalTroops.toLocaleString()}</span></span>
            <span>金: <span className="font-bold text-amber-700">{state.attacker.gold}</span></span>
            <span>糧: <span className="font-bold text-emerald-800">{state.attacker.food}</span></span>
          </div>

          {/* Commander Passive Skills Bar */}
          {attackerCommanderUnit && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              <span className="text-[10px] text-stone-500 font-bold">主帥特技:</span>
              {getUnitPassives(attackerCommanderUnit).length > 0 ? (
                getUnitPassives(attackerCommanderUnit).map(pid => {
                  const def = PASSIVE_SKILL_REGISTRY[pid];
                  return (
                    <span
                      key={pid}
                      className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 cursor-help ${getPassiveBadgeStyle(pid)}`}
                      title={`【${pid}】${def?.desc || ''}`}
                    >
                      <span>{def?.iconSymbol || '📜'}</span>
                      <span>{pid}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] text-stone-400 italic">無常時被動</span>
              )}
            </div>
          )}
        </div>
        
        {/* Defender Section */}
        <div className="flex-1 p-2 relative bg-sky-50/40">
          <div className="flex justify-between items-center border-b border-stone-400 pb-1 mb-1">
            <div className="flex items-center gap-2">
              <GeneralAvatar name={state.defender.commander} size={36} className="shrink-0 rounded shadow-xs border-sky-900" />
              <div>
                <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5 flex-wrap">
                  <span className="bg-sky-800 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">主守</span>
                  <span>{state.defender.commander}軍</span>
                  <span className="text-xs text-stone-600 font-normal">({defenderGenerals}將)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-stone-700 flex justify-between pr-2 mb-1">
            <span>兵力: <span className="font-bold text-sky-800">{defenderTotalTroops.toLocaleString()}</span></span>
            <span>金: <span className="font-bold text-amber-700">{state.defender.gold}</span></span>
            <span>糧: <span className="font-bold text-emerald-800">{state.defender.food}</span></span>
          </div>

          {/* Commander Passive Skills Bar */}
          {defenderCommanderUnit && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              <span className="text-[10px] text-stone-500 font-bold">主帥特技:</span>
              {getUnitPassives(defenderCommanderUnit).length > 0 ? (
                getUnitPassives(defenderCommanderUnit).map(pid => {
                  const def = PASSIVE_SKILL_REGISTRY[pid];
                  return (
                    <span
                      key={pid}
                      className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 cursor-help ${getPassiveBadgeStyle(pid)}`}
                      title={`【${pid}】${def?.desc || ''}`}
                    >
                      <span>{def?.iconSymbol || '📜'}</span>
                      <span>{pid}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-[10px] text-stone-400 italic">無常時被動</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Unit Focus Strip */}
      {currentUnit && (
        <div className="bg-stone-300/80 px-2.5 py-1.5 border-t border-stone-400 flex items-center justify-between text-xs flex-wrap gap-1">
          <div className="flex items-center gap-2">
            <GeneralAvatar name={currentUnit.generalName} size={28} className="shrink-0 rounded" />
            <span className="text-[11px] font-black text-stone-800">
              當前行動將領：
              <span className={`px-1.5 py-0.5 rounded text-white font-bold ml-1 ${currentUnit.isAttacker ? 'bg-rose-800' : 'bg-sky-800'}`}>
                {currentUnit.generalName}
              </span>
            </span>
            <span className="text-[11px] text-stone-600">
              [陣形: <strong className="text-stone-900">{currentUnit.formation || '平地'}</strong> | 兵力: <strong className="text-rose-800">{currentUnit.troops.toLocaleString()}</strong>]
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-stone-700">被動效果:</span>
            {currentPassives.length > 0 ? (
              currentPassives.map(pid => {
                const def = PASSIVE_SKILL_REGISTRY[pid];
                return (
                  <span
                    key={pid}
                    className={`text-[10px] px-1.5 py-0.2 rounded border flex items-center gap-0.5 shadow-2xs ${getPassiveBadgeStyle(pid)}`}
                    title={`【${pid}】${def?.desc || ''}`}
                  >
                    <span>{def?.iconSymbol || '⚡'}</span>
                    <span>{pid}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-[10px] text-stone-500 italic">無常時被動特技</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
