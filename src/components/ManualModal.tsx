import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen = true, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'internal' | 'military' | 'strategy' | 'personnel'>('basic');

  const tabs = [
    { id: 'basic', label: '👑 基礎與目標', icon: '📜' },
    { id: 'internal', label: '🌾 內政與經濟', icon: '🏛️' },
    { id: 'military', label: '⚔️ 軍事與戰術', icon: '🛡️' },
    { id: 'strategy', label: '🤝 謀略與外交', icon: '📜' },
    { id: 'personnel', label: '💎 人事與寶物', icon: '👑' },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs font-serif">
          {/* Backdrop click */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#f2efeb] border-2 border-[#1c1917] rounded-none shadow-[8px_8px_0_#1c1917] flex flex-col overflow-hidden text-[#1c1917]"
          >
        {/* Header */}
        <div className="bg-[#1c1917] text-[#f2efeb] px-4 sm:px-6 py-3 flex justify-between items-center border-b-2 border-[#1c1917] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">📜</span>
            <h2 className="text-base sm:text-lg font-black tracking-wider">水墨三國 • 遊戲指南與說明書</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-400/40 font-black text-sm cursor-pointer active:scale-95 transition-all"
            title="關閉"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-[#1c1917] bg-[#e6e2db] overflow-x-auto shrink-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-black border-r-2 border-[#1c1917] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#f2efeb] text-[#991b1b] shadow-[inset_0_-3px_0_#991b1b]'
                  : 'text-stone-700 hover:bg-[#ded9d0] hover:text-[#1c1917]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#f2efeb]/90" style={{ scrollbarWidth: 'thin' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div key="basic" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 核心目標 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>👑</span> 遊戲核心勝利與敗北條件
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div className="bg-amber-50 p-3 border border-amber-800/30">
                      <span className="font-black text-amber-900 block mb-1">🚩 霸業勝出：天下一統</span>
                      率領您的勢力成功攻佔全中國所有 <strong className="text-red-700">20 州郡</strong>，消除一切敵對君主，即可平定亂世，問鼎天下！
                    </div>
                    <div className="bg-red-50 p-3 border border-red-800/30">
                      <span className="font-black text-red-900 block mb-1">💀 勢力覆滅：敗北條件</span>
                      當我方最後一座城池陷落，或君主戰死/病逝且無武將可繼承大統時，即宣告敗北，國破家亡。
                    </div>
                  </div>
                </div>

                {/* 武將五維屬性說明 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>📊</span> 武將五維屬性剖析
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center">
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-blue-900">統率</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">士兵防禦力、帶兵上限與戰列防護</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-red-900">武力</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">近戰物理傷害與真・無雙奧義觸發率</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-purple-900">智力</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">計謀施展成功率與敵方計謀防禦</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-emerald-900">政治</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">內政商業/開墾產出與金糧收益增幅</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-amber-900">魅力</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">登用武將成功率與部屬忠誠度維護</div>
                    </div>
                  </div>
                </div>

                {/* 季節循環與年度時序 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>📅</span> 季節收支時程表
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300">
                      <div className="font-black text-emerald-800">🌸 1月 春季：米糧發放</div>
                      <div className="text-stone-700 mt-1">發放全州郡軍糧，維護軍心與治安。</div>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-300">
                      <div className="font-black text-amber-800">🌾 7月 秋季：賦稅與秋收</div>
                      <div className="text-stone-700 mt-1">依據各城商業與農業值大幅結算金錢與米糧收入。治水得宜且農業發達之城池，有機會觸發「大豐收」獲得額外米糧與民心人口！</div>
                    </div>
                    <div className="p-2.5 bg-sky-50 border border-sky-300">
                      <div className="font-black text-sky-800">❄️ 四季變遷：自然災害</div>
                      <div className="text-stone-700 mt-1">可能隨機發生蝗災、水患或疫病，需適時發糧賑災。</div>
                    </div>
                  </div>
                </div>

                {/* 存檔與讀檔 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>💾</span> 戰局存檔與讀取機制
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    本遊戲支援<strong>瀏覽器本地存檔 (Slots 1~3)</strong> 與 <strong>.json 檔案匯出/匯入</strong>。您可在「首頁劇本選單」點擊【📂 讀取存檔】直接繼續戰局，或在遊戲內透過「系統」選單隨時儲存/下載戰局檔案。
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'internal' && (
              <motion.div key="internal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 三項基礎內政 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🌾</span> 內政開發三要素
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-stone-50 border border-stone-300 flex items-start gap-2">
                      <span className="font-black text-emerald-800 shrink-0">🌱 開墾：</span>
                      <span>提升城池農業上限，直接增加每年秋季 (7月) 的<strong>糧食產出量</strong>。</span>
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300 flex items-start gap-2">
                      <span className="font-black text-amber-800 shrink-0">💰 商業：</span>
                      <span>促進城池繁榮度，直接增加每年秋季 (7月) 的<strong>金錢稅收量</strong>。</span>
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300 flex items-start gap-2">
                      <span className="font-black text-blue-800 shrink-0">🌊 治水：</span>
                      <span>提升城池防災能力與治安，可大幅降低自然災害（蝗害、水患）造成的損失。</span>
                    </div>
                  </div>
                </div>

                {/* 市場買賣 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>⚖️</span> 市場米糧交易機制
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    各地市場米價會隨季節與局勢在 <strong className="text-amber-800">1:1 ~ 1:3.5</strong> 之間浮動。建議在米價便宜時買入儲糧，於豐收米價偏高時賣出換取黃金，充實軍費！
                  </p>
                </div>

                {/* 運送與自治 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🚚</span> 錢糧運送與郡縣自治
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <div className="font-black text-[#1c1917] mb-1">📦 錢糧調運</div>
                      派遣武將押運金帛糧草至相鄰我方城池，維持前線戰備。
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <div className="font-black text-[#1c1917] mb-1">🏛️ 郡縣自治</div>
                      至【7.君主】授權非君主所在城池自治。太守與守將每月將自動進行治水、賑民、農商修墾與兵操，並於月初呈報奏績；君主仍可調兵或隨時收回直轄。
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'military' && (
              <motion.div key="military" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 徵兵與訓練 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🛡️</span> 徵兵、訓練與兵力分配
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    新徵招之新兵會稍微拉低部隊整體士氣與熟練度。徵兵後務必進行<strong>訓練兵力</strong>，提升訓練值與熟練度可大幅增強戰鬥傷害與防禦！
                  </p>
                </div>

                {/* 5v5 戰鬥陣型 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>⚔️</span> 5v5 陣型相剋與戰術相性
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">魚鱗陣</strong>
                      正面突破型，近戰攻擊增幅高，對鋒矢陣有額外剋制。
                    </div>
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">鋒矢陣</strong>
                      衝鋒突擊型，機動力與傷害極高，但防禦稍低。
                    </div>
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">鶴翼陣</strong>
                      包圍夾擊型，包夾相鄰兩列敵軍，合圍傷害顯著。
                    </div>
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">雁行陣</strong>
                      遠程弓弩型，擅長遠距集火射擊與遠程騷擾。
                    </div>
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">長蛇陣</strong>
                      山地森林機動型，地形適應力極佳，穿透力強。
                    </div>
                    <div className="p-2 bg-stone-100 border border-stone-300">
                      <strong className="text-[#991b1b] block">方圓陣</strong>
                      堅守防禦型，大幅削減受到的物理與戰法傷害。
                    </div>
                  </div>
                </div>

                {/* 戰鬥計謀與真・無雙 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>⚡</span> 戰鬥計謀與真・無雙奧義
                  </h3>
                  <div className="space-y-1.5 text-xs text-stone-700">
                    <div>🔥 <strong>火計/混亂/誘敵/鼓舞：</strong>依高智力武將發動，成功可使敵軍暫停行動或士氣大崩潰。</div>
                    <div>⚡ <strong>真・無雙奧義：</strong>高武力猛將於士氣高昂或絕境時有機會觸發，造成毀滅性群體傷害！</div>
                  </div>
                </div>

                {/* 多路戰役佇列 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🏰</span> 多路戰役佇列與防守配置
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    若有多處城池同時遭遇敵軍攻打，系統會生成<strong>待處理戰役佇列面板</strong>。您可以親自指揮每場關鍵保衛戰，或配置防守陣型後交由 AI 決算。
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'strategy' && (
              <motion.div key="strategy" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 外交與離間 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>📜</span> 外交與謀略手腕
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <strong className="text-amber-800 block mb-1">🤝 進貢金糧 (改善關係)</strong>
                      向周邊強大君主贈送金錢與米糧，提升友好度，降低被發動侵略的風險。
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <strong className="text-purple-800 block mb-1">🕵️ 離間君臣 (瓦解敵陣)</strong>
                      派智力型軍師離間敵國忠誠度偏低的武將，降低其忠誠，為後續挖角登用創造機會！
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <strong className="text-red-800 block mb-1">⚔️ 挖角他國人才</strong>
                      若敵將忠誠降至臨界值，可直接跨國登用，削弱敵軍實力的同時壯大我方陣容。
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'personnel' && (
              <motion.div key="personnel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 寶物系統 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>💎</span> 名物寶物與賞賜加成
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    搜尋尋訪或戰勝俘獲之傳世寶物（如赤兔馬、青龍偃月刀、孫子兵法等），賞賜給麾下武將可永久提升其五維屬性與 <strong>100 滿分忠誠度</strong>！
                  </p>
                </div>

                {/* 人才尋訪與繼承 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>👑</span> 尋訪登用與君主繼承
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <strong className="text-[#1c1917] block mb-1">🔍 尋訪在野人才</strong>
                      派魅力型武將在城池周邊巡視尋訪，有機率發現隱居的神將與傳承寶物。
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <strong className="text-[#1c1917] block mb-1">👑 繼承大統</strong>
                      若君主不幸陣亡或壽終，眾臣將推舉麾下最具威望與能力的武將登基為新君，繼續完成霸業。
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-[#e6e2db] px-4 sm:px-6 py-3 border-t-2 border-[#1c1917] flex justify-between items-center text-xs shrink-0">
          <span className="font-bold text-stone-600">水墨三國 v0.4 指南手冊</span>
          <button 
            onClick={onClose}
            className="bg-[#991b1b] hover:bg-red-800 text-amber-100 font-black px-5 py-1.5 border-2 border-[#1c1917] shadow-[2px_2px_0_#1c1917] cursor-pointer active:scale-95 transition-all"
          >
            理解並返回
          </button>
        </div>
      </motion.div>
    </div>
    )}
    </AnimatePresence>
  );
}
