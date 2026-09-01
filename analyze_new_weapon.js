import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

console.log(`Image dimensions: ${W} x ${H}`);

// Let's inspect the rows and card boundaries
for (let y = 0; y < H; y += 10) {
  let redLine = 0;
  for (let x = 0; x < W; x += 10) {
    const idx = (y * W + x) * 4;
    const r = rawData.data[idx];
    const g = rawData.data[idx+1];
    const b = rawData.data[idx+2];
    if (r > 160 && g < 75 && b < 75) redLine++;
  }
  // console.log(`Y: ${y}, red count: ${redLine}`);
}
