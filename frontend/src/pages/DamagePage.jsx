import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { inspectPhoto, readPaint } from "../lib/vision";
import {
  findCandidates,
  repairCost,
  resaleImpact,
  DAMAGE_TYPES,
  SEVERITIES,
  PANELS
} from "../lib/damage";
import { valuationOptions, valueCar, describeError } from "../lib/api";
import { scan as scanWithModel, modelInfo } from "../lib/damageModel";
import { itemsFromScan, OPPOSITE_END } from "../lib/panels";
import { likelyCars } from "../lib/carGuess";
import CarPicker from "../components/CarPicker";
import { money } from "../lib/money";

// Shared, so a crore reads as a crore on every page. See lib/money.js.
const rupees = money;

// The score off the gradient is a ratio without a natural ceiling, so it is
// shown as a band rather than a number that would look more precise than it is.
const strength = (score) =>
  score > 6 ? "Strong" : score > 3 ? "Clear" : "Worth a look";

export default function DamagePage() {
  const [preview, setPreview] = useState(null);
  const [scan, setScan] = useState(null);
  const [status, setStatus] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [items, setItems] = useState([
    { type: "scratch", severity: "moderate", panel: "door" }
  ]);

  // What the last scan filled in on its own, so the page can say so. Null
  // until a photo has actually been read.
  const [filled, setFilled] = useState(null);

  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState("");
  const [year, setYear] = useState(2016);
  const [km, setKm] = useState(60000);
  const [valuation, setValuation] = useState(null);
  const [valuing, setValuing] = useState(false);
  const [valueError, setValueError] = useState(null);

  const imageRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    valuationOptions()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        const first = data.models.find((m) => m.model.includes("Swift")) ?? data.models[0];
        setSelected(`${first.brand}|${first.model}`);
      })
      .catch(() => {
        // The bill still works without a valuation; only the resale half needs it.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const car = options?.models.find(
    (entry) => `${entry.brand}|${entry.model}` === selected
  );

  // Taken from the catalogue rather than recomputed here. This page used its
  // own thresholds -- Luxury at 20 lakh against the catalogue's 40 -- so the
  // same car could be Premium on Discover and Luxury here, and the bill moved
  // by 57% between two pages describing one car.
  const segment = car?.segment ?? "Mid";

  const cost = repairCost(items, segment);

  // Fills in what a photograph can actually answer, and records what it filled
  // so the page can be plain about which half to trust.
  //
  // The two halves are not equally reliable and it would be dishonest to
  // present them as if they were. What the damage is, and which panel it sits
  // on, comes from a classifier trained on photographs of damage and from the
  // car's own outline. Which car it is, is inference from a body style and how
  // much of the frame it fills -- nothing in this project can read a badge, so
  // the name is a shortlist, not an identification.
  const autoFill = (findings, carBox, imageSize, found) => {
    const detected = itemsFromScan(findings ?? [], carBox, imageSize);

    // Only replace what somebody may have typed if there is something to
    // replace it with.
    if (detected.length) setItems(detected);

    // A body style is only worth ranking on when it came from the model
    // trained to answer that question. The old bounding-box ratio guess is not
    // evidence and must not be laundered into a car's name.
    const body = found?.bodySource === "model" ? found.body : null;
    const shareOfFrame = carBox ? carBox[2] / imageSize.width : null;

    const candidates = options?.models?.length
      ? likelyCars(options.models, { body, shareOfFrame })
      : [];

    if (candidates.length) {
      setSelected(`${candidates[0].brand}|${candidates[0].model}`);
    }

    setFilled({
      panels: detected.length,
      unsure: detected.filter((item) => item.unsure),
      candidates,
      body,
      colour: found?.colourName ?? null
    });
  };

  const scanPhoto = async () => {
    if (!imageRef.current) return;

    setScanError(null);
    setScan(null);
    setFilled(null);

    const imageSize = {
      width: imageRef.current.naturalWidth,
      height: imageRef.current.naturalHeight
    };

    try {
      // Finding the car comes first now, even when the trained classifier is
      // going to do the reading. Damage has to be placed against the car's own
      // outline to become a panel -- two thirds of the way down *the car* is a
      // bumper, two thirds of the way down *the photograph* is anybody's guess
      // -- and the same detection says how big the car is in frame, which is
      // half of what narrows the photo down to a model.
      //
      // It costs a six megabyte download that the model path used to skip. A
      // failure here is not fatal: without a car the photo becomes the frame.
      let found = null;
      try {
        found = await inspectPhoto(imageRef.current, setStatus);
      } catch {
        // Detector unavailable — carry on with the whole frame.
      }

      const carBox = found?.found ? found.box : null;

      // The trained classifier next. It only answers if someone has built it
      // and put it in public/models/damage; until then this returns nothing
      // and the measured version below still runs.
      const learned = await scanWithModel(imageRef.current, setStatus);

      if (learned) {
        const info = modelInfo();

        setScan({
          source: "model",
          candidates: learned.findings.map((finding) => ({
            box: [finding.x, finding.y, finding.width, finding.height],
            label: finding.label,
            confidence: finding.confidence
          })),
          carFound: Boolean(carBox),
          accuracy: info?.accuracy ?? null,
          testedOn: info?.testedOn ?? null,
          imageSize
        });

        autoFill(learned.findings, carBox, imageSize, found);
        return;
      }

      if (!found) {
        throw new Error("Could not load the detector, so the photo could not be read.");
      }

      const box = found.found
        ? found.box
        : [0, 0, imageSize.width, imageSize.height];

      setStatus("Looking over the panels");

      // The paint colour is what separates a crumpled wing from a grille. Both
      // are busy; only one of them is the colour of the car.
      const paint = found.found
        ? found.paint.hex
        : readPaint(imageRef.current, box).hex;

      const candidates = findCandidates(imageRef.current, box, { paint });

      setScan({
        source: "heuristic",
        candidates,
        carFound: found.found,
        imageSize
      });

      // No damage labels to work from here -- the measured fallback finds busy
      // areas without knowing what they are -- so this only fills in the car.
      autoFill([], found.found ? found.box : null, imageSize, found);
    } catch (error) {
      setScanError(error.message);
    } finally {
      setStatus(null);
    }
  };

  const value = async () => {
    if (!car || !options) return;

    setValuing(true);
    setValueError(null);

    try {
      const clean = await valueCar({
        brand: car.brand,
        age: (options.years[1] ?? 2020) - year,
        km,
        power: car.power,
        engine: car.engine,
        mileage: car.mileage,
        seats: car.seats,
        fuel: car.fuels[0],
        transmission: car.transmissions[0],
        owner: "Second Owner",
        seller: "Individual"
      });

      setValuation(resaleImpact(clean.estimate, cost, items));
    } catch (error) {
      setValueError(describeError(error));
    } finally {
      setValuing(false);
    }
  };

  const update = (index, key, next) =>
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [key]: next } : item))
    );

  return (
    // Tighter than the other pages on purpose. This one is a tool rather than
    // a page to read: the photo, the bill and the resale answer all have to be
    // visible together, and the resale panel used to start 773 pixels down --
    // below the fold on any laptop -- because a full-height header sat above
    // it explaining what the page does.
    <div className="mx-auto max-w-[1500px] px-5 py-7 md:px-8">

      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="label">05 / Damage</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          What will it cost, and is it worth fixing?
        </h1>
        <p className="text-xs text-fog">
          Damage named by a classifier, costed against what the car is worth.
        </p>
      </header>

      <div className="tick-rule mt-3 opacity-70" />

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_400px]">

        {/* THE PHOTO */}
        <div className="space-y-3">
          <div
            onClick={() => inputRef.current?.click()}
            className="grid-veil relative flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden border border-line-soft p-4"
          >
            {preview ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={preview}
                  alt="The car being checked"
                  className="max-h-[300px] w-auto"
                />

                {scan?.candidates.map((candidate, index) => (
                  <div
                    key={index}
                    className="pointer-events-none absolute border-2 border-signal"
                    style={{
                      left: `${(candidate.box[0] / scan.imageSize.width) * 100}%`,
                      top: `${(candidate.box[1] / scan.imageSize.height) * 100}%`,
                      width: `${(candidate.box[2] / scan.imageSize.width) * 100}%`,
                      height: `${(candidate.box[3] / scan.imageSize.height) * 100}%`
                    }}
                  >
                    <span className="readout absolute -top-4 left-0 bg-signal px-1 text-[9px] leading-4 whitespace-nowrap text-ink">
                      {candidate.label
                        ? `${candidate.label.replace(/_/g, " ")} ${Math.round(candidate.confidence * 100)}%`
                        : `${index + 1}. ${strength(candidate.score)}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="label">Drop a photo of the damage</p>
                <p className="mt-3 text-sm text-fog">or click to choose one</p>
                <p className="readout mt-6 text-[10px] text-fog">
                  Optional — you can price it up without one
                </p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setScan(null);
              setPreview(URL.createObjectURL(file));
            }}
          />

          {preview && (
            <button
              type="button"
              onClick={scanPhoto}
              disabled={Boolean(status)}
              className="btn btn-ghost w-full disabled:opacity-60"
            >
              {status ? `${status}…` : "Scan the panels"}
            </button>
          )}

          {scan && (
            <div className="panel p-5">
              <p className="label">
                {scan.candidates.length
                  ? `${scan.candidates.length} area${scan.candidates.length > 1 ? "s" : ""} worth checking`
                  : "Nothing stood out"}
              </p>
              {scan.source === "model" ? (
                <p className="mt-3 text-xs leading-relaxed text-fog">
                  {scan.candidates.length
                    ? "Each label is what the classifier recognised in that part of the photo, with how sure it is. It was trained on photographs of real damage, so it is naming what it has seen before rather than reporting that the surface looks busy. It still cannot tell you how deep anything is — confirm the severity on the right."
                    : "Nothing in the photo matched any damage it was trained on. It was shown undamaged panels too, so this is an answer rather than a shrug — but a photo taken far away or in poor light can hide a lot."}
                  {scan.accuracy != null && (
                    <span className="mt-2 block text-fog/70">
                      Measured at {Math.round(scan.accuracy * 100)}% on {scan.testedOn} images it
                      was never trained on.
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-fog">
                  {scan.candidates.length
                    ? "These are places where the paint stops being smooth. That is what a scratch or a crease looks like to a gradient, and it is also what a reflection looks like, so they are candidates rather than a diagnosis. Confirm what they are on the right."
                    : "The paint reads as even across the panels in view. That is not proof there is nothing there, only that nothing stood out from the surface around it."}
                  {!scan.carFound && " No car was detected in the frame, so the whole photo was scanned."}
                  <span className="mt-2 block text-fog/70">
                    This is the measured fallback, not the trained model — no model has been
                    built into public/models/damage yet.
                  </span>
                </p>
              )}
            </div>
          )}

          {scanError && (
            <div className="border border-signal-deep bg-signal-deep/10 px-4 py-3">
              <p className="label text-signal">Scan failed</p>
              <p className="mt-2 text-xs text-fog">{scanError}</p>
            </div>
          )}

          {/* WHAT THE PHOTO FILLED IN, AND HOW MUCH TO TRUST EACH PART */}
          {filled && (filled.panels > 0 || filled.candidates.length > 0) && (
            <div className="border border-data/40 bg-data/5 px-4 py-3">
              <p className="label text-data">Filled in from the photo</p>

              {/* Short on purpose. This is a working panel on a page that has
                  to fit one screen, and the long version of each of these was
                  three lines of prose explaining what the short version says. */}
              <ul className="mt-2 space-y-1 text-xs leading-snug text-fog">
                {filled.panels > 0 && (
                  <li>
                    <span className="text-chalk">
                      {filled.panels} {filled.panels === 1 ? "repair" : "repairs"} found and priced
                    </span>{" "}
                    — named by the classifier, placed by where they fall on the car.
                  </li>
                )}

                {filled.unsure.length > 0 && (
                  <li>
                    {filled.unsure.map((item, index) => (
                      <span key={index}>
                        {index > 0 && ", "}
                        <span className="text-chalk">{PANELS[item.panel]?.label}</span>
                        {OPPOSITE_END[item.panel] && (
                          <> could equally be the {PANELS[OPPOSITE_END[item.panel]]?.label.toLowerCase()}</>
                        )}
                      </span>
                    ))}
                    {" "}— nothing detects which way the car faces.
                  </li>
                )}

                {filled.candidates.length > 0 && (
                  <li>
                    <span className="text-chalk">The car is a guess</span> from shape
                    {filled.colour ? ` and colour (${filled.colour.toLowerCase()})` : " and size"},
                    never a badge. Change it if it is wrong — the repairs stay.
                  </li>
                )}
              </ul>

              {/* Correcting it belongs next to the guess, not three panels
                  further down where it had to be scrolled to. */}
              {options && (
                <div className="mt-3">
                  <CarPicker
                    models={options.models}
                    value={selected}
                    onChange={setSelected}
                    label="Car"
                  />
                </div>
              )}
            </div>
          )}

        </div>

        {/* THE BILL */}
        <div className="space-y-3">

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="label">The damage</p>
              <button
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { type: "dent", severity: "light", panel: "bumper" }
                  ])
                }
                className="label hover:text-signal"
              >
                + Add
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border border-line-soft p-3">
                  <div className="flex items-center justify-between">
                    <span className="readout text-[10px] text-fog">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) => current.filter((_, i) => i !== index))
                        }
                        className="label hover:text-signal"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <select
                      className="field"
                      value={item.type}
                      onChange={(event) => update(index, "type", event.target.value)}
                    >
                      {Object.entries(DAMAGE_TYPES).map(([key, entry]) => (
                        <option key={key} value={key}>{entry.label}</option>
                      ))}
                    </select>

                    <select
                      className="field"
                      value={item.panel}
                      onChange={(event) => update(index, "panel", event.target.value)}
                    >
                      {Object.entries(PANELS).map(([key, entry]) => (
                        <option key={key} value={key}>{entry.label}</option>
                      ))}
                    </select>

                    <select
                      className="field"
                      value={item.severity}
                      onChange={(event) => update(index, "severity", event.target.value)}
                    >
                      {Object.entries(SEVERITIES).map(([key, entry]) => (
                        <option key={key} value={key}>{entry.label}</option>
                      ))}
                    </select>
                  </div>

                  <p className="mt-2 text-[11px] text-fog">
                    {DAMAGE_TYPES[item.type].note} · {SEVERITIES[item.severity].note}
                  </p>
                </div>
              ))}
            </div>

            <div className="tick-rule-dense mt-5 opacity-60" />

            <div className="mt-4 flex items-end justify-between">
              <span className="label">Repair estimate</span>
              <span className="readout text-2xl text-signal">{rupees(cost)}</span>
            </div>
            <p className="mt-2 text-[11px] text-fog">
              Workshop rates for a {segment.toLowerCase()} car
            </p>
          </div>

          {/* WORTH FIXING? */}
          {options && (
            <div className="panel p-4">
              <p className="label">Is it worth fixing before selling</p>

              <div className="mt-3 space-y-2">
                {/* Only when the photo has not already put one at the top. */}
                {!filled && (
                  <CarPicker
                    models={options.models}
                    value={selected}
                    onChange={setSelected}
                    label="Car"
                  />
                )}

                {/* Label beside the slider rather than above it: two rows
                    saved, and the number is next to the thing that sets it. */}
                <label className="flex items-center gap-3">
                  <span className="label w-16 shrink-0">{year}</span>
                  <input
                    type="range"
                    className="slider"
                    min={options.years[0]}
                    max={options.years[1]}
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                  />
                </label>

                <label className="flex items-center gap-3">
                  <span className="label w-16 shrink-0">{(km / 1000).toFixed(0)}k km</span>
                  <input
                    type="range"
                    className="slider"
                    min={5000}
                    max={200000}
                    step={5000}
                    value={km}
                    onChange={(event) => setKm(Number(event.target.value))}
                  />
                </label>

                <button
                  type="button"
                  onClick={value}
                  disabled={valuing}
                  className="btn btn-signal w-full disabled:opacity-60"
                >
                  {valuing ? "Working it out…" : "Work it out"}
                </button>
              </div>

              {valueError && (
                <p className="mt-3 border border-signal-deep bg-signal-deep/10 px-3 py-2 text-xs text-fog">
                  {valueError}
                </p>
              )}

              {valuation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <div className="tick-rule-dense opacity-60" />

                  <dl className="mt-4 space-y-2 text-sm">
                    {[
                      ["Worth undamaged", rupees(valuation.clean)],
                      ["Buyers knock off", `− ${rupees(valuation.knockOff)}`],
                      ["Worth as it stands", rupees(valuation.damaged)],
                      ["Repair costs", rupees(valuation.cost)]
                    ].map(([label, amount]) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-fog">{label}</dt>
                        <dd className="readout text-chalk">{amount}</dd>
                      </div>
                    ))}
                  </dl>

                  <p
                    className={[
                      "mt-5 border px-4 py-3 text-xs leading-relaxed",
                      valuation.worthRepairing
                        ? "border-data/40 bg-data/5 text-data"
                        : "border-line bg-ink text-fog"
                    ].join(" ")}
                  >
                    {valuation.worthRepairing
                      ? `Fix it. Buyers take off about ${rupees(valuation.knockOff)} for damage that costs ${rupees(valuation.cost)} to put right, so repairing leaves you roughly ${rupees(valuation.gain)} better off.`
                      : `Leave it. The repair costs about as much as buyers would deduct, so you would be spending ${rupees(valuation.cost)} to recover ${rupees(valuation.knockOff)}.`}
                  </p>

                  <p className="mt-3 text-[11px] leading-relaxed text-fog">
                    The undamaged figure comes from the valuation model, which is
                    typically within 14% on cars it has not seen. The deduction
                    assumes a buyer discounts more than the bill, because they
                    are also pricing in the bother and what else might be wrong.
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
