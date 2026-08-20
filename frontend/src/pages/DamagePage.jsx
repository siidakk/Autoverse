import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { inspectPhoto } from "../lib/vision";
import {
  findCandidates,
  repairCost,
  resaleImpact,
  DAMAGE_TYPES,
  SEVERITIES,
  PANELS
} from "../lib/damage";
import { valuationOptions, valueCar, describeError } from "../lib/api";

const rupees = (value) =>
  value >= 100000
    ? `₹${(value / 100000).toFixed(2)} L`
    : `₹${Math.round(value).toLocaleString("en-IN")}`;

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

  const segment = car
    ? car.typical >= 2000000 ? "Luxury"
      : car.typical >= 900000 ? "Premium"
        : car.typical >= 450000 ? "Mid" : "Budget"
    : "Mid";

  const cost = repairCost(items, segment);

  const scanPhoto = async () => {
    if (!imageRef.current) return;

    setScanError(null);
    setScan(null);

    try {
      const found = await inspectPhoto(imageRef.current, setStatus);

      const box = found.found
        ? found.box
        : [0, 0, imageRef.current.naturalWidth, imageRef.current.naturalHeight];

      setStatus("Looking over the panels");
      const candidates = findCandidates(imageRef.current, box);

      setScan({
        candidates,
        carFound: found.found,
        imageSize: {
          width: imageRef.current.naturalWidth,
          height: imageRef.current.naturalHeight
        }
      });
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
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      <header>
        <p className="label">05 / Damage</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          What will it cost, and is it worth fixing?
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
          A photo is scanned for areas that do not behave like smooth paint.
          Confirm what they are and the repair is costed against what the car is
          actually worth, so the question of whether to fix it before selling
          gets a number rather than a shrug.
        </p>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_400px]">

        {/* THE PHOTO */}
        <div className="space-y-6">
          <div
            onClick={() => inputRef.current?.click()}
            className="grid-veil relative flex min-h-[300px] cursor-pointer items-center justify-center overflow-hidden border border-line-soft p-4"
          >
            {preview ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={preview}
                  alt="The car being checked"
                  className="max-h-[440px] w-auto"
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
                    <span className="readout absolute -top-5 left-0 bg-signal px-1.5 text-[9px] text-ink">
                      {strength(candidate.score)}
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
              <p className="mt-3 text-xs leading-relaxed text-fog">
                {scan.candidates.length
                  ? "These are places where the paint stops being smooth. That is what a scratch or a crease looks like to a gradient, and it is also what a reflection looks like, so they are candidates rather than a diagnosis. Confirm what they are on the right."
                  : "The paint reads as even across the panels in view. That is not proof there is nothing there, only that nothing stood out from the surface around it."}
                {!scan.carFound && " No car was detected in the frame, so the whole photo was scanned."}
              </p>
            </div>
          )}

          {scanError && (
            <div className="border border-signal-deep bg-signal-deep/10 px-4 py-3">
              <p className="label text-signal">Scan failed</p>
              <p className="mt-2 text-xs text-fog">{scanError}</p>
            </div>
          )}
        </div>

        {/* THE BILL */}
        <div className="space-y-4">
          <div className="panel p-6">
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
            <div className="panel p-6">
              <p className="label">Is it worth fixing before selling</p>

              <div className="mt-4 space-y-3">
                <select
                  className="field"
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {options.models.map((entry) => (
                    <option
                      key={`${entry.brand}|${entry.model}`}
                      value={`${entry.brand}|${entry.model}`}
                    >
                      {entry.model}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="label">Year {year}</span>
                    <input
                      type="range"
                      className="slider mt-2"
                      min={options.years[0]}
                      max={options.years[1]}
                      value={year}
                      onChange={(event) => setYear(Number(event.target.value))}
                    />
                  </label>

                  <label className="block">
                    <span className="label">{(km / 1000).toFixed(0)}k km</span>
                    <input
                      type="range"
                      className="slider mt-2"
                      min={5000}
                      max={200000}
                      step={5000}
                      value={km}
                      onChange={(event) => setKm(Number(event.target.value))}
                    />
                  </label>
                </div>

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
