const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

code = code.replace(
  `        setTimeout(() => {
          setBattleOutcome({
            winner: 'defender',
            title: '30 天守城大捷・攻方退兵',
            message: \`兩軍於【\${battleState?.provinceName || '城池'}】堅守苦戰 30 天未分勝負！攻城部隊耗盡時限班師撤退，守方成功守住城池！\`,
            isWin: false
          });
        }, 500);`,
  `        setTimeout(() => {
          setBattleOutcome({
            winner: 'defender',
            title: '30 天守城大捷・攻方退兵',
            message: \`兩軍於【\${battleState?.provinceName || '城池'}】堅守苦戰 30 天未分勝負！攻方部隊耗盡時限班師撤退，守城成功！\`,
            isWin: gameState.activeBattle?.isDefense ? true : false
          });
        }, 500);`
);

// I already patched handleTriggerRetreat, why did the grep show the old string?
// Ah! My patch in patchBattle3.cjs didn't work because I included something that didn't match perfectly.
// Let's rewrite handleTriggerRetreat:

code = code.replace(
  `  const handleTriggerRetreat = () => {
    if (window.confirm("確定要下令全軍撤退嗎？撤退將判定攻城失敗，殘餘部隊將有序班師回城。")) {
      setBattleOutcome({
        winner: 'defender',
        title: '鳴金收兵 ‧ 全軍撤退',
        message: \`我軍主動下令鳴金收兵，部隊有序撤出【\${battleState?.provinceName || '戰場'}】，回到原城池休整。\`,
        isWin: false
      });
    }
  };`,
  `  const handleTriggerRetreat = () => {
    const isDef = gameState.activeBattle?.isDefense;
    const confirmMsg = isDef 
      ? "確定要放棄防守，全軍棄城撤退嗎？撤退將判定城池失守！" 
      : "確定要下令全軍撤退嗎？撤退將判定攻城失敗，殘餘部隊將有序班師回城。";
      
    if (window.confirm(confirmMsg)) {
      setBattleOutcome({
        winner: isDef ? 'attacker' : 'defender',
        title: '鳴金收兵 ‧ 全軍撤退',
        message: isDef 
          ? \`我方決定放棄抵抗，主動撤離【\${battleState?.provinceName || '戰場'}】...\`
          : \`我軍主動下令鳴金收兵，部隊有序撤出【\${battleState?.provinceName || '戰場'}】，回到原城池休整。\`,
        isWin: false
      });
    }
  };`
);

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
