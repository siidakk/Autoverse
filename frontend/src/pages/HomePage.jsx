import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useProgress, useGLTF } from "@react-three/drei";
import HeroScene from "../components/home/HeroScene";
import { HERO_SEQUENCE, DISPLAY_MS, FADE_MS } from "../components/home/heroSequence";
import { SECTIONS } from "../data/navigation";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Holds each car for a while, fades it out, swaps in the next one. Split into
// two timers so a click can interrupt the cycle cleanly.
// Holds each car for a while, then hands over to the next.
//
// The outgoing car stays mounted for the length of the fade so the two overlap
// rather than following each other. Previously the old one faded out, was
// unmounted, and only then did the new one begin -- which left a beat with an
// empty turntable in the middle of every swap.
function useCarCarousel(length) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const [still] = useState(prefersReducedMotion);

  const move = useCallback(
    (next) => {
      setLeaving((current) => (current === null ? index : current));
      setIndex(next);
    },
    [index]
  );

  useEffect(() => {
    if (still) return;
    const id = window.setTimeout(() => move((index + 1) % length), DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, length, still, move]);

  // Once the crossfade is over the outgoing car is dropped, which is what frees
  // its materials.
  useEffect(() => {
    if (leaving === null) return;
    const id = window.setTimeout(() => setLeaving(null), FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  // The next model is fetched while the current one is still on screen, so the
  // swap does not stall on a download.
  useEffect(() => {
    useGLTF.preload(HERO_SEQUENCE[(index + 1) % length].model);
  }, [index, length]);

  const goTo = (next) => {
    if (next === index) return;
    move(next);
  };

  return { index, leaving, goTo, still };
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Counts up when it first comes into view. A number that arrives already
// finished reads as decoration; one that climbs reads as a measurement.
function Counter({ to, suffix = "", decimals = 0, duration = 1400 }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!seen) return;

    let frame;

    // Someone who has asked for less motion gets the finished number, but on
    // the next frame rather than during the effect itself.
    if (prefersReducedMotion()) {
      frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }

    const started = performance.now();

    const step = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      // Fast at first, easing to a stop, like a needle settling.
      setValue(to * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [seen, to, duration]);

  return (
    <span ref={ref} className="readout">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function HeroLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div className="absolute bottom-6 left-5 z-30 md:left-8">
      <p className="label">Loading geometry — {Math.round(progress)}%</p>
      <div className="sweep relative mt-2 h-[2px] w-44 overflow-hidden rounded-full bg-line" />
    </div>
  );
}

const numbers = [
  { value: 15, suffix: "", label: "cars in 3D", note: "each one measured, not hand placed" },
  { value: 120, suffix: "", label: "models matched", note: "On sale now, 2026 prices" },
  { value: 83, suffix: "%", label: "damage accuracy", note: "on photos it never trained on" },
  { value: 0, suffix: "", label: "photos uploaded", note: "vision runs on your device" }
];

const marquee = [
  "Wheels found by geometry, not by name",
  "Paint that leaves the headlights alone",
  "Every engine note built from its own cylinder count",
  "Damage named by a trained model",
  "Prices in ₹, from Indian listings",
  "Nothing leaves your phone"
];

export default function HomePage() {
  const { index, leaving, goTo, still } = useCarCarousel(HERO_SEQUENCE.length);
  const activeCar = HERO_SEQUENCE[index];

  return (
    <div className="overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="relative">
        {/* Light behind the car, drifting. This is what stops the page reading
            as a black rectangle before anything has loaded. */}
        <div className="aurora" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 md:px-8">

          {/* 3D LAYER
              On a wide screen the car gets the right hand side to itself. It
              used to span the whole hero, which put a Porsche directly behind
              the words "change a thing" -- both fighting for the same pixels
              and neither winning. On a phone there is no room to split, so it
              stays full width behind the text with the gradient below doing
              the work. */}
          <div className="absolute inset-0 z-0 md:left-[38%]">
            <HeroScene
              car={activeCar}
              leavingCar={leaving === null ? null : HERO_SEQUENCE[leaving]}
              spin={!still}
            />
          </div>

          {/* Type has to stay readable over whatever colour the car is. Dark
              from the bottom on a phone, where the car sits behind the words;
              dark from the left on a wide screen, where it sits beside them. */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-ink via-ink/75 to-transparent md:bg-gradient-to-r md:from-ink md:via-ink/55 md:to-transparent" />

          <HeroLoader />

          <div className="relative z-20 flex min-h-[100svh] flex-col justify-center py-24">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-sm"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              <span className="label text-fog">Live in your browser · no install</span>
            </motion.div>

            <h1 className="mt-7 max-w-3xl text-[clamp(2.75rem,8vw,5.75rem)] leading-[0.92] font-semibold tracking-tight">
              {["See your car", "before you", "change a thing."].map((line, i) => (
                <motion.span
                  key={line}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                  className="block"
                >
                  {i === 2 ? (
                    <>
                      change <span className="text-gradient">a thing.</span>
                    </>
                  ) : (
                    line
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.42 }}
              className="mt-8 max-w-xl text-lg leading-relaxed text-fog"
            >
              Wheels, stance, paint, exhaust — fitted to a real 3D model by
              measuring the car itself. Not a picture of a car like yours. Yours.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link to="/customise" className="btn btn-signal">
                Start building
              </Link>
              <Link to="/discover" className="btn btn-ghost">
                Find me a car
              </Link>
            </motion.div>

            {/* WHICH CAR IS ON SCREEN */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-14"
            >
              <p className="label mb-3">Now showing</p>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {HERO_SEQUENCE.map((car, i) => {
                  const active = i === index;

                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => goTo(i)}
                      className={[
                        "group flex items-center gap-2 transition-colors",
                        active ? "text-chalk" : "text-fog hover:text-chalk"
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "block h-[2px] rounded-full transition-all duration-300",
                          active
                            ? "w-7 bg-gradient-to-r from-signal to-flare"
                            : "w-3 bg-line group-hover:w-5 group-hover:bg-fog"
                        ].join(" ")}
                      />
                      <span className="readout text-[11px]">{car.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* SCROLL CUE */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: [0, 0, 10, 14] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: 1.4 }}
            className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 md:block"
          >
            <span className="label">Scroll</span>
          </motion.div>
        </div>
      </section>

      {/* ================= MARQUEE ================= */}
      <section className="relative border-y border-white/8 py-5">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {marquee.map((line) => (
                <span key={line} className="flex items-center whitespace-nowrap">
                  <span className="px-7 text-sm text-fog">{line}</span>
                  <span className="h-1 w-1 rounded-full bg-signal/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ================= WHAT IT DOES ================= */}
      <section className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
        <Reveal>
          <p className="label">Five things it does</p>
          <h2 className="mt-4 max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
            Every part of it answers <span className="text-gradient">a real question</span>.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section, i) => (
            <Reveal key={section.to} delay={i * 0.07}>
              <Link
                to={section.to}
                className="panel lift group flex h-full flex-col p-7"
              >
                <span className="label">{`0${i + 1}`}</span>

                <span className="mt-5 text-2xl font-semibold tracking-tight">
                  {section.label}
                </span>

                <span className="mt-2 text-[15px] leading-relaxed text-chalk/85">
                  {section.blurb}
                </span>

                <span className="mt-5 text-sm leading-relaxed text-fog">
                  {section.kicker}
                </span>

                <span className="mt-7 flex items-center gap-2 text-sm text-signal">
                  Open
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}

          <Reveal delay={SECTIONS.length * 0.07}>
            <Link
              to="/garage"
              className="panel lift group flex h-full flex-col justify-between p-7"
            >
              <div>
                <span className="label">Your account</span>
                <span className="mt-5 block text-2xl font-semibold tracking-tight">
                  Garage
                </span>
                <span className="mt-2 block text-[15px] leading-relaxed text-chalk/85">
                  Everything you have saved, in one place
                </span>
              </div>
              <span className="mt-7 flex items-center gap-2 text-sm text-signal">
                Open
                <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ================= WHY ================= */}
      <section className="relative overflow-hidden border-y border-white/8">
        <div className="grid-veil absolute inset-0" />

        <div className="relative mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <p className="label">Why this exists</p>
              <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl">
                Plausible is not
                <br />
                <span className="text-gradient">the same as true.</span>
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="space-y-6 text-[17px] leading-relaxed text-fog">
                <p>
                  This started with one car and one question: what would it look
                  like lowered, on different wheels? The obvious answer was to
                  photograph it and ask an image model.
                </p>
                <p className="text-chalk">
                  What came back was always convincing and never right. The
                  proportions drifted. The wheels sat where wheels usually sit,
                  not where they sit on that car. It was a picture of a car like
                  mine.
                </p>
                <p>
                  So everything here is measured instead of imagined. Wheels are
                  found by their geometry rather than by what a modeller happened
                  to name them. An exhaust is placed against the actual rear
                  valance. Paint is kept off the lamps because the lamps are
                  found first.
                </p>
                <p className="text-chalk">
                  It is slower to build that way, and it is the only way the
                  answer is worth anything.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= NUMBERS ================= */}
      <section className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-28">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {numbers.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <p className="text-5xl font-semibold tracking-tight md:text-6xl">
                <Counter to={item.value} suffix={item.suffix} />
              </p>
              <p className="mt-3 text-chalk">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-fog">{item.note}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden border-t border-white/8">
        <div className="aurora opacity-40" />

        <div className="relative mx-auto max-w-[1500px] px-5 py-28 text-center md:px-8 md:py-36">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl">
              Pick a car. Change everything.
              <br />
              <span className="text-gradient">See it properly.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-7 max-w-xl leading-relaxed text-fog">
              Fifteen cars, every part priced in rupees, and nothing to install.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-11 flex flex-wrap justify-center gap-3">
              <Link to="/customise" className="btn btn-signal">
                Start building
              </Link>
              <Link to="/value" className="btn btn-ghost">
                Check a car's value
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
