import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useProgress, useGLTF } from "@react-three/drei";
import HeroScene from "../components/home/HeroScene";
import { HERO_SEQUENCE } from "../components/home/heroSequence";
import { cars } from "../data/cars";
import { finishes, totalShades } from "../data/paint";

const DISPLAY_MS = 5600;
const FADE_MS = 700;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Holds each car for a while, fades it out, swaps in the next one. Split into
// two timers so a click can interrupt the cycle cleanly.
function useCarCarousel(length) {
  const [index, setIndex] = useState(0);
  const [showing, setShowing] = useState(true);
  const pending = useRef(null);
  const [still] = useState(prefersReducedMotion);

  useEffect(() => {
    if (!showing || still) return;
    const id = window.setTimeout(() => setShowing(false), DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [showing, index, still]);

  useEffect(() => {
    if (showing) return;

    const id = window.setTimeout(() => {
      // Read eagerly: the updater below runs during render, by which point the
      // ref would already have been cleared.
      const requested = pending.current;
      pending.current = null;

      setIndex((current) => requested ?? (current + 1) % length);
      setShowing(true);
    }, FADE_MS);

    return () => window.clearTimeout(id);
  }, [showing, length]);

  // The next model is fetched while the current one is still on screen, so the
  // swap does not stall on a download.
  useEffect(() => {
    useGLTF.preload(HERO_SEQUENCE[(index + 1) % length].model);
  }, [index, length]);

  const goTo = (next) => {
    if (next === index) return;
    pending.current = next;
    setShowing(false);
  };

  return { index, showing, goTo, still };
}

const capabilities = [
  {
    index: "01",
    title: "3D Configurator",
    status: "live",
    body: "Paint, finish, wheels and spoilers applied to a real GLB model under studio lighting, on a reflective showroom floor."
  },
  {
    index: "02",
    title: "Geometric Fitting",
    status: "live",
    body: "Parts are measured onto each car. Wheels are found by geometry rather than mesh names, and spoilers are raycast onto the boot lid."
  },
  {
    index: "03",
    title: "ML Recommendations",
    status: "live",
    body: "A scikit-learn model scores your inputs and returns the five closest matches from the dataset, served by a Flask API."
  },
  {
    index: "04",
    title: "Resale Price Prediction",
    status: "planned",
    body: "Regression over age, mileage, fuel type and condition to estimate what a car is still worth."
  },
  {
    index: "05",
    title: "Vision: Car Detection",
    status: "planned",
    body: "Upload a photo, detect the model and body type, then open the matching car in the configurator."
  },
  {
    index: "06",
    title: "Damage Assessment",
    status: "planned",
    body: "Locate scratches, dents and cracks from photographs, then grade severity and estimate repair cost."
  }
];

const steps = [
  { index: "01", title: "Choose a platform", body: "Every model normalised to a common scale and stood on the floor." },
  { index: "02", title: "Build the spec", body: "Dozens of paint shades, three finishes, wheel and spoiler options with live pricing." },
  { index: "03", title: "Let the model match you", body: "Feed your numbers to the recommender and compare what comes back." }
];

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HeroLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div className="absolute bottom-8 left-5 z-20 md:left-8">
      <p className="label">Loading geometry — {Math.round(progress)}%</p>
      <div className="sweep relative mt-2 h-[2px] w-44 overflow-hidden bg-line" />
    </div>
  );
}

export default function HomePage() {
  const { index, showing, goTo, still } = useCarCarousel(HERO_SEQUENCE.length);
  const activeCar = HERO_SEQUENCE[index];

  return (
    <div>

      {/* ================= HERO ================= */}
      <section className="relative grid-veil border-b border-line-soft">
        <div className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-[1500px] px-5 md:px-8">

          {/* 3D LAYER */}
          <div className="absolute inset-0 z-0">
            <HeroScene car={activeCar} visible={showing} spin={!still} />
          </div>

          {/* CAR SELECTOR */}
          <div className="absolute right-5 bottom-8 z-30 hidden md:block">
            <p className="label mb-3 text-right">Now showing</p>

            <div className="flex flex-col items-end gap-1.5">
              {HERO_SEQUENCE.map((car, i) => {
                const active = i === index;

                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={[
                      "group flex items-center gap-3 transition-colors",
                      active ? "text-chalk" : "text-fog hover:text-chalk"
                    ].join(" ")}
                  >
                    <span className="readout text-[11px]">{car.name}</span>
                    <span
                      className={[
                        "block h-[2px] transition-all",
                        active
                          ? "w-8 bg-signal"
                          : "w-3 bg-line group-hover:w-5 group-hover:bg-fog"
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRADIENT SO TYPE STAYS READABLE OVER THE CAR */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-ink via-ink/70 to-transparent" />

          <HeroLoader />

          <div className="relative z-20 flex min-h-[calc(100vh-4rem)] flex-col justify-center py-20">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="label"
            >
              3D Configurator / Machine Learning
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-5 max-w-2xl text-5xl leading-[0.95] font-semibold tracking-tight md:text-7xl"
            >
              Build the car,
              <br />
              then let the
              <br />
              <span className="text-signal">model</span> find it.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-7 max-w-lg text-base leading-relaxed text-fog"
            >
              Configure a car in real time in the browser, then hand your
              requirements to a trained recommender and see which cars actually
              fit them.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link to="/configure" className="btn btn-signal">
                Open Configurator
              </Link>
              <Link to="/recommend" className="btn btn-ghost">
                Run AI Match
              </Link>
            </motion.div>

            {/* ACTIVE CAR, FOR SCREENS TOO NARROW FOR THE SELECTOR */}
            <div className="mt-10 flex items-center gap-3 md:hidden">
              <span className="label">Now showing</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeCar.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="readout text-sm text-chalk"
                >
                  {activeCar.name}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* HUD READOUTS */}
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.36 }}
              className="mt-16 flex flex-wrap gap-x-12 gap-y-6"
            >
              {[
                ["Models", String(cars.length).padStart(2, "0")],
                ["Paint shades", String(totalShades)],
                ["Finishes", String(Object.keys(finishes).length).padStart(2, "0")],
                ["Matches returned", "05"]
              ].map(([label, value]) => (
                <div key={label}>
                  <dd className="readout text-3xl text-chalk">{value}</dd>
                  <dt className="label mt-1">{label}</dt>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>
      </section>

      {/* ================= CAPABILITIES ================= */}
      <section className="mx-auto max-w-[1500px] px-5 py-24 md:px-8">
        <Reveal>
          <p className="label">What is built</p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Three systems running, three on the bench.
          </h2>
          <div className="tick-rule mt-8 opacity-70" />
        </Reveal>

        <div className="mt-12 grid gap-px bg-line-soft md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, i) => (
            <Reveal key={item.index} delay={i * 0.05}>
              <article className="h-full bg-ink p-7 transition-colors hover:bg-panel">
                <div className="flex items-center justify-between">
                  <span className="label">{item.index}</span>
                  <span
                    className={[
                      "readout text-[10px] uppercase tracking-widest",
                      item.status === "live" ? "text-data" : "text-fog"
                    ].join(" ")}
                  >
                    {item.status === "live" ? "● Live" : "○ Planned"}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-medium tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fog">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= PROCESS ================= */}
      <section className="border-y border-line-soft bg-panel">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8">
          <Reveal>
            <p className="label">How it runs</p>
          </Reveal>

          <div className="mt-12 grid gap-12 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.index} delay={i * 0.08}>
                <div className="tick-rule-dense opacity-70" />
                <p className="readout mt-6 text-2xl text-signal">{step.index}</p>
                <h3 className="mt-3 text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= GARAGE ================= */}
      <section className="mx-auto max-w-[1500px] px-5 py-24 md:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label">In the garage</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {cars.length} platforms, one configurator.
              </h2>
            </div>
            <Link to="/configure" className="btn btn-ghost">
              Configure a car
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 border-t border-line-soft">
          {cars.map((car, i) => (
            <Reveal key={car.id} delay={i * 0.04}>
              <Link
                to="/configure"
                className="group flex items-center justify-between gap-6 border-b border-line-soft py-6 transition-colors hover:bg-panel"
              >
                <div className="flex items-baseline gap-6">
                  <span className="label">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-xl font-medium tracking-tight md:text-2xl">
                    {car.name}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <span className="label hidden sm:block">{car.bodyStyle}</span>
                  <span className="text-fog transition-colors group-hover:text-signal">→</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= CLOSING ================= */}
      <section className="border-t border-line-soft">
        <div className="hud-frame mx-auto max-w-[1500px] px-5 py-24 text-center md:px-8">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
              Start with a blank car.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-fog">
              Pick a platform, set the paint, fit the wheels, then see what the
              recommender makes of your numbers.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/configure" className="btn btn-signal">
                Open Configurator
              </Link>
              <Link to="/recommend" className="btn btn-ghost">
                Run AI Match
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
