const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const p = path.join(__dirname, '../public/assets/patch.jpg');
const jpegData = fs.readFileSync(p);
const raw = jpeg.decode(jpegData, { useTArray: true });

console.log(`Image: ${raw.width}x${raw.height}`);

// Let's test exact colXs and rowYs
// Notice the 7 columns:
// col 0: x ~ 120, width ~ 332
// col 1: x ~ 488, width ~ 332
// col 2: x ~ 860, width ~ 332
// col 3: x ~ 1225, width ~ 332
// col 4: x ~ 1585, width ~ 332
// col 5: x ~ 1950, width ~ 332
// col 6: x ~ 2315, width ~ 332

// Let's verify by measuring bounding boxes of each cell
const colXs = [120, 488, 860, 1225, 1585, 1950, 2315];
const boxW = 332;

// Row 0: y=256, h=388
// Row 1: y=720, h=352
// Row 2: y=1136, h=336
const rowYs = [256, 720, 1136];
const rowHs = [388, 352, 336];

const outDir = path.join(__dirname, '../public/assets/avatars');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 7; c++) {
    const sx = colXs[c];
    const sy = rowYs[r];
    const sw = boxW;
    const sh = rowHs[r];

    const dstPng = new PNG({ width: sw, height: sh });

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const srcX = Math.min(raw.width - 1, Math.max(0, sx + x));
        const srcY = Math.min(raw.height - 1, Math.max(0, sy + y));

        const srcIdx = (srcY * raw.width + srcX) * 4;
        const dstIdx = (y * sw + x) * 4;

        dstPng.data[dstIdx] = raw.data[srcIdx];         // R
        dstPng.data[dstIdx + 1] = raw.data[srcIdx + 1]; // G
        dstPng.data[dstIdx + 2] = raw.data[srcIdx + 2]; // B
        dstPng.data[dstIdx + 3] = 255;                  // A
      }
    }

    const outName = `patch_${r}_${c}.png`;
    const outPath = path.join(outDir, outName);
    const outBuffer = PNG.sync.write(dstPng);
    fs.writeFileSync(outPath, outBuffer);
  }
}

console.log('Generated 21 patch avatar files from patch.jpg!');
