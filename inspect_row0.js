import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

function printAscii(x0, y0, w, h) {
  let lines = [];
  for (let y = y0; y < y0 + h; y += 1) {
    let line = '';
    for (let x = x0; x < x0 + w; x += 1) {
      const idx = (y * W + x) * 4;
      const r = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (r < 110 && g < 110 && b < 110) line += '█';
      else if (r < 160 && g < 160 && b < 160) line += '▒';
      else line += ' ';
    }
    if (line.trim()) lines.push(line);
  }
  return lines.join('\n');
}

// Check Row 0
console.log('=== ROW 0 ===');
console.log('R0_C0:', '\n' + printAscii(0, 50, 85, 30));
console.log('R0_C2:', '\n' + printAscii(170, 50, 85, 30));
console.log('R0_C4:', '\n' + printAscii(341, 50, 85, 30));
console.log('R0_C5 (WIDE C5+C6 or C5, C6):', '\n' + printAscii(426, 50, 85, 30));
console.log('R0_C6:', '\n' + printAscii(512, 50, 85, 30));
console.log('R0_C7:', '\n' + printAscii(597, 50, 85, 30));
console.log('R0_C9:', '\n' + printAscii(768, 50, 85, 30));
console.log('R0_C11:', '\n' + printAscii(938, 50, 85, 30));
