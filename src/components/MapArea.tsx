import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
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

  // 計算讓完整大地圖能全視角呈現在視區內的最小縮放比率（全景模式，看清整個三國大地圖全貌）
  const minScale = useMemo(() => {
    const safeW = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const safeH = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight - 140 : 600);
    const wRatio = safeW / MAP_BASE_SIZE;
    const hRatio = safeH / MAP_BASE_SIZE;
    const fitScale = Math.min(wRatio, hRatio);
    return Math.max(0.18, fitScale * 0.95);
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

  // 通用平滑縮放與平移函數
  const animateToTransform = useCallback((targetScale: number, targetX: number, targetY: number, duration = 0.22) => {
    const safeW = containerSize.width || 800;
    const safeH = containerSize.height || 600;
    const clampedScale = Math.min(3.0, Math.max(minScale, targetScale));

    const mapRenderedW = MAP_BASE_SIZE * clampedScale;
    const mapRenderedH = MAP_BASE_SIZE * clampedScale;

    // 允許地圖自由平移，確保角落與邊緣城池皆可平移置中呈現
    const maxDragX = (mapRenderedW / 2) + (safeW * 0.3);
    const maxDragY = (mapRenderedH / 2) + (safeH * 0.3);

    const clampedX = Math.min(maxDragX, Math.max(-maxDragX, targetX));
    const clampedY = Math.min(maxDragY, Math.max(-maxDragY, targetY));

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
  }, [containerSize, minScale, controls, x, y, scaleValue]);

  // 確保選中城池時精確置中
  useEffect(() => {
    const safeW = containerSize.width || 800;
    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const activeScale = scaleValue.get();
        const targetScale = Math.max(activeScale < 1.2 ? 1.45 : activeScale, minScale);
        const isMobile = safeW < 640;

        const targetX = (800 - selectedP.x) * targetScale;
        const targetY = (800 - selectedP.y) * targetScale - (isMobile ? 15 : 0);

        animateToTransform(targetScale, targetX, targetY, 0.25);
      }
    } else {
      let activeScale = scaleValue.get();
      if (activeScale < minScale) {
        activeScale = minScale;
      }
      animateToTransform(activeScale, x.get(), y.get(), 0.2);
    }
  }, [selectedProvinceId, containerSize, minScale, animateToTransform, x, y, scaleValue]);

  // 滑鼠滾輪順暢縮放 (Wheel Zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const activeScale = scaleValue.get();
      const newScale = Math.min(3.0, Math.max(minScale, activeScale * zoomFactor));

      if (Math.abs(newScale - activeScale) < 0.01) return;

      const scaleRatio = newScale / activeScale;
      const targetX = x.get() * scaleRatio;
      const targetY = y.get() * scaleRatio;

      animateToTransform(newScale, targetX, targetY, 0.12);
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
      const targetX = x.get() * scaleRatio;
      const targetY = y.get() * scaleRatio;

      x.set(targetX);
      y.set(targetY);
      scaleValue.set(newScale);
      setCurrentScale(newScale);
      controls.set({ x: targetX, y: targetY, scale: newScale });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // 將選中的城池渲染順序排在最後，確保其光圈與文字永遠在最上層
  const sortedProvinces = useMemo(() => {
    if (!selectedProvinceId) return provinces;
    return [...provinces].sort((a, b) => {
      if (a.id === selectedProvinceId) return 1;
      if (b.id === selectedProvinceId) return -1;
      return 0;
    });
  }, [selectedProvinceId]);

  // 約束拖拽範圍
  const mapRenderedWidth = MAP_BASE_SIZE * currentScale;
  const mapRenderedHeight = MAP_BASE_SIZE * currentScale;
  const safeW = containerSize.width || 800;
  const safeH = containerSize.height || 600;

  const maxDragX = (mapRenderedWidth / 2) + (safeW * 0.3);
  const maxDragY = (mapRenderedHeight / 2) + (safeH * 0.3);

  const dragConstraints = {
    left: -maxDragX,
    right: maxDragX,
    top: -maxDragY,
    bottom: maxDragY,
  };

  const applyZoom = (newScale: number) => {
    const activeScale = scaleValue.get();
    const clampedScale = Math.max(newScale, minScale);
    let targetX = x.get();
    let targetY = y.get();

    if (selectedProvinceId) {
      const selectedP = provinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const isMobile = safeW < 640;
        targetX = (800 - selectedP.x) * clampedScale;
        targetY = (800 - selectedP.y) * clampedScale - (isMobile ? 15 : 0);
      }
    } else {
      const scaleRatio = clampedScale / activeScale;
      targetX = targetX * scaleRatio;
      targetY = targetY * scaleRatio;
    }

    animateToTransform(clampedScale, targetX, targetY, 0.2);
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
            
            {/* Draw city nodes */}
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
                  {/* Selected City Wave Effect */}
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

                  {/* Outer Ring */}
                  <circle
                    r={isSelected ? 26 : 17}
                    fill="none"
                    stroke={isSelected ? '#fbbf24' : '#ffffff'}
                    strokeWidth={isSelected ? 5 : 2.5}
                    className="transition-all duration-200"
                  />

                  {/* Inner Ruler Color Circle */}
                  <circle
                    r={isSelected ? 21 : 14}
                    fill={fill}
                    stroke="#1c1917"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all duration-200"
                  />

                  {/* City Name Label with paint-order GPU outline */}
                  <text
                    y={isSelected ? -16 : -24}
                    textAnchor="middle"
                    className={`font-serif transition-all duration-200 ${
                      isSelected ? 'font-black fill-yellow-300 text-[23px]' : 'font-black fill-white text-[17px]'
                    }`}
                    stroke="#000000"
                    strokeWidth={isSelected ? "4" : "3"}
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    {p.name}
                  </text>

                  {/* Ruler Initial or Province ID */}
                  {textContent ? (
                    <text
                      y={isSelected ? 7 : 5}
                      textAnchor="middle"
                      className={`font-serif fill-white font-black ${isSelected ? 'text-[16px]' : 'text-[13px]'}`}
                      stroke="#000000"
                      strokeWidth="2.5"
                      style={{ paintOrder: 'stroke fill' }}
                    >
                      {textContent}
                    </text>
                  ) : (
                    <text
                      y={isSelected ? 6 : 4}
                      textAnchor="middle"
                      className={`font-serif fill-white font-black ${isSelected ? 'text-[14px]' : 'text-[11px]'}`}
                      stroke="#000000"
                      strokeWidth="2.5"
                      style={{ paintOrder: 'stroke fill' }}
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
