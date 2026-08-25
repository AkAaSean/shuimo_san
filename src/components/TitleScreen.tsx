import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SCENARIOS } from '../data/scenarios';
import { provinces } from '../data/provinces';
import scenarioBg from '../assets/images/scenario_bg_1787577790883.jpg';

interface TitleScreenProps {
  onStartGame: (scenarioIndex: number, rulerName: string) => void;
}

export default function TitleScreen({ onStartGame }: TitleScreenProps) {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [selectedRuler, setSelectedRuler] = useState<string | null>(null);

  const handleSelectScenario = (id: number) => {
    setSelectedScenario(id);
    setSelectedRuler(null);
  };

  const handleSelectRuler = (rulerName: string) => {
    setSelectedRuler(rulerName);
  };

  const handleConfirmStart = () => {
    if (selectedScenario !== null && selectedRuler !== null) {
      onStartGame(selectedScenario, selectedRuler);
    }
  };

  return (
    <div className="w-full max-w-[480px] h-full bg-[#f2efeb] text-[#1c1917] relative flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden font-serif border-x-[15px] border-[#333]">
      {/* Background Image (Traditional Chinese Ink Painting) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img 
          src={scenarioBg} 
          alt="Title Background" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-60 scale-105 filter contrast-125"
        />
        {/* Subtle Rice Paper / Vignette Gradient */}
        <div 
          className="absolute inset-0" 
          style={{
            background: 'radial-gradient(circle at center, rgba(242, 239, 235, 0.4) 0%, rgba(242, 239, 235, 0.75) 100%), linear-gradient(to bottom, rgba(242,239,235,0.3) 0%, rgba(242,239,235,0.7) 100%)'
          }}
        />
      </div>

      {/* Background Texture (Grid overlay) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(rgba(28, 25, 23, 0.08) 1px, transparent 0), linear-gradient(to bottom, transparent calc(40px - 1px), rgba(28, 25, 23, 0.08) calc(40px - 1px))`,
          backgroundSize: '40px 40px'
        }}
      ></div>
      
      {/* Title Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="pt-14 pb-6 text-center flex flex-col items-center z-10 drop-shadow-sm"
      >
        <div className="relative inline-block px-2">
          <h1 
            className="font-['Ma_Shan_Zheng','LXGW_WenKai_TC','Noto_Serif_TC',serif] text-[4rem] sm:text-[4.8rem] leading-none mb-3 text-[#1c1917]"
            style={{ textShadow: '3px 3px 0px rgba(255,255,255,0.9), -1px -1px 0px rgba(255,255,255,0.9)' }}
          >
            水墨三國
          </h1>
          <span className="absolute -top-2 right-0 bg-[#991b1b] text-amber-100 text-xs font-bold font-mono px-2 py-0.5 rounded-full border border-amber-300 shadow-sm">
            V0.1
          </span>
        </div>
        <div className="text-[0.7rem] tracking-[0.3em] uppercase text-[#991b1b] font-extrabold border-y-2 border-[#991b1b] py-1 px-4 inline-block bg-[#f2efeb]/80 backdrop-blur-xs shadow-xs">
          HTML5 MOBILE STRATEGY • V0.1
        </div>
        <div className="text-[0.75rem] font-black tracking-wider text-[#1c1917]/80 mt-2 bg-[#f2efeb]/70 px-3 py-0.5 rounded border border-[#1c1917]/20 flex items-center gap-1.5">
          <span>Design by Sean Chuang</span>
          <span className="text-[#991b1b] font-mono font-bold">| V0.1 測試版</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedScenario === null ? (
          <motion.div
            key="scenarios"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 w-full px-8 flex flex-col gap-4 z-10 overflow-y-auto pb-10"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="text-center text-[0.85rem] font-black tracking-[0.15em] mb-1 text-[#1c1917] bg-[#f2efeb]/70 py-1 rounded backdrop-blur-xs border border-[#1c1917]/20">
              ◆ 選擇時代劇本 ◆
            </div>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectScenario(s.id)}
                className="w-full text-left p-4 bg-[#f2efeb]/85 hover:bg-white/95 backdrop-blur-xs border-2 border-[#1c1917] flex flex-col active:scale-95 transition-all cursor-pointer relative shadow-[4px_4px_0_#1c1917]"
              >
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[1.5rem] font-black tracking-wide text-[#1c1917]">{s.title}</span>
                  <span className="text-xs text-[#991b1b] font-black bg-red-100/80 px-2 py-0.5 border border-[#991b1b]">西元 {s.year} 年</span>
                </div>
                <div className="text-[0.85rem] font-bold text-stone-700">{s.subtitle}</div>
              </button>
            ))}
          </motion.div>
        ) : selectedRuler === null ? (
          <motion.div
            key="rulers"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 w-full flex flex-col z-10 overflow-hidden relative"
          >
            <div className="flex justify-between items-center px-8 py-3 bg-[#1c1917] text-[#f2efeb] shadow-md">
              <button 
                onClick={() => setSelectedScenario(null)}
                className="border border-[#f2efeb] bg-transparent text-[#f2efeb] px-3 py-1 text-[0.75rem] font-bold uppercase cursor-pointer hover:bg-white/20 transition-colors"
              >
                返回
              </button>
              <span className="text-[0.85rem] font-black tracking-[0.1em]">◆ 選擇扮演君主 ◆</span>
              <div className="w-[50px]"></div>
            </div>
            
            <div className="p-4 border-b-2 border-[#1c1917] mx-8 text-center mt-3 bg-[#f2efeb]/90 backdrop-blur-xs border border-[#1c1917] shadow-[3px_3px_0_#1c1917]">
              <div className="text-[1.4rem] font-black mb-0.5">{SCENARIOS[selectedScenario].title}</div>
              <div className="text-[0.85rem] font-bold text-stone-700">{SCENARIOS[selectedScenario].subtitle}</div>
            </div>

            <div 
              className="flex-1 overflow-y-auto px-8 py-4 grid grid-cols-2 gap-3.5"
              style={{ scrollbarWidth: 'none' }}
            >
              {SCENARIOS[selectedScenario].rulers.map((ruler, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectRuler(ruler.name)}
                  className="bg-[#f2efeb]/90 hover:bg-white border-2 border-[#1c1917] p-3 flex items-center gap-3 cursor-pointer relative transition-all active:scale-[0.97] shadow-[3px_3px_0_#1c1917]"
                >
                  <div className="w-10 h-10 border-2 border-[#1c1917] flex items-center justify-center font-black text-[1.2rem] bg-amber-50 text-[#991b1b] shadow-[2px_2px_0_#1c1917]">
                    {ruler.name.charAt(0)}
                  </div>
                  <span className="text-[1.1rem] font-black text-[#1c1917]">{ruler.name}</span>
                </button>
              ))}
            </div>
            
            <div className="p-3 text-center text-[0.6rem] tracking-[0.2em] font-bold text-stone-600 uppercase bg-[#f2efeb]/60 backdrop-blur-xs">
              System version 1.0.4 // Grid coordinated selection
            </div>
            <div className="absolute bottom-8 right-8 w-[50px] h-[50px] border-2 border-[#991b1b] text-[#991b1b] flex items-center justify-center font-black text-[0.8rem] -rotate-[15deg] opacity-60 pointer-events-none bg-white/40">
              三國
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 w-full flex flex-col z-10 overflow-hidden relative"
          >
            <div className="flex justify-between items-center px-8 py-3 bg-[#1c1917] text-[#f2efeb] shadow-md">
              <button 
                onClick={() => setSelectedRuler(null)}
                className="border border-[#f2efeb] bg-transparent text-[#f2efeb] px-3 py-1 text-[0.75rem] font-bold uppercase cursor-pointer hover:bg-white/20 transition-colors"
              >
                返回
              </button>
              <span className="text-[0.85rem] font-black tracking-[0.1em]">◆ 勢力情報 ◆</span>
              <div className="w-[50px]"></div>
            </div>
            
            <div className="p-4 border-b-2 border-[#1c1917] mx-8 text-center mt-3 bg-[#f2efeb]/90 backdrop-blur-xs border border-[#1c1917] shadow-[3px_3px_0_#1c1917]">
              <div className="text-[1.4rem] font-black mb-0.5">{SCENARIOS[selectedScenario].title}</div>
              <div className="text-[0.85rem] font-bold text-stone-700">{SCENARIOS[selectedScenario].subtitle}</div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-5 items-center" style={{ scrollbarWidth: 'none' }}>
              <div className="flex flex-col items-center gap-2 bg-[#f2efeb]/90 p-4 border-2 border-[#1c1917] w-full shadow-[3px_3px_0_#1c1917]">
                 <div className="w-16 h-16 border-2 border-[#1c1917] flex items-center justify-center font-black text-[2.2rem] bg-amber-50 text-[#991b1b] shadow-[3px_3px_0_#1c1917]">
                    {selectedRuler.charAt(0)}
                 </div>
                 <div className="text-[1.5rem] font-black">{selectedRuler}</div>
              </div>
              
              <div className="w-full">
                <div className="text-[0.85rem] font-black tracking-[0.1em] border-b-2 border-[#1c1917] pb-1 mb-3 text-center">初始統治州郡</div>
                <div className="flex flex-col gap-2">
                  {SCENARIOS[selectedScenario].rulers.find(r => r.name === selectedRuler)?.provinces.map(provId => {
                    const p = provinces.find(prov => prov.id === provId);
                    return (
                      <div key={provId} className="bg-[#f2efeb]/95 border-2 border-[#1c1917] p-2.5 text-center text-[0.95rem] font-black flex justify-center items-center gap-2 shadow-[2px_2px_0_#1c1917]">
                        <span className="text-[0.75rem] bg-[#1c1917] text-white px-2 py-0.5 font-bold">{provId}</span>
                        <span>{p?.name}</span>
                        <span className="text-[0.75rem] text-[#991b1b] font-extrabold">({p?.region})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 pt-3">
              <button 
                onClick={handleConfirmStart}
                className="w-full bg-[#991b1b] hover:bg-red-800 text-[#f2efeb] text-[1.2rem] font-black py-3.5 border-2 border-[#1c1917] shadow-[4px_4px_0_#1c1917] active:scale-[0.98] active:shadow-[2px_2px_0_#1c1917] transition-all cursor-pointer"
              >
                開始霸業
              </button>
            </div>
            
            <div className="absolute bottom-8 right-8 w-[50px] h-[50px] border-2 border-[#991b1b] text-[#991b1b] flex items-center justify-center font-black text-[0.8rem] -rotate-[15deg] opacity-60 pointer-events-none bg-white/40">
              三國
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
