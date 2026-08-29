const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const p = path.join(__dirname, '../public/assets/patch.jpg');
const jpegData = fs.readFileSync(p);
const raw = jpeg.decode(jpegData, { useTArray: true });

// Slicing logic: let's scan each grid cell and find its exact non-black bounding box or interior
// 7 columns x 3 rows
const colXs = [120, 488, 860, 1225, 1585, 1950, 2315];
const colW = 332;
const rowYs = [256, 720, 1136];
const rowHs = [388, 352, 336];

const outDir = path.join(__dirname, '../public/assets/avatars');

console.log('Refining bounding boxes for each of the 21 generals...');

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 7; c++) {
    const rawX = colXs[c];
    const rawY = rowYs[r];
    const rawW = colW;
    const rawH = rowHs[r];

    // Find inner bounds inside this box where content is not pure black/dark frame
    let minX = rawX, maxX = rawX + rawW - 1;
    let minY = rawY, maxY = rawY + rawH - 1;

    // Scan inward from top
    for (let y = rawY; y < rawY + rawH; y++) {
      let brightCount = 0;
      for (let x = rawX + 20; x < rawX + rawW - 20; x++) {
        const idx = (y * raw.width + x) * 4;
        if (raw.data[idx] > 35 || raw.data[idx+1] > 35 || raw.data[idx+2] > 35) brightCount++;
      }
      if (brightCount > (rawW - 40) * 0.4) {
        minY = y;
        break;
      }
    }

    // Scan inward from bottom
    for (let y = rawY + rawH - 1; y >= rawY; y--) {
      let brightCount = 0;
      for (let x = rawX + 20; x < rawX + rawW - 20; x++) {
        const idx = (y * raw.width + x) * 4;
        if (raw.data[idx] > 35 || raw.data[idx+1] > 35 || raw.data[idx+2] > 35) brightCount++;
      }
      if (brightCount > (rawW - 40) * 0.4) {
        maxY = y;
        break;
      }
    }

    // Scan inward from left
    for (let x = rawX; x < rawX + rawW; x++) {
      let brightCount = 0;
      for (let y = rawY + 20; y < rawY + rawH - 20; y++) {
        const idx = (y * raw.width + x) * 4;
        if (raw.data[idx] > 35 || raw.data[idx+1] > 35 || raw.data[idx+2] > 35) brightCount++;
      }
      if (brightCount > (rawH - 40) * 0.4) {
        minX = x;
        break;
      }
    }

    // Scan inward from right
    for (let x = rawX + rawW - 1; x >= rawX; x--) {
      let brightCount = 0;
      for (let y = rawY + 20; y < rawY + rawH - 20; y++) {
        const idx = (y * raw.width + x) * 4;
        if (raw.data[idx] > 35 || raw.data[idx+1] > 35 || raw.data[idx+2] > 35) brightCount++;
      }
      if (brightCount > (rawH - 40) * 0.4) {
        maxX = x;
        break;
      }
    }

    const cropW = Math.max(10, maxX - minX + 1);
    const cropH = Math.max(10, maxY - minY + 1);

    console.log(`[${r}, ${c}] x: ${minX}..${maxX} (${cropW}), y: ${minY}..${maxY} (${cropH})`);

    const dstPng = new PNG({ width: cropW, height: cropH });
    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcX = Math.min(raw.width - 1, Math.max(0, minX + x));
        const srcY = Math.min(raw.height - 1, Math.max(0, minY + y));

        const srcIdx = (srcY * raw.width + srcX) * 4;
        const dstIdx = (y * cropW + x) * 4;

        dstPng.data[dstIdx] = raw.data[srcIdx];
        dstPng.data[dstIdx + 1] = raw.data[srcIdx + 1];
        dstPng.data[dstIdx + 2] = raw.data[srcIdx + 2];
        dstPng.data[dstIdx + 3] = 255;
      }
    }

    const outName = `patch_${r}_${c}.png`;
    const outPath = path.join(outDir, outName);
    const outBuffer = PNG.sync.write(dstPng);
    fs.writeFileSync(outPath, outBuffer);
  }
}

console.log('Successfully cropped and saved all 21 patch avatar PNGs!');
