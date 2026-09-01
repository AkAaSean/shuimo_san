import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// In Sangokushi 11 / KOEI games, let's identify each row:
// Row 0:
// C0: 方天畫戟
// C2: 青龍偃月刀
// C4: 丈八蛇矛
// Wide (C5+6): 倚天劍
// C7: 青釭劍
// C9: 雌雄雙股劍
// C11: 涯角槍 (or 棗木槊?) -> let's check text at C11!

// Row 1:
// C0: 古錠刀
// C2: 雙鐵戟
// C4: 七星寶刀
// Wide (C5+6): 養由基弓
// C7: 大斧
// C9: 三尖刀
// C11: 鐵蒺藜骨朵

// Row 2:
// C0: 鐵鞭
// C2: 李廣弓
// C4: 鳳嘴刀 / 眉尖刀?
// Wide (C5+6): 鳳嘴刀 / 眉尖刀?
// C7: 三丈矛 / 棗木槊?
// C9: 手戟 / 梅花袖箭?
// C11: 袖箭 / 大桿刀?

// Let's print the text for all cards in Row 0, 1, 2, 3, 4, 5, 6 with clear columns!

function dumpCardName(title, x0, x1, y0, y1) {
  console.log(`\n=== [${title}] ===`);
  const lines = [];
  for (let y = y0 + 53; y < y1 - 2; y += 1) {
    let line = '';
    for (let x = x0 + 10; x < x1 - 10; x += 1) {
      const idx = (y * W + x) * 4;
      const r = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (r < 110 && g < 110 && b < 110) line += '█';
      else if (r < 165 && g < 165 && b < 165) line += '▒';
      else line += ' ';
    }
    lines.push(line);
  }
  console.log(lines.join('\n'));
}

// Row 0:
dumpCardName("R0 C0", 0, 85, 0, 76);
dumpCardName("R0 C2", 170, 255, 0, 76);
dumpCardName("R0 C4", 340, 425, 0, 76);
dumpCardName("R0 Wide (C5+6)", 470, 555, 0, 76);
dumpCardName("R0 C7", 595, 680, 0, 76);
dumpCardName("R0 C9", 765, 850, 0, 76);
dumpCardName("R0 C11", 935, 1020, 0, 76);

// Row 1:
dumpCardName("R1 C0", 0, 85, 77, 153);
dumpCardName("R1 C2", 170, 255, 77, 153);
dumpCardName("R1 C4", 340, 425, 77, 153);
dumpCardName("R1 Wide (C5+6)", 470, 555, 77, 153);
dumpCardName("R1 C7", 595, 680, 77, 153);
dumpCardName("R1 C9", 765, 850, 77, 153);
dumpCardName("R1 C11", 935, 1020, 77, 153);

// Row 2:
dumpCardName("R2 C0", 0, 85, 154, 230);
dumpCardName("R2 C2", 170, 255, 154, 230);
dumpCardName("R2 C4", 340, 425, 154, 230);
dumpCardName("R2 Wide (C5+6)", 470, 555, 154, 230);
dumpCardName("R2 C7", 595, 680, 154, 230);
dumpCardName("R2 C9", 765, 850, 154, 230);
dumpCardName("R2 C11", 935, 1020, 154, 230);

// Row 3:
dumpCardName("R3 C0", 0, 85, 231, 307);
dumpCardName("R3 C1", 85, 170, 231, 307);
dumpCardName("R3 C2", 170, 255, 231, 307);
dumpCardName("R3 C4", 340, 425, 231, 307);
dumpCardName("R3 Wide (C5+6)", 470, 555, 231, 307);
dumpCardName("R3 C7", 595, 680, 231, 307);
dumpCardName("R3 C9", 765, 850, 231, 307);
dumpCardName("R3 C11", 935, 1020, 231, 307);
