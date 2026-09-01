import fs from 'fs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's create an html file and export individual slices of the image with high-contrast grid lines
// Let's find every cell, frame, or text label in the image!
console.log('Image size:', W, H);

// Let's crop each horizontal band (e.g. 50px, 80px slices) and dump to public/assets/debug_slices
if (!fs.existsSync('public/assets/debug_slices')) {
  fs.mkdirSync('public/assets/debug_slices', { recursive: true });
}

// Let's write an HTML file that shows the full weapon.jpg with an interactive SVG grid overlay and coordinate readout!
let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Weapon Coordinate Grid Inspector</title>
<style>
body { margin: 0; background: #111; color: #fff; font-family: monospace; }
#container { position: relative; display: inline-block; }
img { display: block; }
canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
#info { position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.85); padding: 10px; border: 1px solid #777; font-size: 14px; z-index: 100; }
</style>
</head>
<body>
<div id="info">Hover over the image to see (X, Y)</div>
<div id="container">
  <img id="img" src="/assets/weapon.jpg">
  <canvas id="cvs"></canvas>
</div>
<script>
const img = document.getElementById('img');
const cvs = document.getElementById('cvs');
const info = document.getElementById('info');

img.onload = () => {
  cvs.width = img.naturalWidth;
  cvs.height = img.naturalHeight;
  const ctx = cvs.getContext('2d');
  
  // Draw 12x7 grid
  const COLS = 12;
  const ROWS = 7;
  const cw = cvs.width / COLS;
  const ch = cvs.height / ROWS;
  
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, cvs.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(cvs.width, r * ch);
    ctx.stroke();
  }
};

img.addEventListener('mousemove', (e) => {
  const rect = img.getBoundingClientRect();
  const scaleX = img.naturalWidth / rect.width;
  const scaleY = img.naturalHeight / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  info.innerText = 'X: ' + x + ', Y: ' + y;
});
</script>
</body>
</html>`;

fs.writeFileSync('public/assets/debug_slices/inspector.html', html);
console.log('Saved inspector.html');
