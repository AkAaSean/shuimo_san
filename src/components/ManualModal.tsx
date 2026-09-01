import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualModal({ isOpen, onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'commands' | 'strategy' | 'battle' | 'tips' | 'combat'>('intro');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-stone-950/75 backdrop-blur-xs select-none">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#fbf8f0] border-4 border-[#3c2a1e] w-full max-w-3xl max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm flex flex-col font-serif text-[#29221b] overflow-hidden relative"
        >
          {/* Header Banner with Classical Style */}
          <div className="shrink-0 bg-[#8b261d] text-[#fef9c3] px-3.5 py-2.5 sm:px-4 sm:py-3 border-b-2 border-[#3c2a1e] flex items-center justify-between shadow-inner z-10">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">📜</span>
              <div>
                <h2 className="text-sm sm:text-lg font-black tracking-widest leading-none drop-shadow">
                  水墨三國說明書
                </h2>
                <span className="text-[10px] sm:text-xs text-amber-200 opacity-90 tracking-wider">
                  新手入門指南與軍略戰策手冊 v0.3
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5c160f] hover:bg-[#3d0d08] text-amber-100 flex items-center justify-center font-bold border border-amber-300/40 active:scale-95 transition-all cursor-pointer text-xs sm:text-sm"
              title="關閉手冊"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs (Fixed shrink-0 & touch horizontal scroll) */}
          <div className="shrink-0 flex border-b-2 border-[#3c2a1e] bg-[#eae2d0] text-xs font-bold divide-x divide-[#c8b99d] overflow-x-auto scrollbar-thin z-10 shadow-xs">
            <button
              onClick={() => setActiveTab('intro')}
              className={`flex-1 min-w-[78px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'intro'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              一、目標與勝利
            </button>
            <button
              onClick={() => setActiveTab('commands')}
              className={`flex-1 min-w-[96px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'commands'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              二、指令盤全功能
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex-1 min-w-[86px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'strategy'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              三、內政與經營
            </button>
            <button
              onClick={() => setActiveTab('battle')}
              className={`flex-1 min-w-[86px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'battle'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              四、戰場與陣形
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex-1 min-w-[86px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'tips'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              五、新手五大訣
            </button>
            <button
              onClick={() => setActiveTab('combat')}
              className={`flex-1 min-w-[86px] py-2 sm:py-2.5 text-center transition-colors cursor-pointer whitespace-nowrap px-2 ${
                activeTab === 'combat'
                  ? 'bg-[#fbf8f0] text-[#8b261d] font-black border-b-2 border-[#8b261d] shadow-2xs'
                  : 'text-[#5d4a36] hover:bg-[#dfd5c0]'
              }`}
            >
              六、戰鬥與技能
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-[#3a2f24]">
            {activeTab === 'intro' && (
              <div className="space-y-3">
                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1 flex items-center gap-1.5">
                    <span>👑</span> 遊戲核心目標
                  </h3>
                  <p>
                    本遊戲是一款結合<strong>大局戰略經營</strong>與<strong>水墨工筆六角格（Hex）戰棋</strong>的三國策略遊戲。玩家扮演一方諸侯，透過經營郡縣、搜羅英雄名將、排兵佈陣，逐步平定割據勢力。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded">
                    <div className="font-bold text-emerald-900 flex items-center gap-1 mb-1">
                      <span>🏆</span> 天下歸一（勝利條件）
                    </div>
                    <div className="text-emerald-950 text-xs">
                      攻克全國 <strong>43 個郡縣</strong>，消滅所有敵對君主勢力，匡正社稷，統一天下。
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-300 p-3 rounded">
                    <div className="font-bold text-rose-900 flex items-center gap-1 mb-1">
                      <span>💀</span> 勢力覆滅（失敗條件）
                    </div>
                    <div className="text-rose-950 text-xs">
                      君主所在城池被敵軍攻陷且無任何退路，或君主不幸陣亡/遭斬首。
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#d8cbbb] pt-2 text-xs text-[#6e5a44]">
                  💡 <strong>小提示</strong>：每個月點擊右上角<strong>「休息」</strong>按鈕即推進時間至下個月；若已有排定出征計畫，點擊休息時將立即率全軍發動大戰！
                </div>
              </div>
            )}

            {activeTab === 'commands' && (
              <div className="space-y-3">
                <div className="bg-[#8b261d] text-[#fef9c3] p-2.5 rounded text-xs font-bold flex items-center justify-between shadow">
                  <span>🎯 底部【水墨指令盤】功能完全對照說明（0 ~ 9 按鈕）</span>
                  <span className="text-[10px] text-amber-200">※ 非我方城池僅可用 0, 1, 9</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* 0. 狀態 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">0</span> 狀態
                    </div>
                    <p className="text-[#4a3b2c]">
                      查看當前點選城池的總金錢、總糧草、人口數量、可動員兵力、農業度、商業度、治水度、民心忠誠度，以及該城所駐紮之全部守將名冊。
                    </p>
                  </div>

                  {/* 1. 查看 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">1</span> 查看
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>選擇州郡</strong>：快速定位與切換檢視全國各大州郡。</li>
                      <li>• <strong>將軍列表</strong>：瀏覽麾下全部武將之五維屬性、兵種與忠誠。</li>
                      <li>• <strong>領土列表</strong>：查看我方掌控所有郡縣之產能與防務。</li>
                      <li>• <strong>郡地理誌</strong>：查閱當前城池歷史沿革與鄰郡交通連線。</li>
                      <li>• <strong>君主物品</strong>：檢視君主寶庫珍藏之名刀、寶馬與兵書。</li>
                    </ul>
                  </div>

                  {/* 2. 軍事 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">2</span> 軍事
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>武將調動</strong>：將本郡武將沿連通郡道移防至我方相連郡縣。</li>
                      <li>• <strong>發動戰役</strong>：率領精兵討伐鄰近敵城（於月結休息時起兵）。</li>
                      <li>• <strong>運送錢糧</strong>：向周邊鄰郡輸送軍餉金錢或軍糧糧草。</li>
                    </ul>
                  </div>

                  {/* 3. 兵士 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">3</span> 兵士
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>徵兵</strong>：花費金錢募集新兵，擴充可動員兵力（微降民忠）。</li>
                      <li>• <strong>訓練兵士</strong>：派遣高統帥武將操演部隊，提升戰鬥殺傷力。</li>
                      <li>• <strong>編制兵力</strong>：調整城內各將領帶兵數與兵種（步/騎/弓/槍）。</li>
                    </ul>
                  </div>

                  {/* 4. 內政 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">4</span> 內政
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>土地開發 (100金)</strong>：開墾農田提升農業（影響 7 月秋收糧草）。</li>
                      <li>• <strong>商業開發 (100金)</strong>：繁榮商埠提升商業（影響 1 月春收金稅）。</li>
                      <li>• <strong>洪水防治 (100金)</strong>：興修水利與防禦堤防，預防夏季水患。</li>
                    </ul>
                  </div>

                  {/* 5. 商業 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">5</span> 商業
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>買入米糧</strong>：向商賈以金錢採購軍糧。</li>
                      <li>• <strong>賣出米糧</strong>：出售庫存餘糧以換取金錢。</li>
                      <li>• <strong>開倉賑民</strong>：發放軍糧救濟百姓，快速提升民眾忠誠度。</li>
                    </ul>
                  </div>

                  {/* 6. 人事 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">6</span> 人事
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>尋訪人才</strong>：派遣高魅力武將在城中搜尋在野名將或金帛。</li>
                      <li>• <strong>登用人才</strong>：招募本郡已發現的在野賢士或俘虜。</li>
                      <li>• <strong>賞賜金帛</strong>：發放 100 金犒賞部將，提升忠誠度防範策反。</li>
                    </ul>
                  </div>

                  {/* 7. 君主 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">7</span> 君主
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>指定軍師/太守</strong>：任命智囊軍師或城池守將。</li>
                      <li>• <strong>郡縣自治</strong>：授權太守委任 AI 自動管理該城內政防務。</li>
                      <li>• <strong>賞賜物品</strong>：賜予部下寶刀、名馬，大幅增強屬性與忠誠。</li>
                      <li>• <strong>登用他國人才 / 同盟 / 進貢</strong>：展開外交與跨國策反。</li>
                    </ul>
                  </div>

                  {/* 8. 謀略 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">8</span> 謀略
                    </div>
                    <ul className="space-y-1 text-[#4a3b2c]">
                      <li>• <strong>流言煽動</strong>：散播流言打擊敵城治安與民忠。</li>
                      <li>• <strong>驅虎吞狼</strong>：密函挑撥敵太守起兵造反自立。</li>
                      <li>• <strong>離間君臣</strong>：降低敵將忠誠度以利後續登用。</li>
                      <li>• <strong>勸降逼降</strong>：發送檄文逼迫弱小敵國舉國投降。</li>
                    </ul>
                  </div>

                  {/* 9. 系統 */}
                  <div className="bg-white/90 p-3 rounded border border-[#d6c7ac] shadow-2xs">
                    <div className="font-black text-[#8b261d] text-sm mb-1 flex items-center gap-1">
                      <span className="bg-[#8b261d] text-white px-1.5 py-0.5 rounded text-[11px]">9</span> 系統
                    </div>
                    <p className="text-[#4a3b2c]">
                      存檔保存、讀取進度、重置遊戲、開啟/關閉音樂音效，以及查閱本說明書手冊。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="space-y-3">
                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>🌾</span> 1. 內政與經濟循環
                  </h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>農業與治水</strong>：農業影響每年 <strong>7 月</strong> 糧草大豐收。防洪數值過低時，夏季易遭遇洪水毀田損城。</li>
                    <li><strong>商業與金錢</strong>：商業影響每年 <strong>1 月</strong> 稅金收益，金錢用於徵兵、發放俸祿與重金賞賜。</li>
                    <li><strong>民忠</strong>：民忠過低容易誘發叛亂或兵卒逃亡，可藉由「開倉賑民」發放糧餉快速安撫民心。</li>
                  </ul>
                </div>

                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>👥</span> 2. 人才招募與賞賜
                  </h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>尋訪人才</strong>：派遣高魅力武將在城中巡訪，有機率發掘在野傳奇名將、隱士或拾得金帛。</li>
                    <li><strong>賞賜寶物/金錢</strong>：忠誠度低於 85 的部將容易被敵方離間策反，務必及時賞賜以穩固軍心。</li>
                  </ul>
                </div>

                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>🗺️</span> 3. 郡道連線與行軍調度
                  </h3>
                  <p>
                    大軍調度與征伐必須沿著<strong>郡縣連線道路</strong>行進（例如：漢中 ↔ 梓潼 ↔ 成都）。無法跨越未連通之深山老林進行調兵。
                  </p>
                </div>

                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>🌪️</span> 4. 季節天災與民心暴動
                  </h3>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li><strong>洪水與防災</strong>：夏季（尤其雨季）容易爆發洪水，若城池「治水」度偏低，將導致農業大幅倒退與士兵流失。平時請務必執行「洪水防治」。</li>
                    <li><strong>蝗災與瘟疫</strong>：偶發性毀滅災害。蝗災會迅速吞噬當前城池的糧草；瘟疫則會導致人口、兵力銳減，武將也可能染病扣除體力。</li>
                    <li><strong>流民與暴動</strong>：若民心過低（低於 50），極易引發民眾暴動，嚴重破壞農業與商業度。請善用「開倉賑民」來維持領地穩定。</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'battle' && (
              <div className="space-y-3">
                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>🏰</span> 1. 地形天險機制（一夫當關）
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 p-2 border border-stone-300 rounded">
                      <strong className="text-amber-900">【關塞 (Pass)】</strong>：兩側崇山萬仞夾峙，前後為行軍平原。扼守關塞可獲得極高防禦抗性與減傷。
                    </div>
                    <div className="bg-white/80 p-2 border border-stone-300 rounded">
                      <strong className="text-blue-900">【城池 (City)】</strong>：提供巨大城防庇護與補給，居城死守可有效拖垮攻城大軍。
                    </div>
                    <div className="bg-white/80 p-2 border border-stone-300 rounded">
                      <strong className="text-emerald-900">【山嶽 / 丘陵】</strong>：騎兵行動力受限，高地上的遠程弓兵享有射程與傷害優勢。
                    </div>
                    <div className="bg-white/80 p-2 border border-stone-300 rounded">
                      <strong className="text-cyan-900">【河流 / 涉水】</strong>：陸軍涉深水/淺水時防禦大幅下降，易成弓兵活靶。
                    </div>
                  </div>
                </div>

                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>⚡</span> 2. 陣形剋制與兵種協同
                  </h3>
                  <p className="mb-1 text-xs">
                    <strong>鋒矢陣</strong>（突擊衝鋒）、<strong>鶴翼陣</strong>（包夾合圍與弓箭強化）、<strong>方圓陣</strong>（全方位防禦）、<strong>魚麗陣</strong>（步兵推進）。根據敵方兵種適時切換陣形！
                  </p>
                </div>

                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>🔥</span> 3. 神機妙算與計策
                  </h3>
                  <p className="text-xs">
                    <strong>火計</strong>（順風燃燒草木密林）、<strong>落石</strong>（居高臨下重創）、<strong>混亂/偽報</strong>（控場癱瘓敵軍行動）。智力高的軍師在戰場上往往能以少勝多！
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="space-y-2.5">
                <div className="border-l-4 border-amber-600 bg-amber-50/80 p-2.5 rounded-r">
                  <strong className="text-amber-900">1. 開局厚積薄發：</strong>
                  前期先將首都的「商業」與「農業」拉高，切勿在錢糧不足時窮兵黷武。
                </div>
                <div className="border-l-4 border-emerald-600 bg-emerald-50/80 p-2.5 rounded-r">
                  <strong className="text-emerald-900">2. 鎖定地利關塞：</strong>
                  在如潼關、散關、劍閣、陽平關等咽喉隘口部署精兵，只需一兩員大將即可抵禦數萬之敵。
                </div>
                <div className="border-l-4 border-blue-600 bg-blue-50/80 p-2.5 rounded-r">
                  <strong className="text-blue-900">3. 重用智謀軍師：</strong>
                  智力 90 以上的軍師（如諸葛亮、司馬懿、郭嘉、周瑜）施展計謀成功率極高，還具備「反計」或「沉著」特技。
                </div>
                <div className="border-l-4 border-purple-600 bg-purple-50/80 p-2.5 rounded-r">
                  <strong className="text-purple-900">4. 嚴防陣前倒戈：</strong>
                  將領出征前務必檢查忠誠度，忠誠低於 80 容易在戰場上被敵方勸降或倒戈投敵。
                </div>
                <div className="border-l-4 border-red-600 bg-red-50/80 p-2.5 rounded-r">
                  <strong className="text-red-900">5. 善用多路出征：</strong>
                  本遊戲支援「排定多個戰役出征計畫」，在當月結束（休息）時依序發動多線合擊，迅速瓦解敵國！
                </div>
              </div>
            )}

            {activeTab === 'combat' && (
              <div className="space-y-3">
                <div className="bg-[#f0e8d6] p-3 rounded border border-[#d6c7ac]">
                  <h3 className="font-black text-sm text-[#8b261d] mb-1.5 flex items-center gap-1.5">
                    <span>⚔️</span> 5v5 戰鬥系統與傷害機制
                  </h3>
                  <p className="mb-2">
                    本作採用全新的 <strong>5v5 回合制對戰</strong>系統。雙方各派出最多 5 名將領同時上陣，結合武將屬性、戰法搭配與體力管控，進行高強度的戰術博弈。
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li><strong>5v5 團戰機制</strong>：雙方一字排開展開廝殺。每回合武將可選擇「普通攻擊」或消耗體力發動專屬「戰法」。部隊的行動順序（出手先後）由武將的<strong>「統率」與「陣形速度加成」</strong>共同決定。</li>
                    <li><strong>武力與物理傷害</strong>：普通攻擊基礎傷害公式為 <code>攻方武力 × 4.0 - 守方統帥 × 1.5</code>。「特殊攻擊」戰法（如連突、奮戰）的傷害皆以普攻為基準進行倍率放大。</li>
                    <li><strong>地形與計謀加成</strong>：軍師發動「計謀」時，智力影響成功率與基礎傷害。特殊地形能大幅強化特定計謀，例如<strong>火計/業火</strong>在平地有 <code>+15%</code> 傷害加成，在密林中更高達 <code>+35%</code>；而<strong>水攻</strong>與<strong>落石</strong>則分別在水上與山嶽享有極大加成。</li>
                    <li><strong>戰法附加效果與控場</strong>：各項戰法皆附帶獨特戰術價值。如「鐵壁衝撞」能造成物理傷害、扣除敵方 25 點體力，並有 50% 機率使目標陷入【混亂】；純控場技「疑兵」則沒有傷害，但能必定（100%）使目標【混亂】並扣除士氣。</li>
                    <li><strong>全才與名將專屬天賦</strong>：歷史名將（單項屬性 ≥ 90）與文武全才（武力、智力皆 ≥ 75）擁有最高 8 個戰法欄位，且全才武將能同時精通高等計謀與強力物理戰法。一般武將則依據其定位最多掌握 6 種戰法。</li>
                    <li><strong>AI 智能對手</strong>：敵方 AI 具備完整的 5v5 團戰戰略邏輯，懂得依據場上局勢施展全體計謀（如業火、水龍）、尋找殘血友軍施放治傷/解策，並受限於公平的體力（Stamina）消耗系統。</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 bg-[#eae2d0] px-4 py-2.5 border-t border-[#c8b99d] flex items-center justify-between z-10">
            <span className="text-[11px] text-[#6b5843]">
              ※ 隨時可點擊頂部工作列「📖 說明書」重新查閱。
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#8b261d] hover:bg-[#6b1c15] text-[#fef9c3] font-bold rounded-sm border border-[#3c2a1e] text-xs shadow cursor-pointer active:scale-95 transition-all"
            >
              我知道了
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
