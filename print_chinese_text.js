import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

function dumpTextOfRegion(title, x0, x1, y0, y1) {
  console.log(`\n=================== ${title} ===================`);
  for (let y = y0; y < y1; y++) {
    let line = '';
    for (let x = x0; x < x1; x++) {
      const idx = (y * W + x) * 4;
      const cr = rawData.data[idx];
      const cg = rawData.data[idx+1];
      const cb = rawData.data[idx+2];
      // Dark pixel (black calligraphy text)
      if (cr < 100 && cg < 100 && cb < 100) line += '█';
      else if (cr < 160 && cg < 160 && cb < 160) line += '▒';
      else line += ' ';
    }
    console.log(line);
  }
}

// Row 0 cards (Y=52..76)
dumpTextOfRegion('R0 C0 (0..85)', 5, 80, 55, 75);
dumpTextOfRegion('R0 C2 (170..255)', 175, 250, 55, 75);
dumpTextOfRegion('R0 C4 (340..425)', 345, 420, 55, 75);
dumpTextOfRegion('R0 Wide (470..555)', 475, 550, 55, 75);
dumpTextOfRegion('R0 C7 (595..680)', 600, 675, 55, 75);
dumpTextOfRegion('R0 C9 (765..850)', 770, 845, 55, 75);
dumpTextOfRegion('R0 C11 (935..1020)', 940, 1015, 55, 75);

// Row 1 cards (Y=132..156)
dumpTextOfRegion('R1 C0 (0..85)', 5, 80, 135, 155);
dumpTextOfRegion('R1 C2 (170..255)', 175, 250, 135, 155);
dumpTextOfRegion('R1 C4 (340..425)', 345, 420, 135, 155);
dumpTextOfRegion('R1 Wide (470..555)', 475, 550, 135, 155);
dumpTextOfRegion('R1 C7 (595..680)', 600, 675, 135, 155);
dumpTextOfRegion('R1 C9 (765..850)', 770, 845, 135, 155);
dumpTextOfRegion('R1 C11 (935..1020)', 940, 1015, 135, 155);
