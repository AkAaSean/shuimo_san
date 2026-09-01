import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// High resolution card scanner:
// We will scan each row r from 0 to 6.
// For each row, we scan across x from 0 to W to detect card segments (non-red regions).

let resultLog = '';

for (let r = 0; r < 7; r++) {
  const y0 = Math.floor(r * H / 7);
  const y1 = Math.floor((r + 1) * H / 7);

  // Find continuous non-red horizontal spans in this row
  const isCardPixel = (x) => {
    let nonRedCount = 0;
    for (let y = y0 + 10; y < y1 - 10; y += 4) {
      const idx = (y * W + x) * 4;
      const red = rawData.data[idx];
      const g = rawData.data[idx+1];
      const b = rawData.data[idx+2];
      if (!(red > 150 && g < 75 && b < 75)) nonRedCount++;
    }
    return nonRedCount > 3;
  };

  const spans = [];
  let inSpan = false;
  let spanStart = 0;

  for (let x = 0; x < W; x++) {
    const card = isCardPixel(x);
    if (card && !inSpan) {
      inSpan = true;
      spanStart = x;
    } else if (!card && inSpan) {
      inSpan = false;
      if (x - spanStart > 20) {
        spans.push({ x0: spanStart, x1: x, w: x - spanStart });
      }
    }
  }
  if (inSpan && W - spanStart > 20) {
    spans.push({ x0: spanStart, x1: W, w: W - spanStart });
  }

  resultLog += `\n=======================================================\n`;
  resultLog += `ROW ${r} (Y: ${y0}..${y1}) -> Found ${spans.length} card spans\n`;
  resultLog += `=======================================================\n`;

  spans.forEach((span, idx) => {
    resultLog += `\n--- [Row ${r}, Card #${idx+1}] Span X: ${span.x0}..${span.x1} (width: ${span.w}) ---\n`;

    // Print text area ASCII (bottom 32 pixels of row)
    for (let y = y1 - 32; y < y1 - 1; y++) {
      let line = '';
      for (let x = span.x0 + 2; x < span.x1 - 2; x++) {
        const pIdx = (y * W + x) * 4;
        const red = rawData.data[pIdx];
        const g = rawData.data[pIdx+1];
        const b = rawData.data[pIdx+2];
        if (red < 110 && g < 110 && b < 110) line += '█';
        else if (red < 155 && g < 155 && b < 155) line += '▒';
        else line += ' ';
      }
      if (line.trim()) resultLog += line + '\n';
    }
  });
}

fs.writeFileSync('all_cards_ocr_raw.txt', resultLog);
console.log('Done scanning all cards in weapon.jpg to all_cards_ocr_raw.txt!');
