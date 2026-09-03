import { GameState, GeneralState, ProvinceState } from '../types';
import { provinces } from '../data/provinces';

/**
 * 歷史死忠將領／宗族親信名錄
 * 當原君主健在時，此類將領具備死節大義，戰場被俘時誓死不降 (招降率 = 0%)
 */
export const DIE_HARD_LOYALISTS: Record<string, string[]> = {
  '劉備': ['關羽', '張飛', '趙雲', '諸葛亮', '龐統', '劉封', '關平', '關興', '張苞', '簡雍', '糜竺', '孫乾', '法正', '馬良', '黃忠', '魏延'],
  '曹操': ['夏侯惇', '夏侯淵', '曹仁', '曹洪', '曹真', '曹休', '曹丕', '曹植', '典韋', '許褚', '荀彧', '荀攸', '郭嘉', '程昱', '賈詡', '于禁', '樂進', '李典', '張遼'],
  '孫堅': ['孫策', '孫權', '孫尚香', '周瑜', '黃蓋', '程普', '韓當', '太史慈', '甘寧', '魯肅', '陸遜', '呂蒙', '張昭', '朱治'],
  '孫策': ['孫權', '孫尚香', '周瑜', '黃蓋', '程普', '韓當', '太史慈', '甘寧', '魯肅', '大喬', '小喬', '張昭', '張紘'],
  '孫權': ['周瑜', '黃蓋', '程普', '韓當', '太史慈', '甘寧', '魯肅', '陸遜', '呂蒙', '諸葛瑾', '凌統', '丁奉', '徐盛', '張昭'],
  '袁紹': ['袁譚', '袁熙', '袁尚', '審配', '逢紀', '田豐', '沮授', '顏良', '文醜', '高覽'],
  '董卓': ['李傕', '郭汜', '華雄', '牛輔', '李儒', '徐榮'],
  '呂布': ['陳宮', '高順', '張遼', '貂蟬'],
  '馬騰': ['馬超', '馬岱', '龐德', '馬鐵', '馬休'],
  '馬超': ['馬岱', '龐德'],
  '劉表': ['劉琦', '劉琮', '蔡瑁', '蒯越', '黃祖', '文聘'],
  '劉璋': ['張任', '嚴顏', '李嚴', '吳懿', '黃權', '孟達'],
  '公孫瓚': ['公孫越', '公孫範', '田豫', '嚴綱']
};

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

export interface CaptiveRecruitEvaluation {
  chance: number; // 0.0 ~ 1.0
  percent: number; // 0 ~ 100
  isDieHard: boolean;
  statusTag: string;
  tagColor: 'rose' | 'amber' | 'emerald' | 'stone';
  refusalQuote: string;
  surrenderQuote: string;
}

/**
 * 精準計算戰後俘虜招降成功率與專屬情境語音
 * 核心規則：君主健在時，忠誠將領具備「忠臣不事二主」氣節，幾乎不可當場勸降！
 */
export function calculateCaptiveRecruitChance(
  captive: GeneralState,
  winnerRulerName: string,
  winnerRulerGen: GeneralState | null,
  defeatedRuler: string,
  isFactionEliminated: boolean,
  isRulerSelf: boolean
): CaptiveRecruitEvaluation {
  const winnerCha = winnerRulerGen?.cha || 80;
  const captiveLoyalty = captive.loyalty ?? 50;
  const dieHards = DIE_HARD_LOYALISTS[defeatedRuler] || [];
  const isDieHardLoyalist = dieHards.includes(captive.name);
  
  // 檢查是否同宗族姓氏
  const defeatedSurname = defeatedRuler.substring(0, 1);
  const captiveSurname = captive.name.substring(0, 1);
  const isSameClan = defeatedSurname === captiveSurname && (defeatedSurname === '曹' || defeatedSurname === '孫' || defeatedSurname === '劉' || defeatedSurname === '袁' || defeatedSurname === '馬');

  // --- 情況 1: 被俘虜者即為敵方君主本人 ---
  if (isRulerSelf || captive.isRuler) {
    if (!isFactionEliminated) {
      // 君主被擒但勢力尚存：100% 拒降
      return {
        chance: 0,
        percent: 0,
        isDieHard: true,
        statusTag: '霸主死節 (誓不為俘)',
        tagColor: 'rose',
        refusalQuote: `「孤乃一國之主，三軍尚在！縱受困於此，亦絕不向汝屈膝稱臣！要殺便殺，何須多言！」`,
        surrenderQuote: `「天命已盡...某願降。」`
      };
    } else {
      // 君主被擒且勢力已被完全滅亡
      const ambition = captive.ambition || 5;
      if (ambition >= 7) {
        // 梟雄（曹操/呂布/董卓/袁紹等）：誓死不降
        return {
          chance: 0,
          percent: 0,
          isDieHard: true,
          statusTag: '梟雄絕節 (寧死不屈)',
          tagColor: 'rose',
          refusalQuote: `「成王敗寇！孤縱戰敗失國，亦決不降於宵小之輩！請速賜某一死，全孤名節！」`,
          surrenderQuote: `「大事已去，某願乞殘生...」`
        };
      } else if (ambition >= 5) {
        // 一般君主滅國：機率極低 (2% ~ 5%)
        const chance = Math.min(0.05, Math.max(0.01, (winnerCha / 120) * 0.04));
        const percent = Math.round(chance * 100);
        return {
          chance,
          percent,
          isDieHard: true,
          statusTag: '君王受縛 (極難招降)',
          tagColor: 'rose',
          refusalQuote: `「昔日孤與閣下平起平坐，今為階下囚，顏面何存！誓不事二主！」`,
          surrenderQuote: `「國破山河在...感念公不殺之恩，某願退隱或隨侍駕前，聽憑發落。」`
        };
      } else {
        // 庸弱君主（如劉璋/劉表/韓馥等）：滅國後有一定機率願降
        const chance = Math.min(0.35, Math.max(0.10, (winnerCha / 100) * 0.30));
        const percent = Math.round(chance * 100);
        return {
          chance,
          percent,
          isDieHard: false,
          statusTag: '國破請降',
          tagColor: 'amber',
          refusalQuote: `「容某思量幾日...心中悲慟，恕難立即奉詔。」`,
          surrenderQuote: `「天命已歸明公！某願交出玉璽符節，開城納降，但求保全族人性命！」`
        };
      }
    }
  }

  // --- 情況 2: 原君主尚在人間，勢力未滅 (玩家與敵國仍在交戰) ---
  if (!isFactionEliminated) {
    // A. 宗族親信 / 歷史死忠 (關張趙夏侯曹仁周瑜等) / 忠誠 >= 95
    if (isDieHardLoyalist || isSameClan || captiveLoyalty >= 95) {
      return {
        chance: 0,
        percent: 0,
        isDieHard: true,
        statusTag: '舊主健在・誓死不降',
        tagColor: 'rose',
        refusalQuote: `「吾主【${defeatedRuler}】待某恩重如山！主公尚在，某身為堂堂大將，豈能做背主偷生之犬！休得多費唇舌！」`,
        surrenderQuote: `「感公宏恩，某願降服！」`
      };
    }

    // B. 高忠誠將領 (忠誠 85 ~ 94)：極難動搖 (1% ~ 4%)
    if (captiveLoyalty >= 85) {
      const chance = Math.max(0.01, Math.min(0.04, (winnerCha / 130) * 0.04));
      const percent = Math.round(chance * 100);
      return {
        chance,
        percent,
        isDieHard: true,
        statusTag: '君主健在・忠義難移',
        tagColor: 'rose',
        refusalQuote: `「食人之祿，忠人之事。主公【${defeatedRuler}】健在，某安肯事二主！要殺便殺，某何懼死！」`,
        surrenderQuote: `「將軍神勇仁厚，真英雄也！某雖愧對故主，亦願隨將軍建功立業！」`
      };
    }

    // C. 中忠誠將領 (忠誠 70 ~ 84)：低成功率 (8% ~ 15%)
    if (captiveLoyalty >= 70) {
      const chance = Math.max(0.05, Math.min(0.18, (winnerCha / 120) * 0.15 * (1 - (captiveLoyalty - 70) / 40)));
      const percent = Math.round(chance * 100);
      return {
        chance,
        percent,
        isDieHard: false,
        statusTag: '君主健在・意向堅定',
        tagColor: 'amber',
        refusalQuote: `「吾主【${defeatedRuler}】尚在，某豈能隨意改投他營？閣下休要再勸，請將某下獄吧。」`,
        surrenderQuote: `「感佩主公神武威德，既蒙不棄，某願開懷請降，誓效犬馬！」`
      };
    }

    // D. 低忠誠 / 異心將領 (忠誠 < 70)：容易動搖招降 (30% ~ 55%)
    const chance = Math.min(0.60, Math.max(0.25, (winnerCha / 110) * (0.35 + (70 - captiveLoyalty) * 0.008)));
    const percent = Math.round(chance * 100);
    return {
      chance,
      percent,
      isDieHard: false,
      statusTag: '良禽擇木・意向動搖',
      tagColor: 'emerald',
      refusalQuote: `「某身為將領，雖有不甘，但仍念舊主幾分薄恩...恕某暫時難以從命。」`,
      surrenderQuote: `「良禽擇木而棲，賢臣擇主而事！吾主【${defeatedRuler}】不能用某，今逢明公，某願誓死效忠！」`
    };
  }

  // --- 情況 3: 原敵方勢力已完全滅亡 (滅國大捷，故主已亡) ---
  // A. 死忠名將 / 極高忠誠 (loyalty >= 95)
  if (isDieHardLoyalist || captiveLoyalty >= 95) {
    const chance = Math.min(0.40, Math.max(0.15, (winnerCha / 120) * 0.30));
    const percent = Math.round(chance * 100);
    return {
      chance,
      percent,
      isDieHard: false,
      statusTag: '故國已亡・忠魂未泯',
      tagColor: 'amber',
      refusalQuote: `「先主【${defeatedRuler}】屍骨未寒，故國社稷已傾...某心中悲痛欲絕，豈能轉瞬侍奉仇讎！請主公賜某自盡！」`,
      surrenderQuote: `「國破家亡，先主已歿...感蒙明公寬厚不殺之宏恩，某願以殘軀相報，誓死效忠！」`
    };
  }

  // B. 普通將領滅國歸順 (忠誠 70 ~ 94)：較高成功率 (45% ~ 70%)
  if (captiveLoyalty >= 70) {
    const chance = Math.min(0.75, Math.max(0.40, (winnerCha / 110) * (0.70 - (captiveLoyalty - 70) * 0.01)));
    const percent = Math.round(chance * 100);
    return {
      chance,
      percent,
      isDieHard: false,
      statusTag: '國破歸降',
      tagColor: 'emerald',
      refusalQuote: `「舊主甫亡，某心情繁亂，請寬限數日，容某閉門思量...」`,
      surrenderQuote: `「大勢所趨，天命在公！某願棄暗投明，歸順麾下，為主公一統天下效力！」`
    };
  }

  // C. 低忠誠將領滅國 (忠誠 < 70)：極高成功率 (75% ~ 95%)
  const chance = Math.min(0.95, Math.max(0.65, (winnerCha / 100) * 0.85));
  const percent = Math.round(chance * 100);
  return {
    chance,
    percent,
    isDieHard: false,
    statusTag: '即刻歸附',
    tagColor: 'emerald',
    refusalQuote: `「某尚需些許時日清理私事，過些時日再行投效。」`,
    surrenderQuote: `「敗軍之將，蒙主公宏恩收留，某願立誓效死，赴湯蹈火在所不辭！」`
  };
}

/**
 * AI automatic decision tree for captive post-battle processing
 */
export function processAICaptiveDecision(
  captive: GeneralState,
  winnerRulerName: string,
  winnerRulerGen: GeneralState | null,
  targetProvinceId: number,
  isFactionEliminated: boolean,
  isRulerSelf: boolean,
  defeatedRulerName?: string
): { action: 'recruit' | 'imprison' | 'execute' | 'release'; log: string } {
  const winnerCha = winnerRulerGen?.cha || 75;
  const winnerAmbition = winnerRulerGen?.ambition || 5;
  const targetRuler = defeatedRulerName || captive.originalRulerName || '敵君';

  // 計算招降成功率與評估
  const evalResult = calculateCaptiveRecruitChance(
    captive,
    winnerRulerName,
    winnerRulerGen,
    targetRuler,
    isFactionEliminated,
    isRulerSelf
  );

  // 1. 嘗試招降 (Recruit)
  if (Math.random() < evalResult.chance) {
    return {
      action: 'recruit',
      log: `【招降】${winnerRulerName} 憑藉天命皇威，成功說服俘虜【${captive.name}】，【${captive.name}】感佩恩德宣誓效忠！`
    };
  }

  // 2. 判斷處決 (Execute) - 暴虐野心君主 (ambition >= 7) 對陣極度仇恨/滅國敵首或拒降君主
  if ((isFactionEliminated && isRulerSelf) || (captive.isRuler && winnerAmbition >= 7)) {
    if (Math.random() < 0.6) {
      return {
        action: 'execute',
        log: `【處決】${winnerRulerName} 破城後，下令將拒不屈服的敵軍首領【${captive.name}】推出斬首示眾！`
      };
    }
  }

  // 3. 仁德君主釋放 (Release) - 魅力 >= 90 (如劉備)
  if (winnerCha >= 90 && Math.random() < 0.35) {
    return {
      action: 'release',
      log: `【釋放】${winnerRulerName} 展現仁德仁心，將寧死不屈的俘虜【${captive.name}】當場解縛釋放！`
    };
  }

  // 4. 預設收押天牢 (Imprison)
  return {
    action: 'imprison',
    log: `【收押】${winnerRulerName} 將俘虜【${captive.name}】押入城池天牢監禁。`
  };
}

