import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { inspectCar } from "../../utils/carGeometry";
import { HERO_SEQUENCE } from "./heroSequence";

const TARGET_LENGTH = 4.6;

function TurntableCar({ model, visible, spin }) {
  const group = useRef();
  const fade = useRef(0);
  const { scene } = useGLTF(model);

  // A private copy of the model, so fading it out here can never leave the
  // configurator holding a half-transparent car.
  const car = useMemo(() => {
    const copy = scene.clone(true);

    copy.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.material = child.material.clone();
      child.material.transparent = true;
      child.material.opacity = 0;
      child.material.color = new THREE.Color("#d9dde3");
      child.material.metalness = 0.7;
      child.material.roughness = 0.22;
    });

    return copy;
  }, [scene]);

  const fit = useMemo(() => {
    const measured = inspectCar(car);
    if (!measured) return { scale: 1, position: [0, 0, 0] };

    const scale = TARGET_LENGTH / measured.length;
    const offset = {
      x: -measured.center.x,
      y: -measured.box.min.y,
      z: -measured.center.z
    };
    offset[measured.widthAxis] = -measured.midWidth;

    return {
      scale,
      position: [offset.x * scale, offset.y * scale, offset.z * scale]
    };
  }, [car]);

  useFrame((_, delta) => {
    if (spin && group.current) {
      group.current.rotation.y += delta * 0.16;
    }

    const target = visible ? 1 : 0;
    if (Math.abs(fade.current - target) < 0.002) return;

    fade.current = THREE.MathUtils.damp(fade.current, target, 4.5, delta);

    car.traverse((child) => {
      if (child.isMesh) child.material.opacity = fade.current;
    });
  });

  return (
    <group ref={group}>
      <group scale={fit.scale} position={fit.position}>
        <primitive object={car} />
      </group>
    </group>
  );
}

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#08090b"]} />
      {[-3.5, 0, 3.5].map((x) => (
        <Lightformer
          key={x}
          intensity={2.6}
          position={[x, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.4, 10, 1]}
        />
      ))}
      <Lightformer
        intensity={2.2}
        position={[-7, 2.5, 3]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[7, 5, 1]}
      />
      <Lightformer intensity={2.8} position={[0, 2, -7]} scale={[10, 4, 1]} />
    </Environment>
  );
}

export default function HeroScene({ car, visible, spin = true }) {
  // Held back until after first paint so a model download never blocks the
  // headline from rendering.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  if (!mounted) return null;

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [5.4, 1.6, 6.2], fov: 38 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <spotLight
        position={[5, 8, 5]}
        angle={0.5}
        penumbra={0.9}
        intensity={2.2}
        castShadow
      />

      <Suspense fallback={null}>
        <TurntableCar
          key={car.model}
          model={car.model}
          visible={visible}
          spin={spin}
        />
        <Studio />
      </Suspense>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.62}
        scale={14}
        blur={2.6}
        far={4}
        resolution={512}
        color="#000000"
      />
    </Canvas>
  );
}

// Only the lightest model is fetched up front; the rest are pulled in as the
// carousel reaches them.
useGLTF.preload(HERO_SEQUENCE[0].model);
