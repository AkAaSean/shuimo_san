// Background Music Manager with Web Audio Pentatonic Classical Chinese Engine & Audio Player
export type BgmTrack = '開局' | '春天' | '夏天' | '秋天' | '冬天';

class BgmManager {
  private currentTrackName: BgmTrack | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private audioCtx: AudioContext | null = null;
  private synthTimer: any = null;
  private isSynthPlaying: boolean = false;
  private unlocked: boolean = false;

  constructor() {
    this.isMuted = localStorage.getItem('san_audio_bgm') === 'false';
    this.setupUnlockListeners();
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }

      if (this.currentTrackName && !this.isMuted) {
        this.playTrack(this.currentTrackName, true);
      }
      
      // Remove listeners once unlocked
      events.forEach(evt => {
        window.removeEventListener(evt, unlock, { capture: true });
      });
    };

    const events = ['pointerdown', 'click', 'touchstart', 'keydown'];
    events.forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('san_audio_bgm', muted ? 'false' : 'true');

    if (muted) {
      this.stopAll();
    } else {
      if (this.currentTrackName) {
        this.playTrack(this.currentTrackName, true);
      }
    }
  }

  public isEnabled(): boolean {
    return !this.isMuted;
  }

  public playTrack(trackName: BgmTrack, force: boolean = false) {
    if (this.currentTrackName === trackName && !force && (this.audioElement || this.isSynthPlaying)) {
      return;
    }

    this.currentTrackName = trackName;

    if (this.isMuted) {
      this.stopAll();
      return;
    }

    this.stopAll();

    // Attempt HTML Audio first from /audio/ or /
    const candidateUrls = [
      `/audio/${trackName}.mp3`,
      `/audio/${trackName}.wav`,
      `/${trackName}.mp3`
    ];

    let triedCount = 0;
    const tryPlayAudio = (index: number) => {
      if (index >= candidateUrls.length) {
        // Fallback to Web Audio Synth Engine
        if (this.currentTrackName === trackName) {
          this.startSynthTrack(trackName);
        }
        return;
      }

      const audio = new Audio(candidateUrls[index]);
      audio.loop = true;
      audio.volume = 0.35;

      const promise = audio.play();
      if (promise !== undefined) {
        promise.then(() => {
          if (this.currentTrackName === trackName && !this.isMuted) {
            this.audioElement = audio;
          } else {
            audio.pause();
            audio.currentTime = 0;
          }
        }).catch(() => {
          // Play failed (e.g. 404, unsupported format, or browser autoplay block)
          if (this.currentTrackName === trackName) {
            tryPlayAudio(index + 1);
          }
        });
      } else {
        if (this.currentTrackName === trackName && !this.isMuted) {
          this.audioElement = audio;
        } else {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    };

    tryPlayAudio(0);
  }

  private stopAll() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
      this.audioElement = null;
    }
    this.stopSynth();
  }

  // --- Classical Chinese Pentatonic Synthesizer Engine (Guzheng & Dizi Timbre) ---
  private startSynthTrack(trackName: BgmTrack) {
    if (this.isMuted) return;
    this.stopSynth();

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isSynthPlaying = true;

    // Traditional Pentatonic Scale (Gong, Shang, Jiao, Zhi, Yu / 宮商角徵羽)
    // C4, D4, E4, G4, A4, C5, D5, E5, G5
    const pentatonicFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];

    let melodyPatterns: number[][] = [];
    let tempo = 500; // ms per beat

    switch (trackName) {
      case '開局': // 豪邁雄壯 (開局 / 標題畫面)
        melodyPatterns = [
          [0, 3, 4, 5, 7, 5, 4, 3],
          [7, 5, 4, 3, 2, 0, 3, 4],
          [5, 7, 8, 7, 5, 4, 3, 2],
          [0, 2, 3, 4, 3, 2, 0, 0]
        ];
        tempo = 480;
        break;

      case '春天': // 生機盎然 (1~3月)
        melodyPatterns = [
          [0, 1, 3, 4, 5, 4, 3, 1],
          [2, 4, 5, 7, 5, 4, 2, 0],
          [3, 5, 7, 8, 7, 5, 3, 2],
          [1, 3, 4, 5, 4, 2, 0, 0]
        ];
        tempo = 420;
        break;

      case '夏天': // 熾熱繁茂 (4~6月)
        melodyPatterns = [
          [2, 4, 5, 7, 8, 7, 5, 4],
          [4, 5, 7, 5, 4, 2, 0, 2],
          [5, 7, 8, 7, 5, 4, 3, 2],
          [2, 4, 5, 4, 2, 0, 2, 4]
        ];
        tempo = 380;
        break;

      case '秋天': // 豐收懷遠 (7~9月)
        melodyPatterns = [
          [4, 3, 2, 0, 2, 3, 4, 2],
          [3, 2, 0, 4, 3, 2, 0, 1],
          [5, 4, 3, 2, 3, 4, 5, 3],
          [2, 0, 1, 2, 1, 0, 0, 0]
        ];
        tempo = 520;
        break;

      case '冬天': // 靜謐清寒 (10~12月)
        melodyPatterns = [
          [0, 2, 3, 0, 4, 2, 0, 1],
          [0, 1, 2, 3, 2, 1, 0, 0],
          [2, 3, 4, 2, 3, 1, 0, 0],
          [0, 2, 1, 0, 0, 0, 0, 0]
        ];
        tempo = 600;
        break;
    }

    let pIndex = 0;
    let nIndex = 0;

    const playNote = () => {
      if (!this.isSynthPlaying || this.isMuted) return;

      const currentCtx = this.getAudioContext();
      if (!currentCtx) return;

      if (currentCtx.state === 'suspended') {
        currentCtx.resume().catch(() => {});
      }

      const pattern = melodyPatterns[pIndex % melodyPatterns.length];
      const scaleIdx = pattern[nIndex % pattern.length];
      const freq = pentatonicFreqs[scaleIdx % pentatonicFreqs.length];

      try {
        const now = currentCtx.currentTime;

        // Fundamental Guzheng / Pipa tone
        const osc = currentCtx.createOscillator();
        const gain = currentCtx.createGain();

        // Warm harmonic overtone
        const overtoneOsc = currentCtx.createOscillator();
        const overtoneGain = currentCtx.createGain();

        osc.type = trackName === '開局' || trackName === '夏天' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        overtoneOsc.type = 'sine';
        overtoneOsc.frequency.setValueAtTime(freq * 2, now);

        // Plucked envelope (Guzheng style fast attack, exponential decay)
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

        overtoneGain.gain.setValueAtTime(0.001, now);
        overtoneGain.gain.linearRampToValueAtTime(0.05, now + 0.02);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

        osc.connect(gain);
        overtoneOsc.connect(overtoneGain);

        gain.connect(currentCtx.destination);
        overtoneGain.connect(currentCtx.destination);

        osc.start(now);
        overtoneOsc.start(now);

        osc.stop(now + 0.95);
        overtoneOsc.stop(now + 0.55);
      } catch (e) {
        console.error(e);
      }

      nIndex++;
      if (nIndex >= pattern.length) {
        nIndex = 0;
        pIndex++;
      }

      this.synthTimer = setTimeout(playNote, tempo);
    };

    playNote();
  }

  private stopSynth() {
    this.isSynthPlaying = false;
    if (this.synthTimer) {
      clearTimeout(this.synthTimer);
      this.synthTimer = null;
    }
  }
}

export const bgmManager = new BgmManager();
