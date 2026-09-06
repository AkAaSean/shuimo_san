import React, { useMemo } from 'react';

interface WeatherOverlayProps {
  month: number;
  enabled?: boolean;
}

export type WeatherType = 'snow' | 'rain' | 'petal' | 'leaf';

export function getSeasonInfo(month: number): {
  seasonName: string;
  weatherType: WeatherType;
  weatherName: string;
  icon: string;
  colorClass: string;
} {
  if (month === 12 || month === 1 || month === 2) {
    return {
      seasonName: '寒冬',
      weatherType: 'snow',
      weatherName: '瑞雪紛飛',
      icon: '❄️',
      colorClass: 'text-blue-200',
    };
  } else if (month >= 3 && month <= 4) {
    return {
      seasonName: '陽春',
      weatherType: 'petal',
      weatherName: '桃花飄香',
      icon: '🌸',
      colorClass: 'text-pink-300',
    };
  } else if (month >= 5 && month <= 8) {
    return {
      seasonName: '炎夏',
      weatherType: 'rain',
      weatherName: '夏日梅雨',
      icon: '🌧️',
      colorClass: 'text-cyan-300',
    };
  } else {
    return {
      seasonName: '金秋',
      weatherType: 'leaf',
      weatherName: '楓葉旋舞',
      icon: '🍂',
      colorClass: 'text-amber-300',
    };
  }
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = ({ month, enabled = true }) => {
  if (!enabled) return null;

  const season = getSeasonInfo(month);

  // Generate deterministic particle properties so they don't jump on re-renders
  const particles = useMemo(() => {
    const count = season.weatherType === 'rain' ? 45 : 32;
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo random based on index
      const seed1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const seed2 = Math.cos(i * 4.1414 + 12.345) * 23423.123;
      const rand1 = seed1 - Math.floor(seed1);
      const rand2 = seed2 - Math.floor(seed2);

      const left = `${(rand1 * 100).toFixed(2)}%`;
      const delay = `${(rand2 * 6).toFixed(2)}s`;
      const duration =
        season.weatherType === 'rain'
          ? `${(1.2 + rand1 * 1.2).toFixed(2)}s`
          : `${(4.5 + rand1 * 5.5).toFixed(2)}s`;
      const size =
        season.weatherType === 'rain'
          ? `${Math.floor(18 + rand2 * 22)}px`
          : season.weatherType === 'snow'
          ? `${Math.floor(12 + rand2 * 14)}px`
          : `${Math.floor(14 + rand2 * 16)}px`;
      const opacity = (0.4 + rand2 * 0.55).toFixed(2);

      return { id: i, left, delay, duration, size, opacity };
    });
  }, [season.weatherType]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 select-none animate-weather-fade">
      {/* 季節轉變橫幅通知 */}
      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-stone-950/90 text-amber-100 border-2 border-amber-500/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex items-center gap-2 text-xs sm:text-sm font-black tracking-wider">
          <span className="text-lg">{season.icon}</span>
          <span className="text-amber-300">【{season.seasonName} · {month}月】</span>
          <span className="text-stone-200">{season.weatherName}</span>
        </div>
      </div>

      {/* 季節專屬大氣濾鏡色調 */}
      {season.weatherType === 'snow' && (
        <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none" />
      )}
      {season.weatherType === 'rain' && (
        <>
          <div className="absolute inset-0 bg-slate-900/15 mix-blend-multiply pointer-events-none" />
          {/* 夏雨遠處微弱閃電 */}
          <div className="absolute inset-0 bg-cyan-100/30 weather-lightning pointer-events-none" />
        </>
      )}
      {season.weatherType === 'leaf' && (
        <div className="absolute inset-0 bg-amber-900/5 mix-blend-color-burn pointer-events-none" />
      )}
      {season.weatherType === 'petal' && (
        <div className="absolute inset-0 bg-rose-900/5 mix-blend-soft-light pointer-events-none" />
      )}

      {/* 粒子流 */}
      {particles.map((p) => {
        if (season.weatherType === 'snow') {
          return (
            <div
              key={p.id}
              className="absolute weather-snow rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
              style={{
                left: p.left,
                top: '-20px',
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                opacity: p.opacity,
              }}
            />
          );
        }

        if (season.weatherType === 'rain') {
          return (
            <div
              key={p.id}
              className="absolute weather-rain bg-gradient-to-b from-cyan-200/90 to-transparent rounded-full transform -rotate-12"
              style={{
                left: p.left,
                top: '-40px',
                width: '2px',
                height: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                opacity: p.opacity,
              }}
            />
          );
        }

        if (season.weatherType === 'leaf') {
          return (
            <div
              key={p.id}
              className="absolute weather-leaf text-amber-500/85 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              style={{
                left: p.left,
                top: '-20px',
                fontSize: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                opacity: p.opacity,
              }}
            >
              🍂
            </div>
          );
        }

        if (season.weatherType === 'petal') {
          return (
            <div
              key={p.id}
              className="absolute weather-petal text-pink-300/85 filter drop-shadow-[0_1px_3px_rgba(255,192,203,0.5)]"
              style={{
                left: p.left,
                top: '-20px',
                fontSize: p.size,
                animationDelay: p.delay,
                animationDuration: p.duration,
                opacity: p.opacity,
              }}
            >
              🌸
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default WeatherOverlay;
