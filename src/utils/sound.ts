// ─── 瀏覽器原生 Web Audio API 音效引擎 (免外部依賴，支援斬首、技能、介面音效) ───
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

      if (type === 'decapitate' || type === 'execute') {
        // ─── 斬首處決專屬霸氣音效：沉重斷頭刀破空劃過 + 沉悶斬斷鈍擊 + 銅鑼震響 ───
        
        // 1. 刀刃急速呼嘯破空 (高頻金屬擦弦急速滑降)
        const bladeOsc = this.ctx.createOscillator();
        const bladeGain = this.ctx.createGain();
        bladeOsc.type = 'sawtooth';
        bladeOsc.frequency.setValueAtTime(1400, now);
        bladeOsc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        bladeGain.gain.setValueAtTime(0.5, now);
        bladeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        bladeOsc.connect(bladeGain);
        bladeGain.connect(this.ctx.destination);
        bladeOsc.start(now);
        bladeOsc.stop(now + 0.18);

        // 2. 劊子手鍘刀斬落巨響 (重型方波衝擊波 + 斷裂感)
        const chopOsc1 = this.ctx.createOscillator();
        const chopGain1 = this.ctx.createGain();
        chopOsc1.type = 'square';
        chopOsc1.frequency.setValueAtTime(320, now + 0.12);
        chopOsc1.frequency.exponentialRampToValueAtTime(45, now + 0.45);
        chopGain1.gain.setValueAtTime(0.7, now + 0.12);
        chopGain1.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        chopOsc1.connect(chopGain1);
        chopGain1.connect(this.ctx.destination);
        chopOsc1.start(now + 0.12);
        chopOsc1.stop(now + 0.55);

        // 3. 沉悶低頻撼地鈍響 (巨型木墩低音共鳴)
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'triangle';
        thudOsc.frequency.setValueAtTime(110, now + 0.14);
        thudOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
        thudGain.gain.setValueAtTime(0.8, now + 0.14);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        thudOsc.connect(thudGain);
        thudGain.connect(this.ctx.destination);
        thudOsc.start(now + 0.14);
        thudOsc.stop(now + 0.65);

        // 4. 刑場震懾銅鑼/深邃回響 (三國古戰場悲壯死刑肅殺氛圍)
        [220, 330, 440].forEach((freq, idx) => {
          if (!this.ctx) return;
          const gongOsc = this.ctx.createOscillator();
          const gongGain = this.ctx.createGain();
          gongOsc.type = 'sine';
          const t = now + 0.16 + idx * 0.02;
          gongOsc.frequency.setValueAtTime(freq, t);
          gongOsc.frequency.exponentialRampToValueAtTime(freq * 0.75, t + 0.9);
          gongGain.gain.setValueAtTime(0.35 / (idx + 1), t);
          gongGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
          gongOsc.connect(gongGain);
          gongGain.connect(this.ctx.destination);
          gongOsc.start(t);
          gongOsc.stop(t + 0.95);
        });

      } else if (type === 'slash') {
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
      } else if (type === 'heal' || type === 'recruit') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          const t = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } else if (type === 'imprison' || type === 'lock') {
        // 鐵門鎖鏈鏗鏘聲
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'release') {
        // 釋放解縛清脆微風聲
        [440, 554.37, 659.25].forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          const t = now + i * 0.09;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
        });
      } else if (type === 'ultimate') {
        // ─── 專屬奧義終極爆發音效：金鐘震撼 + 史詩和弦蓄力 + 毀滅雷霆斬落 ───
        // 1. 低頻撼天動地低音砲
        const rumbleOsc = this.ctx.createOscillator();
        const rumbleGain = this.ctx.createGain();
        rumbleOsc.type = 'triangle';
        rumbleOsc.frequency.setValueAtTime(160, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        rumbleGain.gain.setValueAtTime(0.9, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(this.ctx.destination);
        rumbleOsc.start(now);
        rumbleOsc.stop(now + 0.85);

        // 2. 宏大金芒升騰音階 (五音古琴和鳴)
        [220, 277.18, 329.63, 440, 554.37, 659.25, 880].forEach((freq, idx) => {
          if (!this.ctx) return;
          const chordOsc = this.ctx.createOscillator();
          const chordGain = this.ctx.createGain();
          chordOsc.type = 'sawtooth';
          const t = now + idx * 0.035;
          chordOsc.frequency.setValueAtTime(freq, t);
          chordGain.gain.setValueAtTime(0.28, t);
          chordGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          chordOsc.connect(chordGain);
          chordGain.connect(this.ctx.destination);
          chordOsc.start(t);
          chordOsc.stop(t + 0.6);
        });

        // 3. 巨力崩裂破空斬 (無雙毀滅衝擊)
        const smashOsc = this.ctx.createOscillator();
        const smashGain = this.ctx.createGain();
        smashOsc.type = 'square';
        smashOsc.frequency.setValueAtTime(450, now + 0.15);
        smashOsc.frequency.exponentialRampToValueAtTime(50, now + 0.65);
        smashGain.gain.setValueAtTime(0.8, now + 0.15);
        smashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        smashOsc.connect(smashGain);
        smashGain.connect(this.ctx.destination);
        smashOsc.start(now + 0.15);
        smashOsc.stop(now + 0.7);
      }
    } catch {
      // 忽略音效異常
    }
  }
}

export const soundPlayer = new SoundSynth();
