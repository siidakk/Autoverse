import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import Wheels from "./accessories/Wheels";
import Spoiler from "./accessories/Spoiler";
import Exhaust from "./accessories/Exhaust";
import Headlights from "./accessories/Headlights";
import Underglow from "./accessories/Underglow";
import { inspectCar, detectWheels, detectLights } from "../utils/carGeometry";
import { looksLikeTrim } from "../utils/lightDetection";
import { overrideFor } from "../data/carParts";
import { applyWrap, isWrapped } from "../utils/wrapShader";

// Every model arrives at a different scale and sitting at a different height,
// so each one is normalised to the same length and stood on the floor.
const TARGET_LENGTH = 4.6;

export default function CarModel({
  car,
  color,
  paint,
  wheelType,
  spoilerType,
  wheelSize = 1,
  caliper = "#c0242c",
  stance = 0,
  exhaustType = "stock",
  headlightType = "stock",
  underglow = null,
  wrap = { mode: "none", colour: "#111111" },
  tint = { colour: "#dfe6ee", opacity: 0.35 },
  onPlaceDecal = null,
  // Handed the finished group -- body, wheels, spoiler, exhaust, the lot -- so
  // AR can take what is actually on screen rather than reloading the bare file
  // and quietly leaving every fitted part behind.
  stageRef = null
}) {

  const { scene } = useGLTF(car.model);

  // Held separately because the effect below shadows `car` with the
  // measurement, and the overrides are keyed by the model path.
  const modelPath = car.model;

  // Which scene's materials have already been cloned for this configurator.
  const clonedFor = useRef(null);

  const measurements = useMemo(() => {
    const measured = inspectCar(scene);
    if (!measured) return null;

    return {
      car: measured,
      wheels: detectWheels(measured),
      lights: detectLights(measured)
    };
  }, [scene]);

  const fit = useMemo(() => {
    if (!measurements) return { scale: 1, position: [0, 0, 0] };

    const { box, center, length, widthAxis, midWidth } = measurements.car;
    const scale = TARGET_LENGTH / length;

    // Centred on the panels sideways and on the bounding box lengthways, then
    // stood on the floor.
    const offset = { x: -center.x, y: -box.min.y, z: -center.z };
    offset[widthAxis] = -midWidth;

    return {
      scale,
      position: [offset.x * scale, offset.y * scale, offset.z * scale]
    };
  }, [measurements]);

  const detected = measurements?.wheels ?? null;

  // Lowering drops the body towards the wheels. How far it can go is set by the
  // bodywork itself: whatever sits lowest once the wheels are discounted, less
  // a little clearance, so no car is ever pushed through the floor.
  const drop = useMemo(() => {
    if (!measurements || !detected || !stance) return 0;

    const wheelMeshes = new Set(detected.meshes);
    let bodyFloor = Infinity;

    for (const part of measurements.car.parts) {
      if (wheelMeshes.has(part.ref)) continue;
      bodyFloor = Math.min(bodyFloor, part.min.y);
    }

    if (!Number.isFinite(bodyFloor)) return 0;

    const clearance = bodyFloor - measurements.car.box.min.y;
    return Math.max(clearance - measurements.car.height * 0.012, 0) * stance;
  }, [measurements, detected, stance]);

  // The model's own wheels are swapped out for the custom ones, and are put
  // back when the stock option is selected.
  useEffect(() => {
    if (!detected) return;

    const hidden = wheelType !== "stock";
    detected.meshes.forEach((mesh) => {
      mesh.visible = !hidden;
    });

    return () => {
      detected.meshes.forEach((mesh) => {
        mesh.visible = true;
      });
    };
  }, [detected, wheelType]);

  useEffect(() => {
    if (!scene || !measurements) return;

    // Tyres and rims keep their own materials instead of taking body paint.
    const wheelMeshes = new Set(detected?.meshes ?? []);

    // Nor do the light units. Painting a car used to turn its headlights and
    // tail lights the body colour, which is the single thing that gives away
    // that none of this is real. They are found by measurement, because the
    // material names in these models cannot be trusted to say what anything is.
    const lightMeshes = measurements.lights?.meshes ?? new Set();
    const car = measurements.car;

    const freshScene = clonedFor.current !== scene;
    clonedFor.current = scene;

    scene.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;

      if (wheelMeshes.has(child)) return;

      // Cloned once per model so this car's paint does not leak into the same
      // model elsewhere. Re-cloning on every change would spawn a fresh shader
      // program per frame, which is what was tearing down the GL context.
      if (freshScene) {
        child.material = child.material.clone();

        // How the panel arrived, so tinting can be judged against the original
        // and undone rather than guessed at.
        child.material.userData.baseOpacity = child.material.opacity;
        child.material.userData.baseTransparent = child.material.transparent;
      }

      const material = child.material;
      const base = material.userData;

      // Glazing has to be genuinely see-through to count. Plenty of exporters
      // set the transparent flag on solid paint, and trusting it turned whole
      // cars into ghosts.
      const named = /glass|window|windscreen|windshield|glazing/i.test(
        `${child.name} ${material.name ?? ""}`
      );

      const translucent =
        (base.baseTransparent === true && base.baseOpacity < 0.9) ||
        (material.transmission ?? 0) > 0.1;

      if (named || translucent) {
        // Clear puts the glass back exactly as the model had it.
        if (tint.opacity === null) {
          material.transparent = base.baseTransparent;
          material.opacity = base.baseOpacity;
        } else {
          material.transparent = true;
          material.opacity = Math.max(base.baseOpacity, tint.opacity);
          material.color = new THREE.Color(tint.colour);
        }

        material.roughness = 0.06;
        material.metalness = 0;
        material.needsUpdate = true;
        return;
      }

      // Lamps, chrome, badges and the cabin keep what they came with. The
      // measurement finds most lamps; where a model does bother to name a part,
      // that is taken as well. Each mesh already has its own cloned material
      // above, so skipping one works even where the model shared a material
      // between a lamp and a panel.
      //
      // data/carParts.js can overrule either way, for the models where the
      // measurement cannot be right because the lamp is not separate geometry.
      const forced = overrideFor(modelPath, child.name, material.name);

      const keepStock =
        forced === null
          ? lightMeshes.has(child) ||
            looksLikeTrim(child.name) ||
            looksLikeTrim(material.name)
          : forced;

      if (keepStock) return;

      // BASE COLOR
      material.color = new THREE.Color(color);

      // PAINT SYSTEM
      material.metalness = paint.metalness;
      material.roughness = paint.roughness;

      // CLEARCOAT (if supported)
      if ("clearcoat" in material) {
        material.clearcoat = paint.clearcoat;
        material.clearcoatRoughness = 0.1;
      }

      // Left alone unless a wrap is actually chosen. Patching a material's
      // shader is the one thing here that can stop a panel drawing at all, so
      // the default car runs on exactly the materials the model shipped with.
      if (wrap.mode !== "none" || isWrapped(material)) {
        applyWrap(material, {
          mode: wrap.mode,
          colour: wrap.colour,
          lengthAxis: car.lengthAxis,
          widthAxis: car.widthAxis,
          carLength: car.length * fit.scale,
          carHeight: car.height * fit.scale,
          groundY: 0
        });
      }

      material.needsUpdate = true;
    });

  }, [scene, color, paint, detected, measurements, fit, drop, wrap, tint, modelPath]);

  // A way to see what the classifier decided, so the overrides in
  // data/carParts.js can be written against the real names instead of guessed
  // at. Called from the browser console as __autoverseParts().
  useEffect(() => {
    if (!measurements) return;

    const { car: measured, lights } = measurements;
    const wheelMeshes = new Set(detected?.meshes ?? []);

    window.__autoverseParts = () => {
      const rows = measurements.car.parts.map((part) => {
        const mesh = part.ref;
        const materialName = mesh.material?.name ?? "";
        const forced = overrideFor(modelPath, mesh.name, materialName);

        const stock =
          forced === null
            ? lights.meshes.has(mesh) ||
              looksLikeTrim(mesh.name) ||
              looksLikeTrim(materialName)
            : forced;

        return {
          mesh: mesh.name || "(unnamed)",
          material: materialName || "(unnamed)",
          takes: wheelMeshes.has(mesh) ? "wheel" : stock ? "stock" : "paint",
          alongCar: +((part.center[measured.lengthAxis] - measured.box.min[measured.lengthAxis]) / measured.length).toFixed(2),
          upCar: +((part.center.y - measured.box.min.y) / measured.height).toFixed(2),
          offCentre: +((part.center[measured.widthAxis] - measured.midWidth) / measured.width).toFixed(2),
          width: +(part.size[measured.widthAxis] / measured.width).toFixed(2),
          tall: +(part.size.y / measured.height).toFixed(2),
          deep: +(part.size[measured.lengthAxis] / measured.length).toFixed(2)
        };
      });

      console.table(rows);
      console.log(
        `${modelPath}: ${rows.filter((r) => r.takes === "paint").length} painted, ` +
        `${rows.filter((r) => r.takes === "stock").length} left stock, ` +
        `${rows.filter((r) => r.takes === "wheel").length} wheels`
      );
      return rows;
    };
  }, [measurements, detected, modelPath]);

  // Placing a decal records where on the panel it landed, in that panel's own
  // space, so it travels with the car rather than hanging in the air.
  const handlePlace = (event) => {
    if (!onPlaceDecal || !event.face) return;

    event.stopPropagation();

    const target = event.object;
    const anchor = target.worldToLocal(event.point.clone());

    onPlaceDecal({
      uuid: target.uuid,
      anchor: [anchor.x, anchor.y, anchor.z],
      normal: [event.face.normal.x, event.face.normal.y, event.face.normal.z]
    });
  };

  return (
    <group ref={stageRef} scale={fit.scale} position={fit.position}>

      {/* The body moves, the wheels stay on the road */}
      <group
        position={[0, -drop, 0]}
        onClick={onPlaceDecal ? handlePlace : undefined}
      >
        <primitive object={scene} />

        <Spoiler
          type={spoilerType}
          car={measurements?.car}
          scene={scene}
          track={detected?.track}
        />

        <Exhaust type={exhaustType} car={measurements?.car} />

        <Headlights type={headlightType} car={measurements?.car} />
      </group>

      {/* Lighting under the car stays with the road, not the lowered body */}
      <Underglow
        colour={underglow}
        car={measurements?.car}
        wheels={detected}
      />

      <Wheels
        type={wheelType}
        wheels={detected?.wheels}
        axleAxis={detected?.axleAxis}
        sizeStep={wheelSize}
        caliper={caliper}
      />
    </group>
  );
}
