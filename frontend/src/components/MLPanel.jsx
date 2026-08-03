import { useState } from "react"

import axios from "axios"

function MLPanel() {

  const [horsepower, setHorsepower] =
    useState(400)

  const [cityMPG, setCityMPG] =
    useState(18)

  const [highwayMPG, setHighwayMPG] =
    useState(28)

  const [transmission, setTransmission] =
    useState("AUTOMATIC")

  const [wheels, setWheels] =
    useState("rear wheel drive")

  const [vehicleSize, setVehicleSize] =
    useState("Midsize")

  const [vehicleStyle, setVehicleStyle] =
    useState("Coupe")

  const [cars, setCars] =
    useState([])

  const getRecommendations = async () => {

    try {

      const response = await axios.post(

        "http://localhost:5000/ml",

        {

          horsepower,

          city_mpg: cityMPG,

          highway_mpg: highwayMPG,

          transmission,

          driven_wheels: wheels,

          vehicle_size: vehicleSize,

          vehicle_style: vehicleStyle

        }

      )

      setCars(response.data)

    }

    catch (error) {

      console.log(error)

    }

  }

  return (

    <div className="absolute top-5 right-5 w-96 bg-white/10 backdrop-blur-md p-5 rounded-2xl text-white overflow-auto max-h-[90vh]">

      <h2 className="text-2xl font-bold mb-5">

        AI Car Recommendation

      </h2>

      {/* HORSEPOWER */}

      <label className="block mb-1 font-semibold">
        Horsepower
      </label>

      <input

        type="number"

        value={horsepower}

        onChange={(e) =>
          setHorsepower(
            Number(e.target.value)
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      />

      {/* CITY MPG */}

      <label className="block mb-1 font-semibold">
        City MPG
      </label>

      <input

        type="number"

        value={cityMPG}

        onChange={(e) =>
          setCityMPG(
            Number(e.target.value)
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      />

      {/* HIGHWAY MPG */}

      <label className="block mb-1 font-semibold">
        Highway MPG
      </label>

      <input

        type="number"

        value={highwayMPG}

        onChange={(e) =>
          setHighwayMPG(
            Number(e.target.value)
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      />

      {/* TRANSMISSION */}

      <label className="block mb-1 font-semibold">
        Transmission
      </label>

      <select

        value={transmission}

        onChange={(e) =>
          setTransmission(
            e.target.value
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      >

        <option>AUTOMATIC</option>
        <option>MANUAL</option>
        <option>AUTOMATED_MANUAL</option>
        <option>DIRECT_DRIVE</option>
        <option>UNKNOWN</option>

      </select>

      {/* WHEELS */}

      <label className="block mb-1 font-semibold">
        Driven Wheels
      </label>

      <select

        value={wheels}

        onChange={(e) =>
          setWheels(
            e.target.value
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      >

        <option>rear wheel drive</option>
        <option>front wheel drive</option>
        <option>all wheel drive</option>
        <option>four wheel drive</option>

      </select>

      {/* VEHICLE SIZE */}

      <label className="block mb-1 font-semibold">
        Vehicle Size
      </label>

      <select

        value={vehicleSize}

        onChange={(e) =>
          setVehicleSize(
            e.target.value
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      >

        <option>Compact</option>
        <option>Midsize</option>
        <option>Large</option>

      </select>

      {/* VEHICLE STYLE */}

      <label className="block mb-1 font-semibold">
        Vehicle Style
      </label>

      <select

        value={vehicleStyle}

        onChange={(e) =>
          setVehicleStyle(
            e.target.value
          )
        }

        className="w-full p-2 mb-4 rounded bg-black"

      >

        <option>Coupe</option>
        <option>Convertible</option>
        <option>Sedan</option>
        <option>Wagon</option>
        <option>4dr Hatchback</option>
        <option>2dr Hatchback</option>
        <option>4dr SUV</option>
        <option>Passenger Minivan</option>
        <option>Cargo Minivan</option>
        <option>Crew Cab Pickup</option>
        <option>Regular Cab Pickup</option>
        <option>Extended Cab Pickup</option>
        <option>2dr SUV</option>
        <option>Cargo Van</option>
        <option>Convertible SUV</option>
        <option>Passenger Van</option>

      </select>

      <button

        onClick={getRecommendations}

        className="w-full bg-red-500 hover:bg-red-600 p-3 rounded-xl"

      >

        Recommend Cars

      </button>

      {/* RESULTS */}

      <div className="mt-5">

        {

          cars.map((car, index) => (

            <div

              key={index}

              className="bg-black/40 p-4 rounded-xl mb-4"

            >

              <h3 className="text-xl font-bold">

                {car.make} {car.model}

              </h3>

              <p>
                <span className="font-semibold">
                  Horsepower:
                </span>{" "}
                {car.horsepower}
              </p>

              <p>
                <span className="font-semibold">
                  City MPG:
                </span>{" "}
                {car.city_mpg}
              </p>

              <p>
                <span className="font-semibold">
                  Highway MPG:
                </span>{" "}
                {car.highway_mpg}
              </p>

              <p>
                <span className="font-semibold">
                  Price:
                </span>{" "}
                ${car.price}
              </p>

            </div>

          ))

        }

      </div>

    </div>

  )

}

export default MLPanel