const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const file = path.join(__dirname, '../public/assets/avatars/others_0_3.png');
const data = fs.readFileSync(file);
const png = PNG.sync.read(data);

console.log(`others_0_3.png: width=${png.width}, height=${png.height}`);
// Check a 10x10 block of pixels to ensure they look like a real character portrait and not static noise
let sample = [];
for (let y = 50; y < 55; y++) {
  let row = [];
  for (let x = 50; x < 55; x++) {
    const idx = (y * png.width + x) * 4;
    row.push(`(${png.data[idx]},${png.data[idx+1]},${png.data[idx+2]})`);
  }
  sample.push(row.join(' '));
}
console.log('Sample pixels:\n' + sample.join('\n'));
