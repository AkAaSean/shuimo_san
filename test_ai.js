const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('src/engine/gameLogic.ts', 'utf-8');
console.log(code.includes("g.rulerName === rulerName"));
