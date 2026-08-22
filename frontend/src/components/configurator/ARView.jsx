import { useEffect, useRef, useState } from "react";
import { arAvailable, unavailableBecause, startAR } from "../../lib/ar";

// The button that puts the car on your driveway, and the controls that stay
// reachable while it is there.
//
// Everything a WebXR session shows over the camera has to live in a single DOM
// element handed to the session as its overlay, which is why the controls are
// rendered here whether or not a session is running.

const SIZES = [
  { factor: 1, label: "Life size", note: "4.6 m, as it would really stand" },
  { factor: 0.25, label: "Quarter", note: "fits in a room" },
  { factor: 0.06, label: "Desk", note: "a model on a table" }
];

export default function ARView({ car, colour }) {
  const [can, setCan] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [size, setSize] = useState(1);

  const overlay = useRef(null);
  const handle = useRef(null);

  useEffect(() => {
    let cancelled = false;
    arAvailable().then((ok) => {
      if (!cancelled) setCan(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A session left running after the panel closes keeps the camera on.
  useEffect(() => () => handle.current?.end?.(), []);

  const open = async () => {
    setError(null);
    setStatus("Starting");

    try {
      const session = await startAR({
        model: car.model,
        colour,
        overlay: overlay.current,
        onStatus: setStatus
      });

      handle.current = session;
      setRunning(true);
      setSize(1);

      await session.finished;
    } catch (problem) {
      setError(problem.message);
    } finally {
      handle.current = null;
      setRunning(false);
      setStatus(null);
    }
  };

  const resize = (factor) => {
    setSize(factor);
    handle.current?.setScale(factor);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={open}
        disabled={can === false || running || status !== null}
        title={can === false ? unavailableBecause() : "Place this car in front of you"}
        className="btn btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status ?? (running ? "In AR" : "Put it on your driveway")}
      </button>

      {can === false && (
        <p className="text-xs leading-relaxed text-fog">{unavailableBecause()}</p>
      )}

      {can === true && !running && !error && (
        <p className="text-xs leading-relaxed text-fog">
          Opens the camera, finds the ground, and stands this exact build on it
          at its real size. Everything you have fitted comes with it.
        </p>
      )}

      {error && <p className="text-xs leading-relaxed text-signal">{error}</p>}

      {/* THE OVERLAY
          Present in the document at all times because the session is handed a
          reference to it, but only visible while a session is running. */}
      <div
        ref={overlay}
        className={running ? "fixed inset-0 z-[100] flex flex-col justify-between p-5" : "hidden"}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-full bg-black/55 px-4 py-2 backdrop-blur-sm">
            <p className="label text-chalk">{status ?? "Tap to place"}</p>
          </div>

          <button
            type="button"
            onClick={() => handle.current?.end()}
            className="rounded-full bg-black/55 px-4 py-2 text-[11px] tracking-widest text-chalk uppercase backdrop-blur-sm"
          >
            Done
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {SIZES.map((option) => (
              <button
                key={option.factor}
                type="button"
                onClick={() => resize(option.factor)}
                className={[
                  "flex-1 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm transition-colors",
                  size === option.factor
                    ? "bg-signal text-white"
                    : "bg-black/55 text-chalk"
                ].join(" ")}
              >
                <span className="block text-[11px] tracking-widest uppercase">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[9px] opacity-70">{option.note}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handle.current?.reposition()}
            className="rounded-xl bg-black/55 px-4 py-3 text-[11px] tracking-widest text-chalk uppercase backdrop-blur-sm"
          >
            Move it somewhere else
          </button>
        </div>
      </div>
    </div>
  );
}
