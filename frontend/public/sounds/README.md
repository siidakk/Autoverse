# Engine recordings

Put engine audio in this folder and the configurator plays it instead of the
synthesised engine. Nothing here is required — without files the site still
works, it just sounds synthesised.

Nothing is committed. Engine libraries are either paid or carry a licence worth
reading, and neither belongs in someone else's git history.

## What to add

Two files per engine, both short:

| file | what it is | length |
|---|---|---|
| `<name>-idle.mp3` | the engine ticking over, **seamlessly loopable** | 3–6 s |
| `<name>-rev.mp3` | one blip of the throttle, idle → up → back to idle | 2–4 s |

**mp3 or ogg, mono, 128 kbps is plenty.** These are ambient noises behind a 3D
scene, not music. Keep each file under about 150 KB — the car models are
already heavy, and a 96 kHz 24-bit wav is roughly a hundred times larger than
this needs to be for no audible gain here.

The idle must loop cleanly or you will hear a click every few seconds. Trim it
at zero crossings and match the level at both ends.

## Where to get them legally

- **Sonniss GDC Game Audio Bundle** — released free every year, royalty-free
  including commercial use. Large downloads, but it contains vehicle
  recordings. This is the same company as the paid Fortuner library.
- **Pixabay Sound Effects** — free, no attribution required.
- **Freesound** — filter the licence to **CC0** to avoid attribution
  obligations, or honour the attribution if you use CC-BY.

Do not use audio ripped from a game, a film, or a YouTube video. For a project
you are showing to employers, a licence you cannot point to is a liability.

## Wiring a file up

Edit `src/data/engineSamples.js`.

For one specific car, key it by the same model path used in `src/data/cars.js`:

```js
export const CAR_SAMPLES = {
  "/models/toyota_fortuner_2021.glb": {
    idle: "/sounds/fortuner-idle.mp3",
    rev: "/sounds/fortuner-rev.mp3"
  }
};
```

That plays exactly as recorded, no pitch shifting.

## One recording covering several cars

A single good recording stands in for a whole family. Add it to
`FAMILY_SAMPLES` along with the engine it was actually recorded from:

```js
{
  id: "v8-cross",
  layout: "cross",
  recordedFrom: { cylinders: 8, idle: 650, redline: 6500 },
  idle: "/sounds/v8-idle.mp3",
  rev: "/sounds/v8-rev.mp3"
}
```

It is then pitch-shifted to any matching car by the ratio of the two engines'
firing frequencies — the same arithmetic in `src/data/engines.js` that decides
a V12 sits an octave above a straight six. A shift beyond 1.5x either way is
refused, because past that it stops sounding like the same engine at a
different speed and starts sounding like a tape running wrong.

Four recordings — a cross-plane V8, a straight six, a four, and a diesel four
— cover most of the garage.

## Checking what a car is using

In the browser console on the configurator:

```js
__autoverseParts()   // parts and paint, not audio
```

For audio, `recordingFor(model, engine)` in `src/lib/sound.js` returns either a
description of the recording in use or `null`, meaning the synthesiser is
playing.
