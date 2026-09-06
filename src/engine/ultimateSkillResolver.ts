import { BattleUnit, GameState } from '../types';

export interface UltimateExecutionResult {
  updatedUnits: BattleUnit[];
  logs: { message: string; type: 'critical' | 'strategy' | 'attack' | 'passive' | 'archery' | 'info' }[];
  popups: { unitId: string; text: string; isCrit?: boolean }[];
  foodChange?: { deltaAttacker: number; deltaDefender: number };
}

export function executeUltimateSkill(
  casterUnit: BattleUnit,
  skillName: string,
  targetUnitId: string | null,
  battleUnits: BattleUnit[],
  gameState: GameState,
  battlefieldTerrain: string,
  battleFood?: { attackerFood: number; defenderFood: number }
): UltimateExecutionResult | null {
  const atkGen = gameState.generalsData[casterUnit.generalName] || { str: 80, int: 80, hp: 80, lead: 80 };
  const isAttacker = casterUnit.isAttacker;
  const allies = battleUnits.filter(u => u.isAttacker === isAttacker && u.troops > 0);
  const enemies = battleUnits.filter(u => u.isAttacker !== isAttacker && u.troops > 0);
  const targetUnit = enemies.find(u => u.id === targetUnitId) || enemies[0] || null;

  // 兵力規模係數
  const maxTroops = gameState.generalsData[casterUnit.generalName]?.soldiers || casterUnit.maxTroops || 1000;
  const troopRatio = Math.max(0.01, Math.min(1.0, casterUnit.troops / maxTroops));
  const troopFactor = 0.35 + 0.65 * Math.sqrt(troopRatio);
  const atkMod = casterUnit.status === 'moraled' ? 1.25 : casterUnit.status === 'panicked' ? 0.75 : 1.0;

  const logs: UltimateExecutionResult['logs'] = [];
  const popups: UltimateExecutionResult['popups'] = [];
  let updatedUnits = [...battleUnits];
  let foodChange: { deltaAttacker: number; deltaDefender: number } | undefined;

  switch (skillName) {
    // 1. 關羽【武聖・單刀赴會】
    case '武聖・單刀赴會': {
      if (!targetUnit) break;
      const defGen = gameState.generalsData[targetUnit.generalName] || { str: 60, hp: 60 };
      const isLowHealth = targetUnit.troops <= (targetUnit.maxTroops || 1000) * 0.40;
      let damage = Math.floor(atkGen.str * 12.0 * troopFactor * atkMod);
      let isCrit = true;
      if (isLowHealth) {
        damage = Math.floor(damage * 1.6);
        logs.push({
          message: `🐉⚡【武聖・破軍斬殺！】關羽青龍偃月刀凌空斬落！無視防禦發動絕命斬殺，對 ${targetUnit.generalName} 造成毀滅級 ${damage} 暴擊傷害！敵全軍士氣 -15！`,
          type: 'critical'
        });
      } else {
        logs.push({
          message: `🐉⚡【武聖・單刀赴會！】關羽青龍偃月刀呼嘯破空，無視防禦對 ${targetUnit.generalName} 造成 ${damage} 致命破軍重擊！敵全軍士氣 -15！`,
          type: 'critical'
        });
      }
      popups.push({ unitId: targetUnit.id, text: `-${damage}⚡`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - damage),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            stamina: Math.max(0, (u.stamina ?? 100) - 30)
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return { ...u, morale: Math.max(0, (u.morale ?? 100) - 15) };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 2. 張飛【當陽怒吼・斷橋】
    case '當陽怒吼・斷橋': {
      logs.push({
        message: `🦁💥【當陽怒吼・橋斷水倒流！】張飛於當陽橋頭雷霆暴喝！敵方全軍膽裂，士氣 -35、體力 -25，陷入極度恐慌！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 4.5 * troopFactor);
          const willPanic = Math.random() < 0.75;
          const isFirstUnit = enemies[0]?.id === u.id;
          popups.push({ unitId: u.id, text: isFirstUnit ? `混亂 -${dmg}` : `恐慌 -${dmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 35),
            stamina: Math.max(0, (u.stamina ?? 100) - 25),
            status: isFirstUnit ? 'confused' : (willPanic ? 'panicked' : u.status)
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 3. 趙雲【七進七出・龍膽】
    case '七進七出・龍膽': {
      logs.push({
        message: `⚡🐉【七進七出・單騎破陣！】趙雲銀槍若舞梨花，長坂坡神威再現貫穿敵軍全陣線！自身獲得 2 回合【龍膽・無敵閃避】（無視並閃避所有傷害與戰法）！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 7.5 * troopFactor * atkMod);
          popups.push({ unitId: u.id, text: `-${dmg}⚡`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.id === casterUnit.id) {
          popups.push({ unitId: u.id, text: `龍膽無敵(2回合)`, isCrit: true });
          return {
            ...u,
            invincibleTurns: 2, // 獲得 2 回合無敵閃避
            stamina: Math.min(100, Math.max(0, u.stamina - 70) + 30),
            status: 'moraled',
            morale: 120,
            hasActed: true
          };
        }
        return u;
      });
      break;
    }

    // 4. 諸葛亮【八陣圖・奇門遁甲】
    case '八陣圖・奇門遁甲': {
      logs.push({
        message: `☯️✨【八陣圖・奇門倒轉乾坤！】諸葛亮羽扇一揮，陰陽交錯！我方全體驅散負面狀態、恢復 25% 兵力並獲得八卦護體！敵軍二人陷入混亂！`,
        type: 'strategy'
      });

      // 隨機選敵方2支部隊陷入混亂
      const confusedTargetIds = [...enemies].sort(() => 0.5 - Math.random()).slice(0, 2).map(u => u.id);

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker === isAttacker && u.troops > 0) {
          const gMax = gameState.generalsData[u.generalName]?.soldiers || u.maxTroops || 1000;
          const heal = Math.floor(gMax * 0.25 + atkGen.int * 2.5);
          const newT = Math.min(gMax, u.troops + heal);
          popups.push({ unitId: u.id, text: `+${newT - u.troops}🌿`, isCrit: false });
          return {
            ...u,
            troops: newT,
            status: 'moraled',
            morale: 120,
            stamina: u.id === casterUnit.id ? Math.max(0, u.stamina - 70) : Math.min(100, (u.stamina ?? 100) + 20),
            hasActed: u.id === casterUnit.id ? true : u.hasActed
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const isConfused = confusedTargetIds.includes(u.id);
          if (isConfused) popups.push({ unitId: u.id, text: `🌀混亂`, isCrit: false });
          return {
            ...u,
            morale: Math.max(0, (u.morale ?? 100) - 15),
            status: isConfused ? 'confused' : u.status
          };
        }
        return u;
      });
      break;
    }

    // 5. 馬超【神威・西涼鐵騎】
    case '神威・西涼鐵騎': {
      if (!targetUnit) break;
      const mainDmg = Math.floor(atkGen.str * 9.5 * troopFactor * atkMod);
      popups.push({ unitId: targetUnit.id, text: `-${mainDmg}🐎`, isCrit: true });
      logs.push({
        message: `🐎💥【神威天降・西涼鐵騎踏破！】馬超引領西涼鐵騎鐵蹄狂飆！重創主目標 ${targetUnit.generalName} (${mainDmg})，並震盪兩翼敵軍！`,
        type: 'critical'
      });

      const otherEnemies = enemies.filter(u => u.id !== targetUnit.id);
      const splashUnits = otherEnemies.slice(0, 2);

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - mainDmg),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            status: 'confused'
          };
        }
        if (splashUnits.some(su => su.id === u.id)) {
          const splashDmg = Math.floor(mainDmg * 0.55);
          popups.push({ unitId: u.id, text: `-${splashDmg}`, isCrit: false });
          return {
            ...u,
            troops: Math.max(0, u.troops - splashDmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 6. 黃忠【神射・百步穿楊】
    case '神射・百步穿楊': {
      // 鎖定敵方首帥或最高戰力者
      const primeTarget = [...enemies].sort((a, b) => {
        const strA = gameState.generalsData[a.generalName]?.str || 50;
        const strB = gameState.generalsData[b.generalName]?.str || 50;
        return strB - strA;
      })[0] || targetUnit;

      if (!primeTarget) break;
      const snipeDmg = Math.floor(atkGen.str * 11.5 * troopFactor * atkMod);
      logs.push({
        message: `🎯🏹【神射・百步穿楊！】黃忠挽開寶鵰金弓，定軍山下絕命狙殺！一箭射穿敵將【${primeTarget.generalName}】(${snipeDmg} 致命創傷)！敵全軍士氣狂跌！`,
        type: 'archery'
      });
      popups.push({ unitId: primeTarget.id, text: `-${snipeDmg}🎯`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === primeTarget.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - snipeDmg),
            morale: Math.max(0, (u.morale ?? 100) - 30),
            stamina: Math.max(0, (u.stamina ?? 100) - 40)
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return { ...u, morale: Math.max(0, (u.morale ?? 100) - 25) };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 7. 曹操【短歌行・天下歸心】
    case '短歌行・天下歸心': {
      logs.push({
        message: `👑📜【短歌行・周公吐哺天下歸心！】曹操拔劍高呼，激昂慷慨！我全軍士氣鎖定 120 滿格，全員回血 25%，獲得無匹【鼓舞】狀態！`,
        type: 'passive'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker === isAttacker && u.troops > 0) {
          const gMax = gameState.generalsData[u.generalName]?.soldiers || u.maxTroops || 1000;
          const heal = Math.floor(gMax * 0.25 + ((atkGen as any).lead || atkGen.str || 85) * 2.5);
          const newT = Math.min(gMax, u.troops + heal);
          popups.push({ unitId: u.id, text: `鼓舞+${newT - u.troops}👑`, isCrit: false });
          return {
            ...u,
            troops: newT,
            morale: 120,
            status: 'moraled',
            stamina: u.id === casterUnit.id ? Math.max(0, u.stamina - 70) : Math.min(100, (u.stamina ?? 100) + 30),
            hasActed: u.id === casterUnit.id ? true : u.hasActed
          };
        }
        return u;
      });
      break;
    }

    // 8. 司馬懿【鷹視狼顧・奪魄】
    case '鷹視狼顧・奪魄': {
      logs.push({
        message: `🦅🌀【鷹視狼顧・奪魄攝魂！】司馬懿冷眼睥睨戰場，詭譎大陣強行吸取敵方全員 20 點體力反哺自身！敵軍軍心潰散！`,
        type: 'strategy'
      });

      const totalSiphoned = enemies.length * 20;

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.int * 6.8 * atkMod);
          popups.push({ unitId: u.id, text: `體力-20 傷-${dmg}`, isCrit: true });
          const willPanic = Math.random() < 0.60;
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            stamina: Math.max(0, (u.stamina ?? 100) - 20),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            status: willPanic ? 'panicked' : u.status
          };
        }
        if (u.id === casterUnit.id) {
          return {
            ...u,
            stamina: Math.min(100, Math.max(0, u.stamina - 70) + Math.min(60, totalSiphoned)),
            hasActed: true
          };
        }
        return u;
      });
      break;
    }

    // 9. 張遼【威震逍遙津・疾風】
    case '威震逍遙津・疾風': {
      if (!targetUnit) break;
      const isWuGeneral = ['孫權', '周瑜', '陸遜', '甘寧', '太史慈', '呂蒙', '黃蓋', '凌統', '周泰'].includes(targetUnit.generalName);
      let dmg = Math.floor(atkGen.str * 10.0 * troopFactor * atkMod);
      if (isWuGeneral) dmg = Math.floor(dmg * 1.4);

      logs.push({
        message: `🌪️⚔️【威震逍遙津・疾風突入！】張遼八百破十萬之勇！單騎狂飆直插敵主營，對 ${targetUnit.generalName} 造成 ${dmg} 裂魂重創！敵全軍陷入恐慌！`,
        type: 'critical'
      });
      popups.push({ unitId: targetUnit.id, text: `-${dmg}疾風!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 30),
            status: 'panicked'
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return {
            ...u,
            morale: Math.max(0, (u.morale ?? 100) - 20),
            status: 'panicked'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 10. 郭嘉【遺計定遼東・十勝】
    case '遺計定遼東・十勝': {
      logs.push({
        message: `📜✨【遺計定遼東・十勝十敗！】郭嘉算盡天下局勢！敵方全軍防禦全面崩毀，受創大幅增加，體力全體重損 30！`,
        type: 'strategy'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.int * 6.5);
          popups.push({ unitId: u.id, text: `脆弱 -${dmg}`, isCrit: false });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            stamina: Math.max(0, (u.stamina ?? 100) - 30),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            status: 'confused'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 11. 許褚【裸衣・虎痴狂怒】
    case '裸衣・虎痴狂怒': {
      if (!targetUnit) break;
      const rageDmg = Math.floor((atkGen.str + 35) * 8.5 * troopFactor * atkMod);
      logs.push({
        message: `🐯💥【裸衣血戰・虎痴狂怒！】許褚卸甲力戰，狂暴重擊將 ${targetUnit.generalName} 砸得七葷八素 (${rageDmg} 狂暴傷害)！目標陷入深度混亂！`,
        type: 'critical'
      });
      popups.push({ unitId: targetUnit.id, text: `-${rageDmg}混亂!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - rageDmg),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            stamina: Math.max(0, (u.stamina ?? 100) - 30),
            status: 'confused'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 12. 夏侯惇【拔矢啖睛・剛烈】
    case '拔矢啖睛・剛烈': {
      logs.push({
        message: `👁️🩸【拔矢啖睛・剛烈不屈！】夏侯惇父精母血一口吞下！剛烈之氣貫沖雲霄，反彈狂暴反噬重創敵方全軍！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const counterDmg = Math.floor(atkGen.str * 5.5 * troopFactor);
          popups.push({ unitId: u.id, text: `反噬 -${counterDmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - counterDmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.id === casterUnit.id) {
          const heal = Math.floor((casterUnit.maxTroops || 1000) * 0.30);
          popups.push({ unitId: u.id, text: `鎖血+${heal}🩸`, isCrit: false });
          return {
            ...u,
            troops: Math.min(casterUnit.maxTroops || 1000, u.troops + heal),
            status: 'moraled',
            morale: 120,
            stamina: Math.max(0, u.stamina - 70),
            hasActed: true
          };
        }
        return u;
      });
      break;
    }

    // 13. 周瑜【火燒赤壁・連環】
    case '火燒赤壁・連環': {
      const terrainMult = battlefieldTerrain === '水上' ? 1.75 : battlefieldTerrain === '密林' ? 1.45 : 1.2;
      logs.push({
        message: `🔥🌊【火燒赤壁・烈焰連環！】周瑜羽扇一指，大火鋪天蓋地！敵全軍深陷火海（水上威力 +75%），全員著火，並焚燬敵軍大量糧草！`,
        type: 'strategy'
      });

      // 燒燬糧草
      if (isAttacker) {
        foodChange = { deltaAttacker: 0, deltaDefender: -1500 };
      } else {
        foodChange = { deltaAttacker: -1500, deltaDefender: 0 };
      }

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 7.5 + 100) * terrainMult * atkMod);
          popups.push({ unitId: u.id, text: `-${dmg}🔥`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            status: 'burning'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 14. 陸遜【夷陵烈焰・連營】
    case '夷陵烈焰・連營': {
      logs.push({
        message: `💥🔥【夷陵烈焰・火燒連營七百里！】陸遜引動漫天烈焰，瓦解敵全軍陣勢！全員陷入混亂潰動，陣形防護失效！`,
        type: 'strategy'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 7.0 + 80) * atkMod);
          popups.push({ unitId: u.id, text: `-${dmg}💥`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 30),
            status: 'confused'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 15. 甘寧【錦帆夜襲・百騎】
    case '錦帆夜襲・百騎': {
      if (!targetUnit) break;
      const dmg = Math.floor(atkGen.str * 10.5 * troopFactor * atkMod);

      // 計算敵軍當前軍糧
      const currentEnemyFood = isAttacker ? (battleFood?.defenderFood ?? 5000) : (battleFood?.attackerFood ?? 3000);

      // 計算敵軍存活部隊每日耗糧量 (以部隊總兵力之 3% 為基準)
      const enemyTroopsTotal = enemies.reduce((sum, u) => sum + u.troops, 0);
      const enemyDailyFood = Math.max(10, Math.ceil(enemyTroopsTotal * 0.03));
      // 半個月（15天）軍糧上限
      const halfMonthSupply = enemyDailyFood * 15;

      // 偷取敵方 50% 軍糧，並迫使敵軍殘存口糧最多不超過半個月(15天)之用
      let stolenFood = Math.max(300, Math.floor(currentEnemyFood * 0.5));
      const remainingFoodAfterSteal = Math.max(0, currentEnemyFood - stolenFood);
      if (remainingFoodAfterSteal > halfMonthSupply) {
        stolenFood += (remainingFoodAfterSteal - halfMonthSupply);
      }
      stolenFood = Math.min(currentEnemyFood, Math.max(1, stolenFood));
      const finalEnemyFood = Math.max(0, currentEnemyFood - stolenFood);
      const daysLeft = enemyDailyFood > 0 ? Math.floor(finalEnemyFood / enemyDailyFood) : 15;

      logs.push({
        message: `⛵⚔️【錦帆夜襲・百騎劫營！】甘寧銜枚夜襲！雙戟縱橫重創敵將 ${targetUnit.generalName} (${dmg} 穿心暴擊)！更一把大火焚掠偷取敵方 50% 軍糧（強搶 ${stolenFood.toLocaleString()} 兵糧運回己營）！`,
        type: 'critical'
      });
      logs.push({
        message: `🌾🚨【糧道斷絕・半月死局！】敵軍糧草僅剩 ${finalEnemyFood.toLocaleString()}（僅足支撐 ${daysLeft} 天口糧），全軍陷於半個月內斷糧飢餒之絕境，迫使敵方必須在半個月內速決死戰！敵軍士氣重挫 -25！`,
        type: 'strategy'
      });
      popups.push({ unitId: targetUnit.id, text: `-${dmg}⚡`, isCrit: true });
      popups.push({ unitId: targetUnit.id, text: `掠糧 50%!`, isCrit: true });

      // 掠奪糧食分配
      if (isAttacker) {
        foodChange = { deltaAttacker: stolenFood, deltaDefender: -stolenFood };
      } else {
        foodChange = { deltaAttacker: -stolenFood, deltaDefender: stolenFood };
      }

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 25),
            stamina: Math.max(0, (u.stamina ?? 100) - 35)
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return {
            ...u,
            morale: Math.max(0, (u.morale ?? 100) - 20)
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 16. 太史慈【神亭連珠・封喉】
    case '神亭連珠・封喉': {
      const doubleTargets = enemies.slice(0, 2);
      logs.push({
        message: `🏹⚡【神亭連珠・兩箭破甲封喉！】太史慈搭弓射雕，連發兩支破甲神箭！重創敵軍前鋒兩支部隊並奪其體力封閉戰法！`,
        type: 'archery'
      });

      updatedUnits = updatedUnits.map(u => {
        if (doubleTargets.some(dt => dt.id === u.id)) {
          const dmg = Math.floor(atkGen.str * 8.0 * troopFactor * atkMod);
          popups.push({ unitId: u.id, text: `封喉 -${dmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: 0,
            status: 'confused'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 17. 呂蒙【白衣渡江・奇襲】
    case '白衣渡江・奇襲': {
      logs.push({
        message: `🌫️⛵【白衣渡江・瞞天過海奇襲！】呂蒙化裝商船出其不意！我方全員獲得【匿跡潛行】（下一次攻擊必中且無法被反擊，士氣暴漲）！重創敵方全軍！`,
        type: 'strategy'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 5.5 + atkGen.str * 3.5) * troopFactor);
          popups.push({ unitId: u.id, text: `奇襲 -${dmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 20)
          };
        }
        if (u.isAttacker === isAttacker && u.troops > 0) {
          popups.push({ unitId: u.id, text: `匿跡潛行`, isCrit: true });
          return {
            ...u,
            stealthTurns: 1, // 獲得匿跡潛行狀態，持續一次攻擊
            status: 'moraled',
            morale: 120,
            stamina: u.id === casterUnit.id ? Math.max(0, u.stamina - 70) : u.stamina,
            hasActed: u.id === casterUnit.id ? true : u.hasActed
          };
        }
        return u;
      });
      break;
    }

    // 18. 呂布【鬼神・天下無雙】
    case '鬼神・天下無雙': {
      logs.push({
        message: `👹⚡👑【鬼神・真天下無雙！】呂布方天畫戟狂亂揮舞，神鬼皆驚！無視敵全軍所有防禦，進行毀滅性全屏斬擊！敵全體混亂！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 11.0 * troopFactor * atkMod);
          popups.push({ unitId: u.id, text: `無雙 -${dmg}⚡`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 30),
            status: 'confused'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: 0, hasActed: true }; // 釋放完力竭
        }
        return u;
      });
      break;
    }

    // 19. 貂蟬【閉月・連環美人計】
    case '閉月・連環美人計': {
      if (enemies.length < 2) {
        // 若只剩一人，直接造成巨大魅惑心靈傷害
        const soloTarget = enemies[0];
        if (soloTarget) {
          const dmg = Math.floor(atkGen.int * 8.0);
          popups.push({ unitId: soloTarget.id, text: `魅惑 -${dmg}`, isCrit: true });
          logs.push({
            message: `🌙💃【閉月・美人傾城！】貂蟬翩翩起舞，敵將 ${soloTarget.generalName} 神魂顛倒，部隊互相踐踏潰散！造成 ${dmg} 傷害！`,
            type: 'strategy'
          });
          updatedUnits = updatedUnits.map(u => {
            if (u.id === soloTarget.id) {
              return { ...u, troops: Math.max(0, u.troops - dmg), status: 'confused', morale: Math.max(0, (u.morale ?? 100) - 30) };
            }
            if (u.id === casterUnit.id) return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
            return u;
          });
        }
        break;
      }

      // 敵方武力最高者 (最強武將) 與 智力最高者 (最強軍師)
      const highestStr = [...enemies].sort((a, b) => {
        const strA = gameState.generalsData[a.generalName]?.str || 50;
        const strB = gameState.generalsData[b.generalName]?.str || 50;
        return strB - strA;
      })[0];

      const highestInt = [...enemies].filter(u => u.id !== highestStr.id).sort((a, b) => {
        const intA = gameState.generalsData[a.generalName]?.int || 50;
        const intB = gameState.generalsData[b.generalName]?.int || 50;
        return intB - intA;
      })[0] || enemies.find(u => u.id !== highestStr.id) || enemies[1];

      const strGen = gameState.generalsData[highestStr.generalName] || { str: 80, hp: 80 };
      const intGen = gameState.generalsData[highestInt.generalName] || { int: 80, hp: 80 };

      // 武力最高者對智謀最高者施加 100% 全力劈砍攻擊
      const strTroopFactor = 0.35 + 0.65 * Math.sqrt(Math.max(0.1, highestStr.troops / (highestStr.maxTroops || 1000)));
      const strBlowDamage = Math.floor(strGen.str * 8.5 * strTroopFactor);

      // 智謀最高者對武力最高者施加 100% 奇謀反噬刺殺
      const intCounterDamage = Math.floor(intGen.int * 8.5);

      logs.push({
        message: `🌙💃【閉月・連環美人計！】貂蟬一舞傾城，巧施離間絕計！魅惑敵方武力第一【${highestStr.generalName}】(武力 ${strGen.str}) 與智謀第一【${highestInt.generalName}】(智力 ${intGen.int}) 反目成仇互相殘殺！各自承受 100% 攻擊力反噬！`,
        type: 'strategy'
      });
      logs.push({
        message: `⚔️💥【同袍相殘！】武將【${highestStr.generalName}】受惑暴怒，拔刀猛劈軍師【${highestInt.generalName}】，造成 ${strBlowDamage} 毀滅重創！`,
        type: 'critical'
      });
      logs.push({
        message: `🌀🗡️【誓死反刺！】軍師【${highestInt.generalName}】驚怒交加伏劍反擊，對【${highestStr.generalName}】造成 ${intCounterDamage} 致命創傷！`,
        type: 'strategy'
      });
      logs.push({
        message: `💔 敵軍核心武將軍師反目互相殘殺，全軍軍心震駭，士氣全面暴跌 25 點，雙方陷入深度混亂！`,
        type: 'info'
      });

      popups.push({ unitId: highestInt.id, text: `猛斬 -${strBlowDamage}!`, isCrit: true });
      popups.push({ unitId: highestStr.id, text: `反刺 -${intCounterDamage}!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === highestInt.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - strBlowDamage),
            morale: Math.max(0, (u.morale ?? 100) - 35),
            stamina: Math.max(0, (u.stamina ?? 100) - 40),
            status: 'confused'
          };
        }
        if (u.id === highestStr.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - intCounterDamage),
            morale: Math.max(0, (u.morale ?? 100) - 35),
            stamina: Math.max(0, (u.stamina ?? 100) - 40),
            status: 'confused'
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return { ...u, morale: Math.max(0, (u.morale ?? 100) - 25) };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 20. 賈詡【毒士亂武・萬劫】
    case '毒士亂武・萬劫': {
      logs.push({
        message: `☠️🌀【毒士亂武・天下浩劫！】賈詡祭出天下至毒之謀，召喚【劇毒瘴氣】籠罩敵全陣線！全軍每回合損失 8% 最大兵力與 15 體力，持續 3 回合！`,
        type: 'strategy'
      });

      // 隨機一名敵將受幻亂反叛攻擊友軍
      let betrayer: BattleUnit | null = null;
      let betrayTarget: BattleUnit | null = null;
      let betrayDmg = 0;

      if (enemies.length >= 2) {
        const shuffled = [...enemies].sort(() => 0.5 - Math.random());
        betrayer = shuffled[0];
        betrayTarget = shuffled[1];
        const bGen = gameState.generalsData[betrayer.generalName] || { str: 70 };
        betrayDmg = Math.floor(bGen.str * 6.5);
        logs.push({
          message: `🗡️🩸【倒戈相向！】敵將【${betrayer.generalName}】神智陷入幻亂，竟倒戈拔刃砍向友軍【${betrayTarget.generalName}】，造成 ${betrayDmg} 內鬨傷害！`,
          type: 'critical'
        });
        popups.push({ unitId: betrayTarget.id, text: `倒戈 -${betrayDmg}🩸`, isCrit: true });
      }

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const directDmg = Math.floor(atkGen.int * 6.2 * atkMod);
          let extraBetray = 0;
          if (betrayTarget && u.id === betrayTarget.id) {
            extraBetray = betrayDmg;
          }
          popups.push({ unitId: u.id, text: `劇毒 -${directDmg}☠️`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - directDmg - extraBetray),
            poisonTurns: 3, // 持續 3 回合劇毒瘴氣
            morale: Math.max(0, (u.morale ?? 100) - 25),
            stamina: Math.max(0, (u.stamina ?? 100) - 25),
            status: 'panicked'
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    default:
      return null;
  }

  return {
    updatedUnits,
    logs,
    popups,
    foodChange
  };
}
