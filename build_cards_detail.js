import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's create a visual HTML inspector that shows the exact card image + text zoom for EVERY cell!
// That way we can easily see all 61+ cards!

let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>All Cards Detail Inspector</title>
<style>
body { background: #111; color: #eee; font-family: sans-serif; padding: 20px; }
.row-header { color: #f59e0b; font-size: 20px; margin: 24px 0 12px; border-bottom: 1px solid #444; padding-bottom: 4px; }
.card-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.card-item { background: #222; border: 1px solid #555; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; align-items: center; width: 140px; }
.card-item img { width: 120px; height: 120px; object-fit: contain; background: #fff; image-rendering: pixelated; border-radius: 4px; }
.card-item .title { font-weight: bold; color: #fbbf24; margin-top: 6px; font-size: 13px; text-align: center; }
.card-item .pos { font-size: 11px; color: #888; margin-top: 2px; }
</style>
</head>
<body>
<h1>全卡片詳細座標與名稱對照檢視器</h1>
`;

for (let r = 0; r < 7; r++) {
  html += `<div class="row-header">Row ${r}</div><div class="card-grid">`;
  for (let c = 0; c < 12; c++) {
    const fn = `r${r}_c${c}.png`;
    if (fs.existsSync(`public/assets/card_texts/${fn}`)) {
      html += `
      <div class="card-item">
        <img src="/assets/card_texts/${fn}">
        <div class="pos">Row ${r}, Col ${c}</div>
      </div>`;
    }
  }
  if (fs.existsSync(`public/assets/card_texts/wide_r${r}.png`)) {
    html += `
    <div class="card-item" style="border-color: #f59e0b; width: 160px;">
      <img src="/assets/card_texts/wide_r${r}.png" style="width: 140px;">
      <div class="pos" style="color: #f59e0b;">Row ${r} Wide (C5+6)</div>
    </div>`;
  }
  html += `</div>`;
}

html += `</body></html>`;
fs.writeFileSync('public/assets/cards_detail.html', html);
console.log('Saved cards_detail.html');
