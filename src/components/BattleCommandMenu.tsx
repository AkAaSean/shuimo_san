import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const BATTLE_COMMANDS = [
  { id: 1, label: '1.移動' },
  { id: 2, label: '2.通常' },
  { id: 3, label: '3.一齊' },
  { id: 4, label: '4.突擊' },
  { id: 5, label: '5.弓矢' },
  { id: 6, label: '6.火矢' },
  { id: 7, label: '7.亂射' },
  { id: 8, label: '8.奮迅' },
  { id: 9, label: '9.一騎' },
  { id: 10, label: '10.計略' },
  { id: 11, label: '11.佈陣' },
  { id: 12, label: '12.查看' },
  { id: 13, label: '13.快戰' },
  { id: 14, label: '14.退兵' },
  { id: 0, label: '0.待命' },
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
    <div className="w-full bg-[#f4efe4] border-t-2 border-[#3c2a1e] p-1.5 sm:p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] relative z-20 font-serif select-none">
      <div className="grid grid-cols-5 gap-1.5">
        {BATTLE_COMMANDS.map((cmd) => (
          <button
            key={cmd.id}
            onClick={(e) => handleTouch(e, cmd.id)}
            className="h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150"
          >
            {/* 水墨刷痕背景 SVG (Ink Brush Stroke) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none fill-current filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] text-stone-900 group-hover:text-black transition-colors"
              viewBox="0 0 100 38"
              preserveAspectRatio="none"
            >
              {/* 水墨主刷痕 */}
              <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
              {/* 飛白筆鋒與潑墨紋理 */}
              <path d="M 10,3 C 32,1 68,1 94,1 C 97,1 98,3 92,4 C 68,4 32,3 12,5 Z" opacity="0.85" />
              <path d="M 4,26 C 2,29 8,35 30,36 C 18,35 5,31 4,26 Z" opacity="0.75" />
              {/* 墨點濺散 */}
              <circle cx="98.5" cy="5" r="1.1" />
              <circle cx="1.5" cy="29" r="0.9" />
            </svg>

            {/* 白字標籤 */}
            <span className="relative z-10 pointer-events-none text-white font-black text-xs sm:text-sm tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {cmd.label.split('.')[1]}
            </span>

            <AnimatePresence>
              {splashes.filter(s => s.cmdId === cmd.id).map(splash => (
                <motion.div
                  key={splash.id}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 4.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute bg-amber-100 rounded-full pointer-events-none mix-blend-overlay"
                  style={{
                    left: splash.x - 20,
                    top: splash.y - 20,
                    width: 40,
                    height: 40,
                    filter: 'blur(2px)'
                  }}
                />
              ))}
            </AnimatePresence>
          </button>
        ))}
      </div>
      <div className="mt-1 text-center text-[10px] text-stone-700 font-bold tracking-wider">
        ◆ 水墨戰術指揮盤 ◆
      </div>
    </div>
  );
}
