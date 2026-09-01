import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's dump text in 7 rows and 12 columns, plus wide card detection:
let output = '';

for (let r = 0; r < 7; r++) {
  const y0 = Math.floor(r * (H / 7));
  const y1 = Math.floor((r + 1) * (H / 7));
  output += `\n=======================================================\n`;
  output += `====================== ROW ${r} (Y: ${y0}..${y1}) ======================\n`;
  output += `=======================================================\n`;

  for (let c = 0; c < 12; c++) {
    const x0 = Math.floor(c * (W / 12));
    const x1 = Math.floor((c + 1) * (W / 12));

    // Check if cell is blank / background (mostly red background)
    let nonRedCount = 0;
    for (let y = y0 + 10; y < y1 - 10; y += 4) {
      for (let x = x0 + 10; x < x1 - 10; x += 4) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (!(red > 160 && g < 75 && b < 75)) {
          nonRedCount++;
        }
      }
    }
    if (nonRedCount < 10) {
      output += `\n--- [Row ${r}, Col ${c}] : BLANK / BACKGROUND ---\n`;
      continue;
    }

    output += `\n--- [Row ${r}, Col ${c}] (X: ${x0}..${x1}) ---\n`;
    for (let y = y0 + 52; y < y1 - 1; y += 1) {
      let line = '';
      for (let x = x0 + 4; x < x1 - 4; x += 1) {
        const idx = (y * W + x) * 4;
        const red = rawData.data[idx];
        const g = rawData.data[idx+1];
        const b = rawData.data[idx+2];
        if (red < 110 && g < 110 && b < 110) line += '█';
        else if (red < 155 && g < 155 && b < 155) line += '▒';
        else line += ' ';
      }
      if (line.trim().length > 0) output += line + '\n';
    }
  }

  // Also check wide C5+C6:
  output += `\n--- [Row ${r}, WIDE C5+C6] (X: 470..555) ---\n`;
  for (let y = y0 + 52; y < y1 - 1; y += 1) {
    let line = '';
    for (let x = 474; x < 550; x += 1) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 110 && g < 110 && b < 110) line += '█';
      else if (red < 155 && g < 155 && b < 155) line += '▒';
      else line += ' ';
    }
    if (line.trim().length > 0) output += line + '\n';
  }
}

fs.writeFileSync('new_weapon_map.txt', output);
console.log('Saved new_weapon_map.txt');
