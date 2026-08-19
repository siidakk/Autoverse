import { useState } from "react";
import { Link } from "react-router-dom";
import { paintFamilies, finishes } from "../../data/paint";
import SaveBuild from "./SaveBuild";
import CompareToggle from "./CompareToggle";
import {
  wheelOptions,
  spoilerOptions,
  wheelSizes,
  stanceLevels,
  exhaustOptions,
  headlightOptions,
  underglowOptions,
  wrapOptions,
  wrapColours,
  tintOptions,
  decalOptions,
  formatRupees
} from "../../data/accessories";

const TABS = [
  { id: "paint", label: "Paint" },
  { id: "wheels", label: "Wheels" },
  { id: "body", label: "Body" },
  { id: "extras", label: "Extras" }
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
  wheelSize,
  setWheelSize,
  stance,
  setStance,
  exhaustType,
  setExhaustType,
  headlightType,
  setHeadlightType,
  underglow,
  setUnderglow,
  wrapMode,
  setWrapMode,
  wrapColour,
  setWrapColour,
  tintLevel,
  setTintLevel,
  total,
  buildPayload,
  onSaved,
  restoring,
  comparing,
  setComparing,
  changes,
  decals,
  decalDesign,
  setDecalDesign,
  clearDecals
}) {
  const [tab, setTab] = useState("paint");

  // The model's own wheels are welded into its bodywork, so nothing can be
  // resized or lowered until they are swapped out.
  const stock = wheelType === "stock";

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-line-soft bg-panel lg:w-[360px] lg:border-t-0 lg:border-l">

      {/* HEADER */}
      <div className="border-b border-line-soft px-5 py-4">
        <p className="label">{restoring ? "Restoring build…" : "Building"}</p>
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
          <div className="space-y-7">
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
            </div>

            {/* PLUS-SIZING */}
            <div className={stock ? "opacity-40" : ""}>
              <p className="label">Rim size</p>
              <div className="mt-2 grid grid-cols-4 gap-px bg-line-soft">
                {wheelSizes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={stock}
                    onClick={() => setWheelSize(option.value)}
                    title={option.note}
                    className={[
                      "py-2.5 text-center transition-colors disabled:cursor-not-allowed",
                      wheelSize === option.value && !stock
                        ? "bg-signal text-ink"
                        : "bg-ink text-fog hover:text-chalk"
                    ].join(" ")}
                  >
                    <span className="readout block text-[11px]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STANCE */}
            <div className={stock ? "opacity-40" : ""}>
              <p className="label mb-3">Ride height</p>
              <div className="space-y-2">
                {stanceLevels.map((option) => (
                  <Choice
                    key={option.value}
                    option={option}
                    selected={stance === option.value && !stock}
                    onSelect={stock ? () => {} : setStance}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-fog">
              {stock
                ? "Rim size and ride height need aftermarket wheels — the car's own wheels are part of its bodywork and cannot be moved separately."
                : "Wheels are measured onto this car, so a swap lands in the arches the originals came out of. Plus-sizing keeps the overall diameter and trades sidewall for rim."}
            </p>
          </div>
        )}

        {tab === "body" && (
          <div className="space-y-7">
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
            </div>

            <div className="space-y-2">
              <p className="label mb-3">Exhaust</p>
              {exhaustOptions.map((option) => (
                <Choice
                  key={option.value}
                  option={option}
                  selected={exhaustType === option.value}
                  onSelect={setExhaustType}
                />
              ))}
            </div>

            {/* WRAP */}
            <div className="space-y-2">
              <p className="label mb-3">Wrap</p>
              {wrapOptions.map((option) => (
                <Choice
                  key={option.value}
                  option={option}
                  selected={wrapMode === option.value}
                  onSelect={setWrapMode}
                />
              ))}

              {wrapMode !== "none" && (
                <div className="pt-3">
                  <p className="label">Wrap colour</p>
                  <div className="mt-2 flex gap-2">
                    {wrapColours.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => setWrapColour(swatch)}
                        className={[
                          "h-8 flex-1 border transition-transform hover:scale-105",
                          wrapColour === swatch ? "border-signal" : "border-line-soft"
                        ].join(" ")}
                        style={{ background: swatch }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs leading-relaxed text-fog">
              Spoiler height is read off the boot lid by raycasting, the tips
              sit against the measured rear bumper, and wraps are drawn by the
              material itself so they work on models with no usable UVs.
            </p>
          </div>
        )}

        {tab === "extras" && (
          <div className="space-y-7">
            <div className="space-y-2">
              <p className="label mb-3">Headlights</p>
              {headlightOptions.map((option) => (
                <Choice
                  key={option.value}
                  option={option}
                  selected={headlightType === option.value}
                  onSelect={setHeadlightType}
                />
              ))}
            </div>

            <div>
              <p className="label mb-3">Underglow</p>
              <div className="grid grid-cols-3 gap-2">
                {underglowOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUnderglow(option.value)}
                    className={[
                      "border px-2 py-3 text-center transition-colors",
                      underglow === option.value
                        ? "border-signal bg-signal/10"
                        : "border-line-soft bg-ink hover:border-line"
                    ].join(" ")}
                  >
                    <span
                      className="mx-auto block h-4 w-4 rounded-full border border-line"
                      style={{ background: option.colour ?? "transparent" }}
                    />
                    <span className="mt-2 block text-[11px] text-chalk">
                      {option.label}
                    </span>
                    <span className="readout mt-0.5 block text-[9px] text-fog">
                      {option.price ? `+${option.price / 1000}k` : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* TINT */}
            <div>
              <p className="label mb-3">Window tint</p>
              <div className="grid grid-cols-4 gap-px bg-line-soft">
                {tintOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTintLevel(option.value)}
                    title={option.note}
                    className={[
                      "px-1 py-3 text-center transition-colors",
                      tintLevel === option.value
                        ? "bg-signal text-ink"
                        : "bg-ink text-fog hover:text-chalk"
                    ].join(" ")}
                  >
                    <span className="readout block text-[11px]">{option.label}</span>
                    <span className="readout mt-0.5 block text-[9px] opacity-80">
                      {option.price ? `+${option.price / 1000}k` : "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* DECALS */}
            <div>
              <div className="flex items-baseline justify-between">
                <p className="label">Decals</p>
                {decals.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDecals}
                    className="label hover:text-signal"
                  >
                    Clear {decals.length}
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {decalOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDecalDesign(
                        decalDesign === option.value ? null : option.value
                      )
                    }
                    className={[
                      "border px-3 py-2.5 text-left transition-colors",
                      decalDesign === option.value
                        ? "border-signal bg-signal/10"
                        : "border-line-soft bg-ink hover:border-line"
                    ].join(" ")}
                  >
                    <span className="block text-[11px] text-chalk">
                      {option.label}
                    </span>
                    <span className="readout mt-0.5 block text-[9px] text-fog">
                      +{option.price}
                    </span>
                  </button>
                ))}
              </div>

              {decalDesign && (
                <p className="mt-3 border border-signal px-3 py-2 text-xs text-signal">
                  Now click the car where you want it.
                </p>
              )}
            </div>

            <p className="text-xs leading-relaxed text-fog">
              Beams aim out of whichever end the car's nose is, worked out from
              the bodywork rather than set per model. Glazing is picked out by
              being see-through, since names vary across every model here, and
              decals are projected onto whichever panel you click.
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

        <div className="mt-4">
          <CompareToggle
            comparing={comparing}
            setComparing={setComparing}
            changes={changes}
          />
        </div>

        <div className="mt-3">
          <SaveBuild buildPayload={buildPayload} onSaved={onSaved} />
        </div>

        <Link to="/recommend" className="btn btn-ghost mt-3 w-full">
          Find matching cars
        </Link>
      </div>
    </aside>
  );
}
