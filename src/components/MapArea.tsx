import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import { provinces } from '../data/provinces';
import { ProvinceState } from '../types';
import { PROVINCE_BASE_CONFIGS } from '../data/provinceBaseConfig';
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

// 根據都市類型對應 public/assets/city.jpg 的四象限
const getCityPatternId = (provinceId: number): string => {
  const tier = PROVINCE_BASE_CONFIGS[provinceId]?.tier;
  if (tier === 'METROPOLIS') return 'city-pattern-metropolis';     // 左上：大型城池
  if (tier === 'COMMERCIAL') return 'city-pattern-commercial';     // 右上：商業城池
  if (tier === 'AGRICULTURAL') return 'city-pattern-agricultural'; // 左下：農業城池
  return 'city-pattern-midsized';                                  // 右下：中型城池和邊界城池
};

export default function MapArea({ selectedProvinceId, onSelectProvince, onClearSelection, provincesData }: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const [currentScale, setCurrentScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // 清除離線調試歷史記錄
  useEffect(() => {
    localStorage.removeItem('map_city_offset_x');
    localStorage.removeItem('map_city_offset_y');
    localStorage.removeItem('map_bg_offset_x');
    localStorage.removeItem('map_bg_offset_y');
    localStorage.removeItem('map_custom_city_offsets_v2');
    localStorage.removeItem('map_custom_pass_offsets_v2');
  }, []);

  // 觸控雙指捏合縮放暫存
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);

  const MAP_BASE_SIZE = 1600;

  // 計算永遠填滿視窗容器的最小縮放比率，確保畫面 100% 永遠被地圖完全覆蓋，絕不露出底圖
  const minScale = useMemo(() => {
    const safeW = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const safeH = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight - 120 : 600);
    const wRatio = safeW / MAP_BASE_SIZE;
    const hRatio = safeH / MAP_BASE_SIZE;
    // 使用 Math.max 確保地圖的寬與高皆不小於視窗寬高，永遠填滿視窗
    return Math.max(wRatio, hRatio);
  }, [containerSize.width, containerSize.height]);

  // 精確監聽容器尺寸變更
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

  // 嚴格計算當前縮放比率下，地圖平移的極限邊界（確保地圖邊緣永遠覆蓋視窗，絕不露出底圖）
  const getClampedPosition = useCallback((targetX: number, targetY: number, scale: number) => {
    const safeW = containerSize.width || 800;
    const safeH = containerSize.height || 600;
    const mapW = MAP_BASE_SIZE * scale;
    const mapH = MAP_BASE_SIZE * scale;

    // 地圖寬高皆大於等於視窗寬高，允許中心移動的最大偏移量
    const maxX = Math.max(0, (mapW - safeW) / 2);
    const maxY = Math.max(0, (mapH - safeH) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, targetX)),
      y: Math.min(maxY, Math.max(-maxY, targetY)),
      maxX,
      maxY
    };
  }, [containerSize.width, containerSize.height]);

  // 通用平滑縮放與平移函數
  const animateToTransform = useCallback((targetScale: number, targetX: number, targetY: number, duration = 0.22) => {
    const clampedScale = Math.min(3.0, Math.max(minScale, targetScale));
    const { x: clampedX, y: clampedY } = getClampedPosition(targetX, targetY, clampedScale);

    x.set(clampedX);
    y.set(clampedY);
    scaleValue.set(clampedScale);
    setCurrentScale(clampedScale);

    controls.start({
      x: clampedX,
      y: clampedY,
      scale: clampedScale,
      transition: { duration, ease: [0.25, 0.1, 0.25, 1] }
    });
  }, [minScale, getClampedPosition, controls, x, y, scaleValue]);

  // 當容器大小或最小縮放變化時，自動修正越界，保證絕不露底
  useEffect(() => {
    const activeScale = scaleValue.get();
    const effectiveScale = Math.max(activeScale, minScale);
    const { x: clampedX, y: clampedY } = getClampedPosition(x.get(), y.get(), effectiveScale);

    if (effectiveScale !== activeScale || clampedX !== x.get() || clampedY !== y.get()) {
      animateToTransform(effectiveScale, clampedX, clampedY, 0.15);
    }
  }, [containerSize, minScale, getClampedPosition, animateToTransform, scaleValue, x, y]);

  // 確保選中城池時精確置中，且嚴格鎖定在地圖邊界內
  useEffect(() => {
    const safeW = containerSize.width || 800;
    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const activeScale = scaleValue.get();
        const targetScale = Math.max(activeScale < 1.2 ? 1.45 : activeScale, minScale);
        const isMobile = safeW < 640;

        const rawTargetX = (800 - selectedP.x) * targetScale;
        const rawTargetY = (800 - selectedP.y) * targetScale - (isMobile ? 15 : 0);

        animateToTransform(targetScale, rawTargetX, rawTargetY, 0.25);
      }
    } else {
      let activeScale = scaleValue.get();
      if (activeScale < minScale) {
        activeScale = minScale;
      }
      const { x: clampedX, y: clampedY } = getClampedPosition(x.get(), y.get(), activeScale);
      animateToTransform(activeScale, clampedX, clampedY, 0.2);
    }
  }, [selectedProvinceId, containerSize, minScale, animateToTransform, getClampedPosition, x, y, scaleValue]);

  // 滑鼠滾輪順暢縮放 (Wheel Zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const activeScale = scaleValue.get();
      const newScale = Math.min(3.0, Math.max(minScale, activeScale * zoomFactor));

      if (Math.abs(newScale - activeScale) < 0.005) return;

      const scaleRatio = newScale / activeScale;
      const rawTargetX = x.get() * scaleRatio;
      const rawTargetY = y.get() * scaleRatio;

      animateToTransform(newScale, rawTargetX, rawTargetY, 0.12);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [minScale, animateToTransform, scaleValue, x, y]);

  // 行動端雙指捏合縮放 (Pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scaleValue.get();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.min(3.0, Math.max(minScale, touchStartScaleRef.current * factor));

      const activeScale = scaleValue.get();
      const scaleRatio = newScale / activeScale;
      const rawTargetX = x.get() * scaleRatio;
      const rawTargetY = y.get() * scaleRatio;
      const { x: clampedX, y: clampedY } = getClampedPosition(rawTargetX, rawTargetY, newScale);

      x.set(clampedX);
      y.set(clampedY);
      scaleValue.set(newScale);
      setCurrentScale(newScale);
      controls.set({ x: clampedX, y: clampedY, scale: newScale });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    const activeScale = scaleValue.get();
    const { x: clampedX, y: clampedY } = getClampedPosition(x.get(), y.get(), activeScale);
    animateToTransform(activeScale, clampedX, clampedY, 0.15);
  };

  // 拖曳結束時自動校準防護，保證不露底
  const handleDragEnd = useCallback(() => {
    const activeScale = scaleValue.get();
    const curX = x.get();
    const curY = y.get();
    const { x: clampedX, y: clampedY } = getClampedPosition(curX, curY, activeScale);
    if (Math.abs(curX - clampedX) > 0.5 || Math.abs(curY - clampedY) > 0.5) {
      animateToTransform(activeScale, clampedX, clampedY, 0.12);
    }
  }, [scaleValue, x, y, getClampedPosition, animateToTransform]);

  // 將選中的城池渲染順序排在最後，確保其光圈與文字永遠在最上層
  const sortedProvinces = useMemo(() => {
    if (!selectedProvinceId) return provinces;
    return [...provinces].sort((a, b) => {
      if (a.id === selectedProvinceId) return 1;
      if (b.id === selectedProvinceId) return -1;
      return 0;
    });
  }, [selectedProvinceId]);

  // 精準約束拖拽範圍，完全杜絕露底
  const dragConstraints = useMemo(() => {
    const { maxX, maxY } = getClampedPosition(0, 0, currentScale);
    return {
      left: -maxX,
      right: maxX,
      top: -maxY,
      bottom: maxY,
    };
  }, [getClampedPosition, currentScale]);

  const applyZoom = (newScale: number) => {
    const activeScale = scaleValue.get();
    const clampedScale = Math.max(newScale, minScale);
    let rawTargetX = x.get();
    let rawTargetY = y.get();

    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const isMobile = (containerSize.width || 800) < 640;
        rawTargetX = (800 - selectedP.x) * clampedScale;
        rawTargetY = (800 - selectedP.y) * clampedScale - (isMobile ? 15 : 0);
      }
    } else {
      const scaleRatio = clampedScale / activeScale;
      rawTargetX = rawTargetX * scaleRatio;
      rawTargetY = rawTargetY * scaleRatio;
    }

    animateToTransform(clampedScale, rawTargetX, rawTargetY, 0.2);
  };

  const handleZoomIn = () => {
    applyZoom(Math.min(currentScale + 0.3, 3.0));
  };

  const handleZoomOut = () => {
    applyZoom(Math.max(currentScale - 0.3, minScale));
  };

  const handleResetZoom = () => {
    animateToTransform(minScale, 0, 0, 0.25);
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-[#c8c1b2] flex items-center justify-center select-none"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ink Wash Texture overlay matching map paper */}
      <div className="absolute inset-0 pointer-events-none opacity-50 bg-stone-300/30" />

      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, y, scale: scaleValue }}
        className="absolute w-[1600px] h-[1600px] cursor-grab active:cursor-grabbing origin-center"
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 1600 1600" 
          style={{ touchAction: 'none' }}
        >
          {/* SVG Definitions for City Sprite Patterns and Filters */}
          <defs>
            {/* 4 Quadrants of public/assets/city.jpg (1024x1024) */}
            {/* 左上：大型城池 (截取中間 360x360 視覺更置中) */}
            <pattern id="city-pattern-metropolis" patternUnits="objectBoundingBox" width="1" height="1" viewBox="76 76 360 360">
              <image href="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* 右上：商業城池 */}
            <pattern id="city-pattern-commercial" patternUnits="objectBoundingBox" width="1" height="1" viewBox="588 76 360 360">
              <image href="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* 左下：農業城池 */}
            <pattern id="city-pattern-agricultural" patternUnits="objectBoundingBox" width="1" height="1" viewBox="76 588 360 360">
              <image href="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* 右下：中型城池和邊界城池 */}
            <pattern id="city-pattern-midsized" patternUnits="objectBoundingBox" width="1" height="1" viewBox="588 588 360 360">
              <image href="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* Golden Glow Filter for Selection */}
            <filter id="city-selected-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#fbbf24" floodOpacity="0.95" />
            </filter>
            <filter id="city-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Clickable Background to clear selection */}
          <rect x="0" y="0" width="1600" height="1600" fill="transparent" onClick={() => onClearSelection && onClearSelection()} />

          {/* China Ink Wash Map Background */}
          <image 
            href={chinaMapBg} 
            x="0" 
            y="0" 
            width="1600" 
            height="1600" 
            preserveAspectRatio="none" 
            className="pointer-events-none opacity-95"
          />

          {/* Ancient Silk Map Decorative Border Frame */}
          <rect x="12" y="12" width="1576" height="1576" fill="none" stroke="#78350f" strokeWidth="5" strokeOpacity="0.4" rx="6" />
          <rect x="20" y="20" width="1560" height="1560" fill="none" stroke="#92400e" strokeWidth="2" strokeOpacity="0.3" rx="4" />

          {/* City & Pass Network Group */}
          <g id="map-network">
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

            {/* Historical Passes / Fortresses Layer */}
            <g id="pass-nodes" className="pointer-events-none">
              {[
                { name: '虎牢關', x: 885, y: 685 },
                { name: '函谷關', x: 800, y: 640 },
                { name: '潼關', x: 650, y: 640 },
                { name: '武關', x: 775, y: 745 },
                { name: '陽平關', x: 560, y: 700 },
                { name: '劍閣', x: 585, y: 795 },
              ].map(pass => (
                <g key={pass.name} transform={`translate(${pass.x}, ${pass.y})`}>
                  <rect x="-11" y="-11" width="22" height="22" fill="#b91c1c" stroke="#ffffff" strokeWidth="2" rx="3" />
                  <text 
                    x="0" 
                    y="-15" 
                    textAnchor="middle" 
                    fill="#ffffff" 
                    fontSize="15" 
                    className="font-serif font-black" 
                    stroke="#000000"
                    strokeWidth="3"
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    {pass.name}
                  </text>
                </g>
              ))}
            </g>
            
            {/* Draw city nodes with city.jpg custom pictorial sprites */}
            {sortedProvinces.map((p) => {
              const isSelected = p.id === selectedProvinceId;
              const pData = provincesData ? provincesData[p.id] : null;
              const rulerName = pData ? pData.rulerName : null;
              const fill = getRulerFill(rulerName, isSelected);
              const textContent = getRulerText(rulerName);
              const patternId = getCityPatternId(p.id);

              const citySize = isSelected ? 50 : 38;
              const halfSize = citySize / 2;
              const cornerRadius = isSelected ? 9 : 7;

              return (
                <g 
                  key={p.id} 
                  transform={`translate(${p.x}, ${p.y})`}
                  onClick={() => onSelectProvince(p.id)}
                  className="cursor-pointer"
                >
                  {/* Selected City Wave Effect (Yellow Highlight) */}
                  {isSelected && (
                    <>
                      <circle
                        r={44}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={2.5}
                        className="animate-ping opacity-60 pointer-events-none"
                      />
                      <circle
                        r={32}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        className="animate-ping opacity-80 pointer-events-none"
                        style={{ animationDelay: '0.15s' }}
                      />
                      {/* Golden Aura Halo */}
                      <rect
                        x={-halfSize - 4}
                        y={-halfSize - 4}
                        width={citySize + 8}
                        height={citySize + 8}
                        rx={cornerRadius + 2}
                        fill="#fbbf24"
                        fillOpacity={0.25}
                        stroke="#fbbf24"
                        strokeWidth={2}
                        className="animate-pulse pointer-events-none"
                      />
                    </>
                  )}

                  {/* Drop Shadow Base Plate */}
                  <rect
                    x={-halfSize}
                    y={-halfSize}
                    width={citySize}
                    height={citySize}
                    rx={cornerRadius}
                    fill="#000000"
                    filter="url(#city-shadow)"
                  />

                  {/* City Pictorial Icon (Filled with 4-quadrant city.jpg pattern) */}
                  <rect
                    x={-halfSize}
                    y={-halfSize}
                    width={citySize}
                    height={citySize}
                    rx={cornerRadius}
                    fill={`url(#${patternId})`}
                    className="transition-all duration-200"
                  />

                  {/* Outer Frame / Border: Golden if selected, Ruler/Stone tone if unselected */}
                  <rect
                    x={-halfSize}
                    y={-halfSize}
                    width={citySize}
                    height={citySize}
                    rx={cornerRadius}
                    fill="none"
                    stroke={isSelected ? '#fbbf24' : fill}
                    strokeWidth={isSelected ? 4.5 : 3.5}
                    filter={isSelected ? 'url(#city-selected-glow)' : undefined}
                    className="transition-all duration-200"
                  />

                  {/* City Name Label with high-contrast outline */}
                  <text
                    y={isSelected ? -halfSize - 7 : -halfSize - 6}
                    textAnchor="middle"
                    className={`font-serif transition-all duration-200 ${
                      isSelected ? 'font-black fill-yellow-300 text-[23px]' : 'font-black fill-white text-[17px]'
                    }`}
                    stroke="#000000"
                    strokeWidth={isSelected ? "4.5" : "3.5"}
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    {p.name}
                    {pData?.isAutonomous && (
                      <tspan fill="#f59e0b" fontSize={isSelected ? "17px" : "13px"} fontWeight="bold"> 治</tspan>
                    )}
                  </text>

                  {/* Ruler Faction Crest / Badge at bottom-right */}
                  <g transform={`translate(${halfSize - (isSelected ? 6 : 4)}, ${halfSize - (isSelected ? 6 : 4)})`}>
                    <circle
                      r={isSelected ? 11 : 8.5}
                      fill={fill}
                      stroke={isSelected ? '#fbbf24' : '#ffffff'}
                      strokeWidth={isSelected ? 2.5 : 2}
                      filter="url(#city-shadow)"
                    />
                    {textContent ? (
                      <text
                        y={isSelected ? 4 : 3}
                        textAnchor="middle"
                        className={`font-serif fill-white font-black ${isSelected ? 'text-[12px]' : 'text-[9.5px]'}`}
                        stroke="#000000"
                        strokeWidth="2"
                        style={{ paintOrder: 'stroke fill' }}
                      >
                        {textContent}
                      </text>
                    ) : (
                      <text
                        y={isSelected ? 3.5 : 2.5}
                        textAnchor="middle"
                        className={`font-serif fill-white font-black ${isSelected ? 'text-[10px]' : 'text-[8px]'}`}
                        stroke="#000000"
                        strokeWidth="1.5"
                        style={{ paintOrder: 'stroke fill' }}
                      >
                        {p.id}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </motion.div>

      {/* Translucent Zoom Controls Bar */}
      <div className="absolute right-3 bottom-3 flex flex-col items-center gap-1.5 z-10 p-1.5 rounded-full bg-stone-900/40 border border-amber-900/30 backdrop-blur-md shadow-lg">
        <button 
          onClick={handleZoomIn}
          title="放大地圖 (+)"
          className="w-10 h-10 bg-stone-900/50 hover:bg-stone-900/70 active:scale-95 text-amber-100/90 hover:text-amber-100 border border-amber-500/30 rounded-full flex items-center justify-center text-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          ＋
        </button>
        <button 
          onClick={handleZoomOut}
          title="縮小地圖 (-)"
          className="w-10 h-10 bg-stone-900/50 hover:bg-stone-900/70 active:scale-95 text-amber-100/90 hover:text-amber-100 border border-amber-500/30 rounded-full flex items-center justify-center text-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          －
        </button>
      </div>
    </div>
  );
}
