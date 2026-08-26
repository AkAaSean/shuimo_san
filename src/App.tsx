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
import BattleView from './components/BattleView';
import BattleLaunchView from './components/BattleLaunchView';
import MilitaryMoveView from './components/MilitaryMoveView';
import BuildFortView from './components/BuildFortView';
import TroopView from './components/TroopView';
import StatusView from './components/StatusView';
import InspectView from './components/InspectView';
import TitleScreen from './components/TitleScreen';
import ActionModal from './components/ActionModal';
import RulerTerritoryCard from './components/RulerTerritoryCard';
import SystemModal from './components/SystemModal';
import { useGameEngine } from './engine/useGameEngine';
import { ProvinceState } from './types';

function GameApp({
  scenarioIndex,
  rulerName,
  onReturnToTitle,
  onResetCurrentGame,
  isFullscreen,
  onToggleFullscreen
}: {
  key?: React.Key;
  scenarioIndex: number;
  rulerName: string;
  onReturnToTitle: () => void;
  onResetCurrentGame: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { gameState, actions } = useGameEngine(scenarioIndex, rulerName);
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

    if (['存檔', '讀檔', '重新開始'].includes(rawAction)) {
      setSystemModal({
        isOpen: true,
        mode: rawAction as '存檔' | '讀檔' | '重新開始'
      });
      actions.setActiveMenu(null);
      return;
    }

    if (['查看本郡狀態', '檢視將領', '外交關係'].includes(rawAction)) {
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

    if (rawAction === '建築關寨') {
      actions.setView('build_fort');
      actions.setActiveMenu(null);
      return;
    }
    
    if (gameState.activeMenu !== null) {
      if (rawAction === '休息') {
        actions.nextTurn();
        actions.setActiveMenu(null);
        showToast('時光流逝，進入新的一個月。全體武將恢復待命狀態！');
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
    <div className="w-full max-w-[480px] landscape:max-w-none game-container h-full bg-stone-200 relative flex flex-col shadow-2xl overflow-hidden transition-all duration-300">
      {/* Action Outcome Result Modal (e.g., 尋訪人才、登用人才) */}
      <AnimatePresence>
        {(gameState.monthlyEvents && gameState.monthlyEvents.length > 0) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f4f1ea] border-4 border-[#1c1917] w-full max-w-sm p-5 shadow-2xl font-serif text-[#1c1917] flex flex-col items-center text-center relative"
            >
              <div className="text-4xl mb-2">🌊</div>
              <div className="text-lg font-black text-[#991b1b] border-b-2 border-[#1c1917] pb-2 mb-3 w-full">
                天災與事件報告
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

      <AnimatePresence>
        {gameState.lastActionResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f4f1ea] border-4 border-[#1c1917] w-full max-w-sm p-5 shadow-2xl font-serif text-[#1c1917] flex flex-col items-center text-center relative"
            >
              <div className="text-4xl mb-2">
                {gameState.lastActionResult.type === 'talent_found' ? '🔍' :
                 gameState.lastActionResult.type === 'gold_found' ? '💰' :
                 gameState.lastActionResult.type === 'success' ? '🎉' :
                 gameState.lastActionResult.type === 'failure' ? '❌' : '📜'}
              </div>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Outcome Toast */}
      {toastMessage && (
        <div className="absolute top-14 left-4 right-4 z-[70] bg-[#1c1917] text-amber-200 border-2 border-amber-400/60 p-2.5 shadow-2xl text-xs font-bold text-center animate-fade-in">
          {toastMessage}
        </div>
      )}

      {gameState.view === 'map' ? (
        <>
          <TopStatus 
            gameState={gameState} 
            onRest={() => {
              actions.nextTurn();
              showToast('時光流逝，進入新的一個月。全體武將恢復待命狀態！');
            }}
            onToggleFullscreen={onToggleFullscreen}
            isFullscreen={isFullscreen}
          />
          
          <div className="flex-1 relative overflow-hidden">
            <MapArea 
              selectedProvinceId={gameState.selectedProvinceId} 
              onSelectProvince={actions.selectProvince}
              onClearSelection={actions.clearSelection}
              provincesData={gameState.provincesData}
            />
            
            {gameState.selectedProvinceId && !gameState.activeMenu && (
              <ProvinceCard 
                provinceId={gameState.selectedProvinceId} 
                gameState={gameState}
                onClose={actions.clearSelection}
              />
            )}

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
        </>
      ) : gameState.view === 'military_move' ? (
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
              showToast(`成功將 ${generalNames.length} 位將領調動至目標郡！`);
            }
            actions.setView('map');
          }}
        />
      ) : gameState.view === 'battle_launch' ? (
        <BattleLaunchView
          gameState={gameState}
          onExit={() => actions.setView('map')}
          onLaunchBattle={(targetProvinceId, attackingGeneralNames) => {
            if (gameState.selectedProvinceId) {
              actions.executeCommand(
                gameState.selectedProvinceId,
                '軍事',
                '發動戰役',
                attackingGeneralNames[0],
                { attackingGeneralNames, targetProvinceId }
              );
            }
            actions.setView('battle');
          }}
        />
      ) : gameState.view === 'build_fort' ? (
        <BuildFortView 
          gameState={gameState} 
          onExit={() => actions.setView('map')}
          onBuild={(x, y, generalName) => {
            if (gameState.selectedProvinceId) {
              actions.executeCommand(gameState.selectedProvinceId, '內政', '建築關寨', generalName, { x, y });
              showToast(`【${generalName}】已督造完成一座新關寨！`);
            }
            actions.setView('map');
          }}
        />
      ) : gameState.view === 'troops' ? (
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
      ) : gameState.view === 'status' ? (
        <StatusView
          gameState={gameState}
          initialAction={tempAction || '查看本郡狀態'}
          onExit={() => {
            actions.setView('map');
            setTempAction(null);
          }}
        />
      ) : gameState.view === 'inspect' ? (
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
      ) : (
        <BattleView 
          gameState={gameState} 
          onExitBattle={() => actions.setView('map')}
          onResolveBattle={(winner) => actions.resolveBattle(winner)}
        />
      )}

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
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState<'title' | 'playing'>('title');
  const [gameConfig, setGameConfig] = useState({ scenario: 0, ruler: '劉備' });
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
    setGameConfig({ scenario: scenarioIndex, ruler: rulerName });
    setGameKey(prev => prev + 1);
    setAppState('playing');
  };

  const handleResetCurrentGame = () => {
    setGameKey(prev => prev + 1);
  };

  return (
    <div className="w-full h-[100dvh] bg-stone-900 flex justify-center overflow-hidden touch-none select-none font-serif text-stone-900">
      {appState === 'title' ? (
        <TitleScreen onStartGame={handleStartGame} />
      ) : (
        <GameApp
          key={gameKey}
          scenarioIndex={gameConfig.scenario}
          rulerName={gameConfig.ruler}
          onReturnToTitle={() => setAppState('title')}
          onResetCurrentGame={handleResetCurrentGame}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}
    </div>
  );
}
