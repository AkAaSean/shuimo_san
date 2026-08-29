const fs = require('fs');
let code = fs.readFileSync('src/engine/battleCalculations.ts', 'utf8');

if (!code.includes("'佈陣': {")) {
  code = code.replace("export const PASSIVE_SKILL_REGISTRY: Record<PassiveSkillId, PassiveSkillDef> = {", 
`export const PASSIVE_SKILL_REGISTRY: Record<PassiveSkillId, PassiveSkillDef> = {
  '佈陣': {
    id: '佈陣',
    name: '佈陣',
    category: '被動',
    desc: '變更陣形',
    triggerLabel: '【佈陣】',
    triggerType: 'strategy_targeted',
    iconSymbol: '🔄'
  },`);
  fs.writeFileSync('src/engine/battleCalculations.ts', code);
}
