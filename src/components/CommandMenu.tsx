import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';

export const COMMANDS = [
  { id: 0, label: '0.狀態' },
  { id: 1, label: '1.查看' },
  { id: 2, label: '2.軍事' },
  { id: 3, label: '3.兵士' },
  { id: 4, label: '4.內政' },
  { id: 5, label: '5.商業' },
  { id: 6, label: '6.人事' },
  { id: 7, label: '7.君主' },
  { id: 8, label: '8.謀略' },
  { id: 9, label: '9.系統' },
];

interface CommandMenuProps {
  gameState: GameState;
  onCommandSelect: (id: number) => void;
  showToast?: (msg: string) => void;
}

export default function CommandMenu({ gameState, onCommandSelect, showToast }: CommandMenuProps) {
  const [splashes, setSplashes] = useState<{ id: string; cmdId: number; x: number; y: number }[]>([]);

  const selectedProv = gameState.selectedProvinceId !== null 
    ? gameState.provincesData[gameState.selectedProvinceId] 
    : null;
  const selectedProvMeta = gameState.selectedProvinceId !== null
    ? provinces.find(p => p.id === gameState.selectedProvinceId)
    : null;
  const isPlayerCity = selectedProv ? selectedProv.rulerName === gameState.rulerName : true;
  const isAutonomous = isPlayerCity && selectedProv?.isAutonomous;

  const handleTouch = (e: React.MouseEvent<HTMLButtonElement>, cmdId: number) => {
    const isDisallowedByAutonomy = isAutonomous && [3, 4, 5, 8].includes(cmdId);
    const isAllowed = (!isDisallowedByAutonomy && isPlayerCity) || cmdId === 0 || cmdId === 1 || cmdId === 9;

    if (!isAllowed) {
      if (showToast) {
        if (isDisallowedByAutonomy) {
          showToast(`【${selectedProvMeta?.name || '目標城池'}】已設為自治，太守將自動管理內政、商業、兵士與謀略。請至【7.君主】解除自治後再行下令。`);
        } else {
          showToast(`【${selectedProvMeta?.name || '目標城池'}】非我方轄區，無法下達政令！只能使用【0.狀態】、【1.查看】與【9.系統】。`);
        }
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const splashId = Math.random().toString(36).substring(2, 9);
    setSplashes(prev => [...prev, { id: splashId, cmdId, x, y }]);
    
    onCommandSelect(cmdId);

    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== splashId));
    }, 600);
  };

  return (
    <div className="w-full bg-stone-200 border-t-2 border-stone-800 p-1 sm:p-1.5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-20 font-serif">
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {COMMANDS.map((cmd) => {
          const isDisallowedByAutonomy = isAutonomous && [3, 4, 5, 8].includes(cmd.id);
          const isAllowed = (!isDisallowedByAutonomy && isPlayerCity) || cmd.id === 0 || cmd.id === 1 || cmd.id === 9;

          return (
            <button
              key={cmd.id}
              onClick={(e) => handleTouch(e, cmd.id)}
              className={`h-8.5 sm:h-9 relative overflow-hidden border rounded-sm shadow-xs flex items-center justify-center text-xs sm:text-sm font-bold transition-transform ${
                isAllowed
                  ? 'bg-stone-300 border-stone-600 text-stone-800 active:scale-95 cursor-pointer hover:bg-stone-100'
                  : 'bg-stone-200/90 border-stone-400 text-stone-400 cursor-not-allowed opacity-75'
              }`}
            >
              <span className="relative z-10 pointer-events-none flex items-center gap-0.5">
                {!isAllowed && <span className="text-[9px]">🔒</span>}
                <span>{cmd.label.split('.')[1]}</span>
              </span>
              <AnimatePresence>
                {splashes.filter(s => s.cmdId === cmd.id).map(splash => (
                  <motion.div
                    key={splash.id}
                    initial={{ scale: 0, opacity: 0.7 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute bg-stone-800 rounded-full pointer-events-none"
                    style={{
                      left: splash.x - 20,
                      top: splash.y - 20,
                      width: 40,
                      height: 40,
                      filter: 'blur(3px)'
                    }}
                  />
                ))}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-center text-[10px] text-stone-500 pb-0.5 flex justify-center items-center gap-2">
        <span>◆ 指令盤 ◆</span>
        {!isPlayerCity && (
          <span className="text-amber-800 font-bold bg-amber-100 px-1 py-0.1 rounded border border-amber-300 text-[9.5px]">
            ⚠️ 非我方轄區，僅限 0狀態/1查看/9系統
          </span>
        )}
      </div>
    </div>
  );
}

