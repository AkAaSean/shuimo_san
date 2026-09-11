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
      const isLowHealth = targetUnit.troops <= (targetUnit.maxTroops || 1000) * 0.35;
      let damage = Math.floor(atkGen.str * 7.5 * troopFactor * atkMod);
      let isCrit = false;
      if (isLowHealth) {
        damage = Math.floor(damage * 1.35);
        isCrit = true;
        logs.push({
          message: `🐉⚡【武聖・絕命斬殺！】關羽青龍偃月刀凌空怒斬！穿透敵陣對殘血將領 ${targetUnit.generalName} 造成 ${damage} 絕命破軍傷害！敵全軍士氣 -15！`,
          type: 'critical'
        });
      } else {
        logs.push({
          message: `🐉⚡【武聖・單刀赴會！】關羽青龍偃月刀呼嘯破空，穿透 50% 防禦對 ${targetUnit.generalName} 造成 ${damage} 破軍重擊！敵全軍士氣 -15！`,
          type: 'critical'
        });
      }
      popups.push({ unitId: targetUnit.id, text: `-${damage}⚡`, isCrit });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - damage),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 25)
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
        message: `🦁💥【當陽怒吼・橋斷水倒流！】張飛於當陽橋頭雷霆暴喝！敵前鋒驚駭陷入恐慌，全軍士氣 -20、體力 -15！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 3.8 * troopFactor);
          const isFirstUnit = enemies[0]?.id === u.id;
          const willPanic = isFirstUnit || Math.random() < 0.50;
          popups.push({ unitId: u.id, text: willPanic ? `恐慌 -${dmg}` : `-${dmg}`, isCrit: willPanic });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 15),
            status: willPanic ? 'panicked' : u.status
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
        message: `⚡🐉【七進七出・單騎破陣！】趙雲銀槍若舞梨花，長坂坡神威再現貫穿敵軍全陣線！自身獲得 2 回合【龍膽身法】（50% 機率完全閃避，若命中則減傷 50%）！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 5.5 * troopFactor * atkMod);
          popups.push({ unitId: u.id, text: `-${dmg}⚡`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.id === casterUnit.id) {
          popups.push({ unitId: u.id, text: `龍膽身法(2回合)`, isCrit: true });
          return {
            ...u,
            invincibleTurns: 2, // 獲得 2 回合龍膽身法（50% 閃避，50% 減傷）
            stamina: Math.min(100, Math.max(0, u.stamina - 70) + 20),
            status: 'moraled',
            morale: 110,
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
        message: `☯️✨【八陣圖・奇門倒轉乾坤！】諸葛亮羽扇一揮，陰陽交錯！我方全員驅散負面狀態、恢復 15% 兵力且士氣 +25！敵方一支部隊陷入混亂！`,
        type: 'strategy'
      });

      // 隨機選敵方 1 支部隊陷入混亂
      const confusedTarget = [...enemies].sort(() => 0.5 - Math.random())[0];

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker === isAttacker && u.troops > 0) {
          const gMax = u.initialTroops ?? u.maxTroops ?? u.troops ?? 1000;
          const heal = Math.floor(gMax * 0.15 + atkGen.int * 1.8);
          const newT = Math.min(gMax, u.troops + heal);
          const actualH = newT - u.troops;
          popups.push({ unitId: u.id, text: actualH > 0 ? `+${actualH}🌿` : `滿編`, isCrit: false });
          return {
            ...u,
            troops: newT,
            status: 'moraled',
            morale: Math.min(120, (u.morale ?? 100) + 25),
            stamina: u.id === casterUnit.id ? Math.max(0, u.stamina - 70) : Math.min(100, (u.stamina ?? 100) + 15),
            hasActed: u.id === casterUnit.id ? true : u.hasActed
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const isConfused = confusedTarget && confusedTarget.id === u.id;
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
      const mainDmg = Math.floor(atkGen.str * 6.8 * troopFactor * atkMod);
      popups.push({ unitId: targetUnit.id, text: `-${mainDmg}🐎`, isCrit: true });
      logs.push({
        message: `🐎💥【神威天降・西涼鐵騎踏破！】馬超引領西涼鐵騎鐵蹄狂飆！衝擊主目標 ${targetUnit.generalName} (${mainDmg})，撕裂防線並震盪兩翼敵軍！`,
        type: 'critical'
      });

      const otherEnemies = enemies.filter(u => u.id !== targetUnit.id);
      const splashUnits = otherEnemies.slice(0, 2);

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - mainDmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            status: 'panicked'
          };
        }
        if (splashUnits.some(su => su.id === u.id)) {
          const splashDmg = Math.floor(mainDmg * 0.45);
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
      const snipeDmg = Math.floor(atkGen.str * 7.2 * troopFactor * atkMod * 1.4);
      logs.push({
        message: `🎯🏹【神射・百步穿楊！】黃忠挽開寶鵰金弓，定軍山下絕命狙殺！一箭精準穿甲射中敵將【${primeTarget.generalName}】(${snipeDmg} 重創)！敵全軍士氣 -15！`,
        type: 'archery'
      });
      popups.push({ unitId: primeTarget.id, text: `-${snipeDmg}🎯`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === primeTarget.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - snipeDmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 25)
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

    // 7. 曹操【短歌行・天下歸心】
    case '短歌行・天下歸心': {
      logs.push({
        message: `👑📜【短歌行・周公吐哺天下歸心！】曹操拔劍高呼，激昂慷慨！我全軍士氣 +25，全員回血 15%，獲得【鼓舞】狀態！`,
        type: 'passive'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker === isAttacker && u.troops > 0) {
          const gMax = u.initialTroops ?? u.maxTroops ?? u.troops ?? 1000;
          const heal = Math.floor(gMax * 0.15 + ((atkGen as any).lead || atkGen.str || 85) * 1.8);
          const newT = Math.min(gMax, u.troops + heal);
          const actualH = newT - u.troops;
          popups.push({ unitId: u.id, text: actualH > 0 ? `鼓舞+${actualH}👑` : `滿編`, isCrit: false });
          return {
            ...u,
            troops: newT,
            morale: Math.min(120, (u.morale ?? 100) + 25),
            status: 'moraled',
            stamina: u.id === casterUnit.id ? Math.max(0, u.stamina - 70) : Math.min(100, (u.stamina ?? 100) + 15),
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
        message: `🦅🌀【鷹視狼顧・奪魄攝魂！】司馬懿冷眼睥睨戰場，詭譎陣法汲取敵軍體力反哺自身！敵軍軍心動搖！`,
        type: 'strategy'
      });

      const totalSiphoned = enemies.length * 10;

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.int * 4.8 * atkMod);
          popups.push({ unitId: u.id, text: `體力-10 傷-${dmg}`, isCrit: false });
          const willPanic = Math.random() < 0.40;
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            stamina: Math.max(0, (u.stamina ?? 100) - 10),
            morale: Math.max(0, (u.morale ?? 100) - 15),
            status: willPanic ? 'panicked' : u.status
          };
        }
        if (u.id === casterUnit.id) {
          return {
            ...u,
            stamina: Math.min(100, Math.max(0, u.stamina - 70) + Math.min(40, totalSiphoned)),
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
      let dmg = Math.floor(atkGen.str * 6.5 * troopFactor * atkMod);
      if (isWuGeneral) dmg = Math.floor(dmg * 1.25);

      logs.push({
        message: `🌪️⚔️【威震逍遙津・疾風突入！】張遼八百破十萬之勇！單騎狂飆直插敵主營，對 ${targetUnit.generalName} 造成 ${dmg} 疾風重創！敵前鋒陷入恐慌！`,
        type: 'critical'
      });
      popups.push({ unitId: targetUnit.id, text: `-${dmg}疾風!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            status: 'panicked'
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return {
            ...u,
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

    // 10. 郭嘉【遺計定遼東・十勝】
    case '遺計定遼東・十勝': {
      logs.push({
        message: `📜✨【遺計定遼東・十勝十敗！】郭嘉算盡天下局勢！敵方全軍防禦破綻大露，陷入脆弱狀態，體力受到壓制！`,
        type: 'strategy'
      });

      const confusedTarget = [...enemies].sort(() => 0.5 - Math.random())[0];

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.int * 4.5);
          const isConfused = confusedTarget && confusedTarget.id === u.id;
          popups.push({ unitId: u.id, text: isConfused ? `混亂 -${dmg}` : `脆弱 -${dmg}`, isCrit: false });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            stamina: Math.max(0, (u.stamina ?? 100) - 15),
            morale: Math.max(0, (u.morale ?? 100) - 15),
            status: isConfused ? 'confused' : (u.status === 'normal' ? 'panicked' : u.status)
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
      const rageDmg = Math.floor(atkGen.str * 6.8 * troopFactor * atkMod);
      logs.push({
        message: `🐯💥【裸衣血戰・虎痴狂怒！】許褚卸甲力戰，狂暴重擊將 ${targetUnit.generalName} 砸退 (${rageDmg} 狂暴傷害)！目標陷入混亂！`,
        type: 'critical'
      });
      popups.push({ unitId: targetUnit.id, text: `-${rageDmg}混亂!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === targetUnit.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - rageDmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 20),
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
        message: `👁️🩸【拔矢啖睛・剛烈不屈！】夏侯惇父精母血一口吞下！剛烈之氣貫沖雲霄，反噬重創敵方全軍！`,
        type: 'critical'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const counterDmg = Math.floor(atkGen.str * 3.8 * troopFactor);
          popups.push({ unitId: u.id, text: `反噬 -${counterDmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - counterDmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.id === casterUnit.id) {
          const maxLimit = casterUnit.initialTroops ?? casterUnit.maxTroops ?? casterUnit.troops ?? 1000;
          const lostTroops = Math.max(0, maxLimit - casterUnit.troops);
          const heal = Math.floor(lostTroops * 0.20 + 100);
          const newT = Math.min(maxLimit, u.troops + heal);
          const actualH = newT - u.troops;
          popups.push({ unitId: u.id, text: actualH > 0 ? `剛烈+${actualH}🩸` : `滿編`, isCrit: false });
          return {
            ...u,
            troops: newT,
            status: 'moraled',
            morale: Math.min(120, (u.morale ?? 100) + 20),
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
      const terrainMult = battlefieldTerrain === '水上' ? 1.35 : battlefieldTerrain === '密林' ? 1.20 : 1.0;
      logs.push({
        message: `🔥🌊【火燒赤壁・烈焰連環！】周瑜羽扇一指，大火鋪天蓋地！敵全軍深陷火海（水上威力 +35%），全員著火，並焚燬敵軍 600 軍糧！`,
        type: 'strategy'
      });

      // 燒燬糧草（平衡為 600）
      if (isAttacker) {
        foodChange = { deltaAttacker: 0, deltaDefender: -600 };
      } else {
        foodChange = { deltaAttacker: -600, deltaDefender: 0 };
      }

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 4.8 + 60) * terrainMult * atkMod);
          popups.push({ unitId: u.id, text: `-${dmg}🔥`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 20),
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
        message: `💥🔥【夷陵烈焰・火燒連營七百里！】陸遜引動漫天烈焰，重創敵軍！主目標陷入混亂，全軍士氣動搖！`,
        type: 'strategy'
      });

      const primeEnemy = targetUnit || enemies[0];

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 4.6 + 50) * atkMod);
          const isPrime = primeEnemy && primeEnemy.id === u.id;
          popups.push({ unitId: u.id, text: isPrime ? `混亂 -${dmg}` : `-${dmg}💥`, isCrit: isPrime });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15),
            status: isPrime ? 'confused' : (u.status === 'normal' ? 'panicked' : u.status)
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
      const dmg = Math.floor(atkGen.str * 6.5 * troopFactor * atkMod);

      // 計算敵軍當前軍糧，掠奪 12%（上限 800）
      const currentEnemyFood = isAttacker ? (battleFood?.defenderFood ?? 5000) : (battleFood?.attackerFood ?? 3000);
      const stolenFood = Math.min(800, Math.max(150, Math.floor(currentEnemyFood * 0.12)));

      logs.push({
        message: `⛵⚔️【錦帆夜襲・百騎劫營！】甘寧銜枚夜襲！雙戟縱橫重創敵將 ${targetUnit.generalName} (${dmg} 疾刃突襲)！並趁夜劫掠敵方 12% 軍糧（搶得 ${stolenFood.toLocaleString()} 兵糧運回己營）！`,
        type: 'critical'
      });
      popups.push({ unitId: targetUnit.id, text: `-${dmg}⚡`, isCrit: true });
      popups.push({ unitId: targetUnit.id, text: `奪糧 ${stolenFood}!`, isCrit: false });

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
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 25)
          };
        }
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          return {
            ...u,
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

    // 16. 太史慈【神亭連珠・封喉】
    case '神亭連珠・封喉': {
      const doubleTargets = enemies.slice(0, 2);
      logs.push({
        message: `🏹⚡【神亭連珠・破甲封喉！】太史慈搭弓射鵰，連發兩支破甲神箭！重創前鋒敵軍並封閉戰法！`,
        type: 'archery'
      });

      updatedUnits = updatedUnits.map(u => {
        if (doubleTargets.some(dt => dt.id === u.id)) {
          const dmg = Math.floor(atkGen.str * 5.2 * troopFactor * atkMod);
          popups.push({ unitId: u.id, text: `封喉 -${dmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15),
            stamina: Math.max(0, (u.stamina ?? 100) - 25),
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
        message: `🌫️⛵【白衣渡江・瞞天過海奇襲！】呂蒙化裝商船出其不意！我方全員獲得【匿跡突襲】（傷害提升 25% 且暴擊率 +30%）！`,
        type: 'strategy'
      });

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor((atkGen.int * 3.8 + atkGen.str * 2.2) * troopFactor);
          popups.push({ unitId: u.id, text: `奇襲 -${dmg}`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15)
          };
        }
        if (u.isAttacker === isAttacker && u.troops > 0) {
          popups.push({ unitId: u.id, text: `匿跡突襲`, isCrit: true });
          return {
            ...u,
            stealthTurns: 1, // 獲得匿跡突襲狀態
            status: 'moraled',
            morale: Math.min(120, (u.morale ?? 100) + 15),
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
        message: `👹⚡👑【鬼神・天下無雙！】呂布方天畫戟狂亂狂斬，神威震懾八荒！主目標陷入混亂，全軍士氣受挫！`,
        type: 'critical'
      });

      const primeEnemy = targetUnit || enemies[0];

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const dmg = Math.floor(atkGen.str * 6.2 * troopFactor * atkMod);
          const isPrime = primeEnemy && primeEnemy.id === u.id;
          const willPanic = isPrime || Math.random() < 0.50;
          popups.push({ unitId: u.id, text: isPrime ? `混亂 -${dmg}⚡` : `-${dmg}⚡`, isCrit: true });
          return {
            ...u,
            troops: Math.max(0, u.troops - dmg),
            morale: Math.max(0, (u.morale ?? 100) - 15),
            status: isPrime ? 'confused' : (willPanic ? 'panicked' : u.status)
          };
        }
        if (u.id === casterUnit.id) {
          return { ...u, stamina: Math.max(0, u.stamina - 70), hasActed: true };
        }
        return u;
      });
      break;
    }

    // 19. 貂蟬【閉月・連環美人計】
    case '閉月・連環美人計': {
      if (enemies.length < 2) {
        // 若只剩一人，造成魅惑心靈傷害
        const soloTarget = enemies[0];
        if (soloTarget) {
          const dmg = Math.floor(atkGen.int * 5.5);
          popups.push({ unitId: soloTarget.id, text: `魅惑 -${dmg}`, isCrit: true });
          logs.push({
            message: `🌙💃【閉月・美人傾城！】貂蟬翩翩起舞，敵將 ${soloTarget.generalName} 神魂顛倒！造成 ${dmg} 傷害並陷入混亂！`,
            type: 'strategy'
          });
          updatedUnits = updatedUnits.map(u => {
            if (u.id === soloTarget.id) {
              return { ...u, troops: Math.max(0, u.troops - dmg), status: 'confused', morale: Math.max(0, (u.morale ?? 100) - 20) };
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

      // 武力最高者對智謀最高者施加劈砍攻擊
      const strTroopFactor = 0.35 + 0.65 * Math.sqrt(Math.max(0.1, highestStr.troops / (highestStr.maxTroops || 1000)));
      const strBlowDamage = Math.floor(strGen.str * 4.8 * strTroopFactor);

      // 智謀最高者對武力最高者施加奇謀反擊
      const intCounterDamage = Math.floor(intGen.int * 4.8);

      logs.push({
        message: `🌙💃【閉月・連環美人計！】貂蟬一舞傾城，巧施離間計！魅惑敵方武力第一【${highestStr.generalName}】與智謀第一【${highestInt.generalName}】反目互擊！雙方陷入混亂！`,
        type: 'strategy'
      });
      logs.push({
        message: `⚔️💥【同袍互殘！】武將【${highestStr.generalName}】與軍師【${highestInt.generalName}】互相反目重創，敵全軍士氣 -15！`,
        type: 'critical'
      });

      popups.push({ unitId: highestInt.id, text: `反目 -${strBlowDamage}!`, isCrit: true });
      popups.push({ unitId: highestStr.id, text: `反目 -${intCounterDamage}!`, isCrit: true });

      updatedUnits = updatedUnits.map(u => {
        if (u.id === highestInt.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - strBlowDamage),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 20),
            status: 'confused'
          };
        }
        if (u.id === highestStr.id) {
          return {
            ...u,
            troops: Math.max(0, u.troops - intCounterDamage),
            morale: Math.max(0, (u.morale ?? 100) - 20),
            stamina: Math.max(0, (u.stamina ?? 100) - 20),
            status: 'confused'
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

    // 20. 賈詡【毒士亂武・萬劫】
    case '毒士亂武・萬劫': {
      logs.push({
        message: `☠️🌀【毒士亂武・萬劫！】賈詡施展詭道之計，召喚【劇毒瘴氣】籠罩敵全軍！每回合損失 4% 兵力，持續 2 回合！`,
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
        betrayDmg = Math.floor(bGen.str * 3.8);
        logs.push({
          message: `🗡️🩸【倒戈相向！】敵將【${betrayer.generalName}】受惑倒戈砍向友軍【${betrayTarget.generalName}】，造成 ${betrayDmg} 內鬨傷害！`,
          type: 'critical'
        });
        popups.push({ unitId: betrayTarget.id, text: `倒戈 -${betrayDmg}🩸`, isCrit: true });
      }

      updatedUnits = updatedUnits.map(u => {
        if (u.isAttacker !== isAttacker && u.troops > 0) {
          const directDmg = Math.floor(atkGen.int * 4.2 * atkMod);
          let extraBetray = 0;
          if (betrayTarget && u.id === betrayTarget.id) {
            extraBetray = betrayDmg;
          }
          popups.push({ unitId: u.id, text: `劇毒 -${directDmg}☠️`, isCrit: false });
          return {
            ...u,
            troops: Math.max(0, u.troops - directDmg - extraBetray),
            poisonTurns: 2, // 持續 2 回合劇毒瘴氣
            morale: Math.max(0, (u.morale ?? 100) - 15),
            stamina: Math.max(0, (u.stamina ?? 100) - 15),
            status: u.status === 'normal' ? 'panicked' : u.status
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
