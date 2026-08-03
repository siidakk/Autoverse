import { useState } from "react";
import Showroom from "../components/Showroom";

export default function CarPage() {

  const [color, setColor] = useState("#ff0000");
  const [wheelType, setWheelType] = useState("sport");
  const [spoilerType, setSpoilerType] = useState("sport");

  const prices = {
    sportWheels: 5000,
    classicWheels: 3000,
    sportSpoiler: 4000,
    racingSpoiler: 7000
  };

  const totalPrice =
    (wheelType === "sport" ? prices.sportWheels : prices.classicWheels) +
    (spoilerType === "sport" ? prices.sportSpoiler : prices.racingSpoiler);

  return (
    <div className="h-screen w-full flex bg-black text-white">

      {/* LEFT CONTROLS */}
      <div className="w-72 p-5 bg-white/10">

        <h1 className="text-2xl mb-5">AutoVerse</h1>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <select value={wheelType} onChange={(e) => setWheelType(e.target.value)}>
          <option value="sport">Sport Wheels</option>
          <option value="classic">Classic Wheels</option>
        </select>

        <select value={spoilerType} onChange={(e) => setSpoilerType(e.target.value)}>
          <option value="sport">Sport Spoiler</option>
          <option value="racing">Racing Spoiler</option>
        </select>

        <h2 className="mt-5">₹ {totalPrice}</h2>

        {/* NAV BUTTON */}
        <a
          href="/recommend"
          className="block mt-5 bg-blue-500 p-2 text-center rounded"
        >
          Go to Recommendations →
        </a>

      </div>

      {/* CENTER 3D */}
      <div className="flex-1">
        <Showroom
          color={color}
          wheelType={wheelType}
          spoilerType={spoilerType}
        />
      </div>

    </div>
  );
}