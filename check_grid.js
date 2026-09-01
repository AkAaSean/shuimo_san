import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

for (let r = 0; r < 7; r++) {
  console.log(`\n======================================== ROW ${r} ========================================`);
  for (let c = 0; c < 12; c++) {
    const y0 = Math.floor(r * H / 7);
    const y1 = Math.floor((r + 1) * H / 7);
    const x0 = Math.floor(c * W / 12);
    const x1 = Math.floor((c + 1) * W / 12);
    
    // Check if cell is part of wide card
    let lineText = [];
    for (let y = y0 + 53; y < y1 - 1; y += 2) {
      let line = '';
      for (let x = x0 + 6; x < x1 - 6; x += 2) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '#';
        else if (red < 155 && g < 155 && b < 155) line += '+';
        else line += ' ';
      }
      if (line.trim()) lineText.push(line);
    }
    console.log(`[R${r} C${c}] (len ${lineText.length} lines)`);
  }
}
