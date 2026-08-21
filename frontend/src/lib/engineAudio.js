// Playing recorded engine audio, where a recording exists.
//
// Kept apart from sound.js because the two answer different questions: this one
// plays a file, that one builds a noise from nothing. The configurator asks
// this first and falls back to that.

import { sampleFor } from "../data/engineSamples";

// Decoded audio, kept so a file is only fetched and decoded once.
const buffers = new Map();

// Files that turned out not to be there. A missing recording is the normal
// case rather than an error, so it is remembered and never asked for again.
const missing = new Set();

export async function load(url, ctx) {
  if (!url || missing.has(url)) return null;
  if (buffers.has(url)) return buffers.get(url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      missing.add(url);
      return null;
    }

    const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, decoded);
    return decoded;
  } catch {
    // A file that is absent, or is not audio the browser can decode, is
    // treated the same way: there is no recording, so synthesise instead.
    missing.add(url);
    return null;
  }
}

// True when this car has a recording that can play, which is what tells the
// caller whether to synthesise. Loads it as a side effect, so the first press
// of the button is not silent while it fetches.
export async function available(model, engine, ctx) {
  const choice = sampleFor(model, engine);
  if (!choice) return false;

  const buffer = await load(choice.rev ?? choice.idle, ctx);
  return Boolean(buffer);
}

// A blip of the throttle from a recording. `rate` shifts a family recording to
// this engine's pitch; a clip recorded from this exact car plays at 1.
export async function playRev(model, engine, ctx, destination, { loudness = 1 } = {}) {
  const choice = sampleFor(model, engine);
  if (!choice?.rev) return false;

  const buffer = await load(choice.rev, ctx);
  if (!buffer) return false;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  source.playbackRate.value = choice.rate;

  // A louder exhaust is not just louder, it is brighter, so the filter opens
  // as well. Without this a quad and a stock pipe differ only in volume.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = Math.min(2600 * loudness * loudness, 18000);
  tone.Q.value = 0.7;

  gain.gain.value = Math.min(0.9 * loudness, 1.4);

  source.connect(tone).connect(gain).connect(destination);
  source.start();

  return true;
}

// The idle, looped. Returns something that can be stopped, or null when there
// is no recording to loop.
export async function startIdle(model, engine, ctx, destination) {
  const choice = sampleFor(model, engine);
  if (!choice?.idle) return null;

  const buffer = await load(choice.idle, ctx);
  if (!buffer) return null;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();

  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = choice.rate;

  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.6, t + 0.6);

  source.connect(gain).connect(destination);
  source.start();

  return {
    stop() {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      source.stop(now + 0.5);
    }
  };
}

// What is actually playing for a car, for the console and for the panel.
export function describe(model, engine) {
  const choice = sampleFor(model, engine);
  if (!choice) return null;
  if (missing.has(choice.rev ?? choice.idle)) return null;
  return choice.source;
}
