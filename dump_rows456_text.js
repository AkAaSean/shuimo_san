import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's print out the text of every single card across all 7 rows!
// Rows 4, 5, 6 have 12 cards each:
// Row 4: C0..C11
// Row 5: C0..C11
// Row 6: C0..C11

for (let r = 4; r <= 6; r++) {
  const y0 = Math.floor(r * (H / 7));
  const y1 = Math.floor((r + 1) * (H / 7));
  console.log(`\n======================================================`);
  console.log(`====================== ROW ${r} ======================`);
  console.log(`======================================================`);

  for (let c = 0; c < 12; c++) {
    const x0 = Math.floor(c * (W / 12));
    const x1 = Math.floor((c + 1) * (W / 12));

    console.log(`\n--- Row ${r}, Col ${c} (X: ${x0}..${x1}) ---`);
    for (let y = y0 + 54; y < y1 - 2; y += 1) {
      let line = '';
      for (let x = x0 + 8; x < x1 - 8; x += 1) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 100 && g < 100 && b < 100) line += '█';
        else if (red < 150 && g < 150 && b < 150) line += '▒';
        else line += ' ';
      }
      if (line.trim().length > 0) console.log(line);
    }
  }
}
