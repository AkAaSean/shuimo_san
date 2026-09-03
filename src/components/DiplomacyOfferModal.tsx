import React from 'react';
import { motion } from 'motion/react';
import { Handshake, ShieldAlert, Coins, Wheat, Calendar } from 'lucide-react';
import { PendingDiplomacyOffer } from '../types';

interface DiplomacyOfferModalProps {
  offer: PendingDiplomacyOffer;
  onRespond: (accepted: boolean) => void;
}

export const DiplomacyOfferModal: React.FC<DiplomacyOfferModalProps> = ({
  offer,
  onRespond
}) => {
  const isAlliance = offer.type === 'alliance';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs font-serif">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-md bg-[#f7f4ee] border-4 border-[#292524] rounded-lg shadow-2xl overflow-hidden flex flex-col text-[#1c1917]"
      >
        {/* Header */}
        <div className={`px-4 py-3 text-white flex items-center gap-3 border-b-2 border-[#1c1917] ${
          isAlliance ? 'bg-sky-950' : 'bg-amber-950'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-inner ${
            isAlliance ? 'bg-sky-900 border-sky-400 text-sky-200' : 'bg-amber-900 border-amber-400 text-amber-200'
          }`}>
            {isAlliance ? <Handshake className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-amber-100">
              {offer.title}
            </h2>
            <p className="text-xs text-stone-300">
              {offer.fromRuler} 遣使前來覲見主公
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Messenger Speech Bubble */}
          <div className="bg-white/95 border-2 border-stone-400/80 rounded-md p-3.5 shadow-inner relative">
            <div className="text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
              <span>📜 來使呈詞：</span>
              <span className="font-semibold text-stone-600">
                （【{offer.fromRuler}】之重使）
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-stone-800">
              「{offer.message}」
            </p>
          </div>

          {/* Offer Details / Conditions */}
          <div className="bg-[#f0ebe1] border border-stone-300 rounded-md p-3 space-y-2">
            <div className="text-xs font-black text-stone-800 border-b border-stone-300 pb-1 flex items-center justify-between">
              <span>條約意向與禮聘細則</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-amber-100 font-sans">
                {isAlliance ? '互保同盟' : '停戰求和'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-stone-700 bg-white/80 p-1.5 rounded border border-stone-200">
                <Calendar className="w-4 h-4 text-stone-500 shrink-0" />
                <span>立約期限：<b className="text-stone-900">{offer.durationMonths} 個月</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-700 bg-white/80 p-1.5 rounded border border-stone-200">
                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                <span>厚禮金帛：<b className="text-amber-900">+{offer.giftGold.toLocaleString()} 金</b></span>
              </div>
              {offer.giftFood > 0 && (
                <div className="flex items-center gap-1.5 text-stone-700 bg-white/80 p-1.5 rounded border border-stone-200 col-span-2">
                  <Wheat className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>附帶軍糧：<b className="text-emerald-900">+{offer.giftFood.toLocaleString()} 石</b></span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-600 leading-normal pt-1">
              {isAlliance 
                ? '※ 若同意締盟，兩國將簽署互不侵犯盟約，友好度大幅提升，並於約期內保障邊界安寧。' 
                : '※ 若同意求和，兩國即刻停戰，收下敵國賠款以充國庫，免去繼續交戰之消耗。'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-stone-200/80 px-4 py-3 border-t border-stone-300 flex items-center gap-3">
          <button
            onClick={() => onRespond(false)}
            className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-300 active:bg-stone-400 text-stone-800 text-xs sm:text-sm font-black border-2 border-stone-700 rounded shadow-[2px_2px_0_#292524] transition-all cursor-pointer"
          >
            婉言謝絕 (駁回)
          </button>
          <button
            onClick={() => onRespond(true)}
            className={`flex-1 py-2.5 px-3 text-white text-xs sm:text-sm font-black border-2 border-[#1c1917] rounded shadow-[2px_2px_0_#1c1917] transition-all cursor-pointer ${
              isAlliance 
                ? 'bg-sky-800 hover:bg-sky-700 active:bg-sky-900 shadow-sky-950' 
                : 'bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 shadow-emerald-950'
            }`}
          >
            {isAlliance ? '🤝 欣然應允 (締結同盟)' : '📜 准予求和 (收納賠款)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
