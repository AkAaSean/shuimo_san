import * as fs from 'fs';

const filePath = 'src/engine/gameLogic.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const processAITurnRegex = /export function processAITurn\(state: GameState\): GameState \{[\s\S]*?return newState;\n\}/;

const executeAIFunc = `
function executeProvinceAI(
  updatedP: ProvinceState, 
  newState: GameState, 
  rulerName: string, 
  isAutonomousPlayer: boolean
) {
  const tierRules = getProvinceTierRules(updatedP.id);
  const aiGenerals = Object.values(newState.generalsData).filter(
    g => g.provinceId === updatedP.id && !g.hasActed && !g.isWild && !g.activeTask && g.rulerName === rulerName
  );

  // 1. 若無將領，極簡保底
  if (aiGenerals.length === 0) {
     if (updatedP.flood > 50 && updatedP.gold >= 100) {
        updatedP.gold -= 100;
        updatedP.flood -= 5;
     } else if (updatedP.loyalty < 50 && updatedP.food >= 1000) {
        updatedP.food -= 1000;
        updatedP.loyalty += 5;
     }
     return;
  }

  // 排序：結合政治與智力 (對於徵兵，武將也有用，後續分流)
  aiGenerals.sort((a, b) => (b.pol + b.int) - (a.pol + a.int));

  // 動態安全兵力上限
  // 1. 武將總帶兵上限
  const maxTroopCapacity = aiGenerals.reduce((sum, g) => sum + (g.maxTroops || 10000), 0) + 10000; // 基礎 1萬預備兵空間
  // 2. 預估秋收量 (除以 1.2 作為絕對安全線)
  const estHarvest = getEstimatedAnnualFood(updatedP);
  const safeTroopLimitByFood = Math.floor(estHarvest / 1.2);
  // 3. 不超過人口的 15%
  const popLimit = Math.floor(updatedP.population * 0.15);

  const targetTroops = Math.max(0, Math.min(maxTroopCapacity, safeTroopLimitByFood, popLimit));
  
  const currentTroops = (updatedP.soldiers || 0) + aiGenerals.reduce((sum, g) => sum + (g.soldiers || 0), 0);

  // 判定當前階段
  const isPhase1 = currentTroops < targetTroops * 0.5;
  const isPhase2 = !isPhase1 && (updatedP.value < tierRules.maxDev * 0.33 || (updatedP.commerce || 50) < tierRules.maxCommerce * 0.33);
  const isPhase3 = !isPhase1 && !isPhase2 && currentTroops < targetTroops * 0.8;
  const isPhase4 = !isPhase1 && !isPhase2 && !isPhase3;

  aiGenerals.forEach(g => {
      const gen = { ...g };
      const polFactor = Math.floor(Math.pow(Math.max(0, gen.pol) / 100, 3) * 12) || 1;
      const chaFactor = Math.floor(Math.pow(Math.max(0, gen.cha) / 100, 3) * 12) || 1;
      const leaFactor = Math.floor(Math.pow(Math.max(0, gen.str) / 100, 3) * 12) || 1;

      let actionTaken = false;

      // 優先級 0: 災後重建 (賑災與治水，這是生存根基，永遠最高)
      if (!actionTaken && updatedP.loyalty < 65 && updatedP.food >= 1500) {
          updatedP.food -= 1000;
          const loyaltyGain = Math.floor(gen.cha / 10) + 2;
          updatedP.loyalty = Math.min(100, updatedP.loyalty + loyaltyGain);
          actionTaken = true;
      }
      if (!actionTaken && updatedP.flood > 30 && updatedP.gold >= 100) {
          updatedP.gold -= 100;
          const decrease = Math.max(1, polFactor) + Math.floor(Math.random() * 4) + 1;
          updatedP.flood = Math.max(0, updatedP.flood - decrease);
          actionTaken = true;
      }

      // 優先級 1: 尋訪與錄用在野武將 (資金充裕時，擴充人才庫)
      if (!actionTaken && updatedP.gold >= 300 && Math.random() < 0.25) {
         const wildInProvince = Object.values(newState.generalsData).filter(
           wg => wg.isWild && wg.provinceId === updatedP.id
         );
         const undiscovered = wildInProvince.filter(
           wg => !(newState.wildGenerals || []).includes(wg.name)
         );
         if (undiscovered.length > 0) {
            const target = undiscovered[0];
            const targetGen = { ...target };
            const hireChance = 0.35 + ((gen.cha - targetGen.int) * 0.01);
            
            if (Math.random() < hireChance) {
               targetGen.isWild = false;
               targetGen.rulerName = rulerName;
               targetGen.loyalty = 85; 
               newState.generalsData[targetGen.name] = targetGen;
            } else {
               newState.wildGenerals = [...(newState.wildGenerals || []), targetGen.name];
            }
            actionTaken = true;
         } else {
             const discovered = wildInProvince.filter(
               wg => (newState.wildGenerals || []).includes(wg.name)
             );
             if (discovered.length > 0) {
                const target = discovered[0];
                const targetGen = { ...target };
                const hireChance = 0.4 + ((gen.cha - targetGen.int) * 0.01);
                if (Math.random() < hireChance) {
                   targetGen.isWild = false;
                   targetGen.rulerName = rulerName;
                   targetGen.loyalty = 80; 
                   newState.generalsData[targetGen.name] = targetGen;
                   actionTaken = true;
                }
             }
         }
      }

      // 各階段核心行為分流
      const doDraft = () => {
          if (!updatedP.hasDraftedThisMonth && updatedP.gold >= 200 && updatedP.population >= tierRules.minPopulation + 3000) {
              const maxDraft = Math.min((gen.cha + 50) * 15, 3000); 
              const amount = Math.min(maxDraft, updatedP.population - tierRules.minPopulation, Math.floor(updatedP.gold * 10), Math.max(0, targetTroops - currentTroops));
              
              if (amount >= 500) {
                 const goldCost = Math.floor(amount / 10);
                 updatedP.gold -= goldCost;
                 updatedP.population -= amount;
                 
                 const spaceInGen = (gen.maxTroops || 10000) - (gen.soldiers || 0);
                 if (spaceInGen > 0) {
                    const toGen = Math.min(spaceInGen, amount);
                    gen.soldiers = (gen.soldiers || 0) + toGen;
                    updatedP.soldiers = (updatedP.soldiers || 0) + (amount - toGen);
                 } else {
                    updatedP.soldiers = (updatedP.soldiers || 0) + amount;
                 }

                 updatedP.loyalty = Math.max(0, updatedP.loyalty - 3);
                 updatedP.hasDraftedThisMonth = true;
                 return true;
              }
          }
          return false;
      };

      const doTrain = () => {
          if ((gen.soldiers || 0) > 0 && (gen.training || 0) < 80) {
              const increase = Math.max(1, leaFactor) + Math.floor(Math.random() * 5);
              gen.training = Math.min(100, (gen.training || 0) + increase);
              return true;
          } else if ((updatedP.soldiers || 0) > 0 && (updatedP.training || 0) < 80) {
              const increase = Math.max(1, leaFactor) + Math.floor(Math.random() * 5);
              updatedP.training = Math.min(100, (updatedP.training || 0) + increase);
              return true;
          }
          return false;
      };

      const doDomestic = () => {
          if (updatedP.gold >= 100) {
              const needsFarming = updatedP.value < tierRules.maxDev;
              const needsCommerce = (updatedP.commerce || 50) < tierRules.maxCommerce;
              
              const doFarming = () => {
                  updatedP.gold -= 100;
                  updatedP.value = Math.min(tierRules.maxDev, updatedP.value + Math.max(1, polFactor) + Math.floor(Math.random() * 4));
              };
              const doCommerce = () => {
                  updatedP.gold -= 100;
                  updatedP.commerce = Math.min(tierRules.maxCommerce, (updatedP.commerce || 50) + Math.max(1, polFactor) + Math.floor(Math.random() * 4));
              };

              if (needsFarming && needsCommerce) {
                  Math.random() < 0.5 ? doFarming() : doCommerce();
                  return true;
              } else if (needsFarming) {
                  doFarming(); return true;
              } else if (needsCommerce) {
                  doCommerce(); return true;
              }
          }
          return false;
      };

      if (!actionTaken) {
          if (isPhase1) {
              // 階段1: 絕對軍事優先 (徵兵 -> 訓練 -> 內政補底)
              actionTaken = doDraft() || doTrain() || doDomestic();
          } else if (isPhase2) {
              // 階段2: 鞏固基底 (停止徵兵，全力內政與訓練)
              if (gen.pol > gen.str) {
                  actionTaken = doDomestic() || doTrain();
              } else {
                  actionTaken = doTrain() || doDomestic();
              }
          } else if (isPhase3) {
              // 階段3: 深度備戰 (重啟徵兵，擴軍為主)
              if (gen.str > gen.pol) {
                  actionTaken = doDraft() || doTrain() || doDomestic();
              } else {
                  actionTaken = doDomestic() || doDraft() || doTrain();
              }
          } else {
              // 階段4: 富國強兵 (軍政雙行)
              if (gen.str > gen.pol) {
                  actionTaken = doDraft() || doTrain() || doDomestic();
              } else {
                  actionTaken = doDomestic() || doTrain() || doDraft();
              }
          }
      }

      gen.hasActed = true; 
      newState.generalsData[gen.name] = gen;
  });
}

export function processAITurn(state: GameState): GameState {
  let newState = { 
     ...state, 
     provincesData: { ...state.provincesData }, 
     generalsData: { ...state.generalsData } 
  };
  
  Object.values(newState.provincesData).forEach(p => {
    const isEnemyAI = p.rulerName && p.rulerName !== state.rulerName;
    const isPlayerAutonomous = p.rulerName === state.rulerName && p.isAutonomous;
    
    if (isEnemyAI || isPlayerAutonomous) {
       let updatedP = { ...p };
       executeProvinceAI(updatedP, newState, p.rulerName!, isPlayerAutonomous);
       newState.provincesData[p.id] = updatedP;
    }
  });

  return newState;
}
`;

code = code.replace(processAITurnRegex, executeAIFunc.trim());

// Also remove the old autonomy logic from advanceTime
const autonomyRegex = /\s*\/\/\s*3\.5\s*玩家『郡縣自治』每月太守自動施政[\s\S]*?(?=\s*newState\.provincesData\[p\.id\] = updatedP;)/;
code = code.replace(autonomyRegex, '\n     ');

fs.writeFileSync(filePath, code);
