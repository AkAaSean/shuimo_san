import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BattleUnit } from '../types';
import { Swords, Sparkles, Shield, Footprints, RotateCcw, Flag, Eye, Zap } from 'lucide-react';
import { getBattleSkillInfo, BATTLE_SKILLS, isPassiveSkill } from '../engine/skills';

interface BattleCommandMenuProps {
  onCommandSelect: (id: number) => void;
  onStrategySelect?: (strategy: string) => void;
  activeUnit?: BattleUnit | null;
  activeSkills?: string[];
  activeStamina?: number;
  weather?: string;
}

export const ATTACK_MODES = [
  { id: 2, name: '1.通常', desc: '近身刀槍格鬥攻擊', req: '無條件限制' },
  { id: 3, name: '2.一齊', desc: '隊友協同包剿，發動後參與部隊同時行動結束', req: '需編組「鶴翼」陣形' },
  { id: 4, name: '3.突襲', desc: '發動 3 次強攻衝鋒，造成連續傷害', req: '需「魚鱗 / 鋒矢 / 錐行」陣形' },
  { id: 5, name: '4.弓矢', desc: '遠程箭雨打擊（具「遠射/騎射」特技可擴大射程）', req: '射程內有敵軍' },
  { id: 6, name: '5.火矢', desc: '火箭引燃敵軍造成持續灼燒', req: '雨天與雪天不可使用' },
  { id: 9, name: '6.一騎', desc: '發起單挑（電腦體力×武力≥我方時必接受單挑）', req: '相鄰敵將' },
  { id: 7, name: '7.亂射', desc: '對射程範圍內所有部隊發動弓矢（不分敵我）', req: '射程內有部隊' },
  { id: 8, name: '8.奮迅', desc: '同時對四周所有敵軍發動霸者橫掃攻擊', req: '四周相鄰敵軍' },
];

export default function BattleCommandMenu({
  onCommandSelect,
  onStrategySelect,
  activeUnit,
  activeSkills = [],
  activeStamina = 100,
  weather = '晴天'
}: BattleCommandMenuProps) {
  const [showAttackSubMenu, setShowAttackSubMenu] = useState(false);
  const [showStrategySubMenu, setShowStrategySubMenu] = useState(false);
  const [splashes, setSplashes] = useState<{ id: string; cmdId: number; x: number; y: number }[]>([]);

  const handleCommandClick = (e: React.MouseEvent<HTMLButtonElement>, cmdId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const splashId = Math.random().toString(36).substring(2, 9);
    setSplashes(prev => [...prev, { id: splashId, cmdId, x, y }]);
    
    if (cmdId === 2) {
      // Toggle Attack Selection Sub-Menu
      setShowAttackSubMenu(prev => !prev);
      setShowStrategySubMenu(false);
    } else if (cmdId === 10) {
      // Toggle Strategy Selection Sub-Menu
      setShowStrategySubMenu(prev => !prev);
      setShowAttackSubMenu(false);
    } else {
      setShowAttackSubMenu(false);
      setShowStrategySubMenu(false);
      onCommandSelect(cmdId);
    }

    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== splashId));
    }, 600);
  };

  const handleSelectAttackOption = (attackCmdId: number) => {
    setShowAttackSubMenu(false);
    onCommandSelect(attackCmdId);
  };

  const handleSelectStrategyOption = (strategyName: string) => {
    setShowStrategySubMenu(false);
    if (onStrategySelect) {
      onStrategySelect(strategyName);
    } else {
      onCommandSelect(10);
    }
  };

  const hasActed = activeUnit?.hasActed;
  const hasMoved = Boolean(activeUnit?.hasMovedThisTurn || hasActed);
  const isCraneFormation = activeUnit?.formation === '鶴翼';
  const isAssaultFormation = ['魚鱗', '鋒矢', '錐行'].includes(activeUnit?.formation || '');
  const isRainOrSnow = ['雨天', '雪天'].includes(weather);

  // Active unit's learned skills or default fallback skills
  const unitSkills = activeSkills.length > 0 ? activeSkills : (activeUnit?.skills || []);
  const skillList = unitSkills.map(name => {
    const info = getBattleSkillInfo(name);
    return {
      name,
      cost: info?.cost ?? 25,
      category: info?.category ?? '謀略計策',
      desc: info?.desc ?? '戰場作戰計謀',
      isPassive: isPassiveSkill(name)
    };
  });

  return (
    <div className="w-full bg-[#f4efe4] border-t-2 border-[#3c2a1e] p-1.5 sm:p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] relative z-20 font-serif select-none">
      {/* 二級攻擊招式彈出選單 (Attack Options Sub-Menu) */}
      <AnimatePresence>
        {showAttackSubMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[96%] max-w-2xl bg-stone-900/95 text-stone-100 border-2 border-amber-600/80 rounded-xl p-3 shadow-2xl backdrop-blur-md z-30"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-800/50">
              <div className="flex items-center space-x-2">
                <Swords className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-amber-300 text-sm">選擇攻擊招式</span>
                <span className="text-[11px] text-stone-400">
                  當前陣形: <strong className="text-amber-200">{activeUnit?.formation || '無'}</strong>
                </span>
              </div>
              <button
                onClick={() => setShowAttackSubMenu(false)}
                className="text-xs text-stone-400 hover:text-stone-200 bg-stone-800 px-2 py-0.5 rounded border border-stone-700"
              >
                ✕ 關閉選單
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ATTACK_MODES.map((atk) => {
                let badgeText = '';
                let badgeColor = 'bg-stone-800 text-stone-400';

                if (atk.id === 3) { // 一齊
                  if (isCraneFormation) {
                    badgeText = '✓ 鶴翼陣符合';
                    badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                  } else {
                    badgeText = '⚠️ 需鶴翼陣';
                    badgeColor = 'bg-rose-950 text-rose-300 border-rose-800';
                  }
                } else if (atk.id === 4) { // 突襲
                  if (isAssaultFormation) {
                    badgeText = '✓ 陣型符合';
                    badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                  } else {
                    badgeText = '⚠️ 需魚鱗/鋒矢/錐行';
                    badgeColor = 'bg-rose-950 text-rose-300 border-rose-800';
                  }
                } else if (atk.id === 6) { // 火矢
                  if (isRainOrSnow) {
                    badgeText = '🌧️ 雨雪停用';
                    badgeColor = 'bg-rose-950 text-rose-300 border-rose-800';
                  } else {
                    badgeText = '🔥 可引燃';
                    badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                  }
                } else if (atk.id === 9) { // 一騎
                  badgeText = '⚔️ 比拼勇武';
                  badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
                }

                return (
                  <button
                    key={atk.id}
                    onClick={() => handleSelectAttackOption(atk.id)}
                    className="flex flex-col text-left p-2 rounded-lg bg-stone-800/90 hover:bg-amber-950/70 border border-stone-700 hover:border-amber-600/80 transition-all group"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-amber-200 text-xs group-hover:text-amber-300">
                        {atk.name}
                      </span>
                      {badgeText && (
                        <span className={`text-[9px] px-1 py-0.2 rounded border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 leading-tight">
                      {atk.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 二級計謀特技彈出選單 (Strategy / Scheme Sub-Menu) */}
      <AnimatePresence>
        {showStrategySubMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[96%] max-w-2xl bg-stone-900/95 text-stone-100 border-2 border-purple-600/80 rounded-xl p-3 shadow-2xl backdrop-blur-md z-30"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-800/50">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-purple-300 text-sm">選擇計謀特技</span>
                <span className="text-[11px] text-stone-400">
                  將領: <strong className="text-amber-200">{activeUnit?.generalName || '將領'}</strong> 
                  <span className="ml-2">體力: <strong className="text-emerald-400">{activeStamina}</strong> / 100</span>
                </span>
              </div>
              <button
                onClick={() => setShowStrategySubMenu(false)}
                className="text-xs text-stone-400 hover:text-stone-200 bg-stone-800 px-2 py-0.5 rounded border border-stone-700"
              >
                ✕ 關閉選單
              </button>
            </div>

            {skillList.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-xs italic">
                該武將目前未習得特殊作戰計謀或特技
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                {skillList.map((sk) => {
                  const hasEnoughStamina = activeStamina >= sk.cost;
                  const isPassive = sk.isPassive;
                  
                  return (
                    <button
                      key={sk.name}
                      disabled={!isPassive && !hasEnoughStamina}
                      onClick={() => !isPassive && handleSelectStrategyOption(sk.name)}
                      className={`flex flex-col text-left p-2 rounded-lg border transition-all ${
                        isPassive
                          ? 'bg-stone-800/60 border-stone-700 text-stone-300 cursor-default opacity-80'
                          : hasEnoughStamina
                          ? 'bg-stone-800/90 hover:bg-purple-950/80 border-purple-800/60 hover:border-purple-500 cursor-pointer group'
                          : 'bg-stone-800/40 border-stone-800 text-stone-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`font-bold text-xs ${isPassive ? 'text-stone-300' : 'text-purple-200 group-hover:text-purple-300'}`}>
                          {sk.name}
                        </span>
                        <span className={`text-[9px] px-1 py-0.2 rounded border ${
                          isPassive
                            ? 'bg-stone-700 text-stone-300 border-stone-600'
                            : hasEnoughStamina
                            ? 'bg-purple-950 text-purple-300 border-purple-700'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}>
                          {isPassive ? '常時被動' : `氣力 ${sk.cost}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 leading-tight line-clamp-2">
                        {sk.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 一級主功能指令列 (Main Command Bar: 7 Buttons) */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
        {/* 1. 移動 */}
        <button
          disabled={hasMoved}
          onClick={(e) => handleCommandClick(e, 1)}
          className={`h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150 ${
            hasMoved ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-black filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-white font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            {hasActed ? '已行動' : (hasMoved ? '已移動' : '移動')}
          </span>
        </button>

        {/* 2. 攻擊 (展開 8 種攻擊招式) */}
        <button
          disabled={hasActed}
          onClick={(e) => handleCommandClick(e, 2)}
          className={`h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150 ${
            hasActed ? 'opacity-50 cursor-not-allowed' : (showAttackSubMenu ? 'ring-2 ring-rose-500' : '')
          }`}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-rose-950 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-rose-200 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            {hasActed ? '已攻擊' : '攻擊 ▼'}
          </span>
        </button>

        {/* 3. 計謀 (展開計謀特技選單) */}
        <button
          disabled={hasActed}
          onClick={(e) => handleCommandClick(e, 10)}
          className={`h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150 ${
            hasActed ? 'opacity-50 cursor-not-allowed' : (showStrategySubMenu ? 'ring-2 ring-purple-500' : '')
          }`}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-purple-950 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-purple-200 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {hasActed ? '已計略' : '計謀 ▼'}
          </span>
        </button>

        {/* 4. 佈陣 */}
        <button
          disabled={hasActed}
          onClick={(e) => handleCommandClick(e, 11)}
          className={`h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150 ${
            hasActed ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-sky-950 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-sky-200 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            佈陣
          </span>
        </button>

        {/* 5. 查看 */}
        <button
          onClick={(e) => handleCommandClick(e, 12)}
          className="h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150"
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-stone-800 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-stone-200 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-stone-300" />
            查看
          </span>
        </button>

        {/* 6. 退兵 */}
        <button
          onClick={(e) => handleCommandClick(e, 14)}
          className="h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150"
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-rose-950 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-rose-300 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            退兵
          </span>
        </button>

        {/* 0. 待命 */}
        <button
          onClick={(e) => handleCommandClick(e, 0)}
          className="h-9 sm:h-10 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-150"
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none fill-current text-stone-900 group-hover:text-emerald-950 filter drop-shadow" viewBox="0 0 100 38" preserveAspectRatio="none">
            <path d="M 4,8 C 16,2 48,1 80,3 C 94,3 98,6 97,13 C 96,20 98,28 92,33 C 78,37 45,36 18,37 C 6,37 2,30 2,22 C 2,14 2,10 4,8 Z" />
          </svg>
          <span className="relative z-10 text-emerald-200 font-black text-xs sm:text-sm tracking-widest drop-shadow flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            待命
          </span>
        </button>

        <AnimatePresence>
          {splashes.map(splash => (
            <motion.div
              key={splash.id}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute bg-amber-100 rounded-full pointer-events-none mix-blend-overlay"
              style={{
                left: splash.x - 20,
                top: splash.y - 20,
                width: 40,
                height: 40,
                filter: 'blur(2px)'
              }}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-1 text-center text-[10px] text-stone-700 font-bold tracking-wider flex items-center justify-center gap-2">
        <span>◆ 水墨戰術指揮盤 ◆</span>
        {activeUnit && (
          <span className="text-amber-800 font-normal">
            | 當前部隊: <strong className="font-bold text-stone-900">{activeUnit.generalName}</strong> ({activeUnit.hasMovedThisTurn ? '已移動' : '可移動'})
          </span>
        )}
      </div>
    </div>
  );
}

