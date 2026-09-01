import fs from 'fs';
import jpeg from 'jpeg-js';

const buf = fs.readFileSync('public/assets/weapon.jpg');
const rawData = jpeg.decode(buf, { useTArray: true });
const W = rawData.width;
const H = rawData.height;

// Let's write the identified sequence of all 61 cards in weapon.jpg:
/*
Row 0: (7 cards)
- Col 0: 方天畫戟
- Col 2: 青龍偃月刀
- Col 4: 丈八蛇矛
- Col 6 (Wide or Col 5/6): 倚天劍 & 青釭劍 (Wait! Let's check: Col 5 has 青釭劍 or 倚天劍, Col 6 has 倚天劍?)
- Col 7: 棗木槊
- Col 9: 雌雄雙股劍
- Col 11: 諸葛連弩 (Wait! Is 諸葛連弩 or something else? Let's check!)

Row 1: (7 cards)
- Col 0: 古錠刀
- Col 2: 涯角槍
- Col 4: 雙鐵戟
- Wide (Col 5+6): 養由基弓
- Col 7: 七星寶刀
- Col 9: 大斧
- Col 11: 三尖刀

Row 2: (7 cards)
- Col 0: 鐵蒺藜骨朵
- Col 2: 鐵鞭
- Col 4: 李廣弓
- Wide (Col 5+6): 鳳嘴刀
- Col 7: 眉尖刀
- Col 9: 三丈矛
- Col 11: 手戟

Row 3: (8 cards)
- Col 0: 梅花袖箭
- Col 1: 袖箭
- Col 2: 金馬槊
- Col 4: 寶雕弓
- Wide (Col 5+6): 東胡飛弓
- Col 7: 大桿刀
- Col 9: 大刀
- Col 11: 赤兔馬 (Wait! Is Col 11 赤兔馬?)

Row 4: (10 cards)
- Col 0: 的盧馬
- Col 1: 爪黃飛電
- Col 2: 絕影
- Col 3: 照夜玉獅子
- Col 4: 快航
- Wide (Col 5+6): 四輪車
- Col 7: 汗血馬
- Col 8: 涼州馬
- Col 9: 孫子兵法
- Col 10: 兵法二十四篇
- Col 11: 遁甲天書

Row 5: (12 cards)
- Col 0: 孟德新書
- Col 1: 六韜
- Col 2: 三略
- Col 3: 吳子兵法
- Col 4: 司馬法
- Col 5: 太公陰符經
- Col 6: 春秋左氏傳
- Col 7: 尉繚子
- Col 8: 太平要術
- Col 9: 西蜀地形圖
- Col 10: 平蠻指掌圖
- Col 11: 傳國玉璽

Row 6: (12 cards)
- Col 0: 和氏璧
- Col 1: 九錫
- Col 2: 銅雀
- Col 3: 夜光珠
- Col 4: 青囊書
- Col 5: 傷寒雜病論
- Col 6: 太平清領道
- Col 7: 神農本草經
- Col 8: 黃帝內經
- Col 9: ?
- Col 10: ?
- Col 11: ?
*/

console.log("Analyzing...");
