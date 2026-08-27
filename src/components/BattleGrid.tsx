import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BattleState, TerrainType } from '../types';

interface BattleGridProps {
  state: BattleState;
  onSelectUnit: (unitId: string) => void;
  onSelectCell: (col: number, row: number) => void;
  targetingMode?: 'move' | 'melee' | 'archery' | 'strategy' | null;
  validTargetCells?: { col: number; row: number }[];
}

const CELL_WIDTH = 64;
const CELL_HEIGHT = 64;

export default function BattleGrid({
  state,
  onSelectUnit,
  onSelectCell,
  targetingMode,
  validTargetCells = []
}: BattleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const COLS = Math.max(0, ...state.grid.map(c => c.col)) + 1;
  const ROWS = Math.max(0, ...state.grid.map(c => c.row)) + 1;

  // Hex math (flat-topped hex)
  const hexW = CELL_WIDTH * 4 / 3;
  const hexH = CELL_HEIGHT;
  
  const gridWidth = (COLS - 1) * CELL_WIDTH + hexW;
  const gridHeight = ROWS * CELL_HEIGHT + CELL_HEIGHT / 2;

  const isCellValidTarget = (col: number, row: number) => {
    return validTargetCells.some(c => c.col === col && c.row === row);
  };

  const getHexPoints = (x: number, y: number) => {
    // x, y is the center of the hex
    const w4 = hexW / 4;
    const w2 = hexW / 2;
    const h2 = hexH / 2;
    return `
      ${x - w4},${y - h2}
      ${x + w4},${y - h2}
      ${x + w2},${y}
      ${x + w4},${y + h2}
      ${x - w4},${y + h2}
      ${x - w2},${y}
    `;
  };

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
                {/* Hex Shadow Filter */}
                <filter id="hex-shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0.5" dy="1.2" stdDeviation="1" floodColor="#332a1d" floodOpacity="0.25"/>
                </filter>

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

              {/* Draw Grid Cells with Guofeng Ink-Wash Tile Artwork */}
              {state.grid.map((cell) => {
                const x = cell.col * CELL_WIDTH;
                const y = cell.row * CELL_HEIGHT + (cell.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
                const isValid = isCellValidTarget(cell.col, cell.row);
                const cx = hexW / 2;
                const cy = hexH / 2;
                const points = getHexPoints(cx, cy);

                // Determine base gradient fill
                let fillUrl = 'url(#grad-plains)';
                if (cell.terrain === '樹林') fillUrl = 'url(#grad-forest)';
                else if (cell.terrain === '山丘') fillUrl = 'url(#grad-hill)';
                else if (cell.terrain === '山嶽') fillUrl = 'url(#grad-mountain)';
                else if (cell.terrain === '淺水') fillUrl = 'url(#grad-shallow-water)';
                else if (cell.terrain === '深水') fillUrl = 'url(#grad-deep-water)';
                else if (cell.terrain === '城池') fillUrl = 'url(#grad-city)';
                else if (cell.terrain === '關寨') fillUrl = 'url(#grad-gate)';
                else if (cell.terrain === '沙漠') fillUrl = 'url(#grad-desert)';
                else if (cell.terrain === '沼澤') fillUrl = 'url(#grad-swamp)';

                return (
                  <g 
                    key={`${cell.col}-${cell.row}`} 
                    transform={`translate(${x}, ${y})`}
                    onClick={() => onSelectCell(cell.col, cell.row)}
                    className="cursor-pointer"
                  >
                    {/* Hex Polygon Base Background */}
                    <polygon 
                      points={points}
                      fill={fillUrl}
                      stroke={isValid ? '#ea580c' : 'rgba(92, 77, 54, 0.35)'} 
                      strokeWidth={isValid ? 3 : 1}
                      strokeDasharray={isValid ? '4 2' : undefined}
                      filter="url(#hex-shadow)"
                    />

                    {/* Guofeng Tile Artwork Overlay */}
                    {cell.terrain === '城池' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Walled Fortress Ramparts */}
                        <rect x="-22" y="2" width="44" height="14" fill="#64748b" stroke="#334155" strokeWidth="0.8" rx="1" />
                        {/* Battlements / Crenellations */}
                        <path d="M -22 2 L -22 -2 L -18 -2 L -18 2 L -14 2 L -14 -2 L -10 -2 L -10 2 L -6 2 L -6 -2 L -2 -2 L -2 2 L 2 2 L 2 -2 L 6 -2 L 6 2 L 10 2 L 10 -2 L 14 -2 L 14 2 L 18 2 L 18 -2 L 22 -2 L 22 2" stroke="#334155" strokeWidth="0.8" fill="#475569" />
                        {/* Fortress Arched Gate */}
                        <path d="M -5 16 L -5 7 Q 0 4 5 7 L 5 16 Z" fill="#18181b" stroke="#334155" strokeWidth="0.8" />
                        
                        {/* Lower Palace Pavilion */}
                        <rect x="-14" y="-8" width="28" height="8" fill="#991b1b" stroke="#450a0a" strokeWidth="0.6" />
                        {/* Lower Eaves Roof */}
                        <path d="M -18 -7 Q -12 -12 0 -12 Q 12 -12 18 -7 L 15 -6 Q 0 -9 -15 -6 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
                        
                        {/* Upper Palace Pavilion */}
                        <rect x="-9" y="-16" width="18" height="7" fill="#991b1b" stroke="#450a0a" strokeWidth="0.6" />
                        <line x1="-5" y1="-16" x2="-5" y2="-9" stroke="#fef08a" strokeWidth="0.6" />
                        <line x1="5" y1="-16" x2="5" y2="-9" stroke="#fef08a" strokeWidth="0.6" />
                        {/* Upper Curved Grand Roof with Flying Eaves */}
                        <path d="M -14 -16 Q -8 -22 0 -22 Q 8 -22 14 -16 L 11 -14 Q 0 -18 -11 -14 Z" fill="#0f172a" stroke="#020617" strokeWidth="1" />
                        <circle cx="0" cy="-23" r="1.2" fill="#f59e0b" />
                        
                        {/* Imperial Flags */}
                        <line x1="-16" y1="-2" x2="-16" y2="-12" stroke="#334155" strokeWidth="0.7" />
                        <polygon points="-16,-12 -11,-9.5 -16,-7" fill="#eab308" />
                        <line x1="16" y1="-2" x2="16" y2="-12" stroke="#334155" strokeWidth="0.7" />
                        <polygon points="16,-12 21,-9.5 16,-7" fill="#eab308" />
                      </g>
                    )}

                    {cell.terrain === '關寨' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Flanking Rock Shoulders */}
                        <path d="M -26 15 L -20 -2 L -14 4 L -12 15 Z" fill="#574d3f" stroke="#383025" strokeWidth="0.8" />
                        <path d="M 26 15 L 20 -2 L 14 4 L 12 15 Z" fill="#574d3f" stroke="#383025" strokeWidth="0.8" />
                        {/* Heavy Stone Pass Wall */}
                        <rect x="-16" y="2" width="32" height="13" fill="#78716c" stroke="#44403c" strokeWidth="0.8" />
                        <path d="M -16 2 L -16 -2 L -12 -2 L -12 2 L -8 2 L -8 -2 L -4 -2 L -4 2 L 4 2 L 4 -2 L 8 -2 L 8 2 L 12 2 L 12 -2 L 16 -2 L 16 2" fill="#57534e" stroke="#44403c" strokeWidth="0.6" />
                        {/* Pass Studded Gate */}
                        <path d="M -5 15 L -5 6 Q 0 3 5 6 L 5 15 Z" fill="#3f1a0e" stroke="#1c1917" strokeWidth="0.8" />
                        {/* Gatehouse Tower */}
                        <rect x="-9" y="-7" width="18" height="7" fill="#7f1d1d" stroke="#450a0a" strokeWidth="0.6" />
                        <path d="M -13 -7 Q -6 -12 0 -12 Q 6 -12 13 -7 L 10 -5 Q 0 -9 -10 -5 Z" fill="#1c1917" stroke="#0c0a09" strokeWidth="0.8" />
                        {/* Banner */}
                        <line x1="-10" y1="-2" x2="-10" y2="-11" stroke="#1c1917" strokeWidth="0.7" />
                        <polygon points="-10,-11 -5,-9 -10,-7" fill="#dc2626" />
                      </g>
                    )}

                    {cell.terrain === '山嶽' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Rear Peaks */}
                        <path d="M -22 15 L -10 -14 L 2 15 Z" fill="#5a4e3e" stroke="#332a1e" strokeWidth="0.8" />
                        <path d="M 0 15 L 12 -11 L 24 15 Z" fill="#4d4233" stroke="#332a1e" strokeWidth="0.8" />
                        {/* Main Grand Peak */}
                        <path d="M -16 15 L 0 -20 L 16 15 Z" fill="#6d5f4c" stroke="#2b2318" strokeWidth="1" />
                        {/* Rocky Facet Shadow */}
                        <path d="M 0 -20 L 3 -1 L 16 15" fill="#3f3527" opacity="0.6" />
                        <path d="M 0 -20 L -4 2 L 1 15" stroke="#2b2318" strokeWidth="0.6" fill="none" opacity="0.7" />
                        {/* Snow Caps (白雪皚皚) */}
                        <path d="M 0 -20 L -5 -12 Q -1 -10 0 -14 Q 1 -10 5 -12 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.4" />
                        <path d="M -10 -14 L -13 -8 Q -10 -7 -8 -10 Z" fill="#ffffff" opacity="0.9" />
                        <path d="M 12 -11 L 9 -6 Q 12 -5 15 -7 Z" fill="#ffffff" opacity="0.9" />
                        {/* Silver Waterfall (水墨瀑布) */}
                        <path d="M 1 -7 Q -1 2 2 8 T 0 15" stroke="#93c5fd" strokeWidth="1.4" fill="none" strokeDasharray="3 1" />
                        <path d="M 1 -7 Q -1 2 2 8 T 0 15" stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.8" />
                      </g>
                    )}

                    {cell.terrain === '山丘' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Rolling Hill Contours */}
                        <path d="M -24 15 Q -12 -5 4 15" fill="#9ba064" stroke="#52572b" strokeWidth="0.7" />
                        <path d="M -14 15 Q 4 -10 22 15" fill="#84944d" stroke="#444e21" strokeWidth="0.8" />
                        {/* Ridge Contour Line */}
                        <path d="M -4 4 Q 4 -3 13 6" stroke="#505c26" strokeWidth="0.7" fill="none" opacity="0.6" />
                        {/* Pine Trees */}
                        <path d="M -10 14 L -8 8 L -6 14 Z" fill="#1b3612" stroke="#0e1f0a" strokeWidth="0.4" />
                        <path d="M -7 15 L -5 9 L -3 15 Z" fill="#254a19" stroke="#0e1f0a" strokeWidth="0.4" />
                        {/* Blossom Accents (桃花點綴) */}
                        <circle cx="5" cy="3" r="2" fill="#f472b6" opacity="0.85" />
                        <circle cx="8" cy="5" r="1.6" fill="#fda4af" opacity="0.9" />
                        <circle cx="13" cy="8" r="1.8" fill="#f472b6" opacity="0.85" />
                      </g>
                    )}

                    {cell.terrain === '樹林' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Trunks */}
                        <rect x="-10" y="6" width="2.5" height="7" fill="#4d3219" rx="0.5" />
                        <rect x="0" y="7" width="2.5" height="7" fill="#4d3219" rx="0.5" />
                        <rect x="9" y="6" width="2.5" height="7" fill="#4d3219" rx="0.5" />
                        {/* Rear Canopies */}
                        <circle cx="-9" cy="1" r="8.5" fill="#2c5516" stroke="#16310b" strokeWidth="0.7" />
                        <circle cx="9" cy="1" r="8.5" fill="#34621b" stroke="#16310b" strokeWidth="0.7" />
                        {/* Foreground Dense Canopy */}
                        <circle cx="0" cy="3" r="10" fill="#3f7521" stroke="#1a3b0c" strokeWidth="0.8" />
                        <circle cx="-1" cy="1" r="7" fill="#52942d" opacity="0.6" />
                        <path d="M -5 -1 Q 0 -4 5 -1" stroke="#224710" strokeWidth="0.7" fill="none" opacity="0.6" />
                      </g>
                    )}

                    {cell.terrain === '平地' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Country Path */}
                        <path d="M -20 9 Q -4 13 16 3 Q 22 1 26 7" stroke="#d5c49b" strokeWidth="2.2" fill="none" opacity="0.7" />
                        {/* Grass Tufts */}
                        <path d="M -14 -4 L -12 -9 L -10 -4" stroke="#5d832c" strokeWidth="0.8" fill="none" />
                        <path d="M 11 9 L 13 4 L 15 9" stroke="#5d832c" strokeWidth="0.8" fill="none" />
                        {/* Thatched Farmstead Cottage Cluster (村莊農舍) */}
                        <g transform="translate(-2, -5)">
                          <rect x="-7" y="2" width="9" height="6" fill="#e7dbbe" stroke="#8c7853" strokeWidth="0.5" />
                          <path d="M -9 2 L -2.5 -3 L 4 2 Z" fill="#ab8845" stroke="#6d5122" strokeWidth="0.7" />
                          <rect x="-4" y="4" width="2.5" height="4" fill="#6d4c28" />
                          <rect x="2" y="3.5" width="6" height="4.5" fill="#dfd2b0" stroke="#8c7853" strokeWidth="0.5" />
                          <path d="M 0.5 3.5 L 5 -0.5 L 9.5 3.5 Z" fill="#967436" stroke="#6d5122" strokeWidth="0.7" />
                        </g>
                      </g>
                    )}

                    {(cell.terrain === '淺水' || cell.terrain === '深水') && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        {/* Gentle Water Waves */}
                        <path d="M -22 -5 Q -11 -10 0 -5 T 22 -5" stroke="#bfe8fc" strokeWidth="1.2" fill="none" opacity="0.8" />
                        <path d="M -18 6 Q -7 1 4 6 T 22 6" stroke="#bfe8fc" strokeWidth="1.2" fill="none" opacity="0.8" />
                        {cell.terrain === '深水' ? (
                          /* Traditional Wooden Sailing Junk (輕舟碧波) */
                          <g transform="translate(0, -1)">
                            <path d="M -7 4 Q 0 7 7 4 L 5 8 Q 0 9 -5 8 Z" fill="#78350f" stroke="#451a03" strokeWidth="0.5" />
                            <line x1="0" y1="4" x2="0" y2="-7" stroke="#451a03" strokeWidth="0.7" />
                            <path d="M 0 -6 Q 5 -3 5 3 L 0 3.5 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
                          </g>
                        ) : (
                          /* Stone Arched Bridge (石拱橋) on shallow water connecting channels */
                          (cell.col % 5 === 0 && cell.row % 4 === 0) ? (
                            <g transform="translate(0, 0)">
                              <path d="M -12 4 Q 0 -6 12 4 L 12 8 Q 0 -2 -12 8 Z" fill="#78716c" stroke="#44403c" strokeWidth="0.8" />
                              <path d="M -6 7 Q 0 1 6 7 Z" fill="#1c1917" />
                            </g>
                          ) : (
                            <ellipse cx="6" cy="-1" rx="4" ry="1.5" fill="#a5f3fc" opacity="0.6" />
                          )
                        )}
                      </g>
                    )}

                    {cell.terrain === '沙漠' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        <path d="M -20 10 Q -6 -3 8 10 Q 16 3 22 8" stroke="#ca8a04" strokeWidth="1.3" fill="none" opacity="0.7" />
                        <path d="M -18 -4 Q -5 -12 9 -4" stroke="#b45309" strokeWidth="0.9" fill="none" opacity="0.6" />
                        <circle cx="-8" cy="3" r="1" fill="#a16207" />
                        <circle cx="10" cy="-2" r="1" fill="#a16207" />
                      </g>
                    )}

                    {cell.terrain === '沼澤' && (
                      <g transform={`translate(${cx}, ${cy - 2})`}>
                        <ellipse cx="-5" cy="3" rx="9" ry="3.5" fill="#37391e" opacity="0.7" />
                        <ellipse cx="7" cy="-3" rx="7" ry="2.5" fill="#292b15" opacity="0.7" />
                        <path d="M -10 3 Q -5 1 0 3" stroke="#84cc16" strokeWidth="0.8" fill="none" opacity="0.8" />
                        <line x1="5" y1="3" x2="5" y2="-5" stroke="#4d7c0f" strokeWidth="0.8" />
                        <ellipse cx="5" cy="-3" rx="0.8" ry="2" fill="#713f12" />
                      </g>
                    )}

                    {/* Target highlight overlay */}
                    {isValid && (
                      <polygon 
                        points={points}
                        fill={targetingMode === 'move' ? '#38bdf8' : '#ef4444'}
                        opacity="0.3"
                      />
                    )}

                    {/* Terrain Label in Guofeng Calligraphy Style */}
                    <text
                      x={cx}
                      y={cy + 18}
                      textAnchor="middle"
                      className="font-serif text-[10px] font-black fill-[#2c261e] pointer-events-none tracking-tight"
                      style={{ 
                        paintOrder: 'stroke fill', 
                        stroke: 'rgba(255,255,255,0.92)', 
                        strokeWidth: '2.5px',
                        strokeLinejoin: 'round'
                      }}
                    >
                      {cell.terrain}
                    </text>
                  </g>
                );
              })}

              {/* Draw Units with Guofeng General Banner Tokens */}
              {state.units.filter(u => u.troops > 0).map((unit) => {
                const x = unit.col * CELL_WIDTH;
                const y = unit.row * CELL_HEIGHT + (unit.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
                const isSelected = unit.id === state.activeUnitId;
                const isAttacker = unit.isAttacker;
                const isConfused = unit.status === 'confused';
                const cx = hexW / 2;
                const cy = hexH / 2;

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
                    key={unit.id}
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
                        cx={cx}
                        cy={cy}
                        r={hexH / 2 - 4}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray="5 3"
                        className="animate-spin"
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                      />
                    )}

                    {/* Unit Banner Box with Classical Border */}
                    <rect 
                      x={cx - 18} 
                      y={cy - 12} 
                      width={36} 
                      height={24} 
                      fill={isAttacker ? '#991b1b' : '#075985'}
                      stroke={isSelected ? '#fde047' : '#292524'}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      rx={3}
                      className="shadow-md"
                    />
                    
                    {/* Inner Gold Trimming */}
                    <rect 
                      x={cx - 16} 
                      y={cy - 10} 
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
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      className="font-serif text-[12px] font-black fill-[#fefce8] select-none pointer-events-none tracking-widest drop-shadow"
                    >
                      {unit.generalName.slice(0, 2)}
                    </text>

                    {/* Confusion Status Badge */}
                    {isConfused && (
                      <g transform={`translate(${cx + 8}, ${cy - 18})`}>
                        <circle cx="6" cy="6" r="6" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.8" />
                        <text x="6" y="9" textAnchor="middle" className="text-[8px] fill-white font-black">混</text>
                      </g>
                    )}

                    {/* Passive Skill Indicators Icons (Top-left mini badges) */}
                    <g transform={`translate(${cx - 18}, ${cy - 18})`}>
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
                      x={cx - 16} 
                      y={cy + 15} 
                      width={32} 
                      height={12} 
                      fill="#fafaf9"
                      stroke="#44403c"
                      strokeWidth="0.8"
                      rx={2}
                    />
                    <text
                      x={cx}
                      y={cy + 24}
                      textAnchor="middle"
                      className={`font-serif text-[9px] font-black ${isAttacker ? 'fill-rose-950' : 'fill-sky-950'} select-none pointer-events-none`}
                    >
                      {unit.troops}
                    </text>

                    {/* Formation badge */}
                    {unit.formation && (
                      <text
                        x={cx}
                        y={cy - 14}
                        textAnchor="middle"
                        className="font-serif text-[8px] font-black fill-[#78350f] select-none pointer-events-none"
                        style={{ paintOrder: 'stroke fill', stroke: '#ffffff', strokeWidth: '2px' }}
                      >
                        [{unit.formation}]
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Draw Strategy Animations */}
              {state.animatingStrategy && (
                <g transform={`translate(${state.animatingStrategy.col * CELL_WIDTH}, ${state.animatingStrategy.row * CELL_HEIGHT + (state.animatingStrategy.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0)})`}>
                  <circle cx={hexW/2} cy={hexH/2} r={hexW/2} fill="#ef4444" opacity="0.6">
                    <animate attributeName="r" from="0" to={hexW * 1.2} dur="0.6s" begin="0s" repeatCount="1" fill="freeze" />
                    <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" begin="0s" repeatCount="1" fill="freeze" />
                  </circle>
                  <text 
                    x={hexW/2} 
                    y={hexH/2} 
                    textAnchor="middle" 
                    className="font-serif text-[12px] font-bold fill-amber-300 drop-shadow-md"
                  >
                    {state.animatingStrategy.type}
                  </text>
                </g>
              )}

              {/* Floating Damage & Passive Popups */}
              {state.damagePopups && state.damagePopups.map((popup) => {
                const px = popup.col * CELL_WIDTH + hexW / 2;
                const py = popup.row * CELL_HEIGHT + (popup.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0) + hexH / 2;
                
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
