import { useMemo } from "react";
import * as THREE from "three";
import { DecalGeometry } from "three-stdlib";

// Decals are projected onto whatever panel was clicked, which works on these
// models even though most of them have no usable UVs: the projection makes its
// own. Each one is anchored in the panel's own space, so it stays put when the
// car is lowered or a different car is scaled to fit.

const DESIGNS = {
  roundel: (context, size) => {
    context.fillStyle = "#f4f6f8";
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#0c0d0f";
    context.lineWidth = size * 0.05;
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = "#0c0d0f";
    context.font = `bold ${size * 0.5}px "IBM Plex Mono", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("07", size / 2, size * 0.54);
  },

  stripe: (context, size) => {
    context.fillStyle = "#c0242c";
    context.fillRect(0, size * 0.3, size, size * 0.16);
    context.fillStyle = "#f4f6f8";
    context.fillRect(0, size * 0.5, size, size * 0.08);
    context.fillStyle = "#0c0d0f";
    context.fillRect(0, size * 0.62, size, size * 0.16);
  },

  flame: (context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#ff7a1a");
    gradient.addColorStop(0.6, "#c0242c");
    gradient.addColorStop(1, "#6a1208");

    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(size * 0.1, size * 0.75);
    context.quadraticCurveTo(size * 0.3, size * 0.2, size * 0.55, size * 0.45);
    context.quadraticCurveTo(size * 0.6, size * 0.15, size * 0.85, size * 0.35);
    context.quadraticCurveTo(size * 0.75, size * 0.7, size * 0.1, size * 0.75);
    context.fill();
  },

  star: (context, size) => {
    context.fillStyle = "#f4f6f8";
    context.beginPath();

    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? size * 0.42 : size * 0.18;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = size / 2 + Math.cos(angle) * radius;
      const y = size / 2 + Math.sin(angle) * radius;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    context.closePath();
    context.fill();
  }
};

function makeTexture(design) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  DESIGNS[design]?.(context, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Decal({ decal, scene }) {
  const built = useMemo(() => {
    const target = scene.getObjectByProperty("uuid", decal.uuid);
    if (!target?.isMesh) return null;

    scene.updateWorldMatrix(true, true);

    // The anchor was stored in the panel's own space, so it follows the car.
    const position = new THREE.Vector3(...decal.anchor);
    target.localToWorld(position);

    const normal = new THREE.Vector3(...decal.normal)
      .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(target.matrixWorld))
      .normalize();

    // Face the projector along the panel's normal, then roll it.
    const orientation = new THREE.Object3D();
    orientation.position.copy(position);
    orientation.lookAt(position.clone().add(normal));
    orientation.rotateZ(decal.rotation ?? 0);

    const size = new THREE.Vector3(decal.size, decal.size, decal.size * 2);

    try {
      return {
        geometry: new DecalGeometry(target, position, orientation.rotation, size),
        texture: makeTexture(decal.design)
      };
    } catch {
      return null;
    }
  }, [decal, scene]);

  if (!built) return null;

  return (
    <mesh geometry={built.geometry}>
      <meshStandardMaterial
        map={built.texture}
        transparent
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-6}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

export default function Decals({ decals, scene, revision }) {
  if (!scene || !decals?.length) return null;

  return (
    <group>
      {decals.map((decal) => (
        // The revision is part of the key so lowering the car or swapping the
        // model rebuilds the projection instead of leaving it behind.
        <Decal
          key={`${decal.id}-${revision}`}
          decal={decal}
          scene={scene}
        />
      ))}
    </group>
  );
}
