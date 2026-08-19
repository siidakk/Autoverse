import { Suspense, useEffect, useRef } from "react";
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

// Studio softboxes built in code rather than an HDR file, so the showroom needs
// no extra assets and still gives the paint something to reflect.
//
// The room this builds is what the car reflects, so it cannot be as dark as the
// page around it. A black room reflected in the paint is a black car, whatever
// colour was picked.
function ShowroomLighting() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#5c626b"]} />

      {/* CEILING STRIPS */}
      {[-4, -1.5, 1.5, 4].map((x) => (
        <Lightformer
          key={x}
          intensity={5}
          position={[x, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[2, 12, 1]}
        />
      ))}

      {/* SIDE FILL */}
      <Lightformer
        intensity={4}
        position={[-8, 3, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[10, 8, 1]}
      />
      <Lightformer
        intensity={3}
        position={[8, 3, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[10, 8, 1]}
      />

      {/* RIM LIGHT FROM BEHIND */}
      <Lightformer
        intensity={3.5}
        position={[0, 2, -8]}
        scale={[14, 6, 1]}
      />

      {/* BOUNCE OFF THE FLOOR, WHICH KEEPS THE SILLS OFF BLACK */}
      <Lightformer
        intensity={1.4}
        position={[0, -3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[14, 14, 1]}
      />
    </Environment>
  );
}

function ShowroomFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={0.45}
        blur={[400, 100]}
        mixBlur={1.2}
        mixStrength={2.2}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#15171b"
        metalness={0.65}
        roughness={0.85}
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

// Development only: publishes what the renderer is actually doing, so a blank
// viewport can be told apart from a car that is off camera or unlit.
function RenderProbe() {
  const { camera, gl, scene } = useThree();

  useFrame(() => {
    if (!import.meta.env.DEV) return;

    window.__render = {
      camera: [camera.position.x, camera.position.y, camera.position.z],
      triangles: gl.info.render.triangles,
      calls: gl.info.render.calls,
      programs: gl.info.programs?.length ?? 0,
      hasEnvironment: !!scene.environment,
      toneMappingExposure: gl.toneMappingExposure
    };
  });

  return null;
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
  stance,
  exhaustType,
  headlightType,
  underglow,
  wrap,
  tint,
  decals,
  onPlaceDecal,
  view
}) {
  const controls = useRef(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5.2, 1.9, 6.4], fov: 40 }}
      // Keeping the drawing buffer in development is what makes it possible to
      // read back what was actually drawn and confirm the car is on screen.
      gl={{ preserveDrawingBuffer: import.meta.env.DEV }}
    >
      <color attach="background" args={["#0a0b0e"]} />
      <fog attach="fog" args={["#0a0b0e", 18, 42]} />

      <ambientLight intensity={0.7} />

      <spotLight
        position={[6, 9, 6]}
        angle={0.6}
        penumbra={0.8}
        intensity={40}
        distance={40}
        decay={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-6, 6, -4]} intensity={1.4} />
      <directionalLight position={[4, 3, -6]} intensity={0.8} />

      <Suspense fallback={null}>
        <CarModel
          car={car}
          color={color}
          paint={paint}
          wheelType={wheelType}
          spoilerType={spoilerType}
          wheelSize={wheelSize}
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

        <ShowroomLighting />
      </Suspense>

      <CameraRig view={view} controls={controls} />

      <RenderProbe />

      <ShowroomFloor />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.7}
        scale={16}
        blur={2.4}
        far={4}
        resolution={1024}
        color="#000000"
      />

      <OrbitControls
        ref={controls}
        enablePan
        screenSpacePanning
        panSpeed={0.6}
        minDistance={3.5}
        maxDistance={16}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.7, 0]}
      />
    </Canvas>
  );
}
