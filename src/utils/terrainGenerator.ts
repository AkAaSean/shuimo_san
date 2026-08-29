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

  // Guarantee central City (城池) fortress layout for defender deployment
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  const cellMap = new Map<string, GridCell>();
  grid.forEach(c => cellMap.set(`${c.col},${c.row}`, c));

  // Determine city cluster size based on map tier/size
  const cityCoords: { col: number; row: number }[] = [];
  cityCoords.push({ col: centerCol, row: centerRow });
  cityCoords.push({ col: centerCol + 1, row: centerRow });
  if (cols >= 15) {
    cityCoords.push({ col: centerCol, row: centerRow + 1 });
  }
  if (cols >= 20) {
    cityCoords.push({ col: centerCol + 1, row: centerRow + 1 });
  }

  // Set central City terrain (Center hex is 太守府, surrounding are 城池)
  cityCoords.forEach(({ col, row }, idx) => {
    const cell = cellMap.get(`${col},${row}`);
    if (cell) cell.terrain = idx === 0 ? '太守府' : '城池';
  });

  // Ensure surrounding 1-ring hexes are traversable plains/gates for city defense & maneuvers
  let gatePlaced = false;
  for (let dr = -1; dr <= 2; dr++) {
    for (let dc = -1; dc <= 2; dc++) {
      const cr = centerRow + dr;
      const cc = centerCol + dc;
      if (cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
        const cell = cellMap.get(`${cc},${cr}`);
        if (cell && cell.terrain !== '城池') {
          if (!gatePlaced && (dr === -1 || dr === 2) && dc === 0) {
            cell.terrain = '關寨';
            gatePlaced = true;
          } else if (cell.terrain === '山嶽' || cell.terrain === '深水') {
            cell.terrain = '平地';
          }
        }
      }
    }
  }

  return grid;
}
