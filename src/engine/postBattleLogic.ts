import { GameState, GeneralState, ProvinceState } from '../types';
import { provinces } from '../data/provinces';

/**
 * Calculates captive probability for a defeated general
 */
export function calculateCaptiveRate(
  general: GeneralState,
  isWipedOut: boolean,
  isIsolatedCity: boolean,
  isElimination: boolean
): number {
  // 名馬/退路特技：100% 逃脫
  if (general.hasRedHare) {
    return 0;
  }

  // 敵方僅剩最後一城（滅國戰）：留在城內者 100% 全部被俘虜
  if (isElimination) {
    return 1.0;
  }

  // 基礎俘虜率：部隊潰散 50%，敗退 20%
  let baseRate = isWipedOut ? 0.50 : 0.20;

  // 孤城無路可退加成：+30%
  if (isIsolatedCity) {
    baseRate += 0.30;
  }

  // 武將能力抗性：高武力/高統率 (str >= 85 或 hp >= 85) 突圍抗性 -15%
  if (general.str >= 85 || general.hp >= 85) {
    baseRate -= 0.15;
  }

  return Math.min(0.95, Math.max(0.05, baseRate));
}

/**
 * Checks if a city is isolated (no adjacent connected provinces owned by the same ruler)
 */
export function isCityIsolated(provinceId: number, rulerName: string, provincesData: Record<number, ProvinceState>): boolean {
  const pBase = provinces.find(p => p.id === provinceId);
  if (!pBase) return false;
  return !pBase.connections.some(connId => provincesData[connId]?.rulerName === rulerName && connId !== provinceId);
}

/**
 * AI automatic decision tree for captive post-battle processing
 */
export function processAICaptiveDecision(
  captive: GeneralState,
  winnerRulerName: string,
  winnerRulerGen: GeneralState | null,
  targetProvinceId: number,
  isEliminatedRuler: boolean
): { action: 'recruit' | 'imprison' | 'execute' | 'release'; log: string } {
  const winnerCha = winnerRulerGen?.cha || 75;
  const winnerAmbition = winnerRulerGen?.ambition || 5;

  // 1. 嘗試招降 (Recruit)
  const recruitChance = Math.max(0.10, (winnerCha / 120) * (1 - captive.loyalty / 150));
  if (Math.random() < recruitChance) {
    return {
      action: 'recruit',
      log: `【招降】${winnerRulerName} 說服了俘虜【${captive.name}】，【${captive.name}】宣誓效忠！`
    };
  }

  // 2. 判斷處決 (Execute) - 暴虐野心君主對陣極度仇恨/滅國敵首
  if ((isEliminatedRuler || captive.isRuler) && winnerAmbition >= 7 && Math.random() < 0.5) {
    return {
      action: 'execute',
      log: `【處決】${winnerRulerName} 破城後，下令將俘虜敵將【${captive.name}】斬首示眾！`
    };
  }

  // 3. 仁德君主釋放 (Release)
  if (winnerCha >= 90 && Math.random() < 0.3) {
    return {
      action: 'release',
      log: `【釋放】${winnerRulerName} 展現仁德，將俘虜【${captive.name}】當場釋放！`
    };
  }

  // 4. 預設收押天牢 (Imprison)
  return {
    action: 'imprison',
    log: `【收押】${winnerRulerName} 將俘虜【${captive.name}】押入城池天牢監禁。`
  };
}
