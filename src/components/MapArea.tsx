import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { provinces } from '../data/provinces';
import { ProvinceState } from '../types';
import chinaMapBg from '../assets/images/china_map_bg_1787578499258.jpg';

interface MapAreaProps {
  selectedProvinceId: number | null;
  onSelectProvince: (id: number) => void;
  onClearSelection?: () => void;
  provincesData?: Record<number, ProvinceState>;
}

const RULER_COLORS: Record<string, string> = {
  '劉備': '#166534', '劉禪': '#166534', // green-800
  '曹操': '#1d4ed8', '曹丕': '#1d4ed8', // blue-700
  '孫堅': '#b91c1c', '孫策': '#b91c1c', '孫權': '#b91c1c', // red-700
  '董卓': '#6b21a8', // purple-800
  '袁紹': '#ca8a04', // yellow-600
  '袁術': '#ea580c', // orange-600
  '劉焉': '#047857', '劉璋': '#047857', // emerald-700
  '劉表': '#0e7490', // cyan-700
  '馬騰': '#0f766e', // teal-700
  '公孫瓚': '#475569', // slate-600
  '李傕': '#581c87', // purple-900
};

const getRulerFill = (rulerName: string | null, isSelected: boolean) => {
  if (!rulerName) return isSelected ? '#78716c' : '#d6d3d1';
  return RULER_COLORS[rulerName] || '#57534e'; // stone-600 default
};

const getRulerText = (rulerName: string | null) => {
  if (!rulerName) return '';
  return rulerName.charAt(0);
};

export default function MapArea({ selectedProvinceId, onSelectProvince, onClearSelection, provincesData }: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute boundaries to prevent dragging map out of view
  const MAP_BASE_SIZE = 1600;
  const mapRenderedWidth = MAP_BASE_SIZE * scale;
  const mapRenderedHeight = MAP_BASE_SIZE * scale;

  const maxDragX = Math.max(0, (mapRenderedWidth - containerSize.width) / 2);
  const maxDragY = Math.max(0, (mapRenderedHeight - containerSize.height) / 2);

  const dragConstraints = {
    left: -maxDragX,
    right: maxDragX,
    top: -maxDragY,
    bottom: maxDragY,
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-[#e6e2db] flex items-center justify-center"
      ref={containerRef}
    >
      {/* Background Ink Wash Texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 bg-radial from-[#dcd7d0] to-[#c7c1b8]"
      ></div>

      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0}
        className="absolute w-[1600px] h-[1600px] cursor-grab active:cursor-grabbing origin-center"
        style={{ scale }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1600 1600" 
          className="drop-shadow-lg"
          style={{ touchAction: 'none' }}
        >
          {/* Clickable Background to clear selection */}
          <rect x="0" y="0" width="1600" height="1600" fill="transparent" onClick={() => onClearSelection && onClearSelection()} />

          {/* China Ink Wash Map Background */}
          <image 
            href={chinaMapBg} 
            x="0" 
            y="0" 
            width="1600" 
            height="1600" 
            preserveAspectRatio="xMidYMid slice" 
            className="pointer-events-none opacity-90 filter contrast-105 saturate-90"
          />

          {/* Historical Passes / Fortresses Layer (關塞) */}
          <g id="pass-nodes" className="pointer-events-none">
            {[
              { name: '虎牢關', x: 900, y: 685 },
              { name: '函谷關', x: 755, y: 640 },
              { name: '潼關', x: 610, y: 640 },
              { name: '陽平關', x: 560, y: 705 },
              { name: '劍閣', x: 555, y: 805 },
              { name: '武關', x: 752, y: 790 },
            ].map(pass => (
              <g key={pass.name} transform={`translate(${pass.x}, ${pass.y})`}>
                <rect x="-11" y="-11" width="22" height="22" fill="#b91c1c" stroke="#ffffff" strokeWidth="2" rx="3" className="drop-shadow-md" />
                <text x="0" y="-15" textAnchor="middle" fill="#ffffff" fontSize="15" className="font-serif font-black" style={{ textShadow: '0 0 4px #000, 1px 1px 3px #000' }}>{pass.name}</text>
              </g>
            ))}
          </g>

          <g>
            {/* Draw connection lines: Dark backdrop line + Bold White main line */}
            {provinces.map((p) =>
              p.connections.map((targetId) => {
                if (targetId > p.id) { // Avoid drawing double lines
                  const target = provinces.find((t) => t.id === targetId);
                  if (target) {
                    return (
                      <g key={`line-group-${p.id}-${targetId}`}>
                        <line
                          x1={p.x}
                          y1={p.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#000000"
                          strokeWidth="6"
                          strokeOpacity="0.6"
                        />
                        <line
                          x1={p.x}
                          y1={p.y}
                          x2={target.x}
                          y2={target.y}
                          stroke="#ffffff"
                          strokeWidth="3.5"
                          strokeOpacity="0.95"
                          strokeDasharray="8 4"
                        />
                      </g>
                    );
                  }
                }
                return null;
              })
            )}
            
            {/* Draw city nodes */}
            {provinces.map((p) => {
              const isSelected = p.id === selectedProvinceId;
              const pData = provincesData ? provincesData[p.id] : null;
              const rulerName = pData ? pData.rulerName : null;
              const fill = getRulerFill(rulerName, isSelected);
              const textContent = getRulerText(rulerName);

              return (
                <g 
                  key={p.id} 
                  transform={`translate(${p.x}, ${p.y})`}
                  onClick={() => onSelectProvince(p.id)}
                  className="cursor-pointer"
                >
                  {/* Outer White Halo Ring */}
                  <circle
                    r={isSelected ? 22 : 17}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 4 : 2.5}
                    className="transition-all duration-300 drop-shadow-md"
                  />
                  {/* Inner Ruler Color Circle */}
                  <circle
                    r={isSelected ? 18 : 14}
                    fill={fill}
                    stroke="#1c1917"
                    strokeWidth={1.5}
                    className="transition-all duration-300"
                  />
                  {/* City Name Label: Bold White with Dark Shadow */}
                  <text
                    y={-24}
                    textAnchor="middle"
                    className={`font-serif transition-all duration-300 ${
                      isSelected ? 'font-black fill-yellow-300 text-[20px]' : 'font-black fill-white text-[17px]'
                    }`}
                    style={{ textShadow: '0 0 4px #000, 0 0 8px #000, 1px 1px 3px #000' }}
                  >
                    {p.name}
                  </text>
                  {/* Ruler Initial or Province ID */}
                  {textContent ? (
                    <text
                      y={5}
                      textAnchor="middle"
                      className="font-serif text-[13px] fill-white font-black"
                      style={{ textShadow: '0 0 2px #000' }}
                    >
                      {textContent}
                    </text>
                  ) : (
                    <text
                      y={4}
                      textAnchor="middle"
                      className="font-serif text-[11px] fill-white font-black"
                      style={{ textShadow: '0 0 2px #000' }}
                    >
                      {p.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </motion.div>

      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
        <button 
          onClick={() => setScale(s => Math.min(s + 0.3, 3))}
          className="w-12 h-12 bg-stone-200/90 border-2 border-stone-800 rounded-full flex items-center justify-center text-2xl font-black text-stone-900 shadow-md backdrop-blur-sm active:bg-stone-300 cursor-pointer"
        >
          ＋
        </button>
        <button 
          onClick={() => setScale(s => Math.max(s - 0.3, 0.5))}
          className="w-12 h-12 bg-stone-200/90 border-2 border-stone-800 rounded-full flex items-center justify-center text-2xl font-black text-stone-900 shadow-md backdrop-blur-sm active:bg-stone-300 cursor-pointer"
        >
          －
        </button>
      </div>
    </div>
  );
}
