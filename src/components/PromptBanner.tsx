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
    <div className="w-full bg-stone-900 text-stone-200 px-3 py-1 shadow-inner relative z-10 font-serif border-y border-stone-700 flex items-center justify-between text-xs sm:text-xs leading-normal select-none">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
        <span className="text-amber-400 font-bold shrink-0 text-[11px]">◆</span>
        <div className="truncate text-stone-300">
          {selectedProvinceId && province ? (
            isPlayerCity ? (
              <>
                <span className="font-black text-amber-400">【{rulerName}】</span>
                <span>請對 </span>
                <span className="font-bold text-sky-300">({selectedProvinceId}) {province.name}</span>
                <span> 下達政令</span>
              </>
            ) : (
              <>
                <span className="font-black text-amber-400">【{rulerName}】</span>
                <span className="font-bold text-amber-200">({selectedProvinceId}) {province.name}</span>
                <span className="text-stone-400"> (屬【{pData?.rulerName || '空白地'}】) 非我轄區，僅限狀態/查看/系統</span>
              </>
            )
          ) : (
            <>
              <span className="font-black text-amber-400">【{rulerName}】</span>
              <span>請點選地圖我方城池下達政令</span>
            </>
          )}
        </div>
      </div>
      <div className="text-[10px] text-stone-500 font-sans shrink-0 hidden sm:block">
        君主親臨
      </div>
    </div>
  );
}


