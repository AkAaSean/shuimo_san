import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// User list:
const userItems = [
  "方天畫戟", "青龍偃月刀", "丈八蛇矛", "倚天劍", "青釭劍", "棗木槊",
  "雌雄雙股劍", "古錠刀", "涯角槍", "雙鐵戟", "養由基弓", "七星寶刀",
  "大斧", "三尖刀", "鐵蒺藜骨朵", "鐵鞭", "李廣弓", "鳳嘴刀",
  "眉尖刀", "三丈矛", "手戟", "梅花袖箭", "袖箭", "大桿刀",
  "大刀", "金馬槊", "寶雕弓", "東胡飛弓", "赤兔馬", "的盧馬",
  "爪黃飛電", "絕影", "照夜玉獅子", "快航", "汗血馬", "涼州馬",
  "四輪車", "孫子兵法", "兵法二十四篇", "遁甲天書", "孟德新書", "六韜",
  "三略", "吳子兵法", "司馬法", "太公陰符經", "春秋左氏傳", "太平要術書",
  "西蜀地形圖", "平蠻指掌圖", "傳國玉璽", "和氏璧", "九錫", "銅雀",
  "夜光珠", "青囊書", "傷寒雜病論", "太平清領道", "神農本草經", "黃帝內經"
];

// Let's inspect each row's columns to see how many cards exist in each row!
// Row height = 559 / 7 = ~79.85px.
// Row 0: y ~ 0..80
// Row 1: y ~ 80..160
// Row 2: y ~ 160..240
// Row 3: y ~ 240..320
// Row 4: y ~ 320..400
// Row 5: y ~ 400..480
// Row 6: y ~ 480..559

// Let's check non-white pixel density or bounding boxes in each row:
for (let r = 0; r < 7; r++) {
  const y0 = Math.round(r * (H / 7));
  const y1 = Math.round((r + 1) * (H / 7));
  const cols = [];
  for (let c = 0; c < 12; c++) {
    const x0 = Math.round(c * (W / 12));
    const x1 = Math.round((c + 1) * (W / 12));
    // calculate how many dark pixels in text region (y: y1-30 .. y1-2)
    let darkTextCount = 0;
    for (let y = y1 - 32; y < y1 - 2; y++) {
      for (let x = x0 + 5; x < x1 - 5; x++) {
        const idx = (y * W + x) * 4;
        if (rawData.data[idx] < 120 && rawData.data[idx+1] < 120 && rawData.data[idx+2] < 120) {
          darkTextCount++;
        }
      }
    }
    if (darkTextCount > 25) {
      cols.push(c);
    }
  }
  console.log(`Row ${r} (y: ${y0}..${y1}): cols with text = [${cols.join(', ')}] (count: ${cols.length})`);
}
