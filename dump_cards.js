import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's create an HTML page or dump high-contrast images of the text of EVERY cell in weapon.jpg
// so we can read the exact Chinese names written on all 84 cells!

if (!fs.existsSync('public/assets/card_texts')) {
  fs.mkdirSync('public/assets/card_texts', { recursive: true });
}

for (let r = 0; r < 7; r++) {
  for (let c = 0; c < 12; c++) {
    const x0 = Math.floor(c * (W / 12));
    const x1 = Math.floor((c + 1) * (W / 12));
    const y0 = Math.floor(r * (H / 7));
    const y1 = Math.floor((r + 1) * (H / 7));
    
    // Save whole cell
    const cellPng = new PNG({ width: x1 - x0, height: y1 - y0 });
    for (let y = 0; y < y1 - y0; y++) {
      for (let x = 0; x < x1 - x0; x++) {
        const srcIdx = ((y0 + y) * W + (x0 + x)) * 4;
        const dstIdx = (y * (x1 - x0) + x) * 4;
        cellPng.data[dstIdx] = rawData.data[srcIdx];
        cellPng.data[dstIdx+1] = rawData.data[srcIdx+1];
        cellPng.data[dstIdx+2] = rawData.data[srcIdx+2];
        cellPng.data[dstIdx+3] = 255;
      }
    }
    fs.writeFileSync(`public/assets/card_texts/r${r}_c${c}.png`, PNG.sync.write(cellPng));
  }
}

// Let's also save special wide cells:
// In Row 0: X=470..555 (C5+C6)
// In Row 1: X=470..555 (C5+C6)
// In Row 2: X=470..555 (C5+C6)
// In Row 3: X=470..555 (C5+C6)
for (let r = 0; r < 4; r++) {
  const y0 = Math.floor(r * (H / 7));
  const y1 = Math.floor((r + 1) * (H / 7));
  const widePng = new PNG({ width: 85, height: y1 - y0 });
  for (let y = 0; y < y1 - y0; y++) {
    for (let x = 0; x < 85; x++) {
      const srcIdx = ((y0 + y) * W + (470 + x)) * 4;
      const dstIdx = (y * 85 + x) * 4;
      widePng.data[dstIdx] = rawData.data[srcIdx];
      widePng.data[dstIdx+1] = rawData.data[srcIdx+1];
      widePng.data[dstIdx+2] = rawData.data[srcIdx+2];
      widePng.data[dstIdx+3] = 255;
    }
  }
  fs.writeFileSync(`public/assets/card_texts/wide_r${r}.png`, PNG.sync.write(widePng));
}

console.log('Saved all cards to public/assets/card_texts/');
