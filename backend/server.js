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

  res.status(200).json({
    status: "ok",
    database,
    accountsWork: database === "connected",
    note: database === "connected"
      ? "Accounts and saved builds are working."
      : hosted
        // Telling a hosted service to run a database on a laptop helps nobody.
        ? "The API is running but MONGO_URI does not point at a reachable database. Set it in the service's environment to an Atlas connection string."
        : "The API is running but has no database, so accounts and saving are off. Start one with: cd backend && npm run db:local"
  })
})

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log("MongoDB Connected")
    })
    .catch((err) => {
      console.error("MongoDB connection failed", err)
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
