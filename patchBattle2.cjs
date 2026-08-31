const fs = require('fs');
let code = fs.readFileSync('src/components/BattleView5v5.tsx', 'utf8');

code = code.replace(
  `            <span className={\`px-1.5 py-0.5 rounded border \${battleState.attackerFood <= 0 ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' : 'bg-[#181411] text-sky-300 border-[#3b3128]'}\`}>
              🌾 我糧: {battleState.attackerFood ?? 0}
            </span>
            <span className={\`px-1.5 py-0.5 rounded border \${battleState.defenderFood <= 0 ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' : 'bg-[#181411] text-rose-300 border-[#3b3128]'}\`}>
              🌾 敵糧: {battleState.defenderFood ?? 0}
            </span>`,
  `            <span className={\`px-1.5 py-0.5 rounded border \${(isDefenseRender ? battleState.defenderFood : battleState.attackerFood) <= 0 ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' : 'bg-[#181411] text-sky-300 border-[#3b3128]'}\`}>
              🌾 我軍兵糧: {isDefenseRender ? battleState.defenderFood : battleState.attackerFood ?? 0}
            </span>
            <span className={\`px-1.5 py-0.5 rounded border \${(isDefenseRender ? battleState.attackerFood : battleState.defenderFood) <= 0 ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' : 'bg-[#181411] text-rose-300 border-[#3b3128]'}\`}>
              🌾 敵方兵糧: {isDefenseRender ? battleState.attackerFood : battleState.defenderFood ?? 0}
            </span>`
);

code = code.replace(
  `              <span>我軍待命援將: <strong className="text-sky-300">{attackerReserves.length}</strong> 員</span>
              <span>|</span>
              <span>敵軍待命援將: <strong className="text-rose-300">{defenderReserves.length}</strong> 員</span>`,
  `              <span>我方待命援將: <strong className="text-sky-300">{playerReserves.length}</strong> 員</span>
              <span>|</span>
              <span>敵方待命援將: <strong className="text-rose-300">{enemyReserves.length}</strong> 員</span>`
);

fs.writeFileSync('src/components/BattleView5v5.tsx', code);
