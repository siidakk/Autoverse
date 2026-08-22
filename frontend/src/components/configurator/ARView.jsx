import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { arAvailable, unavailableBecause, startAR, isDeviceLimitation } from "../../lib/ar";
import { isApple, quickLookSupported, openQuickLook } from "../../lib/arQuickLook";

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

// Two platforms, two entirely different mechanisms, one button.
//
//   Android   WebXR: this page renders the camera feed and places the car
//   iOS       AR Quick Look: the system viewer takes over, given a USDZ file
//
// Both are handed the same clone of the configured car, so what you see is the
// same on either. Safari has no WebXR and is not getting it, so there was
// never a single path that covered both.
export default function ARView({ car, stageRef }) {
  // Read once at mount on Apple hardware, where the answer is a property of
  // the browser rather than something to go and ask for.
  const [can, setCan] = useState(() => (isApple() ? quickLookSupported() : null));
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [size, setSize] = useState(1);

  const [qr, setQr] = useState(null);
  const [handoff, setHandoff] = useState(false);

  const overlay = useRef(null);
  const handle = useRef(null);

  // A laptop cannot do this, and telling someone that and stopping is a dead
  // end. The build is entirely in the address bar, so the whole thing can be
  // handed to a phone by pointing its camera at the screen.
  useEffect(() => {
    if (!handoff) return;

    QRCode.toDataURL(window.location.href, {
      width: 220,
      margin: 1,
      color: { dark: "#eef1f8ff", light: "#0c0e1aff" }
    }).then(setQr, () => setQr(null));
  }, [handoff]);

  const apple = isApple();

  useEffect(() => {
    // On Apple hardware the question is whether Quick Look will take the link,
    // not whether WebXR exists -- it never does. That was settled above.
    if (apple) return;

    let cancelled = false;

    arAvailable().then((ok) => {
      if (!cancelled) setCan(ok);
    });

    return () => {
      cancelled = true;
    };
  }, [apple]);

  // A session left running after the panel closes keeps the camera on.
  useEffect(() => () => handle.current?.end?.(), []);

  const open = async () => {
    setError(null);
    setStatus("Starting");

    try {
      if (apple) {
        // Hands the file to the system and stops. There is no way to be told
        // what the viewer does after that, which is the trade for not having
        // to build one.
        await openQuickLook(stageRef.current, {
          onStatus: setStatus,
          name: car.name.replace(/[^a-z0-9]+/gi, "-")
        });
        return;
      }

      const session = await startAR({
        stage: stageRef.current,
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
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-fog">{unavailableBecause()}</p>

          {isDeviceLimitation() && (
            <>
              <button
                type="button"
                onClick={() => setHandoff((open) => !open)}
                className="btn btn-ghost w-full"
              >
                {handoff ? "Hide the code" : "Send it to my phone"}
              </button>

              {handoff && (
                <div className="panel p-4 text-center">
                  {qr ? (
                    <img
                      src={qr}
                      alt="Scan to open this build on a phone"
                      className="mx-auto rounded-lg"
                      width={200}
                      height={200}
                    />
                  ) : (
                    <p className="label">Building the code…</p>
                  )}

                  <p className="mt-3 text-xs leading-relaxed text-fog">
                    Scan with an Android phone. The whole build travels in the
                    link, so it opens exactly as you have it here.
                  </p>

                  {/localhost|127\.0\.0\.1/.test(window.location.host) && (
                    <p className="mt-2 text-xs leading-relaxed text-signal">
                      This is a local address, so a phone cannot reach it. It
                      will work from the deployed site.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {can === true && !running && !error && (
        <p className="text-xs leading-relaxed text-fog">
          {apple
            ? "Exports this exact build and opens it in the iOS AR viewer, at its real size. The paint, wheels, stance and everything else you have fitted come with it."
            : "Opens the camera, finds the ground, and stands this exact build on it at its real size. The paint, wheels, stance and everything else you have fitted come with it."}
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
