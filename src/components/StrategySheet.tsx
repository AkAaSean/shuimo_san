import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getBattleSkillInfo, BATTLE_SKILLS } from '../engine/skills';

interface StrategySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (strategy: string) => void;
  activeGeneralName?: string;
  skills?: string[];
  currentStamina?: number;
}

export default function StrategySheet({
  isOpen,
  onClose,
  onSelectStrategy,
  activeGeneralName = '將領',
  skills = [],
  currentStamina = 100
}: StrategySheetProps) {
  // Only display skills that this general has actually learned
  const learnedSkillInfos = skills
    .map(name => getBattleSkillInfo(name) || {
      name,
      cost: 25,
      category: '謀略計策' as const,
      desc: '戰場特殊作戰技藝',
      target: '目標敵軍' as any, condition: ''
    });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '主動戰法':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case '謀略計策':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case '天候奇術':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case '輔助回復':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case '防禦被動':
        return 'bg-blue-100 text-blue-950 border-blue-300';
      case '戰鬥被動':
        return 'bg-orange-100 text-orange-950 border-orange-300';
      case '特種被動':
        return 'bg-stone-200 text-stone-800 border-stone-400';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 z-30 backdrop-blur-xs"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-0 left-0 right-0 bg-stone-100 rounded-t-xl border-t-2 border-stone-800 z-40 shadow-2xl font-serif max-h-[75%]"
          >
            {/* Grab Handle */}
            <div className="w-full flex justify-center py-2.5 cursor-pointer" onClick={onClose}>
              <div className="w-14 h-1.5 bg-stone-400 rounded-full"></div>
            </div>
            
            <div className="px-4 pb-6">
              {/* Header */}
              <div className="mb-3 border-b-2 border-stone-300 pb-2.5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-stone-900">
                      【{activeGeneralName}】作戰技能
                    </span>
                    <span className="text-xs bg-stone-800 text-amber-300 px-2 py-0.5 rounded font-bold">
                      習得 {skills.length} / 8
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    體力：<strong className="text-emerald-700 font-black">{currentStamina}</strong> / 100
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-stone-700 text-xs font-bold border border-stone-400 px-3 py-1.5 rounded bg-stone-200 hover:bg-stone-300 active:scale-95 shadow-xs"
                >
                  返回戰陣
                </button>
              </div>
              
              {/* Skills List */}
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[48vh] pr-1">
                {learnedSkillInfos.length === 0 ? (
                  <div className="p-6 bg-stone-50 border-2 border-dashed border-stone-300 rounded text-center my-2">
                    <div className="text-2xl mb-2">📜</div>
                    <div className="text-base font-black text-stone-800 mb-1">
                      此將尚未習得任何戰場特技
                    </div>
                    <div className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
                      該武將資質平庸或尚未受名師指點，在戰場上僅能依靠部隊基本戰力與陣形進行常規交鋒。
                    </div>
                  </div>
                ) : (
                  learnedSkillInfos.map((s, idx) => {
                    const isPassive = s.cost === 0;
                    const canAfford = currentStamina >= s.cost;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isPassive) return;
                          onSelectStrategy(s.name);
                          onClose();
                        }}
                        disabled={!canAfford && !isPassive}
                        className={`w-full text-left p-3 rounded border-2 transition-all shadow-xs flex items-center justify-between
                          ${isPassive 
                            ? 'bg-stone-200/80 border-stone-400 cursor-default opacity-90' 
                            : canAfford 
                              ? 'bg-white border-stone-300 hover:border-amber-700 hover:bg-amber-50/50 active:scale-[0.99] cursor-pointer' 
                              : 'bg-stone-100 border-stone-200 opacity-60 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-base text-stone-900">
                              {s.name}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(s.category)}`}>
                              {s.category}
                            </span>
                            {s.condition && (
                              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded border border-red-200">
                                {s.condition}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-500 font-semibold">
                              目標: {s.target || '自身'}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600 leading-snug">
                            {s.desc}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isPassive ? (
                            <span className="text-xs font-black text-stone-600 bg-stone-300 px-2 py-1 rounded">
                              常駐被動
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className={`text-sm font-black ${canAfford ? 'text-amber-800' : 'text-stone-400'}`}>
                                體力 {s.cost}
                              </span>
                              <span className="text-[10px] text-stone-400 mt-0.5">
                                {canAfford ? '施放 〉' : '體力不足'}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Tip */}
              <div className="mt-3 pt-2 border-t border-stone-300 flex justify-between items-center text-[11px] text-stone-500">
                <span>◆ 僅顯示該武將已習得的專屬戰鬥特技 ◆</span>
                <span>上限 8 種</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
