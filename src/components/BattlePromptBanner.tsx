import React from 'react';
import { BattleState } from '../types';

interface BattlePromptBannerProps {
  state: BattleState;
  customMessage?: string | null;
}

export default function BattlePromptBanner({ state, customMessage }: BattlePromptBannerProps) {
  const activeUnit = state.units.find(u => u.id === state.activeUnitId);
  const generalName = activeUnit ? activeUnit.generalName : '...';
  const latestLog = state.battleLogs && state.battleLogs.length > 0 ? state.battleLogs[state.battleLogs.length - 1] : null;

  const displayMessage = customMessage || (latestLog ? latestLog.text : null);

  return (
    <div className="w-full bg-stone-900 text-stone-100 px-3 py-2 shadow-inner relative z-10 font-serif border-y-2 border-stone-700 flex items-center gap-2 min-h-[44px]">
      <div className="text-lg text-amber-500 font-bold leading-none">「</div>
      <div className="flex-1 text-xs md:text-sm tracking-wide leading-snug truncate">
        {displayMessage ? (
          <span className="text-amber-200 animate-pulse">{displayMessage}</span>
        ) : (
          <span>
            <span className="font-bold text-amber-400">{state.attacker.commander}</span> 主公，請對將領 <span className="font-bold text-sky-300">【{generalName}】</span> 選擇執行戰術命令：
          </span>
        )}
      </div>
      <div className="text-lg text-amber-500 font-bold leading-none">」</div>
    </div>
  );
}
