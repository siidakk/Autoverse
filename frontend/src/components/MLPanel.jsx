import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { apiBaseUrl } from "../lib/api";

// What a buyer can actually say about themselves. The old form asked for
// horsepower and highway mpg, which is the answer, not the question.

const BUDGETS = [
  { value: 300000, label: "3L" },
  { value: 500000, label: "5L" },
  { value: 800000, label: "8L" },
  { value: 1200000, label: "12L" },
  { value: 2000000, label: "20L" },
  { value: 4000000, label: "40L" }
];

const FUELS = ["any", "Petrol", "Diesel", "CNG", "LPG"];
const SEATS = [4, 5, 6, 7, 8];
const BODIES = ["any", "Hatchback", "Sedan", "SUV", "MPV"];

const DRIVING = [
  { value: "calm", label: "Calm", note: "Economy over pace" },
  { value: "balanced", label: "Balanced", note: "A bit of both" },
  { value: "spirited", label: "Spirited", note: "Wants the power" }
];

const USAGE = [
  { value: "city", label: "City", note: "Traffic, short runs" },
  { value: "mixed", label: "Mixed", note: "A bit of everything" },
  { value: "highway", label: "Highway", note: "Long distances" }
];

const PRIORITY = [
  { value: "value", label: "Value", note: "Cheapest to run" },
  { value: "balanced", label: "Balanced", note: "No strong lean" },
  { value: "comfort", label: "Space", note: "Room for people" },
  { value: "performance", label: "Performance", note: "Power first" }
];

const SLOW_REQUEST_MS = 4000;

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Segmented({ options, value, onChange, columns = 3 }) {
  return (
    <div
      className="grid gap-px bg-line-soft"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const key = option.value ?? option;
        const text = option.label ?? String(option);
        const active = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={option.note}
            className={[
              "px-2 py-2.5 text-center transition-colors",
              active ? "bg-signal text-ink" : "bg-ink text-fog hover:text-chalk"
            ].join(" ")}
          >
            <span className="block text-[11px] font-medium capitalize">{text}</span>
            {option.note && (
              <span className="mt-0.5 block text-[9px] opacity-80">{option.note}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function MLPanel({ onResults }) {

  const [budget, setBudget] = useState(800000);
  const [fuel, setFuel] = useState("any");
  const [seats, setSeats] = useState(5);
  const [body, setBody] = useState("any");
  const [transmission, setTransmission] = useState("any");
  const [driving, setDriving] = useState("balanced");
  const [usage, setUsage] = useState("mixed");
  const [priority, setPriority] = useState("balanced");

  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(null);

  const slowTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(slowTimer.current), []);

  const run = async () => {
    setLoading(true);
    setSlow(false);
    setError(null);

    slowTimer.current = window.setTimeout(() => setSlow(true), SLOW_REQUEST_MS);

    try {
      const response = await axios.post(
        `${apiBaseUrl}/ml`,
        { budget, fuel, seats, body, transmission, driving, usage, priority },
        { timeout: 90000 }
      );

      onResults({ ...response.data, budget });
    } catch (requestError) {
      const status = requestError.response?.status;
      const local = /localhost|127\.0\.0\.1/.test(apiBaseUrl);

      // A 502 means the API is up but cannot reach the recommender behind it.
      // Hosted, that is a service waking up. Locally it is simply not running,
      // and saying so with the command to fix it beats a guess.
      setError(
        status === 502
          ? local
            ? "The recommendation service is not running. Start it with: cd ml && python app.py"
            : "The recommendation service is waking up. Give it a moment and try again."
          : requestError.code === "ECONNABORTED"
            ? "That took too long. The service sleeps when idle, so try again."
            : local
              ? "Could not reach the API. Start it with: cd backend && npm start"
              : "Could not reach the API."
      );

      onResults(null);
    } finally {
      window.clearTimeout(slowTimer.current);
      setLoading(false);
      setSlow(false);
    }
  };

  return (
    <div>
      <div className="space-y-5">

        <Field label={`Budget — ₹${(budget / 100000).toFixed(0)} lakh`}>
          <Segmented
            options={BUDGETS}
            value={budget}
            onChange={setBudget}
            columns={6}
          />
        </Field>

        <Field label="Fuel">
          <Segmented options={FUELS} value={fuel} onChange={setFuel} columns={5} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Seats needed">
            <Segmented options={SEATS} value={seats} onChange={setSeats} columns={5} />
          </Field>

          <Field label="Gearbox">
            <Segmented
              options={["any", "Manual", "Automatic"]}
              value={transmission}
              onChange={setTransmission}
              columns={3}
            />
          </Field>
        </div>

        <Field label="Body">
          <Segmented options={BODIES} value={body} onChange={setBody} columns={5} />
        </Field>

        <Field label="How you drive">
          <Segmented options={DRIVING} value={driving} onChange={setDriving} />
        </Field>

        <Field label="Where you drive">
          <Segmented options={USAGE} value={usage} onChange={setUsage} />
        </Field>

        <Field label="What matters most">
          <Segmented options={PRIORITY} value={priority} onChange={setPriority} columns={4} />
        </Field>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="btn btn-signal mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Matching…" : "Find my car"}
      </button>

      {loading && (
        <div className="mt-4">
          <div className="sweep relative h-[2px] w-full overflow-hidden bg-line" />
          {slow && (
            <p className="mt-3 text-xs leading-relaxed text-fog">
              Still waiting. The API is on a free tier and sleeps when idle, so
              the first request after a pause can take up to a minute.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 border border-signal-deep bg-signal-deep/10 px-4 py-3">
          <p className="label text-signal">Request failed</p>
          <p className="mt-2 text-xs leading-relaxed text-fog">{error}</p>
        </div>
      )}
    </div>
  );
}
