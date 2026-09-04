import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import { provinces } from '../data/provinces';
import { ProvinceState } from '../types';
import { PROVINCE_BASE_CONFIGS } from '../data/provinceBaseConfig';
import chinaMapBg from '../assets/images/china_map_bg_1787578499258.jpg';
import CityCoordinateEditorPanel from './CityCoordinateEditorPanel';
import { 
  loadStoredCityCoordinates, 
  saveStoredCityCoordinates, 
  loadStoredPassCoordinates, 
  saveStoredPassCoordinates,
  resetStoredCoordinates,
  DEFAULT_PASSES,
  CityCoordsMap,
  PassCoordsMap
} from '../utils/mapCoordinatesStorage';
import { MapPin, Sliders } from 'lucide-react';

// 座標調校系統開關（預設為 false 關閉，隨時可改為 true 重新開啟調校工具）
const ENABLE_COORDINATE_EDITOR = false;

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

// 根據都市類型與特定城市對應圖樣
const getCityPatternId = (provinceId: number): string => {
  const tier = PROVINCE_BASE_CONFIGS[provinceId]?.tier;

  // b. 小型城市 (FRONTIER) 套用 public/assets/city2.jpg 整張城市圖
  if (tier === 'FRONTIER') {
    return 'city-pattern-small';
  }

  // a. 中型城市 (MIDSIZED) 套用 public/assets/city.jpg 左下角圖案
  if (tier === 'MIDSIZED') {
    return 'city-pattern-midsized';
  }

  if (tier === 'METROPOLIS') return 'city-pattern-metropolis';     // 大型都市 (city.jpg 左上)
  if (tier === 'COMMERCIAL') return 'city-pattern-commercial';     // 商業都市 (city.jpg 右上)
  if (tier === 'AGRICULTURAL') return 'city-pattern-agricultural'; // 農業都市 (city.jpg 左下)

  // 預設為中型城市 (city.jpg 左下角)
  return 'city-pattern-midsized';
};

export default function MapArea({ selectedProvinceId, onSelectProvince, onClearSelection, provincesData }: MapAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleValue = useMotionValue(1);
  const [currentScale, setCurrentScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // 城市與關隘座標即時調整狀態
  const [cityCoords, setCityCoords] = useState<CityCoordsMap>(() => loadStoredCityCoordinates());
  const [passCoords, setPassCoords] = useState<PassCoordsMap>(() => loadStoredPassCoordinates());
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEditTarget, setSelectedEditTarget] = useState<{ type: 'city' | 'pass'; id: number | string } | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [draggingTarget, setDraggingTarget] = useState<{ type: 'city' | 'pass'; id: number | string } | null>(null);

  // 觸控雙指捏合縮放暫存
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);

  const MAP_BASE_SIZE = 1600;

  // 動態套用最新座標的城池清單
  const effectiveProvinces = useMemo(() => {
    return provinces.map(p => {
      const c = cityCoords[p.id];
      return {
        ...p,
        x: c ? c.x : p.x,
        y: c ? c.y : p.y,
      };
    });
  }, [cityCoords]);

  // 動態套用最新座標的關隘清單
  const effectivePasses = useMemo(() => {
    return DEFAULT_PASSES.map(p => {
      const c = passCoords[p.name];
      return {
        ...p,
        x: c ? c.x : p.x,
        y: c ? c.y : p.y,
      };
    });
  }, [passCoords]);

  // 計算永遠填滿視窗容器的最小縮放比率，確保畫面 100% 永遠被地圖完全覆蓋，絕不露出底圖
  const minScale = useMemo(() => {
    const safeW = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const safeH = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight - 120 : 600);
    const wRatio = safeW / MAP_BASE_SIZE;
    const hRatio = safeH / MAP_BASE_SIZE;
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
    if (selectedProvinceId && !isEditMode) {
      const selectedP = effectiveProvinces.find(p => p.id === selectedProvinceId);
      if (selectedP) {
        const activeScale = scaleValue.get();
        const targetScale = Math.max(activeScale < 1.2 ? 1.45 : activeScale, minScale);
        const isMobile = safeW < 640;

        const rawTargetX = (800 - selectedP.x) * targetScale;
        const rawTargetY = (800 - selectedP.y) * targetScale - (isMobile ? 15 : 0);

        animateToTransform(targetScale, rawTargetX, rawTargetY, 0.25);
      }
    }
  }, [selectedProvinceId, containerSize, minScale, animateToTransform, effectiveProvinces, isEditMode, scaleValue]);

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

  // 精準轉換螢幕座標至 1600x1600 SVG 地圖座標系統
  const convertScreenToSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return null;
    const svgP = pt.matrixTransform(screenCTM.inverse());
    return {
      x: Math.round(Math.max(0, Math.min(1600, svgP.x))),
      y: Math.round(Math.max(0, Math.min(1600, svgP.y)))
    };
  }, []);

  // 座標微調回調函數
  const handleChangeCityCoord = useCallback((cityId: number, newX: number, newY: number) => {
    setCityCoords(prev => {
      const next = { ...prev, [cityId]: { x: newX, y: newY } };
      saveStoredCityCoordinates(next);
      return next;
    });
  }, []);

  const handleChangePassCoord = useCallback((passName: string, newX: number, newY: number) => {
    setPassCoords(prev => {
      const next = { ...prev, [passName]: { x: newX, y: newY } };
      saveStoredPassCoordinates(next);
      return next;
    });
  }, []);

  // 全局批次平移全體城池與關隘
  const handleBatchShift = useCallback((dx: number, dy: number) => {
    setCityCoords(prev => {
      const next: CityCoordsMap = {};
      effectiveProvinces.forEach(p => {
        const cur = prev[p.id] || { x: p.x, y: p.y };
        next[p.id] = {
          x: Math.round(Math.max(0, Math.min(1600, cur.x + dx))),
          y: Math.round(Math.max(0, Math.min(1600, cur.y + dy)))
        };
      });
      saveStoredCityCoordinates(next);
      return next;
    });

    setPassCoords(prev => {
      const next: PassCoordsMap = {};
      effectivePasses.forEach(p => {
        const cur = prev[p.name] || { x: p.x, y: p.y };
        next[p.name] = {
          x: Math.round(Math.max(0, Math.min(1600, cur.x + dx))),
          y: Math.round(Math.max(0, Math.min(1600, cur.y + dy)))
        };
      });
      saveStoredPassCoordinates(next);
      return next;
    });
  }, [effectiveProvinces, effectivePasses]);

  // 視角聚焦指定座標
  const handleFocusTarget = useCallback((targetX: number, targetY: number) => {
    const activeScale = scaleValue.get();
    const targetScale = Math.max(activeScale < 1.3 ? 1.5 : activeScale, minScale);
    const rawTargetX = (800 - targetX) * targetScale;
    const rawTargetY = (800 - targetY) * targetScale;
    animateToTransform(targetScale, rawTargetX, rawTargetY, 0.25);
  }, [scaleValue, minScale, animateToTransform]);

  // 全部重設為預設座標
  const handleResetAll = useCallback(() => {
    const { cities, passes } = resetStoredCoordinates();
    setCityCoords(cities);
    setPassCoords(passes);
  }, []);

  // 匯入 JSON 座標備份
  const handleImportJson = useCallback((jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data && typeof data === 'object') {
        const newCities: CityCoordsMap = {};
        if (Array.isArray(data.cities)) {
          data.cities.forEach((c: { id: number; x: number; y: number }) => {
            if (typeof c.id === 'number' && typeof c.x === 'number' && typeof c.y === 'number') {
              newCities[c.id] = { x: c.x, y: c.y };
            }
          });
        }
        const newPasses: PassCoordsMap = {};
        if (Array.isArray(data.passes)) {
          data.passes.forEach((p: { name: string; x: number; y: number }) => {
            if (typeof p.name === 'string' && typeof p.x === 'number' && typeof p.y === 'number') {
              newPasses[p.name] = { x: p.x, y: p.y };
            }
          });
        }

        if (Object.keys(newCities).length > 0) {
          setCityCoords(newCities);
          saveStoredCityCoordinates(newCities);
        }
        if (Object.keys(newPasses).length > 0) {
          setPassCoords(newPasses);
          saveStoredPassCoordinates(newPasses);
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to parse import JSON', e);
    }
    return false;
  }, []);

  // 滑鼠/觸控在地圖上直接拖曳城池或關隘
  useEffect(() => {
    if (!draggingTarget || !isEditMode) return;

    const handlePointerMove = (e: PointerEvent) => {
      const svgPos = convertScreenToSvgCoords(e.clientX, e.clientY);
      if (!svgPos) return;

      if (draggingTarget.type === 'city') {
        handleChangeCityCoord(draggingTarget.id as number, svgPos.x, svgPos.y);
      } else {
        handleChangePassCoord(draggingTarget.id as string, svgPos.x, svgPos.y);
      }
    };

    const handlePointerUp = () => {
      setDraggingTarget(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingTarget, isEditMode, convertScreenToSvgCoords, handleChangeCityCoord, handleChangePassCoord]);

  // 將選中的城池渲染順序排在最後，確保其光圈與文字永遠在最上層
  const sortedProvinces = useMemo(() => {
    if (!selectedProvinceId && !selectedEditTarget) return effectiveProvinces;
    const highlightId = selectedEditTarget?.type === 'city' 
      ? Number(selectedEditTarget.id) 
      : selectedProvinceId;

    return [...effectiveProvinces].sort((a, b) => {
      if (a.id === highlightId) return 1;
      if (b.id === highlightId) return -1;
      return 0;
    });
  }, [effectiveProvinces, selectedProvinceId, selectedEditTarget]);

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

    if (selectedProvinceId && !isEditMode) {
      const selectedP = effectiveProvinces.find(p => p.id === selectedProvinceId);
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
        drag={!draggingTarget} // 當直接拖曳節點時暫停地圖平移
        dragConstraints={dragConstraints}
        dragElastic={0}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, y, scale: scaleValue }}
        className={`absolute w-[1600px] h-[1600px] origin-center ${
          draggingTarget ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox="0 0 1600 1600" 
          style={{ touchAction: 'none' }}
        >
          {/* SVG Definitions for City Sprite Patterns and Filters */}
          <defs>
            {/* 4 Quadrants of public/assets/city.jpg (1024x1024) */}
            {/* 大型都市 (Top-Left, Q1) */}
            <pattern id="city-pattern-metropolis" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 20 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* 商業都市 (Top-Right, Q2) */}
            <pattern id="city-pattern-commercial" patternUnits="objectBoundingBox" width="1" height="1" viewBox="532 20 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* 農業都市 (Bottom-Left, Q3) */}
            <pattern id="city-pattern-agricultural" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* a. 中型城市套用 public/assets/city.jpg 左下角圖案 (Bottom-Left, Q3 - 精準置中) */}
            <pattern id="city-pattern-midsized" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>

            {/* b. 小型城市套用 public/assets/city2.jpg (整張城市圖 - 精準全圖置中) */}
            <pattern id="city-pattern-frontier" patternUnits="objectBoundingBox" width="1" height="1" viewBox="0 0 1024 1024">
              <image href="./assets/city2.jpg" xlinkHref="./assets/city2.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid slice" />
            </pattern>
            <pattern id="city-pattern-small" patternUnits="objectBoundingBox" width="1" height="1" viewBox="0 0 1024 1024">
              <image href="./assets/city2.jpg" xlinkHref="./assets/city2.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid slice" />
            </pattern>

            {/* 備用異域模式 (city3.jpg) */}
            <pattern id="city-pattern-special-26" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>
            <pattern id="city-pattern-special-42" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>
            <pattern id="city-pattern-special-40" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>
            <pattern id="city-pattern-special-20" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
            </pattern>
            <pattern id="city-pattern-special-frontier" patternUnits="objectBoundingBox" width="1" height="1" viewBox="20 532 472 472">
              <image href="./assets/city.jpg" xlinkHref="./assets/city.jpg" x="0" y="0" width="1024" height="1024" preserveAspectRatio="none" />
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
          <rect 
            x="0" 
            y="0" 
            width="1600" 
            height="1600" 
            fill="transparent" 
            onClick={() => {
              if (!isEditMode && onClearSelection) {
                onClearSelection();
              }
            }} 
          />

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

          {/* Coordinate Auxiliary Grid (When Show Grid is Enabled) */}
          {showGrid && (
            <g id="map-grid-overlay" className="pointer-events-none opacity-70">
              {/* Minor Grid Lines: every 50px */}
              {Array.from({ length: 33 }).map((_, i) => (
                <React.Fragment key={`minor-grid-${i}`}>
                  <line x1={i * 50} y1={0} x2={i * 50} y2={1600} stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="3 3" strokeOpacity="0.35" />
                  <line x1={0} y1={i * 50} x2={1600} y2={i * 50} stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="3 3" strokeOpacity="0.35" />
                </React.Fragment>
              ))}

              {/* Major Grid Lines: every 100px with axis coordinates */}
              {Array.from({ length: 17 }).map((_, i) => (
                <React.Fragment key={`major-grid-${i}`}>
                  <line x1={i * 100} y1={0} x2={i * 100} y2={1600} stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1={0} y1={i * 100} x2={1600} y2={i * 100} stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.6" />
                  {i > 0 && i < 16 && (
                    <>
                      <text x={i * 100 + 4} y="22" fill="#1e3a8a" fontSize="13" className="font-mono font-bold">{i * 100}</text>
                      <text x="6" y={i * 100 + 16} fill="#1e3a8a" fontSize="13" className="font-mono font-bold">{i * 100}</text>
                    </>
                  )}
                </React.Fragment>
              ))}
            </g>
          )}

          {/* City & Pass Network Group */}
          <g id="map-network">
            {/* Draw connection lines: Dark backdrop line + Bold White main line */}
            {effectiveProvinces.map((p) =>
              p.connections.map((targetId) => {
                if (targetId > p.id) { // Avoid drawing double lines
                  const target = effectiveProvinces.find((t) => t.id === targetId);
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
            <g id="pass-nodes">
              {effectivePasses.map(pass => {
                const isSelectedPass = isEditMode && selectedEditTarget?.type === 'pass' && selectedEditTarget.id === pass.name;
                return (
                  <g 
                    key={pass.name} 
                    transform={`translate(${pass.x}, ${pass.y})`}
                    className={isEditMode ? 'cursor-move' : 'pointer-events-none'}
                    onPointerDown={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        setSelectedEditTarget({ type: 'pass', id: pass.name });
                        setDraggingTarget({ type: 'pass', id: pass.name });
                      }
                    }}
                  >
                    {/* Pass Selected Aura */}
                    {isSelectedPass && (
                      <circle
                        r={24}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth={3}
                        className="animate-ping opacity-80"
                      />
                    )}

                    <rect 
                      x="-11" 
                      y="-11" 
                      width="22" 
                      height="22" 
                      fill={isSelectedPass ? '#f59e0b' : '#b91c1c'} 
                      stroke={isSelectedPass ? '#fbbf24' : '#ffffff'} 
                      strokeWidth={isSelectedPass ? 3 : 2} 
                      rx="3" 
                    />
                    
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

                    {/* Coordinate Tag in Edit Mode */}
                    {(isEditMode && (showLabels || isSelectedPass)) && (
                      <g transform="translate(0, 20)">
                        <rect x="-36" y="-7" width="72" height="15" rx="3" fill="#000000" fillOpacity="0.85" stroke="#fbbf24" strokeWidth="1" />
                        <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="10" className="font-mono font-bold">
                          {pass.x},{pass.y}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
            
            {/* Draw city nodes with custom pictorial sprites */}
            {sortedProvinces.map((p) => {
              const isSelected = p.id === selectedProvinceId;
              const isTargetingInEdit = isEditMode && selectedEditTarget?.type === 'city' && selectedEditTarget.id === p.id;
              const pData = provincesData ? provincesData[p.id] : null;
              const rulerName = pData ? pData.rulerName : null;
              const fill = getRulerFill(rulerName, isSelected);
              const textContent = getRulerText(rulerName);
              const patternId = getCityPatternId(p.id);

              const citySize = isSelected || isTargetingInEdit ? 50 : 38;
              const halfSize = citySize / 2;
              const cornerRadius = isSelected || isTargetingInEdit ? 9 : 7;

              return (
                <g 
                  key={p.id} 
                  transform={`translate(${p.x}, ${p.y})`}
                  onPointerDown={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      setSelectedEditTarget({ type: 'city', id: p.id });
                      setDraggingTarget({ type: 'city', id: p.id });
                    }
                  }}
                  onClick={() => {
                    if (isEditMode) {
                      setSelectedEditTarget({ type: 'city', id: p.id });
                    } else {
                      onSelectProvince(p.id);
                    }
                  }}
                  className={isEditMode ? 'cursor-move' : 'cursor-pointer'}
                >
                  {/* Selected City Wave Effect (Yellow Highlight) */}
                  {(isSelected || isTargetingInEdit) && (
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
                    stroke={isSelected || isTargetingInEdit ? '#fbbf24' : fill}
                    strokeWidth={isSelected || isTargetingInEdit ? 4.5 : 3.5}
                    filter={isSelected || isTargetingInEdit ? 'url(#city-selected-glow)' : undefined}
                    className="transition-all duration-200"
                  />

                  {/* City Name Label with high-contrast outline */}
                  <text
                    y={isSelected || isTargetingInEdit ? -halfSize - 7 : -halfSize - 6}
                    textAnchor="middle"
                    className={`font-serif transition-all duration-200 ${
                      isSelected || isTargetingInEdit ? 'font-black fill-yellow-300 text-[23px]' : 'font-black fill-white text-[17px]'
                    }`}
                    stroke="#000000"
                    strokeWidth={isSelected || isTargetingInEdit ? "4.5" : "3.5"}
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    {p.name}
                    {pData?.isAutonomous && (
                      <tspan fill="#f59e0b" fontSize={isSelected ? "17px" : "13px"} fontWeight="bold"> 治</tspan>
                    )}
                  </text>

                  {/* Ruler Faction Crest / Badge at bottom-right */}
                  <g transform={`translate(${halfSize - (isSelected || isTargetingInEdit ? 6 : 4)}, ${halfSize - (isSelected || isTargetingInEdit ? 6 : 4)})`}>
                    <circle
                      r={isSelected || isTargetingInEdit ? 11 : 8.5}
                      fill={fill}
                      stroke={isSelected || isTargetingInEdit ? '#fbbf24' : '#ffffff'}
                      strokeWidth={isSelected || isTargetingInEdit ? 2.5 : 2}
                      filter="url(#city-shadow)"
                    />
                    {textContent ? (
                      <text
                        y={isSelected || isTargetingInEdit ? 4 : 3}
                        textAnchor="middle"
                        className={`font-serif fill-white font-black ${isSelected || isTargetingInEdit ? 'text-[12px]' : 'text-[9.5px]'}`}
                        stroke="#000000"
                        strokeWidth="2"
                        style={{ paintOrder: 'stroke fill' }}
                      >
                        {textContent}
                      </text>
                    ) : (
                      <text
                        y={isSelected || isTargetingInEdit ? 3.5 : 2.5}
                        textAnchor="middle"
                        className={`font-serif fill-white font-black ${isSelected || isTargetingInEdit ? 'text-[10px]' : 'text-[8px]'}`}
                        stroke="#000000"
                        strokeWidth="1.5"
                        style={{ paintOrder: 'stroke fill' }}
                      >
                        {p.id}
                      </text>
                    )}
                  </g>

                  {/* Coordinate Tag in Edit Mode */}
                  {(isEditMode && (showLabels || isTargetingInEdit)) && (
                    <g transform={`translate(0, ${halfSize + 16})`}>
                      <rect x="-36" y="-7" width="72" height="15" rx="3" fill="#000000" fillOpacity="0.85" stroke="#fbbf24" strokeWidth="1" />
                      <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="10" className="font-mono font-bold">
                        {p.x},{p.y}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </motion.div>

      {/* Floating Coordinate Editor Panel (When Edit Mode is ON) */}
      {ENABLE_COORDINATE_EDITOR && isEditMode && (
        <CityCoordinateEditorPanel
          cityCoords={cityCoords}
          passCoords={passCoords}
          selectedTarget={selectedEditTarget}
          onSelectTarget={setSelectedEditTarget}
          onChangeCityCoord={handleChangeCityCoord}
          onChangePassCoord={handleChangePassCoord}
          onBatchShift={handleBatchShift}
          onFocusTarget={handleFocusTarget}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels(!showLabels)}
          onResetAll={handleResetAll}
          onImportJson={handleImportJson}
          onClose={() => setIsEditMode(false)}
        />
      )}

      {/* Translucent Controls Bar (Bottom Right) */}
      <div className="absolute right-3 bottom-3 flex flex-col items-center gap-1.5 z-30 p-1.5 rounded-2xl bg-stone-900/60 border border-amber-900/40 backdrop-blur-md shadow-2xl">
        {/* Toggle Coordinate Adjust Mode Button (僅在 ENABLE_COORDINATE_EDITOR 開啟時顯示) */}
        {ENABLE_COORDINATE_EDITOR && (
          <>
            <button 
              onClick={() => {
                const nextState = !isEditMode;
                setIsEditMode(nextState);
                if (nextState && selectedProvinceId) {
                  setSelectedEditTarget({ type: 'city', id: selectedProvinceId });
                }
              }}
              title={isEditMode ? '關閉座標調整模式' : '開啟城市座標調整模式'}
              className={`px-2.5 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-md ${
                isEditMode
                  ? 'bg-amber-500 text-stone-950 border border-amber-300 ring-2 ring-amber-400/50 scale-105'
                  : 'bg-stone-900/80 hover:bg-stone-800 text-amber-200 border border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditMode ? '完成調校' : '調整座標'}</span>
            </button>
            <div className="w-full h-px bg-stone-700/60 my-0.5" />
          </>
        )}

        <button 
          onClick={handleZoomIn}
          title="放大地圖 (+)"
          className="w-10 h-10 bg-stone-900/50 hover:bg-stone-900/80 active:scale-95 text-amber-100/90 hover:text-amber-100 border border-amber-500/30 rounded-full flex items-center justify-center text-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          ＋
        </button>
        <button 
          onClick={handleZoomOut}
          title="縮小地圖 (-)"
          className="w-10 h-10 bg-stone-900/50 hover:bg-stone-900/80 active:scale-95 text-amber-100/90 hover:text-amber-100 border border-amber-500/30 rounded-full flex items-center justify-center text-xl font-bold transition-all cursor-pointer shadow-sm"
        >
          －
        </button>
      </div>
    </div>
  );
}

