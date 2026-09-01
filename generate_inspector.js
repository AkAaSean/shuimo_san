import fs from 'fs';

// Let's create an inspection page that lists all rows 0..6
// with all cards rX_cY.png from public/assets/card_texts/
let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Card Texts Inspector</title>
<style>
body { background: #1a1a1a; color: #fff; font-family: sans-serif; padding: 20px; }
.row-title { color: #f59e0b; margin: 20px 0 10px; font-size: 18px; }
.cards-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.card-box { background: #2a2a2a; border: 1px solid #444; border-radius: 6px; padding: 8px; text-align: center; }
.card-box img { width: 120px; height: 120px; object-fit: contain; background: #eee; image-rendering: pixelated; }
.card-box .label { font-size: 12px; color: #aaa; margin-top: 4px; }
</style>
</head>
<body>
<h1>Weapon.jpg 全卡片切割對照圖</h1>
`;

for (let r = 0; r < 7; r++) {
  html += `<div class="row-title">Row ${r}</div><div class="cards-row">`;
  for (let c = 0; c < 12; c++) {
    const fn = `r${r}_c${c}.png`;
    if (fs.existsSync(`public/assets/card_texts/${fn}`)) {
      html += `
      <div class="card-box">
        <img src="/assets/card_texts/${fn}">
        <div class="label">R${r} C${c}</div>
      </div>`;
    }
  }
  // wide if exists
  if (fs.existsSync(`public/assets/card_texts/wide_r${r}.png`)) {
    html += `
    <div class="card-box" style="border-color: #f59e0b;">
      <img src="/assets/card_texts/wide_r${r}.png">
      <div class="label" style="color: #f59e0b;">R${r} Wide (C5+6)</div>
    </div>`;
  }
  html += `</div>`;
}

html += `</body></html>`;
fs.writeFileSync('public/assets/card_texts_inspector.html', html);
console.log('Saved card_texts_inspector.html');
