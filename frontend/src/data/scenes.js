// The room the car sits in. Each scene sets what the paint reflects, what the
// floor does with it, and how the whole thing is lit, because those three
// together are what actually change the look of a car.
//
// `light` marks the scenes bright enough that the readouts over the viewport
// have to switch to dark text.

export const SCENES = [
  {
    id: "studio",
    label: "Studio",
    note: "Neutral grey, reflective floor",
    background: "#0a0b0e",
    fog: ["#0a0b0e", 18, 42],
    ambient: 0.7,
    key: { position: [6, 9, 6], intensity: 40, colour: "#ffffff" },
    fill: { position: [-6, 6, -4], intensity: 1.4, colour: "#ffffff" },
    rim: { position: [4, 3, -6], intensity: 0.8, colour: "#ffffff" },
    room: "#5c626b",
    panel: "#ffffff",
    panelIntensity: 5,
    floor: {
      colour: "#15171b",
      metalness: 0.65,
      roughness: 0.85,
      mirror: 0.45,
      blur: [400, 100]
    }
  },
  {
    id: "showroom",
    label: "Showroom",
    note: "White cyclorama, product lighting",
    background: "#e6e9ed",
    fog: ["#e6e9ed", 26, 60],
    ambient: 1.6,
    key: { position: [6, 10, 6], intensity: 55, colour: "#ffffff" },
    fill: { position: [-7, 6, -3], intensity: 2.4, colour: "#ffffff" },
    rim: { position: [3, 4, -7], intensity: 1.6, colour: "#ffffff" },
    room: "#ffffff",
    panel: "#ffffff",
    panelIntensity: 6,
    light: true,
    floor: {
      colour: "#c9ced5",
      metalness: 0.3,
      roughness: 0.7,
      mirror: 0.35,
      blur: [300, 90]
    }
  },
  {
    id: "night",
    label: "Night",
    note: "Cold rim light, wet asphalt",
    background: "#04050a",
    fog: ["#04050a", 14, 34],
    ambient: 0.25,
    key: { position: [5, 8, 4], intensity: 22, colour: "#cfe0ff" },
    fill: { position: [-7, 4, -5], intensity: 1.6, colour: "#4f7dff" },
    rim: { position: [3, 2, -7], intensity: 2.2, colour: "#7b5bff" },
    room: "#1a2030",
    panel: "#9fc0ff",
    panelIntensity: 4,
    floor: {
      colour: "#080a10",
      metalness: 0.9,
      roughness: 0.35,
      mirror: 0.85,
      blur: [200, 60]
    }
  },
  {
    id: "sunset",
    label: "Sunset",
    note: "Low warm key, long shadows",
    background: "#1a1014",
    fog: ["#241318", 16, 40],
    ambient: 0.5,
    key: { position: [8, 3.5, 4], intensity: 45, colour: "#ffb066" },
    fill: { position: [-6, 5, -4], intensity: 1.2, colour: "#7a5cff" },
    rim: { position: [-3, 2, -7], intensity: 2, colour: "#ff7a3d" },
    room: "#6b4436",
    panel: "#ffc48a",
    panelIntensity: 5,
    floor: {
      colour: "#211519",
      metalness: 0.55,
      roughness: 0.75,
      mirror: 0.5,
      blur: [350, 90]
    }
  },
  {
    id: "concrete",
    label: "Concrete",
    note: "Industrial, matte floor",
    background: "#16181b",
    fog: ["#16181b", 20, 46],
    ambient: 0.9,
    key: { position: [5, 8, 5], intensity: 32, colour: "#f2f4f7" },
    fill: { position: [-6, 5, -4], intensity: 1.5, colour: "#c8d2dd" },
    rim: { position: [4, 3, -6], intensity: 0.9, colour: "#ffffff" },
    room: "#7b828c",
    panel: "#ffffff",
    panelIntensity: 4.5,
    floor: {
      colour: "#31353a",
      metalness: 0.15,
      roughness: 0.95,
      mirror: 0.12,
      blur: [500, 140]
    }
  }
];

export const sceneById = (id) =>
  SCENES.find((scene) => scene.id === id) ?? SCENES[0];
