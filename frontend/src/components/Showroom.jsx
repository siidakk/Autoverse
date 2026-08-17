import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cars } from "../data/cars";
import CarViewer from "./CarViewer";

const prices = {
  stockWheels: 0,
  sportWheels: 5000,
  classicWheels: 3000,
  stockSpoiler: 0,
  sportSpoiler: 4000,
  racingSpoiler: 7000
};

const finishPresets = {
  matte: { metalness: 0.1, roughness: 0.8, clearcoat: 0 },
  glossy: { metalness: 0.5, roughness: 0.15, clearcoat: 1 },
  metallic: { metalness: 0.9, roughness: 0.25, clearcoat: 0.6 }
};

export default function Showroom() {

  const [selectedCar, setSelectedCar] = useState(cars[0]);
  const [color, setColor] = useState("#ffffff");

  const [paint, setPaint] = useState({
    hueShift: 0,
    saturation: 1,
    lightness: 1,
    ...finishPresets.glossy
  });

  const [finish, setFinish] = useState("glossy");
  const [wheelType, setWheelType] = useState("sport");
  const [spoilerType, setSpoilerType] = useState("sport");

  const generateColors = () => {
    const colors = [];
    const steps = 10;

    for (let h = 0; h < 360; h += 360 / steps) {
      for (let s = 60; s <= 100; s += 20) {
        for (let l = 40; l <= 70; l += 15) {
          colors.push(`hsl(${h}, ${s}%, ${l}%)`);
        }
      }
    }

    return colors;
  };

  const palette = generateColors();

  // ✅ DEBUG LOG (correct place)
  useEffect(() => {
    console.log("selectedCar:", selectedCar);
  }, [selectedCar]);

  const applyFinish = (nextFinish) => {
    setFinish(nextFinish);
    setPaint((prev) => ({ ...prev, ...finishPresets[nextFinish] }));
  };

  const wheelPrices = {
    stock: prices.stockWheels,
    sport: prices.sportWheels,
    classic: prices.classicWheels
  };

  const spoilerPrices = {
    stock: prices.stockSpoiler,
    sport: prices.sportSpoiler,
    racing: prices.racingSpoiler
  };

  const accessoriesTotal = wheelPrices[wheelType] + spoilerPrices[spoilerType];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "#111",
          color: "#fff",
          borderBottom: "1px solid #333"
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>AutoVerse</h1>

        <Link
          to="/recommend"
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 6,
            textDecoration: "none"
          }}
        >
          Go to Recommendations →
        </Link>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* LEFT - CAR LIST */}
        <div style={{ width: "20%", padding: 10, background: "#111", color: "#fff", overflowY: "auto" }}>
          <h3>Cars</h3>

          {cars.map((car) => (
            <div
              key={car.id}
              onClick={() => {
                setSelectedCar(car);
                setColor(car.colors[0]);
                applyFinish(car.finishes[0]);
              }}
              style={{
                padding: 10,
                cursor: "pointer",
                borderBottom: "1px solid #333",
                background: selectedCar.id === car.id ? "#222" : "transparent"
              }}
            >
              {car.name}
            </div>
          ))}
        </div>

        {/* CENTER - 3D VIEW */}
        <div style={{ width: "60%" }}>
          <CarViewer
            car={selectedCar}
            color={color}
            paint={paint}
            wheelType={wheelType}
            spoilerType={spoilerType}
          />
        </div>

        {/* RIGHT - CONTROLS */}
        <div style={{ width: "20%", padding: 10, background: "#111", color: "#fff", overflowY: "auto" }}>

          <h3>🎨 Custom Paint</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: 6,
              maxHeight: "300px",
              overflowY: "auto",
              paddingRight: 15
            }}
          >
            {palette.map((c, i) => (
              <div
                key={i}
                onClick={() => setColor(c)}
                style={{
                  width: 20,
                  height: 22,
                  borderRadius: 4,
                  background: c,
                  cursor: "pointer",
                  border: color === c ? "2px solid white" : "1px solid #333"
                }}
              />
            ))}
          </div>

          <br />
          <h3>Finish</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {Object.keys(finishPresets).map((f) => (
              <button
                key={f}
                onClick={() => applyFinish(f)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: 6,
                  background: finish === f ? "#3b82f6" : "#222",
                  color: "#fff",
                  border: "1px solid #333",
                  textTransform: "capitalize",
                  cursor: "pointer"
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <h3>Advanced Paint</h3>

          {/* HUE SHIFT */}
          <label>Hue Shift</label>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.01"
            value={paint.hueShift}
            onChange={(e) =>
              setPaint({ ...paint, hueShift: Number(e.target.value) })
            }
          />

          {/* METALNESS */}
          <label>Metalness</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={paint.metalness}
            onChange={(e) =>
              setPaint({ ...paint, metalness: Number(e.target.value) })
            }
          />

          {/* ROUGHNESS */}
          <label>Roughness</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={paint.roughness}
            onChange={(e) =>
              setPaint({ ...paint, roughness: Number(e.target.value) })
            }
          />

          {/* CLEARCOAT */}
          <label>Clearcoat</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={paint.clearcoat}
            onChange={(e) =>
              setPaint({ ...paint, clearcoat: Number(e.target.value) })
            }
          />

          <br />
          <h3>Accessories</h3>

          <label className="block mb-1">Wheels</label>
          <select
            value={wheelType}
            onChange={(e) => setWheelType(e.target.value)}
            style={{ width: "100%", padding: 6, marginBottom: 10, background: "#000", color: "#fff" }}
          >
            <option value="stock">Stock Wheels</option>
            <option value="sport">Sport Wheels (+₹{prices.sportWheels})</option>
            <option value="classic">Classic Wheels (+₹{prices.classicWheels})</option>
          </select>

          <label className="block mb-1">Spoiler</label>
          <select
            value={spoilerType}
            onChange={(e) => setSpoilerType(e.target.value)}
            style={{ width: "100%", padding: 6, marginBottom: 10, background: "#000", color: "#fff" }}
          >
            <option value="stock">No Spoiler</option>
            <option value="sport">Sport Spoiler (+₹{prices.sportSpoiler})</option>
            <option value="racing">Racing Spoiler (+₹{prices.racingSpoiler})</option>
          </select>

          <h2 style={{ marginTop: 15 }}>Accessories: ₹{accessoriesTotal}</h2>

        </div>
      </div>
    </div>
  );
}
