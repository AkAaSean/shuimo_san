import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// In weapon.jpg, what are all the weapon card positions?
// Let's identify the actual card names by inspecting the text on each card.
// Let's create a script that analyzes the text on each card by printing out a 40x20 character map of each card's nameplate!

function getCardTextMap(r, c, x0, x1, y0, y1) {
  const lines = [];
  for (let y = y0 + 52; y < y1 - 2; y += 1) {
    let line = '';
    for (let x = x0 + 2; x < x1 - 2; x += 1) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 110 && g < 110 && b < 110) line += 'X';
      else if (red < 155 && g < 155 && b < 155) line += '.';
      else line += ' ';
    }
    if (line.trim().length > 0) lines.push(line);
  }
  return lines;
}

// Let's test all cards across all rows:
const rows = [
  // Row 0: Y=0..76
  { row: 0, y0: 0, y1: 76, cols: [
    { c: 0, x0: 0, x1: 85, nameGuess: "方天畫戟" },
    { c: 2, x0: 170, x1: 255, nameGuess: "青龍偃月刀" },
    { c: 4, x0: 340, x1: 425, nameGuess: "丈八蛇矛" },
    { c: 'wide', x0: 470, x1: 555, nameGuess: "倚天劍" },
    { c: 7, x0: 595, x1: 680, nameGuess: "青釭劍 / 棗木槊" },
    { c: 9, x0: 765, x1: 850, nameGuess: "雌雄雙股劍" },
    { c: 11, x0: 935, x1: 1020, nameGuess: "???" }
  ]},
  // Row 1: Y=77..153
  { row: 1, y0: 77, y1: 153, cols: [
    { c: 0, x0: 0, x1: 85, nameGuess: "古錠刀" },
    { c: 2, x0: 170, x1: 255, nameGuess: "涯角槍" },
    { c: 4, x0: 340, x1: 425, nameGuess: "七星寶刀" },
    { c: 'wide', x0: 470, x1: 555, nameGuess: "養由基弓" },
    { c: 7, x0: 595, x1: 680, nameGuess: "雙鐵戟 / 大斧" },
    { c: 9, x0: 765, x1: 850, nameGuess: "三尖刀" },
    { c: 11, x0: 935, x1: 1020, nameGuess: "鐵蒺藜骨朵 / 鐵鞭" }
  ]},
  // Row 2: Y=154..230
  { row: 2, y0: 154, y1: 230, cols: [
    { c: 0, x0: 0, x1: 85, nameGuess: "??" },
    { c: 2, x0: 170, x1: 255, nameGuess: "??" },
    { c: 4, x0: 340, x1: 425, nameGuess: "??" },
    { c: 'wide', x0: 470, x1: 555, nameGuess: "??" },
    { c: 7, x0: 595, x1: 680, nameGuess: "??" },
    { c: 9, x0: 765, x1: 850, nameGuess: "??" },
    { c: 11, x0: 935, x1: 1020, nameGuess: "??" }
  ]},
  // Row 3: Y=231..307
  { row: 3, y0: 231, y1: 307, cols: [
    { c: 0, x0: 0, x1: 85, nameGuess: "??" },
    { c: 1, x0: 85, x1: 170, nameGuess: "??" },
    { c: 2, x0: 170, x1: 255, nameGuess: "??" },
    { c: 4, x0: 340, x1: 425, nameGuess: "??" },
    { c: 'wide', x0: 470, x1: 555, nameGuess: "??" },
    { c: 7, x0: 595, x1: 680, nameGuess: "??" },
    { c: 9, x0: 765, x1: 850, nameGuess: "??" },
    { c: 11, x0: 935, x1: 1020, nameGuess: "??" }
  ]}
];

for (const r of rows) {
  console.log(`\n============================ ROW ${r.row} ============================`);
  for (const card of r.cols) {
    console.log(`\nCard [${card.c}] (${card.x0}..${card.x1}):`);
    const lines = getCardTextMap(r.row, card.c, card.x0, card.x1, r.y0, r.y1);
    console.log(lines.join('\n'));
  }
}
