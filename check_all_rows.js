import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

function inspectSlot(r, c, x0, x1, y0, y1, desc) {
  console.log(`\n======================================================`);
  console.log(`[R${r}_C${c}] ${desc} (X: ${Math.round(x0)}..${Math.round(x1)}, Y: ${y0}..${y1})`);
  console.log(`======================================================`);
  for (let y = y0 + 52; y < y1 - 1; y++) {
    let line = '';
    for (let x = Math.round(x0) + 4; x < Math.round(x1) - 4; x++) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 110 && g < 110 && b < 110) line += '█';
      else if (red < 155 && g < 155 && b < 155) line += '▒';
      else line += ' ';
    }
    if (line.trim()) console.log(line);
  }
}

// Check Row 3 in detail
for (let c = 0; c < 12; c++) {
  inspectSlot(3, c, c * (W/12), (c+1)*(W/12), 240, 320, `Col ${c}`);
}
inspectSlot(3, 'WIDE_56', 470, 555, 240, 320, `WIDE C5+C6`);

// Check Row 4 in detail
for (let c = 0; c < 12; c++) {
  inspectSlot(4, c, c * (W/12), (c+1)*(W/12), 320, 400, `Col ${c}`);
}
inspectSlot(4, 'WIDE_56', 470, 555, 320, 400, `WIDE C5+C6`);

// Check Row 5 in detail
for (let c = 0; c < 12; c++) {
  inspectSlot(5, c, c * (W/12), (c+1)*(W/12), 400, 480, `Col ${c}`);
}

// Check Row 6 in detail
for (let c = 0; c < 12; c++) {
  inspectSlot(6, c, c * (W/12), (c+1)*(W/12), 480, 559, `Col ${c}`);
}
