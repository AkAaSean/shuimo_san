import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's write a script to output a visual text representation of the bottom of EVERY single card in weapon.jpg!
// Let's do all rows 0..6:

for (let r = 0; r < 7; r++) {
  const y0 = Math.floor(r * (H / 7));
  const y1 = Math.floor((r + 1) * (H / 7));
  console.log(`\n======================================================`);
  console.log(`====================== ROW ${r} ======================`);
  console.log(`======================================================`);

  for (let c = 0; c < 12; c++) {
    const x0 = Math.floor(c * (W / 12));
    const x1 = Math.floor((c + 1) * (W / 12));
    
    // Check if this cell has content
    let isRed = true;
    for (let y = y0 + 10; y < y1 - 10; y += 4) {
      for (let x = x0 + 10; x < x1 - 10; x += 4) {
        const idx = (y * W + x) * 4;
        if (!(rawData.data[idx] > 160 && rawData.data[idx+1] < 75 && rawData.data[idx+2] < 75)) {
          isRed = false;
          break;
        }
      }
    }
    if (isRed) continue;

    console.log(`\n--- Card at Row ${r}, Col ${c} (X: ${x0}..${x1}) ---`);
    for (let y = y0 + 52; y < y1 - 2; y += 1) {
      let line = '';
      for (let x = x0 + 4; x < x1 - 4; x += 1) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '█';
        else if (red < 160 && g < 160 && b < 160) line += '░';
        else line += ' ';
      }
      if (line.trim().length > 0) console.log(line);
    }
  }

  // Also check wide card in C5+C6 if r < 4
  if (r < 4) {
    console.log(`\n--- Wide Card at Row ${r} (X: 470..555) ---`);
    for (let y = y0 + 52; y < y1 - 2; y += 1) {
      let line = '';
      for (let x = 474; x < 550; x += 1) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '█';
        else if (red < 160 && g < 160 && b < 160) line += '░';
        else line += ' ';
      }
      if (line.trim().length > 0) console.log(line);
    }
  }
}
