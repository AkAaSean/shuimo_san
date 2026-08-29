import React, { useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { BattleState, TerrainType, GridCell, BattleUnit } from '../types';

interface BattleGridProps {
  state: BattleState;
  onSelectUnit: (unitId: string) => void;
  onSelectCell: (col: number, row: number) => void;
  targetingMode?: 'move' | 'melee' | 'archery' | 'strategy' | null;
  validTargetCells?: { col: number; row: number }[];
}

const CELL_WIDTH = 64;
const CELL_HEIGHT = 64;
const HEX_W = (CELL_WIDTH * 4) / 3;
const HEX_H = CELL_HEIGHT;
const CX = HEX_W / 2;
const CY = HEX_H / 2;

// Precompute constant hex polygon points relative to (CX, CY)
const W4 = HEX_W / 4;
const W2 = HEX_W / 2;
const H2 = HEX_H / 2;
const HEX_POINTS = `${CX - W4},${CY - H2} ${CX + W4},${CY - H2} ${CX + W2},${CY} ${CX + W4},${CY + H2} ${CX - W4},${CY + H2} ${CX - W2},${CY}`;

// ==========================================
// 1. High-Performance Memoized Hex Tile Component
// ==========================================
interface HexTileProps {
  col: number;
  row: number;
  terrain: TerrainType;
  x: number;
  y: number;
  isValid: boolean;
  targetingMode?: 'move' | 'melee' | 'archery' | 'strategy' | null;
  onSelectCell: (col: number, row: number) => void;
}

const HexTile = React.memo(function HexTile({
  col,
  row,
  terrain,
  x,
  y,
  isValid,
  targetingMode,
  onSelectCell
}: HexTileProps) {
  // Determine base gradient fill
  let fillUrl = 'url(#grad-plains)';
  if (terrain === '樹林') fillUrl = 'url(#grad-forest)';
  else if (terrain === '山丘') fillUrl = 'url(#grad-hill)';
  else if (terrain === '山嶽') fillUrl = 'url(#grad-mountain)';
  else if (terrain === '淺水') fillUrl = 'url(#grad-shallow-water)';
  else if (terrain === '深水') fillUrl = 'url(#grad-deep-water)';
  else if (terrain === '城池') fillUrl = 'url(#grad-city)';
  else if (terrain === '太守府') fillUrl = 'url(#grad-palace)';
  else if (terrain === '關寨') fillUrl = 'url(#grad-gate)';
  else if (terrain === '沙漠') fillUrl = 'url(#grad-desert)';
  else if (terrain === '沼澤') fillUrl = 'url(#grad-swamp)';

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={() => onSelectCell(col, row)}
      className="cursor-pointer"
    >
      {/* Hex Polygon Base Background (No heavy filter) */}
      <polygon 
        points={HEX_POINTS}
        fill={fillUrl}
        stroke={isValid ? '#ea580c' : 'rgba(92, 77, 54, 0.4)'} 
        strokeWidth={isValid ? 3 : 1}
        strokeDasharray={isValid ? '4 2' : undefined}
      />

      {/* Guofeng Tile Artwork Overlay */}
      {terrain === '城池' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <rect x="-20" y="2" width="40" height="13" fill="#64748b" stroke="#334155" strokeWidth="0.8" rx="1" />
          <path d="M -20 2 L -20 -2 L -16 -2 L -16 2 L -12 2 L -12 -2 L -8 -2 L -8 2 L -4 2 L -4 -2 L 0 -2 L 0 2 L 4 2 L 4 -2 L 8 -2 L 8 2 L 12 2 L 12 -2 L 16 -2 L 16 2 L 20 2 L 20 -2 L 20 2" stroke="#334155" strokeWidth="0.8" fill="#475569" />
          <path d="M -4 15 L -4 7 Q 0 4 4 7 L 4 15 Z" fill="#18181b" stroke="#334155" strokeWidth="0.8" />
          <rect x="-12" y="-7" width="24" height="7" fill="#991b1b" stroke="#450a0a" strokeWidth="0.6" />
          <path d="M -16 -7 Q -10 -11 0 -11 Q 10 -11 16 -7 L 13 -6 Q 0 -9 -13 -6 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
          <rect x="-8" y="-14" width="16" height="6" fill="#991b1b" stroke="#450a0a" strokeWidth="0.6" />
          <path d="M -12 -14 Q -7 -19 0 -19 Q 7 -19 12 -14 L 9 -13 Q 0 -16 -9 -13 Z" fill="#0f172a" stroke="#020617" strokeWidth="0.9" />
          <circle cx="0" cy="-20" r="1.2" fill="#f59e0b" />
          <line x1="-15" y1="-2" x2="-15" y2="-10" stroke="#334155" strokeWidth="0.7" />
          <polygon points="-15,-10 -10,-8 -15,-6" fill="#eab308" />
          <line x1="15" y1="-2" x2="15" y2="-10" stroke="#334155" strokeWidth="0.7" />
          <polygon points="15,-10 20,-8 15,-6" fill="#eab308" />
        </g>
      )}

      {terrain === '太守府' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <rect x="-20" y="2" width="40" height="13" fill="#b45309" stroke="#78350f" strokeWidth="0.8" rx="1" />
          <path d="M -20 2 L -20 -2 L -15 -2 L -15 2 L -10 2 L -10 -2 L -5 -2 L -5 2 L 0 2 L 0 -2 L 5 -2 L 5 2 L 10 2 L 10 -2 L 15 -2 L 15 2 L 20 2 L 20 -2 L 20 2" stroke="#f59e0b" strokeWidth="0.8" fill="#d97706" />
          <path d="M -5 15 L -5 6 Q 0 3 5 6 L 5 15 Z" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" />
          <rect x="-14" y="-7" width="28" height="7" fill="#b91c1c" stroke="#450a0a" strokeWidth="0.6" />
          <path d="M -18 -7 Q -11 -12 0 -12 Q 11 -12 18 -7 L 15 -5 Q 0 -9 -15 -5 Z" fill="#d97706" stroke="#78350f" strokeWidth="0.9" />
          <rect x="-10" y="-15" width="20" height="7" fill="#dc2626" stroke="#450a0a" strokeWidth="0.6" />
          <path d="M -14 -15 Q -8 -20 0 -20 Q 8 -20 14 -15 L 11 -13 Q 0 -17 -11 -13 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          <circle cx="0" cy="-21" r="1.5" fill="#fef08a" />
          <line x1="-15" y1="-2" x2="-15" y2="-11" stroke="#f59e0b" strokeWidth="0.8" />
          <polygon points="-15,-11 -9,-9 -15,-7" fill="#fef08a" />
          <line x1="15" y1="-2" x2="15" y2="-11" stroke="#f59e0b" strokeWidth="0.8" />
          <polygon points="15,-11 21,-9 15,-7" fill="#fef08a" />
        </g>
      )}

      {terrain === '關寨' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -24 14 L -18 -2 L -12 4 L -10 14 Z" fill="#574d3f" stroke="#383025" strokeWidth="0.8" />
          <path d="M 24 14 L 18 -2 L 12 4 L 10 14 Z" fill="#574d3f" stroke="#383025" strokeWidth="0.8" />
          <rect x="-15" y="2" width="30" height="12" fill="#78716c" stroke="#44403c" strokeWidth="0.8" />
          <path d="M -15 2 L -15 -2 L -10 -2 L -10 2 L -5 2 L -5 -2 L 0 -2 L 0 2 L 5 2 L 5 -2 L 10 -2 L 10 2 L 15 2 L 15 -2 L 15 2" fill="#57534e" stroke="#44403c" strokeWidth="0.6" />
          <path d="M -4 14 L -4 6 Q 0 3 4 6 L 4 14 Z" fill="#3f1a0e" stroke="#1c1917" strokeWidth="0.8" />
          <rect x="-8" y="-6" width="16" height="6" fill="#7f1d1d" stroke="#450a0a" strokeWidth="0.6" />
          <path d="M -11 -6 Q -5 -11 0 -11 Q 5 -11 11 -6 L 9 -4 Q 0 -8 -9 -4 Z" fill="#1c1917" stroke="#0c0a09" strokeWidth="0.8" />
          <line x1="-9" y1="-2" x2="-9" y2="-10" stroke="#1c1917" strokeWidth="0.7" />
          <polygon points="-9,-10 -4,-8 -9,-6" fill="#dc2626" />
        </g>
      )}

      {terrain === '山嶽' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -20 14 L -9 -12 L 2 14 Z" fill="#5a4e3e" stroke="#332a1e" strokeWidth="0.8" />
          <path d="M 0 14 L 11 -10 L 22 14 Z" fill="#4d4233" stroke="#332a1e" strokeWidth="0.8" />
          <path d="M -15 14 L 0 -18 L 15 14 Z" fill="#6d5f4c" stroke="#2b2318" strokeWidth="0.9" />
          <path d="M 0 -18 L 3 -1 L 15 14" fill="#3f3527" opacity="0.6" />
          <path d="M 0 -18 L -4 -11 Q -1 -9 0 -13 Q 1 -9 4 -11 Z" fill="#ffffff" />
          <path d="M 1 -6 Q -1 2 2 7 T 0 14" stroke="#93c5fd" strokeWidth="1.2" fill="none" strokeDasharray="3 1" />
        </g>
      )}

      {terrain === '山丘' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -22 14 Q -10 -4 4 14" fill="#9ba064" stroke="#52572b" strokeWidth="0.7" />
          <path d="M -12 14 Q 4 -9 20 14" fill="#84944d" stroke="#444e21" strokeWidth="0.8" />
          <path d="M -9 13 L -7 8 L -5 13 Z" fill="#1b3612" />
          <path d="M -6 14 L -4 9 L -2 14 Z" fill="#254a19" />
          <circle cx="5" cy="3" r="1.8" fill="#f472b6" opacity="0.85" />
          <circle cx="8" cy="5" r="1.4" fill="#fda4af" opacity="0.9" />
        </g>
      )}

      {terrain === '樹林' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <rect x="-9" y="6" width="2" height="6" fill="#4d3219" rx="0.5" />
          <rect x="0" y="7" width="2" height="6" fill="#4d3219" rx="0.5" />
          <rect x="8" y="6" width="2" height="6" fill="#4d3219" rx="0.5" />
          <circle cx="-8" cy="1" r="7.5" fill="#2c5516" stroke="#16310b" strokeWidth="0.6" />
          <circle cx="8" cy="1" r="7.5" fill="#34621b" stroke="#16310b" strokeWidth="0.6" />
          <circle cx="0" cy="3" r="9" fill="#3f7521" stroke="#1a3b0c" strokeWidth="0.7" />
          <circle cx="-1" cy="1" r="6" fill="#52942d" opacity="0.6" />
        </g>
      )}

      {terrain === '平地' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -18 8 Q -3 12 15 3 Q 20 1 24 6" stroke="#d5c49b" strokeWidth="1.8" fill="none" opacity="0.7" />
          <path d="M -12 -3 L -10 -7 L -8 -3" stroke="#5d832c" strokeWidth="0.7" fill="none" />
          <g transform="translate(-2, -4)">
            <rect x="-6" y="2" width="8" height="5" fill="#e7dbbe" stroke="#8c7853" strokeWidth="0.5" />
            <path d="M -8 2 L -2 -2 L 3 2 Z" fill="#ab8845" stroke="#6d5122" strokeWidth="0.6" />
            <rect x="-3" y="3.5" width="2" height="3.5" fill="#6d4c28" />
          </g>
        </g>
      )}

      {(terrain === '淺水' || terrain === '深水') && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -20 -4 Q -10 -8 0 -4 T 20 -4" stroke="#bfe8fc" strokeWidth="1.1" fill="none" opacity="0.8" />
          <path d="M -16 6 Q -6 2 4 6 T 20 6" stroke="#bfe8fc" strokeWidth="1.1" fill="none" opacity="0.8" />
          {terrain === '深水' ? (
            <g transform="translate(0, -1)">
              <path d="M -6 3 Q 0 6 6 3 L 4 7 Q 0 8 -4 7 Z" fill="#78350f" stroke="#451a03" strokeWidth="0.5" />
              <line x1="0" y1="3" x2="0" y2="-6" stroke="#451a03" strokeWidth="0.7" />
              <path d="M 0 -5 Q 4 -2 4 2 L 0 2.5 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
            </g>
          ) : (
            (col % 5 === 0 && row % 4 === 0) ? (
              <path d="M -10 3 Q 0 -5 10 3 L 10 7 Q 0 -1 -10 7 Z" fill="#78716c" stroke="#44403c" strokeWidth="0.7" />
            ) : (
              <ellipse cx="5" cy="-1" rx="3.5" ry="1.2" fill="#a5f3fc" opacity="0.6" />
            )
          )}
        </g>
      )}

      {terrain === '沙漠' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <path d="M -18 9 Q -5 -2 7 9 Q 14 3 20 7" stroke="#ca8a04" strokeWidth="1.2" fill="none" opacity="0.7" />
          <circle cx="-7" cy="2" r="1" fill="#a16207" />
          <circle cx="9" cy="-2" r="1" fill="#a16207" />
        </g>
      )}

      {terrain === '沼澤' && (
        <g transform={`translate(${CX}, ${CY - 2})`}>
          <ellipse cx="-4" cy="3" rx="8" ry="3" fill="#37391e" opacity="0.7" />
          <ellipse cx="6" cy="-2" rx="6" ry="2" fill="#292b15" opacity="0.7" />
          <path d="M -9 3 Q -4 1 0 3" stroke="#84cc16" strokeWidth="0.7" fill="none" opacity="0.8" />
        </g>
      )}

      {/* Target highlight overlay */}
      {isValid && (
        <polygon 
          points={HEX_POINTS}
          fill={targetingMode === 'move' ? '#38bdf8' : '#ef4444'}
          opacity="0.32"
        />
      )}

      {/* Terrain Label in Guofeng Calligraphy Style */}
      <text
        x={CX}
        y={CY + 18}
        textAnchor="middle"
        className="font-serif text-[10px] font-black fill-[#2c261e] pointer-events-none tracking-tight"
        style={{ 
          paintOrder: 'stroke fill', 
          stroke: 'rgba(255,255,255,0.92)', 
          strokeWidth: '2.5px',
          strokeLinejoin: 'round'
        }}
      >
        {terrain}
      </text>
    </g>
  );
});

// ==========================================
// 2. High-Performance Memoized Unit Token
// ==========================================
interface UnitTokenProps {
  unit: BattleUnit;
  isSelected: boolean;
  x: number;
  y: number;
  onSelectUnit: (unitId: string) => void;
}

const UnitToken = React.memo(function UnitToken({
  unit,
  isSelected,
  x,
  y,
  onSelectUnit
}: UnitTokenProps) {
  const isAttacker = unit.isAttacker;
  const isConfused = unit.status === 'confused';

  const unitSkills = unit.skills || [];
  const unitPassives = (unit.passives || []) as string[];
  const hasSkill = (name: string) => unitSkills.includes(name) || unitPassives.includes(name);

  const hasCalm = hasSkill('沉著');
  const hasCounter = hasSkill('反計');
  const hasPeerless = hasSkill('無雙');
  const hasValiance = hasSkill('奮發');
  const hasReturnFire = hasSkill('回射');
  const hasMountedArchery = hasSkill('騎射');
  const hasRattan = hasSkill('藤甲');

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelectUnit(unit.id);
      }}
      className="cursor-pointer transition-transform"
    >
      {/* Active Unit Selection Ring */}
      {isSelected && (
        <circle
          cx={CX}
          cy={CY}
          r={HEX_H / 2 - 4}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3"
          strokeDasharray="5 3"
          className="animate-spin"
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        />
      )}

      {/* Unit Banner Box with Classical Border */}
      <rect 
        x={CX - 18} 
        y={CY - 12} 
        width={36} 
        height={24} 
        fill={isAttacker ? '#991b1b' : '#075985'}
        stroke={isSelected ? '#fde047' : '#292524'}
        strokeWidth={isSelected ? 2.5 : 1.2}
        rx={3}
      />
      
      {/* Inner Gold Trimming */}
      <rect 
        x={CX - 16} 
        y={CY - 10} 
        width={32} 
        height={20} 
        fill="none"
        stroke={isAttacker ? '#fca5a5' : '#7dd3fc'}
        strokeWidth={0.5}
        rx={2}
        opacity="0.6"
      />

      {/* Commander / General Icon Text */}
      <text
        x={CX}
        y={CY + 4}
        textAnchor="middle"
        className="font-serif text-[12px] font-black fill-[#fefce8] select-none pointer-events-none tracking-widest drop-shadow"
      >
        {unit.generalName.slice(0, 2)}
      </text>

      {/* Confusion Status Badge */}
      {isConfused && (
        <g transform={`translate(${CX + 8}, ${CY - 18})`}>
          <circle cx="6" cy="6" r="6" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
          <text x="6" y="9" textAnchor="middle" className="text-[8px] fill-white font-black">混</text>
        </g>
      )}

      {/* Passive Skill Indicators Icons (Top-left mini badges) */}
      <g transform={`translate(${CX - 18}, ${CY - 18})`}>
        {hasPeerless && <text x="0" y="7" className="text-[9px]">⚔️</text>}
        {hasCalm && <text x="8" y="7" className="text-[9px]">🛡️</text>}
        {hasCounter && <text x="16" y="7" className="text-[9px]">🔄</text>}
        {hasValiance && !hasPeerless && <text x="0" y="7" className="text-[9px]">💥</text>}
        {hasReturnFire && <text x="24" y="7" className="text-[9px]">🏹</text>}
        {hasMountedArchery && !hasReturnFire && <text x="24" y="7" className="text-[9px]">🐎</text>}
        {hasRattan && <text x="32" y="7" className="text-[9px]">🪵</text>}
      </g>
      
      {/* Troops bar indicator */}
      <rect
        x={CX - 16} 
        y={CY + 15} 
        width={32} 
        height={12} 
        fill="#fafaf9"
        stroke="#44403c"
        strokeWidth="0.8"
        rx={2}
      />
      <text
        x={CX}
        y={CY + 24}
        textAnchor="middle"
        className={`font-serif text-[9px] font-black ${isAttacker ? 'fill-rose-950' : 'fill-sky-950'} select-none pointer-events-none`}
      >
        {unit.troops}
      </text>

      {/* Formation badge */}
      {unit.formation && (
        <text
          x={CX}
          y={CY - 14}
          textAnchor="middle"
          className="font-serif text-[8px] font-black fill-[#78350f] select-none pointer-events-none"
          style={{ paintOrder: 'stroke fill', stroke: '#ffffff', strokeWidth: '2px' }}
        >
          [{unit.formation}]
        </text>
      )}
    </g>
  );
});

// ==========================================
// 3. Main BattleGrid Component
// ==========================================
export default function BattleGrid({
  state,
  onSelectUnit,
  onSelectCell,
  targetingMode,
  validTargetCells = []
}: BattleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const COLS = useMemo(() => Math.max(0, ...state.grid.map(c => c.col)) + 1, [state.grid]);
  const ROWS = useMemo(() => Math.max(0, ...state.grid.map(c => c.row)) + 1, [state.grid]);
  
  const gridWidth = (COLS - 1) * CELL_WIDTH + HEX_W;
  const gridHeight = ROWS * CELL_HEIGHT + CELL_HEIGHT / 2;

  // Fast O(1) Target Cell Lookup Set
  const validTargetSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < validTargetCells.length; i++) {
      set.add(`${validTargetCells[i].col},${validTargetCells[i].row}`);
    }
    return set;
  }, [validTargetCells]);

  const handleCellClick = useCallback((col: number, row: number) => {
    onSelectCell(col, row);
  }, [onSelectCell]);

  return (
    <div 
      className="flex-1 w-full h-full relative overflow-hidden bg-[#ebe4d3] flex items-center justify-center select-none"
      ref={containerRef}
      style={{
        backgroundImage: 'radial-gradient(#d6c9b1 1px, transparent 1px), radial-gradient(#d6c9b1 1px, #ebe4d3 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 20px 20px'
      }}
    >
      {/* Antique Paper Grain Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100/50 via-stone-300/30 to-stone-400/40 z-0"></div>

      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        className="origin-center cursor-grab active:cursor-grabbing z-10 shrink-0 p-8"
        style={{ width: gridWidth + 64, height: gridHeight + 64, scale }}
      >
        {/* Guofeng Mounting Frame (神州古風裝裱邊框) */}
        <div className="relative p-3 bg-[#f7f2e7] rounded-sm shadow-[0_12px_36px_rgba(40,30,20,0.35),0_2px_6px_rgba(40,30,20,0.2)] border-2 border-[#8b6f4e]">
          {/* Inner Golden-Brown Border */}
          <div className="border border-[#b89b72] p-1 relative bg-[#fcf9f2]">
            {/* Corner Decorative Motifs (回紋角花) */}
            <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#8b6f4e] pointer-events-none"></div>
            <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#8b6f4e] pointer-events-none"></div>
            <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#8b6f4e] pointer-events-none"></div>
            <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#8b6f4e] pointer-events-none"></div>

            <svg 
              width={gridWidth} 
              height={gridHeight} 
              viewBox={`0 0 ${gridWidth} ${gridHeight}`}
              className="block"
            >
              <defs>
                {/* Soft Watercolor Gradients for Terrains */}
                <radialGradient id="grad-plains" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#b4dc7f" />
                  <stop offset="70%" stopColor="#9cc964" />
                  <stop offset="100%" stopColor="#84b04d" />
                </radialGradient>

                <radialGradient id="grad-forest" cx="50%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="#559938" />
                  <stop offset="65%" stopColor="#3c7921" />
                  <stop offset="100%" stopColor="#255513" />
                </radialGradient>

                <radialGradient id="grad-hill" cx="50%" cy="45%" r="65%">
                  <stop offset="0%" stopColor="#c5be88" />
                  <stop offset="65%" stopColor="#a79e65" />
                  <stop offset="100%" stopColor="#897e47" />
                </radialGradient>

                <radialGradient id="grad-mountain" cx="50%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#8e826e" />
                  <stop offset="60%" stopColor="#6d614f" />
                  <stop offset="100%" stopColor="#4a4032" />
                </radialGradient>

                <linearGradient id="grad-shallow-water" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8cd3ed" />
                  <stop offset="50%" stopColor="#63b6d8" />
                  <stop offset="100%" stopColor="#489fbf" />
                </linearGradient>

                <linearGradient id="grad-deep-water" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4fa2cb" />
                  <stop offset="50%" stopColor="#317fa8" />
                  <stop offset="100%" stopColor="#1a5a7f" />
                </linearGradient>

                <radialGradient id="grad-city" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#cbd5e1" />
                  <stop offset="70%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </radialGradient>

                <radialGradient id="grad-palace" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </radialGradient>

                <radialGradient id="grad-gate" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#d7c2a7" />
                  <stop offset="70%" stopColor="#b39675" />
                  <stop offset="100%" stopColor="#886847" />
                </radialGradient>

                <radialGradient id="grad-desert" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#fae287" />
                  <stop offset="70%" stopColor="#e5c55d" />
                  <stop offset="100%" stopColor="#c59e38" />
                </radialGradient>

                <radialGradient id="grad-swamp" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#757a4e" />
                  <stop offset="70%" stopColor="#555a33" />
                  <stop offset="100%" stopColor="#3c3f20" />
                </radialGradient>
              </defs>

              {/* Draw Grid Cells with Optimized Memoized Components */}
              {state.grid.map((cell) => {
                const x = cell.col * CELL_WIDTH;
                const y = cell.row * CELL_HEIGHT + (cell.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
                const isValid = validTargetSet.has(`${cell.col},${cell.row}`);

                return (
                  <HexTile
                    key={`${cell.col}-${cell.row}`}
                    col={cell.col}
                    row={cell.row}
                    terrain={cell.terrain}
                    x={x}
                    y={y}
                    isValid={isValid}
                    targetingMode={targetingMode}
                    onSelectCell={handleCellClick}
                  />
                );
              })}

              {/* Draw Units with Optimized Memoized Unit Tokens */}
              {state.units.filter(u => u.troops > 0).map((unit) => {
                const x = unit.col * CELL_WIDTH;
                const y = unit.row * CELL_HEIGHT + (unit.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
                const isSelected = unit.id === state.activeUnitId;

                return (
                  <UnitToken
                    key={unit.id}
                    unit={unit}
                    isSelected={isSelected}
                    x={x}
                    y={y}
                    onSelectUnit={onSelectUnit}
                  />
                );
              })}

              {/* Draw Strategy Animations */}
              {state.animatingStrategy && (
                <g transform={`translate(${state.animatingStrategy.col * CELL_WIDTH}, ${state.animatingStrategy.row * CELL_HEIGHT + (state.animatingStrategy.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0)})`}>
                  <circle cx={CX} cy={CY} r={CX} fill="#ef4444" opacity="0.6">
                    <animate attributeName="r" from="0" to={HEX_W * 1.2} dur="0.6s" begin="0s" repeatCount="1" fill="freeze" />
                    <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" begin="0s" repeatCount="1" fill="freeze" />
                  </circle>
                  <text 
                    x={CX} 
                    y={CY} 
                    textAnchor="middle" 
                    className="font-serif text-[12px] font-bold fill-amber-300 drop-shadow-md"
                  >
                    {state.animatingStrategy.type}
                  </text>
                </g>
              )}

              {/* Floating Damage & Passive Popups */}
              {state.damagePopups && state.damagePopups.map((popup) => {
                const px = popup.col * CELL_WIDTH + CX;
                const py = popup.row * CELL_HEIGHT + (popup.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0) + CY;
                
                const colorClass = 
                  popup.color === 'red' ? '#ef4444' :
                  popup.color === 'yellow' ? '#eab308' :
                  popup.color === 'blue' ? '#3b82f6' :
                  popup.color === 'purple' ? '#a855f7' :
                  popup.color === 'green' ? '#22c55e' : '#f97316';

                return (
                  <g key={popup.id} transform={`translate(${px}, ${py})`}>
                    <text
                      x="0"
                      y="-15"
                      textAnchor="middle"
                      fill={colorClass}
                      stroke="#1c1917"
                      strokeWidth="1.5"
                      className="font-serif text-[13px] font-black drop-shadow-lg pointer-events-none"
                    >
                      <animate attributeName="y" from="-10" to="-38" dur="1.2s" begin="0s" repeatCount="1" fill="freeze" />
                      <animate attributeName="opacity" from="1" to="0" dur="1.2s" begin="0.6s" repeatCount="1" fill="freeze" />
                      {popup.text}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </motion.div>
      
      {/* Zoom & Nav Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-20">
        <button 
          onClick={() => setScale(s => Math.min(s + 0.25, 3))}
          className="w-10 h-10 bg-[#fbf8ef] border-2 border-[#8b6f4e] rounded-full flex items-center justify-center text-xl font-serif text-[#453221] shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          title="放大地圖"
        >
          ＋
        </button>
        <button 
          onClick={() => setScale(s => Math.max(s - 0.25, 0.4))}
          className="w-10 h-10 bg-[#fbf8ef] border-2 border-[#8b6f4e] rounded-full flex items-center justify-center text-xl font-serif text-[#453221] shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          title="縮小地圖"
        >
          －
        </button>
        <button 
          onClick={() => setScale(1)}
          className="w-10 h-10 bg-[#fbf8ef] border-2 border-[#8b6f4e] rounded-full flex items-center justify-center text-xs font-serif font-bold text-[#453221] shadow-lg backdrop-blur-sm active:scale-95 transition-transform"
          title="重設大小"
        >
          1:1
        </button>
      </div>
    </div>
  );
}
