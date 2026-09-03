import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { inspectPhoto, warmDetector, detectorState, MODEL_SIZE_MB } from "../lib/vision";
import { garageCarsByBody } from "../data/garageMatch";

// Photo of a car, in. The closest thing we can actually show you, out, painted
// the colour yours is. This is the way into the configurator for somebody who
// already owns the car they want to change.

export default function DetectPage() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Starts as loading because the effect below always begins the download,
  // and a model already fetched this session is ready immediately.
  const [model, setModel] = useState(() =>
    detectorState() === "ready" ? "ready" : "loading"
  );
  const [waited, setWaited] = useState(0);

  const imageRef = useRef(null);
  const inputRef = useRef(null);

  // The download is started on arrival rather than on the first click, so the
  // wait happens while a photo is being chosen instead of afterwards.
  useEffect(() => {
    let cancelled = false;

    const started = Date.now();
    const ticker = window.setInterval(() => {
      if (!cancelled) setWaited(Math.round((Date.now() - started) / 1000));
    }, 500);

    warmDetector()
      .then(() => {
        if (!cancelled) setModel("ready");
      })
      .catch(() => {
        if (!cancelled) setModel("failed");
      })
      .finally(() => window.clearInterval(ticker));

    return () => {
      cancelled = true;
      window.clearInterval(ticker);
    };
  }, []);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("That is not an image.");
      return;
    }

    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
  };

  const run = async () => {
    if (!imageRef.current) return;

    setError(null);
    setResult(null);

    try {
      const found = await inspectPhoto(imageRef.current, setStatus);

      if (!found.found) {
        setError(
          found.others.length
            ? `No car in that photo. It looks like ${found.others.slice(0, 3).join(", ")}.`
            : "No car found in that photo. Try one taken side on, with the whole car in frame."
        );
        return;
      }

      // Kept with the result: the overlay needs the image's real size, and
      // reading it off the element while rendering is not allowed.
      setResult({
        ...found,
        imageSize: {
          width: imageRef.current.naturalWidth,
          height: imageRef.current.naturalHeight
        }
      });
    } catch (detectionError) {
      setError(`Detection failed: ${detectionError.message}`);
    } finally {
      setStatus(null);
    }
  };

  // Every car we model of that shape, not one picked off the front of a list.
  // The garage holds three SUVs and Identify used to name whichever came first
  // in the array, which is how a photograph of a Fortuner produced "Mercedes
  // G-Class" while a Fortuner sat two entries below it.
  const options = result?.body ? garageCarsByBody(result.body) : null;
  const choices = options ? (options.exact.length ? options.exact : options.near) : [];
  const exact = Boolean(options?.exact.length);

  // Chosen by the person looking at their own car, which is the one method
  // here with no error rate.
  const [picked, setPicked] = useState(null);
  const chosen = choices.find((car) => car.id === picked) ?? choices[0] ?? null;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      <header>
        <p className="label">04 / Vision</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Start from a photo of yours.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
          Drop in a picture of a car. It is found in the frame, its paint is read
          off the bodywork, and the closest car we can show you opens in that
          colour. The model runs here in your browser, so the photo never leaves
          your machine.
        </p>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">

        {/* THE PHOTO */}
        <div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={[
              "relative flex min-h-[380px] cursor-pointer items-center justify-center overflow-hidden border p-4 transition-colors",
              dragging ? "border-signal bg-signal/5" : "border-line-soft grid-veil"
            ].join(" ")}
          >
            {preview ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={preview}
                  alt="The car being examined"
                  className="max-h-[520px] w-auto"
                />

                {/* WHERE THE CAR WAS FOUND */}
                {result?.imageSize && (
                  <div
                    className="pointer-events-none absolute border-2 border-signal"
                    style={{
                      left: `${(result.box[0] / result.imageSize.width) * 100}%`,
                      top: `${(result.box[1] / result.imageSize.height) * 100}%`,
                      width: `${(result.box[2] / result.imageSize.width) * 100}%`,
                      height: `${(result.box[3] / result.imageSize.height) * 100}%`
                    }}
                  >
                    <span className="readout absolute -top-6 left-0 bg-signal px-2 py-0.5 text-[10px] text-ink">
                      {result.label} {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="label">Drop a photo here</p>
                <p className="mt-3 text-sm text-fog">or click to choose one</p>
                <p className="readout mt-6 text-[10px] text-fog">
                  Side on, whole car in frame, works best
                </p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          {/* THE DOWNLOAD, WHICH IS THE SLOW PART AND SHOULD SAY SO */}
          {model === "loading" && (
            <div className="mt-4 border border-line-soft bg-panel px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="label">Downloading the detector</p>
                <span className="readout text-[10px] text-fog">{waited}s</span>
              </div>
              <div className="sweep relative mt-3 h-[2px] w-full overflow-hidden bg-line" />
              <p className="mt-3 text-xs leading-relaxed text-fog">
                About {MODEL_SIZE_MB} MB, once. It is fetched from Google's model
                host, so on a slow line this can take a minute. You can pick a
                photo while it finishes.
              </p>
            </div>
          )}

          {model === "failed" && (
            <div className="mt-4 border border-signal-deep bg-signal-deep/10 px-4 py-3">
              <p className="label text-signal">The detector did not load</p>
              <p className="mt-2 text-xs leading-relaxed text-fog">
                The model is downloaded from Google's host and that request did
                not complete. Reload the page to try again.
              </p>
            </div>
          )}

          {preview && (
            <button
              type="button"
              onClick={run}
              disabled={Boolean(status) || model === "loading"}
              className="btn btn-signal mt-4 w-full disabled:opacity-60"
            >
              {status
                ? `${status}…`
                : model === "loading"
                  ? "Waiting for the detector"
                  : "Find the car"}
            </button>
          )}

          {status && (
            <div className="sweep relative mt-3 h-[2px] w-full overflow-hidden bg-line" />
          )}

          {error && (
            <div className="mt-4 border border-signal-deep bg-signal-deep/10 px-4 py-3">
              <p className="label text-signal">Nothing found</p>
              <p className="mt-2 text-xs leading-relaxed text-fog">{error}</p>
            </div>
          )}
        </div>

        {/* WHAT IT FOUND */}
        <div>
          {!result && (
            <div className="panel p-6">
              <p className="label">What this does</p>
              <ul className="mt-4 space-y-3 text-xs leading-relaxed text-fog">
                <li>Finds the vehicle in the frame and marks it.</li>
                <li>Reads the paint from the bodywork, ignoring sky and road.</li>
                <li>Tells a car from a pickup or a van, and guesses the shape.</li>
                <li>Opens the closest car we model, in your colour.</li>
              </ul>

              <div className="tick-rule-dense mt-5 opacity-60" />

              <p className="mt-4 text-xs leading-relaxed text-fog">
                It cannot read a badge. Naming a car as a particular model rather
                than a shape needs a network trained on makes, which is a
                different job to this one.
              </p>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              <div className="panel hud-frame p-6">
                <p className="label">Found</p>
                <p className="mt-2 text-2xl font-medium tracking-tight capitalize">
                  {result.body ?? "A car"}
                </p>
                <p className="readout mt-1 text-[11px] text-fog">
                  detected as {result.label} · {Math.round(result.confidence * 100)}% sure
                  {result.bodySource === "model" && result.bodyConfidence != null && (
                    <> · shape {Math.round(result.bodyConfidence * 100)}% sure</>
                  )}
                </p>


                {/* Not every class is equally reliable, and one overall
                    accuracy hides that. It is right about a pickup nine times
                    in ten and about a hatchback fewer than one time in two, so
                    a hatchback call gets said out loud -- especially here,
                    where hatchbacks are most of what anybody will photograph. */}
                {result.body && result.bodyRecall != null && result.bodyRecall < 0.6 && (
                  <p className="mt-3 border-l-2 border-line pl-3 text-xs leading-relaxed text-fog">
                    Treat this one lightly. Of the {result.body.toLowerCase()}s it
                    was tested on it identified {Math.round(result.bodyRecall * 100)}%
                    — its weakest class, because it learned from American cars and
                    this shape differs most between the two markets.
                  </p>
                )}

                {/* The classifier declining to answer is a result, not a
                    failure, and saying so is the whole difference from what
                    was here before -- which always named a body because a
                    ratio always has a value. */}
                {!result.body && (
                  <p className="mt-3 text-xs leading-relaxed text-fog">
                    {result.bodySource === null
                      ? "It found a car but not clearly enough to call the shape, so it is not going to guess. Try a photo from the side or three quarters on, with the whole car in frame."
                      : "The shape was read from the detector rather than the classifier."}
                  </p>
                )}

                <div className="tick-rule-dense mt-5 opacity-60" />

                <div className="mt-5 flex items-center gap-4">
                  <span
                    className="block h-12 w-12 shrink-0 border border-line"
                    style={{ background: result.paint.hex }}
                  />
                  <div>
                    <p className="label">Paint</p>
                    <p className="mt-1 text-sm text-chalk">{result.colourName}</p>
                    <p className="readout text-[10px] text-fog">{result.paint.hex}</p>
                  </div>
                </div>
              </div>

              {chosen && (
                <div className="panel p-6">
                  <p className="label">
                    {exact
                      ? `${choices.length > 1 ? `${choices.length} cars` : "The car"} we model with this shape`
                      : "Nearest shape we model"}
                  </p>

                  {choices.length > 1 ? (
                    <>
                      <p className="mt-2 text-xs leading-relaxed text-fog">
                        It reads the shape and the paint, not the badge — so
                        pick yours and it opens in your colour.
                      </p>
                      <div className="mt-3 grid gap-px bg-line-soft">
                        {choices.map((car) => (
                          <button
                            key={car.id}
                            type="button"
                            onClick={() => setPicked(car.id)}
                            className={[
                              "px-3 py-2.5 text-left text-sm transition-colors",
                              car.id === chosen?.id
                                ? "bg-signal text-ink"
                                : "bg-ink text-fog hover:text-chalk"
                            ].join(" ")}
                          >
                            {car.name}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-lg font-medium tracking-tight">
                        {chosen?.name}
                      </p>
                      <p className="mt-1 text-xs text-fog">
                        {exact
                          ? `Also a ${result.body.toLowerCase()}`
                          : `Nearest shape to a ${result.body.toLowerCase()}`}
                      </p>
                    </>
                  )}

                  <Link
                    to={`/customise?car=${chosen.id}&colour=${encodeURIComponent(result.paint.hex)}`}
                    className="btn btn-signal mt-5 w-full"
                  >
                    Open it in your colour
                  </Link>
                </div>
              )}

              <p className="text-xs leading-relaxed text-fog">
                Ran on your machine. The photo was never sent anywhere.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
