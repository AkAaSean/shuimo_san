import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BattleState, GridCell, BattleUnit, TerrainType } from '../types';

interface BattleGridProps {
  state: BattleState;
  onSelectUnit: (unitId: string) => void;
  onSelectCell: (col: number, row: number) => void;
}

const CELL_WIDTH = 60;
const CELL_HEIGHT = 60;
const COLS = 8;
const ROWS = 12;

function getTerrainColor(terrain: TerrainType): string {
  switch (terrain) {
    case '平地': return '#e7e5e4'; // stone-200
    case '山丘': return '#a8a29e'; // stone-400
    case '樹林': return '#d1fae5'; // emerald-100 (light for visibility, will use stroke/texture conceptually)
    case '淺水': return '#bae6fd'; // sky-200
    case '深水': return '#7dd3fc'; // sky-300
    case '城池': return '#57534e'; // stone-600
    case '關寨': return '#b45309'; // amber-700
    case '沙漠': return '#fef08a'; // yellow-200
    case '沼澤': return '#bbf7d0'; // green-200
    default: return '#e7e5e4';
  }
}

function getTerrainLabel(terrain: TerrainType): string {
  return terrain;
}

export default function BattleGrid({ state, onSelectUnit, onSelectCell }: BattleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const gridWidth = COLS * CELL_WIDTH;
  const gridHeight = ROWS * CELL_HEIGHT + CELL_HEIGHT / 2; // Extra half for staggering

  return (
    <div 
      className="flex-1 w-full relative overflow-hidden bg-stone-100 flex items-center justify-center"
      ref={containerRef}
    >
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-300 to-stone-400 z-0"></div>

      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        className="absolute origin-center cursor-grab active:cursor-grabbing z-10"
        style={{ width: gridWidth, height: gridHeight, scale }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${gridWidth} ${gridHeight}`}
          className="drop-shadow-md"
        >
          {/* Draw Grid Cells */}
          {state.grid.map((cell) => {
            const x = cell.col * CELL_WIDTH;
            const y = cell.row * CELL_HEIGHT + (cell.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
            
            // Render Cell
            return (
              <g 
                key={`${cell.col}-${cell.row}`} 
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectCell(cell.col, cell.row)}
              >
                <rect 
                  width={CELL_WIDTH} 
                  height={CELL_HEIGHT} 
                  fill={getTerrainColor(cell.terrain)}
                  stroke="#78716c" // stone-500
                  strokeWidth="1"
                />
                <text
                  x={CELL_WIDTH / 2}
                  y={CELL_HEIGHT / 2 - 4}
                  textAnchor="middle"
                  className="font-serif text-[10px] fill-stone-800 opacity-60"
                >
                  {getTerrainLabel(cell.terrain)}
                </text>
              </g>
            );
          })}

          {/* Draw Units */}
          {state.units.map((unit) => {
            const x = unit.col * CELL_WIDTH;
            const y = unit.row * CELL_HEIGHT + (unit.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0);
            const isSelected = unit.id === state.activeUnitId;
            const isAttacker = unit.isAttacker;
            
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
                {/* Unit Flag/Icon */}
                <rect 
                  x={CELL_WIDTH / 2 - 16} 
                  y={CELL_HEIGHT / 2 - 8} 
                  width={32} 
                  height={24} 
                  fill={isAttacker ? '#be123c' : '#0369a1'} // rose-700 : sky-700
                  stroke={isSelected ? '#fde047' : '#1c1917'} // yellow-300 : stone-900
                  strokeWidth={isSelected ? 2 : 1}
                  rx={2}
                />
                <text
                  x={CELL_WIDTH / 2}
                  y={CELL_HEIGHT / 2 + 5}
                  textAnchor="middle"
                  className="font-serif text-[12px] font-bold fill-stone-100"
                >
                  {unit.isCommander ? '帥' : '將'}
                </text>
                
                {/* Troops indicator */}
                <rect
                  x={CELL_WIDTH / 2 - 14} 
                  y={CELL_HEIGHT / 2 + 18} 
                  width={28} 
                  height={12} 
                  fill="#f5f5f4" // stone-100
                  stroke="#44403c" // stone-800
                  strokeWidth="0.5"
                />
                <text
                  x={CELL_WIDTH / 2}
                  y={CELL_HEIGHT / 2 + 27}
                  textAnchor="middle"
                  className={`font-serif text-[9px] font-bold ${isAttacker ? 'fill-rose-900' : 'fill-sky-900'}`}
                >
                  {unit.troops}
                </text>
              </g>
            );
          })}

          {/* Draw Animations */}
          {state.animatingStrategy && (
            <g transform={`translate(${state.animatingStrategy.col * CELL_WIDTH}, ${state.animatingStrategy.row * CELL_HEIGHT + (state.animatingStrategy.col % 2 !== 0 ? CELL_HEIGHT / 2 : 0)})`}>
              <circle cx={CELL_WIDTH/2} cy={CELL_HEIGHT/2} r={CELL_WIDTH/2} fill="red" opacity="0.5">
                <animate attributeName="r" from="0" to={CELL_WIDTH} dur="0.5s" begin="0s" repeatCount="1" fill="freeze" />
                <animate attributeName="opacity" from="0.8" to="0" dur="0.5s" begin="0s" repeatCount="1" fill="freeze" />
              </circle>
            </g>
          )}

        </svg>
      </motion.div>
      
      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-20">
        <button 
          onClick={() => setScale(s => Math.min(s + 0.3, 3))}
          className="w-10 h-10 bg-stone-200/80 border border-stone-800 rounded-full flex items-center justify-center text-xl font-serif text-stone-800 shadow-md backdrop-blur-sm active:bg-stone-300"
        >
          ＋
        </button>
        <button 
          onClick={() => setScale(s => Math.max(s - 0.3, 0.5))}
          className="w-10 h-10 bg-stone-200/80 border border-stone-800 rounded-full flex items-center justify-center text-xl font-serif text-stone-800 shadow-md backdrop-blur-sm active:bg-stone-300"
        >
          －
        </button>
      </div>
    </div>
  );
}
