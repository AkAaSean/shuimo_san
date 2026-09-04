import { provinces } from '../data/provinces';
import { Province } from '../types';

export interface MapPass {
  name: string;
  x: number;
  y: number;
}

export const DEFAULT_PASSES: MapPass[] = [
  { name: '虎牢關', x: 1005, y: 670 },
  { name: '函谷關', x: 894, y: 674 },
  { name: '潼關', x: 701, y: 666 },
  { name: '武關', x: 830, y: 741 },
  { name: '陽平關', x: 579, y: 682 },
  { name: '劍閣', x: 592, y: 791 },
];

const CITY_COORDS_STORAGE_KEY = 'sanguo_map_city_coordinates_v2';
const PASS_COORDS_STORAGE_KEY = 'sanguo_map_pass_coordinates_v2';

export type CityCoordsMap = Record<number, { x: number; y: number }>;
export type PassCoordsMap = Record<string, { x: number; y: number }>;

export function loadStoredCityCoordinates(): CityCoordsMap {
  try {
    const raw = localStorage.getItem(CITY_COORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load city coordinates from localStorage', e);
  }
  
  // Default coordinates from provinces.ts
  const defaults: CityCoordsMap = {};
  provinces.forEach(p => {
    defaults[p.id] = { x: p.x, y: p.y };
  });
  return defaults;
}

export function saveStoredCityCoordinates(coords: CityCoordsMap): void {
  try {
    localStorage.setItem(CITY_COORDS_STORAGE_KEY, JSON.stringify(coords));
  } catch (e) {
    console.error('Failed to save city coordinates to localStorage', e);
  }
}

export function loadStoredPassCoordinates(): PassCoordsMap {
  try {
    const raw = localStorage.getItem(PASS_COORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load pass coordinates from localStorage', e);
  }

  const defaults: PassCoordsMap = {};
  DEFAULT_PASSES.forEach(p => {
    defaults[p.name] = { x: p.x, y: p.y };
  });
  return defaults;
}

export function saveStoredPassCoordinates(coords: PassCoordsMap): void {
  try {
    localStorage.setItem(PASS_COORDS_STORAGE_KEY, JSON.stringify(coords));
  } catch (e) {
    console.error('Failed to save pass coordinates to localStorage', e);
  }
}

export function resetStoredCoordinates(): { cities: CityCoordsMap; passes: PassCoordsMap } {
  try {
    localStorage.removeItem(CITY_COORDS_STORAGE_KEY);
    localStorage.removeItem(PASS_COORDS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset coordinates in localStorage', e);
  }

  const cities: CityCoordsMap = {};
  provinces.forEach(p => {
    cities[p.id] = { x: p.x, y: p.y };
  });

  const passes: PassCoordsMap = {};
  DEFAULT_PASSES.forEach(p => {
    passes[p.name] = { x: p.x, y: p.y };
  });

  return { cities, passes };
}

/**
 * 導出最新的 provinces.ts 完整程式碼
 */
export function generateProvincesTsCode(currentCityCoords: CityCoordsMap): string {
  const updatedProvinces: Province[] = provinces.map(p => {
    const coords = currentCityCoords[p.id] || { x: p.x, y: p.y };
    return {
      ...p,
      x: coords.x,
      y: coords.y,
    };
  });

  return `import { Province } from '../types';

export const provinces: Province[] = ${JSON.stringify(updatedProvinces, null, 2)};
`;
}

/**
 * 導出簡明 JSON 物件
 */
export function generateCoordinatesExportJson(
  cityCoords: CityCoordsMap, 
  passCoords: PassCoordsMap
): string {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    cities: provinces.map(p => ({
      id: p.id,
      name: p.name,
      region: p.region,
      x: cityCoords[p.id]?.x ?? p.x,
      y: cityCoords[p.id]?.y ?? p.y,
    })),
    passes: Object.entries(passCoords).map(([name, coords]) => ({
      name,
      x: coords.x,
      y: coords.y,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}
