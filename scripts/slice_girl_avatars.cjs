const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const inputPath = path.join(__dirname, '../public/assets/girl.jpg');
const outputDir = path.join(__dirname, '../public/assets/avatars');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rawData = fs.readFileSync(inputPath);
const img = jpeg.decode(rawData);

console.log(`Source girl.jpg dimensions: ${img.width} x ${img.height}`);

const cols = 5;
const rows = 2;

const characters = [
  ['貂蟬', '大喬', '小喬', '孫尚香', '蔡文姬'],
  ['甄姬', '王異', '關銀屏', '張星彩', '辛憲英']
];

for (let r = 0; r < rows; r++) {
  const yStart = Math.floor(r * (img.height / rows));
  const yEnd = Math.floor((r + 1) * (img.height / rows));
  const cellHeight = yEnd - yStart;

  for (let c = 0; c < cols; c++) {
    const xStart = Math.floor(c * (img.width / cols));
    const xEnd = Math.floor((c + 1) * (img.width / cols));
    const cellWidth = xEnd - xStart;

    const charName = characters[r][c];
    const outPng = new PNG({ width: cellWidth, height: cellHeight });

    for (let y = 0; y < cellHeight; y++) {
      for (let x = 0; x < cellWidth; x++) {
        const srcX = xStart + x;
        const srcY = yStart + y;
        const srcIdx = (srcY * img.width + srcX) * 4;
        const dstIdx = (y * cellWidth + x) * 4;

        outPng.data[dstIdx] = img.data[srcIdx];         // R
        outPng.data[dstIdx + 1] = img.data[srcIdx + 1]; // G
        outPng.data[dstIdx + 2] = img.data[srcIdx + 2]; // B
        outPng.data[dstIdx + 3] = 255;                  // A
      }
    }

    const filenameIndexed = `girl_${r}_${c}.png`;
    const outputPath = path.join(outputDir, filenameIndexed);
    const buffer = PNG.sync.write(outPng);
    fs.writeFileSync(outputPath, buffer);

    console.log(`Saved [${r},${c}] ${charName} (${cellWidth}x${cellHeight}) -> ${outputPath}`);
  }
}

console.log('All girl avatars sliced successfully!');
