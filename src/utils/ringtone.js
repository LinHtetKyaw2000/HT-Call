// Generates ring tones using Web Audio API — no audio files needed

let audioCtx = null;
let nodes = [];
let intervalId = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function stopAll() {
  nodes.forEach((n) => { try { n.stop(); } catch {} });
  nodes = [];
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

// Classic telephone ringback tone: 440Hz + 480Hz, 2s on / 4s off
export function playRingback() {
  stopAll();
  const ctx = getCtx();

  const ring = () => {
    // Master gain for overall volume
    const master = ctx.createGain();
    master.gain.setValueAtTime(1.0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);

    // Compressor to prevent clipping at high volumes
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master.connect(comp);

    [440, 480].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.type = "sine";
      osc.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
      nodes.push(osc);
    });
  };

  ring();
  intervalId = setInterval(ring, 6000);
}

// Incoming alert: rising double-beep pattern
export function playIncoming() {
  stopAll();
  const ctx = getCtx();

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.ratio.value = 4;
  comp.connect(ctx.destination);

  const beep = (startTime) => {
    [620, 820].forEach((freq, i) => {
      const gain = ctx.createGain();
      const t = startTime + i * 0.2;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1.0, t + 0.04);
      gain.gain.linearRampToValueAtTime(0, t + 0.18);
      gain.connect(comp);

      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.type = "sine";
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.22);
      nodes.push(osc);
    });
  };

  const playPattern = () => {
    const now = ctx.currentTime;
    beep(now);
    beep(now + 0.5);
  };

  playPattern();
  intervalId = setInterval(playPattern, 3000);
}

export function stopRingtone() {
  stopAll();
}
