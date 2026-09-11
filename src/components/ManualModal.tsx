import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen = true, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'internal' | 'military' | 'pass' | 'strategy' | 'personnel'>('basic');

  const tabs = [
    { id: 'basic', label: '👑 基礎與目標', icon: '📜' },
    { id: 'military', label: '⚔️ 軍事與戰術', icon: '🛡️' },
    { id: 'pass', label: '🏰 關隘與要塞', icon: '🏯' },
    { id: 'internal', label: '🌾 內政與經濟', icon: '🏛️' },
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
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wider">水墨三國 • 遊戲指南與說明書</h2>
              <span className="bg-[#991b1b] text-amber-200 text-xs font-mono font-bold px-2 py-0.5 rounded border border-amber-300/40">V0.5</span>
            </div>
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
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-black border-r-2 border-[#1c1917] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
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
                {/* V0.5 版本更新亮點 */}
                <div className="bg-amber-100/90 p-3.5 border-2 border-amber-800/80 shadow-[3px_3px_0_#78350f] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-sm sm:text-base flex items-center gap-2 border-b border-amber-800/30 pb-1">
                    <span>🔥</span> V0.5 重大系統更新一覽
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs leading-relaxed">
                    <div className="bg-white/80 p-2.5 border border-amber-700/40 rounded-xs">
                      <strong className="text-amber-950 block mb-0.5">🧠 a. 戰鬥軍師系統</strong>
                      戰前指派智謀軍師！戰場中提供即時破陣建言、主動釋放全軍計策（水淹、落石、伏兵、十面埋伏、神算護體）並具備被動識破敵計光環。
                    </div>
                    <div className="bg-white/80 p-2.5 border border-amber-700/40 rounded-xs">
                      <strong className="text-amber-950 block mb-0.5">🏯 b. 戰略關隘要塞</strong>
                      實裝虎牢關、函谷關、散關、劍閣、陽平關、巫關、武關。純軍事天險要塞，免疫天災、免除太守與民政，防禦力極高，駐軍達 10 隊上限！
                    </div>
                    <div className="bg-white/80 p-2.5 border border-amber-700/40 rounded-xs">
                      <strong className="text-amber-950 block mb-0.5">🏛️ c. 內政經濟時序與民忠調整</strong>
                      修正每年「1月春季徵金稅、7月秋季秋收、10月戶籍歲計」時序；城池初始民忠依時代背景與君主特性調整為 65~85（仁德君主更高）；無人佔領空白城池民忠降至 50 以下（30~48）。
                    </div>
                    <div className="bg-white/80 p-2.5 border border-amber-700/40 rounded-xs">
                      <strong className="text-amber-950 block mb-0.5">⚔️ d. 戰爭多城池作戰體系</strong>
                      全面升級多路戰役佇列面板！當同月有多座城池或關口遭遇進犯時，玩家可逐一親臨戰場調兵遣將，或個別指派陣型交由 AI 自動決算。
                    </div>
                    <div className="bg-white/80 p-2.5 border border-amber-700/40 rounded-xs sm:col-span-2">
                      <strong className="text-amber-950 block mb-0.5">⛓️ e. 戰後俘虜進天牢與君主廢黜機制</strong>
                      戰敗被俘之敵將一律關入城池地牢，嚴禁從事任何內政、軍事或公務；若被俘者為敵國君主，將即刻廢除其君主身分，還原為原始職稱（如大將），並觸發該國繼承即位或滅亡！
                    </div>
                  </div>
                </div>

                {/* 核心目標 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>👑</span> 遊戲核心勝利與敗北條件
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                    <div className="bg-amber-50 p-3 border border-amber-800/30">
                      <span className="font-black text-amber-900 block mb-1">🚩 霸業勝出：天下一統</span>
                      率領您的勢力成功攻佔全中國所有州郡城池與戰略關隘，消除一切敵對君主，即可平定亂世，問鼎天下！
                    </div>
                    <div className="bg-red-50 p-3 border border-red-800/30">
                      <span className="font-black text-red-900 block mb-1">💀 勢力覆滅：敗北條件</span>
                      當我方最後一座城池或關塞陷落，或君主陣亡/病逝且無武將可繼承大統時，即宣告敗北，國破家亡。
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
                      <div className="text-[11px] text-stone-600 mt-0.5">軍師計策威能、計謀成功率與識破敵計</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-emerald-900">政治</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">內政商業/開墾產出與金糧收益增幅</div>
                    </div>
                    <div className="bg-stone-100 p-2 border border-stone-300">
                      <div className="font-black text-amber-900">魅力</div>
                      <div className="text-[11px] text-stone-600 mt-0.5">登用武將成功率、部屬忠誠與募兵成本折扣</div>
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

            {activeTab === 'military' && (
              <motion.div key="military" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 戰鬥軍師功能 (V0.5 全新功能) */}
                <div className="bg-purple-50/90 p-4 border-2 border-purple-900/80 shadow-[3px_3px_0_#581c87] space-y-2">
                  <h3 className="font-black text-purple-950 text-base flex items-center gap-2 border-b border-purple-800/30 pb-1.5">
                    <span>🧠</span> a. 戰鬥軍師系統 (戰場核心樞紐)
                  </h3>
                  <div className="space-y-2 text-xs text-stone-800 leading-relaxed">
                    <p>• <strong>隨軍參謀指派：</strong>戰鬥前夕可從出征或防守陣容中指派一名智謀之士擔任「戰役軍師」（如諸葛亮、周瑜、司馬懿、郭嘉、龐統）。</p>
                    <p>• <strong>軍師主動錦囊妙計：</strong>軍師具備專屬計謀庫（依智力消耗戰意值發動）：</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      <div className="bg-white/90 p-2 border border-purple-200">
                        <strong className="text-blue-900">🌊 水淹七軍 / 🪨 落石滾木：</strong>在水域或山地召喚地形災害，對範圍敵軍造成毀滅性範圍傷害與混亂。
                      </div>
                      <div className="bg-white/90 p-2 border border-purple-200">
                        <strong className="text-rose-900">⚔️ 十面埋伏 / 🔥 烈火焚城：</strong>全屏誘敵合圍或點燃草木連營，重挫敵方士氣與兵員。
                      </div>
                      <div className="bg-white/90 p-2 border border-purple-200">
                        <strong className="text-emerald-900">🛡️ 神算護體 / 🥁 鼓舞全軍：</strong>為全軍加持免傷護盾、大幅提升全隊戰意與部隊攻擊力。
                      </div>
                      <div className="bg-white/90 p-2 border border-purple-200">
                        <strong className="text-amber-900">👁️ 識破敵計光環 (被動)：</strong>智力高於敵方軍師時，大幅降低敵方計謀命中率，甚至使其自食惡果。
                      </div>
                    </div>
                  </div>
                </div>

                {/* 戰爭多城池作戰 (V0.5 全新功能) */}
                <div className="bg-red-50/90 p-4 border-2 border-red-900/80 shadow-[3px_3px_0_#991b1b] space-y-2">
                  <h3 className="font-black text-red-950 text-base flex items-center gap-2 border-b border-red-800/30 pb-1.5">
                    <span>⚔️</span> d. 戰爭多城池作戰體系
                  </h3>
                  <div className="space-y-1.5 text-xs text-stone-800 leading-relaxed">
                    <p>• <strong>多路戰役佇列管理：</strong>當月末進攻結算同時有多處郡縣、邊境或關口爆發戰火時，系統會自動匯整為【戰役待辦佇列】。</p>
                    <p>• <strong>自主指揮與 AI 委託：</strong>您可以針對主力戰場親自進入 5v5 水墨戰棋模式臨機決戰；對於次要防線或兵力懸殊之戰役，可預設好防守陣型後一鍵交付 AI 自動決算，多線戰略兩不耽誤。</p>
                  </div>
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

                {/* 徵兵與部隊訓練度 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🛡️</span> 徵兵動員與獨立部隊訓練度
                  </h3>
                  <div className="space-y-1.5 text-xs text-stone-700 leading-relaxed">
                    <p>• <strong>民力動員率 (0.25%)：</strong>每次徵兵以城池人口之 0.25% 為安全動員量，單次最高封頂 5,000 人，且嚴格受都市規模底限保護。</p>
                    <p>• <strong>獨立部隊訓練度：</strong>各武將部隊擁有獨立的訓練士氣值（0%~100%）。新兵入伍會以 35% 基礎訓練度稀釋部隊；無兵力時訓練度為 0%。指派高武力教官執行【軍隊操演】可迅速提升全軍訓練度，大幅增加戰鬥攻防威力！</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pass' && (
              <motion.div key="pass" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 戰略關隘要塞 (V0.5 全新功能) */}
                <div className="bg-stone-900 text-stone-100 p-4 border-2 border-amber-500 shadow-[3px_3px_0_#1c1917] space-y-3">
                  <h3 className="font-black text-amber-300 text-base flex items-center gap-2 border-b border-stone-700 pb-1.5">
                    <span>🏯</span> b. 七大戰略關隘要塞體系
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    地圖實裝<strong>虎牢關、函谷關、散關、劍閣、陽平關、巫關、武關</strong>七大天下雄關，構築起中原洛陽、關中長安、秦蜀漢中與長江三峽的關鍵咽喉。
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-stone-800 p-3 border border-stone-700 rounded-xs space-y-1">
                      <span className="font-black text-amber-400 block">🛡️ 一夫當關天險防護</span>
                      <div>• 具備先天 <strong>+15% 減傷天險防護</strong>與高達 90~95 的城郭堅固防禦。</div>
                      <div>• 駐軍編制擴增至 <strong>10 隊上限</strong>，是抵禦敵國大軍狂攻的鋼鐵壁壘。</div>
                    </div>
                    <div className="bg-stone-800 p-3 border border-stone-700 rounded-xs space-y-1">
                      <span className="font-black text-emerald-400 block">🌾 純軍事體制與免役</span>
                      <div>• <strong>免除太守與民政：</strong>關口無常住百姓商肆，免去農業、商業與治安開發。</div>
                      <div>• <strong>永絕天災：</strong>關隘依山而建，免疫水患、蝗災、旱災與地震。</div>
                    </div>
                  </div>
                  <div className="bg-stone-800/80 p-2.5 border border-stone-700 text-[11px] text-stone-300">
                    💡 <strong>補給調配要訣：</strong>關口不徵收賦稅與秋糧，防守戰鬥與駐軍每月消耗由關塞本身之庫存支應。請務必定期自後方富庶大郡使用【錢糧運送】向前線關卡補充金錢與軍糧！
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'internal' && (
              <motion.div key="internal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                {/* 修正後的精確時序與防災機制 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🏛️</span> c. 內政收支精確時序 (V0.5 修正)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-amber-50 border border-amber-300">
                      <div className="font-black text-amber-800">💰 1月 春季：金稅徵收</div>
                      <div className="text-stone-700 mt-1">依據商業繁榮度、人口與民心忠誠徵收金錢稅賦。</div>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300">
                      <div className="font-black text-emerald-800">🌾 7月 秋季：秋收賦稅</div>
                      <div className="text-stone-700 mt-1">依農田開墾、防災安全與人口結算軍糧；水利良好時觸發「大豐收」！</div>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-300">
                      <div className="font-black text-indigo-800">📈 10月 孟冬：戶籍歲計</div>
                      <div className="text-stone-700 mt-1">按民心、農商與治水結算，人口自然繁衍 +0.6% ～ +1.2%。</div>
                    </div>
                  </div>
                </div>

                {/* 防災初始度與防汛 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>🌊</span> 治水防災與開局平穩調控
                  </h3>
                  <div className="space-y-1.5 text-xs text-stone-700 leading-relaxed">
                    <p>• <strong>初始防災度 (40%~60%)：</strong>遊戲開局根據各郡縣之水患成長率、沿河流域地理與所屬劇本時代水利修築背景動態賦予 40%~60% 合理防災值，避免初期因防災過低而瘋狂耗金治水。</p>
                    <p>• <strong>夏季汛期預警 (4~7月)：</strong>夏季汛期大水機率倍增，當城池防災度低於 45% 時請及早指派高政治官員執行【洪水防治】築堤固壩，確保秋收無虞。</p>
                  </div>
                </div>

                {/* 市場買賣與運送 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#1c1917] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>⚖️</span> 市場米糧交易與錢糧調運
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <div className="font-black text-amber-900 mb-1">🌾 米糧市場買賣</div>
                      各地市場米價隨季節於 <strong>1:1 ~ 1:3.5</strong> 浮動。米賤時買糧備戰，米貴時糶糧換金。
                    </div>
                    <div className="p-2.5 bg-stone-50 border border-stone-300">
                      <div className="font-black text-blue-900 mb-1">🚚 錢糧調運與自治</div>
                      派遣武將向前線要塞或缺糧郡縣押送物資；亦可在【君主】中委託郡縣自治，由太守自動經略。
                    </div>
                  </div>
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
                    <span>💎</span> 名物寶物與屬性加成規則
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    搜尋尋訪或戰勝俘獲之傳世寶物（如赤兔馬、青龍偃月刀、孫子兵法等），賞賜給麾下武將可大幅提升其能力並保持 <strong>100 滿分忠誠度</strong>！
                  </p>
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div><strong>✦ 寶物加成不累積：</strong>同一項屬性（戰力、謀略、統帥、政治、魅力）若持有多件寶物，<strong>不進行累加</strong>，而是自動採用加成最高的那一件數值。</div>
                    <div><strong>✦ 傳國玉璽特殊效果：</strong>象徵受命於天、號令天下之至尊奇寶，持有人之<strong>魅力直接設為 100 滿值</strong>（不與其他魅力寶物疊加）。</div>
                  </div>
                </div>

                {/* 戰後俘虜與天牢系統 */}
                <div className="bg-white/80 p-4 border-2 border-[#1c1917] shadow-[3px_3px_0_#1c1917] space-y-2">
                  <h3 className="font-black text-[#991b1b] text-base flex items-center gap-2 border-b border-[#1c1917]/20 pb-1.5">
                    <span>⛓️</span> 戰後俘虜、地牢監禁與處置規則
                  </h3>
                  <div className="space-y-2 text-xs text-stone-800 leading-relaxed">
                    <p>• <strong>關押天牢，禁止一切公務：</strong>戰場上被生擒俘虜之敵將，將直接打入該城池地牢，<strong>嚴禁指派任何內政、軍事訓練、出征或移動</strong>，兵力收繳為 0，且每月忠誠會因身陷囹圄逐漸下降。</p>
                    <p>• <strong>君主俘虜廢黜變更：</strong>若生擒敵國君主，該俘虜之君主身分將<strong>即刻被廢黜並還原為其原本武將職稱（如大將、軍師）</strong>。敵國勢力將立即觸發重臣繼承新君；若敵國無人繼承或無城池，該國宣告覆滅！</p>
                    <p>• <strong>天牢招降登用：</strong>進入【人事】➔【登用人才】，可指派高魅力大臣對地牢俘虜進行勸降。成功登用後解除俘虜枷鎖，正式歸入我方將領陣營！</p>
                  </div>
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
          <span className="font-bold text-stone-600">水墨三國 v0.5 指南手冊</span>
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
