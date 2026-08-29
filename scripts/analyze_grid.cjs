const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const p = path.join(__dirname, '../public/assets/shu.png');
const data = fs.readFileSync(p);
const png = PNG.sync.read(data);

// Let's print out what colors exist across horizontal slices and vertical slices
// Check row color deltas
const rowDiffs = [];
for (let y = 1; y < png.height; y++) {
  let diff = 0;
  for (let x = 0; x < png.width; x += 4) {
    const idx1 = (y * png.width + x) * 4;
    const idx0 = ((y - 1) * png.width + x) * 4;
    diff += Math.abs(png.data[idx1] - png.data[idx0]) +
            Math.abs(png.data[idx1+1] - png.data[idx0+1]) +
            Math.abs(png.data[idx1+2] - png.data[idx0+2]);
  }
  rowDiffs.push({ y, diff });
}

// Find horizontal lines with large differences or specific borders
const colDiffs = [];
for (let x = 1; x < png.width; x++) {
  let diff = 0;
  for (let y = 0; y < png.height; y += 4) {
    const idx1 = (y * png.width + x) * 4;
    const idx0 = (y * png.width + (x - 1)) * 4;
    diff += Math.abs(png.data[idx1] - png.data[idx0]) +
            Math.abs(png.data[idx1+1] - png.data[idx0+1]) +
            Math.abs(png.data[idx1+2] - png.data[idx0+2]);
  }
  colDiffs.push({ x, diff });
}

console.log('Top row diff peaks:');
console.log(rowDiffs.sort((a,b) => b.diff - a.diff).slice(0, 20));

console.log('Top col diff peaks:');
console.log(colDiffs.sort((a,b) => b.diff - a.diff).slice(0, 25));
