const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');

const p = path.join(__dirname, '../public/assets/patch.jpg');
const jpegData = fs.readFileSync(p);
const rawData = jpeg.decode(jpegData, { useTArray: true });

console.log('patch.jpg decoded: width =', rawData.width, 'height =', rawData.height);
