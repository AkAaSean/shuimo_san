const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

code = code.replace(
  `        setBattleOutcome({
          winner: 'defender',
          title: '戰役失利・全軍撤退',
          message: \`我軍進攻【\${battleState?.provinceName || '敵城'}】遭遇頑強抵抗，主力與後備將士傷亡慘重，殘部只得撤回原城休整！\`,
          isWin: false
        });`,
  `        setBattleOutcome({
          winner: 'defender',
          title: gameState.activeBattle?.isDefense ? '防守成功・固若金湯' : '戰役失利・全軍撤退',
          message: gameState.activeBattle?.isDefense 
            ? \`來犯之敵遭遇我方頑強抵抗，傷亡慘重，已全軍撤退！【\${battleState?.provinceName || '本城'}】安然無恙！\`
            : \`我軍進攻【\${battleState?.provinceName || '敵城'}】遭遇頑強抵抗，主力與後備將士傷亡慘重，殘部只得撤回原城休整！\`,
          isWin: gameState.activeBattle?.isDefense ? true : false
        });`
);

code = code.replace(
  `        setBattleOutcome({
          winner: 'attacker',
          title: '戰爭大捷・破城克敵',
          message: \`我軍英勇善戰，成功全殲【\${battleState?.provinceName || '城池'}】守將與敵方援軍！城池已平定，主攻部隊凱旋進駐！\`,
          isWin: true
        });`,
  `        setBattleOutcome({
          winner: 'attacker',
          title: gameState.activeBattle?.isDefense ? '城池陷落・全軍覆沒' : '戰爭大捷・破城克敵',
          message: gameState.activeBattle?.isDefense 
            ? \`我方守城部隊與援軍已全數陣亡，無力回天...【\${battleState?.provinceName || '城池'}】落入敵軍手中！\`
            : \`我軍英勇善戰，成功全殲【\${battleState?.provinceName || '城池'}】守將與敵方援軍！城池已平定，主攻部隊凱旋進駐！\`,
          isWin: gameState.activeBattle?.isDefense ? false : true
        });`
);

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
