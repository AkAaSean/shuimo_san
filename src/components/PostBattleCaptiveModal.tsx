import React, { useState, useEffect } from 'react';
import { GeneralState } from '../types';
import { Crown, ShieldAlert, UserCheck, Lock, UserX, Skull, Sparkles, MessageSquareQuote, ArrowRight, CheckCircle2, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { calculateCaptiveRecruitChance } from '../engine/postBattleLogic';

interface PendingCaptive {
  generalName: string;
  capturedInProvinceId: number;
  winnerRuler: string;
  defeatedRuler: string;
  isEliminatedRuler?: boolean;
  isFactionEliminated?: boolean;
  isRulerSelf?: boolean;
}

interface PostBattleCaptiveModalProps {
  pendingCaptives: PendingCaptive[];
  generalsData: Record<string, GeneralState>;
  playerRulerName: string;
  onCaptiveAction: (generalName: string, action: 'recruit' | 'imprison' | 'release' | 'execute') => { success: boolean; message: string };
  onClose: () => void;
}

function getImprisonQuote(): string {
  return `「哼！大丈夫死則死耳，何懼區區囹圄之苦！」`;
}

function getReleaseQuote(): string {
  return `「承蒙主公不殺大恩，某感佩五內，後會有期！」`;
}

function getExecuteQuote(): string {
  return `「天命如此，吾死何恨！先主，某先來一步矣！」`;
}

export const PostBattleCaptiveModal: React.FC<PostBattleCaptiveModalProps> = ({
  pendingCaptives,
  generalsData,
  playerRulerName,
  onCaptiveAction,
  onClose
}) => {
  const [recruitAttempted, setRecruitAttempted] = useState<boolean>(false);
  const [recruitFailed, setRecruitFailed] = useState<boolean>(false);
  const [recruitSuccess, setRecruitSuccess] = useState<boolean>(false);
  const [dialogueQuote, setDialogueQuote] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'recruit' | 'imprison' | 'release' | 'execute' | null>(null);

  const currentCaptiveInfo = pendingCaptives && pendingCaptives.length > 0 ? pendingCaptives[0] : null;

  // 當切換到下一個俘虜時，重置所有對話與狀態
  useEffect(() => {
    setRecruitAttempted(false);
    setRecruitFailed(false);
    setRecruitSuccess(false);
    setDialogueQuote(null);
    setFeedbackMsg(null);
    setLastAction(null);
  }, [currentCaptiveInfo?.generalName]);

  if (!pendingCaptives || pendingCaptives.length === 0 || !currentCaptiveInfo) {
    return null;
  }

  const captiveGen = generalsData[currentCaptiveInfo.generalName];
  const playerGen = (Object.values(generalsData) as GeneralState[]).find(g => g.name === playerRulerName);

  const isFactionEliminated = !!(currentCaptiveInfo.isFactionEliminated || currentCaptiveInfo.isEliminatedRuler);
  const isRulerSelf = !!(currentCaptiveInfo.isRulerSelf || currentCaptiveInfo.generalName === currentCaptiveInfo.defeatedRuler);

  // 精準計算招降率與忠誠度評判
  const evalResult = calculateCaptiveRecruitChance(
    captiveGen || { name: currentCaptiveInfo.generalName, loyalty: 50 } as any,
    playerRulerName,
    playerGen || null,
    currentCaptiveInfo.defeatedRuler,
    isFactionEliminated,
    isRulerSelf
  );

  const handleAction = (action: 'recruit' | 'imprison' | 'release' | 'execute') => {
    if (action === 'recruit') {
      const res = onCaptiveAction(currentCaptiveInfo.generalName, 'recruit');
      setRecruitAttempted(true);

      if (res.success) {
        setRecruitSuccess(true);
        setRecruitFailed(false);
        setLastAction('recruit');
        setDialogueQuote(evalResult.surrenderQuote);
        setFeedbackMsg(res.message);
      } else {
        setRecruitSuccess(false);
        setRecruitFailed(true);
        setDialogueQuote(evalResult.refusalQuote);
        setFeedbackMsg(res.message);
      }
      return;
    }

    // 選擇關押/釋放/處決
    const res = onCaptiveAction(currentCaptiveInfo.generalName, action);
    setLastAction(action);
    setFeedbackMsg(res.message);

    if (action === 'imprison') {
      setDialogueQuote(getImprisonQuote());
    } else if (action === 'release') {
      setDialogueQuote(getReleaseQuote());
    } else if (action === 'execute') {
      setDialogueQuote(getExecuteQuote());
    }

    // 1.2 秒後自動進入下一個俘虜或關閉
    setTimeout(() => {
      if (pendingCaptives.length <= 1) {
        onClose();
      }
    }, 1200);
  };

  const handleNextCaptive = () => {
    if (pendingCaptives.length <= 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1b1511] border-2 border-amber-600/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 px-6 py-4 border-b border-amber-600/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-amber-200 tracking-wide font-serif">
              戰後俘虜處置
            </h2>
          </div>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 font-bold">
            剩餘 {pendingCaptives.length} 人
          </span>
        </div>

        {/* Captive Body */}
        <div className="p-6 flex flex-col gap-4">
          
          {/* Status banner: Faction Eliminated vs Ruler Still Alive */}
          {isFactionEliminated ? (
            <div className="bg-rose-950/60 border border-rose-600/60 rounded-xl p-3 flex items-center gap-2.5 text-rose-200 text-xs font-bold shadow">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="block text-rose-300 font-extrabold">【滅國大捷】敵方勢力【{currentCaptiveInfo.defeatedRuler}】已遭徹底滅亡！</span>
                <span className="text-[11px] text-rose-200/80">舊主已逝，國破家亡，敵將已無效忠實體，歸順意願大幅提升。</span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/50 border border-amber-600/40 rounded-xl p-3 flex items-center gap-2.5 text-amber-200 text-xs shadow">
              <Shield className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-300">舊主【{currentCaptiveInfo.defeatedRuler}】尚在人間（勢力未滅）</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">
                    忠臣不事二主
                  </span>
                </div>
                <span className="text-[11px] text-amber-300/80 block mt-0.5">
                  君主尚存時忠義名將難以當場策反。可先收押天牢，待削其心志或滅其國再行登用！
                </span>
              </div>
            </div>
          )}

          {/* General Card */}
          <div className="bg-[#241c16] border border-amber-900/40 rounded-xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-amber-950/80 border-2 border-amber-500/60 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-2xl font-black text-amber-300 font-serif">
                {currentCaptiveInfo.generalName.substring(0, 1)}
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-amber-100 tracking-wider">
                    {currentCaptiveInfo.generalName}
                  </h3>
                  {isRulerSelf && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold border border-rose-600">
                      敵軍君主
                    </span>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-amber-900/50 font-bold">
                  {captiveGen?.role || '武將'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-xs mt-1">
                <div className="bg-stone-900/70 p-1 rounded border border-stone-800">
                  <span className="text-stone-400 block text-[10px]">武力</span>
                  <span className="font-bold text-rose-400">{captiveGen?.str ?? 50}</span>
                </div>
                <div className="bg-stone-900/70 p-1 rounded border border-stone-800">
                  <span className="text-stone-400 block text-[10px]">謀略</span>
                  <span className="font-bold text-sky-400">{captiveGen?.int ?? 50}</span>
                </div>
                <div className="bg-stone-900/70 p-1 rounded border border-stone-800">
                  <span className="text-stone-400 block text-[10px]">政治</span>
                  <span className="font-bold text-emerald-400">{captiveGen?.pol ?? 50}</span>
                </div>
                <div className="bg-stone-900/70 p-1 rounded border border-stone-800">
                  <span className="text-stone-400 block text-[10px]">原忠誠</span>
                  <span className="font-bold text-amber-400">{captiveGen?.loyalty ?? 50}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Character Dialogue Box / Speech Bubble */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-all duration-300 ${
            recruitSuccess
              ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
              : recruitFailed
              ? 'bg-rose-950/60 border-rose-600/80 text-rose-200'
              : lastAction
              ? 'bg-stone-900/90 border-stone-600/80 text-stone-200'
              : 'bg-[#2a221c] border-amber-900/40 text-stone-300'
          }`}>
            <div className="flex items-center justify-between border-b border-amber-800/30 pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-amber-400">
                <MessageSquareQuote className="w-4 h-4 text-amber-400 shrink-0" />
                【{currentCaptiveInfo.generalName}】直面回應：
              </span>
              {recruitSuccess && (
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 【同意投降】
                </span>
              )}
              {recruitFailed && (
                <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> 【誓死不降】
                </span>
              )}
            </div>

            <p className="text-sm font-medium font-serif italic tracking-wide leading-relaxed pl-2 pt-1">
              {dialogueQuote || `「啟稟主公：城下生擒敵將【${currentCaptiveInfo.generalName}】，伏請主公示下如何處置！」`}
            </p>

            {feedbackMsg && (
              <div className="mt-1 pt-2 border-t border-amber-900/30 text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>{feedbackMsg}</span>
              </div>
            )}
          </div>

          {/* Recruitment success forecast bar if not yet acted */}
          {!recruitAttempted && !lastAction && (
            <div className="flex items-center justify-between text-xs text-stone-400 px-3 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/80">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>說服招降勝算：</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  evalResult.tagColor === 'rose'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                    : evalResult.tagColor === 'amber'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                }`}>
                  {evalResult.statusTag}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {evalResult.percent === 0 ? (
                  <span className="font-extrabold text-rose-400 text-sm flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> 0% (絕不背主)
                  </span>
                ) : (
                  <span className="font-extrabold text-amber-300 text-sm">
                    {evalResult.percent}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notice after refusal */}
          {recruitFailed && !lastAction && (
            <div className="bg-amber-950/40 border border-amber-600/50 p-2.5 rounded-lg text-xs font-bold text-amber-200 text-center animate-in fade-in flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>敵將堅貞不屈！建議【關押天牢】以圖後計，亦可選擇釋放或斬首：</span>
            </div>
          )}

          {/* Success action button */}
          {recruitSuccess && (
            <button
              onClick={handleNextCaptive}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 border border-amber-200 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer animate-pulse"
            >
              <span>【收歸麾下，處置下一位】</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Action Buttons Grid */}
          {!recruitSuccess && !lastAction && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Recruit Button */}
              <button
                onClick={() => handleAction('recruit')}
                disabled={recruitFailed || evalResult.percent === 0}
                className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border shadow-md flex items-center justify-center gap-2 transition-all ${
                  recruitFailed || evalResult.percent === 0
                    ? 'bg-stone-900 text-stone-500 border-stone-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 border-amber-300 active:scale-95 cursor-pointer'
                }`}
                title={evalResult.percent === 0 ? '敵君尚在且該將領誓死忠誠，無法在戰後立即招降，請先關押天牢！' : ''}
              >
                <UserCheck className="w-4 h-4" />
                {evalResult.percent === 0 ? '【誓死不降・難以招降】' : recruitFailed ? '【已拒絕投降】' : '【招降 / 說服】'}
              </button>

              {/* Imprison Button */}
              <button
                onClick={() => handleAction('imprison')}
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-600 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-sky-400" />
                【關押天牢】
              </button>

              {/* Release Button */}
              <button
                onClick={() => handleAction('release')}
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <UserX className="w-4 h-4 text-emerald-400" />
                【當場釋放】
              </button>

              {/* Execute Button */}
              <button
                onClick={() => handleAction('execute')}
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800/60 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Skull className="w-4 h-4 text-rose-400" />
                【斬首處決】
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

