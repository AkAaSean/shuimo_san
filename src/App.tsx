/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TopStatus from './components/TopStatus';
import MapArea from './components/MapArea';
import CommandMenu from './components/CommandMenu';
import BottomSheet from './components/BottomSheet';
import ProvinceCard from './components/ProvinceCard';
import PromptBanner from './components/PromptBanner';
import BattleView5v5 from './components/BattleView5v5';
import BattleLaunchView from './components/BattleLaunchView';
import MilitaryMoveView from './components/MilitaryMoveView';
import TroopView from './components/TroopView';
import StatusView from './components/StatusView';
import InspectView from './components/InspectView';
import TitleScreen from './components/TitleScreen';
import ActionModal from './components/ActionModal';
import RulerTerritoryCard from './components/RulerTerritoryCard';
import SystemModal from './components/SystemModal';
import PendingBattlesPanel from './components/PendingBattlesPanel';
import ManualModal from './components/ManualModal';
import AIDebugPanel from './components/AIDebugPanel';
import { PostBattleCaptiveModal } from './components/PostBattleCaptiveModal';
import { RulerSuccessionModal } from './components/RulerSuccessionModal';
import { GameOverModal } from './components/GameOverModal';
import { DiplomacyOfferModal } from './components/DiplomacyOfferModal';
import { useGameEngine } from './engine/useGameEngine';
import { GameState, ProvinceState } from './types';
import { provinces } from './data/provinces';

function GameApp({
  scenarioIndex,
  rulerName,
  initialGameState,
  onReturnToTitle,
  onResetCurrentGame,
  isFullscreen,
  onToggleFullscreen
}: {
  key?: React.Key;
  scenarioIndex: number;
  rulerName: string;
  initialGameState?: GameState | null;
  onReturnToTitle: () => void;
  onResetCurrentGame: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { gameState, actions } = useGameEngine(scenarioIndex, rulerName, initialGameState || undefined);
  const [tempAction, setTempAction] = useState<string | null>(null);

  // System Modal state
  const [systemModal, setSystemModal] = useState<{
    isOpen: boolean;
    mode: '存檔' | '讀檔' | '重新開始';
  }>({
    isOpen: false,
    mode: '存檔'
  });

  // Modal State for general-selected actions (內政, 商業, 謀略, 人事, 運送)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    category: string;
    action: string;
  }>({
    isOpen: false,
    category: '',
    action: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isAIDebugOpen, setIsAIDebugOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleActionSelect = (action: string) => {
    const rawAction = action.split(' ')[0];

    const currentProv = gameState.selectedProvinceId !== null 
      ? gameState.provincesData[gameState.selectedProvinceId] 
      : null;
    const isPlayerCity = currentProv ? currentProv.rulerName === gameState.rulerName : true;

    if (rawAction === '電腦AI觀測' || rawAction === 'AI觀測') {
      setIsAIDebugOpen(true);
      actions.setActiveMenu(null);
      return;
    }

    if (['存檔', '讀檔', '重新開始'].includes(rawAction)) {
      setSystemModal({
        isOpen: true,
        mode: rawAction as '存檔' | '讀檔' | '重新開始'
      });
      actions.setActiveMenu(null);
      return;
    }

    if (['查看本郡狀態', '檢視將領', '外交關係', '戰場地圖'].includes(rawAction)) {
      setTempAction(rawAction);
      actions.setView('status');
      actions.setActiveMenu(null);
      return;
    }

    if (['選擇州郡', '將軍列表', '領土列表', '郡地理誌', '君主物品', '邵地理誌'].includes(rawAction)) {
      setTempAction(rawAction === '邵地理誌' ? '郡地理誌' : rawAction);
      actions.setView('inspect');
      actions.setActiveMenu(null);
      return;
    }

    if (!isPlayerCity) {
      showToast(`【${currentProv?.name || '目標城池'}】非我方控制城池！無法下達政令，僅開放【0.狀態】、【1.查看】與【9.系統】操作。`);
      actions.setActiveMenu(null);
      return;
    }

    // Dedicated Fullscreen Views for Troops, Military, Fort
    if (['徵兵', '訓練兵士', '編制兵力', '調整兵力'].includes(rawAction)) {
      setTempAction(rawAction);
      actions.setView('troops');
      actions.setActiveMenu(null);
      return;
    }

    if (rawAction === '發動戰役') {
      actions.setView('battle_launch');
      actions.setActiveMenu(null);
      return;
    }

    if (rawAction === '武將調動' || rawAction === '調動軍隊') {
      actions.setView('military_move');
      actions.setActiveMenu(null);
      return;
    }
    
    if (gameState.activeMenu !== null) {
      if (rawAction === '休息') {
        const pendingCount = (gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : [])).length;
        actions.nextTurn();
        actions.setActiveMenu(null);
        if (pendingCount > 1) {
          showToast(`⚔️ 全軍出動！即將依序進行 ${pendingCount} 場戰役！`);
        } else if (pendingCount === 1) {
          showToast('⚔️ 全軍出動！戰事即刻開打！');
        } else {
          showToast('時光流逝，進入新的一個月。全體武將恢復待命狀態！');
        }
      } else {
        // Auto select ruler province if currently null
        if (gameState.selectedProvinceId === null) {
          const owned = (Object.values(gameState.provincesData) as ProvinceState[]).find(p => p.rulerName === gameState.rulerName);
          if (owned) {
            actions.selectProvince(owned.id);
          }
        }

        const categoryLabel = ['狀態','查看','軍事','兵士','內政','商業','人事','君主','謀略','系統'][gameState.activeMenu];
        
        // Open the general selection Action Modal
        setActionModal({
          isOpen: true,
          category: categoryLabel,
          action: rawAction,
        });
        actions.setActiveMenu(null);
      }
    } else {
      actions.setActiveMenu(null);
    }
  };

  const handleModalConfirm = (generalName: string, payload?: any) => {
    const chosenGen = gameState.generalsData[generalName];
    const targetProvinceId = (chosenGen && chosenGen.provinceId !== null)
      ? chosenGen.provinceId
      : (gameState.selectedProvinceId !== null 
          ? gameState.selectedProvinceId 
          : ((Object.values(gameState.provincesData) as ProvinceState[]).find(p => p.rulerName === gameState.rulerName)?.id ?? 1));

    if (targetProvinceId !== null) {
      actions.executeCommand(
        targetProvinceId,
        actionModal.category,
        actionModal.action,
        generalName,
        payload
      );

      if (['尋訪人才', '登用人才', '流言煽動', '驅虎吞狼', '離間君臣', '勸降逼降'].includes(actionModal.action)) {
        // 這些指令的結果將直接透過專屬結果彈窗 (lastActionResult) 顯示
      } else if (actionModal.action === '賞賜金帛' && payload?.targetGeneralName) {
        showToast(`已向【${payload.targetGeneralName}】賞賜 ${payload.gold || 10} 金，部屬忠誠大幅提升！`);
      } else {
        showToast(`【${generalName}】已順利執行【${actionModal.action}】任務！`);
      }
    }
  };

  return (
    <div className="w-full max-w-[500px] sm:max-w-[600px] md:max-w-[720px] lg:max-w-[840px] landscape:max-w-none game-container h-full mx-auto bg-stone-200 relative flex flex-col shadow-2xl overflow-hidden transition-all duration-300">
      {/* Action Outcome Result Modal (e.g., 尋訪人才、登用人才、天災事件) */}
      <AnimatePresence>
        {(gameState.monthlyEvents && gameState.monthlyEvents.length > 0 && !gameState.currentBattle) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f4f1ea] border-4 border-[#1c1917] w-full max-w-sm p-5 shadow-2xl font-serif text-[#1c1917] flex flex-col items-center text-center relative"
            >
              <div className="text-4xl mb-2">⚔️</div>
              <div className="text-lg font-black text-[#991b1b] border-b-2 border-[#1c1917] pb-2 mb-3 w-full">
                天下風雲戰報
              </div>
              <div className="text-xs font-bold leading-relaxed bg-white/90 p-3.5 border border-stone-400 mb-4 w-full text-stone-800 text-left space-y-2 max-h-[40vh] overflow-y-auto">
                {gameState.monthlyEvents.map((msg, idx) => (
                  <div key={idx} className="border-b border-stone-200 pb-1 last:border-0">{msg}</div>
                ))}
              </div>
              <button
                onClick={() => actions.clearMonthlyEvents()}
                className="w-full py-2.5 bg-[#991b1b] text-white font-black border-2 border-[#1c1917] shadow-[2px_2px_0_#1c1917] hover:bg-red-800 active:scale-95 transition-all cursor-pointer"
              >
                悉知 (確定)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI 主動外交交涉提議彈窗 (Diplomacy Offer Modal) */}
      <AnimatePresence>
        {gameState.pendingDiplomacyOffer && !gameState.currentBattle && (
          <DiplomacyOfferModal
            offer={gameState.pendingDiplomacyOffer}
            onRespond={(accepted) => actions.respondDiplomacyOffer(accepted)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState.lastActionResult && (() => {
          const isBattleVictory = gameState.lastActionResult.action === '攻城勝利' || 
            gameState.lastActionResult.title.includes('勝利') || 
            gameState.lastActionResult.title.includes('大捷') ||
            gameState.lastActionResult.title.includes('奪地');
          const isBattleDefeat = gameState.lastActionResult.action === '攻城失敗' || 
            gameState.lastActionResult.title.includes('失利') || 
            gameState.lastActionResult.title.includes('失敗') ||
            gameState.lastActionResult.title.includes('潰敗');

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-sm animate-fade-in">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#f4f1ea] border-4 border-[#1c1917] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl font-serif text-[#1c1917] flex flex-col items-center text-center relative"
              >
                {/* 戰爭勝利 / 失敗專屬主題插畫 */}
                {isBattleVictory ? (
                  <div className="w-full h-36 relative overflow-hidden bg-black border-b-2 border-[#1c1917]">
                    <img 
                      src="/assets/win.jpg" 
                      alt="戰爭勝利" 
                      className="w-full h-full object-cover object-center brightness-95"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-2">
                      <span className="text-amber-300 font-black text-sm tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        🏆 凱旋破城・大捷
                      </span>
                    </div>
                  </div>
                ) : isBattleDefeat ? (
                  <div className="w-full h-36 relative overflow-hidden bg-black border-b-2 border-[#1c1917]">
                    <img 
                      src="/assets/lost.jpg" 
                      alt="戰爭失敗" 
                      className="w-full h-full object-cover object-center brightness-95"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-2">
                      <span className="text-rose-400 font-black text-sm tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        🏴 兵敗撤退・失利
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-4xl mt-5 mb-2">
                    {gameState.lastActionResult.type === 'talent_found' ? '🔍' :
                     gameState.lastActionResult.type === 'gold_found' ? '💰' :
                     gameState.lastActionResult.type === 'success' ? '🎉' :
                     gameState.lastActionResult.type === 'failure' ? '❌' : '📜'}
                  </div>
                )}

                <div className="p-4 sm:p-5 w-full flex flex-col items-center">
                  <div className="text-lg font-black text-[#991b1b] border-b-2 border-[#1c1917] pb-2 mb-3 w-full">
                    {gameState.lastActionResult.title}
                  </div>
                  <div className="text-xs font-bold leading-relaxed bg-white/90 p-3.5 border border-stone-400 mb-4 w-full text-stone-800 text-left">
                    {gameState.lastActionResult.message}
                  </div>
                  <button
                    onClick={() => actions.clearActionResult()}
                    className="w-full py-2.5 bg-[#991b1b] text-white font-black border-2 border-[#1c1917] shadow-[2px_2px_0_#1c1917] hover:bg-red-800 active:scale-95 transition-all cursor-pointer"
                  >
                    遵命 (確定)
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Action Outcome Toast */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-[70] bg-[#1c1917] text-amber-200 border-2 border-amber-400/60 p-2.5 shadow-2xl text-xs font-bold text-center animate-fade-in">
          {toastMessage}
        </div>
      )}

      <AnimatePresence mode="wait">
        {gameState.view === 'map' ? (
          <motion.div 
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <TopStatus 
              gameState={gameState} 
              onRest={() => {
                const pendingCount = (gameState.pendingBattles || (gameState.pendingBattle ? [gameState.pendingBattle] : [])).length;
                actions.nextTurn();
                if (pendingCount > 1) {
                  showToast(`⚔️ 全軍出動！即將依序進行 ${pendingCount} 場戰役！`);
                } else if (pendingCount === 1) {
                  showToast('⚔️ 全軍出動！戰事即刻開打！');
                } else {
                  showToast('時光流逝，進入新的一個月。全體武將恢復待命狀態！');
                }
              }}
              onToggleFullscreen={onToggleFullscreen}
              isFullscreen={isFullscreen}
              onOpenManual={() => setIsManualOpen(true)}
              onOpenAIDebug={() => setIsAIDebugOpen(true)}
            />
            
            <div className="flex-1 relative overflow-hidden">
              <MapArea 
                selectedProvinceId={gameState.selectedProvinceId} 
                onSelectProvince={actions.selectProvince}
                onClearSelection={actions.clearSelection}
                provincesData={gameState.provincesData}
              />
              
              {/* 左側浮動區：選中的城池資訊與出征軍務標籤 */}
              <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5 items-start pointer-events-none max-w-[calc(50vw-12px)] sm:max-w-none">
                {gameState.selectedProvinceId && !gameState.activeMenu && (
                  <div className="pointer-events-auto">
                    <ProvinceCard 
                      provinceId={gameState.selectedProvinceId} 
                      gameState={gameState}
                      onClose={actions.clearSelection}
                    />
                  </div>
                )}

                {/* 出征軍務浮動小標籤：置於城池資訊下方，絕不遮擋右側我方城池列表 */}
                <div className="pointer-events-auto">
                  <PendingBattlesPanel 
                    gameState={gameState}
                    onCancelBattle={(planId, targetProvinceId) => {
                      actions.executeCommand(1, '軍事', '撤銷出征', undefined, { planId, targetProvinceId });
                      showToast('已撤銷出征計畫，參戰將領與隨軍錢糧均已歸位。');
                    }}
                  />
                </div>
              </div>

              {/* 右側浮動區：我方城池列表 */}
              {!gameState.activeMenu && (
                <RulerTerritoryCard 
                  gameState={gameState}
                  onSelectProvince={actions.selectProvince}
                />
              )}
            </div>
            
            <PromptBanner 
              rulerName={gameState.rulerName} 
              selectedProvinceId={gameState.selectedProvinceId} 
              provincesData={gameState.provincesData}
            />
            
            <CommandMenu 
              gameState={gameState}
              onCommandSelect={actions.setActiveMenu} 
              showToast={showToast}
            />
            
            <BottomSheet 
              activeMenu={gameState.activeMenu} 
              gameState={gameState}
              onClose={() => actions.setActiveMenu(null)} 
              onActionSelect={handleActionSelect} 
            />

            {/* Action Modal with General Selection & Stats */}
            <ActionModal
              isOpen={actionModal.isOpen}
              category={actionModal.category}
              action={actionModal.action}
              gameState={gameState}
              onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
              onConfirm={handleModalConfirm}
            />
          </motion.div>
        ) : gameState.view === 'military_move' ? (
          <motion.div 
            key="military_move"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <MilitaryMoveView
              gameState={gameState}
              onExit={() => actions.setView('map')}
              onConfirmMove={(generalNames, targetProvinceId) => {
                if (gameState.selectedProvinceId) {
                  actions.executeCommand(
                    gameState.selectedProvinceId,
                    '軍事',
                    '武將調動',
                    generalNames[0],
                    { generalNames, targetProvinceId }
                  );
                  const targetProv = gameState.provincesData[targetProvinceId];
                  const targetPInfo = provinces.find(p => p.id === targetProvinceId);
                  const targetPName = targetPInfo ? targetPInfo.name : `${targetProvinceId}郡`;
                  const isRulerMoved = generalNames.includes(gameState.rulerName);
                  if (isRulerMoved && targetProv?.isAutonomous) {
                    showToast(`👑 君主移駕【${targetPName}】，治所即刻解除自治、回歸君主親政直轄！`);
                  } else {
                    showToast(`成功將 ${generalNames.length} 位將領調動至【${targetPName}】！`);
                  }
                }
                actions.setView('map');
              }}
            />
          </motion.div>
        ) : gameState.view === 'battle_launch' ? (
          <motion.div 
            key="battle_launch"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <BattleLaunchView
              gameState={gameState}
              onExit={() => actions.setView('map')}
              onLaunchBattle={(targetProvinceId, attackingGeneralNames, gold, food, strategist, cityProvisions, attackerPrimaryProvinceId, attackerReinforceProvinceId) => {
                const commander = attackingGeneralNames[0];
                const commanderProvId = attackerPrimaryProvinceId 
                  || (commander && gameState.generalsData[commander]?.provinceId) 
                  || gameState.selectedProvinceId 
                  || 1;
                actions.executeCommand(
                  commanderProvId,
                  '軍事',
                  '發動戰役',
                  commander,
                  { 
                    attackingGeneralNames, 
                    targetProvinceId, 
                    gold, 
                    food, 
                    strategist,
                    cityProvisions,
                    attackerPrimaryProvinceId: commanderProvId,
                    attackerReinforceProvinceId
                  }
                );
                actions.setView('map');
                const targetCityName = provinces.find(p => p.id === targetProvinceId)?.name || '敵城';
                showToast(`⚔️ 已排定進軍【${targetCityName}】！全軍將於本月『休息』時正式發動進攻！`);
              }}
            />
          </motion.div>
        ) : gameState.view === 'troops' ? (
          <motion.div 
            key="troops"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <TroopView 
              gameState={gameState}
              initialAction={tempAction || '徵兵'}
              onExit={() => {
                actions.setView('map');
                setTempAction(null);
              }}
              onExecute={(category, action, payload, generalName) => {
                if (gameState.selectedProvinceId) {
                  actions.executeCommand(gameState.selectedProvinceId, category, action, generalName, payload);
                  showToast(`【${action}】指令已成功執行！`);
                }
                actions.setView('map');
                setTempAction(null);
              }}
            />
          </motion.div>
        ) : gameState.view === 'status' ? (
          <motion.div 
            key="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <StatusView
              gameState={gameState}
              initialAction={tempAction || '查看本郡狀態'}
              onExit={() => {
                actions.setView('map');
                setTempAction(null);
              }}
            />
          </motion.div>
        ) : gameState.view === 'inspect' ? (
          <motion.div 
            key="inspect"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <InspectView
              gameState={gameState}
              initialTab={tempAction || '選擇州郡'}
              onExit={() => {
                actions.setView('map');
                setTempAction(null);
              }}
              onSelectProvinceOnMap={(pId) => {
                actions.selectProvince(pId);
                actions.setView('map');
                setTempAction(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div 
            key="battle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full flex flex-col relative overflow-hidden"
          >
            <BattleView5v5 
              key={gameState.activeBattle ? `${gameState.activeBattle.targetProvinceId}_${gameState.activeBattle.attackerProvinceId}_${gameState.pendingBattles?.length ?? 0}` : 'battle'}
              gameState={gameState} 
              onExit={() => actions.resolveBattle('defender')}
              onResolveBattle={(winner) => actions.resolveBattle(winner)}
              onUpdateDefenseDeployment={actions.updateActiveBattleDefense}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Modal for Save, Load, Restart, Audio Settings */}
      <SystemModal
        isOpen={systemModal.isOpen}
        mode={systemModal.mode}
        gameState={gameState}
        onClose={() => setSystemModal(prev => ({ ...prev, isOpen: false }))}
        onLoadGameState={(savedState) => actions.loadGameState(savedState)}
        onReturnToTitle={onReturnToTitle}
        onResetCurrentGame={onResetCurrentGame}
        showToast={showToast}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Manual Modal: 水墨三國說明書 v0.4 */}
      <ManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* AI Debug / Telemetry Panel */}
      <AIDebugPanel
        isOpen={isAIDebugOpen}
        onClose={() => setIsAIDebugOpen(false)}
        gameState={gameState}
      />

      {/* Post-battle captive modal */}
      {gameState.pendingCaptives && gameState.pendingCaptives.length > 0 && (
        <PostBattleCaptiveModal
          pendingCaptives={gameState.pendingCaptives}
          generalsData={gameState.generalsData}
          playerRulerName={gameState.rulerName}
          onCaptiveAction={(genName, action) => actions.handleCaptiveAction(genName, action)}
          onClose={() => {
            // cleared automatically when all captives processed
          }}
        />
      )}

      {/* Ruler Succession Modal */}
      {gameState.pendingRulerSuccession && (
        <RulerSuccessionModal
          executedRuler={gameState.pendingRulerSuccession.executedRuler}
          killerRuler={gameState.pendingRulerSuccession.killerRuler}
          candidateNames={gameState.pendingRulerSuccession.candidates}
          generalsData={gameState.generalsData}
          onSelectSuccessor={(successorName) => actions.handleSelectSuccessor(successorName)}
        />
      )}

      {/* Game Over Modal */}
      {gameState.isGameOver && (
        <GameOverModal
          reason={gameState.gameOverReason || '我軍勢力毀於一旦，天下霸業就此終結！'}
          onRestart={onResetCurrentGame}
        />
      )}
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState<'title' | 'playing'>('title');
  const [gameConfig, setGameConfig] = useState({ scenario: 0, ruler: '劉備' });
  const [loadedGameState, setLoadedGameState] = useState<GameState | null>(null);
  const [gameKey, setGameKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        document.body.classList.add('fullscreen-active');
      } else {
        document.body.classList.remove('fullscreen-active');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          setIsFullscreen(prev => {
            const next = !prev;
            if (next) document.body.classList.add('fullscreen-active');
            else document.body.classList.remove('fullscreen-active');
            return next;
          });
        });
      } else {
        setIsFullscreen(prev => {
          const next = !prev;
          if (next) document.body.classList.add('fullscreen-active');
          else document.body.classList.remove('fullscreen-active');
          return next;
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleStartGame = (scenarioIndex: number, rulerName: string) => {
    setLoadedGameState(null);
    setGameConfig({ scenario: scenarioIndex, ruler: rulerName });
    setGameKey(prev => prev + 1);
    setAppState('playing');
  };

  const handleLoadSaveGame = (savedState: GameState) => {
    setLoadedGameState(savedState);
    setGameConfig({
      scenario: savedState.currentScenario ?? 0,
      ruler: savedState.rulerName ?? '劉備'
    });
    setGameKey(prev => prev + 1);
    setAppState('playing');
  };

  const handleResetCurrentGame = () => {
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="w-full h-[100dvh] bg-stone-900 flex justify-center overflow-hidden touch-none select-none font-serif text-stone-900">
      <AnimatePresence mode="wait">
        {appState === 'title' ? (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col justify-center items-center"
          >
            <TitleScreen onStartGame={handleStartGame} onLoadSaveGame={handleLoadSaveGame} />
          </motion.div>
        ) : (
          <motion.div
            key={`game-${gameKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex flex-col justify-center items-center"
          >
            <GameApp
              key={gameKey}
              scenarioIndex={gameConfig.scenario}
              rulerName={gameConfig.ruler}
              initialGameState={loadedGameState}
              onReturnToTitle={() => setAppState('title')}
              onResetCurrentGame={handleResetCurrentGame}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
