import React, { useState } from 'react';
import { ITEM_SPRITES_MAPPING } from '../data/itemSpritesMapping';

interface ItemAvatarProps {
  name: string;
  size?: number; // 預設 48px
  className?: string;
  showBorder?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
}

export const ItemAvatar: React.FC<ItemAvatarProps> = ({
  name,
  size = 48,
  className = '',
  showBorder = true,
  onClick,
  title
}) => {
  const [imageError, setImageError] = useState(false);
  const spriteInfo = ITEM_SPRITES_MAPPING[name];
  const rawImageSrc = spriteInfo ? spriteInfo.imagePath : null;
  const imageSrc = rawImageSrc && rawImageSrc.startsWith('/') ? '.' + rawImageSrc : rawImageSrc;

  if (imageError || !imageSrc) {
    // 降級純文字/印鑑風格
    return (
      <div
        onClick={onClick}
        className={`flex items-center justify-center rounded bg-amber-950 text-amber-200 font-bold border border-amber-800 select-none shadow-inner shrink-0 ${
          onClick ? 'cursor-pointer hover:border-amber-400 hover:brightness-110 active:scale-95' : ''
        } ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.35) }}
        title={title || name}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded overflow-hidden select-none shrink-0 bg-[#2b241c] ${
        showBorder ? 'border border-[#785b3a]/80 shadow-sm' : ''
      } ${onClick ? 'cursor-pointer hover:border-amber-400 hover:shadow-md hover:brightness-110 active:scale-95 transition-all' : ''} ${className}`}
      style={{
        width: size,
        height: size,
      }}
      title={title || name}
    >
      <img
        src={imageSrc}
        alt={name}
        className="w-full h-full object-contain p-0.5"
        style={{ imageRendering: 'pixelated' }}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
};
