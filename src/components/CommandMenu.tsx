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
    <div className="w-full bg-[#f4efe4] border-t-2 border-[#3c2a1e] p-1.5 sm:p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] relative z-20 font-serif select-none">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {COMMANDS.map((cmd) => {
          const isDisallowedByAutonomy = isAutonomous && [3, 4, 5, 8].includes(cmd.id);
          const isAllowed = (!isDisallowedByAutonomy && isPlayerCity) || cmd.id === 0 || cmd.id === 1 || cmd.id === 9;

          return (
            <button
              key={cmd.id}
              onClick={(e) => handleTouch(e, cmd.id)}
              className={`h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group transition-all duration-150 ${
                isAllowed
                  ? 'cursor-pointer hover:scale-[1.03] active:scale-95'
                  : 'cursor-not-allowed opacity-55 filter grayscale'
              }`}
            >
              {/* 水墨刷痕背景 SVG (Ink Brush Stroke) */}
              <svg
                className={`absolute inset-0 w-full h-full pointer-events-none fill-current filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] transition-colors ${
                  isAllowed ? 'text-stone-900 group-hover:text-black' : 'text-stone-700'
                }`}
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

              {/* 白字標籤與鎖定圖示 */}
              <span className="relative z-10 pointer-events-none flex items-center justify-center gap-0.5 text-white font-black text-xs sm:text-sm tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {isDisallowedByAutonomy ? (
                  <span className="text-[9px] bg-amber-600/90 text-amber-100 px-1 py-0.2 rounded font-black tracking-normal">委任</span>
                ) : !isAllowed ? (
                  <span className="text-[10px] text-amber-300">🔒</span>
                ) : null}
                <span>{cmd.label.split('.')[1]}</span>
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
          );
        })}
      </div>
      <div className="mt-1 text-center text-[10px] text-stone-700 font-bold pb-0.5 flex justify-center items-center gap-2 tracking-wider flex-wrap">
        <span>◆ 水墨指令盤 ◆</span>
        {!isPlayerCity && (
          <span className="text-amber-900 font-black bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-400 text-[9.5px] shadow-2xs">
            ⚠️ 非我方轄區，僅限 0狀態/1查看/9系統
          </span>
        )}
        {isPlayerCity && isAutonomous && (
          <span className="text-amber-950 font-black bg-amber-200/95 px-1.5 py-0.2 rounded border border-amber-500 text-[9.5px] shadow-2xs">
            🏛️ 該城已自治（太守自動施政，兵/內/商/謀已委任；可至【7.君主】收回直轄）
          </span>
        )}
      </div>
    </div>
  );
}

