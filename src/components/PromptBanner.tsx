import React from 'react';
import { provinces } from '../data/provinces';
import { ProvinceState } from '../types';

interface PromptBannerProps {
  rulerName: string;
  selectedProvinceId: number | null;
  provincesData: Record<number, ProvinceState>;
}

export default function PromptBanner({ rulerName, selectedProvinceId, provincesData }: PromptBannerProps) {
  const province = selectedProvinceId ? provinces.find(p => p.id === selectedProvinceId) : null;
  const pData = selectedProvinceId ? provincesData[selectedProvinceId] : null;

  const isPlayerCity = pData ? pData.rulerName === rulerName : true;

  return (
    <div className="w-full bg-stone-800 text-stone-100 p-2.5 shadow-inner relative z-10 font-serif border-y-2 border-stone-600 flex items-start gap-2">
      <div className="text-xl leading-none mt-1">「</div>
      <div className="flex-1 text-sm tracking-wide leading-relaxed">
        {selectedProvinceId && province ? (
          isPlayerCity ? (
            <>
              <span className="font-bold text-amber-500">{rulerName}</span> 主公，請對我方轄區 <span className="font-bold text-sky-300">({selectedProvinceId}) {province.name}</span> 下達政令：
            </>
          ) : (
            <>
              <span className="font-bold text-amber-500">{rulerName}</span> 主公，<span className="font-bold text-amber-300">({selectedProvinceId}) {province.name}</span> (屬【{pData?.rulerName || '空白地'}】) 非我方轄區，僅開放【0.狀態】、【1.查看】與【9.系統】操作。
            </>
          )
        ) : (
          <>
            <span className="font-bold text-amber-500">{rulerName}</span> 主公，請在大地圖點選我方城池下達政令：
          </>
        )}
      </div>
      <div className="text-xl leading-none self-end mb-1">」</div>
    </div>
  );
}

