const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

// 1. isPlayerTurn logic
code = code.replace(
  `  const isPlayerTurn = activeUnit?.isAttacker;`,
  `  const isDefense = gameState.activeBattle?.isDefense;
  const isPlayerTurn = activeUnit ? (isDefense ? !activeUnit.isAttacker : activeUnit.isAttacker) : false;`
);

// 2. strategist check logic (needs to know which one is player's)
code = code.replace(
  `  const strategistName = activeUnit?.isAttacker 
    ? battleState?.attackerStrategist 
    : battleState?.defenderStrategist;`,
  `  const strategistName = activeUnit?.isAttacker 
    ? battleState?.attackerStrategist 
    : battleState?.defenderStrategist;` // wait, strategist belongs to the unit's side, so this is correct.
);

// 3. attackerUnits and defenderUnits variables to player/enemy
code = code.replace(
  `  const attackerUnits = battleState.units?.filter((u: any) => u.isAttacker) || [];
  const defenderUnits = battleState.units?.filter((u: any) => !u.isAttacker) || [];`,
  `  const attackerUnits = battleState.units?.filter((u: any) => u.isAttacker) || [];
  const defenderUnits = battleState.units?.filter((u: any) => !u.isAttacker) || [];
  const isDefenseRender = gameState.activeBattle?.isDefense;
  const playerUnits = isDefenseRender ? defenderUnits : attackerUnits;
  const enemyUnits = isDefenseRender ? attackerUnits : defenderUnits;
  const playerReserves = isDefenseRender ? defenderReserves : attackerReserves;
  const enemyReserves = isDefenseRender ? attackerReserves : defenderReserves;`
);

// 4. left column (player)
code = code.replace(
  `          {/* 左列：我軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-sky-400 flex items-center justify-between px-1 pb-0.5 border-b border-sky-900/40">
              <span className="flex items-center gap-1">🔷 我軍部隊</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-sky-300">{attackerReserves.length}</strong> 人
              </span>
            </div>
            {attackerUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={false}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {}}
              />
            ))}`,
  `          {/* 左列：我軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-sky-400 flex items-center justify-between px-1 pb-0.5 border-b border-sky-900/40">
              <span className="flex items-center gap-1">🔷 我軍部隊</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-sky-300">{playerReserves.length}</strong> 人
              </span>
            </div>
            {playerUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={false}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {}}
              />
            ))}`
);

// 5. right column (enemy)
code = code.replace(
  `          {/* 右列：敵軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-rose-400 flex items-center justify-between px-1 pb-0.5 border-b border-rose-900/40">
              <span className="flex items-center gap-1">🔶 守敵部隊</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-rose-300">{defenderReserves.length}</strong> 人
              </span>
            </div>
            {defenderUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={targetingMode !== null && u.troops > 0}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {
                  if (targetingMode === 'melee') handleMeleeAttack(u.id);
                  if (targetingMode === 'skill') handleSkillAttack(u.id);
                }}
              />
            ))}`,
  `          {/* 右列：敵軍 (1~5 名，若陣亡自動依序遞補) */}
          <div className="flex-1 flex flex-col justify-around gap-1">
            <div className="text-[11px] font-black text-rose-400 flex items-center justify-between px-1 pb-0.5 border-b border-rose-900/40">
              <span className="flex items-center gap-1">🔶 {isDefenseRender ? '攻方敵軍' : '守敵部隊'}</span>
              <span className="text-[10px] text-stone-400 font-bold">
                待命後援: <strong className="text-rose-300">{enemyReserves.length}</strong> 人
              </span>
            </div>
            {enemyUnits.map((u: BattleUnit) => (
              <CompactUnitStrip 
                key={u.id}
                unit={u}
                gameState={gameState}
                battlefieldTerrain={battlefieldTerrain}
                isActive={activeUnitId === u.id}
                isTargetable={targetingMode !== null && u.troops > 0}
                floatingText={damageFloatingText?.targetId === u.id ? damageFloatingText : null}
                onSelect={() => {
                  if (targetingMode === 'melee') handleMeleeAttack(u.id);
                  if (targetingMode === 'skill') handleSkillAttack(u.id);
                }}
              />
            ))}`
);

// 6. fix AI attack targeting
code = code.replace(
  `      const timer = setTimeout(() => {
        const aliveAttackers = battleState.units.filter((u: any) => u.isAttacker && u.troops > 0);
        if (aliveAttackers.length > 0) {
          const target = aliveAttackers[Math.floor(Math.random() * aliveAttackers.length)];
          handleMeleeAttack(target.id);
        } else {
          handleDefend();
        }
      }, 900);`,
  `      const timer = setTimeout(() => {
        const aiIsAttacker = activeUnit.isAttacker;
        const validTargets = battleState.units.filter((u: any) => u.isAttacker !== aiIsAttacker && u.troops > 0);
        if (validTargets.length > 0) {
          const target = validTargets[Math.floor(Math.random() * validTargets.length)];
          handleMeleeAttack(target.id);
        } else {
          handleDefend();
        }
      }, 900);`
);

// 7. compact unit color styling
code = code.replace(
  `unit.isAttacker ? 'bg-sky-400' : 'bg-rose-500'`,
  `(unit.isAttacker === !gameState.activeBattle?.isDefense) ? 'bg-sky-400' : 'bg-rose-500'`
);
code = code.replace(
  `unit.isAttacker ? 'text-sky-300' : 'text-rose-300'`,
  `(unit.isAttacker === !gameState.activeBattle?.isDefense) ? 'text-sky-300' : 'text-rose-300'`
);
code = code.replace(
  `unit.isAttacker ? 'bg-[#1d252c]/90 border-[#2a3c4c]'`,
  `(unit.isAttacker === !gameState.activeBattle?.isDefense) ? 'bg-[#1d252c]/90 border-[#2a3c4c]'`
);

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
