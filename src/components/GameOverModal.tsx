import React from 'react';
import { Skull, RefreshCw, RotateCcw } from 'lucide-react';

interface GameOverModalProps {
  reason: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  onRestart
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#18110d] border-2 border-rose-800/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center animate-in fade-in zoom-in duration-300">
        
        {/* Skull Icon */}
        <div className="w-20 h-20 rounded-full bg-rose-950/80 border-2 border-rose-600/80 flex items-center justify-center mb-4 shadow-rose-900/50 shadow-2xl">
          <Skull className="w-10 h-10 text-rose-500 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-rose-200 font-serif tracking-widest mb-2">
          霸業中斷 · 勢力滅亡
        </h2>

        {/* Subtitle */}
        <div className="w-full bg-rose-950/40 border border-rose-800/40 p-4 rounded-xl mb-6 text-rose-200/90 text-sm leading-relaxed font-serif">
          {reason || '我軍主公不幸陣亡且後繼無人！天下霸業就此夢碎...'}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-stone-100 border border-rose-400/50 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新開始新局</span>
          </button>
        </div>

      </div>
    </div>
  );
};
