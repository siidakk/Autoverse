// The room the car sits in. What the paint reflects is most of what a car
// looks like, so these are real captured environments rather than a handful of
// light panels pretending to be one. Only the studio is built by hand, because
// a seamless grey cyclorama is the one "room" that has no photograph.
//
// The maps ship as base64 inside @pmndrs/assets, so nothing is fetched from a
// CDN at runtime. They are imported on demand so only the chosen one loads.
//
// `light` marks scenes bright enough that the readouts over the viewport have
// to switch to dark text.

const hdriLoaders = {
  city: () => import("@pmndrs/assets/hdri/city.exr"),
  sunset: () => import("@pmndrs/assets/hdri/sunset.exr"),
  night: () => import("@pmndrs/assets/hdri/night.exr"),
  warehouse: () => import("@pmndrs/assets/hdri/warehouse.exr")
};

export const loadHdri = async (name) => {
  const loader = hdriLoaders[name];
  if (!loader) return null;

  const module = await loader();
  return module.default;
};

export const SCENES = [
  {
    id: "studio",
    label: "Studio",
    note: "Neutral cyclorama, reflective floor",
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
    id: "city",
    label: "City",
    note: "Urban daylight, open sky",
    hdri: "city",
    background: "#9aa6b4",
    light: true,
    ambient: 0.25,
    environmentIntensity: 1,
    key: { position: [7, 10, 5], intensity: 22, colour: "#fff6e8" },
    ground: { height: 6, radius: 55, scale: 70 }
  },
  {
    id: "sunset",
    label: "Sunset",
    note: "Low sun, long shadows",
    hdri: "sunset",
    background: "#42332e",
    ambient: 0.2,
    environmentIntensity: 1.15,
    key: { position: [9, 3, 3], intensity: 26, colour: "#ffb066" },
    ground: { height: 5, radius: 50, scale: 65 }
  },
  {
    id: "night",
    label: "Night",
    note: "City lights after dark",
    hdri: "night",
    background: "#05070c",
    ambient: 0.12,
    environmentIntensity: 1.4,
    key: { position: [5, 7, 4], intensity: 10, colour: "#cfe0ff" },
    ground: { height: 5, radius: 45, scale: 60 }
  },
  {
    id: "warehouse",
    label: "Warehouse",
    note: "Industrial interior",
    hdri: "warehouse",
    background: "#2b2b2b",
    ambient: 0.2,
    environmentIntensity: 1.1,
    key: { position: [4, 8, 5], intensity: 18, colour: "#f0eee8" },
    ground: { height: 4, radius: 35, scale: 45 }
  }
];

export const sceneById = (id) =>
  SCENES.find((scene) => scene.id === id) ?? SCENES[0];
