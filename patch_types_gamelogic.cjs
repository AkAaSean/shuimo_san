const fs = require('fs');

// Patch types.ts
let typesData = fs.readFileSync('src/types.ts', 'utf8');
typesData = typesData.replace(
  `  provinceId: number | null;
  isRuler: boolean;
}`,
  `  provinceId: number | null;
  isRuler: boolean;
  soldiers: number;
  training: number;
  weapons: number;
}`
);
fs.writeFileSync('src/types.ts', typesData);

// Patch gameLogic.ts
let logicData = fs.readFileSync('src/engine/gameLogic.ts', 'utf8');
logicData = logicData.replace(
  `        provinceId: provinceId,
        isRuler: isRuler
      };`,
  `        provinceId: provinceId,
        isRuler: isRuler,
        soldiers: isRuler && provinceId ? 1000 : 0,
        training: 50,
        weapons: 50
      };`
);
fs.writeFileSync('src/engine/gameLogic.ts', logicData);
console.log('patched');
