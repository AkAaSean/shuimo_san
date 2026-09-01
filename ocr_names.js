import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's print out what is on every card in Row 0, 1, 2, 3, 4, 5, 6!
// Let's inspect the text of every card.
// In KOEI Sangokushi, the cards have names written on them!
// Let's write a script that crops the text area of EVERY card, binarizes it, and logs it or compares with candidate characters!

// Let's inspect:
// Row 0:
// 1. C0: 方天畫戟
// 2. C2: 青龍偃月刀
// 3. C4: 丈八蛇矛
// 4. C5+6: 倚天劍
// 5. C7: 棗木槊 (or 青釭劍?)
// 6. C9: 雌雄雙股劍
// 7. C11: ?? What is in Row 0 Col 11?

// Row 1:
// 1. C0: 古錠刀 (As seen in screenshot_2, Row 1 Col 0 has "古錠刀" written on it!)
// 2. C2: 涯角槍 (or 雙鐵戟?)
// 3. C4: 七星寶刀 (As seen in screenshot_2, Row 1 Col 4 has "七星寶刀" written on it!)
// 4. C5+6: 養由基弓 (As seen in screenshot_2, Row 1 C5+6 has "養由基弓" written on it!)
// 5. C7: 大斧
// 6. C9: 三尖刀 (or 雙鐵戟?)
// 7. C11: 鐵蒺藜骨朵 (or 鐵鞭?)

console.log('Let us analyze text of all cards!');
