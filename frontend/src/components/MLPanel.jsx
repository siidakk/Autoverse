import { useEffect, useRef, useState } from "react"
import axios from "axios"

const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000")
  .replace(/\/$/, "")

const transmissions = [
  "AUTOMATIC",
  "MANUAL",
  "AUTOMATED_MANUAL",
  "DIRECT_DRIVE",
  "UNKNOWN"
]

const drivenWheels = [
  "rear wheel drive",
  "front wheel drive",
  "all wheel drive",
  "four wheel drive"
]

const vehicleSizes = ["Compact", "Midsize", "Large"]

const vehicleStyles = [
  "Coupe",
  "Convertible",
  "Sedan",
  "Wagon",
  "4dr Hatchback",
  "2dr Hatchback",
  "4dr SUV",
  "Passenger Minivan",
  "Cargo Minivan",
  "Crew Cab Pickup",
  "Regular Cab Pickup",
  "Extended Cab Pickup",
  "2dr SUV",
  "Cargo Van",
  "Convertible SUV",
  "Passenger Van"
]

// The API sleeps on Render's free tier, so a first request can take a while.
// Warn rather than let it look broken.
const SLOW_REQUEST_MS = 4000

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="field"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function MLPanel({ onResults }) {

  const [horsepower, setHorsepower] = useState(400)
  const [cityMPG, setCityMPG] = useState(18)
  const [highwayMPG, setHighwayMPG] = useState(28)
  const [transmission, setTransmission] = useState("AUTOMATIC")
  const [wheels, setWheels] = useState("rear wheel drive")
  const [vehicleSize, setVehicleSize] = useState("Midsize")
  const [vehicleStyle, setVehicleStyle] = useState("Coupe")

  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState(null)

  const slowTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(slowTimer.current), [])

  const getRecommendations = async () => {

    setLoading(true)
    setSlow(false)
    setError(null)

    slowTimer.current = window.setTimeout(() => setSlow(true), SLOW_REQUEST_MS)

    try {

      const response = await axios.post(
        `${apiBaseUrl}/ml`,
        {
          horsepower,
          city_mpg: cityMPG,
          highway_mpg: highwayMPG,
          transmission,
          driven_wheels: wheels,
          vehicle_size: vehicleSize,
          vehicle_style: vehicleStyle
        },
        { timeout: 90000 }
      )

      onResults(response.data)

    }

    catch (requestError) {

      const status = requestError.response?.status

      setError(
        status === 502
          ? "The recommendation service is not responding. It may still be waking up — try again in a moment."
          : requestError.code === "ECONNABORTED"
            ? "The request timed out. The API sleeps when idle, so a retry usually works."
            : "Could not reach the API. Check that the backend is running."
      )

      // Cleared rather than emptied, so the results pane does not claim the
      // model returned nothing when it never ran.
      onResults(null)

    }

    finally {
      window.clearTimeout(slowTimer.current)
      setLoading(false)
      setSlow(false)
    }

  }

  return (
    <div>

      <div className="space-y-5">

        <div className="grid grid-cols-3 gap-3">
          <Field label="Power (hp)">
            <input
              type="number"
              className="field"
              value={horsepower}
              onChange={(event) => setHorsepower(Number(event.target.value))}
            />
          </Field>

          <Field label="City mpg">
            <input
              type="number"
              className="field"
              value={cityMPG}
              onChange={(event) => setCityMPG(Number(event.target.value))}
            />
          </Field>

          <Field label="Hwy mpg">
            <input
              type="number"
              className="field"
              value={highwayMPG}
              onChange={(event) => setHighwayMPG(Number(event.target.value))}
            />
          </Field>
        </div>

        <Field label="Transmission">
          <Select value={transmission} onChange={setTransmission} options={transmissions} />
        </Field>

        <Field label="Driven wheels">
          <Select value={wheels} onChange={setWheels} options={drivenWheels} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <Select value={vehicleSize} onChange={setVehicleSize} options={vehicleSizes} />
          </Field>

          <Field label="Body style">
            <Select value={vehicleStyle} onChange={setVehicleStyle} options={vehicleStyles} />
          </Field>
        </div>
      </div>

      <button
        type="button"
        onClick={getRecommendations}
        disabled={loading}
        className="btn btn-signal mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Running model…" : "Run recommendation"}
      </button>

      {loading && (
        <div className="mt-4">
          <div className="sweep relative h-[2px] w-full overflow-hidden bg-line" />
          {slow && (
            <p className="mt-3 text-xs leading-relaxed text-fog">
              Still waiting. The API is hosted on a free tier and sleeps when
              idle, so the first request after a pause can take up to a minute.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 border border-signal-deep bg-signal-deep/10 px-4 py-3">
          <p className="label text-signal">Request failed</p>
          <p className="mt-2 text-xs leading-relaxed text-fog">{error}</p>
        </div>
      )}

    </div>
  )

}

export default MLPanel
