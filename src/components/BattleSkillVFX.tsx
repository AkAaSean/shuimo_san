import React, { useEffect, useRef } from 'react';
import { GeneralAvatar } from './GeneralAvatar';
import { GameState } from '../types';

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

// ─── 瀏覽器原生 Web Audio API 合成音效引擎 (無需外載音訊檔) ───
class SoundSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type: string) {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (type === 'slash') {
        // 普通斬擊音效 (快速白噪音+高頻滑降)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'wushuang' || type === 'heavy_slash') {
        // 無雙/極致重斬 (雙重金屬重擊 + 雷鳴低音)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(320, now);
        osc1.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
      } else if (type === 'fire') {
        // 烈火燃燒與爆轟音
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(260, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'water') {
        // 狂濤巨浪音
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'rock') {
        // 巨石崩落轟碎地鳴
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'arrows') {
        // 箭雨呼嘯
        for (let i = 0; i < 4; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          const t = now + i * 0.06;
          osc.frequency.setValueAtTime(900 - i * 80, t);
          osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.12);
        }
      } else if (type === 'heal') {
        // 治癒甘霖和弦
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          const t = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } else if (type === 'magic') {
        // 奇策惑敵神秘咒文音
        [440, 466.16, 523.25, 622.25].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const t = now + i * 0.07;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      }
    } catch {
      // 忽略音效異常
    }
  }
}

const soundPlayer = new SoundSynth();

export default function BattleSkillVFX({
  vfxEvent,
  gameState,
  onVFXComplete
}: BattleSkillVFXProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 根據技能名稱分類特效主題
  const getSkillCategory = (skillName?: string) => {
    if (!skillName) return 'melee';
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

    const duration = vfxEvent.duration || (vfxEvent.type === 'melee' ? 600 : 1200);
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
    if (currentCategory === 'fire') {
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

      if (currentCategory === 'fire') {
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
      if (currentCategory === 'wushuang') {
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
          skillCategory === 'fire' 
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
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent -skew-y-1 scale-105 blur-sm" />

          {/* 橫幅主體 */}
          <div className={`relative bg-gradient-to-r ${getBannerTheme()} border-y-2 sm:border-2 sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3 shadow-2xl flex items-center justify-between gap-2.5 sm:gap-4 overflow-hidden`}>
            
            {/* 左側：武將頭像與姓名陣營 */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-amber-400 overflow-hidden shadow-lg bg-stone-900 shrink-0 ring-2 ring-amber-500/50">
                <GeneralAvatar
                  name={vfxEvent.casterName}
                  size={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded w-fit ${
                  vfxEvent.isCasterEnemy ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60' : 'bg-sky-950/80 text-sky-300 border border-sky-600/60'
                }`}>
                  {vfxEvent.isCasterEnemy ? '敵方發動' : '我方發動'}
                </span>
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
