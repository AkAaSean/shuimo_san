const fs = require('fs');
let code = fs.readFileSync('src/engine/useGameEngine.ts', 'utf8');

// 1. Modify nextMonth
code = code.replace(
  `// 2. 無戰役則正常推進時光進入下個月
      return advanceTime(prev);`,
  `// 2. 無戰役則正常推進時光進入下個月
      const nextMonthState = advanceTime(prev);
      
      // 3. 檢查是否有 AI 發起的攻擊 (玩家防守戰)
      if (nextMonthState.pendingDefenses && nextMonthState.pendingDefenses.length > 0) {
        const list = nextMonthState.pendingDefenses;
        const [firstBattle, ...remainingBattles] = list;
        
        const atkStrategist = getBestStrategistForBattle(
          firstBattle.attackerStrategist,
          firstBattle.attackingGenerals,
          nextMonthState.generalsData,
          nextMonthState.currentScenario
        );
        const defStrategist = getBestStrategistForBattle(
          firstBattle.defenderStrategist,
          firstBattle.defendingGenerals,
          nextMonthState.generalsData,
          nextMonthState.currentScenario
        );
        
        return {
          ...nextMonthState,
          activeBattle: {
            isDefense: true,
            attackerRuler: firstBattle.attackerRuler,
            defenderRuler: firstBattle.defenderRuler,
            targetProvinceId: firstBattle.targetProvinceId,
            attackerProvinceId: firstBattle.attackerProvinceId,
            attackerReinforceProvinceId: firstBattle.attackerReinforceProvinceId,
            attackingGenerals: firstBattle.attackingGenerals,
            defendingGenerals: firstBattle.defendingGenerals,
            attackerStrategist: atkStrategist,
            defenderStrategist: defStrategist,
            attackerGold: firstBattle.attackerGold,
            attackerFood: firstBattle.attackerFood,
            resourcesDeducted: firstBattle.resourcesDeducted,
            attackerGeneralOrigins: firstBattle.attackerGeneralOrigins,
            defenderPrimaryProvinceId: firstBattle.defenderPrimaryProvinceId,
            defenderReinforceProvinceId: firstBattle.defenderReinforceProvinceId,
            defenderGeneralOrigins: firstBattle.defenderGeneralOrigins,
            defenderResourcesDeducted: firstBattle.defenderResourcesDeducted
          },
          pendingDefenses: remainingBattles,
          view: 'battle'
        };
      }
      
      return nextMonthState;`
);

// 2. Modify resolveBattle
// We need to inject isDefense checks inside resolveBattle.
// Inside resolveBattle, before `if (winner === 'attacker') {`, let's define `isDefense = battle.isDefense;`

code = code.replace(
  `      const primaryAtkCityId = battle.attackerProvinceId;
      const reinforceAtkCityId = battle.attackerReinforceProvinceId;
      const defReinforceCityId = battle.defenderReinforceProvinceId;
      
      if (winner === 'attacker') {`,
  `      const primaryAtkCityId = battle.attackerProvinceId;
      const reinforceAtkCityId = battle.attackerReinforceProvinceId;
      const defReinforceCityId = battle.defenderReinforceProvinceId;
      const isDefense = battle.isDefense;
      
      if (winner === 'attacker') {`
);

code = code.replace(
  `        targetProv.rulerName = prev.rulerName;`,
  `        targetProv.rulerName = isDefense ? battle.attackerRuler! : prev.rulerName;`
);

code = code.replace(
  `        baseState.lastActionResult = {
          action: '攻城勝利',
          title: '🔥 攻城大捷：破城奪地！',
          message: \`我軍英勇善戰，成功攻破【\${targetProv.name}】！主攻部隊已進駐接管該城，援軍亦已班師回朝！\`,
          type: 'success'
        };`,
  `        baseState.lastActionResult = {
          action: isDefense ? '守城失敗' : '攻城勝利',
          title: isDefense ? '💀 城池陷落' : '🔥 攻城大捷：破城奪地！',
          message: isDefense 
            ? \`敵軍攻勢太猛，我軍無力回天，【\${targetProv.name}】已落入敵方手中...\` 
            : \`我軍英勇善戰，成功攻破【\${targetProv.name}】！主攻部隊已進駐接管該城，援軍亦已班師回朝！\`,
          type: isDefense ? 'failure' : 'success'
        };`
);

code = code.replace(
  `        baseState.lastActionResult = {
          action: '攻城失敗',
          title: '❌ 攻城失利：鳴金收兵',
          message: \`敵軍防守嚴密，我軍久攻不下，各路兵馬只好撤回原城休整...【\${targetProv.name}】攻城失敗。\`,
          type: 'failure'
        };`,
  `        baseState.lastActionResult = {
          action: isDefense ? '守城勝利' : '攻城失敗',
          title: isDefense ? '🛡️ 防守成功：固若金湯' : '❌ 攻城失利：鳴金收兵',
          message: isDefense 
             ? \`我軍將士用命，成功擊退了敵軍的進犯！【\${targetProv.name}】安然無恙！\` 
             : \`敵軍防守嚴密，我軍久攻不下，各路兵馬只好撤回原城休整...【\${targetProv.name}】攻城失敗。\`,
          type: isDefense ? 'success' : 'failure'
        };`
);

// Modify the remaining battles check to also handle pendingDefenses
code = code.replace(
  `      // 檢查是否還有後續排定之戰役
      const remainingBattles = baseState.pendingBattles || [];
      if (remainingBattles.length > 0) {
        const [nextBattle, ...rest] = remainingBattles;`,
  `      // 檢查是否還有後續排定之戰役
      let remainingBattles = baseState.pendingBattles || [];
      let isNextDefense = false;
      
      if (remainingBattles.length === 0 && baseState.pendingDefenses && baseState.pendingDefenses.length > 0) {
          remainingBattles = baseState.pendingDefenses;
          isNextDefense = true;
      }
      
      if (remainingBattles.length > 0) {
        const [nextBattle, ...rest] = remainingBattles;`
);

code = code.replace(
  `          activeBattle: {
            targetProvinceId: nextBattle.targetProvinceId,`,
  `          activeBattle: {
            isDefense: isNextDefense,
            attackerRuler: nextBattle.attackerRuler,
            defenderRuler: nextBattle.defenderRuler,
            targetProvinceId: nextBattle.targetProvinceId,`
);

code = code.replace(
  `          pendingBattles: rest,
          pendingBattle: rest[0] || null,
          view: 'battle'
        };
      }`,
  `          pendingBattles: isNextDefense ? [] : rest,
          pendingDefenses: isNextDefense ? rest : baseState.pendingDefenses,
          pendingBattle: isNextDefense ? null : (rest[0] || null),
          view: 'battle'
        };
      }`
);

code = code.replace(
  `      // 所有戰役皆已結算完成，推進時光至新月份，並恢復將領行動力
      baseState.activeBattle = null;
      baseState.pendingBattles = [];
      baseState.pendingBattle = null;
      
      const nextMonthState = advanceTime(baseState);
      return {
        ...nextMonthState,
        lastActionResult: baseState.lastActionResult, // 保留攻城戰報結果
        view: 'map'
      };`,
  `      // 所有戰役皆已結算完成，恢復將領行動力 (如果這是防守戰，月份其實已經推進了)
      baseState.activeBattle = null;
      baseState.pendingBattles = [];
      baseState.pendingBattle = null;
      baseState.pendingDefenses = [];
      
      if (isDefense) {
          return {
              ...baseState,
              lastActionResult: baseState.lastActionResult,
              view: 'map'
          };
      } else {
          // 如果是玩家自己發起攻擊結束，才推進月份
          const nextMonthState = advanceTime(baseState);
          return {
            ...nextMonthState,
            lastActionResult: baseState.lastActionResult,
            view: 'map'
          };
      }`
);

fs.writeFileSync('src/engine/useGameEngine.ts', code);
