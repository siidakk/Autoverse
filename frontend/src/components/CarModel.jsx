import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";

export default function CarModel({ car, color, paint }) {

  const { scene } = useGLTF(car.model);

  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh) {

        child.material = child.material.clone();

        // BASE COLOR
        child.material.color = new THREE.Color(color);

        // PAINT SYSTEM
        child.material.metalness = paint.metalness;
        child.material.roughness = paint.roughness;

        // CLEARCOAT (if supported)
        if ("clearcoat" in child.material) {
          child.material.clearcoat = paint.clearcoat;
          child.material.clearcoatRoughness = 0.1;
        }

        child.material.needsUpdate = true;
      }
    });

  }, [scene, color, paint]);

  return (
    <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
  );
}