const express = require("express")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const User = require("../models/User")
const { sign, requireAuth } = require("../middleware/auth")

const router = express.Router()

const isConnected = () => mongoose.connection.readyState === 1

function requireDatabase(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({
      error: "Accounts are unavailable because the database is not connected."
    })
  }
  next()
}

// Deliberately modest: enough to stop the obvious, not so much that a real
// password is rejected for lacking a symbol.
function checkCredentials(email, password) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "That does not look like an email address."
  }

  if (!password || password.length < 8) {
    return "Use at least eight characters."
  }

  return null
}

router.post("/register", requireDatabase, async (req, res) => {
  const { email, password, name } = req.body ?? {}

  const problem = checkCredentials(email, password)
  if (problem) return res.status(400).json({ error: problem })

  try {
    const existing = await User.exists({ email: email.toLowerCase() })

    if (existing) {
      return res.status(409).json({ error: "That email already has an account." })
    }

    const user = await User.create({
      email: email.toLowerCase(),
      name: name?.trim() || "",
      passwordHash: await bcrypt.hash(password, 10)
    })

    res.status(201).json({ token: sign(user), user: user.publicProfile() })
  } catch (error) {
    console.error("Registration failed", error)
    res.status(500).json({ error: "Could not create that account." })
  }
})

router.post("/login", requireDatabase, async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are both needed." })
  }

  try {
    // The hash is excluded by default on the model, so it is asked for here.
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash")

    // The same answer either way, so this cannot be used to find out which
    // email addresses have accounts.
    const ok = user && (await bcrypt.compare(password, user.passwordHash))

    if (!ok) {
      return res.status(401).json({ error: "That email and password do not match." })
    }

    res.json({ token: sign(user), user: user.publicProfile() })
  } catch (error) {
    console.error("Login failed", error)
    res.status(500).json({ error: "Could not sign in." })
  }
})

router.get("/me", requireDatabase, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)

    if (!user) {
      return res.status(404).json({ error: "That account no longer exists." })
    }

    res.json({ user: user.publicProfile() })
  } catch (error) {
    console.error("Profile lookup failed", error)
    res.status(500).json({ error: "Could not load that account." })
  }
})

// The wishlist: cars somebody wants to come back to.
router.post("/wishlist", requireDatabase, requireAuth, async (req, res) => {
  const { carId, name } = req.body ?? {}

  if (carId === undefined || !name) {
    return res.status(400).json({ error: "carId and name are required." })
  }

  try {
    const user = await User.findById(req.user.sub)
    if (!user) return res.status(404).json({ error: "That account no longer exists." })

    const already = user.wishlist.some((entry) => entry.carId === carId)

    user.wishlist = already
      ? user.wishlist.filter((entry) => entry.carId !== carId)
      : [...user.wishlist, { carId, name }]

    await user.save()

    res.json({ wishlist: user.wishlist, added: !already })
  } catch (error) {
    console.error("Wishlist update failed", error)
    res.status(500).json({ error: "Could not update the wishlist." })
  }
})

module.exports = router
