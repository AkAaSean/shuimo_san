import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// In weapon.jpg:
// Let's print out what text is in each cell of Row 0, Row 1, Row 2, Row 3!
// Look at the bottom text (y=y1-22 to y1-4) of:
// Row 0:
// C0, C2, C4, C5+6, C7, C9, C11
// Row 1:
// C0, C2, C4, C5+6, C7, C9, C11
// Row 2:
// C0, C2, C4, C5+6, C7, C9, C11
// Row 3:
// C0, C1, C2, C4, C5+6, C7, C9, C11
// Row 4:
// C0..11
// Row 5:
// C0..11
// Row 6:
// C0..3

function printText(label, x0, x1, y0, y1) {
  console.log(`\n=================== ${label} (X=${x0}..${x1}, Y=${y0}..${y1}) ===================`);
  for (let y = y0; y < y1; y += 2) {
    let line = '';
    for (let x = x0; x < x1; x += 2) {
      const idx = (y * W + x) * 4;
      const cr = rawData.data[idx];
      const cg = rawData.data[idx+1];
      const cb = rawData.data[idx+2];
      if (cr < 90 && cg < 90 && cb < 90) line += '#';
      else if (cr < 160 && cg < 160) line += '+';
      else line += ' ';
    }
    console.log(line);
  }
}

// Row 0 text:
printText('Row 0 Col 0', 10, 75, 54, 76);
printText('Row 0 Col 2', 180, 245, 54, 76);
printText('Row 0 Col 4', 350, 415, 54, 76);
printText('Row 0 Wide (C5+C6)', 480, 545, 54, 76);
printText('Row 0 Col 7', 605, 675, 54, 76);
printText('Row 0 Col 9', 780, 845, 54, 76);
printText('Row 0 Col 11', 950, 1015, 54, 76);

// Row 1 text:
printText('Row 1 Col 0', 10, 75, 134, 156);
printText('Row 1 Col 2', 180, 245, 134, 156);
printText('Row 1 Col 4', 350, 415, 134, 156);
printText('Row 1 Wide (C5+C6)', 480, 545, 134, 156);
printText('Row 1 Col 7', 605, 675, 134, 156);
printText('Row 1 Col 9', 780, 845, 134, 156);
printText('Row 1 Col 11', 950, 1015, 134, 156);
