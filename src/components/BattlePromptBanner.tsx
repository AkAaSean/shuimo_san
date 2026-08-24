import React from 'react';
import { BattleState } from '../types';

interface BattlePromptBannerProps {
  state: BattleState;
}

export default function BattlePromptBanner({ state }: BattlePromptBannerProps) {
  const activeUnit = state.units.find(u => u.id === state.activeUnitId);
  const generalName = activeUnit ? activeUnit.generalName : '...';

  return (
    <div className="w-full bg-stone-800 text-stone-100 p-2 shadow-inner relative z-10 font-serif border-y-2 border-stone-600 flex items-start gap-2">
      <div className="text-lg leading-none mt-1">「</div>
      <div className="flex-1 text-sm tracking-wide leading-relaxed">
        <span className="font-bold text-amber-500">{state.attacker.commander}</span> 主公，請對將領 <span className="font-bold text-sky-300">{generalName}</span> 選擇執行的命令：
      </div>
      <div className="text-lg leading-none self-end mb-1">」</div>
    </div>
  );
}
