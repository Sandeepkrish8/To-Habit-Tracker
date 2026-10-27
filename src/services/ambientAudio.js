// src/services/ambientAudio.js
// Ambient focus sounds generated live with the Web Audio API — no audio files.
//
// Every sound starts from noise (random samples) shaped by filters:
//   rain  → white noise, band-limited, with slow "gusts"
//   birds → soft wind + short chirps (oscillators sweeping up in pitch)
//   café  → low murmur (brown noise) + the odd cup clink
//   fire  → deep rumble + random crackles

export const SOUNDS = [
  { id: 'rain',  label: 'Rain',  icon: '🌧️' },
  { id: 'birds', label: 'Birds', icon: '🐦' },
  { id: 'cafe',  label: 'Café',  icon: '☕' },
  { id: 'fire',  label: 'Fire',  icon: '🔥' },
];

let ctx = null;
let master = null;
let active = null; // { id, stop() }

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** 2 seconds of looping noise. White = flat hiss; brown = deep rumble. */
function noiseSource(type) {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === 'brown') {
      last = (last + 0.02 * white) / 1.02; // integrate white noise → brown noise
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function filter(type, frequency, Q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

function gain(value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/** Connects nodes in a chain: a → b → c */
function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

/** Runs `fn` again after a random delay between min and max ms, until stopped */
function every(min, max, fn) {
  let id;
  const loop = () => {
    id = setTimeout(() => { fn(); loop(); }, min + Math.random() * (max - min));
  };
  loop();
  return () => clearTimeout(id);
}

/** A short burst of noise through a bandpass — a crackle or a raindrop */
function pop(out, freq, volume, length = 0.04) {
  const src = noiseSource('white');
  const g = gain(0);
  chain(src, filter('bandpass', freq, 2), g, out);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  src.start(t);
  src.stop(t + length + 0.02);
}

/** A tone that sweeps between two pitches — chirps and clinks */
function tone(out, from, to, length, volume, type = 'sine') {
  const osc = ctx.createOscillator();
  const g = gain(0);
  osc.type = type;
  chain(osc, g, out);
  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

const BUILDERS = {
  rain(out) {
    const src = noiseSource('white');
    const level = gain(0.35);
    chain(src, filter('highpass', 500), filter('lowpass', 7000), level, out);
    // Slow LFO makes the rain swell and ease like gusts of wind
    const lfo = ctx.createOscillator();
    const depth = gain(0.12);
    lfo.frequency.value = 0.15;
    chain(lfo, depth, level.gain);
    src.start();
    lfo.start();
    const stopDrops = every(40, 160, () => pop(out, 2500 + Math.random() * 3000, 0.08, 0.02));
    return () => { stopDrops(); src.stop(); lfo.stop(); };
  },

  birds(out) {
    const wind = noiseSource('brown');
    chain(wind, filter('lowpass', 600), gain(0.25), out);
    wind.start();
    const stopChirps = every(600, 2600, () => {
      const base = 2500 + Math.random() * 1500;
      const notes = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) {
        setTimeout(() => tone(out, base, base * 1.4, 0.09, 0.06), i * 110);
      }
    });
    return () => { stopChirps(); wind.stop(); };
  },

  cafe(out) {
    const murmur = noiseSource('brown');
    chain(murmur, filter('bandpass', 400, 0.6), gain(0.7), out);
    murmur.start();
    const stopClinks = every(2500, 7000, () => tone(out, 2600 + Math.random() * 800, 2400, 0.4, 0.035, 'triangle'));
    return () => { stopClinks(); murmur.stop(); };
  },

  fire(out) {
    const rumble = noiseSource('brown');
    chain(rumble, filter('lowpass', 300), gain(0.8), out);
    rumble.start();
    const stopCrackles = every(60, 450, () => pop(out, 1500 + Math.random() * 2500, 0.25, 0.03));
    return () => { stopCrackles(); rumble.stop(); };
  },
};

/** Starts an ambient sound (stopping any other). Must follow a user gesture at least once. */
export function playAmbient(id, volume) {
  if (active?.id === id) return setAmbientVolume(volume);
  stopAmbient();
  const builder = BUILDERS[id];
  if (!builder) return;
  try {
    getContext();
    setAmbientVolume(volume);
    // Each sound gets its own output so it can fade out on its own
    const out = gain(1);
    out.connect(master);
    const stopNodes = builder(out);
    active = {
      id,
      stop() {
        stopNodes();
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        setTimeout(() => out.disconnect(), 500);
      },
    };
  } catch {
    // Web Audio unavailable — focus works fine in silence
  }
}

export function setAmbientVolume(volume) {
  if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
}

export function stopAmbient() {
  active?.stop();
  active = null;
}

/** Gentle beep for session end */
export function playBeep() {
  try {
    getContext();
    tone(ctx.destination, 880, 880, 1.2, 0.4); // full volume, not the ambient slider
  } catch {
    // Audio unavailable — silent fallback
  }
}
