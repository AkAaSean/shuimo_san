import React, { useState, useEffect } from 'react';
import { GeneralState } from '../types';
import { Crown, ShieldAlert, UserCheck, Lock, UserX, Skull, Sparkles, MessageSquareQuote, ArrowRight, CheckCircle2, XCircle, Shield, AlertTriangle, Flame } from 'lucide-react';
import { calculateCaptiveRecruitChance } from '../engine/postBattleLogic';
import { soundPlayer } from '../utils/sound';

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

// 根據武將身分、個性與情境產出個性化台詞
function getImprisonQuote(generalName: string, defeatedRuler: string, isRuler: boolean): string {
  if (isRuler) {
    return `「成王敗寇，囚我何懼！孤之江山自有人繼，絕不向汝等屈節！」`;
  }
  if (['關羽', '張飛', '趙雲', '黃忠', '馬超'].includes(generalName)) {
    return `「大丈夫頂天立地，忠貫日月！縱身陷囹圄，亦絕不改忠烈之志！」`;
  }
  if (['諸葛亮', '龐統', '法正', '郭嘉', '荀彧', '周瑜', '陸遜'].includes(generalName)) {
    return `「幽室何妨閉智謀，胸藏甲兵自安流。休得多費唇舌，請將某下獄吧！」`;
  }
  if (['夏侯惇', '許褚', '典韋', '甘寧', '太史慈', '張遼'].includes(generalName)) {
    return `「哼！老子哪怕下了大獄，也休想讓老子說半句軟話！」`;
  }
  return `「哼！食君之祿忠君之事，某既遭擒，但求入獄全節，何懼區區囹圄之苦！」`;
}

function getReleaseQuote(generalName: string, playerRulerName: string): string {
  if (['關羽', '趙雲', '太史慈', '徐庶', '徐晃'].includes(generalName)) {
    return `「將軍真乃當世明公！承蒙不殺寬縱大恩，某深感五內，他日若相逢定報此義！」`;
  }
  if (['張遼', '高順', '龐德', '嚴顏'].includes(generalName)) {
    return `「明公寬宏仁德，義薄雲天！某此去山高水長，後會有期！」`;
  }
  if (['孟獲', '董荼那', '阿會喃'].includes(generalName)) {
    return `「將軍竟真放我歸去？好！某心服口服，感念恩德！」`;
  }
  return `「承蒙【${playerRulerName}】殿下不殺宏恩！某感佩公之仁義，來日方長，後會有期！」`;
}

function getExecuteQuote(generalName: string, defeatedRuler: string, isRuler: boolean): string {
  if (isRuler) {
    return `「【${defeatedRuler}】寧為玉碎，不為瓦全！今日孤死社稷，黃泉之下誓滅汝賊！動手吧！」`;
  }
  if (['關羽', '張飛', '趙雲', '黃忠', '周倉', '關平'].includes(generalName)) {
    return `「頭可斷，血可流，忠義之節不可奪！主公，末將先去九泉為您開路矣！」`;
  }
  if (['陳宮', '審配', '沮授', '田豐', '張任'].includes(generalName)) {
    return `「生為漢將，死作漢鬼！忠臣不事二主，今日得死，求仁得仁，快哉！」`;
  }
  if (['高順', '龐德', '顏良', '文醜', '典韋'].includes(generalName)) {
    return `「十八年後又是一條好漢！主公，末將寧死不降，誓隨主公到底！」`;
  }
  if (['夏侯淵', '夏侯惇', '曹仁', '曹洪', '周瑜', '孫策'].includes(generalName)) {
    return `「蒼天有眼，豈容奸佞久猖狂！某死何足惜，只恨未能親手蕩平天下！」`;
  }
  return `「天命已盡，吾死何恨！【${defeatedRuler}】主公，某盡忠報國，先來一步矣！」`;
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
  const [isExecutingVFX, setIsExecutingVFX] = useState<boolean>(false);

  const currentCaptiveInfo = pendingCaptives && pendingCaptives.length > 0 ? pendingCaptives[0] : null;

  // 當切換到下一個俘虜時，重置所有對話與狀態
  useEffect(() => {
    setRecruitAttempted(false);
    setRecruitFailed(false);
    setRecruitSuccess(false);
    setDialogueQuote(null);
    setFeedbackMsg(null);
    setLastAction(null);
    setIsExecutingVFX(false);
  }, [currentCaptiveInfo?.generalName]);

  if (!pendingCaptives || pendingCaptives.length === 0 || !currentCaptiveInfo) {
    return null;
  }

  const captiveGen = generalsData[currentCaptiveInfo.generalName];
  const playerGen = (Object.values(generalsData) as GeneralState[]).find(g => g && g.name === playerRulerName);

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
        soundPlayer.play('recruit');
        setRecruitSuccess(true);
        setRecruitFailed(false);
        setLastAction('recruit');
        setDialogueQuote(evalResult.surrenderQuote);
        setFeedbackMsg(res.message);
      } else {
        soundPlayer.play('slash');
        setRecruitSuccess(false);
        setRecruitFailed(true);
        setDialogueQuote(evalResult.refusalQuote);
        setFeedbackMsg(res.message);
      }
      return;
    }

    // 播放專屬音效
    if (action === 'execute') {
      soundPlayer.play('execute');
      setIsExecutingVFX(true);
    } else if (action === 'imprison') {
      soundPlayer.play('imprison');
    } else if (action === 'release') {
      soundPlayer.play('release');
    }

    // 選擇關押/釋放/處決
    const res = onCaptiveAction(currentCaptiveInfo.generalName, action);
    setLastAction(action);
    setFeedbackMsg(res.message);

    if (action === 'imprison') {
      setDialogueQuote(getImprisonQuote(currentCaptiveInfo.generalName, currentCaptiveInfo.defeatedRuler, isRulerSelf));
    } else if (action === 'release') {
      setDialogueQuote(getReleaseQuote(currentCaptiveInfo.generalName, playerRulerName));
    } else if (action === 'execute') {
      setDialogueQuote(getExecuteQuote(currentCaptiveInfo.generalName, currentCaptiveInfo.defeatedRuler, isRulerSelf));
    }

    // 處決或處置後延遲進入下一個俘虜或關閉 (給予閱讀對話與感受音效時間)
    const delayTime = action === 'execute' ? 2000 : 1500;
    setTimeout(() => {
      setIsExecutingVFX(false);
      if (pendingCaptives.length <= 1) {
        onClose();
      }
    }, delayTime);
  };

  const handleNextCaptive = () => {
    if (pendingCaptives.length <= 1) {
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 ${
      isExecutingVFX ? 'bg-red-950/90' : ''
    }`}>
      {/* 斬首處決時全螢幕血色斬擊波與震動特效 */}
      {isExecutingVFX && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center animate-pulse">
          <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_50px_rgba(239,68,68,1)] rotate-[-25deg] scale-150 transform animate-ping" />
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent rotate-[-25deg] scale-125" />
          <div className="absolute top-10 text-center font-black font-serif text-3xl sm:text-5xl text-red-500 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] tracking-widest animate-bounce">
            ⚔️ 推出轅門 ‧ 斬首示眾！
          </div>
        </div>
      )}

      <div className={`bg-[#1b1511] border-2 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isExecutingVFX
          ? 'border-red-600 scale-102 ring-4 ring-red-600/50 shadow-red-950/80 animate-shake'
          : lastAction === 'execute'
          ? 'border-red-700/80'
          : 'border-amber-600/80 animate-in fade-in zoom-in'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center transition-colors duration-300 ${
          isExecutingVFX
            ? 'bg-gradient-to-r from-red-950 via-red-900 to-stone-900 border-red-500/80'
            : 'bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 border-amber-600/50'
        }`}>
          <div className="flex items-center gap-2">
            {isExecutingVFX ? (
              <Skull className="w-6 h-6 text-red-400 animate-bounce" />
            ) : (
              <Crown className="w-6 h-6 text-amber-400" />
            )}
            <h2 className={`text-xl font-black tracking-wide font-serif ${
              isExecutingVFX ? 'text-red-200' : 'text-amber-200'
            }`}>
              {isExecutingVFX ? '⚔️ 轅門斬首行刑' : '戰後俘虜處置'}
            </h2>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border font-bold ${
            isExecutingVFX
              ? 'bg-red-900/60 text-red-200 border-red-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}>
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
          <div className={`border rounded-xl p-4 flex items-center gap-4 shadow-lg transition-colors duration-300 ${
            isExecutingVFX ? 'bg-red-950/50 border-red-700/60' : 'bg-[#241c16] border-amber-900/40'
          }`}>
            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shrink-0 shadow-inner ${
              isExecutingVFX ? 'bg-red-950 border-red-500 text-red-300' : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
            }`}>
              <span className="text-2xl font-black font-serif">
                {currentCaptiveInfo.generalName.substring(0, 1)}
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-black tracking-wider ${
                    isExecutingVFX ? 'text-red-200 line-through' : 'text-amber-100'
                  }`}>
                    {currentCaptiveInfo.generalName}
                  </h3>
                  {isRulerSelf && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 font-bold border border-rose-600">
                      敵軍君主
                    </span>
                  )}
                  {isExecutingVFX && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-800 text-red-100 font-bold border border-red-500 animate-pulse">
                      已處決
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
            isExecutingVFX || lastAction === 'execute'
              ? 'bg-red-950/70 border-red-600 text-red-200 shadow-lg'
              : recruitSuccess
              ? 'bg-amber-950/60 border-amber-500/80 text-amber-200'
              : recruitFailed
              ? 'bg-rose-950/60 border-rose-600/80 text-rose-200'
              : lastAction === 'imprison'
              ? 'bg-stone-900/90 border-sky-600/80 text-sky-200'
              : lastAction === 'release'
              ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-200'
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
              {lastAction === 'imprison' && (
                <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1">
                  <Lock className="w-4 h-4" /> 【收入天牢】
                </span>
              )}
              {lastAction === 'release' && (
                <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                  <UserX className="w-4 h-4" /> 【當場釋放】
                </span>
              )}
              {(isExecutingVFX || lastAction === 'execute') && (
                <span className="text-xs font-extrabold text-red-400 flex items-center gap-1">
                  <Skull className="w-4 h-4" /> 【處決斬首】
                </span>
              )}
            </div>

            <p className="text-sm sm:text-base font-medium font-serif italic tracking-wide leading-relaxed pl-2 pt-1">
              {dialogueQuote || `「啟稟主公：城下生擒敵將【${currentCaptiveInfo.generalName}】，伏請主公示下如何處置！」`}
            </p>

            {feedbackMsg && (
              <div className={`mt-1 pt-2 border-t text-xs font-bold flex items-center gap-1.5 ${
                isExecutingVFX || lastAction === 'execute'
                  ? 'border-red-800 text-red-300'
                  : lastAction === 'imprison'
                  ? 'border-sky-900 text-sky-300'
                  : lastAction === 'release'
                  ? 'border-emerald-900 text-emerald-300'
                  : 'border-amber-900/30 text-amber-300'
              }`}>
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


