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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
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
