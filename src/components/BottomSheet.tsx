import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COMMANDS } from './CommandMenu';
import { GameState } from '../types';

interface BottomSheetProps {
  activeMenu: number | null;
  gameState?: GameState;
  onClose: () => void;
  onActionSelect?: (action: string) => void;
}

const SUB_COMMANDS: Record<number, string[]> = {
  0: ['查看本郡狀態', '檢視將領'],
  1: ['選擇州郡', '將軍列表', '領土列表', '郡地理誌', '君主物品'],
  2: ['武將調動', '發動戰役', '運送錢糧'],
  3: ['訓練兵士', '徵兵', '購買武器', '調整兵力'],
  4: ['土地開發 (100金)', '洪水防治 (100金)', '建築關寨'],
  5: ['買入米糧', '賣出米糧', '開倉賑民'],
  6: ['尋訪人才', '登用人才', '賞賜金帛'],
  7: ['指定軍師', '指定太守', '郡縣自治', '賞賜物品', '登用他國人才'],
  8: ['流言煽動', '驅虎吞狼', '離間君臣', '勸降逼降'],
  9: ['存檔', '讀檔', '重新開始', '音效音樂'],
};

export default function BottomSheet({ activeMenu, gameState, onClose, onActionSelect }: BottomSheetProps) {
  const isOpen = activeMenu !== null;

  const selectedProv = gameState && gameState.selectedProvinceId !== null 
    ? gameState.provincesData[gameState.selectedProvinceId] 
    : null;
  const isPlayerCity = gameState && selectedProv ? selectedProv.rulerName === gameState.rulerName : true;

  useEffect(() => {
    if (isOpen && !isPlayerCity && activeMenu !== 0 && activeMenu !== 9) {
      onClose();
    }
  }, [isOpen, isPlayerCity, activeMenu, onClose]);

  const menuTitle = activeMenu !== null ? COMMANDS.find(c => c.id === activeMenu)?.label : '';
  const subCommands = activeMenu !== null ? SUB_COMMANDS[activeMenu] || [] : [];

  return (
    <AnimatePresence>
      {isOpen && (isPlayerCity || activeMenu === 0 || activeMenu === 9) && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 z-30 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-stone-200 rounded-t-xl border-t-2 border-stone-800 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.2)] font-serif"
            style={{ maxHeight: '60%' }}
          >
            {/* Handle */}
            <div className="w-full flex justify-center py-3" onClick={onClose}>
              <div className="w-16 h-1.5 bg-stone-400 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-8">
              <h2 className="text-xl font-bold text-stone-900 mb-4 border-b border-stone-400 pb-2 flex justify-between items-center">
                <span>{menuTitle}</span>
                <button onClick={onClose} className="text-stone-500 text-sm border border-stone-400 px-2 py-1 rounded bg-stone-300 active:bg-stone-400">
                  返回
                </button>
              </h2>
              
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[40vh]">
                {subCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onActionSelect) onActionSelect(cmd);
                      else onClose();
                    }}
                    className="w-full text-left px-4 py-4 bg-stone-100 border-l-4 border-stone-800 shadow-sm active:bg-stone-300 transition-colors text-stone-800 font-bold text-lg flex items-center justify-between cursor-pointer"
                  >
                    <span>{cmd}</span>
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

