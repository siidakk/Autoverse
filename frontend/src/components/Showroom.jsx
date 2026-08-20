import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cars, bodyStyles } from "../data/cars";
import { finishes } from "../data/paint";
import CarViewer from "./CarViewer";
import ControlPanel from "./configurator/ControlPanel";
import ViewportLoader from "./configurator/ViewportLoader";
import {
  wheelOptions,
  spoilerOptions,
  wheelSizes,
  stanceLevels,
  exhaustOptions,
  headlightOptions,
  underglowOptions,
  wrapOptions,
  tintOptions,
  decalOptions,
  priceOf,
  colourOf,
  optionBy,
  formatRupees
} from "../data/accessories";
import { CAMERA_VIEWS } from "../data/views";
import { SCENES, sceneById } from "../data/scenes";
import { loadBuild } from "../lib/api";
import { noteViewed } from "../lib/recent";

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

  // Arriving from a photo carries a car and its paint in the link. Read once,
  // as the starting point only, so everything after this is the user's doing.
  const [selectedCar, setSelectedCar] = useState(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("car"));
    return cars.find((entry) => entry.id === requested) ?? cars[0];
  });

  const [color, setColor] = useState(() => {
    const paint = new URLSearchParams(window.location.search).get("colour");
    return /^#[0-9a-f]{6}$/i.test(paint ?? "") ? paint : "#d8dce1";
  });
  const [finish, setFinish] = useState("glossy");
  const [wheelType, setWheelType] = useState("sport");
  const [spoilerType, setSpoilerType] = useState("stock");
  const [wheelSize, setWheelSize] = useState(1);
  const [stance, setStance] = useState(0);
  const [exhaustType, setExhaustType] = useState("stock");
  const [headlightType, setHeadlightType] = useState("stock");
  const [underglow, setUnderglow] = useState("off");
  const [wrapMode, setWrapMode] = useState("none");
  const [wrapColour, setWrapColour] = useState("#0c0d0f");
  const [tintLevel, setTintLevel] = useState("clear");
  const [view, setView] = useState("hero");
  const [stageId, setStageId] = useState("studio");
  const [comparing, setComparing] = useState(false);

  const stage = sceneById(stageId);

  // Remembered on this device so the garage can offer a way back to it.
  useEffect(() => {
    noteViewed(selectedCar);
  }, [selectedCar]);
  const [decals, setDecals] = useState([]);
  const [decalDesign, setDecalDesign] = useState(null);

  const placeDecal = useCallback(
    (hit) => {
      setDecals((current) => [
        ...current,
        {
          ...hit,
          id: `${Date.now()}-${current.length}`,
          design: decalDesign,
          size: 0.42,
          rotation: 0
        }
      ]);
      setDecalDesign(null);
    },
    [decalDesign]
  );

  const [searchParams, setSearchParams] = useSearchParams();

  // A build in the address bar is loaded once and poured back into state. The
  // flag starts on when there is a code, so the effect never has to set it.
  const sharedCode = searchParams.get("build");
  const [restoring, setRestoring] = useState(Boolean(sharedCode));


  const [paint, setPaint] = useState({
    metalness: finishes.glossy.metalness,
    roughness: finishes.glossy.roughness,
    clearcoat: finishes.glossy.clearcoat
  });

  const applyFinish = useCallback((next) => {
    setFinish(next);
    setPaint((previous) => ({
      ...previous,
      metalness: finishes[next].metalness,
      roughness: finishes[next].roughness,
      clearcoat: finishes[next].clearcoat
    }));
  }, []);

  useEffect(() => {
    if (!sharedCode) return;

    let cancelled = false;

    loadBuild(sharedCode)
      .then((build) => {
        if (cancelled) return;

        const car = cars.find((entry) => entry.id === build.carId);
        if (car) setSelectedCar(car);

        const spec = build.spec ?? {};
        if (spec.color) setColor(spec.color);
        if (spec.finish) applyFinish(spec.finish);
        if (spec.wheelType) setWheelType(spec.wheelType);
        if (spec.wheelSize !== undefined) setWheelSize(spec.wheelSize);
        if (spec.stance !== undefined) setStance(spec.stance);
        if (spec.spoilerType) setSpoilerType(spec.spoilerType);
        if (spec.exhaustType) setExhaustType(spec.exhaustType);
        if (spec.headlightType) setHeadlightType(spec.headlightType);
        if (spec.underglow) setUnderglow(spec.underglow);
        if (spec.wrapMode) setWrapMode(spec.wrapMode);
        if (spec.wrapColour) setWrapColour(spec.wrapColour);
        if (spec.tintLevel) setTintLevel(spec.tintLevel);
      })
      .catch(() => {
        // A bad code should not strand the configurator; it just opens blank.
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sharedCode, applyFinish]);

  // Sizing and stance only exist once the stock wheels are swapped out, so they
  // are not charged for while they cannot be applied.
  const aftermarket = wheelType !== "stock";

  const total =
    priceOf(wheelOptions, wheelType) +
    priceOf(spoilerOptions, spoilerType) +
    priceOf(exhaustOptions, exhaustType) +
    priceOf(headlightOptions, headlightType) +
    priceOf(underglowOptions, underglow) +
    priceOf(wrapOptions, wrapMode) +
    priceOf(tintOptions, tintLevel) +
    decals.reduce(
      (sum, decal) => sum + priceOf(decalOptions, decal.design),
      0
    ) +
    (aftermarket ? priceOf(wheelSizes, wheelSize) : 0) +
    (aftermarket ? priceOf(stanceLevels, stance) : 0);

  // Everything the user has moved away from factory, which drives both the
  // change count and what the comparison reverts.
  const stockSpec = {
    wheelType: "stock",
    wheelSize: 1,
    stance: 0,
    spoilerType: "stock",
    exhaustType: "stock",
    headlightType: "stock",
    underglow: "off",
    wrapMode: "none",
    tintLevel: "clear"
  };

  const currentSpec = {
    wheelType,
    wheelSize: aftermarket ? wheelSize : 1,
    stance: aftermarket ? stance : 0,
    spoilerType,
    exhaustType,
    headlightType,
    underglow,
    wrapMode,
    tintLevel
  };

  const changes = Object.keys(stockSpec).filter(
    (key) => stockSpec[key] !== currentSpec[key]
  ).length;

  const shown = comparing ? stockSpec : currentSpec;

  // Kept stable, because a fresh object here re-runs the material work in the
  // model on every single render.
  const wrap = useMemo(
    () => ({ mode: shown.wrapMode, colour: wrapColour }),
    [shown.wrapMode, wrapColour]
  );

  const tint = useMemo(
    () => optionBy(tintOptions, shown.tintLevel),
    [shown.tintLevel]
  );

  const underglowColour = useMemo(
    () => colourOf(underglowOptions, shown.underglow),
    [shown.underglow]
  );

  // A theme arrives as a whole specification, so every setting moves together
  // rather than the user changing eleven controls by hand.
  const applyTheme = useCallback((spec) => {
    if (spec.color) setColor(spec.color);
    if (spec.finish) applyFinish(spec.finish);
    if (spec.wheelType) setWheelType(spec.wheelType);
    if (spec.wheelSize !== undefined) setWheelSize(spec.wheelSize);
    if (spec.stance !== undefined) setStance(spec.stance);
    if (spec.spoilerType) setSpoilerType(spec.spoilerType);
    if (spec.exhaustType) setExhaustType(spec.exhaustType);
    if (spec.headlightType) setHeadlightType(spec.headlightType);
    if (spec.underglow) setUnderglow(spec.underglow);
    if (spec.wrapMode) setWrapMode(spec.wrapMode);
    if (spec.wrapColour) setWrapColour(spec.wrapColour);
    if (spec.tintLevel) setTintLevel(spec.tintLevel);
    // The room is part of the look, so a night theme brings the night with it.
    if (spec.stage) setStageId(spec.stage);
  }, [applyFinish]);

  const buildPayload = useCallback(
    () => ({
      carId: selectedCar.id,
      carName: selectedCar.name,
      total,
      spec: {
        color,
        finish,
        wheelType,
        wheelSize,
        stance,
        spoilerType,
        exhaustType,
        headlightType,
        underglow,
        wrapMode,
        wrapColour,
        tintLevel
      }
    }),
    [
      selectedCar, total, color, finish, wheelType, wheelSize, stance,
      spoilerType, exhaustType, headlightType, underglow, wrapMode,
      wrapColour, tintLevel
    ]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">

      <CarList selected={selectedCar} onSelect={setSelectedCar} />

      {/* VIEWPORT */}
      <div className="relative min-h-[45vh] flex-1">
        <CarViewer
          car={selectedCar}
          color={color}
          paint={paint}
          wheelType={shown.wheelType}
          spoilerType={shown.spoilerType}
          wheelSize={shown.wheelSize}
          stance={shown.stance}
          exhaustType={shown.exhaustType}
          headlightType={shown.headlightType}
          underglow={underglowColour}
          wrap={wrap}
          tint={tint}
          decals={comparing ? [] : decals}
          onPlaceDecal={decalDesign ? placeDecal : null}
          view={view}
          stage={stage}
        />

        <ViewportLoader car={selectedCar} />

        {/* SCENE AND CAMERA */}
        <div className="absolute top-5 right-5 z-10 flex flex-col items-end gap-2">
          <div className="flex gap-px bg-line-soft">
            {SCENES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStageId(option.id)}
                title={option.note}
                className={[
                  "px-3 py-2 text-[10px] tracking-widest uppercase transition-colors",
                  stageId === option.id
                    ? "bg-signal text-ink"
                    : "bg-ink/80 text-fog hover:text-chalk"
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-px bg-line-soft">
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
        </div>

        {/* Readouts flip to dark type on the bright scenes */}
        <div
          className={[
            "pointer-events-none absolute inset-0 p-5",
            stage.light ? "text-ink [&_.label]:text-ink/70" : ""
          ].join(" ")}
        >
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
        exhaustType={exhaustType}
        setExhaustType={setExhaustType}
        headlightType={headlightType}
        setHeadlightType={setHeadlightType}
        underglow={underglow}
        setUnderglow={setUnderglow}
        wrapMode={wrapMode}
        setWrapMode={setWrapMode}
        wrapColour={wrapColour}
        setWrapColour={setWrapColour}
        tintLevel={tintLevel}
        setTintLevel={setTintLevel}
        total={total}
        buildPayload={buildPayload}
        onSaved={(code) => setSearchParams({ build: code }, { replace: true })}
        restoring={restoring}
        comparing={comparing}
        setComparing={setComparing}
        changes={changes}
        onApplyTheme={applyTheme}
        decals={decals}
        decalDesign={decalDesign}
        setDecalDesign={setDecalDesign}
        clearDecals={() => setDecals([])}
      />
    </div>
  );
}
