import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's dump the text of ALL cards across rows 0..6 to a clean text file so we can inspect them:
let output = '';

const grid = [
  // Row 0
  { r: 0, cards: [
    { id: "R0_C0", x0: 0, x1: 85 },
    { id: "R0_C2", x0: 170, x1: 255 },
    { id: "R0_C4", x0: 340, x1: 425 },
    { id: "R0_Wide", x0: 470, x1: 555 },
    { id: "R0_C7", x0: 595, x1: 680 },
    { id: "R0_C9", x0: 765, x1: 850 },
    { id: "R0_C11", x0: 935, x1: 1020 },
  ]},
  // Row 1
  { r: 1, cards: [
    { id: "R1_C0", x0: 0, x1: 85 },
    { id: "R1_C2", x0: 170, x1: 255 },
    { id: "R1_C4", x0: 340, x1: 425 },
    { id: "R1_Wide", x0: 470, x1: 555 },
    { id: "R1_C7", x0: 595, x1: 680 },
    { id: "R1_C9", x0: 765, x1: 850 },
    { id: "R1_C11", x0: 935, x1: 1020 },
  ]},
  // Row 2
  { r: 2, cards: [
    { id: "R2_C0", x0: 0, x1: 85 },
    { id: "R2_C2", x0: 170, x1: 255 },
    { id: "R2_C4", x0: 340, x1: 425 },
    { id: "R2_Wide", x0: 470, x1: 555 },
    { id: "R2_C7", x0: 595, x1: 680 },
    { id: "R2_C9", x0: 765, x1: 850 },
    { id: "R2_C11", x0: 935, x1: 1020 },
  ]},
  // Row 3
  { r: 3, cards: [
    { id: "R3_C0", x0: 0, x1: 85 },
    { id: "R3_C1", x0: 85, x1: 170 },
    { id: "R3_C2", x0: 170, x1: 255 },
    { id: "R3_C4", x0: 340, x1: 425 },
    { id: "R3_Wide", x0: 470, x1: 555 },
    { id: "R3_C7", x0: 595, x1: 680 },
    { id: "R3_C9", x0: 765, x1: 850 },
    { id: "R3_C11", x0: 935, x1: 1020 },
  ]},
  // Row 4
  { r: 4, cards: [0,1,2,3,4,5,6,7,8,9,10,11].map(c => ({ id: `R4_C${c}`, x0: Math.floor(c*W/12), x1: Math.floor((c+1)*W/12) })) },
  // Row 5
  { r: 5, cards: [0,1,2,3,4,5,6,7,8,9,10,11].map(c => ({ id: `R5_C${c}`, x0: Math.floor(c*W/12), x1: Math.floor((c+1)*W/12) })) },
  // Row 6
  { r: 6, cards: [0,1,2,3,4,5,6,7,8,9,10,11].map(c => ({ id: `R6_C${c}`, x0: Math.floor(c*W/12), x1: Math.floor((c+1)*W/12) })) },
];

for (const row of grid) {
  const y0 = Math.floor(row.r * H / 7);
  const y1 = Math.floor((row.r + 1) * H / 7);
  output += `\n=======================================================\n`;
  output += `====================== ROW ${row.r} ======================\n`;
  output += `=======================================================\n`;
  for (const c of row.cards) {
    output += `\n--- Card ${c.id} (X: ${c.x0}..${c.x1}) ---\n`;
    for (let y = y0 + 52; y < y1 - 2; y += 1) {
      let line = '';
      for (let x = c.x0 + 4; x < c.x1 - 4; x += 1) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '█';
        else if (red < 155 && g < 155 && b < 155) line += '▒';
        else line += ' ';
      }
      if (line.trim().length > 0) output += line + '\n';
    }
  }
}

fs.writeFileSync('all_cards_text_map.txt', output);
console.log('Saved all_cards_text_map.txt');
