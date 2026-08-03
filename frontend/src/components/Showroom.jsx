import { useState, useEffect } from "react";
import { cars } from "../data/cars";
import CarViewer from "./CarViewer";

export default function Showroom() {

    function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;

  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };

  return new THREE.Color(f(0)/255, f(8)/255, f(4)/255);
}

  const [selectedCar, setSelectedCar] = useState(cars[0]);
const [color, setColor] = useState("#ffffff");

const [paint, setPaint] = useState({
  hueShift: 0,
  saturation: 1,
  lightness: 1,
  metalness: 0.5,
  roughness: 0.3,
  clearcoat: 1
});


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

  const [finish, setFinish] = useState("glossy");

  // ✅ DEBUG LOG (correct place)
  useEffect(() => {
    console.log("selectedCar:", selectedCar);
  }, [selectedCar]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT - CAR LIST */}
      <div style={{ width: "20%", padding: 10, background: "#111", color: "#fff" }}>
        <h3>Cars</h3>

        {cars.map((car) => (
          <div
            key={car.id}
            onClick={() => {
              setSelectedCar(car);
              setColor(car.colors[0]);
              setFinish(car.finishes[0]);
            }}
            style={{
              padding: 10,
              cursor: "pointer",
              borderBottom: "1px solid #333"
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
          finish={finish}
          paint={paint}
        />
      </div>

      {/* RIGHT - CONTROLS */}
      <div style={{ width: "20%", padding: 10, background: "#111", color: "#fff" }}>

        <div style={{ width: "90%", padding: 10, background: "#111", color: "#fff" }}>

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
            
            <br></br>
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

            </div>
      </div>

    </div>
  );
}