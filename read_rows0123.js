import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// In Sangokushi 11 / KOEI weapons:
// Let's list all candidate items from KOEI San 11 / User's list:
// 1. 方天畫戟
// 2. 青龍偃月刀
// 3. 丈八蛇矛
// 4. 倚天劍
// 5. 青釭劍
// 6. 雌雄雙股劍
// 7. 古錠刀
// 8. 涯角槍 (or 雙鐵戟 / 七星寶刀 / 大斧 / 三尖刀 / 鐵蒺藜骨朵 / 鐵鞭 / 養由基弓 / 李廣弓 / 寶雕弓 / 東胡飛弓 / 鳳嘴刀 / 眉尖刀 / 三丈矛 / 棗木槊 / 手戟 / 梅花袖箭 / 袖箭 / 大桿刀 / 大刀 / 金馬槊)

// Let's write a script that outputs each card's center image and exact detected name
// Let's check the text in all cells of rows 0, 1, 2, 3, 4, 5, 6!

function printCard(r, c, x0, x1, y0, y1, label) {
  console.log(`\n===================== ${label} [R${r} C${c}] (X:${x0}..${x1}) =====================`);
  for (let y = y0 + 54; y < y1 - 2; y += 1) {
    let line = '';
    for (let x = x0 + 6; x < x1 - 6; x += 1) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 100 && g < 100 && b < 100) line += '#';
      else if (red < 150 && g < 150 && b < 150) line += '+';
      else line += ' ';
    }
    if (line.trim()) console.log(line);
  }
}

// Row 0
printCard(0, 0, 0, 85, 0, 76, "Row 0 Card 1");
printCard(0, 2, 170, 255, 0, 76, "Row 0 Card 2");
printCard(0, 4, 340, 425, 0, 76, "Row 0 Card 3");
printCard(0, 'wide', 470, 555, 0, 76, "Row 0 Card 4 (Wide)");
printCard(0, 7, 595, 680, 0, 76, "Row 0 Card 5");
printCard(0, 9, 765, 850, 0, 76, "Row 0 Card 6");
printCard(0, 11, 935, 1020, 0, 76, "Row 0 Card 7");

// Row 1
printCard(1, 0, 0, 85, 77, 153, "Row 1 Card 1");
printCard(1, 2, 170, 255, 77, 153, "Row 1 Card 2");
printCard(1, 4, 340, 425, 77, 153, "Row 1 Card 3");
printCard(1, 'wide', 470, 555, 77, 153, "Row 1 Card 4 (Wide)");
printCard(1, 7, 595, 680, 77, 153, "Row 1 Card 5");
printCard(1, 9, 765, 850, 77, 153, "Row 1 Card 6");
printCard(1, 11, 935, 1020, 77, 153, "Row 1 Card 7");

// Row 2
printCard(2, 0, 0, 85, 154, 230, "Row 2 Card 1");
printCard(2, 2, 170, 255, 154, 230, "Row 2 Card 2");
printCard(2, 4, 340, 425, 154, 230, "Row 2 Card 3");
printCard(2, 'wide', 470, 555, 154, 230, "Row 2 Card 4 (Wide)");
printCard(2, 7, 595, 680, 154, 230, "Row 2 Card 5");
printCard(2, 9, 765, 850, 154, 230, "Row 2 Card 6");
printCard(2, 11, 935, 1020, 154, 230, "Row 2 Card 7");

// Row 3
printCard(3, 0, 0, 85, 231, 307, "Row 3 Card 1");
printCard(3, 1, 85, 170, 231, 307, "Row 3 Card 2");
printCard(3, 2, 170, 255, 231, 307, "Row 3 Card 3");
printCard(3, 4, 340, 425, 231, 307, "Row 3 Card 4");
printCard(3, 'wide', 470, 555, 231, 307, "Row 3 Card 5 (Wide)");
printCard(3, 7, 595, 680, 231, 307, "Row 3 Card 6");
printCard(3, 9, 765, 850, 231, 307, "Row 3 Card 7");
printCard(3, 11, 935, 1020, 231, 307, "Row 3 Card 8");
