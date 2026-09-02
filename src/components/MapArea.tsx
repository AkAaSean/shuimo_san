import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'motion/react';
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
  const controls = useAnimation();
  const [scale, setScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // 精確監聽容器尺寸變更（適應各式螢幕比例與轉向）
  useEffect(() => {
    if (!containerRef.current) return;
    const updateContainer = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || (window.innerHeight - 120),
        });
      }
    };

    updateContainer();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    ro.observe(containerRef.current);
    window.addEventListener('resize', updateContainer);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateContainer);
    };
  }, []);

  const MAP_BASE_SIZE = 1600;

  // 確保選中城池時精確置中，並支援視區 offset 與動態縮放
  useEffect(() => {
    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const targetScale = Math.max(scale < 1.2 ? 1.45 : scale, 1.45);
        setScale(targetScale);

        const isMobile = containerSize.width < 640;
        // SVG 中心點為 (800, 800)
        // 手機端視區扣除底部選單，微調 Y 軸偏移 -15px 讓城池居於最佳視覺中心
        const targetX = (800 - selectedP.x) * targetScale;
        const targetY = (800 - selectedP.y) * targetScale - (isMobile ? 15 : 0);

        const w = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
        const h = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight - 120 : 600);

        const mapRenderedW = MAP_BASE_SIZE * targetScale;
        const mapRenderedH = MAP_BASE_SIZE * targetScale;

        const maxDragX = Math.max(0, (mapRenderedW - w) / 2);
        const maxDragY = Math.max(0, (mapRenderedH - h) / 2);

        const clampedX = Math.min(maxDragX, Math.max(-maxDragX, targetX));
        const clampedY = Math.min(maxDragY, Math.max(-maxDragY, targetY));

        controls.start({
          x: clampedX,
          y: clampedY,
          scale: targetScale,
          transition: { type: 'spring', stiffness: 220, damping: 26 }
        });
      }
    }
  }, [selectedProvinceId, containerSize, controls]);

  // 將選中的城池渲染順序排在最後，確保其光圈與文字永遠在最上層 (SVG Z-index 效果)
  const sortedProvinces = useMemo(() => {
    if (!selectedProvinceId) return provinces;
    return [...provinces].sort((a, b) => {
      if (a.id === selectedProvinceId) return 1;
      if (b.id === selectedProvinceId) return -1;
      return 0;
    });
  }, [selectedProvinceId]);

  // Compute boundaries to prevent dragging map out of view
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

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.35, 3.0);
    setScale(newScale);
    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const isMobile = containerSize.width < 640;
        const targetX = (800 - selectedP.x) * newScale;
        const targetY = (800 - selectedP.y) * newScale - (isMobile ? 15 : 0);
        const maxX = Math.max(0, (MAP_BASE_SIZE * newScale - containerSize.width) / 2);
        const maxY = Math.max(0, (MAP_BASE_SIZE * newScale - containerSize.height) / 2);
        const clampedX = Math.min(maxX, Math.max(-maxX, targetX));
        const clampedY = Math.min(maxY, Math.max(-maxY, targetY));
        controls.start({ x: clampedX, y: clampedY, scale: newScale, transition: { duration: 0.22 } });
        return;
      }
    }
    controls.start({ scale: newScale, transition: { duration: 0.22 } });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.35, 0.6);
    setScale(newScale);
    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const isMobile = containerSize.width < 640;
        const targetX = (800 - selectedP.x) * newScale;
        const targetY = (800 - selectedP.y) * newScale - (isMobile ? 15 : 0);
        const maxX = Math.max(0, (MAP_BASE_SIZE * newScale - containerSize.width) / 2);
        const maxY = Math.max(0, (MAP_BASE_SIZE * newScale - containerSize.height) / 2);
        const clampedX = Math.min(maxX, Math.max(-maxX, targetX));
        const clampedY = Math.min(maxY, Math.max(-maxY, targetY));
        controls.start({ x: clampedX, y: clampedY, scale: newScale, transition: { duration: 0.22 } });
        return;
      }
    }
    controls.start({ scale: newScale, transition: { duration: 0.22 } });
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-[#e6e2db] flex items-center justify-center select-none"
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
        animate={controls}
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
            
            {/* Draw city nodes with selected city rendered last for Z-index overlay */}
            {sortedProvinces.map((p) => {
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
                  {/* Selected City Double Ping Wave Effect */}
                  {isSelected && (
                    <>
                      <circle
                        r={38}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        className="animate-ping opacity-60 pointer-events-none"
                      />
                      <circle
                        r={28}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        className="animate-ping opacity-80 pointer-events-none"
                        style={{ animationDelay: '0.15s' }}
                      />
                    </>
                  )}

                  {/* Outer White / Gold Halo Ring */}
                  <circle
                    r={isSelected ? 26 : 17}
                    fill="none"
                    stroke={isSelected ? '#fbbf24' : '#ffffff'}
                    strokeWidth={isSelected ? 5 : 2.5}
                    className="transition-all duration-300 drop-shadow-md"
                  />

                  {/* Inner Ruler Color Circle */}
                  <circle
                    r={isSelected ? 21 : 14}
                    fill={fill}
                    stroke="#1c1917"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all duration-300"
                  />


                  {/* City Name Label: Bold Yellow with Heavy Dark Shadow */}
                  <text
                    y={isSelected ? -16 : -24}
                    textAnchor="middle"
                    className={`font-serif transition-all duration-300 ${
                      isSelected ? 'font-black fill-yellow-300 text-[23px]' : 'font-black fill-white text-[17px]'
                    }`}
                    style={{ textShadow: isSelected ? '0 0 6px #000, 0 0 10px #000, 2px 2px 4px #000' : '0 0 4px #000, 0 0 8px #000, 1px 1px 3px #000' }}
                  >
                    {p.name}
                  </text>

                  {/* Ruler Initial or Province ID */}
                  {textContent ? (
                    <text
                      y={isSelected ? 7 : 5}
                      textAnchor="middle"
                      className={`font-serif fill-white font-black ${isSelected ? 'text-[16px]' : 'text-[13px]'}`}
                      style={{ textShadow: '0 0 3px #000' }}
                    >
                      {textContent}
                    </text>
                  ) : (
                    <text
                      y={isSelected ? 6 : 4}
                      textAnchor="middle"
                      className={`font-serif fill-white font-black ${isSelected ? 'text-[14px]' : 'text-[11px]'}`}
                      style={{ textShadow: '0 0 3px #000' }}
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
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
        <button 
          onClick={handleZoomIn}
          title="放大地圖"
          className="w-12 h-12 bg-stone-200/90 border-2 border-stone-800 rounded-full flex items-center justify-center text-2xl font-black text-stone-900 shadow-md backdrop-blur-sm active:bg-stone-300 cursor-pointer"
        >
          ＋
        </button>
        <button 
          onClick={handleZoomOut}
          title="縮小地圖"
          className="w-12 h-12 bg-stone-200/90 border-2 border-stone-800 rounded-full flex items-center justify-center text-2xl font-black text-stone-900 shadow-md backdrop-blur-sm active:bg-stone-300 cursor-pointer"
        >
          －
        </button>
      </div>
    </div>
  );
}
