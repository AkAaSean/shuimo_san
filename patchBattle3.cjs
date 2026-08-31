const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

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
      ? "確定要放棄守城全軍撤退嗎？撤退將判定防守失敗，城池將落入敵手！" 
      : "確定要下令全軍撤退嗎？撤退將判定攻城失敗，殘餘部隊將有序班師回城。";
      
    if (window.confirm(confirmMsg)) {
      setBattleOutcome({
        winner: isDef ? 'attacker' : 'defender',
        title: '鳴金收兵 ‧ 全軍撤退',
        message: isDef 
          ? \`我軍決定放棄抵抗，主動撤離【\${battleState?.provinceName || '戰場'}】...\`
          : \`我軍主動下令鳴金收兵，部隊有序撤出【\${battleState?.provinceName || '戰場'}】，回到原城池休整。\`,
        isWin: false
      });
    }
  };`
);

// Also we should check the battle end condition in processReplacements or advanceTurn
code = code.replace(
  `            setBattleOutcome({
              winner: 'defender',
              title: '攻城失敗',
              message: '我方主攻部隊與後備軍皆已潰滅或撤退，攻城宣告失敗。',
              isWin: false
            });`,
  `            setBattleOutcome({
              winner: 'defender', // Actually, if AI is attacking (isDefense=true), player is defender. Wait, if player is defender, and player troops are wiped out, the winner should be attacker!
              title: isDefenseRender ? '守城失敗' : '攻城失敗',
              message: isDefenseRender ? '我方守軍已全數陣亡或潰散，城池失守！' : '我方部隊與後備軍皆已潰滅或撤退，攻城宣告失敗。',
              isWin: false
            });`
);
// Wait, the above replacement needs the actual code structure. Let's inspect advanceTurn or processReplacements.
