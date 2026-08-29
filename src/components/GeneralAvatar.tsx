import React, { useState } from 'react';
import { getGeneralAvatarUrl, GENERAL_AVATAR_MAP } from '../data/avatarMapping';

interface GeneralAvatarProps {
  name: string;
  size?: number; // 預設 48px
  className?: string;
  forceFaction?: 'shu' | 'wei' | 'wu' | 'others';
  showBorder?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const GeneralAvatar: React.FC<GeneralAvatarProps> = ({ 
  name, 
  size = 48, 
  className = '', 
  forceFaction,
  showBorder = true,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = getGeneralAvatarUrl(name, forceFaction);

  if (imageError) {
    // 圖片載入失敗時的優雅降級顯示 (古典水墨印記風格)
    return (
      <div 
        onClick={onClick}
        className={`flex items-center justify-center rounded bg-stone-800 text-amber-200 font-bold border border-amber-900/50 select-none shadow-inner ${onClick ? 'cursor-pointer hover:border-amber-400 hover:brightness-110 active:scale-95' : ''} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.42) }}
        title={name}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded overflow-hidden select-none ${
        showBorder ? 'border border-[#785b3a]/70 shadow-sm bg-[#1e1711]' : ''
      } ${onClick ? 'cursor-pointer hover:border-amber-400 hover:shadow-md hover:brightness-110 active:scale-95 transition-all' : ''} ${className}`}
      style={{
        width: size,
        height: size,
      }}
      title={name}
    >
      <img 
        src={avatarUrl} 
        alt={name} 
        className="w-full h-full object-cover rendering-pixelated transform transition-transform hover:scale-105"
        style={{ imageRendering: 'pixelated' }}
        onError={() => setImageError(true)} 
        loading="lazy"
      />
    </div>
  );
};

