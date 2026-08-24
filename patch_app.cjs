const fs = require('fs');
const data = fs.readFileSync('src/App.tsx', 'utf8');

let updated = data.replace(
  `    if (['徵兵', '訓練兵士', '購買武器', '調整兵力'].includes(rawAction)) {
      setTempAction(rawAction);
      actions.setView('troops');
      return;
    }`,
  `    if (['徵兵', '訓練兵士', '購買武器', '調整兵力'].includes(rawAction)) {
      setTempAction(rawAction);
      actions.setView('troops');
      return;
    }

    if (['查看本郡狀態', '檢視將領'].includes(rawAction)) {
      setTempAction(rawAction);
      actions.setView('status');
      actions.setActiveMenu(null);
      return;
    }`
);

updated = updated.replace(
  `import TroopView from './components/TroopView';`,
  `import TroopView from './components/TroopView';\nimport StatusView from './components/StatusView';`
);

updated = updated.replace(
  `      ) : (
        <BattleView 
          gameState={gameState} 
          onExitBattle={() => actions.setView('map')} 
        />
      )}`,
  `      ) : gameState.view === 'status' ? (
        <StatusView
          gameState={gameState}
          initialAction={tempAction || '查看本郡狀態'}
          onExit={() => {
            actions.setView('map');
            setTempAction(null);
          }}
        />
      ) : (
        <BattleView 
          gameState={gameState} 
          onExitBattle={() => actions.setView('map')} 
        />
      )}`
);

fs.writeFileSync('src/App.tsx', updated);
console.log('App.tsx patched');
