const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const outDir = path.join(__dirname, '../public/assets/avatars');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Grid layout parameters based on exact image analysis:
// 7 columns x 3 rows per sheet
const colXs = [60, 245, 432, 613, 794, 975, 1157];
const boxW = 166;

const rowYs = [128, 360, 568];
const rowHs = [194, 176, 168];

const sheets = [
  { name: 'shu', file: path.join(__dirname, '../public/assets/shu.png') },
  { name: 'wei', file: path.join(__dirname, '../public/assets/wei.png') },
  { name: 'wu', file: path.join(__dirname, '../public/assets/wu.png') },
  { name: 'others', file: path.join(__dirname, '../public/assets/others.png') }
];

console.log('Generating high-quality avatars using pngjs...');

sheets.forEach(s => {
  if (!fs.existsSync(s.file)) {
    console.error(`Sheet not found: ${s.file}`);
    return;
  }

  const fileData = fs.readFileSync(s.file);
  const srcPng = PNG.sync.read(fileData);
  console.log(`Processing sheet: ${s.name} (${srcPng.width}x${srcPng.height})`);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      const sx = colXs[c];
      const sy = rowYs[r];
      const sw = boxW;
      const sh = rowHs[r];

      const dstPng = new PNG({ width: sw, height: sh });

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const srcX = Math.min(srcPng.width - 1, Math.max(0, sx + x));
          const srcY = Math.min(srcPng.height - 1, Math.max(0, sy + y));

          const srcIdx = (srcY * srcPng.width + srcX) * 4;
          const dstIdx = (y * sw + x) * 4;

          dstPng.data[dstIdx] = srcPng.data[srcIdx];         // R
          dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1]; // G
          dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2]; // B
          dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3]; // A
        }
      }

      const outName = `${s.name}_${r}_${c}.png`;
      const outPath = path.join(outDir, outName);
      const outBuffer = PNG.sync.write(dstPng);
      fs.writeFileSync(outPath, outBuffer);

      if (s.name === 'others') {
        const patchName = `patch_${r}_${c}.png`;
        fs.writeFileSync(path.join(outDir, patchName), outBuffer);
      }
    }
  }
});

console.log('Successfully generated all 84 avatar PNG files!');
