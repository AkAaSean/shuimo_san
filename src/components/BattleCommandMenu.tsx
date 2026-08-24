import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const BATTLE_COMMANDS = [
  { id: 1, label: '1.移動' },
  { id: 2, label: '2.對戰' },
  { id: 3, label: '3.快戰' },
  { id: 4, label: '4.死戰' },
  { id: 5, label: '5.弓箭' },
  { id: 6, label: '6.策略' },
  { id: 7, label: '7.查看' },
  { id: 8, label: '8.退兵' },
  { id: 0, label: '0.休息' },
];

interface BattleCommandMenuProps {
  onCommandSelect: (id: number) => void;
}

export default function BattleCommandMenu({ onCommandSelect }: BattleCommandMenuProps) {
  const [splashes, setSplashes] = useState<{ id: string; cmdId: number; x: number; y: number }[]>([]);

  const handleTouch = (e: React.MouseEvent<HTMLButtonElement>, cmdId: number) => {
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
        {BATTLE_COMMANDS.map((cmd) => (
          <button
            key={cmd.id}
            onClick={(e) => handleTouch(e, cmd.id)}
            className="h-10 relative overflow-hidden bg-stone-300 border border-stone-600 rounded-sm shadow-sm flex items-center justify-center text-sm font-bold text-stone-800 active:scale-95 transition-transform"
          >
            <span className="relative z-10 pointer-events-none">{cmd.label.split('.')[1]}</span>
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
        ))}
      </div>
      <div className="mt-1 text-center text-xs text-stone-500">
        ◆ 戰術盤 ◆
      </div>
    </div>
  );
}
