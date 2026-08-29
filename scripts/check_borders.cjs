const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const outDir = path.join(__dirname, '../public/assets/avatars');

for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 7; c++) {
    const p = path.join(outDir, `patch_${r}_${c}.png`);
    const data = fs.readFileSync(p);
    const png = PNG.sync.read(data);
    
    // Check border pixel colors: top row, bottom row, left col, right col
    let topDark = 0, bottomDark = 0, leftDark = 0, rightDark = 0;
    for (let x = 0; x < png.width; x++) {
      const idxT = (0 * png.width + x) * 4;
      if (png.data[idxT] < 30 && png.data[idxT+1] < 30 && png.data[idxT+2] < 30) topDark++;
      const idxB = ((png.height - 1) * png.width + x) * 4;
      if (png.data[idxB] < 30 && png.data[idxB+1] < 30 && png.data[idxB+2] < 30) bottomDark++;
    }
    for (let y = 0; y < png.height; y++) {
      const idxL = (y * png.width + 0) * 4;
      if (png.data[idxL] < 30 && png.data[idxL+1] < 30 && png.data[idxL+2] < 30) leftDark++;
      const idxR = (y * png.width + (png.width - 1)) * 4;
      if (png.data[idxR] < 30 && png.data[idxR+1] < 30 && png.data[idxR+2] < 30) rightDark++;
    }
    console.log(`patch_${r}_${c}: ${png.width}x${png.height} -> topDark=${topDark}/${png.width}, botDark=${bottomDark}/${png.width}, lDark=${leftDark}/${png.height}, rDark=${rightDark}/${png.height}`);
  }
}
