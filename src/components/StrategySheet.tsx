import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StrategySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy: (strategy: string) => void;
}

const STRATEGIES = [
  { name: '火攻', cost: '600金', desc: '限刮風天，點擊目標施放紅黑烈焰' },
  { name: '水渰', cost: '500金', desc: '限下雨天，水邊或淺水區施放' },
  { name: '陷阱', cost: '100金', desc: '中計者9天無法行動' },
  { name: '誘敵', cost: '400金', desc: '降低目標攻擊力' },
  { name: '燒糧', cost: '300金', desc: '減少敵方金錢與米糧' },
  { name: '圍攻', cost: '200金', desc: '需相鄰己方部隊聯動合擊' },
];

export default function StrategySheet({ isOpen, onClose, onSelectStrategy }: StrategySheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/50 z-30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-stone-200 rounded-t-xl border-t-2 border-stone-800 z-40 shadow-2xl font-serif"
            style={{ maxHeight: '70%' }}
          >
            <div className="w-full flex justify-center py-3" onClick={onClose}>
              <div className="w-16 h-1.5 bg-stone-400 rounded-full"></div>
            </div>
            
            <div className="px-4 pb-6">
              <h2 className="text-lg font-bold text-stone-900 mb-3 border-b border-stone-400 pb-2 flex justify-between items-center">
                <span>選擇計謀</span>
                <button onClick={onClose} className="text-stone-500 text-sm border border-stone-400 px-2 py-1 rounded bg-stone-300 active:bg-stone-400">
                  返回
                </button>
              </h2>
              
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
                {STRATEGIES.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectStrategy(s.name);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 bg-stone-100 border-l-4 border-stone-800 shadow-sm active:bg-stone-300 transition-colors text-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-lg">{s.name} <span className="text-sm font-normal text-amber-700 ml-2">({s.cost})</span></div>
                      <div className="text-xs text-stone-500">{s.desc}</div>
                    </div>
                    <span className="text-stone-400">〉</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
