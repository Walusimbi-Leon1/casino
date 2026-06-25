/**
 * Web Audio API slot-machine sound effects.
 * All functions are resilient to headless/audio-less environments.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _volume = 0.5;
let _audioFailed = false;

function ensureContext(): AudioContext | null {
  if (_audioFailed) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = _volume;
      masterGain.connect(audioCtx.destination);
    } catch {
      _audioFailed = true;
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getGain(): GainNode | null {
  return ensureContext() ? masterGain : null;
}

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _volume;
}

export function getVolume(): number {
  return _volume;
}

/** Mechanical lever pull */
export function playLever(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    const len = ctx.sampleRate * 0.05;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    noise.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start();
  } catch { /* audio not available */ }
}

/** Single reel-stop click */
export function playReelStop(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch { /* audio not available */ }
}

let spinNoiseSrc: AudioBufferSourceNode | null = null;
let spinNoiseGain: GainNode | null = null;

export function startSpinSound(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const len = ctx.sampleRate * 0.4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    spinNoiseSrc = ctx.createBufferSource();
    spinNoiseSrc.buffer = buf;
    spinNoiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;

    spinNoiseGain = ctx.createGain();
    spinNoiseGain.gain.setValueAtTime(0.15, ctx.currentTime);

    spinNoiseSrc.connect(filter);
    filter.connect(spinNoiseGain);
    spinNoiseGain.connect(dest);
    spinNoiseSrc.start();
  } catch { /* audio not available */ }
}

export function stopSpinSound(): void {
  try {
    if (spinNoiseGain) {
      const ctx = audioCtx;
      if (ctx) {
        spinNoiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      }
    }
    if (spinNoiseSrc) {
      setTimeout(() => {
        try { spinNoiseSrc?.stop(); } catch {}
      }, 250);
    }
  } catch {}
  spinNoiseSrc = null;
  spinNoiseGain = null;
}

/** Small win jingle */
export function playWin(amount: number): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const noteCount = amount < 3 ? 3 : amount < 10 ? 5 : amount < 50 ? 7 : 10;
    const baseFreq = 523;
    for (let i = 0; i < noteCount; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const freq = baseFreq * Math.pow(2, i / noteCount * 2);
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
      osc.connect(g);
      g.connect(dest);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.25);
    }
  } catch { /* audio not available */ }
}

/** Big win fanfare */
export function playBigWin(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.setValueAtTime(freq * 2, ctx.currentTime + 0.5 + i * 0.15);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.setValueAtTime(0.12, ctx.currentTime + 0.3 + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8 + i * 0.15);
      osc.connect(g);
      g.connect(dest);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + 0.9 + i * 0.15);
    });
  } catch { /* audio not available */ }
}

/** Loss sound */
export function playLose(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(g);
    g.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* audio not available */ }
}

/** Coin-drop percussive clicks */
export function playCoin(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + Math.random() * 500, ctx.currentTime + i * 0.08);
      g.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.04);
      osc.connect(g);
      g.connect(dest);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.05);
    }
  } catch { /* audio not available */ }
}

/** Quick "no bet" buzz */
export function playNoBet(): void {
  const ctx = ensureContext();
  const dest = getGain();
  if (!ctx || !dest) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.setValueAtTime(60, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(dest);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* audio not available */ }
}
