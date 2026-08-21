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

import * as engineAudio from "./engineAudio";

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

// --- engines ---
//
// Built from the car's own specification rather than from a recording. See
// data/engines.js: the note an engine makes is its firing frequency, which is
// rpm and cylinder count and nothing else. Everything below layers character
// on top of that one number.

// How the revs actually move when you blip the throttle: up fast, hang for a
// moment, fall back more slowly than they rose. A big heavy engine takes
// longer to do all three.
function rpmCurve(engine, samples = 96, hold = 0.18) {
  const { idle, redline, capacity } = engine;

  // Rotating mass. A 6.5 litre V12 will not pick up like a 1.3 rotary.
  const inertia = Math.min(Math.max(capacity / 4, 0.28), 1.5);
  const riseFor = 0.3 + inertia * 0.34;
  const fallFor = 0.45 + inertia * 0.5;
  const total = riseFor + hold + fallFor;

  const values = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * total;
    let rpm;

    if (t < riseFor) {
      // Fast at first and easing off as it meets the limiter.
      const p = t / riseFor;
      rpm = idle + (redline - idle) * (1 - Math.pow(1 - p, 2.1));
    } else if (t < riseFor + hold) {
      // Bouncing off the limiter rather than sitting flat on it.
      rpm = redline + Math.sin((t - riseFor) * 90) * redline * 0.012;
    } else {
      const p = (t - riseFor - hold) / fallFor;
      rpm = redline - (redline - idle) * Math.pow(p, 0.75);
    }

    values[i] = Math.max(rpm, 1);
  }

  return { values, total };
}

// The harmonics an engine puts out, and how loud each is. This is where a
// layout stops being a number and starts being a sound.
function harmonicsFor(engine) {
  const { layout, smooth } = engine;

  if (layout === "rotary") {
    // No reciprocating mass, so almost no low order content and a hard edge
    // higher up: the sound a rotary is famous for.
    return [[1, 0.5], [2, 0.62], [3, 0.34], [4, 0.26], [6, 0.14]];
  }

  const set = [[1, 1], [2, 0.55], [3, 0.3], [4, 0.18], [6, 0.08]];

  if (layout === "cross") {
    // A cross plane V8 fires unevenly across its two banks, and the half order
    // that produces is the whole reason it burbles instead of shrieking.
    set.unshift([0.5, 0.85]);
    set.push([1.5, 0.4]);
  }

  if (layout === "flat") set.push([1.5, 0.22]);

  // A balanced engine puts more of its energy up the harmonic series.
  return set.map(([order, level]) => [
    order,
    order >= 3 ? level * (0.6 + smooth * 0.9) : level
  ]);
}

function orderOf(engine) {
  return engine.rotor ? 2 : engine.cylinders / 2;
}

// A blip of the throttle, synthesised. Callers want rev() below, which
// reaches for a recording first.
function synthRev(engine, { loudness = 1 } = {}) {
  const ctx = ready();
  if (!ctx) return 0;

  const t = ctx.currentTime;
  const { values, total } = rpmCurve(engine);
  const order = orderOf(engine);

  // rpm to hertz, once, then every oscillator is a multiple of it.
  const fundamental = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) fundamental[i] = (values[i] / 60) * order;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.3 * loudness, t + 0.05);
  out.gain.setValueAtTime(0.3 * loudness, t + total * 0.6);
  out.gain.exponentialRampToValueAtTime(0.0001, t + total);
  out.connect(master);

  // The exhaust opening up as the revs rise.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1.4;

  const cutoff = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    cutoff[i] = Math.min(1100 + fundamental[i] * 14 * loudness, 16000);
  }
  filter.frequency.setValueCurveAtTime(cutoff, t, total);
  filter.connect(out);

  for (const [multiple, level] of harmonicsFor(engine)) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = multiple < 1 ? "triangle" : "sawtooth";
    // A few cents apart, which stops the harmonics phase locking into
    // something that sounds like an organ rather than an engine.
    osc.detune.value = (multiple * 37) % 11;

    const track = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      track[i] = Math.min(Math.max(fundamental[i] * multiple, 20), 18000);
    }

    osc.frequency.setValueCurveAtTime(track, t, total);
    gain.gain.value = level * 0.22;

    osc.connect(gain).connect(filter);
    osc.start(t);
    osc.stop(t + total + 0.05);
  }

  // Induction, which rises with the revs on anything.
  const air = noise(ctx, total);
  const airBand = ctx.createBiquadFilter();
  const airGain = ctx.createGain();

  airBand.type = "bandpass";
  airBand.Q.value = 0.9;

  const airTrack = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) airTrack[i] = 500 + fundamental[i] * 6;
  airBand.frequency.setValueCurveAtTime(airTrack, t, total);
  airGain.gain.value = 0.05 * loudness;

  air.connect(airBand).connect(airGain).connect(out);
  air.start(t);

  // Compression ignition is audibly noisy, and the rate of that noise is the
  // firing frequency itself, so the clatter keeps time with the engine.
  if (engine.clatter > 0) {
    const knock = noise(ctx, total);
    const knockBand = ctx.createBiquadFilter();
    const knockGain = ctx.createGain();
    const pulse = ctx.createOscillator();
    const pulseDepth = ctx.createGain();

    knockBand.type = "bandpass";
    knockBand.frequency.value = 1800;
    knockBand.Q.value = 1.2;

    knockGain.gain.value = 0.02 * engine.clatter;

    pulse.type = "square";
    pulse.frequency.setValueCurveAtTime(fundamental, t, total);
    pulseDepth.gain.value = 0.05 * engine.clatter;
    pulse.connect(pulseDepth).connect(knockGain.gain);
    pulse.start(t);
    pulse.stop(t + total);

    knock.connect(knockBand).connect(knockGain).connect(out);
    knock.start(t);
  }

  // Forced induction. A turbo spools behind the revs and lets go on lift; a
  // supercharger is belt driven, so its whine tracks rpm exactly.
  if (engine.aspiration === "turbo" || engine.aspiration === "supercharged") {
    const belt = engine.aspiration === "supercharged";
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();

    whistle.type = belt ? "sawtooth" : "sine";

    const track = new Float32Array(values.length);
    const level = new Float32Array(values.length);

    for (let i = 0; i < values.length; i++) {
      const spun = (values[i] - engine.idle) / (engine.redline - engine.idle);
      track[i] = Math.min(1400 + spun * (belt ? 5200 : 7200), 17000);
      // A turbo needs revs behind it before it makes any noise at all.
      level[i] = Math.max(belt ? spun * 0.05 : Math.pow(spun, 1.9) * 0.055, 0.0001);
    }

    whistle.frequency.setValueCurveAtTime(track, t, total);
    whistleGain.gain.setValueCurveAtTime(level, t, total);

    whistle.connect(whistleGain).connect(out);
    whistle.start(t);
    whistle.stop(t + total);

    if (!belt) {
      // The release when the throttle shuts.
      const off = t + total * 0.55;
      const pshh = noise(ctx, 0.3);
      const band = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      band.type = "bandpass";
      band.frequency.setValueAtTime(3800, off);
      band.frequency.exponentialRampToValueAtTime(1300, off + 0.28);
      band.Q.value = 0.7;

      gain.gain.setValueAtTime(0.0001, off);
      gain.gain.exponentialRampToValueAtTime(0.05, off + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, off + 0.3);

      pshh.connect(band).connect(gain).connect(master);
      pshh.start(off);
    }
  }

  return total;
}

// A blip of the throttle. A recording of the real engine if this car has one,
// and the synthesiser only when it does not: no arrangement of oscillators
// sounds as much like an engine as an engine does.
export async function rev(model, engine, { loudness = 1 } = {}) {
  const ctx = ready();
  if (!ctx) return;

  const played = await engineAudio.playRev(model, engine, ctx, master, { loudness });
  if (!played && !muted) synthRev(engine, { loudness });
}

// Saving a build. The one moment worth a proper send off.
export function launch(model, engine) {
  if (!ready()) return;

  rev(model, engine, { loudness: 1.15 });

  // A second blip on the way out, so it lifts rather than just stopping.
  window.setTimeout(() => rev(model, engine, { loudness: 0.8 }), 780);
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

let running = null;

export function idling() {
  return Boolean(running);
}

// The synthesised idle, held at idle speed with the same harmonic recipe as
// the rev. Returned as something stoppable so the caller does not care whether
// it got this or a recording.
function synthIdle(ctx, engine) {
  const t = ctx.currentTime;
  const base = (engine.idle / 60) * orderOf(engine);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.07, t + 0.7);
  out.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 240 + base * 3.2;
  filter.Q.value = 2.5;
  filter.connect(out);

  const parts = [];

  for (const [multiple, level] of harmonicsFor(engine)) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = multiple < 1 ? "triangle" : "sawtooth";
    osc.frequency.value = base * multiple;
    osc.detune.value = (multiple * 41) % 13;
    gain.gain.value = level * 0.16;

    osc.connect(gain).connect(filter);
    osc.start(t);
    parts.push(osc);
  }

  if (engine.clatter > 0) {
    const knock = ctx.createOscillator();
    const knockGain = ctx.createGain();

    knock.type = "square";
    knock.frequency.value = base;
    knockGain.gain.value = 0.02 * engine.clatter;

    knock.connect(knockGain).connect(filter);
    knock.start(t);
    parts.push(knock);
  }

  // The lump. A real engine at rest is never quite steady, and a constant tone
  // reads as a fridge rather than a car.
  const wobble = ctx.createOscillator();
  const wobbleDepth = ctx.createGain();

  wobble.type = "sine";
  wobble.frequency.value = 4.5 + (1 - engine.smooth) * 4;
  wobbleDepth.gain.value = base * 0.045;
  wobble.connect(wobbleDepth);
  for (const node of parts) {
    if (node.frequency) wobbleDepth.connect(node.frequency);
  }
  wobble.start(t);
  parts.push(wobble);

  return {
    stop() {
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      for (const node of parts) node.stop(now + 0.5);
    }
  };
}

// A recording if there is one, the synthesiser if there is not. Everything
// outside this module goes through here rather than choosing for itself.
export async function startIdle(model, engine) {
  const ctx = ready();
  if (!ctx) return false;
  if (running) return true;

  const recorded = await engineAudio.startIdle(model, engine, ctx, master);

  // Muting while the file was still downloading.
  if (muted) {
    recorded?.stop();
    return false;
  }

  running = recorded ?? synthIdle(ctx, engine);
  return true;
}

export function stopIdle() {
  if (!running) return;
  const current = running;
  running = null;
  current.stop();
}

// Changing car, or fitting a different exhaust, while the engine is running.
export function retuneIdle(model, engine) {
  if (!running) return;
  stopIdle();
  window.setTimeout(() => startIdle(model, engine), 120);
}

// What a car will actually sound like: the recording it found, or nothing,
// meaning the synthesiser is doing the work.
export function recordingFor(model, engine) {
  return engineAudio.describe(model, engine);
}
