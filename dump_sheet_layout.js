import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

console.log(`Image Size: ${W} x ${H}`);

// Let's sweep through all 7 rows and find every card box.
// A card box has background that is NOT solid red (R > 150 && G < 70 && B < 70 is background red).
// Let's print an ASCII map of the entire sheet at low resolution to visualize card presence:

const mapW = 120;
const mapH = 70;
let asciiMap = '';

for (let my = 0; my < mapH; my++) {
  let line = '';
  for (let mx = 0; mx < mapW; mx++) {
    const x = Math.floor(mx * W / mapW);
    const y = Math.floor(my * H / mapH);
    const idx = (y * W + x) * 4;
    const r = rawData.data[idx];
    const g = rawData.data[idx+1];
    const b = rawData.data[idx+2];
    
    // Check if red background
    if (r > 150 && g < 75 && b < 75) {
      line += '.';
    } else {
      line += '#';
    }
  }
  asciiMap += line + '\n';
}

console.log('=== CARD LOCATIONS MAP ===');
console.log(asciiMap);
