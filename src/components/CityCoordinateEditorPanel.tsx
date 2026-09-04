import React, { useState, useMemo } from 'react';
import { provinces } from '../data/provinces';
import { 
  CityCoordsMap, 
  PassCoordsMap, 
  DEFAULT_PASSES,
  generateProvincesTsCode, 
  generateCoordinatesExportJson,
  resetStoredCoordinates 
} from '../utils/mapCoordinatesStorage';
import { 
  Crosshair, 
  Sliders, 
  Copy, 
  Check, 
  RotateCcw, 
  Grid, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Download, 
  Upload, 
  Move,
  Eye,
  Info,
  Layers
} from 'lucide-react';

interface CityCoordinateEditorPanelProps {
  cityCoords: CityCoordsMap;
  passCoords: PassCoordsMap;
  selectedTarget: { type: 'city' | 'pass'; id: number | string } | null;
  onSelectTarget: (target: { type: 'city' | 'pass'; id: number | string } | null) => void;
  onChangeCityCoord: (cityId: number, x: number, y: number) => void;
  onChangePassCoord: (passName: string, x: number, y: number) => void;
  onBatchShift: (dx: number, dy: number) => void;
  onFocusTarget: (x: number, y: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  onResetAll: () => void;
  onImportJson: (jsonStr: string) => boolean;
  onClose: () => void;
}

export default function CityCoordinateEditorPanel({
  cityCoords,
  passCoords,
  selectedTarget,
  onSelectTarget,
  onChangeCityCoord,
  onChangePassCoord,
  onBatchShift,
  onFocusTarget,
  showGrid,
  onToggleGrid,
  showLabels,
  onToggleLabels,
  onResetAll,
  onImportJson,
  onClose
}: CityCoordinateEditorPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'export'>('single');
  const [copiedType, setCopiedType] = useState<'ts' | 'json' | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Group cities by region for easier navigation
  const citiesByRegion = useMemo(() => {
    const map = new Map<string, typeof provinces>();
    provinces.forEach(p => {
      const list = map.get(p.region) || [];
      list.push(p);
      map.set(p.region, list);
    });
    return Array.from(map.entries());
  }, []);

  // Determine current active coordinates
  const currentCoords = useMemo(() => {
    if (!selectedTarget) return null;
    if (selectedTarget.type === 'city') {
      const id = selectedTarget.id as number;
      const original = provinces.find(p => p.id === id);
      const coord = cityCoords[id] || { x: original?.x || 0, y: original?.y || 0 };
      return {
        name: original?.name || `城池 ${id}`,
        sub: original?.region || '州郡',
        x: coord.x,
        y: coord.y,
        origX: original?.x || 0,
        origY: original?.y || 0,
      };
    } else {
      const name = selectedTarget.id as string;
      const original = DEFAULT_PASSES.find(p => p.name === name);
      const coord = passCoords[name] || { x: original?.x || 0, y: original?.y || 0 };
      return {
        name,
        sub: '重要關隘',
        x: coord.x,
        y: coord.y,
        origX: original?.x || 0,
        origY: original?.y || 0,
      };
    }
  }, [selectedTarget, cityCoords, passCoords]);

  const handleUpdateX = (delta: number) => {
    if (!selectedTarget || !currentCoords) return;
    const newX = Math.round(Math.max(0, Math.min(1600, currentCoords.x + delta)));
    if (selectedTarget.type === 'city') {
      onChangeCityCoord(selectedTarget.id as number, newX, currentCoords.y);
    } else {
      onChangePassCoord(selectedTarget.id as string, newX, currentCoords.y);
    }
  };

  const handleUpdateY = (delta: number) => {
    if (!selectedTarget || !currentCoords) return;
    const newY = Math.round(Math.max(0, Math.min(1600, currentCoords.y + delta)));
    if (selectedTarget.type === 'city') {
      onChangeCityCoord(selectedTarget.id as number, currentCoords.x, newY);
    } else {
      onChangePassCoord(selectedTarget.id as string, currentCoords.x, newY);
    }
  };

  const handleSetDirectCoord = (newX: number, newY: number) => {
    if (!selectedTarget) return;
    const clampedX = Math.round(Math.max(0, Math.min(1600, newX)));
    const clampedY = Math.round(Math.max(0, Math.min(1600, newY)));
    if (selectedTarget.type === 'city') {
      onChangeCityCoord(selectedTarget.id as number, clampedX, clampedY);
    } else {
      onChangePassCoord(selectedTarget.id as string, clampedX, clampedY);
    }
  };

  const handleResetCurrent = () => {
    if (!selectedTarget || !currentCoords) return;
    handleSetDirectCoord(currentCoords.origX, currentCoords.origY);
  };

  const copyToClipboard = async (text: string, type: 'ts' | 'json') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = generateCoordinatesExportJson(cityCoords, passCoords);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanguo_map_coords_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = () => {
    setImportError(null);
    if (!importText.trim()) {
      setImportError('請貼上有效的 JSON 座標資料');
      return;
    }
    const success = onImportJson(importText);
    if (success) {
      setShowImportModal(false);
      setImportText('');
    } else {
      setImportError('JSON 格式錯誤或無效，請確認資料結構');
    }
  };

  return (
    <>
      <div className="fixed bottom-3 left-3 z-40 max-w-[94vw] sm:max-w-[420px] w-full bg-stone-900/95 border border-amber-600/60 rounded-xl shadow-2xl backdrop-blur-md text-amber-50 text-xs overflow-hidden font-sans select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/80 border-b border-amber-600/40">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-amber-200 text-sm tracking-wide flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              城市地圖座標調校
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-stone-400 hover:text-amber-200 hover:bg-stone-800/80 rounded transition-colors"
              title={isMinimized ? '展開面板' : '收折面板'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-red-300 hover:bg-stone-800/80 rounded transition-colors ml-1"
              title="關閉座標調整模式"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Minimized Quick Info Bar */}
        {isMinimized && (
          <div className="px-3 py-2 flex items-center justify-between bg-stone-900/90 text-stone-300">
            <span className="truncate max-w-[180px]">
              {currentCoords ? `${currentCoords.name} (X:${currentCoords.x}, Y:${currentCoords.y})` : '在地圖上點擊或拖曳城池'}
            </span>
            <button
              onClick={() => setIsMinimized(false)}
              className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded border border-amber-500/40 font-medium text-[11px]"
            >
              展開調整
            </button>
          </div>
        )}

        {/* Full Controls Body */}
        {!isMinimized && (
          <div className="p-3 flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto">
            {/* Mode / Tabs Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-stone-950/70 p-1 rounded-lg border border-stone-800">
              <button
                onClick={() => setActiveTab('single')}
                className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'single'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                單點精調
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'batch'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                全局平移
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 transition-all ${
                  activeTab === 'export'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-amber-200'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                代碼導出
              </button>
            </div>

            {/* View Assist Tools Bar */}
            <div className="flex items-center justify-between bg-stone-950/50 px-2.5 py-1.5 rounded-lg border border-stone-800/80">
              <span className="text-stone-400 text-[11px] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                視覺輔助：
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleGrid}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-all ${
                    showGrid 
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/60' 
                      : 'bg-stone-800/60 text-stone-400 border-stone-700'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  網格 ({showGrid ? '開' : '關'})
                </button>
                <button
                  onClick={onToggleLabels}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border transition-all ${
                    showLabels 
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/60' 
                      : 'bg-stone-800/60 text-stone-400 border-stone-700'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  座標標籤 ({showLabels ? '開' : '關'})
                </button>
              </div>
            </div>

            {/* TAB 1: Single Node Adjustment */}
            {activeTab === 'single' && (
              <div className="flex flex-col gap-2.5">
                {/* Target Selector Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-stone-400 font-medium">選擇城池或關隘：</label>
                  <select
                    value={
                      selectedTarget
                        ? `${selectedTarget.type}:${selectedTarget.id}`
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        onSelectTarget(null);
                        return;
                      }
                      const [type, idStr] = val.split(':');
                      if (type === 'city') {
                        const cityId = Number(idStr);
                        onSelectTarget({ type: 'city', id: cityId });
                        const c = cityCoords[cityId];
                        if (c) onFocusTarget(c.x, c.y);
                      } else {
                        onSelectTarget({ type: 'pass', id: idStr });
                        const p = passCoords[idStr];
                        if (p) onFocusTarget(p.x, p.y);
                      }
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-amber-100 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- 請選擇或直接在地圖點選/拖曳 --</option>
                    
                    <optgroup label="🏯 重要關隘 (6)">
                      {DEFAULT_PASSES.map(pass => (
                        <option key={`pass:${pass.name}`} value={`pass:${pass.name}`}>
                          🚩 {pass.name} (X: {passCoords[pass.name]?.x ?? pass.x}, Y: {passCoords[pass.name]?.y ?? pass.y})
                        </option>
                      ))}
                    </optgroup>

                    {citiesByRegion.map(([region, cityList]) => (
                      <optgroup key={region} label={`🗺️ ${region} (${cityList.length})`}>
                        {cityList.map(c => (
                          <option key={`city:${c.id}`} value={`city:${c.id}`}>
                            {c.name} (X: {cityCoords[c.id]?.x ?? c.x}, Y: {cityCoords[c.id]?.y ?? c.y})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Target Active Status Card */}
                {currentCoords ? (
                  <div className="bg-stone-950/80 p-3 rounded-lg border border-amber-900/50 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300 text-sm">{currentCoords.name}</span>
                        <span className="px-1.5 py-0.5 bg-stone-800 text-stone-400 rounded text-[10px]">
                          {currentCoords.sub}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onFocusTarget(currentCoords.x, currentCoords.y)}
                          className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded border border-amber-500/40 flex items-center gap-1 text-[11px] transition-colors"
                          title="置中地圖視角至此位置"
                        >
                          <Crosshair className="w-3 h-3" />
                          視角置中
                        </button>
                        <button
                          onClick={handleResetCurrent}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 flex items-center gap-1 text-[11px] transition-colors"
                          title="重設回預設座標"
                        >
                          <RotateCcw className="w-3 h-3" />
                          重設
                        </button>
                      </div>
                    </div>

                    {/* X Coordinate Stepper */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-stone-300">
                        <span className="font-medium text-amber-400">X 橫向座標 (0 ~ 1600)：</span>
                        <span className="font-mono font-bold text-amber-200 text-sm">{currentCoords.x}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateX(-50)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -50
                        </button>
                        <button
                          onClick={() => handleUpdateX(-10)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleUpdateX(-1)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          value={currentCoords.x}
                          onChange={(e) => handleSetDirectCoord(Number(e.target.value) || 0, currentCoords.y)}
                          className="w-16 bg-stone-900 border border-amber-600/50 rounded px-1.5 py-1 text-center font-mono font-bold text-amber-100 text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleUpdateX(1)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleUpdateX(10)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleUpdateX(50)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +50
                        </button>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1600"
                        value={currentCoords.x}
                        onChange={(e) => handleSetDirectCoord(Number(e.target.value), currentCoords.y)}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Y Coordinate Stepper */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-stone-300">
                        <span className="font-medium text-amber-400">Y 縱向座標 (0 ~ 1600)：</span>
                        <span className="font-mono font-bold text-amber-200 text-sm">{currentCoords.y}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateY(-50)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -50
                        </button>
                        <button
                          onClick={() => handleUpdateY(-10)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleUpdateY(-1)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          value={currentCoords.y}
                          onChange={(e) => handleSetDirectCoord(currentCoords.x, Number(e.target.value) || 0)}
                          className="w-16 bg-stone-900 border border-amber-600/50 rounded px-1.5 py-1 text-center font-mono font-bold text-amber-100 text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleUpdateY(1)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleUpdateY(10)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleUpdateY(50)}
                          className="flex-1 py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded border border-stone-700 font-mono text-[11px]"
                        >
                          +50
                        </button>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1600"
                        value={currentCoords.y}
                        onChange={(e) => handleSetDirectCoord(currentCoords.x, Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-stone-950/60 rounded-lg border border-dashed border-stone-800 text-center text-stone-400 flex flex-col items-center gap-1.5">
                    <Info className="w-5 h-5 text-amber-400" />
                    <span>提示：直接在地圖上<strong>點擊</strong>或<strong>拖曳</strong>任一城池/關隘即可即時調整！</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Batch Global Shift */}
            {activeTab === 'batch' && (
              <div className="flex flex-col gap-2.5 bg-stone-950/80 p-3 rounded-lg border border-stone-800">
                <div className="text-stone-300 text-xs leading-relaxed">
                  整體平移（將全體 43 個城池與 6 個關隘統一移動，適合校對底圖偏差）：
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div />
                  <button
                    onClick={() => onBatchShift(0, -10)}
                    className="py-2 bg-stone-800 hover:bg-amber-700/60 text-amber-100 rounded border border-stone-700 font-bold flex flex-col items-center"
                  >
                    <span>▲ 往上</span>
                    <span className="text-[10px] text-stone-400 font-normal">Y -10</span>
                  </button>
                  <div />

                  <button
                    onClick={() => onBatchShift(-10, 0)}
                    className="py-2 bg-stone-800 hover:bg-amber-700/60 text-amber-100 rounded border border-stone-700 font-bold flex flex-col items-center"
                  >
                    <span>◀ 往左</span>
                    <span className="text-[10px] text-stone-400 font-normal">X -10</span>
                  </button>

                  <button
                    onClick={() => onBatchShift(0, 0)}
                    className="py-2 bg-stone-900 text-stone-400 rounded border border-stone-800 text-[10px] flex items-center justify-center font-mono"
                  >
                    微調 (10px)
                  </button>

                  <button
                    onClick={() => onBatchShift(10, 0)}
                    className="py-2 bg-stone-800 hover:bg-amber-700/60 text-amber-100 rounded border border-stone-700 font-bold flex flex-col items-center"
                  >
                    <span>▶ 往右</span>
                    <span className="text-[10px] text-stone-400 font-normal">X +10</span>
                  </button>

                  <div />
                  <button
                    onClick={() => onBatchShift(0, 10)}
                    className="py-2 bg-stone-800 hover:bg-amber-700/60 text-amber-100 rounded border border-stone-700 font-bold flex flex-col items-center"
                  >
                    <span>▼ 往下</span>
                    <span className="text-[10px] text-stone-400 font-normal">Y +10</span>
                  </button>
                  <div />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onBatchShift(-5, 0)}
                    className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 text-[11px]"
                  >
                    左微移 5px
                  </button>
                  <button
                    onClick={() => onBatchShift(5, 0)}
                    className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 text-[11px]"
                  >
                    右微移 5px
                  </button>
                  <button
                    onClick={() => onBatchShift(0, -5)}
                    className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 text-[11px]"
                  >
                    上微移 5px
                  </button>
                  <button
                    onClick={() => onBatchShift(0, 5)}
                    className="flex-1 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 text-[11px]"
                  >
                    下微移 5px
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Export & Backup */}
            {activeTab === 'export' && (
              <div className="flex flex-col gap-2.5 bg-stone-950/80 p-3 rounded-lg border border-stone-800">
                <div className="text-stone-300 text-xs">
                  完成座標調校後，可一鍵複製代碼或備份：
                </div>

                <button
                  onClick={() => {
                    const code = generateProvincesTsCode(cityCoords);
                    copyToClipboard(code, 'ts');
                  }}
                  className="w-full py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-bold rounded-lg border border-amber-400 flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                >
                  {copiedType === 'ts' ? (
                    <>
                      <Check className="w-4 h-4 text-stone-950" />
                      已複製 provinces.ts 程式碼！
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-950" />
                      複製完整 provinces.ts 程式碼
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const json = generateCoordinatesExportJson(cityCoords, passCoords);
                      copyToClipboard(json, 'json');
                    }}
                    className="py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 rounded border border-stone-700 flex items-center justify-center gap-1 font-medium transition-colors"
                  >
                    {copiedType === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    複製 JSON
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 rounded border border-stone-700 flex items-center justify-center gap-1 font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下載 JSON
                  </button>
                </div>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded border border-stone-800 flex items-center justify-center gap-1 font-medium transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  匯入 JSON 座標備份
                </button>
              </div>
            )}

            {/* Bottom Global Reset Action */}
            <div className="pt-1 border-t border-stone-800/80 flex items-center justify-between text-stone-400">
              <span className="text-[10px]">自動即時存檔至 LocalStorage</span>
              <button
                onClick={() => {
                  if (window.confirm('確定要將所有城池與關隘座標恢復為初始預設值嗎？')) {
                    onResetAll();
                  }
                }}
                className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                全部重設為預設值
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-600/60 rounded-xl p-4 max-w-lg w-full text-amber-50 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-400" />
                匯入座標 JSON 資料
              </span>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <p className="text-stone-300 text-xs">
              請在此貼上先前導出的 JSON 座標資料（包含 cities 與 passes）：
            </p>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="{\n  &quot;cities&quot;: [...],\n  &quot;passes&quot;: [...]\n}"
              className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2.5 font-mono text-xs text-amber-100 focus:outline-none focus:border-amber-500"
            />

            {importError && (
              <div className="text-red-400 text-xs bg-red-950/50 p-2 rounded border border-red-900">
                ⚠️ {importError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs"
              >
                取消
              </button>
              <button
                onClick={handleExecuteImport}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded text-xs"
              >
                確認匯入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
