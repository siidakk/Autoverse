const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()
const mongoUri = process.env.MONGO_URI

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("AutoVerse Backend Running")
})

// Says what is actually working, not just that the process is alive. Opening
// this in a browser answers "why can I not sign in" without reading any logs.
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"]
  const database = states[mongoose.connection.readyState] ?? "unknown"

  const hosted = process.env.NODE_ENV === "production"

  // "Not configured" and "configured but unreachable" are different problems
  // with different fixes, so they are reported as different things.
  let note
  if (database === "connected") {
    note = "Accounts and saved builds are working."
  } else if (!mongoUri) {
    note = hosted
      ? "MONGO_URI is not set on this service. Add it in the environment settings."
      : "No MONGO_URI in backend/.env. Start a local one with: cd backend && npm run db:local"
  } else if (database === "connecting") {
    note = `Still trying to reach the database, attempt ${attempts}.`
  } else {
    note = hosted
      // Telling a hosted service to run a database on a laptop helps nobody.
      ? "MONGO_URI is set but the database cannot be reached. Check the cluster is not paused and that Network Access allows 0.0.0.0/0."
      : "MONGO_URI is set but the database cannot be reached. Start a local one with: cd backend && npm run db:local"
  }

  res.status(200).json({
    status: "ok",
    database,
    accountsWork: database === "connected",
    mongoConfigured: Boolean(mongoUri),
    attempts,
    lastError,
    note
  })
})

// A single attempt at boot is not enough. Mongoose does not retry after the
// first connection fails, so a service that started while the cluster happened
// to be paused stays dead until a human restarts it -- which is exactly what
// happened here. Keep trying, and the API heals itself the moment the database
// comes back.
let attempts = 0
let lastError = null

// Never let a connection string reach a response body or a log line.
const scrub = (text) => String(text).replace(/\/\/[^@\s]*@/g, "//***:***@")

const connect = async () => {
  attempts += 1
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 })
    lastError = null
    console.log("MongoDB Connected")
  } catch (err) {
    lastError = scrub(err.message)
    // Back off to a minute so a long outage does not mean thousands of tries,
    // but stay quick early on so a restart is not needed after a brief blip.
    const wait = Math.min(60000, 2000 * 2 ** Math.min(attempts - 1, 5))
    console.error(`MongoDB connection failed (attempt ${attempts}): ${lastError}`)
    console.error(`Retrying in ${Math.round(wait / 1000)}s`)
    setTimeout(connect, wait).unref?.()
  }
}

if (mongoUri) {
  connect()
  // Losing the connection later is handled by the driver, but if it gives up
  // entirely we want to be trying again rather than waiting to be noticed.
  mongoose.connection.on("disconnected", () => {
    if (mongoose.connection.readyState === 0) setTimeout(connect, 5000).unref?.()
  })
} else {
  console.warn("MONGO_URI is not configured; continuing without MongoDB")
}

const PORT = process.env.PORT || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})

const mlRoute =
require("./routes/mlRecommend")

app.use("/ml", mlRoute)

const buildsRoute = require("./routes/builds")

app.use("/builds", buildsRoute)

const authRoute = require("./routes/auth")

app.use("/auth", authRoute)

const valuationRoute = require("./routes/valuation")

app.use("/valuation", valuationRoute)
