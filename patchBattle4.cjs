const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

code = code.replace(
  `        if (aliveAttackers.length === 0 && currentAtkRes.length === 0) {
          setTimeout(() => {
            setBattleOutcome({
              winner: 'defender',
              title: '攻城失敗',
              message: '我方主攻部隊與後備軍皆已潰滅或撤退，攻城宣告失敗。',
              isWin: false
            });
          }, 1500);
          return;
        }`,
  `        if (aliveAttackers.length === 0 && currentAtkRes.length === 0) {
          setTimeout(() => {
            setBattleOutcome({
              winner: 'defender',
              title: gameState.activeBattle?.isDefense ? '防守成功' : '攻城失敗',
              message: gameState.activeBattle?.isDefense ? '敵方進犯部隊已被全殲，防守成功！' : '我方主攻部隊與後備軍皆已潰滅或撤退，攻城宣告失敗。',
              isWin: gameState.activeBattle?.isDefense ? true : false
            });
          }, 1500);
          return;
        }`
);

code = code.replace(
  `        if (aliveDefenders.length === 0 && currentDefRes.length === 0) {
          setTimeout(() => {
            setBattleOutcome({
              winner: 'attacker',
              title: '破城大捷',
              message: '敵方守城部隊與援軍皆已被全殲，我軍成功奪取城池！',
              isWin: true
            });
          }, 1500);
          return;
        }`,
  `        if (aliveDefenders.length === 0 && currentDefRes.length === 0) {
          setTimeout(() => {
            setBattleOutcome({
              winner: 'attacker',
              title: gameState.activeBattle?.isDefense ? '城池陷落' : '破城大捷',
              message: gameState.activeBattle?.isDefense ? '我方守軍已全數陣亡，城池失守...' : '敵方守城部隊與援軍皆已被全殲，我軍成功奪取城池！',
              isWin: gameState.activeBattle?.isDefense ? false : true
            });
          }, 1500);
          return;
        }`
);

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
