/**
 * Web Audio API slot-machine sound effects.
 * Generates all sounds programmatically — no external files needed.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _volume = 0.5;

function ensureContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getGain(): GainNode {
  ensureContext();
  return masterGain!;
}

/** Set volume 0–1 */
export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _volume;
}

export function getVolume(): number {
  return _volume;
}

// ── Individual sounds ───────────────────────────────

/** Mechanical lever pull — short noise burst */
export function playLever(): void {
  const ctx = ensureContext();
  const dest = getGain();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();

  // Tonal "clunk" — low sawtooth
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);

  // Noise burst
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
}

/** Single reel-stop click */
export function playReelStop(): void {
  const ctx = ensureContext();
  const dest = getGain();
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
}

/** Spinning reel background — filtered noise that fades */
let spinNoiseSrc: AudioBufferSourceNode | null = null;
let spinNoiseGain: GainNode | null = null;

export function startSpinSound(): void {
  const ctx = ensureContext();
  const dest = getGain();

  // Create noise buffer
  const len = ctx.sampleRate * 0.4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  spinNoiseSrc = ctx.createBufferSource();
  spinNoiseSrc.buffer = buf;
  spinNoiseSrc.loop = true;

  // Filter to make it sound mechanical
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

/** Small win jingle (ascending notes) */
export function playWin(amount: number): void {
  const ctx = ensureContext();
  const dest = getGain();

  // Base notes — more notes for bigger win
  const noteCount = amount < 3 ? 3 : amount < 10 ? 5 : amount < 50 ? 7 : 10;
  const baseFreq = 523; // C5

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
}

/** Big win fanfare (rich chords) */
export function playBigWin(): void {
  const ctx = ensureContext();
  const dest = getGain();
  const notes = [262, 330, 392, 523]; // C E G C
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
}

/** Loss sound — descending tone */
export function playLose(): void {
  const ctx = ensureContext();
  const dest = getGain();
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
}

/** Coin-drop — short percussive clicks */
export function playCoin(): void {
  const ctx = ensureContext();
  const dest = getGain();
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
}

/** Quick one-shot "no bet" sound */
export function playNoBet(): void {
  const ctx = ensureContext();
  const dest = getGain();
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
}
