import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// All items in PRD:
// 1-28: Weapons
// 29-37: Horses/Vehicles: 赤兔馬, 的盧馬, 爪黃飛電, 絕影, 照夜玉獅子, 快航, 汗血馬, 涼州馬, 四輪車
// 38-49: Books: 孫子兵法, 兵法二十四篇, 遁甲天書, 孟德新書, 六韜, 三略, 吳子兵法, 司馬法, 太公陰符經, 春秋左氏傳, 尉繚子, 太平要術書 (or 太平要術)
// 50-51: Maps: 西蜀地形圖, 平蠻指掌圖
// 52-56: Treasures: 傳國玉璽, 和氏璧, 九錫, 銅雀, 夜光珠
// 57-61: Medical Books: 青囊書, 傷寒雜病論, 太平清領道, 神農本草經, 黃帝內經

// Let's check text lines of row 4, 5, 6 specifically:
function printCardText(r, c) {
  const y0 = Math.floor(r * H / 7);
  const y1 = Math.floor((r + 1) * H / 7);
  const x0 = Math.floor(c * W / 12);
  const x1 = Math.floor((c + 1) * W / 12);
  console.log(`\n=== Card R${r}_C${c} ===`);
  for (let y = y0 + 53; y < y1 - 1; y++) {
    let line = '';
    for (let x = x0 + 6; x < x1 - 6; x++) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 110 && g < 110 && b < 110) line += '█';
      else if (red < 155 && g < 155 && b < 155) line += '▒';
      else line += ' ';
    }
    if (line.trim()) console.log(line);
  }
}

console.log("--- ROW 4 ---");
for (let c = 0; c < 12; c++) printCardText(4, c);

console.log("--- ROW 5 ---");
for (let c = 0; c < 12; c++) printCardText(5, c);

console.log("--- ROW 6 ---");
for (let c = 0; c < 12; c++) printCardText(6, c);
