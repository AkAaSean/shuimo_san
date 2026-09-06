import React, { useEffect, useRef } from 'react';
import { GeneralAvatar } from './GeneralAvatar';
import { GameState } from '../types';
import { soundPlayer } from '../utils/sound';
import { isUltimateSkill } from '../engine/skills';

export interface BattleVFXEvent {
  id: string;
  type: 'skill' | 'melee';
  skillName?: string;
  casterName: string;
  casterUnitId: string;
  isCasterEnemy: boolean;
  targetUnitIds: string[];
  isAoe: boolean;
  quote?: string;
  duration?: number;
}

interface BattleSkillVFXProps {
  vfxEvent: BattleVFXEvent | null;
  gameState: GameState;
  onVFXComplete?: () => void;
}

export default function BattleSkillVFX({
  vfxEvent,
  gameState,
  onVFXComplete
}: BattleSkillVFXProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 根據技能名稱分類特效主題
  const getSkillCategory = (skillName?: string) => {
    if (!skillName) return 'melee';
    if (isUltimateSkill(skillName)) return 'ultimate';
    if (['火計', '業火', '火矢'].includes(skillName)) return 'fire';
    if (['水攻', '水龍計'].includes(skillName)) return 'water';
    if (['落石', '山崩'].includes(skillName)) return 'earth';
    if (['無雙', '奮戰'].includes(skillName)) return 'wushuang';
    if (['橫掃', '連突', '貫通'].includes(skillName)) return 'slash';
    if (['亂射'].includes(skillName)) return 'arrows';
    if (['鐵壁衝撞'].includes(skillName)) return 'shield';
    if (['治傷', '援軍', '解策', '激勵'].includes(skillName)) return 'heal';
    if (['疑兵', '偽報', '挑釁'].includes(skillName)) return 'magic';
    return 'slash';
  };

  const currentCategory = vfxEvent?.type === 'melee' ? 'melee' : getSkillCategory(vfxEvent?.skillName);

  // 播放對應合成音效
  useEffect(() => {
    if (!vfxEvent) return;

    if (vfxEvent.type === 'melee') {
      soundPlayer.play('slash');
    } else {
      switch (currentCategory) {
        case 'ultimate': soundPlayer.play('ultimate'); break;
        case 'fire': soundPlayer.play('fire'); break;
        case 'water': soundPlayer.play('water'); break;
        case 'earth': soundPlayer.play('rock'); break;
        case 'wushuang': soundPlayer.play('wushuang'); break;
        case 'slash': soundPlayer.play('heavy_slash'); break;
        case 'arrows': soundPlayer.play('arrows'); break;
        case 'shield': soundPlayer.play('rock'); break;
        case 'heal': soundPlayer.play('heal'); break;
        case 'magic': soundPlayer.play('magic'); break;
        default: soundPlayer.play('heavy_slash'); break;
      }
    }

    const duration = vfxEvent.duration || (vfxEvent.type === 'melee' ? 600 : currentCategory === 'ultimate' ? 1600 : 1200);
    const timer = setTimeout(() => {
      if (onVFXComplete) onVFXComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [vfxEvent?.id]);

  // HTML5 Canvas 動畫粒子粒子渲染循環
  useEffect(() => {
    if (!vfxEvent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    const height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const startTime = performance.now();
    const duration = vfxEvent.duration || (vfxEvent.type === 'melee' ? 550 : 1100);

    // 粒子系統物件池
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      life: number;
      maxLife: number;
      rot?: number;
      vrot?: number;
      type?: string;
    }

    const particles: Particle[] = [];

    // 初始化各種技能粒子
    if (currentCategory === 'ultimate') {
      // 140個超震撼專屬奧義光子：神聖金芒、赤炎雷電、環形超新星擴散
      for (let i = 0; i < 140; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 18 + 6;
        particles.push({
          x: width * 0.5,
          y: height * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 14 + 4,
          color: Math.random() > 0.4 ? '#fde047' : Math.random() > 0.3 ? '#f59e0b' : Math.random() > 0.2 ? '#ef4444' : '#38bdf8',
          alpha: 1,
          life: 0,
          maxLife: 55 + Math.random() * 30
        });
      }
    } else if (currentCategory === 'fire') {
      // 火球與火星
      for (let i = 0; i < 90; i++) {
        particles.push({
          x: width * 0.5 + (Math.random() - 0.5) * width * 0.7,
          y: height * 0.85 + Math.random() * height * 0.2,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 8 - 4,
          size: Math.random() * 14 + 6,
          color: Math.random() > 0.4 ? '#ff4500' : Math.random() > 0.3 ? '#ff8c00' : '#ffd700',
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 30
        });
      }
    } else if (currentCategory === 'water') {
      // 狂濤波浪粒子
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * width,
          y: height * 0.9,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 10 - 4,
          size: Math.random() * 12 + 4,
          color: Math.random() > 0.5 ? '#38bdf8' : '#0284c7',
          alpha: 0.9,
          life: 0,
          maxLife: 45 + Math.random() * 25
        });
      }
    } else if (currentCategory === 'earth') {
      // 巨石碎屑
      for (let i = 0; i < 60; i++) {
        particles.push({
          x: width * 0.5 + (Math.random() - 0.5) * width * 0.6,
          y: -20 - Math.random() * 100,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 12 + 8,
          size: Math.random() * 20 + 8,
          color: Math.random() > 0.5 ? '#78716c' : '#57534e',
          alpha: 1,
          life: 0,
          maxLife: 50,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.2
        });
      }
    } else if (currentCategory === 'wushuang') {
      // 金色雷電與爆發星芒
      for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 14 + 4;
        particles.push({
          x: width * 0.5,
          y: height * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 8 + 3,
          color: Math.random() > 0.3 ? '#facc15' : '#fbbf24',
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 25
        });
      }
    } else if (currentCategory === 'arrows') {
      // 漫天箭雨
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: (vfxEvent.isCasterEnemy ? width + 50 : -50) + (Math.random() - 0.5) * 100,
          y: Math.random() * (height * 0.4),
          vx: vfxEvent.isCasterEnemy ? -Math.random() * 15 - 12 : Math.random() * 15 + 12,
          vy: Math.random() * 6 + 4,
          size: 24,
          color: '#e2e8f0',
          alpha: 1,
          life: 0,
          maxLife: 35
        });
      }
    } else if (currentCategory === 'heal') {
      // 翠綠生命光粒
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: width * 0.5 + (Math.random() - 0.5) * width * 0.7,
          y: height * 0.85,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 5 - 2,
          size: Math.random() * 10 + 4,
          color: Math.random() > 0.4 ? '#4ade80' : '#86efac',
          alpha: 1,
          life: 0,
          maxLife: 50 + Math.random() * 20
        });
      }
    } else if (currentCategory === 'magic') {
      // 神秘紫霧
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 80;
        particles.push({
          x: width * 0.5 + Math.cos(angle) * dist,
          y: height * 0.5 + Math.sin(angle) * dist,
          vx: Math.cos(angle + 1.5) * 3,
          vy: Math.sin(angle + 1.5) * 3,
          size: Math.random() * 12 + 6,
          color: Math.random() > 0.5 ? '#c084fc' : '#a855f7',
          alpha: 0.9,
          life: 0,
          maxLife: 45
        });
      }
    } else {
      // 普通斬擊 / 橫掃刀光粒子
      for (let i = 0; i < 50; i++) {
        const angle = -Math.PI / 4 + (Math.random() - 0.5) * 1.5;
        const speed = Math.random() * 12 + 4;
        particles.push({
          x: width * 0.5,
          y: height * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 6 + 2,
          color: '#ffffff',
          alpha: 1,
          life: 0,
          maxLife: 30
        });
      }
    }

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, duration)));

      ctx.clearRect(0, 0, width, height);

      // 1. 繪製全屏背景光暈濾鏡
      const cx = width * 0.5;
      const cy = height * 0.5;
      const maxR = Math.max(10, width * 0.8);

      if (currentCategory === 'ultimate') {
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxR * 1.2);
        grad.addColorStop(0, `rgba(234, 179, 8, ${Math.max(0, 0.65 * (1 - progress))})`);
        grad.addColorStop(0.3, `rgba(239, 68, 68, ${Math.max(0, 0.45 * (1 - progress))})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentCategory === 'fire') {
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, `rgba(239, 68, 68, ${Math.max(0, 0.35 * (1 - progress))})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentCategory === 'water') {
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, `rgba(14, 165, 233, ${Math.max(0, 0.35 * (1 - progress))})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentCategory === 'wushuang') {
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, `rgba(234, 179, 8, ${Math.max(0, 0.45 * (1 - progress))})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (currentCategory === 'heal') {
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, `rgba(34, 197, 94, ${Math.max(0, 0.35 * (1 - progress))})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. 繪製幾何主特效 (如刀光、八卦陣、衝撞光波、巨浪、雷電)
      if (currentCategory === 'ultimate') {
        // 雙重神威衝擊波圓環
        ctx.save();
        ctx.translate(cx, cy);
        const waveRadius1 = Math.max(0.1, Math.min(width, height) * 0.70 * progress);
        const waveRadius2 = Math.max(0.1, Math.min(width, height) * 1.0 * Math.max(0, progress - 0.15));

        ctx.strokeStyle = `rgba(254, 240, 138, ${Math.max(0, 1 - progress)})`;
        ctx.lineWidth = Math.max(0.5, 10 * (1 - progress));
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 1 - progress)})`;
        ctx.lineWidth = Math.max(0.5, 6 * (1 - progress));
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius2, 0, Math.PI * 2);
        ctx.stroke();

        // 8條天地貫穿金芒神光
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4 + progress * 0.5;
          const rayLen = Math.max(10, Math.max(width, height) * 0.85 * progress);
          ctx.strokeStyle = `rgba(253, 224, 71, ${Math.max(0, 0.85 * (1 - progress))})`;
          ctx.lineWidth = Math.max(0.5, 8 * (1 - progress));
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * rayLen, Math.sin(ang) * rayLen);
          ctx.stroke();
        }
        ctx.restore();
      } else if (currentCategory === 'wushuang') {
        // 金色十字無雙神斬
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = `rgba(254, 240, 138, ${Math.max(0, 1 - progress)})`;
        ctx.lineWidth = Math.max(0.5, 12 * (1 - progress));
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 25;

        // 斬擊光刃 1
        ctx.beginPath();
        ctx.moveTo(-width * 0.45, -height * 0.35);
        ctx.lineTo(width * 0.45, height * 0.35);
        ctx.stroke();

        // 斬擊光刃 2
        ctx.beginPath();
        ctx.moveTo(width * 0.45, -height * 0.35);
        ctx.lineTo(-width * 0.45, height * 0.35);
        ctx.stroke();
        ctx.restore();
      } else if (currentCategory === 'slash' || currentCategory === 'melee') {
        // 銀白月牙弧形刀芒
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - progress * 1.5)})`;
        ctx.lineWidth = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;

        const slashRadius = Math.max(1, 140 * progress + 40);
        ctx.beginPath();
        ctx.arc(0, 0, slashRadius, -Math.PI * 0.6, Math.PI * 0.2);
        ctx.stroke();
        ctx.restore();
      } else if (currentCategory === 'shield') {
        // 玄武金盾衝擊波
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = `rgba(250, 204, 21, ${Math.max(0, 1 - progress)})`;
        ctx.lineWidth = Math.max(0.5, 6 * (1 - progress));
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;

        const shieldRadius = Math.max(0.1, width * 0.4 * progress);
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (currentCategory === 'magic') {
        // 八卦陣光環
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(progress * Math.PI * 2);
        ctx.strokeStyle = `rgba(192, 132, 252, ${Math.max(0, 1 - progress)})`;
        ctx.lineWidth = Math.max(0.5, 4 * (1 - progress));
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, Math.PI * 2);
        ctx.stroke();

        // 內圈八卦線條
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * 50, Math.sin(ang) * 50);
          ctx.lineTo(Math.cos(ang) * 85, Math.sin(ang) * 85);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. 更新與繪製粒子
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const pRatio = Math.min(1, p.life / Math.max(1, p.maxLife));
        p.alpha = Math.max(0, 1 - pRatio);

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        if (currentCategory === 'arrows') {
          // 繪製箭矢
          ctx.translate(p.x, p.y);
          const angle = Math.atan2(p.vy, p.vx);
          ctx.rotate(angle);
          const safeArrowSize = Math.max(2, p.size);
          ctx.fillRect(-safeArrowSize / 2, -1.5, safeArrowSize, 3);
          // 箭頭
          ctx.beginPath();
          ctx.moveTo(safeArrowSize / 2 + 4, 0);
          ctx.lineTo(safeArrowSize / 2 - 2, -3);
          ctx.lineTo(safeArrowSize / 2 - 2, 3);
          ctx.fill();
        } else if (currentCategory === 'earth') {
          // 繪製多邊形碎石
          ctx.translate(p.x, p.y);
          if (p.rot !== undefined && p.vrot !== undefined) {
            p.rot += p.vrot;
            ctx.rotate(p.rot);
          }
          const earthR = Math.max(0.1, p.size * Math.max(0.1, 1 - pRatio * 0.4));
          ctx.beginPath();
          ctx.arc(0, 0, earthR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 一般圓形光點
          const circleR = Math.max(0.1, p.size * Math.max(0.1, 1 - pRatio * 0.5));
          ctx.beginPath();
          ctx.arc(p.x, p.y, circleR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < duration) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [vfxEvent?.id, currentCategory]);

  if (!vfxEvent) return null;

  const isSkill = vfxEvent.type === 'skill';
  const skillCategory = getSkillCategory(vfxEvent.skillName);

  // 戰法橫幅背景色調
  const getBannerTheme = () => {
    switch (skillCategory) {
      case 'ultimate':
        return 'from-amber-950 via-yellow-900 to-amber-950 border-amber-300 text-yellow-100 shadow-[0_0_40px_rgba(245,158,11,0.95)] ring-2 ring-yellow-400';
      case 'fire':
        return 'from-amber-950 via-rose-900 to-amber-950 border-rose-500 text-rose-100 shadow-rose-900/80';
      case 'water':
        return 'from-slate-950 via-sky-950 to-slate-950 border-sky-400 text-sky-100 shadow-sky-900/80';
      case 'earth':
        return 'from-stone-950 via-amber-950 to-stone-950 border-amber-500 text-amber-100 shadow-amber-950/80';
      case 'wushuang':
        return 'from-stone-950 via-amber-900 to-stone-950 border-yellow-400 text-yellow-100 shadow-yellow-600/90';
      case 'heal':
        return 'from-slate-950 via-emerald-950 to-slate-950 border-emerald-400 text-emerald-100 shadow-emerald-900/80';
      case 'magic':
        return 'from-slate-950 via-purple-950 to-slate-950 border-purple-400 text-purple-100 shadow-purple-900/80';
      default:
        return 'from-stone-950 via-stone-900 to-stone-950 border-amber-400 text-amber-100 shadow-amber-950/80';
    }
  };

  const getSkillIcon = (sName?: string) => {
    if (!sName) return '⚔️';
    // 20大專屬終極奧義圖標
    if (sName === '武聖・單刀赴會') return '🐉';
    if (sName === '當陽怒吼・斷橋') return '🦁';
    if (sName === '七進七出・龍膽') return '⚡';
    if (sName === '八陣圖・奇門遁甲') return '☯️';
    if (sName === '神威・西涼鐵騎') return '🐎';
    if (sName === '神射・百步穿楊') return '🎯';
    if (sName === '短歌行・天下歸心') return '👑';
    if (sName === '鷹視狼顧・奪魄') return '🦅';
    if (sName === '威震逍遙津・疾風') return '🌪️';
    if (sName === '遺計定遼東・十勝') return '📜';
    if (sName === '裸衣・虎痴狂怒') return '🐯';
    if (sName === '拔矢啖睛・剛烈') return '👁️';
    if (sName === '火燒赤壁・連環') return '🔥';
    if (sName === '夷陵烈焰・連營') return '💥';
    if (sName === '錦帆夜襲・百騎') return '⛵';
    if (sName === '神亭連珠・封喉') return '🏹';
    if (sName === '白衣渡江・奇襲') return '🌫️';
    if (sName === '鬼神・天下無雙') return '👹';
    if (sName === '閉月・連環美人計') return '🌙';
    if (sName === '毒士亂武・萬劫') return '☠️';

    // 常規戰法圖標
    if (['火計', '業火', '火矢'].includes(sName)) return '🔥';
    if (['水攻', '水龍計'].includes(sName)) return '🌊';
    if (['落石', '山崩'].includes(sName)) return '⛰️';
    if (['無雙'].includes(sName)) return '⚡';
    if (['奮戰'].includes(sName)) return '🩸';
    if (['亂射'].includes(sName)) return '🏹';
    if (['鐵壁衝撞'].includes(sName)) return '🛡️';
    if (['治傷', '援軍'].includes(sName)) return '🌿';
    if (['解策', '激勵'].includes(sName)) return '✨';
    if (['疑兵', '偽報', '挑釁'].includes(sName)) return '🌀';
    return '🗡️';
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col justify-center items-center">
      {/* 1. Canvas 粒子動畫層 */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 2. 螢幕高光瞬間閃爍 (Flash Overlay) */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
          skillCategory === 'ultimate'
            ? 'bg-amber-400/35'
            : skillCategory === 'fire' 
            ? 'bg-rose-500/20' 
            : skillCategory === 'water'
            ? 'bg-sky-500/20'
            : skillCategory === 'wushuang'
            ? 'bg-yellow-400/25'
            : skillCategory === 'heal'
            ? 'bg-emerald-500/20'
            : skillCategory === 'magic'
            ? 'bg-purple-500/20'
            : 'bg-white/15'
        } animate-pulse`} 
      />

      {/* 3. 【戰法發動・超燃特寫橫幅】(Cut-In Banner) */}
      {isSkill && (
        <div className="relative z-20 w-full max-w-2xl px-3 animate-in fade-in zoom-in slide-in-from-left duration-300">
          {/* 金芒速度線裝飾背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/25 to-transparent -skew-y-1 scale-105 blur-sm" />

          {/* 橫幅主體 */}
          <div className={`relative bg-gradient-to-r ${getBannerTheme()} border-y-2 sm:border-2 sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3 shadow-2xl flex items-center justify-between gap-2.5 sm:gap-4 overflow-hidden`}>
            
            {/* 左側：武將頭像與姓名陣營 */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 ${
                skillCategory === 'ultimate' ? 'border-yellow-300 ring-4 ring-yellow-400 ring-offset-2 ring-offset-black animate-pulse' : 'border-amber-400 ring-2 ring-amber-500/50'
              } overflow-hidden shadow-lg bg-stone-900 shrink-0`}>
                <GeneralAvatar
                  name={vfxEvent.casterName}
                  size={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                {skillCategory === 'ultimate' ? (
                  <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-stone-950 border border-yellow-100 shadow font-serif animate-pulse tracking-wide w-fit">
                    🌟 傳奇專屬奧義 (耗體70)
                  </span>
                ) : (
                  <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded w-fit ${
                    vfxEvent.isCasterEnemy ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60' : 'bg-sky-950/80 text-sky-300 border border-sky-600/60'
                  }`}>
                    {vfxEvent.isCasterEnemy ? '敵方發動' : '我方發動'}
                  </span>
                )}
                <span className="text-base sm:text-lg font-black text-amber-200 font-serif tracking-wide drop-shadow truncate max-w-[90px] sm:max-w-[130px]">
                  {vfxEvent.casterName}
                </span>
              </div>
            </div>

            {/* 中央/右側：戰法大字標籤與霸氣台詞 */}
            <div className="flex-1 flex flex-col items-end text-right min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl animate-bounce">
                  {getSkillIcon(vfxEvent.skillName)}
                </span>
                <span className="text-xl sm:text-3xl font-black font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-yellow-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.8)]">
                  【{vfxEvent.skillName}】
                </span>
              </div>

              {vfxEvent.quote && (
                <p className="text-[11px] sm:text-xs text-amber-100/90 font-serif italic mt-0.5 max-w-[260px] sm:max-w-[360px] truncate">
                  『{vfxEvent.quote}』
                </p>
              )}
            </div>

            {/* 水墨流光亮點 */}
            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
