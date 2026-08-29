const fs = require('fs');

const path = 'src/data/items.ts';
let code = fs.readFileSync(path, 'utf8');

// Weapons
const weaponTypes = ['长柄刀', '戟', '暗器', '鞭', '弓'];
weaponTypes.forEach(wt => {
  code = code.replaceAll(`category: '${wt}'`, `category: '武器'`);
});

// Books
code = code.replaceAll(`category: '奇書'`, `category: '兵書'`);
code = code.replaceAll(`category: '地圖'`, `category: '兵書'`);

fs.writeFileSync(path, code);
