import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial,
  useGLTF
} from "@react-three/drei";
import Decals from "./accessories/Decals";
import CarModel from "./CarModel";
import { CAMERA_VIEWS } from "../data/views";
import { loadHdri } from "../data/scenes";

// Studio softboxes built in code rather than an HDR file, so the showroom needs
// no extra assets and still gives the paint something to reflect.
//
// The room this builds is what the car reflects, so it cannot be as dark as the
// page around it. A black room reflected in the paint is a black car, whatever
// colour was picked.
// A captured environment, projected onto a dome so the car stands in the scene
// rather than floating in front of a picture of it.
function CapturedEnvironment({ stage }) {
  // The map is stored with the scene it belongs to, so a slow load can never
  // hang the previous environment behind the new one.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadHdri(stage.hdri).then((url) => {
      if (!cancelled) setLoaded({ id: stage.id, url });
    });

    return () => {
      cancelled = true;
    };
  }, [stage.hdri, stage.id]);

  if (loaded?.id !== stage.id) return null;

  return (
    <Environment
      key={stage.id}
      files={loaded.url}
      background
      ground={stage.ground}
      environmentIntensity={stage.environmentIntensity ?? 1}
    />
  );
}

function ShowroomLighting({ stage }) {
  const { panel, panelIntensity } = stage;

  return (
    // Keyed on the scene so switching rebuilds the reflection map rather than
    // leaving the previous room hanging in the paint.
    <Environment key={stage.id} resolution={256} frames={1}>
      <color attach="background" args={[stage.room]} />

      {/* CEILING STRIPS */}
      {[-4, -1.5, 1.5, 4].map((x) => (
        <Lightformer
          key={x}
          color={panel}
          intensity={panelIntensity}
          position={[x, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[2, 12, 1]}
        />
      ))}

      {/* SIDE FILL */}
      <Lightformer
        color={panel}
        intensity={panelIntensity * 0.8}
        position={[-8, 3, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[10, 8, 1]}
      />
      <Lightformer
        color={panel}
        intensity={panelIntensity * 0.6}
        position={[8, 3, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[10, 8, 1]}
      />

      {/* RIM LIGHT FROM BEHIND */}
      <Lightformer
        color={stage.rim.colour}
        intensity={panelIntensity * 0.7}
        position={[0, 2, -8]}
        scale={[14, 6, 1]}
      />

      {/* BOUNCE OFF THE FLOOR, WHICH KEEPS THE SILLS OFF BLACK */}
      <Lightformer
        color={panel}
        intensity={panelIntensity * 0.28}
        position={[0, -3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[14, 14, 1]}
      />
    </Environment>
  );
}

function ShowroomFloor({ stage }) {
  const { floor } = stage;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        key={stage.id}
        resolution={1024}
        mirror={floor.mirror}
        blur={floor.blur}
        mixBlur={1.2}
        mixStrength={2.2}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color={floor.colour}
        metalness={floor.metalness}
        roughness={floor.roughness}
      />
    </mesh>
  );
}

// Decals are projected in world space, so they hang alongside the car rather
// than inside the group that scales and lowers it.
function DecalLayer({ car, decals, revision }) {
  const { scene } = useGLTF(car.model);
  return <Decals decals={decals} scene={scene} revision={revision} />;
}

// Glides the camera to a preset instead of snapping, and hands control straight
// back so the user can keep dragging.
function CameraRig({ view, controls }) {
  const { camera } = useThree();
  const target = useRef(null);

  useEffect(() => {
    const preset = CAMERA_VIEWS.find((entry) => entry.id === view);
    target.current = preset ? new THREE.Vector3(...preset.position) : null;
  }, [view]);

  useFrame((_, delta) => {
    if (!target.current) return;

    camera.position.lerp(target.current, 1 - Math.pow(0.001, delta));
    controls.current?.update();

    if (camera.position.distanceTo(target.current) < 0.02) {
      target.current = null;
    }
  });

  return null;
}

export default function CarViewer({
  car,
  color,
  paint,
  wheelType,
  spoilerType,
  wheelSize,
  caliper,
  stance,
  exhaustType,
  headlightType,
  underglow,
  wrap,
  tint,
  decals,
  onPlaceDecal,
  view,
  stage
}) {
  const controls = useRef(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5.2, 1.9, 6.4], fov: 40 }}
    >
      {/* Shown until the captured environment has loaded, and kept for good in
          the studio, which has no photograph behind it. */}
      <color attach="background" args={[stage.background]} />
      {stage.fog && <fog attach="fog" args={stage.fog} />}

      <ambientLight intensity={stage.ambient} />

      <spotLight
        position={stage.key.position}
        color={stage.key.colour}
        angle={0.6}
        penumbra={0.8}
        intensity={stage.key.intensity}
        distance={40}
        decay={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {stage.fill && (
        <directionalLight
          position={stage.fill.position}
          color={stage.fill.colour}
          intensity={stage.fill.intensity}
        />
      )}

      {stage.rim && (
        <directionalLight
          position={stage.rim.position}
          color={stage.rim.colour}
          intensity={stage.rim.intensity}
        />
      )}

      <Suspense fallback={null}>
        <CarModel
          car={car}
          color={color}
          paint={paint}
          wheelType={wheelType}
          spoilerType={spoilerType}
          wheelSize={wheelSize}
          caliper={caliper}
          stance={stance}
          exhaustType={exhaustType}
          headlightType={headlightType}
          underglow={underglow}
          wrap={wrap}
          tint={tint}
          onPlaceDecal={onPlaceDecal}
        />

        <DecalLayer
          car={car}
          decals={decals}
          revision={`${car.model}-${stance}-${wheelType}`}
        />

        {stage.hdri ? (
          <CapturedEnvironment stage={stage} />
        ) : (
          <ShowroomLighting stage={stage} />
        )}
      </Suspense>

      <CameraRig view={view} controls={controls} />

      {/* The captured scenes bring their own ground with them */}
      {!stage.hdri && <ShowroomFloor stage={stage} />}

      {/* Softer on a white floor, where a hard black pool would look wrong */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={stage.light ? 0.45 : 0.7}
        scale={16}
        blur={2.4}
        far={4}
        resolution={1024}
        color="#000000"
      />

      {/* Damping is what makes this feel like turning a car on a turntable
          rather than dragging a stiff object: the movement carries a little
          past the pointer and settles. The speeds are all below the defaults,
          because at 1:1 a small flick of the mouse spins the car right past
          the angle you wanted. */}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
        enablePan
        screenSpacePanning
        panSpeed={0.5}
        minDistance={3.2}
        maxDistance={16}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.7, 0]}
      />
    </Canvas>
  );
}
