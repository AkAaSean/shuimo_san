import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from '../types';
import { bgmManager } from '../utils/bgmManager';

interface SaveSlotMeta {
  slotId: number;
  timestamp: string;
  rulerName: string;
  scenario: number;
  year: number;
  month: number;
  season: string;
}

interface SystemModalProps {
  isOpen: boolean;
  mode: '存檔' | '讀檔' | '重新開始' | '音效音樂';
  gameState: GameState;
  onClose: () => void;
  onLoadGameState: (state: GameState) => void;
  onReturnToTitle: () => void;
  onResetCurrentGame: () => void;
  showToast: (msg: string) => void;
}

export default function SystemModal({
  isOpen,
  mode: initialMode,
  gameState,
  onClose,
  onLoadGameState,
  onReturnToTitle,
  onResetCurrentGame,
  showToast
}: SystemModalProps) {
  const [activeTab, setActiveTab] = useState<'存檔' | '讀檔' | '重新開始' | '音效音樂'>(initialMode);
  const [slotsMeta, setSlotsMeta] = useState<Record<number, SaveSlotMeta | null>>({});
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() => {
    return localStorage.getItem('san_audio_bgm') !== 'false';
  });
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    return localStorage.getItem('san_audio_sfx') !== 'false';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode, isOpen]);

  // Load slot metadata from localStorage
  const loadSlotsMeta = () => {
    const metas: Record<number, SaveSlotMeta | null> = {};
    [1, 2, 3].forEach(slotId => {
      const metaStr = localStorage.getItem(`san_save_slot_${slotId}_meta`);
      if (metaStr) {
        try {
          metas[slotId] = JSON.parse(metaStr);
        } catch {
          metas[slotId] = null;
        }
      } else {
        metas[slotId] = null;
      }
    });
    setSlotsMeta(metas);
  };

  useEffect(() => {
    if (isOpen) {
      loadSlotsMeta();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Perform Save to Slot
  const handleSaveToSlot = (slotId: number) => {
    try {
      const now = new Date();
      const timeStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const meta: SaveSlotMeta = {
        slotId,
        timestamp: timeStr,
        rulerName: gameState.rulerName,
        scenario: gameState.currentScenario,
        year: gameState.year,
        month: gameState.month,
        season: gameState.season,
      };

      localStorage.setItem(`san_save_slot_${slotId}`, JSON.stringify(gameState));
      localStorage.setItem(`san_save_slot_${slotId}_meta`, JSON.stringify(meta));

      loadSlotsMeta();
      showToast(`已成功存檔至【欄位 ${slotId}】！`);
    } catch (e) {
      console.error(e);
      showToast('存檔失敗！可能是容量不足。');
    }
  };

  // Perform Load from Slot
  const handleLoadFromSlot = (slotId: number) => {
    const dataStr = localStorage.getItem(`san_save_slot_${slotId}`);
    if (!dataStr) {
      showToast('該欄位尚無存檔資料！');
      return;
    }

    try {
      const parsed = JSON.parse(dataStr) as GameState;
      if (parsed && parsed.provincesData && parsed.generalsData) {
        onLoadGameState(parsed);
        showToast(`已成功讀取【欄位 ${slotId}】存檔！`);
        onClose();
      } else {
        showToast('存檔資料損毀，無法載入。');
      }
    } catch (e) {
      console.error(e);
      showToast('讀檔發生錯誤！');
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(gameState, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `San_Save_${gameState.rulerName}_${gameState.year}年${gameState.month}月.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('已成功下載 JSON 存檔檔案！');
    } catch (e) {
      console.error(e);
      showToast('匯出失敗！');
    }
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as GameState;
        if (parsed && parsed.provincesData && parsed.generalsData) {
          onLoadGameState(parsed);
          showToast('已成功讀取上傳的 JSON 存檔！');
          onClose();
        } else {
          showToast('上傳的檔案非有效的遊戲存檔！');
        }
      } catch {
        showToast('讀取 JSON 檔案失敗！');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Toggle audio
  const toggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    bgmManager.setMuted(!next);
    showToast(next ? '背景音樂已開啟' : '背景音樂已關閉');
  };

  const toggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    localStorage.setItem('san_audio_sfx', next ? 'true' : 'false');
    showToast(next ? '音效已開啟' : '音效已關閉');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-serif">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-md bg-stone-100 border-2 border-stone-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="bg-stone-800 text-amber-100 px-4 py-3 flex justify-between items-center border-b border-stone-700">
            <h2 className="text-xl font-bold tracking-wider flex items-center gap-2">
              <span>⚙️</span> 系統控制台 <span className="text-xs font-mono font-bold bg-amber-800 text-amber-100 px-2 py-0.5 rounded border border-amber-600 shadow-xs">V0.1</span>
            </h2>
            <button
              onClick={onClose}
              className="text-stone-300 hover:text-white bg-stone-700 hover:bg-stone-600 px-2.5 py-1 rounded text-sm transition-colors cursor-pointer"
            >
              ✕ 關閉
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-stone-300 border-b border-stone-400">
            {(['存檔', '讀檔', '重新開始', '音效音樂'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-center font-bold text-sm transition-colors cursor-pointer border-r last:border-r-0 border-stone-400 ${
                  activeTab === tab
                    ? 'bg-stone-100 text-amber-900 border-b-2 border-amber-800 shadow-inner'
                    : 'text-stone-700 hover:bg-stone-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
            {/* TAB: 存檔 */}
            {activeTab === '存檔' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-stone-600 bg-stone-200 p-2.5 rounded border border-stone-300 leading-relaxed">
                  💡 存檔會保存在您的瀏覽器本地空間 (`localStorage`)。您也可以下載 `.json` 檔案跨裝置備份。
                </p>

                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(slotId => {
                    const meta = slotsMeta[slotId];
                    return (
                      <div
                        key={slotId}
                        className="bg-stone-50 border border-stone-300 rounded p-3 flex items-center justify-between shadow-sm hover:border-amber-700 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-stone-800 text-sm flex items-center gap-2">
                            <span className="bg-amber-800 text-amber-50 px-2 py-0.5 rounded text-xs">
                              欄位 {slotId}
                            </span>
                            {meta ? `【${meta.rulerName}】${meta.year}年${meta.month}月${meta.season}` : '空白欄位'}
                          </div>
                          {meta && (
                            <div className="text-xs text-stone-500 mt-1">
                              儲存時間：{meta.timestamp}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleSaveToSlot(slotId)}
                          className="bg-amber-800 hover:bg-amber-900 text-amber-50 px-3 py-1.5 rounded text-xs font-bold shadow active:scale-95 transition-transform cursor-pointer"
                        >
                          {meta ? '覆蓋存檔' : '儲存存檔'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-stone-300 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-700">匯出至本地檔案 (.json)</span>
                  <button
                    onClick={handleExportJSON}
                    className="bg-stone-800 hover:bg-stone-900 text-stone-100 px-3 py-1.5 rounded text-xs font-bold shadow cursor-pointer flex items-center gap-1"
                  >
                    <span>💾</span>
                    <span>下載存檔檔</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: 讀檔 */}
            {activeTab === '讀檔' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-stone-600 bg-stone-200 p-2.5 rounded border border-stone-300 leading-relaxed">
                  💡 請選擇瀏覽器本地的存檔，或選擇本地 `.json` 檔案匯入讀檔。
                </p>

                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(slotId => {
                    const meta = slotsMeta[slotId];
                    return (
                      <div
                        key={slotId}
                        className={`bg-stone-50 border rounded p-3 flex items-center justify-between shadow-sm ${
                          meta ? 'border-stone-300' : 'border-stone-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-stone-800 text-sm flex items-center gap-2">
                            <span className="bg-stone-700 text-stone-100 px-2 py-0.5 rounded text-xs">
                              欄位 {slotId}
                            </span>
                            {meta ? `【${meta.rulerName}】${meta.year}年${meta.month}月${meta.season}` : '無存檔資料'}
                          </div>
                          {meta && (
                            <div className="text-xs text-stone-500 mt-1">
                              儲存時間：{meta.timestamp}
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!meta}
                          onClick={() => handleLoadFromSlot(slotId)}
                          className={`px-3 py-1.5 rounded text-xs font-bold shadow transition-all cursor-pointer ${
                            meta
                              ? 'bg-amber-800 hover:bg-amber-900 text-amber-50 active:scale-95'
                              : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          載入戰局
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-stone-300 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-700">匯入本地 JSON 存檔檔</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportJSON}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-stone-800 hover:bg-stone-900 text-stone-100 px-3 py-1.5 rounded text-xs font-bold shadow cursor-pointer flex items-center gap-1"
                  >
                    <span>📂</span>
                    <span>選擇存檔檔</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: 重新開始 */}
            {activeTab === '重新開始' && (
              <div className="flex flex-col gap-5 py-2">
                <div className="bg-amber-50 border-l-4 border-amber-800 p-4 rounded text-stone-800 text-sm leading-relaxed shadow-sm">
                  <p className="font-bold text-amber-900 text-base mb-1">⚠️ 確定要重新開始遊戲？</p>
                  <p className="text-xs text-stone-600">
                    當前戰局中未進行存檔的動態進度將會丟失。請確認您是否已妥善進行「存檔」。
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm('確定要返回開局標題畫面嗎？未存檔的進度將會遺失。')) {
                        onReturnToTitle();
                        onClose();
                      }
                    }}
                    className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-stone-100 font-bold text-sm rounded border border-stone-900 shadow active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📜</span>
                    <span>返回標題畫面 (重新選擇劇本與君主)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('確定要重置本局戰局嗎？進度將還原至開局初始狀態。')) {
                        onResetCurrentGame();
                        onClose();
                        showToast('戰局已重置為初始狀態！');
                      }
                    }}
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold text-sm rounded border border-amber-950 shadow active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>重置當前戰局 (還原至本局開局)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: 音效音樂 */}
            {activeTab === '音效音樂' && (
              <div className="flex flex-col gap-4 py-2">
                <div className="bg-stone-50 border border-stone-300 rounded p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-bold text-stone-800 text-sm">🎵 背景音樂 (BGM)</div>
                    <div className="text-xs text-stone-500 mt-0.5">控制地圖與戰場背景古典國風樂曲播放</div>
                  </div>
                  <button
                    onClick={toggleBgm}
                    className={`px-4 py-1.5 rounded text-xs font-bold shadow transition-colors cursor-pointer ${
                      bgmEnabled ? 'bg-emerald-700 text-white' : 'bg-stone-400 text-stone-100'
                    }`}
                  >
                    {bgmEnabled ? '開啟中' : '已關閉'}
                  </button>
                </div>

                <div className="bg-stone-50 border border-stone-300 rounded p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="font-bold text-stone-800 text-sm">🔊 遊戲音效 (SFX)</div>
                    <div className="text-xs text-stone-500 mt-0.5">控制點擊、指令執行與戰鬥攻擊音效</div>
                  </div>
                  <button
                    onClick={toggleSfx}
                    className={`px-4 py-1.5 rounded text-xs font-bold shadow transition-colors cursor-pointer ${
                      sfxEnabled ? 'bg-emerald-700 text-white' : 'bg-stone-400 text-stone-100'
                    }`}
                  >
                    {sfxEnabled ? '開啟中' : '已關閉'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
