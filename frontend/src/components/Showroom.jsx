import { useState } from "react";
import { cars, bodyStyles } from "../data/cars";
import { finishes } from "../data/paint";
import CarViewer from "./CarViewer";
import ControlPanel from "./configurator/ControlPanel";
import {
  wheelOptions,
  spoilerOptions,
  wheelSizes,
  stanceLevels,
  priceOf,
  formatRupees
} from "../data/accessories";
import { CAMERA_VIEWS } from "../data/views";

function CarList({ selected, onSelect }) {
  return (
    <aside className="flex shrink-0 gap-px overflow-x-auto border-b border-line-soft bg-line-soft lg:w-60 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-b-0 lg:border-r">
      {bodyStyles.map((style) => (
        <div key={style} className="contents lg:block lg:bg-ink">
          <p className="label hidden px-5 pt-5 pb-2 lg:block">{style}</p>

          {cars
            .filter((car) => car.bodyStyle === style)
            .map((car) => {
              const active = selected.id === car.id;

              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => onSelect(car)}
                  className={[
                    "group flex w-full shrink-0 items-center gap-3 px-5 py-3 text-left transition-colors",
                    active ? "bg-panel" : "bg-ink hover:bg-panel/60"
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block h-6 w-[2px] shrink-0 transition-colors",
                      active ? "bg-signal" : "bg-line group-hover:bg-fog"
                    ].join(" ")}
                  />
                  <span className="min-w-0">
                    <span
                      className={[
                        "block truncate text-sm whitespace-nowrap",
                        active ? "text-chalk" : "text-fog"
                      ].join(" ")}
                    >
                      {car.name}
                    </span>
                    <span className="readout hidden text-[10px] text-fog lg:block">
                      {car.weightMb} MB
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      ))}
    </aside>
  );
}

export default function Showroom() {

  const [selectedCar, setSelectedCar] = useState(cars[0]);
  const [color, setColor] = useState("#d8dce1");
  const [finish, setFinish] = useState("glossy");
  const [wheelType, setWheelType] = useState("sport");
  const [spoilerType, setSpoilerType] = useState("stock");
  const [wheelSize, setWheelSize] = useState(1);
  const [stance, setStance] = useState(0);
  const [view, setView] = useState("hero");

  const [paint, setPaint] = useState({
    metalness: finishes.glossy.metalness,
    roughness: finishes.glossy.roughness,
    clearcoat: finishes.glossy.clearcoat
  });

  const applyFinish = (next) => {
    setFinish(next);
    setPaint((previous) => ({
      ...previous,
      metalness: finishes[next].metalness,
      roughness: finishes[next].roughness,
      clearcoat: finishes[next].clearcoat
    }));
  };

  // Sizing and stance only exist once the stock wheels are swapped out, so they
  // are not charged for while they cannot be applied.
  const aftermarket = wheelType !== "stock";

  const total =
    priceOf(wheelOptions, wheelType) +
    priceOf(spoilerOptions, spoilerType) +
    (aftermarket ? priceOf(wheelSizes, wheelSize) : 0) +
    (aftermarket ? priceOf(stanceLevels, stance) : 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">

      <CarList selected={selectedCar} onSelect={setSelectedCar} />

      {/* VIEWPORT */}
      <div className="relative min-h-[45vh] flex-1">
        <CarViewer
          car={selectedCar}
          color={color}
          paint={paint}
          wheelType={wheelType}
          spoilerType={spoilerType}
          wheelSize={aftermarket ? wheelSize : 1}
          stance={aftermarket ? stance : 0}
          view={view}
        />

        {/* CAMERA PRESETS */}
        <div className="absolute top-5 right-5 z-10 flex gap-px bg-line-soft">
          {CAMERA_VIEWS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setView(preset.id)}
              className={[
                "px-3 py-2 text-[10px] tracking-widest uppercase transition-colors",
                view === preset.id
                  ? "bg-signal text-ink"
                  : "bg-ink/80 text-fog hover:text-chalk"
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}
        </div>

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
                {formatRupees(total)}
              </p>
            </div>

            <div className="absolute bottom-0 left-0">
              <p className="label">Drag to orbit · scroll to zoom</p>
            </div>
          </div>
        </div>
      </div>

      <ControlPanel
        car={selectedCar}
        color={color}
        setColor={setColor}
        finish={finish}
        applyFinish={applyFinish}
        paint={paint}
        setPaint={setPaint}
        wheelType={wheelType}
        setWheelType={setWheelType}
        spoilerType={spoilerType}
        setSpoilerType={setSpoilerType}
        wheelSize={wheelSize}
        setWheelSize={setWheelSize}
        stance={stance}
        setStance={setStance}
        total={total}
      />
    </div>
  );
}
