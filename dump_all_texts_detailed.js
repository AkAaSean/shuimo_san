import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// For each row, let's inspect each card's bottom text!
// Row 0..6
// In a card of height ~77px:
// The name is written at the bottom: y = y0 + 50 .. y0 + 74
// The name text is typically located between x0 + 10 and x1 - 10

function printCardText(row, col, x0, x1, y0, y1, desc) {
  console.log(`\n------------------ [${desc}] Row ${row}, Col ${col} (X:${x0}..${x1}, Y:${y0}..${y1}) ------------------`);
  for (let y = y0 + 50; y < y1 - 2; y += 1) {
    let line = '';
    for (let x = x0 + 4; x < x1 - 4; x += 1) {
      const idx = (y * W + x) * 4;
      const r = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      // Black text is dark
      if (r < 110 && g < 110 && b < 110) line += '█';
      else if (r < 165 && g < 165 && b < 165) line += '░';
      else line += ' ';
    }
    if (line.trim().length > 0) console.log(line);
  }
}

// Row 0:
const r0 = 0;
const y0_0 = 0, y1_0 = 76;
printCardText(0, 0, 0, 85, y0_0, y1_0, "R0 C0");
printCardText(0, 2, 170, 255, y0_0, y1_0, "R0 C2");
printCardText(0, 4, 340, 425, y0_0, y1_0, "R0 C4");
printCardText(0, 'wide', 470, 555, y0_0, y1_0, "R0 Wide (C5+6)");
printCardText(0, 7, 595, 680, y0_0, y1_0, "R0 C7");
printCardText(0, 9, 765, 850, y0_0, y1_0, "R0 C9");
printCardText(0, 11, 935, 1020, y0_0, y1_0, "R0 C11");

// Row 1:
const r1 = 1;
const y0_1 = 77, y1_1 = 153;
printCardText(1, 0, 0, 85, y0_1, y1_1, "R1 C0");
printCardText(1, 2, 170, 255, y0_1, y1_1, "R1 C2");
printCardText(1, 4, 340, 425, y0_1, y1_1, "R1 C4");
printCardText(1, 'wide', 470, 555, y0_1, y1_1, "R1 Wide (C5+6)");
printCardText(1, 7, 595, 680, y0_1, y1_1, "R1 C7");
printCardText(1, 9, 765, 850, y0_1, y1_1, "R1 C9");
printCardText(1, 11, 935, 1020, y0_1, y1_1, "R1 C11");

// Row 2:
const r2 = 2;
const y0_2 = 154, y1_2 = 230;
printCardText(2, 0, 0, 85, y0_2, y1_2, "R2 C0");
printCardText(2, 2, 170, 255, y0_2, y1_2, "R2 C2");
printCardText(2, 4, 340, 425, y0_2, y1_2, "R2 C4");
printCardText(2, 'wide', 470, 555, y0_2, y1_2, "R2 Wide (C5+6)");
printCardText(2, 7, 595, 680, y0_2, y1_2, "R2 C7");
printCardText(2, 9, 765, 850, y0_2, y1_2, "R2 C9");
printCardText(2, 11, 935, 1020, y0_2, y1_2, "R2 C11");

// Row 3:
const r3 = 3;
const y0_3 = 231, y1_3 = 307;
printCardText(3, 0, 0, 85, y0_3, y1_3, "R3 C0");
printCardText(3, 1, 85, 170, y0_3, y1_3, "R3 C1");
printCardText(3, 2, 170, 255, y0_3, y1_3, "R3 C2");
printCardText(3, 4, 340, 425, y0_3, y1_3, "R3 C4");
printCardText(3, 'wide', 470, 555, y0_3, y1_3, "R3 Wide (C5+6)");
printCardText(3, 7, 595, 680, y0_3, y1_3, "R3 C7");
printCardText(3, 9, 765, 850, y0_3, y1_3, "R3 C9");
printCardText(3, 11, 935, 1020, y0_3, y1_3, "R3 C11");
