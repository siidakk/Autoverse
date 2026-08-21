// The noises the configurator makes, synthesised rather than loaded.
//
// Every sound here is built from oscillators and filtered noise at the moment
// it plays. Nothing is downloaded, which matters because the models are already
// heavy and a set of engine samples worth listening to would be megabytes on
// its own. It also means a rev can be built to match the exhaust that was
// fitted instead of playing the same clip every time.
//
// The audio context is not created until the first sound is asked for. Browsers
// refuse to start one before the user has interacted with the page, and every
// sound here is triggered by a click, so by then it is allowed.

const STORAGE_KEY = "autoverse:sound";

let context = null;
let master = null;
let muted = read();

function read() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    // Private browsing throws on localStorage. Sound on is the better default.
    return false;
  }
}

function ready() {
  if (muted) return null;

  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;

    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
  }

  // Tabs suspend the context when they lose focus and do not always resume it.
  if (context.state === "suspended") context.resume();

  return context;
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = next;
  if (next) stopIdle();
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "off" : "on");
  } catch {
    // Not being able to remember the setting is not worth failing over.
  }
  if (next && context) context.suspend();
}

// A short burst of noise, which is what gives a click or a rev its texture.
// Pure oscillators on their own sound like a test tone.
function noise(ctx, seconds) {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function envelope(ctx, gain, peak, attack, hold, release) {
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.setValueAtTime(peak, t + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return t + attack + hold + release;
}

// --- the sounds ---

// Selecting an option. Deliberately small: this fires often.
export function tick() {
  const ctx = ready();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(1250, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.05);

  const stop = envelope(ctx, gain, 0.06, 0.004, 0.005, 0.05);

  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(stop + 0.02);
}

// A part being fitted: the dull knock of something solid seating home.
export function clunk() {
  const ctx = ready();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(58, ctx.currentTime + 0.12);

  const stop = envelope(ctx, gain, 0.3, 0.005, 0.01, 0.13);
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(stop + 0.02);

  // The rattle on top, which is what stops it sounding like a drum machine.
  const hit = noise(ctx, 0.09);
  const band = ctx.createBiquadFilter();
  const hitGain = ctx.createGain();

  band.type = "bandpass";
  band.frequency.value = 2100;
  band.Q.value = 0.8;

  envelope(ctx, hitGain, 0.08, 0.002, 0.004, 0.07);
  hit.connect(band).connect(hitGain).connect(master);
  hit.start();
}

// An engine blip. `weight` moves it from a small four cylinder towards
// something with a lot more capacity, so a quad exhaust does not sound like a
// hatchback and a carbon one has some bass to it.
export function rev({ weight = 0.5, duration = 0.85, level = 0.22 } = {}) {
  const ctx = ready();
  if (!ctx) return;

  const t = ctx.currentTime;
  const idle = 78 - weight * 30;
  const peak = idle * 4.2;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(360, t);
  filter.frequency.exponentialRampToValueAtTime(3200, t + duration * 0.34);
  filter.frequency.exponentialRampToValueAtTime(520, t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.06);
  gain.gain.setValueAtTime(level, t + duration * 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  filter.connect(gain).connect(master);

  // Two saws an octave apart, slightly detuned. The detune is what makes it
  // read as an engine rather than a synthesiser.
  for (const [multiplier, detune] of [[1, 0], [0.5, -8], [2, 11]]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(idle * multiplier, t);
    osc.frequency.exponentialRampToValueAtTime(peak * multiplier, t + duration * 0.34);
    osc.frequency.exponentialRampToValueAtTime(idle * 1.35 * multiplier, t + duration);
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Induction roar.
  const air = noise(ctx, duration);
  const airBand = ctx.createBiquadFilter();
  const airGain = ctx.createGain();

  airBand.type = "bandpass";
  airBand.frequency.setValueAtTime(700, t);
  airBand.frequency.exponentialRampToValueAtTime(2600, t + duration * 0.34);
  airBand.frequency.exponentialRampToValueAtTime(900, t + duration);
  airBand.Q.value = 1.1;

  airGain.gain.setValueAtTime(0.0001, t);
  airGain.gain.exponentialRampToValueAtTime(level * 0.5, t + 0.08);
  airGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  air.connect(airBand).connect(airGain).connect(master);
  air.start(t);
}

// Saving a build. The one moment worth a proper send off.
export function launch() {
  const ctx = ready();
  if (!ctx) return;

  rev({ weight: 0.85, duration: 1.5, level: 0.26 });

  // A second blip on the way out, so it lifts rather than just stopping.
  window.setTimeout(() => rev({ weight: 0.7, duration: 0.9, level: 0.15 }), 620);
}

// Changing the room, or moving the camera to a preset.
export function whoosh() {
  const ctx = ready();
  if (!ctx) return;

  const t = ctx.currentTime;
  const air = noise(ctx, 0.5);
  const band = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  band.type = "bandpass";
  band.Q.value = 1.6;
  band.frequency.setValueAtTime(320, t);
  band.frequency.exponentialRampToValueAtTime(2400, t + 0.22);
  band.frequency.exponentialRampToValueAtTime(400, t + 0.5);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.09, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

  air.connect(band).connect(gain).connect(master);
  air.start(t);
}

// Underglow coming on: a neon tube striking, then settling to a hum.
export function neon() {
  const ctx = ready();
  if (!ctx) return;

  const t = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.1, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.03, t + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  gain.connect(master);

  for (const frequency of [220, 330, 440]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.9);
  }
}


// --- the engine, left running ---
//
// A rev is a gesture. An idle is a state, so it is built once and kept, with
// a slow wobble on top: a real engine at rest is never quite steady, and a
// perfectly constant tone reads as a fridge rather than a car.

let engine = null;

export function idling() {
  return Boolean(engine);
}

export function startIdle({ weight = 0.5 } = {}) {
  const ctx = ready();
  if (!ctx) return false;
  if (engine) return true;

  const t = ctx.currentTime;
  const base = 48 - weight * 14;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.05, t + 0.7);
  out.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 260 + weight * 140;
  filter.Q.value = 3;
  filter.connect(out);

  const parts = [];

  // The firing orders, roughly: the fundamental plus the two harmonics that
  // carry most of what an idle actually sounds like.
  for (const [multiplier, detune] of [[1, 0], [2, 6], [3, -9]]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = base * multiplier;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(t);
    parts.push(osc);
  }

  // The lump. Slow, shallow, and enough to stop it sounding synthetic.
  const wobble = ctx.createOscillator();
  const wobbleDepth = ctx.createGain();
  wobble.type = "sine";
  wobble.frequency.value = 5.5;
  wobbleDepth.gain.value = base * 0.05;
  wobble.connect(wobbleDepth);
  for (const osc of parts) wobbleDepth.connect(osc.frequency);
  wobble.start(t);
  parts.push(wobble);

  engine = { out, parts };
  return true;
}

export function stopIdle() {
  if (!engine || !context) return;

  const { out, parts } = engine;
  engine = null;

  const t = context.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

  for (const node of parts) node.stop(t + 0.5);
}

// Fitting a different exhaust while the engine is running should be audible.
export function retuneIdle(weight) {
  if (!engine) return;
  stopIdle();
  window.setTimeout(() => startIdle({ weight }), 120);
}
