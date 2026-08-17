import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import MLPanel from "../components/MLPanel";

const formatUsd = (value) =>
  typeof value === "number" ? `$${value.toLocaleString("en-US")}` : "—";

function ResultCard({ car, index }) {
  const specs = [
    ["Power", `${car.horsepower} hp`],
    ["City", `${car.city_mpg} mpg`],
    ["Highway", `${car.highway_mpg} mpg`]
  ];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="panel hud-frame p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="label">Match {String(index + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 text-xl font-medium tracking-tight">
            {car.make} {car.model}
          </h3>
        </div>

        <div className="text-right">
          <span className="label">MSRP (USD)</span>
          <p className="readout mt-1 text-lg text-signal">{formatUsd(car.price)}</p>
        </div>
      </div>

      <div className="tick-rule-dense mt-5 opacity-60" />

      <dl className="mt-4 grid grid-cols-3 gap-4">
        {specs.map(([label, value]) => (
          <div key={label}>
            <dt className="label">{label}</dt>
            <dd className="readout mt-1 text-sm text-chalk">{value}</dd>
          </div>
        ))}
      </dl>
    </motion.article>
  );
}

export default function RecommendPage() {
  const [results, setResults] = useState(null);

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-8">

      {/* HEADER */}
      <header>
        <p className="label">02 / AI Match</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
          Describe the car you want.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
          A scikit-learn model scores your figures, then returns the five cars
          whose scores sit closest to it. Trained on a US market dataset, so
          prices come back in dollars.
        </p>
        <div className="tick-rule mt-8 opacity-70" />
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[380px_1fr]">

        {/* FORM */}
        <div>
          <div className="panel p-6 lg:sticky lg:top-24">
            <p className="label">Requirements</p>
            <div className="mt-5">
              <MLPanel onResults={setResults} />
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div>
          {results === null && (
            <div className="grid-veil flex min-h-[320px] items-center justify-center border border-line-soft p-10 text-center">
              <div>
                <p className="label">Awaiting input</p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">
                  Set your requirements and run the model. Results appear here,
                  ranked by how closely each car matches.
                </p>
              </div>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="border border-line-soft p-10 text-center">
              <p className="label">No results</p>
              <p className="mt-4 text-sm text-fog">
                The model returned nothing. Try adjusting your figures.
              </p>
            </div>
          )}

          {results !== null && results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="label">{results.length} matches</p>
                <Link to="/configure" className="label hover:text-signal">
                  Build one →
                </Link>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {results.map((car, index) => (
                  <ResultCard key={`${car.make}-${car.model}-${index}`} car={car} index={index} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
