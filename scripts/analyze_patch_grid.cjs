const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');

const p = path.join(__dirname, '../public/assets/patch.jpg');
const jpegData = fs.readFileSync(p);
const raw = jpeg.decode(jpegData, { useTArray: true });

console.log(`Image: ${raw.width}x${raw.height}`);

// Analyze horizontal row transitions
const rowDiffs = [];
for (let y = 1; y < raw.height; y++) {
  let diff = 0;
  for (let x = 0; x < raw.width; x += 8) {
    const idx1 = (y * raw.width + x) * 4;
    const idx0 = ((y - 1) * raw.width + x) * 4;
    diff += Math.abs(raw.data[idx1] - raw.data[idx0]) +
            Math.abs(raw.data[idx1+1] - raw.data[idx0+1]) +
            Math.abs(raw.data[idx1+2] - raw.data[idx0+2]);
  }
  rowDiffs.push({ y, diff });
}

// Analyze vertical col transitions
const colDiffs = [];
for (let x = 1; x < raw.width; x++) {
  let diff = 0;
  for (let y = 0; y < raw.height; y += 8) {
    const idx1 = (y * raw.width + x) * 4;
    const idx0 = (y * raw.width + (x - 1)) * 4;
    diff += Math.abs(raw.data[idx1] - raw.data[idx0]) +
            Math.abs(raw.data[idx1+1] - raw.data[idx0+1]) +
            Math.abs(raw.data[idx1+2] - raw.data[idx0+2]);
  }
  colDiffs.push({ x, diff });
}

console.log('Top Row Diffs (Horizontal lines):');
console.log(rowDiffs.sort((a,b) => b.diff - a.diff).slice(0, 30));

console.log('Top Col Diffs (Vertical lines):');
console.log(colDiffs.sort((a,b) => b.diff - a.diff).slice(0, 35));
