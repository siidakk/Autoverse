// Accessory catalogue. Prices are in rupees, matching the rest of the build
// summary.

export const wheelOptions = [
  { value: "stock", label: "Stock", note: "As the car came", price: 0 },
  { value: "sport", label: "Sport", note: "10 spoke, low profile", price: 5000 },
  { value: "classic", label: "Classic", note: "Steel with hubcap", price: 3000 }
];

export const spoilerOptions = [
  { value: "stock", label: "None", note: "Factory boot lid", price: 0 },
  { value: "sport", label: "Ducktail", note: "Lip on the deck", price: 4000 },
  { value: "racing", label: "GT Wing", note: "Raised aerofoil", price: 7000 }
];

// Plus-sizing keeps the tyre's overall diameter and trades sidewall for rim,
// which is what fitting bigger alloys actually does.
export const wheelSizes = [
  { value: 0, label: "−1\"", note: "Taller sidewall", price: 0 },
  { value: 1, label: "Stock", note: "Standard fitment", price: 0 },
  { value: 2, label: "+1\"", note: "Bigger rim", price: 2500 },
  { value: 3, label: "+2\"", note: "Stretched look", price: 4500 }
];

// Brake calipers. Painting them is one of the cheapest things anyone actually
// does to a car, and it is the one modification you can see through the spokes
// of the wheels already fitted.
export const caliperColours = [
  { value: "#c0242c", label: "Red", note: "The obvious one", price: 0 },
  { value: "#1f2226", label: "Black", note: "Factory, hides brake dust", price: 0 },
  { value: "#d8a520", label: "Gold", note: "Track day", price: 1500 },
  { value: "#2f6fd0", label: "Blue", note: "Cool against silver", price: 1500 },
  { value: "#cbd2d8", label: "Silver", note: "Standard cast finish", price: 0 }
];

// Ride height as a fraction of how far the body can drop before it meets the
// road, so every car lowers by an amount that suits its own proportions.
export const stanceLevels = [
  { value: 0, label: "Stock", note: "Factory height", price: 0 },
  { value: 0.45, label: "Lowered", note: "Springs", price: 6000 },
  { value: 0.8, label: "Slammed", note: "Coilovers", price: 11000 }
];

export const exhaustOptions = [
  { value: "stock", label: "Stock", note: "Factory pipe", price: 0 },
  { value: "twin", label: "Twin", note: "Chrome pair", price: 4500 },
  { value: "quad", label: "Quad", note: "Four tips", price: 8000 },
  { value: "centre", label: "Centre exit", note: "Burnt titanium", price: 9500 },
  { value: "carbon", label: "Carbon", note: "Wide carbon tips", price: 12000 }
];

export const headlightOptions = [
  { value: "stock", label: "Stock", note: "As fitted", price: 0 },
  { value: "halogen", label: "Halogen", note: "Warm, yellow", price: 2000 },
  { value: "xenon", label: "Xenon", note: "Cool white", price: 6500 },
  { value: "laser", label: "Laser", note: "Blue white, brightest", price: 14000 }
];

export const underglowOptions = [
  { value: "off", label: "Off", note: "No underglow", price: 0, colour: null },
  { value: "ice", label: "Ice", note: "Cold blue", price: 5500, colour: "#5bc8ff" },
  { value: "toxic", label: "Toxic", note: "Acid green", price: 5500, colour: "#8bff4d" },
  { value: "ember", label: "Ember", note: "Deep orange", price: 5500, colour: "#ff6a1f" },
  { value: "violet", label: "Violet", note: "Ultraviolet", price: 6500, colour: "#b06bff" },
  { value: "rose", label: "Rose", note: "Hot pink", price: 6500, colour: "#ff3d8b" }
];

export const wrapOptions = [
  { value: "none", label: "None", note: "Body colour only", price: 0 },
  { value: "stripes", label: "Racing stripes", note: "Twin, nose to tail", price: 7500 },
  { value: "roof", label: "Roof wrap", note: "Contrast roof", price: 5000 },
  { value: "twoTone", label: "Two tone", note: "Split at the waist", price: 9000 },
  { value: "split", label: "Half and half", note: "Front and rear", price: 8500 }
];

// Wrap colours are the ones people actually use for contrast panels.
export const wrapColours = [
  "#0c0d0f",
  "#f4f6f8",
  "#c0242c",
  "#1b4fd8",
  "#c8a227",
  "#2b2f36"
];

// Visible light transmission, the way tint is actually sold. A null opacity
// means leave the glazing exactly as the model shipped it.
export const tintOptions = [
  { value: "clear", label: "Clear", note: "Factory glass", price: 0, opacity: null, colour: null },
  { value: "light", label: "50%", note: "Light smoke", price: 2500, opacity: 0.5, colour: "#7d8894" },
  { value: "dark", label: "20%", note: "Dark smoke", price: 3500, opacity: 0.72, colour: "#33383f" },
  { value: "limo", label: "5%", note: "Limo black", price: 4500, opacity: 0.9, colour: "#141619" }
];

// Decals are charged per sticker, so the price here is what each one costs.
export const decalOptions = [
  { value: "roundel", label: "Race number", note: "Numbered roundel", price: 900 },
  { value: "stripe", label: "Flag stripe", note: "Three bar stripe", price: 700 },
  { value: "flame", label: "Flame", note: "Down the flank", price: 1200 },
  { value: "star", label: "Star", note: "Single star", price: 600 }
];

export const optionBy = (options, value) =>
  options.find((option) => option.value === value) ?? options[0];

export const colourOf = (options, value) =>
  options.find((option) => option.value === value)?.colour ?? null;

export const priceOf = (options, value) =>
  options.find((option) => option.value === value)?.price ?? 0;

export const formatRupees = (value) => `₹${value.toLocaleString("en-IN")}`;
