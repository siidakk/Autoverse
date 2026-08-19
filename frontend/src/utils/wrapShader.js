import * as THREE from "three";

// Wraps are painted by a patch to the standard material rather than a texture,
// because these models have inconsistent UVs and several have none worth using.
// Every car is normalised to the same length and stood on the floor before it is
// drawn, so world coordinates can be compared against fixed thresholds and the
// same wrap lands sensibly on a hatchback and a pickup alike.

export const WRAP_MODES = {
  none: 0,
  stripes: 1,
  twoTone: 2,
  split: 3,
  roof: 4
};

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  z: new THREE.Vector3(0, 0, 1)
};

// Uniforms are held beside the material rather than on it. Material.clone()
// deep copies userData through JSON, which would flatten a Color into a plain
// object and lose every method on it.
const patched = new WeakMap();

export const isWrapped = (material) => patched.has(material);

export function applyWrap(material, options) {
  const {
    mode = "none",
    colour = "#111111",
    lengthAxis = "z",
    widthAxis = "x",
    carLength = 4.6,
    carHeight = 1.4,
    groundY = 0
  } = options;

  const existing = patched.get(material);

  // Already patched: refresh the values so switching wraps costs nothing.
  if (existing) {
    existing.uWrapMode.value = WRAP_MODES[mode] ?? 0;
    existing.uWrapColour.value.set(colour);
    existing.uLateral.value.copy(AXIS_VECTORS[widthAxis]);
    existing.uLongitudinal.value.copy(AXIS_VECTORS[lengthAxis]);
    existing.uCarLength.value = carLength;
    existing.uCarHeight.value = carHeight;
    existing.uGroundY.value = groundY;
    return;
  }

  const uniforms = {
    uWrapMode: { value: WRAP_MODES[mode] ?? 0 },
    uWrapColour: { value: new THREE.Color(colour) },
    uLateral: { value: AXIS_VECTORS[widthAxis].clone() },
    uLongitudinal: { value: AXIS_VECTORS[lengthAxis].clone() },
    uCarLength: { value: carLength },
    uCarHeight: { value: carHeight },
    uGroundY: { value: groundY }
  };

  patched.set(material, uniforms);

  material.onBeforeCompile = (shader) => {
    const vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWrapPos;"
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWrapPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );

    const fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWrapPos;
        uniform int uWrapMode;
        uniform vec3 uWrapColour;
        uniform vec3 uLateral;
        uniform vec3 uLongitudinal;
        uniform float uCarLength;
        uniform float uCarHeight;
        uniform float uGroundY;`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (uWrapMode > 0) {
          float lateral = dot(vWrapPos, uLateral);
          float along = dot(vWrapPos, uLongitudinal);
          float up = vWrapPos.y - uGroundY;
          float covered = 0.0;

          if (uWrapMode == 1) {
            // A pair of stripes over the centreline, front to back.
            // Note: "half" is a reserved word in GLSL and will not compile.
            float stripeHalf = uCarLength * 0.045;
            float stripeGap = uCarLength * 0.055;
            covered = 1.0 - step(stripeHalf, abs(abs(lateral) - stripeGap));
          } else if (uWrapMode == 2) {
            // Everything above the waistline in the second colour.
            covered = step(uCarHeight * 0.58, up);
          } else if (uWrapMode == 3) {
            // Split down the middle of the car, front half and back half.
            covered = step(0.0, along);
          } else if (uWrapMode == 4) {
            // Roof only, which is the most common wrap of the lot.
            covered = step(uCarHeight * 0.78, up);
          }

          diffuseColor.rgb = mix(diffuseColor.rgb, uWrapColour, covered);
        }`
      );

    // If any anchor failed to match, the shader would end up declaring a
    // varying the vertex stage never writes, which fails to link and takes the
    // panel off screen entirely. Better to skip the wrap than lose the car.
    const complete =
      vertexShader.includes("vWrapPos =") &&
      fragmentShader.includes("uniform int uWrapMode") &&
      fragmentShader.includes("diffuseColor.rgb = mix");

    if (!complete) {
      console.warn("AutoVerse: wrap shader anchors not found, leaving material alone");
      return;
    }

    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = vertexShader;
    shader.fragmentShader = fragmentShader;
  };

  // One key for every wrapped material: the mode is a uniform, so all of them
  // share a single compiled program rather than one per pattern.
  material.customProgramCacheKey = () => "autoverse-wrap";
  material.needsUpdate = true;
}
