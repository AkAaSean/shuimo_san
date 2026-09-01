import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Print card at given bounds:
function inspectBox(label, x0, x1, y0, y1) {
  console.log(`\n================== [${label}] (X: ${x0}..${x1}, Y: ${y0}..${y1}) ==================`);
  for (let y = y0 + 53; y < y1 - 1; y++) {
    let line = '';
    for (let x = x0 + 4; x < x1 - 4; x++) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (red < 115 && g < 115 && b < 115) line += '#';
      else if (red < 160 && g < 160 && b < 160) line += '+';
      else line += ' ';
    }
    if (line.trim()) console.log(line);
  }
}

// Row 0:
inspectBox("R0_C0", 0, 85, 0, 80);
inspectBox("R0_C2", 170, 256, 0, 80);
inspectBox("R0_C4", 341, 426, 0, 80);
inspectBox("R0_C5", 426, 512, 0, 80);
inspectBox("R0_C6", 512, 597, 0, 80);
inspectBox("R0_WIDE_56", 470, 555, 0, 80);
inspectBox("R0_C7", 597, 682, 0, 80);
inspectBox("R0_C9", 768, 853, 0, 80);
inspectBox("R0_C11", 938, 1024, 0, 80);

// Row 1:
inspectBox("R1_C0", 0, 85, 80, 160);
inspectBox("R1_C2", 170, 256, 80, 160);
inspectBox("R1_C4", 341, 426, 80, 160);
inspectBox("R1_WIDE_56", 470, 555, 80, 160);
inspectBox("R1_C7", 597, 682, 80, 160);
inspectBox("R1_C9", 768, 853, 80, 160);
inspectBox("R1_C11", 938, 1024, 80, 160);

// Row 2:
inspectBox("R2_C0", 0, 85, 160, 240);
inspectBox("R2_C2", 170, 256, 160, 240);
inspectBox("R2_C4", 341, 426, 160, 240);
inspectBox("R2_WIDE_56", 470, 555, 160, 240);
inspectBox("R2_C7", 597, 682, 160, 240);
inspectBox("R2_C9", 768, 853, 160, 240);
inspectBox("R2_C11", 938, 1024, 160, 240);

// Row 3:
inspectBox("R3_C0", 0, 85, 240, 320);
inspectBox("R3_C1", 85, 170, 240, 320);
inspectBox("R3_C2", 170, 256, 240, 320);
inspectBox("R3_C4", 341, 426, 240, 320);
inspectBox("R3_WIDE_56", 470, 555, 240, 320);
inspectBox("R3_C7", 597, 682, 240, 320);
inspectBox("R3_C9", 768, 853, 240, 320);
inspectBox("R3_C11", 938, 1024, 240, 320);

// Row 4:
for (let c = 0; c < 12; c++) {
  if (c === 5 || c === 6) continue;
  inspectBox(`R4_C${c}`, c * 85.33, (c + 1) * 85.33, 320, 400);
}
inspectBox("R4_WIDE_56", 470, 555, 320, 400);

// Row 5:
for (let c = 0; c < 12; c++) {
  inspectBox(`R5_C${c}`, c * 85.33, (c + 1) * 85.33, 400, 480);
}

// Row 6:
for (let c = 0; c < 12; c++) {
  inspectBox(`R6_C${c}`, c * 85.33, (c + 1) * 85.33, 480, 560);
}
