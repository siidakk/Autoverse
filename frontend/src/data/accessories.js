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

export const priceOf = (options, value) =>
  options.find((option) => option.value === value)?.price ?? 0;

export const formatRupees = (value) => `₹${value.toLocaleString("en-IN")}`;
