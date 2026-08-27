import React from 'react';
import { BattleState } from '../types';
import { provinces } from '../data/provinces';

export default function BattleHeader({ state }: { state: BattleState }) {
  const province = provinces.find(p => p.id === state.provinceId);
  const locationText = province ? `[${province.name} ${province.region} ${province.id}]` : '[未知領域]';

  return (
    <div className="w-full bg-stone-300 border-b-2 border-stone-800 p-2 shadow-md relative z-10 font-serif">
      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
        <span>{locationText}</span>
        <span className="text-stone-600 bg-stone-200 px-2 py-0.5 rounded-sm border border-stone-400">
          [風向: {state.windDirection}]
        </span>
        <span>[{state.time} {state.currentDay}/{state.maxDays}日]</span>
      </div>
    </div>
  );
}
