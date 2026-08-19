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

  material.userData.wrap = material.userData.wrap ?? {};
  const store = material.userData.wrap;

  const uniforms = {
    uWrapMode: { value: WRAP_MODES[mode] ?? 0 },
    uWrapColour: { value: new THREE.Color(colour) },
    uLateral: { value: AXIS_VECTORS[widthAxis].clone() },
    uLongitudinal: { value: AXIS_VECTORS[lengthAxis].clone() },
    uCarLength: { value: carLength },
    uCarHeight: { value: carHeight },
    uGroundY: { value: groundY }
  };

  // Already patched: just refresh the values so switching wraps is cheap.
  if (store.uniforms) {
    store.uniforms.uWrapMode.value = uniforms.uWrapMode.value;
    store.uniforms.uWrapColour.value.set(colour);
    store.uniforms.uLateral.value.copy(uniforms.uLateral.value);
    store.uniforms.uLongitudinal.value.copy(uniforms.uLongitudinal.value);
    store.uniforms.uCarLength.value = carLength;
    store.uniforms.uCarHeight.value = carHeight;
    store.uniforms.uGroundY.value = groundY;
    return;
  }

  store.uniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWrapPos;"
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvWrapPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
      );

    shader.fragmentShader = shader.fragmentShader
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
            float half = uCarLength * 0.045;
            float gap = uCarLength * 0.055;
            covered = 1.0 - step(half, abs(abs(lateral) - gap));
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
  };

  material.customProgramCacheKey = () => `wrap-${mode}`;
  material.needsUpdate = true;
}
