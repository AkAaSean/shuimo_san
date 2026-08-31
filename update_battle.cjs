const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView.tsx', 'utf8');

// Insert isPlayerAttacker at top of component if not exists
if (!code.includes('const isPlayerAttacker')) {
  code = code.replace(
    'const [customPromptMessage, setCustomPromptMessage] = useState<string | null>(null);',
    'const [customPromptMessage, setCustomPromptMessage] = useState<string | null>(null);\n\n  const isPlayerAttacker = gameState.activeBattle?.attackerRuler === gameState.rulerName;'
  );
}

// 299: u.isAttacker -> u.isAttacker === isPlayerAttacker
code = code.replace(
  'return battleState.units.find(u => u.id === battleState.activeUnitId && u.troops > 0) || battleState.units.find(u => u.isAttacker && u.troops > 0) || null;',
  'return battleState.units.find(u => u.id === battleState.activeUnitId && u.troops > 0) || battleState.units.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0) || null;'
);

// 746: nextAttacker
code = code.replace(
  'const nextAttacker = units.find(u => u.isAttacker && u.troops > 0 && !u.hasActed);',
  'const nextAttacker = units.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0 && !u.hasActed);'
);

// 767: firstUnit
code = code.replace(
  'const firstUnit = updatedUnits.find(u => u.isAttacker && u.troops > 0);',
  'const firstUnit = updatedUnits.find(u => u.isAttacker === isPlayerAttacker && u.troops > 0);'
);

// Check if attacker won by palace
code = code.replace(
  'if (attackerInPalace) {\n      addBattleLogs([`👑 【太守府陷落】攻方大軍突破重圍，直取並攻佔太守府大本營！守軍全線潰敗，攻方大獲全勝！`], \'critical\');',
  'if (attackerInPalace) {\n      addBattleLogs([`👑 【太守府陷落】攻方大軍突破重圍，直取並攻佔太守府大本營！守軍全線潰敗，攻方大獲全勝！`], \'critical\');'
);

// We need to change the checkBattleEnd logic to use isPlayerAttacker for log texts
const checkBattleEndOriginal = `    const attackersAlive = units.filter(u => u.isAttacker && u.troops > 0);
    const defendersAlive = units.filter(u => !u.isAttacker && u.troops > 0);

    if (defendersAlive.length === 0) {
      addBattleLogs(['🎉 敵軍全線崩潰，我軍大獲全勝，奪取城池！'], 'critical');
      setTimeout(() => onResolveBattle('attacker'), 1500);
      return true;
    }

    if (attackersAlive.length === 0) {
      addBattleLogs(['🛡️ 敵軍久攻不下，傷亡慘重，我軍成功守住城池！'], 'critical');
      setTimeout(() => onResolveBattle('defender'), 1500);
      return true;
    }`;

const checkBattleEndReplacement = `    const attackersAlive = units.filter(u => u.isAttacker && u.troops > 0);
    const defendersAlive = units.filter(u => !u.isAttacker && u.troops > 0);

    if (defendersAlive.length === 0) {
      addBattleLogs([isPlayerAttacker ? '🎉 敵軍全線崩潰，我軍大獲全勝，奪取城池！' : '💀 我方守軍全軍覆沒，城池失守！'], 'critical');
      setTimeout(() => onResolveBattle('attacker'), 1500);
      return true;
    }

    if (attackersAlive.length === 0) {
      addBattleLogs([isPlayerAttacker ? '💀 我方攻城部隊全軍覆沒，無功而返！' : '🛡️ 敵軍傷亡慘重，我軍成功守住城池！'], 'critical');
      setTimeout(() => onResolveBattle('defender'), 1500);
      return true;
    }`;

code = code.replace(checkBattleEndOriginal, checkBattleEndReplacement);

fs.writeFileSync('src/components/BattleView.tsx', code, 'utf8');
