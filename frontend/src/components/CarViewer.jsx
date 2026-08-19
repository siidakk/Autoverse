import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  MeshReflectorMaterial
} from "@react-three/drei";
import CarModel from "./CarModel";
import { CAMERA_VIEWS } from "../data/views";

// Studio softboxes built in code rather than an HDR file, so the showroom needs
// no extra assets and still gives the paint something to reflect.
function ShowroomLighting() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#0a0b0e"]} />

      {/* CEILING STRIPS */}
      {[-4, -1.5, 1.5, 4].map((x) => (
        <Lightformer
          key={x}
          intensity={2.4}
          position={[x, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.2, 12, 1]}
        />
      ))}

      {/* SIDE FILL */}
      <Lightformer
        intensity={3}
        position={[-8, 3, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[8, 6, 1]}
      />
      <Lightformer
        intensity={2}
        position={[8, 3, 2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[8, 6, 1]}
      />

      {/* RIM LIGHT FROM BEHIND */}
      <Lightformer
        intensity={2.5}
        position={[0, 2, -8]}
        rotation={[0, 0, 0]}
        scale={[12, 5, 1]}
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
  view
}) {
  const controls = useRef(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [5.2, 1.9, 6.4], fov: 40 }}
    >
      <color attach="background" args={["#0a0b0e"]} />
      <fog attach="fog" args={["#0a0b0e", 18, 42]} />

      <ambientLight intensity={0.35} />

      <spotLight
        position={[6, 9, 6]}
        angle={0.5}
        penumbra={0.8}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-6, 6, -4]} intensity={0.7} />

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
        />

        <ShowroomLighting />
      </Suspense>

      <CameraRig view={view} controls={controls} />

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
