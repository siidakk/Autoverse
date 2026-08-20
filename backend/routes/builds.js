const express = require("express")
const mongoose = require("mongoose")

const Build = require("../models/Build")
const { requireAuth, optionalAuth } = require("../middleware/auth")

const router = express.Router()

// Ambiguous characters are left out so a code can be read off a screen and
// typed back in without confusion between O and 0 or I and 1.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function makeCode() {
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

const isConnected = () => mongoose.connection.readyState === 1

function requireDatabase(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({
      error: "Saving is unavailable because the database is not connected."
    })
  }
  next()
}

// Save a build and hand back the code it can be reached by.
router.post("/", requireDatabase, optionalAuth, async (req, res) => {

  const { carId, carName, spec, total } = req.body

  if (carId === undefined || !carName) {
    return res.status(400).json({ error: "carId and carName are required." })
  }

  try {

    // A clash is possible but rare, so it is simply retried rather than locked.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode()

      const existing = await Build.exists({ code })
      if (existing) continue

      const build = await Build.create({
        code,
        carId,
        carName,
        spec: spec || {},
        total: total || 0,
        owner: req.user ? req.user.sub : null
      })

      return res.status(201).json({ code: build.code })
    }

    res.status(500).json({ error: "Could not allocate a share code." })

  } catch (error) {
    console.error("Failed to save build", error)
    res.status(500).json({ error: "Could not save this build." })
  }
})

// Everything this account has saved. Declared before the code route below,
// otherwise "mine" is taken for a share code and looked up as one.
router.get("/mine", requireDatabase, requireAuth, async (req, res) => {

  try {

    const builds = await Build.find({ owner: req.user.sub })
      .sort({ createdAt: -1 })
      .limit(60)

    res.json({
      builds: builds.map((build) => ({
        code: build.code,
        carId: build.carId,
        carName: build.carName,
        spec: build.spec,
        total: build.total,
        views: build.views,
        savedAt: build.createdAt
      }))
    })

  }

  catch (error) {
    console.error("Failed to list builds", error)
    res.status(500).json({ error: "Could not load your garage." })
  }

})

// Remove one of your own builds.
router.delete("/:code", requireDatabase, requireAuth, async (req, res) => {

  try {

    const removed = await Build.findOneAndDelete({
      code: req.params.code.toUpperCase(),
      owner: req.user.sub
    })

    if (!removed) {
      return res.status(404).json({ error: "No build of yours with that code." })
    }

    res.json({ removed: removed.code })

  }

  catch (error) {
    console.error("Failed to remove build", error)
    res.status(500).json({ error: "Could not remove that build." })
  }

})

// Load a build by its share code.
router.get("/:code", requireDatabase, async (req, res) => {

  try {

    const build = await Build.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    )

    if (!build) {
      return res.status(404).json({ error: "No build with that code." })
    }

    res.json({
      code: build.code,
      carId: build.carId,
      carName: build.carName,
      spec: build.spec,
      total: build.total,
      savedAt: build.createdAt
    })

  } catch (error) {
    console.error("Failed to load build", error)
    res.status(500).json({ error: "Could not load this build." })
  }
})

module.exports = router
