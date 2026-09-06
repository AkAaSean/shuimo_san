import * as fs from 'fs';
import * as path from 'path';
import { generals } from '../src/data/generals';
import { getGeneralAvailableSkills, BATTLE_SKILLS, EXCLUSIVE_ULTIMATE_SKILLS } from '../src/engine/skills';

console.log('Total generals loaded:', generals.length);

let md = '# 三國武將全戰法與技能一覽表 (General Skills Review & Checklist)\n\n';
md += '> 本文件彙整遊戲中所有武將之屬性數據、戰法配置、專屬終極奧義（耗體 70 點）以及全部戰法技能規格說明，供審查與檢核。\n\n';

md += '## 目錄\n';
md += '1. [戰法技能庫規格說明 (Battle Skills Reference)](#1-戰法技能庫規格說明)\n';
md += '2. [二十大傳奇名將專屬終極奧義 (Exclusive Ultimate Skills)](#2-二十大傳奇名將專屬終極奧義)\n';
md += '3. [全武將戰法技能總表 (All Generals Skill List)](#3-全武將戰法技能總表)\n\n';

md += '---\n\n';
md += '## 1. 戰法技能庫規格說明\n\n';
md += '| 戰法名稱 | 類別 | 消耗 (SP/體力) | 作用範圍 | 效果說明 |\n';
md += '| :--- | :---: | :---: | :---: | :--- |\n';

for (const [name, skill] of Object.entries(BATTLE_SKILLS)) {
  const costStr = skill.isUltimate ? `體力 ${skill.cost}` : `SP ${skill.cost}`;
  md += `| **${name}** | ${skill.category} | ${costStr} | ${skill.target} | ${skill.desc} |\n`;
}

md += '\n---\n\n';
md += '## 2. 二十大傳奇名將專屬終極奧義\n\n';
md += '| 審核 | 武將 | 專屬奧義 (耗體 70) | 作用範圍 | 替換原戰法 | 專屬效果 |\n';
md += '| :---: | :---: | :--- | :---: | :---: | :--- |\n';

for (const [genName, cfg] of Object.entries(EXCLUSIVE_ULTIMATE_SKILLS)) {
  const skill = BATTLE_SKILLS[cfg.skillName];
  md += `| [ ] | **${genName}** | **${cfg.skillName}** | ${skill?.target || '單體'} | ${cfg.replacedSkill} | ${skill?.desc || ''} |\n`;
}

md += '\n---\n\n';
md += '## 3. 全武將戰法技能總表\n\n';
md += '| 審核 | 武將姓名 | 身份/官職 | 武力 | 智力 | 統御/體力 | 政治 | 魅力 | 技能數 | 完整技能清單 |\n';
md += '| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n';

generals.forEach((g) => {
  const skills = getGeneralAvailableSkills(g);
  const skillText = skills.map(s => {
    if (s.includes('・')) {
      return `🌟 **${s}**`;
    }
    return s;
  }).join('、');
  
  md += `| [ ] | **${g.name}** | ${g.role || '武將'} | ${g.str} | ${g.int} | ${g.hp || 0} | ${g.pol || 0} | ${g.cha || 0} | ${skills.length} | ${skillText} |\n`;
});

const outPath = path.resolve(process.cwd(), 'GENERAL_SKILLS.md');
fs.writeFileSync(outPath, md, 'utf-8');
console.log('Successfully generated GENERAL_SKILLS.md at:', outPath, 'Size:', md.length);
