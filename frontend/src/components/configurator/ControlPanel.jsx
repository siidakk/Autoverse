import { useState } from "react";
import { Link } from "react-router-dom";
import { paintFamilies, finishes } from "../../data/paint";
import {
  wheelOptions,
  spoilerOptions,
  formatRupees
} from "../../data/accessories";

const TABS = [
  { id: "paint", label: "Paint" },
  { id: "wheels", label: "Wheels" },
  { id: "body", label: "Body" }
];

function Choice({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={[
        "flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition-colors",
        selected
          ? "border-signal bg-signal/10"
          : "border-line-soft bg-ink hover:border-line"
      ].join(" ")}
    >
      <span>
        <span
          className={[
            "block text-sm font-medium",
            selected ? "text-signal" : "text-chalk"
          ].join(" ")}
        >
          {option.label}
        </span>
        <span className="mt-0.5 block text-xs text-fog">{option.note}</span>
      </span>

      <span className="readout shrink-0 text-xs text-fog">
        {option.price ? `+${formatRupees(option.price)}` : "—"}
      </span>
    </button>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="readout text-[11px] text-chalk">
          {Number(value).toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        className="slider mt-2"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function PaintTab({ color, setColor, finish, applyFinish, paint, setPaint }) {
  const [family, setFamily] = useState(paintFamilies[0].name);
  const [advanced, setAdvanced] = useState(false);

  const active = paintFamilies.find((entry) => entry.name === family);

  return (
    <div className="space-y-7">

      {/* CURRENT SELECTION */}
      <div className="flex items-center gap-4">
        <span
          className="block h-14 w-14 shrink-0 border border-line"
          style={{ background: color }}
        />
        <div>
          <p className="label">Current</p>
          <p className="readout mt-1 text-sm text-chalk">{color}</p>
          <p className="mt-0.5 text-xs text-fog">{finishes[finish].note}</p>
        </div>
      </div>

      {/* FAMILY PICKER */}
      <div>
        <p className="label">Colour family</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {paintFamilies.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setFamily(entry.name)}
              title={entry.name}
              className={[
                "h-7 w-7 border transition-transform hover:scale-110",
                family === entry.name ? "border-chalk scale-110" : "border-line-soft"
              ].join(" ")}
              style={{ background: entry.swatch }}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1.5">
          {active.shades.map((shade) => (
            <button
              key={shade}
              type="button"
              onClick={() => setColor(shade)}
              title={shade}
              className={[
                "h-9 border transition-transform hover:scale-105",
                color === shade ? "border-signal" : "border-transparent"
              ].join(" ")}
              style={{ background: shade }}
            />
          ))}
        </div>
      </div>

      {/* CUSTOM */}
      <label className="flex items-center justify-between border border-line-soft bg-ink px-4 py-3">
        <span>
          <span className="block text-sm text-chalk">Custom colour</span>
          <span className="mt-0.5 block text-xs text-fog">Pick any shade</span>
        </span>
        <input
          type="color"
          value={/^#/.test(color) ? color : "#ffffff"}
          onChange={(event) => setColor(event.target.value)}
          className="h-8 w-14 cursor-pointer border border-line bg-ink"
        />
      </label>

      {/* FINISH */}
      <div>
        <p className="label">Finish</p>
        <div className="mt-3 space-y-2">
          {Object.entries(finishes).map(([key, entry]) => (
            <Choice
              key={key}
              option={{ value: key, label: entry.label, note: entry.note, price: 0 }}
              selected={finish === key}
              onSelect={applyFinish}
            />
          ))}
        </div>
      </div>

      {/* ADVANCED, HIDDEN UNTIL ASKED FOR */}
      <div>
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          className="label flex w-full items-center justify-between hover:text-chalk"
        >
          Surface calibration
          <span className="readout text-chalk">{advanced ? "−" : "+"}</span>
        </button>

        {advanced && (
          <div className="mt-4 space-y-5">
            <Slider
              label="Metalness"
              value={paint.metalness}
              onChange={(value) => setPaint({ ...paint, metalness: value })}
            />
            <Slider
              label="Roughness"
              value={paint.roughness}
              onChange={(value) => setPaint({ ...paint, roughness: value })}
            />
            <Slider
              label="Clearcoat"
              value={paint.clearcoat}
              onChange={(value) => setPaint({ ...paint, clearcoat: value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControlPanel({
  car,
  color,
  setColor,
  finish,
  applyFinish,
  paint,
  setPaint,
  wheelType,
  setWheelType,
  spoilerType,
  setSpoilerType,
  total
}) {
  const [tab, setTab] = useState("paint");

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-line-soft bg-panel lg:w-[360px] lg:border-t-0 lg:border-l">

      {/* HEADER */}
      <div className="border-b border-line-soft px-5 py-4">
        <p className="label">Building</p>
        <p className="mt-1 text-lg font-medium tracking-tight">{car.name}</p>
        <p className="readout mt-0.5 text-xs text-fog">{car.bodyStyle}</p>
      </div>

      {/* TABS */}
      <div className="grid shrink-0 grid-cols-3 gap-px border-b border-line-soft bg-line-soft">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={[
              "py-3 text-[11px] tracking-widest uppercase transition-colors",
              tab === entry.id
                ? "bg-panel text-signal"
                : "bg-ink text-fog hover:text-chalk"
            ].join(" ")}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {tab === "paint" && (
          <PaintTab
            color={color}
            setColor={setColor}
            finish={finish}
            applyFinish={applyFinish}
            paint={paint}
            setPaint={setPaint}
          />
        )}

        {tab === "wheels" && (
          <div className="space-y-2">
            <p className="label mb-3">Wheel style</p>
            {wheelOptions.map((option) => (
              <Choice
                key={option.value}
                option={option}
                selected={wheelType === option.value}
                onSelect={setWheelType}
              />
            ))}
            <p className="pt-4 text-xs leading-relaxed text-fog">
              Wheels are measured onto this car, so a swap lands in the arches
              the originals came out of.
            </p>
          </div>
        )}

        {tab === "body" && (
          <div className="space-y-2">
            <p className="label mb-3">Spoiler</p>
            {spoilerOptions.map((option) => (
              <Choice
                key={option.value}
                option={option}
                selected={spoilerType === option.value}
                onSelect={setSpoilerType}
              />
            ))}
            <p className="pt-4 text-xs leading-relaxed text-fog">
              Height is read off the boot lid by raycasting, so the part follows
              the panel rather than floating above it.
            </p>
          </div>
        )}
      </div>

      {/* TOTAL */}
      <div className="shrink-0 border-t border-line-soft px-5 py-5">
        <div className="flex items-end justify-between">
          <span className="label">Accessories</span>
          <span className="readout text-2xl text-signal">
            {formatRupees(total)}
          </span>
        </div>

        <Link to="/recommend" className="btn btn-ghost mt-4 w-full">
          Find matching cars
        </Link>
      </div>
    </aside>
  );
}
