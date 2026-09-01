import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// User's exact 60 item list:
const userItems = [
  "方天畫戟",
  "青龍偃月刀",
  "丈八蛇矛",
  "倚天劍",
  "青釭劍",
  "棗木槊",
  "雌雄雙股劍",
  "古錠刀",
  "涯角槍",
  "雙鐵戟",
  "養由基弓",
  "七星寶刀",
  "大斧",
  "三尖刀",
  "鐵蒺藜骨朵",
  "鐵鞭",
  "李廣弓",
  "鳳嘴刀",
  "眉尖刀",
  "三丈矛",
  "手戟",
  "梅花袖箭",
  "袖箭",
  "大桿刀",
  "大刀",
  "金馬槊",
  "寶雕弓",
  "東胡飛弓",
  "赤兔馬",
  "的盧馬",
  "爪黃飛電",
  "絕影",
  "照夜玉獅子",
  "快航",
  "汗血馬",
  "涼州馬",
  "四輪車",
  "孫子兵法",
  "兵法二十四篇",
  "遁甲天書",
  "孟德新書",
  "六韜",
  "三略",
  "吳子兵法",
  "司馬法",
  "太公陰符經",
  "春秋左氏傳",
  "太平要術書",
  "西蜀地形圖",
  "平蠻指掌圖",
  "傳國玉璽",
  "和氏璧",
  "九錫",
  "銅雀",
  "夜光珠",
  "青囊書",
  "傷寒雜病論",
  "太平清領道",
  "神農本草經",
  "黃帝內經"
];

console.log(`Total user items: ${userItems.length}`);

// Let's check which slots exist across all rows:
// Row 0: C0, C2, C4, C5, C6, C7, C9, C11
// Let's print the card labels for each row:
