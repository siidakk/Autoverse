import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MLPanel from "../components/MLPanel";
import { matchGarageCar } from "../data/garageMatch";
import { describeAccessory } from "../data/accessories";

const lakh = (value) =>
  value >= 100000
    ? `₹${(value / 100000).toFixed(value >= 1000000 ? 1 : 2)} L`
    : `₹${value.toLocaleString("en-IN")}`;

const VERDICTS = {
  under: { label: "Priced under", tone: "text-data" },
  fair: { label: "Priced fairly", tone: "text-fog" },
  over: { label: "Priced over", tone: "text-signal" }
};

// Economy, in whichever unit this car actually has one.
//
// Three cases, and the third is the reason this is a function. A petrol car
// has kmpl; an electric one has km/kWh and never had a kmpl; and a third of
// the catalogue has no published figure at all, which used to arrive here as a
// zero and get printed, in good faith, as "0 kmpl". The dataset is explicit
// that a missing field means unverified rather than zero, so an em dash is the
// honest thing to show.
const economy = (car) => {
  if (car.mileage) return `${car.mileage} kmpl`;
  if (car.kmPerKwh) return `${car.kmPerKwh} km/kWh`;
  return "—";
};

// The parts the recommender suggests, pointed at the configurator so a
// suggestion can be looked at rather than just read.
function Accessories({ items }) {
  if (!items?.length) return null;

  return (
    <div className="mt-5 border-t border-line-soft pt-4">
      <p className="label">Parts that suit it</p>

      <ul className="mt-3 space-y-1.5">
        {items.map((item) => {
          const part = describeAccessory(item.category, item.value);

          return (
            <li key={`${item.category}-${item.value}`} className="flex justify-between gap-3">
              <span className="readout shrink-0 text-[11px] text-chalk">
                {part.label}
                {": "}
                <span className="text-signal">{part.value}</span>
              </span>
              <span className="text-right text-[11px] leading-snug text-fog">{item.why}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResultCard({ car, index }) {
  const verdict = VERDICTS[car.valuation.verdict];
  const garage = matchGarageCar(car);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="panel hud-frame p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="label">
            {String(index + 1).padStart(2, "0")} · {car.body} · {car.segment}
          </span>
          <h3 className="mt-2 text-xl font-medium tracking-tight">{car.model}</h3>
        </div>

        <div className="text-right">
          <span className="label">Typical price</span>
          <p className="readout mt-1 text-lg text-signal">{lakh(car.price)}</p>
          <p className="readout mt-0.5 text-[10px] text-fog">
            {lakh(car.priceRange[0])} – {lakh(car.priceRange[1])}
          </p>
        </div>
      </div>

      {/* MATCH STRENGTH */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-[2px] flex-1 bg-line">
          <div className="h-full bg-signal" style={{ width: `${car.match}%` }} />
        </div>
        <span className="readout text-[10px] text-fog">{car.match}% match</span>
      </div>

      <dl className="mt-5 grid grid-cols-4 gap-3">
        {[
          ["Power", `${car.power} bhp`],
          // An electric motor has no displacement, so the cell says so rather
          // than claiming nought cc.
          ["Engine", car.engine ? `${car.engine} cc` : "Electric"],
          ["Economy", economy(car)],
          ["Seats", car.seats]
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="label">{label}</dt>
            <dd className="readout mt-1 text-sm text-chalk">{value}</dd>
          </div>
        ))}
      </dl>

      {/* WHY IT CAME BACK */}
      <ul className="mt-5 flex flex-wrap gap-2">
        {car.reasons.map((reason) => (
          <li
            key={reason}
            className="readout border border-line px-2 py-1 text-[10px] text-fog"
          >
            {reason}
          </li>
        ))}
      </ul>

      <p className={`readout mt-4 text-[11px] ${verdict.tone}`}>
        {verdict.label} — the model puts this spec around {lakh(car.valuation.fair)}
      </p>

      <Accessories items={car.accessories} />

      <Link
        to="/customise"
        className="btn btn-ghost mt-5 w-full"
        title={garage.exact ? undefined : "The nearest car we have a model of"}
      >
        Build the {garage.car.name}
        <span className="ml-2 opacity-60">({garage.reason})</span>
      </Link>
    </motion.article>
  );
}

export default function RecommendPage() {
  const [data, setData] = useState(null);

  const results = data?.results ?? null;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      <header>
        <p className="label">02 / Discover</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Tell it how you drive.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
          Content based filtering over every car on sale in India today.
          Anything that cannot work is filtered out first, then what remains is
          ranked against what you asked for. Every result says why it is there.
        </p>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr]">

        <div>
          <div className="panel p-6 lg:sticky lg:top-24">
            <p className="label">About you</p>
            <div className="mt-5">
              <MLPanel onResults={setData} />
            </div>
          </div>
        </div>

        <div>
          {results === null && (
            <div className="grid-veil flex min-h-[320px] items-center justify-center border border-line-soft p-10 text-center">
              <div>
                <p className="label">Awaiting input</p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">
                  Set a budget and say how you drive. Matches appear here with
                  the reasoning behind each one.
                </p>
              </div>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="border border-line-soft p-10 text-center">
              <p className="label">Nothing fits</p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-fog">
                {data.message ??
                  "Nothing in the data fits that. Try raising the budget or asking for fewer seats."}
              </p>
            </div>
          )}

          {results !== null && results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="label">
                  {results.length} matches from {data.considered} that fit
                </p>
                <span className="label">Budget {lakh(data.budget)}</span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {results.map((car, index) => (
                  <ResultCard key={`${car.brand}-${car.model}`} car={car} index={index} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
