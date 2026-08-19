// The garage. Every entry here has been through tools/validate-model.mjs, so
// the wheels are findable and the accessories will fit.
//
// weightMb is the compressed download size, used to show light cars first in
// the hero carousel and to keep an eye on what the homepage costs to load.

export const cars = [
  {
    id: 1,
    name: "Honda Civic",
    model: "/models/honda_civic_2022_free_download.glb",
    bodyStyle: "Sedan",
    weightMb: 0.5
  },
  {
    id: 2,
    name: "Honda City",
    model: "/models/2008_honda_city_v_at.glb",
    bodyStyle: "Sedan",
    weightMb: 4.0
  },
  {
    id: 3,
    name: "Mercedes G-Class",
    model: "/models/merc.glb",
    bodyStyle: "SUV",
    weightMb: 0.1
  },
  {
    id: 4,
    name: "Toyota Fortuner",
    model: "/models/toyota_fortuner_2021.glb",
    bodyStyle: "SUV",
    weightMb: 19.3
  },
  {
    id: 5,
    name: "Jeep Wrangler Rubicon",
    model: "/models/2007_jeep_wrangler_rubicon.glb",
    bodyStyle: "SUV",
    weightMb: 1.1
  },
  {
    id: 6,
    name: "Toyota Hilux",
    model: "/models/2022_toyota_hilux.glb",
    bodyStyle: "Pickup",
    weightMb: 12.0
  },
  {
    id: 7,
    name: "Toyota GR Supra",
    model: "/models/toyota_gr_supra.glb",
    bodyStyle: "Coupe",
    weightMb: 10.2
  },
  {
    id: 8,
    name: "Nissan GT-R",
    model: "/models/gtr.glb",
    bodyStyle: "Coupe",
    weightMb: 3.8
  },
  {
    id: 9,
    name: "BMW M4",
    model: "/models/bmw.glb",
    bodyStyle: "Coupe",
    weightMb: 13.7
  },
  {
    id: 10,
    name: "Audi R8",
    model: "/models/audi.glb",
    bodyStyle: "Coupe",
    weightMb: 4.2
  },
  {
    id: 11,
    name: "Porsche 911",
    model: "/models/porsche.glb",
    bodyStyle: "Coupe",
    weightMb: 1.1
  },
  {
    id: 12,
    name: "Lamborghini Revuelto",
    model: "/models/lamborghini_revuelto.glb",
    bodyStyle: "Coupe",
    weightMb: 12.0
  },
  {
    id: 13,
    name: "Lamborghini Aventador",
    model: "/models/lambo.glb",
    bodyStyle: "Coupe",
    weightMb: 7.1
  },
  {
    id: 14,
    name: "Chevrolet Corvette C8",
    model: "/models/2020_chevrolet_corvette_c8_stingray_convertible.glb",
    bodyStyle: "Convertible",
    weightMb: 5.1
  },
  {
    id: 15,
    name: "Mercedes-Benz SL63 AMG",
    model: "/models/mersedes-benz_sl63_amg_free.glb",
    bodyStyle: "Convertible",
    weightMb: 12.5
  }
];

export const bodyStyles = [...new Set(cars.map((car) => car.bodyStyle))];
