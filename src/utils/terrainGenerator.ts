import { TerrainType, GridCell } from '../types';
import { TERRAIN_MATRIX } from '../data/terrainMatrix';
import { getChanganMap } from '../data/maps/changan';
import { getProvinceTierRules } from '../data/historicalProvinceConfig';

export function generateBattleGrid(provinceId: number, overrideCols?: number, overrideRows?: number): GridCell[] {
  // If it's Chang'an, use the predefined huge map
  if (provinceId === 16) {
    return getChanganMap();
  }

  // Determine size based on tier
  const tierConfig = getProvinceTierRules(provinceId);
  const tier = tierConfig.tier;
  
  let cols = 12;
  let rows = 12;

  if (tier === 'METROPOLIS') {
    cols = 25; rows = 25;
  } else if (tier === 'COMMERCIAL' || tier === 'AGRICULTURAL') {
    cols = 20; rows = 20;
  } else if (tier === 'MIDSIZED') {
    cols = 15; rows = 15;
  } else {
    cols = 12; rows = 12;
  }

  // Allow overrides if explicitly provided
  if (overrideCols) cols = overrideCols;
  if (overrideRows) rows = overrideRows;

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
