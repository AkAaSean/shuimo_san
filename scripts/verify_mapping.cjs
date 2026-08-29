const { GENERAL_AVATAR_MAP, getGeneralAvatarUrl } = require('../src/data/avatarMapping.ts');

const list = [
  '周瑜', '黃忠', '馬超', '夏侯淵', '文醜', '顏良', '袁紹',
  '馬岱', '司馬徽', '孫權', '孫堅', '鐘會', '姜維', '鄧艾',
  '魏延', '典韋', '黃蓋', '荀彧', '田豐', '張遼', '徐晃'
];

console.log('=== Verifying 21 Generals Mapping ===');
list.forEach((name, i) => {
  const url = getGeneralAvatarUrl(name);
  console.log(`${(i+1).toString().padStart(2, ' ')}. ${name.padEnd(5, ' ')} => ${url}`);
});
