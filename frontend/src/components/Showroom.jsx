import { useState } from "react";
import { Link } from "react-router-dom";
import { cars } from "../data/cars";
import CarViewer from "./CarViewer";

const wheelOptions = [
  { value: "stock", label: "Stock", price: 0 },
  { value: "sport", label: "Sport", price: 5000 },
  { value: "classic", label: "Classic", price: 3000 }
];

const spoilerOptions = [
  { value: "stock", label: "None", price: 0 },
  { value: "sport", label: "Ducktail", price: 4000 },
  { value: "racing", label: "GT Wing", price: 7000 }
];

const finishPresets = {
  matte: { metalness: 0.1, roughness: 0.8, clearcoat: 0 },
  glossy: { metalness: 0.5, roughness: 0.15, clearcoat: 1 },
  metallic: { metalness: 0.9, roughness: 0.25, clearcoat: 0.6 }
};

// Ten hues across three saturations and three lightness steps.
function generatePalette() {
  const colors = [];

  for (let h = 0; h < 360; h += 36) {
    for (let s = 60; s <= 100; s += 20) {
      for (let l = 40; l <= 70; l += 15) {
        colors.push(`hsl(${h}, ${s}%, ${l}%)`);
      }
    }
  }

  return colors;
}

const palette = generatePalette();

const priceOf = (options, value) =>
  options.find((option) => option.value === value)?.price ?? 0;

const formatRupees = (value) => `₹${value.toLocaleString("en-IN")}`;

function OptionRow({ label, options, value, onChange }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-px bg-line-soft">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "px-2 py-2.5 text-center transition-colors",
              value === option.value
                ? "bg-signal text-ink"
                : "bg-ink text-fog hover:text-chalk"
            ].join(" ")}
          >
            <span className="block text-[11px] font-medium tracking-wide">
              {option.label}
            </span>
            <span className="readout mt-0.5 block text-[9px] opacity-80">
              {option.price ? `+${(option.price / 1000).toFixed(0)}k` : "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label">{label}</p>
        <span className="readout text-[11px] text-chalk">
          {Number(value).toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        className="slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default function Showroom() {

  const [selectedCar, setSelectedCar] = useState(cars[0]);
  const [color, setColor] = useState("#d9dde3");
  const [finish, setFinish] = useState("glossy");
  const [wheelType, setWheelType] = useState("sport");
  const [spoilerType, setSpoilerType] = useState("sport");

  const [paint, setPaint] = useState({
    hueShift: 0,
    saturation: 1,
    lightness: 1,
    ...finishPresets.glossy
  });

  const applyFinish = (nextFinish) => {
    setFinish(nextFinish);
    setPaint((previous) => ({ ...previous, ...finishPresets[nextFinish] }));
  };

  const accessoriesTotal =
    priceOf(wheelOptions, wheelType) + priceOf(spoilerOptions, spoilerType);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">

      {/* ============ LEFT: PLATFORM LIST ============ */}
      <aside className="flex shrink-0 gap-px overflow-x-auto border-b border-line-soft bg-line-soft lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="hidden bg-ink px-5 py-5 lg:block">
          <p className="label">Platform</p>
        </div>

        {cars.map((car, index) => {
          const active = selectedCar.id === car.id;

          return (
            <button
              key={car.id}
              type="button"
              onClick={() => {
                setSelectedCar(car);
                setColor(car.colors[0]);
                applyFinish(car.finishes[0]);
              }}
              className={[
                "group flex shrink-0 items-center gap-3 px-5 py-4 text-left transition-colors lg:shrink",
                active ? "bg-panel" : "bg-ink hover:bg-panel/70"
              ].join(" ")}
            >
              <span
                className={[
                  "block h-6 w-[2px] transition-colors",
                  active ? "bg-signal" : "bg-line group-hover:bg-fog"
                ].join(" ")}
              />
              <span>
                <span className="label block">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={[
                    "block whitespace-nowrap text-sm",
                    active ? "text-chalk" : "text-fog"
                  ].join(" ")}
                >
                  {car.name}
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      {/* ============ CENTRE: VIEWPORT ============ */}
      <div className="relative min-h-[45vh] flex-1">
        <CarViewer
          car={selectedCar}
          color={color}
          finish={finish}
          paint={paint}
          wheelType={wheelType}
          spoilerType={spoilerType}
        />

        {/* VIEWPORT OVERLAY */}
        <div className="pointer-events-none absolute inset-0 p-5">
          <div className="hud-frame h-full w-full">
            <div className="absolute top-0 left-0">
              <p className="readout text-lg tracking-tight">{selectedCar.name}</p>
              <p className="label mt-1">
                {finish} · {wheelType} wheels
              </p>
            </div>

            <div className="absolute right-0 bottom-0 text-right">
              <p className="label">Accessories</p>
              <p className="readout mt-1 text-xl text-signal">
                {formatRupees(accessoriesTotal)}
              </p>
            </div>

            <div className="absolute bottom-0 left-0">
              <p className="label">Drag to orbit · scroll to zoom</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ RIGHT: CONTROLS ============ */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-line-soft bg-panel lg:w-[340px] lg:border-t-0 lg:border-l">

        <div className="border-b border-line-soft px-5 py-5">
          <p className="label">Specification</p>
          <p className="mt-2 text-sm text-fog">
            Wheels and spoilers are fitted by measuring this car.
          </p>
        </div>

        {/* PAINT */}
        <section className="border-b border-line-soft px-5 py-6">
          <div className="flex items-center justify-between">
            <p className="label">Paint</p>
            <span
              className="block h-4 w-8 border border-line"
              style={{ background: color }}
            />
          </div>

          <div className="mt-3 grid grid-cols-10 gap-1">
            {palette.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                onClick={() => setColor(swatch)}
                style={{ background: swatch }}
                className={[
                  "h-5 w-full transition-transform hover:scale-110",
                  color === swatch ? "ring-1 ring-chalk ring-offset-1 ring-offset-panel" : ""
                ].join(" ")}
              />
            ))}
          </div>

          <label className="mt-4 flex items-center justify-between">
            <span className="label">Custom</span>
            <input
              type="color"
              value={/^#/.test(color) ? color : "#ffffff"}
              onChange={(event) => setColor(event.target.value)}
              className="h-7 w-14 cursor-pointer border border-line bg-ink"
            />
          </label>
        </section>

        {/* FINISH */}
        <section className="border-b border-line-soft px-5 py-6">
          <p className="label">Finish</p>
          <div className="mt-2 grid grid-cols-3 gap-px bg-line-soft">
            {Object.keys(finishPresets).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyFinish(option)}
                className={[
                  "py-2.5 text-[11px] font-medium capitalize transition-colors",
                  finish === option
                    ? "bg-signal text-ink"
                    : "bg-ink text-fog hover:text-chalk"
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        {/* ACCESSORIES */}
        <section className="space-y-5 border-b border-line-soft px-5 py-6">
          <OptionRow
            label="Wheels"
            options={wheelOptions}
            value={wheelType}
            onChange={setWheelType}
          />
          <OptionRow
            label="Spoiler"
            options={spoilerOptions}
            value={spoilerType}
            onChange={setSpoilerType}
          />
        </section>

        {/* SURFACE CALIBRATION */}
        <section className="space-y-5 border-b border-line-soft px-5 py-6">
          <p className="label">Surface</p>

          <Slider
            label="Metalness"
            value={paint.metalness}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => setPaint({ ...paint, metalness: value })}
          />
          <Slider
            label="Roughness"
            value={paint.roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => setPaint({ ...paint, roughness: value })}
          />
          <Slider
            label="Clearcoat"
            value={paint.clearcoat}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => setPaint({ ...paint, clearcoat: value })}
          />
        </section>

        {/* TOTAL */}
        <section className="px-5 py-6">
          <div className="flex items-end justify-between">
            <p className="label">Accessories total</p>
            <p className="readout text-2xl text-signal">
              {formatRupees(accessoriesTotal)}
            </p>
          </div>

          <div className="tick-rule-dense mt-4 opacity-70" />

          <Link to="/recommend" className="btn btn-ghost mt-5 w-full">
            Find matching cars
          </Link>
        </section>
      </aside>
    </div>
  );
}
