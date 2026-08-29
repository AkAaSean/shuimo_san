import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState } from '../types';
import { provinces } from '../data/provinces';
import { getGeneralItemBonus } from '../data/items';
import { getProvinceTierRules, calculateDevGain, calculateFloodGain } from '../data/historicalProvinceConfig';
import { getGeneralAmbition } from '../data/historicalLoyalty';
import { getStrategistReport } from '../engine/strategistAdvice';
import { GeneralAvatar } from './GeneralAvatar';

interface ActionModalProps {
  isOpen: boolean;
  category: string;
  action: string;
  gameState: GameState;
  onClose: () => void;
  onConfirm: (generalName: string, payload?: any) => void;
}

export default function ActionModal({
  isOpen,
  category,
  action,
  gameState,
  onClose,
  onConfirm,
}: ActionModalProps) {
  const ownedProvinces = Object.values(gameState.provincesData).filter(p => p.rulerName === gameState.rulerName);
  const selectedIsOwned = gameState.selectedProvinceId !== null && gameState.provincesData[gameState.selectedProvinceId]?.rulerName === gameState.rulerName;
  const provinceId = selectedIsOwned 
    ? gameState.selectedProvinceId 
    : (ownedProvinces.length > 0 ? ownedProvinces[0].id : 1);
    
  const province = provinceId !== null ? gameState.provincesData[provinceId] : null;
  const currentProvinceInfo = provinceId !== null ? provinces.find(p => p.id === provinceId) : null;
  const tierRules = getProvinceTierRules(provinceId ?? 1);
  
  const generals = provinceId !== null ? Object.values(gameState.generalsData).filter(g => g.provinceId === provinceId && !g.isWild) : [];
  const availableGenerals = generals.filter(g => !g.hasActed);

  // 全勢力武將（供君主指令如『指定軍師』選擇）
  const playerProvinces = Object.values(gameState.provincesData)
    .filter(p => p.rulerName === gameState.rulerName)
    .map(p => p.id);
  const allPlayerGenerals = Object.values(gameState.generalsData)
    .filter(g => g.provinceId !== null && playerProvinces.includes(g.provinceId) && !g.isWild);

  const foreignGenerals = Object.values(gameState.generalsData).filter(
    g => g.provinceId !== null && !g.isWild && gameState.provincesData[g.provinceId]?.rulerName !== gameState.rulerName
  );

  const foreignProvincesWithGenerals = Object.values(gameState.provincesData).filter(
    p => p.rulerName !== gameState.rulerName && 
         Object.values(gameState.generalsData).some(g => g.provinceId === p.id && !g.isWild)
  );

  const ownedProvincesList = Object.values(gameState.provincesData)
    .filter(p => p.rulerName === gameState.rulerName)
    .map(p => ({
      id: p.id,
      info: provinces.find(x => x.id === p.id),
      state: p,
      prefect: Object.values(gameState.generalsData).find(g => g.provinceId === p.id && g.role === '太守')
    }));

  const displayGeneralsList = action === '指定軍師' 
    ? allPlayerGenerals.filter(g => !g.isRuler)
    : (action === '指定太守'
       ? generals.filter(g => !g.isRuler)
       : (action === '賞賜金帛' || action === '賞賜物品' || action === '登用他國人才' ? allPlayerGenerals : availableGenerals));

  const [selectedGeneralName, setSelectedGeneralName] = useState<string | null>(null);
  
  // Extra action parameters
  const [sliderVal, setSliderVal] = useState<number>(10);
  const [targetProvinceId, setTargetProvinceId] = useState<number | null>(null);
  const [targetGeneralName, setTargetGeneralName] = useState<string | null>(null);
  const [secondarySliderVal, setSecondarySliderVal] = useState<number>(0);
  const [selectedTreasureName, setSelectedTreasureName] = useState<string>('黃金錦囊');
  const [isAutonomousToggle, setIsAutonomousToggle] = useState<boolean>(true);

  const generalsInSelectedProv = targetProvinceId !== null 
    ? foreignGenerals.filter(fg => fg.provinceId === targetProvinceId)
    : [];

  // Reset or set defaults when action changes
  useEffect(() => {
    if (action === '指定軍師') {
      const candidateStrategists = allPlayerGenerals.filter(g => !g.isRuler);
      const sorted = [...candidateStrategists].sort((a, b) => {
        const aBonus = getGeneralItemBonus(a.name, gameState.currentScenario).intBonus;
        const bBonus = getGeneralItemBonus(b.name, gameState.currentScenario).intBonus;
        return (b.int + bBonus) - (a.int + aBonus);
      });
      if (sorted.length > 0) {
        setSelectedGeneralName(sorted[0].name);
      } else {
        setSelectedGeneralName(null);
      }
    } else if (action === '指定太守') {
      const nonRulerGens = generals.filter(g => !g.isRuler);
      const sorted = [...nonRulerGens].sort((a, b) => (b.pol + b.cha) - (a.pol + a.cha));
      if (sorted.length > 0) {
        setSelectedGeneralName(sorted[0].name);
      } else {
        setSelectedGeneralName(null);
      }
    } else if (action === '賞賜金帛' || action === '賞賜物品') {
      setSliderVal(20);
      if (allPlayerGenerals.length > 0) {
        setSelectedGeneralName(allPlayerGenerals[0].name);
        const unrewarded = allPlayerGenerals.find(g => !g.rewardedThisMonth);
        setTargetGeneralName(unrewarded ? unrewarded.name : allPlayerGenerals[0].name);
      }
      setSelectedTreasureName('黃金錦囊');
    } else if (action === '登用他國人才' || action === '流言煽動' || action === '驅虎吞狼' || action === '離間君臣' || action === '勸降逼降' || action === '同盟締結' || action === '進貢金糧') {
      if (action === '進貢金糧') {
        setSelectedTreasureName('金');
        setSliderVal(1000);
      }
      if (action === '登用他國人才' || action === '同盟締結' || action === '進貢金糧') {
        const sortedEnvoy = [...allPlayerGenerals].sort((a, b) => (b.cha + b.pol) - (a.cha + a.pol));
        if (sortedEnvoy.length > 0) setSelectedGeneralName(sortedEnvoy[0].name);
      } else {
        const sortedEnvoy = [...availableGenerals].sort((a, b) => b.int - a.int);
        if (sortedEnvoy.length > 0) setSelectedGeneralName(sortedEnvoy[0].name);
      }

      const validProvs = action === '離間君臣' || action === '登用他國人才' 
        ? foreignProvincesWithGenerals 
        : Object.values(gameState.provincesData).filter(p => p.rulerName !== gameState.rulerName && p.rulerName !== null);

      if (validProvs.length > 0) {
        const defaultProvId = validProvs[0].id;
        setTargetProvinceId(defaultProvId);
        const gensInDefaultProv = foreignGenerals.filter(fg => fg.provinceId === defaultProvId);
        if (gensInDefaultProv.length > 0) {
          const sortedTarget = [...gensInDefaultProv].sort((a, b) => a.loyalty - b.loyalty);
          setTargetGeneralName(sortedTarget[0].name);
        } else {
          setTargetGeneralName(null);
        }
      } else {
        setTargetProvinceId(null);
        setTargetGeneralName(null);
      }
    } else if (action === '郡縣自治') {
      const rulerGen = Object.values(gameState.generalsData).find(g => g.name === gameState.rulerName);
      const rulerProvId = rulerGen?.provinceId;
      const initialTarget = (provinceId !== rulerProvId) ? provinceId : (ownedProvincesList.find(op => op.id !== rulerProvId)?.id || provinceId);
      setTargetProvinceId(initialTarget);
      const initialTargetProv = initialTarget ? gameState.provincesData[initialTarget] : null;
      setIsAutonomousToggle(!(initialTargetProv?.isAutonomous));
      if (allPlayerGenerals.length > 0) setSelectedGeneralName(allPlayerGenerals[0].name);
    } else if (availableGenerals.length > 0) {
      if (category === '內政') {
        const sorted = [...availableGenerals].sort((a, b) => b.pol - a.pol);
        setSelectedGeneralName(sorted[0].name);
      } else if (category === '謀略') {
        const sorted = [...availableGenerals].sort((a, b) => b.int - a.int);
        setSelectedGeneralName(sorted[0].name);
      } else if (category === '商業') {
        const sorted = [...availableGenerals].sort((a, b) => (action === '開倉賑民' ? b.cha - a.cha : b.pol - a.pol));
        setSelectedGeneralName(sorted[0].name);
      } else {
        setSelectedGeneralName(availableGenerals[0].name);
      }
    } else {
      setSelectedGeneralName(null);
    }

    if (action === '土地開發' || action === '商業開發' || action === '開發商業' || action === '洪水防治') {
      setSliderVal(100);
    } else if (action === '買入米糧') {
      setSliderVal(province ? Math.min(1000, province.gold) : 10);
    } else if (action === '賣出米糧') {
      setSliderVal(province ? Math.min(10000, province.food) : 100);
    } else if (action === '開倉賑民') {
      setSliderVal(100);
    } else if (action === '運送錢糧') {
      setSliderVal(province ? Math.min(50, province.gold) : 0);
      setSecondarySliderVal(province ? Math.min(200, province.food) : 0);
    } else if (action === '登用人才') {
      // Find discovered wild talents in this province
      const discoveredWild = Object.values(gameState.generalsData).filter(
        g => g.isWild && g.provinceId === provinceId && (gameState.wildGenerals || []).includes(g.name)
      );
      if (discoveredWild.length > 0) {
        setTargetGeneralName(discoveredWild[0].name);
      } else {
        setTargetGeneralName(null);
      }
    }

    if (currentProvinceInfo && currentProvinceInfo.connections.length > 0) {
      let cpList = currentProvinceInfo.connections.map(id => ({
        id,
        state: gameState.provincesData[id]
      }));
      if (action === '運送錢糧') {
        cpList = cpList.filter(cp => cp.state?.rulerName === gameState.rulerName);
      }
      if (cpList.length > 0) {
        setTargetProvinceId(cpList[0].id);
      } else {
        setTargetProvinceId(null);
      }
    }
  }, [action, category, isOpen, provinceId]);

  if (!isOpen || !province || !currentProvinceInfo) return null;

  const selectedGen = selectedGeneralName ? gameState.generalsData[selectedGeneralName] : null;

  let primaryStatKey: 'pol' | 'int' | 'str' | 'cha' = 'pol';
  let primaryStatLabel = '政治';
  let statColor = 'text-amber-700';

  if (category === '內政') {
    primaryStatKey = 'pol';
    primaryStatLabel = '政治';
    statColor = 'text-amber-700';
  } else if (category === '謀略' || action === '指定軍師') {
    primaryStatKey = 'int';
    primaryStatLabel = '智力';
    statColor = 'text-indigo-700';
  } else if (category === '商業') {
    if (action === '開倉賑民') {
      primaryStatKey = 'cha';
      primaryStatLabel = '魅力';
      statColor = 'text-rose-700';
    } else {
      primaryStatKey = 'pol';
      primaryStatLabel = '政治';
      statColor = 'text-amber-700';
    }
  } else if (action === '同盟締結' || action === '進貢金糧') {
    primaryStatKey = 'cha';
    primaryStatLabel = '政/魅';
    statColor = 'text-purple-700';
  } else if (category === '人事' || category === '君主') {
    if (action === '指定軍師') {
      primaryStatKey = 'int';
      primaryStatLabel = '智力';
      statColor = 'text-indigo-700';
    } else if (action === '指定太守') {
      primaryStatKey = 'pol';
      primaryStatLabel = '政治';
      statColor = 'text-amber-700';
    } else {
      primaryStatKey = 'cha';
      primaryStatLabel = '魅力';
      statColor = 'text-rose-700';
    }
  }

  let canExecute = true;
  let errorMsg = '';

  if (action === '指定太守') {
    const isRulerInCurrentCity = generals.some(g => g.isRuler);
    if (isRulerInCurrentCity) {
      canExecute = false;
      errorMsg = '君主親自坐鎮本郡，君主即為太守，無須另指派太守！';
    } else if (!selectedGen) {
      canExecute = false;
      errorMsg = '本郡無非君主武將可指派為太守';
    } else if (selectedGen.role === '太守') {
      canExecute = false;
      errorMsg = `【${selectedGen.name}】目前已是本郡太守`;
    }
  } else if (action === '指定軍師') {
    if (!selectedGen) {
      canExecute = false;
      errorMsg = '麾下尚無非君主武將可供任命為軍師';
    } else if (selectedGen.isRuler) {
      canExecute = false;
      errorMsg = '君主高居人極，不可自任為軍師，請從麾下文臣重臣中遴選！';
    } else {
      const itemBonus = getGeneralItemBonus(selectedGen.name, gameState.currentScenario);
      const totalInt = selectedGen.int + itemBonus.intBonus;
      if (totalInt <= 80) {
        canExecute = false;
        errorMsg = `【${selectedGen.name}】智力為 ${totalInt}，指派軍師至少需智力大於 80（含寶物加成）`;
      }
    }
  } else if (action === '賞賜金帛' || action === '賞賜物品') {
    const targetGen = targetGeneralName ? gameState.generalsData[targetGeneralName] : null;
    if (!selectedGen) {
      canExecute = false;
      errorMsg = '麾下無武將可主持賞賜';
    } else if (province.gold < 20) {
      canExecute = false;
      errorMsg = '郡庫黃金不足 20 金';
    } else if (!targetGen) {
      canExecute = false;
      errorMsg = '請選擇要賞賜的武將';
    }
  } else if (action === '郡縣自治') {
    if (!targetProvinceId) {
      canExecute = false;
      errorMsg = '請選擇要設定自治的州郡';
    }
  } else if (action === '登用他國人才' || action === '流言煽動' || action === '驅虎吞狼' || action === '離間君臣' || action === '勸降逼降' || action === '同盟締結' || action === '進貢金糧') {
    if (!selectedGen) {
      canExecute = false;
      errorMsg = '無可派遣之使者/武將';
    } else if (selectedGen.hasActed) {
      canExecute = false;
      errorMsg = `【${selectedGen.name}】本月已執行過任務`;
    } else {
      const itemBonus = getGeneralItemBonus(selectedGen.name, gameState.currentScenario);
      const totalInt = selectedGen.int + itemBonus.intBonus;
      const totalPolCha = selectedGen.pol + selectedGen.cha + itemBonus.polBonus + itemBonus.chaBonus;
      
      if ((action === '進貢金糧' || action === '同盟締結') && totalPolCha < 150) {
        canExecute = false;
        errorMsg = '外交使者需具備 政治+魅力 總和至少 150';
      } else if (action !== '登用他國人才' && action !== '同盟締結' && action !== '進貢金糧' && totalInt < 80) {
        canExecute = false;
        errorMsg = '執行此計略需要智力至少 80 以上';
      } else if (action === '流言煽動' && province.gold < 300) {
        canExecute = false;
        errorMsg = '需要資金 300 金';
      } else if (action === '驅虎吞狼' && province.gold < 500) {
        canExecute = false;
        errorMsg = '需要資金 500 金';
      } else if (action === '離間君臣' && province.gold < 400) {
        canExecute = false;
        errorMsg = '需要資金 400 金';
      } else if (action === '勸降逼降' && province.gold < 1000) {
        canExecute = false;
        errorMsg = '需要資金 1000 金';
      } else if (action === '同盟締結' && province.gold < 2000) {
        canExecute = false;
        errorMsg = '需要資金 2000 金';
      } else if (action === '進貢金糧' && selectedTreasureName === '金' && (province.gold < sliderVal || sliderVal < 1000)) {
        canExecute = false;
        errorMsg = '資金不足或未達最低 1000 金額';
      } else if (action === '進貢金糧' && selectedTreasureName === '糧' && (province.food < sliderVal || sliderVal < 10000)) {
        canExecute = false;
        errorMsg = '軍糧不足或未達最低 10000 額度';
      } else if (!targetProvinceId) {
        canExecute = false;
        errorMsg = '請選擇目標敵國州郡';
      } else if ((action === '登用他國人才' || action === '離間君臣') && !targetGeneralName) {
        canExecute = false;
        errorMsg = '請選擇要針對的敵國武將';
      }
    }
  } else {
    if (!selectedGen) {
      canExecute = false;
      errorMsg = '本郡無可執行任務之武將（本月皆已行動）';
    } else if (selectedGen.hasActed) {
      canExecute = false;
      errorMsg = '此武將本月已執行過任務，需待下月';
    } else if ((action === '土地開發' || action === '商業開發' || action === '開發商業' || action === '洪水防治') && province.gold < 100) {
      canExecute = false;
      errorMsg = '本郡資金不足 100 金';
    } else if (action === '土地開發' && province.value >= tierRules.maxDev) {
      canExecute = false;
      errorMsg = `本郡土地開發已達該都市上限 (${tierRules.maxDev})`;
    } else if ((action === '商業開發' || action === '開發商業') && (province.commerce || 0) >= tierRules.maxCommerce) {
      canExecute = false;
      errorMsg = `本郡商業發展已達該都市上限 (${tierRules.maxCommerce})`;
    } else if (action === '買入米糧' && (province.gold < sliderVal || sliderVal <= 0)) {
      canExecute = false;
      errorMsg = '資金不足或輸入數量有誤';
    } else if (action === '賣出米糧' && (province.food < sliderVal || sliderVal <= 0)) {
      canExecute = false;
      errorMsg = '糧食不足或輸入數量有誤';
    } else if (action === '開倉賑民' && province.food < 100) {
      canExecute = false;
      errorMsg = '本郡糧食不足 100 糧';
    } else if (action === '運送錢糧' && !targetProvinceId) {
      canExecute = false;
      errorMsg = '無可運送的目標州郡';
    } else if (action === '運送錢糧' && (province.gold < sliderVal || province.food < secondarySliderVal || (sliderVal === 0 && secondarySliderVal === 0))) {
      canExecute = false;
      errorMsg = '運送物資不足或未選擇數量';
    } else if (action === '登用人才' && !targetGeneralName) {
      canExecute = false;
      errorMsg = '本郡尚無已尋訪之在野人才可供登用';
    }
  }

  const strategistReport = getStrategistReport(gameState, provinceId, action, selectedGen, targetGeneralName, targetProvinceId);

  const handleConfirm = () => {
    if (!canExecute) return;
    if (action !== '郡縣自治' && !selectedGeneralName) return;

    let payload: any = {};
    if (action === '買入米糧') {
      payload = { gold: sliderVal };
    } else if (action === '賣出米糧') {
      payload = { food: sliderVal };
    } else if (action === '開倉賑民') {
      payload = { food: 100 };
    } else if (action === '運送錢糧') {
      payload = { targetProvinceId, gold: sliderVal, food: secondarySliderVal };
    } else if (action === '賞賜金帛' || action === '賞賜物品') {
      payload = { targetGeneralName, itemName: selectedTreasureName, goldCost: 20 };
    } else if (action === '郡縣自治') {
      payload = { targetProvinceId, isAutonomous: isAutonomousToggle };
    } else if (action === '登用人才' || action === '登用他國人才' || action === '離間君臣') {
      payload = { targetGeneralName, targetProvinceId };
    } else if (action === '進貢金糧') {
      payload = { targetProvinceId, resourceType: selectedTreasureName, amount: sliderVal };
    } else if (action === '流言煽動' || action === '驅虎吞狼' || action === '勸降逼降' || action === '同盟締結' || category === '謀略') {
      payload = { targetProvinceId };
    }

    onConfirm(selectedGeneralName || '', payload);
    onClose();
  };

  let connectedProvinces = currentProvinceInfo.connections.map(id => ({
    id,
    info: provinces.find(p => p.id === id),
    state: gameState.provincesData[id]
  }));

  if (action === '運送錢糧') {
    connectedProvinces = connectedProvinces.filter(cp => cp.state?.rulerName === gameState.rulerName);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative bg-[#f4f1ea] border-4 border-[#1c1917] w-full max-w-md shadow-2xl p-5 font-serif text-[#1c1917] z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-[#1c1917] pb-3 mb-4">
            <div>
              <span className="text-xs bg-[#1c1917] text-white px-2 py-0.5 font-bold mr-2">{category}</span>
              <span className="text-xl font-black">{action}</span>
              <span className="text-xs text-stone-500 font-bold ml-2">({tierRules.tierName})</span>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-bold border border-[#1c1917] px-2 py-1 hover:bg-[#1c1917] hover:text-white"
            >
              關閉
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Province Info Bar */}
            <div className="bg-white/80 border border-stone-400 p-2.5 text-xs grid grid-cols-3 gap-2 text-center font-bold">
              <div>金: <span className="text-amber-800 font-black">{province.gold}</span></div>
              <div>糧: <span className="text-emerald-800 font-black">{province.food}</span></div>
              <div>
                {category === '內政' && (
                  action.includes('商業') ? `商業: ${province.commerce || 0}/${tierRules.maxCommerce}` :
                  action.includes('土地') ? `土地: ${province.value}/${tierRules.maxDev}` : `洪水: ${province.flood}`
                )}
                {category === '商業' && (
                  action.includes('商業') ? `商業: ${province.commerce || 0}/${tierRules.maxCommerce}` : `民忠: ${province.loyalty}`
                )}
                {category === '謀略' && `物價: ${province.price}`}
                {category === '人事' && `武將: ${generals.length}`}
                {category === '軍事' && `士兵: ${province.soldiers}`}
              </div>
            </div>

            {/* General Selection List */}
            {action !== '郡縣自治' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm">
                    {action === '指定軍師' ? '選擇指派軍師之賢士 (智力需 > 80)：' :
                     action === '指定太守' ? '選擇冊封太守之武將 (帶兵上限 4000)：' :
                     action === '賞賜金帛' ? '選擇代表主持賞賜武將：' : '選擇執行武將 (每人每月限一次)：'}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">
                    {action === '指定軍師' ? `麾下賢士: ${displayGeneralsList.length}` :
                     action === '指定太守' ? `本郡武將: ${displayGeneralsList.length}` :
                     action === '賞賜金帛' ? `全體駐守: ${generals.length}` : `可行動: ${availableGenerals.length} / ${generals.length}`}
                  </span>
                </div>

                {displayGeneralsList.length === 0 ? (
                  <div className="text-center py-4 bg-stone-200 text-stone-600 text-sm font-bold border border-dashed border-stone-400">
                    {action === '指定軍師' ? '麾下尚無武將' : '本郡無駐守武將'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {displayGeneralsList.map(g => {
                      const isSelected = selectedGeneralName === g.name;
                      const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                      const bonusVal = primaryStatKey === 'pol' ? itemBonus.polBonus :
                                       primaryStatKey === 'int' ? itemBonus.intBonus :
                                       primaryStatKey === 'cha' ? itemBonus.chaBonus : itemBonus.strBonus;

                      const totalInt = g.int + itemBonus.intBonus;
                      const totalPol = g.pol + itemBonus.polBonus;
                      const totalCha = g.cha + itemBonus.chaBonus;
                      const totalStr = g.str + itemBonus.strBonus;

                      const isDisabled = action === '指定軍師' 
                        ? (totalInt <= 80)
                        : (action === '指定太守' || action === '賞賜金帛' ? false : g.hasActed);

                      const isDiplomacy = action === '同盟締結' || action === '進貢金糧';
                      const isDomestic = category === '內政';
                      const isStrategy = category === '謀略';
                      const isCommerce = category === '商業';
                      const isMilitary = category === '軍事';

                      return (
                        <button
                          key={g.name}
                          disabled={isDisabled}
                          onClick={() => setSelectedGeneralName(g.name)}
                          className={`w-full text-left p-2.5 border-2 transition-all flex items-center justify-between
                            ${isSelected ? 'border-[#991b1b] bg-amber-50 shadow-md ring-1 ring-[#991b1b]' : 'border-stone-300 bg-white/70 hover:border-stone-600'}
                            ${isDisabled ? 'opacity-50 bg-stone-200/80 cursor-not-allowed border-stone-300' : 'cursor-pointer'}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-stone-600 flex items-center justify-center bg-white shrink-0">
                              {isSelected && <div className="w-2.5 h-2.5 bg-[#991b1b] rounded-full" />}
                            </div>
                            <GeneralAvatar name={g.name} size={36} className="shrink-0 rounded shadow-xs" />
                            <div>
                              <div className="font-black text-sm flex items-center gap-1.5 flex-wrap">
                                {g.name}
                                {g.isRuler ? (
                                  <span className="text-[10px] bg-[#991b1b] text-white px-1 py-0.2 rounded-sm font-bold">君主</span>
                                ) : (
                                  <span className="text-[10px] bg-stone-700 text-white px-1 py-0.2 rounded-sm">{g.role || '將領'}</span>
                                )}
                                {itemBonus.items.map(it => (
                                  <span key={it.id} className="text-[9px] bg-amber-200 text-amber-950 font-bold px-1 rounded border border-amber-300">
                                    {it.name}
                                  </span>
                                ))}
                              </div>

                              {/* Task-relevant stats display (no cluttered 忠/體/兵 if not relevant) */}
                              {isDiplomacy ? (
                                <div className="text-[11px] font-bold flex gap-2.5 mt-0.5 text-stone-700">
                                  <span>政: <strong className="text-amber-800">{totalPol}</strong></span>
                                  <span>魅: <strong className="text-rose-800">{totalCha}</strong></span>
                                  <span className="text-purple-800 font-black">(合計: {totalPol + totalCha})</span>
                                </div>
                              ) : isDomestic ? (
                                <div className="text-[11px] font-bold flex gap-2.5 mt-0.5 text-stone-700">
                                  <span>政: <strong className="text-amber-800">{totalPol}</strong></span>
                                  <span className="text-stone-500 font-normal">魅: {totalCha}</span>
                                </div>
                              ) : isStrategy ? (
                                <div className="text-[11px] font-bold flex gap-2.5 mt-0.5 text-stone-700">
                                  <span>智: <strong className="text-indigo-800">{totalInt}</strong></span>
                                  <span className="text-stone-500 font-normal">魅: {totalCha}</span>
                                </div>
                              ) : isCommerce ? (
                                <div className="text-[11px] font-bold flex gap-2.5 mt-0.5 text-stone-700">
                                  <span>{action === '開倉賑民' ? '魅' : '政'}: <strong className="text-rose-800">{action === '開倉賑民' ? totalCha : totalPol}</strong></span>
                                  <span className="text-stone-500 font-normal">智: {totalInt}</span>
                                </div>
                              ) : action === '指定軍師' ? (
                                <div className="text-[11px] font-bold flex gap-2 mt-0.5 text-indigo-900">
                                  <span>智謀: <strong className="text-indigo-800 text-xs">{totalInt}</strong></span>
                                  <span className="text-stone-500 font-normal">政: {totalPol}</span>
                                </div>
                              ) : action === '指定太守' ? (
                                <div className="text-[11px] font-bold flex gap-2 mt-0.5 text-stone-700">
                                  <span>統率兵額: <strong className="text-amber-800">4000</strong></span>
                                  <span>忠: {g.loyalty}</span>
                                </div>
                              ) : action === '賞賜金帛' || action === '賞賜物品' ? (
                                <div className="text-[11px] font-bold flex gap-2 mt-0.5 text-stone-700">
                                  <span>目前忠誠: <strong className="text-rose-700">{g.loyalty}</strong></span>
                                  <span>魅力: {totalCha}</span>
                                </div>
                              ) : isMilitary || action === '運送錢糧' ? (
                                <div className="text-[11px] text-stone-500 flex gap-2 mt-0.5">
                                  <span>兵: {g.soldiers}</span>
                                  <span>武: {totalStr}</span>
                                  <span>體: {g.hp}</span>
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold flex gap-2 mt-0.5 text-stone-700">
                                  <span>魅: {totalCha}</span>
                                  <span>政: {totalPol}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {isDiplomacy ? (
                              <div className="text-xs font-bold text-purple-900">
                                外交使節
                              </div>
                            ) : (
                              <div className="text-xs font-bold flex items-center justify-end gap-0.5">
                                <span className="text-stone-500">{primaryStatLabel}: </span>
                                <span className={`font-black text-sm ${statColor}`}>{g[primaryStatKey]}</span>
                                {bonusVal > 0 && (
                                  <span className="text-emerald-700 font-bold text-xs">+{bonusVal}</span>
                                )}
                              </div>
                            )}
                            <div className="text-[11px] mt-0.5">
                              {action === '指定軍師' ? (
                                totalInt > 80 ? (
                                  <span className="text-indigo-800 font-bold bg-indigo-100 px-1.5 py-0.5 rounded-sm">可任命軍師</span>
                                ) : (
                                  <span className="text-stone-500 font-bold bg-stone-300 px-1.5 py-0.5 rounded-sm">智力 ≦ 80</span>
                                )
                              ) : action === '指定太守' ? (
                                g.role === '太守' ? (
                                  <span className="text-amber-900 font-bold bg-amber-200 px-1.5 py-0.5 rounded-sm">現任太守</span>
                                ) : (
                                  <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded-sm">可任命太守</span>
                                )
                              ) : action === '賞賜金帛' ? (
                                <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded-sm">不扣行動</span>
                              ) : isDisabled ? (
                                <span className="text-stone-500 font-bold bg-stone-300 px-1.5 py-0.5 rounded-sm">本月已行動</span>
                              ) : (
                                <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-sm">待命可執行</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Strategist Appointment Info Box */}
            {action === '指定軍師' && (
              <div className="bg-indigo-50 border-2 border-indigo-700/80 p-3 shadow-sm rounded-sm text-xs text-indigo-950 font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-900 font-black">
                  <span>📜</span>
                  <span>任命軍師詔令說明</span>
                </div>
                <div>
                  冊封武將 <span className="font-black text-indigo-800 text-sm">{selectedGen?.name || '---'}</span> (智力: {(selectedGen?.int || 0) + (selectedGen ? getGeneralItemBonus(selectedGen.name, gameState.currentScenario).intBonus : 0)}) 為我軍『軍師』。
                </div>
                <div className="text-[11px] text-stone-600 font-normal border-t border-indigo-200 pt-1 mt-1">
                  💡 提示：指派軍師資格為智力需高於 80（含寶物）。軍師會在每個月初告知可能隱沒人才之區域，並預測人事登用率與謀略勝率。
                </div>
              </div>
            )}

            {/* Prefect Appointment Info Box */}
            {action === '指定太守' && (
              <div className="bg-amber-50 border-2 border-amber-700/80 p-3 shadow-sm rounded-sm text-xs text-amber-950 font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-black">
                  <span>📜</span>
                  <span>冊封太守詔令說明</span>
                </div>
                <div>
                  冊封武將 <span className="font-black text-amber-800 text-sm">{selectedGen?.name || '---'}</span> 為【{currentProvinceInfo?.name || '本郡'}】太守。
                </div>
                <div className="text-[11px] text-stone-600 font-normal border-t border-amber-200 pt-1 mt-1">
                  💡 提示：太守帶兵上限提升至 4000 兵馬，坐鎮郡縣統領大局！
                </div>
              </div>
            )}

            {/* Strategist Advice Box for Talent Search / Hire / Foreign Hire / Alliance / Tribute */}
            {(action === '尋訪人才' || action === '登用人才' || action === '登用他國人才' || action === '同盟締結' || action === '進貢金糧') && (
              <div className="bg-amber-100/90 border-2 border-amber-800/80 p-3 shadow-sm rounded-sm">
                <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs mb-1.5 pb-1 border-b border-amber-300">
                  <span className="text-base">📜</span>
                  <span>軍師報告與勝率評估</span>
                  {strategistReport.strategist && (
                    <span className="ml-auto text-[10px] bg-amber-900 text-amber-100 px-1.5 py-0.5 rounded font-bold">
                      軍師: {strategistReport.strategist.name} (智: {strategistReport.strategist.int})
                    </span>
                  )}
                </div>
                <div className="text-xs text-amber-900 leading-relaxed font-serif italic font-bold">
                  {strategistReport.quote}
                </div>
              </div>
            )}

            {/* Target Province Selection (For transport) */}
            {action === '運送錢糧' && (
              <div className="bg-white/90 border border-stone-400 p-3">
                <div className="font-bold text-xs mb-2">選擇目標相鄰州郡：</div>
                {connectedProvinces.length === 0 ? (
                  <div className="text-xs text-red-600 font-bold p-2 bg-red-50 border border-red-200">
                    無符合條件的相鄰州郡。
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {connectedProvinces.map(cp => (
                      <button
                        key={cp.id}
                        onClick={() => setTargetProvinceId(cp.id)}
                        className={`p-2 border text-xs text-left font-bold transition-all ${
                          targetProvinceId === cp.id
                            ? 'border-[#991b1b] bg-amber-50 text-[#991b1b]'
                            : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                        }`}
                      >
                        <div>{cp.info?.name} ({cp.id}郡)</div>
                        <div className="text-[10px] text-stone-500 font-normal">
                          君主: {cp.state?.rulerName || '無'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Parameter Controls (Sliders for Gold/Food / Personnel) */}
            {(action === '買入米糧' || action === '賣出米糧' || action === '運送錢糧' || action === '賞賜金帛' || action === '賞賜物品' || action === '登用人才' || action === '登用他國人才' || action === '郡縣自治' || action === '流言煽動' || action === '驅虎吞狼' || action === '離間君臣' || action === '勸降逼降' || action === '同盟締結' || action === '進貢金糧') && (
              <div className="bg-white/90 border border-stone-400 p-3 space-y-3">
                {action === '郡縣自治' && (
                  <div className="space-y-3">
                    <div className="font-black text-xs text-stone-800 flex justify-between items-center">
                      <span>選擇授權自治之州郡：</span>
                      <span className="text-[11px] text-amber-800 font-bold">直轄郡縣: {ownedProvincesList.length}</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {ownedProvincesList.map(op => {
                        const isSelected = targetProvinceId === op.id;
                        const currentAutonomy = op.state.isAutonomous;
                        const isRulerCapital = Object.values(gameState.generalsData).find(g => g.name === gameState.rulerName)?.provinceId === op.id;
                        
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => {
                              if (isRulerCapital) return;
                              setTargetProvinceId(op.id);
                              setIsAutonomousToggle(!currentAutonomy);
                            }}
                            className={`w-full p-2.5 border text-xs text-left font-bold transition-all flex items-center justify-between ${
                              isRulerCapital ? 'border-stone-200 bg-stone-100 opacity-60 cursor-not-allowed' :
                              isSelected ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]' : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                            }`}
                          >
                            <div>
                              <div className="font-black text-sm text-stone-900">{op.info?.name} ({op.id}郡)</div>
                              <div className="text-[11px] text-stone-600 font-normal">
                                太守: <span className="font-bold text-amber-900">{op.prefect ? op.prefect.name : '未任命'}</span> | 金: {op.state.gold} | 糧: {op.state.food}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {isRulerCapital ? (
                                <span className="text-[10px] bg-rose-800 text-rose-100 px-2 py-0.5 rounded font-bold">君主所在 (不可自治)</span>
                              ) : currentAutonomy ? (
                                <span className="text-[10px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded font-bold">【自治中】</span>
                              ) : (
                                <span className="text-[10px] bg-stone-700 text-stone-100 px-2 py-0.5 rounded font-bold">【直轄中】</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2.5 bg-amber-50 border border-amber-300 text-xs text-amber-950 font-bold space-y-1">
                      <div className="font-black text-amber-900">🏛️ 自治授權狀態：</div>
                      <div>
                        選取州郡：<span className="text-[#991b1b] font-black">{provinces.find(p => p.id === targetProvinceId)?.name || '未選擇'}</span>
                      </div>
                      <div>
                        將變更為：<span className="font-black underline text-emerald-900">{isAutonomousToggle ? '【開】授權太守自治 (每月自動開墾防洪)' : '【關】收回自治授權 (手動管理)'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {action === '賞賜物品' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold mb-1.5 flex justify-between">
                        <span>選擇受賜重寶之武將：</span>
                        <span className="text-[10px] text-stone-500 font-bold">全體武將: {allPlayerGenerals.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1 mb-2">
                        {allPlayerGenerals.map(g => {
                          const isTarget = targetGeneralName === g.name;
                          const itemBonus = getGeneralItemBonus(g.name, gameState.currentScenario);
                          return (
                            <button
                              key={g.name}
                              type="button"
                              onClick={() => setTargetGeneralName(g.name)}
                              className={`p-2 border text-xs text-left font-bold transition-all ${
                                isTarget ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]' : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <GeneralAvatar name={g.name} size={24} className="shrink-0 rounded" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <span className="truncate">{g.name}</span>
                                    <span className="text-[10px] text-stone-500 font-normal ml-1 shrink-0">忠: <strong className="text-emerald-800">{g.loyalty}</strong></span>
                                  </div>
                                </div>
                              </div>
                              {itemBonus.items.length > 0 && (
                                <div className="text-[9px] text-amber-900 font-normal truncate">
                                  持有: {itemBonus.items.map(it => it.name).join(', ')}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-xs font-bold mb-1.5">選擇頒賜之重寶名物：</div>
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        {['黃金錦囊', '倚天寶劍', '赤兔名馬', '孫子兵法', '和氏奇寶', '青囊神書'].map(tName => (
                          <button
                            key={tName}
                            type="button"
                            onClick={() => setSelectedTreasureName(tName)}
                            className={`p-2 border text-xs font-bold text-center transition-all ${
                              selectedTreasureName === tName ? 'border-[#991b1b] bg-amber-100 text-[#991b1b]' : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                            }`}
                          >
                            🎁 {tName}
                          </button>
                        ))}
                      </div>

                      <div className="p-2 bg-amber-50 border border-amber-300 text-xs text-amber-950 font-bold flex justify-between items-center">
                        <span>花費郡庫: <strong className="text-amber-800">20 金</strong></span>
                        <span>預期忠誠提升: <strong className="text-emerald-800">+20 ~ +30 點</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {(action === '登用他國人才' || action === '流言煽動' || action === '驅虎吞狼' || action === '離間君臣' || action === '勸降逼降' || action === '同盟締結' || action === '進貢金糧') && (
                  <div className="space-y-3 border-t border-stone-300 pt-3">
                    {/* Step 1: Select Target Province */}
                    <div>
                      <div className="text-xs font-bold mb-1.5 flex justify-between items-center">
                        <span className="text-stone-900 font-black">① 選擇目標敵國州郡：</span>
                        <span className="text-[10px] text-stone-500 font-bold">
                          {action === '登用他國人才' || action === '離間君臣' ? `有敵將州郡: ${foreignProvincesWithGenerals.length}` : `天下敵邦: ${Object.values(gameState.provincesData).filter(p => p.rulerName !== gameState.rulerName && p.rulerName !== null).length}`}
                        </span>
                      </div>

                      {foreignProvincesWithGenerals.length === 0 && (action === '登用他國人才' || action === '離間君臣') ? (
                        <div className="text-xs text-stone-600 bg-stone-100 p-2.5 border border-dashed border-stone-400 text-center font-bold">
                          當前天下周邊無可策反或離間之敵國武將
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 mb-2 max-h-40 overflow-y-auto pr-1">
                          {(action === '登用他國人才' || action === '離間君臣' ? foreignProvincesWithGenerals : Object.values(gameState.provincesData).filter(p => p.rulerName !== gameState.rulerName && p.rulerName !== null)).map(p => {
                            const pInfo = provinces.find(x => x.id === p.id);
                            const pGensCount = Object.values(gameState.generalsData).filter(g => g.provinceId === p.id && !g.isWild).length;
                            const isSelectedProv = targetProvinceId === p.id;
                            const rel = p.rulerName ? (gameState.diplomacyData?.[gameState.rulerName]?.[p.rulerName] ?? 50) : 50;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setTargetProvinceId(p.id);
                                  const gensInP = foreignGenerals.filter(fg => fg.provinceId === p.id);
                                  if (gensInP.length > 0) {
                                    setTargetGeneralName(gensInP[0].name);
                                  } else {
                                    setTargetGeneralName(null);
                                  }
                                }}
                                className={`p-2 border text-xs text-left font-bold transition-all flex justify-between items-center ${
                                  isSelectedProv 
                                    ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]' 
                                    : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                                }`}
                              >
                                <div>
                                  <div className="font-black text-stone-900">{pInfo?.name}</div>
                                  <div className="text-[10px] text-stone-500 font-normal">君主: {p.rulerName}</div>
                                </div>
                                <div className="text-right">
                                  {action === '同盟締結' || action === '進貢金糧' ? (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rel >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                      友好: {rel}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded font-bold">
                                      {pGensCount} 人
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Select Target General in selected province */}
                    {(action === '登用他國人才' || action === '離間君臣') && targetProvinceId !== null && (
                      <div>
                        <div className="text-xs font-bold mb-1.5 flex justify-between items-center">
                          <span className="text-stone-900 font-black">② 選擇該郡欲策反/針對之敵將：</span>
                          <span className="text-[10px] text-stone-500 font-bold">駐守武將: {generalsInSelectedProv.length} 人</span>
                        </div>

                        {generalsInSelectedProv.length === 0 ? (
                          <div className="text-xs text-stone-600 bg-stone-100 p-2 border border-dashed border-stone-400 text-center font-bold">
                            此州郡目前無敵將駐守
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {generalsInSelectedProv.map(fg => {
                              const isTarget = targetGeneralName === fg.name;

                              return (
                                <button
                                  key={fg.name}
                                  type="button"
                                  onClick={() => setTargetGeneralName(fg.name)}
                                  className={`w-full p-2 border text-xs text-left font-bold transition-all flex justify-between items-center ${
                                    isTarget 
                                      ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]' 
                                      : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <GeneralAvatar name={fg.name} size={32} className="shrink-0 rounded" />
                                    <div>
                                      <div className="text-sm font-black text-stone-900 flex items-center gap-1">
                                        <span>{fg.name}</span>
                                        <span className="text-[10px] text-stone-500 font-normal">({fg.role || '武將'})</span>
                                      </div>
                                      <div className="text-[10px] text-stone-600 font-normal mt-0.5">
                                        武: {fg.str} | 智: {fg.int} | 魅: {fg.cha} | 忠誠: <strong className={fg.loyalty < 75 ? 'text-rose-700 font-black' : 'text-stone-800'}>{fg.loyalty}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    {isTarget ? (
                                      <span className="text-[10px] bg-[#991b1b] text-white px-1.5 py-0.5 rounded font-bold">
                                        已選擇
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                                        選擇
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {(action === '流言煽動' || action === '驅虎吞狼' || action === '離間君臣' || action === '勸降逼降' || action === '同盟締結') && (
                  <div className="space-y-2 mt-2">
                    <div className="p-2.5 bg-amber-50 border border-amber-300 text-xs text-amber-950 font-bold flex justify-between items-center">
                      <span>費用: <strong className="text-amber-800">
                        {action === '流言煽動' ? '300' : action === '驅虎吞狼' ? '500' : action === '離間君臣' ? '400' : action === '同盟締結' ? '2000' : '1000'} 金
                      </strong></span>
                      <span className="text-emerald-800">
                        (不消耗糧食)
                      </span>
                    </div>
                    {action === '勸降逼降' && (
                      <div className="p-2 text-[11px] bg-stone-100 text-stone-700 border border-stone-300 font-bold">
                        💡 軍師建言：敵軍若勢大則寧死不降。建議【周遭相鄰之我軍總兵力】大於該郡敵軍兵力 <strong className="text-rose-700">3 倍</strong>以上，且該君主無其他領地時，勸降方易成功。
                      </div>
                    )}
                  </div>
                )}

                {action === '進貢金糧' && (
                  <div className="mt-2 space-y-4">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setSelectedTreasureName('金'); setSliderVal(1000); }} className={`flex-1 p-2 text-xs font-bold border ${selectedTreasureName === '金' ? 'border-amber-800 bg-amber-100 text-amber-900' : 'border-stone-300 bg-stone-100 text-stone-600'}`}>進貢黃金</button>
                      <button type="button" onClick={() => { setSelectedTreasureName('糧'); setSliderVal(10000); }} className={`flex-1 p-2 text-xs font-bold border ${selectedTreasureName === '糧' ? 'border-emerald-800 bg-emerald-100 text-emerald-900' : 'border-stone-300 bg-stone-100 text-stone-600'}`}>進貢軍糧</button>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>進貢數量：</span>
                        <span className="text-stone-800 font-black text-sm">{sliderVal} {selectedTreasureName === '金' ? '金' : '糧'}</span>
                      </div>
                      <input
                        type="range"
                        min={selectedTreasureName === '金' ? 1000 : 10000}
                        max={Math.max(selectedTreasureName === '金' ? 1000 : 10000, selectedTreasureName === '金' ? province.gold : province.food)}
                        step={selectedTreasureName === '金' ? 100 : 1000}
                        value={sliderVal}
                        onChange={e => setSliderVal(Number(e.target.value))}
                        className={`w-full ${selectedTreasureName === '金' ? 'accent-amber-800' : 'accent-emerald-800'}`}
                      />
                    </div>
                  </div>
                )}

                {action === '買入米糧' && (
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>花費金兩：</span>
                      <span className="text-amber-800 font-black text-sm">{sliderVal} 金</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={Math.max(1, Math.min(1000, province.gold))}
                      value={sliderVal}
                      onChange={e => setSliderVal(Number(e.target.value))}
                      className="w-full accent-amber-800"
                    />
                    <div className="text-[11px] text-stone-600 mt-1">
                      預估換得糧食：約 <span className="font-bold text-emerald-800">{Math.floor(sliderVal * 10 * (1 + (selectedGen ? selectedGen.pol / 200 : 1)))}</span> 糧 (受武將政治加成)
                    </div>
                  </div>
                )}

                {action === '賣出米糧' && (
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>賣出糧食：</span>
                      <span className="text-emerald-800 font-black text-sm">{sliderVal} 糧</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max={Math.max(10, Math.min(10000, province.food))}
                      step="10"
                      value={sliderVal}
                      onChange={e => setSliderVal(Number(e.target.value))}
                      className="w-full accent-emerald-800"
                    />
                    <div className="text-[11px] text-stone-600 mt-1">
                      預估換得金兩：約 <span className="font-bold text-amber-800">{Math.max(1, Math.floor((sliderVal / 10) * (0.8 + (selectedGen ? selectedGen.pol / 250 : 1))))}</span> 金
                    </div>
                  </div>
                )}

                {action === '運送錢糧' && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>運送金兩：</span>
                        <span className="text-amber-800 font-black">{sliderVal} 金</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={province.gold}
                        value={sliderVal}
                        onChange={e => setSliderVal(Number(e.target.value))}
                        className="w-full accent-amber-800"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>運送糧草：</span>
                        <span className="text-emerald-800 font-black">{secondarySliderVal} 糧</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={province.food}
                        step="10"
                        value={secondarySliderVal}
                        onChange={e => setSecondarySliderVal(Number(e.target.value))}
                        className="w-full accent-emerald-800"
                      />
                    </div>
                  </>
                )}

                {action === '賞賜金帛' && (
                  <div>
                    <div className="text-xs font-bold mb-2">選擇受賞武將 (每人每月限賞賜一次)：</div>
                    <div className="grid grid-cols-2 gap-2 mb-3 max-h-36 overflow-y-auto pr-1">
                      {generals.map(g => {
                        const isRewarded = g.rewardedThisMonth;
                        const isTarget = targetGeneralName === g.name;
                        return (
                          <button
                            key={g.name}
                            type="button"
                            onClick={() => setTargetGeneralName(g.name)}
                            className={`p-2 border text-xs text-left font-bold transition-all relative ${
                              isTarget
                                ? 'border-[#991b1b] bg-amber-50 text-[#991b1b] ring-1 ring-[#991b1b]'
                                : isRewarded
                                ? 'border-stone-300 bg-stone-200/80 text-stone-500'
                                : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <GeneralAvatar name={g.name} size={26} className="shrink-0 rounded" />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <div className="truncate">{g.name}</div>
                                  {isRewarded && (
                                    <span className="text-[9px] bg-stone-400 text-stone-900 font-bold px-1 py-0.2 rounded shrink-0">
                                      本月已賞
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5">
                              忠誠: <strong className={g.loyalty < 80 ? 'text-amber-700' : 'text-emerald-700'}>{g.loyalty}</strong> | 兵力: {g.soldiers}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>賞賜金兩：</span>
                      <span className="text-amber-800 font-black">{sliderVal} 金</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max={Math.max(5, Math.min(100, province.gold))}
                      step="5"
                      value={sliderVal}
                      onChange={e => setSliderVal(Number(e.target.value))}
                      className="w-full accent-amber-800"
                    />
                    <div className="text-[11px] text-stone-600 mt-1">
                      預估忠誠提升：約 +{Math.floor(sliderVal / 2) + 5} 點
                    </div>
                  </div>
                )}

                {action === '登用人才' && (
                  <div>
                    <div className="text-xs font-bold mb-2">選擇要登用之在野名士：</div>
                    {Object.values(gameState.generalsData).filter(g => g.isWild && g.provinceId === provinceId && (gameState.wildGenerals || []).includes(g.name)).length === 0 ? (
                      <div className="text-xs text-stone-600 bg-stone-100 p-2 border border-dashed border-stone-400 text-center">
                        本郡目前未發現任何在野武將（請先派遣武將進行「尋訪人才」）
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {Object.values(gameState.generalsData)
                          .filter(g => g.isWild && g.provinceId === provinceId && (gameState.wildGenerals || []).includes(g.name))
                          .map(wg => (
                            <button
                              key={wg.name}
                              type="button"
                              onClick={() => setTargetGeneralName(wg.name)}
                              className={`w-full p-2 border text-xs text-left font-bold transition-all flex justify-between items-center ${
                                targetGeneralName === wg.name
                                  ? 'border-[#991b1b] bg-amber-50 text-[#991b1b]'
                                  : 'border-stone-300 bg-stone-100 hover:bg-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GeneralAvatar name={wg.name} size={32} className="shrink-0 rounded" />
                                <div>
                                  <div className="text-sm font-black">{wg.name} ({wg.role || '在野'})</div>
                                  <div className="text-[10px] text-stone-600">
                                    武: {wg.str} | 智: {wg.int} | 政: {wg.pol} | 魅: {wg.cha}
                                  </div>
                                  {wg.bio && <div className="text-[10px] text-amber-900 mt-0.5">{wg.bio}</div>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 font-bold rounded">在野</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Details Preview */}
            <div className="bg-stone-200 border border-stone-400 p-3 text-xs leading-relaxed">
              <div className="font-bold mb-1">任務說明：</div>
              {action === '土地開發' && (
                <div>
                  花費 <span className="font-bold text-amber-900">100 金</span>，由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (政治: {selectedGen ? selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus : 0}) 執行開墾，預期土地價值提升 +{selectedGen ? calculateDevGain(selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus) : 0}（政治 &gt;= 95 達滿標 +7，本都市上限: {tierRules.maxDev}）。
                </div>
              )}
              {(action === '商業開發' || action === '開發商業') && (
                <div>
                  花費 <span className="font-bold text-amber-900">100 金</span>，由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (政治: {selectedGen ? selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus : 0}) 開拓商埠集市、通商惠工，預期商業發展提升 +{selectedGen ? calculateDevGain(selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus) : 0}（政治 &gt;= 95 達滿標 +7，本都市上限: {tierRules.maxCommerce}）。
                </div>
              )}
              {action === '洪水防治' && (
                <div>
                  花費 <span className="font-bold text-amber-900">100 金</span>，由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (政治: {selectedGen ? selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus : 0}) 督造水利，預期洪水率降低 -{selectedGen ? calculateFloodGain(selectedGen.pol + getGeneralItemBonus(selectedGen.name, gameState.currentScenario).polBonus) : 0}（政治 &gt;= 95 達滿標 -5）。
                </div>
              )}
              {action === '開倉賑民' && (
                <div>
                  消耗 <span className="font-bold text-emerald-900">100 糧</span>，由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (魅力: {selectedGen?.cha || 0}) 開倉發糧，提升民眾忠誠度 +{selectedGen ? Math.floor(selectedGen.cha / 10) + 2 : 0}。
                </div>
              )}
              {action === '尋訪人才' && (
                <div>
                  由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (魅力: {selectedGen?.cha || 0}) 深入其駐守城市 <span className="font-bold text-amber-900">{currentProvinceInfo.name}</span> 尋訪隱居名士。若未探得人才，亦有機會於山野市井間採集尋獲 10~100 金補助郡庫。
                </div>
              )}
              {action === '登用人才' && (
                <div>
                  由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (魅力: {selectedGen?.cha || 0}) 親自遊說在野名士 <span className="font-bold text-amber-900">{targetGeneralName || '---'}</span> 加入麾下。
                </div>
              )}
              {action === '賞賜金帛' && (
                <div>
                  賞賜金帛予 <span className="font-bold text-[#991b1b]">{targetGeneralName || '---'}</span>，穩固部屬軍心並提升忠誠度。（賞賜不扣除代表武將之行動力，每人每月限賞賜一次）
                </div>
              )}
              {action === '賞賜物品' && (
                <div>
                  頒賜重寶名物 <span className="font-bold text-amber-900">【{selectedTreasureName}】</span> 予 <span className="font-bold text-[#991b1b]">{targetGeneralName || '---'}</span>，大幅鞏固軍心與忠誠度 (+20~30 點)。
                </div>
              )}
              {action === '郡縣自治' && (
                <div>
                  設定 <span className="font-bold text-amber-900">{provinces.find(p => p.id === targetProvinceId)?.name || '該郡'}</span> 實施 <span className="font-bold text-emerald-900">{isAutonomousToggle ? '【自治模式】' : '【直轄模式】'}</span>。授權後太守將於每月自動進行開墾防洪與護民。
                </div>
              )}
              {action === '登用他國人才' && (
                <div>
                  派遣使者 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> 親赴敵國遊說 <span className="font-bold text-amber-900">{targetGeneralName || '---'}</span> 棄暗投明，招攬至我軍麾下。
                </div>
              )}
              {category === '謀略' && (
                <div>
                  由 <span className="font-bold text-[#991b1b]">{selectedGen?.name || '---'}</span> (謀略: {selectedGen?.int || 0}) 向目標郡施展策略，降低敵方民心與穩定度。
                </div>
              )}
            </div>

            {/* Error Message */}
            {!canExecute && (
              <div className="text-red-700 bg-red-100 border border-red-300 p-2 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t-2 border-[#1c1917] flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border-2 border-[#1c1917] font-bold text-sm bg-stone-300 hover:bg-stone-400 active:scale-95 transition-all"
            >
              取消
            </button>
            <button
              disabled={!canExecute}
              onClick={handleConfirm}
              className={`flex-1 py-2.5 border-2 border-[#1c1917] font-black text-sm text-white shadow-[2px_2px_0_#1c1917] transition-all
                ${canExecute ? 'bg-[#991b1b] hover:bg-red-800 active:scale-95 cursor-pointer' : 'bg-stone-500 cursor-not-allowed opacity-60'}
              `}
            >
              確認執行
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
