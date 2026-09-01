import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's print out the text of every single card from Row 4, 5, 6 with their decoded names:
// Row 4:
// C0: 的盧馬
// C1: 爪黃飛電
// C2: 絕影
// C3: 照夜玉獅子
// C4: 快航
// C5+C6 (Wide carriage? Or C5 / C6? Let's check: R4_C4, R4_C5, R4_C6)
// Wait! Let's check Row 4, 5, 6 layout!

for (let r = 4; r <= 6; r++) {
  for (let c = 0; c < 12; c++) {
    const y0 = Math.floor(r * H / 7);
    const y1 = Math.floor((r + 1) * H / 7);
    const x0 = Math.floor(c * W / 12);
    const x1 = Math.floor((c + 1) * W / 12);
    console.log(`\n================== [Row ${r} Col ${c}] ==================`);
    const lines = [];
    for (let y = y0 + 53; y < y1 - 1; y++) {
      let line = '';
      for (let x = x0 + 6; x < x1 - 6; x++) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '#';
        else if (red < 155 && g < 155 && b < 155) line += '+';
        else line += ' ';
      }
      if (line.trim()) lines.push(line);
    }
    console.log(lines.join('\n'));
  }
}
