import fs from 'fs';
import jpeg from 'jpeg-js';

const buf1 = fs.readFileSync('public/assets/weapon_1.jpg');
const raw1 = jpeg.decode(buf1, { useTArray: true });
console.log('weapon_1.jpg:', raw1.width, 'x', raw1.height);

const buf2 = fs.readFileSync('public/assets/weapon_2.jpg');
const raw2 = jpeg.decode(buf2, { useTArray: true });
console.log('weapon_2.jpg:', raw2.width, 'x', raw2.height);

// Let's print a low-res map of weapon_1.jpg to see margins, borders, padding
const W = raw1.width;
const H = raw1.height;

const mapW = 100;
const mapH = 60;
let ascii = '';

for (let my = 0; my < mapH; my++) {
  let line = '';
  for (let mx = 0; mx < mapW; mx++) {
    const x = Math.floor(mx * W / mapW);
    const y = Math.floor(my * H / mapH);
    const idx = (y * W + x) * 4;
    const r = raw1.data[idx];
    const g = raw1.data[idx+1];
    const b = raw1.data[idx+2];

    // White/cream card background: high R, G, B (e.g. > 180, > 170, > 150)
    // Red sheet background: R > 150, G < 80, B < 80
    if (r > 150 && g < 80 && b < 80) {
      line += '.'; // Red bg
    } else if (r > 180 && g > 170 && b > 140) {
      line += '#'; // Card white/cream interior
    } else if (r < 80 && g < 80 && b < 80) {
      line += '█'; // Black border/text
    } else {
      line += '+'; // Other border
    }
  }
  ascii += line + '\n';
}

console.log('=== weapon_1.jpg Layout Visual ===');
console.log(ascii);
