import { Link } from "react-router-dom";

const stack = [
  "React 19",
  "Three.js",
  "React Three Fiber",
  "Tailwind",
  "Express",
  "Flask",
  "scikit-learn"
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line-soft bg-panel">
      <div className="tick-rule opacity-60" />

      <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-12 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">

        <div>
          <div className="flex items-center gap-3">
            <span className="block h-4 w-[3px] bg-signal" />
            <span className="text-lg font-semibold tracking-tight">
              AUTO<span className="text-signal">VERSE</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">
            A 3D configurator wired to a machine learning recommender. Every
            accessory is fitted by measuring the car itself, so parts land on the
            model instead of near it.
          </p>
        </div>

        <div>
          <p className="label">Sections</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-fog">
            <Link to="/" className="w-fit hover:text-signal">Home</Link>
            <Link to="/configure" className="w-fit hover:text-signal">Configurator</Link>
            <Link to="/recommend" className="w-fit hover:text-signal">AI Match</Link>
            <Link to="/value" className="w-fit hover:text-signal">Valuation</Link>
            <Link to="/detect" className="w-fit hover:text-signal">From a photo</Link>
          </div>
        </div>

        <div>
          <p className="label">Built with</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {stack.map((item) => (
              <span
                key={item}
                className="readout border border-line px-2 py-1 text-[10px] text-fog"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line-soft px-5 py-5 md:px-8">
        <p className="readout mx-auto max-w-[1500px] text-[10px] tracking-widest text-fog">
          AUTOVERSE / BUILT AS A PORTFOLIO PROJECT
        </p>
      </div>
    </footer>
  );
}
