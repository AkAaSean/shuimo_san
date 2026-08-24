import React from 'react';
import { BattleState } from '../types';

export default function BattleCards({ state }: { state: BattleState }) {
  const attackerTotalTroops = state.units.filter(u => u.isAttacker).reduce((acc, u) => acc + u.troops, 0);
  const defenderTotalTroops = state.units.filter(u => !u.isAttacker).reduce((acc, u) => acc + u.troops, 0);
  const attackerGenerals = state.units.filter(u => u.isAttacker).length;
  const defenderGenerals = state.units.filter(u => !u.isAttacker).length;

  return (
    <div className="flex w-full bg-stone-200 border-b-2 border-stone-800 z-10 font-serif">
      {/* Attacker */}
      <div className="flex-1 border-r border-stone-400 p-2 relative">
        <div className="text-sm font-bold text-stone-900 border-b border-stone-400 mb-1">
          主攻軍: {state.attacker.commander}軍 <span className="text-xs font-normal">({state.attacker.commander} {attackerGenerals}將)</span>
        </div>
        <div className="text-xs text-stone-700 flex justify-between">
          <span>兵員: <span className="font-bold text-rose-800">{attackerTotalTroops}</span></span>
          <span>金: <span className="font-bold text-amber-700">{state.attacker.gold}</span></span>
          <span>糧: <span className="font-bold text-emerald-800">{state.attacker.food}</span></span>
        </div>
        <div className="absolute top-2 right-2 w-10 h-12 bg-stone-300 border border-stone-800 flex justify-center items-center opacity-40">
          肖像
        </div>
      </div>
      
      {/* Defender */}
      <div className="flex-1 p-2 relative">
        <div className="text-sm font-bold text-stone-900 border-b border-stone-400 mb-1">
          主守軍: {state.defender.commander}軍 <span className="text-xs font-normal">({state.defender.commander} {defenderGenerals}將)</span>
        </div>
        <div className="text-xs text-stone-700 flex justify-between pr-12">
          <span>兵員: <span className="font-bold text-sky-800">{defenderTotalTroops}</span></span>
          <span>金: <span className="font-bold text-amber-700">{state.defender.gold}</span></span>
          <span>糧: <span className="font-bold text-emerald-800">{state.defender.food}</span></span>
        </div>
        <div className="absolute top-2 right-2 w-10 h-12 bg-stone-300 border border-stone-800 flex justify-center items-center opacity-40">
          肖像
        </div>
      </div>
    </div>
  );
}
