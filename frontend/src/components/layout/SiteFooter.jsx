import { Link } from "react-router-dom";
import { SECTIONS } from "../../data/navigation";

const stack = [
  "React 19",
  "Three.js",
  "React Three Fiber",
  "Tailwind 4",
  "Express",
  "MongoDB",
  "Flask",
  "scikit-learn",
  "TensorFlow.js"
];

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8">
      {/* The same wash as the hero, turned right down, so the page closes the
          way it opened instead of falling off a cliff into flat black. */}
      <div className="aurora opacity-[0.14]" />

      <div className="relative mx-auto grid max-w-[1500px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr]">

        <div>
          <div className="flex items-center gap-3">
            <span className="block h-5 w-[3px] rounded-full bg-gradient-to-b from-signal to-flare" />
            <span className="text-xl font-semibold tracking-tight">
              AUTO<span className="text-gradient">VERSE</span>
            </span>
          </div>

          <p className="mt-5 max-w-md leading-relaxed text-fog">
            See what your car would actually look like modified — not a
            plausible picture of a car like yours, but yours, measured. Every
            part is fitted by measuring the model itself, so it lands on the car
            rather than near it.
          </p>
        </div>

        <div>
          <p className="label">Sections</p>
          <div className="mt-5 flex flex-col gap-3">
            {SECTIONS.map((section) => (
              <Link key={section.to} to={section.to} className="group w-fit">
                <span className="text-chalk transition-colors group-hover:text-signal">
                  {section.label}
                </span>
                <span className="block text-[13px] text-fog">{section.blurb}</span>
              </Link>
            ))}
            <Link to="/garage" className="group mt-1 w-fit">
              <span className="text-chalk transition-colors group-hover:text-signal">
                Garage
              </span>
              <span className="block text-[13px] text-fog">Your saved builds</span>
            </Link>
          </div>
        </div>

        <div>
          <p className="label">Built with</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {stack.map((item) => (
              <span
                key={item}
                className="readout rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-fog"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/8 px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="readout text-[10px] tracking-widest text-fog">
            AUTOVERSE / BUILT AS A PORTFOLIO PROJECT
          </p>
          <p className="readout text-[10px] tracking-widest text-fog">
            Damage model trained on CarDD · non-commercial research use
          </p>
        </div>
      </div>
    </footer>
  );
}
