let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export const AudioService = {
  increment() {
    playTone(880, 0.08, 'sine', 0.12);
  },

  decrement() {
    playTone(440, 0.1, 'sine', 0.1);
  },

  serveChange() {
    playTone(660, 0.06, 'sine', 0.1);
    setTimeout(() => playTone(880, 0.06, 'sine', 0.1), 80);
  },

  setWon() {
    playTone(523, 0.15, 'triangle', 0.15);
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.15), 150);
    setTimeout(() => playTone(784, 0.25, 'triangle', 0.15), 300);
  },

  matchWon() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'triangle', 0.15), i * 150);
    });
  },

  voiceCommand() {
    playTone(1200, 0.05, 'sine', 0.08);
  },

  error() {
    playTone(200, 0.15, 'square', 0.08);
  },
};
