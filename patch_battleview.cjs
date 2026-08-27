const fs = require('fs');
const content = fs.readFileSync('src/components/BattleView.tsx', 'utf8');

let newContent = content.replace(
  "import StrategySheet from './StrategySheet';",
  "import StrategySheet from './StrategySheet';\nimport FormationSelectionView from './FormationSelectionView';"
);

newContent = newContent.replace(
  "const [strategyOpen, setStrategyOpen] = useState(false);",
  "const [strategyOpen, setStrategyOpen] = useState(false);\n  const [formationSelectionComplete, setFormationSelectionComplete] = useState(false);"
);

newContent = newContent.replace(
  "<BattleHeader state={battleState} />",
  `{!formationSelectionComplete && (
        <FormationSelectionView 
          gameState={gameState} 
          battleState={battleState} 
          onComplete={(assignments) => {
            setBattleState(prev => {
              if (!prev) return prev;
              const newUnits = prev.units.map(u => {
                if (u.isAttacker && assignments[u.id]) {
                  return { ...u, formation: assignments[u.id] };
                }
                return u;
              });
              return { ...prev, units: newUnits };
            });
            setFormationSelectionComplete(true);
          }}
        />
      )}\n      <BattleHeader state={battleState} />`
);

fs.writeFileSync('src/components/BattleView.tsx', newContent);
