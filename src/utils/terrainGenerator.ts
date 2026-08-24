import { TerrainType, GridCell } from '../types';
import { TERRAIN_MATRIX } from '../data/terrainMatrix';

export function generateBattleGrid(provinceId: number, cols: number = 8, rows: number = 12): GridCell[] {
  const matrix = TERRAIN_MATRIX[provinceId] || TERRAIN_MATRIX[1];
  
  // Create an array of terrain types weighted by their percentage
  const terrainPool: TerrainType[] = [];
  for (const [terrainStr, weight] of Object.entries(matrix)) {
    const terrain = terrainStr as TerrainType;
    for (let i = 0; i < weight; i++) {
      terrainPool.push(terrain);
    }
  }

  // If pool is somehow empty, fallback
  if (terrainPool.length === 0) {
    terrainPool.push('平地');
  }

  const grid: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Pick a random terrain from the pool
      const randomIdx = Math.floor(Math.random() * terrainPool.length);
      const terrain = terrainPool[randomIdx];
      
      grid.push({
        col,
        row,
        terrain,
      });
    }
  }

  // Guarantee at least one Castle or Gate if the matrix specified it
  if (matrix['城池'] && matrix['城池'] > 0) {
    const hasCastle = grid.some(c => c.terrain === '城池');
    if (!hasCastle) {
      grid[Math.floor(Math.random() * grid.length)].terrain = '城池';
    }
  }
  if (matrix['關寨'] && matrix['關寨'] > 0) {
    const hasGate = grid.some(c => c.terrain === '關寨');
    if (!hasGate) {
      grid[Math.floor(Math.random() * grid.length)].terrain = '關寨';
    }
  }

  return grid;
}
