import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  caliperColours,
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
import * as sound from "../lib/sound";
import { engineFor } from "../data/engines";
import { useLiveRoom, newRoomCode } from "../lib/live";

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

// How a car arrives before anything is done to it. Written down once so the
// opening state and the reset when a different car is picked cannot drift
// apart.
const FACTORY = {
  color: "#d8dce1",
  finish: "glossy",
  wheelType: "sport",
  wheelSize: 1,
  caliper: "#c0242c",
  stance: 0,
  spoilerType: "stock",
  exhaustType: "stock",
  headlightType: "stock",
  underglow: "off",
  wrapMode: "none",
  wrapColour: "#0c0d0f",
  tintLevel: "clear"
};

// What each exhaust does to the noise. The engine is whatever the car has;
// the pipe only decides how much of it reaches you.
const EXHAUST_LOUDNESS = { stock: 1, twin: 1.15, quad: 1.35, centre: 1.2, carbon: 1.45 };

export default function Showroom() {

  // Arriving from a photo carries a car and its paint in the link. Read once,
  // as the starting point only, so everything after this is the user's doing.
  const [selectedCar, setSelectedCar] = useState(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("car"));
    return cars.find((entry) => entry.id === requested) ?? cars[0];
  });

  const [color, setColor] = useState(() => {
    const paint = new URLSearchParams(window.location.search).get("colour");
    return /^#[0-9a-f]{6}$/i.test(paint ?? "") ? paint : FACTORY.color;
  });
  const [finish, setFinish] = useState(FACTORY.finish);
  const [wheelType, setWheelType] = useState(FACTORY.wheelType);
  const [spoilerType, setSpoilerType] = useState(FACTORY.spoilerType);
  const [wheelSize, setWheelSize] = useState(FACTORY.wheelSize);
  const [caliper, setCaliper] = useState(FACTORY.caliper);
  const [stance, setStance] = useState(FACTORY.stance);
  const [exhaustType, setExhaustType] = useState(FACTORY.exhaustType);
  const [headlightType, setHeadlightType] = useState(FACTORY.headlightType);
  const [underglow, setUnderglow] = useState(FACTORY.underglow);
  const [wrapMode, setWrapMode] = useState(FACTORY.wrapMode);
  const [wrapColour, setWrapColour] = useState(FACTORY.wrapColour);
  const [tintLevel, setTintLevel] = useState(FACTORY.tintLevel);
  const [view, setView] = useState("hero");
  const [stageId, setStageId] = useState("studio");
  const [comparing, setComparing] = useState(false);

  // What this particular car has under the bonnet. A recording of that engine
  // is played if public/sounds has one; these numbers are what picks the
  // recording, shifts it to the right pitch, and stand in for it when there is
  // nothing to play.
  const engine = useMemo(() => engineFor(selectedCar.model), [selectedCar.model]);

  const stage = sceneById(stageId);

  const [quiet, setQuiet] = useState(() => sound.isMuted());

  const [engineOn, setEngineOn] = useState(false);

  // Leaving the engine running is a state rather than a gesture, so it gets its
  // own switch. Off by default: a noise that starts on its own is a noise
  // people close the tab over.
  //
  // Starting it may have to fetch a recording first, so this waits and moves
  // the switch on what actually happened rather than on what was asked for.
  const toggleEngine = useCallback(async () => {
    if (engineOn) {
      sound.stopIdle();
      setEngineOn(false);
      return;
    }

    setEngineOn(await sound.startIdle(selectedCar.model, engine));
  }, [engineOn, engine, selectedCar.model]);

  // Leaving the configurator has to stop the engine, or it follows you around
  // the rest of the site.
  useEffect(() => () => sound.stopIdle(), []);

  const toggleSound = useCallback(() => {
    setQuiet((wasQuiet) => {
      sound.setMuted(!wasQuiet);
      // Muting stops the engine, so the switch has to follow it down.
      if (!wasQuiet) setEngineOn(false);
      // Play something on the way back on, so the button proves itself.
      if (wasQuiet) sound.tick();
      return !wasQuiet;
    });
  }, []);

  // Fitting a part should sound like fitting a part. The noise is attached
  // here rather than inside the panel so that every control gets one without
  // thirty separate handlers having to remember to make it.
  const withSound = useCallback(
    (setter, play) => (value) => {
      // Choosing the option you already have should stay silent.
      setter((current) => {
        if (current !== value) play(value);
        return value;
      });
    },
    []
  );

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

  // Picking a different car starts that car from factory. Carrying the previous
  // car's paint, wheels and ride height across meant you were never looking at
  // the car you just chose, only at the last one wearing a new shape.
  //
  // The room and the camera angle are how you are looking rather than what you
  // built, so those stay where you left them.
  const selectCar = useCallback((car) => {
    if (car.id === selectedCar.id) return;

    setSelectedCar(car);

    setColor(FACTORY.color);
    applyFinish(FACTORY.finish);
    setWheelType(FACTORY.wheelType);
    setWheelSize(FACTORY.wheelSize);
    setCaliper(FACTORY.caliper);
    setStance(FACTORY.stance);
    setSpoilerType(FACTORY.spoilerType);
    setExhaustType(FACTORY.exhaustType);
    setHeadlightType(FACTORY.headlightType);
    setUnderglow(FACTORY.underglow);
    setWrapMode(FACTORY.wrapMode);
    setWrapColour(FACTORY.wrapColour);
    setTintLevel(FACTORY.tintLevel);
    setDecals([]);
    setDecalDesign(null);
    setComparing(false);

    // A running engine becomes the new car's engine rather than carrying the
    // old one's note across.
    sound.retuneIdle(car.model, engineFor(car.model));

    // A build code in the address bar belongs to the car that was open, so it
    // goes with it rather than re-loading over the new choice.
    setSearchParams({}, { replace: true });
  }, [selectedCar.id, applyFinish, setSearchParams]);

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
        if (spec.caliper) setCaliper(spec.caliper);
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
    (aftermarket ? priceOf(caliperColours, caliper) : 0) +
    (aftermarket ? priceOf(stanceLevels, stance) : 0);

  // Everything the user has moved away from factory, which drives both the
  // change count and what the comparison reverts.
  const stockSpec = {
    wheelType: "stock",
    wheelSize: 1,
    caliper: FACTORY.caliper,
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
    caliper: aftermarket ? caliper : FACTORY.caliper,
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
    if (spec.caliper) setCaliper(spec.caliper);
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

  // --- building it with someone else ---
  //
  // The room code lives in the address bar, so sharing the link is the whole
  // invitation. A change arriving from the room is applied without being sent
  // back out; without that guard two browsers spend the afternoon telling each
  // other the same thing.
  const room = searchParams.get("room");
  const fromRemote = useRef(false);

  const applyRemote = useCallback(
    (spec) => {
      fromRemote.current = true;

      if (spec.carId && spec.carId !== selectedCar.id) {
        const car = cars.find((entry) => entry.id === spec.carId);
        // Set directly rather than through selectCar, which resets everything
        // to factory -- exactly what the incoming spec is about to overwrite.
        if (car) setSelectedCar(car);
      }

      applyTheme(spec);
    },
    [applyTheme, selectedCar.id]
  );

  const live = useLiveRoom(room, applyRemote);
  const { send: sendSpec } = live;

  // Every setting that makes up the car, in one object, so the effect below
  // has a single thing to watch.
  const sharedSpec = useMemo(
    () => ({
      carId: selectedCar.id,
      color,
      finish,
      wheelType,
      wheelSize,
      caliper,
      stance,
      spoilerType,
      exhaustType,
      headlightType,
      underglow,
      wrapMode,
      wrapColour,
      tintLevel
    }),
    [
      selectedCar.id, color, finish, wheelType, wheelSize, caliper, stance,
      spoilerType, exhaustType, headlightType, underglow, wrapMode, wrapColour,
      tintLevel
    ]
  );

  useEffect(() => {
    if (!room) return;

    // The change that just arrived was theirs. Applying it must not bounce it
    // back, so one broadcast is skipped and the flag cleared.
    if (fromRemote.current) {
      fromRemote.current = false;
      return;
    }

    sendSpec(sharedSpec);
  }, [room, sendSpec, sharedSpec]);

  const startRoom = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set("room", newRoomCode());
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const leaveRoom = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("room");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
        caliper,
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
      selectedCar, total, color, finish, wheelType, wheelSize, caliper, stance,
      spoilerType, exhaustType, headlightType, underglow, wrapMode,
      wrapColour, tintLevel
    ]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">

      <CarList
        selected={selectedCar}
        onSelect={(car) => {
          if (car.id !== selectedCar.id) sound.clunk();
          selectCar(car);
        }}
      />

      {/* VIEWPORT */}
      <div className="relative min-h-[45vh] flex-1">
        <CarViewer
          car={selectedCar}
          color={color}
          paint={paint}
          wheelType={shown.wheelType}
          spoilerType={shown.spoilerType}
          wheelSize={shown.wheelSize}
          caliper={shown.caliper}
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
                onClick={() => {
                  if (option.id !== stageId) sound.whoosh();
                  setStageId(option.id);
                }}
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

          {/* REV. The whole point of the engine data: press it and you hear
              what this car actually has, not a generic noise. */}
          <button
            type="button"
            onClick={() =>
              sound.rev(selectedCar.model, engine, {
                loudness: EXHAUST_LOUDNESS[exhaustType] ?? 1
              })
            }
            disabled={quiet}
            title={`${selectedCar.name} — ${engine.label}`}
            className={[
              "flex w-full items-center justify-between gap-3 px-3 py-2.5 transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "bg-signal text-ink hover:brightness-110 active:brightness-95"
            ].join(" ")}
          >
            <span className="text-[11px] font-semibold tracking-widest uppercase">Rev</span>
            <span className="readout text-[9px] opacity-70">{engine.label}</span>
          </button>

          <button
            type="button"
            onClick={toggleEngine}
            disabled={quiet}
            title={quiet ? "Turn sound on first" : engineOn ? "Stop the engine" : "Start the engine"}
            aria-pressed={engineOn}
            className={[
              "flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              engineOn ? "bg-signal text-ink" : "bg-ink/80 text-fog hover:text-chalk"
            ].join(" ")}
          >
            <span
              className={[
                "block h-2 w-2 rounded-full",
                engineOn ? "animate-pulse bg-ink" : "bg-current"
              ].join(" ")}
            />
            {engineOn ? "Running" : "Ignition"}
          </button>

          <button
            type="button"
            onClick={toggleSound}
            title={quiet ? "Sound off" : "Sound on"}
            aria-pressed={!quiet}
            className={[
              "flex items-center gap-2 px-3 py-2 text-[10px] tracking-widest uppercase transition-colors",
              quiet
                ? "bg-ink/80 text-fog hover:text-chalk"
                : "bg-ink/80 text-signal hover:text-chalk"
            ].join(" ")}
          >
            {/* Three bars that fall flat when muted, rather than an icon font */}
            <span className="flex h-3 items-end gap-[2px]">
              {[0.4, 1, 0.65].map((height, index) => (
                <span
                  key={index}
                  className="w-[2px] bg-current transition-all duration-200"
                  style={{ height: quiet ? "2px" : `${height * 12}px` }}
                />
              ))}
            </span>
            {quiet ? "Muted" : "Sound"}
          </button>

          <div className="flex gap-px bg-line-soft">
            {CAMERA_VIEWS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (preset.id !== view) sound.whoosh();
                  setView(preset.id);
                }}
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
              <p className="label">Drag to orbit · scroll to zoom · right-drag to pan</p>
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
        setWheelType={withSound(setWheelType, sound.clunk)}
        spoilerType={spoilerType}
        setSpoilerType={withSound(setSpoilerType, sound.clunk)}
        wheelSize={wheelSize}
        setWheelSize={withSound(setWheelSize, sound.tick)}
        caliper={caliper}
        setCaliper={withSound(setCaliper, sound.tick)}
        stance={stance}
        setStance={withSound(setStance, sound.clunk)}
        exhaustType={exhaustType}
        setExhaustType={withSound(setExhaustType, (type) => {
          if (type === "stock") sound.tick();
          else sound.rev(selectedCar.model, engine, { loudness: EXHAUST_LOUDNESS[type] ?? 1 });
        })}
        headlightType={headlightType}
        setHeadlightType={withSound(setHeadlightType, sound.tick)}
        underglow={underglow}
        setUnderglow={withSound(setUnderglow, (value) =>
          value === "off" ? sound.tick() : sound.neon()
        )}
        wrapMode={wrapMode}
        setWrapMode={withSound(setWrapMode, sound.tick)}
        wrapColour={wrapColour}
        setWrapColour={setWrapColour}
        tintLevel={tintLevel}
        setTintLevel={withSound(setTintLevel, sound.tick)}
        total={total}
        buildPayload={buildPayload}
        live={live}
        room={room}
        startRoom={startRoom}
        leaveRoom={leaveRoom}
        onSaved={(code) => {
          sound.launch(selectedCar.model, engine);
          setSearchParams({ build: code }, { replace: true });
        }}
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
