export interface HiddenTalent {
  name: string;
  provinceId: number;
  role: string;
  maxTroops: number;
  hp: number;
  int: number;
  str: number;
  pol: number;
  cha: number;
  minYear: number; // 登場年份
  scenarios: number[]; // 出現在哪些劇本編號中 (0-5)
  desc: string;
}

export const HIDDEN_TALENTS: HiddenTalent[] = [
  // 司隸 / 中原
  { name: '徐庶', provinceId: 28, role: '軍師', maxTroops: 3000, hp: 81, int: 95, str: 76, pol: 82, cha: 81, minYear: 195, scenarios: [0, 1], desc: '字元直，穎川名士，智謀卓絕，曾大破曹仁八門金鎖陣。' },
  { name: '司馬徽', provinceId: 28, role: '謀士', maxTroops: 1500, hp: 60, int: 94, str: 28, pol: 90, cha: 95, minYear: 189, scenarios: [0, 1, 2], desc: '水鏡先生，精通人倫風鑒，善知天下大勢。' },
  { name: '荀彧', provinceId: 11, role: '軍師', maxTroops: 3000, hp: 73, int: 97, str: 49, pol: 98, cha: 78, minYear: 189, scenarios: [0], desc: '字文若，潁川名士，王佐之才。' },
  { name: '郭嘉', provinceId: 11, role: '軍師', maxTroops: 3000, hp: 52, int: 97, str: 65, pol: 84, cha: 83, minYear: 191, scenarios: [0], desc: '字奉孝，深通韜略，才策謀略，世之奇士。' },
  { name: '典韋', provinceId: 12, role: '副將', maxTroops: 2500, hp: 95, int: 28, str: 97, pol: 29, cha: 56, minYear: 189, scenarios: [0], desc: '陳留己吾人，勇力過人，號稱古之惡來。' },
  { name: '許褚', provinceId: 13, role: '副將', maxTroops: 2500, hp: 99, int: 26, str: 98, pol: 20, cha: 53, minYear: 192, scenarios: [0, 1], desc: '字仲康，譙國譙人，容貌雄毅，勇力絕人，號稱虎癡。' },

  // 河北 / 幽州 / 青徐
  { name: '趙雲', provinceId: 2, role: '大將', maxTroops: 3000, hp: 98, int: 88, str: 98, pol: 65, cha: 82, minYear: 189, scenarios: [0], desc: '常山真定人，字子龍，身長八尺，姿顏雄偉，渾身是膽。' },
  { name: '太史慈', provinceId: 7, role: '大將', maxTroops: 3000, hp: 91, int: 68, str: 94, pol: 58, cha: 79, minYear: 190, scenarios: [0], desc: '東萊黃縣人，弓馬熟練，箭法如神，篤於義烈。' },
  { name: '田豐', provinceId: 3, role: '軍師', maxTroops: 3000, hp: 64, int: 93, str: 70, pol: 87, cha: 70, minYear: 189, scenarios: [0], desc: '鉅鹿人，博覽多識，權略多奇。' },
  { name: '沮授', provinceId: 4, role: '參軍', maxTroops: 2500, hp: 68, int: 90, str: 52, pol: 86, cha: 72, minYear: 189, scenarios: [0], desc: '廣平人，少有大志，多謀略，袁紹別駕。' },

  // 荊楚 / 襄陽 / 江陵 / 長沙
  { name: '諸葛亮', provinceId: 28, role: '軍師', maxTroops: 3000, hp: 73, int: 100, str: 69, pol: 98, cha: 98, minYear: 207, scenarios: [0, 1, 2], desc: '字孔明，臥龍先生，神機妙算，經天緯地之才。' },
  { name: '龐統', provinceId: 28, role: '軍師', maxTroops: 3000, hp: 75, int: 99, str: 76, pol: 85, cha: 83, minYear: 200, scenarios: [0, 1, 2], desc: '字士元，號鳳雛，荊楚高士，奇謀百出。' },
  { name: '魏延', provinceId: 31, role: '大將', maxTroops: 3000, hp: 92, int: 65, str: 94, pol: 48, cha: 69, minYear: 196, scenarios: [0, 1, 2], desc: '義陽人，字文長，勇猛過人，善養士卒。' },
  { name: '黃忠', provinceId: 31, role: '大將', maxTroops: 3000, hp: 93, int: 68, str: 96, pol: 52, cha: 80, minYear: 189, scenarios: [0, 1, 2], desc: '南陽人，字漢升，百步穿楊，勇冠三軍的老將。' },
  { name: '甘寧', provinceId: 29, role: '大將', maxTroops: 3000, hp: 92, int: 67, str: 94, pol: 18, cha: 70, minYear: 194, scenarios: [0, 1, 2], desc: '巴郡臨江人，字興霸，號錦帆賊，為人勇猛剛強，忠勇果敢。' },
  { name: '馬良', provinceId: 28, role: '軍師', maxTroops: 3000, hp: 54, int: 92, str: 39, pol: 84, cha: 77, minYear: 205, scenarios: [0, 1, 2, 3], desc: '襄陽宜城人，字季常，馬氏五常，白眉最良。' },
  { name: '蔣琬', provinceId: 32, role: '參軍', maxTroops: 2500, hp: 70, int: 88, str: 42, pol: 94, cha: 86, minYear: 208, scenarios: [2, 3], desc: '零陵湘鄉人，字公琰，方整有威重，社稷之器。' },

  // 江東 / 揚州
  { name: '魯肅', provinceId: 24, role: '軍師', maxTroops: 3000, hp: 80, int: 95, str: 68, pol: 92, cha: 89, minYear: 194, scenarios: [0, 1], desc: '臨淮東城人，字子敬，為人方嚴，體貌魁奇，少有壯節。' },
  { name: '陸遜', provinceId: 23, role: '軍師', maxTroops: 3000, hp: 90, int: 96, str: 80, pol: 95, cha: 78, minYear: 200, scenarios: [0, 1], desc: '吳郡吳縣人，字伯言，足智多謀，出將入相。' },
  { name: '張昭', provinceId: 21, role: '軍師', maxTroops: 3000, hp: 63, int: 89, str: 38, pol: 97, cha: 82, minYear: 192, scenarios: [0, 1], desc: '彭城人，字子布，博覽群書，吳中碩儒。' },
  { name: '張紘', provinceId: 21, role: '軍師', maxTroops: 3000, hp: 45, int: 93, str: 58, pol: 93, cha: 83, minYear: 192, scenarios: [0, 1], desc: '廣陵人，字子綱，文學才捷，善於策劃。' },
  { name: '丁奉', provinceId: 22, role: '大將', maxTroops: 3000, hp: 86, int: 68, str: 87, pol: 56, cha: 64, minYear: 205, scenarios: [1, 2, 3], desc: '廬江安豐人，字承淵，驍勇善戰，雪夜奮短兵。' },
  { name: '徐盛', provinceId: 22, role: '大將', maxTroops: 3000, hp: 85, int: 78, str: 88, pol: 60, cha: 72, minYear: 200, scenarios: [1, 2], desc: '琅邪莒縣人，字文嚮，智勇雙全，築疑城禦魏。' },

  // 巴蜀 / 益州 / 涼州
  { name: '法正', provinceId: 36, role: '軍師', maxTroops: 3000, hp: 68, int: 95, str: 54, pol: 78, cha: 78, minYear: 196, scenarios: [0, 1, 2, 3], desc: '扶風郿人，字孝直，奇謀無雙，料敵制勝。' },
  { name: '李嚴', provinceId: 38, role: '參軍', maxTroops: 2500, hp: 78, int: 84, str: 82, pol: 80, cha: 65, minYear: 200, scenarios: [1, 2, 3], desc: '南陽人，字正方，才幹出眾，文武兼備。' },
  { name: '費禕', provinceId: 36, role: '參軍', maxTroops: 2500, hp: 72, int: 87, str: 45, pol: 93, cha: 88, minYear: 215, scenarios: [3, 4], desc: '江夏鄳縣人，字文偉，寬厚弘毅，雅量高致。' },
  { name: '姜維', provinceId: 18, role: '大將', maxTroops: 3000, hp: 92, int: 97, str: 91, pol: 67, cha: 85, minYear: 225, scenarios: [4], desc: '天水冀縣人，字伯約，文武雙全，志慮忠純。' },
  { name: '鄧艾', provinceId: 35, role: '大將', maxTroops: 3000, hp: 84, int: 96, str: 88, pol: 81, cha: 41, minYear: 220, scenarios: [3, 4], desc: '義陽棘陽人，字士載，深通兵法，偷渡陰平。' },
  { name: '鍾會', provinceId: 10, role: '軍師', maxTroops: 3000, hp: 75, int: 94, str: 55, pol: 82, cha: 60, minYear: 235, scenarios: [4, 5], desc: '潁川長社人，字士季，精練策數，號稱張良。' },

  // 南蠻 / 交州
  { name: '士燮', provinceId: 42, role: '大將', maxTroops: 3000, hp: 65, int: 82, str: 45, pol: 86, cha: 90, minYear: 189, scenarios: [0, 1, 2], desc: '交趾名望士族，為人寬厚謙虛，統領嶺南數十年。' },
  { name: '薛綜', provinceId: 41, role: '主簿', maxTroops: 2000, hp: 60, int: 79, str: 35, pol: 83, cha: 75, minYear: 200, scenarios: [1, 2, 3], desc: '沛郡竹邑人，避難交州，才學宏博，善於詞令。' }
];
