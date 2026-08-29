const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const files = ['shu.png', 'wei.png', 'wu.png', 'others.png'];
files.forEach(f => {
  const p = path.join(__dirname, '../public/assets', f);
  if (fs.existsSync(p)) {
    const data = fs.readFileSync(p);
    const png = PNG.sync.read(data);
    console.log(`${f}: width=${png.width}, height=${png.height}`);
  }
});
