const fs = require('fs');
const file = 'src/components/MapArea.tsx';
const data = fs.readFileSync(file, 'utf8');

const newG = `<g id="china-map" className="pointer-events-none">
            {/* Ocean / Coastline Edge with Bohai Peninsulas */}
            <path 
              d="M 1500,0 L 1550,100 L 1500,180 L 1480,220 L 1400,250 L 1320,220 L 1250,200 L 1220,250 L 1250,300 L 1380,350 L 1450,400 L 1400,480 L 1380,550 L 1420,600 L 1450,700 L 1480,850 L 1450,1050 L 1350,1200 L 1250,1350 L 1150,1450 L 950,1480 L 700,1520 L 400,1550"
              fill="none" stroke="#78716c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"
            />
            {/* Ocean glow */}
            <path 
              d="M 1500,0 L 1550,100 L 1500,180 L 1480,220 L 1400,250 L 1320,220 L 1250,200 L 1220,250 L 1250,300 L 1380,350 L 1450,400 L 1400,480 L 1380,550 L 1420,600 L 1450,700 L 1480,850 L 1450,1050 L 1350,1200 L 1250,1350 L 1150,1450 L 950,1480 L 700,1520 L 400,1550"
              fill="none" stroke="#d6d3d1" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" 
            />
            
            {/* Taiwan Island (夷州) */}
            <path 
              d="M 1520,1180 Q 1580,1230 1540,1320 Q 1490,1260 1520,1180 Z" 
              fill="#e6e2db" stroke="#78716c" strokeWidth="3" opacity="0.9" strokeLinejoin="round"
            />
            <text x="1535" y="1250" fill="#78716c" fontSize="16" className="font-serif font-bold opacity-70">夷州</text>
            
            {/* Hainan Island (海南島) */}
            <path 
              d="M 950,1500 Q 1000,1480 1020,1530 Q 990,1570 930,1540 Z" 
              fill="#e6e2db" stroke="#78716c" strokeWidth="3" opacity="0.9" strokeLinejoin="round"
            />
            <text x="965" y="1535" fill="#78716c" fontSize="16" className="font-serif font-bold opacity-70">海南</text>

            {/* Sea labels */}
            <text x="1350" y="220" fill="#a8a29e" fontSize="24" className="font-serif font-bold opacity-70" style={{ writingMode: 'vertical-rl' }}>渤海</text>
            <text x="1530" y="550" fill="#a8a29e" fontSize="24" className="font-serif font-bold opacity-70" style={{ writingMode: 'vertical-rl' }}>黃海</text>
            <text x="1550" y="900" fill="#a8a29e" fontSize="24" className="font-serif font-bold opacity-70" style={{ writingMode: 'vertical-rl' }}>東海</text>
            <text x="1250" y="1450" fill="#a8a29e" fontSize="24" className="font-serif font-bold opacity-70" style={{ writingMode: 'vertical-rl' }}>南海</text>

            {/* Great Wall */}
            <path 
              d="M 100,300 Q 300,250 500,150 Q 750,100 950,150 Q 1200,180 1450,50" 
              fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="14 10" strokeLinecap="round" opacity="0.6"
            />
            <text x="700" y="120" fill="#c2410c" fontSize="22" className="font-serif font-bold opacity-80">萬里長城</text>

            {/* Yellow River (Blue) */}
            <path 
              d="M 50,600 Q 300,550 500,580 Q 650,550 825,550 Q 950,520 1125,500 Q 1200,450 1350,300" 
              fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" opacity="0.7"
            />
            <text x="750" y="535" fill="#0284c7" fontSize="20" className="font-serif font-bold opacity-80">黃河</text>

            {/* Yangtze River (Blue) */}
            <path 
              d="M 50,1050 Q 300,950 450,1000 Q 650,1050 825,1000 Q 950,900 1125,850 Q 1250,830 1480,820" 
              fill="none" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" opacity="0.7"
            />
            <text x="950" y="880" fill="#0284c7" fontSize="20" className="font-serif font-bold opacity-80">長江</text>
            
            {/* Lakes (Dongting & Poyang) */}
            <ellipse cx="880" cy="1070" rx="30" ry="25" fill="#7dd3fc" opacity="0.7" />
            <text x="860" y="1075" fill="#0284c7" fontSize="14" className="font-serif font-bold opacity-80">洞庭湖</text>
            
            <ellipse cx="1120" cy="980" rx="40" ry="30" fill="#7dd3fc" opacity="0.7" />
            <text x="1100" y="985" fill="#0284c7" fontSize="14" className="font-serif font-bold opacity-80">鄱陽湖</text>
            
            {/* Triangle Mountains (Green) */}
            {/* Qinling (秦嶺) */}
            <g opacity="0.8">
              <polygon points="500,650 530,600 560,650" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="540,660 570,610 600,660" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="580,650 610,600 640,650" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="620,660 650,610 680,660" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <text x="570" y="680" fill="#15803d" fontSize="18" className="font-serif font-bold opacity-90">秦嶺</text>
            </g>

            {/* Taihang (太行山) */}
            <g opacity="0.8">
              <polygon points="900,250 930,200 960,250" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="910,290 940,240 970,290" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="900,330 930,280 960,330" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="890,370 920,320 950,370" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <text x="960" y="320" fill="#15803d" fontSize="18" className="font-serif font-bold opacity-90" style={{ writingMode: 'vertical-rl' }}>太行山</text>
            </g>

            {/* Nanling / Wuling (南嶺) */}
            <g opacity="0.8">
              <polygon points="650,1150 680,1100 710,1150" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="700,1160 730,1110 760,1160" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="750,1150 780,1100 810,1150" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="800,1160 830,1110 860,1160" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <polygon points="850,1150 880,1100 910,1150" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
              <text x="760" y="1180" fill="#15803d" fontSize="18" className="font-serif font-bold opacity-90">南嶺</text>
            </g>

            {/* Historical Passes (關塞) */}
            <g className="opacity-90">
              <rect x="880" y="625" width="20" height="20" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              <text x="870" y="620" fill="#78350f" fontSize="14" className="font-serif font-bold">虎牢關</text>
              
              <rect x="740" y="585" width="20" height="20" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              <text x="730" y="580" fill="#78350f" fontSize="14" className="font-serif font-bold">函谷關</text>
              
              <rect x="700" y="595" width="20" height="20" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              <text x="690" y="590" fill="#78350f" fontSize="14" className="font-serif font-bold">潼關</text>
              
              <rect x="620" y="700" width="20" height="20" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              <text x="610" y="695" fill="#78350f" fontSize="14" className="font-serif font-bold">陽平關</text>
            </g>
          </g>`;

const regex = /<g id="china-map" className="pointer-events-none">[\s\S]*?(?=<g>\s*{\/\* Draw connections \*\/)/;
const updated = data.replace(regex, newG + '\n          ');

fs.writeFileSync(file, updated);
console.log('Patch complete.');
