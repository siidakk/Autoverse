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

// Ride height as a fraction of how far the body can drop before it meets the
// road, so every car lowers by an amount that suits its own proportions.
export const stanceLevels = [
  { value: 0, label: "Stock", note: "Factory height", price: 0 },
  { value: 0.45, label: "Lowered", note: "Springs", price: 6000 },
  { value: 0.8, label: "Slammed", note: "Coilovers", price: 11000 }
];

export const priceOf = (options, value) =>
  options.find((option) => option.value === value)?.price ?? 0;

export const formatRupees = (value) => `₹${value.toLocaleString("en-IN")}`;
