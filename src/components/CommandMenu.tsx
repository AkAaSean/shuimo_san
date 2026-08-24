import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from '../types';

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
  const isPlayerCity = selectedProv ? selectedProv.rulerName === gameState.rulerName : true;

  const handleTouch = (e: React.MouseEvent<HTMLButtonElement>, cmdId: number) => {
    const isAllowed = isPlayerCity || cmdId === 0 || cmdId === 9;

    if (!isAllowed) {
      if (showToast) {
        showToast(`【${selectedProv?.name || '目標城池'}】非我方轄區，無法下達政令！只能查看【0.狀態】與進行【9.系統】操作。`);
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
    <div className="w-full bg-stone-200 border-t-2 border-stone-800 p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-20 font-serif">
      <div className="grid grid-cols-5 gap-2">
        {COMMANDS.map((cmd) => {
          const isAllowed = isPlayerCity || cmd.id === 0 || cmd.id === 9;

          return (
            <button
              key={cmd.id}
              onClick={(e) => handleTouch(e, cmd.id)}
              className={`h-12 relative overflow-hidden border rounded-sm shadow-sm flex items-center justify-center text-sm font-bold transition-transform ${
                isAllowed
                  ? 'bg-stone-300 border-stone-600 text-stone-800 active:scale-95 cursor-pointer'
                  : 'bg-stone-200/90 border-stone-400 text-stone-400 cursor-not-allowed opacity-75'
              }`}
            >
              <span className="relative z-10 pointer-events-none flex items-center gap-0.5">
                {!isAllowed && <span className="text-[10px]">🔒</span>}
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
      <div className="mt-2 text-center text-xs text-stone-500 pb-1 flex justify-center items-center gap-2">
        <span>◆ 指令盤 ◆</span>
        {!isPlayerCity && (
          <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 text-[10px]">
            ⚠️ 非我方轄區，僅限0狀態/9系統
          </span>
        )}
      </div>
    </div>
  );
}

