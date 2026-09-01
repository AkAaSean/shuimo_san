import React, { useState, useEffect } from 'react';
import { GeneralState } from '../types';
import { Crown, ShieldAlert, UserCheck, Lock, UserX, Skull, Sparkles, MessageSquareQuote, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface PendingCaptive {
  generalName: string;
  capturedInProvinceId: number;
  winnerRuler: string;
  defeatedRuler: string;
  isEliminatedRuler?: boolean;
}

interface PostBattleCaptiveModalProps {
  pendingCaptives: PendingCaptive[];
  generalsData: Record<string, GeneralState>;
  playerRulerName: string;
  onCaptiveAction: (generalName: string, action: 'recruit' | 'imprison' | 'release' | 'execute') => { success: boolean; message: string };
  onClose: () => void;
}

function getSurrenderQuote(gen?: GeneralState): string {
  if (!gen) return `「感佩主公仁德恩威，某願投降，誓死效忠！」`;
  if (gen.str >= 85) return `「勝者為王，敗者為寇！主公神武無匹，某願降，隨主公橫掃天下！」`;
  if (gen.int >= 85) return `「主公明聖智勇，實乃天命之主。某願效犬馬之勞，獻微薄之力！」`;
  if (gen.pol >= 80) return `「天下苦戰久矣，今遇明主，某願披肝膽以效微勞！」`;
  return `「感佩主公仁德恩威，某願開懷請降！誓死效忠主公！」`;
}

function getRefusalQuote(gen?: GeneralState): string {
  if (!gen) return `「忠臣不事二主，何必多言！吾寧死不降！」`;
  if (gen.str >= 85) return `「吾乃當世猛將，安肯降汝！要殺便殺，休得口生花言！」`;
  if (gen.int >= 85) return `「忠臣不事二主，烈女不更二夫。閣下無須多言，某決不屈服！」`;
  if (gen.pol >= 80) return `「吾吃漢祿長大，食人之祿，忠人之事，豈能改投他門！」`;
  return `「哼！勝敗乃兵家常事，吾寧死不降！」`;
}

function getImprisonQuote(): string {
  return `「哼！死都不降，何懼區區牢獄之苦！」`;
}

function getReleaseQuote(): string {
  return `「承蒙主公不殺之恩，大恩不言謝，後會有期！」`;
}

function getExecuteQuote(): string {
  return `「天命如此，吾死何恨！某先去一步矣！」`;
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
  const playerCha = playerGen?.cha || 80;

  // 預估招降成功率
  const baseLoyalty = captiveGen?.loyalty ?? 50;
  const rawChance = (playerCha / 110) * (1 - baseLoyalty / 160);
  const recruitPercent = Math.min(95, Math.max(15, Math.round(rawChance * 100)));

  const handleAction = (action: 'recruit' | 'imprison' | 'release' | 'execute') => {
    if (action === 'recruit') {
      const res = onCaptiveAction(currentCaptiveInfo.generalName, 'recruit');
      setRecruitAttempted(true);

      if (res.success) {
        setRecruitSuccess(true);
        setRecruitFailed(false);
        setLastAction('recruit');
        setDialogueQuote(getSurrenderQuote(captiveGen));
        setFeedbackMsg(res.message);
      } else {
        setRecruitSuccess(false);
        setRecruitFailed(true);
        setDialogueQuote(getRefusalQuote(captiveGen));
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
          {/* Banner notice if elimination */}
          {currentCaptiveInfo.isEliminatedRuler && (
            <div className="bg-rose-950/60 border border-rose-600/60 rounded-xl p-3 flex items-center gap-2 text-rose-200 text-xs font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>敵方勢力【{currentCaptiveInfo.defeatedRuler}】已滅亡！城內將領全數被生擒！</span>
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
                <h3 className="text-lg font-black text-amber-100 tracking-wider">
                  {currentCaptiveInfo.generalName}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-amber-300 border border-amber-900/50">
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
                【{currentCaptiveInfo.generalName}】直面回答：
              </span>
              {recruitSuccess && (
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 【同意投降】
                </span>
              )}
              {recruitFailed && (
                <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> 【拒絕投降】
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
            <div className="flex items-center justify-between text-xs text-stone-400 px-1 bg-stone-900/40 p-2 rounded-lg border border-stone-800/80">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                說服投降勝算評估：
              </span>
              <span className="font-extrabold text-amber-300 text-sm">
                {recruitPercent}%
              </span>
            </div>
          )}

          {/* Notice after refusal */}
          {recruitFailed && !lastAction && (
            <div className="bg-amber-950/40 border border-amber-600/50 p-2.5 rounded-lg text-xs font-bold text-amber-200 text-center animate-in fade-in">
              💡 敵將堅貞拒不投降！請選擇其它處置方式（關押、釋放或斬首）：
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
                disabled={recruitFailed}
                className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recruitFailed
                    ? 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed line-through opacity-70'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 border-amber-300 active:scale-95'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {recruitFailed ? '【已拒絕投降】' : '【招降 / 說服】'}
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
