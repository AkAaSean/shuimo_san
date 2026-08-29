const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const p = path.join(__dirname, '../public/assets/others.png');
const data = fs.readFileSync(p);
const png = PNG.sync.read(data);

// Let's find columns and rows by checking variations or horizontal/vertical lines
console.log('Image dimensions:', png.width, png.height);

// Let's sample a few columns along horizontal line y = 200, 450, 650
[100, 200, 300, 400, 500, 600, 700].forEach(y => {
  let nonBlack = 0;
  for (let x = 0; x < png.width; x++) {
    const idx = (y * png.width + x) * 4;
    const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2];
    if (r > 30 || g > 30 || b > 30) nonBlack++;
  }
  console.log(`y=${y}: non-dark pixels = ${nonBlack}`);
});
