/**
 * Procedural Web Audio Synthesizer for Cyber Strike: Neon Defender
 * 100% offline, procedural sound effects and retro synthwave music generator.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.7;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
    return !this.isMuted;
  }

  // --- Sound Effects ---

  playLaser(isDual = false) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isDual ? 'sawtooth' : 'sine';
    const startFreq = isDual ? 980 : 860;
    const endFreq = 160;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playEnemyLaser() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playExplosion(isLarge = false) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = isLarge ? 0.6 : 0.35;

    // Synthesize White Noise Buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Low pass filter for heavy explosion boom
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 400 : 700, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    const peakVol = isLarge ? 0.6 : 0.35;
    gain.gain.setValueAtTime(peakVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(now);

    // Add sub-bass oscillator for punchy thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(isLarge ? 140 : 180, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + duration * 0.7);

    subGain.gain.setValueAtTime(peakVol * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(now);
    subOsc.stop(now + duration * 0.7);
  }

  playPowerup() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.15);
    });
  }

  playShieldHit() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playBomb() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Epic EMP blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.8);

    this.playExplosion(true);
  }

  playWaveStart() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 440, 587.33]; // D4, A4, D5 fanfare

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.25);
    });
  }

  playGameOver() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [311.13, 277.18, 246.94, 185.0]; // Descending minor chords

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = now + idx * 0.2;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.4);
    });
  }

  // --- Procedural Synthwave Music Engine ---

  startMusic() {
    if (!this.initialized || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    const tempo = 124; // BPM
    const stepIntervalMs = (60 / tempo / 4) * 1000; // 16th notes

    // Bassline and Lead melody patterns (frequencies in Hz)
    // Scale: D Minor Synthwave (D, F, G, A, C)
    const bassline = [
      73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42,
      87.31, 87.31, 174.61, 87.31, 65.41, 65.41, 130.81, 65.41,
      73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42,
      98.00, 98.00, 196.00, 98.00, 110.0, 110.0, 220.00, 110.0
    ];

    const leadArp = [
      293.66, 0, 349.23, 0, 440.00, 0, 587.33, 440.00,
      349.23, 0, 293.66, 0, 261.63, 0, 329.63, 0,
      293.66, 0, 349.23, 0, 440.00, 0, 523.25, 440.00,
      392.00, 0, 440.00, 0, 349.23, 0, 293.66, 0
    ];

    const tick = () => {
      if (!this.isMusicPlaying) return;

      if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const step = this.musicStep % 32;

        // Play Bass pulse
        const bassFreq = bassline[step];
        if (bassFreq > 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, now);
          filter.Q.setValueAtTime(4, now);

          bassGain.gain.setValueAtTime(0.22, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.12);
        }

        // Play Lead synth note
        const leadFreq = leadArp[step];
        if (leadFreq > 0) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();

          leadOsc.type = 'triangle';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          leadGain.gain.setValueAtTime(0.12, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);

          leadOsc.start(now);
          leadOsc.stop(now + 0.18);
        }

        // Subtle Hi-Hat every odd step
        if (step % 2 === 1) {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          hatOsc.type = 'sine';
          hatOsc.frequency.setValueAtTime(8000, now);

          hatGain.gain.setValueAtTime(0.03, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

          hatOsc.connect(hatGain);
          hatGain.connect(this.musicGain);

          hatOsc.start(now);
          hatOsc.stop(now + 0.04);
        }
      }

      this.musicStep++;
      this.musicTimer = setTimeout(tick, stepIntervalMs);
    };

    this.musicTimer = setTimeout(tick, stepIntervalMs);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
