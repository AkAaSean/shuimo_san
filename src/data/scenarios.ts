export interface RulerConfig {
  name: string;
  provinces: number[];
}

export interface ScenarioConfig {
  id: number;
  year: number;
  title: string;
  subtitle: string;
  rulers: RulerConfig[];
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 0,
    year: 189,
    title: '中平六年',
    subtitle: '董卓專政，曹操舉兵',
    rulers: [
      { name: '劉備', provinces: [8] },
      { name: '曹操', provinces: [11] },
      { name: '孫堅', provinces: [31] },
      { name: '袁紹', provinces: [3, 4] },
      { name: '袁術', provinces: [13, 27] },
      { name: '董卓', provinces: [6, 14, 15] },
      { name: '劉焉', provinces: [36, 37, 38, 43] },
      { name: '馬騰', provinces: [19] },
      { name: '劉表', provinces: [28, 29, 30] },
      { name: '陶謙', provinces: [9, 10] },
      { name: '公孫瓚', provinces: [2] },
      { name: '劉繇', provinces: [21] },
      { name: '王朗', provinces: [23] },
      { name: '孔融', provinces: [7] },
      { name: '張魯', provinces: [35] }
    ]
  },
  {
    id: 1,
    year: 195,
    title: '興平二年',
    subtitle: '呂布弒董卓，李傕敗呂布',
    rulers: [
      { name: '劉備', provinces: [9, 10] },
      { name: '曹操', provinces: [14, 15, 16] },
      { name: '孫策', provinces: [22] },
      { name: '袁紹', provinces: [3, 4, 8] },
      { name: '袁術', provinces: [13, 27] },
      { name: '李傕', provinces: [17] },
      { name: '劉璋', provinces: [36, 37, 38, 43] },
      { name: '馬騰', provinces: [19, 20] },
      { name: '劉表', provinces: [28, 29, 30] },
      { name: '張魯', provinces: [35] },
      { name: '公孫瓚', provinces: [2] },
      { name: '劉繇', provinces: [21] },
      { name: '王朗', provinces: [23] },
      { name: '楊奉', provinces: [5] },
      { name: '孔融', provinces: [7] },
      { name: '呂布', provinces: [11] }
    ]
  },
  {
    id: 2,
    year: 201,
    title: '建安六年',
    subtitle: '曹操敗袁紹，劉備投荊州',
    rulers: [
      { name: '劉備', provinces: [27] },
      { name: '曹操', provinces: [11, 12, 13, 14, 15, 16] },
      { name: '孫權', provinces: [21, 22, 23, 24] },
      { name: '袁紹', provinces: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: '劉璋', provinces: [36, 37, 38, 43] },
      { name: '馬騰', provinces: [19, 20] },
      { name: '劉表', provinces: [28, 29, 30, 31, 32] },
      { name: '張魯', provinces: [35] }
    ]
  },
  {
    id: 3,
    year: 208,
    title: '建安十三年',
    subtitle: '赤壁之戰',
    rulers: [
      { name: '劉備', provinces: [27, 28, 29, 30] },
      { name: '曹操', provinces: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
      { name: '孫權', provinces: [21, 22, 23, 24, 25] },
      { name: '金旋', provinces: [32] },
      { name: '韓玄', provinces: [31] },
      { name: '趙範', provinces: [33] },
      { name: '劉璋', provinces: [35, 36, 37, 38, 43] },
      { name: '馬騰', provinces: [19, 20] },
      { name: '劉度', provinces: [34] },
      { name: '張魯', provinces: [35] }
    ]
  },
  {
    id: 4,
    year: 215,
    title: '建安二十年',
    subtitle: '劉備收蜀，張魯降曹操',
    rulers: [
      { name: '劉備', provinces: [27, 28, 30, 32, 35, 36, 37, 38, 39, 43] },
      { name: '曹操', provinces: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
      { name: '孫權', provinces: [21, 22, 23, 24, 25, 29, 31, 33, 34, 41] },
      { name: '孟獲', provinces: [40] }
    ]
  },
  {
    id: 5,
    year: 220,
    title: '黃初元年',
    subtitle: '曹丕篡漢',
    rulers: [
      { name: '劉備', provinces: [18, 30, 32, 35, 36, 37, 38, 39, 43] },
      { name: '曹丕', provinces: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 27, 28] },
      { name: '孫權', provinces: [21, 22, 23, 24, 25, 29, 31, 33, 34, 41] },
      { name: '孟獲', provinces: [40] }
    ]
  }
];
