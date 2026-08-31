import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { valuationOptions, valueCar, describeError } from "../lib/api";
import DepreciationChart from "../components/valuation/DepreciationChart";

const rupees = (value) =>
  value >= 100000
    ? `₹${(value / 100000).toFixed(value >= 1000000 ? 2 : 2)} L`
    : `₹${value.toLocaleString("en-IN")}`;

const KM_STEPS = [10000, 30000, 60000, 90000, 120000, 200000];

export default function ValuationPage() {
  const [options, setOptions] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [selected, setSelected] = useState("");
  const [year, setYear] = useState(2016);
  const [km, setKm] = useState(60000);
  const [owner, setOwner] = useState("First Owner");
  const [fuel, setFuel] = useState("Petrol");
  const [transmission, setTransmission] = useState("Manual");
  const [seller, setSeller] = useState("Individual");

  const [result, setResult] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    valuationOptions()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        const first = data.models.find((entry) => entry.model.includes("Swift"))
          ?? data.models[0];
        setSelected(`${first.brand}|${first.model}`);
        setFuel(first.fuels[0]);
        setTransmission(first.transmissions[0]);
      })
      .catch((requestError) => {
        if (!cancelled) setLoadError(describeError(requestError));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const car = useMemo(
    () => options?.models.find((entry) => `${entry.brand}|${entry.model}` === selected),
    [options, selected]
  );

  const submit = async () => {
    if (!car) return;

    setWorking(true);
    setError(null);

    try {
      const data = await valueCar({
        brand: car.brand,
        age: (options.years[1] ?? 2020) - year,
        km,
        power: car.power,
        engine: car.engine,
        mileage: car.mileage,
        seats: car.seats,
        fuel,
        transmission,
        owner,
        seller
      });

      setResult(data);
    } catch (requestError) {
      setError(describeError(requestError));
      setResult(null);
    } finally {
      setWorking(false);
    }
  };

  const accuracy = options?.accuracy;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      <header>
        <p className="label">03 / Valuation</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          What is it worth now?
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
          Gradient boosted trees over 7,906 Indian listings, valuing a car from
          its age, distance, owners and specification. Answers come as a range,
          because a figure quoted to the rupee would be pretending.
        </p>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      {loadError && (
        <div className="mt-10 border border-signal-deep bg-signal-deep/10 px-5 py-4">
          <p className="label text-signal">Could not load</p>
          <p className="mt-2 text-xs text-fog">{loadError}</p>
        </div>
      )}

      {options && (
        <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr]">

          {/* THE CAR */}
          <div>
            <div className="panel space-y-5 p-6 lg:sticky lg:top-24">
              <p className="label">The car</p>

              <label className="block">
                <span className="label">Model</span>
                <select
                  className="field mt-2"
                  value={selected}
                  onChange={(event) => {
                    setSelected(event.target.value);
                    const next = options.models.find(
                      (entry) => `${entry.brand}|${entry.model}` === event.target.value
                    );
                    if (next) {
                      setFuel(next.fuels[0]);
                      setTransmission(next.transmissions[0]);
                    }
                  }}
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
              </label>

              {car && (
                <p className="readout text-[10px] text-fog">
                  {car.power} bhp · {car.engine ? `${car.engine} cc` : "electric"} ·{" "}
                  {/* The valuation model needs an economy figure for every car,
                      so an unpublished one is filled in from the car's peers.
                      The tilde is there so an estimate is never mistaken for a
                      manufacturer's number. */}
                  <span title={car.mileageKnown ? undefined : "Estimated from similar cars — the maker never published one"}>
                    {car.mileageKnown ? "" : "~"}{car.mileage} kmpl
                  </span>{" "}
                  · {car.seats} seats
                </p>
              )}

              <label className="block">
                <span className="label">
                  Year — {year} ({(options.years[1] ?? 2020) - year} years old)
                </span>
                <input
                  type="range"
                  className="slider mt-3"
                  min={options.years[0]}
                  max={options.years[1]}
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                />
              </label>

              <div>
                <span className="label">Kilometres — {km.toLocaleString("en-IN")}</span>
                <div className="mt-2 grid grid-cols-6 gap-px bg-line-soft">
                  {KM_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setKm(step)}
                      className={[
                        "py-2 text-[10px] transition-colors",
                        km === step ? "bg-signal text-ink" : "bg-ink text-fog hover:text-chalk"
                      ].join(" ")}
                    >
                      {step / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="label">Owners</span>
                <select
                  className="field mt-2"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                >
                  {options.owners.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Fuel</span>
                  <select
                    className="field mt-2"
                    value={fuel}
                    onChange={(event) => setFuel(event.target.value)}
                  >
                    {(car?.fuels ?? ["Petrol"]).map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">Gearbox</span>
                  <select
                    className="field mt-2"
                    value={transmission}
                    onChange={(event) => setTransmission(event.target.value)}
                  >
                    {(car?.transmissions ?? ["Manual"]).map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="label">Selling as</span>
                <select
                  className="field mt-2"
                  value={seller}
                  onChange={(event) => setSeller(event.target.value)}
                >
                  {options.sellers.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={submit}
                disabled={working}
                className="btn btn-signal w-full disabled:opacity-60"
              >
                {working ? "Valuing…" : "Value this car"}
              </button>

              {error && (
                <p className="border border-signal-deep bg-signal-deep/10 px-3 py-2 text-xs text-fog">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* THE ANSWER */}
          <div>
            {!result && (
              <div className="grid-veil flex min-h-[320px] items-center justify-center border border-line-soft p-10 text-center">
                <div>
                  <p className="label">Awaiting a car</p>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">
                    Pick a model, its year and how far it has gone. The estimate
                    appears here with the range around it.
                  </p>
                </div>
              </div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="panel hud-frame p-8">
                  <p className="label">Estimated value</p>
                  <p className="readout mt-3 text-5xl text-signal">
                    {rupees(result.estimate)}
                  </p>

                  <div className="mt-5 flex items-center gap-4">
                    <span className="readout text-xs text-fog">
                      {rupees(result.range[0])}
                    </span>
                    <div className="relative h-[2px] flex-1 bg-line">
                      <div
                        className="absolute top-[-3px] h-2 w-2 rotate-45 bg-signal"
                        style={{
                          left: `${Math.min(100, Math.max(0,
                            ((result.estimate - result.range[0]) /
                              Math.max(result.range[1] - result.range[0], 1)) * 100
                          ))}%`
                        }}
                      />
                    </div>
                    <span className="readout text-xs text-fog">
                      {rupees(result.range[1])}
                    </span>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-fog">
                    Most cars like this sell inside that range. On cars it had
                    never seen, the range held the real price{" "}
                    {accuracy?.coverage}% of the time.
                  </p>
                </div>

                <div className="panel p-6">
                  <DepreciationChart curve={result.curve} />
                </div>

                {/* HOW MUCH TO TRUST IT */}
                {accuracy && (
                  <div className="panel p-6">
                    <p className="label">How good is this model</p>

                    <dl className="mt-4 grid grid-cols-3 gap-4">
                      {[
                        ["Typically off by", `${accuracy.typicalError}%`],
                        ["Within 20%", `${accuracy.within20}%`],
                        ["R² on log price", accuracy.r2]
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="label">{label}</dt>
                          <dd className="readout mt-1 text-lg text-chalk">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="tick-rule-dense mt-5 opacity-60" />

                    <p className="label mt-4">Chosen over</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(accuracy.compared).map(([name, r2]) => (
                        <li key={name} className="flex justify-between text-xs">
                          <span
                            className={
                              name === accuracy.chosen ? "text-signal" : "text-fog"
                            }
                          >
                            {name}
                            {name === accuracy.chosen && " — used"}
                          </span>
                          <span className="readout text-fog">R² {r2}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
